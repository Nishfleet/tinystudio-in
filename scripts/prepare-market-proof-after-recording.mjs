#!/usr/bin/env node
import { execFileSync } from "node:child_process";
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { localIsoDate } from "./date-utils.mjs";

const args = process.argv.slice(2);

function argValue(name, fallback = "") {
  const match = args.find((arg) => arg.startsWith(`--${name}=`));
  return match ? match.split("=").slice(1).join("=") : fallback;
}

function firstPositional() {
  return args.find((arg) => !arg.startsWith("--")) || "";
}

const sheetPath = argValue("sheet") || firstPositional() || "prospects/loom-links.txt";
const inputPath = argValue("input");
const fromClipboard = args.includes("--from-clipboard");
const dryRun = args.includes("--dry-run");
const limit = Number(argValue("limit", "5"));
const reportPath = argValue("report", "runs/market-after-recording.md");
const recordingsReportPath = argValue("recordings-report", "runs/market-recordings-update.md");
const packagePath = argValue("package", "prospects/batch-send-package.md");
const outboxPath = argValue("outbox", "prospects/outbox.html");
const proofOutputPath = argValue("proof-output", "runs/market-proof-cockpit.md");
const proofHtmlPath = argValue("proof-html", "runs/market-proof-cockpit.html");
const checkOutputPath = argValue("check-output", "runs/market-proof-run-check.md");
const today = localIsoDate();

function write(path, content) {
  const dir = path.split("/").slice(0, -1).join("/");
  if (dir) mkdirSync(dir, { recursive: true });
  writeFileSync(path, content);
}

function read(path) {
  return existsSync(path) ? readFileSync(path, "utf8") : "";
}

function parseJsonOutput(output, commandArgs) {
  try {
    return JSON.parse(output);
  } catch {
    return {
      status: "command-output-unreadable",
      command: `node ${commandArgs.join(" ")}`,
      raw: String(output || "").trim()
    };
  }
}

function runJson(commandArgs, options = {}) {
  try {
    const output = execFileSync("node", commandArgs, {
      encoding: "utf8",
      stdio: ["ignore", "pipe", "pipe"]
    });
    return { ok: true, result: parseJsonOutput(output, commandArgs) };
  } catch (error) {
    if (!options.allowFailure) throw error;
    const output = error.stdout ? String(error.stdout) : "";
    const result = output
      ? parseJsonOutput(output, commandArgs)
      : {
          status: "command-failed",
          command: `node ${commandArgs.join(" ")}`,
          error: String(error.stderr || error.message).trim()
        };
    return { ok: false, result };
  }
}

function resultStatus(proofAfter, recordings, batchSend) {
  if (dryRun) return "dry-run";
  if ((recordings.skipped || []).length) return "partial-recording-update";
  if (proofAfter.status === "sent-proof-captured") return "sent-proof-captured";
  if (proofAfter.status === "ready-to-mark-sent") return "ready-to-send";
  if (proofAfter.status === "ready-for-send-prep") return batchSend ? "send-prep-attention-needed" : "send-prep-needed";
  if (proofAfter.status === "needs-recording") return "needs-recording";
  return "attention-needed";
}

function nextCommand(status, proofAfter) {
  if (status === "ready-to-send") return "npm run prospect:outbox";
  if (status === "sent-proof-captured") return "npm run market:parity";
  if (status === "dry-run") return "Run without --dry-run after recording real Looms.";
  if (status === "partial-recording-update") return "Fix skipped Loom rows, then rerun npm run market:after-recording -- --from-clipboard";
  if (status === "send-prep-needed" || status === "send-prep-attention-needed") return "npm run prospect:batch-send-prep";
  return proofAfter.nextCommand || "npm run growth:start -- --view=record";
}

function skippedRows(skipped) {
  if (!skipped || skipped.length === 0) return "| - | - | - | - |";
  return skipped
    .map((row) => `| ${row.line || row.inputLine || "-"} | ${row.target || row.prospect || "URL-only"} | ${row.loomUrl || "-"} | ${row.reason || "skipped"} |`)
    .join("\n");
}

if (!Number.isFinite(limit) || limit < 1) {
  console.error("--limit must be a positive number.");
  process.exit(1);
}

if (!fromClipboard && !inputPath) {
  console.error("Use --from-clipboard or --input=path with the recorded Loom URLs.");
  process.exit(1);
}

if (!existsSync(sheetPath)) {
  console.error(`Loom proof sheet not found: ${sheetPath}`);
  process.exit(1);
}

const updateArgs = [
  "scripts/update-market-proof-looms.mjs",
  sheetPath,
  `--report=${recordingsReportPath}`
];
if (fromClipboard) updateArgs.push("--from-clipboard");
if (inputPath) updateArgs.push(`--input=${inputPath}`);
if (dryRun) updateArgs.push("--dry-run");

const recordingsRun = runJson(updateArgs, { allowFailure: true });
const recordings = recordingsRun.result;

const checkArgs = [
  "scripts/check-market-proof-run.mjs",
  sheetPath,
  `--output=${checkOutputPath}`,
  `--limit=${limit}`
];
const proofBeforeRun = runJson(checkArgs, { allowFailure: true });
const proofBefore = proofBeforeRun.result;

let batchSend = null;
let batchSendRun = null;
if (!dryRun && proofBefore.status === "ready-for-send-prep") {
  batchSendRun = runJson([
    "scripts/prepare-prospect-batch-send.mjs",
    sheetPath,
    `--package=${packagePath}`,
    `--outbox=${outboxPath}`,
    "--require-approved",
    "--strict"
  ], { allowFailure: true });
  batchSend = batchSendRun.result;
}

let outbox = null;
if (!dryRun && batchSend && batchSend.prepared > 0) {
  outbox = runJson([
    "scripts/export-prospect-outbox.mjs",
    `--output=${outboxPath}`
  ], { allowFailure: true }).result;
}

const proofAfterRun = runJson(checkArgs, { allowFailure: true });
const proofAfter = proofAfterRun.result;

const cockpit = runJson([
  "scripts/export-market-proof-cockpit.mjs",
  sheetPath,
  `--output=${proofOutputPath}`,
  `--html=${proofHtmlPath}`,
  `--limit=${limit}`
], { allowFailure: true }).result;

const status = resultStatus(proofAfter, recordings, batchSend);
const next = nextCommand(status, proofAfter);
const recordingReport = read(recordingsReportPath);

const markdown = `# Market After Recording

Generated: ${today}

## Verdict

${status}

This command turns recorded Loom URLs into a proof-ready send queue. It does not mark anything sent, invent proof, approve claims, or move pipeline stages.

## Counts

| Step | Count / Status |
|---|---:|
| Loom rows updated | ${recordings.updated || 0} |
| Loom rows skipped | ${(recordings.skipped || []).length} |
| Proof status before send prep | ${proofBefore.status || "unknown"} |
| Send packages prepared | ${batchSend ? batchSend.prepared || 0 : dryRun ? "dry-run skipped" : "not run"} |
| Send prep skipped | ${batchSend ? (batchSend.skipped || []).length : 0} |
| Proof status after send prep | ${proofAfter.status || "unknown"} |

## Skipped Loom Rows

| Input Line | Target | Loom | Reason |
|---:|---|---|---|
${skippedRows(recordings.skipped)}

## Files Refreshed

- Recording update: \`${recordingsReportPath}\`
- Proof check: \`${checkOutputPath}\`
- Proof cockpit: \`${proofOutputPath}\`
- Proof cockpit HTML: \`${proofHtmlPath}\`
- Batch package: \`${packagePath}\`
- Outbox: \`${outboxPath}\`

## Next Command

\`\`\`bash
${next}
\`\`\`

## Operating Rule

- If this says \`ready-to-send\`, send only from \`prospects/outbox.html\`, choose the real channel used, copy the batch sent sheet, then run \`npm run prospect:batch-sent -- --from-clipboard\`.
- If this says \`needs-recording\` or \`partial-recording-update\`, record or fix the Loom rows before sending.
- The moat is tangible improvement proof: before, after, proof source, client-visible value, and next measurement. This command only prepares that proof for manual sending.

## Recording Updater Detail

${recordingReport ? recordingReport.replace(/^# Market Recordings Update\s*/i, "").trim() : "No recording updater detail found."}
`;

write(reportPath, markdown);

const result = {
  status,
  sheetPath,
  reportPath,
  recordingsReportPath,
  checkOutputPath,
  proofOutputPath,
  proofHtmlPath,
  packagePath,
  outboxPath,
  recordings,
  proofBefore,
  batchSend,
  outbox,
  proofAfter,
  cockpit,
  nextCommand: next
};

console.log(JSON.stringify(result, null, 2));

if (status === "partial-recording-update" || status === "send-prep-attention-needed" || status === "needs-recording") {
  process.exit(1);
}
