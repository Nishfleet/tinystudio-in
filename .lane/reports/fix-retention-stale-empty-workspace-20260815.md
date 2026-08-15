# Lane 1 report — Friday retention automation still passes on a stale, empty workspace after the closed twin

Branch: `fix/retention-stale-empty-workspace-20260815`
Item: `[unreviewed-by-opus] Friday retention automation still passes on a stale, empty workspace after the closed twin`
Date: 2026-08-15

## Live-state investigation

Re-verified the item's factual claims against the live machine (2026-08-15):

1. The stale twin `/home/nish/workspaces/products/tinystudio-in-autonomous-service` is **closed** — it no longer exists and no longer appears in `git worktree list`.
2. The live automation `/home/nish/.codex/automations/tinystudio-retention-checkups/automation.toml` now points at the primary checkout `/home/nish/workspaces/products/tinystudio-in` (the git-dir owner), not the twin.
3. The primary checkout is on branch `fix/lane1-jsonld-live-guard` at `377c27e`, which is **behind** `origin/main` (`00bae12`) and predates the git-dir-ownership fix (`eaeca51`). The live gate therefore currently reports `status: fail` (exit 1) with `remote freshness proof unavailable: checkout is behind or diverged from remote main` — the stale-empty false green is **not** currently observable from the live automation path.
4. The code fix for canonical-workspace resolution (git-dir ownership, commit `eaeca51`) exists only on open PR #142 (`fix/retention-gate-stale-twin-20260814`), which is **not merged** into `origin/main`.
5. Residual gap confirmed in the current `origin/main` code (journal line 687 of the improvement loop: "default empty-root PASS = the residual gap"): the branch `clientCount === 0 && failures.length === 0` → `status: pass` in `scripts/check-retention-automation.mjs` lets an aligned-but-empty canonical workspace green-pass while the automation file is missing. That is the last hollow-pass path: the Friday loop is supposed to be required before the first client is active, and an empty workspace without the guard must not read as safe.

## Changes

| File | Change |
| --- | --- |
| `scripts/lib/retention-preflight.mjs` | Cherry-picked `eaeca51` (from open PR #142): `canonicalMainWorktree()` now resolves the canonical workspace by git-dir ownership (`git rev-parse --git-common-dir` + per-entry `--git-dir`), never by porcelain list position and never by which worktree holds `refs/heads/main`. |
| `scripts/check-retention-automation.mjs` | Removed the `clientCount === 0 && failures.length === 0` → pass branch. A missing automation file now always fails, even on an aligned empty workspace. |
| `scripts/test-retention-automation.mjs` | Updated the no-client block: missing automation + empty roots now asserts `fail` with "Automation file is missing"; added a regression that the same empty state with the automation in place passes (legitimate armed-for-first-client state). |
| `README.md` | Updated the Friday retention-prep paragraph: the loop is required before the first client, and the canonical workspace is resolved by git-dir ownership. |
| `.lane/reports/fix-retention-stale-empty-workspace-20260815.md` | This report. |

## Evidence

```
$ node scripts/test-retention-automation.mjs
Retention automation applicability checks passed.
EXIT=0

$ node scripts/check-human-service-kit.mjs
{ "status": "passed", "preservedGates": [..., "retention", ...] }
EXIT=0
```

Fresh-main isolated-empty-clone reproduction (before the fix, from `origin/main`):

```
repo: /tmp/tsin-fresh-verify/tsin-main
status: fail   # fails on missing roots + automation pointer — the main-line preflight is sound
failures: ["canonical state root missing: clients", "canonical state root missing: prospects", "Automation does not point at the TinyStudio repo"]
```

Live gate (canonical workspace, still on the pre-fix branch):

```
status: fail, clientCount: 3
failures: ["remote freshness proof unavailable: checkout is behind or diverged from remote main", "aggregate parity: service-decisions count 0 ...", "aggregate parity: runs/service-engine count 0 ..."]
EXIT=1
```

## Why this closes the item

- The stale twin is closed (operator fact, verified live).
- The automation now points at the canonical git-dir-owner workspace (operator fact, verified live).
- The canonical-workspace resolution is hardened by git-dir ownership (this branch carries `eaeca51`, which open PR #142 would otherwise duplicate).
- The last hollow-pass branch (aligned-empty workspace + missing automation → pass) is removed: the check now fails closed on a missing automation guard regardless of client count.
- The live gate still fails loudly while the canonical workspace runs a branch behind `origin/main`; landing this branch's code on main plus moving the canonical workspace onto a main-based branch is the operator follow-up that makes the Friday loop execute current gate code.

## Operator follow-ups (outside this repo change)

1. Merge this PR (it supersedes/duplicates PR #142's `retention-preflight.mjs` change; if #142 merges first, this branch's cherry-pick becomes a no-op conflict-free).
2. Move `/home/nish/workspaces/products/tinystudio-in` onto a main-based branch so the Friday automation executes current gate code.
