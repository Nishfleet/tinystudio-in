#!/usr/bin/env node
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { execFileSync } from "node:child_process";
import { localIsoDate } from "./date-utils.mjs";
import { assertOutboundProspectPath, listOutboundProspectFolders } from "./lib/outbound-prospects.mjs";

const args = process.argv.slice(2);
const inputPath = args.find((arg) => !arg.startsWith("--")) || "prospects/lead-scores.txt";
const reportArg = args.find((arg) => arg.startsWith("--report="));
const reportPath = reportArg ? reportArg.split("=")[1] : "prospects/batch-score-report.md";
const fromClipboard = args.includes("--from-clipboard");
const dryRun = args.includes("--dry-run");
const validateTemplate = args.includes("--validate-template");
const strict = args.includes("--strict");

const allowedPriorities = new Set(["record", "research-more", "skip"]);

function listFolders(root) {
  return listOutboundProspectFolders(root);
}

function read(path) {
  return existsSync(path) ? readFileSync(path, "utf8") : "";
}

function json(path) {
  return existsSync(path) ? JSON.parse(readFileSync(path, "utf8")) : {};
}

function hasLeadScore(path) {
  const content = read(join(path, "lead-score.md"));
  return Boolean(content.trim()) && !/Score:\s*$/m.test(content) && !/Priority:\s*record \/ research-more \/ skip/m.test(content);
}

function templateProspects() {
  return listFolders("prospects")
    .map((path) => {
      const metadata = json(join(path, "metadata.json"));
      const pipeline = json(join(path, "pipeline.json"));
      return {
        path,
        name: metadata.name || path.split("/").at(-1),
        stage: pipeline.stage || "new",
        scored: hasLeadScore(path)
      };
    })
    .filter((prospect) => !["won", "lost", "paused"].includes(prospect.stage))
    .filter((prospect) => !prospect.scored)
    .slice(0, 10);
}

function createTemplate() {
  const lines = [
    "# Score prospects after reviewing the site.",
    "# Format: prospects/prospect-slug|14/16|record|short reason",
    "# Priority: record, research-more, or skip",
    ""
  ];

  for (const prospect of templateProspects()) {
    lines.push(`${prospect.path}|||`);
  }

  const dir = inputPath.split("/").slice(0, -1).join("/");
  if (dir) mkdirSync(dir, { recursive: true });
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
  const [path, score, priority, notes = ""] = trimmed.split("|").map((part) => part.trim());
  return { line: index + 1, path, score, priority, notes };
}

function parseScore(score) {
  const match = String(score).trim().match(/^(\d{1,2})\/16$/);
  if (!match) return { value: Number.NaN, normalized: "", reason: "score must use N/16 format" };

  const value = Number(match[1]);
  if (!Number.isInteger(value) || value < 0 || value > 16) {
    return { value: Number.NaN, normalized: "", reason: "score must be between 0/16 and 16/16" };
  }

  return { value, normalized: `${value}/16`, reason: "" };
}

function priorityFromScoreValue(value) {
  if (!Number.isFinite(value)) return "";
  if (value >= 12) return "record";
  if (value >= 9) return "research-more";
  return "skip";
}

function priorityBandLabel(value) {
  if (value >= 12) return "12-16 = record";
  if (value >= 9) return "9-11 = research-more";
  return "0-8 = skip";
}

function normalizedNotes(notes) {
  return String(notes || "").trim().replace(/\s+/g, " ");
}

function updateLeadScore(row) {
  const leadScorePath = join(row.path, "lead-score.md");
  const before = read(leadScorePath);
  if (!before) throw new Error("lead-score.md not found");

  let next = before
    .replace(/- Score:\s*.*$/m, `- Score: ${row.score}`)
    .replace(/- Priority:\s*.*$/m, `- Priority: ${row.priority}`);

  const noteBlock = `## Scoring Notes\n\n- Updated: ${localIsoDate()}\n- Reason: ${row.notes || "No note supplied."}\n`;
  if (/## Scoring Notes\n/.test(next)) {
    next = next.replace(/## Scoring Notes\n+[\s\S]*?(?=\n## |$)/, noteBlock.trim());
  } else {
    next = `${next.trim()}\n\n${noteBlock}`;
  }

  writeFileSync(leadScorePath, `${next.trim()}\n`);
}

function updateStage(row) {
  const action = row.priority === "skip" ? "paused" : "scored";
  execFileSync("node", [
    "scripts/update-prospect-pipeline.mjs",
    row.path,
    action,
    "--note",
    `Lead score ${row.score}; priority ${row.priority}${row.notes ? `; ${row.notes}` : ""}`
  ], {
    encoding: "utf8",
    stdio: ["ignore", "pipe", "pipe"]
  });
}

if (validateTemplate) {
  const prospects = templateProspects();
  console.log(JSON.stringify({
    status: prospects.length ? "pass" : "empty",
    count: prospects.length,
    paths: prospects.map((prospect) => prospect.path)
  }, null, 2));
  process.exit(prospects.length ? 0 : 1);
}

if (!existsSync(inputPath) && !fromClipboard) {
  createTemplate();
  process.exit(0);
}

if (fromClipboard) {
  let clipboard = "";
  try {
    clipboard = execFileSync("pbpaste", { encoding: "utf8" });
  } catch {
    console.error("Could not read the clipboard. Paste the scoring sheet into prospects/lead-scores.txt instead.");
    process.exit(1);
  }

  const usableLines = clipboard
    .split("\n")
    .map((line) => line.trim())
    .filter((line) => /^prospects\/.+\|.+\|(?:record|research-more|skip)\|/.test(line));

  if (!usableLines.length) {
    console.error("Clipboard does not contain scoring rows like prospects/prospect-slug|14/16|record|reason");
    process.exit(1);
  }

  const dir = inputPath.split("/").slice(0, -1).join("/");
  if (dir) mkdirSync(dir, { recursive: true });
  writeFileSync(inputPath, `${usableLines.join("\n")}\n`);
}

const rows = readFileSync(inputPath, "utf8")
  .split("\n")
  .map(parseLine)
  .filter(Boolean);

const scored = [];
const skipped = [];

for (const row of rows) {
  if (!row.path || !row.score) {
    skipped.push({ ...row, reason: "missing prospect path or score" });
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

  const parsedScore = parseScore(row.score);
  if (parsedScore.reason) {
    skipped.push({ ...row, reason: parsedScore.reason });
    continue;
  }

  const notes = normalizedNotes(row.notes);
  if (notes.length < 12) {
    skipped.push({ ...row, reason: "scoring reason must be at least 12 characters" });
    continue;
  }

  const recommendedPriority = priorityFromScoreValue(parsedScore.value);
  const priority = row.priority || recommendedPriority;
  if (!allowedPriorities.has(priority)) {
    skipped.push({ ...row, reason: "priority must be record, research-more, or skip" });
    continue;
  }
  if (priority !== recommendedPriority) {
    skipped.push({
      ...row,
      reason: `priority ${priority} does not match score band ${priorityBandLabel(parsedScore.value)}`
    });
    continue;
  }

  const normalized = { ...row, score: parsedScore.normalized, priority, notes };
  if (!dryRun) {
    try {
      updateLeadScore(normalized);
      updateStage(normalized);
    } catch (error) {
      skipped.push({ ...row, reason: error.message });
      continue;
    }
  }

  scored.push(normalized);
}

const lines = [
  "# Batch Score Report",
  "",
  `Generated: ${localIsoDate()}`,
  `Mode: ${dryRun ? "dry-run" : "updated"}`,
  "",
  "## Scored",
  ""
];

if (scored.length) {
  for (const item of scored) {
    lines.push(`- ${item.path}: ${item.score}, ${item.priority}${item.notes ? ` - ${item.notes}` : ""}`);
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

console.log(JSON.stringify({
  status: skipped.length ? "partial" : dryRun ? "dry-run" : "updated",
  inputPath,
  reportPath,
  scored: scored.length,
  skipped
}, null, 2));

if (strict && skipped.length) process.exit(1);
