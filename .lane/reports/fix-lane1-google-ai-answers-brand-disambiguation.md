# Lane report: fix/lane1-google-ai-answers-brand-disambiguation

## Item

Google AI answers confuse Tiny Studio / tinystudio.in with unrelated "tiny studio" brands.

## Root cause

Only the homepage carried the Tiny Studio identity statement. Google AI answers are
grounded by AI-facing surfaces — every page's Organization JSON-LD and `llms.txt` —
and those surfaces had no disambiguation. `public/llms.txt` in particular said only
"Tiny Studio is a small product company behind Promptly, Drishti, and 0509" with no
`tinystudio.in` home and no not-affiliated statement.

## Fix

Extended the brand identity statement to every public surface:

- Every public page's Organization JSON-LD node now carries `alternateName: tinystudio.in`
  plus a description: "Tiny Studio is the independent product company at tinystudio.in
  behind Promptly, Drishti, and 0509. It is not affiliated with other apps or studios
  that use the name Tiny Studio."
- `public/llms.txt` and its generator template in
  `scripts/prepare-static-site-bundle.mjs` state the same identity up front, so LLM
  clients reading the site corpus get the disambiguation first.
- `scripts/test-public-brand-disambiguation.mjs` now guards every public page,
  llms.txt, and the generator template, not just the homepage (92 checks).

## Files changed (14)

- public/contact/index.html — Org JSON-LD alternateName + description
- public/drishti/index.html — same
- public/drishti/privacy/index.html — same
- public/drishti/support/index.html — same
- public/llms.txt — identity statement up front
- public/privacy-choices/index.html — Org JSON-LD alternateName + description
- public/privacy/index.html — same
- public/promptly/index.html — same
- public/promptly/privacy/index.html — same
- public/promptly/support/index.html — same
- public/support/index.html — Org JSON-LD alternateName + description
- public/terms/index.html — same
- scripts/prepare-static-site-bundle.mjs — llms.txt generator template keeps identity
- scripts/test-public-brand-disambiguation.mjs — guards every page + llms.txt + template

## Verification

- `node scripts/test-public-brand-disambiguation.mjs` — 92 checks, 0 failures
- `node scripts/test-public-structured-data.mjs` — 127 checks, 0 failures
- `node scripts/test-public-deploy-bundle.mjs` — 63 checks, 0 failures
- `node --check` on changed scripts — OK
- `git diff --check` — OK
- Full `npm test` — all checks pass except `check-retention-automation.mjs`,
  which fails identically on clean origin/main (stale canonical-workspace state +
  checkout ahead of remote main). Pre-existing, unrelated.

## Outcome

Branch pushed and PR opened: fix/lane1-google-ai-answers-brand-disambiguation
