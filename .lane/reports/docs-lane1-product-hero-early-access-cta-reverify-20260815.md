# Lane 1 — Product hero "Get early access" CTA stays in the first mobile viewport (reverify)

## Item

- [unreviewed-by-opus] Promptly and Drishti mobile heroes bury the newly added Get early access CTA below the first [viewport]

## Verdict

**Already fixed and merged on main (PR #147).** No code change is possible or
needed; this run re-verified the shipped fix against fresh `origin/main` and
the rendered mobile layout.

## Evidence

- Fix commit `2796b33` ("fix(public): keep product hero early-access CTA in
  the first mobile viewport (#147)") is an ancestor of fresh `origin/main`
  (`a6e1be8`): `git merge-base --is-ancestor 2796b33 origin/main` → true.
- Source checks on `origin/main`:
  - `public/promptly/index.html` and `public/drishti/index.html` place the
    hero `.action-row` (with the `Get early access` mailto button) directly
    after the H1 and above `.page-lead`.
  - `public/styles.css` (mobile `@media (max-width: 720px)` block) shrinks
    the long hero H1s: `.page-hero-card h1 { font-size: clamp(2.1rem, 5.6vw,
    3.4rem); max-width: none; }`, so the heading no longer consumes ~544px.
- Enforcement suite `scripts/test-public-heading-hierarchy.mjs` asserts, in
  its Playwright layout probe, that the early-access CTA is fully within the
  first viewport at 320 and 390 on `/promptly/` and `/drishti/`, plus that
  CTA copy is unchanged. It fails closed when Playwright is absent.
- Live on this checkout (branch off fresh `origin/main`):
  - `node scripts/test-public-heading-hierarchy.mjs` → 93 checks, 0
    failures, including the CTA viewport assertions for both pages.
  - Headless-Chromium measurements (isMobile, local static `public/`):

    | page | viewport | CTA top–bottom | in-fold |
    |---|---|---|---|
    | /promptly/ | 320×667 | 536–584px | yes |
    | /promptly/ | 320×844 | 536–584px | yes |
    | /promptly/ | 390×844 | 469–517px | yes |
    | /promptly/ | 414×844 | 469–517px | yes |
    | /drishti/ | 320×667 | 502–550px | yes |
    | /drishti/ | 320×844 | 502–550px | yes |
    | /drishti/ | 390×844 | 469–517px | yes |
    | /drishti/ | 414×844 | 469–517px | yes |

    Before the fix the same probe measured Promptly CTA bottom ~1083px and
    Drishti ~1164px at 390 — the CTA sat below the fold on every mobile
    size. The hero H1 now ends at ~470–504px at 320 instead of ~544px.

## Files

None changed (verification-only run). The prior fix (PR #147) touched:
- `public/styles.css`
- `public/promptly/index.html`
- `public/drishti/index.html`
- `scripts/test-public-heading-hierarchy.mjs`
