// Guard the LIVE public site against missing social preview imagery: every
// one of the 12 public pages on tinystudio.in must declare the full
// og:image block and the matching twitter summary_large_image card.
//
// The static test (test-public-social-preview.mjs) only proves the repo files
// carry the meta tags; it cannot catch a stale deployment that still serves
// the old pages. This check hits the deployed site so a regression is
// detected the moment it ships. It is wired into `npm run ci` and a nightly
// workflow.
//
// Escape hatch for machines without network access:
//   SKIP_LIVE_CHECKS=1 npm run ci
//
// Only the live site name and the local family-to-image mapping are
// referenced here; there is no per-environment configuration.

if (process.env.SKIP_LIVE_CHECKS === "1") {
  console.log("check-public-live-social-preview: SKIP_LIVE_CHECKS=1, skipping live site checks")
  process.exit(0)
}

const SITE = "https://tinystudio.in"

// Every public page (canonical list, mirrors test-public-social-preview.mjs).
const PUBLIC_PAGES = [
  "/",
  "/contact/",
  "/promptly/",
  "/promptly/support/",
  "/promptly/privacy/",
  "/drishti/",
  "/drishti/support/",
  "/drishti/privacy/",
  "/support/",
  "/privacy/",
  "/privacy-choices/",
  "/terms/"
]

// Which social image each page family must carry.
const expectedImage = (page) =>
  page.startsWith("/promptly/")
    ? "promptly-social.png"
    : page.startsWith("/drishti/")
      ? "drishti-social.png"
      : "tiny-studio-social.png"

const metaOf = (html, name) => {
  const match = html.match(new RegExp(`<meta\\s+(?:name|property)="${name}"\\s+content="([^"]*)"`))
  return match ? match[1] : null
}

let failures = 0
let checks = 0
const ok = (cond, msg) => {
  checks++
  if (cond) console.log(`  ok ${msg}`)
  else {
    failures++
    console.error(`  FAIL ${msg}`)
  }
}

const fetchWithRetry = async (url, attempts = 2) => {
  let lastError
  for (let i = 0; i < attempts; i++) {
    try {
      const res = await fetch(url, { redirect: "follow", headers: { "user-agent": "tinystudio-social-preview-check" } })
      return { res, body: await res.text() }
    } catch (err) {
      lastError = err
      if (i < attempts - 1) await new Promise((r) => setTimeout(r, 1000))
    }
  }
  throw lastError
}

console.log("check-public-live-social-preview: every live public page must declare a social preview image")

let results
try {
  results = await Promise.all(
    PUBLIC_PAGES.map(async (page) => ({ page, ...(await fetchWithRetry(`${SITE}${page}`)) }))
  )
} catch (err) {
  console.error(`  FAIL could not reach ${SITE}: ${err.message}`)
  console.error("  (transient network problems and live deploy state both fail here; retry once manually before assuming a deploy issue)")
  process.exit(1)
}

for (const { page, res, body } of results) {
  ok(res.status === 200, `GET ${page} returns HTTP ${res.status}`)
  const image = metaOf(body, "og:image")
  ok(image !== null && image !== "", `${page} declares <meta og:image>`)
  if (image) {
    const imageUrl = `${SITE}/social/${expectedImage(page)}`
    ok(image === imageUrl, `${page} og:image points at ${expectedImage(page)}`)
    ok(metaOf(body, "og:image:secure_url") === image, `${page} og:image:secure_url matches og:image`)
    ok(metaOf(body, "og:image:type") === "image/png", `${page} og:image:type is image/png`)
    ok(metaOf(body, "og:image:width") === "1200", `${page} og:image:width is 1200`)
    ok(metaOf(body, "og:image:height") === "630", `${page} og:image:height is 630`)
    ok((metaOf(body, "og:image:alt") ?? "") !== "", `${page} has non-empty og:image:alt`)
    ok(metaOf(body, "twitter:card") === "summary_large_image", `${page} twitter:card is summary_large_image`)
    ok(metaOf(body, "twitter:image") === image, `${page} twitter:image matches og:image`)
    ok((metaOf(body, "twitter:image:alt") ?? "") !== "", `${page} has non-empty twitter:image:alt`)
  }
}

console.log("B. every referenced social image file is served")
try {
  const uniqueImages = [...new Set(PUBLIC_PAGES.map((page) => `${SITE}/social/${expectedImage(page)}`))]
  for (const url of uniqueImages) {
    const { res } = await fetchWithRetry(url)
    ok(res.status === 200, `GET ${url} returns HTTP ${res.status}`)
  }
} catch (err) {
  console.error(`  FAIL could not reach a social image: ${err.message}`)
  process.exit(1)
}

console.log(`\n${checks} checks, ${failures} failures`)
if (failures > 0) {
  console.error("\nThe live site is missing social preview imagery (or serving a stale bundle). Re-deploy the public site from origin/main and re-run this check.")
}
process.exit(failures === 0 ? 0 : 1)
