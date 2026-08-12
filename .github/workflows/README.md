# CI workflows

This directory holds the repository's GitHub Actions workflows.

## Security scanning decision (2026-08-12) — CodeQL removed, npm audit is the substitute

**Decision.** CodeQL code scanning is deliberately NOT configured in this
repository. The nonfunctional CodeQL analyze job was removed in PR #122
(commit `3b31706`, "remove nonfunctional CodeQL analyze job — no GHAS
entitlement on this plan"). The free, always-running dependency security scan
in `codex-ci.yml` (`npm audit --audit-level=high`, inside the required
`repo-checks` job) is the substitute security signal.

**Why CodeQL cannot run here.** This is a private personal-account repository
without GitHub Advanced Security (GHAS). Code scanning (and SARIF upload) is
an Enterprise/org-with-GHAS feature; the GitHub settings API reports
"Advanced security has not been purchased" for this repo. Evidence:

- `analyze javascript-typescript` was gated on
  `github.event.repository.private == false || vars.ENABLE_PRIVATE_CODEQL == '1'`.
  The repo is private and `ENABLE_PRIVATE_CODEQL` is unset, so the job
  reported green "SKIPPED" on every pull request and main push with zero
  scanning actually performed.
- Dropping the gate (commit `93364e3`) made every run fail red instead: the
  final SARIF upload rejected with "Code scanning is not enabled for this
  repository" (verified on run 31508386840 after the `actions: read` fix in
  commit `b91f0a9`).

Ungated CodeQL wastes the shared VPS runner on guaranteed-failing runs; the
gated version produced a misleading green "SKIPPED" with no security signal.
Removal (PR #122) ended both failure modes.

**What runs instead.** The `repo-checks` job (required for merges) now runs
`npm audit --audit-level=high` after `npm run ci`. It is a free, always-on,
fail-closed scan of the locked dependency tree: a high-severity advisory
fails the required check. It covers dependency vulnerabilities; it does not
cover source-code semantic analysis the way CodeQL would.

**Re-enable path.** When GHAS/code scanning is provisioned on this plan (or
if the repository ever goes public), set the `ENABLE_PRIVATE_CODEQL`
repository variable to `1`, restore a CodeQL workflow equivalent to the
removed `.github/workflows/codeql.yml` (permissions `actions: read`,
`security-events: write`; gate condition
`github.event.repository.private == false || vars.ENABLE_PRIVATE_CODEQL == '1'`),
and prove the analyze job completes with an uploaded SARIF before trusting
it. If CodeQL must be disabled again, remove the workflow or unset the
variable — never leave a workflow that reports a green "SKIPPED" as the
security signal.
