# Lane report: fix/lane1-in-content-link-targets-reverify-20260821

## Item

- [ ] [unreviewed-by-opus] In-content links stay below the WCAG 2.2 24px tap-target minimum — merged PR #22 fixes only .

## Verdict: RESOLVED — no code change needed (reverify)

PR #22 (`5298652`) fixed only footer links; the in-content gap it left was closed by PR #25 (`b0f5f06`, "bring in-content links up to WCAG 2.2 24px tap targets"), which **is an ancestor of origin/main**. Both the static suite and the live deployed site now enforce the 24px minimum on every in-content link (top-nav, plain-list, product-links, rail-item strong a, footer-links) across all 13 public pages.

## Evidence

- `git merge-base --is-ancestor b0f5f06 origin/main` → PR #25 in main; `5298652` (PR #22) also in main
- `node scripts/test-public-link-targets.mjs` on fresh origin/main → **77 checks, 0 failures** (sections A–E: every in-content link covered by a styled container, every container rule enforces block-level box + `min-height: 24px` + ≥4px vertical padding, npm test/ci wiring)
- `node scripts/check-public-live-tap-targets.mjs` against the live site → **32 checks, 0 failures** (deployed `https://tinystudio.in/styles.css` carries all five tap-target rules; live pages serve the fixed bundle). The stale-deployment gap documented in the prior lane (PR #152 report, 2026-08-14) is closed.
- Live site reachable: `https://tinystudio.in/` and `/promptly/privacy/` both HTTP 200; live CSS contains 5 `min-height: 24px` rules.
- `npm run ci` includes `test-public-link-targets.mjs`; nightly `live-site-check.yml` runs the live tap-target guard, so regression is caught going forward.

## Deliverable

No code changes required. Closing report only.
