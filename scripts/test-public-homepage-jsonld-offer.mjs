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

const jsonLdBlocksOf = (html) =>
  [...html.matchAll(/<script\s+type="application\/ld\+json"[^>]*>([\s\S]*?)<\/script>/gi)].map(
    (m) => m[1]
  )

const graph = (() => {
  const blocks = jsonLdBlocksOf(HOME)
  if (blocks.length !== 1) return null
  try {
    return JSON.parse(blocks[0])
  } catch {
    return null
  }
})()

const FORBIDDEN_CLAIMS = [
  "revenue",
  "ranking",
  "ROAS",
  "conversion",
  "booked call",
  "sales volume",
  "guarantee"
]

console.log("test-public-homepage-jsonld-offer: homepage JSON-LD Organization and WebSite descriptions name The Website Correction managed service")

console.log("A. homepage carries exactly one JSON-LD block that parses")
ok(graph !== null, "homepage has exactly one parseable JSON-LD block")
if (!graph) {
  console.log(`\n${checks} checks, ${failures} failures`)
  process.exit(1)
}

const org = (graph["@graph"] || []).find(
  (node) => node["@type"] === "Organization" && node["@id"] === "https://tinystudio.in/#organization"
)
const site = (graph["@graph"] || []).find(
  (node) => node["@type"] === "WebSite" && node["@id"] === "https://tinystudio.in/#website"
)

console.log("B. Organization description names The Website Correction managed service")
ok(org && typeof org.description === "string" && org.description.length > 0, "Organization node carries a description")
ok(
  org && org.description && org.description.includes("Website Correction"),
  "Organization description mentions The Website Correction"
)
ok(
  org && org.description && org.description.includes("managed service"),
  "Organization description mentions it is a managed service"
)
ok(
  org && org.description && org.description.includes("Managed IT/MSP/cybersecurity"),
  "Organization description names the buyer audience (Managed IT/MSP/cybersecurity)"
)
ok(
  org && org.description && org.description.includes("not affiliated"),
  "Organization description preserves the brand-disambiguation sentence"
)
ok(
  org && org.description && org.description.includes("Promptly") && org.description.includes("Drishti") && org.description.includes("0509"),
  "Organization description still names the app portfolio (Promptly, Drishti, 0509)"
)

console.log("C. WebSite description names The Website Correction managed service")
ok(site && typeof site.description === "string" && site.description.length > 0, "WebSite node carries a description")
ok(
  site && site.description && site.description.includes("Website Correction"),
  "WebSite description mentions The Website Correction"
)
ok(
  site && site.description && site.description.includes("managed service"),
  "WebSite description mentions it is a managed service"
)

console.log("D. no forbidden outcome/superiority claims in either description")
for (const claim of FORBIDDEN_CLAIMS) {
  const lc = claim.toLowerCase()
  ok(
    !(org && org.description && org.description.toLowerCase().includes(lc)),
    `Organization description does not claim "${claim}"`
  )
  ok(
    !(site && site.description && site.description.toLowerCase().includes(lc)),
    `WebSite description does not claim "${claim}"`
  )
}

console.log("E. npm test/ci wiring")
const pkg = JSON.parse(read("package.json"))
ok(
  pkg.scripts.test.includes("test-public-homepage-jsonld-offer.mjs"),
  "npm test runs the homepage JSON-LD offer test"
)
ok(
  pkg.scripts.ci.includes("test-public-homepage-jsonld-offer.mjs"),
  "npm run ci runs the homepage JSON-LD offer test"
)

console.log(`\n${checks} checks, ${failures} failures`)
process.exit(failures === 0 ? 0 : 1)
