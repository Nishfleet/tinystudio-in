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

console.log("B. the homepage Organization entity carries distinguishing identity")
const org = orgNode(HOME)
ok(org !== null, "homepage JSON-LD carries the Tiny Studio organization node")
if (org) {
  ok(org.name === "Tiny Studio", "organization name is Tiny Studio")
  ok(org.alternateName === "tinystudio.in", "organization alternateName is tinystudio.in")
  ok(org.url === "https://tinystudio.in/", "organization url is the tinystudio.in home")
  ok(
    typeof org.description === "string" && org.description.length > 0,
    "organization carries a description"
  )
  ok(
    org.description &&
      org.description.includes("tinystudio.in") &&
      org.description.includes("Promptly") &&
      org.description.includes("Drishti") &&
      org.description.includes("0509"),
    "organization description names the unique products and home so the entity cannot be mistaken for another tiny studio"
  )
  ok(
    org.description && org.description.includes("not affiliated"),
    "organization description states it is not affiliated with other tiny studio brands"
  )
}

console.log("C. npm test/ci wiring")
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
