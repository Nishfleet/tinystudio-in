// Guard the LIVE public site against soft-404s and a stale a11y bundle: an
// unknown URL on tinystudio.in must return HTTP 404 with the real 404 page,
// never HTTP 200 with the homepage, and the deployed stylesheet must keep the
// WCAG 2.2 24px footer tap-target rule (PR #22) so mobile footer links are
// tappable on every live page.
//
// The static tests (test-public-soft-404.mjs, test-public-link-targets.mjs)
// only prove the repo state; they cannot catch a stale or misconfigured
// deployment. This check hits the deployed site so a regression is detected
// the moment it ships. It runs as `npm run site:check-live`, from the nightly
// live-site-check workflow, and as part of the deploy lane's post-deploy
// verification.
//
// It is deliberately NOT part of `npm run test` / `npm run ci`: those blocking
// chains must stay green on repo state alone, while the live site is deployed
// by an external mechanism (Cloudflare Pages). Blocking CI on the live site
// would keep every pull request red whenever the deployment is stale.
//
// Escape hatch for machines without network access:
//   SKIP_LIVE_CHECKS=1 npm run site:check-live
//
// Only the local site name and the local static file are referenced here;
// there is no per-environment configuration.

import { readFileSync } from "node:fs"
import { fileURLToPath } from "node:url"
import { dirname, join } from "node:path"
import { randomBytes } from "node:crypto"

import { PUBLIC_PAGE_URLS } from "./lib/public-pages.mjs"

if (process.env.SKIP_LIVE_CHECKS === "1") {
  console.log("check-public-live-soft-404: SKIP_LIVE_CHECKS=1, skipping live site checks")
  process.exit(0)
}

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..")
const SITE = "https://tinystudio.in"
const HOME_TITLE = "The Website Correction • Tiny Studio"
const NOT_FOUND_TITLE = "Page not found"

// A fresh random path each run defeats edge caches and proves the 404
// behavior, not a cached redirect.
const UNKNOWN_PATH = `/__ts-soft404-check-${randomBytes(6).toString("hex")}.html`

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

const fetchWithRetry = async (url, attempts = 2) => {
  let lastError
  for (let i = 0; i < attempts; i++) {
    try {
      const res = await fetch(url, { redirect: "follow", headers: { "user-agent": "tinystudio-soft404-check" } })
      return { res, body: await res.text() }
    } catch (err) {
      lastError = err
      if (i < attempts - 1) await new Promise((r) => setTimeout(r, 1000))
    }
  }
  throw lastError
}

console.log("check-public-live-soft-404: unknown URLs on the live site must 404, not serve the homepage")

let results
try {
  results = {
    home: await fetchWithRetry(`${SITE}/`),
    unknown: await fetchWithRetry(`${SITE}${UNKNOWN_PATH}`),
    notFoundAsset: await fetchWithRetry(`${SITE}/404.html`),
    realPage: await fetchWithRetry(`${SITE}/promptly/`),
    css: await fetchWithRetry(`${SITE}/styles.css`),
    llmsTxt: await fetchWithRetry(`${SITE}/llms.txt`),
  }
} catch (err) {
  console.error(`  FAIL could not reach ${SITE}: ${err.message}`)
  console.error("  (transient network problems and live deploy state both fail here; retry once manually before assuming a deploy issue)")
  process.exit(1)
}

const { res: homeRes, body: homeBody } = results.home
const { res: unknownRes, body: unknownBody } = results.unknown
const { res: notFoundRes, body: notFoundBody } = results.notFoundAsset
const { res: realRes } = results.realPage
const { res: cssRes, body: cssBody } = results.css
const { res: llmsTxtRes, body: llmsTxtBody } = results.llmsTxt

console.log("A. the homepage is reachable and intact")
ok(homeRes.status === 200, `GET / returns HTTP ${homeRes.status}`)
ok(homeBody.includes(HOME_TITLE), "the homepage still carries its own title")

console.log(`B. an unknown URL (${UNKNOWN_PATH}) returns a real 404`)
ok(unknownRes.status === 404, `unknown URL returns HTTP ${unknownRes.status} (expected 404, got ${unknownRes.status})`)
ok(unknownBody.toLowerCase().includes(NOT_FOUND_TITLE.toLowerCase()), "unknown URL body is the not-found page")
ok(!unknownBody.includes(HOME_TITLE), "unknown URL body is not the homepage")

console.log("C. the deployed 404 page is the real not-found page, not the homepage")
ok(notFoundRes.status === 200, `GET /404.html returns HTTP ${notFoundRes.status} (the not-found page is deployed)`)
ok(notFoundBody.toLowerCase().includes(NOT_FOUND_TITLE.toLowerCase()), "/404.html body is the not-found page")
ok(!notFoundBody.includes(HOME_TITLE), "/404.html body is not the homepage")

console.log("D. a real page still serves")
ok(realRes.status === 200, `GET /promptly/ returns HTTP ${realRes.status}`)

// Mirrors section B of test-public-link-targets.mjs against the DEPLOYED
// stylesheet, so a stale bundle that loses the PR #22 rule fails loudly.
console.log("E. the deployed stylesheet keeps the WCAG 2.2 24px footer tap-target rule (PR #22)")
ok(cssRes.status === 200, `GET /styles.css returns HTTP ${cssRes.status}`)
const footerRule = cssBody.match(/\.footer-links\s*a\s*\{([^}]*)\}/)
ok(footerRule !== null, "deployed stylesheet has a .footer-links a rule")
if (footerRule) {
  const rule = footerRule[1]
  ok(/display:\s*(inline-block|inline-flex|block)/.test(rule), ".footer-links a is a block-level box (hit area covers the line box)")
  ok(!/display:\s*inline\s*;/.test(rule), ".footer-links a is not a plain inline box")
  ok(/min-height:\s*24px/.test(rule), ".footer-links a declares min-height: 24px")
  const padding = rule.match(/padding:\s*([^;]+)/)
  ok(padding !== null, ".footer-links a declares vertical padding")
  if (padding) {
    const vertical = parseFloat(padding[1].trim().split(/\s+/)[0])
    ok(vertical >= 4, `.footer-links a vertical padding is at least 4px (${vertical}px), so 16px text + padding >= 24px`)
  }
}
console.log("F. the deployed llms.txt lists every public page (PR #68 live)")
ok(llmsTxtRes.status === 200, `GET /llms.txt returns HTTP ${llmsTxtRes.status}`)
const missingFromLlmsTxt = PUBLIC_PAGE_URLS.filter((url) => !llmsTxtBody.includes(url))
ok(
  missingFromLlmsTxt.length === 0,
  `llms.txt lists all ${PUBLIC_PAGE_URLS.length} public pages (missing: ${missingFromLlmsTxt.join(", ") || "none"})`
)

console.log(`\n${checks} checks, ${failures} failures`)
if (failures > 0) {
  console.error("\nThe live site is soft-404ing, serving a stale bundle, or missing the footer tap-target rule. Re-deploy the public site from origin/main and re-run this check.")
}
process.exit(failures === 0 ? 0 : 1)
