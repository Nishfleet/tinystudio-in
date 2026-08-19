#!/usr/bin/env node
// Guard against duplicate same-fix pull requests.
//
// The fleet keeps dispatching the same finding to multiple lanes, which
// produces duplicate same-fix PR pairs (e.g. #36/#44, #39/#49, #40/#52, and
// the #38/#48/#51 heading-hierarchy triple). This script compares the diff of
// the current PR against every other OPEN pull request and fails loudly when
// another open PR covers the same fix: same changed-file set (high coverage)
// with substantially overlapping patch text (high similarity). The workflow
// that calls it posts a comment naming the duplicate and the canonical PR so
// the duplication is visible instead of silent.
//
// Usage:
//   node scripts/check-pr-duplicates.mjs \
//     --pr 44 \
//     --repo nish3451/tinystudio-in \
//     [--token "$GITHUB_TOKEN"] \
//     [--json] [--comment] [--no-fail]
//
// Env fallbacks: GITHUB_REPOSITORY, GITHUB_TOKEN, GITHUB_BASE_REF.
//
// Exit code 0  no same-fix duplicate open PR found
// Exit code 1  duplicate found (or API failure), unless --no-fail
//
// Tuning (defaults calibrated against all open PRs in this repository on
// 2026-08-11: every pair meeting these thresholds was a genuine duplicate
// cluster member, and no unrelated pair reached them):
//   --threshold-coverage     min shared-file coverage of the smaller PR
//                            (default 0.8; observed duplicates are 1.0)
//   --threshold-similarity   min patch-text similarity on shared files
//                            (default 0.5; observed duplicates 0.54-1.0)

const BASE_URL = "https://api.github.com"
const COMMENT_MARKER = "<!-- pr-duplicate-guard -->"
const USER_AGENT = "check-pr-duplicates"

// --- diff parsing -----------------------------------------------------------

// parseDiff(text) -> Map<path, string[]>
// Splits a unified diff into one entry per file. Every line that follows a
// `diff --git` header belongs to that file's patch, including the header
// itself, so identical patches produce identical maps.
export function parseDiff(text) {
	const files = new Map()
	let current = null
	for (const line of String(text ?? "").split("\n")) {
		if (line.startsWith("diff --git ")) {
			const path = line.slice("diff --git a/".length).split(" b/")[0]
			current = path
			files.set(path, [line])
		} else if (current !== null) {
			files.get(current).push(line)
		}
	}
	return files
}

// --- similarity -------------------------------------------------------------

// ratio(a, b) -> number in [0, 1]
// Ratcliff-Obershelp similarity over line arrays (the same family as
// difflib.SequenceMatcher.ratio, which is what the observed duplicate pairs
// were calibrated against: identical patches score 1.0, the loosest observed
// duplicate pair scored 0.67).
export function ratio(a, b) {
	if (a.length === 0 && b.length === 0) return 1
	if (a.length === 0 || b.length === 0) return 0
	const bIndex = new Map()
	for (let i = 0; i < b.length; i++) {
		const line = b[i]
		if (!bIndex.has(line)) bIndex.set(line, [])
		bIndex.get(line).push(i)
	}
	const stack = [[0, a.length, 0, b.length]]
	let matchTotal = 0
	while (stack.length > 0) {
		const [aStart, aEnd, bStart, bEnd] = stack.pop()
		let bestA = -1
		let bestB = -1
		let bestLen = 0
		const j2len = new Map()
		for (let i = aStart; i < aEnd; i++) {
			const hits = bIndex.get(a[i]) ?? []
			const next = new Map()
			for (const j of hits) {
				if (j < bStart || j >= bEnd) continue
				const len = (j2len.get(j - 1) ?? 0) + 1
				next.set(j, len)
				if (len > bestLen) {
					bestLen = len
					bestA = i - len + 1
					bestB = j - len + 1
				} else if (len === bestLen && (bestB === -1 || j < bestB)) {
					bestA = i - len + 1
					bestB = j - len + 1
				}
			}
			j2len.clear()
			for (const [k, v] of next) j2len.set(k, v)
		}
		if (bestLen > 0) {
			matchTotal += 2 * bestLen
			stack.push([aStart, bestA, bStart, bestB])
			stack.push([bestA + bestLen, aEnd, bestB + bestLen, bEnd])
		}
	}
	return matchTotal / (a.length + b.length)
}

// comparePatches(a, b) -> {coverage, similarity, sharedFiles} | null
// coverage: shared changed files / smaller changed-file set.
// similarity: line ratio over the shared files' patches only.
export function comparePatches(a, b) {
	const filesA = [...a.keys()]
	const filesB = [...b.keys()]
	const shared = filesA.filter(path => b.has(path))
	const minFiles = Math.min(filesA.length, filesB.length)
	if (minFiles === 0 || shared.length === 0) return null
	const coverage = shared.length / minFiles
	const linesA = shared.flatMap(path => a.get(path))
	const linesB = shared.flatMap(path => b.get(path))
	return {coverage, similarity: ratio(linesA, linesB), sharedFiles: shared}
}

// --- GitHub API -------------------------------------------------------------

function makeApi({token, fetchImpl}) {
	const fetchFn = fetchImpl ?? globalThis.fetch
	return async function api(url, {accept, method = "GET", body} = {}) {
		const headers = {"User-Agent": USER_AGENT}
		if (accept) headers.Accept = accept
		if (token) headers.Authorization = `Bearer ${token}`
		if (body !== undefined) headers["Content-Type"] = "application/json"
		const res = await fetchFn(url, {method, headers, body: body === undefined ? undefined : JSON.stringify(body)})
		if (!res.ok) throw new Error(`GET/POST ${url} -> ${res.status} ${res.statusText}`)
		return res
	}
}

export {makeApi}

// listOpenPrs(api, owner, repo) -> array of PR objects (pulls list items).
export async function listOpenPrs(api, owner, repo) {
	const prs = []
	for (let page = 1; ; page++) {
		const res = await api(`${BASE_URL}/repos/${owner}/${repo}/pulls?state=open&per_page=100&page=${page}`)
		const batch = await res.json()
		prs.push(...batch)
		if (batch.length < 100) break
	}
	return prs
}

// fetchPatches(api, owner, repo, prs) -> Map<number, Map<path, string[]>>
// The pulls-list `diff_url` points at github.com, so build the API endpoint
// from owner/repo/number instead of trusting it.
export async function fetchPatches(api, owner, repo, prs) {
	const patches = new Map()
	for (const pr of prs) {
		const res = await api(`${BASE_URL}/repos/${owner}/${repo}/pulls/${pr.number}`, {accept: "application/vnd.github.v3.diff"})
		patches.set(pr.number, parseDiff(await res.text()))
	}
	return patches
}

// detectDuplicates({api, prs, patches, prNumber}) -> report
// Compares the given PR against every other open PR and returns matches above
// the thresholds (applied by the caller so tests can fix their own defaults).
export function detectDuplicates({api, prs, patches, prNumber, coverageThreshold, similarityThreshold}) {
	const current = prs.find(pr => pr.number === prNumber)
	if (!current) throw new Error(`PR #${prNumber} is not an open PR in this repository`)
	const currentPatch = patches.get(prNumber)
	const matches = []
	for (const pr of prs) {
		if (pr.number === prNumber) continue
		const other = patches.get(pr.number)
		const m = comparePatches(currentPatch, other)
		if (m && m.coverage >= coverageThreshold && m.similarity >= similarityThreshold) {
			matches.push({
				number: pr.number,
				title: pr.title,
				headRef: pr.head.ref,
				createdAt: pr.created_at,
				draft: pr.draft ?? false,
				coverage: m.coverage,
				similarity: m.similarity,
				sharedFiles: m.sharedFiles,
			})
		}
	}
	return {prNumber, currentTitle: current.title, currentHeadRef: current.head.ref, matches}
}

// canonicalNumber(matches) -> earliest open PR in the duplicate cluster.
export function canonicalNumber(matches) {
	return matches.reduce((best, m) => (m.createdAt < best.createdAt ? m : best), matches[0])?.number ?? null
}

// upsertComment(api, owner, repo, prNumber, body)
// Replaces any previous guard comment (identified by the marker) so the PR
// carries exactly one authoritative duplicate report.
export async function upsertComment(api, owner, repo, prNumber, body) {
	const list = await api(`${BASE_URL}/repos/${owner}/${repo}/issues/${prNumber}/comments`)
	const comments = await list.json()
	for (const comment of comments) {
		if (comment.body.includes(COMMENT_MARKER)) {
			await api(`${BASE_URL}/repos/${owner}/${repo}/issues/comments/${comment.id}`, {method: "DELETE"})
		}
	}
	await api(`${BASE_URL}/repos/${owner}/${repo}/issues/${prNumber}/comments`, {method: "POST", body})
}

function formatReport(report, repo) {
	const lines = []
	if (report.matches.length === 0) {
		lines.push(`No same-fix duplicate open PR for #${report.prNumber}.`)
		return lines.join("\n")
	}
	const canonical = canonicalNumber(report.matches)
	lines.push(`Same-fix duplicate open PRs detected for #${report.prNumber} (${report.currentTitle}).`)
	lines.push(`Canonical: #${canonical}. Close this PR and keep the canonical one, or consolidate the fix there.`)
	for (const m of report.matches) {
		lines.push(
			`- #${m.number} (${m.headRef}${m.draft ? ", draft" : ""}, opened ${m.createdAt.slice(0, 10)}): ` +
			`coverage=${(m.coverage * 100).toFixed(0)}%, similarity=${(m.similarity * 100).toFixed(0)}%, ` +
			`shared files: ${m.sharedFiles.slice(0, 8).join(", ")}${m.sharedFiles.length > 8 ? `, +${m.sharedFiles.length - 8} more` : ""}`,
		)
	}
	lines.push(`${COMMENT_MARKER}`)
	return lines.join("\n")
}

// --- CLI --------------------------------------------------------------------

function parseArgs(argv) {
	const args = {pr: null, repo: process.env.GITHUB_REPOSITORY ?? null, token: process.env.GITHUB_TOKEN ?? null, json: false, comment: false, noFail: false, coverageThreshold: 0.8, similarityThreshold: 0.5}
	for (let i = 0; i < argv.length; i++) {
		const arg = argv[i]
		const value = () => {
			i++
			if (i >= argv.length) throw new Error(`Missing value for ${arg}`)
			return argv[i]
		}
		if (arg === "--pr") args.pr = Number(value())
		else if (arg === "--repo") args.repo = value()
		else if (arg === "--token") args.token = value()
		else if (arg === "--json") args.json = true
		else if (arg === "--comment") args.comment = true
		else if (arg === "--no-fail") args.noFail = true
		else if (arg === "--threshold-coverage") args.coverageThreshold = Number(value())
		else if (arg === "--threshold-similarity") args.similarityThreshold = Number(value())
		else if (arg === "--help" || arg === "-h") { printUsage(); process.exit(0) }
		else throw new Error(`Unknown argument: ${arg}`)
	}
	if (!Number.isInteger(args.pr) || args.pr <= 0) throw new Error("--pr NUMBER is required")
	if (!args.repo || !args.repo.includes("/")) throw new Error("--repo OWNER/NAME is required (or GITHUB_REPOSITORY)")
	return args
}

function printUsage() {
	console.log(`Usage: node scripts/check-pr-duplicates.mjs --pr NUMBER [--repo OWNER/NAME] [--token TOKEN] [--json] [--comment] [--no-fail]
  --pr NUMBER               current pull request number (required)
  --repo OWNER/NAME         defaults to $GITHUB_REPOSITORY
  --token TOKEN             defaults to $GITHUB_TOKEN (public reads work without it)
  --json                    print a machine-readable report
  --comment                 post/update one marker comment on the PR
  --no-fail                 exit 0 even when duplicates are found
  --threshold-coverage N    min shared-file coverage (default 0.8)
  --threshold-similarity N  min patch similarity (default 0.5)`)
}

async function run(argv, env = process.env, fetchImpl) {
	const args = parseArgs(argv)
	const [owner, repo] = args.repo.split("/")
	const api = makeApi({token: args.token, fetchImpl})
	const prs = await listOpenPrs(api, owner, repo)
	const patches = await fetchPatches(api, owner, repo, prs)
	const report = detectDuplicates({api, prs, patches, prNumber: args.pr, coverageThreshold: args.coverageThreshold, similarityThreshold: args.similarityThreshold})

	if (args.json) {
		console.log(JSON.stringify({...report, canonical: canonicalNumber(report.matches)}, null, 2))
	} else {
		console.log(formatReport(report, args.repo))
	}
	if (report.matches.length > 0 && args.comment) {
		await upsertComment(api, owner, repo, args.pr, formatReport(report, args.repo))
	}
	return report.matches.length > 0 && !args.noFail ? 1 : 0
}

import {pathToFileURL} from "node:url"

const isMain = Boolean(process.argv[1]) && import.meta.url === pathToFileURL(process.argv[1]).href
if (isMain) {
	run(process.argv.slice(2)).then(
		code => process.exit(code),
		error => {
			console.error(`check-pr-duplicates: ${error.message}`)
			process.exit(1)
		},
	)
}
