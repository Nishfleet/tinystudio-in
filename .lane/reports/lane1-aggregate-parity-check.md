# Lane 1 — Aggregate-parity gate kept `npm run check` permanently red wherever real private state lags

Item: cf023d4643 · Branch: `lane1-aggregate-parity-check` · PR: #250

## Root cause

`scripts/check-retention-automation.mjs` is a live-ops gate over machine-local
state embedded unconditionally in the `npm test` / `npm run ci` chains:

- aggregate parity (`clients`/`prospects` vs `service-decisions`, `runs/service-engine`)
- canonical-main-worktree freshness against remote main
- presence/validity of `~/.codex/automations/tinystudio-retention-checkups/automation.toml`

Wherever that real state lags, the gate exits 1. Live reproduction on this
machine (main worktree `/home/nish/workspaces/products/tinystudio-in`):
3 active clients, `service-decisions` count 0, engine applications 0 →

```
aggregate parity: service-decisions count 0 is below active client count 3
aggregate parity: runs/service-engine count 0 is below active client count 3
retention workspace is stale: checkout is behind or diverged from remote main
```

Because the suite chain uses `&&`, every check after it (~15 scripts) never ran
locally. At least eight prior `.lane/reports/*` entries document this exact
"pre-existing and unrelated" failure polluting lane verification.

## Fix

- `check-retention-automation.mjs --advisory`: all findings stay visible in the
  JSON report, status demotes to `warn`, exit 0. Both exit paths honor it,
  including the early missing-automation-file path.
- Shared `ci`/`test` chains invoke the gate with `--advisory`; new alias
  `retention:automation-check:advisory`.
- Strict fail-closed default untouched for its actual consumer — the Friday
  retention loop (`retention:automation-check`). README documents the split.
- `test-retention-automation.mjs` extended: advisory exits 0/warn while the
  default invocation stays strict; caught a first-cut bug where the early
  exit path ignored advisory mode.

## Verification (all run on this machine)

| Check | Result |
| --- | --- |
| `node scripts/check-retention-automation.mjs` (strict) | exit 1 — fail-loud preserved |
| `node scripts/check-retention-automation.mjs --advisory` | exit 0, `status: warn`, 3 findings + advisory label printed |
| `node scripts/test-retention-automation.mjs` | passes incl. new advisory assertions |
| `node scripts/check-human-service-kit.mjs` | passes (chain-wiring assertion intact) |
| Full `npm run check` | **exit 0**, 33 suite-pass markers; parity findings still printed |

## Claims

package.json · README.md · scripts/check-retention-automation.mjs · scripts/test-retention-automation.mjs
