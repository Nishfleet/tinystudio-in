#!/usr/bin/env node
import assert from "node:assert/strict"
import {chmodSync, lstatSync, mkdirSync, readFileSync, readdirSync, realpathSync, renameSync, rmSync, writeFileSync} from "node:fs"
import {randomUUID} from "node:crypto"
import {basename, dirname, isAbsolute, join, relative, resolve, sep} from "node:path"
import {acquireLock, isRfc3339Timestamp, sha256} from "./lib/service-contract.mjs"
import {pendingReviewCapJournalApplicationId, queuePaths} from "./lib/review-queue.mjs"
import {pendingPromotionApplicationIds} from "./lib/service-promotion-journal.mjs"

const CONTRACT = "tinystudio.private-service-backup"
const RECORD_ROOTS = ["clients", "prospects", "service-decisions"]
const OUTPUT_ROOT = "runs/service-engine/outputs"
const SOURCE_ROOTS = [...RECORD_ROOTS, OUTPUT_ROOT]
const MANIFEST = "manifest.json"
const TRANSITION_JOURNAL = "service-transition-journal.json"

function exactKeys(value, expected, name) {
	assert.deepEqual(Object.keys(value).sort(), [...expected].sort(), `${name} keys are invalid`)
}

function containedBy(root, path) {
	const value = relative(root, path)
	return value === "" || (value !== ".." && !value.startsWith(`..${sep}`) && !isAbsolute(value))
}

function entryExists(path) {
	try {
		lstatSync(path)
		return true
	} catch (error) {
		if (error?.code === "ENOENT") return false
		throw error
	}
}

function privateDirectory(path, base) {
	mkdirSync(path, {recursive: true, mode: 0o700})
	for (let current = path; ; current = dirname(current)) {
		assert(containedBy(base, current), "backup destination escapes staging")
		chmodSync(current, 0o700)
		if (current === base) break
	}
}

function sourceDirectory(repoRoot, relativeRoot) {
	let current = repoRoot
	for (const part of relativeRoot.split("/")) {
		current = join(current, part)
		if (!entryExists(current)) return ""
		const stat = lstatSync(current)
		assert(stat.isDirectory() && !stat.isSymbolicLink(), `backup root must be a real directory: ${relativeRoot}`)
	}
	return current
}

function safePath(path) {
	assert(typeof path === "string" && path && !isAbsolute(path), "backup manifest path is invalid")
	const parts = path.split(/[\\/]/)
	assert(
		parts.every(part => part && part !== "." && part !== ".."),
		"backup manifest path is invalid"
	)
	const normalized = parts.join("/")
	const recordRoot = RECORD_ROOTS.find(root => normalized === root || normalized.startsWith(`${root}/`))
	if (recordRoot) return recordRoot
	assert(["runs", "runs/service-engine", OUTPUT_ROOT].includes(normalized) || normalized.startsWith(`${OUTPUT_ROOT}/`), "backup manifest path is outside canonical service roots")
	return OUTPUT_ROOT
}

function walk(root, {copyTo = "", skipManifest = false, verifyModes = false} = {}) {
	const entries = []
	function visit(path, relativePath) {
		const stat = lstatSync(path)
		assert(!stat.isSymbolicLink(), `backup refuses symbolic link: ${relativePath}`)
		if (verifyModes) assert((stat.mode & 0o777) === (stat.isDirectory() ? 0o700 : 0o600), `backup permission mismatch: ${relativePath || "."}`)
		if (stat.isDirectory()) {
			if (relativePath) entries.push({path: relativePath, type: "directory"})
			if (copyTo && relativePath) {
				mkdirSync(join(copyTo, relativePath), {mode: 0o700})
				chmodSync(join(copyTo, relativePath), 0o700)
			}
			for (const name of readdirSync(path).sort()) {
				if (skipManifest && !relativePath && name === MANIFEST) continue
				visit(join(path, name), relativePath ? join(relativePath, name) : name)
			}
		} else {
			assert(stat.isFile(), `backup refuses non-regular file: ${relativePath}`)
			const content = readFileSync(path)
			entries.push({path: relativePath, type: "file", bytes: content.length, sha256: sha256(content)})
			if (copyTo) {
				const destination = join(copyTo, relativePath)
				mkdirSync(dirname(destination), {recursive: true, mode: 0o700})
				writeFileSync(destination, content, {mode: 0o600})
				chmodSync(destination, 0o600)
			}
		}
	}
	visit(root, "")
	return entries
}

function validateManifest(value) {
	assert(value && typeof value === "object" && !Array.isArray(value), "backup manifest must be an object")
	exactKeys(value, ["contract", "version", "createdAt", "entries"], "backup manifest")
	assert(value.contract === CONTRACT && value.version === 1, "backup manifest contract is invalid")
	assert(isRfc3339Timestamp(value.createdAt), "backup manifest createdAt is invalid")
	assert(Array.isArray(value.entries) && value.entries.length, "backup manifest entries are invalid")
	const seen = new Set()
	const roots = new Set()
	for (const entry of value.entries) {
		assert(entry && typeof entry === "object" && !Array.isArray(entry), "backup manifest entry is invalid")
		exactKeys(entry, entry.type === "directory" ? ["path", "type"] : ["path", "type", "bytes", "sha256"], "backup manifest entry")
		roots.add(safePath(entry.path))
		assert(!seen.has(entry.path), "backup manifest has duplicate paths")
		seen.add(entry.path)
		assert(["directory", "file"].includes(entry.type), "backup manifest entry type is invalid")
		if (entry.type === "file") {
			assert(Number.isInteger(entry.bytes) && entry.bytes >= 0, "backup manifest file size is invalid")
			assert(/^[a-f0-9]{64}$/.test(entry.sha256), "backup manifest file hash is invalid")
		}
	}
	assert(
		[...roots].every(root => value.entries.some(entry => entry.path === root && entry.type === "directory")),
		"backup manifest root directory is missing"
	)
	return value
}

function verify(repoPath, inputPath) {
	assert(isAbsolute(inputPath || ""), "--input must be an absolute backup path")
	const repoRoot = realpathSync(resolve(repoPath))
	const requested = resolve(inputPath)
	const inputStat = lstatSync(requested)
	assert(inputStat.isDirectory() && !inputStat.isSymbolicLink(), "backup input must be a real directory")
	const root = realpathSync(requested)
	assert(!containedBy(repoRoot, root), "backup input must be outside the repository")
	assert((inputStat.mode & 0o777) === 0o700, "backup root permissions must be 0700")
	const manifestPath = join(root, MANIFEST)
	const manifestStat = lstatSync(manifestPath)
	assert(manifestStat.isFile() && !manifestStat.isSymbolicLink(), "backup manifest must be a regular file")
	assert((manifestStat.mode & 0o777) === 0o600, "backup manifest permissions must be 0600")
	const manifest = validateManifest(JSON.parse(readFileSync(manifestPath, "utf8")))
	const actual = walk(root, {skipManifest: true, verifyModes: true})
	assert.deepEqual(actual, manifest.entries, "backup file manifest mismatch")
	const roots = [...new Set(actual.map(entry => safePath(entry.path)))]
	return {status: "passed", input: root, roots, files: actual.filter(entry => entry.type === "file").length}
}

function create(repoPath, requestedOutput) {
	assert(isAbsolute(requestedOutput || ""), "--output must be an absolute path outside the repository")
	const repoRoot = realpathSync(resolve(repoPath))
	const outputParent = realpathSync(dirname(resolve(requestedOutput)))
	const output = join(outputParent, basename(requestedOutput))
	assert(!containedBy(repoRoot, output), "backup output must be outside the repository")
	assert(!entryExists(output), "backup output already exists")
	const staging = join(outputParent, `.${basename(output)}.tmp-${randomUUID()}`)
	let committed = false
	const release = acquireLock(queuePaths(repoRoot).lockDir)
	try {
		const pendingPromotions = pendingPromotionApplicationIds(repoRoot)
		assert(!pendingPromotions.length, `service promotion journal requires repair before backup: ${pendingPromotions.join(", ")}`)
		const pendingTransitions = RECORD_ROOTS.flatMap(root => {
			const source = sourceDirectory(repoRoot, root)
			return source
				? walk(source)
						.filter(entry => entry.type === "file" && basename(entry.path) === TRANSITION_JOURNAL)
						.map(entry => join(root, entry.path))
				: []
		})
		assert(!pendingTransitions.length, `service transition journal requires repair before backup: ${pendingTransitions.join(", ")}`)
		let pendingReviewCap = ""
		try {
			pendingReviewCap = pendingReviewCapJournalApplicationId(repoRoot)
		} catch (error) {
			throw new Error(`review cap decision journal requires repair before backup: ${error.message}`)
		}
		assert(!pendingReviewCap, `review cap decision journal requires repair before backup: ${pendingReviewCap}`)
		mkdirSync(staging, {mode: 0o700})
		chmodSync(staging, 0o700)
		for (const root of SOURCE_ROOTS) {
			const source = sourceDirectory(repoRoot, root)
			if (!source) continue
			const destination = join(staging, root)
			privateDirectory(destination, staging)
			walk(source, {copyTo: destination})
		}
		const entries = walk(staging, {verifyModes: true})
		assert(
			entries.some(entry => entry.type === "file"),
			"no canonical private service state exists to back up"
		)
		const manifest = {contract: CONTRACT, version: 1, createdAt: new Date().toISOString(), entries}
		writeFileSync(join(staging, MANIFEST), `${JSON.stringify(manifest, null, 2)}\n`, {mode: 0o600})
		chmodSync(join(staging, MANIFEST), 0o600)
		assert(!entryExists(output), "backup output already exists")
		renameSync(staging, output)
		committed = true
		chmodSync(output, 0o700)
		return verify(repoRoot, output)
	} catch (error) {
		rmSync(staging, {recursive: true, force: true})
		if (committed) rmSync(output, {recursive: true, force: true})
		throw error
	} finally {
		release()
	}
}

function option(args, name) {
	const index = args.findIndex(value => value === `--${name}` || value.startsWith(`--${name}=`))
	if (index < 0) return ""
	return args[index].includes("=") ? args[index].split("=").slice(1).join("=") : args[index + 1] || ""
}

try {
	const [mode, ...args] = process.argv.slice(2)
	assert(["create", "verify"].includes(mode), "usage: service-state-backup.mjs create --output /absolute/path | verify --input /absolute/path")
	const repoRoot = process.env.SERVICE_REPO_ROOT || process.cwd()
	console.log(JSON.stringify(mode === "create" ? create(repoRoot, option(args, "output")) : verify(repoRoot, option(args, "input")), null, 2))
} catch (error) {
	console.error(`service state backup failed: ${error.message}`)
	process.exit(1)
}
