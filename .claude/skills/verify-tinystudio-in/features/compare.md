# Compare page — `/compare/`

The Website Correction one-page sprint explanation. Anonymous marketing
surface; this is the page a buyer reads after the home's
`#managed-service` section, before clicking through to `/contact/`.
Route: `public/compare/index.html`.

## How users reach it

- The home `#managed-service` section's CTA row links to `/compare/`.
- Direct visit to `https://tinystudio.in/compare/`.

## How to drive it

Preconditions: the harness is up at the recorded `PORT`; the `DOCTOR`
checks from the parent `SKILL.md` all passed.

- `GET /compare/` — expect 200, HTML body. The H1 is exactly
  `The Website Correction is a focused one-page sprint, not a retainer.`
  and is the first heading in the outline.

  ```bash
  PORT=$(cat /tmp/verify-tinystudio-in/server.port)
  curl -fsS "http://127.0.0.1:$PORT/compare/" -o /tmp/verify-tinystudio-in/html/compare.html
  grep -c "The Website Correction is a focused one-page sprint, not a retainer." /tmp/verify-tinystudio-in/html/compare.html
  ```

- The H2 contract: `The Website Correction`, `Monthly retainers`,
  `Audit packages`, `Public sources this page cites`, and
  `What this page does not claim`. These five H2s are the contract
  between the home and this page.

  ```bash
  for h2 in "The Website Correction" "Monthly retainers" "Audit packages" "Public sources this page cites" "What this page does not claim"; do
    grep -c "$h2" /tmp/verify-tinystudio-in/html/compare.html
  done
  ```

- The in-page nav row carries `Home`, `Apps` (`/#products`), `Support`
  (`/support/`), `Contact` (`/contact/`), and `Privacy` (`/privacy/`).

  ```bash
  grep -c 'href="/"' /tmp/verify-tinystudio-in/html/compare.html
  grep -c 'href="/#products"' /tmp/verify-tinystudio-in/html/compare.html
  grep -c 'href="/support/"' /tmp/verify-tinystudio-in/html/compare.html
  grep -c 'href="/contact/"' /tmp/verify-tinystudio-in/html/compare.html
  grep -c 'href="/privacy/"' /tmp/verify-tinystudio-in/html/compare.html
  ```

- The page links to `/contact/` for the application path. The home
  `#managed-service` CTA also points to `/compare/`, not directly to
  `/contact/`.

  ```bash
  curl -s -o /dev/null -w "%{http_code}\n" "http://127.0.0.1:$PORT/contact/"
  ```

## What proves success

- HTTP 200 on `/compare/`, with the exact H1 string above in the body.
- All five H2 strings present.
- All five top-nav hrefs present, each route 200.
- `/contact/` returns 200.
- Canonical link in `<head>` points at `https://tinystudio.in/compare/`.
- Exactly one H1; H1 is the first heading; no heading-level skip.

## Gotchas

- The H1 contains `Website Correction`. The compare H1 is the single
  place that copy lives at this length; the home `#managed-service` H2
  is the same noun phrase but a different scope (`The Website Correction.`).
  A drive that only matches the noun phrase hits both — match the full
  H1 to disambiguate.
- The "Public sources this page cites" H2 implies the page lists
  external citations. A drive that grep'd for `https://` would catch
  any link, including the brand-mark links — that is not the
  contract. The contract is the H2 copy itself, not the citation count.
- The H2 `What this page does not claim` is the non-guarantees
  boundary. A drive that grep'd the page for `guarantee` would also
  hit home and contact; grep for the H2 here.
