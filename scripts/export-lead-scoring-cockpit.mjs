#!/usr/bin/env node
import { existsSync, mkdirSync, readdirSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";

const limitArg = process.argv.find((arg) => arg.startsWith("--limit="));
const limit = limitArg ? Number(limitArg.split("=")[1]) : 10;
const outputArg = process.argv.find((arg) => arg.startsWith("--output="));
const outputPath = outputArg ? outputArg.split("=")[1] : "prospects/lead-scoring-cockpit.html";

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

function hasLeadScore(path) {
  const content = read(join(path, "lead-score.md"));
  return !/Score:\s*$/m.test(content) && !/Priority:\s*record \/ research-more \/ skip/m.test(content);
}

function escapeHtml(value) {
  return String(value)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function firstFilledLine(markdown, heading, fallback = "") {
  const escaped = heading.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const match = markdown.match(new RegExp(`## ${escaped}\\n+([\\s\\S]*?)(?:\\n## |$)`));
  const section = match ? match[1] : "";
  return section.split("\n").map((line) => line.trim()).find(Boolean) || fallback;
}

const prospects = listFolders("prospects")
  .map((path) => {
    const metadata = json(join(path, "metadata.json"));
    const pipeline = json(join(path, "pipeline.json"));
    return {
      path,
      name: metadata.name || path.split("/").at(-1),
      website: metadata.website || "",
      vertical: metadata.vertical || "",
      city: metadata.city || "",
      contact: metadata.contact || "",
      notes: metadata.notes || "",
      stage: pipeline.stage || "new",
      scored: hasLeadScore(path),
      auditHook: firstFilledLine(read(join(path, "audit-brief.md")), "Default Hook", "")
    };
  })
  .filter((prospect) => !["won", "lost", "paused"].includes(prospect.stage))
  .filter((prospect) => !prospect.scored)
  .slice(0, limit);

const rows = prospects.map((prospect, index) => `
    <section class="prospect">
      <div class="prospectHeader">
        <div>
          <p class="eyebrow">#${index + 1} ${escapeHtml(prospect.vertical || "unscored")}</p>
          <h2>${escapeHtml(prospect.name)}</h2>
          <p class="meta">${escapeHtml([prospect.city, prospect.contact].filter(Boolean).join(" · ") || "contact unknown")}</p>
        </div>
        <a class="siteLink" href="${escapeHtml(prospect.website)}" target="_blank" rel="noreferrer">Open Site</a>
      </div>
      <p>${escapeHtml(prospect.notes || prospect.auditHook || "Review site, offer, proof, and one visible leak.")}</p>
      <div class="scoreGrid">
        <label>Offer <input type="number" min="0" max="2" value="0" data-points></label>
        <label>Owner <input type="number" min="0" max="2" value="0" data-points></label>
        <label>Economics <input type="number" min="0" max="2" value="0" data-points></label>
        <label>Visible leak <input type="number" min="0" max="2" value="0" data-points></label>
        <label>Proof <input type="number" min="0" max="2" value="0" data-points></label>
        <label>Competitors <input type="number" min="0" max="2" value="0" data-points></label>
        <label>Marketing spend <input type="number" min="0" max="2" value="0" data-points></label>
        <label>Loomable <input type="number" min="0" max="2" value="0" data-points></label>
      </div>
      <label class="noteLabel">Reason <textarea data-notes placeholder="Why record, research more, or skip?"></textarea></label>
      <div class="result">
        <strong data-total>0/16</strong>
        <span data-priority>skip</span>
      </div>
      <div class="copyGrid">
        <button data-copy="${escapeHtml(`npm run prospect:contact-plan -- ${prospect.path}`)}">Contact Plan</button>
        <button data-copy="${escapeHtml(`npm run prospect:package -- ${prospect.path}`)}">Loom Package</button>
        <button data-copy="${escapeHtml(`npm run prospect:script -- ${prospect.path}`)}">Script</button>
      </div>
      <input type="hidden" data-path value="${escapeHtml(prospect.path)}" />
    </section>
`).join("\n");

const sheetTemplate = prospects.map((prospect) => `${prospect.path}|||`).join("\n");

const html = `<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>TinyStudio Lead Scoring Cockpit</title>
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
    h1 { margin: 0; font-size: 24px; letter-spacing: 0; }
    .sub, .meta { color: var(--muted); font-size: 14px; }
    main {
      width: min(1120px, calc(100% - 32px));
      margin: 24px auto 64px;
      display: grid;
      gap: 16px;
    }
    .panel, .prospect {
      border: 1px solid var(--line);
      background: var(--panel);
      border-radius: 8px;
      padding: 16px;
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
    h2 { margin: 0; font-size: 20px; letter-spacing: 0; }
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
    .scoreGrid, .copyGrid {
      display: grid;
      grid-template-columns: repeat(4, minmax(0, 1fr));
      gap: 8px;
      margin-top: 12px;
    }
    label {
      color: var(--muted);
      font-size: 13px;
      font-weight: 700;
    }
    input, textarea {
      width: 100%;
      border: 1px solid var(--line);
      border-radius: 6px;
      background: #fbfcfb;
      color: var(--ink);
      font: inherit;
      font-size: 14px;
      padding: 9px;
      margin-top: 5px;
    }
    textarea {
      min-height: 72px;
      resize: vertical;
    }
    .noteLabel { display: block; margin-top: 12px; }
    .result {
      display: flex;
      gap: 12px;
      align-items: center;
      margin-top: 12px;
      color: var(--accent);
    }
    .result.invalid { color: #9c2f20; }
    textarea#scoreSheet {
      min-height: 160px;
    }
    #copyStatus {
      display: inline-flex;
      margin-left: 10px;
      color: var(--muted);
      font-size: 13px;
    }
    @media (max-width: 860px) {
      .prospectHeader { flex-direction: column; }
      .scoreGrid, .copyGrid { grid-template-columns: 1fr; }
      .siteLink, button { width: 100%; }
    }
  </style>
</head>
<body>
  <header>
    <h1>TinyStudio Lead Scoring Cockpit</h1>
    <p class="sub">${prospects.length} unscored prospects. Score only enough to find the next recording batch.</p>
  </header>
  <main>
    <section class="panel">
      <strong>Workflow</strong>
      <ol>
        <li>Open each site and score the signals.</li>
        <li>Copy the scoring sheet.</li>
        <li>Run <code>npm run prospect:batch-score -- --from-clipboard</code>.</li>
        <li>Generate contact plans and Loom packages for priority record prospects.</li>
      </ol>
    </section>
    <section class="panel">
      <h2>Scoring Sheet</h2>
      <textarea id="scoreSheet" readonly>${escapeHtml(sheetTemplate)}</textarea>
      <button id="copySheet" type="button">Copy Sheet</button>
      <span id="copyStatus">Every row needs a reason before copy.</span>
    </section>
    ${rows || `<section class="panel"><h2>No unscored prospects</h2><p>Import or create more prospects when the current pipeline is clear.</p></section>`}
  </main>
  <script>
    function priority(score) {
      if (score >= 12) return "record";
      if (score >= 9) return "research-more";
      return "skip";
    }
    function cleanPoint(input) {
      const value = Math.max(0, Math.min(2, Number(input.value || 0)));
      input.value = String(value);
      return value;
    }
    function rowFor(section) {
      const path = section.querySelector("[data-path]").value;
      const score = Array.from(section.querySelectorAll("[data-points]"))
        .reduce((sum, input) => sum + cleanPoint(input), 0);
      const reason = section.querySelector("[data-notes]").value.trim().replace(/\\s+/g, " ");
      const result = section.querySelector(".result");
      result.classList.toggle("invalid", reason.length < 12);
      section.querySelector("[data-total]").textContent = score + "/16";
      section.querySelector("[data-priority]").textContent = reason.length < 12 ? "needs reason" : priority(score);
      return path + "|" + score + "/16|" + priority(score) + "|" + reason;
    }
    function refresh() {
      const sections = Array.from(document.querySelectorAll(".prospect"));
      document.getElementById("scoreSheet").value = sections.map(rowFor).join("\\n");
      const missingReasons = sections.filter((section) => section.querySelector("[data-notes]").value.trim().replace(/\\s+/g, " ").length < 12).length;
      document.getElementById("copyStatus").textContent = missingReasons
        ? missingReasons + " row(s) still need a specific reason."
        : "Ready to copy.";
      return missingReasons === 0;
    }
    for (const input of document.querySelectorAll("[data-points], [data-notes]")) {
      input.addEventListener("input", refresh);
    }
    for (const button of document.querySelectorAll("button[data-copy]")) {
      button.addEventListener("click", async () => navigator.clipboard.writeText(button.dataset.copy));
    }
    document.getElementById("copySheet").addEventListener("click", async () => {
      if (!refresh()) return;
      await navigator.clipboard.writeText(document.getElementById("scoreSheet").value);
    });
    refresh();
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
  prospects: prospects.length
}, null, 2));
