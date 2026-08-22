# Lane 1 evidence: ops-artifact lockstep guard

- Item id: `4e743ee1a5`
- Title: Recurring ops-artifact date drift: `npm run check` fails on the primary checkout because `live-metrics.md` was regenerated with the real clock while the other `ACTIVE_OPERATOR_ARTIFACTS` stay on a different day
- Branched from `origin/main`: `3936137a0dfb2742dcb0ae89244197bf667bda43`

## What changed

- Added `scripts/lib/ops-lockstep.mjs`: fail-closed guard so a single tracked `ACTIVE_OPERATOR_ARTIFACTS` writer cannot stamp a `Generated:` date the rest of the set does not share.
- Added `scripts/refresh-operator-artifacts.mjs` and `npm run ops:refresh` to regenerate all nine tracked artifacts in one invocation (`TINYSTUDIO_OPS_REFRESH=1`).
- Wired the guard into every tracked writer. Nested `export-market-benchmark` from `check-market-parity-readiness.mjs` now writes private `runs/` copies (same pattern as `runs/metrics-for-parity.md`) so a parity check does not desync the tracked matrix as a side effect.
- Daily money mission tries lockstep refresh first (best-effort) and always reads private `runs/metrics-for-mission.md`.
- Added `scripts/test-ops-lockstep.mjs` to `test` and `ci`.

## Commands run

### `node --check` (exit 0, empty stdout)

```
$ node --check scripts/lib/ops-lockstep.mjs && node --check scripts/refresh-operator-artifacts.mjs && node --check scripts/test-ops-lockstep.mjs
```

### `node scripts/test-ops-lockstep.mjs` (exit 0)

```
Ops lockstep checks passed.
```

### `node scripts/test-active-operator-surfaces.mjs` (exit 0)

```
Active operator surface checks passed.
```

### `node scripts/check-product-truth.mjs` (exit 0)

```
{
  "status": "passed",
  ...
}
```

### `node scripts/check-human-service-kit.mjs` (exit 0)

```
{
  "status": "passed",
  "contract": "human-reviewed-service-kit",
  "checkedFiles": 38,
  "allowedCommands": 9,
  ...
}
```

### `npm run check` (exit 0)

Last stdout lines:

```
E. npm test/ci wiring
  ok npm test runs the homepage JSON-LD offer test
  ok npm run ci runs the homepage JSON-LD offer test

26 checks, 0 failures
```

### `git diff --check` (exit 0)

(empty stdout)

### package.json wiring (exit 0)

```
$ node -e 'const p=require("./package.json"); if(!p.scripts["ops:refresh"]) process.exit(1); if(!p.scripts.test.includes("test-ops-lockstep.mjs")) process.exit(1); if(!p.scripts.ci.includes("test-ops-lockstep.mjs")) process.exit(1);'
```

### Red path on `/tmp` scratch (exit 1, not left in the worktree)

```
Refusing to regenerate growth-brain/ops/live-metrics.md with Generated: 2026-08-22 because other ACTIVE_OPERATOR_ARTIFACTS are not dated 2026-08-22: growth-brain/ops/11-10-proof-run.md (2026-08-06), growth-brain/ops/proof-library.md (2026-08-06), growth-brain/ops/market-parity-readiness.md (2026-08-06), growth-brain/ops/sender-setup-guide.md (2026-08-06), growth-brain/ops/sender-setup-guide.html (2026-08-06), growth-brain/ops/competitive-proof-matrix.md (2026-08-06), growth-brain/ops/competitive-proof-matrix.html (2026-08-06), docs/strategy/market-parity-benchmark-2026.md (2026-08-06). Run `npm run ops:refresh` to regenerate all tracked operator artifacts in lockstep.
scratch-exit:1
```

Tracked ops artifacts on this worktree were not regenerated or committed.

## PR

https://github.com/nish3451/tinystudio-in/pull/251

`gh pr view --json url,baseRefName,headRefName`:

```
{"baseRefName":"main","headRefName":"fix/lane1-ops-artifact-lockstep-20260822","url":"https://github.com/nish3451/tinystudio-in/pull/251"}
```
