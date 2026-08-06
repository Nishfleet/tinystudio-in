#!/usr/bin/env node
import { existsSync, readFileSync, writeFileSync } from "node:fs";
import { join, relative } from "node:path";
import { execFileSync } from "node:child_process";
import { localIsoDate } from "./date-utils.mjs";
import { codeRoot, serviceRoot } from "./lib/runtime-roots.mjs";
import { resolveRepoPath } from "./lib/service-contract.mjs";
import { loadValidatedServiceClient } from "./lib/validated-service-client.mjs";

const args = process.argv.slice(2);
const clientPath = args[0];
const outputArg = args.find((arg) => arg.startsWith("--output="));
const repoRoot = serviceRoot;

if (!clientPath) {
  console.error("Usage: npm run client:cockpit -- clients/client-slug [--output=clients/client-slug/delivery-cockpit.html]");
  process.exit(1);
}

let resolvedClientPath;
try {
  resolvedClientPath = resolveRepoPath(repoRoot, clientPath);
} catch (error) {
  console.error(`Client folder is outside the service root: ${clientPath}`);
  process.exit(1);
}

if (!existsSync(resolvedClientPath)) {
  console.error(`Client folder not found: ${clientPath}`);
  process.exit(1);
}

const outputPath = outputArg ? resolveRepoPath(repoRoot, outputArg.split("=")[1]) : join(resolvedClientPath, "delivery-cockpit.html");

function read(relativePath) {
  const path = resolveRepoPath(repoRoot, join(resolvedClientPath, relativePath));
  return existsSync(path) ? readFileSync(path, "utf8") : "";
}

function runJson(commandArgs) {
  const [script, ...scriptArgs] = commandArgs;
  const output = execFileSync(process.execPath, [join(codeRoot, script), ...scriptArgs], {
    cwd: codeRoot,
    encoding: "utf8",
    env: { ...process.env, SERVICE_REPO_ROOT: repoRoot },
    stdio: ["ignore", "pipe", "pipe"]
  });
  return JSON.parse(output);
}

function field(content, label, fallback = "") {
  const escaped = label.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const match = content.match(new RegExp(`- ${escaped}[ \\t]*([^\\n]*)`));
  return match && match[1].trim() ? match[1].trim() : fallback;
}

function section(content, heading, fallback = "") {
  const escaped = heading.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const match = content.match(new RegExp(`## ${escaped}\\n+([\\s\\S]*?)(?:\\n## |$)`));
  return match ? match[1].trim() : fallback;
}

function escapeHtml(value) {
  return String(value)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function cleanMarkdown(value) {
  return String(value)
    .replace(/```[\s\S]*?```/g, "")
    .replace(/[#*_`]/g, "")
    .trim();
}

function fileStatus(relativePath) {
  const content = read(relativePath).trim();
  if (!content) return "missing";
  if (/:\s*$/m.test(content) || /-\s*$/m.test(content)) return "draft";
  return "filled";
}

const today = localIsoDate();
const intake = read("intake.md");
const sprintPlan = read("sprint-plan.md");
const kickoff = read("kickoff-message.md");
const delivery = read("deliverables/delivery.md");
let serviceClient;
try {
  serviceClient = loadValidatedServiceClient(repoRoot, resolvedClientPath);
} catch (error) {
  // Render a blocked cockpit when the repository queue cannot be validated.
  serviceClient = {
    ok: false,
    status: "blocked",
    blocked: [error instanceof Error ? error.message : String(error)],
    trackingEvidence: [],
    approvedArtifactProvenance: null,
    approvedDelivery: null,
    readyForHandoff: false
  };
}
const approvedDelivery = serviceClient.approvedDelivery;
const approvedArtifactPath = serviceClient.approvedArtifactProvenance?.path
  ? relative(resolvedClientPath, resolveRepoPath(repoRoot, serviceClient.approvedArtifactProvenance.path))
  : "deliverables/approved/pending.json";
const trackingEvidence = serviceClient.trackingEvidence[0]
  ? {
      path: relative(resolvedClientPath, resolveRepoPath(repoRoot, serviceClient.trackingEvidence[0].path)),
      value: serviceClient.trackingEvidence[0].value
    }
  : null;
const readiness = runJson(["scripts/check-client-readiness.mjs", resolvedClientPath]);

const name = field(intake, "Name:", clientPath.split("/").at(-1));
const website = field(intake, "Website:", "add website");
const approvalOwner = field(intake, "Approval owner:", "add approval owner");
const highestLeveragePage = approvedDelivery?.leakMap?.selectedPageUrl || field(sprintPlan, "Highest-leverage page:", "choose highest-leverage page");
const deliverables = approvedDelivery
  ? ["leak map", approvedDelivery.pageFix?.mode || "page fix", "search-trust basics", approvedDelivery.implementation?.route || "implementation", "before/after proof", "Loom", "measurement plan", "one revision", "14-day tracking"].join("\n")
  : cleanMarkdown(section(sprintPlan, "Deliverables", "- fill deliverables"));
const currentStatus = cleanMarkdown(section(sprintPlan, "Status", "- fill status"));
const kickoffBody = cleanMarkdown(section(kickoff, "Message", "Run client:kickoff to generate the kickoff message."));
const deliverySummary = approvedDelivery
  ? [
      `Selected page: ${approvedDelivery.leakMap?.selectedPageUrl || ""}`,
      `Reviewed fix: ${approvedDelivery.pageFix?.mode || ""} — ${approvedDelivery.pageFix?.rationale || ""}`,
      `Implementation: ${approvedDelivery.implementation?.route || ""}`,
      `Measurement: ${approvedDelivery.measurement?.metric || ""} from ${approvedDelivery.measurement?.baselineValue || ""}`,
      `Approved artifact: ${approvedArtifactPath}`
    ].join("\n")
  : cleanMarkdown(section(delivery, "Executive Summary", "No human-approved delivery artifact is available yet."));
const trackingSummary = trackingEvidence
  ? cleanMarkdown(JSON.stringify(trackingEvidence.value.signals || trackingEvidence.value, null, 2))
  : "Record service:evidence --stage tracking-14-day after implementation acceptance.";

const dayPlan = [
  ["Day 1", "Context and leak map", "Confirm the one page, evidence, baseline, and highest-priority leak."],
  ["Day 2", "Rewrite or redesign", "Prepare the highest-leverage page fix and search-trust basics."],
  ["Day 3", "Human claims review", "Review every claim, proof source, risk, and open question."],
  ["Day 4", "Implementation", "Complete one implementation pass or package the dev-ready handoff."],
  ["Day 5", "Before/after proof", "Capture the visible change and measurement baseline."],
  ["Day 6", "Client-facing review", "Package the work, Loom, measurement plan, and consolidated revision boundary."],
  ["Day 7", "Delivery", "Human-review the delivery and start 14-day implementation tracking."]
];

const files = [
  ["Intake", "intake.md"],
  ["Sprint Plan", "sprint-plan.md"],
  ["Kickoff", "kickoff-message.md"],
  ["Delivery", "deliverables/delivery.md"],
  ["Implementation Handoff", "deliverables/implementation-handoff.md"],
  ["Human-Approved Delivery", approvedArtifactPath],
  ["Day 0 Record", "service-day0.json"],
  ["14-Day Tracking Evidence", trackingEvidence ? trackingEvidence.path : "service-evidence/tracking-14-day/0.json"],
  ["Claim Ledger", "quality/claim-proof-ledger.md"],
  ["Delivery Scorecard", "quality/delivery-scorecard.md"],
  ["Acceptance Checklist", "quality/sprint-acceptance-checklist.md"],
  ["Brand Voice", "brain/brand-voice.md"],
  ["Competitors", "brain/competitors.md"],
  ["Website Notes", "brain/website-notes.md"]
];

const fileRows = files.map(([label, path]) => `
        <tr>
          <td>${escapeHtml(label)}</td>
          <td>${escapeHtml(fileStatus(path))}</td>
          <td><a href="${escapeHtml(path)}">${escapeHtml(path)}</a></td>
        </tr>
`).join("");

const dayCards = dayPlan.map(([day, title, action]) => `
      <section class="day">
        <p class="eyebrow">${escapeHtml(day)}</p>
        <h3>${escapeHtml(title)}</h3>
        <p>${escapeHtml(action)}</p>
      </section>
`).join("");

const warnings = [
  ...(readiness.missing || []),
  ...(readiness.warnings || []),
  ...(!serviceClient.ok ? [`Service evidence blocked: ${serviceClient.blocked.join("; ") || "canonical paid service record is unavailable"}`] : [])
];
const handoffReady = readiness.status === "ready" && serviceClient.ok && serviceClient.readyForHandoff;
const warningList = warnings.length
  ? warnings.map((warning) => `<li>${escapeHtml(warning)}</li>`).join("\n")
  : "<li>Ready enough for the next internal pass.</li>";

const commandBlock = `npm run client:kickoff -- ${clientPath}
npm run client:check -- ${clientPath}
npm run claims:check`;

const updateCopy = `Quick sprint update for ${name}:

- Highest-leverage page: ${highestLeveragePage}
- Status: [what changed today]
- Need from you: [approval/context/blocker]
- Next: [next sprint step]`;

const reviewedHandoffAction = approvedDelivery?.implementation?.artifact?.applyInstructions || "[specific action]";
const handoffCopy = `If you only do one thing this week, do this:

${reviewedHandoffAction}

This is the human-approved implementation or handoff for ${highestLeveragePage}.`;

const html = `<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>${escapeHtml(name)} Delivery Cockpit</title>
  <link rel="icon" href="data:," />
  <style>
    :root {
      color-scheme: light;
      --ink: #171717;
      --muted: #626866;
      --line: #d9ded8;
      --paper: #faf9f5;
      --panel: #ffffff;
      --accent: #0d6b57;
      --warn: #a34818;
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
      padding: 20px 24px;
    }
    h1 {
      margin: 0;
      font-size: 28px;
      letter-spacing: 0;
    }
    .sub {
      margin: 4px 0 0;
      color: var(--muted);
      font-size: 14px;
    }
    main {
      width: min(1160px, calc(100% - 32px));
      margin: 24px auto 64px;
      display: grid;
      gap: 16px;
    }
    .grid {
      display: grid;
      grid-template-columns: repeat(3, minmax(0, 1fr));
      gap: 12px;
    }
    .panel, .day {
      border: 1px solid var(--line);
      background: var(--panel);
      border-radius: 8px;
      padding: 16px;
    }
    .metric strong {
      display: block;
      font-size: 18px;
      margin-bottom: 4px;
    }
    .metric span, .muted {
      color: var(--muted);
      font-size: 14px;
    }
    h2 {
      margin: 0 0 12px;
      font-size: 18px;
      letter-spacing: 0;
    }
    h3 {
      margin: 0 0 8px;
      font-size: 16px;
      letter-spacing: 0;
    }
    .eyebrow {
      margin: 0 0 4px;
      color: var(--accent);
      font-size: 12px;
      font-weight: 700;
      text-transform: uppercase;
    }
    .dayGrid {
      display: grid;
      grid-template-columns: repeat(7, minmax(0, 1fr));
      gap: 8px;
    }
    table {
      width: 100%;
      border-collapse: collapse;
      font-size: 14px;
    }
    th, td {
      border-top: 1px solid var(--line);
      padding: 10px 8px;
      text-align: left;
      vertical-align: top;
    }
    th {
      color: var(--muted);
      font-weight: 700;
    }
    a { color: var(--accent); }
    .copyGrid {
      display: grid;
      grid-template-columns: repeat(3, minmax(0, 1fr));
      gap: 8px;
    }
    .reviewCheck {
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
    .reviewCheck:has(input:checked) {
      border-color: var(--accent);
      color: var(--ink);
      background: #f3faf6;
    }
    .copyEditor {
      display: grid;
      gap: 6px;
      margin: 12px 0;
      color: var(--muted);
      font-size: 13px;
      font-weight: 700;
    }
    .copyEditor textarea {
      min-height: 118px;
      border: 1px solid var(--line);
      border-radius: 6px;
      background: #fbfcfb;
      color: var(--ink);
      font: inherit;
      font-size: 14px;
      padding: 10px;
      resize: vertical;
    }
    button {
      appearance: none;
      border: 1px solid var(--line);
      border-radius: 6px;
      background: #f6f8f5;
      color: var(--ink);
      cursor: pointer;
      min-height: 38px;
      padding: 8px 10px;
      font: inherit;
      font-size: 13px;
    }
    button:hover { border-color: var(--accent); }
    pre {
      white-space: pre-wrap;
      overflow-wrap: anywhere;
      border: 1px solid var(--line);
      background: #fbfcfb;
      border-radius: 6px;
      padding: 12px;
      font-size: 13px;
      max-height: 260px;
      overflow: auto;
    }
    ul {
      margin: 0;
      padding-left: 22px;
    }
    li + li { margin-top: 6px; }
    .warn {
      border-left: 3px solid var(--warn);
      background: #fff7ed;
    }
    .toast {
      position: fixed;
      right: 16px;
      bottom: 16px;
      background: var(--ink);
      color: white;
      border-radius: 6px;
      padding: 10px 12px;
      opacity: 0;
      transform: translateY(8px);
      transition: 0.16s ease;
      font-size: 13px;
    }
    .toast.show {
      opacity: 1;
      transform: translateY(0);
    }
    @media (max-width: 1020px) {
      .grid, .copyGrid { grid-template-columns: 1fr; }
      .dayGrid { grid-template-columns: 1fr 1fr; }
      .reviewCheck { width: 100%; }
    }
    @media (max-width: 680px) {
      .dayGrid { grid-template-columns: 1fr; }
      table { display: block; overflow-x: auto; }
    }
  </style>
</head>
<body>
  <header>
    <h1>${escapeHtml(name)} Delivery Cockpit</h1>
    <p class="sub">Generated ${escapeHtml(today)}. Use this to run the paid sprint without losing the thread.</p>
  </header>
  <main>
    <section class="grid">
      <div class="panel metric"><strong>${escapeHtml(readiness.status)}</strong><span>readiness</span></div>
      <div class="panel metric"><strong>${escapeHtml(website)}</strong><span>website</span></div>
      <div class="panel metric"><strong>${escapeHtml(approvalOwner)}</strong><span>approval owner</span></div>
    </section>

    <section class="panel warn">
      <h2>Fix Before Handoff</h2>
      <ul>${warningList}</ul>
    </section>

    <section class="panel">
      <h2>Seven-Day Board</h2>
      <div class="dayGrid">${dayCards}</div>
    </section>

    <section class="panel">
      <h2>Files</h2>
      <table>
        <thead><tr><th>Artifact</th><th>Status</th><th>Open</th></tr></thead>
        <tbody>${fileRows}</tbody>
      </table>
    </section>

    <section class="panel">
      <h2>Copy Blocks</h2>
      <label class="copyEditor" for="client-update-copy">
        <span>Client update</span>
        <textarea id="client-update-copy">${escapeHtml(updateCopy)}</textarea>
      </label>
      <label class="copyEditor" for="handoff-copy">
        <span>Handoff note</span>
        <textarea id="handoff-copy">${escapeHtml(handoffCopy)}</textarea>
      </label>
      <div class="copyGrid">
        <button data-copy="${escapeHtml(commandBlock)}">Copy Commands</button>
        <button data-reviewed-source="client-update-copy" data-confirm-for="client-update-reviewed" data-no-placeholders="yes">Copy Client Update</button>
        <button data-reviewed-source="handoff-copy" data-confirm-for="handoff-reviewed" data-no-placeholders="yes" data-ready="${handoffReady ? "yes" : "no"}">Copy Handoff Note</button>
      </div>
      <label class="reviewCheck" for="client-update-reviewed">
        <input type="checkbox" id="client-update-reviewed" />
        <span>Client update reviewed</span>
      </label>
      <label class="reviewCheck" for="handoff-reviewed">
        <input type="checkbox" id="handoff-reviewed" />
        <span>Handoff reviewed</span>
      </label>
      <p class="muted">Client copy is blocked until reviewed and placeholders are replaced. Handoff copy is also blocked until client readiness is clean.</p>
    </section>

    <section class="grid">
      <div class="panel">
        <h2>Highest-Leverage Page</h2>
        <pre>${escapeHtml(highestLeveragePage)}</pre>
      </div>
      <div class="panel">
        <h2>Deliverables</h2>
        <pre>${escapeHtml(deliverables)}</pre>
      </div>
      <div class="panel">
        <h2>Status</h2>
        <pre>${escapeHtml(currentStatus)}</pre>
      </div>
    </section>

    <section class="grid">
      <div class="panel">
        <h2>Kickoff Message</h2>
        <pre>${escapeHtml(kickoffBody)}</pre>
      </div>
      <div class="panel">
        <h2>Delivery Summary</h2>
        <pre>${escapeHtml(deliverySummary)}</pre>
      </div>
      <div class="panel">
        <h2>14-Day Tracking</h2>
        <pre>${escapeHtml(trackingSummary)}</pre>
      </div>
    </section>
  </main>
  <div class="toast" id="toast">Copied</div>
  <script>
    const toast = document.getElementById("toast");
    function showToast(text, delay = 1200) {
      toast.textContent = text;
      toast.classList.add("show");
      window.setTimeout(() => toast.classList.remove("show"), delay);
    }
    function reviewedValue(button) {
      if (!button.dataset.reviewedSource) return button.dataset.reviewedCopy || "";
      return document.getElementById(button.dataset.reviewedSource)?.value || "";
    }
    function focusReviewedSource(button) {
      if (!button.dataset.reviewedSource) return;
      document.getElementById(button.dataset.reviewedSource)?.focus();
    }
    function hasPlaceholder(value) {
      return /\\[[^\\]]+\\]|\\badd (?:meeting link|payment link|call time)\\b/i.test(value);
    }
    document.querySelectorAll("[data-copy]").forEach((button) => {
      button.addEventListener("click", async () => {
        await navigator.clipboard.writeText(button.dataset.copy || "");
        showToast("Copied", 1000);
      });
    });
    document.querySelectorAll("[data-reviewed-copy], [data-reviewed-source]").forEach((button) => {
      button.addEventListener("click", async () => {
        const confirm = document.getElementById(button.dataset.confirmFor);
        if (button.dataset.ready === "no") {
          showToast("Fix handoff warnings first");
          return;
        }
        if (!confirm || !confirm.checked) {
          if (confirm) confirm.focus();
          showToast("Review before copying");
          return;
        }
        const copy = reviewedValue(button);
        if (button.dataset.noPlaceholders === "yes" && hasPlaceholder(copy)) {
          focusReviewedSource(button);
          showToast("Replace placeholders first");
          return;
        }
        await navigator.clipboard.writeText(copy);
        showToast("Copied", 1000);
      });
    });
  </script>
</body>
</html>
`;

writeFileSync(outputPath, html);

console.log(JSON.stringify({
  status: "created",
  clientPath,
  path: outputPath,
  readiness: readiness.status,
  warnings: warnings.length
}, null, 2));
