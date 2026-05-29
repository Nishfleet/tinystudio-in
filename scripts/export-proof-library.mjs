#!/usr/bin/env node
import { existsSync, mkdirSync, readdirSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { localIsoDate } from "./date-utils.mjs";
import { agencyConfig } from "./lib/agency-config.mjs";

const outputArg = process.argv.find((arg) => arg.startsWith("--output="));
const outputPath = outputArg ? outputArg.split("=")[1] : "growth-brain/ops/proof-library.md";
const today = localIsoDate();
const config = agencyConfig();

function listFolders(root) {
  if (!existsSync(root)) return [];
  return readdirSync(root, { withFileTypes: true })
    .filter((entry) => entry.isDirectory())
    .filter((entry) => !/^(kit|import)-smoke/.test(entry.name))
    .map((entry) => join(root, entry.name))
    .sort();
}

function read(path) {
  return existsSync(path) ? readFileSync(path, "utf8") : "";
}

function json(path) {
  return existsSync(path) ? JSON.parse(readFileSync(path, "utf8")) : {};
}

function lineValue(content, pattern, fallback = "") {
  const match = content.match(pattern);
  return match && match[1].trim() ? match[1].trim() : fallback;
}

function section(content, heading, fallback = "") {
  const escaped = heading.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const match = content.match(new RegExp(`## ${escaped}\\n+([\\s\\S]*?)(?:\\n## |$)`));
  return match ? match[1].trim() : fallback;
}

function compact(value, maxLength = 220) {
  const normalized = String(value).replace(/\s+/g, " ").trim();
  if (!normalized) return "";
  if (normalized.length <= maxLength) return normalized;
  return `${normalized.slice(0, maxLength - 1).trim()}...`;
}

function meaningful(value) {
  return Boolean(String(value || "").trim());
}

function meaningfulPriority(value) {
  const normalized = String(value || "").trim().toLowerCase();
  return normalized && normalized !== "record / research-more / skip";
}

function filledBuyerLeaks(content) {
  return String(content || "")
    .split("\n")
    .map((line) => line.trim())
    .filter((line) => /^- Leak \d+:\s*\S/.test(line))
    .join("\n");
}

const prospects = listFolders("prospects").map((path) => {
  const metadata = json(join(path, "metadata.json"));
  const pipeline = json(join(path, "pipeline.json"));
  const leadScore = read(join(path, "lead-score.md"));
  const loomOutline = read(join(path, "loom-outline.md"));
  const buyerRoom = read(join(path, "buyer-room.md"));
  const score = lineValue(leadScore, /^- Score:[ \t]*([^\n]*)$/m, "");
  const priority = lineValue(leadScore, /^- Priority:[ \t]*([^\n]*)$/m, "");
  const buyerLeaks = filledBuyerLeaks(section(buyerRoom, "What I Saw", ""));
  return {
    path,
    name: metadata.name || path.split("/").at(-1),
    vertical: metadata.vertical || "",
    stage: pipeline.stage || "new",
    score: meaningful(score) ? score : "",
    priority: meaningfulPriority(priority) ? priority : "",
    specificLeak: lineValue(loomOutline, /^3\. [^\n:]+:[ \t]*([^\n]*)$/m, ""),
    firstFix: lineValue(loomOutline, /^6\. [^\n:]+:[ \t]*([^\n]*)$/m, ""),
    buyerLeaks,
    notes: Array.isArray(pipeline.notes) ? pipeline.notes : []
  };
});

const clients = listFolders("clients").map((path) => {
  const intake = read(join(path, "intake.md"));
  const sprintPlan = read(join(path, "sprint-plan.md"));
  const report = read(join(path, "reports/week-1-report.md"));
  const scorecard = read(join(path, "quality/delivery-scorecard.md"));
  const weeklyLearnings = read(join(path, "brain/weekly-learnings.md"));
  return {
    path,
    name: lineValue(intake, /^- Name:[ \t]*([^\n]*)$/m, path.split("/").at(-1)),
    website: lineValue(intake, /^- Website:[ \t]*([^\n]*)$/m, ""),
    wedge: compact(section(sprintPlan, "Wedge", "")),
    status: compact(section(sprintPlan, "Status", "")),
    reportSummary: compact(section(report, "Summary", "")),
    scorecard: compact(scorecard),
    weeklyLearnings: compact(weeklyLearnings)
  };
});

const scoredProspects = prospects.filter((prospect) => prospect.score || prospect.priority || prospect.specificLeak);
const recordedOrSent = prospects.filter((prospect) => ["recorded", "sent", "followup-1", "followup-2", "followup-3", "replied", "call-booked", "won"].includes(prospect.stage));
const replied = prospects.filter((prospect) => ["replied", "call-booked", "won"].includes(prospect.stage));
const won = prospects.filter((prospect) => prospect.stage === "won");
const lost = prospects.filter((prospect) => prospect.stage === "lost");
const notes = prospects.flatMap((prospect) => prospect.notes.map((note) => ({ ...note, prospect: prospect.name, path: prospect.path })));

const auditPatternRows = scoredProspects.slice(0, 25).map((prospect) => (
  `| ${prospect.name} | ${prospect.vertical || "-"} | ${prospect.score || "-"} | ${prospect.priority || "-"} | ${compact(prospect.specificLeak || prospect.buyerLeaks, 140) || "-"} | ${compact(prospect.firstFix, 120) || "-"} |`
)).join("\n");

const noteRows = notes.length
  ? notes.slice(-25).reverse().map((note) => `| ${note.date || "-"} | ${note.prospect} | ${note.action || "-"} | ${compact(note.note, 180) || "-"} |`).join("\n")
  : "| - | - | - | No live replies, objections, or decision notes yet. |";

const clientRows = clients.length
  ? clients.map((client) => `| ${client.name} | ${client.website || "-"} | ${client.wedge || "-"} | ${client.status || "-"} | ${client.reportSummary || client.weeklyLearnings || "-"} |`).join("\n")
  : "| - | - | - | - | No paid client proof yet. |";

const content = `# TinyStudio Proof And Learning Library

Generated: ${today}

This is the compounding layer. It should collect real patterns from prospects and clients, not invented proof.

## Funnel Proof State

- Scored prospects: ${scoredProspects.length}
- Looms recorded or sent: ${recordedOrSent.length}
- Replies or booked calls: ${replied.length}
- Won sprints: ${won.length}
- Lost prospects: ${lost.length}
- Clients: ${clients.length}

## Current Truth

${won.length || clients.length ? "- Real proof exists. Use only the proof listed below." : "- No closed-client proof yet. Keep public claims limited to process, scope, and current deliverables."}

## Decision Rule

- If a public claim is not listed in this library or the claim-proof ledger, do not use it.
- If a pattern appears in multiple prospects, use it to improve audit scripts.
- If a client approves a result for reuse, add the exact source before using it in sales material.

## Audit Patterns

| Prospect | Vertical | Score | Priority | Leak | First Fix |
|---|---|---|---|---|---|
${auditPatternRows || "| - | - | - | - | No scored audit patterns yet. | - |"}

## Replies, Objections, And Decisions

| Date | Prospect | Stage | Note |
|---|---|---|---|
${noteRows}

## Client Learnings

| Client | Website | Wedge | Status | Learning |
|---|---|---|---|---|
${clientRows}

## Reusable Claims

Do not add a claim here unless it is true, specific, and traceable to a prospect or client folder.

| Claim | Source | Approved For Use |
|---|---|---|
| TinyStudio runs a ${config.offerName} with leak map, implementation-ready fixes, and a 30-day action plan. | growth-brain/offer.md | yes |
| No revenue, ranking, ROAS, or conversion lift is promised. | growth-brain/offer.md and sales assets | yes |

## Next Learning To Capture

1. First Loom sent.
2. First reply and objection.
3. First call outcome.
4. First paid sprint delivery learning.
5. First measurable before/after that the client approves for reuse.
`;

const outputDir = outputPath.split("/").slice(0, -1).join("/");
if (outputDir) mkdirSync(outputDir, { recursive: true });
writeFileSync(outputPath, content);

console.log(JSON.stringify({
  status: "created",
  path: outputPath,
  date: today,
  scoredProspects: scoredProspects.length,
  recordedOrSent: recordedOrSent.length,
  replies: replied.length,
  won: won.length,
  clients: clients.length
}, null, 2));
