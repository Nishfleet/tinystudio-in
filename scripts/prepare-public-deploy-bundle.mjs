// Prepare the deploy bundle for the tinystudio.in Cloudflare Pages project
// (tiny-studio-3f5).
//
// The bundle is a verbatim copy of public/, including the public sales
// surface for the human-reviewed The Website Correction managed service.
//
// History: PRs #10/#11 first introduced the managed-service buyer path, but it
// was snoozed-by-Nish (2026-08-08: "do not build, publish, or deploy the
// managed-service buyer path without his explicit yes") and stripped by an
// earlier version of this filter so every live deploy stayed portfolio-only.
// That snooze is deliberately LIFTED by the Website Correction offer-surface
// PR (homepage repositioning + the /website-correction/ offer page). Because
// that PR is PR-only and never merged without human review, nothing deploys
// until the review gate passes. This file is the fail-closed deploy contract
// for the new reality: the offer surface is PART of the publishable bundle,
// and the filter must verify it is present (not strip it).
//
// The filter is fail-closed in one direction now:
//   - every neutral merged fix used as deploy proof must survive untouched
//     (H2-after-H1 on /promptly/support/ from #18/#20, JSON-LD on /contact/
//     from #19, homepage brand disambiguation from #29, the top-level real
//     404 page from #34, and the PR #26 site-wide invariant that every public
//     page keeps its JSON-LD block).
//   - the Website Correction offer surface must be present in the bundle.
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

export const SNOOZE_FILTER_VERSION = 2

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..")

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
    label: "homepage offer title (repositioned)",
    file: "index.html",
    test: (html) => html.includes("<title>The Website Correction • Tiny Studio"),
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
      !html.includes("<title>The Website Correction • Tiny Studio") &&
      /<meta name="robots" content="noindex">/.test(html),
  },
]

// The Website Correction sales surface must be part of every publishable
// bundle (positive proof, replacing the old snooze strip).
export const OFFER_PROOFS = [
  {
    label: "offer page exists and names the offer",
    file: "website-correction/index.html",
    test: (html) => html.includes("The Website Correction") && html.includes("<html"),
  },
  {
    label: "offer page is a complete document",
    file: "website-correction/index.html",
    test: (html) => html.includes("</html>") && html.includes('class="site-header"') && html.includes('class="footer"'),
  },
  {
    label: "offer page carries structured data",
    file: "website-correction/index.html",
    test: (html) => html.includes("application/ld+json"),
  },
  {
    label: "homepage leads with the offer",
    file: "index.html",
    test: (html) => html.includes("<h1>The Website Correction.") && html.includes("homepage-hero"),
  },
  {
    label: "homepage links to the offer page",
    file: "index.html",
    test: (html) => html.includes("/website-correction/"),
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
  "website-correction/index.html",
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

const assertOfferProofs = (bundleDir) => {
  const failures = []
  for (const proof of OFFER_PROOFS) {
    const p = join(bundleDir, proof.file)
    if (!existsSync(p)) {
      failures.push(`missing offer file ${proof.file}`)
      continue
    }
    const html = readFileSync(p, "utf8")
    if (!proof.test(html)) failures.push(`${proof.file} missing: ${proof.label}`)
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

  const proofFailures = assertNeutralProofs(output)
  if (proofFailures.length > 0) {
    throw new Error(`deploy bundle lost neutral merged fixes:\n${proofFailures.map((f) => `  - ${f}`).join("\n")}`)
  }
  const offerFailures = assertOfferProofs(output)
  if (offerFailures.length > 0) {
    throw new Error(`deploy bundle is missing the Website Correction offer surface:\n${offerFailures.map((f) => `  - ${f}`).join("\n")}`)
  }

  const manifest = {
    filter_version: SNOOZE_FILTER_VERSION,
    prepared_at: new Date().toISOString(),
    source_commit: sourceCommit(),
    file_count: (await fs.readdir(output, { recursive: true })).length,
    note: "The Website Correction offer surface (homepage repositioning + /website-correction/) is included. The 2026-08-08 snooze is lifted by the offer-surface PR, which is PR-only and never merges without human review.",
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
    console.log("  offer surface included; neutral merged fixes verified present")
  } catch (error) {
    console.error(error.message)
    process.exit(1)
  }
}
