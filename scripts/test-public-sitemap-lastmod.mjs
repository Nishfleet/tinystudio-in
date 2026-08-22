import { readFileSync } from "node:fs"
import { fileURLToPath } from "node:url"
import { dirname, join } from "node:path"
import { execFileSync } from "node:child_process"

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..")
const ORIGIN = "https://tinystudio.in/"

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

const backingFileFor = (loc) => {
  const path = loc.slice("https://tinystudio.in".length)
  if (path === "/") return "public/index.html"
  return `public/${path.replace(/^\//, "")}index.html`
}

const sitemap = readFileSync(join(ROOT, "public/sitemap.xml"), "utf8")
const blockRe =
  /<url>\s*<loc>([^<]+)<\/loc>\s*<lastmod>(\d{4}-\d{2}-\d{2})<\/lastmod>\s*<\/url>/g

let checkedUrls = 0
let skipped = 0
let matched = 0

console.log("test-public-sitemap-lastmod: every sitemap lastmod matches the backing page's last change date on origin/main")

for (const match of sitemap.matchAll(blockRe)) {
  matched++
  const loc = match[1]
  const sitemapDate = match[2]

  if (!loc.startsWith(ORIGIN)) {
    ok(false, loc)
    checkedUrls++
    continue
  }

  const backingFile = backingFileFor(loc)
  let actualDate
  try {
    actualDate = execFileSync(
      "git",
      ["log", "-1", "--format=%cs", "--diff-filter=AM", "origin/main", "--", backingFile],
      { encoding: "utf8", cwd: ROOT }
    ).trim()
  } catch (err) {
    ok(false, `${loc} ${err.message}`)
    checkedUrls++
    continue
  }

  if (!actualDate) {
    console.log(`  skip ${loc} (no history yet)`)
    skipped++
    continue
  }

  checkedUrls++
  if (sitemapDate === actualDate) {
    ok(true, `${loc} lastmod=${sitemapDate}`)
  } else {
    ok(false, `${loc} sitemap=${sitemapDate} actual=${actualDate}`)
  }
}

if (matched === 0) {
  ok(false, "no <url> blocks matched in public/sitemap.xml")
}

console.log(`sitemap lastmod freshness: ${checkedUrls} checked, ${skipped} skipped, ${failures} failures`)
process.exit(failures === 0 ? 0 : 1)
