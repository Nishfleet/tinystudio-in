#!/usr/bin/env node
// Deterministic regression for the public heading hierarchy of the two
// content-card pages: Drishti support and Privacy choices.
//
// Each page must expose a single H1 followed by H2 content-card headings
// inside <main>, before any footer headings. The old shape (H3 content cards
// directly beneath the H1) skipped the H2 level and fails this test.
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

const TARGETS = [
  {
    name: "Drishti support",
    path: "public/drishti/support/index.html",
    cardHeadings: [
      "Ready for real support traffic.",
      "Everything a launch page needs nearby.",
      "Stable now, useful later."
    ]
  },
  {
    name: "Privacy choices",
    path: "public/privacy-choices/index.html",
    cardHeadings: [
      "Ask what information may be involved.",
      "Use the same privacy inbox.",
      "The website itself is lightweight."
    ]
  }
]

for (const target of TARGETS) {
  console.log(`\n${target.name} (${target.path})`)
  const html = read(target.path)
  const main = html.match(/<main\b[^>]*>([\s\S]*?)<\/main>/i)?.[1] ?? ""
  const mainLevels = [...main.matchAll(/<h([1-6])\b/gi)].map((m) => Number(m[1]))
  const mainH1s = mainLevels.filter((level) => level === 1).length
  const mainH3s = mainLevels.filter((level) => level === 3).length

  ok(mainH1s === 1, "main must contain exactly one H1")
  ok(mainH3s === 0, "main must not contain H3 headings that skip the H2 level")
  ok(
    mainLevels.length === 1 + target.cardHeadings.length &&
      mainLevels[0] === 1 &&
      mainLevels.slice(1).every((level) => level === 2),
    `main outline must be H1 followed by ${target.cardHeadings.length} H2 content-card headings`
  )

  // The H2 content-card headings live in the card-grid section.
  const cardGrid = html.match(/<section class="card-grid">([\s\S]*?)<\/section>/)?.[1] ?? ""
  const cardLevels = [...cardGrid.matchAll(/<h([1-6])\b/gi)].map((m) => Number(m[1]))
  ok(
    cardLevels.length === target.cardHeadings.length && cardLevels.every((level) => level === 2),
    "card-grid must hold only H2 content-card headings"
  )

  // Visible copy of the three content-card headings is preserved.
  const cardHeadingTexts = [...cardGrid.matchAll(/<h2>([^<]+)<\/h2>/g)].map((m) => m[1].trim())
  ok(
    JSON.stringify(cardHeadingTexts) === JSON.stringify(target.cardHeadings),
    "content-card heading copy must be unchanged"
  )

  // Footer headings still follow the main content, unchanged.
  const footer = html.match(/<footer\b[^>]*>([\s\S]*?)<\/footer>/i)?.[1] ?? ""
  ok(/<h2\b/.test(footer) && /<h3\b/.test(footer), "footer heading outline must remain intact")
}

console.log("\nnpm test/ci wiring")
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
