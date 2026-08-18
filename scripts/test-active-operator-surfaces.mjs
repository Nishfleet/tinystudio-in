import assert from "node:assert/strict"
import {spawnSync} from "node:child_process"
import {createHash} from "node:crypto"
import {cpSync, existsSync, mkdirSync, mkdtempSync, readFileSync, readdirSync, rmSync, statSync, symlinkSync, unlinkSync, writeFileSync} from "node:fs"
import {tmpdir} from "node:os"
import {dirname, join, relative} from "node:path"
import {fileURLToPath, pathToFileURL} from "node:url"
import {ACTIVE_OPERATOR_ARTIFACTS} from "./lib/service-contract.mjs"
import {staleGeneratedArtifacts} from "./lib/review-queue.mjs"

const C = dirname(dirname(fileURLToPath(import.meta.url)))
const T = mkdtempSync(join(tmpdir(), "tinystudio-active-operator-surfaces-"))
const sp = name => join(T, "scripts", name)
const LOOM = "https://www.loom.com/share/1234567890abcdef1234567890abcdef"
const {equal: eq, deepEqual: deq, notEqual: neq, match: mat, doesNotMatch: dnm, ok} = assert
const trackedArtifactDate = readFileSync(join(C, "growth-brain/ops/proof-library.md"), "utf8").match(/^Generated:\s*(\d{4}-\d{2}-\d{2})$/m)?.[1]
if (!trackedArtifactDate) throw new Error("Tracked proof library must contain a Generated YYYY-MM-DD date")
const promptlySupport = readFileSync(join(C, "public/promptly/support/index.html"), "utf8")
const promptlySupportHeadings = [...promptlySupport.matchAll(/<h([1-3])\b/gi)].map(match => Number(match[1]))
ok(promptlySupportHeadings.indexOf(2) > promptlySupportHeadings.indexOf(1), "Promptly support must introduce H2 content after its H1")
ok(!promptlySupportHeadings.slice(promptlySupportHeadings.indexOf(1) + 1).some((level, index, levels) => level === 3 && (index === 0 || levels[index - 1] < 2)), "Promptly support must not skip H2 before content H3 headings")
const fixedClockImport = pathToFileURL(sp("lib/test-fixed-clock.mjs")).href
const retiredSurfacePattern =
	/npm run\s+owned:|npm run\s+(?:retention:checkups|client:weekly-loop|value:stress)|client brain|convert a won prospect|filled weekly report|won sprint\(s\) with close package and won note|(?:weekly|full-stack) growth desk|weekly client value loop|every closed deal becomes a client sprint folder|convert the prospect into a client sprint folder/i
const privateRuntimeArtifacts = ["daily-money-mission.md", "daily-money-mission.html", "growth-cockpit.html", "growth-doctor.md", "internal-dashboard.md", "internal-dashboard.html", "market-proof-run-check.md", "market-proof-cockpit.md", "market-proof-cockpit.html", "market-learning-review.md", "market-learning-review.html"].map(name => `runs/${name}`)
const retiredTrackedPrivateArtifacts = privateRuntimeArtifacts.map(path => `growth-brain/ops/${path.slice("runs/".length)}`)
const retiredBroadServiceArtifacts = ["full-stack-growth-map.md", "full-stack-growth-map.html", "metrics-dashboard.md", "owned-handoff-loom-cockpit.md", "owned-handoff-loom-cockpit.html", "owned-product-case-studies.md", "owned-product-case-studies.html", "owned-product-live-signals.md", "owned-product-live-signals.html", "owned-product-metrics-update.md", "owned-product-workflow-proofs.md", "owned-product-workflow-proofs.html", "owned-proof-review.md", "owned-proof-review.html", "retention-checkups.md", "retention-dashboard.html", "value-retention-stress-test.md", "weekly-client-value-loop.md"].map(name => `growth-brain/ops/${name}`)

function fixedEnv() {
	return {...process.env, NODE_OPTIONS: [process.env.NODE_OPTIONS, `--import=${fixedClockImport}`].filter(Boolean).join(" "), SERVICE_REPO_ROOT: T, SERVICE_TEST_NOW: `${trackedArtifactDate}T12:00:00.000+05:30`, TZ: "Asia/Kolkata"}
}

function run(args) {
	return spawnSync(process.execPath, args, {cwd: T, encoding: "utf8", env: fixedEnv()})
}

function writeJson(path, value) {
	mkdirSync(dirname(path), {recursive: true})
	writeFileSync(path, `${JSON.stringify(value, null, 2)}\n`)
}

function hashTree(root) {
	const hashes = {}
	function visit(directory) {
		if (!existsSync(directory)) return
		for (const entry of readdirSync(directory, {withFileTypes: true}).sort((left, right) => left.name.localeCompare(right.name))) {
			const path = join(directory, entry.name)
			if (entry.isDirectory()) visit(path)
			else hashes[relative(root, path)] = createHash("sha256").update(readFileSync(path)).digest("hex")
		}
	}
	visit(root)
	return hashes
}

try {
	for (const path of [...retiredTrackedPrivateArtifacts, ...retiredBroadServiceArtifacts]) eq(existsSync(join(C, path)), false, `Retired operator artifact remains active: ${path}`)
	mat(readFileSync(join(C, "growth-brain/ops/historical/README.md"), "utf8"), /not active product truth/)
	for (const directory of ["scripts", "growth-brain", "contracts", "docs"]) {
		cpSync(join(C, directory), join(T, directory), {recursive: true})
	}
	for (const file of ["TASKS.md", "PRODUCT.md", "AGENT_WORKFLOW.md", "MEMORY.md", "README.md", "package.json"]) {
		cpSync(join(C, file), join(T, file))
	}
	mkdirSync(join(T, "prospects"), {recursive: true})
	mkdirSync(join(T, "clients"), {recursive: true})

	const trackedArtifacts = new Map(ACTIVE_OPERATOR_ARTIFACTS.map(path => [path, readFileSync(join(C, path))]))
	for (const path of ACTIVE_OPERATOR_ARTIFACTS) rmSync(join(T, path), {force: true})
	writeFileSync(join(T, "growth-brain/ops/11-10-proof-run.md"), "regeneration sentinel\n")
	// Live metrics must regenerate from an empty prospect root so its tracked
	// zero counts stay byte-identical, but the tracked 11/10 proof-run brief
	// refuses to regenerate from a state-less root. Give the surface gate one
	// inert outbound pipeline record (no score, touches, or loom) so the brief
	// regenerates through the real path; it is removed again afterwards.
	for (const args of [
		["scripts/export-growth-metrics.mjs"],
	]) {
		const regenerated = run(args)
		eq(regenerated.status, 0, regenerated.stderr || regenerated.stdout)
	}
	writeJson(join(T, "prospects", "surface-fixture", "metadata.json"), {name: "Surface Fixture", slug: "surface-fixture", website: "https://example.com/surface", vertical: "managed-it-cybersecurity", contact: "Founder"})
	writeJson(join(T, "prospects", "surface-fixture", "pipeline.json"), {stage: "new", createdAt: "2026-08-01", sentAt: "", sentChannel: "", lastChannel: "", lastTouchAt: "", nextFollowUpAt: "", followUps: [], touches: [], notes: []})
	for (const args of [
		["scripts/export-market-proof-run.mjs"],
		["scripts/check-market-proof-run.mjs"],
		["scripts/export-sender-setup-guide.mjs"],
		["scripts/export-proof-library.mjs"],
		["scripts/export-market-benchmark.mjs"],
		["scripts/export-market-proof-cockpit.mjs"],
		["scripts/export-market-learning-review.mjs"],
		["scripts/export-growth-doctor.mjs"],
		["scripts/export-growth-cockpit.mjs"],
		["scripts/export-internal-dashboard.mjs"],
		["scripts/export-daily-money-mission.mjs"],
		["scripts/export-market-proof-run.mjs"],
		["scripts/check-market-parity-readiness.mjs"]
	]) {
		const regenerated = run(args)
		eq(regenerated.status, 0, regenerated.stderr || regenerated.stdout)
	}
	// Nested gate and metrics chains inside the loop regenerated live metrics
	// with the surface fixture counted. The byte-identical gate needs the
	// canonical empty-prospect view back, so drop the fixture and regenerate
	// the two tracked surfaces that read prospect counts.
	rmSync(join(T, "prospects", "surface-fixture"), {recursive: true, force: true})
	for (const args of [
		["scripts/export-growth-metrics.mjs"],
		["scripts/check-market-parity-readiness.mjs"]
	]) {
		const regenerated = run(args)
		eq(regenerated.status, 0, regenerated.stderr || regenerated.stdout)
	}
	for (const [path, expected] of trackedArtifacts) {
		eq(existsSync(join(T, path)), true, `Generator did not recreate ${path}`)
		deq(readFileSync(join(T, path)), expected, `Tracked generated artifact is stale: ${path}`)
	}
	for (const path of privateRuntimeArtifacts) eq(existsSync(join(T, path)), true, `Private runtime artifact is missing: ${path}`)

	// The eight remaining export scripts (retired broad-service writers and
	// client runtime writers) must honor --help/-h the same way: exit 0 with
	// usage, and never write or overwrite tracked, runtime, or retired
	// artifacts — including never seeding owned client folders.
	const remainingHelpSurface = [
		"export-client-channel-readiness.mjs",
		"export-client-repeatable-workflow.mjs",
		"export-client-weekly-report.mjs",
		"export-full-stack-growth-map.mjs",
		"export-owned-handoff-loom-cockpit.mjs",
		"export-owned-product-case-studies.mjs",
		"export-owned-product-workflow-proofs.mjs",
		"export-owned-startup-proof-capture.mjs",
		"export-recording-cockpit.mjs",
		"export-recording-queue.mjs",
		"export-recording-rehearsal-check.mjs",
		"export-recording-teleprompter.mjs"
	]
	// The growth/ops exporters that overwrite tracked ACTIVE_OPERATOR_ARTIFACTS
	// must also honor --help/-h: the same exit 0 + usage contract, and they
	// must not silently rewrite any tracked artifact (live-metrics,
	// proof-library, market-parity-readiness, 11-10-proof-run, sender-setup-guide,
	// competitive-proof-matrix, market-parity-benchmark-2026) when asked for
	// help instead of a real run.
	const trackedOpsHelpSurface = [
		"check-market-parity-readiness.mjs",
		"export-growth-metrics.mjs",
		"export-internal-dashboard.mjs",
		"export-market-benchmark.mjs",
		"export-market-proof-run.mjs",
		"export-proof-library.mjs",
		"export-sender-setup-guide.mjs"
	]
	const artifactBeforeHelp = new Map(
		[...trackedArtifacts.keys(), ...privateRuntimeArtifacts]
			.filter(path => existsSync(join(T, path)))
			.map(path => [path, readFileSync(join(T, path), "utf8")])
	)
	for (const name of remainingHelpSurface) {
		for (const flag of ["--help", "-h"]) {
			const helped = run([`scripts/${name}`, flag])
			eq(helped.status, 0, `${name} ${flag} must exit 0: ${helped.stderr || helped.stdout}`)
			mat(helped.stdout, /Usage:/, `${name} ${flag} must print usage`)
		}
	}
	for (const name of trackedOpsHelpSurface) {
		for (const flag of ["--help", "-h"]) {
			const helped = run([`scripts/${name}`, flag])
			eq(helped.status, 0, `${name} ${flag} must exit 0: ${helped.stderr || helped.stdout}`)
			mat(helped.stdout, /Usage:/, `${name} ${flag} must print usage`)
		}
	}
	for (const [path, before] of artifactBeforeHelp) {
		deq(readFileSync(join(T, path), "utf8"), before, `${path} must not be rewritten by --help/-h`)
	}
	for (const path of retiredBroadServiceArtifacts) {
		eq(existsSync(join(T, path)), false, `--help/-h must not recreate retired artifact ${path}`)
	}
	eq(existsSync(join(T, "clients/ai-converter")), false, "--help/-h must not make export-owned-startup-proof-capture seed owned client folders")

	// The owned-* and client writers must refuse output paths that escape the
	// service root, without creating the file outside it.
	mkdirSync(join(T, "clients", "escape-probe"), {recursive: true})
	for (const args of [
		["scripts/export-owned-handoff-loom-cockpit.mjs", `--output=${join(T, "..", "escape-owned-handoff.md")}`],
		["scripts/export-owned-product-case-studies.mjs", `--output=${join(T, "..", "escape-owned-studies.md")}`],
		["scripts/export-owned-product-workflow-proofs.mjs", `--output=${join(T, "..", "escape-owned-workflow.md")}`],
		["scripts/export-client-repeatable-workflow.mjs", "clients/escape-probe", `--output=${join(T, "..", "escape-workflow.md")}`],
		["scripts/export-client-weekly-report.mjs", "clients/escape-probe", `--output=${join(T, "..", "escape-weekly.md")}`],
		["scripts/export-growth-metrics.mjs", `--output=${join(T, "..", "escape-live-metrics.md")}`],
		["scripts/export-proof-library.mjs", `--output=${join(T, "..", "escape-proof-library.md")}`],
		["scripts/export-sender-setup-guide.mjs", `--output=${join(T, "..", "escape-sender-setup.md")}`, `--html=${join(T, "..", "escape-sender-setup.html")}`],
		["scripts/export-market-benchmark.mjs", `--output=${join(T, "..", "escape-benchmark.md")}`, `--ops=${join(T, "..", "escape-matrix.md")}`, `--html=${join(T, "..", "escape-matrix.html")}`],
		["scripts/export-market-proof-run.mjs", `--output=${join(T, "..", "escape-proof-run.md")}`],
		["scripts/check-market-parity-readiness.mjs", `--output=${join(T, "..", "escape-parity.md")}`]
	]) {
		const refused = run(args)
		neq(refused.status, 0, `${args[0]} must refuse an escaping output path`)
		mat(refused.stderr, /Refusing/, `${args[0]} must explain the refusal`)
	}
	for (const escapePath of [
		join(T, "..", "escape-owned-handoff.md"),
		join(T, "..", "escape-owned-studies.md"),
		join(T, "..", "escape-owned-workflow.md"),
		join(T, "..", "escape-workflow.md"),
		join(T, "..", "escape-weekly.md"),
		join(T, "..", "escape-live-metrics.md"),
		join(T, "..", "escape-proof-library.md"),
		join(T, "..", "escape-sender-setup.md"),
		join(T, "..", "escape-sender-setup.html"),
		join(T, "..", "escape-benchmark.md"),
		join(T, "..", "escape-matrix.md"),
		join(T, "..", "escape-matrix.html"),
		join(T, "..", "escape-proof-run.md"),
		join(T, "..", "escape-parity.md")
	]) {
		eq(existsSync(escapePath), false, `escape probe must not create ${escapePath}`)
	}
	rmSync(join(T, "clients", "escape-probe"), {recursive: true, force: true})

	const application = JSON.parse(readFileSync(join(T, "contracts/fixtures/sprint-application.v1.json"), "utf8"))
	const importResult = run(["scripts/import-sprint-application.mjs", "contracts/fixtures/sprint-application.v1.json"])
	eq(importResult.status, 0)

	const I = join(T, "prospects", application.applicationId)
	const O = join(T, "prospects", "outbound-fixture")
	writeJson(join(O, "metadata.json"), {name: "Outbound Fixture", slug: "outbound-fixture", website: "https://example.com/managed-services", vertical: "managed-it-cybersecurity", contact: "Founder"})
	writeJson(join(O, "pipeline.json"), {stage: "new", followUps: [], touches: [], notes: []})
	const brokenProspectPath = join(T, "prospects", "broken-outbound")
	writeJson(join(brokenProspectPath, "metadata.json"), {name: "Broken outbound fixture"})
	const blockedMetrics = run(["scripts/export-growth-metrics.mjs", "--output=runs/blocked-metrics.md"])
	eq(blockedMetrics.status, 0)
	mat(blockedMetrics.stderr, /records skipped; repair required:.*broken-outbound: missing pipeline\.json/)
	eq(JSON.parse(blockedMetrics.stdout).counts.prospectsTotal, 1)
	rmSync(brokenProspectPath, {recursive: true})
	const danglingMarker = join(O, "service-application.json")
	symlinkSync(join(T, "missing-service-application.json"), danglingMarker)
	const isolatedPaths = run(["scripts/batch-score-prospects.mjs", "--validate-template"])
	neq(isolatedPaths.status, 0)
	deq(JSON.parse(isolatedPaths.stdout).paths, [])
	neq(run(["scripts/draft-prospect-message.mjs", O]).status, 0)
	unlinkSync(danglingMarker)

	const initialProspectHashes = hashTree(I)
	const queueDryRun = run(["scripts/run-review-queue.mjs", "--dry-run", "--scope", "all"])
	eq(queueDryRun.status, 0)
	ok(JSON.parse(queueDryRun.stdout).items.some(item => item.applicationId === application.applicationId))

	const metricsExport = run(["scripts/export-growth-metrics.mjs", "--output=runs/isolation-metrics.md"])
	eq(metricsExport.status, 0)
	eq(JSON.parse(metricsExport.stdout).counts.prospectsTotal, 1)

	const unpaidClientPath = join(T, "clients", "unpaid-fixture")
	mkdirSync(unpaidClientPath, {recursive: true})
	writeFileSync(join(unpaidClientPath, "intake.md"), "- Name: Unpaid Fixture\n")
	const commandCenter = run(["scripts/show-growth-command-center.mjs"])
	eq(commandCenter.status, 0)
	const CC = JSON.parse(commandCenter.stdout)
	eq(CC.counts.clients, 0)
	eq(CC.counts.clientsBlocked, 1)
	eq(CC.clients.length, 0)
	eq(CC.clientIntegrity.length, 1)
	ok(CC.todayFocus.every(item => !item.startsWith("Client: Unpaid Fixture")))

	const scoreTemplate = run(["scripts/batch-score-prospects.mjs", "--validate-template"])
	eq(scoreTemplate.status, 0)
	deq(JSON.parse(scoreTemplate.stdout).paths, ["prospects/outbound-fixture"])
	writeFileSync(join(O, "lead-score.md"), "- Score: 14/16\n- Priority: record\n")

	for (const args of [["scripts/enrich-prospect-contact-plan-batch.mjs", "--dry-run", "--offline"], ["scripts/prepare-recording-batch.mjs", "--offline", "--skip-mission", "--limit=5"], ["scripts/export-daily-money-mission.mjs"], ["scripts/normalize-outbound-templates.mjs"]]) {
		eq(run(args).status, 0)
	}
	const loomLinksPath = join(T, "prospects/loom-links.txt")
	const preservedLoomRow = `${O}|${LOOM}|approved|Reviewed fault|Reviewed impact|Reviewed fix|Reviewed ask`
	writeFileSync(loomLinksPath, `${preservedLoomRow}\n`)
	eq(run(["scripts/export-market-proof-run.mjs", "--skip-kit"]).status, 0)
	eq(run(["scripts/check-market-proof-run.mjs"]).status, 0)
	mat(readFileSync(loomLinksPath, "utf8"), new RegExp(preservedLoomRow.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")))
	const dashboardExport = run(["scripts/export-internal-dashboard.mjs"])
	eq(dashboardExport.status, 0)
	eq(run(["scripts/export-growth-cockpit.mjs"]).status, 0)
	const dashboard = JSON.parse(dashboardExport.stdout)
	eq(dashboard.status, "attention-needed")
	eq(dashboard.serviceQueue.status, "attention-needed")
	eq(dashboard.serviceQueue.clientsBlocked, 1)
	eq(run(["scripts/check-market-parity-readiness.mjs"]).status, 0)
	const kitPath = sp("check-human-service-kit.mjs")
	const kitSource = readFileSync(kitPath, "utf8")
	writeFileSync(kitPath, "console.error(JSON.stringify({ status: 'failed', checkedFiles: 0, allowedCommands: 0, failures: ['fixture failure'] })); process.exit(1);\n")
	const failedParity = run(["scripts/check-market-parity-readiness.mjs", "--output=runs/failed-parity.md"])
	eq(failedParity.status, 0, failedParity.stderr)
	ok(JSON.parse(failedParity.stdout).blockers.some(blocker => blocker.area === "Workflow depth"))
	writeFileSync(kitPath, kitSource)

	for (const artifact of ACTIVE_OPERATOR_ARTIFACTS) {
		dnm(readFileSync(join(T, artifact), "utf8"), retiredSurfacePattern)
	}
	const currentDate = trackedArtifactDate
	const liveMetrics = readFileSync(join(T, "growth-brain/ops/live-metrics.md"), "utf8")
	const growthDoctor = readFileSync(join(T, "runs/growth-doctor.md"), "utf8")
	const ID = readFileSync(join(T, "runs/internal-dashboard.md"), "utf8")
	const IH = readFileSync(join(T, "runs/internal-dashboard.html"), "utf8")
	for (const artifact of [liveMetrics, growthDoctor, ID, IH]) {
		mat(artifact, new RegExp(`Generated:? ${currentDate}`))
	}
	mat(liveMetrics, /\| Clients \| 0 \|/)
	mat(liveMetrics, /\| Client records blocked \| 1 \|/)
	mat(growthDoctor, /\| Clients \| 0 \|/)
	mat(growthDoctor, /\| Client records blocked \| 1 \|/)
	dnm(growthDoctor, /Client: Unpaid Fixture/)
	const skippedDoctorPath = "runs/skipped-growth-doctor.md"
	eq(run(["scripts/export-growth-doctor.mjs", "--no-checks", `--output=${skippedDoctorPath}`]).status, 0)
	const skippedDoctor = readFileSync(join(T, skippedDoctorPath), "utf8")
	mat(skippedDoctor, /Not verified\. Checks were skipped/)
	mat(skippedDoctor, /Checks were skipped; no warnings were collected\./)
	dnm(skippedDoctor, /Ready\. The workflow checks passed\./)
	mat(ID, /\| Clients \| 0 \|/)
	mat(ID, /\| Client records blocked \| 1 \|/)
	mat(IH, /<b>0<\/b><span>Clients<\/span>/)
	mat(IH, /<b>1<\/b><span>Client records blocked<\/span>/)
	dnm(IH, /Client: Unpaid Fixture/)
	mat(readFileSync(join(T, "runs/growth-cockpit.html"), "utf8"), /Outbound Fixture/)
	mat(readFileSync(join(T, "runs/market-proof-run-check.md"), "utf8"), /1234567890abcdef1234567890abcdef/)
	const privateSentinels = ["Outbound Fixture", "outbound-fixture", "Unpaid Fixture", "1234567890abcdef1234567890abcdef", "Reviewed fault"]
	for (const artifact of ACTIVE_OPERATOR_ARTIFACTS) {
		const content = readFileSync(join(T, artifact), "utf8")
		for (const sentinel of privateSentinels) eq(content.includes(sentinel), false, `${artifact} contains private sentinel ${sentinel}`)
	}

	const DC = join(T, "dashboard-cwd")
	mkdirSync(join(DC, "prospects"), {recursive: true})
	const rootedProspect = spawnSync(process.execPath, [sp("create-prospect-audit.mjs"), "Rooted Prospect"], {cwd: DC, encoding: "utf8", env: fixedEnv()})
	eq(rootedProspect.status, 0, rootedProspect.stderr)
	eq(existsSync(join(T, "prospects/rooted-prospect/metadata.json")), true)
	eq(existsSync(join(DC, "prospects/rooted-prospect")), false)
	eq(statSync(join(T, "prospects/rooted-prospect")).mode & 0o777, 0o700)
	eq(statSync(join(T, "prospects/rooted-prospect/metadata.json")).mode & 0o777, 0o600)
	rmSync(join(T, "prospects/rooted-prospect"), {recursive: true})
	writeFileSync(join(DC, "TASKS.md"), "## Active\n\n- [ ] CWD-only dashboard poison\n")
	writeFileSync(join(DC, "prospects/loom-links.txt"), "prospects/cwd-only|${LOOM}|approved|CWD fault|CWD impact detail|CWD fix detail|CWD ask detail\n")
	writeFileSync(join(T, "prospects/loom-links.txt"), "# Service-root proof rows are intentionally empty\n")
	const tasksPath = join(T, "TASKS.md")
	writeFileSync(tasksPath, readFileSync(tasksPath, "utf8").replace("## Active\n", "## Active\n\n- [ ] Service-root dashboard sentinel\n"))
	const DD = spawnSync(process.execPath, [sp("export-internal-dashboard.mjs"), "--output=runs/divergent-dashboard.md", "--html=runs/divergent-dashboard.html"], {cwd: DC, encoding: "utf8", env: fixedEnv()})
	eq(DD.status, 0, DD.stderr)
	eq(JSON.parse(DD.stdout).marketProof.rows, 0)
	const DM = readFileSync(join(T, "runs/divergent-dashboard.md"), "utf8")
	mat(DM, /Service-root dashboard sentinel/)
	dnm(DM, /CWD-only dashboard poison/)
	const DCC = spawnSync(process.execPath, [sp("show-growth-command-center.mjs")], {cwd: DC, encoding: "utf8", env: fixedEnv()})
	eq(DCC.status, 0, DCC.stderr)
	const DCD = JSON.parse(DCC.stdout)
	eq(DCD.counts.prospectsTotal, 1)
	ok(DCD.activeTasks.includes("Service-root dashboard sentinel"))
	ok(!DCD.activeTasks.includes("CWD-only dashboard poison"))

	for (const directory of ["growth-brain/workflows", "growth-brain/retention"]) {
		for (const file of readdirSync(join(T, directory)).filter(name => name.endsWith(".md"))) {
			const content = readFileSync(join(T, directory, file), "utf8")
			if (retiredSurfacePattern.test(content)) {
				mat(content.slice(0, 500), /^# Retired:[\s\S]*\*\*Status: Retired historical reference\.\*\*/)
			}
		}
	}

	const agencyConfigPath = join(T, "growth-brain/ops/agency-config.json")
	const agencyConfig = JSON.parse(readFileSync(agencyConfigPath, "utf8"))
	const missingDeliverablesConfig = {...agencyConfig}
	delete missingDeliverablesConfig.includedDeliverables
	writeJson(agencyConfigPath, missingDeliverablesConfig)
	neq(run(["scripts/check-agency-defaults.mjs"]).status, 0)
	writeJson(agencyConfigPath, agencyConfig)
	writeJson(agencyConfigPath, {...agencyConfig, noGuarantees: agencyConfig.noGuarantees.filter(item => item !== "sales-volume")})
	neq(run(["scripts/check-agency-defaults.mjs"]).status, 0)
	writeJson(agencyConfigPath, agencyConfig)
	const liveMetricsPath = join(T, "growth-brain/ops/live-metrics.md")
	const productTruth = run(["scripts/check-product-truth.mjs"])
	eq(productTruth.status, 0, productTruth.stderr || productTruth.stdout)
	writeFileSync(liveMetricsPath, liveMetrics.replace("| Clients | 0 |", "| Clients | unknown |"))
	neq(run(["scripts/check-product-truth.mjs"]).status, 0)
	writeFileSync(liveMetricsPath, liveMetrics)

	const offerPath = join(T, "growth-brain/offer.md")
	const OC = readFileSync(offerPath, "utf8")
	writeFileSync(offerPath, OC.replace(/sales-volume/g, "sales outcomes"))
	neq(run(["scripts/check-product-truth.mjs"]).status, 0)
	writeFileSync(offerPath, OC)
	writeFileSync(offerPath, `${OC}\nNeither revenue nor rankings are guaranteed.\n`)
	eq(run(["scripts/check-outbound-claim-safety.mjs"]).status, 0)
	for (const claim of [
		"guaranteed results in 7 days",
		"we guarantee 20 qualified leads",
		"guaranteed placement",
		"No pressure we guarantee 20 qualified leads",
		"We guarantee 20 qualified leads, with no guarantees beyond that",
		"Neither results are guaranteed, placement is guaranteed",
		"Neither timelines nor results are promised, placement is guaranteed"
	]) {
		writeFileSync(offerPath, `${OC}\n${claim}\n`)
		const check = run(["scripts/check-outbound-claim-safety.mjs"])
		neq(check.status, 0)
		mat(check.stderr, /generic guarantee/)
	}
	writeFileSync(offerPath, OC)

	const dailyWorkflowPath = join(T, "growth-brain/workflows/daily-sales-workflow.md")
	const dailyWorkflow = readFileSync(dailyWorkflowPath, "utf8")
	writeFileSync(dailyWorkflowPath, dailyWorkflow.replaceAll("founder-led Managed IT/MSP/cybersecurity", "founder-led service businesses"))
	neq(run(["scripts/check-product-truth.mjs"]).status, 0)
	writeFileSync(dailyWorkflowPath, dailyWorkflow)

	const trackedProofPath = join(T, "growth-brain/ops/proof-library.md")
	const trackedProof = readFileSync(trackedProofPath, "utf8")
	assert.throws(() => staleGeneratedArtifacts(T, "2026-02-31"), /real YYYY-MM-DD/)
	deq(staleGeneratedArtifacts(T, currentDate), [])
	writeFileSync(trackedProofPath, trackedProof.replace(`Generated: ${currentDate}`, "Generated: 2026-05-29"))
	const staleArtifacts = staleGeneratedArtifacts(T, currentDate)
	ok(staleArtifacts.some(artifact => artifact.startsWith("growth-brain/ops/proof-library.md (generated 2026-05-29")))
	writeFileSync(trackedProofPath, trackedProof)

	rmSync(unpaidClientPath, {recursive: true, force: true})
	dnm(readFileSync(join(T, "TASKS.md"), "utf8").split("\n## Done")[0], retiredSurfacePattern)
	const proofLibrary = readFileSync(join(T, "growth-brain/ops/proof-library.md"), "utf8")
	mat(proofLibrary, /Private prospect-derived proof is intentionally excluded/)
	mat(proofLibrary, /Private client-derived proof is intentionally excluded/)
	const proofRun = readFileSync(join(T, "growth-brain/ops/11-10-proof-run.md"), "utf8")
	mat(proofRun, /external consented application, human fit approval, and validated paid Day 0/)
	mat(proofRun, /14-day tracking gate has hash-bound evidence and human-approved customer usefulness and acceptance/)
	mat(ID, /human-review service queue/)
	mat(ID, /1 active item\(s\)/)
	mat(ID, /npm run service:queue -- --scope all/)

	for (const args of [
		["scripts/draft-prospect-message.mjs", I],
		["scripts/draft-loom-package.mjs", I],
		["scripts/draft-loom-recording-script.mjs", I],
		["scripts/draft-recording-sharpness-brief.mjs", I],
		["scripts/draft-sales-call-prep.mjs", I],
		["scripts/enrich-prospect-contact-plan.mjs", I],
		["scripts/add-prospect-loom-link.mjs", I, "${LOOM}"],
		["scripts/update-prospect-pipeline.mjs", I, "new"],
		["scripts/prepare-prospect-send.mjs", I, "${LOOM}", "--approved"],
		["scripts/prepare-prospect-reply.mjs", I],
		["scripts/prepare-prospect-call-booked.mjs", I, "--time", "2026-07-15T10:00:00.000Z"],
		["scripts/prepare-prospect-close-package.mjs", I, "--payment", "https://pay.example.com/founder-pilot"]
	]) {
		neq(run(args).status, 0)
	}
	deq(hashTree(I), initialProspectHashes)
	console.log("Active operator surface checks passed.")
} finally {
	rmSync(T, {recursive: true, force: true})
}
