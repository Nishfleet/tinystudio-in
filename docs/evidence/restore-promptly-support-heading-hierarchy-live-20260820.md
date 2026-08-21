# Restore the Promptly support heading hierarchy in production — live reverify 2026-08-20

Lane: tinystudio-in lane 1 (item_id `e0639599b0`)
Date: 2026-08-20
Verdict: **FIXED IN PRODUCTION — the Promptly support heading hierarchy is
restored on the live site.** The 2026-08-15 lane report's blocker (missing
`CLOUDFLARE_API_TOKEN`) has since been resolved by the deploy-lane fixes
(#198, #199, #208, #209, #211); a fresh deploy has reached tinystudio.in and
`/promptly/support/` now serves the PR #20 repaired outline.

## The one item

> Restore the Promptly support heading hierarchy in production after the
> closed live-delivery item [scout 2026-08-08]

## Prior state (2026-08-15 report)

- Source fix already merged: `1536cc8` "fix(public): restore Promptly
  support heading hierarchy (#20)", ancestor of `origin/main`.
- Live was still serving the stale June-20 bundle: `<h1>` then `<h3>` ×3
  then `<h2>` — the exact H1 → H3 jump the item describes.
- Blocking gate was the missing `CLOUDFLARE_API_TOKEN` secret
  (fail-closed `.github/workflows/deploy-public-site.yml`), a NEEDS-NISH
  action outside the lane.

## What changed since (deploy lane unblocked and fixed)

| Commit | Fix |
| --- | --- |
| `aaeab8b` (#198) | deploy accepts `CLOUDFLARE` secret name alongside `CLOUDFLARE_API_TOKEN` |
| `3c13d47` (#199) | correct Pages project name (`tiny-studio`, proven against live project list) |
| `b64f242` (#208) | `CF_API_BASE` typo `/api/v4` → `/client/v4` — lane had 403'd on every call |
| `7461f57` (#209) | deploy lane runs Node 22 (wrangler 4.123 refuses Node 20) |
| `161b27f` (#211) | acceptance section J dead code fixed |

## Live verification (2026-08-20)

`npm run site:check-live-promptly-support-heading-hierarchy` against
https://tinystudio.in/promptly/support/ → **9 checks, 0 failures**:

- exactly one H1, first heading in the outline
- three card headings as H2s inside `.info-card` articles
- flat H2 band (card H2s + footer H2) before the footer H3s
- no heading-level jump greater than one (no H1 → H3 skip)
- repaired H2 titles present: "A single, clear support route.", "Support,
  privacy, and contact stay connected.", "A lasting support destination."

Live outline as fetched:

```
h1  Promptly support for bookings, reminders, and client links.
h2  A single, clear support route.
h2  Support, privacy, and contact stay connected.
h2  A lasting support destination.
h2  Focused apps. Clear public pages. Thoughtful support.
h3  Promptly
h3  Studio
h3  Legal
```

Source `public/promptly/support/index.html` matches (PR #20 fix intact, held
by `scripts/test-public-promptly-support-heading-hierarchy.mjs` in npm
test/ci). The nightly staleness alarm
(`.github/workflows/live-site-check-promptly-support.yml`) is expected to go
green on its next run; the live guard script still reads "the finding stays
open until a refresh of the live deployment lands" as its tail line, which
now no longer applies to production.

## Files changed

- `docs/evidence/restore-promptly-support-heading-hierarchy-live-20260820.md`
  (this reverify evidence; docs-only — no product source touched)

## Rollback

Not applicable — no product code changed. The source fix remains held by the
hermetic test (`scripts/test-public-promptly-support-heading-hierarchy.mjs`)
wired into `npm test` / `npm run ci` and the live nightly alarm.
