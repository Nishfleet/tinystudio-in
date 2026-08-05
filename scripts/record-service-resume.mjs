#!/usr/bin/env node
import {existsSync} from "node:fs"
import {join} from "node:path"
import {acquireLock, assertCliArguments, isRfc3339Timestamp, minifiedJson, readJson, sha256} from "./lib/service-contract.mjs"
import {appendStateTransition, buildQueue, contextHistoryHash, queuePaths, readServiceState, serviceContextEntry, serviceDeadlineAt, validateDay0Record} from "./lib/review-queue.mjs"
import {commitJournaledTransition} from "./lib/service-transition-journal.mjs"
import {localIsoDate, serviceNowTimestamp, timestampIsOnOrBeforeLocalDate, timestampIsOnOrBeforeTrustedNow, trustedNow} from "./date-utils.mjs"

const args = process.argv.slice(2)
const [id] = assertCliArguments(args, {options: ["resumed-at", "note", "authorized-by", "scope-authorization", "fee-authorization"], positionalCount: 1})
const value = (name, fallback = "") => {
	const index = args.indexOf(`--${name}`)
	return index >= 0 ? (args[index + 1] ?? fallback) : fallback
}
const repoRoot = process.env.SERVICE_REPO_ROOT || process.cwd()

if (!id) {
	console.error("Usage: npm run service:resume -- APPLICATION_ID [--resumed-at ISO] [--note NOTE] [--authorized-by REVIEWER --scope-authorization SCOPE --fee-authorization FEE]")
	process.exit(1)
}

try {
	const release = acquireLock(queuePaths(repoRoot).lockDir)
	try {
		const trustedInstant = trustedNow()
		const trustedDate = localIsoDate(trustedInstant)
		const item = buildQueue({repoRoot, asOfDate: trustedDate, trustedDate}).items.find(candidate => candidate.applicationId === id)
		if (!item) throw new Error(`application not found: ${id}`)
		if (item.status === "blocked") throw new Error(`application is blocked: ${item.blocked.join("; ")}`)
		const folder = join(repoRoot, item.sourcePath)
		const state = readServiceState(folder)
		const resumedAt = value("resumed-at", serviceNowTimestamp(trustedInstant))
		const note = value("note", "").trim()
		const authorizationValue = name => value(name, "").trim().replace(/\s+/g, " ")
		const authorizedBy = authorizationValue("authorized-by")
		const scopeAuthorization = authorizationValue("scope-authorization")
		const feeAuthorization = authorizationValue("fee-authorization")
		if (!isRfc3339Timestamp(resumedAt)) throw new Error("resumed-at must be an RFC 3339 timestamp")
		if (!timestampIsOnOrBeforeLocalDate(resumedAt, trustedDate)) throw new Error("resumed-at is after the trusted as-of date")
		if (!timestampIsOnOrBeforeTrustedNow(resumedAt, trustedInstant)) throw new Error("resumed-at is after the trusted current instant")
		if (state.updatedAt && Date.parse(resumedAt) < Date.parse(state.updatedAt)) throw new Error("resumed-at predates the current service state")
		if (state.state !== "scope-review" && (authorizedBy || scopeAuthorization || feeAuthorization)) throw new Error("scope authorization options require the scope-review state")
		if (state.state === "scope-review" && note) throw new Error("scope-review requires the explicit authorization options instead of --note")

		if (state.state === "paused-with-reason") {
			if (note.length < 3 || note.length > 1200) throw new Error("--note is required and must be 3-1200 characters")
			const day0Path = join(folder, "service-day0.json")
			if (!existsSync(day0Path)) throw new Error("Day 0 record is missing")
			const day0 = readJson(day0Path)
			validateDay0Record(day0, id)
			if (!day0.paused || !day0.activePause) throw new Error("paused state has no active pause")
			const durationMs = Date.parse(resumedAt) - Date.parse(day0.activePause.startedAt)
			if (durationMs < 0) throw new Error("resumed-at must be after pause-started-at")
			const restored = day0.resumeState || state.resumeState
			if (!restored) throw new Error("paused state has no resumeState")
			const pauseHistory = [...day0.pauseHistory, {reason: day0.activePause.reason, startedAt: day0.activePause.startedAt, endedAt: resumedAt, durationMs}]
			const updatedDay0 = {...day0, updatedAt: resumedAt, paused: false, activePause: null, pauseHistory, totalPausedMs: day0.totalPausedMs + durationMs, deadlineAt: serviceDeadlineAt(day0.day0StartedAt, pauseHistory), resumeState: ""}
			validateDay0Record(updatedDay0, id)
			const nextState = restored === "approved-awaiting-day0" ? "day0-ready" : restored
			const nextRevision = state.contextRevision + 1
			const contextEntry = serviceContextEntry("pause-resolution", note, resumedAt, nextRevision)
			const nextContextHistory = [...(state.contextHistory || []), contextEntry]
			const afterState = appendStateTransition(
				{...state, contextHistory: nextContextHistory, state: nextState, resumeState: "", updatedAt: resumedAt, day0ReadyAt: state.day0ReadyAt || (restored === "approved-awaiting-day0" ? resumedAt : ""), contextRevision: nextRevision, resumedFrom: "paused-with-reason", resumeRecordedAt: resumedAt},
				{from: "paused-with-reason", to: nextState, kind: "resume", at: resumedAt, contextRevision: nextRevision, queueInputHash: "", day0Hash: sha256(minifiedJson(updatedDay0)), contextEntry, contextHash: contextHistoryHash(nextContextHistory)}
			)
			commitJournaledTransition({repoRoot, folder, applicationId: id, kind: "resume", createdAt: resumedAt, beforeState: state, afterState, beforeDay0: day0, afterDay0: updatedDay0})
			console.log(JSON.stringify({status: nextState, applicationId: id, resumedAt, pauseDurationMs: durationMs, deadlineAt: updatedDay0.deadlineAt}, null, 2))
		} else if (state.state === "needs-info") {
			if (note.length < 3 || note.length > 1200) throw new Error("--note is required and must be 3-1200 characters")
			if (!state.resumeState) throw new Error("needs-info state has no resumeState")
			const nextState = state.resumeState
			const nextRevision = state.contextRevision + 1
			const contextEntry = serviceContextEntry("response", note, resumedAt, nextRevision)
			const nextContextHistory = [...(state.contextHistory || []), contextEntry]
			const day0Path = join(folder, "service-day0.json")
			const day0 = existsSync(day0Path) ? readJson(day0Path) : null
			const afterState = appendStateTransition(
				{...state, contextHistory: nextContextHistory, state: nextState, resumeState: "", updatedAt: resumedAt, contextRevision: nextRevision, resumedFrom: "needs-info", resumeRecordedAt: resumedAt, requestedInformation: ""},
				{from: "needs-info", to: nextState, kind: "resume", at: resumedAt, contextRevision: nextRevision, queueInputHash: "", day0Hash: item.day0Hash || "", contextEntry, contextHash: contextHistoryHash(nextContextHistory)}
			)
			commitJournaledTransition({repoRoot, folder, applicationId: id, kind: "resume", createdAt: resumedAt, beforeState: state, afterState, beforeDay0: day0, afterDay0: day0})
			console.log(JSON.stringify({status: nextState, applicationId: id, resumedAt}, null, 2))
		} else if (state.state === "scope-review") {
			if (authorizedBy.length < 2 || authorizedBy.length > 120) throw new Error("--authorized-by is required and must be 2-120 characters")
			if (scopeAuthorization.length < 3 || scopeAuthorization.length > 400) throw new Error("--scope-authorization is required and must be 3-400 characters")
			if (feeAuthorization.length < 3 || feeAuthorization.length > 400) throw new Error("--fee-authorization is required and must be 3-400 characters")
			const day0Path = join(folder, "service-day0.json")
			if (!existsSync(day0Path)) throw new Error("paid scope review requires a Day 0 record")
			const day0 = readJson(day0Path)
			validateDay0Record(day0, id)
			const nextRevision = state.contextRevision + 1
			const nextDeliveryRevision = state.deliveryRevision + 1
			const authorizationNote = `Authorized by: ${authorizedBy}\nScope authorization: ${scopeAuthorization}\nFee authorization: ${feeAuthorization}`
			const contextEntry = serviceContextEntry("scope-authorization", authorizationNote, resumedAt, nextRevision)
			const nextContextHistory = [...(state.contextHistory || []), contextEntry]
			const afterState = appendStateTransition(
				{...state, contextHistory: nextContextHistory, state: "delivery-draft", resumeState: "", updatedAt: resumedAt, contextRevision: nextRevision, deliveryRevision: nextDeliveryRevision, resumedFrom: "scope-review", resumeRecordedAt: resumedAt},
				{from: "scope-review", to: "delivery-draft", kind: "scope-authorization", at: resumedAt, contextRevision: nextRevision, deliveryRevision: nextDeliveryRevision, queueInputHash: "", day0Hash: item.day0Hash || "", contextEntry, contextHash: contextHistoryHash(nextContextHistory)}
			)
			commitJournaledTransition({repoRoot, folder, applicationId: id, kind: "scope-authorization", createdAt: resumedAt, beforeState: state, afterState, beforeDay0: day0, afterDay0: day0})
			console.log(JSON.stringify({status: "delivery-draft", applicationId: id, resumedAt, authorizedBy, deliveryRevision: nextDeliveryRevision}, null, 2))
		} else {
			throw new Error(`application is not paused, awaiting information, or in scope review: ${state.state}`)
		}
	} finally {
		release()
	}
} catch (error) {
	console.error(`service:resume failed: ${error.message}`)
	process.exit(1)
}
