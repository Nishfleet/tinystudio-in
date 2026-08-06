#!/usr/bin/env node
import assert from "node:assert/strict"
const {equal: eq, deepEqual: deq, notEqual: neq} = assert
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
mkdirSync(canonicalWorkspace, {recursive: true})
symlinkSync(canonicalWorkspace, symlinkWorkspace, "dir")

function writeAutomation(prompt, workspace = canonicalWorkspace) {
	mkdirSync(dirname(automationPath), {recursive: true})
	writeFileSync(automationPath, `id = "tinystudio-retention-checkups"\nkind = "cron"\nname = "TinyStudio retention checkups"\nprompt = "${prompt}"\nstatus = "ACTIVE"\nrrule = "FREQ=WEEKLY;BYDAY=FR;BYHOUR=9;BYMINUTE=0"\nworkspaces = ["${workspace}"]\n`)
}

function run(github = "false") {
	return spawnSync(process.execPath, [script], {cwd: fixtureRoot, env: {...process.env, CODEX_HOME: codexHome, GITHUB_ACTIONS: github, SERVICE_REPO_ROOT: serviceRoot, TINYSTUDIO_AUTOMATION_WORKSPACE: canonicalWorkspace}, encoding: "utf8"})
}

try {
	let result = run()
	eq(result.status, 0)
	eq(JSON.parse(result.stdout).clientCount, 0)

	mkdirSync(join(serviceRoot, "prospects", "paid-service-client"), {recursive: true})
	writeFileSync(join(serviceRoot, "prospects", "paid-service-client", "service-day0.json"), "{}\n")
	result = run()
	neq(result.status, 0)
	eq(JSON.parse(result.stdout).clientCount, 1)
	rmSync(join(serviceRoot, "prospects"), {recursive: true, force: true})

	mkdirSync(join(serviceRoot, "clients", "active-client"), {recursive: true})
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

	writeAutomation(RETENTION_AUTOMATION_PROMPT, symlinkWorkspace)
	result = run()
	eq(result.status, 0)
	eq(JSON.parse(result.stdout).status, "pass")

	console.log("Retention automation applicability checks passed.")
} finally {
	rmSync(fixtureRoot, {recursive: true, force: true})
}
