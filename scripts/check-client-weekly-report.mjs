#!/usr/bin/env node
import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";

const args = process.argv.slice(2);
const clientPath = args[0];
const strict = args.includes("--strict");
const reportArg = args.find((arg) => arg.startsWith("--report="));

if (!clientPath) {
  console.error("Usage: npm run client:weekly-check -- clients/client-slug [-- --strict] [--report=path]");
  process.exit(1);
}

if (!existsSync(clientPath)) {
  console.error(`Client folder not found: ${clientPath}`);
  process.exit(1);
}

const reportPath = reportArg ? reportArg.split("=")[1] : join(clientPath, "reports/week-1-report.md");
const brainPath = join(clientPath, "brain/weekly-learnings.md");

function read(path) {
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

function meaningful(value, minLength = 8) {
  const normalized = String(value || "").trim();
  return normalized.length >= minLength && !/^(todo|tbd|n\/a|none|placeholder|add|replace|-|\[.*\])$/i.test(normalized);
}

function bulletValue(markdown, label) {
  const escaped = label.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  return String(markdown || "").match(new RegExp(`^- ${escaped}:[ \\t]*([^\\n]*)$`, "m"))?.[1]?.trim() || "";
}

function hasFilledTableRow(markdown, heading, requiredIndexes) {
  return tableRows(section(markdown, heading)).some((cells) => {
    const first = cells[0] || "";
    if (/^(Priority|Week|Metric|Area|Signal)$/i.test(first)) return false;
    return requiredIndexes.every((index) => meaningful(cells[index]));
  });
}

function hasClientBrainLearning(markdown) {
  return tableRows(section(markdown, "Log")).some((cells) => {
    if (/^Week$/i.test(cells[0] || "")) return false;
    return String(cells[0] || "").trim().length >= 2 && [1, 3, 4].every((index) => meaningful(cells[index]));
  });
}

const report = read(reportPath);
const brain = read(brainPath);
const missing = [];
const warnings = [];

if (!report) missing.push(`Missing ${reportPath}`);
if (!brain) missing.push(`Missing ${brainPath}`);

if (report) {
  for (const label of ["Client", "Dates", "Main goal"]) {
    if (!meaningful(bulletValue(report, label), label === "Client" ? 2 : 8)) warnings.push(`Weekly report missing ${label}`);
  }

  if (!meaningful(bulletValue(report, "Shipped"))) {
    warnings.push("Weekly report has no shipped work");
  }

  if (!hasFilledTableRow(report, "Revenue Leak Loop", [1, 2, 3, 4])) {
    warnings.push("Weekly report has no filled revenue leak loop row");
  }

  if (!hasFilledTableRow(report, "Search Trust Review", [1, 2, 3])) {
    warnings.push("Weekly report has no filled search trust review row");
  }

  const hasLearning = ["What improved", "What got worse", "What stayed flat", "What surprised us"]
    .some((label) => meaningful(bulletValue(report, label)));
  if (!hasLearning) warnings.push("Weekly report has no learning");

  for (const label of ["What felt valuable", "What felt unclear", "Delight add-on", "Health score", "Retention risk"]) {
    if (!meaningful(bulletValue(report, label))) warnings.push(`Weekly report missing ${label}`);
  }

  for (const label of ["Most valuable change this week", "One quick win", "What we need from client", "Why retain next month"]) {
    if (!meaningful(bulletValue(report, label))) warnings.push(`Weekly report missing ${label}`);
  }

  for (const label of ["Client saw delta", "Client understood value", "Client approved next action", "Continue / retain signal"]) {
    if (!meaningful(bulletValue(report, label))) warnings.push(`Weekly report missing ${label}`);
  }

  if (!hasFilledTableRow(report, "Next Tests", [1, 2, 3, 4])) {
    warnings.push("Weekly report has no filled next-test row");
  }

  if (!hasFilledTableRow(report, "Measurement Contract", [0, 1, 2, 3, 4, 5])) {
    warnings.push("Weekly report has no filled measurement contract");
  }
}

if (brain && !hasClientBrainLearning(brain)) {
  warnings.push("Client brain weekly learnings log has no durable learning row");
}

const status = missing.length === 0 && warnings.length === 0 ? "ready" : "draft";

const result = {
  status,
  clientPath,
  reportPath,
  missing,
  warnings
};

console.log(JSON.stringify(result, null, 2));

if (strict && status !== "ready") process.exit(1);
