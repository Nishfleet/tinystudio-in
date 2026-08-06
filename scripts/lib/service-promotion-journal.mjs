import {randomUUID} from "node:crypto"
import {existsSync, linkSync, lstatSync, readdirSync, renameSync, unlinkSync} from "node:fs"
import {dirname, join, relative} from "node:path"
import {atomicWriteJson, ensureDir, isRfc3339Timestamp, minifiedJson, readJson, resolveRepoPath, sha256, validateAffirmativePaymentEvidence, validateApplication} from "./service-contract.mjs"
import {assertClientScaffold, assertFounderPilotRecord, createClientScaffold, FOUNDER_PILOT} from "./client-scaffold.mjs"
import {serviceRecordPaths} from "./service-artifacts.mjs"
import {commitJournaledTransition, repairTransitionJournal, transitionJournalRecord, validateTransitionJournal} from "./service-transition-journal.mjs"

export const PROMOTION_JOURNAL_CONTRACT = "tinystudio.service-promotion-journal"
export const PROMOTION_JOURNAL_VERSION = 1

const PROMOTION_FIELDS = ["contract", "version", "applicationId", "createdAt", "sourcePath", "targetPath", "transition"]

function assert(condition, message) {
	if (!condition) throw new Error(message)
}

function assertExactKeys(value, expected, name) {
	assert(value && typeof value === "object" && !Array.isArray(value), `${name} must be an object`)
	const actual = Object.keys(value).sort()
	const wanted = [...expected].sort()
	assert(actual.length === wanted.length && actual.every((key, index) => key === wanted[index]), `${name} has unexpected or missing fields`)
}

function sameValue(left, right) {
	return sha256(minifiedJson(left)) === sha256(minifiedJson(right))
}

function safeApplicationId(applicationId) {
	assert(typeof applicationId === "string" && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(applicationId), "service promotion applicationId is invalid")
	return applicationId
}

export function promotionMarkerPath(repoRoot, applicationId) {
	safeApplicationId(applicationId)
	return resolveRepoPath(repoRoot, `runs/service-engine/promotions/${applicationId}.json`)
}

export function pendingPromotionApplicationIds(repoRoot) {
	const directory = resolveRepoPath(repoRoot, "runs/service-engine/promotions")
	let directoryStat
	try {
		directoryStat = lstatSync(directory)
	} catch (error) {
		if (error?.code === "ENOENT") return []
		throw error
	}
	assert(directoryStat.isDirectory() && !directoryStat.isSymbolicLink(), "service promotion journal directory must be a real directory")
	const ids = []
	for (const entry of readdirSync(directory, {withFileTypes: true})) {
		if (entry.name.startsWith(".service-promotion-")) continue
		assert(entry.isFile() && entry.name.endsWith(".json"), `unexpected service promotion journal entry: ${entry.name}`)
		const applicationId = entry.name.slice(0, -".json".length)
		safeApplicationId(applicationId)
		ids.push(applicationId)
	}
	return ids.sort()
}

export function promotionJournalRecord({applicationId, createdAt, sourcePath, targetPath, transition, repoRoot = process.cwd()}) {
	return validatePromotionJournal({contract: PROMOTION_JOURNAL_CONTRACT, version: PROMOTION_JOURNAL_VERSION, applicationId, createdAt, sourcePath, targetPath, transition}, applicationId, repoRoot)
}

export function validatePromotionJournal(journal, expectedApplicationId = "", repoRoot = process.cwd()) {
	assertExactKeys(journal, PROMOTION_FIELDS, "service promotion journal")
	assert(journal.contract === PROMOTION_JOURNAL_CONTRACT, "invalid service promotion journal contract")
	assert(journal.version === PROMOTION_JOURNAL_VERSION, "unsupported service promotion journal version")
	safeApplicationId(journal.applicationId)
	if (expectedApplicationId) assert(journal.applicationId === expectedApplicationId, "service promotion journal applicationId mismatch")
	assert(isRfc3339Timestamp(journal.createdAt), "service promotion journal createdAt is invalid")
	assert(journal.sourcePath === `prospects/${journal.applicationId}`, "service promotion journal sourcePath is invalid")
	assert(journal.targetPath === `clients/${journal.applicationId}`, "service promotion journal targetPath is invalid")
	resolveRepoPath(repoRoot, journal.sourcePath)
	resolveRepoPath(repoRoot, journal.targetPath)
	validateTransitionJournal(journal.transition, journal.applicationId)
	assert(journal.transition.kind === "day0", "service promotion journal transition must be Day 0")
	assert(journal.transition.createdAt === journal.createdAt, "service promotion journal timestamp mismatch")
	assert(journal.transition.beforeDay0 === null, "service promotion journal must start before Day 0")
	assert(journal.transition.afterDay0 && journal.transition.afterDay0.applicationId === journal.applicationId, "service promotion journal requires a bound Day 0 record")
	assertFounderPilotRecord(journal.transition.afterDay0)
	validateAffirmativePaymentEvidence(journal.transition.afterDay0.paymentEvidence)
	return journal
}

export function createPromotionJournal({repoRoot, applicationId, createdAt, sourcePath, targetPath, beforeState, afterState, beforeDay0 = null, afterDay0}) {
	const markerPath = promotionMarkerPath(repoRoot, applicationId)
	ensureDir(dirname(markerPath))
	const journal = promotionJournalRecord({repoRoot, applicationId, createdAt, sourcePath, targetPath, transition: transitionJournalRecord({applicationId, kind: "day0", createdAt, beforeState, afterState, beforeDay0, afterDay0})})
	const temporaryPath = join(dirname(markerPath), `.service-promotion-${process.pid}-${randomUUID()}.json`)
	atomicWriteJson(temporaryPath, journal)
	try {
		linkSync(temporaryPath, markerPath)
	} catch {
		if (existsSync(temporaryPath)) unlinkSync(temporaryPath)
		throw new Error("service promotion journal requires repair or another promotion is in progress")
	}
	unlinkSync(temporaryPath)
	return journal
}

function transitionPair(folder) {
	const statePath = join(folder, "service-state.json")
	const day0Path = join(folder, "service-day0.json")
	return {state: existsSync(statePath) ? readJson(statePath) : null, day0: existsSync(day0Path) ? readJson(day0Path) : null}
}

function paidServiceApplicationIds(repoRoot) {
	const ids = new Set()
	for (const applicationPath of serviceRecordPaths(repoRoot, "clients")) {
		const folder = dirname(applicationPath)
		const application = validateApplication(readJson(applicationPath), {repoRoot})
		const day0Path = join(folder, "service-day0.json")
		if (existsSync(day0Path)) {
			const day0 = readJson(day0Path)
			assert(day0.applicationId === application.applicationId, `paid service application mismatch: ${relative(repoRoot, folder)}`)
			validateAffirmativePaymentEvidence(day0.paymentEvidence)
		}
		assert(!ids.has(application.applicationId), `duplicate paid service applicationId: ${application.applicationId}`)
		ids.add(application.applicationId)
	}
	return ids
}

function assertFounderPilotCapacity(repoRoot, applicationId, day0) {
	const paidIds = paidServiceApplicationIds(repoRoot)
	const limit = FOUNDER_PILOT.capacity
	assert(paidIds.size <= limit, `founder pilot capacity is already exceeded: ${paidIds.size}/${limit} paid clients require human repair`)
	if (!paidIds.has(applicationId)) {
		assert(paidIds.size < limit, `founder pilot capacity is complete after ${limit} paid clients; this unresolved promotion requires human repair`)
		assert(day0.pilotSequence === paidIds.size + 1, "service promotion pilotSequence does not match the paid founder-pilot sequence")
	}
}

function finishTransition(repoRoot, folder, journal) {
	const transitionJournalPath = join(folder, "service-transition-journal.json")
	if (existsSync(transitionJournalPath)) {
		repairTransitionJournal({repoRoot, folder, applicationId: journal.applicationId})
		return
	}
	const current = transitionPair(folder)
	if (sameValue(current.state, journal.transition.afterState) && sameValue(current.day0, journal.transition.afterDay0)) return
	assert(sameValue(current.state, journal.transition.beforeState) && sameValue(current.day0, journal.transition.beforeDay0), "service promotion state no longer matches the journal")
	commitJournaledTransition({repoRoot, folder, applicationId: journal.applicationId, kind: "day0", createdAt: journal.createdAt, beforeState: journal.transition.beforeState, afterState: journal.transition.afterState, beforeDay0: journal.transition.beforeDay0, afterDay0: journal.transition.afterDay0})
}

export function repairPromotionJournal({repoRoot, applicationId}) {
	const markerPath = promotionMarkerPath(repoRoot, applicationId)
	assert(existsSync(markerPath), "service promotion journal is missing")
	const journal = validatePromotionJournal(readJson(markerPath), applicationId, repoRoot)
	const sourceFolder = resolveRepoPath(repoRoot, journal.sourcePath)
	const targetFolder = resolveRepoPath(repoRoot, journal.targetPath)
	const sourceExists = existsSync(sourceFolder)
	const targetExists = existsSync(targetFolder)
	assert(sourceExists || targetExists, "service promotion source and target are both missing")
	assert(!(sourceExists && targetExists), "service promotion source and target both exist")
	assertFounderPilotCapacity(repoRoot, applicationId, journal.transition.afterDay0)

	let clientFolder = targetFolder
	if (sourceExists) {
		finishTransition(repoRoot, sourceFolder, journal)
		ensureDir(dirname(targetFolder))
		renameSync(sourceFolder, targetFolder)
	} else {
		finishTransition(repoRoot, targetFolder, journal)
	}

	const scaffold = createClientScaffold({repoRoot, clientFolder})
	assertClientScaffold(repoRoot, clientFolder)
	unlinkSync(markerPath)
	return {status: "repaired-promotion", recoveredPromotion: true, applicationId, target: journal.targetPath, state: journal.transition.afterState.state, scaffold}
}
