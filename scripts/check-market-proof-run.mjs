#!/usr/bin/env node
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { localIsoDate } from "./date-utils.mjs";
import { isValidLoomUrl, loomUrlError } from "./lib/loom-url.mjs";
import { sendChannelGuidance } from "./lib/send-channel-guidance.mjs";
import { classifyOutboundProspect } from "./lib/outbound-prospects.mjs";

const args = process.argv.slice(2);
const inputPath = args.find((arg) => !arg.startsWith("--")) || "prospects/loom-links.txt";
const outputArg = args.find((arg) => arg.startsWith("--output="));
const outputPath = outputArg ? outputArg.split("=").slice(1).join("=") : "runs/market-proof-run-check.md";
const limitArg = args.find((arg) => arg.startsWith("--limit="));
const limit = limitArg ? Number(limitArg.split("=").slice(1).join("=")) : 5;
const strict = args.includes("--strict");
const today = localIsoDate();
const channelGuidance = sendChannelGuidance();

function read(path) {
  return existsSync(path) ? readFileSync(path, "utf8") : "";
}

function json(path) {
  return existsSync(path) ? JSON.parse(readFileSync(path, "utf8")) : {};
}

function clean(value) {
  return String(value || "").replace(/\s+/g, " ").replace(/\|/g, "/").trim();
}

function normalizeApproval(value) {
  return clean(value).toLowerCase().replace(/\s+/g, "-");
}

function normalizeChannel(value) {
  return clean(value).toLowerCase().replace(/\s+/g, "-");
}

function isApproved(value) {
  return ["approved", "quality-approved", "loom-approved"].includes(normalizeApproval(value));
}

function parseLine(line, index) {
  const trimmed = line.trim();
  if (!trimmed || trimmed.startsWith("#")) return null;
  const separator = trimmed.includes("|") ? "|" : ",";
  const [path, loomUrl, approval, leakNote, impactNote, fixNote, askNote] = trimmed
    .split(separator)
    .map((part) => part.trim());
  return {
    line: index + 1,
    path,
    loomUrl,
    approval,
    notes: {
      fault: clean(leakNote),
      impact: clean(impactNote),
      fix: clean(fixNote),
      ask: clean(askNote)
    }
  };
}

function hasRequiredNotes(notes) {
  return ["fault", "impact", "fix", "ask"].every((key) => notes?.[key] && notes[key].length >= 8);
}

function rowCheck(row) {
  const reasons = [];
  if (!row.path || !row.loomUrl) reasons.push("missing prospect path or Loom URL");
  if (row.loomUrl && !isValidLoomUrl(row.loomUrl)) reasons.push(loomUrlError());
  if (row.path && !existsSync(row.path)) reasons.push("prospect folder not found");
  if (row.path && existsSync(row.path)) {
    const classification = classifyOutboundProspect(row.path);
    if (!classification.ok) reasons.push(`not an outbound prospect: ${classification.reason}`);
  }
  if (!isApproved(row.approval)) reasons.push("missing approved marker from the Loom quality gate");
  if (!hasRequiredNotes(row.notes)) reasons.push("missing fault, impact, fix, or ask notes");
  return { ok: reasons.length === 0, reasons };
}

function sendPackageCheck(row) {
  const packagePath = join(row.path, "send-package.md");
  const reasons = [];
  if (!existsSync(packagePath)) {
    return { ok: false, path: packagePath, reasons: ["send package missing; run prospect:batch-send-prep first"] };
  }
  const content = read(packagePath);
  if (!content.includes(`- Loom: ${row.loomUrl}`)) reasons.push("send package Loom does not match proof-run row");
  if (!/- Readiness:\s*ready/.test(content)) reasons.push("send package is not readiness-ready");
  if (!/- Loom quality:\s*approved/.test(content)) reasons.push("send package is missing Loom quality approval");
  if (!content.includes("## Recording Notes") || /- none captured; use the Loom and page notes only\./.test(content)) {
    reasons.push("send package is missing captured recording notes");
  }
  return { ok: reasons.length === 0, path: packagePath, reasons };
}

function recordingNotesCheck(row) {
  const notesPath = join(row.path, "recording-notes.md");
  if (!existsSync(notesPath)) return { ok: false, path: notesPath, reasons: ["recording-notes.md missing"] };
  const content = read(notesPath);
  const reasons = [];
  for (const phrase of ["Visible fault:", "Buyer impact:", "First fix:", "Clean ask:"]) {
    if (!content.includes(phrase)) reasons.push(`missing ${phrase}`);
  }
  return { ok: reasons.length === 0, path: notesPath, reasons };
}

function sentCheck(row) {
  const pipeline = json(join(row.path, "pipeline.json"));
  const reasons = [];
  const notes = Array.isArray(pipeline.notes) ? pipeline.notes : [];
  const touches = Array.isArray(pipeline.touches) ? pipeline.touches : [];
  const sentNote = notes.some((note) => note.action === "sent" && String(note.note || "").includes(row.loomUrl));
  const sentTouch = touches.find((touch) => touch.action === "sent" && String(touch.note || "").includes(row.loomUrl));
  const sentChannel = normalizeChannel(pipeline.sentChannel || pipeline.lastChannel || sentTouch?.channel || "");
  if (!pipeline.sentAt) reasons.push("pipeline sentAt is blank");
  if (!sentNote && !sentTouch) reasons.push("pipeline has no sent note or touch for this Loom");
  if (!pipeline.sentChannel && !pipeline.lastChannel) reasons.push("send channel is missing");
  if (sentChannel === "email" && !channelGuidance.emailReady) {
    reasons.push(`email send cannot count while sender setup is not clean: ${channelGuidance.warnings.join("; ")}`);
  }
  return { ok: reasons.length === 0, path: join(row.path, "pipeline.json"), reasons };
}

if (!Number.isFinite(limit) || limit < 1) {
  console.error("--limit must be a positive number.");
  process.exit(1);
}

if (!existsSync(inputPath)) {
  console.error(`Proof-run Loom sheet not found: ${inputPath}`);
  process.exit(1);
}

const rows = read(inputPath)
  .split("\n")
  .map(parseLine)
  .filter(Boolean);

const checked = rows.map((row) => {
  const rowStatus = rowCheck(row);
  const packageStatus = rowStatus.ok ? sendPackageCheck(row) : { ok: false, path: join(row.path || "", "send-package.md"), reasons: ["row is not ready"] };
  const notesStatus = rowStatus.ok ? recordingNotesCheck(row) : { ok: false, path: join(row.path || "", "recording-notes.md"), reasons: ["row is not ready"] };
  const sentStatus = packageStatus.ok ? sentCheck(row) : { ok: false, path: join(row.path || "", "pipeline.json"), reasons: ["send package is not ready"] };
  return {
    ...row,
    rowStatus,
    packageStatus,
    notesStatus,
    sentStatus
  };
});

const validRows = checked.filter((row) => row.rowStatus.ok);
const sendReadyRows = checked.filter((row) => row.rowStatus.ok && row.packageStatus.ok && row.notesStatus.ok);
const sentRows = checked.filter((row) => row.rowStatus.ok && row.packageStatus.ok && row.notesStatus.ok && row.sentStatus.ok);

const status = sentRows.length >= limit
  ? "sent-proof-captured"
  : sendReadyRows.length >= limit
    ? "ready-to-mark-sent"
    : validRows.length >= limit
      ? "ready-for-send-prep"
      : "needs-recording";

function nextCommand() {
  if (status === "sent-proof-captured") return "npm run market:parity";
  if (status === "ready-to-mark-sent") return "npm run prospect:outbox";
  if (status === "ready-for-send-prep") return "npm run prospect:batch-send-prep";
  return "npm run growth:start -- --view=record";
}

function rowStatusText(row) {
  if (row.sentStatus.ok) return "sent-proof-captured";
  if (row.packageStatus.ok && row.notesStatus.ok) return "ready-to-mark-sent";
  if (row.rowStatus.ok) return "ready-for-send-prep";
  return "needs-recording";
}

function reasons(row) {
  return [
    ...row.rowStatus.reasons,
    ...row.packageStatus.reasons,
    ...row.notesStatus.reasons,
    ...row.sentStatus.reasons
  ].filter((reason, index, list) => reason && list.indexOf(reason) === index);
}

const rowsMarkdown = checked.length
  ? checked.map((row) => `| ${row.line} | ${row.path || "-"} | ${row.loomUrl || "-"} | ${rowStatusText(row)} | ${reasons(row).join("; ") || "clean"} |`).join("\n")
  : "| - | - | - | needs-recording | No rows found. |";

const markdown = `# Market Proof Run Check

Generated: ${today}

## Verdict

${status}

## Counts

| Proof Step | Count | Required |
|---|---:|---:|
| Valid approved Loom rows | ${validRows.length} | ${limit} |
| Ready send packages with recording notes | ${sendReadyRows.length} | ${limit} |
| Actually sent proof rows | ${sentRows.length} | ${limit} |
| Recommended send channel | ${channelGuidance.recommendedChannel} | - |

## Next Command

\`\`\`bash
${nextCommand()}
\`\`\`

## Row Review

| Line | Prospect | Loom | Status | Missing |
|---:|---|---|---|---|
${rowsMarkdown}

## Rules

- A proof-run row is valid only with a real Loom URL, approved marker, and fault/impact/fix/ask notes.
- A send package counts only when it is readiness-ready, Loom-approved, and includes captured recording notes.
- Sent proof counts only after the outbox sent sheet or stage command records a real sent touch with channel and Loom URL.
- Email sent proof does not count while \`npm run send:setup\` still warns. Use contact forms, DMs, LinkedIn, X, phone, mixed, or other until sender trust is clean.
- This checker does not replace \`npm run market:parity\`; it only verifies the market-proof session loop.
`;

const outputDir = outputPath.split("/").slice(0, -1).join("/");
if (outputDir) mkdirSync(outputDir, { recursive: true });
writeFileSync(outputPath, markdown);

const result = {
  status,
  path: outputPath,
  inputPath,
  limit,
  rows: checked.length,
  validApprovedRows: validRows.length,
  readySendPackages: sendReadyRows.length,
  sentProofRows: sentRows.length,
  nextCommand: nextCommand(),
  recommendedChannel: channelGuidance.recommendedChannel,
  senderWarnings: channelGuidance.warnings
};

console.log(JSON.stringify(result, null, 2));

if (strict && status !== "sent-proof-captured") process.exit(1);
