// Guard the tinystudio.in deploy bundle against drift:
//   - every neutral merged public fix used as deploy proof (H2-after-H1 on
//     /promptly/support/ #18/#20, JSON-LD on /contact/ #19, homepage brand
//     disambiguation #29, top-level real 404 page #34) must survive untouched;
//   - the Website Correction offer surface (homepage repositioning + the
//     /website-correction/ offer page) must be PART of the bundle. The
//     2026-08-08 snooze was deliberately lifted by the offer-surface PR,
//     which is PR-only and never merges without human review.
//
// The bundle is prepared in a temp directory; the worktree is never modified.
import { mkdtempSync, rmSync, existsSync } from "node:fs"
import { tmpdir } from "node:os"
import { join } from "node:path"
import { fileURLToPath } from "node:url"
import { dirname } from "node:path"
import { readFileSync } from "node:fs"

import {
  OFFER_PROOFS,
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

console.log("test-public-deploy-bundle: the publishable bundle includes the Website Correction offer surface")

const sourceIndex = read("public/index.html")
const sourceContact = read("public/contact/index.html")

console.log("A. the source carries the offer surface the bundle must include")
const sourceOfferMarkers = [
  { label: "homepage leads with The Website Correction", html: sourceIndex, test: (h) => h.includes("<h1>The Website Correction.") },
  { label: "homepage hero Website Correction CTA", html: sourceIndex, test: (h) => h.includes('data-measure-source="homepage-hero"') },
  { label: "homepage managed-service section", html: sourceIndex, test: (h) => h.includes('id="managed-service"') },
  { label: "homepage links to the offer page", html: sourceIndex, test: (h) => h.includes("/website-correction/") },
  { label: "contact application section", html: sourceContact, test: (h) => h.includes('id="website-correction-application"') },
]
for (const marker of sourceOfferMarkers) {
  ok(marker.test(marker.html), `source still carries ${marker.label}`)
}

console.log("B. the prepared bundle keeps the offer surface")
let bundleDir = ""
try {
  bundleDir = mkdtempSync(join(tmpdir(), "tinystudio-bundle-test-"))
  await preparePublicDeployBundle({ sourceDir: join(ROOT, "public"), outputDir: bundleDir })
  ok(true, "bundle prepared in a temp directory")
} catch (error) {
  ok(false, `bundle preparation failed: ${error.message}`)
}

const offerFiles = ["index.html", "website-correction/index.html"]
for (const rel of offerFiles) {
  const html = readFileSync(join(bundleDir, rel), "utf8")
  for (const proof of OFFER_PROOFS.filter((p) => p.file === rel)) {
    ok(proof.test(html), `${rel} keeps ${proof.label}`)
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
  "website-correction/index.html",
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

console.log("E. the bundled homepage leads with the offer and is a coherent page")
const bundleIndex = readFileSync(join(bundleDir, "index.html"), "utf8")
ok(bundleIndex.includes("<html"), "homepage is still an html document")
ok(bundleIndex.includes("</html>"), "homepage still closes html")
ok(bundleIndex.includes('class="hero-rail"'), "hero rail remains")
ok(bundleIndex.includes('id="products"'), "products section remains")
ok(bundleIndex.includes('id="teams"'), "teams section remains")
ok(bundleIndex.includes('id="managed-service"'), "managed-service section remains")
ok(bundleIndex.includes("<h1>The Website Correction."), "homepage H1 leads with the offer")

console.log("F. the bundled offer page is a complete page")
const bundleOffer = readFileSync(join(bundleDir, "website-correction/index.html"), "utf8")
ok(bundleOffer.includes("<html") && bundleOffer.includes("</html>"), "offer page is a complete html document")
ok(bundleOffer.includes("The Website Correction"), "offer page names the offer")
ok(bundleOffer.includes("mailto:support&#64;tinystudio.in"), "offer page keeps the studio inbox mailto (entity-encoded)")

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
  "website-correction/index.html",
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
