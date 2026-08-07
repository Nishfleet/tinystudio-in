#!/usr/bin/env node
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { execFileSync } from "node:child_process";
import { localIsoDate } from "./date-utils.mjs";

const args = process.argv.slice(2);
const clientPath = args.find((arg) => !arg.startsWith("--"));
const outputArg = args.find((arg) => arg.startsWith("--output="));
const markdownArg = args.find((arg) => arg.startsWith("--markdown="));

if (!clientPath) {
  console.error("Usage: npm run client:dashboard -- clients/client-slug [--output=clients/client-slug/client-dashboard.html]");
  process.exit(1);
}

if (!existsSync(clientPath)) {
  console.error(`Client folder not found: ${clientPath}`);
  process.exit(1);
}

const htmlPath = outputArg ? outputArg.split("=")[1] : join(clientPath, "client-dashboard.html");
const markdownPath = markdownArg ? markdownArg.split("=")[1] : join(clientPath, "client-dashboard.md");
const today = localIsoDate();

function read(relativePath) {
  const path = join(clientPath, relativePath);
  return existsSync(path) ? readFileSync(path, "utf8") : "";
}

function runJson(commandArgs) {
  const output = execFileSync("node", commandArgs, {
    encoding: "utf8",
    stdio: ["ignore", "pipe", "pipe"]
  });
  return JSON.parse(output);
}

function tableRows(markdown) {
  return String(markdown || "")
    .split("\n")
    .map((line) => line.trim())
    .filter((line) => line.startsWith("|") && line.endsWith("|"))
    .map((line) => line.split("|").slice(1, -1).map((cell) => cell.trim()))
    .filter((cells) => cells.some(Boolean) && !cells.every((cell) => /^:?-+:?$/.test(cell)));
}

function section(markdown, heading) {
  const escaped = heading.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const match = String(markdown || "").match(new RegExp(`## ${escaped}\\n+([\\s\\S]*?)(?:\\n## |$)`));
  return match ? match[1].trim() : "";
}

function bulletValue(markdown, label) {
  const escaped = label.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  return String(markdown || "").match(new RegExp(`^- ${escaped}:[ \\t]*([^\\n]*)$`, "m"))?.[1]?.trim() || "";
}

function meaningful(value) {
  const normalized = String(value || "").trim();
  return normalized.length >= 8 && !/^(todo|tbd|n\/a|none|placeholder|add|replace|-|\[.*\])$/i.test(normalized);
}

function clean(value) {
  return String(value || "")
    .replace(/```[\s\S]*?```/g, "")
    .replace(/[#*_`]/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

function htmlEscape(value) {
  return String(value || "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;");
}

function write(path, content) {
  const dir = path.split("/").slice(0, -1).join("/");
  if (dir) mkdirSync(dir, { recursive: true });
  writeFileSync(path, content);
}

function firstFilledTableRow(markdown, heading, requiredIndexes) {
  return tableRows(section(markdown, heading)).find((cells) => {
    const first = cells[0] || "";
    if (/^(Priority|Week|Metric|Area|Claim|Signal)$/i.test(first)) return false;
    return requiredIndexes.every((index) => meaningful(cells[index]));
  }) || [];
}

function filledTableRows(markdown, heading, requiredIndexes) {
  return tableRows(section(markdown, heading)).filter((cells) => {
    const first = cells[0] || "";
    if (/^(Priority|Week|Metric|Area|Claim|Signal|Layer)$/i.test(first)) return false;
    return requiredIndexes.every((index) => meaningful(cells[index]));
  });
}

function firstFilledMeasurementRow(markdown) {
  return tableRows(section(markdown, "Measurement Contract")).find((cells) => {
    const first = cells[0] || "";
    if (/^Signal$/i.test(first)) return false;
    return [0, 1, 2, 3, 4, 5].every((index) => meaningful(cells[index]));
  }) || [];
}

function approvedClaimRows(markdown) {
  return tableRows(markdown)
    .filter((cells) => {
      const [claim, source, proofType, approvedBy, status] = cells;
      if (/^Claim$/i.test(claim || "")) return false;
      return claim && source && proofType && approvedBy && /^approved$/i.test(status || "");
    })
    .map(([claim, source, proofType, approvedBy]) => ({ claim, source, proofType, approvedBy }));
}

const intake = read("intake.md");
const sprintPlan = read("sprint-plan.md");
const delivery = read("deliverables/delivery.md");
const handoff = read("deliverables/implementation-handoff.md");
const report = read("reports/week-1-report.md");
const weeklyLearnings = read("brain/weekly-learnings.md");
const claimLedger = read("quality/claim-proof-ledger.md");

const readiness = runJson(["scripts/check-client-readiness.mjs", clientPath]);
const weekly = runJson(["scripts/check-client-weekly-report.mjs", clientPath]);
const channelReadiness = runJson(["scripts/check-client-channel-readiness.mjs", clientPath]);
const approvedClaims = approvedClaimRows(claimLedger);

const name = bulletValue(intake, "Name") || clientPath.split("/").at(-1);
const website = bulletValue(intake, "Website") || "website pending";
const mainGoal = bulletValue(report, "Main goal") || bulletValue(intake, "Main offer") || "main goal pending";
const wedge = clean(section(sprintPlan, "Wedge")).split("\n").find((line) => meaningful(line)) || "Sprint wedge pending";
const shipped = bulletValue(report, "Shipped") || "Shipped work pending";
const drafted = bulletValue(report, "Drafted") || "Drafted work pending";
const waiting = bulletValue(report, "Waiting on client") || "No client blocker recorded yet";
const blocked = bulletValue(report, "Blocked") || "None recorded";
const improved = bulletValue(report, "What improved") || "";
const gotWorse = bulletValue(report, "What got worse") || "";
const stayedFlat = bulletValue(report, "What stayed flat") || "";
const surprised = bulletValue(report, "What surprised us") || "";
const feltValuable = bulletValue(report, "What felt valuable") || "";
const feltUnclear = bulletValue(report, "What felt unclear") || "";
const delightAddOn = bulletValue(report, "Delight add-on") || "";
const healthScore = bulletValue(report, "Health score") || "";
const retentionRisk = bulletValue(report, "Retention risk") || "";
const clientSawDelta = bulletValue(report, "Client saw delta") || "";
const clientUnderstoodValue = bulletValue(report, "Client understood value") || "";
const clientApprovedNextAction = bulletValue(report, "Client approved next action") || "";
const continueRetainSignal = bulletValue(report, "Continue / retain signal") || "";
const topLeak = firstFilledTableRow(delivery, "Top Faults", [1, 2, 3]);
const tangibleImprovement = firstFilledTableRow(delivery, "Tangible Improvements", [1, 2, 3, 4, 5]);
const nextTest = firstFilledTableRow(report, "Next Tests", [1, 2, 3, 4]);
const reportMeasurementContract = firstFilledMeasurementRow(report);
const revenueLeakRows = filledTableRows(report, "Revenue Fault Loop", [1, 2, 3, 4]);
const searchTrustRows = filledTableRows(report, "Search Trust Review", [1, 2, 3]);
const actionPlan = firstFilledTableRow(delivery, "30-Day Action Plan", [1, 2, 3]);
const brainLearning = firstFilledTableRow(weeklyLearnings, "Log", [1, 3, 4]);
const handoffUrl = bulletValue(handoff, "URL") || "";
const handoffOwner = bulletValue(handoff, "Owner") || "";
const handoffPriority = bulletValue(handoff, "Priority") || "";
const handoffMetric = bulletValue(handoff, "Primary metric") || "";
const handoffCheckDate = bulletValue(handoff, "Check date") || "";

const nextAction = nextTest[1] || actionPlan[1] || "Approve the sprint handoff, then choose the next test.";
const nextWhy = nextTest[2] || actionPlan[2] || "Keeps the next improvement tied to a visible buyer problem.";
const measurementContract = reportMeasurementContract.length
  ? {
      signal: reportMeasurementContract[0],
      source: reportMeasurementContract[1],
      owner: reportMeasurementContract[2],
      nextCheck: reportMeasurementContract[3],
      baseline: reportMeasurementContract[4],
      decisionRule: reportMeasurementContract[5]
    }
  : {
      signal: tangibleImprovement[5] || handoffMetric || nextAction,
      source: tangibleImprovement[3] || handoffUrl || website || "Proof source pending",
      owner: nextTest[3] || actionPlan[2] || handoffOwner || "Owner pending",
      nextCheck: nextTest[4] || handoffCheckDate || "Next weekly review",
      baseline: tangibleImprovement[1] && tangibleImprovement[2]
        ? `Before: ${tangibleImprovement[1]} / Current: ${tangibleImprovement[2]}`
        : "Baseline pending; capture before the next check",
      decisionRule: nextTest[2]
        || (tangibleImprovement[5] ? `If ${tangibleImprovement[5]} improves, continue this lane; if not, revise the angle or implementation.` : "")
        || "At the next check, decide whether to continue, iterate, or pause this lane."
    };
const measurementContractComplete = Object.values(measurementContract).every(meaningful);
const clientConfirmationComplete = [clientSawDelta, clientUnderstoodValue, clientApprovedNextAction, continueRetainSignal].every(meaningful);
const proofStatus = readiness.status === "ready" && weekly.status === "ready" && approvedClaims.length > 0 ? "ready" : "draft";
const warnings = [
  ...(readiness.missing || []),
  ...(readiness.warnings || []),
  ...(weekly.missing || []),
  ...(weekly.warnings || []),
  ...(approvedClaims.length ? [] : ["No approved client-facing proof claims yet"])
];

const learningItems = [
  improved && `Improved: ${improved}`,
  gotWorse && `Got worse: ${gotWorse}`,
  stayedFlat && `Stayed flat: ${stayedFlat}`,
  surprised && `Surprised us: ${surprised}`,
  brainLearning.length && `Durable learning: ${brainLearning[3]}`
].filter(Boolean);

const valueLedger = [
  {
    area: "Shipped value",
    proof: tangibleImprovement.length ? `Before: ${tangibleImprovement[1]} / After: ${tangibleImprovement[2]}` : shipped,
    clientValue: tangibleImprovement[4] || feltValuable || "Client value feedback pending",
    next: tangibleImprovement[5] || nextAction
  },
  {
    area: "Fault clarity",
    proof: tangibleImprovement[3] || (topLeak.length ? topLeak[2] : "Top fault pending"),
    clientValue: topLeak.length ? topLeak[3] : "Fill the delivery fault table",
    next: actionPlan[1] || nextAction
  },
  {
    area: "Search trust",
    proof: searchTrustRows.length ? searchTrustRows.map((cells) => `${cells[0]}: ${cells[2]}`).join("; ") : "Search trust review pending",
    clientValue: searchTrustRows.length ? "The fixed page is easier for searchers, Google, and AI-assisted search to understand" : "Add title/meta, headings, links, FAQs, crawl basics, or real trust/distribution",
    next: searchTrustRows[0]?.[3] || "Fill the search trust review before the next client update"
  },
  {
    area: "Decision burden",
    proof: handoffPriority ? `Priority ${handoffPriority}: ${handoffUrl || website}${handoffOwner ? `, owner ${handoffOwner}` : ""}` : "Implementation priority pending",
    clientValue: handoffMetric ? `Primary metric: ${handoffMetric}` : "Primary metric pending",
    next: "Give the client one owner, one action, and one measurement"
  },
  {
    area: "Proof discipline",
    proof: `${approvedClaims.length} approved claim(s)`,
    clientValue: approvedClaims.length ? "Client-facing claims are backed by approved evidence" : "No approved proof yet",
    next: approvedClaims.length ? "Use only approved proof in client-facing copy" : "Approve or remove every claim before sending"
  },
  {
    area: "Delight",
    proof: delightAddOn || "Delight add-on pending",
    clientValue: feltUnclear ? `Reduce confusion: ${feltUnclear}` : "Ask what still feels unclear",
    next: retentionRisk ? `Retention watch: ${retentionRisk}` : "Record retention risk before renewal"
  },
  {
    area: "Client confirmation",
    proof: clientSawDelta || "Client confirmation pending",
    clientValue: clientUnderstoodValue || "Client has not confirmed understood value yet",
    next: continueRetainSignal || clientApprovedNextAction || "Ask whether this lane is worth continuing"
  }
];

const valueProofChecks = [
  {
    area: "Visible before/after",
    points: 2,
    passed: meaningful(tangibleImprovement[1]) && meaningful(tangibleImprovement[2]),
    evidence: tangibleImprovement.length ? `${tangibleImprovement[1]} -> ${tangibleImprovement[2]}` : "No before/after row yet"
  },
  {
    area: "Proof source",
    points: 2,
    passed: meaningful(tangibleImprovement[3]),
    evidence: tangibleImprovement[3] || "No proof source yet"
  },
  {
    area: "Client-visible value",
    points: 2,
    passed: meaningful(tangibleImprovement[4]) || meaningful(feltValuable),
    evidence: tangibleImprovement[4] || feltValuable || "No plain-English value statement yet"
  },
  {
    area: "Measurement contract",
    points: 1,
    passed: measurementContractComplete,
    evidence: measurementContractComplete
      ? `${measurementContract.signal}; owner ${measurementContract.owner}; next check ${measurementContract.nextCheck}`
      : "Signal, source, owner, next check, baseline, and decision rule are not all filled"
  },
  {
    area: "Approved proof",
    points: 1,
    passed: approvedClaims.length > 0,
    evidence: `${approvedClaims.length} approved claim(s)`
  },
  {
    area: "Retention pulse",
    points: 1,
    passed: [feltValuable, feltUnclear, healthScore, retentionRisk].every(meaningful) && clientConfirmationComplete,
    evidence: continueRetainSignal || retentionRisk || "Retention pulse or client confirmation incomplete"
  },
  {
    area: "Delight add-on",
    points: 1,
    passed: meaningful(delightAddOn),
    evidence: delightAddOn || "No delight add-on yet"
  }
];

const valueProofScore = valueProofChecks.reduce((sum, check) => sum + (check.passed ? check.points : 0), 0);
const valueProofStatus = valueProofScore >= 8 && approvedClaims.length > 0
  ? "retention-ready"
  : valueProofScore >= 7
    ? "value-visible-needs-approval"
    : "weak-value-proof";

const tangibleImprovementFields = [
  ["Before", tangibleImprovement[1] || "Pending. Capture the old page, copy, workflow, or measurement state."],
  ["After", tangibleImprovement[2] || "Pending. Ship or hand off one exact improvement."],
  ["Proof source", tangibleImprovement[3] || "Pending. Add screenshot, page source, test result, analytics, client fact, or shipped file."],
  ["Client-visible value", tangibleImprovement[4] || "Pending. Explain why the client should care in plain English."],
  ["Next measurement", tangibleImprovement[5] || "Pending. Pick the next signal we will watch."]
];

const tangibleImprovementRows = tangibleImprovementFields
  .map(([field, value]) => `| ${field} | ${value} |`)
  .join("\n");

const valueLedgerRows = valueLedger
  .map((row) => `| ${row.area} | ${row.proof} | ${row.clientValue} | ${row.next} |`)
  .join("\n");

const valueProofScoreRows = valueProofChecks
  .map((check) => `| ${check.area} | ${check.passed ? "pass" : "missing"} | ${check.points} | ${check.evidence} |`)
  .join("\n");

const measurementContractRows = [
  ["Signal", measurementContract.signal || "Pending. Name the exact metric, client reaction, or proof signal."],
  ["Source", measurementContract.source || "Pending. Name the dashboard, analytics source, page, screenshot, or client confirmation source."],
  ["Owner", measurementContract.owner || "Pending. Name who checks this."],
  ["Next check", measurementContract.nextCheck || "Pending. Set the next review date or cadence."],
  ["Baseline / current", measurementContract.baseline || "Pending. Capture the old/current state before judging impact."],
  ["Decision rule", measurementContract.decisionRule || "Pending. Decide what happens if the signal improves, stays flat, or worsens."]
].map(([field, value]) => `| ${field} | ${value} |`).join("\n");

const revenueLeakMarkdownRows = revenueLeakRows.length
  ? revenueLeakRows.map((cells) => `| ${cells[0]} | ${cells[1]} | ${cells[2]} | ${cells[3]} | ${cells[4]} |`).join("\n")
  : "| Pending | Add the before fault | Add the fix shipped or handed off | Add client-visible value | Add next action |";

const searchTrustMarkdownRows = searchTrustRows.length
  ? searchTrustRows.map((cells) => `| ${cells[0]} | ${cells[1]} | ${cells[2]} | ${cells[3]} |`).join("\n")
  : "| Pending | Add current search trust state | Add fix or action | Add next measurement |";

const proofRows = approvedClaims.length
  ? approvedClaims.map((claim) => `| ${claim.claim} | ${claim.source} | ${claim.proofType} | ${claim.approvedBy} |`).join("\n")
  : "| Pending | Add only claims approved in the claim-proof ledger. | - | - |";

const missingRows = warnings.length
  ? warnings.map((warning) => `| ${warning} |`).join("\n")
  : "| No missing proof items. |";

const readyChannelList = channelReadiness.readyChannels?.length ? channelReadiness.readyChannels.join(", ") : "none";
const blockedChannelList = channelReadiness.blockedChannels?.length ? channelReadiness.blockedChannels.join(", ") : "none";
const channelReadinessRows = [
  ["Status", channelReadiness.status],
  ["Ready channels", readyChannelList],
  ["Blocked channels", blockedChannelList],
  ["Proof Sprint ready", channelReadiness.proofSprintReady ? "yes" : "no"],
  ["Weekly Growth Desk ready", channelReadiness.weeklyGrowthDeskReady ? "yes" : "no"],
  ["Full-Stack Growth Desk ready", channelReadiness.fullStackGrowthDeskReady ? "yes" : "no"],
  ["Operator-Led Growth Pod ready", channelReadiness.operatorPodReady ? "yes" : "no"]
].map(([field, value]) => `| ${field} | ${value} |`).join("\n");

const markdown = `# ${name} Client Dashboard

Generated: ${today}

Status: ${proofStatus}

This dashboard is client-facing only when status is ready. If it is draft, use it internally to see what proof is still missing.

## Snapshot

| Area | Detail |
|---|---|
| Website | ${website} |
| Sprint focus | ${wedge} |
| Main goal | ${mainGoal} |
| Delivery readiness | ${readiness.status} |
| Weekly proof | ${weekly.status} |
| Channel readiness | ${channelReadiness.status} |
| Ready channels | ${readyChannelList} |
| Approved proof claims | ${approvedClaims.length} |
| Value proof score | ${valueProofScore}/10 - ${valueProofStatus} |

## This Week's Tangible Improvement

| Field | Value |
|---|---|
${tangibleImprovementRows}

## Measurement Contract

| Field | Value |
|---|---|
${measurementContractRows}

## Revenue Fault Loop

| Lane | Before Fault | Fix Shipped / Handed Off | Client-Visible Value | Next Action |
|---|---|---|---|---|
${revenueLeakMarkdownRows}

## Search Trust Review

| Area | Current State | Fix / Action | Next Measurement |
|---|---|---|---|
${searchTrustMarkdownRows}

## Channel Readiness

| Field | Value |
|---|---|
${channelReadinessRows}

## What Changed

- Shipped: ${shipped}
- Drafted: ${drafted}
- Waiting on client: ${waiting}
- Blocked: ${blocked}

## What We Learned

${learningItems.length ? learningItems.map((item) => `- ${item}`).join("\n") : "- Learning pending. Fill the weekly report and client brain before sending this dashboard."}

## Value Ledger

| Area | Proof | Client Value | Next |
|---|---|---|---|
${valueLedgerRows}

## Value Proof Score

| Area | Status | Points | Evidence |
|---|---|---:|---|
${valueProofScoreRows}

## Retention / Delight Pulse

- What felt valuable: ${feltValuable || "Pending. Ask the client before renewal."}
- What felt unclear: ${feltUnclear || "Pending. Ask the client before renewal."}
- Delight add-on: ${delightAddOn || "Pending. Pick one specific add-on, not extra scope."}
- Health score: ${healthScore || "Pending. Score weekly client health."}
- Retention risk: ${retentionRisk || "Pending. Record risk before renewal."}

## Client Confirmation

- Client saw delta: ${clientSawDelta || "Pending. Confirm the client saw the before/after change."}
- Client understood value: ${clientUnderstoodValue || "Pending. Confirm the client can explain why it matters."}
- Client approved next action: ${clientApprovedNextAction || "Pending. Confirm the next action or test."}
- Continue / retain signal: ${continueRetainSignal || "Pending. Ask whether this lane is worth continuing."}

## Top Fault

${topLeak.length ? `- Fault: ${topLeak[1]}\n- Evidence: ${topLeak[2]}\n- Fix: ${topLeak[3]}` : "- Pending. Fill the delivery top-faults table first."}

## Tangible Improvement

${tangibleImprovement.length ? `- Before: ${tangibleImprovement[1]}\n- After: ${tangibleImprovement[2]}\n- Proof source: ${tangibleImprovement[3]}\n- Client-visible value: ${tangibleImprovement[4]}\n- Next measurement: ${tangibleImprovement[5]}` : "- Pending. Fill the tangible improvements table before calling this client-ready."}

## Next Action

- Action: ${nextAction}
- Why: ${nextWhy}

## Approved Proof

| Claim | Source | Proof Type | Approved By |
|---|---|---|---|
${proofRows}

## Missing Before Client-Ready

| Missing Item |
|---|
${missingRows}

## Source Files

- Delivery: \`${join(clientPath, "deliverables/delivery.md")}\`
- Weekly report: \`${join(clientPath, "reports/week-1-report.md")}\`
- Claim ledger: \`${join(clientPath, "quality/claim-proof-ledger.md")}\`
- Implementation handoff: \`${join(clientPath, "deliverables/implementation-handoff.md")}\`
`;

const proofHtml = approvedClaims.length
  ? approvedClaims.map((claim) => `
        <tr>
          <td>${htmlEscape(claim.claim)}</td>
          <td>${htmlEscape(claim.source)}</td>
          <td>${htmlEscape(claim.proofType)}</td>
          <td>${htmlEscape(claim.approvedBy)}</td>
        </tr>`).join("")
  : `<tr><td>Pending</td><td>Add only approved ledger claims.</td><td>-</td><td>-</td></tr>`;

const missingHtml = warnings.length
  ? warnings.map((warning) => `<li>${htmlEscape(warning)}</li>`).join("\n")
  : "<li>No missing proof items.</li>";

const valueLedgerHtml = valueLedger.map((row) => `
        <tr>
          <td>${htmlEscape(row.area)}</td>
          <td>${htmlEscape(row.proof)}</td>
          <td>${htmlEscape(row.clientValue)}</td>
          <td>${htmlEscape(row.next)}</td>
        </tr>`).join("");

const valueProofScoreHtml = valueProofChecks.map((check) => `
        <tr>
          <td>${htmlEscape(check.area)}</td>
          <td><span class="${check.passed ? "ok" : "missing"}">${check.passed ? "pass" : "missing"}</span></td>
          <td>${check.points}</td>
          <td>${htmlEscape(check.evidence)}</td>
        </tr>`).join("");

const tangibleImprovementHtml = tangibleImprovementFields.map(([field, value]) => `
        <tr>
          <td>${htmlEscape(field)}</td>
          <td>${htmlEscape(value)}</td>
        </tr>`).join("");

const measurementContractHtml = [
  ["Signal", measurementContract.signal || "Pending. Name the exact metric, client reaction, or proof signal."],
  ["Source", measurementContract.source || "Pending. Name the dashboard, analytics source, page, screenshot, or client confirmation source."],
  ["Owner", measurementContract.owner || "Pending. Name who checks this."],
  ["Next check", measurementContract.nextCheck || "Pending. Set the next review date or cadence."],
  ["Baseline / current", measurementContract.baseline || "Pending. Capture the old/current state before judging impact."],
  ["Decision rule", measurementContract.decisionRule || "Pending. Decide what happens if the signal improves, stays flat, or worsens."]
].map(([field, value]) => `
        <tr>
          <td>${htmlEscape(field)}</td>
          <td>${htmlEscape(value)}</td>
        </tr>`).join("");

const revenueLeakHtml = revenueLeakRows.length
  ? revenueLeakRows.map((cells) => `
        <tr>
          <td>${htmlEscape(cells[0])}</td>
          <td>${htmlEscape(cells[1])}</td>
          <td>${htmlEscape(cells[2])}</td>
          <td>${htmlEscape(cells[3])}</td>
          <td>${htmlEscape(cells[4])}</td>
        </tr>`).join("")
  : `<tr><td>Pending</td><td>Add the before fault.</td><td>Add the fix shipped or handed off.</td><td>Add client-visible value.</td><td>Add next action.</td></tr>`;

const searchTrustHtml = searchTrustRows.length
  ? searchTrustRows.map((cells) => `
        <tr>
          <td>${htmlEscape(cells[0])}</td>
          <td>${htmlEscape(cells[1])}</td>
          <td>${htmlEscape(cells[2])}</td>
          <td>${htmlEscape(cells[3])}</td>
        </tr>`).join("")
  : `<tr><td>Pending</td><td>Add current search trust state.</td><td>Add fix or action.</td><td>Add next measurement.</td></tr>`;

const channelReadinessHtml = [
  ["Status", channelReadiness.status],
  ["Ready channels", readyChannelList],
  ["Blocked channels", blockedChannelList],
  ["Proof Sprint ready", channelReadiness.proofSprintReady ? "yes" : "no"],
  ["Weekly Growth Desk ready", channelReadiness.weeklyGrowthDeskReady ? "yes" : "no"],
  ["Full-Stack Growth Desk ready", channelReadiness.fullStackGrowthDeskReady ? "yes" : "no"],
  ["Operator-Led Growth Pod ready", channelReadiness.operatorPodReady ? "yes" : "no"]
].map(([field, value]) => `
        <tr>
          <td>${htmlEscape(field)}</td>
          <td>${htmlEscape(value)}</td>
        </tr>`).join("");

const html = `<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>${htmlEscape(name)} Client Dashboard</title>
  <style>
    :root { color-scheme: light; --ink:#151719; --muted:#667085; --line:#d9e1ea; --paper:#f7f9fc; --panel:#fff; --good:#0f7b45; --warn:#9a5b00; --bad:#b42318; }
    * { box-sizing: border-box; }
    body { margin:0; background:var(--paper); color:var(--ink); font-family:Inter, ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif; }
    main { max-width:1080px; margin:0 auto; padding:28px 18px 48px; }
    header { display:grid; grid-template-columns:1fr auto; gap:16px; align-items:end; padding-bottom:18px; border-bottom:1px solid var(--line); }
    h1 { margin:0; font-size:clamp(30px, 4vw, 44px); line-height:1; letter-spacing:0; }
    h2 { margin:0 0 10px; font-size:18px; letter-spacing:0; }
    p { color:var(--muted); margin:8px 0 0; }
    section { margin-top:18px; border:1px solid var(--line); border-radius:8px; background:var(--panel); padding:16px; }
    .pill { display:inline-flex; padding:5px 9px; border-radius:999px; color:#fff; font-size:12px; font-weight:800; text-transform:uppercase; letter-spacing:.03em; background:${proofStatus === "ready" ? "var(--good)" : "var(--warn)"}; }
    .score { display:inline-flex; padding:5px 9px; border-radius:999px; color:#fff; font-size:12px; font-weight:800; text-transform:uppercase; letter-spacing:.03em; background:${valueProofStatus === "retention-ready" ? "var(--good)" : valueProofStatus === "value-visible-needs-approval" ? "var(--warn)" : "var(--bad)"}; }
    .ok, .missing { display:inline-flex; padding:4px 8px; border-radius:999px; font-size:12px; font-weight:800; text-transform:uppercase; letter-spacing:.03em; }
    .ok { color:#fff; background:var(--good); }
    .missing { color:#fff; background:var(--bad); }
    .cards { display:grid; grid-template-columns:repeat(3, minmax(0, 1fr)); gap:12px; }
    .card { border:1px solid var(--line); border-radius:8px; padding:14px; background:var(--paper); }
    .card b { display:block; margin-bottom:5px; }
    .improvement { border-color:${tangibleImprovement.length ? "var(--good)" : "var(--warn)"}; }
    .muted { color:var(--muted); }
    table { width:100%; border-collapse:collapse; margin-top:8px; }
    th, td { text-align:left; vertical-align:top; padding:10px 8px; border-top:1px solid var(--line); }
    th { color:var(--muted); font-size:12px; text-transform:uppercase; letter-spacing:.04em; }
    ul { margin:8px 0 0; padding-left:20px; }
    @media (max-width:760px) { header { display:block; } .cards { grid-template-columns:1fr; } table { display:block; overflow-x:auto; } }
  </style>
</head>
<body>
  <main>
    <header>
      <div>
        <h1>Client Dashboard</h1>
        <p>${htmlEscape(name)} · ${htmlEscape(website)} · generated ${htmlEscape(today)}</p>
      </div>
      <span class="pill">${htmlEscape(proofStatus)}</span>
    </header>
    <section class="cards">
      <div class="card"><b>Delivery</b><span class="muted">${htmlEscape(readiness.status)}</span></div>
      <div class="card"><b>Weekly Proof</b><span class="muted">${htmlEscape(weekly.status)}</span></div>
      <div class="card"><b>Channel Readiness</b><span class="muted">${htmlEscape(channelReadiness.status)}</span></div>
      <div class="card"><b>Approved Claims</b><span class="muted">${htmlEscape(approvedClaims.length)}</span></div>
      <div class="card"><b>Value Proof</b><span class="score">${htmlEscape(`${valueProofScore}/10`)}</span><p class="muted">${htmlEscape(valueProofStatus)}</p></div>
    </section>
    <section class="improvement">
      <h2>This Week's Tangible Improvement</h2>
      <table><thead><tr><th>Field</th><th>Value</th></tr></thead><tbody>${tangibleImprovementHtml}
      </tbody></table>
    </section>
    <section>
      <h2>Measurement Contract</h2>
      <table><thead><tr><th>Field</th><th>Value</th></tr></thead><tbody>${measurementContractHtml}
      </tbody></table>
    </section>
    <section>
      <h2>Revenue Fault Loop</h2>
      <table><thead><tr><th>Lane</th><th>Before Fault</th><th>Fix</th><th>Client Value</th><th>Next Action</th></tr></thead><tbody>${revenueLeakHtml}
      </tbody></table>
    </section>
    <section>
      <h2>Search Trust Review</h2>
      <table><thead><tr><th>Area</th><th>Current State</th><th>Fix / Action</th><th>Next Measurement</th></tr></thead><tbody>${searchTrustHtml}
      </tbody></table>
    </section>
    <section>
      <h2>Channel Readiness</h2>
      <table><thead><tr><th>Field</th><th>Value</th></tr></thead><tbody>${channelReadinessHtml}
      </tbody></table>
    </section>
    <section>
      <h2>What Changed</h2>
      <ul>
        <li><b>Shipped:</b> ${htmlEscape(shipped)}</li>
        <li><b>Drafted:</b> ${htmlEscape(drafted)}</li>
        <li><b>Waiting on client:</b> ${htmlEscape(waiting)}</li>
        <li><b>Blocked:</b> ${htmlEscape(blocked)}</li>
      </ul>
    </section>
    <section>
      <h2>What We Learned</h2>
      <ul>${learningItems.length ? learningItems.map((item) => `<li>${htmlEscape(item)}</li>`).join("") : "<li>Learning pending. Fill the weekly report and client brain before sending this dashboard.</li>"}</ul>
    </section>
    <section>
      <h2>Value Ledger</h2>
      <table><thead><tr><th>Area</th><th>Proof</th><th>Client Value</th><th>Next</th></tr></thead><tbody>${valueLedgerHtml}
      </tbody></table>
    </section>
    <section>
      <h2>Value Proof Score</h2>
      <table><thead><tr><th>Area</th><th>Status</th><th>Points</th><th>Evidence</th></tr></thead><tbody>${valueProofScoreHtml}
      </tbody></table>
    </section>
    <section>
      <h2>Retention / Delight Pulse</h2>
      <ul>
        <li><b>What felt valuable:</b> ${htmlEscape(feltValuable || "Pending. Ask the client before renewal.")}</li>
        <li><b>What felt unclear:</b> ${htmlEscape(feltUnclear || "Pending. Ask the client before renewal.")}</li>
        <li><b>Delight add-on:</b> ${htmlEscape(delightAddOn || "Pending. Pick one specific add-on, not extra scope.")}</li>
        <li><b>Health score:</b> ${htmlEscape(healthScore || "Pending. Score weekly client health.")}</li>
        <li><b>Retention risk:</b> ${htmlEscape(retentionRisk || "Pending. Record risk before renewal.")}</li>
      </ul>
    </section>
    <section>
      <h2>Client Confirmation</h2>
      <ul>
        <li><b>Client saw delta:</b> ${htmlEscape(clientSawDelta || "Pending. Confirm the client saw the before/after change.")}</li>
        <li><b>Client understood value:</b> ${htmlEscape(clientUnderstoodValue || "Pending. Confirm the client can explain why it matters.")}</li>
        <li><b>Client approved next action:</b> ${htmlEscape(clientApprovedNextAction || "Pending. Confirm the next action or test.")}</li>
        <li><b>Continue / retain signal:</b> ${htmlEscape(continueRetainSignal || "Pending. Ask whether this lane is worth continuing.")}</li>
      </ul>
    </section>
    <section>
      <h2>Top Fault</h2>
      ${topLeak.length ? `<p><b>${htmlEscape(topLeak[1])}</b></p><p>${htmlEscape(topLeak[2])}</p><p><b>Fix:</b> ${htmlEscape(topLeak[3])}</p>` : "<p>Pending. Fill the delivery top-faults table first.</p>"}
    </section>
    <section>
      <h2>Tangible Improvement</h2>
      ${tangibleImprovement.length ? `<p><b>Before:</b> ${htmlEscape(tangibleImprovement[1])}</p><p><b>After:</b> ${htmlEscape(tangibleImprovement[2])}</p><p><b>Proof:</b> ${htmlEscape(tangibleImprovement[3])}</p><p><b>Client value:</b> ${htmlEscape(tangibleImprovement[4])}</p><p><b>Next measurement:</b> ${htmlEscape(tangibleImprovement[5])}</p>` : "<p>Pending. Fill the tangible improvements table before calling this client-ready.</p>"}
    </section>
    <section>
      <h2>Next Action</h2>
      <p><b>${htmlEscape(nextAction)}</b></p>
      <p>${htmlEscape(nextWhy)}</p>
    </section>
    <section>
      <h2>Approved Proof</h2>
      <table><thead><tr><th>Claim</th><th>Source</th><th>Proof Type</th><th>Approved By</th></tr></thead><tbody>${proofHtml}
      </tbody></table>
    </section>
    <section>
      <h2>Missing Before Client-Ready</h2>
      <ul>${missingHtml}</ul>
    </section>
  </main>
</body>
</html>
`;

write(markdownPath, markdown);
write(htmlPath, html);

console.log(JSON.stringify({
  status: proofStatus,
  path: htmlPath,
  markdownPath,
  clientPath,
  readiness: readiness.status,
  weekly: weekly.status,
  channelReadiness: channelReadiness.status,
  readyChannels: channelReadiness.readyChannels || [],
  approvedClaims: approvedClaims.length,
  valueLedger: valueLedger.length,
  valueProofScore,
  valueProofStatus,
  measurementContractComplete,
  healthScore,
  retentionRisk,
  clientConfirmed: clientConfirmationComplete,
  warnings
}, null, 2));
