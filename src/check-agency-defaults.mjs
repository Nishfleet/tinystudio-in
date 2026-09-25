#!/usr/bin/env node
import {existsSync, readdirSync, readFileSync} from "node:fs"
import {extname, join} from "node:path"
import {agencyConfig} from "./lib/agency-config.mjs"
import {isServiceApplicationFolder} from "./lib/outbound-prospects.mjs"
import {codeRoot, serviceRoot} from "./lib/runtime-roots.mjs"
import {NO_GUARANTEE_OUTCOMES} from "./lib/service-contract.mjs"

const config = agencyConfig()
const canonicalConfigPath = join(codeRoot, "growth-brain/ops/agency-config.json")
const canonicalConfig = existsSync(canonicalConfigPath) ? JSON.parse(readFileSync(canonicalConfigPath, "utf8")) : {}
const requiredStringKeys = ["founderName", "offerName", "buyer", "founderSprintPrice", "scope", "dayZeroRule", "automationBoundary", "optOutLine", "meetingPlaceholder", "paymentPlaceholder"]

const contentRoots = [join(codeRoot, "README.md"), join(codeRoot, "MEMORY.md"), join(codeRoot, "TASKS.md"), join(codeRoot, "growth-brain"), join(serviceRoot, "prospects"), join(serviceRoot, "clients")]

const allowedFiles = new Set([join(codeRoot, "growth-brain/ops/agency-config.json"), join(serviceRoot, "growth-brain/ops/agency-config.json")])

const checkedExtensions = new Set([".md", ".html", ".json", ".txt"])
const failures = []
const scanned = []

const requiredArrayValues = [
	["includedDeliverables", ["fault map", "rewrite or redesign", "one implementation pass or dev-ready handoff", "search-trust basics", "before/after proof", "Loom", "measurement plan", "one revision", "14-day implementation tracking"]],
	["humanReviewGates", ["fit", "claims", "client-facing work", "delivery/acceptance", "renewal"]],
	["noGuarantees", NO_GUARANTEE_OUTCOMES]
]
const requiredArrayKeys = ["legacyFounderSprintPrices", "legacyPriceRanges", "legacyOfferNames"]
const requiredIntegerKeys = ["manualDailySendCap", "humanDailyReviewCap"]

function listFiles(path, excludeServiceApplications = false) {
	if (!existsSync(path)) return []
	const entries = readdirSync(path, {withFileTypes: true})
	const files = []
	for (const entry of entries) {
		const target = join(path, entry.name)
		if (entry.isDirectory()) {
			if (excludeServiceApplications && isServiceApplicationFolder(target)) continue
			files.push(...listFiles(target, excludeServiceApplications))
		} else if (entry.isFile() && checkedExtensions.has(extname(entry.name))) {
			files.push(target)
		}
	}
	return files
}

for (const key of requiredStringKeys) {
	if (!(key in canonicalConfig) || typeof canonicalConfig[key] !== "string" || !canonicalConfig[key].trim()) {
		failures.push(`canonical agency-config missing required value: ${key}`)
	}
	if (typeof config[key] !== "string" || !config[key].trim()) {
		failures.push(`agency-config missing required value: ${key}`)
	}
}

for (const retiredKey of ["standardSprintPriceRange", "monthlyContinuationRange", "fullStackRetainerRange", "operatorPodRange"]) {
	if (retiredKey in config) failures.push(`agency-config retains retired offer ladder key: ${retiredKey}`)
}

for (const [key, expected] of requiredArrayValues) {
	if (!(key in canonicalConfig) || !Array.isArray(canonicalConfig[key]) || expected.some(value => !canonicalConfig[key].includes(value))) {
		failures.push(`canonical agency-config missing current service values in ${key}`)
	}
	if (!Array.isArray(config[key]) || expected.some(value => !config[key].includes(value))) {
		failures.push(`agency-config missing current service values in ${key}`)
	}
}

for (const key of requiredArrayKeys) {
	if (!(key in canonicalConfig) || !Array.isArray(canonicalConfig[key])) {
		failures.push(`canonical agency-config must define ${key} as an array`)
	}
	if (!Array.isArray(config[key])) {
		failures.push(`agency-config must define ${key} as an array`)
	}
}

for (const key of requiredIntegerKeys) {
	if (!(key in canonicalConfig) || !Number.isInteger(canonicalConfig[key]) || canonicalConfig[key] <= 0) {
		failures.push(`canonical agency-config ${key} must be a positive integer`)
	}
	if (!Number.isInteger(config[key]) || config[key] <= 0) {
		failures.push(`agency-config ${key} must be a positive integer`)
	}
}

const bannedValues = [...(config.legacyFounderSprintPrices || []), ...(config.legacyPriceRanges || []), ...(config.legacyOfferNames || [])].filter(Boolean)

const files = contentRoots.flatMap(root => {
	if (!existsSync(root)) return []
	if (checkedExtensions.has(extname(root))) return [root]
	return listFiles(root, root === join(serviceRoot, "prospects"))
})

for (const file of files) {
	if (allowedFiles.has(file)) continue
	const content = readFileSync(file, "utf8")
	scanned.push(file)
	for (const bannedValue of bannedValues) {
		if (content.includes(bannedValue)) {
			failures.push(`${file} contains stale agency default: ${bannedValue}`)
		}
	}
}

if (failures.length) {
	console.error(JSON.stringify({status: "failed", scanned: scanned.length, failures}, null, 2))
	process.exit(1)
}

console.log(JSON.stringify({status: "passed", scanned: scanned.length, requiredStringKeys, bannedValues: bannedValues.length}, null, 2))
