# Lane 1 — item c33e2af2b6 fifth-incarnation reverify: test-active-operator-surfaces.mjs "Tracked generated artifact" failure

## Item

> scripts/test-active-operator-surfaces.mjs fails on this box with "Tracked generated artifact …

## Verdict

**Already resolved on current origin/main. Retirement re-confirmed and receipt
refreshed (status: resolved). No PR opened** — a docs-only evidence PR for an
already-resolved item is churn per packet contract.

## Context of this run

Fifth dispatch/resume of packet tinystudio-in-lane1-1787289934363 (worker
launched 2026-08-21 ~12:55Z). Four prior incarnations (retired 06:29Z,
reverified ~11:50Z, re-reverified ~12:15Z, fourth reverify ~12:45Z) all reached
the same verdict; this incarnation re-confirmed from scratch rather than
trusted.

## Independent verification (2026-08-21 ~13:05Z)

- `git fetch`: **origin/main unchanged at b38ec13**; `git merge-base
  --is-ancestor origin/main HEAD` passes — local branch contains origin/main,
  code state identical to what all prior incarnations validated.
- `node scripts/test-active-operator-surfaces.mjs` → **"Active operator
  surface checks passed."**, exit 0, twice; checkout clean after each run
  (`git status --porcelain` empty for tracked paths — the test restores
  canonical baselines; no tracked-artifact drift introduced).
- Error string maps to the stale-artifact byte-compare at
  `scripts/test-active-operator-surfaces.mjs:126`. Root cause of the original
  failure window remains the 2026-08-14 operator-surface fix wave
  (PR #159 c5e812b zero-pipeline guard, PR #160 57bd83b help/output
  confinement, PR #162 c82c88c SERVICE_REPO_ROOT lock + baseline restore) —
  a scan inside that window produced the item; on current main it is closed.
- Controller-visible state checked directly before this run:
  worktree `.fleet/improvement-loop.json` already carried item c33e2af2b6
  status **resolved** with the same receipt — the re-dispatch is a resume of
  the same in-flight packet, not a rotation re-pick of a resolved item.

## Outcome

- Claims published to lane-1.json before editing:
  `.fleet/improvement-loop.json`,
  `.lane/reports/lane1-test-active-operator-surfaces-tracked-artifact-fifth-reverify-20260821.md`.
- Retirement refreshed via `/home/nish/fleet2/bin/fleet-resolve-item resolve`
  → item c33e2af2b6 status **resolved**, receipt PR #162 / commit c82c88c,
  report bound to this file.
- No repo files modified; no commit, no push, no PR.

Final: still RESOLVED on current origin/main b38ec13. No PR opened; retirement stands.
