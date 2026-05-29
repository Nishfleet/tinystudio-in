#!/usr/bin/env node
import { existsSync, mkdirSync, readdirSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { execFileSync } from "node:child_process";
import { localIsoDate } from "./date-utils.mjs";

const outputArg = process.argv.find((arg) => arg.startsWith("--output="));
const htmlArg = process.argv.find((arg) => arg.startsWith("--html="));
const dateArg = process.argv.find((arg) => arg.startsWith("--date="));
const monthlyForced = process.argv.includes("--monthly");
const plain = process.argv.includes("--plain");

const today = dateArg ? dateArg.split("=")[1] : localIsoDate();
const outputPath = outputArg ? outputArg.split("=")[1] : "growth-brain/ops/retention-checkups.md";
const dashboardPath = htmlArg ? htmlArg.split("=")[1] : "growth-brain/ops/retention-dashboard.html";

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

function lineValue(content, label, fallback = "") {
  const escaped = label.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const match = String(content || "").match(new RegExp(`^- ${escaped}:[ \\t]*([^\\n]*)$`, "m"));
  return match && match[1].trim() ? match[1].trim() : fallback;
}

function section(content, heading, fallback = "") {
  const escaped = heading.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const match = String(content || "").match(new RegExp(`## ${escaped}\\n+([\\s\\S]*?)(?:\\n## |$)`));
  return match ? match[1].trim() : fallback;
}

function compact(value, maxLength = 140) {
  const normalized = String(value || "").replace(/\s+/g, " ").trim();
  if (!normalized) return "";
  if (normalized.length <= maxLength) return normalized;
  return `${normalized.slice(0, maxLength - 1).trim()}...`;
}

function runJson(args) {
  const output = execFileSync("node", args, {
    encoding: "utf8",
    stdio: ["ignore", "pipe", "pipe"]
  });
  return JSON.parse(output);
}

function htmlEscape(value) {
  return String(value || "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;");
}

function monthReviewDue(isoDate) {
  const day = Number(String(isoDate).split("-")[2] || 0);
  return monthlyForced || day >= 24;
}

function weeklyAction(row) {
  if (row.weeklyStatus !== "ready") {
    const warning = row.weeklyWarnings[0] || "weekly report is not retention-ready";
    return `Finish weekly report: ${warning}`;
  }
  if (row.confirmationStatus !== "ready") {
    return "Get client confirmation: saw delta, understood value, approved next action, and continue/retain signal.";
  }
  if (row.readinessStatus !== "ready") {
    const warning = row.readinessWarnings[0] || "client readiness is still draft";
    if (row.ownedStartup && /Sprint acceptance checklist is not complete/i.test(warning)) {
      return `Record proof handoff before renewal talk: ${warning}`;
    }
    return `Fix delivery proof before renewal talk: ${warning}`;
  }
  return "Send/report the weekly value, confirm next test, and log the client response.";
}

function weeklyCommand(row) {
  if (row.weeklyStatus !== "ready") return `npm run client:weekly-report -- ${row.path}`;
  if (row.confirmationStatus !== "ready") return `npm run client:weekly-report -- ${row.path}`;
  if (row.readinessStatus !== "ready") {
    const warning = row.readinessWarnings[0] || "";
    if (row.ownedStartup && /Sprint acceptance checklist is not complete/i.test(warning)) return "npm run owned:handoff";
    return `npm run client:check -- ${row.path}`;
  }
  return `npm run client:dashboard -- ${row.path}`;
}

function monthlyAction(row, due) {
  if (!due) return "Not due this week; keep the weekly loop moving.";
  if (row.weeklyStatus !== "ready") return "Do not run a renewal review yet; weekly proof is still missing.";
  if (row.confirmationStatus !== "ready") return "Do not run a renewal review yet; client value confirmation is still missing.";
  return `Run renewal review: npm run client:renewal -- ${row.path}`;
}

function risk(row) {
  if (row.weeklyStatus !== "ready") return "high";
  if (row.confirmationStatus !== "ready") return "high";
  if (row.readinessStatus !== "ready") return "watch";
  return "healthy";
}

function confirmationStatus(report) {
  return ["Client saw delta", "Client understood value", "Client approved next action", "Continue / retain signal"]
    .every((label) => lineValue(report, label, "").trim().length >= 8)
    ? "ready"
    : "missing";
}

const clients = listFolders("clients").map((clientPath) => {
  const intake = read(join(clientPath, "intake.md"));
  const sprintPlan = read(join(clientPath, "sprint-plan.md"));
  const weeklyReport = read(join(clientPath, "reports/week-1-report.md"));
  const weekly = runJson(["scripts/check-client-weekly-report.mjs", clientPath]);
  const readiness = runJson(["scripts/check-client-readiness.mjs", clientPath]);
  const row = {
    path: clientPath,
    name: lineValue(intake, "Name", clientPath.split("/").at(-1)),
    ownedStartup: /## Proof Type\s+owned-startup/i.test(read(join(clientPath, "proof-context.md"))),
    website: lineValue(intake, "Website", ""),
    offer: lineValue(intake, "Main offer", ""),
    wedge: compact(section(sprintPlan, "Wedge", "")),
    shipped: lineValue(weeklyReport, "Shipped", ""),
    learning: lineValue(weeklyReport, "What improved", "")
      || lineValue(weeklyReport, "What got worse", "")
      || lineValue(weeklyReport, "What stayed flat", "")
      || lineValue(weeklyReport, "What surprised us", ""),
    confirmationStatus: confirmationStatus(weeklyReport),
    weeklyStatus: weekly.status,
    weeklyWarnings: weekly.warnings || [],
    readinessStatus: readiness.status,
    readinessWarnings: readiness.warnings || []
  };
  row.risk = risk(row);
  row.weeklyAction = weeklyAction(row);
  row.weeklyCommand = weeklyCommand(row);
  return row;
});

const due = monthReviewDue(today);
const weeklyReady = clients.filter((client) => client.weeklyStatus === "ready").length;
const readinessReady = clients.filter((client) => client.readinessStatus === "ready").length;
const highRisk = clients.filter((client) => client.risk === "high").length;
const watchRisk = clients.filter((client) => client.risk === "watch").length;

const weeklyRows = clients.length
  ? clients.map((client) => `| ${client.name} | ${client.readinessStatus} | ${client.weeklyStatus} | ${client.confirmationStatus} | ${client.risk} | ${client.weeklyAction} | \`${client.weeklyCommand}\` |`).join("\n")
  : "| - | - | - | - | - | No clients yet. Close and deliver the first sprint before retention proof exists. | - |";

const monthlyRows = clients.length
  ? clients.map((client) => `| ${client.name} | ${due ? "due" : "not due"} | ${client.wedge || client.offer || "-"} | ${monthlyAction(client, due)} |`).join("\n")
  : "| - | - | - | No clients yet. |";

const markdown = `# Retention Checkups

Generated: ${today}

This is the retention control surface. It should make weekly and monthly client checkups automatic to prepare, but it does not send anything automatically and never fakes proof.

## Summary

| Signal | Count |
|---|---:|
| Clients | ${clients.length} |
| Delivery-ready clients | ${readinessReady} |
| Weekly reports ready | ${weeklyReady} |
| High-risk clients | ${highRisk} |
| Watch clients | ${watchRisk} |
| Monthly review due now | ${due ? clients.length : 0} |

## Weekly Checkups

| Client | Delivery readiness | Weekly report | Client confirmation | Risk | Next action | Command |
|---|---|---|---|---|---|---|
${weeklyRows}

## Monthly Checkups

| Client | Monthly review | Current lane | Next action |
|---|---|---|---|
${monthlyRows}

## Dashboard

Open \`${dashboardPath}\` for the visual dashboard.

## Operating Rules

- Weekly checkup: run this every Friday before client updates.
- Monthly checkup: the same run marks monthly reviews due during the final week of the month, or run with \`--monthly\`.
- Do not pitch renewal, expansion, or a higher retainer unless the weekly report shows shipped work, a learning, and a next test.
- Do not count retention proof until the client confirms they saw the delta, understood the value, approved the next action, and gave a continue/retain signal.
- Do not send automatically. Prepare the checkup, then make a human/client-safe decision.
`;

const rowsHtml = clients.length
  ? clients.map((client) => `
        <tr>
          <td><strong>${htmlEscape(client.name)}</strong><span>${htmlEscape(client.path)}</span></td>
          <td><span class="pill ${client.readinessStatus === "ready" ? "good" : "warn"}">${htmlEscape(client.readinessStatus)}</span></td>
          <td><span class="pill ${client.weeklyStatus === "ready" ? "good" : "bad"}">${htmlEscape(client.weeklyStatus)}</span></td>
          <td><span class="pill ${client.confirmationStatus === "ready" ? "good" : "bad"}">${htmlEscape(client.confirmationStatus)}</span></td>
          <td><span class="pill ${client.risk === "healthy" ? "good" : client.risk === "watch" ? "warn" : "bad"}">${htmlEscape(client.risk)}</span></td>
          <td>${htmlEscape(client.weeklyAction)}<code>${htmlEscape(client.weeklyCommand)}</code></td>
          <td>${htmlEscape(monthlyAction(client, due))}</td>
        </tr>`).join("")
  : `<tr><td colspan="7">No clients yet. The dashboard becomes useful after the first paid sprint.</td></tr>`;

const html = `<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>TinyStudio Retention Dashboard</title>
  <style>
    :root { color-scheme: light; --ink:#15171a; --muted:#667085; --line:#dde3ea; --paper:#f6f8fb; --good:#0f7b45; --warn:#9a5b00; --bad:#b42318; }
    * { box-sizing: border-box; }
    body { margin: 0; font-family: Inter, ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif; color: var(--ink); background: #fff; }
    main { max-width: 1180px; margin: 0 auto; padding: 32px 20px 44px; }
    header { display: flex; justify-content: space-between; gap: 16px; align-items: end; margin-bottom: 24px; border-bottom: 1px solid var(--line); padding-bottom: 18px; }
    h1 { font-size: clamp(28px, 4vw, 44px); line-height: 1.02; margin: 0; letter-spacing: 0; }
    p { color: var(--muted); margin: 6px 0 0; max-width: 720px; }
    .stamp { color: var(--muted); font-size: 14px; text-align: right; white-space: nowrap; }
    .cards { display: grid; grid-template-columns: repeat(5, minmax(0, 1fr)); gap: 12px; margin: 20px 0; }
    .card { border: 1px solid var(--line); border-radius: 8px; padding: 14px; background: var(--paper); min-height: 84px; }
    .card b { display:block; font-size: 28px; line-height: 1; margin-bottom: 8px; }
    .card span { color: var(--muted); font-size: 13px; }
    table { width: 100%; border-collapse: collapse; border: 1px solid var(--line); border-radius: 8px; overflow: hidden; }
    th, td { text-align: left; padding: 13px 12px; border-bottom: 1px solid var(--line); vertical-align: top; }
    th { background: var(--paper); font-size: 12px; text-transform: uppercase; letter-spacing: .04em; color: #475467; }
    td span { display: block; color: var(--muted); font-size: 12px; margin-top: 4px; }
    .pill { display: inline-flex; align-items: center; border-radius: 999px; padding: 4px 8px; font-size: 12px; font-weight: 700; text-transform: uppercase; letter-spacing: .03em; color: #fff; }
    .good { background: var(--good); }
    .warn { background: var(--warn); }
    .bad { background: var(--bad); }
    .rules { margin-top: 20px; padding: 16px; border-left: 4px solid var(--ink); background: var(--paper); }
    .rules ul { margin: 8px 0 0; padding-left: 20px; color: var(--muted); }
    @media (max-width: 860px) {
      header { display: block; }
      .stamp { text-align: left; margin-top: 10px; }
      .cards { grid-template-columns: repeat(2, minmax(0, 1fr)); }
      table { display: block; overflow-x: auto; }
    }
  </style>
</head>
<body>
  <main>
    <header>
      <div>
        <h1>Retention Dashboard</h1>
        <p>Weekly and monthly client checkups, generated from client folders. It shows missing proof instead of hiding it.</p>
      </div>
      <div class="stamp">Generated ${htmlEscape(today)}<br>${due ? "Monthly reviews due" : "Weekly checkup mode"}</div>
    </header>
    <section class="cards">
      <div class="card"><b>${clients.length}</b><span>clients</span></div>
      <div class="card"><b>${readinessReady}</b><span>delivery-ready</span></div>
      <div class="card"><b>${weeklyReady}</b><span>weekly reports ready</span></div>
      <div class="card"><b>${highRisk}</b><span>high risk</span></div>
      <div class="card"><b>${due ? clients.length : 0}</b><span>monthly reviews due</span></div>
    </section>
    <table>
      <thead>
        <tr>
          <th>Client</th>
          <th>Delivery</th>
          <th>Weekly</th>
          <th>Confirmation</th>
          <th>Risk</th>
          <th>Weekly action</th>
          <th>Monthly action</th>
        </tr>
      </thead>
      <tbody>${rowsHtml}
      </tbody>
    </table>
    <section class="rules">
      <strong>Rules</strong>
      <ul>
        <li>Run weekly before client updates.</li>
        <li>Run monthly during the final week, or with <code>--monthly</code>.</li>
        <li>No automatic sends. Prepare the checkup, then make the human decision.</li>
      </ul>
    </section>
  </main>
</body>
</html>
`;

for (const path of [outputPath, dashboardPath]) {
  const dir = path.split("/").slice(0, -1).join("/");
  if (dir) mkdirSync(dir, { recursive: true });
}

writeFileSync(outputPath, markdown);
writeFileSync(dashboardPath, html);

const result = {
  status: highRisk ? "attention-needed" : "ready",
  path: outputPath,
  dashboardPath,
  clients: clients.length,
  weeklyReady,
  monthlyDue: due ? clients.length : 0,
  highRisk,
  watchRisk
};

console.log(plain ? `${result.status}: ${clients.length} client(s), ${weeklyReady} weekly report(s) ready, ${result.monthlyDue} monthly review(s) due` : JSON.stringify(result, null, 2));
