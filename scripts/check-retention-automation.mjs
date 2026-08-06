#!/usr/bin/env node
import { existsSync, readFileSync, readdirSync, realpathSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { homedir } from "node:os";
import { fileURLToPath } from "node:url";
import { execFileSync } from "node:child_process";
import { RETENTION_AUTOMATION_PROMPT } from "./lib/retention-automation.mjs";

const automationId = "tinystudio-retention-checkups";
const codexHome = process.env.CODEX_HOME || join(homedir(), ".codex");
const automationPath = join(codexHome, "automations", automationId, "automation.toml");
const scriptRepoRoot = dirname(dirname(fileURLToPath(import.meta.url)));
const expectedCwd = process.env.TINYSTUDIO_AUTOMATION_WORKSPACE || canonicalMainWorktree(scriptRepoRoot);
const isGithubActions = process.env.GITHUB_ACTIONS === "true";
const serviceRoot = process.env.SERVICE_REPO_ROOT || process.cwd();
const clientsPath = join(serviceRoot, "clients");
const paidProspectsPath = join(serviceRoot, "prospects");
const clientIds = new Set();
if (existsSync(clientsPath)) {
  for (const entry of readdirSync(clientsPath, { withFileTypes: true })) {
    if (entry.isDirectory() && !entry.name.startsWith(".")) clientIds.add(entry.name);
  }
}
if (existsSync(paidProspectsPath)) {
  for (const entry of readdirSync(paidProspectsPath, { withFileTypes: true })) {
    if (entry.isDirectory() && !entry.name.startsWith(".") && existsSync(join(paidProspectsPath, entry.name, "service-day0.json"))) clientIds.add(entry.name);
  }
}
const clientCount = clientIds.size;

function value(content, key) {
  const match = String(content || "").match(new RegExp(`^${key}\\s*=\\s*"([^"]*)"`, "m"));
  return match ? match[1] : "";
}

function missingPhrases(content, phrases) {
  return phrases.filter((phrase) => !String(content || "").includes(phrase));
}

function normalizedPath(path) {
  const absolute = resolve(path);
  try {
    return realpathSync(absolute);
  } catch {
    return absolute;
  }
}

function canonicalMainWorktree(repoRoot) {
  try {
    const output = execFileSync("git", ["-C", repoRoot, "worktree", "list", "--porcelain"], {
      encoding: "utf8",
      stdio: ["ignore", "pipe", "ignore"]
    });
    let worktree = "";
    for (const line of output.split("\n")) {
      if (line.startsWith("worktree ")) worktree = line.slice("worktree ".length);
      if (line === "branch refs/heads/main" && worktree) return worktree;
    }
  } catch {}
  return repoRoot;
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

if (!existsSync(automationPath)) {
  if (isGithubActions && clientCount === 0) {
    console.log(JSON.stringify({
      status: "warn",
      automationId,
      path: automationPath,
      weeklyCadence: "Friday retention prep",
      repo: expectedCwd,
      failures: [],
      warnings: ["Local Codex automation file is unavailable in GitHub Actions; verify this check on Nish's machine"]
    }, null, 2));
    process.exit(0);
  }

  if (clientCount === 0) {
    console.log(JSON.stringify({
      status: "pass",
      automationId,
      path: automationPath,
      weeklyCadence: "Friday retention prep",
      repo: expectedCwd,
      clientCount,
      failures: [],
      warnings: ["No client records exist; the scheduled retention loop becomes required before the first client is active"]
    }, null, 2));
    process.exit(0);
  }

  console.log(JSON.stringify({
    status: "fail",
    automationId,
    path: automationPath,
    clientCount,
    failures: ["Automation file is missing"],
    replacementPrompt: RETENTION_AUTOMATION_PROMPT,
    warnings: []
  }, null, 2));
  process.exit(1);
}

const content = readFileSync(automationPath, "utf8");
const prompt = value(content, "prompt");
const cadence = value(content, "rrule");
const failures = [];
const warnings = [];

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

console.log(JSON.stringify({
  status,
  automationId,
  path: automationPath,
  weeklyCadence: "Friday retention prep",
  repo: expectedCwd,
  failures,
  ...(failures.length ? { replacementPrompt: RETENTION_AUTOMATION_PROMPT } : {}),
  warnings
}, null, 2));

if (failures.length) process.exit(1);
