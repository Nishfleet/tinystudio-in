#!/usr/bin/env node
import { existsSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { execFileSync } from "node:child_process";
import { agencyConfig } from "./lib/agency-config.mjs";
import { guardOutboundProspectPath } from "./lib/outbound-prospects.mjs";

const args = process.argv.slice(2);
const prospectPath = args[0];

function option(name) {
  const index = args.indexOf(`--${name}`);
  return index >= 0 ? args[index + 1] || "" : "";
}

const note = option("note");
const config = agencyConfig();
const force = args.includes("--force");
const rawTime = option("time");
const rawMeeting = option("meeting");
const time = /^add call time$/i.test(rawTime.trim()) ? "" : rawTime;
const meeting = rawMeeting.trim() === config.meetingPlaceholder || /^add meeting link$/i.test(rawMeeting.trim()) ? "" : rawMeeting;

if (!prospectPath) {
  console.error("Usage: npm run prospect:call-booked-prep -- prospects/prospect-slug --time \"Tue 2pm\" [--meeting \"https://...\"] [--note \"...\"] [--force]");
  process.exit(1);
}

if (!existsSync(prospectPath)) {
  console.error(`Prospect folder not found: ${prospectPath}`);
  process.exit(1);
}

guardOutboundProspectPath(prospectPath);

if (!time && !force) {
  console.error("Call-booked prep requires a real call time. Use --force only for explicit recovery.");
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

function json(relativePath) {
  const path = join(prospectPath, relativePath);
  return existsSync(path) ? JSON.parse(readFileSync(path, "utf8")) : {};
}

function section(content, heading, fallback = "") {
  const escaped = heading.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const match = content.match(new RegExp(`## ${escaped}\\n+([\\s\\S]*?)(?:\\n## |$)`));
  return match ? match[1].trim() : fallback;
}

const metadata = json("metadata.json");
const name = metadata.name || prospectPath.split("/").at(-1);
const stageNote = [
  time ? `Call time: ${time}` : "",
  meeting ? `Meeting: ${meeting}` : "",
  note
].filter(Boolean).join(" | ");

const stageArgs = ["scripts/update-prospect-pipeline.mjs", prospectPath, "call-booked"];
if (stageNote) stageArgs.push("--note", stageNote);

const stageResult = runJson(stageArgs);
const messageResult = runJson(["scripts/draft-prospect-message.mjs", prospectPath]);
const callPrepResult = runJson(["scripts/draft-sales-call-prep.mjs", prospectPath]);

const message = read("next-message.md");
const callPrep = read("sales-call-prep.md");
const subject = section(message, "Subject", `${name} sprint call`);
const body = section(message, "Body", "I will keep the call focused on fit, scope, approval, and next step.");

const packageContent = `# ${name} Call-Booked Package

## Prospect

- Folder: ${prospectPath}
- Stage: ${stageResult.stage}
- Time: ${time || "not set yet"}
- Meeting: ${meeting || "not set yet"}
- Note: ${note || "none"}

## Confirmation Subject

${subject}

## Confirmation Body

${body}${time ? `\n\nTime I have down: ${time}` : ""}${meeting ? `\n\nMeeting link: ${meeting}` : ""}

## Call Agenda

1. Confirm the fault from the Loom is a real priority.
2. Confirm the approval owner and what context they can share.
3. Confirm the sprint scope, price, and timeline.
4. Ask whether ${config.offerName} is worth starting now.

## Close Guardrail

Do not diagnose the whole website on the call. The call is to confirm fit and next step.

## Call Prep

${callPrep.replace(/^# .+\n+/, "").trim()}

## After The Call

If they are ready to buy:

\`\`\`bash
npm run prospect:close-prep -- ${prospectPath} --note "Ready to approve"
\`\`\`

If they need a decision follow-up:

\`\`\`bash
npm run prospect:close-prep -- ${prospectPath} --note "Needs decision follow-up"
\`\`\`

If they are not a fit:

\`\`\`bash
npm run prospect:stage -- ${prospectPath} lost --note "Not a fit after call"
\`\`\`
`;

const packagePath = join(prospectPath, "call-booked-package.md");
writeFileSync(packagePath, packageContent);

console.log(JSON.stringify({
  status: "created",
  prospectPath,
  stage: stageResult.stage,
  messagePath: messageResult.path,
  callPrepPath: callPrepResult.path,
  callBookedPackagePath: packagePath
}, null, 2));
