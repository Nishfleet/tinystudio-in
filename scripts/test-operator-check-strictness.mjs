#!/usr/bin/env node
// Durable regression detector for finding tinystudio-operator-checks-default-advisory:
// named operator/readiness npm commands must exit NONZERO when readiness is blocked,
// without any hidden --strict flag, and GREEN fixtures must pass. Advisory behavior is
// preserved only under explicitly named <command>:advisory aliases, which are not used
// by the required gates (npm run ci / npm run test).
//
// The strict default lives in the npm script wiring (package.json supplies --strict);
// the underlying check-*.mjs scripts keep their advisory default for direct invocation,
// which the canonical suites (test-client-readiness-contract.mjs,
// test-active-operator-surfaces.mjs) assert by design.
import assert from "node:assert/strict"
import {spawnSync} from "node:child_process"
import {cpSync, existsSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync} from "node:fs"
import {tmpdir} from "node:os"
import {dirname, join} from "node:path"
import {fileURLToPath} from "node:url"

const {equal: eq, notEqual: neq, ok} = assert
const C = dirname(dirname(fileURLToPath(import.meta.url)))
const T = mkdtempSync(join(tmpdir(), "tinystudio-operator-check-strictness-"))
const S = join(T, "scripts")
const LOOM = "https://www.loom.com/share/1234567890abcdef1234567890abcdef"

// Named readiness/operator commands that must be strict by default (blocked -> nonzero).
const STRICT_COMMANDS = [
	["client:check", ["clients/blocked-client"]],
	["prospect:check", ["prospects/blocked-prospect"]],
	["market:parity", []],
	["send:setup", []],
	["prospect:site-check", []],
	["market:proof-check", []]
]

function npmRun(root, command, args = []) {
	const executable = process.env.npm_execpath
		? [process.execPath, process.env.npm_execpath]
		: ["npm"]
	const argv = [...executable, "run", command, ...(args.length ? ["--", ...args] : [])]
	return spawnSync(argv[0], argv.slice(1), {
		cwd: root,
		encoding: "utf8",
		timeout: 120000,
		env: {...process.env, SERVICE_REPO_ROOT: root}
	})
}

function writeJson(path, value) {
	mkdirSync(dirname(path), {recursive: true})
	writeFileSync(path, `${JSON.stringify(value, null, 2)}\n`)
}

function write(path, content) {
	mkdirSync(dirname(path), {recursive: true})
	writeFileSync(path, content)
}

function parsePayload(ran, label) {
	// npm prints a "> script" banner line on stdout before the JSON payload.
	const text = [ran.stdout, ran.stderr].filter(Boolean).join("\n")
	const start = text.indexOf("{")
	if (start < 0) throw new Error(`${label} did not print JSON: ${text}`)
	try {
		return JSON.parse(text.slice(start))
	} catch {
		throw new Error(`${label} did not print a valid JSON payload: ${text}`)
	}
}

try {
	// Fixture root A: canonical code + data surfaces with deliberate blocked state.
	for (const directory of ["scripts", "growth-brain", "contracts", "docs"]) {
		cpSync(join(C, directory), join(T, directory), {recursive: true})
	}
	for (const file of ["TASKS.md", "PRODUCT.md", "AGENT_WORKFLOW.md", "MEMORY.md", "README.md", "package.json"]) {
		cpSync(join(C, file), join(T, file))
	}
	mkdirSync(join(T, "prospects"), {recursive: true})
	mkdirSync(join(T, "clients"), {recursive: true})

	// Strip sender identity from the fixture config so send:setup and market:parity
	// reach their blocked verdict without network DNS lookups.
	const configPath = join(T, "growth-brain/ops/agency-config.json")
	const agencyConfig = JSON.parse(readFileSync(configPath, "utf8"))
	delete agencyConfig.senderEmail
	delete agencyConfig.senderPhysicalAddress
	delete agencyConfig.dkimSelector
	delete agencyConfig.senderDomain
	writeJson(configPath, agencyConfig)

	// Blocked fixtures.
	mkdirSync(join(T, "clients/blocked-client"), {recursive: true}) // no canonical service application
	writeJson(join(T, "prospects/blocked-prospect/metadata.json"), {name: "Blocked Prospect", slug: "blocked-prospect", vertical: "managed-it-cybersecurity", contact: "Founder"})
	writeJson(join(T, "prospects/blocked-prospect/pipeline.json"), {stage: "new", createdAt: "2026-08-01", sentAt: "", sentChannel: "", lastChannel: "", lastTouchAt: "", nextFollowUpAt: "", followUps: [], touches: [], notes: []})
	// Unreachable loopback site: deterministic failure, no external network.
	writeJson(join(T, "prospects/blocked-site/metadata.json"), {name: "Blocked Site", slug: "blocked-site", website: "http://127.0.0.1:1/", vertical: "managed-it-cybersecurity", contact: "Founder"})
	writeJson(join(T, "prospects/blocked-site/pipeline.json"), {stage: "new", createdAt: "2026-08-01", sentAt: "", sentChannel: "", lastChannel: "", lastTouchAt: "", nextFollowUpAt: "", followUps: [], touches: [], notes: []})
	write(join(T, "prospects/loom-links.txt"), "# No approved rows yet\n")

	for (const [command, args] of STRICT_COMMANDS) {
		const ran = npmRun(T, command, args)
		neq(ran.status, 0, `named ${command} must fail on a blocked fixture (exit ${ran.status}): ${ran.stderr || ran.stdout}`)
	}

	// Verdict content asserts the failure is the honest blocked verdict, not a crash.
	const parity = npmRun(T, "market:parity")
	eq(parsePayload(parity, "market:parity").status, "not-11-10-yet")
	ok(parsePayload(parity, "market:parity").blockers.length >= 1)
	eq(parsePayload(npmRun(T, "prospect:check", ["prospects/blocked-prospect"]), "prospect:check").status, "draft")
	eq(parsePayload(npmRun(T, "client:check", ["clients/blocked-client"]), "client:check").status, "draft")
	eq(parsePayload(npmRun(T, "send:setup"), "send:setup").status, "warn")
	eq(parsePayload(npmRun(T, "prospect:site-check"), "prospect:site-check").status, "warning")
	ok(parsePayload(npmRun(T, "prospect:site-check"), "prospect:site-check").failures.length >= 1)
	eq(parsePayload(npmRun(T, "market:proof-check"), "market:proof-check").status, "needs-recording")

	// Advisory aliases: unmistakably named, same blocked state, exit zero (report only).
	for (const [command, args] of STRICT_COMMANDS) {
		const advisory = npmRun(T, `${command}:advisory`, args)
		eq(advisory.status, 0, `advisory ${command}:advisory must exit 0 on a blocked fixture (exit ${advisory.status}): ${advisory.stderr || advisory.stdout}`)
	}

	// Green fixture: a fully prepared outbound prospect (ready for prospect:check and,
	// with a sent touch, a captured proof run for market:proof-check).
	const G = join(T, "prospects/green-prospect")
	writeJson(join(G, "metadata.json"), {name: "Green Prospect", slug: "green-prospect", website: "https://example.com/green", vertical: "managed-it-cybersecurity", contact: "Founder"})
	writeJson(join(G, "pipeline.json"), {
		stage: "replied",
		createdAt: "2026-08-01",
		sentAt: "2026-08-02T10:00:00.000Z",
		sentChannel: "dm",
		lastChannel: "dm",
		lastTouchAt: "2026-08-02T10:00:00.000Z",
		nextFollowUpAt: "",
		followUps: [],
		touches: [{action: "sent", channel: "dm", note: LOOM}],
		notes: [{date: "2026-08-02", action: "sent", note: LOOM}]
	})
	write(join(G, "lead-score.md"), "- Score: 14/16\n- Priority: record\n")
	write(join(G, "loom-outline.md"), "## Loom outline\n\n3. Specific fault: Homepage CTA is buried below the fold\n4. Buyer impact: Founder cannot reach pricing without scrolling\n6. First fix: Move the primary CTA above the fold\n")
	write(join(G, "loom-package.md"), "## Loom package\n\n- Link: " + LOOM + "\n")
	write(join(G, "page-snapshot.md"), "## Page snapshot\n\nCaptured on 2026-08-01.\n")
	write(join(G, "recording-sharpness-brief.md"), "## Recording Sharpness\n\nRecord the fault and fix on the live page.\n")
	write(join(G, "recording-script.md"), "## Live Page Cues\n\nPoint at the buried CTA.\n\n## Recording Sharpness\n\nKeep the ask concrete.\n")
	write(join(G, "outreach.md"), "## Outreach\n\nHi, quick note about the buried homepage CTA. Reply no to opt out.\n")
	write(join(G, "buyer-room.md"), "## Buyer room\n\n- Price: $1,000 founder pilot\n- Fault: Homepage CTA buried below the fold\n")
	write(join(G, "value-calculator.md"), "## Value Calculator\n\nEstimated impact for the founder pilot.\n")
	write(join(G, "audit-brief.md"), "## Audit Brief\n\nOne highest-leverage page.\n")
	write(join(G, "recording-notes.md"), "Visible fault: Homepage CTA is buried below the fold\nBuyer impact: Founder cannot reach pricing quickly\nFirst fix: Move the primary CTA above the fold\nClean ask: Schedule a walkthrough of the correction\n")
	write(join(G, "send-package.md"), `- Prospect: Green Prospect\n- Loom: ${LOOM}\n- Readiness: ready\n- Loom quality: approved\n\n## Recording Notes\n\nCaptured the fault, impact, fix, and ask from the recording.\n\nReply no to unsubscribe from future messages.\n`)
	write(join(T, "prospects/loom-links.txt"), `${G}|${LOOM}|approved|Homepage CTA buried below fold|Founder cannot reach pricing quickly|Move primary CTA above fold|Schedule a walkthrough\n`)

	const greenProspectCheck = npmRun(T, "prospect:check", ["prospects/green-prospect"])
	eq(greenProspectCheck.status, 0, greenProspectCheck.stderr || greenProspectCheck.stdout)
	eq(parsePayload(greenProspectCheck, "green prospect:check").status, "ready")
	const greenProofCheck = npmRun(T, "market:proof-check", ["--limit=1"])
	eq(greenProofCheck.status, 0, greenProofCheck.stderr || greenProofCheck.stdout)
	eq(parsePayload(greenProofCheck, "green market:proof-check").status, "sent-proof-captured")

	// Fixture root B: no queued prospects -> prospect:site-check is green.
	const B = join(T, "site-check-green")
	mkdirSync(join(B, "prospects"), {recursive: true})
	for (const file of ["scripts", "package.json"]) cpSync(join(C, file), join(B, file), {recursive: true})
	eq(npmRun(B, "prospect:site-check").status, 0, "site-check must pass with no queued prospects")

	// Gate hygiene: required gates run the strictness detector and never advisory aliases.
	const realPackage = JSON.parse(readFileSync(join(C, "package.json"), "utf8"))
	for (const gate of ["ci", "test"]) {
		ok(realPackage.scripts[gate].includes("test-operator-check-strictness.mjs"), `${gate} must run the operator-check strictness detector`)
		ok(!realPackage.scripts[gate].includes(":advisory"), `${gate} must not use advisory aliases`)
	}

	console.log("Operator check strictness checks passed.")
} finally {
	rmSync(T, {recursive: true, force: true})
}
