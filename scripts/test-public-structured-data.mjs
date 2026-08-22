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

console.log("B. every public HTML page carries exactly one JSON-LD block")
for (const file of publicHtmlFiles()) {
  const html = read(file)
  const blocks = jsonLdBlocksOf(html)
  ok(blocks.length === 1, `${file} carries exactly one application/ld+json block`)
}

console.log("C. npm test/ci wiring")
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
