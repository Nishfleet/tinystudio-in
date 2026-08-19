# Lane 1 report — internal editorial and submission-prep notes live as visible copy on four public app pages

- Item: `[unreviewed-by-opus] Internal editorial and submission-prep notes are live as visible copy on four public app pages`
- Item ID: `de469a3800`
- Branch: `fix/lane1-submission-prep-notes-visible-copy`
- Commit: `2dc939f fix(public): replace internal submission-prep notes on four pages`
- Date: 2026-08-17

## What was live

Four tinystudio.in pages in `public/` carried internal editorial and
submission-prep notes as visible copy:

1. `public/promptly/privacy/index.html`
   - H1: "Promptly's privacy page is already public ahead of release."
   - Lead: "reflects the current planned launch scope and should stay
     aligned with the final App Store privacy disclosures before release"
   - Aside "Current release scope": "Promptly is not publicly released
     yet." / "This page reflects the currently planned launch
     configuration."
   - Card eyebrow "At launch".
   - "Important note" telling visitors both this page and the App Store
     privacy answers "should be updated before that version is submitted".

2. `public/drishti/privacy/index.html` — same pattern ("already in place
   before launch", "current planned launch scope", "current release
   scope", "not publicly released yet", "at launch", "should be updated
   before that version is submitted").

3. `public/terms/index.html`
   - "Product-specific terms can be expanded later if a released app
     needs them."
   - "Content may change as products are updated or launched."
   - "...as new releases are prepared or existing products change."

4. `public/privacy/index.html` (studio privacy hub)
   - "so App Store metadata can point to a more specific policy"
   - "so their App Store privacy disclosures can stay connected to
     app-specific public documentation"

## What changed

Rewrote the internal-notes passages as visitor-facing copy describing
what each page covers and how information is used, deleting every
reference to the internal launch calendar, release scope, planned launch
configuration, and App Store submission process. Heading levels, links,
meta tags, chips, and JSON-LD are unchanged (heading hierarchy, link
targets, structured data, and social-preview geometry are intact).

- Promptly privacy: H1 "Promptly privacy for bookings, reminders, and
  client data."; lead explains what data Promptly handles; aside "What
  this page covers"; card eyebrow "Advertising and tracking"; important
  note now says the page will be updated if new services are added.
- Drishti privacy: H1 "Drishti privacy for mindful screen time."; same
  visitor-facing rewrite pattern.
- Terms: lead now says each app may publish its own terms if needed;
  scope bullet and use-of-site paragraph no longer reference "releases
  are prepared" / "a released app needs them".
- Privacy hub: app-policy passages now describe that each app has a
  dedicated page describing that app's data handling.

## Validation

- `git diff --check`: clean
- `node scripts/test-public-conversion-signal.mjs`: PASS
- `node scripts/test-public-structured-data.mjs`: PASS
- `node scripts/test-public-brand-disambiguation.mjs`: PASS
- `node scripts/test-public-heading-hierarchy.mjs`: PASS
- `node scripts/test-public-link-targets.mjs`: PASS
- `node scripts/test-public-social-preview.mjs`: PASS
- `node scripts/test-public-soft-404.mjs`: PASS
- `node scripts/test-public-deploy-bundle.mjs`: PASS

Fresh sweep of `public/` for `launch scope|launch configuration|release
scope|not publicly released|ahead of release|before launch|should be
updated before|is submitted|releases are prepared|a released app
needs|App Store metadata` returns zero matches.

## Notes

- A prior lane authored the same two-page privacy rewrite on branch
  `fix/remove-submission-prep-copy-privacy-pages` (commits `04e635d` /
  `fc95af9`) but it was never merged; main's two app privacy pages were
  byte-identical to that branch's pre-image, so this branch applies the
  same already-validated rewrite and goes further to cover the terms
  page and the studio privacy hub (the other two pages of the four).
- The live tinystudio.in deployment still serves stale content (old
  footer "clean public foundation before launch", old privacy hero
  copy) because deploys are blocked on the missing Cloudflare token
  documented by prior lane reports; the source fix on main is the
  durable fix and will surface once deploys resume.