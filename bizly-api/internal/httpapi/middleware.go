package httpapi

import "net/http"

// TODO: cors(next http.Handler) http.Handler: allow the frontend origin
// (http://localhost:3000), handle OPTIONS preflight.

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
		next.ServeHTTP(w, r)
	})
}
