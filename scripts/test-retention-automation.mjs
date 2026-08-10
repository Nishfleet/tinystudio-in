#!/usr/bin/env node
import assert from "node:assert/strict"
const {equal: eq, deepEqual: deq, notEqual: neq, ok} = assert
import {spawnSync} from "node:child_process"
import {mkdirSync, mkdtempSync, rmSync, symlinkSync, writeFileSync} from "node:fs"
import {tmpdir} from "node:os"
import {dirname, join} from "node:path"
import {fileURLToPath} from "node:url"
import {RETENTION_AUTOMATION_PROMPT} from "./lib/retention-automation.mjs"

const script = join(dirname(fileURLToPath(import.meta.url)), "check-retention-automation.mjs")
const fixtureRoot = mkdtempSync(join(tmpdir(), "tinystudio-retention-gate-"))
const serviceRoot = join(fixtureRoot, "service-root")
const codexHome = join(fixtureRoot, "codex-home")
const automationPath = join(codexHome, "automations", "tinystudio-retention-checkups", "automation.toml")
const canonicalWorkspace = join(fixtureRoot, "canonical-workspace")
const symlinkWorkspace = join(fixtureRoot, "workspace-link")
const plainWorkspace = join(fixtureRoot, "plain-workspace")
const divergentWorkspace = join(fixtureRoot, "divergent-workspace")
const missingWorkspace = join(fixtureRoot, "missing-workspace")
const remoteMain = join(fixtureRoot, "remote-main.git")
mkdirSync(canonicalWorkspace, {recursive: true})
symlinkSync(canonicalWorkspace, symlinkWorkspace, "dir")
mkdirSync(plainWorkspace, {recursive: true})
mkdirSync(divergentWorkspace, {recursive: true})

const STATE_DIRS = ["clients", "prospects", "service-decisions", "runs/service-engine"]

const gitEnv = {
	...process.env,
	GIT_AUTHOR_NAME: "retention fixture",
	GIT_AUTHOR_EMAIL: "fixture@example.com",
	GIT_COMMITTER_NAME: "retention fixture",
	GIT_COMMITTER_EMAIL: "fixture@example.com"
}
function git(args, cwd) {
	return spawnSync("git", args, {cwd, encoding: "utf8", env: gitEnv})
}
function commit(cwd, fileName, content) {
	writeFileSync(join(cwd, fileName), content)
	assert(git(["add", fileName], cwd).status === 0, "git add failed")
	assert(git(["commit", "-q", "-m", `fixture: ${fileName}`], cwd).status === 0, "git commit failed")
	return git(["rev-parse", "HEAD"], cwd).stdout.trim()
}

assert(git(["init", "-q", "--bare", remoteMain], fixtureRoot).status === 0, "bare remote init failed")
assert(git(["init", "-q", "-b", "main", canonicalWorkspace], fixtureRoot).status === 0, "canonical workspace init failed")
assert(git(["remote", "add", "origin", remoteMain], canonicalWorkspace).status === 0, "origin add failed")
commit(canonicalWorkspace, "README.md", "aligned fixture\n")
assert(git(["push", "-q", "-u", "origin", "main"], canonicalWorkspace).status === 0, "initial push failed")

function seedState(rootDir) {
	for (const root of STATE_DIRS) mkdirSync(join(rootDir, ...root.split("/")), {recursive: true})
	mkdirSync(join(rootDir, "clients", "fixture-client"), {recursive: true})
	mkdirSync(join(rootDir, "prospects", "fixture-prospect"), {recursive: true})
	writeFileSync(join(rootDir, "service-decisions", "fixture-decision.json"), "{}\n")
	mkdirSync(join(rootDir, "runs", "service-engine", "fixture-run"), {recursive: true})
}
function clearState(rootDir) {
	for (const root of STATE_DIRS) rmSync(join(rootDir, ...root.split("/")), {recursive: true, force: true})
}

function writeAutomation(prompt, workspace = canonicalWorkspace) {
	mkdirSync(dirname(automationPath), {recursive: true})
	writeFileSync(automationPath, `id = "tinystudio-retention-checkups"\nkind = "cron"\nname = "TinyStudio retention checkups"\nprompt = "${prompt}"\nstatus = "ACTIVE"\nrrule = "FREQ=WEEKLY;BYDAY=FR;BYHOUR=9;BYMINUTE=0"\nworkspaces = ["${workspace}"]\n`)
}

function run(github = "false", env = {}) {
	return spawnSync(process.execPath, [script], {cwd: fixtureRoot, env: {...process.env, CODEX_HOME: codexHome, GITHUB_ACTIONS: github, SERVICE_REPO_ROOT: serviceRoot, TINYSTUDIO_AUTOMATION_WORKSPACE: canonicalWorkspace, ...env}, encoding: "utf8"})
}
function report(result) {
	assert(result.status !== null, `checker crashed: ${result.stderr}`)
	return JSON.parse(result.stdout)
}

try {
	// Existing no-automation semantics stay intact.
	let result = run()
	eq(result.status, 0)
	eq(report(result).clientCount, 0)

	result = run("true")
	eq(result.status, 0)
	eq(report(result).status, "warn")

	seedState(serviceRoot)
	seedState(canonicalWorkspace)
	result = run()
	neq(result.status, 0)
	const missingReport = report(result)
	eq(missingReport.clientCount, 1)
	deq(missingReport.failures, ["Automation file is missing"])
	result = run("true")
	neq(result.status, 0)

	// Prompt and workspace gates stay intact; preflight verdicts are additive.
	writeAutomation("Run the retention automation check with the weekly client value loop, retention checkups, internal dashboard, value stress, and monthly review. Do not send client messages or approve claims automatically.")
	result = run()
	neq(result.status, 0)
	ok(report(result).failures.some(failure => failure.includes("retired service concept")))

	writeAutomation(RETENTION_AUTOMATION_PROMPT, missingWorkspace)
	result = run()
	neq(result.status, 0)
	ok(report(result).failures.some(failure => failure.includes("Automation workspace root is not resolvable")))

	writeAutomation(RETENTION_AUTOMATION_PROMPT, divergentWorkspace)
	result = run()
	neq(result.status, 0)
	ok(report(result).failures.includes("Automation does not point at the TinyStudio repo"))

	// Source freshness: local HEAD ahead of remote main fails.
	commit(canonicalWorkspace, "unpushed.md", "not on remote\n")
	result = run()
	neq(result.status, 0)
	const staleReport = report(result)
	eq(staleReport.preflight.status, "fail")
	eq(staleReport.preflight.sourceFreshness.status, "fail")
	ok(staleReport.preflight.sourceFreshness.head !== staleReport.preflight.sourceFreshness.remoteMain)
	ok(staleReport.failures.some(failure => failure.includes("not current remote main")))

	// Source freshness: inability to prove fails closed.
	writeAutomation(RETENTION_AUTOMATION_PROMPT, plainWorkspace)
	result = run("false", {TINYSTUDIO_AUTOMATION_WORKSPACE: plainWorkspace})
	neq(result.status, 0)
	const plainReport = report(result)
	eq(plainReport.preflight.sourceFreshness.status, "fail")
	ok(plainReport.failures.some(failure => failure.includes("Unable to prove current remote main")))

	// State access: missing roots fail.
	writeAutomation(RETENTION_AUTOMATION_PROMPT)
	rmSync(join(canonicalWorkspace, "service-decisions"), {recursive: true, force: true})
	result = run()
	neq(result.status, 0)
	const missingRootReport = report(result)
	eq(missingRootReport.preflight.stateAccess.status, "fail")
	ok(missingRootReport.failures.some(failure => failure.includes("State root not accessible: service-decisions")))

	// State access: an inaccessible (file instead of directory) root fails.
	writeFileSync(join(canonicalWorkspace, "service-decisions"), "{}\n")
	result = run()
	neq(result.status, 0)
	ok(report(result).failures.some(failure => failure.includes("State root not accessible: service-decisions")))
	rmSync(join(canonicalWorkspace, "service-decisions"))
	mkdirSync(join(canonicalWorkspace, "service-decisions"), {recursive: true})
	writeFileSync(join(canonicalWorkspace, "service-decisions", "fixture-decision.json"), "{}\n")

	// Aggregate parity: drift between the two roots fails.
	mkdirSync(join(canonicalWorkspace, "clients", "drift-client"), {recursive: true})
	result = run()
	neq(result.status, 0)
	const driftReport = report(result)
	eq(driftReport.preflight.aggregateParity.status, "fail")
	ok(driftReport.failures.some(failure => failure.includes("Aggregate parity mismatch: clients")))
	rmSync(join(canonicalWorkspace, "clients", "drift-client"), {recursive: true, force: true})

	// Aligned state passes every verdict.
	assert(git(["push", "-q", "origin", "main"], canonicalWorkspace).status === 0, "final push failed")
	result = run()
	eq(result.status, 0)
	const alignedReport = report(result)
	eq(alignedReport.status, "pass")
	deq(alignedReport.failures, [])
	eq(alignedReport.preflight.status, "pass")
	eq(alignedReport.preflight.sourceFreshness.status, "pass")
	eq(alignedReport.preflight.stateAccess.status, "pass")
	eq(alignedReport.preflight.aggregateParity.status, "pass")
	deq(alignedReport.preflight.aggregateParity.counts, {
		"clients": {canonical: 1, service: 1},
		"prospects": {canonical: 1, service: 1},
		"service-decisions": {canonical: 1, service: 1},
		"runs/service-engine": {canonical: 1, service: 1}
	})

	// A symlinked automation workspace resolves to the canonical runtime root.
	writeAutomation(RETENTION_AUTOMATION_PROMPT, symlinkWorkspace)
	result = run()
	eq(result.status, 0)
	eq(report(result).status, "pass")

	// No shared private state yet: preflight is deferred, not failed.
	clearState(serviceRoot)
	result = run()
	eq(result.status, 0)
	const deferredReport = report(result)
	eq(deferredReport.preflight.status, "deferred")
	ok(deferredReport.warnings.some(warning => warning.includes("Retention preflight deferred")))

	console.log("Retention automation readiness checks passed.")
} finally {
	rmSync(fixtureRoot, {recursive: true, force: true})
}
