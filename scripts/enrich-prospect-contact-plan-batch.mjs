#!/usr/bin/env node
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { listOutboundProspectFolders } from "./lib/outbound-prospects.mjs";
import { execFileSync } from "node:child_process";
import { localIsoDate } from "./date-utils.mjs";

const args = process.argv.slice(2);
const limitArg = args.find((arg) => arg.startsWith("--limit="));
const reportArg = args.find((arg) => arg.startsWith("--report="));
const timeoutArg = args.find((arg) => arg.startsWith("--timeout="));
const limit = limitArg ? Number(limitArg.split("=")[1]) : 10;
const reportPath = reportArg ? reportArg.split("=")[1] : "prospects/contact-plan-batch.md";
const dryRun = args.includes("--dry-run");
const offline = args.includes("--offline");
const includeExisting = args.includes("--all");
const strict = args.includes("--strict");

function listFolders(root) {
  return listOutboundProspectFolders(root);
}

function json(path) {
  return existsSync(path) ? JSON.parse(readFileSync(path, "utf8")) : {};
}

function read(path) {
  return existsSync(path) ? readFileSync(path, "utf8") : "";
}

function hasLeadScore(path) {
  const content = read(join(path, "lead-score.md"));
  return Boolean(content.trim()) && !/Score:\s*$/m.test(content) && !/Priority:\s*record \/ research-more \/ skip/m.test(content);
}

function hasLoomPackage(path) {
  return existsSync(join(path, "loom-package.md"));
}

function hasContactPlan(path) {
  return existsSync(join(path, "contact-plan.md"));
}

function prospectWeight(prospect) {
  if (prospect.hasContactPlan && !includeExisting) return 99;
  if (prospect.scored && prospect.hasLoomPackage) return 0;
  if (prospect.scored) return 1;
  return 3;
}

function runJson(commandArgs) {
  const output = execFileSync("node", commandArgs, {
    encoding: "utf8",
    stdio: ["ignore", "pipe", "pipe"]
  });
  return JSON.parse(output);
}

const prospects = listFolders("prospects")
  .map((path) => {
    const metadata = json(join(path, "metadata.json"));
    const pipeline = json(join(path, "pipeline.json"));
    return {
      path,
      name: metadata.name || path.split("/").at(-1),
      website: metadata.website || "",
      stage: pipeline.stage || "new",
      scored: hasLeadScore(path),
      hasLoomPackage: hasLoomPackage(path),
      hasContactPlan: hasContactPlan(path)
    };
  })
  .filter((prospect) => !["won", "lost", "paused"].includes(prospect.stage))
  .filter((prospect) => includeExisting || !prospect.hasContactPlan)
  .sort((a, b) => prospectWeight(a) - prospectWeight(b) || a.name.localeCompare(b.name))
  .slice(0, limit);

const results = [];
const skipped = [];

if (!dryRun) {
  for (const prospect of prospects) {
    try {
      const command = ["scripts/enrich-prospect-contact-plan.mjs", prospect.path];
      if (offline) command.push("--offline");
      if (timeoutArg) command.push(timeoutArg);
      const result = runJson(command);
      results.push({
        ...prospect,
        status: result.status,
        bestRoute: result.bestRoute,
        sourceStatus: result.sourceStatus
      });
    } catch (error) {
      skipped.push({
        ...prospect,
        reason: error.message
      });
    }
  }
}

const lines = [
  "# Contact Plan Batch",
  "",
  `Generated: ${localIsoDate()}`,
  `Mode: ${dryRun ? "dry-run" : offline ? "offline" : "live"}`,
  `Limit: ${limit}`,
  "",
  "## Selected",
  ""
];

if (prospects.length) {
  for (const prospect of prospects) {
    const result = results.find((item) => item.path === prospect.path);
    lines.push(`- ${prospect.path} - ${prospect.name}${result ? ` - ${result.bestRoute}` : ""}`);
  }
} else {
  lines.push("- none");
}

if (skipped.length) {
  lines.push("");
  lines.push("## Skipped");
  lines.push("");
  for (const item of skipped) {
    lines.push(`- ${item.path} - ${item.reason}`);
  }
}

const reportDir = reportPath.split("/").slice(0, -1).join("/");
if (reportDir) mkdirSync(reportDir, { recursive: true });
writeFileSync(reportPath, `${lines.join("\n")}\n`);

console.log(JSON.stringify({
  status: skipped.length ? "partial" : dryRun ? "dry-run" : "completed",
  reportPath,
  selected: prospects.length,
  completed: results.length,
  skipped
}, null, 2));

if (strict && skipped.length) process.exit(1);
