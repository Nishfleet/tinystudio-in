# Lane 1 report: social preview imagery missing on 7 of 12 public pages

Lane: tinystudio-in lane 1 (worktree tinystudio-in-lane1-20260814-181032)
Branch: `fix/lane1-live-social-preview-guard-20260814`
PR: https://github.com/nish3451/tinystudio-in/pull/153
Date: 2026-08-14
Outcome: **source fix already merged (PR #26); live delivery blocked by missing `CLOUDFLARE_API_TOKEN` (NEEDS-NISH). Landed the missing live-site guard so the stale deployment fails loudly instead of silently re-opening the item.**

## The one item

> Social preview imagery missing on 7 of 12 public pages - class gap after the closed /promptly

## Verification performed

### 1. Source state (branch from origin/main HEAD 2796b33)

All 12 pages in `public/` carry the full social preview block; `scripts/test-public-social-preview.mjs` passes (exit 0). The fix commit `ffe6e1f` "add social preview imagery to the 7 pages missing it" is already in main (merged via PR #26).

### 2. Live state — exactly the 7 pages from the item are still stale

Fetched all 12 live routes from https://tinystudio.in:

| Page | live og:image |
|---|---|
| / | tiny-studio-social.png |
| /contact/ | tiny-studio-social.png |
| /promptly/ | promptly-social.png |
| /promptly/support/ | **MISSING** |
| /promptly/privacy/ | **MISSING** |
| /drishti/ | drishti-social.png |
| /drishti/support/ | **MISSING** |
| /drishti/privacy/ | **MISSING** |
| /support/ | tiny-studio-social.png |
| /privacy/ | **MISSING** |
| /privacy-choices/ | **MISSING** |
| /terms/ | **MISSING** |

All three social image files are served (HTTP 200). The stale pages also carry `twitter:card=summary` instead of `summary_large_image`.

### 3. Root cause: deploy pipeline blocked (NEEDS-NISH)

Identical to the closed meta-descriptions item (report `fix-lane1-meta-descriptions-live-gate.md`, PR #150):
- Live production is the stale 2026-06-20 bundle; every merged public fix since 2026-08-07 has not reached production.
- `.github/workflows/deploy-public-site.yml` is fail-closed on `CLOUDFLARE_API_TOKEN` + `CLOUDFLARE_ACCOUNT_ID`; the secret `CLOUDFLARE_API_TOKEN` is not provisioned. No code change can unblock the byte-level delivery.

## What landed (PR #153)

The detection gap: nothing guarded the DEPLOYED site against missing social preview imagery (the static guard `test-public-social-preview.mjs` passes on repo state alone). Added:

- `scripts/check-public-live-social-preview.mjs` — fetches all 12 public pages from the live site, requires the complete `og:image` block (secure_url, type, 1200x630, alt), `summary_large_image` twitter card, matching `twitter:image`, and that every referenced image is served. Network-tolerant, `SKIP_LIVE_CHECKS=1` escape hatch, deliberately NOT in `npm run ci` (follows the #84 live-guard pattern).
- `package.json` — `site:check-live-social-preview` script.
- `.github/workflows/live-site-check.yml` — new `live-social-preview` nightly job; header comment updated from "June-20 bundle" to the accurate current stale state.

## Verification

- Guard against the live site: exit 1 with exactly the 7 stale pages (21 failures), images served (200) — proves the alarm is live and accurate.
- `node --check` passes; all 10 public-site tests pass (conversion-signal, structured-data, brand-disambiguation, heading-hierarchy, link-targets, social-preview, soft-404, deploy-bundle, deploy-workflow, pages-release).
- `npm test`'s retention failure (`check-retention-automation.mjs`) is pre-existing and unrelated: reproduces on a clean origin/main checkout (exit 1). It inspects the canonical main worktree's private state and freshness, not this lane's files.
- `git diff --check` clean.

## What unblocks live delivery

1. Nish provisions a Cloudflare Pages:Edit token: `gh secret set CLOUDFLARE_API_TOKEN -R nish3451/tinystudio-in` (account id `f670a698e17bf160c8e4679823e68916`).
2. The deploy lane runs on the next main push (or workflow_dispatch); the 7 pages then serve imagery with the other merged public fixes.
3. This item can be ticked on live proof — the new nightly guard goes green automatically.

## Files touched

- `scripts/check-public-live-social-preview.mjs` (new)
- `package.json`
- `.github/workflows/live-site-check.yml`
- `.lane/reports/fix-lane1-live-social-preview-guard-20260814.md` (this report)
- Lane record `/home/nish/workspaces/agent-state/lanes/tinystudio-in/lane-1.json` — claims list only.
