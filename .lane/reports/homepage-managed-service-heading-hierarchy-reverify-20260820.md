# Lane 1 report: homepage managed-service heading hierarchy (H2->H4 skip) — re-verify

Lane: tinystudio-in lane 1 (worktree tinystudio-in-lane1-20260820-222036)
Date: 2026-08-20
Outcome: **No source change possible or needed — re-verified on 2026-08-20. The homepage managed-service heading hierarchy is already repaired in main (PR #143, commit `497d690`); the live site is still stale because every deploy since 2026-06-20 fails at the missing `CLOUDFLARE_API_TOKEN` / `CLOUDFLARE` secret (NEEDS-NISH).**

## The one item

> [unreviewed-by-opus] Homepage managed-service section skips H2->H4 and is missing from the public heading-hierarchy

## Why a re-verify

This item was first dispatched to lane 1 and fixed in source (PR #143, commit `497d690`). It was re-verified once already on 2026-08-15 (PR #177, commit `b8cb27e1`). It is being dispatched again on 2026-08-20, so this run re-checks the live state and the merged source instead of trusting either prior report.

## Verification performed (fresh, 2026-08-20)

### 1. Source state — the fix is still merged and pinned

- Branched fresh from `origin/main` (`6c3d83f`); `git merge-base --is-ancestor 497d690 HEAD` = yes.
- The fix commit `497d690` "fix(public): repair homepage managed-service heading hierarchy (H2->H3) (#143)" still rewrites `public/index.html` so the `#managed-service` section's feature heading is `h3` (not `h4`), giving the section outline `H2 -> H3` matching the sibling `#teams` block.
- `public/styles.css` still pairs the change: `.team-feature :is(h3, h4)` keeps the card scale, and `.team-feature h3 { font-size: clamp(1.55rem, 1.8vw, 2rem) }` keeps the former h4 scale.
- The homepage is covered by `scripts/test-public-heading-hierarchy.mjs` section D, which asserts the homepage outline has no jump greater than one and that the managed-service section opens `H2` then `H3`.
- Fresh source outline check (this run, head of `public/index.html`):

  ```
  homepage outline: 1 2 3 4 4 3 4 2 3 3 3 2 3 2 3 3 3 3 — no jump > 1
  managed-service section: H2 -> H3
  ```

- Test pin still green: `node scripts/test-public-heading-hierarchy.mjs` -> **148 checks, 0 failures** (exit 0). (Count grew from 93 -> 148 since the 2026-08-15 re-verify because the playwright layout probe now runs in this checkout; the relevant section D assertions are unchanged.)

### 2. Live state — still stale, same reason

- Fresh fetch of `https://tinystudio.in/` (2026-08-20, status 200) still serves the old skipped-level outline: the page has no `id="managed-service"` section at all, and the heading sequence is byte-identical to the 2026-06-20 build:

  ```
  live homepage outline (16 headings, no managed-service section):
  H1 -> H2 -> H3 -> H4 H4 -> H3 -> H4 -> H2 -> H3 H3 H3 -> H2 -> H3 -> H2 -> H3 H3 H3 H3
  ```

  The live page contains zero matches for `managed-service`, `website-correction`, or `Website Correction` — the entire buyer-path block has never been deployed. The two pages the live heading-hierarchy guard already checks (Drishti support, Privacy Choices) keep their repaired outlines because Cloudflare still serves the matching earlier builds.

- `scripts/test-public-live-heading-hierarchy.mjs` still passes against the two pages it explicitly probes (Drishti support, Privacy Choices), so the live staleness is scoped to the homepage and the rest of the deploy queue — not a regression in the merged source.

### 3. Deploy blocker — unchanged, still NEEDS-NISH

- `.github/workflows/deploy-public-site.yml` line 69 accepts either secret name (`CLOUDFLARE_API_TOKEN` documented, or `CLOUDFLARE` provisioned 2026-08-20). Line 76 still fails closed at "Required Pages secrets not provisioned - fail loudly" when both are empty.
- The owner secret `CLOUDFLARE_ACCOUNT_ID` was set 2026-08-12 (`f670a698e17bf160c8e4679823e68916`); the lane needs the Pages:Edit token to land via `gh secret set CLOUDFLARE_API_TOKEN -R nish3451/tinystudio-in` (or the alternate `CLOUDFLARE` name) for the deploy to clear the gate.
- Until then, every main-merge deploy fails identically at the same gate, and the live homepage cannot pick up any of the merged public fixes, including PR #143.

## Why no product PR was opened

The packet's fallback: "or by reporting plainly why the item cannot be done." The item's source work is already merged (PR #143) and test-pinned (148 checks, 0 failures). The only remaining gate is the missing Cloudflare token, a NEEDS-NISH action outside this lane's scope. Re-implementing a merged, test-pinned fix would duplicate shipped work and touch no owned files. This report PR is the lane's deliverable, matching the established convention for the 2026-08-15 reverify of the same item (PR #177) and the other lane-1 reverify reports.

## What unblocks live delivery

1. Nish provisions a Cloudflare Pages:Edit token: `gh secret set CLOUDFLARE_API_TOKEN -R nish3451/tinystudio-in` (or `gh secret set CLOUDFLARE -R nish3451/tinystudio-in -b <token>` to use the alternate name accepted on 2026-08-20).
2. The next main push (or `workflow_dispatch`) deploys; the repaired homepage heading hierarchy goes live with the other merged public fixes.
3. The backlog item can be ticked on live proof (live `https://tinystudio.in/` shows `H2 -> H3` in the managed-service section and a `Website Correction` CTAs block).

## Files touched

- `/home/nish/workspaces/agent-state/lanes/tinystudio-in/lane-1.json` — claims list only (this report file); no other field touched, written atomically via temp file + rename.
- `.lane/reports/homepage-managed-service-heading-hierarchy-reverify-20260820.md` — this report (lane-unique path; mirrors the 2026-08-15 report with today's date and the new test-count line).
- No repository product files changed.
