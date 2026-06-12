#!/usr/bin/env node
import { existsSync, mkdirSync, readdirSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { execFileSync } from "node:child_process";
import { localIsoDate } from "./date-utils.mjs";
import { checkProspectReadiness, prospectWarningWeight } from "./lib/prospect-readiness.mjs";
import { isValidLoomUrl } from "./lib/loom-url.mjs";
import { sendChannelGuidance } from "./lib/send-channel-guidance.mjs";
import { routedContactPlan } from "./lib/contact-route.mjs";

const outputArg = process.argv.find((arg) => arg.startsWith("--output="));
const outputPath = outputArg ? outputArg.split("=")[1] : "growth-brain/ops/11-10-proof-run.md";
const loomLinksArg = process.argv.find((arg) => arg.startsWith("--loom-links="));
const limitArg = process.argv.find((arg) => arg.startsWith("--limit="));
const limit = limitArg ? Number(limitArg.split("=")[1]) : 5;
const today = localIsoDate();
const loomLinksPath = loomLinksArg
  ? loomLinksArg.split("=")[1]
  : outputPath.startsWith("prospects/kit-")
    ? "prospects/kit-proof-run-loom-links.txt"
    : "prospects/loom-links.txt";

function runJson(args) {
  const output = execFileSync("node", args, {
    encoding: "utf8",
    stdio: ["ignore", "pipe", "pipe"]
  });
  return JSON.parse(output);
}

function listFolders(root) {
  if (!existsSync(root)) return [];
  return readdirSync(root, { withFileTypes: true })
    .filter((entry) => entry.isDirectory())
    .filter((entry) => !/^(kit|import)-smoke/.test(entry.name))
    .map((entry) => join(root, entry.name))
    .sort();
}

function read(path) {
  return existsSync(path) ? readFileSync(path, "utf8") : "";
}

function json(path) {
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

function compact(value, maxLength = 140) {
  const normalized = String(value || "").replace(/\s+/g, " ").trim();
  if (!normalized) return "";
  return normalized.length <= maxLength ? normalized : `${normalized.slice(0, maxLength - 1).trim()}...`;
}

function cleanSheetNote(value, fallback) {
  const normalized = String(value || fallback || "")
    .replace(/\s+/g, " ")
    .replace(/\|/g, "/")
    .trim();
  return normalized.length >= 8 ? normalized : fallback;
}

function cleanAsk(value, closeText) {
  const normalized = String(value || "").replace(/\s+/g, " ").replace(/\|/g, "/").trim();
  const close = String(closeText || "").replace(/\s+/g, " ").replace(/\|/g, "/").replace(/^"|"$/g, "").trim();
  if (!normalized || /^7-?day site revenue leak sprint$/i.test(normalized)) {
    return close || "Ask if they want the 7-day sprint plan.";
  }
  return normalized;
}

function sharpnessValue(content, label) {
  const escaped = label.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  return String(content || "").match(new RegExp(`^- ${escaped}:[ \\t]*([^\\n]*)$`, "m"))?.[1]?.trim() || "";
}

function sharpnessSectionItems(content, heading, limit = 3) {
  const escaped = heading.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const match = String(content || "").match(new RegExp(`### ${escaped}\\n+([\\s\\S]*?)(?:\\n### |\\n## |$)`));
  if (!match) return [];
  return match[1]
    .split("\n")
    .map((line) => line.replace(/^-\s*/, "").trim())
    .filter(Boolean)
    .slice(0, limit);
}

function genericImpact(value) {
  return /asking buyers to understand multiple technical services|offer feels generic|hard to evaluate|without hunting through the page|safer, clearer choice|more qualified visitors should reach|a buyer can see the right next path sooner|page feels safer because the buyer/i.test(String(value || ""));
}

function proofRunImpact({ outlineImpact, sharpness, firstFix, route }) {
  const financial = sharpnessValue(sharpness, "Financial");
  const emotional = sharpnessValue(sharpness, "Emotional");
  const functional = sharpnessValue(sharpness, "Functional");
  const visiblePromise = sharpnessValue(sharpness, "Visible promise");
  const ctaCues = sharpnessSectionItems(sharpness, "CTA / Route Cues", 3);
  const proofCues = sharpnessSectionItems(sharpness, "Proof Cues", 3);
  if (outlineImpact && !genericImpact(outlineImpact)) return outlineImpact;
  if (financial && !genericImpact(financial)) return financial;
  if (functional && !genericImpact(functional)) return functional;
  const buyerLine = visiblePromise
    ? `A buyer landing on "${visiblePromise}" can recognize the right path faster.`
    : "A buyer can recognize the right path faster.";
  const cleanFix = String(firstFix || "").replace(/[.]+$/g, "").trim();
  const fixLine = cleanFix ? ` The first fix makes that path concrete: ${cleanFix}.` : "";
  const proofLine = proofCues.length
    ? ` It moves proof cues like ${proofCues.join(", ")} closer to the decision.`
    : "";
  const routeLine = ctaCues.length
    ? ` The next click becomes easier to choose: ${ctaCues.join(", ")}.`
    : route
      ? ` The next route is already clear: ${route}.`
      : "";
  const feelingLine = emotional && !genericImpact(emotional)
    ? ` ${emotional}`
    : "";
  return `${buyerLine}${fixLine}${proofLine}${routeLine}${feelingLine}`.trim();
}

function hasLeadScore(path) {
  const content = read(join(path, "lead-score.md"));
  return !/Score:\s*$/m.test(content) && !/Priority:\s*record \/ research-more \/ skip/m.test(content);
}

function hasLoom(path) {
  const buyerRoom = read(join(path, "buyer-room.md"));
  const loomMatch = buyerRoom.match(/^- Link:[ \t]*([^\n]*)$/m);
  return Boolean(loomMatch && isValidLoomUrl(loomMatch[1].trim()));
}

const parityOutputPath = outputPath.startsWith("prospects/kit-")
  ? "prospects/kit-market-proof-run-parity.md"
  : "prospects/market-proof-run-parity.md";
const parityArgs = ["scripts/check-market-parity-readiness.mjs", `--output=${parityOutputPath}`, "--skip-kit"];
const parity = runJson(parityArgs);
rmSync(parityOutputPath, { force: true });

const metrics = runJson(["scripts/export-growth-metrics.mjs"]);
const channelGuidance = sendChannelGuidance();

const prospects = listFolders("prospects").map((path) => {
  const metadata = json(join(path, "metadata.json"));
  const pipeline = json(join(path, "pipeline.json"));
  const readiness = checkProspectReadiness(path);
  const leadScore = read(join(path, "lead-score.md"));
  const loomOutline = read(join(path, "loom-outline.md"));
  const sharpness = read(join(path, "recording-sharpness-brief.md"));
  const closeText = section(loomOutline, "Close", "");
  const route = routedContactPlan(read(join(path, "contact-plan.md")), { emailReady: channelGuidance.emailReady });
  const firstFix = lineValue(loomOutline, /^6\. [^\n:]+:[ \t]*([^\n]*)$/m, "");
  return {
    path,
    name: metadata.name || path.split("/").at(-1),
    stage: pipeline.stage || "new",
    score: lineValue(leadScore, /^- Score:[ \t]*([^\n]*)$/m, "-"),
    priority: lineValue(leadScore, /^- Priority:[ \t]*([^\n]*)$/m, "-"),
    leak: lineValue(loomOutline, /^3\. [^\n:]+:[ \t]*([^\n]*)$/m, ""),
    impact: proofRunImpact({
      outlineImpact: lineValue(loomOutline, /^4\. [^\n:]+:[ \t]*([^\n]*)$/m, ""),
      sharpness,
      firstFix,
      route
    }),
    fix: firstFix,
    ask: cleanAsk(
      lineValue(loomOutline, /^7\. [^\n:]+:[ \t]*([^\n]*)$/m, "")
        || lineValue(sharpness, /^7\. CTA:[ \t]*([^\n]*)$/m, ""),
      closeText
    ),
    route,
    scored: hasLeadScore(path),
    loomRecorded: hasLoom(path),
    warnings: readiness.warnings || [],
    weight: prospectWarningWeight(readiness.warnings || [])
  };
});

const recordingBatch = prospects
  .filter((prospect) => prospect.scored)
  .filter((prospect) => !prospect.loomRecorded)
  .filter((prospect) => !["won", "lost", "paused"].includes(prospect.stage))
  .sort((a, b) => a.weight - b.weight || a.name.localeCompare(b.name))
  .slice(0, limit);

const requirementByArea = {
  "Sender trust": "Run `npm run send:configure -- --physical-address=\"...\" --dkim-selector=... --dry-run` with the real values, then apply it without `--dry-run`. Until then, use contact forms or DMs.",
  "Market proof": "Record and send 5 approved Looms with leak, impact, fix, and ask notes.",
  "Sales proof": "Turn at least 1 reply into a booked call, close package, and won sprint with a won-stage note.",
  "Delivery proof": "Convert a won prospect, complete the sprint readiness gates, and add an approved claim row in the same client folder.",
  "Retention proof": "Send a filled weekly report that shows shipped work, a learning, a next test, and customer confirmation."
};

const blockerRows = parity.blockers.length
  ? parity.blockers.map((blocker) => `| ${blocker.area} | ${blocker.evidence} | ${requirementByArea[blocker.area] || "Capture stronger proof before claiming this area."} |`).join("\n")
  : "| - | - | No blockers. |";

const batchRows = recordingBatch.length
  ? recordingBatch.map((prospect, index) => `| ${index + 1} | ${prospect.name} | ${prospect.path} | ${prospect.score} | ${compact(prospect.leak || "Use recording script")} | ${compact(prospect.fix || "Use recording script")} | ${compact(prospect.route)} |`).join("\n")
  : "| - | - | - | - | No scored prospects waiting for Looms. | - | - |";

const loomSheetRows = recordingBatch.length
  ? recordingBatch.map((prospect) => `${prospect.path}|LOOM_URL|approved|${cleanSheetNote(prospect.leak, "specific visible leak")}|${cleanSheetNote(prospect.impact, "buyer impact from the recording")}|${cleanSheetNote(prospect.fix, "first fix shown in the recording")}|${cleanSheetNote(prospect.ask, "ask if they want the sprint plan")}`).join("\n")
  : "prospects/prospect-slug|https://www.loom.com/share/...|approved|specific leak|buyer impact|first fix|clean ask";

const markdown = `# 11/10 Proof Run

Generated: ${today}

## Current Verdict

${parity.status === "11-10-ready" ? "11/10-ready. Current proof satisfies the market parity gate." : "Not 11/10 yet. The internal system is useful, but the proof run below must be completed before making stronger claims."}

Parity score: ${parity.score}/${parity.total}.

## Current Proof Blockers

| Area | Current Evidence | Required Proof |
|---|---|---|
${blockerRows}

## Today’s Proof Run

1. Open the recording view:

\`\`\`bash
npm run growth:start -- --view=record
\`\`\`

2. Record this batch. Each Loom must make one leak obvious, quantify the buyer impact where possible, show the first fix, and end with one clean ask.

| # | Prospect | Folder | Score | Leak | First Fix | Send Route |
|---:|---|---|---|---|---|---|
${batchRows}

3. Paste the recorded Loom URLs into the post-recording prep command:

This proof run also wrote the same prefilled sheet to \`${loomLinksPath}\`. After recording, copy either five Loom URLs in the same order or rows like \`prospects/prospect-slug|https://www.loom.com/share/...\`. The post-recording prep preserves the existing approved leak, impact, fix, and ask notes, prepares send packages, refreshes the outbox, and refreshes the proof cockpit without marking anything sent.

\`\`\`text
${loomSheetRows}
\`\`\`

\`\`\`bash
npm run market:after-recording -- --from-clipboard
\`\`\`

4. Check the proof run status:

\`\`\`bash
npm run market:proof-check
\`\`\`

5. Send from the outbox, using the route shown for each prospect. Recommended channel right now: ${channelGuidance.recommendedChannel}.

${channelGuidance.warnings.length ? `Sender warnings: ${channelGuidance.warnings.join("; ")}.` : "Sender setup is clean."}

6. After sending, use the outbox copied sent sheet:

\`\`\`bash
npm run prospect:batch-sent -- --from-clipboard
\`\`\`

7. Run the proof check again. It should say \`sent-proof-captured\` before the market proof blocker can clear.

## Proof Capture Rules

- Market proof is real only after 5 Looms are recorded, send packages are ready, messages are sent, and stages are marked sent.
- Email sent proof does not count while \`npm run send:setup\` still warns. Use contact forms, DMs, LinkedIn, X, phone, mixed, or other until sender trust is clean.
- Sales proof is real only after a prospect reply, call-booked package, close package, and won-stage note exist.
- Delivery proof is real only after the same client folder passes readiness with approved claims, filled scorecards, completed acceptance checks, and filled delivery artifacts.
- Retention proof is real only after a filled weekly report shows shipped work, a learning, a next test, and customer confirmation that the delta was seen, understood, approved for next action, and worth continuing.
- Do not claim better, comparable, 11/10, retained, or proven until \`npm run market:parity\` passes.

## Current Counts

| Metric | Count |
|---|---:|
| Scored prospects | ${metrics.counts.scored} |
| Looms recorded | ${metrics.counts.loomsRecorded} |
| Sends | ${metrics.counts.sends} |
| Replies | ${metrics.counts.replies} |
| Calls | ${metrics.counts.calls} |
| Closed | ${metrics.counts.closed} |
| Clients ready | ${metrics.counts.clientsReady} |
`;

const outputDir = outputPath.split("/").slice(0, -1).join("/");
if (outputDir) mkdirSync(outputDir, { recursive: true });
writeFileSync(outputPath, markdown);

const loomLinksDir = loomLinksPath.split("/").slice(0, -1).join("/");
if (loomLinksDir) mkdirSync(loomLinksDir, { recursive: true });
writeFileSync(loomLinksPath, `# Replace LOOM_URL with each real Loom share link, or run: npm run market:after-recording -- --from-clipboard\n# Fast format after recording: paste either URL-only lines in this exact order, or prospects/prospect-slug|https://www.loom.com/share/...\n# Full format still works: prospects/prospect-slug|https://www.loom.com/share/...|approved|leak note|impact note|fix note|ask note\n\n${loomSheetRows}\n`);

console.log(JSON.stringify({
  status: "created",
  path: outputPath,
  loomLinksPath,
  date: today,
  parityStatus: parity.status,
  parityScore: parity.score,
  parityTotal: parity.total,
  blockers: parity.blockers.map((blocker) => blocker.area),
  selectedProspects: recordingBatch.map((prospect) => prospect.path),
  recommendedChannel: channelGuidance.recommendedChannel
}, null, 2));
