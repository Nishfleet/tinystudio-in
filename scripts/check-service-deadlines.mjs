#!/usr/bin/env node
// Reads every paid client's Day 0 record and reports how long is left before
// the internal target and before the refund line. Nothing here mutates state.
//
// Two clocks, deliberately:
//   internal target  serviceDeadlineAt() — 7 business days, the "7-Day Sprint" promise
//   refund line      14 working days from Day 0, the public delivery guarantee
// The gap between them is the week of warning before money has to go back.
//
// Exit codes: 0 clear · 1 something needs attention today · 2 the check itself broke.

import {existsSync, readdirSync} from "node:fs"
import {join} from "node:path"
import {readJson, resolveRepoPath} from "./lib/service-contract.mjs"
import {serviceDeadlineAt} from "./lib/service-artifacts.mjs"
import {addBusinessDaysToTimestamp, businessMillisecondsBetween} from "./date-utils.mjs"

const REFUND_BUSINESS_DAYS = 14
const WARN_WITHIN_DAYS = 2
const DAY_MS = 86400000

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

function refundLineAt(day0StartedAt, pauseHistory) {
	const pausedMs = (pauseHistory || []).reduce(
		(total, pause) => total + businessMillisecondsBetween(pause.startedAt, pause.endedAt),
		0,
	)
	const base = addBusinessDaysToTimestamp(day0StartedAt, REFUND_BUSINESS_DAYS)
	// Pauses push the refund line out by the same business time the clock was stopped.
	return new Date(Date.parse(base) + pausedMs).toISOString()
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
	const target = day0.deadlineAt || serviceDeadlineAt(startedAt, day0.pauseHistory || [])
	const refund = refundLineAt(startedAt, day0.pauseHistory || [])

	if (paused) {
		return {
			id, paused: true, status: "paused", target, refund,
			detail: `clock paused since ${day0.activePause.startedAt} — ${day0.activePause.reason || "no reason recorded"}`,
		}
	}

	const toTarget = businessDaysBetween(asOf, target)
	const toRefund = businessDaysBetween(asOf, refund)

	let status = "on-track"
	if (toRefund <= 0) status = "REFUND-DUE"
	else if (toTarget <= 0) status = "TARGET-MISSED"
	else if (toTarget <= WARN_WITHIN_DAYS) status = "due-soon"

	return {id, paused: false, status, target, refund, toTarget, toRefund}
}

function main() {
	const rows = loadClients().map(assess)
	if (rows.length === 0) {
		console.log("No paid clients with a Day 0 record. Nothing to check.")
		return 0
	}

	const rank = {"REFUND-DUE": 0, "TARGET-MISSED": 1, "due-soon": 2, "no-day0": 3, paused: 4, "on-track": 5}
	rows.sort((a, b) => rank[a.status] - rank[b.status])

	console.log(`TinyStudio service deadlines — as of ${asOf}\n`)
	for (const row of rows) {
		const head = `${row.status.padEnd(14)} ${row.id}`
		if (row.status === "no-day0" || row.paused) {
			console.log(`${head}  ${row.detail}`)
			continue
		}
		console.log(
			`${head}  ${row.toTarget} business days to internal target, ` +
			`${row.toRefund} to the refund line (${row.refund.slice(0, 10)})`,
		)
	}

	const needsAttention = rows.filter((row) =>
		row.status === "REFUND-DUE" || row.status === "TARGET-MISSED" || row.status === "due-soon" || row.status === "no-day0",
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
