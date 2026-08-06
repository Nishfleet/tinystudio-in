#!/usr/bin/env node
import {closeSync, constants, existsSync, fstatSync, lstatSync, openSync, readSync, renameSync, rmSync} from "node:fs"
import {dirname, join, relative, resolve} from "node:path"
import {acquireLock, assertCliArguments, atomicWriteJson, validateApplication, resolveRepoPath, ensureDir, newNonce, normalizeApplicant, queueInputHashFor} from "./lib/service-contract.mjs"
import {contextHistoryHash, ensureReviewCapLedger, pendingReviewCapJournalApplicationId, queuePaths, serviceRecordPaths} from "./lib/review-queue.mjs"
import {pendingPromotionApplicationIds} from "./lib/service-promotion-journal.mjs"
import {localIsoDate, timestampIsOnOrBeforeLocalDate} from "./date-utils.mjs"

const MAX_APPLICATION_BYTES = 256 * 1024

function readApplicationSource(input) {
	const source = resolve(input)
	let descriptor = null
	try {
		const pathStat = lstatSync(source)
		if (pathStat.isSymbolicLink()) throw new Error("application source must not be a symbolic link")
		if (!pathStat.isFile()) throw new Error("application source must be a regular file")
		if (pathStat.size > MAX_APPLICATION_BYTES) throw new Error(`application source exceeds the ${MAX_APPLICATION_BYTES}-byte limit`)

		descriptor = openSync(source, constants.O_RDONLY | constants.O_NOFOLLOW)
		const openedStat = fstatSync(descriptor)
		if (!openedStat.isFile()) throw new Error("application source must be a regular file")
		if (openedStat.dev !== pathStat.dev || openedStat.ino !== pathStat.ino || openedStat.size !== pathStat.size) {
			throw new Error("application source changed before it could be read")
		}

		const bytes = Buffer.alloc(openedStat.size)
		let offset = 0
		while (offset < bytes.length) {
			const read = readSync(descriptor, bytes, offset, bytes.length - offset, null)
			if (read === 0) throw new Error("application source changed while it was being read")
			offset += read
		}
		if (readSync(descriptor, Buffer.alloc(1), 0, 1, null) !== 0) {
			throw new Error(`application source exceeds the ${MAX_APPLICATION_BYTES}-byte limit or changed while it was being read`)
		}

		let json
		try {
			json = new TextDecoder("utf-8", {fatal: true}).decode(bytes)
		} catch {
			throw new Error("application source must be valid UTF-8 JSON")
		}
		try {
			return JSON.parse(json)
		} catch (error) {
			throw new Error(`application source must be valid JSON: ${error.message}`)
		}
	} catch (error) {
		if (error?.code === "ENOENT") throw new Error(`Application file not found: ${input}`)
		if (error?.code === "ELOOP") throw new Error("application source must not be a symbolic link")
		throw error
	} finally {
		if (descriptor !== null) closeSync(descriptor)
	}
}

const args = process.argv.slice(2)
assertCliArguments(args, {positionalCount: 1})
const input = args.find(arg => !arg.startsWith("--"))
const repoRoot = process.env.SERVICE_REPO_ROOT || process.cwd()
if (!input) {
	console.error("Usage: npm run service:import -- application.json")
	process.exit(1)
}
try {
	const application = readApplicationSource(input)
	validateApplication(application, {repoRoot})
	const canonicalApplicant = normalizeApplicant(application.applicant)
	if (Object.entries(canonicalApplicant).some(([field, canonicalValue]) => application.applicant[field] !== canonicalValue)) {
		throw new Error("application applicant must already use canonical NFC, whitespace, and lowercase-email formatting")
	}
	if (application.qualification.state !== "ready") throw new Error(`qualification must be ready before import; received ${application.qualification.state}`)
	if (!timestampIsOnOrBeforeLocalDate(application.submittedAt, localIsoDate())) throw new Error("application submittedAt is after the trusted local date")

	const paths = queuePaths(repoRoot)
	const release = acquireLock(paths.lockDir)
	try {
		const pendingPromotions = pendingPromotionApplicationIds(repoRoot)
		if (pendingPromotions.length > 0) {
			throw new Error(`service promotion repair required before import: ${pendingPromotions.join(", ")}`)
		}
		const pendingReview = pendingReviewCapJournalApplicationId(repoRoot)
		if (pendingReview) throw new Error(`review cap decision journal requires repair: ${pendingReview}`)
		serviceRecordPaths(repoRoot, "all")
		const target = resolveRepoPath(repoRoot, `prospects/${application.applicationId}`)
		const existingTargets = ["prospects", "clients"].map(root => resolveRepoPath(repoRoot, `${root}/${application.applicationId}`))
		if (existingTargets.some(path => existsSync(path))) throw new Error(`Import target already exists for application: ${application.applicationId}`)
		ensureReviewCapLedger(repoRoot, {allowCreate: true})
		const staging = resolveRepoPath(repoRoot, relative(repoRoot, join(paths.queueDir, "imports", `${application.applicationId}-${newNonce()}`)))
		try {
			ensureDir(dirname(target))
			ensureDir(staging)
			atomicWriteJson(join(staging, "service-application.json"), application)
			const queueInputHash = queueInputHashFor({applicationId: application.applicationId, sourceHash: application.sourceHash, packetHash: application.qualification.packetHash, schemaVersion: application.schemaVersion, state: "fit-review"})
			atomicWriteJson(join(staging, "service-state.json"), {
				state: "fit-review",
				usedDecisionHashes: [],
				contextHistory: [],
				contextRevision: 0,
				deliveryRevision: 0,
				transitionHistory: [
					{
						from: "",
						to: "fit-review",
						kind: "initial",
						at: application.submittedAt,
						contextRevision: 0,
						deliveryRevision: 0,
						queueInputHash,
						decisionHash: "",
						day0Hash: "",
						evidenceHash: "",
						artifactPath: "",
						artifactHash: "",
						evidencePath: "",
						implementationAcceptedAt: "",
						contextEntry: null,
						contextHash: contextHistoryHash([])
					}
				],
				importedAt: application.submittedAt,
				updatedAt: application.submittedAt,
				sourceHash: application.sourceHash,
				packetHash: application.qualification.packetHash,
				queueInputHash
			})
			renameSync(staging, target)
		} catch (error) {
			rmSync(staging, {recursive: true, force: true})
			throw error
		}
		console.log(JSON.stringify({status: "imported", applicationId: application.applicationId, target: `prospects/${application.applicationId}`, sourceHash: application.sourceHash, packetHash: application.qualification.packetHash}, null, 2))
	} finally {
		release()
	}
} catch (error) {
	console.error(`service:import failed: ${error.message}`)
	process.exit(1)
}
