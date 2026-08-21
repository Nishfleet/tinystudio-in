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
const OFFER_NAME = "Website Correction"
const FORBIDDEN_CLAIMS = /rank|guarantee|revenue|conversion|SEO results/i
const MAX_SENTENCES = 4

const descriptionParagraphOf = (llmsTxt) => {
  const beforePages = llmsTxt.split("## Public pages")[0] ?? ""
  const blocks = beforePages
    .split(/\n\s*\n/)
    .map((block) => block.trim())
    .filter((block) => block.length > 0 && !block.startsWith("#"))
  return blocks[0] ?? ""
}

const sentenceCountOf = (paragraph) =>
  paragraph
    .split(/[.!?](?:\s|$)/)
    .filter((sentence) => sentence.trim().length > 0).length

console.log(
  "test-public-llms-offer-description: llms.txt description names The Website Correction offer"
)

const llmsFile = read("public/llms.txt")
const bundleSource = read("scripts/prepare-static-site-bundle.mjs")
const templateMatch = bundleSource.match(/const llmsTxt = `([\s\S]*?)`;/)
ok(templateMatch !== null, "the site bundle script contains an llmsTxt template string")
const llmsTemplate = templateMatch ? templateMatch[1] : ""

const fileParagraph = descriptionParagraphOf(llmsFile)
const templateParagraph = descriptionParagraphOf(llmsTemplate)

console.log("A. public/llms.txt first paragraph names the managed-service offer")
ok(llmsFile.length > 0, "public/llms.txt exists and is readable")
ok(fileParagraph.length > 0, "public/llms.txt has a description paragraph before '## Public pages'")
ok(
  fileParagraph.includes(OFFER_NAME),
  "the description paragraph of public/llms.txt names The Website Correction"
)
ok(
  fileParagraph.length > 0 &&
    llmsFile.indexOf(fileParagraph) !== -1 &&
    llmsFile.indexOf("## Public pages") !== -1 &&
    llmsFile.indexOf(fileParagraph) < llmsFile.indexOf("## Public pages"),
  "the description paragraph appears before the '## Public pages' heading in public/llms.txt"
)

console.log("B. the llmsTxt generator template satisfies the same assertions")
ok(
  templateParagraph.includes(OFFER_NAME),
  "the description paragraph of the llmsTxt template names The Website Correction"
)
ok(
  templateParagraph.length > 0 &&
    llmsTemplate.indexOf(templateParagraph) !== -1 &&
    llmsTemplate.indexOf("## Public pages") !== -1 &&
    llmsTemplate.indexOf(templateParagraph) < llmsTemplate.indexOf("## Public pages"),
  "the description paragraph appears before the '## Public pages' heading in the llmsTxt template"
)

console.log("C. both sources carry one identical summary paragraph")
ok(
  fileParagraph === templateParagraph,
  "the description paragraph is byte-identical in public/llms.txt and the llmsTxt template"
)
ok(
  fileParagraph.includes(DISAMBIGUATION),
  "the public/llms.txt description keeps the disambiguation sentence verbatim"
)
ok(
  templateParagraph.includes(DISAMBIGUATION),
  "the llmsTxt template description keeps the disambiguation sentence verbatim"
)
ok(
  sentenceCountOf(fileParagraph) <= MAX_SENTENCES,
  `the description paragraph stays a summary of at most ${MAX_SENTENCES} sentences including the disambiguation sentence`
)

console.log("D. the description stays free of forbidden claim language")
ok(
  !FORBIDDEN_CLAIMS.test(fileParagraph),
  "the public/llms.txt description avoids ranking/guarantee/revenue/conversion/SEO-results claims"
)
ok(
  !FORBIDDEN_CLAIMS.test(templateParagraph),
  "the llmsTxt template description avoids ranking/guarantee/revenue/conversion/SEO-results claims"
)

console.log("E. npm test/ci wiring")
const pkg = JSON.parse(read("package.json"))
ok(
  pkg.scripts.test.includes("test-public-llms-offer-description.mjs"),
  "npm test runs the public llms offer description test"
)
ok(
  pkg.scripts.ci.includes("test-public-llms-offer-description.mjs"),
  "npm run ci runs the public llms offer description test"
)

console.log(`\n${checks} checks, ${failures} failures`)
process.exit(failures === 0 ? 0 : 1)
