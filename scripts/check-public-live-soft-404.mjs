// Guard the LIVE public site against soft-404s: an unknown URL on
// tinystudio.in must return HTTP 404 with the real 404 page, never HTTP 200
// with the homepage.
//
// The static test (test-public-soft-404.mjs) only proves public/404.html
// exists in the repo; it cannot catch a stale or misconfigured deployment.
// This check hits the deployed site so a regression is detected the moment it
// ships. It is wired into `npm run ci` and a nightly workflow.
//
// Escape hatch for machines without network access:
//   SKIP_LIVE_CHECKS=1 npm run ci
//
// Only the local site name and the local static file are referenced here;
// there is no per-environment configuration.

import { existsSync, readFileSync } from "node:fs"
import { fileURLToPath } from "node:url"
import { dirname, join } from "node:path"
import { randomBytes } from "node:crypto"

if (process.env.SKIP_LIVE_CHECKS === "1") {
  console.log("check-public-live-soft-404: SKIP_LIVE_CHECKS=1, skipping live site checks")
  process.exit(0)
}

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..")
const SITE = "https://tinystudio.in"
const HOME_TITLE = "Tiny Studio | Promptly, Drishti, and 0509"
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

console.log(`\n${checks} checks, ${failures} failures`)
if (failures > 0) {
  console.error("\nThe live site is soft-404ing or serving a stale bundle. Re-deploy the public site from origin/main and re-run this check.")
}
process.exit(failures === 0 ? 0 : 1)
