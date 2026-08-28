# Fonts

Both families are licensed under the **SIL Open Font License 1.1**, which
permits redistribution as part of this app. Neither is modified beyond
subsetting.

| File | Family | Subset | Size |
|---|---|---|---|
| `inter-latin.woff2` | Inter | Latin | 48 kB |
| `inter-rupee.woff2` | Inter | U+20B9 only | 2.3 kB |
| `inter-latin-ext.woff2` | Inter | Latin Extended, minus U+20B9 | 85 kB |
| `noto-devanagari.woff2` | Noto Sans Devanagari | Devanagari | 121 kB |

All four are **variable** fonts spanning weight 100-900, so the app has the
whole axis rather than the five static cuts the old Google Fonts `@import`
requested.

Only `inter-latin` and `inter-rupee` load on a typical page. The other two are
gated behind `unicode-range` in `src/index.css` and are fetched only if a
character from their range is actually painted.

## Regenerating

The subsets come straight from the Google Fonts CSS API, which does the
subsetting server-side -- no local `fonttools` needed. Request the CSS with a
modern browser User-Agent (or Google serves the older `ttf` syntax) and pull the
`.woff2` URL out of the `src:` line:

```bash
UA="Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 \
(KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36"

# Inter, full Latin
curl -H "User-Agent: $UA" \
  "https://fonts.googleapis.com/css2?family=Inter:wght@100..900&display=swap"

# Inter, subsetted to exactly the rupee sign
curl -H "User-Agent: $UA" \
  "https://fonts.googleapis.com/css2?family=Inter:wght@100..900&text=%E2%82%B9"

# Noto Sans Devanagari
curl -H "User-Agent: $UA" \
  "https://fonts.googleapis.com/css2?family=Noto+Sans+Devanagari:wght@100..900&display=swap"
```

If the files are replaced, regenerate the `Inter Fallback` metric overrides in
`src/index.css` with `fontaine` or `capsize` rather than adjusting them by eye.
