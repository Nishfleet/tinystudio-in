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

const DISAMBIGUATION =
  "It is not affiliated with any other app or studio that uses the name Tiny Studio."
const OFFER_FACTS = [
  "The Website Correction",
  "human-reviewed managed service",
  "$1,000 fixed-scope founder pilot",
  "first three clients",
  "one focused correction pass",
  "single highest-leverage page",
  "Managed IT",
  "MSP",
  "cybersecurity",
  "live site"
]

// The description paragraph is everything between the "# Tiny Studio" title
// and the "## Public pages" section.
const descriptionParagraphOf = (llmsText) => {
  const head = llmsText.split("## Public pages")[0]
  return head
    .split("\n")
    .filter((line) => line.trim() !== "" && !line.startsWith("#"))
    .join("\n")
    .trim()
}

// Read the llmsTxt template literal out of the generator's source so this
// check never has to execute the generator itself.
const templateLlmsTextOf = (scriptSource) => {
  const match = scriptSource.match(/const llmsTxt = `([\s\S]*?)`/)
  return match ? match[1] : null
}

console.log("test-public-llms-offer-description: llms.txt describes The Website Correction managed service")

console.log("A. public/llms.txt names the offer in its first paragraph")
const llmsTxt = read("public/llms.txt")
const llmsParagraph = descriptionParagraphOf(llmsTxt)
ok(llmsParagraph.length > 0, 'public/llms.txt has a description paragraph before "## Public pages"')
ok(
  llmsParagraph.includes("Website Correction"),
  "the llms.txt description paragraph names The Website Correction"
)
ok(llmsParagraph.includes(DISAMBIGUATION), "the llms.txt description keeps the non-affiliation statement")

console.log("B. the llms.txt generator template carries the same offer description")
const bundleSource = read("scripts/prepare-static-site-bundle.mjs")
const templateLlmsTxt = templateLlmsTextOf(bundleSource)
ok(templateLlmsTxt !== null, "prepare-static-site-bundle.mjs defines the llmsTxt template string")
let bundleParagraph = ""
if (templateLlmsTxt !== null) {
  bundleParagraph = descriptionParagraphOf(templateLlmsTxt)
  ok(
    bundleParagraph.includes("Website Correction"),
    "the template description paragraph names The Website Correction"
  )
  ok(bundleParagraph.includes(DISAMBIGUATION), "the template description keeps the non-affiliation statement")
}

console.log("C. both copies stay byte-identical and grounded in PRODUCT.md facts")
ok(
  llmsParagraph === bundleParagraph,
  "llms.txt and the generator template share one byte-identical description paragraph"
)
for (const fact of OFFER_FACTS) {
  ok(llmsParagraph.includes(fact), `the description paragraph states the PRODUCT.md fact: ${fact}`)
}
ok(
  !/\b(guarantee|rank|ranking|#1|best-in-class|10x|results? in)\b/i.test(llmsParagraph),
  "the description paragraph makes no outcome or ranking claims"
)

console.log(`\n${checks} checks, ${failures} failures`)
process.exit(failures === 0 ? 0 : 1)
