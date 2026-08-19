// Guard the LIVE public site against WCAG 2.2 (SC 2.5.8) tap-target drift:
// the stylesheet tinystudio.in actually serves must keep every in-content
// and footer link rule at the 24px minimum.
//
// The static test (test-public-link-targets.mjs) only proves
// public/styles.css in the repo; it cannot catch a stale or misconfigured
// deployment. This check fetches the deployed stylesheet and re-asserts the
// same five link rules the local suite requires (.top-nav a, .plain-list a,
// .product-links a, .rail-item strong a, .footer-links a: block-level box,
// min-height 24px, >= 4px vertical padding), so a deployment that still
// serves pre-fix CSS (the June-20 bundle) fails loudly instead of silently
// re-opening the tap-target backlog item. It runs as part of
// `npm run site:check-live` and from the nightly live-site-check workflow.
//
// It is deliberately NOT part of `npm run test` / `npm run ci`: those
// blocking chains must stay green on repo state alone (see PR #84), while
// the live site is deployed by an external mechanism (Cloudflare Pages).
// Blocking CI on the live site would keep every pull request red whenever
// the deployment is stale.
//
// Failure semantics: a non-2xx HTTP response and a stylesheet that misses
// any required rule both FAIL this check (a deployment serving no rules is
// a failed deployment, not an unknown). Only a genuine network-level
// failure (site unreachable) skips with a notice, so offline machines do
// not go red; the nightly live-site-check workflow still catches the
// same outage via check-public-live-soft-404.mjs.
//
// Escape hatch for machines without network access:
//   SKIP_LIVE_CHECKS=1 npm run site:check-live

import { readFileSync } from "node:fs"
import { fileURLToPath } from "node:url"
import { dirname, join } from "node:path"

if (process.env.SKIP_LIVE_CHECKS === "1") {
  console.log("check-public-live-tap-targets: SKIP_LIVE_CHECKS=1, skipping live site checks")
  process.exit(0)
}

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..")
const read = (p) => readFileSync(join(ROOT, p), "utf8")

const LIVE_CSS_URL = "https://tinystudio.in/styles.css"
const FETCH_TIMEOUT_MS = 10_000
const FETCH_ATTEMPTS = 2

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

console.log("check-public-live-tap-targets: the deployed tinystudio.in stylesheet keeps every link rule at the WCAG 2.2 24px minimum")

let css = null
try {
  for (let attempt = 1; attempt <= FETCH_ATTEMPTS; attempt++) {
    try {
      const res = await fetch(LIVE_CSS_URL, { signal: AbortSignal.timeout(FETCH_TIMEOUT_MS) })
      if (!res.ok) {
        failures++
        checks++
        console.error(`  FAIL ${LIVE_CSS_URL} answered HTTP ${res.status}: the deployed stylesheet is missing or inaccessible, so none of the tap-target rules are being served`)
        process.exit(1)
      }
      css = await res.text()
      break
    } catch (err) {
      if (attempt === FETCH_ATTEMPTS) throw err
      await new Promise((r) => setTimeout(r, 1000))
    }
  }
} catch (err) {
  console.log(`  ok skipped: ${LIVE_CSS_URL} unreachable (${err?.cause?.code ?? err?.name ?? "network error"}) - no tap-target assertions run`)
}

if (css !== null) {
  console.log("A. every link rule in the deployed stylesheet enforces the 24px minimum")
  for (const selector of TAP_TARGET_SELECTORS) {
    assert24pxRule(selector, targetRuleOf(css, selector))
  }
  if (failures === 0) {
    console.log("  the deployed stylesheet carries every tap-target rule from public/styles.css")
  } else {
    console.log("  the deployed stylesheet is stale: it misses tap-target rules that public/styles.css already has (see FAIL lines above). Refresh the live deployment from origin/main.")
  }
}

console.log("B. wiring")
const pkg = JSON.parse(read("package.json"))
ok(
  (pkg.scripts["site:check-live"] ?? "").includes("check-public-live-soft-404.mjs") &&
    (pkg.scripts["site:check-live"] ?? "").includes("check-public-live-tap-targets.mjs"),
  "npm run site:check-live runs the soft-404 and tap-target live checks"
)
const workflow = read(".github/workflows/live-site-check.yml")
ok(workflow.includes("check-public-live-tap-targets.mjs"), "live-site-check.yml runs the live tap-target check (nightly + manual dispatch)")

console.log(`\n${checks} checks, ${failures} failures`)
if (failures > 0) {
  console.error("\nThe deployed stylesheet drifted below the WCAG 2.2 24px tap-target minimum. Re-deploy the public site from origin/main and re-run this check.")
}
process.exit(failures === 0 ? 0 : 1)
