# Lane 1 — item c33e2af2b6 retired: test-active-operator-surfaces.mjs "Tracked generated artifact" failure

## Item

> scripts/test-active-operator-surfaces.mjs fails on this box with "Tracked generated artifact …

## Verdict

**Already resolved on current origin/main. Retired via fleet-resolve-item (status: resolved). No PR opened** — a docs-only evidence PR for an already-resolved item is churn per packet contract.

## Investigation (2026-08-21, worktree lane1, fresh origin/main @ ccfbd4b)

The error string maps to `scripts/test-active-operator-surfaces.mjs:126`
(`Tracked generated artifact is stale: ${path}`) — the byte-identical comparison
between tracked artifacts in the checkout and fresh generator output under the
fixed clock.

### Reproduction attempts — all green

1. Standalone: `node scripts/test-active-operator-surfaces.mjs` → **passed**
2. After its exact `npm test` chain predecessors (`test-service-engine.mjs`,
   `test-sales-intake-contract.mjs`, `test-active-offer-projection.mjs`) → **passed**, checkout clean after
3. Clean environment (`env -i HOME PATH node …`) → **passed**

4 green runs total; exit 0 every time.

### State of the tracked surfaces

All 9 `ACTIVE_OPERATOR_ARTIFACTS` carry a consistent `Generated: 2026-08-06`
stamp and are untouched since PR #9 — no drift between checkout and generators.

### Root cause of the original failure window

The 2026-08-14 operator-surface fix wave changed generator behavior and test
expectations in the same window:

- PR #159 / c5e812b (2026-08-14 22:35): guard tracked live metrics against
  zero-pipeline clobbering — exporter now refuses state-less roots instead of
  writing, which invalidated the old regenerate-and-compare flow.
- PR #160 / 57bd83b: --help/output confinement across operator exporters.
- PR #162 / c82c88c (2026-08-14 23:33): locked live-metrics writes to
  SERVICE_REPO_ROOT; test updated to restore canonical baselines
  (`scripts/test-active-operator-surfaces.mjs:107-123`).

A scan run inside that window (or against a drifted/dirty checkout) would emit
exactly this failure. On current main the window is closed.

## Outcome

- Item marked resolved in `.fleet/improvement-loop.json` with receipt
  (PR #162, commit c82c88c).
- No PR opened (no code change needed; nothing to fix on main).

## Re-verification (2026-08-21 ~11:30Z, resumed worker, independent)

Packet re-dispatched; verdict re-confirmed from scratch rather than trusted:

- `git fetch`: origin/main advanced ccfbd4b → b747d38; the only delta is a
  docs-only lane report (PR #244), so the code-level verdict carries over.
- 3 further green runs of `node scripts/test-active-operator-surfaces.mjs`
  ("Active operator surface checks passed.", exit 0); checkout stayed clean
  after every run — no tracked artifact drift introduced by the test itself.
- Retirement receipt intact in `.fleet/improvement-loop.json`
  (status: resolved, PR #162 / c82c88c, reverify_count 0).

Final: still RESOLVED on current origin/main. No PR opened; retirement stands.
