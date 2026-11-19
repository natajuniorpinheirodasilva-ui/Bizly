package database

// Integration tests: spin up a throwaway Postgres and check the DB security guarantees.

import (
	"context"
	"crypto/rand"
	"encoding/hex"
	"path/filepath"
	"testing"

	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgxpool"

	"bizly-api/internal/config"
)

func randomPassword(t *testing.T) string {
	b := make([]byte, 16)
	if _, err := rand.Read(b); err != nil {
		t.Fatal(err)
	}
	return hex.EncodeToString(b)
}

func setupDB(t *testing.T) *pgxpool.Pool {
	t.Helper()
	ctx := context.Background()

	cache, _ := filepath.Abs("../../.data/cache") // reuse downloaded binaries
	cfg := config.Config{
		EmbeddedPGDir:   t.TempDir(),
		EmbeddedPGPort:  5544, // avoid clashing with the dev instance
		EmbeddedPGCache: cache,
		DBName:          "bizly_test",
		OwnerUser:       "owner_test",
		OwnerPassword:   randomPassword(t),
		AppUser:         "bizly_app",
		AppPassword:     randomPassword(t),
	}

	stopPG, err := StartEmbedded(cfg)
	if err != nil {
		t.Fatalf("start test postgres: %v", err)
	}
	t.Cleanup(func() { _ = stopPG() })

	ownerURL := "postgres://owner_test:" + cfg.OwnerPassword + "@localhost:5544/bizly_test?sslmode=disable"
	appURL := "postgres://bizly_app:" + cfg.AppPassword + "@localhost:5544/bizly_test?sslmode=disable"

	if err := Migrate(ctx, ownerURL); err != nil {
		t.Fatal(err)
	}
	if err := EnableAppUser(ctx, ownerURL, cfg.AppUser, cfg.AppPassword); err != nil {
		t.Fatal(err)
	}
	pool, err := Connect(ctx, appURL)
	if err != nil {
		t.Fatal(err)
	}
	t.Cleanup(pool.Close)
	return pool
}

func TestSecurity(t *testing.T) {
	pool := setupDB(t)
	ctx := context.Background()

	var companyA, companyB string
	for _, c := range []struct {
		name, slug string
		id         *string
	}{{"Company A", "company-a", &companyA}, {"Company B", "company-b", &companyB}} {
		err := pool.QueryRow(ctx, "INSERT INTO companies (name, slug) VALUES ($1, $2) RETURNING id", c.name, c.slug).Scan(c.id)
		if err != nil {
			t.Fatalf("create %s: %v", c.name, err)
		}
	}

	insertCustomer := func(tx pgx.Tx, companyID, name string) error {
		_, err := tx.Exec(ctx, "INSERT INTO customers (company_id, name) VALUES ($1, $2)", companyID, name)
		return err
	}
	countCustomers := func(tx pgx.Tx) int {
		var n int
		if err := tx.QueryRow(ctx, "SELECT count(*) FROM customers").Scan(&n); err != nil {
			t.Fatal(err)
		}
		return n
	}

	t.Run("tenant writes its own customers", func(t *testing.T) {
		err := WithTenant(ctx, pool, companyA, func(tx pgx.Tx) error { return insertCustomer(tx, companyA, "Maria (A)") })
		if err != nil {
			t.Fatal(err)
		}
		err = WithTenant(ctx, pool, companyB, func(tx pgx.Tx) error { return insertCustomer(tx, companyB, "João (B)") })
		if err != nil {
			t.Fatal(err)
		}
	})

	t.Run("tenant cannot read another tenant's rows", func(t *testing.T) {
		_ = WithTenant(ctx, pool, companyA, func(tx pgx.Tx) error {
			if n := countCustomers(tx); n != 1 {
				t.Errorf("company A should see 1 customer, saw %d", n)
			}
			return nil
		})
	})

	t.Run("tenant cannot write into another tenant", func(t *testing.T) {
		err := WithTenant(ctx, pool, companyA, func(tx pgx.Tx) error { return insertCustomer(tx, companyB, "Intruder") })
		if err == nil {
			t.Error("expected RLS to reject a cross-tenant insert")
		}
	})

	t.Run("no tenant set sees nothing", func(t *testing.T) {
		var n int
		if err := pool.QueryRow(ctx, "SELECT count(*) FROM customers").Scan(&n); err != nil {
			t.Fatal(err)
		}
		if n != 0 {
			t.Errorf("expected 0 customers without app.company_id, saw %d", n)
		}
	})

	t.Run("app role is not superuser", func(t *testing.T) {
		var super, bypass bool
		err := pool.QueryRow(ctx, "SELECT rolsuper, rolbypassrls FROM pg_roles WHERE rolname = current_user").Scan(&super, &bypass)
		if err != nil {
			t.Fatal(err)
		}
		if super || bypass {
			t.Errorf("bizly_app must not be superuser or bypass RLS (super=%v bypassrls=%v)", super, bypass)
		}
	})

	t.Run("app role cannot change schema", func(t *testing.T) {
		if _, err := pool.Exec(ctx, "CREATE TABLE hack (id int)"); err == nil {
			t.Error("bizly_app should not be able to create tables")
		}
		if _, err := pool.Exec(ctx, "DROP TABLE customers"); err == nil {
			t.Error("bizly_app should not be able to drop tables")
		}
		if _, err := pool.Exec(ctx, "DELETE FROM goose_db_version"); err == nil {
			t.Error("bizly_app should not touch the migrations table")
		}
	})

	t.Run("postgres listens on localhost only", func(t *testing.T) {
		var listen string
		if err := pool.QueryRow(ctx, "SHOW listen_addresses").Scan(&listen); err != nil {
			t.Fatal(err)
		}
		if listen != "localhost" {
			t.Errorf("listen_addresses should be localhost, got %q", listen)
		}
	})
}
