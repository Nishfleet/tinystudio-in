#!/usr/bin/env node
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { isAbsolute, join } from "node:path";
import { localIsoDate } from "./date-utils.mjs";
import { agencyConfig } from "./lib/agency-config.mjs";
import { handleHelp, resolveOutputPath } from "./lib/operator-cli.mjs";
import { loadValidatedServiceClients } from "./lib/validated-service-client.mjs";
import { runCodeRepoJson, runRepoJson as runJson, serviceRoot } from "./lib/runtime-roots.mjs";

handleHelp(process.argv.slice(2), `Usage: node scripts/check-market-parity-readiness.mjs [--strict] [--skip-kit] [--output=growth-brain/ops/market-parity-readiness.md]`);
const strict = process.argv.includes("--strict");
const skipKit = process.argv.includes("--skip-kit");
const outputArg = process.argv.find((arg) => arg.startsWith("--output="));
const outputPath = resolveOutputPath(outputArg?.split("=").slice(1).join("="), { fallback: "growth-brain/ops/market-parity-readiness.md" });
const resolvedOutputPath = isAbsolute(outputPath) ? outputPath : join(serviceRoot, outputPath);
function runGate(args, codeRootCwd = false) {
  try { return (codeRootCwd ? runCodeRepoJson : runJson)(args); }
  catch (error) {
    for (const output of [error?.stdout, error?.stderr]) {
      try { return JSON.parse(String(output || "")); } catch {}
    }
    return { status: "failed", checkedFiles: 0, allowedCommands: 0 };
  }
}

function read(path) {
  return existsSync(path) ? readFileSync(path, "utf8") : "";
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
  const escaped = heading.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const match = String(markdown || "").match(new RegExp(`## ${escaped}\\n+([\\s\\S]*?)(?:\\n## |$)`));
  return match ? match[1].trim() : "";
}

function meaningful(value) {
  const normalized = String(value || "").trim();
  return normalized.length >= 3 && !/^(todo|tbd|n\/a|none|placeholder|add|replace)/i.test(normalized);
}

function bulletValue(markdown, label) {
  const escaped = label.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  return String(markdown || "").match(new RegExp(`^- ${escaped}:[ \\t]*([^\\n]*)$`, "m"))?.[1]?.trim() || "";
}

function hasFilledTableRow(markdown, heading, requiredIndexes) {
  return tableRows(section(markdown, heading)).some((cells) => {
    const first = cells[0] || "";
    if (/^(Priority|Week|Metric|Area|Fault)$/i.test(first)) return false;
    return requiredIndexes.every((index) => meaningful(cells[index]));
  });
}

function isOwnedStartupProof(clientPath) {
  return /## Proof Type\s+owned-startup/i.test(read(join(clientPath, "proof-context.md")));
}

const metrics = runJson(["scripts/export-growth-metrics.mjs", "--output=runs/metrics-for-parity.md"]);
const sender = runJson(["scripts/check-outbound-sender-setup.mjs"]);
const kit = skipKit
  ? { status: "skipped", checkedFiles: 0, allowedCommands: 0 }
  : runGate(["scripts/check-human-service-kit.mjs"], true);
const send = runJson(["scripts/check-outbound-send-readiness.mjs"]);
const claims = runJson(["scripts/check-outbound-claim-safety.mjs"]);
const benchmark = runJson(["scripts/export-market-benchmark.mjs"]);
const repoRoot = serviceRoot;
const config = agencyConfig(repoRoot);
const serviceClients = loadValidatedServiceClients(repoRoot);
const clientProof = serviceClients.map((client) => ({
  ...client,
  ownedStartup: isOwnedStartupProof(client.clientPath),
  approvedClaims: client.ok && hasApprovedClaim(client.clientPath) && hasFilledTableRow(read(join(client.clientPath, "deliverables/delivery.md")), "Fault map", [0, 1, 2, 3]),
  // Only completed, approved tracking transitions count as retention proof.
  trackingEvidence: client.state === "complete" && client.trackingEvidence.length > 0,
  readiness: client.ok && existsSync(join(client.clientPath, "intake.md"))
    ? runJson(["scripts/check-client-readiness.mjs", client.clientPath]).status
    : "blocked"
}));
const externalPaidServiceClients = clientProof.filter((client) => !client.ownedStartup && client.ok && client.day0);
const clientsReadyWithApprovedClaims = clientProof.filter((client) => client.readiness === "ready" && client.approvedClaims);
const clientsWithRetentionProof = clientProof.filter((client) => !client.ownedStartup && client.ok && client.trackingEvidence);
const externalClientsReadyWithApprovedClaims = clientsReadyWithApprovedClaims.filter((client) => !client.ownedStartup);
const externalClientsWithApprovedClaims = clientProof.filter((client) => !client.ownedStartup && client.approvedClaims);
const externalClientsWithRetentionProof = clientsWithRetentionProof.filter((client) => !client.ownedStartup);

const checks = [
  {
    area: "Workflow depth",
    status: skipKit ? "conditional-pass" : kit.status === "passed" ? "pass" : "fail",
    evidence: skipKit
      ? "skipped inside kit smoke test to avoid recursive self-check"
      : `${kit.checkedFiles || 0} current service files, ${kit.allowedCommands || 0} allowed commands`
  },
  {
    area: "Output quality gates",
    status: claims.status === "pass" && send.status === "pass" ? "pass" : "fail",
    evidence: `claim safety ${claims.status}; send readiness ${send.status}`
  },
  {
    area: "Automation coverage",
    status: (skipKit || kit.status === "passed") && existsSync(join(repoRoot, "prospects/recording-teleprompter.html")) && existsSync(join(repoRoot, "prospects/outbox.html")) ? "pass" : "fail",
    evidence: "recording, send, follow-up, sales, delivery, proof, and metrics surfaces are generated"
  },
  {
    area: "Stress-tested internals",
    status: skipKit
      ? send.status === "pass" && claims.status === "pass" ? "conditional-pass" : "fail"
      : kit.status === "passed" && send.status === "pass" && claims.status === "pass" ? "pass" : "fail",
    evidence: skipKit
      ? "claim and send gates pass; kit gate skipped inside kit smoke test"
      : "kit, claim, and send gates pass on current repo state"
  },
  {
    area: "Comparable price/value",
    status: config.offerName === "The Website Correction" && config.founderSprintPrice === "$1,000 founder pilot" && config.scope === "one highest-leverage page" ? "pass" : "fail",
    evidence: `${config.offerName || "missing offer"}; ${config.founderSprintPrice || "missing founder price"}; scope ${config.scope || "missing scope"}`
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
    status: externalPaidServiceClients.length >= 1 ? "pass" : "fail",
    evidence: `${externalPaidServiceClients.length} external client(s) with a validated application, human fit approval, and paid Day 0`
  },
  {
    area: "Delivery proof",
    status: externalClientsReadyWithApprovedClaims.length >= 1 ? "pass" : "fail",
    evidence: `${externalClientsReadyWithApprovedClaims.length} external paid client(s) ready with approved delivery; ${externalClientsWithApprovedClaims.length} with approved claims`
  },
  {
    area: "Retention proof",
    status: externalClientsWithRetentionProof.length >= 1 ? "pass" : "fail",
    evidence: `${externalClientsWithRetentionProof.length} external paid client(s) with human-approved 14-day tracking evidence`
  }
];

const blockers = checks.filter((check) => check.status === "fail");
const conditional = checks.filter((check) => check.status === "conditional-pass");
const score = checks.filter((check) => check.status === "pass").length;
const status = blockers.length ? "not-11-10-yet" : conditional.length ? "commercially-conditional" : "11-10-ready";

const notReadyVerdict = "Not 11/10 yet: current evidence proves the internal system, but sender trust, market traction, validated paid sales, approved delivery, and human-approved 14-day retention proof are still blocked.";

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
- Capture at least 1 external consented application, human fit approval, and validated paid Day 0 record.
- Deliver at least 1 sprint to client-ready status with an approved claim row.
- Record at least 1 completed 14-day tracking evidence record after delivery, with implementation status, usefulness, acceptance, and continuation signals.
- Fix sender setup before using cold email.

## Service Delivery Proof Lane

Validated external paid-client records can prove delivery quality, implementation tracking, and claim discipline. They do not replace external market proof or replies.

Current validated external paid clients: ${externalPaidServiceClients.length}.

Review the current delivery queue with:

\`\`\`bash
npm run service:queue -- --scope clients
\`\`\`

Next proof run:

\`\`\`bash
npm run market:benchmark
npm run market:proof-run
\`\`\`

## Market Benchmark

See \`docs/strategy/market-parity-benchmark-2026.md\`.
`;

write(resolvedOutputPath, markdown);

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
