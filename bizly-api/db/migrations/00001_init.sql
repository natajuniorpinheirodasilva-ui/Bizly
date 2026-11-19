-- =====================================================================
-- Bizly - schema inicial (PostgreSQL 17)
--
-- Decisões gerais:
--   * IDs: UUID gerados pelo banco (gen_random_uuid(), nativo do Postgres 13+)
--   * Datas/horas: TIMESTAMPTZ (guarda o instante em UTC; o fuso da empresa é aplicado na exibição)
--   * Dinheiro: CENTAVOS em BIGINT (R$ 80,00 = 8000). Nunca float.
--   * Valores fixos (status, papéis): tipos ENUM
--   * updated_at é atualizado sozinho por um trigger
--
-- Segurança entre empresas (multi-tenant), em duas camadas:
--   1) O código Go sempre filtra por company_id
--   2) Row Level Security (RLS): mesmo que o código esqueça o filtro, o banco
--      só devolve linhas da empresa definida na transação (app.company_id)
--
-- Dois usuários no banco:
--   * dono (quem roda as migrations): cria e altera tabelas
--   * bizly_app (usado pela API): só lê/escreve dados, SEM superpoderes.
--     Superusuários ignoram RLS, por isso a API nunca usa o dono.
-- =====================================================================

-- +goose Up

-- ---------------------------------------------------------------------
-- Usuário da aplicação (criado sem login; o Go define a senha ao iniciar em dev)
-- ---------------------------------------------------------------------
-- +goose StatementBegin
DO $$
BEGIN
    IF NOT EXISTS (SELECT FROM pg_roles WHERE rolname = 'bizly_app') THEN
        CREATE ROLE bizly_app NOLOGIN NOSUPERUSER NOCREATEDB NOCREATEROLE NOBYPASSRLS;
    END IF;
END
$$;
-- +goose StatementEnd

-- ---------------------------------------------------------------------
-- Funções auxiliares
-- ---------------------------------------------------------------------

-- Empresa da requisição atual. O Go faz SET LOCAL app.company_id = '...' em cada transação.
-- NULLIF: depois da transação o valor volta a ser '' (string vazia), que não é um UUID válido.
-- +goose StatementBegin
CREATE FUNCTION app_current_company() RETURNS uuid
LANGUAGE sql STABLE AS $$
    SELECT NULLIF(current_setting('app.company_id', true), '')::uuid
$$;
-- +goose StatementEnd

-- Atualiza updated_at automaticamente em todo UPDATE.
-- +goose StatementBegin
CREATE FUNCTION set_updated_at() RETURNS trigger
LANGUAGE plpgsql AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END
$$;
-- +goose StatementEnd

-- ---------------------------------------------------------------------
-- Tipos
-- ---------------------------------------------------------------------
CREATE TYPE member_role         AS ENUM ('OWNER', 'ADMIN', 'STAFF');
CREATE TYPE customer_status     AS ENUM ('ACTIVE', 'INACTIVE');
CREATE TYPE appointment_status  AS ENUM ('SCHEDULED', 'CONFIRMED', 'COMPLETED', 'CANCELLED', 'NO_SHOW');
CREATE TYPE subscription_status AS ENUM ('TRIALING', 'ACTIVE', 'PAST_DUE', 'CANCELED');
CREATE TYPE transaction_type    AS ENUM ('INCOME', 'EXPENSE');

-- ---------------------------------------------------------------------
-- Empresas (os clientes que pagam o Bizly)
-- ---------------------------------------------------------------------
CREATE TABLE companies (
    id                   uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    name                 text NOT NULL CHECK (length(name) BETWEEN 1 AND 120),
    slug                 text NOT NULL UNIQUE,              -- usado em URLs públicas (ex: página de agendamento)
    email                text,
    phone                text,
    address              text,
    website              text,
    tax_id               text,                              -- CNPJ/CPF
    currency             text NOT NULL DEFAULT 'BRL' CHECK (currency IN ('BRL', 'USD', 'EUR', 'GBP')),
    timezone             text NOT NULL DEFAULT 'America/Sao_Paulo',
    default_duration_min integer NOT NULL DEFAULT 60 CHECK (default_duration_min BETWEEN 5 AND 480),
    created_at           timestamptz NOT NULL DEFAULT now(),
    updated_at           timestamptz NOT NULL DEFAULT now()
);

-- ---------------------------------------------------------------------
-- Usuários (pessoas que fazem login). Um usuário pode estar em várias empresas.
-- ---------------------------------------------------------------------
CREATE TABLE users (
    id                uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    name              text NOT NULL CHECK (length(name) BETWEEN 1 AND 120),
    email             text NOT NULL UNIQUE CHECK (email = lower(email)), -- sempre minúsculo
    password_hash     text NOT NULL,                        -- bcrypt (compatível com o backend Python)
    email_verified_at timestamptz,
    created_at        timestamptz NOT NULL DEFAULT now(),
    updated_at        timestamptz NOT NULL DEFAULT now()
);

-- Quem pertence a qual empresa e com qual papel.
-- OWNER: dono (cobrança, excluir empresa) | ADMIN: gerencia tudo | STAFF: agenda e atende
CREATE TABLE memberships (
    id         uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    company_id uuid NOT NULL REFERENCES companies (id) ON DELETE CASCADE,
    user_id    uuid NOT NULL REFERENCES users (id) ON DELETE CASCADE,
    role       member_role NOT NULL,
    created_at timestamptz NOT NULL DEFAULT now(),
    UNIQUE (company_id, user_id)
);
CREATE INDEX idx_memberships_user ON memberships (user_id);

-- Convites. Guardamos só o HASH do token: se o banco vazar, os links não funcionam.
CREATE TABLE invitations (
    id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    company_id  uuid NOT NULL REFERENCES companies (id) ON DELETE CASCADE,
    email       text NOT NULL CHECK (email = lower(email)),
    role        member_role NOT NULL CHECK (role <> 'OWNER'), -- ninguém é convidado como dono
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

-- ---------------------------------------------------------------------
-- Planos e assinaturas (cobrança)
-- ---------------------------------------------------------------------
CREATE TABLE plans (
    id                     text PRIMARY KEY,                -- código legível: 'FREE', 'PRO'...
    name                   text NOT NULL,
    price_cents            bigint NOT NULL CHECK (price_cents >= 0),
    max_staff              integer CHECK (max_staff > 0),              -- NULL = ilimitado
    max_appointments_month integer CHECK (max_appointments_month > 0), -- NULL = ilimitado
    is_active              boolean NOT NULL DEFAULT true
);

-- Uma assinatura por empresa. provider_* = IDs no gateway de pagamento (Stripe/Asaas).
CREATE TABLE subscriptions (
    id                       uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    company_id               uuid NOT NULL UNIQUE REFERENCES companies (id) ON DELETE CASCADE,
    plan_id                  text NOT NULL REFERENCES plans (id),
    status                   subscription_status NOT NULL,
    trial_ends_at            timestamptz,
    current_period_end       timestamptz,
    provider                 text,
    provider_customer_id     text,
    provider_subscription_id text,
    created_at               timestamptz NOT NULL DEFAULT now(),
    updated_at               timestamptz NOT NULL DEFAULT now()
);

-- ---------------------------------------------------------------------
-- Operação do negócio (todas com RLS, ver final do arquivo)
-- ---------------------------------------------------------------------

-- Horário de funcionamento, no fuso da empresa. Dia sem linha = fechado. 0 = domingo.
CREATE TABLE business_hours (
    company_id  uuid NOT NULL REFERENCES companies (id) ON DELETE CASCADE,
    day_of_week smallint NOT NULL CHECK (day_of_week BETWEEN 0 AND 6),
    opens_at    time NOT NULL,
    closes_at   time NOT NULL,
    PRIMARY KEY (company_id, day_of_week),
    CHECK (opens_at < closes_at)
);

-- Clientes da empresa (as pessoas atendidas).
CREATE TABLE customers (
    id         uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    company_id uuid NOT NULL REFERENCES companies (id) ON DELETE CASCADE,
    name       text NOT NULL CHECK (length(name) BETWEEN 1 AND 120),
    email      text CHECK (email = lower(email)),           -- opcional (NULL, nunca "n/a")
    phone      text,
    notes      text,
    status     customer_status NOT NULL DEFAULT 'ACTIVE',
    created_at timestamptz NOT NULL DEFAULT now(),
    updated_at timestamptz NOT NULL DEFAULT now(),
    UNIQUE (company_id, id)  -- alvo da FK composta em appointments
);
CREATE INDEX idx_customers_company_name ON customers (company_id, name);
-- e-mail único dentro da empresa, só quando preenchido
CREATE UNIQUE INDEX uq_customers_company_email ON customers (company_id, email) WHERE email IS NOT NULL;

-- Serviços. Serviço já usado em agendamentos é arquivado (is_active = false), não apagado.
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
    UNIQUE (company_id, id)  -- alvo da FK composta em appointments
);
CREATE INDEX idx_services_company ON services (company_id, is_active);

CREATE TABLE appointments (
    id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    company_id    uuid NOT NULL REFERENCES companies (id) ON DELETE CASCADE,
    customer_id   uuid,                                     -- NULL = walk-in ou cliente excluído
    client_name   text NOT NULL,                            -- nome no momento do agendamento
    service_id    uuid NOT NULL,
    staff_user_id uuid,                                     -- quem atende (quando houver equipe)
    created_by    uuid REFERENCES users (id) ON DELETE SET NULL,
    starts_at     timestamptz NOT NULL,
    ends_at       timestamptz NOT NULL,
    status        appointment_status NOT NULL DEFAULT 'SCHEDULED',
    price_cents   bigint NOT NULL CHECK (price_cents >= 0),  -- preço no momento do agendamento
    notes         text,
    created_at    timestamptz NOT NULL DEFAULT now(),
    updated_at    timestamptz NOT NULL DEFAULT now(),
    CHECK (ends_at > starts_at),
    -- FKs compostas: cliente, serviço e profissional precisam ser DA MESMA EMPRESA do agendamento.
    -- "SET NULL (coluna)" (Postgres 15+) zera só aquela coluna, sem apagar o company_id.
    FOREIGN KEY (company_id, customer_id)   REFERENCES customers (company_id, id) ON DELETE SET NULL (customer_id),
    FOREIGN KEY (company_id, service_id)    REFERENCES services (company_id, id),
    FOREIGN KEY (company_id, staff_user_id) REFERENCES memberships (company_id, user_id) ON DELETE SET NULL (staff_user_id)
);
CREATE INDEX idx_appointments_company_start ON appointments (company_id, starts_at);
CREATE INDEX idx_appointments_customer ON appointments (customer_id);
CREATE INDEX idx_appointments_service ON appointments (service_id);

-- Receitas manuais e despesas numa tabela só. A categoria permitida depende do tipo.
CREATE TABLE transactions (
    id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    company_id   uuid NOT NULL REFERENCES companies (id) ON DELETE CASCADE,
    type         transaction_type NOT NULL,
    category     text NOT NULL,
    description  text NOT NULL CHECK (length(description) BETWEEN 1 AND 200),
    amount_cents bigint NOT NULL CHECK (amount_cents > 0),  -- sempre positivo; "type" diz se entra ou sai
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

-- Auditoria: quem fez o quê. Ajuda no suporte e na LGPD.
CREATE TABLE audit_logs (
    id         uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    company_id uuid REFERENCES companies (id) ON DELETE CASCADE,
    user_id    uuid REFERENCES users (id) ON DELETE SET NULL,
    action     text NOT NULL,                               -- ex: 'appointment.cancelled'
    entity     text NOT NULL,                               -- ex: 'appointment'
    entity_id  uuid,
    metadata   jsonb,
    created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX idx_audit_company_date ON audit_logs (company_id, created_at);

-- ---------------------------------------------------------------------
-- updated_at automático
-- ---------------------------------------------------------------------
CREATE TRIGGER trg_companies_updated     BEFORE UPDATE ON companies     FOR EACH ROW EXECUTE FUNCTION set_updated_at();
CREATE TRIGGER trg_users_updated         BEFORE UPDATE ON users         FOR EACH ROW EXECUTE FUNCTION set_updated_at();
CREATE TRIGGER trg_subscriptions_updated BEFORE UPDATE ON subscriptions FOR EACH ROW EXECUTE FUNCTION set_updated_at();
CREATE TRIGGER trg_customers_updated     BEFORE UPDATE ON customers     FOR EACH ROW EXECUTE FUNCTION set_updated_at();
CREATE TRIGGER trg_services_updated      BEFORE UPDATE ON services      FOR EACH ROW EXECUTE FUNCTION set_updated_at();
CREATE TRIGGER trg_appointments_updated  BEFORE UPDATE ON appointments  FOR EACH ROW EXECUTE FUNCTION set_updated_at();
CREATE TRIGGER trg_transactions_updated  BEFORE UPDATE ON transactions  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- ---------------------------------------------------------------------
-- Row Level Security: cada empresa só enxerga (e grava) as próprias linhas.
-- Sem app.company_id definido na transação, essas tabelas parecem vazias.
-- Tabelas sem RLS (users, memberships, companies, convites, assinaturas...) são
-- usadas antes de saber a empresa (login, aceitar convite, webhook de pagamento)
-- e ficam protegidas pelo código.
-- ---------------------------------------------------------------------
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

-- ---------------------------------------------------------------------
-- Permissões do usuário da aplicação: só dados, nada de alterar estrutura
-- ---------------------------------------------------------------------
GRANT USAGE ON SCHEMA public TO bizly_app;
GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA public TO bizly_app;
-- tabelas criadas por migrations futuras recebem as mesmas permissões automaticamente
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT SELECT, INSERT, UPDATE, DELETE ON TABLES TO bizly_app;
-- a API não tem por que mexer no controle de migrations
REVOKE ALL ON goose_db_version FROM bizly_app;

-- +goose Down
DROP TABLE audit_logs, transactions, appointments, services, customers, business_hours,
           subscriptions, plans, password_resets, invitations, memberships, users, companies;
DROP TYPE transaction_type, subscription_status, appointment_status, customer_status, member_role;
DROP FUNCTION set_updated_at(), app_current_company();
-- remove permissões e permissões padrão do bizly_app, depois o próprio usuário
DROP OWNED BY bizly_app;
DROP ROLE IF EXISTS bizly_app;
