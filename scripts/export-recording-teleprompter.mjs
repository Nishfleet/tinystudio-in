#!/usr/bin/env node
import { existsSync, mkdirSync, readdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join, relative } from "node:path";
import { checkProspectReadiness, prospectWarningWeight } from "./lib/prospect-readiness.mjs";
import { sendChannelGuidance } from "./lib/send-channel-guidance.mjs";
import { routedContactPlan } from "./lib/contact-route.mjs";

const limitArg = process.argv.find((arg) => arg.startsWith("--limit="));
const limit = limitArg ? Number(limitArg.split("=")[1]) : 5;
const outputArg = process.argv.find((arg) => arg.startsWith("--output="));
const outputPath = outputArg ? outputArg.split("=")[1] : "prospects/recording-teleprompter.html";

function listFolders(root) {
  if (!existsSync(root)) return [];
  return readdirSync(root, { withFileTypes: true })
    .filter((entry) => entry.isDirectory())
    .map((entry) => join(root, entry.name))
    .sort();
}

function read(path) {
  return existsSync(path) ? readFileSync(path, "utf8") : "";
}

function json(path) {
  return existsSync(path) ? JSON.parse(readFileSync(path, "utf8")) : {};
}

function escapeHtml(value) {
  return String(value)
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

function scriptToBlocks(markdown) {
  return stripTitle(markdown)
    .split(/\n(?=### |## )/g)
    .map((block) => block.trim())
    .filter(Boolean)
    .map((block) => `<section class="scriptBlock"><pre>${escapeHtml(block)}</pre></section>`)
    .join("\n");
}

function section(markdown, heading, fallback = "") {
  const escaped = heading.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const match = markdown.match(new RegExp(`## ${escaped}\\n+([\\s\\S]*?)(?:\\n## |$)`));
  return match ? match[1].trim() : fallback;
}

function briefToBlocks(markdown) {
  if (!markdown.trim()) return "";
  return ["Positioning Angle", "Direct Response Slide", "So-What Chain", "20-Second Cold Open"]
    .map((heading) => {
      const body = section(markdown, heading, "");
      return body ? `<section class="briefBlock"><h3>${escapeHtml(heading)}</h3><pre>${escapeHtml(body)}</pre></section>` : "";
    })
    .filter(Boolean)
    .join("\n");
}

const channelGuidance = sendChannelGuidance();

const prospects = listFolders("prospects")
  .map((path) => {
    const metadata = json(join(path, "metadata.json"));
    const pipeline = json(join(path, "pipeline.json"));
    const result = checkProspectReadiness(path);
    const contactPlan = read(join(path, "contact-plan.md"));
    return {
      path,
      name: metadata.name || path.split("/").at(-1),
      website: metadata.website || "",
      contactRoute: routedContactPlan(contactPlan, { emailReady: channelGuidance.emailReady })
        || metadata.contact
        || "Run contact plan before sending.",
      stage: pipeline.stage || "new",
      warnings: result.warnings || [],
      weight: prospectWarningWeight(result.warnings || []),
      brief: read(join(path, "recording-sharpness-brief.md")),
      script: read(join(path, "recording-script.md"))
    };
  })
  .filter((prospect) => !["won", "lost", "paused"].includes(prospect.stage))
  .sort((a, b) => a.weight - b.weight || a.name.localeCompare(b.name))
  .slice(0, limit);

const nav = prospects.map((prospect, index) => {
  const slug = prospect.path.split("/").at(-1);
  return `<a href="#${escapeHtml(slug)}">${index + 1}. ${escapeHtml(prospect.name)}</a>`;
}).join("\n");

const pages = prospects.map((prospect, index) => {
  const slug = prospect.path.split("/").at(-1);
  const line = `${prospect.path}|`;
  return `
    <article class="prospect" id="${escapeHtml(slug)}">
      <div class="topline">
        <span>${index + 1} / ${prospects.length}</span>
        <span>${escapeHtml(prospect.warnings.length ? prospect.warnings.join("; ") : "ready")}</span>
      </div>
      <h2>${escapeHtml(prospect.name)}</h2>
      <p class="routeLine">Send route: ${escapeHtml(prospect.contactRoute)}</p>
      <p class="${channelGuidance.emailReady ? "channelReady" : "channelWarning"}">Channel rule: ${escapeHtml(channelGuidance.rule)}</p>
      <div class="qualityBar">
        <label class="qualityCheck">
          <input type="checkbox" data-quality="leak" data-path="${escapeHtml(prospect.path)}" />
          <span>Visible leak</span>
        </label>
        <label class="qualityCheck">
          <input type="checkbox" data-quality="impact" data-path="${escapeHtml(prospect.path)}" />
          <span>Buyer impact</span>
        </label>
        <label class="qualityCheck">
          <input type="checkbox" data-quality="fix" data-path="${escapeHtml(prospect.path)}" />
          <span>First fix</span>
        </label>
        <label class="qualityCheck">
          <input type="checkbox" data-quality="ask" data-path="${escapeHtml(prospect.path)}" />
          <span>Clean ask</span>
        </label>
      </div>
      <div class="qualityNotes">
        <label>
          <span>Leak note</span>
          <textarea data-note="leak" data-path="${escapeHtml(prospect.path)}" placeholder="What exact visible leak did the Loom show?"></textarea>
        </label>
        <label>
          <span>Impact note</span>
          <textarea data-note="impact" data-path="${escapeHtml(prospect.path)}" placeholder="Why should this buyer care now?"></textarea>
        </label>
        <label>
          <span>Fix note</span>
          <textarea data-note="fix" data-path="${escapeHtml(prospect.path)}" placeholder="What is the first fix we would make?"></textarea>
        </label>
        <label>
          <span>Ask note</span>
          <textarea data-note="ask" data-path="${escapeHtml(prospect.path)}" placeholder="What is the clean next-step ask?"></textarea>
        </label>
      </div>
      <div class="timerRow">
        <strong id="timer-${escapeHtml(slug)}" class="timerTime" data-seconds="180">3:00</strong>
        <button data-timer-start="${escapeHtml(slug)}">Start 3:00</button>
        <button data-timer-reset="${escapeHtml(slug)}">Reset</button>
      </div>
      <div class="actions">
        <a href="${escapeHtml(prospect.website)}" target="_blank" rel="noreferrer">Open Site</a>
        <a href="${escapeHtml(localHref(join(prospect.path, "page-snapshot.md")))}" target="_blank" rel="noreferrer">Snapshot</a>
        <a href="${escapeHtml(localHref(join(prospect.path, "recording-sharpness-brief.md")))}" target="_blank" rel="noreferrer">Sharpness</a>
        <a href="${escapeHtml(localHref(join(prospect.path, "contact-plan.md")))}" target="_blank" rel="noreferrer">Contact Plan</a>
        <button data-copy="${escapeHtml(line)}">Copy Batch Line</button>
        <button data-copy="${escapeHtml(`npm run prospect:send-prep -- ${prospect.path} https://www.loom.com/share/... --approved`)}">Copy Send Prep</button>
      </div>
      <label for="loom-${escapeHtml(slug)}">Loom URL</label>
      <input id="loom-${escapeHtml(slug)}" class="loomInput" placeholder="https://www.loom.com/share/..." data-path="${escapeHtml(prospect.path)}" />
      <p class="inputStatus" id="status-loom-${escapeHtml(slug)}">Needs a Loom share or embed URL.</p>
      <button class="copyFilled" data-input="loom-${escapeHtml(slug)}">Copy Filled Batch Line</button>
      ${prospect.brief ? `<div class="sharpnessBrief">${briefToBlocks(prospect.brief)}</div>` : ""}
      <div class="script">
        ${prospect.script ? scriptToBlocks(prospect.script) : `<section class="scriptBlock"><pre>Run npm run prospect:script -- ${escapeHtml(prospect.path)}</pre></section>`}
      </div>
    </article>
  `;
}).join("\n");

const html = `<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>TinyStudio Recording Teleprompter</title>
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
    html { scroll-behavior: smooth; }
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
      background: rgba(250, 249, 245, 0.97);
      padding: 14px 20px;
    }
    h1 {
      margin: 0;
      font-size: 22px;
      letter-spacing: 0;
    }
    .sub {
      margin: 3px 0 0;
      color: var(--muted);
      font-size: 13px;
    }
    .layout {
      display: grid;
      grid-template-columns: 220px minmax(0, 1fr);
      gap: 24px;
      width: min(1280px, calc(100% - 32px));
      margin: 20px auto 80px;
      align-items: start;
    }
    nav {
      position: sticky;
      top: 84px;
      display: grid;
      gap: 8px;
    }
    .sessionPanel {
      border: 1px solid var(--line);
      border-radius: 8px;
      background: var(--panel);
      padding: 10px;
      display: grid;
      gap: 8px;
    }
    .sessionCount {
      color: var(--accent);
      font-size: 13px;
      font-weight: 700;
    }
    nav a, .actions a, button {
      border: 1px solid var(--line);
      border-radius: 6px;
      background: #f6f8f5;
      color: var(--ink);
      min-height: 38px;
      padding: 8px 10px;
      font: inherit;
      font-size: 13px;
      text-decoration: none;
      cursor: pointer;
      display: inline-flex;
      align-items: center;
      justify-content: center;
    }
    nav a:hover, .actions a:hover, button:hover { border-color: var(--accent); }
    .prospect {
      min-height: calc(100vh - 110px);
      border: 1px solid var(--line);
      border-radius: 8px;
      background: var(--panel);
      padding: 24px;
      margin-bottom: 24px;
    }
    .topline {
      display: flex;
      justify-content: space-between;
      gap: 16px;
      color: var(--accent);
      font-size: 12px;
      font-weight: 700;
      text-transform: uppercase;
    }
    h2 {
      margin: 8px 0 14px;
      font-size: 34px;
      line-height: 1.05;
      letter-spacing: 0;
    }
    .routeLine {
      margin: -6px 0 14px;
      color: var(--muted);
      font-size: 14px;
      font-weight: 700;
    }
    .channelWarning, .channelReady {
      margin: -6px 0 14px;
      border: 1px solid #efc7be;
      border-radius: 6px;
      background: #fff7f4;
      color: #7a281f;
      padding: 8px 10px;
      font-size: 13px;
      font-weight: 700;
    }
    .channelReady {
      border-color: #b9d5c8;
      background: #f4faf6;
      color: #164536;
    }
    .qualityBar {
      display: grid;
      grid-template-columns: repeat(4, minmax(0, 1fr));
      gap: 8px;
      margin: 0 0 14px;
    }
    .qualityBar .qualityCheck {
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
    .qualityBar .qualityCheck:has(input:checked) {
      border-color: var(--accent);
      background: #f0f7f3;
      color: #164536;
    }
    .qualityBar .qualityCheck input {
      accent-color: var(--accent);
      margin: 0;
    }
    .qualityNotes {
      display: grid;
      grid-template-columns: repeat(4, minmax(0, 1fr));
      gap: 8px;
      margin: -4px 0 14px;
    }
    .qualityNotes label {
      margin: 0;
      color: var(--muted);
      font-size: 12px;
      font-weight: 700;
    }
    .qualityNotes span {
      display: block;
      margin-bottom: 4px;
    }
    .qualityNotes textarea {
      width: 100%;
      min-height: 78px;
      border: 1px solid var(--line);
      border-radius: 6px;
      background: #fbfcfb;
      color: var(--ink);
      font: inherit;
      font-size: 13px;
      line-height: 1.35;
      padding: 8px 10px;
      resize: vertical;
    }
    .qualityNotes textarea.valid {
      border-color: var(--accent);
      background: #f0f7f3;
    }
    .qualityNotes textarea.invalid {
      border-color: #b43b2d;
      background: #fff5f2;
    }
    .timerRow {
      display: grid;
      grid-template-columns: 120px minmax(0, 1fr) minmax(0, 1fr);
      gap: 8px;
      align-items: center;
      margin: 0 0 14px;
    }
    .timerTime {
      border: 1px solid var(--line);
      border-radius: 6px;
      background: #fbfcfb;
      display: flex;
      align-items: center;
      justify-content: center;
      min-height: 38px;
      font-size: 22px;
      font-variant-numeric: tabular-nums;
    }
    .timerTime.running {
      border-color: var(--accent);
      color: var(--accent);
    }
    .timerTime.over {
      border-color: #b43b2d;
      color: #7a281f;
      background: #fff5f2;
    }
    .actions {
      display: grid;
      grid-template-columns: repeat(6, minmax(0, 1fr));
      gap: 8px;
      margin-bottom: 14px;
    }
    label {
      display: block;
      font-size: 13px;
      font-weight: 700;
      margin-bottom: 6px;
    }
    .loomInput {
      width: 100%;
      min-height: 42px;
      border: 1px solid var(--line);
      border-radius: 6px;
      padding: 8px 10px;
      font: inherit;
      margin-bottom: 8px;
    }
    .loomInput.valid {
      border-color: var(--accent);
      background: #f0f7f3;
    }
    .loomInput.invalid {
      border-color: #b43b2d;
      background: #fff5f2;
    }
    .inputStatus {
      min-height: 20px;
      margin: -2px 0 8px;
      color: var(--muted);
      font-size: 13px;
    }
    .inputStatus.valid { color: #164536; }
    .inputStatus.invalid { color: #7a281f; }
    .copyFilled {
      width: 100%;
      margin-bottom: 18px;
    }
    .sharpnessBrief {
      border: 1px solid #cddcd4;
      border-radius: 8px;
      background: #f5fbf7;
      padding: 14px;
      margin-bottom: 18px;
      display: grid;
      gap: 10px;
    }
    .briefBlock {
      border-top: 1px solid #d9e7de;
      padding-top: 10px;
    }
    .briefBlock:first-child {
      border-top: 0;
      padding-top: 0;
    }
    .briefBlock h3 {
      margin: 0 0 6px;
      color: var(--accent);
      font-size: 13px;
      letter-spacing: 0;
      text-transform: uppercase;
    }
    .briefBlock pre {
      font-size: 15px;
      line-height: 1.45;
    }
    .script {
      display: grid;
      gap: 12px;
    }
    .scriptBlock {
      border-top: 1px solid var(--line);
      padding-top: 14px;
    }
    pre {
      white-space: pre-wrap;
      overflow-wrap: anywhere;
      margin: 0;
      font: inherit;
      font-size: clamp(18px, 2.1vw, 28px);
      line-height: 1.45;
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
    @media (max-width: 860px) {
      header { position: static; }
      .layout { grid-template-columns: 1fr; }
      nav { position: static; }
      .qualityBar { grid-template-columns: 1fr 1fr; }
      .qualityNotes { grid-template-columns: 1fr; }
      .timerRow { grid-template-columns: 1fr; }
      .actions { grid-template-columns: 1fr; }
      h2 { font-size: 28px; }
    }
  </style>
</head>
<body>
  <header>
    <h1>TinyStudio Recording Teleprompter</h1>
    <p class="sub">${prospects.length} scripts. Record the batch, paste Loom URLs, copy the filled sheet.</p>
    <p class="sub">Recommended channel now: ${escapeHtml(channelGuidance.recommendedChannel)}${channelGuidance.warnings.length ? ` (${escapeHtml(channelGuidance.warnings.join("; "))})` : ""}</p>
  </header>
  <div class="layout">
    <nav>
      <div class="sessionPanel">
        <div class="sessionCount" id="sessionCount">0 / ${prospects.length} approved Looms</div>
        <button id="copyFilledSheet">Copy Approved Loom Sheet</button>
        <button data-copy="npm run market:after-recording -- --from-clipboard">Copy Post-Recording Command</button>
      </div>
      ${nav}
    </nav>
    <main>
      ${pages}
    </main>
  </div>
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
    const storageKey = "tinystudio-recording-teleprompter-links";
    const qualityStorageKey = "tinystudio-recording-teleprompter-quality";
    const noteStorageKey = "tinystudio-recording-teleprompter-notes";
    const inputs = Array.from(document.querySelectorAll(".loomInput"));
    const qualityChecks = Array.from(document.querySelectorAll(".qualityCheck input"));
    const noteFields = Array.from(document.querySelectorAll(".qualityNotes textarea"));
    const stored = JSON.parse(localStorage.getItem(storageKey) || "{}");
    const storedQuality = JSON.parse(localStorage.getItem(qualityStorageKey) || "{}");
    const storedNotes = JSON.parse(localStorage.getItem(noteStorageKey) || "{}");
    const sessionCount = document.getElementById("sessionCount");

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

    function saveLinks() {
      const next = {};
      for (const input of inputs) {
        if (input.value.trim()) next[input.dataset.path] = input.value.trim();
      }
      localStorage.setItem(storageKey, JSON.stringify(next));
      updateCount();
    }

    function qualityKey(input) {
      return input.dataset.path + "::" + input.dataset.quality;
    }

    function noteKey(input) {
      return input.dataset.path + "::" + input.dataset.note;
    }

    function cleanRowPart(value) {
      return String(value || "").replace(/\\s+/g, " ").replace(/\\|/g, "/").trim();
    }

    function saveQuality() {
      const next = {};
      for (const input of qualityChecks) {
        if (input.checked) next[qualityKey(input)] = true;
      }
      localStorage.setItem(qualityStorageKey, JSON.stringify(next));
      updateCount();
    }

    function saveNotes() {
      const next = {};
      for (const input of noteFields) {
        const value = cleanRowPart(input.value);
        if (value) next[noteKey(input)] = value;
      }
      localStorage.setItem(noteStorageKey, JSON.stringify(next));
      updateCount();
    }

    function prospectQualityChecks(path) {
      return qualityChecks.filter((input) => input.dataset.path === path);
    }

    function prospectNoteFields(path) {
      return noteFields.filter((input) => input.dataset.path === path);
    }

    function notesFor(path) {
      const notes = {};
      for (const input of prospectNoteFields(path)) {
        notes[input.dataset.note] = cleanRowPart(input.value);
      }
      return notes;
    }

    function hasQualityNotes(path) {
      const notes = notesFor(path);
      return ["leak", "impact", "fix", "ask"].every((key) => notes[key] && notes[key].length >= 8);
    }

    function isQualityApproved(path) {
      const checks = prospectQualityChecks(path);
      return checks.length > 0 && checks.every((input) => input.checked) && hasQualityNotes(path);
    }

    function focusFirstMissingQuality(path) {
      const missing = prospectQualityChecks(path).find((input) => !input.checked);
      if (missing) {
        missing.focus();
        return;
      }
      const missingNote = prospectNoteFields(path).find((input) => cleanRowPart(input.value).length < 8);
      if (missingNote) missingNote.focus();
    }

    function filledLines() {
      return inputs
        .map((input) => {
          const value = input.value.trim();
          const notes = notesFor(input.dataset.path);
          return isValidLoomUrl(value) && isQualityApproved(input.dataset.path)
            ? [
                input.dataset.path,
                value,
                "approved",
                notes.leak,
                notes.impact,
                notes.fix,
                notes.ask
              ].map(cleanRowPart).join("|")
            : "";
        })
        .filter(Boolean);
    }

    const timerState = new Map();
    function formatTime(seconds) {
      const safe = Math.max(0, seconds);
      return Math.floor(safe / 60) + ":" + String(safe % 60).padStart(2, "0");
    }
    function timerFor(slug) {
      if (!timerState.has(slug)) timerState.set(slug, { remaining: 180, interval: null });
      return timerState.get(slug);
    }
    function renderTimer(slug) {
      const state = timerFor(slug);
      const display = document.getElementById("timer-" + slug);
      const start = document.querySelector("button[data-timer-start='" + slug + "']");
      if (!display || !start) return;
      display.textContent = formatTime(state.remaining);
      display.classList.toggle("running", Boolean(state.interval));
      display.classList.toggle("over", state.remaining === 0);
      start.textContent = state.interval ? "Pause" : state.remaining === 180 ? "Start 3:00" : "Resume";
    }
    function stopTimer(slug) {
      const state = timerFor(slug);
      if (state.interval) clearInterval(state.interval);
      state.interval = null;
      renderTimer(slug);
    }
    for (const button of document.querySelectorAll("button[data-timer-start]")) {
      const slug = button.dataset.timerStart;
      renderTimer(slug);
      button.addEventListener("click", () => {
        const state = timerFor(slug);
        if (state.interval) {
          stopTimer(slug);
          return;
        }
        if (state.remaining <= 0) state.remaining = 180;
        state.interval = setInterval(() => {
          state.remaining -= 1;
          if (state.remaining <= 0) {
            state.remaining = 0;
            stopTimer(slug);
            showToast("3 minutes reached");
            return;
          }
          renderTimer(slug);
        }, 1000);
        renderTimer(slug);
      });
    }
    for (const button of document.querySelectorAll("button[data-timer-reset]")) {
      button.addEventListener("click", () => {
        const slug = button.dataset.timerReset;
        const state = timerFor(slug);
        if (state.interval) clearInterval(state.interval);
        state.interval = null;
        state.remaining = 180;
        renderTimer(slug);
      });
    }

    function updateCount() {
      let valid = 0;
      let approved = 0;
      let filled = 0;
      for (const input of inputs) {
        const value = input.value.trim();
        const ok = isValidLoomUrl(value);
        const qualityOk = isQualityApproved(input.dataset.path);
        const notesOk = hasQualityNotes(input.dataset.path);
        const status = document.getElementById("status-" + input.id);
        if (value) filled += 1;
        if (ok) valid += 1;
        if (ok && qualityOk) approved += 1;
        input.classList.toggle("valid", ok);
        input.classList.toggle("invalid", Boolean(value) && (!ok || !qualityOk));
        if (status) {
          status.textContent = ok && qualityOk
            ? "Ready for batch prep."
            : ok
              ? notesOk
                ? "Check leak, impact, fix, and ask before batch prep."
                : "Add leak, impact, fix, and ask notes before batch prep."
              : "Needs a Loom share or embed URL.";
          status.classList.toggle("valid", ok && qualityOk);
          status.classList.toggle("invalid", Boolean(value) && (!ok || !qualityOk));
        }
      }
      for (const input of noteFields) {
        const value = cleanRowPart(input.value);
        input.classList.toggle("valid", value.length >= 8);
        input.classList.toggle("invalid", Boolean(value) && value.length < 8);
      }
      sessionCount.textContent = approved + " / " + inputs.length + " approved Looms";
      sessionCount.title = [
        filled === valid ? "" : String(filled - valid) + " invalid Loom link(s)",
        valid === approved ? "" : String(valid - approved) + " Loom check(s) or note set(s) incomplete"
      ].filter(Boolean).join("; ");
    }

    for (const input of inputs) {
      if (stored[input.dataset.path]) input.value = stored[input.dataset.path];
      input.addEventListener("input", saveLinks);
    }
    for (const input of qualityChecks) {
      input.checked = Boolean(storedQuality[qualityKey(input)]);
      input.addEventListener("change", saveQuality);
    }
    for (const input of noteFields) {
      input.value = storedNotes[noteKey(input)] || "";
      input.addEventListener("input", saveNotes);
    }
    updateCount();

    document.getElementById("copyFilledSheet").addEventListener("click", async () => {
      const lines = filledLines();
      const invalid = inputs.find((input) => input.value.trim() && !isValidLoomUrl(input.value));
      if (invalid) {
        invalid.focus();
        showToast("Fix invalid Loom URL");
        return;
      }
      const missingQuality = inputs.find((input) => isValidLoomUrl(input.value) && !isQualityApproved(input.dataset.path));
      if (missingQuality) {
        focusFirstMissingQuality(missingQuality.dataset.path);
        showToast("Complete Loom checks and notes");
        return;
      }
      if (!lines.length) {
        showToast("No approved Loom links yet");
        return;
      }
      await navigator.clipboard.writeText(lines.join("\\n"));
      showToast("Copied " + lines.length + " Loom rows");
    });

    for (const button of document.querySelectorAll(".copyFilled")) {
      button.addEventListener("click", async () => {
        const input = document.getElementById(button.dataset.input);
        const value = input.value.trim();
        if (!isValidLoomUrl(value)) {
          input.focus();
          showToast(value ? "Fix invalid Loom URL" : "Paste Loom URL first");
          return;
        }
        if (!isQualityApproved(input.dataset.path)) {
          focusFirstMissingQuality(input.dataset.path);
          showToast("Complete Loom checks and notes");
          return;
        }
        const notes = notesFor(input.dataset.path);
        const text = [
          input.dataset.path,
          value,
          "approved",
          notes.leak,
          notes.impact,
          notes.fix,
          notes.ask
        ].map(cleanRowPart).join("|");
        await navigator.clipboard.writeText(text);
        showToast("Copied batch line");
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
