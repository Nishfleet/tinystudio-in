#!/usr/bin/env node
// Reads every paid client's Day 0 record and reports the internal attention
// status for the Website Correction's 14-day implementation-tracking window.
// Nothing here mutates state.
//
// The only contract deadline in the product is the 14-day implementation-
// tracking window that starts when a human accepts the implementation pass;
// client delay pauses the clock. The service makes no delivery, revenue, or
// outcome promise, so this check never reports a customer-facing deadline:
// clients whose tracking window has not started simply have no deadline
// applicable.
//
// Exit codes: 0 clear · 1 something needs attention today · 2 the check itself broke.

import {existsSync, readdirSync} from "node:fs"
import {join} from "node:path"
import {readJson, resolveRepoPath} from "./lib/service-contract.mjs"
import {serviceTrackingWindowEndAt} from "./lib/service-artifacts.mjs"
import {businessMillisecondsBetween} from "./date-utils.mjs"

const WARN_WITHIN_DAYS = 2
const DAY_MS = 86400000

const repoRoot = process.cwd()
const asOf = process.env.SERVICE_DEADLINE_NOW || new Date().toISOString()

// businessMillisecondsBetween refuses a reversed range, so measure the gap in
// whichever direction is valid and carry the sign ourselves. A past tracking
// window is the whole point of this check — it must not throw.
function businessDaysBetween(from, to) {
	const overdue = Date.parse(to) < Date.parse(from)
	const ms = overdue ? -businessMillisecondsBetween(to, from) : businessMillisecondsBetween(from, to)
	return Math.round((ms / DAY_MS) * 10) / 10
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

function loadState(folder) {
	const path = join(folder, "service-state.json")
	if (!existsSync(path)) return null
	const state = readJson(path)
	return {state: state?.state || "", implementationAcceptedAt: state?.implementationAcceptedAt || ""}
}

function assess(client) {
	const {id, day0} = client
	const startedAt = day0.day0StartedAt
	if (!startedAt) return {id, status: "no-day0", detail: "Day 0 not recorded"}

	const paused = Boolean(day0.activePause && day0.activePause.startedAt && !day0.activePause.endedAt)
	if (paused) {
		return {
			id, paused: true, status: "paused",
			detail: `clock paused since ${day0.activePause.startedAt} — ${day0.activePause.reason || "no reason recorded"}`,
		}
	}

	const state = loadState(client.folder)
	if (!state) {
		return {id, paused: false, status: "state-missing", detail: "service state not recorded — cannot assess the 14-day tracking window"}
	}

	if (state.state === "tracking-14-day" && state.implementationAcceptedAt) {
		const windowEnd = serviceTrackingWindowEndAt(state.implementationAcceptedAt, day0.pauseHistory || [])
		const toEnd = businessDaysBetween(asOf, windowEnd)
		let status = "on-track"
		if (toEnd <= 0) status = "TRACKING-OVERDUE"
		else if (toEnd <= WARN_WITHIN_DAYS) status = "tracking-due-soon"
		return {id, paused: false, status, windowEnd, toEnd}
	}

	return {
		id, paused: false, status: "tracking-not-started",
		detail: `14-day implementation tracking has not started (current state: ${state.state || "unknown"}); no delivery deadline applies`,
	}
}

function main() {
	const rows = loadClients().map(assess)
	if (rows.length === 0) {
		console.log("No paid clients with a Day 0 record. Nothing to check.")
		return 0
	}

	const rank = {"TRACKING-OVERDUE": 0, "tracking-due-soon": 1, "state-missing": 2, "no-day0": 3, "tracking-not-started": 4, paused: 5, "on-track": 6}
	rows.sort((a, b) => rank[a.status] - rank[b.status])

	console.log(`TinyStudio service tracking — as of ${asOf}\n`)
	for (const row of rows) {
		const head = `${row.status.padEnd(20)} ${row.id}`
		if (row.status === "no-day0" || row.status === "state-missing" || row.status === "tracking-not-started" || row.paused) {
			console.log(`${head}  ${row.detail}`)
			continue
		}
		console.log(`${head}  ${row.toEnd} business days to the 14-day tracking-window end (${row.windowEnd.slice(0, 10)})`)
	}

	const needsAttention = rows.filter((row) =>
		row.status === "TRACKING-OVERDUE" || row.status === "tracking-due-soon" || row.status === "state-missing" || row.status === "no-day0",
	)
	if (needsAttention.length > 0) {
		console.log(`\n${needsAttention.length} client(s) need attention today.`)
		return 1
	}
	console.log("\nAll clients on track.")
	return 0
}

try {
	process.exit(main())
} catch (error) {
	console.error(`check-service-deadlines failed: ${error.message}`)
	process.exit(2)
}
