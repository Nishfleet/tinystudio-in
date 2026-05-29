#!/usr/bin/env node
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { execFileSync } from "node:child_process";
import { join } from "node:path";
import { localIsoDate } from "./date-utils.mjs";
import { isValidLoomUrl, loomUrlError } from "./lib/loom-url.mjs";

const args = process.argv.slice(2);
const clientPath = args.find((arg) => !arg.startsWith("--"));
const handoffLoomArg = args.find((arg) => arg.startsWith("--handoff-loom="));
const reviewerArg = args.find((arg) => arg.startsWith("--reviewer="));
const dateArg = args.find((arg) => arg.startsWith("--date="));
const dryRun = args.includes("--dry-run");

if (!clientPath) {
  console.error("Usage: npm run client:acceptance -- clients/client-slug --dry-run");
  console.error("   or: npm run client:acceptance -- clients/client-slug --handoff-loom=https://www.loom.com/share/... --reviewer=\"Name\"");
  process.exit(1);
}

if (!existsSync(clientPath)) {
  console.error(`Client folder not found: ${clientPath}`);
  process.exit(1);
}

const today = dateArg ? dateArg.split("=").slice(1).join("=") : localIsoDate();
const reviewer = reviewerArg ? reviewerArg.split("=").slice(1).join("=").trim() : "";
const handoffLoom = handoffLoomArg ? handoffLoomArg.split("=").slice(1).join("=").trim() : "";
const checklistPath = join(clientPath, "quality/sprint-acceptance-checklist.md");
const acceptanceWarning = "Sprint acceptance checklist is not complete";

function runJson(commandArgs) {
  const output = execFileSync("node", commandArgs, {
    encoding: "utf8",
    stdio: ["ignore", "pipe", "pipe"]
  });
  return JSON.parse(output);
}

function write(path, content) {
  const dir = path.split("/").slice(0, -1).join("/");
  if (dir) mkdirSync(dir, { recursive: true });
  writeFileSync(path, content);
}

function replaceSection(markdown, heading, replacement) {
  const escaped = heading.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const pattern = new RegExp(`## ${escaped}\\n[\\s\\S]*?(?=\\n## |$)`);
  const nextSection = `## ${heading}\n\n${replacement.trim()}\n`;
  if (!pattern.test(markdown)) return `${markdown.trimEnd()}\n\n${nextSection}`;
  return markdown.replace(pattern, nextSection.trimEnd());
}

function completeChecklist(markdown) {
  return markdown.replace(/^- \[[ xX]\]/gm, "- [x]");
}

function handoffProofSection() {
  return [
    `- Handoff Loom: ${handoffLoom}`,
    `- Reviewer: ${reviewer}`,
    `- Date: ${today}`,
    "- Rule: Acceptance was completed only after client readiness had no blockers except the acceptance checklist."
  ].join("\n");
}

function blockingWarnings(readiness) {
  return (readiness.warnings || []).filter((warning) => warning !== acceptanceWarning);
}

const readiness = runJson(["scripts/check-client-readiness.mjs", clientPath]);
const blockers = blockingWarnings(readiness);

if (dryRun) {
  console.log(JSON.stringify({
    status: blockers.length === 0 ? "ready-to-complete" : "blocked",
    clientPath,
    readiness,
    blockers,
    required: {
      handoffLoom: loomUrlError("handoff Loom"),
      reviewer: "Reviewer name is required before acceptance can be completed."
    },
    next: blockers.length === 0
      ? "Add a reviewed handoff Loom and reviewer to complete sprint acceptance."
      : "Fix all non-acceptance readiness warnings before completing sprint acceptance."
  }, null, 2));
  process.exit(0);
}

if (blockers.length > 0) {
  console.error("Cannot complete sprint acceptance while client readiness still has proof or delivery blockers.");
  console.error(JSON.stringify({ clientPath, blockers, readiness }, null, 2));
  process.exit(1);
}

if (!handoffLoom || !isValidLoomUrl(handoffLoom)) {
  console.error(loomUrlError("handoff Loom"));
  process.exit(1);
}

if (!reviewer) {
  console.error("Sprint acceptance completion requires --reviewer=\"Name\".");
  process.exit(1);
}

if (!existsSync(checklistPath)) {
  console.error(`Missing sprint acceptance checklist: ${checklistPath}`);
  process.exit(1);
}

const existingChecklist = readFileSync(checklistPath, "utf8");
const updatedChecklist = replaceSection(
  completeChecklist(existingChecklist),
  "Handoff Proof",
  handoffProofSection()
);
write(checklistPath, updatedChecklist);

for (const commandArgs of [
  ["scripts/export-client-facing-dashboard.mjs", clientPath],
  ["scripts/export-client-renewal-review.mjs", clientPath],
  ["scripts/export-client-delivery-cockpit.mjs", clientPath]
]) {
  runJson(commandArgs);
}

const updatedReadiness = runJson(["scripts/check-client-readiness.mjs", clientPath]);

console.log(JSON.stringify({
  status: "updated",
  clientPath,
  handoffLoom,
  reviewer,
  date: today,
  readiness: updatedReadiness,
  next: updatedReadiness.status === "ready"
    ? "Client sprint acceptance is complete and proof-gated handoff is ready."
    : "Acceptance was updated, but readiness still needs review before handoff."
}, null, 2));
