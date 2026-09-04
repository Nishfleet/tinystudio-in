#!/usr/bin/env node
// Focused regression coverage for the active service deadline checker
// (scripts/check-service-deadlines.mjs) under the PRODUCT.md fixed-scope
// contract: internal pause-adjusted implementation-deadline attention only,
// the 14-day implementation-tracking boundary, and no retired seven-day or
// refund semantics in active checker code or output.
import assert from "node:assert/strict"
const {equal: eq, match: mat, doesNotMatch: dnm, ok} = assert
import {spawnSync} from "node:child_process"
import {mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync} from "node:fs"
import {tmpdir} from "node:os"
import {join} from "node:path"
import {serviceDeadlineAt} from "./lib/service-artifacts.mjs"

const CHECKER = "scripts/check-service-deadlines.mjs"
const NOW = "2026-07-20T12:00:00.000Z"

// Retired semantics that must never reappear in the checker's code or output:
// a 7-day sprint label, a public delivery promise, a refund line, or any
// guarantee claim. The active contract is fixed scope, pause-adjusted working
// days from Day 0, and 14-day implementation tracking.
const retiredSemantics = /refund|guarantee|\b(?:7|seven)[- ]?day\b|delivery line|sprint promise/i

const CHECKER_PATH = join(process.cwd(), CHECKER)

function runChecker(repoRoot) {
	return spawnSync(process.execPath, [CHECKER_PATH], {cwd: repoRoot, env: {...process.env, SERVICE_DEADLINE_NOW: NOW}, encoding: "utf8"})
}

function writeJson(path, value) {
	writeFileSync(path, `${JSON.stringify(value)}\n`)
}

function mkClient(repoRoot, id, {startedAt, state = "implementation", paused = false, activePause = null, pauseHistory = [], includeDay0 = true, deadlineAt}) {
	const folder = join(repoRoot, "clients", id)
	mkdirSync(folder, {recursive: true})
	writeJson(join(folder, "service-state.json"), {state})
	if (includeDay0) {
		const day0 = startedAt
			? {day0StartedAt: startedAt, deadlineAt: deadlineAt ?? serviceDeadlineAt(startedAt, pauseHistory), paused, activePause, pauseHistory}
			: {}
		if (deadlineAt === null) delete day0.deadlineAt
		writeJson(join(folder, "service-day0.json"), day0)
	}
}

const repo = mkdtempSync(join(tmpdir(), "tinystudio-deadlines-test-"))
try {
	// --- Empty repository: nothing to check, clear exit. ---------------------
	let result = runChecker(repo)
	eq(result.status, 0)
	mat(result.stdout, /No paid clients with a Day 0 record\. Nothing to check\./)
	dnm(result.stdout, retiredSemantics)

	// --- One client in each active attention state. -------------------------
	// Internal deadline passed while the sprint is still running.
	mkClient(repo, "c-passed", {startedAt: "2026-07-06T10:00:00.000Z", state: "implementation"})
	// Internal deadline within two working days.
	mkClient(repo, "c-soon", {startedAt: "2026-07-13T10:00:00.000Z", state: "implementation"})
	// Internal deadline passed, but the client is in 14-day implementation tracking.
	mkClient(repo, "c-track", {startedAt: "2026-07-06T10:00:00.000Z", state: "tracking-14-day"})
	// Internal deadline comfortably ahead.
	mkClient(repo, "c-on", {startedAt: "2026-07-16T10:00:00.000Z", state: "implementation"})
	// No Day 0 record at all.
	mkClient(repo, "c-nod0", {})
	// Sprint finished: no deadline is applicable.
	mkClient(repo, "c-done", {startedAt: "2026-07-06T10:00:00.000Z", state: "complete"})
	// Client delay paused the clock.
	mkClient(repo, "c-paused", {startedAt: "2026-07-06T10:00:00.000Z", paused: true, activePause: {startedAt: "2026-07-18T09:00:00.000Z", reason: "Client access pending"}})

	result = runChecker(repo)
	eq(result.status, 1)
	mat(result.stdout, /TinyStudio service deadlines/)
	// Attention rows must describe the internal implementation deadline, never a refund line.
	mat(result.stdout, /target-passed\s+c-passed/)
	mat(result.stdout, /due-soon\s+c-soon/)
	mat(result.stdout, /business days to internal implementation deadline \(pause-adjusted/)
	// 14-day tracking boundary: reported as tracking, not as a missed refund.
	mat(result.stdout, /tracking\s+c-track/)
	mat(result.stdout, /14-day implementation tracking in progress/)
	// Finished sprints carry no deadline.
	mat(result.stdout, /done\s+c-done/)
	mat(result.stdout, /no deadline applicable — service complete/)
	// Paused clocks surface the pause and the pause-adjusted target.
	mat(result.stdout, /paused\s+c-paused/)
	mat(result.stdout, /clock paused since 2026-07-18T09:00:00\.000Z — Client access pending; internal deadline pause-adjusted to 2026-07-15/)
	mat(result.stdout, /no-day0\s+c-nod0/)
	mat(result.stdout, /Day 0 not recorded/)
	// Only the three attention statuses count toward the exit code and summary.
	mat(result.stdout, /3 client\(s\) need deadline attention today\./)
	// Attention rows sort first in priority order.
	ok(result.stdout.indexOf("target-passed") < result.stdout.indexOf("due-soon"))
	ok(result.stdout.indexOf("due-soon") < result.stdout.indexOf("tracking"))
	ok(result.stdout.indexOf("tracking") < result.stdout.indexOf("no-day0"))
	ok(result.stdout.indexOf("no-day0") < result.stdout.indexOf("paused"))
	ok(result.stdout.indexOf("paused") < result.stdout.indexOf("done"))
	ok(result.stdout.indexOf("done") < result.stdout.indexOf("on-track"))
	dnm(result.stdout, retiredSemantics)
	eq(result.stderr, "")

	// --- Tracking-only repository: clear exit, tracking still visible. -------
	const trackingRepo = mkdtempSync(join(tmpdir(), "tinystudio-deadlines-tracking-"))
	mkClient(trackingRepo, "c-track", {startedAt: "2026-07-06T10:00:00.000Z", state: "tracking-14-day"})
	result = runChecker(trackingRepo)
	eq(result.status, 0)
	mat(result.stdout, /14-day implementation tracking in progress/)
	mat(result.stdout, /No clients need deadline attention\./)
	dnm(result.stdout, retiredSemantics)
	rmSync(trackingRepo, {recursive: true, force: true})

	// --- Completed repository: no deadline applicable. -----------------------
	const doneRepo = mkdtempSync(join(tmpdir(), "tinystudio-deadlines-done-"))
	mkClient(doneRepo, "c-done", {startedAt: "2026-07-06T10:00:00.000Z", state: "complete"})
	result = runChecker(doneRepo)
	eq(result.status, 0)
	mat(result.stdout, /no deadline applicable — service complete/)
	mat(result.stdout, /No clients need deadline attention\./)
	dnm(result.stdout, retiredSemantics)
	rmSync(doneRepo, {recursive: true, force: true})

	// --- Paused client without a recorded deadlineAt uses the pause-adjusted
	// --- fallback, preserving the deterministic Day 0 pause accounting. ------
	const pausedRepo = mkdtempSync(join(tmpdir(), "tinystudio-deadlines-paused-"))
	const weekdayPause = [{reason: "Client access pending", startedAt: "2026-07-08T10:00:00.000Z", endedAt: "2026-07-09T10:00:00.000Z", durationMs: 86400000}]
	const expectedFallback = serviceDeadlineAt("2026-07-06T10:00:00.000Z", weekdayPause)
	mkClient(pausedRepo, "c-paused", {
		startedAt: "2026-07-06T10:00:00.000Z",
		paused: true,
		activePause: {startedAt: "2026-07-09T10:00:00.000Z", reason: "Client access pending"},
		pauseHistory: weekdayPause,
		deadlineAt: null
	})
	result = runChecker(pausedRepo)
	eq(result.status, 0)
	mat(result.stdout, new RegExp(`internal deadline pause-adjusted to ${expectedFallback.slice(0, 10)}`))
	dnm(result.stdout, retiredSemantics)
	rmSync(pausedRepo, {recursive: true, force: true})

	// --- Active checker source must stay free of the retired semantics. ------
	const checkerSource = readFileSync(join(process.cwd(), CHECKER), "utf8")
	dnm(checkerSource, retiredSemantics)

	// --- Pause-aware date math remains hash/fixture-safe (unchanged contract).
	eq(serviceDeadlineAt("2026-07-10T10:00:00.000+05:30", [{reason: "Weekend client delay", startedAt: "2026-07-11T10:00:00.000+05:30", endedAt: "2026-07-12T10:00:00.000+05:30", durationMs: 86400000}]), "2026-07-21T10:00:00.000+05:30")
	eq(serviceDeadlineAt("2026-07-16T00:15:00.000+05:30"), "2026-07-27T00:15:00.000+05:30")

	console.log("test-service-deadlines: ok")
} finally {
	rmSync(repo, {recursive: true, force: true})
}
