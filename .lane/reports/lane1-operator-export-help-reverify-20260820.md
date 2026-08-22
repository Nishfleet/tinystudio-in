# Lane 1 — Operator export scripts ignore `--help` and write/overwrite cockpits and mission artifacts anywhere

## Item

- `[unreviewed-by-opus] Operator export scripts ignore --help and write/overwrite cockpits and mission artifacts anyway`
  (backlog.md line 165, scout 2026-08-09 16:25 IST)

## Verdict

**Already fixed and merged on main.** No source change is possible or needed;
this run reverified the shipped fix against the live worktree at
origin/main `6c3d83f`.

The item's acceptance names exactly four npm surfaces:
`prospect:sales-cockpit` (`scripts/export-sales-cockpit.mjs`),
`prospect:outbox` (`scripts/export-prospect-outbox.mjs`),
`prospect:followups` (`scripts/export-followup-cockpit.mjs`), and
`growth:mission` (`scripts/export-daily-money-mission.mjs`). Those four were
fixed by PR #160 (`fix/lane1-operator-export-cli-help-complete-20260814`,
commit `57bd83b`), which wired the shared
`scripts/lib/operator-cli.mjs` helpers (`handleHelp` + `resolveOutputPath`)
into the 11 remaining runtime cockpit/mission writers; the other two
classes of this item (recording exporters, growth/ops exporters) were fixed
by PRs #145 and #135 and have their own reverify reports in this folder.

## Evidence (re-verified 2026-08-20 on this worktree, origin/main `6c3d83f`)

- The four named scripts call
  `handleHelp(process.argv.slice(2), "Usage: ...")` as their first statement
  and route every `--output=`/`--html=` value through `resolveOutputPath()`
  (repo-escape guard with `Refusing ...` + exit 1).
- Live probes, each with `--help` and `-h`:
  - `scripts/export-sales-cockpit.mjs` → exit 0, prints
    `Usage: node scripts/export-sales-cockpit.mjs [--limit=20] [--output=prospects/sales-cockpit.html]`
  - `scripts/export-prospect-outbox.mjs` → exit 0, prints usage
  - `scripts/export-followup-cockpit.mjs` → exit 0, prints usage
  - `scripts/export-daily-money-mission.mjs` → exit 0, prints usage
- `git status` clean after all probes; `growth-brain/ops/live-metrics.md`
  (md5 `fd9e1d451bf7516729c7c0a5fda0e089`) and
  `growth-brain/ops/proof-library.md` (md5 `d1a764c120750be43489feabc4f259f8`)
  byte-identical before/after. No cockpit/mission/loom files were created or
  overwritten.
- Escape probes (`--output=/tmp/...`, `--output=../...`) on all four scripts:
  exit 1, stderr `Refusing --output=...: the path escapes the repository...`,
  and no escape file created.
- `node scripts/test-active-operator-surfaces.mjs` → `Active operator surface
  checks passed.` This test enforces the item's accept/verify contract:
  `runtimeHelpSurface` + `remainingHelpSurface` + `trackedOpsHelpSurface`
  assert exit 0 + `Usage:` for `--help` and `-h` on every export script,
  assert no tracked/runtime/retired artifact is rewritten, assert
  `--help/-h` never recreates retired artifacts or seeds owned client
  folders, and assert 25 escaping `--output=` probes are refused with no
  file created outside the root.
- The rest of the CI gate passes individually (24/24 scripts after the
  failure point below; all scripts before it passed inside `npm test`).

## Pre-existing, unrelated failure in the full `npm test`

`npm test` aborts at `check-retention-automation.mjs` with
`status: fail` — but that check inspects the automation at
`/home/nish/.codex/automations/tinystudio-retention-checkups/` against the
**primary checkout** `/home/nish/workspaces/products/tinystudio-in`
(`freshness.localHead == remoteMain == 6c3d83f`), where
`runs/service-engine` is empty (0 records) while 3 client folders exist.
This is live production data state on the primary repo, untouched by and
unrelated to this lane (the worktree has no `runs/service-engine` either).
Every test in `npm test` before that point passed, and every test after it
passes when run individually — including `test-retention-automation`,
`test-pages-release`, and `test-public-deploy-bundle`.

## Actions taken

- No source files changed; published `claims` (`[".lane/reports/lane1-operator-export-help-reverify-20260820.md"]`) to the lane record.
- This report is the durable deliverable, published as a docs commit + PR to close out the lane item.
