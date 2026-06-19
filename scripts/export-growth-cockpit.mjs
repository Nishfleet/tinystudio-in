#!/usr/bin/env node
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { execFileSync } from "node:child_process";
import { localIsoDate } from "./date-utils.mjs";

const outputArg = process.argv.find((arg) => arg.startsWith("--output="));
const outputPath = outputArg ? outputArg.split("=")[1] : "growth-brain/ops/growth-cockpit.html";
const today = localIsoDate();

function runJson(args) {
  const output = execFileSync("node", args, {
    encoding: "utf8",
    stdio: ["ignore", "pipe", "pipe"]
  });
  return JSON.parse(output);
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

runJson(["scripts/export-recording-cockpit.mjs", "--limit=5"]);
runJson(["scripts/export-lead-scoring-cockpit.mjs", "--limit=10"]);
runJson(["scripts/export-recording-teleprompter.mjs", "--limit=5"]);
runJson(["scripts/export-prospect-outbox.mjs"]);
runJson(["scripts/export-followup-cockpit.mjs"]);
runJson(["scripts/export-sales-cockpit.mjs"]);
runJson(["scripts/export-daily-money-mission.mjs", "--limit=5"]);
const metrics = runJson(["scripts/export-growth-metrics.mjs"]);
runJson(["scripts/export-proof-library.mjs"]);
runJson(["scripts/export-managed-it-one-pager.mjs"]);
runJson(["scripts/export-growth-doctor.mjs", "--no-checks"]);
runJson(["scripts/export-sender-setup-guide.mjs"]);
const todayResult = runJson(["scripts/show-growth-command-center.mjs"]);

const focusItems = todayResult.todayFocus.map((item) => `<li>${escapeHtml(displayText(item))}</li>`).join("\n");
const topProspects = (todayResult.prospects || [])
  .filter((prospect) => !["won", "lost", "paused"].includes(prospect.pipelineStage))
  .slice(0, 8)
  .map((prospect) => `
    <tr>
      <td>${escapeHtml(prospect.name)}</td>
      <td>${escapeHtml(prospect.pipelineStage)}</td>
      <td>${escapeHtml(prospect.status)}</td>
      <td>${escapeHtml(prospect.nextAction)}</td>
      <td><a href="../../${escapeHtml(prospect.path)}/buyer-room.md">Buyer Room</a></td>
    </tr>
  `).join("\n");

const html = `<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>TinyStudio Growth Cockpit</title>
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
    .sub {
      margin: 4px 0 0;
      color: var(--muted);
      font-size: 14px;
    }
    main {
      width: min(1180px, calc(100% - 32px));
      margin: 24px auto 64px;
      display: grid;
      gap: 18px;
    }
    .grid {
      display: grid;
      grid-template-columns: repeat(4, minmax(0, 1fr));
      gap: 12px;
    }
    .panel {
      border: 1px solid var(--line);
      background: var(--panel);
      border-radius: 8px;
      padding: 16px;
    }
    .metric {
      min-height: 94px;
    }
    .metric strong {
      display: block;
      font-size: 28px;
      line-height: 1;
      margin-bottom: 8px;
    }
    .metric span, .muted {
      color: var(--muted);
      font-size: 14px;
    }
    h2 {
      margin: 0 0 12px;
      font-size: 18px;
      letter-spacing: 0;
    }
    ol, ul {
      margin: 0;
      padding-left: 22px;
    }
    li + li {
      margin-top: 8px;
    }
    .linkGrid {
      display: grid;
      grid-template-columns: repeat(4, minmax(0, 1fr));
      gap: 8px;
    }
    a.button {
      border: 1px solid var(--line);
      border-radius: 6px;
      background: #f6f8f5;
      color: var(--ink);
      display: flex;
      align-items: center;
      justify-content: center;
      min-height: 40px;
      padding: 8px 10px;
      font-size: 13px;
      text-decoration: none;
      text-align: center;
    }
    a.button:hover { border-color: var(--accent); }
    table {
      width: 100%;
      border-collapse: collapse;
      font-size: 14px;
    }
    th, td {
      border-top: 1px solid var(--line);
      padding: 10px 8px;
      text-align: left;
      vertical-align: top;
    }
    th {
      color: var(--muted);
      font-weight: 700;
    }
    td a {
      color: var(--accent);
    }
    @media (max-width: 860px) {
      .grid, .linkGrid { grid-template-columns: 1fr; }
      table { display: block; overflow-x: auto; }
    }
  </style>
</head>
<body>
  <header>
    <h1>TinyStudio Growth Cockpit</h1>
    <p class="sub">Generated ${escapeHtml(today)}. Start here, then record and send.</p>
  </header>
  <main>
    <section class="grid">
      <div class="panel metric"><strong>${metrics.counts.scored}</strong><span>scored prospects</span></div>
      <div class="panel metric"><strong>${metrics.counts.loomsRecorded}</strong><span>Looms recorded</span></div>
      <div class="panel metric"><strong>${metrics.counts.sends}</strong><span>sends</span></div>
      <div class="panel metric"><strong>${metrics.counts.replies}</strong><span>replies</span></div>
    </section>

    <section class="panel">
      <h2>Open</h2>
      <div class="linkGrid">
        <a class="button" href="../../prospects/recording-cockpit.html">Recording Cockpit</a>
        <a class="button" href="daily-money-mission.html">Daily Money Mission</a>
        <a class="button" href="../../prospects/lead-scoring-cockpit.html">Scoring Cockpit</a>
        <a class="button" href="../../prospects/recording-teleprompter.html">Teleprompter</a>
        <a class="button" href="../../prospects/outbox.html">Outbox</a>
        <a class="button" href="../../prospects/followup-cockpit.html">Follow-Ups</a>
        <a class="button" href="../../prospects/sales-cockpit.html">Sales Cockpit</a>
        <a class="button" href="live-metrics.md">Live Metrics</a>
        <a class="button" href="growth-doctor.md">Growth Doctor</a>
        <a class="button" href="sender-setup-guide.html">Sender Setup</a>
        <a class="button" href="proof-library.md">Proof Library</a>
        <a class="button" href="../sales/managed-it-one-page-offer.html">Managed IT Sales Sheet</a>
      </div>
    </section>

    <section class="panel">
      <h2>Today</h2>
      <ol>
        ${focusItems}
      </ol>
    </section>

    <section class="panel">
      <h2>Closest Prospects</h2>
      <table>
        <thead>
          <tr>
            <th>Prospect</th>
            <th>Stage</th>
            <th>Ready</th>
            <th>Next Action</th>
            <th>Room</th>
          </tr>
        </thead>
        <tbody>
          ${topProspects}
        </tbody>
      </table>
    </section>
  </main>
</body>
</html>
`;

const outputDir = outputPath.split("/").slice(0, -1).join("/");
if (outputDir) mkdirSync(outputDir, { recursive: true });
writeFileSync(outputPath, `${html.replace(/[ \t]+$/gm, "").trimEnd()}\n`);

console.log(JSON.stringify({
  status: "created",
  path: outputPath,
  date: today,
  links: [
    "prospects/recording-cockpit.html",
    "growth-brain/ops/daily-money-mission.html",
    "prospects/lead-scoring-cockpit.html",
    "prospects/recording-teleprompter.html",
    "prospects/outbox.html",
    "prospects/followup-cockpit.html",
    "prospects/sales-cockpit.html",
    "growth-brain/ops/live-metrics.md",
    "growth-brain/ops/growth-doctor.md",
    "growth-brain/ops/sender-setup-guide.html",
    "growth-brain/ops/proof-library.md",
    "growth-brain/sales/managed-it-one-page-offer.html"
  ]
}, null, 2));
