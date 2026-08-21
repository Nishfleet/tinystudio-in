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

// The description paragraph is everything before the "## Public pages"
// heading except the "# Tiny Studio" title line.
const descriptionParagraph = (content) =>
  content
    .split("## Public pages")[0]
    .split("\n")
    .map((line) => line.trim())
    .filter((line) => line && !line.startsWith("#"))
    .join("\n")

const DISAMBIGUATION =
  "It is not affiliated with any other app or studio that uses the name Tiny Studio."

console.log(
  "test-public-llms-offer-description: the llms.txt entity summary names The Website Correction offer"
)

console.log("A. public/llms.txt opens with an offer-aware entity summary")
const llmsTxt = read("public/llms.txt")
const llmsParagraph = descriptionParagraph(llmsTxt)
ok(
  llmsTxt.includes("## Public pages"),
  "public/llms.txt exists and keeps its Public pages section"
)
ok(
  llmsParagraph.includes("Website Correction"),
  "the first paragraph of public/llms.txt names The Website Correction"
)

console.log("B. the generator template carries the same offer-aware summary")
const bundle = read("scripts/prepare-static-site-bundle.mjs")
const templateMatch = bundle.match(/const llmsTxt = `([\s\S]*?)`;/)
ok(templateMatch !== null, "scripts/prepare-static-site-bundle.mjs defines the llmsTxt template string")
const templateParagraph = templateMatch ? descriptionParagraph(templateMatch[1]) : ""
ok(
  templateParagraph.includes("Website Correction"),
  "the llmsTxt template's first paragraph names The Website Correction"
)

console.log("C. both copies stay byte-identical and keep the identity statement")
ok(
  llmsParagraph.length > 0 &&
    llmsParagraph === templateParagraph,
  "the description paragraph is byte-identical in public/llms.txt and the generator template"
)
ok(
  llmsParagraph.includes(DISAMBIGUATION),
  "the public/llms.txt paragraph keeps the non-affiliation sentence verbatim"
)
ok(
  templateParagraph.includes(DISAMBIGUATION),
  "the generator template paragraph keeps the non-affiliation sentence verbatim"
)

console.log(`\n${checks} checks, ${failures} failures`)
process.exit(failures === 0 ? 0 : 1)
