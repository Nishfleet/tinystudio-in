// Guard the LIVE tinystudio.in against the missing social preview imagery
// that was repaired in source but still ships on the deployed site.
//
// The class-gap item "Social preview imagery missing on 7 of 12 public
// pages" (the 7 pages being /privacy/, /privacy-choices/, /terms/, and the
// Promptly/Drishti support+privacy pairs) was repaired in source by PR #26
// (commit ffe6e1f), and scripts/test-public-social-preview.mjs guards the
// worktree HTML. This check re-asserts the full og:image + twitter:image
// blocks against what the live site actually serves, so a stale deployment
// (the June-20 bundle still serving 5 of 12 pages with no social preview
// imagery) fails loudly instead of silently re-opening the finding.
//
// It runs as `npm run site:check-live-social-preview`, from the nightly
// live-site-check workflow (the loud staleness alarm while the site is
// stale) and on demand. It is deliberately NOT part of `npm run test` /
// `npm run ci`: those blocking chains must stay green on repo state alone,
// while the live site is deployed by an external mechanism (Cloudflare
// Pages). Blocking CI on the live site would keep every pull request red
// whenever the deployment is stale, and would deadlock the deploy lane's
// pre-deploy `npm run check` gate.
//
// Network-tolerant: a page or image that is unreachable is skipped (ok, no
// assertion); a page that is reachable but stale fails loudly.
//
// Escape hatch for machines without network access:
//   SKIP_LIVE_CHECKS=1 npm run site:check-live-social-preview
//
// Only public tinystudio.in URLs and the local source files are referenced
// here; there is no per-environment configuration.
import { readFileSync } from "node:fs"
import { fileURLToPath } from "node:url"
import { dirname, join } from "node:path"

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..")
const read = (p) => readFileSync(join(ROOT, p), "utf8")

if (process.env.SKIP_LIVE_CHECKS === "1") {
  console.log("check-public-live-social-preview: SKIP_LIVE_CHECKS=1, skipping live site checks")
  process.exit(0)
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

// Every public page (canonical list, mirrors scripts/test-public-social-preview.mjs).
const PUBLIC_PAGES = [
  { name: "Homepage", path: "", image: "tiny-studio-social.png" },
  { name: "Contact", path: "contact/", image: "tiny-studio-social.png" },
  { name: "Promptly", path: "promptly/", image: "promptly-social.png" },
  { name: "Promptly support", path: "promptly/support/", image: "promptly-social.png" },
  { name: "Promptly privacy", path: "promptly/privacy/", image: "promptly-social.png" },
  { name: "Drishti", path: "drishti/", image: "drishti-social.png" },
  { name: "Drishti support", path: "drishti/support/", image: "drishti-social.png" },
  { name: "Drishti privacy", path: "drishti/privacy/", image: "drishti-social.png" },
  { name: "Studio support", path: "support/", image: "tiny-studio-social.png" },
  { name: "Privacy", path: "privacy/", image: "tiny-studio-social.png" },
  { name: "Privacy choices", path: "privacy-choices/", image: "tiny-studio-social.png" },
  { name: "Terms", path: "terms/", image: "tiny-studio-social.png" }
]

const BASE = "https://tinystudio.in"
const imageUrl = (file) => `${BASE}/social/${file}`
const FETCH_TIMEOUT_MS = 10_000

const metaOf = (html, name) => {
  const match = html.match(new RegExp(`<meta\\s+(?:name|property)="${name}"\\s+content="([^"]*)"`))
  return match ? match[1] : null
}

const fetchLive = async (url) => {
  try {
    const res = await fetch(url, { signal: AbortSignal.timeout(FETCH_TIMEOUT_MS) })
    if (!res.ok) {
      console.log(`  ok skipped: ${url} answered ${res.status}, deployment not reachable - no assertions run for it`)
      return null
    }
    return await res.text()
  } catch (err) {
    console.log(`  ok skipped: ${url} unreachable (${err?.cause?.code ?? err?.name ?? "network error"}) - no assertions run for it`)
    return null
  }
}

console.log("check-public-live-social-preview: every deployed tinystudio.in page keeps its social preview imagery")

console.log("A. every live public page declares the complete og:image block")
for (const page of PUBLIC_PAGES) {
  const html = await fetchLive(`${BASE}/${page.path}`)
  if (html === null) continue
  const expected = imageUrl(page.image)
  const image = metaOf(html, "og:image")
  ok(image === expected, `live /${page.path} og:image points at ${page.image}`)
  if (image !== null) {
    ok(metaOf(html, "og:image:secure_url") === image, `live /${page.path} og:image:secure_url matches og:image`)
    ok(metaOf(html, "og:image:type") === "image/png", `live /${page.path} og:image:type is image/png`)
    ok(metaOf(html, "og:image:width") === "1200", `live /${page.path} og:image:width is 1200`)
    ok(metaOf(html, "og:image:height") === "630", `live /${page.path} og:image:height is 630`)
    ok((metaOf(html, "og:image:alt") ?? "") !== "", `live /${page.path} has non-empty og:image:alt`)
  }
}

console.log("B. every live public page declares the matching twitter image card")
for (const page of PUBLIC_PAGES) {
  const html = await fetchLive(`${BASE}/${page.path}`)
  if (html === null) continue
  ok(metaOf(html, "twitter:card") === "summary_large_image", `live /${page.path} twitter:card is summary_large_image`)
  ok(metaOf(html, "twitter:image") === imageUrl(page.image), `live /${page.path} twitter:image matches og:image`)
}

console.log("C. every referenced social image is served")
for (const file of ["tiny-studio-social.png", "promptly-social.png", "drishti-social.png"]) {
  const url = imageUrl(file)
  const res = await fetch(url, { signal: AbortSignal.timeout(FETCH_TIMEOUT_MS) }).catch(() => null)
  if (res === null) {
    console.log(`  ok skipped: ${url} unreachable - no assertion run for it`)
  } else {
    ok(res.ok, `${url} is served (${res.status})`)
  }
}

if (failures > 0) {
  console.error("    the deployed site is stale: it misses the social preview imagery that public/ already has on every page. Refresh the live deployment from origin/main.")
}

console.log("\nLive social-preview guard result: the finding stays open against tinystudio.in until a refresh of the live deployment lands on origin/main.")
console.log(`\n${checks} checks, ${failures} failures`)
process.exit(failures === 0 ? 0 : 1)
