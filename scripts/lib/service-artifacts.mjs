import {existsSync, lstatSync, readdirSync} from "node:fs"
import {join, relative} from "node:path"
import {NO_GUARANTEE_DISCLAIMER, SERVICE_STATES, isUuid, isRfc3339Timestamp, minifiedJson, readJson, resolveRepoPath, sha256, validateAffirmativePaymentEvidence} from "./service-contract.mjs"
import {assertFounderPilotRecord} from "./client-scaffold.mjs"
import {isValidLoomUrl} from "./loom-url.mjs"
import {addBusinessDaysToTimestamp, addBusinessMillisecondsToTimestamp, businessMillisecondsBetween, isIsoCalendarDate, timestampIsOnOrBeforeLocalDate} from "../date-utils.mjs"

export const WORK_PACKET_VERSION = 5
export const AGENT_WORK_CONTRACT = "tinystudio.agent-work-output"
export const STAGE_EVIDENCE_CONTRACT = "tinystudio.service-stage-evidence"
export const CLAIMS_POLICY_VERSION = 1

export const AGENT_WORK_STATES = new Set(["day0-ready", "delivery-draft"])
export const REVIEW_STATES = new Set(["client-approved", "implementation", "tracking-14-day"])
export const ACTIVE_SPRINT_STATES = new Set([...AGENT_WORK_STATES, ...REVIEW_STATES])
export const PAUSABLE_STATES = new Set(["approved-awaiting-day0", ...ACTIVE_SPRINT_STATES])
const CONTEXT_KINDS = new Set(["request", "response", "pause-resolution", "scope-authorization"])
const DELIVERABLE_FIELDS = ["leakMap", "pageFix", "searchTrust", "proof", "loom", "measurement", "implementation", "revisionBoundary", "tracking"]
const FORBIDDEN_OUTCOME_TERM = "(?:revenue|rankings?|roas|conversions?|conversion\\s+(?:rate|lift)|booked\\s+calls?|sales\\s+volume)"
const CHANGE_LINK_ADVERB = "(?:directly|definitely|certainly|surely|reliably|measurably|materially|significantly|consistently|inevitably)"
const OUTCOME_CHANGE_VERB = `(?:increase|improve|raise|rise|grow|deliver|generate|double|triple|boost|lift|drive|produce|bring|give|yield|get|see|achieve|receive|secure|earn|make|create|result(?:\\s+${CHANGE_LINK_ADVERB})?\\s+in|lead(?:\\s+${CHANGE_LINK_ADVERB})?\\s+to)`
const CERTAINTY_ADVERB = "(?:(?:directly|definitely|certainly|surely|reliably|measurably|materially|significantly|consistently|inevitably)\\s+)?"
const CONTRAST_BOUNDARY = "(?:and|but|however|yet|although|though|while|whereas|still|nevertheless|nonetheless)"
const EXPLICIT_OUTCOME_GUARANTEE_PATTERNS = [
	new RegExp(`\\b(?:guarantee(?:d|s)?|promise(?:d|s)?|assur(?:e[ds]?|ance)|ensure(?:d|s)?)\\b[^.!?\\n]{0,80}\\b${FORBIDDEN_OUTCOME_TERM}\\b`, "i"),
	new RegExp(`\\b${FORBIDDEN_OUTCOME_TERM}\\b[^.!?\\n]{0,80}\\b(?:guaranteed|promised|assured|certain)\\b`, "i")
]
const OUTCOME_CHANGE_GUARANTEE_PATTERNS = [
	new RegExp(`\\bwill\\s+${CERTAINTY_ADVERB}${OUTCOME_CHANGE_VERB}\\b[^.!?\\n]{0,80}\\b${FORBIDDEN_OUTCOME_TERM}\\b`, "i"),
	new RegExp(`\\b${FORBIDDEN_OUTCOME_TERM}\\b[^.!?\\n]{0,80}\\bwill\\s+${CERTAINTY_ADVERB}${OUTCOME_CHANGE_VERB}\\b`, "i"),
	new RegExp(`\\b(?:is|are|was|were|be)\\s+(?:certain|sure|guaranteed|promised|assured)\\s+to\\s+${OUTCOME_CHANGE_VERB}\\b[^.!?\\n]{0,80}\\b${FORBIDDEN_OUTCOME_TERM}\\b`, "i")
]
const FORBIDDEN_GUARANTEE_PATTERNS = [...EXPLICIT_OUTCOME_GUARANTEE_PATTERNS, ...OUTCOME_CHANGE_GUARANTEE_PATTERNS]
const OPERATIONAL_OUTCOME_PROMISE_PATTERN = new RegExp(
	`\\b(?:guarantee(?:d|s)?|promise(?:d|s)?|assur(?:e[ds]?|ance)|ensure(?:d|s)?)\\b\\s+(?:(?:to\\s+)|(?:(?:that\\s+)?(?:we|you|they|(?:our|the)\\s+team)\\s+(?:will\\s+)?))?(?:report|track|measure|monitor|record|attribute|instrument|analy[sz]e)\\b(?:(?!\\b(?:guarantee(?:d|s)?|promise(?:d|s)?|assur(?:e[ds]?|ance)|ensure(?:d|s)?)\\b)[^.!?\\n]){0,40}?\\b${FORBIDDEN_OUTCOME_TERM}\\b`,
	"gi"
)
const CATEGORICAL_OUTCOME_CHANGE_VERB = `(?:increas(?:e|es|ed|ing)|improv(?:e|es|ed|ing)|rais(?:e|es|ed|ing)|ris(?:e|es|en|ing)|grow(?:s|n|ing)?|deliver(?:s|ed|ing)?|generat(?:e|es|ed|ing)|double(?:s|d)?|doubling|triple(?:s|d)?|tripling|boost(?:s|ed|ing)?|lift(?:s|ed|ing)?|driv(?:e|es|en|ing)|produc(?:e|es|ed|ing)|yield(?:s|ed|ing)?|mak(?:e|es|ing)|made|creat(?:e|es|ed|ing)|result(?:s|ed|ing)?(?:\\s+${CHANGE_LINK_ADVERB})?\\s+in|(?:lead(?:s|ing)?|led)(?:\\s+${CHANGE_LINK_ADVERB})?\\s+to)`
const CATEGORICAL_NEGATION = "(?:(?:do(?:es)?|did|will|can|could|would|should|is|are|was|were|has|have|had)\\s+(?:not|never)|do(?:es)?n't|didn't|won't|can't|couldn't|wouldn't|shouldn't|isn't|aren't|wasn't|weren't|hasn't|haven't|hadn't|cannot|not|never)"
const NEGATED_CATEGORICAL_OUTCOME_PATTERNS = [
	new RegExp(`\\b${CATEGORICAL_NEGATION}\\s+${CATEGORICAL_OUTCOME_CHANGE_VERB}\\b(?:(?!\\b${CONTRAST_BOUNDARY}\\b)[^.!?;\\n]){0,80}?\\b${FORBIDDEN_OUTCOME_TERM}\\b`, "gi"),
	new RegExp(`\\b${FORBIDDEN_OUTCOME_TERM}\\b(?:(?!\\b${CONTRAST_BOUNDARY}\\b)[^.!?;\\n]){0,80}?\\b${CATEGORICAL_NEGATION}\\s+${CATEGORICAL_OUTCOME_CHANGE_VERB}\\b`, "gi")
]
const NON_MODAL_OUTCOME_CHANGE_PATTERNS = [
	new RegExp(`\\b${CATEGORICAL_OUTCOME_CHANGE_VERB}\\b[^.!?\\n]{0,80}\\b${FORBIDDEN_OUTCOME_TERM}\\b`, "i"),
	new RegExp(`\\b${FORBIDDEN_OUTCOME_TERM}\\b[^.!?\\n]{0,80}\\b${CATEGORICAL_OUTCOME_CHANGE_VERB}\\b`, "i")
]
const NEGATED_GUARANTEE_CLAUSE_PATTERN = new RegExp(`\\b(?:(?:do(?:es)?|did|will|can)\\s+not|do(?:es)?n't|didn't|can't|won't|cannot|never)\\s+(?:guarantee|promise|assure)\\b(?:(?!\\b${CONTRAST_BOUNDARY}\\b)[^,:.!?;\\n])*`, "gi")
const NEITHER_GUARANTEE_CLAUSE_PATTERN = /\bneither [^,:.!?;\n]{1,80}\bnor\b[^,:.!?;\n]{1,80}\b(?:is|are|was|were)\s+guaranteed\b/gi
const GUARANTEE_NOUN = "(?:guarantees?|promises?|assurances?)"
const GUARANTEE_SCOPE = `(?:${FORBIDDEN_OUTCOME_TERM}|outcomes?)`
const NO_GUARANTEE_CLAUSE_PATTERN = new RegExp(`\\b(?:no\\s+(?:${GUARANTEE_SCOPE}\\s+)?${GUARANTEE_NOUN}|without\\s+(?:any\\s+)?(?:${GUARANTEE_SCOPE}\\s+)?${GUARANTEE_NOUN})\\b(?:\\s+(?:of|for)\\s+${GUARANTEE_SCOPE})?(?:\\s+(?:is|are|was|were)\\s+made)?`, "gi")
// "No revenue, ranking, ROAS, conversion, booked-call, or sales-volume guarantees are made." — comma-separated denial lists with hyphenated scope terms.
const LISTED_GUARANTEE_SCOPE_ITEM = "(?:revenue|rankings?|roas|conversions?|conversion[- ](?:rate|lift)|booked[- ]calls?|sales[- ]volume)"
const LISTED_NO_GUARANTEE_CLAUSE_PATTERN = new RegExp(
	`\\b(?:there\\s+are\\s+)?no\\s+${LISTED_GUARANTEE_SCOPE_ITEM}(?:\\s*,\\s*(?:(?:and|or)\\s+)?${LISTED_GUARANTEE_SCOPE_ITEM})*(?:\\s+(?:and|or)\\s+${LISTED_GUARANTEE_SCOPE_ITEM})?\\s+${GUARANTEE_NOUN}\\b(?:\\s+(?:is|are|was|were)\\s+made)?`,
	"gi"
)
const NEGATED_OUTCOME_IMPLICATION_PATTERN = new RegExp(
	`\\b(?:do(?:es)?|did|will|can|could|would|should|is|are|was|were)\\s+(?:not|never)\\s+(?:imply|mean|represent|constitute|signal|cause|create|deliver|generate|produce|drive|bring|give|yield|increase|improve|raise|grow|boost|lift|affect|alter|change|hurt|reduce|promise|guarantee|assure|ensure|result(?:\\s+${CHANGE_LINK_ADVERB})?\\s+in|lead(?:\\s+${CHANGE_LINK_ADVERB})?\\s+to)\\b(?:(?!\\b${CONTRAST_BOUNDARY}\\b)[^.!?;\\n]){0,80}?\\b${FORBIDDEN_OUTCOME_TERM}\\b(?:\\s+(?:results?|outcomes?|performance))?`,
	"gi"
)
const NEGATED_OUTCOME_COMPLEMENT_PATTERN = new RegExp(`\\bnot\\s+(?:(?:more|higher|better|improved)\\s+)?${FORBIDDEN_OUTCOME_TERM}\\b(?:\\s+(?:results?|outcomes?|performance))?`, "gi")
const OPERATIONAL_METRIC_PATTERN = /\b(?:conversion(?:\s+(?:rate|lift))?|revenue|roas|rankings?|sales(?:\s+volume)?|booked\s+calls?)\s+(?:tracking|analytics|measurement|instrumentation|baseline|reporting)\b/gi
const PLACEHOLDER_PATTERN = /\b(?:todo|tbd|lorem ipsum|fill this in|placeholder)\b/i
const TRACKING_QUERY_KEYS = new Set(["_ga", "_gl", "dclid", "fbclid", "gclid", "li_fat_id", "mc_cid", "mc_eid", "msclkid", "ttclid", "twclid"])
const DAY0_FIELDS = ["applicationId", "paymentEvidence", "requiredContext", "approvalOwner", "implementationOwner", "offerName", "offerPriceUsd", "pricingCohort", "pilotSequence", "ready", "day0StartedAt", "updatedAt", "paused", "activePause", "pauseHistory", "totalPausedMs", "deadlineAt", "resumeState"]
export function assert(condition, message) {
	if (!condition) throw new Error(message)
}
export function servicePath(repoRoot, path) {
	return resolveRepoPath(repoRoot, path)
}
export function readOptionalJson(path) {
	return existsSync(path) ? readJson(path) : null
}
function entryStat(path) {
	try {
		return lstatSync(path)
	} catch (error) {
		if (error?.code === "ENOENT") return null
		throw error
	}
}
export const isIso = isRfc3339Timestamp
export function isHash(value) {
	return typeof value === "string" && /^[a-f0-9]{64}$/.test(value)
}
export function serviceDeadlineAt(day0StartedAt, pauseHistory = []) {
	const pausedBusinessMs = pauseHistory.reduce((total, pause) => total + businessMillisecondsBetween(pause.startedAt, pause.endedAt), 0)
	return addBusinessMillisecondsToTimestamp(addBusinessDaysToTimestamp(day0StartedAt, 7), pausedBusinessMs)
}
export function assertExactKeys(value, expected, name) {
	assert(value && typeof value === "object" && !Array.isArray(value), `${name} must be an object`)
	const actual = Object.keys(value).sort()
	const wanted = [...expected].sort()
	assert(actual.length === wanted.length && actual.every((key, index) => key === wanted[index]), `${name} has unexpected or missing fields`)
}
export function checkString(value, name, min = 0, max = Infinity) {
	assert(typeof value === "string", `${name} must be a string`)
	assert(value.length >= min, `${name} is too short`)
	assert(value.length <= max, `${name} is too long`)
}
function checkStringList(value, name, maxItems, maxLength) {
	assert(Array.isArray(value), `${name} must be an array`)
	assert(value.length <= maxItems, `${name} has too many items`)
	value.forEach((item, index) => checkString(item, `${name}[${index}]`, 1, maxLength))
}
function checkNonPlaceholderString(value, name, min = 0, max = Infinity) {
	checkString(value, name, min, max)
	assert(!PLACEHOLDER_PATTERN.test(value), `${name} contains placeholder text`)
}
function checkNonPlaceholderFields(value, name, fields) {
	for (let index = 0; index < fields.length; index += 3) checkNonPlaceholderString(value[fields[index]], `${name}.${fields[index]}`, fields[index + 1], fields[index + 2])
}
function checkHttpUrl(value, name) {
	checkString(value, name, 8, 2000)
	let parsed
	try {
		parsed = new URL(value)
	} catch {
		throw new Error(`${name} must be an HTTP(S) URL`)
	}
	assert(["http:", "https:"].includes(parsed.protocol), `${name} must be an HTTP(S) URL`)
	assert(!parsed.username && !parsed.password, `${name} must not contain URL credentials`)
	return parsed
}
function canonicalPageIdentity(value, name) {
	const parsed = checkHttpUrl(value, name)
	assert(!parsed.username && !parsed.password, `${name} must not contain URL credentials`)
	const pathname = parsed.pathname.replace(/\/+$/, "") || "/"
	const routeEntries = [...parsed.searchParams.entries()]
		.filter(([key]) => !/^utm_/i.test(key) && !TRACKING_QUERY_KEYS.has(key.toLowerCase()))
		.sort(([leftKey, leftValue], [rightKey, rightValue]) => {
			if (leftKey !== rightKey) return leftKey < rightKey ? -1 : 1
			if (leftValue === rightValue) return 0
			return leftValue < rightValue ? -1 : 1
		})
	const routeQuery = new URLSearchParams(routeEntries).toString()
	const hashRoute = /^#(?:!\/|\/)/.test(parsed.hash) ? parsed.hash : ""
	return `${parsed.protocol}//${parsed.host.toLowerCase()}${pathname}${routeQuery ? `?${routeQuery}` : ""}${hashRoute}`
}

function canonicalEvidenceIdentity(value, name) {
	const parsed = checkHttpUrl(value, name)
	assert(!parsed.username && !parsed.password, `${name} must not contain URL credentials`)
	parsed.hash = ""
	for (const key of [...parsed.searchParams.keys()]) {
		if (/^utm_/i.test(key) || TRACKING_QUERY_KEYS.has(key.toLowerCase())) parsed.searchParams.delete(key)
	}
	parsed.searchParams.sort()
	parsed.pathname = parsed.pathname.replace(/\/+$/, "") || "/"
	return parsed.toString()
}

function canonicalApprovedPageUrl(approvedArtifact) {
	assert(approvedArtifact && typeof approvedArtifact === "object" && !Array.isArray(approvedArtifact), "approved delivery artifact is required")
	const deliverables = approvedArtifact.deliverables
	assert(deliverables && typeof deliverables === "object" && !Array.isArray(deliverables), "approved delivery artifact deliverables are missing")
	const selectedPageUrl = deliverables.leakMap?.selectedPageUrl
	const pageFixUrl = deliverables.pageFix?.pageUrl
	checkHttpUrl(selectedPageUrl, "approved delivery selected page URL")
	checkHttpUrl(pageFixUrl, "approved delivery page-fix URL")
	assert(canonicalPageIdentity(selectedPageUrl, "approved delivery selected page URL") === canonicalPageIdentity(pageFixUrl, "approved delivery page-fix URL"), "approved delivery selected page and page-fix URLs do not match")
	return canonicalPageIdentity(selectedPageUrl, "approved delivery selected page URL")
}

function checkedPauseIntervals(pauseHistory, activePause, notBefore, name) {
	assert(Array.isArray(pauseHistory), `${name} pauseHistory must be an array`)
	let last = notBefore
	let total = 0
	const intervals = pauseHistory.map((pause, index) => {
		const label = `${name} pauseHistory[${index}]`
		assertExactKeys(pause, ["reason", "startedAt", "endedAt", "durationMs"], label)
		checkString(pause.reason, `${label}.reason`, 3, 500)
		assert(isIso(pause.startedAt) && isIso(pause.endedAt), `${label} timestamps are invalid`)
		const interval = {start: Date.parse(pause.startedAt), end: Date.parse(pause.endedAt)}
		assert(interval.start >= last, `${label} overlaps or predates an earlier pause`)
		assert(interval.end > interval.start && pause.durationMs === interval.end - interval.start, `${label} duration mismatch`)
		last = interval.end
		total += pause.durationMs
		return interval
	})
	if (activePause !== null) {
		assertExactKeys(activePause, ["reason", "startedAt"], `${name} activePause`)
		checkString(activePause.reason, `${name} activePause.reason`, 3, 500)
		assert(isIso(activePause.startedAt), `${name} activePause.startedAt is invalid`)
		const start = Date.parse(activePause.startedAt)
		assert(start >= last, `${name} active pause overlaps or predates an earlier pause`)
		intervals.push({start, end: Infinity})
	}
	return {intervals, total}
}

function activeTrackingMilliseconds(anchorAt, throughAt, pauseHistory, activePause) {
	const anchor = Date.parse(anchorAt)
	const through = Date.parse(throughAt)
	const paused = checkedPauseIntervals(pauseHistory, activePause, -Infinity, "tracking").intervals.reduce((total, interval) => total + Math.max(0, Math.min(through, interval.end) - Math.max(anchor, interval.start)), 0)
	return through - anchor - paused
}
function checkActionTarget(value, name, required = false) {
	checkString(value, name, required ? 2 : 0, 2000)
	if (!value) return
	if (/^https?:\/\//i.test(value)) checkHttpUrl(value, name)
	else assert(value.startsWith("/") || value.startsWith("#"), `${name} must be an HTTP(S) URL, site path, or page anchor`)
}
function validateRequiredPageSections(sections, validateSection) {
	assert(Array.isArray(sections) && sections.length >= 5 && sections.length <= 12, "agent work page-fix artifact must contain 5-12 complete sections")
	const sectionIds = new Set()
	sections.forEach((section, index) => {
		validateSection(section, index)
		assert(!sectionIds.has(section.sectionId), `agent work page-fix artifact sectionId is duplicated: ${section.sectionId}`)
		sectionIds.add(section.sectionId)
	})
	for (const required of ["hero", "proof", "offer", "implementation", "final-cta"]) {
		assert(sectionIds.has(required), `agent work page-fix artifact is missing required section: ${required}`)
	}
}
function validatePageFixArtifact(mode, artifact) {
	assert(artifact && typeof artifact === "object" && !Array.isArray(artifact), "agent work deliverables.pageFix.artifact must be a structured complete artifact")
	if (mode === "rewrite") {
		assertExactKeys(artifact, ["kind", "titleTag", "metaDescription", "sections"], "agent work rewrite artifact")
		assert(artifact.kind === "complete-rewrite", "agent work rewrite artifact kind must be complete-rewrite")
		checkNonPlaceholderFields(artifact, "agent work rewrite", ["titleTag", 10, 65, "metaDescription", 50, 180])
		validateRequiredPageSections(artifact.sections, (section, index) => {
			assertExactKeys(section, ["sectionId", "heading", "body", "ctaLabel", "ctaTarget"], `agent work rewrite sections[${index}]`)
			assert(/^[a-z0-9][a-z0-9-]*$/.test(section.sectionId), `agent work rewrite sections[${index}].sectionId is invalid`)
			checkNonPlaceholderFields(section, `agent work rewrite sections[${index}]`, ["heading", 4, 240, "body", 60, 6000])
			const requiresAction = ["hero", "final-cta"].includes(section.sectionId)
			checkNonPlaceholderString(section.ctaLabel, `agent work rewrite sections[${index}].ctaLabel`, requiresAction ? 2 : 0, 120)
			checkActionTarget(section.ctaTarget, `agent work rewrite sections[${index}].ctaTarget`, requiresAction)
			assert(Boolean(section.ctaLabel) === Boolean(section.ctaTarget), `agent work rewrite sections[${index}] must provide both CTA label and target`)
		})
		return artifact
	}
	assertExactKeys(artifact, ["kind", "designSystemReference", "responsiveStates", "sections", "implementationNotes"], "agent work redesign artifact")
	assert(artifact.kind === "implementation-ready-redesign", "agent work redesign artifact kind must be implementation-ready-redesign")
	checkNonPlaceholderString(artifact.designSystemReference, "agent work redesign designSystemReference", 20, 2000)
	checkStringList(artifact.responsiveStates, "agent work redesign responsiveStates", 4, 40)
	assert(artifact.responsiveStates.includes("desktop") && artifact.responsiveStates.includes("mobile"), "agent work redesign artifact must include desktop and mobile states")
	validateRequiredPageSections(artifact.sections, (section, index) => {
		assertExactKeys(section, ["sectionId", "layout", "finalCopy", "assetReferences", "interaction"], `agent work redesign sections[${index}]`)
		assert(/^[a-z0-9][a-z0-9-]*$/.test(section.sectionId), `agent work redesign sections[${index}].sectionId is invalid`)
		checkNonPlaceholderFields(section, `agent work redesign sections[${index}]`, ["layout", 30, 4000, "finalCopy", 60, 6000, "interaction", 3, 1200])
		assert(Array.isArray(section.assetReferences) && section.assetReferences.length <= 10, `agent work redesign sections[${index}].assetReferences must contain 0-10 URLs`)
		section.assetReferences.forEach((url, urlIndex) => checkHttpUrl(url, `agent work redesign sections[${index}].assetReferences[${urlIndex}]`))
	})
	checkNonPlaceholderString(artifact.implementationNotes, "agent work redesign implementationNotes", 100, 8000)
	return artifact
}
function validateImplementationArtifact(route, artifact, pageFix) {
	assert(artifact && typeof artifact === "object" && !Array.isArray(artifact), "agent work deliverables.implementation.artifact must be a route-specific structured artifact")
	assertExactKeys(artifact, ["kind", "pageUrl", "pageFixHash", "changeSet", "applyInstructions", "verificationChecks"], "agent work implementation artifact")
	const expectedKind = route === "implementation-pass" ? "complete-implementation-change-set" : "developer-ready-handoff"
	assert(artifact.kind === expectedKind, `agent work implementation artifact kind must be ${expectedKind} for route ${route}`)
	assert(canonicalPageIdentity(artifact.pageUrl, "agent work implementation artifact pageUrl") === canonicalPageIdentity(pageFix.pageUrl, "agent work deliverables.pageFix.pageUrl"), "agent work implementation artifact must target the reviewed page fix")
	assert(artifact.pageFixHash === sha256(minifiedJson(pageFix.artifact)), "agent work implementation artifact pageFixHash mismatch")
	assert(Array.isArray(artifact.changeSet) && artifact.changeSet.length >= 1 && artifact.changeSet.length <= 20, "agent work implementation artifact changeSet must contain 1-20 complete changes")
	const pageSectionIds = new Set(pageFix.artifact.sections.map(section => section.sectionId))
	const coveredSectionIds = new Set()
	artifact.changeSet.forEach((change, index) => {
		assertExactKeys(change, ["target", "operation", "sourceSectionIds", "instructions", "acceptanceCheck"], `agent work implementation artifact changeSet[${index}]`)
		checkNonPlaceholderFields(change, `agent work implementation artifact changeSet[${index}]`, ["target", 3, 500, "instructions", 50, 4000, "acceptanceCheck", 30, 2000])
		assert(["add", "replace", "remove", "configure"].includes(change.operation), `agent work implementation artifact changeSet[${index}].operation is invalid`)
		checkStringList(change.sourceSectionIds, `agent work implementation artifact changeSet[${index}].sourceSectionIds`, 12, 80)
		assert(change.sourceSectionIds.length >= 1, `agent work implementation artifact changeSet[${index}].sourceSectionIds must not be empty`)
		assert(new Set(change.sourceSectionIds).size === change.sourceSectionIds.length, `agent work implementation artifact changeSet[${index}].sourceSectionIds contains duplicates`)
		change.sourceSectionIds.forEach(sectionId => {
			assert(pageSectionIds.has(sectionId), `agent work implementation artifact references unknown page section: ${sectionId}`)
			coveredSectionIds.add(sectionId)
		})
	})
	for (const sectionId of pageSectionIds) {
		assert(coveredSectionIds.has(sectionId), `agent work implementation artifact does not cover reviewed page section: ${sectionId}`)
	}
	checkNonPlaceholderString(artifact.applyInstructions, "agent work implementation artifact applyInstructions", 100, 8000)
	checkStringList(artifact.verificationChecks, "agent work implementation artifact verificationChecks", 20, 2000)
	assert(artifact.verificationChecks.length >= 3, "agent work implementation artifact verificationChecks must contain at least three checks")
	artifact.verificationChecks.forEach((check, index) => assert(!PLACEHOLDER_PATTERN.test(check), `agent work implementation artifact verificationChecks[${index}] contains placeholder text`))
	return artifact
}
function collectGuaranteeRiskFlags(value, name = "agent work output", flags = []) {
	if (typeof value === "string") {
		const statements = value.split(/(?<=[.!?;])\s+|\n+/).filter(Boolean)
		for (const statement of statements) {
			const claimText = statement
				.replace(NEGATED_GUARANTEE_CLAUSE_PATTERN, "")
				.replace(NEITHER_GUARANTEE_CLAUSE_PATTERN, "")
				.replace(NO_GUARANTEE_CLAUSE_PATTERN, "")
				.replace(LISTED_NO_GUARANTEE_CLAUSE_PATTERN, "")
				.replace(NEGATED_OUTCOME_IMPLICATION_PATTERN, "")
				.replace(NEGATED_CATEGORICAL_OUTCOME_PATTERNS[0], "")
				.replace(NEGATED_CATEGORICAL_OUTCOME_PATTERNS[1], "")
				.replace(NEGATED_OUTCOME_COMPLEMENT_PATTERN, "excluded outcome")
				.replace(OPERATIONAL_METRIC_PATTERN, "operational metric")
			const matchesGuaranteeHeuristic = FORBIDDEN_GUARANTEE_PATTERNS.some(pattern => pattern.test(claimText))
			const matchesCategoricalOutcomeChange = NON_MODAL_OUTCOME_CHANGE_PATTERNS.some(pattern => pattern.test(claimText))
			if (matchesGuaranteeHeuristic || matchesCategoricalOutcomeChange) {
				const nonOperationalClaimText = claimText.replace(OPERATIONAL_OUTCOME_PROMISE_PATTERN, "operational promise")
				const blocking =
					OUTCOME_CHANGE_GUARANTEE_PATTERNS.some(pattern => pattern.test(claimText)) ||
					matchesCategoricalOutcomeChange ||
					EXPLICIT_OUTCOME_GUARANTEE_PATTERNS.some(pattern => pattern.test(nonOperationalClaimText))
				flags.push({path: name, reason: "possible-outcome-guarantee", blocking, excerpt: statement.trim().slice(0, 240)})
			}
		}
		return flags
	}
	if (Array.isArray(value)) {
		value.forEach((entry, index) => collectGuaranteeRiskFlags(entry, `${name}[${index}]`, flags))
		return flags
	}
	if (value && typeof value === "object") {
		for (const [key, entry] of Object.entries(value)) collectGuaranteeRiskFlags(entry, `${name}.${key}`, flags)
	}
	return flags
}
export function agentWorkClaimRiskFlags(output) {
	return [...collectGuaranteeRiskFlags(output.deliverables, "deliverables"), ...collectGuaranteeRiskFlags(output.claims, "claims")]
}
export function latestIso(...values) {
	return values.filter(value => isIso(value)).sort((a, b) => Date.parse(b) - Date.parse(a))[0] || ""
}
export function validateLocalDate(value, name) {
	assert(isIsoCalendarDate(value), `${name} must be a real YYYY-MM-DD calendar date`)
	return value
}
export function validateContextEntry(entry, name = "context entry") {
	assertExactKeys(entry, ["kind", "note", "at", "revision"], name)
	assert(CONTEXT_KINDS.has(entry.kind), `${name} kind is invalid`)
	checkString(entry.note, `${name} note`, 3, 1200)
	assert(isIso(entry.at), `${name} timestamp is invalid`)
	assert(Number.isInteger(entry.revision) && entry.revision >= 0, `${name} revision is invalid`)
	return entry
}
export function contextHistoryHash(history = []) {
	assert(Array.isArray(history), "context history must be an array")
	history.forEach((entry, index) => validateContextEntry(entry, `contextHistory[${index}]`))
	return sha256(minifiedJson(history))
}
export function serviceContextEntry(kind, note, at, revision) {
	return validateContextEntry({kind, note, at, revision})
}

export function serviceRecordPaths(repoRoot, scope = "all") {
	const roots = ["prospects", "clients"]
	const records = []
	for (const root of roots) {
		const abs = resolveRepoPath(repoRoot, root)
		const rootStat = entryStat(abs)
		if (!rootStat) continue
		assert(rootStat.isDirectory() && !rootStat.isSymbolicLink(), `service ${root} root must be a real directory`)
		for (const folder of readdirSync(abs, {withFileTypes: true})) {
			assert(!folder.isSymbolicLink(), "service record directory must be a real directory")
			if (!folder.isDirectory()) {
				assert(!isUuid(folder.name), "service record slot must be a real directory")
				continue
			}
			const folderPath = resolveRepoPath(repoRoot, relative(repoRoot, join(abs, folder.name)))
			const folderStat = entryStat(folderPath)
			assert(folderStat?.isDirectory() && !folderStat.isSymbolicLink(), "service record directory must be a real directory")
			const path = resolveRepoPath(repoRoot, relative(repoRoot, join(folderPath, "service-application.json")))
			const applicationStat = entryStat(path)
			const statePath = resolveRepoPath(repoRoot, relative(repoRoot, join(folderPath, "service-state.json")))
			const day0Path = resolveRepoPath(repoRoot, relative(repoRoot, join(folderPath, "service-day0.json")))
			if (!applicationStat) {
				assert(!isUuid(folder.name) && !entryStat(statePath) && !entryStat(day0Path), "service record is missing its application")
				continue
			}
			assert(applicationStat.isFile() && !applicationStat.isSymbolicLink(), "service application must be a regular file")
			const stateStat = entryStat(statePath)
			if (stateStat) assert(stateStat.isFile() && !stateStat.isSymbolicLink(), "service state must be a regular file")
			const day0Stat = entryStat(day0Path)
			if (day0Stat) assert(day0Stat.isFile() && !day0Stat.isSymbolicLink(), "service Day 0 must be a regular file")
			const paidClient = root === "clients" || Boolean(day0Stat)
			records.push({path, paidClient})
		}
	}
	const seenApplicationIds = new Set()
	for (const record of records) {
		let application
		try {
			application = readJson(record.path)
		} catch {
			continue
		}
		if (!application?.applicationId) continue
		assert(!seenApplicationIds.has(application.applicationId), `duplicate service applicationId: ${application.applicationId}`)
		seenApplicationIds.add(application.applicationId)
	}
	return records
		.filter(record => (scope === "clients" ? record.paidClient : ["inbound", "prospects"].includes(scope) ? !record.paidClient : true))
		.map(record => record.path)
		.sort()
}

export function safeState(state) {
	assert(SERVICE_STATES.includes(state), `invalid service state: ${state}`)
	return state
}

export function validateDecisionStageAlignment(state, decision, stageEvidence, agentWorkOutput = null) {
	if (AGENT_WORK_STATES.has(state) && agentWorkOutput?.status === "needs-input") {
		assert(decision === "needs-info", "agent work needs-input requires a needs-info human decision")
	}
	if (state === "client-approved") {
		const expectedDecision = {approved: "approve", "revision-requested": "decline", "needs-info": "needs-info"}[stageEvidence?.clientOutcome]
		assert(expectedDecision && decision === expectedDecision, `client outcome ${stageEvidence?.clientOutcome || "missing"} does not support decision ${decision}`)
	}
	if (state === "implementation" && decision === "approve") {
		assert(stageEvidence?.acceptanceStatus === "accepted", "implementation approval requires accepted stage evidence")
	}
	if (state === "implementation" && decision === "decline") {
		assert(stageEvidence?.acceptanceStatus === "revision-requested", "implementation decline requires revision-requested stage evidence")
	}
	if (state === "tracking-14-day") {
		assert(decision !== "decline", "tracking-14-day decision must be approve or needs-info")
	}
}

export function readServiceState(folder) {
	const value = readOptionalJson(join(folder, "service-state.json"))
	assert(value, "service-state.json is missing")
	assert(value && typeof value === "object" && !Array.isArray(value), "service state must be an object")
	safeState(value.state)
	assert(Array.isArray(value.usedDecisionHashes || []), "usedDecisionHashes must be an array")
	for (const hash of value.usedDecisionHashes || []) assert(isHash(hash), "usedDecisionHashes contains an invalid hash")
	assert(Number.isInteger(value.contextRevision || 0) && (value.contextRevision || 0) >= 0, "contextRevision must be a non-negative integer")
	assert(Number.isInteger(value.deliveryRevision || 0) && (value.deliveryRevision || 0) >= 0, "deliveryRevision must be a non-negative integer")
	assert(Array.isArray(value.transitionHistory) && value.transitionHistory.length > 0, "service state transition history is missing")
	assert(Array.isArray(value.contextHistory || []), "service state context history is invalid")
	;(value.contextHistory || []).forEach((entry, index) => validateContextEntry(entry, `service state contextHistory[${index}]`))
	if (value.resumeState) safeState(value.resumeState)
	return {...value, usedDecisionHashes: value.usedDecisionHashes || [], contextRevision: value.contextRevision || 0, deliveryRevision: value.deliveryRevision || 0}
}

export function validateDay0Record(value, applicationId) {
	assertExactKeys(value, DAY0_FIELDS, "Day 0 record")
	assert(value.applicationId === applicationId, "Day 0 applicationId mismatch")
	assertFounderPilotRecord(value)
	for (const field of ["paymentEvidence", "requiredContext", "approvalOwner", "implementationOwner"]) {
		checkString(value[field], `Day 0 ${field}`, 2, 1200)
	}
	validateAffirmativePaymentEvidence(value.paymentEvidence)
	assert(value.ready === true, "Day 0 record must be ready")
	assert(isIso(value.day0StartedAt), "Day 0 start must be an ISO timestamp")
	assert(isIso(value.updatedAt), "Day 0 updatedAt must be an ISO timestamp")
	assert(Date.parse(value.day0StartedAt) <= Date.parse(value.updatedAt), "Day 0 start cannot be after its update timestamp")
	assert(typeof value.paused === "boolean", "Day 0 paused must be a boolean")
	if (value.paused) {
		assert(value.activePause, "paused Day 0 record must have an activePause")
		assert(PAUSABLE_STATES.has(value.resumeState), "Day 0 resumeState must be a pausable sprint state")
	} else {
		assert(value.activePause === null, "unpaused Day 0 record must have null activePause")
		assert(value.resumeState === "", "unpaused Day 0 record must have empty resumeState")
	}
	const {total} = checkedPauseIntervals(value.pauseHistory, value.activePause, Date.parse(value.day0StartedAt), "Day 0")
	assert(Number.isInteger(value.totalPausedMs) && value.totalPausedMs === total, "Day 0 totalPausedMs mismatch")
	const expectedDeadline = serviceDeadlineAt(value.day0StartedAt, value.pauseHistory)
	assert(value.deadlineAt === expectedDeadline, "Day 0 deadline must preserve seven working days and exclude paused time")
	return value
}

export function day0For(folder, applicationId, required) {
	const value = readOptionalJson(join(folder, "service-day0.json"))
	if (!value) {
		if (required) throw new Error("Day 0 record is missing")
		return null
	}
	return validateDay0Record(value, applicationId)
}

function agentWorkPaths(applicationId, state, contextRevision) {
	return {packetPath: `runs/service-engine/packets/${applicationId}/${state}/${contextRevision}.json`, targetIgnoredPath: `runs/service-engine/outputs/${applicationId}/${state}/${contextRevision}.json`}
}

export function buildAgentWorkPacket(application, state, folder, repoRoot, day0Hash, contextRevision, contextNote = "") {
	const paths = agentWorkPaths(application.applicationId, state, contextRevision)
	const sourcePath = relative(repoRoot, folder)
	const base = {
		packetVersion: WORK_PACKET_VERSION,
		packetId: `agent-work-${application.applicationId}-${state}-${contextRevision}`,
		applicationId: application.applicationId,
		sourceHash: application.sourceHash,
		packetHash: application.qualification.packetHash || "",
		day0Hash,
		contextNote,
		contextRevision,
		state,
		inputs: [`${sourcePath}/service-application.json`, `${sourcePath}/service-day0.json`],
		publicResearchAllowance: "Public research is allowed only for current, attributable evidence; no authenticated consoles, provider credentials, or private enrichment.",
		outputSchema: "tinystudio.agent-work-output.v5",
		requiredClaimsPolicy: {policyVersion: CLAIMS_POLICY_VERSION, disclaimer: NO_GUARANTEE_DISCLAIMER, approvalMode: "human-only"},
		packetPath: paths.packetPath,
		targetIgnoredPath: paths.targetIgnoredPath,
		checks: ["validate source, qualification, Day-0, and work-packet hashes", "run product-truth, claims, config, and send-readiness gates", "show before/after proof and a measurement plan", "label observed facts, hypotheses, and items still requiring verification"],
		claimRules: ["No revenue, ranking, ROAS, conversion-lift, booked-call, or sales-volume guarantees", "Separate observed facts from hypotheses", "Deterministic templates are not personalized synthesis"],
		stopConditions: ["missing context", "human review is required", "any send, publish, spend, approval, acceptance, access, payment, or renewal action"]
	}
	return {...base, workPacketHash: sha256(minifiedJson(base))}
}

export function validateAgentWorkOutput(output, {application, packet, asOfDate = "", notBefore = ""}) {
	assertExactKeys(output, ["contract", "schemaVersion", "applicationId", "sourceHash", "packetHash", "workPacketHash", "preparedAt", "preparedBy", "status", "deliverables", "missingContext", "evidence", "claims", "claimsPolicy"], "agent work output")
	assert(output.contract === AGENT_WORK_CONTRACT, "invalid agent work output contract")
	assert(output.schemaVersion === WORK_PACKET_VERSION, "unsupported agent work output version")
	assert(output.applicationId === application.applicationId, "agent work applicationId mismatch")
	assert(output.sourceHash === application.sourceHash, "agent work sourceHash mismatch")
	assert(output.packetHash === (application.qualification.packetHash || ""), "agent work packetHash mismatch")
	assert(output.workPacketHash === packet.workPacketHash, "agent work packet binding mismatch")
	assert(isIso(output.preparedAt), "agent work preparedAt must be an ISO timestamp")
	if (notBefore) assert(Date.parse(output.preparedAt) >= Date.parse(notBefore), "agent work preparedAt predates the current service state")
	if (asOfDate) assert(timestampIsOnOrBeforeLocalDate(output.preparedAt, asOfDate), "agent work preparedAt is after queue as-of date")
	checkString(output.preparedBy, "agent work preparedBy", 2, 120)
	assert(["ready-for-review", "needs-input"].includes(output.status), "agent work status must be ready-for-review or needs-input")
	assertExactKeys(output.claimsPolicy, ["policyVersion", "disclaimer", "approvalMode"], "agent work claimsPolicy")
	assert(output.claimsPolicy.policyVersion === CLAIMS_POLICY_VERSION, "agent work claimsPolicy version is invalid")
	assert(output.claimsPolicy.disclaimer === NO_GUARANTEE_DISCLAIMER, "agent work claimsPolicy disclaimer must match the required no-guarantee policy")
	assert(output.claimsPolicy.approvalMode === "human-only", "agent work claimsPolicy approvalMode must be human-only")
	const minimumEvidence = output.status === "ready-for-review" ? 1 : 0
	assert(Array.isArray(output.evidence) && output.evidence.length >= minimumEvidence && output.evidence.length <= 30, `agent work evidence must contain ${minimumEvidence}-30 items`)
	const evidenceById = new Map()
	output.evidence.forEach((entry, index) => {
		assertExactKeys(entry, ["id", "claim", "sourceUrl", "capturedAt", "status"], `agent work evidence[${index}]`)
		checkString(entry.id, `agent work evidence[${index}].id`, 3, 80)
		assert(/^[a-z0-9][a-z0-9-]*$/.test(entry.id), `agent work evidence[${index}].id is invalid`)
		assert(!evidenceById.has(entry.id), `agent work evidence id is duplicated: ${entry.id}`)
		checkNonPlaceholderString(entry.claim, `agent work evidence[${index}].claim`, 10, 1200)
		checkHttpUrl(entry.sourceUrl, `agent work evidence[${index}].sourceUrl`)
		assert(isIso(entry.capturedAt), `agent work evidence[${index}].capturedAt is invalid`)
		assert(Date.parse(entry.capturedAt) <= Date.parse(output.preparedAt), `agent work evidence[${index}].capturedAt is after preparedAt`)
		assert(["observed", "hypothesis", "to-verify"].includes(entry.status), `agent work evidence[${index}].status is invalid`)
		evidenceById.set(entry.id, entry)
	})
	const checkEvidenceIds = (ids, name, {observed = false, min = 1} = {}) => {
		assert(Array.isArray(ids) && ids.length >= min && ids.length <= 20, `${name} must contain ${min}-20 evidence ids`)
		const unique = new Set()
		ids.forEach((id, index) => {
			checkString(id, `${name}[${index}]`, 3, 80)
			assert(!unique.has(id), `${name} contains a duplicate evidence id`)
			unique.add(id)
			const evidence = evidenceById.get(id)
			assert(evidence, `${name}[${index}] does not reference recorded evidence`)
			if (observed) assert(evidence.status === "observed", `${name}[${index}] must reference observed evidence`)
		})
	}

	if (output.status === "needs-input") {
		assert(output.deliverables === null, "needs-input agent work must not claim completed deliverables")
		assertExactKeys(output.missingContext, ["fields", "reason", "request"], "agent work missingContext")
		checkStringList(output.missingContext.fields, "agent work missingContext.fields", 20, 120)
		assert(output.missingContext.fields.length >= 1, "agent work missingContext.fields must contain at least one field")
		assert(new Set(output.missingContext.fields).size === output.missingContext.fields.length, "agent work missingContext.fields contains duplicates")
		output.missingContext.fields.forEach((field, index) => assert(/^[a-z][a-z0-9-]*$/.test(field), `agent work missingContext.fields[${index}] is invalid`))
		checkNonPlaceholderFields(output.missingContext, "agent work missingContext", ["reason", 20, 1200, "request", 20, 1200])
		assert(Array.isArray(output.claims) && output.claims.length === 0, "needs-input agent work must not include client-facing claims")
		return output
	}

	assert(output.missingContext === null, "ready-for-review agent work must set missingContext to null")
	assertExactKeys(output.deliverables, DELIVERABLE_FIELDS, "agent work deliverables")

	const {leakMap, pageFix, searchTrust, proof, loom, measurement, implementation, revisionBoundary, tracking} = output.deliverables
	assertExactKeys(leakMap, ["selectedPageUrl", "items"], "agent work deliverables.leakMap")
	checkHttpUrl(leakMap.selectedPageUrl, "agent work deliverables.leakMap.selectedPageUrl")
	assert(Array.isArray(leakMap.items) && leakMap.items.length >= 1 && leakMap.items.length <= 12, "agent work fault map must contain 1-12 items")
	leakMap.items.forEach((entry, index) => {
		assertExactKeys(entry, ["fault", "impact", "priority", "evidenceIds"], `agent work leakMap.items[${index}]`)
		checkNonPlaceholderFields(entry, `agent work leakMap.items[${index}]`, ["fault", 10, 1200, "impact", 10, 1200])
		assert(["high", "medium", "low"].includes(entry.priority), `agent work leakMap.items[${index}].priority is invalid`)
		checkEvidenceIds(entry.evidenceIds, `agent work leakMap.items[${index}].evidenceIds`, {observed: true})
	})

	assertExactKeys(pageFix, ["mode", "pageUrl", "beforeSummary", "artifact", "rationale"], "agent work deliverables.pageFix")
	assert(["rewrite", "redesign"].includes(pageFix.mode), "agent work pageFix.mode is invalid")
	const selectedPageIdentity = canonicalPageIdentity(leakMap.selectedPageUrl, "agent work deliverables.leakMap.selectedPageUrl")
	const fixedPageIdentity = canonicalPageIdentity(pageFix.pageUrl, "agent work deliverables.pageFix.pageUrl")
	assert(fixedPageIdentity === selectedPageIdentity, "agent work page fix must target the same selected page as the fault map")
	checkNonPlaceholderFields(pageFix, "agent work deliverables.pageFix", ["beforeSummary", 20, 4000, "rationale", 20, 4000])
	validatePageFixArtifact(pageFix.mode, pageFix.artifact)

	assertExactKeys(searchTrust, ["changes"], "agent work deliverables.searchTrust")
	assert(Array.isArray(searchTrust.changes) && searchTrust.changes.length >= 1 && searchTrust.changes.length <= 12, "agent work searchTrust.changes must contain 1-12 items")
	searchTrust.changes.forEach((entry, index) => {
		assertExactKeys(entry, ["change", "implementation", "evidenceIds"], `agent work searchTrust.changes[${index}]`)
		checkNonPlaceholderFields(entry, `agent work searchTrust.changes[${index}]`, ["change", 10, 1200, "implementation", 10, 4000])
		checkEvidenceIds(entry.evidenceIds, `agent work searchTrust.changes[${index}].evidenceIds`, {observed: true})
	})

	assertExactKeys(proof, ["beforeEvidenceIds", "afterCapturePlan", "comparisonCriteria"], "agent work deliverables.proof")
	checkEvidenceIds(proof.beforeEvidenceIds, "agent work deliverables.proof.beforeEvidenceIds", {observed: true})
	checkNonPlaceholderFields(proof, "agent work deliverables.proof", ["afterCapturePlan", 20, 2400, "comparisonCriteria", 20, 2400])

	assertExactKeys(loom, ["recordingOwner", "outline"], "agent work deliverables.loom")
	checkNonPlaceholderString(loom.recordingOwner, "agent work deliverables.loom.recordingOwner", 2, 120)
	checkStringList(loom.outline, "agent work deliverables.loom.outline", 12, 1200)
	assert(loom.outline.length >= 2, "agent work Loom outline must contain at least 2 items")
	loom.outline.forEach((entry, index) => assert(!PLACEHOLDER_PATTERN.test(entry), `agent work deliverables.loom.outline[${index}] contains placeholder text`))

	assertExactKeys(measurement, ["metric", "baselineValue", "baselineEvidenceIds", "comparisonWindow", "successSignal"], "agent work deliverables.measurement")
	checkNonPlaceholderFields(measurement, "agent work deliverables.measurement", ["metric", 3, 240, "baselineValue", 1, 240, "comparisonWindow", 5, 240, "successSignal", 10, 1200])
	checkEvidenceIds(measurement.baselineEvidenceIds, "agent work deliverables.measurement.baselineEvidenceIds", {observed: true})

	assertExactKeys(implementation, ["route", "owner", "artifact", "steps"], "agent work deliverables.implementation")
	assert(["implementation-pass", "dev-ready-handoff"].includes(implementation.route), "agent work implementation.route is invalid")
	checkNonPlaceholderString(implementation.owner, "agent work deliverables.implementation.owner", 2, 120)
	validateImplementationArtifact(implementation.route, implementation.artifact, pageFix)
	checkStringList(implementation.steps, "agent work deliverables.implementation.steps", 20, 1200)
	assert(implementation.steps.length >= 1, "agent work implementation.steps must contain at least one item")
	implementation.steps.forEach((entry, index) => assert(!PLACEHOLDER_PATTERN.test(entry), `agent work deliverables.implementation.steps[${index}] contains placeholder text`))

	assertExactKeys(revisionBoundary, ["includedRevisions", "boundary", "outOfScope"], "agent work deliverables.revisionBoundary")
	assert(revisionBoundary.includedRevisions === 1, "agent work must preserve exactly one included revision")
	checkNonPlaceholderFields(revisionBoundary, "agent work deliverables.revisionBoundary", ["boundary", 20, 1200, "outOfScope", 20, 1200])

	assertExactKeys(tracking, ["days", "owner", "checkpoints", "recordTemplate"], "agent work deliverables.tracking")
	assert(tracking.days === 14, "agent work tracking must cover exactly 14 days")
	checkNonPlaceholderString(tracking.owner, "agent work deliverables.tracking.owner", 2, 120)
	checkStringList(tracking.checkpoints, "agent work deliverables.tracking.checkpoints", 14, 1200)
	assert(tracking.checkpoints.length >= 2, "agent work tracking.checkpoints must contain at least two items")
	checkNonPlaceholderString(tracking.recordTemplate, "agent work deliverables.tracking.recordTemplate", 40, 8000)

	assert(Array.isArray(output.claims) && output.claims.length >= 1 && output.claims.length <= 30, "agent work claims must contain 1-30 items")
	output.claims.forEach((entry, index) => {
		assertExactKeys(entry, ["text", "evidenceIds", "risk"], `agent work claims[${index}]`)
		checkNonPlaceholderString(entry.text, `agent work claims[${index}].text`, 10, 1200)
		checkEvidenceIds(entry.evidenceIds, `agent work claims[${index}].evidenceIds`, {observed: true})
		assert(["low", "medium", "high"].includes(entry.risk), `agent work claims[${index}].risk is invalid`)
	})
	const unresolvedClaimRiskFlags = agentWorkClaimRiskFlags(output).filter(flag => flag.blocking)
	assert(unresolvedClaimRiskFlags.length === 0, `agent work output contains unresolved guarantee/claim risk flags: ${unresolvedClaimRiskFlags.map(flag => flag.path).join(", ")}`)
	return output
}

function stageEvidencePath(folder, state, contextRevision = 0) {
	return join(folder, "service-evidence", state, `${contextRevision}.json`)
}
export function checkedStageEvidencePath(repoRoot, folder, state, contextRevision = 0) {
	const path = stageEvidencePath(folder, state, contextRevision)
	return resolveRepoPath(repoRoot, relative(repoRoot, path))
}
export function validateStageEvidence(value, {application, state, approvedArtifactHash = "", approvedArtifact = null, implementationAcceptedAt = "", implementationBaseline = null, pauseHistory = [], activePause = null, asOfDate = "", notBefore = ""}) {
	assertExactKeys(value, ["contract", "schemaVersion", "applicationId", "sourceHash", "stage", "recordedAt", "recordedBy", "signals"], "stage evidence")
	assert(value.contract === STAGE_EVIDENCE_CONTRACT && value.schemaVersion === 1, "invalid stage evidence contract")
	assert(value.applicationId === application.applicationId && value.sourceHash === application.sourceHash, "stage evidence application binding mismatch")
	assert(value.stage === state && REVIEW_STATES.has(state), "stage evidence state mismatch")
	assert(isIso(value.recordedAt), "stage evidence recordedAt is invalid")
	if (notBefore) assert(Date.parse(value.recordedAt) >= Date.parse(notBefore), "stage evidence recordedAt predates the current service state")
	if (asOfDate) assert(timestampIsOnOrBeforeLocalDate(value.recordedAt, asOfDate), "stage evidence recordedAt is after queue as-of date")
	checkString(value.recordedBy, "stage evidence recordedBy", 2, 120)
	if (state === "client-approved") {
		assertExactKeys(value.signals, ["clientOutcome", "clientFeedback", "implementationOwner", "reviewedArtifactHash"], "client review signals")
		assert(["approved", "revision-requested", "needs-info"].includes(value.signals.clientOutcome), "client outcome is invalid")
		checkString(value.signals.clientFeedback, "client feedback", 3, 1200)
		checkString(value.signals.implementationOwner, "implementation owner", value.signals.clientOutcome === "approved" ? 2 : 0, 240)
		assert(isHash(value.signals.reviewedArtifactHash) && value.signals.reviewedArtifactHash === approvedArtifactHash, "reviewed artifact hash mismatch")
	} else if (state === "implementation") {
		assertExactKeys(value.signals, ["approvedArtifactHash", "implementationStatus", "acceptanceStatus", "usefulnessScore", "usefulnessNote", "implementationArtifactUrl", "beforeEvidenceUrl", "afterEvidenceUrl", "loomUrl", "measurementBaseline"], "implementation signals")
		assert(isHash(approvedArtifactHash), "implementation approved artifact hash anchor is missing")
		assert(approvedArtifact, "implementation approved delivery artifact is missing")
		assert(sha256(minifiedJson(approvedArtifact)) === approvedArtifactHash, "implementation approved artifact hash does not match the approved artifact")
		const approvedPageIdentity = canonicalApprovedPageUrl(approvedArtifact)
		assert(isHash(value.signals.approvedArtifactHash) && value.signals.approvedArtifactHash === approvedArtifactHash, "implementation approved artifact hash mismatch")
		assert(["implemented", "dev-ready-handoff"].includes(value.signals.implementationStatus), "implementation status is invalid")
		assert(["accepted", "revision-requested"].includes(value.signals.acceptanceStatus), "acceptance status is invalid")
		assert(Number.isInteger(value.signals.usefulnessScore) && value.signals.usefulnessScore >= 1 && value.signals.usefulnessScore <= 10, "usefulness score must be 1-10")
		checkString(value.signals.usefulnessNote, "usefulness note", 3, 1200)
		assert(canonicalPageIdentity(value.signals.implementationArtifactUrl, "implementation artifact URL") === approvedPageIdentity, "implementation artifact URL does not match the approved selected page")
		const beforeEvidenceIdentity = canonicalEvidenceIdentity(value.signals.beforeEvidenceUrl, "before evidence URL")
		const afterEvidenceIdentity = canonicalEvidenceIdentity(value.signals.afterEvidenceUrl, "after evidence URL")
		assert(beforeEvidenceIdentity !== afterEvidenceIdentity, "before and after evidence URLs must identify distinct proof resources")
		assert(isValidLoomUrl(value.signals.loomUrl), "Loom URL must be a Loom share or embed recording")
		assertExactKeys(value.signals.measurementBaseline, ["metric", "value", "sourceUrl", "capturedAt"], "implementation measurement baseline")
		checkNonPlaceholderFields(value.signals.measurementBaseline, "implementation measurement baseline", ["metric", 3, 240, "value", 1, 240])
		checkHttpUrl(value.signals.measurementBaseline.sourceUrl, "implementation measurement baseline source URL")
		assert(isIso(value.signals.measurementBaseline.capturedAt), "implementation measurement baseline capturedAt is invalid")
		assert(Date.parse(value.signals.measurementBaseline.capturedAt) <= Date.parse(value.recordedAt), "implementation measurement baseline cannot be captured after evidence recordedAt")
	} else {
		assertExactKeys(value.signals, ["trackedThrough", "implementationStatus", "acceptanceConfirmed", "usefulnessScore", "recurringNeedObserved", "continuationNote", "trackingRecordUrl", "measurementResult"], "tracking signals")
		assert(isIso(value.signals.trackedThrough), "trackedThrough must be an ISO timestamp")
		assert(Date.parse(value.signals.trackedThrough) <= Date.parse(value.recordedAt), "trackedThrough cannot be after evidence recordedAt")
		assert(isIso(implementationAcceptedAt), "tracking implementation acceptance anchor is missing")
		assert(activeTrackingMilliseconds(implementationAcceptedAt, value.signals.trackedThrough, pauseHistory, activePause) >= 14 * 86400000, "tracking must contain at least 14 active days after implementation acceptance")
		assert(["implemented", "dev-ready-handoff"].includes(value.signals.implementationStatus), "tracking implementation status is invalid")
		assert(value.signals.acceptanceConfirmed === true, "tracking requires confirmed acceptance")
		assert(Number.isInteger(value.signals.usefulnessScore) && value.signals.usefulnessScore >= 1 && value.signals.usefulnessScore <= 10, "usefulness score must be 1-10")
		assert(typeof value.signals.recurringNeedObserved === "boolean", "recurringNeedObserved must be boolean")
		checkString(value.signals.continuationNote, "continuation note", 3, 1200)
		checkHttpUrl(value.signals.trackingRecordUrl, "tracking record URL")
		assertExactKeys(value.signals.measurementResult, ["metric", "baseline", "result", "sourceUrl"], "tracking measurement result")
		checkNonPlaceholderFields(value.signals.measurementResult, "tracking measurement", ["metric", 3, 240, "baseline", 1, 240, "result", 1, 240])
		checkHttpUrl(value.signals.measurementResult.sourceUrl, "tracking measurement source URL")
		assertExactKeys(implementationBaseline, ["metric", "value", "sourceUrl", "capturedAt"], "accepted implementation measurement baseline")
		assert(value.signals.measurementResult.metric === implementationBaseline.metric, "tracking measurement metric must match the accepted implementation baseline")
		assert(value.signals.measurementResult.baseline === implementationBaseline.value, "tracking measurement baseline must match the accepted implementation baseline value")
	}
	return value
}
