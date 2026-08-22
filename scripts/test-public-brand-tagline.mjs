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

// The header brand span (the studio logo + tagline shared across every page).
// Extract only the tagline inside `.brand-copy` so footer paragraphs and body
// copy cannot mask a regression in the header.
const brandTagline = (html) => {
  const match = html.match(
    /<span class="brand-copy">[\s\S]*?<span>([\s\S]*?)<\/span>[\s\S]*?<\/span>/
  )
  return match ? match[1].replace(/\s+/g, " ").trim() : null
}

const STUDIO_TAGLINE = "Products for people and teams"
const APP_TAGLINE = "Independent iPhone apps"

// The 6 studio-level pages brand the whole studio and must match the
// homepage's current positioning (products for people and one sharper
// software system for teams), not the apps-only tagline.
const STUDIO_PAGES = [
  "public/support/index.html",
  "public/contact/index.html",
  "public/compare/index.html",
  "public/privacy/index.html",
  "public/privacy-choices/index.html",
  "public/terms/index.html",
  "public/404.html"
]

// The 6 app pages describe specific apps, where the apps-only tagline is
// accurate.
const APP_PAGES = [
  "public/promptly/index.html",
  "public/promptly/support/index.html",
  "public/promptly/privacy/index.html",
  "public/drishti/index.html",
  "public/drishti/support/index.html",
  "public/drishti/privacy/index.html"
]

console.log("test-public-brand-tagline: every public page's header brand span carries the right studio tagline")

console.log("A. the homepage brand span carries the studio tagline")
const home = read("public/index.html")
ok(brandTagline(home) === STUDIO_TAGLINE, "homepage brand span reads 'Products for people and teams'")

console.log("B. the 6 studio-level pages carry the studio tagline, not the apps-only one")
for (const file of STUDIO_PAGES) {
  const html = read(file)
  ok(brandTagline(html) === STUDIO_TAGLINE, `${file} brand span reads 'Products for people and teams'`)
  ok(!brandTagline(html).includes(APP_TAGLINE), `${file} brand span does not say 'Independent iPhone apps'`)
}

console.log("C. the 6 app pages keep the apps-only tagline")
for (const file of APP_PAGES) {
  const html = read(file)
  ok(brandTagline(html) === APP_TAGLINE, `${file} brand span reads 'Independent iPhone apps'`)
}

console.log("D. npm test/ci wiring")
const pkg = JSON.parse(read("package.json"))
ok(
  pkg.scripts.test.includes("test-public-brand-tagline.mjs"),
  "npm test runs the public brand tagline test"
)
ok(
  pkg.scripts.ci.includes("test-public-brand-tagline.mjs"),
  "npm run ci runs the public brand tagline test"
)

console.log(`\n${checks} checks, ${failures} failures`)
process.exit(failures === 0 ? 0 : 1)
