#!/usr/bin/env node
import { existsSync, readFileSync } from "node:fs";
import { execFileSync } from "node:child_process";
import { join } from "node:path";
import { checkProspectReadiness, prospectWarningWeight } from "./lib/prospect-readiness.mjs";
import { guardOutboundProspectPath, listOutboundProspectFolders } from "./lib/outbound-prospects.mjs";

const args = process.argv.slice(2);
const limitArg = args.find((arg) => arg.startsWith("--limit="));
const limit = limitArg ? Number(limitArg.split("=")[1]) : 5;
const timeoutArg = args.find((arg) => arg.startsWith("--timeout="));
const timeoutMs = timeoutArg ? Number(timeoutArg.split("=")[1]) : 10000;
const htmlArg = args.find((arg) => arg.startsWith("--html="));
const onlyArg = args.find((arg) => arg.startsWith("--only="));
const onlyPaths = onlyArg ? onlyArg.split("=")[1].split(",").map((value) => value.trim()).filter(Boolean) : [];
const skipSiteCheck = args.includes("--skip-site-check") || onlyPaths.length > 0;
const skipSnapshot = args.includes("--skip-snapshot") || args.includes("--offline");
const skipContactPlan = args.includes("--skip-contact-plan") || args.includes("--offline");
const skipMission = args.includes("--skip-mission");
const includeSmoke = args.includes("--include-smoke");
const prefixArg = args.find((arg) => arg.startsWith("--output-prefix="));
const outputPrefix = prefixArg ? prefixArg.split("=")[1] : "";

function outputPath(defaultPath, suffix) {
  return outputPrefix ? `${outputPrefix}-${suffix}` : defaultPath;
}

const paths = {
  siteCheck: outputPath("prospects/recording-site-check.md", "site-check.md"),
  queue: outputPath("prospects/recording-queue.md", "queue.md"),
  cockpit: outputPath("prospects/recording-cockpit.html", "cockpit.html"),
  teleprompter: outputPath("prospects/recording-teleprompter.html", "teleprompter.html"),
  rehearsal: outputPath("prospects/recording-rehearsal-check.md", "rehearsal-check.md"),
  rehearsalHtml: outputPath("prospects/recording-rehearsal-check.html", "rehearsal-check.html"),
  mission: outputPath("runs/daily-money-mission.md", "mission.md"),
  missionHtml: outputPath("runs/daily-money-mission.html", "mission.html")
};

function listFolders(root) {
  return listOutboundProspectFolders(root).filter((path) => includeSmoke || !/(^|\/)(?:kit|import)-smoke/.test(path));
}

function json(path) {
  return existsSync(path) ? JSON.parse(readFileSync(path, "utf8")) : {};
}

function runJson(commandArgs) {
  const output = execFileSync("node", commandArgs, {
    encoding: "utf8",
    stdio: ["ignore", "pipe", "pipe"]
  });
  return JSON.parse(output);
}

const prospectFolders = onlyPaths.length
  ? onlyPaths.map((path) => {
      guardOutboundProspectPath(path);
      return path;
    })
  : listFolders("prospects");

const prospects = prospectFolders
  .map((path) => {
    const metadata = json(join(path, "metadata.json"));
    const pipeline = json(join(path, "pipeline.json"));
    const result = checkProspectReadiness(path);
    return {
      path,
      name: metadata.name || path.split("/").at(-1),
      website: metadata.website || "",
      stage: pipeline.stage || "new",
      weight: prospectWarningWeight(result.warnings || [])
    };
  })
  .filter((prospect) => prospect.website && !["won", "lost", "paused"].includes(prospect.stage))
  .sort((a, b) => a.weight - b.weight || a.name.localeCompare(b.name))
  .slice(0, limit);

let siteCheck = null;
if (!skipSiteCheck) {
  siteCheck = runJson([
    "scripts/check-recording-sites.mjs",
    `--limit=${limit}`,
    `--timeout=${timeoutMs}`,
    `--output=${paths.siteCheck}`
  ]);
}

const snapshots = [];
if (!skipSnapshot) {
  for (const prospect of prospects) {
    const snapshotArgs = [
      "scripts/snapshot-prospect-page.mjs",
      prospect.path,
      `--timeout=${timeoutMs}`
    ];
    if (htmlArg) snapshotArgs.push(htmlArg);
    snapshots.push(runJson(snapshotArgs));
  }
}

const contactPlans = [];
if (!skipContactPlan) {
  for (const prospect of prospects) {
    const contactArgs = [
      "scripts/enrich-prospect-contact-plan.mjs",
      prospect.path,
      `--timeout=${timeoutMs}`
    ];
    if (htmlArg) contactArgs.push(htmlArg);
    contactPlans.push(runJson(contactArgs));
  }
}

const briefs = prospects.map((prospect) => runJson([
  "scripts/draft-recording-sharpness-brief.mjs",
  prospect.path
]));

const scripts = prospects.map((prospect) => runJson([
  "scripts/draft-loom-recording-script.mjs",
  prospect.path
]));

const queue = runJson([
  "scripts/export-recording-queue.mjs",
  `--limit=${limit}`,
  `--output=${paths.queue}`
]);
const cockpit = runJson([
  "scripts/export-recording-cockpit.mjs",
  `--limit=${limit}`,
  `--output=${paths.cockpit}`
]);
const teleprompter = runJson([
  "scripts/export-recording-teleprompter.mjs",
  `--limit=${limit}`,
  `--output=${paths.teleprompter}`
]);
const rehearsal = runJson([
  "scripts/export-recording-rehearsal-check.mjs",
  `--limit=${limit}`,
  `--output=${paths.rehearsal}`,
  `--html=${paths.rehearsalHtml}`
]);

let mission = null;
if (!skipMission) {
  mission = runJson([
    "scripts/export-daily-money-mission.mjs",
    `--limit=${limit}`,
    `--output=${paths.mission}`,
    `--html=${paths.missionHtml}`
  ]);
}

const failedSnapshots = snapshots.filter((result) => result.status === "failed");
const siteFailures = siteCheck?.failures || [];

console.log(JSON.stringify({
  status: failedSnapshots.length || siteFailures.length ? "warning" : "ready",
  count: prospects.length,
  prospects: prospects.map((prospect) => prospect.path),
  siteCheck: siteCheck ? {
    status: siteCheck.status,
    path: siteCheck.path,
    failures: siteFailures
  } : null,
  snapshots,
  contactPlans: contactPlans.map((result) => ({
    prospectPath: result.prospectPath,
    status: result.status,
    path: result.path,
    bestRoute: result.bestRoute
  })),
  briefs: briefs.map((result) => ({
    prospectPath: result.prospectPath,
    path: result.path,
    stage: result.stage,
    angle: result.angle,
    mechanism: result.mechanism
  })),
  scripts: scripts.map((result) => result.path),
  files: {
    queue: queue.path,
    cockpit: cockpit.path,
    teleprompter: teleprompter.path,
    rehearsal: rehearsal.path,
    rehearsalHtml: rehearsal.htmlPath,
    mission: mission?.path || null
  }
}, null, 2));
