// Package database cuida de tudo que é banco: subir o Postgres de dev,
// rodar migrations, abrir o pool de conexões e as transações por empresa.
package database

import (
	"context"
	"database/sql"
	"fmt"
	"strings"
	"time"

	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgxpool"
	_ "github.com/jackc/pgx/v5/stdlib" // registra o driver "pgx" para o database/sql (usado pelo goose)
	"github.com/pressly/goose/v3"

	"bizly-api/db/migrations"
)

// Migrate aplica as migrations pendentes usando o usuário DONO do banco.
func Migrate(ctx context.Context, ownerURL string) error {
	db, err := sql.Open("pgx", ownerURL)
	if err != nil {
		return fmt.Errorf("abrindo conexão de migration: %w", err)
	}
	defer db.Close() // "defer" = executa quando a função terminar, aconteça o que acontecer

	goose.SetBaseFS(migrations.FS)
	if err := goose.SetDialect("postgres"); err != nil {
		return err
	}
	if err := goose.UpContext(ctx, db, "."); err != nil {
		return fmt.Errorf("aplicando migrations: %w", err)
	}
	return nil
}

// EnableAppUser libera o login do usuário da aplicação com a senha do .env.
// Só usado com o Postgres embutido; em produção quem cria o usuário é a infra.
func EnableAppUser(ctx context.Context, ownerURL, appUser, appPassword string) error {
	conn, err := pgx.Connect(ctx, ownerURL)
	if err != nil {
		return err
	}
	defer conn.Close(ctx)

	// ALTER ROLE não aceita parâmetros ($1), então escapamos na mão:
	// o nome com pgx.Identifier e a senha dobrando aspas simples (padrão SQL).
	stmt := fmt.Sprintf("ALTER ROLE %s WITH LOGIN PASSWORD '%s'",
		pgx.Identifier{appUser}.Sanitize(),
		strings.ReplaceAll(appPassword, "'", "''"))
	if _, err := conn.Exec(ctx, stmt); err != nil {
		return fmt.Errorf("habilitando usuário da aplicação: %w", err)
	}
	return nil
}

// Connect abre o pool de conexões da API (usuário da aplicação, sujeito a RLS).
// Pool = várias conexões reaproveitadas; cada requisição pega uma emprestada.
func Connect(ctx context.Context, appURL string) (*pgxpool.Pool, error) {
	pool, err := pgxpool.New(ctx, appURL)
	if err != nil {
		return nil, fmt.Errorf("criando pool: %w", err)
	}

	pingCtx, cancel := context.WithTimeout(ctx, 5*time.Second)
	defer cancel()
	if err := pool.Ping(pingCtx); err != nil {
		pool.Close()
		return nil, fmt.Errorf("conectando ao banco: %w", err)
	}
	return pool, nil
}

// WithTenant roda fn dentro de uma transação "presa" a uma empresa.
//
// É AQUI que o Row Level Security entra: definimos app.company_id só para esta
// transação (o "true" do set_config = LOCAL), e o Postgres passa a esconder
// as linhas de qualquer outra empresa. Toda rota que mexe em dados de empresa
// vai usar esta função.
//
// Se fn devolver erro, tudo é desfeito (rollback); senão, é confirmado (commit).
func WithTenant(ctx context.Context, pool *pgxpool.Pool, companyID string, fn func(tx pgx.Tx) error) error {
	return pgx.BeginFunc(ctx, pool, func(tx pgx.Tx) error {
		if _, err := tx.Exec(ctx, "SELECT set_config('app.company_id', $1, true)", companyID); err != nil {
			return fmt.Errorf("definindo empresa da transação: %w", err)
		}
		return fn(tx)
	})
}
