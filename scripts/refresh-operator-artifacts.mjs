#!/usr/bin/env node
import {existsSync, mkdirSync, cpSync, rmSync} from "node:fs"
import {execFileSync} from "node:child_process"
import {mkdtempSync, tmpdir} from "node:os"
import {dirname, join} from "node:path"
import {handleHelp, refuseUnknownArgs} from "./lib/operator-cli.mjs"
import {ACTIVE_OPERATOR_ARTIFACTS} from "./lib/service-contract.mjs"
import {serviceRoot} from "./lib/runtime-roots.mjs"
import {listOutboundProspectFolders} from "./lib/outbound-prospects.mjs"
import {localIsoDate} from "./date-utils.mjs"
import {OPS_REFRESH_ENV} from "./lib/ops-lockstep.mjs"

const usage = `Usage: node scripts/refresh-operator-artifacts.mjs`
handleHelp(process.argv.slice(2), usage)
refuseUnknownArgs(process.argv.slice(2), [], usage)

const prospectRoot = join(serviceRoot, "prospects")
const hasProspectPipelineState = existsSync(prospectRoot)
  && listOutboundProspectFolders(prospectRoot).some((path) => existsSync(join(path, "pipeline.json")))
if (!hasProspectPipelineState) {
  console.error(`Refusing to refresh ACTIVE_OPERATOR_ARTIFACTS: no outbound prospect pipeline state found at ${prospectRoot}. ops:refresh is all-or-nothing and cannot stamp growth-brain/ops/live-metrics.md or growth-brain/ops/11-10-proof-run.md without pipeline state. Run from the service root that holds prospects/, or set SERVICE_REPO_ROOT to it.`)
  process.exit(1)
}

process.env[OPS_REFRESH_ENV] = "1"

const backupRoot = mkdtempSync(join(tmpdir(), "tinystudio-ops-refresh-"))
const backedUp = []
for (const rel of ACTIVE_OPERATOR_ARTIFACTS) {
  const src = join(serviceRoot, rel)
  if (!existsSync(src)) continue
  const dest = join(backupRoot, rel)
  mkdirSync(dirname(dest), {recursive: true})
  cpSync(src, dest)
  backedUp.push(rel)
}

const refreshScripts = [
  "scripts/export-growth-metrics.mjs",
  "scripts/export-market-proof-run.mjs",
  "scripts/export-proof-library.mjs",
  "scripts/export-sender-setup-guide.mjs",
  "scripts/export-market-benchmark.mjs",
  "scripts/check-market-parity-readiness.mjs"
]

try {
  for (const script of refreshScripts) {
    execFileSync(process.execPath, [join(serviceRoot, script)], {
      cwd: serviceRoot,
      encoding: "utf8",
      stdio: ["ignore", "pipe", "pipe"],
      env: process.env
    })
  }
} catch (error) {
  for (const rel of backedUp) {
    cpSync(join(backupRoot, rel), join(serviceRoot, rel))
  }
  rmSync(backupRoot, {recursive: true, force: true})
  console.error(error.stderr || error.message)
  process.exit(1)
}

rmSync(backupRoot, {recursive: true, force: true})
console.log(JSON.stringify({
  status: "refreshed",
  date: localIsoDate(),
  paths: [...ACTIVE_OPERATOR_ARTIFACTS]
}, null, 2))
