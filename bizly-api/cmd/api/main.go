package main

import (
	"context"
	"errors"
	"log/slog"
	"net/http"
	"os"
	"os/signal"
	"syscall"
	"time"

	"bizly-api/internal/config"
	"bizly-api/internal/database"
	"bizly-api/internal/httpapi"
)

func main() {
	logger := slog.New(slog.NewTextHandler(os.Stdout, nil))

	if err := run(logger); err != nil {
		logger.Error("fatal", "err", err)
		os.Exit(1)
	}
}

func run(logger *slog.Logger) error {
	ctx, stop := signal.NotifyContext(context.Background(), os.Interrupt, syscall.SIGTERM)
	defer stop()

	cfg, err := config.Load()
	if err != nil {
		return err
	}

	if cfg.EmbeddedPG {
		logger.Info("starting embedded postgres (first run downloads binaries)", "port", cfg.EmbeddedPGPort)
		stopPG, err := database.StartEmbedded(cfg)
		if err != nil {
			return err
		}
		defer func() {
			logger.Info("stopping embedded postgres")
			if err := stopPG(); err != nil {
				logger.Error("stop postgres", "err", err)
			}
		}()
	}

	if err := database.Migrate(ctx, cfg.OwnerDatabaseURL); err != nil {
		return err
	}
	if cfg.EmbeddedPG {
		if err := database.EnableAppUser(ctx, cfg.OwnerDatabaseURL, cfg.AppUser, cfg.AppPassword); err != nil {
			return err
		}
	}

	pool, err := database.Connect(ctx, cfg.AppDatabaseURL)
	if err != nil {
		return err
	}
	defer pool.Close()

	srv := &http.Server{
		Addr:              cfg.HTTPAddr,
		Handler:           httpapi.NewServer(pool, logger).Routes(),
		ReadHeaderTimeout: 5 * time.Second,
	}

	serverErr := make(chan error, 1)
	go func() {
		logger.Info("api listening", "addr", "http://"+cfg.HTTPAddr)
		if err := srv.ListenAndServe(); err != nil && !errors.Is(err, http.ErrServerClosed) {
			serverErr <- err
		}
		close(serverErr)
	}()

	select {
	case <-ctx.Done():
		logger.Info("shutting down")
	case err := <-serverErr:
		if err != nil {
			return err
		}
	}

	shutdownCtx, cancel := context.WithTimeout(context.Background(), 10*time.Second)
	defer cancel()
	return srv.Shutdown(shutdownCtx)
}
