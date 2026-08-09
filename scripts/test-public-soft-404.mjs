import { existsSync, readFileSync } from "node:fs"
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

// Cloudflare Pages treats a top-level 404.html as the not-found page for
// unmatched routes (404 status). Without it, Pages assumes single-page
// application rendering and serves index.html with HTTP 200 for every
// unknown URL - the soft-404 this test guards against.
const NOT_FOUND_PAGE = "public/404.html"
const HOME_PAGE = "public/index.html"
const NOT_FOUND_TITLE = "Page not found • Tiny Studio"

const internalHrefsOf = (html) =>
  [...html.matchAll(/\bhref="([^"]+)"/gi)]
    .map((m) => m[1])
    .filter(
      (href) =>
        !/^(mailto:|tel:|#|https?:\/\/)/i.test(href) &&
        !href.startsWith("/cdn-cgi/")
    )

// Resolve a repo-style absolute href (e.g. "/", "/contact/", "/#products")
// to one or more candidate paths under public/ and report the first hit.
const resolvesUnderPublic = (href) => {
  const clean = href.split("#")[0].split("?")[0]
  if (clean === "" || clean === "/") {
    return existsSync(join(ROOT, "public/index.html"))
  }
  const noLeading = clean.replace(/^\//, "")
  const candidates = []
  if (noLeading.endsWith("/")) {
    candidates.push(`${noLeading}index.html`)
  } else if (!noLeading.includes(".")) {
    candidates.push(noLeading, `${noLeading}.html`)
  } else {
    candidates.push(noLeading)
  }
  return candidates.some((c) => existsSync(join(ROOT, "public", c)))
}

console.log("test-public-soft-404: unknown URLs must not soft-404 as the homepage")

console.log("A. public/404.html is a real not-found page, not a homepage clone")
ok(existsSync(join(ROOT, NOT_FOUND_PAGE)), "public/404.html exists")
if (existsSync(join(ROOT, NOT_FOUND_PAGE))) {
  const html = read(NOT_FOUND_PAGE)
  const home = read(HOME_PAGE)
  const title = html.match(/<title>([^<]*)<\/title>/i)?.[1] ?? ""
  const homeTitle = home.match(/<title>([^<]*)<\/title>/i)?.[1] ?? ""
  ok(title.toLowerCase().includes("not found"), "the page title marks it as not found")
  ok(title !== homeTitle, "the 404 page does not reuse the homepage title")
  ok(!/href="https:\/\/tinystudio\.in\/"/.test(html), "the 404 page has no canonical pointing at the homepage")
  ok(/<meta name="robots" content="noindex">/.test(html), "the 404 page is noindex as a belt-and-suspenders guard")
  const levels = [...html.matchAll(/<h([1-6])\b[^>]*>/gi)].map((m) => Number(m[1]))
  ok(levels.filter((l) => l === 1).length === 1, "the 404 page has exactly one H1")
  ok(levels[0] === 1, "the H1 is the first heading in the outline")
  const h1 = html.match(/<h1\b[^>]*>([\s\S]*?)<\/h1>/i)?.[1] ?? ""
  ok(/not be found|could not be found/i.test(h1), "the H1 tells visitors the page could not be found")
  ok(!html.includes(home.slice(0, 200)), "the 404 page does not embed the homepage content")
}

console.log("B. every internal link on the 404 page resolves to a real public destination")
ok(existsSync(join(ROOT, NOT_FOUND_PAGE)), "public/404.html exists")
if (existsSync(join(ROOT, NOT_FOUND_PAGE))) {
  const hrefs = internalHrefsOf(read(NOT_FOUND_PAGE))
  ok(hrefs.length >= 6, `the 404 page offers real escape links (${hrefs.length} internal links)`)
  let broken = 0
  for (const href of hrefs) {
    if (!resolvesUnderPublic(href)) {
      broken++
      console.error(`    broken target: ${href}`)
    }
  }
  ok(broken === 0, "no internal link on the 404 page points at a missing destination")
}

console.log("C. the 404 page carries the shared header/footer chrome")
ok(existsSync(join(ROOT, NOT_FOUND_PAGE)), "public/404.html exists")
if (existsSync(join(ROOT, NOT_FOUND_PAGE))) {
  const html = read(NOT_FOUND_PAGE)
  ok(/class="site-header"/.test(html), "the 404 page keeps the site header")
  ok(/class="top-nav"/.test(html), "the 404 page keeps the primary navigation")
  ok(/class="footer"/.test(html), "the 404 page keeps the site footer")
  ok(/class="footer-links"/.test(html), "the 404 page keeps footer link lists")
}

console.log("D. npm test/ci wiring")
const pkg = JSON.parse(read("package.json"))
ok(
  pkg.scripts.test.includes("test-public-soft-404.mjs"),
  "npm test runs the public soft-404 test"
)
ok(
  pkg.scripts.ci.includes("test-public-soft-404.mjs"),
  "npm run ci runs the public soft-404 test"
)

console.log(`\n${checks} checks, ${failures} failures`)
process.exit(failures === 0 ? 0 : 1)
