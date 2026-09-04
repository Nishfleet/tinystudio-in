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

// Deterministic regression for the Promptly privacy page meta description.
// The site's SEO audit band (SEO Fix Kit audit engine) flags descriptions
// shorter than 70 characters or longer than 165 characters. The wording is
// source-bound to the page's own copy: the page is the app-specific privacy
// destination for Promptly (page lead), is public ahead of release (H1), and
// its cards describe professional, client, and support data.
const PAGE = "public/promptly/privacy/index.html"
const EXPECTED_DESCRIPTION =
  "How Promptly by Tiny Studio handles professional, client, and support data — an app-specific privacy policy published ahead of release."
const MIN_CHARS = 70
const MAX_CHARS = 165

const forbidden = [
  "$", "price", "pricing", "rank", "guarantee", "best", "secure", "encrypted",
  "compliant", "GDPR", "CCPA", "analytics", "dependencies"
]

const contentOf = (tag) => {
  const m = tag.match(/content\s*=\s*"([^"]*)"/i)
  return m ? m[1] : ""
}

console.log("test-public-meta-description: Promptly privacy page meta description (public/promptly/privacy/index.html)")

const html = read(PAGE)

console.log("A. exactly one description meta per variant")
const plain = [...html.matchAll(/<meta\s+name\s*=\s*"description"[^>]*>/gi)].map((m) => m[0])
ok(plain.length === 1, "exactly one name=description meta")
const og = [...html.matchAll(/<meta\s+property\s*=\s*"og:description"[^>]*>/gi)].map((m) => m[0])
ok(og.length === 1, "exactly one property=og:description meta")
const twitter = [...html.matchAll(/<meta\s+name\s*=\s*"twitter:description"[^>]*>/gi)].map((m) => m[0])
ok(twitter.length === 1, "exactly one name=twitter:description meta")

console.log("B. description is the expected, source-bound wording")
const description = plain.length === 1 ? contentOf(plain[0]) : ""
ok(description === EXPECTED_DESCRIPTION, "name=description matches the expected wording")
ok(description.includes("Promptly by Tiny Studio"), "description names the app truthfully")
ok(description.includes("app-specific") && description.includes("privacy policy"), "description states the page is the app-specific privacy policy")
ok(description.includes("ahead of release"), "description states the page is public ahead of release (matches page copy)")
ok(/professional, client, and support data/.test(description), "description names the data areas covered by the page cards")

console.log("C. description is within the site's SEO audit band")
ok(description.length >= MIN_CHARS, `description is at least ${MIN_CHARS} chars (got ${description.length})`)
ok(description.length <= MAX_CHARS, `description is at most ${MAX_CHARS} chars (got ${description.length})`)

console.log("D. description invents no claims")
for (const token of forbidden) {
  ok(!description.toLowerCase().includes(token.toLowerCase()), `description has no invented claim token (${token})`)
}

console.log("E. social descriptions stay aligned with the description")
const ogDesc = og.length === 1 ? contentOf(og[0]) : ""
const twDesc = twitter.length === 1 ? contentOf(twitter[0]) : ""
ok(ogDesc === description, "og:description matches name=description exactly")
ok(twDesc === description, "twitter:description matches name=description exactly")

console.log("F. npm test wiring")
const pkg = JSON.parse(read("package.json"))
ok(pkg.scripts.test.includes("test-public-meta-description.mjs"), "npm test runs the public meta description test")

console.log(`\n${checks} checks, ${failures} failures`)
process.exit(failures === 0 ? 0 : 1)
