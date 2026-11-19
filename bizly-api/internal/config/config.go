// Package config lê as configurações da aplicação a partir de variáveis de ambiente.
//
// Em Go é comum ter um pacote só para isso: o resto do código recebe um Config
// pronto e nunca chama os.Getenv diretamente (fica fácil de testar e de achar).
package config

import (
	"errors"
	"fmt"
	"os"
	"strconv"

	"github.com/joho/godotenv"
)

// Config tem tudo que a aplicação precisa para subir.
// Em Go, campos com letra MAIÚSCULA são públicos (visíveis fora do pacote);
// minúscula = privado. Não existe "public"/"private" escrito.
type Config struct {
	Env      string // "development" ou "production"
	HTTPAddr string // endereço do servidor, ex: "127.0.0.1:8080"

	// Postgres embutido (só em desenvolvimento)
	EmbeddedPG      bool
	EmbeddedPGDir   string
	EmbeddedPGPort  uint32
	EmbeddedPGCache string // onde ficam os binários baixados; vazio = <EmbeddedPGDir>/cache

	// Credenciais do banco
	DBName        string
	OwnerUser     string // dono: roda as migrations
	OwnerPassword string
	AppUser       string // usado pela API (sem superpoderes, respeita RLS)
	AppPassword   string

	// Em produção, as URLs completas vêm prontas do provedor do banco.
	OwnerDatabaseURL string
	AppDatabaseURL   string
}

// Load carrega o .env (se existir) e monta o Config.
// Em Go, funções que podem falhar devolvem (resultado, error); quem chama SEMPRE confere o erro.
func Load() (Config, error) {
	// .env é opcional: em produção as variáveis vêm do próprio servidor.
	// O "_ =" ignora o erro de propósito (arquivo inexistente não é problema).
	_ = godotenv.Load()

	cfg := Config{
		Env:              getEnv("APP_ENV", "development"),
		HTTPAddr:         getEnv("HTTP_ADDR", "127.0.0.1:8080"),
		EmbeddedPG:       getEnv("EMBEDDED_PG", "true") == "true",
		EmbeddedPGDir:    getEnv("EMBEDDED_PG_DIR", ".data"),
		DBName:           getEnv("DB_NAME", "bizly"),
		OwnerUser:        getEnv("DB_OWNER_USER", "bizly_owner"),
		OwnerPassword:    os.Getenv("DB_OWNER_PASSWORD"),
		AppUser:          getEnv("DB_APP_USER", "bizly_app"),
		AppPassword:      os.Getenv("DB_APP_PASSWORD"),
		OwnerDatabaseURL: os.Getenv("OWNER_DATABASE_URL"),
		AppDatabaseURL:   os.Getenv("APP_DATABASE_URL"),
	}

	port, err := strconv.ParseUint(getEnv("EMBEDDED_PG_PORT", "5433"), 10, 32)
	if err != nil {
		return Config{}, fmt.Errorf("EMBEDDED_PG_PORT inválida: %w", err) // %w "embrulha" o erro original
	}
	cfg.EmbeddedPGPort = uint32(port)

	if cfg.EmbeddedPG {
		if cfg.Env == "production" {
			return Config{}, errors.New("EMBEDDED_PG não pode ser usado em produção")
		}
		if cfg.OwnerPassword == "" || cfg.AppPassword == "" {
			return Config{}, errors.New("defina DB_OWNER_PASSWORD e DB_APP_PASSWORD no .env (veja .env.example)")
		}
		// Com o banco embutido, nós mesmos montamos as URLs de conexão (sempre em localhost).
		cfg.OwnerDatabaseURL = postgresURL(cfg.OwnerUser, cfg.OwnerPassword, cfg.EmbeddedPGPort, cfg.DBName)
		cfg.AppDatabaseURL = postgresURL(cfg.AppUser, cfg.AppPassword, cfg.EmbeddedPGPort, cfg.DBName)
	}

	if cfg.OwnerDatabaseURL == "" || cfg.AppDatabaseURL == "" {
		return Config{}, errors.New("OWNER_DATABASE_URL e APP_DATABASE_URL são obrigatórias sem o Postgres embutido")
	}

	return cfg, nil
}

func postgresURL(user, password string, port uint32, db string) string {
	return fmt.Sprintf("postgres://%s:%s@localhost:%d/%s?sslmode=disable", user, password, port, db)
}

// getEnv devolve a variável de ambiente ou um valor padrão.
func getEnv(key, fallback string) string {
	if v := os.Getenv(key); v != "" {
		return v
	}
	return fallback
}
