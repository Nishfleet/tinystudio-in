#!/usr/bin/env node
import { existsSync, readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";

function listFolders(root) {
  if (!existsSync(root)) return [];
  return readdirSync(root, { withFileTypes: true })
    .filter((entry) => entry.isDirectory())
    .map((entry) => join(root, entry.name))
    .sort();
}

function read(path) {
  return existsSync(path) ? readFileSync(path, "utf8") : "";
}

function lineValue(content, pattern) {
  return content.match(pattern)?.[1]?.trim() || "";
}

function expectedPriority(score) {
  if (score >= 12) return "record";
  if (score >= 9) return "research-more";
  return "skip";
}

function isBlankTemplate(score, priority) {
  return !score && (!priority || priority === "record / research-more / skip");
}

const findings = [];
let filesScanned = 0;
let scored = 0;

for (const folder of listFolders("prospects")) {
  const leadScorePath = join(folder, "lead-score.md");
  const content = read(leadScorePath);
  if (!content) continue;
  filesScanned += 1;

  if (/5-8 minute Loom/i.test(content)) {
    findings.push({ file: leadScorePath, rule: "stale Loom duration" });
  }

  const score = lineValue(content, /^- Score:[ \t]*(.*)$/m);
  const priority = lineValue(content, /^- Priority:[ \t]*(.*)$/m);
  if (isBlankTemplate(score, priority)) continue;
  scored += 1;

  const scoreMatch = score.match(/^(\d{1,2})\/16$/);
  if (!scoreMatch) {
    findings.push({ file: leadScorePath, rule: "score must use N/16 format" });
    continue;
  }

  const scoreValue = Number(scoreMatch[1]);
  if (scoreValue < 0 || scoreValue > 16) {
    findings.push({ file: leadScorePath, rule: "score must be between 0/16 and 16/16" });
    continue;
  }

  const expected = expectedPriority(scoreValue);
  if (priority !== expected) {
    findings.push({ file: leadScorePath, rule: `priority must be ${expected} for ${score}` });
  }
}

const result = {
  status: findings.length ? "fail" : "pass",
  filesScanned,
  scored,
  findings
};

if (findings.length) {
  console.error(JSON.stringify(result, null, 2));
  process.exit(1);
}

console.log(JSON.stringify(result, null, 2));
