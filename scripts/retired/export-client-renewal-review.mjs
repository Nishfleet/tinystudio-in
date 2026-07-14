#!/usr/bin/env node
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { execFileSync } from "node:child_process";
import { localIsoDate } from "./date-utils.mjs";

const args = process.argv.slice(2);
const clientPath = args.find((arg) => !arg.startsWith("--"));
const outputArg = args.find((arg) => arg.startsWith("--output="));
const htmlArg = args.find((arg) => arg.startsWith("--html="));

if (!clientPath) {
  console.error("Usage: npm run client:renewal -- clients/client-slug [--output=clients/client-slug/reports/monthly-renewal-review.md]");
  process.exit(1);
}

if (!existsSync(clientPath)) {
  console.error(`Client folder not found: ${clientPath}`);
  process.exit(1);
}

const outputPath = outputArg ? outputArg.split("=")[1] : join(clientPath, "reports", "monthly-renewal-review.md");
const htmlPath = htmlArg ? htmlArg.split("=")[1] : join(clientPath, "reports", "monthly-renewal-review.html");
const today = localIsoDate();

function read(relativePath) {
  const path = join(clientPath, relativePath);
  return existsSync(path) ? readFileSync(path, "utf8") : "";
}

function runJson(args) {
  const output = execFileSync("node", args, {
    encoding: "utf8",
    stdio: ["ignore", "pipe", "pipe"]
  });
  return JSON.parse(output);
}

function tableRows(markdown) {
  return String(markdown || "")
    .split("\n")
    .map((line) => line.trim())
    .filter((line) => line.startsWith("|") && line.endsWith("|"))
    .map((line) => line.split("|").slice(1, -1).map((cell) => cell.trim()))
    .filter((cells) => cells.some(Boolean) && !cells.every((cell) => /^:?-+:?$/.test(cell)));
}

function section(markdown, heading) {
  const escaped = heading.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const match = String(markdown || "").match(new RegExp(`## ${escaped}\\n+([\\s\\S]*?)(?:\\n## |$)`));
  return match ? match[1].trim() : "";
}

function bulletValue(markdown, label) {
  const escaped = label.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  return String(markdown || "").match(new RegExp(`^- ${escaped}:[ \\t]*([^\\n]*)$`, "m"))?.[1]?.trim() || "";
}

function meaningful(value) {
  const normalized = String(value || "").trim();
  return normalized.length >= 8 && !/^(todo|tbd|n\/a|none|placeholder|add|replace|-|\[.*\])$/i.test(normalized);
}

function clean(value) {
  return String(value || "").replace(/\s+/g, " ").trim();
}

function htmlEscape(value) {
  return String(value || "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;");
}

function write(path, content) {
  const dir = path.split("/").slice(0, -1).join("/");
  if (dir) mkdirSync(dir, { recursive: true });
  writeFileSync(path, content);
}

function firstFilledTableRow(markdown, heading, requiredIndexes) {
  return tableRows(section(markdown, heading)).find((cells) => {
    const first = cells[0] || "";
    if (/^(Priority|Week|Metric|Area|Claim)$/i.test(first)) return false;
    return requiredIndexes.every((index) => meaningful(cells[index]));
  }) || [];
}

function approvedClaims(markdown) {
  return tableRows(markdown)
    .filter((cells) => {
      const [claim, source, proofType, approvedBy, status] = cells;
      if (/^Claim$/i.test(claim || "")) return false;
      return claim && source && proofType && approvedBy && /^approved$/i.test(status || "");
    })
    .map(([claim, source, proofType, approvedBy]) => ({ claim, source, proofType, approvedBy }));
}

const intake = read("intake.md");
const sprintPlan = read("sprint-plan.md");
const report = read("reports/week-1-report.md");
const weeklyLearnings = read("brain/weekly-learnings.md");
const claimLedger = read("quality/claim-proof-ledger.md");
const clientDashboard = runJson(["scripts/export-client-facing-dashboard.mjs", clientPath]);
const weekly = runJson(["scripts/check-client-weekly-report.mjs", clientPath]);
const readiness = runJson(["scripts/check-client-readiness.mjs", clientPath]);

const claims = approvedClaims(claimLedger);
const name = bulletValue(intake, "Name") || clientPath.split("/").at(-1);
const website = bulletValue(intake, "Website") || "website pending";
const wedge = clean(section(sprintPlan, "Wedge")).split("\n").find((line) => meaningful(line)) || "lane pending";
const shipped = bulletValue(report, "Shipped") || "";
const drafted = bulletValue(report, "Drafted") || "";
const waiting = bulletValue(report, "Waiting on client") || "";
const blocked = bulletValue(report, "Blocked") || "";
const learning = bulletValue(report, "What improved")
  || bulletValue(report, "What got worse")
  || bulletValue(report, "What stayed flat")
  || bulletValue(report, "What surprised us")
  || "";
const nextTest = firstFilledTableRow(report, "Next Tests", [1, 2, 3, 4]);
const brainLearning = firstFilledTableRow(weeklyLearnings, "Log", [1, 3, 4]);
const nextAction = nextTest[1] || brainLearning[4] || "Choose next-month lane after proof is complete.";
const nextWhy = nextTest[2] || "No next-test reason is ready yet.";
const clientSawDelta = bulletValue(report, "Client saw delta");
const clientUnderstoodValue = bulletValue(report, "Client understood value");
const clientApprovedNextAction = bulletValue(report, "Client approved next action");
const continueRetainSignal = bulletValue(report, "Continue / retain signal");
const clientConfirmationReady = [clientSawDelta, clientUnderstoodValue, clientApprovedNextAction, continueRetainSignal].every(meaningful);

const missing = [
  ...(readiness.missing || []),
  ...(readiness.warnings || []),
  ...(weekly.missing || []),
  ...(weekly.warnings || []),
  ...(clientConfirmationReady ? [] : ["Client confirmation is incomplete"]),
  ...(claims.length ? [] : ["No approved proof claims"]),
  ...(clientDashboard.status === "ready" ? [] : ["Client dashboard is still draft"])
];

const readyForRenewalTalk = missing.length === 0;
const verdict = readyForRenewalTalk
  ? "ready-for-renewal-review"
  : "do-not-pitch-renewal-yet";
const recommendation = readyForRenewalTalk
  ? "Continue only around the next test below. Expansion is allowed only if the client explicitly wants the added lane."
  : "Do not ask for renewal, expansion, or a higher retainer yet. Finish the missing proof first.";

const proofRows = claims.length
  ? claims.map((claim) => `| ${claim.claim} | ${claim.source} | ${claim.proofType} | ${claim.approvedBy} |`).join("\n")
  : "| Pending | Add approved proof before renewal review. | - | - |";
const missingRows = missing.length
  ? missing.map((item) => `| ${item} |`).join("\n")
  : "| No missing renewal proof items. |";

const markdown = `# ${name} Monthly Renewal Review

Generated: ${today}

Status: ${verdict}

This is the month-end retention review. It is not a renewal pitch unless the proof gates are clean.

## Recommendation

${recommendation}

## Snapshot

| Area | Detail |
|---|---|
| Client | ${name} |
| Website | ${website} |
| Current lane | ${wedge} |
| Delivery readiness | ${readiness.status} |
| Weekly report | ${weekly.status} |
| Client dashboard | ${clientDashboard.status} |
| Approved proof claims | ${claims.length} |

## Value Evidence

- Shipped: ${shipped || "Pending"}
- Drafted: ${drafted || "Pending"}
- Learning: ${learning || "Pending"}
- Waiting on client: ${waiting || "None recorded"}
- Blocked: ${blocked || "None recorded"}
- Durable client-brain learning: ${brainLearning[3] || "Pending"}

## Client Confirmation

- Client saw delta: ${clientSawDelta || "Pending"}
- Client understood value: ${clientUnderstoodValue || "Pending"}
- Client approved next action: ${clientApprovedNextAction || "Pending"}
- Continue / retain signal: ${continueRetainSignal || "Pending"}

## Next Month Plan

- Lane: ${wedge}
- Next action: ${nextAction}
- Why this matters: ${nextWhy}

## Approved Proof

| Claim | Source | Proof Type | Approved By |
|---|---|---|---|
${proofRows}

## Missing Before Renewal Ask

| Missing Item |
|---|
${missingRows}

## Guardrail

Do not pitch renewal, expansion, or a higher retainer unless this file says \`ready-for-renewal-review\`.
`;

const proofHtml = claims.length
  ? claims.map((claim) => `
        <tr><td>${htmlEscape(claim.claim)}</td><td>${htmlEscape(claim.source)}</td><td>${htmlEscape(claim.proofType)}</td><td>${htmlEscape(claim.approvedBy)}</td></tr>`).join("")
  : `<tr><td>Pending</td><td>Add approved proof before renewal review.</td><td>-</td><td>-</td></tr>`;
const missingHtml = missing.length
  ? missing.map((item) => `<li>${htmlEscape(item)}</li>`).join("")
  : "<li>No missing renewal proof items.</li>";

const html = `<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>${htmlEscape(name)} Monthly Renewal Review</title>
  <style>
    :root { color-scheme: light; --ink:#14161a; --muted:#667085; --line:#d9e1ea; --paper:#f7f9fc; --panel:#fff; --good:#0f7b45; --warn:#9a5b00; }
    * { box-sizing:border-box; }
    body { margin:0; background:var(--paper); color:var(--ink); font-family:Inter, ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif; }
    main { max-width:1040px; margin:0 auto; padding:28px 18px 48px; }
    header { display:grid; grid-template-columns:1fr auto; gap:16px; align-items:end; padding-bottom:18px; border-bottom:1px solid var(--line); }
    h1 { margin:0; font-size:clamp(30px, 4vw, 44px); line-height:1; letter-spacing:0; }
    h2 { margin:0 0 10px; font-size:18px; }
    p { color:var(--muted); margin:8px 0 0; }
    section { margin-top:18px; border:1px solid var(--line); border-radius:8px; background:var(--panel); padding:16px; }
    .pill { display:inline-flex; border-radius:999px; padding:5px 9px; color:#fff; font-size:12px; font-weight:800; text-transform:uppercase; background:${readyForRenewalTalk ? "var(--good)" : "var(--warn)"}; }
    .grid { display:grid; grid-template-columns:repeat(3, minmax(0, 1fr)); gap:12px; }
    .card { border:1px solid var(--line); background:var(--paper); border-radius:8px; padding:14px; }
    .card b { display:block; margin-bottom:5px; }
    ul { margin:8px 0 0; padding-left:20px; }
    table { width:100%; border-collapse:collapse; margin-top:8px; }
    th, td { text-align:left; vertical-align:top; padding:10px 8px; border-top:1px solid var(--line); }
    th { color:var(--muted); font-size:12px; text-transform:uppercase; letter-spacing:.04em; }
    @media (max-width:760px) { header { display:block; } .grid { grid-template-columns:1fr; } table { display:block; overflow-x:auto; } }
  </style>
</head>
<body>
  <main>
    <header>
      <div>
        <h1>Monthly Renewal Review</h1>
        <p>${htmlEscape(name)} · generated ${htmlEscape(today)}</p>
      </div>
      <span class="pill">${htmlEscape(verdict)}</span>
    </header>
    <section>
      <h2>Recommendation</h2>
      <p>${htmlEscape(recommendation)}</p>
    </section>
    <section class="grid">
      <div class="card"><b>Delivery</b>${htmlEscape(readiness.status)}</div>
      <div class="card"><b>Weekly Report</b>${htmlEscape(weekly.status)}</div>
      <div class="card"><b>Approved Claims</b>${htmlEscape(claims.length)}</div>
    </section>
    <section>
      <h2>Value Evidence</h2>
      <ul>
        <li><b>Shipped:</b> ${htmlEscape(shipped || "Pending")}</li>
        <li><b>Drafted:</b> ${htmlEscape(drafted || "Pending")}</li>
        <li><b>Learning:</b> ${htmlEscape(learning || "Pending")}</li>
        <li><b>Waiting on client:</b> ${htmlEscape(waiting || "None recorded")}</li>
      </ul>
    </section>
    <section>
      <h2>Client Confirmation</h2>
      <ul>
        <li><b>Client saw delta:</b> ${htmlEscape(clientSawDelta || "Pending")}</li>
        <li><b>Client understood value:</b> ${htmlEscape(clientUnderstoodValue || "Pending")}</li>
        <li><b>Client approved next action:</b> ${htmlEscape(clientApprovedNextAction || "Pending")}</li>
        <li><b>Continue / retain signal:</b> ${htmlEscape(continueRetainSignal || "Pending")}</li>
      </ul>
    </section>
    <section>
      <h2>Next Month Plan</h2>
      <p><b>${htmlEscape(nextAction)}</b></p>
      <p>${htmlEscape(nextWhy)}</p>
    </section>
    <section>
      <h2>Approved Proof</h2>
      <table><thead><tr><th>Claim</th><th>Source</th><th>Proof Type</th><th>Approved By</th></tr></thead><tbody>${proofHtml}
      </tbody></table>
    </section>
    <section>
      <h2>Missing Before Renewal Ask</h2>
      <ul>${missingHtml}</ul>
    </section>
  </main>
</body>
</html>
`;

write(outputPath, markdown);
write(htmlPath, html);

console.log(JSON.stringify({
  status: verdict,
  path: outputPath,
  htmlPath,
  clientPath,
  readiness: readiness.status,
  weekly: weekly.status,
  clientDashboard: clientDashboard.status,
  approvedClaims: claims.length,
  missing
}, null, 2));
