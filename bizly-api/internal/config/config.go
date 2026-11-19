// Package config loads settings from environment variables (and .env in dev).
package config

import (
	"errors"
	"fmt"
	"os"
	"strconv"

	"github.com/joho/godotenv"
)

type Config struct {
	Env      string // "development" or "production"
	HTTPAddr string

	// Embedded Postgres (development only)
	EmbeddedPG      bool
	EmbeddedPGDir   string
	EmbeddedPGPort  uint32
	EmbeddedPGCache string // binaries cache; empty = <EmbeddedPGDir>/cache

	DBName        string
	OwnerUser     string // runs migrations
	OwnerPassword string
	AppUser       string // used by the API, subject to RLS
	AppPassword   string

	OwnerDatabaseURL string
	AppDatabaseURL   string
}

func Load() (Config, error) {
	_ = godotenv.Load() // .env is optional

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
		return Config{}, fmt.Errorf("invalid EMBEDDED_PG_PORT: %w", err)
	}
	cfg.EmbeddedPGPort = uint32(port)

	if cfg.EmbeddedPG {
		if cfg.Env == "production" {
			return Config{}, errors.New("EMBEDDED_PG must not be used in production")
		}
		if cfg.OwnerPassword == "" || cfg.AppPassword == "" {
			return Config{}, errors.New("DB_OWNER_PASSWORD and DB_APP_PASSWORD are required (see .env.example)")
		}
		cfg.OwnerDatabaseURL = postgresURL(cfg.OwnerUser, cfg.OwnerPassword, cfg.EmbeddedPGPort, cfg.DBName)
		cfg.AppDatabaseURL = postgresURL(cfg.AppUser, cfg.AppPassword, cfg.EmbeddedPGPort, cfg.DBName)
	}

	if cfg.OwnerDatabaseURL == "" || cfg.AppDatabaseURL == "" {
		return Config{}, errors.New("OWNER_DATABASE_URL and APP_DATABASE_URL are required without embedded Postgres")
	}

	return cfg, nil
}

func postgresURL(user, password string, port uint32, db string) string {
	return fmt.Sprintf("postgres://%s:%s@localhost:%d/%s?sslmode=disable", user, password, port, db)
}

func getEnv(key, fallback string) string {
	if v := os.Getenv(key); v != "" {
		return v
	}
	return fallback
}
