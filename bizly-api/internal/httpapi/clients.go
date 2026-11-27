package httpapi

import (
	"net/http"
	"time"

	"bizly-api/internal/database"

	"github.com/jackc/pgx/v5"
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
