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

// Every public page that carries the shared header/footer.
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

const beforeFooter = (html) => {
  const end = html.indexOf("<footer")
  return end === -1 ? html : html.slice(0, end)
}

const countLinks = (block) => (block.match(/<a\b/gi) ?? []).length

// Anchors whose own class already guarantees a >= 24px target via the
// .button/.text-link (48px), .ghost-button (48px), .skip-link (48px), or
// .brand (42px brand-mark) rules. Header chrome and CTAs, not plain content.
const CHROME_OR_CTA_CLASSES = /class="(skip-link|brand|button|ghost-button|text-link)"/

const countChromeOrCtaLinks = (block) =>
  (block.match(/<a\b[^>]*class="[^"]*"[^>]*>/gi) ?? []).filter((tag) =>
    CHROME_OR_CTA_CLASSES.test(tag)
  ).length

const linksInside = (block, container) =>
  (block.match(container) ?? []).reduce((sum, part) => sum + countLinks(part), 0)

const TOP_NAV = /<nav\b[^>]*class="top-nav"[^>]*>[\s\S]*?<\/nav>/gi
const PLAIN_LIST = /<ul\b[^>]*class="plain-list"[^>]*>[\s\S]*?<\/ul>/gi
const PRODUCT_LINKS = /<div\b[^>]*class="product-links"[^>]*>[\s\S]*?<\/div>/gi
const RAIL_ITEM = /<article\b[^>]*class="[^"]*rail-item[^"]*"[^>]*>([\s\S]*?)<\/article>/gi

// The containers whose links styles.css must raise to a >= 24px target.
const IN_CONTENT_SELECTORS = [
  ".top-nav a",
  ".plain-list a",
  ".product-links a",
  ".rail-item strong a"
]

// Links inside a rail-item <strong> (the hero rail "link as heading" anchors
// such as inish.in and The Website Correction).
const railItemStrongLinks = (html) =>
  (html.match(RAIL_ITEM) ?? [])
    .flatMap((article) => [...article.matchAll(/<strong\b[^>]*>([\s\S]*?)<\/strong>/gi)])
    .reduce((sum, m) => sum + countLinks(m[1]), 0)

const footerBlockOf = (html) => {
  const start = html.indexOf("<footer")
  const end = html.indexOf("</footer>")
  if (start === -1 || end === -1) return ""
  return html.slice(start, end)
}

const countFooterLinks = (block) =>
  (block.match(/<ul\s+class="footer-links"[^>]*>[\s\S]*?<\/ul>/gi) ?? []).reduce(
    (sum, list) => sum + countLinks(list),
    0
  )

console.log("test-public-link-targets: every interactive link on the public pages is a WCAG 2.2 24px tap target")

console.log("A. every in-content link on every public page is covered by a >= 24px container or CTA class")
for (const page of PUBLIC_PAGES) {
  const content = beforeFooter(read(page))
  const total = countLinks(content)
  const covered =
    countChromeOrCtaLinks(content) +
    linksInside(content, TOP_NAV) +
    linksInside(content, PLAIN_LIST) +
    linksInside(content, PRODUCT_LINKS) +
    railItemStrongLinks(content)
  ok(
    total === covered && covered > 0,
    `${page} has no uncovered in-content links (${covered}/${total} in styled containers or CTA classes)`
  )
}

console.log("B. styles.css gives every in-content container a >= 24px target")
const css = read("public/styles.css")

const targetRuleOf = (selector) => {
  const esc = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")
  const pattern = selector
    .split(",")
    .map((s) => esc(s.trim()))
    .join("\\s*,\\s*")
  const match = css.match(new RegExp(`${pattern}\\s*\\{([^}]*)\\}`))
  return match ? match[1] : null
}

const assert24pxRule = (selector, rule) => {
  ok(rule !== null, `styles.css has a ${selector} rule`)
  if (rule) {
    ok(/display:\s*(inline-block|inline-flex|block)/.test(rule), `${selector} links are block-level boxes (hit area covers the line box)`)
    ok(!/display:\s*inline\s*;/.test(rule), `${selector} links are not plain inline boxes`)
    ok(/min-height:\s*24px/.test(rule), `${selector} links declare min-height: 24px`)
    const paddingMatch = rule.match(/padding:\s*([^;]+)/)
    ok(paddingMatch !== null, `${selector} links declare vertical padding`)
    if (paddingMatch) {
      const vertical = parseFloat(paddingMatch[1].trim().split(/\s+/)[0])
      ok(vertical >= 4, `${selector} vertical padding is at least 4px (${vertical}px), so 16px text + padding >= 24px`)
    }
  }
}

for (const selector of IN_CONTENT_SELECTORS) {
  assert24pxRule(selector, targetRuleOf(selector))
}
assert24pxRule(".footer-links a", targetRuleOf(".footer-links a"))

console.log("C. styles.css still keeps CTA and header links above the minimum")
const buttonRule = targetRuleOf(".button, .text-link")
ok(buttonRule !== null, "styles.css has a .button, .text-link rule")
if (buttonRule) {
  const minHeight = buttonRule.match(/min-height:\s*(\d+)px/)
  ok(minHeight !== null && parseFloat(minHeight[1]) >= 24, `.button and .text-link declare min-height >= 24px (${minHeight ? minHeight[1] : "none"}px)`)
}
const ghostRule = targetRuleOf(".ghost-button")
ok(ghostRule !== null, "styles.css has a .ghost-button rule")
if (ghostRule) {
  const minHeight = ghostRule.match(/min-height:\s*(\d+)px/)
  ok(minHeight !== null && parseFloat(minHeight[1]) >= 24, `.ghost-button declares min-height >= 24px (${minHeight ? minHeight[1] : "none"}px)`)
}
const brandRule = targetRuleOf(".brand")
ok(brandRule !== null, "styles.css has a .brand rule")
if (brandRule) {
  ok(/display:\s*(inline-flex|flex|inline-block|block)/.test(brandRule), ".brand is a block-level box")
}

console.log("D. every footer link on every public page is a .footer-links link")
for (const page of PUBLIC_PAGES) {
  const block = footerBlockOf(read(page))
  const total = countLinks(block)
  const inLists = countFooterLinks(block)
  ok(total > 0, `${page} has a footer with links`)
  ok(inLists === total && inLists > 0, `${page} keeps every footer link inside .footer-links (${inLists}/${total})`)
}

console.log("E. npm test/ci wiring")
const pkg = JSON.parse(read("package.json"))
ok(
  pkg.scripts.test.includes("test-public-link-targets.mjs"),
  "npm test runs the public link target test"
)
ok(
  pkg.scripts.ci.includes("test-public-link-targets.mjs"),
  "npm run ci runs the public link target test"
)

console.log(`\n${checks} checks, ${failures} failures`)
process.exit(failures === 0 ? 0 : 1)
