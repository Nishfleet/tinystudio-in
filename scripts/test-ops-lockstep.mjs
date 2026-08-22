#!/usr/bin/env node
import assert from "node:assert/strict"
import {spawnSync} from "node:child_process"
import {cpSync, existsSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync} from "node:fs"
import {tmpdir} from "node:os"
import {dirname, join} from "node:path"
import {fileURLToPath, pathToFileURL} from "node:url"
import {ACTIVE_OPERATOR_ARTIFACTS} from "./lib/service-contract.mjs"
import {generatedStamp} from "./lib/ops-lockstep.mjs"

const {equal: eq, deepEqual: deq, notEqual: neq, match: mat, ok} = assert
const C = dirname(dirname(fileURLToPath(import.meta.url)))
const T = mkdtempSync(join(tmpdir(), "tinystudio-ops-lockstep-"))

function writeJson(path, value) {
  mkdirSync(dirname(path), {recursive: true})
  writeFileSync(path, `${JSON.stringify(value, null, 2)}\n`)
}

function run(args, extraEnv) {
  return spawnSync(process.execPath, args, {
    cwd: T,
    encoding: "utf8",
    env: {
      ...process.env,
      ...extraEnv,
      SERVICE_REPO_ROOT: T,
      TZ: "Asia/Kolkata",
      NODE_OPTIONS: [process.env.NODE_OPTIONS, `--import=${pathToFileURL(join(T, "scripts/lib/test-fixed-clock.mjs")).href}`].filter(Boolean).join(" ")
    }
  })
}

function parseJsonObject(text) {
  const start = String(text || "").indexOf("{")
  if (start < 0) throw new Error(`expected JSON object, got: ${text}`)
  return JSON.parse(String(text).slice(start))
}

try {
  for (const directory of ["scripts", "growth-brain", "contracts", "docs"]) {
    cpSync(join(C, directory), join(T, directory), {recursive: true})
  }
  for (const file of ["TASKS.md", "PRODUCT.md", "AGENT_WORKFLOW.md", "MEMORY.md", "README.md", "package.json"]) {
    cpSync(join(C, file), join(T, file))
  }
  mkdirSync(join(T, "prospects"), {recursive: true})
  mkdirSync(join(T, "clients"), {recursive: true})

  writeJson(join(T, "prospects/lockstep-fixture/metadata.json"), {name: "Lockstep Fixture", slug: "lockstep-fixture", website: "https://example.com/lockstep", vertical: "managed-it-cybersecurity", contact: "Founder"})
  writeJson(join(T, "prospects/lockstep-fixture/pipeline.json"), {stage: "new", createdAt: "2026-08-01", sentAt: "", sentChannel: "", lastChannel: "", lastTouchAt: "", nextFollowUpAt: "", followUps: [], touches: [], notes: []})

  // A. --help
  const help = run(["scripts/refresh-operator-artifacts.mjs", "--help"], {SERVICE_TEST_NOW: "2026-08-06T12:00:00.000+05:30"})
  eq(help.status, 0, help.stderr || help.stdout)
  mat(help.stdout, /Usage:/)
  eq(readFileSync(join(T, "growth-brain/ops/proof-library.md"), "utf8"), readFileSync(join(C, "growth-brain/ops/proof-library.md"), "utf8"))

  for (const path of ACTIVE_OPERATOR_ARTIFACTS) {
    const full = join(T, path)
    if (!existsSync(full)) continue
    writeFileSync(full, readFileSync(full, "utf8").replace(/\bGenerated:?\s*\d{4}-\d{2}-\d{2}/g, (match) => match.replace(/\d{4}-\d{2}-\d{2}/, "2026-08-06")))
  }

  // B. Partial real-clock write refuses
  const before = readFileSync(join(T, "growth-brain/ops/live-metrics.md"))
  const partial = run(["scripts/export-growth-metrics.mjs"], {SERVICE_TEST_NOW: "2026-12-31T12:00:00.000+05:30"})
  neq(partial.status, 0, partial.stderr || partial.stdout)
  const combined = `${partial.stdout || ""}${partial.stderr || ""}`
  mat(combined, /Refusing to regenerate growth-brain\/ops\/live-metrics\.md/)
  mat(combined, /npm run ops:refresh/)
  deq(readFileSync(join(T, "growth-brain/ops/live-metrics.md")), before)

  // C. Private output is unrestricted
  const privateOut = run(["scripts/export-growth-metrics.mjs", "--output=runs/probe-metrics.md"], {SERVICE_TEST_NOW: "2026-12-31T12:00:00.000+05:30"})
  eq(privateOut.status, 0, privateOut.stderr || privateOut.stdout)
  ok(existsSync(join(T, "runs/probe-metrics.md")))
  eq(generatedStamp(readFileSync(join(T, "runs/probe-metrics.md"), "utf8")), "2026-12-31")
  deq(readFileSync(join(T, "growth-brain/ops/live-metrics.md")), before)

  // D. Same-date tracked write is allowed
  const sameDate = run(["scripts/export-proof-library.mjs"], {SERVICE_TEST_NOW: "2026-08-06T12:00:00.000+05:30"})
  eq(sameDate.status, 0, sameDate.stderr || sameDate.stdout)
  eq(generatedStamp(readFileSync(join(T, "growth-brain/ops/proof-library.md"), "utf8")), "2026-08-06")

  // E. Lockstep refresh stamps every artifact
  const refreshed = run(["scripts/refresh-operator-artifacts.mjs"], {SERVICE_TEST_NOW: "2026-12-31T12:00:00.000+05:30"})
  eq(refreshed.status, 0, refreshed.stderr || refreshed.stdout)
  const payload = parseJsonObject(refreshed.stdout)
  eq(payload.status, "refreshed")
  eq(payload.date, "2026-12-31")
  for (const path of ACTIVE_OPERATOR_ARTIFACTS) {
    ok(existsSync(join(T, path)), `missing refreshed artifact ${path}`)
    eq(generatedStamp(readFileSync(join(T, path), "utf8")), "2026-12-31", `stamp mismatch for ${path}`)
  }

  // F. Preflight without pipeline
  const T2 = mkdtempSync(join(tmpdir(), "tinystudio-ops-lockstep-"))
  try {
    for (const directory of ["scripts", "growth-brain", "contracts", "docs"]) {
      cpSync(join(C, directory), join(T2, directory), {recursive: true})
    }
    for (const file of ["TASKS.md", "PRODUCT.md", "AGENT_WORKFLOW.md", "MEMORY.md", "README.md", "package.json"]) {
      cpSync(join(C, file), join(T2, file))
    }
    mkdirSync(join(T2, "prospects"), {recursive: true})
    const noPipeline = spawnSync(process.execPath, ["scripts/refresh-operator-artifacts.mjs"], {
      cwd: T2,
      encoding: "utf8",
      env: {
        ...process.env,
        SERVICE_TEST_NOW: "2026-08-06T12:00:00.000+05:30",
        SERVICE_REPO_ROOT: T2,
        TZ: "Asia/Kolkata",
        NODE_OPTIONS: [process.env.NODE_OPTIONS, `--import=${pathToFileURL(join(T2, "scripts/lib/test-fixed-clock.mjs")).href}`].filter(Boolean).join(" ")
      }
    })
    neq(noPipeline.status, 0, noPipeline.stderr || noPipeline.stdout)
    mat(noPipeline.stderr, /Refusing to refresh ACTIVE_OPERATOR_ARTIFACTS/)
    eq(generatedStamp(readFileSync(join(T2, "growth-brain/ops/proof-library.md"), "utf8")), "2026-08-06")
  } finally {
    rmSync(T2, {recursive: true, force: true})
  }

  console.log("Ops lockstep checks passed.")
} finally {
  rmSync(T, {recursive: true, force: true})
}
