#!/usr/bin/env node
import assert from "node:assert/strict"
const {equal: eq, deepEqual: deq, notEqual: neq, match: mat, doesNotMatch: dnm} = assert
import {cpSync, existsSync, mkdirSync, mkdtempSync, readFileSync, readdirSync, rmSync, statSync, writeFileSync} from "node:fs"
import {tmpdir} from "node:os"
import {dirname, join, relative} from "node:path"
import {spawnSync} from "node:child_process"
import {fileURLToPath, pathToFileURL} from "node:url"

const name = "Signal Ridge IT"
const applicationId = "018f5a54-84aa-7ae0-a1fd-4da350490770"
const R = dirname(dirname(fileURLToPath(import.meta.url)))
const F = mkdtempSync(join(tmpdir(), "tinystudio-readiness-contract-"))
const folder = `clients/${applicationId}`

cpSync(join(R, "scripts"), join(F, "scripts"), {recursive: true})
cpSync(join(R, "growth-brain"), join(F, "growth-brain"), {recursive: true})
cpSync(join(R, "contracts"), join(F, "contracts"), {recursive: true})
for (const file of ["README.md", "MEMORY.md", "TASKS.md", "PRODUCT.md", "AGENT_WORKFLOW.md", "package.json"]) cpSync(join(R, file), join(F, file))

function run(args, extraEnv = {}) {
	return spawnSync(process.execPath, args, {cwd: F, encoding: "utf8", env: {...process.env, SERVICE_REPO_ROOT: F, ...extraEnv}})
}

const script = (name, ...args) => ["scripts/" + name, ...args]
const sp = name => join(F, "scripts", name)

const sourceSnapshot = {clients: treeSnapshot(join(R, "clients")), prospects: treeSnapshot(join(R, "prospects"))}

const retiredPaths = [
	"client-dashboard.html",
	"client-dashboard.md",
	"ops/repeatable-workflow.html",
	"ops/repeatable-workflow.md",
	"quality/channel-readiness-scorecard.md",
	"quality/conversion-optimization-scorecard.md",
	"reports/week-1-report.md",
	"reports/monthly-renewal-review.md",
	"reports/monthly-renewal-review.html",
	"research/ai-search-audit.md"
]

function filesUnder(root) {
	const files = []
	function visit(path) {
		for (const entry of readdirSync(path)) {
			const child = join(path, entry)
			if (statSync(child).isDirectory()) visit(child)
			else files.push(child)
		}
	}
	visit(root)
	return files
}

function treeSnapshot(root) {
	const present = existsSync(root)
	return {
		present,
		files: present
			? filesUnder(root)
					.map(path => [relative(root, path), readFileSync(path, "utf8")])
					.sort(([left], [right]) => left.localeCompare(right))
			: []
	}
}

function assertNarrowGeneratedClient(root) {
	for (const path of retiredPaths) eq(existsSync(join(root, path)), false)
	const retiredTruth = /Tangible Revenue Leak Sprint|30[- ]day (?:action )?plan|Weekly Growth Desk|Full-Stack Growth Desk|rewrite\/redesign|rewritten and redesigned|ad angles? and email\/sms|ads and email\/sms/i
	for (const path of filesUnder(root)) {
		const content = readFileSync(path, "utf8")
		eq(retiredTruth.test(content), false)
	}
}

try {
	const ER = join(F, "empty-service-root")
	mkdirSync(ER, {recursive: true})
	for (const rejectedId of [name, "128f5a54-84aa-7ae0-a1fd-4da350490772"]) {
		const rejectedClient = run(script("create-client-sprint.mjs", rejectedId), {SERVICE_REPO_ROOT: ER})
		neq(rejectedClient.status, 0)
		deq(readdirSync(ER), [])
	}
	const imported = run(script("import-sprint-application.mjs", "contracts/fixtures/sprint-application.v1.json"))
	eq(imported.status, 0)
	const fixedClockImport = pathToFileURL(sp("lib/test-fixed-clock.mjs")).href
	const clockEnv = {
		NODE_OPTIONS: [process.env.NODE_OPTIONS, `--import=${fixedClockImport}`].filter(Boolean).join(" "),
		SERVICE_TEST_NOW: "2026-07-13T23:59:00.000+05:30",
		TZ: "Asia/Kolkata"
	}
	const decided = run(script("record-service-decision.mjs", applicationId, "--decision", "approve", "--reviewer", "Canonical reviewer", "--note", "Fit and application evidence reviewed for the readiness fixture", "--decided-at", "2026-07-13T10:00:00.000Z", "--nonce", "118f5a54-84aa-7ae0-a1fd-4da350490771"), clockEnv)
	eq(decided.status, 0)
	const applied = run(script("run-review-queue.mjs", "--mode=apply", `--application=${applicationId}`, "--as-of=2026-07-13"))
	eq(applied.status, 0)
	const day0 = run(script("record-service-day0.mjs", applicationId, "--payment-evidence", "paid: invoice CANONICAL-1", "--required-context", "Approved website and business context", "--approval-owner", "Canonical Owner", "--implementation-owner", "Canonical Implementer", "--recorded-at", "2026-07-13T11:00:00.000Z"), clockEnv)
	eq(day0.status, 0)
	const arbitraryClientBefore = treeSnapshot(join(F, "clients"))
	const arbitraryClient = run(script("create-client-sprint.mjs", name))
	neq(arbitraryClient.status, 0)
	deq(treeSnapshot(join(F, "clients")), arbitraryClientBefore)
	const created = run(script("create-client-sprint.mjs", applicationId))
	eq(created.status, 0)

	const DF = join(F, "clients/duplicate-application")
	mkdirSync(DF, {recursive: true})
	cpSync(join(F, folder, "service-application.json"), join(DF, "service-application.json"))
	const duplicateKickoff = run(script("draft-client-kickoff.mjs", folder))
	neq(duplicateKickoff.status, 0)
	mat(duplicateKickoff.stderr, /Client kickoff blocked:.*duplicate service applicationId/i)
	dnm(duplicateKickoff.stderr, /Error:|at file:\/\//)
	const DO = join(F, folder, "duplicate-validation-cockpit.html")
	const DX = run(script("export-client-delivery-cockpit.mjs", folder, `--output=${DO}`))
	eq(DX.status, 0)
	const DXR = JSON.parse(DX.stdout)
	eq(DXR.status, "created")
	eq(DXR.readiness, "draft")
	mat(readFileSync(DO, "utf8"), /duplicate service applicationId/i)
	dnm(DX.stderr, /Error:|at file:\/\//)
	rmSync(DF, {recursive: true, force: true})
	rmSync(DO, {force: true})

	const D = join(F, "data-only-service-root")
	mkdirSync(join(D, "clients"), {recursive: true})
	cpSync(join(F, "contracts"), join(D, "contracts"), {recursive: true})
	cpSync(join(F, folder), join(D, folder), {recursive: true})
	eq(existsSync(join(D, "growth-brain")), false)
	const dataOnlyCheck = run(script("check-client-readiness.mjs", folder), {SERVICE_REPO_ROOT: D})
	eq(dataOnlyCheck.status, 0)
	const dataOnlyReport = JSON.parse(dataOnlyCheck.stdout)
	dnm(dataOnlyReport.warnings.join("\n"), /checklist.*canonical.*(?:labels|structure)|canonical.*checklist.*(?:labels|structure)/i)
	const DE = {...process.env, SERVICE_REPO_ROOT: D}
	const dataOnlyMetrics = spawnSync(process.execPath, [sp("export-growth-metrics.mjs"), `--output=${join(D, "metrics.md")}`], {cwd: D, encoding: "utf8", env: DE})
	eq(dataOnlyMetrics.status, 0, dataOnlyMetrics.stderr)
	const codeConfigPath = join(F, "growth-brain/ops/agency-config.json")
	const codeConfig = JSON.parse(readFileSync(codeConfigPath, "utf8"))
	writeFileSync(codeConfigPath, `${JSON.stringify({...codeConfig, founderName: "Canonical config sentinel"}, null, 2)}\n`)
	mkdirSync(join(D, "growth-brain/ops"), {recursive: true})
	writeFileSync(join(D, "growth-brain/ops/agency-config.json"), `${JSON.stringify({humanDailyReviewCap: 3}, null, 2)}\n`)
	const configModule = pathToFileURL(sp("lib/agency-config.mjs")).href
	const configProbe = spawnSync(process.execPath, ["--input-type=module", "--eval", `import {agencyConfig} from ${JSON.stringify(configModule)}; console.log(JSON.stringify(agencyConfig()));`], {cwd: D, encoding: "utf8", env: DE})
	eq(configProbe.status, 0, configProbe.stderr)
	const mergedConfig = JSON.parse(configProbe.stdout)
	eq(mergedConfig.founderName, "Canonical config sentinel")
	eq(mergedConfig.humanDailyReviewCap, 3)
	writeFileSync(codeConfigPath, `${JSON.stringify(codeConfig, null, 2)}\n`)
	const dataOnlyKit = spawnSync(process.execPath, [sp("check-human-service-kit.mjs")], {cwd: D, encoding: "utf8", env: DE})
	eq(dataOnlyKit.status, 0, dataOnlyKit.stderr)
	eq(JSON.parse(dataOnlyKit.stdout).status, "passed")
	mkdirSync(join(D, "prospects"), {recursive: true})
	writeFileSync(join(D, "prospects/recording-teleprompter.html"), "data-root teleprompter\n")
	writeFileSync(join(D, "prospects/outbox.html"), "data-root outbox\n")
	const dataOnlyParity = spawnSync(process.execPath, [sp("check-market-parity-readiness.mjs"), "--output=parity.md"], {cwd: F, encoding: "utf8", env: DE})
	eq(dataOnlyParity.status, 0, dataOnlyParity.stderr)
	eq(existsSync(join(D, "parity.md")), true)
	eq(existsSync(join(F, "parity.md")), false)
	deq(
		JSON.parse(dataOnlyParity.stdout).blockers.some(blocker => blocker.area === "Workflow depth"),
		false
	)
	deq(
		JSON.parse(dataOnlyParity.stdout).blockers.some(blocker => blocker.area === "Automation coverage"),
		false
	)
	eq(
		JSON.parse(dataOnlyParity.stdout).blockers.some(blocker => blocker.area === "Comparable price/value"),
		false
	)
	const codeOfferPath = join(F, "growth-brain/offer.md")
	const codeOffer = readFileSync(codeOfferPath, "utf8")
	writeFileSync(codeOfferPath, `${codeOffer}\nWe guarantee 20 qualified leads.\n`)
	const dataOnlyUnsafeClaim = spawnSync(process.execPath, [sp("check-outbound-claim-safety.mjs")], {cwd: D, encoding: "utf8", env: DE})
	neq(dataOnlyUnsafeClaim.status, 0)
	mat(dataOnlyUnsafeClaim.stderr, /generic guarantee/)
	writeFileSync(codeOfferPath, codeOffer)
	const claimBypassPath = join(D, "prospects/private-claim-bypass")
	mkdirSync(claimBypassPath)
	writeFileSync(join(claimBypassPath, "pricing-rules.md"), "We guarantee 20 qualified leads.\n")
	const privateUnsafeClaim = spawnSync(process.execPath, [sp("check-outbound-claim-safety.mjs")], {cwd: D, encoding: "utf8", env: DE})
	neq(privateUnsafeClaim.status, 0)
	mat(privateUnsafeClaim.stderr, /generic guarantee/)
	rmSync(claimBypassPath, {recursive: true})
	writeFileSync(join(D, "prospects/loom-links.txt"), "# No approved rows yet\n")
	writeFileSync(join(F, "TASKS.md"), readFileSync(join(F, "TASKS.md"), "utf8").replace("## Active\n", "## Active\n\n- [ ] Code-root data-only sentinel\n"))
	const dataOnlyDashboard = spawnSync(process.execPath, [sp("export-internal-dashboard.mjs")], {cwd: D, encoding: "utf8", env: DE})
	eq(dataOnlyDashboard.status, 0, dataOnlyDashboard.stderr)
	dnm(dataOnlyDashboard.stderr, /MODULE_NOT_FOUND/)
	mat(readFileSync(join(D, "runs/internal-dashboard.md"), "utf8"), /Code-root data-only sentinel/)

	const benchmarkSource = readFileSync(sp("export-market-benchmark.mjs"), "utf8")
	dnm(benchmarkSource, /\$2,500-\$5,000|Weekly Growth Desk|Full-Stack Growth Desk|Operator[- ]Led Growth Pod|30[- ]day|ad angles? and email/i)
	const paritySource = readFileSync(sp("check-market-parity-readiness.mjs"), "utf8")
	dnm(paritySource, /reports\/week-1-report\.md|requiredFiles\s*>=\s*120|standardSprintPriceRange|fullStackRetainerRange|operatorPodRange/)
	const checked = run(script("check-client-readiness.mjs", folder))
	eq(checked.status, 0)
	const report = JSON.parse(checked.stdout)
	eq(report.status, "draft")
	mat(report.warnings.join("\n"), /not handoff-ready.*day0-ready|day0-ready.*not handoff-ready/i)
	for (const warning of ["Hash-bound human-approved delivery artifact is unavailable", "Claim-proof ledger has no approved claim rows yet", "Delivery scorecard is not filled", "Sprint acceptance checklist is not complete"]) assert(report.warnings.includes(warning))

	const checklistPath = join(F, folder, "quality/sprint-acceptance-checklist.md")
	writeFileSync(checklistPath, "# Sprint acceptance checklist\n\n## Human gates\n\n- [x] Complete\n")
	const truncatedChecklistCheck = run(script("check-client-readiness.mjs", folder))
	eq(truncatedChecklistCheck.status, 0)
	mat(JSON.parse(truncatedChecklistCheck.stdout).warnings.join("\n"), /checklist.*canonical.*(?:labels|structure)|canonical.*checklist.*(?:labels|structure)/i)
	cpSync(join(F, "growth-brain/quality/sprint-acceptance-checklist.md"), checklistPath)

	const deliveryPath = join(F, folder, "deliverables/delivery.md")
	const populatedDelivery = readFileSync(deliveryPath, "utf8")
		.replace(/(## Leak map[\s\S]*?\|---\|---\|---\|---\|\n)\|  \|  \|  \|  \|/, "$1| CTA path is unclear | Primary CTA evidence | High | Clarify CTA |")
		.replace(/(## Before\/after proof[\s\S]*?\|---\|---\|---\|---\|\n)\|  \|  \|  \|  \|/, "$1| Generic CTA | Specific managed IT CTA | Published page | Buyer can choose next step |")
	writeFileSync(deliveryPath, populatedDelivery)
	const populatedCheck = run(script("check-client-readiness.mjs", folder))
	eq(populatedCheck.status, 0)
	const populatedReport = JSON.parse(populatedCheck.stdout)
	dnm(populatedReport.warnings.join("\n"), /Approved delivery has no evidence-linked leak map|Approved delivery has no before\/after proof plan/)
	assert(populatedReport.warnings.includes("Hash-bound human-approved delivery artifact is unavailable"))

	const forgedFolder = join(F, "clients/forged-ready-client")
	mkdirSync(forgedFolder, {recursive: true})
	const forgedApplication = JSON.parse(readFileSync(join(F, folder, "service-application.json"), "utf8"))
	forgedApplication.applicationId = "128f5a54-84aa-7ae0-a1fd-4da350490772"
	writeFileSync(join(forgedFolder, "service-application.json"), `${JSON.stringify(forgedApplication, null, 2)}\n`)
	const forgedCheck = run(script("check-client-readiness.mjs", "clients/forged-ready-client"))
	eq(forgedCheck.status, 0)
	const forgedReport = JSON.parse(forgedCheck.stdout)
	eq(forgedReport.status, "draft")
	mat(forgedReport.warnings.join("\n"), /service-state\.json is missing/i)

	const metricsCheck = run(script("export-growth-metrics.mjs", "--output=growth-brain/live-metrics-test.md"))
	eq(metricsCheck.status, 0)
	const metrics = JSON.parse(metricsCheck.stdout)
	eq(metrics.counts.clients, 1)
	eq(metrics.counts.clientsBlocked, 1)

	assertNarrowGeneratedClient(join(F, folder))

	const intakePath = join(F, folder, "intake.md")
	const sprintPlanPath = join(F, folder, "sprint-plan.md")
	let canonicalIntake = readFileSync(intakePath, "utf8")
		.replace(/^- Name:.*$/m, "- Name: MUTABLE NAME POISON")
		.replace(/^- Website:.*$/m, "- Website: https://mutable.invalid/")
		.replace(/^- Approval owner:.*$/m, "- Approval owner: MUTABLE OWNER POISON")
		.replace(/^- Payment:.*$/m, "- Payment: paid: invoice CANONICAL-1")
	canonicalIntake += "\n- Approval contact: Stale Contact\n- Payment / written approval: stale payment\n"
	writeFileSync(intakePath, canonicalIntake)
	let canonicalSprintPlan = readFileSync(sprintPlanPath, "utf8")
		.replace(/^- Highest-leverage page:.*$/m, "- Highest-leverage page: https://example.com/canonical-page")
		.replace(/^- Intake:.*$/m, "- Intake: PRIVATE STATUS TEXT")
	canonicalSprintPlan += "\n## Wedge\n\n- stale wedge\n"
	writeFileSync(sprintPlanPath, canonicalSprintPlan)
	writeFileSync(join(F, folder, "buyer-room.md"), "# Tampered Buyer Room\n\n## The sprint\n\nFull-Stack Growth Desk across three pages.\n\n## Timing and price\n\n30 days for $500.\n")

	const privateReportPath = join(F, folder, "reports/week-1-report.md")
	const privateLearningsPath = join(F, folder, "brain/weekly-learnings.md")
	mkdirSync(dirname(privateReportPath), {recursive: true})
	writeFileSync(privateReportPath, "# Private report\n\n## Summary\n\nPRIVATE CLIENT REPORT TEXT\n")
	writeFileSync(privateLearningsPath, "# Private weekly learning\n\nPRIVATE WEEKLY LEARNING TEXT\n")

	for (const args of [
		["scripts/draft-client-kickoff.mjs", folder],
		["scripts/export-client-delivery-cockpit.mjs", folder]
	]) {
		const result = run(args)
		eq(result.status, 0)
	}

	for (const output of [join(F, folder, "kickoff-message.md"), join(F, folder, "delivery-cockpit.html")]) {
		const content = readFileSync(output, "utf8")
		mat(content, /Canonical Owner|paid: invoice CANONICAL-1|canonical-page/i)
		dnm(content, /Stale Contact|stale payment|stale wedge/)
	}

	const PP = join(F, "prospects/private-proof-marker")
	mkdirSync(PP, {recursive: true})
	writeFileSync(join(PP, "metadata.json"), `${JSON.stringify({name: "PRIVATE PROSPECT NAME", vertical: "PRIVATE PROSPECT VERTICAL"})}\n`)
	writeFileSync(join(PP, "pipeline.json"), `${JSON.stringify({stage: "replied", notes: [{date: "2026-07-13", action: "replied", note: "PRIVATE PROSPECT NOTE"}]})}\n`)
	writeFileSync(join(PP, "lead-score.md"), "- Score: PRIVATE PROSPECT SCORE\n- Priority: record\n")
	const proofExport = run(script("export-proof-library.mjs", "--output=growth-brain/proof-library-test.md"))
	eq(proofExport.status, 0)

	const proofLibraryOutput = readFileSync(join(F, "growth-brain/proof-library-test.md"), "utf8")
	mat(proofLibraryOutput, /private prospect or client folders/i)
	dnm(proofLibraryOutput, /Nora Shah|Signal Ridge IT|https:\/\/example\.invalid\/?|canonical-page|PRIVATE STATUS TEXT|PRIVATE CLIENT REPORT TEXT|PRIVATE WEEKLY LEARNING TEXT|PRIVATE PROSPECT NAME|PRIVATE PROSPECT VERTICAL|PRIVATE PROSPECT NOTE|PRIVATE PROSPECT SCORE/i)

	const kickoffOutput = readFileSync(join(F, folder, "kickoff-message.md"), "utf8")
	mat(kickoffOutput, /Signal Ridge IT/)
	mat(kickoffOutput, /https:\/\/example\.invalid\//)
	mat(kickoffOutput, /Canonical Owner/)
	dnm(kickoffOutput, /MUTABLE (?:NAME|OWNER) POISON|mutable\.invalid/)
	mat(kickoffOutput, /## The sprint/)
	mat(kickoffOutput, /## Timing and price/)
	mat(kickoffOutput, /\$1,000 founder pilot/)
	eq((kickoffOutput.match(/\$1,000 founder pilot/g) ?? []).length, 1)
	const deliveryOutput = readFileSync(join(F, folder, "deliverables/delivery.md"), "utf8")
	mat(deliveryOutput, /The first 3 clients are exactly \*\*\$1,000 founder pilots\*\*\./)
	mat(kickoffOutput, /Day 0 starts only after payment, required context, approval owner, and implementation owner/)
	eq((kickoffOutput.match(/Day 0 starts only after payment, required context, approval owner, and implementation owner/g) ?? []).length, 1)
	dnm(kickoffOutput, /^## Scope/m)
	dnm(kickoffOutput, /Full-Stack Growth Desk|three pages|30 days|\$500/)
	const cockpitOutput = readFileSync(join(F, folder, "delivery-cockpit.html"), "utf8")
	mat(cockpitOutput, /14-Day Tracking/)
	dnm(cockpitOutput, /week-1-report/i)

	const conversionBefore = treeSnapshot(join(F, "clients"))
	const converted = run(script("convert-prospect-to-client.mjs", "prospects/retired-fixture", "--force"))
	neq(converted.status, 0)
	mat(converted.stderr, /prospect conversion is retired/)
	deq(treeSnapshot(join(F, "clients")), conversionBefore)
	console.log("Client readiness contract checks passed.")
} finally {
	deq(treeSnapshot(join(R, "clients")), sourceSnapshot.clients)
	deq(treeSnapshot(join(R, "prospects")), sourceSnapshot.prospects)
	rmSync(F, {recursive: true, force: true})
}
