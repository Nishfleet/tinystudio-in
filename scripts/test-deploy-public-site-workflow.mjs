// Regression for the tinystudio.in deploy lane fail-closed contract
// (sol-sweep finding: tinystudio-in-dormant-deploy-reports-green-while-live-is-stale).
//
// The release lane must NEVER produce a green run while the required Pages
// wiring is missing. The old workflow ran a "dormant" notice step that
// printed provisioning steps and exited 0 when CLOUDFLARE_API_TOKEN /
// CLOUDFLARE_ACCOUNT_ID were absent, so every main merge reported a green
// deploy while production stayed stale.
//
// This test asserts the fail-closed contract structurally, on the workflow
// file alone - hermetic, no network, no real workflow execution:
//   1. No "dormant" step exists (a skipped publish must not exit 0).
//   2. A fail-loud step exists: gated on missing secrets and its run exits 1.
//   3. Every deploy/verify step is gated on BOTH secrets being present.
//   4. The deploy path actually runs the live acceptance script
//      (check-public-live-deploy.mjs) so green requires verified live state.
//
// RED on the pre-change workflow (dormant step present, no exit-1 step),
// GREEN on the changed workflow.
import { readFileSync } from "node:fs"
import { join, dirname } from "node:path"
import { fileURLToPath } from "node:url"

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..")
const WORKFLOW = process.env.WORKFLOW_PATH || join(ROOT, ".github", "workflows", "deploy-public-site.yml")

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

// Extract the steps of the single `publish` job as a list of blocks, each
// block = { name, uses, if, run }. The workflow has a flat two-level
// structure (`jobs.publish.steps`), so a line-based scan at step indent is
// deterministic for this file.
const parseSteps = (text) => {
  const lines = text.split("\n")
  const steps = []
  let current = null
  let inSteps = false
  for (const line of lines) {
    // Only the `publish` job's `steps:` block contains deploy steps; the
    // `on:` block also has `- main` entries that are not steps.
    if (/^ {4}steps:$/.test(line)) {
      inSteps = true
      continue
    }
    if (!inSteps) continue
    const m = line.match(/^( {6}- )(.*)$/)
    if (m) {
      if (current) steps.push(current)
      current = {}
      const rest = m[2]
      const name = rest.match(/^name: (.*)$/)
      if (name) current.name = name[1]
      const uses = rest.match(/^uses: (.*)$/)
      if (uses) current.uses = uses[1]
      const runInline = rest.match(/^run: (.*)$/)
      if (runInline) current.run = [runInline[1]]
      continue
    }
    if (!current) continue
    const name = line.match(/^ {8}name: (.*)$/)
    if (name) current.name = name[1]
    const uses = line.match(/^ {8}uses: (.*)$/)
    if (uses) current.uses = uses[1]
    const cond = line.match(/^ {8}if: (.*)$/)
    if (cond) current.if = cond[1]
    const runBlock = line.match(/^ {8}run: \|$/)
    const runInline = line.match(/^ {8}run: (.*)$/)
    if (runBlock) current.run = []
    else if (runInline && !current.run) current.run = [runInline[1]]
    else if (current.run && line.startsWith("          ")) current.run.push(line.trim())
  }
  if (current) steps.push(current)
  return steps.map((s) => ({ ...s, run: (s.run || []).join("\n") }))
}

const GATE = "env.CLOUDFLARE_API_TOKEN != '' && env.CLOUDFLARE_ACCOUNT_ID != ''"
const MISSING = "env.CLOUDFLARE_API_TOKEN == '' || env.CLOUDFLARE_ACCOUNT_ID == ''"

console.log("test-deploy-public-site-workflow: release lane must fail closed on missing Pages wiring")

const text = readFileSync(WORKFLOW, "utf8")
const steps = parseSteps(text)
console.log(`  parsed ${steps.length} steps from ${WORKFLOW.replace(ROOT, "")}`)

// 1. No dormant / green-on-missing-secrets step.
const dormant = steps.filter((s) => /dormant/i.test(s.name || ""))
ok(dormant.length === 0, "no 'dormant' step exists (skipped publish must not exit green)")
ok(!/::warning title=Release lane dormant/.test(text), "no dormant warning annotation remains")

// 2. A fail-loud step exists: gated on missing secrets, run exits 1.
const failLoud = steps.filter((s) => /fail loudly/i.test(s.name || "") && (s.if || "").includes(MISSING))
ok(failLoud.length >= 1, "a step named '*fail loudly*' gated on missing secrets exists")
ok(failLoud.every((s) => /exit 1/.test(s.run)), "the fail-loud step's run exits 1")

// 3. Every step that touches the deploy pipeline is gated on BOTH secrets.
const deploySteps = steps.filter((s) => {
  const blob = `${s.name || ""} ${s.uses || ""} ${s.run}`
  return /setup-node|npm ci|Pre-deploy repository gate|Prepare the filtered deploy bundle|Publish to Cloudflare Pages/.test(blob)
})
ok(deploySteps.length >= 5, `all deploy-pipeline steps present (found ${deploySteps.length})`)
ok(deploySteps.every((s) => (s.if || "").includes(GATE)), "every deploy-pipeline step is gated on both secrets")

// 4. The deploy path runs the live acceptance script (green requires verified live state).
const publish = steps.find((s) => /Publish to Cloudflare Pages/.test(s.name || ""))
ok(!!publish, "publish-and-verify step exists")
ok(!!publish && /publish-public-site\.mjs --deploy/.test(publish.run), "deploy runs publish-public-site.mjs --deploy")
ok(/check-public-live-deploy\.mjs/.test(readFileSync(join(ROOT, "scripts", "publish-public-site.mjs"), "utf8")), "publish script runs check-public-live-deploy.mjs after upload")
ok(/verifyLive/.test(readFileSync(join(ROOT, "scripts", "publish-public-site.mjs"), "utf8")), "publish script verifies the live site after deploy (verifyLive)")

console.log(`\n${checks} checks, ${failures} failures`)
process.exit(failures === 0 ? 0 : 1)