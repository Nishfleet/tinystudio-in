# Lane 1 report: heading hierarchy cleanup on /contact (dogfood 52753880dfc7) — re-verify 2026-08-20

Lane: tinystudio-in lane 1 (worktree tinystudio-in-lane1-20260821-045032)
Date: 2026-08-20
Outcome: **The item is fully closed. The /contact heading-hierarchy repair (PR #18, commit `71a20a4`) is intact in source and test-pinned, and the live deployment now carries it: the missing `CLOUDFLARE_API_TOKEN` secret was provisioned 2026-08-20, deploys are green, and the live guard passes 11/11 checks. No source change is needed; this report PR is the lane's deliverable.**

## The one item

> [dogfood 52753880dfc7] Heading hierarchy needs cleanup on /contact [dogfood 20260809T013017Z-msl4lamt]

## Why a fresh re-verify

This item was dispatched to lane 1 three times before (reports 2026-08-15: PRs #169, #170, #171). Each found the source already repaired (PR #18) but the live site stale, blocked by a missing `CLOUDFLARE_API_TOKEN` secret (NEEDS-NISH). The deploy blocker has since been resolved, so this run re-checks both source and live state instead of trusting the prior reports.

## 1. Source state — the fix is still merged and pinned

- `git fetch origin main`; `git merge-base --is-ancestor 71a20a4 origin/main` = yes. Commit `71a20a4` "fix(public): repair heading hierarchy on audited pages (#18)" changed `public/contact/index.html`: the three `.info-card` card headings went `h3` -> `h2`.
- Current `public/contact/index.html` outline: `H1` ("A direct line to Tiny Studio.") -> `H2` band (cards "Primary inbox" / "Policy and requests" / "App-specific public pages", plus "The Website Correction", "Apply by email…", footer H2 "Focused apps…") -> `H3` footer columns ("Apps" / "Support" / "Legal"). No jump greater than one, no skipped levels.
- Test pin green from this lane's fresh checkout: `node scripts/test-public-heading-hierarchy.mjs` -> **148 checks, 0 failures** (exit 0).

## 2. Live state — the repair is now deployed

- `gh secret list -R nish3451/tinystudio-in` now shows `CLOUDFLARE_API_TOKEN` (set 2026-08-20 15:09Z) alongside `CLOUDFLARE_ACCOUNT_ID` and `CLOUDFLARE` — the deploy blocker from the 2026-08-15 reports is gone.
- Recent `deploy-public-site.yml` runs on main are **successful**: run 32389387626 (2026-08-20 15:59Z), 32394934577 (16:57Z), 32419947981 (21:32Z).
- Live guard green from this lane's checkout: `node scripts/test-public-live-contact-heading-hierarchy.mjs` -> **11 checks, 0 failures** (exit 0):

```
A. live /contact/ carries the repaired heading hierarchy
  ok live Contact page contains at least one heading
  ok live Contact page has exactly one H1
  ok live Contact page has the H1 as the first heading in the outline
  ok live Contact page has the three card headings as H2s inside .info-card articles
  ok live Contact page keeps the flat H2 band (card H2s plus the footer H2) before the footer H3s
  ok live Contact page has no heading-level jump greater than one (no H1 -> H3 skip)
B. live stylesheet keeps the shared card-heading rule at the former card scale
  ok live styles.css defines .info-card :is(h2, h3) {
  ok live card rule keeps margin-top: 12px
  ok live card rule keeps font-size: clamp(1.65rem, 2vw, 2.35rem)
  ok live card rule keeps max-width: none
  ok live styles.css replaced the old .info-card h3-only rule with the shared :is(h2, h3) rule
```

The live page and stylesheet no longer carry the skipped-level outline the finding describes; the "refresh the live deployment from origin/main" staleness alarm is silent.

## Why no product change was made

The item's source work is already merged (PR #18) and test-pinned in `npm test`/`npm run ci`; the live deployment now proves it. Re-implementing a merged, test-pinned fix would duplicate shipped work and touch no owned files. This report PR is the lane's deliverable, matching the established convention (prior reports #169, #170, #171).

## Files touched

- `/home/nish/workspaces/agent-state/lanes/tinystudio-in/lane-1.json` — claims list only (this report file), written atomically via temp file + rename; no other field touched.
- `.lane/reports/lane1-contact-heading-hierarchy-reverify-20260820.md` — this report (lane-unique path).
- No repository product files changed.
