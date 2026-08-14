# Lane 1 report — remove internal editorial/submission-prep copy from public app pages

Branch: `fix/remove-submission-prep-copy-privacy-pages`
Date: 2026-08-14

## What the item meant

The fleet item says "internal editorial and submission-prep notes are live as
visible copy on four public app pages." On current main, the four product and
support pages were already cleaned up by PR #28 (e71a689). The live leak on
main is on the two **app privacy pages**:

- `public/promptly/privacy/index.html`
- `public/drishti/privacy/index.html`

Both carried submission-prep voice as visitor-facing copy:
- H1s: "Promptly's privacy page is already public ahead of release." /
  "Drishti's privacy page is already in place before launch."
- Hero lead: "reflects the current planned launch scope and should stay
  aligned with the final App Store privacy disclosures before release."
- Aside: "Current release scope" / "not publicly released yet" /
  "currently planned launch configuration."
- First card eyebrow: "At launch" / "...is planned."
- "Important note" section: "both this page and the App Store privacy answers
  should be updated before that version is submitted."

These are internal submission-prep notes (App Store Connect language,
launch-calendar self-commentary) published as visible copy. Several sibling
lanes had previously attempted this same fix on unmerged branches
(fix/app-privacy-page-h1s*, fix/public-app-copy-internal-notes-privacy-pages,
fix/public-app-pages-editorial-copy-voice-lane1); none ever merged to main.

## What I changed

Rewrote the leaked passages on both privacy pages as visitor-facing policy
copy that describes what data each app handles, how it is used, and the
choices available — without referencing the internal submission process.
Heading levels, links, meta tags, chips, and JSON-LD are unchanged.

## Verification

Full-scan of every public page for prep-note phrases
(already|in the meantime|current build|submission|before release|not
publicly released|planned launch|launch scope|ahead of release|before
launch|before that version is submitted|for submission|ready for
submission|launch day|future launch|current release scope|At launch|submitted):
0 hits on all 13 public pages.

Public-site test suites (all green):
- heading hierarchy: 89 checks, 0 failures
- structured data: 127 checks, 0 failures
- link targets: 77 checks, 0 failures
- brand disambiguation: 11 checks, 0 failures
- conversion signal: 126 checks, 0 failures
- soft-404: 19 checks, 0 failures

## Files touched

- `public/promptly/privacy/index.html` — rewrote leaked submission-prep copy
- `public/drishti/privacy/index.html` — rewrote leaked submission-prep copy
