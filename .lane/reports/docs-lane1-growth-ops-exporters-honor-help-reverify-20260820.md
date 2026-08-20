# Lane 1 — Growth/ops exporters honor `--help`: already fixed on main (reverify 2026-08-20)

## Item

- [unreviewed-by-opus] Growth/ops exporters ignore --help and overwrite tracked ops artifacts (live-metrics, proof-l

## Verdict

**Already fixed and merged on main (PR #135, commit `d4f3ef4`).** No source
change is possible or needed; this run reverified the shipped fix against
fresh `origin/main` (`e18c176`, "chore(ops): outbound email is Cloudflare —
DKIM selector cf2024-1 (#200)"). The two scripts named in the item title
honor `--help` / `-h` and do not overwrite their tracked ops artifacts on
the current mainline.

## Evidence (re-verified 2026-08-20 on this worktree, branch
`docs/lane1-growth-ops-exporters-honor-help-reverify-20260820` off
`origin/main` @ `e18c176`)

- `git merge-base --is-ancestor d4f3ef4 HEAD` → exit 0 (fix commit
  `d4f3ef4` ("fix(ops): honor --help in the 7 growth/ops exporters that
  overwrite tracked ACTIVE_OPERATOR_ARTIFACTS (#135)") is on the
  mainline).
- The two scripts named in the item title call
  `handleHelp(process.argv.slice(2), "Usage: ...")` as their first
  statement before any work, and route every `--output=` value through
  `resolveOutputPath()` from `scripts/lib/operator-cli.mjs`:
  - `scripts/export-growth-metrics.mjs` (fallback
    `growth-brain/ops/live-metrics.md`)
  - `scripts/export-proof-library.mjs` (fallback
    `growth-brain/ops/proof-library.md`)
- `handleHelp` (`scripts/lib/operator-cli.mjs`) prints the usage line and
  exits 0 when `--help` or `-h` is present, so no artifact is written.
  `resolveOutputPath` refuses paths that escape the service repository
  root (`Refusing ... the path escapes the repository`).
- Enforcement suite `scripts/test-active-operator-surfaces.mjs` registers
  both scripts in `trackedOpsHelpSurface` and enforces exit 0 +
  `Usage:` on stdout for both `--help` and `-h`, asserts every tracked /
  private-runtime artifact is byte-identical afterward, asserts retired
  artifacts are not recreated, and asserts escaping `--output=` paths
  are refused.
- Live on this checkout (branched off fresh `origin/main`, HEAD
  `e18c176`):
  - `node scripts/test-active-operator-surfaces.mjs` →
    `Active operator surface checks passed.` (exit 0)
  - `node scripts/export-growth-metrics.mjs --help` → prints
    `Usage: node scripts/export-growth-metrics.mjs [--output=growth-brain/ops/live-metrics.md] [--plain]`,
    exit 0; `growth-brain/ops/live-metrics.md` md5 unchanged
    (`fd9e1d451bf7516729c7c0a5fda0e089`)
  - `node scripts/export-proof-library.mjs --help` → prints
    `Usage: node scripts/export-proof-library.mjs [--output=growth-brain/ops/proof-library.md]`,
    exit 0; `growth-brain/ops/proof-library.md` md5 unchanged
    (`d1a764c120750be43489feabc4f259f8`)
  - `git status` clean after both probes — no tracked ops artifact was
    overwritten by asking for help.

## Files

None changed (verification-only run). The prior fix (PR #135) touched the 7
growth/ops exporters, including the two named in the item title:

- `scripts/export-growth-metrics.mjs`
- `scripts/export-proof-library.mjs`
- `scripts/export-market-benchmark.mjs`
- `scripts/export-sender-setup-guide.mjs`
- `scripts/export-market-proof-run.mjs`
- `scripts/check-market-parity-readiness.mjs`
- `scripts/export-internal-dashboard.mjs`

plus `scripts/test-active-operator-surfaces.mjs` to enforce the contract.

This docs report is the durable deliverable for this lane run.
