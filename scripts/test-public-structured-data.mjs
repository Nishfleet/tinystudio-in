import { readFileSync, readdirSync } from "node:fs"
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

const PAGES = [
  {
    file: "public/contact/index.html",
    pageType: "ContactPage",
    label: "contact page"
  },
  {
    file: "public/promptly/privacy/index.html",
    pageType: "WebPage",
    label: "Promptly privacy policy page"
  },
  {
    file: "public/privacy/index.html",
    pageType: "WebPage",
    label: "studio privacy hub page"
  },
  {
    file: "public/terms/index.html",
    pageType: "WebPage",
    label: "terms page"
  },
  {
    file: "public/privacy-choices/index.html",
    pageType: "WebPage",
    label: "privacy choices page"
  },
  {
    file: "public/drishti/privacy/index.html",
    pageType: "WebPage",
    label: "Drishti privacy policy page"
  },
  {
    file: "public/drishti/support/index.html",
    pageType: "ContactPage",
    label: "Drishti support page"
  },
  {
    file: "public/promptly/support/index.html",
    pageType: "ContactPage",
    label: "Promptly support page"
  },
  {
    file: "public/compare/index.html",
    pageType: "WebPage",
    label: "compare hub page"
  }
]

const ORG_ID = "https://tinystudio.in/#organization"
const EXPECTED_ORG_DESCRIPTION =
  "Tiny Studio is the independent product company at tinystudio.in behind Promptly, Drishti, and 0509. Tiny Studio also offers The Website Correction, a human-reviewed managed service for founder-led Managed IT/MSP/cybersecurity companies with a live site. It is not affiliated with other apps or studios that use the name Tiny Studio."
const SUPPORT_ORG_DESCRIPTION =
  "Tiny Studio is the independent product company at tinystudio.in behind Promptly, Drishti, and 0509. It is not affiliated with other apps or studios that use the name Tiny Studio."
const PRIVACY_HUB_ORG_DESCRIPTION =
  "Tiny Studio is the independent product company at tinystudio.in behind Promptly, Drishti, and 0509. It is not affiliated with other apps or studios that use the name Tiny Studio."
const ORG_NAME = "Tiny Studio"

const titleOf = (html) => {
  const m = html.match(/<title>([^<]*)<\/title>/i)
  return m ? m[1].trim() : ""
}
const descriptionOf = (html) => {
  const m = html.match(/<meta\b[^>]*name="description"[^>]*content="([^"]*)"[^>]*>/i)
  return m ? m[1] : ""
}
const canonicalOf = (html) => {
  const m = html.match(/<link\s+rel="canonical"\s+href="([^"]*)">/i)
  return m ? m[1] : ""
}
const jsonLdBlocksOf = (html) =>
  [...html.matchAll(/<script\s+type="application\/ld\+json"[^>]*>([\s\S]*?)<\/script>/gi)].map(
    (m) => m[1]
  )

const publicHtmlFiles = (dir = "public") =>
  readdirSync(join(ROOT, dir), { withFileTypes: true }).flatMap((entry) => {
    const path = join(dir, entry.name)
    if (entry.isDirectory()) return publicHtmlFiles(path)
    if (entry.isFile() && entry.name === "index.html") return [path]
    return []
  })

console.log("test-public-structured-data: JSON-LD structured data on public pages")

for (const { file, pageType, label } of PAGES) {
  console.log(`A. ${file}`)
  const html = read(file)
  const blocks = jsonLdBlocksOf(html)

  ok(blocks.length === 1, `${label} has exactly one application/ld+json block`)
  if (blocks.length !== 1) continue

  let graph
  try {
    graph = JSON.parse(blocks[0])
    ok(true, `${label} JSON-LD block parses as valid JSON`)
  } catch (err) {
    ok(false, `${label} JSON-LD block parses as valid JSON (${err.message})`)
    continue
  }

  ok(graph["@context"] === "https://schema.org", `${label} uses the schema.org context`)
  ok(Array.isArray(graph["@graph"]), `${label} JSON-LD uses an @graph array`)

  const canonical = canonicalOf(html)
  const title = titleOf(html)
  const description = descriptionOf(html)
  ok(canonical.length > 0, `${label} page declares a canonical URL`)
  ok(title.length > 0, `${label} page declares a title`)
  ok(description.length > 0, `${label} page declares a description`)

  const org = (graph["@graph"] || []).find(
    (node) => node["@type"] === "Organization" && node["@id"] === ORG_ID
  )
  ok(
    org && org.name === ORG_NAME && org.url === "https://tinystudio.in/",
    `${label} JSON-LD carries the stable Tiny Studio organization reference`
  )

  const page = (graph["@graph"] || []).find((node) => node["@type"] === pageType)
  ok(page !== undefined, `${label} JSON-LD declares the page as ${pageType}`)
  if (!page) continue

  ok(page.url === canonical, `${label} JSON-LD url matches the page canonical URL`)
  ok(page.name === title, `${label} JSON-LD name matches the page title`)
  ok(page.description === description, `${label} JSON-LD description matches the meta description`)
  ok(
    page["isPartOf"] && page["isPartOf"]["@id"] === "https://tinystudio.in/#website",
    `${label} JSON-LD page is part of the Tiny Studio website`
  )
  ok(
    page["about"] && page["about"]["@id"] === ORG_ID,
    `${label} JSON-LD page is about the Tiny Studio organization`
  )
}

console.log("B. homepage Organization knowsAbout and Service schema for The Website Correction")
{
  const file = "public/index.html"
  const html = read(file)
  const blocks = jsonLdBlocksOf(html)
  ok(blocks.length === 1, `${file} has exactly one application/ld+json block`)
  if (blocks.length !== 1) {
    console.error("  skipping homepage knowsAbout/Service checks (no JSON-LD block)")
  } else {
    let graph
    try {
      graph = JSON.parse(blocks[0])
      ok(true, `${file} JSON-LD block parses as valid JSON`)
    } catch (err) {
      ok(false, `${file} JSON-LD block parses as valid JSON (${err.message})`)
      graph = null
    }
    if (graph) {
      const nodes = graph["@graph"] || []
      const org = nodes.find((n) => n["@type"] === "Organization" && n["@id"] === ORG_ID)
      ok(org !== undefined, `${file} carries the Organization node`)
      if (org) {
        ok(
          Array.isArray(org["knowsAbout"]) && org["knowsAbout"].length >= 4,
          `${file} Organization declares knowsAbout with at least 4 entries`
        )
        if (Array.isArray(org["knowsAbout"])) {
          const knowsAboutText = org["knowsAbout"].join(" ").toLowerCase()
          ok(
            knowsAboutText.includes("msp") || knowsAboutText.includes("managed it"),
            `${file} knowsAbout declares MSP/managed-IT service expertise`
          )
          ok(
            knowsAboutText.includes("website") || knowsAboutText.includes("website service"),
            `${file} knowsAbout declares website service expertise`
          )
          ok(
            knowsAboutText.includes("human-reviewed") || knowsAboutText.includes("human reviewed"),
            `${file} knowsAbout declares human-reviewed service expertise`
          )
        }
      }

      const service = nodes.find((n) => n["@type"] === "Service")
      ok(service !== undefined, `${file} carries a Service schema node`)
      if (service) {
        ok(
          service["provider"] && service["provider"]["@id"] === ORG_ID,
          `${file} Service provider links to the Organization entity`
        )
        ok(
          typeof service["serviceType"] === "string" && service["serviceType"].length > 0,
          `${file} Service declares a serviceType`
        )
        ok(
          typeof service["areaServed"] === "string" && service["areaServed"].length > 0,
          `${file} Service declares an areaServed`
        )
        ok(
          typeof service["description"] === "string" && service["description"].length > 0,
          `${file} Service declares a description`
        )
        if (typeof service["description"] === "string") {
          const desc = service["description"].toLowerCase()
          ok(
            desc.includes("human-reviewed") || desc.includes("human reviewed"),
            `${file} Service description names the human-reviewed managed service`
          )
          ok(
            desc.includes("msp") || desc.includes("managed it"),
            `${file} Service description names the MSP/managed-IT buyer`
          )
          ok(
            desc.includes("$1,000") || desc.includes("$1000"),
            `${file} Service description names the $1,000 founder pilot price`
          )
          ok(
            !desc.includes("guarantee") && !desc.includes("roas") && !desc.includes("conversion rate"),
            `${file} Service description makes no revenue/ranking/ROAS/conversion guarantees`
          )
        }
      }
    }
  }
}

console.log("C. every public HTML page carries exactly one JSON-LD block")
for (const file of publicHtmlFiles()) {
  const html = read(file)
  const blocks = jsonLdBlocksOf(html)
  ok(blocks.length === 1, `${file} carries exactly one application/ld+json block`)
}

console.log("B2. every non-home Organization description matches the studio-wide entity description")
const NON_HOME_ORG_PAGES = [
  "public/compare/index.html",
  "public/contact/index.html",
  "public/drishti/index.html",
  "public/drishti/privacy/index.html",
  "public/drishti/support/index.html",
  "public/privacy-choices/index.html",
  "public/promptly/index.html",
  "public/promptly/privacy/index.html",
  "public/promptly/support/index.html",
  "public/terms/index.html",
]
for (const file of NON_HOME_ORG_PAGES) {
  const blocks = jsonLdBlocksOf(read(file))
  let desc = null
  if (blocks.length === 1) {
    try {
      const graph = JSON.parse(blocks[0])
      const org = (graph["@graph"] || []).find((n) => n["@type"] === "Organization" && n["@id"] === ORG_ID)
      if (org && typeof org.description === "string") desc = org.description
    } catch { desc = null }
  }
  ok(
    desc === EXPECTED_ORG_DESCRIPTION,
    `${file} Organization description names the app portfolio and The Website Correction identically to the studio-wide entity`
  )
}

console.log("B3. the support page carries its own Organization description without the snoozed managed-service sentence")
{
  const blocks = jsonLdBlocksOf(read("public/support/index.html"))
  let desc = null
  if (blocks.length === 1) {
    try {
      const graph = JSON.parse(blocks[0])
      const org = (graph["@graph"] || []).find((n) => n["@type"] === "Organization" && n["@id"] === ORG_ID)
      if (org && typeof org.description === "string") desc = org.description
    } catch { desc = null }
  }
  ok(
    desc === SUPPORT_ORG_DESCRIPTION,
    "support page Organization description matches the support-specific description with no The Website Correction sentence"
  )
}

console.log("B4. the studio privacy hub carries its own Organization description without the snoozed managed-service sentence")
{
  const blocks = jsonLdBlocksOf(read("public/privacy/index.html"))
  let desc = null
  if (blocks.length === 1) {
    try {
      const graph = JSON.parse(blocks[0])
      const org = (graph["@graph"] || []).find((n) => n["@type"] === "Organization" && n["@id"] === ORG_ID)
      if (org && typeof org.description === "string") desc = org.description
    } catch { desc = null }
  }
  ok(
    desc === PRIVACY_HUB_ORG_DESCRIPTION,
    "studio privacy hub Organization description matches the privacy-hub description with no The Website Correction sentence"
  )
}

console.log("D. npm test/ci wiring")
const pkg = JSON.parse(read("package.json"))
const wired = pkg.scripts.test.includes("test-public-structured-data.mjs")
ok(wired, "npm test runs the public structured data test")
ok(
  pkg.scripts.check === "npm test",
  "npm run check delegates to npm test"
)
ok(
  pkg.scripts.ci.includes("test-public-structured-data.mjs"),
  "npm run ci runs the public structured data test"
)

console.log(`\n${checks} checks, ${failures} failures`)
process.exit(failures === 0 ? 0 : 1)
