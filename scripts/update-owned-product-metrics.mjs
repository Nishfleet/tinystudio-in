#!/usr/bin/env node
import { execFileSync } from "node:child_process";
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { localIsoDate } from "./date-utils.mjs";

const args = process.argv.slice(2);
const fromClipboard = args.includes("--from-clipboard");
const dryRun = args.includes("--dry-run");
const inputArg = args.find((arg) => arg.startsWith("--input="));
const reportArg = args.find((arg) => arg.startsWith("--report="));
const outputPath = reportArg ? reportArg.split("=").slice(1).join("=") : "growth-brain/ops/owned-product-metrics-update.md";
const clientPath = args.find((arg) => !arg.startsWith("--"));
const metricArg = args.find((arg) => arg.startsWith("--metric="));
const lastArg = args.find((arg) => arg.startsWith("--last="));
const currentArg = args.find((arg) => arg.startsWith("--current="));
const notesArg = args.find((arg) => arg.startsWith("--notes="));
const today = localIsoDate();

const knownClients = new Set([
  "clients/ai-converter",
  "clients/siterep",
  "clients/five-to-nine-0509"
]);

function read(path) {
  return existsSync(path) ? readFileSync(path, "utf8") : "";
}

function write(path, content) {
  const dir = path.split("/").slice(0, -1).join("/");
  if (dir) mkdirSync(dir, { recursive: true });
  writeFileSync(path, content);
}

function clean(value) {
  return String(value || "")
    .replace(/\s+/g, " ")
    .replace(/\|/g, "/")
    .trim();
}

function meaningful(value, minLength = 1) {
  const normalized = clean(value);
  return normalized.length >= minLength && !/^(todo|tbd|n\/a|none|placeholder|add|replace|-|\[.*\])$/i.test(normalized);
}

function splitArg(arg) {
  return arg ? clean(arg.split("=").slice(1).join("=")) : "";
}

function normalizeClientPath(value) {
  const cleaned = clean(value).replace(/^["']|["']$/g, "");
  if (!cleaned) return "";
  return cleaned.startsWith("clients/") ? cleaned : `clients/${cleaned}`;
}

function readInput() {
  if (fromClipboard) {
    try {
      return execFileSync("pbpaste", { encoding: "utf8" });
    } catch {
      console.error("Could not read the clipboard. Use --input=path or a single client metric command.");
      process.exit(1);
    }
  }
  if (inputArg) {
    const inputPath = inputArg.split("=").slice(1).join("=");
    if (!existsSync(inputPath)) {
      console.error(`Metric input file not found: ${inputPath}`);
      process.exit(1);
    }
    return read(inputPath);
  }
  return "";
}

function parseMetricLine(line, index) {
  const trimmed = line.trim();
  if (!trimmed || trimmed.startsWith("#")) return null;
  const separator = trimmed.includes("|") ? "|" : ",";
  const [client, metric, lastPeriod, thisPeriod, notes] = trimmed.split(separator).map(clean);
  return {
    line: index + 1,
    clientPath: normalizeClientPath(client),
    metric,
    lastPeriod,
    thisPeriod,
    notes
  };
}

function metricRowsFromMarkdown(markdown, heading, columns) {
  const escaped = heading.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const match = String(markdown || "").match(new RegExp(`## ${escaped}\\n+([\\s\\S]*?)(?:\\n## |$)`));
  const section = match ? match[1] : "";
  return section
    .split("\n")
    .map((line) => line.trim())
    .filter((line) => line.startsWith("|") && line.endsWith("|"))
    .map((line) => line.split("|").slice(1, -1).map((cell) => clean(cell)))
    .filter((cells) => cells.length >= columns)
    .filter((cells) => !cells.every((cell) => /^:?-+:?$/.test(cell)))
    .filter((cells) => cells[0] && !/^(Metric)$/i.test(cells[0]));
}

function defaultReportMetrics() {
  return [
    ["Sessions", "", "", ""],
    ["Conversion rate", "", "", ""],
    ["Revenue", "", "", ""],
    ["AOV", "", "", ""],
    ["Email revenue", "", "", ""],
    ["Ad spend", "", "", ""],
    ["CPA/CAC", "", "", ""]
  ];
}

function defaultAnalyticsMetrics() {
  return [
    ["Sessions", "", ""],
    ["Product page views", "", ""],
    ["Add to cart rate", "", ""],
    ["Checkout started", "", ""],
    ["Conversion rate", "", ""],
    ["Revenue", "", ""],
    ["AOV", "", ""]
  ];
}

function upsertReportMetric(markdown, row) {
  const existing = metricRowsFromMarkdown(markdown, "Numbers To Review", 4);
  const byMetric = new Map(defaultReportMetrics().map((cells) => [cells[0].toLowerCase(), cells]));
  for (const cells of existing) byMetric.set(cells[0].toLowerCase(), [cells[0], cells[1] || "", cells[2] || "", cells[3] || ""]);
  byMetric.set(row.metric.toLowerCase(), [row.metric, row.lastPeriod || "", row.thisPeriod || "", row.notes || ""]);
  const table = [
    "| Metric | Last Period | This Period | Notes |",
    "|---|---:|---:|---|",
    ...Array.from(byMetric.values()).map((cells) => `| ${cells[0]} | ${cells[1]} | ${cells[2]} | ${cells[3]} |`)
  ].join("\n");
  return replaceSection(markdown, "Numbers To Review", table);
}

function upsertAnalyticsMetric(markdown, row) {
  const existing = metricRowsFromMarkdown(markdown, "Funnel Metrics", 3);
  const byMetric = new Map(defaultAnalyticsMetrics().map((cells) => [cells[0].toLowerCase(), cells]));
  for (const cells of existing) byMetric.set(cells[0].toLowerCase(), [cells[0], cells[1] || "", cells[2] || ""]);
  byMetric.set(row.metric.toLowerCase(), [row.metric, row.thisPeriod || row.lastPeriod || "", row.notes || `Updated ${today}`]);
  const table = [
    "| Metric | Value | Notes |",
    "|---|---:|---|",
    ...Array.from(byMetric.values()).map((cells) => `| ${cells[0]} | ${cells[1]} | ${cells[2]} |`)
  ].join("\n");
  return replaceSection(markdown, "Funnel Metrics", table);
}

function replaceSection(markdown, heading, replacement) {
  const escaped = heading.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const pattern = new RegExp(`## ${escaped}\\n[\\s\\S]*?(?=\\n## |$)`);
  if (pattern.test(markdown)) {
    return markdown.replace(pattern, `## ${heading}\n\n${replacement.trim()}`);
  }
  return `${String(markdown || "").trimEnd()}\n\n## ${heading}\n\n${replacement.trim()}\n`;
}

function collectRows() {
  if (fromClipboard || inputArg) {
    return readInput().split("\n").map(parseMetricLine).filter(Boolean);
  }
  const row = {
    line: 1,
    clientPath: normalizeClientPath(clientPath),
    metric: splitArg(metricArg),
    lastPeriod: splitArg(lastArg),
    thisPeriod: splitArg(currentArg),
    notes: splitArg(notesArg)
  };
  return [row];
}

const rows = collectRows();
const updated = [];
const skipped = [];

for (const row of rows) {
  const reasons = [];
  if (!row.clientPath) reasons.push("missing client path");
  if (row.clientPath && !knownClients.has(row.clientPath)) reasons.push("client is not one of the owned-product proof folders");
  if (row.clientPath && !existsSync(row.clientPath)) reasons.push("client folder not found");
  if (!meaningful(row.metric, 2)) reasons.push("missing metric name");
  if (!meaningful(row.thisPeriod, 1)) reasons.push("missing current metric value");

  if (reasons.length) {
    skipped.push({ ...row, reason: reasons.join("; ") });
    continue;
  }

  const reportPath = join(row.clientPath, "reports/week-1-report.md");
  const analyticsPath = join(row.clientPath, "brain/analytics.md");
  const report = read(reportPath);
  const analytics = read(analyticsPath);
  if (!report) {
    skipped.push({ ...row, reason: `missing ${reportPath}` });
    continue;
  }
  if (!analytics) {
    skipped.push({ ...row, reason: `missing ${analyticsPath}` });
    continue;
  }

  if (!dryRun) {
    write(reportPath, upsertReportMetric(report, row));
    write(analyticsPath, upsertAnalyticsMetric(analytics, row));
    execFileSync("node", ["scripts/export-client-facing-dashboard.mjs", row.clientPath], {
      encoding: "utf8",
      stdio: ["ignore", "pipe", "pipe"]
    });
  }

  updated.push(row);
}

if (updated.length && !dryRun) {
  execFileSync("node", ["scripts/export-owned-product-case-studies.mjs"], {
    encoding: "utf8",
    stdio: ["ignore", "pipe", "pipe"]
  });
  execFileSync("node", ["scripts/export-internal-dashboard.mjs"], {
    encoding: "utf8",
    stdio: ["ignore", "pipe", "pipe"]
  });
}

const updatedRows = updated.length
  ? updated.map((row) => `| ${row.clientPath} | ${row.metric} | ${row.lastPeriod || "not recorded"} | ${row.thisPeriod} | ${row.notes || ""} |`).join("\n")
  : "| - | - | - | - | - |";

const skippedRows = skipped.length
  ? skipped.map((row) => `| ${row.line} | ${row.clientPath || "-"} | ${row.metric || "-"} | ${row.thisPeriod || "-"} | ${row.reason} |`).join("\n")
  : "| - | - | - | - | - |";

const nextCommand = skipped.length
  ? "Fix skipped metric rows, then rerun `npm run owned:metrics -- --from-clipboard`."
  : "Run `npm run owned:case-studies` and use only packets that show case-study-ready.";

const report = `# Owned Product Metrics Update

Generated: ${today}

## Verdict

${dryRun ? "Dry run only. No files were changed." : updated.length ? "Owned product metrics updated." : "No owned product metrics updated."}

## Updated

| Client | Metric | Last Period | This Period | Notes |
|---|---|---:|---:|---|
${updatedRows}

## Skipped

| Input Line | Client | Metric | Current Value | Reason |
|---:|---|---|---:|---|
${skippedRows}

## Next

${nextCommand}

## Clipboard Format

\`\`\`text
clients/ai-converter|Upload starts|0|12|First read after accounting wedge
clients/siterep|Widget installs|0|3|First read after source-backed positioning
clients/five-to-nine-0509|Fresh monitoring runs|0|5|First read after proof-loop positioning
\`\`\`

## Rule

Only use real observed numbers. If the value is unknown, leave the packet as \`needs-current-metric\`.
`;

write(outputPath, report);

console.log(JSON.stringify({
  status: skipped.length ? "attention-needed" : updated.length ? "updated" : "no-updates",
  path: outputPath,
  updated: updated.length,
  skipped: skipped.length,
  dryRun
}, null, 2));

if (skipped.length && !dryRun) process.exit(1);
