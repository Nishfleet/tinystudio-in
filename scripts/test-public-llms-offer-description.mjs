import { readFileSync } from "node:fs"
import { fileURLToPath } from "node:url"
import { dirname, join } from "node:path"

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..")
const read = (p) => readFileSync(join(ROOT, p), "utf8")

const DISAMBIGUATION =
  "It is not affiliated with any other app or studio that uses the name Tiny Studio."

const extractDescriptionParagraph = (content) =>
  content
    .split("## Public pages")[0]
    .split(/\n{2,}/)
    .map((block) => block.trim())
    .filter((block) => block.length > 0 && !block.startsWith("#"))
    .join("\n\n")

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

console.log("test-public-llms-offer-description: llms.txt opening paragraph names The Website Correction offer identically in both sources")

console.log("A. public/llms.txt exists and its first paragraph names the managed service")
let llmsTxt = null
try {
  llmsTxt = read("public/llms.txt")
  ok(true, "public/llms.txt exists and is readable")
} catch {
  ok(false, "public/llms.txt exists and is readable")
}
if (llmsTxt === null) {
  console.log(`\n${checks} checks, ${failures} failures`)
  process.exit(1)
}
const llmsParagraph = extractDescriptionParagraph(llmsTxt)
ok(llmsParagraph.length > 0, "public/llms.txt has a description paragraph before '## Public pages'")
ok(
  llmsParagraph.includes("Website Correction"),
  "public/llms.txt description paragraph names The Website Correction"
)

console.log("B. the llms.txt generator template satisfies the same assertions")
const bundle = read("scripts/prepare-static-site-bundle.mjs")
const templateMatch = bundle.match(/const llmsTxt = `([\s\S]*?)`;/)
ok(templateMatch !== null, "scripts/prepare-static-site-bundle.mjs defines the llmsTxt template string")
if (!templateMatch) {
  console.log(`\n${checks} checks, ${failures} failures`)
  process.exit(1)
}
const templateParagraph = extractDescriptionParagraph(templateMatch[1])
ok(
  templateParagraph.length > 0,
  "template's first paragraph before '## Public pages' is present"
)
ok(
  templateParagraph.includes("Website Correction"),
  "template's description paragraph names The Website Correction"
)

console.log("C. single source of truth: both copies are byte-identical")
ok(
  llmsParagraph === templateParagraph,
  "description paragraph in public/llms.txt is byte-identical to the template's"
)

console.log("D. disambiguation sentence stays verbatim in both")
ok(llmsParagraph.includes(DISAMBIGUATION), "public/llms.txt keeps the non-affiliation sentence")
ok(templateParagraph.includes(DISAMBIGUATION), "template keeps the non-affiliation sentence")

console.log("E. the paragraph remains a summary grounded in PRODUCT.md facts")
const sentences = llmsParagraph.split(/(?<=[.!?])\s+/).filter((s) => s.trim().length > 0)
ok(sentences.length <= 4, `description paragraph is at most 4 sentences (got ${sentences.length})`)
ok(sentences[sentences.length - 1] === DISAMBIGUATION, "the disambiguation sentence closes the paragraph")
ok(
  llmsParagraph.includes("human-reviewed"),
  "paragraph describes the service as human-reviewed"
)
ok(
  llmsParagraph.includes("$1,000"),
  "paragraph states the $1,000 founder pilot price fact"
)
ok(
  llmsParagraph.includes("first three clients"),
  "paragraph scopes the pilot to the first three clients"
)

console.log("F. npm test/ci wiring")
const pkg = JSON.parse(read("package.json"))
ok(
  pkg.scripts.test.includes("test-public-llms-offer-description.mjs"),
  "npm test runs the llms.txt offer description test"
)
ok(
  pkg.scripts.ci.includes("test-public-llms-offer-description.mjs"),
  "npm run ci runs the llms.txt offer description test"
)

console.log(`\n${checks} checks, ${failures} failures`)
process.exit(failures === 0 ? 0 : 1)
