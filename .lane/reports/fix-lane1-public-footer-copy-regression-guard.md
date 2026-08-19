# Lane report: fix/lane1-public-footer-copy-regression-guard

## Item

- [ ] [unreviewed-by-opus] Eleven public pages still end with launch-prep footer copy ("clean public foundation before l

## What was wrong

PR #35 (`fix(public): replace launch-prep footer copy on all public pages`)
replaced the eleven shared-footer pages' footer copy
("Tiny Studio builds independent iPhone apps and gives each product a
clean public foundation before launch.") with visitor-facing copy that
names the actual products and what they do. The replacement shipped
without a regression test, so adding a new public page or accidentally
editing the footer would not fail CI.

The original follow-up test (commit `26c7e35` on
`fix/public-footer-copy-regression-guard`) was created on 2026-08-11 but
never merged to `main`. Without the test wired in, every PR that touches
`public/*.html` carries the same risk that motivated PR #35 in the first
place.

## What I changed

- `scripts/test-public-footer-copy.mjs` (new, 98 lines): explicit
  FOOTER_PAGES list of the 12 shared-footer pages (the eleven
  studio/product/support/legal pages plus the 404 page); fails CI if any
  footer block re-introduces `clean public foundation`, `foundation
  before launch`, `gives each product`, or `before launch`, or drops the
  visitor-facing `Promptly`/`Drishti` product names.
- `package.json`: wired the new test into both `npm test` and `npm run ci`
  in the natural position between the soft-404 and deploy-bundle public
  tests (matches the existing sibling layout).

Branch: `fix/lane1-public-footer-copy-regression-guard` (fresh from
`origin/main@377c27e`, single commit `f2ca885`).
PR: https://github.com/nish3451/tinystudio-in/pull/151

## Verification

- `node scripts/test-public-footer-copy.mjs` -> **146 checks, 0 failures**
  (Section A: 60 footer-copy/visitor-name checks; Section B: 48
  block-fragment checks; Section C: 2 npm wiring checks; 36 footer-block
  presence checks).
- `find scripts -name '*.mjs' -print0 | xargs -0 -n1 node --check` -> clean.
- `git push` succeeded to
  `fix/lane1-public-footer-copy-regression-guard`; `gh pr create` opened
  PR #151 against `main`.

## What this lane deliberately did NOT do

- Did not modify any `public/*.html` file. The 12 footers are already
  fixed by PR #35; this lane adds the regression guard so they stay
  fixed.
- Did not touch the body copy on
  `public/promptly/privacy/index.html`,
  `public/drishti/privacy/index.html`, `public/privacy/index.html`, or
  `public/terms/index.html`, which still carry internal submission-prep
  copy (tracked by separate lanes under
  `fix/remove-submission-prep-copy-privacy-pages` and friends).
- Did not touch the homepage (`public/index.html`), which has a distinct
  footer block ("Small studio. Clear lanes. Better signal.") and is not
  on the FOOTER_PAGES list.
