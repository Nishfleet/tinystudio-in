import {existsSync, lstatSync, readFileSync} from "node:fs"
import {dirname, join, relative} from "node:path"
import {fileURLToPath} from "node:url"
import {atomicWrite, ensureDir, NO_GUARANTEE_CLIENT_SENTENCE, readJson, resolveRepoPath, validateAffirmativePaymentEvidence, validateApplication} from "./service-contract.mjs"

export const CLIENT_SCAFFOLD_VERSION = 1
export const FOUNDER_PILOT = Object.freeze({offerName: "The Website Correction", offerPriceUsd: 1000, pricingCohort: "founder-pilot", capacity: 3})
export const CLIENT_SCAFFOLD_FILES = Object.freeze([
	"intake.md",
	"sprint-plan.md",
	"kickoff-message.md",
	"buyer-room.md",
	"brain/brand-voice.md",
	"brain/reviews.md",
	"brain/competitors.md",
	"brain/website-notes.md",
	"deliverables/delivery.md",
	"deliverables/implementation-handoff.md",
	"quality/claim-proof-ledger.md",
	"quality/delivery-scorecard.md",
	"quality/sprint-acceptance-checklist.md"
])

const sourceRoot = dirname(dirname(dirname(fileURLToPath(import.meta.url))))

function assert(condition, message) {
	if (!condition) throw new Error(message)
}

export function assertFounderPilotRecord(day0, expectedSequence = null) {
	assert(day0 && typeof day0 === "object" && !Array.isArray(day0), "Day 0 founder-pilot record must be an object")
	assert(day0.offerName === FOUNDER_PILOT.offerName, "Day 0 offerName must be the canonical founder-pilot offer")
	assert(day0.offerPriceUsd === FOUNDER_PILOT.offerPriceUsd, "Day 0 offerPriceUsd must be exactly 1000")
	assert(day0.pricingCohort === FOUNDER_PILOT.pricingCohort, "Day 0 pricingCohort must be founder-pilot")
	assert(Number.isInteger(day0.pilotSequence) && day0.pilotSequence >= 1 && day0.pilotSequence <= FOUNDER_PILOT.capacity, "Day 0 pilotSequence must be 1, 2, or 3")
	if (expectedSequence !== null) assert(day0.pilotSequence === expectedSequence, "Day 0 pilotSequence does not match the paid founder-pilot sequence")
	return day0
}

export function assertCanonicalFounderPilotCohort(clients) {
	assert(Array.isArray(clients), "founder-pilot cohort must be an array")
	const sequences = clients.map(client => assertFounderPilotRecord(client?.day0 || client).pilotSequence).sort((left, right) => left - right)
	assert(new Set(sequences).size === sequences.length, "founder-pilot cohort contains duplicate pilotSequence values")
	assert(
		sequences.every((sequence, index) => sequence === index + 1),
		"founder-pilot cohort pilotSequence values must be contiguous from 1"
	)
	return clients
}

function founderPilotPrice(day0) {
	assertFounderPilotRecord(day0)
	return `$${day0.offerPriceUsd.toLocaleString("en-US")} founder pilot`
}

function source(relativePath) {
	const path = join(sourceRoot, relativePath)
	assert(existsSync(path), `client scaffold source is missing: ${relativePath}`)
	return readFileSync(path, "utf8")
}

function createIfMissing(repoRoot, clientFolder, relativePath, content, created) {
	const output = resolveRepoPath(repoRoot, relative(repoRoot, join(clientFolder, relativePath)))
	if (existsSync(output)) return
	atomicWrite(output, content.endsWith("\n") ? content : `${content}\n`)
	created.push(relativePath)
}

function populatedDelivery(application, day0) {
	return source("growth-brain/delivery-template.md")
		.replace("The Website Correction", day0.offerName)
		.replace(/\$1,000 founder pilot(s?)/g, (_match, plural) => `${founderPilotPrice(day0)}${plural}`)
		.replace("# Client Delivery Template", `# ${application.applicant.company} Delivery`)
		.replace("- Company:", `- Company: ${application.applicant.company}`)
		.replace("- Website:", `- Website: ${application.applicant.website}`)
		.replace("- Approval owner:", `- Approval owner: ${day0.approvalOwner}`)
		.replace("- Implementation owner:", `- Implementation owner: ${day0.implementationOwner}`)
		.replace("- Payment:", `- Payment: ${day0.paymentEvidence}`)
		.replace("- Day 0 start:", `- Day 0 start: ${day0.day0StartedAt}`)
		.replace("- Client-delay pauses:", `- Client-delay pauses: ${day0.paused ? "active" : "none recorded"}`)
		.replace("- Sprint dates:", `- Sprint dates: ${day0.day0StartedAt} to ${day0.deadlineAt}`)
}

function intake(application, day0) {
	const applicant = application.applicant
	return `# ${applicant.company} Intake

## Client

- Name: ${applicant.name}
- Company: ${applicant.company}
- Website: ${applicant.website}
- Main offer: ${applicant.primaryOffer}
- Target buyer: ${applicant.targetBuyer}
- Approval owner: ${day0.approvalOwner}
- Implementation owner: ${day0.implementationOwner}
- Payment: ${day0.paymentEvidence}
- Day 0 start: ${day0.day0StartedAt}
- Client-delay pauses: ${day0.paused ? day0.activePause?.reason || "active" : "none recorded"}
- Sprint dates: ${day0.day0StartedAt} to ${day0.deadlineAt}

## Required Context

- Website URLs: ${applicant.website}
- High-value offer: ${applicant.primaryOffer}
- Page evidence:
- Proof/reviews:
- Analytics or measurement context: ${applicant.mainLeadSource}
- Founder notes: ${day0.requiredContext}

## Application Context

- Suspected fault: ${applicant.suspectedLeak}
- Desired outcome: ${applicant.desiredOutcome}
- Implementation ability: ${applicant.implementationAbility}

## Access Notes

- Analytics:
- CMS:
- Implementation notes:

## Open Questions

- Highest-leverage page URL
`
}

function sprintPlan(application) {
	return `# ${application.applicant.company} Sprint Plan

## Sprint scope

- Buyer: founder-led Managed IT/MSP/cybersecurity company with a live site and high-value offer.
- Product: The Website Correction.
- Highest-leverage page:
- Starting fault hypothesis: ${application.applicant.suspectedLeak}

## Sprint Checklist

Use \`growth-brain/sprint-checklist.md\`.

## Deliverables

- Fault map:
- Rewrite or redesign:
- One implementation pass or dev-ready handoff:
- Search-trust basics:
- Before/after proof:
- Loom:
- Measurement plan:
- One revision:
- 14-day implementation tracking:

## Approval Gates

- Fit: human approved before Day 0
- Claims:
- Client-facing work:
- Delivery/acceptance:
- Renewal:

## Status

- Intake: canonical application and Day 0 recorded
- Brain filled:
- Drafted:
- Approved:
- Delivered:
- Follow-up:
`
}

function kickoff(application, day0) {
	return `# ${application.applicant.company} Kickoff Message

## Draft for human review

Subject: ${application.applicant.company} sprint kickoff

Hey ${day0.approvalOwner},

Thanks for approving the The Website Correction and completing the Day 0 prerequisites.

- Scope: one highest-leverage page
- Website: ${application.applicant.website}
- Founder pilot: ${founderPilotPrice(day0)}
- Day 0: ${day0.day0StartedAt}
- Working-day deadline: ${day0.deadlineAt}

The sprint includes a prioritized fault map, rewrite or redesign, one implementation pass or dev-ready handoff, search-trust basics, before/after proof, a Loom, a measurement plan, one revision, and 14-day implementation tracking.

${NO_GUARANTEE_CLIENT_SENTENCE} This draft must pass the human client-facing review gate before it is sent.
`
}

export function assertClientScaffold(repoRoot, clientFolder) {
	const missing = CLIENT_SCAFFOLD_FILES.filter(path => {
		const resolved = resolveRepoPath(repoRoot, relative(repoRoot, join(clientFolder, path)))
		return !existsSync(resolved) || !lstatSync(resolved).isFile()
	})
	assert(missing.length === 0, `client scaffold is incomplete: ${missing.join(", ")}`)
	return true
}

export function createClientScaffold({repoRoot, clientFolder}) {
	const safeFolder = resolveRepoPath(repoRoot, relative(repoRoot, clientFolder))
	const application = validateApplication(readJson(join(safeFolder, "service-application.json")), {repoRoot})
	const day0 = readJson(join(safeFolder, "service-day0.json"))
	assert(day0?.applicationId === application.applicationId, "client scaffold Day 0 applicationId mismatch")
	assert(day0?.ready === true, "client scaffold requires a ready Day 0 record")
	assertFounderPilotRecord(day0)
	validateAffirmativePaymentEvidence(day0.paymentEvidence)
	assert(relative(repoRoot, safeFolder) === `clients/${application.applicationId}`, "client scaffold requires the canonical paid client path")

	for (const directory of ["brain", "deliverables", "research", "quality"]) {
		ensureDir(resolveRepoPath(repoRoot, relative(repoRoot, join(safeFolder, directory))))
	}

	const created = []
	createIfMissing(repoRoot, safeFolder, "intake.md", intake(application, day0), created)
	createIfMissing(repoRoot, safeFolder, "sprint-plan.md", sprintPlan(application), created)
	createIfMissing(repoRoot, safeFolder, "kickoff-message.md", kickoff(application, day0), created)
	createIfMissing(repoRoot, safeFolder, "buyer-room.md", source("growth-brain/sales/buyer-room-template.md").replace("# Buyer room template", `# ${application.applicant.company} Buyer Room`), created)
	for (const file of ["brand-voice.md", "reviews.md", "competitors.md", "website-notes.md"]) {
		createIfMissing(repoRoot, safeFolder, `brain/${file}`, source(`growth-brain/client-brain-template/${file}`), created)
	}
	createIfMissing(repoRoot, safeFolder, "deliverables/delivery.md", populatedDelivery(application, day0), created)
	createIfMissing(repoRoot, safeFolder, "deliverables/implementation-handoff.md", source("growth-brain/delivery/implementation-handoff-template.md"), created)
	for (const file of ["claim-proof-ledger.md", "delivery-scorecard.md", "sprint-acceptance-checklist.md"]) {
		createIfMissing(repoRoot, safeFolder, `quality/${file}`, source(`growth-brain/quality/${file}`), created)
	}
	assertClientScaffold(repoRoot, safeFolder)
	return {applicationId: application.applicationId, path: relative(repoRoot, safeFolder), created, scaffoldVersion: CLIENT_SCAFFOLD_VERSION}
}
