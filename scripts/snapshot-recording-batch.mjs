#!/usr/bin/env node
import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { execFileSync } from "node:child_process";
import { checkProspectReadiness, prospectWarningWeight } from "./lib/prospect-readiness.mjs";
import { listOutboundProspectFolders } from "./lib/outbound-prospects.mjs";

const limitArg = process.argv.find((arg) => arg.startsWith("--limit="));
const limit = limitArg ? Number(limitArg.split("=")[1]) : 5;

function listFolders(root) {
  return listOutboundProspectFolders(root);
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

const prospects = listFolders("prospects")
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

const results = prospects.map((prospect) => runJson(["scripts/snapshot-prospect-page.mjs", prospect.path]));

console.log(JSON.stringify({
  status: results.some((result) => result.status === "failed") ? "warning" : "created",
  count: results.length,
  results
}, null, 2));
