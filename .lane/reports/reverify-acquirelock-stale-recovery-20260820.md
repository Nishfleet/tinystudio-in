# Lane 1 — acquireLock stale-recovery re-verification (2026-08-20)

## Verdict

Already fixed on main. No code change needed. This is a re-verification of the
same item that was closed on 2026-08-15 (docs report PR #163, commit
`b3726ed`): the fix commits remain on the mainline and the contention
regression suite still passes at HEAD.

## Evidence (re-verified at HEAD `ccfbd4b` = origin/main)

- Both fix commits are ancestors of HEAD:
  - `828f434` — "fix(service): stop acquireLock stale recovery from
    double-holding the lock (#21)"
  - `abcc167` — "fix(service): make stale recovery single-winner so
    acquireLock cannot double-hold (#117)"
- `scripts/lib/service-contract.mjs` `acquireLock()` still serializes every
  acquisition through the recovery coordinator (`${path}.recovery`, an atomic
  O_EXCL claim file); takeover is a rename (single-winner), displaced live
  claims are restored without clobbering, and the critical section re-verifies
  the coordinator claim (`owns()`, line 482) before handing the lock out.
- Regression coverage in `scripts/test-service-engine.mjs`:
  - 12 rounds × 16 concurrent contenders over fresh/pre-stale locks: exactly
    1 acquirer per round (lines 1336-1353).
  - 6 rounds × 24 contenders with both lock and coordinator stale: exactly 1
    acquirer per round, no `.displaced-*`/`.stale-*` debris (lines 1355-1384).
- `node scripts/test-service-engine.mjs` passes: `{"status":"passed","checks":38}`.

## Actions taken

- No source files changed; claims published for this lane-unique report only.
- Branch pushed and PR opened carrying this re-verification report to close
  out the lane item.
