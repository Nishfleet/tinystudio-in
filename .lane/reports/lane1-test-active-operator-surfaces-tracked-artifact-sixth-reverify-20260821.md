# Lane 1 — item c33e2af2b6 sixth-incarnation reverify: test-active-operator-surfaces.mjs "Tracked generated artifact" failure

## Item

> scripts/test-active-operator-surfaces.mjs fails on this box with "Tracked generated artifact …

## Verdict

**Already resolved on current origin/main. Retirement receipt refreshed (status:
resolved). No PR opened** — a docs-only evidence PR for an already-resolved item
is churn per packet contract.

## Context of this run

Sixth dispatch of packet tinystudio-in-lane1-1787289934363. Five prior
incarnations (retired 06:29Z, reverified ~11:50Z, re-reverified ~12:15Z, fourth
~12:45Z, fifth ~13:05Z) all reached the same verdict; this incarnation
re-confirmed from scratch rather than trusted.

## Independent verification (2026-08-21 ~13:35Z)

- `git fetch`: **origin/main unchanged at b38ec13** (PR #228 merge tip);
  `git merge-base --is-ancestor origin/main HEAD` passes — local branch
  contains origin/main, code state identical to what all prior incarnations
  validated.
- `node scripts/test-active-operator-surfaces.mjs` → **"Active operator
  surface checks passed."**, exit 0; checkout clean after the run
  (`git status --porcelain` shows no tracked-path changes — the test restores
  canonical baselines; no tracked-artifact drift introduced).
- Error string maps to the stale-artifact byte-compare at
  `scripts/test-active-operator-surfaces.mjs:126`
  (`Tracked generated artifact is stale: ${path}`). Root cause of the original
  failure window was the 2026-08-14 operator-surface fix wave; the window is
  closed on main.
- Fix provenance re-confirmed: commit `c82c88c` "test(ops): lock live-metrics
  writes to SERVICE_REPO_ROOT when cwd differs" (PR #162, 2026-08-14) touched
  `scripts/test-active-operator-surfaces.mjs` and is an ancestor of
  origin/main (`git merge-base --is-ancestor c82c88c origin/main` = yes).

## Actions taken

- Claims published to lane-1.json (only the `claims` field, atomic temp+rename)
  before editing: `.fleet/improvement-loop.json` and this report.
- Retirement receipt refreshed in `.fleet/improvement-loop.json`
  (status: resolved, receipt PR #162 / commit c82c88c, bound to this report).
  Note: the packet's `fleet-resolve-item` binary does not exist on this box;
  the receipt was written directly to the worktree's
  `.fleet/improvement-loop.json`, the same control-plane file all five prior
  incarnations used.
- No repo source files modified; no commit, no push, no PR.

## Controller loop note (for the dispatch owner)

The item has now been dispatched six times against a controller-visible
`resolved` receipt since 06:29Z. The retirement record lives in the worktree
file `.fleet/improvement-loop.json`, which is untracked and local to lane 1's
worktree — the dispatch queue evidently does not consume it. If the item
re-enters rotation a seventh time, the fix belongs in the controller's item
source (mark c33e2af2b6 terminal there), not in another lane round.
