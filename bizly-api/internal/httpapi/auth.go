package httpapi

import (
	"errors"
	"net/http"
	"net/mail"
	"strings"
	"time"
	"unicode/utf8"

	"bizly-api/internal/auth"

	"github.com/jackc/pgx/v5"
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

type userResponse struct {
	ID        string `json:"id"`
	Name      string `json:"name"`
	Email     string `json:"email"`
	Role      string `json:"role"`
	CompanyID string `json:"company_id"`
}

type loginResponse struct {
	AccessToken string       `json:"access_token"`
	TokenType   string       `json:"token_type"`
	User        userResponse `json:"user"`
}

var dummyHash, _ = auth.HashPassword("dummy-password-for-timing")

const tokenTTL = 7 * 24 * time.Hour

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

func (s *Server) handleLogin(w http.ResponseWriter, r *http.Request) {
	var req loginRequest

	if err := decodeJSON(w, r, &req); err != nil {
		writeError(w, http.StatusBadRequest, "Invalid body request")
		return
	}

	req.Email = strings.TrimSpace(strings.ToLower(req.Email))

	ctx := r.Context()

	var userID, name, passwordHash string
	err := s.db.QueryRow(ctx, "SELECT id, name, password_hash FROM users WHERE email = $1", req.Email).Scan(&userID, &name, &passwordHash)
	if err != nil {
		if errors.Is(err, pgx.ErrNoRows) {
			// prevents timing attacks
			auth.CheckPassword(dummyHash, req.Password)
			writeError(w, http.StatusUnauthorized, "Invalid credentials")

			return
		}

		s.logger.Error("login: select user", "err", err)
		writeError(w, http.StatusInternalServerError, "Internal server error")
		return
	}

	if !auth.CheckPassword(passwordHash, req.Password) {
		writeError(w, http.StatusUnauthorized, "Invalid credentials")
		return
	}

	var companyID, role string
	err = s.db.QueryRow(ctx, "SELECT company_id, role FROM memberships WHERE user_id = $1 ORDER BY created_at LIMIT 1", userID).Scan(&companyID, &role)
	if err != nil {
		s.logger.Error("login: select company and role", "err", err)
		writeError(w, http.StatusInternalServerError, "Internal server error")
		return
	}

	token, err := auth.IssueToken(userID, req.Email, role, companyID, s.jwtSecret, tokenTTL)
	if err != nil {
		s.logger.Error("login: issue token", "err", err)
		writeError(w, http.StatusInternalServerError, "Internal server error")
		return
	}

	writeJSON(w, http.StatusOK, loginResponse{
		AccessToken: token,
		TokenType:   "bearer",
		User: userResponse{
			ID:        userID,
			Name:      name,
			Email:     req.Email,
			Role:      role,
			CompanyID: companyID,
		},
	})
}
