// Hermetic PR #20 Promptly-support heading lock (sol-postmerge-20).
//
// PR #20 (merge 1536cc88) promoted the three Promptly support info-card
// titles from H3 to H2. scripts/test-public-heading-hierarchy.mjs still
// omits public/promptly/support/index.html from AFFECTED_PAGES; this file
// is the dedicated source lock so that omission cannot silently return.
// The live alarm is scripts/test-public-live-promptly-support-heading-hierarchy.mjs
// and is deliberately NOT part of npm test / npm run ci.
import { readFileSync } from "node:fs"
import { dirname, join } from "node:path"
import { fileURLToPath } from "node:url"

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

const headingLevelsOf = (html) =>
  [...html.matchAll(/<h([1-6])\b[^>]*>/gi)].map((m) => Number(m[1]))

const infoCardTitleCount = (html) =>
  (html.match(/<article class="info-card[^"]*"[^>]*>[\s\S]*?<h2\b/gi) || []).length

const h2BeforeH3AfterH1 = (html) => {
  const firstH1 = html.search(/<h1\b[^>]*>/i)
  if (firstH1 === -1) return false
  const rest = html.slice(firstH1)
  const nextH2 = rest.search(/<h2\b[^>]*>/i)
  const nextH3 = rest.search(/<h3\b[^>]*>/i)
  return nextH2 !== -1 && (nextH3 === -1 || nextH2 < nextH3)
}

const PAGE = "public/promptly/support/index.html"
const LIVE_SCRIPT = "scripts/test-public-live-promptly-support-heading-hierarchy.mjs"
const LIVE_WORKFLOW = ".github/workflows/live-site-check-promptly-support.yml"
const REPAIRED_TITLES = [
  "A single, clear support route.",
  "Support, privacy, and contact stay connected.",
  "A lasting support destination."
]

console.log("test-public-promptly-support-heading-hierarchy: PR #20 Promptly support H2 cards")

console.log("A. source public/promptly/support/index.html keeps the PR #20 outline")
{
  const html = read(PAGE)
  const levels = headingLevelsOf(html)
  ok(levels.length > 0, "page contains at least one heading")
  ok(levels.filter((l) => l === 1).length === 1, "page has exactly one H1")
  ok(levels[0] === 1, "the H1 is the first heading in the outline")
  ok(infoCardTitleCount(html) === 3, "the three card headings are H2s inside .info-card articles")
  const cardH2s = levels.filter((l) => l === 2).length
  ok(cardH2s >= 4, "card H2s plus the footer H2 keep a flat H2 band before the footer H3s")
  let jumps = 0
  for (let i = 1; i < levels.length; i++) {
    if (levels[i] - levels[i - 1] > 1) jumps++
  }
  ok(jumps === 0, "no heading-level jump greater than one (no H1 -> H3 skip)")
  ok(h2BeforeH3AfterH1(html), "H2 follows the first H1 before any H3")
  for (const title of REPAIRED_TITLES) {
    ok(html.includes(`<h2>${title}</h2>`), `repaired H2 title present: ${title}`)
  }
  ok(!html.includes("<h3>A support address that is ready now.</h3>"), "stale live H3 title is absent from source")
  ok(!html.includes("<h3>Useful before launch and after it.</h3>"), "stale live H3 title is absent from source")
}

console.log("B. stale H1->H3 snippet fails the H2-before-H3 predicate")
ok(!h2BeforeH3AfterH1("<h1>x</h1><h3>y</h3>"), "stale H1 then H3 snippet is rejected")
ok(h2BeforeH3AfterH1("<h1>x</h1><h2>y</h2><h3>z</h3>"), "repaired H1 then H2 snippet is accepted")

console.log("C. live alarm + nightly workflow exist and stay out of npm test/ci")
{
  const live = read(LIVE_SCRIPT)
  const workflow = read(LIVE_WORKFLOW)
  const pkg = JSON.parse(read("package.json"))
  ok(live.includes("https://tinystudio.in/promptly/support/"), "live script fetches /promptly/support/")
  ok(live.includes("public/promptly/support/index.html"), "live script names the source file")
  ok(live.includes("SKIP_LIVE_CHECKS"), "live script honors SKIP_LIVE_CHECKS")
  ok(
    pkg.scripts["site:check-live-promptly-support-heading-hierarchy"] ===
      "node scripts/test-public-live-promptly-support-heading-hierarchy.mjs",
    "package.json has site:check-live-promptly-support-heading-hierarchy"
  )
  ok(
    !pkg.scripts.test.includes("test-public-live-promptly-support-heading-hierarchy.mjs"),
    "npm test does not run the live promptly-support heading script"
  )
  ok(
    !pkg.scripts.ci.includes("test-public-live-promptly-support-heading-hierarchy.mjs"),
    "npm run ci does not run the live promptly-support heading script"
  )
  ok(
    pkg.scripts.test.includes("test-public-promptly-support-heading-hierarchy.mjs"),
    "npm test runs this hermetic promptly-support heading test"
  )
  ok(
    pkg.scripts.ci.includes("test-public-promptly-support-heading-hierarchy.mjs"),
    "npm run ci runs this hermetic promptly-support heading test"
  )
  ok(workflow.includes("test-public-live-promptly-support-heading-hierarchy.mjs"), "nightly workflow runs the live script")
  ok(!/pull_request/.test(workflow), "nightly workflow is not on pull_request")
  ok(/cron: "33 3 \* \* \*"/.test(workflow), "nightly workflow uses the offset 03:33 UTC cron")
}

console.log("D. existing post-deploy / bundle proofs for /promptly/support/ still named (do not edit those files)")
{
  const liveDeploy = read("scripts/check-public-live-deploy.mjs")
  const bundle = read("scripts/prepare-public-deploy-bundle.mjs")
  ok(liveDeploy.includes('get("/promptly/support/")'), "check-public-live-deploy still fetches /promptly/support/")
  ok(bundle.includes("promptly/support/index.html"), "NEUTRAL_PROOFS region still names promptly/support/index.html")
  ok(bundle.includes("PRs #18/#20") || bundle.includes("PR #20"), "bundle proof still names PR #20")
}

console.log(`\n${checks} checks, ${failures} failures`)
process.exit(failures === 0 ? 0 : 1)
