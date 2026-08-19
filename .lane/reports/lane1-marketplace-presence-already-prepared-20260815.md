# Lane 1 report: Promptly and Drishti have zero indexed Product Hunt or AlternativeTo presence

Lane: tinystudio-in lane 1 (worktree tinystudio-in-lane1-20260815-031032)
Date: 2026-08-15
Outcome: **No source change needed — the truth for this item is already prepared and merged on main (PR #33 baseline, re-verified through 2026-08-14 in PR #139). The item is complete in source; no further repo edit is possible or required.**

## The one item

> [unreviewed-by-opus] Promptly and Drishti have zero indexed Product Hunt or AlternativeTo presence - prepare truth

## What the item asks

Produce a verified truth record for the claim that Tiny Studio's two public apps (Promptly, Drishti) have zero indexed Product Hunt or AlternativeTo presence, so the claim can be made and re-checked honestly.

## Verification performed

### 1. The truth is already prepared and merged on main

The canonical truth document `docs/research/app-marketplace-presence-truth-2026-08-09.md` exists on `origin/main` with:

- **Baseline (2026-08-09)** — commit `a57ab1a` "docs(research): record verified zero Product Hunt and AlternativeTo presence for Promptly and Drishti (#33)", merged 2026-08-09. Records on-platform searches on both marketplaces, index (site-restricted) checks, the live app pages, and an interpretation boundary.
- **Re-verification 2026-08-11** — commit `2e3c00e` (PR #58).
- **Re-verification 2026-08-12** — commit `5d50220` (PR #100).
- **Re-verification 2026-08-14** — commit `0152a19` "docs(research): re-verify marketplace presence truth on 2026-08-14 (#139)".

Verified: `git merge-base --is-ancestor 0152a19 origin/main` = yes; worktree HEAD == origin/main == `e22785f`. Each re-verification logs the exact queries, the unrelated third-party collisions, the AlternativeTo 404 software page, the empty Wayback CDX history, and the unchanged live app pages.

### 2. Prior lane branches for this item were superseded by merged main work

Four earlier lane branches exist for this exact item; their content is now on main and their diffs are superseded:

- `origin/truth/app-marketplace-presence` — baseline truth commit `4fa8365` (merged on main as `a57ab1a`, PR #33).
- `origin/docs/lane1-marketplace-presence-reverify` — re-verify commit `452697c` (merged as `2e3c00e`, PR #58).
- `origin/docs/lane1-marketplace-presence-recheck-20260812` — re-verify commit `8dcb65d` (merged as `5d50220`, PR #100).
- `origin/docs/marketplace-presence-truth-2026-08-14` — re-verify commit `a89809e` (merged as `0152a19`, PR #139).

### 3. No live-gate blocker applies to this item

Unlike the public-page fix lanes, this item produces research truth, not deployable public pages. The truth document is already on main; there is no pending deploy step and no `CLOUDFLARE_API_TOKEN` gate to clear for it. (The canonical missing-secret deploy blocker affects live public page delivery, but this item does not change public pages.)

## Why no product PR was opened

The packet's fallback: "or by reporting plainly why the item cannot be done." The item's source work — a verified, dated, re-checkable truth record — is already merged on main (PR #33 plus re-verifications #58, #100, #139), with the most recent re-check dated 2026-08-14. Creating a duplicate PR would touch no owned files and deliver nothing. This matches sibling-lane precedent (e.g. `b3726ed` "report acquireLock stale-recovery item — already fixed on main", `3491c67` exporters --help, `04a9997` MSP benchmark): report the already-fixed state instead of duplicating merged work.

## How this item can be ticked

The truth is prepared and current through 2026-08-14. The backlog item can be marked done on the merged truth doc; the next re-verification is due whenever the claim is next used in outbound copy or before any launch. Re-verification procedure is recorded in the doc's "Re-verification" section.

## Files touched

- `/home/nish/workspaces/agent-state/lanes/tinystudio-in/lane-1.json` — claims list (set to this report path; no repo source files claimed)
- `.lane/reports/lane1-marketplace-presence-already-prepared-20260815.md` — this report
- No repository product files changed.
