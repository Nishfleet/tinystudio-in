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
  "public/drishti/index.html"
]

// Heading levels in document order, e.g. [1, 2, 2, 3].
const headingLevelsOf = (html) =>
  [...html.matchAll(/<h([1-6])\b[^>]*>/gi)].map((m) => Number(m[1]))

console.log("test-public-heading-hierarchy: rendered heading outline on the four finding pages")

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
