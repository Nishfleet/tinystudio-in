#!/usr/bin/env node
import {existsSync, readFileSync, readdirSync} from "node:fs"
import {ACTIVE_OPERATOR_ARTIFACTS} from "./lib/service-contract.mjs"

const surfaces = [
	"README.md",
	"MEMORY.md",
	"PRODUCT.md",
	"growth-brain/offer.md",
	"growth-brain/sales/managed-it-one-page-offer.md",
	"growth-brain/sales/one-page-offer.md",
	"growth-brain/sales/proposal-template.md",
	"growth-brain/sales/buyer-room-template.md",
	"growth-brain/sales/sales-call-script.md",
	"growth-brain/sales/follow-up-sequences.md",
	"growth-brain/sprint-checklist.md",
	"growth-brain/delivery-template.md",
	"growth-brain/workflows/client-sprint-workflow.md",
	"growth-brain/quality/sprint-acceptance-checklist.md",
	"growth-brain/positioning/message-house.md",
	"growth-brain/delivery/implementation-handoff-template.md",
	"growth-brain/README.md",
	"growth-brain/sales/pricing-rules.md",
	"growth-brain/loom-audit-script.md",
	"growth-brain/workflows/loom-audit-workflow.md",
	"growth-brain/prospecting/warm-network-scripts.md",
	"growth-brain/agency-operating-model.md",
	"growth-brain/build-roadmap.md",
	"growth-brain/sales/managed-it-one-page-offer.html"
]

const activeGeneratedOutputs = ACTIVE_OPERATOR_ARTIFACTS
const allowedOperatorRootFiles = new Set([
	...ACTIVE_OPERATOR_ARTIFACTS.map(path => path.slice("growth-brain/ops/".length)),
	"agency-config.json",
	"command-center.md",
	"daily-review-template.md"
])

const activeGeneratorSources = [
	"scripts/create-client-sprint.mjs",
	"scripts/check-client-readiness.mjs",
	"scripts/create-prospect-audit.mjs",
	"scripts/draft-loom-package.mjs",
	"scripts/draft-prospect-message.mjs",
	"scripts/draft-loom-recording-script.mjs",
	"scripts/draft-sales-call-prep.mjs",
	"scripts/draft-client-kickoff.mjs",
	"scripts/prepare-prospect-close-package.mjs",
	"scripts/convert-prospect-to-client.mjs",
	"scripts/export-daily-money-mission.mjs",
	"scripts/export-market-proof-run.mjs",
	"scripts/prepare-prospect-batch-send.mjs",
	"scripts/export-proof-library.mjs",
	"scripts/export-client-delivery-cockpit.mjs",
	"scripts/export-market-benchmark.mjs",
	"scripts/export-internal-dashboard.mjs",
	"scripts/review-client-acceptance.mjs",
	"scripts/review-client-proof.mjs",
	"scripts/show-growth-command-center.mjs",
	"scripts/export-managed-it-one-pager.mjs"
]

const activeWorkflowEntries = new Set([
	"growth-brain/workflows/README.md",
	"growth-brain/workflows/client-sprint-workflow.md",
	"growth-brain/workflows/conversion-audit-workflow.md",
	"growth-brain/workflows/daily-sales-workflow.md",
	"growth-brain/workflows/human-review-service-engine.md",
	"growth-brain/workflows/lead-scoring-workflow.md",
	"growth-brain/workflows/loom-audit-workflow.md",
	"growth-brain/retention/case-study-template.md"
])

const activeWorkflowRequirements = [
	["canonical product", /human-reviewed[\s\S]{0,120}7-Day Website Revenue Leak Fix Sprint/i],
	["canonical buyer", /founder-led Managed IT\/MSP\/cybersecurity/i],
	["canonical one-page scope", /one highest-leverage page/i]
]

const activeWorkflowScopeConflicts = [
	/\b(?:Shopify|e-?commerce)\b/i,
	/\b(?:accountants?|bookkeepers?|tax advisors?|dental|med spa|clinic|health practices?|home services?|legal and financial services?)\b/i,
	/\b(?:monthly retention product|retained clients?|service expansion)\b/i,
	/\badd (?:email\/SMS|ads\/creative|competitor watch|analytics decision room)\b/i,
	/\bpage, form, offer, ad, or email sequence\b/i
]

const stalePatterns = [
	/\be-?commerce\b/i,
	/\b(?:three|3)[ -]page\b/i,
	/\bbroad[- ]agency\b/i,
	/\bbroad[- ]service\b/i,
	/\bfull[- ]service agency\b/i,
	/\bfull[- ]stack (?:agency|service)\b/i,
	/\b(?:vague )?AI agency\b/i,
	/\b(?:ad angles?|email drafts?|email\/sms|ads\/emails|advertising deliverables)\b/i,
	/\bclient brain\b/i,
	/\bcompetitor(?:\/| and )search(?: visibility)? notes\b/i,
	/\b30[- ]day (?:action )?plan\b/i,
	/\b(?:weekly |full-stack )?growth desk\b/i,
	/\b(?:active )?SaaS (?:product|offer|availability|platform)\b/i,
	/\bguaranteed\s+(?:revenue|rankings?|ROAS|conversion|booked calls?|sales volume)\b/i
]

const retiredGeneratedWorkflowPatterns = [
	new RegExp(["npm run", "owned:[a-z0-9-]+"].join("\\s+"), "i"),
	new RegExp(["npm run", "retention:checkups"].join("\\s+"), "i"),
	new RegExp(["npm run", "client:weekly-loop"].join("\\s+"), "i"),
	new RegExp(["npm run", "value:stress"].join("\\s+"), "i"),
	/client brain/i,
	/(?:weekly|full-stack) growth desk/i,
	/weekly client value loop/i,
	/convert a won prospect/i,
	/filled weekly report/i,
	/won sprint\(s\) with close package and won note/i
]

const failures = []
for (const entry of readdirSync("growth-brain/ops", {withFileTypes: true})) {
	if (entry.isFile() && !allowedOperatorRootFiles.has(entry.name)) failures.push(`growth-brain/ops/${entry.name}: unregistered operator artifact must be removed or moved under historical/`)
}
const contents = new Map()
for (const path of surfaces) {
	if (!existsSync(path)) {
		failures.push(`${path}: missing active service surface`)
		continue
	}
	const content = readFileSync(path, "utf8")
	contents.set(path, content)
	if (path.endsWith(".html") && /\*\*[^*]+\*\*/.test(content)) failures.push(`${path}: raw Markdown emphasis leaked into HTML`)
	for (const pattern of stalePatterns) {
		const match = content.match(pattern)
		if (match) failures.push(`${path}: stale active positioning '${match[0]}'`)
	}
	for (const line of content.split("\n")) {
		if (/\bSaaS\b/i.test(line) && !/graduation|evidence gate|threshold/i.test(line)) {
			failures.push(`${path}: stale active positioning 'SaaS claim'`)
		}
		const positiveGuarantee = line.match(/\bguarantee(?:s|d)?\s+(?:revenue|rankings?|ROAS|conversion|booked calls?|sales volume)\b/i)
		if (positiveGuarantee && !/\b(?:do not|does not|not|never)\s+guarantee/i.test(line)) {
			failures.push(`${path}: stale active positioning '${positiveGuarantee[0]}'`)
		}
	}
}

const workflowEntryPaths = ["growth-brain/workflows", "growth-brain/retention"].flatMap(root =>
	readdirSync(root)
		.filter(name => name.endsWith(".md"))
		.map(name => `${root}/${name}`)
)
const retiredWorkflowHeader = /^# Retired:[\s\S]{0,400}\*\*Status: Retired historical reference\.\*\*/
for (const path of activeWorkflowEntries) {
	if (!workflowEntryPaths.includes(path)) failures.push(`${path}: registered active workflow is missing`)
}
for (const path of workflowEntryPaths) {
	const content = readFileSync(path, "utf8")
	const retired = retiredWorkflowHeader.test(content)
	if (!activeWorkflowEntries.has(path)) {
		if (!retired) failures.push(`${path}: workflow must be registered active or clearly marked retired`)
		continue
	}
	if (retired) failures.push(`${path}: active workflow is marked retired`)
	for (const [label, pattern] of activeWorkflowRequirements) {
		if (!pattern.test(content)) failures.push(`${path}: missing ${label}`)
	}
	for (const pattern of [...stalePatterns, ...activeWorkflowScopeConflicts]) {
		const match = content.match(pattern)
		if (match) failures.push(`${path}: noncanonical active workflow scope '${match[0]}'`)
	}
}

for (const path of activeGeneratedOutputs) {
	if (!existsSync(path)) {
		failures.push(`${path}: missing active generated output`)
		continue
	}
	const content = readFileSync(path, "utf8")
	const generatedDate = content.match(/\bGenerated:?\s*(\d{4}-\d{2}-\d{2})/m)?.[1] || ""
	if (!generatedDate) {
		failures.push(`${path}: generation date is missing`)
	} else {
		const parsedGeneratedDate = Date.parse(`${generatedDate}T00:00:00.000Z`)
		if (!Number.isFinite(parsedGeneratedDate) || new Date(parsedGeneratedDate).toISOString().slice(0, 10) !== generatedDate) {
			failures.push(`${path}: generation date is invalid '${generatedDate}'`)
		}
	}
	for (const pattern of stalePatterns) {
		const match = content.match(pattern)
		if (match) failures.push(`${path}: stale generated positioning '${match[0]}'`)
	}
	for (const pattern of retiredGeneratedWorkflowPatterns) {
		const match = content.match(pattern)
		if (match) failures.push(`${path}: retired generated workflow '${match[0]}'`)
	}
}

function tableCount(path, label) {
	const escaped = label.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")
	return Number(readFileSync(path, "utf8").match(new RegExp(`\\| ${escaped} \\| (\\d+) \\|`))?.[1])
}

const generatedCounts = [
	[
		"prospects",
		[["growth-brain/ops/live-metrics.md", "Prospects total"]]
	],
	[
		"scored",
		[["growth-brain/ops/live-metrics.md", "Active scored prospects"]]
	],
	[
		"clients",
		[["growth-brain/ops/live-metrics.md", "Clients"]]
	],
	[
		"blocked clients",
		[["growth-brain/ops/live-metrics.md", "Client records blocked"]]
	]
]
for (const [label, sources] of generatedCounts) {
	const values = sources.map(([path, metric]) => tableCount(path, metric))
	if (values.some(value => !Number.isFinite(value)) || (values.length > 1 && new Set(values).size !== 1)) failures.push(`generated operator snapshots disagree on ${label}: ${values.join(", ")}`)
}
for (const path of activeGeneratorSources) {
	if (!existsSync(path)) {
		failures.push(`${path}: missing active generator source`)
		continue
	}
	const content = readFileSync(path, "utf8")
	for (const pattern of [/Tangible Revenue Leak Sprint/i, /30[- ]day (?:action )?plan/i, /Weekly Growth Desk|Full-Stack Growth Desk|Operator[- ]Led Growth Pod|operator pod/i, /rewrite\/redesign|rewritten and redesigned/i, /ad angles? and email\/sms|ads and email\/sms/i]) {
		const match = content.match(pattern)
		if (match) failures.push(`${path}: stale active generator truth '${match[0]}'`)
	}
	if (/\bnpm run\s+owned:[a-z0-9-]+/i.test(content)) {
		failures.push(`${path}: active generator emits a retired owned command`)
	}
	for (const retiredInvocation of [
		"export-client-weekly-report.mjs",
		"export-client-channel-readiness.mjs",
		"export-client-repeatable-workflow.mjs",
		"export-client-facing-dashboard.mjs",
		"export-client-renewal-review.mjs",
		"export-retention-checkups.mjs",
		"export-owned-handoff-loom-cockpit.mjs",
		"export-owned-product-case-studies.mjs"
	]) {
		if (content.includes(retiredInvocation)) failures.push(`${path}: retired broad-service generator is still invoked '${retiredInvocation}'`)
	}
}

for (const [path, requiredPatterns] of [
	[
		"scripts/draft-sales-call-prep.mjs",
		[
			["immutable offer", /FOUNDER_PILOT\.offerName/],
			["immutable founder-pilot price", /FOUNDER_PILOT\.offerPriceUsd/],
			["canonical one-page scope", /one highest-leverage page/],
			["paid-pilot capacity gate", /serviceRecordPaths\(repoRoot,\s*"clients"\)/],
			["post-pilot stop", /human-reviewed post-pilot offer is required/]
		]
	],
	[
		"scripts/prepare-prospect-close-package.mjs",
		[
			["immutable offer", /FOUNDER_PILOT\.offerName/],
			["immutable founder-pilot price", /FOUNDER_PILOT\.offerPriceUsd/],
			["canonical one-page scope", /one highest-leverage page/],
			["paid-pilot capacity gate", /serviceRecordPaths\(repoRoot,\s*"clients"\)/],
			["noncanonical price rejection", /rawPriceOverride\s*&&\s*rawPriceOverride\s*!==\s*price/],
			["post-pilot stop", /human-reviewed post-pilot offer is required/]
		]
	]
]) {
	const content = existsSync(path) ? readFileSync(path, "utf8") : ""
	for (const [label, pattern] of requiredPatterns) {
		if (!pattern.test(content)) failures.push(`${path}: missing sales contract guard '${label}'`)
	}
	if (/section\(buyerRoom,\s*"Scope"/.test(content)) {
		failures.push(`${path}: generated sales scope still trusts prospect buyer-room scope`)
	}
	if (/priceOverride\s*\|\||priceFromBuyerRoom/.test(content)) {
		failures.push(`${path}: generated sales price still trusts an override or buyer-room price`)
	}
}

for (const path of ["scripts/draft-prospect-message.mjs", "scripts/export-daily-money-mission.mjs", "scripts/export-market-proof-run.mjs", "scripts/prepare-prospect-batch-send.mjs"]) {
	const content = existsSync(path) ? readFileSync(path, "utf8") : ""
	if (!/canonicalProspectAsk/.test(content)) failures.push(`${path}: active offer copy is not projected from the canonical service helper`)
}

for (const path of [
	"scripts/lib/canonical-service-copy.mjs",
	"scripts/lib/client-scaffold.mjs",
	"scripts/draft-client-kickoff.mjs",
	"scripts/prepare-prospect-close-package.mjs",
	"scripts/draft-sales-call-prep.mjs",
	"scripts/draft-loom-recording-script.mjs",
	"scripts/draft-recording-sharpness-brief.mjs",
	"scripts/export-daily-money-mission.mjs",
	"scripts/export-market-benchmark.mjs"
]) {
	const content = existsSync(path) ? readFileSync(path, "utf8") : ""
	if (!content.includes("NO_GUARANTEE_CLIENT_SENTENCE")) failures.push(`${path}: client-facing output does not project the canonical no-guarantee policy`)
}

const kickoffSource = readFileSync("scripts/draft-client-kickoff.mjs", "utf8")
if (/section\(buyerRoom|read\("buyer-room\.md"\)/.test(kickoffSource)) {
	failures.push("scripts/draft-client-kickoff.mjs: client-facing kickoff still trusts mutable buyer-room offer text")
}

const prospectMessageSource = readFileSync("scripts/draft-prospect-message.mjs", "utf8")
if (/section\(outreach,\s*"First Message"|lineValue\(buyerRoom,\s*\/\^- Price/.test(prospectMessageSource)) {
	failures.push("scripts/draft-prospect-message.mjs: active message still trusts legacy outreach or buyer-room price")
}

const loomPackageSource = readFileSync("scripts/draft-loom-package.mjs", "utf8")
if (/readFileSync\(join\(prospectPath,\s*"(?:outreach|buyer-room|audit-brief|loom-outline)\.md"/.test(loomPackageSource)) {
	failures.push("scripts/draft-loom-package.mjs: outbound package still copies mutable legacy offer sources")
}

const recordingScriptSource = readFileSync("scripts/draft-loom-recording-script.mjs", "utf8")
if (/read\("buyer-room\.md"\)|priceMatch/.test(recordingScriptSource) || !/FOUNDER_PILOT\.offerPriceUsd/.test(recordingScriptSource)) {
	failures.push("scripts/draft-loom-recording-script.mjs: recording pitch does not use the immutable founder-pilot price")
}

const metricsSource = readFileSync("scripts/export-growth-metrics.mjs", "utf8")
if (!/loadValidatedServiceClients/.test(metricsSource) || /const clientRows = listFolders\("clients"\)/.test(metricsSource)) {
	failures.push("scripts/export-growth-metrics.mjs: client metrics are not sourced from canonical service validation")
}

const packageSource = readFileSync("package.json", "utf8")
const packageJson = JSON.parse(packageSource)
for (const [alias, command] of Object.entries(packageJson.scripts || {})) {
	if (/^owned:/i.test(alias)) failures.push(`package.json: retired owned command is still active '${alias}'`)
	if (/\bnpm run\s+owned:[a-z0-9-]+/i.test(String(command))) {
		failures.push(`package.json: active script emits a retired owned command '${alias}'`)
	}
}
for (const retiredCommand of ["client:dashboard", "client:weekly-report", "client:channels", "client:weekly-loop", "client:renewal", "retention:checkups", "growth:service-map", "value:stress"]) {
	if (packageSource.includes(`\"${retiredCommand}\"`)) failures.push(`package.json: retired broad-service command is still active '${retiredCommand}'`)
}

const corpus = [...contents.values()].join("\n").toLowerCase()
const required = [
	["buyer", /founder-led managed it\/msp\/cybersecurity companies with a live site and high-value offer/],
	["product", /7-day website revenue leak fix sprint/],
	["first-3 price", /first 3 clients[\s\S]{0,100}\$1,000 founder pilot/],
	["scope", /one highest-leverage page/],
	["leak map", /leak map/],
	["rewrite or redesign", /rewrite or redesign/],
	["implementation pass or dev-ready handoff", /one implementation pass (?:or|\*\*or\*\*) a? ?dev-ready handoff|one implementation pass or dev-ready handoff/],
	["search-trust basics", /search-trust basics/],
	["before/after proof", /before\/after proof/],
	["Loom", /loom/],
	["measurement plan", /measurement plan/],
	["one revision", /one revision/],
	["14-day implementation tracking", /14-day implementation tracking/],
	["Day 0 prerequisites", /day 0 starts only after payment[\s\S]{0,180}required context[\s\S]{0,180}approval owner[\s\S]{0,180}implementation owner/],
	["client-delay pause", /client delay pauses the clock/],
	["no revenue guarantee", /(?:no|does not|do not) guarantee revenue|no revenue[\s\S]{0,100}guarantee/],
	["no ranking guarantee", /(?:no|does not|do not) guarantee[\s\S]{0,100}ranking|no ranking[\s\S]{0,100}guarantee/],
	["no ROAS guarantee", /(?:no|does not|do not) guarantee[\s\S]{0,100}roas|no roas[\s\S]{0,100}guarantee/],
	["no conversion guarantee", /(?:no|does not|do not) guarantee[\s\S]{0,100}conversion|no conversion[\s\S]{0,100}guarantee/],
	["no booked-call guarantee", /(?:no|does not|do not) guarantee[\s\S]{0,100}booked-call|no booked-call[\s\S]{0,100}guarantee/],
	["no sales-volume guarantee", /(?:no|does not|do not) guarantee[\s\S]{0,140}sales[- ]volume|no sales[- ]volume[\s\S]{0,140}guarantee/],
	["fit review gate", /human review gates[\s\S]{0,100}fit/],
	["claims review gate", /human review gates[\s\S]{0,120}claims/],
	["client-facing review gate", /human review gates[\s\S]{0,160}client-facing work/],
	["delivery/acceptance review gate", /human review gates[\s\S]{0,220}delivery\/acceptance/],
	["renewal review gate", /human review gates[\s\S]{0,260}renewal/],
	["automation preparation", /automation (?:may )?prepare(?:s)? research, drafts, qa, packages, and routing/],
	["no autonomous send", /never autonomously send/],
	["no autonomous publish", /never autonomously[\s\S]{0,80}publish/],
	["no autonomous spend", /never autonomously[\s\S]{0,80}spend/],
	["no autonomous approval", /never autonomously[\s\S]{0,100}approve/],
	["no autonomous acceptance", /never autonomously[\s\S]{0,120}accept/],
	["no autonomous renewal", /never autonomously[\s\S]{0,140}renew/],
	["SaaS graduation: 10 paid sprints", /at least 10 paid sprints/],
	["SaaS graduation: same problem", /same problem in at least 7/],
	["SaaS graduation: repeatability", /at least 70% workflow repeatability/],
	["SaaS graduation: usefulness", /usefulness at least 8\/10/],
	["SaaS graduation: approval", /approval at least 70%/],
	["SaaS graduation: recurring need", /recurring need/],
	["SaaS graduation: deposits", /at least 3 deposits or preorders/]
]

for (const [label, pattern] of required) {
	if (!pattern.test(corpus)) failures.push(`missing contract language '${label}'`)
}

for (const [path, content] of contents) {
	const lower = content.toLowerCase()
	for (const [label, pattern] of [
		["product", /7-day website revenue leak fix sprint/],
		["scope", /one highest-leverage page/],
		["pilot price", /\$1,000 founder pilot/],
		["no-guarantee boundary", /(?:no|does not|do not guarantee)[\s\S]{0,180}(?:revenue|ranking|roas|conversion|booked-call)/],
		["no sales-volume guarantee", /(?:no|does not|do not|never)[^.\n]{0,240}(?:guarantee|promise)[^.\n]{0,240}sales[- ]volume|sales[- ]volume[^.\n]{0,180}(?:guarantee|promise)/]
	]) {
		if (!pattern.test(lower)) failures.push(`${path}: missing active-surface contract '${label}'`)
	}
}

if (failures.length) {
	console.error(JSON.stringify({status: "failed", surfaces, failures}, null, 2))
	process.exit(1)
}

console.log(JSON.stringify({status: "passed", surfaces, checked: required.map(([label]) => label), activeGeneratedOutputs, excluded: ["public/", "historical research"]}, null, 2))
