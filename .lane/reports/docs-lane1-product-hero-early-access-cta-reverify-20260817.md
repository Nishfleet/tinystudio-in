# Lane report: tinystudio-in lane 1 — product hero early-access CTA mobile fold

## Item
`[unreviewed-by-opus]` Promptly and Drishti mobile heroes bury the newly added Get early access CTA below the first [viewport]

## What was true at assignment
PR #147 (merged 2026-08-08) already fixed the underlying bug on `main`:
- `public/styles.css` — mobile-only `.page-hero-card h1 { font-size: clamp(2.1rem, 5.6vw, 3.4rem); max-width: none; }` inside the existing `@media (max-width: 720px)` block.
- `public/promptly/index.html` and `public/drishti/index.html` — the hero `.action-row` (containing the Get early access button) was moved above `.page-lead` in DOM order.
- `scripts/test-public-heading-hierarchy.mjs` — extended with a Playwright layout probe (320/390 widths, 844 height) that asserts the early-access CTA is in the first mobile viewport on both pages.

So this lane was not a fresh fix; it was a reverification and an opportunity to harden the regression guard.

## Independent verification on fresh origin/main (ce718b6 base = a6cd49b)

I built a private Playwright probe (`/tmp/lane1probe/measure.mjs`) that measures the CTA bounding rect on both product pages at the four real iPhone widths (320/360/390/414) crossed with the three real iPhone heights (667/740/844). 24 measurements, all `fully in fold` (top ≥ 0 and bottom ≤ viewport height).

| page | worst top | worst bottom | best top | best bottom | worst bottom/vh |
|------|-----------|--------------|----------|-------------|-----------------|
| `/promptly/` | 536 (320) | 584 (320) | 321 (360×740) | 338 (360×740) | 0.876 |
| `/drishti/`  | 502 (320–360) | 550 (320–360) | 469 (390–414) | 517 (390–414) | 0.825 |

Hero H1 height in-fold at 320: 202px (Promptly) and 168px (Drishti). The committed probe (`scripts/test-public-heading-hierarchy.mjs`) passes all 93 checks against the fresh source.

## Gap found in the committed regression guard

The committed probe's CTA assertion message says "fully within the first mobile viewport", but the predicate is `ctaRect.top < innerHeight && ctaRect.bottom >= 0` — that is "partially intersects the viewport", not "fully within". A regression that puts the CTA mostly below the fold would still pass.

I tested empirically with a synthetic partial regression: bumping the mobile hero h1 back up to `clamp(2.1rem, 12.2vw, 6.7rem)` (still inside the `@media (max-width: 720px)` block, so the structure is intact). On that copy the CTA sits at top 607–688, bottom 655–736 across the same 24 measurements, and is fully below the fold in 5 of the 24 cases (Promptly 360×667, 390×667, 414×667; Drishti 390×667, 414×667). The old probe's `ctaVisible` check would have caught 4 of those 5 (all except the 320 cases where the CTA was still partially visible) — i.e., a real partial regression could slip past the named guard.

A second gap: the committed probe only tests a fixed 844px viewport height, never the 667px iPhone-SE height, even though the original report measured across 667/740/844.

## Change shipped

PR #190 (this branch `lane1/product-hero-early-access-cta-reverify-20260817`):
- Tighten the CTA predicate to `ctaRect.top >= 0 && ctaRect.bottom <= innerHeight * 0.95` (a 5% bottom buffer for browser-chrome variation), with the new `ctaFullyInFold` field exposed alongside the legacy `ctaVisible` for diagnostics.
- Extend `measurePage` to accept a viewport height, default 844.
- Add a `promptly390Short` (390×667) measurement to the Promptly block and a `drishti390Short` (390×667) measurement to the Drishti block so both pages are now guarded at the short-viewport size.
- Include the measured top/bottom in the assertion message so a future failure points at the actual position, not just the page.

Source-only changes to `scripts/test-public-heading-hierarchy.mjs` (+10/-7). No HTML, no CSS, no live gate — the visual fix from PR #147 is unchanged.

## Verification

On origin/main (fresh `a6cd49b`):
- `node --check scripts/test-public-heading-hierarchy.mjs` — clean.
- `node scripts/test-public-heading-hierarchy.mjs` — 93 checks, 0 failures. New measurements reported: Promptly 320 top=535.7 bottom=583.7; Promptly 390 top=468.5 bottom=516.5; Promptly 390×667 top=468.5 bottom=516.5; Drishti 390 top=468.5 bottom=516.5; Drishti 390×667 top=468.5 bottom=516.5.
- Synthetic partial regression copy (`/tmp/lane1probe/regress/`, not committed): tightened probe fails 2 checks (Promptly 390×667 with CTA bottom=715.2; Drishti 390×667 with CTA bottom=715.2), confirming the guard now catches what the old guard missed.

## Files changed
- scripts/test-public-heading-hierarchy.mjs

## PR
https://github.com/nish3451/tinystudio-in/pull/190
