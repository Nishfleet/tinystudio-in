#!/usr/bin/env node
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { listOutboundProspectFolders } from "./lib/outbound-prospects.mjs";
import { execFileSync } from "node:child_process";
import { localIsoDate } from "./date-utils.mjs";
import { sendChannelGuidance } from "./lib/send-channel-guidance.mjs";
import { handleHelp, resolveOutputPath } from "./lib/operator-cli.mjs";

handleHelp(process.argv.slice(2), `Usage: node scripts/export-followup-cockpit.mjs [--limit=10] [--output=prospects/followup-cockpit.html] [--date=YYYY-MM-DD]`);
const limitArg = process.argv.find((arg) => arg.startsWith("--limit="));
const limit = limitArg ? Number(limitArg.split("=")[1]) : 10;
const outputArg = process.argv.find((arg) => arg.startsWith("--output="));
const outputPath = resolveOutputPath(outputArg?.split("=").slice(1).join("="), { fallback: "prospects/followup-cockpit.html" });
const dateArg = process.argv.find((arg) => arg.startsWith("--date="));
const today = dateArg ? dateArg.split("=")[1] : localIsoDate();

function listFolders(root) {
  return listOutboundProspectFolders(root);
}

function read(path) {
  return existsSync(path) ? readFileSync(path, "utf8") : "";
}

function json(path) {
  return existsSync(path) ? JSON.parse(readFileSync(path, "utf8")) : {};
}

function section(markdown, heading, fallback = "") {
  const escaped = heading.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const match = markdown.match(new RegExp(`## ${escaped}\\n+([\\s\\S]*?)(?:\\n## |$)`));
  return match ? match[1].trim() : fallback;
}

function escapeHtml(value) {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function nextDueFollowUp(pipeline) {
  if (!pipeline.nextFollowUpAt || pipeline.nextFollowUpAt > today) return null;
  return (pipeline.followUps || []).find((followUp) => followUp.status !== "sent" && followUp.dueAt === pipeline.nextFollowUpAt) || null;
}

function followUpAction(step) {
  if (step === "day-2") return "followup-1";
  if (step === "day-5") return "followup-2";
  if (step === "day-10") return "followup-3";
  return "";
}

function copyButton(label, value, className = "") {
  return `<button${className ? ` class="${className}"` : ""} data-copy="${escapeHtml(value)}">${escapeHtml(label)}</button>`;
}

function disabledButton(label, className = "") {
  return `<button${className ? ` class="${className}"` : ""} disabled>${escapeHtml(label)}</button>`;
}

function stageCopyButton(label, value, confirmId, className = "") {
  return `<button${className ? ` class="${className}"` : ""} data-stage-copy="${escapeHtml(value)}" data-confirm-for="${escapeHtml(confirmId)}">${escapeHtml(label)}</button>`;
}

function stageCommand(path, action, channel) {
  return `npm run prospect:stage -- ${path} ${action} --channel ${channel}`;
}

const validStageChannels = new Set(["email", "contact-form", "dm", "linkedin", "x", "phone", "mixed", "other"]);

function preferredStageChannel(prospect) {
  if (prospect.lastChannel && validStageChannels.has(prospect.lastChannel)) return prospect.lastChannel;
  return channelGuidance.emailReady ? "email" : "contact-form";
}

function ensureMessage(path) {
  execFileSync("node", ["scripts/draft-prospect-message.mjs", path], {
    encoding: "utf8",
    stdio: ["ignore", "pipe", "pipe"]
  });
}

const channelGuidance = sendChannelGuidance();

const prospects = listFolders("prospects")
  .map((path) => {
    const metadata = json(join(path, "metadata.json"));
    const pipeline = json(join(path, "pipeline.json"));
    const due = nextDueFollowUp(pipeline);
    if (!due || ["won", "lost", "paused", "replied", "call-booked"].includes(pipeline.stage)) return null;
    ensureMessage(path);
    const message = read(join(path, "next-message.md"));
    const action = followUpAction(due.step);
    return {
      path,
      name: metadata.name || path.split("/").at(-1),
      website: metadata.website || "",
      contact: metadata.contact || "",
      stage: pipeline.stage || "",
      sentChannel: pipeline.sentChannel || "",
      lastChannel: pipeline.lastChannel || pipeline.sentChannel || "",
      dueAt: due.dueAt,
      step: due.step,
      subject: section(message, "Subject"),
      body: section(message, "Body"),
      contactForm: section(message, "Contact Form Version"),
      dm: section(message, "DM Version"),
      action,
      message
    };
  })
  .filter(Boolean)
  .sort((a, b) => a.dueAt.localeCompare(b.dueAt) || a.name.localeCompare(b.name))
  .slice(0, limit);

const messageButtons = (prospect) => {
  const buttons = channelGuidance.emailReady
    ? [
        copyButton("Copy Subject", prospect.subject),
        copyButton("Copy Email", prospect.body),
        copyButton("Copy Contact Form", prospect.contactForm),
        copyButton("Copy DM", prospect.dm)
      ]
    : [
        copyButton("Copy Contact Form", prospect.contactForm),
        copyButton("Copy DM", prospect.dm),
        copyButton("Copy Subject", prospect.subject, "secondaryAction"),
        disabledButton("Email blocked until send setup is clean", "warningAction")
      ];
  return buttons.join("\n        ");
};

const stageButtons = (prospect, confirmId) => {
  if (!prospect.action) return "";
  const preferred = preferredStageChannel(prospect);
  const base = channelGuidance.emailReady
    ? ["email", "contact-form", "dm", "linkedin", "x", "phone", "mixed", "other"]
    : ["contact-form", "dm", "linkedin", "x", "phone", "mixed", "other"];
  const channels = [preferred, ...base].filter((channel, index, values) => values.indexOf(channel) === index);
  return channels
    .map((channel) => stageCopyButton(`Mark Follow-Up: ${channel}`, stageCommand(prospect.path, prospect.action, channel), confirmId, channel === "email" && !channelGuidance.emailReady ? "warningAction" : ""))
    .join("\n        ");
};

const cards = prospects.map((prospect, index) => {
  const confirmId = `followup-sent-${index}`;
  return `
    <section class="prospect">
      <div class="prospectHeader">
        <div>
          <p class="eyebrow">#${index + 1} ${escapeHtml(prospect.step)} due ${escapeHtml(prospect.dueAt)}</p>
          <h2>${escapeHtml(prospect.name)}</h2>
          <p class="meta">${escapeHtml(prospect.contact || "contact unknown")} · ${escapeHtml(prospect.stage)} · last channel: ${escapeHtml(prospect.lastChannel || "unknown")}</p>
        </div>
        <a class="siteLink" href="${escapeHtml(prospect.website)}" target="_blank" rel="noreferrer">Open Site</a>
      </div>
      <div class="copyGrid">
        ${messageButtons(prospect)}
      </div>
      <label class="followupCheck" for="${confirmId}">
        <input type="checkbox" id="${confirmId}" class="followupConfirm" />
        <span>Sent this follow-up</span>
      </label>
      <div class="stageGrid">
        ${stageButtons(prospect, confirmId)}
      </div>
      <details>
        <summary>Current Message</summary>
        <pre>${escapeHtml(prospect.message)}</pre>
      </details>
    </section>
  `;
}).join("\n");

const emptyState = `
    <section class="empty">
      <h2>No follow-ups due</h2>
      <p>Keep recording and sending Looms. Due follow-ups will appear here after prospects are marked sent.</p>
    </section>
`;

const html = `<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>TinyStudio Follow-Up Cockpit</title>
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
    .workflow, .prospect, .empty {
      border: 1px solid var(--line);
      background: var(--panel);
      border-radius: 8px;
      padding: 16px;
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
    .followupCheck {
      display: flex;
      align-items: center;
      gap: 8px;
      width: fit-content;
      margin-top: 10px;
      border: 1px solid var(--line);
      border-radius: 6px;
      padding: 8px 10px;
      color: var(--muted);
      font-size: 13px;
      cursor: pointer;
    }
    .followupCheck:has(input:checked) {
      border-color: var(--accent);
      color: var(--ink);
      background: #f3faf6;
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
      .followupCheck { width: 100%; }
    }
  </style>
</head>
<body>
  <header>
    <h1>TinyStudio Follow-Up Cockpit</h1>
    <p class="sub">${prospects.length} due follow-ups for ${escapeHtml(today)}.</p>
  </header>
  <main>
    <section class="workflow">
      <strong>Workflow</strong>
      <ol>
        <li>Start with the last working channel when available.</li>
        <li>Copy and run the matching follow-up channel command.</li>
        <li>If they reply, mark replied and run sales call prep.</li>
      </ol>
    </section>
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
    for (const button of document.querySelectorAll("button[data-stage-copy]")) {
      button.addEventListener("click", async () => {
        const confirm = document.getElementById(button.dataset.confirmFor);
        if (!confirm || !confirm.checked) {
          if (confirm) confirm.focus();
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
  date: today,
  count: prospects.length
}, null, 2));
