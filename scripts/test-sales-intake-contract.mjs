#!/usr/bin/env node

import assert from "node:assert/strict"
const {equal: eq, deepEqual: deq, notEqual: neq, match: mat, doesNotMatch: dnm} = assert
import {spawnSync} from "node:child_process"
import {createHash} from "node:crypto"
import {cpSync, existsSync, mkdirSync, mkdtempSync, readFileSync, readdirSync, rmSync, symlinkSync, writeFileSync} from "node:fs"
import {tmpdir} from "node:os"
import {dirname, join, relative} from "node:path"
import {fileURLToPath} from "node:url"

const repoRoot = dirname(dirname(fileURLToPath(import.meta.url)))
const testRoot = mkdtempSync(join(tmpdir(), "tinystudio-sales-intake-contract-"))
const serviceRoot = join(testRoot, "service-repo")
const externalRoot = join(testRoot, "external-application-export")

function sha256(bytes) {
	return createHash("sha256").update(bytes).digest("hex")
}

function fileSnapshot(root) {
	const output = {}
	function visit(path) {
		if (!existsSync(path)) return
		for (const entry of readdirSync(path, {withFileTypes: true}).sort((left, right) => left.name.localeCompare(right.name))) {
			const child = join(path, entry.name)
			if (entry.isDirectory()) visit(child)
			else if (entry.isSymbolicLink()) output[relative(root, child)] = `symlink:${readFileSync(child, "utf8")}`
			else output[relative(root, child)] = sha256(readFileSync(child))
		}
	}
	visit(root)
	return output
}

function run(script, args = []) {
	return spawnSync(process.execPath, [join(repoRoot, script), ...args], {cwd: repoRoot, env: {...process.env, SERVICE_REPO_ROOT: serviceRoot}, encoding: "utf8"})
}

function expectZeroWriteFailure(script, args, expectedError) {
	const before = fileSnapshot(serviceRoot)
	const result = run(script, args)
	neq(result.status, 0)
	mat(result.stderr, expectedError)
	deq(fileSnapshot(serviceRoot), before)
	return result
}

function writeJson(path, value) {
	mkdirSync(dirname(path), {recursive: true})
	writeFileSync(path, `${JSON.stringify(value, null, 2)}\n`)
}

try {
	mkdirSync(serviceRoot, {recursive: true})
	mkdirSync(externalRoot, {recursive: true})
	cpSync(join(repoRoot, "contracts"), join(serviceRoot, "contracts"), {recursive: true})
	writeJson(join(serviceRoot, "growth-brain/ops/agency-config.json"), {founderName: "Fixture Founder", humanDailyReviewCap: 37})

	const fixturePath = join(repoRoot, "contracts/fixtures/sprint-application.v1.json")
	const externalApplicationPath = join(externalRoot, "consented-application.json")
	const fixtureBytes = readFileSync(fixturePath)
	writeFileSync(externalApplicationPath, fixtureBytes)

	const imported = run("scripts/import-sprint-application.mjs", [externalApplicationPath])
	eq(imported.status, 0)
	deq(readFileSync(externalApplicationPath), fixtureBytes)
	const application = JSON.parse(fixtureBytes)
	eq(existsSync(join(serviceRoot, "prospects", application.applicationId, "service-application.json")), true)

	const symlinkPath = join(externalRoot, "application-link.json")
	symlinkSync(externalApplicationPath, symlinkPath)
	expectZeroWriteFailure("scripts/import-sprint-application.mjs", [symlinkPath], /must not be a symbolic link/)
	expectZeroWriteFailure("scripts/import-sprint-application.mjs", [externalRoot], /must be a regular file/)

	const oversizedPath = join(externalRoot, "oversized.json")
	writeFileSync(oversizedPath, Buffer.alloc(256 * 1024 + 1, 0x20))
	expectZeroWriteFailure("scripts/import-sprint-application.mjs", [oversizedPath], /exceeds the 262144-byte limit/)

	const extraSchemaPath = join(externalRoot, "extra-schema-field.json")
	writeJson(extraSchemaPath, {...application, unexpectedField: true})
	expectZeroWriteFailure("scripts/import-sprint-application.mjs", [extraSchemaPath], /unexpected or missing fields/)

	const invalidJsonPath = join(externalRoot, "invalid.json")
	writeFileSync(invalidJsonPath, "{not-json}\n")
	expectZeroWriteFailure("scripts/import-sprint-application.mjs", [invalidJsonPath], /must be valid JSON/)

	const salesProspectArg = "prospects/sales-contract-fixture"
	const salesProspect = join(serviceRoot, salesProspectArg)
	writeJson(join(salesProspect, "metadata.json"), {name: "Sales Contract Fixture", website: "https://example.com/managed-services", vertical: "Managed IT", contact: "Founder"})
	writeJson(join(salesProspect, "pipeline.json"), {stage: "call-booked"})
	writeFileSync(join(salesProspect, "lead-score.md"), "- Score: 14/16\n- Priority: record\n")
	writeFileSync(join(salesProspect, "loom-outline.md"), "1. Company: Sales Contract Fixture\n2. Main page: https://example.com/managed-services\n3. Revenue fault: unclear action\n4. Evidence: competing actions\n5. Why it matters: unclear path\n6. First fix: one reviewed action\n")
	writeFileSync(join(salesProspect, "buyer-room.md"), "## Scope\n- Sprint: Full-Stack Growth Desk\n- Scope: three pages\n- Timeline: 30 days\n- Price: $500\n")
	writeFileSync(join(salesProspect, "value-calculator.md"), "## Payback\n- Payback customers needed: one\n")

	const queuePrepare = run("scripts/run-review-queue.mjs", ["--mode=prepare", "--scope=all", "--as-of=2026-07-14"])
	eq(queuePrepare.status, 0)
	eq(JSON.parse(queuePrepare.stdout).humanDailyReviewCap, 37)

	const draftMessage = run("scripts/draft-prospect-message.mjs", [salesProspect])
	eq(draftMessage.status, 0)
	mat(readFileSync(join(salesProspect, "next-message.md"), "utf8"), /Fixture Founder/)

	const callPrep = run("scripts/draft-sales-call-prep.mjs", [salesProspectArg])
	eq(callPrep.status, 0)
	eq(JSON.parse(callPrep.stdout).pilotSlotsRemaining, 3)
	const callPrepOutput = readFileSync(join(salesProspect, "sales-call-prep.md"), "utf8")
	for (const expected of ["- Sprint: The Website Correction", "- Scope: one highest-leverage page", "- Timeline: 7 working days from Day 0", "- Price: $1,000 founder pilot"]) mat(callPrepOutput, new RegExp(expected.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")))
	dnm(callPrepOutput, /Full-Stack Growth Desk|three pages|30 days|\$500/)

	expectZeroWriteFailure("scripts/prepare-prospect-close-package.mjs", [salesProspectArg, "--price", "$500", "--payment", "https://pay.example.com/founder-pilot"], /price is immutable during the founder pilot: \$1,000 founder pilot/)
	expectZeroWriteFailure("scripts/prepare-prospect-close-package.mjs", [salesProspectArg, "--payment", "$500 by bank transfer"], /payment contains a noncanonical founder-pilot price/)
	expectZeroWriteFailure("scripts/prepare-prospect-close-package.mjs", [salesProspectArg, "--next-step", "Pay $500 by bank transfer"], /next-step contains a noncanonical founder-pilot price/)

	const closePrep = run("scripts/prepare-prospect-close-package.mjs", [salesProspectArg, "--price", "$1,000 founder pilot", "--payment", "https://pay.example.com/founder-pilot"])
	eq(closePrep.status, 0)
	const closeResult = JSON.parse(closePrep.stdout)
	eq(closeResult.price, "$1,000 founder pilot")
	eq(closeResult.pilotSlotsRemaining, 3)
	const closeOutputPath = join(salesProspect, "close-package.md")
	const closeOutput = readFileSync(closeOutputPath, "utf8")
	mat(closeOutput, /- Scope: one highest-leverage page/)
	mat(closeOutput, /- Price: \$1,000 founder pilot/)
	dnm(closeOutput, /Full-Stack Growth Desk|three pages|30 days|\$500/)

	const paidIds = ["108f5a54-84aa-7ae0-a1fd-4da350490771", "208f5a54-84aa-7ae0-a1fd-4da350490772", "308f5a54-84aa-7ae0-a1fd-4da350490773"]
	for (const applicationId of paidIds) {
		const client = join(serviceRoot, "clients", applicationId)
		writeJson(join(client, "service-application.json"), {applicationId})
		writeJson(join(client, "service-day0.json"), {applicationId})
	}
	rmSync(closeOutputPath, {force: true})
	rmSync(join(salesProspect, "sales-call-prep.md"), {force: true})

	expectZeroWriteFailure("scripts/draft-sales-call-prep.mjs", [salesProspectArg], /founder pilot capacity is complete after 3 paid clients/)
	expectZeroWriteFailure("scripts/prepare-prospect-close-package.mjs", [salesProspectArg, "--payment", "https://pay.example.com/fourth-client"], /founder pilot capacity is complete after 3 paid clients/)
	eq(existsSync(closeOutputPath), false)

	console.log("Sales and external-intake contract checks passed.")
} finally {
	rmSync(testRoot, {recursive: true, force: true})
}
