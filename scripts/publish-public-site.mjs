// The tinystudio.in release lane runner.
//
// Pipeline: prepare the filtered deploy bundle from public/ (snoozed
// managed-service buyer path removed, neutral fixes asserted), publish it to
// the Cloudflare Pages project tiny-studio (subdomain tiny-studio-3f5.pages.dev) with wrangler direct upload
// (independent of the Cloudflare GitHub integration), then verify the live
// site against the neutral merged fixes.
//
// Truthful and reversible release contract:
//   1. Missing required credential wiring fails loudly. A skipped publish
//      must never produce a green run (the GitHub workflow fails closed
//      too, see .github/workflows/deploy-public-site.yml).
//   2. Before upload the lane captures the current production deployment
//      identity (canonical deployment id/url/source commit) as the rollback
//      target and REFUSES to deploy when no safe rollback target can be
//      proven.
//   3. After upload the lane runs the live acceptance
//      (scripts/check-public-live-deploy.mjs). On failure it restores the
//      exact previous production deployment via the supported Cloudflare
//      Pages rollback API, re-verifies the restored identity, re-runs the
//      acceptance against it, and surfaces any rollback failure loudly.
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
import { existsSync, readFileSync } from "node:fs"
import { tmpdir } from "node:os"
import { join, resolve } from "node:path"
import { fileURLToPath } from "node:url"
import { dirname } from "node:path"
import { spawn } from "node:child_process"

import { preparePublicDeployBundle } from "./prepare-public-deploy-bundle.mjs"

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..")

export const PAGES_PROJECT = "tiny-studio"
export const PAGES_ACCOUNT_ID = "f670a698e17bf160c8e4679823e68916"
export const LIVE_BASE = "https://tinystudio.in"
export const CF_API_BASE = "https://api.cloudflare.com/api/v4"

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

const defaultWranglerBin = () => join(ROOT, "node_modules", ".bin", "wrangler")
const defaultAcceptanceCmd = () => [process.execPath, join(ROOT, "scripts", "check-public-live-deploy.mjs")]

const defaultRunCommand = (command, args, env = {}) =>
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

// Injectable seams for hermetic tests (fake fetch, fake wrangler, fake
// acceptance); production uses the defaults below.
export const defaultDeps = () => ({
  fetchImpl: globalThis.fetch,
  runCommand: defaultRunCommand,
  wranglerBin: defaultWranglerBin(),
  acceptanceCmd: defaultAcceptanceCmd(),
})

export const requireDeployCredentials = () => {
  if (!process.env.CLOUDFLARE_API_TOKEN) {
    throw new Error(`Missing CLOUDFLARE_API_TOKEN.${PROVISION_MESSAGE}`)
  }
  if (!process.env.CLOUDFLARE_ACCOUNT_ID) {
    throw new Error(`Missing CLOUDFLARE_ACCOUNT_ID (set it to ${PAGES_ACCOUNT_ID}).${PROVISION_MESSAGE}`)
  }
}

const cfHeaders = () => ({ Authorization: `Bearer ${process.env.CLOUDFLARE_API_TOKEN}` })

// GET the Pages project. The documented `canonical_deployment` field is the
// most recent production deployment - the immutable rollback target.
export const fetchPagesProject = async (deps = {}) => {
  const { fetchImpl = globalThis.fetch } = deps
  const url = `${CF_API_BASE}/accounts/${process.env.CLOUDFLARE_ACCOUNT_ID}/pages/projects/${PAGES_PROJECT}`
  const res = await fetchImpl(url, { headers: cfHeaders() })
  if (!res.ok) {
    throw new Error(
      `Cloudflare Pages project lookup failed (HTTP ${res.status}) - no safe rollback target can be proven, refusing to deploy.${PROVISION_MESSAGE}`
    )
  }
  const json = await res.json()
  if (!json || json.success !== true || !json.result) {
    throw new Error(
      `Cloudflare Pages project lookup returned an unexpected payload - no safe rollback target can be proven, refusing to deploy.`
    )
  }
  return json.result
}

export const captureProductionIdentity = async (deps = {}) => {
  const project = await fetchPagesProject(deps)
  const deployment = project.canonical_deployment
  if (!deployment || !deployment.id || !deployment.url) {
    throw new Error(
      `No current production deployment on Pages project ${PAGES_PROJECT} - there is no safe rollback target, refusing to deploy.${PROVISION_MESSAGE}`
    )
  }
  const metadata = (deployment.deployment_trigger && deployment.deployment_trigger.metadata) || {}
  return {
    deploymentId: deployment.id,
    url: deployment.url,
    commitHash: metadata.commit_hash || null,
    createdOn: deployment.created_on || null,
  }
}

export const currentProductionIdentity = async (deps = {}) => {
  const project = await fetchPagesProject(deps)
  const deployment = project.canonical_deployment
  if (!deployment || !deployment.id) return null
  const metadata = (deployment.deployment_trigger && deployment.deployment_trigger.metadata) || {}
  return {
    deploymentId: deployment.id,
    url: deployment.url,
    commitHash: metadata.commit_hash || null,
    createdOn: deployment.created_on || null,
  }
}

export const identitiesMatch = (a, b) => {
  if (!a || !b) return false
  if (a.deploymentId !== b.deploymentId || a.url !== b.url) return false
  if (a.commitHash || b.commitHash) return a.commitHash === b.commitHash
  return true
}

// Restore the exact previous production deployment via the supported
// Cloudflare Pages rollback API (POST .../deployments/{id}/rollback).
export const rollbackTo = async (identity, deps = {}) => {
  const { fetchImpl = globalThis.fetch } = deps
  const url = `${CF_API_BASE}/accounts/${process.env.CLOUDFLARE_ACCOUNT_ID}/pages/projects/${PAGES_PROJECT}/deployments/${encodeURIComponent(identity.deploymentId)}/rollback`
  const res = await fetchImpl(url, { method: "POST", headers: cfHeaders() })
  if (!res.ok) {
    let detail = ""
    try {
      detail = (await res.text()).slice(0, 300)
    } catch {
      // body unreadable; report the status alone
    }
    throw new Error(`Cloudflare Pages rollback API rejected the request (HTTP ${res.status}): ${detail}`)
  }
  const json = await res.json()
  if (!json || json.success !== true || !json.result || json.result.id !== identity.deploymentId) {
    throw new Error(
      `Cloudflare Pages rollback API did not confirm deployment ${identity.deploymentId} (success=${json && json.success})`
    )
  }
  return json.result
}

export const deployWithWrangler = async (bundleDir, deps = {}) => {
  const wranglerBin = deps.wranglerBin || defaultWranglerBin()
  if (!existsSync(wranglerBin)) {
    throw new Error("wrangler is not installed - run npm ci first")
  }
  requireDeployCredentials()
  // Attach the source commit to the Pages deployment for dashboard provenance.
  const manifest = JSON.parse(readFileSync(join(bundleDir, "deploy-manifest.json"), "utf8"))
  const args = ["pages", "deploy", bundleDir, "--project-name", PAGES_PROJECT, "--branch", "main"]
  if (manifest.source_commit && manifest.source_commit !== "unknown") {
    args.push(
      "--commit-hash",
      manifest.source_commit,
      "--commit-message",
      `tinystudio-in ${manifest.source_commit} (lane bundle)`,
      "--commit-dirty",
      "true"
    )
  }
  const { runCommand = defaultRunCommand } = deps
  try {
    await runCommand(
      wranglerBin,
      args,
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

// Live verification of the deployed site after upload: runs the acceptance
// checker (scripts/check-public-live-deploy.mjs), which probes the live
// site against the neutral merged fixes. A failed verification triggers the
// rollback path. Name kept as `verifyLive` to match the fail-closed lane
// contract asserted by test-deploy-public-site-workflow.mjs.
export const verifyLive = async (deps = {}) => {
  const { runCommand = defaultRunCommand, acceptanceCmd = defaultAcceptanceCmd() } = deps
  await runCommand(acceptanceCmd[0], acceptanceCmd.slice(1), {})
}

// The release pipeline: credentials -> capture rollback target -> upload ->
// acceptance -> rollback + re-verify on failure. Throws on any failure; the
// CLI turns that into a loud non-zero exit.
export const releasePipeline = async ({ bundleDir, deps = {}, log = console.log, err = console.error }) => {
  requireDeployCredentials()
  log(`[publish] capturing current production deployment identity as rollback target (project ${PAGES_PROJECT})`)
  const previous = await captureProductionIdentity(deps)
  log(`[publish] rollback target: ${previous.deploymentId} url=${previous.url} source=${previous.commitHash || "unknown"}`)
  log("[publish] uploading bundle")
  await deployWithWrangler(bundleDir, deps)
  log("[publish] running live acceptance against the neutral merged fixes")
  try {
    await verifyLive(deps)
  } catch (error) {
    err(`[publish] acceptance FAILED: ${error.message}`)
    err(`[publish] restoring the previous production deployment ${previous.deploymentId}`)
    try {
      await rollbackTo(previous, deps)
    } catch (rollbackError) {
      throw new Error(
        `ROLLBACK FAILED: the release did not pass acceptance and the previous production deployment ${previous.deploymentId} could NOT be restored (${rollbackError.message}). Manual intervention required; the live site may be broken.`
      )
    }
    log("[publish] verifying the restored deployment identity")
    let restored = null
    try {
      restored = await currentProductionIdentity(deps)
    } catch (verifyError) {
      throw new Error(
        `ROLLBACK VERIFICATION FAILED: could not re-read the production identity after rollback (${verifyError.message}). Manual intervention required.`
      )
    }
    if (!identitiesMatch(previous, restored)) {
      throw new Error(
        `ROLLBACK VERIFICATION FAILED: expected production ${previous.deploymentId} (${previous.url}) but got ${restored ? restored.deploymentId : "none"} (${restored ? restored.url : "none"}). Manual intervention required.`
      )
    }
    log(`[publish] rollback verified: production is ${restored.deploymentId} (${restored.url})`)
    err(`[publish] re-running acceptance against the restored identity ${restored.deploymentId}`)
    try {
      await verifyLive(deps)
    } catch (restoredError) {
      err(
        `[publish] NOTE: the restored deployment ${restored.deploymentId} also fails acceptance (${restoredError.message}); this is the pre-release state - the rollback itself was verified.`
      )
    }
    throw new Error(
      `release failed acceptance; production was rolled back to ${restored.deploymentId} (${restored.url}) and the restored identity was re-verified`
    )
  }
  log("[publish] done: live site matches the verified bundle")
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
      await releasePipeline({ bundleDir: outputDir })
    } else if (args.mode === "deploy") {
      if (!args.bundle) throw new Error("--deploy requires --bundle <dir>")
      if (!existsSync(join(args.bundle, "deploy-manifest.json"))) {
        throw new Error(`not a deploy bundle (missing deploy-manifest.json): ${args.bundle}`)
      }
      await releasePipeline({ bundleDir: args.bundle })
    }
  } catch (error) {
    console.error(`[publish] ${error.message}`)
    process.exit(typeof error.exitCode === "number" ? error.exitCode : 1)
  }
}
