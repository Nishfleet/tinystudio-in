# Lane 1 — Recording exporters honor `--help`: already fixed on main (reverify 2026-08-17)

## Item

- [unreviewed-by-opus] Recording exporters (teleprompter / rehearsal / cockpit / queue) ignore --help and write arti

## Verdict

**Already fixed and merged on main (PR #145).** Re-dispatched to this lane a
second time; re-verified the shipped fix against fresh `origin/main`
(`4b8e240`). No source change is possible or needed; this run documents the
reverification.

## Evidence

- Fix merge commit `fc44b42` ("fix(ops): honor --help in the 4
  recording-batch exporters (#145)") is an ancestor of fresh `origin/main`:
  `git merge-base --is-ancestor fc44b42 4b8e240` → true.
- All four exporter scripts call `handleHelp(args, "Usage: ...")` immediately
  after parsing `process.argv` and before any file work, and route every
  `--output=` / `--html=` value through `resolveOutputPath(..., { fallback })`:
  - `scripts/export-recording-teleprompter.mjs` (lines 10-16)
  - `scripts/export-recording-rehearsal-check.mjs` (lines 11-20; routes both
    `--output` and `--html`)
  - `scripts/export-recording-cockpit.mjs` (lines 11-17)
  - `scripts/export-recording-queue.mjs` (lines 8-14)
- `handleHelp` (scripts/lib/operator-cli.mjs:14-19) prints the usage line and
  exits 0 when `--help` or `-h` is present, so no artifact is written.
- Enforcement suite `scripts/test-active-operator-surfaces.mjs` registers all
  four scripts in `remainingHelpSurface` (lines 133-136) and enforces exit 0 +
  `Usage:` on stdout for both `--help` and `-h`, plus no artifact rewrite.
- Live on this checkout (branch off fresh `origin/main`):
  - `node scripts/test-active-operator-surfaces.mjs` →
    `Active operator surface checks passed.` (exit 0)
  - `node scripts/export-recording-teleprompter.mjs --help` → prints usage, exit 0
  - `node scripts/export-recording-rehearsal-check.mjs --help` → prints usage, exit 0
  - `node scripts/export-recording-cockpit.mjs --help` → prints usage, exit 0
  - `node scripts/export-recording-queue.mjs --help` → prints usage, exit 0
  - All four also exit 0 for `-h`.
  - `git status --porcelain` after all probes shows no `prospects/` artifact
    or source change (only the pre-existing untracked `node_modules` symlink).

## Files

None changed (verification-only run). The prior fix (PR #145) touched:
- `scripts/export-recording-cockpit.mjs`
- `scripts/export-recording-queue.mjs`
- `scripts/export-recording-rehearsal-check.mjs`
- `scripts/export-recording-teleprompter.mjs`
- `scripts/test-active-operator-surfaces.mjs`