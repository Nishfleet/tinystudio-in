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
  captureProductionIdentity,
  currentProductionIdentity,
  identitiesMatch,
  releasePipeline,
  requireDeployCredentials,
  rollbackTo,
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
// production deployment; acceptance can be scripted to fail.
const makeFakeRun = (state, { acceptanceFail = false, wranglerFail = false } = {}) => {
  const calls = []
  const runCommand = async (command, args) => {
    calls.push({ command, args })
    const isWrangler = args[0] === "pages" && args[1] === "deploy"
    if (isWrangler) {
      if (wranglerFail) throw Object.assign(new Error("wrangler pages deploy exited 1"), { exitCode: 1 })
      const fresh = deployment("fresh-deployment", "fresh-commit")
      state.deployments[fresh.id] = fresh
      state.canonical = fresh
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

cleanupAll()

console.log(`\n${checks} checks, ${failures} failures`)
process.exit(failures === 0 ? 0 : 1)
