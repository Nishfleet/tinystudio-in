#!/usr/bin/env node
import {existsSync, readFileSync, readdirSync} from "node:fs"
import {join} from "node:path"
import {agencyConfig} from "./lib/agency-config.mjs"
import {ALLOWED_COMMANDS, APPLICATION_WEBSITE_PATTERN_SOURCE, DENIED_ACTIONS} from "./lib/service-contract.mjs"
import {codeRoot, serviceRoot} from "./lib/runtime-roots.mjs"

const requiredFiles = [
	"PRODUCT.md",
	"AGENT_WORKFLOW.md",
	"growth-brain/README.md",
	"growth-brain/offer.md",
	"growth-brain/agency-operating-model.md",
	"growth-brain/build-roadmap.md",
	"growth-brain/sprint-checklist.md",
	"growth-brain/delivery-template.md",
	"growth-brain/delivery/implementation-handoff-template.md",
	"growth-brain/quality/claim-proof-ledger.md",
	"growth-brain/quality/delivery-scorecard.md",
	"growth-brain/quality/sprint-acceptance-checklist.md",
	"growth-brain/sales/buyer-room-template.md",
	"growth-brain/sales/managed-it-one-page-offer.md",
	"growth-brain/sales/managed-it-one-page-offer.html",
	"growth-brain/sales/follow-up-sequences.md",
	"growth-brain/sales/one-page-offer.md",
	"growth-brain/sales/pricing-rules.md",
	"growth-brain/sales/proposal-template.md",
	"growth-brain/workflows/client-sprint-workflow.md",
	"growth-brain/workflows/human-review-service-engine.md",
	"contracts/sprint-application.v1.schema.json",
	"contracts/review-decision.v1.schema.json",
	"scripts/check-client-readiness.mjs",
	"scripts/check-product-truth.mjs",
	"scripts/check-retention-automation.mjs",
	"scripts/create-client-sprint.mjs",
	"scripts/convert-prospect-to-client.mjs",
	"scripts/import-sprint-application.mjs",
	"scripts/record-service-decision.mjs",
	"scripts/record-service-day0.mjs",
	"scripts/record-service-evidence.mjs",
	"scripts/record-service-resume.mjs",
	"scripts/repair-service-transition.mjs",
	"scripts/service-state-backup.mjs",
	"scripts/run-review-queue.mjs",
	"scripts/test-client-readiness-contract.mjs",
	"scripts/test-service-engine.mjs"
]

const retiredClientCommands = ["client:dashboard", "client:weekly-report", "client:weekly-check", "client:channels", "client:channels-check", "client:workflow", "client:weekly-loop", "client:renewal"]

const retiredGenerators = [
	"export-client-weekly-report.mjs",
	"export-client-channel-readiness.mjs",
	"export-client-repeatable-workflow.mjs",
	"export-client-facing-dashboard.mjs",
	"export-client-renewal-review.mjs",
	"export-retention-checkups.mjs",
	"export-owned-handoff-loom-cockpit.mjs",
	"export-owned-product-case-studies.mjs"
]

const failures = []
const checked = []

function filesUnder(root) {
	if (!existsSync(root)) return []
	const files = []
	for (const entry of readdirSync(root, {withFileTypes: true})) {
		const path = join(root, entry.name)
		if (entry.isDirectory()) files.push(...filesUnder(path))
		else files.push(path)
	}
	return files
}

for (const path of requiredFiles) {
	const codePath = join(codeRoot, path)
	if (!existsSync(codePath)) {
		failures.push(`Missing current service file: ${path}`)
		continue
	}
	const content = readFileSync(codePath, "utf8").trim()
	if (content.length < 80) failures.push(`Current service file is too thin: ${path}`)
	checked.push(path)
}

const product = existsSync(join(codeRoot, "PRODUCT.md")) ? readFileSync(join(codeRoot, "PRODUCT.md"), "utf8") : ""
for (const phrase of ["The Website Correction", "$1,000 founder pilot", "one highest-leverage page", "rewrite or redesign", "14-day implementation tracking", "Human review gates", "Client delay pauses the clock"]) {
	if (!product.toLowerCase().includes(phrase.toLowerCase())) failures.push(`PRODUCT.md missing '${phrase}'`)
}

const applicationSchema = JSON.parse(readFileSync(join(codeRoot, "contracts/sprint-application.v1.schema.json"), "utf8"))
if (applicationSchema.properties?.applicant?.properties?.website?.pattern !== APPLICATION_WEBSITE_PATTERN_SOURCE) failures.push("Application schema website contract must accept only host-bearing, credential-free HTTP(S) URLs")

const workflowPath = join(codeRoot, "growth-brain/workflows/human-review-service-engine.md")
const workflow = existsSync(workflowPath) ? readFileSync(workflowPath, "utf8") : ""
for (const phrase of ["fit", "claims", "client-facing", "delivery", "acceptance", "renewal", "send", "publish", "spend"]) {
	if (!workflow.toLowerCase().includes(phrase)) failures.push(`Human-review workflow missing '${phrase}' boundary`)
}

const followUpPath = join(codeRoot, "growth-brain/sales/follow-up-sequences.md")
const followUpSequence = existsSync(followUpPath) ? readFileSync(followUpPath, "utf8") : ""
const decisionStep = followUpSequence.indexOf("npm run service:decide -- APPLICATION_ID")
const applyStep = followUpSequence.indexOf("npm run service:queue -- --mode=apply --application APPLICATION_ID")
const day0Step = followUpSequence.indexOf("npm run service:day0 -- APPLICATION_ID")
if (!(decisionStep >= 0 && applyStep > decisionStep && day0Step > applyStep)) {
	failures.push("Post-sale service sequence must apply the human fit decision before Day 0")
}

const packagePath = join(codeRoot, "package.json")
const packageJson = existsSync(packagePath) ? JSON.parse(readFileSync(packagePath, "utf8")) : {scripts: {}}
for (const [alias, command] of Object.entries(packageJson.scripts || {})) {
	if (/^owned:/i.test(alias)) failures.push(`Retired owned command is active: ${alias}`)
	if (/\bnpm run\s+owned:/i.test(String(command))) failures.push(`Active package command emits a retired owned command: ${alias}`)
}
for (const command of retiredClientCommands) {
	if (packageJson.scripts[command]) failures.push(`Retired broad-service command is active: ${command}`)
}

for (const command of ["service:import", "service:decide", "service:day0", "service:resume", "service:repair", "service:backup", "service:backup-check", "service:evidence", "service:queue", "service:queue-check", "service:cross-repo-test", "product:truth"]) {
	if (!packageJson.scripts[command]) failures.push(`Missing service command: ${command}`)
}

const defaultGate = packageJson.scripts.test || ""
for (const gate of ["test-service-engine.mjs", "test-client-readiness-contract.mjs", "check-product-truth.mjs", "check-human-service-kit.mjs", "check-retention-automation.mjs", "test-retention-automation.mjs", "check-agency-defaults.mjs", "check-outbound-claim-safety.mjs", "check-outbound-send-readiness.mjs"]) {
	if (!defaultGate.includes(gate)) failures.push(`Default test gate omits ${gate}`)
}
if (!defaultGate.includes("test-outbound-send-readiness.mjs")) failures.push("Default test gate omits outbound send-readiness fixtures")
if (defaultGate.includes("test-cross-repo-service.mjs")) failures.push("Default test gate invokes cross-repo validation without its required public-repo argument")

const activeScriptFiles = new Set()
for (const command of Object.values(packageJson.scripts)) {
	for (const match of String(command).matchAll(/\bnode\s+(scripts\/[a-z0-9._/-]+\.mjs)\b/gi)) activeScriptFiles.add(match[1])
}
for (const path of activeScriptFiles) {
	const codePath = join(codeRoot, path)
	if (!existsSync(codePath)) {
		failures.push(`Active package command points to missing script ${path}`)
		continue
	}
	const source = readFileSync(codePath, "utf8")
	for (const match of source.matchAll(/\bnpm run\s+([a-z0-9:-]+)/gi)) {
		const alias = match[1]
		if (/^owned:/i.test(alias)) failures.push(`${path} emits a retired owned command`)
		if (!packageJson.scripts[alias]) failures.push(`${path} emits missing package command '${alias}'`)
	}
}

for (const path of filesUnder(join(codeRoot, "scripts"))) {
	if (path.startsWith(join(codeRoot, "scripts/retired"))) continue
	const source = readFileSync(path, "utf8")
	if (/^(?:# Retired:|[\s\S]{0,300}Status: Retired)/.test(source)) continue
	for (const match of source.matchAll(/\bnpm run\s+([a-z0-9:-]+)/gi)) {
		if (!packageJson.scripts[match[1]]) failures.push(`${path} emits missing package command '${match[1]}'`)
	}
}

const config = agencyConfig(serviceRoot)
for (const key of ["standardSprintPriceRange", "monthlyContinuationRange", "fullStackRetainerRange", "operatorPodRange"]) {
	if (key in config) failures.push(`Active agency config retains retired offer ladder key ${key}`)
}
if (!config.includedDeliverables?.includes("rewrite or redesign")) failures.push("Active agency config has stale rewrite/redesign scope")

for (const path of ["scripts/create-client-sprint.mjs", "scripts/convert-prospect-to-client.mjs"]) {
	const codePath = join(codeRoot, path)
	if (!existsSync(codePath)) continue
	const content = readFileSync(codePath, "utf8")
	for (const generator of retiredGenerators) {
		if (content.includes(generator)) failures.push(`${path} invokes retired generator ${generator}`)
	}
	for (const artifact of ["channel-readiness-scorecard.md", "conversion-optimization-scorecard.md", "week-1-report.md", "ai-search-audit.md"]) {
		if (content.includes(artifact)) failures.push(`${path} creates retired artifact ${artifact}`)
	}
}

const allowedCommandText = ALLOWED_COMMANDS.flat().join(" ")
for (const generator of retiredGenerators) {
	if (allowedCommandText.includes(generator)) failures.push(`Service queue exposes retired generator ${generator}`)
}
for (const denied of ["send", "publish", "spend", "renewal", "provider CLI"]) {
	if (!DENIED_ACTIONS.includes(denied)) failures.push(`Service contract omits denied action '${denied}'`)
}

const onePagerPath = join(codeRoot, "growth-brain/sales/managed-it-one-page-offer.html")
if (existsSync(onePagerPath)) {
	const onePager = readFileSync(onePagerPath, "utf8")
	if (!onePager.includes("The Website Correction")) failures.push("Managed IT one-pager has stale product name")
	if (/\*\*[^*]+\*\*/.test(onePager)) failures.push("Managed IT one-pager faults raw Markdown emphasis")
}

if (failures.length) {
	console.error(JSON.stringify({status: "failed", checked, failures}, null, 2))
	process.exit(1)
}

console.log(JSON.stringify({status: "passed", contract: "human-reviewed-service-kit", checkedFiles: checked.length, allowedCommands: ALLOWED_COMMANDS.length, preservedGates: ["client readiness", "product truth", "claims", "send readiness", "retention", "agency defaults"]}, null, 2))
