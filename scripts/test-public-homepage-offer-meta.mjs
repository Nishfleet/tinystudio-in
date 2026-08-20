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

// The homepage now leads with the managed-service offer (The Website
// Correction) for founder-led MSP buyers, per PRODUCT.md ## Buyer. The old
// portfolio framing ("Promptly, Drishti, and 0509") stays in the body copy
// where the page genuinely describes the portfolio, but it must no longer own
// the title, og:title, meta description, og:description, or og:image:alt —
// those surfaces are what every search result, link preview, and browser tab
// shows to a buyer being pitched the managed website service.
const OLD_PORTFOLIO_PHRASE = "Promptly, Drishti, and 0509"
const OFFER_PHRASE = "Website Correction"
const BUYER_PHRASES = ["founder-led", "MSP"]

const titleOf = (html) => {
  const m = html.match(/<title>([^<]*)<\/title>/i)
  return m ? m[1].trim() : ""
}

const metaOf = (html, name) => {
  const match = html.match(new RegExp(`<meta\\s+(?:name|property)="${name}"\\s+content="([^"]*)"`))
  return match ? match[1] : null
}

console.log("test-public-homepage-offer-meta: homepage title and social meta name the managed-service offer, not the old portfolio")

const html = read("public/index.html")
const title = titleOf(html)
const description = metaOf(html, "description") ?? ""
const ogTitle = metaOf(html, "og:title") ?? ""
const ogDescription = metaOf(html, "og:description") ?? ""
const ogImageAlt = metaOf(html, "og:image:alt") ?? ""

console.log("A. the homepage <title> names the managed-service offer, not the old portfolio")
ok(title.includes(OFFER_PHRASE), `homepage <title> names "${OFFER_PHRASE}"`)
ok(!title.includes(OLD_PORTFOLIO_PHRASE), `homepage <title> no longer reads "${OLD_PORTFOLIO_PHRASE}"`)

console.log("B. the homepage og:title names the managed-service offer, not the old portfolio")
ok(ogTitle.includes(OFFER_PHRASE), `homepage og:title names "${OFFER_PHRASE}"`)
ok(!ogTitle.includes(OLD_PORTFOLIO_PHRASE), `homepage og:title no longer reads "${OLD_PORTFOLIO_PHRASE}"`)
ok(ogTitle === title, "homepage og:title matches the <title>")

console.log("C. the homepage meta description names the offer and the founder-led MSP buyer, not the old portfolio")
ok(description.includes(OFFER_PHRASE), `homepage meta description names "${OFFER_PHRASE}"`)
ok(
  BUYER_PHRASES.every((phrase) => description.includes(phrase)),
  `homepage meta description names the founder-led MSP buyer (${BUYER_PHRASES.join(", ")})`
)
ok(!description.includes(OLD_PORTFOLIO_PHRASE), `homepage meta description no longer reads "${OLD_PORTFOLIO_PHRASE}"`)

console.log("D. og:description stays in sync with the meta description")
ok(ogDescription === description, "homepage og:description matches the meta description")

console.log("E. og:image:alt names the offer, not the old portfolio")
ok(ogImageAlt.includes(OFFER_PHRASE), `homepage og:image:alt names "${OFFER_PHRASE}"`)
ok(!ogImageAlt.includes(OLD_PORTFOLIO_PHRASE), `homepage og:image:alt no longer reads "${OLD_PORTFOLIO_PHRASE}"`)

console.log("F. the portfolio framing still lives in the body copy where it belongs")
ok(
  html.includes(OLD_PORTFOLIO_PHRASE),
  `homepage body copy still names "${OLD_PORTFOLIO_PHRASE}" (the portfolio section, not the meta)`
)

console.log("G. npm test/ci wiring")
const pkg = JSON.parse(read("package.json"))
ok(
  pkg.scripts.test.includes("test-public-homepage-offer-meta.mjs"),
  "npm test runs the public homepage offer meta test"
)
ok(
  pkg.scripts.ci.includes("test-public-homepage-offer-meta.mjs"),
  "npm run ci runs the public homepage offer meta test"
)

console.log(`\n${checks} checks, ${failures} failures`)
process.exit(failures === 0 ? 0 : 1)
