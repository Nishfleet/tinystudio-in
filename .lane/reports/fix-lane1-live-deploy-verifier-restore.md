# Lane 1 report: fix/lane1-live-deploy-verifier-restore

## Item

- [unreviewed-by-opus] Google AI answers confuse Tiny Studio / tinystudio.in with unrelated "tiny studio" brands

## Verdict

**The disambiguation fix is already merged (PR #29) and LIVE: the homepage carries the "independent product company at tinystudio.in... not affiliated" copy and Organization JSON-LD, and llms.txt carries the same statement. The remaining defect is the release-lane acceptance verifier (`scripts/check-public-live-deploy.mjs`), which crashed mid-run with `PUBLIC_PAGE_URLS is not defined` (section I) and `TRUST_PAGES is not defined` (section J), so the post-deploy proof — including the #29 brand-disambiguation proof — could never complete green. This lane restores the verifier so the item has a working live acceptance gate.**

## Evidence

### 1. The fix itself is live (verified 2026-08-20)

- `https://tinystudio.in/` (fetched 2026-08-20) serves:
  - Organization JSON-LD with `"alternateName": "tinystudio.in"` and description "Tiny Studio is the independent product company at tinystudio.in behind Promptly, Drishti, and 0509. It is not affiliated with other apps or studios that use the name Tiny Studio."
  - visible body copy: "Tiny Studio is an independent product company at tinystudio.in. It is not affiliated with any other app or studio that uses the name Tiny Studio."
- `https://tinystudio.in/llms.txt` (fetched 2026-08-20) leads with the same identity statement ("not affiliated" present, all 12 public URLs listed).

### 2. The defect: broken release-lane verifier on main

- Current `scripts/check-public-live-deploy.mjs` on origin/main (commit `9587672`):
  - Section I references `PUBLIC_PAGE_URLS` with no import — the import was dropped in merge resolution after commit `a083ea6` added it.
  - Section J references `TRUST_PAGES`, `headingLevelsOf`, `infoCardTitleCount` that do not exist in the file — the definitions from commit `c20d9e0` were dropped in a later merge.
  - Result before fix: `FAIL live request error: PUBLIC_PAGE_URLS is not defined` at section I; sections J and the final count never ran (214 checks, 1 failure, exit 1).
- No open or merged PR fixes this; the branch is the first.

### 3. Fix

Restore the missing definitions from the healthy versions:

- `import { PUBLIC_PAGE_URLS } from "./lib/public-pages.mjs"` (from `a083ea6`)
- `headingLevelsOf`, `infoCardTitleCount`, `TRUST_PAGES` (from `c20d9e0`)

## Files changed

- `scripts/check-public-live-deploy.mjs` — restore the lost import and helper definitions so the release-lane acceptance proof can run to completion.

## Verification

- `node --check scripts/check-public-live-deploy.mjs` — OK.
- `node scripts/check-public-live-deploy.mjs` (against live tinystudio.in) — **230 checks, 0 failures**, including:
  - section D: brand-disambiguation JSON-LD + non-affiliation copy live (PR #29)
  - section I: llms.txt lists all 12 public pages (PR #68)
  - section J: trust pages render H1 -> H2x3 card outline (PR #74)
- `node scripts/test-pages-release.mjs` — 38 checks, 0 failures.
- `node scripts/test-public-promptly-support-heading-hierarchy.mjs` — 28 checks, 0 failures.
- `git diff --check` — OK.
- PR duplicate guard: no open PR touches `scripts/check-public-live-deploy.mjs`.

## Outcome

Branch pushed and PR opened: `fix/lane1-live-deploy-verifier-restore`.
