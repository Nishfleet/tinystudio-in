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

const HOME = read("public/index.html")
const jsonLdBlocksOf = (html) =>
  [...html.matchAll(/<script\s+type="application\/ld\+json"[^>]*>([\s\S]*?)<\/script>/gi)].map(
    (m) => m[1]
  )
const orgNode = (html) => {
  const blocks = jsonLdBlocksOf(html)
  for (const block of blocks) {
    try {
      const graph = JSON.parse(block)
      const org = (graph["@graph"] || []).find(
        (node) => node["@type"] === "Organization" && node["@id"] === "https://tinystudio.in/#organization"
      )
      if (org) return org
    } catch {
      // ignore malformed blocks; the structured-data test covers validity
    }
  }
  return null
}
// Strip markup so assertions run against the visible, human-readable text.
const bodyText = (html) =>
  html
    .replace(/<script\b[\s\S]*?<\/script>/gi, " ")
    .replace(/<style\b[\s\S]*?<\/style>/gi, " ")
    .replace(/<[^>]+>/g, " ")
    .replace(/\s+/g, " ")
    .trim()

// Every deployed HTML page (index.html under public/, mirroring the
// structured-data and link-target tests).
const publicHtmlFiles = (dir = "public") =>
  readdirSync(join(ROOT, dir), { withFileTypes: true }).flatMap((entry) => {
    const path = join(dir, entry.name)
    if (entry.isDirectory()) return publicHtmlFiles(path)
    if (entry.isFile() && entry.name === "index.html") return [path]
    return []
  })

console.log("test-public-brand-disambiguation: Tiny Studio entity stays distinct from unrelated tiny studio brands")

console.log("A. the homepage says plainly what Tiny Studio is and is not")
const text = bodyText(HOME)
ok(
  text.includes("independent product company at tinystudio.in"),
  "homepage copy identifies Tiny Studio as an independent product company at tinystudio.in"
)
ok(
  text.includes("not affiliated with any other app or studio that uses the name Tiny Studio"),
  "homepage copy states Tiny Studio is not affiliated with other apps or studios using the name"
)

console.log("B. every public page's Organization entity carries distinguishing identity")
for (const file of publicHtmlFiles()) {
  const html = read(file)
  const org = orgNode(html)
  ok(org !== null, `${file} carries the Tiny Studio organization node`)
  if (!org) continue
  ok(org.name === "Tiny Studio", `${file} organization name is Tiny Studio`)
  ok(org.alternateName === "tinystudio.in", `${file} organization alternateName is tinystudio.in`)
  ok(org.url === "https://tinystudio.in/", `${file} organization url is the tinystudio.in home`)
  ok(
    typeof org.description === "string" && org.description.length > 0,
    `${file} organization carries a description`
  )
  ok(
    org.description &&
      org.description.includes("tinystudio.in") &&
      org.description.includes("Promptly") &&
      org.description.includes("Drishti") &&
      org.description.includes("0509"),
    `${file} organization description names the unique products and home so the entity cannot be mistaken for another tiny studio`
  )
  ok(
    org.description && org.description.includes("not affiliated"),
    `${file} organization description states it is not affiliated with other tiny studio brands`
  )
}

console.log("C. the AI-facing llms.txt carries the same identity statement")
const llmsTxt = read("public/llms.txt")
ok(
  llmsTxt.includes("independent product company at tinystudio.in"),
  "llms.txt identifies Tiny Studio as the independent product company at tinystudio.in"
)
ok(
  llmsTxt.includes("not affiliated with any other app or studio that uses the name Tiny Studio"),
  "llms.txt states Tiny Studio is not affiliated with other apps or studios using the name"
)
const bundle = read("scripts/prepare-static-site-bundle.mjs")
ok(
  bundle.includes("independent product company at tinystudio.in"),
  "the llms.txt generator template keeps the independent-company identity"
)
ok(
  bundle.includes("not affiliated with any other app or studio that uses the name Tiny Studio"),
  "the llms.txt generator template keeps the non-affiliation statement"
)

console.log("D. npm test/ci wiring")
const pkg = JSON.parse(read("package.json"))
ok(
  pkg.scripts.test.includes("test-public-brand-disambiguation.mjs"),
  "npm test runs the public brand disambiguation test"
)
ok(
  pkg.scripts.ci.includes("test-public-brand-disambiguation.mjs"),
  "npm run ci runs the public brand disambiguation test"
)

console.log(`\n${checks} checks, ${failures} failures`)
process.exit(failures === 0 ? 0 : 1)
