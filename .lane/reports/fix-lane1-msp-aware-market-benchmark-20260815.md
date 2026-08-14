# Lane 1 report: refresh the generic May market benchmark with current MSP-aware audit alternatives

Lane: tinystudio-in lane 1 (worktree tinystudio-in-lane1-20260815-010032)
Date: 2026-08-15
Outcome: **No source change needed — the benchmark refresh with current MSP-aware audit alternatives is already merged on main (PR #138). The item is complete in source; no further repo edit is possible or required.**

## The one item

> [unreviewed-by-opus] Refresh the generic May market benchmark with current MSP-aware audit alternatives before usi...

## What the item asks

The market parity benchmark (dated 2026-05-29 era, "generic May market benchmark") was judging TinyStudio only against generic CRO / full-service agencies. The item asks to refresh it with current MSP-aware audit and marketing alternatives aimed at the same founder-led Managed IT, MSP, and cybersecurity audience.

## Verification performed

### 1. The refresh is already merged on main

- Commit `a8d4da2` "chore(strategy): refresh market benchmark with current MSP-aware audit alternatives (#138)", merged 2026-08-14.
- Verified: `git merge-base --is-ancestor a8d4da2 origin/main` = yes. Worktree HEAD == `8435466`, on top of the merged refresh.
- PR #138 changed exactly the owned files:
  - `docs/strategy/market-parity-benchmark-2026.md` (+17)
  - `growth-brain/ops/competitive-proof-matrix.md` (+17, identical twin)
  - `growth-brain/ops/competitive-proof-matrix.html` (regenerated)
  - `scripts/export-market-benchmark.mjs` (+49, generator source of truth)

### 2. Current main carries the MSP-aware rows and anchors

Parsed `origin/main:docs/strategy/market-parity-benchmark-2026.md`:

- `Market anchors last checked: 2026-08-13` (bumped from 2026-05-29).
- Four MSP-aware matrix rows present:
  - MSP marketing agency audits — $549-$25k/mo; entry $549-$3k/mo; Tech Pro flat $3k/mo
  - MSP website/SEO audit packages — $300-$1.8k/mo; audit included
  - Free MSP marketing/authority audits — free; audit-led entry
  - MSP marketing subscription toolkits — free trial; $199/mo
- Anchors include Tech Pro Marketing, 100Signals August 2026 comparison, JoomConnect, Managed Prospecting System, MSP Marketing Edge, with source URLs in the Sources section.

### 3. Earlier lane branches carried identical content and were superseded

- `origin/chore/refresh-msp-aware-market-benchmark-lane1` and `origin/chore/refresh-msp-aware-market-benchmark-lane1-worker` hold the same refresh (commits `194a5d1`, `4ce0d22`, `b654898`); their diffs against origin/main are empty for these files — PR #138 landed the same change on main.

## Why no new branch/PR was opened

The packet's fallback: "or by reporting plainly why the item cannot be done." The item's source work is already merged (PR #138); the benchmark on main is the current August-2026 version with MSP-aware alternatives, anchors last checked 2026-08-13. Creating a duplicate PR would touch no owned files and deliver nothing. This matches sibling-lane precedent (`b3726ed` "report acquireLock stale-recovery item — already fixed on main"): report the already-fixed state instead of duplicating merged work.

## Files touched

- `/home/nish/workspaces/agent-state/lanes/tinystudio-in/lane-1.json` — claims list (set to this report path; no repo source files claimed)
- `.lane/reports/fix-lane1-msp-aware-market-benchmark-20260815.md` — this report
- No repository source files changed.
