#!/usr/bin/env node
import { existsSync, readFileSync, writeFileSync, copyFileSync } from "node:fs";
import { join } from "node:path";
import { execFileSync } from "node:child_process";
import { localIsoDate } from "./date-utils.mjs";

const args = process.argv.slice(2);
const prospectPath = args.find((arg) => !arg.startsWith("--"));
const force = args.includes("--force");

if (!prospectPath) {
  console.error("Usage: npm run prospect:convert -- prospects/prospect-slug [--force]");
  process.exit(1);
}

if (!existsSync(prospectPath)) {
  console.error(`Prospect folder not found: ${prospectPath}`);
  process.exit(1);
}

function read(relativePath) {
  const path = join(prospectPath, relativePath);
  return existsSync(path) ? readFileSync(path, "utf8") : "";
}

function readJson(relativePath) {
  const path = join(prospectPath, relativePath);
  return existsSync(path) ? JSON.parse(readFileSync(path, "utf8")) : {};
}

function lineValue(content, number, fallback) {
  const pattern = new RegExp(`^${number}\\. [^\\n:]+:[ \\t]*([^\\n]*)$`, "m");
  const match = content.match(pattern);
  return match && match[1].trim() ? match[1].trim() : fallback;
}

function slugify(value) {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 80);
}

const metadata = readJson("metadata.json");
const pipeline = readJson("pipeline.json");
const name = metadata.name || prospectPath.split("/").at(-1);
const clientRoot = join("clients", slugify(name));

if (!force && pipeline.stage !== "won") {
  console.error("Prospect must be marked won before conversion. Run prospect:stage won after explicit approval, or use --force only for recovery.");
  process.exit(1);
}

if (!force && !read("close-package.md").includes("## Proposal")) {
  console.error("Close package missing. Run prospect:close-prep before converting a won prospect.");
  process.exit(1);
}

if (existsSync(clientRoot)) {
  console.error(`Client sprint already exists: ${clientRoot}`);
  process.exit(1);
}

const createOutput = execFileSync("node", ["scripts/create-client-sprint.mjs", name], {
  encoding: "utf8",
  stdio: ["ignore", "pipe", "pipe"]
});
const createResult = JSON.parse(createOutput);

const loomOutline = read("loom-outline.md");
const buyerRoom = read("buyer-room.md");
const leadScore = read("lead-score.md");
const auditBrief = read("audit-brief.md");
const valueCalculator = read("value-calculator.md");
const salesCallPrep = read("sales-call-prep.md");

const website = metadata.website || "";
const vertical = metadata.vertical || "";
const contact = metadata.contact || "";
const mainPage = lineValue(loomOutline, 2, "");
const leak = lineValue(loomOutline, 3, "");
const firstFix = lineValue(loomOutline, 6, "");

writeFileSync(join(clientRoot, "intake.md"), `# ${name} Intake

## Client

- Name: ${name}
- Website: ${website}
- Main offer: ${vertical}
- Target buyer:
- Approval contact: ${contact}
- Payment / written approval: approved sprint
- Sprint dates:

## Required Context

- Website URLs: ${website}
- Competitors:
- Reviews/testimonials:
- Analytics screenshots:
- Ads/emails:
- Founder notes:

## Source Prospect

- Prospect folder: ${prospectPath}
- Original main page: ${mainPage}
- Original leak: ${leak}
- Original first fix: ${firstFix}

## Access Notes

- Analytics:
- CMS:
- Email/SMS:
- Ads:

## Open Questions

-
`);

writeFileSync(join(clientRoot, "sprint-plan.md"), `# ${name} Sprint Plan

## Wedge

${loomOutline.match(/## Wedge\n+([\s\S]*?)(?:\n## |$)/)?.[1]?.trim() || "Site architecture"}

## Sprint Checklist

Use \`growth-brain/sprint-checklist.md\`.

## Deliverables

- Leak map: ${leak}
- Page/site fix: ${firstFix}
- Ad angles:
- Email/SMS drafts:
- Competitor watch:
- Weekly report:
- 30-day plan:

## Approval Gates

- Claims:
- Pricing:
- Proof:
- Competitor-inspired ideas:
- Final client-facing copy:

## Status

- Intake:
- Brain filled:
- Drafted:
- Approved:
- Delivered:
- Follow-up:
`);

if (buyerRoom) writeFileSync(join(clientRoot, "buyer-room.md"), buyerRoom);

writeFileSync(join(clientRoot, "research", "prospect-audit.md"), `# ${name} Prospect Audit Archive

## Lead Score

${leadScore || "No lead score found."}

## Loom Outline

${loomOutline || "No Loom outline found."}

## Audit Brief

${auditBrief || "No audit brief found."}

## Value Calculator

${valueCalculator || "No value calculator found."}

## Sales Call Prep

${salesCallPrep || "No sales call prep found."}
`);

for (const file of ["loom-package.md", "recording-script.md", "outreach.md"]) {
  const source = join(prospectPath, file);
  if (existsSync(source)) copyFileSync(source, join(clientRoot, "research", file));
}

const pipelinePath = join(prospectPath, "pipeline.json");
if (existsSync(pipelinePath)) {
  const nextPipeline = JSON.parse(readFileSync(pipelinePath, "utf8"));
  nextPipeline.stage = "won";
  nextPipeline.lastTouchAt = localIsoDate();
  nextPipeline.convertedClientPath = clientRoot;
  writeFileSync(pipelinePath, `${JSON.stringify(nextPipeline, null, 2)}\n`);
}

execFileSync("node", ["scripts/draft-client-kickoff.mjs", clientRoot], {
  encoding: "utf8",
  stdio: ["ignore", "pipe", "pipe"]
});

execFileSync("node", ["scripts/export-client-delivery-cockpit.mjs", clientRoot], {
  encoding: "utf8",
  stdio: ["ignore", "pipe", "pipe"]
});

execFileSync("node", ["scripts/export-client-facing-dashboard.mjs", clientRoot], {
  encoding: "utf8",
  stdio: ["ignore", "pipe", "pipe"]
});

execFileSync("node", ["scripts/export-client-renewal-review.mjs", clientRoot], {
  encoding: "utf8",
  stdio: ["ignore", "pipe", "pipe"]
});

console.log(JSON.stringify({
  status: "created",
  prospectPath,
  clientPath: createResult.path
}, null, 2));
