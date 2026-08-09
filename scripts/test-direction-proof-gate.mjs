#!/usr/bin/env node
import assert from "node:assert/strict"
import { spawnSync } from "node:child_process"
import { cpSync, existsSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs"
import { tmpdir } from "node:os"
import { dirname, join } from "node:path"
import { fileURLToPath, pathToFileURL } from "node:url"

const C = dirname(dirname(fileURLToPath(import.meta.url)))
const T = mkdtempSync(join(tmpdir(), "tinystudio-direction-proof-gate-"))
const { equal: eq, deepEqual: deq, match: mat, ok } = assert
const trackedArtifactDate = readFileSync(join(C, "growth-brain/ops/proof-library.md"), "utf8").match(/^Generated:\s*(\d{4}-\d{2}-\d{2})$/m)?.[1]
if (!trackedArtifactDate) throw new Error("Tracked proof library must contain a Generated YYYY-MM-DD date")
const fixedClockImport = pathToFileURL(join(T, "scripts/lib/test-fixed-clock.mjs")).href
const LOOM = {
  alpha: "https://www.loom.com/share/aaaa1111aaaa1111aaaa1111",
  gamma: "https://www.loom.com/share/cccc1111cccc1111cccc1111",
  delta: "https://www.loom.com/share/dddd1111dddd1111dddd1111",
  epsilon: "https://www.loom.com/share/eeee1111eeee1111eeee1111"
}

function fixedEnv() {
  return {...process.env, NODE_OPTIONS: [process.env.NODE_OPTIONS, `--import=${fixedClockImport}`].filter(Boolean).join(" "), SERVICE_REPO_ROOT: T, SERVICE_TEST_NOW: `${trackedArtifactDate}T12:00:00.000+05:30`, TZ: "Asia/Kolkata"}
}

function run(args, cwd = T) {
  return spawnSync(process.execPath, args, {cwd, encoding: "utf8", env: fixedEnv()})
}

function writeJson(path, value) {
  mkdirSync(dirname(path), {recursive: true})
  writeFileSync(path, `${JSON.stringify(value, null, 2)}\n`)
}

function writeProspect(slug, {score = true, stage = "new", sentAt = "", sentChannel = "", lastChannel = "", touches = [], notes = [], buyerRoom = false}) {
  const dir = join(T, "prospects", slug)
  writeJson(join(dir, "metadata.json"), {name: slug, slug, website: `https://example.com/${slug}`, vertical: "managed-it-cybersecurity", contact: "Founder"})
  writeJson(join(dir, "pipeline.json"), {stage, createdAt: "2026-08-01", sentAt, sentChannel, lastChannel, lastTouchAt: sentAt || "2026-08-01", nextFollowUpAt: "", followUps: [], touches, notes})
  if (score) writeFileSync(join(dir, "lead-score.md"), "- Score: 14/16\n- Priority: record\n")
  if (buyerRoom) writeFileSync(join(dir, "buyer-room.md"), `- Link: ${LOOM[slug]}\n`)
}

try {
  for (const directory of ["scripts", "growth-brain", "contracts", "docs"]) {
    cpSync(join(C, directory), join(T, directory), {recursive: true})
  }
  for (const file of ["TASKS.md", "PRODUCT.md", "AGENT_WORKFLOW.md", "MEMORY.md", "README.md", "package.json"]) {
    cpSync(join(C, file), join(T, file))
  }
  mkdirSync(join(T, "prospects"), {recursive: true})

  writeProspect("alpha", {
    stage: "sent", sentAt: "2026-08-03", sentChannel: "linkedin", lastChannel: "linkedin",
    touches: [
      {date: "2026-08-03", action: "sent", channel: "linkedin", note: `sent Loom ${LOOM.alpha}`},
      {date: "2026-08-04", action: "followup-1", channel: "", note: ""}
    ],
    notes: [{date: "2026-08-03", action: "sent", note: `sent Loom ${LOOM.alpha}`}],
    buyerRoom: true
  })
  writeProspect("beta", {
    stage: "new",
    touches: [{date: "2026-08-02", action: "followup-1", channel: "dm", note: "followup sent"}],
    notes: []
  })
  writeProspect("gamma", {stage: "new", buyerRoom: true})
  writeProspect("delta", {
    score: false, stage: "new",
    touches: [{date: "2026-08-02", action: "sent", channel: "email", note: `sent Loom ${LOOM.delta}`}],
    buyerRoom: true
  })
  writeProspect("epsilon", {
    stage: "sent", sentAt: "2026-08-03", sentChannel: "contact-form", lastChannel: "contact-form",
    touches: [], notes: [{date: "2026-08-03", action: "sent", note: "sent but no Loom reference"}],
    buyerRoom: true
  })

  const sheetPath = join(T, "prospects/loom-links.txt")
  const sheet = [
    `prospects/alpha|${LOOM.alpha}|approved|fault alpha|impact alpha|fix alpha|ask alpha`,
    "prospects/beta|LOOM_URL|approved|fault beta|impact beta|fix beta|ask beta",
    `prospects/gamma|${LOOM.gamma}|approved|fault gamma|impact gamma|fix gamma|ask gamma`,
    `prospects/delta|${LOOM.delta}|draft|fault delta|impact delta|fix delta|ask delta`,
    `prospects/epsilon|${LOOM.epsilon}|approved|fault epsilon|impact epsilon|fix epsilon|ask epsilon`
  ].join("\n")
  writeFileSync(sheetPath, sheet)

  const generated = run(["scripts/export-market-proof-run.mjs", "--skip-kit", "--output=runs/direction-proof-gate.md"])
  eq(generated.status, 0, generated.stderr || generated.stdout)
  const result = JSON.parse(generated.stdout)

  eq(result.directionGate.approvedLooms, 4, "draft row must never count as approved")
  eq(result.directionGate.recordedLooms, 3, "raw LOOM_URL placeholder must not count as recorded")
  eq(result.directionGate.sentLooms, 1, "sent proof requires sentAt plus a sent touch/note naming the exact Loom URL")
  eq(result.directionGate.qualifiedTouches, 2, "bare touch records and unqualified prospects must not count as qualified touches")
  eq(result.directionGate.qualifiedProspectsWithTouches, 2)
  eq(result.directionGate.pendingRecording, 1)
  eq(result.directionGate.recordedWithoutSentProof, 2)

  const markdown = readFileSync(join(T, "runs/direction-proof-gate.md"), "utf8")
  mat(markdown, /\| Approved Looms \| 4\/5 \|/)
  mat(markdown, /\| Recorded Looms \| 3\/5 \|/)
  mat(markdown, /\| Sent Looms \| 1\/5 \|/)
  mat(markdown, /\| Qualified touches \| 2\/40 \|/)
  mat(markdown, /Pending: 1 approved row/)
  mat(markdown, /Unknown: 2 recorded Loom/)
  mat(markdown, /Missing: 38 qualified touch/)
  mat(markdown, /loom-links\.txt/)
  mat(markdown, /never count/)
  for (const sentinel of ["alpha", "beta", "gamma", "delta", "epsilon", LOOM.alpha, LOOM.gamma, LOOM.epsilon]) {
    eq(markdown.includes(sentinel), false, `generated surface leaks private fixture state: ${sentinel}`)
  }

  const sheetAfter = readFileSync(sheetPath, "utf8")
  const regenerated = run(["scripts/export-market-proof-run.mjs", "--skip-kit", "--output=runs/direction-proof-gate.md"])
  eq(regenerated.status, 0, regenerated.stderr || regenerated.stdout)
  eq(JSON.parse(regenerated.stdout).directionGate.approvedLooms, 4)
  eq(readFileSync(sheetPath, "utf8"), sheetAfter, "second generation must not mutate the loom-links sheet")
  const markdownAgain = readFileSync(join(T, "runs/direction-proof-gate.md"), "utf8")
  deq(markdownAgain.split("## Direction Proof Gate").at(-1), markdown.split("## Direction Proof Gate").at(-1), "gate section must be deterministic across runs")

  rmSync(join(T, "prospects"), {recursive: true, force: true})
  const emptyRun = run(["scripts/export-market-proof-run.mjs", "--skip-kit", "--output=runs/empty-proof-gate.md", "--loom-links=runs/empty-loom-links.txt"])
  eq(emptyRun.status, 0, emptyRun.stderr || emptyRun.stdout)
  deq(JSON.parse(emptyRun.stdout).directionGate, {
    approvedLooms: 0, recordedLooms: 0, sentLooms: 0,
    qualifiedTouches: 0, qualifiedProspectsWithTouches: 0,
    pendingRecording: 0, recordedWithoutSentProof: 0
  }, "empty repo state must surface 0/5 and 0/40 with no inferred progress")
  ok(existsSync(join(T, "runs/empty-loom-links.txt")), "generator must still write the empty sheet")
  const noProspectsRun = run(["scripts/export-market-proof-run.mjs", "--skip-kit", "--output=runs/no-prospects-proof-gate.md"])
  eq(noProspectsRun.status, 0, noProspectsRun.stderr || noProspectsRun.stdout)
  deq(JSON.parse(noProspectsRun.stdout).directionGate.qualifiedTouches, 0, "no prospects means no qualified touches")
  mat(readFileSync(join(T, "runs/no-prospects-proof-gate.md"), "utf8"), /\| Qualified touches \| 0\/40 \|/)

  rmSync(join(T, "prospects"), {recursive: true, force: true})
  const trackedBriefPath = join(T, "growth-brain/ops/11-10-proof-run.md")
  const trackedBriefBefore = readFileSync(trackedBriefPath, "utf8")
  const refusedRun = run(["scripts/export-market-proof-run.mjs", "--skip-kit"])
  ok(refusedRun.status !== 0, "regenerating the tracked brief without prospect state must refuse instead of silently reporting a zero pipeline")
  mat(refusedRun.stderr, /Refusing to regenerate the tracked 11\/10 proof-run brief with a zero pipeline/)
  eq(readFileSync(trackedBriefPath, "utf8"), trackedBriefBefore, "refused regeneration must leave the tracked brief untouched")
  eq(existsSync(join(T, "prospects")), false, "refused regeneration must not create a prospect root or loom sheet")

  const anchoredCwd = join(T, "runner-cwd")
  mkdirSync(anchoredCwd, { recursive: true })
  const anchoredRun = run([join(C, "scripts/export-market-proof-run.mjs"), "--skip-kit", "--output=runs/rooted-proof-gate.md"], anchoredCwd)
  eq(anchoredRun.status, 0, anchoredRun.stderr || anchoredRun.stdout)
  ok(existsSync(join(T, "runs/rooted-proof-gate.md")), "anchored generation must write into the service root")
  eq(existsSync(join(anchoredCwd, "runs/rooted-proof-gate.md")), false, "anchored generation must not write into the invocation directory")
  console.log("Direction proof gate checks passed.")
} finally {
  rmSync(T, {recursive: true, force: true})
}
