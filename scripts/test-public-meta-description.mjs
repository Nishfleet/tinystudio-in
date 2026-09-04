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

// SEO Fix Kit's own rendered audit engine flags descriptions shorter than 70
// or longer than 165 characters ("Meta description needs tightening"), so the
// site's accepted range for a valid description is [70, 165].
const MIN_DESCRIPTION_LENGTH = 70
const MAX_DESCRIPTION_LENGTH = 165

const PRIVACY_HTML = "public/promptly/privacy/index.html"
const OLD_GENERIC_DESCRIPTION = "App-specific privacy policy for Promptly by Tiny Studio."

const html = read(PRIVACY_HTML)
const metaTags = [...html.matchAll(/<meta\b[^>]*>/gi)].map((m) => m[0])
const attrsOf = (tag) =>
  Object.fromEntries(
    [...tag.matchAll(/([a-zA-Z][a-zA-Z0-9-]*)\s*=\s*"([^"]*)"/g)].map((m) => [m[1].toLowerCase(), m[2]])
  )
const attrOf = (tag, name) => attrsOf(tag)[name.toLowerCase()] ?? ""

const descriptionTags = metaTags.filter((t) => attrOf(t, "name") === "description")
const ogDescriptionTags = metaTags.filter((t) => attrOf(t, "property") === "og:description")
const twitterDescriptionTags = metaTags.filter((t) => attrOf(t, "name") === "twitter:description")
const description = descriptionTags.length === 1 ? attrOf(descriptionTags[0], "content") : ""
const ogDescription = ogDescriptionTags.length === 1 ? attrOf(ogDescriptionTags[0], "content") : ""
const twitterDescription =
  twitterDescriptionTags.length === 1 ? attrOf(twitterDescriptionTags[0], "content") : ""

console.log("test-public-meta-description: Promptly privacy page meta description")

console.log("A. exactly one description meta per surface")
ok(descriptionTags.length === 1, "page has exactly one name=description meta")
ok(ogDescriptionTags.length === 1, "page has exactly one og:description meta")
ok(twitterDescriptionTags.length === 1, "page has exactly one twitter:description meta")

console.log("B. description length is within the site SEO audit threshold")
ok(
  description.length >= MIN_DESCRIPTION_LENGTH,
  `description is at least ${MIN_DESCRIPTION_LENGTH} chars (actual ${description.length})`
)
ok(
  description.length <= MAX_DESCRIPTION_LENGTH,
  `description is at most ${MAX_DESCRIPTION_LENGTH} chars (actual ${description.length})`
)

console.log("C. description is materially clearer than the previous generic text")
ok(description !== OLD_GENERIC_DESCRIPTION, "description is not the old generic 56-char text")
ok(/promptly/i.test(description), "description names the app (Promptly)")
ok(/privacy policy/i.test(description), "description states the page purpose (privacy policy)")

console.log("D. social descriptions stay aligned with the shared description")
ok(ogDescription === description, "og:description matches the description")
ok(twitterDescription === description, "twitter:description matches the description")

console.log("E. npm test/ci wiring")
const pkg = JSON.parse(read("package.json"))
ok(
  pkg.scripts.test.includes("test-public-meta-description.mjs"),
  "npm test runs the public meta description test"
)
ok(
  pkg.scripts.ci.includes("test-public-meta-description.mjs"),
  "npm run ci runs the public meta description test"
)

console.log(`\n${checks} checks, ${failures} failures`)
process.exit(failures === 0 ? 0 : 1)
