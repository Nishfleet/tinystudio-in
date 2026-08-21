import { readFileSync } from "node:fs"
import { fileURLToPath } from "node:url"
import { dirname, join } from "node:path"
import assert from "node:assert/strict"

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..")
const read = (p) => readFileSync(join(ROOT, p), "utf8")

let failures = 0
let checks = 0
const ok = (fn, msg) => {
  checks++
  try {
    fn()
    console.log(`  ok ${msg}`)
  } catch {
    failures++
    console.error(`  FAIL ${msg}`)
  }
}

const descriptionParagraph = (text) => {
  const intro = text.split("## Public pages")[0]
  const blocks = intro
    .split(/\n{2,}/)
    .map((block) => block.trim())
    .filter((block) => block.length > 0 && !block.startsWith("#"))
  assert.ok(blocks.length > 0, "intro has a description paragraph")
  return blocks[0]
}

const bundleSource = read("scripts/prepare-static-site-bundle.mjs")
const templateMatch = bundleSource.match(/const llmsTxt = `([\s\S]*?)`/)
assert.ok(templateMatch, "bundle script contains the llmsTxt template literal")

const llmsPara = descriptionParagraph(read("public/llms.txt"))
const templatePara = descriptionParagraph(templateMatch[1])
const DISAMBIGUATION =
  "It is not affiliated with any other app or studio that uses the name Tiny Studio."

console.log("test-public-llms-offer-description: llms.txt description names The Website Correction offer")

console.log("A. public/llms.txt first paragraph names the managed service")
ok(() => assert.match(llmsPara, /Website Correction/), "public/llms.txt description paragraph contains Website Correction")

console.log("B. the llms.txt generator template names the managed service")
ok(() => assert.match(templatePara, /Website Correction/), "llmsTxt template description paragraph contains Website Correction")

console.log("C. both copies stay byte-identical")
ok(() => assert.equal(templatePara, llmsPara), "description paragraph is byte-identical in llms.txt and the generator template")

console.log("D. the disambiguation sentence survives in both")
ok(() => assert.ok(llmsPara.includes(DISAMBIGUATION)), "public/llms.txt keeps the disambiguation sentence verbatim")
ok(() => assert.ok(templatePara.includes(DISAMBIGUATION)), "llmsTxt template keeps the disambiguation sentence verbatim")

console.log("E. npm test/ci wiring")
const pkg = JSON.parse(read("package.json"))
ok(
  () => assert.match(pkg.scripts.test, /test-public-brand-tagline\.mjs && node scripts\/test-public-llms-offer-description\.mjs &&/),
  "npm test runs the offer-description test right after the brand tagline test"
)
ok(
  () => assert.match(pkg.scripts.ci, /test-public-brand-tagline\.mjs && node scripts\/test-public-llms-offer-description\.mjs &&/),
  "npm run ci runs the offer-description test right after the brand tagline test"
)

console.log(`\n${checks} checks, ${failures} failures`)
process.exit(failures === 0 ? 0 : 1)
