# Merge gate status — 2026-08-12

Snapshot taken 2026-08-12 11:47 UTC (17:17 IST) from the `fix/merge-gate-drain` lane.

## The gate is throttled, not frozen

Branch protection on `main` requires one check: `repo-checks` (Codex CI, strict). The
check runs on a single self-hosted runner (`netcup-rs2000-tsin-verify1`, labels
`self-hosted, linux, x64, vps-verify`). There is no hosted-runner pool and no second
self-hosted runner.

At snapshot time:

| Surface | Value |
| --- | --- |
| Open PRs | 50 |
| — `CLEAN` (mergeable now) | 14 |
| — `BLOCKED` (CI queued/running) | 27 |
| — `DIRTY` (behind `main`) | 9 |
| Queued Codex CI runs | 27 |
| In-progress Codex CI runs | 1 |
| Runner status | online, busy |
| Last merge | #122, 2026-08-12 10:59 UTC |

Measured CI duration on the runner: ~2.5 minutes per `repo-checks` job (example run
31589844066: started 11:08:04Z, completed 11:10:42Z). A 27-run queue therefore takes
roughly an hour of runner time to drain, and every merge pushes `main`, which starts a
fresh `repo-checks` run plus the `deploy-public-site` lane on the same runner — so the
queue is self-refreshing while PRs land.

## What is actually merging the queue

`auto-ship` (agent-state fleet machinery, not this repo) owns the merge step. It is
actively working tinystudio-in as of 17:13 UTC: red-tier PRs wait on two-flagship
review panels (`WAITING ... two-flagship panel launched`), amber PRs wait on a
fresh agreed flagship verdict (`SKIPPED ... amber awaits flagship review`), and
authority-bound changes are `HELD` for Nish. The fleet intentionally does not merge
code PRs on machine gates alone; the review ladder is the designed gate.

## Why it reads as "frozen ~25h"

- Nothing merged between 2026-08-10 00:38 IST (#35) and 2026-08-11 08:38 IST (#65):
  the runner CI fix landed 2026-08-11, then merges resumed (#65, #68, #71, #74, #81,
  #84, #111, #122).
- The single runner serializes ~2.5-minute CI jobs behind each other; bursts of
  re-pushed PRs (e.g. 29 queued in the 11:33–11:34 UTC window) show up as a long
  BLOCKED wall.
- The flagship review ladder adds minutes-to-hours per PR on top of CI.

## Not a code defect

The repo gate itself is green: the runner's own `repo-checks` runs pass on fresh
clones. Local `npm run ci` on this worktree fails only at
`scripts/check-retention-automation.mjs` because the machine-local automation
(`/home/nish/.codex/automations/tinystudio-retention-checkups/automation.toml`)
points at `/home/nish/workspaces/products/tinystudio-in-autonomous-service`, which
does not exist on this box; that path is machine state, not repo content, and is
already owned by open retention-automation backlog items / PR #105.

## What would unblock it faster

1. A second self-hosted runner (or hosted-runner eligibility) — halves+ the queue
   drain; the runner is the hard throughput constraint.
2. Letting auto-ship finish its ladder; the queue is draining, just slowly.
3. The 9 DIRTY PRs need a `main` refresh before they can merge; they are not stuck,
   just behind.
