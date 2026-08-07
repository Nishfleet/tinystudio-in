#!/usr/bin/env node
import { existsSync, readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { loadValidatedServiceClient } from "./lib/validated-service-client.mjs";
import { resolveRepoPath } from "./lib/service-contract.mjs";

const clientArg = process.argv[2];
const strict = process.argv.includes("--strict");
const repoRoot = process.env.SERVICE_REPO_ROOT || process.cwd();

if (!clientArg) {
  console.error("Usage: npm run client:check -- clients/client-slug [-- --strict]");
  process.exit(1);
}

const clientPath = resolveRepoPath(repoRoot, clientArg);

if (!existsSync(clientPath)) {
  console.error(`Client folder not found: ${clientPath}`);
  process.exit(1);
}

// Templates come from the code checkout, not a data-only SERVICE_REPO_ROOT.
const sourceRoot = dirname(dirname(fileURLToPath(import.meta.url)));
let serviceClient;
try {
  serviceClient = loadValidatedServiceClient(repoRoot, clientPath);
} catch (error) {
  serviceClient = {
    ok: false,
    blocked: [error instanceof Error ? error.message : String(error)]
  };
}

if (!serviceClient.ok) {
  const warnings = (serviceClient.blocked || []).map((reason) => `Canonical service validation blocked readiness: ${reason}`);
  const result = {
    status: "draft",
    clientPath,
    missing: [],
    warnings
  };
  console.log(JSON.stringify(result, null, 2));
  if (strict) process.exit(1);
  process.exit(0);
}

function readIfExists(path) {
  return existsSync(path) ? readFileSync(path, "utf8") : "";
}

function tableRows(markdown) {
  return markdown
    .split("\n")
    .map((line) => line.trim())
    .filter((line) => line.startsWith("|") && line.endsWith("|"))
    .map((line) => line.split("|").slice(1, -1).map((cell) => cell.trim()))
    .filter((cells) => cells.some(Boolean) && !cells.every((cell) => /^:?-+:?$/.test(cell)));
}

function hasApprovedClaimRow(markdown) {
  return tableRows(markdown).some((cells) => {
    const [claim, source, proofType, approvedBy, status] = cells;
    return Boolean(claim && source && proofType && approvedBy && /^approved$/i.test(status || ""));
  });
}

function scorecardStatus(markdown) {
  const rows = tableRows(markdown)
    .filter((cells) => cells[0] && cells[0] !== "Area" && !/^Area$/i.test(cells[0]));
  if (rows.length < 7 || rows.some((cells) => !String(cells[1] || "").trim())) {
    return { ok: false, reason: "Delivery scorecard is not filled" };
  }
  const scores = rows.map((cells) => Number(cells[1]));
  if (scores.some((score) => !Number.isFinite(score))) return { ok: false, reason: "Delivery scorecard is not filled" };
  if (scores.some((score) => score < 3)) return { ok: false, reason: "Delivery scorecard has a score below 3" };
  const average = scores.reduce((sum, score) => sum + score, 0) / scores.length;
  if (average < 4) return { ok: false, reason: "Delivery scorecard average is below 4" };
  return { ok: true, reason: "" };
}

function checklistStatus(markdown, canonicalMarkdown) {
  function structure(value) {
    return String(value || "")
      .split("\n")
      .flatMap((line, index) => {
        const trimmed = line.trim();
        const heading = trimmed.match(/^##\s+(.+)$/);
        if (heading) return [{ type: "heading", label: heading[1].trim(), line: index + 1, checked: true }];
        const item = trimmed.match(/^- \[([ xX])\]\s*(.*)$/);
        if (!item) return [];
        return [{ type: "item", label: item[2].trim(), line: index + 1, checked: item[1].toLowerCase() === "x" }];
      });
  }

  const expected = structure(canonicalMarkdown);
  const actual = structure(markdown);
  const exactStructure = expected.length > 0 && actual.length === expected.length && actual.every((entry, index) =>
    entry.type === expected[index].type && entry.label === expected[index].label
  );
  return {
    exactStructure,
    complete: exactStructure && actual.filter((entry) => entry.type === "item").every((entry) => entry.checked)
  };
}

function bulletValueFilled(markdown, label) {
  const escaped = label.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const match = markdown.match(new RegExp(`^- ${escaped}:[ \\t]*([^\\n]*)$`, "m"));
  return Boolean(match && match[1].trim());
}

function approvedDeliveryWarnings(delivery) {
  const warnings = [];
  if (!delivery || typeof delivery !== "object" || Array.isArray(delivery)) {
    return ["Hash-bound human-approved delivery artifact is unavailable"];
  }
  if (!delivery.leakMap?.selectedPageUrl || !delivery.leakMap?.items?.length) warnings.push("Approved delivery has no evidence-linked fault map");
  if (!delivery.pageFix?.artifact) warnings.push("Approved delivery has no complete page fix artifact");
  if (!delivery.searchTrust?.changes?.length) warnings.push("Approved delivery has no search-trust changes");
  if (!delivery.proof?.beforeEvidenceIds?.length || !delivery.proof?.afterCapturePlan) warnings.push("Approved delivery has no before/after proof plan");
  if (!delivery.loom?.outline?.length) warnings.push("Approved delivery has no Loom outline");
  if (!delivery.measurement?.metric || !delivery.measurement?.baselineValue) warnings.push("Approved delivery has no measurement baseline");
  if (!delivery.implementation?.artifact) warnings.push("Approved delivery has no implementation pass or developer-ready handoff artifact");
  if (delivery.revisionBoundary?.includedRevisions !== 1) warnings.push("Approved delivery does not preserve the one-revision boundary");
  if (delivery.tracking?.days !== 14) warnings.push("Approved delivery does not preserve 14-day tracking");
  return warnings;
}

const requiredFiles = [
  "intake.md",
  "sprint-plan.md",
  "kickoff-message.md",
  "buyer-room.md",
  "brain/brand-voice.md",
  "brain/reviews.md",
  "brain/competitors.md",
  "brain/website-notes.md",
  "deliverables/delivery.md",
  "deliverables/implementation-handoff.md",
  "quality/claim-proof-ledger.md",
  "quality/delivery-scorecard.md",
  "quality/sprint-acceptance-checklist.md"
];

const missing = [];
const warnings = [];

if (!serviceClient.readyForHandoff) {
  warnings.push(...(serviceClient.readinessBlocked || []).map((reason) => `Canonical service state is not handoff-ready: ${reason}`));
}

for (const file of requiredFiles) {
  if (!existsSync(join(clientPath, file))) missing.push(`Missing ${file}`);
}

const intake = readIfExists(join(clientPath, "intake.md"));
for (const label of ["Website", "Main offer", "Target buyer", "Approval owner", "Implementation owner", "Payment", "Day 0 start", "Client-delay pauses"]) {
  if (!bulletValueFilled(intake, label)) warnings.push(`Intake missing ${label}`);
}

warnings.push(...approvedDeliveryWarnings(serviceClient.approvedDelivery));

const claimLedger = readIfExists(join(clientPath, "quality/claim-proof-ledger.md"));
if (!hasApprovedClaimRow(claimLedger)) warnings.push("Claim-proof ledger has no approved claim rows yet");

const scorecard = readIfExists(join(clientPath, "quality/delivery-scorecard.md"));
const scorecardCheck = scorecardStatus(scorecard);
if (!scorecardCheck.ok) warnings.push(scorecardCheck.reason);

const acceptanceChecklist = readIfExists(join(clientPath, "quality/sprint-acceptance-checklist.md"));
const canonicalChecklist = readIfExists(join(sourceRoot, "growth-brain/quality/sprint-acceptance-checklist.md"));
const checklist = checklistStatus(acceptanceChecklist, canonicalChecklist);
if (!checklist.exactStructure) warnings.push("Sprint acceptance checklist does not match canonical labels and structure");
else if (!checklist.complete) warnings.push("Sprint acceptance checklist is not complete");

const status = serviceClient.readyForHandoff && missing.length === 0 && warnings.length === 0 ? "ready" : "draft";

const result = {
  status,
  clientPath,
  missing,
  warnings
};

console.log(JSON.stringify(result, null, 2));

if (strict && status !== "ready") process.exit(1);
