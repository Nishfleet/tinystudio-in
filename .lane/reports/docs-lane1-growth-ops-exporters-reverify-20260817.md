# Lane 1 — Growth/ops exporters honor `--help`: already fixed on main (reverify)

## Item

- [unreviewed-by-opus] Growth/ops exporters ignore --help and overwrite tracked ops artifacts (live-metrics, proof-l

## Verdict

**Already fixed and merged on main (PR #135).** No code change is possible or
needed; this run reverified the shipped fix against fresh `origin/main`
(`4b8e240`). The item was previously reported as fixed via PR #165
(commit `3491c67`); this report is a fresh re-verification against the current
mainline.

## Evidence

- The 7 growth/ops exporters that overwrite tracked `ACTIVE_OPERATOR_ARTIFACTS`
  honor `--help` / `-h` by commit `d4f3ef4` ("fix(ops): honor --help in the 7
  growth/ops exporters that overwrite tracked ACTIVE_OPERATOR_ARTIFACTS",
  PR #135). Also on main: `3d1a956` (PR #99, remaining 8 export scripts) and
  `fc44b42` (PR #145, recording-batch exporters).
  `git merge-base --is-ancestor d4f3ef4 HEAD` → true (same for `3d1a956`,
  `fc44b42`).
- Each of the 7 scripts calls `handleHelp(process.argv.slice(2), "Usage: ...")`
  as its first statement before any file work, and routes every `--output=` /
  `--ops=` / `--html=` value through `resolveOutputPath()`:
  - `scripts/export-growth-metrics.mjs` (line 14; fallback
    `growth-brain/ops/live-metrics.md`)
  - `scripts/export-proof-library.mjs` (fallback `growth-brain/ops/proof-library.md`)
  - `scripts/export-market-benchmark.mjs`
  - `scripts/export-market-proof-run.mjs`
  - `scripts/export-sender-setup-guide.mjs`
  - `scripts/check-market-parity-readiness.mjs`
  - `scripts/export-internal-dashboard.mjs`
- `handleHelp` (`scripts/lib/operator-cli.mjs:14-19`) prints the usage line and
  exits 0 when `--help` or `-h` is present, so no artifact is written.
  `resolveOutputPath` (`operator-cli.mjs:30`) refuses paths that escape the
  service repository root (`Refusing ... Output paths must stay inside the
  repository`).
- Enforcement suite `scripts/test-active-operator-surfaces.mjs` registers all 7
  scripts in `trackedOpsHelpSurface` (lines 144-152) and enforces exit 0 +
  `Usage:` on stdout for both `--help` and `-h`, asserts every tracked /
  private-runtime artifact is byte-identical afterward, asserts retired
  artifacts are not recreated, and asserts escaping `--output=` paths are
  refused.
- Live on this checkout (branch off fresh `origin/main`, HEAD `4b8e240`):
  - `node scripts/test-active-operator-surfaces.mjs` →
    `Active operator surface checks passed.` (exit 0)
  - `node scripts/export-growth-metrics.mjs --help` → prints
    `Usage: node scripts/export-growth-metrics.mjs [--output=growth-brain/ops/live-metrics.md] [--plain]`,
    exit 0; `growth-brain/ops/live-metrics.md` md5 unchanged
    (`fd9e1d451bf7516729c7c0a5fda0e089`)
  - `node scripts/export-proof-library.mjs -h` → prints
    `Usage: node scripts/export-proof-library.mjs [--output=growth-brain/ops/proof-library.md]`,
    exit 0; `growth-brain/ops/proof-library.md` md5 unchanged
    (`d1a764c120750be43489feabc4f259f8`)
  - `git status` clean after both probes — no tracked ops artifact was
    overwritten by asking for help.

## Files

None changed (verification-only run). The prior fix (PR #135) touched the 7
exporter scripts listed above plus `scripts/test-active-operator-surfaces.mjs`.