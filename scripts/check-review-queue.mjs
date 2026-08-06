#!/usr/bin/env node
import {checkQueue} from "./lib/review-queue.mjs"

const args = process.argv.slice(2)
const values = new Map()

try {
	for (let index = 0; index < args.length; index += 1) {
		const argument = args[index]
		if (!argument.startsWith("--")) throw new Error(`unexpected positional argument: ${argument}`)
		const equals = argument.indexOf("=")
		const name = argument.slice(2, equals >= 0 ? equals : undefined)
		if (!["scope", "as-of"].includes(name)) throw new Error(`unknown option: --${name}`)
		const value = equals >= 0 ? argument.slice(equals + 1) : args[index + 1]
		if (!value || value.startsWith("--")) throw new Error(`--${name} requires a value`)
		values.set(name, value)
		if (equals < 0) index += 1
	}

	const repoRoot = process.env.SERVICE_REPO_ROOT || process.cwd()
	const result = checkQueue({repoRoot, scope: values.get("scope") || "all", ...(values.get("as-of") ? {asOfDate: values.get("as-of")} : {})})
	console.log(JSON.stringify(result, null, 2))
	if (result.status !== "passed") process.exit(1)
} catch (error) {
	console.error(`service:queue-check failed: ${error.message}`)
	process.exit(1)
}
