#!/usr/bin/env node
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join, relative } from "node:path";
import { execFileSync } from "node:child_process";
import { checkProspectReadiness, prospectWarningWeight } from "./lib/prospect-readiness.mjs";
import { sendChannelGuidance } from "./lib/send-channel-guidance.mjs";
import { routedContactPlan } from "./lib/contact-route.mjs";
import { listOutboundProspectFolders } from "./lib/outbound-prospects.mjs";

const limitArg = process.argv.find((arg) => arg.startsWith("--limit="));
const limit = limitArg ? Number(limitArg.split("=")[1]) : 5;
const outputArg = process.argv.find((arg) => arg.startsWith("--output="));
const outputPath = outputArg ? outputArg.split("=")[1] : "prospects/recording-cockpit.html";

function listFolders(root) {
  return listOutboundProspectFolders(root);
}

function read(path) {
  return existsSync(path) ? readFileSync(path, "utf8") : "";
}

function json(path) {
  return existsSync(path) ? JSON.parse(readFileSync(path, "utf8")) : {};
}

function escapeHtml(value) {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function localHref(path) {
  const href = relative(dirname(outputPath), path).replace(/\\/g, "/");
  return href || path.split("/").at(-1);
}

function stripTitle(markdown) {
  return markdown.replace(/^# .+\n+/, "").trim();
}

function section(markdown, heading, fallback = "") {
  const escaped = heading.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const match = markdown.match(new RegExp(`## ${escaped}\\n+([\\s\\S]*?)(?:\\n## |$)`));
  return match ? match[1].trim() : fallback;
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
    const result = checkProspectReadiness(path);
    return {
      path,
      name: metadata.name || path.split("/").at(-1),
      website: metadata.website || "",
      contact: metadata.contact || "",
      stage: pipeline.stage || "new",
      warnings: result.warnings || [],
      weight: prospectWarningWeight(result.warnings || [])
    };
  })
  .filter((prospect) => !["won", "lost", "paused"].includes(prospect.stage))
  .sort((a, b) => a.weight - b.weight || a.name.localeCompare(b.name))
  .slice(0, limit)
  .map((prospect) => {
    ensureMessage(prospect.path);
    const nextMessage = read(join(prospect.path, "next-message.md"));
    const contactPlan = read(join(prospect.path, "contact-plan.md"));
    return {
      ...prospect,
      contactRoute: routedContactPlan(contactPlan, { emailReady: channelGuidance.emailReady })
        || prospect.contact
        || "Run contact plan before sending.",
      script: stripTitle(read(join(prospect.path, "recording-script.md"))),
      nextMessage: stripTitle(nextMessage),
      messageWarnings: section(nextMessage, "Warnings", "- none"),
      subject: section(nextMessage, "Subject"),
      body: section(nextMessage, "Body"),
      contactForm: section(nextMessage, "Contact Form Version"),
      dm: section(nextMessage, "DM Version")
    };
  });

const cards = prospects.map((prospect, index) => {
  const slug = prospect.path.split("/").at(-1);
  const loomCommand = `npm run prospect:loom -- ${prospect.path} __LOOM_URL__`;
  const sendPrepCommand = `npm run prospect:send-prep -- ${prospect.path} __LOOM_URL__ --approved`;
  const messageCommand = `npm run prospect:message -- ${prospect.path}`;
  const outboxCommand = "npm run prospect:outbox";
  const strictCommand = `npm run prospect:check -- ${prospect.path} -- --strict`;

  return `
    <section class="prospect" id="${escapeHtml(slug)}">
      <div class="prospectHeader">
        <div>
          <p class="eyebrow">#${index + 1} ${escapeHtml(prospect.stage)}</p>
          <h2>${escapeHtml(prospect.name)}</h2>
          <p class="meta">${escapeHtml(prospect.contactRoute)}</p>
        </div>
        <div class="headerLinks">
          <a class="siteLink" href="${escapeHtml(prospect.website)}" target="_blank" rel="noreferrer">Open Site</a>
          <a class="siteLink" href="${escapeHtml(localHref(join(prospect.path, "page-snapshot.md")))}" target="_blank" rel="noreferrer">Snapshot</a>
        </div>
      </div>

      <div class="warning">${escapeHtml(prospect.warnings.length ? prospect.warnings.join("; ") : "ready")}</div>
      <div class="${channelGuidance.emailReady ? "routeReady" : "routeWarning"}">
        Channel rule: ${escapeHtml(channelGuidance.rule)}
      </div>

      <label class="loomLabel" for="loom-${escapeHtml(slug)}">Loom URL</label>
      <input id="loom-${escapeHtml(slug)}" class="loomInput" data-slug="${escapeHtml(slug)}" placeholder="https://www.loom.com/share/..." />
      <p class="inputStatus" id="status-loom-${escapeHtml(slug)}">Needs a Loom share or embed URL.</p>
      <div class="qualityBar" aria-label="Loom quality gate">
        <label class="qualityCheck">
          <input type="checkbox" data-quality="leak" data-slug="${escapeHtml(slug)}" />
          <span>Visible leak</span>
        </label>
        <label class="qualityCheck">
          <input type="checkbox" data-quality="impact" data-slug="${escapeHtml(slug)}" />
          <span>Buyer impact</span>
        </label>
        <label class="qualityCheck">
          <input type="checkbox" data-quality="fix" data-slug="${escapeHtml(slug)}" />
          <span>First fix</span>
        </label>
        <label class="qualityCheck">
          <input type="checkbox" data-quality="ask" data-slug="${escapeHtml(slug)}" />
          <span>Clean ask</span>
        </label>
      </div>

      <div class="commandGrid">
        <button data-command="${escapeHtml(sendPrepCommand)}" data-input="loom-${escapeHtml(slug)}">Copy Send Prep</button>
        <button data-command="${escapeHtml(loomCommand)}" data-input="loom-${escapeHtml(slug)}">Copy Loom Command</button>
        <button data-command="${escapeHtml(messageCommand)}">Copy Message Command</button>
        <button data-command="${escapeHtml(strictCommand)}">Copy Strict Check</button>
        <button data-command="${escapeHtml(outboxCommand)}">Copy Outbox Command</button>
      </div>

      <div class="sendPanel">
        <h3>Send Copy</h3>
        <div class="copyGrid">
          <button data-copy="${escapeHtml(prospect.subject)}">Copy Email Subject</button>
          ${channelGuidance.emailReady
            ? `<button data-copy="${escapeHtml(prospect.body)}" data-input="loom-${escapeHtml(slug)}">Copy Email Body</button>`
            : `<button class="warningAction" disabled>Email body blocked until send setup is clean</button>`}
          <button data-copy="${escapeHtml(prospect.contactForm)}" data-input="loom-${escapeHtml(slug)}">Copy Contact Form</button>
          <button data-copy="${escapeHtml(prospect.dm)}" data-input="loom-${escapeHtml(slug)}">Copy DM</button>
        </div>
        <p class="messageWarning">${escapeHtml(prospect.messageWarnings.replace(/^- none$/m, "No message warnings."))}</p>
      </div>

      <details open>
        <summary>Recording Script</summary>
        <pre>${escapeHtml(prospect.script || `Run npm run prospect:script -- ${prospect.path}`)}</pre>
      </details>

      <details>
        <summary>Current Message</summary>
        <pre>${escapeHtml(prospect.nextMessage || `Run npm run prospect:message -- ${prospect.path}`)}</pre>
      </details>
    </section>
  `;
}).join("\n");

const html = `<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>TinyStudio Recording Cockpit</title>
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
      --accent-2: #b43b2d;
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
      position: sticky;
      top: 0;
      z-index: 2;
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
      width: min(1120px, calc(100% - 32px));
      margin: 24px auto 64px;
      display: grid;
      gap: 18px;
    }
    .workflow {
      border: 1px solid var(--line);
      background: var(--panel);
      border-radius: 8px;
      padding: 16px;
    }
    .workflow ol {
      margin: 8px 0 0;
      padding-left: 22px;
    }
    .prospect {
      border: 1px solid var(--line);
      background: var(--panel);
      border-radius: 8px;
      padding: 18px;
    }
    .prospectHeader {
      display: flex;
      justify-content: space-between;
      gap: 16px;
      align-items: start;
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
    .headerLinks {
      display: flex;
      flex-wrap: wrap;
      gap: 8px;
      justify-content: flex-end;
    }
    .warning {
      margin: 14px 0;
      border-left: 3px solid var(--accent-2);
      background: #fff5f2;
      padding: 10px 12px;
      color: #5d2119;
      font-size: 14px;
    }
    .routeWarning, .routeReady {
      margin: 0 0 14px;
      border: 1px solid #efc7be;
      border-radius: 6px;
      background: #fff7f4;
      color: #7a281f;
      padding: 8px 10px;
      font-size: 13px;
      font-weight: 700;
    }
    .routeReady {
      border-color: #b9d5c8;
      background: #f4faf6;
      color: #164536;
    }
    .loomLabel {
      display: block;
      margin-bottom: 6px;
      font-size: 13px;
      font-weight: 700;
    }
    .loomInput {
      width: 100%;
      min-height: 40px;
      border: 1px solid var(--line);
      border-radius: 6px;
      padding: 8px 10px;
      font: inherit;
      font-size: 14px;
      background: #fff;
    }
    .loomInput.valid {
      border-color: var(--accent);
      background: #f0f7f3;
    }
    .loomInput.invalid {
      border-color: var(--accent-2);
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
    .qualityBar {
      display: grid;
      grid-template-columns: repeat(4, minmax(0, 1fr));
      gap: 8px;
      margin: 10px 0 12px;
    }
    .qualityCheck {
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
    .qualityCheck:has(input:checked) {
      border-color: var(--accent);
      background: #f0f7f3;
      color: #164536;
    }
    .qualityCheck input {
      accent-color: var(--accent);
      margin: 0;
    }
    .commandGrid {
      margin: 12px 0 16px;
      display: grid;
      grid-template-columns: repeat(4, minmax(0, 1fr));
      gap: 8px;
    }
    .sendPanel {
      border: 1px solid var(--line);
      background: #fbfcfb;
      border-radius: 8px;
      padding: 12px;
      margin: 12px 0;
    }
    .sendPanel h3 {
      margin: 0 0 10px;
      font-size: 15px;
      letter-spacing: 0;
    }
    .copyGrid {
      display: grid;
      grid-template-columns: repeat(4, minmax(0, 1fr));
      gap: 8px;
    }
    .messageWarning {
      margin: 10px 0 0;
      color: var(--muted);
      font-size: 13px;
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
      header { position: static; }
      .prospectHeader { flex-direction: column; }
      .headerLinks { width: 100%; justify-content: stretch; }
      .commandGrid, .copyGrid, .qualityBar { grid-template-columns: 1fr; }
      .siteLink, button { width: 100%; }
    }
  </style>
</head>
<body>
  <header>
    <h1>TinyStudio Recording Cockpit</h1>
    <p class="sub">${prospects.length} closest-to-send prospects. Record, paste Loom link, copy commands, move on.</p>
  </header>
  <main>
    <section class="workflow">
      <strong>Workflow</strong>
      <ol>
        <li>Open the prospect site.</li>
        <li>Record from the script.</li>
        <li>Paste the Loom URL into the field.</li>
        <li>Copy and run Send Prep. It updates the Loom link, creates the message, checks readiness, and writes send-package.md.</li>
        <li>Open the outbox, send the right channel version, then mark sent from the checked outbox row.</li>
      </ol>
    </section>
    ${cards}
  </main>
  <div class="toast" id="toast">Copied</div>
  <script>
    const toast = document.getElementById("toast");
    function showToast(text) {
      toast.textContent = text;
      toast.classList.add("show");
      setTimeout(() => toast.classList.remove("show"), 1200);
    }
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
    function updateInputState(input) {
      const value = input.value.trim();
      const ok = isValidLoomUrl(value);
      const status = document.getElementById("status-" + input.id);
      input.classList.toggle("valid", ok);
      input.classList.toggle("invalid", Boolean(value) && !ok);
      if (status) {
        status.textContent = ok ? "Ready for command copy." : "Needs a Loom share or embed URL.";
        status.classList.toggle("valid", ok);
        status.classList.toggle("invalid", Boolean(value) && !ok);
      }
      return ok;
    }
    const qualityStorageKey = "tinystudio-recording-cockpit-quality";
    const qualityChecks = Array.from(document.querySelectorAll(".qualityCheck input"));
    const storedQuality = JSON.parse(localStorage.getItem(qualityStorageKey) || "{}");
    function qualityKey(input) {
      return input.dataset.slug + "::" + input.dataset.quality;
    }
    function checksForSlug(slug) {
      return qualityChecks.filter((input) => input.dataset.slug === slug);
    }
    function isQualityApproved(slug) {
      const checks = checksForSlug(slug);
      return checks.length > 0 && checks.every((input) => input.checked);
    }
    function focusFirstMissingQuality(slug) {
      const missing = checksForSlug(slug).find((input) => !input.checked);
      if (missing) missing.focus();
    }
    function saveQuality() {
      const next = {};
      for (const input of qualityChecks) {
        if (input.checked) next[qualityKey(input)] = true;
      }
      localStorage.setItem(qualityStorageKey, JSON.stringify(next));
    }
    for (const input of qualityChecks) {
      input.checked = Boolean(storedQuality[qualityKey(input)]);
      input.addEventListener("change", saveQuality);
    }
    for (const input of document.querySelectorAll(".loomInput")) {
      input.addEventListener("input", () => updateInputState(input));
      updateInputState(input);
    }
    for (const button of document.querySelectorAll("button[data-command]")) {
      button.addEventListener("click", async () => {
        let command = button.dataset.command;
        const inputId = button.dataset.input;
        if (inputId) {
          const input = document.getElementById(inputId);
          const value = input.value.trim();
          if (!updateInputState(input)) {
            input.focus();
            showToast(value ? "Fix invalid Loom URL" : "Paste Loom URL first");
            return;
          }
          if (!isQualityApproved(input.dataset.slug)) {
            focusFirstMissingQuality(input.dataset.slug);
            showToast("Complete Loom quality checks");
            return;
          }
          command = command.replace("__LOOM_URL__", value);
        }
        await navigator.clipboard.writeText(command);
        showToast("Copied command");
      });
    }
    for (const button of document.querySelectorAll("button[data-copy]")) {
      button.addEventListener("click", async () => {
        let text = button.dataset.copy;
        const inputId = button.dataset.input;
        if (inputId) {
          const input = document.getElementById(inputId);
          const value = input.value.trim();
          if (!updateInputState(input)) {
            input.focus();
            showToast(value ? "Fix invalid Loom URL" : "Paste Loom URL first");
            return;
          }
          if (!isQualityApproved(input.dataset.slug)) {
            focusFirstMissingQuality(input.dataset.slug);
            showToast("Complete Loom quality checks");
            return;
          }
          text = text.replaceAll("[add Loom link]", value);
        }
        await navigator.clipboard.writeText(text);
        showToast("Copied text");
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
