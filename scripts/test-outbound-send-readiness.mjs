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
	writeFileSync(join(prospect, "send-package.md"), `${packageHeader}Specific website fault. ${optOut}`)
	writeFileSync(join(alternateProspect, "send-package.md"), `${packageHeader}Alternate safe package. ${optOut}`)

	result = run()
	assert.equal(result.status, 0)
	assert.equal(output(result).filesScanned, 1)

	writeFileSync(join(prospect, "send-package.md"), `${packageHeader}Specific website fault.\n`)
	result = run()
	assert.notEqual(result.status, 0)
	assert(output(result).findings.some(finding => finding.rule === "missing opt-out language"))

	writeFileSync(join(prospect, "send-package.md"), `${packageHeader}Loom: [add Loom link]\n${optOut}`)
	result = run()
	assert.notEqual(result.status, 0)
	assert(output(result).findings.some(finding => finding.rule === "send package still has placeholders"))

	// The send package must never sell a retired broad-agency offer, and
	// recording-notes.md is embedded verbatim into the send package. Every
	// active record/send surface must fail the gate when it still sells a
	// retired offer (7-day sprint / 30-day action plan / founder sprint /
	// $500 price), not just send-package.md and recording-notes.md.
	const retiredFixtures = [
		["send-package.md", `${packageHeader}7-Day Site Revenue Fault Sprint with a 30-day action plan. ${optOut}`],
		["recording-notes.md", `# Recording Notes\n\n## Quality Notes\n\n- Clean ask: If useful, I can run a Tangible Revenue Fault Sprint with a 30-day action plan for $500.\n`],
		["loom-outline.md", `# Loom Outline\n\n7. Sprint pitch: 7-Day Site Revenue Fault Sprint with a 30-day action plan\n`],
		["recording-script.md", `# Recording Script\n\n## Talk Track\n\nIf useful, I can run a 7-day sprint where I map this fault for $1,000 founder sprint.\n`],
		["next-message.md", `${packageHeader}If useful, I can run a 7-day sprint where I map this leak and give you a 30-day action plan. ${optOut}`],
		["recording-sharpness-brief.md", `# Sharpness Brief\n\n## Positioning Angle\n\nOffer the The Website Correction at $1,000 founder sprint.\n`],
		["outreach.md", `# Outreach\n\n## First Message\n\nIf useful, I can run a 7-day sprint where I map this fault and give you a 30-day action plan. ${optOut}`],
		["contact-plan.md", `# Contact Plan\n\n## Best Route\n\nEmail the founder.\n\n## Pitch\n\nIf useful, I can run a 7-Day Site Revenue Fault Sprint with a 30-day action plan.\n`],
		["value-calculator.md", `# Value Calculator\n\nIf useful, I can run a Tangible Revenue Fault Sprint and Growth Desk across three pages for $500.\n`],
		["sales-call-prep.md", `# Sales Call Prep\n\nOffer the 7-day sprint at the $1,000 founder sprint.\n`],
		["lead-score.md", `# Lead Score\n\nIf useful, I can run a 7-day sprint with a 30-day action plan.\n`]
	]
	for (const [file, content] of retiredFixtures) {
		writeFileSync(join(prospect, file), content)
		result = run()
		assert.notEqual(result.status, 0, `expected retired-offer failure for ${file}`)
		assert(output(result).findings.some(finding => finding.rule === "outbound package sells a retired offer"))
	}

	// Canonical copy on every surface must pass the retired-offer rule.
	for (const [file, content] of [
		["send-package.md", `${packageHeader}The Website Correction, one highest-leverage page, 14-day implementation tracking. ${optOut}`],
		["recording-notes.md", `# Recording Notes\n\n## Quality Notes\n\n- Clean ask: If useful, I can run a human-reviewed The Website Correction on this one highest-leverage page with a measurement plan.\n`],
		["loom-outline.md", `# Loom Outline\n\n7. Ask: If useful, I can run a human-reviewed The Website Correction on this one highest-leverage page with 14-day implementation tracking.\n`],
		["recording-script.md", `# Recording Script\n\n## Talk Track\n\nIf useful, I can run a human-reviewed The Website Correction on this one highest-leverage page.\n`],
		["next-message.md", `${packageHeader}If useful, I can run a human-reviewed The Website Correction on this one highest-leverage page. ${optOut}`],
		["recording-sharpness-brief.md", `# Sharpness Brief\n\n## Positioning Angle\n\nThe Website Correction at the $1,000 founder pilot.\n`],
		["outreach.md", `# Outreach\n\n## First Message\n\nIf useful, I can run a human-reviewed The Website Correction. ${optOut}`],
		["contact-plan.md", `# Contact Plan\n\n## Best Route\n\nEmail the founder.\n`],
		["value-calculator.md", `# Value Calculator\n\nEstimate the value of one highest-leverage page fix.\n`],
		["sales-call-prep.md", `# Sales Call Prep\n\nThe Website Correction at the $1,000 founder pilot.\n`],
		["lead-score.md", `# Lead Score\n\nScore: 8\n\nPriority: follow-up.\n`]
	]) {
		writeFileSync(join(prospect, file), content)
	}
	result = run()
	assert.equal(result.status, 0, "canonical send package must not trigger the retired-offer rule")

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
