#!/usr/bin/env node
import {applyQueue, checkQueue, prepareQueue} from "./lib/review-queue.mjs"

const args = process.argv.slice(2)
const valueOptions = new Set(["mode", "application", "scope", "as-of"])
const booleanOptions = new Set(["apply", "check", "dry-run"])
const values = new Map()
const flags = new Set()

try {
	for (let index = 0; index < args.length; index += 1) {
		const argument = args[index]
		if (!argument.startsWith("--")) throw new Error(`unexpected positional argument: ${argument}`)
		const equals = argument.indexOf("=")
		if (equals >= 0) {
			const name = argument.slice(2, equals)
			const value = argument.slice(equals + 1)
			if (!valueOptions.has(name)) throw new Error(`unknown option: --${name}`)
			if (!value) throw new Error(`--${name} requires a value`)
			values.set(name, value)
			continue
		}
		const name = argument.slice(2)
		if (booleanOptions.has(name)) {
			flags.add(name)
			continue
		}
		if (!valueOptions.has(name)) throw new Error(`unknown option: --${name}`)
		const value = args[index + 1]
		if (!value || value.startsWith("--")) throw new Error(`--${name} requires a value`)
		values.set(name, value)
		index += 1
	}

	const explicitModes = [values.get("mode"), flags.has("apply") ? "apply" : "", flags.has("check") ? "check" : ""].filter(Boolean)
	if (explicitModes.length > 1) throw new Error("choose only one queue mode")
	const mode = explicitModes[0] || "prepare"
	if (!["prepare", "check", "apply"].includes(mode)) throw new Error(`invalid queue mode: ${mode}`)

	const repoRoot = process.env.SERVICE_REPO_ROOT || process.cwd()
	const options = {repoRoot, scope: values.get("scope") || "all", dryRun: flags.has("dry-run"), ...(values.get("application") ? {applicationId: values.get("application")} : {}), ...(values.get("as-of") ? {asOfDate: values.get("as-of")} : {})}
	const result = mode === "apply" ? applyQueue(options) : mode === "check" ? checkQueue(options) : prepareQueue(options)
	console.log(JSON.stringify(result, null, 2))
	if (mode === "check" && result.status !== "passed") process.exitCode = 1
} catch (error) {
	console.error(`service:queue failed: ${error.message}`)
	process.exit(1)
}
