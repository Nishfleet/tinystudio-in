# Privacy hub — `/privacy/`

The studio's privacy center. Anonymous marketing surface, no account, no
session, no form. Links out to per-app privacy pages. Route:
`public/privacy/index.html`.

## How users reach it

- The top nav and footer `Privacy` link on every public page.
- The home `#managed-service` section's trust-link row.
- Direct visit to `https://tinystudio.in/privacy/`.

## How to drive it

Preconditions: the harness is up at the recorded `PORT`; the `DOCTOR`
checks from the parent `SKILL.md` all passed.

- `GET /privacy/` — expect 200, HTML body. The H1 is exactly
  `The studio privacy center for Tiny Studio.` and is the first heading
  in the outline.

  ```bash
  PORT=$(cat /tmp/verify-tinystudio-in/server.port)
  curl -fsS "http://127.0.0.1:$PORT/privacy/" -o /tmp/verify-tinystudio-in/html/privacy.html
  grep -c "The studio privacy center for Tiny Studio." /tmp/verify-tinystudio-in/html/privacy.html
  ```

- The three info-card H2s are
  `What Tiny Studio may receive`,
  `To respond, troubleshoot, and improve.`, and
  `Each app still gets its own policy page.`.

  ```bash
  for h2 in "What Tiny Studio may receive" "To respond, troubleshoot, and improve." "Each app still gets its own policy page."; do
    grep -c "$h2" /tmp/verify-tinystudio-in/html/privacy.html
  done
  ```

- The page links out to per-app privacy routes (`/promptly/privacy/`,
  `/drishti/privacy/`) and to the privacy questions route
  (`/privacy-choices/`).

  ```bash
  for path in /promptly/privacy/ /drishti/privacy/ /privacy-choices/; do
    code=$(curl -s -o /dev/null -w "%{http_code}" "http://127.0.0.1:$PORT$path")
    echo "$path -> $code"
  done
  ```

## What proves success

- HTTP 200 on `/privacy/`, with the exact H1 string above in the body.
- All three info-card H2s present.
- `/promptly/privacy/`, `/drishti/privacy/`, and `/privacy-choices/`
  all return 200.
- Canonical link in `<head>` points at `https://tinystudio.in/privacy/`.
- Exactly one H1; H1 is the first heading; no heading-level skip.

## Gotchas

- The privacy hub is informational — no forms, no JS-driven fetch, no
  data collection. A drive that POSTs to this page is reading a
  different surface.
- The page's per-app outbound links are the only navigable content;
  a drive that only checks the H1 misses the trust-link contract.
- Privacy copy and the H1 are coupled to the per-app privacy pages:
  if the H1 changes, every page that links here needs a re-read.
