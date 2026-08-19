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

const HOME = read("public/index.html")
const SUPPORT = read("public/support/index.html")
const CONTACT = read("public/contact/index.html")

// Strip markup so assertions run against the visible, human-readable text.
const bodyText = (html) =>
  html
    .replace(/<script\b[\s\S]*?<\/script>/gi, " ")
    .replace(/<style\b[\s\S]*?<\/style>/gi, " ")
    .replace(/<[^>]+>/g, " ")
    .replace(/\s+/g, " ")
    .trim()

const metaDescriptionOf = (html) => {
  const m = html.match(/<meta\b[^>]*name="description"[^>]*content="([^"]*)"[^>]*>/i)
  return m ? m[1] : ""
}

const anchorsOf = (html) =>
  [...html.matchAll(/<a\b[^>]*href="([^"]*)"[^>]*>([\s\S]*?)<\/a>/gi)].map((m) => [
    m[1],
    m[2]
  ])

const footerOf = (html) => {
  const start = html.indexOf("<footer")
  const end = html.indexOf("</footer>")
  return start === -1 ? "" : html.slice(start, end === -1 ? html.length : end)
}

console.log("test-public-product-lane-consistency: 0509 is co-branded on the homepage and named on the support and contact pages")

console.log("A. the homepage co-brands 0509 as the third product")
const homeText = bodyText(HOME)
ok(
  homeText.includes("Promptly, Drishti, and 0509"),
  "homepage visible copy names Promptly, Drishti, and 0509"
)
ok(homeText.includes("0509"), "homepage visible copy names 0509 as a product")
const homeAsk = anchorsOf(HOME).filter(([, text]) => text.includes("Ask about 0509"))
ok(homeAsk.length >= 1, "homepage has an Ask about 0509 CTA")
if (homeAsk.length > 0) {
  ok(
    homeAsk.every(([href]) => href === "/contact/"),
    "homepage Ask about 0509 routes to /contact/ (no dead 0509 page)"
  )
}
ok(
  /<li><a href="\/contact\/">0509<\/a><\/li>/.test(footerOf(HOME)),
  "homepage footer links 0509 to /contact/"
)

console.log("B. the support hub includes 0509 alongside Promptly and Drishti")
ok(metaDescriptionOf(SUPPORT).includes("0509"), "support hub meta description names 0509")
const supportText = bodyText(SUPPORT)
ok(supportText.includes("0509"), "support hub visible copy names 0509")
ok(
  supportText.includes("Promptly, Drishti, 0509"),
  "support hub lists the three products together"
)
const supportAsk = anchorsOf(SUPPORT).filter(([, text]) => text.includes("Ask about 0509"))
ok(supportAsk.length >= 1, "support hub has an Ask about 0509 route")
if (supportAsk.length > 0) {
  ok(
    supportAsk.every(([href]) => href === "/contact/"),
    "support hub Ask about 0509 routes to /contact/"
  )
}
ok(footerOf(SUPPORT).includes("0509"), "support hub footer lists 0509")

console.log("C. the Ask about 0509 destination (contact page) acknowledges 0509")
ok(metaDescriptionOf(CONTACT).includes("0509"), "contact page meta description names 0509")
const contactText = bodyText(CONTACT)
ok(contactText.includes("0509"), "contact page visible copy names 0509")
const contactAsk = anchorsOf(CONTACT).filter(([, text]) => text.includes("Ask about 0509"))
ok(contactAsk.length >= 1, "contact page has an Ask about 0509 route")
if (contactAsk.length > 0) {
  ok(
    contactAsk.every(
      ([href]) => href.startsWith("mailto:") || href === "/contact/"
    ),
    "contact page Ask about 0509 routes to the studio inbox or the contact route"
  )
}

console.log("D. npm test/ci wiring")
const pkg = JSON.parse(read("package.json"))
ok(
  pkg.scripts.test.includes("test-public-product-lane-consistency.mjs"),
  "npm test runs the public product lane consistency test"
)
ok(
  pkg.scripts.ci.includes("test-public-product-lane-consistency.mjs"),
  "npm run ci runs the public product lane consistency test"
)

console.log(`\n${checks} checks, ${failures} failures`)
process.exit(failures === 0 ? 0 : 1)
