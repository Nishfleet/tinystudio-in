#!/usr/bin/env node
import assert from "node:assert/strict"
const {equal: eq, deepEqual: deq, notEqual: neq} = assert
import {spawnSync, execFileSync} from "node:child_process"
import {chmodSync, mkdirSync, mkdtempSync, rmSync, symlinkSync, writeFileSync} from "node:fs"
import {tmpdir} from "node:os"
import {dirname, join} from "node:path"
import {fileURLToPath} from "node:url"
import {RETENTION_AUTOMATION_PROMPT} from "./lib/retention-automation.mjs"

const script = join(dirname(fileURLToPath(import.meta.url)), "check-retention-automation.mjs")
const fixtureRoot = mkdtempSync(join(tmpdir(), "tinystudio-retention-gate-"))
const codexHome = join(fixtureRoot, "codex-home")
const automationPath = join(codexHome, "automations", "tinystudio-retention-checkups", "automation.toml")
const PRIVATE_NAMES = ["c-one", "p-one", "d-one.json", "outputs"]
let serial = 0

function git(root, ...args) {
	return execFileSync("git", ["-C", root, ...args], {encoding: "utf8", stdio: ["ignore", "pipe", "pipe"]}).trim()
}

function seedState(root) {
	mkdirSync(join(root, "clients", "c-one"), {recursive: true})
	mkdirSync(join(root, "prospects", "p-one"), {recursive: true})
	mkdirSync(join(root, "service-decisions"), {recursive: true})
	writeFileSync(join(root, "service-decisions", "d-one.json"), "{}\n")
	mkdirSync(join(root, "runs", "service-engine", "outputs"), {recursive: true})
}

function makeWorkspace() {
	serial += 1
	const originPath = join(fixtureRoot, `origin-${serial}`)
	const workspacePath = join(fixtureRoot, `workspace-${serial}`)
	mkdirSync(originPath, {recursive: true})
	git(originPath, "init", "-b", "main")
	git(originPath, "config", "user.email", "tinystudio-test@example.com")
	git(originPath, "config", "user.name", "TinyStudio Test")
	writeFileSync(join(originPath, "base.txt"), "base\n")
	git(originPath, "add", "base.txt")
	git(originPath, "commit", "-m", "base commit")
	const baseSha = git(originPath, "rev-parse", "HEAD")
	git(originPath, "clone", "--quiet", originPath, workspacePath)
	seedState(workspacePath)
	return {originPath, workspacePath, baseSha}
}

function writeAutomation(prompt, workspace) {
	mkdirSync(dirname(automationPath), {recursive: true})
	writeFileSync(automationPath, `id = "tinystudio-retention-checkups"\nkind = "cron"\nname = "TinyStudio retention checkups"\nprompt = "${prompt}"\nstatus = "ACTIVE"\nrrule = "FREQ=WEEKLY;BYDAY=FR;BYHOUR=9;BYMINUTE=0"\nworkspaces = ["${workspace}"]\n`)
}

function run(workspace, {github = "false", serviceRoot} = {}) {
	return spawnSync(process.execPath, [script], {cwd: fixtureRoot, env: {...process.env, CODEX_HOME: codexHome, GITHUB_ACTIONS: github, SERVICE_REPO_ROOT: serviceRoot || workspace, TINYSTUDIO_AUTOMATION_WORKSPACE: workspace}, encoding: "utf8"})
}

function reportOf(result) {
	assert(result.stdout, "check produced no output")
	return JSON.parse(result.stdout)
}

function assertNoPrivateNames(...reports) {
	for (const report of reports) {
		const output = JSON.stringify(report)
		for (const name of PRIVATE_NAMES) assert(!output.includes(name), `output leaked record name: ${name}`)
	}
}

try {
	const aligned = makeWorkspace()
	writeAutomation(RETENTION_AUTOMATION_PROMPT, aligned.workspacePath)

	// Aligned fixtures pass: fresh checkout at origin/main, all four roots present.
	let result = run(aligned.workspacePath)
	eq(result.status, 0)
	let report = reportOf(result)
	eq(report.status, "pass")
	deq(report.failures, [])
	eq(report.repo, aligned.workspacePath)
	eq(report.source.fresh, true)
	eq(report.source.head, aligned.baseSha)
	eq(report.source.originMain, aligned.baseSha)
	eq(report.clientCount, 1)
	eq(report.stateManifest["clients"].exists, true)
	eq(report.stateManifest["clients"].count, 1)
	eq(report.stateManifest["prospects"].count, 1)
	eq(report.stateManifest["service-decisions"].count, 1)
	eq(report.stateManifest["runs/service-engine"].count, 1)
	assertNoPrivateNames(report)

	// One-commit drift on origin/main is fatal.
	writeFileSync(join(aligned.originPath, "advance.txt"), "advance\n")
	git(aligned.originPath, "add", "advance.txt")
	git(aligned.originPath, "commit", "-m", "advance main by one commit")
	result = run(aligned.workspacePath)
	neq(result.status, 0)
	report = reportOf(result)
	eq(report.status, "fail")
	eq(report.source.fresh, false)
	assert(report.failures.some(failure => failure.includes("stale") && failure.includes("origin/main")))
	assertNoPrivateNames(report)

	// Re-aligned fixture passes again (deterministic re-observation).
	git(aligned.originPath, "reset", "--hard", aligned.baseSha)
	result = run(aligned.workspacePath)
	eq(result.status, 0)
	eq(reportOf(result).status, "pass")

	// Missing canonical state roots are fatal.
	rmSync(join(aligned.workspacePath, "service-decisions"), {recursive: true, force: true})
	result = run(aligned.workspacePath)
	neq(result.status, 0)
	assert(reportOf(result).failures.some(failure => failure.includes("missing") && failure.includes("service-decisions")))
	mkdirSync(join(aligned.workspacePath, "service-decisions"), {recursive: true})
	writeFileSync(join(aligned.workspacePath, "service-decisions", "d-one.json"), "{}\n")

	rmSync(join(aligned.workspacePath, "runs"), {recursive: true, force: true})
	result = run(aligned.workspacePath)
	neq(result.status, 0)
	assert(reportOf(result).failures.some(failure => failure.includes("missing") && failure.includes("runs/service-engine")))
	mkdirSync(join(aligned.workspacePath, "runs", "service-engine", "outputs"), {recursive: true})

	// Divergent roots are fatal: a root that is a regular file...
	rmSync(join(aligned.workspacePath, "clients"), {recursive: true, force: true})
	writeFileSync(join(aligned.workspacePath, "clients"), "not a directory\n")
	result = run(aligned.workspacePath)
	neq(result.status, 0)
	report = reportOf(result)
	assert(report.failures.some(failure => failure.includes("not a directory") && failure.includes("clients")))
	assertNoPrivateNames(report)
	rmSync(join(aligned.workspacePath, "clients"), {force: true})
	mkdirSync(join(aligned.workspacePath, "clients", "c-one"), {recursive: true})

	// ...and a root that is a symbolic link.
	rmSync(join(aligned.workspacePath, "prospects"), {recursive: true, force: true})
	mkdirSync(join(fixtureRoot, "symlink-target"), {recursive: true})
	symlinkSync(join(fixtureRoot, "symlink-target"), join(aligned.workspacePath, "prospects"), "dir")
	result = run(aligned.workspacePath)
	neq(result.status, 0)
	assert(reportOf(result).failures.some(failure => failure.includes("symbolic link") && failure.includes("prospects")))
	rmSync(join(aligned.workspacePath, "prospects"), {recursive: true, force: true})
	mkdirSync(join(aligned.workspacePath, "prospects", "p-one"), {recursive: true})

	// Inaccessible roots are fatal.
	chmodSync(join(aligned.workspacePath, "clients"), 0o000)
	result = run(aligned.workspacePath)
	neq(result.status, 0)
	assert(reportOf(result).failures.some(failure => failure.includes("inaccessible") && failure.includes("clients")))
	chmodSync(join(aligned.workspacePath, "clients"), 0o755)
	result = run(aligned.workspacePath)
	eq(result.status, 0)

	// The false-green is gone: a missing automation file fails even with no state...
	rmSync(automationPath, {force: true})
	rmSync(join(aligned.workspacePath, "clients"), {recursive: true, force: true})
	rmSync(join(aligned.workspacePath, "prospects"), {recursive: true, force: true})
	rmSync(join(aligned.workspacePath, "service-decisions"), {recursive: true, force: true})
	rmSync(join(aligned.workspacePath, "runs"), {recursive: true, force: true})
	result = run(aligned.workspacePath)
	neq(result.status, 0)
	assert(reportOf(result).failures.includes("Automation file is missing"))

	// ...and in GitHub Actions the missing automation surface degrades to an explicit warning.
	result = run(aligned.workspacePath, {github: "true"})
	eq(result.status, 0)
	report = reportOf(result)
	eq(report.status, "warn")
	assert(report.warnings.some(warning => warning.includes("preflight cannot be evaluated")))

	seedState(aligned.workspacePath)
	writeAutomation("Run the retention automation check with the weekly client value loop, retention checkups, internal dashboard, value stress, and monthly review. Do not send client messages or approve claims automatically.")
	result = run(aligned.workspacePath)
	neq(result.status, 0)
	assert(reportOf(result).failures.some(failure => failure.includes("retired service concept")))

	writeAutomation(RETENTION_AUTOMATION_PROMPT, "/tmp/wrong-tinystudio-workspace")
	result = run(aligned.workspacePath)
	neq(result.status, 0)
	assert(reportOf(result).failures.includes("Automation does not point at the TinyStudio repo"))

	writeAutomation(RETENTION_AUTOMATION_PROMPT, aligned.workspacePath)
	result = run(aligned.workspacePath)
	eq(result.status, 0)
	eq(reportOf(result).status, "pass")

	// A workspace path declared through a symlink still resolves to the canonical workspace.
	const symlinkWorkspace = join(fixtureRoot, "workspace-link")
	symlinkSync(aligned.workspacePath, symlinkWorkspace, "dir")
	writeAutomation(RETENTION_AUTOMATION_PROMPT, symlinkWorkspace)
	result = run(aligned.workspacePath)
	eq(result.status, 0)
	eq(reportOf(result).status, "pass")

	// Runs from outside the declared automation workspace are smoke runs: they warn explicitly and do not evaluate the preflight.
	writeAutomation(RETENTION_AUTOMATION_PROMPT, aligned.workspacePath)
	const smokeRoot = join(fixtureRoot, "smoke-root")
	mkdirSync(smokeRoot, {recursive: true})
	result = run(aligned.workspacePath, {serviceRoot: smokeRoot})
	eq(result.status, 0)
	report = reportOf(result)
	eq(report.status, "warn")
	assert(report.warnings.some(warning => warning.includes("Preflight not evaluated")))
	eq(report.source, undefined)
	eq(report.stateManifest, undefined)

	console.log("Retention automation preflight checks passed.")
} finally {
	rmSync(fixtureRoot, {recursive: true, force: true})
}
