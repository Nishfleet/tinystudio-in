#!/usr/bin/env node
import { execFileSync } from "node:child_process";
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { localIsoDate } from "./date-utils.mjs";

const outputArg = process.argv.find((arg) => arg.startsWith("--output="));
const htmlArg = process.argv.find((arg) => arg.startsWith("--html="));
const outputPath = outputArg ? outputArg.split("=").slice(1).join("=") : "growth-brain/ops/owned-handoff-loom-cockpit.md";
const htmlPath = htmlArg ? htmlArg.split("=").slice(1).join("=") : "growth-brain/ops/owned-handoff-loom-cockpit.html";

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

function write(path, content) {
  const dir = path.split("/").slice(0, -1).join("/");
  if (dir) mkdirSync(dir, { recursive: true });
  writeFileSync(path, `${String(content).replace(/[ \t]+$/gm, "").trimEnd()}\n`);
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

function firstDataRow(markdown, heading) {
  return tableRows(markdownSection(markdown, heading))
    .find((cells) => cells[0] && !/^(before|claim|area|field)$/i.test(cells[0]));
}

function approvedClaims(clientPath) {
  return tableRows(markdownSection(read(`${clientPath}/quality/claim-proof-ledger.md`), "Ledger"))
    .filter((cells) => cells[0] && !/^Claim$/i.test(cells[0]) && /approved/i.test(cells[4] || ""))
    .map(([claim, source, proofType, approvedBy, status]) => ({ claim, source, proofType, approvedBy, status }));
}

function clientName(clientPath) {
  const knownNames = {
    "clients/ai-converter": "AI Converter",
    "clients/siterep": "SiteRep",
    "clients/five-to-nine-0509": "Five to Nine 0509"
  };
  if (knownNames[clientPath]) return knownNames[clientPath];
  return clientPath
    .replace(/^clients\//, "")
    .split("-")
    .map((part) => (/^0509$/.test(part) ? part : part.charAt(0).toUpperCase() + part.slice(1)))
    .join(" ");
}

function evidenceFor(clientPath) {
  const evidence = read(`${clientPath}/research/owned-proof-evidence.md`);
  const row = firstDataRow(evidence, "Tangible Improvement Draft") || [];
  return {
    scope: markdownSection(evidence, "Scope").trim().split("\n").find(Boolean) || "Prove one concrete owned-startup improvement.",
    before: row[0] || "Previous state needs review.",
    after: row[1] || "Improved state needs review.",
    value: row[2] || "Client-visible value needs review.",
    nextMeasurement: row[3] || "Next measurement needs review.",
    sourceCount: tableRows(markdownSection(evidence, "Evidence Sources")).filter((cells) => cells[0] && !/^Source$/i.test(cells[0])).length
  };
}

function handoffScript(clientPath, acceptance, claims, evidence) {
  const name = clientName(clientPath);
  const claimLine = claims.length
    ? `${claims.length} approved source-backed claim(s), including: ${claims[0].claim}`
    : "no approved source-backed claims yet";
  const statusLine = acceptance.status === "ready-to-complete"
    ? "This is ready to record. The only remaining step is attaching the real handoff Loom URL."
    : `This is blocked until these items are fixed: ${(acceptance.blockers || []).join("; ")}`;

  return `# ${name} Handoff Loom Script

Generated: ${localIsoDate()}

## Guardrail

This is owned-startup proof. It proves TinyStudio delivery discipline and the tangible-improvement loop. It does not prove external market demand, paid close rate, or paid-client retention.

## Recording Goal

Show the before/after improvement in under four minutes, make the proof source visible, and end with the next measurement.

## Script

1. Open with the proof delta:
   - Before: ${evidence.before}
   - After: ${evidence.after}
2. Explain why this matters:
   - ${evidence.value}
3. Show the proof:
   - ${claimLine}
   - Evidence sources found: ${evidence.sourceCount}
4. Show what changed in the client dashboard:
   - Tangible improvement row
   - Value proof score
   - Next action
   - Missing before client-ready
5. Land the next measurement:
   - ${evidence.nextMeasurement}
6. Close with the retention question:
   - What felt valuable?
   - What felt unclear?
   - What should we improve next week?

## Acceptance Status

${statusLine}

## Complete After Real Loom

\`\`\`bash
npm run client:acceptance -- ${clientPath} --handoff-loom=LOOM_URL --reviewer="Nish"
\`\`\`
`;
}

function localLink(path) {
  return path.replaceAll(" ", "%20");
}

const rows = clients.map((clientPath) => {
  const acceptance = runJson(["scripts/review-client-acceptance.mjs", clientPath, "--dry-run"]);
  const claims = approvedClaims(clientPath);
  const evidence = evidenceFor(clientPath);
  const scriptPath = `${clientPath}/handoff-loom-script.md`;
  const script = handoffScript(clientPath, acceptance, claims, evidence);
  write(scriptPath, script);
  const status = acceptance.status === "ready-to-complete" ? "ready-to-record" : "blocked";

  return {
    clientPath,
    name: clientName(clientPath),
    status,
    scriptPath,
    dashboardPath: `${clientPath}/client-dashboard.md`,
    deliveryCockpitPath: `${clientPath}/delivery-cockpit.html`,
    completionCommand: `npm run client:acceptance -- ${clientPath} --handoff-loom=LOOM_URL --reviewer="Nish"`,
    acceptanceDryRunCommand: `npm run client:acceptance -- ${clientPath} --dry-run`,
    blockers: acceptance.blockers || [],
    claims,
    evidence
  };
});

const readyToRecord = rows.filter((row) => row.status === "ready-to-record").length;
const blocked = rows.length - readyToRecord;
const approvedClaimCount = rows.reduce((sum, row) => sum + row.claims.length, 0);

const markdown = `# Owned Handoff Loom Cockpit

Generated: ${localIsoDate()}

## Rule

This does not approve work automatically. It turns tangible improvements into reviewable handoff Loom scripts, then requires a real Loom URL before sprint acceptance can complete.

## Why This Exists

The moat is the proof delta: before, after, proof source, client-visible value, next measurement, and weekly retention question. A client should never have to trust a vague agency claim to see what changed.

## Review Dashboard

| Area | Count |
|---|---:|
| Owned startup clients | ${rows.length} |
| Ready to record | ${readyToRecord} |
| Blocked | ${blocked} |
| Approved source-backed claims | ${approvedClaimCount} |

## Handoff Queue

| Client | Status | Handoff Script | Dashboard | Acceptance Dry Run | Complete After Loom |
|---|---|---|---|---|---|
${rows.map((row) => `| ${row.clientPath} | ${row.status} | \`${row.scriptPath}\` | \`${row.dashboardPath}\` | \`${row.acceptanceDryRunCommand}\` | \`${row.completionCommand}\` |`).join("\n")}

## Client Scripts

${rows.map((row) => `### ${row.name}

- Status: ${row.status}
- Before: ${row.evidence.before}
- After: ${row.evidence.after}
- Client-visible value: ${row.evidence.value}
- Next measurement: ${row.evidence.nextMeasurement}
- Handoff script: \`${row.scriptPath}\`
- Dashboard: \`${row.dashboardPath}\`
- Delivery cockpit: \`${row.deliveryCockpitPath}\`

\`\`\`bash
${row.completionCommand}
\`\`\`
`).join("\n")}
`;

write(outputPath, markdown);

const cards = rows.map((row) => `
      <article class="card">
        <div class="meta">
          <span>${htmlEscape(row.clientPath)}</span>
          <span class="${row.status === "ready-to-record" ? "good" : "bad"}">${htmlEscape(row.status)}</span>
          <span>${row.claims.length} approved claim(s)</span>
        </div>
        <h2>${htmlEscape(row.name)}</h2>
        <dl>
          <dt>Before</dt>
          <dd>${htmlEscape(row.evidence.before)}</dd>
          <dt>After</dt>
          <dd>${htmlEscape(row.evidence.after)}</dd>
          <dt>Client-visible value</dt>
          <dd>${htmlEscape(row.evidence.value)}</dd>
          <dt>Next measurement</dt>
          <dd>${htmlEscape(row.evidence.nextMeasurement)}</dd>
        </dl>
        <div class="links">
          <a href="${htmlEscape(localLink(row.scriptPath))}">Handoff Script</a>
          <a href="${htmlEscape(localLink(row.dashboardPath))}">Client Dashboard</a>
          <a href="${htmlEscape(localLink(row.deliveryCockpitPath))}">Delivery Cockpit</a>
        </div>
        <h3>Complete After Loom</h3>
        <code>${htmlEscape(row.completionCommand)}</code>
      </article>`).join("");

const html = `<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>Owned Handoff Loom Cockpit</title>
  <style>
    body { margin: 0; font-family: Inter, ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif; background: #f7f5f0; color: #191816; }
    main { max-width: 1160px; margin: 0 auto; padding: 40px 20px 64px; }
    h1 { margin: 0 0 10px; font-size: clamp(31px, 5vw, 54px); letter-spacing: 0; }
    p { max-width: 860px; color: #4d4942; line-height: 1.55; }
    .summary { display: grid; grid-template-columns: repeat(auto-fit, minmax(160px, 1fr)); gap: 12px; margin: 28px 0; }
    .stat, .card { background: #fffdfa; border: 1px solid #ded8cc; border-radius: 8px; box-shadow: 0 1px 0 rgba(0,0,0,.03); }
    .stat { padding: 15px; }
    .stat b { display: block; font-size: 30px; }
    .stat span { color: #625d54; font-size: 13px; }
    .grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(300px, 1fr)); gap: 18px; }
    .card { padding: 20px; }
    .meta { display: flex; flex-wrap: wrap; gap: 8px; margin-bottom: 12px; }
    .meta span { border-radius: 999px; padding: 5px 9px; font-size: 12px; background: #eee8dc; }
    .meta .good { background: #dff3df; color: #155724; }
    .meta .bad { background: #ffe1dc; color: #842015; }
    h2 { margin: 0 0 16px; font-size: 22px; letter-spacing: 0; }
    h3 { margin: 18px 0 8px; font-size: 13px; text-transform: uppercase; color: #6f675a; letter-spacing: .08em; }
    dl { margin: 0; display: grid; gap: 8px; }
    dt { color: #6f675a; font-size: 12px; font-weight: 700; text-transform: uppercase; letter-spacing: .08em; }
    dd { margin: 0 0 10px; line-height: 1.5; }
    code { display: block; white-space: normal; overflow-wrap: anywhere; background: #191816; color: #fffdfa; border-radius: 6px; padding: 10px; font-size: 13px; }
    .links { display: flex; flex-wrap: wrap; gap: 10px; margin: 16px 0 0; }
    a { color: #1f4b99; font-weight: 700; text-decoration: none; }
  </style>
</head>
<body>
  <main>
    <h1>Owned Handoff Loom Cockpit</h1>
    <p>This does not approve work automatically. It makes the proof delta visible, prepares the handoff Loom, and keeps sprint acceptance blocked until a real Loom URL exists.</p>
    <section class="summary">
      <div class="stat"><b>${rows.length}</b><span>owned startup clients</span></div>
      <div class="stat"><b>${readyToRecord}</b><span>ready to record</span></div>
      <div class="stat"><b>${blocked}</b><span>blocked</span></div>
      <div class="stat"><b>${approvedClaimCount}</b><span>approved claims</span></div>
    </section>
    <section class="grid">
      ${cards}
    </section>
  </main>
</body>
</html>
`;

write(htmlPath, html);

console.log(JSON.stringify({
  status: blocked === 0 ? "ready-to-record" : "blocked",
  path: outputPath,
  htmlPath,
  clients: rows.length,
  readyToRecord,
  blocked,
  approvedClaimCount,
  rows,
  next: blocked === 0
    ? "Record the three handoff Looms, then run client:acceptance with each real Loom URL."
    : "Fix blocked client readiness items before recording handoff Looms."
}, null, 2));
