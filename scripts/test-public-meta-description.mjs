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

// The site's own SEO Fix Kit engine flags a meta description for tightening
// when it is shorter than 70 or longer than 165 characters (audit-engine.js).
const MIN_DESCRIPTION_LENGTH = 70
const MAX_DESCRIPTION_LENGTH = 165

const PAGE = "public/promptly/privacy/index.html"
const OLD_DESCRIPTION = "App-specific privacy policy for Promptly by Tiny Studio."

const metaTagsOf = (html) => [...html.matchAll(/<meta\b([^>]*)>/gi)].map((m) => m[1])
const attrOf = (tag, target) => {
  for (const m of tag.matchAll(/([a-zA-Z:]+)\s*=\s*"([^"]*)"/g)) {
    if (m[1] === target) return m[2]
  }
  return ""
}
const descriptionsOf = (html, key, value) =>
  metaTagsOf(html).filter((tag) => attrOf(tag, key) === value).map((tag) => attrOf(tag, "content"))

console.log("test-public-meta-description: /promptly/privacy meta description contract")

const html = read(PAGE)

console.log("A. primary meta description")
const primary = descriptionsOf(html, "name", "description")
ok(primary.length === 1, "page has exactly one name=description meta tag")
if (primary.length === 1) {
  const [description] = primary
  ok(description.length > 0, "description is not empty")
  ok(
    description.length >= MIN_DESCRIPTION_LENGTH && description.length <= MAX_DESCRIPTION_LENGTH,
    `description is ${description.length} characters, within the 70-165 SEO audit band`
  )
  ok(
    description !== OLD_DESCRIPTION,
    "description is not the 56-character text the SEO dogfood finding flagged"
  )
  ok(description.includes("Promptly"), "description is page-specific and names Promptly")
  ok(
    /not publicly released yet/i.test(description),
    "description reflects the page's current release status"
  )
}

console.log("B. social descriptions stay aligned")
for (const [key, value, label] of [
  ["property", "og:description", "og:description"],
  ["name", "twitter:description", "twitter:description"]
]) {
  const social = descriptionsOf(html, key, value)
  ok(social.length === 1, `page has exactly one ${label} meta tag`)
  ok(social.length === 1 && social[0] === primary[0], `${label} matches the primary description exactly`)
}

console.log("C. npm test/ci wiring")
const pkg = JSON.parse(read("package.json"))
ok(
  pkg.scripts.test.includes("test-public-meta-description.mjs"),
  "npm test runs the public meta description test"
)
ok(
  pkg.scripts.ci.includes("test-public-meta-description.mjs"),
  "npm run ci runs the public meta description test"
)
ok(pkg.scripts.check === "npm test", "npm run check delegates to npm test")

console.log(`\n${checks} checks, ${failures} failures`)
process.exit(failures === 0 ? 0 : 1)
