import assert from "node:assert/strict"
import {spawnSync} from "node:child_process"
import {mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync} from "node:fs"
import {tmpdir} from "node:os"
import {dirname, join} from "node:path"
import {fileURLToPath} from "node:url"
import {CANONICAL_PROSPECT_ASK} from "./lib/canonical-service-copy.mjs"
import {NO_GUARANTEE_CLIENT_SENTENCE, NO_GUARANTEE_OUTCOMES} from "./lib/service-contract.mjs"

const repositoryRoot = dirname(dirname(fileURLToPath(import.meta.url)))
const testRoot = mkdtempSync(join(tmpdir(), "tinystudio-active-offer-projection-"))
const sp = name => join(repositoryRoot, "scripts", name)
const {equal: eq, match: mat, doesNotMatch: dnm} = assert
const legacyProspectPath = join(testRoot, "prospects", "legacy-offer-fixture")
const retiredOfferPattern = /7-Day Site Revenue Fault Sprint|7[- ]day sprint|Tangible Revenue Fault Sprint|30[- ]day action plan|Growth Desk|three pages|founder sprint|\$500/i

function writeJson(path, value) {
	mkdirSync(dirname(path), {recursive: true})
	writeFileSync(path, `${JSON.stringify(value)}\n`)
}

try {
	mkdirSync(legacyProspectPath, {recursive: true})
	writeJson(join(legacyProspectPath, "metadata.json"), {name: "Legacy Offer Fixture", website: "https://example.com/managed-it", vertical: "managed-it-cybersecurity", contact: "Founder"})
	writeJson(join(legacyProspectPath, "pipeline.json"), {stage: "new", followUps: []})
	writeFileSync(
		join(legacyProspectPath, "buyer-room.md"),
		`# Legacy Buyer Room

## Loom

- Link: https://www.loom.com/share/1234567890abcdef1234567890abcdef

## Timing and price

- Price: $500
`
	)
	writeFileSync(
		join(legacyProspectPath, "loom-outline.md"),
		`# Legacy Outline

2. Main page: https://example.com/managed-it
3. Revenue fault: The primary buyer path is unclear
4. Evidence: Competing calls to action split attention
6. First fix: Make one managed-service action primary
7. Sprint pitch: 7-Day Site Revenue Fault Sprint with a 30-day action plan

## Close

If useful, I can run a Tangible Revenue Fault Sprint and Growth Desk across three pages for $500.
`
	)
	writeFileSync(
		join(legacyProspectPath, "outreach.md"),
		`# Legacy Outreach

## First Message

Subject: Old offer

If useful, I can run a 7-Day Site Revenue Fault Sprint with a 30-day action plan, then continue through the Growth Desk for $500.
`
	)

	dnm(CANONICAL_PROSPECT_ASK, retiredOfferPattern)
	mat(CANONICAL_PROSPECT_ASK, new RegExp(NO_GUARANTEE_CLIENT_SENTENCE.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")))
	for (const forbiddenOutcome of NO_GUARANTEE_OUTCOMES) {
		mat(CANONICAL_PROSPECT_ASK, new RegExp(forbiddenOutcome.replace("-", "[- ]"), "i"))
	}

	const messageResult = spawnSync(process.execPath, [sp("draft-prospect-message.mjs"), legacyProspectPath], {cwd: repositoryRoot, encoding: "utf8"})
	eq(messageResult.status, 0)
	const nextMessage = readFileSync(join(legacyProspectPath, "next-message.md"), "utf8")
	mat(nextMessage, /The Website Correction/)
	mat(nextMessage, /one highest-leverage page/)
	mat(nextMessage, /search-trust basics/)
	mat(nextMessage, /one revision/)
	mat(nextMessage, /14-day implementation tracking/)
	for (const forbiddenOutcome of NO_GUARANTEE_OUTCOMES) {
		mat(nextMessage, new RegExp(forbiddenOutcome.replace("-", "[- ]"), "i"))
	}
	dnm(nextMessage, retiredOfferPattern)

	const loomResult = spawnSync(process.execPath, [sp("draft-loom-package.mjs"), legacyProspectPath], {cwd: repositoryRoot, encoding: "utf8"})
	eq(loomResult.status, 0)
	const loomPackage = readFileSync(join(legacyProspectPath, "loom-package.md"), "utf8")
	mat(loomPackage, /The Website Correction/)
	mat(loomPackage, /one highest-leverage page/)
	for (const forbiddenOutcome of NO_GUARANTEE_OUTCOMES) {
		mat(loomPackage, new RegExp(forbiddenOutcome.replace("-", "[- ]"), "i"))
	}
	dnm(loomPackage, retiredOfferPattern)

	const sendResult = spawnSync(process.execPath, [sp("prepare-prospect-send.mjs"), legacyProspectPath, "https://www.loom.com/share/1234567890abcdef1234567890abcdef", "--approved", "--force"], {cwd: repositoryRoot, encoding: "utf8"})
	eq(sendResult.status, 0, `send prep failed: ${sendResult.stderr}`)
	const sendPackage = readFileSync(join(legacyProspectPath, "send-package.md"), "utf8")
	mat(sendPackage, /The Website Correction/)
	mat(sendPackage, /one highest-leverage page/)
	for (const forbiddenOutcome of NO_GUARANTEE_OUTCOMES) {
		mat(sendPackage, new RegExp(forbiddenOutcome.replace("-", "[- ]"), "i"))
	}
	dnm(sendPackage, retiredOfferPattern)

	// A stale contact-plan.md feeds the send package verbatim, so send prep
	// must refuse to generate it without --force.
	writeFileSync(
		join(legacyProspectPath, "recording-notes.md"),
		`# Recording Notes

## Quality Notes

- Visible fault: The primary buyer path is unclear
- Buyer impact: Competing calls to action split attention
- First fix: Make one managed-service action primary
- Clean ask: If useful, I can run a human-reviewed The Website Correction on this one highest-leverage page.
`
	)
	writeFileSync(
		join(legacyProspectPath, "recording-sharpness-brief.md"),
		`# Sharpness Brief

## Positioning Angle

The Website Correction at the $1,000 founder pilot.

## Direct Response Slide

The primary buyer path is unclear.

## So-What Chain

Buyers cannot decide, so they leave.
`
	)
	writeFileSync(
		join(legacyProspectPath, "contact-plan.md"),
		`# Contact Plan

## Best Route

Email the founder directly.

## Pitch

If useful, I can run a 7-Day Site Revenue Fault Sprint with a 30-day action plan.
`
	)
	const blockedSendResult = spawnSync(process.execPath, [sp("prepare-prospect-send.mjs"), legacyProspectPath, "https://www.loom.com/share/1234567890abcdef1234567890abcdef", "--approved"], {cwd: repositoryRoot, encoding: "utf8"})
	eq(blockedSendResult.status, 1, "send prep must block a retired contact-plan")
	mat(blockedSendResult.stderr, /Send package inputs still sell a retired offer/)
	mat(blockedSendResult.stderr, /contact-plan\.md/)
	const forcedSendResult = spawnSync(process.execPath, [sp("prepare-prospect-send.mjs"), legacyProspectPath, "https://www.loom.com/share/1234567890abcdef1234567890abcdef", "--approved", "--force"], {cwd: repositoryRoot, encoding: "utf8"})
	eq(forcedSendResult.status, 0, `forced send prep failed: ${forcedSendResult.stderr}`)
	rmSync(join(legacyProspectPath, "contact-plan.md"))
	rmSync(join(legacyProspectPath, "recording-notes.md"))
	rmSync(join(legacyProspectPath, "recording-sharpness-brief.md"))

	console.log("Active offer projection checks passed.")
} finally {
	rmSync(testRoot, {recursive: true, force: true})
}
