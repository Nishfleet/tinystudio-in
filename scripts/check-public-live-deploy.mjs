// Verify that the tinystudio.in production deployment matches the neutral
// merged public fixes (the deploy-path acceptance proof), and that the
// snoozed managed-service buyer path is NOT live.
//
// Used by the release lane after a Pages deployment. Runs against the live
// site only; set SKIP_LIVE_CHECKS=1 to skip (exit 0) on offline machines.
//
// The five live proofs (all neutral, all merged on main before this lane):
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
//   5. shared-footer pages carry visitor-facing footer copy, not the
//      launch-prep line replaced by PR #35 ('gives each product a clean
//      public foundation before launch').
// Proof 2b covers the 2026-08-08 dogfood finding page:
//   2b. /contact/ renders H2 after H1 (the heading-hierarchy repair, PR #18).
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

  console.log("F. shared-footer pages carry visitor-facing footer copy, not launch-prep (PR #35)")
  {
    // Same coverage and markers as scripts/test-public-footer-copy.mjs: every
    // live path that carries the shared footer block must name the actual
    // products and must not contain any fragment of the launch-prep footer
    // line the June-20 bundle still serves.
    const FOOTER_PATHS = [
      "/contact/",
      "/drishti/",
      "/drishti/privacy/",
      "/drishti/support/",
      "/privacy-choices/",
      "/privacy/",
      "/promptly/",
      "/promptly/privacy/",
      "/promptly/support/",
      "/support/",
      "/terms/",
    ]
    const LAUNCH_PREP_FRAGMENTS = [
      "clean public foundation",
      "foundation before launch",
      "gives each product",
      "before launch",
    ]
    const VISITOR_FACING_FRAGMENTS = ["Promptly", "Drishti"]

    const footerBlockOf = (html) => {
      const start = html.indexOf("<footer")
      const end = html.indexOf("</footer>")
      return start >= 0 && end > start ? html.slice(start, end) : ""
    }

    const checkFooter = (label, html) => {
      const footer = footerBlockOf(html)
      ok(footer.length > 0, `${label} has a footer block`)
      const copyBlock = footer.match(/<p class="footer-copy"[^>]*>([\s\S]*?)<\/p>/)
      ok(copyBlock !== null, `${label} has a .footer-copy paragraph`)
      if (copyBlock) {
        const copy = copyBlock[1]
        for (const fragment of VISITOR_FACING_FRAGMENTS) {
          ok(copy.includes(fragment), `${label} footer copy names ${fragment}`)
        }
        for (const fragment of LAUNCH_PREP_FRAGMENTS) {
          ok(!copy.includes(fragment), `${label} footer copy avoids "${fragment}"`)
        }
      }
      for (const fragment of LAUNCH_PREP_FRAGMENTS) {
        ok(!footer.includes(fragment), `${label} footer has no "${fragment}"`)
      }
    }

    for (const path of FOOTER_PATHS) {
      const { status, body } = await get(path)
      ok(status === 200, `${path} returns 200 (got ${status})`)
      checkFooter(path, body)
    }
    const footerProbe = `/definitely-missing-footer-probe-${Date.now()}`
    const { status, body } = await get(footerProbe)
    ok(status === 404, `unknown URL returns 404 for footer probe (got ${status})`)
    checkFooter("404 page", body)
  }
} catch (error) {
  failures++
  console.error(`  FAIL live request error: ${error.message}`)
}

console.log(`\n${checks} checks, ${failures} failures`)
process.exit(failures === 0 ? 0 : 1)
