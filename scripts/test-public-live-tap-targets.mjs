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

// The deployed stylesheet must keep every in-content and footer link rule at
// the WCAG 2.2 (SC 2.5.8) 24px minimum. The local suite
// (test-public-link-targets.mjs) asserts the same rules against
// public/styles.css; this guard re-asserts them against the stylesheet the
// live site actually serves, so a stale or drifted deployment fails loudly
// instead of silently re-opening the tap-target backlog item.
const LIVE_CSS_URL = "https://tinystudio.in/styles.css"
const FETCH_TIMEOUT_MS = 10_000

// Same selectors test-public-link-targets.mjs requires of the local sheet.
const TAP_TARGET_SELECTORS = [
  ".top-nav a",
  ".plain-list a",
  ".product-links a",
  ".rail-item strong a",
  ".footer-links a"
]

const targetRuleOf = (css, selector) => {
  const esc = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")
  const pattern = selector
    .split(",")
    .map((s) => esc(s.trim()))
    .join("\\s*,\\s*")
  const match = css.match(new RegExp(`${pattern}\\s*\\{([^}]*)\\}`))
  return match ? match[1] : null
}

const assert24pxRule = (selector, rule) => {
  ok(rule !== null, `live styles.css has a ${selector} rule`)
  if (rule) {
    ok(/display:\s*(inline-block|inline-flex|block)/.test(rule), `live ${selector} links are block-level boxes (hit area covers the line box)`)
    ok(!/display:\s*inline\s*;/.test(rule), `live ${selector} links are not plain inline boxes`)
    ok(/min-height:\s*24px/.test(rule), `live ${selector} links declare min-height: 24px`)
    const paddingMatch = rule.match(/padding:\s*([^;]+)/)
    ok(paddingMatch !== null, `live ${selector} links declare vertical padding`)
    if (paddingMatch) {
      const vertical = parseFloat(paddingMatch[1].trim().split(/\s+/)[0])
      ok(vertical >= 4, `live ${selector} vertical padding is at least 4px (${vertical}px), so 16px text + padding >= 24px`)
    }
  }
}

console.log("test-public-live-tap-targets: the deployed tinystudio.in stylesheet keeps every link rule at the WCAG 2.2 24px minimum")

let css = null
try {
  const res = await fetch(LIVE_CSS_URL, { signal: AbortSignal.timeout(FETCH_TIMEOUT_MS) })
  if (!res.ok) {
    console.log(`  ok skipped: ${LIVE_CSS_URL} answered ${res.status}, deployment not reachable - no tap-target assertions run`)
  } else {
    css = await res.text()
  }
} catch (err) {
  console.log(`  ok skipped: ${LIVE_CSS_URL} unreachable (${err?.cause?.code ?? err?.name ?? "network error"}) - no tap-target assertions run`)
}

if (css !== null) {
  console.log(`A. every link rule in the served ${LIVE_CSS_URL} enforces the 24px minimum`)
  for (const selector of TAP_TARGET_SELECTORS) {
    assert24pxRule(selector, targetRuleOf(css, selector))
  }
  if (failures === 0) {
    console.log("  the deployed stylesheet carries every tap-target rule from public/styles.css")
  } else {
    console.log("  the deployed stylesheet is stale: it misses tap-target rules that public/styles.css already has (see FAIL lines above). Refresh the live deployment from origin/main.")
  }
}

console.log("B. npm test/ci wiring")
const pkg = JSON.parse(read("package.json"))
ok(
  pkg.scripts.test.includes("test-public-live-tap-targets.mjs"),
  "npm test runs the public live tap-target guard"
)
ok(
  pkg.scripts.ci.includes("test-public-live-tap-targets.mjs"),
  "npm run ci runs the public live tap-target guard"
)

console.log(`\n${checks} checks, ${failures} failures`)
process.exit(failures === 0 ? 0 : 1)
