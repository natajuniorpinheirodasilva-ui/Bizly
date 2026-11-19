package database

// Testes de integração: sobem um Postgres temporário de verdade e conferem
// que as travas de segurança do banco funcionam.
//
// Rodar:  go test ./internal/database/ -v
//
// Em Go, arquivos que terminam em _test.go só são compilados pelo "go test",
// e toda função TestXxx(t *testing.T) vira um teste.

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

// setupDB liga um Postgres numa pasta temporária (apagada no fim do teste),
// roda as migrations e devolve o pool do usuário da aplicação.
func setupDB(t *testing.T) *pgxpool.Pool {
	t.Helper()
	ctx := context.Background()

	cache, _ := filepath.Abs("../../.data/cache") // reaproveita os binários já baixados
	cfg := config.Config{
		EmbeddedPGDir:   t.TempDir(), // o Go apaga essa pasta sozinho no fim
		EmbeddedPGPort:  5544,        // porta diferente da API de dev
		EmbeddedPGCache: cache,
		DBName:          "bizly_test",
		OwnerUser:       "owner_test",
		OwnerPassword:   randomPassword(t),
		AppUser:         "bizly_app",
		AppPassword:     randomPassword(t),
	}

	stopPG, err := StartEmbedded(cfg)
	if err != nil {
		t.Fatalf("subindo postgres de teste: %v", err)
	}
	t.Cleanup(func() { _ = stopPG() }) // Cleanup = roda no fim do teste, mesmo se falhar

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

	// duas empresas (a tabela companies não tem RLS)
	var companyA, companyB string
	for _, c := range []struct {
		name, slug string
		id         *string
	}{{"Empresa A", "empresa-a", &companyA}, {"Empresa B", "empresa-b", &companyB}} {
		err := pool.QueryRow(ctx, "INSERT INTO companies (name, slug) VALUES ($1, $2) RETURNING id", c.name, c.slug).Scan(c.id)
		if err != nil {
			t.Fatalf("criando %s: %v", c.name, err)
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

	// t.Run cria "subtestes": cada um aparece separado no resultado.
	t.Run("empresa grava os próprios clientes", func(t *testing.T) {
		err := WithTenant(ctx, pool, companyA, func(tx pgx.Tx) error { return insertCustomer(tx, companyA, "Maria (A)") })
		if err != nil {
			t.Fatal(err)
		}
		err = WithTenant(ctx, pool, companyB, func(tx pgx.Tx) error { return insertCustomer(tx, companyB, "João (B)") })
		if err != nil {
			t.Fatal(err)
		}
	})

	t.Run("empresa A não enxerga clientes da B", func(t *testing.T) {
		_ = WithTenant(ctx, pool, companyA, func(tx pgx.Tx) error {
			if n := countCustomers(tx); n != 1 {
				t.Errorf("empresa A deveria ver 1 cliente, viu %d", n)
			}
			return nil
		})
	})

	t.Run("empresa A não consegue gravar cliente na B", func(t *testing.T) {
		err := WithTenant(ctx, pool, companyA, func(tx pgx.Tx) error { return insertCustomer(tx, companyB, "Intruso") })
		if err == nil {
			t.Error("o banco deveria ter recusado gravar dado em outra empresa")
		}
	})

	t.Run("sem empresa definida, não vê nada", func(t *testing.T) {
		var n int
		if err := pool.QueryRow(ctx, "SELECT count(*) FROM customers").Scan(&n); err != nil {
			t.Fatal(err)
		}
		if n != 0 {
			t.Errorf("sem app.company_id deveria ver 0 clientes, viu %d", n)
		}
	})

	t.Run("usuário da aplicação não é superusuário", func(t *testing.T) {
		var super, bypass bool
		err := pool.QueryRow(ctx, "SELECT rolsuper, rolbypassrls FROM pg_roles WHERE rolname = current_user").Scan(&super, &bypass)
		if err != nil {
			t.Fatal(err)
		}
		if super || bypass {
			t.Errorf("bizly_app não pode ser superusuário nem ignorar RLS (super=%v bypassrls=%v)", super, bypass)
		}
	})

	t.Run("usuário da aplicação não altera estrutura", func(t *testing.T) {
		if _, err := pool.Exec(ctx, "CREATE TABLE hack (id int)"); err == nil {
			t.Error("bizly_app não deveria conseguir criar tabelas")
		}
		if _, err := pool.Exec(ctx, "DROP TABLE customers"); err == nil {
			t.Error("bizly_app não deveria conseguir apagar tabelas")
		}
		if _, err := pool.Exec(ctx, "DELETE FROM goose_db_version"); err == nil {
			t.Error("bizly_app não deveria mexer no controle de migrations")
		}
	})

	t.Run("postgres só escuta em localhost", func(t *testing.T) {
		var listen string
		if err := pool.QueryRow(ctx, "SHOW listen_addresses").Scan(&listen); err != nil {
			t.Fatal(err)
		}
		if listen != "localhost" {
			t.Errorf("listen_addresses deveria ser localhost, é %q", listen)
		}
	})
}
