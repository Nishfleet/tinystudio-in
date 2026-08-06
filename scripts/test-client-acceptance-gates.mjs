#!/usr/bin/env node
import assert from "node:assert/strict"
const {equal: eq, deepEqual: deq, match: mat, doesNotMatch: dnm} = assert
import {cpSync, existsSync, mkdtempSync, mkdirSync, readdirSync, readFileSync, rmSync, statSync, writeFileSync} from "node:fs"
import {tmpdir} from "node:os"
import {dirname, join, relative} from "node:path"
import {spawnSync} from "node:child_process"
import {fileURLToPath} from "node:url"

const repoRoot = dirname(dirname(fileURLToPath(import.meta.url)))
const fixtureRoot = mkdtempSync(join(tmpdir(), "ts-accept-"))
const clientPath = "clients/gate"
const checklistPath = join(fixtureRoot, clientPath, "quality/sprint-acceptance-checklist.md")
const templatePath = join(fixtureRoot, "growth-brain/quality/sprint-acceptance-checklist.md")
const readiness = "scripts/check-client-readiness.mjs"

function filesUnder(root) {
	const files = []
	if (!existsSync(root)) return files
	for (const entry of readdirSync(root)) {
		const path = join(root, entry)
		if (statSync(path).isDirectory()) files.push(...filesUnder(path))
		else files.push(path)
	}
	return files
}

function treeSnapshot(root) {
	return filesUnder(root)
		.map(path => [relative(root, path), readFileSync(path, "utf8")])
		.sort(([left], [right]) => left.localeCompare(right))
}

function checklistStructure(markdown) {
	return markdown
		.split("\n")
		.map(line => line.trim())
		.filter(line => /^## |^- \[[ xX]\]/.test(line))
		.map(line => line.replace(/^- \[[ xX]\]/, "- [ ]"))
}

function run(args, cwd = fixtureRoot, dataRoot = cwd) {
	return spawnSync(process.execPath, args, {cwd, encoding: "utf8", env: {...process.env, SERVICE_REPO_ROOT: dataRoot}})
}

try {
	cpSync(join(repoRoot, "scripts"), join(fixtureRoot, "scripts"), {recursive: true})
	mkdirSync(dirname(templatePath), {recursive: true})
	cpSync(join(repoRoot, "growth-brain/quality/sprint-acceptance-checklist.md"), templatePath)
	const canonicalChecklist = readFileSync(templatePath, "utf8")
	const checkedChecklist = canonicalChecklist.replace(/^- \[ \]/gm, "- [x]")
	const uncheckedChecklist = checkedChecklist.replace("- [x] Claims review passed.", "- [ ] Claims review passed.")
	const acceptance = ["scripts/review-client-acceptance.mjs", clientPath]
	const human = ["--handoff-loom=https://www.loom.com/share/acceptance-gate", "--reviewer=Human Reviewer"]
	writeFileSync(join(fixtureRoot, readiness), 'console.log(JSON.stringify({ status: "ready", warnings: [] }));\n')
	writeFileSync(join(fixtureRoot, "scripts/export-client-delivery-cockpit.mjs"), 'console.log(JSON.stringify({ status: "exported" }));\n')
	for (const name of ["export-client-facing-dashboard.mjs", "export-client-renewal-review.mjs"]) {
		writeFileSync(join(fixtureRoot, "scripts", name), 'throw new Error("retired generator invoked");\n')
	}

	const qualityPath = dirname(checklistPath)
	mkdirSync(qualityPath, {recursive: true})
	writeFileSync(checklistPath, uncheckedChecklist)

	writeFileSync(join(fixtureRoot, readiness), 'console.log(JSON.stringify({ status: "blocked", missing: ["brain/reviews.md"], warnings: [] }));\n')
	const missingReadinessBefore = treeSnapshot(fixtureRoot)
	const missingReadiness = run([...acceptance, ...human])
	eq(missingReadiness.status, 1)
	mat(missingReadiness.stderr, /Missing readiness artifact: brain\/reviews\.md/)
	deq(treeSnapshot(fixtureRoot), missingReadinessBefore)
	writeFileSync(join(fixtureRoot, readiness), 'console.log(JSON.stringify({ status: "ready", warnings: [] }));\n')

	writeFileSync(join(qualityPath, "claim-proof-ledger.md"), "| Claim | Source | Proof Type | Approved By | Status |\n|---|---|---|---|---|\n| A claim | source | public source |  | draft |\n")
	const retiredFlagBefore = treeSnapshot(fixtureRoot)
	const retiredFlag = run(["scripts/review-client-proof.mjs", clientPath, "--approve=1", "--approve-scorecard", "--reviewer=Human Reviewer"])
	eq(retiredFlag.status, 1)
	mat(retiredFlag.stderr, /approve-scorecard is retired/i)
	deq(treeSnapshot(fixtureRoot), retiredFlagBefore)

	const beforeBlocked = treeSnapshot(fixtureRoot)
	const blocked = run([...acceptance, ...human])
	eq(blocked.status, 1)
	mat(blocked.stderr, /every checklist item is explicitly checked by a human/i)
	mat(blocked.stderr, /Claims review passed/i)
	deq(treeSnapshot(fixtureRoot), beforeBlocked)

	const dryRun = run([...acceptance, "--dry-run"])
	eq(dryRun.status, 0)
	const dryReport = JSON.parse(dryRun.stdout)
	eq(dryReport.status, "blocked")
	eq(dryReport.checklist.complete, false)
	deq(
		dryReport.checklist.uncheckedItems.map(({label}) => label),
		["Claims review passed."]
	)
	dnm(dryRun.stdout, /ready-to-complete/)
	deq(treeSnapshot(fixtureRoot), beforeBlocked)

	const dataOnlyRoot = join(fixtureRoot, "data-only-root")
	cpSync(join(fixtureRoot, "clients"), join(dataOnlyRoot, "clients"), {recursive: true})
	const dataOnlyDryRun = run([join(fixtureRoot, "scripts/review-client-acceptance.mjs"), clientPath, "--dry-run"], fixtureRoot, dataOnlyRoot)
	eq(dataOnlyDryRun.status, 0, dataOnlyDryRun.stderr)
	eq(JSON.parse(dataOnlyDryRun.stdout).checklist.templateExists, true)

	writeFileSync(checklistPath, checkedChecklist)
	const checkedBefore = readFileSync(checklistPath, "utf8").match(/^- \[[ xX]\].*$/gm)
	const completed = run([...acceptance, ...human, "--date=2026-07-13"])
	eq(completed.status, 0)
	eq(JSON.parse(completed.stdout).status, "updated")
	const checkedAfterContent = readFileSync(checklistPath, "utf8")
	deq(checkedAfterContent.match(/^- \[[ xX]\].*$/gm), checkedBefore)
	deq(checklistStructure(checkedAfterContent), checklistStructure(canonicalChecklist))
	mat(checkedAfterContent, /- Handoff Loom: https:\/\/www\.loom\.com\/share\/acceptance-gate/)
	mat(checkedAfterContent, /- Reviewer: Human Reviewer/)
	dnm(checkedAfterContent, /^- \[ \]/m)

	const splitProof = run([join(fixtureRoot, "scripts/review-client-proof.mjs"), clientPath, "--dry-run"], fixtureRoot, dataOnlyRoot)
	eq(splitProof.status, 0, splitProof.stderr)
	eq(JSON.parse(splitProof.stdout).clientPath, join(dataOnlyRoot, clientPath))

	console.log("Client acceptance gate checks passed.")
} finally {
	rmSync(fixtureRoot, {recursive: true, force: true})
}
