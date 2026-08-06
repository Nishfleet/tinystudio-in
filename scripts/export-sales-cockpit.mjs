#!/usr/bin/env node
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { localIsoDate } from "./date-utils.mjs";
import { agencyConfig } from "./lib/agency-config.mjs";
import { listOutboundProspectFolders } from "./lib/outbound-prospects.mjs";

const limitArg = process.argv.find((arg) => arg.startsWith("--limit="));
const limit = limitArg ? Number(limitArg.split("=")[1]) : 20;
const outputArg = process.argv.find((arg) => arg.startsWith("--output="));
const outputPath = outputArg ? outputArg.split("=")[1] : "prospects/sales-cockpit.html";
const today = localIsoDate();
const config = agencyConfig();

function listFolders(root) {
  return listOutboundProspectFolders(root);
}

function read(path) {
  if (!existsSync(path)) return "";
  try {
    return readFileSync(path, "utf8");
  } catch {
    return "";
  }
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
  return String(value)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function copyButton(label, value, className = "") {
  return `<button${className ? ` class="${className}"` : ""} data-copy="${escapeHtml(value)}">${escapeHtml(label)}</button>`;
}

function confirmedCopyButton(label, value, confirmId, className = "") {
  return `<button${className ? ` class="${className}"` : ""} data-confirmed-copy="${escapeHtml(value)}" data-confirm-for="${escapeHtml(confirmId)}">${escapeHtml(label)}</button>`;
}

function lostCopyButton(path, confirmId, reasonId) {
  const template = `npm run prospect:stage -- ${path} lost --note "__LOSS_REASON__"`;
  return `<button class="dangerAction" data-lost-copy="${escapeHtml(template)}" data-confirm-for="${escapeHtml(confirmId)}" data-reason-for="${escapeHtml(reasonId)}">Mark Lost</button>`;
}

function stageWeight(stage) {
  if (stage === "replied") return 0;
  if (stage === "call-booked") return 1;
  if (stage === "won") return 2;
  return 9;
}

function packageSummary(prospectPath, stage) {
  if (stage === "replied") {
    const reply = read(join(prospectPath, "reply-package.md"));
    return {
      title: "Reply Package",
      subject: section(reply, "Reply Subject", "Run reply prep to generate the reply package."),
      body: section(reply, "Reply Body", "Run reply prep, then send the call-booking reply."),
      packagePath: join(prospectPath, "reply-package.md")
    };
  }

  if (stage === "call-booked") {
    const booked = read(join(prospectPath, "call-booked-package.md"));
    const close = read(join(prospectPath, "close-package.md"));
    return {
      title: "Call / Close Package",
      subject: section(booked, "Confirmation Subject", "Run call-booked prep if the confirmation package is missing."),
      body: section(close, "Follow-Up Body", section(booked, "Confirmation Body", "After the call, run close prep.")),
      packagePath: close ? join(prospectPath, "close-package.md") : join(prospectPath, "call-booked-package.md")
    };
  }

  return {
    title: "Approved Sprint",
    subject: "Import consented application",
    body: "Use the client's consented sprint application. The human fit decision and paid Day 0 create the canonical client record and scaffold.",
    packagePath: join(prospectPath, "close-package.md")
  };
}

const prospects = listFolders("prospects")
  .map((path) => {
    const metadata = json(join(path, "metadata.json"));
    const pipeline = json(join(path, "pipeline.json"));
    const stage = pipeline.stage || "new";
    if (!["replied", "call-booked", "won"].includes(stage)) return null;
    return {
      path,
      name: metadata.name || path.split("/").at(-1),
      website: metadata.website || "",
      contact: metadata.contact || "",
      stage,
      notes: Array.isArray(pipeline.notes) ? pipeline.notes : [],
      ...packageSummary(path, stage)
    };
  })
  .filter(Boolean)
  .sort((a, b) => stageWeight(a.stage) - stageWeight(b.stage) || a.name.localeCompare(b.name))
  .slice(0, limit);

const cards = prospects.map((prospect, index) => {
  const confirmId = `sales-confirm-${index}`;
  const replyPrep = `npm run prospect:reply-prep -- ${prospect.path}`;
  const callBooked = `npm run prospect:call-booked-prep -- ${prospect.path} --time "add call time" --meeting "${config.meetingPlaceholder}"`;
  const closePrep = `npm run prospect:close-prep -- ${prospect.path} --price "${config.founderSprintPrice}"`;
  const importApplication = "npm run service:import -- /path/to/consented-sprint-application.json";
  const lossReasonId = `loss-reason-${index}`;
  const lastNote = prospect.notes.at(-1);
  const needsLossReason = ["replied", "call-booked"].includes(prospect.stage);
  const confirmationLabel = prospect.stage === "won"
    ? "Approval confirmed"
    : prospect.stage === "call-booked"
      ? "Call outcome confirmed"
      : "Call booked or loss confirmed";
  const normalButtons = [
    copyButton("Copy Subject", prospect.subject),
    copyButton("Copy Body", prospect.body)
  ];
  const actionButtons = [];

  if (prospect.stage === "replied") {
    actionButtons.push(copyButton("Reply Prep", replyPrep));
    actionButtons.push(confirmedCopyButton("Call Booked", callBooked, confirmId));
    actionButtons.push(lostCopyButton(prospect.path, confirmId, lossReasonId));
  } else if (prospect.stage === "call-booked") {
    actionButtons.push(copyButton("Refresh Call Package", callBooked));
    actionButtons.push(copyButton("Close Prep", closePrep));
    actionButtons.push(lostCopyButton(prospect.path, confirmId, lossReasonId));
  } else if (prospect.stage === "won") {
    actionButtons.push(confirmedCopyButton("Import Application", importApplication, confirmId));
  }

  return `
    <section class="prospect">
      <div class="prospectHeader">
        <div>
          <p class="eyebrow">#${index + 1} ${escapeHtml(prospect.stage)}</p>
          <h2>${escapeHtml(prospect.name)}</h2>
          <p class="meta">${escapeHtml(prospect.contact || "contact unknown")}${lastNote ? ` · ${escapeHtml(lastNote.note || "")}` : ""}</p>
        </div>
        <a class="siteLink" href="${escapeHtml(prospect.website)}" target="_blank" rel="noreferrer">Open Site</a>
      </div>
      <div class="copyGrid">
        ${normalButtons.join("\n        ")}
        ${actionButtons.join("\n        ")}
      </div>
      <label class="salesConfirm" for="${confirmId}">
        <input type="checkbox" id="${confirmId}" />
        <span>${confirmationLabel}</span>
      </label>
      ${needsLossReason ? `<label class="lossReason" for="${lossReasonId}">
        <span>Loss reason</span>
        <textarea id="${lossReasonId}" placeholder="Example: Timing is wrong, no budget, wrong buyer, not enough pain, competitor locked in."></textarea>
      </label>` : ""}
      <details open>
        <summary>${escapeHtml(prospect.title)}</summary>
        <pre>${escapeHtml(read(prospect.packagePath) || "Package not generated yet. Copy the relevant command above.")}</pre>
      </details>
    </section>
  `;
}).join("\n");

const emptyState = `
    <section class="empty">
      <h2>No active sales conversations</h2>
      <p>Replies and booked calls will appear here after a prospect is marked replied or call-booked.</p>
    </section>
`;

const html = `<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>TinyStudio Sales Cockpit</title>
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
    .sub, .meta {
      color: var(--muted);
      font-size: 14px;
    }
    main {
      width: min(1100px, calc(100% - 32px));
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
    .dangerAction {
      border-color: #efc7be;
      background: #fff7f4;
      color: #7a281f;
    }
    .copyGrid {
      display: grid;
      grid-template-columns: repeat(5, minmax(0, 1fr));
      gap: 8px;
    }
    .salesConfirm {
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
    .salesConfirm:has(input:checked) {
      border-color: var(--accent);
      color: var(--ink);
      background: #f3faf6;
    }
    .lossReason {
      display: grid;
      gap: 6px;
      margin-top: 10px;
      color: var(--muted);
      font-size: 13px;
      font-weight: 700;
    }
    .lossReason textarea {
      min-height: 74px;
      border: 1px solid var(--line);
      border-radius: 6px;
      background: #fbfcfb;
      color: var(--ink);
      font: inherit;
      font-size: 14px;
      padding: 9px;
      resize: vertical;
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
    @media (max-width: 920px) {
      .prospectHeader { flex-direction: column; }
      .copyGrid { grid-template-columns: 1fr; }
      .siteLink, button { width: 100%; }
      .salesConfirm { width: 100%; }
    }
  </style>
</head>
<body>
  <header>
    <h1>TinyStudio Sales Cockpit</h1>
    <p class="sub">${prospects.length} active sales conversations for ${escapeHtml(today)}.</p>
  </header>
  <main>
    <section class="workflow">
      <strong>Workflow</strong>
      <ol>
        <li>Reply with the smallest next step: book the sprint call.</li>
        <li>After a booked call, send confirmation and keep the call scoped.</li>
        <li>After the call, send the close package or mark lost.</li>
        <li>After a close, import the consented application; fresh human fit approval, payment, and recorded Day 0 create the client record.</li>
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
    for (const button of document.querySelectorAll("button[data-confirmed-copy]")) {
      button.addEventListener("click", async () => {
        const confirm = document.getElementById(button.dataset.confirmFor);
        if (!confirm || !confirm.checked) {
          if (confirm) confirm.focus();
          showToast("Check confirmation first");
          return;
        }
        await navigator.clipboard.writeText(button.dataset.confirmedCopy);
        showToast("Copied command");
      });
    }
    for (const button of document.querySelectorAll("button[data-lost-copy]")) {
      button.addEventListener("click", async () => {
        const confirm = document.getElementById(button.dataset.confirmFor);
        if (!confirm || !confirm.checked) {
          if (confirm) confirm.focus();
          showToast("Check confirmation first");
          return;
        }
        const reason = document.getElementById(button.dataset.reasonFor);
        const note = reason ? reason.value.trim().replace(/\\s+/g, " ") : "";
        if (note.length < 12) {
          if (reason) reason.focus();
          showToast("Add loss reason");
          return;
        }
        const safeNote = JSON.stringify(note).slice(1, -1);
        await navigator.clipboard.writeText(button.dataset.lostCopy.replace("__LOSS_REASON__", safeNote));
        showToast("Copied lost command");
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
