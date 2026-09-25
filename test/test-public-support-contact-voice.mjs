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

// The two studio-level trust pages that PR #31 (after #28) cleaned of
// App Store Connect submission voice. Kept as an explicit list so adding a
// new page with the old submission-prep copy fails CI instead of being
// silently missed.
const VOICE_PAGES = [
  "public/support/index.html",
  "public/contact/index.html"
]

// The old copy described the internal submission process as visible text:
// App Store Connect URLs, App Store submission readiness, app store
// reviewers, and launch-page staging rules. Any of these fragments on the
// studio support or contact pages means the visitor-facing rewrite has
// regressed. Matched case-insensitively over the whole page so a fragment
// hidden in meta tags or JSON-LD also fails.
const SUBMISSION_VOICE_FRAGMENTS = [
  "app store connect",
  "appstoreconnect",
  "app store",
  "app stores",
  "submission",
  "submitted",
  "submitting",
  "reviewer",
  "launch page",
  "launch pages",
  "before launch",
  "staging",
  "getting ready"
]

// The replacement copy speaks to visitors: one shared inbox, app-specific
// support pages, and routes that stay easy to find.
const VISITOR_FACING_FRAGMENTS = {
  "public/support/index.html": ["shared inbox", "Promptly", "Drishti", "support&#64;tinystudio.in"],
  "public/contact/index.html": ["in one place", "Promptly", "Drishti", "support&#64;tinystudio.in"]
}

console.log("test-public-support-contact-voice: studio support/contact pages avoid App Store Connect submission voice")

console.log("A. each voice-checked page exists and has the expected body")
for (const page of VOICE_PAGES) {
  const html = read(page)
  ok(html.length > 0, `${page} exists and is not empty`)
  ok(html.includes("<html"), `${page} is an HTML document`)
  ok(html.includes("<footer"), `${page} carries the shared footer`)
}

console.log("B. no App Store Connect submission voice on the studio support or contact pages")
for (const page of VOICE_PAGES) {
  const html = read(page).toLowerCase()
  for (const fragment of SUBMISSION_VOICE_FRAGMENTS) {
    ok(!html.includes(fragment), `${page} avoids "${fragment}"`)
  }
}

console.log("C. the visitor-facing replacement copy is present on each page")
for (const page of VOICE_PAGES) {
  const html = read(page)
  for (const fragment of VISITOR_FACING_FRAGMENTS[page]) {
    ok(html.includes(fragment), `${page} keeps "${fragment}"`)
  }
}

console.log("D. npm test/ci wiring")
const pkg = JSON.parse(read("package.json"))
ok(
  pkg.scripts.test.includes("test-public-support-contact-voice.mjs"),
  "npm test runs the public support/contact voice test"
)
ok(
  pkg.scripts.ci.includes("test-public-support-contact-voice.mjs"),
  "npm run ci runs the public support/contact voice test"
)

console.log(`\n${checks} checks, ${failures} failures`)
process.exit(failures === 0 ? 0 : 1)
