# Lane report: tinystudio-in lane 1 — product hero CTA buried below mobile fold

## Item
[unreviewed-by-opus] Promptly and Drishti mobile heroes bury the newly added Get early access CTA below the first [viewport]

## Root cause
Shared `h1` rule: `font-size: clamp(3.4rem, 7vw, 6.7rem)` + mobile `max-width: 9ch`. At 320–414px the 7vw font with a 9ch cap made the long product hero H1s ~544px tall (over half an 844px viewport), and with the action-row after the long page-lead in DOM order, the CTA bottom landed at ~1035–1191px — below the fold everywhere, including desktop 1024px.

Measured before (Playwright, 844px viewport): Promptly CTA bottom 1083px @390; Drishti 1164px @390.

## Fix (PR #147)
1. `public/styles.css` — mobile-only `.page-hero-card h1 { font-size: clamp(2.1rem, 5.6vw, 3.4rem); max-width: none; }` inside the existing `@media (max-width: 720px)` block. Homepage untouched; desktop floor (3.4rem) preserved.
2. `public/promptly/index.html`, `public/drishti/index.html` — moved the hero `.action-row` above `.page-lead` so the CTA is first after the H1 on narrow screens. Desktop two-column layout unaffected.
3. `scripts/test-public-heading-hierarchy.mjs` — extended the existing 320/390px Playwright layout probe to assert the early-access CTA is fully within the first viewport on both pages (fails closed when Playwright is missing).

## Verification
- Playwright before/after, all mobile widths (320/360/390/414) and heights (667/740/844): CTA fully in-fold after; at 320×667 it now sits at 536–584px top/bottom (was ~1035–1083+).
- Hero H1 height at 320px: 544px -> 202px.
- `test-public-heading-hierarchy.mjs`: 93 checks, 0 failures (includes new CTA assertions, rendered at 320 and 390).
- All 10 public-site tests pass; all other CI scripts pass; `node --check` on every script passes.
- `check-retention-automation.mjs` fails in CI for environmental reasons (stale-checkout comparison against a different checkout path), pre-existing and unrelated.
- Visual confirmation via 390×844 screenshots: heading, all three buttons, lead, and chips visible in first viewport.

## Files changed
- public/styles.css
- public/promptly/index.html
- public/drishti/index.html
- scripts/test-public-heading-hierarchy.mjs

## PR
https://github.com/nish3451/tinystudio-in/pull/147
