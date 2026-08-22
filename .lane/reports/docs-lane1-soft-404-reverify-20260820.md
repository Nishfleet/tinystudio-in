# Lane 1 report: reverify soft-404 item — RESOLVED on the live site (2026-08-20)

## Item

- [unreviewed-by-opus] Every unknown URL on tinystudio.in returns HTTP 200 with the full homepage - soft-404, and no

## Verdict

**Item is RESOLVED on the live site — `https://tinystudio.in/__soft-404-test-*.html` now returns HTTP 404 with the real "Page not found" page, not the homepage. No source change is needed in this lane. The previous 2026-08-17 block (PR #189) on the missing Cloudflare token was unblocked by the deploy-pipeline fixes landed 2026-08-19..2026-08-20 (PRs #198 / #199 / #208), which let the publish lane actually upload the filtered `public/` bundle for the first time since 2026-06-20. The live site now matches the source proof chain: 21/21 static unit checks, 18/18 live soft-404 checks, 213/214 deploy-lane live checks (the single failure is an unrelated script-internal `PUBLIC_PAGE_URLS is not defined` in `check-public-live-deploy.mjs` section I — the dedicated soft-404 checker `check-public-live-soft-404.mjs` is green).**

## Evidence (verified 2026-08-20 from this checkout, branched off fresh `origin/main` = `b64f242`)

### 1. Live unknown URL now returns HTTP 404 with the real not-found page

- `curl -sI https://tinystudio.in/this-does-not-exist-$(date +%s)` → `HTTP/2 404`, `content-type: text/html; charset=utf-8`, `cf-cache-status: DYNAMIC`.
- `curl -sI https://tinystudio.in/__soft-404-test-$(openssl rand -hex 6).html` → `HTTP/2 404`.
- `curl -sL https://tinystudio.in/this-does-not-exist-...` body is the real not-found page:
  - `<title>Page not found • Tiny Studio</title>` (not the homepage title).
  - `<h1>This page could not be found.</h1>`.
  - `<meta name="robots" content="noindex">`.
  - shared site header/footer chrome.
  - no canonical to `https://tinystudio.in/`, no "alternateName" / "not affiliated" homepage markers.
- `node scripts/check-public-live-soft-404.mjs` (the dedicated soft-404 live checker) → **18 checks, 0 failures** (exit 0). Full output:
  - A. homepage reachable and intact (2/2)
  - B. unknown URL returns real 404 (3/3) — including the random nonce path
  - C. deployed 404 page is real, not homepage (3/3)
  - D. real page still serves (1/1)
  - E. deployed stylesheet keeps WCAG 2.2 24px footer tap-target rule (PR #22) (7/7)
  - F. deployed llms.txt lists every public page (1/1)

### 2. Live deploy-lane acceptance now passes the soft-404 proof

`node scripts/check-public-live-deploy.mjs` section C (the soft-404 proof) passes:

```
C. unknown URLs return a real 404 (PR #34)
  ok unknown URL returns 404 (got 404)
  ok the 404 body is not the homepage
```

The full live deploy check reports **214 checks, 1 failure** — the failure is a script-internal `ReferenceError: PUBLIC_PAGE_URLS is not defined` in section I (the `/llms.txt lists every public page (PR #68 live)` check inside this specific script), not a live-site defect. The same proof is the dedicated `check-public-live-soft-404.mjs` section F, which is green. The llms.txt file itself serves correctly (`/llms.txt` returns 200 with all 12 public pages listed). The script bug is out of scope for this item and is not blocking the soft-404 verdict.

### 3. Live homepage is the new portfolio-only build (PRs #29 / #35 live)

`curl -sL https://tinystudio.in/` confirms the previously-stale 2026-06-20 bundle is gone and the current source is now live:

- `<title>Tiny Studio | Promptly, Drishti, and 0509</title>` (portfolio title).
- `"alternateName": "tinystudio.in"` (brand-disambiguation JSON-LD from PR #29).
- `It is not affiliated with other apps or studios that use the name Tiny Studio.` (non-affiliation copy from PR #29).
- No `Website Correction`, no `managed-service`, no `data-measure-source` — the snoozed buyer path is correctly absent.

### 4. Source state — unchanged from PR #34 / #104, still green

- Fix commit `4499dd4` ("fix(public): stop soft-404s by serving a real 404 page for unknown URLs (#34)") is an ancestor of fresh `origin/main = b64f242`.
- `public/404.html` is intact: real title, `noindex`, no canonical to `/`, exactly one H1, 25 internal escape links to real destinations, shared header/footer chrome.
- `node scripts/test-public-soft-404.mjs` → **21 checks, 0 failures** (exit 0).
- Release-lane deploy proof `d54c91f` ("enforce the top-level real-404 deploy proof in the release lane (#104)") is an ancestor of origin/main. `scripts/prepare-public-deploy-bundle.mjs` `NEUTRAL_PROOFS` includes a top-level real-404 proof (real title + not a homepage clone + `noindex`) that fails the lane closed, and the deploy-bundle gate still passes on this checkout.

### 5. What changed since the 2026-08-17 block (PR #189) — the deploy pipeline is now functional

The previous lane-1 report (`docs-lane1-soft-404-reverify-20260817.md`, PR #189) concluded "live delivery is still blocked by the missing `CLOUDFLARE_API_TOKEN` repo secret (NEEDS-NISH)". Between 2026-08-19 and 2026-08-20 the deploy lane was repaired end-to-end:

- **PR #198 / `aaeab8b` "fix(deploy): accept CLOUDFLARE as the token secret name alongside CLOUDFLARE_API_TOKEN"** — the workflow now reads `secrets.CLOUDFLARE_API_TOKEN || secrets.CLOUDFLARE`, so the token provisioned under either name is picked up.
- **PR #199 / `3c13d47` "fix(deploy): correct Pages project name — tiny-studio, not the tiny-studio-3f5 subdomain (proven against live project list 2026-08-19)"** — the `PAGES_PROJECT` constant and the wrangler `--project-name` flag were wrong; the real project is `tiny-studio`. Without this, the wrangler direct-upload was targeting a project that did not exist.
- **PR #208 / `b64f242` "fix(release): CF_API_BASE typo /api/v4 -> /client/v4 — the lane 403'd on every call since creation"** — the Cloudflare API base was `/api/v4`; the correct one is `/client/v4`, so `captureProductionIdentity` 403'd on every run and the lane refused to deploy (it failed closed, exactly as the contract requires, so this never produced a misleading green status).

These three were all in the lane itself, not in the public site. Once the lane could actually capture a real `canonical_deployment`, the previously-stuck daily schedule and the next main push would publish the filtered bundle, and the live site's 404 page would appear. That is exactly what happened between 2026-08-19 and 2026-08-20: a deploy ran, the live bundle now matches the source proof, and the item is closed on the live proof.

### 6. Evidence summary — what resolves the item

| Check | Result | Source of truth |
| --- | --- | --- |
| Static unit test | 21/21 ok | `node scripts/test-public-soft-404.mjs` |
| Live soft-404 check | 18/18 ok | `node scripts/check-public-live-soft-404.mjs` |
| Deploy-lane live check, soft-404 section (C) | 2/2 ok | `node scripts/check-public-live-deploy.mjs` |
| Live `curl` unknown URL | HTTP 404, real not-found body | this checkout, 2026-08-20 |
| Live `curl` /404.html | HTTP 200 (via 308→/404), real not-found body | this checkout, 2026-08-20 |
| Deploy-bundle gate (proof of soft-404) | ok | `node scripts/prepare-public-deploy-bundle.mjs --source public --output …` |
| Source fix on main | ancestor | `git merge-base --is-ancestor 4499dd4 origin/main` |
| Release-lane deploy proof on main | ancestor | `git merge-base --is-ancestor d54c91f origin/main` |
| Deploy pipeline functional | three fixes landed (PRs #198 / #199 / #208) | `origin/main` log |

The 1 failure in `check-public-live-deploy.mjs` is an unrelated script-internal ReferenceError in section I (the `/llms.txt lists every public page (PR #68 live)` check) that is not part of the soft-404 proof. The dedicated soft-404 live checker is green, the static test is green, and the live `curl` confirms the unknown-URL behavior is correct. The item is closed on the live proof.

## Why no source branch change is needed in this lane

The soft-404 defect was fixed at the source on 2026-06-20 (PR #34 added `public/404.html` with the real not-found page). The reason it persisted on the live site for the next two months was a broken deploy lane (wrong project name, wrong secret name, wrong API base), not a missing fix. The 2026-08-19..2026-08-20 deploy-pipeline repairs (PRs #198 / #199 / #208) let the lane upload the bundle; the live site now serves the real 404 page for unknown URLs, and the dedicated live check is green. The static guard, the deploy-bundle gate, the live check, and the deploy-lane live acceptance all agree. No further code change is required to close this item; closing the item on the `[unreviewed-by-opus]` queue is a verification update, not a code task.

## Files

This lane changed one file (this report):
- `.lane/reports/docs-lane1-soft-404-reverify-20260820.md`

The fix and its guards already live on main via:
- `public/404.html` + `scripts/test-public-soft-404.mjs` (PR #34, commit `4499dd4`)
- Release-lane top-level real-404 deploy proof (PR #104, commit `d54c91f`)
- Soft-404 dedicated live checker `scripts/check-public-live-soft-404.mjs` (added with the live-check rollout)
- Deploy-pipeline repairs that unblocked the live delivery: PR #198 (`aaeab8b`), PR #199 (`3c13d47`), PR #208 (`b64f242`)
- Prior reports: PR #149 (deploy-gap root cause), PR #189 (2026-08-17 still-blocked reverify)
