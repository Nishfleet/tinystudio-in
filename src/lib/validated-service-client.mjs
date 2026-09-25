import {existsSync} from "node:fs"
import {join, relative} from "node:path"
import {buildQueue, decisionPathFor, readServiceState, validateDay0Record} from "./review-queue.mjs"
import {readJson, resolveRepoPath, sha256, minifiedJson, validateDecision} from "./service-contract.mjs"

function blockedRecord({sourcePath = "", clientPath = sourcePath, applicationId = "", blocked = []} = {}) {
	const reasons = [...new Set(blocked.filter(Boolean))]
	return {ok: false, status: "blocked", sourcePath, clientPath, applicationId, blocked: reasons, trackingEvidence: [], day0: null, approvedArtifact: null, approvedArtifactProvenance: null, approvedDelivery: null, implementationAcceptance: null, readyForHandoff: false, readinessBlocked: reasons}
}

function latestTransition(state, predicate) {
	return [...(state.transitionHistory || [])].reverse().find(predicate) || null
}

export function loadApprovedArtifactProvenance(repoRoot, state) {
	const entry = latestTransition(state, candidate => candidate.kind === "decision" && candidate.to === "client-approved" && candidate.artifactPath && candidate.artifactHash)
	if (!entry) return null
	const path = resolveRepoPath(repoRoot, entry.artifactPath)
	if (!existsSync(path)) throw new Error(`approved agent-work artifact is missing: ${entry.artifactPath}`)
	const value = readJson(path)
	if (sha256(minifiedJson(value)) !== entry.artifactHash) {
		throw new Error(`approved agent-work artifact hash mismatch: ${entry.artifactPath}`)
	}
	if (value?.status !== "ready-for-review" || !value.deliverables || typeof value.deliverables !== "object" || Array.isArray(value.deliverables)) {
		throw new Error(`approved agent-work artifact is invalid: ${entry.artifactPath}`)
	}
	return {path: relative(repoRoot, path), hash: entry.artifactHash, approvedAt: entry.at, value}
}

export function loadImplementationAcceptanceProvenance(repoRoot, state) {
	const entry = latestTransition(state, candidate => candidate.kind === "decision" && candidate.from === "implementation" && candidate.to === "tracking-14-day" && candidate.evidencePath && candidate.evidenceHash && candidate.implementationAcceptedAt)
	if (!entry) return null
	const path = resolveRepoPath(repoRoot, entry.evidencePath)
	if (!existsSync(path)) throw new Error(`implementation acceptance evidence is missing: ${entry.evidencePath}`)
	const value = readJson(path)
	if (sha256(minifiedJson(value)) !== entry.evidenceHash) {
		throw new Error(`implementation acceptance evidence hash mismatch: ${entry.evidencePath}`)
	}
	if (value?.stage !== "implementation" || value.recordedAt !== entry.implementationAcceptedAt || value.signals?.acceptanceStatus !== "accepted") {
		throw new Error(`implementation acceptance evidence is invalid: ${entry.evidencePath}`)
	}
	return {path: relative(repoRoot, path), hash: entry.evidenceHash, acceptedAt: entry.implementationAcceptedAt, value}
}

export function serviceClientHandoffReadiness({state = "", status = "", paused = false, approvedArtifact = null, implementationAcceptance = null} = {}) {
	const blocked = []
	if (paused || state === "paused-with-reason") {
		blocked.push("Client is not handoff-ready while the service is paused")
	} else if (state === "tracking-14-day") {
		if (status !== "needs-input") blocked.push(`Client is not handoff-ready while tracking status is ${status || "unknown"}`)
	} else if (state === "complete") {
		if (status !== "done") blocked.push(`Client is not handoff-ready while completion status is ${status || "unknown"}`)
	} else {
		blocked.push(`Client is not handoff-ready in service state ${state || "unknown"} with queue status ${status || "unknown"}`)
	}

	if (blocked.length === 0 && !approvedArtifact) blocked.push("Client handoff has no hash-bound human-approved agent-work artifact")
	if (blocked.length === 0 && !implementationAcceptance) blocked.push("Client handoff has no provenance-backed implementation acceptance")
	return {ready: blocked.length === 0, blocked}
}

export function sortTrackingEvidence(entries = []) {
	return [...entries].sort((left, right) => Number(right.revision) - Number(left.revision) || String(right.recordedAt).localeCompare(String(left.recordedAt)))
}

function trackingEvidenceFor({repoRoot, item, state}) {
	const entries = []
	const seen = new Set()
	const candidates = []

	for (const transition of state.transitionHistory || []) {
		if (transition.from !== "tracking-14-day" || transition.to !== "complete" || transition.kind !== "decision" || !transition.evidencePath) continue
		if (!transition.decisionHash || !transition.queueInputHash) {
			throw new Error("canonical tracking approval history is missing")
		}
		const decisionPath = decisionPathFor(repoRoot, item.applicationId, transition.from, transition.queueInputHash)
		if (!existsSync(decisionPath)) throw new Error("canonical tracking approval history is missing")
		const decision = validateDecision(readJson(decisionPath), {repoRoot, expected: {applicationId: item.applicationId, sourceHash: item.sourceHash, packetHash: item.packetHash, queueInputHash: transition.queueInputHash}})
		if (decision.decision !== "approve" || decision.decisionHash !== transition.decisionHash) {
			throw new Error("canonical tracking approval history is mismatched")
		}
		candidates.push({path: transition.evidencePath, hash: transition.evidenceHash, revision: transition.contextRevision})
	}

	for (const candidate of candidates) {
		if (seen.has(candidate.path)) continue
		seen.add(candidate.path)
		const path = resolveRepoPath(repoRoot, candidate.path)
		if (!existsSync(path)) throw new Error(`canonical tracking evidence is missing: ${candidate.path}`)
		const value = readJson(path)
		const actualHash = sha256(minifiedJson(value))
		if (!candidate.hash || actualHash !== candidate.hash) {
			throw new Error(`canonical tracking evidence hash mismatch: ${candidate.path}`)
		}
		if (value.stage !== "tracking-14-day") throw new Error(`canonical tracking evidence stage mismatch: ${candidate.path}`)
		const revision = Number(candidate.revision)
		if (!Number.isInteger(revision) || revision < 0) throw new Error(`canonical tracking evidence revision is invalid: ${candidate.path}`)
		entries.push({path: relative(repoRoot, path), revision, recordedAt: value.recordedAt, trackedThrough: value.signals?.trackedThrough || "", usefulnessScore: value.signals?.usefulnessScore || 0, value})
	}

	return sortTrackingEvidence(entries)
}

export function loadValidatedServiceClient(repoRoot = process.cwd(), clientPath) {
	const queue = buildQueue({repoRoot, scope: "clients"})
	const absoluteClientPath = resolveRepoPath(repoRoot, clientPath)
	const sourcePath = relative(repoRoot, absoluteClientPath)
	const item = queue.items.find(candidate => candidate.sourcePath === sourcePath)
	if (!item) return blockedRecord({sourcePath, clientPath: absoluteClientPath, blocked: ["canonical paid service application is missing"]})

	return validatedRecordFromItem(repoRoot, item, absoluteClientPath)
}

function validatedRecordFromItem(repoRoot, item, absoluteClientPath = resolveRepoPath(repoRoot, item.sourcePath)) {
	const sourcePath = item.sourcePath

	const folder = absoluteClientPath
	const record = {
		ok: item.status !== "blocked",
		status: item.status,
		sourcePath,
		clientPath: folder,
		applicationId: item.applicationId,
		state: item.state,
		blocked: [...(item.blocked || [])],
		day0: null,
		trackingEvidence: [],
		approvedArtifact: null,
		approvedArtifactProvenance: null,
		approvedDelivery: null,
		implementationAcceptance: null,
		readyForHandoff: false,
		readinessBlocked: []
	}

	if (item.status === "blocked") {
		record.readinessBlocked = [...record.blocked]
		return record
	}

	try {
		const state = readServiceState(folder)
		const day0Path = join(folder, "service-day0.json")
		record.day0 = existsSync(day0Path) ? readJson(day0Path) : null
		if (!record.day0) throw new Error("canonical paid service client is missing Day 0")
		validateDay0Record(record.day0, item.applicationId)
		if (!state.transitionHistory.some(entry => entry.kind === "day0" && entry.from === "approved-awaiting-day0" && entry.day0Hash)) throw new Error("canonical paid service client is missing Day 0 transition provenance")
		if (["fit-review", "declined"].includes(item.state)) {
			throw new Error(`paid Day 0 is not valid in service state ${item.state}`)
		}
		const approvedArtifact = loadApprovedArtifactProvenance(repoRoot, state)
		const implementationAcceptance = loadImplementationAcceptanceProvenance(repoRoot, state)
		record.approvedArtifact = approvedArtifact?.value || null
		record.approvedArtifactProvenance = approvedArtifact ? {path: approvedArtifact.path, hash: approvedArtifact.hash, approvedAt: approvedArtifact.approvedAt} : null
		record.approvedDelivery = approvedArtifact?.value?.deliverables || null
		record.implementationAcceptance = implementationAcceptance
		const readiness = serviceClientHandoffReadiness({state: item.state, status: item.status, paused: item.paused, approvedArtifact, implementationAcceptance})
		record.readyForHandoff = readiness.ready
		record.readinessBlocked = readiness.blocked
		record.trackingEvidence = trackingEvidenceFor({repoRoot, item, state})
		return record
	} catch (error) {
		return blockedRecord({sourcePath, clientPath: absoluteClientPath, applicationId: item.applicationId, blocked: [error.message]})
	}
}

export function loadValidatedServiceClients(repoRoot = process.cwd()) {
	try {
		const queue = buildQueue({repoRoot, scope: "clients"})
		return queue.items.map(item => validatedRecordFromItem(repoRoot, item))
	} catch (error) {
		return [blockedRecord({clientPath: join(repoRoot, "clients"), blocked: [error.message]})]
	}
}
