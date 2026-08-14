#!/usr/bin/env node
import assert from "node:assert/strict"
const {equal: eq, deepEqual: deq, notEqual: neq} = assert
import {spawnSync} from "node:child_process"
import {mkdirSync, mkdtempSync, rmSync, symlinkSync, writeFileSync} from "node:fs"
import {tmpdir} from "node:os"
import {dirname, join} from "node:path"
import {fileURLToPath} from "node:url"
import {RETENTION_AUTOMATION_PROMPT} from "./lib/retention-automation.mjs"

const script = join(dirname(fileURLToPath(import.meta.url)), "check-retention-automation.mjs")
const fixtureRoot = mkdtempSync(join(tmpdir(), "tinystudio-retention-gate-"))
const remoteDir = join(fixtureRoot, "remote.git")
const repoDir = join(fixtureRoot, "repo")
const serviceRoot = join(fixtureRoot, "service-root")
const codexHome = join(fixtureRoot, "codex-home")
const automationPath = join(codexHome, "automations", "tinystudio-retention-checkups", "automation.toml")
const stateRootNames = ["clients", "prospects", "service-decisions", "runs/service-engine"]

function runGit(cwd, args) {
	const result = spawnSync("git", ["-c", "user.name=retention-test", "-c", "user.email=retention-test@example.invalid", ...args], {cwd, env: {...process.env, HOME: fixtureRoot}, encoding: "utf8"})
	if (result.status !== 0) throw new Error(`git ${args.join(" ")} failed: ${result.stderr}`)
	return result.stdout.trim()
}

function makeRoots() {
	for (const root of stateRootNames) mkdirSync(join(serviceRoot, root), {recursive: true})
}

function writeAutomation(prompt, workspace = repoDir) {
	mkdirSync(dirname(automationPath), {recursive: true})
	writeFileSync(automationPath, `id = "tinystudio-retention-checkups"\nkind = "cron"\nname = "TinyStudio retention checkups"\nprompt = "${prompt}"\nstatus = "ACTIVE"\nrrule = "FREQ=WEEKLY;BYDAY=FR;BYHOUR=9;BYMINUTE=0"\nworkspaces = ["${workspace}"]\n`)
}

function writeAutomationSingular(prompt, workspace = repoDir) {
	mkdirSync(dirname(automationPath), {recursive: true})
	writeFileSync(automationPath, `id = "tinystudio-retention-checkups"\nkind = "cron"\nname = "TinyStudio retention checkups"\nprompt = "${prompt}"\nstatus = "ACTIVE"\nrrule = "FREQ=WEEKLY;BYDAY=FR;BYHOUR=9;BYMINUTE=0"\nworkspace = "${workspace}"\n`)
}

function run(github = "false", preflightRepo = repoDir) {
	return spawnSync(process.execPath, [script], {cwd: fixtureRoot, env: {...process.env, CODEX_HOME: codexHome, GITHUB_ACTIONS: github, SERVICE_REPO_ROOT: serviceRoot, TINYSTUDIO_PREFLIGHT_REPO: preflightRepo}, encoding: "utf8"})
}

try {
	// Hermetic git fixture: the fixture repo's origin is a local bare remote,
	// so every freshness proof runs without touching the network.
	runGit(fixtureRoot, ["init", "--bare", "--initial-branch=main", "remote.git"])
	runGit(fixtureRoot, ["init", "--initial-branch=main", "repo"])
	writeFileSync(join(repoDir, "README.md"), "tinystudio retention gate fixture\n")
	runGit(repoDir, ["add", "README.md"])
	runGit(repoDir, ["commit", "-m", "base"])
	runGit(repoDir, ["remote", "add", "origin", remoteDir])
	runGit(repoDir, ["push", "-u", "origin", "main"])
	makeRoots()

	// Remote one-commit drift: the helper clone publishes one more commit, so
	// the fixture repo's HEAD and its stale origin/main tracking ref are both
	// behind the true remote main ref. The gate must fail on remote truth.
	const helperDir = join(fixtureRoot, "helper")
	runGit(fixtureRoot, ["clone", "--quiet", remoteDir, "helper"])
	writeFileSync(join(helperDir, "drift.txt"), "remote one-commit drift\n")
	runGit(helperDir, ["add", "drift.txt"])
	runGit(helperDir, ["commit", "-m", "drift"])
	runGit(helperDir, ["push", "origin", "HEAD:main"])
	const localHead = runGit(repoDir, ["rev-parse", "HEAD"])
	const staleTrackingRef = runGit(repoDir, ["rev-parse", "refs/remotes/origin/main"])
	const remoteSha = runGit(fixtureRoot, ["ls-remote", remoteDir, "refs/heads/main"]).split(/\s+/)[0]
	neq(staleTrackingRef, remoteSha, "fixture must present a stale local origin/main tracking ref")

	let result = run()
	neq(result.status, 0)
	let out = JSON.parse(result.stdout)
	assert(out.failures.some(failure => failure.includes("behind or diverged")), "stale checkout must fail on the remote ref even when the local tracking ref is stale")
	eq(out.freshness.remoteMain, remoteSha.slice(0, 7))
	eq(out.freshness.localHead, localHead.slice(0, 7))

	// Unavailable freshness proof fails loudly rather than passing.
	runGit(repoDir, ["remote", "set-url", "origin", join(fixtureRoot, "does-not-exist.git")])
	result = run()
	neq(result.status, 0)
	assert(JSON.parse(result.stdout).failures.some(failure => failure.includes("remote main ref is unreachable")), "unavailable freshness proof must fail loudly")
	runGit(repoDir, ["remote", "set-url", "origin", remoteDir])

	// Align the fixture repo with the true remote main ref.
	runGit(repoDir, ["fetch", "origin"])
	runGit(repoDir, ["reset", "--hard", "origin/main"])
	eq(runGit(repoDir, ["rev-parse", "HEAD"]), remoteSha)

	// Missing record roots fail the canonical-state-root contract; a checkout
	// with no state roots at all (the isolated empty clone) fails loudly.
	rmSync(join(serviceRoot, "clients"), {recursive: true, force: true})
	result = run()
	neq(result.status, 0)
	assert(JSON.parse(result.stdout).failures.includes("canonical state root missing: clients"))

	rmSync(join(serviceRoot, "prospects"), {recursive: true, force: true})
	mkdirSync(join(serviceRoot, "clients"), {recursive: true})
	result = run()
	neq(result.status, 0)
	assert(JSON.parse(result.stdout).failures.includes("canonical state root missing: prospects"))

	rmSync(join(serviceRoot, "clients"), {recursive: true, force: true})
	rmSync(join(serviceRoot, "service-decisions"), {recursive: true, force: true})
	rmSync(join(serviceRoot, "runs"), {recursive: true, force: true})
	result = run()
	neq(result.status, 0)
	assert(JSON.parse(result.stdout).failures.includes("canonical state root missing: clients"))
	assert(JSON.parse(result.stdout).failures.includes("canonical state root missing: prospects"))
	makeRoots()

	// Divergent counts fail, and diagnostics stay aggregate-only: client
	// identifiers never appear in the report.
	mkdirSync(join(serviceRoot, "clients", "alpha"), {recursive: true})
	mkdirSync(join(serviceRoot, "clients", "beta"), {recursive: true})
	mkdirSync(join(serviceRoot, "prospects", "gamma"), {recursive: true})
	writeFileSync(join(serviceRoot, "prospects", "gamma", "service-day0.json"), "{}\n")
	result = run()
	neq(result.status, 0)
	out = JSON.parse(result.stdout)
	eq(out.clientCount, 3)
	eq(out.roots.clients, 2)
	eq(out.roots.prospects, 1)
	assert(out.failures.some(failure => failure.includes("aggregate parity: service-decisions count 0 is below active client count 3")))
	assert(out.failures.some(failure => failure.includes("aggregate parity: runs/service-engine count 0 is below active client count 3")))
	assert(out.failures.includes("Automation file is missing"))
	assert(!result.stdout.includes("alpha") && !result.stdout.includes("beta") && !result.stdout.includes("gamma"), "diagnostics must reveal counts and root labels only")

	// Cover the divergence with decisions and engine artifacts, then the
	// automation file alone is the remaining failure.
	for (const app of ["alpha", "beta", "gamma"]) {
		mkdirSync(join(serviceRoot, "service-decisions", app), {recursive: true})
		mkdirSync(join(serviceRoot, "runs/service-engine", "packets", app), {recursive: true})
	}
	result = run()
	neq(result.status, 0)
	deq(JSON.parse(result.stdout).failures, ["Automation file is missing"])

	// Aligned state passes: remote main is the ancestor of the local HEAD,
	// every root exists, every active client is covered, and the automation
	// file is valid.
	writeAutomation(RETENTION_AUTOMATION_PROMPT)
	result = run()
	eq(result.status, 0)
	out = JSON.parse(result.stdout)
	eq(out.status, "pass")
	deq(out.failures, [])
	eq(out.clientCount, 3)
	deq(out.roots, {clients: 2, prospects: 1, "service-decisions": 3, "runs/service-engine": 3})
	eq(out.freshness.localHead, out.freshness.remoteMain)
	eq(out.freshness.remoteMain, remoteSha.slice(0, 7))

	// Legacy no-client state: automation missing with no records still passes
	// with a warning once the preflight is aligned.
	rmSync(automationPath, {force: true})
	rmSync(join(serviceRoot, "clients"), {recursive: true, force: true})
	mkdirSync(join(serviceRoot, "clients"))
	rmSync(join(serviceRoot, "prospects"), {recursive: true, force: true})
	mkdirSync(join(serviceRoot, "prospects"))
	rmSync(join(serviceRoot, "service-decisions"), {recursive: true, force: true})
	mkdirSync(join(serviceRoot, "service-decisions"))
	rmSync(join(serviceRoot, "runs"), {recursive: true, force: true})
	mkdirSync(join(serviceRoot, "runs/service-engine"), {recursive: true})

	result = run()
	eq(result.status, 0)
	eq(JSON.parse(result.stdout).clientCount, 0)

	mkdirSync(join(serviceRoot, "prospects", "paid-service-client"), {recursive: true})
	writeFileSync(join(serviceRoot, "prospects", "paid-service-client", "service-day0.json"), "{}\n")
	result = run()
	neq(result.status, 0)
	out = JSON.parse(result.stdout)
	eq(out.clientCount, 1)
	assert(out.failures.includes("Automation file is missing"))
	assert(out.failures.some(failure => failure.includes("aggregate parity")))
	assert(!result.stdout.includes("paid-service-client"), "diagnostics must not reveal prospect identifiers")
	rmSync(join(serviceRoot, "prospects"), {recursive: true, force: true})
	mkdirSync(join(serviceRoot, "prospects"))

	mkdirSync(join(serviceRoot, "clients", "active-client"), {recursive: true})
	result = run()
	neq(result.status, 0)
	out = JSON.parse(result.stdout)
	eq(out.clientCount, 1)
	assert(out.failures.includes("Automation file is missing"))
	assert(!result.stdout.includes("active-client"), "diagnostics must not reveal client identifiers")

	// GitHub Actions cannot host the private state or the freshness proof, so
	// the preflight reports itself skipped and CI keeps its warn behavior.
	result = run("true")
	eq(result.status, 0)
	out = JSON.parse(result.stdout)
	eq(out.status, "warn")
	eq(out.freshness.skipped, true)
	rmSync(join(serviceRoot, "clients"), {recursive: true, force: true})
	mkdirSync(join(serviceRoot, "clients"))

	writeAutomation("Run the retention automation check with the weekly client value loop, retention checkups, internal dashboard, value stress, and monthly review. Do not send client messages or approve claims automatically.")
	result = run()
	neq(result.status, 0)
	assert(JSON.parse(result.stdout).failures.some(failure => failure.includes("retired service concept")))

	writeAutomation(RETENTION_AUTOMATION_PROMPT, "/tmp/wrong-tinystudio-workspace")
	result = run()
	neq(result.status, 0)
	assert(JSON.parse(result.stdout).failures.includes("Automation does not point at the TinyStudio repo"))

	writeAutomation(RETENTION_AUTOMATION_PROMPT)
	result = run()
	eq(result.status, 0)
	eq(JSON.parse(result.stdout).status, "pass")

	const linkDir = join(fixtureRoot, "repo-link")
	symlinkSync(repoDir, linkDir, "dir")
	writeAutomation(RETENTION_AUTOMATION_PROMPT, linkDir)
	result = run()
	eq(result.status, 0)
	eq(JSON.parse(result.stdout).status, "pass")

	writeAutomationSingular(RETENTION_AUTOMATION_PROMPT)
	result = run()
	eq(result.status, 0)
	eq(JSON.parse(result.stdout).status, "pass")

	// Closed-twin regression: when the repository's main worktree is detached,
	// `refs/heads/main` gets checked out in some other worktree (the twin). The
	// twin must never become the canonical retention workspace: the gate has to
	// keep inspecting the main worktree's state, and the automation still has
	// to point at the main worktree, not the twin.
	const twinDir = join(fixtureRoot, "twin")
	runGit(repoDir, ["checkout", "--detach"])
	runGit(repoDir, ["worktree", "add", twinDir, "main"])

	// Automation pointed at the main worktree still passes while the twin holds
	// the main branch.
	writeAutomation(RETENTION_AUTOMATION_PROMPT, repoDir)
	result = run()
	eq(result.status, 0)
	eq(JSON.parse(result.stdout).status, "pass")

	// The canonical workspace must resolve by git-dir ownership, not by list
	// position or by which worktree holds `refs/heads/main`. When the twin is
	// the first porcelain entry (e.g. the main worktree is detached), the gate
	// still has to inspect the main worktree's state — never the twin's.
	{
		const {canonicalMainWorktree} = await import("./lib/retention-preflight.mjs")
		const canonical = canonicalMainWorktree(repoDir)
		eq(canonical, repoDir, "canonical workspace must be the git-dir owner even when the twin holds main and heads the porcelain list")
	}

	// Automation pointed at the twin fails: the twin is not the TinyStudio repo.
	writeAutomation(RETENTION_AUTOMATION_PROMPT, twinDir)
	result = run()
	neq(result.status, 0)
	out = JSON.parse(result.stdout)
	assert(out.failures.includes("Automation does not point at the TinyStudio repo"), "twin workspace must not be accepted as the TinyStudio repo")

	// A stale canonical workspace fails even when the gate runs from a fresh
	// checkout elsewhere in the same repository: the Friday loop would run the
	// canonical workspace's old gate code.
	const staleBase = runGit(repoDir, ["rev-parse", "HEAD~1"])
	runGit(repoDir, ["reset", "--hard", staleBase])
	writeAutomation(RETENTION_AUTOMATION_PROMPT, repoDir)
	result = run("false", twinDir)
	neq(result.status, 0)
	out = JSON.parse(result.stdout)
	assert(out.failures.includes("retention workspace is stale: checkout is behind or diverged from remote main"), "stale canonical workspace must fail closed even when the gate runs from a fresh checkout")
	assert(!out.failures.includes("Automation does not point at the TinyStudio repo"), "stale canonical workspace must fail on staleness, not on the workspace pointer")
	runGit(repoDir, ["reset", "--hard", remoteSha])

	console.log("Retention automation applicability checks passed.")
} finally {
	rmSync(fixtureRoot, {recursive: true, force: true})
}
