# Waiting-room close: tinystudio-in-pr115-53a4262b7dfbef00cff6be132ea53ed0a2538df6-flagship-disagreement

Date: 2026-08-14
Branch: `fix/pr115-53a4262b-metrics-service-root-write`
Item: tinystudio-in-pr115-53a4262b7dfbef00cff6be132ea53ed0a2538df6-flagship-disagreement
Triage note: `/home/nish/workspaces/agent-state/tinystudio-in-improvement-loop/triage/tinystudio-in-pr115-53a4262b7dfbef00cff6be132ea53ed0a2538df6-flagship-disagreement.md` (Disposition left QUEUED)

## Verdict on Sol's blocking finding

Sol's finding (scripts/export-growth-metrics.mjs:214 — SERVICE_REPO_ROOT is used to
read pipeline state and decide the tracked destination is safe, but lines 214-216
still mkdir/writeFileSync `outputPath` relative to process cwd instead of
`resolvedOutputPath`):

- **HOLDS on PR #115 head `53a4262b`**: that file still did
  `const outputPath = outputArg ? ... : "growth-brain/ops/live-metrics.md"` plus
  `resolvedOutputPath = join(repoRoot, outputPath)` for the refuse check, then
  `writeFileSync(outputPath, markdown)` at lines 214-216.
- **UNFOUNDED on current origin/main `80df37a`**: the current exporter already does
  `outputPath = resolveOutputPath(..., { fallback: "growth-brain/ops/live-metrics.md" })`,
  and `resolveOutputPath` returns an absolute path under `serviceRoot`. A foreign-cwd
  run writes into the service root and leaves no cwd stray.

## Live orchestrator repro (2026-08-14)

From `/tmp/tsin-pr115-53a4262b-diag`:
- `cwd=/tmp/tsin-pr115-53a4262b-diag/cwd`, `SERVICE_REPO_ROOT=/tmp/tsin-pr115-53a4262b-diag/service`
- `node scripts/export-growth-metrics.mjs --output=growth-brain/ops/live-metrics.md`
- wrote JSON path `/tmp/tsin-pr115-53a4262b-diag/service/growth-brain/ops/live-metrics.md`,
  `prospectsTotal=1`
- no file at `cwd/growth-brain/ops/live-metrics.md`

## What this packet changed

1. **A — one resolved root for reads and writes**
   `scripts/export-growth-metrics.mjs` now imports `serviceRoot` from
   `./lib/runtime-roots.mjs` and uses `const repoRoot = serviceRoot` instead of
   `process.env.SERVICE_REPO_ROOT || process.cwd()`. Reads (prospects, clients,
   pipeline state) and the `resolveOutputPath` write target now resolve to the same
   root. `writeFileSync(outputPath, markdown)` is unchanged — `outputPath` is already
   absolute under `serviceRoot`. No second `resolvedOutputPath` variable was added.
2. **B — divergent-cwd test for this exporter**
   `scripts/test-active-operator-surfaces.mjs` now runs `export-growth-metrics.mjs`
   (default and `--output=runs/...`) from a foreign cwd (`metrics-cwd`) with
   `SERVICE_REPO_ROOT` set, asserting:
   - JSON reports the absolute service-root path and `prospectsTotal: 1`
   - the cwd poison `growth-brain/ops/live-metrics.md` stays untouched
   - no cwd `runs/divergent-live-metrics.md` stray; the file lands under the service root
   - the tracked service-root live-metrics regenerates with `| Prospects total | 1 |`
   This test fails on the PR #115 head relative-write path and passes on the current
   `resolveOutputPath` behavior.

## What was deliberately not touched (out of scope)

- No merge/rebuild/edit of GitHub PR #115 (still open).
- No zero-pipeline refusal / `regeneratesTrackedMetrics` block.
- No retargeting of nested callers (`export-market-proof-run.mjs`,
  `export-market-benchmark.mjs`, `export-growth-doctor.mjs`, `export-growth-cockpit.mjs`,
  `export-internal-dashboard.mjs`, `export-market-learning-review.mjs`,
  `export-daily-money-mission.mjs`, `check-market-parity-readiness.mjs`) to
  `--output=runs/live-metrics.md`.
- No edits to `scripts/lib/operator-cli.mjs` or `scripts/lib/runtime-roots.mjs`.
- No sibling waiting-room rows ticked (7c8ba3d6, d14d9db08, or any other item).
- No PR opened (orchestrator opens it after independent verification).

## Validation output (pasted from the run)

### node scripts/test-active-operator-surfaces.mjs

```
Active operator surface checks passed.
```

### git diff --check

```
DIFF-CHECK-CLEAN
```

### npm test (full suite)

All suites before `check-retention-automation.mjs` passed, including
`test-active-operator-surfaces.mjs` ("Active operator surface checks passed."),
product truth, human-service-kit, and design-system-proving-lab. The chain then hit
the documented pre-existing VPS-global baseline failure (same one already documented
on PR #112): `check-retention-automation.mjs` fails because the VPS-global automation
file `/home/nish/.codex/automations/tinystudio-retention-checkups/automation.toml`
points at another checkout (`/home/nish/workspaces/products/tinystudio-in`) and reports
"retention workspace is stale: checkout is behind or diverged from remote main" plus
parity counts from that foreign checkout. That is baseline-only; the packet proof is
`test-active-operator-surfaces.mjs` + `git diff --check`, both green.
