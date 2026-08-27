# Contact page — `/contact/`

The public contact surface. Anonymous marketing surface, no account, no
session. Carries the primary inbox, the policy and request paths, the
app-specific public pages, and the Website Correction application entry
point. Route: `public/contact/index.html`.

## How users reach it

- The home top-nav `Contact` link.
- The product page top-nav `Contact` link.
- The compare page in-page `Apply` CTA, which lands on the
  `#website-correction-application` section of this page.
- Direct visit to `https://tinystudio.in/contact/`.

## How to drive it

Preconditions: the harness is up at the recorded `PORT`; the `DOCTOR`
checks from the parent `SKILL.md` all passed.

- `GET /contact/` — expect 200, HTML body. The H1 is exactly
  `A direct line to Tiny Studio.` and is the first heading in the
  outline.

  ```bash
  PORT=$(cat /tmp/verify-tinystudio-in/server.port)
  curl -fsS "http://127.0.0.1:$PORT/contact/" -o /tmp/verify-tinystudio-in/html/contact.html
  grep -c "A direct line to Tiny Studio." /tmp/verify-tinystudio-in/html/contact.html
  ```

- The three info-card H2s are `Primary inbox`, `Policy and requests`,
  and `App-specific public pages`.

  ```bash
  for h2 in "Primary inbox" "Policy and requests" "App-specific public pages"; do
    grep -c "$h2" /tmp/verify-tinystudio-in/html/contact.html
  done
  ```

- The application section has `id="website-correction-application"`.
  Its H2 is `Apply by email, with a visible measurement marker.`.
  This is the in-page anchor the compare page jumps to.

  ```bash
  grep -c 'id="website-correction-application"' /tmp/verify-tinystudio-in/html/contact.html
  grep -c "Apply by email, with a visible measurement marker." /tmp/verify-tinystudio-in/html/contact.html
  ```

- The page exposes the primary support inbox as a `mailto:` link to
  `support@tinystudio.in` (HTML-encoded as `support&#64;tinystudio.in`).
  The Website Correction application uses a `mailto:` with
  `subject=The%20Website%20Correction%20application`.

  ```bash
  grep -c 'mailto:support&#64;tinystudio.in' /tmp/verify-tinystudio-in/html/contact.html
  grep -c 'subject=The%20Website%20Correction%20application' /tmp/verify-tinystudio-in/html/contact.html
  ```

- The in-page nav row carries `Home`, `Apps` (`/#products`), `Support`
  (`/support/`), `Contact` (this page, `href="/contact/"` or omitted),
  and `Privacy` (`/privacy/`).

  ```bash
  grep -c 'href="/"' /tmp/verify-tinystudio-in/html/contact.html
  grep -c 'href="/support/"' /tmp/verify-tinystudio-in/html/contact.html
  grep -c 'href="/privacy/"' /tmp/verify-tinystudio-in/html/contact.html
  ```

## What proves success

- HTTP 200 on `/contact/`, with the exact H1 string above in the body.
- All three info-card H2s present.
- The `id="website-correction-application"` section present with the
  application H2 string.
- The `mailto:support@tinystudio.in` link and the application mailto
  with the Website Correction subject line both present.
- All top-nav hrefs (Home, Apps, Support, Privacy) present, each
  route 200.
- Canonical link in `<head>` points at `https://tinystudio.in/contact/`.
- Exactly one H1; H1 is the first heading; no heading-level skip.

## Gotchas

- The `mailto:` target is HTML-encoded as `support&#64;tinystudio.in`
  in the source. A drive that greps for the raw `support@` will
  find zero matches — use the encoded form, or decode the file first.
- The application section is in-page, not a separate route. The
  compare page's `Apply` CTA jumps to `#website-correction-application`
  on this page; a drive that follows the link with a real browser
  load and verifies the scroll target is the strongest check, but a
  curl + grep for the section id is the cheapest.
- The H1 is the shortest on the site (`A direct line to Tiny Studio.`).
  A drive that greps for any shorter substring (`Tiny Studio`) would
  also match home, Promptly, Drishti, and compare. Match the full
  H1 to disambiguate.
