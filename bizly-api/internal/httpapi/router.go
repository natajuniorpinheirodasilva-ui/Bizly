// Package httpapi monta as rotas HTTP da API.
package httpapi

import (
	"context"
	"encoding/json"
	"log/slog"
	"net/http"
	"time"

	"github.com/jackc/pgx/v5/pgxpool"
)

// Server guarda as dependências que as rotas usam (banco, logger...).
// Em vez de variáveis globais, passamos tudo por aqui: fica explícito e testável.
type Server struct {
	db     *pgxpool.Pool
	logger *slog.Logger
}

func NewServer(db *pgxpool.Pool, logger *slog.Logger) *Server {
	return &Server{db: db, logger: logger}
}

// Routes devolve o roteador com todas as rotas.
// Desde o Go 1.22 o roteador padrão aceita "MÉTODO /caminho/{parametro}",
// então não precisamos de framework para isso.
func (s *Server) Routes() http.Handler {
	mux := http.NewServeMux()
	mux.HandleFunc("GET /health", s.handleHealth)
	return mux
}

// handleHealth responde se a API e o banco estão de pé.
// Usado por monitoramento e pelo deploy para saber se a aplicação subiu.
// "(s *Server)" na frente do nome faz desta função um MÉTODO do Server.
func (s *Server) handleHealth(w http.ResponseWriter, r *http.Request) {
	ctx, cancel := context.WithTimeout(r.Context(), 2*time.Second)
	defer cancel()

	if err := s.db.Ping(ctx); err != nil {
		s.logger.Error("health: banco indisponível", "err", err)
		writeJSON(w, http.StatusServiceUnavailable, map[string]string{"status": "error", "database": "down"})
		return
	}
	writeJSON(w, http.StatusOK, map[string]string{"status": "ok", "database": "ok"})
}

// writeJSON é um helper que todas as rotas vão usar para responder em JSON.
func writeJSON(w http.ResponseWriter, status int, body any) {
	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(status)
	_ = json.NewEncoder(w).Encode(body)
}
