# Lane 1 report: Homepage hero copy on / does not name any audience from PRODUCT.md in the first viewport

Lane: tinystudio-in lane 1 (worktree tinystudio-in-lane1-20260821-103032)
Date: 2026-08-21
Outcome: **No source change needed — the fix is already merged on main (PR #91, commit `dd8b042`, merged 2026-08-19). The live homepage's continued silence on the audience is Nish's deliberate, fail-closed snooze of the managed-service buyer path, not a defect this lane may repair. The item is complete in source; no further repo edit is possible without lifting a human gate.**

## The one item

> [unreviewed-by-opus] Homepage hero copy on / does not name any audience from PRODUCT.md in the first viewport - th

## What the item asks

PRODUCT.md names exactly one buyer: "Founder-led Managed IT/MSP/cybersecurity companies with a live site and high-value offer." The item claims the homepage (`/`) hero does not name that audience in the first viewport.

## Verification performed

### 1. The fix is already merged on main

Commit `dd8b042` "fix(public): name the Website Correction buyer audience in the homepage hero" (PR #91, merged 2026-08-19) changed exactly this:

- Hero lead: "There is also one **human-reviewed managed service for founder-led managed IT and cybersecurity companies with a live site**: The Website Correction."
- Hero rail item: "One human-reviewed correction pass for **founder-led managed IT and cybersecurity companies**, by email."

Verified: `git merge-base --is-ancestor dd8b042 origin/main` = yes; this worktree branched from fresh `origin/main` = `ccfbd4b`. The audience sentence sits in the hero lead inside the first viewport's `.hero-copy` block.

### 2. The repo is self-consistent with its deploy filter

`scripts/prepare-public-deploy-bundle.mjs` pins the exact hero-lead text in its fail-closed `HOMEPAGE_HERO_LEAD` snooze regex. Verified against the checked-out main source: regex matches, and the hero rail names the audience. Any future hero copy change must update that regex in the same commit or the release lane fails closed.

### 3. The live homepage omits the audience by deliberate snooze, not by drift

Live check 2026-08-21 (`https://tinystudio.in/`, HTTP 200): zero matches for "founder-led", "managed service", or "Website Correction"; the hero lead renders only the product-company sentences. This is the documented, intended behavior:

- `scripts/prepare-public-deploy-bundle.mjs` header: the managed-service buyer path (PRs #10/#11) is removed "because it remains snoozed-by-Nish (2026-08-08: 'do not build, publish, or deploy the managed-service buyer path without his explicit yes')".
- The deploy lane (`.github/workflows/deploy-public-site.yml`) is fail-closed: `FORBIDDEN_MARKERS` rejects any bundle containing "Website Correction" or "managed service", so no lane can publish that audience text even accidentally.
- PRODUCT.md's only named audience is the Website Correction buyer, so naming a PRODUCT.md audience on the live homepage is inseparable from the snoozed buyer path.

## Why no product PR was opened

The packet's fallback: "or by reporting plainly why the item cannot be done." Two branches:

1. **Against the repo source**, the item is already done (PR #91). A duplicate PR would re-create the exact same-fix pattern the repo's PR Duplicate Guard documents as a defect (see README "PR duplicate guard": #36/#44, #39/#49, #40/#52 were byte-identical patches).
2. **Against the live site**, the item requires publishing the snoozed managed-service buyer path. That is a standing human gate ("Never send, publish... without the applicable human gate") reserved to Nish; a lane must not lift it, and the release lane would fail closed if it tried.

This matches sibling-lane precedent: `b3726ed` / PR #163 (acquireLock item already fixed on main), and `.lane/reports/lane1-marketplace-presence-already-prepared-20260815.md`.

## How this item can be ticked

Mark the item done on the merged PR #91 state for the source. If the intent was the live homepage, the unblocking action is Nish lifting the 2026-08-08 snooze, after which the existing hero copy ships with the next deploy lane run — no new code is needed; the copy and the filter regex are already aligned.

## Checks run

- `git merge-base --is-ancestor dd8b042 origin/main` → yes
- `node scripts/check-product-truth.mjs` (npm run product:truth) → pass
- `node scripts/check-outbound-claim-safety.mjs` (npm run claims:check) → pass
- `git diff --check` → clean

## Files touched

- `/home/nish/workspaces/agent-state/lanes/tinystudio-in/lane-1.json` — claims list only (set to this report path)
- `.lane/reports/docs-lane1-homepage-hero-audience-already-fixed-20260821.md` — this report
- No repository product files changed.
