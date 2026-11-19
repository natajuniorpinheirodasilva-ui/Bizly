package database

import (
	"fmt"
	"os"
	"path/filepath"

	embeddedpostgres "github.com/fergusstrange/embedded-postgres"

	"bizly-api/internal/config"
)

// StartEmbedded runs a local Postgres as a user process (dev only, no admin needed).
// The returned stop func shuts it down and closes the log file.
func StartEmbedded(cfg config.Config) (stop func() error, err error) {
	base, err := filepath.Abs(cfg.EmbeddedPGDir)
	if err != nil {
		return nil, fmt.Errorf("resolve embedded pg dir: %w", err)
	}
	if err := os.MkdirAll(base, 0o700); err != nil {
		return nil, fmt.Errorf("create %s: %w", base, err)
	}

	logFile, err := os.OpenFile(filepath.Join(base, "postgres.log"), os.O_CREATE|os.O_WRONLY|os.O_APPEND, 0o600)
	if err != nil {
		return nil, fmt.Errorf("open postgres log: %w", err)
	}

	cacheDir := cfg.EmbeddedPGCache
	if cacheDir == "" {
		cacheDir = filepath.Join(base, "cache")
	}

	pg := embeddedpostgres.NewDatabase(
		embeddedpostgres.DefaultConfig().
			Version(embeddedpostgres.V17).
			Port(cfg.EmbeddedPGPort).
			Database(cfg.DBName).
			Username(cfg.OwnerUser).
			Password(cfg.OwnerPassword).
			// Must be a dedicated dir: the library wipes it if it looks invalid.
			DataPath(filepath.Join(base, "pg")).
			RuntimePath(filepath.Join(base, "runtime")).
			CachePath(cacheDir).
			StartParameters(map[string]string{"listen_addresses": "localhost"}).
			Logger(logFile),
	)

	if err := pg.Start(); err != nil {
		logFile.Close()
		return nil, fmt.Errorf("start embedded postgres (port %d in use? see %s): %w",
			cfg.EmbeddedPGPort, filepath.Join(base, "postgres.log"), err)
	}

	stop = func() error {
		stopErr := pg.Stop()
		logFile.Close()
		return stopErr
	}
	return stop, nil
}
