# Lane report: fix/lane1-privacy-h1s

Item: App privacy page H1s still speak to App Store submission ("already public ahead of release" / "already in place before launch")

## Outcome

Fixed. PR #171: https://github.com/nish3451/tinystudio-in/pull/171

## What was wrong

Both app privacy pages had H1s that were meta-commentary about submission timing rather than describing the policy:

- `public/promptly/privacy/index.html` — "Promptly's privacy page is already public ahead of release."
- `public/drishti/privacy/index.html` — "Drishti's privacy page is already in place before launch."

Every other H1 on the site describes what the page is (e.g. "The studio privacy center for Tiny Studio.", "Website terms for Tiny Studio's public pages."). The privacy H1s were the only ones framed around App Store release status.

## Change

- `public/promptly/privacy/index.html` — H1 now "Promptly's privacy policy, before and after launch."
- `public/drishti/privacy/index.html` — H1 now "Drishti's privacy policy, before and after launch."

## Verification

- `node scripts/test-public-heading-hierarchy.mjs` — 62 checks, 0 failures
- `node scripts/test-public-link-targets.mjs` — passed
- `node scripts/test-public-structured-data.mjs` — 127 checks, 0 failures
- `node scripts/test-public-social-preview.mjs` — 137 checks, 0 failures
- `node scripts/test-public-conversion-signal.mjs` — 126 checks, 0 failures
- `git diff --check` clean

## Notes

The live site still serves the stale copy (deploy is blocked on a missing Cloudflare token per prior lane reports); the source fix is ready to go live once deploy runs.
