import { createServer } from "node:http"
import { readFile, readFileSync } from "node:fs"
import { createRequire } from "node:module"
import { dirname, extname, join } from "node:path"
import { fileURLToPath } from "node:url"

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

// The exact public pages covered by the heading-hierarchy finding.
const AFFECTED_PAGES = [
  "public/contact/index.html",
  "public/promptly/index.html",
  "public/promptly/privacy/index.html",
  "public/drishti/index.html",
  "public/drishti/support/index.html",
  "public/privacy-choices/index.html",
  "public/terms/index.html",
  "public/privacy/index.html",
  "public/drishti/privacy/index.html"
]

// Heading levels in document order, e.g. [1, 2, 2, 2, 2, 3, 3, 3].
const headingLevelsOf = (html) =>
  [...html.matchAll(/<h([1-6])\b[^>]*>/gi)].map((m) => Number(m[1]))

// Count <h2> used as .info-card card titles (inside <article class="info-card">).
const infoCardTitleCount = (html) =>
  (html.match(/<article class="info-card[^"]*"[^>]*>[\s\S]*?<h2\b/gi) || []).length

// The CSS rule that keeps card headings at the former h3 card-title scale
// regardless of h2 semantics, and lifts the global h2 12ch cap inside cards.
const CARD_HEADING_RULE = ".info-card :is(h2, h3) {"
const CARD_RULE_DECLARATIONS = [
  "margin-top: 12px",                              // former .info-card h3 margin
  "font-size: clamp(1.65rem, 2vw, 2.35rem)",       // former h3 card-title scale
  "max-width: none"                                // no 12ch cap inside cards
]

console.log("test-public-heading-hierarchy: card headings are semantic H2s with the former card scale")

for (const page of AFFECTED_PAGES) {
  const html = read(page)
  const levels = headingLevelsOf(html)
  console.log(`A. ${page}`)
  ok(levels.length > 0, "page contains at least one heading")
  ok(levels.filter((l) => l === 1).length === 1, "page has exactly one H1")
  ok(levels[0] === 1, "the H1 is the first heading in the outline")
  ok(infoCardTitleCount(html) === 3, "the three card headings are H2s inside .info-card articles")
  // Outline: H1 -> three H2 cards -> footer headings (footer H2 then H3s).
  const cardH2s = levels.filter((l) => l === 2).length
  ok(cardH2s >= 4, "card H2s plus the footer H2 keep a flat H2 band before the footer H3s")
  let jumps = 0
  for (let i = 1; i < levels.length; i++) {
    if (levels[i] - levels[i - 1] > 1) {
      jumps++
      console.error(`    bad transition H${levels[i - 1]} -> H${levels[i]}`)
    }
  }
  ok(jumps === 0, "no heading-level jump greater than one (no H1 -> H3 skip)")
}

console.log("B. card-heading CSS pairing")
const css = read("public/styles.css")
const ruleStart = css.indexOf(CARD_HEADING_RULE)
ok(ruleStart !== -1, `styles.css defines ${CARD_HEADING_RULE}`)
const ruleEnd = css.indexOf("}", ruleStart)
const ruleBody = ruleStart === -1 ? "" : css.slice(ruleStart, ruleEnd)
for (const decl of CARD_RULE_DECLARATIONS) {
  ok(ruleBody.includes(decl), `card rule keeps ${decl}`)
}
const globalH2 = css.match(/h2\s*{[^}]*}/)?.[0] ?? ""
ok(globalH2.includes("max-width: 12ch"), "global h2 styling (12ch cap) is untouched")
ok(
  !/\.info-card\s+h3\s*{/.test(css),
  "the old .info-card h3-only rule is replaced by the shared :is(h2, h3) rule"
)

console.log("C. npm test/ci wiring")
const pkg = JSON.parse(read("package.json"))
ok(
  pkg.scripts.test.includes("test-public-heading-hierarchy.mjs"),
  "npm test runs the public heading hierarchy test"
)
ok(
  pkg.scripts.ci.includes("test-public-heading-hierarchy.mjs"),
  "npm run ci runs the public heading hierarchy test"
)

const PROMPTLY_H1 = "Promptly keeps solo professionals booked, prepared, and harder to ghost."
const h1Rule = css.match(/(?:^|\n)h1\s*{[^}]*}/)?.[0] ?? ""
const htmlRule = css.match(/(?:^|\n)html\s*{[^}]*}/)?.[0] ?? ""
const bodyRule = css.match(/(?:^|\n)body\s*{[^}]*}/)?.[0] ?? ""

console.log("D. Promptly 320px heading wrap (source)")
const promptlyHtml = read("public/promptly/index.html")
const promptlyH1 = (promptlyHtml.match(/<h1>([\s\S]*?)<\/h1>/)?.[1] ?? "").replace(/\s+/g, " ").trim()
ok(promptlyH1 === PROMPTLY_H1, "Promptly H1 copy is unchanged")
ok(
  /overflow-wrap:\s*(anywhere|break-word)/.test(h1Rule),
  "shared h1 rule wraps long unbreakable words inside its box"
)
ok(
  !/overflow-x:\s*hidden/.test(htmlRule) &&
    !/overflow-x:\s*hidden/.test(bodyRule) &&
    !/overflow-x:\s*hidden/.test(h1Rule),
  "does not mask overflow with html/body/h1 overflow-x: hidden"
)

const MIME = {
  ".html": "text/html; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".svg": "image/svg+xml",
  ".png": "image/png",
  ".ico": "image/x-icon",
  ".txt": "text/plain; charset=utf-8",
  ".xml": "application/xml; charset=utf-8"
}

const loadChromium = () => {
  const require = createRequire(import.meta.url)
  const candidates = [
    "playwright",
    join(ROOT, "../0509/node_modules/playwright"),
    "/home/nish/workspaces/products/0509/node_modules/playwright"
  ]
  for (const candidate of candidates) {
    try {
      return require(candidate).chromium
    } catch {
      // try the next resolver
    }
  }
  return null
}

const startPublicServer = () =>
  new Promise((resolve, reject) => {
    const publicRoot = join(ROOT, "public")
    const server = createServer((req, res) => {
      const urlPath = decodeURIComponent((req.url || "/").split("?")[0])
      const relative = urlPath.endsWith("/") ? `${urlPath}index.html` : urlPath
      const file = join(publicRoot, relative)
      if (file !== publicRoot && !file.startsWith(`${publicRoot}/`)) {
        res.writeHead(403)
        res.end("forbidden")
        return
      }
      readFile(file, (err, body) => {
        if (err) {
          res.writeHead(404)
          res.end("not found")
          return
        }
        res.writeHead(200, { "content-type": MIME[extname(file)] || "application/octet-stream" })
        res.end(body)
      })
    })
    server.on("error", reject)
    server.listen(0, "127.0.0.1", () => resolve(server))
  })

const measurePage = async (chromium, origin, path, width) => {
  const page = await chromium.newPage({ viewport: { width, height: 844 }, isMobile: true })
  try {
    const response = await page.goto(`${origin}${path}`, { waitUntil: "domcontentloaded" })
    const metrics = await page.evaluate(() => {
      const heading = document.querySelector("h1")
      return {
        heading: heading ? heading.innerText.replace(/\s+/g, " ").trim() : "",
        scrollWidth: document.documentElement.scrollWidth,
        clientWidth: document.documentElement.clientWidth,
        headingScrollWidth: heading ? heading.scrollWidth : 0,
        headingClientWidth: heading ? heading.clientWidth : 0,
        overflowWrap: heading ? getComputedStyle(heading).overflowWrap : "",
        overflowX: getComputedStyle(document.documentElement).overflowX
      }
    })
    return { status: response?.status() ?? 0, ...metrics }
  } finally {
    await page.close()
  }
}

console.log("E. Promptly 320px heading wrap (layout)")
const chromiumLauncher = loadChromium()
if (!chromiumLauncher) {
  console.log("  skip layout probe: playwright is not installed in this checkout")
} else {
  const server = await startPublicServer()
  const origin = `http://127.0.0.1:${server.address().port}`
  const browser = await chromiumLauncher.launch({ headless: true })
  try {
    const promptly320 = await measurePage(browser, origin, "/promptly/", 320)
    const promptly390 = await measurePage(browser, origin, "/promptly/", 390)
    ok(promptly320.status === 200, `/promptly/ at 320 returns 200 (got ${promptly320.status})`)
    ok(promptly390.status === 200, `/promptly/ at 390 returns 200 (got ${promptly390.status})`)
    ok(promptly320.heading === PROMPTLY_H1, "rendered Promptly H1 copy is unchanged at 320")
    ok(promptly390.heading === PROMPTLY_H1, "rendered Promptly H1 copy is unchanged at 390")
    ok(
      promptly320.scrollWidth <= promptly320.clientWidth,
      `Promptly document does not overflow at 320 (${promptly320.scrollWidth} <= ${promptly320.clientWidth})`
    )
    ok(
      promptly390.scrollWidth <= promptly390.clientWidth,
      `Promptly document does not overflow at 390 (${promptly390.scrollWidth} <= ${promptly390.clientWidth})`
    )
    ok(
      promptly320.headingScrollWidth <= promptly320.headingClientWidth,
      `Promptly heading wraps inside its box at 320 (${promptly320.headingScrollWidth} <= ${promptly320.headingClientWidth})`
    )
    ok(
      promptly390.headingScrollWidth <= promptly390.headingClientWidth,
      `Promptly heading wraps inside its box at 390 (${promptly390.headingScrollWidth} <= ${promptly390.headingClientWidth})`
    )
    ok(
      ["anywhere", "break-word"].includes(promptly320.overflowWrap),
      `Promptly heading overflow-wrap is a wrapping value at 320 (got ${promptly320.overflowWrap})`
    )
    ok(
      promptly320.overflowX !== "hidden" && promptly390.overflowX !== "hidden",
      "document overflow-x is not hidden"
    )

    for (const path of ["/", "/drishti/"]) {
      const sibling = await measurePage(browser, origin, path, 320)
      ok(sibling.status === 200, `${path} at 320 returns 200 (got ${sibling.status})`)
      ok(
        sibling.scrollWidth <= sibling.clientWidth,
        `${path} document stays inside 320 after the shared wrap (${sibling.scrollWidth} <= ${sibling.clientWidth})`
      )
      ok(
        sibling.headingScrollWidth <= sibling.headingClientWidth,
        `${path} heading stays inside its box at 320 (${sibling.headingScrollWidth} <= ${sibling.headingClientWidth})`
      )
    }
  } finally {
    await browser.close()
    await new Promise((resolve) => server.close(resolve))
  }
}

console.log(`\n${checks} checks, ${failures} failures`)
process.exit(failures === 0 ? 0 : 1)
