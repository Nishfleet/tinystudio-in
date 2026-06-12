#!/usr/bin/env node
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { execFileSync } from "node:child_process";
import { localIsoDate } from "./date-utils.mjs";
import { listClientFolders, listProspectFolders } from "./lib/list-operational-folders.mjs";

const strict = process.argv.includes("--strict");
const skipKit = process.argv.includes("--skip-kit");
const outputArg = process.argv.find((arg) => arg.startsWith("--output="));
const outputPath = outputArg ? outputArg.split("=")[1] : "growth-brain/ops/market-parity-readiness.md";

function runJson(args) {
  const output = execFileSync("node", args, {
    encoding: "utf8",
    stdio: ["ignore", "pipe", "pipe"]
  });
  return JSON.parse(output);
}

function read(path) {
  return existsSync(path) ? readFileSync(path, "utf8") : "";
}

function json(path) {
  return existsSync(path) ? JSON.parse(readFileSync(path, "utf8")) : {};
}

function write(path, content) {
  const dir = path.split("/").slice(0, -1).join("/");
  if (dir) mkdirSync(dir, { recursive: true });
  writeFileSync(path, content);
}

function hasApprovedClaim(clientPath) {
  const ledger = read(join(clientPath, "quality/claim-proof-ledger.md"));
  return /\|\s*approved\s*\|/i.test(ledger) && !ledger.includes("Example claim");
}

function tableRows(markdown) {
  return String(markdown || "")
    .split("\n")
    .map((line) => line.trim())
    .filter((line) => line.startsWith("|") && line.endsWith("|"))
    .map((line) => line.split("|").slice(1, -1).map((cell) => cell.trim()))
    .filter((cells) => cells.some(Boolean) && !cells.every((cell) => /^:?-+:?$/.test(cell)));
}

function section(markdown, heading) {
  const lines = String(markdown || "").split("\n");
  const start = lines.findIndex((line) => line.trim() === `## ${heading}`);
  if (start === -1) return "";
  const body = [];
  for (let index = start + 1; index < lines.length; index += 1) {
    if (/^##\s+/.test(lines[index])) break;
    body.push(lines[index]);
  }
  return body.join("\n").trim();
}

function meaningful(value) {
  const normalized = String(value || "").trim();
  return normalized.length >= 8 && !/^(todo|tbd|n\/a|none|placeholder|add|replace)/i.test(normalized);
}

function bulletValue(markdown, label) {
  const prefix = `- ${label}:`;
  const line = String(markdown || "")
    .split("\n")
    .find((candidate) => candidate.trimStart().startsWith(prefix));
  return line ? line.trimStart().slice(prefix.length).trim() : "";
}

function hasFilledTableRow(markdown, heading, requiredIndexes) {
  return tableRows(section(markdown, heading)).some((cells) => {
    const first = cells[0] || "";
    if (/^(Priority|Week|Metric|Area)$/i.test(first)) return false;
    return requiredIndexes.every((index) => meaningful(cells[index]));
  });
}

function hasStrongWeeklyReport(clientPath) {
  if (!existsSync(join(clientPath, "reports/week-1-report.md"))) return false;
  try {
    return runJson(["scripts/check-client-weekly-report.mjs", clientPath]).status === "ready";
  } catch {
    return false;
  }
}

function isOwnedStartupProof(clientPath) {
  return /## Proof Type\s+owned-startup/i.test(read(join(clientPath, "proof-context.md")));
}

function hasWonSalesProof(prospectPath) {
  const pipeline = json(join(prospectPath, "pipeline.json"));
  const closePackage = read(join(prospectPath, "close-package.md"));
  const notes = Array.isArray(pipeline.notes) ? pipeline.notes : [];
  return pipeline.stage === "won"
    && closePackage.includes("## Proposal")
    && closePackage.includes("## Decision Follow-Up")
    && closePackage.includes("## Next Command")
    && !/add payment link|__PAYMENT|__|TODO|TBD/i.test(closePackage)
    && notes.some((note) => note.action === "won" && meaningful(note.note));
}

const metrics = runJson(["scripts/export-growth-metrics.mjs"]);
const sender = runJson(["scripts/check-outbound-sender-setup.mjs"]);
const kit = skipKit
  ? { status: "skipped", requiredFiles: 0, agents: 0, workflows: 0 }
  : runJson(["scripts/check-growth-brain-kit.mjs"]);
const send = runJson(["scripts/check-outbound-send-readiness.mjs"]);
const claims = runJson(["scripts/check-outbound-claim-safety.mjs"]);
const benchmark = runJson(["scripts/export-market-benchmark.mjs"]);
const config = JSON.parse(read("growth-brain/ops/agency-config.json") || "{}");
const clients = listClientFolders();
const prospects = listProspectFolders();

const clientProof = clients.map((clientPath) => ({
  clientPath,
  ownedStartup: isOwnedStartupProof(clientPath),
  approvedClaims: hasApprovedClaim(clientPath),
  weeklyReport: hasStrongWeeklyReport(clientPath),
  readiness: existsSync(join(clientPath, "intake.md"))
    ? runJson(["scripts/check-client-readiness.mjs", clientPath]).status
    : "missing"
}));
const prospectsWithWonSalesProof = prospects.filter(hasWonSalesProof);
const clientsReadyWithApprovedClaims = clientProof.filter((client) => client.readiness === "ready" && client.approvedClaims);
const clientsWithApprovedClaims = clientProof.filter((client) => client.approvedClaims);
const clientsWithRetentionProof = clientProof.filter((client) => client.weeklyReport);
const ownedStartupClients = clientProof.filter((client) => client.ownedStartup);
const ownedStartupReadyWithApprovedClaims = clientsReadyWithApprovedClaims.filter((client) => client.ownedStartup);
const ownedStartupWithApprovedClaims = clientsWithApprovedClaims.filter((client) => client.ownedStartup);
const ownedStartupRetentionProof = clientsWithRetentionProof.filter((client) => client.ownedStartup);
const externalClientsReadyWithApprovedClaims = clientsReadyWithApprovedClaims.filter((client) => !client.ownedStartup);
const externalClientsWithApprovedClaims = clientsWithApprovedClaims.filter((client) => !client.ownedStartup);
const externalClientsWithRetentionProof = clientsWithRetentionProof.filter((client) => !client.ownedStartup);

const checks = [
  {
    area: "Workflow depth",
    status: skipKit ? "conditional-pass" : kit.status === "pass" && kit.requiredFiles >= 120 ? "pass" : "fail",
    evidence: skipKit
      ? "skipped inside kit smoke test to avoid recursive self-check"
      : `${kit.requiredFiles || 0} required Growth Brain files, ${kit.agents || 0} agents, ${kit.workflows || 0} workflows`
  },
  {
    area: "Output quality gates",
    status: claims.status === "pass" && send.status === "pass" ? "pass" : "fail",
    evidence: `claim safety ${claims.status}; send readiness ${send.status}`
  },
  {
    area: "Automation coverage",
    status: (skipKit || kit.status === "pass") && existsSync("prospects/recording-teleprompter.html") && existsSync("prospects/outbox.html") ? "pass" : "fail",
    evidence: "recording, send, follow-up, sales, delivery, proof, and metrics surfaces are generated"
  },
  {
    area: "Stress-tested internals",
    status: skipKit
      ? send.status === "pass" && claims.status === "pass" ? "conditional-pass" : "fail"
      : kit.status === "pass" && send.status === "pass" && claims.status === "pass" ? "pass" : "fail",
    evidence: skipKit
      ? "claim and send gates pass; kit gate skipped inside kit smoke test"
      : "kit, claim, and send gates pass on current repo state"
  },
  {
    area: "Comparable price/value",
    status: config.founderSprintPrice && config.standardSprintPriceRange && config.monthlyContinuationRange && config.fullStackRetainerRange && config.operatorPodRange ? "conditional-pass" : "fail",
    evidence: `${config.founderSprintPrice || "missing founder price"}; ${config.standardSprintPriceRange || "missing standard sprint"}; ${config.monthlyContinuationRange || "missing continuation"}; ${config.fullStackRetainerRange || "missing full-stack retainer"}; ${config.operatorPodRange || "missing operator pod"}`
  },
  {
    area: "Sender trust",
    status: sender.status === "pass" ? "pass" : "fail",
    evidence: sender.warnings?.length ? sender.warnings.map((warning) => warning.rule).join("; ") : "sender setup clean"
  },
  {
    area: "Market proof",
    status: metrics.counts.loomsRecorded >= 5 && metrics.counts.sends >= 5 && metrics.counts.replies >= 1 ? "pass" : "fail",
    evidence: `${metrics.counts.loomsRecorded}/5 Looms, ${metrics.counts.sends}/5 sends, ${metrics.counts.replies} replies`
  },
  {
    area: "Sales proof",
    status: prospectsWithWonSalesProof.length >= 1 ? "pass" : "fail",
    evidence: `${prospectsWithWonSalesProof.length} won sprint(s) with close package and won note`
  },
  {
    area: "Delivery proof",
    status: clientsReadyWithApprovedClaims.length >= 1 ? "pass" : "fail",
    evidence: `${externalClientsReadyWithApprovedClaims.length} external and ${ownedStartupReadyWithApprovedClaims.length} owned-startup ready client(s); approved claim folders: ${externalClientsWithApprovedClaims.length} external, ${ownedStartupWithApprovedClaims.length} owned-startup`
  },
  {
    area: "Retention proof",
    status: clientsWithRetentionProof.length >= 1 ? "pass" : "fail",
    evidence: `${externalClientsWithRetentionProof.length} external and ${ownedStartupRetentionProof.length} owned-startup client(s) with shipped weekly report and customer confirmation evidence`
  }
];

const blockers = checks.filter((check) => check.status === "fail");
const conditional = checks.filter((check) => check.status === "conditional-pass");
const score = checks.filter((check) => check.status === "pass").length;
const status = blockers.length ? "not-11-10-yet" : conditional.length ? "commercially-conditional" : "11-10-ready";

const notReadyVerdict = "Not 11/10 yet: current evidence proves the internal system, but sender trust, market traction, paid sales, and approved delivery proof are still blocked. Owned-startup retention proof is useful, but it is not paid-client retention proof.";

const markdown = `# Market Parity Readiness

Generated: ${localIsoDate()}

## Verdict

${status === "11-10-ready" ? "11/10-ready: current evidence proves the workflow, market proof, delivery proof, and retention proof." : notReadyVerdict}

## Score

${score}/${checks.length} full-pass areas.

## Competitive Benchmark

- Status: ${benchmark.status}
- Matrix: \`${benchmark.opsPath}\`
- Source-backed benchmark: \`${benchmark.path}\`

## Scorecard

| Area | Status | Evidence |
|---|---|---|
${checks.map((check) => `| ${check.area} | ${check.status} | ${check.evidence} |`).join("\n")}

## Required To Claim Better/Comparable

- Record and send at least 5 approved Looms.
- Get at least 1 real reply and 1 sales call.
- Close at least 1 paid sprint with a close package and won-stage note.
- Deliver at least 1 sprint to client-ready status with an approved claim row.
- Send at least 1 filled weekly report after delivery, with shipped work, a learning, a next test, and customer confirmation that the delta was seen, understood, approved for next action, and worth continuing.
- Fix sender setup before using cold email.

## Owned Startup Proof Lane

Owned products like AI Converter, SiteRep, and Five to Nine 0509 can prove delivery quality, retention cadence, dashboards, weekly reports, and claim discipline. They do not replace external market proof, replies, or paid sales proof.

Current owned startup folders: ${ownedStartupClients.length}.

Create or refresh them with:

\`\`\`bash
npm run owned:startups
\`\`\`

Next proof run:

\`\`\`bash
npm run market:benchmark
npm run market:proof-run
\`\`\`

## Market Benchmark

See \`docs/strategy/market-parity-benchmark-2026.md\`.
`;

write(outputPath, markdown);

const result = {
  status,
  path: outputPath,
  score,
  total: checks.length,
  blockers,
  conditional,
  benchmark: {
    status: benchmark.status,
    path: benchmark.path,
    opsPath: benchmark.opsPath,
    alternatives: benchmark.alternatives
  },
  counts: metrics.counts,
  skipKit
};

console.log(JSON.stringify(result, null, 2));

if (strict && status !== "11-10-ready") process.exit(1);
