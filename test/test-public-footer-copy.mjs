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

// Every public page that carries the shared footer block. Kept as an explicit
// list so adding a new page with the old launch-prep footer copy fails CI
// instead of being silently missed.
const FOOTER_PAGES = [
  "public/404.html",
  "public/contact/index.html",
  "public/compare/index.html",
  "public/drishti/index.html",
  "public/drishti/privacy/index.html",
  "public/drishti/support/index.html",
  "public/privacy-choices/index.html",
  "public/privacy/index.html",
  "public/promptly/index.html",
  "public/promptly/privacy/index.html",
  "public/promptly/support/index.html",
  "public/support/index.html",
  "public/terms/index.html"
]

// The old footer line described the internal launch-prep process ("gives each
// product a clean public foundation before launch"). Any of these fragments
// in a footer block means the visitor-facing rewrite has regressed.
const LAUNCH_PREP_FRAGMENTS = [
  "clean public foundation",
  "foundation before launch",
  "gives each product",
  "before launch"
]

// The replacement footer line names the actual products and what they do.
const VISITOR_FACING_FRAGMENTS = ["Promptly", "Drishti"]

const footerBlockOf = (html) => {
  const start = html.indexOf("<footer")
  const end = html.indexOf("</footer>")
  return start >= 0 && end > start ? html.slice(start, end) : ""
}

console.log("test-public-footer-copy: no public page ends with launch-prep footer copy")

console.log("A. every page with the shared footer block has visitor-facing footer copy")
for (const page of FOOTER_PAGES) {
  const html = read(page)
  const footer = footerBlockOf(html)
  ok(footer.length > 0, `${page} has a footer block`)
  if (footer.length === 0) continue

  const copyBlock = footer.match(/<p class="footer-copy"[^>]*>([\s\S]*?)<\/p>/)
  ok(copyBlock !== null, `${page} has a .footer-copy paragraph`)
  if (!copyBlock) continue

  const copy = copyBlock[1]
  for (const fragment of VISITOR_FACING_FRAGMENTS) {
    ok(copy.includes(fragment), `${page} footer copy names ${fragment}`)
  }
  for (const fragment of LAUNCH_PREP_FRAGMENTS) {
    ok(!copy.includes(fragment), `${page} footer copy avoids "${fragment}"`)
  }
}

console.log("B. no launch-prep phrasing survives anywhere in any footer block")
for (const page of FOOTER_PAGES) {
  const footer = footerBlockOf(read(page))
  for (const fragment of LAUNCH_PREP_FRAGMENTS) {
    ok(!footer.includes(fragment), `${page} footer has no "${fragment}"`)
  }
}

console.log("C. npm test/ci wiring")
const pkg = JSON.parse(read("package.json"))
ok(
  pkg.scripts.test.includes("test-public-footer-copy.mjs"),
  "npm test runs the public footer copy test"
)
ok(
  pkg.scripts.ci.includes("test-public-footer-copy.mjs"),
  "npm run ci runs the public footer copy test"
)

console.log(`\n${checks} checks, ${failures} failures`)
process.exit(failures === 0 ? 0 : 1)
