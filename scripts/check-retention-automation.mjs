#!/usr/bin/env node
// Fail-closed preflight for the TinyStudio retention automation.
//
// The scheduled automation must never run green against a stale source or an
// incomplete canonical private state. This check therefore observes two small
// aggregate manifests and treats any mismatch as fatal:
//
//   1. Source freshness: the checked-out HEAD must equal the CURRENT
//      origin/main (observed read-only via ls-remote; no fetch, no writes).
//   2. Canonical state: an aggregate manifest (existence + counts only) over
//      clients/, prospects/, service-decisions/, and runs/service-engine/.
//      Missing, inaccessible, or divergent roots are fatal.
//
// The preflight is evaluated only when this process is running inside the
// automation workspace the automation file itself declares; any other
// checkout is a smoke run and reports an explicit warning that the preflight
// could not be evaluated there.
//
// Privacy: output carries root-level metadata only (SHAs, root paths,
// existence, counts). Record names are never emitted and record contents are
// never read.
import { existsSync, readFileSync, realpathSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { homedir } from "node:os";
import { fileURLToPath } from "node:url";
import { execFileSync } from "node:child_process";
import { RETENTION_AUTOMATION_PROMPT } from "./lib/retention-automation.mjs";
import { STATE_ROOTS, observeSourceFreshness, observeStateManifest } from "./lib/retention-preflight.mjs";

const automationId = "tinystudio-retention-checkups";
const codexHome = process.env.CODEX_HOME || join(homedir(), ".codex");
const automationPath = join(codexHome, "automations", automationId, "automation.toml");
const scriptRepoRoot = dirname(dirname(fileURLToPath(import.meta.url)));
const expectedCwd = process.env.TINYSTUDIO_AUTOMATION_WORKSPACE || canonicalMainWorktree(scriptRepoRoot);
const isGithubActions = process.env.GITHUB_ACTIONS === "true";
const serviceRoot = process.env.SERVICE_REPO_ROOT || process.cwd();

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

const report = {
  status: "pass",
  automationId,
  path: automationPath,
  weeklyCadence: "Friday retention prep",
  repo: expectedCwd,
  failures: [],
  warnings: []
};
const failures = report.failures;
const warnings = report.warnings;

if (!existsSync(automationPath)) {
  if (isGithubActions) {
    report.status = "warn";
    warnings.push("Local Codex automation file is unavailable in GitHub Actions; source-freshness and canonical-state preflight cannot be evaluated; verify this check on Nish's machine");
    console.log(JSON.stringify(report, null, 2));
    process.exit(0);
  }

  failures.push("Automation file is missing");
} else {
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

  // Fail-closed preflight: evaluated only inside the workspace the automation
  // itself declares, so smoke runs from other checkouts warn instead of
  // pretending the automation surface exists there.
  const inspectedRoot = normalizedPath(serviceRoot);
  if (configuredRepos.includes(inspectedRoot)) {
    try {
      const source = observeSourceFreshness(serviceRoot);
      report.source = source;
      if (!source.fresh) {
        failures.push(`Source checkout is stale: HEAD ${source.head} does not match current origin/main ${source.originMain}`);
      }
    } catch (error) {
      failures.push(`Source freshness preflight failed: ${error.message}`);
    }
    try {
      const manifest = observeStateManifest(serviceRoot);
      report.stateManifest = manifest;
      report.clientCount = manifest["clients"].count;
      for (const root of STATE_ROOTS) {
        if (!manifest[root].exists) failures.push(`Canonical state root is missing: ${root}`);
      }
    } catch (error) {
      failures.push(`Canonical state preflight failed: ${error.message}`);
    }
  } else {
    warnings.push(
      `Preflight not evaluated: this checkout (${serviceRoot}) is not the automation workspace declared by the automation file (${configuredRepos.join(", ") || "unknown"}); run the check from the declared workspace to verify source freshness and canonical state parity`
    );
  }
}

report.status = failures.length ? "fail" : warnings.length ? "warn" : "pass";

console.log(JSON.stringify({
  ...report,
  ...(failures.length ? { replacementPrompt: RETENTION_AUTOMATION_PROMPT } : {})
}, null, 2));

if (failures.length) process.exit(1);
