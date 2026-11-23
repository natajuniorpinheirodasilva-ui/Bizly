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

func makeSlug(name string) string {

	text := stripAccents(strings.ToLower(name))

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

	slug := b.String()

	// removes unnecessary -'s. Caffè & Tiramisù! = caffe-tiramisu
	slug = strings.Trim(slug, "-")
	if len(slug) > 50 {
		slug = slug[:50]
		// strip the -'s again, if it comes back
		slug = strings.Trim(slug, "-")
	}
	if slug == "" {
		slug = "defaultCompanyName"
	}

	suffix := strings.ToLower(rand.Text()[:6])

	return slug + "-" + suffix
}

// concepts

// begin opens the package
// commit confirms everything
// rollback undos everything
