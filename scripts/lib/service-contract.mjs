import {createHash, randomUUID} from "node:crypto"
import {chmodSync, existsSync, linkSync, readFileSync, mkdirSync, renameSync, writeFileSync, unlinkSync, rmdirSync, realpathSync, rmSync, statSync} from "node:fs"
import {dirname, isAbsolute, relative, resolve, join} from "node:path"

export const APPLICATION_CONTRACT = "tinystudio.sprint-application"
export const DECISION_CONTRACT = "tinystudio.review-decision"
export const SCHEMA_VERSION = 1
export const APPLICATION_SCHEMA_PATH = "contracts/sprint-application.v1.schema.json"
export const DECISION_SCHEMA_PATH = "contracts/review-decision.v1.schema.json"
export const APPLICATION_WEBSITE_PATTERN_SOURCE = "^[Hh][Tt][Tt][Pp][Ss]?://(?:\\[(?:(?:[0-9A-Fa-f]{1,4}:){7}(?:[0-9A-Fa-f]{1,4}|:)|(?:[0-9A-Fa-f]{1,4}:){6}(?:(?:(?:25[0-5]|2[0-4][0-9]|1[0-9]{2}|[1-9]?[0-9])\\.){3}(?:25[0-5]|2[0-4][0-9]|1[0-9]{2}|[1-9]?[0-9])|:[0-9A-Fa-f]{1,4}|:)|(?:[0-9A-Fa-f]{1,4}:){5}(?::(?:(?:25[0-5]|2[0-4][0-9]|1[0-9]{2}|[1-9]?[0-9])\\.){3}(?:25[0-5]|2[0-4][0-9]|1[0-9]{2}|[1-9]?[0-9])|(?::[0-9A-Fa-f]{1,4}){1,2}|:)|(?:[0-9A-Fa-f]{1,4}:){4}(?:(?::[0-9A-Fa-f]{1,4}){0,1}:(?:(?:25[0-5]|2[0-4][0-9]|1[0-9]{2}|[1-9]?[0-9])\\.){3}(?:25[0-5]|2[0-4][0-9]|1[0-9]{2}|[1-9]?[0-9])|(?::[0-9A-Fa-f]{1,4}){1,3}|:)|(?:[0-9A-Fa-f]{1,4}:){3}(?:(?::[0-9A-Fa-f]{1,4}){0,2}:(?:(?:25[0-5]|2[0-4][0-9]|1[0-9]{2}|[1-9]?[0-9])\\.){3}(?:25[0-5]|2[0-4][0-9]|1[0-9]{2}|[1-9]?[0-9])|(?::[0-9A-Fa-f]{1,4}){1,4}|:)|(?:[0-9A-Fa-f]{1,4}:){2}(?:(?::[0-9A-Fa-f]{1,4}){0,3}:(?:(?:25[0-5]|2[0-4][0-9]|1[0-9]{2}|[1-9]?[0-9])\\.){3}(?:25[0-5]|2[0-4][0-9]|1[0-9]{2}|[1-9]?[0-9])|(?::[0-9A-Fa-f]{1,4}){1,5}|:)|(?:[0-9A-Fa-f]{1,4}:){1}(?:(?::[0-9A-Fa-f]{1,4}){0,4}:(?:(?:25[0-5]|2[0-4][0-9]|1[0-9]{2}|[1-9]?[0-9])\\.){3}(?:25[0-5]|2[0-4][0-9]|1[0-9]{2}|[1-9]?[0-9])|(?::[0-9A-Fa-f]{1,4}){1,6}|:)|(?::(?:(?::[0-9A-Fa-f]{1,4}){0,5}:(?:(?:25[0-5]|2[0-4][0-9]|1[0-9]{2}|[1-9]?[0-9])\\.){3}(?:25[0-5]|2[0-4][0-9]|1[0-9]{2}|[1-9]?[0-9])|(?::[0-9A-Fa-f]{1,4}){1,7}|:)))\\]|(?:(?:25[0-5]|2[0-4][0-9]|1[0-9]{2}|[1-9]?[0-9])\\.){3}(?:25[0-5]|2[0-4][0-9]|1[0-9]{2}|[1-9]?[0-9])|(?:[A-Za-z0-9_~-]+\\.)*(?=[A-Za-z0-9_~-]*[A-Za-z_~])[A-Za-z0-9_~-]+)(?::(?:[0-9]{1,4}|[0-5][0-9]{4}|6[0-4][0-9]{3}|65[0-4][0-9]{2}|655[0-2][0-9]|6553[0-5]))?(?:[/?#][A-Za-z0-9._~:/?#\\[\\]@!$&'()*+,;=%-]*)?$"
const RAW_WEBSITE_AUTHORITY_PATTERN = /^[Hh][Tt][Tt][Pp][Ss]?:\/\/[^/?#\\\s]+(?:[/?#]|$)/
export const NO_GUARANTEE_OUTCOMES = Object.freeze(["revenue", "ranking", "ROAS", "conversion", "booked-call", "sales-volume"])
export const NO_GUARANTEE_DISCLAIMER = "No revenue, ranking, ROAS, conversion-lift, booked-call, or sales-volume guarantees."
export const NO_GUARANTEE_CLIENT_SENTENCE = "We do not guarantee revenue, ranking, ROAS, conversion, booked-call, or sales-volume outcomes."
export const ACTIVE_OPERATOR_ARTIFACTS = Object.freeze([
	"growth-brain/ops/11-10-proof-run.md",
	"growth-brain/ops/proof-library.md",
	"growth-brain/ops/live-metrics.md",
	"growth-brain/ops/market-parity-readiness.md",
	"growth-brain/ops/sender-setup-guide.md",
	"growth-brain/ops/sender-setup-guide.html",
	"growth-brain/ops/competitive-proof-matrix.md",
	"growth-brain/ops/competitive-proof-matrix.html",
	"docs/strategy/market-parity-benchmark-2026.md"
])
export const SERVICE_STATES = ["fit-review", "approved-awaiting-day0", "day0-ready", "delivery-draft", "client-approved", "implementation", "tracking-14-day", "complete", "needs-info", "declined", "paused-with-reason", "scope-review"]
export const DECISIONS = ["approve", "decline", "needs-info"]
export const ALLOWED_COMMANDS = Object.freeze(
	[
		["node", "scripts/check-client-readiness.mjs"],
		["node", "scripts/export-client-delivery-cockpit.mjs"],
		["node", "scripts/draft-client-kickoff.mjs"],
		["node", "scripts/review-client-proof.mjs", "--dry-run"],
		["node", "scripts/review-client-acceptance.mjs", "--dry-run"],
		["node", "scripts/check-prospect-readiness.mjs"],
		["node", "scripts/export-prospect-outbox.mjs"],
		["node", "scripts/export-followup-cockpit.mjs"],
		["node", "scripts/export-sales-cockpit.mjs"]
	].map(argv => Object.freeze(argv))
)
export const DENIED_ACTIONS = Object.freeze(["--force", "pipeline stage mutation", "send", "batch-sent", "proof approval", "acceptance completion", "clipboard", "open", "network snapshot", "contact enrichment", "provider CLI", "shell command string", "publish", "spend", "renewal"])
export const PRIVATE_DIR_MODE = 0o700
export const PRIVATE_FILE_MODE = 0o600

// Service records contain client and prospect data. Keep every file created by
// this process private, including legacy direct writers that share this module.
process.umask(0o077)

const applicantFields = ["name", "workEmail", "company", "website", "companyType", "targetBuyer", "primaryOffer", "mainLeadSource", "suspectedLeak", "desiredOutcome", "implementationAbility", "consent"]
const packetFields = ["fitStatus", "fitReasons", "leakHypothesis", "missingInformation", "riskFlags", "recommendedNextStep"]
const applicationFields = ["contract", "schemaVersion", "schemaDigest", "applicationId", "sourceHash", "submittedAt", "applicant", "qualification"]
const qualificationFields = ["state", "packetHash", "promptVersion", "packet"]
const decisionHashFields = ["contract", "schemaVersion", "schemaDigest", "applicationId", "sourceHash", "packetHash", "queueInputHash", "reviewerLabel", "decision", "note", "decidedAt", "decisionNonce"]
const decisionFields = [...decisionHashFields, "decisionHash"]

export function sha256(value) {
	const input = typeof value === "string" || value instanceof Uint8Array ? value : JSON.stringify(value)
	return createHash("sha256").update(input, "utf8").digest("hex")
}

export function minifiedJson(value) {
	return JSON.stringify(value)
}

export function isRfc3339Timestamp(value) {
	if (typeof value !== "string") return false
	const match = /^(\d{4})-(\d{2})-(\d{2})T(?:[01]\d|2[0-3]):[0-5]\d:[0-5]\d(?:\.\d+)?(?:Z|[+-](?:[01]\d|2[0-3]):[0-5]\d)$/.exec(value)
	if (!match) return false
	const year = Number(match[1])
	const month = Number(match[2])
	const day = Number(match[3])
	if (year < 1 || month < 1 || month > 12) return false
	const leapYear = year % 4 === 0 && (year % 100 !== 0 || year % 400 === 0)
	const daysInMonth = [31, leapYear ? 29 : 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31][month - 1]
	return day >= 1 && day <= daysInMonth && !Number.isNaN(Date.parse(value))
}

export function normalizeText(value) {
	if (value === undefined || value === null) return ""
	return String(value)
		.normalize("NFC")
		.replace(/\r\n?|\n/g, "\n")
		.trim()
		.replace(/[\s\u00a0]+/gu, " ")
}

function canonicalizeWebsite(value) {
	if (!RAW_WEBSITE_AUTHORITY_PATTERN.test(value)) return value
	try {
		const url = new URL(value)
		if (url.hostname.endsWith(".")) url.hostname = url.hostname.slice(0, -1)
		return url.href
	} catch {
		return value
	}
}

export function normalizeApplicant(applicant = {}) {
	return Object.fromEntries(
		applicantFields.map(field => {
			if (field === "consent") return [field, applicant[field] === true]
			const value = normalizeText(applicant[field]) || ""
			return [field, field === "workEmail" ? value.toLowerCase() : field === "website" ? canonicalizeWebsite(value) : value]
		})
	)
}

export function orderedApplicant(applicant) {
	return Object.fromEntries(applicantFields.map(field => [field, applicant[field]]))
}
export function orderedPacket(packet) {
	return packet == null ? null : Object.fromEntries(packetFields.map(field => [field, packet[field]]))
}
export function sourceHashForApplicant(applicant) {
	return sha256(minifiedJson(orderedApplicant(applicant)))
}
export function packetHashForQualification(packet) {
	return packet == null ? "" : sha256(minifiedJson(orderedPacket(packet)))
}
export function queueInputHashFor({applicationId, sourceHash, packetHash, schemaVersion = SCHEMA_VERSION, state = "fit-review", artifactHash = "", contextHash = "", evidenceHash = "", revision = 0}) {
	const input = {applicationId, sourceHash, packetHash, schemaVersion, state}
	if (artifactHash) input.artifactHash = artifactHash
	if (contextHash) input.contextHash = contextHash
	if (evidenceHash) input.evidenceHash = evidenceHash
	if (revision) input.revision = revision
	return sha256(minifiedJson(input))
}
export function decisionHashFor(decision) {
	return sha256(minifiedJson(Object.fromEntries(decisionHashFields.map(field => [field, decision[field]]))))
}

export function schemaDigest(repoRoot = process.cwd(), kind = "application") {
	const path = String(repoRoot).endsWith(".schema.json") ? repoRoot : join(repoRoot, kind === "decision" ? DECISION_SCHEMA_PATH : APPLICATION_SCHEMA_PATH)
	return sha256(readFileSync(path))
}

function assert(condition, message) {
	if (!condition) throw new Error(message)
}
export function isUuid(value) {
	return typeof value === "string" && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value)
}
function isHash(value, optional = false) {
	return typeof value === "string" && ((optional && value === "") || /^[a-f0-9]{64}$/.test(value))
}
function checkString(value, name, min = 0, max = Infinity) {
	assert(typeof value === "string", `${name} must be a string`)
	assert(value.length >= min, `${name} is too short`)
	assert(value.length <= max, `${name} is too long`)
}
export function validateAffirmativePaymentEvidence(value) {
	checkString(value, "Day 0 paymentEvidence", 2, 1200)
	const match = /^(?:paid|received|settled|captured|completed):\s*(\S(?:.*\S)?)$/i.exec(value)
	assert(match, "Day 0 paymentEvidence must use an affirmative status and typed provider reference, for example 'paid: invoice INV-123'")
	const reference = match[1]
	const typedReference = /^(?:invoice|receipt|transaction|txn|transfer|bank|wire|upi|stripe|razorpay|paypal|wise|dodo|cash-receipt)[\s:#/_-]+([a-z0-9][a-z0-9._:/#-]{2,127})$/i.exec(reference)
	assert(typedReference, "Day 0 paymentEvidence must include a typed provider reference and identifier, for example 'paid: invoice INV-123'")
	const identifier = typedReference[1]
	const negativeStatusToken =
		/(?:^|[._:/#-])(?:pending|unpaid|fail(?:ed|ure)?|declin(?:ed)?|cancel(?:led|ed)?|await(?:ing)?|overdue|unknown|refund(?:ed)?|revers(?:ed|al)?|void(?:ed)?|chargeback|disput(?:ed|e)?|not(?:paid|received|settled|captured|completed)|never(?:paid|received|settled|captured|completed)|no(?:payment|receipt|settlement)|payment(?:missing|absent)|tbd|todo)(?=$|[._:/#-]|\d)/i
	const splitNegativeStatusToken =
		/(?:^|[._:/#-])(?:un[._:/#-]*paid|pend[._:/#-]*ing|charge[._:/#-]*back|dis[._:/#-]*puted|re[._:/#-]*funded|not[._:/#-]*(?:paid|received|settled|captured|completed)|never[._:/#-]*(?:paid|received|settled|captured|completed)|no[._:/#-]*(?:payment|receipt|settlement)|payment[._:/#-]*(?:missing|absent))(?=$|[._:/#-]|\d)/i
	const concatenatedNegativeStatus =
		/(?:pending|unpaid|failed|failure|declined|cancelled|canceled|awaiting|overdue|unknown|refunded|reversed|chargeback|disputed|not(?:paid|received|settled|captured|completed)|never(?:paid|received|settled|captured|completed)|no(?:payment|receipt|settlement)|payment(?:missing|absent))/i
	assert(!negativeStatusToken.test(identifier) && !splitNegativeStatusToken.test(identifier) && !concatenatedNegativeStatus.test(identifier), "Day 0 paymentEvidence reference must not contain a pending, unpaid, failed, refunded, disputed, or ambiguous status")
	return value
}
function assertExactKeys(value, expected, name) {
	assert(value && typeof value === "object" && !Array.isArray(value), `${name} must be an object`)
	const actual = Object.keys(value).sort()
	const wanted = [...expected].sort()
	assert(actual.length === wanted.length && actual.every((key, index) => key === wanted[index]), `${name} has unexpected or missing fields`)
}
function checkStringArray(value, name, maxItems, maxLength) {
	assert(Array.isArray(value), `${name} must be an array`)
	assert(value.length <= maxItems, `${name} has too many items`)
	value.forEach((item, index) => checkString(item, `${name}[${index}]`, 0, maxLength))
}
function isHttpUrl(value) {
	try {
		if (!RAW_WEBSITE_AUTHORITY_PATTERN.test(value)) return false
		const canonical = canonicalizeWebsite(value)
		if (canonical !== value) return false
		const url = new URL(canonical)
		if (!new RegExp(APPLICATION_WEBSITE_PATTERN_SOURCE).test(url.href)) return false
		return (url.protocol === "http:" || url.protocol === "https:") && Boolean(url.hostname) && !url.username && !url.password
	} catch {
		return false
	}
}

export function validateApplication(application, {repoRoot = process.cwd(), normalize = false} = {}) {
	assertExactKeys(application, applicationFields, "application")
	assert(application.contract === APPLICATION_CONTRACT, "invalid application contract")
	assert(application.schemaVersion === SCHEMA_VERSION, "unsupported application schema version")
	assert(application.schemaDigest === schemaDigest(repoRoot, "application"), "application schema digest mismatch")
	assert(isUuid(application.applicationId), "invalid applicationId")
	assert(isHash(application.sourceHash), "invalid sourceHash")
	assert(isRfc3339Timestamp(application.submittedAt), "invalid submittedAt")
	assertExactKeys(application.applicant, applicantFields, "applicant")
	const applicant = normalize ? normalizeApplicant(application.applicant) : application.applicant
	checkString(applicant.name, "applicant.name", 2, 120)
	checkString(applicant.workEmail, "applicant.workEmail", 1, 254)
	checkString(applicant.company, "applicant.company", 2, 160)
	checkString(applicant.website, "applicant.website", 1, 500)
	checkString(applicant.companyType, "applicant.companyType", 1, 80)
	checkString(applicant.targetBuyer, "applicant.targetBuyer", 10, 800)
	checkString(applicant.primaryOffer, "applicant.primaryOffer", 10, 800)
	checkString(applicant.mainLeadSource, "applicant.mainLeadSource", 2, 400)
	checkString(applicant.suspectedLeak, "applicant.suspectedLeak", 10, 1200)
	checkString(applicant.desiredOutcome, "applicant.desiredOutcome", 10, 800)
	checkString(applicant.implementationAbility, "applicant.implementationAbility", 2, 500)
	assert(applicant.consent === true, "applicant.consent must be true")
	assert(/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(applicant.workEmail), "invalid applicant.workEmail")
	assert(isHttpUrl(applicant.website), "invalid applicant.website")
	assert(["managed-it", "msp", "cybersecurity", "hybrid", "other"].includes(applicant.companyType), "invalid applicant.companyType")
	const qualification = application.qualification
	assertExactKeys(qualification, qualificationFields, "qualification")
	assert(["pending", "ready", "failed"].includes(qualification.state), "invalid qualification.state")
	checkString(qualification.promptVersion, "qualification.promptVersion", 0, 80)
	assert(isHash(qualification.packetHash, true), "invalid qualification.packetHash")
	if (qualification.packet === null) {
		assert(qualification.packetHash === "", "null packet must have empty packetHash")
		assert(qualification.state !== "ready", "ready qualification requires a packet")
	} else {
		assertExactKeys(qualification.packet, packetFields, "qualification.packet")
		assert(qualification.state === "ready", "qualification packet requires ready state")
		assert(["strong", "possible", "poor", "unknown"].includes(qualification.packet.fitStatus), "invalid fitStatus")
		checkStringArray(qualification.packet.fitReasons, "packet.fitReasons", 5, 300)
		checkStringArray(qualification.packet.missingInformation, "packet.missingInformation", 8, 300)
		checkStringArray(qualification.packet.riskFlags, "packet.riskFlags", 8, 300)
		checkString(qualification.packet.leakHypothesis, "packet.leakHypothesis", 0, 800)
		checkString(qualification.packet.recommendedNextStep, "packet.recommendedNextStep", 0, 500)
		assert(qualification.packetHash === packetHashForQualification(qualification.packet), "qualification packet hash mismatch")
	}
	assert(application.sourceHash === sourceHashForApplicant(applicant), "application source hash mismatch")
	return {...application, applicant}
}

export function validateDecision(decision, {repoRoot = process.cwd(), expected = {}} = {}) {
	assertExactKeys(decision, decisionFields, "decision")
	assert(decision.contract === DECISION_CONTRACT, "invalid decision contract")
	assert(decision.schemaVersion === SCHEMA_VERSION, "unsupported decision schema version")
	assert(decision.schemaDigest === schemaDigest(repoRoot, "decision"), "decision schema digest mismatch")
	assert(isUuid(decision.applicationId), "invalid decision applicationId")
	for (const field of ["sourceHash", "queueInputHash"]) assert(isHash(decision[field]), `invalid decision ${field}`)
	assert(isHash(decision.packetHash, true), "invalid decision packetHash")
	checkString(decision.reviewerLabel, "reviewerLabel", 2, 120)
	assert(DECISIONS.includes(decision.decision), "invalid decision value")
	checkString(decision.note, "note", 3, 1200)
	assert(isRfc3339Timestamp(decision.decidedAt), "invalid decidedAt")
	assert(isUuid(decision.decisionNonce), "invalid decisionNonce")
	assert(isHash(decision.decisionHash), "invalid decisionHash")
	assert(decision.decisionHash === decisionHashFor(decision), "decision hash mismatch")
	for (const field of ["applicationId", "sourceHash", "packetHash", "queueInputHash"]) if (expected[field] !== undefined) assert(decision[field] === expected[field], `decision ${field} mismatch`)
	return decision
}

export function readJson(path) {
	return JSON.parse(readFileSync(path, "utf8"))
}
export function resolveRepoPath(repoRoot, target) {
	const root = resolve(repoRoot)
	const resolved = resolve(root, target)
	const rel = relative(root, resolved)
	assert(rel === "" || (!rel.startsWith("..") && !isAbsolute(rel)), "path escapes repository")
	const realRoot = realpathSync(root)
	let existing = resolved
	while (!existsSync(existing)) {
		const parent = dirname(existing)
		assert(parent !== existing, "path has no existing repository parent")
		existing = parent
	}
	const realExisting = realpathSync(existing)
	const realRel = relative(realRoot, realExisting)
	assert(realRel === "" || (!realRel.startsWith("..") && !isAbsolute(realRel)), "path escapes repository through a symlink")
	return resolved
}
export function ensureDir(path) {
	mkdirSync(path, {recursive: true, mode: PRIVATE_DIR_MODE})
	chmodSync(path, PRIVATE_DIR_MODE)
	return path
}
export function atomicWrite(path, content, {dryRun = false} = {}) {
	if (dryRun) return false
	ensureDir(dirname(path))
	const temp = `${path}.tmp-${process.pid}-${randomUUID()}`
	writeFileSync(temp, content, {encoding: "utf8", mode: PRIVATE_FILE_MODE, flag: "wx"})
	renameSync(temp, path)
	chmodSync(path, PRIVATE_FILE_MODE)
	return true
}
export function atomicWriteJson(path, value, options = {}) {
	return atomicWrite(path, `${JSON.stringify(value, null, 2)}\n`, options)
}
function lockOwner(path) {
	try {
		const raw = readFileSync(join(path, "owner"), "utf8").trim()
		if (/^\d+$/.test(raw)) return {pid: Number(raw), token: ""}
		const owner = JSON.parse(raw)
		return {pid: Number(owner.pid), token: typeof owner.token === "string" ? owner.token : ""}
	} catch {
		return {pid: 0, token: ""}
	}
}

function processIsAlive(pid) {
	if (!Number.isSafeInteger(pid) || pid <= 0) return null
	try {
		process.kill(pid, 0)
		return true
	} catch (error) {
		return error?.code === "ESRCH" ? false : true
	}
}

function lockAgeMs(path) {
	try {
		return Date.now() - statSync(path).mtimeMs
	} catch {
		return 0
	}
}

function releaseOwnedLock(path, token) {
	const owner = lockOwner(path)
	if (owner.token !== token || owner.pid !== process.pid) return
	try {
		unlinkSync(join(path, "owner"))
	} catch {}
	try {
		rmdirSync(path)
	} catch {}
}

function claimOwner(path) {
	try {
		const raw = readFileSync(path, "utf8").trim()
		const owner = JSON.parse(raw)
		return {pid: Number(owner.pid), token: typeof owner.token === "string" ? owner.token : ""}
	} catch {
		return {pid: 0, token: ""}
	}
}

function releaseClaim(path, token) {
	const owner = claimOwner(path)
	if (owner.token !== token || owner.pid !== process.pid) return
	try {
		unlinkSync(path)
	} catch {}
}

function acquireRecoveryCoordinator(path, staleAfterMs) {
	const token = randomUUID()
	const ownerJson = `${JSON.stringify({pid: process.pid, token, createdAt: new Date().toISOString()})}\n`
	// The claim is created atomically with O_EXCL. Unlike the lock directory
	// (mkdir followed by an owner write), there is no half-made state a
	// contender can be descheduled inside for long: the file either does not
	// exist or exists complete. A recoverer can only take over a claim whose
	// owner is dead or whose content is missing/old.
	//
	// Takeover is a rename, never an unlink. An unlink is unconditional: once
	// a recoverer has decided a claim is stale, its unlink deletes whatever
	// the claim path currently names. Between that staleness read and the
	// unlink, a competing recoverer can remove the stale claim and create its
	// own fresh claim, and the first recoverer's late unlink destroys that
	// live claim - both recoverers then believe they hold the coordinator and
	// both enter the lock critical section, which lets several contenders
	// take the same lock. rename removes the inode at the claim path exactly
	// once: a second recoverer's rename fails with ENOENT, so at most one
	// recoverer can displace any given claim.
	//
	// The displaced claim is inspected before it is discarded. If it actually
	// names a live owner (the staleness read raced with the claim's creation
	// or another recoverer displaced it first), it is restored with a hard
	// link - linkSync fails with EEXIST if the claim path was re-occupied in
	// the meantime, so a restore can never clobber a newer claim - and the
	// recoverer backs off instead of breaking the owner's mutual exclusion.
	const create = () => writeFileSync(path, ownerJson, {flag: "wx"})
	try {
		create()
	} catch (error) {
		if (error?.code !== "EEXIST") return null
		const owner = claimOwner(path)
		const recoveryStaleAfterMs = Math.max(staleAfterMs, 1000)
		if (processIsAlive(owner.pid) === true || lockAgeMs(path) < recoveryStaleAfterMs) return null
		const displacedPath = `${path}.displaced-${process.pid}-${token}`
		try {
			renameSync(path, displacedPath)
		} catch {
			return null
		}
		const displaced = claimOwner(displacedPath)
		if (processIsAlive(displaced.pid) === true) {
			// We displaced a claim whose owner is alive: restore it so its
			// holder keeps the coordinator, and back off. If a new claim
			// appeared at path in the meantime the restore fails harmlessly
			// and the displaced claim is orphaned - it never names us, so we
			// never act on it, and its holder notices at its own re-verify.
			try {
				linkSync(displacedPath, path)
				unlinkSync(displacedPath)
			} catch {}
			return null
		}
		try {
			rmSync(displacedPath, {force: true})
			create()
		} catch {
			return null
		}
	}
	// Verify the claim still names this process before entering the critical
	// section. If a recoverer displaced our claim and recreated it, the claim
	// file now belongs to someone else: back off instead of holding the
	// coordinator alongside them.
	const owner = claimOwner(path)
	if (owner.pid !== process.pid || owner.token !== token) return null
	// owns() lets the critical section re-verify the claim before it commits.
	// A contender whose claim was displaced mid-critical-section must not
	// hand the lock to its caller: another contender holds the coordinator
	// right now and its lock operations are not mutually exclusive with ours.
	return {
		release: () => releaseClaim(path, token),
		owns: () => {
			const current = claimOwner(path)
			return current.pid === process.pid && current.token === token
		}
	}
}

export function acquireLock(path, {staleAfterMs = 5 * 60 * 1000} = {}) {
	const token = randomUUID()
	const create = () => {
		mkdirSync(dirname(path), {recursive: true})
		mkdirSync(path, {recursive: false})
		writeFileSync(join(path, "owner"), `${JSON.stringify({pid: process.pid, token, createdAt: new Date().toISOString()})}\n`)
	}

	try {
		mkdirSync(dirname(path), {recursive: true})
	} catch (error) {
		throw new Error(`service queue lock failed: ${path}`)
	}
	// Every acquisition is serialized through the recovery coordinator. The
	// mkdir + owner-write pair in create() is not atomic: if one contender may
	// create the lock directory while another contender is recovering it, the
	// recoverer can rename the fresh directory away and the creator's late
	// owner write lands in the recoverer's replacement directory, so both
	// contenders believe they hold the same lock. Holding the coordinator for
	// the whole create/verify sequence makes the pair mutually exclusive. The
	// coordinator itself is an atomic O_EXCL claim file, so the coordinator
	// can never be held by two contenders at once.
	//
	// The coordinator claim is re-verified after the lock is created. The
	// takeover is single-winner, but a recoverer whose staleness read raced
	// with the claim's creation can still briefly displace a live claim (and
	// restore it, or lose the restore to a newer claim). A contender whose
	// claim is gone at commit time may be sharing the critical section with
	// the new coordinator holder, so it backs off instead of returning the
	// lock - and removes its own lock directory if it is still the one at the
	// lock path, so the queue does not stay locked behind a holder that
	// already gave up.
	const recoveryPath = `${path}.recovery`
	const recovery = acquireRecoveryCoordinator(recoveryPath, staleAfterMs)
	if (!recovery) throw new Error(`service queue is locked: ${path}`)
	try {
		try {
			create()
		} catch (error) {
			if (error?.code !== "EEXIST") throw new Error(`service queue lock failed: ${path}`)
			const owner = lockOwner(path)
			if (processIsAlive(owner.pid) === true || lockAgeMs(path) < staleAfterMs) throw new Error(`service queue is locked: ${path}`)
			const stalePath = `${path}.stale-${process.pid}-${token}`
			renameSync(path, stalePath)
			rmSync(stalePath, {recursive: true, force: true})
			create()
		}
		const owner = lockOwner(path)
		if (owner.pid !== process.pid || owner.token !== token) throw new Error(`service queue is locked: ${path}`)
		if (!recovery.owns()) {
			releaseOwnedLock(path, token)
			throw new Error(`service queue is locked: ${path}`)
		}
	} catch (error) {
		const message = String(error?.message || "")
		if (message.startsWith("service queue is locked:") || message.startsWith("service queue lock failed:")) throw error
		throw new Error(`service queue is locked: ${path}`)
	} finally {
		recovery.release()
	}

	return () => releaseOwnedLock(path, token)
}

export function newNonce() {
	return randomUUID()
}

export function assertCliArguments(args, {options = [], positionalCount = 1} = {}) {
	const allowed = new Set(options)
	const positionals = []
	for (let index = 0; index < args.length; index += 1) {
		const argument = args[index]
		if (!argument.startsWith("--")) {
			positionals.push(argument)
			continue
		}
		const option = argument.slice(2)
		assert(allowed.has(option), `unknown option: ${argument}`)
		assert(index + 1 < args.length && !args[index + 1].startsWith("--"), `${argument} requires a value`)
		index += 1
	}
	assert(positionals.length <= positionalCount, `expected at most ${positionalCount} positional argument${positionalCount === 1 ? "" : "s"}`)
	return positionals
}

export const canonicalSourceHash = sourceHashForApplicant
export const canonicalPacketHash = packetHashForQualification
export const canonicalQueueInputHash = queueInputHashFor
export const canonicalDecisionHash = decisionHashFor
export const normaliseApplicant = normalizeApplicant
export const validateReviewDecision = validateDecision
export const validateSprintApplication = validateApplication
