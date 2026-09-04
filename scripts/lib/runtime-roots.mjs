import {execFileSync} from "node:child_process"
import {dirname, resolve} from "node:path"
import {fileURLToPath} from "node:url"

export const codeRoot = dirname(dirname(dirname(fileURLToPath(import.meta.url))))
export const serviceRoot = resolve(process.env.SERVICE_REPO_ROOT || process.cwd())

function runJson(args, cwd) {
	// Child processes inherit the parent environment; SERVICE_TEST_NOW (and the
	// test-fixed-clock import in NODE_OPTIONS) must pass through so tracked
	// operator artifacts stay on the fixed clock inside nested generations.
	return JSON.parse(execFileSync(process.execPath, [resolve(codeRoot, args[0]), ...args.slice(1)], {cwd, encoding: "utf8", stdio: ["ignore", "pipe", "pipe"]}))
}

export function runRepoJson(args) {
	return runJson(args, serviceRoot)
}

// Code-only gates inspect the canonical checkout while still inheriting
// SERVICE_REPO_ROOT for data and local configuration.
export function runCodeRepoJson(args) {
	return runJson(args, codeRoot)
}
