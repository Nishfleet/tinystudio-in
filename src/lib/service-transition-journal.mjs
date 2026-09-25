import {randomUUID} from "node:crypto"
import {existsSync, linkSync, unlinkSync} from "node:fs"
import {dirname, join, relative} from "node:path"
import {atomicWriteJson, isRfc3339Timestamp, minifiedJson, readJson, resolveRepoPath, sha256} from "./service-contract.mjs"

export const TRANSITION_JOURNAL_CONTRACT = "tinystudio.service-transition-journal"
export const TRANSITION_JOURNAL_VERSION = 1

const JOURNAL_FIELDS = ["contract", "version", "applicationId", "kind", "createdAt", "beforeState", "afterState", "beforeDay0", "afterDay0", "beforeStateHash", "afterStateHash", "beforeDay0Hash", "afterDay0Hash"]

function assert(condition, message) {
	if (!condition) throw new Error(message)
}

function assertExactKeys(value, expected, name) {
	assert(value && typeof value === "object" && !Array.isArray(value), `${name} must be an object`)
	const actual = Object.keys(value).sort()
	const wanted = [...expected].sort()
	assert(actual.length === wanted.length && actual.every((key, index) => key === wanted[index]), `${name} has unexpected or missing fields`)
}

function valueHash(value) {
	return sha256(minifiedJson(value))
}

function sameValue(left, right) {
	return valueHash(left) === valueHash(right)
}

export function transitionJournalRecord({applicationId, kind, createdAt, beforeState, afterState, beforeDay0 = null, afterDay0 = null}) {
	const journal = {
		contract: TRANSITION_JOURNAL_CONTRACT,
		version: TRANSITION_JOURNAL_VERSION,
		applicationId,
		kind,
		createdAt,
		beforeState,
		afterState,
		beforeDay0,
		afterDay0,
		beforeStateHash: valueHash(beforeState),
		afterStateHash: valueHash(afterState),
		beforeDay0Hash: valueHash(beforeDay0),
		afterDay0Hash: valueHash(afterDay0)
	}
	return validateTransitionJournal(journal, applicationId)
}

export function validateTransitionJournal(journal, expectedApplicationId = "") {
	assertExactKeys(journal, JOURNAL_FIELDS, "service transition journal")
	assert(journal.contract === TRANSITION_JOURNAL_CONTRACT, "invalid service transition journal contract")
	assert(journal.version === TRANSITION_JOURNAL_VERSION, "unsupported service transition journal version")
	assert(typeof journal.applicationId === "string" && journal.applicationId.length > 0, "service transition journal applicationId is invalid")
	if (expectedApplicationId) assert(journal.applicationId === expectedApplicationId, "service transition journal applicationId mismatch")
	assert(["day0", "resume", "scope-authorization"].includes(journal.kind), "service transition journal kind is invalid")
	assert(isRfc3339Timestamp(journal.createdAt), "service transition journal createdAt is invalid")
	assert(journal.beforeState && typeof journal.beforeState === "object" && !Array.isArray(journal.beforeState), "service transition journal beforeState is invalid")
	assert(journal.afterState && typeof journal.afterState === "object" && !Array.isArray(journal.afterState), "service transition journal afterState is invalid")
	assert(journal.beforeDay0 === null || (typeof journal.beforeDay0 === "object" && !Array.isArray(journal.beforeDay0)), "service transition journal beforeDay0 is invalid")
	assert(journal.afterDay0 === null || (typeof journal.afterDay0 === "object" && !Array.isArray(journal.afterDay0)), "service transition journal afterDay0 is invalid")
	if (journal.afterDay0 === null) assert(journal.beforeDay0 === null, "service transition journal cannot remove a Day 0 record")
	for (const field of ["beforeStateHash", "afterStateHash", "beforeDay0Hash", "afterDay0Hash"]) {
		assert(typeof journal[field] === "string" && /^[a-f0-9]{64}$/.test(journal[field]), `service transition journal ${field} is invalid`)
	}
	assert(journal.beforeStateHash === valueHash(journal.beforeState), "service transition journal beforeState hash mismatch")
	assert(journal.afterStateHash === valueHash(journal.afterState), "service transition journal afterState hash mismatch")
	assert(journal.beforeDay0Hash === valueHash(journal.beforeDay0), "service transition journal beforeDay0 hash mismatch")
	assert(journal.afterDay0Hash === valueHash(journal.afterDay0), "service transition journal afterDay0 hash mismatch")
	return journal
}

function transitionPaths(repoRoot, folder) {
	const safeFolder = resolveRepoPath(repoRoot, relative(repoRoot, folder))
	return {journalPath: resolveRepoPath(repoRoot, relative(repoRoot, join(safeFolder, "service-transition-journal.json"))), statePath: resolveRepoPath(repoRoot, relative(repoRoot, join(safeFolder, "service-state.json"))), day0Path: resolveRepoPath(repoRoot, relative(repoRoot, join(safeFolder, "service-day0.json")))}
}

export function commitJournaledTransition({repoRoot, folder, applicationId, kind, createdAt, beforeState, afterState, beforeDay0 = null, afterDay0 = null}) {
	const paths = transitionPaths(repoRoot, folder)
	const journal = transitionJournalRecord({applicationId, kind, createdAt, beforeState, afterState, beforeDay0, afterDay0})
	const temporaryJournalPath = join(dirname(paths.journalPath), `.service-transition-journal-${process.pid}-${randomUUID()}.json`)
	atomicWriteJson(temporaryJournalPath, journal)
	try {
		linkSync(temporaryJournalPath, paths.journalPath)
	} catch {
		if (existsSync(temporaryJournalPath)) unlinkSync(temporaryJournalPath)
		throw new Error("service transition journal requires repair or another transition is in progress")
	}
	unlinkSync(temporaryJournalPath)

	const currentState = existsSync(paths.statePath) ? readJson(paths.statePath) : null
	const currentDay0 = existsSync(paths.day0Path) ? readJson(paths.day0Path) : null
	if (!sameValue(currentState, beforeState) || !sameValue(currentDay0, beforeDay0)) {
		unlinkSync(paths.journalPath)
		throw new Error("service transition state changed before commit")
	}

	if (afterDay0 !== null) atomicWriteJson(paths.day0Path, afterDay0)
	atomicWriteJson(paths.statePath, afterState)
	unlinkSync(paths.journalPath)
	return journal
}

export function repairTransitionJournal({repoRoot, folder, applicationId}) {
	const paths = transitionPaths(repoRoot, folder)
	assert(existsSync(paths.journalPath), "service transition journal is missing")
	const journal = validateTransitionJournal(readJson(paths.journalPath), applicationId)
	const currentState = existsSync(paths.statePath) ? readJson(paths.statePath) : null
	const currentDay0 = existsSync(paths.day0Path) ? readJson(paths.day0Path) : null
	assert(currentState !== null, "service transition repair requires a current state record")
	assert(sameValue(currentState, journal.beforeState) || sameValue(currentState, journal.afterState), "service transition state no longer matches the journal")
	assert(sameValue(currentDay0, journal.beforeDay0) || sameValue(currentDay0, journal.afterDay0), "service transition Day 0 record no longer matches the journal")

	if (journal.afterDay0 !== null) atomicWriteJson(paths.day0Path, journal.afterDay0)
	atomicWriteJson(paths.statePath, journal.afterState)
	unlinkSync(paths.journalPath)
	return {status: "repaired", applicationId, kind: journal.kind, state: journal.afterState.state, repairedAt: journal.createdAt}
}
