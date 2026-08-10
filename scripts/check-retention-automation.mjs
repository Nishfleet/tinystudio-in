#!/usr/bin/env node
import {existsSync, readFileSync} from "node:fs";
import {dirname, join} from "node:path";
import {homedir} from "node:os";
import {fileURLToPath} from "node:url";
import {RETENTION_AUTOMATION_PROMPT} from "./lib/retention-automation.mjs";
import {canonicalMainWorktree, normalizedPath, runPreflight, scriptRepoRoot} from "./lib/retention-preflight.mjs";

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

  if (clientCount === 0 && failures.length === 0) {
    console.log(JSON.stringify({
      ...report("pass"),
      warnings: ["No client records exist; the scheduled retention loop becomes required before the first client is active"]
    }, null, 2));
    process.exit(0);
  }

  failures.push("Automation file is missing");
  console.log(JSON.stringify(report("fail"), null, 2));
  process.exit(1);
}

const content = readFileSync(automationPath, "utf8");
const prompt = value(content, "prompt");
const cadence = value(content, "rrule");

if (value(content, "id") !== automationId) failures.push("Automation id does not match TinyStudio retention checkups");
if (value(content, "kind") !== "cron") failures.push("Automation is not a cron automation");
if (value(content, "status") !== "ACTIVE") failures.push("Automation is not active");
const expectedRepo = normalizedPath(expectedCwd);
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
  "Do not renew"
])) {
  failures.push(`Automation prompt missing: ${missing}`);
}

for (const retiredPhrase of ["weekly client value loop", "retention checkups", "internal dashboard", "value stress", "monthly review"]) {
  if (prompt.includes(retiredPhrase)) failures.push(`Automation prompt retains retired service concept: ${retiredPhrase}`);
}

const status = failures.length ? "fail" : warnings.length ? "warn" : "pass";

console.log(JSON.stringify(report(status), null, 2));

if (failures.length) process.exit(1);
