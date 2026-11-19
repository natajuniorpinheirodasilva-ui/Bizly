package auth

import (
	"testing"
	"time"
)

func TestPassword(t *testing.T) {
	password := "my-password-123"

	hash, err := HashPassword(password)
	if err != nil {
		t.Fatal(err)
	}

	t.Log(hash)

	if !CheckPassword(hash, password) {
		t.Error("correct password was rejected!")
	}

	if CheckPassword(hash, "wrong-password") {
		t.Error("wrong password was accepted")
	}

	if hash == password {
		t.Error("hash equals the plain password")
	}
}

func TestToken(t *testing.T) {
	userID := "1"
	secret := "test-secret"
	email := "test@gmail.com"
	role := "OWNER"
	companyID := "1"

	token, err := IssueToken(userID, email, role, companyID, secret, time.Hour)
	if err != nil {
		t.Fatalf("could not issue token: %v", err)
	}

	parseToken, err := ParseToken(token, secret)
	if err != nil {
		t.Errorf("couldn't parse token %v", err)
	}

}
