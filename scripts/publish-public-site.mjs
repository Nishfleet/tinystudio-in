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
//   3. After upload the lane PROVES the uploaded deployment actually became
//      production (the canonical deployment id changed away from the
//      rollback target, and its source commit is the bundle's). Without this
//      proof the acceptance below is meaningless: it probes tinystudio.in
//      against a fixed list of ALREADY-merged fixes, so an upload that never
//      goes live (preview branch, wrong project, no-op upload, custom domain
//      pointing elsewhere) still passes it and the lane prints "done" over a
//      stale site. That is exactly how production sat on the 2026-06-20
//      bundle for two months.
//   4. After promotion is proven the lane runs the live acceptance
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
// The documented Cloudflare API base is /client/v4. This constant shipped
// as /api/v4 (403 on every call), so the release lane never worked and the
// site sat stale from 2026-06-20 to 2026-08-20. The regression test pins the
// literal string so a mock can never hide this again.
export const CF_API_BASE = "https://api.cloudflare.com/client/v4"

// Cloudflare promotes a direct-upload deployment to production as part of the
// upload, but the project's canonical_deployment field is read-after-write on
// their API. Poll a bounded number of times so a slow promotion is a wait, not
// a false red; exhausting the budget means the upload genuinely did not go
// live and the lane must say so.
export const PROMOTION_ATTEMPTS = 6
export const PROMOTION_DELAY_MS = 5000

const PROVISION_MESSAGE = `
The release lane cannot publish yet: it needs a Cloudflare API token with
Cloudflare Pages:Edit on account ${PAGES_ACCOUNT_ID} (tinystudio.in is served
by the Pages project ${PAGES_PROJECT} - see the apex CNAME in the zone).

The fleet Workers token (fleet-console/cf.env) does NOT include Pages:Edit,
which is why the site sat stale from 2026-06-20 to 2026-08-20.

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
const defaultSleep = (ms) => new Promise((resolvePromise) => setTimeout(resolvePromise, ms))

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
  sleep: defaultSleep,
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

export const readBundleManifest = (bundleDir) => JSON.parse(readFileSync(join(bundleDir, "deploy-manifest.json"), "utf8"))

// The commit the bundle was built from, or null when the bundle could not
// name one (`unknown`): in that case the lane cannot pin ownership of the
// promoted deployment by commit, only that production changed.
export const bundleSourceCommit = (bundleDir) => {
  const manifest = readBundleManifest(bundleDir)
  const commit = manifest.source_commit
  return commit && commit !== "unknown" ? commit : null
}

// Cloudflare may echo a short sha; compare case-insensitively on the shorter
// of the two so a truncated hash is a match, not a spurious release failure.
export const sameSourceCommit = (expected, actual) => {
  if (!expected || !actual) return false
  const a = String(expected).toLowerCase()
  const b = String(actual).toLowerCase()
  const n = Math.min(a.length, b.length)
  return n >= 7 && a.slice(0, n) === b.slice(0, n)
}

// PROVE the upload became production. This is the check whose absence let the
// site sit on the 2026-06-20 bundle while the lane reported success: the live
// acceptance only asserts previously merged fixes, so it passes against the
// OLD site when an upload never goes live.
//
// Failure here is NOT a rollback case. If production never moved there is
// nothing to restore (production already is the pre-release state), and if
// production moved to a deployment that is not ours, rolling back would
// clobber somebody else's release. Both are loud, hands-off failures.
export const verifyProductionPromotion = async ({ previous, expectedCommit = null }, deps = {}, log = () => {}) => {
  const {
    sleep = defaultSleep,
    promotionAttempts = PROMOTION_ATTEMPTS,
    promotionDelayMs = PROMOTION_DELAY_MS,
  } = deps
  let current = null
  let lastReadError = null
  for (let attempt = 1; attempt <= promotionAttempts; attempt++) {
    try {
      current = await currentProductionIdentity(deps)
      lastReadError = null
    } catch (error) {
      // A blip on the Cloudflare read must not fail a release that did go
      // live; only an unreadable identity on the LAST attempt is fatal.
      lastReadError = error
      current = null
      log(`[publish] could not read the production identity (attempt ${attempt}/${promotionAttempts}): ${error.message}`)
    }
    if (current && current.deploymentId !== previous.deploymentId) break
    if (attempt < promotionAttempts) {
      if (current) {
        log(
          `[publish] production is still ${previous.deploymentId} (attempt ${attempt}/${promotionAttempts}); waiting ${promotionDelayMs}ms for Cloudflare to promote the upload`
        )
      }
      await sleep(promotionDelayMs)
    }
  }
  if (lastReadError) {
    throw new Error(
      `UPLOAD NOT PROVEN LIVE: could not read the production deployment of Pages project ${PAGES_PROJECT} after the upload (${lastReadError.message}). The release cannot be shown to have gone live.`
    )
  }
  if (!current) {
    throw new Error(
      `UPLOAD NOT PROVEN LIVE: Cloudflare reports no production deployment on Pages project ${PAGES_PROJECT} after the upload, so the release cannot be shown to have gone live.`
    )
  }
  if (current.deploymentId === previous.deploymentId) {
    throw new Error(
      `UPLOAD DID NOT GO LIVE: production on Pages project ${PAGES_PROJECT} is still ${previous.deploymentId} (${previous.url}) after wrangler reported a successful upload. ` +
        `The bundle went somewhere that is not production (preview branch, wrong project, or a custom domain served by another project), so ${LIVE_BASE} still serves the previous release. ` +
        `The live acceptance is NOT proof here: it asserts already-merged fixes and passes against the stale site.`
    )
  }
  if (expectedCommit && current.commitHash && !sameSourceCommit(expectedCommit, current.commitHash)) {
    throw new Error(
      `PRODUCTION IS NOT THIS RELEASE: production moved to ${current.deploymentId} (${current.url}) built from ${current.commitHash}, but this bundle was built from ${expectedCommit}. ` +
        `Refusing to claim the release went live; not rolling back, because that deployment belongs to somebody else.`
    )
  }
  if (expectedCommit && !current.commitHash) {
    log(
      `[publish] WARNING: production moved to ${current.deploymentId} but Cloudflare reports no source commit for it; promotion is proven by deployment id alone.`
    )
  }
  return current
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
  // Attach the source commit to the Pages deployment for dashboard provenance
  // AND so the lane can prove afterwards that the deployment now in
  // production is this bundle (see verifyProductionPromotion).
  const manifest = readBundleManifest(bundleDir)
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
// prove the upload became production -> acceptance -> rollback + re-verify on
// acceptance failure. Throws on any failure; the CLI turns that into a loud
// non-zero exit.
export const releasePipeline = async ({ bundleDir, deps = {}, log = console.log, err = console.error }) => {
  requireDeployCredentials()
  log(`[publish] capturing current production deployment identity as rollback target (project ${PAGES_PROJECT})`)
  const previous = await captureProductionIdentity(deps)
  log(`[publish] rollback target: ${previous.deploymentId} url=${previous.url} source=${previous.commitHash || "unknown"}`)
  const expectedCommit = bundleSourceCommit(bundleDir)
  log("[publish] uploading bundle")
  await deployWithWrangler(bundleDir, deps)
  log("[publish] proving the upload became the production deployment")
  const promoted = await verifyProductionPromotion({ previous, expectedCommit }, deps, log)
  log(`[publish] promotion proven: production is now ${promoted.deploymentId} (${promoted.url}) source=${promoted.commitHash || "unknown"}`)
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
