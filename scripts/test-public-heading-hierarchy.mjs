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

// Public pages whose content-card headings must sit directly beneath the page H1
// (H2), with footer headings only after them. Deterministic: regex over the
// committed HTML, no network, no fixtures.
const PAGES = [
  ["public/drishti/support/index.html", "Drishti support"],
  ["public/privacy-choices/index.html", "Privacy choices"]
]

const headingLevelsOf = (html) => [...html.matchAll(/<h([1-6])\b[^>]*>/gi)].map((m) => Number(m[1]))
const infoCardHeadingsOf = (html) =>
  [...html.matchAll(/<article\b[^>]*class="[^"]*\binfo-card\b[^"]*"[^>]*>([\s\S]*?)<\/article>/gi)]
    .map((m) => Number(m[1].match(/<h([1-6])\b/i)?.[1] ?? 0))

console.log("test-public-heading-hierarchy: content-card headings sit directly beneath each page H1")

for (const [path, label] of PAGES) {
  console.log(`A. ${label} (${path})`)
  const html = read(path)
  const [beforeFooter, footer] = html.split(/<footer\b/i)
  const outline = headingLevelsOf(html)
  const cardHeadings = infoCardHeadingsOf(beforeFooter)
  const footerHeadings = headingLevelsOf(footer ?? "")
  const h1Index = outline.indexOf(1)
  const firstCardIndex = cardHeadings.length > 0 ? outline.indexOf(cardHeadings[0], h1Index) : -1
  const firstFooterIndex = footerHeadings.length > 0 ? outline.length - footerHeadings.length : -1

  ok(outline.filter((level) => level === 1).length === 1, "the page has exactly one H1")
  ok(outline[0] === 1, "the H1 is the first heading")
  ok(
    outline.slice(h1Index + 1).indexOf(2) === 0,
    "an H2 is the first heading after the H1"
  )
  ok(cardHeadings.length === 3, "the page has three content-card headings")
  ok(
    cardHeadings.every((level) => level === 2),
    "every content-card heading is H2"
  )
  ok(
    firstCardIndex >= 0 && firstFooterIndex >= 0 && firstCardIndex + cardHeadings.length - 1 < firstFooterIndex,
    "all content-card headings come before the footer headings"
  )
  ok(
    outline.every((level, index) => index === 0 || level <= outline[index - 1] + 1),
    "no heading level skips a step in the page outline"
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
