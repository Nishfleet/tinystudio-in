# Lane 1 report: reverify live /privacy/, /terms/, and /drishti/privacy/ heading outlines (H1->H2x3)

Lane: tinystudio-in lane 1 (worktree `tinystudio-in-lane1-20260821-084035`)
Date: 2026-08-21
Branch: `fix/lane1-trust-pages-heading-hierarchy-reverify-20260821` (off fresh `origin/main` `ccfbd4b`)
Outcome: **Already fixed — the trust-page H1->H2x3 repair is merged on main (PR #74) and is now verified on the live site: all three item pages serve the fixed H1 -> H2 H2 H2 (cards) -> H2 (footer) -> H3 H3 H3 outline with no skipped heading level, and the deploy lane's own post-deploy acceptance (run `32419947981`, 240 checks / 0 failures, 2026-08-20) checks these exact pages. The homepage managed-service section is intentionally NOT live — the deploy bundle filters it out because the buyer-path restoration is separately decided snoozed by Nish (item `643f147275`, "you pushed it to later"). No source change is needed; this reverify report closes the item's live-outline claim.**

## The one item

> [unreviewed-by-opus] Live /privacy/, /terms/, and /drishti/privacy/ still expose H1->H3x3 document outlines while origin/main has the merged PR #74 H1->H2x3 outline - the live site has not deployed any of today's 17 origin/main merges

Full item (from the scout record `d1a99d197e`, 2026-08-11): the live trust pages still served the old H1->H3x3 outlines while `origin/main` carried the PR #74 H1->H2x3 fix; the same deploy gap also kept the homepage managed-service section, JSON-LD, soft-404s, and llms.txt off live.

## Verification performed (2026-08-21 from this checkout, branched off fresh `origin/main` = `ccfbd4b`)

### 1. Source state — fix merged on main

- The three pages' source on `origin/main` carries the H1 -> H2x3 (cards) -> H2 (footer) -> H3x3 (footer columns) outline; `git show origin/main:public/{privacy,terms,drishti/privacy}/index.html` confirms the card headings are H2s inside `.info-card` articles with no heading-level jump greater than one.
- Worktree HEAD == fresh `origin/main` == `ccfbd4b`; `git diff origin/main -- public/privacy public/terms public/drishti/privacy` → empty.

### 2. Live state — REPAIRED (this is the change since the 2026-08-11 scout)

Direct fetches of the live pages (2026-08-21):

- `https://tinystudio.in/privacy/`: `H1 -> H2 H2 H2 (cards) -> H2 (footer) -> H3 H3 H3` — no jump >1.
- `https://tinystudio.in/terms/`: `H1 -> H2 H2 H2 (cards) -> H2 (footer) -> H3 H3 H3` — no jump >1.
- `https://tinystudio.in/drishti/privacy/`: `H1 -> H2 H2 H2 (cards) -> H2 (footer) -> H3 H3 H3` — no jump >1.

`node scripts/test-public-live-heading-hierarchy.mjs` (live guard): **17 checks, 0 failures** (exit 0) — the two pages it asserts (Drishti support, Privacy Choices) plus the live stylesheet.

### 3. Deploy lane is now green and proves the three pages live

- `gh secret list -R nish3451/tinystudio-in` → `CLOUDFLARE_API_TOKEN` is set (updated 2026-08-20T15:09:37Z) alongside `CLOUDFLARE_ACCOUNT_ID` and `CLOUDFLARE`.
- Recent `Deploy public site` runs on main pushes are green: `32419947981` (push `ccfbd4b`, 2026-08-20 21:32Z, success), `32394934577` (success), `32389387626` (success). The two failures immediately before (`32388518665`, `32387255226`) are the historical Node-22/wrangler and `CF_API_BASE` fixes that landed 2026-08-20.
- The successful run's own post-deploy acceptance (`check-public-live-deploy.mjs`) includes section J "trust pages render the fixed H1 -> H2x3 card outline (PR #74)" with `ok` on exactly one H1, H1 first, three card H2s inside `.info-card`, no jump — for `/privacy/`, `/terms/`, `/drishti/privacy/` (plus `/promptly/privacy/` and `/privacy-choices/`). Result: **240 checks, 0 failures**.

### 4. The one residual — homepage managed-service section — is a separate, deliberately snoozed item

- The deploy bundle intentionally removes the managed-service section from the homepage: the lane's own acceptance asserts "homepage has no `id="managed-service"`" (section D, portfolio-only homepage, snooze honored).
- That removal is by design: the scout records item `643f147275` "Restore the managed-service buyer path on the live Tiny Studio domain" with `"decided": "you pushed it to later"` and the deploy-path item `63a61bb1b7` explicitly says "do NOT deploy the managed-service buyer-path content (#10/#11) - that remains snoozed-by-nish until he says yes."
- Re-deploying the managed-service section from this lane would violate that decision, so the item's residual is out of scope here by design.

## Why no product source change was made

The item's defect — trust pages skipping the H2 level — is already repaired in source (PR #74, merged), pinned by the heading-hierarchy regressions, and now confirmed fixed on the deployed site by both the live guard and the deploy lane's own acceptance. Re-implementing a merged, guarded, live-verified fix would duplicate shipped work and touch no owned files. The homepage managed-service residual is owned by the snoozed buyer-path decision, not by this item.

## Files

This lane's unique report (committed, one-file diff):

- `.lane/reports/fix-lane1-trust-pages-heading-hierarchy-reverify-20260821.md` — this report.

No repository source files were changed. The fix and its guards live on `origin/main`:

- `public/privacy/index.html`, `public/terms/index.html`, `public/drishti/privacy/index.html` (PR #74).
- `scripts/check-public-live-deploy.mjs` (deploy-lane live acceptance, section J covers these three pages).
- `scripts/test-public-live-heading-hierarchy.mjs` (nightly live guard).
