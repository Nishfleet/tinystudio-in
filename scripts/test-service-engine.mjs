#!/usr/bin/env node
import assert from "node:assert/strict"
const {equal: eq, deepEqual: deq, notEqual: neq, match: mat, throws: thr, doesNotThrow: dnt} = assert
import {spawn, spawnSync} from "node:child_process"
import {chmodSync, cpSync, existsSync as ex, lstatSync, mkdirSync as md, mkdtempSync, readFileSync as rf, readdirSync, renameSync as rn, rmSync as rm, statSync, symlinkSync as sl, unlinkSync as un, utimesSync, writeFileSync as wf} from "node:fs"
import {tmpdir} from "node:os"
import {dirname, join, relative} from "node:path"
import {pathToFileURL} from "node:url"
import {ALLOWED_COMMANDS, acquireLock, atomicWriteJson as aw, decisionHashFor, isRfc3339Timestamp, minifiedJson, queueInputHashFor, resolveRepoPath, schemaDigest, sha256, sourceHashForApplicant, validateAffirmativePaymentEvidence, validateApplication, validateDecision} from "./lib/service-contract.mjs"
import {
	CLAIMS_POLICY_VERSION,
	NO_GUARANTEE_DISCLAIMER,
	WORK_PACKET_VERSION,
	appendReviewCapLedgerEntry,
	appendStateTransition,
	applyQueue as applyQueueWithClock,
	buildQueue as buildQueueWithClock,
	checkQueue as checkQueueWithClock,
	contextHistoryHash,
	createReviewCapJournal,
	decisionPathFor,
	prepareQueue as prepareQueueWithClock,
	queuePaths,
	reviewCapJournalPath,
	reviewCapLedgerPath,
	serviceDeadlineAt,
	validateStageEvidence
} from "./lib/review-queue.mjs"
import {assertCanonicalFounderPilotCohort, assertClientScaffold, FOUNDER_PILOT} from "./lib/client-scaffold.mjs"
import {createPromotionJournal, promotionMarkerPath, validatePromotionJournal} from "./lib/service-promotion-journal.mjs"
import {commitJournaledTransition, transitionJournalRecord} from "./lib/service-transition-journal.mjs"
import {addBusinessDaysToTimestamp, businessMillisecondsBetween, localEndOfIsoDate, localIsoDate, timestampIsOnOrBeforeLocalDate} from "./date-utils.mjs"

const AS_OF_DATE = "2026-07-29"
const DECISION_TEST_NOW = "2026-07-13T12:00:00.000+05:30"
const QUEUE_TEST_NOW = "2026-07-29T12:00:00.000+05:30"
const T10 = "2026-07-13T10:00:00.000Z"
const T11 = "2026-07-13T11:00:00.000Z"
const T12 = "2026-07-13T12:00:00.000Z"
const T13 = "2026-07-13T13:00:00.000Z"
const PAGE = "https://www.example.com/managed-services"
const EVIDENCE = "https://evidence.example.com"
const LOOM = "https://www.loom.com/share/1234567890abcdef1234567890abcdef"
const METRIC = "Primary call-to-action path count"
const BASELINE = "Three competing actions"
const DECISIONS = "service-decisions"
const GROWTH = "growth-brain"
const BACKUP = "scripts/service-state-backup.mjs"
const DECIDE = "scripts/record-service-decision.mjs"
const DAY0 = "scripts/record-service-day0.mjs"
const IMPORT = "scripts/import-sprint-application.mjs"
const REPAIR = "scripts/repair-service-transition.mjs"
const RESUME = "scripts/record-service-resume.mjs"
const QUEUE = "scripts/run-review-queue.mjs"
const R = mkdtempSync(join(tmpdir(), "tinystudio-service-test-"))
const rp = (...parts) => join(R, ...parts)
const rj = path => JSON.parse(rf(path, "utf8"))
const sf = folder => join(folder, "service-state.json")
const df = folder => join(folder, "service-day0.json")
const rs = folder => rj(sf(folder))
const fixedClockImport = pathToFileURL(join(process.cwd(), "scripts/lib/test-fixed-clock.mjs")).href
const serviceOptions = (options = {}) => ({repoRoot: R, asOfDate: AS_OF_DATE, ...options, trustedDate: AS_OF_DATE})
const bq = options => buildQueueWithClock(serviceOptions(options))
const prepQ = options => prepareQueueWithClock(serviceOptions(options))
const aq = options => applyQueueWithClock(serviceOptions(options))
const checkQueue = options => checkQueueWithClock(serviceOptions(options))
const paidDay0Args = (id, invoice, context = "approved context", recordedAt = T10) => [id, "--payment-evidence", `paid: invoice ${invoice}`, "--required-context", context, "--approval-owner", "Founder", "--implementation-owner", "TinyStudio", "--recorded-at", recordedAt]

function E(testNow = DECISION_TEST_NOW) {
	return {...process.env, NODE_OPTIONS: [process.env.NODE_OPTIONS, `--import=${fixedClockImport}`].filter(Boolean).join(" "), SERVICE_REPO_ROOT: R, SERVICE_TEST_NOW: testNow, TZ: "Asia/Kolkata"}
}

function rna(script, args) {
	return new Promise(resolve => {
		const child = spawn(process.execPath, [join(process.cwd(), script), ...args], {cwd: process.cwd(), env: E(), stdio: ["ignore", "pipe", "pipe"]})
		let stdout = ""
		let stderr = ""
		child.stdout.on("data", chunk => {
			stdout += chunk
		})
		child.stderr.on("data", chunk => {
			stderr += chunk
		})
		child.on("close", status => resolve({status, stdout, stderr}))
	})
}

function rlc(lockPath) {
	const moduleUrl = pathToFileURL(join(process.cwd(), "scripts/lib/service-contract.mjs")).href
	const code = `import { acquireLock } from ${JSON.stringify(moduleUrl)};\ntry {\n  const release = acquireLock(process.argv[1], { staleAfterMs: 0 });\n  console.log("acquired");\n  await new Promise((resolve) => setTimeout(resolve, 1500));\n  release();\n} catch {\n  console.log("blocked");\n  process.exitCode = 2;\n}`
	return new Promise(resolve => {
		const child = spawn(process.execPath, ["--input-type=module", "--eval", code, lockPath], {encoding: "utf8", stdio: ["ignore", "pipe", "pipe"]})
		let stdout = ""
		let stderr = ""
		child.stdout.on("data", chunk => {
			stdout += chunk
		})
		child.stderr.on("data", chunk => {
			stderr += chunk
		})
		child.on("close", status => resolve({status, stdout, stderr}))
	})
}

function run(script, args = [], env = {...process.env, SERVICE_REPO_ROOT: R}) {
	return spawnSync(process.execPath, [join(process.cwd(), script), ...args], {cwd: process.cwd(), env, encoding: "utf8"})
}

function snap(root) {
	const result = {}
	function walk(path) {
		if (!ex(path)) return
		for (const entry of readdirSync(path, {withFileTypes: true}).sort((a, b) => a.name.localeCompare(b.name))) {
			const absolute = join(path, entry.name)
			if (entry.isDirectory()) walk(absolute)
			else result[relative(root, absolute)] = sha256(rf(absolute))
		}
	}
	walk(root)
	return result
}

function dv(item, decision, suffix) {
	const decidedAt = new Date(Date.parse(item.reviewNotBefore) + 60_000).toISOString()
	const value = {
		contract: "tinystudio.review-decision",
		schemaVersion: 1,
		schemaDigest: schemaDigest(R, "decision"),
		applicationId: item.applicationId,
		sourceHash: item.sourceHash,
		packetHash: item.packetHash,
		queueInputHash: item.queueInputHash,
		reviewerLabel: "Test reviewer",
		decision,
		note: `Human reviewed ${item.state} fixture`,
		decidedAt,
		decisionNonce: `028f5a54-84aa-7ae0-a1fd-4da35049${String(700 + suffix).padStart(4, "0")}`
	}
	value.decisionHash = decisionHashFor(value)
	validateDecision(value, {repoRoot: R, expected: {applicationId: item.applicationId, sourceHash: item.sourceHash, packetHash: item.packetHash, queueInputHash: item.queueInputHash}})
	return value
}

function rd(item, decision, suffix) {
	const value = dv(item, decision, suffix)
	const path = decisionPathFor(R, item.applicationId, item.state, item.queueInputHash)
	appendReviewCapLedgerEntry(R, value, item.state)
	aw(path, value)
	return {path, value}
}

function d0(args) {
	const result = run(DAY0, args)
	eq(result.status, 0, result.stderr)
	return JSON.parse(result.stdout)
}

function rr(args) {
	const result = run(RESUME, args)
	eq(result.status, 0)
	return JSON.parse(result.stdout)
}

function repair(id) {
	const result = run(REPAIR, [id])
	eq(result.status, 0)
	return JSON.parse(result.stdout)
}

function dc(id, decision, note, extra = []) {
	const current = bq().items.find(item => item.applicationId === id)
	const decidedAt = new Date(Date.parse(current.reviewNotBefore) + 60_000).toISOString()
	const result = run(DECIDE, [id, "--decision", decision, "--reviewer", "CLI reviewer", "--note", note, "--decided-at", decidedAt, ...extra], E())
	eq(result.status, 0, result.stderr)
	return JSON.parse(result.stdout)
}

function lvc(repoRootValue, clientPath, now = "2026-07-30T12:00:00.000Z") {
	const moduleUrl = pathToFileURL(join(process.cwd(), "scripts/lib/validated-service-client.mjs")).href
	const source = `import { loadValidatedServiceClient } from ${JSON.stringify(moduleUrl)}; console.log(JSON.stringify(loadValidatedServiceClient(${JSON.stringify(repoRootValue)}, ${JSON.stringify(clientPath)})));`
	const result = spawnSync(process.execPath, ["--import", fixedClockImport, "--input-type=module", "--eval", source], {cwd: process.cwd(), env: {...process.env, SERVICE_REPO_ROOT: repoRootValue, SERVICE_TEST_NOW: now, TZ: "Asia/Kolkata"}, encoding: "utf8"})
	eq(result.status, 0)
	return JSON.parse(result.stdout)
}

function rdc(id, decision, note, expectedError) {
	const current = bq().items.find(item => item.applicationId === id)
	const decidedAt = new Date(Date.parse(current.reviewNotBefore) + 60_000).toISOString()
	const before = snap(R)
	const result = run(DECIDE, [id, "--decision", decision, "--reviewer", "CLI reviewer", "--note", note, "--decided-at", decidedAt], E())
	neq(result.status, 0)
	mat(result.stderr, expectedError)
	deq(snap(R), before)
	eq(ex(rp(current.decisionPath)), false)
}

function ec(id, args, expectSuccess = true) {
	const result = run("scripts/record-service-evidence.mjs", [...args, id])
	if (expectSuccess) eq(result.status, 0, result.stderr)
	else neq(result.status, 0)
	return result
}

function clone(base, id) {
	const clone = structuredClone(base)
	clone.applicationId = id
	const path = rp(`${id}.json`)
	wf(path, `${JSON.stringify(clone)}\n`)
	const result = imp(path)
	un(path)
	return result
}

function imp(input) {
	const result = run(IMPORT, [input])
	eq(result.status, 0)
	return JSON.parse(result.stdout)
}

function rimp(input, expectedError) {
	const before = snap(R)
	const result = run(IMPORT, [input])
	neq(result.status, 0)
	mat(result.stderr, expectedError)
	deq(snap(R), before)
	return result
}

function vao(item) {
	const preparedAt = new Date(Date.parse(item.reviewNotBefore) + 60_000).toISOString()
	const sectionIds = ["hero", "proof", "offer", "implementation", "final-cta"]
	const actionIds = new Set(["hero", "final-cta"])
	const sections = sectionIds.map(sectionId => ({
		sectionId,
		heading: `${sectionId} reviewed section`,
		body: "Reviewed evidence supports this full section and one buyer action.",
		ctaLabel: actionIds.has(sectionId) ? "Request review" : "",
		ctaTarget: actionIds.has(sectionId) ? "/request-review" : ""
	}))
	const pageArtifact = {kind: "complete-rewrite", titleTag: "Managed IT Support With One Clear Path", metaDescription: "Managed IT scope, proof, ownership, and one clear request path.", sections}
	const pageFix = {mode: "rewrite", pageUrl: PAGE, beforeSummary: "Proof and next action are disconnected.", artifact: pageArtifact, rationale: "Clarifies one evidence-backed action."}
	const implementationArtifact = {
		kind: "complete-implementation-change-set",
		pageUrl: PAGE,
		pageFixHash: sha256(minifiedJson(pageArtifact)),
		changeSet: [{target: "Selected page", operation: "replace", sourceSectionIds: sectionIds, instructions: "Apply all reviewed sections in order; preserve design, analytics, and forms.", acceptanceCheck: "All sections, actions, analytics, and forms work."}],
		applyInstructions: "Use only the reviewed artifact on this page; preserve design, analytics, and forms, then run all checks before human review.",
		verificationChecks: ["Verify section order.", "Verify action and form routing.", "Capture reviewed proof."]
	}
	return {
		contract: "tinystudio.agent-work-output",
		schemaVersion: WORK_PACKET_VERSION,
		applicationId: item.applicationId,
		sourceHash: item.sourceHash,
		packetHash: item.packetHash,
		workPacketHash: item.agentWork.workPacketHash,
		preparedAt,
		preparedBy: "Codex test agent",
		status: "ready-for-review",
		missingContext: null,
		deliverables: {
			leakMap: {selectedPageUrl: PAGE, items: [{leak: "Offer and next step conflict.", impact: "Buyers cannot see one action.", priority: "high", evidenceIds: ["page-capture"]}]},
			pageFix,
			searchTrust: {changes: [{change: "Align title and heading intent.", implementation: "Use one reviewed evidence phrase.", evidenceIds: ["page-capture"]}]},
			proof: {beforeEvidenceIds: ["page-capture"], afterCapturePlan: "Recapture the selected page regions.", comparisonCriteria: "Compare clarity, proof, action, and scope."},
			loom: {recordingOwner: "TinyStudio", outline: ["Show the evidence.", "Explain boundaries."]},
			measurement: {metric: "Primary action count", baselineValue: "Three", baselineEvidenceIds: ["page-capture"], comparisonWindow: "Baseline to day 14", successSignal: "One primary action remains."},
			implementation: {route: "implementation-pass", owner: "TinyStudio", artifact: implementationArtifact, steps: ["Apply and verify the page."]},
			revisionBoundary: {includedRevisions: 1, boundary: "One consolidated revision included.", outOfScope: "Extra pages or revisions need new scope."},
			tracking: {days: 14, owner: "TinyStudio", checkpoints: ["Confirm implementation.", "Record day-14 evidence."], recordTemplate: "Record status, baseline, result, usefulness, and next step."}
		},
		evidence: [{id: "page-capture", claim: "The page has three actions.", sourceUrl: PAGE, capturedAt: preparedAt, status: "observed"}],
		claims: [{text: "The rewrite clarifies one action.", evidenceIds: ["page-capture"], risk: "low"}],
		claimsPolicy: {policyVersion: CLAIMS_POLICY_VERSION, disclaimer: NO_GUARANTEE_DISCLAIMER, approvalMode: "human-only"}
	}
}

function nia(item) {
	const output = vao(item)
	return {
		...output,
		status: "needs-input",
		missingContext: {fields: ["approved-cms-access", "current-form-destination"], reason: "CMS access and form routing are missing.", request: "Provide CMS access and the form destination."},
		deliverables: null,
		evidence: [],
		claims: []
	}
}

function writeEvidence(item, signalsFor, recordedAtMs = 0, recordedBy = "Test reviewer") {
	const folder = rp(item.sourcePath)
	const state = rs(folder)
	const day0 = rj(df(folder))
	const approvedEntry = [...state.transitionHistory].reverse().find(entry => entry.to === "client-approved" && entry.artifactPath)
	const approvedArtifact = approvedEntry ? rj(rp(approvedEntry.artifactPath)) : null
	const recordedAt = new Date(recordedAtMs || Date.parse(item.reviewNotBefore || state.updatedAt) + 60_000).toISOString()
	const evidence = {contract: "tinystudio.service-stage-evidence", schemaVersion: 1, applicationId: item.applicationId, sourceHash: item.sourceHash, stage: item.state, recordedAt, recordedBy, signals: signalsFor({state, approvedArtifact, recordedAt})}
	validateStageEvidence(evidence, {
		application: {applicationId: item.applicationId, sourceHash: item.sourceHash},
		state: item.state,
		approvedArtifactHash: state.approvedArtifactHash || "",
		approvedArtifact,
		implementationAcceptedAt: state.implementationAcceptedAt || "",
		implementationBaseline: item.implementationBaseline,
		pauseHistory: day0.pauseHistory,
		activePause: day0.activePause,
		asOfDate: AS_OF_DATE,
		notBefore: state.updatedAt
	})
	aw(join(folder, "service-evidence", item.state, `${item.contextRevision}.json`), evidence)
	return evidence
}

function rco(item, clientOutcome, clientFeedback) {
	eq(item.state, "client-approved")
	return writeEvidence(item, ({state}) => ({clientOutcome, clientFeedback, implementationOwner: clientOutcome === "approved" ? "TinyStudio" : "", reviewedArtifactHash: state.approvedArtifactHash}), 0, "Test client reviewer")
}

function implementationSignals({state, approvedArtifact, recordedAt}, revision = false) {
	return {
		approvedArtifactHash: state.approvedArtifactHash,
		implementationStatus: "implemented",
		acceptanceStatus: revision ? "revision-requested" : "accepted",
		usefulnessScore: revision ? 7 : 9,
		usefulnessNote: revision ? "Client requested the included consolidated revision." : "Client confirmed the delivered change is useful.",
		implementationArtifactUrl: approvedArtifact.deliverables.leakMap.selectedPageUrl,
		beforeEvidenceUrl: `${EVIDENCE}/before/managed-services.png`,
		afterEvidenceUrl: `${EVIDENCE}/after/managed-services.png`,
		loomUrl: LOOM,
		measurementBaseline: {metric: METRIC, value: BASELINE, sourceUrl: `${EVIDENCE}/baseline/managed-services.json`, capturedAt: new Date(Date.parse(recordedAt) - 60_000).toISOString()}
	}
}

function rse(item) {
	if (item.state === "client-approved") {
		rco(item, "approved", "Client approved this reviewed artifact for implementation.")
		return
	}
	const state = rs(rp(item.sourcePath))
	let recordedAtMs = Date.parse(item.reviewNotBefore || state.updatedAt) + 60_000
	if (item.state === "tracking-14-day") recordedAtMs = Math.max(recordedAtMs, Date.parse(state.implementationAcceptedAt) + 14 * 86400000)
	writeEvidence(
		item,
		context =>
			item.state === "implementation"
				? implementationSignals(context)
				: {
						trackedThrough: context.recordedAt,
						implementationStatus: "implemented",
						acceptanceConfirmed: true,
						usefulnessScore: 9,
						recurringNeedObserved: true,
						continuationNote: "A recurring measurement need was observed.",
						trackingRecordUrl: `${EVIDENCE}/tracking/managed-services-day-14.json`,
						measurementResult: {metric: METRIC, baseline: BASELINE, result: "One consistent primary action", sourceUrl: `${EVIDENCE}/results/managed-services-day-14.json`}
					},
		recordedAtMs
	)
}

function rrr(item) {
	eq(item.state, "implementation")
	writeEvidence(item, context => implementationSignals(context, true), 0, "Test client reviewer")
}

function lockOwner(path, pid, token) {
	wf(join(path, "owner"), `${JSON.stringify({pid, token, createdAt: "2026-07-13T00:00:00.000Z"})}\n`)
}
const setWebsite = website => candidate => { candidate.applicant.website = website }

try {
	cpSync(join(process.cwd(), "contracts"), rp("contracts"), {recursive: true})
	md(rp(GROWTH, "ops"), {recursive: true})
	aw(rp(GROWTH, "ops", "agency-config.json"), {manualDailySendCap: 1000, humanDailyReviewCap: 1000})
	const fixtureInput = process.env.SERVICE_FIXTURE_INPUT || "contracts/fixtures/sprint-application.v1.json"
	if (!ex(fixtureInput)) throw new Error(`service fixture input is missing: ${fixtureInput}`)
	const application = rj(fixtureInput)
	const appId = application.applicationId
	const fixtureDecision = rj("contracts/fixtures/review-decision.v1.json")
	validateApplication(application, {repoRoot: R})
	for (const website of ["https://example.invalid:65535/", "https://127.0.0.1/", "https://[::1]/", "https://[2001:db8::1]/", "https://[::ffff:c000:201]/", "https://[::ffff:0:c000:201]/", "https://[2001:db8::c000:201]/", "https://sub_domain.example/", "https://xn--mnich-kva.example/%C3%BCber-uns"]) {
		const validWebsiteApplication = structuredClone(application)
		validWebsiteApplication.applicant.website = website
		validWebsiteApplication.sourceHash = sourceHashForApplicant(validWebsiteApplication.applicant)
		dnt(() => validateApplication(validWebsiteApplication, {repoRoot: R}))
	}

	dnt(() =>
		assertCanonicalFounderPilotCohort([
			{applicationId: "later-sorting-id", day0: {...FOUNDER_PILOT, pilotSequence: 1, day0StartedAt: "2026-07-13T10:00:00.000+05:30"}},
			{applicationId: "earlier-sorting-id", day0: {...FOUNDER_PILOT, pilotSequence: 2, day0StartedAt: "2026-07-13T10:00:00.000+05:30"}}
		])
	)

	const implementationEvidenceApprovedArtifact = {deliverables: {leakMap: {selectedPageUrl: PAGE}, pageFix: {pageUrl: PAGE}}}
	const implementationEvidenceFixture = {
		contract: "tinystudio.service-stage-evidence", schemaVersion: 1, applicationId: appId, sourceHash: application.sourceHash, stage: "implementation", recordedAt: "2026-07-13T17:00:00.000+05:30", recordedBy: "Evidence reviewer",
		signals: {approvedArtifactHash: sha256(minifiedJson(implementationEvidenceApprovedArtifact)), implementationStatus: "implemented", acceptanceStatus: "accepted", usefulnessScore: 9, usefulnessNote: "Client accepted the reviewed implementation.", implementationArtifactUrl: PAGE, beforeEvidenceUrl: `${EVIDENCE}/proof/page.png?utm_source=before#before`, afterEvidenceUrl: `${EVIDENCE}/proof/page.png?utm_source=after#after`, loomUrl: LOOM, measurementBaseline: {metric: METRIC, value: BASELINE, sourceUrl: `${EVIDENCE}/baseline/managed-services.json`, capturedAt: "2026-07-13T16:59:00.000+05:30"}}
	}
	const implementationEvidenceContext = {application, state: "implementation", approvedArtifactHash: implementationEvidenceFixture.signals.approvedArtifactHash, approvedArtifact: implementationEvidenceApprovedArtifact}
	thr(() => validateStageEvidence(implementationEvidenceFixture, implementationEvidenceContext), /distinct proof resources/)
	const invalidLoomEvidence = structuredClone(implementationEvidenceFixture)
	invalidLoomEvidence.signals.afterEvidenceUrl = `${EVIDENCE}/proof/page-after.png`
	invalidLoomEvidence.signals.loomUrl = "https://www.loom.com/"
	thr(() => validateStageEvidence(invalidLoomEvidence, implementationEvidenceContext), /share or embed recording/)
	for (const [field, invalid, expected] of [
		["approvedArtifactHash", "0".repeat(64), /implementation approved artifact hash mismatch/],
		["implementationArtifactUrl", "https://www.example.com/other-page", /approved selected page/]
	]) {
		const candidate = structuredClone(invalidLoomEvidence)
		Object.assign(candidate.signals, {[field]: invalid, loomUrl: LOOM})
		thr(() => validateStageEvidence(candidate, implementationEvidenceContext), expected)
	}

	for (const timestamp of ["2026-02-31T09:30:00.000Z", "2026-07-13T24:00:00.000Z", "2026-07-13T09:30:00.000+24:00"]) eq(isRfc3339Timestamp(timestamp), false)
	eq(isRfc3339Timestamp("2024-02-29T09:30:00.000+05:30"), true)
	const impossibleCalendarApplication = {...application, submittedAt: "2026-02-31T09:30:00.000Z"}
	thr(() => validateApplication(impossibleCalendarApplication, {repoRoot: R}), /invalid submittedAt/)
	const impossibleCalendarDecision = {...fixtureDecision, decidedAt: "2026-02-31T09:30:00.000Z"}
	thr(() => validateDecision(impossibleCalendarDecision, {repoRoot: R}), /invalid decidedAt/)
	thr(() => transitionJournalRecord({applicationId: appId, kind: "day0", createdAt: "2026-02-31T09:30:00.000Z", beforeState: {}, afterState: {}}), /createdAt is invalid/)
	const currentLocalDate = localIsoDate()
	const nextLocalMidnight = new Date(localEndOfIsoDate(currentLocalDate) + 1).toISOString()
	eq(timestampIsOnOrBeforeLocalDate(nextLocalMidnight, currentLocalDate), false)
	eq(addBusinessDaysToTimestamp("2026-07-17T10:00:00.000Z", 7), "2026-07-28T10:00:00.000Z")
	eq(businessMillisecondsBetween("2026-07-11T10:00:00.000Z", "2026-07-12T10:00:00.000Z"), 0)
	eq(serviceDeadlineAt("2026-07-10T10:00:00.000+05:30", [{reason: "Weekend client delay", startedAt: "2026-07-11T10:00:00.000+05:30", endedAt: "2026-07-12T10:00:00.000+05:30", durationMs: 86400000}]), "2026-07-21T10:00:00.000+05:30")
	eq(serviceDeadlineAt("2026-07-16T00:15:00.000+05:30"), "2026-07-27T00:15:00.000+05:30")

	const futureApplication = {...application, applicationId: "018f5a54-84aa-7ae0-a1fd-4da350490779", submittedAt: nextLocalMidnight}
	const futureApplicationPath = rp("future-application.json")
	wf(futureApplicationPath, `${JSON.stringify(futureApplication)}\n`)
	const futureImportBefore = snap(R)
	const futureImport = run(IMPORT, [futureApplicationPath])
	neq(futureImport.status, 0)
	deq(snap(R), futureImportBefore)
	un(futureApplicationPath)

	const extraApplication = structuredClone(application)
	extraApplication.unexpected = true
	thr(() => validateApplication(extraApplication, {repoRoot: R}), /unexpected or missing fields/)
	const extraApplicant = structuredClone(application)
	extraApplicant.applicant.unexpected = true
	thr(() => validateApplication(extraApplicant, {repoRoot: R}), /unexpected or missing fields/)
	const oversizedPacket = structuredClone(application)
	oversizedPacket.qualification.packet.fitReasons = Array(6).fill("reason")
	thr(() => validateApplication(oversizedPacket, {repoRoot: R}), /too many items/)

	for (const [name, mutate, expectedError] of [
		["extra-applicant-field", candidate => { candidate.applicant.unexpected = true }, /applicant has unexpected or missing fields/],
		["numeric-applicant-field", candidate => { candidate.applicant.name = 42 }, /applicant\.name must be a string/],
		["non-http-website", setWebsite("ftp://example.invalid/"), /invalid applicant\.website/],
		["credential-website", setWebsite("https://user:secret@example.invalid/"), /invalid applicant\.website/],
		["missing-authority-slash", setWebsite("https:/example.com"), /invalid applicant\.website/],
		["missing-authority-slashes", setWebsite("https:example.com"), /invalid applicant\.website/],
		["empty-authority", setWebsite("https:///path"), /invalid applicant\.website/],
		["missing-website-host", setWebsite("https://?foo/"), /invalid applicant\.website/],
		["out-of-range-website-port", setWebsite("https://example.invalid:65536/"), /invalid applicant\.website/],
		["invalid-bracket-website-host", setWebsite("https://[foo]/"), /invalid applicant\.website/],
		["invalid-ipv6-website-host", setWebsite("https://[::::]/"), /invalid applicant\.website/],
		["invalid-numeric-website-host", setWebsite("https://999.999.999.999/"), /invalid applicant\.website/],
		["invalid-numeric-final-label", setWebsite("https://foo.123/"), /invalid applicant\.website/]
	]) {
		const candidate = structuredClone(application)
		mutate(candidate)
		const inputPath = rp(`${name}.json`)
		wf(inputPath, `${JSON.stringify(candidate)}\n`)
		rimp(inputPath, expectedError)
		eq(ex(rp("prospects", candidate.applicationId)), false)
		un(inputPath)
	}

	for (const [name, field, value] of [
		["uppercase-email", "workEmail", application.applicant.workEmail.toUpperCase()],
		["decomposed-unicode", "name", "Jose\u0301 Rivera"],
		["crlf-whitespace", "targetBuyer", "Founder-led MSPs\r\n  with a live website"],
		["idn-url", "website", "https://münich.example/über-uns"],
		["fqdn-url", "website", "https://example.com./"],
		["port-url", "website", "https://example.invalid:000080/"],
		["empty-port", "website", "https://example.invalid:/"]
	]) {
		const candidate = structuredClone(application)
		candidate.applicationId = `018f5a54-84aa-7ae0-a1fd-4da35049${name === "uppercase-email" ? "0781" : name === "decomposed-unicode" ? "0782" : "0783"}`
		candidate.applicant[field] = value
		candidate.sourceHash = sourceHashForApplicant(candidate.applicant)
		const inputPath = rp(`${name}.json`)
		wf(inputPath, `${JSON.stringify(candidate)}\n`)
		rimp(inputPath, /invalid applicant\.website|applicant must already use canonical/)
		eq(ex(rp("prospects", candidate.applicationId)), false)
		un(inputPath)
	}

	const reorderedApplicantApplication = structuredClone(application)
	reorderedApplicantApplication.applicationId = "018f5a54-84aa-7ae0-a1fd-4da350490784"
	reorderedApplicantApplication.applicant = Object.fromEntries(Object.entries(reorderedApplicantApplication.applicant).reverse())
	const reorderedApplicantInput = rp("reordered-canonical-applicant.json")
	wf(reorderedApplicantInput, `${JSON.stringify(reorderedApplicantApplication)}\n`)
	const rootMetadata = rp(DECISIONS, ".DS_Store")
	md(dirname(rootMetadata), {recursive: true})
	wf(rootMetadata, "")
	imp(reorderedApplicantInput)
	un(rootMetadata)
	un(reorderedApplicantInput)
	eq(ex(rp("prospects", reorderedApplicantApplication.applicationId)), true)
	rm(rp("prospects", reorderedApplicantApplication.applicationId), {recursive: true, force: true})

	for (const [qualificationState, applicationId] of [
		["pending", "018f5a54-84aa-7ae0-a1fd-4da350490771"],
		["failed", "018f5a54-84aa-7ae0-a1fd-4da350490772"]
	]) {
		const candidate = structuredClone(application)
		candidate.applicationId = applicationId
		candidate.qualification = {state: qualificationState, packetHash: "", promptVersion: application.qualification.promptVersion, packet: null}
		const inputPath = rp(`${qualificationState}-qualification.json`)
		wf(inputPath, `${JSON.stringify(candidate)}\n`)
		rimp(inputPath, new RegExp(`qualification must be ready before import; received ${qualificationState}`))
		eq(ex(rp("prospects", applicationId)), false)
		un(inputPath)
	}

	const localFixturePath = rp("service-fixture-input.json")
	wf(localFixturePath, `${JSON.stringify(application)}\n`)
	const orphanLedgerInitTemp = `${reviewCapLedgerPath(R)}.tmp-999-018f5a54-84aa-4ae0-a1fd-4da350490700`
	md(dirname(orphanLedgerInitTemp), {recursive: true})
	wf(orphanLedgerInitTemp, "{\n")
	const imported = imp(localFixturePath)
	eq(imported.applicationId, appId)
	eq(imported.sourceHash, application.sourceHash)
	eq(imported.packetHash, application.qualification.packetHash)
	eq(statSync(rp("prospects", appId)).mode & 0o777, 0o700)
	eq(statSync(rp("prospects", appId, "service-application.json")).mode & 0o777, 0o600)
	assert(ex(orphanLedgerInitTemp))
	const decisionRoot = rp(DECISIONS)
	const containedDecisionStore = rp("contained-decision-store")
	rn(decisionRoot, containedDecisionStore)
	sl(containedDecisionStore, decisionRoot, "dir")
	thr(() => bq(), /review decision root must be a real directory/)
	un(decisionRoot)
	rn(containedDecisionStore, decisionRoot)
	const canonicalProspectsRoot = rp("prospects")
	const storedProspects = rp("stored-prospects")
	const emptyProspects = rp("empty-prospects")
	rn(canonicalProspectsRoot, storedProspects)
	md(emptyProspects)
	sl(emptyProspects, canonicalProspectsRoot, "dir")
	const rootLedgerBytes = rf(reviewCapLedgerPath(R))
	const rootSymlinkImport = run(IMPORT, [localFixturePath])
	neq(rootSymlinkImport.status, 0)
	mat(rootSymlinkImport.stderr, /service prospects root must be a real directory/)
	eq(readdirSync(emptyProspects).length, 0)
	deq(rf(reviewCapLedgerPath(R)), rootLedgerBytes)
	un(canonicalProspectsRoot)
	rm(emptyProspects, {recursive: true})
	rn(storedProspects, canonicalProspectsRoot)
	let folder = rp("prospects", appId)
	const storedRecord = rp("stored-service-record")
	rn(folder, storedRecord)
	sl(storedRecord, folder, "dir")
	const folderSymlinkImport = run(IMPORT, [localFixturePath])
	neq(folderSymlinkImport.status, 0)
	mat(folderSymlinkImport.stderr, /service record directory must be a real directory/)
	un(folder)
	rn(storedRecord, folder)
	rn(folder, storedRecord)
	for (const [createSlot, expectedError] of [
		[() => wf(folder, "blocked\n"), /service record slot must be a real directory/],
		[() => eq(spawnSync("mkfifo", [folder]).status, 0), /service record slot must be a real directory/],
		[() => md(folder), /service record is missing its application/]
	]) {
		createSlot()
		const slotImport = run(IMPORT, [localFixturePath])
		neq(slotImport.status, 0)
		mat(slotImport.stderr, expectedError)
		rm(folder, {recursive: true, force: true})
	}
	rn(storedRecord, folder)
	un(localFixturePath)
	const applicationMetadata = rp(DECISIONS, appId, ".DS_Store")
	md(dirname(applicationMetadata), {recursive: true})
	wf(applicationMetadata, "")
	dnt(() => bq())
	rm(dirname(applicationMetadata), {recursive: true})
	const ilp = reviewCapLedgerPath(R)
	const initialLedgerBytes = rf(ilp)
	const missingLedgerApplication = {...application, applicationId: "0e8f5a54-84aa-7ae0-a1fd-4da350490784"}
	const missingLedgerInput = rp("missing-ledger-application.json")
	wf(missingLedgerInput, `${JSON.stringify(missingLedgerApplication)}\n`)
	const containedLedger = rp("contained-review-cap-ledger.json")
	rn(ilp, containedLedger)
	sl(containedLedger, ilp)
	rimp(missingLedgerInput, /review cap ledger must be a regular file/)
	un(ilp)
	rn(containedLedger, ilp)
	un(ilp)
	thr(() => bq(), /review cap ledger is missing/)
	const missingLedgerImportBefore = snap(R)
	const missingLedgerImport = run(IMPORT, [missingLedgerInput])
	neq(missingLedgerImport.status, 0)
	mat(missingLedgerImport.stderr, /review cap ledger is missing/)
	deq(snap(R), missingLedgerImportBefore)
	un(missingLedgerInput)
	wf(ilp, initialLedgerBytes)
	aw(ilp, {})
	thr(() => bq(), /review cap ledger/)
	wf(ilp, initialLedgerBytes)
	deq(rj(join(folder, "service-application.json")), application)
	const importedApplicationPath = join(folder, "service-application.json")
	const importedStatePath = sf(folder)
	const importedApplicationBytes = rf(importedApplicationPath)
	const importedStateBytes = rf(importedStatePath)
	for (const [qualificationState, expectedStatus, expectedReason] of [
		["pending", "needs-input", /requalification required/],
		["failed", "blocked", /qualification failed; requalification required/]
	]) {
		const la = structuredClone(application)
		la.qualification = {state: qualificationState, packetHash: "", promptVersion: application.qualification.promptVersion, packet: null}
		const legacyQueueInputHash = queueInputHashFor({applicationId: la.applicationId, sourceHash: la.sourceHash, packetHash: "", schemaVersion: la.schemaVersion, state: "fit-review"})
		const legacyState = JSON.parse(importedStateBytes)
		legacyState.packetHash = ""
		legacyState.queueInputHash = legacyQueueInputHash
		legacyState.transitionHistory[0].queueInputHash = legacyQueueInputHash
		aw(importedApplicationPath, la)
		aw(importedStatePath, legacyState)
		const guardedItem = bq().items[0]
		eq(guardedItem.status, expectedStatus)
		mat([...guardedItem.blocked, ...guardedItem.needsInput].join("\n"), expectedReason)
		const beforeDecision = snap(R)
		const rejectedDecision = run(DECIDE, [appId, "--decision", "approve", "--reviewer", "Test reviewer", "--note", "Must not review an unqualified application", "--decided-at", application.submittedAt], E())
		neq(rejectedDecision.status, 0)
		mat(rejectedDecision.stderr, new RegExp(`application is not awaiting a human decision: ${expectedStatus}`))
		deq(snap(R), beforeDecision)
		wf(importedApplicationPath, importedApplicationBytes)
		wf(importedStatePath, importedStateBytes)
	}
	for (const [qualificationState, nonceSuffix] of [
		["pending", "0901"],
		["failed", "0902"]
	]) {
		const legacyLedgerBytes = rf(reviewCapLedgerPath(R))
		const la = structuredClone(application)
		la.qualification = {state: qualificationState, packetHash: "", promptVersion: application.qualification.promptVersion, packet: null}
		const fitQueueInputHash = queueInputHashFor({applicationId: la.applicationId, sourceHash: la.sourceHash, packetHash: "", schemaVersion: la.schemaVersion, state: "fit-review"})
		const decidedAt = new Date(Date.parse(application.submittedAt) + 60_000).toISOString()
		const legacyDecision = {
			contract: "tinystudio.review-decision",
			schemaVersion: 1,
			schemaDigest: schemaDigest(R, "decision"),
			applicationId: appId,
			sourceHash: application.sourceHash,
			packetHash: "",
			queueInputHash: fitQueueInputHash,
			reviewerLabel: "Legacy test reviewer",
			decision: "approve",
			note: "Legacy fit approval must not bypass requalification",
			decidedAt,
			decisionNonce: `028f5a54-84aa-7ae0-a1fd-4da35049${nonceSuffix}`
		}
		legacyDecision.decisionHash = decisionHashFor(legacyDecision)
		const legacyDecisionPath = decisionPathFor(R, appId, "fit-review", fitQueueInputHash)
		appendReviewCapLedgerEntry(R, legacyDecision, "fit-review")
		aw(legacyDecisionPath, legacyDecision)
		const legacyState = JSON.parse(importedStateBytes)
		legacyState.state = "approved-awaiting-day0"
		legacyState.packetHash = ""
		legacyState.queueInputHash = fitQueueInputHash
		legacyState.updatedAt = decidedAt
		legacyState.usedDecisionHashes = [legacyDecision.decisionHash]
		legacyState.lastDecisionHash = legacyDecision.decisionHash
		legacyState.lastDecisionState = "fit-review"
		legacyState.transitionHistory[0].queueInputHash = fitQueueInputHash
		legacyState.transitionHistory.push({
			from: "fit-review",
			to: "approved-awaiting-day0",
			kind: "decision",
			at: decidedAt,
			contextRevision: 0,
			deliveryRevision: 0,
			queueInputHash: fitQueueInputHash,
			decisionHash: legacyDecision.decisionHash,
			day0Hash: "",
			evidenceHash: "",
			artifactPath: "",
			artifactHash: "",
			evidencePath: "",
			implementationAcceptedAt: "",
			contextEntry: null,
			contextHash: contextHistoryHash([])
		})
		aw(importedApplicationPath, la)
		aw(importedStatePath, legacyState)
		const advancedItem = bq().items[0]
		eq(advancedItem.state, "approved-awaiting-day0")
		eq(advancedItem.status, "blocked")
		mat(advancedItem.blocked.join("\n"), new RegExp(`qualification ${qualificationState}; requalification required before approved-awaiting-day0`))
		const beforeDay0 = snap(R)
		const rejectedDay0 = run(DAY0, [appId, "--payment-evidence", "paid: invoice FOUNDER-1", "--required-context", "Approved page context", "--approval-owner", "Human owner", "--implementation-owner", "Implementation owner", "--recorded-at", new Date(Date.parse(decidedAt) + 60_000).toISOString()])
		neq(rejectedDay0.status, 0)
		mat(rejectedDay0.stderr, new RegExp(`application is blocked: qualification ${qualificationState}; requalification required before approved-awaiting-day0`))
		deq(snap(R), beforeDay0)
		wf(importedApplicationPath, importedApplicationBytes)
		wf(importedStatePath, importedStateBytes)
		rm(rp(DECISIONS, appId), {recursive: true, force: true})
		wf(reviewCapLedgerPath(R), legacyLedgerBytes)
	}
	const clientDuplicateFolder = rp("clients", appId)
	md(rp("clients"), {recursive: true})
	rn(folder, clientDuplicateFolder)
	const duplicateInputPath = rp("duplicate-application.json")
	wf(duplicateInputPath, `${JSON.stringify(application)}\n`)
	const duplicateImportBefore = snap(R)
	const duplicateClientImport = run(IMPORT, [duplicateInputPath])
	neq(duplicateClientImport.status, 0)
	deq(snap(R), duplicateImportBefore)
	assert(!ex(folder))
	un(duplicateInputPath)
	rn(clientDuplicateFolder, folder)
	cpSync(folder, clientDuplicateFolder, {recursive: true})
	thr(() => bq(), /duplicate service applicationId/)
	rm(clientDuplicateFolder, {recursive: true, force: true})
	const freshStatePath = sf(folder)
	const freshStateBytes = rf(freshStatePath)
	un(freshStatePath)
	const missingStateItem = bq().items[0]
	eq(missingStateItem.status, "blocked")
	mat(missingStateItem.blocked.join("; "), /service-state\.json is missing/)
	wf(freshStatePath, freshStateBytes)
	aw(freshStatePath, {...JSON.parse(freshStateBytes), state: "complete"})
	eq(bq().items[0].status, "blocked")
	wf(freshStatePath, freshStateBytes)
	const prospectsRoot = rp("prospects")
	const realProspectsRoot = rp("prospects-real")
	const outsideRoot = mkdtempSync(join(tmpdir(), "tinystudio-outside-"))
	const outsideBefore = snap(outsideRoot)
	rn(prospectsRoot, realProspectsRoot)
	sl(outsideRoot, prospectsRoot)
	thr(() => bq(), /symlink/)
	const blockedImport = run(IMPORT, [join(process.cwd(), "contracts/fixtures/sprint-application.v1.json")])
	neq(blockedImport.status, 0)
	const blockedDay0 = run(DAY0, [appId, "--payment-evidence", "paid: invoice SYMLINK-1", "--required-context", "context", "--approval-owner", "owner", "--implementation-owner", "impl"])
	neq(blockedDay0.status, 0)
	deq(snap(outsideRoot), outsideBefore)
	un(prospectsRoot)
	rn(realProspectsRoot, prospectsRoot)
	rm(outsideRoot, {recursive: true, force: true})

	const runsRoot = rp("runs")
	const realRunsRoot = rp("runs-real")
	const outsideQueueRoot = mkdtempSync(join(tmpdir(), "tinystudio-outside-queue-"))
	const outsideQueueBefore = snap(outsideQueueRoot)
	rn(runsRoot, realRunsRoot)
	sl(outsideQueueRoot, runsRoot)
	thr(() => prepQ(), /symlink/)
	const blockedQueueImport = run(IMPORT, [join(process.cwd(), "contracts/fixtures/sprint-application.v1.json")])
	neq(blockedQueueImport.status, 0)
	deq(snap(outsideQueueRoot), outsideQueueBefore)
	un(runsRoot)
	rn(realRunsRoot, runsRoot)
	rm(outsideQueueRoot, {recursive: true, force: true})

	const deterministicA = bq()
	const deterministicB = bq()
	deq(deterministicA, deterministicB)
	const fixedQueuePaths = queuePaths(R)
	process.env.SERVICE_QUEUE_DIR = "runs/alternate-service-engine"
	process.env.SERVICE_DECISIONS_DIR = "alternate-service-decisions"
	deq(queuePaths(R), fixedQueuePaths)
	delete process.env.SERVICE_QUEUE_DIR
	delete process.env.SERVICE_DECISIONS_DIR
	eq(deterministicA.items[0].queueInputHash, "410ec74140b8ac899126252a698cd2f4a361b0bf6884814f7e7679a6f3e1c5d2")
	assert(deterministicA.staleArtifacts.length > 0)
	const datedArtifactPath = rp(GROWTH, "ops", "proof-library.md")
	md(rp(GROWTH, "ops"), {recursive: true})
	wf(datedArtifactPath, "Generated: 2099-01-01\n")
	assert(bq().staleArtifacts.some(entry => entry.includes("generated after queue as-of date")))
	wf(datedArtifactPath, "Generated: 2026-02-31\n")
	assert(bq().staleArtifacts.some(entry => entry.includes("generation date is invalid")))
	rm(rp(GROWTH), {recursive: true, force: true})
	md(rp(GROWTH, "ops"), {recursive: true})
	aw(rp(GROWTH, "ops", "agency-config.json"), {manualDailySendCap: 1000, humanDailyReviewCap: 1000})

	const beforeDryRun = snap(R)
	prepQ({dryRun: true})
	aq({dryRun: true})
	thr(() => aq({applicationId: deterministicA.items[0].applicationId, dryRun: true}), /no decision is ready for application/)
	const rejectedApplyPreview = run(QUEUE, ["--mode", "apply", "--application", deterministicA.items[0].applicationId, "--as-of", AS_OF_DATE, "--dry-run"], E(QUEUE_TEST_NOW))
	neq(rejectedApplyPreview.status, 0)
	mat(rejectedApplyPreview.stderr, /no decision is ready for application/)
	deq(snap(R), beforeDryRun)
	const invalidModeBefore = snap(R)
	const invalidMode = run(QUEUE, ["--mode=aply"])
	neq(invalidMode.status, 0)
	deq(snap(R), invalidModeBefore)
	const invalidCheckOption = run("scripts/check-review-queue.mjs", ["--asof", AS_OF_DATE])
	neq(invalidCheckOption.status, 0)
	deq(snap(R), invalidModeBefore)

	let item = deterministicA.items[0]
	validateDecision(fixtureDecision, {repoRoot: R, expected: {applicationId: item.applicationId, sourceHash: item.sourceHash, packetHash: item.packetHash, queueInputHash: item.queueInputHash}})
	eq(fixtureDecision.decisionHash, "e012cd3cfcc2d25d8d2cd8861ed44187523dc864cc13f1e58ae4bac440eda0f5")
	const fitDecision = {path: decisionPathFor(R, item.applicationId, item.state, item.queueInputHash), value: fixtureDecision}
	const fitCli = run(DECIDE, ["--decision", "approve", "--reviewer", "Fixture Reviewer", "--note", "Fit and evidence reviewed for the sanitized end-to-end fixture", "--decided-at", T10, "--nonce", "028f5a54-84aa-7ae0-a1fd-4da350490771", item.applicationId], E())
	eq(fitCli.status, 0)
	deq(rj(fitDecision.path), fixtureDecision)
	const readyApplyPreviewBefore = snap(R)
	const readyApplyPreview = aq({applicationId: item.applicationId, dryRun: true})
	assert(readyApplyPreview.items.some(candidate => candidate.applicationId === item.applicationId && candidate.status === "auto-ready"))
	const readyApplyCliPreview = run(QUEUE, ["--mode", "apply", "--application", item.applicationId, "--as-of", AS_OF_DATE, "--dry-run"], E(QUEUE_TEST_NOW))
	eq(readyApplyCliPreview.status, 0, readyApplyCliPreview.stderr)
	assert(JSON.parse(readyApplyCliPreview.stdout).items.some(candidate => candidate.applicationId === item.applicationId && candidate.status === "auto-ready"))
	deq(snap(R), readyApplyPreviewBefore)
	const extraDecision = {...fitDecision.value, unexpected: true}
	thr(() => validateDecision(extraDecision, {repoRoot: R}), /unexpected or missing fields/)
	const fitDecisionBytes = rf(fitDecision.path)
	prepQ()
	deq(rf(fitDecision.path), fitDecisionBytes)
	aq()
	eq(rs(folder).state, "approved-awaiting-day0")
	deq(rf(fitDecision.path), fitDecisionBytes)
	aq()
	eq(rs(folder).state, "approved-awaiting-day0")

	const replayPath = decisionPathFor(R, appId, "approved-awaiting-day0", bq().items[0].queueInputHash)
	md(dirname(replayPath), {recursive: true})
	sl(fitDecision.path, replayPath)
	thr(() => bq(), /review decision entry must be a regular file/)
	un(replayPath)
	aw(replayPath, fitDecision.value)
	thr(() => bq(), /review cap ledger/)
	thr(() => aq(), /review cap ledger/)
	un(replayPath)

	let result = d0([appId, "--payment-evidence", "paid: invoice FIXTURE-1", "--required-context", "approved-page-and-business-context", "--approval-owner", "Founder reviewer", "--implementation-owner", "TinyStudio", "--pause-reason", "Client access pending", "--pause-started-at", T12, "--recorded-at", T12])
	eq(result.status, "paused-with-reason")
	eq(result.target, `clients/${appId}`)
	eq(ex(folder), false)
	folder = rp("clients", appId)
	eq(ex(folder), true)
	assertClientScaffold(R, folder)
	eq(bq().items[0].status, "needs-input")
	result = rr([appId, "--resumed-at", "2026-07-13T14:00:00.000Z", "--note", "Client access context was supplied."])
	eq(result.status, "day0-ready")
	const day0 = rj(df(folder))
	eq(day0.paymentEvidence, "paid: invoice FIXTURE-1")
	eq(day0.totalPausedMs, 7200000)

	item = bq().items[0]
	eq(item.status, "needs-agent-work")
	prepQ()
	const packetPath = rp(item.agentWork.packetPath)
	let outputPath = rp(item.agentWork.targetIgnoredPath)
	assert(ex(packetPath))
	assert(!ex(outputPath))
	const firstPreparedQueue = rf(queuePaths(R).queueFile)
	prepQ()
	deq(rf(queuePaths(R).queueFile), firstPreparedQueue)
	const preparedPacketBytes = rf(packetPath)
	un(packetPath)
	assert(checkQueue().failures.some(failure => failure.includes("expected agent work packet is missing")))
	wf(packetPath, preparedPacketBytes)

	aw(outputPath, nia(item))
	item = bq().items[0]
	eq(item.status, "needs-review")
	eq(item.agentWorkOutput.status, "needs-input")
	assert(item.needsInput.includes("agent-missing:approved-cms-access"))
	rdc(appId, "approve", "Approve despite missing required context.", /agent work needs-input requires a needs-info human decision/)
	const missingContextDecisionRecord = dc(appId, "needs-info", "Please provide the approved CMS access path and current form destination.")
	const missingContextDecision = rj(missingContextDecisionRecord.decisionPath)
	aq({applicationId: appId})
	eq(rs(folder).state, "needs-info")
	rr([appId, "--resumed-at", new Date(Date.parse(missingContextDecision.decidedAt) + 60_000).toISOString(), "--note", "The approved CMS access path and current form destination were supplied."])
	item = bq().items[0]
	eq(item.state, "day0-ready")
	eq(item.status, "needs-agent-work")
	prepQ()
	outputPath = rp(item.agentWork.targetIgnoredPath)

	const output = vao(item)
	aw(outputPath, output)
	item = bq().items[0]
	eq(item.status, "needs-review")
	assert(/^[a-f0-9]{64}$/.test(item.artifactHash))

	const originalOutput = rf(outputPath)
	const checkOutputMutation = (mutate, verify) => {
		const candidate = structuredClone(output)
		mutate(candidate)
		try {
			aw(outputPath, candidate)
			verify(bq().items[0], candidate)
		} finally {
			wf(outputPath, originalOutput)
		}
	}
	const abo = (mutate, expected) =>
		checkOutputMutation(mutate, ci => {
			eq(ci.status, "blocked")
			mat(ci.blocked.join("\n"), expected)
		})
	const assertReviewableOutput = mutate =>
		checkOutputMutation(mutate, ci => {
			eq(ci.status, "needs-review")
		})

	for (const [mutate, expected] of [
		[candidate => (candidate.deliverables.pageFix.artifact = "Invalid artifact"), /pageFix\.artifact must be a structured complete artifact/],
		[candidate => (candidate.deliverables.pageFix.pageUrl = "https://www.example.com/cybersecurity"), /same selected page/],
		[candidate => Object.assign(candidate.deliverables.leakMap, {selectedPageUrl: "https://www.example.com/?page=managed-services"}) && Object.assign(candidate.deliverables.pageFix, {pageUrl: "https://www.example.com/?page=cybersecurity"}), /same selected page/],
		[candidate => Object.assign(candidate.deliverables.leakMap, {selectedPageUrl: "https://www.example.com/#/managed-services"}) && Object.assign(candidate.deliverables.pageFix, {pageUrl: "https://www.example.com/#/cybersecurity"}), /same selected page/],
		[candidate => Object.assign(candidate.deliverables, {proof: "Invalid proof"}), /agent work deliverables\.proof must be an object/],
		[candidate => (candidate.deliverables.implementation.artifact = "Invalid implementation"), /route-specific structured artifact/],
		[candidate => (candidate.deliverables.implementation.artifact.changeSet[0].sourceSectionIds = ["hero"]), /does not cover reviewed page section/],
		[candidate => (candidate.deliverables.implementation.artifact.pageFixHash = "0".repeat(64)), /pageFixHash mismatch/],
		[candidate => (candidate.claimsPolicy.disclaimer = "No guarantees."), /claimsPolicy disclaimer/],
		[candidate => (candidate.claimsPolicy.approvalMode = "automated"), /approvalMode must be human-only/]
	])
		abo(mutate, expected)
	assertReviewableOutput(candidate => {
		candidate.deliverables.pageFix.pageUrl = "https://www.example.com/managed-services/?utm_source=review#hero"
	})
	assertReviewableOutput(candidate => {
		candidate.deliverables.implementation.route = "dev-ready-handoff"
		candidate.deliverables.implementation.artifact.kind = "developer-ready-handoff"
	})

	const humanReviewOnlyClaims = ["We promise to preserve conversion tracking through deployment.", "We do not guarantee revenue or promise rankings.", "Neither revenue nor rankings are guaranteed.", "We promise to report conversions accurately."]
	for (const text of humanReviewOnlyClaims) {
		checkOutputMutation(
			candidate => {
				candidate.claims[0].text = text
			},
			(ci, candidate) => {
				eq(ci.status, "needs-review")
				deq(ci.blocked, [])
				eq(ci.decision, null)
				deq(ci.agentWorkOutput.claimsPolicy, candidate.claimsPolicy)
				assert(Array.isArray(ci.agentWorkOutput.claimRiskFlags))
			}
		)
	}

	const flaggedOutcomeClaims = [
		"This rewrite will increase conversion lift for the selected page.",
		"We guarantee booked calls from this page rewrite.",
		"No revenue guarantee is made, but rankings will definitely improve after this rewrite.",
		"This rewrite will boost conversions.",
		"No revenue guarantee is made while conversions will rise.",
		"This rewrite will lead directly to more revenue.",
		"No pressure we guarantee booked calls.",
		"Without hesitation we guarantee revenue."
	]
	for (const [index, text] of flaggedOutcomeClaims.entries()) {
		checkOutputMutation(
			candidate => {
				candidate.claims[0].text = text
				candidate.claims[0].risk = "high"
			},
			ci => {
				eq(ci.status, "needs-review")
				assert(ci.agentWorkOutput.claimRiskFlags.some(flag => flag.path === "claims[0].text"))
				if (index === 0) {
					const stateBeforeHumanReview = rf(sf(folder))
					thr(() => aq({applicationId: appId}), /no decision is ready/)
					deq(rf(sf(folder)), stateBeforeHumanReview)
				}
			}
		)
	}

	checkOutputMutation(
		candidate => {
			candidate.sourceHash = "0".repeat(64)
		},
		ci => {
			eq(ci.status, "blocked")
		}
	)

	const staleItem = bq().items[0]
	const staleLedgerBytes = rf(reviewCapLedgerPath(R))
	const staleDecision = rd({...staleItem, queueInputHash: "1".repeat(64)}, "approve", 2)
	eq(bq().items[0].status, "needs-review")
	un(staleDecision.path)
	wf(reviewCapLedgerPath(R), staleLedgerBytes)

	item = bq().items[0]
	const workDecision = rd(item, "approve", 3)
	const schemaTamperedOutput = structuredClone(output)
	schemaTamperedOutput.deliverables.pageFix.artifact.sections[0].body = "This replacement remains structurally complete but changes the exact reviewed hero copy, so the pending human decision must become stale before any state transition can occur."
	schemaTamperedOutput.deliverables.implementation.artifact.pageFixHash = sha256(minifiedJson(schemaTamperedOutput.deliverables.pageFix.artifact))
	aw(outputPath, schemaTamperedOutput)
	eq(bq().items[0].status, "needs-review")
	const schemaTamperState = rf(sf(folder))
	thr(() => aq({applicationId: appId}), /no decision is ready/)
	deq(rf(sf(folder)), schemaTamperState)
	wf(outputPath, originalOutput)
	const originalDecision = rf(workDecision.path)
	const decisionTamperState = rf(sf(folder))
	const decisionTampered = {...JSON.parse(originalDecision), note: "Tampered without recomputing hash."}
	aw(workDecision.path, decisionTampered)
	thr(() => bq(), /decision hash mismatch/)
	thr(() => aq(), /decision hash mismatch/)
	deq(rf(sf(folder)), decisionTamperState)
	wf(workDecision.path, originalDecision)
	const originalDay0 = rf(df(folder))
	const changedDay0 = {...JSON.parse(originalDay0), approvalOwner: "Changed owner"}
	aw(df(folder), changedDay0)
	eq(bq().items[0].status, "blocked")
	thr(() => aq({applicationId: appId}), /no decision is ready/)
	deq(rf(sf(folder)), decisionTamperState)
	wf(df(folder), originalDay0)
	const backupRoundtripParent = mkdtempSync(join(tmpdir(), "tinystudio-backup-roundtrip-"))
	try {
		const snapshot = join(backupRoundtripParent, "snapshot")
		const createdSnapshot = run(BACKUP, ["create", "--output", snapshot])
		eq(createdSnapshot.status, 0, createdSnapshot.stderr)
		const snapshotManifest = rj(join(snapshot, "manifest.json"))
		assert(snapshotManifest.entries.some(entry => entry.type === "file" && entry.path.startsWith("runs/service-engine/outputs/")))
		const restoredRoot = join(backupRoundtripParent, "restored")
		md(restoredRoot)
		for (const root of ["contracts", GROWTH]) cpSync(rp(root), join(restoredRoot, root), {recursive: true})
		for (const root of ["clients", "prospects", DECISIONS, "runs"]) {
			const source = join(snapshot, root)
			if (ex(source)) cpSync(source, join(restoredRoot, root), {recursive: true})
		}
		const restoredEnv = {...E(QUEUE_TEST_NOW), SERVICE_REPO_ROOT: restoredRoot}
		for (const [mode, extra] of [
			["prepare", []],
			["check", []],
			["apply", ["--application", appId]]
		]) {
			const result = run(QUEUE, ["--mode", mode, "--scope", "all", "--as-of", AS_OF_DATE, ...extra], restoredEnv)
			eq(result.status, 0, result.stderr)
		}
		eq(rj(join(restoredRoot, "clients", appId, "service-state.json")).state, "client-approved")
	} finally {
		rm(backupRoundtripParent, {recursive: true, force: true})
	}
	const protectedBefore = snap(rp(DECISIONS))
	aq()
	eq(rs(folder).state, "client-approved")
	deq(snap(rp(DECISIONS)), protectedBefore)
	deq(rf(outputPath), originalOutput)
	deq(rf(workDecision.path), originalDecision)
	const approvedTransition = rs(folder).transitionHistory.findLast(entry => entry.to === "client-approved" && entry.artifactPath)
	mat(approvedTransition.artifactPath, new RegExp(`^clients/${appId}/deliverables/approved/`))
	const materializedApprovedPath = rp(approvedTransition.artifactPath)
	const materializedApprovedBytes = rf(materializedApprovedPath)
	eq(sha256(minifiedJson(JSON.parse(materializedApprovedBytes))), approvedTransition.artifactHash)
	un(outputPath)
	neq(bq().items[0].status, "blocked")
	un(materializedApprovedPath)
	eq(bq().items[0].status, "blocked")
	wf(materializedApprovedPath, materializedApprovedBytes)
	wf(outputPath, originalOutput)

	for (const [expectedState, nextState, suffix] of [
		["client-approved", "implementation", 4],
		["implementation", "tracking-14-day", 5],
		["tracking-14-day", "complete", 6]
	]) {
		item = bq().items[0]
		eq(item.state, expectedState)
		if (expectedState === "implementation") {
			const beforePauseState = rs(folder)
			d0([appId, "--pause-reason", "Implementation dependency paused", "--pause-started-at", "2026-07-13T18:00:00.000Z", "--recorded-at", "2026-07-13T18:00:00.000Z"])
			eq(rs(folder).state, "paused-with-reason")
			rr([appId, "--resumed-at", "2026-07-13T18:15:00.000Z", "--note", "Implementation dependency resolved."])
			const resumedState = rs(folder)
			eq(resumedState.state, expectedState)
			eq(resumedState.contextRevision, beforePauseState.contextRevision + 1)
			item = bq().items[0]
		}
		if (["client-approved", "implementation", "tracking-14-day"].includes(item.state)) {
			eq(item.status, "needs-input")
			rse(item)
			item = bq().items[0]
		}
		eq(item.status, "needs-review")
		rd(item, "approve", suffix)
		aq()
		eq(rs(folder).state, nextState)
	}
	eq(bq().items[0].status, "done")

	const completedStatePath = sf(folder)
	const completedStateBytes = rf(completedStatePath)
	const completedState = JSON.parse(completedStateBytes)
	const divergentCockpitCwd = mkdtempSync(join(tmpdir(), "tinystudio-cockpit-divergent-cwd-"))
	const divergentCockpitOutput = join(folder, "data-root-delivery-cockpit.html")
	try {
		const divergentCockpit = spawnSync(process.execPath, [join(process.cwd(), "scripts/export-client-delivery-cockpit.mjs"), `clients/${appId}`, `--output=${divergentCockpitOutput}`], {cwd: divergentCockpitCwd, encoding: "utf8", env: {...E(QUEUE_TEST_NOW), SERVICE_REPO_ROOT: R}})
		eq(divergentCockpit.status, 0, divergentCockpit.stderr)
		eq(JSON.parse(divergentCockpit.stdout).status, "created")
		const divergentCockpitHtml = rf(divergentCockpitOutput, "utf8")
		const approvedCockpitEntry = completedState.transitionHistory.find(entry => entry.from === "day0-ready" && entry.to === "client-approved" && entry.artifactPath)
		const trackingCockpitEntry = completedState.transitionHistory.find(entry => entry.from === "tracking-14-day" && entry.to === "complete" && entry.evidencePath)
		assert(approvedCockpitEntry && trackingCockpitEntry)
		assert(divergentCockpitHtml.includes(`href="${relative(folder, rp(approvedCockpitEntry.artifactPath))}"`))
		assert(divergentCockpitHtml.includes(`href="${relative(folder, rp(trackingCockpitEntry.evidencePath))}"`))
	} finally {
		rm(divergentCockpitOutput, {force: true})
		rm(divergentCockpitCwd, {recursive: true, force: true})
	}
	const approvedWorkEntryIndex = completedState.transitionHistory.findIndex(entry => entry.from === "day0-ready" && entry.to === "client-approved" && entry.artifactPath)
	neq(approvedWorkEntryIndex, -1)
	const historicalApprovedWorkPath = rp(completedState.transitionHistory[approvedWorkEntryIndex].artifactPath)
	const approvedWorkBytes = rf(historicalApprovedWorkPath)
	const changedApprovedWork = JSON.parse(approvedWorkBytes)
	changedApprovedWork.deliverables.pageFix.artifact.sections[0].body = "This replacement remains structurally complete but substitutes different hero copy after review, changing the hash-bound artifact even when the surrounding service state is also edited."
	aw(historicalApprovedWorkPath, changedApprovedWork)
	const changedApprovedWorkHash = sha256(minifiedJson(changedApprovedWork))
	const provenanceTamperedState = structuredClone(completedState)
	provenanceTamperedState.transitionHistory[approvedWorkEntryIndex].artifactHash = changedApprovedWorkHash
	provenanceTamperedState.approvedArtifactHash = changedApprovedWorkHash
	aw(completedStatePath, provenanceTamperedState)
	const provenanceTamperedItem = bq().items[0]
	eq(provenanceTamperedItem.status, "blocked")
	assert(provenanceTamperedItem.blocked.some(message => message.includes("queue hash does not match reviewed provenance")))
	wf(historicalApprovedWorkPath, approvedWorkBytes)
	wf(completedStatePath, completedStateBytes)
	const historicalEvidenceEntry = completedState.transitionHistory.find(entry => entry.from === "client-approved" && entry.evidencePath)
	assert(historicalEvidenceEntry)
	const historicalEvidencePath = rp(historicalEvidenceEntry.evidencePath)
	const historicalEvidenceBytes = rf(historicalEvidencePath)
	un(historicalEvidencePath)
	eq(bq().items[0].status, "blocked")
	wf(historicalEvidencePath, historicalEvidenceBytes)
	aw(completedStatePath, {...completedState, approvedArtifactHash: "0".repeat(64)})
	eq(bq().items[0].status, "blocked")
	aw(completedStatePath, {...completedState, implementationAcceptedAt: "2026-07-01T00:00:00.000Z"})
	eq(bq().items[0].status, "blocked")
	aw(completedStatePath, {...completedState, contextHistory: []})
	eq(bq().items[0].status, "blocked")
	wf(completedStatePath, completedStateBytes)

	const queueCheck = checkQueue()
	eq(queueCheck.status, "passed")
	const preparedQueueBytes = rf(queuePaths(R).queueFile)
	const passingQueueCli = run(QUEUE, ["--mode", "check", "--as-of", AS_OF_DATE], E(QUEUE_TEST_NOW))
	eq(passingQueueCli.status, 0, passingQueueCli.stderr)
	eq(JSON.parse(passingQueueCli.stdout).status, "passed")
	un(queuePaths(R).queueFile)
	assert(checkQueue().failures.includes("prepared queue output is missing"))
	const failingQueueCli = run(QUEUE, ["--mode", "check", "--as-of", AS_OF_DATE], E(QUEUE_TEST_NOW))
	neq(failingQueueCli.status, 0)
	eq(JSON.parse(failingQueueCli.stdout).status, "failed")
	wf(queuePaths(R).queueFile, preparedQueueBytes)
	thr(() => resolveRepoPath(R, "../escape"), /escapes repository/)

	const lock = queuePaths(R).lockDir
	const staleTime = new Date(Date.now() - 10 * 60 * 1000)
	md(lock, {recursive: true})
	thr(() => prepQ(), /locked/)
	utimesSync(lock, staleTime, staleTime)
	const releaseOwnerlessLock = acquireLock(lock)
	releaseOwnerlessLock()
	eq(ex(lock), false)

	md(lock, {recursive: true})
	lockOwner(lock, 2147483647, "dead")
	utimesSync(lock, staleTime, staleTime)
	const releaseRecoveredLock = acquireLock(lock)
	const recoveredOwner = rj(join(lock, "owner"))
	eq(recoveredOwner.pid, process.pid)
	releaseRecoveredLock()
	eq(ex(lock), false)

	md(lock, {recursive: true})
	lockOwner(lock, 2147483647, "dead-before-recovery")
	utimesSync(lock, staleTime, staleTime)
	md(`${lock}.recovery`, {recursive: true})
	utimesSync(`${lock}.recovery`, staleTime, staleTime)
	const releaseAfterOwnerlessRecoveryCrash = acquireLock(lock)
	eq(rj(join(lock, "owner")).pid, process.pid)
	releaseAfterOwnerlessRecoveryCrash()
	eq(ex(lock), false)
	eq(ex(`${lock}.recovery`), false)

	md(lock, {recursive: true})
	lockOwner(lock, 2147483647, "dead-after-recovery")
	utimesSync(lock, staleTime, staleTime)
	md(`${lock}.recovery`, {recursive: true})
	lockOwner(`${lock}.recovery`, 2147483647, "dead-recovery")
	utimesSync(`${lock}.recovery`, staleTime, staleTime)
	const releaseAfterOwnedRecoveryCrash = acquireLock(lock)
	eq(rj(join(lock, "owner")).pid, process.pid)
	releaseAfterOwnedRecoveryCrash()
	eq(ex(lock), false)
	eq(ex(`${lock}.recovery`), false)

	md(lock, {recursive: true})
	lockOwner(lock, 2147483647, "dead-under-live")
	utimesSync(lock, staleTime, staleTime)
	md(`${lock}.recovery`, {recursive: true})
	lockOwner(`${lock}.recovery`, process.pid, "live-recovery")
	utimesSync(`${lock}.recovery`, staleTime, staleTime)
	thr(() => acquireLock(lock), /locked/)
	eq(ex(`${lock}.recovery`), true)
	rm(lock, {recursive: true, force: true})
	rm(`${lock}.recovery`, {recursive: true, force: true})

	md(lock, {recursive: true})
	lockOwner(lock, process.pid, "live")
	utimesSync(lock, staleTime, staleTime)
	thr(() => acquireLock(lock), /locked/)
	rm(lock, {recursive: true, force: true})

	md(lock, {recursive: true})
	lockOwner(lock, 2147483647, "dead-concurrent")
	utimesSync(lock, staleTime, staleTime)
	const contenders = await Promise.all(Array.from({length: 12}, () => rlc(lock)))
	const acquired = contenders.filter(result => result.status === 0 && result.stdout.includes("acquired"))
	eq(acquired.length, 1)
	assert(contenders.filter(result => result.status === 2 && result.stdout.includes("blocked")).length === 11)
	eq(ex(lock), false)
	eq(ex(`${lock}.recovery`), false)

	const it = id => bq().items.find(candidate => candidate.applicationId === id)
	const I2 = "028f5a54-84aa-7ae0-a1fd-4da350490772"
	clone(application, I2)
	dc(I2, "needs-info", "Please provide the implementation context.")
	aq({applicationId: I2})
	const secondFolder = rp("prospects", I2)
	eq(rs(secondFolder).state, "needs-info")
	assert(
		it(I2)?.contextNote?.includes("Please provide the implementation context.") ||
			bq()
				.items.find(candidate => candidate.applicationId === I2)
				.contextNote.includes("Please provide the implementation context.")
	)
	const secondStatePath = sf(secondFolder)
	const secondStateBytes = rf(secondStatePath)
	aw(secondStatePath, {...JSON.parse(secondStateBytes), resumeState: "implementation"})
	eq(it(I2).status, "blocked")
	wf(secondStatePath, secondStateBytes)
	const resumeBefore = snap(secondFolder)
	const invalidResumeTimestamp = run(RESUME, [I2, "--resumed-at", "July 13, 2026", "--note", "Context supplied for the next review."])
	neq(invalidResumeTimestamp.status, 0)
	deq(snap(secondFolder), resumeBefore)
	const missingResumeNote = run(RESUME, [I2])
	neq(missingResumeNote.status, 0)
	deq(snap(secondFolder), resumeBefore)
	rr(["--resumed-at", "2026-07-13T17:00:00.000Z", "--note", "Context supplied for the next review.", I2])
	eq(rs(secondFolder).state, "fit-review")
	dc(I2, "decline", "Fit does not match the current sprint.")
	aq({applicationId: I2})
	eq(rs(secondFolder).state, "declined")

	const thirdId = "038f5a54-84aa-7ae0-a1fd-4da350490773"
	const fourthId = "048f5a54-84aa-7ae0-a1fd-4da350490774"
	clone(application, thirdId)
	clone(application, fourthId)
	rd(it(thirdId), "approve", 7)
	rd(it(fourthId), "approve", 8)
	const multiBefore = snap(R)
	thr(() => aq(), /multiple decisions are pending/)
	deq(snap(R), multiBefore)
	aq({applicationId: thirdId})
	aq({applicationId: fourthId})

	const symlink = rp("symlink-escape")
	sl("/tmp", symlink)
	thr(() => resolveRepoPath(R, "symlink-escape/outside.json"), /symlink/)
	un(symlink)

	const I5 = "058f5a54-84aa-7ae0-a1fd-4da350490775"
	clone(application, I5)
	rd(it(I5), "approve", 9)
	aq({applicationId: I5})
	let f5 = rp("prospects", I5)
	const day0Before = snap(f5)
	const missingDay0 = run(DAY0, [I5])
	neq(missingDay0.status, 0)
	deq(snap(f5), day0Before)
	const staleWriterBeforeState = rs(f5)
	for (const validPayment of ["paid: invoice NONE-2026", "paid: transaction ch_AVOID", "paid: receipt FAIRFAIL"]) {
		eq(validateAffirmativePaymentEvidence(validPayment), validPayment)
	}
	for (const invalidPayment of ["pending", "unpaid", "paid: pending", "paid: not received", "paid: chargeback", "paid: disputed", "paid: invoice re-funded1", "paid: invoice INVpending", "paid: transaction VOID-2026-01"]) {
		const invalidPaymentBefore = snap(R)
		const invalidPaymentDay0 = run(DAY0, [I5, "--payment-evidence", invalidPayment, "--required-context", "all context supplied", "--approval-owner", "Founder", "--implementation-owner", "TinyStudio", "--recorded-at", T10])
		neq(invalidPaymentDay0.status, 0)
		mat(invalidPaymentDay0.stderr, /paymentEvidence (?:must use an affirmative status and typed provider reference|must include a typed provider reference and identifier|reference must not contain)/)
		deq(snap(R), invalidPaymentBefore)
	}
	const fifthDay0Args = paidDay0Args(I5, "FIFTH-5", "all context supplied")
	d0([...fifthDay0Args.slice(1), I5])
	eq(ex(f5), false)
	f5 = rp("clients", I5)
	eq(ex(f5), true)
	const staleWriterAfterState = rs(f5)
	const staleWriterAfterDay0 = rj(df(f5))
	const interruptedPromotionFolder = rp("prospects", I5)
	rn(f5, interruptedPromotionFolder)
	f5 = interruptedPromotionFolder
	aw(sf(f5), staleWriterBeforeState)
	un(df(f5))
	const promotionOptions = {repoRoot: R, applicationId: I5, createdAt: T10, sourcePath: `prospects/${I5}`, targetPath: `clients/${I5}`, beforeState: staleWriterBeforeState, afterState: staleWriterAfterState, beforeDay0: null, afterDay0: staleWriterAfterDay0}
	createPromotionJournal(promotionOptions)
	eq(it(I5).status, "blocked")
	eq(it(thirdId).status, "blocked")
	const crossClientPromotionBefore = snap(R)
	const crossClientDay0 = run(DAY0, paidDay0Args(thirdId, "THIRD-3"))
	neq(crossClientDay0.status, 0)
	mat(crossClientDay0.stderr, /service promotion journal requires repair before normal work/)
	deq(snap(R), crossClientPromotionBefore)
	const markerPath = promotionMarkerPath(R, I5)
	const markerBytes = rf(markerPath)
	const marker = JSON.parse(markerBytes)
	thr(() => validatePromotionJournal({...marker, targetPath: "../outside"}, I5, R), /targetPath is invalid/)
	aw(markerPath, {...marker, targetPath: "../outside"})
	const tamperedPromotionBefore = snap(R)
	const tamperedPromotionRepair = run(REPAIR, [I5])
	neq(tamperedPromotionRepair.status, 0)
	mat(tamperedPromotionRepair.stderr, /targetPath is invalid/)
	deq(snap(R), tamperedPromotionBefore)
	wf(markerPath, markerBytes)
	md(rp("clients", I5), {recursive: true})
	const duplicatePromotionRepair = run(REPAIR, [I5])
	neq(duplicatePromotionRepair.status, 0)
	mat(duplicatePromotionRepair.stderr, /source and target both exist/)
	rm(rp("clients", I5), {recursive: true, force: true})
	const repairedPromotion = repair(I5)
	eq(repairedPromotion.status, "repaired-promotion")
	f5 = rp("clients", I5)
	assertClientScaffold(R, f5)

	rn(f5, interruptedPromotionFolder)
	f5 = interruptedPromotionFolder
	createPromotionJournal(promotionOptions)
	const promotionBefore = snap(R)
	const rejectedPromotion = run(DAY0, [...fifthDay0Args.slice(1), I5])
	neq(rejectedPromotion.status, 0)
	mat(rejectedPromotion.stderr, /pending promotion journal.*options were not applied/)
	deq(snap(R), promotionBefore)
	const recoveredPromotion = d0([I5])
	eq(recoveredPromotion.recoveredPromotion, true)
	f5 = rp("clients", I5)
	eq(ex(f5), true)
	eq(ex(markerPath), false)
	aw(sf(f5), staleWriterBeforeState)
	un(df(f5))
	const staleWriterTransition = {repoRoot: R, folder: f5, applicationId: I5, kind: "day0", createdAt: T10, beforeState: staleWriterBeforeState, afterState: staleWriterAfterState, beforeDay0: null, afterDay0: staleWriterAfterDay0}
	commitJournaledTransition(staleWriterTransition)
	deq(rs(f5), staleWriterAfterState)
	deq(rj(df(f5)), staleWriterAfterDay0)
	thr(() => commitJournaledTransition(staleWriterTransition), /state changed before commit/)
	assert(!ex(join(f5, "service-transition-journal.json")))
	const paidClientItem = bq({scope: "clients", asOfDate: AS_OF_DATE}).items.find(candidate => candidate.applicationId === I5)
	assert(paidClientItem)
	assert(!bq({scope: "prospects", asOfDate: AS_OF_DATE}).items.some(candidate => candidate.applicationId === I5))
	eq(paidClientItem.day0StartedAt, T10)
	eq(paidClientItem.deadlineAt, "2026-07-22T10:00:00.000Z")
	eq(paidClientItem.paused, false)
	eq(paidClientItem.overdue, true)
	const transitionQueueHashStatePath = sf(f5)
	const transitionQueueHashStateBytes = rf(transitionQueueHashStatePath)
	const transitionQueueHashState = JSON.parse(transitionQueueHashStateBytes)
	transitionQueueHashState.transitionHistory.find(entry => entry.kind === "day0").queueInputHash = "0".repeat(64)
	aw(transitionQueueHashStatePath, transitionQueueHashState)
	eq(it(I5).status, "blocked")
	wf(transitionQueueHashStatePath, transitionQueueHashStateBytes)
	const immutableDay0Before = snap(f5)
	const changedDay0Context = run(DAY0, [I5, "--required-context", "changed context", "--recorded-at", "2026-07-13T10:30:00.000Z"])
	neq(changedDay0Context.status, 0)
	deq(snap(f5), immutableDay0Before)
	const backdatedPauseBefore = snap(f5)
	const backdatedPause = run(DAY0, [I5, "--pause-reason", "Backdated client delay", "--pause-started-at", "2026-07-13T09:45:00.000Z", "--recorded-at", T11])
	neq(backdatedPause.status, 0)
	deq(snap(f5), backdatedPauseBefore)
	d0([I5, "--pause-reason", "Client access pending", "--pause-started-at", T11, "--recorded-at", T11])
	const beforeRepairState = rs(f5)
	const beforeRepairDay0 = rj(df(f5))
	rr([I5, "--resumed-at", T12, "--note", "First access pause resolved."])
	const afterRepairState = rs(f5)
	const afterRepairDay0 = rj(df(f5))
	aw(sf(f5), beforeRepairState)
	aw(df(f5), afterRepairDay0)
	aw(join(f5, "service-transition-journal.json"), transitionJournalRecord({applicationId: I5, kind: "resume", createdAt: T12, beforeState: beforeRepairState, afterState: afterRepairState, beforeDay0: beforeRepairDay0, afterDay0: afterRepairDay0}))
	eq(it(I5).status, "blocked")
	eq(repair(I5).status, "repaired")
	deq(rs(f5), afterRepairState)
	deq(rj(df(f5)), afterRepairDay0)
	assert(!ex(join(f5, "service-transition-journal.json")))
	const resumeQueueHashStateBytes = rf(sf(f5))
	const resumeQueueHashState = JSON.parse(resumeQueueHashStateBytes)
	resumeQueueHashState.transitionHistory.findLast(entry => entry.kind === "resume").queueInputHash = "0".repeat(64)
	aw(sf(f5), resumeQueueHashState)
	eq(it(I5).status, "blocked")
	wf(sf(f5), resumeQueueHashStateBytes)
	d0([I5, "--pause-reason", "Second access delay", "--pause-started-at", T13, "--recorded-at", T13])
	rr([I5, "--resumed-at", "2026-07-13T14:00:00.000Z", "--note", "Second access pause resolved."])
	const fifthDay0 = rj(df(f5))
	eq(fifthDay0.totalPausedMs, 2 * 3600000)
	eq(fifthDay0.deadlineAt, "2026-07-22T12:00:00.000Z")
	const fifthDay0Bytes = rf(df(f5))
	const overlappingDay0 = JSON.parse(fifthDay0Bytes)
	overlappingDay0.pauseHistory[1] = {...overlappingDay0.pauseHistory[1], startedAt: "2026-07-13T11:30:00.000Z", endedAt: "2026-07-13T12:30:00.000Z", durationMs: 3600000}
	aw(df(f5), overlappingDay0)
	eq(it(I5).status, "blocked")
	wf(df(f5), fifthDay0Bytes)

	let i5 = it(I5)
	prepQ()
	i5 = it(I5)
	const firstRevisionOutputPath = rp(i5.agentWork.targetIgnoredPath)
	aw(firstRevisionOutputPath, vao(i5))
	const firstRevisionOutputBytes = rf(firstRevisionOutputPath)
	i5 = it(I5)
	rd(i5, "approve", 10)
	const pendingPauseBefore = snap(f5)
	const pendingPause = run(DAY0, [I5, "--pause-reason", "Pending decision pause", "--pause-started-at", "2026-07-13T15:00:00.000Z"])
	neq(pendingPause.status, 0)
	deq(snap(f5), pendingPauseBefore)
	aq({applicationId: I5})
	i5 = it(I5)
	eq(i5.state, "client-approved")
	ec(I5, ["--stage", "client-approved", "--client-outcome", "revision-requested", "--client-feedback", "Please make the included consolidated revision.", "--reviewed-artifact-hash", rs(f5).approvedArtifactHash, "--recorded-at", "2026-07-13T15:00:00.000Z"])
	i5 = it(I5)
	rdc(I5, "approve", "This contradicts the recorded client revision request.", /client outcome revision-requested does not support decision approve/)
	rd(i5, "decline", 11)
	aq({applicationId: I5})
	eq(rs(f5).deliveryRevision, 1)
	prepQ()
	i5 = it(I5)
	const revisedOutputPath = rp(i5.agentWork.targetIgnoredPath)
	neq(revisedOutputPath, firstRevisionOutputPath)
	aw(revisedOutputPath, vao(i5))
	i5 = it(I5)
	rd(i5, "approve", 12)
	aq({applicationId: I5})
	un(firstRevisionOutputPath)
	neq(it(I5).status, "blocked")
	const firstRevisionApprovedTransition = rs(f5).transitionHistory.find(entry => entry.from === "day0-ready" && entry.to === "client-approved" && entry.artifactPath)
	const firstRevisionApprovedPath = rp(firstRevisionApprovedTransition.artifactPath)
	const firstRevisionApprovedBytes = rf(firstRevisionApprovedPath)
	un(firstRevisionApprovedPath)
	eq(it(I5).status, "blocked")
	const blockedEvidenceBefore = snap(f5)
	const blockedEvidence = run("scripts/record-service-evidence.mjs", [I5, "--stage", "client-approved", "--client-outcome", "approved", "--client-feedback", "Client approved the revised artifact.", "--implementation-owner", "TinyStudio", "--reviewed-artifact-hash", rs(f5).approvedArtifactHash, "--recorded-at", "2026-07-13T16:00:00.000Z"])
	neq(blockedEvidence.status, 0)
	deq(snap(f5), blockedEvidenceBefore)
	wf(firstRevisionApprovedPath, firstRevisionApprovedBytes)
	wf(firstRevisionOutputPath, firstRevisionOutputBytes)
	i5 = it(I5)
	eq(i5.state, "client-approved")
	const ownerFallbackEvidence = ec(I5, ["--stage", "client-approved", "--client-outcome", "approved", "--client-feedback", "Client approved the revised artifact.", "--reviewed-artifact-hash", rs(f5).approvedArtifactHash, "--recorded-at", "2026-07-13T16:00:00.000Z"])
	const ownerFallbackEvidenceRecord = JSON.parse(ownerFallbackEvidence.stdout)
	eq(rj(ownerFallbackEvidenceRecord.evidencePath).signals.implementationOwner, rj(df(f5)).implementationOwner)

	i5 = it(I5)
	rdc(I5, "decline", "This contradicts the recorded client approval.", /client outcome approved does not support decision decline/)
	rd(i5, "approve", 13)
	aq({applicationId: I5})
	i5 = it(I5)
	const incompleteDeliveryEvidenceBefore = snap(f5)
	const incompleteDeliveryEvidence = ec(I5, ["--stage", "implementation", "--implementation-status", "implemented", "--acceptance-status", "accepted", "--usefulness-score", "9", "--usefulness-note", "Accepted by client.", "--recorded-at", "2026-07-13T17:00:00.000Z"], false)
	mat(incompleteDeliveryEvidence.stderr, /implementation artifact URL/)
	deq(snap(f5), incompleteDeliveryEvidenceBefore)
	ec(I5, ["--stage", "implementation", "--implementation-status", "implemented", "--acceptance-status", "accepted", "--usefulness-score", "9", "--usefulness-note", "Accepted by client.", "--implementation-artifact-url", PAGE, "--before-evidence-url", `${EVIDENCE}/before/managed-services.png`, "--after-evidence-url", `${EVIDENCE}/after/managed-services.png`, "--loom-url", LOOM, "--baseline-metric", METRIC, "--baseline-value", BASELINE, "--baseline-source-url", `${EVIDENCE}/baseline/managed-services.json`, "--baseline-captured-at", "2026-07-13T16:59:00.000Z", "--recorded-at", "2026-07-13T17:00:00.000Z"])
	i5 = it(I5)
	rdc(I5, "decline", "This contradicts the accepted implementation evidence.", /implementation decline requires revision-requested stage evidence/)
	rd(i5, "approve", 14)
	aq({applicationId: I5})
	const trackingBefore = snap(f5)
	ec(I5, ["--stage", "tracking-14-day", "--tracked-through", "2099-01-01T00:00:00.000Z", "--implementation-status", "implemented", "--acceptance-confirmed", "true", "--usefulness-score", "9", "--recurring-need-observed", "true", "--continuation-note", "Future evidence.", "--recorded-at", "2099-01-01T00:00:00.000Z", "--as-of", AS_OF_DATE], false)
	deq(snap(f5), trackingBefore)
	i5 = it(I5)
	const fifthState = rs(f5)
	const earlyTrackingEvidence = {
		contract: "tinystudio.service-stage-evidence", schemaVersion: 1, applicationId: I5, sourceHash: i5.sourceHash, stage: "tracking-14-day", recordedAt: "2026-07-20T17:00:00.000Z", recordedBy: "Test reviewer",
		signals: {trackedThrough: "2026-07-20T17:00:00.000Z", implementationStatus: "implemented", acceptanceConfirmed: true, usefulnessScore: 9, recurringNeedObserved: true, continuationNote: "Continue tracking.", trackingRecordUrl: `${EVIDENCE}/tracking/managed-services-day-7.json`, measurementResult: {metric: METRIC, baseline: BASELINE, result: "One consistent primary action", sourceUrl: `${EVIDENCE}/results/managed-services-day-7.json`}}
	}
	thr(() => validateStageEvidence(earlyTrackingEvidence, {application: {applicationId: I5, sourceHash: i5.sourceHash}, state: "tracking-14-day", approvedArtifactHash: fifthState.approvedArtifactHash, implementationAcceptedAt: fifthState.implementationAcceptedAt, implementationBaseline: i5.implementationBaseline, asOfDate: AS_OF_DATE, notBefore: fifthState.updatedAt}), /at least 14 active days/)
	deq(snap(f5), trackingBefore)
	const trackingContext = {application: {applicationId: I5, sourceHash: i5.sourceHash}, state: "tracking-14-day", implementationAcceptedAt: fifthState.implementationAcceptedAt, implementationBaseline: i5.implementationBaseline}
	const trackingEvidencePath = join(f5, "service-evidence", "tracking-14-day", `${i5.contextRevision}.json`)
	const matureTrackingEvidence = structuredClone(earlyTrackingEvidence)
	matureTrackingEvidence.recordedAt = "2026-07-27T17:00:00.000Z"
	matureTrackingEvidence.signals.trackedThrough = matureTrackingEvidence.recordedAt
	matureTrackingEvidence.signals.trackingRecordUrl = `${EVIDENCE}/tracking/managed-services-day-14.json`
	matureTrackingEvidence.signals.measurementResult.sourceUrl = `${EVIDENCE}/results/managed-services-day-14.json`
	const fullTrackingPause = [{reason: "Client access blocked implementation tracking", startedAt: fifthState.implementationAcceptedAt, endedAt: "2026-07-27T17:00:00.000Z", durationMs: Date.parse("2026-07-27T17:00:00.000Z") - Date.parse(fifthState.implementationAcceptedAt)}]
	thr(() => validateStageEvidence(matureTrackingEvidence, {...trackingContext, pauseHistory: fullTrackingPause}), /at least 14 active days/)
	for (const [field, invalid, expected] of [
		["metric", "Homepage bounce rate", /metric must match the accepted implementation baseline/],
		["baseline", "A rewritten baseline", /baseline must match the accepted implementation baseline value/]
	]) {
		const candidate = structuredClone(matureTrackingEvidence)
		candidate.signals.measurementResult[field] = invalid
		aw(trackingEvidencePath, candidate)
		const blockedItem = it(I5)
		eq(blockedItem.status, "blocked")
		mat(blockedItem.blocked.join("\n"), expected)
		un(trackingEvidencePath)
	}
	deq(snap(f5), trackingBefore)
	rse(i5)
	eq(it(I5).status, "needs-review")
	const trackingDeclineBefore = snap(R)
	const trackingDeclineAttempt = run(DECIDE, [I5, "--decision", "decline", "--reviewer", "Tracking reviewer", "--note", "Tracking decline must not change review state.", "--decided-at", "2026-07-29T10:00:00.000+05:30"], E(QUEUE_TEST_NOW))
	neq(trackingDeclineAttempt.status, 0)
	mat(trackingDeclineAttempt.stderr, /approve|needs-info/i)
	deq(snap(R), trackingDeclineBefore)
	eq(rs(f5).state, "tracking-14-day")
	const pendingRetention = lvc(R, `clients/${I5}`)
	eq(pendingRetention.ok, true)
	deq(pendingRetention.trackingEvidence, [])
	const pendingTrackingItem = it(I5)
	rd(pendingTrackingItem, "approve", 19)
	aq({applicationId: I5})
	const completedRetention = lvc(R, `clients/${I5}`)
	eq(completedRetention.state, "complete")
	eq(completedRetention.ok, true)
	eq(completedRetention.trackingEvidence.length, 1)

	const I6 = "068f5a54-84aa-7ae0-a1fd-4da350490776"
	clone(application, I6)
	let f6 = rp("prospects", I6)
	const futureDecisionBefore = snap(R)
	const futureDecision = run(DECIDE, [I6, "--decision", "approve", "--reviewer", "Future reviewer", "--note", "This next-local-day decision must not be persisted.", "--decided-at", nextLocalMidnight], E())
	neq(futureDecision.status, 0)
	deq(snap(R), futureDecisionBefore)
	dc(I6, "needs-info", "Please provide the approved implementation context.")
	aq({applicationId: I6})
	rr([I6, "--resumed-at", T10, "--note", "The approved implementation context is attached."])
	dc(I6, "approve", "Fit and supplied implementation context reviewed.")
	aq({applicationId: I6})
	d0([...paidDay0Args(I6, "SIXTH-6", "approved context", T11), "--pause-reason", "CMS access pending", "--pause-started-at", T11])
	eq(ex(f6), false)
	f6 = rp("clients", I6)
	eq(ex(f6), true)
	const pausedDay0Before = snap(f6)
	const duplicateDay0 = run(DAY0, [I6, "--recorded-at", "2026-07-13T11:30:00.000Z"])
	neq(duplicateDay0.status, 0)
	deq(snap(f6), pausedDay0Before)
	rr([I6, "--resumed-at", T12, "--note", "CMS access was supplied."])
	const sixthState = rs(f6)
	deq(
		sixthState.contextHistory.map(entry => entry.kind),
		["request", "response", "pause-resolution"]
	)
	assert(sixthState.contextHistory.some(entry => entry.note.includes("implementation context")))
	prepQ()
	let sixthItem = it(I6)
	const declinedOutputPath = rp(sixthItem.agentWork.targetIgnoredPath)
	aw(declinedOutputPath, vao(sixthItem))
	const declinedOutputBytes = rf(declinedOutputPath)
	sixthItem = it(I6)
	rd(sixthItem, "decline", 15)
	aq({applicationId: I6})
	eq(rs(f6).state, "delivery-draft")
	const declinedTransition = rs(f6).transitionHistory.findLast(entry => entry.from === "day0-ready" && entry.to === "delivery-draft" && entry.artifactPath)
	mat(declinedTransition.artifactPath, new RegExp(`^clients/${I6}/deliverables/decline/`))
	un(declinedOutputPath)
	eq(it(I6).status, "needs-agent-work")
	wf(declinedOutputPath, declinedOutputBytes)
	prepQ()
	sixthItem = it(I6)
	const includedRevisionOutputPath = rp(sixthItem.agentWork.targetIgnoredPath)
	aw(includedRevisionOutputPath, vao(sixthItem))
	sixthItem = it(I6)
	rd(sixthItem, "decline", 16)
	aq({applicationId: I6})
	const internalReworkState = rs(f6)
	const internalReworkItem = it(I6)
	eq(internalReworkState.state, "delivery-draft")
	eq(internalReworkState.deliveryRevision, 0)
	eq(internalReworkItem.status, "needs-agent-work")

	const seventhId = "078f5a54-84aa-7ae0-a1fd-4da350490777"
	clone(application, seventhId)
	const seventhItem = it(seventhId)
	const concurrentDecidedAt = new Date(Date.parse(seventhItem.reviewNotBefore) + 60_000).toISOString()
	const concurrentResults = await Promise.all([
		rna(DECIDE, [seventhId, "--decision", "approve", "--reviewer", "Concurrent reviewer A", "--note", "First concurrent human decision fixture.", "--decided-at", concurrentDecidedAt, "--nonce", "078f5a54-84aa-7ae0-a1fd-4da350490780"]),
		rna(DECIDE, [seventhId, "--decision", "decline", "--reviewer", "Concurrent reviewer B", "--note", "Second concurrent human decision fixture.", "--decided-at", concurrentDecidedAt, "--nonce", "078f5a54-84aa-7ae0-a1fd-4da350490781"])
	])
	deq(concurrentResults.map(result => result.status).sort(), [0, 1])
	eq(it(seventhId).status, "auto-ready")

	const I8 = "088f5a54-84aa-7ae0-a1fd-4da350490778"
	clone(application, I8)
	rd(it(I8), "approve", 17)
	aq({applicationId: I8})
	const reservedAt = T10
	const eighthProspectFolder = rp("prospects", I8)
	const reservedBeforeState = rs(eighthProspectFolder)
	const reservedItem = it(I8)
	const reservedDay0 = {applicationId: I8, paymentEvidence: "paid: invoice RESERVED-8", requiredContext: "approved context", approvalOwner: "Founder", implementationOwner: "TinyStudio", offerName: "7-Day Website Revenue Leak Fix Sprint", offerPriceUsd: 1000, pricingCohort: "founder-pilot", pilotSequence: 3, ready: true, day0StartedAt: reservedAt, updatedAt: reservedAt, paused: false, activePause: null, pauseHistory: [], totalPausedMs: 0, deadlineAt: addBusinessDaysToTimestamp(reservedAt, 7), resumeState: ""}
	const reservedAfterState = appendStateTransition(
		{...reservedBeforeState, state: "day0-ready", updatedAt: reservedAt, day0ReadyAt: reservedAt, sourceHash: reservedItem.sourceHash, packetHash: reservedItem.packetHash},
		{from: reservedBeforeState.state, to: "day0-ready", kind: "day0", at: reservedAt, contextRevision: reservedBeforeState.contextRevision, queueInputHash: "", day0Hash: sha256(minifiedJson(reservedDay0)), contextHash: contextHistoryHash(reservedBeforeState.contextHistory || [])}
	)
	createPromotionJournal({repoRoot: R, applicationId: I8, createdAt: reservedAt, sourcePath: `prospects/${I8}`, targetPath: `clients/${I8}`, beforeState: reservedBeforeState, afterState: reservedAfterState, beforeDay0: null, afterDay0: reservedDay0})
	const blockedPromotionImport = structuredClone(application)
	blockedPromotionImport.applicationId = "018f5a54-84aa-7ae0-a1fd-4da350490783"
	const blockedPromotionInput = rp("blocked-promotion-import.json")
	wf(blockedPromotionInput, `${JSON.stringify(blockedPromotionImport)}\n`)
	rimp(blockedPromotionInput, /service promotion repair required before import/)
	eq(ex(rp("prospects", blockedPromotionImport.applicationId)), false)
	un(blockedPromotionInput)
	const missingPaidDay0Path = df(f5)
	const missingPaidDay0Bytes = rf(missingPaidDay0Path)
	un(missingPaidDay0Path)
	const overCapacityRepairBefore = snap(R)
	const overCapacityRepair = run(REPAIR, [I8])
	neq(overCapacityRepair.status, 0)
	mat(overCapacityRepair.stderr, /founder pilot capacity is complete after 3 paid clients/)
	deq(snap(R), overCapacityRepairBefore)
	un(promotionMarkerPath(R, I8))
	const founderCapacityBefore = snap(R)
	const eighthDay0Args = paidDay0Args(I8, "EIGHTH-8")
	const founderCapacityBlocked = run(DAY0, eighthDay0Args)
	neq(founderCapacityBlocked.status, 0)
	mat(founderCapacityBlocked.stderr, /founder pilot capacity is complete after 3 paid clients/)
	deq(snap(R), founderCapacityBefore)
	wf(missingPaidDay0Path, missingPaidDay0Bytes)
	aw(rp(GROWTH, "ops", "agency-config.json"), {manualDailySendCap: 1000, humanDailyReviewCap: 1000, firstClientCount: 1000})
	const mutableCapacityBypassBefore = snap(R)
	const mutableCapacityBypass = run(DAY0, eighthDay0Args)
	neq(mutableCapacityBypass.status, 0)
	mat(mutableCapacityBypass.stderr, /founder pilot capacity is complete after 3 paid clients/)
	deq(snap(R), mutableCapacityBypassBefore)
	aw(rp(GROWTH, "ops", "agency-config.json"), {manualDailySendCap: 1000, humanDailyReviewCap: 1000, firstClientCount: 3})

	prepQ()
	let ri = it(I6)
	aw(rp(ri.agentWork.targetIgnoredPath), vao(ri))
	ri = it(I6)
	rd(ri, "approve", 18)
	aq({applicationId: I6})
	ri = it(I6)
	rco(ri, "needs-info", "Please confirm the implementation owner before approval.")
	ri = it(I6)
	rdc(I6, "approve", "This contradicts the client's request for more information.", /client outcome needs-info does not support decision approve/)
	const clientNeedsInfoResult = dc(I6, "needs-info", "Please provide the implementation owner confirmation.")
	const clientNeedsInfoDecision = rj(clientNeedsInfoResult.decisionPath)
	aq({applicationId: I6})
	eq(it(I6).state, "needs-info")
	const paidNeedsInfo = lvc(R, `clients/${I6}`)
	eq(paidNeedsInfo.ok, true)
	const needsInfoStateBytes = rf(sf(f6))
	const orphanDay0State = JSON.parse(needsInfoStateBytes)
	orphanDay0State.transitionHistory.find(entry => entry.kind === "day0" && entry.from === "approved-awaiting-day0").day0Hash = "0".repeat(64)
	aw(sf(f6), orphanDay0State)
	eq(lvc(R, `clients/${I6}`).ok, false)
	wf(sf(f6), needsInfoStateBytes)
	rr([I6, "--resumed-at", new Date(Date.parse(clientNeedsInfoDecision.decidedAt) + 60_000).toISOString(), "--note", "The implementation owner is TinyStudio."])
	ri = it(I6)
	eq(ri.state, "client-approved")
	rco(ri, "approved", "Client approved this artifact for implementation.")
	ri = it(I6)
	rdc(I6, "decline", "This contradicts the recorded client approval.", /client outcome approved does not support decision decline/)
	rd(ri, "approve", 25)
	aq({applicationId: I6})
	ri = it(I6)
	rrr(ri)
	ri = it(I6)
	rdc(I6, "approve", "This contradicts the recorded implementation revision request.", /implementation approval requires accepted stage evidence/)
	rd(ri, "decline", 20)
	aq({applicationId: I6})
	eq(rj(rp(it(I6).sourcePath, "service-state.json")).deliveryRevision, 1)
	prepQ()
	ri = it(I6)
	aw(rp(ri.agentWork.targetIgnoredPath), vao(ri))
	ri = it(I6)
	rd(ri, "approve", 21)
	aq({applicationId: I6})
	ri = it(I6)
	rse(ri)
	ri = it(I6)
	rd(ri, "approve", 22)
	aq({applicationId: I6})
	ri = it(I6)
	rrr(ri)
	ri = it(I6)
	rd(ri, "decline", 23)
	aq({applicationId: I6})
	const revisionExhaustedItem = it(I6)
	eq(revisionExhaustedItem.state, "scope-review")
	eq(revisionExhaustedItem.deliveryRevision, 1)
	eq(revisionExhaustedItem.status, "needs-input")
	eq(revisionExhaustedItem.agentWork, null)
	const scopeAuthorizedAt = new Date(Date.parse(revisionExhaustedItem.reviewNotBefore) + 60_000).toISOString()
	const exhaustedStateBefore = snap(R)
	const exhaustedResume = run(RESUME, [I6, "--resumed-at", scopeAuthorizedAt, "--authorized-by", "Nish", "--scope-authorization", "Client approved the additional page-fix revision."])
	neq(exhaustedResume.status, 0)
	mat(exhaustedResume.stderr, /fee-authorization is required/)
	deq(snap(R), exhaustedStateBefore)
	const scopeResume = rr([I6, "--resumed-at", scopeAuthorizedAt, "--authorized-by", "Nish", "--scope-authorization", "Client approved the additional page-fix revision.", "--fee-authorization", "Client approved the quoted additional revision fee."])
	eq(scopeResume.status, "delivery-draft")
	eq(scopeResume.deliveryRevision, 2)
	const scopeAuthorizedState = rs(f6)
	eq(scopeAuthorizedState.state, "delivery-draft")
	eq(scopeAuthorizedState.deliveryRevision, 2)
	eq(scopeAuthorizedState.transitionHistory.at(-1).kind, "scope-authorization")
	eq(scopeAuthorizedState.contextHistory.at(-1).kind, "scope-authorization")
	mat(scopeAuthorizedState.contextHistory.at(-1).note, /Authorized by: Nish\nScope authorization: Client approved.*\nFee authorization: Client approved/s)
	assert(it(I6).agentWork)

	const capAnchorId = "098f5a54-84aa-7ae0-a1fd-4da350490779"
	const ninthId = "0a8f5a54-84aa-7ae0-a1fd-4da350490780"
	clone(application, capAnchorId)
	clone(application, ninthId)
	const capDate = application.submittedAt.slice(0, 10)
	const capQueueBefore = bq({asOfDate: capDate})
	const completedBefore = capQueueBefore.reviewCap.completedToday
	const capAnchorBefore = capQueueBefore.items.find(item => item.applicationId === capAnchorId)
	assert(capAnchorBefore?.humanReviewSlot)
	aw(rp(GROWTH, "ops", "agency-config.json"), {manualDailySendCap: 1000, humanDailyReviewCap: capAnchorBefore.humanReviewSlot})
	const capAnchorAtLimit = bq({asOfDate: capDate}).items.find(item => item.applicationId === capAnchorId)
	eq(capAnchorAtLimit.withinHumanDailyReviewCap, true)
	aw(rp(GROWTH, "ops", "agency-config.json"), {manualDailySendCap: 1, humanDailyReviewCap: capAnchorBefore.humanReviewSlot})
	const sendCapChanged = bq({asOfDate: capDate}).items.find(item => item.applicationId === capAnchorId)
	eq(sendCapChanged.withinHumanDailyReviewCap, true)
	const capDecision = dv(capAnchorAtLimit, "approve", 24)
	const orphanJournalTemp = `${reviewCapJournalPath(R)}.tmp-999-028f5a54-84aa-4ae0-a1fd-4da350490700`
	wf(orphanJournalTemp, "{\n")
	createReviewCapJournal(R, capDecision, capAnchorAtLimit.state)
	const capJournalPath = reviewCapJournalPath(R)
	const containedJournal = rp("contained-review-cap-journal.json")
	rn(capJournalPath, containedJournal)
	sl(containedJournal, capJournalPath)
	const symlinkJournalBefore = snap(R)
	const symlinkJournalRepair = run(REPAIR, [capAnchorId])
	neq(symlinkJournalRepair.status, 0)
	mat(symlinkJournalRepair.stderr, /review cap decision journal must be a regular file/)
	deq(snap(R), symlinkJournalBefore)
	un(capJournalPath)
	rn(containedJournal, capJournalPath)
	const pendingJournalApplication = {...application, applicationId: "0f8f5a54-84aa-7ae0-a1fd-4da350490784"}
	const pendingJournalInput = rp("pending-journal-application.json")
	wf(pendingJournalInput, `${JSON.stringify(pendingJournalApplication)}\n`)
	rimp(pendingJournalInput, /review cap decision journal requires repair/)
	un(pendingJournalInput)
	const cdp = rp(capAnchorAtLimit.decisionPath)
	const decisionStateDirectory = dirname(cdp)
	const containedDecisionState = rp("contained-decision-state")
	md(dirname(decisionStateDirectory), {recursive: true})
	md(containedDecisionState)
	sl(containedDecisionState, decisionStateDirectory, "dir")
	const symlinkParentRepair = run(REPAIR, [capAnchorId])
	neq(symlinkParentRepair.status, 0)
	mat(symlinkParentRepair.stderr, /review decision state directory must be a real directory/)
	assert(ex(capJournalPath) && readdirSync(containedDecisionState).length === 0)
	un(decisionStateDirectory)
	rm(containedDecisionState, {recursive: true})
	aw(cdp, capDecision)
	const orphanLedgerUpdateTemp = `${reviewCapLedgerPath(R)}.tmp-999-038f5a54-84aa-4ae0-a1fd-4da350490700`
	wf(orphanLedgerUpdateTemp, "{\n")
	thr(() => bq({asOfDate: capDate}), /review cap decision journal requires repair/)
	const capRepair = run(REPAIR, [capAnchorId])
	eq(capRepair.status, 0, capRepair.stderr)
	eq(ex(reviewCapJournalPath(R)), false)
	assert(ex(orphanJournalTemp) && ex(orphanLedgerUpdateTemp))
	deq(rj(cdp), capDecision)
	const capDecisionBytes = rf(cdp)
	const ninthDecisionArgs = [ninthId, "--decision", "approve", "--reviewer", "Over-cap reviewer", "--note", "This decision must be deferred by the configured review cap.", "--decided-at", T10, "--nonce", "098f5a54-84aa-7ae0-a1fd-4da350490790"]
	wf(cdp, "{}\n")
	thr(() => bq({asOfDate: capDate}), /decision has unexpected or missing fields/)
	wf(cdp, capDecisionBytes)
	un(cdp)
	thr(() => bq({asOfDate: capDate}), /review cap ledger decision file is missing or moved/)
	const pendingDeletionBefore = snap(R)
	const pendingDeletionDecision = run(DECIDE, ninthDecisionArgs, E())
	neq(pendingDeletionDecision.status, 0)
	mat(pendingDeletionDecision.stderr, /review cap ledger decision file is missing or moved/)
	deq(snap(R), pendingDeletionBefore)
	wf(cdp, capDecisionBytes)
	aq({applicationId: capAnchorId})
	const capQueueAfter = bq({asOfDate: capDate})
	eq(capQueueAfter.reviewCap.completedToday, completedBefore + 1)
	const capStatePath = rp("prospects", capAnchorId, "service-state.json")
	const capStateBytes = rf(capStatePath)
	un(cdp)
	thr(() => bq({asOfDate: capDate}), /review cap ledger decision file is missing or moved/)
	un(capStatePath)
	thr(() => bq({asOfDate: capDate}), /review cap ledger decision file is missing or moved/)
	const integrityDecisionBefore = snap(R)
	const integrityDecision = run(DECIDE, ninthDecisionArgs, E())
	neq(integrityDecision.status, 0)
	mat(integrityDecision.stderr, /review cap ledger decision file is missing or moved/)
	deq(snap(R), integrityDecisionBefore)
	wf(capStatePath, capStateBytes)
	aw(capStatePath, {...JSON.parse(capStateBytes), usedDecisionHashes: []})
	thr(() => bq({asOfDate: capDate}), /review cap ledger decision file is missing or moved/)
	wf(capStatePath, capStateBytes)
	wf(cdp, capDecisionBytes)
	const deferredReviewItem = capQueueAfter.items.find(item => item.applicationId === ninthId)
	eq(deferredReviewItem.status, "needs-review")
	eq(deferredReviewItem.withinHumanDailyReviewCap, false)
	const deferredDecisionBefore = snap(R)
	const deferredDecision = run(DECIDE, ninthDecisionArgs, E())
	neq(deferredDecision.status, 0)
	mat(deferredDecision.stderr, /application is deferred beyond today's human review cap/)
	deq(snap(R), deferredDecisionBefore)

	const backdatedCapId = "0b8f5a54-84aa-7ae0-a1fd-4da350490781"
	const backdatedCapApplication = structuredClone(application)
	backdatedCapApplication.applicationId = backdatedCapId
	backdatedCapApplication.submittedAt = "2026-07-12T09:00:00.000Z"
	const backdatedCapInput = rp("backdated-cap-application.json")
	wf(backdatedCapInput, `${JSON.stringify(backdatedCapApplication)}\n`)
	imp(backdatedCapInput)
	un(backdatedCapInput)
	const backdatedCapBefore = snap(R)
	const backdatedCapDecision = run(DECIDE, [backdatedCapId, "--decision", "approve", "--reviewer", "Backdated reviewer", "--note", "This prior-day timestamp must not bypass today's exhausted human review cap.", "--decided-at", "2026-07-12T10:00:00.000Z", "--nonce", "0b8f5a54-84aa-7ae0-a1fd-4da350490791"], E())
	neq(backdatedCapDecision.status, 0)
	mat(backdatedCapDecision.stderr, /decided-at must use the trusted recording date/)
	deq(snap(R), backdatedCapBefore)

	aw(rp(GROWTH, "ops", "agency-config.json"), {manualDailySendCap: 1000, humanDailyReviewCap: 1000, firstClientCount: 3})
	const july14Id = "0c8f5a54-84aa-7ae0-a1fd-4da350490782"
	clone(application, july14Id)
	const july14Before = snap(R)
	const july14Historical = run(
		DECIDE,
		[july14Id, "--decision", "approve", "--reviewer", "Clock reviewer", "--note", "Historical timestamp must fail under the simulated next-day clock.", "--decided-at", "2026-07-13T10:00:00.000+05:30", "--nonce", "0c8f5a54-84aa-7ae0-a1fd-4da350490782"],
		E("2026-07-14T12:00:00.000+05:30")
	)
	neq(july14Historical.status, 0)
	mat(july14Historical.stderr, /trusted recording date 2026-07-14/)
	deq(snap(R), july14Before)
	const july14Current = run(DECIDE, [july14Id, "--decision", "approve", "--reviewer", "Clock reviewer", "--note", "Current simulated local-day decision must remain valid.", "--decided-at", "2026-07-14T10:00:00.000+05:30", "--nonce", "0d8f5a54-84aa-7ae0-a1fd-4da350490783"], E("2026-07-14T12:00:00.000+05:30"))
	eq(july14Current.status, 0)

	const salesGuardRoot = mkdtempSync(join(tmpdir(), "tinystudio-sales-guard-test-"))
	try {
		// Keep the main fixture root out of these guard subprocesses.
		const salesProspect = join(salesGuardRoot, "prospects", "guard-check")
		md(salesProspect, {recursive: true})
		aw(join(salesProspect, "metadata.json"), {name: "Guard Check", website: "https://www.example.com", contact: "Founder"})
		aw(join(salesProspect, "pipeline.json"), {stage: "call-booked"})
		const guardEnv = {...process.env, SERVICE_REPO_ROOT: salesGuardRoot}
		const assertConciseGuardFailure = result => {
			neq(result.status, 0)
			assert(!/\n\s+at\s/.test(result.stderr))
		}

		const invalidPrice = run("scripts/prepare-prospect-close-package.mjs", [salesProspect, "--price", "$900 founder pilot"], guardEnv)
		assertConciseGuardFailure(invalidPrice)
		mat(invalidPrice.stderr, /price is immutable during the founder pilot/)
		const invalidPayment = run("scripts/prepare-prospect-close-package.mjs", [salesProspect, "--payment", "not-a-payment-url"], guardEnv)
		assertConciseGuardFailure(invalidPayment)
		mat(invalidPayment.stderr, /payment must be an HTTP\(S\) URL/)

		const excludedProspect = join(salesGuardRoot, "service-application")
		md(excludedProspect, {recursive: true})
		aw(join(excludedProspect, "service-application.json"), {applicationId: "guard-excluded"})
		const outboundBlocked = run("scripts/draft-sales-call-prep.mjs", [excludedProspect], guardEnv)
		assertConciseGuardFailure(outboundBlocked)
		mat(outboundBlocked.stderr, /Refusing outbound operation/)

		for (const [name, applicationId] of [
			["paid-one", "guard-paid-one"],
			["paid-two", "guard-paid-two"],
			["paid-three", "guard-paid-three"]
		]) {
			const client = join(salesGuardRoot, "clients", name)
			md(client, {recursive: true})
			aw(join(client, "service-application.json"), {applicationId})
		}
		const callCapacityBlocked = run("scripts/draft-sales-call-prep.mjs", [salesProspect], guardEnv)
		assertConciseGuardFailure(callCapacityBlocked)
		mat(callCapacityBlocked.stderr, /founder pilot capacity is complete after 3 paid clients/)
		const closeCapacityBlocked = run("scripts/prepare-prospect-close-package.mjs", [salesProspect], guardEnv)
		assertConciseGuardFailure(closeCapacityBlocked)
		mat(closeCapacityBlocked.stderr, /founder pilot capacity is complete after 3 paid clients/)
	} finally {
		rm(salesGuardRoot, {recursive: true, force: true})
	}

	const backupParent = mkdtempSync(join(tmpdir(), "tinystudio-private-backup-test-"))
	try {
		const blockBackup = (name, expected) => {
			const path = join(backupParent, name)
			const result = run(BACKUP, ["create", "--output", path])
			neq(result.status, 0)
			if (expected) mat(result.stderr, expected)
			eq(ex(path), false)
		}
		const releaseBackupLock = acquireLock(queuePaths(R).lockDir)
		try {
			blockBackup("locked", /service queue is locked/)
		} finally {
			releaseBackupLock()
		}
		const pendingPromotionPath = rp("runs", "service-engine", "promotions", `${july14Id}.json`)
		md(dirname(pendingPromotionPath), {recursive: true})
		wf(pendingPromotionPath, "{}\n")
		blockBackup("pending-promotion", /promotion journal requires repair before backup/)
		un(pendingPromotionPath)
		const promotionDir = dirname(pendingPromotionPath)
		rn(promotionDir, `${promotionDir}-real`)
		sl(rp("missing-promotions"), promotionDir, "dir")
		blockBackup("dangling-promotions", /promotion journal directory must be a real directory/)
		un(promotionDir)
		rn(`${promotionDir}-real`, promotionDir)
		const transitionJournalPath = join(f5, "service-transition-journal.json")
		wf(transitionJournalPath, "{}\n")
		blockBackup("pending-transition", /transition journal requires repair before backup/)
		un(transitionJournalPath)
		createReviewCapJournal(R, capDecision, capAnchorAtLimit.state)
		blockBackup("pending-review-cap", /review cap decision journal requires repair before backup/)
		un(reviewCapJournalPath(R))
		const backupPath = join(backupParent, "snapshot")
		const createdBackup = run(BACKUP, ["create", "--output", backupPath])
		eq(createdBackup.status, 0, createdBackup.stderr)
		const manifest = rj(join(backupPath, "manifest.json"))
		const backedUpFiles = manifest.entries.filter(entry => entry.type === "file")
		eq(manifest.contract, "tinystudio.private-service-backup")
		eq(statSync(backupPath).mode & 0o777, 0o700)
		eq(statSync(join(backupPath, backedUpFiles[0].path)).mode & 0o777, 0o600)
		assert(backedUpFiles.some(entry => entry.path.startsWith("clients/") && entry.path.endsWith("service-state.json")))
		assert(backedUpFiles.some(entry => entry.path.startsWith("service-decisions/") && entry.path.endsWith(".json")))
		assert(backedUpFiles.some(entry => entry.path.startsWith("runs/service-engine/outputs/")))
		eq(run(BACKUP, ["verify", "--input", backupPath]).status, 0)
		const inRepoCopy = rp("runtime", "backups", "copied-snapshot")
		cpSync(backupPath, inRepoCopy, {recursive: true})
		const inRepoVerification = run(BACKUP, ["verify", "--input", inRepoCopy])
		neq(inRepoVerification.status, 0)
		mat(inRepoVerification.stderr, /backup input must be outside the repository/)
		rm(inRepoCopy, {recursive: true, force: true})
		chmodSync(backupPath, 0o755)
		mat(run(BACKUP, ["verify", "--input", backupPath]).stderr, /root permissions must be 0700/)
		chmodSync(backupPath, 0o700)
		const backedUpDecision = backedUpFiles.find(entry => entry.path.startsWith("service-decisions/"))
		const backedUpDecisionPath = join(backupPath, backedUpDecision.path)
		const backedUpDecisionBytes = rf(backedUpDecisionPath)
		chmodSync(backedUpDecisionPath, 0o644)
		mat(run(BACKUP, ["verify", "--input", backupPath]).stderr, /permission mismatch/)
		chmodSync(backedUpDecisionPath, 0o600)
		wf(backedUpDecisionPath, Buffer.concat([backedUpDecisionBytes, Buffer.from(" ")]))
		mat(run(BACKUP, ["verify", "--input", backupPath]).stderr, /file manifest mismatch/)
		wf(backedUpDecisionPath, backedUpDecisionBytes)
		const sourceSymlink = rp("prospects", "backup-symlink")
		sl(rp("clients"), sourceSymlink, "dir")
		blockBackup("rejected-symlink")
		un(sourceSymlink)
		const danglingRoot = rp("prospects")
		rn(danglingRoot, `${danglingRoot}-real`)
		sl(rp("missing-prospects"), danglingRoot, "dir")
		const danglingRootBackup = join(backupParent, "dangling-root")
		neq(run(BACKUP, ["create", "--output", danglingRootBackup]).status, 0)
		eq(ex(danglingRootBackup), false)
		un(danglingRoot)
		rn(`${danglingRoot}-real`, danglingRoot)
		const danglingOutput = join(backupParent, "dangling-output")
		sl(join(backupParent, "missing-output-target"), danglingOutput, "dir")
		const danglingOutputBlocked = run(BACKUP, ["create", "--output", danglingOutput])
		neq(danglingOutputBlocked.status, 0)
		mat(danglingOutputBlocked.stderr, /backup output already exists/)
		assert(lstatSync(danglingOutput).isSymbolicLink())
		un(danglingOutput)
		md(rp("runtime"), {recursive: true})
		const inRepoBackup = rp("runtime", "in-repo-backup")
		neq(run(BACKUP, ["create", "--output", inRepoBackup]).status, 0)
		eq(ex(inRepoBackup), false)
	} finally {
		rm(backupParent, {recursive: true, force: true})
	}

	assert(ALLOWED_COMMANDS.every(argv => Array.isArray(argv) && argv.every(part => typeof part === "string")))
	const engineSource = [rf(join(process.cwd(), "scripts/lib/review-queue.mjs"), "utf8"), rf(join(process.cwd(), QUEUE), "utf8")].join("\n")
	assert(!/node:child_process|\bfetch\s*\(|\bexec(?:File)?\s*\(|\bspawn\s*\(/.test(engineSource))

	console.log(JSON.stringify({status: "passed", checks: 38}, null, 2))
} finally {
	rm(R, {recursive: true, force: true})
}
