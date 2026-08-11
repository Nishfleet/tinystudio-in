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
//   5. the trust pages /privacy/, /terms/, /drishti/privacy/ render the
//      fixed H1 -> H2x3 card outline, not the H1 -> H3x3 skip (PR #74).
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

// Same assertions as scripts/test-public-heading-hierarchy.mjs: the trust
// pages must serve H1 -> three H2 card titles -> footer H2/H3s, with no
// heading-level jump (no H1 -> H3 skip).
const headingLevelsOf = (html) =>
  [...html.matchAll(/<h([1-6])\b[^>]*>/gi)].map((m) => Number(m[1]))

const infoCardTitleCount = (html) =>
  (html.match(/<article class="info-card[^"]*"[^>]*>[\s\S]*?<h2\b/gi) || []).length

const TRUST_PAGES = ["/privacy/", "/terms/", "/drishti/privacy/"]

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

  console.log("E. trust pages render the fixed H1 -> H2x3 card outline (PR #74)")
  for (const path of TRUST_PAGES) {
    const { status, body } = await get(path)
    ok(status === 200, `${path} returns 200 (got ${status})`)
    const levels = headingLevelsOf(body)
    ok(levels.filter((l) => l === 1).length === 1, `${path} has exactly one H1`)
    ok(levels[0] === 1, `${path} has the H1 first in the outline`)
    ok(infoCardTitleCount(body) === 3, `${path} has three card headings as H2s inside .info-card`)
    let jumps = 0
    for (let i = 1; i < levels.length; i++) {
      if (levels[i] - levels[i - 1] > 1) jumps++
    }
    ok(jumps === 0, `${path} has no heading-level jump (no H1 -> H3 skip)`)
  }
} catch (error) {
  failures++
  console.error(`  FAIL live request error: ${error.message}`)
}

console.log(`\n${checks} checks, ${failures} failures`)
process.exit(failures === 0 ? 0 : 1)
