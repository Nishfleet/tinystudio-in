#!/usr/bin/env node
// verify-tinystudio-in-drive.mjs — Playwright browser driver for the
// .claude/skills/verify-tinystudio-in/ harness. Opens a real browser
// against a running harness instance (LAUNCH step in SKILL.md),
// navigates to a route, dumps the rendered HTML, and saves a
// full-page screenshot. The harness is required to be running
// already; this script never starts a server.
//
// Usage:
//   node scripts/verify-tinystudio-in-drive.mjs [route] [--out <dir>]
//
// Default route: `/`. Default output dir: `/tmp/verify-tinystudio-in`.
// Falls back to a 200 + body-dump if Playwright is not installed in
// this checkout or in the 0509 reference install.

import { createRequire } from "node:module"
import { dirname, join } from "node:path"
import { fileURLToPath } from "node:url"
import { mkdir, writeFile } from "node:fs/promises"
import { readFileSync } from "node:fs"

const ROOT = dirname(fileURLToPath(new URL("..", import.meta.url)))
const ROUTE = process.argv[2] || "/"
const OUT_ARG = process.argv.indexOf("--out")
const OUT_DIR = OUT_ARG >= 0 ? process.argv[OUT_ARG + 1] : "/tmp/verify-tinystudio-in"

const PORT_FILE = join(OUT_DIR, "server.port")
let HARNESS_URL
try {
  HARNESS_URL = `http://127.0.0.1:${readFileSync(PORT_FILE, "utf8").trim()}`
} catch {
  console.error(`verify-tinystudio-in-drive: cannot read ${PORT_FILE}; run scripts/verify-tinystudio-in-serve.mjs first`)
  process.exit(2)
}

const loadChromium = () => {
  const require = createRequire(import.meta.url)
  const candidates = [
    "playwright",
    join(ROOT, "node_modules/playwright"),
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

const chromium = loadChromium()
if (!chromium) {
  console.error("verify-tinystudio-in-drive: playwright is not installed in this checkout or the 0509 reference install; falling back to a fetch + body dump")
  const target = `${HARNESS_URL}${ROUTE}`
  const response = await fetch(target)
  const body = await response.text()
  const status = response.status
  await mkdir(join(OUT_DIR, "html"), { recursive: true })
  const safeName = ROUTE === "/" ? "_root" : ROUTE.replace(/[^a-z0-9]+/gi, "_")
  const outFile = join(OUT_DIR, "html", `${safeName}.html`)
  await writeFile(outFile, body, "utf8")
  console.log(`verify-tinystudio-in-drive (fallback): ${target} -> ${status}, ${body.length} bytes -> ${outFile}`)
  process.exit(status >= 200 && status < 400 ? 0 : 1)
}

await mkdir(join(OUT_DIR, "html"), { recursive: true })
await mkdir(join(OUT_DIR, "screenshots"), { recursive: true })

const browser = await chromium.launch({ headless: true })
try {
  const context = await browser.newContext({ viewport: { width: 1280, height: 800 } })
  const page = await context.newPage()
  const target = `${HARNESS_URL}${ROUTE}`
  const response = await page.goto(target, { waitUntil: "domcontentloaded" })
  const status = response ? response.status() : 0
  const html = await page.content()
  const safeName = ROUTE === "/" ? "_root" : ROUTE.replace(/[^a-z0-9]+/gi, "_")
  const htmlPath = join(OUT_DIR, "html", `${safeName}.html`)
  const shotPath = join(OUT_DIR, "screenshots", `${safeName}.png`)
  await writeFile(htmlPath, html, "utf8")
  await page.screenshot({ path: shotPath, fullPage: true })
  const title = await page.title()
  const h1 = await page.evaluate(() => {
    const heading = document.querySelector("h1")
    return heading ? heading.innerText.replace(/\s+/g, " ").trim() : ""
  })
  console.log(`verify-tinystudio-in-drive: ${target} -> ${status}`)
  console.log(`  title: ${title}`)
  console.log(`  h1:    ${h1}`)
  console.log(`  html:  ${htmlPath}`)
  console.log(`  shot:  ${shotPath}`)
  process.exit(status >= 200 && status < 400 ? 0 : 1)
} finally {
  await browser.close()
}
