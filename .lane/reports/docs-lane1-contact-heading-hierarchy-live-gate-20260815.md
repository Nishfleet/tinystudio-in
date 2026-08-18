# Lane 1 report: heading hierarchy cleanup on /contact (dogfood 52753880dfc7)

Lane: tinystudio-in lane 1 (worktree tinystudio-in-lane1-20260815-033532)
Date: 2026-08-15
Outcome: **No source change possible or needed — the /contact heading hierarchy was already repaired in main (PR #18, commit `71a20a4`); live delivery is blocked by a missing `CLOUDFLARE_API_TOKEN` secret (NEEDS-NISH), which is outside this lane's scope.**

## The one item

> [dogfood 52753880dfc7] Heading hierarchy needs cleanup on /contact [dogfood 20260809T013017Z-msl4lamt]

## Verification performed

### 1. Source state — the fix is already merged and test-pinned

- Commit `71a20a4` "fix(public): repair heading hierarchy on audited pages (#18)" is an ancestor of `origin/main`; it changed `public/contact/index.html` along with the other audited pages.
- Verified: worktree HEAD == origin/main == `e22785f`; `git merge-base --is-ancestor 71a20a4 origin/main` = yes.
- Current `public/contact/index.html` heading outline (grep of the source, in document order):

  ```
  H1 "A direct line to Tiny Studio."
  H2 "The Website Correction" (card)
  H2 "Apply by email, with a visible measurement marker."
  H2 "Primary inbox"
  H2 "Policy and requests"
  H2 "App-specific public pages"
  H2 "Focused apps. Clear public pages. Thoughtful support."
  H3 "Apps" / H3 "Support" / H3 "Legal" (footer columns)
  ```

  Clean hierarchy: one H1 first, H2 band, H3 footer columns, no jump greater than one.
- The repair is test-pinned: `scripts/test-public-heading-hierarchy.mjs` asserts the three `.info-card` card headings are H2s and that no outline jumps more than one level. Running it locally: **93 checks, 0 failures** (exit 0).
- A live guard also exists: `scripts/test-public-live-contact-heading-hierarchy.mjs` (`npm run site:check-live-contact-heading-hierarchy`, wired into the nightly live-site-check workflow) fails loudly if the deployed page regresses to the old skipped-level outline.

### 2. Live state — still stale, but not because of this item

- Live `https://tinystudio.in/contact/` (fetched 2026-08-15) still renders:

  ```
  H1 -> H3 H3 H3 -> H2 -> H3 H3 H3
  ```

  — exactly the skipped-level (H1 -> H3) outline the finding describes.
- The live guard confirms: `test-public-live-contact-heading-hierarchy.mjs` → 11 checks, 8 failures, with the message "the deployed public/contact/index.html is stale: it misses the heading-hierarchy repair that the worktree copy of public/contact/index.html already has."
- This is not a source defect: production is byte-identical to the 2026-06-20 build (`07acd07`). Every merged public fix since 2026-08-07 (17+ PRs, incl. #18) has never reached production.

### 3. Deploy blocker (the real gate, NEEDS-NISH)

- `.github/workflows/deploy-public-site.yml` is fail-closed on `CLOUDFLARE_API_TOKEN` + `CLOUDFLARE_ACCOUNT_ID` (step "Required Pages secrets not provisioned - fail loudly", line 66).
- `gh secret list -R nish3451/tinystudio-in` → only `CLOUDFLARE_ACCOUNT_ID` exists (set 2026-08-12); `CLOUDFLARE_API_TOKEN` is missing.
- Latest deploy runs on main pushes (incl. run 31842883261 on push `e22785f`, 2026-08-14 21:32Z) all failed; every main-merge deploy since 2026-06-20 fails identically at the secret gate.
- Provisioning requires a Cloudflare dashboard token — a Nish action, owned by the canonical deploy-pipeline gap. No code change can unblock it.

## Why no product PR was opened

The packet's fallback: "or by reporting plainly why the item cannot be done." The item's source work is already merged (PR #18) and test-pinned in `npm test`/`npm run ci`; the only remaining gate is the missing Cloudflare secret, a NEEDS-NISH action outside this lane. Re-implementing a merged, test-pinned fix would duplicate shipped work and touch no owned files. This report is the lane's deliverable, matching the convention of prior already-fixed reports (#164, #165, #166).

## What unblocks live delivery

1. Nish provisions a Cloudflare Pages:Edit token: `gh secret set CLOUDFLARE_API_TOKEN -R nish3451/tinystudio-in`
2. The deploy lane runs on the next main push (or workflow_dispatch); the repaired /contact heading hierarchy then goes live with the other ~17 merged public fixes.
3. The backlog item can then be ticked on live proof (`npm run site:check-live-contact-heading-hierarchy` turns green).

## Files touched

- `/home/nish/workspaces/agent-state/lanes/tinystudio-in/lane-1.json` — claims list (empty; no repo product files claimed)
- `.lane/reports/docs-lane1-contact-heading-hierarchy-live-gate-20260815.md` — this report
- No repository product files changed.
