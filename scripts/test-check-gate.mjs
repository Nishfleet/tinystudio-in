#!/usr/bin/env node
// Gate regression detector (finding F8, product-tests sweep).
//
// The operator check-*.mjs scripts only exit 1 when passed --strict, and no
// automated caller passed it, so every automated invocation exited 0 no
// matter what the check found. This test proves the gate
// (scripts/run-check-gate.mjs) always runs its checks in strict mode and
// propagates a real finding as a non-zero exit:
//
//   1. a fixture check that is advisory WITHOUT --strict and fails WITH it
//      must make the gate exit non-zero (if the gate ever stops passing
//      --strict, the fixture exits 0 and this test fails);
//   2. a clean fixture must make the gate exit zero;
//   3. a missing check script must fail the gate loudly rather than pass.
import assert from "node:assert/strict"
const {equal: eq, notEqual: neq} = assert
import {spawnSync} from "node:child_process"
import {mkdirSync, mkdtempSync, rmSync, writeFileSync} from "node:fs"
import {tmpdir} from "node:os"
import {dirname, join} from "node:path"
import {fileURLToPath} from "node:url"

const gate = join(dirname(fileURLToPath(import.meta.url)), "run-check-gate.mjs")
const fixtureRoot = mkdtempSync(join(tmpdir(), "tinystudio-check-gate-"))

function runGate(args) {
	return spawnSync(process.execPath, [gate, ...args], {encoding: "utf8", timeout: 60_000})
}

try {
	// A strict-gated check that behaves exactly like the real operator
	// checks: advisory (exit 0) without --strict, failing (exit 1) with it.
	// If the gate regresses to advisory mode, this fixture exits 0 and the
	// gate exits 0, so the assertion below goes red.
	const failingCheck = join(fixtureRoot, "failing-check.mjs")
	writeFileSync(failingCheck, [
		"#!/usr/bin/env node",
		"if (!process.argv.includes('--strict')) {",
		"  console.log(JSON.stringify({status: 'warn', warnings: ['problem present but advisory']}))",
		"  process.exit(0)",
		"}",
		"console.error(JSON.stringify({status: 'failed', failures: ['fixture problem']}))",
		"process.exit(1)",
		""
	].join("\n"))

	const cleanCheck = join(fixtureRoot, "clean-check.mjs")
	writeFileSync(cleanCheck, [
		"#!/usr/bin/env node",
		"console.log(JSON.stringify({status: 'ready'}))",
		"process.exit(0)",
		""
	].join("\n"))

	const missingCheck = join(fixtureRoot, "missing-check.mjs")

	// 1. A check that found a problem must make the gate exit non-zero, and
	//    the gate must have run it in strict mode (the fixture exits 0
	//    without --strict, so a non-zero gate exit proves --strict was passed).
	const failing = runGate([failingCheck])
	neq(failing.status, 0, `gate must fail when a strict check detects a problem (stdout: ${failing.stdout}, stderr: ${failing.stderr})`)
	assert(failing.stdout.includes("exit 1"), `gate must propagate the check's exit code 1 (stdout: ${failing.stdout})`)
	assert(failing.stdout.includes(failingCheck), `gate must name the failing check (stdout: ${failing.stdout})`)

	// 2. A clean check must let the gate exit zero.
	const clean = runGate([cleanCheck])
	eq(clean.status, 0, `gate must pass when every strict check is clean (stdout: ${clean.stdout}, stderr: ${clean.stderr})`)

	// 3. A missing check script must fail the gate loudly, not silently pass.
	const missing = runGate([missingCheck])
	neq(missing.status, 0, `gate must fail loudly when a wired check script is missing (stdout: ${missing.stdout})`)

	console.log("Check gate propagation tests passed.")
} finally {
	rmSync(fixtureRoot, {recursive: true, force: true})
}
