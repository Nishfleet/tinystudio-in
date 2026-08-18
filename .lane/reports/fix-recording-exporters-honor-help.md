# Lane 1 — Recording exporters honor `--help`

## Item

- [unreviewed-by-opus] Recording exporters (teleprompter / rehearsal / cockpit / queue) ignore --help and write arti

## Branch

`fix/recording-exporters-honor-help` (off `origin/main` @ `497d690`)

## Root cause

The four recording-batch operator scripts in `scripts/` never tested
`process.argv` for `--help` / `-h` and never routed their `--output=` /
`--html=` flags through the shared operator CLI safety helpers. Calling any
of them with `--help` ran the full batch export and silently rewrote the
recording-batch artifact in `prospects/` — the same hazard the prior
`#135` and `#99` fixes closed for the growth/ops exporters and the
retired broad-service writers.

| Script | Default artifact |
|---|---|
| `scripts/export-recording-cockpit.mjs` | `prospects/recording-cockpit.html` |
| `scripts/export-recording-queue.mjs` | `prospects/recording-queue.md` |
| `scripts/export-recording-rehearsal-check.mjs` | `prospects/recording-rehearsal-check.{md,html}` |
| `scripts/export-recording-teleprompter.mjs` | `prospects/recording-teleprompter.html` |

## Fix

All four scripts now follow the established `handleHelp` /
`resolveOutputPath` pattern that the prior recording-batch refactor
peers use:

1. Import `handleHelp` and `resolveOutputPath` from
   `./lib/operator-cli.mjs`.
2. Call `handleHelp(args, "Usage: ...")` immediately after parsing
   `process.argv`, before any work.
3. Resolve every operator-supplied `--output=` / `--html=` value through
   `resolveOutputPath(..., { fallback })` so paths that escape the
   service repository are refused, mirroring the safety contract used
   by `export-market-proof-run.mjs`, `export-internal-dashboard.mjs`,
   etc.

## Tests

- Extended
  `scripts/test-active-operator-surfaces.mjs`'s `remainingHelpSurface`
  list with the four recording-batch scripts. The shared loop already
  enforces:
  - exit 0 for both `--help` and `-h`,
  - `Usage:` printed on stdout,
  - no rewrite of any tracked, runtime, or retired artifact.
- Ran `node scripts/test-active-operator-surfaces.mjs` end-to-end —
  passes (`Active operator surface checks passed.`).
- Manual probes (run in `/tmp/test-recording-help`, removed after):
  - `node scripts/export-recording-queue.mjs --help` → exits 0, prints
    `Usage: node scripts/export-recording-queue.mjs [--limit=5] [--output=prospects/recording-queue.md]`,
    no `prospects/` created.
  - `node scripts/export-recording-cockpit.mjs -h` → exits 0, prints
    usage, no artifact.
  - `node scripts/export-recording-teleprompter.mjs --help` → exits 0,
    prints usage, no artifact.
  - `node scripts/export-recording-rehearsal-check.mjs --help` → exits
    0, prints usage, no artifact.
  - `--output=/tmp/escape-*.md` → refused with
    `Refusing --output=...: the path escapes the repository`, exit 1,
    no file written outside the service root for all four scripts.

## Files

- `scripts/export-recording-cockpit.mjs` — add `handleHelp` +
  `resolveOutputPath`.
- `scripts/export-recording-queue.mjs` — same.
- `scripts/export-recording-rehearsal-check.mjs` — same; routes both
  `--output` and `--html` through `resolveOutputPath`.
- `scripts/export-recording-teleprompter.mjs` — same.
- `scripts/test-active-operator-surfaces.mjs` — register the four
  scripts in `remainingHelpSurface` so the shared `--help` / `-h`
  contract stays enforced.
