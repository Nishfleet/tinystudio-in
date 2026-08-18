// Verify that the tinystudio.in production deployment matches the neutral
// merged public fixes (the deploy-path acceptance proof), and that the
// snoozed managed-service buyer path is NOT live.
//
// Used by the release lane after a Pages deployment. Runs against the live
// site only; set SKIP_LIVE_CHECKS=1 to skip (exit 0) on offline machines.
//
// The four live proofs (all neutral, all merged on main before this lane):
//   1. /promptly/support/ renders H2 after H1        (PRs #18/#20)
//   2. /contact/ carries application/ld+json         (PR #19)
//   3. unknown URLs get a real 404, not the homepage (PR #34)
//   4. homepage stays portfolio-only: brand-disambiguation copy (#29) live,
//      and no managed-service buyer-path content (#10/#11, snoozed).
// The fifth proof covers the 2026-08-08 dogfood finding pages:
//   5. /drishti/support/ and /privacy-choices/ render H2 after H1
//      (the skipped-heading-levels repair, PR #23).
// Proof 2b covers the contact finding page:
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

  console.log("A2. finding pages render H2 after H1 (skipped-heading-levels repair, PR #23)")
  for (const path of ["/drishti/support/", "/privacy-choices/"]) {
    const { status, body } = await get(path)
    ok(status === 200, `${path} returns 200 (got ${status})`)
    ok(h2AfterFirstH1(body), `${path} has H2 following the first H1 before any H3`)
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
  }
} catch (error) {
  failures++
  console.error(`  FAIL live request error: ${error.message}`)
}

console.log(`\n${checks} checks, ${failures} failures`)
process.exit(failures === 0 ? 0 : 1)
