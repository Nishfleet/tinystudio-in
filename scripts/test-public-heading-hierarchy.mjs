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

// The exact public pages covered by the heading-hierarchy finding.
const AFFECTED_PAGES = [
  "public/contact/index.html",
  "public/promptly/index.html",
  "public/promptly/privacy/index.html",
  "public/drishti/index.html",
  "public/drishti/support/index.html",
  "public/privacy-choices/index.html",
  "public/terms/index.html",
  "public/privacy/index.html",
  "public/drishti/privacy/index.html"
]

// Heading levels in document order, e.g. [1, 2, 2, 2, 2, 3, 3, 3].
const headingLevelsOf = (html) =>
  [...html.matchAll(/<h([1-6])\b[^>]*>/gi)].map((m) => Number(m[1]))

// Count <h2> used as .info-card card titles (inside <article class="info-card">).
const infoCardTitleCount = (html) =>
  (html.match(/<article class="info-card[^"]*"[^>]*>[\s\S]*?<h2\b/gi) || []).length

// The CSS rule that keeps card headings at the former h3 card-title scale
// regardless of h2 semantics, and lifts the global h2 12ch cap inside cards.
const CARD_HEADING_RULE = ".info-card :is(h2, h3) {"
const CARD_RULE_DECLARATIONS = [
  "margin-top: 12px",                              // former .info-card h3 margin
  "font-size: clamp(1.65rem, 2vw, 2.35rem)",       // former h3 card-title scale
  "max-width: none"                                // no 12ch cap inside cards
]

console.log("test-public-heading-hierarchy: card headings are semantic H2s with the former card scale")

for (const page of AFFECTED_PAGES) {
  const html = read(page)
  const levels = headingLevelsOf(html)
  console.log(`A. ${page}`)
  ok(levels.length > 0, "page contains at least one heading")
  ok(levels.filter((l) => l === 1).length === 1, "page has exactly one H1")
  ok(levels[0] === 1, "the H1 is the first heading in the outline")
  ok(infoCardTitleCount(html) === 3, "the three card headings are H2s inside .info-card articles")
  // Outline: H1 -> three H2 cards -> footer headings (footer H2 then H3s).
  const cardH2s = levels.filter((l) => l === 2).length
  ok(cardH2s >= 4, "card H2s plus the footer H2 keep a flat H2 band before the footer H3s")
  let jumps = 0
  for (let i = 1; i < levels.length; i++) {
    if (levels[i] - levels[i - 1] > 1) {
      jumps++
      console.error(`    bad transition H${levels[i - 1]} -> H${levels[i]}`)
    }
  }
  ok(jumps === 0, "no heading-level jump greater than one (no H1 -> H3 skip)")
}

console.log("B. card-heading CSS pairing")
const css = read("public/styles.css")
const ruleStart = css.indexOf(CARD_HEADING_RULE)
ok(ruleStart !== -1, `styles.css defines ${CARD_HEADING_RULE}`)
const ruleEnd = css.indexOf("}", ruleStart)
const ruleBody = ruleStart === -1 ? "" : css.slice(ruleStart, ruleEnd)
for (const decl of CARD_RULE_DECLARATIONS) {
  ok(ruleBody.includes(decl), `card rule keeps ${decl}`)
}
const globalH2 = css.match(/h2\s*{[^}]*}/)?.[0] ?? ""
ok(globalH2.includes("max-width: 12ch"), "global h2 styling (12ch cap) is untouched")
ok(
  !/\.info-card\s+h3\s*{/.test(css),
  "the old .info-card h3-only rule is replaced by the shared :is(h2, h3) rule"
)

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
