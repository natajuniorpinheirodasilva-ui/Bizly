// Package httpapi wires the HTTP routes.
package httpapi

import (
	"context"
	"log/slog"
	"net/http"
	"time"

	"github.com/jackc/pgx/v5/pgxpool"
)

type Server struct {
	db        *pgxpool.Pool
	logger    *slog.Logger
	jwtSecret string
}

func NewServer(db *pgxpool.Pool, logger *slog.Logger, jwtSecret string) *Server {
	return &Server{db: db, logger: logger, jwtSecret: jwtSecret}
}

func (s *Server) Routes() http.Handler {
	mux := http.NewServeMux()
	mux.HandleFunc("GET /health", s.handleHealth)
	mux.HandleFunc("POST /api/v1/auth/login", s.handleLogin)
	mux.HandleFunc("POST /api/v1/auth/register", s.handleRegister)
	// TODO: wrap mux with the cors middleware
	return cors(mux)
}

func (s *Server) handleHealth(w http.ResponseWriter, r *http.Request) {
	ctx, cancel := context.WithTimeout(r.Context(), 2*time.Second)
	defer cancel()

	if err := s.db.Ping(ctx); err != nil {
		s.logger.Error("health: database unavailable", "err", err)
		writeJSON(w, http.StatusServiceUnavailable, map[string]string{"status": "error", "database": "down"})
		return
	}
	writeJSON(w, http.StatusOK, map[string]string{"status": "ok", "database": "ok"})
}
