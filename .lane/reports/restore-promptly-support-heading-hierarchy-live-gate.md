# Lane 1 report: restore the Promptly support heading hierarchy in production

Lane: tinystudio-in lane 1 (worktree tinystudio-in-lane1-20260815-021536)
Date: 2026-08-15 (re-verified 2026-08-15 ~02:45Z on lane resume)
Outcome: **No source change possible or needed — the Promptly support heading-hierarchy fix is already merged in main (PR #20, commit `1536cc8`); live delivery is blocked by a missing `CLOUDFLARE_API_TOKEN` secret (NEEDS-NISH), which is outside this lane's scope.**

## The one item

> Restore the Promptly support heading hierarchy in production after the closed live-delivery item [scout 2026-08-08]

## What the closed live-delivery item was

- `scripts/check-public-live-deploy.mjs` pins the live acceptance for this exact surface: "A. /promptly/support/ renders the fixed heading hierarchy (PRs #18/#20)" — the H2-after-H1 check.
- The source fix landed in `1536cc8` "fix(public): restore Promptly support heading hierarchy (#20)", merged on main 2026-08-08.

## Verification performed

### 1. Source state — the fix is already merged and test-pinned

- `git merge-base --is-ancestor 1536cc8 origin/main` = yes (also `b4db763`).
- Worktree `public/promptly/support/index.html` (at origin/main HEAD `3491c67`) renders the correct outline:
  `h1` → `h2` → `h2` → `h2` → `h2` (footer) → `h3` ×3 — no heading-level jump greater than one.
- The repo gate covers the pattern: `scripts/test-public-heading-hierarchy.mjs` asserts exactly one H1, first-heading H1, and no H1→H3 skips across the public pages (and is wired into `npm test` / `npm run ci`).

### 2. Live state — still stale, but not because of this item

- Live `https://tinystudio.in/promptly/support/` (fetched 2026-08-15) still serves the OLD outline:
  `<h1>` then `<h3>` ×3 then `<h2>` (footer) — the exact H1→H3 jump the item describes.
- Re-verified 2026-08-15 02:45Z with the same result; origin/main has advanced to `e22785f` (a new docs report from sibling lane), source-side page still renders the fixed outline.
- This matches the canonical deploy-pipeline gap: production is a stale build; every merged public fix since 2026-08-07 (17+ PRs, incl. #20) has never reached production.

### 3. Deploy blocker (the real gate, NEEDS-NISH)

- `.github/workflows/deploy-public-site.yml` is fail-closed: missing `CLOUDFLARE_API_TOKEN` or `CLOUDFLARE_ACCOUNT_ID` fails the run loudly (step "Required Pages secrets not provisioned - fail loudly", lines 65-75).
- `gh secret list -R nish3451/tinystudio-in` (re-checked 2026-08-15) shows only `CLOUDFLARE_ACCOUNT_ID` (set 2026-08-12); `CLOUDFLARE_API_TOKEN` is still missing.
- Every deploy run since 2026-08-14T08:56Z fails at that step, including the most recent (2026-08-14 21:32Z push `e22785f` run 31842883261, queued at re-verify time). Provisioning requires a Cloudflare dashboard token — a Nish action owned by the canonical deploy-pipeline item. No code change can unblock it.

## Why no branch/PR was opened

The packet's fallback: "or by reporting plainly why the item cannot be done." The item's source work is already merged (PR #20) and test-pinned in `npm test`/`npm run ci`; the only remaining gate is the missing Cloudflare secret, a NEEDS-NISH action outside this lane. Re-implementing a merged, test-pinned fix would duplicate shipped work and touch no owned files.

## What unblocks live delivery

1. Nish provisions a Cloudflare Pages:Edit token: `gh secret set CLOUDFLARE_API_TOKEN -R nish3451/tinystudio-in`
2. The deploy lane runs on the next main push (or workflow_dispatch); the Promptly support heading hierarchy then goes live with the other ~17 merged public fixes.
3. The backlog item can then be ticked on live proof (the H2-after-H1 check in `scripts/check-public-live-deploy.mjs`).

## Files touched

- `/home/nish/workspaces/agent-state/lanes/tinystudio-in/lane-1.json` — claims list (empty; no repo files claimed)
- `.lane/reports/restore-promptly-support-heading-hierarchy-live-gate.md` — this report
- No repository product files changed.
