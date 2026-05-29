#!/usr/bin/env node
import { existsSync, readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";

const roots = ["prospects", "clients", "growth-brain/sales", "growth-brain/offer.md"];
const allowedGuardrail = /\b(do not|does not|not promise|not guarantee|no\.|without|guardrail|not included|no pressure)\b/i;
const fileAllowlist = new Set([
  "growth-brain/sales/objection-handling.md",
  "growth-brain/sales/pricing-rules.md",
  "growth-brain/sales/sales-call-script.md",
  "growth-brain/sales/send-checklist.md"
]);

const patterns = [
  { name: "specific multiplier", pattern: /\b(?:5x|10x)\b/i, allowGuardrail: false },
  { name: "guarantee", pattern: /\bguarantee(?:d|s)?\b/i, allowGuardrail: true },
  { name: "risk free", pattern: /\brisk[- ]free\b/i, allowGuardrail: true },
  { name: "specific revenue promise", pattern: /increase revenue by/i, allowGuardrail: false },
  { name: "guaranteed ROAS", pattern: /guaranteed ROAS/i, allowGuardrail: false },
  { name: "rank number one", pattern: /rank #1/i, allowGuardrail: false },
  { name: "conversion lift promise", pattern: /conversion lift/i, allowGuardrail: true },
  { name: "sales volume promise", pattern: /sales volume/i, allowGuardrail: true }
];

const outboundNames = new Set([
  "buyer-room.md",
  "outreach.md",
  "loom-package.md",
  "recording-script.md",
  "next-message.md",
  "send-package.md",
  "reply-package.md",
  "call-booked-package.md",
  "sales-call-prep.md",
  "close-package.md",
  "kickoff-message.md",
  "delivery.md",
  "implementation-handoff.md",
  "week-1-report.md",
  "one-page-offer.md",
  "managed-it-one-page-offer.md",
  "managed-it-one-page-offer.html",
  "proposal-template.md",
  "buyer-room-template.md",
  "follow-up-sequences.md"
]);

function walk(path) {
  if (!existsSync(path)) return [];
  const statEntries = readdirSync(path, { withFileTypes: true });
  const files = [];
  for (const entry of statEntries) {
    const child = join(path, entry.name);
    if (entry.isDirectory()) files.push(...walk(child));
    if (entry.isFile()) files.push(child);
  }
  return files;
}

function filesToScan() {
  const files = [];
  for (const root of roots) {
    if (!existsSync(root)) continue;
    if (root.endsWith(".md")) {
      files.push(root);
      continue;
    }
    files.push(...walk(root));
  }
  return files
    .filter((file) => /\.(md|html)$/.test(file))
    .filter((file) => fileAllowlist.has(file) || outboundNames.has(file.split("/").at(-1)));
}

const findings = [];

for (const file of filesToScan()) {
  if (fileAllowlist.has(file)) continue;
  const lines = readFileSync(file, "utf8").split("\n");
  lines.forEach((line, index) => {
    for (const rule of patterns) {
      if (!rule.pattern.test(line)) continue;
      if (rule.allowGuardrail && allowedGuardrail.test(line)) continue;
      findings.push({
        file,
        line: index + 1,
        rule: rule.name,
        text: line.trim()
      });
    }
  });
}

if (findings.length) {
  console.error(JSON.stringify({ status: "fail", findings }, null, 2));
  process.exit(1);
}

console.log(JSON.stringify({
  status: "pass",
  filesScanned: filesToScan().filter((file) => !fileAllowlist.has(file)).length
}, null, 2));
