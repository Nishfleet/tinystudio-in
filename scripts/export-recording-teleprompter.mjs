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
    .map((block) => {
      const match = block.match(/^(#{2,3})\s+(.+?)\n+([\s\S]*)$/);
      if (!match) return `<section class="scriptBlock"><pre>${escapeHtml(block)}</pre></section>`;
      return `<section class="scriptBlock">
        <h3>${escapeHtml(match[2])}</h3>
        <pre>${escapeHtml(match[3].trim())}</pre>
      </section>`;
    })
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
  return `<a class="queueLink" href="#${escapeHtml(slug)}" data-target="${escapeHtml(slug)}">
    <span>${index + 1}</span>
    <strong>${escapeHtml(prospect.name)}</strong>
  </a>`;
}).join("\n");

const pages = prospects.map((prospect, index) => {
  const slug = prospect.path.split("/").at(-1);
  const line = `${prospect.path}|`;
  return `
    <article class="prospect" id="${escapeHtml(slug)}" data-prospect="${escapeHtml(prospect.path)}">
      <div class="prospectHeader">
        <div>
          <div class="topline">
            <span>Script ${index + 1} of ${prospects.length}</span>
            <span>${escapeHtml(prospect.warnings.length ? prospect.warnings.join("; ") : "ready")}</span>
          </div>
          <h2>${escapeHtml(prospect.name)}</h2>
        </div>
        <a class="siteButton" href="${escapeHtml(prospect.website)}" target="_blank" rel="noreferrer">Open site</a>
      </div>

      <div class="routeCard">
        <strong>Send route:</strong>
        <span>${escapeHtml(prospect.contactRoute)}</span>
      </div>
      <p class="${channelGuidance.emailReady ? "channelReady" : "channelWarning"}">Channel rule: ${escapeHtml(channelGuidance.rule)}</p>
      <p class="channelMeta">Recommended channel now: ${escapeHtml(channelGuidance.recommendedChannel)}${channelGuidance.warnings.length ? ` (${escapeHtml(channelGuidance.warnings.join("; "))})` : ""}</p>

      <div class="recordingGrid">
        <section class="scriptPane" aria-label="${escapeHtml(prospect.name)} script">
          <div class="scriptToolbar">
            <span>Read this, then show the live page</span>
            <a href="#${escapeHtml(index + 1 < prospects.length ? prospects[index + 1].path.split("/").at(-1) : prospects[0].path.split("/").at(-1))}">${index + 1 < prospects.length ? "Next script" : "Back to first"}</a>
          </div>
          <div class="script">
            ${prospect.script ? scriptToBlocks(prospect.script) : `<section class="scriptBlock"><pre>Run npm run prospect:script -- ${escapeHtml(prospect.path)}</pre></section>`}
          </div>
        </section>

        <aside class="recordingPanel" aria-label="${escapeHtml(prospect.name)} recording controls">
          <section class="panelBlock timerBlock">
            <span class="panelLabel">Recording timer</span>
            <strong id="timer-${escapeHtml(slug)}" class="timerTime" data-seconds="180">3:00</strong>
            <div class="buttonRow">
              <button data-timer-start="${escapeHtml(slug)}">Start 3:00</button>
              <button data-timer-reset="${escapeHtml(slug)}">Reset</button>
            </div>
          </section>

          <section class="panelBlock">
            <span class="panelLabel">Required checks</span>
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
          </section>

          <section class="panelBlock">
            <span class="panelLabel">Paste Loom URL</span>
            <input id="loom-${escapeHtml(slug)}" class="loomInput" placeholder="https://www.loom.com/share/..." data-path="${escapeHtml(prospect.path)}" />
            <p class="inputStatus" id="status-loom-${escapeHtml(slug)}">Needs a Loom share or embed URL.</p>
            <button class="copyFilled primaryButton" data-input="loom-${escapeHtml(slug)}">Copy approved row</button>
          </section>

          <details class="panelBlock notesDetails">
            <summary>Approval notes</summary>
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
          </details>

          <details class="panelBlock sharpnessDetails" open>
            <summary>Sharpness cues</summary>
            ${prospect.brief ? `<div class="sharpnessBrief">${briefToBlocks(prospect.brief)}</div>` : "<p>No sharpness brief yet.</p>"}
          </details>

          <section class="panelBlock">
            <span class="panelLabel">Files and copy</span>
            <div class="actions">
              <a href="${escapeHtml(localHref(join(prospect.path, "page-snapshot.md")))}" target="_blank" rel="noreferrer">Snapshot</a>
              <a href="${escapeHtml(localHref(join(prospect.path, "recording-sharpness-brief.md")))}" target="_blank" rel="noreferrer">Sharpness</a>
              <a href="${escapeHtml(localHref(join(prospect.path, "contact-plan.md")))}" target="_blank" rel="noreferrer">Contact Plan</a>
              <button data-copy="${escapeHtml(line)}">Copy empty row</button>
              <button data-copy="${escapeHtml(`npm run prospect:send-prep -- ${prospect.path} https://www.loom.com/share/... --approved`)}">Copy send prep</button>
            </div>
          </section>
        </aside>
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
      --ink: #0a2540;
      --muted: #425466;
      --quiet: #697386;
      --soft: #f6f9fc;
      --line: #e3e8ee;
      --line-strong: #cbd6e2;
      --paper: #f6f9fc;
      --panel: #ffffff;
      --panel-2: #f7fafc;
      --accent: #635bff;
      --accent-2: #80e9ff;
      --success: #00a66f;
      --warning: #a8552a;
      --warning-bg: #fff8f2;
      --warning-line: #ffd8b6;
      --focus: #635bff;
      --shadow: 0 1px 1px rgba(10, 37, 64, 0.05);
    }
    * { box-sizing: border-box; }
    html { scroll-behavior: smooth; }
    body {
      margin: 0;
      font-family: "SF Pro Text", "SF Pro Display", -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Arial, sans-serif;
      background: var(--paper);
      color: var(--ink);
      line-height: 1.42;
      letter-spacing: 0;
    }
    :focus-visible {
      outline: 3px solid rgba(99, 91, 255, 0.25);
      outline-offset: 2px;
    }
    header {
      position: sticky;
      top: 0;
      z-index: 5;
      border-bottom: 1px solid var(--line);
      background: rgba(255, 255, 255, 0.92);
      backdrop-filter: blur(12px);
      padding: 0;
    }
    .topShell {
      width: 100%;
      min-height: 58px;
      padding: 0 20px;
      margin: 0 auto;
      display: grid;
      grid-template-columns: minmax(0, 1fr) auto;
      gap: 20px;
      align-items: center;
    }
    h1 {
      margin: 0;
      font-size: 18px;
      font-weight: 680;
      letter-spacing: 0;
    }
    .sub {
      margin: 2px 0 0;
      color: var(--muted);
      font-size: 12px;
    }
    .crumb {
      color: var(--quiet);
      font-size: 11px;
      font-weight: 700;
      margin: 0 0 2px;
      text-transform: uppercase;
    }
    .crumb strong { color: var(--accent); }
    .topMetrics {
      display: flex;
      gap: 0;
      align-items: center;
    }
    .topMetric {
      min-width: 104px;
      border-left: 1px solid var(--line);
      background: transparent;
      padding: 2px 16px;
    }
    .topMetric strong {
      display: block;
      color: var(--ink);
      font-size: 13px;
      line-height: 1.15;
      font-variant-numeric: tabular-nums;
    }
    .topMetric span {
      display: block;
      margin-top: 2px;
      color: var(--muted);
      font-size: 11px;
      white-space: nowrap;
    }
    .layout {
      display: grid;
      grid-template-columns: 236px minmax(0, 1fr);
      gap: 0;
      width: 100%;
      margin: 0;
      align-items: start;
    }
    main { min-width: 0; }
    nav {
      position: sticky;
      top: 58px;
      display: grid;
      gap: 6px;
      min-height: calc(100vh - 58px);
      border-right: 1px solid var(--line);
      background: rgba(255, 255, 255, 0.78);
      padding: 14px 12px;
    }
    .sessionPanel {
      border: 0;
      border-bottom: 1px solid var(--line);
      border-radius: 0;
      background: transparent;
      padding: 0 0 12px;
      display: grid;
      gap: 8px;
      box-shadow: none;
    }
    .sessionCount {
      color: var(--muted);
      font-size: 12px;
      font-weight: 650;
    }
    .sessionPanel button { width: 100%; }
    .queueLink {
      border: 1px solid transparent;
      border-radius: 5px;
      background: transparent;
      color: var(--ink);
      min-height: 38px;
      padding: 6px 8px;
      text-decoration: none;
      display: grid;
      grid-template-columns: 22px minmax(0, 1fr);
      gap: 7px;
      align-items: center;
      transition: border-color 140ms ease, background 140ms ease, box-shadow 140ms ease;
    }
    .queueLink span {
      width: 22px;
      height: 22px;
      border-radius: 4px;
      display: inline-flex;
      align-items: center;
      justify-content: center;
      background: #edf2f7;
      color: var(--muted);
      font-size: 11px;
      font-weight: 700;
      font-variant-numeric: tabular-nums;
    }
    .queueLink strong {
      min-width: 0;
      overflow-wrap: anywhere;
      font-size: 12px;
      font-weight: 650;
      letter-spacing: 0;
    }
    .queueLink:hover,
    .queueLink.active {
      border-color: #d8e0ea;
      background: #fff;
      box-shadow: var(--shadow);
    }
    .queueLink.active span {
      background: var(--accent);
      color: white;
    }
    .actions a, button, .siteButton, .scriptToolbar a {
      border: 1px solid var(--line);
      border-radius: 4px;
      background: var(--panel-2);
      color: var(--ink);
      min-height: 30px;
      padding: 6px 9px;
      font: inherit;
      font-size: 12px;
      font-weight: 600;
      text-decoration: none;
      cursor: pointer;
      display: inline-flex;
      align-items: center;
      justify-content: center;
      text-align: center;
      transition: border-color 140ms ease, background 140ms ease, color 140ms ease, box-shadow 140ms ease;
    }
    .actions a:hover, button:hover, .siteButton:hover, .scriptToolbar a:hover {
      border-color: var(--accent);
      background: #fff;
      box-shadow: 0 0 0 3px rgba(99, 91, 255, 0.08);
    }
    .primaryButton {
      background: var(--accent);
      border-color: var(--accent);
      color: white;
      font-weight: 700;
    }
    .primaryButton:hover { background: #4f46e5; color: white; }
    .prospect {
      min-height: calc(100vh - 110px);
      border: 1px solid var(--line);
      border-radius: 6px;
      background: var(--panel);
      padding: 0;
      margin: 18px 20px 20px;
      box-shadow: var(--shadow);
      scroll-margin-top: 72px;
      overflow: hidden;
    }
    .prospectHeader {
      display: flex;
      justify-content: space-between;
      align-items: start;
      gap: 16px;
      border-bottom: 1px solid var(--line);
      padding: 16px 18px 14px;
      margin-bottom: 0;
    }
    .topline {
      display: flex;
      flex-wrap: wrap;
      gap: 12px;
      color: var(--quiet);
      font-size: 11px;
      font-weight: 700;
      text-transform: uppercase;
    }
    h2 {
      margin: 5px 0 0;
      font-size: 26px;
      font-weight: 680;
      line-height: 1.12;
      letter-spacing: 0;
    }
    .routeCard {
      display: grid;
      grid-template-columns: 96px minmax(0, 1fr);
      gap: 10px;
      align-items: start;
      border-bottom: 1px solid var(--line);
      background: #fbfdff;
      padding: 10px 18px;
      margin-bottom: 0;
      color: var(--muted);
      font-size: 13px;
    }
    .routeCard strong {
      color: var(--quiet);
      text-transform: uppercase;
      font-size: 11px;
    }
    .channelWarning, .channelReady {
      margin: 0;
      border: 0;
      border-bottom: 1px solid var(--warning-line);
      border-radius: 0;
      background: var(--warning-bg);
      color: #7a281f;
      padding: 9px 18px;
      font-size: 12px;
      font-weight: 600;
    }
    .channelReady {
      border-color: #b7ead9;
      background: #f1fdf8;
      color: #076448;
    }
    .channelMeta {
      margin: 0;
      border-bottom: 1px solid var(--line);
      background: #fff;
      color: var(--muted);
      padding: 8px 18px;
      font-size: 12px;
      font-weight: 600;
    }
    .recordingGrid {
      display: grid;
      grid-template-columns: minmax(0, 1fr) 372px;
      gap: 0;
      align-items: start;
    }
    .scriptPane {
      min-width: 0;
      border-right: 1px solid var(--line);
      background: #fff;
    }
    .scriptToolbar {
      position: sticky;
      top: 58px;
      z-index: 3;
      display: flex;
      justify-content: space-between;
      gap: 12px;
      align-items: center;
      border: 0;
      border-bottom: 1px solid var(--line);
      border-radius: 0;
      background: rgba(255, 255, 255, 0.96);
      backdrop-filter: blur(10px);
      padding: 9px 18px;
      margin-bottom: 0;
      color: var(--muted);
      font-size: 12px;
      font-weight: 600;
    }
    .recordingPanel {
      position: sticky;
      top: 58px;
      display: grid;
      gap: 0;
      background: #fbfdff;
    }
    .panelBlock {
      border: 0;
      border-bottom: 1px solid var(--line);
      border-radius: 0;
      background: transparent;
      padding: 13px 14px;
      box-shadow: none;
    }
    .panelLabel,
    .notesDetails summary,
    .sharpnessDetails summary {
      display: block;
      color: var(--quiet);
      font-size: 11px;
      font-weight: 700;
      text-transform: uppercase;
      letter-spacing: 0;
      margin-bottom: 8px;
    }
    .notesDetails summary,
    .sharpnessDetails summary {
      cursor: pointer;
      margin-bottom: 0;
    }
    .notesDetails[open] summary,
    .sharpnessDetails[open] summary {
      margin-bottom: 10px;
    }
    .qualityBar {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 6px;
      margin: 0;
    }
    .qualityBar .qualityCheck {
      border: 1px solid var(--line);
      border-radius: 4px;
      background: #fff;
      color: var(--muted);
      padding: 7px 8px;
      font-size: 12px;
      font-weight: 600;
      display: flex;
      gap: 8px;
      align-items: center;
      justify-content: flex-start;
      margin: 0;
      cursor: pointer;
    }
    .qualityBar .qualityCheck:has(input:checked) {
      border-color: #9a95ff;
      background: #f4f3ff;
      color: var(--ink);
    }
    .qualityBar .qualityCheck input {
      accent-color: var(--accent);
      margin: 0;
    }
    .qualityNotes {
      display: grid;
      gap: 8px;
    }
    .qualityNotes label {
      margin: 0;
      color: var(--muted);
      font-size: 12px;
      font-weight: 600;
    }
    .qualityNotes span {
      display: block;
      margin-bottom: 4px;
    }
    .qualityNotes textarea {
      width: 100%;
      min-height: 64px;
      border: 1px solid var(--line);
      border-radius: 4px;
      background: #fff;
      color: var(--ink);
      font: inherit;
      font-size: 13px;
      line-height: 1.35;
      padding: 8px 10px;
      resize: vertical;
    }
    .qualityNotes textarea.valid {
      border-color: #8bd7be;
      background: #f3fffb;
    }
    .qualityNotes textarea.invalid {
      border-color: #b43b2d;
      background: #fff5f2;
    }
    .timerBlock {
      display: grid;
      gap: 10px;
    }
    .timerTime {
      border: 1px solid var(--line);
      border-radius: 4px;
      background: #fff;
      display: flex;
      align-items: center;
      justify-content: center;
      min-height: 58px;
      font-size: 34px;
      font-weight: 650;
      color: var(--ink);
      line-height: 1;
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
    .buttonRow {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 6px;
    }
    .actions {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 6px;
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
      border-radius: 4px;
      padding: 8px 10px;
      font: inherit;
      margin-bottom: 8px;
    }
    .loomInput.valid {
      border-color: #8bd7be;
      background: #f3fffb;
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
    }
    .sharpnessBrief {
      display: grid;
      gap: 10px;
    }
    .briefBlock {
      border-top: 1px solid var(--line);
      padding-top: 9px;
    }
    .briefBlock:first-child {
      border-top: 0;
      padding-top: 0;
    }
    .briefBlock h3 {
      margin: 0 0 6px;
      color: var(--quiet);
      font-size: 11px;
      font-weight: 700;
      letter-spacing: 0;
      text-transform: uppercase;
    }
    .briefBlock pre {
      font-size: 13px;
      line-height: 1.45;
    }
    .script {
      display: grid;
      gap: 0;
    }
    .scriptBlock {
      border: 0;
      border-bottom: 1px solid var(--line);
      border-radius: 0;
      background: #fff;
      overflow: hidden;
      box-shadow: none;
    }
    .scriptBlock h3 {
      margin: 0;
      border-bottom: 1px solid var(--line);
      background: #f7fafc;
      color: var(--quiet);
      padding: 9px 18px;
      font-size: 11px;
      font-weight: 700;
      text-transform: uppercase;
      letter-spacing: 0;
    }
    pre {
      white-space: pre-wrap;
      overflow-wrap: break-word;
      margin: 0;
      font: inherit;
      font-size: clamp(17px, 1.25vw, 20px);
      font-weight: 450;
      line-height: 1.5;
      padding: 16px 18px;
      color: #1a1f36;
    }
    .toast {
      position: fixed;
      right: 18px;
      bottom: 18px;
      background: #1a1f36;
      color: white;
      padding: 10px 12px;
      border-radius: 5px;
      opacity: 0;
      transform: translateY(8px);
      transition: 150ms ease;
      font-size: 13px;
    }
    .toast.show {
      opacity: 1;
      transform: translateY(0);
    }
    @media (max-width: 1180px) {
      .recordingGrid { grid-template-columns: 1fr; }
      .recordingPanel, .scriptToolbar { position: static; }
      .recordingPanel { border-top: 1px solid var(--line); }
      .scriptPane { border-right: 0; }
      .actions { grid-template-columns: 1fr; }
      h2 { font-size: 24px; }
      pre { font-size: 18px; }
    }
    @media (max-width: 760px) {
      header { position: static; }
      .topShell {
        width: min(100% - 28px, 760px);
        grid-template-columns: 1fr;
        padding: 14px 0;
      }
      .topMetrics {
        grid-template-columns: repeat(3, minmax(0, 1fr));
      }
      .topMetric {
        min-width: 0;
      }
      .layout { grid-template-columns: 1fr; }
      nav { position: static; }
    }
  </style>
</head>
<body>
  <header>
    <div class="topShell">
      <div>
        <p class="crumb"><strong>TinyStudio</strong> / Proof batch</p>
        <h1>Recording cockpit</h1>
        <p class="sub">${prospects.length} scripts. Record the batch, paste Loom URLs, copy the filled sheet.</p>
      </div>
      <div class="topMetrics" aria-label="Batch status">
        <div class="topMetric"><strong id="topApprovedCount">0/${prospects.length}</strong><span>approved Looms</span></div>
        <div class="topMetric"><strong>3:00</strong><span>target length</span></div>
        <div class="topMetric"><strong>${escapeHtml(channelGuidance.recommendedChannel)}</strong><span>send channel</span></div>
      </div>
    </div>
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
    const topApprovedCount = document.getElementById("topApprovedCount");

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
      if (topApprovedCount) topApprovedCount.textContent = approved + "/" + inputs.length;
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
