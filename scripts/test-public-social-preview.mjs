import { readFileSync, existsSync } from "node:fs"
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

// Every public page (canonical list, mirrors test-public-footer-targets.mjs).
const PUBLIC_PAGES = [
  "public/index.html",
  "public/contact/index.html",
  "public/website-correction/index.html",
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

// Which social image each page family must carry.
const expectedImage = (page) =>
  page.startsWith("public/promptly/")
    ? "promptly-social.png"
    : page.startsWith("public/drishti/")
      ? "drishti-social.png"
      : "tiny-studio-social.png"

const metaOf = (html, name) => {
  const match = html.match(new RegExp(`<meta\\s+(?:name|property)="${name}"\\s+content="([^"]*)"`))
  return match ? match[1] : null
}

const expectMeta = (page, html, name) => {
  const value = metaOf(html, name)
  ok(value !== null && value !== "", `${page} has <meta ${name}>`)
  return value
}

const imageUrl = (file) => `https://tinystudio.in/social/${file}`

console.log("test-public-social-preview: every public page declares a social preview image")

console.log("A. every public page declares the full og:image block")
for (const page of PUBLIC_PAGES) {
  const html = read(page)
  const image = expectMeta(page, html, "og:image")
  if (image !== null) {
    ok(image === imageUrl(expectedImage(page)), `${page} og:image points at ${expectedImage(page)}`)
    const secure = metaOf(html, "og:image:secure_url")
    ok(secure === image, `${page} og:image:secure_url matches og:image`)
    ok(metaOf(html, "og:image:type") === "image/png", `${page} og:image:type is image/png`)
    ok(metaOf(html, "og:image:width") === "1200", `${page} og:image:width is 1200`)
    ok(metaOf(html, "og:image:height") === "630", `${page} og:image:height is 630`)
    ok(
      (metaOf(html, "og:image:alt") ?? "") !== "",
      `${page} has non-empty og:image:alt`
    )
  }
}

console.log("B. every public page declares the matching twitter image card")
for (const page of PUBLIC_PAGES) {
  const html = read(page)
  ok(metaOf(html, "twitter:card") === "summary_large_image", `${page} twitter:card is summary_large_image`)
  const ogImage = metaOf(html, "og:image")
  const twitterImage = metaOf(html, "twitter:image")
  ok(twitterImage !== null && twitterImage !== "", `${page} has <meta twitter:image>`)
  if (ogImage !== null && twitterImage !== null) {
    ok(twitterImage === ogImage, `${page} twitter:image matches og:image`)
  }
  ok(
    (metaOf(html, "twitter:image:alt") ?? "") !== "",
    `${page} has non-empty twitter:image:alt`
  )
}

console.log("C. every referenced social image file ships in public/social/")
const referenced = new Set()
for (const page of PUBLIC_PAGES) {
  const html = read(page)
  for (const name of ["og:image", "og:image:secure_url", "twitter:image"]) {
    const value = metaOf(html, name)
    if (value && value.startsWith("https://tinystudio.in/social/")) {
      referenced.add(value.slice("https://tinystudio.in/social/".length))
    }
  }
}
for (const file of [...referenced].sort()) {
  ok(existsSync(join(ROOT, "public/social", file)), `public/social/${file} exists on disk`)
}

console.log("D. npm test/ci wiring")
const pkg = JSON.parse(read("package.json"))
ok(
  pkg.scripts.test.includes("test-public-social-preview.mjs"),
  "npm test runs the public social preview test"
)
ok(
  pkg.scripts.ci.includes("test-public-social-preview.mjs"),
  "npm run ci runs the public social preview test"
)

console.log(`\n${checks} checks, ${failures} failures`)
process.exit(failures === 0 ? 0 : 1)
