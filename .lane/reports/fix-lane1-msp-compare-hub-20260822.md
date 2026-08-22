# Lane evidence: MSP comparison hub

Item `7a99a5f119` is the reason: 2026 MSP marketing-agency comparison guides omit Tiny Studio as a focused one-page. This lane adds Tiny Studio's own offer-shape hub; it does not claim a third-party listing.

- Branch: `fix/lane1-msp-compare-hub-20260822`
- PR: https://github.com/nish3451/tinystudio-in/pull/256
- Base: `main`
- Head: `fix/lane1-msp-compare-hub-20260822`
- New URL: https://tinystudio.in/compare/
- Apply path: `/contact/#website-correction-application` (`/offer/` and `/website-correction/` are not on HEAD; PR #207 is not the parent)

## Section 5 commands (worktree root; all exit 0)

```
node scripts/test-public-compare-page.mjs
```
Last line: `24 checks, 0 failures`

```
node scripts/test-public-soft-404.mjs
```
Last line: `21 checks, 0 failures`

```
node scripts/test-public-structured-data.mjs
```
Last line: `142 checks, 0 failures`

```
node scripts/test-public-brand-disambiguation.mjs
```
Last line: `99 checks, 0 failures`

```
node scripts/test-public-heading-hierarchy.mjs
```
Last line: `166 checks, 0 failures` (includes `/compare/` at 280–390px)

```
node scripts/test-public-link-targets.mjs
```
Last line: `80 checks, 0 failures`

```
node scripts/test-public-social-preview.mjs
```
Last line: `148 checks, 0 failures`

```
node scripts/test-public-theme-color.mjs
```
Last line: `86 checks, 0 failures`

```
node scripts/test-public-meta-descriptions.mjs
```
Last line: `106 checks, 0 failures`

```
node scripts/test-public-footer-copy.mjs
```
Last line: `158 checks, 0 failures`

```
node scripts/test-public-brand-tagline.mjs
```
Last line: `23 checks, 0 failures`

```
node scripts/test-public-deploy-bundle.mjs
```
Last line: `106 checks, 0 failures`

```
npm test
```
Exit 0. Final test last line: `24 checks, 0 failures` (`test-public-compare-page.mjs`).

```
node -e "import { PUBLIC_HTML_FILES, PUBLIC_PAGE_URLS, pageUrlFor } from './scripts/lib/public-pages.mjs'; if (!PUBLIC_HTML_FILES.includes('compare/index.html')) process.exit(1); if (pageUrlFor('compare/index.html') !== 'https://tinystudio.in/compare/') process.exit(1); if (!PUBLIC_PAGE_URLS.includes('https://tinystudio.in/compare/')) process.exit(1);"
```
Exit 0.

```
grep -F 'https://tinystudio.in/compare/' public/sitemap.xml public/llms.txt
```
```
public/sitemap.xml:    <loc>https://tinystudio.in/compare/</loc>
public/llms.txt:- Compare: https://tinystudio.in/compare/
```

```
test ! -e public/offer/index.html && test ! -e public/website-correction/index.html
```
Exit 0.

```
gh pr view --json url,baseRefName,headRefName
```
`baseRefName=main`, `headRefName=fix/lane1-msp-compare-hub-20260822`, url `https://github.com/nish3451/tinystudio-in/pull/256`.

Live `curl https://tinystudio.in/compare/` 404 is not a failure: production deploy is a later lane.

## Spec note

Section 3.6 requires the exact disclaimer `Tiny Studio is not claiming to be better than any named agency.` The ranking-language guard in `test-public-compare-page.mjs` allows only that prescribed sentence after href strip, then fails on any other `better than`.
