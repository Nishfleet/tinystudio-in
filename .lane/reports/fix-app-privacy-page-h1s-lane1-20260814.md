# Lane 1 report — tinystudio-in — app privacy page H1s

Branch: `fix/app-privacy-page-h1s-lane1-20260814`
Commit: `18673f2` — fix(public): replace submission-prep copy on app privacy page H1s
PR: https://github.com/nish3451/tinystudio-in/pull/141

## Item

App privacy page H1s still speak to App Store submission ("already public
ahead of release" / "already in place before launch").

## Change

Rewrote the submission-prep framing on both app privacy pages as
visitor-facing copy, in `public/promptly/privacy/index.html` and
`public/drishti/privacy/index.html`:

- H1: `Promptly’s privacy page is already public ahead of release.` →
  `Promptly privacy for bookings, reminders, and client data.`
- H1: `Drishti’s privacy page is already in place before launch.` →
  `Drishti privacy for mindful screen time.`
- Hero lead: no more "stay aligned with the final App Store privacy
  disclosures before release"; now describes what the page covers.
- "Current release scope" aside → "What this page covers" (no more "not
  publicly released yet" / "planned launch configuration").
- First card: "At launch" → "Advertising and tracking"; H2 drops "is
  planned"/"is disclosed here".
- "Important note": no more "App Store privacy answers should be updated
  before that version is submitted" — now "this page will be updated to
  describe it".

Heading levels, links, meta tags, chips, and JSON-LD unchanged.

## Verification

- No submission-prep strings remain on either page (grep clean).
- Public-surface tests all pass:
  heading-hierarchy (81 checks), link-targets (77), structured-data (127),
  social-preview (137), soft-404, deploy-bundle, conversion-signal,
  brand-disambiguation.
- `npm run ci` on this branch fails only at `check-retention-automation`,
  which is a pre-existing lane-independent failure: it hardcodes the
  canonical product repo `/home/nish/workspaces/products/tinystudio-in`
  and fails there on aggregate parity and workspace-staleness grounds —
  unrelated to these HTML edits (retention automation requires
  service-decisions/runs/service-engine records for 3 active clients, and
  a checkout at remote main).

## Notes

- History shows the same fix was authored on
  `fix/app-privacy-page-h1s-lane1-20260812` (2c2a36c) but that branch was
  never merged; origin/main still carries the old H1s.
- The Drishti card H2s here are H2 (62a5dfe heading-hierarchy baseline),
  not the H3s later used on the unmerged lane branches.
