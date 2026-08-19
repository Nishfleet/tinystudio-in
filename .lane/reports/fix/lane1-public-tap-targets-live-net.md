# Lane report: fix/lane1-public-tap-targets-live-net

## Item

In-content links stay below the WCAG 2.2 24px tap-target minimum — merged PR #22 fixes only.

## Root cause (verified live, 2026-08-14)

The tap-target fix is correct **in source** and merged on main twice:

- PR #22 (`5298652`) — footer links ≥24px
- PR #25 (`b0f5f06`) — in-content links ≥24px
- `scripts/test-public-link-targets.mjs` (static guard) → **77 checks, 0 failures** on origin/main

The live site does not carry the fix. `https://tinystudio.in/styles.css` still serves the pre-fix June-20 bundle, which is missing all five tap-target rules — rendered in-content links are ~17px. This is the same stale-deployment gap documented in the soft-404 lane (no Cloudflare Pages token → release lane fails closed, nightly `Live Site Check` red by design).

A previous lane attempt (PR #107, `fix/lane1-in-content-link-targets-live-net-20260812`) landed the same change shape but is **CONFLICTING** against current main (which now has a third live-check job) and never merged. This lane re-lands it fresh, rebased on origin/main.

## What I changed

| File | Change |
|---|---|
| `scripts/check-public-live-tap-targets.mjs` | New live guard: fetches deployed `styles.css`, re-asserts the five link rules the local suite requires (block-level box, `min-height: 24px`, ≥4px vertical padding). Non-2xx or missing rule = loud FAIL; network failure only = skip; `SKIP_LIVE_CHECKS=1` honored. |
| `package.json` | `site:check-live` now runs soft-404 + tap-target checks. Not added to `npm test`/`npm ci` (blocking chains stay green on repo state alone, per PR #84). |
| `.github/workflows/live-site-check.yml` | New nightly + manual-dispatch `live-tap-targets` job. |

## Evidence

- `node --check scripts/check-public-live-tap-targets.mjs` → clean
- `node scripts/check-public-live-tap-targets.mjs` against the live site → **19 checks, 11 failures, exit 1** (reproduces the item: deployed sheet is stale, sub-24px targets)
- `node scripts/test-public-link-targets.mjs` → 77 checks, 0 failures (repo correct)
- `node scripts/test-public-soft-404.mjs` → 19 checks, 0 failures
- `node scripts/test-deploy-public-site-workflow.mjs` → 10 checks, 0 failures
- `node scripts/test-pages-release.mjs` → 38 checks, 0 failures
- `git diff --check` → clean

## Deliverable

PR: https://github.com/nish3451/tinystudio-in/pull/152 (open)

The red nightly run is the intended staleness alarm, not a reason to disable. Once the Cloudflare Pages token is provisioned (release-lane blocker, documented in `deploy-public-site.yml`), re-deploy from origin/main; this check must then report 0 failures and the item closes.
