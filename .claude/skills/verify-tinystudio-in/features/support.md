# Support page — `/support/`

The public first-line support surface. Anonymous marketing surface, no
account, no session. Carries the single support address contract, the
per-app destinations, and the workflow-honest copy. Route:
`public/support/index.html`.

## How users reach it

- The home top-nav `Support` link.
- The product page top-nav `Support` link.
- The compare page top-nav `Support` link.
- Direct visit to `https://tinystudio.in/support/`.

## How to drive it

Preconditions: the harness is up at the recorded `PORT`; the `DOCTOR`
checks from the parent `SKILL.md` all passed.

- `GET /support/` — expect 200, HTML body. The H1 is exactly
  `Support that stays simple and easy to find.` and is the first
  heading in the outline.

  ```bash
  PORT=$(cat /tmp/verify-tinystudio-in/server.port)
  curl -fsS "http://127.0.0.1:$PORT/support/" -o /tmp/verify-tinystudio-in/html/support.html
  grep -c "Support that stays simple and easy to find." /tmp/verify-tinystudio-in/html/support.html
  ```

- The three info-card H2s are
  `One support address, clearly documented.`,
  `Each app has its own support destination.`, and
  `The support copy matches the real workflows.`.

  ```bash
  for h2 in "One support address, clearly documented." "Each app has its own support destination." "The support copy matches the real workflows."; do
    grep -c "$h2" /tmp/verify-tinystudio-in/html/support.html
  done
  ```

- The page links to the per-app support routes `/promptly/support/`
  and `/drishti/support/`. The home top-nav also points here from
  every product page.

  ```bash
  curl -s -o /dev/null -w "%{http_code}\n" "http://127.0.0.1:$PORT/promptly/support/"
  curl -s -o /dev/null -w "%{http_code}\n" "http://127.0.0.1:$PORT/drishti/support/"
  grep -c 'href="/promptly/support/"' /tmp/verify-tinystudio-in/html/support.html
  grep -c 'href="/drishti/support/"' /tmp/verify-tinystudio-in/html/support.html
  ```

- The in-page nav row carries `Home`, `Apps` (`/#products`), `Support`
  (this page, usually omitted or self-linked), `Contact`
  (`/contact/`), and `Privacy` (`/privacy/`).

  ```bash
  grep -c 'href="/"' /tmp/verify-tinystudio-in/html/support.html
  grep -c 'href="/#products"' /tmp/verify-tinystudio-in/html/support.html
  grep -c 'href="/contact/"' /tmp/verify-tinystudio-in/html/support.html
  grep -c 'href="/privacy/"' /tmp/verify-tinystudio-in/html/support.html
  ```

## What proves success

- HTTP 200 on `/support/`, with the exact H1 string above in the body.
- All three info-card H2s present.
- `/promptly/support/` and `/drishti/support/` both return 200.
- All top-nav hrefs (Home, Apps, Contact, Privacy) present, each
  route 200.
- Canonical link in `<head>` points at `https://tinystudio.in/support/`.
- Exactly one H1; H1 is the first heading; no heading-level skip.

## Gotchas

- The H1 is `Support that stays simple and easy to find.`. A drive
  that only matches `Support` would also match the home's support
  nav link, every product page, and the contact mailto — match the
  full H1 to disambiguate.
- The page is the studio-level support landing page; the per-app
  `/promptly/support/` and `/drishti/support/` pages are sub-routes
  with their own scope. A drive that asserts all the support copy
  on this single page is wrong — the per-app copy lives below.
- The support page is the only place the third info-card H2 reads
  `The support copy matches the real workflows.`. A drive that grep'd
  for `real workflows` would also match the contact and home copy
  (different sentences) — match the full H2 to disambiguate.
