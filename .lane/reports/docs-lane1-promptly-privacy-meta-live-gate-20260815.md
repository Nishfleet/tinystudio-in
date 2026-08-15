# Lane 1 report: Promptly privacy meta description tightening — source merged, live blocked on missing Cloudflare token

Lane: tinystudio-in lane 1 (worktree tinystudio-in-lane1-20260815-045032)
Date: 2026-08-15 (verified against fresh origin/main `a294496`)
Outcome: **No source change possible or needed — the /promptly/privacy meta description tightening is already merged in main (PR #120, commit `6674aec`); live delivery is blocked by a missing `CLOUDFLARE_API_TOKEN` secret (NEEDS-NISH), which is outside this lane's scope.**

## The one item

> [dogfood 63256313bbbb] Meta description needs tightening on /promptly/privacy [dogfood 20260809T013017Z-msl4lamt]

## Verification performed

### 1. Source state — the fix is already merged and test-pinned

- `git merge-base --is-ancestor 6674aec origin/main` = yes (fresh fetch, HEAD `a294496`).
- Commit `6674aec` "fix(public): tighten the Promptly privacy page meta description (#120)" is the exact fix for dogfood finding `63256313bbbb`, merged 2026-08-12 19:41 IST. It shortens the description from 144 to 121 chars, dropping the redundant "App-specific" lead-in and "what it handles" filler while keeping every key term, synced across `meta name=description`, `og:description`, `twitter:description`, and JSON-LD description. (Earlier `9a73040` / PR #27 replaced the label-only 56-char description with substantive copy; `6674aec` is the tightening this item tracks.)
- Worktree `public/promptly/privacy/index.html` (at origin/main HEAD) carries the tightened description:

  > Privacy policy for Promptly, Tiny Studio's booking and no-show prevention app: data handled, retention, and your choices. (121 chars)

- The repo gate covers the pattern: `scripts/test-public-structured-data.mjs` asserts every public page declares a non-empty meta description and that JSON-LD `description` matches the meta description; `npm test` / `npm run ci` wire it in. 127 checks, 0 failures on this worktree.

### 2. Live state — still stale, but not because of this item

- Live `https://tinystudio.in/promptly/privacy/` (fetched 2026-08-15) still serves the OLD thin description (56 chars):

  > App-specific privacy policy for Promptly by Tiny Studio.

- This matches the canonical deploy-pipeline gap: production is a stale build; every merged public fix since 2026-08-07 (17+ PRs, incl. #27) has never reached production.

### 3. Deploy blocker (the real gate, NEEDS-NISH)

- `.github/workflows/deploy-public-site.yml` is fail-closed: missing `CLOUDFLARE_API_TOKEN` or `CLOUDFLARE_ACCOUNT_ID` fails the run loudly (step "Required Pages secrets not provisioned - fail loudly").
- `gh secret list -R nish3451/tinystudio-in` (checked 2026-08-15) shows only `CLOUDFLARE_ACCOUNT_ID` (set 2026-08-12); `CLOUDFLARE_API_TOKEN` is still missing.
- Latest deploy runs fail at that step (e.g. run 31847608717 on push `e193e29`).
- Provisioning requires a Cloudflare dashboard token — a Nish action owned by the canonical deploy-pipeline item. No code change can unblock it.

## Why no source branch/PR was opened

The packet's fallback: "or by reporting plainly why the item cannot be done." The item's source work is already merged (PR #120) and test-pinned in `npm test`/`npm run ci`; the only remaining gate is the missing Cloudflare secret, a NEEDS-NISH action outside this lane. Re-implementing a merged, test-pinned fix would duplicate shipped work and touch no owned files.

## What unblocks live delivery

1. Nish provisions a Cloudflare Pages:Edit token: `gh secret set CLOUDFLARE_API_TOKEN -R nish3451/tinystudio-in`
2. The deploy lane runs on the next main push (or workflow_dispatch); the tightened description then goes live with the other ~17 merged public fixes.
3. The backlog item can then be ticked on live proof.

## Files touched

- `.lane/reports/docs-lane1-promptly-privacy-meta-live-gate-20260815.md` — this report (unique to this lane)
- No repository source files changed.
