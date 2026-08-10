#!/usr/bin/env node
import { mkdirSync, writeFileSync } from "node:fs";
import { dirname } from "node:path";
import { agencyConfig } from "./lib/agency-config.mjs";
import { localIsoDate } from "./date-utils.mjs";
import { runRepoJson as runJson } from "./lib/runtime-roots.mjs";
import { handleHelp, resolveOutputPath } from "./lib/operator-cli.mjs";

handleHelp(process.argv.slice(2), `Usage: npm run send:guide -- [--output=growth-brain/ops/sender-setup-guide.md] [--html=growth-brain/ops/sender-setup-guide.html]`);
const outputArg = process.argv.find((arg) => arg.startsWith("--output="));
const outputPath = resolveOutputPath(outputArg?.split("=")[1], { fallback: "growth-brain/ops/sender-setup-guide.md" });
const htmlArg = process.argv.find((arg) => arg.startsWith("--html="));
const htmlPath = resolveOutputPath(htmlArg?.split("=")[1], { flag: "--html", fallback: "growth-brain/ops/sender-setup-guide.html" });
const today = localIsoDate();
const config = agencyConfig();

function write(path, content) {
  const dir = dirname(path);
  if (dir) mkdirSync(dir, { recursive: true });
  writeFileSync(path, content);
}

function escapeHtml(value) {
  return String(value)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function statusLabel(value) {
  if (["pass", "found"].includes(value)) return "ready";
  if (["warn", "missing"].includes(value)) return "needs work";
  return value || "-";
}

function checkRows(checks) {
  return checks.length
    ? checks.map((check) => `| ${check.name} | ${statusLabel(check.status)} | ${check.domain || "-"} |`).join("\n")
    : "| - | - | No DNS checks ran. |";
}

function warningRows(warnings) {
  return warnings.length
    ? warnings.map((warning) => `| ${warning.rule} | ${warning.detail} |`).join("\n")
    : "| - | No sender warnings. |";
}

function dkimCandidateRows(candidates) {
  return candidates.length
    ? candidates.map((candidate) => `| ${candidate.selector} | ${candidate.domain} |`).join("\n")
    : "| - | No common DKIM selector found in DNS yet. |";
}

const setup = runJson(["scripts/check-outbound-sender-setup.mjs"]);
const dkimCandidates = setup.dkimCandidates || [];
const firstDkimCandidate = dkimCandidates[0]?.selector || "";
const configureCommand = `npm run send:configure -- --physical-address="..." --dkim-selector=${firstDkimCandidate || "..."} --dry-run`;
const dkimHost = config.dkimSelector && setup.senderDomain
  ? `${config.dkimSelector}._domainkey.${setup.senderDomain}`
  : (firstDkimCandidate ? `${firstDkimCandidate}._domainkey.${setup.senderDomain}` : "<selector>._domainkey." + (setup.senderDomain || "tinystudio.io"));

const markdown = `# Sender Setup Guide

Generated: ${today}

Use this before cold email. Until this guide is clean, use contact forms or DMs first.

## Current Status

- Sender email: ${setup.senderEmail || "-"}
- Sender domain: ${setup.senderDomain || "-"}
- Manual daily send cap: ${setup.manualDailySendCap || "-"}
- Overall: ${statusLabel(setup.status)}

## Checks

| Check | Status | Domain |
|---|---|---|
${checkRows(setup.checks || [])}

## Warnings To Fix

| Warning | What It Means |
|---|---|
${warningRows(setup.warnings || [])}

## DKIM Discovery

| Selector | DNS Host |
|---|---|
${dkimCandidateRows(dkimCandidates)}

Suggested dry-run command:

\`\`\`bash
${configureCommand}
\`\`\`

## Fix Order

1. Add a real sender postal address to \`senderPhysicalAddress\` in \`growth-brain/ops/agency-config.json\`.
2. In the mail provider for \`${setup.senderDomain || "the sender domain"}\`, enable DKIM and copy the selector.
3. Add the selector to \`dkimSelector\` in \`growth-brain/ops/agency-config.json\`.
4. If the mail provider gives a DKIM TXT record, add it in Cloudflare DNS at \`${dkimHost}\`.
5. Run \`npm run send:setup\`.
6. If it is clean, email can join contact forms and DMs as an outbound route.

## Notes

- Do not invent the DKIM selector. Use the exact selector from the mail provider.
- If DKIM discovery finds a selector, still confirm it in the mail provider before saving it.
- For Google Workspace, the default selector is often \`google\`, but verify it in the Google Admin DKIM screen before saving it here.
- Cloudflare TXT records are the normal DNS record type for DKIM, SPF, and DMARC values.
- Keep the manual daily cap low while there is no reply data.

## Sources

- FTC CAN-SPAM business guide: https://www.ftc.gov/business-guidance/resources/can-spam-act-compliance-guide-business
- Google Workspace DKIM setup: https://support.google.com/a/answer/174124
- Cloudflare DNS TXT records: https://developers.cloudflare.com/dns/manage-dns-records/reference/dns-record-types/
`;

const checkCards = (setup.checks || []).map((check) => `
      <div class="card">
        <span>${escapeHtml(check.name)}</span>
        <strong>${escapeHtml(statusLabel(check.status))}</strong>
        <small>${escapeHtml(check.domain || "-")}</small>
      </div>
`).join("\n");

const warningCards = (setup.warnings || []).map((warning) => `
      <li><strong>${escapeHtml(warning.rule)}</strong><br>${escapeHtml(warning.detail)}</li>
`).join("\n");

const dkimCandidateCards = dkimCandidates.map((candidate) => `
      <div class="card">
        <span>${escapeHtml(candidate.selector)}</span>
        <strong>possible DKIM</strong>
        <small>${escapeHtml(candidate.domain)}</small>
      </div>
`).join("\n");

const html = `<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>TinyStudio Sender Setup Guide</title>
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
      --warn: #b43b2d;
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
      padding: 22px 24px;
      background: rgba(250, 249, 245, 0.97);
    }
    main {
      width: min(960px, calc(100% - 32px));
      margin: 24px auto 64px;
      display: grid;
      gap: 16px;
    }
    h1 { margin: 0; font-size: 28px; letter-spacing: 0; }
    h2 { margin: 0 0 10px; font-size: 18px; letter-spacing: 0; }
    .sub, small { color: var(--muted); }
    section, .card {
      border: 1px solid var(--line);
      border-radius: 8px;
      background: var(--panel);
      padding: 16px;
    }
    .status {
      border-color: ${setup.status === "pass" ? "var(--accent)" : "var(--warn)"};
    }
    .grid {
      display: grid;
      grid-template-columns: repeat(3, minmax(0, 1fr));
      gap: 10px;
    }
    .card span, .card small { display: block; }
    .card strong { display: block; margin: 6px 0; font-size: 18px; }
    code {
      background: #f4f5f1;
      border: 1px solid var(--line);
      border-radius: 4px;
      padding: 2px 5px;
    }
    li + li { margin-top: 8px; }
    a { color: var(--accent); }
    @media (max-width: 760px) {
      .grid { grid-template-columns: 1fr; }
    }
  </style>
</head>
<body>
  <header>
    <h1>Sender Setup Guide</h1>
    <p class="sub">Generated ${escapeHtml(today)} for ${escapeHtml(setup.senderEmail || config.senderEmail || "the sender")}.</p>
  </header>
  <main>
    <section class="status">
      <h2>Current Status</h2>
      <p><strong>${escapeHtml(statusLabel(setup.status))}</strong> · ${escapeHtml(setup.senderDomain || "-")} · cap ${escapeHtml(String(setup.manualDailySendCap || "-"))}/day</p>
    </section>
    <section>
      <h2>DNS Checks</h2>
      <div class="grid">${checkCards || "<p>No DNS checks ran.</p>"}</div>
    </section>
    <section>
      <h2>Fix First</h2>
      <ol>${warningCards || "<li>No sender warnings.</li>"}</ol>
    </section>
    <section>
      <h2>DKIM Discovery</h2>
      <div class="grid">${dkimCandidateCards || "<p>No common DKIM selector found in DNS yet.</p>"}</div>
      <p><code>${escapeHtml(configureCommand)}</code></p>
    </section>
    <section>
      <h2>Order</h2>
      <ol>
        <li>Add the sender postal address in <code>agency-config.json</code>.</li>
        <li>Enable DKIM in the mail provider and copy the selector.</li>
        <li>Save the selector as <code>dkimSelector</code>.</li>
        <li>Add the DKIM TXT record in Cloudflare if the provider gives one.</li>
        <li>Run <code>npm run send:setup</code>.</li>
      </ol>
    </section>
    <section>
      <h2>Sources</h2>
      <p><a href="https://www.ftc.gov/business-guidance/resources/can-spam-act-compliance-guide-business">FTC CAN-SPAM guide</a> · <a href="https://support.google.com/a/answer/174124">Google DKIM setup</a> · <a href="https://developers.cloudflare.com/dns/manage-dns-records/reference/dns-record-types/">Cloudflare TXT records</a></p>
    </section>
  </main>
</body>
</html>
`;

write(outputPath, markdown);
write(htmlPath, html);

console.log(JSON.stringify({
  status: "created",
  path: outputPath,
  htmlPath,
  senderStatus: setup.status,
  warnings: setup.warnings || []
}, null, 2));
