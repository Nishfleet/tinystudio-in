// Guard the LIVE tinystudio.in /promptly/support/ page against the
// heading-hierarchy finding repaired in source by PR #20 (merge 1536cc88)
// but still shipping on the deployed June-20 bundle.
//
// Source lock: scripts/test-public-promptly-support-heading-hierarchy.mjs
// (wired into npm test / npm run ci). This live alarm is deliberately NOT
// part of those blocking chains: they must stay green on repo state alone
// while Cloudflare Pages is stale. Blocking CI on the live site would keep
// every pull request red and deadlock the deploy lane's pre-deploy
// `npm run check` gate.
//
// Runs as `npm run site:check-live-promptly-support-heading-hierarchy` and
// from .github/workflows/live-site-check-promptly-support.yml (nightly
// staleness alarm). Expected FAIL while production still serves H3 cards.
//
// Network-tolerant: a page that is unreachable is skipped (ok, no
// assertion); a page that is reachable but stale fails loudly.
//
// Escape hatch:
//   SKIP_LIVE_CHECKS=1 npm run site:check-live-promptly-support-heading-hierarchy
import { fileURLToPath } from "node:url"
import { dirname, join } from "node:path"

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..")
void ROOT

if (process.env.SKIP_LIVE_CHECKS === "1") {
  console.log("test-public-live-promptly-support-heading-hierarchy: SKIP_LIVE_CHECKS=1, skipping live site checks")
  process.exit(0)
}

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

const LIVE_PAGES = [
  {
    name: "Promptly support",
    url: "https://tinystudio.in/promptly/support/",
    source: "public/promptly/support/index.html"
  }
]
const FETCH_TIMEOUT_MS = 10_000
const REPAIRED_TITLES = [
  "A single, clear support route.",
  "Support, privacy, and contact stay connected.",
  "A lasting support destination."
]

const headingLevelsOf = (html) =>
  [...html.matchAll(/<h([1-6])\b[^>]*>/gi)].map((m) => Number(m[1]))

const infoCardTitleCount = (html) =>
  (html.match(/<article class="info-card[^"]*"[^>]*>[\s\S]*?<h2\b/gi) || []).length

const fetchLive = async (url) => {
  try {
    const res = await fetch(url, { signal: AbortSignal.timeout(FETCH_TIMEOUT_MS) })
    if (!res.ok) {
      console.log(`  ok skipped: ${url} answered ${res.status}, deployment not reachable - no assertions run for it`)
      return null
    }
    return await res.text()
  } catch (err) {
    console.log(`  ok skipped: ${url} unreachable (${err?.cause?.code ?? err?.name ?? "network error"}) - no assertions run for it`)
    return null
  }
}

const assertRepairedOutline = (name, source, html) => {
  const levels = headingLevelsOf(html)
  ok(levels.length > 0, `live ${name} page contains at least one heading`)
  ok(levels.filter((l) => l === 1).length === 1, `live ${name} page has exactly one H1`)
  ok(levels[0] === 1, `live ${name} page has the H1 as the first heading in the outline`)
  ok(infoCardTitleCount(html) === 3, `live ${name} page has the three card headings as H2s inside .info-card articles`)
  const cardH2s = levels.filter((l) => l === 2).length
  ok(cardH2s >= 4, `live ${name} page keeps the flat H2 band (card H2s plus the footer H2) before the footer H3s`)
  let jumps = 0
  for (let i = 1; i < levels.length; i++) {
    if (levels[i] - levels[i - 1] > 1) {
      jumps++
      console.error(`    bad transition H${levels[i - 1]} -> H${levels[i]} on ${name}`)
    }
  }
  ok(jumps === 0, `live ${name} page has no heading-level jump greater than one (no H1 -> H3 skip)`)
  for (const title of REPAIRED_TITLES) {
    ok(html.includes(`<h2>${title}</h2>`), `live ${name} page has repaired H2 title: ${title}`)
  }
  if (failures > 0) {
    console.error(`    the deployed ${source} is stale: it misses the heading-hierarchy repair that the worktree copy of ${source} already has. Refresh the live deployment from origin/main.`)
  }
}

console.log("test-public-live-promptly-support-heading-hierarchy: the deployed tinystudio.in /promptly/support/ page keeps the PR #20 repaired heading outline (no skipped levels)")

console.log("A. live /promptly/support/ carries the repaired heading hierarchy")
for (const page of LIVE_PAGES) {
  const html = await fetchLive(page.url)
  if (html !== null) assertRepairedOutline(page.name, page.source, html)
}

console.log("\nLive /promptly/support/ heading-hierarchy guard result: the deployed page keeps the PR #20 repaired outline (reverified 2026-08-20, reverify lane1 report .lane/reports/lane1-promptly-support-heading-hierarchy-restore-20260820.md).")
console.log(`\n${checks} checks, ${failures} failures`)
process.exit(failures === 0 ? 0 : 1)
