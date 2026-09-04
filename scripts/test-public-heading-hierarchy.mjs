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

const PAGES = [
  { name: "Drishti support", path: "public/drishti/support/index.html" },
  { name: "Privacy Choices", path: "public/privacy-choices/index.html" }
]

// Every heading level (1-6) in document order.
const headingsOf = (html) => [...html.matchAll(/<h([1-6])\b/gi)].map((m) => Number(m[1]))

// The content-card section and its headings, if the section exists.
const cardGridOf = (html) => {
  const match = html.match(/<section class="card-grid">([\s\S]*?)<\/section>/i)
  return match ? headingsOf(match[1]) : null
}

console.log("test-public-heading-hierarchy: public pages expose H1 then H2 content-card headings before footer headings")

for (const { name, path } of PAGES) {
  const html = read(path)
  const levels = headingsOf(html)
  const cardLevels = cardGridOf(html)

  console.log(`A. ${name}`)
  ok(levels.length > 0 && levels[0] === 1, `${name}: document starts with an H1`)
  ok(levels.filter((l) => l === 1).length === 1, `${name}: page has exactly one H1`)

  const h1Level = levels[0]
  const expectedCardLevel = h1Level + 1

  ok(cardLevels !== null, `${name}: page has a content-card section (card-grid)`)
  if (cardLevels !== null) {
    ok(cardLevels.length === 3, `${name}: content-card section holds exactly three headings`)
    ok(
      cardLevels.every((l) => l === expectedCardLevel),
      `${name}: all content-card headings sit directly beneath the page H1 (H${expectedCardLevel})`
    )
  }

  const footerIndex = html.search(/<footer\b/i)
  const cardGridIndex = html.search(/<section class="card-grid">/i)
  const footerLevels = headingsOf(html.slice(footerIndex >= 0 ? footerIndex : 0))
  ok(footerIndex > cardGridIndex, `${name}: content-card section precedes the footer`)
  ok(footerLevels.length > 0, `${name}: footer headings exist after the content cards`)
  ok(
    levels.every((level, index) => index === 0 || level <= levels[index - 1] + 1),
    `${name}: heading levels never skip (no jump from H1 straight to H3, etc.)`
  )
}

console.log("B. npm test/ci wiring")
const pkg = JSON.parse(read("package.json"))
ok(
  pkg.scripts.test.includes("test-public-heading-hierarchy.mjs"),
  "npm test runs the public heading hierarchy test"
)
ok(
  pkg.scripts.ci.includes("test-public-heading-hierarchy.mjs"),
  "npm run ci runs the public heading hierarchy test"
)

console.log(`\n${checks} checks, ${failures} failures`)
process.exit(failures === 0 ? 0 : 1)
