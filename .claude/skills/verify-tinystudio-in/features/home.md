# Home — `/`

The portfolio home of `tinystudio.in`. Anonymous marketing surface, no
account, no session, no form. Route: `public/index.html`.

## How users reach it

- Direct visit to `https://tinystudio.in/`.
- Brand wordmark from any other public page (links back to `/`).
- The "Home" link inside the product and compare nav rows.

## How to drive it

Preconditions: the harness is up at the recorded `PORT`; the `DOCTOR`
checks from the parent `SKILL.md` all passed.

- `GET /` — expect 200, HTML body, `Content-Type: text/html; charset=utf-8`.
  The H1 is exactly `Products for people. One sharper system for teams.`
  and is the first heading in the outline. The two `#people` and `#teams`
  anchors exist in the page.

  ```bash
  PORT=$(cat /tmp/verify-tinystudio-in/server.port)
  curl -fsS "http://127.0.0.1:$PORT/" -o /tmp/verify-tinystudio-in/html/home.html
  grep -c "Products for people. One sharper system for teams." /tmp/verify-tinystudio-in/html/home.html
  ```

- `GET /#products` is the in-page jump from the hero CTA. The destination
  section has `id="products"` and an H2 reading `Not one app page repeated
  three times.`. Confirm both are in the served HTML.

  ```bash
  grep -c 'id="products"' /tmp/verify-tinystudio-in/html/home.html
  grep -c "Not one app page repeated three times." /tmp/verify-tinystudio-in/html/home.html
  ```

- `GET /#teams` jumps to the studio/team section. The destination anchor
  exists in the page; the H2 immediately after it reads `Small studio.
  Clear lanes. Better signal.`.

  ```bash
  grep -c 'id="teams"' /tmp/verify-tinystudio-in/html/home.html
  grep -c "Small studio. Clear lanes. Better signal." /tmp/verify-tinystudio-in/html/home.html
  ```

- The primary nav links to `#people`, `#teams`, `/support/`, `/contact/`.
  None of them point to a route that should 404.

  ```bash
  for path in /support/ /contact/; do
    code=$(curl -s -o /dev/null -w "%{http_code}" "http://127.0.0.1:$PORT$path")
    echo "$path -> $code"
  done
  ```

- The `#managed-service` section is the studio's primary conversion
  surface for The Website Correction. It carries the H2
  `The Website Correction.` and at least one H3 expanding the offer.

  ```bash
  grep -c 'id="managed-service"' /tmp/verify-tinystudio-in/html/home.html
  grep -c "The Website Correction." /tmp/verify-tinystudio-in/html/home.html
  ```

## What proves success

- HTTP 200 on `/`, with the exact H1 string above in the response body.
- `id="products"`, `id="teams"`, and `id="managed-service"` anchors all
  present in the served HTML.
- `/support/` and `/contact/` both return 200 (no in-page link points
  to a dead route from the home).
- Outline is clean: exactly one H1, the H1 is the first heading, no
  heading-level skip greater than one.
- Canonical link in `<head>` points at `https://tinystudio.in/`.

## Gotchas

- The H1 contains a period; the test grep must use the trailing period.
- "Promptly", "Drishti", and "0509" are the three product mentions in
  the H1-area copy. A drive that greps for any one of them is not a
  drive of the home — those are the entry points to the product pages.
- The hero CTA `See the studio map` is an in-page anchor, not a route.
  Drive it by inspecting the served HTML, not by following the link.
- The page uses `preload` + `noscript` for `styles.css`. A drive that
  only checks the response body's first 1 KB will miss the stylesheet
  reference; this is expected and not a failure.
