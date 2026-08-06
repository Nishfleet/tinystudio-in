#!/usr/bin/env node
import {existsSync} from "node:fs"
import {acquireLock, assertCliArguments, decisionHashFor, isRfc3339Timestamp, newNonce, schemaDigest, validateDecision} from "./lib/service-contract.mjs"
import {buildQueue, createReviewCapJournal, decisionPathFor, queuePaths, repairReviewCapJournal, validateDecisionStageAlignment} from "./lib/review-queue.mjs"
import {localIsoDate, timestampIsOnOrBeforeLocalDate, timestampIsOnOrBeforeTrustedNow, trustedNow} from "./date-utils.mjs"

const args = process.argv.slice(2)
const positional = assertCliArguments(args, {options: ["application", "decision", "reviewer", "note", "decided-at", "nonce"], positionalCount: 1})
const value = (name, fallback = "") => {
	const index = args.indexOf(`--${name}`)
	return index >= 0 ? args[index + 1] || fallback : fallback
}
const id = positional[0] || value("application", "")
const repoRoot = process.env.SERVICE_REPO_ROOT || process.cwd()
if (!id) {
	console.error("Usage: npm run service:decide -- APPLICATION_ID --decision approve|decline|needs-info --reviewer LABEL --note NOTE")
	process.exit(1)
}
try {
	const release = acquireLock(queuePaths(repoRoot).lockDir)
	try {
		const trustedInstant = trustedNow()
		const trustedDate = localIsoDate(trustedInstant)
		const decidedAt = value("decided-at", trustedInstant.toISOString())
		if (!isRfc3339Timestamp(decidedAt)) throw new Error("decided-at must be an RFC 3339 timestamp")
		const decisionDate = localIsoDate(new Date(decidedAt))
		if (decisionDate !== trustedDate) throw new Error(`decided-at must use the trusted recording date ${trustedDate}`)
		const queue = buildQueue({repoRoot, asOfDate: trustedDate, trustedDate})
		const item = queue.items.find(candidate => candidate.applicationId === id)
		if (!item || !item.sourceHash) throw new Error(`application not found: ${id}`)
		if (item.status !== "needs-review") throw new Error(`application is not awaiting a human decision: ${item.status}`)
		if (!item.withinHumanDailyReviewCap) throw new Error(`application is deferred beyond today's human review cap: slot ${item.humanReviewSlot}`)
		if (!timestampIsOnOrBeforeTrustedNow(decidedAt, trustedInstant)) throw new Error("decided-at is after the trusted current instant")
		const decision = {
			contract: "tinystudio.review-decision",
			schemaVersion: 1,
			schemaDigest: schemaDigest(repoRoot, "decision"),
			applicationId: id,
			sourceHash: item.sourceHash,
			packetHash: item.packetHash,
			queueInputHash: item.queueInputHash,
			reviewerLabel: value("reviewer"),
			decision: value("decision"),
			note: value("note"),
			decidedAt,
			decisionNonce: value("nonce", newNonce())
		}
		decision.decisionHash = decisionHashFor(decision)
		validateDecision(decision, {repoRoot, expected: {applicationId: id, sourceHash: item.sourceHash, packetHash: item.packetHash, queueInputHash: item.queueInputHash}})
		if (item.reviewNotBefore && Date.parse(decision.decidedAt) < Date.parse(item.reviewNotBefore)) throw new Error("decision predates the material reviewed")
		if (!timestampIsOnOrBeforeLocalDate(decision.decidedAt, trustedDate)) throw new Error("decision is after the trusted as-of date")
		validateDecisionStageAlignment(item.state, decision.decision, item.stageEvidence, item.agentWorkOutput)
		const output = decisionPathFor(repoRoot, id, item.state, item.queueInputHash)
		if (existsSync(output)) throw new Error(`decision already exists: ${output}`)
		createReviewCapJournal(repoRoot, decision, item.state)
		repairReviewCapJournal(repoRoot, id)
		console.log(JSON.stringify({status: "recorded", decisionPath: output, decisionHash: decision.decisionHash}, null, 2))
	} finally {
		release()
	}
} catch (error) {
	console.error(`service:decide failed: ${error.message}`)
	process.exit(1)
}
