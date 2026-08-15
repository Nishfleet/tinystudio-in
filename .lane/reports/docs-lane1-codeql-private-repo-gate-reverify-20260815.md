# Lane 1 report: reverify CodeQL private-repo gate item — already resolved on main by deliberate removal (PR #122) plus fail-closed npm audit substitute (PR #129)

Lane: tinystudio-in lane 1 (worktree tinystudio-in-lane1-20260815-130532)
Date: 2026-08-15 (verified against fresh origin/main `b6d00c6`)
Outcome: **No source change possible or needed — the misleading CodeQL "SKIPPED" job was deliberately removed in PR #122 (commit `3b31706`, "remove nonfunctional CodeQL analyze job — no GHAS entitlement on this plan") because this private personal-account repo has no GitHub Advanced Security entitlement, and the fail-closed `npm audit --audit-level=high` substitute now runs inside the required `repo-checks` job (PR #129, commit `8b69101`). The re-enable path (`ENABLE_PRIVATE_CODEQL` variable + restored workflow) is documented in `.github/workflows/README.md`.**

## The one item

> [unreviewed-by-opus] CodeQL security analysis skips on every run - private-repo gate ENABLE_PRIVATE_CODEQL is unse

## Verification performed

### 1. Workflow state at origin/main HEAD (`b6d00c6`) — no CodeQL job remains, no green SKIPPED path exists

- `.github/workflows/` contains exactly four workflows: `README.md`, `codex-ci.yml`, `deploy-public-site.yml`, `live-site-check.yml`. There is **no `codeql.yml`** and no other file references CodeQL.
- `grep -r ENABLE_PRIVATE_CODEQL` matches only `.github/workflows/README.md` (the documentation of the re-enable path). The gate that caused "skips on every run" no longer exists in any executable workflow.
- `codex-ci.yml` `repo-checks` job (required for merges) runs `npm run ci` followed by a fail-closed dependency security scan: `npm audit --audit-level=high`. A high-severity advisory in the locked tree fails the required check. This is the deliberate substitute for CodeQL code scanning, documented inline in the workflow and in `.github/workflows/README.md`.

### 2. History confirms the item was resolved deliberately, not accidentally

- `93364e3` "ci(codeql): drop private-repo gate that skipped analysis on every run" — this is the exact change the item asks for; it made every run fail red instead.
- `b91f0a9` "ci(codeql): add actions:read permission so the analyze step can finish uploading".
- `55abb1d` "ci(codeql): re-gate private-repo analysis until code scanning is enabled".
- `16d9aa1` / PR #122 (`3b31706`) "chore(ci): remove nonfunctional CodeQL analyze job — no GHAS entitlement on this plan" — removed `.github/workflows/codeql.yml` (34-line deletion).
- `cbb382e` / PR #129 (`8b69101`) "ci(security): run fail-closed npm audit as the CodeQL substitute in repo-checks" — added the substitute scan.
- The settings API reports "Advanced security has not been purchased" for this repo (per README's evidence), so re-adding CodeQL now would reproduce the guaranteed-failing SARIF upload ("Code scanning is not enabled for this repository", verified on run 31508386840) — the exact failure the removal ended.

### 3. Re-enable path is documented and correct

- `.github/workflows/README.md` "Security scanning decision (2026-08-12)" documents: set `ENABLE_PRIVATE_CODEQL` repository variable to `1` (once GHAS/code scanning is provisioned, or if the repo goes public), restore a CodeQL workflow with `permissions: actions: read`, `security-events: write` and the gate `github.event.repository.private == false || vars.ENABLE_PRIVATE_CODEQL == '1'`, and prove the analyze job completes with an uploaded SARIF before trusting it. It also states the guardrail: never leave a workflow that reports green "SKIPPED" as the security signal.

### 4. Substitute gate is live in the required check

- The `repo-checks` job in `codex-ci.yml` is the required check for merges (per README: "required for merges"). `npm audit --audit-level=high` runs fail-closed inside it — if it were skipped, a merge would be blocked, so the security signal cannot silently vanish the way the old CodeQL job did.

## Why no source branch change was made

The item's underlying defect — a CodeQL job that reported green "SKIPPED" on every run because `ENABLE_PRIVATE_CODEQL` is unset — is already resolved on main: the job was removed (PR #122) and replaced with a fail-closed, always-running `npm audit` substitute (PR #129), with the re-enable path documented. Re-implementing a merged, deliberately-removed workflow would reintroduce a guaranteed-failing (or misleadingly green) job on a plan without GHAS. There is no operator fact or secret blocking this item; it is complete.

## What would unblock CodeQL itself (future, NEEDS-NISH only if desired)

1. Provision GitHub Advanced Security / code scanning on this plan (or make the repo public), then set `ENABLE_PRIVATE_CODEQL=1` as a repository variable.
2. Restore a CodeQL workflow per `.github/workflows/README.md` and prove SARIF upload succeeds.
3. The item can then be ticked on live proof; until then, `npm audit` remains the documented substitute.

## Files touched

- `.lane/reports/docs-lane1-codeql-private-repo-gate-reverify-20260815.md` — this report (unique to this lane)
- No repository source files changed.
