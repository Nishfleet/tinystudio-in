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

// The deployed stylesheet must keep the footer link rule at the WCAG 2.2
// (SC 2.5.8) 24px minimum. The local suite (test-public-link-targets.mjs)
// asserts the same rule against public/styles.css; this guard re-asserts it
// against the stylesheet the live site actually serves, so a stale or
// drifted deployment fails loudly instead of silently re-opening the footer
// tap-target backlog item.
//
// The footer backlog item re-opened because the live site was serving the
// pre-fix stylesheet: PR #22 gave .footer-links a "inline-block;
// min-height: 24px; padding: 4px 0" in public/styles.css, but the deployed
// stylesheet still rendered footer links as ~17px plain-inline glyph boxes
// on every tinystudio.in page at mobile widths.
const LIVE_CSS_URL = process.env.LIVE_CSS_URL ?? "https://tinystudio.in/styles.css"
const FETCH_TIMEOUT_MS = 10_000

// The one selector test-public-link-targets.mjs requires of the local sheet.
const FOOTER_SELECTOR = ".footer-links a"

const targetRuleOf = (css, selector) => {
  const esc = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")
  const pattern = selector
    .split(",")
    .map((s) => esc(s.trim()))
    .join("\\s*,\\s*")
  const match = css.match(new RegExp(`${pattern}\\s*\\{([^}]*)\\}`))
  return match ? match[1] : null
}

console.log("test-public-live-footer-targets: the deployed tinystudio.in stylesheet keeps the footer link rule at the WCAG 2.2 24px minimum")

let css = null
try {
  const res = await fetch(LIVE_CSS_URL, { signal: AbortSignal.timeout(FETCH_TIMEOUT_MS) })
  if (!res.ok) {
    console.log(`  ok skipped: ${LIVE_CSS_URL} answered ${res.status}, deployment not reachable - no footer tap-target assertions run`)
  } else {
    css = await res.text()
  }
} catch (err) {
  console.log(`  ok skipped: ${LIVE_CSS_URL} unreachable (${err?.cause?.code ?? err?.name ?? "network error"}) - no footer tap-target assertions run`)
}

if (css !== null) {
  console.log(`A. the footer link rule in the served ${LIVE_CSS_URL} enforces the 24px minimum`)
  const rule = targetRuleOf(css, FOOTER_SELECTOR)
  ok(rule !== null, `live styles.css has a ${FOOTER_SELECTOR} rule`)
  if (rule) {
    ok(/display:\s*(inline-block|inline-flex|block)/.test(rule), `live ${FOOTER_SELECTOR} links are block-level boxes (hit area covers the line box)`)
    ok(!/display:\s*inline\s*;/.test(rule), `live ${FOOTER_SELECTOR} links are not plain inline boxes`)
    ok(/min-height:\s*24px/.test(rule), `live ${FOOTER_SELECTOR} links declare min-height: 24px`)
    const paddingMatch = rule.match(/padding:\s*([^;]+)/)
    ok(paddingMatch !== null, `live ${FOOTER_SELECTOR} links declare vertical padding`)
    if (paddingMatch) {
      const vertical = parseFloat(paddingMatch[1].trim().split(/\s+/)[0])
      ok(vertical >= 4, `live ${FOOTER_SELECTOR} vertical padding is at least 4px (${vertical}px), so 16px text + padding >= 24px`)
    }
  }
  if (failures === 0) {
    console.log("  the deployed stylesheet carries the footer tap-target rule from public/styles.css")
  } else {
    console.log("  the deployed stylesheet is stale: it misses the footer tap-target rule that public/styles.css already has (see FAIL lines above). Refresh the live deployment from origin/main.")
  }
}

console.log("B. npm test/ci wiring")
const pkg = JSON.parse(read("package.json"))
ok(
  pkg.scripts.test.includes("test-public-live-footer-targets.mjs"),
  "npm test runs the public live footer-target guard"
)
ok(
  pkg.scripts.ci.includes("test-public-live-footer-targets.mjs"),
  "npm run ci runs the public live footer-target guard"
)

console.log(`\n${checks} checks, ${failures} failures`)
process.exit(failures === 0 ? 0 : 1)
