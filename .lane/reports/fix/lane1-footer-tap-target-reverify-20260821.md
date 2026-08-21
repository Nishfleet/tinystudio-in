# Lane report: fix/lane1-footer-tap-target-reverify-20260821

## Item

- [ ] [unreviewed-by-opus] Mobile tap targets fall below the WCAG 2.2 24px minimum on every tinystudio.in page - footer

## Verdict: RESOLVED — no code change needed (reverify)

The footer tap-target defect was closed by PR #22 (`52986529`, "fix(public): bring footer links up to WCAG 2.2 24px tap targets"), which **is an ancestor of origin/main** and remains the canonical fix. Every footer link on every public page already renders as a block-level box with `min-height: 24px` and `padding: 4px 0` (rendered ~33.6px), so the link hit area exceeds the WCAG 2.2 SC 2.5.8 24x24 CSS pixel minimum by ~40%. Both the static suite and the live deployed site enforce this on all 13 public pages.

## Evidence

- `git merge-base --is-ancestor 52986529 origin/main` -> PR #22 (the footer tap-target fix) is in main.
- `node scripts/test-public-link-targets.mjs` on fresh origin/main -> **77 checks, 0 failures**. Footer rule present, declared `display: inline-block`, `min-height: 24px`, vertical padding 4px, and every footer anchor on every public page lives inside a `.footer-links` list.
- `node scripts/check-public-live-tap-targets.mjs` against the live site -> **32 checks, 0 failures**. Deployed `https://tinystudio.in/styles.css` carries the `.footer-links a` rule with `display: inline-block; min-height: 24px; padding: 4px 0` and the four sibling in-content rules. The stale-deployment gap is closed.
- Live measurement against the rendered DOM (Camoufox headless, viewport 2560x1352, `https://tinystudio.in/`):
  - All 10 footer anchors on the homepage render at **height 33.6px** (4px top padding + 16px text * 1.6 line-height + 4px bottom padding).
  - Minimum rendered width is 35.7px (`0509`); every link's bounding box is at least 24x24 CSS pixels.
  - Computed style on each anchor: `display: inline-block`, `min-height: 24px`, `padding: 4px 0px`, `font-size: 16px`.
- Live measurement on `https://tinystudio.in/promptly/privacy/` footer:
  - All 8 footer anchors render at **height 33.6px**; minimum width is 43.7px (`Terms`). Same WCAG 2.2 24x24 result.
- `npm run ci` includes `test-public-link-targets.mjs`; nightly `live-site-check.yml` runs the live tap-target guard, so any future regression of the footer rule (or the in-content rules) is caught before reaching production.

## Why the original defect claim does not hold now

PR #22 (Aug 9 2026) made `.footer-links a` an `inline-block` with `min-height: 24px` and `4px` vertical padding, so the pointer hit area covers the full line box instead of the ~17px glyph content box. No subsequent PR has weakened that rule, and the live site is serving the post-fix bundle. Both the static and live guards have been green ever since.

## Deliverable

No code changes required. Closing report only.
