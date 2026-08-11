// The tinystudio.in release lane runner.
//
// Pipeline: prepare the filtered deploy bundle from public/ (snoozed
// managed-service buyer path removed, neutral fixes asserted), publish it to
// the Cloudflare Pages project tiny-studio-3f5 with wrangler direct upload
// (independent of the Cloudflare GitHub integration), then verify the live
// site against the neutral merged fixes.
//
// Credentials (same contract as the 0509 production lane):
//   CLOUDFLARE_API_TOKEN  - must include Cloudflare Pages:Edit on the account
//   CLOUDFLARE_ACCOUNT_ID - f670a698e17bf160c8e4679823e68916
// The fleet Workers token (fleet-console/cf.env) does NOT have Pages:Edit;
// provisioning a Pages-scoped token is the documented one-time setup step.
//
// CLI:
//   node scripts/publish-public-site.mjs                          full pipeline
//   node scripts/publish-public-site.mjs --prepare-only [--output DIR]
//   node scripts/publish-public-site.mjs --deploy --bundle DIR    deploy+verify
import { existsSync } from "node:fs"
import { tmpdir } from "node:os"
import { join, resolve } from "node:path"
import { fileURLToPath } from "node:url"
import { dirname } from "node:path"
import { spawn } from "node:child_process"

import { preparePublicDeployBundle } from "./prepare-public-deploy-bundle.mjs"

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..")

export const PAGES_PROJECT = "tiny-studio-3f5"
export const PAGES_ACCOUNT_ID = "f670a698e17bf160c8e4679823e68916"
export const LIVE_BASE = "https://tinystudio.in"

const PROVISION_MESSAGE = `
The release lane cannot publish yet: it needs a Cloudflare API token with
Cloudflare Pages:Edit on account ${PAGES_ACCOUNT_ID} (tinystudio.in is served
by the Pages project ${PAGES_PROJECT} - see the apex CNAME in the zone).

The fleet Workers token (fleet-console/cf.env) does NOT include Pages:Edit,
which is why the site has been stale since 2026-06-20.

One-time provisioning (dashboard, ~2 minutes):
  1. https://dash.cloudflare.com/profile/api-tokens -> Create Token
  2. Use the "Cloudflare Pages: Edit" template, scope it to the account
     (account id ${PAGES_ACCOUNT_ID}), create, copy the token.
  3. gh secret set CLOUDFLARE_API_TOKEN -R nish3451/tinystudio-in
  4. gh secret set CLOUDFLARE_ACCOUNT_ID -R nish3451/tinystudio-in -b ${PAGES_ACCOUNT_ID}
  5. Re-run this lane (or wait for the next main merge); no code change needed.
`

const run = (command, args, env = {}) =>
  new Promise((resolvePromise, reject) => {
    const child = spawn(command, args, {
      cwd: ROOT,
      env: { ...process.env, ...env },
      stdio: "inherit",
    })
    child.on("error", reject)
    child.on("close", (code) =>
      code === 0 ? resolvePromise() : reject(Object.assign(new Error(`${command} ${args.join(" ")} exited ${code}`), { exitCode: code }))
    )
  })

const wranglerBin = join(ROOT, "node_modules", ".bin", "wrangler")

const deployWithWrangler = async (bundleDir) => {
  if (!existsSync(wranglerBin)) {
    throw new Error("wrangler is not installed - run npm ci first")
  }
  if (!process.env.CLOUDFLARE_API_TOKEN) {
    throw new Error(`Missing CLOUDFLARE_API_TOKEN.${PROVISION_MESSAGE}`)
  }
  if (!process.env.CLOUDFLARE_ACCOUNT_ID) {
    throw new Error(`Missing CLOUDFLARE_ACCOUNT_ID (set it to ${PAGES_ACCOUNT_ID}).${PROVISION_MESSAGE}`)
  }
  try {
    await run(
      wranglerBin,
      ["pages", "deploy", bundleDir, "--project-name", PAGES_PROJECT, "--branch", "main"],
      { CLOUDFLARE_LOAD_DEV_VARS_FROM_DOT_ENV: "false" }
    )
  } catch (error) {
    throw new Error(
      `wrangler pages deploy failed (${error.message}).\n` +
        `If the error is an authentication error (code 10000), the configured ` +
        `CLOUDFLARE_API_TOKEN lacks Cloudflare Pages:Edit.${PROVISION_MESSAGE}`
    )
  }
}

const verifyLive = async () => {
  const check = join(ROOT, "scripts", "check-public-live-deploy.mjs")
  await run(process.execPath, [check], {})
}

const parseArgs = (argv) => {
  const args = { mode: "full", bundle: "", output: "" }
  for (let i = 2; i < argv.length; i++) {
    if (argv[i] === "--prepare-only") args.mode = "prepare"
    if (argv[i] === "--deploy" && argv[i + 1] === "--bundle" && argv[i + 2]) {
      args.mode = "deploy"
      args.bundle = argv[i + 2]
    }
    if (argv[i] === "--output" && argv[i + 1]) args.output = argv[++i]
  }
  return args
}

if (process.argv[1] && fileURLToPath(import.meta.url) === resolve(process.argv[1])) {
  const args = parseArgs(process.argv)
  try {
    if (args.mode === "full" || args.mode === "prepare") {
      const outputDir = args.output || join(tmpdir(), `tinystudio-public-${Date.now()}`)
      await preparePublicDeployBundle({ sourceDir: join(ROOT, "public"), outputDir })
      console.log(`[publish] bundle ready: ${outputDir}`)
      if (args.mode === "prepare") process.exit(0)
      await deployWithWrangler(outputDir)
    } else if (args.mode === "deploy") {
      if (!args.bundle) throw new Error("--deploy requires --bundle <dir>")
      if (!existsSync(join(args.bundle, "deploy-manifest.json"))) {
        throw new Error(`not a deploy bundle (missing deploy-manifest.json): ${args.bundle}`)
      }
      await deployWithWrangler(args.bundle)
    }
    console.log("[publish] verifying live site against neutral merged fixes")
    await verifyLive()
    console.log("[publish] done: live site matches the verified bundle")
  } catch (error) {
    console.error(`[publish] ${error.message}`)
    process.exit(typeof error.exitCode === "number" ? error.exitCode : 1)
  }
}
