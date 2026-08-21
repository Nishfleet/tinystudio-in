# Lane 1 — item c33e2af2b6 reverified: test-active-operator-surfaces.mjs "Tracked generated artifact" failure

## Item

> scripts/test-active-operator-surfaces.mjs fails on this box with "Tracked generated artifact …

## Verdict

**Already resolved on current origin/main. Retired (status: resolved). No PR opened** — a
docs-only evidence PR for an already-resolved item is churn per packet contract.

## Investigation (2026-08-21, worktree lane1, fresh origin/main @ b38ec13)

The error string maps to `scripts/test-active-operator-surfaces.mjs:126`
(`Tracked generated artifact is stale: ${path}`) — the byte-identical comparison
between tracked artifacts in the checkout and fresh generator output under the
fixed clock.

### Reproduction attempts — all green

- `node scripts/test-active-operator-surfaces.mjs` on fresh origin/main
  (fast-forwarded ccfbd4b → b38ec13) → **passed**, exit 0, ~30s runtime.
- Checkout stayed clean after every run — no tracked artifact drift introduced
  by the test itself.
- (First run in this session also passed on the pre-fetch HEAD ccfbd4b.)

### State of the tracked surfaces

All `ACTIVE_OPERATOR_ARTIFACTS` carry a consistent `Generated: 2026-08-06`
stamp, untouched since PR #9 — no drift between checkout and generators. The
byte-identical gate at `scripts/test-active-operator-surfaces.mjs:124-127`
passed against fresh generator output in the temp sandbox.

### Root cause of the original failure window

The 2026-08-14 operator-surface fix wave changed generator behavior and test
expectations in the same window:

- PR #159 / c5e812b (2026-08-14 22:35): guard tracked live metrics against
  zero-pipeline clobbering — exporter now refuses state-less roots instead of
  writing, which invalidated the old regenerate-and-compare flow.
- PR #160 / 57bd83b: --help/output confinement across operator exporters.
- PR #162 / c82c88c (2026-08-14 23:33): locked live-metrics writes to
  SERVICE_REPO_ROOT; test updated to restore canonical baselines.

A scan run inside that window (or against a drifted/dirty checkout) would emit
exactly this failure. On current main the window is closed.

## Outcome

- Item re-marked resolved in `.fleet/improvement-loop.json` with refreshed
  receipt (PR #162, commit c82c88c, report reference preserved; note now
  carries this reverify's evidence).
- No PR opened (no code change needed; nothing to fix on main).
- Re-dispatch happened because this packet was already in flight when the
  reverify-churn fix (worktree-resolution harvest, 2026-08-21) landed; the
  retirement is now in both the worktree state and the controller-visible
  checkout state.
