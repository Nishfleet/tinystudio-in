#!/usr/bin/env node
// Reads every paid client's Day 0 record and service state, then reports an
// internal tracking/attention status. Nothing here mutates state.
//
// The Website Correction contract carries no customer deadline.
// The only timeline it has is 14-day implementation tracking, which starts
// after human implementation acceptance; client-delay pauses stop the clock,
// so completed pauses extend the tracking window by the same amount of time.
//
// Statuses: tracking / due-soon / tracking-due describe the 14-day tracking
// window; tracking-complete / done describe recorded evidence or closure;
// paused covers a stopped clock; no-deadline covers clients whose tracking has
// not started yet; no-day0 covers a paid client missing its Day 0 start.
//
// Exit codes: 0 clear · 1 something needs attention today · 2 the check itself broke.

import {existsSync, readdirSync} from "node:fs"
import {join} from "node:path"
import {readJson, resolveRepoPath} from "./lib/service-contract.mjs"
import {implementationTrackingDeadlineAt} from "./lib/service-artifacts.mjs"

const WARN_WITHIN_DAYS = 2
const DAY_MS = 86400000

const repoRoot = process.cwd()
const asOf = process.env.SERVICE_DEADLINE_NOW || new Date().toISOString()

// A window end in the past is the whole point of this check, so plain signed
// day arithmetic (no business-day exclusion: the tracking contract counts
// calendar days) is used and never throws on a reversed range.
function daysBetween(from, to) {
	const ms = Date.parse(to) - Date.parse(from)
	return Math.round((ms / DAY_MS) * 10) / 10
}

// Read-only peek at the service state. A missing or malformed state file just
// means the tracking window has not started; nothing here validates records.
function trackingState(folder) {
	try {
		const state = readJson(join(folder, "service-state.json"))
		return {
			state: typeof state.state === "string" ? state.state : "",
			implementationAcceptedAt: typeof state.implementationAcceptedAt === "string" ? state.implementationAcceptedAt : "",
			contextRevision: Number.isInteger(state.contextRevision) ? state.contextRevision : 0
		}
	} catch {
		return {state: "", implementationAcceptedAt: "", contextRevision: 0}
	}
}

function loadClients() {
	const dir = resolveRepoPath(repoRoot, "clients")
	if (!existsSync(dir)) return []
	return readdirSync(dir, {withFileTypes: true})
		.filter((entry) => entry.isDirectory())
		.map((entry) => {
			const path = join(dir, entry.name, "service-day0.json")
			if (!existsSync(path)) return null
			return {id: entry.name, folder: join(dir, entry.name), day0: readJson(path)}
		})
		.filter(Boolean)
}

function assess(client) {
	const {id, folder, day0} = client
	const startedAt = day0.day0StartedAt
	if (!startedAt) return {id, status: "no-day0", detail: "Day 0 not recorded"}

	const paused = Boolean(day0.activePause && day0.activePause.startedAt && !day0.activePause.endedAt)
	if (paused) {
		return {
			id, paused: true, status: "paused",
			detail: `clock paused since ${day0.activePause.startedAt} — ${day0.activePause.reason || "no reason recorded"}`,
		}
	}

	const {state, implementationAcceptedAt, contextRevision} = trackingState(folder)
	if (!implementationAcceptedAt) {
		const scope = state ? ` (service state: ${state}, Day 0 ${startedAt.slice(0, 10)})` : ` (Day 0 ${startedAt.slice(0, 10)})`
		return {
			id, status: "no-deadline",
			detail: `no deadline applicable — 14-day implementation tracking starts after implementation acceptance${scope}`,
		}
	}

	if (state === "complete") return {id, status: "tracking-complete", detail: "14-day implementation tracking complete"}
	if (state === "declined") return {id, status: "done", detail: "service closed"}

	const trackingEnd = implementationTrackingDeadlineAt(implementationAcceptedAt, day0.pauseHistory || [])
	if (state === "tracking-14-day" && existsSync(join(folder, "service-evidence", "tracking-14-day", `${contextRevision}.json`))) {
		return {id, status: "tracking-complete", detail: "14-day tracking evidence recorded — awaiting human decision"}
	}

	const toEnd = daysBetween(asOf, trackingEnd)
	let status = "tracking"
	if (toEnd <= 0) status = "tracking-due"
	else if (toEnd <= WARN_WITHIN_DAYS) status = "due-soon"

	return {id, paused: false, status, trackingEnd, toEnd}
}

function main() {
	const rows = loadClients().map(assess)
	if (rows.length === 0) {
		console.log("No paid clients with a Day 0 record. Nothing to check.")
		return 0
	}

	const rank = {"no-day0": 0, "tracking-due": 1, "due-soon": 2, paused: 3, "tracking-complete": 4, done: 5, tracking: 6, "no-deadline": 7}
	rows.sort((a, b) => rank[a.status] - rank[b.status])

	console.log(`TinyStudio service tracking status — as of ${asOf}\n`)
	for (const row of rows) {
		const head = `${row.status.padEnd(14)} ${row.id}`
		if (row.status === "no-day0" || row.status === "paused" || row.status === "no-deadline" || row.status === "tracking-complete" || row.status === "done") {
			console.log(`${head}  ${row.detail}`)
			continue
		}
		const verb = row.status === "tracking-due" ? "past" : "left in"
		const days = Math.abs(row.toEnd)
		console.log(
			`${head}  ${days} days ${verb} the 14-day implementation tracking window (${row.status === "tracking-due" ? "ended" : "ends"} ${row.trackingEnd.slice(0, 10)})`,
		)
	}

	const needsAttention = rows.filter((row) =>
		row.status === "no-day0" || row.status === "tracking-due" || row.status === "due-soon",
	)
	if (needsAttention.length > 0) {
		console.log(`\n${needsAttention.length} client(s) need attention today.`)
		return 1
	}
	console.log("\nNo tracking deadlines need attention.")
	return 0
}

try {
	process.exit(main())
} catch (error) {
	console.error(`check-service-deadlines failed: ${error.message}`)
	process.exit(2)
}
