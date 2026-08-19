#!/usr/bin/env node
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { execFileSync } from "node:child_process";
import { checkProspectReadiness } from "./lib/prospect-readiness.mjs";
import { sendChannelGuidance } from "./lib/send-channel-guidance.mjs";
import { isValidLoomUrl } from "./lib/loom-url.mjs";
import { routedContactPlan, routeToChannel } from "./lib/contact-route.mjs";
import { listOutboundProspectFolders } from "./lib/outbound-prospects.mjs";
import { handleHelp, resolveOutputPath } from "./lib/operator-cli.mjs";

handleHelp(process.argv.slice(2), `Usage: node scripts/export-prospect-outbox.mjs [--limit=20] [--output=prospects/outbox.html]`);
const limitArg = process.argv.find((arg) => arg.startsWith("--limit="));
const limit = limitArg ? Number(limitArg.split("=")[1]) : 20;
const outputArg = process.argv.find((arg) => arg.startsWith("--output="));
const outputPath = resolveOutputPath(outputArg?.split("=").slice(1).join("="), { fallback: "prospects/outbox.html" });

function listFolders(root) {
  return listOutboundProspectFolders(root);
}

function read(path) {
  return existsSync(path) ? readFileSync(path, "utf8") : "";
}

function json(path) {
  return existsSync(path) ? JSON.parse(readFileSync(path, "utf8")) : {};
}

function runJson(commandArgs) {
  const output = execFileSync("node", commandArgs, {
    encoding: "utf8",
    stdio: ["ignore", "pipe", "pipe"]
  });
  return JSON.parse(output);
}

function section(markdown, heading, fallback = "") {
  const escaped = heading.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const match = markdown.match(new RegExp(`## ${escaped}\\n+([\\s\\S]*?)(?:\\n## |$)`));
  return match ? match[1].trim() : fallback;
}

function lineValue(content, pattern, fallback = "") {
  const match = content.match(pattern);
  return match && match[1].trim() ? match[1].trim() : fallback;
}

function escapeHtml(value) {
  return String(value)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function hasLoom(path) {
  const buyerRoom = read(join(path, "buyer-room.md"));
  const loomMatch = buyerRoom.match(/^- Link:[ \t]*([^\n]*)$/m);
  return Boolean(loomMatch && isValidLoomUrl(loomMatch[1].trim()));
}

function loomUrl(path) {
  const buyerRoom = read(join(path, "buyer-room.md"));
  return buyerRoom.match(/^- Link:[ \t]*([^\n]*)$/m)?.[1]?.trim() || "";
}

function hasApprovedSendPackage(path) {
  const url = loomUrl(path);
  if (!isValidLoomUrl(url)) return false;
  const sendPackage = read(join(path, "send-package.md"));
  return sendPackage.includes(`- Loom: ${url}`)
    && /- Loom quality:\s*approved/.test(sendPackage)
    && /- Readiness:\s*ready/.test(sendPackage);
}

function ensureMessage(path) {
  return runJson(["scripts/draft-prospect-message.mjs", path]);
}

function copyButton(label, value, className = "") {
  return `<button${className ? ` class="${className}"` : ""} data-copy="${escapeHtml(value)}">${escapeHtml(label)}</button>`;
}

function disabledButton(label, className = "") {
  return `<button${className ? ` class="${className}"` : ""} disabled>${escapeHtml(label)}</button>`;
}

function stageCopyButton(label, value, selectId, className = "") {
  return `<button${className ? ` class="${className}"` : ""} data-stage-copy="${escapeHtml(value)}" data-stage-for="${escapeHtml(selectId)}">${escapeHtml(label)}</button>`;
}

function stageCommand(path, channel) {
  return `npm run prospect:stage -- ${path} sent --channel ${channel}`;
}

const channelGuidance = sendChannelGuidance();
const channelOptions = channelGuidance.emailReady
  ? ["email", "contact-form", "dm", "linkedin", "x", "phone", "mixed", "other"]
  : ["contact-form", "dm", "linkedin", "x", "phone", "mixed", "other"];

function channelLabel(channel) {
  if (channel === "contact-form") return "Contact Form";
  if (channel === "dm") return "DM";
  if (channel === "linkedin") return "LinkedIn";
  if (channel === "x") return "X";
  if (channel === "phone") return "Phone";
  if (channel === "mixed") return "Mixed";
  if (channel === "other") return "Other";
  return "Email";
}

const prospects = listFolders("prospects")
  .map((path) => {
    const metadata = json(join(path, "metadata.json"));
    const pipeline = json(join(path, "pipeline.json"));
    if (["sent", "followup-1", "followup-2", "followup-3", "replied", "call-booked", "won", "lost", "paused"].includes(pipeline.stage)) return null;
    if (!hasLoom(path)) return null;
    if (!hasApprovedSendPackage(path)) return null;
    const readiness = checkProspectReadiness(path);
    ensureMessage(path);
    const message = read(join(path, "next-message.md"));
    const buyerRoom = read(join(path, "buyer-room.md"));
    const contactPlan = read(join(path, "contact-plan.md"));
    const recordingNotes = read(join(path, "recording-notes.md"));
    const contactRoute = routedContactPlan(contactPlan, { emailReady: channelGuidance.emailReady });
    return {
      path,
      name: metadata.name || path.split("/").at(-1),
      website: metadata.website || "",
      contact: metadata.contact || "",
      contactRoute: contactRoute || metadata.contact || "Run prospect:contact-plan before sending if the route is unclear.",
      status: readiness.status,
      warnings: readiness.warnings || [],
      loomUrl: lineValue(buyerRoom, /^- Link:\s*([^\n]*)$/m, ""),
      subject: section(message, "Subject"),
      body: section(message, "Body"),
      contactForm: section(message, "Contact Form Version"),
      dm: section(message, "DM Version"),
      message,
      recordingNotes: section(recordingNotes, "Quality Notes", ""),
      defaultChannel: routeToChannel(contactRoute, { emailReady: channelGuidance.emailReady })
    };
  })
  .filter(Boolean)
  .sort((a, b) => (a.status === "ready" ? 0 : 1) - (b.status === "ready" ? 0 : 1) || a.name.localeCompare(b.name))
  .slice(0, limit);

const channelButtons = (prospect) => channelGuidance.emailReady
  ? [
      copyButton("Copy Subject", prospect.subject),
      copyButton("Copy Email", prospect.body),
      copyButton("Copy Contact Form", prospect.contactForm),
      copyButton("Copy DM", prospect.dm)
    ].join("\n        ")
  : [
      copyButton("Copy Contact Form", prospect.contactForm),
      copyButton("Copy DM", prospect.dm),
      copyButton("Copy Subject", prospect.subject, "secondaryAction"),
      disabledButton("Email blocked until send setup is clean", "warningAction")
    ].join("\n        ");

function orderedStageChannels(prospect) {
  const base = channelGuidance.emailReady
    ? ["email", "contact-form", "dm", "linkedin", "x", "phone", "mixed", "other"]
    : ["contact-form", "dm", "linkedin", "x", "phone", "mixed", "other"];
  return [prospect.defaultChannel, ...base].filter((channel, index, values) => values.indexOf(channel) === index);
}

const stageButtons = (prospect, index) => orderedStageChannels(prospect)
  .map((channel) => stageCopyButton(
    `Mark Sent: ${channelLabel(channel)}`,
    stageCommand(prospect.path, channel),
    `channel-${index}`,
    channel === "email" && !channelGuidance.emailReady ? "warningAction" : ""
  ))
  .join("\n        ");

const channelNotice = `
    <section class="${channelGuidance.emailReady ? "channelReady" : "channelWarning"}">
      <strong>Recommended channel: ${escapeHtml(channelGuidance.recommendedChannel)}</strong>
      <p>${escapeHtml(channelGuidance.rule)}</p>
      ${channelGuidance.warnings.length ? `<p>Warnings: ${escapeHtml(channelGuidance.warnings.join("; "))}</p>` : ""}
    </section>
`;

const batchPanel = prospects.length ? `
    <section class="batchPanel">
      <strong>After Sending The Batch</strong>
      <p>Choose the channel actually used for each prospect, copy the sheet, then run the clipboard command.</p>
      <textarea id="batchSentSheet" readonly></textarea>
      <p class="muted" id="batchSentCount">0 sent rows selected.</p>
      <div class="batchActions">
        <button id="copyBatchSentSheet" type="button">Copy Batch Sent Sheet</button>
        <button data-copy="npm run prospect:batch-sent -- --from-clipboard">Copy Batch Sent Command</button>
      </div>
      <p class="muted">Only checked sent rows are copied. Rows include prospect, Loom URL, and channel, so follow-ups start from the right route.</p>
    </section>
` : "";

const cards = prospects.map((prospect, index) => `
    <section class="prospect">
      <div class="prospectHeader">
        <div>
          <p class="eyebrow">#${index + 1} ${escapeHtml(prospect.status)}</p>
          <h2>${escapeHtml(prospect.name)}</h2>
          <p class="meta">${escapeHtml(prospect.contactRoute)} · ${escapeHtml(prospect.loomUrl)}</p>
        </div>
        <a class="siteLink" href="${escapeHtml(prospect.website)}" target="_blank" rel="noreferrer">Open Site</a>
      </div>
      <div class="${channelGuidance.emailReady ? "routeReady" : "routeWarning"}">
        Send order: ${escapeHtml(channelGuidance.emailReady ? "use the best available route" : "contact form or DM first; use email only after sender setup is fixed")}.
      </div>
      <div class="${prospect.warnings.length ? "warning" : "ready"}">${escapeHtml(prospect.warnings.length ? prospect.warnings.join("; ") : "ready to send")}</div>
      ${prospect.recordingNotes ? `<div class="recordingNotes"><strong>Recording Notes</strong><pre>${escapeHtml(prospect.recordingNotes)}</pre></div>` : ""}
      <label class="sentCheck">
        <input type="checkbox" class="sentConfirm" data-path="${escapeHtml(prospect.path)}" data-loom="${escapeHtml(prospect.loomUrl)}" />
        <span>Sent this message</span>
      </label>
      <label class="channelLabel" for="channel-${index}">Channel actually used</label>
      <select id="channel-${index}" class="channelSelect" data-path="${escapeHtml(prospect.path)}" data-loom="${escapeHtml(prospect.loomUrl)}">
        ${channelOptions.map((channel) => `<option value="${escapeHtml(channel)}"${channel === prospect.defaultChannel ? " selected" : ""}>${escapeHtml(channel)}</option>`).join("")}
      </select>
      <div class="copyGrid">
        ${channelButtons(prospect)}
      </div>
      <div class="stageGrid">
        ${stageButtons(prospect, index)}
        <button data-row-for="channel-${index}">Copy Sent Row</button>
      </div>
      <details>
        <summary>Current Message</summary>
        <pre>${escapeHtml(prospect.message)}</pre>
      </details>
    </section>
  `).join("\n");

const emptyState = `
    <section class="empty">
      <h2>No Looms ready to send</h2>
      <p>Record from the teleprompter, run market:after-recording, then come back here.</p>
    </section>
`;

const html = `<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>TinyStudio Prospect Outbox</title>
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
      background: rgba(250, 249, 245, 0.96);
      padding: 18px 24px;
    }
    h1 {
      margin: 0;
      font-size: 24px;
      letter-spacing: 0;
    }
    .sub {
      margin: 4px 0 0;
      color: var(--muted);
      font-size: 14px;
    }
    main {
      width: min(1020px, calc(100% - 32px));
      margin: 24px auto 64px;
      display: grid;
      gap: 16px;
    }
    .workflow, .prospect, .empty, .channelWarning, .channelReady {
      border: 1px solid var(--line);
      background: var(--panel);
      border-radius: 8px;
      padding: 16px;
    }
    .channelWarning {
      border-color: #efc7be;
      background: #fff7f4;
    }
    .channelReady {
      border-color: #b9d5c8;
      background: #f4faf6;
    }
    .channelWarning p, .channelReady p {
      margin: 4px 0 0;
      color: var(--muted);
      font-size: 14px;
    }
    .workflow ol {
      margin: 8px 0 0;
      padding-left: 22px;
    }
    .prospectHeader {
      display: flex;
      justify-content: space-between;
      gap: 16px;
      align-items: start;
      margin-bottom: 14px;
    }
    .eyebrow {
      margin: 0 0 4px;
      color: var(--accent);
      font-size: 12px;
      font-weight: 700;
      text-transform: uppercase;
    }
    h2 {
      margin: 0;
      font-size: 20px;
      letter-spacing: 0;
    }
    .meta {
      margin: 4px 0 0;
      color: var(--muted);
      font-size: 14px;
    }
    .siteLink, button {
      appearance: none;
      border: 1px solid var(--line);
      border-radius: 6px;
      background: #f6f8f5;
      color: var(--ink);
      cursor: pointer;
      display: inline-flex;
      align-items: center;
      justify-content: center;
      min-height: 36px;
      padding: 8px 10px;
      font: inherit;
      font-size: 13px;
      text-decoration: none;
      white-space: nowrap;
    }
    button:hover, .siteLink:hover { border-color: var(--accent); }
    .secondaryAction { color: var(--muted); }
    .warningAction {
      border-color: #efc7be;
      background: #fff7f4;
      color: #7a281f;
    }
    .routeWarning, .routeReady {
      margin: 0 0 10px;
      color: #5d2119;
      font-size: 14px;
      font-weight: 700;
    }
    .routeReady { color: #164536; }
    .batchPanel {
      border: 1px solid var(--line);
      background: var(--panel);
      border-radius: 8px;
      padding: 16px;
    }
    .batchPanel p {
      margin: 6px 0 10px;
      color: var(--muted);
      font-size: 14px;
    }
    textarea {
      width: 100%;
      min-height: 120px;
      border: 1px solid var(--line);
      border-radius: 6px;
      background: #fbfcfb;
      color: var(--ink);
      font: inherit;
      font-size: 13px;
      padding: 10px;
      resize: vertical;
    }
    .batchActions {
      display: flex;
      flex-wrap: wrap;
      gap: 8px;
      margin-top: 8px;
    }
    .muted {
      color: var(--muted);
      font-size: 14px;
    }
    .channelLabel {
      display: block;
      margin: 0 0 6px;
      color: var(--muted);
      font-size: 13px;
      font-weight: 700;
    }
    .sentCheck {
      display: flex;
      gap: 8px;
      align-items: center;
      width: fit-content;
      margin: 0 0 10px;
      border: 1px solid var(--line);
      border-radius: 6px;
      background: #f6f8f5;
      padding: 8px 10px;
      color: var(--muted);
      font-size: 13px;
      font-weight: 700;
      cursor: pointer;
    }
    .sentCheck:has(input:checked) {
      border-color: var(--accent);
      background: #f0f7f3;
      color: #164536;
    }
    .sentCheck input {
      accent-color: var(--accent);
      margin: 0;
    }
    .channelSelect {
      width: 100%;
      min-height: 38px;
      border: 1px solid var(--line);
      border-radius: 6px;
      background: #fbfcfb;
      color: var(--ink);
      font: inherit;
      margin: 0 0 12px;
      padding: 8px 10px;
    }
    .warning, .ready {
      margin: 0 0 14px;
      border-left: 3px solid var(--warn);
      background: #fff5f2;
      padding: 10px 12px;
      color: #5d2119;
      font-size: 14px;
    }
    .ready {
      border-left-color: var(--accent);
      background: #f0f7f3;
      color: #164536;
    }
    .recordingNotes {
      border: 1px solid #cddcd4;
      border-radius: 8px;
      background: #f5fbf7;
      padding: 12px;
      margin: 0 0 14px;
    }
    .recordingNotes strong {
      display: block;
      margin-bottom: 6px;
      color: var(--accent);
      font-size: 13px;
      text-transform: uppercase;
    }
    .recordingNotes pre {
      border: 0;
      background: transparent;
      padding: 0;
      margin: 0;
    }
    .copyGrid {
      display: grid;
      grid-template-columns: repeat(4, minmax(0, 1fr));
      gap: 8px;
    }
    .stageGrid {
      display: grid;
      grid-template-columns: repeat(4, minmax(0, 1fr));
      gap: 8px;
      margin-top: 8px;
    }
    details {
      border-top: 1px solid var(--line);
      padding-top: 12px;
      margin-top: 12px;
    }
    summary {
      cursor: pointer;
      font-weight: 700;
    }
    pre {
      white-space: pre-wrap;
      overflow-wrap: anywhere;
      border: 1px solid var(--line);
      background: #fbfcfb;
      border-radius: 6px;
      padding: 12px;
      font-size: 13px;
    }
    .toast {
      position: fixed;
      right: 18px;
      bottom: 18px;
      background: var(--ink);
      color: white;
      padding: 10px 12px;
      border-radius: 6px;
      opacity: 0;
      transform: translateY(8px);
      transition: 150ms ease;
      font-size: 13px;
    }
    .toast.show {
      opacity: 1;
      transform: translateY(0);
    }
    @media (max-width: 760px) {
      .prospectHeader { flex-direction: column; }
      .copyGrid, .stageGrid { grid-template-columns: 1fr; }
      .siteLink, button { width: 100%; }
    }
  </style>
</head>
<body>
  <header>
    <h1>TinyStudio Prospect Outbox</h1>
    <p class="sub">${prospects.length} recorded Looms ready for send review.</p>
  </header>
  <main>
    <section class="workflow">
      <strong>Workflow</strong>
      <ol>
        <li>Use the recommended channel first.</li>
        <li>Copy and run the matching Mark Sent channel.</li>
        <li>Run the follow-up cockpit tomorrow.</li>
      </ol>
    </section>
    ${channelNotice}
    ${batchPanel}
    ${prospects.length ? cards : emptyState}
  </main>
  <div class="toast" id="toast">Copied</div>
  <script>
    const toast = document.getElementById("toast");
    function showToast(text) {
      toast.textContent = text;
      toast.classList.add("show");
      setTimeout(() => toast.classList.remove("show"), 1200);
    }
    for (const button of document.querySelectorAll("button[data-copy]")) {
      button.addEventListener("click", async () => {
        await navigator.clipboard.writeText(button.dataset.copy);
        showToast("Copied");
      });
    }
    const batchSheet = document.getElementById("batchSentSheet");
    const batchSentCount = document.getElementById("batchSentCount");
    const channelSelects = Array.from(document.querySelectorAll(".channelSelect"));
    const sentChecks = Array.from(document.querySelectorAll(".sentConfirm"));
    const sentStorageKey = "tinystudio-outbox-sent-confirmations";
    const storedSent = JSON.parse(localStorage.getItem(sentStorageKey) || "{}");
    function rowFor(select) {
      return select.dataset.path + "|" + select.dataset.loom + "|" + select.value;
    }
    function sentKey(input) {
      return input.dataset.path + "::" + input.dataset.loom;
    }
    function matchingSentCheck(select) {
      return sentChecks.find((input) => input.dataset.path === select.dataset.path && input.dataset.loom === select.dataset.loom);
    }
    function isSentConfirmed(select) {
      const check = matchingSentCheck(select);
      return Boolean(check && check.checked);
    }
    function saveSentChecks() {
      const next = {};
      for (const input of sentChecks) {
        if (input.checked) next[sentKey(input)] = true;
      }
      localStorage.setItem(sentStorageKey, JSON.stringify(next));
      updateBatchSheet();
    }
    function updateBatchSheet() {
      if (!batchSheet) return;
      const rows = channelSelects.filter(isSentConfirmed).map(rowFor);
      batchSheet.value = rows.join("\\n");
      if (batchSentCount) batchSentCount.textContent = rows.length + " sent row" + (rows.length === 1 ? "" : "s") + " selected.";
    }
    for (const input of sentChecks) {
      input.checked = Boolean(storedSent[sentKey(input)]);
      input.addEventListener("change", saveSentChecks);
    }
    for (const select of channelSelects) {
      select.addEventListener("change", updateBatchSheet);
    }
    updateBatchSheet();
    const copyBatch = document.getElementById("copyBatchSentSheet");
    if (copyBatch) {
      copyBatch.addEventListener("click", async () => {
        updateBatchSheet();
        if (!batchSheet.value.trim()) {
          showToast("No sent rows selected");
          return;
        }
        await navigator.clipboard.writeText(batchSheet.value);
        showToast("Copied batch sent sheet");
      });
    }
    for (const button of document.querySelectorAll("button[data-row-for]")) {
      button.addEventListener("click", async () => {
        const select = document.getElementById(button.dataset.rowFor);
        const check = matchingSentCheck(select);
        if (!isSentConfirmed(select)) {
          if (check) check.focus();
          showToast("Check sent first");
          return;
        }
        await navigator.clipboard.writeText(rowFor(select));
        showToast("Copied sent row");
      });
    }
    for (const button of document.querySelectorAll("button[data-stage-copy]")) {
      button.addEventListener("click", async () => {
        const select = document.getElementById(button.dataset.stageFor);
        const check = matchingSentCheck(select);
        if (!isSentConfirmed(select)) {
          if (check) check.focus();
          showToast("Check sent first");
          return;
        }
        await navigator.clipboard.writeText(button.dataset.stageCopy);
        showToast("Copied stage command");
      });
    }
  </script>
</body>
</html>
`;

const outputDir = outputPath.split("/").slice(0, -1).join("/");
if (outputDir) mkdirSync(outputDir, { recursive: true });
writeFileSync(outputPath, html);

console.log(JSON.stringify({
  status: "created",
  path: outputPath,
  count: prospects.length
}, null, 2));
