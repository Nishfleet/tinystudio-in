#!/usr/bin/env node
import { existsSync, readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { isServiceApplicationFolder } from "./lib/outbound-prospects.mjs";
import { codeRoot, serviceRoot } from "./lib/runtime-roots.mjs";
import { agentWorkClaimRiskFlags } from "./lib/service-artifacts.mjs";

const prospectRoot = join(serviceRoot, "prospects");
const roots = [prospectRoot, join(serviceRoot, "clients"), join(codeRoot, "growth-brain/sales"), join(codeRoot, "growth-brain/offer.md")];
const allowedGuardrail = /\b(do not|does not|not promise|not guarantee|no [^.!?;\n]{0,160}guarantees?|without|guardrail|not included|no pressure)\b/i;
const guaranteeGuardrail = /\b(?:(?:do(?:es)? not|not (?:a |an )?)(?:promise|guarantee)|not guaranteed|neither [^,:.!?;\n]{1,80}\bnor\b[^,:.!?;\n]{1,80}\b(?:is|are|was|were)\s+guaranteed|no (?:(?:[\w-]+(?:,\s*(?:(?:and|or)\s+)?|\s+(?:and|or)\s+))*[\w-]+\s+)?guarantees?|without (?:any )?(?:outcomes?\s+)?guarantees?)\b/gi;
const genericGuarantee = /\bguarantee(?:d|s)?\b/i;
const clauseBoundary = /[:.!?;]|\b(?:and|but|however|yet|although|though|while|whereas|still|nevertheless|nonetheless)\b/i;
const allowlistNames = new Set([
  "objection-handling.md",
  "pricing-rules.md",
  "sales-call-script.md",
  "send-checklist.md"
]);
const fileAllowlist = new Set([...allowlistNames].map((name) => join(codeRoot, "growth-brain/sales", name)));

const patterns = [
  { name: "specific multiplier", pattern: /\b(?:5x|10x)\b/i, allowGuardrail: false },
  { name: "risk free", pattern: /\brisk[- ]free\b/i, allowGuardrail: true },
  { name: "specific revenue promise", pattern: /increase revenue by/i, allowGuardrail: false },
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

function walk(path, excludeServiceApplications = false) {
  if (!existsSync(path)) return [];
  if (excludeServiceApplications && isServiceApplicationFolder(path)) return [];
  const statEntries = readdirSync(path, { withFileTypes: true });
  const files = [];
  for (const entry of statEntries) {
    const child = join(path, entry.name);
    if (entry.isDirectory()) files.push(...walk(child, excludeServiceApplications));
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
    files.push(...walk(root, root === prospectRoot));
  }
  return files
    .filter((file) => /\.(md|html)$/.test(file))
    .filter((file) => roots.includes(file) || allowlistNames.has(file.split("/").at(-1)) || outboundNames.has(file.split("/").at(-1)));
}

const findings = [];

for (const file of filesToScan()) {
  if (fileAllowlist.has(file)) continue;
  const lines = readFileSync(file, "utf8").split("\n");
  lines.forEach((line, index) => {
      // A line that forbids a claim is not the claim. "Do not mention guaranteed
      // revenue, rankings or ROAS" is the guardrail itself, and flagging it made the
      // suite fail on content that was obeying the rule. The rule path below already
      // consults allowedGuardrail; this one did not.
      if (!allowedGuardrail.test(line)) {
      for (const flag of agentWorkClaimRiskFlags({ deliverables: line, claims: [] })) {
        findings.push({ file, line: index + 1, rule: flag.reason, text: line.trim() });
      }
      }
    const clauses = line.split(clauseBoundary);
    // guaranteeGuardrail only recognises "do not promise/guarantee". An instruction
      // that forbids *mentioning* a guarantee ("Do not mention guaranteed revenue")
      // keeps the bare word and was flagged as making the promise it forbids.
      // allowedGuardrail is the broader prohibition test the rule path already uses.
      if (clauses.some((clause) => genericGuarantee.test(clause.replace(guaranteeGuardrail, "")) && !allowedGuardrail.test(clause))) {
      findings.push({ file, line: index + 1, rule: "generic guarantee", text: line.trim() });
    }
    for (const rule of patterns) {
      if (!clauses.some((clause) => rule.pattern.test(clause) && !(rule.allowGuardrail && allowedGuardrail.test(clause)))) continue;
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
