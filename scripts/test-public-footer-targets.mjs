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

// Every public page that carries the footer.
const PUBLIC_PAGES = [
  "public/index.html",
  "public/contact/index.html",
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

const footerBlockOf = (html) => {
  const start = html.indexOf("<footer")
  const end = html.indexOf("</footer>")
  if (start === -1 || end === -1) return ""
  return html.slice(start, end)
}

const countLinks = (block) => (block.match(/<a\b/gi) ?? []).length
const countFooterLinks = (block) =>
  (block.match(/<ul\s+class="footer-links"[^>]*>[\s\S]*?<\/ul>/gi) ?? []).reduce(
    (sum, list) => sum + countLinks(list),
    0
  )

console.log("test-public-footer-targets: footer links are WCAG 2.2 24px tap targets on every public page")

console.log("A. every footer link on every public page is a .footer-links link")
for (const page of PUBLIC_PAGES) {
  const block = footerBlockOf(read(page))
  const total = countLinks(block)
  const inLists = countFooterLinks(block)
  ok(total > 0, `${page} has a footer with links`)
  ok(inLists === total && inLists > 0, `${page} keeps every footer link inside .footer-links (${inLists}/${total})`)
}

console.log("B. styles.css gives .footer-links a an at-least-24px target")
const css = read("public/styles.css")
const ruleMatch = css.match(/\.footer-links a\s*\{([^}]*)\}/)
ok(ruleMatch !== null, "styles.css has a .footer-links a rule")
if (ruleMatch) {
  const rule = ruleMatch[1]
  ok(/display:\s*(inline-block|inline-flex|block)/.test(rule), "links are block-level boxes (hit area covers the line box)")
  ok(!/display:\s*inline\s*;/.test(rule), "links are not plain inline boxes")
  ok(/min-height:\s*24px/.test(rule), "links declare min-height: 24px")
  const paddingMatch = rule.match(/padding:\s*([^;]+)/)
  ok(paddingMatch !== null, "links declare vertical padding")
  if (paddingMatch) {
    const vertical = parseFloat(paddingMatch[1].trim().split(/\s+/)[0])
    ok(vertical >= 4, `vertical padding is at least 4px (${vertical}px), so 16px text + padding >= 24px`)
  }
}

console.log("C. npm test/ci wiring")
const pkg = JSON.parse(read("package.json"))
ok(
  pkg.scripts.test.includes("test-public-footer-targets.mjs"),
  "npm test runs the public footer target test"
)
ok(
  pkg.scripts.ci.includes("test-public-footer-targets.mjs"),
  "npm run ci runs the public footer target test"
)

console.log(`\n${checks} checks, ${failures} failures`)
process.exit(failures === 0 ? 0 : 1)
