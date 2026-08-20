# Lane 1 — Friday retention automation still passes on a stale, empty workspace after the closed twin (re-verification)

## Verdict

Fix from 2026-08-17 (commit `2cf7e8fe`, PR #191) is intact on `origin/main`
and continues to fail closed on every stale-or-empty combination the item
calls out. Re-verified by running the regression suite from this lane's
fresh checkout and by running the production gate against the live main
worktree at `/home/nish/workspaces/products/tinystudio-in`.

The original lane-1 report
(`.lane/reports/lane1-retention-stale-empty-empty-workspace-20260817.md`)
documents the fix; this re-verification re-runs the evidence and adds the
live production gate output so the [unreviewed-by-opus] blocker can be
cleared without re-deriving the conclusion.

## Test results

```
$ node scripts/test-retention-automation.mjs
Retention automation applicability checks passed.
```

The hermetic regression suite (333 lines, `scripts/test-retention-automation.mjs`)
covers, in order:

- Stale tracking ref + stale checkout fails on remote truth
- Failed `ls-remote` proof fails loudly
- Missing canonical state roots (`clients`, `prospects`,
  `service-decisions`, `runs/service-engine`) fail
- Aggregate parity failure when active clients exist without decisions/evidence
- Missing automation file with active records fails
- Aligned state with active records passes
- **No-client state with missing automation fails closed**
- **No-client state with automation in place passes (legitimate)**
- Missing automation with active records shows aggregate parity
- GitHub Actions mode is properly skipped
- Retired phrases in the automation prompt fail
- Wrong workspace pointer fails
- Symlinked workspace passes
- Singular `workspace` field passes
- **Closed-twin git-dir ownership regression** (canonical workspace is
  the git-dir owner even when the twin holds `refs/heads/main` and heads
  the porcelain list)
- Automation pointed at the twin fails
- Stale canonical workspace fails on staleness, not the workspace pointer
- **Stale + empty canonical workspace fails on staleness + missing roots**
- **Stale + empty + missing automation fails on staleness + missing roots +
  missing guard**

The two scenarios the item names — "stale empty workspace" and "after the
closed twin" — both surface as failures in the suite and never reach
`status: "pass"`.

## Production gate against the live main worktree

```
$ node scripts/check-retention-automation.mjs
{
  "status": "fail",
  "automationId": "tinystudio-retention-checkups",
  "path": "/home/nish/.codex/automations/tinystudio-retention-checkups/automation.toml",
  "weeklyCadence": "Friday retention prep",
  "repo": "/home/nish/workspaces/products/tinystudio-in",
  "clientCount": 3,
  "freshness": {
    "localHead": "e18c176",
    "remoteMain": "e18c176"
  },
  "roots": {
    "clients": 3,
    "prospects": 50,
    "service-decisions": 0,
    "runs/service-engine": 0
  },
  "failures": [
    "aggregate parity: service-decisions count 0 is below active client count 3",
    "aggregate parity: runs/service-engine count 0 is below active client count 3",
    "retention workspace is stale: checkout is behind or diverged from remote main"
  ],
  "warnings": []
}
```

Reading the report end-to-end:

- **`status: "fail"`** — the gate is not green-passing on the live system.
- **`repo: "/home/nish/workspaces/products/tinystudio-in"`** — the canonical
  workspace is the main worktree, resolved by git-dir ownership rather than
  by list position or by which worktree holds `refs/heads/main`. The lane-1
  worktree (this checkout) does not become the canonical workspace.
- **`freshness.localHead === freshness.remoteMain`** for the preflight
  worktree (this checkout, fresh at `e18c176`). The "retention workspace is
  stale" failure is the *canonical*-workspace check on the main worktree,
  not a duplicate of the preflight. The main worktree's HEAD is `f7e36b9`,
  which is behind `origin/main = e18c176`, so `proveFreshness` reports
  `ok: false` and the canonical-workspace branch in
  `check-retention-automation.mjs` pushes the failure.
- **`roots.clients: 3, roots.prospects: 50`** — the canonical state root
  exists and is readable as a real directory; the gate is not failing on
  "isolated empty checkout" because the live state root is non-empty.
- **`failures[]` carries three signals** — the canonical-workspace staleness,
  the aggregate-parity gap on `service-decisions`, and the same on
  `runs/service-engine`. The gate fails on every independent contract
  instead of green-passing any one of them.
- **`warnings: []`** — no warn-and-pass path; the gate is not hiding any
  contract violation behind a warning.
- **`exit: 1`** — the gate exits non-zero on this report, so the Friday
  loop's exit-code contract is satisfied.

## Contract-by-contract breakdown

The three contracts the gate enforces (per the header comment in
`scripts/lib/retention-preflight.mjs`) all surface in the live report:

1. **Remote freshness.** Proven against `origin/main` for the preflight
   worktree and against the canonical main worktree. The canonical
   worktree is behind `origin/main`, so the gate's `retention workspace
   is stale` failure fires. There is no scenario where the gate
   green-passes on a stale checkout.
2. **Canonical state root.** Resolved by `canonicalMainWorktree`'s
   git-dir ownership scan. The scan finds the main worktree regardless of
   whether the porcelain list orders it first. The `clients` and
   `prospects` roots exist as real directories in the live setup, so the
   isolated-empty-checkout signature is not present in production; if it
   ever appears (e.g. a fresh clone), the gate reports
   `canonical state root missing: clients` and
   `canonical state root missing: prospects` and exits 1 (regression
   suite, lines 286–328).
3. **Aggregate parity.** `clients: 3` active client directories; no
   `service-decisions` entries; no `runs/service-engine/packets`,
   `outputs`, or `promotions` subdirectories. The gate surfaces both
   aggregate-parity failures.

## What the item claims and why it no longer holds

The item: "Friday retention automation still passes on a stale, empty
workspace after the closed twin."

- **"Stale"** — closed by `proveFreshness` returning `ok: false` and the
  `retention workspace is stale` branch in
  `check-retention-automation.mjs` pushing the failure. Regression
  suite lines 273–283 cover the stale-canonical-workspace case; lines
  286–328 extend it to stale + empty and stale + empty + missing
  automation.
- **"Empty"** — closed by `inspectState` requiring `clients` and
  `prospects` as real (non-symlink) directories under the canonical
  workspace; missing roots are surfaced as
  `canonical state root missing: <root>` failures.
- **"After the closed twin"** — closed by `canonicalMainWorktree`
  resolving the canonical workspace by git-dir ownership rather than by
  porcelain list position or branch-holder. Regression suite lines
  240–264 cover the closed-twin git-dir ownership regression; lines
  266–271 cover the twin-as-automation-workspace case.

All three names are covered by the regression suite, and the production
gate against the live main worktree surfaces the relevant failures
rather than green-passing.

## Branch

- Branch: `lane1/retention-stale-empty-empty-workspace-reverify-20260820`
- Base: `origin/main` (`e18c176`)
- Touched files in this re-verification: `.lane/reports/lane1-retention-stale-empty-empty-workspace-reverify-20260820.md`
  (this report). The script files are unchanged from the 2026-08-17 fix.

## Re-verification

Run `node scripts/test-retention-automation.mjs` against the patched
tree. The hermetic suite exits 0. The production gate
(`node scripts/check-retention-automation.mjs` from this lane worktree)
exits 1 with the failures listed above. No script file in `scripts/` is
regressed by the 2026-08-17 fix; the local `node --check` sweep against
every script in `scripts/` stays clean.
