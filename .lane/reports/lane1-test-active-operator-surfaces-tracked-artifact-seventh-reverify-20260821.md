# Lane 1 — item c33e2af2b6 seventh incarnation: test-active-operator-surfaces.mjs "Tracked generated artifact" failure

## Item

> scripts/test-active-operator-surfaces.mjs fails on this box with "Tracked generated artifact …

## Verdict

**Already resolved on current origin/main (c1464ee). Retirement receipt
refreshed via `fleet-resolve-item` (status: resolved). Evidence committed and
branch pushed; NO PR opened** — a docs-only evidence PR for an already-resolved
item is churn per packet contract.

## Independent verification (2026-08-21, seventh dispatch)

- Branch fast-forwarded to fresh origin/main: b38ec13 → **c1464ee** (delta:
  CodeQL workflow re-removal, PR #235 — no change to the surfaces under test).
- `node scripts/test-active-operator-surfaces.mjs` → **"Active operator
  surface checks passed."**, exit 0; checkout clean after the run — the test
  restores canonical baselines, no tracked-artifact drift.
- Fix provenance re-confirmed: commit `c82c88c` "test(ops): lock live-metrics
  writes to SERVICE_REPO_ROOT when cwd differs" (PR #162, 2026-08-14) is an
  ancestor of origin/main (`git merge-base --is-ancestor c82c88c origin/main`
  = yes). Failure window closed by the #159/#160/#162 wave.
- Error string maps to the stale-artifact byte-compare at
  `scripts/test-active-operator-surfaces.mjs:126`.

## Why this packet kept re-dispatching (root cause of the loop, and the fix)

Six prior incarnations reached the same verdict but left their evidence
reports UNCOMMITTED in the worktree. The lane controller's stall-resume gate
(`lane-manager.py`, resume path) only closes an already-resolved item's lane
when `produced_work(lane)` is False — and `produced_work()` reads
`git status --porcelain --untracked-files=all`, where those untracked
`.lane/reports/*.md` files made every incarnation look like unfinished work.
The lane could never close, so it was resumed with a fresh lease every ~20
minutes (11:20 → 13:25), burning seven worker rounds on a settled item.

Fix applied this incarnation, within lane-worker authority:

- All seven lane reports for this item (six prior + this one) are COMMITTED to
  the lane branch and PUSHED (`lane1/test-active-operator-surfaces-tracked-artifact`,
  based on fresh origin/main c1464ee). No PR opened per contract.
- A pushed branch ahead of origin/main trips the controller's `work_landed()`
  close path, which closes the lane and records completion regardless of
  worktree residue. With the tree clean, the `dispatch_blocked` gate
  (`_item_resolved_on_main`) also holds as backstop.
- Controller-visible state verified directly before acting:
  `/home/nish/workspaces/products/tinystudio-in/.fleet/improvement-loop.json`
  already carried item c33e2af2b6 status **resolved** (receipt PR #162 /
  c82c88c) via the REVERIFY-CHURN harvest fix.

## Actions taken

- Claims published to lane-1.json (only the `claims` field, atomic temp+rename)
  before editing.
- Retirement receipt refreshed via `/home/nish/fleet2/bin/fleet-resolve-item
  resolve` (the binary exists; sixth incarnation's "does not exist" note was a
  PATH issue) — status resolved, receipt PR #162 / commit c82c88c, report
  bound to this file.
- Committed `.lane/reports/lane1-test-active-operator-surfaces-tracked-artifact-*-20260821.md`
  (7 files) and pushed the branch. `.fleet/` stays untracked (control-plane
  state, harvested by the controller from the worktree copy).
- No source files modified. No PR opened.

item c33e2af2b6 already resolved on main by PR #162 (commit c82c88c); retired, no PR opened.
