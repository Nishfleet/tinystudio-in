# Lane 1 reverify: mobile footer tap targets below WCAG 2.2 24px minimum

Lane: tinystudio-in lane 1 (worktree `tinystudio-in-lane1-20260817-161532`)
Date: 2026-08-17 (reverify against fresh `origin/main` `10cd244d`)
Branch: `fix/lane1-footer-tap-targets-reverify-20260817`
Outcome: **No source branch/code change possible or needed — the item's
source fix is already merged on `origin/main` (PR #22, commit `5298652`)
and test-pinned in `npm test`/`npm run ci` (77 checks, 0 failures);
live delivery is still blocked by the missing `CLOUDFLARE_API_TOKEN`
repository secret (NEEDS-NISH), which is outside this lane's scope.**

## The one item

> [unreviewed-by-opus] Mobile tap targets fall below the WCAG 2.2 24px
> minimum on every tinystudio.in page - footer

## Verification performed (against fresh origin/main @ 10cd244d)

### 1. Source state — the fix is still merged in main

- `git fetch origin main` (2026-08-17) — HEAD now `10cd244d3a3a0f6e579ad12c186969bf6f36c329`.
- `git merge-base --is-ancestor 5298652 origin/main` → exit 0. PR #22
  ("fix(public): bring footer links up to WCAG 2.2 24px tap targets")
  is an ancestor of the current `origin/main` — the fix is still in source.
- `public/styles.css` carries the full tap-target treatment on
  `.footer-links a`: `display: inline-block; min-height: 24px;
  padding: 4px 0` (rendered ~34px hit area, above WCAG 2.2 SC 2.5.8).
- No subsequent commit on `origin/main` has touched the `.footer-links a`
  rule (`git log origin/main --oneline -- public/styles.css`'s newest
  entry is `2796b33 fix(public): keep product hero early-access CTA in
  the first mobile viewport (#147)`, which is unrelated).

### 2. Source test still passes

- `node scripts/test-public-link-targets.mjs` (default test runner
  used by `npm test` and `npm run ci`) reports **77 checks, 0 failures**.
- The assertions that pin this item are:
  - every public HTML page's footer links sit inside `.footer-links`
    (all 13 pages, 8/8 links each),
  - the shared stylesheet enforces the 24px minimum and the
    `min-height: 24px` declaration survives minification.

### 3. Live state — still stale, but not because of this item

- `curl -s "https://tinystudio.in/styles.css?nocache=$(date +%s)"` (live
  production, fetched 2026-08-17 11:07Z) still serves the OLD rule on
  `.footer-links a`: only `color`, `text-decoration`, `overflow-wrap`.
  No `display: inline-block`, no `min-height: 24px`, no `padding`.
- `grep -c "min-height: 24px"` on the live sheet returns 0.
- At mobile widths the pointer hit area is the ~17px plain-inline glyph
  box, below WCAG 2.2 SC 2.5.8 (24×24 minimum). The defect is still
  live, exactly as the 2026-08-14 reverify recorded.
- This is the canonical "stale live build" symptom: every merged public
  fix since 2026-08-07 (PR #22, #25, #26, #27, #29, #34, #35, #120,
  #122, #129, #134, #141, #143, #147, and many more) has never reached
  production because the deploy lane is fail-closed.

### 4. Deploy blocker — still the missing CLOUDFLARE_API_TOKEN (NEEDS-NISH)

- `.github/workflows/deploy-public-site.yml` is fail-closed on
  `CLOUDFLARE_API_TOKEN` + `CLOUDFLARE_ACCOUNT_ID`. The "Required Pages
  secrets not provisioned - fail loudly" step is the first gate; it
  `exit 1`s the run before any build, upload, or test step runs.
- The workflow comment is explicit: "the fleet Workers token
  (fleet-console/cf.env) does NOT have Pages:Edit; provisioning a
  Pages-scoped token is a one-time dashboard step" (a Nish action).
- This matches the open deploy-pipeline item (NEEDS-NISH) — provisioning
  a Cloudflare dashboard token (Pages:Edit on account
  `f670a698e17bf160c8e4679823e68916`) and running `gh secret set
  CLOUDFLARE_API_TOKEN -R nish3451/tinystudio-in`. No code change can
  unblock it.

## Why this is a "reverify" — what changed since the 2026-08-14 report

- Previous report ran at `origin/main` HEAD `2796b33` (now `10cd244d`).
- The intervening commits are all `docs(lane1): reverify ...` history
  entries for unrelated items (social-preview-imagery class gap,
  meta-descriptions, llms.txt coverage, outbound sender trust, soft-404,
  growth/ops exporters, product-hero early-access CTA, merged gates).
- None of those touched `public/styles.css`'s `.footer-links a` rule,
  the test runner, or the deploy workflow. The fix, the test, and the
  blocker remain identical to the 2026-08-14 reverify; the live
  observation repeats.

## Why no product PR was opened

The packet's fallback: "or by reporting plainly why the item cannot be
done." The item's source work is already merged (PR #22, commit
`5298652`) and test-pinned in `npm test`/`npm run ci`; the only
remaining gate is the missing Cloudflare Pages:Edit secret, which is
explicitly a NEEDS-NISH action owned by the canonical deploy-pipeline
item. Re-implementing a merged, test-pinned feature would duplicate
shipped work and touch no owned files.

## What unblocks live delivery (unchanged from 2026-08-14)

1. Nish provisions a Cloudflare Pages:Edit token (account id
   `f670a698e17bf160c8e4679823e68916`) and runs:
   `gh secret set CLOUDFLARE_API_TOKEN -R nish3451/tinystudio-in`
   (and confirms `CLOUDFLARE_ACCOUNT_ID` is already set).
2. The deploy lane runs on the next main push (or workflow_dispatch);
   the footer tap-target rule then goes live with the other ~17 merged
   public fixes.
3. The backlog item can then be ticked on live proof (re-run the live
   `styles.css` check above and confirm `min-height: 24px` is present
   on `.footer-links a`).

## Files touched (this reverify)

- `/home/nish/workspaces/agent-state/lanes/tinystudio-in/lane-1.json` —
  `claims` list set to the normalized relative path of this report
  (no other field modified).
- `.lane/reports/fix-lane1-footer-tap-targets-reverify-20260817.md` —
  this report (the lane's own evidence file; not a shared report).
- `/home/nish/workspaces/agent-worktrees/REPORT-.packet-tinystudio-in-lane1-1786963532344.md`
  — fleet-dispatch CLI report (incremental, written first to keep the
  "land early, land often" budget).
- No repository product files changed.
