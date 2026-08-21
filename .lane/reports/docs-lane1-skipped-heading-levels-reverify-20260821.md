# Lane 1 report: reverify repair of skipped heading levels on Drishti support and Privacy Choices pages

Lane: tinystudio-in lane 1 (worktree `tinystudio-in-lane1-20260821-040034`)
Date: 2026-08-21
Branch: `docs/lane1-skipped-heading-levels-reverify-20260821` (off fresh `origin/main` `ccfbd4b`)
Outcome: **Already fixed — the heading-hierarchy repair is merged on main (PR #23, commit `9165305`) and is now ALSO verified on the live site (17/17 live-guard checks pass). The deploy blocker documented in the 2026-08-15 report is gone: `CLOUDFLARE_API_TOKEN` was provisioned on 2026-08-20 and recent `Deploy public site` runs succeed. No source change is needed; this item is closed.**

## The one item

> [fresh dogfood finding 2026-08-08 22:00] Repair skipped heading levels on Drishti support and Privacy Choices pages

## Verification performed (2026-08-21 from this checkout, branched off fresh `origin/main` = `ccfbd4b`)

### 1. Source state — fix merged and test-pinned on main

- Fix commit `9165305` "fix: preserve card styling in heading hierarchy repair (#23)" is an ancestor of fresh `origin/main`: `git merge-base --is-ancestor 9165305 origin/main` → true.
- Live guard commit `793f162` "fix(public): guard the live site against skipped heading levels on the Drishti support and Privacy Choices pages" is also an ancestor of `origin/main`.
- Worktree HEAD == `origin/main` == `ccfbd4b`; `git diff origin/main -- public/drishti/support/index.html public/privacy-choices/index.html` → empty (both target files identical to main).
- Heading outlines in source, confirmed by direct inspection:
  - `public/drishti/support/index.html`: `H1 -> H2 H2 H2 (cards) -> H2 (footer) -> H3 H3 H3 (footer columns)` — no jump greater than one.
  - `public/privacy-choices/index.html`: `H1 -> H2 H2 H2 (cards) -> H2 (app strip) -> H2 (footer) -> H3 H3 H3 (footer columns)` — no jump greater than one.

### 2. Static test suite — green

- `node scripts/test-public-heading-hierarchy.mjs`: the local suite asserts, for every public page including both targets: exactly one H1, H1 first in outline, three card headings as H2s inside `.info-card` articles, flat H2 band before footer H3s, and no heading-level jump greater than one. Result: **148 checks, 0 failures** (exit 0).

### 3. Live state — NOW REPAIRED (this is the change since the 2026-08-15 report)

- `node scripts/test-public-live-heading-hierarchy.mjs` (fetches `https://tinystudio.in/drishti/support/` and `https://tinystudio.in/privacy-choices/` plus `styles.css`): **17 checks, 0 failures** (exit 0).
- Live Drishti support page: exactly one H1, H1 first, three card H2s, flat H2 band, no jumps.
- Live Privacy Choices page: exactly one H1, H1 first, three card H2s, flat H2 band, no jumps.
- Live `styles.css` carries the shared `.info-card :is(h2, h3) {` rule with `margin-top: 12px`, `font-size: clamp(1.65rem, 2vw, 2.35rem)`, `max-width: none`, and the old `.info-card h3`-only rule is gone.
- The 2026-08-15 report found the live site still serving the stale 2026-06-20 bundle; that staleness is resolved.

### 4. Deploy blocker — GONE (this is why live is now fixed)

- `gh secret list -R nish3451/tinystudio-in` → `CLOUDFLARE_API_TOKEN` is now set (updated 2026-08-20T15:09:37Z), alongside `CLOUDFLARE_ACCOUNT_ID` and `CLOUDFLARE`.
- Recent `Deploy public site` runs on main pushes are green: `32419947981` (push `ccfbd4b`, 2026-08-20 21:32Z, success, 2m14s), `32394934577` (success), `32389387626` (success). The two failures immediately before (`32388518665`, `32387255226`) are the historical Node-22/wrangler and `CF_API_BASE` fixes that landed on 2026-08-20.
- The nightly live-site-check guard now holds the repair live: any future deployment that regresses the outline fails `test-public-live-heading-hierarchy.mjs` loudly.

## Why no product source change was made

The item's defect — skipped heading levels on Drishti support and Privacy Choices — is already repaired in source (PR #23, `9165305`), test-pinned in `npm test`/`npm run ci`, guarded against live regression (`793f162`), and now confirmed fixed on the deployed site. Re-implementing a merged, guarded, live-verified fix would duplicate shipped work and touch no owned files.

## Files

This lane's unique report (committed, one-file diff):

- `.lane/reports/docs-lane1-skipped-heading-levels-reverify-20260821.md` — this report.

No repository source files were changed.

The fix and its guards live on `origin/main`:

- `public/drishti/support/index.html` and `public/privacy-choices/index.html` (PR #23, commit `9165305`).
- `scripts/test-public-heading-hierarchy.mjs` (static outline guard).
- `scripts/test-public-live-heading-hierarchy.mjs` (live outline guard, commit `793f162`).
