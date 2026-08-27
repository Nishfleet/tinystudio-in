---
name: verify-tinystudio-in
description: Launch, health-check, drive, and prove the tinystudio.in public site locally. Use before claiming any change to public/, public-facing copy, structured data, contact paths, or product pages works end-to-end. The tinystudio-in repo is a human-reviewed managed service; the only user-touchable surface is the static site in `public/`, so the harness is a static-serve + drive + capture recipe, not a Worker harness.
---

TinyStudio (repo `tinystudio-in`) is a human-reviewed managed service for one
narrow offer (The Website Correction) plus the public portfolio at
`tinystudio.in`. The only user-touchable surface is the static site in
`public/`. The active service engine, growth brain, and operator scripts in
`scripts/` are offline tooling — never driven by an end user, and out of
scope for this harness.

Agents doing E2E verification MUST use this harness instead of improvising a
launch. Whoever ships a feature that touches a public route updates the
matching file in `features/` in the same PR.

## LAUNCH

### Primary — deterministic fixture server (use this)

```bash
node scripts/verify-tinystudio-in-serve.mjs
```

What it does, in order:

1. Binds a `node:http` server on `127.0.0.1:<port>` (default 4178, or the
   first free port above it), serving the repo's `public/` directory with
   the exact MIME map the live Cloudflare Pages deploy uses
   (`text/html; charset=utf-8`, `text/css; charset=utf-8`,
   `text/javascript; charset=utf-8`, `image/svg+xml`, `image/png`,
   `application/xml; charset=utf-8`, etc).
2. Refuses to serve a file that escapes `public/` (any request with `..` or
   an absolute path under the root answers 403), and 404s anything else.
3. Logs `verify-tinystudio-in: serving public/ at http://127.0.0.1:<port>`
   to stdout once it is ready, and prints a JSON snapshot of the bound
   address.

Base URL: `http://127.0.0.1:<port>`. Loopback only — the harness binds to
`127.0.0.1` so it never accepts external traffic.

The harness has no live dependencies. It does NOT call out to a paid
provider, does not contact Cloudflare, and does not require a Cloudflare
account. State is the static files on disk, exactly as the deploy bundle
ships them.

Readiness signal: the line `verify-tinystudio-in: serving public/ at
http://127.0.0.1:<port>` printed once, followed by the listening event
silence (no error event). The harness exits 1 if `public/` is missing or
empty.

```bash
mkdir -p /tmp/verify-tinystudio-in
node scripts/verify-tinystudio-in-serve.mjs > /tmp/verify-tinystudio-in/server.log 2>&1 &
echo $! > /tmp/verify-tinystudio-in/server.pid
# Wait for the bound-port line
for i in 1 2 3 4 5 6 7 8 9 10; do
  if grep -q "serving public/" /tmp/verify-tinystudio-in/server.log 2>/dev/null; then break; fi
  sleep 0.5
done
PORT=$(grep -oE "127\.0\.0\.1:[0-9]+" /tmp/verify-tinystudio-in/server.log | head -1 | cut -d: -f2)
echo $PORT > /tmp/verify-tinystudio-in/server.port
```

### Secondary — `python3 -m http.server` (visual only)

```bash
cd public && python3 -m http.server 4178 --bind 127.0.0.1
```

Use only for a one-off visual peek. The Python server does NOT apply the
production MIME map, does NOT block path-escape, and does NOT match the
deployment binary exactly — never assert pass/fail against it.

### Never

- `npm run site:publish` — that script ships the bundle to Cloudflare. The
  harness exists to prove the bundle locally; shipping is a separate
  reviewed operation.
- `npm run dev` — there is no dev server for this repo; the closest
  is `site:prepare` (write a bundle into `artifacts/`), not a watcher.

## DOCTOR

Three checks, in order, each against the recorded port:

```bash
PORT=$(cat /tmp/verify-tinystudio-in/server.port)
# 1. The root index returns 200 with the H1 the homepage asserts.
curl -fsS "http://127.0.0.1:$PORT/" | grep -c "Products for people. One sharper system for teams."
# 2. The 404 page exists and answers 404 on a missing route.
curl -s -o /dev/null -w "%{http_code}\n" "http://127.0.0.1:$PORT/this-route-does-not-exist"
# 3. Path-escape is refused. Curl normalises `/../` before sending, so
# the harness defence only fires for an escape that survives the
# client: either a URL-encoded form (`%2e%2e`) or a `curl --path-as-is`
# request. Both MUST return 403.
curl -s -o /dev/null -w "%{http_code}\n" "http://127.0.0.1:$PORT/%2e%2e/package.json"
curl -s -o /dev/null -w "%{http_code}\n" --path-as-is "http://127.0.0.1:$PORT/../package.json"
```

- Root H1 present means the harness bound the directory correctly and the
  index file is parseable HTML.
- 404 page resolves to a 404 status, not a 200 with an error body.
- Path-escape answers 403 (never 200, never 500). The harness MUST refuse
  to serve a parent file.

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

Two drive styles:

- **HTTP drive** — `curl` against the static HTML. Enough for CI-less
  proof, sees everything the server returns.
- **Browser drive** — Playwright via `node scripts/verify-tinystudio-in-drive.mjs`
  or an interactive browser tool. Required for anything about layout,
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
- `/this-route-does-not-exist` → 404 (the `404.html` body is rendered
  with status 404 by the harness).

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

**Server log.** The harness prints one line per request to stdout
(method, route, status). The captured launch log IS the server evidence.

**HTML proof.** Save the fetched SSR HTML for every drive:

```bash
PORT=$(cat /tmp/verify-tinystudio-in/server.port)
mkdir -p /tmp/verify-tinystudio-in/html
curl -fsS "http://127.0.0.1:$PORT/" -o /tmp/verify-tinystudio-in/html/home.html
```

**Browser proof** (when the drive needs layout, mobile, or visual checks):
use `node scripts/verify-tinystudio-in-drive.mjs <route>` (it opens a
Playwright page, dumps the rendered HTML, and saves a full-page
screenshot). Screenshots land in `/tmp/verify-tinystudio-in/screenshots/`.

**What counts as proof:** readiness 200 + doctor pass + the feature's
observable state from its `features/` file, captured to files. A claim
in a transcript is not proof.

Store evidence OUTSIDE the repo tree — `/tmp/verify-tinystudio-in/`.
Never commit evidence into this repo.

## CLEANUP

Kill the harness by its recorded PID. The harness has no children, but
lsof the bound port to be sure:

```bash
kill "$(cat /tmp/verify-tinystudio-in/server.pid)" 2>/dev/null
sleep 0.5
PORT=$(cat /tmp/verify-tinystudio-in/server.port 2>/dev/null)
[ -n "$PORT" ] && lsof -i :"$PORT"   # must print nothing
```

- `/tmp/verify-tinystudio-in/` may be deleted wholesale. The harness
  recreates it on the next launch.
- Do NOT delete `artifacts/`, `previews/`, or `runs/`; those belong to
  the operator engine and are not produced by this harness.
- Cleanup preserves evidence. Teardown never deletes the captured log,
  HTML, or screenshots — copy them out before deleting `/tmp/verify-tinystudio-in/`.
