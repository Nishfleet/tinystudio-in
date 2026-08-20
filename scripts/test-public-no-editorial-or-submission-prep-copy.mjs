import { readFileSync, readdirSync, statSync } from "node:fs"
import { fileURLToPath } from "node:url"
import { dirname, join, relative } from "node:path"

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..")
const PUBLIC = join(ROOT, "public")

const read = (p) => readFileSync(p, "utf8")

const walk = (dir) => {
  const out = []
  for (const entry of readdirSync(dir)) {
    const full = join(dir, entry)
    const st = statSync(full)
    if (st.isDirectory()) out.push(...walk(full))
    else out.push(full)
  }
  return out
}

const htmlFiles = walk(PUBLIC)
  .filter((p) => p.endsWith(".html"))
  .map((p) => relative(ROOT, p))
  .sort()

if (htmlFiles.length === 0) {
  console.error("  FAIL no public/*.html pages were discovered")
  process.exit(1)
}

// Internal editorial and submission-prep voice that has leaked into the
// visible copy of public pages before — see item
// `[unreviewed-by-opus] Internal editorial and submission-prep notes are
// live as visible copy on four public app pages`. The two narrower
// existing tests (`test-public-app-copy-voice.mjs` and
// `test-public-support-contact-voice.mjs`) cover the highest-risk named
// pages; this one extends the same constraint to every other public HTML
// page so a future regression on the home, terms, privacy hub,
// privacy-choices, app support, or 404 page also fails CI instead of
// being silently missed.
const FORBIDDEN_FRAGMENTS = [
  "where to go next",
  "already in place before launch",
  "already public ahead of release",
  "planned launch scope",
  "planned launch configuration",
  "planned release scope",
  "current planned launch",
  "current release scope",
  "not publicly released yet",
  "not publicly released",
  "at launch",
  "before launch",
  "after launch",
  "post launch",
  "post-launch",
  "should be updated before",
  "before that version is submitted",
  "should stay aligned",
  "final app store privacy disclosures",
  "current build",
  "in the meantime",
  "releases are prepared",
  "a released app needs",
  "launch page",
  "launch pages",
  "getting ready",
  "app store metadata",
  "app store connect",
  "appstoreconnect",
  "submission",
  "submitted",
  "submitting",
  "reviewer",
  "staging"
]

const countOccurrences = (haystack, needle) => {
  if (!needle) return 0
  let count = 0
  let pos = 0
  while ((pos = haystack.indexOf(needle, pos)) !== -1) {
    count++
    pos += needle.length
  }
  return count
}

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

console.log(
  `test-public-no-editorial-or-submission-prep-copy: every public/*.html page (${htmlFiles.length} files) carries only visitor-facing copy`
)

console.log("A. every public HTML page is discovered")
ok(htmlFiles.length >= 12, `discovered ${htmlFiles.length} public HTML pages (>=12 expected)`)
const expectedPages = [
  "public/index.html",
  "public/404.html",
  "public/contact/index.html",
  "public/support/index.html",
  "public/privacy/index.html",
  "public/privacy-choices/index.html",
  "public/terms/index.html",
  "public/promptly/index.html",
  "public/promptly/privacy/index.html",
  "public/promptly/support/index.html",
  "public/drishti/index.html",
  "public/drishti/privacy/index.html",
  "public/drishti/support/index.html"
]
for (const page of expectedPages) {
  ok(htmlFiles.includes(page), `${page} is part of the public/ tree`)
}

console.log("B. no editorial or submission-prep phrasing on any public page")
for (const page of htmlFiles) {
  const html = read(join(ROOT, page))
  const lowered = html.toLowerCase()
  for (const fragment of FORBIDDEN_FRAGMENTS) {
    ok(
      countOccurrences(lowered, fragment) === 0,
      `${page} avoids "${fragment}" (case-insensitive, full page including meta and JSON-LD)`
    )
  }
}

console.log("C. npm test/ci wiring")
const pkg = JSON.parse(read("package.json"))
ok(
  pkg.scripts.test.includes("test-public-no-editorial-or-submission-prep-copy.mjs"),
  "npm test runs the public no-editorial/submission-prep copy test"
)
ok(
  pkg.scripts.ci.includes("test-public-no-editorial-or-submission-prep-copy.mjs"),
  "npm run ci runs the public no-editorial/submission-prep copy test"
)

console.log(`\n${checks} checks, ${failures} failures`)
process.exit(failures === 0 ? 0 : 1)
