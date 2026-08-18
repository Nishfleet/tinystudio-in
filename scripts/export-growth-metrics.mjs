#!/usr/bin/env node
import { existsSync, mkdirSync, readdirSync, readFileSync, writeFileSync } from "node:fs";
import { isAbsolute, join, resolve } from "node:path";
import { localIsoDate } from "./date-utils.mjs";
import { handleHelp, resolveOutputPath } from "./lib/operator-cli.mjs";
import { checkProspectReadiness } from "./lib/prospect-readiness.mjs";
import { isValidLoomUrl } from "./lib/loom-url.mjs";
import { loadValidatedServiceClients } from "./lib/validated-service-client.mjs";
import { listOutboundProspectFolders } from "./lib/outbound-prospects.mjs";
import { runRepoJson } from "./lib/runtime-roots.mjs";

handleHelp(process.argv.slice(2), `Usage: node scripts/export-growth-metrics.mjs [--output=growth-brain/ops/live-metrics.md] [--plain]`);
const outputArg = process.argv.find((arg) => arg.startsWith("--output="));
const outputPath = resolveOutputPath(outputArg?.split("=").slice(1).join("="), { fallback: "growth-brain/ops/live-metrics.md" });
const plain = process.argv.includes("--plain");
const today = localIsoDate();
const repoRoot = process.env.SERVICE_REPO_ROOT || process.cwd();

// Every read and write is anchored to the service root (SERVICE_REPO_ROOT or
// the invocation directory) so live metrics regenerated from any working
// directory report the same pipeline state the rest of the operator surfaces
// read.
const resolvedOutputPath = isAbsolute(outputPath) ? outputPath : join(repoRoot, outputPath);
const prospectRoot = join(repoRoot, "prospects");
const trackedMetricsPath = join(repoRoot, "growth-brain/ops/live-metrics.md");

// Outbound pipeline state exists only when at least one real prospect folder
// carries a pipeline record. An absent prospects/ directory AND an empty one
// (for example one left behind by a private zero-state run) both mean the
// pipeline is unavailable, never empty.
const hasProspectPipelineState = existsSync(prospectRoot)
  && listFolders(prospectRoot).some((path) => existsSync(join(path, "pipeline.json")));

// The default output is a git-tracked operator surface. When the service root
// holds no outbound prospect pipeline state, regeneration cannot tell an empty
// pipeline from an unavailable one, so it refuses instead of silently
// clobbering the tracked surface with a zero pipeline. Explicit private
// outputs under runs/ keep generating zero-state reports on purpose.
const regeneratesTrackedMetrics = resolve(resolvedOutputPath) === resolve(trackedMetricsPath);
if (regeneratesTrackedMetrics && !hasProspectPipelineState) {
  console.error(`Refusing to regenerate the tracked live metrics with a zero pipeline: no outbound prospect pipeline state found at ${prospectRoot}. Run this command from the service root that holds prospects/, or set SERVICE_REPO_ROOT to it, or pass an explicit --output= under runs/ for a private zero-state report.`);
  process.exit(1);
}
if (!hasProspectPipelineState) {
  console.warn(`Warning: no outbound prospect pipeline state found at ${prospectRoot}; pipeline counts in ${outputPath} will be zero.`);
}

function listFolders(root) {
  if (root === "prospects" || root.endsWith("/prospects")) return listOutboundProspectFolders(root).filter((path) => !/(^|\/)(?:kit|import)-smoke/.test(path));
  if (!existsSync(root)) return [];
  return readdirSync(root, { withFileTypes: true })
    .filter((entry) => entry.isDirectory())
    .filter((entry) => !/^(kit|import)-smoke/.test(entry.name))
    .map((entry) => join(root, entry.name))
    .sort();
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

function hasLoom(path) {
  const buyerRoom = read(join(path, "buyer-room.md"));
  const loomMatch = buyerRoom.match(/^- Link:[ \t]*([^\n]*)$/m);
  return Boolean(loomMatch && isValidLoomUrl(loomMatch[1].trim()));
}

function loomUrl(path) {
  const buyerRoom = read(join(path, "buyer-room.md"));
  return buyerRoom.match(/^- Link:[ \t]*([^\n]*)$/m)?.[1]?.trim() || "";
}

function hasApprovedSendPackage(path) {
  const url = loomUrl(path);
  if (!isValidLoomUrl(url)) return false;
  const sendPackage = read(join(path, "send-package.md"));
  return sendPackage.includes(`- Loom: ${url}`)
    && /- Loom quality:\s*approved/.test(sendPackage)
    && /- Readiness:\s*ready/.test(sendPackage);
}

function percent(numerator, denominator) {
  if (!denominator) return "0%";
  return `${Math.round((numerator / denominator) * 100)}%`;
}

const prospectRows = listFolders(join(repoRoot, "prospects")).map((path) => {
  const metadata = json(join(path, "metadata.json"));
  const pipeline = json(join(path, "pipeline.json"));
  const readiness = checkProspectReadiness(path);
  return {
    path,
    name: metadata.name || path.split("/").at(-1),
    stage: pipeline.stage || "new",
    nextFollowUpAt: pipeline.nextFollowUpAt || "",
    scored: hasLeadScore(path),
    loomRecorded: hasLoom(path),
    ready: readiness.status === "ready" && hasApprovedSendPackage(path)
  };
});

const clientFolders = listFolders(join(repoRoot, "clients"));
const validatedClientRecords = loadValidatedServiceClients(repoRoot);
const canonicalClientPaths = new Set(validatedClientRecords.map((client) => client.clientPath));
const unregisteredClientFolders = clientFolders.filter((path) => !canonicalClientPaths.has(path));
const blockedClientRecords = validatedClientRecords.filter((client) => !client.ok || !client.day0);
const clientRows = validatedClientRecords.filter((client) => client.ok && client.day0).map((client) => {
  const path = client.clientPath;
  const readiness = runRepoJson(["scripts/check-client-readiness.mjs", path]);
  return {
    path,
    name: path.split("/").at(-1),
    ready: readiness.status === "ready"
  };
});

const activeProspects = prospectRows.filter((prospect) => !["won", "lost", "paused"].includes(prospect.stage));
const activeScoredProspects = activeProspects.filter((prospect) => prospect.scored);
const sentStages = new Set(["sent", "followup-1", "followup-2", "followup-3", "replied", "call-booked", "won", "lost"]);
const replyStages = new Set(["replied", "call-booked", "won"]);
const callStages = new Set(["call-booked", "won"]);

const counts = {
  prospectsTotal: prospectRows.length,
  activeProspects: activeProspects.length,
  scored: activeScoredProspects.length,
  scoredIncludingInactive: prospectRows.filter((prospect) => prospect.scored).length,
  loomsRecorded: activeProspects.filter((prospect) => prospect.loomRecorded).length,
  loomsRecordedIncludingInactive: prospectRows.filter((prospect) => prospect.loomRecorded).length,
  readyToSend: activeProspects.filter((prospect) => prospect.ready).length,
  sends: prospectRows.filter((prospect) => sentStages.has(prospect.stage)).length,
  replies: prospectRows.filter((prospect) => replyStages.has(prospect.stage)).length,
  calls: prospectRows.filter((prospect) => callStages.has(prospect.stage)).length,
  closed: prospectRows.filter((prospect) => prospect.stage === "won").length,
  lost: prospectRows.filter((prospect) => prospect.stage === "lost").length,
  waitingFollowUp: activeProspects.filter((prospect) => /^sent|followup-/.test(prospect.stage) && prospect.nextFollowUpAt > today).length,
  dueFollowUp: activeProspects.filter((prospect) => prospect.nextFollowUpAt && prospect.nextFollowUpAt <= today).length,
  clients: clientRows.length,
  clientsReady: clientRows.filter((client) => client.ready).length,
  clientsBlocked: blockedClientRecords.length + unregisteredClientFolders.length
};

const rates = {
  loomRateFromScored: percent(counts.loomsRecorded, counts.scored),
  sendRateFromLooms: percent(counts.sends, counts.loomsRecorded),
  replyRateFromSends: percent(counts.replies, counts.sends),
  callRateFromReplies: percent(counts.calls, counts.replies),
  closeRateFromCalls: percent(counts.closed, counts.calls)
};

const stageCounts = prospectRows.reduce((accumulator, prospect) => {
  accumulator[prospect.stage] = (accumulator[prospect.stage] || 0) + 1;
  return accumulator;
}, {});

const markdown = `# Live Metrics

Generated: ${today}

## Funnel

| Metric | Count |
|---|---:|
| Prospects total | ${counts.prospectsTotal} |
| Active prospects | ${counts.activeProspects} |
| Active scored prospects | ${counts.scored} |
| Scored including inactive | ${counts.scoredIncludingInactive} |
| Looms recorded | ${counts.loomsRecorded} |
| Looms recorded including inactive | ${counts.loomsRecordedIncludingInactive} |
| Ready to send | ${counts.readyToSend} |
| Sends | ${counts.sends} |
| Replies | ${counts.replies} |
| Calls | ${counts.calls} |
| Closed | ${counts.closed} |
| Lost | ${counts.lost} |
| Waiting follow-up | ${counts.waitingFollowUp} |
| Due follow-up | ${counts.dueFollowUp} |
| Clients | ${counts.clients} |
| Clients ready | ${counts.clientsReady} |
| Client records blocked | ${counts.clientsBlocked} |

## Conversion Rates

| Metric | Current |
|---|---:|
| Looms / scored | ${rates.loomRateFromScored} |
| Sends / Looms | ${rates.sendRateFromLooms} |
| Replies / sends | ${rates.replyRateFromSends} |
| Calls / replies | ${rates.callRateFromReplies} |
| Closed / calls | ${rates.closeRateFromCalls} |

## Pipeline Stages

| Stage | Count |
|---|---:|
${Object.entries(stageCounts).sort(([a], [b]) => a.localeCompare(b)).map(([stage, count]) => `| ${stage} | ${count} |`).join("\n")}

## Decision Rule

- If active scored prospects are high and Looms recorded is low, record before researching.
- If Looms recorded is high and sends is low, run send-prep and send.
- If sends are high and replies are low, improve lead fit, audit hook, or first message.
- If replies are high and calls are low, improve the reply-to-call message.
- If calls are high and closed is low, improve scope, price, or proof.
`;

const outputDir = outputPath.split("/").slice(0, -1).join("/");
if (outputDir) mkdirSync(outputDir, { recursive: true });
writeFileSync(outputPath, markdown);

const result = {
  status: "created",
  path: outputPath,
  date: today,
  counts,
  rates
};

if (plain) {
  console.log("TinyStudio Metrics");
  console.log("");
  console.log(`Prospects: ${counts.prospectsTotal}`);
  console.log(`Scored: ${counts.scored}`);
  console.log(`Looms recorded: ${counts.loomsRecorded}`);
  console.log(`Sends: ${counts.sends}`);
  console.log(`Replies: ${counts.replies}`);
  console.log(`Calls: ${counts.calls}`);
  console.log(`Closed: ${counts.closed}`);
  console.log(`Due follow-up: ${counts.dueFollowUp}`);
} else {
  console.log(JSON.stringify(result, null, 2));
}
