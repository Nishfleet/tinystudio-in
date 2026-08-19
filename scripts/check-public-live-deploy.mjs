// Verify that the tinystudio.in production deployment matches the neutral
// merged public fixes (the deploy-path acceptance proof), and that the
// snoozed managed-service buyer path is NOT live.
//
// Used by the release lane after a Pages deployment. Runs against the live
// site only; set SKIP_LIVE_CHECKS=1 to skip (exit 0) on offline machines.
//
// The live proofs (all neutral, all merged on main before this lane):
//   1. /promptly/support/ renders H2 after H1        (PRs #18/#20)
//   2. /contact/ carries application/ld+json         (PR #19)
//   3. unknown URLs get a real 404, not the homepage (PR #34)
//   4. homepage stays portfolio-only: brand-disambiguation copy (#29) live,
//      and no managed-service buyer-path content (#10/#11, snoozed).
//
// Review disposition (2026-08-11, Grok live-review finding "homepage is
// missing the entire <section id=\"managed-service\"> block on the live site
// while the merged homepage on main carries it"): intended, snooze honored.
// The section is deliberately absent from every publishable bundle - the
// snoozed-by-Nish (2026-08-08) managed-service buyer path from PRs #10/#11 is
// stripped by scripts/prepare-public-deploy-bundle.mjs and its absence is
// asserted here (explicitly via the id="managed-service" marker below) and by
// scripts/test-public-deploy-bundle.mjs. The section returns only when Nish
// lifts the snooze and the fail-closed filter is updated deliberately.
//   5. every public page carries exactly one application/ld+json block
//      (trust/support structured data, PR #26 - the 07acd07 bundle shipped
//      JSON-LD on only 4 of 12 pages).
// Proof 2b covers the 2026-08-08 dogfood finding page:
//   2b. /contact/ renders H2 after H1 (the heading-hierarchy repair, PR #18).
//   5. the deployed stylesheet keeps the WCAG 2.2 24px footer tap-target
//      rule (PR #22) so mobile footer links stay >= 24px on every page.
import { join } from "node:path"
import { fileURLToPath } from "node:url"
import { dirname } from "node:path"

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..")

const BASE = "https://tinystudio.in"
const BUYER_PATH_MARKERS = [
  "Website Correction",
  "website-correction",
  "data-measure-source",
  'id="managed-service"',
]

// Every public page on the live site must carry structured data (PR #26).
const PUBLIC_PATHS = [
  "/",
  "/contact/",
  "/support/",
  "/privacy/",
  "/privacy-choices/",
  "/terms/",
  "/promptly/",
  "/promptly/support/",
  "/promptly/privacy/",
  "/drishti/",
  "/drishti/support/",
  "/drishti/privacy/",
]

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

const get = async (path, { redirect = "manual" } = {}) => {
  const res = await fetch(`${BASE}${path}`, { redirect })
  return { status: res.status, body: await res.text() }
}

const h2AfterFirstH1 = (html) => {
  const firstH1 = html.search(/<h1\b[^>]*>/i)
  if (firstH1 === -1) return false
  const rest = html.slice(firstH1)
  const nextH2 = rest.search(/<h2\b[^>]*>/i)
  const nextH3 = rest.search(/<h3\b[^>]*>/i)
  return nextH2 !== -1 && (nextH3 === -1 || nextH2 < nextH3)
}

console.log("check-public-live-deploy: live tinystudio.in must match neutral merged fixes")

if (process.env.SKIP_LIVE_CHECKS === "1") {
  console.log("  SKIP_LIVE_CHECKS=1 - live checks skipped")
  process.exit(0)
}

try {
  console.log("A. /promptly/support/ renders the fixed heading hierarchy (PRs #18/#20)")
  {
    const { status, body } = await get("/promptly/support/")
    ok(status === 200, `/promptly/support/ returns 200 (got ${status})`)
    ok(h2AfterFirstH1(body), "H2 follows the first H1 before any H3")
  }

  console.log("B. /contact/ carries structured data (PR #19)")
  {
    const { status, body } = await get("/contact/")
    ok(status === 200, `/contact/ returns 200 (got ${status})`)
    ok(body.includes("application/ld+json"), "page contains application/ld+json")
  }

  console.log("B2. /contact/ renders H2 after H1 (heading-hierarchy repair, PR #18)")
  {
    const { status, body } = await get("/contact/")
    ok(status === 200, `/contact/ returns 200 (got ${status})`)
    ok(h2AfterFirstH1(body), "H2 follows the first H1 before any H3")
  }

  console.log("C. unknown URLs return a real 404 (PR #34)")
  {
    const probe = `/definitely-missing-live-deploy-${Date.now()}`
    const { status, body } = await get(probe)
    ok(status === 404, `unknown URL returns 404 (got ${status})`)
    ok(!body.includes("<title>Tiny Studio | Promptly, Drishti, and 0509"), "the 404 body is not the homepage")
  }

  console.log("D. homepage is portfolio-only (snooze honored, #29 live)")
  {
    const { status, body } = await get("/")
    ok(status === 200, `homepage returns 200 (got ${status})`)
    ok(body.includes("<title>Tiny Studio | Promptly, Drishti, and 0509"), "portfolio title is live")
    ok(body.includes('"alternateName"'), "brand-disambiguation JSON-LD is live (PR #29)")
    ok(body.includes("not affiliated"), "non-affiliation copy is live (PR #29)")
    for (const marker of BUYER_PATH_MARKERS) {
      ok(!body.includes(marker), `homepage has no ${marker}`)
    }
    ok(
      !body.includes('<section class="shape" id="managed-service"'),
      "the entire managed-service section block is absent from the homepage"
    )
  }

  console.log("E. no Cloudflare email-obfuscation placeholder on the live homepage")
  {
    const { status, body } = await get("/")
    ok(status === 200, `homepage returns 200 (got ${status})`)
    ok(body.includes("support&#64;tinystudio.in"), "homepage serves the email entity-encoded (browser-decoded, edge-immutable)")
    ok(!body.includes("__cf_email__"), "no Cloudflare-obfuscated email span on the homepage")
    ok(!body.includes("[email"), "no '[email protected]' placeholder text on the homepage")
    ok(!body.includes("support@tinystudio.in"), "no plaintext email left that Email Address Obfuscation could rewrite")
  }

  console.log("F. every public page carries structured data (PR #26)")
  for (const path of PUBLIC_PATHS) {
    const { status, body } = await get(path)
    ok(status === 200, `${path} returns 200 (got ${status})`)
    const blocks = (body.match(/<script\s+type="application\/ld\+json"[^>]*>/gi) || []).length
    ok(blocks === 1, `${path} carries exactly one application/ld+json block (got ${blocks})`)
  }

  console.log("G. the deployed stylesheet keeps the WCAG 2.2 24px footer tap-target rule (PR #22)")
  {
    const { status, body } = await get("/styles.css")
    ok(status === 200, `GET /styles.css returns 200 (got ${status})`)
    const footerRule = body.match(/\.footer-links\s*a\s*\{([^}]*)\}/)
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
  }
} catch (error) {
  failures++
  console.error(`  FAIL live request error: ${error.message}`)
}

console.log(`\n${checks} checks, ${failures} failures`)
process.exit(failures === 0 ? 0 : 1)
