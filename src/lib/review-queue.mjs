import {existsSync, lstatSync, readdirSync, readFileSync, unlinkSync} from "node:fs"
import {basename, dirname, join, relative} from "node:path"
import {ALLOWED_COMMANDS, ACTIVE_OPERATOR_ARTIFACTS, DENIED_ACTIONS, acquireLock, atomicWriteJson, ensureDir, minifiedJson, queueInputHashFor, readJson, resolveRepoPath, sha256, validateApplication, validateDecision} from "./service-contract.mjs"
import {agencyConfig} from "./agency-config.mjs"
import {pendingPromotionApplicationIds} from "./service-promotion-journal.mjs"
import {isIsoCalendarDate, localIsoDate, localStartOfIsoDate, timestampIsOnOrBeforeLocalDate} from "../date-utils.mjs"

export const QUEUE_VERSION = 1
export const DEFAULT_QUEUE_DIR = "runs/service-engine"
export const DEFAULT_DECISIONS_DIR = "service-decisions"
export const REVIEW_CAP_LEDGER_CONTRACT = "tinystudio.review-cap-ledger"
export const REVIEW_CAP_JOURNAL_CONTRACT = "tinystudio.review-cap-decision-journal"
const REVIEW_CAP_ATOMIC_TEMP = /^(?:review-cap-ledger|review-cap-decision-journal)\.json\.tmp-\d+-[0-9a-f]{8}-(?:[0-9a-f]{4}-){3}[0-9a-f]{12}$/i
import {
	AGENT_WORK_CONTRACT,
	AGENT_WORK_STATES,
	ACTIVE_SPRINT_STATES,
	CLAIMS_POLICY_VERSION,
	PAUSABLE_STATES,
	REVIEW_STATES,
	STAGE_EVIDENCE_CONTRACT,
	WORK_PACKET_VERSION,
	agentWorkClaimRiskFlags,
	assert,
	assertExactKeys,
	buildAgentWorkPacket,
	checkString,
	checkedStageEvidencePath,
	contextHistoryHash,
	day0For,
	isHash,
	isIso,
	latestIso,
	readServiceState,
	safeState,
	serviceContextEntry,
	serviceDeadlineAt,
	servicePath,
	serviceRecordPaths,
	validateAgentWorkOutput,
	validateContextEntry,
	validateDay0Record,
	validateDecisionStageAlignment,
	validateLocalDate,
	validateStageEvidence
} from "./service-artifacts.mjs"
export {AGENT_WORK_CONTRACT, CLAIMS_POLICY_VERSION, STAGE_EVIDENCE_CONTRACT, WORK_PACKET_VERSION, contextHistoryHash, readServiceState, serviceContextEntry, serviceDeadlineAt, serviceRecordPaths, validateDay0Record, validateDecisionStageAlignment, validateStageEvidence}
export {NO_GUARANTEE_DISCLAIMER} from "./service-contract.mjs"

function entryStat(path) {
	try {
		return lstatSync(path)
	} catch (error) {
		if (error?.code === "ENOENT") return null
		throw error
	}
}

function assertRegularFile(path, name) {
	const stat = entryStat(path)
	assert(stat?.isFile() && !stat.isSymbolicLink(), `${name} must be a regular file`)
	return stat
}

function reviewDecisionRoot(repoRoot) {
	const root = servicePath(repoRoot, DEFAULT_DECISIONS_DIR)
	const stat = entryStat(root)
	if (stat) assert(stat.isDirectory() && !stat.isSymbolicLink(), "review decision root must be a real directory")
	return root
}

export function queuePaths(repoRoot = process.cwd()) {
	const queueDir = servicePath(repoRoot, DEFAULT_QUEUE_DIR)
	return {queueDir, queueFile: resolveRepoPath(repoRoot, relative(repoRoot, join(queueDir, "queue.json"))), lockDir: resolveRepoPath(repoRoot, relative(repoRoot, join(queueDir, ".lock"))), decisionsDir: reviewDecisionRoot(repoRoot)}
}

export function decisionPathFor(repoRoot, id, state, queueInputHash) {
	safeState(state)
	assert(typeof id === "string" && id.length > 0 && !id.includes("/") && !id.includes("\\"), "decision path requires a safe application id")
	assert(isHash(queueInputHash), "decision path requires a queue input hash")
	const root = reviewDecisionRoot(repoRoot)
	const applicationDirectory = join(root, id)
	const stateDirectory = join(applicationDirectory, state)
	for (const [path, name] of [
		[applicationDirectory, "review decision application directory"],
		[stateDirectory, "review decision state directory"]
	]) {
		const stat = entryStat(path)
		if (stat) assert(stat.isDirectory() && !stat.isSymbolicLink(), `${name} must be a real directory`)
	}
	const path = join(stateDirectory, `${queueInputHash}.json`)
	return resolveRepoPath(repoRoot, relative(repoRoot, path))
}

function decisionFor(repoRoot, id, state, queueInputHash) {
	const path = decisionPathFor(repoRoot, id, state, queueInputHash)
	const stat = entryStat(path)
	if (stat) assertRegularFile(path, "review decision entry")
	return {path, value: stat ? readJson(path) : null}
}

function verifiedRevisionRecord(repoRoot, path, hash, name) {
	checkString(path, `${name} path`, 1, 1200)
	assert(isHash(hash), `${name} hash is invalid`)
	const absolutePath = resolveRepoPath(repoRoot, path)
	assertRegularFile(absolutePath, name)
	const value = readJson(absolutePath)
	assert(sha256(minifiedJson(value)) === hash, `${name} hash mismatch`)
	return value
}

function revisionFeedbackFromHistory(state, application, repoRoot) {
	const feedback = []
	let priorDeliveryRevision = 0
	let latestApprovedArtifact = null
	for (const entry of state.transitionHistory) {
		if (entry.kind === "decision") {
			const decisionPath = decisionPathFor(repoRoot, application.applicationId, entry.from, entry.queueInputHash)
			assertRegularFile(decisionPath, "revision decision record")
			const decision = validateDecision(readJson(decisionPath), {
				repoRoot,
				expected: {
					applicationId: application.applicationId,
					sourceHash: application.sourceHash,
					packetHash: application.qualification.packetHash || "",
					queueInputHash: entry.queueInputHash
				}
			})
			assert(decision.decisionHash === entry.decisionHash, "revision decision history hash mismatch")
			const transition = transitionFor(entry.from, decision.decision, priorDeliveryRevision)
			const requiresRevision = decision.decision === "decline" && (AGENT_WORK_STATES.has(entry.from) || entry.from === "client-approved" || entry.from === "implementation")
			if (requiresRevision) {
				assert(["delivery-draft", "scope-review"].includes(transition.state), "revision feedback has an invalid target state")
				let evidencePath = ""
				let evidenceHash = ""
				let clientFeedback = ""
				if (entry.evidencePath) {
					evidencePath = entry.evidencePath
					evidenceHash = entry.evidenceHash
					const evidence = verifiedRevisionRecord(repoRoot, evidencePath, evidenceHash, "revision evidence record")
					clientFeedback = evidence.signals?.clientFeedback || evidence.signals?.usefulnessNote || ""
				}
				checkString(clientFeedback, "revision client feedback", REVIEW_STATES.has(entry.from) ? 3 : 0, 1200)
				const artifact = AGENT_WORK_STATES.has(entry.from) ? {path: entry.artifactPath, hash: entry.artifactHash} : latestApprovedArtifact
				assert(artifact?.path && artifact?.hash, "revision feedback is missing the exact artifact being revised")
				verifiedRevisionRecord(repoRoot, artifact.path, artifact.hash, "revision artifact record")
				feedback.push({
					decisionHash: decision.decisionHash,
					decisionNote: decision.note,
					clientFeedback,
					sourceState: entry.from,
					at: entry.at,
					revision: entry.contextRevision,
					evidencePath,
					evidenceHash,
					artifactPath: artifact.path,
					artifactHash: artifact.hash
				})
			}
		}
		if (entry.to === "client-approved" && entry.artifactPath && entry.artifactHash) latestApprovedArtifact = {path: entry.artifactPath, hash: entry.artifactHash}
		priorDeliveryRevision = entry.deliveryRevision
	}
	return feedback
}

export function reviewCapLedgerPath(repoRoot) {
	return resolveRepoPath(repoRoot, relative(repoRoot, join(reviewDecisionRoot(repoRoot), "review-cap-ledger.json")))
}

export function reviewCapJournalPath(repoRoot) {
	return resolveRepoPath(repoRoot, relative(repoRoot, join(reviewDecisionRoot(repoRoot), "review-cap-decision-journal.json")))
}

function reviewCapLedgerValue(entries) {
	const value = {contract: REVIEW_CAP_LEDGER_CONTRACT, schemaVersion: 1, entries}
	return {...value, ledgerHash: sha256(minifiedJson(value))}
}

function reviewCapRootEntries(repoRoot) {
	const root = reviewDecisionRoot(repoRoot)
	if (!existsSync(root)) return []
	return readdirSync(root, {withFileTypes: true})
		.sort((a, b) => a.name.localeCompare(b.name))
		.filter(entry => {
			if (entry.name === ".DS_Store") {
				assert(entry.isFile(), "invalid review decision root .DS_Store")
				return false
			}
			if (!REVIEW_CAP_ATOMIC_TEMP.test(entry.name)) return true
			assert(entry.isFile(), "review cap atomic temp entry must be a regular file")
			return false
		})
}

function validateReviewCapLedger(value, repoRoot) {
	assertExactKeys(value, ["contract", "schemaVersion", "entries", "ledgerHash"], "review cap ledger")
	assert(value.contract === REVIEW_CAP_LEDGER_CONTRACT && value.schemaVersion === 1, "invalid review cap ledger contract")
	assert(Array.isArray(value.entries), "review cap ledger entries must be an array")
	const hashes = new Set()
	const keys = new Set()
	value.entries.forEach((entry, index) => {
		assertExactKeys(entry, ["applicationId", "state", "queueInputHash", "decisionHash", "decidedAt"], `review cap ledger entries[${index}]`)
		decisionPathFor(repoRoot, entry.applicationId, entry.state, entry.queueInputHash)
		assert(isHash(entry.decisionHash) && isIso(entry.decidedAt), `review cap ledger entries[${index}] is invalid`)
		const key = `${entry.applicationId}:${entry.state}:${entry.queueInputHash}`
		assert(!hashes.has(entry.decisionHash) && !keys.has(key), "review cap ledger contains a duplicate decision")
		hashes.add(entry.decisionHash)
		keys.add(key)
	})
	assert(value.ledgerHash === reviewCapLedgerValue(value.entries).ledgerHash, "review cap ledger hash mismatch")
	return value
}

export function ensureReviewCapLedger(repoRoot, {allowCreate = false} = {}) {
	const path = reviewCapLedgerPath(repoRoot)
	if (!entryStat(path)) {
		assert(allowCreate && serviceRecordPaths(repoRoot, "all").length === 0 && reviewCapRootEntries(repoRoot).length === 0, "review cap ledger is missing")
		ensureDir(dirname(path))
		atomicWriteJson(path, reviewCapLedgerValue([]))
	} else assertRegularFile(path, "review cap ledger")
	return validateReviewCapLedger(readJson(path), repoRoot)
}

export function appendReviewCapLedgerEntry(repoRoot, decision, state) {
	const ledger = ensureReviewCapLedger(repoRoot)
	const entry = {applicationId: decision.applicationId, state, queueInputHash: decision.queueInputHash, decisionHash: decision.decisionHash, decidedAt: decision.decidedAt}
	const existing = ledger.entries.find(candidate => candidate.decisionHash === entry.decisionHash || (candidate.applicationId === entry.applicationId && candidate.state === entry.state && candidate.queueInputHash === entry.queueInputHash))
	if (existing) {
		assert(minifiedJson(existing) === minifiedJson(entry), "review cap ledger decision conflict")
		return existing
	}
	const next = reviewCapLedgerValue([...ledger.entries, entry])
	validateReviewCapLedger(next, repoRoot)
	atomicWriteJson(reviewCapLedgerPath(repoRoot), next)
	return entry
}

function reviewCapJournalValue(decision, state) {
	const value = {contract: REVIEW_CAP_JOURNAL_CONTRACT, schemaVersion: 1, state, decision}
	return {...value, journalHash: sha256(minifiedJson(value))}
}

function validateReviewCapJournal(value, repoRoot) {
	assertExactKeys(value, ["contract", "schemaVersion", "state", "decision", "journalHash"], "review cap decision journal")
	assert(value.contract === REVIEW_CAP_JOURNAL_CONTRACT && value.schemaVersion === 1, "invalid review cap decision journal contract")
	safeState(value.state)
	validateDecision(value.decision, {repoRoot})
	assert(value.journalHash === reviewCapJournalValue(value.decision, value.state).journalHash, "review cap decision journal hash mismatch")
	return value
}

export function createReviewCapJournal(repoRoot, decision, state) {
	ensureReviewCapLedger(repoRoot)
	const path = reviewCapJournalPath(repoRoot)
	assert(!entryStat(path), "review cap decision journal requires repair")
	const value = reviewCapJournalValue(decision, state)
	validateReviewCapJournal(value, repoRoot)
	atomicWriteJson(path, value)
	return value
}

export function repairReviewCapJournal(repoRoot, expectedApplicationId = "") {
	const path = reviewCapJournalPath(repoRoot)
	assertRegularFile(path, "review cap decision journal")
	const journal = validateReviewCapJournal(readJson(path), repoRoot)
	if (expectedApplicationId) assert(journal.decision.applicationId === expectedApplicationId, `review cap decision journal belongs to ${journal.decision.applicationId}`)
	const output = decisionPathFor(repoRoot, journal.decision.applicationId, journal.state, journal.decision.queueInputHash)
	if (entryStat(output)) {
		assertRegularFile(output, "review cap journal decision path")
		assert(minifiedJson(readJson(output)) === minifiedJson(journal.decision), "review cap journal decision file conflict")
	} else atomicWriteJson(output, journal.decision)
	appendReviewCapLedgerEntry(repoRoot, journal.decision, journal.state)
	unlinkSync(path)
	return {status: "repaired", applicationId: journal.decision.applicationId, decisionPath: relative(repoRoot, output), decisionHash: journal.decision.decisionHash}
}

export function pendingReviewCapJournalApplicationId(repoRoot) {
	const path = reviewCapJournalPath(repoRoot)
	if (!entryStat(path)) return ""
	assertRegularFile(path, "review cap decision journal")
	return validateReviewCapJournal(readJson(path), repoRoot).decision.applicationId
}

function decisionsRecordedOnLocalDate(repoRoot, isoDate) {
	const root = servicePath(repoRoot, DEFAULT_DECISIONS_DIR)
	const pendingJournalId = pendingReviewCapJournalApplicationId(repoRoot)
	if (pendingJournalId) throw new Error(`review cap decision journal requires repair: ${pendingJournalId}`)
	const decisions = new Map()
	let decisionFileCount = 0
	for (const applicationEntry of reviewCapRootEntries(repoRoot)) {
		if (["review-cap-ledger.json", "review-cap-decision-journal.json"].includes(applicationEntry.name)) {
			assert(applicationEntry.isFile(), "review cap control file must be a regular file")
			continue
		}
		assert(applicationEntry.isDirectory(), `review decision application entry must be a directory: ${applicationEntry.name}`)
		const applicationDirectory = resolveRepoPath(repoRoot, relative(repoRoot, join(root, applicationEntry.name)))
		for (const stateEntry of readdirSync(applicationDirectory, {withFileTypes: true}).sort((a, b) => a.name.localeCompare(b.name))) {
			if (stateEntry.name === ".DS_Store") {
				assert(stateEntry.isFile(), `invalid review decision .DS_Store: ${applicationEntry.name}`)
				continue
			}
			assert(stateEntry.isDirectory(), `review decision state entry must be a directory: ${applicationEntry.name}/${stateEntry.name}`)
			const stateDirectory = resolveRepoPath(repoRoot, relative(repoRoot, join(applicationDirectory, stateEntry.name)))
			for (const decisionEntry of readdirSync(stateDirectory, {withFileTypes: true}).sort((a, b) => a.name.localeCompare(b.name))) {
				if (!decisionEntry.name.endsWith(".json")) continue
				assert(decisionEntry.isFile(), "review decision entry must be a regular file")
				const path = resolveRepoPath(repoRoot, relative(repoRoot, join(stateDirectory, decisionEntry.name)))
				const decision = validateDecision(readJson(path), {repoRoot})
				assert(!decisions.has(decision.decisionHash), "review cap ledger found a duplicate decision file")
				decisions.set(decision.decisionHash, {decision, path})
				decisionFileCount += 1
			}
		}
	}
	const path = reviewCapLedgerPath(repoRoot)
	if (!entryStat(path)) {
		assert(decisionFileCount === 0 && serviceRecordPaths(repoRoot, "all").length === 0, "review cap ledger is missing")
		return 0
	}
	assertRegularFile(path, "review cap ledger")
	const ledger = validateReviewCapLedger(readJson(path), repoRoot)
	for (const entry of ledger.entries) {
		const recorded = decisions.get(entry.decisionHash)
		const expectedPath = decisionPathFor(repoRoot, entry.applicationId, entry.state, entry.queueInputHash)
		assert(recorded && recorded.path === expectedPath, "review cap ledger decision file is missing or moved")
		assert(recorded.decision.applicationId === entry.applicationId && recorded.decision.queueInputHash === entry.queueInputHash && recorded.decision.decidedAt === entry.decidedAt, "review cap ledger decision mismatch")
	}
	assert(decisionFileCount === ledger.entries.length, "review cap ledger does not cover every decision file")
	return ledger.entries.filter(entry => localIsoDate(new Date(entry.decidedAt)) === isoDate).length
}

function validateStateHistory(state, application, repoRoot, asOfDate) {
	const history = state.transitionHistory
	const first = history[0]
	assert(first && first.kind === "initial" && first.from === "" && first.to === "fit-review", "service state history has no valid initial state")
	let previous = ""
	let previousAt = 0
	let previousRevision = 0
	let previousDeliveryRevision = 0
	let pausedFrom = ""
	let needsInfoResumeState = ""
	let historicalApprovedArtifactHash = ""
	let historicalApprovedArtifact = null
	let historicalImplementationAcceptedAt = ""
	let historicalImplementationBaseline = null
	const persistedDay0 = history.some(entry => entry.day0Hash) ? validateDay0Record(readJson(join(findApplicationFolder(repoRoot, application.applicationId), "service-day0.json")), application.applicationId) : null
	const decisionHashes = []
	const derivedContextHistory = []
	history.forEach((entry, index) => {
		assertExactKeys(entry, ["from", "to", "kind", "at", "contextRevision", "deliveryRevision", "queueInputHash", "decisionHash", "day0Hash", "evidenceHash", "artifactPath", "artifactHash", "evidencePath", "implementationAcceptedAt", "contextEntry", "contextHash"], `service state transitionHistory[${index}]`)
		safeState(entry.to)
		if (index > 0) {
			safeState(entry.from)
			assert(entry.from === previous, "service state transition history is not contiguous")
		}
		assert(isIso(entry.at), "service state transition timestamp is invalid")
		assert(Date.parse(entry.at) >= previousAt, "service state transition timestamps are not chronological")
		assert(timestampIsOnOrBeforeLocalDate(entry.at, asOfDate), "service state transition is after queue as-of date")
		assert(Number.isInteger(entry.contextRevision) && entry.contextRevision >= 0, "service state transition revision is invalid")
		assert(Number.isInteger(entry.deliveryRevision) && entry.deliveryRevision >= 0, "service state transition delivery revision is invalid")
		assert(entry.queueInputHash === "" || isHash(entry.queueInputHash), "service state transition queue hash is invalid")
		assert(entry.decisionHash === "" || isHash(entry.decisionHash), "service state transition decision hash is invalid")
		assert(entry.day0Hash === "" || isHash(entry.day0Hash), "service state transition Day 0 hash is invalid")
		assert(entry.evidenceHash === "" || isHash(entry.evidenceHash), "service state transition evidence hash is invalid")
		assert(entry.artifactHash === "" || isHash(entry.artifactHash), "service state transition artifact hash is invalid")
		assert(isHash(entry.contextHash), "service state transition context hash is invalid")
		for (const [pathField, hashField] of [
			["artifactPath", "artifactHash"],
			["evidencePath", "evidenceHash"]
		]) {
			checkString(entry[pathField], `service state transition ${pathField}`, 0, 1200)
			if (!entry[pathField]) assert(entry[hashField] === "", `${pathField} is missing its hash`)
			else {
				const artifactPath = resolveRepoPath(repoRoot, entry[pathField])
				assert(existsSync(artifactPath), `${pathField} is missing`)
				assert(isHash(entry[hashField]), `${pathField} hash is missing`)
				assert(sha256(minifiedJson(readJson(artifactPath))) === entry[hashField], `${pathField} hash mismatch`)
			}
		}
		assert(entry.implementationAcceptedAt === "" || isIso(entry.implementationAcceptedAt), "implementation acceptance timestamp is invalid")
		if (index === 0) {
			assert(entry.contextRevision === 0, "initial service state revision must be zero")
			assert(entry.deliveryRevision === 0, "initial delivery revision must be zero")
			assert(entry.at === application.submittedAt, "initial service state timestamp mismatch")
			assert(entry.queueInputHash === queueInputHashFor({applicationId: application.applicationId, sourceHash: application.sourceHash, packetHash: application.qualification.packetHash || "", schemaVersion: application.schemaVersion, state: "fit-review"}), "initial service queue hash mismatch")
			assert(entry.decisionHash === "" && entry.day0Hash === "" && entry.evidenceHash === "" && entry.artifactPath === "" && entry.artifactHash === "" && entry.evidencePath === "" && entry.implementationAcceptedAt === "", "initial service state contains transition evidence")
			assert(entry.contextEntry === null, "initial service state contains context")
		} else if (entry.kind === "decision") {
			assert(entry.decisionHash, "decision transition is missing decision hash")
			const path = decisionPathFor(repoRoot, application.applicationId, entry.from, entry.queueInputHash)
			assert(existsSync(path), "decision transition file is missing")
			const decision = validateDecision(readJson(path), {repoRoot, expected: {applicationId: application.applicationId, sourceHash: application.sourceHash, packetHash: application.qualification.packetHash || "", queueInputHash: entry.queueInputHash}})
			assert(entry.at === decision.decidedAt, "decision transition timestamp does not match decision")
			assert(entry.decisionHash === decision.decisionHash, "decision transition hash does not match its immutable decision")
			const transition = transitionFor(entry.from, decision.decision, previousDeliveryRevision)
			assert(entry.to === transition.state, "decision transition does not match the recorded decision")
			assert(entry.contextRevision === previousRevision + (transition.revise ? 1 : 0), "decision transition revision mismatch")
			assert(entry.deliveryRevision === previousDeliveryRevision + (transition.deliveryRevise ? 1 : 0), "decision transition delivery revision mismatch")
			if (transition.state === "needs-info") {
				validateContextEntry(entry.contextEntry, `service state transitionHistory[${index}].contextEntry`)
				assert(entry.contextEntry.kind === "request" && entry.contextEntry.note === decision.note && entry.contextEntry.at === entry.at && entry.contextEntry.revision === entry.contextRevision, "needs-info context is not bound to its decision")
			} else {
				assert(entry.contextEntry === null, "non-context decision transition contains context")
			}
			const requiresArtifact = AGENT_WORK_STATES.has(entry.from)
			assert(Boolean(entry.artifactPath) === requiresArtifact && Boolean(entry.artifactHash) === requiresArtifact, "decision transition artifact provenance mismatch")
			const requiresEvidence = REVIEW_STATES.has(entry.from)
			assert(Boolean(entry.evidencePath) === requiresEvidence && Boolean(entry.evidenceHash) === requiresEvidence, "decision transition evidence provenance mismatch")
			let reviewedStageEvidence = null
			if (requiresEvidence) {
				reviewedStageEvidence = validateStageEvidence(readJson(resolveRepoPath(repoRoot, entry.evidencePath)), {
					application,
					state: entry.from,
					approvedArtifactHash: historicalApprovedArtifactHash,
					approvedArtifact: historicalApprovedArtifact,
					implementationAcceptedAt: historicalImplementationAcceptedAt,
					implementationBaseline: historicalImplementationBaseline,
					pauseHistory: persistedDay0?.pauseHistory || [],
					activePause: persistedDay0?.activePause || null,
					asOfDate,
					notBefore: history[index - 1]?.at || ""
				})
				validateDecisionStageAlignment(entry.from, decision.decision, {clientOutcome: reviewedStageEvidence.signals.clientOutcome || "", acceptanceStatus: reviewedStageEvidence.signals.acceptanceStatus || ""})
			}
			if (AGENT_WORK_STATES.has(entry.from)) {
				validateDecisionStageAlignment(entry.from, decision.decision, null, {status: readJson(resolveRepoPath(repoRoot, entry.artifactPath)).status})
			}
			const reviewedContextHash = entry.day0Hash || derivedContextHistory.length ? sha256(minifiedJson({day0Hash: entry.day0Hash, contextHistoryHash: contextHistoryHash(derivedContextHistory)})) : ""
			const expectedQueueInputHash = queueInputHashFor({
				applicationId: application.applicationId,
				sourceHash: application.sourceHash,
				packetHash: application.qualification.packetHash || "",
				schemaVersion: application.schemaVersion,
				state: entry.from,
				artifactHash: entry.artifactHash,
				contextHash: reviewedContextHash,
				evidenceHash: entry.evidenceHash,
				revision: previousRevision
			})
			assert(entry.queueInputHash === expectedQueueInputHash, "decision transition queue hash does not match reviewed provenance")
			if (entry.from === "implementation" && decision.decision === "approve") {
				assert(entry.implementationAcceptedAt, "implementation approval is missing its acceptance timestamp")
				assert(entry.evidencePath && readJson(resolveRepoPath(repoRoot, entry.evidencePath)).recordedAt === entry.implementationAcceptedAt, "implementation acceptance timestamp does not match evidence")
				historicalImplementationBaseline = reviewedStageEvidence.signals.measurementBaseline
			} else {
				assert(entry.implementationAcceptedAt === "", "non-implementation transition contains an acceptance timestamp")
			}
			needsInfoResumeState = transition.state === "needs-info" ? transition.resumeState : ""
			pausedFrom = ""
			decisionHashes.push(entry.decisionHash)
		} else if (entry.kind === "day0") {
			assert(entry.decisionHash === "", "Day 0 transition has a decision hash")
			assert(entry.queueInputHash === "", "Day 0 transition must not retain an unreplayable queue hash")
			assert(entry.contextRevision === previousRevision, "Day 0 transition changed the context revision")
			assert(entry.deliveryRevision === previousDeliveryRevision, "Day 0 transition changed the delivery revision")
			assert(entry.contextEntry === null, "Day 0 transition contains context")
			assert(entry.artifactPath === "" && entry.artifactHash === "" && entry.evidencePath === "" && entry.evidenceHash === "" && entry.implementationAcceptedAt === "", "Day 0 transition contains unrelated provenance")
			const validDay0Transition = (entry.from === "approved-awaiting-day0" && entry.to === "day0-ready") || (PAUSABLE_STATES.has(entry.from) && entry.from !== "paused-with-reason" && entry.to === "paused-with-reason") || (PAUSABLE_STATES.has(entry.from) && entry.to === entry.from)
			assert(validDay0Transition, "invalid Day 0 or pause transition")
			pausedFrom = entry.to === "paused-with-reason" ? entry.from : ""
			needsInfoResumeState = ""
		} else if (entry.kind === "resume") {
			assert(entry.decisionHash === "", "resume transition has a decision hash")
			assert(entry.queueInputHash === "", "resume transition must not retain an unreplayable queue hash")
			assert(entry.contextRevision === previousRevision + 1, "resume transition must increment the context revision")
			assert(entry.deliveryRevision === previousDeliveryRevision, "resume transition changed the delivery revision")
			validateContextEntry(entry.contextEntry, `service state transitionHistory[${index}].contextEntry`)
			assert(entry.contextEntry.at === entry.at && entry.contextEntry.revision === entry.contextRevision, "resume context is not bound to its transition")
			assert(entry.artifactPath === "" && entry.artifactHash === "" && entry.evidencePath === "" && entry.evidenceHash === "" && entry.implementationAcceptedAt === "", "resume transition contains unrelated provenance")
			if (entry.from === "needs-info") {
				assert(needsInfoResumeState && entry.to === needsInfoResumeState, "needs-info resumed to an unapproved state")
				assert(entry.contextEntry.kind === "response", "needs-info resume context must be a response")
			} else {
				assert(entry.from === "paused-with-reason" && pausedFrom, "resume transition has no matching pause")
				const expected = pausedFrom === "approved-awaiting-day0" ? "day0-ready" : pausedFrom
				assert(entry.to === expected, "pause resumed to the wrong state")
				assert(entry.contextEntry.kind === "pause-resolution", "pause resume context must be a pause resolution")
			}
			pausedFrom = ""
			needsInfoResumeState = ""
		} else if (entry.kind === "scope-authorization") {
			assert(entry.from === "scope-review" && entry.to === "delivery-draft", "scope authorization must return the client to delivery draft")
			assert(entry.decisionHash === "" && entry.queueInputHash === "", "scope authorization must not contain decision provenance")
			assert(entry.contextRevision === previousRevision + 1, "scope authorization must increment the context revision")
			assert(entry.deliveryRevision === previousDeliveryRevision + 1, "scope authorization must increment the delivery revision")
			validateContextEntry(entry.contextEntry, `service state transitionHistory[${index}].contextEntry`)
			assert(entry.contextEntry.kind === "scope-authorization", "scope authorization context has the wrong kind")
			assert(entry.contextEntry.at === entry.at && entry.contextEntry.revision === entry.contextRevision, "scope authorization context is not bound to its transition")
			assert(/^Authorized by: .+\nScope authorization: .+\nFee authorization: .+$/s.test(entry.contextEntry.note), "scope authorization must bind the human reviewer, scope, and fee approval")
			assert(entry.day0Hash, "scope authorization is missing paid Day 0 provenance")
			assert(entry.artifactPath === "" && entry.artifactHash === "" && entry.evidencePath === "" && entry.evidenceHash === "" && entry.implementationAcceptedAt === "", "scope authorization contains unrelated provenance")
			pausedFrom = ""
			needsInfoResumeState = ""
		} else {
			throw new Error(`invalid service state transition kind: ${entry.kind}`)
		}
		if (entry.contextEntry) derivedContextHistory.push(entry.contextEntry)
		assert(entry.contextHash === contextHistoryHash(derivedContextHistory), "service state transition context hash mismatch")
		previous = entry.to
		previousAt = Date.parse(entry.at)
		previousRevision = entry.contextRevision
		previousDeliveryRevision = entry.deliveryRevision
		if (entry.to === "client-approved" && entry.artifactHash) {
			historicalApprovedArtifactHash = entry.artifactHash
			historicalApprovedArtifact = readJson(resolveRepoPath(repoRoot, entry.artifactPath))
		}
		if (entry.from === "implementation" && entry.to === "tracking-14-day" && entry.implementationAcceptedAt) historicalImplementationAcceptedAt = entry.implementationAcceptedAt
	})
	assert(previous === state.state, "service state does not match its transition history")
	assert(history.at(-1).contextRevision === state.contextRevision, "service state revision is not bound to transition history")
	assert(history.at(-1).deliveryRevision === state.deliveryRevision, "service state delivery revision is not bound to transition history")
	assert(minifiedJson(state.contextHistory || []) === minifiedJson(derivedContextHistory), "service state context history is not transition-bound")
	if (state.state === "needs-info") assert(needsInfoResumeState && state.resumeState === needsInfoResumeState, "needs-info resumeState is not transition-bound")
	else if (state.state === "paused-with-reason") assert(pausedFrom && state.resumeState === pausedFrom, "paused resumeState is not transition-bound")
	else assert(!state.resumeState, "inactive resumeState is not allowed")
	const day0Entry = [...history].reverse().find(entry => entry.day0Hash)
	if (day0Entry) {
		const day0 = persistedDay0
		assert(day0, "Day 0 provenance file is missing")
		assert(day0Entry.day0Hash === sha256(minifiedJson(day0)), "Day 0 provenance hash mismatch")
		const firstDay0Entry = history.find(entry => entry.kind === "day0" && entry.from === "approved-awaiting-day0")
		assert(firstDay0Entry && day0.day0StartedAt === firstDay0Entry.at, "Day 0 start is not bound to its first transition")
		const startedPaused = firstDay0Entry.to === "paused-with-reason"
		const initialPause = day0.pauseHistory[0] || day0.activePause
		if (startedPaused) assert(initialPause, "Day 0 initial pause provenance is missing")
		const initialDay0 = {
			...day0,
			updatedAt: firstDay0Entry.at,
			paused: startedPaused,
			activePause: startedPaused ? {reason: initialPause.reason, startedAt: firstDay0Entry.at} : null,
			pauseHistory: [],
			totalPausedMs: 0,
			deadlineAt: serviceDeadlineAt(day0.day0StartedAt, []),
			resumeState: startedPaused ? "approved-awaiting-day0" : ""
		}
		assert(firstDay0Entry.day0Hash === sha256(minifiedJson(initialDay0)), "Day 0 initial provenance hash mismatch")
		const pauseStarts = history.filter(entry => entry.kind === "day0" && entry.to === "paused-with-reason")
		const pauseEnds = history.filter(entry => entry.kind === "resume" && entry.from === "paused-with-reason")
		assert(pauseStarts.length === day0.pauseHistory.length + (day0.paused ? 1 : 0), "Day 0 pause starts do not match transition history")
		assert(pauseEnds.length === day0.pauseHistory.length, "Day 0 pause ends do not match transition history")
		day0.pauseHistory.forEach((pause, index) => {
			assert(pause.startedAt === pauseStarts[index].at, `Day 0 pauseHistory[${index}] start is not transition-bound`)
			assert(pause.endedAt === pauseEnds[index].at, `Day 0 pauseHistory[${index}] end is not transition-bound`)
		})
		if (day0.paused) assert(day0.activePause.startedAt === pauseStarts.at(-1).at, "Day 0 active pause start is not transition-bound")
	}
	assert(JSON.stringify(state.usedDecisionHashes) === JSON.stringify(decisionHashes), "used decision hashes do not match transition history")
	if (state.updatedAt) assert(state.updatedAt === history.at(-1).at, "service state updatedAt does not match transition history")
	const approvedEntry = [...history].reverse().find(entry => entry.to === "client-approved" && entry.artifactHash)
	if (approvedEntry) assert(state.approvedArtifactHash === approvedEntry.artifactHash, "approvedArtifactHash projection is not provenance-bound")
	else assert(!state.approvedArtifactHash, "approvedArtifactHash has no transition provenance")
	const implementationEntry = [...history].reverse().find(entry => entry.from === "implementation" && entry.to === "tracking-14-day" && entry.implementationAcceptedAt)
	if (implementationEntry) assert(state.implementationAcceptedAt === implementationEntry.implementationAcceptedAt, "implementation acceptance projection is not provenance-bound")
	else assert(!state.implementationAcceptedAt, "implementationAcceptedAt has no transition provenance")
}

export function findApplicationFolder(repoRoot, applicationId) {
	for (const path of serviceRecordPaths(repoRoot, "all")) {
		try {
			if (readJson(path).applicationId === applicationId) return dirname(path)
		} catch {}
	}
	throw new Error("application folder is missing")
}

export function appendStateTransition(
	state,
	{
		from,
		to,
		kind,
		at,
		contextRevision = state.contextRevision,
		deliveryRevision = state.deliveryRevision,
		queueInputHash,
		decisionHash = "",
		day0Hash = "",
		evidenceHash = "",
		artifactPath = "",
		artifactHash = "",
		evidencePath = "",
		implementationAcceptedAt = "",
		contextEntry = null,
		contextHash = contextHistoryHash(state.contextHistory || [])
	}
) {
	const entry = {from, to, kind, at, contextRevision, deliveryRevision, queueInputHash, decisionHash, day0Hash, evidenceHash, artifactPath, artifactHash, evidencePath, implementationAcceptedAt, contextEntry, contextHash}
	return {...state, transitionHistory: [...state.transitionHistory, entry]}
}

function acceptedImplementationBaselineFromHistory(state, repoRoot) {
	const entry = [...state.transitionHistory].reverse().find(candidate => candidate.from === "implementation" && candidate.to === "tracking-14-day" && candidate.implementationAcceptedAt && candidate.evidencePath)
	if (!entry) return null
	const evidence = readJson(resolveRepoPath(repoRoot, entry.evidencePath))
	assert(sha256(minifiedJson(evidence)) === entry.evidenceHash, "accepted implementation evidence hash mismatch")
	return evidence.signals.measurementBaseline
}

export function staleGeneratedArtifacts(repoRoot, asOfDate) {
	const asOf = localStartOfIsoDate(validateLocalDate(asOfDate, "asOfDate"))
	return ACTIVE_OPERATOR_ARTIFACTS.flatMap(relativePath => {
		const path = join(repoRoot, relativePath)
		if (!existsSync(path)) return [`${relativePath} (missing)`]
		const match = readFileSync(path, "utf8").match(/\bGenerated:?\s*(\d{4}-\d{2}-\d{2})/m)
		if (!match) return [`${relativePath} (generation date missing)`]
		if (!isIsoCalendarDate(match[1])) return [`${relativePath} (generation date is invalid: ${match[1]})`]
		if (match[1] > asOfDate) return [`${relativePath} (generated after queue as-of date: ${match[1]})`]
		const ageDays = Math.floor((asOf - localStartOfIsoDate(match[1])) / 86400000)
		return ageDays > 7 ? [`${relativePath} (generated ${match[1]}, ${ageDays} days old)`] : []
	})
}

function validateCurrentDecision(decision, application, queueInputHash, usedDecisionHashes, repoRoot, asOfDate = "", notBefore = "") {
	if (!decision) return
	if (usedDecisionHashes.includes(decision.decisionHash)) throw new Error("decision replay")
	validateDecision(decision, {repoRoot, expected: {applicationId: application.applicationId, sourceHash: application.sourceHash, packetHash: application.qualification.packetHash || "", queueInputHash}})
	if (notBefore) assert(Date.parse(decision.decidedAt) >= Date.parse(notBefore), "decision predates the material reviewed")
	if (asOfDate) assert(timestampIsOnOrBeforeLocalDate(decision.decidedAt, asOfDate), "decision is after queue as-of date")
}

function hasUnusedDecision(repoRoot, applicationId, state, usedDecisionHashes) {
	const directory = resolveRepoPath(repoRoot, relative(repoRoot, join(servicePath(repoRoot, DEFAULT_DECISIONS_DIR), applicationId, state)))
	if (!existsSync(directory)) return false
	return readdirSync(directory).some(name => {
		if (!name.endsWith(".json")) return false
		try {
			const value = readJson(join(directory, name))
			return value?.decisionHash && !usedDecisionHashes.includes(value.decisionHash)
		} catch {
			return true
		}
	})
}

function canonicalItem(application, folder, state, repoRoot, staleArtifacts, asOfDate) {
	const packetHash = application.qualification.packetHash || ""
	const blocked = []
	const needsInput = []
	let status = "needs-review"
	let agentWork = null
	let agentWorkOutput = null
	let claimRiskFlags = []
	let stageEvidence = null
	let artifactHash = ""
	let evidenceHash = ""
	let day0 = null
	let day0Hash = ""
	const contextHistory = state.contextHistory || []
	const contextNote = contextHistory.map(entry => `${entry.kind}: ${entry.note}`).join("\n")
	const revisionFeedback = revisionFeedbackFromHistory(state, application, repoRoot)
	const implementationBaseline = acceptedImplementationBaselineFromHistory(state, repoRoot)

	if (application.qualification.state !== "ready") {
		if (state.state === "fit-review" && application.qualification.state === "pending") {
			needsInput.push("ready qualification packet; requalification required")
		} else {
			blocked.push(`qualification ${application.qualification.state}; requalification required before ${state.state}`)
		}
	}

	try {
		day0 = day0For(folder, application.applicationId, ACTIVE_SPRINT_STATES.has(state.state) || state.state === "paused-with-reason")
		if (day0) {
			day0Hash = sha256(minifiedJson(day0))
			if (state.state === "paused-with-reason") assert(day0.paused && day0.resumeState === state.resumeState, "paused Day 0 resumeState does not match service state")
			else assert(!day0.paused && day0.resumeState === "", "active service state has a paused Day 0 record")
		}
	} catch (error) {
		blocked.push(error.message)
	}

	if (AGENT_WORK_STATES.has(state.state) && day0Hash) {
		agentWork = buildAgentWorkPacket(application, state.state, folder, repoRoot, day0Hash, state.contextRevision, contextNote)
		const revisionInputs = revisionFeedback.flatMap(entry => [entry.evidencePath, entry.artifactPath]).filter(Boolean)
		const packetWithoutHash = {...agentWork, inputs: [...new Set([...agentWork.inputs, ...revisionInputs])], revisionFeedback}
		delete packetWithoutHash.workPacketHash
		agentWork = {...packetWithoutHash, workPacketHash: sha256(minifiedJson(packetWithoutHash))}
		const outputPath = resolveRepoPath(repoRoot, agentWork.targetIgnoredPath)
		if (existsSync(outputPath)) {
			try {
				agentWorkOutput = validateAgentWorkOutput(readJson(outputPath), {application, packet: agentWork, asOfDate, notBefore: state.updatedAt})
				claimRiskFlags = agentWorkClaimRiskFlags(agentWorkOutput)
				artifactHash = sha256(minifiedJson(agentWorkOutput))
			} catch (error) {
				blocked.push(error.message)
			}
		}
	}

	if (REVIEW_STATES.has(state.state)) {
		const evidencePath = checkedStageEvidencePath(repoRoot, folder, state.state, state.contextRevision)
		if (existsSync(evidencePath)) {
			try {
				const approvedEntry = [...state.transitionHistory].reverse().find(entry => entry.to === "client-approved" && entry.artifactPath)
				stageEvidence = validateStageEvidence(readJson(evidencePath), {
					application,
					state: state.state,
					approvedArtifactHash: state.approvedArtifactHash || "",
					approvedArtifact: approvedEntry ? readJson(resolveRepoPath(repoRoot, approvedEntry.artifactPath)) : null,
					implementationAcceptedAt: state.implementationAcceptedAt || "",
					implementationBaseline,
					pauseHistory: day0?.pauseHistory || [],
					activePause: day0?.activePause || null,
					asOfDate,
					notBefore: state.updatedAt
				})
				evidenceHash = sha256(minifiedJson(stageEvidence))
			} catch (error) {
				blocked.push(error.message)
			}
		} else {
			needsInput.push(`service-evidence/${state.state}/${state.contextRevision}.json`)
		}
	}

	const contextHash = day0Hash || contextHistory.length ? sha256(minifiedJson({day0Hash, contextHistoryHash: contextHistoryHash(contextHistory)})) : ""
	const queueInputHash = queueInputHashFor({applicationId: application.applicationId, sourceHash: application.sourceHash, packetHash, schemaVersion: application.schemaVersion, state: state.state, artifactHash, contextHash, evidenceHash, revision: state.contextRevision})
	const decisionEntry = decisionFor(repoRoot, application.applicationId, state.state, queueInputHash)
	const decision = decisionEntry.value
	const reviewNotBefore = latestIso(state.updatedAt, day0?.updatedAt, agentWorkOutput?.preparedAt, stageEvidence?.recordedAt)
	const overdue = Boolean(day0 && !day0.paused && !["complete", "declined"].includes(state.state) && Date.parse(day0.deadlineAt) < localStartOfIsoDate(asOfDate))
	try {
		validateCurrentDecision(decision, application, queueInputHash, state.usedDecisionHashes, repoRoot, asOfDate, reviewNotBefore)
	} catch (error) {
		blocked.push(error.message)
	}
	if (!decision && !agentWorkOutput && hasUnusedDecision(repoRoot, application.applicationId, state.state, state.usedDecisionHashes)) {
		blocked.push("decision is stale for current queue input")
	}

	if (blocked.length) status = "blocked"
	else if (state.state === "fit-review" && application.qualification.state === "pending") status = "needs-input"
	else if (state.state === "fit-review") status = decision ? "auto-ready" : "needs-review"
	else if (state.state === "approved-awaiting-day0") {
		status = "needs-input"
		needsInput.push("paymentEvidence", "requiredContext", "approvalOwner", "implementationOwner")
	} else if (AGENT_WORK_STATES.has(state.state)) {
		status = !agentWorkOutput ? "needs-agent-work" : decision ? "auto-ready" : "needs-review"
		if (agentWorkOutput?.status === "needs-input") {
			needsInput.push(...agentWorkOutput.missingContext.fields.map(field => `agent-missing:${field}`))
			needsInput.push(agentWorkOutput.missingContext.request)
		}
	} else if (REVIEW_STATES.has(state.state)) {
		status = !stageEvidence ? "needs-input" : decision ? "auto-ready" : "needs-review"
	} else if (state.state === "paused-with-reason") {
		status = "needs-input"
		needsInput.push("service:resume --note")
		if (day0?.activePause?.reason) needsInput.push(`pause:${day0.activePause.reason}`)
	} else if (state.state === "needs-info") {
		status = "needs-input"
		needsInput.push("requestedInformation", "service:resume")
	} else if (state.state === "scope-review") {
		status = "needs-input"
		needsInput.push("human scope and fee authorization required: service:resume --authorized-by --scope-authorization --fee-authorization")
	} else if (state.state === "complete" || state.state === "declined") status = "done"

	return {
		applicationId: application.applicationId,
		sourceHash: application.sourceHash,
		packetHash,
		schemaVersion: application.schemaVersion,
		state: state.state,
		contextRevision: state.contextRevision,
		deliveryRevision: state.deliveryRevision,
		sourcePath: relative(repoRoot, folder),
		sourceCommand: "service:import",
		status,
		blocked,
		needsInput,
		staleArtifacts,
		queueInputHash,
		artifactHash,
		day0Hash,
		day0StartedAt: day0?.day0StartedAt || "",
		deadlineAt: day0?.deadlineAt || "",
		paused: Boolean(day0?.paused),
		overdue,
		contextHash,
		evidenceHash,
		reviewNotBefore,
		decisionPath: relative(repoRoot, decisionEntry.path),
		decisionHash: decision?.decisionHash || "",
		decision: decision ? {decision: decision.decision, reviewerLabel: decision.reviewerLabel, decidedAt: decision.decidedAt} : null,
		agentWork,
		agentWorkOutput: agentWorkOutput ? {path: agentWork.targetIgnoredPath, preparedAt: agentWorkOutput.preparedAt, preparedBy: agentWorkOutput.preparedBy, status: agentWorkOutput.status, missingContext: agentWorkOutput.missingContext, claimsPolicy: agentWorkOutput.claimsPolicy, claimRiskFlags, artifactHash} : null,
		stageEvidence: stageEvidence
			? {
					path: relative(repoRoot, checkedStageEvidencePath(repoRoot, folder, state.state, state.contextRevision)),
					recordedAt: stageEvidence.recordedAt,
					recordedBy: stageEvidence.recordedBy,
					clientOutcome: stageEvidence.signals.clientOutcome || "",
					clientFeedback: stageEvidence.signals.clientFeedback || stageEvidence.signals.usefulnessNote || "",
					acceptanceStatus: stageEvidence.signals.acceptanceStatus || "",
					evidenceHash
				}
			: null,
		implementationBaseline,
		contextNote,
		revisionFeedback,
		withinHumanDailyReviewCap: true,
		humanReviewSlot: null
	}
}

export function buildQueue({repoRoot = process.cwd(), scope = "all", asOfDate = localIsoDate(), trustedDate = localIsoDate()} = {}) {
	assert(["inbound", "prospects", "clients", "all"].includes(scope), `invalid queue scope: ${scope}`)
	validateLocalDate(asOfDate, "asOfDate")
	validateLocalDate(trustedDate, "trustedDate")
	assert(asOfDate <= trustedDate, "as-of date cannot be after the trusted date")
	const pendingPromotions = pendingPromotionApplicationIds(repoRoot)
	const staleArtifacts = staleGeneratedArtifacts(repoRoot, asOfDate)
	const items = []
	for (const applicationPath of serviceRecordPaths(repoRoot, scope)) {
		const folder = dirname(applicationPath)
		try {
			const application = validateApplication(readJson(applicationPath), {repoRoot})
			if (pendingPromotions.length) throw new Error(`service promotion journal requires repair before normal work: ${pendingPromotions.join(", ")}`)
			const state = readServiceState(folder)
			if (existsSync(join(folder, "service-transition-journal.json"))) throw new Error("service transition journal requires repair")
			validateStateHistory(state, application, repoRoot, asOfDate)
			items.push(canonicalItem(application, folder, state, repoRoot, staleArtifacts, asOfDate))
		} catch (error) {
			items.push({
				applicationId: basename(folder),
				sourcePath: relative(repoRoot, folder),
				sourceCommand: "service:import",
				status: "blocked",
				blocked: [error.message],
				needsInput: [],
				staleArtifacts,
				queueInputHash: "",
				artifactHash: "",
				day0Hash: "",
				day0StartedAt: "",
				deadlineAt: "",
				paused: false,
				overdue: false,
				contextHash: "",
				evidenceHash: "",
				reviewNotBefore: "",
				contextNote: "",
				sourceHash: "",
				packetHash: "",
				schemaVersion: QUEUE_VERSION,
				state: "fit-review",
				contextRevision: 0,
				deliveryRevision: 0,
				decisionPath: "",
				decisionHash: "",
				decision: null,
				agentWork: null,
				agentWorkOutput: null,
				stageEvidence: null,
				implementationBaseline: null,
				revisionFeedback: [],
				withinHumanDailyReviewCap: true,
				humanReviewSlot: null
			})
		}
	}
	items.sort((a, b) => String(a.applicationId).localeCompare(String(b.applicationId)))

	const humanDailyReviewCap = agencyConfig(repoRoot).humanDailyReviewCap
	assert(Number.isInteger(humanDailyReviewCap) && humanDailyReviewCap > 0, "humanDailyReviewCap must be a positive integer")
	const completedToday = decisionsRecordedOnLocalDate(repoRoot, asOfDate)
	let reviewSlot = completedToday
	let pendingReviews = 0
	for (const item of items) {
		if (item.status !== "needs-review") continue
		pendingReviews += 1
		item.humanReviewSlot = ++reviewSlot
		item.withinHumanDailyReviewCap = reviewSlot <= humanDailyReviewCap
	}
	const counts = items.reduce((acc, item) => {
		acc[item.status] = (acc[item.status] || 0) + 1
		return acc
	}, {})
	return {
		queueVersion: QUEUE_VERSION,
		mode: "offline",
		asOfDate,
		generatedAt: `${asOfDate}T00:00:00.000Z`,
		humanDailyReviewCap,
		reviewCap: {completedToday, scheduled: Math.min(pendingReviews, Math.max(0, humanDailyReviewCap - completedToday)), deferred: Math.max(0, pendingReviews - Math.max(0, humanDailyReviewCap - completedToday))},
		allowedCommands: ALLOWED_COMMANDS,
		deniedActions: DENIED_ACTIONS,
		pendingPromotions,
		staleArtifacts,
		items,
		counts
	}
}

export function prepareQueue({repoRoot = process.cwd(), scope = "all", asOfDate = localIsoDate(), trustedDate = localIsoDate(), dryRun = false} = {}) {
	const paths = queuePaths(repoRoot)
	if (dryRun) return buildQueue({repoRoot, scope, asOfDate, trustedDate})
	const release = acquireLock(paths.lockDir)
	try {
		const queue = buildQueue({repoRoot, scope, asOfDate, trustedDate})
		ensureDir(paths.queueDir)
		atomicWriteJson(paths.queueFile, queue)
		for (const item of queue.items) if (item.agentWork) atomicWriteJson(resolveRepoPath(repoRoot, item.agentWork.packetPath), item.agentWork)
		return queue
	} finally {
		release()
	}
}

function locateApplication(repoRoot, id) {
	const match = serviceRecordPaths(repoRoot, "all").find(path => {
		try {
			return readJson(path).applicationId === id
		} catch {
			return false
		}
	})
	if (!match) throw new Error(`application not found: ${id}`)
	return match
}

function transitionFor(state, decision, deliveryRevision = 0) {
	if (state === "fit-review") {
		if (decision === "approve") return {state: "approved-awaiting-day0"}
		if (decision === "decline") return {state: "declined"}
		return {state: "needs-info", resumeState: "fit-review"}
	}
	if (AGENT_WORK_STATES.has(state)) {
		if (decision === "approve") return {state: "client-approved"}
		if (decision === "decline") return {state: "delivery-draft", revise: true}
		return {state: "needs-info", resumeState: state}
	}
	if (state === "client-approved") {
		if (decision === "approve") return {state: "implementation"}
		if (decision === "decline") return deliveryRevision >= 1 ? {state: "scope-review"} : {state: "delivery-draft", revise: true, deliveryRevise: true}
		return {state: "needs-info", resumeState: state}
	}
	if (state === "implementation") {
		if (decision === "approve") return {state: "tracking-14-day"}
		if (decision === "decline") return deliveryRevision >= 1 ? {state: "scope-review"} : {state: "delivery-draft", revise: true, deliveryRevise: true}
		return {state: "needs-info", resumeState: state}
	}
	if (state === "tracking-14-day") {
		if (decision === "approve") return {state: "complete"}
		if (decision === "needs-info") return {state: "needs-info", resumeState: state}
		throw new Error("tracking-14-day decision must be approve or needs-info")
	}
	throw new Error(`state does not accept a review decision: ${state}`)
}

function validatedApplyCandidate(repoRoot, item) {
	if (item.status !== "auto-ready") throw new Error(`decision is not applicable: ${item.applicationId}`)
	const applicationPath = locateApplication(repoRoot, item.applicationId)
	const folder = dirname(applicationPath)
	const statePath = join(folder, "service-state.json")
	const state = readServiceState(folder)
	assert(state.state === item.state, `service state changed before apply: ${item.applicationId}`)
	const decision = readJson(join(repoRoot, item.decisionPath))
	if (state.usedDecisionHashes.includes(decision.decisionHash)) throw new Error(`decision replay: ${item.applicationId}`)
	validateDecision(decision, {repoRoot, expected: {applicationId: item.applicationId, sourceHash: item.sourceHash, packetHash: item.packetHash, queueInputHash: item.queueInputHash}})
	validateDecisionStageAlignment(item.state, decision.decision, item.stageEvidence, item.agentWorkOutput)
	const transition = transitionFor(item.state, decision.decision, state.deliveryRevision)
	return {folder, statePath, state, decision, transition}
}

function materializeAgentWorkArtifact({repoRoot, folder, item, contextRevision, deliveryRevision, directory}) {
	assert(item.agentWorkOutput?.path && item.artifactHash, "agent work is missing its reviewed artifact provenance")
	const source = readJson(resolveRepoPath(repoRoot, item.agentWorkOutput.path))
	assert(sha256(minifiedJson(source)) === item.artifactHash, "agent work changed before materialization")
	const recordRoot = relative(repoRoot, folder)
	const targetRelative = `${recordRoot}/deliverables/${directory}/${contextRevision}-${deliveryRevision}-${item.artifactHash}.json`
	const target = resolveRepoPath(repoRoot, targetRelative)
	ensureDir(dirname(target))
	if (existsSync(target)) {
		assert(sha256(minifiedJson(readJson(target))) === item.artifactHash, `${directory} delivery materialization conflicts with an existing artifact`)
	} else {
		atomicWriteJson(target, source)
	}
	assert(sha256(minifiedJson(readJson(target))) === item.artifactHash, `${directory} delivery materialization hash mismatch`)
	return targetRelative
}

export function applyQueue({repoRoot = process.cwd(), scope = "all", asOfDate = localIsoDate(), trustedDate = localIsoDate(), applicationId = "", dryRun = false} = {}) {
	const paths = queuePaths(repoRoot)
	const initialQueue = buildQueue({repoRoot, scope, asOfDate, trustedDate})
	const candidates = initialQueue.items.filter(item => item.decisionHash && (!applicationId || item.applicationId === applicationId))
	if (applicationId && candidates.length === 0) throw new Error(`no decision is ready for application: ${applicationId}`)
	if (!applicationId && candidates.length > 1) throw new Error("multiple decisions are pending; apply one with --application APPLICATION_ID")
	if (dryRun) {
		if (candidates.length === 1) validatedApplyCandidate(repoRoot, candidates[0])
		return initialQueue
	}
	const release = acquireLock(paths.lockDir)
	try {
		const queue = buildQueue({repoRoot, scope, asOfDate, trustedDate})
		const currentCandidates = queue.items.filter(item => item.decisionHash && (!applicationId || item.applicationId === applicationId))
		if (applicationId && currentCandidates.length === 0) throw new Error(`no decision is ready for application: ${applicationId}`)
		if (!applicationId && currentCandidates.length > 1) throw new Error("multiple decisions are pending; apply one with --application APPLICATION_ID")
		if (!applicationId && candidates.length && !currentCandidates.length) throw new Error("decision changed before apply; nothing was applied")
		if (currentCandidates.length === 1) {
			const item = currentCandidates[0]
			const {folder, statePath, state, decision, transition} = validatedApplyCandidate(repoRoot, item)
			const nextStateValue = transition.state
			const nextContextRevision = state.contextRevision + (transition.revise ? 1 : 0)
			const nextDeliveryRevision = state.deliveryRevision + (transition.deliveryRevise ? 1 : 0)
			const contextEntry = transition.state === "needs-info" ? serviceContextEntry("request", decision.note, decision.decidedAt, nextContextRevision) : null
			const nextContextHistory = contextEntry ? [...(state.contextHistory || []), contextEntry] : state.contextHistory || []
			const agentWorkArtifactPath = AGENT_WORK_STATES.has(item.state) && item.agentWorkOutput ? materializeAgentWorkArtifact({repoRoot, folder, item, contextRevision: nextContextRevision, deliveryRevision: nextDeliveryRevision, directory: decision.decision === "approve" ? "approved" : decision.decision}) : ""
			atomicWriteJson(
				statePath,
				appendStateTransition(
					{
						...state,
						contextHistory: nextContextHistory,
						state: transition.state,
						resumeState: transition.resumeState || "",
						contextRevision: nextContextRevision,
						deliveryRevision: nextDeliveryRevision,
						usedDecisionHashes: [...state.usedDecisionHashes, decision.decisionHash],
						updatedAt: decision.decidedAt,
						lastDecisionHash: decision.decisionHash,
						lastDecisionState: item.state,
						...(transition.state === "needs-info" ? {needsInfoNote: decision.note, requestedInformation: decision.note} : {}),
						...(item.state === "implementation" && decision.decision === "approve" ? {implementationAcceptedAt: item.stageEvidence?.recordedAt || ""} : {}),
						...(item.artifactHash && decision.decision === "approve" ? {approvedArtifactHash: item.artifactHash} : {})
					},
					{
						from: item.state,
						to: nextStateValue,
						kind: "decision",
						at: decision.decidedAt,
						contextRevision: nextContextRevision,
						deliveryRevision: nextDeliveryRevision,
						queueInputHash: item.queueInputHash,
						decisionHash: decision.decisionHash,
						day0Hash: item.day0Hash,
						evidenceHash: REVIEW_STATES.has(item.state) ? item.evidenceHash : "",
						artifactPath: agentWorkArtifactPath,
						artifactHash: AGENT_WORK_STATES.has(item.state) ? item.artifactHash : "",
						evidencePath: REVIEW_STATES.has(item.state) ? item.stageEvidence?.path || "" : "",
						implementationAcceptedAt: item.state === "implementation" && decision.decision === "approve" ? item.stageEvidence?.recordedAt || "" : "",
						contextEntry,
						contextHash: contextHistoryHash(nextContextHistory)
					}
				)
			)
		}
		const refreshed = buildQueue({repoRoot, scope, asOfDate, trustedDate})
		ensureDir(paths.queueDir)
		atomicWriteJson(paths.queueFile, refreshed)
		return refreshed
	} finally {
		release()
	}
}

export function checkQueue({repoRoot = process.cwd(), scope = "all", asOfDate = localIsoDate(), trustedDate = localIsoDate()} = {}) {
	const expected = buildQueue({repoRoot, scope, asOfDate, trustedDate})
	const paths = queuePaths(repoRoot)
	const failures = []
	const advisories = []
	if (expected.pendingPromotions.length) failures.push(`service promotion journal requires repair before normal work: ${expected.pendingPromotions.join(", ")}`)
	if (!existsSync(paths.queueFile)) {
		advisories.push("queue not prepared - run service:queue")
	} else {
		let actual = null
		try {
			actual = readJson(paths.queueFile)
		} catch {
			failures.push("queue output is invalid JSON")
		}
		if (actual) {
			if (isIsoCalendarDate(actual.asOfDate) && actual.asOfDate < expected.asOfDate) {
				advisories.push(`queue not prepared since ${actual.asOfDate} - run service:queue`)
			} else if (sha256(minifiedJson(actual)) !== sha256(minifiedJson(expected))) {
				failures.push("queue output is stale or altered")
			}
		}
	}
	for (const item of expected.items) {
		if (item.status === "blocked") failures.push(`${item.applicationId}: ${item.blocked.join("; ")}`)
		if (item.decisionHash) {
			try {
				validateDecision(readJson(join(repoRoot, item.decisionPath)), {repoRoot, expected: {applicationId: item.applicationId, sourceHash: item.sourceHash, packetHash: item.packetHash, queueInputHash: item.queueInputHash}})
			} catch (error) {
				failures.push(`${item.applicationId}: ${error.message}`)
			}
		}
		if (item.agentWork) {
			const packetPath = resolveRepoPath(repoRoot, item.agentWork.packetPath)
			if (!existsSync(packetPath)) {
				failures.push(`${item.applicationId}: expected agent work packet is missing`)
			} else if (sha256(readFileSync(packetPath)) !== sha256(`${JSON.stringify(item.agentWork, null, 2)}\n`)) {
				failures.push(`${item.applicationId}: agent work packet is stale or altered`)
			}
		}
	}
	return {status: failures.length ? "failed" : advisories.length ? "advisory" : "passed", failures, advisories, queue: expected}
}

export const prepareReviewQueue = prepareQueue
export const applyReviewQueue = applyQueue
export const checkReviewQueue = checkQueue
