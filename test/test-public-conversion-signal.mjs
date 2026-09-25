import { readFileSync, existsSync } from "node:fs"
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

const OFFER_NAME = "The Website Correction"
const SIGNAL_REGISTRY = [
  { name: "homepage-hero", meaning: "Website Correction CTA in the homepage hero rail" },
  { name: "homepage-service", meaning: "Website Correction CTA in the homepage managed-service section" },
  { name: "homepage-footer", meaning: "Website Correction CTA in the homepage footer" }
]
const REGISTRY_NAMES = SIGNAL_REGISTRY.map((s) => s.name)

const DOCS_PATH = "docs/measurement/public-conversion-signal.md"
const INDEX_HTML = "public/index.html"
const CONTACT_HTML = "public/contact/index.html"
const PRIVACY_CHOICES_HTML = "public/privacy-choices/index.html"

const forbidden = [
  "document.cookie", "localStorage", "sessionStorage", "navigator.sendBeacon", "sendBeacon(",
  "fetch(", "XMLHttpRequest",
  "googletagmanager", "google-analytics", "gtag(", "plausible.io", "fathom.js",
  "posthog", "mixpanel", "amplitude", "window.analytics", "hotjar", "clarity.ms", "fbq(",
  "connect.facebook.net",
  "toDataURL", "hardwareConcurrency", "deviceMemory", "navigator.plugins", "FingerprintJS",
  "window.fingerprint"
]

const anchorsOf = (html) => [...html.matchAll(/<a\b[^>]*>/gi)].map((m) => m[0])
const hrefOf = (a) => {
  const m = a.match(/href\s*=\s*"([^"]*)"/i)
  return m ? m[1] : ""
}
const decoded = (s) => s.replace(/%20/gi, " ").replace(/%3D/gi, "=").replace(/%26/gi, "&").toLowerCase()

const isWebsiteCorrectionCta = (a) => {
  const href = decoded(hrefOf(a))
  return (
    /data-measure-source\s*=\s*"/i.test(a) ||
    (/^mailto:support@tinystudio\.in\?subject=/.test(href) && href.includes("website correction")) ||
    (href.includes("/contact/") && /[?&]source=/.test(href))
  )
}

console.log("test-public-conversion-signal: public conversion signal (The Website Correction application route)")

console.log("A. signal definitions")
ok(REGISTRY_NAMES.length === new Set(REGISTRY_NAMES).size, "registry names are unique")
ok(REGISTRY_NAMES.every((n) => /^[a-z][a-z0-9-]*$/.test(n)), "registry names are stable lowercase slugs")

console.log("B. docs contract")
ok(existsSync(join(ROOT, DOCS_PATH)), `${DOCS_PATH} exists`)
if (existsSync(join(ROOT, DOCS_PATH))) {
  const docs = read(DOCS_PATH)
  for (const name of REGISTRY_NAMES) ok(docs.includes(name), `docs document signal source ${name}`)
  ok(docs.includes(OFFER_NAME), "docs name the offer truthfully as The Website Correction")
  ok(!docs.includes("reviewed service"), "docs never name the offer as a generic reviewed service")
  ok(docs.includes("prefilled subject"), "docs state the prefilled application subject is the operator-visible signal")
  ok(docs.includes("The Website Correction application — from"), "docs pin the operator-visible subject format with the exact product name")
  ok(docs.includes("(internal measurement marker)"), "docs pin the full propagated subject format")
  ok(/owner/i.test(docs), "docs name the signal owner")
  ok(docs.includes("retention"), "docs state retention")
  ok(/privacy boundary/i.test(docs), "docs state the privacy boundary")
  ok(docs.includes("privacy-choices"), "docs explain where the privacy disclosure lives")
  ok(/falsif/i.test(docs), "docs contain a falsifiable decision rule")
  ok(docs.includes("not proof of completed applications"), "docs are honest that tags are not application proof")
  ok(docs.includes("only received human messages count"), "docs count only received human messages as completion evidence")
}

console.log("C. homepage Website Correction CTA source tags")
const indexHtml = read(INDEX_HTML)
const ctaTags = anchorsOf(indexHtml).filter(isWebsiteCorrectionCta)
if (ctaTags.length === 0) {
  console.log("  note: no Website Correction CTA present in this checkout (PR #10 public copy not merged); tag rule stays armed")
}
for (const a of ctaTags) {
  const m = a.match(/data-measure-source\s*=\s*"([^"]*)"/i)
  ok(m !== null, "every Website Correction CTA carries data-measure-source")
  if (m) {
    const name = m[1]
    ok(REGISTRY_NAMES.includes(name), `source tag ${name} is a registered stable name`)
    const href = decoded(hrefOf(a))
    const hasContext =
      href.includes(`source=${name}`) || (href.startsWith("mailto:") && href.includes(name))
    ok(hasContext, `CTA ${name} routes to the application endpoint with source context`)
  }
}

console.log("D. contact endpoint source propagation")
const contactHtml = read(CONTACT_HTML)
// The @ is entity-encoded in served HTML (support&#64;tinystudio.in) so the
// zone-level Cloudflare Email Address Obfuscation rewrite cannot degrade the
// CTA to the "[email protected]" placeholder; browsers decode the entity, so
// the mailto route below is inspected on a decoded copy.
const contactHtmlDecodedAts = contactHtml.replace(/&#64;/gi, "@")
ok(
  /href\s*=\s*"mailto:support@tinystudio\.in\?subject=[^"]*"/i.test(contactHtmlDecodedAts),
  "contact page has a Website Correction application mailto route"
)
ok(
  contactHtml.includes("?subject=The%20Website%20Correction%20application"),
  "contact page default subject is exactly The Website Correction application"
)
ok(
  decoded(contactHtml).includes("website correction"),
  "contact page application route names the offer as Website Correction"
)
ok(contactHtml.includes(OFFER_NAME), "contact page names the offer truthfully as The Website Correction")
ok(!contactHtml.includes("reviewed service"), "contact page never names the offer as a generic reviewed service")
ok(contactHtml.includes("internal measurement"), "contact page states the signal is for internal measurement only")
ok(contactHtml.includes("nothing is sent"), "contact page states nothing is sent automatically")
ok(contactHtml.includes("remove the marker") || contactHtml.includes("remove it"), "contact page states the marker can be removed before sending")
ok(contactHtml.includes("URLSearchParams") && contactHtml.includes('get("source")'), "contact page reads the ?source= parameter")
ok(
  REGISTRY_NAMES.every((n) => contactHtml.includes(n)),
  "contact page allowlists every registered source name"
)
ok(
  contactHtml.includes('"The Website Correction application — from " + source + " (internal measurement marker)"'),
  "contact page propagates the exact The Website Correction application — from <source> (internal measurement marker) subject"
)
ok(
  contactHtml.includes("indexOf(source)") || contactHtml.includes("includes(source)"),
  "contact page rejects unregistered source values"
)
for (const token of ["<form", "<input", "<textarea", "location.href", "location.assign", "location.replace", "window.open", ".submit(", "sendBeacon(", "fetch("]) {
  ok(!contactHtml.includes(token), `contact page has no auto-send/auto-submit mechanism (${token})`)
}

console.log("E. no analytics provider, cookies, fingerprinting, or message-content collection")
for (const file of [INDEX_HTML, CONTACT_HTML, PRIVACY_CHOICES_HTML]) {
  const html = read(file)
  for (const token of forbidden) {
    ok(!html.includes(token), `${file} has no ${token}`)
  }
}

console.log("F. npm test/ci wiring")
const pkg = JSON.parse(read("package.json"))
ok(
  pkg.scripts.test.includes("test-public-conversion-signal.mjs"),
  "npm test runs the public conversion signal test"
)
ok(
  pkg.scripts.ci.includes("test-public-conversion-signal.mjs"),
  "npm run ci runs the public conversion signal test"
)

console.log(`\n${checks} checks, ${failures} failures`)
process.exit(failures === 0 ? 0 : 1)
