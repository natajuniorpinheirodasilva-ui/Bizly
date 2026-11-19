// Package database handles migrations, the connection pool and tenant-scoped transactions.
package database

import (
	"context"
	"database/sql"
	"fmt"
	"strings"
	"time"

	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgxpool"
	_ "github.com/jackc/pgx/v5/stdlib" // "pgx" driver for database/sql (goose)
	"github.com/pressly/goose/v3"

	"bizly-api/db/migrations"
)

// Migrate applies pending migrations as the owner role.
func Migrate(ctx context.Context, ownerURL string) error {
	db, err := sql.Open("pgx", ownerURL)
	if err != nil {
		return fmt.Errorf("open migration connection: %w", err)
	}
	defer db.Close()

	goose.SetBaseFS(migrations.FS)
	if err := goose.SetDialect("postgres"); err != nil {
		return err
	}
	if err := goose.UpContext(ctx, db, "."); err != nil {
		return fmt.Errorf("apply migrations: %w", err)
	}
	return nil
}

// EnableAppUser enables login for the app role (embedded Postgres only;
// in production the role is provisioned by the infra).
func EnableAppUser(ctx context.Context, ownerURL, appUser, appPassword string) error {
	conn, err := pgx.Connect(ctx, ownerURL)
	if err != nil {
		return err
	}
	defer conn.Close(ctx)

	// ALTER ROLE doesn't accept bind parameters, so quote manually.
	stmt := fmt.Sprintf("ALTER ROLE %s WITH LOGIN PASSWORD '%s'",
		pgx.Identifier{appUser}.Sanitize(),
		strings.ReplaceAll(appPassword, "'", "''"))
	if _, err := conn.Exec(ctx, stmt); err != nil {
		return fmt.Errorf("enable app user: %w", err)
	}
	return nil
}

// Connect opens the API pool using the app role.
func Connect(ctx context.Context, appURL string) (*pgxpool.Pool, error) {
	pool, err := pgxpool.New(ctx, appURL)
	if err != nil {
		return nil, fmt.Errorf("create pool: %w", err)
	}

	pingCtx, cancel := context.WithTimeout(ctx, 5*time.Second)
	defer cancel()
	if err := pool.Ping(pingCtx); err != nil {
		pool.Close()
		return nil, fmt.Errorf("connect to database: %w", err)
	}
	return pool, nil
}

// WithTenant runs fn in a transaction scoped to companyID, so RLS only exposes
// that company's rows. Every query on tenant data must go through here.
func WithTenant(ctx context.Context, pool *pgxpool.Pool, companyID string, fn func(tx pgx.Tx) error) error {
	return pgx.BeginFunc(ctx, pool, func(tx pgx.Tx) error {
		if _, err := tx.Exec(ctx, "SELECT set_config('app.company_id', $1, true)", companyID); err != nil {
			return fmt.Errorf("set tenant: %w", err)
		}
		return fn(tx)
	})
}
