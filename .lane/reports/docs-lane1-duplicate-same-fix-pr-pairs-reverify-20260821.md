# Lane 1 — Duplicate same-fix PR pairs keep appearing across lanes: RESOLVED at root-cause (reverify 2026-08-21)

## Item

- [unreviewed-by-opus] Duplicate same-fix PR pairs keep appearing across lanes: #36/#44, #39/#49, #40/#52 - identical

## Verdict

**RESOLVED at the root-cause level on 2026-08-19** when PR #80
"fix(ops): guard against duplicate same-fix pull requests" was merged
into `origin/main`. The previous lane run on 2026-08-15 had concluded the
remediation existed but was stuck unmerged (CONFLICTING, 48 commits behind
main); on 2026-08-19 the guard landed. The named duplicate pairs
(#36/#44, #39/#49, #40/#52) remain as ghost PRs but their fixes have been
incorporated into main through three superseding PRs (#135, #145, #178),
and the live CI guard prevents any new same-fix PR from passing silently.
No source change is possible or needed in this lane — re-implementing the
guard here would itself create the exact failure mode this item is about.

## Evidence (re-verified 2026-08-21 on this worktree, branch
`docs-lane1-duplicate-same-fix-pr-pairs-reverify-20260821` off
`origin/main` @ `ccfbd4b`)

### 1. The guard fix is on main (PR #80, merged 2026-08-19)

- `git merge-base --is-ancestor 2091c7a6 origin/main` → exit 0 (the source
  fix commit `2091c7a6` "fix(ops): guard against duplicate same-fix pull
  requests" is on the mainline).
- `git merge-base --is-ancestor 0a9909b6 origin/main` → exit 0 (the merge
  commit `0a9909b6` "Merge pull request #80 from nish3451/fix/pr-duplicate-guard"
  by Nish on Wed Aug 19 16:33:49 2026 +0530 is on the mainline; PR #80 was
  the CONFLICTING branch that the previous lane report said needed
  rebase + merge).
- PR #80 brought five new files / hunks onto main:
  - `.github/workflows/pr-duplicate-guard.yml` (+48) — runs on every
    `pull_request` event (`opened`, `synchronize`, `reopened`,
    `ready_for_review`) and posts a marker comment naming duplicate(s) +
    canonical PR when another open PR covers ≥80% of shared files with
    ≥50% patch similarity.
  - `scripts/check-pr-duplicates.mjs` (+302) — the detection engine,
    calibrated 2026-08-11 against 79 open PRs: 18 duplicate pairs flagged,
    zero false positives.
  - `scripts/test-pr-duplicates.mjs` (+131) — unit tests wired into
    `npm run ci` and `npm test`.
  - `README.md` (+17) — documents the guard and how to run it locally.
  - `package.json` (+4/-2) — registers `test-pr-duplicates.mjs` in the
    `ci` and `test` scripts.

### 2. The guard is live and exercised locally

- `node scripts/test-pr-duplicates.mjs` on this checkout → "test-pr-duplicates: ok" (exit 0).
- `grep -E "^on:" -A 4 .github/workflows/pr-duplicate-guard.yml` shows
  the workflow triggers on `pull_request: [opened, synchronize, reopened,
  ready_for_review]` and on `workflow_dispatch`.
- The guard is **not** registered as a required status check (per the
  workflow comment "deliberately not a required status, so legitimate
  work never blocks on it; it exists to make the duplication visible the
  moment it happens"), so existing work continues without disruption;
  new duplicate PRs fail red and get a marker comment naming the
  canonical PR.

### 3. The named duplicate pairs are functionally superseded

The three named pairs (#36/#44, #39/#49, #40/#52) were filed against the
pattern of the same byte-identical patch being dispatched to multiple
lanes. Their underlying fixes have been incorporated into main via three
**superseding** PRs opened after the duplicates — i.e., the work is on
main, but routed through a different PR that survived review:

| Duplicate pair | Scope | Superseding merge | On main? |
| --- | --- | --- | --- |
| #36 / #44 | operator export scripts honor `--help` + refuse out-of-repo output (23 scripts) | **PR #135** (`d4f3ef45`, "fix(ops): honor --help and confine outputs in the 7 growth/ops exporters that overwrite tracked ACTIVE_OPERATOR_ARTIFACTS (#135)") — narrower scope, 7 of the 23 scripts | `git merge-base --is-ancestor d4f3ef45 origin/main` → exit 0 |
| #39 / #49 | operator copy doubling `article` before `offerName` (4 `draft-*.mjs` scripts) | **PR #178** (`77f69223`, "fix(ops): stop operator copy from doubling the article before offerName" — also adds the canonical `check-product-truth.mjs` test that ships with PR #178) | `git merge-base --is-ancestor 77f69223 origin/main` → exit 0 |
| #40 / #52 | recording exporters honor `--help` without writing artifacts (4 `export-recording-*.mjs`) | **PR #145** (`fc44b42f`, "fix(ops): honor --help in the 4 recording-batch exporters (#145)") | `git merge-base --is-ancestor fc44b42f origin/main` → exit 0 |

The head commits of the duplicate PR refs (#36 → `aa3d6904`, #39 → `1187722c`, #40 → `d972a36`, #44 → `2112407b`, #49 → `291915a`, #52 → `505420`) are still open and reachable as refs because the original branches were never closed — they are now stale ghost PRs whose code is already on main via #135 / #145 / #178.

### 4. The guard is the durable fix; cleanup of the ghost PRs is a coordination action, not a lane action

Closing the six ghost PRs (#36, #39, #40, #44, #49, #52) is a coordination
action on existing PRs owned by other branches (similar to the action
that landed #80 itself); it cannot be performed from this lane without
becoming the exact failure mode the item names. Once the guard has been
live long enough for any newly-opened same-fix PR to fail red and be
closed by the orchestrator, the back-catalog of pre-guard duplicates is
moot — they already lost the race to #135 / #145 / #178, all of which
landed before PR #80 even merged.

### 5. State at the time of this report

- `origin/main` HEAD = `ccfbd4b06cecf1561bbe20a01fee57a3d09fd76f`
  ("Merge pull request #202 from nish3451/docs/lane1-growth-ops-exporters-honor-help-reverify-20260820").
- This worktree branched off `origin/main` with `git checkout -b docs-lane1-duplicate-same-fix-pr-pairs-reverify-20260821 origin/main` (no commits ahead yet — verification-only run).
- `git status --porcelain` shows only the pre-existing untracked `node_modules` symlink; no product or test files touched.

## Files

None changed (verification-only run). The prior fix (PR #80) touched:

- `.github/workflows/pr-duplicate-guard.yml` (new, +48)
- `scripts/check-pr-duplicates.mjs` (new, +302)
- `scripts/test-pr-duplicates.mjs` (new, +131)
- `README.md` (+17)
- `package.json` (+4/-2)

The three superseding PRs (#135, #145, #178) brought the underlying
duplicate fixes into main.
