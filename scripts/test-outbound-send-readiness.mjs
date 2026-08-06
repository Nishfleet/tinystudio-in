#!/usr/bin/env node
import assert from "node:assert/strict"
import {mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync} from "node:fs"
import {tmpdir} from "node:os"
import {dirname, join} from "node:path"
import {fileURLToPath} from "node:url"
import {spawnSync} from "node:child_process"

const fixtureRoot = mkdtempSync(join(tmpdir(), "tinystudio-outbound-readiness-"))
const script = join(dirname(fileURLToPath(import.meta.url)), "check-outbound-send-readiness.mjs")
const prospect = join(fixtureRoot, "prospects", "fixture")
const codeCwd = join(fixtureRoot, "code-cwd")
const alternateRoot = join(fixtureRoot, "alternate")
const alternateProspect = join(alternateRoot, "fixture")
const packageHeader = "# Send package\n\n## Type\n\nfirst-send\n\n## Message\n\n"
const optOut = "Reply no and I will not follow up.\n"

function run(args = []) {
	return spawnSync(process.execPath, [script, "--strict", ...args], {cwd: codeCwd, env: {...process.env, SERVICE_REPO_ROOT: fixtureRoot}, encoding: "utf8"})
}

function output(result) {
	return JSON.parse(result.status === 0 ? result.stdout : result.stderr)
}

try {
	assert.doesNotMatch(readFileSync(script, "utf8"), /\bOUTBOUND_ROOTS\b/)
	mkdirSync(codeCwd, {recursive: true})
	let result = run()
	assert.equal(result.status, 0)
	assert.equal(output(result).filesScanned, 0)
	mkdirSync(prospect, {recursive: true})
	mkdirSync(alternateProspect, {recursive: true})
	writeFileSync(join(prospect, "send-package.md"), `${packageHeader}Specific website leak. ${optOut}`)
	writeFileSync(join(alternateProspect, "send-package.md"), `${packageHeader}Alternate safe package. ${optOut}`)

	result = run()
	assert.equal(result.status, 0)
	assert.equal(output(result).filesScanned, 1)

	writeFileSync(join(prospect, "send-package.md"), `${packageHeader}Specific website leak.\n`)
	result = run()
	assert.notEqual(result.status, 0)
	assert(output(result).findings.some(finding => finding.rule === "missing opt-out language"))

	writeFileSync(join(prospect, "send-package.md"), `${packageHeader}Loom: [add Loom link]\n${optOut}`)
	result = run()
	assert.notEqual(result.status, 0)
	assert(output(result).findings.some(finding => finding.rule === "send package still has placeholders"))

	result = run(["--roots=alternate"])
	assert.equal(result.status, 0)
	assert.equal(output(result).filesScanned, 1)

	for (const args of [["--roots="], ["--roots=missing"], ["--roots=prospects,./prospects"], ["--unknown"]]) {
		result = run(args)
		assert.notEqual(result.status, 0, `expected argument validation to fail for ${args.join(" ")}`)
		assert.equal(output(result).findings[0].rule, "invalid command arguments")
	}

	console.log("Outbound send readiness fixture checks passed.")
} finally {
	rmSync(fixtureRoot, {recursive: true, force: true})
}
