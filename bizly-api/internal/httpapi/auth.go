package httpapi

import (
	"net/http"
	"net/mail"
	"strings"
	"unicode/utf8"

	"bizly-api/internal/auth"
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

// TODO: handleRegister (POST /api/v1/auth/register)
//   - decode + validate input
//   - in one transaction: insert company (unique slug), user, membership (OWNER)
//   - duplicate email (pg code 23505) -> 400 "User with this email already exists."
//   - 200 {"message": "Account created"}
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

	_ = hash
}

// TODO: handleLogin (POST /api/v1/auth/login)
//   - find user by email, check password, load membership (company_id, role)
//   - wrong email or password -> 401 "Invalid credentials" (same message for both)
//   - 200 {access_token, token_type: "bearer", user: {id, name, email, role, company_id}}
