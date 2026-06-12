#!/usr/bin/env node
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { execFileSync } from "node:child_process";
import { localIsoDate } from "./date-utils.mjs";
import { checkProspectReadiness } from "./lib/prospect-readiness.mjs";
import { isValidLoomUrl } from "./lib/loom-url.mjs";
import { listClientFolders, listProspectFolders } from "./lib/list-operational-folders.mjs";

const outputArg = process.argv.find((arg) => arg.startsWith("--output="));
const outputPath = outputArg ? outputArg.split("=")[1] : "growth-brain/ops/live-metrics.md";
const plain = process.argv.includes("--plain");
const today = localIsoDate();

function read(path) {
  return existsSync(path) ? readFileSync(path, "utf8") : "";
}

function json(path) {
  return existsSync(path) ? JSON.parse(readFileSync(path, "utf8")) : {};
}

function runJson(script, targetPath) {
  const output = execFileSync("node", [script, targetPath], {
    encoding: "utf8",
    stdio: ["ignore", "pipe", "pipe"]
  });
  return JSON.parse(output);
}

function hasLeadScore(path) {
  const content = read(join(path, "lead-score.md"));
  return !/Score:\s*$/m.test(content) && !/Priority:\s*record \/ research-more \/ skip/m.test(content);
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

const prospectRows = listProspectFolders().map((path) => {
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

const clientRows = listClientFolders().map((path) => {
  const readiness = runJson("scripts/check-client-readiness.mjs", path);
  return {
    path,
    name: path.split("/").at(-1),
    ready: readiness.status === "ready"
  };
});

const activeProspects = prospectRows.filter((prospect) => !["won", "lost", "paused"].includes(prospect.stage));
const sentStages = new Set(["sent", "followup-1", "followup-2", "followup-3", "replied", "call-booked", "won", "lost"]);
const replyStages = new Set(["replied", "call-booked", "won"]);
const callStages = new Set(["call-booked", "won"]);

const counts = {
  prospectsTotal: prospectRows.length,
  activeProspects: activeProspects.length,
  scored: prospectRows.filter((prospect) => prospect.scored).length,
  loomsRecorded: prospectRows.filter((prospect) => prospect.loomRecorded).length,
  readyToSend: activeProspects.filter((prospect) => prospect.ready).length,
  sends: prospectRows.filter((prospect) => sentStages.has(prospect.stage)).length,
  replies: prospectRows.filter((prospect) => replyStages.has(prospect.stage)).length,
  calls: prospectRows.filter((prospect) => callStages.has(prospect.stage)).length,
  closed: prospectRows.filter((prospect) => prospect.stage === "won").length,
  lost: prospectRows.filter((prospect) => prospect.stage === "lost").length,
  waitingFollowUp: activeProspects.filter((prospect) => /^sent|followup-/.test(prospect.stage) && prospect.nextFollowUpAt > today).length,
  dueFollowUp: activeProspects.filter((prospect) => prospect.nextFollowUpAt && prospect.nextFollowUpAt <= today).length,
  clients: clientRows.length,
  clientsReady: clientRows.filter((client) => client.ready).length
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
| Scored prospects | ${counts.scored} |
| Looms recorded | ${counts.loomsRecorded} |
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

- If scored is high and Looms recorded is low, record before researching.
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
