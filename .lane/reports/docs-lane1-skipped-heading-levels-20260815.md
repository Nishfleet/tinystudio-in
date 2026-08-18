# Lane 1 report: repair skipped heading levels on Drishti support and Privacy Choices pages

Lane: tinystudio-in lane 1 (worktree tinystudio-in-lane1-20260815-015034)
Date: 2026-08-15
Outcome: **No source change possible or needed — the skipped heading levels are already repaired in main (PR #23); live delivery is blocked by a missing `CLOUDFLARE_API_TOKEN` secret (NEEDS-NISH), which is outside this lane's scope.**

## The one item

> [fresh dogfood finding 2026-08-08 22:00] Repair skipped heading levels on Drishti support and Privacy Choices pages

## Verification performed

### 1. Source state — the fix is already merged

- Commit `9165305` "fix: preserve card styling in heading hierarchy repair (#23)", merged 2026-08-09, changed exactly the two affected pages:
  - `public/drishti/support/index.html`: the three `.info-card` card headings went `h3` -> `h2` ("Ready for real support traffic." -> "A single, clear support route.", plus the other two cards).
  - `public/privacy-choices/index.html`: the same h3 -> h2 card-heading repair.
- Verified: `git merge-base --is-ancestor 9165305 origin/main` = yes; worktree HEAD == origin/main == `04a9997`.
- Current heading outline on both pages is clean and sequential:
  - Drishti support: `H1 -> H2 H2 H2 (cards) -> H2 (footer) -> H3 H3 H3 (footer columns)` — no jump greater than one.
  - Privacy Choices: `H1 -> H2 H2 H2 (cards) -> H2 (app strip) -> H2 (footer) -> H3 H3 H3 (footer columns)` — no jump greater than one.
- The repair is test-pinned: `scripts/test-public-heading-hierarchy.mjs` asserts the three card headings are H2s and that no outline jumps more than one level. Running it locally: **93 checks, 0 failures** (exit 0).

### 2. Live state — still stale, but not because of this item

- Live `https://tinystudio.in/drishti/support/` (fetched 2026-08-15) still renders `h1 -> h3 h3 h3` — the old skipped-level outline.
- Live `https://tinystudio.in/privacy-choices/` likewise still renders `h1 -> h3 h3 h3`.
- This is not a source defect: production is byte-identical to the 2026-06-20 build (`07acd07`). Every merged public fix since 2026-08-07 (17+ PRs, incl. #23) has never reached production.

### 3. Deploy blocker (the real gate, NEEDS-NISH)

- `.github/workflows/deploy-public-site.yml` is fail-closed on `CLOUDFLARE_API_TOKEN` + `CLOUDFLARE_ACCOUNT_ID`.
- `gh secret list -R nish3451/tinystudio-in` → only `CLOUDFLARE_ACCOUNT_ID` exists (set 2026-08-12); `CLOUDFLARE_API_TOKEN` is missing.
- Latest deploy runs (incl. run 31837007159 on push `04a9997`, 2026-08-14 20:14Z) all failed in the "Required Pages secrets not provisioned - fail loudly" step; every main-merge deploy since 2026-06-20 fails identically.
- Provisioning requires a Cloudflare dashboard token — a Nish action, owned by the canonical deploy-pipeline gap. No code change can unblock it.

## Why no product PR was opened

The packet's fallback: "or by reporting plainly why the item cannot be done." The item's source work is already merged (PR #23) and test-pinned in `npm test`/`npm run ci`; the only remaining gate is the missing Cloudflare secret, a NEEDS-NISH action outside this lane. Re-implementing a merged, test-pinned fix would duplicate shipped work and touch no owned files.

## What unblocks live delivery

1. Nish provisions a Cloudflare Pages:Edit token: `gh secret set CLOUDFLARE_API_TOKEN -R nish3451/tinystudio-in`
2. The deploy lane runs on the next main push (or workflow_dispatch); the repaired heading hierarchy then goes live with the other ~17 merged public fixes.
3. The backlog item can then be ticked on live proof.

## Files touched

- `/home/nish/workspaces/agent-state/lanes/tinystudio-in/lane-1.json` — claims list (empty; no repo files claimed)
- `.lane/reports/docs-lane1-skipped-heading-levels-20260815.md` — this report
- No repository product files changed.
