// Single source of truth for the tinystudio.in public page set.
//
// Every consumer that needs to know "what are all the public pages" must
// import from here instead of hard-coding its own list:
//   - scripts/prepare-static-site-bundle.mjs (bundle generator + its
//     llms.txt coverage assertion)
//   - scripts/check-public-live-deploy.mjs (release-lane live verifier)
//   - scripts/check-public-live-soft-404.mjs (nightly stale-bundle net)
//
// Drift between these lists is how the live llms.txt ended up listing only
// 7 of the 12 public URLs (the five per-app support/privacy trust pages
// were missing from the June-20 bundle). Keep the lists in sync here only.

export const PUBLIC_HTML_FILES = [
  "index.html",
  "404.html",
  "support/index.html",
  "contact/index.html",
  "website-correction/index.html",
  "privacy/index.html",
  "privacy/index.html",
  "privacy-choices/index.html",
  "terms/index.html",
  "promptly/index.html",
  "promptly/support/index.html",
  "promptly/privacy/index.html",
  "drishti/index.html",
  "drishti/support/index.html",
  "drishti/privacy/index.html",
]

export const pageUrlFor = (relativeFile) =>
  relativeFile === "index.html"
    ? "https://tinystudio.in/"
    : `https://tinystudio.in/${relativeFile.split("/").slice(0, -1).join("/")}/`

// The 12 canonical public URLs (every page except the 404 catch-all).
export const PUBLIC_PAGE_URLS = PUBLIC_HTML_FILES.filter(
  (relativeFile) => relativeFile !== "404.html"
).map(pageUrlFor)

// Assert that llms.txt content lists every public page; returns the
// missing URLs (empty array when coverage is complete).
export const missingFromLlmsTxt = (content) =>
  PUBLIC_PAGE_URLS.filter((url) => !content.includes(url))
