# Lane 1 report: llms.txt description paragraph GEO gap

Lane: tinystudio-in lane 1 (worktree tinystudio-in-lane1-20260821-231545)
Date: 2026-08-21
Branch: `fix/lane1-llms-txt-description-paragraph-geo-gap-20260821` (commit a18a1f6)
PR: #246 — "fix(public): align llms.txt description paragraph with JSON-LD for GEO consistency"

## The one item

> Harvest the abandoned "llms.txt description paragraph GEO gap (backlog line ~1309, candidate round - 5 worktree"

## Root cause

The llms.txt description paragraph used a different disambiguation phrasing than the Organization JSON-LD on every public page:

| Surface | Phrasing |
|---|---|
| `public/llms.txt` (before fix) | "It is not affiliated with **any other app or studio** that uses the name Tiny Studio." |
| `scripts/prepare-static-site-bundle.mjs` template (before fix) | Same as llms.txt |
| Every page's JSON-LD `Organization.description` | "It is not affiliated with **other apps or studios** that use the name Tiny Studio." |

This inconsistency across AI-facing surfaces is a GEO (Generative Engine Optimization) gap. Generative engines reading both llms.txt and the JSON-LD see two subtly different disambiguation statements, which can dilute entity clarity.

## Fix

Aligned llms.txt and its generator template to the JSON-LD variant (more concise, matches the majority of surfaces):

- **`public/llms.txt`** — changed "any other app or studio" → "other apps or studios"
- **`scripts/prepare-static-site-bundle.mjs`** — same change in the llms.txt template (line 46)
- **`scripts/test-public-brand-disambiguation.mjs`** — updated two assertions (lines 105, 114) to check for the new phrasing

Note: The homepage body text ("visible to humans") was intentionally left unchanged — it uses "any other app or studio" and is user-facing copy, not an AI-facing surface.

## Verification

- `node scripts/test-public-brand-disambiguation.mjs` — **92 checks, 0 failures**
- `node scripts/test-public-structured-data.mjs` — **127 checks, 0 failures**
- `node scripts/test-public-deploy-bundle.mjs` — **101 checks, 0 failures**
- `node --check` on all changed scripts — OK
- Live site already carries the JSON-LD variant ("other apps or studios") on every page; this change brings llms.txt into alignment.

## Files changed (3)

- `public/llms.txt` — 1 line changed (description paragraph)
- `scripts/prepare-static-site-bundle.mjs` — 1 line changed (llms.txt template)
- `scripts/test-public-brand-disambiguation.mjs` — 2 lines changed (assertion strings)

## Outcome

Branch pushed and PR opened: https://github.com/nish3451/tinystudio-in/pull/246