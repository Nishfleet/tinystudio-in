# AUG13-16 backlog resolution — 2026-08-19

Decision record for the inbox backlog line:

> `[tinystudio-in] priority=normal AUG13-16 BACKLOG: truthful-reversible-pages-release (kept merging main, never landed — decide), service-backup-restore-roundtrip, operator-checks-strict.`

## Decision: all three items are LANDED in `main`

Each backlog item was believed unlanded, but every one is already present on
`main`. No code change is required; the correct action is to record the
verification and close the items. The only item flagged for a decision —
`truthful-reversible-pages-release` — is decided: **it landed, via PR #130**.

| Backlog item | PR | Merge commit | Date | Landed evidence |
| --- | --- | --- | --- | --- |
| `truthful-reversible-pages-release` | #130 | `ea9eab2` | 2026-08-14 | `scripts/test-pages-release.mjs` guards the release-lane contract (fail truthfully on missing credentials, capture provable rollback target before upload, restore the previous production Pages deployment and re-verify on failed live acceptance). |
| `service-backup-restore-roundtrip` | #132 | `4a7f442` | 2026-08-13 | `service-state-backup.mjs` gains a `restore` mode (validate like verify, refuse pre-existing canonical roots, stage beside target, atomic rename swap with rollback); roundtrip covered in `scripts/test-service-engine.mjs`. |
| `operator-checks-strict` | #133 | `c617364` | 2026-08-13 | Named operator/readiness npm commands (`client:check`, `prospect:check`, `send:setup`, `prospect:site-check`, `market:parity`, `market:proof-check`) are wired `--strict` so blocked readiness fails loudly; report-only behavior preserved under explicitly named `:advisory` aliases; fixture-driven detector in `scripts/test-operator-check-strictness.mjs` added to `npm run ci` / `npm run test`. |

## Verification

- Ancestry: each merge commit is an ancestor of `refs/heads/main` (bounded local
  check against a fetched `origin/main`; `origin/main` == remote
  `refs/heads/main` at `7e268b2`).
- Files present on `main`: `scripts/test-pages-release.mjs`,
  `scripts/test-operator-check-strictness.mjs`, and the `restore` function in
  `scripts/service-state-backup.mjs`; `package.json` wires the six strict
  commands and their `:advisory` aliases.
- Smoke: `node scripts/test-pages-release.mjs` → **38 checks, 0 failures** (the
  single most relevant test for the decision item).

## Why the "kept merging main, never landed" note is stale

`fix/truthful-reversible-pages-release` repeatedly merged `origin/main` into the
branch, so the branch looked perpetually unreconciled. In fact PR #130 merged the
branch tip into `main` on 2026-08-14 and the branch tip is an ancestor of
`main`; no branch-unique commit remains outside `main`.

## Outcome

All three backlog items are done and require no further work. The stale working
branches (`fix/truthful-reversible-pages-release`,
`fix/service-backup-restore-roundtrip`, `fix/operator-checks-strict-20260813`,
`fix/operator-checks-strict-20260813b`) are superseded and can be closed.
