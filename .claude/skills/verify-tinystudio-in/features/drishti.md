# Drishti product page — `/drishti/`

The Drishti product page on the public site. Anonymous marketing surface
for the mindful screen time app, no account, no session. Route:
`public/drishti/index.html`.

## How users reach it

- The home `/#products` section's second product card links to `/drishti/`.
- The top nav and footer lists link to `/drishti/` directly.
- Direct visit to `https://tinystudio.in/drishti/`.

## How to drive it

Preconditions: the harness is up at the recorded `PORT`; the `DOCTOR`
checks from the parent `SKILL.md` all passed.

- `GET /drishti/` — expect 200, HTML body. The H1 starts with
  `Drishti helps bring awareness to screen time before distraction takes over.`
  and is the first heading in the outline.

  ```bash
  PORT=$(cat /tmp/verify-tinystudio-in/server.port)
  curl -fsS "http://127.0.0.1:$PORT/drishti/" -o /tmp/verify-tinystudio-in/html/drishti.html
  grep -c "Drishti helps bring awareness to screen time before distraction takes over." /tmp/verify-tinystudio-in/html/drishti.html
  ```

- The three info-card H2s in the page are
  `A calmer way to interrupt the scroll reflex.`,
  `Awareness before "Open Anyway."`, and
  `Built around rituals, streaks, and compassion.`.

  ```bash
  for h2 in "A calmer way to interrupt the scroll reflex." "Awareness before “Open Anyway.”" "Built around rituals, streaks, and compassion."; do
    grep -c "$h2" /tmp/verify-tinystudio-in/html/drishti.html
  done
  ```

- The in-page nav row carries `Home`, `Apps` (`/#products`), `Support`
  (`/support/`), `Contact` (`/contact/`), and `Privacy` (`/privacy/`).

  ```bash
  grep -c 'href="/"' /tmp/verify-tinystudio-in/html/drishti.html
  grep -c 'href="/#products"' /tmp/verify-tinystudio-in/html/drishti.html
  grep -c 'href="/support/"' /tmp/verify-tinystudio-in/html/drishti.html
  grep -c 'href="/contact/"' /tmp/verify-tinystudio-in/html/drishti.html
  grep -c 'href="/privacy/"' /tmp/verify-tinystudio-in/html/drishti.html
  ```

- The page links to its own support and privacy routes:
  `/drishti/support/` and `/drishti/privacy/`.

  ```bash
  curl -s -o /dev/null -w "%{http_code}\n" "http://127.0.0.1:$PORT/drishti/support/"
  curl -s -o /dev/null -w "%{http_code}\n" "http://127.0.0.1:$PORT/drishti/privacy/"
  ```

## What proves success

- HTTP 200 on `/drishti/`, with the exact H1 string above in the body.
- All three info-card H2s present.
- All five top-nav hrefs present, each route 200.
- `/drishti/support/` and `/drishti/privacy/` both return 200.
- Canonical link in `<head>` points at `https://tinystudio.in/drishti/`.
- Exactly one H1; H1 is the first heading; no heading-level skip.

## Gotchas

- The Drishti H1 uses straight ASCII quotes inside the H1 copy; the
  "Open Anyway" H2 uses curly quotes. The drive greps for the curly
  form, which is the real page copy. A drive that grep'd for straight
  quotes would falsely pass.
- The H1 mentions `screen time`; the H2 mentions `scroll reflex`. A
  drive that grep'd for `screen` on the page would hit both — use the
  full H1 string instead.
- Like Promptly, this page is one of the two product pages. A drive
  that only checks for the product name in the H1 hits home, Promptly,
  and Drishti — match the full sentence to disambiguate.
