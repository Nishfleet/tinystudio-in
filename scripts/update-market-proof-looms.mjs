#!/usr/bin/env node
import { execFileSync } from "node:child_process";
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { localIsoDate } from "./date-utils.mjs";
import { isValidLoomUrl, loomUrlError } from "./lib/loom-url.mjs";

const args = process.argv.slice(2);
const sheetPath = args.find((arg) => !arg.startsWith("--")) || "prospects/loom-links.txt";
const inputArg = args.find((arg) => arg.startsWith("--input="));
const reportArg = args.find((arg) => arg.startsWith("--report="));
const fromClipboard = args.includes("--from-clipboard");
const dryRun = args.includes("--dry-run");
const inputPath = inputArg ? inputArg.split("=").slice(1).join("=") : null;
const reportPath = reportArg ? reportArg.split("=").slice(1).join("=") : "growth-brain/ops/market-recordings-update.md";

function read(path) {
  return existsSync(path) ? readFileSync(path, "utf8") : "";
}

function clean(value) {
  return String(value || "")
    .replace(/\s+/g, " ")
    .replace(/\|/g, "/")
    .trim();
}

function normalizePath(value) {
  const cleaned = clean(value).replace(/^["']|["']$/g, "");
  if (!cleaned) return "";
  return cleaned.startsWith("prospects/") ? cleaned : `prospects/${cleaned}`;
}

function slug(value) {
  return clean(value).split("/").filter(Boolean).at(-1) || "";
}

function extractLoomUrl(line) {
  const match = String(line || "").match(/https?:\/\/[^\s|,]+/i);
  return match ? match[0].trim() : "";
}

function parseSheetLine(line, index) {
  const trimmed = line.trim();
  if (!trimmed) return { type: "blank", raw: line };
  if (trimmed.startsWith("#")) return { type: "comment", raw: line };

  const separator = trimmed.includes("|") ? "|" : ",";
  const [path, loomUrl, approval, leakNote, impactNote, fixNote, askNote] = trimmed
    .split(separator)
    .map((part) => part.trim());

  return {
    type: "row",
    raw: line,
    line: index + 1,
    path: normalizePath(path),
    loomUrl: clean(loomUrl),
    approval: clean(approval) || "approved",
    notes: {
      leak: clean(leakNote),
      impact: clean(impactNote),
      fix: clean(fixNote),
      ask: clean(askNote)
    }
  };
}

function formatSheetLine(entry) {
  if (entry.type !== "row") return entry.raw;
  return [
    entry.path,
    entry.loomUrl,
    entry.approval || "approved",
    entry.notes.leak,
    entry.notes.impact,
    entry.notes.fix,
    entry.notes.ask
  ].map(clean).join("|");
}

function parseUpdateLine(line, index) {
  const trimmed = line.trim();
  if (!trimmed || trimmed.startsWith("#")) return null;
  const loomUrl = extractLoomUrl(trimmed);
  const reasons = [];
  if (!loomUrl) reasons.push("missing Loom URL");
  if (loomUrl && !isValidLoomUrl(loomUrl)) reasons.push(loomUrlError());

  const beforeUrl = loomUrl ? trimmed.slice(0, trimmed.indexOf(loomUrl)).trim() : trimmed;
  const separator = beforeUrl.includes("|") ? "|" : beforeUrl.includes(",") ? "," : null;
  const target = separator ? beforeUrl.split(separator)[0] : beforeUrl.replace(/[|,]+$/g, "").trim();

  return {
    line: index + 1,
    target: target && target !== loomUrl ? normalizePath(target) : "",
    targetSlug: target && target !== loomUrl ? slug(target) : "",
    loomUrl,
    reasons
  };
}

function findTargetRow(entries, update, alreadyUpdatedLines) {
  const rows = entries.filter((entry) => entry.type === "row");
  if (update.target) {
    return rows.find((row) => row.path === update.target && !alreadyUpdatedLines.has(row.line))
      || rows.find((row) => slug(row.path) === update.targetSlug && !alreadyUpdatedLines.has(row.line));
  }
  return rows.find((row) => !isValidLoomUrl(row.loomUrl) && !alreadyUpdatedLines.has(row.line));
}

function readInput() {
  if (fromClipboard) {
    try {
      return execFileSync("pbpaste", { encoding: "utf8" });
    } catch {
      console.error("Could not read the clipboard. Use --input=path instead.");
      process.exit(1);
    }
  }
  if (!inputPath) {
    console.error("Provide --from-clipboard or --input=path with Loom URLs.");
    process.exit(1);
  }
  if (!existsSync(inputPath)) {
    console.error(`Loom URL input file not found: ${inputPath}`);
    process.exit(1);
  }
  return read(inputPath);
}

if (!existsSync(sheetPath)) {
  console.error(`Market proof Loom sheet not found: ${sheetPath}`);
  process.exit(1);
}

const entries = read(sheetPath).split("\n").map(parseSheetLine);
const updateRows = readInput().split("\n").map(parseUpdateLine).filter(Boolean);

if (!updateRows.length) {
  console.error("No Loom URLs found. Paste one Loom URL per line, or rows like prospects/name|https://www.loom.com/share/...");
  process.exit(1);
}

const updated = [];
const skipped = [];
const updatedLines = new Set();

for (const update of updateRows) {
  if (update.reasons.length) {
    skipped.push({ ...update, reason: update.reasons.join("; ") });
    continue;
  }

  const row = findTargetRow(entries, update, updatedLines);
  if (!row) {
    skipped.push({
      ...update,
      reason: update.target
        ? "no matching prospect row found"
        : "no pending LOOM_URL row left for URL-only update"
    });
    continue;
  }

  const previous = row.loomUrl;
  row.loomUrl = update.loomUrl;
  updatedLines.add(row.line);
  updated.push({
    inputLine: update.line,
    sheetLine: row.line,
    prospect: row.path,
    previous,
    loomUrl: row.loomUrl,
    notesPreserved: ["leak", "impact", "fix", "ask"].every((key) => row.notes[key])
  });
}

const markdownRows = updated.length
  ? updated.map((row) => `| ${row.inputLine} | ${row.prospect} | ${row.loomUrl} | ${row.notesPreserved ? "yes" : "no"} |`).join("\n")
  : "| - | - | - | - |";

const skippedRows = skipped.length
  ? skipped.map((row) => `| ${row.line} | ${row.target || "URL-only"} | ${row.loomUrl || "-"} | ${row.reason} |`).join("\n")
  : "| - | - | - | - |";

const nextCommand = skipped.length
  ? "Fix skipped rows, then rerun npm run market:recordings -- --from-clipboard"
  : "npm run prospect:batch-send-prep";

const report = `# Market Recordings Update

Generated: ${localIsoDate()}

## Verdict

${dryRun ? "Dry run only. No files were changed." : updated.length ? "Recording URLs updated." : "No recording URLs updated."}

## Updated

| Input Line | Prospect | Loom | Existing Notes Preserved |
|---:|---|---|---|
${markdownRows}

## Skipped

| Input Line | Target | Loom | Reason |
|---:|---|---|---|
${skippedRows}

## Next Command

\`\`\`bash
${nextCommand}
\`\`\`

## Rules

- This command only updates real Loom URLs. It does not mark a send, create fake proof, or change pipeline stage.
- URL-only lines are assigned to the next pending \`LOOM_URL\` row in order.
- Rows like \`prospects/prospect-slug|https://www.loom.com/share/...\` update the named prospect and preserve existing leak, impact, fix, and ask notes.
`;

if (!dryRun && updated.length) {
  writeFileSync(sheetPath, `${entries.map(formatSheetLine).join("\n").replace(/\n+$/g, "")}\n`);
}

const reportDir = reportPath.split("/").slice(0, -1).join("/");
if (reportDir) mkdirSync(reportDir, { recursive: true });
writeFileSync(reportPath, report);

const result = {
  status: dryRun ? "dry-run" : skipped.length ? "partial" : "updated",
  sheetPath,
  reportPath,
  updated: updated.length,
  skipped,
  nextCommand
};

console.log(JSON.stringify(result, null, 2));

if (skipped.length) process.exit(1);
