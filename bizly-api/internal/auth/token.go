package auth

import (
	"time"

	"github.com/golang-jwt/jwt/v5"
)

type Claims struct {
	jwt.RegisteredClaims
	Email     string `json:"email"`
	Role      string `json:"role"`
	CompanyID string `json:"company_id"`
}

func IssueToken(userID, email, role, companyID, secret string, ttl time.Duration) (string, error) {
	now := time.Now()

	claims := Claims{
		Email:     email,
		Role:      role,
		CompanyID: companyID,
		RegisteredClaims: jwt.RegisteredClaims{
			Subject:   userID,
			IssuedAt:  jwt.NewNumericDate(now),
			ExpiresAt: jwt.NewNumericDate(now.Add(ttl)),
		},
	}

	token := jwt.NewWithClaims(jwt.SigningMethodHS256, claims)

	return token.SignedString([]byte(secret))
}

func ParseToken(token, secret string) (*Claims, error) {
	claims := &Claims{}

	keyFunc := func(t *jwt.Token) (any, error) {
		return []byte(secret), nil
	}

	_, err := jwt.ParseWithClaims(token, claims, keyFunc, jwt.WithValidMethods([]string{"HS256"}))
	if err != nil {
		return nil, err
	}

	return claims, nil
}
