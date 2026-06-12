#!/usr/bin/env node
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { execFileSync } from "node:child_process";
import { localIsoDate } from "./date-utils.mjs";
import { listClientFolders } from "./lib/list-operational-folders.mjs";

const outputArg = process.argv.find((arg) => arg.startsWith("--output="));
const outputPath = outputArg ? outputArg.split("=")[1] : "growth-brain/ops/value-retention-stress-test.md";
const today = localIsoDate();

function read(path) {
  return existsSync(path) ? readFileSync(path, "utf8") : "";
}

function write(path, content) {
  const dir = path.split("/").slice(0, -1).join("/");
  if (dir) mkdirSync(dir, { recursive: true });
  writeFileSync(path, content);
}

function runJson(args) {
  const output = execFileSync("node", args, {
    encoding: "utf8",
    stdio: ["ignore", "pipe", "pipe"]
  });
  return JSON.parse(output);
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
  return normalized.length >= 8 && !/^(todo|tbd|n\/a|none|placeholder|add|replace|-|\[.*\])$/i.test(normalized);
}

function genericValue(value) {
  return /asking buyers to understand multiple technical services|offer feels generic|hard to evaluate|without hunting through the page|safer, clearer choice|more qualified visitors should reach|a buyer can see the right next path sooner|page feels safer because the buyer/i.test(String(value || ""));
}

function proofRows(path = "prospects/loom-links.txt") {
  return read(path)
    .split("\n")
    .map((line) => line.trim())
    .filter((line) => line.startsWith("prospects/"))
    .map((line) => {
      const separator = line.includes("|") ? "|" : ",";
      const [prospectPath, loomUrl, approval, leak, impact, fix, ask] = line.split(separator).map((part) => part.trim());
      return { prospectPath, loomUrl, approval, leak, impact, fix, ask };
    });
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
    if (/^(Priority|Week|Metric|Area|Claim|Signal)$/i.test(first)) return false;
    return requiredIndexes.every((index) => meaningful(cells[index]));
  });
}

function isOwnedStartup(clientPath) {
  return /## Proof Type\s+owned-startup/i.test(read(join(clientPath, "proof-context.md")));
}

function statusFrom(ok, warning = false) {
  if (ok) return "pass";
  return warning ? "watch" : "fail";
}

function row(item) {
  return `| ${item.area} | ${item.status} | ${item.evidence} | ${item.next} |`;
}

runJson(["scripts/export-internal-dashboard.mjs"]);
runJson(["scripts/export-retention-checkups.mjs"]);
const marketProof = runJson(["scripts/export-market-proof-cockpit.mjs"]);
const ownedHandoff = runJson(["scripts/export-owned-handoff-loom-cockpit.mjs"]);
const ownedCaseStudies = runJson(["scripts/export-owned-product-case-studies.mjs"]);
const rehearsal = runJson(["scripts/export-recording-rehearsal-check.mjs"]);
const parity = runJson(["scripts/check-market-parity-readiness.mjs", "--skip-kit", "--output=/tmp/tinystudio-value-stress-parity.md"]);
const send = runJson(["scripts/check-outbound-send-readiness.mjs"]);
const claims = runJson(["scripts/check-outbound-claim-safety.mjs"]);

const internalDashboard = read("growth-brain/ops/internal-dashboard.md");
const currentProofRows = proofRows();
const genericProofRows = currentProofRows.filter((proofRow) => genericValue(proofRow.impact));
const genericRecordingScripts = currentProofRows
  .map((proofRow) => ({
    prospectPath: proofRow.prospectPath,
    script: section(read(join(proofRow.prospectPath || "", "recording-script.md")), "Talk Track")
  }))
  .filter((row) => genericValue(row.script));
const buyerValueCounts = currentProofRows.reduce((accumulator, proofRow) => {
  const normalized = String(proofRow.impact || "").toLowerCase().replace(/\s+/g, " ").trim();
  if (normalized) accumulator[normalized] = (accumulator[normalized] || 0) + 1;
  return accumulator;
}, {});
const duplicateBuyerValueRows = Object.values(buyerValueCounts).filter((count) => count > 1).reduce((sum, count) => sum + count, 0);
const marketLearning = runJson(["scripts/export-market-learning-review.mjs"]);
const clients = listClientFolders().map((clientPath) => {
  const readiness = existsSync(join(clientPath, "intake.md"))
    ? runJson(["scripts/check-client-readiness.mjs", clientPath])
    : { status: "missing", warnings: ["missing intake"] };
  const weekly = existsSync(join(clientPath, "reports/week-1-report.md"))
    ? runJson(["scripts/check-client-weekly-report.mjs", clientPath])
    : { status: "missing", warnings: ["missing week-1 report"] };

  const dashboardResult = existsSync(join(clientPath, "intake.md"))
    ? runJson(["scripts/export-client-facing-dashboard.mjs", clientPath])
    : { valueProofScore: 0, valueProofStatus: "missing" };

  const delivery = read(join(clientPath, "deliverables/delivery.md"));
  const report = read(join(clientPath, "reports/week-1-report.md"));
  const dashboard = read(join(clientPath, "client-dashboard.md"));

  return {
    clientPath,
    ownedStartup: isOwnedStartup(clientPath),
    readiness: readiness.status,
    weekly: weekly.status,
    tangibleImprovement: hasFilledTableRow(delivery, "Tangible Improvements", [1, 2, 3, 4, 5]),
    revenueLeakLoop: hasFilledTableRow(report, "Revenue Leak Loop", [1, 2, 3, 4]),
    searchTrustReview: hasFilledTableRow(report, "Search Trust Review", [1, 2, 3]),
    measurementContract: hasFilledTableRow(report, "Measurement Contract", [0, 1, 2, 3, 4, 5])
      && hasFilledTableRow(dashboard, "Measurement Contract", [0, 1]),
    clientPulse: ["What felt valuable", "What felt unclear", "Delight add-on", "Health score", "Retention risk"]
      .every((label) => meaningful(bulletValue(report, label))),
    clientConfirmation: ["Client saw delta", "Client understood value", "Client approved next action", "Continue / retain signal"]
      .every((label) => meaningful(bulletValue(report, label))),
    valueLedger: dashboard.includes("## Value Ledger") && dashboard.includes("## Retention / Delight Pulse") && dashboard.includes("## Client Confirmation"),
    valueProofScore: dashboardResult.valueProofScore || 0,
    valueProofStatus: dashboardResult.valueProofStatus || "missing",
    warnings: [...(readiness.warnings || []), ...(weekly.warnings || [])]
  };
});

const ownedStartupClients = clients.filter((client) => client.ownedStartup);
const externalClients = clients.filter((client) => !client.ownedStartup);
const ownedCaseStudyReady = (ownedCaseStudies.packets || []).filter((packet) => packet.status === "case-study-ready").length;
const ownedCaseStudyDeliveryReady = (ownedCaseStudies.packets || []).filter((packet) => ["case-study-ready", "delivery-proof-ready"].includes(packet.status)).length;
const ownedCaseStudyNeedsMetrics = (ownedCaseStudies.packets || []).filter((packet) => packet.status === "needs-current-metric").length;
const ownedCaseStudyNeedsBusinessMetrics = (ownedCaseStudies.packets || []).filter((packet) => packet.needsBusinessMetric || (packet.businessMetrics || 0) === 0).length;
const clientsWithTangibleProof = clients.filter((client) => client.tangibleImprovement);
const clientsWithRevenueLeakLoop = clients.filter((client) => client.revenueLeakLoop);
const clientsWithSearchTrustReview = clients.filter((client) => client.searchTrustReview);
const clientsWithPulse = clients.filter((client) => client.clientPulse);
const clientsWithDashboards = clients.filter((client) => client.valueLedger);
const clientsWithStrongValueScore = clients.filter((client) => client.valueProofScore >= 8);
const clientsWithMeasurementContracts = clients.filter((client) => client.measurementContract);
const externalWithMeasurementContracts = externalClients.filter((client) => client.measurementContract);
const externalWithStrongValueScore = externalClients.filter((client) => client.valueProofScore >= 8);
const averageValueProofScore = clients.length
  ? Math.round((clients.reduce((sum, client) => sum + client.valueProofScore, 0) / clients.length) * 10) / 10
  : 0;
const ownedWithTangibleProof = ownedStartupClients.filter((client) => client.tangibleImprovement);
const externalWithTangibleProof = externalClients.filter((client) => client.tangibleImprovement);
const externalWithRevenueLeakLoop = externalClients.filter((client) => client.revenueLeakLoop);
const externalWithSearchTrustReview = externalClients.filter((client) => client.searchTrustReview);
const externalWithPulse = externalClients.filter((client) => client.clientPulse);
const clientsWithConfirmation = clients.filter((client) => client.clientConfirmation);
const externalWithConfirmation = externalClients.filter((client) => client.clientConfirmation);

const stressTests = [
  {
    area: "Moat clarity",
    status: "pass",
    evidence: "The wedge is tangible improvement proof: before/after, proof source, client-visible value, measurement contract, and customer confirmation.",
    next: "Do not claim competitors lack this until live competitor proof exists."
  },
  {
    area: "Internal dashboard action clarity",
    status: statusFrom(internalDashboard.includes("Next / Pending Actions") && internalDashboard.includes("To-Do List") && internalDashboard.includes("11/10 Blockers")),
    evidence: "Owner dashboard must show bottleneck, pending actions, task list, and blockers in one place.",
    next: "Run `npm run growth:dashboard` before daily work."
  },
  {
    area: "Market proof execution cockpit",
    status: statusFrom(marketProof.rows > 0 && existsSync(marketProof.htmlPath)),
    evidence: `${marketProof.rows} tangible improvement proof row(s); proof status ${marketProof.checkStatus}; sent proof ${marketProof.sentProofRows}/5.`,
    next: "Use `npm run market:proof-cockpit` to record, prep, send, and verify the first external proof batch."
  },
  {
    area: "Market learning loop",
    status: statusFrom(existsSync(marketLearning.path) && existsSync(marketLearning.htmlPath)),
    evidence: `market learning status ${marketLearning.status}; sends ${marketLearning.sends}; replies ${marketLearning.replies}; next ${marketLearning.nextCommand}.`,
    next: "Run `npm run market:learn` after every send/follow-up batch before changing lead fit, hook, or message."
  },
  {
    area: "Value specificity guard",
    status: statusFrom(currentProofRows.length > 0 && genericProofRows.length === 0 && duplicateBuyerValueRows === 0 && genericRecordingScripts.length === 0, currentProofRows.length > 0),
    evidence: `${genericProofRows.length}/${currentProofRows.length} market proof row(s) use generic buyer-impact language; ${duplicateBuyerValueRows} repeated buyer-value row(s); ${genericRecordingScripts.length}/${currentProofRows.length} recording script(s) still use generic impact language.`,
    next: "Replace generic or repeated impact with the actual functional, financial, or emotional value from the recording sharpness brief."
  },
  {
    area: "Pre-recording rehearsal quality",
    status: statusFrom(rehearsal.status === "ready" && rehearsal.minimumScore >= 8, rehearsal.count > 0),
    evidence: `${rehearsal.count} script(s) checked; minimum score ${rehearsal.minimumScore}/10; status ${rehearsal.status}.`,
    next: "Do not record or send vague Looms; run `npm run prospect:rehearsal -- --limit=5` and fix weak spots first."
  },
  {
    area: "Client dashboard value proof",
    status: statusFrom(clients.length > 0 && clientsWithDashboards.length === clients.length, clients.length === 0),
    evidence: `${clientsWithDashboards.length}/${clients.length} client dashboard(s) include value ledger, retention/delight pulse, and client confirmation.`,
    next: "Every client dashboard must show value, not just activity."
  },
  {
    area: "Customer-perceived value proof",
    status: statusFrom(clientsWithConfirmation.length > 0, clients.length > 0),
    evidence: `${clientsWithConfirmation.length}/${clients.length} weekly report(s) confirm the customer saw the delta, understood value, approved next action, and gave a continue/retain signal; external ${externalWithConfirmation.length}/${externalClients.length}.`,
    next: "Do not call retention proof real until the customer confirms the improvement was understood and worth continuing."
  },
  {
    area: "Measurement contract",
    status: statusFrom(clientsWithMeasurementContracts.length === clients.length && clients.length > 0, clients.length > 0),
    evidence: `${clientsWithMeasurementContracts.length}/${clients.length} client folder(s) have a signal, source, owner, next check, baseline/current state, and decision rule; external ${externalWithMeasurementContracts.length}/${externalClients.length}.`,
    next: "Every improvement needs a measurement contract before it becomes retention proof."
  },
  {
    area: "Value proof score",
    status: statusFrom(clientsWithStrongValueScore.length === clients.length && clients.length > 0, clients.length > 0),
    evidence: `${clientsWithStrongValueScore.length}/${clients.length} client dashboard(s) score 8+/10; average ${averageValueProofScore}/10; external ${externalWithStrongValueScore.length}/${externalClients.length}.`,
    next: "Keep every retained client at 8+/10 value proof, then push approved paid-client proof above owned-startup proof."
  },
  {
    area: "Tangible improvement proof",
    status: statusFrom(clientsWithTangibleProof.length > 0, clients.length > 0),
    evidence: `${clientsWithTangibleProof.length}/${clients.length} client folder(s) have filled before/after tangible improvement rows; owned ${ownedWithTangibleProof.length}/${ownedStartupClients.length}; external ${externalWithTangibleProof.length}/${externalClients.length}.`,
    next: "Fill at least one tangible improvement row before calling delivery client-ready."
  },
  {
    area: "Comprehensive weekly value stack",
    status: statusFrom(clientsWithRevenueLeakLoop.length === clients.length && clientsWithSearchTrustReview.length === clients.length && clients.length > 0, clients.length > 0),
    evidence: `${clientsWithRevenueLeakLoop.length}/${clients.length} weekly report(s) include a revenue leak loop; ${clientsWithSearchTrustReview.length}/${clients.length} include search trust review; external leak loop ${externalWithRevenueLeakLoop.length}/${externalClients.length}; external search trust ${externalWithSearchTrustReview.length}/${externalClients.length}.`,
    next: "Every retained client update must show conversion fix, search trust, client-visible value, and next measurement."
  },
  {
    area: "Handoff proof readiness",
    status: statusFrom(ownedHandoff.readyToRecord >= ownedStartupClients.length && ownedStartupClients.length > 0, ownedStartupClients.length > 0),
    evidence: `${ownedHandoff.readyToRecord}/${ownedHandoff.clients} owned-startup handoff Loom script(s) ready; blocked ${ownedHandoff.blocked}.`,
    next: "Record real handoff Looms, then complete acceptance with real Loom URLs."
  },
  {
    area: "Paid client value proof",
    status: statusFrom(externalClients.length > 0 && externalWithTangibleProof.length > 0 && externalWithPulse.length > 0, true),
    evidence: `${externalWithTangibleProof.length}/${externalClients.length} external client folder(s) have tangible proof; ${externalWithPulse.length}/${externalClients.length} external weekly reports include retention pulse.`,
    next: "Do not treat owned-startup proof as paid-client value proof."
  },
  {
    area: "Retention and delight signal",
    status: statusFrom(clientsWithPulse.length > 0, clients.length > 0),
    evidence: `${clientsWithPulse.length}/${clients.length} weekly report(s) include value feedback, unclear points, delight add-on, health score, and retention risk.`,
    next: "Ask the client what felt valuable and unclear before renewal."
  },
  {
    area: "Owned startup proof lane",
    status: statusFrom(ownedStartupClients.length >= 3, ownedStartupClients.length > 0),
    evidence: `${ownedStartupClients.length} owned startup proof folder(s); ${externalClients.length} external client folder(s).`,
    next: "Use AI Converter, SiteRep, and 0509 to stress-test delivery, not to fake market proof."
  },
  {
    area: "Owned product case-study packets",
    status: statusFrom(ownedCaseStudies.status === "ready", true),
    evidence: `${ownedCaseStudyDeliveryReady}/${(ownedCaseStudies.packets || []).length} owned-product packet(s) delivery-proof ready; ${ownedCaseStudyReady}/${(ownedCaseStudies.packets || []).length} have business metrics; ${ownedCaseStudyNeedsMetrics} need current metric value; ${ownedCaseStudyNeedsBusinessMetrics} need business metric value.`,
    next: ownedCaseStudies.status === "delivery-proof-ready"
      ? "Public delivery signals are filled. Add analytics or sales metrics before calling these full business case studies."
      : "Add one real current metric to each owned-product proof packet before using it as delivery proof."
  },
  {
    area: "External market proof",
    status: parity.blockers?.some((blocker) => blocker.area === "Market proof") ? "fail" : "pass",
    evidence: parity.blockers?.find((blocker) => blocker.area === "Market proof")?.evidence || "Market proof gate clear.",
    next: "Record and send the first 5 Looms; owned-startup work cannot replace this."
  },
  {
    area: "Claim and send safety",
    status: statusFrom(claims.status === "pass" && send.status === "pass"),
    evidence: `claim safety ${claims.status}; send readiness ${send.status}.`,
    next: "Run checks before anything client-facing leaves TinyStudio."
  }
];

const missingValue = stressTests
  .filter((test) => test.status !== "pass")
  .map((test) => `- ${test.area}: ${test.next}`)
  .join("\n") || "- No stress-test gaps found. Keep executing the proof loop.";

const markdown = `# Value And Retention Stress Test

Generated: ${today}

## North Star

Outsized value, customer retention, and customer delight. TinyStudio's wedge is not "we do marketing". It is tangible improvement proof: before/after, proof source, client-visible value, measurement contract, and customer confirmation that the improvement is worth continuing.

## Stress Test Scorecard

| Area | Status | Evidence | Next |
|---|---|---|---|
${stressTests.map(row).join("\n")}

## Where Value Is Missing Now

${missingValue}

## Current Rule

Owned startups can prove delivery quality and retention cadence. They do not prove external demand, replies, paid close rate, or market pull.

## Next Commands

\`\`\`bash
npm run owned:startups
npm run owned:live-signals
npm run owned:handoff
npm run owned:case-studies
npm run owned:metrics -- --from-clipboard
npm run growth:dashboard
npm run prospect:rehearsal -- --limit=5
npm run market:proof-run
npm run value:stress
\`\`\`
`;

write(outputPath, markdown);

const status = stressTests.some((test) => test.status === "fail")
  ? "attention-needed"
  : stressTests.some((test) => test.status === "watch")
    ? "watch"
    : "pass";

console.log(JSON.stringify({
  status,
  path: outputPath,
  stressTests,
  clients: clients.length,
  ownedStartupClients: ownedStartupClients.length,
  clientsWithTangibleProof: clientsWithTangibleProof.length,
  externalWithTangibleProof: externalWithTangibleProof.length,
  clientsWithRevenueLeakLoop: clientsWithRevenueLeakLoop.length,
  externalWithRevenueLeakLoop: externalWithRevenueLeakLoop.length,
  clientsWithSearchTrustReview: clientsWithSearchTrustReview.length,
  externalWithSearchTrustReview: externalWithSearchTrustReview.length,
  clientsWithPulse: clientsWithPulse.length,
  externalWithPulse: externalWithPulse.length,
  clientsWithConfirmation: clientsWithConfirmation.length,
  externalWithConfirmation: externalWithConfirmation.length,
  clientsWithMeasurementContracts: clientsWithMeasurementContracts.length,
  externalWithMeasurementContracts: externalWithMeasurementContracts.length,
  ownedCaseStudyReady,
  ownedCaseStudyDeliveryReady,
  ownedCaseStudyNeedsMetrics,
  ownedCaseStudyNeedsBusinessMetrics,
  clientsWithStrongValueScore: clientsWithStrongValueScore.length,
  averageValueProofScore
}, null, 2));
