# Lane 1 — acquireLock stale-recovery double-hold item

## Verdict

Already fixed on main. No code change needed. The overseer flag for this item is
dated 2026-08-09 01:0x IST; the fix landed later the same morning:

- `828f434` (2026-08-09 03:01 IST) — "fix(service): stop acquireLock stale recovery
  from double-holding the lock (#21)"
- `abcc167` (2026-08-13) — "fix(service): make stale recovery single-winner so
  acquireLock cannot double-hold (#117)" (hardening, on HEAD)

## Evidence

- `scripts/lib/service-contract.mjs` `acquireLock()` now serializes acquisition
  through a recovery coordinator (`${path}.recovery`, an atomic O_EXCL claim
  file). Takeover is a rename (single-winner), displaced live claims are restored
  without clobbering, and the critical section re-verifies the coordinator claim
  (`owns()`) before handing the lock out.
- Regression tests in `scripts/test-service-engine.mjs`:
  - 12 rounds × 16 concurrent contenders over stale locks: exactly 1 acquirer
    per round (lines 1336-1353).
  - 6 rounds × 24 contenders with both lock and coordinator stale: exactly 1
    acquirer per round, no `.displaced-*`/`.stale-*` debris (lines 1355-1384).
- `node scripts/test-service-engine.mjs` passes: `{"status":"passed","checks":38}`.

## Actions taken

- No source files changed; published empty `claims` to the lane record.
- No branch pushed and no PR opened: the item was already resolved on main and
  there is nothing coherent to land.

## Re-verification (2026-08-15 run)

Re-verified against the live worktree: both fix commits are ancestors of HEAD
and of origin/main; the coordinator code and both regression tests are present;
`node scripts/test-service-engine.mjs` still passes 38/38 checks. Same verdict:
already fixed, nothing to land.

## Re-verification (2026-08-15 run, lane worker)

Re-ran the full check against the live worktree at HEAD `8435466` (= origin/main):

- `git merge-base --is-ancestor 828f434 HEAD` and `git merge-base --is-ancestor
  abcc167 HEAD` both succeed — the fix is on the mainline.
- `acquireRecoveryCoordinator` (scripts/lib/service-contract.mjs:354) serializes
  every acquisition through an atomic O_EXCL claim file (`${path}.recovery`);
  takeover is a rename (single-winner), displaced live claims are restored via
  hard link without clobbering, and the critical section re-verifies the claim
  (`owns()`, service-contract.mjs:482) before handing the lock out.
- Regression coverage in scripts/test-service-engine.mjs: 12 rounds x 16
  concurrent contenders over stale locks, and 6 rounds x 24 contenders with
  both lock and coordinator stale — exactly 1 acquirer per round, no
  `.displaced-*`/`.stale-*` debris.
- `node scripts/test-service-engine.mjs` passes: `{"status":"passed","checks":38}`.

Same verdict: already fixed on main, nothing to land. This report is published
as a docs commit + PR to close out the lane item.
