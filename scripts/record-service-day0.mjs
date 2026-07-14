#!/usr/bin/env node
import {existsSync} from "node:fs"
import {join} from "node:path"
import {acquireLock, assertCliArguments, isRfc3339Timestamp, minifiedJson, readJson, resolveRepoPath, sha256} from "./lib/service-contract.mjs"
import {appendStateTransition, buildQueue, contextHistoryHash, queuePaths, readServiceState, serviceDeadlineAt, serviceRecordPaths, validateDay0Record} from "./lib/review-queue.mjs"
import {commitJournaledTransition} from "./lib/service-transition-journal.mjs"
import {createPromotionJournal, promotionMarkerPath, repairPromotionJournal} from "./lib/service-promotion-journal.mjs"
import {agencyConfig} from "./lib/agency-config.mjs"
import {assertFounderPilotRecord, FOUNDER_PILOT} from "./lib/client-scaffold.mjs"
import {PAUSABLE_STATES} from "./lib/service-artifacts.mjs"
import {localIsoDate, serviceNowTimestamp, timestampIsOnOrBeforeLocalDate} from "./date-utils.mjs"

const args = process.argv.slice(2)
const [id] = assertCliArguments(args, {options: ["payment-evidence", "required-context", "approval-owner", "implementation-owner", "recorded-at", "pause-reason", "pause-started-at", "pause-ended-at"], positionalCount: 1})
const value = (name, fallback = "") => {
	const index = args.indexOf(`--${name}`)
	return index >= 0 ? (args[index + 1] ?? fallback) : fallback
}
const repoRoot = process.env.SERVICE_REPO_ROOT || process.cwd()

if (!id) {
	console.error("Usage: npm run service:day0 -- APPLICATION_ID --payment-evidence 'paid: INVOICE_OR_RECEIPT_REFERENCE' --required-context ... --approval-owner ... --implementation-owner ...")
	process.exit(1)
}

function iso(value, name) {
	if (!isRfc3339Timestamp(value)) throw new Error(`${name} must be an RFC 3339 timestamp`)
	return value
}

try {
	const release = acquireLock(queuePaths(repoRoot).lockDir)
	try {
		day0Operation: {
			if (existsSync(promotionMarkerPath(repoRoot, id))) {
				if (args.some(argument => argument.startsWith("--"))) {
					throw new Error(`pending promotion journal for ${id}; run service:repair, then re-run service:day0 because options were not applied`)
				}
				console.log(JSON.stringify(repairPromotionJournal({repoRoot, applicationId: id}), null, 2))
				break day0Operation
			}
			const item = buildQueue({repoRoot}).items.find(candidate => candidate.applicationId === id)
			if (!item) throw new Error(`application not found: ${id}`)
			if (item.status === "blocked") throw new Error(`application is blocked: ${item.blocked.join("; ")}`)
			if (item.decisionHash) throw new Error("cannot pause while a human decision is pending; apply the decision first")
			const folder = join(repoRoot, item.sourcePath)
			const promoteAtDay0 = item.sourcePath.startsWith("prospects/")
			const promotedFolder = resolveRepoPath(repoRoot, `clients/${id}`)
			if (promoteAtDay0) {
				if (existsSync(promotedFolder)) throw new Error(`paid client target already exists: clients/${id}`)
			}
			const state = readServiceState(folder)
			const day0Path = join(folder, "service-day0.json")
			const prior = existsSync(day0Path) ? readJson(day0Path) : null
			const config = agencyConfig(repoRoot)
			if (config.offerName !== FOUNDER_PILOT.offerName || config.founderSprintPrice !== "$1,000 founder pilot") {
				throw new Error("active founder-pilot offer must remain the canonical 7-Day sprint at $1,000")
			}
			let pilotSequence = prior?.pilotSequence || 0
			if (promoteAtDay0 && !prior) {
				const paidClientCount = serviceRecordPaths(repoRoot, "clients").length
				if (paidClientCount >= FOUNDER_PILOT.capacity) throw new Error(`founder pilot capacity is complete after ${FOUNDER_PILOT.capacity} paid clients; a human-reviewed post-pilot offer is required before another Day 0`)
				pilotSequence = paidClientCount + 1
			}
			const recordedAt = iso(value("recorded-at", serviceNowTimestamp()), "recorded-at")
			if (!timestampIsOnOrBeforeLocalDate(recordedAt, localIsoDate())) throw new Error("recorded-at is after the trusted as-of date")
			if (state.updatedAt && Date.parse(recordedAt) < Date.parse(state.updatedAt)) throw new Error("recorded-at predates the current service state")
			const currentState = state.state
			if (currentState === "paused-with-reason") throw new Error("application is already paused; use service:resume")
			if (!PAUSABLE_STATES.has(currentState)) throw new Error(`Day 0/pause requires an active sprint state, got ${currentState}`)

			const paymentEvidence = value("payment-evidence", prior?.paymentEvidence || "")
			const requiredContext = value("required-context", prior?.requiredContext || "")
			const approvalOwner = value("approval-owner", prior?.approvalOwner || "")
			const implementationOwner = value("implementation-owner", prior?.implementationOwner || "")
			if (prior) assertFounderPilotRecord(prior, pilotSequence)
			const day0StartedAt = iso(prior?.day0StartedAt || recordedAt, "day0-started-at")
			const pauseHistory = Array.isArray(prior?.pauseHistory) ? [...prior.pauseHistory] : []
			let paused = Boolean(prior?.paused)
			let activePause = prior?.activePause || null
			let resumeState = prior?.resumeState || ""

			const pauseReason = value("pause-reason", "")
			const pauseStartedAt = value("pause-started-at", recordedAt)
			const pauseEndedAt = value("pause-ended-at", "")
			if (pauseEndedAt) throw new Error("pause-ended-at is handled by service:resume; provide --note there")
			if (prior) {
				for (const [field, nextValue] of [
					["paymentEvidence", paymentEvidence],
					["requiredContext", requiredContext],
					["approvalOwner", approvalOwner],
					["implementationOwner", implementationOwner],
					["offerName", FOUNDER_PILOT.offerName],
					["offerPriceUsd", FOUNDER_PILOT.offerPriceUsd],
					["pricingCohort", FOUNDER_PILOT.pricingCohort],
					["pilotSequence", pilotSequence]
				]) {
					if (nextValue !== prior[field]) throw new Error(`Day 0 ${field} is immutable after the sprint clock starts`)
				}
				if (!pauseReason) throw new Error("Day 0 already exists; use --pause-reason for a client delay or service:resume for an active pause")
			}
			if (pauseReason) {
				if (paused || activePause) throw new Error("an active pause already exists; use service:resume")
				if (currentState === "paused-with-reason") throw new Error("application is already paused")
				activePause = {reason: pauseReason, startedAt: iso(pauseStartedAt, "pause-started-at")}
				if (activePause.startedAt !== recordedAt) throw new Error("pause-started-at must equal recorded-at so paused time cannot be backdated")
				resumeState = currentState
				paused = true
			}

			if (!paymentEvidence || !requiredContext || !approvalOwner || !implementationOwner) {
				throw new Error("Day 0 missing: paymentEvidence, requiredContext, approvalOwner, implementationOwner")
			}
			const totalPausedMs = pauseHistory.reduce((sum, entry) => sum + entry.durationMs, 0)
			const record = {
				applicationId: id,
				paymentEvidence,
				requiredContext,
				approvalOwner,
				implementationOwner,
				offerName: FOUNDER_PILOT.offerName,
				offerPriceUsd: FOUNDER_PILOT.offerPriceUsd,
				pricingCohort: FOUNDER_PILOT.pricingCohort,
				pilotSequence,
				ready: true,
				day0StartedAt,
				updatedAt: recordedAt,
				paused,
				activePause,
				pauseHistory,
				totalPausedMs,
				deadlineAt: serviceDeadlineAt(day0StartedAt, pauseHistory),
				resumeState
			}
			assertFounderPilotRecord(record, pilotSequence)
			validateDay0Record(record, id)
			let nextState = currentState
			if (paused) nextState = "paused-with-reason"
			else if (currentState === "approved-awaiting-day0" || currentState === "paused-with-reason") nextState = "day0-ready"
			const day0Hash = sha256(minifiedJson(record))
			const afterState = appendStateTransition(
				{...state, state: nextState, resumeState: paused ? resumeState : "", updatedAt: recordedAt, day0ReadyAt: state.day0ReadyAt || (!paused ? recordedAt : ""), sourceHash: item.sourceHash, packetHash: item.packetHash},
				{from: currentState, to: nextState, kind: "day0", at: recordedAt, contextRevision: state.contextRevision, queueInputHash: "", day0Hash, contextHash: contextHistoryHash(state.contextHistory || [])}
			)
			const transition = {repoRoot, folder, applicationId: id, kind: "day0", createdAt: recordedAt, beforeState: state, afterState, beforeDay0: prior, afterDay0: record}
			if (promoteAtDay0) {
				createPromotionJournal({...transition, sourcePath: item.sourcePath, targetPath: `clients/${id}`})
				commitJournaledTransition(transition)
				repairPromotionJournal({repoRoot, applicationId: id})
			} else {
				commitJournaledTransition(transition)
			}
			console.log(JSON.stringify({status: nextState, applicationId: id, recordedAt, paused, deadlineAt: record.deadlineAt, target: promoteAtDay0 ? `clients/${id}` : item.sourcePath}, null, 2))
		}
	} finally {
		release()
	}
} catch (error) {
	console.error(`service:day0 failed: ${error.message}`)
	process.exit(1)
}
