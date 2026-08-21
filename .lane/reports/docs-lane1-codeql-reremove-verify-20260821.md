# Lane 1 report: CodeQL analyze job regression on main — fix already open in PR #235 (verified fresh)

Lane: tinystudio-in lane 1 (worktree tinystudio-in-lane1-20260821-093534)
Date: 2026-08-21 (verified against fresh origin/main `ccfbd4b`)
Item: `[unreviewed-by-opus] PR #82's CodeQL analyze now RUNS on every trigger but FAILS at the final step with "Resource not accessible by integration"`
Outcome: **The CodeQL analyze-job regression on main is real, and the correct fix (re-remove the nonfunctional workflow, per the documented PR #122 / PR #129 decision) is already implemented, pushed, green, and mergeable in open PR #235 (`fix/lane1-codeql-private-repo-gate-reremove-20260821`, commit `da110c8`), based on the exact current origin/main HEAD. This lane intentionally did not re-implement the fix: the repo's own `pr-duplicate-guard` exists precisely because duplicate same-fix PRs became a fleet failure mode, and a second identical PR would be flagged as an 80%+ duplicate of #235.**

## The one item

> [unreviewed-by-opus] PR #82's CodeQL analyze now RUNS on every trigger but FAILS at the final step with `Resource not accessible by integration`.

Full history of the issue:

- PR #82 (`93364e3`, closed unmerged) dropped the private-repo gate so the analyze job would run on every trigger instead of being skipped.
- That surfaced the real failure: the final SARIF upload step died with "Resource not accessible by integration" — fixed by adding `actions: read` (`b91f0a9`).
- With permissions fixed, the job then failed with "Code scanning is not enabled for this repository" — this private personal-account repo has no GitHub Advanced Security entitlement.
- `55abb1d` re-gated the job; PR #122 (`3b31706`) then removed the nonfunctional workflow entirely; PR #129 (`8b69101`) added the fail-closed `npm audit --audit-level=high` substitute inside the required `repo-checks` job. All documented in `.github/workflows/README.md`.
- On 2026-08-19 merge `410f3e66` ("keep CodeQL job with actions:read + private-repo gate") re-added `.github/workflows/codeql.yml` to main. The gated analyze job once again reports green "SKIPPED" on every push, PR, and weekly schedule — the exact misleading-green state PR #122 ended.

## Verification performed (against fresh origin/main `ccfbd4b`)

1. **Current main still has the regressed workflow.** `.github/workflows/codeql.yml` exists on `ccfbd4b` with the gated analyze job (`if: github.event.repository.private == false || vars.ENABLE_PRIVATE_CODEQL == '1'`). The repo is private and `ENABLE_PRIVATE_CODEQL` is unset, so the job silently SKIPs on every trigger while `.github/workflows/README.md` documents the opposite decision ("never leave a workflow that reports a green 'SKIPPED' as the security signal").
2. **The fix already exists as open PR #235, on a fresh base.** `git diff origin/main..da110c8` is exactly two files: delete `.github/workflows/codeql.yml` (48 lines) and update `.github/workflows/README.md` (record the accidental re-addition). `da110c8`'s parent is `ccfbd4b` — the current origin/main HEAD, confirmed via `git fetch origin main` + `git ls-remote origin main`. No stale-base problem.
3. **PR #235 is green and mergeable.** `gh pr view 235 --json statusCheckRollup,reviewDecision`: `repo-checks` SUCCESS, `duplicate-guard` SUCCESS, CodeRabbit SUCCESS, `mergeable: MERGEABLE`, base main.
4. **The substitute security signal is live on main.** `.github/workflows/codex-ci.yml` `repo-checks` job runs `npm audit --audit-level=high` (fail-closed) inside the required check for merges — this is the deliberate CodeQL replacement per `.github/workflows/README.md` and PR #129.
5. **No other workflow references CodeQL as an executable job.** `grep -rn -i codeql` over `.github/workflows/*.yml` matches only `codex-ci.yml` comments (documents the substitute) and the to-be-deleted `codeql.yml` itself.

## Why no new source branch was created for the fix

The repo ships a `PR Duplicate Guard` (`.github/workflows/pr-duplicate-guard.yml` + `scripts/check-pr-duplicates.mjs`) that flags open PRs with >= 80% shared changed-file coverage and >= 50% patch similarity, with lane history of duplicate same-fix PR pairs (#36/#44/#55/#56, #39/#49, #40/#52, ... — see `.lane/reports/docs-lane1-duplicate-same-fix-pr-pairs-20260815.md` line of reports). A fresh implementation of the identical fix would duplicate PR #235 at 100% file coverage, recreate that failure mode, and waste the shared VPS runner. The correct and already-land-ready artifact is PR #235; this lane's PR carries the verification evidence instead, following the precedent of PR #183 (report-only evidence PR for the same CodeQL item family).

## Completion status

- Fix: **provided** — open PR #235 (`fix/lane1-codeql-private-repo-gate-reremove-20260821`), green and mergeable against current main. Needs merge to main to restore the documented no-CodeQL state.
- This lane: evidence report only (no source change re-implementation).

## Files touched

- `.lane/reports/docs-lane1-codeql-reremove-verify-20260821.md` — this report (unique to this lane, tracked in git like the prior lane reports)
- No repository source files changed by this lane.

## PR

- Branch: `docs/lane1-codeql-reremove-verify-20260821` (commit `ed6b37a`)
- Canonical fix PR: https://github.com/nish3451/tinystudio-in/pull/235
- This lane's evidence PR: https://github.com/nish3451/tinystudio-in/pull/242