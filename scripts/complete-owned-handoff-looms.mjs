#!/usr/bin/env node
import { execFileSync } from "node:child_process";
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { localIsoDate } from "./date-utils.mjs";
import { isValidLoomUrl, loomUrlError } from "./lib/loom-url.mjs";

const args = process.argv.slice(2);
const fromClipboard = args.includes("--from-clipboard");
const dryRun = args.includes("--dry-run");
const inputArg = args.find((arg) => arg.startsWith("--input="));
const reportArg = args.find((arg) => arg.startsWith("--report="));
const reviewerArg = args.find((arg) => arg.startsWith("--reviewer="));
const dateArg = args.find((arg) => arg.startsWith("--date="));
const clientsArg = args.find((arg) => arg.startsWith("--clients="));
const reportPath = reportArg ? reportArg.split("=").slice(1).join("=") : "growth-brain/ops/owned-handoff-completion.md";
const reviewer = reviewerArg ? reviewerArg.split("=").slice(1).join("=").trim() : "";
const today = dateArg ? dateArg.split("=").slice(1).join("=") : localIsoDate();

const defaultClients = [
  "clients/ai-converter",
  "clients/siterep",
  "clients/five-to-nine-0509"
];

const clients = clientsArg
  ? clientsArg.split("=").slice(1).join("=").split(",").map((value) => normalizeClientPath(value)).filter(Boolean)
  : defaultClients;

function read(path) {
  return existsSync(path) ? readFileSync(path, "utf8") : "";
}

function write(path, content) {
  const dir = path.split("/").slice(0, -1).join("/");
  if (dir) mkdirSync(dir, { recursive: true });
  writeFileSync(path, content);
}

function runJson(commandArgs, options = {}) {
  try {
    const output = execFileSync("node", commandArgs, {
      encoding: "utf8",
      stdio: ["ignore", "pipe", "pipe"]
    });
    return { ok: true, result: JSON.parse(output) };
  } catch (error) {
    if (!options.allowFailure) throw error;
    return {
      ok: false,
      result: {
        status: "command-failed",
        error: String(error.stderr || error.message).trim()
      }
    };
  }
}

function clean(value) {
  return String(value || "")
    .replace(/\s+/g, " ")
    .replace(/\|/g, "/")
    .trim();
}

function slug(value) {
  return clean(value).replace(/^clients\//, "").split("/").filter(Boolean).at(-1) || "";
}

function normalizeClientPath(value) {
  const cleaned = clean(value).replace(/^["']|["']$/g, "");
  if (!cleaned) return "";
  return cleaned.startsWith("clients/") ? cleaned : `clients/${cleaned}`;
}

function extractLoomUrl(line) {
  const match = String(line || "").match(/https?:\/\/[^\s|,]+/i);
  return match ? match[0].trim() : "";
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
  if (!inputArg) {
    console.error("Provide --from-clipboard or --input=path with handoff Loom rows.");
    process.exit(1);
  }
  const inputPath = inputArg.split("=").slice(1).join("=");
  if (!existsSync(inputPath)) {
    console.error(`Handoff Loom input file not found: ${inputPath}`);
    process.exit(1);
  }
  return read(inputPath);
}

function parseUpdateLine(line, index) {
  const trimmed = line.trim();
  if (!trimmed || trimmed.startsWith("#")) return null;

  const loomUrl = extractLoomUrl(trimmed);
  const beforeUrl = loomUrl ? trimmed.slice(0, trimmed.indexOf(loomUrl)).trim() : trimmed;
  const separator = beforeUrl.includes("|") ? "|" : beforeUrl.includes(",") ? "," : null;
  const target = separator ? beforeUrl.split(separator)[0] : beforeUrl.replace(/[|,]+$/g, "").trim();
  const reasons = [];
  if (!loomUrl) reasons.push("missing Loom URL");
  if (loomUrl && !isValidLoomUrl(loomUrl)) reasons.push(loomUrlError());

  return {
    line: index + 1,
    raw: line,
    clientPath: target && target !== loomUrl ? normalizeClientPath(target) : "",
    clientSlug: target && target !== loomUrl ? slug(target) : "",
    loomUrl,
    reasons
  };
}

function findTargetClient(update, alreadyUsed) {
  if (update.clientPath) {
    return clients.find((clientPath) => clientPath === update.clientPath && !alreadyUsed.has(clientPath))
      || clients.find((clientPath) => slug(clientPath) === update.clientSlug && !alreadyUsed.has(clientPath));
  }
  return clients.find((clientPath) => !alreadyUsed.has(clientPath));
}

function resultStatus(updated, skipped, remaining) {
  if (dryRun && skipped.length === 0) return updated.length ? "dry-run-ready" : "dry-run-no-updates";
  if (skipped.length) return updated.length ? "partial-attention-needed" : "attention-needed";
  if (updated.length === clients.length && remaining.length === 0) return "handoff-acceptance-complete";
  if (updated.length) return "handoff-progress-saved";
  return "no-updates";
}

function table(rows, emptyRow) {
  return rows.length ? rows.join("\n") : emptyRow;
}

if (!reviewer && !dryRun) {
  console.error("Owned handoff completion requires --reviewer=\"Name\".");
  process.exit(1);
}

const inputRows = readInput().split("\n").map(parseUpdateLine).filter(Boolean);
if (!inputRows.length) {
  console.error("No handoff Loom rows found. Paste rows like clients/ai-converter|https://www.loom.com/share/...");
  process.exit(1);
}

const usedClients = new Set();
const updated = [];
const skipped = [];

for (const update of inputRows) {
  if (update.reasons.length) {
    skipped.push({ ...update, reason: update.reasons.join("; ") });
    continue;
  }

  const clientPath = findTargetClient(update, usedClients);
  if (!clientPath) {
    skipped.push({
      ...update,
      reason: update.clientPath ? "no matching owned client row found" : "no remaining owned client row for URL-only update"
    });
    continue;
  }
  usedClients.add(clientPath);

  if (!existsSync(clientPath)) {
    skipped.push({ ...update, clientPath, reason: `client folder not found: ${clientPath}` });
    continue;
  }

  const dryRunCheck = runJson(["scripts/review-client-acceptance.mjs", clientPath, "--dry-run"], { allowFailure: true });
  if (!dryRunCheck.ok || dryRunCheck.result.status !== "ready-to-complete") {
    skipped.push({
      ...update,
      clientPath,
      reason: `acceptance not ready: ${(dryRunCheck.result.blockers || []).join("; ") || dryRunCheck.result.error || dryRunCheck.result.status}`
    });
    continue;
  }

  if (dryRun) {
    updated.push({ inputLine: update.line, clientPath, loomUrl: update.loomUrl, status: "would-update" });
    continue;
  }

  const completion = runJson([
    "scripts/review-client-acceptance.mjs",
    clientPath,
    `--handoff-loom=${update.loomUrl}`,
    `--reviewer=${reviewer}`,
    `--date=${today}`
  ], { allowFailure: true });

  if (!completion.ok || completion.result.status !== "updated") {
    skipped.push({
      ...update,
      clientPath,
      reason: `acceptance update failed: ${completion.result.error || completion.result.status}`
    });
    continue;
  }

  updated.push({
    inputLine: update.line,
    clientPath,
    loomUrl: update.loomUrl,
    status: completion.result.readiness?.status || "updated"
  });
}

if (!dryRun && updated.length) {
  for (const commandArgs of [
    ["scripts/export-owned-handoff-loom-cockpit.mjs"],
    ["scripts/export-retention-checkups.mjs"],
    ["scripts/export-value-retention-stress-test.mjs"]
  ]) {
    runJson(commandArgs, { allowFailure: true });
  }
}

const remaining = clients.filter((clientPath) => {
  const readiness = runJson(["scripts/check-client-readiness.mjs", clientPath], { allowFailure: true });
  return readiness.result.status !== "ready";
});
const status = resultStatus(updated, skipped, remaining);
const updatedRows = updated.map((row) => `| ${row.inputLine} | ${row.clientPath} | ${row.loomUrl} | ${row.status} |`);
const skippedRows = skipped.map((row) => `| ${row.line} | ${row.clientPath || row.clientSlug || "URL-only"} | ${row.loomUrl || "-"} | ${row.reason} |`);
const remainingRows = remaining.map((clientPath) => `| ${clientPath} | \`npm run owned:handoff\` |`);
const nextCommand = skipped.length
  ? "Fix skipped rows, then rerun npm run owned:handoff-complete -- --from-clipboard --reviewer=\"Nish\""
  : remaining.length
    ? "npm run owned:handoff"
    : "npm run market:parity";

const report = `# Owned Handoff Completion

Generated: ${today}

## Verdict

${status}

This command only completes owned-startup sprint acceptance after a real Loom URL and reviewer are provided. It does not create market proof, paid-client proof, external replies, or revenue claims.

## Updated

| Input Line | Client | Loom | Result |
|---:|---|---|---|
${table(updatedRows, "| - | - | - | - |")}

## Skipped

| Input Line | Target | Loom | Reason |
|---:|---|---|---|
${table(skippedRows, "| - | - | - | - |")}

## Still Not Ready

| Client | Next |
|---|---|
${table(remainingRows, "| - | - |")}

## Next Command

\`\`\`bash
${nextCommand}
\`\`\`

## Rules

- Real Loom share/embed URLs are required.
- A reviewer is required before any checklist is marked complete.
- URL-only rows are assigned to the owned clients in cockpit order.
- Owned-startup handoff proof is delivery-discipline proof, not external market proof.
`;

write(reportPath, report);

const result = {
  status,
  reportPath,
  reviewer: dryRun ? reviewer || "(dry run reviewer not required)" : reviewer,
  updated,
  skipped,
  remaining,
  nextCommand
};

console.log(JSON.stringify(result, null, 2));

if (skipped.length || status === "attention-needed" || status === "no-updates") {
  process.exit(1);
}
