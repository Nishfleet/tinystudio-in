# Lane 1 — Tracked operator metrics surface reports a zero pipeline while 50 prospects exist

## Item

- [ ] [unreviewed-by-opus] Tracked operator metrics surface reports a zero pipeline (0 prospects) while 50 prospect fold

## Verdict

**Fixed.** The tracked `growth-brain/ops/live-metrics.md` surface reported
0 prospects because nothing in the daily operator flow ever regenerated the
tracked default from a populated root. The state-less refusal guard
(commit `c5e812b`) was correct, but it also redirected every internal
metrics consumer to private `runs/` copies, so the tracked surface stayed
frozen at the last state-less snapshot (2026-08-06, all zeros) even though
the service root holds 50 prospect folders, every one with a `pipeline.json`.

## What changed

1. **`scripts/export-daily-money-mission.mjs`** — the daily mission flow
   (run by `growth:start`) now regenerates the tracked live-metrics
   default when the exporter accepts the root (pipeline state present),
   and falls back to the private `runs/metrics-for-mission.md` report only
   when the exporter declines a state-less root. The exporter's own guard
   decides, so an absent/empty `prospects/` root can never clobber the
   tracked surface with zeros, while a populated root keeps the tracked
   surface truthful on every daily run.
2. **`growth-brain/ops/live-metrics.md`** — refreshed to the truthful
   pipeline from the service root:
   - Prospects total: **50** (was 0)
   - Active prospects: **43**
   - Active scored prospects: **5** (12 including inactive)
   - Client records blocked: **3**
   - Pipeline stages: new 38, paused 7, scored 5
   - Generated: 2026-08-21
3. **`scripts/test-active-operator-surfaces.mjs`** — the tracked-surface
   assertion now expects the mission-refreshed file to carry the fixture's
   real blocked-client count (1) instead of the canonical empty baseline
   (0), matching the new behavior.

## Evidence

- Live repro on the service root
  (`/home/nish/workspaces/products/tinystudio-in`, 50 prospect folders,
  all with `pipeline.json`):
  - `node scripts/export-growth-metrics.mjs` → exit 0, JSON
    `counts.prospectsTotal = 50`, `activeProspects = 43`, `scored = 5`,
    `clientsBlocked = 3`; tracked `growth-brain/ops/live-metrics.md`
    regenerated with those counts, `Generated: 2026-08-21`.
  - `node scripts/export-daily-money-mission.mjs --limit=2` → exit 0 and
    the tracked live-metrics refreshed to `| Prospects total | 50 |`.
- State-less root still refuses:
  - `node scripts/export-growth-metrics.mjs` from a root with no
    `prospects/` → exit 1 with `Refusing to regenerate the tracked live
    metrics with a zero pipeline`.
  - Mission against a data-only `SERVICE_REPO_ROOT` without pipeline
    state falls back to `runs/metrics-for-mission.md` (verified).
- Test suite (all pass):
  - `node scripts/test-active-operator-surfaces.mjs` → "Active operator
    surface checks passed." (includes the tracked artifact byte-identical
    gate, the state-less refusal, the private zero-state path, and the new
    mission-refreshed assertion)
  - `node scripts/test-direction-proof-gate.mjs` → "Direction proof gate
    checks passed."
  - `node scripts/test-client-readiness-contract.mjs` → "Client readiness
    contract checks passed."
  - `node scripts/test-service-engine.mjs` → exit 0
  - `node scripts/check-product-truth.mjs` → `{"status": "passed"}`
  - `--help`/`-h` on the mission and metrics exporters → exit 0 with usage

## Scope notes

- The other tracked artifacts (`proof-library.md`, `market-parity-readiness.md`,
  `11-10-proof-run.md`, `sender-setup-guide`, `competitive-proof-matrix`,
  `market-parity-benchmark-2026`) are still dated 2026-08-06 and the queue's
  `staleGeneratedArtifacts` flags them ~15 days stale as of 2026-08-21. That
  is a separate pre-existing refresh gap, not part of this item. The parity
  and proof-run generators also fail on live data because prospect files
  contain retired-offer strings ("outbound package sells a retired offer") —
  a separate live-data hygiene issue outside this lane.
