#!/usr/bin/env node
import { existsSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { agencyConfig, appendEmailComplianceFooter, appendOptOut } from "./lib/agency-config.mjs";
import { canonicalProspectAsk } from "./lib/canonical-service-copy.mjs";
import { guardOutboundProspectPath } from "./lib/outbound-prospects.mjs";

const prospectPath = process.argv[2];

if (!prospectPath) {
  console.error("Usage: npm run prospect:message -- prospects/prospect-slug");
  process.exit(1);
}

if (!existsSync(prospectPath)) {
  console.error(`Prospect folder not found: ${prospectPath}`);
  process.exit(1);
}

guardOutboundProspectPath(prospectPath);

function read(relativePath) {
  const path = join(prospectPath, relativePath);
  return existsSync(path) ? readFileSync(path, "utf8") : "";
}

function json(relativePath) {
  const path = join(prospectPath, relativePath);
  return existsSync(path) ? JSON.parse(readFileSync(path, "utf8")) : {};
}

function lineValue(content, pattern, fallback = "") {
  const match = content.match(pattern);
  return match && match[1].trim() ? match[1].trim() : fallback;
}

function section(content, heading, fallback = "") {
  const escaped = heading.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const match = content.match(new RegExp(`## ${escaped}\\n+([\\s\\S]*?)(?:\\n## |$)`));
  return match ? match[1].trim() : fallback;
}

function firstPendingFollowUp(pipeline) {
  return (pipeline.followUps || []).find((followUp) => followUp.status !== "sent");
}

function splitSubjectAndBody(message, fallbackSubject) {
  const lines = message.split("\n");
  const subjectLine = lines.find((line) => line.startsWith("Subject:"));
  const subject = subjectLine ? subjectLine.replace(/^Subject:\s*/, "").trim() : fallbackSubject;
  const body = lines
    .filter((line) => !line.startsWith("Subject:"))
    .join("\n")
    .trim();
  return { subject, body };
}

function compact(value, maxLength) {
  const normalized = value.replace(/\s+/g, " ").trim();
  if (normalized.length <= maxLength) return normalized;
  return `${normalized.slice(0, maxLength - 1).trim()}...`;
}

function formVersion({ name, specificLeak, loomUrl }) {
  const config = agencyConfig();
  return `Hi ${name} team - I recorded a short audit. Main note: ${specificLeak}. Loom: ${loomUrl || "[add Loom link]"}. ${canonicalProspectAsk()} - ${config.founderName}`;
}

function dmVersion({ name, specificLeak, loomUrl }) {
  return `Quick audit for ${name}: ${specificLeak}. Loom: ${loomUrl || "[add Loom link]"}. Worth sending the exact page structure I would use? If not useful, ignore me.`;
}

function trimPunctuation(value) {
  return value.trim().replace(/[.!?]+$/g, "");
}

const metadata = json("metadata.json");
const config = agencyConfig();
const pipeline = json("pipeline.json");
const buyerRoom = read("buyer-room.md");
const loomOutline = read("loom-outline.md");

const name = metadata.name || prospectPath.split("/").at(-1);
const stage = pipeline.stage || "new";
const specificLeak = lineValue(loomOutline, /^3\. [^\n:]+:[ \t]*([^\n]*)$/m, "the page is making the buyer work too hard before the next step is clear");
const leakFragment = trimPunctuation(specificLeak);
const mainPage = lineValue(loomOutline, /^2\. [^\n:]+:[ \t]*([^\n]*)$/m, "the main money page");
const firstFix = lineValue(loomOutline, /^6\. [^\n:]+:[ \t]*([^\n]*)$/m, "the first page structure I would use");
const loomUrl = lineValue(buyerRoom, /^- Link:[ \t]*([^\n]*)$/m, "");
const pending = firstPendingFollowUp(pipeline);
const warnings = [];

let messageType = "first-send";
let subject = `Quick audit for ${name}`;
let body = `Subject: ${subject}

Hey ${name} team,

I recorded a short audit for ${name}. The main thing I noticed is ${leakFragment}.

Here is the Loom: ${loomUrl}

${canonicalProspectAsk()}

${config.founderName}`;

if (messageType === "first-send") {
  const split = splitSubjectAndBody(body, subject);
  subject = split.subject;
  body = appendEmailComplianceFooter(split.body);
  if (!loomUrl) warnings.push("Loom link is missing; run prospect:send-prep with the Loom URL before sending.");
}

if (stage === "sent" || stage.startsWith("followup-")) {
  messageType = pending?.step || "follow-up";
  if (pending?.step === "day-2") {
    subject = `Re: Quick audit for ${name}`;
    body = appendEmailComplianceFooter(`Worth sending the exact ${mainPage} structure I would use for this?`);
  } else if (pending?.step === "day-5") {
    subject = `Re: Quick audit for ${name}`;
    body = appendEmailComplianceFooter(`Quick bump. The main thing I would fix first is ${leakFragment}. If useful, I can send the exact one-page ${config.offerName} scope.`);
  } else if (pending?.step === "day-10") {
    subject = `Re: Quick audit for ${name}`;
    body = appendEmailComplianceFooter(`Closing the loop here. I still think ${mainPage} is leaving clarity on the table. Happy to revisit if this becomes a priority.`);
  }
}

if (stage === "replied") {
  messageType = "reply-to-book-call";
  subject = `Re: Quick audit for ${name}`;
  body = `Makes sense.

The fastest way to decide if this is worth doing is a short call where we confirm:

1. whether ${leakFragment} is actually a priority
2. who approves changes
3. what context you already have
4. whether the human-reviewed one-page sprint is worth doing now

If helpful, send me a couple times that work and I will keep it focused.`;
}

if (stage === "call-booked") {
  messageType = "pre-call-confirmation";
  subject = `${name} sprint call`;
  body = `Before the call, the main thing I want to confirm is whether this first fix is valuable enough to do now:

${firstFix}

I will keep the call focused on fit, scope, approval, and next step.`;
}

const contactFormBody = compact(appendOptOut(formVersion({ name, specificLeak: leakFragment, loomUrl })), 850);
const dmBody = compact(dmVersion({ name, specificLeak: leakFragment, loomUrl }), 280);
const stageAction = messageType === "day-2" ? "followup-1" : messageType === "day-5" ? "followup-2" : messageType === "day-10" ? "followup-3" : messageType === "first-send" ? "sent" : "";
const afterSending = messageType === "first-send" ? `After this message is actually sent, use the outbox checkbox and channel selector to mark the real sent route:

\`\`\`bash
npm run prospect:outbox
\`\`\`` : stageAction ? `After this follow-up is actually sent, use the follow-up cockpit checkbox and channel selector to mark the real follow-up route:

\`\`\`bash
npm run prospect:followups
\`\`\`` : messageType === "reply-to-book-call" ? `Do not mark call-booked just because this reply was sent. When they confirm a time, replace the call time before running this command:

\`\`\`bash
npm run prospect:call-booked-prep -- ${prospectPath} --time "add call time" --meeting "${config.meetingPlaceholder}"
\`\`\`` : `No stage change is needed after sending this confirmation. After the call, run close prep or mark lost:

\`\`\`bash
npm run prospect:close-prep -- ${prospectPath} --note "Call completed"
npm run prospect:stage -- ${prospectPath} lost --note "Not a fit after call"
\`\`\``;

const output = `# ${name} Next Message

## Type

${messageType}

## Warnings

${warnings.length ? warnings.map((warning) => `- ${warning}`).join("\n") : "- none"}

## Subject

${subject}

## Body

${body}

## Contact Form Version

${contactFormBody}

## DM Version

${dmBody}

## After Sending

${afterSending}
`;

const outputPath = join(prospectPath, "next-message.md");
writeFileSync(outputPath, output);

console.log(JSON.stringify({
  status: "created",
  path: outputPath,
  type: messageType,
  warnings
}, null, 2));
