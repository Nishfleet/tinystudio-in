#!/usr/bin/env node
import { existsSync, readFileSync } from "node:fs";
import { execFileSync } from "node:child_process";
import { resolve } from "node:path";
import { pathToFileURL } from "node:url";

const args = process.argv.slice(2);
const noOpen = args.includes("--no-open") || args.includes("--dry-run");
const viewArg = args.find((arg) => arg.startsWith("--view="));
let view = viewArg ? viewArg.split("=")[1] : "auto";

const views = {
  auto: [],
  mission: ["growth-brain/ops/daily-money-mission.html"],
  cockpit: ["growth-brain/ops/growth-cockpit.html"],
  score: ["growth-brain/ops/daily-money-mission.html", "prospects/lead-scoring-cockpit.html"],
  record: [
    "growth-brain/ops/daily-money-mission.html",
    "prospects/recording-rehearsal-check.html",
    "prospects/recording-teleprompter.html",
    "growth-brain/ops/market-proof-cockpit.html"
  ],
  send: ["growth-brain/ops/daily-money-mission.html", "prospects/outbox.html"],
  followup: ["growth-brain/ops/daily-money-mission.html", "prospects/followup-cockpit.html"],
  sales: ["growth-brain/ops/daily-money-mission.html", "prospects/sales-cockpit.html"],
  all: [
    "growth-brain/ops/daily-money-mission.html",
    "prospects/recording-rehearsal-check.html",
    "prospects/recording-teleprompter.html",
    "growth-brain/ops/market-proof-cockpit.html",
    "prospects/outbox.html",
    "prospects/followup-cockpit.html",
    "prospects/sales-cockpit.html"
  ]
};

if (!views[view]) {
  console.error("Usage: npm run growth:start -- [--view=auto|mission|cockpit|score|record|send|followup|sales|all] [--no-open]");
  process.exit(1);
}

function runJson(commandArgs) {
  const output = execFileSync("node", commandArgs, {
    encoding: "utf8",
    stdio: ["ignore", "pipe", "pipe"]
  });
  return JSON.parse(output);
}

let mission = "";

function viewForMission(value) {
  if (/book calls|close open sales calls/i.test(value)) return "sales";
  if (/follow-ups/i.test(value)) return "followup";
  if (/record the scored looms/i.test(value)) return "record";
  if (/send the recorded looms/i.test(value)) return "send";
  if (/score the next prospects|improve lead fit/i.test(value)) return "score";
  return "mission";
}

if (view === "cockpit") {
  runJson(["scripts/export-growth-cockpit.mjs"]);
  const missionMarkdown = readFileSync("growth-brain/ops/daily-money-mission.md", "utf8");
  mission = missionMarkdown.match(/## Today's Constraint\n+([\s\S]*?)(?:\n## |$)/)?.[1]?.trim() || "";
} else {
  const missionResult = runJson(["scripts/export-daily-money-mission.mjs", "--limit=5"]);
  mission = missionResult.mission || "";
  runJson(["scripts/export-lead-scoring-cockpit.mjs", "--limit=10"]);
  if (view === "auto") view = viewForMission(mission);
}

if (view === "record" || view === "all") {
  runJson(["scripts/export-recording-rehearsal-check.mjs", "--limit=5"]);
  runJson(["scripts/export-market-proof-cockpit.mjs"]);
}

const files = views[view];
const missing = files.filter((file) => !existsSync(file));
if (missing.length) {
  console.error(`Missing generated pages: ${missing.join(", ")}`);
  process.exit(1);
}

const urls = files.map((file) => pathToFileURL(resolve(file)).href);

if (!noOpen) {
  for (const url of urls) {
    execFileSync("open", [url], { stdio: "ignore" });
  }
}

console.log(JSON.stringify({
  status: noOpen ? "ready" : "opened",
  view,
  mission,
  files,
  urls
}, null, 2));
