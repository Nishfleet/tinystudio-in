# Lane 1 report: restore the Promptly support heading hierarchy in production — reverify 2026-08-20

Lane: tinystudio-in lane 1 (item_id `e0639599b0`)
Worktree: tinystudio-in-lane1-20260821-042532
Date: 2026-08-20
Outcome: **FIXED IN PRODUCTION.** The PR #20 source fix (`1536cc8`) is live
on https://tinystudio.in/promptly/support/ — the heading hierarchy is
restored. Evidence: `docs/evidence/restore-promptly-support-heading-hierarchy-live-20260820.md`.

## The one item

> Restore the Promptly support heading hierarchy in production after the closed live-delivery item [scout 2026-08-08]

## Why the prior report said blocked

The 2026-08-15 lane report (same item) found:
- source fix merged (`1536cc8`, PR #20) and held by hermetic tests;
- live still serving the stale June-20 bundle (`<h1>` → `<h3>` ×3 → `<h2>`);
- deploy gate: missing `CLOUDFLARE_API_TOKEN` (fail-closed workflow),
  NEEDS-NISH, outside lane scope.

## What unblocked it

The deploy lane was fixed and unblocked on main since 2026-08-15:
- `aaeab8b` (#198) — accept `CLOUDFLARE` token secret name
- `3c13d47` (#199) — correct Pages project name (`tiny-studio`)
- `b64f242` (#208) — `CF_API_BASE` `/api/v4` → `/client/v4` (403 fix)
- `7461f57` (#209) — Node 22 for wrangler 4.123
- `161b27f` (#211) — acceptance section J dead code

## Verification (2026-08-20)

`npm run site:check-live-promptly-support-heading-hierarchy` → **9 checks, 0 failures**:

- exactly one H1, first in outline
- three card titles as H2s inside `.info-card` articles
- flat H2 band (card H2s + footer H2) before footer H3s
- no heading-level jump > 1 (no H1 → H3 skip)
- all three repaired H2 titles present

Live outline: `h1` → `h2`×4 → `h3`×3. Source `public/promptly/support/index.html` matches.

## Files changed

- `docs/evidence/restore-promptly-support-heading-hierarchy-live-20260820.md` (reverify evidence, docs-only)
- `.lane/reports/lane1-promptly-support-heading-hierarchy-restore-20260820.md` (this report)
- `scripts/test-public-live-promptly-support-heading-hierarchy.mjs` (tail-line wording only: the "finding stays open until a refresh lands" line now says the repaired outline is live; zero assertion changes, 9 checks still green)
- `/home/nish/workspaces/agent-state/lanes/tinystudio-in/lane-1.json` — claims list only

PR: https://github.com/nish3451/tinystudio-in/pull/230
