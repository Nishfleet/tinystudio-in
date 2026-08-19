# Lane 1 report — Operator export scripts ignore --help and write anywhere

Branch: `fix/lane1-operator-export-cli-help-complete-20260814`
PR: https://github.com/nish3451/tinystudio-in/pull/160
Item: `[unreviewed-by-opus] Operator export scripts ignore --help and write/overwrite cockpits and mission artifacts anywhere`

## What was wrong

18 of the export scripts already used `scripts/lib/operator-cli.mjs`
(`handleHelp` + `resolveOutputPath`) per `test-active-operator-surfaces.mjs`,
but 11 runtime cockpit/mission writers still:

1. Ignored `--help`/`-h` — they ran their full pipeline and wrote their
   artifacts even when asked for help.
2. Wrote to raw, unvalidated `--output`/`--html` paths — an operator could
   point an export at any absolute path or `..` traversal and it would
   overwrite cockpits, missions, or any file "anywhere".

## What changed

Wired `handleHelp` + `resolveOutputPath` into the 11 remaining export scripts:

- `scripts/export-client-delivery-cockpit.mjs` (client runtime cockpit; its
  `--output` previously used `resolveRepoPath`, which throws an assertion
  instead of a clean operator refusal — now uses `resolveOutputPath`)
- `scripts/export-daily-money-mission.mjs` (also anchors its
  `prospects/loom-links.txt` template write through `resolveOutputPath`)
- `scripts/export-followup-cockpit.mjs`
- `scripts/export-growth-cockpit.mjs`
- `scripts/export-growth-doctor.mjs`
- `scripts/export-lead-scoring-cockpit.mjs`
- `scripts/export-managed-it-one-pager.mjs`
- `scripts/export-market-learning-review.mjs`
- `scripts/export-market-proof-cockpit.mjs`
- `scripts/export-prospect-outbox.mjs`
- `scripts/export-sales-cockpit.mjs`

Each now prints usage and exits 0 on `--help`/`-h` before doing any work,
and resolves every output path against the service repo root, refusing
absolute escapes, `..` traversal, and symlink escapes with a `Refusing ...`
message on stderr and exit 1.

## Test coverage

Extended `scripts/test-active-operator-surfaces.mjs`:

- New `runtimeHelpSurface` (the 11 scripts): must exit 0 and print `Usage:`
  for both `--help` and `-h`, without rewriting tracked/runtime artifacts.
- New escape probes for all 11: escaping `--output` must exit non-zero,
  print `Refusing`, and create no file outside the root.

## Validation

- `node scripts/test-active-operator-surfaces.mjs` — passes
- `node scripts/test-service-engine.mjs` — passes (38 checks)
- `node scripts/test-validated-service-client.mjs` — passes
- Manual: `node scripts/export-managed-it-one-pager.mjs --help` → usage, exit 0;
  `--output=/tmp/...` and `--output=../...` → `Refusing ...`, exit 1.
