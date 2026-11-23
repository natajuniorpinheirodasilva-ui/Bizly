package httpapi

import (
	"errors"
	"net/http"
	"net/mail"
	"strings"
	"unicode/utf8"

	"bizly-api/internal/auth"

	"github.com/jackc/pgx/v5/pgconn"
)

type registerRequest struct {
	CompanyName string `json:"company_name"`
	Name        string `json:"name"`
	Email       string `json:"email"`
	Password    string `json:"password"`
}

type loginRequest struct {
	Email    string `json:"email"`
	Password string `json:"password"`
}

func (s *Server) handleRegister(w http.ResponseWriter, r *http.Request) {
	var req registerRequest

	if err := decodeJSON(w, r, &req); err != nil {
		writeError(w, http.StatusBadRequest, "invalid request body")
		return
	}

	req.Name = strings.TrimSpace(req.Name)
	req.CompanyName = strings.TrimSpace(req.CompanyName)
	req.Email = strings.TrimSpace(strings.ToLower(req.Email))

	if req.Name == "" || req.CompanyName == "" {
		writeError(w, http.StatusBadRequest, "Name and company name are required")
		return
	}

	if utf8.RuneCountInString(req.CompanyName) > 120 || utf8.RuneCountInString(req.Name) > 120 {
		writeError(w, http.StatusBadRequest, "Name and company name must be at most 120 characters")
		return
	}

	if len(req.Password) < 8 {
		writeError(w, http.StatusBadRequest, "Please, insert a longer password")
		return
	}
	if len(req.Password) > 72 {
		writeError(w, http.StatusBadRequest, "Please, insert a shorter password")
		return
	}

	if addr, err := mail.ParseAddress(req.Email); err != nil || addr.Address != req.Email {
		writeError(w, http.StatusBadRequest, "Invalid email")
		return
	}

	hash, err := auth.HashPassword(req.Password)
	if err != nil {
		s.logger.Error("register: hash password", "err", err)
		writeError(w, http.StatusInternalServerError, "Internal server error")
		return
	}

	ctx := r.Context()
	tx, err := s.db.Begin(ctx)
	if err != nil {
		s.logger.Error("register: begin tx", "err", err)
		writeError(w, http.StatusInternalServerError, "Internal server error")
		return
	}

	defer func() {
		_ = tx.Rollback(ctx)
	}()

	var companyID string

	err = tx.QueryRow(ctx, "INSERT INTO companies (name, slug) VALUES ($1, $2) RETURNING id", req.CompanyName, makeSlug(req.CompanyName)).Scan(&companyID)
	if err != nil {
		s.logger.Error("register: insert company", "err", err)
		writeError(w, http.StatusInternalServerError, "Internal server error")
		return
	}

	var userID string

	err = tx.QueryRow(ctx, "INSERT INTO users (name, email, password_hash) VALUES ($1, $2, $3) RETURNING id", req.Name, req.Email, hash).Scan(&userID)
	if err != nil {
		var pgErr *pgconn.PgError
		if errors.As(err, &pgErr) && pgErr.Code == "23505" {
			writeError(w, http.StatusBadRequest, "User with this email already exists")
			return
		}

		s.logger.Error("register: insert user", "err", err)
		writeError(w, http.StatusInternalServerError, "Internal server error")
		return
	}

	_, err = tx.Exec(ctx, "INSERT INTO memberships (company_id, user_id, role) VALUES ($1, $2, 'OWNER')", companyID, userID)
	if err != nil {
		s.logger.Error("register: insert membership", "err", err)
		writeError(w, http.StatusInternalServerError, "Internal server error")
		return
	}

	if err := tx.Commit(ctx); err != nil {
		s.logger.Error("register: commit new account", "err", err)
		writeError(w, http.StatusInternalServerError, "Internal server error")
		return
	}

	writeJSON(w, http.StatusOK, map[string]string{"message": "Account created"})
}

// TODO: handleLogin (POST /api/v1/auth/login)
//   - find user by email, check password, load membership (company_id, role)
//   - wrong email or password -> 401 "Invalid credentials" (same message for both)
//   - 200 {access_token, token_type: "bearer", user: {id, name, email, role, company_id}}
