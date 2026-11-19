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
	companyID := "2"

	token, err := IssueToken(userID, email, role, companyID, secret, time.Hour)
	if err != nil {
		t.Fatalf("could not issue token: %v", err)
	}

	pToken, err := ParseToken(token, secret)
	if err != nil {
		t.Fatalf("couldn't parse token %v", err)
	}

	if pToken.Subject != userID {
		t.Errorf("Subject = %q, want %q", pToken.Subject, userID)
	}

	if pToken.Email != email {
		t.Errorf("Email = %q, want %q", pToken.Email, email)
	}

	if pToken.Role != role {
		t.Errorf("Role = %q, want %q", pToken.Role, role)
	}

	if pToken.CompanyID != companyID {
		t.Errorf("CompanyID = %q, want %q", pToken.CompanyID, companyID)
	}
}

func TestWrongSecret(t *testing.T) {
	token, err := IssueToken("user-1", "test@gmail.com", "OWNER", "company-1", "test-secret", time.Hour)
	if err != nil {
		t.Fatalf("could not issue token: %v", err)
	}

	_, err = ParseToken(token, "my-secret")
	if err == nil {
		t.Fatal("token signed with a different secret was accepted")
	}
}

func TestExpiredToken(t *testing.T) {
	token, err := IssueToken("user-1", "test@gmail.com", "OWNER", "company-1", "test-secret", -time.Hour)
	if err != nil {
		t.Fatalf("could not issue token: %v", err)
	}

	_, err = ParseToken(token, "test-secret")
	if err == nil {
		t.Fatalf("expired token was accepted")
	}
}
