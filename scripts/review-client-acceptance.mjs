#!/usr/bin/env node
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { localIsoDate } from "./date-utils.mjs";
import { isValidLoomUrl, loomUrlError } from "./lib/loom-url.mjs";
import { codeRoot, runCodeRepoJson, serviceRoot } from "./lib/runtime-roots.mjs";
import { resolveRepoPath } from "./lib/service-contract.mjs";

const args = process.argv.slice(2);
const clientArg = args.find((arg) => !arg.startsWith("--"));
const handoffLoomArg = args.find((arg) => arg.startsWith("--handoff-loom="));
const reviewerArg = args.find((arg) => arg.startsWith("--reviewer="));
const dateArg = args.find((arg) => arg.startsWith("--date="));
const dryRun = args.includes("--dry-run");

if (!clientArg) {
  console.error("Usage: npm run client:acceptance -- clients/client-slug --dry-run");
  console.error("   or: npm run client:acceptance -- clients/client-slug --handoff-loom=https://www.loom.com/share/... --reviewer=\"Name\"");
  process.exit(1);
}

const clientPath = resolveRepoPath(serviceRoot, clientArg);

if (!existsSync(clientPath)) {
  console.error(`Client folder not found: ${clientPath}`);
  process.exit(1);
}

const today = dateArg ? dateArg.split("=").slice(1).join("=") : localIsoDate();
const reviewer = reviewerArg ? reviewerArg.split("=").slice(1).join("=").trim() : "";
const handoffLoom = handoffLoomArg ? handoffLoomArg.split("=").slice(1).join("=").trim() : "";
const checklistPath = join(clientPath, "quality/sprint-acceptance-checklist.md");
const checklistTemplatePath = join(codeRoot, "growth-brain/quality/sprint-acceptance-checklist.md");
const acceptanceWarning = "Sprint acceptance checklist is not complete";

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

function checklistItems(markdown) {
  return String(markdown || "")
    .split("\n")
    .flatMap((line, index) => {
      const match = line.trim().match(/^- \[([ xX])\]\s*(.*)$/);
      if (!match) return [];
      return [{
        line: index + 1,
        label: match[2].trim(),
        checked: match[1].toLowerCase() === "x"
      }];
    });
}

function checklistStatus(markdown, requiredLabels) {
  const items = checklistItems(markdown);
  const labels = new Set(items.map((item) => item.label));
  const missing = requiredLabels.filter((label) => !labels.has(label));
  return {
    complete: requiredLabels.length > 0 && missing.length === 0 && items.every((item) => item.checked),
    items,
    missing,
    unchecked: items.filter((item) => !item.checked)
  };
}

function checklistBlocker(checklist) {
  if (checklist.items.length === 0) {
    return "Sprint acceptance checklist has no checkbox items to validate.";
  }
  return [
    "Sprint acceptance cannot be completed until every checklist item is explicitly checked by a human.",
    ...checklist.missing.map((label) => `- Missing required item: ${label}`),
    ...checklist.unchecked.map((item) => `- Line ${item.line}: ${item.label || "(unnamed checklist item)"}`)
  ].join("\n");
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
  return [
    ...(readiness.missing || []).map((missing) => `Missing readiness artifact: ${missing}`),
    ...(readiness.warnings || []).filter((warning) => warning !== acceptanceWarning)
  ];
}

const readiness = runCodeRepoJson(["scripts/check-client-readiness.mjs", clientPath]);
const blockers = blockingWarnings(readiness);
const checklistExists = existsSync(checklistPath);
const checklistTemplateExists = existsSync(checklistTemplatePath);
const requiredChecklistLabels = checklistTemplateExists
  ? checklistItems(readFileSync(checklistTemplatePath, "utf8")).map((item) => item.label)
  : [];
const existingChecklist = checklistExists ? readFileSync(checklistPath, "utf8") : "";
const checklist = checklistStatus(existingChecklist, requiredChecklistLabels);

if (dryRun) {
  const checklistBlocked = !checklistExists || !checklistTemplateExists || !checklist.complete;
  console.log(JSON.stringify({
    status: blockers.length === 0 && !checklistBlocked ? "ready-to-complete" : "blocked",
    clientPath,
    readiness,
    blockers,
    checklist: {
      exists: checklistExists,
      templateExists: checklistTemplateExists,
      complete: checklist.complete,
      missingItems: checklist.missing,
      uncheckedItems: checklist.unchecked
    },
    required: {
      handoffLoom: loomUrlError("handoff Loom"),
      reviewer: "Reviewer name is required before acceptance can be completed."
    },
    next: checklistBlocked
      ? checklistExists && checklistTemplateExists
        ? checklistBlocker(checklist)
        : `Missing sprint acceptance checklist or canonical template: ${!checklistExists ? checklistPath : checklistTemplatePath}`
      : blockers.length === 0
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

if (!checklistExists) {
  console.error(`Missing sprint acceptance checklist: ${checklistPath}`);
  process.exit(1);
}

if (!checklistTemplateExists) {
  console.error(`Missing canonical sprint acceptance checklist: ${checklistTemplatePath}`);
  process.exit(1);
}

if (!checklist.complete) {
  console.error(checklistBlocker(checklist));
  process.exit(1);
}

const updatedChecklist = replaceSection(existingChecklist, "Handoff Proof", handoffProofSection());
write(checklistPath, updatedChecklist);

for (const commandArgs of [
  ["scripts/export-client-delivery-cockpit.mjs", clientPath]
]) {
  runCodeRepoJson(commandArgs);
}

const updatedReadiness = runCodeRepoJson(["scripts/check-client-readiness.mjs", clientPath]);

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
