package httpapi

import (
	"testing"
)

func TestMakeSlug(t *testing.T) {
	t.Log(makeSlug("Caffè & Tiramisù!"))
}
