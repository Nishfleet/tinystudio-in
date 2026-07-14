#!/usr/bin/env node
import assert from "node:assert/strict"
const {equal: eq, deepEqual: deq, match: mat, throws: thr} = assert
import {existsSync, mkdirSync, mkdtempSync, rmSync, unlinkSync, writeFileSync} from "node:fs"
import {join} from "node:path"
import {tmpdir} from "node:os"
import {spawnSync} from "node:child_process"
import {minifiedJson, sha256} from "./lib/service-contract.mjs"
import * as validatedServiceClient from "./lib/validated-service-client.mjs"

const {loadValidatedServiceClient, sortTrackingEvidence} = validatedServiceClient

const fixtureRoot = mkdtempSync(join(tmpdir(), "tinystudio-validated-client-"))
const clientPath = join(fixtureRoot, "clients", "unpaid-client")
const writeJson = (path, value) => writeFileSync(path, `${JSON.stringify(value, null, 2)}\n`)

try {
	mkdirSync(clientPath, {recursive: true})
	mkdirSync(join(clientPath, "service-evidence", "tracking-14-day"), {recursive: true})
	writeFileSync(join(clientPath, "intake.md"), "# Unpaid client\n- Payment: fake text\n")
	writeFileSync(join(clientPath, "service-evidence", "tracking-14-day", "10.json"), JSON.stringify({stage: "tracking-14-day", forged: true}))

	const before = existsSync(join(clientPath, "kickoff-message.md"))
	const kickoff = spawnSync(process.execPath, [join(process.cwd(), "scripts/draft-client-kickoff.mjs"), "clients/unpaid-client"], {cwd: process.cwd(), env: {...process.env, SERVICE_REPO_ROOT: fixtureRoot}, encoding: "utf8"})
	eq(kickoff.status, 1)
	mat(kickoff.stderr, /canonical paid service application|valid paid Day 0/i)
	eq(existsSync(join(clientPath, "kickoff-message.md")), before)

	const blocked = loadValidatedServiceClient(fixtureRoot, "clients/unpaid-client")
	eq(blocked.ok, false)
	mat(blocked.blocked.join("; "), /canonical paid service application is missing/i)
	eq(blocked.clientPath, clientPath)
	deq(
		sortTrackingEvidence([{revision: 2}, {revision: 10}, {revision: 1}]).map(entry => entry.revision),
		[10, 2, 1]
	)

	eq(typeof validatedServiceClient.loadApprovedArtifactProvenance, "function")
	eq(typeof validatedServiceClient.loadImplementationAcceptanceProvenance, "function")
	eq(typeof validatedServiceClient.serviceClientHandoffReadiness, "function")

	const approvedArtifactValue = {contract: "tinystudio.agent-work-output", status: "ready-for-review", deliverables: {pageFix: {pageUrl: "https://example.com/managed-services"}}}
	const approvedArtifactPath = join(fixtureRoot, "approved-agent-work.json")
	writeJson(approvedArtifactPath, approvedArtifactValue)
	const approvedArtifactHash = sha256(minifiedJson(approvedArtifactValue))

	const implementationEvidenceValue = {stage: "implementation", recordedAt: "2026-07-13T15:00:00.000Z", signals: {acceptanceStatus: "accepted"}}
	const implementationEvidencePath = join(fixtureRoot, "accepted-implementation.json")
	writeJson(implementationEvidencePath, implementationEvidenceValue)
	const implementationEvidenceHash = sha256(minifiedJson(implementationEvidenceValue))

	const provenanceState = {
		transitionHistory: [
			{kind: "decision", from: "day0-ready", to: "client-approved", at: "2026-07-13T13:00:00.000Z", artifactPath: "approved-agent-work.json", artifactHash: approvedArtifactHash},
			{kind: "decision", from: "implementation", to: "tracking-14-day", at: "2026-07-13T15:01:00.000Z", evidencePath: "accepted-implementation.json", evidenceHash: implementationEvidenceHash, implementationAcceptedAt: implementationEvidenceValue.recordedAt}
		]
	}

	const approvedArtifact = validatedServiceClient.loadApprovedArtifactProvenance(fixtureRoot, provenanceState)
	deq(approvedArtifact.value, approvedArtifactValue)
	eq(approvedArtifact.hash, approvedArtifactHash)
	const implementationAcceptance = validatedServiceClient.loadImplementationAcceptanceProvenance(fixtureRoot, provenanceState)
	deq(implementationAcceptance.value, implementationEvidenceValue)
	eq(implementationAcceptance.hash, implementationEvidenceHash)

	for (const [state, status, paused] of [
		["day0-ready", "needs-agent-work", false],
		["day0-ready", "needs-review", false],
		["client-approved", "needs-input", false],
		["client-approved", "auto-ready", false],
		["paused-with-reason", "needs-input", true],
		["needs-info", "needs-input", false],
		["scope-review", "needs-input", false]
	]) {
		const readiness = validatedServiceClient.serviceClientHandoffReadiness({state, status, paused, approvedArtifact, implementationAcceptance})
		eq(readiness.ready, false)
	}

	eq(validatedServiceClient.serviceClientHandoffReadiness({state: "tracking-14-day", status: "needs-review", approvedArtifact, implementationAcceptance}).ready, false)
	eq(validatedServiceClient.serviceClientHandoffReadiness({state: "tracking-14-day", status: "needs-input", approvedArtifact, implementationAcceptance}).ready, true)
	eq(validatedServiceClient.serviceClientHandoffReadiness({state: "complete", status: "done", approvedArtifact, implementationAcceptance}).ready, true)

	writeJson(approvedArtifactPath, {...approvedArtifactValue, status: "tampered"})
	thr(() => validatedServiceClient.loadApprovedArtifactProvenance(fixtureRoot, provenanceState), /approved agent-work artifact hash mismatch/i)
	writeJson(approvedArtifactPath, approvedArtifactValue)
	unlinkSync(approvedArtifactPath)
	thr(() => validatedServiceClient.loadApprovedArtifactProvenance(fixtureRoot, provenanceState), /approved agent-work artifact is missing/i)

	writeJson(implementationEvidencePath, {...implementationEvidenceValue, recordedAt: "2026-07-13T15:02:00.000Z"})
	thr(() => validatedServiceClient.loadImplementationAcceptanceProvenance(fixtureRoot, provenanceState), /implementation acceptance evidence hash mismatch/i)
	writeJson(implementationEvidencePath, implementationEvidenceValue)
	unlinkSync(implementationEvidencePath)
	thr(() => validatedServiceClient.loadImplementationAcceptanceProvenance(fixtureRoot, provenanceState), /implementation acceptance evidence is missing/i)

	console.log("Validated service-client checks passed.")
} finally {
	rmSync(fixtureRoot, {recursive: true, force: true})
}
