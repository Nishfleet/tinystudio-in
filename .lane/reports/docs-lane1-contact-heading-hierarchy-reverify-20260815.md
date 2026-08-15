# Lane 1 report: heading hierarchy cleanup on /contact (dogfood 52753880dfc7) — re-verify

Lane: tinystudio-in lane 1 (worktree tinystudio-in-lane1-20260815-084539)
Date: 2026-08-15
Outcome: **No source change possible or needed — re-verified on 2026-08-15. The /contact heading hierarchy is already repaired in main (PR #18, commit `71a20a4`); the live site is still stale because every deploy since 2026-06-20 fails at the missing `CLOUDFLARE_API_TOKEN` secret (NEEDS-NISH).**

## The one item

> [dogfood 52753880dfc7] Heading hierarchy needs cleanup on /contact [dogfood 20260809T013017Z-msl4lamt]

## Why a re-verify

This item was dispatched to lane 1 before (PRs #169, #170); both reported "already fixed in source, live blocked on missing Cloudflare token". It is being dispatched again, so this run re-checks the live state instead of trusting the prior report.

## Verification performed (fresh, 2026-08-15)

### 1. Source state — the fix is still merged and pinned

- `git fetch origin main`; `git merge-base --is-ancestor 71a20a4 origin/main` = yes. Commit `71a20a4` "fix(public): repair heading hierarchy on audited pages (#18)" changed `public/contact/index.html`: the three `.info-card` card headings went `h3` -> `h2`.
- Current `public/contact/index.html` outline: `H1` ("A direct line to Tiny Studio.") -> `H2` band (cards "Primary inbox" / "Policy and requests" / "App-specific public pages", plus "The Website Correction", "Apply by email…", "Focused apps…") -> `H3` footer columns ("Apps" / "Support" / "Legal"). No jump greater than one, no skipped levels.
- Test pin still green: `node scripts/test-public-heading-hierarchy.mjs` → **93 checks, 0 failures** (exit 0).

### 2. Live state — still stale, for the same reason

- Fresh fetch of `https://tinystudio.in/contact/` still serves the old skipped-level outline:

  ```
  H1 -> H3 H3 H3 (cards) -> H2 (footer) -> H3 H3 H3 (footer columns)
  ```

  — exactly the finding's defect, unchanged since the 2026-06-20 build.
- Fresh run of the live guard `npm run site:check-live-contact-heading-hierarchy` → **11 checks, 8 failures**: live page has H1 -> H3 jump, no H2 card headings, live styles.css still lacks `.info-card :is(h2, h3)` and still has the old `.info-card h3` rule. Message: "the deployed public/contact/index.html is stale… Refresh the live deployment from origin/main."

### 3. Deploy blocker — unchanged, still NEEDS-NISH

- `gh secret list -R nish3451/tinystudio-in` → only `CLOUDFLARE_ACCOUNT_ID` (set 2026-08-12). `CLOUDFLARE_API_TOKEN` is still missing.
- `.github/workflows/deploy-public-site.yml` fails closed at "Required Pages secrets not provisioned - fail loudly" (line 66) when either secret is empty.
- Latest deploy runs all fail at that gate: run 31858851254 (push, 2026-08-15 02:18Z), 31857299550 (workflow_dispatch), 31852938813 (push) — every main-merge deploy since 2026-06-20 fails identically.

## Why no product PR was opened

The packet's fallback: "or by reporting plainly why the item cannot be done." The item's source work is already merged (PR #18) and test-pinned; the only remaining gate is the missing Cloudflare secret, a NEEDS-NISH action outside this lane's scope. Re-implementing a merged, test-pinned fix would duplicate shipped work and touch no owned files. This report PR is the lane's deliverable, matching the established convention (prior reports #169, #170).

## What unblocks live delivery

1. Nish provisions a Cloudflare Pages:Edit token: `gh secret set CLOUDFLARE_API_TOKEN -R nish3451/tinystudio-in`
2. The next main push (or workflow_dispatch) deploys; the repaired /contact heading hierarchy goes live with the other merged public fixes.
3. The backlog item can be ticked on live proof: `npm run site:check-live-contact-heading-hierarchy` turns green.

## Files touched

- `/home/nish/workspaces/agent-state/lanes/tinystudio-in/lane-1.json` — claims list only (this report file); no other field touched, written atomically via temp file + rename.
- `.lane/reports/docs-lane1-contact-heading-hierarchy-reverify-20260815.md` — this report (lane-unique path).
- No repository product files changed.
