#!/usr/bin/env node
// Regression coverage for the active service deadline checker
// (scripts/check-service-deadlines.mjs). The checker must report only an
// internal attention status based on the Website Correction's 14-day
// implementation-tracking window, with client-delay pauses pushing the window
// out by business time. Retired seven-day sprint / delivery-guarantee / refund
// language must not appear in active checker output, and the Day 0 date
// arithmetic that fixtures and hashes depend on must stay byte-identical.
import assert from "node:assert/strict"
import {spawnSync} from "node:child_process"
import {existsSync as ex, mkdirSync as md, mkdtempSync, rmSync as rm, writeFileSync as wf} from "node:fs"
import {tmpdir} from "node:os"
import {dirname, join} from "node:path"
import {serviceDeadlineAt, serviceTrackingDeadlineAt} from "./lib/service-artifacts.mjs"

const {equal: eq, match: mat, doesNotMatch: dnm} = assert
const CHECKER = join(process.cwd(), "scripts", "check-service-deadlines.mjs")
// Day 0 is a Monday, so every business-day boundary below is exact.
const DAY0 = "2026-07-13T10:00:00.000Z"
const TRACKING_END = "2026-07-31T10:00:00.000Z" // 14 business days after Day 0 (Friday).
const CLIENT = "018f5a54-84aa-7ae0-a1fd-4da350490779"
const NO_DAY0_CLIENT = "018f5a54-84aa-7ae0-a1fd-4da350490778"
const PAUSED_CLIENT = "018f5a54-84aa-7ae0-a1fd-4da350490777"
const PAUSE = {reason: "Client access pending", startedAt: "2026-07-20T10:00:00.000Z", endedAt: "2026-07-22T10:00:00.000Z", durationMs: 172800000} // Two business days.
const WEEKEND_PAUSE = {reason: "Weekend client delay", startedAt: "2026-07-18T10:00:00.000Z", endedAt: "2026-07-19T10:00:00.000Z", durationMs: 86400000} // Zero business time.
// The retired public semantics must never surface in checker output again.
const RETIRED_LANGUAGE = /\b7\s*-?\s*day\b|sprint|refund|delivery|guarantee/i

const T = mkdtempSync(join(tmpdir(), "tinystudio-deadline-test-"))
const clientsDir = join(T, "clients")
const allOutput = []

function day0Record({paused = false, activePause = null, pauseHistory = [], totalPausedMs = 0, updatedAt = DAY0} = {}) {
	return {
		applicationId: CLIENT,
		paymentEvidence: "paid: invoice TS-1",
		requiredContext: "approved context",
		approvalOwner: "Founder",
		implementationOwner: "TinyStudio",
		offerName: "The Website Correction",
		offerPriceUsd: 1000,
		pricingCohort: "founder-pilot",
		pilotSequence: 1,
		ready: true,
		day0StartedAt: DAY0,
		updatedAt,
		paused,
		activePause,
		pauseHistory,
		totalPausedMs,
		deadlineAt: serviceDeadlineAt(DAY0, pauseHistory),
		resumeState: paused ? "implementation" : "",
	}
}

function writeJson(path, value) {
	md(dirname(path), {recursive: true})
	wf(path, `${JSON.stringify(value, null, 2)}\n`)
}

function resetClients() {
	rm(clientsDir, {recursive: true, force: true})
	md(clientsDir, {recursive: true})
}

function runChecker(now, fixture) {
	if (fixture !== undefined) writeJson(join(clientsDir, CLIENT, "service-day0.json"), fixture)
	const result = spawnSync(process.execPath, [CHECKER], {
		cwd: T,
		env: {...process.env, SERVICE_DEADLINE_NOW: now, TZ: "Asia/Kolkata"},
		encoding: "utf8",
	})
	if (result.stdout || result.stderr) allOutput.push(`${result.stdout}\n${result.stderr}`)
	return result
}

try {
	// Day 0 arithmetic that fixtures and hashes depend on must stay intact.
	eq(serviceDeadlineAt("2026-07-10T10:00:00.000+05:30", [WEEKEND_PAUSE]), "2026-07-21T10:00:00.000+05:30")
	eq(serviceDeadlineAt("2026-07-16T00:15:00.000+05:30"), "2026-07-27T00:15:00.000+05:30")
	eq(serviceDeadlineAt(DAY0), "2026-07-22T10:00:00.000Z")

	// The 14-day tracking window: 14 business days from Day 0, extended only by
	// business time spent paused.
	eq(serviceTrackingDeadlineAt(DAY0), TRACKING_END)
	eq(serviceTrackingDeadlineAt(DAY0, [PAUSE]), "2026-08-04T10:00:00.000Z")
	eq(serviceTrackingDeadlineAt(DAY0, [WEEKEND_PAUSE]), TRACKING_END)

	// No clients at all: nothing to check, exit 0.
	resetClients()
	rm(clientsDir, {recursive: true, force: true})
	let result = runChecker("2026-07-29T10:00:00.000Z", undefined)
	eq(result.status, 0)
	mat(result.stdout, /No paid clients with a Day 0 record\. Nothing to check\./)

	// Fresh client, comfortably inside the window: on-track, exit 0.
	resetClients()
	const plain = day0Record()
	writeJson(join(clientsDir, CLIENT, "service-day0.json"), plain)
	result = runChecker("2026-07-28T10:00:00.000Z")
	eq(result.status, 0)
	mat(result.stdout, /on-track\s+018f5a54-84aa-7ae0-a1fd-4da350490779/)
	mat(result.stdout, /3 business days left in the 14-day tracking window \(2026-07-31\)/)
	mat(result.stdout, /All clients on track\./)

	// Within the two-business-day warning: due-soon, exit 1.
	result = runChecker("2026-07-29T10:00:00.000Z")
	eq(result.status, 1)
	mat(result.stdout, /due-soon\s+018f5a54-84aa-7ae0-a1fd-4da350490779/)
	mat(result.stdout, /2 business days left in the 14-day tracking window \(2026-07-31\)/)

	// Exactly at the 14-day boundary the window is elapsed: TRACKING-OVERDUE, exit 1.
	result = runChecker(TRACKING_END)
	eq(result.status, 1)
	mat(result.stdout, /TRACKING-OVERDUE\s+018f5a54-84aa-7ae0-a1fd-4da350490779/)
	mat(result.stdout, /0 business days left in the 14-day tracking window \(2026-07-31\)/)

	// Past the boundary: negative business days, still TRACKING-OVERDUE, exit 1.
	result = runChecker("2026-08-04T10:00:00.000Z")
	eq(result.status, 1)
	mat(result.stdout, /TRACKING-OVERDUE\s+018f5a54-84aa-7ae0-a1fd-4da350490779/)
	mat(result.stdout, /-2 business days left in the 14-day tracking window \(2026-07-31\)/)

	// Client-delay pauses push the window out by the business time the clock
	// was stopped: still on-track past the un-paused boundary, exit 0.
	resetClients()
	writeJson(join(clientsDir, CLIENT, "service-day0.json"), day0Record({pauseHistory: [PAUSE], totalPausedMs: PAUSE.durationMs}))
	result = runChecker("2026-07-29T10:00:00.000Z")
	eq(result.status, 0)
	mat(result.stdout, /on-track\s+018f5a54-84aa-7ae0-a1fd-4da350490779/)
	mat(result.stdout, /4 business days left in the 14-day tracking window \(2026-08-04\)/)

	// A weekend-only pause stopped no business time, so the window does not move.
	resetClients()
	writeJson(join(clientsDir, CLIENT, "service-day0.json"), day0Record({pauseHistory: [WEEKEND_PAUSE], totalPausedMs: WEEKEND_PAUSE.durationMs}))
	result = runChecker("2026-07-29T10:00:00.000Z")
	eq(result.status, 1)
	mat(result.stdout, /due-soon\s+018f5a54-84aa-7ae0-a1fd-4da350490779/)
	mat(result.stdout, /2 business days left in the 14-day tracking window \(2026-07-31\)/)

	// An active pause is reported, not counted, and needs no attention today.
	resetClients()
	writeJson(join(clientsDir, CLIENT, "service-day0.json"), day0Record({paused: true, activePause: {reason: "Client access pending", startedAt: "2026-07-20T10:00:00.000Z"}}))
	result = runChecker("2026-08-04T10:00:00.000Z")
	eq(result.status, 0)
	mat(result.stdout, /paused\s+018f5a54-84aa-7ae0-a1fd-4da350490779\s+clock paused since 2026-07-20T10:00:00\.000Z — Client access pending/)
	mat(result.stdout, /All clients on track\./)

	// Day 0 record without a start time: reported as needing attention, exit 1.
	resetClients()
	writeJson(join(clientsDir, NO_DAY0_CLIENT, "service-day0.json"), {})
	result = runChecker("2026-07-29T10:00:00.000Z")
	eq(result.status, 1)
	mat(result.stdout, /no-day0\s+018f5a54-84aa-7ae0-a1fd-4da350490778\s+Day 0 not recorded/)
	mat(result.stdout, /1 client\(s\) need attention today\./)

	// Mixed portfolio: no-day0 ranks above paused, which ranks above on-track.
	resetClients()
	writeJson(join(clientsDir, CLIENT, "service-day0.json"), plain)
	writeJson(join(clientsDir, PAUSED_CLIENT, "service-day0.json"), day0Record({paused: true, activePause: {reason: "Client access pending", startedAt: "2026-07-20T10:00:00.000Z"}}))
	writeJson(join(clientsDir, NO_DAY0_CLIENT, "service-day0.json"), {})
	result = runChecker("2026-07-28T10:00:00.000Z")
	eq(result.status, 1)
	const lines = result.stdout.split("\n")
	eq(lines.findIndex(line => line.includes(NO_DAY0_CLIENT)) < lines.findIndex(line => line.includes(PAUSED_CLIENT)), true)
	eq(lines.findIndex(line => line.includes(PAUSED_CLIENT)) < lines.findIndex(line => line.includes(CLIENT)), true)

	// A corrupted record breaks the check loudly with exit 2, not a wrong status.
	resetClients()
	md(join(clientsDir, CLIENT), {recursive: true})
	wf(join(clientsDir, CLIENT, "service-day0.json"), "not json {")
	result = runChecker("2026-07-29T10:00:00.000Z")
	eq(result.status, 2)
	mat(result.stderr, /check-service-deadlines failed/)

	// The retired seven-day / refund / delivery-guarantee vocabulary must never
	// surface in active checker output.
	dnm(allOutput.join("\n"), RETIRED_LANGUAGE)

	console.log("Service deadline regression checks passed.")
} finally {
	rm(T, {recursive: true, force: true})
}
