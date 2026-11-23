package httpapi

import (
	"regexp"
	"strings"
	"testing"
)

func TestMakeSlug(t *testing.T) {
	tests := []struct {
		name string
		want string // slug without the random suffix
	}{
		{"Caffè & Tiramisù!", "caffe-tiramisu"},
		{"Bäckerei Müller", "backerei-muller"},
		{"Straße & Söhne", "strasse-sohne"},
		{"Œuvre Café", "oeuvre-cafe"},
		{"Ærø Design", "aero-design"},
		{"Łódź Studio", "lodz-studio"},
		{"Ça Va Salon", "ca-va-salon"},
		{"José & María Peluquería", "jose-maria-peluqueria"},
		{"Joe's Barber Shop", "joes-barber-shop"},
		{"Joe’s Barber Shop", "joes-barber-shop"}, // curly apostrophe
		{"L'Atelier de Chloé", "latelier-de-chloe"},
		{"  --Hello   World--  ", "hello-world"},
		{"東京サロン", "company"},
		{"Москва Салон", "company"},
		{"!!!", "company"},
		{"", "company"},
		{"& " + strings.Repeat("a", 60), strings.Repeat("a", 50)},
		{strings.Repeat("a", 49) + " bcd", strings.Repeat("a", 49)},
	}

	suffix := regexp.MustCompile(`^[a-z0-9]{6}$`)

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			got := makeSlug(tt.name)

			i := strings.LastIndex(got, "-")
			if i < 0 {
				t.Fatalf("makeSlug(%q) = %q, missing random suffix", tt.name, got)
			}

			if base := got[:i]; base != tt.want {
				t.Errorf("makeSlug(%q) = %q, want %q-<suffix>", tt.name, got, tt.want)
			}
			if s := got[i+1:]; !suffix.MatchString(s) {
				t.Errorf("makeSlug(%q) suffix = %q, want 6 lowercase letters/digits", tt.name, s)
			}
		})
	}
}

func TestMakeSlugIsUnique(t *testing.T) {
	if makeSlug("Acme") == makeSlug("Acme") {
		t.Error("same name produced the same slug twice")
	}
}
