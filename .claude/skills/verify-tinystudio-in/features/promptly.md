# Promptly product page — `/promptly/`

The Promptly product page on the public site. Anonymous marketing surface
for the booking and no-show-prevention app, no account, no session. Route:
`public/promptly/index.html`.

## How users reach it

- The home `/#products` section's first product card, with H3
  `Calm products with a clear daily job.`, links to `/promptly/`.
- The top nav and footer lists link to `/promptly/` directly.
- Direct visit to `https://tinystudio.in/promptly/`.

## How to drive it

Preconditions: the harness is up at the recorded `PORT`; the `DOCTOR`
checks from the parent `SKILL.md` all passed.

- `GET /promptly/` — expect 200, HTML body. The H1 starts with
  `Promptly keeps solo professionals booked, prepared, and harder to ghost.`
  and is the first heading in the outline.

  ```bash
  PORT=$(cat /tmp/verify-tinystudio-in/server.port)
  curl -fsS "http://127.0.0.1:$PORT/promptly/" -o /tmp/verify-tinystudio-in/html/promptly.html
  grep -c "Promptly keeps solo professionals booked, prepared, and harder to ghost." /tmp/verify-tinystudio-in/html/promptly.html
  ```

- The three info-card H2s in the page are `Built for the actual booking day.`,
  `Clients do not need the app.`, and `Reminders, proof, and calendar clarity.`.

  ```bash
  for h2 in "Built for the actual booking day." "Clients do not need the app." "Reminders, proof, and calendar clarity."; do
    grep -c "$h2" /tmp/verify-tinystudio-in/html/promptly.html
  done
  ```

- The in-page nav row carries `Home`, `Apps` (`/#products`), `Support`
  (`/support/`), `Contact` (`/contact/`), and `Privacy` (`/privacy/`).

  ```bash
  grep -c 'href="/"' /tmp/verify-tinystudio-in/html/promptly.html
  grep -c 'href="/#products"' /tmp/verify-tinystudio-in/html/promptly.html
  grep -c 'href="/support/"' /tmp/verify-tinystudio-in/html/promptly.html
  grep -c 'href="/contact/"' /tmp/verify-tinystudio-in/html/promptly.html
  grep -c 'href="/privacy/"' /tmp/verify-tinystudio-in/html/promptly.html
  ```

- The page links to its own support and privacy routes:
  `/promptly/support/` and `/promptly/privacy/`.

  ```bash
  curl -s -o /dev/null -w "%{http_code}\n" "http://127.0.0.1:$PORT/promptly/support/"
  curl -s -o /dev/null -w "%{http_code}\n" "http://127.0.0.1:$PORT/promptly/privacy/"
  ```

## What proves success

- HTTP 200 on `/promptly/`, with the exact H1 string above in the body.
- All three info-card H2s present.
- All five top-nav hrefs present, each route 200.
- `/promptly/support/` and `/promptly/privacy/` both return 200.
- Canonical link in `<head>` points at `https://tinystudio.in/promptly/`.
- Exactly one H1; H1 is the first heading; no heading-level skip.

## Gotchas

- The H1 is the longest copy on the site; the test grep must match the
  full sentence. A drive that only checks `Promptly` is not a drive of
  this page — `Promptly` appears on the home too.
- The page uses a `class="page-hero-card product-hero"` wrapper around
  the H1. A CSS-selector-only drive is brittle across redesigns; the
  H1 copy is the stable contract.
- The three info-card H2s are also the canonical section titles. If
  the copy changes, the harness and the home product card both need
  to update together — the H3 on the home product card is the parent
  contract.
