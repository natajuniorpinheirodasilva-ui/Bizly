package httpapi

import (
	"crypto/rand"
	"strings"
	"unicode"

	"golang.org/x/text/runes"
	"golang.org/x/text/transform"
	"golang.org/x/text/unicode/norm"
)

// Accent replacer seperates every accent with norm.NFD, é = e + ´.
// runes.Remove(runes.In) removes all Mn("mark, nonspacing"), which are exactly those separated accents
// norm.NFC reassemble the rest
// transform.Chain chain all steps together and aplly to the text
func stripAccents(s string) string {
	t := transform.Chain(norm.NFD, runes.Remove(runes.In(unicode.Mn)), norm.NFC)
	result, _, err := transform.String(t, s)
	if err != nil {
		return s
	}
	return result
}

// Letters that aren't base letter + accent, so stripAccents can't handle them.
// Apostrophes are dropped so "joe's" becomes "joes", not "joe-s".
var letterReplacer = strings.NewReplacer(
	"ß", "ss",
	"æ", "ae",
	"œ", "oe",
	"ø", "o",
	"ł", "l",
	"đ", "d",
	"þ", "th",
	"'", "",
	"’", "",
)

func makeSlug(name string) string {
	text := stripAccents(letterReplacer.Replace(strings.ToLower(name)))

	var b strings.Builder
	lastWasDash := false

	// transform special characters into -. Caffè & Tiramisù! = caffe-tiramisu-
	for _, r := range text {
		if (r >= 'a' && r <= 'z') || (r >= '0' && r <= '9') {
			b.WriteRune(r)
			lastWasDash = false
		} else if !lastWasDash {
			b.WriteByte('-')
			lastWasDash = true
		}
	}

	// trim before cutting so a leading dash doesn't eat into the 50 chars,
	// and again after, in case the cut lands on a dash
	slug := strings.Trim(b.String(), "-")
	if len(slug) > 50 {
		slug = strings.Trim(slug[:50], "-")
	}

	// non-Latin names (e.g. Japanese, Cyrillic) leave nothing behind
	if slug == "" {
		slug = "company"
	}

	suffix := strings.ToLower(rand.Text()[:6])

	return slug + "-" + suffix
}

// concepts

// begin opens the package
// commit confirms everything
// rollback undos everything
