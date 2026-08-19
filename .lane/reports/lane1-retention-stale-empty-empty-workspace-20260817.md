# Lane 1 — Friday retention automation still passes on a stale, empty workspace after the closed twin

## Verdict

Fixed. The closed twin fix (PR #105, commit a0e8e784) pinned the canonical
retention workspace to the git main worktree and added a freshness check on it,
but two follow-up contracts were still open on main:

1. `canonicalMainWorktree` resolved the canonical workspace from the first
   `git worktree list --porcelain` entry, which is only conventionally the main
   worktree. A detached main worktree + twin holding `refs/heads/main` produced
   the same closed-twin outcome the original fix was supposed to eliminate
   (the twin heads the porcelain list and the gate would inspect the twin's
   empty state roots).
2. The check script still had a hollow-pass path: an aligned canonical
   workspace with `clientCount === 0` and `failures.length === 0` green-passed
   when the automation file was missing. The Friday loop is required before
   the first client is active, so a missing guard must fail loudly even at
   zero clients.

Both gaps are closed. The gate now fails closed on a stale, empty workspace
under either condition, and the regression suite covers both signals.

## Owned files

- `scripts/check-retention-automation.mjs` — fail closed when the automation
  file is missing on an empty workspace.
- `scripts/test-retention-automation.mjs` — extend the legacy no-client state
  test to assert failure-without-guard, add a no-client pass assertion, add
  the closed-twin git-dir ownership regression, and add two new stale+empty
  workspace scenarios (with and without the automation file).
- `scripts/lib/retention-preflight.mjs` — resolve the canonical workspace by
  git-dir ownership rather than porcelain list position.
- `README.md` — pin the canonical workspace resolution in the gate contract
  and call out the missing-automation failure.

## Tests

Hermetic test against the canonical gate file. All assertions pass:

```
node scripts/test-retention-automation.mjs
Retention automation applicability checks passed.
```

What the regression suite now covers:

- Stale tracking ref + stale checkout
- Failed `ls-remote` proof fails loudly
- Missing `clients` / `prospects` / `service-decisions` / `runs/service-engine`
  canonical state roots surface as failures
- Aggregate parity failure when active clients exist without decisions/evidence
- Missing automation file with active records fails
- Aligned state with active records passes
- No-client state with missing automation fails closed
- No-client state with automation in place passes
- Missing automation with active records shows aggregate parity
- GitHub Actions mode is properly skipped
- Retired phrases in the automation prompt fail
- Wrong workspace pointer fails
- Symlinked workspace passes
- Singular `workspace` field passes
- Closed-twin git-dir ownership regression
- Automation pointed at the twin fails
- Stale canonical workspace fails on staleness, not the workspace pointer
- **Stale + empty canonical workspace fails on staleness + missing roots**
- **Stale + empty + missing automation fails on staleness + missing roots +
  missing guard**

## Production behaviour

`node scripts/check-retention-automation.mjs` from the lane1 worktree against
the live main worktree (`/home/nish/workspaces/products/tinystudio-in`,
currently at `377c27e9` while `origin/main` is at `a6cd49b`) returns:

```
{
  "status": "fail",
  "automationId": "tinystudio-retention-checkups",
  "clientCount": 3,
  "freshness": {
    "localHead": "a6cd49b",
    "remoteMain": "a6cd49b"
  },
  "roots": {
    "clients": 3,
    "prospects": 50,
    "service-decisions": 0,
    "runs/service-engine": 0
  },
  "failures": [
    "aggregate parity: service-decisions count 0 is below active client count 3",
    "aggregate parity: runs/service-engine count 0 is below active client count 3",
    "retention workspace is stale: checkout is behind or diverged from remote main"
  ]
}
```

The canonical workspace is the main worktree (git-dir ownership), and the
freshness proof on it compares the live main worktree's HEAD (`377c27e9`)
against the published remote main (`a6cd49b`). The preflight running on the
agent worktree reports its own freshness (`a6cd49b` == `a6cd49b`), so the
"retention workspace is stale" failure is the canonical-workspace check, not
a duplicate of the preflight.

## Branch

- Branch: `lane1/retention-stale-empty-empty-workspace-fix`
- Base: `origin/main` (`a6cd49b`)
- Push the branch and open a PR against `main`.
- No CI gate is silenced; the gate itself is the change.

## Re-verification

Run `node scripts/test-retention-automation.mjs` against the patched tree.
The local `node --check` sweep against every script in `scripts/` also stays
clean.
