#!/usr/bin/env node
import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { parseChannelReadiness } from "./lib/channel-readiness.mjs";

const clientPath = process.argv[2];
const strict = process.argv.includes("--strict");

if (!clientPath) {
  console.error("Usage: npm run client:check -- clients/client-slug [-- --strict]");
  process.exit(1);
}

if (!existsSync(clientPath)) {
  console.error(`Client folder not found: ${clientPath}`);
  process.exit(1);
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

function checklistComplete(markdown) {
  const checkboxLines = markdown
    .split("\n")
    .map((line) => line.trim())
    .filter((line) => /^- \[[ xX]\]/.test(line));
  return checkboxLines.length > 0 && checkboxLines.every((line) => /^- \[[xX]\]/.test(line));
}

function section(markdown, heading) {
  const escaped = heading.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const match = markdown.match(new RegExp(`## ${escaped}\\n+([\\s\\S]*?)(?:\\n## |$)`));
  return match ? match[1].trim() : "";
}

function hasFilledTableRow(markdown, heading, requiredIndexes) {
  return tableRows(section(markdown, heading)).some((cells) => {
    const first = cells[0] || "";
    if (/^(Priority|Week|Metric|Area)$/i.test(first)) return false;
    return requiredIndexes.every((index) => String(cells[index] || "").trim());
  });
}

function bulletValueFilled(markdown, label) {
  const escaped = label.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const match = markdown.match(new RegExp(`^- ${escaped}:[ \\t]*([^\\n]*)$`, "m"));
  return Boolean(match && match[1].trim());
}

function codeBlockFilled(markdown, heading) {
  const content = section(markdown, heading);
  const match = content.match(/```(?:\w+)?\n([\s\S]*?)\n```/);
  return Boolean(match && match[1].trim());
}

function deliveryContentWarnings(markdown) {
  const warnings = [];
  if (!hasFilledTableRow(markdown, "Top Leaks", [1, 2, 3])) {
    warnings.push("Delivery has no filled top leak rows");
  }
  if (!hasFilledTableRow(markdown, "Tangible Improvements", [1, 2, 3, 4, 5])) {
    warnings.push("Delivery has no filled tangible improvement rows");
  }
  if (!hasFilledTableRow(markdown, "30-Day Action Plan", [1, 2, 3])) {
    warnings.push("Delivery has no filled 30-day action rows");
  }
  return warnings;
}

function handoffContentStatus(markdown) {
  const requiredBullets = ["URL", "Owner", "Priority", "Buyer issue", "Primary metric", "Check date"];
  if (!codeBlockFilled(markdown, "Replace This") || !codeBlockFilled(markdown, "With This")) {
    return { ok: false, reason: "Implementation handoff is missing replace/with copy" };
  }
  if (requiredBullets.some((label) => !bulletValueFilled(markdown, label))) {
    return { ok: false, reason: "Implementation handoff has blank owner, page, reason, or measurement fields" };
  }
  return { ok: true, reason: "" };
}

function reportContentStatus(markdown) {
  if (!hasFilledTableRow(markdown, "Next Tests", [1, 2, 3, 4])) {
    return { ok: false, reason: "Week 1 report has no filled next-test rows" };
  }
  return { ok: true, reason: "" };
}

function conversionScorecardStatus(markdown) {
  const criticalRows = tableRows(section(markdown, "Critical Checks"))
    .filter((cells) => cells[0] && cells[0] !== "Check" && !/^Check$/i.test(cells[0]));
  if (criticalRows.length < 5 || criticalRows.some((cells) => !cells[1] || !cells[2] || !cells[3])) {
    return { ok: false, reason: "Conversion scorecard critical checks are not filled" };
  }
  if (!hasFilledTableRow(markdown, "Top 5 Conversion Failures", [1, 2, 3, 4])) {
    return { ok: false, reason: "Conversion scorecard has no filled top failure rows" };
  }
  const requiredBullets = ["Direct response flow", "So-What chain", "Angle chosen", "Weekly test", "Reviewer", "Date"];
  if (requiredBullets.some((label) => !bulletValueFilled(markdown, label))) {
    return { ok: false, reason: "Conversion scorecard is missing copy, angle, weekly test, or approval fields" };
  }
  const searchTrustRows = tableRows(section(markdown, "Search Trust Layer"))
    .filter((cells) => /^(On-site search trust|Off-site trust\/distribution)$/i.test(cells[0] || ""));
  if (searchTrustRows.length < 2 || searchTrustRows.some((cells) => !cells[1] || !cells[2] || !cells[3] || !cells[4])) {
    return { ok: false, reason: "Conversion scorecard search trust layer is not filled" };
  }
  const searchTrustBullets = [
    "Conversion first",
    "Title/meta/headings/internal links",
    "FAQ/schema/crawl basics",
    "Local/service-area relevance",
    "Real off-site trust/distribution",
    "Blocked backlink or spam tactic"
  ];
  if (searchTrustBullets.some((label) => !bulletValueFilled(markdown, label))) {
    return { ok: false, reason: "Conversion scorecard search trust guardrails are not filled" };
  }
  if (!/^- Approved:[ \t]*(yes|approved)$/im.test(markdown)) {
    return { ok: false, reason: "Conversion scorecard is not approved" };
  }
  return { ok: true, reason: "" };
}

const requiredFiles = [
  "intake.md",
  "sprint-plan.md",
  "kickoff-message.md",
  "buyer-room.md",
  "brain/brand-voice.md",
  "brain/products.md",
  "brain/reviews.md",
  "brain/competitors.md",
  "brain/website-notes.md",
  "brain/site-architecture.md",
  "deliverables/delivery.md",
  "deliverables/implementation-handoff.md",
  "reports/week-1-report.md",
  "research/ai-search-audit.md",
  "quality/claim-proof-ledger.md",
  "quality/channel-readiness-scorecard.md",
  "quality/conversion-optimization-scorecard.md",
  "quality/delivery-scorecard.md",
  "quality/sprint-acceptance-checklist.md"
];

const missing = [];
const warnings = [];

for (const file of requiredFiles) {
  if (!existsSync(join(clientPath, file))) missing.push(`Missing ${file}`);
}

const intake = readIfExists(join(clientPath, "intake.md"));
for (const label of ["Website:", "Main offer:", "Target buyer:", "Approval contact:", "Payment / written approval:"]) {
  const pattern = new RegExp(`- ${label.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}\\s*$`, "m");
  if (pattern.test(intake)) warnings.push(`Intake missing ${label}`);
}

const sprintPlan = readIfExists(join(clientPath, "sprint-plan.md"));
if (/Pick one:/m.test(sprintPlan)) warnings.push("Sprint wedge is not chosen");
if (/Intake:\s*$/m.test(sprintPlan)) warnings.push("Sprint status is blank");

const claimLedger = readIfExists(join(clientPath, "quality/claim-proof-ledger.md"));
if (!hasApprovedClaimRow(claimLedger)) warnings.push("Claim-proof ledger has no approved claim rows yet");

const scorecard = readIfExists(join(clientPath, "quality/delivery-scorecard.md"));
const scorecardCheck = scorecardStatus(scorecard);
if (!scorecardCheck.ok) warnings.push(scorecardCheck.reason);

const conversionScorecard = readIfExists(join(clientPath, "quality/conversion-optimization-scorecard.md"));
const conversionScorecardCheck = conversionScorecardStatus(conversionScorecard);
if (!conversionScorecardCheck.ok) warnings.push(conversionScorecardCheck.reason);

const channelScorecard = readIfExists(join(clientPath, "quality/channel-readiness-scorecard.md"));
const channelReadiness = parseChannelReadiness(channelScorecard);
if (!channelReadiness.proofSprintReady) {
  warnings.push("Channel readiness is not proof-sprint ready");
}

const acceptanceChecklist = readIfExists(join(clientPath, "quality/sprint-acceptance-checklist.md"));
if (!checklistComplete(acceptanceChecklist)) warnings.push("Sprint acceptance checklist is not complete");

const delivery = readIfExists(join(clientPath, "deliverables/delivery.md"));
if (/Name:\s*$/m.test(delivery) || /Website:\s*$/m.test(delivery)) warnings.push("Delivery template still has blank client fields");
warnings.push(...deliveryContentWarnings(delivery));

const implementationHandoff = readIfExists(join(clientPath, "deliverables/implementation-handoff.md"));
const handoffContent = handoffContentStatus(implementationHandoff);
if (!handoffContent.ok) warnings.push(handoffContent.reason);

const weekOneReport = readIfExists(join(clientPath, "reports/week-1-report.md"));
const reportContent = reportContentStatus(weekOneReport);
if (!reportContent.ok) warnings.push(reportContent.reason);

const status = missing.length === 0 && warnings.length === 0 ? "ready" : "draft";

const result = {
  status,
  clientPath,
  missing,
  warnings
};

console.log(JSON.stringify(result, null, 2));

if (strict && status !== "ready") process.exit(1);
