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
// Canonical operator runtime: the checkout that owns the aggregate private
// service state. Defaults to the main worktree; overridable for hermetic runs.
const canonicalRuntimeRoot = process.env.TINYSTUDIO_CANONICAL_RUNTIME || canonicalMainWorktree(scriptRepoRoot);
// The only service-state roots compared. Counts stay aggregate: record names,
// deeper paths, and file contents are never read into the report.
const AGGREGATE_ROOTS = ["clients", "prospects", "service-decisions", "runs/service-engine"];
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

// Counts only top-level directories directly under each aggregate root; a
// missing or unreadable root reports null so it can never be mistaken for an
// empty root.
function aggregateRootCounts(root) {
  const counts = {};
  for (const relative of AGGREGATE_ROOTS) {
    const dir = join(root, relative);
    if (!existsSync(dir)) {
      counts[relative] = null;
      continue;
    }
    try {
      let count = 0;
      for (const entry of readdirSync(dir, { withFileTypes: true })) {
        if (entry.isDirectory() && !entry.name.startsWith(".")) count += 1;
      }
      counts[relative] = count;
    } catch {
      counts[relative] = null;
    }
  }
  return counts;
}

function gitSha(repo, ref) {
  try {
    return execFileSync("git", ["-C", repo, "rev-parse", ref], {
      encoding: "utf8",
      stdio: ["ignore", "pipe", "ignore"]
    }).trim();
  } catch {
    return "";
  }
}

// Fetches current origin/main in the configured checkout and resolves it.
// Any failure (not a git repo, no origin, unreachable, hung fetch) returns ""
// so the caller fails closed instead of trusting a stale ref.
function currentOriginMain(repo) {
  try {
    execFileSync("git", ["-C", repo, "fetch", "--quiet", "--no-tags", "origin", "main"], {
      stdio: ["ignore", "ignore", "ignore"],
      timeout: 60000
    });
    return gitSha(repo, "origin/main");
  } catch {
    return "";
  }
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

// Environment gates only bind once client records exist: the Friday retention
// loop is optional while no clients are active, so an empty checkout must not
// be blocked on checkout freshness or canonical-state parity.
const checkout = { head: null, originMain: null };
const aggregateState = {};
const canonicalState = {};
if (clientCount > 0) {
  checkout.head = gitSha(expectedRepo, "HEAD");
  checkout.originMain = currentOriginMain(expectedRepo);
  if (!checkout.head || !checkout.originMain) {
    failures.push("Cannot verify configured checkout against current origin/main");
  } else if (checkout.head !== checkout.originMain) {
    failures.push("Configured checkout HEAD differs from current origin/main");
  }

  Object.assign(aggregateState, aggregateRootCounts(serviceRoot));
  Object.assign(canonicalState, aggregateRootCounts(canonicalRuntimeRoot));
  for (const relative of AGGREGATE_ROOTS) {
    const automationCount = aggregateState[relative];
    const canonicalCount = canonicalState[relative];
    if (automationCount === null && canonicalCount === null) continue;
    if (automationCount === null) {
      failures.push(`Aggregate service root ${relative} is inaccessible in the automation runtime`);
    } else if (canonicalCount === null) {
      failures.push(`Aggregate service root ${relative} is inaccessible in the canonical runtime`);
    } else if (automationCount !== canonicalCount) {
      failures.push(`Aggregate service state diverges from canonical runtime (root: ${relative})`);
    }
  }
}

const status = failures.length ? "fail" : warnings.length ? "warn" : "pass";

console.log(JSON.stringify({
  status,
  automationId,
  path: automationPath,
  weeklyCadence: "Friday retention prep",
  repo: expectedCwd,
  clientCount,
  checkout,
  aggregateState,
  canonicalState,
  failures,
  ...(failures.length ? { replacementPrompt: RETENTION_AUTOMATION_PROMPT } : {}),
  warnings
}, null, 2));

if (failures.length) process.exit(1);
