// Privacy-safe preflight for the Friday retention gate.
//
// The gate must never claim pass while running old code or inspecting an
// isolated empty checkout. Three contracts enforce that:
//
// 1. Remote freshness. The remote main ref is the only freshness truth. It is
//    read with a bounded `git ls-remote` straight from the configured origin,
//    never from the local `refs/remotes/origin/main` tracking ref, which can
//    be stale. The referenced commit is then brought into the object store
//    with a bounded `git fetch origin refs/heads/main` (FETCH_HEAD only; the
//    tracking ref is never touched) so ancestry can be proven. The local HEAD
//    may claim freshness only when the remote main commit is an ancestor of
//    (or equal to) it: a checkout behind or diverged from remote main is
//    running code that cannot be trusted. When the proof cannot be obtained
//    at all (no origin, no network, remote main unpublished, remote ref moved
//    mid-verification) the preflight fails loudly instead of passing.
//
// 2. Canonical state root. Private service state (`clients`, `prospects`,
//    `service-decisions`, `runs/service-engine`) is intentionally untracked,
//    so a fresh clone looks identical to a legitimate no-client state. The
//    state root therefore defaults to the repository's main worktree, never
//    to the invoking working directory. The record roots `clients` and
//    `prospects` must exist there as real (non-symlink) directories; their
//    absence is the isolated-empty-checkout signature. The engine-managed
//    roots `service-decisions` and `runs/service-engine` are created lazily
//    on first use, so their absence is legitimate only while no records
//    exist — aggregate parity (below) makes their absence fail the moment any
//    client record appears. Inaccessible roots always fail.
//
// 3. Aggregate parity. Every active client (a `clients/` directory or a
//    `prospects/` directory carrying `service-day0.json`) must be covered by
//    both a human review decision and service-engine artifacts, because the
//    product records the fit decision before Day 0 and the engine creates the
//    client scaffold. Counts that fall below the active-client count are
//    divergent state and fail.
//
// Diagnostics only ever carry aggregate counts, root labels, and short commit
// shas — never client identifiers, names, or record contents.
//
// Test seam: TINYSTUDIO_PREFLIGHT_REPO overrides the repository the freshness
// proof inspects so hermetic tests can point at a fixture repository whose
// origin is a local bare remote.
import {execFileSync} from "node:child_process"
import {existsSync, lstatSync, readdirSync, realpathSync} from "node:fs"
import {dirname, join, resolve} from "node:path"
import {fileURLToPath} from "node:url"

export const STATE_ROOTS = ["clients", "prospects", "service-decisions", "runs/service-engine"]
const RECORD_ROOTS = new Set(["clients", "prospects"])
const DECISION_CONTROL_FILES = new Set(["review-cap-ledger.json", "review-cap-decision-journal.json"])
const ENGINE_NAMESPACES = ["packets", "outputs", "promotions"]
const GIT_TIMEOUT_MS = 30000

export function scriptRepoRoot() {
	return dirname(dirname(dirname(fileURLToPath(import.meta.url))))
}

export function normalizedPath(path) {
	const absolute = resolve(path)
	try {
		return realpathSync(absolute)
	} catch {
		return absolute
	}
}

export function canonicalMainWorktree(repoRoot) {
	try {
		const output = execFileSync("git", ["-C", repoRoot, "worktree", "list", "--porcelain"], {
			encoding: "utf8",
			stdio: ["ignore", "pipe", "ignore"],
			timeout: GIT_TIMEOUT_MS
		})
		let worktree = ""
		for (const line of output.split("\n")) {
			if (line.startsWith("worktree ")) worktree = line.slice("worktree ".length)
			if (line === "branch refs/heads/main" && worktree) return worktree
		}
	} catch {}
	return repoRoot
}

function runGit(repoRoot, args) {
	return execFileSync("git", ["-C", repoRoot, ...args], {
		encoding: "utf8",
		stdio: ["ignore", "pipe", "ignore"],
		timeout: GIT_TIMEOUT_MS,
		env: {...process.env, GIT_TERMINAL_PROMPT: "0"}
	})
}

function shortSha(sha) {
	return sha ? sha.slice(0, 7) : ""
}

// Resolves the published remote main commit. Returns {sha} or {error}.
function publishedRemoteMain(repoRoot) {
	let remoteUrl = ""
	try {
		remoteUrl = runGit(repoRoot, ["remote", "get-url", "origin"]).trim()
	} catch {
		return {error: "no origin remote is configured"}
	}
	if (!remoteUrl) return {error: "no origin remote is configured"}
	let refs = ""
	try {
		refs = runGit(repoRoot, ["ls-remote", remoteUrl, "refs/heads/main"]).trim()
	} catch {
		return {error: "remote main ref is unreachable (network or remote unavailable)"}
	}
	const sha = refs.split(/\s+/)[0] || ""
	if (!/^[0-9a-f]{40}$/.test(sha)) return {error: "remote main ref is not published"}
	return {sha}
}

// Returns {ok, localHead, remoteMain, reason}. `reason` is present exactly
// when `ok` is false and never leaks remote URLs or credentials.
export function proveFreshness(repoRoot) {
	let localHead = ""
	try {
		localHead = runGit(repoRoot, ["rev-parse", "HEAD"]).trim()
	} catch {
		return {ok: false, localHead: "", reason: "cannot resolve the local checkout HEAD"}
	}
	if (!/^[0-9a-f]{40}$/.test(localHead)) return {ok: false, localHead: "", reason: "cannot resolve the local checkout HEAD"}
	const remote = publishedRemoteMain(repoRoot)
	if (remote.error) return {ok: false, localHead, remoteMain: "", reason: remote.error}
	try {
		runGit(repoRoot, ["fetch", "origin", "refs/heads/main"])
	} catch {
		return {ok: false, localHead, remoteMain: remote.sha, reason: "cannot verify checkout freshness against remote main"}
	}
	let fetchedSha = ""
	try {
		fetchedSha = runGit(repoRoot, ["rev-parse", "FETCH_HEAD"]).trim()
	} catch {
		return {ok: false, localHead, remoteMain: remote.sha, reason: "cannot verify checkout freshness against remote main"}
	}
	if (fetchedSha !== remote.sha) return {ok: false, localHead, remoteMain: remote.sha, reason: "remote main ref moved while verifying freshness"}
	let ancestor = false
	try {
		runGit(repoRoot, ["merge-base", "--is-ancestor", remote.sha, localHead])
		ancestor = true
	} catch (error) {
		if (error?.status !== 1) return {ok: false, localHead, remoteMain: remote.sha, reason: "cannot verify checkout freshness against remote main"}
	}
	if (!ancestor) return {ok: false, localHead, remoteMain: remote.sha, reason: "checkout is behind or diverged from remote main"}
	return {ok: true, localHead, remoteMain: remote.sha}
}

function rootEntryKinds(rootPath) {
	const directories = []
	const files = []
	for (const entry of readdirSync(rootPath, {withFileTypes: true})) {
		if (entry.name.startsWith(".")) continue
		if (entry.isDirectory()) directories.push(entry.name)
		else files.push(entry.name)
	}
	return {directories, files}
}

// Inspects the four canonical state roots under `stateRoot`. Every diagnostic
// is an aggregate count or a root label; the report never contains client
// identifiers or record contents. `clients` and `prospects` must exist as
// real directories (the canonical-state-root contract); `service-decisions`
// and `runs/service-engine` are lazily created by the engine, so their
// absence is a zero count that aggregate parity reconciles against records.
export function inspectState(stateRoot) {
	const failures = []
	const roots = {clients: 0, prospects: 0, "service-decisions": 0, "runs/service-engine": 0}
	const activeClientIds = new Set()
	for (const label of STATE_ROOTS) {
		const path = join(stateRoot, ...label.split("/"))
		let stat = null
		try {
			stat = lstatSync(path)
		} catch (error) {
			if (error?.code === "ENOENT") {
				if (RECORD_ROOTS.has(label)) failures.push(`canonical state root missing: ${label}`)
			} else {
				failures.push(`canonical state root inaccessible: ${label}`)
			}
			continue
		}
		if (!stat.isDirectory() || stat.isSymbolicLink()) {
			failures.push(`canonical state root is not a real directory: ${label}`)
			continue
		}
		let entries = null
		try {
			entries = rootEntryKinds(path)
		} catch {
			failures.push(`canonical state root inaccessible: ${label}`)
			continue
		}
		if (label === "clients") {
			roots.clients = entries.directories.length
			for (const name of entries.directories) activeClientIds.add(name)
		} else if (label === "prospects") {
			roots.prospects = entries.directories.length
			for (const name of entries.directories) {
				if (existsSync(join(path, name, "service-day0.json"))) activeClientIds.add(name)
			}
		} else if (label === "service-decisions") {
			roots["service-decisions"] = entries.directories.filter(name => !DECISION_CONTROL_FILES.has(name)).length
		} else {
			const applications = new Set()
			for (const namespace of ENGINE_NAMESPACES) {
				const namespacePath = join(path, namespace)
				if (!existsSync(namespacePath)) continue
				try {
					for (const entry of readdirSync(namespacePath, {withFileTypes: true})) {
						if (entry.isDirectory() && !entry.name.startsWith(".")) applications.add(entry.name)
					}
				} catch {
					failures.push(`canonical state root inaccessible: ${label}`)
				}
			}
			roots["runs/service-engine"] = applications.size
		}
	}
	const activeClients = activeClientIds.size
	if (roots["service-decisions"] < activeClients) {
		failures.push(`aggregate parity: service-decisions count ${roots["service-decisions"]} is below active client count ${activeClients}`)
	}
	if (roots["runs/service-engine"] < activeClients) {
		failures.push(`aggregate parity: runs/service-engine count ${roots["runs/service-engine"]} is below active client count ${activeClients}`)
	}
	return {roots, activeClients, failures}
}

// Runs the full preflight. In GitHub Actions the private state and the
// freshness proof are unavailable by construction, so the preflight reports
// itself as skipped and CI keeps its existing warn behavior; the Friday gate
// itself always runs the preflight.
export function runPreflight({repoRoot, stateRoot, isGithubActions = false}) {
	if (isGithubActions) {
		return {
			skipped: true,
			freshness: {skipped: true},
			roots: {clients: 0, prospects: 0, "service-decisions": 0, "runs/service-engine": 0},
			activeClients: 0,
			failures: [],
			warnings: []
		}
	}
	const failures = []
	const freshness = proveFreshness(repoRoot)
	if (!freshness.ok) {
		failures.push(`remote freshness proof unavailable: ${freshness.reason}`)
	}
	const state = inspectState(stateRoot)
	failures.push(...state.failures)
	return {
		skipped: false,
		freshness: freshness.ok
			? {localHead: shortSha(freshness.localHead), remoteMain: shortSha(freshness.remoteMain)}
			: {localHead: shortSha(freshness.localHead), remoteMain: shortSha(freshness.remoteMain), reason: freshness.reason},
		roots: state.roots,
		activeClients: state.activeClients,
		failures,
		warnings: []
	}
}
