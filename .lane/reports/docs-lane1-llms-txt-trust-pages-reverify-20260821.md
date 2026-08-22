# Lane 1 report: reverify live llms.txt public-page coverage — RESOLVED, live site now lists all 12 URLs

Lane: tinystudio-in lane 1 (worktree `tinystudio-in-lane1-20260821-010537`)
Date: 2026-08-20 (run opened 2026-08-21 01:05 UTC)
Branch: `docs/lane1-llms-txt-trust-pages-reverify-20260821` (off fresh `origin/main` `6c3d83f`)
Outcome: **Resolved — no source change needed. The live `https://tinystudio.in/llms.txt` now lists all 12 public URLs, byte-identical to `origin/main` (`public/llms.txt` MD5 `c6d3893debf7943d4b5ecef079de1a50`). The five per-app support/privacy trust pages are live and return HTTP 200. The deploy-lane repairs (#208 CF_API_BASE typo, #209 Node 22, #211 acceptance section J) finally unblocked production delivery, so the 2026-06-20 stale bundle has been replaced and this item — previously blocked on the missing `CLOUDFLARE_API_TOKEN` — is closed.**

## The one item

> [unreviewed-by-opus] Live llms.txt lists only 7 of the 12 public URLs - the 5 per-app support/privacy trust pages

## Verification performed (2026-08-20/21 from this checkout, branched off fresh `origin/main` = `6c3d83f`)

### 1. Source state — fix and guards still on main

- Fix commit `b2a58e0e` ("fix(public): list all 12 public pages in llms.txt (#68)") is an ancestor of fresh `origin/main` (`git merge-base --is-ancestor` → true).
- Live-coverage guard `a083ea60` ("fix(public): guard live llms.txt coverage in both live-site checkers") is also an ancestor of `origin/main` (merged as PR #154).
- `origin/main` `public/llms.txt` lists all 12 public URLs (12 `https://tinystudio.in` bullet lines): `/`, `/support/`, `/contact/`, `/privacy/`, `/privacy-choices/`, `/terms/`, `/promptly/`, `/promptly/support/`, `/promptly/privacy/`, `/drishti/`, `/drishti/support/`, `/drishti/privacy/`.
- The five URLs the item originally called out as missing on live are all present in `origin/main` and, for the first time, on the live site:
  - `https://tinystudio.in/privacy-choices/`
  - `https://tinystudio.in/promptly/support/`
  - `https://tinystudio.in/promptly/privacy/`
  - `https://tinystudio.in/drishti/support/`
  - `https://tinystudio.in/drishti/privacy/`
- Build-time guard `assertLlmsTxtCoversPublicPages` (scripts/prepare-static-site-bundle.mjs) still enforces the 12-URL coverage invariant; the shared single source of truth is `scripts/lib/public-pages.mjs`.

### 2. Live state — RESOLVED (was stale; now matches origin/main byte-for-byte)

- `curl -s https://tinystudio.in/llms.txt` (2026-08-20) lists **12 public URL bullets** — all five trust pages present.
- Byte-identical to `origin/main:public/llms.txt`: live MD5 `c6d3893debf7943d4b5ecef079de1a50` == origin/main MD5 `c6d3893debf7943d4b5ecef079de1a50` (this differs from the 2026-08-17 reverify, where live `4ecf84a2…` diverged from origin/main `a6fa67f3…`).
- The five trust pages all return HTTP 200 live:
  - `/promptly/support/` → 200
  - `/promptly/privacy/` → 200
  - `/drishti/support/` → 200
  - `/drishti/privacy/` → 200
  - `/privacy-choices/` → 200
- Release-lane live checker `scripts/check-public-live-deploy.mjs` against production: **240 checks, 0 failures** (exit 0) — including section I ("/llms.txt lists every public page (PR #68 live)") and section J (trust pages render the fixed H1 → three H2 info-card outline). This is the first green run of the full acceptance since the deploy path was repaired; prior runs died at the CF_API_BASE typo or crashed on section J's ReferenceError.
- Deploy-bundle gate `scripts/test-public-deploy-bundle.mjs` on this checkout: **101 checks, 0 failures** (exit 0); `llms.txt` is on the required-files assertion and in the prepared bundle.

### 3. What changed since the 2026-08-17 reverify (why this is now resolved, not still blocked)

- The deploy lane was repaired on main: #208 (`b64f242`) fixed the `CF_API_BASE` typo (`/api/v4` → `/client/v4`) that had 403'd every deploy call; #209 (`7461f57`) pinned the deploy lane to Node 22 (wrangler 4.123 refuses Node 20); #211 (`161b27f`) fixed the dead acceptance section J (missing import, undefined list, undefined helpers).
- The live site now serves the current bundle (llms.txt byte-identical to origin/main), so the previously documented `CLOUDFLARE_API_TOKEN`-blocked delivery gate has been cleared and the 2026-06-20 stale deployment (`07acd07`) is no longer what production serves for this surface.
- The nightly `Live Site Check` guard (from `a083ea60`) and the build-time generator guard continue to hold the invariant: any future drift in llms.txt coverage fails loudly.

## Why no source branch change was made

The item's underlying defect — live `llms.txt` listing only 7 of the 12 public URLs — is fully resolved in production as of this reverify. The source fix (PR #68) and both guards have been on main since August; this run is the first that can also confirm the live fix, because the deploy path was only repaired in the interim (#208/#209/#211). Re-implementing a merged, guarded, now-live fix would be redundant; there is no remaining code change that this lane could make.

## Files

This lane's unique report (committed, one-file diff):

- `.lane/reports/docs-lane1-llms-txt-trust-pages-reverify-20260821.md` — this report.

No repository source files were changed.

## Packet completion marker

`packet tinystudio-in lane 1: complete`
