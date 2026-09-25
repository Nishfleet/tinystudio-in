---
name: verify-tinystudio-in
description: Launch, health-check, drive, and prove the tinystudio.in public site locally. Use before claiming any change to public/, public-facing copy, structured data, contact paths, or product pages works end-to-end. The tinystudio-in repo is a human-reviewed managed service; the only user-touchable surface is the static site in `public/`, so the harness is a static-serve + drive + capture recipe, not a Worker harness.
---

TinyStudio (repo `tinystudio-in`) is a human-reviewed managed service for one
narrow offer (The Website Correction) plus the public portfolio at
`tinystudio.in`. The only user-touchable surface is the static site in
`public/`. The active service engine, growth brain, and operator scripts in
`src/` are offline tooling — never driven by an end user, and out of
scope for this harness.

Agents doing E2E verification MUST use this harness instead of improvising a
launch. Whoever ships a feature that touches a public route updates the
matching file in `features/` in the same PR.

## LAUNCH

### Launch — Python stdlib static server

```bash
python3 -m http.server 4178 --bind 127.0.0.1 --directory public
```

What it does, in order:

1. Binds a stdlib `http.server` on `127.0.0.1:4178`, serving the repo's
   `public/` directory. The port is fixed by the command, so the URL is
   always `http://127.0.0.1:4178`.
2. Uses `mimetypes.guess_type()` for `Content-Type`, so `text/html`,
   `text/css`, `text/plain`, `application/xml` and `image/svg+xml` all
   resolve; no charset parameter is sent.
3. Logs one line per request to stdout (method, route, status), with the
   startup banner `Serving HTTP on 127.0.0.1 port 4178` first.

Base URL: `http://127.0.0.1:4178`. Loopback only — the server binds to
`127.0.0.1`, so it never accepts external traffic.

The harness has no live dependencies. It does NOT call out to a paid
provider, does not contact Cloudflare, and does not require a Cloudflare
account. State is the static files on disk, exactly as the deploy bundle
ships them.

Readiness signal: `curl -fsS http://127.0.0.1:4178/` answers 200. Poll
for it rather than reading the log — the startup banner is block-buffered
when stdout is redirected to a file:

```bash
mkdir -p /tmp/verify-tinystudio-in
python3 -m http.server 4178 --bind 127.0.0.1 --directory public \
  > /tmp/verify-tinystudio-in/server.log 2>&1 &
echo $! > /tmp/verify-tinystudio-in/server.pid
# Wait for the server to answer; the port is known, so just poll it
while ! curl -fsS -o /dev/null http://127.0.0.1:4178/ 2>/dev/null; do
  sleep 0.25
done
```

There is no port file and no `PORT` variable anywhere in this skill: the
port is written literally as 4178 in every recipe.

### Never

- `npm run site:publish` — that script ships the bundle to Cloudflare. The
  harness exists to prove the bundle locally; shipping is a separate
  reviewed operation.
- `npm run dev` — there is no dev server for this repo; the closest
  is `site:prepare` (write a bundle into `artifacts/`), not a watcher.

## DOCTOR

Three checks, in order, each against `http://127.0.0.1:4178`:

```bash
# 1. The root index answers 200 with the H1 the homepage asserts.
curl -fsS "http://127.0.0.1:4178/" | grep -c "Products for people. One sharper system for teams."
# 2. A missing route answers 404, not 200 with an error body.
curl -s -o /dev/null -w "%{http_code}\n" "http://127.0.0.1:4178/this-route-does-not-exist"
# 3. Path-escape never serves a parent file. Curl normalises `/../`
# before sending, so use the URL-encoded form (`%2e%2e`). The Python
# server answers 404 for an escape (it never 200s), unlike the Cloudflare
# Pages deploy's 403. Assert 404 here.
curl -s -o /dev/null -w "%{http_code}\n" "http://127.0.0.1:4178/%2e%2e/package.json"
```

- Root H1 present means the server bound the `public/` directory correctly
  and the index file is parseable HTML.
- 404 body for a missing route means the server is not soft-404ing as the
  homepage. The Python server returns its own plain-text 404 body — the
  branded `404.html` in `public/` is what the live deploy serves, and it
  is guarded separately by `test/test-public-soft-404.mjs`.
- Path-escape answers 404 (never 200, never 500). `--path-as-is` is not
  needed on this server: it returns 404 either way.

If any check fails, the harness is not usable. Do not run feature drives
against a broken instance.

## DRIVE

Per-feature steps live in `features/`:

| Feature | File |
| --- | --- |
| Home `/` | `features/home.md` |
| Promptly product page `/promptly/` | `features/promptly.md` |
| Drishti product page `/drishti/` | `features/drishti.md` |
| Compare page `/compare/` | `features/compare.md` |
| Contact page `/contact/` | `features/contact.md` |
| Support page `/support/` | `features/support.md` |
| Privacy hub `/privacy/` | `features/privacy.md` |
| Privacy questions `/privacy-choices/` | `features/privacy-choices.md` |
| Website terms `/terms/` | `features/terms.md` |

Two drive styles:

- **HTTP drive** — `curl` against the static HTML. Enough for CI-less
  proof, sees everything the server returns.
- **Browser drive** — Playwright via an interactive browser tool, or the
  CLI: `npx --yes playwright screenshot --full-page http://127.0.0.1:4178<route> /tmp/verify-tinystudio-in/<name>.png`.
  Required for anything about layout,
  mobile, overflow, tap targets, focus, or keyboard.

### Deterministic inputs on the 4178 server

The static site has no per-request state, no auth, no query-string
behaviour. Every page is fully deterministic on a plain `GET /<route>/`:

- `/` → 200, contains the H1 `Products for people. One sharper system for teams.`
- `/promptly/` → 200, H1 starts with `Promptly keeps solo professionals`.
- `/drishti/` → 200, H1 starts with `Drishti helps bring awareness`.
- `/compare/` → 200, H1 starts with `The Website Correction is a focused`.
- `/contact/` → 200, H1 starts with `A direct line to Tiny Studio.`
- `/support/` → 200, H1 starts with the support copy on the page.
- `/privacy/` → 200, H1 is `The studio privacy center for Tiny Studio.`
- `/privacy-choices/` → 200, H1 is
  `Privacy questions and data requests have a clear route.`
- `/terms/` → 200, H1 is
  `Website terms for Tiny Studio’s public pages.` (curly apostrophe `'`,
  U+2019 — the rendered HTML uses a typographic apostrophe, not ASCII `'`)
- `/this-route-does-not-exist` → 404 (the Python server's own 404 body,
  not the branded `public/404.html` that the live deploy serves).

### Test-only surfaces — never drive these

These are the offline operator surfaces, not user paths. A manual drive
of any of them proves nothing about a real user, and the service-decision
ones write to the worktree:

- `npm run service:*` and `npm run growth:*` (operator loop, reviews,
  decisions, exports)
- `npm run prospect:*` (Loom packages, contact plans, recording briefs)
- `npm run client:*` (sprint, readiness, acceptance, proof review)
- `npm run check`, `npm run ci`, `npm test` (repo gate; the harness
  exists to give E2E proof above the gate, not to replace it)
- the `clients/`, `prospects/`, `service-decisions/`, and
  `runs/service-engine/outputs/` directories (private state, gitignored)

## EVIDENCE

**Server log.** The server prints one line per request to stdout
(method, route, status), after a `Serving HTTP on 127.0.0.1 port 4178`
startup banner. The captured launch log IS the server evidence.

**HTML proof.** Save the fetched HTML for every drive with
`curl -sS -o /tmp/verify-tinystudio-in/<name>.html -w '%{http_code}\n' http://127.0.0.1:4178<route>`:

```bash
mkdir -p /tmp/verify-tinystudio-in/html
curl -fsS -o /tmp/verify-tinystudio-in/html/home.html http://127.0.0.1:4178/
```

**Browser proof** (when the drive needs layout, mobile, or visual checks):
`npx --yes playwright screenshot --full-page http://127.0.0.1:4178<route> /tmp/verify-tinystudio-in/<name>.png`
opens a Playwright page and saves a full-page screenshot. It prints the
served status too, so `-w '%{http_code}\n'` on the paired curl keeps the status/body
check separate from the capture.

**What counts as proof:** readiness 200 + doctor pass + the feature's
observable state from its `features/` file, captured to files. A claim
in a transcript is not proof.

Store evidence OUTSIDE the repo tree — `/tmp/verify-tinystudio-in/`.
Never commit evidence into this repo.

## CLEANUP

Kill the server by its recorded PID. The server has no children, but
lsof the bound port to be sure:

```bash
kill "$(cat /tmp/verify-tinystudio-in/server.pid)" 2>/dev/null
sleep 0.25
lsof -i :4178   # must print nothing
```

- `/tmp/verify-tinystudio-in/` may be deleted wholesale. The harness
  recreates it on the next launch.
- Do NOT delete `artifacts/`, `previews/`, or `runs/`; those belong to
  the operator engine and are not produced by this harness.
- Cleanup preserves evidence. Teardown never deletes the captured log,
  HTML, or screenshots — copy them out before deleting `/tmp/verify-tinystudio-in/`.
