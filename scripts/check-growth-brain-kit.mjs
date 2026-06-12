#!/usr/bin/env node
import { readFileSync, existsSync, mkdirSync, rmSync, writeFileSync, readdirSync, statSync, cpSync } from "node:fs";
import { execFileSync } from "node:child_process";
import { sendChannelGuidance } from "./lib/send-channel-guidance.mjs";

const requiredFiles = [
  "PRODUCT.md",
  "growth-brain/README.md",
  "growth-brain/offer.md",
  "growth-brain/positioning/message-house.md",
  "growth-brain/agency-operating-model.md",
  "growth-brain/build-roadmap.md",
  "growth-brain/optimization/10x-opportunity-register.md",
  "growth-brain/strategy/full-stack-growth-offer-ladder.md",
  "growth-brain/ops/command-center.md",
  "growth-brain/ops/metrics-dashboard.md",
  "growth-brain/ops/live-metrics.md",
  "growth-brain/ops/internal-dashboard.md",
  "growth-brain/ops/internal-dashboard.html",
  "growth-brain/ops/full-stack-growth-map.md",
  "growth-brain/ops/retention-checkups.md",
  "growth-brain/ops/retention-dashboard.html",
  "growth-brain/ops/proof-library.md",
  "growth-brain/ops/growth-cockpit.html",
  "growth-brain/ops/11-10-proof-run.md",
  "growth-brain/ops/daily-review-template.md",
  "growth-brain/ops/market-proof-cockpit.md",
  "growth-brain/ops/market-proof-cockpit.html",
  "growth-brain/ops/market-learning-review.md",
  "growth-brain/ops/market-learning-review.html",
  "growth-brain/ops/owned-product-case-studies.md",
  "growth-brain/ops/owned-product-case-studies.html",
  "growth-brain/ops/owned-product-workflow-proofs.md",
  "growth-brain/ops/owned-product-workflow-proofs.html",
  "growth-brain/ops/owned-handoff-loom-cockpit.md",
  "growth-brain/ops/owned-handoff-loom-cockpit.html",
  "growth-brain/ops/competitive-proof-matrix.md",
  "growth-brain/ops/competitive-proof-matrix.html",
  "growth-brain/positioning/tangible-improvement-moat.md",
  "growth-brain/prospecting/search-query-bank.md",
  "growth-brain/prospecting/warm-network-scripts.md",
  "growth-brain/prospecting/first-50-list-template.md",
  "growth-brain/sprint-checklist.md",
  "growth-brain/delivery-template.md",
  "growth-brain/delivery/implementation-handoff-template.md",
  "growth-brain/delivery/client-communication-cadence.md",
  "growth-brain/weekly-report-template.md",
  "growth-brain/loom-audit-script.md",
  "growth-brain/outreach-tracker.md",
  "growth-brain/sales/one-page-offer.md",
  "growth-brain/sales/managed-it-one-page-offer.md",
  "growth-brain/sales/managed-it-one-page-offer.html",
  "growth-brain/sales/proposal-template.md",
  "growth-brain/sales/sales-call-script.md",
  "growth-brain/sales/objection-handling.md",
  "growth-brain/sales/buyer-room-template.md",
  "growth-brain/sales/follow-up-sequences.md",
  "growth-brain/sales/send-checklist.md",
  "growth-brain/sales/value-calculator.md",
  "growth-brain/sales/pricing-rules.md",
  "growth-brain/ai-visibility/prompt-bank.md",
  "growth-brain/ai-visibility/ai-search-audit-workflow.md",
  "growth-brain/verticals/README.md",
  "growth-brain/verticals/managed-it-cybersecurity.md",
  "growth-brain/verticals/accounting-bookkeeping.md",
  "growth-brain/verticals/dental-medspa-clinics.md",
  "growth-brain/verticals/home-services.md",
  "growth-brain/quality/sprint-acceptance-checklist.md",
  "growth-brain/quality/claim-proof-ledger.md",
  "growth-brain/quality/conversion-optimization-playbook.md",
  "growth-brain/quality/conversion-optimization-scorecard.md",
  "growth-brain/quality/delivery-scorecard.md",
  "growth-brain/quality/customer-delight-playbook.md",
  "growth-brain/quality/search-trust-layer.md",
  "growth-brain/quality/channel-readiness-scorecard.md",
  "growth-brain/quality/readiness-gates.md",
  "growth-brain/retention/weekly-growth-desk-playbook.md",
  "growth-brain/retention/outsized-value-retention-system.md",
  "growth-brain/retention/client-health-score.md",
  "growth-brain/retention/expansion-triggers.md",
  "growth-brain/retention/case-study-template.md",
  "growth-brain/workflows/README.md",
  "growth-brain/workflows/repeatable-workflow-operating-system.md",
  "growth-brain/workflows/daily-sales-workflow.md",
  "growth-brain/workflows/lead-scoring-workflow.md",
  "growth-brain/workflows/loom-audit-workflow.md",
  "growth-brain/workflows/conversion-audit-workflow.md",
  "growth-brain/workflows/client-sprint-workflow.md",
  "growth-brain/workflows/full-stack-growth-desk-workflow.md",
  "growth-brain/workflows/weekly-client-value-loop.md",
  "growth-brain/workflows/weekly-growth-desk-workflow.md",
  "growth-brain/agents/product-page-fixer.md",
  "growth-brain/agents/landing-page-fixer.md",
  "growth-brain/agents/site-architecture-fixer.md",
  "growth-brain/agents/ad-angle-generator.md",
  "growth-brain/agents/email-sms-generator.md",
  "growth-brain/agents/competitor-watcher.md",
  "growth-brain/agents/weekly-performance-analyst.md",
  "growth-brain/agents/marketing-agent-workbench.md",
  "growth-brain/client-brain-template/brand-voice.md",
  "growth-brain/client-brain-template/products.md",
  "growth-brain/client-brain-template/reviews.md",
  "growth-brain/client-brain-template/competitors.md",
  "growth-brain/client-brain-template/website-notes.md",
  "growth-brain/client-brain-template/site-architecture.md",
  "growth-brain/client-brain-template/ad-email-history.md",
  "growth-brain/client-brain-template/analytics.md",
  "growth-brain/client-brain-template/weekly-learnings.md",
  "docs/strategy/growth-brain-agency-plan.md",
  "docs/strategy/first-14-days.md",
  "docs/strategy/market-parity-benchmark-2026.md",
  "docs/research/current-market-signals-2026.md",
  "docs/research/rob-hoffman-agency-video-notes-2026-04-19.md",
  "skills/revenue-page-conversion-audit/SKILL.md",
  "scripts/create-client-sprint.mjs",
  "scripts/check-outbound-claim-safety.mjs",
  "scripts/configure-sender-setup.mjs",
  "scripts/check-outbound-sender-setup.mjs",
  "scripts/export-sender-setup-guide.mjs",
  "scripts/check-outbound-send-readiness.mjs",
  "scripts/date-utils.mjs",
  "scripts/lib/contact-route.mjs",
  "scripts/lib/list-operational-folders.mjs",
  "scripts/lib/reply-worthy-proof.mjs",
  "scripts/draft-client-kickoff.mjs",
  "scripts/export-client-facing-dashboard.mjs",
  "scripts/export-client-renewal-review.mjs",
  "scripts/export-client-weekly-report.mjs",
  "scripts/check-client-weekly-report.mjs",
  "scripts/lib/channel-readiness.mjs",
  "scripts/export-client-channel-readiness.mjs",
  "scripts/check-client-channel-readiness.mjs",
  "scripts/export-full-stack-growth-map.mjs",
  "scripts/review-client-proof.mjs",
  "scripts/review-client-acceptance.mjs",
  "scripts/review-owned-startup-proof.mjs",
  "scripts/export-owned-product-case-studies.mjs",
  "scripts/export-client-repeatable-workflow.mjs",
  "scripts/export-owned-product-workflow-proofs.mjs",
  "scripts/update-owned-product-metrics.mjs",
  "scripts/export-owned-product-live-signals.mjs",
  "scripts/export-owned-handoff-loom-cockpit.mjs",
  "scripts/complete-owned-handoff-looms.mjs",
  "scripts/check-retention-automation.mjs",
  "scripts/seed-owned-startup-proof-lane.mjs",
  "scripts/export-owned-startup-proof-capture.mjs",
  "scripts/export-retention-checkups.mjs",
  "scripts/create-prospect-audit.mjs",
  "scripts/import-prospects.mjs",
  "scripts/batch-score-prospects.mjs",
  "scripts/check-lead-score-integrity.mjs",
  "scripts/export-lead-scoring-cockpit.mjs",
  "scripts/enrich-prospect-contact-plan.mjs",
  "scripts/draft-loom-package.mjs",
  "scripts/add-prospect-loom-link.mjs",
  "scripts/prepare-prospect-send.mjs",
  "scripts/prepare-prospect-batch-send.mjs",
  "scripts/update-market-proof-looms.mjs",
  "scripts/prepare-market-proof-after-recording.mjs",
  "scripts/complete-prospect-batch-send.mjs",
  "scripts/draft-loom-recording-script.mjs",
  "scripts/snapshot-prospect-page.mjs",
  "scripts/snapshot-recording-batch.mjs",
  "scripts/draft-recording-sharpness-brief.mjs",
  "scripts/prepare-recording-batch.mjs",
  "scripts/update-prospect-pipeline.mjs",
  "scripts/draft-prospect-message.mjs",
  "scripts/export-recording-queue.mjs",
  "scripts/export-recording-cockpit.mjs",
  "scripts/export-recording-teleprompter.mjs",
  "scripts/export-recording-rehearsal-check.mjs",
  "scripts/export-prospect-outbox.mjs",
  "scripts/export-followup-cockpit.mjs",
  "scripts/prepare-prospect-reply.mjs",
  "scripts/prepare-prospect-call-booked.mjs",
  "scripts/draft-sales-call-prep.mjs",
  "scripts/prepare-prospect-close-package.mjs",
  "scripts/export-sales-cockpit.mjs",
  "scripts/convert-prospect-to-client.mjs",
  "scripts/check-prospect-readiness.mjs",
  "scripts/check-client-readiness.mjs",
  "scripts/export-client-delivery-cockpit.mjs",
  "scripts/show-growth-command-center.mjs",
  "scripts/export-growth-cockpit.mjs",
  "scripts/export-growth-metrics.mjs",
  "scripts/export-internal-dashboard.mjs",
  "scripts/check-generated-ui-surfaces.mjs",
  "scripts/export-proof-library.mjs",
  "scripts/export-market-benchmark.mjs",
  "scripts/check-market-parity-readiness.mjs",
  "scripts/export-market-proof-run.mjs",
  "scripts/check-market-proof-run.mjs",
  "scripts/export-market-proof-cockpit.mjs",
  "scripts/export-market-learning-review.mjs",
  "scripts/export-managed-it-one-pager.mjs",
  "specs/001-growth-brain-agency/spec.md",
  "specs/001-growth-brain-agency/plan.md",
  "specs/001-growth-brain-agency/tasks.md"
];

const agentFiles = requiredFiles.filter((file) => file.startsWith("growth-brain/agents/"));
const failures = [];
const channelGuidance = sendChannelGuidance();
const senderEmailReady = channelGuidance.emailReady;
const lockDir = ".tmp/check-growth-brain-kit.lock";

function sleep(ms) {
  Atomics.wait(new Int32Array(new SharedArrayBuffer(4)), 0, 0, ms);
}

function acquireKitCheckLock() {
  mkdirSync(".tmp", { recursive: true });
  const startedAt = Date.now();
  while (Date.now() - startedAt < 120000) {
    try {
      mkdirSync(lockDir);
      writeFileSync(`${lockDir}/owner.txt`, `${process.pid}\n`);
      const release = () => rmSync(lockDir, { recursive: true, force: true });
      process.on("exit", release);
      process.on("SIGINT", () => {
        release();
        process.exit(130);
      });
      process.on("SIGTERM", () => {
        release();
        process.exit(143);
      });
      return true;
    } catch (error) {
      if (error.code !== "EEXIST") throw error;
      try {
        const ageMs = Date.now() - statSync(lockDir).mtimeMs;
        if (ageMs > 120000) {
          rmSync(lockDir, { recursive: true, force: true });
          continue;
        }
      } catch {
        rmSync(lockDir, { recursive: true, force: true });
        continue;
      }
      sleep(250);
    }
  }
  failures.push("Timed out waiting for the Growth Brain kit checker lock");
  return false;
}

if (!acquireKitCheckLock()) {
  console.error(JSON.stringify({ status: "fail", failures }, null, 2));
  process.exit(1);
}

for (const file of requiredFiles) {
  if (!existsSync(file)) {
    failures.push(`Missing required file: ${file}`);
    continue;
  }

  const content = readFileSync(file, "utf8").trim();
  if (content.length < 80) failures.push(`File is too thin to use: ${file}`);
}

for (const file of agentFiles) {
  if (!existsSync(file)) continue;
  const content = readFileSync(file, "utf8");
  for (const heading of ["## Inputs", "## Checklist", "## Output", "## Approval Gate", "## Measurement"]) {
    if (!content.includes(heading)) failures.push(`${file} missing ${heading}`);
  }
}

for (const file of ["scripts/export-growth-metrics.mjs", "scripts/export-prospect-outbox.mjs"]) {
  const content = readFileSync(file, "utf8");
  if (!content.includes("isValidLoomUrl") || !content.includes("loomMatch") || !content.includes("hasApprovedSendPackage") || !content.includes("Loom quality") || !content.includes("Readiness")) {
    failures.push(`${file} must trust only valid Loom links with approved send packages`);
  }
}

for (const file of ["scripts/draft-prospect-message.mjs", "scripts/draft-loom-recording-script.mjs", "scripts/export-recording-cockpit.mjs"]) {
  const content = readFileSync(file, "utf8");
  if (/prospect:stage -- [^\n]+ sent --channel/.test(content) || content.includes("Stage Sent:")) {
    failures.push(`${file} must route sent-stage movement through the outbox confirmation flow`);
  }
}

{
  const content = readFileSync("scripts/export-prospect-outbox.mjs", "utf8");
  if (!content.includes("orderedStageChannels") || !content.includes("linkedin") || !content.includes("mixed") || !content.includes("Mark Sent: ${channelLabel(channel)}")) {
    failures.push("scripts/export-prospect-outbox.mjs must expose full-channel sent-stage buttons");
  }
  if (!content.includes("recording-notes.md") || !content.includes("Recording Notes")) {
    failures.push("scripts/export-prospect-outbox.mjs must surface recording notes at send time");
  }
  for (const phrase of ["routedContactPlan", "routeToChannel", "Email blocked until send setup is clean"]) {
    if (!content.includes(phrase)) failures.push(`scripts/export-prospect-outbox.mjs missing routed non-email send route phrase: ${phrase}`);
  }
}

{
  const route = readFileSync("scripts/lib/contact-route.mjs", "utf8");
  for (const phrase of ["safeNonEmailRoute", "routedContactPlan", "routeToChannel", "Email route after sender setup", "Use contact form/page", "Use LinkedIn DM/profile"]) {
    if (!route.includes(phrase)) failures.push(`contact route helper missing ${phrase}`);
  }
  const replyProof = readFileSync("scripts/lib/reply-worthy-proof.mjs", "utf8");
  for (const phrase of ["replyWorthiness", "Reply-Worthy Proof Gate", "Recording notes complete", "Specific visible leak", "No unsupported outcome claim", "score >= 8"]) {
    if (!replyProof.includes(phrase)) failures.push(`reply-worthy proof gate missing ${phrase}`);
  }
  const contactPlan = readFileSync("scripts/enrich-prospect-contact-plan.mjs", "utf8");
  for (const phrase of ["safeNonEmailRoute", "Safe Route While Email Blocked"]) {
    if (!contactPlan.includes(phrase)) failures.push(`contact plan enrichment missing non-email route phrase: ${phrase}`);
  }
}

{
  const content = readFileSync("scripts/complete-prospect-batch-send.mjs", "utf8");
  if (!content.includes("Loom quality") || !content.includes("--force")) {
    failures.push("scripts/complete-prospect-batch-send.mjs must require Loom quality approval before marking sent");
  }
  if (!content.includes("Reply-Worthy Proof Gate") || !content.includes("8+/10 reply-worthy proof gate")) {
    failures.push("scripts/complete-prospect-batch-send.mjs must require reply-worthy send packages before marking sent");
  }
  if (!content.includes("sendChannelGuidance") || !content.includes("sender setup is not clean for email")) {
    failures.push("scripts/complete-prospect-batch-send.mjs must block email sent rows while sender setup is dirty");
  }
}

{
  const content = readFileSync("scripts/update-prospect-pipeline.mjs", "utf8");
  if (!content.includes("followUpStageReady") || !content.includes("pipelineProgressionReady") || !content.includes("not due until") || !content.includes("mark sent first") || !content.includes("Growth Brain learns") || !content.includes("--force")) {
    failures.push("scripts/update-prospect-pipeline.mjs must prevent premature follow-up and sales progression staging");
  }
  if (!content.includes("sendChannelGuidance") || !content.includes("Cannot mark email send")) {
    failures.push("scripts/update-prospect-pipeline.mjs must block email staging while sender setup is dirty");
  }
}

for (const file of ["scripts/prepare-prospect-send.mjs", "scripts/prepare-prospect-batch-send.mjs"]) {
  const content = readFileSync(file, "utf8");
  if (/prospect:stage -- [^\n]+ sent --channel email/.test(content) || /sent --channel email/.test(content)) {
    failures.push(`${file} must not expose direct email sent-stage shortcuts`);
  }
}

{
  const content = readFileSync("scripts/export-followup-cockpit.mjs", "utf8");
  if (!content.includes("validStageChannels") || !content.includes("linkedin") || !content.includes("phone") || !content.includes("preferredStageChannel")) {
    failures.push("scripts/export-followup-cockpit.mjs must preserve full follow-up channel memory");
  }
}

{
  const content = readFileSync("scripts/export-sales-cockpit.mjs", "utf8");
  if (!content.includes("lostCopyButton") || !content.includes("data-lost-copy") || !content.includes("Add loss reason") || !content.includes("__LOSS_REASON__")) {
    failures.push("scripts/export-sales-cockpit.mjs must require a specific loss reason before copying lost-stage commands");
  }
}

{
  const content = readFileSync("scripts/convert-prospect-to-client.mjs", "utf8");
  if (!content.includes("marked won") || !content.includes("close-package.md") || !content.includes("--force")) {
    failures.push("scripts/convert-prospect-to-client.mjs must require an explicit win before client conversion");
  }
}

{
  const content = readFileSync("scripts/prepare-prospect-call-booked.mjs", "utf8");
  if (!content.includes("requires a real call time") || !content.includes("--force")) {
    failures.push("scripts/prepare-prospect-call-booked.mjs must require a real call time before staging call-booked");
  }
}

{
  const content = readFileSync("scripts/prepare-prospect-close-package.mjs", "utf8");
  if (!content.includes("requires a call-booked or won prospect") || !content.includes("--force")) {
    failures.push("scripts/prepare-prospect-close-package.mjs must require a real sales conversation before close prep");
  }
}

{
  const content = readFileSync("scripts/check-client-readiness.mjs", "utf8");
  if (!content.includes("hasApprovedClaimRow") || !content.includes("average is below 4") || !content.includes("score below 3") || !content.includes("checklistComplete") || !content.includes("deliveryContentWarnings") || !content.includes("handoffContentStatus") || !content.includes("reportContentStatus") || !content.includes("conversionScorecardStatus") || !content.includes("Conversion scorecard search trust layer is not filled") || !content.includes("parseChannelReadiness") || !content.includes("Channel readiness is not proof-sprint ready")) {
    failures.push("scripts/check-client-readiness.mjs must require real proof, passing scorecards, completed acceptance checklists, conversion scorecards, search trust layers, channel readiness, and filled delivery artifacts");
  }
  const weeklyCheck = readFileSync("scripts/check-client-weekly-report.mjs", "utf8");
  for (const phrase of ["Weekly report has no shipped work", "Weekly report has no filled revenue leak loop row", "Weekly report has no filled search trust review row", "Weekly report has no learning", "Weekly report missing ${label}", "Weekly report has no filled measurement contract", "What felt valuable", "Why retain next month", "Client saw delta", "Continue / retain signal", "Client brain weekly learnings log", "--strict"]) {
    if (!weeklyCheck.includes(phrase)) failures.push(`weekly report checker missing ${phrase}`);
  }
  const weeklyExport = readFileSync("scripts/export-client-weekly-report.mjs", "utf8");
  for (const phrase of ["check-client-weekly-report.mjs", "Client Brain Update", "Revenue Leak Loop", "Search Trust Review", "Retention Value Stack", "Client Pulse", "Client Confirmation", "Measurement Contract", "Continue / retain signal", "30-Day Action Plan", "numbersToReviewTable", "reports/week-"]) {
    if (!weeklyExport.includes(phrase)) failures.push(`weekly report exporter missing ${phrase}`);
  }
  const fullStackLadder = readFileSync("growth-brain/strategy/full-stack-growth-offer-ladder.md", "utf8");
  for (const phrase of ["Full-Stack Growth Desk", "$5,000-$12,000/month", "Operator-Led Growth Pod", "$12,000+/month", "SEO / search trust", "Paid search", "Email/SMS/lifecycle", "Channel Menu", "Market Pricing Anchors", "WebFX", "SmartSites", "Ignite Visibility", "HubSpot"]) {
    if (!fullStackLadder.includes(phrase)) failures.push(`full-stack offer ladder missing ${phrase}`);
  }
  const channelReadiness = readFileSync("growth-brain/quality/channel-readiness-scorecard.md", "utf8");
  for (const phrase of ["Channel Readiness Scorecard", "Paid search", "Email/SMS/Lifecycle", "Analytics / Attribution", "Marketing Automation", "Retainer Fit", "Do not sell a channel because the client asked for it"]) {
    if (!channelReadiness.includes(phrase)) failures.push(`channel readiness scorecard missing ${phrase}`);
  }
  const channelLib = readFileSync("scripts/lib/channel-readiness.mjs", "utf8");
  for (const phrase of ["CHANNELS", "parseChannelReadiness", "proofSprintReady", "weeklyGrowthDeskReady", "fullStackGrowthDeskReady", "operatorPodReady", "isReadyValue"]) {
    if (!channelLib.includes(phrase)) failures.push(`channel readiness helper missing ${phrase}`);
  }
  const channelExporter = readFileSync("scripts/export-client-channel-readiness.mjs", "utf8");
  for (const phrase of ["Channel Readiness Scorecard", "Do not sell a channel because the client asked for it", "CRO / conversion", "SEO / search trust", "Paid search", "Email/SMS/lifecycle", "Marketing automation", "Retainer Fit", "Guardrails", "parseChannelReadiness"]) {
    if (!channelExporter.includes(phrase)) failures.push(`client channel readiness exporter missing ${phrase}`);
  }
  const channelChecker = readFileSync("scripts/check-client-channel-readiness.mjs", "utf8");
  for (const phrase of ["check-client-channel-readiness", "proofSprintReady", "weeklyGrowthDeskReady", "fullStackGrowthDeskReady", "operatorPodReady", "No channels are ready yet", "Proof Sprint channel gate"]) {
    if (!channelChecker.includes(phrase)) failures.push(`client channel readiness checker missing ${phrase}`);
  }
  const fullStackWorkflow = readFileSync("growth-brain/workflows/full-stack-growth-desk-workflow.md", "utf8");
  for (const phrase of ["Full-Stack Growth Desk Workflow", "SEO / Search Trust", "Paid Ads", "Email/SMS", "Monthly Review", "Expansion Rules", "$5,000-$12,000/month", "$12,000+/month", "No ad spend management without tracking"]) {
    if (!fullStackWorkflow.includes(phrase)) failures.push(`full-stack growth workflow missing ${phrase}`);
  }
  const fullStackMap = readFileSync("scripts/export-full-stack-growth-map.mjs", "utf8");
  for (const phrase of ["Full-Stack Growth Map", "Full-Stack Growth Desk", "Operator-Led Growth Pod", "channels.length", "sources.length", "growth-brain/ops/full-stack-growth-map.md", "WebFX package pricing", "GoodFirms 2026 digital marketing pricing"]) {
    if (!fullStackMap.includes(phrase)) failures.push(`full-stack growth map exporter missing ${phrase}`);
  }
  const weeklyLoop = readFileSync("scripts/run-weekly-client-value-loop.mjs", "utf8");
  for (const phrase of ["ops/weekly-runs", "export-client-weekly-report.mjs", "check-client-weekly-report.mjs", "export-client-channel-readiness.mjs", "check-client-channel-readiness.mjs", "Export channel readiness", "Check channel readiness", "export-client-repeatable-workflow.mjs", "Export repeatable workflow", "Workflow proof", "export-client-facing-dashboard.mjs", "export-client-renewal-review.mjs", "export-client-delivery-cockpit.mjs", "check-client-readiness.mjs", "review-client-proof.mjs", "review-client-acceptance.mjs", "Do not copy proof", "Do not send client messages automatically", "growth-brain/ops/weekly-client-value-loop.md"]) {
    if (!weeklyLoop.includes(phrase)) failures.push(`weekly client value loop missing ${phrase}`);
  }
  const repeatableWorkflow = readFileSync("growth-brain/workflows/repeatable-workflow-operating-system.md", "utf8");
  for (const phrase of ["Repeatable Workflow Operating System", "Find the real bottleneck", "Study the gap", "Draw inspiration from four places", "Extract the principle", "Design the flow", "Build the system", "Delegate execution deliberately", "Feed results back", "Client Folder Rule", "Automation Boundary", "Done State"]) {
    if (!repeatableWorkflow.includes(phrase)) failures.push(`repeatable workflow operating system missing ${phrase}`);
  }
  const workflowsReadme = readFileSync("growth-brain/workflows/README.md", "utf8");
  if (!workflowsReadme.includes("repeatable-workflow-operating-system.md") || !workflowsReadme.includes("Canonical Loop")) {
    failures.push("workflow README must expose the repeatable workflow operating system and canonical loop");
  }
  const clientDashboard = readFileSync("scripts/export-client-facing-dashboard.mjs", "utf8");
  for (const phrase of ["Client Dashboard", "What Changed", "What We Learned", "Value Ledger", "Value Proof Score", "valueProofScore", "Measurement Contract", "Revenue Leak Loop", "Search Trust Review", "Channel Readiness", "channelReadiness", "readyChannels", "measurementContractComplete", "Retention / Delight Pulse", "Client Confirmation", "clientConfirmed", "Tangible Improvement", "Next Action", "Approved Proof", "Missing Before Client-Ready", "check-client-readiness.mjs", "check-client-weekly-report.mjs", "check-client-channel-readiness.mjs", "client-dashboard.html"]) {
    if (!clientDashboard.includes(phrase)) failures.push(`client-facing dashboard exporter missing ${phrase}`);
  }
  const renewalReview = readFileSync("scripts/export-client-renewal-review.mjs", "utf8");
  for (const phrase of ["Monthly Renewal Review", "Value Evidence", "Client Confirmation", "Client confirmation is incomplete", "Next Month Plan", "Missing Before Renewal Ask", "do-not-pitch-renewal-yet", "ready-for-renewal-review", "export-client-facing-dashboard.mjs"]) {
    if (!renewalReview.includes(phrase)) failures.push(`client renewal review exporter missing ${phrase}`);
  }
  const proofReview = readFileSync("scripts/review-client-proof.mjs", "utf8");
  for (const phrase of ["Proof review mutations require", "--approve-scorecard", "claim-proof-ledger.md", "claim-review.md", "export-client-facing-dashboard.mjs", "check-client-readiness.mjs", "Cannot approve the conversion scorecard until at least one proof claim is approved", "Cannot approve claim until source evidence is found"]) {
    if (!proofReview.includes(phrase)) failures.push(`client proof review script missing ${phrase}`);
  }
  const acceptanceReview = readFileSync("scripts/review-client-acceptance.mjs", "utf8");
  for (const phrase of ["--handoff-loom=", "isValidLoomUrl", "Sprint acceptance checklist is not complete", "Handoff Proof", "export-client-facing-dashboard.mjs", "check-client-readiness.mjs"]) {
    if (!acceptanceReview.includes(phrase)) failures.push(`client acceptance review script missing ${phrase}`);
  }
  const ownedProofReview = readFileSync("scripts/review-owned-startup-proof.mjs", "utf8");
  for (const phrase of ["clients/ai-converter", "clients/siterep", "clients/five-to-nine-0509", "review-client-proof.mjs", "review-needed", "owned-proof-review.md", "owned-proof-review.html", "Tangible Improvement Review", "Client-Visible Value", "Use Externally", "tangibleImprovementRows", "Source Evidence", "Bulk Review Commands", "approve=all", "approve-scorecard", "acceptanceDryRunCommand", "handoffCockpitCommand", "owned:handoff", "dryRunApproveCommand", "applyRemoveCommand", "sourceReadyCount"]) {
    if (!ownedProofReview.includes(phrase)) failures.push(`owned proof review script missing ${phrase}`);
  }
  const ownedCaseStudies = readFileSync("scripts/export-owned-product-case-studies.mjs", "utf8");
  for (const phrase of ["Owned-Product Case Studies", "owned-product delivery proof", "External client proof is market proof", "Sales-Safe Outbound Line", "delivery-proof-ready", "Business metric", "needs-current-metric", "needsBusinessMetric", "Business Metric Capture Sheet", "LAST_REAL_VALUE", "Current Metric", "Measurement Contract", "Do not say this is client proof"]) {
    if (!ownedCaseStudies.includes(phrase)) failures.push(`owned product case-study exporter missing ${phrase}`);
  }
  const clientWorkflow = readFileSync("scripts/export-client-repeatable-workflow.mjs", "utf8");
  for (const phrase of ["Repeatable Workflow Proof", "Find the real bottleneck", "Study the gap", "Extract the principle", "Design the flow", "Build the system", "Delegate execution deliberately", "Feed results back", "What This Does Not Prove", "ops/repeatable-workflow.md", "repeatable-workflow-operating-system.md"]) {
    if (!clientWorkflow.includes(phrase)) failures.push(`client repeatable workflow exporter missing ${phrase}`);
  }
  const ownedWorkflow = readFileSync("scripts/export-owned-product-workflow-proofs.mjs", "utf8");
  for (const phrase of ["Owned Product Workflow Proofs", "clients/ai-converter", "clients/siterep", "clients/five-to-nine-0509", "export-client-repeatable-workflow.mjs", "owned-product delivery proof loops", "external market proof"]) {
    if (!ownedWorkflow.includes(phrase)) failures.push(`owned product workflow proof exporter missing ${phrase}`);
  }
  const ownedMetrics = readFileSync("scripts/update-owned-product-metrics.mjs", "utf8");
  for (const phrase of ["Owned Product Metrics Update", "--from-clipboard", "clients/ai-converter|Upload starts", "LAST_REAL_VALUE", "missing current metric value", "export-owned-product-case-studies.mjs", "Only use real observed numbers"]) {
    if (!ownedMetrics.includes(phrase)) failures.push(`owned product metrics updater missing ${phrase}`);
  }
  const ownedLiveSignals = readFileSync("scripts/export-owned-product-live-signals.mjs", "utf8");
  for (const phrase of ["Owned Product Live Signals", "Owned public proof surfaces passing", "public delivery signal", "not revenue proof", "update-owned-product-metrics.mjs", "owned-product-live-signals.html"]) {
    if (!ownedLiveSignals.includes(phrase)) failures.push(`owned product live-signal exporter missing ${phrase}`);
  }
  const ownedHandoff = readFileSync("scripts/export-owned-handoff-loom-cockpit.mjs", "utf8");
  for (const phrase of ["Owned Handoff Loom Cockpit", "ready-to-record", "Batch Completion Sheet", "owned:handoff-complete", "does not approve work automatically", "proof delta", "client:acceptance", "handoff-loom=LOOM_URL", "Handoff Loom Script", "What felt valuable", "This is owned-startup proof"]) {
    if (!ownedHandoff.includes(phrase)) failures.push(`owned handoff Loom cockpit missing ${phrase}`);
  }
  const ownedHandoffCompletion = readFileSync("scripts/complete-owned-handoff-looms.mjs", "utf8");
  for (const phrase of ["Owned Handoff Completion", "--from-clipboard", "--reviewer", "review-client-acceptance.mjs", "isValidLoomUrl", "does not create market proof", "owned:handoff-complete", "Real Loom share/embed URLs are required"]) {
    if (!ownedHandoffCompletion.includes(phrase)) failures.push(`owned handoff completion missing ${phrase}`);
  }
  const retentionCheckups = readFileSync("scripts/export-retention-checkups.mjs", "utf8");
  for (const phrase of ["retention-dashboard.html", "Monthly Checkups", "Weekly Checkups", "weeklyCommand", "Client confirmation", "continue/retain signal", "Record proof handoff", "owned:handoff", "--monthly", "client:renewal", "does not send anything automatically"]) {
    if (!retentionCheckups.includes(phrase)) failures.push(`retention checkups exporter missing ${phrase}`);
  }
  const retentionAutomation = readFileSync("scripts/check-retention-automation.mjs", "utf8");
  for (const phrase of ["tinystudio-retention-checkups", "Automation prompt missing", "weekly client value loop", "Do not send client messages", "approve claims automatically", "Friday retention prep"]) {
    if (!retentionAutomation.includes(phrase)) failures.push(`retention automation checker missing ${phrase}`);
  }
  const senderConfigure = readFileSync("scripts/configure-sender-setup.mjs", "utf8");
  for (const phrase of ["--physical-address=", "--dkim-selector=", "check-outbound-sender-setup.mjs", "export-sender-setup-guide.mjs", "dry-run", "Physical address must be real"]) {
    if (!senderConfigure.includes(phrase)) failures.push(`sender configure script missing ${phrase}`);
  }
  const senderSetup = readFileSync("scripts/check-outbound-sender-setup.mjs", "utf8");
  for (const phrase of ["dkimSelectorCandidates", "discoverDkimCandidates", "DKIM discovery", "Possible DKIM selector", "No common DKIM selectors were found"]) {
    if (!senderSetup.includes(phrase)) failures.push(`sender setup checker missing ${phrase}`);
  }
  const senderGuide = readFileSync("scripts/export-sender-setup-guide.mjs", "utf8");
  for (const phrase of ["DKIM Discovery", "dkimCandidateRows", "Suggested dry-run command", "confirm it in the mail provider"]) {
    if (!senderGuide.includes(phrase)) failures.push(`sender setup guide missing ${phrase}`);
  }
  const internalDashboard = readFileSync("scripts/export-internal-dashboard.mjs", "utf8");
  for (const phrase of ["Next / Pending Actions", "To-Do List", "Market proof cockpit", "Sender setup", "send:guide", "recommendedChannel", "Owned handoff", "Owned case studies", "owned:live-signals", "owned:metrics -- --from-clipboard", "market:learn", "parityBlockerCommand", "owned:proof-review", "owned:handoff", "growth:start -- --view=sales", "check-market-parity-readiness.mjs", "export-market-proof-cockpit.mjs", "export-retention-checkups.mjs", "export-owned-handoff-loom-cockpit.mjs", "show-growth-command-center.mjs", "growth-brain/ops/internal-dashboard.html"]) {
    if (!internalDashboard.includes(phrase)) failures.push(`internal dashboard exporter missing ${phrase}`);
  }
  const startup = readFileSync("scripts/start-growth-mission.mjs", "utf8");
  for (const phrase of ["recording-rehearsal-check.html", "market-proof-cockpit.html", "export-recording-rehearsal-check.mjs", "export-market-proof-cockpit.mjs"]) {
    if (!startup.includes(phrase)) failures.push(`growth:start record mode missing ${phrase}`);
  }
  const product = readFileSync("PRODUCT.md", "utf8");
  for (const phrase of ["Trust Wedge", "tangible improvement proof", "Search Trust Layer", "Before", "After", "Proof source", "Client-visible value", "Next measurement", "Retention signal", "Dashboards are only the surface"]) {
    if (!product.includes(phrase)) failures.push(`product context missing ${phrase}`);
  }
  const valueStress = readFileSync("scripts/export-value-retention-stress-test.mjs", "utf8");
  for (const phrase of ["Value And Retention Stress Test", "tangible improvement proof", "Customer-perceived value proof", "clientConfirmation", "Measurement contract", "clientsWithMeasurementContracts", "Comprehensive weekly value stack", "Market proof execution cockpit", "Client dashboard value proof", "Value proof score", "Handoff proof readiness", "owned:live-signals", "owned:handoff", "averageValueProofScore", "Paid client value proof", "Owned startup proof lane", "Owned product case-study packets", "ownedCaseStudyDeliveryReady", "ownedCaseStudyNeedsMetrics", "ownedCaseStudyNeedsBusinessMetrics", "External market proof", "duplicateBuyerValueRows", "Do not claim competitors lack this"]) {
    if (!valueStress.includes(phrase)) failures.push(`value retention stress test missing ${phrase}`);
  }
  const ownedProof = readFileSync("scripts/export-owned-startup-proof-capture.mjs", "utf8");
  for (const phrase of ["draft-owned-proof-captured", "owned-startup proof", "does not prove external market demand", "AI Converter", "SiteRep", "Five to Nine 0509", "owned-proof-evidence.md", "claim-review.md", "needs-client-confirmation", "Nish review required", "Approved:"]) {
    if (!ownedProof.includes(phrase)) failures.push(`owned startup proof capture missing ${phrase}`);
  }
  const moat = readFileSync("growth-brain/positioning/tangible-improvement-moat.md", "utf8");
  for (const phrase of ["Tangible Improvement Moat", "Why This Can Become The Moat", "Proof Unit", "Before", "After", "Client-visible value", "Measurement contract", "Decision rule", "weekly proof delta", "customer-perceived value", "Not a dashboard-only moat"]) {
    if (!moat.includes(phrase)) failures.push(`tangible improvement moat doc missing ${phrase}`);
  }
}

{
  const playbook = readFileSync("growth-brain/quality/conversion-optimization-playbook.md", "utf8");
  for (const phrase of ["Headline clarity", "Message match", "Direct Response Copy Layer", "So-What chain", "Positioning Angle Layer", "Email Sequence Layer", "Distribution Moat Layer", "Search Trust Layer", "buying backlinks", "Paid Ads Ops Layer", "AI/Search No-Hack Layer"]) {
    if (!playbook.includes(phrase)) failures.push(`conversion optimization playbook missing ${phrase}`);
  }
}

{
  const aiSearch = readFileSync("growth-brain/ai-visibility/ai-search-audit-workflow.md", "utf8");
  for (const phrase of ["LLMs.txt", "arbitrary chunking", "structured data", "buying backlinks", "Search Trust Layer", "fix that before worrying about AI systems"]) {
    if (!aiSearch.includes(phrase)) failures.push(`AI/search workflow missing no-hack rule: ${phrase}`);
  }
}

{
  const skill = readFileSync("skills/revenue-page-conversion-audit/SKILL.md", "utf8");
  if (!skill.includes("growth-brain/quality/conversion-optimization-playbook.md") || !skill.includes("growth-brain/quality/search-trust-layer.md") || !skill.includes("Top 5 failures") || !skill.includes("Do not invent proof") || !skill.includes("buying backlinks")) {
    failures.push("revenue-page conversion skill must point to the playbook, search trust layer, top failures, and proof guardrails");
  }
}

{
  const brief = readFileSync("scripts/draft-recording-sharpness-brief.mjs", "utf8");
  if (!brief.includes("Positioning Angle") || !brief.includes("Direct Response Slide") || !brief.includes("So-What Chain") || !brief.includes("Do not mention guaranteed revenue")) {
    failures.push("recording sharpness brief must encode angle, direct-response, so-what, and proof guardrails");
  }
  const prep = readFileSync("scripts/prepare-recording-batch.mjs", "utf8");
  const script = readFileSync("scripts/draft-loom-recording-script.mjs", "utf8");
  const teleprompter = readFileSync("scripts/export-recording-teleprompter.mjs", "utf8");
  const rehearsal = readFileSync("scripts/export-recording-rehearsal-check.mjs", "utf8");
  if (!prep.includes("draft-recording-sharpness-brief.mjs")) {
    failures.push("recording prep must generate sharpness briefs before scripts");
  }
  if (!prep.includes("export-recording-rehearsal-check.mjs") || !prep.includes("recording-rehearsal-check.html")) {
    failures.push("recording prep must generate the rehearsal quality gate before recording");
  }
  if (!script.includes("## Recording Sharpness") || !script.includes("recording-sharpness-brief.md") || !script.includes("scriptImpact") || !script.includes("genericImpact")) {
    failures.push("recording scripts must include the sharpness brief");
  }
  if (!teleprompter.includes("recording-sharpness-brief.md") || !teleprompter.includes("briefToBlocks")) {
    failures.push("recording teleprompter must expose the sharpness brief");
  }
  if (!teleprompter.includes("localHref") || !readFileSync("scripts/export-recording-cockpit.mjs", "utf8").includes("localHref")) {
    failures.push("recording HTML surfaces must use local relative links for prospect files");
  }
  for (const phrase of ["Recording Rehearsal Check", "Talk track", "Buyer impact", "Clean ask", "2-3 minute", "recording-rehearsal-check.html"]) {
    if (!rehearsal.includes(phrase)) failures.push(`recording rehearsal check missing ${phrase}`);
  }
  const packageJson = readFileSync("package.json", "utf8");
  if (!packageJson.includes("prospect:rehearsal")) {
    failures.push("package scripts must expose prospect:rehearsal");
  }
  const mission = readFileSync("scripts/export-daily-money-mission.mjs", "utf8");
  const batchSend = readFileSync("scripts/prepare-prospect-batch-send.mjs", "utf8");
  const sendPrep = readFileSync("scripts/prepare-prospect-send.mjs", "utf8");
  if (!teleprompter.includes("qualityNotes") || !teleprompter.includes("notes.leak") || !mission.includes("qualityNotes") || !mission.includes("notes.ask")) {
    failures.push("recording teleprompter and mission page must require leak, impact, fix, and ask notes");
  }
  for (const [fileName, content] of [
    ["scripts/export-daily-money-mission.mjs", mission],
    ["scripts/export-recording-teleprompter.mjs", teleprompter],
    ["scripts/export-recording-cockpit.mjs", readFileSync("scripts/export-recording-cockpit.mjs", "utf8")]
  ]) {
    if (!content.includes("routedContactPlan") || !content.includes("Channel rule")) {
      failures.push(`${fileName} must show sender-aware non-email routes while email setup is dirty`);
    }
  }
  if (!mission.includes("cleanAsk") || !mission.includes("7-day sprint where I map this leak")) {
    failures.push("daily money mission must clean weak offer-name asks before writing batch lines");
  }
  if (!mission.includes("proofRunImpact") || !mission.includes("market:after-recording") || !mission.includes("export-recording-rehearsal-check.mjs")) {
    failures.push("daily money mission must use specific proof impact, run rehearsal, and route recorded Loom URLs through market:after-recording");
  }
  const commandCenter = readFileSync("scripts/show-growth-command-center.mjs", "utf8");
  if (!commandCenter.includes("market:after-recording")) {
    failures.push("growth command center must route post-recording work through market:after-recording");
  }
  const outbox = readFileSync("scripts/export-prospect-outbox.mjs", "utf8");
  if (!outbox.includes("market:after-recording")) {
    failures.push("prospect outbox empty state must route post-recording work through market:after-recording");
  }
  const valueStress = readFileSync("scripts/export-value-retention-stress-test.mjs", "utf8");
  if (!valueStress.includes("Value specificity guard") || !valueStress.includes("genericValue")) {
    failures.push("value stress test must flag generic buyer-impact language");
  }
  for (const phrase of ["replyWorthiness", "formatReplyWorthinessMarkdown", "Reply-worthy proof score is below 8/10"]) {
    if (!sendPrep.includes(phrase)) failures.push(`send prep missing reply-worthy gate phrase: ${phrase}`);
  }
  if (!batchSend.includes("recording-notes.md") || !batchSend.includes("missing recording notes") || !sendPrep.includes("## Recording Notes")) {
    failures.push("batch send prep must preserve recording notes into send packages");
  }
}

{
  const workbench = readFileSync("growth-brain/agents/marketing-agent-workbench.md", "utf8");
  for (const phrase of ["Daily market research", "Content creation", "Competitor website monitoring", "Lead research", "Podcast or voice briefing", "Paid ads ops"]) {
    if (!workbench.includes(phrase)) failures.push(`marketing agent workbench missing ${phrase}`);
  }
}

{
  const parity = readFileSync("scripts/check-market-parity-readiness.mjs", "utf8");
  for (const phrase of ["Market proof", "Sales proof", "Delivery proof", "Retention proof", "Competitive Benchmark", "export-market-benchmark.mjs", "Owned Startup Proof Lane", "owned-startup", "check-client-weekly-report.mjs", "hasWonSalesProof", "approved claim folders", "market:benchmark", "market:proof-run", "--strict", "--skip-kit"]) {
    if (!parity.includes(phrase)) failures.push(`market parity readiness script missing ${phrase}`);
  }
  const proofRun = readFileSync("scripts/export-market-proof-run.mjs", "utf8");
  for (const phrase of ["11/10 Proof Run", "Proof Capture Rules", "Record and send 5 approved Looms", "won-stage note", "filled weekly report", "Do not claim better", "Email sent proof does not count", "routedContactPlan", "cleanAsk", "proofRunImpact", "genericImpact", "market:parity", "market:after-recording", "market:proof-check", "loomLinksPath", "LOOM_URL"]) {
    if (!proofRun.includes(phrase)) failures.push(`market proof run script missing ${phrase}`);
  }
  const recordings = readFileSync("scripts/update-market-proof-looms.mjs", "utf8");
  for (const phrase of ["URL-only", "--from-clipboard", "Existing Notes Preserved", "isValidLoomUrl", "prospects/loom-links.txt", "market-recordings-update.md", "preserve existing leak, impact, fix, and ask notes"]) {
    if (!recordings.includes(phrase)) failures.push(`market recordings updater missing ${phrase}`);
  }
  const operationalFolders = readFileSync("scripts/lib/list-operational-folders.mjs", "utf8");
  for (const phrase of ["listClientFolders", "listProspectFolders", "isTransientWorkspaceName", "requiredFiles", "kit", "import"]) {
    if (!operationalFolders.includes(phrase)) failures.push(`operational folder helper missing ${phrase}`);
  }
  const proofRunCheck = readFileSync("scripts/check-market-proof-run.mjs", "utf8");
  for (const phrase of ["Market Proof Run Check", "ready-for-send-prep", "ready-to-mark-sent", "sent-proof-captured", "recording-notes.md", "prospects/loom-links.txt", "sendChannelGuidance", "email send cannot count while sender setup is not clean", "Recommended send channel"]) {
    if (!proofRunCheck.includes(phrase)) failures.push(`market proof-run checker missing ${phrase}`);
  }
  const proofCockpit = readFileSync("scripts/export-market-proof-cockpit.mjs", "utf8");
  for (const phrase of ["Market Proof Cockpit", "Tangible Improvement Queue", "before", "after", "client-visible value", "next measurement", "check-market-proof-run.mjs", "prospect:send-prep", "sendChannelGuidance", "routedContactPlan", "proofRunImpact", "genericImpact", "LOOM_URL"]) {
    if (!proofCockpit.includes(phrase)) failures.push(`market proof cockpit missing ${phrase}`);
  }
  const uiCheck = readFileSync("scripts/check-generated-ui-surfaces.mjs", "utf8");
  for (const phrase of ["Generated UI", "market-proof-cockpit.html", "recording-teleprompter.html", "owned-product-case-studies.html", "Business Metric Capture Sheet", "mobile-list", "proof-card", "viewport", "toast", "overflow-x: auto"]) {
    if (!uiCheck.includes(phrase)) failures.push(`generated UI surface checker missing ${phrase}`);
  }
  const afterRecording = readFileSync("scripts/prepare-market-proof-after-recording.mjs", "utf8");
  for (const phrase of ["Market After Recording", "recording-progress-saved", "update-market-proof-looms.mjs", "prepare-prospect-batch-send.mjs", "export-prospect-outbox.mjs", "export-market-proof-cockpit.mjs", "does not mark anything sent", "tangible improvement proof"]) {
    if (!afterRecording.includes(phrase)) failures.push(`market after-recording prep missing ${phrase}`);
  }
  const marketLearning = readFileSync("scripts/export-market-learning-review.mjs", "utf8");
  for (const phrase of ["Market Learning Review", "Next Batch Experiment", "one variable", "No reply-rate conclusion", "check-market-proof-run.mjs", "prospects/followup-cockpit.html", "market-learning-review.html"]) {
    if (!marketLearning.includes(phrase)) failures.push(`market learning review missing ${phrase}`);
  }
  const benchmark = readFileSync("docs/strategy/market-parity-benchmark-2026.md", "utf8");
  for (const phrase of ["Market Price Anchors", "Competitive Proof Matrix", "11/10 Proof Bar", "Retention Thesis", "$2,500-$5,000", "CROAudits", "WebFX", "Speero", "Conversion", "OpenClaw"]) {
    if (!benchmark.includes(phrase)) failures.push(`market parity benchmark missing ${phrase}`);
  }
  const benchmarkScript = readFileSync("scripts/export-market-benchmark.mjs", "utf8");
  for (const phrase of ["Competitive Proof Matrix", "AI CRO audit tools", "Large CRO/digital agencies", "Enterprise experimentation programs", "Specialist CRO agencies", "AI automation audit offers", "TinyStudio Proof Bar", "market-proof-needed"]) {
    if (!benchmarkScript.includes(phrase)) failures.push(`market benchmark exporter missing ${phrase}`);
  }
}

for (const file of ["growth-brain/agents/landing-page-fixer.md", "growth-brain/agents/product-page-fixer.md", "growth-brain/agents/ad-angle-generator.md", "growth-brain/agents/email-sms-generator.md", "growth-brain/agents/marketing-agent-workbench.md"]) {
  const content = readFileSync(file, "utf8");
  if (!content.includes("conversion optimization playbook")) {
    failures.push(`${file} must use the conversion optimization playbook`);
  }
}

{
  const content = readFileSync("scripts/batch-score-prospects.mjs", "utf8");
  if (!content.includes("parseScore") || !content.includes("score must use N/16 format") || !content.includes("scoring reason must be at least 12 characters") || !content.includes("does not match score band")) {
    failures.push("scripts/batch-score-prospects.mjs must strictly validate score format, reasons, and score/priority alignment");
  }
}

{
  const content = readFileSync("scripts/check-lead-score-integrity.mjs", "utf8");
  if (!content.includes("stale Loom duration") || !content.includes("priority must be") || !content.includes("5-8 minute Loom")) {
    failures.push("scripts/check-lead-score-integrity.mjs must catch stale duration labels and score/priority drift");
  }
}

{
  const content = readFileSync("scripts/export-lead-scoring-cockpit.mjs", "utf8");
  if (!content.includes("Every row needs a reason before copy") || !content.includes("needs reason") || !content.includes("missingReasons")) {
    failures.push("scripts/export-lead-scoring-cockpit.mjs must block copying weak scoring rows without reasons");
  }
}

if (existsSync("growth-brain/sprint-checklist.md")) {
  const sprint = readFileSync("growth-brain/sprint-checklist.md", "utf8");
  for (let day = 1; day <= 7; day += 1) {
    if (!sprint.includes(`Day ${day}`)) failures.push(`Sprint checklist missing Day ${day}`);
  }
}

const workflowFiles = requiredFiles.filter((file) => file.startsWith("growth-brain/workflows/"));
const salesFiles = requiredFiles.filter((file) => file.startsWith("growth-brain/sales/"));
const qualityFiles = requiredFiles.filter((file) => file.startsWith("growth-brain/quality/"));
const retentionFiles = requiredFiles.filter((file) => file.startsWith("growth-brain/retention/"));
const verticalFiles = requiredFiles.filter((file) => file.startsWith("growth-brain/verticals/"));
const aiVisibilityFiles = requiredFiles.filter((file) => file.startsWith("growth-brain/ai-visibility/"));
const deliveryFiles = requiredFiles.filter((file) => file.startsWith("growth-brain/delivery/"));
const opsFiles = requiredFiles.filter((file) => file.startsWith("growth-brain/ops/"));
const prospectingFiles = requiredFiles.filter((file) => file.startsWith("growth-brain/prospecting/"));

for (const file of workflowFiles) {
  const content = readFileSync(file, "utf8");
  if (!/(Goal|Order Of Operations|Rule)/.test(content)) failures.push(`${file} missing an operating goal or rule`);
}

for (const file of salesFiles) {
  const content = readFileSync(file, "utf8");
  if (!/(Price|Call To Action|Next Step|Goal|Objection|Follow-Up|Scope)/.test(content)) failures.push(`${file} missing sales action structure`);
}

for (const file of qualityFiles) {
  const content = readFileSync(file, "utf8");
  if (!/(Must Pass|Rule|Score|Delight)/.test(content)) failures.push(`${file} missing quality gate structure`);
}

for (const file of retentionFiles) {
  const content = readFileSync(file, "utf8");
  if (!/(Weekly|Score|Trigger|Case Study|Retention|Renewal)/.test(content)) failures.push(`${file} missing retention structure`);
}

for (const file of verticalFiles) {
  const content = readFileSync(file, "utf8");
  if (!/(Why This Vertical|Common Site Leaks|Loom Hook|Rule|Default Order)/.test(content)) failures.push(`${file} missing vertical audit structure`);
}

for (const file of aiVisibilityFiles) {
  const content = readFileSync(file, "utf8");
  if (!/(Goal|Rule|Output|Prompt|Measurement)/.test(content)) failures.push(`${file} missing AI visibility audit structure`);
}

for (const file of deliveryFiles) {
  const content = readFileSync(file, "utf8");
  if (!/(Approval|Measurement|During Sprint|Replace This|With This)/.test(content)) failures.push(`${file} missing implementation or communication structure`);
}

for (const file of opsFiles) {
  const content = readFileSync(file, "utf8");
  if (!/(Scoreboard|Metric|Review|Decision Rule|Today|Dashboard|Next Move|Checkups)/.test(content)) failures.push(`${file} missing command-center structure`);
}

for (const file of prospectingFiles) {
  const content = readFileSync(file, "utf8");
  if (!/(Query|Referral|Template|Rule|Status)/.test(content)) failures.push(`${file} missing prospecting structure`);
}

try {
  const output = execFileSync("node", ["scripts/show-growth-command-center.mjs"], {
    encoding: "utf8",
    stdio: ["ignore", "pipe", "pipe"]
  });
  const result = JSON.parse(output);
  if (!result.counts || !Array.isArray(result.todayFocus)) {
    failures.push("growth command center did not report counts and today focus");
  }
} catch (error) {
  failures.push(`growth command center smoke test failed: ${error.message}`);
}

try {
  const output = execFileSync("node", ["scripts/export-growth-metrics.mjs"], {
    encoding: "utf8",
    stdio: ["ignore", "pipe", "pipe"]
  });
  const result = JSON.parse(output);
  if (result.status !== "created" || !existsSync("growth-brain/ops/live-metrics.md")) {
    failures.push("growth metrics export did not create live metrics");
  }
} catch (error) {
  failures.push(`growth metrics smoke test failed: ${error.message}`);
}

try {
  const tempClient = "clients/kit-acceptance-test";
  mkdirSync(tempClient, { recursive: true });
  mkdirSync(`${tempClient}/reports`, { recursive: true });
  const metricsOutput = execFileSync("node", ["scripts/export-growth-metrics.mjs", "--output=prospects/kit-live-metrics.md"], {
    encoding: "utf8",
    stdio: ["ignore", "pipe", "pipe"]
  });
  const metricsResult = JSON.parse(metricsOutput);
  const parityOutput = execFileSync("node", [
    "scripts/check-market-parity-readiness.mjs",
    "--skip-kit",
    "--output=prospects/kit-operational-folder-parity.md"
  ], {
    encoding: "utf8",
    stdio: ["ignore", "pipe", "pipe"]
  });
  const parityResult = JSON.parse(parityOutput);
  if (metricsResult.counts.clients !== 3 || parityResult.counts.clients !== 3) {
    failures.push("operational reports counted a transient kit client folder as a real client");
  }
  rmSync(tempClient, { recursive: true, force: true });
  rmSync("prospects/kit-live-metrics.md", { force: true });
  rmSync("prospects/kit-operational-folder-parity.md", { force: true });
} catch (error) {
  rmSync("clients/kit-acceptance-test", { recursive: true, force: true });
  rmSync("prospects/kit-live-metrics.md", { force: true });
  rmSync("prospects/kit-operational-folder-parity.md", { force: true });
  failures.push(`operational folder filtering smoke test failed: ${error.message}`);
}

try {
  const output = execFileSync("node", ["scripts/export-growth-cockpit.mjs"], {
    encoding: "utf8",
    stdio: ["ignore", "pipe", "pipe"]
  });
  const result = JSON.parse(output);
  const cockpit = readFileSync("growth-brain/ops/growth-cockpit.html", "utf8");
  if (result.status !== "created" || !cockpit.includes("TinyStudio Growth Cockpit")) {
    failures.push("growth cockpit export did not create the daily cockpit");
  }
} catch (error) {
  failures.push(`growth cockpit smoke test failed: ${error.message}`);
}

try {
  const output = execFileSync("node", ["scripts/export-proof-library.mjs"], {
    encoding: "utf8",
    stdio: ["ignore", "pipe", "pipe"]
  });
  const result = JSON.parse(output);
  const proofLibrary = readFileSync("growth-brain/ops/proof-library.md", "utf8");
  if (result.status !== "created" || !proofLibrary.includes("TinyStudio Proof And Learning Library")) {
    failures.push("proof library export did not create the learning library");
  }
} catch (error) {
  failures.push(`proof library export failed: ${error.message}`);
}

try {
  const output = execFileSync("node", ["scripts/check-retention-automation.mjs"], {
    encoding: "utf8",
    stdio: ["ignore", "pipe", "pipe"]
  });
  const result = JSON.parse(output);
  if (!["pass", "warn"].includes(result.status) || result.automationId !== "tinystudio-retention-checkups") {
    failures.push("retention automation checker did not verify the active automation");
  }
} catch (error) {
  failures.push(`retention automation checker failed: ${error.message}`);
}

try {
  const output = execFileSync("node", [
    "scripts/export-retention-checkups.mjs",
    "--output=prospects/kit-retention-checkups.md",
    "--html=prospects/kit-retention-dashboard.html",
    "--monthly"
  ], {
    encoding: "utf8",
    stdio: ["ignore", "pipe", "pipe"]
  });
  const result = JSON.parse(output);
  const checkups = readFileSync("prospects/kit-retention-checkups.md", "utf8");
  const dashboard = readFileSync("prospects/kit-retention-dashboard.html", "utf8");
  if (!["ready", "attention-needed"].includes(result.status) || !checkups.includes("Weekly Checkups") || !checkups.includes("Monthly Checkups") || !dashboard.includes("Retention Dashboard")) {
    failures.push("retention checkups export did not create weekly/monthly dashboard surfaces");
  }
  rmSync("prospects/kit-retention-checkups.md", { force: true });
  rmSync("prospects/kit-retention-dashboard.html", { force: true });
} catch (error) {
  rmSync("prospects/kit-retention-checkups.md", { force: true });
  rmSync("prospects/kit-retention-dashboard.html", { force: true });
  failures.push(`retention checkups export failed: ${error.message}`);
}

try {
  const output = execFileSync("node", [
    "scripts/export-internal-dashboard.mjs",
    "--output=prospects/kit-internal-dashboard.md",
    "--html=prospects/kit-internal-dashboard.html"
  ], {
    encoding: "utf8",
    stdio: ["ignore", "pipe", "pipe"]
  });
  const result = JSON.parse(output);
  const dashboard = readFileSync("prospects/kit-internal-dashboard.md", "utf8");
  const html = readFileSync("prospects/kit-internal-dashboard.html", "utf8");
  if (!["ready", "attention-needed"].includes(result.status) || !Array.isArray(result.actions) || !Array.isArray(result.tasks) || !dashboard.includes("Next / Pending Actions") || !dashboard.includes("To-Do List") || !dashboard.includes("| Area | Evidence | Command |") || !html.includes("Internal Dashboard")) {
    failures.push("internal dashboard export did not create the owner action dashboard");
  }
  rmSync("prospects/kit-internal-dashboard.md", { force: true });
  rmSync("prospects/kit-internal-dashboard.html", { force: true });
} catch (error) {
  rmSync("prospects/kit-internal-dashboard.md", { force: true });
  rmSync("prospects/kit-internal-dashboard.html", { force: true });
  failures.push(`internal dashboard export failed: ${error.message}`);
}

try {
  const output = execFileSync("node", [
    "scripts/export-value-retention-stress-test.mjs",
    "--output=prospects/kit-value-retention-stress-test.md"
  ], {
    encoding: "utf8",
    stdio: ["ignore", "pipe", "pipe"]
  });
  const result = JSON.parse(output);
  const report = readFileSync("prospects/kit-value-retention-stress-test.md", "utf8");
  if (!["pass", "watch", "attention-needed"].includes(result.status) || !report.includes("Value And Retention Stress Test") || !report.includes("Tangible improvement proof") || !report.includes("Owned startups can prove delivery quality")) {
    failures.push("value retention stress test did not create the north-star value report");
  }
  rmSync("prospects/kit-value-retention-stress-test.md", { force: true });
} catch (error) {
  rmSync("prospects/kit-value-retention-stress-test.md", { force: true });
  failures.push(`value retention stress test failed: ${error.message}`);
}

try {
  const output = execFileSync("node", [
    "scripts/export-market-benchmark.mjs",
    "--output=prospects/kit-market-parity-benchmark.md",
    "--ops=prospects/kit-competitive-proof-matrix.md",
    "--html=prospects/kit-competitive-proof-matrix.html"
  ], {
    encoding: "utf8",
    stdio: ["ignore", "pipe", "pipe"]
  });
  const result = JSON.parse(output);
  const report = readFileSync("prospects/kit-market-parity-benchmark.md", "utf8");
  const matrix = readFileSync("prospects/kit-competitive-proof-matrix.md", "utf8");
  const html = readFileSync("prospects/kit-competitive-proof-matrix.html", "utf8");
  if (!["pass", "watch", "market-proof-needed"].includes(result.status) || result.alternatives < 5 || !report.includes("Competitive Proof Matrix") || !matrix.includes("TinyStudio Proof Bar") || !html.includes("Competitive Proof Matrix")) {
    failures.push("market benchmark export did not create the source-backed competitive proof matrix");
  }
  rmSync("prospects/kit-market-parity-benchmark.md", { force: true });
  rmSync("prospects/kit-competitive-proof-matrix.md", { force: true });
  rmSync("prospects/kit-competitive-proof-matrix.html", { force: true });
} catch (error) {
  rmSync("prospects/kit-market-parity-benchmark.md", { force: true });
  rmSync("prospects/kit-competitive-proof-matrix.md", { force: true });
  rmSync("prospects/kit-competitive-proof-matrix.html", { force: true });
  failures.push(`market benchmark export failed: ${error.message}`);
}

try {
  const output = execFileSync("node", [
    "scripts/export-market-proof-run.mjs",
    "--skip-kit",
    "--output=prospects/kit-market-proof-run.md"
  ], {
    encoding: "utf8",
    stdio: ["ignore", "pipe", "pipe"]
  });
  const result = JSON.parse(output);
  const report = readFileSync("prospects/kit-market-proof-run.md", "utf8");
  const loomLinks = readFileSync("prospects/kit-proof-run-loom-links.txt", "utf8");
  if (result.status !== "created" || result.loomLinksPath !== "prospects/kit-proof-run-loom-links.txt" || !report.includes("11/10 Proof Run") || !report.includes("Proof Capture Rules") || !report.includes("npm run market:after-recording -- --from-clipboard") || !loomLinks.includes("LOOM_URL|approved")) {
    failures.push("market proof run export did not create a usable proof-capture packet");
  }
  rmSync("prospects/kit-market-proof-run.md", { force: true });
  rmSync("prospects/kit-proof-run-loom-links.txt", { force: true });
} catch (error) {
  rmSync("prospects/kit-market-proof-run.md", { force: true });
  rmSync("prospects/kit-proof-run-loom-links.txt", { force: true });
  failures.push(`market proof run smoke test failed: ${error.message}`);
}

try {
  const sheet = "prospects/kit-market-recordings-links.txt";
  const input = "prospects/kit-market-recordings-input.txt";
  const reportPath = "prospects/kit-market-recordings-update.md";
  const loomLink = "https://www.loom.com/share/abcdef1234567890";
  writeFileSync(sheet, "prospects/layerlogix|LOOM_URL|approved|specific visible leak|buyer impact from the recording|first fix shown in the recording|ask if they want the sprint plan\n");
  writeFileSync(input, `${loomLink}\n`);
  const output = execFileSync("node", [
    "scripts/update-market-proof-looms.mjs",
    sheet,
    `--input=${input}`,
    `--report=${reportPath}`
  ], {
    encoding: "utf8",
    stdio: ["ignore", "pipe", "pipe"]
  });
  const result = JSON.parse(output);
  const updatedSheet = readFileSync(sheet, "utf8");
  const report = readFileSync(reportPath, "utf8");
  if (result.status !== "updated" || result.updated !== 1 || !updatedSheet.includes(loomLink) || !updatedSheet.includes("specific visible leak") || !report.includes("Existing Notes Preserved")) {
    failures.push("market recordings updater did not preserve proof notes while adding Loom URLs");
  }
  rmSync(sheet, { force: true });
  rmSync(input, { force: true });
  rmSync(reportPath, { force: true });
} catch (error) {
  rmSync("prospects/kit-market-recordings-links.txt", { force: true });
  rmSync("prospects/kit-market-recordings-input.txt", { force: true });
  rmSync("prospects/kit-market-recordings-update.md", { force: true });
  failures.push(`market recordings updater smoke test failed: ${error.message}`);
}

try {
  const sheet = "prospects/kit-after-recording-links.txt";
  const input = "prospects/kit-after-recording-input.txt";
  const reportPath = "prospects/kit-after-recording.md";
  const recordingsReportPath = "prospects/kit-after-recording-update.md";
  const checkPath = "prospects/kit-after-recording-check.md";
  const proofPath = "prospects/kit-after-recording-cockpit.md";
  const proofHtmlPath = "prospects/kit-after-recording-cockpit.html";
  const packagePath = "prospects/kit-after-recording-package.md";
  const outboxPath = "prospects/kit-after-recording-outbox.html";
  const loomLink = "https://www.loom.com/share/abcdef1234567890";
  writeFileSync(sheet, "prospects/layerlogix|LOOM_URL|approved|specific visible leak|buyer impact from the recording|first fix shown in the recording|ask if they want the sprint plan\n");
  writeFileSync(input, `${loomLink}\n`);
  const output = execFileSync("node", [
    "scripts/prepare-market-proof-after-recording.mjs",
    sheet,
    `--input=${input}`,
    "--dry-run",
    `--report=${reportPath}`,
    `--recordings-report=${recordingsReportPath}`,
    `--check-output=${checkPath}`,
    `--proof-output=${proofPath}`,
    `--proof-html=${proofHtmlPath}`,
    `--package=${packagePath}`,
    `--outbox=${outboxPath}`
  ], {
    encoding: "utf8",
    stdio: ["ignore", "pipe", "pipe"]
  });
  const result = JSON.parse(output);
  const report = readFileSync(reportPath, "utf8");
  if (result.status !== "dry-run" || result.recordings.updated !== 1 || !report.includes("Market After Recording") || !report.includes("does not mark anything sent")) {
    failures.push("market after-recording prep did not create the guarded post-recording report");
  }
  rmSync(sheet, { force: true });
  rmSync(input, { force: true });
  rmSync(reportPath, { force: true });
  rmSync(recordingsReportPath, { force: true });
  rmSync(checkPath, { force: true });
  rmSync(proofPath, { force: true });
  rmSync(proofHtmlPath, { force: true });
  rmSync(packagePath, { force: true });
  rmSync(outboxPath, { force: true });
} catch (error) {
  rmSync("prospects/kit-after-recording-links.txt", { force: true });
  rmSync("prospects/kit-after-recording-input.txt", { force: true });
  rmSync("prospects/kit-after-recording.md", { force: true });
  rmSync("prospects/kit-after-recording-update.md", { force: true });
  rmSync("prospects/kit-after-recording-check.md", { force: true });
  rmSync("prospects/kit-after-recording-cockpit.md", { force: true });
  rmSync("prospects/kit-after-recording-cockpit.html", { force: true });
  rmSync("prospects/kit-after-recording-package.md", { force: true });
  rmSync("prospects/kit-after-recording-outbox.html", { force: true });
  failures.push(`market after-recording prep smoke test failed: ${error.message}`);
}

try {
  const sheet = "prospects/kit-after-recording-partial-links.txt";
  const input = "prospects/kit-after-recording-partial-input.txt";
  const reportPath = "prospects/kit-after-recording-partial.md";
  const recordingsReportPath = "prospects/kit-after-recording-partial-update.md";
  const checkPath = "prospects/kit-after-recording-partial-check.md";
  const proofPath = "prospects/kit-after-recording-partial-cockpit.md";
  const proofHtmlPath = "prospects/kit-after-recording-partial-cockpit.html";
  const packagePath = "prospects/kit-after-recording-partial-package.md";
  const outboxPath = "prospects/kit-after-recording-partial-outbox.html";
  const loomLink = "https://www.loom.com/share/abcdef1234567890";
  writeFileSync(sheet, [
    "prospects/layerlogix|LOOM_URL|approved|specific visible leak|buyer impact from the recording|first fix shown in the recording|ask if they want the sprint plan",
    "prospects/protbyte|LOOM_URL|approved|second visible leak|second buyer impact from recording|second first fix shown|second clean ask"
  ].join("\n") + "\n");
  writeFileSync(input, `${loomLink}\n`);
  const output = execFileSync("node", [
    "scripts/prepare-market-proof-after-recording.mjs",
    sheet,
    `--input=${input}`,
    `--report=${reportPath}`,
    `--recordings-report=${recordingsReportPath}`,
    `--check-output=${checkPath}`,
    `--proof-output=${proofPath}`,
    `--proof-html=${proofHtmlPath}`,
    `--package=${packagePath}`,
    `--outbox=${outboxPath}`
  ], {
    encoding: "utf8",
    stdio: ["ignore", "pipe", "pipe"]
  });
  const result = JSON.parse(output);
  const report = readFileSync(reportPath, "utf8");
  if (result.status !== "recording-progress-saved" || result.recordings.updated !== 1 || result.proofAfter.status !== "needs-recording" || result.batchSend !== null || result.nextCommand !== "npm run growth:start -- --view=record" || !report.includes("Do not run send prep")) {
    failures.push("market after-recording prep did not save partial recording progress safely");
  }
  rmSync(sheet, { force: true });
  rmSync(input, { force: true });
  rmSync(reportPath, { force: true });
  rmSync(recordingsReportPath, { force: true });
  rmSync(checkPath, { force: true });
  rmSync(proofPath, { force: true });
  rmSync(proofHtmlPath, { force: true });
  rmSync(packagePath, { force: true });
  rmSync(outboxPath, { force: true });
} catch (error) {
  rmSync("prospects/kit-after-recording-partial-links.txt", { force: true });
  rmSync("prospects/kit-after-recording-partial-input.txt", { force: true });
  rmSync("prospects/kit-after-recording-partial.md", { force: true });
  rmSync("prospects/kit-after-recording-partial-update.md", { force: true });
  rmSync("prospects/kit-after-recording-partial-check.md", { force: true });
  rmSync("prospects/kit-after-recording-partial-cockpit.md", { force: true });
  rmSync("prospects/kit-after-recording-partial-cockpit.html", { force: true });
  rmSync("prospects/kit-after-recording-partial-package.md", { force: true });
  rmSync("prospects/kit-after-recording-partial-outbox.html", { force: true });
  failures.push(`market after-recording partial progress smoke test failed: ${error.message}`);
}

try {
  const input = "prospects/kit-market-proof-run-links.txt";
  const outputPath = "prospects/kit-market-proof-run-check.md";
  writeFileSync(input, "prospects/layerlogix|LOOM_URL|approved|specific leak|buyer impact|first fix|clean ask\n");
  const output = execFileSync("node", [
    "scripts/check-market-proof-run.mjs",
    input,
    `--output=${outputPath}`
  ], {
    encoding: "utf8",
    stdio: ["ignore", "pipe", "pipe"]
  });
  const result = JSON.parse(output);
  const report = readFileSync(outputPath, "utf8");
  if (!["needs-recording", "ready-for-send-prep", "ready-to-mark-sent", "sent-proof-captured"].includes(result.status) || !report.includes("Market Proof Run Check") || !report.includes("Valid approved Loom rows")) {
    failures.push("market proof-run checker did not create a usable proof session report");
  }
  rmSync(input, { force: true });
  rmSync(outputPath, { force: true });
} catch (error) {
  rmSync("prospects/kit-market-proof-run-links.txt", { force: true });
  rmSync("prospects/kit-market-proof-run-check.md", { force: true });
  failures.push(`market proof-run checker smoke test failed: ${error.message}`);
}

try {
  const input = "prospects/kit-market-proof-cockpit-links.txt";
  const outputPath = "prospects/kit-market-proof-cockpit.md";
  const htmlPath = "prospects/kit-market-proof-cockpit.html";
  writeFileSync(input, "prospects/layerlogix|LOOM_URL|approved|Visible leak for buyer|Buyer impact is clear|First fix to show|Clean ask to send\n");
  const output = execFileSync("node", [
    "scripts/export-market-proof-cockpit.mjs",
    input,
    `--output=${outputPath}`,
    `--html=${htmlPath}`
  ], {
    encoding: "utf8",
    stdio: ["ignore", "pipe", "pipe"]
  });
  const result = JSON.parse(output);
  const report = readFileSync(outputPath, "utf8");
  const html = readFileSync(htmlPath, "utf8");
  if (!["proof-run-active", "sent-proof-captured"].includes(result.status) || !report.includes("Market Proof Cockpit") || !report.includes("Tangible Improvement Queue") || !report.includes("Client-Visible Value") || !html.includes("Market Proof Cockpit")) {
    failures.push("market proof cockpit did not create the tangible improvement proof surface");
  }
  rmSync(input, { force: true });
  rmSync(outputPath, { force: true });
  rmSync(htmlPath, { force: true });
  rmSync("prospects/kit-market-proof-run-check.md", { force: true });
} catch (error) {
  rmSync("prospects/kit-market-proof-cockpit-links.txt", { force: true });
  rmSync("prospects/kit-market-proof-cockpit.md", { force: true });
  rmSync("prospects/kit-market-proof-cockpit.html", { force: true });
  rmSync("prospects/kit-market-proof-run-check.md", { force: true });
  failures.push(`market proof cockpit smoke test failed: ${error.message}`);
}

try {
  const outputPath = "prospects/kit-market-learning-review.md";
  const htmlPath = "prospects/kit-market-learning-review.html";
  const output = execFileSync("node", [
    "scripts/export-market-learning-review.mjs",
    `--output=${outputPath}`,
    `--html=${htmlPath}`
  ], {
    encoding: "utf8",
    stdio: ["ignore", "pipe", "pipe"]
  });
  const result = JSON.parse(output);
  const report = readFileSync(outputPath, "utf8");
  const html = readFileSync(htmlPath, "utf8");
  if (!result.status || !report.includes("Market Learning Review") || !report.includes("Next Batch Experiment") || !html.includes("Market Learning Review")) {
    failures.push("market learning review did not create the batch-learning surface");
  }
  rmSync(outputPath, { force: true });
  rmSync(htmlPath, { force: true });
} catch (error) {
  rmSync("prospects/kit-market-learning-review.md", { force: true });
  rmSync("prospects/kit-market-learning-review.html", { force: true });
  failures.push(`market learning review smoke test failed: ${error.message}`);
}

{
  const ownedStartupSeed = readFileSync("scripts/seed-owned-startup-proof-lane.mjs", "utf8");
  if (!ownedStartupSeed.includes("AI Converter") || !ownedStartupSeed.includes("SiteRep") || !ownedStartupSeed.includes("Five to Nine 0509") || !ownedStartupSeed.includes("owned-startup") || !ownedStartupSeed.includes("Do not count this as external market demand")) {
    failures.push("owned startup proof lane must seed AI Converter, SiteRep, and 0509 without pretending they are market proof");
  }
}

try {
  const output = execFileSync("node", ["scripts/export-owned-startup-proof-capture.mjs"], {
    encoding: "utf8",
    stdio: ["ignore", "pipe", "pipe"]
  });
  const result = JSON.parse(output);
  if (result.status !== "draft-owned-proof-captured" || !Array.isArray(result.results) || result.results.length !== 3) {
    failures.push("owned startup proof capture did not return three draft owned proof packets");
  }
  for (const clientPath of ["clients/ai-converter", "clients/siterep", "clients/five-to-nine-0509"]) {
    const evidence = readFileSync(`${clientPath}/research/owned-proof-evidence.md`, "utf8");
    const claimReview = readFileSync(`${clientPath}/quality/claim-review.md`, "utf8");
    const ledger = readFileSync(`${clientPath}/quality/claim-proof-ledger.md`, "utf8");
    const scorecard = readFileSync(`${clientPath}/quality/conversion-optimization-scorecard.md`, "utf8");
    const handoff = readFileSync(`${clientPath}/deliverables/implementation-handoff.md`, "utf8");
    const delivery = readFileSync(`${clientPath}/deliverables/delivery.md`, "utf8");
    const proofReviewOutput = execFileSync("node", ["scripts/review-client-proof.mjs", clientPath, "--dry-run"], {
      encoding: "utf8",
      stdio: ["ignore", "pipe", "pipe"]
    });
    const proofReviewResult = JSON.parse(proofReviewOutput);
    if (proofReviewResult.status !== "dry-run" || !Array.isArray(proofReviewResult.claims) || proofReviewResult.claims.length < 1) {
      failures.push(`${clientPath} proof review dry run did not expose proof claims`);
    }
    if (proofReviewResult.sourceReadyCount < 1 || !proofReviewResult.claims.every((claim) => claim.sourceStatus && typeof claim.sourceReady === "boolean")) {
      failures.push(`${clientPath} proof review dry run did not expose source evidence status`);
    }
    if (!evidence.includes("Owned Proof Evidence") || !evidence.includes("This is owned-startup proof")) {
      failures.push(`${clientPath} owned proof packet missing guardrail`);
    }
    if (!claimReview.includes("Do not use externally") || (!claimReview.includes("approve / remove") && !/approved by|removed by/i.test(claimReview))) {
      failures.push(`${clientPath} owned claim review missing external-use guardrail`);
    }
    if (!ledger.includes("Claim-Proof Ledger") || !ledger.includes("If a claim cannot be proven, it cannot be shipped")) {
      failures.push(`${clientPath} claim ledger must preserve the proof approval contract`);
    }
    if (!scorecard.includes("## Approval") || !scorecard.includes("tangible improvement proof") || !scorecard.includes("## Search Trust Layer") || !scorecard.includes("Blocked backlink or spam tactic")) {
      failures.push(`${clientPath} conversion scorecard must preserve approval state, tangible proof scoring, and search trust guardrails`);
    }
    if (!handoff.includes("Approval Needed") || !handoff.includes("Do not send externally")) {
      failures.push(`${clientPath} implementation handoff missing proof approval guardrail`);
    }
    if (!delivery.includes("Tangible Improvements") || !delivery.includes("owned-startup draft proof only")) {
      failures.push(`${clientPath} delivery missing tangible owned proof row`);
    }
  }
} catch (error) {
  failures.push(`owned startup proof capture failed: ${error.message}`);
}

try {
  const output = execFileSync("node", ["scripts/review-owned-startup-proof.mjs"], {
    encoding: "utf8",
    stdio: ["ignore", "pipe", "pipe"]
  });
  const result = JSON.parse(output);
  if (result.status !== "review-needed" || result.clients !== 3 || result.claimCount < 1 || result.sourceReadyCount < 1 || !existsSync("growth-brain/ops/owned-proof-review.md") || !existsSync("growth-brain/ops/owned-proof-review.html")) {
    failures.push("owned proof review rollup did not expose owned-startup proof claims");
  }
  const ownedReview = readFileSync("growth-brain/ops/owned-proof-review.md", "utf8");
  const ownedReviewHtml = readFileSync("growth-brain/ops/owned-proof-review.html", "utf8");
  if (!ownedReview.includes("Tangible Improvement Review") || !ownedReview.includes("Client-Visible Value") || !ownedReview.includes("Use Externally") || !ownedReview.includes("Source Evidence") || !ownedReview.includes("Bulk Review Commands") || !ownedReview.includes("approve=all") || !ownedReview.includes("Dry-Run Remove Command") || !ownedReviewHtml.includes("Tangible Improvement") || !ownedReviewHtml.includes("Decision Commands")) {
    failures.push("owned proof review cockpit missing source evidence or decision commands");
  }
} catch (error) {
  failures.push(`owned proof review rollup failed: ${error.message}`);
}

try {
  const output = execFileSync("node", ["scripts/export-owned-product-case-studies.mjs"], {
    encoding: "utf8",
    stdio: ["ignore", "pipe", "pipe"]
  });
  const result = JSON.parse(output);
  if (!["ready", "delivery-proof-ready", "needs-current-metrics"].includes(result.status) || !Array.isArray(result.packets) || result.packets.length !== 3 || typeof result.needsBusinessMetric !== "number" || !existsSync("growth-brain/ops/owned-product-case-studies.md") || !existsSync("growth-brain/ops/owned-product-case-studies.html")) {
    failures.push("owned product case-study exporter did not create three owned-product proof packets");
  }
  const ownedCaseStudies = readFileSync("growth-brain/ops/owned-product-case-studies.md", "utf8");
  const ownedCaseStudiesHtml = readFileSync("growth-brain/ops/owned-product-case-studies.html", "utf8");
  if (!ownedCaseStudies.includes("Owned startup proof = delivery proof") || !ownedCaseStudies.includes("External client proof = market proof") || !ownedCaseStudies.includes("Outbound-Safe Proof Lines") || !ownedCaseStudies.includes("Business-metric case-study ready") || !ownedCaseStudies.includes("Need business metric") || !ownedCaseStudies.includes("Business Metric Capture Sheet") || !ownedCaseStudiesHtml.includes("Owned-Product Case Studies")) {
    failures.push("owned product case-study exporter missing honest proof labels or outbound-safe lines");
  }
  for (const clientPath of ["clients/ai-converter", "clients/siterep", "clients/five-to-nine-0509"]) {
    const packet = readFileSync(`${clientPath}/owned-product-proof-packet.md`, "utf8");
    if (!packet.includes("Owned-Product Proof Packet") || !packet.includes("Sales-Safe Outbound Line") || !packet.includes("Current Metric") || !packet.includes("Business metric") || !packet.includes("Do not say this is client proof")) {
      failures.push(`${clientPath} owned-product proof packet missing guardrails or metric gate`);
    }
  }
} catch (error) {
  failures.push(`owned product case-study export failed: ${error.message}`);
}

try {
  const output = execFileSync("node", ["scripts/export-owned-product-workflow-proofs.mjs"], {
    encoding: "utf8",
    stdio: ["ignore", "pipe", "pipe"]
  });
  const result = JSON.parse(output);
  if (result.status !== "ready" || result.clients !== 3 || result.ready !== 3 || !existsSync("growth-brain/ops/owned-product-workflow-proofs.md") || !existsSync("growth-brain/ops/owned-product-workflow-proofs.html")) {
    failures.push("owned product workflow proof exporter did not create three ready workflow proofs");
  }
  const ownedWorkflow = readFileSync("growth-brain/ops/owned-product-workflow-proofs.md", "utf8");
  const ownedWorkflowHtml = readFileSync("growth-brain/ops/owned-product-workflow-proofs.html", "utf8");
  if (!ownedWorkflow.includes("Owned Product Workflow Proofs") || !ownedWorkflow.includes("What Still Needs External Proof") || !ownedWorkflowHtml.includes("Owned Product Workflow Proofs")) {
    failures.push("owned product workflow proof rollup missing guardrails or dashboard");
  }
  for (const clientPath of ["clients/ai-converter", "clients/siterep", "clients/five-to-nine-0509"]) {
    const workflow = readFileSync(`${clientPath}/ops/repeatable-workflow.md`, "utf8");
    if (!workflow.includes("Repeatable Workflow Proof") || !workflow.includes("Canonical Loop Check") || !workflow.includes("What This Does Not Prove")) {
      failures.push(`${clientPath} repeatable workflow proof missing canonical loop guardrails`);
    }
  }
} catch (error) {
  failures.push(`owned product workflow proof export failed: ${error.message}`);
}

try {
  const inputPath = ".tmp/kit-owned-metrics.txt";
  const reportPath = ".tmp/kit-owned-metrics-update.md";
  writeFileSync(inputPath, "clients/ai-converter|Upload starts|0|12|Smoke metric for owned-product proof packet\n");
  const output = execFileSync("node", ["scripts/update-owned-product-metrics.mjs", `--input=${inputPath}`, `--report=${reportPath}`, "--dry-run"], {
    encoding: "utf8",
    stdio: ["ignore", "pipe", "pipe"]
  });
  const result = JSON.parse(output);
  const report = readFileSync(reportPath, "utf8");
  if (result.status !== "updated" || result.updated !== 1 || !report.includes("Owned Product Metrics Update") || !report.includes("Only use real observed numbers")) {
    failures.push("owned product metrics updater did not dry-run a real metric row");
  }
  rmSync(inputPath, { force: true });
  rmSync(reportPath, { force: true });
} catch (error) {
  rmSync(".tmp/kit-owned-metrics.txt", { force: true });
  rmSync(".tmp/kit-owned-metrics-update.md", { force: true });
  failures.push(`owned product metrics updater failed: ${error.message}`);
}

try {
  const output = execFileSync("node", ["scripts/export-owned-handoff-loom-cockpit.mjs"], {
    encoding: "utf8",
    stdio: ["ignore", "pipe", "pipe"]
  });
  const result = JSON.parse(output);
  if (result.status !== "ready-to-record" || result.clients !== 3 || result.readyToRecord !== 3 || result.accepted !== 0 || !existsSync("growth-brain/ops/owned-handoff-loom-cockpit.md") || !existsSync("growth-brain/ops/owned-handoff-loom-cockpit.html")) {
    failures.push("owned handoff Loom cockpit did not expose all ready-to-record owned startups");
  }
  const handoff = readFileSync("growth-brain/ops/owned-handoff-loom-cockpit.md", "utf8");
  const handoffHtml = readFileSync("growth-brain/ops/owned-handoff-loom-cockpit.html", "utf8");
  for (const clientPath of ["clients/ai-converter", "clients/siterep", "clients/five-to-nine-0509"]) {
    const script = readFileSync(`${clientPath}/handoff-loom-script.md`, "utf8");
    if (!script.includes("Handoff Loom Script") || !script.includes("This is owned-startup proof") || !script.includes("What felt valuable") || !script.includes("handoff-loom=LOOM_URL")) {
      failures.push(`${clientPath} handoff Loom script missing proof-delta recording guardrails`);
    }
  }
  if (!handoff.includes("Owned Handoff Loom Cockpit") || !handoff.includes("proof delta") || !handoff.includes("ready-to-record") || !handoff.includes("Batch Completion Sheet") || !handoff.includes("owned:handoff-complete") || !handoff.includes("Complete After Loom") || !handoffHtml.includes("Owned Handoff Loom Cockpit")) {
    failures.push("owned handoff Loom cockpit missing proof-delta queue or completion command");
  }
} catch (error) {
  failures.push(`owned handoff Loom cockpit failed: ${error.message}`);
}

try {
  const tempClient = "clients/kit-acceptance-test";
  rmSync(tempClient, { recursive: true, force: true });
  cpSync("clients/ai-converter", tempClient, { recursive: true });
  writeFileSync(
    `${tempClient}/quality/claim-review.md`,
    readFileSync(`${tempClient}/quality/claim-review.md`, "utf8").replace(/source-found/g, "source-needs-review")
  );
  let blockedProofApproval = false;
  try {
    execFileSync("node", [
      "scripts/review-client-proof.mjs",
      tempClient,
      "--approve=1",
      "--reviewer=Kit Reviewer"
    ], {
      encoding: "utf8",
      stdio: ["ignore", "pipe", "pipe"]
    });
  } catch (error) {
    blockedProofApproval = /Cannot approve claim until source evidence is found/.test(String(error.stderr || error.message));
  }
  if (!blockedProofApproval) {
    failures.push("client proof review must reject claim approval when source evidence status is not found or confirmed");
  }
  rmSync(tempClient, { recursive: true, force: true });
  cpSync("clients/ai-converter", tempClient, { recursive: true });
  writeFileSync(
    `${tempClient}/quality/claim-proof-ledger.md`,
    readFileSync(`${tempClient}/quality/claim-proof-ledger.md`, "utf8")
      .replace(/\|\s*Codex source review\s*\|\s*approved\s*\|/g, "| Nish review required | needs-client-confirmation |")
      .replace(/\|\s*Kit Reviewer\s*\|\s*approved\s*\|/g, "| Nish review required | needs-client-confirmation |")
  );
  writeFileSync(
    `${tempClient}/quality/conversion-optimization-scorecard.md`,
    readFileSync(`${tempClient}/quality/conversion-optimization-scorecard.md`, "utf8")
      .replace(/^- Reviewer:[ \t]*.*$/m, "- Reviewer: Nish review required")
      .replace(/^- Approved:[ \t]*.*$/m, "- Approved: no")
  );
  const blockedOutput = execFileSync("node", ["scripts/review-client-acceptance.mjs", tempClient, "--dry-run"], {
    encoding: "utf8",
    stdio: ["ignore", "pipe", "pipe"]
  });
  const blockedResult = JSON.parse(blockedOutput);
  if (blockedResult.status !== "blocked" || !blockedResult.blockers.includes("Claim-proof ledger has no approved claim rows yet")) {
    failures.push("client acceptance dry-run must stay blocked until proof and scorecard gates are clean");
  }
  execFileSync("node", [
    "scripts/review-client-proof.mjs",
    tempClient,
    "--approve=all",
    "--approve-scorecard",
    "--reviewer=Kit Reviewer"
  ], {
    encoding: "utf8",
    stdio: ["ignore", "pipe", "pipe"]
  });
  const readyOutput = execFileSync("node", ["scripts/review-client-acceptance.mjs", tempClient, "--dry-run"], {
    encoding: "utf8",
    stdio: ["ignore", "pipe", "pipe"]
  });
  const readyResult = JSON.parse(readyOutput);
  if (readyResult.status !== "ready-to-complete") {
    failures.push("client acceptance dry-run did not become ready after proof review approval");
  }
  execFileSync("node", [
    "scripts/review-client-acceptance.mjs",
    tempClient,
    "--handoff-loom=https://www.loom.com/share/1234567890abcdef1234567890abcdef",
    "--reviewer=Kit Reviewer"
  ], {
    encoding: "utf8",
    stdio: ["ignore", "pipe", "pipe"]
  });
  const readinessOutput = execFileSync("node", ["scripts/check-client-readiness.mjs", tempClient], {
    encoding: "utf8",
    stdio: ["ignore", "pipe", "pipe"]
  });
  const readinessResult = JSON.parse(readinessOutput);
  if (readinessResult.status !== "ready") {
    failures.push("client acceptance completion did not make the temp client ready");
  }
  rmSync(tempClient, { recursive: true, force: true });
} catch (error) {
  rmSync("clients/kit-acceptance-test", { recursive: true, force: true });
  failures.push(`client acceptance smoke test failed: ${error.message}`);
}

try {
  const tempClient = "clients/kit-handoff-complete-test";
  const inputPath = ".tmp/kit-handoff-complete.txt";
  const reportPath = ".tmp/kit-handoff-complete.md";
  rmSync(tempClient, { recursive: true, force: true });
  mkdirSync(".tmp", { recursive: true });
  cpSync("clients/ai-converter", tempClient, { recursive: true });
  writeFileSync(inputPath, `${tempClient}|https://www.loom.com/share/1234567890abcdef1234567890abcdef\n`);
  const output = execFileSync("node", [
    "scripts/complete-owned-handoff-looms.mjs",
    `--clients=${tempClient}`,
    `--input=${inputPath}`,
    "--reviewer=Kit Reviewer",
    `--report=${reportPath}`
  ], {
    encoding: "utf8",
    stdio: ["ignore", "pipe", "pipe"]
  });
  const result = JSON.parse(output);
  const report = readFileSync(reportPath, "utf8");
  const readiness = JSON.parse(execFileSync("node", ["scripts/check-client-readiness.mjs", tempClient], {
    encoding: "utf8",
    stdio: ["ignore", "pipe", "pipe"]
  }));
  if (result.status !== "handoff-acceptance-complete" || result.updated.length !== 1 || result.remaining.length !== 0 || readiness.status !== "ready" || !report.includes("does not create market proof")) {
    failures.push("owned handoff completion did not safely complete a reviewed handoff Loom");
  }
  rmSync(tempClient, { recursive: true, force: true });
  rmSync(inputPath, { force: true });
  rmSync(reportPath, { force: true });
} catch (error) {
  rmSync("clients/kit-handoff-complete-test", { recursive: true, force: true });
  rmSync(".tmp/kit-handoff-complete.txt", { force: true });
  rmSync(".tmp/kit-handoff-complete.md", { force: true });
  failures.push(`owned handoff completion smoke test failed: ${error.message}`);
}

try {
  const output = execFileSync("node", [
    "scripts/check-market-parity-readiness.mjs",
    "--skip-kit",
    "--output=prospects/kit-market-parity-readiness.md"
  ], {
    encoding: "utf8",
    stdio: ["ignore", "pipe", "pipe"]
  });
  const result = JSON.parse(output);
  const report = readFileSync("prospects/kit-market-parity-readiness.md", "utf8");
  if (!["not-11-10-yet", "commercially-conditional", "11-10-ready"].includes(result.status) || !report.includes("Market Parity Readiness") || !report.includes("Required To Claim Better/Comparable")) {
    failures.push("market parity readiness check did not create a usable proof gate");
  }
  rmSync("prospects/kit-market-parity-readiness.md", { force: true });
} catch (error) {
  rmSync("prospects/kit-market-parity-readiness.md", { force: true });
  failures.push(`market parity readiness smoke test failed: ${error.message}`);
}

try {
  const output = execFileSync("node", [
    "scripts/export-sender-setup-guide.mjs",
    "--output=prospects/kit-sender-guide.md",
    "--html=prospects/kit-sender-guide.html"
  ], {
    encoding: "utf8",
    stdio: ["ignore", "pipe", "pipe"]
  });
  const result = JSON.parse(output);
  const guide = readFileSync("prospects/kit-sender-guide.md", "utf8");
  if (result.status !== "created" || !guide.includes("Sender Setup Guide") || !guide.includes("npm run send:setup")) {
    failures.push("sender setup guide export failed");
  }
  rmSync("prospects/kit-sender-guide.md", { force: true });
  rmSync("prospects/kit-sender-guide.html", { force: true });
} catch (error) {
  rmSync("prospects/kit-sender-guide.md", { force: true });
  rmSync("prospects/kit-sender-guide.html", { force: true });
  failures.push(`sender setup guide export failed: ${error.message}`);
}

try {
  const output = execFileSync("node", [
    "scripts/configure-sender-setup.mjs",
    "--physical-address=123 Main St, Austin, TX 78701",
    "--dkim-selector=google",
    "--dry-run"
  ], {
    encoding: "utf8",
    stdio: ["ignore", "pipe", "pipe"]
  });
  const result = JSON.parse(output);
  if (result.status !== "dry-run" || result.changed.dkimSelector !== "google" || result.changed.senderPhysicalAddress !== "123 Main St, Austin, TX 78701") {
    failures.push("sender configure dry-run did not validate sender trust inputs without mutating config");
  }
} catch (error) {
  failures.push(`sender configure dry-run failed: ${error.message}`);
}

try {
  const startOutput = execFileSync("node", ["scripts/start-growth-mission.mjs", "--view=record", "--no-open"], {
    encoding: "utf8",
    stdio: ["ignore", "pipe", "pipe"]
  });
  const startResult = JSON.parse(startOutput);
  if (
    startResult.status !== "ready"
    || startResult.view !== "record"
    || !startResult.files.includes("prospects/recording-rehearsal-check.html")
    || !startResult.files.includes("growth-brain/ops/market-proof-cockpit.html")
  ) {
    failures.push("growth:start record mode did not include rehearsal and market proof cockpit pages");
  }
  const mission = readFileSync("growth-brain/ops/daily-money-mission.html", "utf8");
  const loomLinks = readFileSync("prospects/loom-links.txt", "utf8");
  if (!mission.includes("approved Loom links") || !mission.includes("data-quality=\"ask\"") || !mission.includes("qualityNotes") || !mission.includes("notes.ask") || !mission.includes("isValidLoomUrl") || !mission.includes("recording-rehearsal-check.html") || !mission.includes("market:after-recording")) {
    failures.push("daily money mission missing Loom link validation, rehearsal link, quality gate, or post-recording prep command");
  }
  if (/^prospects\/[^|\n]+\|$/m.test(loomLinks) || /^prospects\/[^|\n]+\|LOOM_URL\|approved\|leak note\|impact note\|fix note\|ask note$/m.test(loomLinks)) {
    failures.push("daily money mission rewrote the Loom sheet without prefilled proof notes");
  }
} catch (error) {
  failures.push(`daily money mission validation smoke test failed: ${error.message}`);
}

try {
  const output = execFileSync("node", ["scripts/export-growth-doctor.mjs", "--no-checks", "--output=prospects/kit-growth-doctor.md"], {
    encoding: "utf8",
    stdio: ["ignore", "pipe", "pipe"]
  });
  const result = JSON.parse(output);
  const doctor = readFileSync("prospects/kit-growth-doctor.md", "utf8");
  if (result.status !== "ready" || !result.recordingPrep || !result.rehearsal || !doctor.includes("Recording prep:") || !doctor.includes("Recording rehearsal:")) {
    failures.push("growth doctor missing recording prep or rehearsal freshness status");
  }
  rmSync("prospects/kit-growth-doctor.md", { force: true });
} catch (error) {
  rmSync("prospects/kit-growth-doctor.md", { force: true });
  failures.push(`growth doctor freshness smoke test failed: ${error.message}`);
}

try {
  const output = execFileSync("node", ["scripts/export-managed-it-one-pager.mjs"], {
    encoding: "utf8",
    stdio: ["ignore", "pipe", "pipe"]
  });
  const result = JSON.parse(output);
  const onePager = readFileSync("growth-brain/sales/managed-it-one-page-offer.html", "utf8");
  if (result.status !== "created" || !onePager.includes("Tangible Revenue Leak Sprint + Search Trust Layer")) {
    failures.push("managed IT one-page offer export failed");
  }
} catch (error) {
  failures.push(`managed IT one-page offer export failed: ${error.message}`);
}

try {
  rmSync("clients/kit-smoke-test", { recursive: true, force: true });
  const output = execFileSync("node", ["scripts/create-client-sprint.mjs", "Kit Smoke Test"], {
    encoding: "utf8",
    stdio: ["ignore", "pipe", "pipe"]
  });
  const result = JSON.parse(output);
  if (result.status !== "created" || result.path !== "clients/kit-smoke-test") {
    failures.push("client scaffold did not report expected output");
  }
  for (const file of [
    "clients/kit-smoke-test/intake.md",
    "clients/kit-smoke-test/sprint-plan.md",
    "clients/kit-smoke-test/brain/site-architecture.md",
    "clients/kit-smoke-test/buyer-room.md",
    "clients/kit-smoke-test/deliverables/delivery.md",
    "clients/kit-smoke-test/deliverables/implementation-handoff.md",
    "clients/kit-smoke-test/reports/week-1-report.md",
    "clients/kit-smoke-test/research/ai-search-audit.md",
    "clients/kit-smoke-test/delivery-cockpit.html",
    "clients/kit-smoke-test/client-dashboard.html",
    "clients/kit-smoke-test/client-dashboard.md",
    "clients/kit-smoke-test/reports/monthly-renewal-review.md",
    "clients/kit-smoke-test/reports/monthly-renewal-review.html",
    "clients/kit-smoke-test/ops/repeatable-workflow.md",
    "clients/kit-smoke-test/ops/repeatable-workflow.html",
    "clients/kit-smoke-test/quality/claim-proof-ledger.md",
    "clients/kit-smoke-test/quality/conversion-optimization-scorecard.md",
    "clients/kit-smoke-test/quality/delivery-scorecard.md",
    "clients/kit-smoke-test/quality/sprint-acceptance-checklist.md"
  ]) {
    if (!existsSync(file)) failures.push(`client scaffold missing ${file}`);
  }
  const kickoffOutput = execFileSync("node", ["scripts/draft-client-kickoff.mjs", "clients/kit-smoke-test"], {
    encoding: "utf8",
    stdio: ["ignore", "pipe", "pipe"]
  });
  const kickoffResult = JSON.parse(kickoffOutput);
  if (kickoffResult.status !== "created" || !existsSync("clients/kit-smoke-test/kickoff-message.md")) {
    failures.push("client kickoff smoke test failed");
  }
  const draftKickoff = readFileSync("clients/kit-smoke-test/kickoff-message.md", "utf8");
  if (!draftKickoff.includes("please confirm payment or written approval")) {
    failures.push("client kickoff did not adapt when payment approval is missing");
  }
  const readinessOutput = execFileSync("node", ["scripts/check-client-readiness.mjs", "clients/kit-smoke-test"], {
    encoding: "utf8",
    stdio: ["ignore", "pipe", "pipe"]
  });
  const readinessResult = JSON.parse(readinessOutput);
  if (readinessResult.status !== "draft" || readinessResult.missing.length !== 0) {
    failures.push("client readiness check did not report a complete draft scaffold");
  }
  if (!readinessResult.warnings.includes("Claim-proof ledger has no approved claim rows yet") || !readinessResult.warnings.includes("Delivery scorecard is not filled") || !readinessResult.warnings.includes("Conversion scorecard critical checks are not filled") || !readinessResult.warnings.includes("Sprint acceptance checklist is not complete") || !readinessResult.warnings.includes("Delivery has no filled top leak rows") || !readinessResult.warnings.includes("Delivery has no filled tangible improvement rows") || !readinessResult.warnings.includes("Implementation handoff is missing replace/with copy") || !readinessResult.warnings.includes("Week 1 report has no filled next-test rows")) {
    failures.push("client readiness check did not reject blank proof ledger, scorecard, conversion scorecard, acceptance checklist, and delivery artifacts");
  }
  const weeklyDraftOutput = execFileSync("node", ["scripts/export-client-weekly-report.mjs", "clients/kit-smoke-test", "--output=clients/kit-smoke-test/reports/week-1-report.md"], {
    encoding: "utf8",
    stdio: ["ignore", "pipe", "pipe"]
  });
  const weeklyDraftResult = JSON.parse(weeklyDraftOutput);
  if (weeklyDraftResult.status !== "draft" || !weeklyDraftResult.warnings.includes("Weekly report has no shipped work") || !weeklyDraftResult.warnings.includes("Weekly report missing What felt valuable") || !weeklyDraftResult.warnings.includes("Client brain weekly learnings log has no durable learning row")) {
    failures.push("weekly report export must stay draft until shipped work and client-brain learning exist");
  }
  writeFileSync("clients/kit-smoke-test/brain/weekly-learnings.md", `# Weekly Learnings

Each week, add what happened and what the next loop should learn from.

## Log

| Week | Change Shipped | Result | Learning | Next Action |
|---|---|---|---|---|
| Week 1 | Homepage decision path handoff | Awaiting client implementation | Buyers need one managed IT path before secondary services | Test the homepage path CTA next week |

## Durable Rules

- Lead with the managed IT buyer path before secondary services.
`);
  writeFileSync("clients/kit-smoke-test/reports/week-1-report.md", `# Kit Smoke Test Week 1 Report

## Week

- Client: Kit Smoke Test
- Dates: 2026-01-01 to 2026-01-07
- Main goal: Improve managed IT buyer path clarity

## What Changed

- Shipped: Homepage decision path handoff completed for the first managed IT CTA
- Drafted: FAQ and proof block for implementation review
- Waiting on client: CMS approval
- Blocked: None

## Revenue Leak Loop

| Lane | Before Leak | Fix Shipped / Handed Off | Client-Visible Value | Next Action |
|---|---|---|---|---|
| Conversion | Homepage made buyers choose between too many service paths before the managed IT offer was clear | Homepage decision path handoff completed for the first managed IT CTA | The client can route higher-fit managed IT buyers to one clear next step | Test the homepage managed IT path CTA next week |
| Search trust | Headings and FAQ support were not tied tightly to managed IT buyer questions | Drafted title/meta, heading, FAQ, and internal-link cleanup for the same page | The fixed page is easier for searchers and AI-assisted search to understand | Check Search Console query and click changes after implementation |

## Search Trust Review

| Area | Current State | Fix / Action | Next Measurement |
|---|---|---|---|
| On-site search trust | Homepage title, headings, and FAQ need a clearer managed IT buyer path | Add title/meta, H1/H2, internal link, and FAQ recommendations for the managed IT page | Search Console managed IT query impressions and CTA clicks |
| Off-site trust/distribution | No new trust asset shipped in this smoke test | Collect one real review/testimonial or partner proof asset after page approval | Proof asset added and referenced near the CTA |

## Numbers To Review

| Metric | Last Period | This Period | Notes |
|---|---:|---:|---|
| Sessions | 100 | 100 | Smoke data only |

## Measurement Contract

| Signal | Source | Owner | Next Check | Baseline / Current | Decision Rule |
|---|---|---|---|---|---|
| Homepage managed IT path CTA click rate | Client analytics and before/after homepage screenshots | Client owner | 2026-01-14 | Current smoke baseline is 100 sessions with no live click read yet | Continue this lane if the CTA path becomes clearer or clicks improve; revise the page section if the signal stays flat |

## Learnings

- What improved: The highest-leverage next step is one clear managed IT route before secondary services
- What got worse: Nothing observed in this smoke test
- What stayed flat: No live analytics yet
- What surprised us: The first CTA clarity matters more than adding more page sections

## Client Pulse

- What felt valuable: The client can see exactly what changed and why it matters
- What felt unclear: CMS implementation owner still needs confirmation
- Delight add-on: One-page founder forwarding summary
- Health score: 7/10 watch
- Retention risk: Client has not approved CMS changes yet

## Retention Value Stack

- Most valuable change this week: The homepage managed IT path is now clearer and easier to approve
- One quick win: Publish the managed IT CTA route before adding more service sections
- What we need from client: CMS approval for the homepage decision path
- Why retain next month: Continue improving the same revenue path with measured CTA and search trust signals

## Client Confirmation

- Client saw delta: Client reviewed the before/after homepage decision path
- Client understood value: Client understands the managed IT path reduces buyer decision burden
- Client approved next action: Client approved testing the homepage managed IT path CTA
- Continue / retain signal: Continue the same lane next week before adding secondary services

## Next Tests

| Priority | Test | Why | Owner | Due |
|---|---|---|---|---|
| 1 | Test the homepage managed IT path CTA | It is the clearest next buyer decision | Client owner | 2026-01-14 |

## Client Brain Update

- Durable learning already logged: Buyers need one managed IT path before secondary services.
`);
  const weeklyReadyOutput = execFileSync("node", ["scripts/check-client-weekly-report.mjs", "clients/kit-smoke-test", "--strict"], {
    encoding: "utf8",
    stdio: ["ignore", "pipe", "pipe"]
  });
  const weeklyReadyResult = JSON.parse(weeklyReadyOutput);
  if (weeklyReadyResult.status !== "ready") {
    failures.push("weekly report checker rejected a filled report with client-brain learning");
  }
  const deliveryCockpitOutput = execFileSync("node", ["scripts/export-client-delivery-cockpit.mjs", "clients/kit-smoke-test"], {
    encoding: "utf8",
    stdio: ["ignore", "pipe", "pipe"]
  });
  const deliveryCockpitResult = JSON.parse(deliveryCockpitOutput);
  const deliveryCockpitHtml = readFileSync("clients/kit-smoke-test/delivery-cockpit.html", "utf8");
  if (deliveryCockpitResult.status !== "created" || !deliveryCockpitHtml.includes("Delivery Cockpit")) {
    failures.push("client delivery cockpit smoke test failed");
  }
  if (!deliveryCockpitHtml.includes("Client update reviewed") || !deliveryCockpitHtml.includes("Handoff reviewed") || !deliveryCockpitHtml.includes("Fix handoff warnings first") || !deliveryCockpitHtml.includes("Replace placeholders first") || !deliveryCockpitHtml.includes("data-reviewed-source") || !deliveryCockpitHtml.includes("data-no-placeholders")) {
    failures.push("client delivery cockpit missing review-gated placeholder-safe client copy");
  }
  const clientDashboardOutput = execFileSync("node", ["scripts/export-client-facing-dashboard.mjs", "clients/kit-smoke-test"], {
    encoding: "utf8",
    stdio: ["ignore", "pipe", "pipe"]
  });
  const clientDashboardResult = JSON.parse(clientDashboardOutput);
  const clientDashboardHtml = readFileSync("clients/kit-smoke-test/client-dashboard.html", "utf8");
  const clientDashboardMd = readFileSync("clients/kit-smoke-test/client-dashboard.md", "utf8");
  if (!["ready", "draft"].includes(clientDashboardResult.status) || typeof clientDashboardResult.valueProofScore !== "number" || clientDashboardResult.clientConfirmed !== true || clientDashboardResult.measurementContractComplete !== true || !clientDashboardHtml.includes("Client Dashboard") || !clientDashboardMd.includes("Approved Proof") || !clientDashboardMd.includes("Missing Before Client-Ready") || !clientDashboardMd.includes("Value Ledger") || !clientDashboardMd.includes("Value Proof Score") || !clientDashboardMd.includes("Measurement Contract") || !clientDashboardMd.includes("Retention / Delight Pulse") || !clientDashboardMd.includes("Client Confirmation") || !clientDashboardMd.includes("This Week's Tangible Improvement") || !clientDashboardHtml.includes("Value Proof Score") || !clientDashboardHtml.includes("Measurement Contract") || !clientDashboardHtml.includes("Client Confirmation") || !clientDashboardHtml.includes("This Week's Tangible Improvement")) {
    failures.push("client-facing dashboard export did not create the proof-aware client dashboard");
  }
  const renewalOutput = execFileSync("node", ["scripts/export-client-renewal-review.mjs", "clients/kit-smoke-test"], {
    encoding: "utf8",
    stdio: ["ignore", "pipe", "pipe"]
  });
  const renewalResult = JSON.parse(renewalOutput);
  const renewalHtml = readFileSync("clients/kit-smoke-test/reports/monthly-renewal-review.html", "utf8");
  const renewalMd = readFileSync("clients/kit-smoke-test/reports/monthly-renewal-review.md", "utf8");
  if (!["ready-for-renewal-review", "do-not-pitch-renewal-yet"].includes(renewalResult.status) || !renewalHtml.includes("Monthly Renewal Review") || !renewalMd.includes("Missing Before Renewal Ask") || !renewalMd.includes("Do not pitch renewal")) {
    failures.push("client renewal review export did not create the guarded renewal package");
  }
  rmSync("clients/kit-smoke-test", { recursive: true, force: true });
} catch (error) {
  rmSync("clients/kit-smoke-test", { recursive: true, force: true });
  failures.push(`client scaffold smoke test failed: ${error.message}`);
}

try {
  rmSync("prospects/import-smoke-one", { recursive: true, force: true });
  rmSync("prospects/import-smoke-two", { recursive: true, force: true });
  const importFile = "prospects-import-smoke.txt";
  execFileSync("node", ["-e", `require('node:fs').writeFileSync('${importFile}', 'Import Smoke One|https://one.example|managed-it-cybersecurity|Austin|owner@example.com\\nImport Smoke Two|https://two.example|accounting-bookkeeping|Denver|founder@example.com\\n')`]);
  const output = execFileSync("node", ["scripts/import-prospects.mjs", importFile], {
    encoding: "utf8",
    stdio: ["ignore", "pipe", "pipe"]
  });
  const result = JSON.parse(output);
  if (result.status !== "done" || result.created !== 2) {
    failures.push("prospect import did not create two expected prospects");
  }
  for (const file of [
    "prospects/import-smoke-one/lead-score.md",
    "prospects/import-smoke-one/metadata.json",
    "prospects/import-smoke-one/pipeline.json",
    "prospects/import-smoke-two/lead-score.md",
    "prospects/import-smoke-two/metadata.json",
    "prospects/import-smoke-two/pipeline.json"
  ]) {
    if (!existsSync(file)) failures.push(`prospect import missing ${file}`);
  }
  rmSync("prospects/import-smoke-one", { recursive: true, force: true });
  rmSync("prospects/import-smoke-two", { recursive: true, force: true });
  rmSync(importFile, { force: true });
} catch (error) {
  rmSync("prospects/import-smoke-one", { recursive: true, force: true });
  rmSync("prospects/import-smoke-two", { recursive: true, force: true });
  rmSync("prospects-import-smoke.txt", { force: true });
  failures.push(`prospect import smoke test failed: ${error.message}`);
}

try {
  rmSync("prospects/kit-smoke-test", { recursive: true, force: true });
  const output = execFileSync("node", [
    "scripts/create-prospect-audit.mjs",
    "Kit Smoke Test",
    "--website",
    "https://kit.example",
    "--vertical",
    "managed-it-cybersecurity",
    "--city",
    "Austin",
    "--contact",
    "owner@example.com"
  ], {
    encoding: "utf8",
    stdio: ["ignore", "pipe", "pipe"]
  });
  const result = JSON.parse(output);
  if (result.status !== "created" || result.path !== "prospects/kit-smoke-test") {
    failures.push("prospect scaffold did not report expected output");
  }
  for (const file of [
    "prospects/kit-smoke-test/lead-score.md",
    "prospects/kit-smoke-test/loom-outline.md",
    "prospects/kit-smoke-test/outreach.md",
    "prospects/kit-smoke-test/buyer-room.md",
    "prospects/kit-smoke-test/value-calculator.md",
    "prospects/kit-smoke-test/metadata.json",
    "prospects/kit-smoke-test/pipeline.json",
    "prospects/kit-smoke-test/audit-brief.md"
  ]) {
    if (!existsSync(file)) failures.push(`prospect scaffold missing ${file}`);
  }
  const scaffoldPipeline = JSON.parse(readFileSync("prospects/kit-smoke-test/pipeline.json", "utf8"));
  if (!Array.isArray(scaffoldPipeline.touches) || scaffoldPipeline.sentChannel !== "" || scaffoldPipeline.lastChannel !== "") {
    failures.push("prospect scaffold pipeline missing channel-memory defaults");
  }
  writeFileSync("prospects/kit-bad-lead-scores.txt", [
    "prospects/kit-smoke-test|999/16|record|Impossible score should fail",
    "prospects/kit-smoke-test|14/16|skip|Priority contradicts score band",
    "prospects/kit-smoke-test|14/16|record|too short"
  ].join("\n"));
  let badLeadScoreBlocked = false;
  try {
    execFileSync("node", ["scripts/batch-score-prospects.mjs", "prospects/kit-bad-lead-scores.txt", "--dry-run", "--strict", "--report=prospects/kit-bad-lead-score-report.md"], {
      encoding: "utf8",
      stdio: ["ignore", "pipe", "pipe"]
    });
  } catch {
    badLeadScoreBlocked = true;
  }
  const badLeadScoreReport = existsSync("prospects/kit-bad-lead-score-report.md") ? readFileSync("prospects/kit-bad-lead-score-report.md", "utf8") : "";
  if (!badLeadScoreBlocked || !badLeadScoreReport.includes("score must use N/16 format") || !badLeadScoreReport.includes("does not match score band") || !badLeadScoreReport.includes("scoring reason must be at least 12 characters")) {
    failures.push("batch lead scoring did not block bad scores, mismatched priority, and weak reasons");
  }
  writeFileSync("prospects/kit-good-lead-scores.txt", "prospects/kit-smoke-test|14/16|record|High-ticket MSP with a visible homepage decision leak\n");
  const goodLeadScoreOutput = execFileSync("node", ["scripts/batch-score-prospects.mjs", "prospects/kit-good-lead-scores.txt", "--dry-run", "--strict", "--report=prospects/kit-good-lead-score-report.md"], {
    encoding: "utf8",
    stdio: ["ignore", "pipe", "pipe"]
  });
  const goodLeadScoreResult = JSON.parse(goodLeadScoreOutput);
  if (goodLeadScoreResult.status !== "dry-run" || goodLeadScoreResult.scored !== 1 || goodLeadScoreResult.skipped.length !== 0) {
    failures.push("batch lead scoring rejected a valid scoring row");
  }
  rmSync("prospects/kit-bad-lead-scores.txt", { force: true });
  rmSync("prospects/kit-bad-lead-score-report.md", { force: true });
  rmSync("prospects/kit-good-lead-scores.txt", { force: true });
  rmSync("prospects/kit-good-lead-score-report.md", { force: true });
  writeFileSync("prospects/kit-smoke-test/lead-score.md", `# Kit Smoke Test Lead Score

## Prospect

- Website: https://kit.example
- Vertical: managed-it-cybersecurity
- City: Austin
- Contact: owner@example.com

## Fit Score

| Signal | Points | Notes |
|---|---:|---|
| Live service/product offer | 2 | yes |
| Clear decision-maker or founder | 2 | yes |
| High-ticket or repeat-purchase economics | 2 | yes |
| Obvious architecture, copy, trust, or CTA leak | 2 | yes |
| Reviews, case studies, or customer proof exist | 2 | yes |
| Competitors are clearer than them | 2 | yes |
| Already spending on SEO, ads, email, or content | 1 | maybe |
| Fix can be explained in a 2-3 minute Loom | 2 | yes |

## Total

- Score: 15/16
- Priority: record
`);
  writeFileSync("prospects/kit-smoke-test/loom-outline.md", `# Kit Smoke Test Loom Outline

## Wedge

Site architecture

## Recording Flow

1. Why I picked the business: I reviewed https://kit.example.
2. Main money page: homepage
3. Specific leak: the homepage makes buyers choose between too many service paths before the primary managed IT offer is clear
4. Why it matters: buyers need the first decision to be obvious before they book a call
5. Competitor/reference contrast: clearer MSP pages route buyers by problem first, then service detail
6. First fix: add a choose-your-path section near the first CTA
7. Sprint pitch: Tangible Revenue Leak Sprint + Search Trust Layer
`);
  writeFileSync("prospects/kit-smoke-test/outreach.md", `# Kit Smoke Test Outreach

## Contact

- Name: Kit Owner
- Role: Owner
- Email: owner@example.com
- LinkedIn/X:

## First Message

Subject: Quick audit for Kit Smoke Test

Hey Kit Owner,

I recorded a short audit for Kit Smoke Test. The main thing I noticed is the homepage makes buyers choose between too many service paths before the primary managed IT offer is clear.

Here is the Loom: [link]

If useful, I can run a Tangible Revenue Leak Sprint + Search Trust Layer where I map the leak, rewrite the key page sections, tighten the search trust layer, and give you a 30-day action plan.

If this is not useful, reply no and I will not follow up.

Nish
`);
  writeFileSync("prospects/kit-smoke-test/buyer-room.md", `# Kit Smoke Test Buyer Room

## Loom

- Link:

## What I Saw

- Leak 1: the homepage makes buyers choose between too many service paths before the primary managed IT offer is clear
- Leak 2: proof is not close enough to the first decision point
- Leak 3: the next step could be more specific

## Scope

- Sprint: Tangible Revenue Leak Sprint + Search Trust Layer
- Timeline: 7 days
- Price: $1,000 founder sprint

## Next Step

- Approve: reply yes
- Pay: add payment link
- Complete intake: after payment
`);
  const packageOutput = execFileSync("node", ["scripts/draft-loom-package.mjs", "prospects/kit-smoke-test"], {
    encoding: "utf8",
    stdio: ["ignore", "pipe", "pipe"]
  });
  const packageResult = JSON.parse(packageOutput);
  if (packageResult.status !== "created" || !existsSync("prospects/kit-smoke-test/loom-package.md")) {
    failures.push("prospect package smoke test failed to create loom package");
  }
  writeFileSync("prospects/kit-contact-fixture.html", `<html><body><a href="mailto:sales@example.com">Sales</a><a href="/contact">Contact</a><form action="/contact"></form></body></html>`);
  const contactPlanOutput = execFileSync("node", ["scripts/enrich-prospect-contact-plan.mjs", "prospects/kit-smoke-test", "--html=prospects/kit-contact-fixture.html"], {
    encoding: "utf8",
    stdio: ["ignore", "pipe", "pipe"]
  });
  const contactPlanResult = JSON.parse(contactPlanOutput);
  if (contactPlanResult.status !== "created" || contactPlanResult.emails < 1 || !readFileSync("prospects/kit-smoke-test/contact-plan.md", "utf8").includes("sales@example.com")) {
    failures.push("prospect contact plan smoke test failed");
  }
  rmSync("prospects/kit-contact-fixture.html", { force: true });
  const recordingScriptOutput = execFileSync("node", ["scripts/draft-loom-recording-script.mjs", "prospects/kit-smoke-test"], {
    encoding: "utf8",
    stdio: ["ignore", "pipe", "pipe"]
  });
  const recordingScriptResult = JSON.parse(recordingScriptOutput);
  if (recordingScriptResult.status !== "created" || !existsSync("prospects/kit-smoke-test/recording-script.md")) {
    failures.push("prospect recording script smoke test failed");
  }
  const smokeRecordingScript = readFileSync("prospects/kit-smoke-test/recording-script.md", "utf8");
  if (!smokeRecordingScript.includes("npm run prospect:outbox") || /prospect:stage -- prospects\/kit-smoke-test sent --channel/.test(smokeRecordingScript)) {
    failures.push("prospect recording script must route sent marking through the outbox");
  }
  if (!smokeRecordingScript.includes("2-3 minute cold audit")) {
    failures.push("prospect recording script did not use the short cold-Loom default");
  }
  writeFileSync("prospects/kit-page-fixture.html", `<html><head><title>Managed IT Austin | Kit</title><meta name="description" content="Managed IT, cybersecurity, and compliance support for Austin teams."></head><body><h1>Managed IT Service Provider</h1><h2>Cybersecurity</h2><h2>Compliance</h2><a href="/contact">Schedule Assessment</a><button>Contact Us</button><p>24/7 support, HIPAA, SOC 2, Microsoft partner, testimonials.</p></body></html>`);
  const pageSnapshotOutput = execFileSync("node", ["scripts/snapshot-prospect-page.mjs", "prospects/kit-smoke-test", "--html=prospects/kit-page-fixture.html"], {
    encoding: "utf8",
    stdio: ["ignore", "pipe", "pipe"]
  });
  const pageSnapshotResult = JSON.parse(pageSnapshotOutput);
  const pageSnapshot = readFileSync("prospects/kit-smoke-test/page-snapshot.md", "utf8");
  if (pageSnapshotResult.status !== "created" || !pageSnapshot.includes("Managed IT Service Provider") || !pageSnapshot.includes("Schedule Assessment")) {
    failures.push("prospect page snapshot smoke test failed");
  }
  const prepOutput = execFileSync("node", [
    "scripts/prepare-recording-batch.mjs",
    "--limit=1",
    "--only=prospects/kit-smoke-test",
    "--skip-site-check",
    "--skip-mission",
    "--html=prospects/kit-page-fixture.html",
    "--output-prefix=prospects/kit-prep"
  ], {
    encoding: "utf8",
    stdio: ["ignore", "pipe", "pipe"]
  });
  const prepResult = JSON.parse(prepOutput);
  const refreshedScript = readFileSync("prospects/kit-smoke-test/recording-script.md", "utf8");
  if (prepResult.status !== "ready" || prepResult.count !== 1 || !existsSync("prospects/kit-prep-queue.md") || !existsSync("prospects/kit-prep-cockpit.html") || !existsSync("prospects/kit-prep-teleprompter.html")) {
    failures.push("recording batch prep smoke test failed");
  }
  if (!Array.isArray(prepResult.contactPlans) || prepResult.contactPlans.length !== 1 || !readFileSync("prospects/kit-smoke-test/contact-plan.md", "utf8").includes("## Best Route")) {
    failures.push("recording batch prep did not refresh contact plans");
  }
  if (!refreshedScript.includes("## Live Page Cues") || !refreshedScript.includes("Visible promise: Managed IT Service Provider")) {
    failures.push("recording batch prep did not refresh snapshot-aware recording script");
  }
  rmSync("prospects/kit-prep-queue.md", { force: true });
  rmSync("prospects/kit-prep-cockpit.html", { force: true });
  rmSync("prospects/kit-prep-teleprompter.html", { force: true });
  rmSync("prospects/kit-page-fixture.html", { force: true });
  let unpreparedSentBlocked = false;
  try {
    execFileSync("node", ["scripts/update-prospect-pipeline.mjs", "prospects/kit-smoke-test", "sent", "--channel", "contact-form"], {
      encoding: "utf8",
      stdio: ["ignore", "pipe", "pipe"]
    });
  } catch {
    unpreparedSentBlocked = true;
  }
  if (!unpreparedSentBlocked) {
    failures.push("prospect sent stage was not blocked before approved send package");
  }
  let lostWithoutNoteBlocked = false;
  try {
    execFileSync("node", ["scripts/update-prospect-pipeline.mjs", "prospects/kit-smoke-test", "lost"], {
      encoding: "utf8",
      stdio: ["ignore", "pipe", "pipe"]
    });
  } catch {
    lostWithoutNoteBlocked = true;
  }
  if (!lostWithoutNoteBlocked) {
    failures.push("prospect lost stage was not blocked without a learning note");
  }
  let earlyReplyBlocked = false;
  try {
    execFileSync("node", ["scripts/update-prospect-pipeline.mjs", "prospects/kit-smoke-test", "replied", "--note", "Fake early reply"], {
      encoding: "utf8",
      stdio: ["ignore", "pipe", "pipe"]
    });
  } catch {
    earlyReplyBlocked = true;
  }
  if (!earlyReplyBlocked) {
    failures.push("prospect reply stage was not blocked before first send");
  }
  const loomLink = "https://www.loom.com/share/kit-smoke-test";
  writeFileSync("prospects/kit-smoke-test/recording-notes.md", `# Recording Notes

Generated: 2026-05-29

## Source

- Prospect: prospects/kit-smoke-test
- Loom: ${loomLink}
- Approval: approved

## Quality Notes

- Visible leak: the homepage makes buyers choose between too many service paths before the primary managed IT offer is clear
- Buyer impact: buyers need the first decision to be obvious before they book a call
- First fix: add a choose-your-path section near the first CTA
- Clean ask: If useful, I can run a 7-day sprint where I map this leak and send the exact page structure

## Rule

Use these notes as the truth from the recorded Loom. Do not invent stronger claims in the send package.
`);
  const sendPrepOutput = execFileSync("node", ["scripts/prepare-prospect-send.mjs", "prospects/kit-smoke-test", loomLink, "--approved", "--outbox=prospects/kit-send-outbox.html"], {
    encoding: "utf8",
    stdio: ["ignore", "pipe", "pipe"]
  });
  const sendPrepResult = JSON.parse(sendPrepOutput);
  if (!["ready", "draft"].includes(sendPrepResult.status) || !readFileSync("prospects/kit-smoke-test/buyer-room.md", "utf8").includes(loomLink)) {
    failures.push("prospect send prep command did not update buyer room");
  }
  if (!readFileSync("prospects/kit-smoke-test/send-package.md", "utf8").includes("## Channel Guidance")) {
    failures.push("prospect send package missing channel guidance");
  }
  if (!existsSync("prospects/kit-smoke-test/next-message.md") || !existsSync("prospects/kit-smoke-test/send-package.md") || sendPrepResult.files.outbox !== "prospects/kit-send-outbox.html" || !existsSync("prospects/kit-send-outbox.html")) {
    failures.push("prospect send prep command did not create message and send package");
  }
  if (!readFileSync("prospects/kit-smoke-test/send-package.md", "utf8").includes("Loom quality: approved")) {
    failures.push("prospect send prep did not record Loom quality approval");
  }
  if (!readFileSync("prospects/kit-smoke-test/send-package.md", "utf8").includes("Reply-Worthy Proof Gate")) {
    failures.push("prospect send prep did not include the reply-worthy proof gate");
  }
  writeFileSync("prospects/kit-loom-links.txt", `prospects/kit-smoke-test|${loomLink}|approved|the homepage makes buyers choose between too many service paths before the primary managed IT offer is clear|buyers need the first decision to be obvious before they book a call|add a choose-your-path section near the first CTA|If useful, I can run a 7-day sprint where I map this leak and send the exact page structure\n`);
  const batchOutput = execFileSync("node", ["scripts/prepare-prospect-batch-send.mjs", "prospects/kit-loom-links.txt", "--package=prospects/kit-batch-send-package.md", "--outbox=prospects/kit-batch-outbox.html"], {
    encoding: "utf8",
    stdio: ["ignore", "pipe", "pipe"]
  });
  const batchResult = JSON.parse(batchOutput);
  const batchPackage = existsSync("prospects/kit-batch-send-package.md") ? readFileSync("prospects/kit-batch-send-package.md", "utf8") : "";
  if (batchResult.status !== "prepared" || batchResult.prepared !== 1 || batchResult.outboxPath !== "prospects/kit-batch-outbox.html" || !existsSync("prospects/kit-batch-send-package.md") || !existsSync("prospects/kit-batch-outbox.html")) {
    failures.push("prospect batch send prep smoke test failed");
  }
  if (!batchPackage.includes("Do not reuse the approved Loom-link sheet as the sent sheet")) {
    failures.push("prospect batch send package missing outbox sent-sheet guard");
  }
  const noteRow = `prospects/kit-smoke-test|${loomLink}|approved|Leak is visible on the homepage|Buyer impact is clear enough|First fix is the homepage hero|Clean ask is a short reply\n`;
  execFileSync("pbcopy", {
    input: noteRow,
    stdio: ["pipe", "ignore", "pipe"]
  });
  const batchClipboardOutput = execFileSync("node", ["scripts/prepare-prospect-batch-send.mjs", "prospects/kit-clipboard-loom-links.txt", "--from-clipboard", "--package=prospects/kit-batch-send-package-clipboard.md", "--outbox=prospects/kit-batch-outbox-clipboard.html"], {
    encoding: "utf8",
    stdio: ["ignore", "pipe", "pipe"]
  });
  const batchClipboardResult = JSON.parse(batchClipboardOutput);
  if (batchClipboardResult.status !== "prepared" || batchClipboardResult.prepared !== 1 || batchClipboardResult.outboxPath !== "prospects/kit-batch-outbox-clipboard.html" || !existsSync("prospects/kit-batch-send-package-clipboard.md") || !existsSync("prospects/kit-batch-outbox-clipboard.html")) {
    failures.push("prospect batch send prep clipboard approval smoke test failed");
  }
  writeFileSync("prospects/kit-sent-links.txt", `prospects/kit-smoke-test|${loomLink}|contact-form\n`);
  const batchSentDryRunOutput = execFileSync("node", ["scripts/complete-prospect-batch-send.mjs", "prospects/kit-sent-links.txt", "--dry-run", "--report=prospects/kit-batch-send-complete.md"], {
    encoding: "utf8",
    stdio: ["ignore", "pipe", "pipe"]
  });
  const batchSentDryRunResult = JSON.parse(batchSentDryRunOutput);
  if (batchSentDryRunResult.status !== "completed" || batchSentDryRunResult.completed !== 1 || !existsSync("prospects/kit-batch-send-complete.md")) {
    failures.push("prospect batch sent dry-run smoke test failed");
  }
  execFileSync("pbcopy", {
    input: `prospects/kit-smoke-test|${loomLink}|contact-form\n`,
    stdio: ["pipe", "ignore", "pipe"]
  });
  const batchSentClipboardOutput = execFileSync("node", ["scripts/complete-prospect-batch-send.mjs", "prospects/kit-clipboard-sent-links.txt", "--from-clipboard", "--dry-run", "--report=prospects/kit-batch-send-complete-clipboard.md"], {
    encoding: "utf8",
    stdio: ["ignore", "pipe", "pipe"]
  });
  const batchSentClipboardResult = JSON.parse(batchSentClipboardOutput);
  if (batchSentClipboardResult.status !== "completed" || batchSentClipboardResult.completed !== 1 || !existsSync("prospects/kit-batch-send-complete-clipboard.md")) {
    failures.push("prospect batch sent clipboard smoke test failed");
  }
  writeFileSync("prospects/kit-email-sent-links.txt", `prospects/kit-smoke-test|${loomLink}|email\n`);
  let emailBatchAllowed = false;
  let emailBatchBlocked = false;
  try {
    const emailBatchOutput = execFileSync("node", ["scripts/complete-prospect-batch-send.mjs", "prospects/kit-email-sent-links.txt", "--dry-run", "--strict", "--report=prospects/kit-email-batch-send-complete.md"], {
      encoding: "utf8",
      stdio: ["ignore", "pipe", "pipe"]
    });
    const emailBatchResult = JSON.parse(emailBatchOutput);
    emailBatchAllowed = emailBatchResult.status === "completed" && emailBatchResult.completed === 1;
  } catch {
    emailBatchBlocked = true;
  }
  if (senderEmailReady && !emailBatchAllowed) {
    failures.push("prospect batch sent rejected email even though sender setup is ready");
  }
  if (!senderEmailReady && !emailBatchBlocked) {
    failures.push("prospect batch sent did not block email while sender setup is dirty");
  }
  rmSync("prospects/kit-email-sent-links.txt", { force: true });
  rmSync("prospects/kit-email-batch-send-complete.md", { force: true });
  const unapprovedBatchFolder = "prospects/kit-batch-sent-guard";
  const unapprovedLoom = "https://www.loom.com/share/kit-batch-sent-guard";
  mkdirSync(unapprovedBatchFolder, { recursive: true });
  writeFileSync(`${unapprovedBatchFolder}/send-package.md`, `# Send Package

- Loom: ${unapprovedLoom}
- Readiness: ready
- Loom quality: forced without approval
`);
  writeFileSync("prospects/kit-unapproved-sent-links.txt", `${unapprovedBatchFolder}|${unapprovedLoom}|contact-form\n`);
  let batchSentQualityBlocked = false;
  try {
    execFileSync("node", ["scripts/complete-prospect-batch-send.mjs", "prospects/kit-unapproved-sent-links.txt", "--dry-run", "--strict", "--report=prospects/kit-unapproved-batch-send-complete.md"], {
      encoding: "utf8",
      stdio: ["ignore", "pipe", "pipe"]
    });
  } catch {
    batchSentQualityBlocked = true;
  }
  if (!batchSentQualityBlocked) {
    failures.push("prospect batch sent did not require Loom quality approval");
  }
  rmSync(unapprovedBatchFolder, { recursive: true, force: true });
  rmSync("prospects/kit-unapproved-sent-links.txt", { force: true });
  rmSync("prospects/kit-unapproved-batch-send-complete.md", { force: true });
  rmSync("prospects/kit-batch-send-complete.md", { force: true });
  rmSync("prospects/kit-batch-send-complete-clipboard.md", { force: true });
  rmSync("prospects/kit-email-sent-links.txt", { force: true });
  rmSync("prospects/kit-email-batch-send-complete.md", { force: true });
  rmSync("prospects/kit-loom-links.txt", { force: true });
  rmSync("prospects/kit-sent-links.txt", { force: true });
  rmSync("prospects/kit-clipboard-sent-links.txt", { force: true });
  rmSync("prospects/kit-bad-lead-scores.txt", { force: true });
  rmSync("prospects/kit-bad-lead-score-report.md", { force: true });
  rmSync("prospects/kit-good-lead-scores.txt", { force: true });
  rmSync("prospects/kit-good-lead-score-report.md", { force: true });
  rmSync("prospects/kit-clipboard-loom-links.txt", { force: true });
  rmSync("prospects/kit-batch-send-package.md", { force: true });
  rmSync("prospects/kit-batch-send-package-clipboard.md", { force: true });
  rmSync("prospects/kit-batch-outbox.html", { force: true });
  rmSync("prospects/kit-batch-outbox-clipboard.html", { force: true });
  rmSync("prospects/kit-send-outbox.html", { force: true });
  const queueOutput = execFileSync("node", ["scripts/export-recording-queue.mjs", "--limit=1", "--output=prospects/kit-recording-queue.md"], {
    encoding: "utf8",
    stdio: ["ignore", "pipe", "pipe"]
  });
  const queueResult = JSON.parse(queueOutput);
  if (queueResult.status !== "created" || !existsSync("prospects/kit-recording-queue.md")) {
    failures.push("recording queue smoke test failed");
  }
  rmSync("prospects/kit-recording-queue.md", { force: true });
  const cockpitOutput = execFileSync("node", ["scripts/export-recording-cockpit.mjs", "--limit=1", "--output=prospects/kit-recording-cockpit.html"], {
    encoding: "utf8",
    stdio: ["ignore", "pipe", "pipe"]
  });
  const cockpitResult = JSON.parse(cockpitOutput);
  if (cockpitResult.status !== "created" || !readFileSync("prospects/kit-recording-cockpit.html", "utf8").includes("TinyStudio Recording Cockpit")) {
    failures.push("recording cockpit smoke test failed");
  }
  const recordingCockpit = readFileSync("prospects/kit-recording-cockpit.html", "utf8");
  if (!recordingCockpit.includes("Ready for command copy") || !recordingCockpit.includes("data-quality=\"ask\"") || !recordingCockpit.includes("Complete Loom quality checks") || !recordingCockpit.includes("Copy Outbox Command")) {
    failures.push("recording cockpit missing Loom URL validation or quality gate");
  }
  if (recordingCockpit.includes("Stage Sent:") || /prospect:stage -- prospects\/kit-smoke-test sent --channel/.test(recordingCockpit)) {
    failures.push("recording cockpit must not expose direct sent-stage shortcuts");
  }
  if (senderEmailReady && !recordingCockpit.includes("Copy Email Body")) {
    failures.push("recording cockpit should expose email body copy when sender setup is ready");
  }
  if (!senderEmailReady && (!recordingCockpit.includes("Email body blocked until send setup is clean") || recordingCockpit.includes("Copy Email Body"))) {
    failures.push("recording cockpit should block email body copy while sender setup is dirty");
  }
  rmSync("prospects/kit-recording-cockpit.html", { force: true });
  const teleprompterOutput = execFileSync("node", ["scripts/export-recording-teleprompter.mjs", "--limit=1", "--output=prospects/kit-recording-teleprompter.html"], {
    encoding: "utf8",
    stdio: ["ignore", "pipe", "pipe"]
  });
  const teleprompterResult = JSON.parse(teleprompterOutput);
  if (teleprompterResult.status !== "created" || !readFileSync("prospects/kit-recording-teleprompter.html", "utf8").includes("TinyStudio Recording Teleprompter")) {
    failures.push("recording teleprompter smoke test failed");
  }
  const teleprompter = readFileSync("prospects/kit-recording-teleprompter.html", "utf8");
  if (!teleprompter.includes("approved Looms") || !teleprompter.includes("data-quality=\"ask\"") || !teleprompter.includes("qualityNotes") || !teleprompter.includes("notes.leak") || !teleprompter.includes("Complete Loom checks and notes") || !teleprompter.includes("Start 3:00") || !teleprompter.includes("Send route:") || !teleprompter.includes("Channel rule:") || !teleprompter.includes("Recommended channel now:") || !teleprompter.includes("Contact Plan")) {
    failures.push("recording teleprompter missing Loom validation, quality gate, timer, send route, or channel guidance");
  }
  rmSync("prospects/kit-recording-teleprompter.html", { force: true });
  const rehearsalOutput = execFileSync("node", ["scripts/export-recording-rehearsal-check.mjs", "--limit=1", "--output=prospects/kit-recording-rehearsal-check.md", "--html=prospects/kit-recording-rehearsal-check.html"], {
    encoding: "utf8",
    stdio: ["ignore", "pipe", "pipe"]
  });
  const rehearsalResult = JSON.parse(rehearsalOutput);
  const rehearsalMarkdown = existsSync("prospects/kit-recording-rehearsal-check.md") ? readFileSync("prospects/kit-recording-rehearsal-check.md", "utf8") : "";
  const rehearsalHtml = existsSync("prospects/kit-recording-rehearsal-check.html") ? readFileSync("prospects/kit-recording-rehearsal-check.html", "utf8") : "";
  if (!["ready", "needs-polish", "empty"].includes(rehearsalResult.status) || !rehearsalMarkdown.includes("Recording Rehearsal Check") || !rehearsalHtml.includes("Recording Rehearsal Check")) {
    failures.push("recording rehearsal smoke test failed");
  }
  rmSync("prospects/kit-recording-rehearsal-check.md", { force: true });
  rmSync("prospects/kit-recording-rehearsal-check.html", { force: true });
  const outboxOutput = execFileSync("node", ["scripts/export-prospect-outbox.mjs", "--limit=1", "--output=prospects/kit-outbox.html"], {
    encoding: "utf8",
    stdio: ["ignore", "pipe", "pipe"]
  });
  const outboxResult = JSON.parse(outboxOutput);
  if (outboxResult.status !== "created" || outboxResult.count !== 1 || !readFileSync("prospects/kit-outbox.html", "utf8").includes("TinyStudio Prospect Outbox")) {
    failures.push("prospect outbox smoke test failed");
  }
  const kitOutbox = readFileSync("prospects/kit-outbox.html", "utf8");
  if (!kitOutbox.includes("Recommended channel") || !kitOutbox.includes("Mark Sent: Contact Form")) {
    failures.push("prospect outbox missing sender-aware channel guidance");
  }
  if (!kitOutbox.includes("Mark Sent: LinkedIn") || !kitOutbox.includes("Mark Sent: Phone") || !kitOutbox.includes("Mark Sent: Mixed") || !kitOutbox.includes("<option value=\"mixed\"")) {
    failures.push("prospect outbox missing full-channel sent-stage controls");
  }
  if (!kitOutbox.includes("Copy Batch Sent Sheet") || !kitOutbox.includes("Sent this message") || !kitOutbox.includes("No sent rows selected") || !kitOutbox.includes("data-stage-copy") || !kitOutbox.includes("npm run prospect:batch-sent -- --from-clipboard")) {
    failures.push("prospect outbox missing batch sent sheet or sent-confirmation gate");
  }
  if (senderEmailReady && (!kitOutbox.includes("Copy Email") || !kitOutbox.includes("Mark Sent: Email") || !kitOutbox.includes("<option value=\"email\""))) {
    failures.push("prospect outbox should expose email controls when sender setup is ready");
  }
  if (!senderEmailReady && (!kitOutbox.includes("Email blocked until send setup is clean") || kitOutbox.includes("Mark Sent: Email") || kitOutbox.includes("<option value=\"email\"") || />Copy Email<\/button>/.test(kitOutbox))) {
    failures.push("prospect outbox should block email controls while sender setup is dirty");
  }
  rmSync("prospects/kit-outbox.html", { force: true });
  const stageOutput = execFileSync("node", ["scripts/update-prospect-pipeline.mjs", "prospects/kit-smoke-test", "sent", "--date", "2026-01-01", "--channel", "contact-form"], {
    encoding: "utf8",
    stdio: ["ignore", "pipe", "pipe"]
  });
  const stageResult = JSON.parse(stageOutput);
  if (stageResult.stage !== "sent" || stageResult.nextFollowUpAt !== "2026-01-05" || stageResult.sentChannel !== "contact-form") {
    failures.push("prospect pipeline stage command did not schedule follow-up with channel");
  }
  let earlyFollowUpBlocked = false;
  try {
    execFileSync("node", ["scripts/update-prospect-pipeline.mjs", "prospects/kit-smoke-test", "followup-1", "--date", "2026-01-02", "--channel", "contact-form"], {
      encoding: "utf8",
      stdio: ["ignore", "pipe", "pipe"]
    });
  } catch {
    earlyFollowUpBlocked = true;
  }
  if (!earlyFollowUpBlocked) {
    failures.push("prospect follow-up stage was not blocked before due date");
  }
  const followupOutput = execFileSync("node", ["scripts/export-followup-cockpit.mjs", "--date=2026-01-05", "--limit=1", "--output=prospects/kit-followup-cockpit.html"], {
    encoding: "utf8",
    stdio: ["ignore", "pipe", "pipe"]
  });
  const followupResult = JSON.parse(followupOutput);
  if (followupResult.status !== "created" || followupResult.count !== 1 || !readFileSync("prospects/kit-followup-cockpit.html", "utf8").includes("TinyStudio Follow-Up Cockpit")) {
    failures.push("follow-up cockpit smoke test failed");
  }
  const kitFollowupCockpit = readFileSync("prospects/kit-followup-cockpit.html", "utf8");
  if (!kitFollowupCockpit.includes("last channel: contact-form") || !kitFollowupCockpit.includes("Mark Follow-Up: contact-form")) {
    failures.push("follow-up cockpit missing channel memory");
  }
  if (!kitFollowupCockpit.includes("Sent this follow-up") || !kitFollowupCockpit.includes("data-stage-copy") || !kitFollowupCockpit.includes("Check sent first")) {
    failures.push("follow-up cockpit missing sent-confirmation gate");
  }
  if (senderEmailReady && !kitFollowupCockpit.includes("Mark Follow-Up: email")) {
    failures.push("follow-up cockpit should expose email follow-up controls when sender setup is ready");
  }
  if (!senderEmailReady && (!kitFollowupCockpit.includes("Email blocked until send setup is clean") || kitFollowupCockpit.includes("Mark Follow-Up: email") || />Copy Email<\/button>/.test(kitFollowupCockpit))) {
    failures.push("follow-up cockpit should block email controls while sender setup is dirty");
  }
  rmSync("prospects/kit-followup-cockpit.html", { force: true });
  const linkedinPipelinePath = "prospects/kit-smoke-test/pipeline.json";
  const linkedinPipeline = JSON.parse(readFileSync(linkedinPipelinePath, "utf8"));
  linkedinPipeline.lastChannel = "linkedin";
  writeFileSync(linkedinPipelinePath, `${JSON.stringify(linkedinPipeline, null, 2)}\n`);
  const linkedinFollowupOutput = execFileSync("node", ["scripts/export-followup-cockpit.mjs", "--date=2026-01-05", "--limit=1", "--output=prospects/kit-followup-linkedin-cockpit.html"], {
    encoding: "utf8",
    stdio: ["ignore", "pipe", "pipe"]
  });
  const linkedinFollowupResult = JSON.parse(linkedinFollowupOutput);
  const linkedinFollowupCockpit = readFileSync("prospects/kit-followup-linkedin-cockpit.html", "utf8");
  if (linkedinFollowupResult.status !== "created" || !linkedinFollowupCockpit.includes("last channel: linkedin") || !linkedinFollowupCockpit.includes("Mark Follow-Up: linkedin")) {
    failures.push("follow-up cockpit did not preserve LinkedIn channel memory");
  }
  rmSync("prospects/kit-followup-linkedin-cockpit.html", { force: true });
  const followUpStageOutput = execFileSync("node", ["scripts/update-prospect-pipeline.mjs", "prospects/kit-smoke-test", "followup-1", "--date", "2026-01-05", "--channel", "contact-form"], {
    encoding: "utf8",
    stdio: ["ignore", "pipe", "pipe"]
  });
  const followUpStageResult = JSON.parse(followUpStageOutput);
  if (followUpStageResult.stage !== "followup-1" || followUpStageResult.nextFollowUpAt !== "2026-01-08" || followUpStageResult.channel !== "contact-form") {
    failures.push("prospect follow-up stage command did not respect due-date/channel guard");
  }
  const replyPrepOutput = execFileSync("node", ["scripts/prepare-prospect-reply.mjs", "prospects/kit-smoke-test", "--note", "Interested in the audit"], {
    encoding: "utf8",
    stdio: ["ignore", "pipe", "pipe"]
  });
  const replyPrepResult = JSON.parse(replyPrepOutput);
  if (replyPrepResult.status !== "created" || !existsSync("prospects/kit-smoke-test/reply-package.md")) {
    failures.push("prospect reply prep smoke test failed");
  }
  const repliedNextMessage = readFileSync("prospects/kit-smoke-test/next-message.md", "utf8");
  if (!repliedNextMessage.includes("Do not mark call-booked just because this reply was sent") || /prospect:stage -- prospects\/kit-smoke-test call-booked --channel/.test(repliedNextMessage)) {
    failures.push("prospect reply next-message can falsely advance to call-booked");
  }
  const callPrepOutput = execFileSync("node", ["scripts/draft-sales-call-prep.mjs", "prospects/kit-smoke-test"], {
    encoding: "utf8",
    stdio: ["ignore", "pipe", "pipe"]
  });
  const callPrepResult = JSON.parse(callPrepOutput);
  if (callPrepResult.status !== "created" || !existsSync("prospects/kit-smoke-test/sales-call-prep.md")) {
    failures.push("prospect sales call prep smoke test failed");
  }
  let callBookedPlaceholderBlocked = false;
  try {
    execFileSync("node", ["scripts/prepare-prospect-call-booked.mjs", "prospects/kit-smoke-test", "--time", "add call time", "--meeting", "add meeting link"], {
      encoding: "utf8",
      stdio: ["ignore", "pipe", "pipe"]
    });
  } catch {
    callBookedPlaceholderBlocked = true;
  }
  if (!callBookedPlaceholderBlocked) {
    failures.push("prospect call-booked prep accepted placeholder call time");
  }
  let earlyClosePrepBlocked = false;
  try {
    execFileSync("node", ["scripts/prepare-prospect-close-package.mjs", "prospects/kit-smoke-test", "--price", "$1,000"], {
      encoding: "utf8",
      stdio: ["ignore", "pipe", "pipe"]
    });
  } catch {
    earlyClosePrepBlocked = true;
  }
  if (!earlyClosePrepBlocked) {
    failures.push("prospect close prep was not blocked before call-booked stage");
  }
  const callBookedPrepOutput = execFileSync("node", ["scripts/prepare-prospect-call-booked.mjs", "prospects/kit-smoke-test", "--time", "Tue 2pm", "--meeting", "https://meet.example/kit"], {
    encoding: "utf8",
    stdio: ["ignore", "pipe", "pipe"]
  });
  const callBookedPrepResult = JSON.parse(callBookedPrepOutput);
  if (callBookedPrepResult.status !== "created" || callBookedPrepResult.stage !== "call-booked" || !existsSync("prospects/kit-smoke-test/call-booked-package.md")) {
    failures.push("prospect call-booked prep smoke test failed");
  }
  const closePlaceholderOutput = execFileSync("node", ["scripts/prepare-prospect-close-package.mjs", "prospects/kit-smoke-test", "--price", "$1,000", "--payment", "add payment link"], {
    encoding: "utf8",
    stdio: ["ignore", "pipe", "pipe"]
  });
  const closePlaceholderResult = JSON.parse(closePlaceholderOutput);
  const placeholderClosePackage = readFileSync("prospects/kit-smoke-test/close-package.md", "utf8");
  if (closePlaceholderResult.status !== "created" || /Complete payment here:\s*add payment link|Payment:\s*add payment link/i.test(placeholderClosePackage)) {
    failures.push("prospect close prep leaked payment placeholder");
  }
  const closePrepOutput = execFileSync("node", ["scripts/prepare-prospect-close-package.mjs", "prospects/kit-smoke-test", "--price", "$1,000", "--payment", "https://pay.example/kit"], {
    encoding: "utf8",
    stdio: ["ignore", "pipe", "pipe"]
  });
  const closePrepResult = JSON.parse(closePrepOutput);
  if (closePrepResult.status !== "created" || !existsSync("prospects/kit-smoke-test/close-package.md") || !readFileSync("prospects/kit-smoke-test/close-package.md", "utf8").includes("https://pay.example/kit")) {
    failures.push("prospect close prep smoke test failed");
  }
  const salesLossCockpitOutput = execFileSync("node", ["scripts/export-sales-cockpit.mjs", "--limit=1", "--output=prospects/kit-sales-loss-cockpit.html"], {
    encoding: "utf8",
    stdio: ["ignore", "pipe", "pipe"]
  });
  const salesLossCockpitResult = JSON.parse(salesLossCockpitOutput);
  const salesLossCockpit = readFileSync("prospects/kit-sales-loss-cockpit.html", "utf8");
  if (salesLossCockpitResult.status !== "created" || !salesLossCockpit.includes("Loss reason") || !salesLossCockpit.includes("data-lost-copy") || !salesLossCockpit.includes("Add loss reason")) {
    failures.push("sales cockpit missing loss-reason capture before Mark Lost");
  }
  rmSync("prospects/kit-sales-loss-cockpit.html", { force: true });
  rmSync("clients/kit-smoke-test", { recursive: true, force: true });
  let earlyConvertBlocked = false;
  try {
    execFileSync("node", ["scripts/convert-prospect-to-client.mjs", "prospects/kit-smoke-test"], {
      encoding: "utf8",
      stdio: ["ignore", "pipe", "pipe"]
    });
  } catch {
    earlyConvertBlocked = true;
  }
  if (!earlyConvertBlocked) {
    failures.push("prospect conversion was not blocked before won stage");
  }
  const wonStageOutput = execFileSync("node", ["scripts/update-prospect-pipeline.mjs", "prospects/kit-smoke-test", "won", "--date", "2026-01-05", "--note", "Approved sprint"], {
    encoding: "utf8",
    stdio: ["ignore", "pipe", "pipe"]
  });
  const wonStageResult = JSON.parse(wonStageOutput);
  if (wonStageResult.stage !== "won") {
    failures.push("prospect won stage command failed before conversion");
  }
  const salesCockpitOutput = execFileSync("node", ["scripts/export-sales-cockpit.mjs", "--limit=1", "--output=prospects/kit-sales-cockpit.html"], {
    encoding: "utf8",
    stdio: ["ignore", "pipe", "pipe"]
  });
  const salesCockpitResult = JSON.parse(salesCockpitOutput);
  const salesCockpit = readFileSync("prospects/kit-sales-cockpit.html", "utf8");
  if (salesCockpitResult.status !== "created" || !salesCockpit.includes("TinyStudio Sales Cockpit")) {
    failures.push("sales cockpit smoke test failed");
  }
  if (!salesCockpit.includes("Approval confirmed") || !salesCockpit.includes("data-confirmed-copy") || !salesCockpit.includes("Check confirmation first") || salesCockpit.includes(">Call Booked</button>")) {
    failures.push("sales cockpit missing stage-specific confirmation gate");
  }
  rmSync("prospects/kit-sales-cockpit.html", { force: true });
  const convertOutput = execFileSync("node", ["scripts/convert-prospect-to-client.mjs", "prospects/kit-smoke-test"], {
    encoding: "utf8",
    stdio: ["ignore", "pipe", "pipe"]
  });
  const convertResult = JSON.parse(convertOutput);
  if (convertResult.status !== "created" || convertResult.clientPath !== "clients/kit-smoke-test") {
    failures.push("prospect-to-client conversion did not report expected client path");
  }
  for (const file of [
    "clients/kit-smoke-test/intake.md",
    "clients/kit-smoke-test/kickoff-message.md",
    "clients/kit-smoke-test/delivery-cockpit.html",
    "clients/kit-smoke-test/client-dashboard.html",
    "clients/kit-smoke-test/client-dashboard.md",
    "clients/kit-smoke-test/reports/monthly-renewal-review.md",
    "clients/kit-smoke-test/reports/monthly-renewal-review.html",
    "clients/kit-smoke-test/sprint-plan.md",
    "clients/kit-smoke-test/quality/conversion-optimization-scorecard.md",
    "clients/kit-smoke-test/research/prospect-audit.md",
    "clients/kit-smoke-test/research/recording-script.md"
  ]) {
    if (!existsSync(file)) failures.push(`prospect-to-client conversion missing ${file}`);
  }
  const convertedIntake = existsSync("clients/kit-smoke-test/intake.md") ? readFileSync("clients/kit-smoke-test/intake.md", "utf8") : "";
  const convertedKickoff = existsSync("clients/kit-smoke-test/kickoff-message.md") ? readFileSync("clients/kit-smoke-test/kickoff-message.md", "utf8") : "";
  if (!convertedIntake.includes("Payment / written approval: approved sprint") || !convertedKickoff.includes("Thanks for approving")) {
    failures.push("prospect-to-client conversion did not preserve payment approval context");
  }
  rmSync("clients/kit-smoke-test", { recursive: true, force: true });
  const readinessOutput = execFileSync("node", ["scripts/check-prospect-readiness.mjs", "prospects/kit-smoke-test"], {
    encoding: "utf8",
    stdio: ["ignore", "pipe", "pipe"]
  });
  const readinessResult = JSON.parse(readinessOutput);
  if (readinessResult.status !== "ready" || readinessResult.missing.length !== 0 || readinessResult.warnings.length !== 0) {
    failures.push("prospect readiness check did not report a ready smoke prospect");
  }
  rmSync("prospects/kit-smoke-test", { recursive: true, force: true });
} catch (error) {
  rmSync("prospects/kit-smoke-test", { recursive: true, force: true });
  rmSync("prospects/kit-contact-fixture.html", { force: true });
  rmSync("prospects/kit-page-fixture.html", { force: true });
  rmSync("clients/kit-smoke-test", { recursive: true, force: true });
  rmSync("prospects/kit-sales-loss-cockpit.html", { force: true });
  rmSync("prospects/kit-followup-cockpit.html", { force: true });
  rmSync("prospects/kit-followup-linkedin-cockpit.html", { force: true });
  rmSync("prospects/kit-recording-teleprompter.html", { force: true });
  rmSync("prospects/kit-outbox.html", { force: true });
  rmSync("prospects/kit-batch-send-complete-clipboard.md", { force: true });
  rmSync("prospects/kit-loom-links.txt", { force: true });
  rmSync("prospects/kit-sent-links.txt", { force: true });
  rmSync("prospects/kit-clipboard-sent-links.txt", { force: true });
  rmSync("prospects/kit-clipboard-loom-links.txt", { force: true });
  rmSync("prospects/kit-batch-send-package.md", { force: true });
  rmSync("prospects/kit-batch-send-package-clipboard.md", { force: true });
  rmSync("prospects/kit-batch-outbox.html", { force: true });
  rmSync("prospects/kit-batch-outbox-clipboard.html", { force: true });
  rmSync("prospects/kit-send-outbox.html", { force: true });
  rmSync("prospects/kit-prep-queue.md", { force: true });
  rmSync("prospects/kit-prep-cockpit.html", { force: true });
  rmSync("prospects/kit-prep-teleprompter.html", { force: true });
  failures.push(`prospect scaffold smoke test failed: ${error.message}`);
}

const bannedClaims = [
  /\bguarantee(?:d|s)?\b/i,
  /\b5x\b/i,
  /\b10x\b/i,
  /\brisk[- ]free\b/i,
  /increase revenue by/i,
  /guaranteed ROAS/i,
  /rank #1/i
];

function walk(path) {
  if (!existsSync(path)) return [];
  const stat = statSync(path);
  if (stat.isFile()) return [path];
  return readdirSync(path).flatMap((entry) => walk(`${path}/${entry}`));
}

const stageCommandFiles = ["scripts", "growth-brain", "prospects", "README.md", "TASKS.md"]
  .flatMap(walk)
  .filter((file) => /\.(mjs|md|html|json)$/.test(file) || ["README.md", "TASKS.md"].includes(file));

for (const file of stageCommandFiles) {
  const lines = readFileSync(file, "utf8").split("\n");
  lines.forEach((line, index) => {
    if (/prospect:stage --\s+\S+\s+sent\b(?![^\n]*--channel)/.test(line)) {
      failures.push(`${file}:${index + 1} has sent stage command without --channel`);
    }
    if (/prospect:send-prep -- [^\n]*(?:loom\.com\/share|LOOM_URL|__LOOM_URL__)/.test(line) && !line.includes("--approved")) {
      failures.push(`${file}:${index + 1} has send-prep command without --approved`);
    }
  });
}

for (const file of ["growth-brain/offer.md", "growth-brain/sales/one-page-offer.md", "growth-brain/sales/managed-it-one-page-offer.md"]) {
  const content = existsSync(file) ? readFileSync(file, "utf8") : "";
  for (const pattern of bannedClaims) {
    if (pattern.test(content)) failures.push(`${file} contains an unprovable claim pattern: ${pattern}`);
  }
}

if (failures.length) {
  console.error(JSON.stringify({ status: "fail", failures }, null, 2));
  process.exit(1);
}

console.log(JSON.stringify({
  status: "pass",
  kit: "growth-brain",
  requiredFiles: requiredFiles.length,
  agents: agentFiles.length,
  workflows: workflowFiles.length,
  sales: salesFiles.length,
  quality: qualityFiles.length,
  retention: retentionFiles.length,
  verticals: verticalFiles.length,
  aiVisibility: aiVisibilityFiles.length,
  delivery: deliveryFiles.length,
  ops: opsFiles.length,
  prospecting: prospectingFiles.length
}, null, 2));
