#!/usr/bin/env node
import { existsSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { execFileSync } from "node:child_process";
import { agencyConfig } from "./lib/agency-config.mjs";

const args = process.argv.slice(2);
const prospectPath = args[0];

function option(name) {
  const index = args.indexOf(`--${name}`);
  return index >= 0 ? args[index + 1] || "" : "";
}

const note = option("note");
const config = agencyConfig();

if (!prospectPath) {
  console.error("Usage: npm run prospect:reply-prep -- prospects/prospect-slug [--note \"...\"]");
  process.exit(1);
}

if (!existsSync(prospectPath)) {
  console.error(`Prospect folder not found: ${prospectPath}`);
  process.exit(1);
}

function runJson(commandArgs) {
  const output = execFileSync("node", commandArgs, {
    encoding: "utf8",
    stdio: ["ignore", "pipe", "pipe"]
  });
  return JSON.parse(output);
}

function read(relativePath) {
  const path = join(prospectPath, relativePath);
  return existsSync(path) ? readFileSync(path, "utf8") : "";
}

function section(content, heading, fallback = "") {
  const escaped = heading.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const match = content.match(new RegExp(`## ${escaped}\\n+([\\s\\S]*?)(?:\\n## |$)`));
  return match ? match[1].trim() : fallback;
}

const stageArgs = ["scripts/update-prospect-pipeline.mjs", prospectPath, "replied"];
if (note) stageArgs.push("--note", note);

const stageResult = runJson(stageArgs);
const messageResult = runJson(["scripts/draft-prospect-message.mjs", prospectPath]);
const callPrepResult = runJson(["scripts/draft-sales-call-prep.mjs", prospectPath]);
const message = read("next-message.md");
const callPrep = read("sales-call-prep.md");

const replyPackage = `# Reply Package

## Prospect

- Folder: ${prospectPath}
- Stage: ${stageResult.stage}
- Note: ${note || "none"}

## Reply Subject

${section(message, "Subject")}

## Reply Body

${section(message, "Body")}

## Call Prep

${callPrep.replace(/^# .+\n+/, "").trim()}

## After Sending

If they book a call:

Replace the call time before running this command.

\`\`\`bash
npm run prospect:call-booked-prep -- ${prospectPath} --time "add call time" --meeting "${config.meetingPlaceholder}"
\`\`\`
`;

const replyPackagePath = join(prospectPath, "reply-package.md");
writeFileSync(replyPackagePath, replyPackage);

console.log(JSON.stringify({
  status: "created",
  prospectPath,
  stage: stageResult.stage,
  messagePath: messageResult.path,
  callPrepPath: callPrepResult.path,
  replyPackagePath
}, null, 2));
