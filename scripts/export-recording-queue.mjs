#!/usr/bin/env node
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { handleHelp, resolveOutputPath } from "./lib/operator-cli.mjs";
import { listOutboundProspectFolders } from "./lib/outbound-prospects.mjs";
import { checkProspectReadiness, prospectWarningWeight } from "./lib/prospect-readiness.mjs";

const args = process.argv.slice(2);
handleHelp(args, `Usage: node scripts/export-recording-queue.mjs [--limit=5] [--output=prospects/recording-queue.md]`);
const limitArg = args.find((arg) => arg.startsWith("--limit="));
const limit = limitArg ? Number(limitArg.split("=")[1]) : 5;
const outputArg = args.find((arg) => arg.startsWith("--output="));
const outputRel = outputArg ? outputArg.split("=")[1] : "prospects/recording-queue.md";
const outputPath = resolveOutputPath(outputRel, { fallback: "prospects/recording-queue.md" });

function listFolders(root) {
  return listOutboundProspectFolders(root);
}

function read(relativePath) {
  return existsSync(relativePath) ? readFileSync(relativePath, "utf8") : "";
}

function json(relativePath) {
  return existsSync(relativePath) ? JSON.parse(readFileSync(relativePath, "utf8")) : {};
}

const candidates = listFolders("prospects")
  .map((path) => {
    const metadata = json(join(path, "metadata.json"));
    const pipeline = json(join(path, "pipeline.json"));
    const result = checkProspectReadiness(path);
    return {
      path,
      name: metadata.name || path.split("/").at(-1),
      website: metadata.website || "",
      stage: pipeline.stage || "new",
      warnings: result.warnings || [],
      weight: prospectWarningWeight(result.warnings || [])
    };
  })
  .filter((prospect) => !["won", "lost", "paused"].includes(prospect.stage))
  .sort((a, b) => a.weight - b.weight || a.name.localeCompare(b.name))
  .slice(0, limit);

const lines = [
  "# Recording Queue",
  "",
  `Generated from the first ${candidates.length} closest-to-send prospects.`,
  ""
];

for (const prospect of candidates) {
  const script = read(join(prospect.path, "recording-script.md"));
  lines.push(`## ${prospect.name}`);
  lines.push("");
  lines.push(`- Folder: \`${prospect.path}\``);
  lines.push(`- Website: ${prospect.website}`);
  lines.push(`- Page snapshot: ${prospect.path}/page-snapshot.md`);
  lines.push(`- Sharpness brief: ${prospect.path}/recording-sharpness-brief.md`);
  lines.push(`- Stage: ${prospect.stage}`);
  lines.push(`- Warnings: ${prospect.warnings.length ? prospect.warnings.join("; ") : "none"}`);
  lines.push("");
  lines.push("### Record");
  lines.push("");
  lines.push(script ? script.replace(/^# .+\n+/, "").trim() : "Run `npm run prospect:script -- " + prospect.path + "` first.");
  lines.push("");
}

const outputDir = outputPath.split("/").slice(0, -1).join("/");
if (outputDir) mkdirSync(outputDir, { recursive: true });
writeFileSync(outputPath, `${lines.join("\n")}\n`);

console.log(JSON.stringify({
  status: "created",
  path: outputPath,
  count: candidates.length
}, null, 2));
