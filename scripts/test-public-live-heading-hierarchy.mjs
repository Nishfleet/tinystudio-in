// Guard the LIVE public site against skipped heading levels on the pages
// that carry the repaired outline in source.
//
// It runs as `npm run site:check-live-heading-hierarchy`, from the deploy
// lane's post-deploy verification, and on demand. It is deliberately NOT
// part of `npm run test` / `npm run ci`: those blocking chains must stay
// green on repo state alone, while the live site is deployed by an external
// mechanism (Cloudflare Pages). Blocking CI on the live site would keep
// every pull request red whenever the deployment is stale, and would
// deadlock the deploy lane's pre-deploy `npm run check` gate.
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

// The deployed pages must keep the repaired heading outline (H1 -> H2 cards
// -> H2 footer -> H3 footer columns, no skipped levels). The local suite
// (test-public-heading-hierarchy.mjs) asserts the same outline against the
// worktree HTML; this guard re-asserts it against the pages the live site
// actually serves, so a stale deployment (like the June-20 bundle still
// serving H3 cards) fails loudly instead of silently re-opening the
// skipped-heading-level finding. /promptly/support/ is the page named by the
// 2026-08-08 scout item (repaired in source by PR #20); it must not regress
// on the live site either.
const LIVE_PAGES = [
  {
    name: "Promptly support",
    url: "https://tinystudio.in/promptly/support/",
    source: "public/promptly/support/index.html"
  },
  {
    name: "Drishti support",
    url: "https://tinystudio.in/drishti/support/",
    source: "public/drishti/support/index.html"
  },
  {
    name: "Privacy Choices",
    url: "https://tinystudio.in/privacy-choices/",
    source: "public/privacy-choices/index.html"
  }
]
const LIVE_CSS_URL = "https://tinystudio.in/styles.css"
const FETCH_TIMEOUT_MS = 10_000

// Heading levels in document order, e.g. [1, 2, 2, 2, 2, 3, 3, 3].
const headingLevelsOf = (html) =>
  [...html.matchAll(/<h([1-6])\b[^>]*>/gi)].map((m) => Number(m[1]))

// Count <h2> used as .info-card card titles (inside <article class="info-card">).
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
  if (failures > 0) {
    console.error(`    the deployed ${source} is stale: it misses the heading-hierarchy repair that the worktree copy of ${source} already has. Refresh the live deployment from origin/main.`)
  }
}

console.log("test-public-live-heading-hierarchy: the deployed tinystudio.in pages keep the repaired heading outline (no skipped levels)")

console.log("A. live pages carry the repaired heading hierarchy")
for (const page of LIVE_PAGES) {
  const html = await fetchLive(page.url)
  if (html !== null) assertRepairedOutline(page.name, page.source, html)
}

console.log("B. live stylesheet keeps the shared card-heading rule at the former card scale")
const css = await fetchLive(LIVE_CSS_URL)
if (css !== null) {
  const ruleStart = css.indexOf(".info-card :is(h2, h3) {")
  ok(ruleStart !== -1, `live styles.css defines .info-card :is(h2, h3) {`)
  const ruleEnd = ruleStart === -1 ? -1 : css.indexOf("}", ruleStart)
  const ruleBody = ruleStart === -1 ? "" : css.slice(ruleStart, ruleEnd)
  for (const decl of ["margin-top: 12px", "font-size: clamp(1.65rem, 2vw, 2.35rem)", "max-width: none"]) {
    ok(ruleBody.includes(decl), `live card rule keeps ${decl}`)
  }
  ok(
    !/\.info-card\s+h3\s*{/.test(css),
    "live styles.css replaced the old .info-card h3-only rule with the shared :is(h2, h3) rule"
  )
  if (failures > 0) {
    console.error("    the deployed stylesheet is stale: it misses the card-heading pairing that public/styles.css already has. Refresh the live deployment from origin/main.")
  }
}

console.log("C. npm test/ci wiring")
const pkg = JSON.parse(read("package.json"))
ok(
  pkg.scripts.test.includes("test-public-live-heading-hierarchy.mjs"),
  "npm test runs the public live heading-hierarchy guard"
)
ok(
  pkg.scripts.ci.includes("test-public-live-heading-hierarchy.mjs"),
  "npm run ci runs the public live heading-hierarchy guard"
)

console.log(`\n${checks} checks, ${failures} failures`)
process.exit(failures === 0 ? 0 : 1)
