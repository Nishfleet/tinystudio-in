#!/usr/bin/env node
import { execFileSync } from "node:child_process";
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { localIsoDate } from "./date-utils.mjs";

const outputArg = process.argv.find((arg) => arg.startsWith("--output="));
const outputPath = outputArg ? outputArg.split("=").slice(1).join("=") : "growth-brain/ops/owned-proof-review.md";
const htmlArg = process.argv.find((arg) => arg.startsWith("--html="));
const defaultHtmlPath = "growth-brain/ops/owned-proof-review.html";
const htmlPath = htmlArg ? htmlArg.split("=").slice(1).join("=") : defaultHtmlPath;

const clients = [
  "clients/ai-converter",
  "clients/siterep",
  "clients/five-to-nine-0509"
];

function runJson(commandArgs) {
  const output = execFileSync("node", commandArgs, {
    encoding: "utf8",
    stdio: ["ignore", "pipe", "pipe"]
  });
  return JSON.parse(output);
}

function read(path) {
  return existsSync(path) ? readFileSync(path, "utf8") : "";
}

function htmlEscape(value) {
  return String(value || "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;");
}

function tableRows(markdown) {
  return String(markdown || "")
    .split("\n")
    .map((line) => line.trim())
    .filter((line) => line.startsWith("|") && line.endsWith("|"))
    .map((line) => line.split("|").slice(1, -1).map((cell) => cell.trim()))
    .filter((cells) => cells.some(Boolean) && !cells.every((cell) => /^:?-+:?$/.test(cell)));
}

function markdownSection(markdown, heading) {
  const lines = String(markdown || "").split("\n");
  const start = lines.findIndex((line) => line.trim() === `## ${heading}`);
  if (start === -1) return "";
  const end = lines.findIndex((line, index) => index > start && /^##\s+/.test(line.trim()));
  return lines.slice(start + 1, end === -1 ? undefined : end).join("\n");
}

function sourceNotes(clientPath) {
  const evidence = read(`${clientPath}/research/owned-proof-evidence.md`);
  return new Map(tableRows(markdownSection(evidence, "Evidence Sources"))
    .filter((cells) => cells[0] && !/^Source$/i.test(cells[0]))
    .map(([source, status, notes]) => [source, { status, notes }]));
}

function tangibleImprovementRows(clientPath) {
  const evidence = read(`${clientPath}/research/owned-proof-evidence.md`);
  return tableRows(markdownSection(evidence, "Tangible Improvement Draft"))
    .filter((cells) => cells[0] && !/^Before$/i.test(cells[0]))
    .map(([before, after, clientVisibleValue, nextMeasurement]) => ({
      clientPath,
      before,
      after,
      clientVisibleValue,
      nextMeasurement,
      externalUse: "internal/owned proof only until external paid-client proof exists"
    }));
}

function evidenceSummary(clientPath, sourceList) {
  const notes = sourceNotes(clientPath);
  return String(sourceList || "")
    .split(";")
    .map((source) => source.trim())
    .filter(Boolean)
    .slice(0, 3)
    .map((source) => {
      const match = notes.get(source);
      return {
        source,
        status: match?.status || "source-needs-review",
        notes: match?.notes || "No evidence snippet found in owned proof packet."
      };
    });
}

const results = clients.map((clientPath) => runJson([
  "scripts/review-client-proof.mjs",
  clientPath,
  "--dry-run"
]));

const pendingCount = results.reduce((sum, result) => sum + result.pendingCount, 0);
const approvedCount = results.reduce((sum, result) => sum + result.approvedCount, 0);
const sourceReadyCount = results.reduce((sum, result) => sum + result.sourceReadyCount, 0);
const claimCount = results.reduce((sum, result) => sum + result.claims.length, 0);
const readyCount = results.filter((result) => result.readiness.status === "ready").length;
const tangibleRows = clients.flatMap(tangibleImprovementRows);
const rows = results.flatMap((result) => result.claims.map((claim) => ({
  clientPath: result.clientPath,
  index: claim.index,
  claim: claim.claim,
  sourceStatus: claim.sourceStatus,
  status: claim.status,
  sourceReady: claim.sourceReady,
  evidence: evidenceSummary(result.clientPath, claim.source),
  dryRunApproveCommand: `npm run client:proof-review -- ${result.clientPath} --approve=${claim.index} --reviewer="Nish" --dry-run`,
  applyApproveCommand: `npm run client:proof-review -- ${result.clientPath} --approve=${claim.index} --reviewer="Nish"`,
  dryRunRemoveCommand: `npm run client:proof-review -- ${result.clientPath} --remove=${claim.index} --reviewer="Nish" --dry-run`,
  applyRemoveCommand: `npm run client:proof-review -- ${result.clientPath} --remove=${claim.index} --reviewer="Nish"`
})));

const clientCommandRows = results.map((result) => ({
  clientPath: result.clientPath,
  pendingCount: result.pendingCount,
  sourceReadyCount: result.sourceReadyCount,
  readinessStatus: result.readiness.status,
  bulkDryRunCommand: `npm run client:proof-review -- ${result.clientPath} --approve=all --reviewer="Nish" --dry-run`,
  bulkApplyCommand: `npm run client:proof-review -- ${result.clientPath} --approve=all --reviewer="Nish"`,
  acceptanceDryRunCommand: `npm run client:acceptance -- ${result.clientPath} --dry-run`,
  handoffCockpitCommand: "node scripts/export-owned-handoff-loom-cockpit.mjs"
}));

function write(path, content) {
  const dir = path.split("/").slice(0, -1).join("/");
  if (dir) mkdirSync(dir, { recursive: true });
  writeFileSync(path, `${String(content).replace(/[ \t]+$/gm, "").trimEnd()}\n`);
}

const markdown = `# Owned Startup Proof Review

Generated: ${localIsoDate()}

## Rule

Approve only claims with found or confirmed source evidence. Owned-startup proof can prove TinyStudio delivery discipline, but it still does not prove external demand, paid close rate, or paid-client retention.

## Summary

| Area | Count |
|---|---:|
| Clients | ${results.length} |
| Claims | ${claimCount} |
| Source-ready claims | ${sourceReadyCount} |
| Approved claims | ${approvedCount} |
| Pending claims | ${pendingCount} |
| Client folders ready | ${readyCount} |
| Tangible improvement rows | ${tangibleRows.length} |

## Tangible Improvement Review

This is the wedge: every client should see a concrete before/after movement, the value it created, and the next measurement. These owned-startup rows prove TinyStudio delivery discipline only; do not use them as external paid-client proof yet.

| Client | Before | After | Client-Visible Value | Next Measurement | Use Externally? |
|---|---|---|---|---|---|
${tangibleRows.map((row) => `| ${row.clientPath} | ${row.before} | ${row.after} | ${row.clientVisibleValue} | ${row.nextMeasurement} | ${row.externalUse} |`).join("\n")}

## Claim Review Queue

| Client | # | Source Status | Current Status | Claim | Source Evidence | Dry-Run Approval Command | Dry-Run Remove Command |
|---|---:|---|---|---|---|---|---|
${rows.map((row) => `| ${row.clientPath} | ${row.index} | ${row.sourceStatus} | ${row.status} | ${row.claim} | ${row.evidence.map((item) => `${item.source}: ${item.status}`).join("<br>")} | \`${row.dryRunApproveCommand}\` | \`${row.dryRunRemoveCommand}\` |`).join("\n")}

## Bulk Review Commands

Use these only after checking the source snippets. They are shortcuts for source-ready owned proof, not permission to approve weak claims.

| Client | Source-Ready | Pending | Readiness | Bulk Dry Run | Apply After Review | Acceptance Dry Run | Handoff Cockpit |
|---|---:|---:|---|---|---|---|---|
${clientCommandRows.map((row) => `| ${row.clientPath} | ${row.sourceReadyCount} | ${row.pendingCount} | ${row.readinessStatus} | \`${row.bulkDryRunCommand}\` | \`${row.bulkApplyCommand}\` | \`${row.acceptanceDryRunCommand}\` | \`${row.handoffCockpitCommand}\` |`).join("\n")}

## Next

1. Run each dry-run approval command, or the bulk dry-run command, for the claims Nish believes are true.
2. Remove or rewrite any claim that feels too broad.
3. Apply approvals without \`--dry-run\` only after reviewing the evidence.
4. Run \`npm run client:acceptance -- clients/client-slug --dry-run\` before final handoff.
5. Run \`node scripts/export-owned-handoff-loom-cockpit.mjs\` to record the tangible-improvement handoff Looms.
`;

write(outputPath, markdown);

const tangibleHtml = tangibleRows.map((row) => `
      <article class="card improvement-card">
        <div class="meta">
          <span>${htmlEscape(row.clientPath)}</span>
          <span>Use Externally: owned proof only</span>
        </div>
        <h2>Tangible Improvement</h2>
        <dl>
          <dt>Before</dt>
          <dd>${htmlEscape(row.before)}</dd>
          <dt>After</dt>
          <dd>${htmlEscape(row.after)}</dd>
          <dt>Client-Visible Value</dt>
          <dd>${htmlEscape(row.clientVisibleValue)}</dd>
          <dt>Next Measurement</dt>
          <dd>${htmlEscape(row.nextMeasurement)}</dd>
        </dl>
      </article>`).join("");

const cardHtml = rows.map((row) => `
      <article class="card">
        <div class="meta">
          <span>${htmlEscape(row.clientPath)}</span>
          <span>Claim #${row.index}</span>
          <span class="${row.sourceReady ? "good" : "bad"}">${htmlEscape(row.sourceStatus)}</span>
          <span>${htmlEscape(row.status)}</span>
        </div>
        <h2>${htmlEscape(row.claim)}</h2>
        <h3>Source Evidence</h3>
        <ul>
          ${row.evidence.map((item) => `<li><b>${htmlEscape(item.source)}</b> <span class="${item.status === "found" ? "good" : "warn"}">${htmlEscape(item.status)}</span><p>${htmlEscape(item.notes)}</p></li>`).join("")}
        </ul>
        <h3>Decision Commands</h3>
        <div class="commands">
          <code>${htmlEscape(row.dryRunApproveCommand)}</code>
          <code>${htmlEscape(row.applyApproveCommand)}</code>
          <code>${htmlEscape(row.dryRunRemoveCommand)}</code>
          <code>${htmlEscape(row.applyRemoveCommand)}</code>
        </div>
      </article>`).join("");

const html = `<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>Owned Startup Proof Review</title>
  <style>
    body { margin: 0; font-family: Inter, ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif; background: #f7f5f0; color: #191816; }
    main { max-width: 1120px; margin: 0 auto; padding: 40px 20px 64px; }
    h1 { font-size: clamp(30px, 5vw, 54px); margin: 0 0 12px; letter-spacing: 0; }
    p { color: #4d4942; line-height: 1.55; }
    .summary { display: grid; grid-template-columns: repeat(auto-fit, minmax(140px, 1fr)); gap: 12px; margin: 28px 0; }
    .stat, .card { background: #fffdfa; border: 1px solid #ded8cc; border-radius: 8px; box-shadow: 0 1px 0 rgba(0,0,0,.03); }
    .stat { padding: 14px; }
    .stat b { display: block; font-size: 28px; }
    .stat span { color: #625d54; font-size: 13px; }
    .grid { display: grid; gap: 18px; }
    .card { padding: 20px; }
    .meta { display: flex; flex-wrap: wrap; gap: 8px; margin-bottom: 12px; }
    .meta span, .good, .warn, .bad { border-radius: 999px; padding: 5px 9px; font-size: 12px; background: #eee8dc; }
    .good { background: #dff3df; color: #155724; }
    .warn { background: #fff0c2; color: #6d4d00; }
    .bad { background: #ffe1dc; color: #842015; }
    h2 { font-size: 21px; margin: 0 0 18px; letter-spacing: 0; }
    h3 { margin: 18px 0 8px; font-size: 13px; text-transform: uppercase; color: #6f675a; letter-spacing: .08em; }
    ul { margin: 0; padding-left: 20px; }
    li { margin-bottom: 12px; }
    li p { margin: 5px 0 0; }
    .commands { display: grid; gap: 8px; }
    code { display: block; white-space: normal; overflow-wrap: anywhere; background: #191816; color: #fffdfa; border-radius: 6px; padding: 10px; font-size: 13px; }
    dl { display: grid; gap: 8px; margin: 0; }
    dt { color: #6f675a; font-size: 12px; font-weight: 700; text-transform: uppercase; letter-spacing: .08em; }
    dd { margin: 0 0 10px; color: #292622; line-height: 1.5; }
    .improvement-card { border-color: #c9b99d; }
  </style>
</head>
<body>
  <main>
    <h1>Owned Startup Proof Review</h1>
    <p>Approve only claims that are true and useful. This cockpit shows the source evidence and gives dry-run/apply commands, but it does not approve anything automatically.</p>
    <section class="summary">
      <div class="stat"><b>${results.length}</b><span>clients</span></div>
      <div class="stat"><b>${claimCount}</b><span>claims</span></div>
      <div class="stat"><b>${sourceReadyCount}</b><span>source-ready</span></div>
      <div class="stat"><b>${approvedCount}</b><span>approved</span></div>
      <div class="stat"><b>${pendingCount}</b><span>pending</span></div>
      <div class="stat"><b>${readyCount}</b><span>ready clients</span></div>
      <div class="stat"><b>${tangibleRows.length}</b><span>tangible rows</span></div>
    </section>
    <section class="grid">
      ${tangibleHtml}
    </section>
    <section class="grid">
      ${clientCommandRows.map((row) => `
      <article class="card">
        <div class="meta">
          <span>${htmlEscape(row.clientPath)}</span>
          <span>${row.sourceReadyCount} source-ready</span>
          <span>${row.pendingCount} pending</span>
          <span>${htmlEscape(row.readinessStatus)}</span>
        </div>
        <h2>Bulk Review Commands</h2>
        <p>Use the dry run first. Apply only after checking the source snippets.</p>
        <div class="commands">
          <code>${htmlEscape(row.bulkDryRunCommand)}</code>
          <code>${htmlEscape(row.bulkApplyCommand)}</code>
          <code>${htmlEscape(row.acceptanceDryRunCommand)}</code>
          <code>${htmlEscape(row.handoffCockpitCommand)}</code>
        </div>
      </article>`).join("")}
    </section>
    <section class="grid">
      ${cardHtml}
    </section>
  </main>
</body>
</html>
`;

write(htmlPath, html);

console.log(JSON.stringify({
  status: pendingCount === 0 && readyCount === results.length ? "ready" : "review-needed",
  path: outputPath,
  htmlPath,
  clients: results.length,
  readyCount,
  approvedCount,
  pendingCount,
  sourceReadyCount,
  claimCount,
  tangibleImprovementRows: tangibleRows.length,
  results,
  next: pendingCount > 0
    ? "Review each client's candidate claims, then run client:proof-review with explicit --approve or --remove flags."
    : "Proof claims are reviewed. Fix any remaining readiness warnings before handoff."
}, null, 2));
