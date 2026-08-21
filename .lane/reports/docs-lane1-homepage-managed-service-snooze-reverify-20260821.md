# Lane 1 report: homepage managed-service section absence — re-verify (docs/lane1-homepage-managed-service-snooze-reverify-20260821)

Lane: tinystudio-in lane 1 (worktree tinystudio-in-lane1-20260821-091037)
Date: 2026-08-21
Outcome: **No product change needed — re-verified as intended, snooze honored.** Documentation-only PR opened.

## The one item

> [unreviewed-by-opus] Live site is missing the entire `<section id="managed-service">` block on the homepage while the merged homepage on main carries it

(Item text is truncated in the packet at "while or"; the canonical full finding lives in `docs/measurement/public-conversion-signal.md` § Review dispositions, 2026-08-11: "homepage is missing the entire `<section id="managed-service">` block on the live site while the merged homepage on main carries it".)

## Why a re-verify, not a fix

This finding was already dispositioned by the lane on 2026-08-11 as **intended, snooze honored — not a regression**:

- The managed-service buyer path (PRs #10/#11) is snoozed-by-Nish (2026-08-08: do not build, publish, or deploy it without his explicit yes; vault record `tinystudio-managed-service-page-deferred`, "archive that, might be useful later. not worth it yet").
- `scripts/prepare-public-deploy-bundle.mjs` strips the entire section and every buyer-path marker from the publishable bundle (fail-closed pre/post filter, `SNOOZE_FILTER_VERSION = 1`).
- `scripts/check-public-live-deploy.mjs` section D asserts the section's absence on the live homepage; `scripts/test-public-deploy-bundle.mjs` mirrors it on the bundle.
- Scouts were told not to re-file the gap; it remains snoozed.

## Fresh verification performed (2026-08-21)

1. **Source**: `public/index.html` line 284 carries `<section class="shape" id="managed-service" aria-labelledby="managed-service-title">` on origin/main HEAD `ccfbd4b` (fetched fresh).
2. **Live fetch**: `https://tinystudio.in/` returns 200 with `<title>Tiny Studio | Promptly, Drishti, and 0509</title>` and contains **zero** occurrences of `id="managed-service"`, "Website Correction", "website-correction", "managed service", or `data-measure-source`.
3. **Provenance**: live `https://tinystudio.in/deploy-manifest.json` (fetched 2026-08-21) shows `filter_version: 1`, `source_commit: ccfbd4b` (current main), `prepared_at: 2026-08-21T03:59:56Z`, note "managed-service buyer path (PRs #10/#11) removed per snoozed-by-nish 2026-08-08". The deploy path was repaired since the 2026-08-11 disposition (PRs #208 CF_API_BASE, #209 Node 22, #211 section J helpers, plus pages-project-name #199 and secret-name #198): the live bundle is now **current**, so the absent section is the filter's deliberate output, not a stale 06-20 bundle.
4. **Repo gates**:
   - `node scripts/test-public-deploy-bundle.mjs` → **101 checks, 0 failures**
   - `node scripts/check-public-live-deploy.mjs` → **240 checks, 0 failures** (includes section D "homepage has no id=managed-service")

## What changed

- `docs/measurement/public-conversion-signal.md` — appended a dated 2026-08-21 re-verify annotation to the Review dispositions section (the canonical tracking doc for this exact finding), recording the fresh live/provenance/check evidence and the unchanged verdict.
- No product code changed. The section returns only when Nish lifts the snooze; the fail-closed filter is then updated deliberately, never silently.

## Deliverable

PR: https://github.com/nish3451/tinystudio-in/pull/241 (docs-only, branch `docs/lane1-homepage-managed-service-snooze-reverify-20260821`)

## Files touched

- `/home/nish/workspaces/agent-state/lanes/tinystudio-in/lane-1.json` — claims list only (`docs/measurement/public-conversion-signal.md`); written atomically via temp file + rename.
- `.lane/reports/docs-lane1-homepage-managed-service-snooze-reverify-20260821.md` — this report (lane-unique path).
- `docs/measurement/public-conversion-signal.md` — the one product-file change, committed and PR'd.
