# Privacy questions — `/privacy-choices/`

The studio's privacy questions and data-request route. Anonymous
marketing surface, no account, no session, no form on this page
itself — it links to the contact and privacy routes. Route:
`public/privacy-choices/index.html`.

## How users reach it

- The privacy hub's trust-link row.
- The footer `Privacy choices` link on every public page.
- Direct visit to `https://tinystudio.in/privacy-choices/`.

## How to drive it

Preconditions: the harness is up at the recorded `PORT`; the `DOCTOR`
checks from the parent `SKILL.md` all passed.

- `GET /privacy-choices/` — expect 200, HTML body. The H1 is exactly
  `Privacy questions and data requests have a clear route.` and is the
  first heading in the outline.

  ```bash
  PORT=$(cat /tmp/verify-tinystudio-in/server.port)
  curl -fsS "http://127.0.0.1:$PORT/privacy-choices/" -o /tmp/verify-tinystudio-in/html/privacy-choices.html
  grep -c "Privacy questions and data requests have a clear route." /tmp/verify-tinystudio-in/html/privacy-choices.html
  ```

- The three info-card H2s are
  `Ask what information may be involved.`,
  `Use the same privacy inbox.`, and
  `The website itself is lightweight.`.

  ```bash
  for h2 in "Ask what information may be involved." "Use the same privacy inbox." "The website itself is lightweight."; do
    grep -c "$h2" /tmp/verify-tinystudio-in/html/privacy-choices.html
  done
  ```

- The page links back to `/privacy/` and `/contact/` as the
  resolution routes for privacy questions.

  ```bash
  for path in /privacy/ /contact/; do
    code=$(curl -s -o /dev/null -w "%{http_code}" "http://127.0.0.1:$PORT$path")
    echo "$path -> $code"
  done
  ```

## What proves success

- HTTP 200 on `/privacy-choices/`, with the exact H1 string above in
  the body.
- All three info-card H2s present.
- `/privacy/` and `/contact/` both return 200.
- Canonical link in `<head>` points at
  `https://tinystudio.in/privacy-choices/`.
- Exactly one H1; H1 is the first heading; no heading-level skip.

## Gotchas

- This page is a router — it links to the inbox and explains what
  the user can ask, but the actual data request is handled at
  `/contact/`. A drive that expects a submission form here is
  reading a different surface.
- The page is intentionally a sibling of `/privacy/`, not a child.
  Navigation between the two must be a peer link, not a back-stack.
- The H1 is the only anchor; the three H2 cards do not anchor
  themselves. A drive that greps for `#`-style anchors inside the
  body will not find any.
