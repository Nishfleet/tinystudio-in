# Lane 1 report: llms.txt description names The Website Correction managed service

Lane: tinystudio-in lane 1
Date: 2026-08-22
Branch: `fix/lane1-llms-txt-description-names-managed-service-20260822` (commit 59db0af)
PR: #249 — "fix(public): llms.txt description names The Website Correction managed service"

## The one item

> [unreviewed-by-opus] llms.txt description paragraph describes the app portfolio, not The Website Correction manage[d service]

## Root cause

`public/llms.txt`'s description paragraph named only the app portfolio
(Promptly, Drishti, 0509) plus the non-affiliation sentence. PRODUCT.md names
exactly one active offer — **The Website Correction**, the human-reviewed
managed service ($1,000 fixed-scope founder pilot for the first three clients,
one highest-leverage page) — but AI surfaces reading llms.txt could never
discover it.

## Constraint honored: the buyer-path snooze

Nish snoozed the managed-service buyer path on 2026-08-08 ("do not build,
publish, or deploy the managed-service buyer path without his explicit yes").
The deploy bundle enforces this fail-closed: `FORBIDDEN_MARKERS`
("Website Correction", "managed service", …) are checked against every
required deploy file, including `llms.txt`. Naively editing `public/llms.txt`
would have failed the release lane closed.

Merged PR #247 already established the pattern for exactly this situation on
the homepage JSON-LD descriptions: **source names the offer, the deploy bundle
strips it** while the snooze stands. This fix applies that same pattern to
llms.txt.

## Fix

1. `public/llms.txt` + the `llmsTxt` template in
   `scripts/prepare-static-site-bundle.mjs` — description paragraph gains the
   managed-service sentence, byte-identical to the homepage Organization
   JSON-LD description merged in #247 (GEO consistency per #246/#247). The
   verbatim disambiguation sentence is kept.
2. `scripts/prepare-public-deploy-bundle.mjs` — strip rule + fail-closed
   pre-filter for the llms.txt sentence (`SNOOZE_FILTER_VERSION` 1 → 2);
   exported `LLMS_TXT_MANAGED_SERVICE` for test reuse. The bundled llms.txt
   stays portfolio-only.
3. `scripts/test-public-deploy-bundle.mjs` — new source-marker guard; llms.txt
   added to the bundled forbidden-marker sweep; new F2 coherence section.
4. `scripts/test-public-llms-offer-description.mjs` (new) — 23-check guard:
   grounded facts, template byte-lockstep, JSON-LD byte-parity, bundle strip
   round-trip, npm wiring. Wired into `test` and `ci`.

## Relationship to open PR #245

PR #245 (another lane) targeted this same item but is now CONFLICTING with
main (#246 rewrote the same line after it branched). This PR is effectively
its rebase onto current main with the snooze-strip design added; #245 can be
closed in favor of #249.

## Verification

- `node scripts/test-public-llms-offer-description.mjs` — 23 checks, 0 failures
- `node scripts/test-public-deploy-bundle.mjs` — 113 checks, 0 failures
- `node scripts/test-public-brand-disambiguation.mjs` — 92 checks, 0 failures
- `node scripts/test-public-homepage-jsonld-offer.mjs` — 26 checks, 0 failures
- `node scripts/test-public-soft-404.mjs` — 21 checks, 0 failures
- Full `npm run ci` chain minus `check-retention-automation.mjs`: **1432
  checks, 0 failures**. That step fails identically with this diff stashed
  (pre-existing local state in /home/nish/workspaces/products/tinystudio-in:
  zero service-decisions/service-engine runs vs 3 active clients, stale
  freshness), so it is unrelated to this change.
- Live behavior unchanged by design: deployed llms.txt remains portfolio-only
  until the buyer-path snooze is lifted.

## Outcome

Branch pushed and PR opened: https://github.com/nish3451/tinystudio-in/pull/249
