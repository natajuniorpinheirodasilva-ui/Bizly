// Ponto de entrada da API. Rodar com:  go run ./cmd/api
//
// Ordem de inicialização:
//  1. lê a configuração
//  2. (dev) liga o Postgres embutido
//  3. roda as migrations com o usuário dono
//  4. conecta com o usuário da aplicação
//  5. sobe o servidor HTTP
//  6. ao apertar Ctrl+C, desliga tudo na ordem inversa
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

	// main não devolve erro em Go, então delegamos para run() e tratamos aqui.
	if err := run(logger); err != nil {
		logger.Error("a aplicação parou com erro", "err", err)
		os.Exit(1)
	}
}

func run(logger *slog.Logger) error {
	// ctx é cancelado quando você aperta Ctrl+C: todo mundo que recebe ctx fica sabendo.
	ctx, stop := signal.NotifyContext(context.Background(), os.Interrupt, syscall.SIGTERM)
	defer stop()

	cfg, err := config.Load()
	if err != nil {
		return err
	}

	if cfg.EmbeddedPG {
		logger.Info("ligando postgres embutido (a primeira vez baixa os binários)", "porta", cfg.EmbeddedPGPort)
		stopPG, err := database.StartEmbedded(cfg)
		if err != nil {
			return err
		}
		// defers rodam em ordem inversa: o postgres é o último a desligar
		defer func() {
			logger.Info("desligando postgres embutido")
			if err := stopPG(); err != nil {
				logger.Error("erro ao desligar postgres", "err", err)
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
		ReadHeaderTimeout: 5 * time.Second, // protege contra clientes lentos de propósito
	}

	// O servidor roda numa goroutine (uma "thread leve" do Go),
	// para a função main poder ficar esperando o Ctrl+C.
	serverErr := make(chan error, 1)
	go func() {
		logger.Info("API no ar", "endereco", "http://"+cfg.HTTPAddr)
		if err := srv.ListenAndServe(); err != nil && !errors.Is(err, http.ErrServerClosed) {
			serverErr <- err
		}
		close(serverErr)
	}()

	// select espera o que acontecer primeiro: Ctrl+C ou o servidor quebrar.
	select {
	case <-ctx.Done():
		logger.Info("encerrando...")
	case err := <-serverErr:
		if err != nil {
			return err
		}
	}

	// Dá até 10s para as requisições em andamento terminarem.
	shutdownCtx, cancel := context.WithTimeout(context.Background(), 10*time.Second)
	defer cancel()
	return srv.Shutdown(shutdownCtx)
}
