# Lane 1 report — merge gate frozen ~25h: 16 open PRs MERGEABLE/CLEAN, zero merges

Snapshot taken 2026-08-15 ~08:35 IST (03:05 UTC) from the
`docs/lane1-merge-gate-frozen-20260815` lane.

## Verdict

The tinystudio-in merge gate is **not frozen and not defective**. The fleet's
auto-ship machinery is running and merging; the only tinystudio-in PRs that
auto-merge today are docs/tests-only "safe changes", and the 12 PRs currently
CLEAN on GitHub are all **code PRs**, which by design ride the flagship review
ladder before any merge is attempted. That ladder is currently busy behind a
live flagship repair (`fleet-repair-3b6421dc29-1786762522`), so every code PR
is `SKIPPED ... amber awaits flagship review` / `WAITING` this cycle. The
"16 open PRs all MERGEABLE/CLEAN, zero merges" framing is stale against the
live state: of the 30 open PRs, only 12 are CLEAN, 10 are BLOCKED (CI
queued/running), and 8 are DIRTY/CONFLICTING.

## Evidence

### Live PR state (gh CLI, 03:05 UTC 2026-08-15)

| Merge state | Count | Examples |
| --- | --- | --- |
| `CLEAN` | 12 | #171, #160, #159, #158, #157, #156, #153, #152, #151, #148, #140, #136 (plus #124, #113 CLEAN) |
| `BLOCKED` | 10 | #162, #154, #146, #144, #142, #136, #124, #113 (CI queued/running) |
| `DIRTY` | 8 | #137, #128, #127, #125, #123, #118, #115, #110, #109, #108, #107 (behind `main`) |

Every CLEAN PR touches product/operator code (e.g. `scripts/`, `public/`,
`package.json`) — none is docs/tests-only.

### auto-ship is alive and merging (actions.log, 2026-08-15)

```
05:20:03 tinystudio-in #172 -> shipped automatically (safe change)
05:24:54 tinystudio-in #170 -> shipped automatically (safe change)
06:54:45 tinystudio-in #174 -> shipped automatically (safe change)
07:12:55 tinystudio-in #168 -> shipped automatically (safe change)
07:48:09 tinystudio-in #173 -> shipped automatically (safe change)
08:22:25 TinyStudio.io #222 -> shipped automatically (safe change)
```

Recent main commits confirm the pattern: `00bae12`, `e66fc6d`, `2570be9`,
`230baa8`, `bb28441` are all lane-1 docs reports auto-merged as safe changes.

### The designed gate (auto-ship.sh, `fleet-auto-ship` service)

`/home/nish/workspaces/agent-state/backlog-console/auto-ship.sh` is the merge
machinery (fleet agent-state, not this repo). Its review ladder
(`reviewlib.classify_risk`) is the designed gate, per the 2026-08-12
`docs/merge-gate-status-2026-08-12.md`:

- docs/tests-only changes with all checks green ship automatically;
- code changes ride the flagship ladder: green -> DeepSeek scout,
  amber -> agreed flagship verdict <24h old, red -> two-flagship panel;
  authority-bound changes are HELD for Nish;
- the fleet intentionally does **not** merge code PRs on machine gates alone.

### Why nothing code-shaped has merged ~25h

The flagship seats are currently consumed by a live repair:
`pulse:unit:claude-0509-overseer.service - flagship repair still running
(unit fleet-repair-3b6421dc29-1786762522)`. Every fleet-gate unit waits
"queued behind live repair", so tinystudio-in code PRs are skipped each
cycle. This is the ladder working as designed under scarce flagship
capacity, not a stuck gate.

## What would unblock it (no code change in this repo can)

1. The flagship repair finishing (external to this repo) frees the ladder,
   after which CLEAN code PRs resume merging on agreed verdicts.
2. DIRTY PRs (#137, #128, #127, #125, #123, #118, #115, #110, #109, #108,
   #107) need a `main` refresh/rebase before they can go CLEAN — those are
   separate lane items, not stuck here.
3. BLOCKED PRs drain as the single VPS runner finishes queued CI.

## Files changed

- `.lane/reports/docs-lane1-merge-gate-frozen-20260815.md` — this report
  (lane-unique path; no shared report file touched).
