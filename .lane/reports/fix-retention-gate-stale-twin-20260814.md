# Lane 1 report — Friday retention automation still passes on a stale, empty workspace after the closed twin

Branch: `fix/retention-gate-stale-twin-20260814`
Item: `[unreviewed-by-opus] Friday retention automation still passes on a stale, empty workspace after the closed twin`
Date: 2026-08-14

## Root cause

The Friday gate resolves the canonical retention workspace via
`canonicalMainWorktree()` in `scripts/lib/retention-preflight.mjs`. The
pre-#105 code returned the worktree holding `refs/heads/main`; #105 changed it
to return the **first** `git worktree list` entry, which is only *conventionally*
the main worktree.

On this machine the live state is exactly the closed-twin shape:

- Main worktree: `/home/nish/workspaces/products/tinystudio-in` (owns `.git`),
  routinely checked out onto feature branches (reflog shows daily
  checkouts/resets), currently on `chore/pin-required-verifiers`.
- Twin: `/home/nish/workspaces/products/tinystudio-in-autonomous-service`
  holds `refs/heads/main` at `24e516a` (2026-08-06), has **0 clients**,
  **0 prospects with `service-day0.json`**, and no `service-decisions` /
  `runs/service-engine` roots. It is stale (remote main is `a8d4da2`,
  2026-08-14) and empty.
- The canonical workspace `/home/nish/workspaces/products/tinystudio-in` is
  running the **pre-#105 gate code** (its `canonicalMainWorktree` resolves to
  the worktree holding `main` = the twin, and it lacks the #105
  canonical-workspace staleness check).

Because the gate resolved the canonical workspace to the twin, it inspected the
twin's empty state roots, saw an aligned (if stale) HEAD, and passed — while the
real client records live in the main worktree.

## Fix

Rewrite `canonicalMainWorktree()` to resolve the canonical workspace by
**git-dir ownership**, not list position and not branch holder:

- The main worktree is the entry whose `git rev-parse --git-dir` equals the
  repository's common git dir (`.git` at the repo root).
- Every linked worktree resolves to `<common>/.git/worktrees/<name>`, so a
  stale empty twin can never be substituted.
- Falls back to `repoRoot` on any git failure, preserving prior behavior.

`git worktree list --porcelain` in git 2.54 emits **no `gitdir` lines** (the
porcelain format only guarantees `worktree`/`HEAD`/`branch`/`detached`), so the
implementation reads the `worktree` path from porcelain and runs
`git rev-parse --git-dir` per entry — this also handles relative git-dir paths
correctly via `join(worktree, gitdir)`.

## Files changed

| File | Change |
| --- | --- |
| `scripts/lib/retention-preflight.mjs` | Rewrote `canonicalMainWorktree()` to resolve by git-dir ownership. |
| `scripts/test-retention-automation.mjs` | Added regression assertion in the closed-twin block: the canonical workspace must be the git-dir owner even when the twin holds `main` and heads the porcelain list. |

## Evidence

### Before (old gate code, live repo, canonical workspace)

```
status: fail ... repo: /home/nish/workspaces/products/tinystudio-in-autonomous-service
clientCount: 0, roots all zero
failures: remote freshness proof unavailable ... Automation does not point at the TinyStudio repo
```

The old code resolved the canonical workspace to the **twin** (empty, stale) and
would pass on a stale aligned twin or a no-client twin.

### After (fixed gate, live repo)

```
status: fail
repo (canonical): /home/nish/workspaces/products/tinystudio-in
clientCount: 3
failures:
  - remote freshness proof unavailable: checkout is behind or diverged from remote main
  - aggregate parity: service-decisions count 0 is below active client count 3
  - aggregate parity: runs/service-engine count 0 is below active client count 3
exit=1
```

The gate now inspects the **main worktree** (3 real clients) and fails closed on
the stale canonical workspace, instead of hollow-passing on the empty twin.

### Tests

```
$ node scripts/test-retention-automation.mjs
Retention automation applicability checks passed.
EXIT=0

$ node --check scripts/lib/retention-preflight.mjs && node --check scripts/test-retention-automation.mjs
syntax ok
```

### Canonical resolution smoke test on the live repo

```
canonicalMainWorktree(/home/nish/workspaces/products/tinystudio-in) = /home/nish/workspaces/products/tinystudio-in
is main worktree (owns .git)? true
is stale empty twin? false
```

## Operational note (not in scope of this change)

The canonical workspace `/home/nish/workspaces/products/tinystudio-in` is
running pre-#105 gate code because it is on `chore/pin-required-verifiers`.
Merging this fix brings the corrected resolver to main; the canonical workspace
must be moved onto a main-based branch (or the automation updated) for the live
Friday gate to pick it up. The stale twin
`/home/nish/workspaces/products/tinystudio-in-autonomous-service` also still
holds `main` at an Aug-6 commit and is empty; closing/pruning that twin is the
other half of the "closed twin" remediation.

## PR

Branch `fix/retention-gate-stale-twin-20260814` pushed to origin, commit
`eaeca51`. PR opened against `main`.
