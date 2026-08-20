# Lane 1 — Launch-prep footer copy on public pages: already fixed on main (reverify 2026-08-20)

## Item

- [unreviewed-by-opus] Eleven public pages still end with launch-prep footer copy ("clean public foundation before l

## Verdict

**Already fixed and merged on main.** PR #35 (merge `a0d1de5`, "fix(public): replace launch-prep footer copy on all public pages") rewrote the footer line on all eleven shared-footer pages plus the 404 page, and PR #151 (merge `3905d3d`, commit `f2ca885`, "test(public): guard public pages against launch-prep footer copy regression") wired the regression guard into `npm test` / `npm run ci`. Re-verified against fresh `origin/main` (`6c3d83f`). No source change is possible or needed; this run documents the reverification.

## Evidence

- Fix merge `a0d1de5` and regression-guard merge `3905d3d` are ancestors of fresh `origin/main`:
  - `git merge-base --is-ancestor a0d1de5 HEAD` → true (PR #35)
  - `git merge-base --is-ancestor f2ca885 HEAD` → true (PR #151)
- PR #35 touched all 12 shared-footer pages (the eleven studio/product/support/legal pages plus `public/404.html`), replacing "gives each product a clean public foundation before launch" with visitor-facing copy naming Promptly and Drishti.
- Regression guard `scripts/test-public-footer-copy.mjs` lists those 12 pages in `FOOTER_PAGES`, requires a `.footer-copy` paragraph naming `Promptly` and `Drishti`, and fails CI on any footer block containing `clean public foundation`, `foundation before launch`, `gives each product`, or `before launch`. Wired into both `npm test` and `npm run ci` in `package.json`.
- Live on this checkout (branch off fresh `origin/main` `6c3d83f`):
  - `node scripts/test-public-footer-copy.mjs` → **146 checks, 0 failures** (exit 0)
  - `grep -r "clean public foundation\|before launch" public/` → no matches in any page
  - `git status --porcelain` after the checks shows only the pre-existing untracked `node_modules`.

## Prior reverifications

- 2026-08-17: `lane1/public-footer-copy-reverify-20260817` branch (report not merged).

## Files

None changed (verification-only run). The prior fixes (PR #35, PR #151) touched:
- `public/404.html`
- `public/contact/index.html`
- `public/drishti/index.html`
- `public/drishti/privacy/index.html`
- `public/drishti/support/index.html`
- `public/privacy-choices/index.html`
- `public/privacy/index.html`
- `public/promptly/index.html`
- `public/promptly/privacy/index.html`
- `public/promptly/support/index.html`
- `public/support/index.html`
- `public/terms/index.html`
- `scripts/test-public-footer-copy.mjs`
- `package.json`
