#!/usr/bin/env node
// Reads every paid client's Day 0 record and reports how much business time is
// left in the fixed-scope Website Correction's 14-day implementation-tracking
// window. The window opens at Day 0 and client-delay pauses push it out by the
// same business time the clock was stopped. Nothing here mutates state, and
// the statuses are an internal tracking/attention signal only — they are not a
// delivery or refund promise to the client.
//
// Exit codes: 0 clear · 1 something needs attention today · 2 the check itself broke.

import {existsSync, readdirSync} from "node:fs"
import {join} from "node:path"
import {readJson, resolveRepoPath} from "./lib/service-contract.mjs"
import {serviceTrackingDeadlineAt} from "./lib/service-artifacts.mjs"
import {businessMillisecondsBetween} from "./date-utils.mjs"

const WARN_WITHIN_DAYS = 2
const DAY_MS = 86400000

const repoRoot = process.cwd()
const asOf = process.env.SERVICE_DEADLINE_NOW || new Date().toISOString()

// businessMillisecondsBetween refuses a reversed range, so measure the gap in
// whichever direction is valid and carry the sign ourselves. An elapsed window
// is the whole point of this check — it must not throw.
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
			return {id: entry.name, day0: readJson(path)}
		})
		.filter(Boolean)
}

function assess(client) {
	const {id, day0} = client
	const startedAt = day0.day0StartedAt
	if (!startedAt) return {id, status: "no-day0", detail: "Day 0 not recorded"}

	const paused = Boolean(day0.activePause && day0.activePause.startedAt && !day0.activePause.endedAt)
	const tracking = serviceTrackingDeadlineAt(startedAt, day0.pauseHistory || [])

	if (paused) {
		return {
			id, paused: true, status: "paused", tracking,
			detail: `clock paused since ${day0.activePause.startedAt} — ${day0.activePause.reason || "no reason recorded"}`,
		}
	}

	const toTracking = businessDaysBetween(asOf, tracking)

	let status = "on-track"
	if (toTracking <= 0) status = "TRACKING-OVERDUE"
	else if (toTracking <= WARN_WITHIN_DAYS) status = "due-soon"

	return {id, paused: false, status, tracking, toTracking}
}

function main() {
	const rows = loadClients().map(assess)
	if (rows.length === 0) {
		console.log("No paid clients with a Day 0 record. Nothing to check.")
		return 0
	}

	const rank = {"TRACKING-OVERDUE": 0, "due-soon": 1, "no-day0": 2, paused: 3, "on-track": 4}
	rows.sort((a, b) => rank[a.status] - rank[b.status])

	console.log(`TinyStudio Website Correction tracking — as of ${asOf}\n`)
	for (const row of rows) {
		const head = `${row.status.padEnd(16)} ${row.id}`
		if (row.status === "no-day0" || row.paused) {
			console.log(`${head}  ${row.detail}`)
			continue
		}
		console.log(
			`${head}  ${row.toTracking} business days left in the 14-day tracking window (${row.tracking.slice(0, 10)})`,
		)
	}

	const needsAttention = rows.filter((row) =>
		row.status === "TRACKING-OVERDUE" || row.status === "due-soon" || row.status === "no-day0",
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
