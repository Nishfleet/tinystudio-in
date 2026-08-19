# Lane 1 — Growth/ops exporters honor `--help`

## Item

- [unreviewed-by-opus] Growth/ops exporters ignore --help and overwrite tracked ops artifacts (live-metrics, proof-l

## Verdict

Already fixed on main. No code change is possible or needed. The exact item
was closed by commit `d4f3ef4` (PR #135), "fix(ops): honor --help in the 7
growth/ops exporters that overwrite tracked ACTIVE_OPERATOR_ARTIFACTS":

- `scripts/export-growth-metrics.mjs` — `growth-brain/ops/live-metrics.md`
- `scripts/export-proof-library.mjs` — `growth-brain/ops/proof-library.md`
- plus `export-market-benchmark`, `export-sender-setup-guide`,
  `export-market-proof-run`, `check-market-parity-readiness`,
  `export-internal-dashboard`.

## Evidence (re-verified 2026-08-15 against the live worktree)

- `git merge-base --is-ancestor d4f3ef4 HEAD` — the fix is on the mainline.
- Both named exporters call `handleHelp(process.argv.slice(2), "Usage: ...")`
  as their first statement, before any work, and route every
  `--output=`/`--ops=`/`--html=` value through `resolveOutputPath()` from the
  shared `scripts/lib/operator-cli.mjs` (repo-escape guard).
- Live probes on the worktree at HEAD `b3726ed` (= origin/main):
  - `node scripts/export-growth-metrics.mjs --help` → exit 0, prints
    `Usage: node scripts/export-growth-metrics.mjs [--output=growth-brain/ops/live-metrics.md] [--plain]`.
  - `node scripts/export-proof-library.mjs -h` → exit 0, prints
    `Usage: node scripts/export-proof-library.mjs [--output=growth-brain/ops/proof-library.md]`.
  - `git status` clean after both probes; `growth-brain/ops/live-metrics.md`
    and `growth-brain/ops/proof-library.md` byte-identical before/after.
- `scripts/test-active-operator-surfaces.mjs` already enforces this contract:
  `trackedOpsHelpSurface` (lines 144-152) lists `export-growth-metrics.mjs`
  and `export-proof-library.mjs` and asserts exit 0 + `Usage:` for both
  `--help` and `-h`, then asserts no tracked/runtime/retired artifact was
  rewritten, and refuses `--output=` escapes. The full run passes:
  `Active operator surface checks passed.`

## Actions taken

- No source files changed; published `claims` for this report file to the
  lane record.
- This report is the durable deliverable, published as a docs commit + PR to
  close out the lane item.
