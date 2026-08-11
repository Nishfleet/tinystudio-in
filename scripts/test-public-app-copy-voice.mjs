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

// The four public app pages (Promptly and Drishti product + privacy pages).
// PR #28 cleaned the product and support pages and this change cleans the
// residual product-page eyebrows and the app privacy pages; kept as an
// explicit list so a new app page with the old editorial voice fails CI
// instead of being silently missed.
const APP_PAGES = [
  "public/drishti/index.html",
  "public/drishti/privacy/index.html",
  "public/promptly/index.html",
  "public/promptly/privacy/index.html"
]

// The old copy spoke to Tiny Studio's own team or Apple's reviewer instead of
// visitors: H1s on the launch calendar ("already in place before launch",
// "already public ahead of release"), leads about the "current planned launch
// scope" and "final App Store privacy disclosures", a "Current release scope"
// aside ("not publicly released yet"), "At launch" cards, editor-facing
// "Where to go next" eyebrows, and notes that the page and App Store privacy
// answers should be updated before the next submission. Any of these
// fragments anywhere on an app page means the visitor-facing rewrite has
// regressed.
const EDITORIAL_FRAGMENTS = [
  "Where to go next",
  "already",
  "launch",
  "planned",
  "not publicly released",
  "App Store",
  "submission",
  "in the meantime",
  "current build",
  "should stay aligned",
  "should be updated before",
  "before that version is submitted",
  "Current release scope"
]

// The replacement copy names the actual app and keeps the public support
// route. Each page must keep both so an over-aggressive rewrite that deletes
// product identity or the support path fails CI.
const PAGE_REQUIREMENTS = {
  "public/drishti/index.html": ["Drishti", "support@tinystudio.in"],
  "public/drishti/privacy/index.html": ["Drishti", "support@tinystudio.in"],
  "public/promptly/index.html": ["Promptly", "support@tinystudio.in"],
  "public/promptly/privacy/index.html": ["Promptly", "support@tinystudio.in"]
}

console.log("test-public-app-copy-voice: the four public app pages carry only visitor-facing copy")

console.log("A. every app page keeps visitor-facing product and support copy")
for (const page of APP_PAGES) {
  const html = read(page)
  for (const fragment of PAGE_REQUIREMENTS[page]) {
    ok(html.includes(fragment), `${page} names ${fragment}`)
  }
}

console.log("B. no app page carries editorial or submission-prep phrasing")
for (const page of APP_PAGES) {
  const html = read(page)
  for (const fragment of EDITORIAL_FRAGMENTS) {
    ok(!html.includes(fragment), `${page} avoids "${fragment}"`)
  }
}

console.log("C. npm test/ci wiring")
const pkg = JSON.parse(read("package.json"))
ok(
  pkg.scripts.test.includes("test-public-app-copy-voice.mjs"),
  "npm test runs the public app copy voice test"
)
ok(
  pkg.scripts.ci.includes("test-public-app-copy-voice.mjs"),
  "npm run ci runs the public app copy voice test"
)

console.log(`\n${checks} checks, ${failures} failures`)
process.exit(failures === 0 ? 0 : 1)
