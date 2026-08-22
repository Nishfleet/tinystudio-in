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

console.log("test-public-compare-page: Website Correction offer-shape hub")

const html = read("public/compare/index.html")

const required = [
  "The Website Correction",
  "$1,000 founder pilot",
  "one highest-leverage page",
  "We do not guarantee revenue, ranking, ROAS, conversion, booked-call, or sales-volume outcomes.",
  "https://tinystudio.in/compare/",
  'href="/contact/#website-correction-application"',
  "https://100signals.com/best-marketing-agencies-for-managed-service-providers/",
  "https://c4solutionsllc.com/msp-marketing-agencies-the-complete-comparison-guide-for-2026/",
  "https://digital1010.com/insights/best-msp-marketing-agencies",
  "https://martal.ca/msp-marketing-agencies/",
  "https://filament.digital/best-msp-marketing-agencies/"
]

console.log("A. required offer-shape copy and sources")
for (const snippet of required) {
  ok(html.includes(snippet), `compare hub contains ${snippet}`)
}
ok(html.includes("Tiny Studio is not listed on them"), "compare hub states Tiny Studio is not listed on them")
ok(html.includes("not a third-party ranking"), "compare hub states this is not a third-party ranking")

console.log("B. forbidden measurement, forms, and extra routes")
ok(!html.includes("data-measure-source"), "compare hub has no data-measure-source")
ok(!html.includes("?source="), "compare hub has no ?source=")
ok(!html.includes("<form"), "compare hub has no form")
ok(!html.includes("document.cookie"), "compare hub has no document.cookie")
ok(!html.includes("/offer/"), "compare hub does not mention /offer/")
ok(!html.includes("/website-correction/"), "compare hub does not mention /website-correction/")

console.log("C. ranking language stays out of visible copy")
const stripped = html.replace(/href="[^"]*"/g, "")
ok(!/\bbest\b/i.test(stripped), "after stripping hrefs, remainder has no standalone best")
ok(!stripped.includes("better than"), "after stripping hrefs, remainder has no better than")

console.log("D. npm test/ci wiring")
const pkg = JSON.parse(read("package.json"))
ok(
  pkg.scripts.test.includes("test-public-compare-page.mjs"),
  "npm test runs the public compare page test"
)
ok(
  pkg.scripts.ci.includes("test-public-compare-page.mjs"),
  "npm run ci runs the public compare page test"
)

console.log(`\n${checks} checks, ${failures} failures`)
process.exit(failures === 0 ? 0 : 1)
