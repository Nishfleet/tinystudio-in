// Guard the tinystudio.in release lane contract: fail truthfully when the
// credential wiring is missing, capture a provable rollback target before
// upload, and restore the exact previous production Pages deployment (then
// re-verify it) when live acceptance fails after upload.
//
// Hermetic: no network, no real child processes. Cloudflare is faked with a
// scripted fetch; wrangler and the live acceptance are faked with a scripted
// runCommand. These tests FAIL on the pre-change script (it has no
// releasePipeline/capture/rollback surface at all).
import { mkdtempSync, rmSync, writeFileSync } from "node:fs"
import { tmpdir } from "node:os"
import { join } from "node:path"
import { fileURLToPath } from "node:url"
import { dirname } from "node:path"

import {
  CF_API_BASE,
  PAGES_ACCOUNT_ID,
  PAGES_PROJECT,
  bundleSourceCommit,
  captureProductionIdentity,
  currentProductionIdentity,
  identitiesMatch,
  releasePipeline,
  requireDeployCredentials,
  rollbackTo,
  sameSourceCommit,
  verifyProductionPromotion,
} from "./publish-public-site.mjs"

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..")

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

// Pin the real Cloudflare API base as a LITERAL. Every other expectation in
// this file derives URLs from CF_API_BASE, so a typo in the constant used to
// satisfy the mocks while 403ing in production (the /api/v4 bug, 2026-08-20).
if (CF_API_BASE !== "https://api.cloudflare.com/client/v4") {
  console.error(`CF_API_BASE regression: expected https://api.cloudflare.com/client/v4, got ${CF_API_BASE}`)
  process.exit(1)
}

const projectUrl = () => `${CF_API_BASE}/accounts/${PAGES_ACCOUNT_ID}/pages/projects/${PAGES_PROJECT}`
const rollbackUrl = (id) => `${CF_API_BASE}/accounts/${PAGES_ACCOUNT_ID}/pages/projects/${PAGES_PROJECT}/deployments/${id}/rollback`

const savedEnv = {
  token: process.env.CLOUDFLARE_API_TOKEN,
  account: process.env.CLOUDFLARE_ACCOUNT_ID,
}

// Pass token: null / account: null to REMOVE the variable (fail-closed
// wiring tests); omit or pass a string to set it.
const withEnv = async (fn, { token = "fake-token", account = PAGES_ACCOUNT_ID } = {}) => {
  const before = { token: process.env.CLOUDFLARE_API_TOKEN, account: process.env.CLOUDFLARE_ACCOUNT_ID }
  if (token === null) delete process.env.CLOUDFLARE_API_TOKEN
  else process.env.CLOUDFLARE_API_TOKEN = token
  if (account === null) delete process.env.CLOUDFLARE_ACCOUNT_ID
  else process.env.CLOUDFLARE_ACCOUNT_ID = account
  try {
    return await fn()
  } finally {
    if (before.token === undefined) delete process.env.CLOUDFLARE_API_TOKEN
    else process.env.CLOUDFLARE_API_TOKEN = before.token
    if (before.account === undefined) delete process.env.CLOUDFLARE_ACCOUNT_ID
    else process.env.CLOUDFLARE_ACCOUNT_ID = before.account
  }
}

const deployment = (id, commitHash = null) => ({
  id,
  url: `https://${id}.tiny-studio-3f5.pages.dev`,
  created_on: "2026-08-01T00:00:00Z",
  deployment_trigger: {
    type: "ad_hoc",
    metadata: {
      branch: "main",
      commit_hash: commitHash,
      commit_message: commitHash ? `tinystudio-in ${commitHash}` : null,
    },
  },
})

// Fake Cloudflare state: deployments by id, canonical = current production.
const makeState = (canonicalId, all = [canonicalId]) => {
  const deployments = Object.fromEntries(all.map((id) => [id, deployment(id, `commit-${id}`)]))
  return { deployments, canonical: deployments[canonicalId], rollbacks: [] }
}

// Fake fetch: GET project (canonical identity) + POST rollback.
const makeFakeFetch = (state, { projectStatus = 200, rollbackStatus = 200, rollbackApplies = true } = {}) => {
  const calls = []
  const fetchImpl = async (url, init = {}) => {
    calls.push({ url, method: init.method || "GET" })
    if (url === projectUrl() && (!init.method || init.method === "GET")) {
      if (projectStatus !== 200) {
        return new Response(JSON.stringify({ success: false, errors: [{ code: projectStatus, message: "boom" }] }), { status: projectStatus })
      }
      return new Response(
        JSON.stringify({ success: true, result: { name: PAGES_PROJECT, canonical_deployment: state.canonical || null } }),
        { status: 200, headers: { "content-type": "application/json" } }
      )
    }
    const match = url.match(/\/deployments\/([^/]+)\/rollback$/)
    if (init.method === "POST" && match) {
      const targetId = match[1]
      state.rollbacks.push(targetId)
      if (rollbackStatus !== 200) {
        return new Response(JSON.stringify({ success: false, errors: [{ code: 9999, message: "rollback rejected" }] }), { status: rollbackStatus })
      }
      const target = state.deployments[targetId]
      if (rollbackApplies && target) state.canonical = target
      return new Response(JSON.stringify({ success: true, result: target }), {
        status: 200,
        headers: { "content-type": "application/json" },
      })
    }
    throw new Error(`unexpected fake fetch: ${init.method || "GET"} ${url}`)
  }
  return { fetchImpl, calls }
}

// Fake wrangler + acceptance runner: wrangler deploys create a fresh
// production deployment carrying the SAME source commit the real wrangler
// was told to attach (`--commit-hash`), because the lane now proves the
// deployment in production is this bundle. A mock that invented its own
// commit would hide exactly that check.
//   promote: false    - upload succeeds but production never moves (preview
//                       branch / wrong project / no-op upload).
//   promoteForeign    - production moves to somebody else's deployment.
const makeFakeRun = (state, { acceptanceFail = false, wranglerFail = false, promote = true, promoteForeign = false } = {}) => {
  const calls = []
  const runCommand = async (command, args) => {
    calls.push({ command, args })
    const isWrangler = args[0] === "pages" && args[1] === "deploy"
    if (isWrangler) {
      if (wranglerFail) throw Object.assign(new Error("wrangler pages deploy exited 1"), { exitCode: 1 })
      const commitIndex = args.indexOf("--commit-hash")
      const commitHash = commitIndex === -1 ? null : args[commitIndex + 1]
      const fresh = promoteForeign
        ? deployment("someone-elses-deployment", "another-branch-commit")
        : deployment("fresh-deployment", commitHash)
      state.deployments[fresh.id] = fresh
      if (promote) state.canonical = fresh
      return
    }
    if (args.some((a) => a.includes("check-public-live-deploy.mjs"))) {
      if (acceptanceFail) {
        throw Object.assign(new Error("check-public-live-deploy.mjs exited 1 (acceptance failure)"), { exitCode: 1 })
      }
      return
    }
    throw new Error(`unexpected fake command: ${command} ${args.join(" ")}`)
  }
  return { runCommand, calls }
}

const makeBundle = () => {
  const dir = mkdtempSync(join(tmpdir(), "tsin-release-test-"))
  writeFileSync(join(dir, "deploy-manifest.json"), JSON.stringify({ source_commit: "test-source-commit" }))
  const fakeWrangler = join(dir, "fake-wrangler")
  writeFileSync(fakeWrangler, "#!/bin/sh\nexit 0\n")
  return { dir, fakeWrangler }
}

const quiet = { log: () => {}, err: () => {} }

const cleanup = []
const cleanupAll = () => cleanup.splice(0).forEach((fn) => fn())

console.log("test-pages-release: the release lane is truthful (fails closed) and reversible (capture + rollback + re-verify)")

// ---------------------------------------------------------------------------
console.log("A. missing required credential wiring fails loudly (no green skip)")
{
  const { dir } = makeBundle()
  cleanup.push(() => rmSync(dir, { recursive: true, force: true }))
  const state = makeState("previous-deployment")
  const { fetchImpl, calls: fetchCalls } = makeFakeFetch(state)
  const { runCommand, calls: runCalls } = makeFakeRun(state)

  let threw = ""
  await withEnv(
    async () => {
      try {
        await releasePipeline({ bundleDir: dir, deps: { fetchImpl, runCommand }, ...quiet })
      } catch (error) {
        threw = error.message
      }
    },
    { token: null, account: null }
  )
  ok(threw.includes("CLOUDFLARE_API_TOKEN"), "both secrets missing: pipeline throws about CLOUDFLARE_API_TOKEN")
  ok(fetchCalls.length === 0, "both secrets missing: no Cloudflare call was made")
  ok(runCalls.length === 0, "both secrets missing: no deploy/acceptance command was run")

  threw = ""
  await withEnv(
    async () => {
      try {
        await releasePipeline({ bundleDir: dir, deps: { fetchImpl, runCommand }, ...quiet })
      } catch (error) {
        threw = error.message
      }
    },
    { token: null, account: PAGES_ACCOUNT_ID }
  )
  ok(threw.includes("CLOUDFLARE_API_TOKEN"), "only account id present: pipeline throws about CLOUDFLARE_API_TOKEN")

  threw = ""
  await withEnv(
    async () => {
      try {
        await releasePipeline({ bundleDir: dir, deps: { fetchImpl, runCommand }, ...quiet })
      } catch (error) {
        threw = error.message
      }
    },
    { token: "fake-token", account: null }
  )
  ok(threw.includes("CLOUDFLARE_ACCOUNT_ID"), "only token present: pipeline throws about CLOUDFLARE_ACCOUNT_ID")

  let threwMissing = ""
  await withEnv(
    async () => {
      try {
        requireDeployCredentials()
      } catch (error) {
        threwMissing = error.message
      }
    },
    { token: null, account: null }
  )
  ok(threwMissing.includes("CLOUDFLARE_API_TOKEN"), "requireDeployCredentials throws when wiring is missing")
}

// ---------------------------------------------------------------------------
console.log("B. previous production identity is captured before upload; no target => refuse to deploy")
{
  const { dir, fakeWrangler } = makeBundle()
  cleanup.push(() => rmSync(dir, { recursive: true, force: true }))

  // Identity capture assertions run against a pristine state (before any
  // pipeline run mutates the fake store).
  const pristineState = makeState("previous-deployment")
  const { fetchImpl: pristineFetch } = makeFakeFetch(pristineState)
  let captured = null
  await withEnv(async () => {
    captured = await captureProductionIdentity({ fetchImpl: pristineFetch })
  })
  ok(captured.deploymentId === "previous-deployment", "captured identity has the previous deployment id")
  ok(captured.url.includes("previous-deployment"), "captured identity carries the immutable deployment url")
  ok(captured.commitHash === "commit-previous-deployment", "captured identity carries the source commit")

  const state = makeState("previous-deployment")
  const { fetchImpl, calls: fetchCalls } = makeFakeFetch(state)
  const { runCommand, calls: runCalls } = makeFakeRun(state)

  await withEnv(async () => {
    await releasePipeline({
      bundleDir: dir,
      deps: { fetchImpl, runCommand, wranglerBin: fakeWrangler },
      ...quiet,
    })
  })

  ok(fetchCalls.length >= 1 && fetchCalls[0].url === projectUrl() && fetchCalls[0].method === "GET",
    "the current production identity is captured (project GET) before anything else")
  const wranglerRuns = runCalls.filter((c) => c.args[0] === "pages" && c.args[1] === "deploy")
  ok(wranglerRuns.length === 1 && wranglerRuns[0].args.includes(dir) && wranglerRuns[0].args.includes(PAGES_PROJECT),
    "wrangler deploy runs after identity capture with the bundle dir and project name")
  ok(runCalls[0].args[0] === "pages", "the first command run is the wrangler deploy (capture happens before upload)")

  // No canonical production deployment => refuse, deploy never runs.
  const emptyState = makeState("previous-deployment")
  emptyState.canonical = null
  const { fetchImpl: f2, calls: c2 } = makeFakeFetch(emptyState)
  const { runCommand: r2, calls: rc2 } = makeFakeRun(emptyState)
  let threw = ""
  await withEnv(async () => {
    try {
      await releasePipeline({ bundleDir: dir, deps: { fetchImpl: f2, runCommand: r2, wranglerBin: fakeWrangler }, ...quiet })
    } catch (error) {
      threw = error.message
    }
  })
  ok(threw.includes("no safe rollback target"), "no production deployment: pipeline refuses with a rollback-target error")
  ok(rc2.length === 0, "no production deployment: wrangler deploy never runs")

  // Project lookup fails => refuse, deploy never runs.
  const { fetchImpl: f3, calls: c3 } = makeFakeFetch(state, { projectStatus: 500 })
  const { runCommand: r3, calls: rc3 } = makeFakeRun(state)
  threw = ""
  await withEnv(async () => {
    try {
      await releasePipeline({ bundleDir: dir, deps: { fetchImpl: f3, runCommand: r3, wranglerBin: fakeWrangler }, ...quiet })
    } catch (error) {
      threw = error.message
    }
  })
  ok(threw.includes("refusing to deploy"), "project lookup failure: pipeline refuses to deploy")
  ok(rc3.length === 0, "project lookup failure: wrangler deploy never runs")
  ok(c3.length === 1, "project lookup failure: only the capture call was attempted")
}

// ---------------------------------------------------------------------------
console.log("C. failed acceptance after upload invokes rollback to the previous deployment")
{
  const { dir, fakeWrangler } = makeBundle()
  cleanup.push(() => rmSync(dir, { recursive: true, force: true }))
  const state = makeState("previous-deployment")
  const { fetchImpl, calls: fetchCalls } = makeFakeFetch(state)
  const { runCommand, calls: runCalls } = makeFakeRun(state, { acceptanceFail: true })

  let threw = ""
  await withEnv(async () => {
    try {
      await releasePipeline({ bundleDir: dir, deps: { fetchImpl, runCommand, wranglerBin: fakeWrangler }, ...quiet })
    } catch (error) {
      threw = error.message
    }
  })
  ok(threw.includes("failed acceptance"), "pipeline reports the release failure after acceptance failure")
  ok(state.rollbacks.length === 1 && state.rollbacks[0] === "previous-deployment",
    "rollback to the exact previous deployment id was invoked")
  const wranglerRunsC = runCalls.filter((c) => c.args[0] === "pages" && c.args[1] === "deploy")
  const acceptanceRunsC = runCalls.filter((c) => c.args.some((a) => a.includes("check-public-live-deploy.mjs")))
  ok(wranglerRunsC.length === 1, "the new bundle was uploaded once")
  ok(acceptanceRunsC.length === 2, "the same acceptance ran once after upload and once more after rollback")
  ok(fetchCalls.some((c) => c.url === rollbackUrl("previous-deployment") && c.method === "POST"),
    "the rollback used the supported Cloudflare Pages rollback API endpoint")
}

// ---------------------------------------------------------------------------
console.log("D. restored identity is re-verified and the same acceptance reruns against it")
{
  const { dir, fakeWrangler } = makeBundle()
  cleanup.push(() => rmSync(dir, { recursive: true, force: true }))
  const state = makeState("previous-deployment")
  const { fetchImpl } = makeFakeFetch(state)
  const { runCommand, calls: runCalls } = makeFakeRun(state, { acceptanceFail: true })

  let threw = ""
  await withEnv(async () => {
    try {
      await releasePipeline({ bundleDir: dir, deps: { fetchImpl, runCommand, wranglerBin: fakeWrangler }, ...quiet })
    } catch (error) {
      threw = error.message
    }
  })
  ok(threw.includes("rolled back"), "pipeline message says production was rolled back")
  let restored = null
  await withEnv(async () => {
    restored = await currentProductionIdentity({ fetchImpl })
  })
  ok(restored && restored.deploymentId === "previous-deployment" && restored.url.includes("previous-deployment"),
    "after rollback the current production identity equals the captured previous identity")
  ok(identitiesMatch({ deploymentId: "previous-deployment", url: restored.url, commitHash: restored.commitHash }, restored),
    "identitiesMatch confirms the restored identity")
  const acceptanceRuns = runCalls.filter((c) => c.args.some((a) => a.includes("check-public-live-deploy.mjs")))
  ok(acceptanceRuns.length === 2, "the same acceptance script ran after upload and against the restored identity")

  // Rollback API failure surfaces loudly.
  const state2 = makeState("previous-deployment")
  const { fetchImpl: f2 } = makeFakeFetch(state2, { rollbackStatus: 500 })
  const { runCommand: r2 } = makeFakeRun(state2, { acceptanceFail: true })
  let threw2 = ""
  await withEnv(async () => {
    try {
      await releasePipeline({ bundleDir: dir, deps: { fetchImpl: f2, runCommand: r2, wranglerBin: fakeWrangler }, ...quiet })
    } catch (error) {
      threw2 = error.message
    }
  })
  ok(threw2.includes("ROLLBACK FAILED"), "rollback API rejection surfaces loudly as ROLLBACK FAILED")

  // Identity not restored after rollback surfaces loudly.
  const state3 = makeState("previous-deployment")
  const { fetchImpl: f3 } = makeFakeFetch(state3, { rollbackApplies: false })
  const { runCommand: r3 } = makeFakeRun(state3, { acceptanceFail: true })
  let threw3 = ""
  await withEnv(async () => {
    try {
      await releasePipeline({ bundleDir: dir, deps: { fetchImpl: f3, runCommand: r3, wranglerBin: fakeWrangler }, ...quiet })
    } catch (error) {
      threw3 = error.message
    }
  })
  ok(threw3.includes("ROLLBACK VERIFICATION FAILED"), "identity mismatch after rollback surfaces loudly as ROLLBACK VERIFICATION FAILED")
}

// ---------------------------------------------------------------------------
console.log("E. success path does not roll back")
{
  const { dir, fakeWrangler } = makeBundle()
  cleanup.push(() => rmSync(dir, { recursive: true, force: true }))
  const state = makeState("previous-deployment")
  const { fetchImpl } = makeFakeFetch(state)
  const { runCommand } = makeFakeRun(state, { acceptanceFail: false })

  let resolved = false
  await withEnv(async () => {
    await releasePipeline({ bundleDir: dir, deps: { fetchImpl, runCommand, wranglerBin: fakeWrangler }, ...quiet })
    resolved = true
  })
  ok(resolved, "success path resolves")
  ok(state.rollbacks.length === 0, "success path never invokes rollback")
  ok(state.canonical.id === "fresh-deployment", "success path leaves the fresh deployment live")
}

// ---------------------------------------------------------------------------
console.log("F. identity helpers behave")
{
  const a = { deploymentId: "d1", url: "https://d1.example.dev", commitHash: "abc" }
  ok(identitiesMatch(a, { ...a }), "identical identities match")
  ok(!identitiesMatch(a, { ...a, deploymentId: "d2" }), "different deployment id does not match")
  ok(!identitiesMatch(a, { ...a, url: "https://d2.example.dev" }), "different url does not match")
  ok(!identitiesMatch(a, { ...a, commitHash: null }), "missing source commit does not match a captured source commit")
  ok(identitiesMatch({ ...a, commitHash: null }, { deploymentId: "d1", url: "https://d1.example.dev", commitHash: null }),
    "both-null source commits still match (legacy deployments)")
  ok(!identitiesMatch(a, null), "null restored identity does not match")
}

// ---------------------------------------------------------------------------
console.log("G. rollbackTo rejects a bad rollback response")
{
  const state = makeState("previous-deployment")
  const { fetchImpl } = makeFakeFetch(state, { rollbackStatus: 500 })
  let threw = ""
  await withEnv(async () => {
    try {
      await rollbackTo({ deploymentId: "previous-deployment", url: "x" }, { fetchImpl })
    } catch (error) {
      threw = error.message
    }
  })
  ok(threw.includes("rollback") && threw.includes("HTTP 500"), "rollbackTo surfaces the API rejection")
}

// ---------------------------------------------------------------------------
console.log("H. the upload must be PROVEN to have become production before the lane claims success")
{
  // The live acceptance asserts ALREADY-merged fixes, so it passes against a
  // stale site. Without a promotion proof an upload that never goes live
  // reports a green release over the old bundle - the 2026-06-20 failure.
  const instant = { sleep: async () => {}, promotionDelayMs: 0 }

  // H1. Upload succeeded but production never moved => loud failure, no
  // acceptance, no rollback.
  const { dir, fakeWrangler } = makeBundle()
  cleanup.push(() => rmSync(dir, { recursive: true, force: true }))
  const state = makeState("previous-deployment")
  const { fetchImpl } = makeFakeFetch(state)
  const { runCommand, calls: runCalls } = makeFakeRun(state, { promote: false })

  let threw = ""
  await withEnv(async () => {
    try {
      await releasePipeline({ bundleDir: dir, deps: { fetchImpl, runCommand, wranglerBin: fakeWrangler, ...instant }, ...quiet })
    } catch (error) {
      threw = error.message
    }
  })
  ok(threw.includes("UPLOAD DID NOT GO LIVE"), "upload that never becomes production fails loudly")
  ok(threw.includes("previous-deployment"), "the failure names the deployment production is stuck on")
  ok(runCalls.filter((c) => c.args.some((a) => a.includes("check-public-live-deploy.mjs"))).length === 0,
    "acceptance never runs when the upload did not go live (it would pass against the stale site)")
  ok(state.rollbacks.length === 0, "no rollback: production never moved, so there is nothing to restore")
  ok(state.canonical.id === "previous-deployment", "production is left exactly as it was")

  // H2. Production moved to a deployment that is not this bundle => loud
  // failure, and the lane does not clobber it with a rollback.
  const state2 = makeState("previous-deployment")
  const { fetchImpl: f2 } = makeFakeFetch(state2)
  const { runCommand: r2, calls: rc2 } = makeFakeRun(state2, { promoteForeign: true })
  let threw2 = ""
  await withEnv(async () => {
    try {
      await releasePipeline({ bundleDir: dir, deps: { fetchImpl: f2, runCommand: r2, wranglerBin: fakeWrangler, ...instant }, ...quiet })
    } catch (error) {
      threw2 = error.message
    }
  })
  ok(threw2.includes("PRODUCTION IS NOT THIS RELEASE"), "a foreign production deployment fails loudly")
  ok(threw2.includes("test-source-commit"), "the failure names the commit this bundle was built from")
  ok(rc2.filter((c) => c.args.some((a) => a.includes("check-public-live-deploy.mjs"))).length === 0,
    "acceptance never runs against a foreign release")
  ok(state2.rollbacks.length === 0, "no rollback: the lane refuses to clobber somebody else's deployment")

  // H3. No production deployment at all after upload => loud failure.
  const state3 = makeState("previous-deployment")
  const { fetchImpl: baseFetch3 } = makeFakeFetch(state3)
  const { runCommand: r3 } = makeFakeRun(state3, { promote: false })
  let uploaded3 = false
  const f3 = async (url, init = {}) => {
    if (uploaded3) state3.canonical = null
    return baseFetch3(url, init)
  }
  const r3Tracking = async (command, args) => {
    const result = await r3(command, args)
    if (args[0] === "pages" && args[1] === "deploy") uploaded3 = true
    return result
  }
  let threw3 = ""
  await withEnv(async () => {
    try {
      await releasePipeline({ bundleDir: dir, deps: { fetchImpl: f3, runCommand: r3Tracking, wranglerBin: fakeWrangler, ...instant }, ...quiet })
    } catch (error) {
      threw3 = error.message
    }
  })
  ok(threw3.includes("UPLOAD NOT PROVEN LIVE"), "a vanished production deployment fails loudly")

  // H4. Cloudflare is read-after-write: a promotion visible only on a later
  // poll is a WAIT, not a failure.
  const state4 = makeState("previous-deployment")
  const { fetchImpl: baseFetch4 } = makeFakeFetch(state4)
  const { runCommand: r4 } = makeFakeRun(state4, { promote: false })
  let projectReads = 0
  const f4 = async (url, init = {}) => {
    if ((!init.method || init.method === "GET") && url === projectUrl()) {
      projectReads++
      // capture read = 1; promotion polls start at 2; become visible on 4.
      if (projectReads > 3 && state4.deployments["fresh-deployment"]) state4.canonical = state4.deployments["fresh-deployment"]
    }
    return baseFetch4(url, init)
  }
  let waits = 0
  let resolved4 = false
  await withEnv(async () => {
    await releasePipeline({
      bundleDir: dir,
      deps: {
        fetchImpl: f4,
        runCommand: r4,
        wranglerBin: fakeWrangler,
        promotionDelayMs: 0,
        sleep: async () => {
          waits++
        },
      },
      ...quiet,
    })
    resolved4 = true
  })
  ok(resolved4, "a promotion that only becomes visible on a later poll still succeeds")
  ok(waits >= 1, "the lane waited for the promotion instead of failing on the first read")
  ok(state4.canonical.id === "fresh-deployment", "the freshly uploaded deployment is the one left live")

  // H5. The proven identity is returned for the log line.
  const state5 = makeState("previous-deployment")
  const { fetchImpl: f5 } = makeFakeFetch(state5)
  const { runCommand: r5 } = makeFakeRun(state5)
  await withEnv(async () => {
    await r5("wrangler", ["pages", "deploy", dir, "--project-name", PAGES_PROJECT, "--branch", "main", "--commit-hash", "test-source-commit"])
    const promoted = await verifyProductionPromotion(
      { previous: { deploymentId: "previous-deployment", url: "x", commitHash: "commit-previous-deployment" }, expectedCommit: "test-source-commit" },
      { fetchImpl: f5, ...instant }
    )
    ok(promoted.deploymentId === "fresh-deployment", "verifyProductionPromotion returns the promoted identity")
    ok(promoted.commitHash === "test-source-commit", "the promoted deployment carries this bundle's source commit")
  })

  // H6. A blip on the Cloudflare read is a retry, not a failed release; an
  // unreadable identity all the way to the last attempt is fatal.
  const state6 = makeState("previous-deployment")
  const { fetchImpl: baseFetch6 } = makeFakeFetch(state6)
  const { runCommand: r6 } = makeFakeRun(state6)
  let reads6 = 0
  const f6 = async (url, init = {}) => {
    if ((!init.method || init.method === "GET") && url === projectUrl()) {
      reads6++
      // capture read = 1; the first promotion read (2) blips.
      if (reads6 === 2) return new Response(JSON.stringify({ success: false }), { status: 500 })
    }
    return baseFetch6(url, init)
  }
  let resolved6 = false
  await withEnv(async () => {
    await releasePipeline({ bundleDir: dir, deps: { fetchImpl: f6, runCommand: r6, wranglerBin: fakeWrangler, ...instant }, ...quiet })
    resolved6 = true
  })
  ok(resolved6, "a transient Cloudflare read error is retried, not turned into a failed release")

  const state7 = makeState("previous-deployment")
  const { fetchImpl: baseFetch7 } = makeFakeFetch(state7)
  const { runCommand: r7 } = makeFakeRun(state7)
  let uploaded7 = false
  const f7 = async (url, init = {}) => {
    if (uploaded7 && (!init.method || init.method === "GET") && url === projectUrl()) {
      return new Response(JSON.stringify({ success: false }), { status: 500 })
    }
    return baseFetch7(url, init)
  }
  const r7Tracking = async (command, args) => {
    const result = await r7(command, args)
    if (args[0] === "pages" && args[1] === "deploy") uploaded7 = true
    return result
  }
  let threw7 = ""
  await withEnv(async () => {
    try {
      await releasePipeline({ bundleDir: dir, deps: { fetchImpl: f7, runCommand: r7Tracking, wranglerBin: fakeWrangler, ...instant }, ...quiet })
    } catch (error) {
      threw7 = error.message
    }
  })
  ok(threw7.includes("UPLOAD NOT PROVEN LIVE"), "an identity that stays unreadable fails the release loudly")
}

// ---------------------------------------------------------------------------
console.log("I. source-commit helpers behave")
{
  ok(sameSourceCommit("6c3d83fc062d5870a92b509bdb9636defd8896da", "6c3d83fc062d5870a92b509bdb9636defd8896da"), "identical shas match")
  ok(sameSourceCommit("6c3d83fc062d5870a92b509bdb9636defd8896da", "6C3D83FC062D5870A92B509BDB9636DEFD8896DA"), "sha comparison is case-insensitive")
  ok(sameSourceCommit("6c3d83fc062d5870a92b509bdb9636defd8896da", "6c3d83f"), "a short sha still matches its full sha")
  ok(!sameSourceCommit("6c3d83fc062d5870a92b509bdb9636defd8896da", "161b27f8b1a"), "a different sha does not match")
  ok(!sameSourceCommit("6c3d83f", "6c3d8"), "too-short hashes are never treated as a match")
  ok(!sameSourceCommit("abc123def", null), "a missing hash never matches")

  const { dir } = makeBundle()
  cleanup.push(() => rmSync(dir, { recursive: true, force: true }))
  ok(bundleSourceCommit(dir) === "test-source-commit", "bundleSourceCommit reads the manifest commit")
  writeFileSync(join(dir, "deploy-manifest.json"), JSON.stringify({ source_commit: "unknown" }))
  ok(bundleSourceCommit(dir) === null, "an 'unknown' bundle commit is null, not a literal to compare against")
}

cleanupAll()

console.log(`\n${checks} checks, ${failures} failures`)
process.exit(failures === 0 ? 0 : 1)
