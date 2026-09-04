#!/usr/bin/env node
// Internal attention check for The Website Correction (PRODUCT.md). Reads each
// paid client's Day 0 record and service state, then reports how long is left
// before the recorded internal implementation deadline — day0.deadlineAt, i.e.
// Day 0 plus pause-adjusted working days — and whether the 14-day
// implementation-tracking window is open or the sprint is already finished.
// Nothing here mutates state, and the output is internal tracking/attention
// only: the fixed-scope sprint is human-reviewed and carries no delivery or
// outcome promise.
//
// Exit codes: 0 clear · 1 something needs attention today · 2 the check itself broke.

import {existsSync, readdirSync} from "node:fs"
import {join} from "node:path"
import {readJson, resolveRepoPath} from "./lib/service-contract.mjs"
import {readOptionalJson, serviceDeadlineAt} from "./lib/service-artifacts.mjs"
import {businessMillisecondsBetween} from "./date-utils.mjs"

const WARN_WITHIN_DAYS = 2
const DAY_MS = 86400000
const NO_DEADLINE_STATES = new Set(["complete", "declined"])
const TRACKING_STATE = "tracking-14-day"

const repoRoot = process.cwd()
const asOf = process.env.SERVICE_DEADLINE_NOW || new Date().toISOString()

// businessMillisecondsBetween refuses a reversed range, so measure the gap in
// whichever direction is valid and carry the sign ourselves. A past deadline is
// the whole point of this check — it must not throw.
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
			const stateRecord = readOptionalJson(join(dir, entry.name, "service-state.json"))
			return {id: entry.name, day0: readJson(path), state: stateRecord?.state || ""}
		})
		.filter(Boolean)
}

function assess(client) {
	const {id, day0, state} = client
	const startedAt = day0.day0StartedAt
	if (!startedAt) return {id, status: "no-day0", detail: "Day 0 not recorded"}

	const paused = Boolean(day0.activePause && day0.activePause.startedAt && !day0.activePause.endedAt)
	const target = day0.deadlineAt || serviceDeadlineAt(startedAt, day0.pauseHistory || [])

	if (paused) {
		return {
			id, paused: true, status: "paused", target,
			detail: `clock paused since ${day0.activePause.startedAt} — ${day0.activePause.reason || "no reason recorded"}; internal deadline pause-adjusted to ${target.slice(0, 10)}`,
		}
	}
	if (NO_DEADLINE_STATES.has(state)) {
		return {id, paused: false, status: "done", target, detail: `no deadline applicable — service ${state}`}
	}
	if (state === TRACKING_STATE) {
		return {
			id, paused: false, status: "tracking", target,
			detail: "14-day implementation tracking in progress; tracking review is governed by the review queue",
		}
	}

	const toTarget = businessDaysBetween(asOf, target)

	let status = "on-track"
	if (toTarget <= 0) status = "target-passed"
	else if (toTarget <= WARN_WITHIN_DAYS) status = "due-soon"

	return {id, paused: false, status, target, toTarget}
}

function main() {
	const rows = loadClients().map(assess)
	if (rows.length === 0) {
		console.log("No paid clients with a Day 0 record. Nothing to check.")
		return 0
	}

	const rank = {"target-passed": 0, "due-soon": 1, tracking: 2, "no-day0": 3, paused: 4, done: 5, "on-track": 6}
	rows.sort((a, b) => rank[a.status] - rank[b.status])

	console.log(`TinyStudio service deadlines — as of ${asOf}\n`)
	for (const row of rows) {
		const head = `${row.status.padEnd(14)} ${row.id}`
		if (row.status === "no-day0" || row.paused || row.status === "done" || row.status === "tracking") {
			console.log(`${head}  ${row.detail}`)
			continue
		}
		console.log(
			`${head}  ${row.toTarget} business days to internal implementation deadline (pause-adjusted ${row.target.slice(0, 10)})`,
		)
	}

	const needsAttention = rows.filter((row) =>
		row.status === "target-passed" || row.status === "due-soon" || row.status === "no-day0",
	)
	if (needsAttention.length > 0) {
		console.log(`\n${needsAttention.length} client(s) need deadline attention today.`)
		return 1
	}
	console.log("\nNo clients need deadline attention.")
	return 0
}

try {
	process.exit(main())
} catch (error) {
	console.error(`check-service-deadlines failed: ${error.message}`)
	process.exit(2)
}
