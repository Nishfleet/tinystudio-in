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
// Narrow on purpose. Only an instruction that forbids *mentioning* a claim is
// exempt ("Do not mention guaranteed revenue"). The broad allowedGuardrail is
// wrong here: it also matches "We guarantee 20 leads, with no guarantees beyond
// that", which must stay flagged.
const forbidsMention = /\b(?:do(?:es)? not|will not|shall not|won't|never|avoid)\s+(?:mention|say|write|use|claim|state|imply|suggest|reference|promise|guarantee)\b/i;
// "No revenue, ranking, or sales-volume guarantees" splits on commas, so the tail
// clauses lose the negation that governs them. A trailing clause inherits an opening
// prohibition only when it is a bare list continuation; a clause carrying its own
// subject and verb ("placement is guaranteed") never inherits and stays flagged.
const opensProhibition = /^[\s\-*|]*(?:no|never|neither|nor|do(?:es)? not|will not|shall not|won't)\b/i;
const hasOwnPredicate = /\b(?:is|are|was|were|be|we|i|you|they|it)\b/i;
// Two sets, because the two rules need different things. The risk-flag rule reads a
// clause as a whole, so a clause that opens with a prohibition must be dropped. The
// generic-guarantee rule strips guaranteeGuardrail first, which already removes
// "No ... guarantees" from inside a clause, so that clause is kept: it may still
// hide a promise after the disclaimer ("Neither results are guaranteed, placement
// is guaranteed").
function effectiveClauses(clauses, {dropProhibitionOpeners} = {}) {
  let governed = false;
  const kept = [];
  for (const clause of clauses) {
    const opens = opensProhibition.test(clause);
    if (opens) governed = true;
    const inherits = governed && !opens && !hasOwnPredicate.test(clause);
    const skip = forbidsMention.test(clause) || inherits || (opens && dropProhibitionOpeners);
    if (!skip) kept.push(clause);
    if (/[.!?]\s*$/.test(clause)) governed = false;
  }
  return kept;
}
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
      const clauses = line.split(clauseBoundary);
      // Whole-line here: clauses split on commas, so "No revenue, ranking, or
      // sales-volume guarantees" would lose the leading "No" and read as a
      // promise. The generic-guarantee rule below stays per-clause, and that is
      // what still catches "We guarantee 20 leads, with no guarantees beyond that".
      const effective = effectiveClauses(clauses, {dropProhibitionOpeners: true});
        const genericClauses = effectiveClauses(clauses);
      for (const clause of effective) {
        for (const flag of agentWorkClaimRiskFlags({ deliverables: clause, claims: [] })) {
          findings.push({ file, line: index + 1, rule: flag.reason, text: line.trim() });
        }
      }
    // guaranteeGuardrail only recognises "do not promise/guarantee". An instruction
      // that forbids *mentioning* a guarantee ("Do not mention guaranteed revenue")
      // keeps the bare word and was flagged as making the promise it forbids.
      // allowedGuardrail is the broader prohibition test the rule path already uses.
      if (genericClauses.some((clause) => genericGuarantee.test(clause.replace(guaranteeGuardrail, "")))) {
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
