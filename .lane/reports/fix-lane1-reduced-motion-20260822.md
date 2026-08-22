# Lane 1 evidence: public prefers-reduced-motion

- Item: self-directed cycle (public-promise / UX accessibility gap)
- Branch: `fix/lane1-reduced-motion-20260822`
- PR: https://github.com/nish3451/tinystudio-in/pull/254

## Gap

`DESIGN.md` line 36 says "Respect reduced-motion", but `public/styles.css` ran a `.reveal` fade/slide load animation (`opacity: 0` + `translateY(16px)` + `animation: reveal 600ms ease forwards`) and `html { scroll-behavior: smooth; }` with no `prefers-reduced-motion` guard. Users who request reduced motion still got the load animation and smooth scrolling.

Open PRs checked first (#253 sitemap lastmod, #249/#245 llms.txt, #216 homepage meta, #207 offer page, #206 editorial voice). None cover this gap.

## Changed files

- `public/styles.css` — append a top-level `@media (prefers-reduced-motion: reduce)` block that sets `html { scroll-behavior: auto; }` and `.reveal { opacity: 1; transform: none; animation: none; }`. Default `.reveal` keyframes and smooth scroll for everyone else are unchanged.
- `scripts/test-public-reduced-motion.mjs` — new regression test that the media query exists and cancels smooth scroll plus the `.reveal` animation, and that `npm test` / `npm run ci` run it.
- `package.json` — insert `node scripts/test-public-reduced-motion.mjs && ` after `test-public-theme-color.mjs` in both `scripts.test` and `scripts.ci`.
- `.lane/reports/fix-lane1-reduced-motion-20260822.md` — this lane-unique evidence file.

## Proof

### `node scripts/test-public-reduced-motion.mjs` (exit 0)

```
test-public-reduced-motion: public CSS respects prefers-reduced-motion
A. public/styles.css declares a reduced-motion media query
  ok public/styles.css has @media (prefers-reduced-motion: reduce) block
B. the reduced-motion block cancels smooth scroll
  ok reduced-motion block sets html scroll-behavior: auto
C. the reduced-motion block makes .reveal visible and animation-free
  ok reduced-motion block styles .reveal
  ok reduced-motion block sets .reveal opacity: 1
  ok reduced-motion block sets .reveal transform: none
  ok reduced-motion block sets .reveal animation: none
D. npm test/ci wiring
  ok npm test runs the reduced-motion test
  ok npm run ci runs the reduced-motion test

8 checks, 0 failures
```

### Other acceptance commands

- `node --check scripts/test-public-reduced-motion.mjs` — exit 0
- `node scripts/test-public-theme-color.mjs` — exit 0, `80 checks, 0 failures`
- `node scripts/test-public-link-targets.mjs` — exit 0, `77 checks, 0 failures`
- `node scripts/test-public-heading-hierarchy.mjs` — exit 0, `148 checks, 0 failures`
- `npm test` — exit 0 (full chain, including the new reduced-motion test at `8 checks, 0 failures`)
- `gh pr list --repo nish3451/tinystudio-in --state open --head fix/lane1-reduced-motion-20260822` — PR #254 OPEN
