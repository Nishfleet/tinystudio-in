# Website terms — `/terms/`

The studio's public website terms. Anonymous marketing surface, no
account, no session, no form. Purely informational. Route:
`public/terms/index.html`.

## How users reach it

- The top nav and footer `Terms` link on every public page.
- The privacy hub's trust-link row.
- Direct visit to `https://tinystudio.in/terms/`.

## How to drive it

Preconditions: the harness is up at the recorded `PORT`; the `DOCTOR`
checks from the parent `SKILL.md` all passed.

- `GET /terms/` — expect 200, HTML body. The H1 is exactly
  `Website terms for Tiny Studio's public pages.` and is the first
  heading in the outline.

  ```bash
  PORT=$(cat /tmp/verify-tinystudio-in/server.port)
  curl -fsS "http://127.0.0.1:$PORT/terms/" -o /tmp/verify-tinystudio-in/html/terms.html
  grep -c "Website terms for Tiny Studio" /tmp/verify-tinystudio-in/html/terms.html
  ```

- The three info-card H2s are
  `Information may evolve over time.`,
  `These pages are informational.`, and
  `Use the public contact routes.`.

  ```bash
  for h2 in "Information may evolve over time." "These pages are informational." "Use the public contact routes."; do
    grep -c "$h2" /tmp/verify-tinystudio-in/html/terms.html
  done
  ```

- The page links back to `/contact/` and `/support/` as the public
  contact routes.

  ```bash
  for path in /contact/ /support/; do
    code=$(curl -s -o /dev/null -w "%{http_code}" "http://127.0.0.1:$PORT$path")
    echo "$path -> $code"
  done
  ```

## What proves success

- HTTP 200 on `/terms/`, with the exact H1 string above in the body.
- All three info-card H2s present.
- `/contact/` and `/support/` both return 200.
- Canonical link in `<head>` points at `https://tinystudio.in/terms/`.
- Exactly one H1; H1 is the first heading; no heading-level skip.

## Gotchas

- The page makes no contractual claims and offers no checkout. A drive
  that expects a `Plan` or `Buy` button is reading a different
  surface.
- The H1 uses a typographic apostrophe (U+2019), not an ASCII `'`.
  Match the encoded form in the served HTML, not a transliterated
  form, or the test grep will miss the heading.
- This page is intentionally thin — the per-app pages carry the
  binding copy. The terms page is a sibling, not a parent.
