#!/usr/bin/env node

import {createHash} from "node:crypto"
import {spawnSync} from "node:child_process"
import {existsSync, lstatSync, mkdtempSync, readFileSync, realpathSync, rmSync} from "node:fs"
import {fileURLToPath} from "node:url"
import {dirname, isAbsolute, join, resolve} from "node:path"
import {tmpdir} from "node:os"

const CONTRACT_FILES = ["contracts/sprint-application.v1.schema.json", "contracts/review-decision.v1.schema.json", "contracts/fixtures/sprint-application.v1.json", "contracts/fixtures/review-decision.v1.json"]
const EXPECTED_SCHEMA_DIGESTS = {"contracts/sprint-application.v1.schema.json": "d4fadcb1d82628ffd7f1aaee55b23163b56583ff5a2da6762487fc0e6ab18da2", "contracts/review-decision.v1.schema.json": "e12f83e8bb24f180209634e89143d6b27606397f2d241516d65cb8ab45aa9a24"}
const EXPECTED_SCHEMA_IDS = {"contracts/sprint-application.v1.schema.json": "https://tinystudio.io/contracts/sprint-application.v1.schema.json", "contracts/review-decision.v1.schema.json": "https://tinystudio.io/contracts/review-decision.v1.schema.json"}
const FIXTURE_SCHEMA_DIGESTS = {"contracts/fixtures/sprint-application.v1.json": EXPECTED_SCHEMA_DIGESTS[CONTRACT_FILES[0]], "contracts/fixtures/review-decision.v1.json": EXPECTED_SCHEMA_DIGESTS[CONTRACT_FILES[1]]}

function fail(message) {
	throw new Error(message)
}

function usage() {
	return "Usage: node scripts/test-cross-repo-service.mjs --public-repo /absolute/path"
}

function parseArgs(argv) {
	if (argv.length !== 2 || argv[0] !== "--public-repo" || !argv[1]) fail(usage())
	if (!isAbsolute(argv[1])) fail(`--public-repo must be an absolute path (received ${argv[1]}).`)
	return resolve(argv[1])
}

function findRepoRoot(start) {
	let current = resolve(start)
	while (true) {
		if (existsSync(join(current, "contracts")) && existsSync(join(current, "scripts", "test-service-engine.mjs"))) return current
		const parent = dirname(current)
		if (parent === current) return null
		current = parent
	}
}

function requireRegularFile(path, label) {
	if (!existsSync(path)) fail(`${label} is missing: ${path}`)
	let stat
	try {
		stat = lstatSync(path)
	} catch (error) {
		fail(`Unable to inspect ${label} ${path}: ${error.message}`)
	}
	if (!stat.isFile()) fail(`${label} is not a regular file: ${path}`)
}

function sha256(bytes) {
	return createHash("sha256").update(bytes).digest("hex")
}

function readJson(path, label) {
	try {
		return JSON.parse(readFileSync(path, "utf8"))
	} catch (error) {
		fail(`${label} is not valid JSON (${path}): ${error.message}`)
	}
}

function compareContracts(opsRoot, publicRoot) {
	for (const relativePath of CONTRACT_FILES) {
		const opsPath = join(opsRoot, relativePath)
		const publicPath = join(publicRoot, relativePath)
		requireRegularFile(opsPath, "Ops contract file")
		requireRegularFile(publicPath, "Public contract file")

		const opsBytes = readFileSync(opsPath)
		const publicBytes = readFileSync(publicPath)
		const opsDigest = sha256(opsBytes)
		const publicDigest = sha256(publicBytes)
		if (!opsBytes.equals(publicBytes)) {
			fail(`Contract drift in ${relativePath}: ops sha256 ${opsDigest}, public sha256 ${publicDigest}. Files must match byte-for-byte.`)
		}

		const expectedDigest = EXPECTED_SCHEMA_DIGESTS[relativePath]
		if (expectedDigest && opsDigest !== expectedDigest) {
			fail(`Unexpected ${relativePath} sha256: ${opsDigest}; expected frozen digest ${expectedDigest}.`)
		}

		if (EXPECTED_SCHEMA_IDS[relativePath]) {
			const schema = readJson(opsPath, "Ops schema")
			if (schema.$id !== EXPECTED_SCHEMA_IDS[relativePath]) {
				fail(`Unexpected $id in ${relativePath}: ${String(schema.$id)}; expected ${EXPECTED_SCHEMA_IDS[relativePath]}.`)
			}
		}

		const expectedFixtureDigest = FIXTURE_SCHEMA_DIGESTS[relativePath]
		if (expectedFixtureDigest) {
			const fixture = readJson(opsPath, "Ops fixture")
			if (fixture.schemaDigest !== expectedFixtureDigest) {
				fail(`Fixture ${relativePath} carries schemaDigest ${String(fixture.schemaDigest)}; expected ${expectedFixtureDigest}.`)
			}
		}

		console.log(`Contract match: ${relativePath} (sha256 ${opsDigest})`)
	}
}

function runScript(repoRoot, script, env, label) {
	const scriptPath = join(repoRoot, script)
	requireRegularFile(scriptPath, `${label} script`)
	const result = spawnSync(process.execPath, [scriptPath], {cwd: repoRoot, env: {...process.env, ...env}, encoding: "utf8"})
	if (result.error) fail(`${label} could not start: ${result.error.message}`)
	if (result.status !== 0) {
		const output = [result.stdout, result.stderr].filter(Boolean).join("\n").trim()
		fail(`${label} failed with exit code ${String(result.status)}${result.signal ? ` (${result.signal})` : ""}.${output ? `\n${output}` : ""}`)
	}
	return result
}

function main() {
	const publicRoot = parseArgs(process.argv.slice(2))
	const scriptDirectory = realpathSync(dirname(fileURLToPath(import.meta.url)))
	const opsRoot = findRepoRoot(scriptDirectory)
	if (!opsRoot) fail("Could not locate the autonomous-service ops repository root from this script.")
	if (!existsSync(publicRoot)) fail(`Public repository does not exist: ${publicRoot}`)
	const publicRealRoot = realpathSync(publicRoot)
	compareContracts(opsRoot, publicRealRoot)

	const tempRoot = mkdtempSync(join(tmpdir(), "tinystudio-cross-repo-service-"))
	const exportPath = join(tempRoot, "application-export.json")
	try {
		runScript(publicRealRoot, "scripts/test-worker.mjs", {SERVICE_TEST_EXPORT: exportPath}, "Public worker test")
		requireRegularFile(exportPath, "Public worker export")
		if (readFileSync(exportPath).length === 0) fail(`Public worker export is empty: ${exportPath}`)
		runScript(opsRoot, "scripts/test-service-engine.mjs", {SERVICE_FIXTURE_INPUT: exportPath}, "Ops service-engine test")
		console.log("Cross-repo service contract test passed.")
	} finally {
		rmSync(tempRoot, {recursive: true, force: true})
	}
}

try {
	main()
} catch (error) {
	console.error(`Cross-repo service contract test failed: ${error.message}`)
	process.exitCode = 1
}
