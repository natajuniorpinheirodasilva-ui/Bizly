# bizly-api

Bizly backend in Go with PostgreSQL 17.

## Running (development)

```bash
cp .env.example .env   # first time; generate passwords with: openssl rand -hex 24
go run ./cmd/api
curl http://127.0.0.1:8080/health
```

An embedded Postgres starts and stops with the API (Ctrl+C). No install or admin rights needed.
Binaries are downloaded to `.data/cache` on the first run; data lives in `.data/pg` (delete it to reset the DB).

If the API was killed and port 5433 is still in use:

```bash
./.data/runtime/bin/pg_ctl.exe stop -D .data/pg -m fast
```

## Tests

```bash
go test ./...
```

## Structure

```
cmd/api/            entrypoint
internal/config/    env configuration
internal/database/  embedded Postgres, migrations, pool, tenant transactions
internal/httpapi/   HTTP routes
db/migrations/      SQL migrations (embedded in the binary)
```

## Database security

- Migrations run as the owner role; the API uses `bizly_app` (no superuser, subject to RLS).
- Tenant data must be accessed through `database.WithTenant`, which scopes RLS to one company.
- The embedded Postgres only listens on localhost.
