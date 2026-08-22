# Lane 1 report: reverify the generic May market benchmark refresh with current MSP-aware audit alternatives

Lane: tinystudio-in lane 1 (worktree `tinystudio-in-lane1-20260820-214031`)
Date: 2026-08-20
Branch: `docs/lane1-msp-aware-market-benchmark-reverify-20260820`
Outcome: **No source change needed — the refresh with current MSP-aware audit alternatives is already merged on main (PR #138, commit `a8d4da2c`, merged 2026-08-14). The current `docs/strategy/market-parity-benchmark-2026.md` on `origin/main` already carries the four MSP-aware matrix rows, the bumped anchor date `2026-08-13`, and the four source URLs. Creating a duplicate PR would touch no owned files and deliver nothing — same already-fixed verdict as the 2026-08-15 lane report, re-confirmed against fresh `origin/main` today.**

## The one item

> [unreviewed-by-opus] Refresh the generic May market benchmark with current MSP-aware audit alternatives before usi...

## What the item asks

The market parity benchmark was previously dated 2026-05-29 era and judged TinyStudio only against generic CRO and full-service agencies. The item asks to refresh it with current (2026-08 era) MSP-aware audit and marketing alternatives aimed at the same founder-led Managed IT, MSP, and cybersecurity audience.

## Verification performed (2026-08-20 from this checkout, branched off fresh `origin/main` = `161b27fc`)

### 1. The refresh is already merged on `origin/main`

- Commit `a8d4da2c` "chore(strategy): refresh market benchmark with current MSP-aware audit alternatives (#138)", merged 2026-08-14.
- Verified locally: `git merge-base --is-ancestor a8d4da2c origin/main` = yes.
- Worktree HEAD on this branch = `161b27fc` (= `origin/main`).
- PR #138 changed exactly the owned files:
  - `docs/strategy/market-parity-benchmark-2026.md` (+17)
  - `growth-brain/ops/competitive-proof-matrix.md` (+17, identical twin)
  - `growth-brain/ops/competitive-proof-matrix.html` (regenerated)
  - `scripts/export-market-benchmark.mjs` (+49, generator source of truth)

### 2. Current `origin/main` carries the MSP-aware rows and anchors

Parsed `origin/main:docs/strategy/market-parity-benchmark-2026.md`:

- `Market anchors last checked: 2026-08-13` (bumped from 2026-05-29 in PR #138).
- Four MSP-aware matrix rows present:
  - MSP marketing agency audits — $549-$25k/mo; entry $549-$3k/mo; Tech Pro flat $3k/mo.
  - MSP website/SEO audit packages — $300-$1.8k/mo; audit included.
  - Free MSP marketing/authority audits — free; audit-led entry.
  - MSP marketing subscription toolkits — free trial; $199/mo.
- Source URLs in the Sources section: 100Signals 2026 MSP agency comparison, JoomConnect MSP SEO, Managed Prospecting System news, MSP Marketing Edge pricing.
- Purpose line updated to include "MSP-aware audit and marketing offers".
- Current Position line updated to add the MSP-aware alternative as a sharper comparison axis.

### 3. The export script is the source of truth and is up to date

`scripts/export-market-benchmark.mjs` carries the four new alternative entries and the bumped `MARKET_ANCHORS_LAST_CHECKED = "2026-08-13"` constant. The exported artifacts (`growth-brain/ops/competitive-proof-matrix.md` and `.html`) match the hand-edited `docs/strategy/market-parity-benchmark-2026.md`; the script regenerates them on every `npm run market:benchmark` invocation.

### 4. Prior lane branches and reports for this same item

- `.lane/reports/fix-lane1-msp-aware-market-benchmark-20260815.md` (2026-08-15) — same already-merged verdict.
- Earlier lane branches carried the same refresh and were superseded: `origin/chore/refresh-msp-aware-market-benchmark-lane1`, `origin/chore/refresh-msp-aware-market-benchmark-lane1-worker`, `origin/chore/refresh-msp-aware-market-benchmark` — diffs against current `origin/main` for the four owned files are empty (PR #138 already landed the change).

### 5. Anchor age check (informational)

The `Market anchors last checked: 2026-08-13` is now 7 days old. None of the four MSP-aware alternatives carry "as of" date sensitivity that would require a refresh inside that window:

- 100Signals comparison is dated August 2026 and is a one-shot survey article, not a recurring pricing page.
- JoomConnect, MSP Marketing Edge, and Managed Prospecting System are stable product/pricing pages whose price points did not move this week (verified via the same source URLs that PR #138 cited, which are still live).
- Tech Pro Marketing's flat $3k/mo inbound retainer is unchanged.

A future lane or a human-triggered refresh can bump the date when any of these move; that is a follow-up item, not this one. The current item — refresh the generic May benchmark with current MSP-aware audit alternatives — is satisfied by PR #138.

## Why no new branch was opened for source work

The packet's fallback: "or by reporting plainly why the item cannot be done." The item's source work is already merged (PR #138); the benchmark on main is the current August-2026 version with MSP-aware alternatives, anchors last checked 2026-08-13. Opening a duplicate PR would touch no owned files and deliver nothing. This matches sibling-lane precedent (`lane-1-acquirelock-stale-recovery.md`, `lane1-marketplace-presence-already-prepared-20260815.md`, `fix-lane1-msp-aware-market-benchmark-20260815.md`): report the already-fixed state instead of duplicating merged work.

## Files touched

- `/home/nish/workspaces/agent-state/lanes/tinystudio-in/lane-1.json` — claims list (set to this report path; no repo source files claimed).
- `.lane/reports/docs-lane1-msp-aware-market-benchmark-reverify-20260820.md` — this report.
- No repository source files changed.
