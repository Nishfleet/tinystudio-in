#!/usr/bin/env node
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { localIsoDate } from "./date-utils.mjs";
import { listOutboundProspectFolders } from "./lib/outbound-prospects.mjs";
import { runRepoJson as runJson } from "./lib/runtime-roots.mjs";

const outputArg = process.argv.find((arg) => arg.startsWith("--output="));
const htmlArg = process.argv.find((arg) => arg.startsWith("--html="));
const limitArg = process.argv.find((arg) => arg.startsWith("--limit="));
const outputPath = outputArg ? outputArg.split("=").slice(1).join("=") : "runs/market-learning-review.md";
const htmlPath = htmlArg ? htmlArg.split("=").slice(1).join("=") : "runs/market-learning-review.html";
const limit = limitArg ? Number(limitArg.split("=").slice(1).join("=")) : 10;
const today = localIsoDate();

function listFolders(root) {
  return listOutboundProspectFolders(root).filter((path) => !/(^|\/)(?:kit|import)-smoke/.test(path));
}

function read(path) {
  return existsSync(path) ? readFileSync(path, "utf8") : "";
}

function json(path) {
  return existsSync(path) ? JSON.parse(readFileSync(path, "utf8")) : {};
}

function write(path, content) {
  const dir = path.split("/").slice(0, -1).join("/");
  if (dir) mkdirSync(dir, { recursive: true });
  writeFileSync(path, content);
}

function lineValue(content, pattern, fallback = "") {
  const match = String(content || "").match(pattern);
  return match && match[1].trim() ? match[1].trim() : fallback;
}

function compact(value, maxLength = 180) {
  const normalized = String(value || "").replace(/\s+/g, " ").replace(/\|/g, "/").trim();
  if (!normalized) return "";
  if (normalized.length <= maxLength) return normalized;
  return `${normalized.slice(0, maxLength - 1).trim()}...`;
}

function htmlEscape(value) {
  return String(value || "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;");
}

function percent(numerator, denominator) {
  if (!denominator) return "0%";
  return `${Math.round((numerator / denominator) * 100)}%`;
}

const metrics = runJson(["scripts/export-growth-metrics.mjs"]);
const proofCheck = existsSync("prospects/loom-links.txt")
  ? runJson(["scripts/check-market-proof-run.mjs"])
  : { status: "missing-proof-run", sentProofRows: 0, readySendPackages: 0, validApprovedRows: 0, recommendedChannel: "unknown", senderWarnings: [] };

const prospects = listFolders("prospects").map((path) => {
  const metadata = json(join(path, "metadata.json"));
  const pipeline = json(join(path, "pipeline.json"));
  const leadScore = read(join(path, "lead-score.md"));
  const outline = read(join(path, "loom-outline.md"));
  const notes = Array.isArray(pipeline.notes) ? pipeline.notes : [];
  const touches = Array.isArray(pipeline.touches) ? pipeline.touches : [];
  return {
    path,
    name: metadata.name || path.split("/").at(-1),
    stage: pipeline.stage || "new",
    sentAt: pipeline.sentAt || "",
    nextFollowUpAt: pipeline.nextFollowUpAt || "",
    sentChannel: pipeline.sentChannel || pipeline.lastChannel || touches.at(-1)?.channel || "",
    score: lineValue(leadScore, /^- Score:[ \t]*([^\n]*)$/m, "-"),
    priority: lineValue(leadScore, /^- Priority:[ \t]*([^\n]*)$/m, "-"),
    leak: lineValue(outline, /^3\. [^\n:]+:[ \t]*([^\n]*)$/m, ""),
    fix: lineValue(outline, /^6\. [^\n:]+:[ \t]*([^\n]*)$/m, ""),
    notes,
    touches
  };
});

const sentStages = new Set(["sent", "followup-1", "followup-2", "followup-3", "replied", "call-booked", "won", "lost"]);
const replyStages = new Set(["replied", "call-booked", "won"]);
const callStages = new Set(["call-booked", "won"]);
const sent = prospects.filter((prospect) => sentStages.has(prospect.stage));
const replies = prospects.filter((prospect) => replyStages.has(prospect.stage));
const calls = prospects.filter((prospect) => callStages.has(prospect.stage));
const won = prospects.filter((prospect) => prospect.stage === "won");
const lost = prospects.filter((prospect) => prospect.stage === "lost");
const dueFollowUps = prospects.filter((prospect) => prospect.nextFollowUpAt && prospect.nextFollowUpAt <= today && /^sent|followup-/.test(prospect.stage));
const waitingFollowUps = prospects.filter((prospect) => prospect.nextFollowUpAt && prospect.nextFollowUpAt > today && /^sent|followup-/.test(prospect.stage));

const channelCounts = sent.reduce((accumulator, prospect) => {
  const channel = prospect.sentChannel || "unknown";
  accumulator[channel] = (accumulator[channel] || 0) + 1;
  return accumulator;
}, {});

const allNotes = prospects
  .flatMap((prospect) => prospect.notes.map((note) => ({ ...note, prospect: prospect.name, path: prospect.path })))
  .sort((a, b) => String(b.date || "").localeCompare(String(a.date || "")));

function statusAndNext() {
  if (sent.length < 5) {
    return {
      status: "needs-first-proof-batch",
      nextCommand: "npm run growth:start -- --view=record",
      summary: "No learning loop can be trusted before the first 5 Looms are recorded, sent, and marked sent."
    };
  }
  if (dueFollowUps.length) {
    return {
      status: "follow-up-before-new-batch",
      nextCommand: "npm run prospect:followups",
      summary: "Follow-ups are due. Finish the loop before judging the batch."
    };
  }
  if (sent.length >= 5 && replies.length === 0) {
    return {
      status: "iterate-next-batch",
      nextCommand: "npm run prospect:batch-score -- --from-clipboard",
      summary: "The first batch has no replies yet. Do not scale volume; change one variable in lead fit, audit hook, or first message."
    };
  }
  if (replies.length > calls.length) {
    return {
      status: "book-calls",
      nextCommand: "npm run prospect:sales-cockpit",
      summary: "Replies exist. Convert them into calls before recording more cold Looms."
    };
  }
  if (calls.length > won.length) {
    return {
      status: "close-open-calls",
      nextCommand: "npm run prospect:sales-cockpit",
      summary: "Calls exist. Improve close proof, scope, price, or decision package before adding more top-of-funnel."
    };
  }
  return {
    status: "continue-learning-loop",
    nextCommand: "npm run growth:today",
    summary: "Keep the current bottleneck moving and capture the next reply, objection, or delivery learning."
  };
}

const review = statusAndNext();

const experimentRows = [
  ["Lead fit", sent.length >= 5 && replies.length === 0 ? "watch" : "hold", "Only change the prospect type after the first completed send/follow-up loop shows low reply quality."],
  ["Audit hook", sent.length >= 5 && replies.length === 0 ? "test next" : "hold", "Keep one visible leak, but make the first 10 seconds more specific to the buyer's category and pain."],
  ["First message", sent.length >= 5 && replies.length === 0 ? "test next" : "hold", "Keep the Loom useful, shorten the ask, and ask whether they want the exact page structure rather than a broad sprint."],
  ["Send channel", Object.keys(channelCounts).length > 1 ? "compare" : "watch", "Compare reply quality by contact form, DM, LinkedIn, X, phone, mixed, other, or email only after sender setup is clean."]
];

const prospectRows = sent.length
  ? sent.slice(0, limit).map((prospect) => `| ${prospect.name} | ${prospect.stage} | ${prospect.sentChannel || "-"} | ${prospect.nextFollowUpAt || "-"} | ${compact(prospect.leak, 120) || "-"} | ${compact(prospect.fix, 100) || "-"} |`).join("\n")
  : "| - | - | - | - | No sent prospects yet. | - |";

const noteRows = allNotes.length
  ? allNotes.slice(0, limit).map((note) => `| ${note.date || "-"} | ${note.prospect} | ${note.action || "-"} | ${compact(note.note, 160) || "-"} |`).join("\n")
  : "| - | - | - | No reply, loss, pause, or decision notes captured yet. |";

const channelRows = Object.entries(channelCounts).length
  ? Object.entries(channelCounts).sort(([a], [b]) => a.localeCompare(b)).map(([channel, count]) => `| ${channel} | ${count} | ${percent(count, sent.length)} |`).join("\n")
  : "| - | 0 | 0% |";

const experimentMarkdown = experimentRows
  .map(([area, status, next]) => `| ${area} | ${status} | ${next} |`)
  .join("\n");

const markdown = `# Market Learning Review

Generated: ${today}

## Verdict

${review.status}

${review.summary}

## Next Command

\`\`\`bash
${review.nextCommand}
\`\`\`

## Funnel Snapshot

| Metric | Count |
|---|---:|
| Scored | ${metrics.counts.scored} |
| Looms recorded | ${metrics.counts.loomsRecorded} |
| Sends | ${sent.length} |
| Replies | ${replies.length} |
| Calls | ${calls.length} |
| Won | ${won.length} |
| Lost | ${lost.length} |
| Due follow-ups | ${dueFollowUps.length} |
| Waiting follow-ups | ${waitingFollowUps.length} |
| Market proof status | ${proofCheck.status} |

## Channel Mix

| Channel | Sends | Share |
|---|---:|---:|
${channelRows}

## Sent Batch Review

| Prospect | Stage | Channel | Next Follow-Up | Leak | First Fix |
|---|---|---|---|---|---|
${prospectRows}

## Replies, Objections, And Decisions

| Date | Prospect | Action | Note |
|---|---|---|---|
${noteRows}

## Next Batch Experiment

Change one variable at a time. Do not scale volume until the first batch has Loom/send/follow-up proof.

| Area | Status | Next |
|---|---|---|
${experimentMarkdown}

## Rules

- No reply-rate conclusion before at least 5 real sent touches and due follow-ups are complete.
- No market-proof claim until \`npm run market:proof-check\` reaches \`sent-proof-captured\`.
- No sales-proof claim until a consented application passes human fit review and reaches paid Day 0.
- Use \`prospects/followup-cockpit.html\` for due follow-ups before judging a batch.
- Every lost or paused prospect needs a note so the next batch learns something.
`;

const html = `<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>TinyStudio Market Learning Review</title>
  <style>
    body { margin: 0; font-family: Inter, ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif; background: #faf9f5; color: #171717; line-height: 1.45; }
    header, main { max-width: 1120px; margin: 0 auto; padding: 24px; }
    header { border-bottom: 1px solid #d9ded8; }
    h1 { margin: 0 0 8px; font-size: 28px; }
    .status { display: inline-block; padding: 4px 10px; border: 1px solid #c8d7cf; border-radius: 999px; background: #eef7f1; color: #0d6b57; font-weight: 700; }
    section { margin: 24px 0; }
    table { width: 100%; border-collapse: collapse; background: #fff; border: 1px solid #d9ded8; }
    th, td { padding: 10px 12px; border-bottom: 1px solid #e7ebe5; text-align: left; vertical-align: top; }
    th { color: #5f6368; font-size: 12px; text-transform: uppercase; letter-spacing: .04em; }
    code, pre { background: #f1f3ef; padding: 2px 5px; border-radius: 4px; }
    .grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(220px, 1fr)); gap: 12px; }
    .metric { background: #fff; border: 1px solid #d9ded8; padding: 14px; }
    .metric strong { display: block; font-size: 24px; }
  </style>
</head>
<body>
  <header>
    <p class="status">${htmlEscape(review.status)}</p>
    <h1>Market Learning Review</h1>
    <p>Generated ${htmlEscape(today)}</p>
    <p>${htmlEscape(review.summary)}</p>
    <pre>${htmlEscape(review.nextCommand)}</pre>
  </header>
  <main>
    <section class="grid">
      <div class="metric"><span>Sends</span><strong>${sent.length}</strong></div>
      <div class="metric"><span>Replies</span><strong>${replies.length}</strong></div>
      <div class="metric"><span>Calls</span><strong>${calls.length}</strong></div>
      <div class="metric"><span>Due follow-ups</span><strong>${dueFollowUps.length}</strong></div>
    </section>
    <section>
      <h2>Next Batch Experiment</h2>
      <table>
        <thead><tr><th>Area</th><th>Status</th><th>Next</th></tr></thead>
        <tbody>${experimentRows.map(([area, status, next]) => `<tr><td>${htmlEscape(area)}</td><td>${htmlEscape(status)}</td><td>${htmlEscape(next)}</td></tr>`).join("")}</tbody>
      </table>
    </section>
    <section>
      <h2>Sent Batch</h2>
      <table>
        <thead><tr><th>Prospect</th><th>Stage</th><th>Channel</th><th>Next Follow-Up</th><th>Leak</th><th>First Fix</th></tr></thead>
        <tbody>${sent.length ? sent.slice(0, limit).map((prospect) => `<tr><td>${htmlEscape(prospect.name)}</td><td>${htmlEscape(prospect.stage)}</td><td>${htmlEscape(prospect.sentChannel || "-")}</td><td>${htmlEscape(prospect.nextFollowUpAt || "-")}</td><td>${htmlEscape(compact(prospect.leak, 120) || "-")}</td><td>${htmlEscape(compact(prospect.fix, 100) || "-")}</td></tr>`).join("") : `<tr><td colspan="6">No sent prospects yet.</td></tr>`}</tbody>
      </table>
    </section>
  </main>
</body>
</html>
`;

write(outputPath, markdown);
write(htmlPath, html);

console.log(JSON.stringify({
  status: review.status,
  path: outputPath,
  htmlPath,
  nextCommand: review.nextCommand,
  sends: sent.length,
  replies: replies.length,
  calls: calls.length,
  won: won.length,
  dueFollowUps: dueFollowUps.length,
  proofStatus: proofCheck.status
}, null, 2));
