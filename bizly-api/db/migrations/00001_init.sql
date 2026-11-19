-- Bizly initial schema (PostgreSQL 17)
-- Money is stored in cents (bigint). Timestamps are timestamptz (UTC).
-- Tenant isolation: app code filters by company_id, and RLS enforces it at the DB level.
-- The API connects as bizly_app (no superuser, so RLS applies); migrations run as the owner.

-- +goose Up

-- App role: created without login; the dev bootstrap sets its password.
-- +goose StatementBegin
DO $$
BEGIN
    IF NOT EXISTS (SELECT FROM pg_roles WHERE rolname = 'bizly_app') THEN
        CREATE ROLE bizly_app NOLOGIN NOSUPERUSER NOCREATEDB NOCREATEROLE NOBYPASSRLS;
    END IF;
END
$$;
-- +goose StatementEnd

-- Current tenant, set per transaction with SET LOCAL app.company_id.
-- NULLIF: after a transaction the setting resets to '' (not a valid uuid).
-- +goose StatementBegin
CREATE FUNCTION app_current_company() RETURNS uuid
LANGUAGE sql STABLE AS $$
    SELECT NULLIF(current_setting('app.company_id', true), '')::uuid
$$;
-- +goose StatementEnd

-- +goose StatementBegin
CREATE FUNCTION set_updated_at() RETURNS trigger
LANGUAGE plpgsql AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END
$$;
-- +goose StatementEnd

CREATE TYPE member_role         AS ENUM ('OWNER', 'ADMIN', 'STAFF');
CREATE TYPE customer_status     AS ENUM ('ACTIVE', 'INACTIVE');
CREATE TYPE appointment_status  AS ENUM ('SCHEDULED', 'CONFIRMED', 'COMPLETED', 'CANCELLED', 'NO_SHOW');
CREATE TYPE subscription_status AS ENUM ('TRIALING', 'ACTIVE', 'PAST_DUE', 'CANCELED');
CREATE TYPE transaction_type    AS ENUM ('INCOME', 'EXPENSE');

-- Tenants
CREATE TABLE companies (
    id                   uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    name                 text NOT NULL CHECK (length(name) BETWEEN 1 AND 120),
    slug                 text NOT NULL UNIQUE,
    email                text,
    phone                text,
    address              text,
    website              text,
    tax_id               text,
    currency             text NOT NULL DEFAULT 'BRL' CHECK (currency IN ('BRL', 'USD', 'EUR', 'GBP')),
    timezone             text NOT NULL DEFAULT 'America/Sao_Paulo',
    default_duration_min integer NOT NULL DEFAULT 60 CHECK (default_duration_min BETWEEN 5 AND 480),
    created_at           timestamptz NOT NULL DEFAULT now(),
    updated_at           timestamptz NOT NULL DEFAULT now()
);

-- A user can belong to several companies through memberships.
CREATE TABLE users (
    id                uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    name              text NOT NULL CHECK (length(name) BETWEEN 1 AND 120),
    email             text NOT NULL UNIQUE CHECK (email = lower(email)),
    password_hash     text NOT NULL, -- bcrypt, compatible with the Python backend hashes
    email_verified_at timestamptz,
    created_at        timestamptz NOT NULL DEFAULT now(),
    updated_at        timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE memberships (
    id         uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    company_id uuid NOT NULL REFERENCES companies (id) ON DELETE CASCADE,
    user_id    uuid NOT NULL REFERENCES users (id) ON DELETE CASCADE,
    role       member_role NOT NULL,
    created_at timestamptz NOT NULL DEFAULT now(),
    UNIQUE (company_id, user_id)
);
CREATE INDEX idx_memberships_user ON memberships (user_id);

-- Only token hashes are stored, so leaked rows can't be used as links.
CREATE TABLE invitations (
    id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    company_id  uuid NOT NULL REFERENCES companies (id) ON DELETE CASCADE,
    email       text NOT NULL CHECK (email = lower(email)),
    role        member_role NOT NULL CHECK (role <> 'OWNER'),
    token_hash  text NOT NULL UNIQUE,
    invited_by  uuid NOT NULL REFERENCES users (id),
    expires_at  timestamptz NOT NULL,
    accepted_at timestamptz,
    created_at  timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX idx_invitations_company ON invitations (company_id);

CREATE TABLE password_resets (
    id         uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id    uuid NOT NULL REFERENCES users (id) ON DELETE CASCADE,
    token_hash text NOT NULL UNIQUE,
    expires_at timestamptz NOT NULL,
    used_at    timestamptz,
    created_at timestamptz NOT NULL DEFAULT now()
);

-- Billing
CREATE TABLE plans (
    id                     text PRIMARY KEY, -- e.g. 'FREE', 'PRO'
    name                   text NOT NULL,
    price_cents            bigint NOT NULL CHECK (price_cents >= 0),
    max_staff              integer CHECK (max_staff > 0),              -- NULL = unlimited
    max_appointments_month integer CHECK (max_appointments_month > 0), -- NULL = unlimited
    is_active              boolean NOT NULL DEFAULT true
);

CREATE TABLE subscriptions (
    id                       uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    company_id               uuid NOT NULL UNIQUE REFERENCES companies (id) ON DELETE CASCADE,
    plan_id                  text NOT NULL REFERENCES plans (id),
    status                   subscription_status NOT NULL,
    trial_ends_at            timestamptz,
    current_period_end       timestamptz,
    provider                 text, -- payment gateway (Stripe/Asaas)
    provider_customer_id     text,
    provider_subscription_id text,
    created_at               timestamptz NOT NULL DEFAULT now(),
    updated_at               timestamptz NOT NULL DEFAULT now()
);

-- Opening hours in the company's timezone. No row = closed. 0 = Sunday.
CREATE TABLE business_hours (
    company_id  uuid NOT NULL REFERENCES companies (id) ON DELETE CASCADE,
    day_of_week smallint NOT NULL CHECK (day_of_week BETWEEN 0 AND 6),
    opens_at    time NOT NULL,
    closes_at   time NOT NULL,
    PRIMARY KEY (company_id, day_of_week),
    CHECK (opens_at < closes_at)
);

CREATE TABLE customers (
    id         uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    company_id uuid NOT NULL REFERENCES companies (id) ON DELETE CASCADE,
    name       text NOT NULL CHECK (length(name) BETWEEN 1 AND 120),
    email      text CHECK (email = lower(email)),
    phone      text,
    notes      text,
    status     customer_status NOT NULL DEFAULT 'ACTIVE',
    created_at timestamptz NOT NULL DEFAULT now(),
    updated_at timestamptz NOT NULL DEFAULT now(),
    UNIQUE (company_id, id) -- target of the composite FK in appointments
);
CREATE INDEX idx_customers_company_name ON customers (company_id, name);
CREATE UNIQUE INDEX uq_customers_company_email ON customers (company_id, email) WHERE email IS NOT NULL;

-- Services used by appointments are archived (is_active = false), not deleted.
CREATE TABLE services (
    id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    company_id   uuid NOT NULL REFERENCES companies (id) ON DELETE CASCADE,
    name         text NOT NULL CHECK (length(name) BETWEEN 1 AND 120),
    description  text,
    duration_min integer NOT NULL CHECK (duration_min BETWEEN 5 AND 720),
    price_cents  bigint NOT NULL CHECK (price_cents >= 0),
    is_active    boolean NOT NULL DEFAULT true,
    created_at   timestamptz NOT NULL DEFAULT now(),
    updated_at   timestamptz NOT NULL DEFAULT now(),
    UNIQUE (company_id, id) -- target of the composite FK in appointments
);
CREATE INDEX idx_services_company ON services (company_id, is_active);

CREATE TABLE appointments (
    id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    company_id    uuid NOT NULL REFERENCES companies (id) ON DELETE CASCADE,
    customer_id   uuid,          -- NULL = walk-in or deleted customer
    client_name   text NOT NULL, -- snapshot at booking time
    service_id    uuid NOT NULL,
    staff_user_id uuid,
    created_by    uuid REFERENCES users (id) ON DELETE SET NULL,
    starts_at     timestamptz NOT NULL,
    ends_at       timestamptz NOT NULL,
    status        appointment_status NOT NULL DEFAULT 'SCHEDULED',
    price_cents   bigint NOT NULL CHECK (price_cents >= 0), -- price at booking time
    notes         text,
    created_at    timestamptz NOT NULL DEFAULT now(),
    updated_at    timestamptz NOT NULL DEFAULT now(),
    CHECK (ends_at > starts_at),
    -- Composite FKs keep customer, service and staff within the same company.
    FOREIGN KEY (company_id, customer_id)   REFERENCES customers (company_id, id) ON DELETE SET NULL (customer_id),
    FOREIGN KEY (company_id, service_id)    REFERENCES services (company_id, id),
    FOREIGN KEY (company_id, staff_user_id) REFERENCES memberships (company_id, user_id) ON DELETE SET NULL (staff_user_id)
);
CREATE INDEX idx_appointments_company_start ON appointments (company_id, starts_at);
CREATE INDEX idx_appointments_customer ON appointments (customer_id);
CREATE INDEX idx_appointments_service ON appointments (service_id);

-- Manual income and expenses. Allowed categories depend on the type.
CREATE TABLE transactions (
    id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    company_id   uuid NOT NULL REFERENCES companies (id) ON DELETE CASCADE,
    type         transaction_type NOT NULL,
    category     text NOT NULL,
    description  text NOT NULL CHECK (length(description) BETWEEN 1 AND 200),
    amount_cents bigint NOT NULL CHECK (amount_cents > 0),
    occurred_on  date NOT NULL,
    created_by   uuid REFERENCES users (id) ON DELETE SET NULL,
    created_at   timestamptz NOT NULL DEFAULT now(),
    updated_at   timestamptz NOT NULL DEFAULT now(),
    CHECK (
        (type = 'INCOME'  AND category IN ('SERVICES', 'PRODUCTS', 'SUBSCRIPTIONS', 'OTHER')) OR
        (type = 'EXPENSE' AND category IN ('RENT', 'SALARIES', 'SUPPLIES', 'MARKETING', 'UTILITIES', 'TAXES', 'OTHER'))
    )
);
CREATE INDEX idx_transactions_company_date ON transactions (company_id, occurred_on);

CREATE TABLE audit_logs (
    id         uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    company_id uuid REFERENCES companies (id) ON DELETE CASCADE,
    user_id    uuid REFERENCES users (id) ON DELETE SET NULL,
    action     text NOT NULL, -- e.g. 'appointment.cancelled'
    entity     text NOT NULL,
    entity_id  uuid,
    metadata   jsonb,
    created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX idx_audit_company_date ON audit_logs (company_id, created_at);

CREATE TRIGGER trg_companies_updated     BEFORE UPDATE ON companies     FOR EACH ROW EXECUTE FUNCTION set_updated_at();
CREATE TRIGGER trg_users_updated         BEFORE UPDATE ON users         FOR EACH ROW EXECUTE FUNCTION set_updated_at();
CREATE TRIGGER trg_subscriptions_updated BEFORE UPDATE ON subscriptions FOR EACH ROW EXECUTE FUNCTION set_updated_at();
CREATE TRIGGER trg_customers_updated     BEFORE UPDATE ON customers     FOR EACH ROW EXECUTE FUNCTION set_updated_at();
CREATE TRIGGER trg_services_updated      BEFORE UPDATE ON services      FOR EACH ROW EXECUTE FUNCTION set_updated_at();
CREATE TRIGGER trg_appointments_updated  BEFORE UPDATE ON appointments  FOR EACH ROW EXECUTE FUNCTION set_updated_at();
CREATE TRIGGER trg_transactions_updated  BEFORE UPDATE ON transactions  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- RLS on tenant data. Tables without RLS (users, memberships, companies, invitations,
-- subscriptions) are read before the tenant is known (login, invites, webhooks).
ALTER TABLE business_hours ENABLE ROW LEVEL SECURITY;
ALTER TABLE customers      ENABLE ROW LEVEL SECURITY;
ALTER TABLE services       ENABLE ROW LEVEL SECURITY;
ALTER TABLE appointments   ENABLE ROW LEVEL SECURITY;
ALTER TABLE transactions   ENABLE ROW LEVEL SECURITY;
ALTER TABLE audit_logs     ENABLE ROW LEVEL SECURITY;

CREATE POLICY tenant_isolation ON business_hours USING (company_id = app_current_company()) WITH CHECK (company_id = app_current_company());
CREATE POLICY tenant_isolation ON customers      USING (company_id = app_current_company()) WITH CHECK (company_id = app_current_company());
CREATE POLICY tenant_isolation ON services       USING (company_id = app_current_company()) WITH CHECK (company_id = app_current_company());
CREATE POLICY tenant_isolation ON appointments   USING (company_id = app_current_company()) WITH CHECK (company_id = app_current_company());
CREATE POLICY tenant_isolation ON transactions   USING (company_id = app_current_company()) WITH CHECK (company_id = app_current_company());
CREATE POLICY tenant_isolation ON audit_logs     USING (company_id = app_current_company()) WITH CHECK (company_id = app_current_company());

-- App role: data access only, no DDL.
GRANT USAGE ON SCHEMA public TO bizly_app;
GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA public TO bizly_app;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT SELECT, INSERT, UPDATE, DELETE ON TABLES TO bizly_app;
REVOKE ALL ON goose_db_version FROM bizly_app;

-- +goose Down
DROP TABLE audit_logs, transactions, appointments, services, customers, business_hours,
           subscriptions, plans, password_resets, invitations, memberships, users, companies;
DROP TYPE transaction_type, subscription_status, appointment_status, customer_status, member_role;
DROP FUNCTION set_updated_at(), app_current_company();
DROP OWNED BY bizly_app;
DROP ROLE IF EXISTS bizly_app;
