#!/usr/bin/env node
import {existsSync, readFileSync} from "node:fs";
import {dirname, join} from "node:path";
import {homedir} from "node:os";
import {fileURLToPath} from "node:url";
import {RETENTION_AUTOMATION_PROMPT} from "./lib/retention-automation.mjs";
import {canonicalMainWorktree, normalizedPath, proveFreshness, runPreflight, scriptRepoRoot} from "./lib/retention-preflight.mjs";

// --advisory keeps every finding visible but never fails the run. The shared
// `npm run check` regression suite runs the gate in advisory mode so a
// machine's real private state lagging behind (unrecorded decisions, missing
// engine artifacts, a stale canonical workspace, a missing automation file)
// cannot permanently redden the suite and starve the checks after it. The
// strict fail-closed behavior stays the default for the Friday retention loop
// (`npm run retention:automation-check`), which is the consumer the preflight
// contract protects.
const advisory = process.argv.includes("--advisory");
const automationId = "tinystudio-retention-checkups";
const codexHome = process.env.CODEX_HOME || join(homedir(), ".codex");
const automationPath = join(codexHome, "automations", automationId, "automation.toml");
const repoForFreshness = process.env.TINYSTUDIO_PREFLIGHT_REPO || scriptRepoRoot();
const expectedCwd = process.env.TINYSTUDIO_AUTOMATION_WORKSPACE || canonicalMainWorktree(repoForFreshness);
const isGithubActions = process.env.GITHUB_ACTIONS === "true";
const stateRoot = process.env.SERVICE_REPO_ROOT || canonicalMainWorktree(repoForFreshness);
const preflight = runPreflight({repoRoot: repoForFreshness, stateRoot, isGithubActions});
const clientCount = preflight.activeClients;
const failures = [...preflight.failures];
const warnings = [...preflight.warnings];

// The Friday loop runs from the canonical retention workspace, so that
// workspace itself must not be a stale checkout running old gate code. When
// the script runs from the same checkout the preflight already proved it;
// otherwise prove the canonical workspace directly.
const expectedRepo = normalizedPath(expectedCwd);
const canonicalFreshness =
  normalizedPath(repoForFreshness) === expectedRepo ? preflight.freshness : proveFreshness(expectedCwd);
if (canonicalFreshness && canonicalFreshness.ok === false) {
  failures.push(`retention workspace is stale: ${canonicalFreshness.reason}`);
}

function value(content, key) {
  const match = String(content || "").match(new RegExp(`^${key}\\s*=\\s*"([^"]*)"`, "m"));
  return match ? match[1] : "";
}

function missingPhrases(content, phrases) {
  return phrases.filter((phrase) => !String(content || "").includes(phrase));
}

function configuredWorkspacePaths(content) {
  const paths = [];
  const assignment = /\b(?:project_id|workspace|workspaces|cwd|cwds)\s*=\s*(?:"([^"]+)"|\[([^\]]*)\])/g;
  for (const match of String(content || "").matchAll(assignment)) {
    if (match[1]) paths.push(match[1]);
    if (match[2]) {
      for (const pathMatch of match[2].matchAll(/"([^"]+)"/g)) paths.push(pathMatch[1]);
    }
  }
  return paths;
}

function report(status) {
  return {
    status,
    automationId,
    path: automationPath,
    weeklyCadence: "Friday retention prep",
    repo: expectedCwd,
    clientCount,
    freshness: preflight.freshness,
    roots: preflight.roots,
    failures,
    ...(failures.length ? {replacementPrompt: RETENTION_AUTOMATION_PROMPT} : {}),
    warnings
  };
}

if (!existsSync(automationPath)) {
  if (isGithubActions && clientCount === 0) {
    console.log(JSON.stringify({
      ...report("warn"),
      warnings: ["Local Codex automation file is unavailable in GitHub Actions; verify this check on Nish's machine"]
    }, null, 2));
    process.exit(0);
  }

  // An aligned-but-empty canonical workspace must not green-pass without the
  // automation guard: the scheduled loop is required before the first client
  // becomes active, so a missing automation file is a failure even when no
  // client records exist yet. Advisory mode reports it without failing.
  failures.push("Automation file is missing");
  if (advisory) {
    warnings.push("Advisory mode: retention-gate findings are reported without failing the shared check run");
    console.log(JSON.stringify(report("warn"), null, 2));
    process.exit(0);
  }
  console.log(JSON.stringify(report("fail"), null, 2));
  process.exit(1);
}

const content = readFileSync(automationPath, "utf8");
const prompt = value(content, "prompt");
const cadence = value(content, "rrule");

if (value(content, "id") !== automationId) failures.push("Automation id does not match TinyStudio retention checkups");
if (value(content, "kind") !== "cron") failures.push("Automation is not a cron automation");
if (value(content, "status") !== "ACTIVE") failures.push("Automation is not active");
const configuredRepos = configuredWorkspacePaths(content).map(normalizedPath);
if (!configuredRepos.includes(expectedRepo)) failures.push("Automation does not point at the TinyStudio repo");
if (!/^FREQ=WEEKLY;/.test(cadence) || !cadence.includes("BYDAY=FR")) failures.push("Automation is not scheduled as the weekly Friday retention loop");

for (const missing of missingPhrases(prompt, [
  "retention automation check",
  "service:queue",
  "service:evidence",
  "14-day implementation tracking",
  "proof/claim blockers",
  "human renewal",
  "Do not send client messages",
  "Do not approve claims automatically",
  "Do not accept delivery",
  "Do not renew",
  "Before inspecting any private state",
  "fetch origin/main",
  "named workspace onto origin/main",
  "re-run the freshness proof",
  "still behind or diverged",
  "Do not inspect service:queue or service:evidence"
])) {
  failures.push(`Automation prompt missing: ${missing}`);
}

for (const retiredPhrase of ["weekly client value loop", "retention checkups", "internal dashboard", "value stress", "monthly review"]) {
  if (prompt.includes(retiredPhrase)) failures.push(`Automation prompt retains retired service concept: ${retiredPhrase}`);
}

if (advisory && failures.length) {
  warnings.push("Advisory mode: retention-gate findings are reported without failing the shared check run");
}

const status = failures.length && !advisory ? "fail" : warnings.length ? "warn" : "pass";

console.log(JSON.stringify(report(status), null, 2));

if (failures.length && !advisory) process.exit(1);
