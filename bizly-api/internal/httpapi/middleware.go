package httpapi

import (
	"context"
	"net/http"
	"strings"
	"time"

	"bizly-api/internal/auth"
)

type statusRecorder struct {
	http.ResponseWriter
	status int
}

type contextKey string

const claimsKey contextKey = "claims"

// allowed origin
const allowedOrigin = "http://localhost:3000"

func cors(next http.Handler) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		origin := r.Header.Get("Origin")

		if origin == allowedOrigin {
			w.Header().Set("Access-Control-Allow-Origin", origin)
			w.Header().Set("Access-Control-Allow-Methods", "GET, POST, PUT, PATCH, DELETE, OPTIONS")
			w.Header().Set("Access-Control-Allow-Headers", "Content-Type, Authorization")
		}

		w.Header().Add("Vary", "Origin")
		if r.Method == http.MethodOptions {
			w.WriteHeader(http.StatusNoContent)
			return
		}

		next.ServeHTTP(w, r)
	})
}

// status logger
func (rec *statusRecorder) WriteHeader(code int) {
	rec.status = code
	rec.ResponseWriter.WriteHeader(code)
}

func (s *Server) logRequests(next http.Handler) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		start := time.Now()
		rec := &statusRecorder{ResponseWriter: w, status: http.StatusOK}

		next.ServeHTTP(rec, r)

		s.logger.Info("request", "method", r.Method, "path", r.URL.Path, "status", rec.status, "duration", time.Since(start))
	})
}

// auth validation
func (s *Server) requireAuth(next http.HandlerFunc) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		authorization := r.Header.Get("Authorization")
		token, found := strings.CutPrefix(authorization, "Bearer ")
		if !found || token == "" {
			writeError(w, http.StatusUnauthorized, "Not authenticated")
			return
		}

		claims, err := auth.ParseToken(token, s.jwtSecret)
		if err != nil {
			writeError(w, http.StatusUnauthorized, "Not authenticated")
			return
		}

		ctx := context.WithValue(r.Context(), claimsKey, claims)

		next(w, r.WithContext(ctx))
	}
}

func claimsFrom(r *http.Request) *auth.Claims {
	claims, _ := r.Context().Value(claimsKey).(*auth.Claims)

	return claims
}
