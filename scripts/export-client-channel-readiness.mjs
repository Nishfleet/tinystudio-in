#!/usr/bin/env node
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { CHANNELS, meaningful, parseChannelReadiness, section, tableRows } from "./lib/channel-readiness.mjs";
import { localIsoDate } from "./date-utils.mjs";

const args = process.argv.slice(2);
const clientPath = args.find((arg) => !arg.startsWith("--"));

if (!clientPath) {
  console.error("Usage: npm run client:channels -- clients/client-slug");
  process.exit(1);
}

if (!existsSync(clientPath)) {
  console.error(`Client folder not found: ${clientPath}`);
  process.exit(1);
}

function read(relativePath) {
  const path = join(clientPath, relativePath);
  return existsSync(path) ? readFileSync(path, "utf8") : "";
}

function bulletValue(markdown, label) {
  const escaped = label.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  return String(markdown || "").match(new RegExp(`^- ${escaped}:[ \\t]*([^\\n]*)$`, "m"))?.[1]?.trim() || "";
}

function hasFilledTableRow(markdown, heading, requiredIndexes) {
  return tableRows(section(markdown, heading)).some((cells) => {
    const first = cells[0] || "";
    if (/^(Priority|Week|Metric|Area|Signal|Layer|Rank|Check|Claim)$/i.test(first)) return false;
    return requiredIndexes.every((index) => meaningful(cells[index], 8));
  });
}

function approvedClaimCount(markdown) {
  return tableRows(markdown).filter((cells) => {
    const [claim, source, proofType, approvedBy, status] = cells;
    if (/^Claim$/i.test(claim || "")) return false;
    return claim && source && proofType && approvedBy && /^approved$/i.test(status || "");
  }).length;
}

function row(channel, ready, readyValues, pendingValues) {
  const values = ready ? readyValues : pendingValues;
  return [channel, ...values];
}

const today = localIsoDate();
const outputPath = join(clientPath, "quality/channel-readiness-scorecard.md");
const intake = read("intake.md");
const conversion = read("quality/conversion-optimization-scorecard.md");
const claimLedger = read("quality/claim-proof-ledger.md");
const delivery = read("deliverables/delivery.md");
const handoff = read("deliverables/implementation-handoff.md");
const report = read("reports/week-1-report.md");
const brandVoice = read("brain/brand-voice.md");
const weeklyLearnings = read("brain/weekly-learnings.md");

const approvedClaims = approvedClaimCount(claimLedger);
const conversionApproved = /^- Approved:[ \t]*(yes|approved)$/im.test(conversion);
const tangibleImprovementReady = hasFilledTableRow(delivery, "Tangible Improvements", [1, 2, 3, 4, 5]);
const topLeakReady = hasFilledTableRow(delivery, "Top Leaks", [1, 2, 3]);
const searchTrustScorecardReady = tableRows(section(conversion, "Search Trust Layer"))
  .filter((cells) => /^(On-site search trust|Off-site trust\/distribution)$/i.test(cells[0] || ""))
  .length >= 2 && tableRows(section(conversion, "Search Trust Layer"))
  .filter((cells) => /^(On-site search trust|Off-site trust\/distribution)$/i.test(cells[0] || ""))
  .every((cells) => [1, 2, 3, 4].every((index) => meaningful(cells[index], 8)));
const weeklySearchTrustReady = hasFilledTableRow(report, "Search Trust Review", [1, 2, 3]);
const measurementReady = hasFilledTableRow(report, "Measurement Contract", [0, 1, 2, 3, 4, 5]);
const revenueLeakReady = hasFilledTableRow(report, "Revenue Leak Loop", [1, 2, 3, 4]);
const weeklyLearningReady = hasFilledTableRow(weeklyLearnings, "Log", [1, 3, 4]);
const clientConfirmationReady = ["Client saw delta", "Client understood value", "Client approved next action", "Continue / retain signal"]
  .every((label) => meaningful(bulletValue(report, label), 8));
const hasDashboard = existsSync(join(clientPath, "client-dashboard.md")) || existsSync(join(clientPath, "client-dashboard.html"));
const handoffMetric = bulletValue(handoff, "Primary metric");
const hasBrandVoice = meaningful(brandVoice.replace(/[#*_`|-]/g, " "), 80);

const croReady = conversionApproved && tangibleImprovementReady && topLeakReady;
const seoReady = searchTrustScorecardReady && weeklySearchTrustReady;
const contentReady = approvedClaims > 0 && hasBrandVoice;
const analyticsReady = measurementReady && meaningful(handoffMetric, 4);
const creativeReady = approvedClaims > 0 && tangibleImprovementReady;
const automationReady = hasDashboard && weeklyLearningReady && clientConfirmationReady;
const socialReady = hasBrandVoice && approvedClaims > 0 && clientConfirmationReady;

const rows = [
  row("CRO / conversion", croReady, [
    "ready - priority page/funnel and buyer action documented",
    "ready - top leak and client-visible value are filled",
    "ready - tangible improvement has next measurement",
    "ready - conversion scorecard and proof are approved",
    "ready - run weekly conversion loop"
  ], [
    "pending - page/funnel or buyer action needs proof",
    "pending - top leak and value are not complete",
    "pending - next measurement is missing",
    "pending - conversion approval incomplete",
    "blocked - finish conversion scorecard before selling this channel"
  ]),
  row("SEO / search trust", seoReady, [
    "ready - site/page structure can be reviewed",
    "ready - search trust improvement tied to buyer intent",
    "ready - weekly search trust measurement exists",
    "ready - search trust layer is filled",
    "ready - continue on-site search trust"
  ], [
    "pending - editable site or search intent not proven",
    "pending - search trust economics not documented",
    "pending - title/meta/headings/FAQ/crawl measurement missing",
    "pending - search trust layer not approved",
    "blocked - do not sell SEO until search trust layer is filled"
  ]),
  row("Content / authority", contentReady, [
    "ready - proof claims and brand voice exist",
    "ready - expertise/proof can support authority content",
    "ready - content can be tied to proof and measurement",
    "ready - claims have approved sources",
    "ready - create proof-backed content assets"
  ], [
    "pending - proof or POV needs source material",
    "pending - content economics not tied to buyer path",
    "pending - distribution/measurement not defined",
    "pending - claim approvals incomplete",
    "blocked - do not sell generic blog volume"
  ]),
  row("Paid search", false, [
    "", "", "", "", ""
  ], [
    "pending - ad account access not confirmed",
    "pending - budget and lead/customer value not confirmed",
    "pending - conversion tracking and stop rule missing",
    "pending - approval owner not confirmed",
    "blocked - no ad spend management without tracking, budget, and stop rules"
  ]),
  row("Paid social", false, [
    "", "", "", "", ""
  ], [
    "pending - paid social account and creative inputs not confirmed",
    "pending - budget and creative refresh economics missing",
    "pending - landing-page and tracking loop missing",
    "pending - creative approval cadence missing",
    "blocked - do not sell paid social without creative testing capacity"
  ]),
  row("Email/SMS/lifecycle", false, [
    "", "", "", "", ""
  ], [
    "pending - ESP/SMS access and consented list not confirmed",
    "pending - lifecycle economics/list size not confirmed",
    "pending - flow metrics and unsubscribe path missing",
    "pending - compliance approval missing",
    "blocked - no email/SMS without consent and unsubscribe path"
  ]),
  row("Social / distribution", socialReady, [
    "ready - voice and proof-backed post inputs exist",
    "ready - social can support proof distribution",
    "ready - engagement/retain signal can be watched weekly",
    "ready - claims and voice are source-backed",
    "ready - publish proof-backed posts with approval"
  ], [
    "pending - voice, proof, or approval cadence incomplete",
    "pending - buyer path from social not defined",
    "pending - engagement or referral signal missing",
    "pending - posting approval owner missing",
    "blocked - do not sell generic daily posting"
  ]),
  row("Local/reputation", false, [
    "", "", "", "", ""
  ], [
    "pending - real location/service area and GBP access not confirmed",
    "pending - review/reputation economics not confirmed",
    "pending - review request metric missing",
    "pending - testimonial/review approval missing",
    "blocked - no fake reviews, locations, citations, or reputation claims"
  ]),
  row("Analytics / attribution", analyticsReady, [
    "ready - source-of-truth measurement is documented",
    "ready - decision rule connects signal to action",
    "ready - measurement contract is filled",
    "ready - owner and check cadence are clear",
    "ready - use analytics to choose next weekly action"
  ], [
    "pending - source-of-truth metric not documented",
    "pending - economics/decision rule incomplete",
    "pending - measurement contract missing",
    "pending - owner/check cadence incomplete",
    "blocked - do not expand channels without a measurement contract"
  ]),
  row("Creative / design", creativeReady, [
    "ready - approved proof and before/after asset exist",
    "ready - creative tied to buyer value",
    "ready - creative outcome has next measurement",
    "ready - proof source approved",
    "ready - create approval-ready assets"
  ], [
    "pending - approved message or proof asset missing",
    "pending - buyer value not documented",
    "pending - creative measurement missing",
    "pending - proof approval incomplete",
    "blocked - do not ship creative with unsupported claims"
  ]),
  row("Marketing automation", automationReady, [
    "ready - weekly workflow and dashboard exist",
    "ready - automation saves owner time and supports retention",
    "ready - run log, learning, and confirmation signals exist",
    "ready - human review gate remains in place",
    "ready - run weekly automation with owner review"
  ], [
    "pending - recurring input/output/check not complete",
    "pending - automation value not proven",
    "pending - weekly run signal missing",
    "pending - human review gate incomplete",
    "blocked - do not automate sending, approving, publishing, or budget changes"
  ])
];

const table = [
  "| Channel | Access Ready | Economics Ready | Measurement Ready | Approval Ready | Decision |",
  "|---|---|---|---|---|---|",
  ...rows.map((cells) => `| ${cells.join(" | ")} |`)
].join("\n");

const summary = parseChannelReadiness(`## Scorecard\n\n${table}`);

const nextRecommendation = summary.operatorPodReady
  ? "Operator-Led Growth Pod is structurally ready, but still needs paid-client proof and delivery capacity before selling."
  : summary.fullStackGrowthDeskReady
    ? "Full-Stack Growth Desk is structurally ready if the client has budget and implementation capacity."
    : summary.weeklyGrowthDeskReady
      ? "Weekly Growth Desk is ready: keep one visible improvement loop per week."
      : summary.proofSprintReady
        ? "Proof Sprint is ready: prove value before expanding scope."
        : "Stay in setup mode: do not expand scope until CRO and search trust are ready.";

const markdown = `# Channel Readiness Scorecard

Generated: ${today}

Use this before selling or delivering any channel beyond the first proof sprint.

## Rule

Do not sell a channel because the client asked for it. Sell it only when the client has the access, economics, signal, and approval cadence to make the channel worth running.

## Status

- Current status: ${summary.status}
- Ready channels: ${summary.readyChannels.length ? summary.readyChannels.join(", ") : "none"}
- Blocked channels: ${summary.blockedChannels.length ? summary.blockedChannels.join(", ") : "none"}
- Proof Sprint ready: ${summary.proofSprintReady ? "yes" : "no"}
- Weekly Growth Desk ready: ${summary.weeklyGrowthDeskReady ? "yes" : "no"}
- Full-Stack Growth Desk ready: ${summary.fullStackGrowthDeskReady ? "yes" : "no"}
- Operator-Led Growth Pod ready: ${summary.operatorPodReady ? "yes" : "no"}

## Next Channel Recommendation

${nextRecommendation}

## Scorecard

${table}

## Retainer Fit

| Retainer | Minimum Channel Readiness | Current Fit |
|---|---|---|
| Proof Sprint | CRO / conversion and SEO / search trust | ${summary.proofSprintReady ? "ready" : "not ready"} |
| Weekly Growth Desk | Proof Sprint plus at least one of content, paid angle support, email, local/reputation, or analytics | ${summary.weeklyGrowthDeskReady ? "ready" : "not ready"} |
| Full-Stack Growth Desk | CRO, analytics, and at least two active growth channels | ${summary.fullStackGrowthDeskReady ? "ready" : "not ready"} |
| Operator-Led Growth Pod | Full-stack fit plus lifecycle/email, paid or SEO engine, automation, and capacity | ${summary.operatorPodReady ? "ready" : "not ready"} |

## Guardrails

- Do not promise revenue, ROAS, rankings, or sales lift.
- Do not sell ad management without tracking, budget, and stop rules.
- Do not sell SEO without a real horizon and implementation access.
- Do not sell email/SMS without consent, deliverability basics, and unsubscribe path.
- Do not buy backlinks, fake reviews, fake citations, fake mentions, spam directories, or doorway pages.
- Do not expand scope without a written change order or new monthly tier.
`;

mkdirSync(join(clientPath, "quality"), { recursive: true });
writeFileSync(outputPath, markdown);

console.log(JSON.stringify({
  status: summary.status,
  path: outputPath,
  clientPath,
  readyChannels: summary.readyChannels,
  blockedChannels: summary.blockedChannels,
  proofSprintReady: summary.proofSprintReady,
  weeklyGrowthDeskReady: summary.weeklyGrowthDeskReady,
  fullStackGrowthDeskReady: summary.fullStackGrowthDeskReady,
  operatorPodReady: summary.operatorPodReady
}, null, 2));
