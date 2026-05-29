#!/usr/bin/env node
import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { homedir } from "node:os";

const automationId = "tinystudio-retention-checkups";
const codexHome = process.env.CODEX_HOME || join(homedir(), ".codex");
const automationPath = join(codexHome, "automations", automationId, "automation.toml");
const expectedCwd = "/Users/nish/Documents/TINY STUDIO";

function value(content, key) {
  const match = String(content || "").match(new RegExp(`^${key}\\s*=\\s*"([^"]*)"`, "m"));
  return match ? match[1] : "";
}

function missingPhrases(content, phrases) {
  return phrases.filter((phrase) => !String(content || "").includes(phrase));
}

if (!existsSync(automationPath)) {
  console.log(JSON.stringify({
    status: "fail",
    automationId,
    path: automationPath,
    failures: ["Automation file is missing"],
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
if (!content.includes(expectedCwd)) failures.push("Automation does not point at the TinyStudio repo");
if (!/^FREQ=WEEKLY;/.test(cadence) || !cadence.includes("BYDAY=FR")) failures.push("Automation is not scheduled as the weekly Friday retention loop");

for (const missing of missingPhrases(prompt, [
  "retention automation check",
  "weekly client value loop",
  "retention checkups",
  "internal dashboard",
  "value stress",
  "monthly review",
  "Do not send client messages",
  "approve claims automatically"
])) {
  failures.push(`Automation prompt missing: ${missing}`);
}

if (!prompt.includes("proof/claim blockers")) {
  warnings.push("Automation prompt does not explicitly summarize proof/claim blockers");
}

const status = failures.length ? "fail" : warnings.length ? "warn" : "pass";

console.log(JSON.stringify({
  status,
  automationId,
  path: automationPath,
  weeklyCadence: "Friday retention prep",
  repo: expectedCwd,
  failures,
  warnings
}, null, 2));

if (failures.length) process.exit(1);
