package httpapi

import (
	"errors"
	"net/http"
	"net/mail"
	"strings"
	"time"
	"unicode/utf8"

	"bizly-api/internal/database"

	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgconn"
)

// json tags: what the frontend reads; db tags: column names for pgx.RowToStructByName
type clientResponse struct {
	ID        string    `json:"id"         db:"id"`
	Name      string    `json:"name"       db:"name"`
	Email     *string   `json:"email"      db:"email"` // nullable
	Phone     *string   `json:"phone"      db:"phone"` // nullable
	Status    string    `json:"status"     db:"status"`
	CreatedAt time.Time `json:"created_at" db:"created_at"`
}

type createClient struct {
	Name  string `json:"name"`
	Email string `json:"email"`
	Phone string `json:"phone"`
}

func (s *Server) handleCreateClient(w http.ResponseWriter, r *http.Request) {
	claims := claimsFrom(r)
	if claims == nil {
		writeError(w, http.StatusUnauthorized, "Not authenticated")
		return
	}

	var req createClient

	if err := decodeJSON(w, r, &req); err != nil {
		writeError(w, http.StatusBadRequest, "Invalid body request")
		return
	}

	req.Name = strings.TrimSpace(req.Name)
	req.Email = strings.TrimSpace(strings.ToLower(req.Email))
	req.Phone = strings.TrimSpace(req.Phone)

	if req.Name == "" {
		writeError(w, http.StatusBadRequest, "Name cannot be empty")
		return
	}

	if utf8.RuneCountInString(req.Name) > 120 {
		writeError(w, http.StatusBadRequest, "Please, insert a shorter name")
		return
	}

	if req.Email != "" {
		if addr, err := mail.ParseAddress(req.Email); err != nil || addr.Address != req.Email {
			writeError(w, http.StatusBadRequest, "Invalid email")
			return
		}
	}

	ctx := r.Context()
	var created clientResponse

	err := database.WithTenant(ctx, s.db, claims.CompanyID, func(tx pgx.Tx) error {
		rows, err := tx.Query(ctx,
			`INSERT INTO customers (company_id, name, email, phone) VALUES ($1, $2, $3, $4)
			RETURNING id, name, email, phone, status, created_at
			`, claims.CompanyID, req.Name, nullIfEmpty(req.Email), nullIfEmpty(req.Phone))
		if err != nil {
			return err
		}

		created, err = pgx.CollectOneRow(rows, pgx.RowToStructByName[clientResponse])
		return err
	})

	var pgErr *pgconn.PgError
	if errors.As(err, &pgErr) && pgErr.Code == "23505" {
		writeError(w, http.StatusBadRequest, "A client with this email already exists")
		return
	}
	if err != nil {
		s.logger.Error("create client", "err", err)
		writeError(w, http.StatusInternalServerError, "Internal server error")
		return
	}

	writeJSON(w, http.StatusCreated, created)
}

func nullIfEmpty(s string) *string {
	if s == "" {
		return nil
	}
	return &s
}

func (s *Server) handleListClients(w http.ResponseWriter, r *http.Request) {
	claims := claimsFrom(r)
	if claims == nil {
		writeError(w, http.StatusUnauthorized, "Not authenticated")
		return
	}

	ctx := r.Context()
	clients := []clientResponse{} // empty slice, so no clients encodes as [] instead of null

	// RLS limits every query in here to the caller's company
	err := database.WithTenant(ctx, s.db, claims.CompanyID, func(tx pgx.Tx) error {
		rows, err := tx.Query(ctx, `
			SELECT id, name, email, phone, status, created_at
			FROM customers
			ORDER BY created_at DESC`)
		if err != nil {
			return err
		}

		// = (not :=) so it fills the outer clients
		clients, err = pgx.CollectRows(rows, pgx.RowToStructByName[clientResponse])
		return err
	})
	if err != nil {
		s.logger.Error("list clients", "err", err)
		writeError(w, http.StatusInternalServerError, "Internal server error")
		return
	}

	writeJSON(w, http.StatusOK, clients)
}
