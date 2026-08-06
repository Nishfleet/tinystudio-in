#!/usr/bin/env node
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { execFileSync } from "node:child_process";
import { localIsoDate } from "./date-utils.mjs";
import { checkProspectReadiness, prospectWarningWeight } from "./lib/prospect-readiness.mjs";
import { isValidLoomUrl, loomUrlError } from "./lib/loom-url.mjs";
import { canonicalProspectAsk } from "./lib/canonical-service-copy.mjs";
import { assertOutboundProspectPath, listOutboundProspectFolders } from "./lib/outbound-prospects.mjs";

const args = process.argv.slice(2);
const inputPath = args.find((arg) => !arg.startsWith("--")) || "prospects/loom-links.txt";
const packageArg = args.find((arg) => arg.startsWith("--package="));
const packagePath = packageArg ? packageArg.split("=")[1] : "prospects/batch-send-package.md";
const outboxArg = args.find((arg) => arg.startsWith("--outbox="));
const outboxPath = outboxArg ? outboxArg.split("=")[1] : "prospects/outbox.html";
const fromClipboard = args.includes("--from-clipboard");
const strict = args.includes("--strict");
const requireApproved = args.includes("--require-approved") || fromClipboard;

function listFolders(root) {
  return listOutboundProspectFolders(root);
}

function json(path) {
  return existsSync(path) ? JSON.parse(readFileSync(path, "utf8")) : {};
}

function runJson(commandArgs) {
  const output = execFileSync("node", commandArgs, {
    encoding: "utf8",
    stdio: ["ignore", "pipe", "pipe"]
  });
  return JSON.parse(output);
}

function templateProspects() {
  return listFolders("prospects")
    .map((path) => {
      const metadata = json(join(path, "metadata.json"));
      const pipeline = json(join(path, "pipeline.json"));
      const result = checkProspectReadiness(path);
      return {
        path,
        name: metadata.name || path.split("/").at(-1),
        stage: pipeline.stage || "new",
        weight: prospectWarningWeight(result.warnings || [])
      };
    })
    .filter((prospect) => !["won", "lost", "paused"].includes(prospect.stage))
    .sort((a, b) => a.weight - b.weight || a.name.localeCompare(b.name))
    .slice(0, 5);
}

function createTemplate() {
  const lines = [
    "# Paste Loom links after batch recording.",
    "# Format: prospects/prospect-slug|https://www.loom.com/share/...|approved|fault note|impact note|fix note|ask note",
    ""
  ];
  for (const prospect of templateProspects()) {
    lines.push(`${prospect.path}|`);
  }
  const outputDir = inputPath.split("/").slice(0, -1).join("/");
  if (outputDir) mkdirSync(outputDir, { recursive: true });
  writeFileSync(inputPath, `${lines.join("\n")}\n`);
  console.log(JSON.stringify({
    status: "template-created",
    path: inputPath,
    count: lines.filter((line) => line.startsWith("prospects/")).length
  }, null, 2));
}

function parseLine(line, index) {
  const trimmed = line.trim();
  if (!trimmed || trimmed.startsWith("#")) return null;
  const separator = trimmed.includes("|") ? "|" : ",";
  const [path, loomUrl, approval, leakNote, impactNote, fixNote, askNote] = trimmed.split(separator).map((part) => part.trim());
  return {
    line: index + 1,
    path,
    loomUrl,
    approval: normalizeApproval(approval),
    notes: {
      fault: cleanNote(leakNote),
      impact: cleanNote(impactNote),
      fix: cleanNote(fixNote),
      ask: canonicalProspectAsk()
    }
  };
}

function normalizeApproval(value) {
  return String(value || "").trim().toLowerCase().replace(/\s+/g, "-");
}

function cleanNote(value) {
  return String(value || "")
    .replace(/\s+/g, " ")
    .replace(/\|/g, "/")
    .trim();
}

function isApproved(value) {
  return ["approved", "quality-approved", "loom-approved"].includes(normalizeApproval(value));
}

function hasRequiredNotes(notes) {
  return ["fault", "impact", "fix", "ask"].every((key) => notes?.[key] && notes[key].length >= 8);
}

function writeRecordingNotes(row) {
  const content = `# Recording Notes

Generated: ${localIsoDate()}

## Source

- Prospect: ${row.path}
- Loom: ${row.loomUrl}
- Approval: ${row.approval}

## Quality Notes

- Visible fault: ${row.notes.fault}
- Buyer impact: ${row.notes.impact}
- First fix: ${row.notes.fix}
- Clean ask: ${row.notes.ask}

## Rule

Use these notes as the truth from the recorded Loom. Do not invent stronger claims in the send package.
`;
  writeFileSync(join(row.path, "recording-notes.md"), content);
}

if (fromClipboard) {
  let clipboard = "";
  try {
    clipboard = execFileSync("pbpaste", { encoding: "utf8" });
  } catch {
    console.error("Could not read the clipboard. Paste the Loom links into prospects/loom-links.txt instead.");
    process.exit(1);
  }

  const usableLines = clipboard
    .split("\n")
    .map((line) => line.trim())
    .filter((line) => /^prospects\/.+[|,].+/.test(line));

  if (!usableLines.length) {
    console.error("Clipboard does not contain approved Loom rows like prospects/prospect-slug|https://www.loom.com/share/...|approved");
    process.exit(1);
  }

  const outputDir = inputPath.split("/").slice(0, -1).join("/");
  if (outputDir) mkdirSync(outputDir, { recursive: true });
  writeFileSync(inputPath, `${usableLines.join("\n")}\n`);
}

if (!existsSync(inputPath)) {
  createTemplate();
  process.exit(0);
}

const rows = readFileSync(inputPath, "utf8")
  .split("\n")
  .map(parseLine)
  .filter(Boolean);

if (rows.length === 0) {
  console.error(`No Loom links found in ${inputPath}`);
  process.exit(1);
}

const prepared = [];
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
  if (requireApproved && !isApproved(row.approval)) {
    skipped.push({ ...row, reason: "missing Loom quality approval; copy the approved Loom sheet from the teleprompter or mission page" });
    continue;
  }
  if (requireApproved && !hasRequiredNotes(row.notes)) {
    skipped.push({ ...row, reason: "missing recording notes; approved rows need fault, impact, fix, and ask notes" });
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
  if (hasRequiredNotes(row.notes)) writeRecordingNotes(row);
  const result = runJson(["scripts/prepare-prospect-send.mjs", row.path, row.loomUrl, "--approved"]);
  prepared.push(result);
}

const packageLines = [
  "# Batch Send Package",
  "",
  `Generated: ${localIsoDate()}`,
  "",
  "## Prepared",
  ""
];

for (const item of prepared) {
  packageLines.push(`### ${item.prospectPath}`);
  packageLines.push("");
  packageLines.push(`- Status: ${item.status}`);
  packageLines.push(`- Loom: ${item.loomUrl}`);
  packageLines.push(`- Send package: ${item.files.sendPackage}`);
  packageLines.push(`- Warnings: ${item.warnings.length ? item.warnings.join("; ") : "none"}`);
  packageLines.push("");
}

if (prepared.length) {
  const outbox = runJson([
    "scripts/export-prospect-outbox.mjs",
    `--output=${outboxPath}`
  ]);

  packageLines.push("## After Every Message Is Sent");
  packageLines.push("");
  packageLines.push(`Open \`${outbox.path}\`, check only messages actually sent, choose the channel used for each prospect, copy the batch sent sheet, then run the clipboard command.`);
  packageLines.push("");
  packageLines.push("Do not reuse the approved Loom-link sheet as the sent sheet. The outbox sent sheet is the source of truth after actual sends.");
  packageLines.push("");
  packageLines.push("```bash");
  packageLines.push("npm run prospect:batch-sent -- --from-clipboard");
  packageLines.push("```");
  packageLines.push("");
}

if (skipped.length) {
  packageLines.push("## Skipped");
  packageLines.push("");
  for (const item of skipped) {
    packageLines.push(`- Line ${item.line}: ${item.path || "(missing path)"} - ${item.reason}`);
  }
  packageLines.push("");
}

writeFileSync(packagePath, `${packageLines.join("\n")}\n`);

const result = {
  status: skipped.length ? "partial" : "prepared",
  inputPath,
  packagePath,
  outboxPath: prepared.length ? outboxPath : null,
  prepared: prepared.length,
  skipped
};

console.log(JSON.stringify(result, null, 2));

if (strict && (skipped.length || prepared.some((item) => item.status !== "ready"))) process.exit(1);
