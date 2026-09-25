import {existsSync, lstatSync, readdirSync, readFileSync, statSync} from "node:fs"
import {join} from "node:path"

// Outbound records are private runtime state even when older entrypoints write
// them directly instead of using the canonical atomic-write helper.
process.umask(0o077)

function isJsonObject(value) {
	return value !== null && typeof value === "object" && !Array.isArray(value)
}

function readCanonicalJson(path) {
	if (!existsSync(path)) return {ok: false, reason: `missing ${path.split("/").at(-1)}`}
	try {
		const value = JSON.parse(readFileSync(path, "utf8"))
		return isJsonObject(value) ? {ok: true, value} : {ok: false, reason: `${path.split("/").at(-1)} must be a JSON object`}
	} catch {
		return {ok: false, reason: `malformed ${path.split("/").at(-1)}`}
	}
}

export function classifyOutboundProspect(prospectPath) {
	if (!prospectPath || !existsSync(prospectPath)) {
		return {ok: false, path: prospectPath, reason: "prospect folder not found"}
	}

	try {
		if (!statSync(prospectPath).isDirectory()) {
			return {ok: false, path: prospectPath, reason: "prospect path is not a folder"}
		}
	} catch {
		return {ok: false, path: prospectPath, reason: "prospect folder cannot be inspected"}
	}

	if (isServiceApplicationFolder(prospectPath)) {
		return {ok: false, excluded: true, path: prospectPath, reason: "service application folder (service-application.json present)"}
	}

	const metadataResult = readCanonicalJson(join(prospectPath, "metadata.json"))
	if (!metadataResult.ok) return {ok: false, path: prospectPath, reason: metadataResult.reason}
	if (typeof metadataResult.value.name !== "string" || !metadataResult.value.name.trim()) {
		return {ok: false, path: prospectPath, reason: "metadata.name must be a non-empty string"}
	}

	const pipelineResult = readCanonicalJson(join(prospectPath, "pipeline.json"))
	if (!pipelineResult.ok) return {ok: false, path: prospectPath, reason: pipelineResult.reason}
	if (typeof pipelineResult.value.stage !== "string" || !pipelineResult.value.stage.trim()) {
		return {ok: false, path: prospectPath, reason: "pipeline.stage must be a non-empty string"}
	}

	return {ok: true, path: prospectPath, metadata: metadataResult.value, pipeline: pipelineResult.value}
}

export function isServiceApplicationFolder(prospectPath) {
	try {
		lstatSync(join(prospectPath, "service-application.json"))
		return true
	} catch (error) {
		if (error?.code === "ENOENT") return false
		throw error
	}
}

export function listOutboundProspectFolders(root = "prospects") {
	if (!existsSync(root)) return []
	const results = readdirSync(root, {withFileTypes: true})
		.filter(entry => entry.isDirectory())
		.map(entry => join(root, entry.name))
		.map(path => classifyOutboundProspect(path))
	const blocked = results.filter(result => !result.ok && !result.excluded)
	if (blocked.length) console.warn(`Outbound prospect records skipped; repair required: ${blocked.map(result => `${result.path}: ${result.reason}`).join("; ")}`)
	return results
		.filter(result => result.ok)
		.map(result => result.path)
		.sort((left, right) => (left < right ? -1 : left > right ? 1 : 0))
}

export function assertOutboundProspectPath(prospectPath) {
	const result = classifyOutboundProspect(prospectPath)
	if (result.ok) return result
	throw new Error(`Refusing outbound operation for ${prospectPath || "<missing path>"}: ${result.reason}`)
}

export function guardOutboundProspectPath(prospectPath) {
	try {
		return assertOutboundProspectPath(prospectPath)
	} catch (error) {
		console.error(error.message)
		process.exit(1)
	}
}
