#!/usr/bin/env node
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { execFileSync } from "node:child_process";
import { assertOutboundProspectPath } from "./lib/outbound-prospects.mjs";
import { localIsoDate } from "./date-utils.mjs";
import { isValidLoomUrl, loomUrlError } from "./lib/loom-url.mjs";
import { sendChannelGuidance } from "./lib/send-channel-guidance.mjs";

const args = process.argv.slice(2);
const inputPath = args.find((arg) => !arg.startsWith("--")) || "prospects/loom-links.txt";
const dateArg = args.find((arg) => arg.startsWith("--date="));
const reportArg = args.find((arg) => arg.startsWith("--report="));
const dryRun = args.includes("--dry-run");
const fromClipboard = args.includes("--from-clipboard");
const strict = args.includes("--strict");
const force = args.includes("--force");
const channelArg = args.find((arg) => arg.startsWith("--channel="));
const defaultChannel = channelArg ? normalizeChannel(channelArg.split("=")[1]) : "";
const date = dateArg ? dateArg.split("=")[1] : localIsoDate();
const reportPath = reportArg ? reportArg.split("=")[1] : "prospects/batch-send-complete.md";
const validChannels = new Set(["", "email", "contact-form", "dm", "linkedin", "x", "phone", "mixed", "other"]);
const channelGuidance = sendChannelGuidance();

function parseLine(line, index) {
  const trimmed = line.trim();
  if (!trimmed || trimmed.startsWith("#")) return null;
  const separator = trimmed.includes("|") ? "|" : ",";
  const [path, loomUrl, channel] = trimmed.split(separator).map((part) => part.trim());
  return { line: index + 1, path, loomUrl, channel: normalizeChannel(channel) };
}

function normalizeChannel(value) {
  return String(value || "").trim().toLowerCase().replace(/\s+/g, "-");
}

function runJson(commandArgs) {
  const output = execFileSync("node", commandArgs, {
    encoding: "utf8",
    stdio: ["ignore", "pipe", "pipe"]
  });
  return JSON.parse(output);
}

function sendPackageReady(path, loomUrl) {
  const packagePath = `${path}/send-package.md`;
  if (!existsSync(packagePath)) {
    return { ok: false, reason: "send package missing; run prospect:batch-send-prep first" };
  }
  const content = readFileSync(packagePath, "utf8");
  if (!content.includes(`- Loom: ${loomUrl}`)) {
    return { ok: false, reason: "send package Loom does not match the batch link" };
  }
  if (!/Readiness:\s*ready/.test(content)) {
    return { ok: false, reason: "send package is not ready" };
  }
  if (!/- Loom quality:\s*approved/.test(content)) {
    return { ok: false, reason: "send package is missing Loom quality approval" };
  }
  if (!content.includes("## Reply-Worthy Proof Gate") || !/Score:\s*(?:8|9|10)\/10/.test(content)) {
    return { ok: false, reason: "send package is missing an 8+/10 reply-worthy proof gate" };
  }
  return { ok: true, reason: "" };
}

if (fromClipboard) {
  let clipboard = "";
  try {
    clipboard = execFileSync("pbpaste", { encoding: "utf8" });
  } catch {
    console.error("Could not read the clipboard. Copy the sent-channel rows from prospects/outbox.html or paste them into prospects/loom-links.txt.");
    process.exit(1);
  }

  const usableLines = clipboard
    .split("\n")
    .map((line) => line.trim())
    .filter((line) => /^prospects\/.+[|,].+/.test(line));

  if (!usableLines.length) {
    console.error("Clipboard does not contain rows like prospects/prospect-slug|https://www.loom.com/share/...|contact-form");
    process.exit(1);
  }

  const outputDir = inputPath.split("/").slice(0, -1).join("/");
  if (outputDir) mkdirSync(outputDir, { recursive: true });
  writeFileSync(inputPath, `${usableLines.join("\n")}\n`);
}

if (!existsSync(inputPath)) {
  console.error(`Batch Loom link file not found: ${inputPath}`);
  process.exit(1);
}

const rows = readFileSync(inputPath, "utf8")
  .split("\n")
  .map(parseLine)
  .filter(Boolean);

if (!validChannels.has(defaultChannel)) {
  console.error("Channel must be one of: email, contact-form, dm, linkedin, x, phone, mixed, other");
  process.exit(1);
}

const completed = [];
const skipped = [];

for (const row of rows) {
  if (!row.path || !row.loomUrl) {
    skipped.push({ ...row, reason: "missing prospect path or Loom URL" });
    continue;
  }
  if (!isValidLoomUrl(row.loomUrl)) {
    skipped.push({ ...row, reason: loomUrlError() });
    continue;
  }
  if (!existsSync(row.path)) {
    skipped.push({ ...row, reason: "prospect folder not found" });
    continue;
  }
  try {
    assertOutboundProspectPath(row.path);
  } catch (error) {
    skipped.push({ ...row, reason: error.message });
    continue;
  }
  const rowChannel = row.channel || defaultChannel;
  if (!validChannels.has(rowChannel)) {
    skipped.push({ ...row, reason: "invalid send channel" });
    continue;
  }
  if (rowChannel === "email" && !channelGuidance.emailReady && !force) {
    skipped.push({ ...row, reason: `sender setup is not clean for email: ${channelGuidance.warnings.join("; ")}` });
    continue;
  }
  const packageCheck = sendPackageReady(row.path, row.loomUrl);
  if (!force && !packageCheck.ok) {
    skipped.push({ ...row, reason: packageCheck.reason });
    continue;
  }

  const result = dryRun
    ? { status: "dry-run", prospectPath: row.path, stage: "sent", nextFollowUpAt: "" }
    : runJson([
      "scripts/update-prospect-pipeline.mjs",
      row.path,
      "sent",
      "--date",
      date,
      ...(rowChannel ? ["--channel", rowChannel] : []),
      ...(force ? ["--force"] : []),
      "--note",
      `Sent Loom: ${row.loomUrl}${rowChannel ? ` via ${rowChannel}` : ""}`
    ]);

  completed.push({
    ...row,
    channel: rowChannel,
    stage: result.stage,
    nextFollowUpAt: result.nextFollowUpAt || ""
  });
}

const lines = [
  "# Batch Send Complete",
  "",
  `Date: ${date}`,
  `Mode: ${dryRun ? "dry-run" : "updated"}`,
  `Force: ${force ? "yes" : "no"}`,
  "",
  "Use this only after the messages were actually sent. By default, each prospect must already have a ready, Loom-approved send package with the same Loom URL. Use force only for explicit recovery.",
  "",
  "## Completed",
  ""
];

if (completed.length) {
  for (const item of completed) {
    lines.push(`- ${item.path}: ${dryRun ? "would mark sent" : "marked sent"}${item.channel ? ` via ${item.channel}` : ""}${item.nextFollowUpAt ? `; next follow-up ${item.nextFollowUpAt}` : ""}`);
  }
} else {
  lines.push("- none");
}

if (skipped.length) {
  lines.push("");
  lines.push("## Skipped");
  lines.push("");
  for (const item of skipped) {
    lines.push(`- Line ${item.line}: ${item.path || "(missing path)"} - ${item.reason}`);
  }
}

const reportDir = reportPath.split("/").slice(0, -1).join("/");
if (reportDir) mkdirSync(reportDir, { recursive: true });
writeFileSync(reportPath, `${lines.join("\n")}\n`);

const result = {
  status: skipped.length ? "partial" : "completed",
  mode: dryRun ? "dry-run" : "updated",
  inputPath,
  reportPath,
  completed: completed.length,
  skipped
};

console.log(JSON.stringify(result, null, 2));

if (strict && skipped.length) process.exit(1);
