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

// The three content-card headings on each page must sit at H2, directly
// beneath the page H1 and before the footer headings. Copy is pinned so a
// heading edit that changes the visible text is caught as much as a level edit.
const PAGES = {
  "drishti support": {
    path: "public/drishti/support/index.html",
    cardHeadings: [
      "Ready for real support traffic.",
      "Everything a launch page needs nearby.",
      "Stable now, useful later."
    ]
  },
  "privacy choices": {
    path: "public/privacy-choices/index.html",
    cardHeadings: [
      "Ask what information may be involved.",
      "Use the same privacy inbox.",
      "The website itself is lightweight."
    ]
  }
}

const headingsOf = (html) => [...html.matchAll(/<h([1-3])\b/gi)].map((m) => Number(m[1]))
const headingTextsOf = (html) =>
  [...html.matchAll(/<h([1-3])\b[^>]*>([^<]*)<\/h\1>/gi)].map((m) => ({
    level: Number(m[1]),
    text: m[2].trim()
  }))

console.log("test-public-heading-hierarchy: H1-to-H2 heading outlines on Drishti support and Privacy Choices")

for (const [name, page] of Object.entries(PAGES)) {
  console.log(`A. ${name} outline`)
  const levels = headingsOf(read(page.path))
  const h1Index = levels.indexOf(1)
  ok(levels.filter((l) => l === 1).length === 1, `${name} has exactly one H1`)
  ok(h1Index !== -1, `${name} has an H1 to anchor the outline`)
  ok(levels[h1Index + 1] === 2, `${name} heading immediately after the H1 is H2 (no level skipped)`)
  ok(
    levels.slice(h1Index + 1, h1Index + 4).every((l) => l === 2),
    `${name} content-card headings are the three H2 levels directly beneath the H1`
  )
  for (let i = 1; i < levels.length; i++) {
    ok(
      levels[i] - levels[i - 1] <= 1,
      `${name} heading sequence never skips a level (h${levels[i - 1]} -> h${levels[i]})`
    )
  }

  console.log(`B. ${name} card copy preserved`)
  const byText = new Map(headingTextsOf(read(page.path)).map((h) => [h.text, h.level]))
  for (const text of page.cardHeadings) {
    ok(byText.get(text) === 2, `${name} card heading "${text}" stays an H2 with unchanged copy`)
  }
}

console.log("C. npm test/ci wiring")
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
