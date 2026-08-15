# Lane 1 report: homepage managed-service heading hierarchy (H2->H4 skip) — re-verify

Lane: tinystudio-in lane 1 (worktree tinystudio-in-lane1-20260815-095532)
Date: 2026-08-15
Outcome: **No source change possible or needed — re-verified on 2026-08-15. The homepage managed-service heading hierarchy is already repaired in main (PR #143, commit `497d690`); the live site is still stale because every deploy since 2026-06-20 fails at the missing `CLOUDFLARE_API_TOKEN` secret (NEEDS-NISH).**

## The one item

> [unreviewed-by-opus] Homepage managed-service section skips H2->H4 and is missing from the public heading-hierarchy

## Why a re-verify

This item was previously dispatched to lane 1 and fixed in source (PR #143). It is being dispatched again, so this run re-checks the live state and the merged source instead of trusting the prior report.

## Verification performed (fresh, 2026-08-15)

### 1. Source state — the fix is merged and pinned

- `git fetch origin main`; `git merge-base --is-ancestor 497d690 origin/main` = yes. Commit `497d690` "fix(public): repair homepage managed-service heading hierarchy (H2->H3) (#143)" changed `public/index.html`: the `#managed-service` section's feature heading went `h4` -> `h3`, giving the section outline `H2 -> H3` (matching the sibling `#teams` block).
- `public/styles.css` pairs the change: `.team-feature :is(h3, h4)` keeps the card scale, and `.team-feature h3 { font-size: clamp(1.55rem, 1.8vw, 2rem) }` keeps the former h4 scale.
- The homepage is covered by the public heading-hierarchy test: `scripts/test-public-heading-hierarchy.mjs` section D asserts the homepage outline has no jump greater than one and that the managed-service section opens `H2` then `H3`.
- Fresh source outline check (this run):

  ```
  homepage outline: 1 2 3 4 4 3 4 2 3 3 3 2 3 2 3 3 3 3 — no jump > 1
  managed-service section: H2 -> H3
  ```

- Test pin still green: `node scripts/test-public-heading-hierarchy.mjs` -> **93 checks, 0 failures** (exit 0).

### 2. Live state — still stale, for the same reason

- Fresh fetch of `https://tinystudio.in/` (2026-08-15) still serves the old skipped-level outline: the page has no `id="managed-service"` section at all, and the heading sequence is byte-identical to the 2026-06-20 build (`07acd07`):

  ```
  H1 -> H2 -> H3 -> H4 H4 -> H3 -> H4 -> H2 -> H3 H3 H3 -> H2 -> H3 -> H2 -> H3 H3 H3 H3
  ```

- The served homepage differs from the merged source only by Cloudflare's email-obfuscation rewrite (`/cdn-cgi/l/email-protection`), i.e. it is the old build, not a partial deploy.

### 3. Deploy blocker — unchanged, still NEEDS-NISH

- `gh secret list -R nish3451/tinystudio-in` -> only `CLOUDFLARE_ACCOUNT_ID` (set 2026-08-12). `CLOUDFLARE_API_TOKEN` is still missing.
- `.github/workflows/deploy-public-site.yml` fails closed at "Required Pages secrets not provisioned - fail loudly" (line 66) when either secret is empty.
- Fresh check of the latest deploy runs: run 31862578087 (push, 2026-08-15 03:43Z) failed at exactly that gate with `##[error]CLOUDFLARE_API_TOKEN and/or CLOUDFLARE_ACCOUNT_ID are not set in repo secrets. The lane fails closed instead of skipping the publish`. Every main-merge deploy since 2026-06-20 fails identically.

## Why no product PR was opened

The packet's fallback: "or by reporting plainly why the item cannot be done." The item's source work is already merged (PR #143) and test-pinned; the only remaining gate is the missing Cloudflare secret, a NEEDS-NISH action outside this lane's scope. Re-implementing a merged, test-pinned fix would duplicate shipped work and touch no owned files. This report PR is the lane's deliverable, matching the established convention for the other 2026-08-15 lane-1 reverify items.

## What unblocks live delivery

1. Nish provisions a Cloudflare Pages:Edit token: `gh secret set CLOUDFLARE_API_TOKEN -R nish3451/tinystudio-in`
2. The next main push (or workflow_dispatch) deploys; the repaired homepage heading hierarchy goes live with the other merged public fixes.
3. The backlog item can be ticked on live proof (live `https://tinystudio.in/` shows `H2 -> H3` in the managed-service section).

## Files touched

- `/home/nish/workspaces/agent-state/lanes/tinystudio-in/lane-1.json` — claims list only (this report file); no other field touched, written atomically via temp file + rename.
- `.lane/reports/homepage-managed-service-heading-hierarchy-reverify-20260815.md` — this report (lane-unique path).
- No repository product files changed.
