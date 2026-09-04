import { readFileSync } from "node:fs"
import { fileURLToPath } from "node:url"
import { dirname, join } from "node:path"

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..")
const read = (p) => readFileSync(join(ROOT, p), "utf8")

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

const PAGE = "public/promptly/privacy/index.html"

// The site's search-trust layer audits every public page for a useful meta
// description. Common SEO guidance (Google snippet guidance and
// Yoast-style description checks) treats roughly 70-160 characters as the
// recommended range; the previous 56-character description sat below it.
const MIN_DESCRIPTION_LENGTH = 70
const MAX_DESCRIPTION_LENGTH = 160

const metasOf = (html, pattern) => [...html.matchAll(pattern)].map((m) => m[0])
const contentOf = (meta) => {
  const m = meta.match(/content\s*=\s*"([^"]*)"/i)
  return m ? m[1] : ""
}

console.log("test-public-meta-description: Promptly privacy page meta description")

const html = read(PAGE)

console.log("A. page meta description")
const descriptions = metasOf(html, /<meta\b[^>]*name="description"[^>]*>/gi)
ok(descriptions.length === 1, "exactly one name=description meta tag")
const description = descriptions.length === 1 ? contentOf(descriptions[0]) : ""
ok(description.length > 0, "meta description is not empty")
ok(
  description.length >= MIN_DESCRIPTION_LENGTH,
  `meta description is at least ${MIN_DESCRIPTION_LENGTH} characters (got ${description.length})`
)
ok(
  description.length <= MAX_DESCRIPTION_LENGTH,
  `meta description is at most ${MAX_DESCRIPTION_LENGTH} characters (got ${description.length})`
)
ok(/promptly/i.test(description), "meta description names the app the page belongs to (Promptly)")
ok(/privacy/i.test(description), "meta description identifies the page as the privacy policy")
ok(
  /not publicly released yet/i.test(description),
  "meta description states the current release status (Promptly is not publicly released yet)"
)
for (const token of ["$", /guarantee/i, /ranking/i]) {
  ok(
    typeof token === "string" ? !description.includes(token) : !token.test(description),
    `meta description avoids invented claims (${token})`
  )
}

console.log("B. social descriptions stay aligned with the page description")
const ogDescriptions = metasOf(html, /<meta\b[^>]*property="og:description"[^>]*>/gi)
ok(ogDescriptions.length === 1, "exactly one og:description meta tag")
const ogDescription = ogDescriptions.length === 1 ? contentOf(ogDescriptions[0]) : ""
ok(ogDescription.length > 0, "og:description is not empty")
ok(ogDescription === description, "og:description matches the page description")
const twitterDescriptions = metasOf(html, /<meta\b[^>]*name="twitter:description"[^>]*>/gi)
ok(twitterDescriptions.length === 1, "exactly one twitter:description meta tag")
const twitterDescription = twitterDescriptions.length === 1 ? contentOf(twitterDescriptions[0]) : ""
ok(twitterDescription.length > 0, "twitter:description is not empty")
ok(twitterDescription === description, "twitter:description matches the page description")

console.log("C. npm test/ci wiring")
const pkg = JSON.parse(read("package.json"))
ok(
  pkg.scripts.test.includes("test-public-meta-description.mjs"),
  "npm test runs the public meta description test"
)
ok(
  pkg.scripts.check === "npm test",
  "npm run check delegates to npm test"
)
ok(
  pkg.scripts.ci.includes("test-public-meta-description.mjs"),
  "npm run ci runs the public meta description test"
)

console.log(`\n${checks} checks, ${failures} failures`)
process.exit(failures === 0 ? 0 : 1)
