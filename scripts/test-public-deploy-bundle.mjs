// Guard the tinystudio.in deploy bundle against drift in both directions:
//   - the snooze filter must remove every managed-service buyer-path marker
//     (PRs #10/#11, snoozed-by-Nish 2026-08-08) and leave nothing behind;
//   - every neutral merged public fix used as deploy proof (H2-after-H1 on
//     /promptly/support/ #18/#20, JSON-LD on /contact/ #19, homepage brand
//     disambiguation #29, top-level real 404 page #34) must survive the
//     filter untouched.
//
// The bundle is prepared in a temp directory; the worktree is never modified.
import { mkdtempSync, rmSync, existsSync } from "node:fs"
import { tmpdir } from "node:os"
import { join } from "node:path"
import { fileURLToPath } from "node:url"
import { dirname } from "node:path"
import { readFileSync } from "node:fs"

import {
  FORBIDDEN_MARKERS,
  NEUTRAL_PROOFS,
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

console.log("test-public-deploy-bundle: the publishable bundle is portfolio-only and keeps neutral fixes")

const sourceIndex = read("public/index.html")
const sourceContact = read("public/contact/index.html")
const sourceLlmsTxt = read("public/llms.txt")

console.log("A. the snooze filter still has work to do on main (markers present in source)")
const expectedSourceMarkers = [
  { label: "homepage hero-lead buyer-path sentence", html: sourceIndex, test: (h) => h.includes("There is also one") && h.includes("The Website") },
  { label: "homepage hero-rail Website Correction item", html: sourceIndex, test: (h) => h.includes('data-measure-source="homepage-hero"') },
  { label: "homepage managed-service section", html: sourceIndex, test: (h) => h.includes('id="managed-service"') },
  { label: "homepage JSON-LD Organization managed-service description", html: sourceIndex, test: (h) => h.includes("Tiny Studio also offers The Website Correction") && h.includes("fixed-scope founder pilot") },
  { label: "homepage JSON-LD WebSite managed-service description", html: sourceIndex, test: (h) => /Tiny Studio also offers The Website Correction, a human-reviewed managed service for founder-led Managed IT\/MSP\/cybersecurity companies with a live site\./.test(h) },
  { label: "llms.txt description managed-service sentence", html: sourceLlmsTxt, test: (h) => h.includes("Tiny Studio also offers The Website Correction") && h.includes("fixed-scope founder pilot") },
  { label: "contact description clause", html: sourceContact, test: (h) => h.includes(", and the Website Correction managed service.") },
  { label: "contact page-lead clause", html: sourceContact, test: (h) => h.includes("human-reviewed managed") },
  { label: "contact plain-list item", html: sourceContact, test: (h) => h.includes("<li>The Website Correction managed service</li>") },
  { label: "contact info-card section", html: sourceContact, test: (h) => h.includes("Apply for The Website Correction") },
  { label: "contact application section", html: sourceContact, test: (h) => h.includes('id="website-correction-application"') },
  { label: "contact what-to-send sentence", html: sourceContact, test: (h) => h.includes("For The Website Correction, share your site URL") },
]
for (const marker of expectedSourceMarkers) {
  ok(marker.test(marker.html), `source still carries ${marker.label}`)
}

console.log("B. the prepared bundle contains none of the snoozed markers")
let bundleDir = ""
try {
  bundleDir = mkdtempSync(join(tmpdir(), "tinystudio-bundle-test-"))
  await preparePublicDeployBundle({ sourceDir: join(ROOT, "public"), outputDir: bundleDir })
  ok(true, "bundle prepared in a temp directory")
} catch (error) {
  ok(false, `bundle preparation failed: ${error.message}`)
}

const bundleFiles = ["index.html", "contact/index.html", "llms.txt"]
for (const rel of bundleFiles) {
  const html = readFileSync(join(bundleDir, rel), "utf8")
  for (const marker of FORBIDDEN_MARKERS) {
    ok(!marker.test(html), `${rel} has no ${marker.label}`)
  }
}

console.log("C. the bundle keeps every neutral merged fix used as deploy proof")
for (const proof of NEUTRAL_PROOFS) {
  const html = readFileSync(join(bundleDir, proof.file), "utf8")
  ok(proof.test(html), `${proof.label}`)
}

console.log("D. the bundle is a full copy of public/ (all deployable files present)")
const requiredFiles = [
  "index.html",
  "404.html",
  "styles.css",
  "favicon.svg",
  "apple-touch-icon.svg",
  "robots.txt",
  "sitemap.xml",
  "llms.txt",
  "_headers",
  "contact/index.html",
  "support/index.html",
  "privacy/index.html",
  "privacy-choices/index.html",
  "terms/index.html",
  "promptly/index.html",
  "promptly/support/index.html",
  "promptly/privacy/index.html",
  "drishti/index.html",
  "drishti/support/index.html",
  "drishti/privacy/index.html",
  "social/tiny-studio-social.png",
  "social/promptly-social.png",
  "social/drishti-social.png",
  "deploy-manifest.json",
]
for (const rel of requiredFiles) {
  ok(existsSync(join(bundleDir, rel)), `${rel} exists in the bundle`)
}

console.log("E. the filtered homepage is still a coherent page")
const filteredIndex = readFileSync(join(bundleDir, "index.html"), "utf8")
ok(filteredIndex.includes("<html"), "homepage is still an html document")
ok(filteredIndex.includes("</html>"), "homepage still closes html")
ok(filteredIndex.includes('class="hero-rail"'), "hero rail remains")
ok((filteredIndex.match(/<article class="rail-item">/g) || []).length === 3, "hero rail keeps exactly the three portfolio items")
ok(filteredIndex.includes('id="products"'), "products section remains")
ok(filteredIndex.includes('id="teams"'), "teams section remains")
ok(filteredIndex.includes('<section class="shape" id="managed-service"') === false, "managed-service section is gone")

console.log("F. the filtered contact page is still a coherent page")
const filteredContact = readFileSync(join(bundleDir, "contact/index.html"), "utf8")
ok(filteredContact.includes("<html") && filteredContact.includes("</html>"), "contact is still a complete html document")
ok(filteredContact.includes("Primary inbox"), "neutral support card remains")
ok(filteredContact.includes("App-specific public pages"), "neutral apps card remains")
ok(filteredContact.includes("mailto:support&#64;tinystudio.in"), "studio inbox mailto remains (entity-encoded, obfuscation-proof)")
ok(!filteredContact.includes("<script>"), "the measurement-marker script is gone with the application section")

console.log("F2. the filtered llms.txt is still a coherent portfolio-only file")
const filteredLlmsTxt = readFileSync(join(bundleDir, "llms.txt"), "utf8")
ok(filteredLlmsTxt.startsWith("# Tiny Studio"), "llms.txt keeps its title")
ok(filteredLlmsTxt.includes("independent product company at tinystudio.in"), "llms.txt keeps the independent-company identity")
ok(
  filteredLlmsTxt.includes("It is not affiliated with other apps or studios that use the name Tiny Studio"),
  "llms.txt keeps the verbatim non-affiliation sentence"
)
ok(
  !filteredLlmsTxt.includes("The Website Correction") && !/managed\s+service/i.test(filteredLlmsTxt),
  "llms.txt carries no snoozed buyer-path sentence"
)

console.log("G. npm test/ci wiring")
const pkg = JSON.parse(read("package.json"))
ok(pkg.scripts.test.includes("test-public-deploy-bundle.mjs"), "npm test runs the deploy-bundle test")
ok(pkg.scripts.ci.includes("test-public-deploy-bundle.mjs"), "npm run ci runs the deploy-bundle test")
ok(pkg.scripts["site:publish"], "site:publish npm script exists")

console.log("H. no plaintext email is served that Cloudflare Email Address Obfuscation can rewrite")
// The tinystudio.in zone rewrites literal user@host emails in served HTML into
// __cf_email__ spans that render as the "[email protected]" placeholder when
// the decode script does not run. The email must therefore stay entity-encoded
// (support&#64;tinystudio.in) in every served file; browsers decode the entity
// in text and hrefs, Cloudflare's obfuscation regex has no literal @ to match.
const PUBLIC_HTML = [
  "index.html",
  "404.html",
  "support/index.html",
  "contact/index.html",
  "privacy/index.html",
  "privacy-choices/index.html",
  "terms/index.html",
  "promptly/index.html",
  "promptly/support/index.html",
  "promptly/privacy/index.html",
  "drishti/index.html",
  "drishti/support/index.html",
  "drishti/privacy/index.html",
]
const scriptAwareParts = (html) => html.split(/<script\b[^>]*>[\s\S]*?<\/script>/)
const htmlContent = (html) => scriptAwareParts(html).join("\n")
for (const rel of PUBLIC_HTML) {
  const served = htmlContent(read(`public/${rel}`))
  ok(!served.includes("support@tinystudio.in"), `${rel} has no plaintext email outside script blocks`)
  ok(served.includes("support&#64;tinystudio.in"), `${rel} serves the email entity-encoded`)
}

rmSync(bundleDir, { recursive: true, force: true })

console.log(`\n${checks} checks, ${failures} failures`)
process.exit(failures === 0 ? 0 : 1)
