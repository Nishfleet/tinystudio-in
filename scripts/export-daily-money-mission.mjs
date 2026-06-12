#!/usr/bin/env node
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { execFileSync } from "node:child_process";
import { localIsoDate } from "./date-utils.mjs";
import { isValidLoomUrl } from "./lib/loom-url.mjs";
import { sendChannelGuidance } from "./lib/send-channel-guidance.mjs";
import { routedContactPlan } from "./lib/contact-route.mjs";

const limitArg = process.argv.find((arg) => arg.startsWith("--limit="));
const limit = limitArg ? Number(limitArg.split("=")[1]) : 5;
const outputArg = process.argv.find((arg) => arg.startsWith("--output="));
const outputPath = outputArg ? outputArg.split("=")[1] : "growth-brain/ops/daily-money-mission.md";
const htmlArg = process.argv.find((arg) => arg.startsWith("--html="));
const htmlPath = htmlArg ? htmlArg.split("=")[1] : "growth-brain/ops/daily-money-mission.html";
const today = localIsoDate();

function runJson(args) {
  const output = execFileSync("node", args, {
    encoding: "utf8",
    stdio: ["ignore", "pipe", "pipe"]
  });
  return JSON.parse(output);
}

function read(path) {
  return existsSync(path) ? readFileSync(path, "utf8") : "";
}

function section(markdown, heading, fallback = "") {
  const lines = String(markdown || "").split("\n");
  const start = lines.findIndex((line) => line.trimEnd() === `## ${heading}`);
  if (start < 0) return fallback;
  const end = lines.findIndex((line, index) => index > start && line.startsWith("## "));
  const body = lines.slice(start + 1, end < 0 ? undefined : end).join("\n").trim();
  return body || fallback;
}

function escapeHtml(value) {
  return String(value)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function displayText(value) {
  return String(value).replace(/\*\*/g, "");
}

function contactRoute(prospectPath, fallback = "") {
  const route = routedContactPlan(read(join(prospectPath, "contact-plan.md")), { emailReady: channelGuidance.emailReady })
    || fallback
    || "Run contact-plan before sending.";
  return route.replace(/\n+/g, " ");
}

function lineValue(content, pattern, fallback = "") {
  const match = content.match(pattern);
  return match && match[1].trim() ? match[1].trim() : fallback;
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
    return close || "If useful, I can run a 7-day sprint where I map this leak, rewrite the key sections, and give you a 30-day action plan.";
  }
  return normalized;
}

function sharpnessValue(content, label) {
  const prefix = `- ${label}:`;
  const line = String(content || "").split("\n").find((item) => item.startsWith(prefix));
  return line ? line.slice(prefix.length).trim() : "";
}

function sharpnessSectionItems(content, heading, limit = 3) {
  const lines = String(content || "").split("\n");
  const start = lines.findIndex((line) => line.trimEnd() === `### ${heading}`);
  if (start < 0) return [];
  const end = lines.findIndex((line, index) => index > start && (line.startsWith("### ") || line.startsWith("## ")));
  return lines.slice(start + 1, end < 0 ? undefined : end).join("\n")
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

function prospectProofNotes(prospectPath) {
  const loomOutline = read(join(prospectPath, "loom-outline.md"));
  const sharpness = read(join(prospectPath, "recording-sharpness-brief.md"));
  const closeText = section(loomOutline, "Close", "");
  const route = contactRoute(prospectPath);
  const firstFix = lineValue(loomOutline, /^6\. [^\n:]+:[ \t]*([^\n]*)$/m, "");
  return {
    leak: cleanSheetNote(
      lineValue(loomOutline, /^3\. [^\n:]+:[ \t]*([^\n]*)$/m, ""),
      "specific visible leak"
    ),
    impact: cleanSheetNote(
      proofRunImpact({
        outlineImpact: lineValue(loomOutline, /^4\. [^\n:]+:[ \t]*([^\n]*)$/m, ""),
        sharpness,
        firstFix,
        route
      }),
      "buyer impact from the recording"
    ),
    fix: cleanSheetNote(
      firstFix,
      "first fix shown in the recording"
    ),
    ask: cleanAsk(
      lineValue(loomOutline, /^7\. [^\n:]+:[ \t]*([^\n]*)$/m, "")
        || lineValue(sharpness, /^7\. CTA:[ \t]*([^\n]*)$/m, ""),
      closeText
    )
  };
}

function batchLine(prospect, loomUrl = "LOOM_URL") {
  return [
    prospect.path,
    loomUrl,
    "approved",
    prospect.leak,
    prospect.impact,
    prospect.fix,
    prospect.ask
  ].map((part) => String(part || "").replace(/\s+/g, " ").replace(/\|/g, "/").trim()).join("|");
}

function missionFromMetrics(counts) {
  if (counts.replies > counts.calls) return "Book calls from replies before doing more cold outbound.";
  if (counts.calls > counts.closed) return "Close open sales calls before starting more new conversations.";
  if (counts.dueFollowUp > 0) return "Send due follow-ups before recording new Looms.";
  if (counts.scored > counts.loomsRecorded) return "Record the scored Looms. This is the current money bottleneck.";
  if (counts.loomsRecorded > counts.sends) return "Send the recorded Looms and mark them sent.";
  if (counts.sends > counts.replies) return "Improve lead fit, hook, or first message from reply data.";
  return "Score the next prospects and keep the outbound batch moving.";
}

function write(path, content) {
  const dir = path.split("/").slice(0, -1).join("/");
  if (dir) mkdirSync(dir, { recursive: true });
  writeFileSync(path, content);
}

function ensureLoomLinksTemplate(prospects) {
  const path = "prospects/loom-links.txt";
  const existing = read(path);
  const hasFilledLinks = existing
    .split("\n")
    .some((line) => {
      const trimmed = line.trim();
      if (!trimmed.startsWith("prospects/")) return false;
      return isValidLoomUrl(trimmed.split("|")[1]);
    });

  if (hasFilledLinks) return { path, status: "kept-filled-links" };

  const lines = [
    "# Replace LOOM_URL with each real Loom share link, or run: npm run market:after-recording -- --from-clipboard",
    "# Fast format after recording: paste URL-only lines in this exact order, or prospects/prospect-slug|https://www.loom.com/share/...",
    "# Format: prospects/prospect-slug|https://www.loom.com/share/...|approved|leak note|impact note|fix note|ask note",
    ""
  ];

  for (const prospect of prospects) {
    lines.push(batchLine(prospect));
  }

  write(path, `${lines.join("\n")}\n`);
  return { path, status: existing ? "refreshed-prefilled-template" : "created-prefilled-template" };
}

const channelGuidance = sendChannelGuidance();

runJson(["scripts/export-recording-cockpit.mjs", `--limit=${limit}`]);
runJson(["scripts/export-lead-scoring-cockpit.mjs", "--limit=10"]);
runJson(["scripts/export-recording-teleprompter.mjs", `--limit=${limit}`]);
const rehearsal = runJson(["scripts/export-recording-rehearsal-check.mjs", `--limit=${limit}`]);
runJson(["scripts/export-prospect-outbox.mjs"]);
runJson(["scripts/export-followup-cockpit.mjs"]);
runJson(["scripts/export-sales-cockpit.mjs"]);
const metrics = runJson(["scripts/export-growth-metrics.mjs"]);
runJson(["scripts/export-proof-library.mjs"]);
runJson(["scripts/export-managed-it-one-pager.mjs"]);
const todayResult = runJson(["scripts/show-growth-command-center.mjs", `--limit=${Math.max(limit + 2, 7)}`]);

const mission = missionFromMetrics(metrics.counts);
const activeProspects = (todayResult.prospects || [])
  .filter((prospect) => !["won", "lost", "paused"].includes(prospect.pipelineStage))
  .slice(0, limit)
  .map((prospect) => ({
    ...prospect,
    route: contactRoute(prospect.path, prospect.contact || ""),
    ...prospectProofNotes(prospect.path)
  }));
const loomLinks = ensureLoomLinksTemplate(activeProspects);

const queueRows = activeProspects.map((prospect, index) => {
  const command = `npm run prospect:send-prep -- ${prospect.path} LOOM_URL --approved`;
  return [
    `### ${index + 1}. ${prospect.name}`,
    "",
    `- Stage: ${prospect.pipelineStage}`,
    `- Website: ${prospect.website}`,
    `- Best contact route: ${prospect.route}`,
    `- Next action: ${prospect.nextAction}`,
    `- Sharpness brief: ${prospect.path}/recording-sharpness-brief.md`,
    `- Recording script: ${prospect.path}/recording-script.md`,
    `- Contact plan: ${prospect.path}/contact-plan.md`,
    `- Buyer room: ${prospect.path}/buyer-room.md`,
    `- After recording: \`${command}\``,
    `- Batch line: \`${batchLine(prospect)}\``
  ].join("\n");
}).join("\n\n");

const focusItems = todayResult.todayFocus.map((item) => `- ${displayText(item)}`).join("\n");

const markdown = `# Daily Money Mission

Generated: ${today}

## Today's Constraint

${mission}

Recommended send channel now: ${channelGuidance.recommendedChannel}${channelGuidance.warnings.length ? ` (${channelGuidance.warnings.join("; ")})` : ""}.

## Scoreboard

| Metric | Count |
|---|---:|
| Prospects total | ${metrics.counts.prospectsTotal} |
| Scored prospects | ${metrics.counts.scored} |
| Looms recorded | ${metrics.counts.loomsRecorded} |
| Ready to send | ${metrics.counts.readyToSend} |
| Sends | ${metrics.counts.sends} |
| Replies | ${metrics.counts.replies} |
| Calls | ${metrics.counts.calls} |
| Closed | ${metrics.counts.closed} |
| Due follow-up | ${metrics.counts.dueFollowUp} |

## Mission Order

1. Run \`npm run prospect:prep-recording -- --limit=${limit}\` before the recording block if the pages or scripts may be stale.
2. Open \`prospects/recording-rehearsal-check.html\` and make sure every Loom is ready before recording.
3. Open \`prospects/recording-teleprompter.html\`.
4. Record the prospects below before researching more.
5. Paste Loom links into the mission page, or paste only the recorded URLs into \`npm run market:after-recording -- --from-clipboard\` so existing proof notes stay intact and send packages/outbox/proof cockpit refresh together.
6. If you intentionally used the lower-level recording updater, then run \`npm run prospect:batch-send-prep\` before opening the outbox.
7. Open \`prospects/outbox.html\`, send the batch, copy the batch sent sheet, then run \`npm run prospect:batch-sent -- --from-clipboard\`.
8. Check \`prospects/followup-cockpit.html\` and \`prospects/sales-cockpit.html\` daily until replies, calls, or closes happen.

## Current Focus

${focusItems || "- No active focus items."}

## Recording Rehearsal

- Status: ${rehearsal.status}
- Minimum score: ${rehearsal.minimumScore}/10
- Check: \`${rehearsal.htmlPath}\`

## Recording Queue

${queueRows || "No active prospects found."}

## Workflow Rules

- Do not add more prospects until the current scored batch is recorded and sent.
- Do not make revenue, ranking, ROAS, or traffic promises.
- Every prospect must have a specific visible leak, a Loom, a contact route, a sent stage, and a scheduled follow-up.
- Every reply becomes a call-prep package.
- Every call becomes a close package.
- Every closed deal becomes a client sprint folder and delivery cockpit.
`;

const cards = activeProspects.map((prospect, index) => `
      <section class="prospect">
        <div>
          <p class="eyebrow">#${index + 1} ${escapeHtml(prospect.pipelineStage)}</p>
          <h2>${escapeHtml(prospect.name)}</h2>
          <p>${escapeHtml(prospect.nextAction)}</p>
          <p class="muted">${escapeHtml(prospect.route)}</p>
          <p class="${channelGuidance.emailReady ? "channelReady" : "channelWarning"}">Channel rule: ${escapeHtml(channelGuidance.rule)}</p>
          <label for="loom-${index}">Loom URL</label>
          <input id="loom-${index}" class="loomInput" data-path="${escapeHtml(prospect.path)}" placeholder="https://www.loom.com/share/..." />
          <p class="inputStatus" id="status-loom-${index}">Needs a Loom share or embed URL.</p>
          <div class="qualityBar" aria-label="Loom quality gate">
            <label class="qualityCheck">
              <input type="checkbox" data-quality="leak" data-path="${escapeHtml(prospect.path)}" />
              <span>Visible leak</span>
            </label>
            <label class="qualityCheck">
              <input type="checkbox" data-quality="impact" data-path="${escapeHtml(prospect.path)}" />
              <span>Buyer impact</span>
            </label>
            <label class="qualityCheck">
              <input type="checkbox" data-quality="fix" data-path="${escapeHtml(prospect.path)}" />
              <span>First fix</span>
            </label>
            <label class="qualityCheck">
              <input type="checkbox" data-quality="ask" data-path="${escapeHtml(prospect.path)}" />
              <span>Clean ask</span>
            </label>
          </div>
          <div class="qualityNotes">
            <label>
              <span>Leak note</span>
              <textarea data-note="leak" data-path="${escapeHtml(prospect.path)}" placeholder="What exact visible leak did the Loom show?">${escapeHtml(prospect.leak)}</textarea>
            </label>
            <label>
              <span>Impact note</span>
              <textarea data-note="impact" data-path="${escapeHtml(prospect.path)}" placeholder="Why should this buyer care now?">${escapeHtml(prospect.impact)}</textarea>
            </label>
            <label>
              <span>Fix note</span>
              <textarea data-note="fix" data-path="${escapeHtml(prospect.path)}" placeholder="What is the first fix we would make?">${escapeHtml(prospect.fix)}</textarea>
            </label>
            <label>
              <span>Ask note</span>
              <textarea data-note="ask" data-path="${escapeHtml(prospect.path)}" placeholder="What is the clean next-step ask?">${escapeHtml(prospect.ask)}</textarea>
            </label>
          </div>
        </div>
        <div class="links">
          <a href="../../${escapeHtml(prospect.path)}/recording-sharpness-brief.md">Sharpness</a>
          <a href="../../${escapeHtml(prospect.path)}/recording-script.md">Script</a>
          <a href="../../${escapeHtml(prospect.path)}/contact-plan.md">Contact</a>
          <a href="${escapeHtml(prospect.website)}" target="_blank" rel="noreferrer">Site</a>
        </div>
      </section>
`).join("\n");

const html = `<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>TinyStudio Daily Money Mission</title>
  <link rel="icon" href="data:," />
  <style>
    :root {
      color-scheme: light;
      --ink: #171717;
      --muted: #5f6368;
      --line: #d9ded8;
      --paper: #faf9f5;
      --panel: #ffffff;
      --accent: #0d6b57;
    }
    * { box-sizing: border-box; }
    body {
      margin: 0;
      font-family: Inter, ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
      background: var(--paper);
      color: var(--ink);
      line-height: 1.45;
    }
    header {
      border-bottom: 1px solid var(--line);
      background: rgba(250, 249, 245, 0.96);
      padding: 20px 24px;
    }
    h1 {
      margin: 0;
      font-size: 28px;
      letter-spacing: 0;
    }
    .sub, .muted {
      color: var(--muted);
      font-size: 14px;
    }
    .channelWarning, .channelReady {
      border: 1px solid #efc7be;
      border-radius: 6px;
      background: #fff7f4;
      color: #7a281f;
      padding: 8px 10px;
      font-size: 13px;
      font-weight: 700;
      margin: 8px 0 0;
    }
    .channelReady {
      border-color: #b9d5c8;
      background: #f4faf6;
      color: #164536;
    }
    main {
      width: min(1120px, calc(100% - 32px));
      margin: 24px auto 64px;
      display: grid;
      gap: 16px;
    }
    .panel, .prospect {
      border: 1px solid var(--line);
      background: var(--panel);
      border-radius: 8px;
      padding: 16px;
    }
    .metrics {
      display: grid;
      grid-template-columns: repeat(4, minmax(0, 1fr));
      gap: 10px;
    }
    .metric strong {
      display: block;
      font-size: 28px;
      line-height: 1;
      margin-bottom: 6px;
    }
    h2 {
      margin: 0 0 10px;
      font-size: 18px;
      letter-spacing: 0;
    }
    .prospect {
      display: grid;
      grid-template-columns: minmax(0, 1fr) auto;
      gap: 16px;
      align-items: start;
    }
    .prospect h2 {
      margin: 0 0 6px;
      font-size: 20px;
    }
    .eyebrow {
      margin: 0 0 4px;
      color: var(--accent);
      font-size: 12px;
      font-weight: 700;
      text-transform: uppercase;
    }
    .links {
      display: grid;
      gap: 8px;
      min-width: 120px;
    }
    label {
      display: block;
      margin: 12px 0 6px;
      color: var(--muted);
      font-size: 13px;
      font-weight: 700;
    }
    .qualityBar {
      display: grid;
      grid-template-columns: repeat(4, minmax(0, 1fr));
      gap: 8px;
      margin-top: 10px;
    }
    .qualityBar .qualityCheck {
      border: 1px solid var(--line);
      border-radius: 6px;
      background: #f6f8f5;
      color: var(--muted);
      padding: 8px 10px;
      font-size: 13px;
      font-weight: 700;
      display: flex;
      gap: 8px;
      align-items: center;
      justify-content: center;
      margin: 0;
      cursor: pointer;
    }
    .qualityBar .qualityCheck:has(input:checked) {
      border-color: var(--accent);
      background: #f0f7f3;
      color: #164536;
    }
    .qualityBar .qualityCheck input {
      width: auto;
      accent-color: var(--accent);
      margin: 0;
      padding: 0;
    }
    .qualityNotes {
      display: grid;
      grid-template-columns: repeat(4, minmax(0, 1fr));
      gap: 8px;
      margin-top: 8px;
    }
    .qualityNotes label {
      margin: 0;
      color: var(--muted);
      font-size: 12px;
      font-weight: 700;
    }
    .qualityNotes span {
      display: block;
      margin-bottom: 4px;
    }
    .qualityNotes textarea {
      min-height: 76px;
      font-size: 13px;
      line-height: 1.35;
      resize: vertical;
    }
    .qualityNotes textarea.valid {
      border-color: var(--accent);
      background: #f0f7f3;
    }
    .qualityNotes textarea.invalid {
      border-color: #b43b2d;
      background: #fff5f2;
    }
    input, textarea {
      width: 100%;
      border: 1px solid var(--line);
      border-radius: 6px;
      background: #fbfcfb;
      color: var(--ink);
      font: inherit;
      font-size: 14px;
      padding: 10px;
    }
    input.valid {
      border-color: var(--accent);
      background: #f0f7f3;
    }
    input.invalid {
      border-color: #b43b2d;
      background: #fff5f2;
    }
    .inputStatus {
      min-height: 20px;
      margin: 6px 0 0;
      color: var(--muted);
      font-size: 13px;
    }
    .inputStatus.valid { color: #164536; }
    .inputStatus.invalid { color: #7a281f; }
    textarea {
      min-height: 150px;
      resize: vertical;
    }
    .actions {
      display: flex;
      flex-wrap: wrap;
      gap: 8px;
    }
    a, button {
      border: 1px solid var(--line);
      border-radius: 6px;
      background: #f6f8f5;
      color: var(--ink);
      display: inline-flex;
      align-items: center;
      justify-content: center;
      min-height: 36px;
      padding: 8px 10px;
      font-size: 13px;
      text-decoration: none;
      cursor: pointer;
    }
    a:hover, button:hover { border-color: var(--accent); }
    ol, ul { margin: 0; padding-left: 22px; }
    li + li { margin-top: 8px; }
    @media (max-width: 780px) {
      .metrics, .prospect { grid-template-columns: 1fr; }
      .qualityNotes { grid-template-columns: 1fr; }
      .links { min-width: 0; }
    }
  </style>
</head>
<body>
  <header>
    <h1>Daily Money Mission</h1>
    <p class="sub">Generated ${escapeHtml(today)}. ${escapeHtml(mission)}</p>
  </header>
  <main>
    <section class="metrics">
      <div class="panel metric"><strong>${metrics.counts.scored}</strong><span>scored</span></div>
      <div class="panel metric"><strong>${metrics.counts.loomsRecorded}</strong><span>Looms</span></div>
      <div class="panel metric"><strong>${metrics.counts.sends}</strong><span>sends</span></div>
      <div class="panel metric"><strong>${metrics.counts.replies}</strong><span>replies</span></div>
    </section>
    <section class="panel">
      <h2>Run Today</h2>
      <ol>
        <li>Run <code>npm run prospect:prep-recording -- --limit=${limit}</code> if the pages or scripts may be stale.</li>
        <li>Open the rehearsal check. Record only if every script is ready.</li>
        <li>Open the teleprompter and record this queue.</li>
        <li>Paste Loom links below, or copy URL-only lines after recording and run <code>npm run market:after-recording -- --from-clipboard</code>.</li>
        <li>Send from the outbox, copy the batch sent sheet, then run <code>npm run prospect:batch-sent -- --from-clipboard</code>.</li>
      </ol>
    </section>
    <section class="panel">
      <h2>Open</h2>
      <p>
        <a href="../../prospects/recording-rehearsal-check.html">Rehearsal</a>
        <a href="../../prospects/recording-teleprompter.html">Teleprompter</a>
        <a href="../../prospects/lead-scoring-cockpit.html">Score</a>
        <a href="../../prospects/recording-cockpit.html">Recording Cockpit</a>
        <a href="../../prospects/outbox.html">Outbox</a>
        <a href="../../prospects/followup-cockpit.html">Follow-Ups</a>
        <a href="../../prospects/sales-cockpit.html">Sales</a>
        <a href="sender-setup-guide.html">Sender Setup</a>
      </p>
    </section>
    <section class="panel">
      <h2>Loom Link Sheet</h2>
      <textarea id="loomSheet" readonly>${escapeHtml(activeProspects.map((prospect) => `${prospect.path}|`).join("\n"))}</textarea>
      <p class="muted" id="loomSheetStatus">0 approved Loom links.</p>
      <p class="muted">Current file: ${escapeHtml(loomLinks.path)} (${escapeHtml(loomLinks.status)}).</p>
      <div class="actions">
        <button id="refreshSheet" type="button">Refresh Sheet</button>
        <button id="copySheet" type="button">Copy Sheet</button>
      </div>
    </section>
    ${cards || `<section class="panel"><h2>No active queue</h2><p>Score the next prospects.</p></section>`}
  </main>
  <script>
    const inputs = Array.from(document.querySelectorAll(".loomInput"));
    const qualityChecks = Array.from(document.querySelectorAll(".qualityCheck input"));
    const noteFields = Array.from(document.querySelectorAll(".qualityNotes textarea"));
    const sheet = document.getElementById("loomSheet");
    const sheetStatus = document.getElementById("loomSheetStatus");
    const qualityStorageKey = "tinystudio-daily-money-mission-quality";
    const noteStorageKey = "tinystudio-daily-money-mission-notes";
    const storedQuality = JSON.parse(localStorage.getItem(qualityStorageKey) || "{}");
    const storedNotes = JSON.parse(localStorage.getItem(noteStorageKey) || "{}");
    function isValidLoomUrl(value) {
      try {
        const url = new URL(String(value || "").trim());
        const host = url.hostname.toLowerCase();
        if (url.protocol !== "https:" && url.protocol !== "http:") return false;
        if (host !== "loom.com" && !host.endsWith(".loom.com")) return false;
        return /^\\/(share|embed)\\/[^/?#]+/.test(url.pathname);
      } catch {
        return false;
      }
    }
    function qualityKey(input) {
      return input.dataset.path + "::" + input.dataset.quality;
    }
    function noteKey(input) {
      return input.dataset.path + "::" + input.dataset.note;
    }
    function cleanRowPart(value) {
      return String(value || "").replace(/\\s+/g, " ").replace(/\\|/g, "/").trim();
    }
    function prospectQualityChecks(path) {
      return qualityChecks.filter((input) => input.dataset.path === path);
    }
    function prospectNoteFields(path) {
      return noteFields.filter((input) => input.dataset.path === path);
    }
    function notesFor(path) {
      const notes = {};
      for (const input of prospectNoteFields(path)) {
        notes[input.dataset.note] = cleanRowPart(input.value);
      }
      return notes;
    }
    function hasQualityNotes(path) {
      const notes = notesFor(path);
      return ["leak", "impact", "fix", "ask"].every((key) => notes[key] && notes[key].length >= 8);
    }
    function isQualityApproved(path) {
      const checks = prospectQualityChecks(path);
      return checks.length > 0 && checks.every((input) => input.checked) && hasQualityNotes(path);
    }
    function focusFirstMissingQuality(path) {
      const missing = prospectQualityChecks(path).find((input) => !input.checked);
      if (missing) {
        missing.focus();
        return;
      }
      const missingNote = prospectNoteFields(path).find((input) => cleanRowPart(input.value).length < 8);
      if (missingNote) missingNote.focus();
    }
    async function copyText(text) {
      try {
        if (navigator.clipboard && window.isSecureContext) {
          await navigator.clipboard.writeText(text);
          return true;
        }
      } catch {}
      const textarea = document.createElement("textarea");
      textarea.value = text;
      textarea.setAttribute("readonly", "");
      textarea.style.position = "fixed";
      textarea.style.left = "-9999px";
      document.body.appendChild(textarea);
      textarea.select();
      let copied = false;
      try {
        copied = document.execCommand("copy");
      } catch {
        copied = false;
      }
      textarea.remove();
      if (copied) return true;
      window.prompt("Copy this:", text);
      return false;
    }
    function saveQuality() {
      const next = {};
      for (const input of qualityChecks) {
        if (input.checked) next[qualityKey(input)] = true;
      }
      localStorage.setItem(qualityStorageKey, JSON.stringify(next));
      buildSheet();
    }
    function saveNotes() {
      const next = {};
      for (const input of noteFields) {
        const value = cleanRowPart(input.value);
        if (value) next[noteKey(input)] = value;
      }
      localStorage.setItem(noteStorageKey, JSON.stringify(next));
      buildSheet();
    }
    function buildSheet() {
      let valid = 0;
      let approved = 0;
      let invalid = 0;
      sheet.value = inputs
        .map((input) => {
          const value = input.value.trim();
          const ok = isValidLoomUrl(value);
          const qualityOk = isQualityApproved(input.dataset.path);
          const notesOk = hasQualityNotes(input.dataset.path);
          const notes = notesFor(input.dataset.path);
          const status = document.getElementById("status-" + input.id);
          if (ok) valid += 1;
          if (ok && qualityOk) approved += 1;
          if (value && !ok) invalid += 1;
          input.classList.toggle("valid", ok);
          input.classList.toggle("invalid", Boolean(value) && (!ok || !qualityOk));
          if (status) {
            status.textContent = ok && qualityOk
              ? "Ready for batch prep."
              : ok
                ? notesOk
                  ? "Check leak, impact, fix, and ask before batch prep."
                  : "Add leak, impact, fix, and ask notes before batch prep."
                : "Needs a Loom share or embed URL.";
            status.classList.toggle("valid", ok && qualityOk);
            status.classList.toggle("invalid", Boolean(value) && (!ok || !qualityOk));
          }
          return ok && qualityOk
            ? [
                input.dataset.path,
                value,
                "approved",
                notes.leak,
                notes.impact,
                notes.fix,
                notes.ask
              ].map(cleanRowPart).join("|")
            : "";
        })
        .filter(Boolean)
        .join("\\n");
      for (const input of noteFields) {
        const value = cleanRowPart(input.value);
        input.classList.toggle("valid", value.length >= 8);
        input.classList.toggle("invalid", Boolean(value) && value.length < 8);
      }
      sheetStatus.textContent = invalid
        ? approved + " approved Loom links. Fix " + invalid + " invalid link(s) before copying."
        : approved + " approved Loom links. " + (valid - approved) + " valid Loom link(s) still need checks or notes.";
    }
    for (const input of inputs) input.addEventListener("input", buildSheet);
    for (const input of qualityChecks) {
      input.checked = Boolean(storedQuality[qualityKey(input)]);
      input.addEventListener("change", saveQuality);
    }
    for (const input of noteFields) {
      input.value = storedNotes[noteKey(input)] || input.value || "";
      input.addEventListener("input", saveNotes);
    }
    document.getElementById("refreshSheet").addEventListener("click", buildSheet);
    document.getElementById("copySheet").addEventListener("click", async () => {
      buildSheet();
      const invalid = inputs.find((input) => input.value.trim() && !isValidLoomUrl(input.value));
      if (invalid) {
        invalid.focus();
        return;
      }
      const missingQuality = inputs.find((input) => isValidLoomUrl(input.value) && !isQualityApproved(input.dataset.path));
      if (missingQuality) {
        focusFirstMissingQuality(missingQuality.dataset.path);
        return;
      }
      if (!sheet.value.trim()) return;
      await copyText(sheet.value);
    });
    buildSheet();
  </script>
</body>
</html>
`;

write(outputPath, markdown);
write(htmlPath, html);

console.log(JSON.stringify({
  status: "created",
  path: outputPath,
  htmlPath,
  date: today,
  mission,
  loomLinks,
  prospects: activeProspects.map((prospect) => prospect.name)
}, null, 2));
