// Prepare the deploy bundle for the tinystudio.in Cloudflare Pages project
// (tiny-studio-3f5).
//
// The bundle is a verbatim copy of public/ with ONE deliberate, documented
// change: the managed-service buyer path (PRs #10/#11 content) is removed
// because it remains snoozed-by-Nish (2026-08-08: "do not build, publish, or
// deploy the managed-service buyer path without his explicit yes"). Every
// other merged public fix must survive untouched.
//
// The filter is fail-closed in both directions:
//   - pre-filter: every snooze marker the filter knows must exist in the
//     source. If a marker is missing, the page changed or the snooze was
//     lifted, and the filter must be updated deliberately - never silently
//     skip.
//   - post-filter: the bundle must contain none of the forbidden markers and
//     must still carry the neutral merged fixes used as deploy proof
//     (H2-after-H1 on /promptly/support/ from #18/#20, JSON-LD on /contact/
//     from #19, homepage brand disambiguation from #29, and the PR #26
//     site-wide invariant that every public page keeps its JSON-LD block).
//     from #19, homepage brand disambiguation from #29, top-level real 404
//     page from #34).
//
// CLI: node scripts/prepare-public-deploy-bundle.mjs --source public --output <dir>
// Defaults: --source ./public, --output to a fresh temp directory (printed).
import { promises as fs } from "node:fs"
import { existsSync, readFileSync } from "node:fs"
import { tmpdir } from "node:os"
import { join, resolve } from "node:path"
import { fileURLToPath } from "node:url"
import { dirname } from "node:path"
import { spawnSync } from "node:child_process"

export const SNOOZE_FILTER_VERSION = 1

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..")

// Exact text and block markers that belong to the snoozed managed-service
// buyer path (PRs #10/#11). See docs/measurement/public-conversion-signal.md
// for the conversion-signal contract and the backlog item's accept criteria.
const HOMEPAGE_HERO_LEAD = /\s+There is also one\s+managed service for founders, reviewed by a human: The Website\s+Correction\./
const HERO_RAIL_MARKER = 'data-measure-source="homepage-hero"'
const MANAGED_SERVICE_SECTION_MARKER = '<section class="shape" id="managed-service"'
const CONTACT_DESCRIPTION_CLAUSE = ", and the Website Correction managed service."
const CONTACT_PAGE_LEAD = /\s*, its apps, and the studio's human-reviewed managed\s+service\./
const CONTACT_LIST_ITEM = "<li>The Website Correction managed service</li>"
const CONTACT_INFO_CARD_MARKER = '<section class="app-strip reveal delay-1">'
const CONTACT_INFO_CARD_CONTENT = "Apply for The Website Correction"
const CONTACT_APPLICATION_SECTION_MARKER = '<section class="app-strip reveal delay-1" id="website-correction-application"'
const CONTACT_SEND_SENTENCE = /\s*For The Website Correction, share your site URL and the page that matters most so a human can review fit and scope\./

// Everything that must be ABSENT from a publishable bundle.
export const FORBIDDEN_MARKERS = [
  { label: "The Website Correction", test: (html) => html.includes("Website Correction") },
  { label: "website-correction ids/hrefs", test: (html) => html.includes("website-correction") },
  { label: "data-measure-source", test: (html) => html.includes("data-measure-source") },
  { label: "managed service phrase", test: (html) => /managed\s+service/i.test(html) },
  // The entire managed-service homepage section (review finding 2026-08-11:
  // the snoozed buyer path must never appear on the live homepage).
  { label: "managed-service section id", test: (html) => html.includes('id="managed-service"') },
]

// Neutral merged fixes that must SURVIVE in the bundle (deploy proof).
export const NEUTRAL_PROOFS = [
  {
    label: "promptly/support H2 after H1 (PRs #18/#20)",
    file: "promptly/support/index.html",
    test: (html) => /<h1\b[^>]*>[\s\S]*?<\/h1>[\s\S]*?<h2\b/i.test(html),
  },
  {
    label: "contact JSON-LD (PR #19)",
    file: "contact/index.html",
    test: (html) => html.includes("application/ld+json"),
  },
  {
    label: "homepage brand disambiguation JSON-LD (PR #29)",
    file: "index.html",
    test: (html) => html.includes('"alternateName"'),
  },
  {
    label: "homepage portfolio title (unchanged)",
    file: "index.html",
    test: (html) => html.includes("<title>Tiny Studio | Promptly, Drishti, and 0509"),
  },
  {
    label: "homepage non-affiliation copy (PR #29)",
    file: "index.html",
    test: (html) => html.includes("not affiliated"),
  },
  // Site-wide structured data invariant (PR #26): the 07acd07 bundle shipped
  // JSON-LD on only 4 of 12 pages; the release lane must never do that again.
  // Each remaining public page keeps exactly one application/ld+json block.
  {
    label: "support page JSON-LD (07acd07 baseline)",
    file: "support/index.html",
    test: (html) => html.includes("application/ld+json"),
  },
  {
    label: "privacy hub JSON-LD (PR #26)",
    file: "privacy/index.html",
    test: (html) => html.includes("application/ld+json"),
  },
  {
    label: "terms page JSON-LD (PR #26)",
    file: "terms/index.html",
    test: (html) => html.includes("application/ld+json"),
  },
  {
    label: "privacy choices JSON-LD (PR #26)",
    file: "privacy-choices/index.html",
    test: (html) => html.includes("application/ld+json"),
  },
  {
    label: "Promptly home JSON-LD (07acd07 baseline)",
    file: "promptly/index.html",
    test: (html) => html.includes("application/ld+json"),
  },
  {
    label: "Promptly support JSON-LD (PR #26)",
    file: "promptly/support/index.html",
    test: (html) => html.includes("application/ld+json"),
  },
  {
    label: "Promptly privacy JSON-LD (PRs #19/#26)",
    file: "promptly/privacy/index.html",
    test: (html) => html.includes("application/ld+json"),
  },
  {
    label: "Drishti home JSON-LD (07acd07 baseline)",
    file: "drishti/index.html",
    test: (html) => html.includes("application/ld+json"),
  },
  {
    label: "Drishti support JSON-LD (PR #26)",
    file: "drishti/support/index.html",
    test: (html) => html.includes("application/ld+json"),
  },
  {
    label: "Drishti privacy JSON-LD (PR #26)",
    file: "drishti/privacy/index.html",
    test: (html) => html.includes("application/ld+json"),
  },
  {
    // The top-level 404 page is what terminates Cloudflare Pages' single-page
    // application fallback: without it every unknown URL is served as the
    // homepage with HTTP 200 (the soft-404 PR #34 fixed). It must therefore be
    // part of the deploy-proof set, not just an existing file: if it is ever
    // lost or becomes a homepage clone, the release lane itself fails closed
    // instead of publishing a bundle that soft-404s again.
    label: "top-level real 404 page (PR #34) - terminates Pages SPA fallback",
    file: "404.html",
    test: (html) =>
      /<title>[^<]*not found[^<]*<\/title>/i.test(html) &&
      !html.includes("<title>Tiny Studio | Promptly, Drishti, and 0509") &&
      /<meta name="robots" content="noindex">/.test(html),
  },
]

// Files that must exist in every bundle.
const REQUIRED_FILES = [
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
]

const splitLines = (html) => html.split("\n")

// Remove the balanced <block> element whose opening tag sits on startIndex.
// Only flat blocks (no nested blocks of the same tag) are expected; nesting
// is still counted so a nested block fails loudly instead of over-removing.
const removeBalancedBlock = (lines, startIndex, tag, label) => {
  if (startIndex < 0) return { lines, removed: false }
  const openRe = new RegExp(`<${tag}\\b`, "g")
  const closeRe = new RegExp(`</${tag}>`, "g")
  let depth = 0
  let endIndex = -1
  for (let i = startIndex; i < lines.length; i++) {
    depth += (lines[i].match(openRe) || []).length
    depth -= (lines[i].match(closeRe) || []).length
    if (depth <= 0) {
      endIndex = i
      break
    }
  }
  if (endIndex === -1) {
    throw new Error(`filter error: unbalanced ${tag} block for ${label}`)
  }
  if (depth < 0) {
    throw new Error(`filter error: unexpected nested ${tag} close before ${label}`)
  }
  const out = [...lines]
  // Remove the block plus one adjacent blank line for clean spacing.
  let start = startIndex
  if (start > 0 && out[start - 1].trim() === "") start--
  let end = endIndex
  if (end + 1 < out.length && out[end + 1].trim() === "") end++
  out.splice(start, end - start + 1)
  return { lines: out, removed: true }
}

const applyOps = (source, ops) => {
  const errors = []
  let html = source
  for (const op of ops) {
    if (op.kind === "regex") {
      if (!op.pattern.test(html)) {
        errors.push(`regex marker not found in ${op.file}: ${op.pattern}`)
        continue
      }
      html = html.replace(op.pattern, op.replace)
    } else if (op.kind === "replace-all") {
      if (!html.includes(op.from)) {
        errors.push(`exact marker not found in ${op.file}: ${JSON.stringify(op.from)}`)
        continue
      }
      html = html.split(op.from).join(op.to)
    } else if (op.kind === "line-remove") {
      const lines = splitLines(html)
      const idx = lines.findIndex((l) => l.trim() === op.match)
      if (idx === -1) {
        errors.push(`line marker not found in ${op.file}: ${op.match}`)
        continue
      }
      lines.splice(idx, 1)
      html = lines.join("\n")
    } else if (op.kind === "article-block") {
      const lines = splitLines(html)
      const markerIdx = lines.findIndex((l) => l.includes(op.marker))
      if (markerIdx === -1) {
        errors.push(`article marker not found in ${op.file}: ${op.marker}`)
        continue
      }
      let start = markerIdx
      while (start > 0 && !lines[start].includes("<article")) start--
      let end = markerIdx
      while (end < lines.length && !lines[end].includes("</article>")) end++
      if (!lines[start].includes("<article") || !lines[end].includes("</article>")) {
        errors.push(`article block not balanced around ${op.marker} in ${op.file}`)
        continue
      }
      let s = start
      if (s > 0 && lines[s - 1].trim() === "") s--
      let e = end
      if (e + 1 < lines.length && lines[e + 1].trim() === "") e++
      lines.splice(s, e - s + 1)
      html = lines.join("\n")
    } else if (op.kind === "section-block") {
      const lines = splitLines(html)
      let start = lines.findIndex((l) => l.includes(op.marker))
      if (op.contentMarker) {
        while (start !== -1 && !lines.slice(start, start + 30).join("\n").includes(op.contentMarker)) {
          start = lines.findIndex((l, i) => i > start && l.includes(op.marker))
        }
      }
      if (start === -1) {
        errors.push(`section marker not found in ${op.file}: ${op.marker}`)
        continue
      }
      const res = removeBalancedBlock(lines, start, op.tag, op.file)
      if (!res.removed) {
        errors.push(`section block not removed in ${op.file}: ${op.marker}`)
        continue
      }
      html = res.lines.join("\n")
    } else {
      errors.push(`unknown op kind ${op.kind}`)
    }
  }
  return { html, errors }
}

const buildOps = () => [
  // public/index.html
  { file: "index.html", kind: "regex", pattern: HOMEPAGE_HERO_LEAD, replace: "" },
  { file: "index.html", kind: "article-block", marker: HERO_RAIL_MARKER },
  { file: "index.html", kind: "section-block", marker: MANAGED_SERVICE_SECTION_MARKER, tag: "section" },
  // public/contact/index.html
  { file: "contact/index.html", kind: "replace-all", from: CONTACT_DESCRIPTION_CLAUSE, to: "." },
  { file: "contact/index.html", kind: "regex", pattern: CONTACT_PAGE_LEAD, replace: "." },
  { file: "contact/index.html", kind: "line-remove", match: CONTACT_LIST_ITEM },
  {
    file: "contact/index.html",
    kind: "section-block",
    marker: CONTACT_INFO_CARD_MARKER,
    tag: "section",
    contentMarker: CONTACT_INFO_CARD_CONTENT,
  },
  { file: "contact/index.html", kind: "section-block", marker: CONTACT_APPLICATION_SECTION_MARKER, tag: "section" },
  { file: "contact/index.html", kind: "regex", pattern: CONTACT_SEND_SENTENCE, replace: "" },
]

const filterFile = (file, sourceHtml) => {
  const ops = buildOps().filter((op) => op.file === file)
  const { html, errors } = applyOps(sourceHtml, ops)
  if (errors.length > 0) {
    throw new Error(
      [
        `snooze filter drifted for ${file}:`,
        ...errors.map((e) => `  - ${e}`),
        "Either the managed-service buyer path content changed on main or the",
        "snooze was lifted. Update the markers in scripts/prepare-public-deploy-bundle.mjs",
        "deliberately; never deploy the snoozed buyer path while the snooze stands.",
      ].join("\n")
    )
  }
  return html
}

const assertForbiddenAbsent = (bundleDir) => {
  const failures = []
  for (const rel of REQUIRED_FILES) {
    const p = join(bundleDir, rel)
    if (!existsSync(p)) continue
    const html = readFileSync(p, "utf8")
    for (const marker of FORBIDDEN_MARKERS) {
      if (marker.test(html)) {
        failures.push(`${rel} still contains ${marker.label}`)
      }
    }
  }
  return failures
}

const assertNeutralProofs = (bundleDir) => {
  const failures = []
  for (const proof of NEUTRAL_PROOFS) {
    const p = join(bundleDir, proof.file)
    if (!existsSync(p)) {
      failures.push(`missing proof file ${proof.file}`)
      continue
    }
    const html = readFileSync(p, "utf8")
    if (!proof.test(html)) failures.push(`${proof.file} lost: ${proof.label}`)
  }
  return failures
}

const sourceCommit = () => {
  const res = spawnSync("git", ["rev-parse", "HEAD"], { cwd: ROOT, encoding: "utf8" })
  return res.status === 0 ? res.stdout.trim() : "unknown"
}

export const preparePublicDeployBundle = async ({ sourceDir, outputDir }) => {
  const source = resolve(sourceDir)
  const output = resolve(outputDir)
  await fs.rm(output, { recursive: true, force: true })
  await fs.mkdir(output, { recursive: true })
  await fs.cp(source, output, { recursive: true })

  const filtered = filterFile("index.html", await fs.readFile(join(source, "index.html"), "utf8"))
  await fs.writeFile(join(output, "index.html"), filtered)
  const contact = filterFile("contact/index.html", await fs.readFile(join(source, "contact/index.html"), "utf8"))
  await fs.writeFile(join(output, "contact/index.html"), contact)

  const forbiddenFailures = assertForbiddenAbsent(output)
  if (forbiddenFailures.length > 0) {
    throw new Error(`deploy bundle still carries snoozed content:\n${forbiddenFailures.map((f) => `  - ${f}`).join("\n")}`)
  }
  const proofFailures = assertNeutralProofs(output)
  if (proofFailures.length > 0) {
    throw new Error(`deploy bundle lost neutral merged fixes:\n${proofFailures.map((f) => `  - ${f}`).join("\n")}`)
  }

  const manifest = {
    filter_version: SNOOZE_FILTER_VERSION,
    prepared_at: new Date().toISOString(),
    source_commit: sourceCommit(),
    file_count: (await fs.readdir(output, { recursive: true })).length,
    note: "managed-service buyer path (PRs #10/#11) removed per snoozed-by-nish 2026-08-08",
  }
  await fs.writeFile(join(output, "deploy-manifest.json"), `${JSON.stringify(manifest, null, 2)}\n`)
  return output
}

const parseArgs = (argv) => {
  const args = { source: "public", output: "" }
  for (let i = 2; i < argv.length; i++) {
    if (argv[i] === "--source" && argv[i + 1]) args.source = argv[++i]
    if (argv[i] === "--output" && argv[i + 1]) args.output = argv[++i]
  }
  return args
}

if (process.argv[1] && fileURLToPath(import.meta.url) === resolve(process.argv[1])) {
  const args = parseArgs(process.argv)
  const outputDir = args.output || join(tmpdir(), `tinystudio-deploy-bundle-${Date.now()}`)
  try {
    const out = await preparePublicDeployBundle({
      sourceDir: join(ROOT, args.source),
      outputDir,
    })
    const manifest = JSON.parse(await fs.readFile(join(out, "deploy-manifest.json"), "utf8"))
    console.log(`bundle ready: ${out}`)
    console.log(`  source_commit: ${manifest.source_commit}`)
    console.log(`  files: ${manifest.file_count}`)
    console.log(`  filter_version: ${manifest.filter_version}`)
    console.log("  snoozed buyer-path content removed; neutral fixes verified present")
  } catch (error) {
    console.error(error.message)
    process.exit(1)
  }
}
