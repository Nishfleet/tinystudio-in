#!/usr/bin/env node
import { existsSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { execFileSync } from "node:child_process";
import { checkProspectReadiness } from "./lib/prospect-readiness.mjs";
import { isValidLoomUrl, loomUrlError } from "./lib/loom-url.mjs";
import { formatChannelGuidanceMarkdown } from "./lib/send-channel-guidance.mjs";
import { formatReplyWorthinessMarkdown, replyWorthiness } from "./lib/reply-worthy-proof.mjs";
import { guardOutboundProspectPath } from "./lib/outbound-prospects.mjs";
import { RETIRED_OFFER_PATTERN } from "./lib/retired-offer-pattern.mjs";

const args = process.argv.slice(2);
const prospectPath = args[0];
const loomUrl = args[1];
const strict = args.includes("--strict");
const approved = args.includes("--approved") || args.includes("--quality-approved");
const force = args.includes("--force");
const outboxArg = args.find((arg) => arg.startsWith("--outbox="));
const outboxPath = outboxArg ? outboxArg.split("=")[1] : "prospects/outbox.html";

if (!prospectPath || !loomUrl) {
  console.error("Usage: npm run prospect:send-prep -- prospects/prospect-slug https://www.loom.com/share/... --approved [--strict]");
  process.exit(1);
}

if (!isValidLoomUrl(loomUrl)) {
  console.error(loomUrlError());
  process.exit(1);
}

if (!existsSync(prospectPath)) {
  console.error(`Prospect folder not found: ${prospectPath}`);
  process.exit(1);
}

guardOutboundProspectPath(prospectPath);

if (!approved && !force) {
  console.error("Send prep requires --approved after the Loom quality checks. Use --force only for explicit recovery.");
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

const loomResult = runJson(["scripts/add-prospect-loom-link.mjs", prospectPath, loomUrl]);
const messageResult = runJson(["scripts/draft-prospect-message.mjs", prospectPath]);
const replyProof = replyWorthiness(prospectPath);
if (replyProof.score < 8 && !force) {
  console.error(JSON.stringify({
    status: "blocked",
    reason: "Reply-worthy proof score is below 8/10. Use the teleprompter or batch Loom sheet to capture fault, impact, first fix, and clean ask notes before send prep.",
    prospectPath,
    loomUrl,
    replyWorthiness: replyProof
  }, null, 2));
  process.exit(1);
}
const readiness = checkProspectReadiness(prospectPath);
const message = read("next-message.md");
const contactPlan = read("contact-plan.md");
const recordingNotes = read("recording-notes.md");
const contactRoute = contactPlan ? section(contactPlan, "Best Route", "See contact-plan.md") : "";

// The send package embeds these files verbatim. Refuse to generate it if any
// still sells a retired broad-agency offer, so a stale runtime sheet can never
// reach a prospect through the active send package.
const sendInputs = [
  ["next-message.md", message],
  ["contact-plan.md", contactPlan],
  ["recording-notes.md", recordingNotes]
];
const retiredInputs = sendInputs.filter(([, content]) => RETIRED_OFFER_PATTERN.test(content));
if (retiredInputs.length && !force) {
  console.error(JSON.stringify({
    status: "blocked",
    reason: "Send package inputs still sell a retired offer",
    prospectPath,
    loomUrl,
    files: retiredInputs.map(([file]) => file)
  }, null, 2));
  process.exit(1);
}

const sendPackage = `# Send Package

## Prospect

- Folder: ${prospectPath}
- Loom: ${loomUrl}
- Readiness: ${readiness.status}
- Loom quality: ${approved ? "approved" : "forced without approval"}

## Warnings

${readiness.warnings.length ? readiness.warnings.map((warning) => `- ${warning}`).join("\n") : "- none"}

## Contact Route

${contactRoute || `Run \`npm run prospect:contact-plan -- ${prospectPath}\` if the send route is unclear.`}

## Channel Guidance

${formatChannelGuidanceMarkdown(contactRoute)}

## Recording Notes

${recordingNotes ? recordingNotes.replace(/^# .+\n+/, "").trim() : "- none captured; use the Loom and page notes only."}

${formatReplyWorthinessMarkdown(replyProof)}

## Subject

${section(message, "Subject")}

## Email Body

${section(message, "Body")}

## Contact Form Version

${section(message, "Contact Form Version")}

## DM Version

${section(message, "DM Version")}

## After Sending

The outbox has been refreshed at \`${outboxPath}\`. Send from there, check only the message actually sent, choose the real channel used, then copy the sent row or batch sent sheet.

\`\`\`bash
npm run prospect:outbox
npm run growth:today
\`\`\`
`;

const sendPackagePath = join(prospectPath, "send-package.md");
writeFileSync(sendPackagePath, sendPackage);
const outboxResult = runJson(["scripts/export-prospect-outbox.mjs", `--output=${outboxPath}`]);

const result = {
  status: readiness.status === "ready" ? "ready" : "draft",
  readinessStatus: readiness.status,
  prospectPath,
  loomUrl,
  updated: loomResult.updated,
  files: {
    message: messageResult.path,
    recordingNotes: recordingNotes ? join(prospectPath, "recording-notes.md") : null,
    sendPackage: sendPackagePath,
    outbox: outboxResult.path
  },
  replyWorthiness: {
    status: replyProof.status,
    score: replyProof.score,
    total: replyProof.total,
    warnings: replyProof.warnings
  },
  warnings: readiness.warnings
};

console.log(JSON.stringify(result, null, 2));

if (strict && result.status !== "ready") process.exit(1);
