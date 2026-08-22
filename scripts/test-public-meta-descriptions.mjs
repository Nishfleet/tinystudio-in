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

// Every public page (canonical list, mirrors test-public-social-preview.mjs).
const PUBLIC_PAGES = [
  "public/index.html",
  "public/contact/index.html",
  "public/compare/index.html",
  "public/promptly/index.html",
  "public/promptly/support/index.html",
  "public/promptly/privacy/index.html",
  "public/drishti/index.html",
  "public/drishti/support/index.html",
  "public/drishti/privacy/index.html",
  "public/support/index.html",
  "public/privacy/index.html",
  "public/privacy-choices/index.html",
  "public/terms/index.html"
]

// Label-only descriptions that merely restate the page title ("Support page
// for Promptly by Tiny Studio.") were 38-57 characters. Every substantive
// description on the site today is at least 98 characters. 80 leaves a
// healthy margin on both sides.
const MIN_DESCRIPTION_LENGTH = 80
// Google truncates snippets around 160 characters; nothing on the site may
// exceed it.
const MAX_DESCRIPTION_LENGTH = 160

const titleOf = (html) => {
  const m = html.match(/<title>([^<]*)<\/title>/i)
  return m ? m[1].trim() : ""
}

const metaOf = (html, name) => {
  const match = html.match(new RegExp(`<meta\\s+(?:name|property)="${name}"\\s+content="([^"]*)"`))
  return match ? match[1] : null
}

console.log("test-public-meta-descriptions: every public page carries a substantive, synced meta description")

console.log("A. every public page has a substantive meta description")
for (const page of PUBLIC_PAGES) {
  const html = read(page)
  const title = titleOf(html)
  const description = metaOf(html, "description")
  ok(description !== null && description !== "", `${page} has a non-empty <meta name="description">`)
  if (description === null || description === "") continue
  ok(
    description.length <= MAX_DESCRIPTION_LENGTH,
    `${page} meta description is ${description.length} chars (max ${MAX_DESCRIPTION_LENGTH})`
  )
  ok(
    description.length >= MIN_DESCRIPTION_LENGTH,
    `${page} meta description is ${description.length} chars (label-only floor is ${MIN_DESCRIPTION_LENGTH})`
  )
  ok(
    description !== title && title !== "",
    `${page} meta description does not merely restate the page title`
  )
}

console.log("B. og:description and twitter:description stay in sync with the meta description")
for (const page of PUBLIC_PAGES) {
  const html = read(page)
  const description = metaOf(html, "description")
  const og = metaOf(html, "og:description")
  const twitter = metaOf(html, "twitter:description")
  ok(og !== null && og !== "", `${page} has a non-empty <meta property="og:description">`)
  ok(twitter !== null && twitter !== "", `${page} has a non-empty <meta name="twitter:description">`)
  if (description !== null && og !== null) {
    ok(og === description, `${page} og:description matches the meta description`)
  }
  if (description !== null && twitter !== null) {
    ok(twitter === description, `${page} twitter:description matches the meta description`)
  }
}

console.log("C. npm test/ci wiring")
const pkg = JSON.parse(read("package.json"))
ok(
  pkg.scripts.test.includes("test-public-meta-descriptions.mjs"),
  "npm test runs the public meta descriptions test"
)
ok(
  pkg.scripts.ci.includes("test-public-meta-descriptions.mjs"),
  "npm run ci runs the public meta descriptions test"
)

console.log(`\n${checks} checks, ${failures} failures`)
process.exit(failures === 0 ? 0 : 1)
