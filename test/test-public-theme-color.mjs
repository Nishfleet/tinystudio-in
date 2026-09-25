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

// Every public page (canonical list, mirrors test-public-link-targets.mjs).
const PUBLIC_PAGES = [
  "public/index.html",
  "public/404.html",
  "public/contact/index.html",
  "public/compare/index.html",
  "public/promptly/index.html",
  "public/promptly/support/index.html",
  "public/promptly/privacy/index.html",
  "public/drishti/index.html",
  "public/drishti/support/index.html",
  "public/drishti/privacy/index.html",
  "public/support/index.html",
  "public/privacy/index.html",
  "public/privacy-choices/index.html",
  "public/terms/index.html"
]

// The one theme-color pair shared by every public page. A light value that
// matches the warm paper background (#f3efe7) and a dark value (#111824) so
// mobile browser chrome stops glaring in dark mode. The homepage once carried
// a single unqualified #f6f1e7 (no dark variant), so in dark mode its chrome
// stayed light while every other page went dark - a visible flash when
// navigating. This guard keeps the whole site on one pair.
const LIGHT = "#f3efe7"
const DARK = "#111824"

const themeColors = (html) =>
  [...html.matchAll(/<meta\s+name="theme-color"\s+content="([^"]+)"(?:\s+media="([^"]*)")?\s*>/g)]
    .map((m) => ({ value: m[1], media: m[2] ?? "" }))

console.log("test-public-theme-color: every public page shares the same light/dark theme-color pair")

console.log("A. every public page declares the light pair with prefers-color-scheme: light")
for (const page of PUBLIC_PAGES) {
  const html = read(page)
  const light = themeColors(html).find((t) => t.media === "(prefers-color-scheme: light)")
  ok(light !== undefined, `${page} has a light theme-color meta`)
  if (light !== undefined) {
    ok(light.value === LIGHT, `${page} light theme-color is ${LIGHT}`)
  }
}

console.log("B. every public page declares the dark pair with prefers-color-scheme: dark")
for (const page of PUBLIC_PAGES) {
  const html = read(page)
  const dark = themeColors(html).find((t) => t.media === "(prefers-color-scheme: dark)")
  ok(dark !== undefined, `${page} has a dark theme-color meta`)
  if (dark !== undefined) {
    ok(dark.value === DARK, `${page} dark theme-color is ${DARK}`)
  }
}

console.log("C. no page carries an unqualified or duplicated theme-color meta")
for (const page of PUBLIC_PAGES) {
  const html = read(page)
  const all = themeColors(html)
  ok(all.length === 2, `${page} has exactly two theme-color metas (got ${all.length})`)
  ok(
    all.every((t) => t.media !== ""),
    `${page} has no unqualified theme-color meta`
  )
}

console.log("D. npm test/ci wiring")
const pkg = JSON.parse(read("package.json"))
ok(
  pkg.scripts.test.includes("test-public-theme-color.mjs"),
  "npm test runs the public theme-color test"
)
ok(
  pkg.scripts.ci.includes("test-public-theme-color.mjs"),
  "npm run ci runs the public theme-color test"
)

console.log(`\n${checks} checks, ${failures} failures`)
process.exit(failures === 0 ? 0 : 1)
