# Lane 1 report: duplicate same-fix PR pairs keep appearing across lanes

Lane: tinystudio-in lane 1 (worktree tinystudio-in-lane1-20260815-142533)
Date: 2026-08-15
Branch: `docs-lane1-duplicate-same-fix-pr-pairs-20260815`
Outcome: **The duplication is real, persistent, and already has a written fix that is stuck unmerged. PR #80 "fix(ops): guard against duplicate same-fix pull requests" (a duplicate-PR detection script + CI guard workflow, CI-green) has been CONFLICTING since 2026-08-13 and never rebased; meanwhile the same-fix duplication has continued — the copy-doubling fix now has five open PRs (#39, #49, #144, #178, plus #94 partial) and the recording-exporter help fix has two (#40, #52). No repo code change in this lane can unblock the guard; the blocker is a coordination/merge action (rebased + merged #80), which no single lane can perform safely.**

## The one item

> [unreviewed-by-opus] Duplicate same-fix PR pairs keep appearing across lanes: #36/#44, #39/#49, #40/#52 - identical

## What the item asks

Investigate why duplicate same-fix PRs keep appearing and resolve the duplication.

## Evidence: the duplication is real and wider than the item states

### 1. The three named pairs (verified live via `gh`)

| Pair | Same fix | Diff comparison |
| --- | --- | --- |
| #36 / #44 | operator export `--help` + out-of-repo output refusal | Same 23 files; #36 (2026-08-09) adds a shared `scripts/lib/operator-cli.mjs` helper + 55-line test; #44 (2026-08-10) is a byte-identical patch on a different base (`git diff #36 #44` = only index hashes/line offsets) |
| #39 / #49 | operator copy doubling "article" before `offerName` | Byte-identical 1-line changes to 4 `draft-*.mjs` scripts (`git diff #39 #49` = empty) |
| #40 / #52 | recording exporters honor `--help` without writing artifacts | Same 5 files; byte-identical patch, only base-commit offsets differ |

All six are OPEN, authored by nish3451, and none is merged. The plain branches (`fix/operator-export-cli-help`, `fix/operator-copy-offername-article`, `fix/recording-exporter-cli-help`) were created 2026-08-09/10; the `-lane1`/`-lane2` variants were created 2026-08-10/11 — the same backlog finding was dispatched to multiple lanes independently.

### 2. The duplication has continued since the item was filed

- The copy-doubling fix now has **five** open PRs: #39 (08-09), #49 (08-10), #144 `fix/operator-copy-offername-article-lane1-20260814` (08-14, CLEAN), #178 `fix/operator-copy-offername-article-lane1-20260815` (08-15, BLOCKED), plus partial #94. All titled "fix(ops): stop operator copy from doubling the article before offerName".
- Recording-exporter `--help` duplicates #40/#52 remain open even though the fix was **already merged on main** via PR #145 (`fc44b42`, 2026-08-14).
- Growth/ops exporter `--help` duplicates #36/#44 remain open even though that fix was **already merged on main** via PR #135 (`d4f3ef4`, 2026-08-13).

So the pattern the item names is not historical: fresh duplicate PRs were opened on 08-14 and 08-15, days after the underlying fixes were merged.

### 3. A fix already exists and is stuck unmerged: PR #80

PR #80 "fix(ops): guard against duplicate same-fix pull requests" (`fix/pr-duplicate-guard`) was opened 2026-08-11 and is the direct, already-written remediation:

- `scripts/check-pr-duplicates.mjs` — compares a PR's diff against every other open PR (shared changed-file coverage >= 0.8 AND patch similarity >= 0.5 on shared files ⇒ same-fix duplicate). Calibrated on 2026-08-11 against all 79 open PRs: 18 duplicate pairs detected, zero false positives.
- `.github/workflows/pr-duplicate-guard.yml` — runs on every PR event, fails loudly and posts a marker comment naming the duplicate(s) and the canonical PR. Informational (not a required status), so it never blocks legitimate work.
- `scripts/test-pr-duplicates.mjs` — unit tests wired into `npm ci` / `npm test`.
- Verified: `npm run ci` 19 checks + test-pr-duplicates, 0 failures; live run for #44 flags #36 (similarity 100%), #55 (55%), #56 (54%); live run for #59 reports no duplicates.

**Why it is stuck:** `gh pr view 80` reports `mergeStateStatus: DIRTY`, `mergeable: CONFLICTING`. The branch last merged main on 2026-08-13 (`f22562d`, merge-base `a406256`); main has since advanced 48 commits and the guard's `README.md` / `package.json` hunks conflict. Its checks are green (`repo-checks` SUCCESS, `duplicate-guard` SUCCESS) but nothing has rebased it. With the fleet's auto-ship only merging docs/tests-only safe changes and code PRs riding the flagship review ladder (see sibling report `docs-lane1-merge-gate-frozen-20260815.md`), a CONFLICTING code PR sits unmerged indefinitely.

## Why no product code change was made in this lane

The remediation (duplicate-PR guard) is **already fully written in PR #80** — re-implementing it here would itself create another duplicate-same-fix PR, the exact failure mode this item is about. What PR #80 needs is a rebase onto current main and a merge, which is a coordination action on an existing PR owned by another branch; creating a competing implementation in this lane would worsen the problem.

## What unblocks the item

1. **Rebase `fix/pr-duplicate-guard` onto current `origin/main`** (48 commits behind; README/package.json hunks conflict) and push — PR #80 then goes CLEAN.
2. **Merge PR #80** through the normal flagship review ladder (it is a code PR; the fleet gate does not auto-merge code).
3. Once the guard is live, the next duplicate PR fails red with the canonical PR number and a close/consolidate instruction, so the orchestrator closes it instead of letting it sit.
4. Optionally: close/consolidate the open duplicate clusters — #39/#49/#144/#178 (canonical one to keep, likely the CLEAN #144), #40/#52 (superseded by merged PR #145), #36/#44 (superseded by merged PR #135).

## Files touched

- `/home/nish/workspaces/agent-state/lanes/tinystudio-in/lane-1.json` — `claims` list only (`.lane/reports/docs-lane1-duplicate-same-fix-pr-pairs-20260815.md`); no other field changed.
- `.lane/reports/docs-lane1-duplicate-same-fix-pr-pairs-20260815.md` — this report (unique to this lane).
- No product code or config files changed.
