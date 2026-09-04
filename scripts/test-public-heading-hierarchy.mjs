#!/usr/bin/env node
// Deterministic regression for the public heading hierarchy of the audited
// public pages.
//
// Section A covers the four originally audited pages (contact, Promptly,
// Promptly privacy, Drishti). Section B covers the two content-card pages
// (Drishti support, Privacy choices) with the focused outline checks: each
// must expose a single H1 followed by H2 content-card headings inside <main>,
// before any footer headings. The old shape (H3 content cards directly beneath
// the H1) skipped the H2 level and fails this test.
//
// Section D pins the card-title CSS treatment: the H2 content-card headings
// must keep the former card-title visual treatment (card-scale font size,
// card margin, no global h2 12ch max-width cap) via a shared
// .info-card :is(h2, h3) rule.
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

// The exact public pages covered by the original heading-hierarchy finding.
const AFFECTED_PAGES = [
  "public/contact/index.html",
  "public/promptly/index.html",
  "public/promptly/privacy/index.html",
  "public/drishti/index.html"
]

// Heading levels in document order, e.g. [1, 2, 2, 3].
const headingLevelsOf = (html) =>
  [...html.matchAll(/<h([1-6])\b[^>]*>/gi)].map((m) => Number(m[1]))

console.log("test-public-heading-hierarchy: rendered heading outline on the audited public pages")

console.log("A. original finding pages")
for (const page of AFFECTED_PAGES) {
  const levels = headingLevelsOf(read(page))
  console.log(`A. ${page}`)
  ok(levels.length > 0, "page contains at least one heading")
  ok(levels.filter((l) => l === 1).length === 1, "page has exactly one H1")
  ok(levels[0] === 1, "the H1 is the first heading in the outline")
  let jumps = 0
  for (let i = 1; i < levels.length; i++) {
    if (levels[i] - levels[i - 1] > 1) {
      jumps++
      console.error(`    bad transition H${levels[i - 1]} -> H${levels[i]}`)
    }
  }
  ok(jumps === 0, "no heading-level jump greater than one (no H1 -> H3 skip)")
}

const CARD_TARGETS = [
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

console.log("B. content-card pages (focused outline)")
for (const target of CARD_TARGETS) {
  console.log(`B. ${target.name} (${target.path})`)
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

console.log("D. info-card card-title CSS treatment")
// The H2 content-card headings must not inherit the global section-title h2
// sizing (clamp(2.2rem, 4vw, 4.2rem)) or its 12ch max-width cap. A shared
// .info-card :is(h2, h3) rule must keep the former card h3 scale and margin.
const css = read("public/styles.css")
const cardRule = css.match(/\.info-card :is\(h2,\s*h3\)\s*\{([^}]*)\}/)
ok(Boolean(cardRule), "styles.css defines a shared .info-card :is(h2, h3) rule")
const cardRuleBody = cardRule?.[1] ?? ""
ok(
  /font-size:\s*clamp\(1\.65rem,\s*2vw,\s*2\.35rem\)/.test(cardRuleBody),
  "card-title font keeps the former card h3 scale (clamp(1.65rem, 2vw, 2.35rem))"
)
ok(/margin-top:\s*12px/.test(cardRuleBody), "card-title margin keeps the former card value (12px)")
ok(/max-width:\s*none/.test(cardRuleBody), "card-title has no max-width cap (global h2 12ch removed inside .info-card)")

console.log(`\n${checks} checks, ${failures} failures`)
process.exit(failures === 0 ? 0 : 1)
