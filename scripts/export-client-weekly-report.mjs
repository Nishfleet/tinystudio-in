#!/usr/bin/env node
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { execFileSync } from "node:child_process";
import { localIsoDate } from "./date-utils.mjs";

const args = process.argv.slice(2);
const clientPath = args[0];
const outputArg = args.find((arg) => arg.startsWith("--output="));
const weekArg = args.find((arg) => arg.startsWith("--week="));
const datesArg = args.find((arg) => arg.startsWith("--dates="));

if (!clientPath) {
  console.error("Usage: npm run client:weekly-report -- clients/client-slug [--week=1] [--dates=\"May 1-7\"]");
  process.exit(1);
}

if (!existsSync(clientPath)) {
  console.error(`Client folder not found: ${clientPath}`);
  process.exit(1);
}

const week = weekArg ? weekArg.split("=")[1] : "1";
const outputPath = outputArg ? outputArg.split("=")[1] : join(clientPath, "reports", `week-${week}-report.md`);

function read(relativePath) {
  const path = join(clientPath, relativePath);
  return existsSync(path) ? readFileSync(path, "utf8") : "";
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

function firstFilledTableRow(markdown, heading, requiredIndexes) {
  return tableRows(section(markdown, heading)).find((cells) => {
    const first = cells[0] || "";
    if (/^(Priority|Week|Metric|Area|Signal)$/i.test(first)) return false;
    return requiredIndexes.every((index) => meaningful(cells[index]));
  }) || [];
}

function filledTableRows(markdown, heading, requiredIndexes) {
  return tableRows(section(markdown, heading)).filter((cells) => {
    const first = cells[0] || "";
    if (/^(Priority|Week|Metric|Area|Signal|Layer)$/i.test(first)) return false;
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

function firstFilledBullet(markdown, labels) {
  for (const label of labels) {
    const value = bulletValue(markdown, label);
    if (meaningful(value)) return value;
  }
  return "";
}

function clean(value) {
  return String(value || "").replace(/\s+/g, " ").trim();
}

function numbersToReviewTable(markdown) {
  const rows = tableRows(section(markdown, "Numbers To Review"))
    .filter((cells) => cells[0] && !/^Metric$/i.test(cells[0]))
    .map((cells) => [cells[0] || "", cells[1] || "", cells[2] || "", cells[3] || ""]);
  const defaultRows = [
    ["Sessions", "", "", ""],
    ["Conversion rate", "", "", ""],
    ["Revenue", "", "", ""],
    ["AOV", "", "", ""],
    ["Email revenue", "", "", ""],
    ["Ad spend", "", "", ""],
    ["CPA/CAC", "", "", ""]
  ];
  const byMetric = new Map(defaultRows.map((cells) => [cells[0].toLowerCase(), cells]));
  for (const cells of rows) byMetric.set(cells[0].toLowerCase(), cells);
  return [
    "| Metric | Last Period | This Period | Notes |",
    "|---|---:|---:|---|",
    ...Array.from(byMetric.values()).map((cells) => `| ${cells[0]} | ${cells[1]} | ${cells[2]} | ${cells[3]} |`)
  ].join("\n");
}

function hasFilledHandoffSection(markdown) {
  const content = section(markdown, "With This")
    .replace(/Recommended section:/gi, "")
    .replace(/```(?:text)?/gi, "")
    .trim();
  return meaningful(content);
}

const intake = read("intake.md");
const delivery = read("deliverables/delivery.md");
const handoff = read("deliverables/implementation-handoff.md");
const conversionScorecard = read("quality/conversion-optimization-scorecard.md");
const existingReport = existsSync(outputPath) ? readFileSync(outputPath, "utf8") : read("reports/week-1-report.md");
const weeklyLearnings = read("brain/weekly-learnings.md");

const name = bulletValue(intake, "Name") || clientPath.split("/").at(-1);
const dates = datesArg ? datesArg.split("=")[1] : bulletValue(existingReport, "Dates") || bulletValue(intake, "Sprint dates");
const mainGoal = bulletValue(existingReport, "Main goal") || bulletValue(intake, "Main goal") || bulletValue(intake, "Main offer");
const topLeak = firstFilledTableRow(delivery, "Top Leaks", [1, 2, 3]);
const actionPlan = firstFilledTableRow(delivery, "30-Day Action Plan", [1, 2, 3]);
const tangibleImprovement = firstFilledTableRow(delivery, "Tangible Improvements", [1, 2, 3, 4, 5]);
const hasHandoffCopy = hasFilledHandoffSection(handoff);
const shipped = firstFilledBullet(existingReport, ["Shipped"])
  || (topLeak.length ? `${topLeak[3]} for ${topLeak[1]}` : "")
  || (hasHandoffCopy ? "Implementation-ready page section handoff" : "");
const drafted = firstFilledBullet(existingReport, ["Drafted"])
  || (hasHandoffCopy ? "Replacement section and implementation handoff" : "");
const waiting = firstFilledBullet(existingReport, ["Waiting on client"]);
const blocked = firstFilledBullet(existingReport, ["Blocked"]) || "None";
const improved = firstFilledBullet(existingReport, ["What improved"])
  || (topLeak.length ? `The main buyer leak is clearer: ${topLeak[1]}` : "");
const gotWorse = firstFilledBullet(existingReport, ["What got worse"]);
const stayedFlat = firstFilledBullet(existingReport, ["What stayed flat"]);
const surprised = firstFilledBullet(existingReport, ["What surprised us"])
  || (topLeak.length ? `The highest-leverage fix is still specific enough to test next week: ${topLeak[3]}` : "");
const feltValuable = firstFilledBullet(existingReport, ["What felt valuable"]);
const feltUnclear = firstFilledBullet(existingReport, ["What felt unclear"]);
const delightAddOn = firstFilledBullet(existingReport, ["Delight add-on"]);
const healthScore = firstFilledBullet(existingReport, ["Health score"]);
const retentionRisk = firstFilledBullet(existingReport, ["Retention risk"]);
const clientSawDelta = firstFilledBullet(existingReport, ["Client saw delta"]);
const clientUnderstoodValue = firstFilledBullet(existingReport, ["Client understood value"]);
const clientApprovedNextAction = firstFilledBullet(existingReport, ["Client approved next action"]);
const continueRetainSignal = firstFilledBullet(existingReport, ["Continue / retain signal"]);
const nextTest = firstFilledTableRow(existingReport, "Next Tests", [1, 2, 3, 4]).length
  ? firstFilledTableRow(existingReport, "Next Tests", [1, 2, 3, 4])
  : actionPlan.length
    ? ["1", actionPlan[1], `Measures ${actionPlan[3]}`, actionPlan[2], localIsoDate()]
    : ["1", "", "", "", ""];
const existingRevenueLeakRows = filledTableRows(existingReport, "Revenue Leak Loop", [1, 2, 3, 4]);
const revenueLeakRows = existingRevenueLeakRows.length
  ? existingRevenueLeakRows
  : [
      [
        "Conversion",
        tangibleImprovement[1] || topLeak[1] || "",
        tangibleImprovement[2] || shipped || "",
        tangibleImprovement[4] || (topLeak.length ? topLeak[3] : ""),
        nextTest[1] || actionPlan[1] || ""
      ],
      [
        "Search trust",
        "",
        "",
        "",
        ""
      ]
    ];
const existingSearchTrustRows = filledTableRows(existingReport, "Search Trust Review", [1, 2, 3]);
const scorecardSearchTrustRows = filledTableRows(conversionScorecard, "Search Trust Layer", [1, 2, 4])
  .map((cells) => [cells[0], cells[1], cells[2], cells[4]]);
const searchTrustRows = existingSearchTrustRows.length
  ? existingSearchTrustRows
  : scorecardSearchTrustRows.length
    ? scorecardSearchTrustRows
    : [
        ["On-site search trust", "", "", ""],
        ["Off-site trust/distribution", "", "", ""]
      ];
const existingBrainRow = firstFilledTableRow(weeklyLearnings, "Log", [1, 3, 4]);
const existingMeasurementContract = firstFilledMeasurementRow(existingReport);
const measurementContract = existingMeasurementContract.length
  ? existingMeasurementContract
  : [
      tangibleImprovement[5] || firstFilledBullet(handoff, ["Primary metric"]) || nextTest[1] || "",
      tangibleImprovement[3] || firstFilledBullet(handoff, ["URL"]) || "Client dashboard and proof source",
      nextTest[3] || actionPlan[2] || firstFilledBullet(handoff, ["Owner"]) || "",
      nextTest[4] || firstFilledBullet(handoff, ["Check date"]) || "Next weekly review",
      tangibleImprovement[1] && tangibleImprovement[2]
        ? `Before: ${tangibleImprovement[1]} / Current: ${tangibleImprovement[2]}`
        : "Baseline pending; capture before the next check",
      nextTest[2] || (tangibleImprovement[5] ? `If ${tangibleImprovement[5]} improves, continue this lane; if not, revise the angle or implementation.` : "At the next check, decide whether to continue, iterate, or pause this lane.")
    ];
const mostValuableChange = firstFilledBullet(existingReport, ["Most valuable change this week"])
  || tangibleImprovement[4]
  || shipped;
const oneQuickWin = firstFilledBullet(existingReport, ["One quick win"])
  || actionPlan[1]
  || (topLeak.length ? topLeak[3] : "");
const whatWeNeedFromClient = firstFilledBullet(existingReport, ["What we need from client"])
  || waiting;
const whyRetainNextMonth = firstFilledBullet(existingReport, ["Why retain next month"])
  || continueRetainSignal;

const report = `# ${name} Week ${week} Report

## Week

- Client: ${name}
- Dates: ${dates || ""}
- Main goal: ${mainGoal || ""}

## What Changed

- Shipped: ${shipped || ""}
- Drafted: ${drafted || ""}
- Waiting on client: ${waiting || ""}
- Blocked: ${blocked || ""}

## Revenue Leak Loop

| Lane | Before Leak | Fix Shipped / Handed Off | Client-Visible Value | Next Action |
|---|---|---|---|---|
${revenueLeakRows.map((cells) => `| ${cells[0] || ""} | ${cells[1] || ""} | ${cells[2] || ""} | ${cells[3] || ""} | ${cells[4] || ""} |`).join("\n")}

## Search Trust Review

| Area | Current State | Fix / Action | Next Measurement |
|---|---|---|---|
${searchTrustRows.map((cells) => `| ${cells[0] || ""} | ${cells[1] || ""} | ${cells[2] || ""} | ${cells[3] || ""} |`).join("\n")}

## Numbers To Review

${numbersToReviewTable(existingReport)}

## Measurement Contract

| Signal | Source | Owner | Next Check | Baseline / Current | Decision Rule |
|---|---|---|---|---|---|
| ${measurementContract[0] || ""} | ${measurementContract[1] || ""} | ${measurementContract[2] || ""} | ${measurementContract[3] || ""} | ${measurementContract[4] || ""} | ${measurementContract[5] || ""} |

## Learnings

- What improved: ${improved || ""}
- What got worse: ${gotWorse || ""}
- What stayed flat: ${stayedFlat || ""}
- What surprised us: ${surprised || ""}

## Client Pulse

- What felt valuable: ${feltValuable || ""}
- What felt unclear: ${feltUnclear || ""}
- Delight add-on: ${delightAddOn || ""}
- Health score: ${healthScore || ""}
- Retention risk: ${retentionRisk || ""}

## Retention Value Stack

- Most valuable change this week: ${mostValuableChange || ""}
- One quick win: ${oneQuickWin || ""}
- What we need from client: ${whatWeNeedFromClient || ""}
- Why retain next month: ${whyRetainNextMonth || ""}

## Client Confirmation

- Client saw delta: ${clientSawDelta || ""}
- Client understood value: ${clientUnderstoodValue || ""}
- Client approved next action: ${clientApprovedNextAction || ""}
- Continue / retain signal: ${continueRetainSignal || ""}

## Next Tests

| Priority | Test | Why | Owner | Due |
|---|---|---|---|---|
| ${nextTest[0] || "1"} | ${nextTest[1] || ""} | ${nextTest[2] || ""} | ${nextTest[3] || ""} | ${nextTest[4] || ""} |
| 2 |  |  |  |  |
| 3 |  |  |  |  |

## Client Brain Update

${existingBrainRow.length ? `- Durable learning already logged: ${clean(existingBrainRow[3])}` : "- Add this week's shipped change, learning, and next action to `brain/weekly-learnings.md` before this becomes retention proof."}
`;

const outputDir = outputPath.split("/").slice(0, -1).join("/");
if (outputDir) mkdirSync(outputDir, { recursive: true });
writeFileSync(outputPath, report);

const checkOutput = execFileSync("node", ["scripts/check-client-weekly-report.mjs", clientPath, `--report=${outputPath}`], {
  encoding: "utf8",
  stdio: ["ignore", "pipe", "pipe"]
});
const check = JSON.parse(checkOutput);

console.log(JSON.stringify({
  status: check.status === "ready" ? "ready" : "draft",
  path: outputPath,
  clientPath,
  week,
  warnings: check.warnings
}, null, 2));
