# Done-for-you proof-backed SEO repair desk

Direction (Nish, 2026-10-12, tinystudio-in#332). TinyStudio is the desk that does the SEO fix for the customer. SEO Fix Kit stays the self-serve tool; this brand has no dashboard and no self-serve tooling. Companion: Nishfleet/TinyStudio.io-public#42 covers the public homepage.

## Contract

1. **Free proof audit is the hook.** Every prospect first gets a free audit that names each fault with public evidence and its proven monthly loss.
2. **Done-for-you repair.** TinyStudio makes the fix. The customer does not operate a tool.
3. **Price anchored to proven loss.** The fee for a fault is anchored to that fault's proven monthly loss from the audit, never to hours or a flat package. The dollar figures and multiples are a pricing decision reserved to Nish; until he sets them, the `$1,000 founder pilot` in `growth-brain/sales/pricing-rules.md` stays the only active price.
4. **One human review before any fix ships.** A human reviews fit, claims, client-facing work and the fix itself before it ships. Automation prepares only; it never sends, publishes, spends, approves, accepts or renews.
5. **No guarantees.** No revenue, ranking, ROAS, conversion, booked-call or sales-volume guarantees.

## Positioning change

The "Website Correction" page-sprint and any MSP-retainer positioning give way to this repair desk. The legacy offer name `The Website Correction` and the `growth-brain/ops/agency-config.json` `offerName` stay only because `src/check-product-truth.mjs`, `src/check-human-service-kit.mjs`, `src/check-agency-defaults.mjs` and their tests still require that name. Renaming it across those checks and the active surfaces is tracked as a follow-up, not mixed into this contract change.

## Reusing the SEO Fix Kit proof engine

The desk does not build its own audit or proof code. It calls the SEO Fix Kit proof engine (fault detection, evidence capture, monthly-loss estimate, before/after proof) as it ships, and consumes its output as the audit and the proof pack. Any gap goes to SEO Fix Kit as an issue; this repo adds no parallel fault detector, scorer or proof generator.

## Capacity

Six repairs a month is the delivery cap. This repo holds no earlier six-a-month setting (the only cap in `agency-config.json` is `humanDailyReviewCap`, a daily review limit, which is unchanged), and nothing in this spec gives a reason to change six, so the cap stands at six.
