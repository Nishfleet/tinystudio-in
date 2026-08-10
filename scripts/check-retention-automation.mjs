#!/usr/bin/env node
import { existsSync, statSync, readFileSync, readdirSync, realpathSync } from "node:fs";
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

// Shared private state roots the retention automation operates on. These are
// structural labels only; reports never include record names or content.
const STATE_DIRS = ["clients", "prospects", "service-decisions", "runs/service-engine"];

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

function git(args, cwd) {
  return execFileSync("git", args, {
    cwd,
    encoding: "utf8",
    timeout: 20000,
    stdio: ["ignore", "pipe", "pipe"],
    env: {
      ...process.env,
      GIT_TERMINAL_PROMPT: "0",
      GIT_CONFIG_COUNT: "1",
      GIT_CONFIG_KEY_0: "protocol.file.allow",
      GIT_CONFIG_VALUE_0: "always"
    }
  }).trim();
}

function stateRootExists(rootBase, root) {
  return existsSync(join(rootBase, ...root.split("/")));
}

function stateRootIsAccessible(rootBase, root) {
  const path = join(rootBase, ...root.split("/"));
  try {
    return existsSync(path) && statSync(path).isDirectory() && readdirSync(path) !== null;
  } catch {
    return false;
  }
}

function stateRootCount(rootBase, root) {
  try {
    return readdirSync(join(rootBase, ...root.split("/"))).filter((name) => !name.startsWith(".")).length;
  } catch {
    return -1;
  }
}

// Source freshness: current remote main must be provable from the canonical
// runtime root, or the gate fails closed. SHAs are proof artifacts, not record
// content; failure text stays actionable without naming records.
function proveSourceFreshness(repoRoot) {
  let head = "";
  try {
    head = git(["rev-parse", "--verify", "HEAD"], repoRoot);
  } catch {
    return {
      status: "fail",
      failures: [`Unable to prove current remote main at ${repoRoot}: repository HEAD cannot be read`]
    };
  }
  let remoteMain = "";
  try {
    for (const line of git(["ls-remote", "origin", "refs/heads/main"], repoRoot).split("\n")) {
      const [sha, ref] = line.split("\t");
      if (ref === "refs/heads/main" && /^[0-9a-f]{40}$/i.test(sha || "")) {
        remoteMain = sha;
        break;
      }
    }
  } catch {}
  if (!remoteMain) {
    return {
      status: "fail",
      head,
      failures: [`Unable to prove current remote main at ${repoRoot}: origin main is not reachable; run the gate with access to the repo remote`]
    };
  }
  if (head !== remoteMain) {
    return {
      status: "fail",
      head,
      remoteMain,
      failures: [`Local HEAD is not current remote main at ${repoRoot}; pull the latest main before running the retention automation`]
    };
  }
  return { status: "pass", head, remoteMain };
}

// Preflight result contract: explicit source-freshness, state-access, and
// aggregate-parity verdicts over the canonical runtime root and the service
// root, with root labels and counts only. Deferred until shared private state
// exists at the service root; active and fail-closed once it does.
function runPreflight() {
  const canonicalRuntimeRoot = normalizedPath(expectedCwd);
  if (!STATE_DIRS.some((root) => stateRootExists(serviceRoot, root))) {
    return {
      status: "deferred",
      canonicalRuntimeRoot,
      serviceRoot,
      warnings: [
        "Retention preflight deferred: no shared private state found at the service root; the gate activates once clients/, prospects/, service-decisions/, or runs/service-engine/ exists"
      ]
    };
  }

  const failures = [];
  const verdicts = {};

  if (!existsSync(canonicalRuntimeRoot) || !statSync(canonicalRuntimeRoot).isDirectory()) {
    failures.push(`Canonical runtime root is not resolvable: ${canonicalRuntimeRoot}`);
  }

  verdicts.sourceFreshness = proveSourceFreshness(canonicalRuntimeRoot);
  if (verdicts.sourceFreshness.status !== "pass") failures.push(...verdicts.sourceFreshness.failures);

  const stateAccessFailures = [];
  for (const [label, base] of [["canonical runtime root", canonicalRuntimeRoot], ["service root", serviceRoot]]) {
    for (const root of STATE_DIRS) {
      if (!stateRootIsAccessible(base, root)) {
        stateAccessFailures.push(`State root not accessible: ${root} at ${label} (${base})`);
      }
    }
  }
  verdicts.stateAccess = stateAccessFailures.length ? { status: "fail", failures: stateAccessFailures } : { status: "pass" };
  if (stateAccessFailures.length) failures.push(...stateAccessFailures);

  const counts = {};
  const parityFailures = [];
  for (const root of STATE_DIRS) {
    const canonicalCount = stateRootCount(canonicalRuntimeRoot, root);
    const serviceCount = stateRootCount(serviceRoot, root);
    counts[root] = { canonical: canonicalCount, service: serviceCount };
    if (canonicalCount >= 0 && serviceCount >= 0 && canonicalCount !== serviceCount) {
      parityFailures.push(`Aggregate parity mismatch: ${root} ${canonicalCount} at canonical runtime root != ${serviceCount} at service root`);
    }
  }
  verdicts.aggregateParity = parityFailures.length ? { status: "fail", counts, failures: parityFailures } : { status: "pass", counts };
  if (parityFailures.length) failures.push(...parityFailures);

  return {
    status: failures.length ? "fail" : "pass",
    canonicalRuntimeRoot,
    serviceRoot,
    ...verdicts,
    failures
  };
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
const configuredRepos = [];
for (const rawPath of configuredWorkspacePaths(content)) {
  if (existsSync(rawPath) && statSync(rawPath).isDirectory()) configuredRepos.push(normalizedPath(rawPath));
  else failures.push(`Automation workspace root is not resolvable: ${rawPath}`);
}
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

const preflight = runPreflight();
warnings.push(...(preflight.warnings || []));
for (const failure of preflight.failures || []) failures.push(failure);

const status = failures.length ? "fail" : warnings.length ? "warn" : "pass";

console.log(JSON.stringify({
  status,
  automationId,
  path: automationPath,
  weeklyCadence: "Friday retention prep",
  repo: expectedCwd,
  clientCount,
  failures,
  ...(failures.length ? { replacementPrompt: RETENTION_AUTOMATION_PROMPT } : {}),
  warnings,
  preflight: {
    status: preflight.status,
    canonicalRuntimeRoot: preflight.canonicalRuntimeRoot,
    serviceRoot: preflight.serviceRoot,
    ...(preflight.sourceFreshness ? { sourceFreshness: preflight.sourceFreshness } : {}),
    ...(preflight.stateAccess ? { stateAccess: preflight.stateAccess } : {}),
    ...(preflight.aggregateParity ? { aggregateParity: preflight.aggregateParity } : {})
  }
}, null, 2));

if (failures.length) process.exit(1);
