// Package auth handles password hashing and JWT tokens
package auth

import "golang.org/x/crypto/bcrypt"

// HashPassword generates the password hash
func HashPassword(plain string) (string, error) {
	hashedPassword, err := bcrypt.GenerateFromPassword([]byte(plain), bcrypt.DefaultCost)
	if err != nil {
		return "", err
	}

	return string(hashedPassword), nil
}

// CheckPassword reports whether plain matches the stored bcrypt hash
func CheckPassword(hash, plain string) bool {
	err := bcrypt.CompareHashAndPassword([]byte(hash), []byte(plain))

	return err == nil
}
