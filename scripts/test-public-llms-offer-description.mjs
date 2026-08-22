// Guard the llms.txt description paragraph against drift in both directions:
//   - the SOURCE paragraph must name The Website Correction managed service
//     (the item this packet closes) with the PRODUCT.md-grounded facts, and
//     must stay byte-identical to the homepage Organization JSON-LD
//     description so generative engines read one consistent entity summary;
//   - the DEPLOY bundle must still strip that sentence while the buyer path
//     remains snoozed (Nish 2026-08-08), leaving the portfolio-only
//     description live, exactly like the JSON-LD handling from PR #247.
import { mkdtempSync, rmSync } from "node:fs"
import { tmpdir } from "node:os"
import { join } from "node:path"
import { fileURLToPath } from "node:url"
import { dirname } from "node:path"
import { readFileSync } from "node:fs"

import {
  FORBIDDEN_MARKERS,
  LLMS_TXT_MANAGED_SERVICE,
  preparePublicDeployBundle,
} from "./prepare-public-deploy-bundle.mjs"

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

console.log("test-public-llms-offer-description: llms.txt names The Website Correction in source, stays portfolio-only in the deploy bundle")

const llmsTxt = read("public/llms.txt")
const template = read("scripts/prepare-static-site-bundle.mjs")
const homepage = read("public/index.html")

const paragraphOf = (content) => content.split("\n").find((l) => l.startsWith("Tiny Studio is the independent product company"))

console.log("A. the source llms.txt description names The Website Correction managed service")
const paragraph = paragraphOf(llmsTxt)
ok(Boolean(paragraph), "llms.txt has the description paragraph")
for (const [fact, needle] of [
  ["the offer name", "The Website Correction"],
  ["the human-reviewed managed-service framing", "human-reviewed managed service"],
  ["the PRODUCT.md buyer audience", "founder-led Managed IT/MSP/cybersecurity companies with a live site"],
  ["the fixed scope", "one focused correction pass on the single highest-leverage page"],
  ["the $1,000 founder pilot", "$1,000 fixed-scope founder pilot for the first three clients"],
]) {
  ok(paragraph.includes(needle), `paragraph states ${fact}`)
}
ok(
  llmsTxt.includes("It is not affiliated with other apps or studios that use the name Tiny Studio"),
  "the disambiguation sentence survives verbatim after the offer sentence"
)
ok((llmsTxt.split("\n").filter((l) => l.trim() !== "").length) >= 4, "llms.txt keeps title, paragraph, page list, boundaries sections")

console.log("B. the generator template stays in lockstep with public/llms.txt")
const templateParagraph = paragraphOf(template)
ok(templateParagraph === paragraph, "template paragraph is byte-identical to public/llms.txt paragraph")

console.log("C. GEO consistency: llms.txt matches the homepage Organization JSON-LD description")
const jsonldMatch = homepage.match(/"description": "(Tiny Studio is the independent product company[^"]*)"/)
ok(Boolean(jsonldMatch), "homepage carries an Organization-style description starting with the identity sentence")
ok(jsonldMatch && jsonldMatch[1] === paragraph, "llms.txt paragraph is byte-identical to the homepage JSON-LD description")

console.log("D. the deploy bundle strips the snoozed sentence from llms.txt")
let bundleDir = ""
try {
  bundleDir = mkdtempSync(join(tmpdir(), "tinystudio-llms-test-"))
  await preparePublicDeployBundle({ sourceDir: join(ROOT, "public"), outputDir: bundleDir })
  ok(true, "bundle prepared in a temp directory")
} catch (error) {
  ok(false, `bundle preparation failed: ${error.message}`)
}
if (bundleDir) {
  const bundledLlmsTxt = readFileSync(join(bundleDir, "llms.txt"), "utf8")
  const bundledParagraph = paragraphOf(bundledLlmsTxt)
  ok(!LLMS_TXT_MANAGED_SERVICE.test(llmsTxt) === false, "strip regex still matches the source paragraph (fail-closed pre-filter holds)")
  ok(
    bundledParagraph === paragraph.replace(LLMS_TXT_MANAGED_SERVICE, ""),
    "bundled paragraph is exactly the source paragraph minus the managed-service sentence"
  )
  ok(!bundledLlmsTxt.includes("The Website Correction"), "bundled llms.txt no longer names the offer")
  for (const marker of FORBIDDEN_MARKERS) {
    ok(!marker.test(bundledLlmsTxt), `bundled llms.txt has no ${marker.label}`)
  }
  ok(
    bundledLlmsTxt.includes("It is not affiliated with other apps or studios that use the name Tiny Studio"),
    "bundled llms.txt keeps the verbatim non-affiliation sentence"
  )
}

rmSync(bundleDir, { recursive: true, force: true })

console.log("E. npm test/ci wiring")
const pkg = JSON.parse(read("package.json"))
ok(pkg.scripts.test.includes("test-public-llms-offer-description.mjs"), "npm test runs the llms.txt offer-description test")
ok(pkg.scripts.ci.includes("test-public-llms-offer-description.mjs"), "npm run ci runs the llms.txt offer-description test")

console.log(`\n${checks} checks, ${failures} failures`)
process.exit(failures === 0 ? 0 : 1)
