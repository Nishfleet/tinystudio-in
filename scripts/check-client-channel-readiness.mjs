#!/usr/bin/env node
import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { CHANNELS, parseChannelReadiness } from "./lib/channel-readiness.mjs";

const args = process.argv.slice(2);
const clientPath = args.find((arg) => !arg.startsWith("--"));
const strict = args.includes("--strict");

if (!clientPath) {
  console.error("Usage: npm run client:channels-check -- clients/client-slug [-- --strict] (node scripts/check-client-channel-readiness.mjs)");
  process.exit(1);
}

if (!existsSync(clientPath)) {
  console.error(`Client folder not found: ${clientPath}`);
  process.exit(1);
}

const scorecardPath = join(clientPath, "quality/channel-readiness-scorecard.md");
const missing = [];
const warnings = [];

if (!existsSync(scorecardPath)) missing.push(`Missing ${scorecardPath}`);

const markdown = existsSync(scorecardPath) ? readFileSync(scorecardPath, "utf8") : "";
const summary = parseChannelReadiness(markdown);

for (const channel of CHANNELS) {
  if (!summary.channels.some((row) => row.channel === channel)) {
    warnings.push(`Channel readiness missing row: ${channel}`);
  }
}

if (!summary.readyChannels.length) {
  warnings.push("No channels are ready yet");
}

if (!summary.proofSprintReady) {
  warnings.push("Proof Sprint channel gate is not ready: CRO / conversion and SEO / search trust must both be ready");
}

const status = missing.length
  ? "missing"
  : summary.status;

const result = {
  status,
  clientPath,
  scorecardPath,
  readyChannels: summary.readyChannels,
  blockedChannels: summary.blockedChannels,
  watchChannels: summary.watchChannels,
  draftChannels: summary.draftChannels,
  proofSprintReady: summary.proofSprintReady,
  weeklyGrowthDeskReady: summary.weeklyGrowthDeskReady,
  fullStackGrowthDeskReady: summary.fullStackGrowthDeskReady,
  operatorPodReady: summary.operatorPodReady,
  missing,
  warnings
};

console.log(JSON.stringify(result, null, 2));

if (strict && (missing.length || warnings.length)) process.exit(1);
