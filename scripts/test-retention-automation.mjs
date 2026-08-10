#!/usr/bin/env node
import assert from "node:assert/strict"
const {equal: eq, deepEqual: deq, notEqual: neq} = assert
import {spawnSync} from "node:child_process"
import {cpSync, existsSync, mkdirSync, mkdtempSync, rmSync, symlinkSync, writeFileSync} from "node:fs"
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
const canonicalRuntime = join(fixtureRoot, "canonical-runtime")
const originRepo = join(fixtureRoot, "origin-repo")
const symlinkWorkspace = join(fixtureRoot, "workspace-link")
const STATE_ROOTS = ["clients", "prospects", "service-decisions", "runs/service-engine"]

function git(cwd, args) {
	const result = spawnSync("git", args, {cwd, encoding: "utf8"})
	if (result.status !== 0) throw new Error(`git ${args.join(" ")} failed: ${result.stderr}`)
	return result
}

// A local origin with one main commit, plus a hermetic clone of it as the
// automation's configured checkout. No network is involved: origin/main moves
// only when this test commits to the origin fixture.
const initialOriginSha = (() => {
	git(fixtureRoot, ["init", "-b", "main", "-q", originRepo])
	git(originRepo, ["config", "user.email", "retention-gate-test@local"])
	git(originRepo, ["config", "user.name", "Retention Gate Test"])
	writeFileSync(join(originRepo, "readme.md"), "fixture origin\n")
	git(originRepo, ["add", "."])
	git(originRepo, ["commit", "-q", "-m", "fixture initial"])
	return git(originRepo, ["rev-parse", "HEAD"]).stdout.trim()
})()
git(fixtureRoot, ["clone", "-q", originRepo, "canonical-workspace"])
symlinkSync(canonicalWorkspace, symlinkWorkspace, "dir")

function writeAutomation(prompt, workspace = canonicalWorkspace) {
	mkdirSync(dirname(automationPath), {recursive: true})
	writeFileSync(automationPath, `id = "tinystudio-retention-checkups"\nkind = "cron"\nname = "TinyStudio retention checkups"\nprompt = "${prompt}"\nstatus = "ACTIVE"\nrrule = "FREQ=WEEKLY;BYDAY=FR;BYHOUR=9;BYMINUTE=0"\nworkspaces = ["${workspace}"]\n`)
}

function run(github = "false", workspace = canonicalWorkspace) {
	return spawnSync(process.execPath, [script], {cwd: fixtureRoot, env: {...process.env, CODEX_HOME: codexHome, GITHUB_ACTIONS: github, SERVICE_REPO_ROOT: serviceRoot, TINYSTUDIO_AUTOMATION_WORKSPACE: workspace, TINYSTUDIO_CANONICAL_RUNTIME: canonicalRuntime}, encoding: "utf8"})
}

// The canonical operator runtime must see exactly the same aggregate service
// state as the automation runtime in every aligned scenario.
function mirrorStateToCanonical() {
	rmSync(canonicalRuntime, {recursive: true, force: true})
	mkdirSync(canonicalRuntime, {recursive: true})
	for (const relative of STATE_ROOTS) {
		const source = join(serviceRoot, relative)
		if (existsSync(source)) cpSync(source, join(canonicalRuntime, relative), {recursive: true})
	}
}

try {
	let result = run()
	eq(result.status, 0)
	eq(JSON.parse(result.stdout).clientCount, 0)

	mkdirSync(join(serviceRoot, "prospects", "paid-service-client"), {recursive: true})
	writeFileSync(join(serviceRoot, "prospects", "paid-service-client", "service-day0.json"), "{}\n")
	mirrorStateToCanonical()
	result = run()
	neq(result.status, 0)
	eq(JSON.parse(result.stdout).clientCount, 1)
	rmSync(join(serviceRoot, "prospects"), {recursive: true, force: true})
	mirrorStateToCanonical()

	mkdirSync(join(serviceRoot, "clients", "active-client"), {recursive: true})
	mirrorStateToCanonical()
	result = run()
	neq(result.status, 0)
	const report = JSON.parse(result.stdout)
	eq(report.clientCount, 1)
	deq(report.failures, ["Automation file is missing"])
	result = run("true")
	neq(result.status, 0)

	writeAutomation("Run the retention automation check with the weekly client value loop, retention checkups, internal dashboard, value stress, and monthly review. Do not send client messages or approve claims automatically.")
	result = run()
	neq(result.status, 0)
	assert(JSON.parse(result.stdout).failures.some(failure => failure.includes("retired service concept")))

	writeAutomation(RETENTION_AUTOMATION_PROMPT, "/tmp/wrong-tinystudio-workspace")
	result = run()
	neq(result.status, 0)
	assert(JSON.parse(result.stdout).failures.includes("Automation does not point at the TinyStudio repo"))

	writeAutomation(RETENTION_AUTOMATION_PROMPT)
	result = run()
	eq(result.status, 0)
	const currentReport = JSON.parse(result.stdout)
	eq(currentReport.status, "pass")
	deq(currentReport.failures, [])
	deq(currentReport.aggregateState, {clients: 1, prospects: null, "service-decisions": null, "runs/service-engine": null})
	deq(currentReport.canonicalState, currentReport.aggregateState)
	eq(currentReport.checkout.head, currentReport.checkout.originMain)
	assert(currentReport.checkout.head)

	writeAutomation(RETENTION_AUTOMATION_PROMPT, symlinkWorkspace)
	result = run()
	eq(result.status, 0)
	eq(JSON.parse(result.stdout).status, "pass")

	// Divergent aggregate state fails: the canonical runtime sees a client the
	// automation runtime cannot see.
	mkdirSync(join(canonicalRuntime, "clients", "canonical-only-client"), {recursive: true})
	result = run()
	neq(result.status, 0)
	assert(JSON.parse(result.stdout).failures.some(failure => failure.includes("Aggregate service state diverges from canonical runtime") && failure.includes("clients")))
	rmSync(join(canonicalRuntime, "clients", "canonical-only-client"), {recursive: true, force: true})

	// A required root missing from the canonical runtime fails.
	rmSync(join(canonicalRuntime, "clients"), {recursive: true, force: true})
	result = run()
	neq(result.status, 0)
	assert(JSON.parse(result.stdout).failures.some(failure => failure.includes("Aggregate service root clients is inaccessible in the canonical runtime")))
	mirrorStateToCanonical()

	// An unreadable root (a plain file where a directory is required) fails.
	mkdirSync(join(serviceRoot, "runs", "service-engine"), {recursive: true})
	mirrorStateToCanonical()
	rmSync(join(canonicalRuntime, "runs", "service-engine"), {recursive: true, force: true})
	writeFileSync(join(canonicalRuntime, "runs", "service-engine"), "not a directory\n")
	result = run()
	neq(result.status, 0)
	assert(JSON.parse(result.stdout).failures.some(failure => failure.includes("Aggregate service root runs/service-engine is inaccessible in the canonical runtime")))

	// One-commit drift on origin fails after the checker inspects current origin.
	git(originRepo, ["commit", "--allow-empty", "-q", "-m", "drift commit"])
	result = run()
	neq(result.status, 0)
	assert(JSON.parse(result.stdout).failures.some(failure => failure.includes("origin/main")))
	git(originRepo, ["reset", "-q", "--hard", initialOriginSha])

	// A configured checkout whose origin cannot be inspected fails closed.
	const plainWorkspace = join(fixtureRoot, "plain-workspace")
	mkdirSync(plainWorkspace, {recursive: true})
	writeAutomation(RETENTION_AUTOMATION_PROMPT, plainWorkspace)
	result = run("false", plainWorkspace)
	neq(result.status, 0)
	assert(JSON.parse(result.stdout).failures.some(failure => failure.includes("Cannot verify configured checkout against current origin/main")))

	// Fully aligned state passes after every failure mode is cleared.
	mirrorStateToCanonical()
	writeAutomation(RETENTION_AUTOMATION_PROMPT)
	result = run()
	eq(result.status, 0)
	eq(JSON.parse(result.stdout).status, "pass")
	deq(JSON.parse(result.stdout).failures, [])

	console.log("Retention automation applicability checks passed.")
} finally {
	rmSync(fixtureRoot, {recursive: true, force: true})
}
