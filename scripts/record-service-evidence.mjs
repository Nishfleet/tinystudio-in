#!/usr/bin/env node
import {existsSync} from "node:fs"
import {join} from "node:path"
import {acquireLock, assertCliArguments, atomicWriteJson, ensureDir, isRfc3339Timestamp, readJson, resolveRepoPath} from "./lib/service-contract.mjs"
import {buildQueue, queuePaths, readServiceState, validateDay0Record, validateStageEvidence} from "./lib/review-queue.mjs"
import {localIsoDate, timestampIsOnOrBeforeLocalDate, timestampIsOnOrBeforeTrustedNow, trustedNow} from "./date-utils.mjs"

const args = process.argv.slice(2)
const [id] = assertCliArguments(args, {
	options: [
		"stage",
		"as-of",
		"recorded-at",
		"recorded-by",
		"client-outcome",
		"client-feedback",
		"implementation-owner",
		"reviewed-artifact-hash",
		"approved-artifact-hash",
		"implementation-status",
		"acceptance-status",
		"usefulness-score",
		"usefulness-note",
		"implementation-artifact-url",
		"before-evidence-url",
		"after-evidence-url",
		"loom-url",
		"baseline-metric",
		"baseline-value",
		"baseline-source-url",
		"baseline-captured-at",
		"tracked-through",
		"acceptance-confirmed",
		"recurring-need-observed",
		"continuation-note",
		"tracking-record-url",
		"measurement-metric",
		"measurement-baseline",
		"measurement-result",
		"measurement-source-url"
	],
	positionalCount: 1
})
const value = (name, fallback = "") => {
	const index = args.indexOf(`--${name}`)
	return index >= 0 ? (args[index + 1] ?? fallback) : fallback
}
const bool = (name, fallback = false) => {
	const raw = value(name, "")
	if (!raw) return fallback
	if (["true", "1", "yes"].includes(raw.toLowerCase())) return true
	if (["false", "0", "no"].includes(raw.toLowerCase())) return false
	throw new Error(`--${name} must be true or false`)
}
const repoRoot = process.env.SERVICE_REPO_ROOT || process.cwd()
const asOfDate = value("as-of", "")

if (!id) {
	console.error("Usage: npm run service:evidence -- APPLICATION_ID --stage client-approved|implementation|tracking-14-day ...")
	process.exit(1)
}

try {
	const release = acquireLock(queuePaths(repoRoot).lockDir)
	try {
		const trustedInstant = trustedNow()
		const trustedDate = localIsoDate(trustedInstant)
		const queue = buildQueue({repoRoot, asOfDate: asOfDate || trustedDate, trustedDate})
		const item = queue.items.find(candidate => candidate.applicationId === id)
		if (!item) throw new Error(`application not found: ${id}`)
		if (item.status === "blocked") throw new Error(`application is blocked: ${item.blocked.join("; ")}`)
		const stage = value("stage", item.state)
		if (!["client-approved", "implementation", "tracking-14-day"].includes(stage)) throw new Error(`stage evidence requires a review stage, got ${stage}`)
		if (stage !== item.state) throw new Error(`application is in ${item.state}, not ${stage}`)
		const folder = resolveRepoPath(repoRoot, item.sourcePath)
		const path = resolveRepoPath(repoRoot, `${item.sourcePath}/service-evidence/${stage}/${item.contextRevision}.json`)
		if (existsSync(path)) throw new Error(`stage evidence already exists: ${path}`)
		const recordedAt = value("recorded-at", trustedInstant.toISOString())
		if (!isRfc3339Timestamp(recordedAt)) throw new Error("recorded-at must be an RFC 3339 timestamp")
		if (!timestampIsOnOrBeforeLocalDate(recordedAt, queue.asOfDate)) throw new Error("recordedAt is after queue as-of date")
		if (!timestampIsOnOrBeforeTrustedNow(recordedAt, trustedInstant)) throw new Error("recorded-at is after the trusted current instant")
		const recordedBy = value("recorded-by", "TinyStudio reviewer")
		const state = readServiceState(folder)
		const day0Path = resolveRepoPath(repoRoot, `${item.sourcePath}/service-day0.json`)
		if (!existsSync(day0Path)) throw new Error(`Day 0 record is missing: ${day0Path}`)
		const day0 = validateDay0Record(readJson(day0Path), id)
		const approvedEntry = [...state.transitionHistory].reverse().find(entry => entry.to === "client-approved" && entry.artifactPath)
		const approvedArtifact = approvedEntry ? readJson(resolveRepoPath(repoRoot, approvedEntry.artifactPath)) : null
		let signals
		if (stage === "client-approved") {
			signals = {clientOutcome: value("client-outcome"), clientFeedback: value("client-feedback"), implementationOwner: args.includes("--implementation-owner") ? value("implementation-owner") : day0.implementationOwner, reviewedArtifactHash: value("reviewed-artifact-hash", state.approvedArtifactHash || "")}
		} else if (stage === "implementation") {
			signals = {
				approvedArtifactHash: value("approved-artifact-hash", state.approvedArtifactHash || ""),
				implementationStatus: value("implementation-status"),
				acceptanceStatus: value("acceptance-status"),
				usefulnessScore: Number(value("usefulness-score", "0")),
				usefulnessNote: value("usefulness-note"),
				implementationArtifactUrl: value("implementation-artifact-url"),
				beforeEvidenceUrl: value("before-evidence-url"),
				afterEvidenceUrl: value("after-evidence-url"),
				loomUrl: value("loom-url"),
				measurementBaseline: {metric: value("baseline-metric"), value: value("baseline-value"), sourceUrl: value("baseline-source-url"), capturedAt: value("baseline-captured-at")}
			}
		} else {
			signals = {
				trackedThrough: value("tracked-through"),
				implementationStatus: value("implementation-status"),
				acceptanceConfirmed: bool("acceptance-confirmed"),
				usefulnessScore: Number(value("usefulness-score", "0")),
				recurringNeedObserved: bool("recurring-need-observed"),
				continuationNote: value("continuation-note"),
				trackingRecordUrl: value("tracking-record-url"),
				measurementResult: {metric: value("measurement-metric"), baseline: value("measurement-baseline"), result: value("measurement-result"), sourceUrl: value("measurement-source-url")}
			}
		}
		const evidence = {contract: "tinystudio.service-stage-evidence", schemaVersion: 1, applicationId: id, sourceHash: item.sourceHash, stage, recordedAt, recordedBy, signals}
		validateStageEvidence(evidence, {
			application: {applicationId: id, sourceHash: item.sourceHash},
			state: stage,
			approvedArtifactHash: state.approvedArtifactHash || "",
			approvedArtifact,
			implementationAcceptedAt: state.implementationAcceptedAt || "",
			implementationBaseline: item.implementationBaseline,
			pauseHistory: day0.pauseHistory,
			activePause: day0.activePause,
			asOfDate: queue.asOfDate,
			notBefore: state.updatedAt
		})
		ensureDir(join(folder, "service-evidence", stage))
		atomicWriteJson(path, evidence)
		console.log(JSON.stringify({status: "recorded", applicationId: id, stage, evidencePath: path}, null, 2))
	} finally {
		release()
	}
} catch (error) {
	console.error(`service:evidence failed: ${error.message}`)
	process.exit(1)
}
