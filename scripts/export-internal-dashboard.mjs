#!/usr/bin/env node
import { existsSync, mkdirSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { localIsoDate } from "./date-utils.mjs";
import { sendChannelGuidance } from "./lib/send-channel-guidance.mjs";
import { listOutboundProspectFolders } from "./lib/outbound-prospects.mjs";
import { codeRoot, runRepoJson as runJson, serviceRoot } from "./lib/runtime-roots.mjs";
import { handleHelp, resolveOutputPath } from "./lib/operator-cli.mjs";

handleHelp(process.argv.slice(2), `Usage: npm run growth:dashboard -- [--plain] [--output=runs/internal-dashboard.md] [--html=runs/internal-dashboard.html]`);
const outputArg = process.argv.find((arg) => arg.startsWith("--output="));
const htmlArg = process.argv.find((arg) => arg.startsWith("--html="));
const plain = process.argv.includes("--plain");
const today = localIsoDate();
const outputPath = resolveOutputPath(outputArg?.split("=")[1], { fallback: "runs/internal-dashboard.md" });
const htmlPath = resolveOutputPath(htmlArg?.split("=")[1], { flag: "--html", fallback: "runs/internal-dashboard.html" });

function htmlEscape(value) {
  return String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;");
}

function displayText(value) {
  return String(value ?? "").replace(/\*\*/g, "");
}

function pill(status) {
  if (["ready", "pass", "11-10-ready", "healthy", "sent-proof-captured"].includes(status)) return "good";
  if (["warn", "warning", "watch", "commercially-conditional", "attention-needed", "proof-run-active", "ready-for-send-prep", "ready-to-mark-sent", "delivery-proof-ready"].includes(status)) return "warn";
  return "bad";
}

function write(path, content) {
  const dir = dirname(path);
  if (dir) mkdirSync(dir, { recursive: true });
  writeFileSync(path, content);
}

function readJson(path, fallback = {}) {
  if (!existsSync(path)) return fallback;
  try {
    return JSON.parse(readFileSync(path, "utf8"));
  } catch {
    return fallback;
  }
}

const doctor = runJson(["scripts/export-growth-doctor.mjs"]);
const metrics = runJson(["scripts/export-growth-metrics.mjs"]);
let serviceQueue;
try { serviceQueue = runJson(["scripts/run-review-queue.mjs", "--dry-run", "--scope", "all"]); }
catch (error) {
  const output = String(error.stderr || error.message || "");
  serviceQueue = { items: [], counts: { blocked: 1 }, error: output.match(/service:queue failed:[^\n]*/)?.[0] || "service queue validation failed" };
}
const parityScratchPath = `runs/.internal-dashboard-parity-${process.pid}.md`;
let parity;
try {
  parity = runJson(["scripts/check-market-parity-readiness.mjs", "--skip-kit", `--output=${parityScratchPath}`]);
} finally {
  rmSync(join(serviceRoot, parityScratchPath), { force: true });
}
const todayView = runJson(["scripts/show-growth-command-center.mjs", "--limit=12"]);
const marketProof = existsSync(join(serviceRoot, "prospects/loom-links.txt"))
  ? runJson(["scripts/export-market-proof-cockpit.mjs"])
  : {
      checkStatus: "awaiting-proof-run",
      sentProofRows: 0,
      rows: 0,
      htmlPath: "runs/market-proof-cockpit.html"
    };
const marketLearning = runJson(["scripts/export-market-learning-review.mjs"]);
const rehearsal = runJson(["scripts/export-recording-rehearsal-check.mjs"]);
const senderGuide = runJson(["scripts/export-sender-setup-guide.mjs"]);
const channelGuidance = sendChannelGuidance();
const serviceQueueAttention = (serviceQueue.items || []).filter((item) => !["complete", "declined"].includes(item.state)).length;
const serviceQueueBlocked = serviceQueue.counts?.blocked || 0;
const clientIntegrityBlocked = metrics.counts.clientsBlocked || 0;
const pausedProspectNames = listOutboundProspectFolders(join(serviceRoot, "prospects"))
  .map((basePath) => {
    const pipeline = readJson(`${basePath}/pipeline.json`);
    if (!["lost", "paused", "won"].includes(pipeline.stage)) return "";
    const metadata = readJson(`${basePath}/metadata.json`);
    return metadata.name || "";
  })
  .filter(Boolean);

function referencesInactiveProspect(value) {
  return pausedProspectNames.some((name) => String(value || "").includes(name));
}

function referencesRetiredOwnedWorkflow(value) {
  return /owned[- ](?:product|startup)/i.test(String(value || ""));
}

function canonicalTaskText(value) {
  const text = String(value || "");
  if (referencesRetiredOwnedWorkflow(text) || /build intake form|weekly report automation/i.test(text)) return "";
  return text
    .replace(
      /create a client folder, run the sprint, and update the client brain/i,
      "import the consented application, complete human fit approval and paid Day 0, then run the human-review service queue"
    )
    .replace(
      /use the buyer room, proposal, and follow-up sequence/i,
      "move a consented application through human fit review and canonical founder-pilot close prep"
    );
}

function officialParityScore(fallbackScore, fallbackTotal) {
  const fallback = `${fallbackScore}/${fallbackTotal} full-pass areas`;
  const path = join(serviceRoot, "growth-brain/ops/market-parity-readiness.md");
  if (!existsSync(path)) {
    return { score: fallbackScore, total: fallbackTotal, label: fallback };
  }
  const content = readFileSync(path, "utf8");
  const match = content.match(/(\d+)\/(\d+) full-pass areas/);
  return match
    ? { score: Number(match[1]), total: Number(match[2]), label: `${match[1]}/${match[2]} full-pass areas` }
    : { score: fallbackScore, total: fallbackTotal, label: fallback };
}

const parityScore = officialParityScore(parity.score, parity.total);
const parityScoreLabel = parityScore.label;

const checks = [
  ["Workflow", doctor.status, doctor.status === "ready" ? "Core checks are clean" : doctor.checks?.find((check) => check.status !== "pass")?.detail || "Needs attention"],
  ["Money bottleneck", doctor.view, doctor.mission],
  ["Service delivery", serviceQueueBlocked || metrics.counts.clientsBlocked ? "attention-needed" : "ready", `${serviceQueueAttention} active item(s); ${serviceQueueBlocked} queue blocked; ${metrics.counts.clientsBlocked} client record(s) blocked by canonical validation`],
  ["Market proof cockpit", marketProof.checkStatus, `${marketProof.sentProofRows}/5 sent proof rows; ${marketProof.rows} tangible improvement rows`],
  ["Sender trust", senderGuide.senderStatus, channelGuidance.emailReady ? channelGuidance.rule : `${channelGuidance.rule} Warnings: ${channelGuidance.warnings.join("; ")}`],
  ["Recording rehearsal", rehearsal.status, `${rehearsal.count} script(s); minimum ${rehearsal.minimumScore}/10`],
  ["Market learning", marketLearning.status, `next: ${marketLearning.nextCommand}`],
  ["11/10 proof", parity.status, parityScoreLabel]
];

const counts = metrics.counts;
const cards = [
  ["Scored", counts.scored],
  ["Looms", counts.loomsRecorded],
  ["Sends", counts.sends],
  ["Replies", counts.replies],
  ["Calls", counts.calls],
  ["Closed", counts.closed],
  ["Clients", counts.clients],
  ["Client records blocked", counts.clientsBlocked],
  ["Due follow-up", counts.dueFollowUp]
];

const blockerRows = parity.blockers?.length
  ? parity.blockers.map((blocker) => `| ${blocker.area} | ${blocker.evidence} | \`${parityBlockerCommand(blocker.area)}\` |`).join("\n")
  : "| - | No parity blockers. | - |";

function actionPriority(item) {
  if (/owned-startup proof|proof claims/i.test(item)) return "P2";
  if (/reply|call|close|won|payment|approved/i.test(item)) return "P0";
  if (/follow-up|followup|send|Loom|record/i.test(item)) return "P0";
  if (/Client:/i.test(item)) return "P1";
  return "P2";
}

function actionCommand(item) {
  const clientMatch = item.match(/Client:\s*([a-z0-9-]+)/i);
  if (/owned-product live signals|live signal/i.test(item)) return "npm run service:queue -- --scope all";
  if (/owned-product business metrics|business metrics/i.test(item)) return "npm run service:queue -- --scope all";
  if (/owned-product current metrics|current metrics|owned:case-studies|case stud/i.test(item)) return "npm run service:queue -- --scope all";
  if (/market learning|market:learn|learning review/i.test(item)) return "npm run market:learn";
  if (/recording rehearsal|rehearsal/i.test(item)) return "npm run prospect:rehearsal -- --limit=5";
  if (/handoff Loom acceptance|sprint acceptance/i.test(item)) {
    return clientMatch
      ? `npm run client:acceptance -- clients/${clientMatch[1]} --dry-run`
      : "npm run service:queue -- --scope all";
  }
  if (/Client:/i.test(item) && /Sprint acceptance checklist/i.test(item) && clientMatch) {
    const clientPath = `clients/${clientMatch[1]}`;
    return `npm run client:acceptance -- ${clientPath} --dry-run`;
  }
  if (clientMatch && /claim[- ]proof|proof claims|claim-proof ledger/i.test(item)) return `npm run client:proof-review -- clients/${clientMatch[1]} --dry-run`;
  if (/owned-startup proof|proof claims/i.test(item)) return "npm run service:queue -- --scope all";
  if (/reply-prep/i.test(item)) return "npm run prospect:reply-prep -- prospects/prospect-slug";
  if (/close-prep/i.test(item)) return "npm run prospect:close-prep -- prospects/prospect-slug";
  if (/Close first paid sprint/i.test(item)) return "npm run growth:start -- --view=sales";
  if (/consented application|paid Day 0|human-review service queue/i.test(item)) return "npm run service:queue -- --scope all";
  if (/follow-up|followup/i.test(item)) return "npm run prospect:followups";
  if (/send-package|mark the prospect sent|ready/i.test(item) && /Prospect:/i.test(item)) return "npm run prospect:outbox";
  if (/Record|Loom|teleprompter/i.test(item)) return "npm run growth:start -- --view=record";
  if (/prep-recording/i.test(item)) return "npm run prospect:prep-recording -- --limit=5";
  if (/Client:/i.test(item) && /weekly|Growth Desk/i.test(item)) return "npm run service:queue -- --scope all";
  if (/Client:/i.test(item)) return "npm run client:cockpit -- clients/client-slug";
  if (/Task:/i.test(item)) return "See TASKS.md";
  return doctor.nextCommand;
}

function parityBlockerCommand(area) {
  if (area === "Sender trust") return "npm run send:configure -- --physical-address=\"...\" --dkim-selector=... --dry-run";
  if (area === "Market proof") return "npm run growth:start -- --view=record";
  if (area === "Sales proof") return "npm run growth:start -- --view=sales";
  if (area === "Delivery proof") return "npm run service:queue -- --scope all";
  if (area === "Retention proof") return "npm run service:queue -- --scope all";
  return "npm run market:parity";
}

const actionItems = [
  {
    priority: "P0",
    item: doctor.mission,
    command: doctor.nextCommand,
    why: "Current bottleneck"
  },
  ...(senderGuide.senderStatus === "pass" ? [] : [{
    priority: "P1",
    item: `Sender setup: ${channelGuidance.warnings.join("; ") || "sender setup needs review"}. Use ${channelGuidance.recommendedChannel} for now.`,
    command: "npm run send:guide",
    why: "Sender trust blocker"
  }]),
  ...(todayView.todayFocus || []).map(canonicalTaskText).filter((item) => item && !referencesInactiveProspect(item)).map((item) => ({
    priority: actionPriority(item),
    item,
    command: actionCommand(item),
    why: /^Task:/i.test(item) ? "Open task" : "Pending action"
  })),
  ...(parity.blockers || []).slice(0, 5).map((blocker) => ({
    priority: blocker.area === "Sender trust" ? "P1" : "P0",
    item: `${blocker.area}: ${blocker.evidence}`,
    command: parityBlockerCommand(blocker.area),
    why: "11/10 blocker"
  }))
];

if (rehearsal.status !== "ready") {
  actionItems.splice(1, 0, {
    priority: "P0",
    item: `Recording rehearsal: ${rehearsal.count} script(s), minimum ${rehearsal.minimumScore}/10`,
    command: "npm run prospect:rehearsal -- --limit=5",
    why: "Pre-recording quality gate"
  });
}

if (serviceQueueAttention > 0) {
  actionItems.splice(1, 0, {
    priority: serviceQueueBlocked ? "P1" : "P2",
    item: `Service delivery queue: ${serviceQueueAttention} active item(s), ${serviceQueueBlocked} blocked`,
    command: "npm run service:queue -- --scope all",
    why: "Human-reviewed service delivery"
  });
}

const seenActions = new Set();
const dedupedActions = actionItems.filter((action) => {
  const key = `${action.item}|${action.command}`;
  if (seenActions.has(key)) return false;
  seenActions.add(key);
  return true;
}).slice(0, 14);

const actionRows = dedupedActions.length
  ? dedupedActions.map((action) => `| ${action.priority} | ${action.item} | \`${action.command}\` | ${action.why} |`).join("\n")
  : "| - | No pending actions. | - | - |";

function parseTaskSection(title) {
  const path = join(existsSync(join(serviceRoot, "TASKS.md")) ? serviceRoot : codeRoot, "TASKS.md");
  if (!existsSync(path)) return [];
  const content = readFileSync(path, "utf8");
  const escaped = title.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const match = content.match(new RegExp(`## ${escaped}\\n([\\s\\S]*?)(?:\\n## |$)`));
  if (!match) return [];
  return match[1]
    .split("\n")
    .map((line) => line.trim())
    .filter((line) => line.startsWith("- [ ]"))
    .filter((line) => !referencesInactiveProspect(line))
    .map((line) => canonicalTaskText(line.replace(/^- \[ \]\s*/, "")))
    .filter(Boolean);
}

function taskCommand(task, bucket) {
  const clientMatch = task.match(/Client:\s*([a-z0-9-]+)/i);
  if (/owned-product live signals|live signal/i.test(task)) return "npm run service:queue -- --scope all";
  if (/owned-product business metrics|business metrics/i.test(task)) return "npm run service:queue -- --scope all";
  if (/owned-product current metrics|current metrics|owned:case-studies|case stud/i.test(task)) return "npm run service:queue -- --scope all";
  if (/market learning|market:learn|learning review/i.test(task)) return "npm run market:learn";
  if (/handoff Loom acceptance|sprint acceptance/i.test(task)) {
    return clientMatch
      ? `npm run client:acceptance -- clients/${clientMatch[1]} --dry-run`
      : "npm run service:queue -- --scope all";
  }
  if (clientMatch && /claim[- ]proof|proof claims|claim-proof ledger/i.test(task)) return `npm run client:proof-review -- clients/${clientMatch[1]} --dry-run`;
  if (/owned-startup proof|proof claims/i.test(task)) return "npm run service:queue -- --scope all";
  if (/Close first paid sprint/i.test(task)) return "npm run growth:start -- --view=sales";
  if (/consented application|paid Day 0|human-review service queue/i.test(task)) return "npm run service:queue -- --scope all";
  if (/loom|record/i.test(task)) return "npm run growth:start -- --view=record";
  if (/close|paid sprint|buyer room|proposal/i.test(task)) return "npm run growth:start -- --view=sales";
  if (/deliver|client folder|client brain|client data|retention|weekly/i.test(task)) return "npm run service:queue -- --scope all";
  if (/intake|client/i.test(task)) return "npm run service:queue -- --scope all";
  if (/buyer room|pdf|\bsite\b/i.test(task)) return "npm run prospect:close-prep -- prospects/prospect-slug";
  return bucket === "Backlog" ? "See TASKS.md" : doctor.nextCommand;
}

const taskBuckets = [
  ["Active", "P0", parseTaskSection("Active")],
  ["Waiting On", "P1", parseTaskSection("Waiting On")],
  ["Backlog", "P2", parseTaskSection("Someday")]
];

const taskList = taskBuckets.flatMap(([bucket, priority, tasks]) =>
  tasks.slice(0, bucket === "Backlog" ? 5 : 6).map((task) => ({
    bucket,
    priority,
    task,
    command: taskCommand(task, bucket)
  }))
);

const todoRows = taskList.length
  ? taskList.map((task) => `| ${task.bucket} | ${task.priority} | ${task.task} | \`${task.command}\` |`).join("\n")
  : "| Clear | - | No open tasks in TASKS.md. | - |";

const markdown = `# Internal Dashboard

Generated: ${today}

This is the concise owner view. It pulls together the sales bottleneck, current funnel, client retention risk, and 11/10 proof gate.

## Next Move

${doctor.mission}

\`\`\`bash
${doctor.nextCommand}
\`\`\`

## Status

| Area | Status | Detail |
|---|---|---|
${checks.map(([area, status, detail]) => `| ${area} | ${status} | ${detail} |`).join("\n")}

## Funnel

| Metric | Count |
|---|---:|
${cards.map(([label, value]) => `| ${label} | ${value} |`).join("\n")}

## Next / Pending Actions

| Priority | Action | Command | Why |
|---|---|---|---|
${actionRows}

## To-Do List

| Bucket | Priority | Task | Command |
|---|---|---|---|
${todoRows}

## 11/10 Blockers

| Area | Evidence | Command |
|---|---|---|
${blockerRows}

## Dashboards

- Internal dashboard: \`${htmlPath}\`
- Recording rehearsal: \`${rehearsal.htmlPath}\`
- Sender setup: \`${senderGuide.htmlPath}\`
- Market proof cockpit: \`${marketProof.htmlPath}\`
- Market learning review: \`${marketLearning.htmlPath}\`
- Growth doctor: \`${doctor.path}\`
- Live metrics: \`${metrics.path}\`
- Market parity: \`growth-brain/ops/market-parity-readiness.md\`
`;

const checkRowsHtml = checks.map(([area, status, detail]) => `
        <tr>
          <td>${htmlEscape(area)}</td>
          <td><span class="pill ${pill(status)}">${htmlEscape(status)}</span></td>
          <td>${htmlEscape(detail)}</td>
        </tr>`).join("");

const cardHtml = cards.map(([label, value]) => `
      <div class="card"><b>${htmlEscape(value)}</b><span>${htmlEscape(label)}</span></div>`).join("");

const blockerHtml = parity.blockers?.length
  ? parity.blockers.map((blocker) => `
        <tr><td>${htmlEscape(blocker.area)}</td><td>${htmlEscape(blocker.evidence)}</td><td><code>${htmlEscape(parityBlockerCommand(blocker.area))}</code></td></tr>`).join("")
  : `<tr><td>No blockers</td><td>The parity gate is clear.</td><td>-</td></tr>`;

const actionHtml = dedupedActions.length
  ? dedupedActions.map((action) => `
        <tr>
          <td><span class="pill ${action.priority === "P0" ? "bad" : action.priority === "P1" ? "warn" : "good"}">${htmlEscape(action.priority)}</span></td>
          <td>${htmlEscape(displayText(action.item))}</td>
          <td><code>${htmlEscape(action.command)}</code></td>
          <td>${htmlEscape(action.why)}</td>
        </tr>`).join("")
  : `<tr><td>-</td><td>No pending actions.</td><td>-</td><td>-</td></tr>`;

const todoHtml = taskList.length
  ? taskList.map((task) => `
        <tr>
          <td>${htmlEscape(task.bucket)}</td>
          <td><span class="pill ${task.priority === "P0" ? "bad" : task.priority === "P1" ? "warn" : "good"}">${htmlEscape(task.priority)}</span></td>
          <td>${htmlEscape(displayText(task.task))}</td>
          <td><code>${htmlEscape(task.command)}</code></td>
        </tr>`).join("")
  : `<tr><td>Clear</td><td>-</td><td>No open tasks in TASKS.md.</td><td>-</td></tr>`;

const html = `<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>TinyStudio Internal Dashboard</title>
  <style>
    :root { color-scheme: light; --ink:#14161a; --muted:#667085; --line:#d9e1ea; --paper:#f7f9fc; --good:#0f7b45; --warn:#9a5b00; --bad:#b42318; }
    * { box-sizing: border-box; }
    body { margin: 0; background: #fff; color: var(--ink); font-family: Inter, ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif; }
    main { max-width: 1160px; margin: 0 auto; padding: 28px 18px 44px; }
    header { display: grid; grid-template-columns: 1fr auto; gap: 18px; align-items: end; padding-bottom: 18px; border-bottom: 1px solid var(--line); }
    h1 { margin: 0; font-size: clamp(30px, 4vw, 46px); line-height: 1; letter-spacing: 0; }
    p { color: var(--muted); margin: 8px 0 0; max-width: 760px; }
    .date { color: var(--muted); font-size: 14px; text-align: right; white-space: nowrap; }
    .next { margin: 20px 0; padding: 18px; border: 1px solid var(--line); border-radius: 8px; background: var(--paper); }
    .next h2, section h2 { margin: 0 0 10px; font-size: 18px; }
    code { font-family: ui-monospace, SFMono-Regular, Menlo, Consolas, monospace; }
    .command { display: inline-block; margin-top: 10px; padding: 8px 10px; background: #fff; border: 1px solid var(--line); border-radius: 6px; color: #344054; }
    .cards { display: grid; grid-template-columns: repeat(4, minmax(0, 1fr)); gap: 12px; margin: 18px 0; }
    .card { min-height: 76px; border: 1px solid var(--line); border-radius: 8px; background: var(--paper); padding: 13px; }
    .card b { display:block; font-size: 27px; line-height: 1; margin-bottom: 8px; }
    .card span { color: var(--muted); font-size: 13px; }
    table { width: 100%; border-collapse: collapse; border: 1px solid var(--line); border-radius: 8px; overflow: hidden; margin-bottom: 18px; }
    th, td { text-align: left; padding: 12px; border-bottom: 1px solid var(--line); vertical-align: top; }
    th { background: var(--paper); color: #475467; font-size: 12px; text-transform: uppercase; letter-spacing: .04em; }
    .pill { display: inline-flex; border-radius: 999px; padding: 4px 8px; color: white; font-size: 12px; font-weight: 800; text-transform: uppercase; letter-spacing: .03em; }
    .good { background: var(--good); }
    .warn { background: var(--warn); }
    .bad { background: var(--bad); }
    .links { color: var(--muted); font-size: 14px; }
    @media (max-width: 760px) {
      header { display:block; }
      .date { text-align:left; margin-top: 10px; }
      .cards { grid-template-columns: repeat(2, minmax(0, 1fr)); }
      table { display: block; overflow-x: auto; }
    }
  </style>
</head>
<body>
  <main>
    <header>
      <div>
        <h1>Internal Dashboard</h1>
        <p>One concise owner view: what matters, what is blocked, and what to do next.</p>
      </div>
      <div class="date">Generated ${htmlEscape(today)}</div>
    </header>
    <section class="next">
      <h2>Next Move</h2>
      <div>${htmlEscape(doctor.mission)}</div>
      <code class="command">${htmlEscape(doctor.nextCommand)}</code>
    </section>
    <section class="cards">${cardHtml}
    </section>
    <section>
      <h2>Status</h2>
      <table><thead><tr><th>Area</th><th>Status</th><th>Detail</th></tr></thead><tbody>${checkRowsHtml}
      </tbody></table>
    </section>
    <section>
      <h2>Next / Pending Actions</h2>
      <table><thead><tr><th>Priority</th><th>Action</th><th>Command</th><th>Why</th></tr></thead><tbody>${actionHtml}
      </tbody></table>
    </section>
    <section>
      <h2>To-Do List</h2>
      <table><thead><tr><th>Bucket</th><th>Priority</th><th>Task</th><th>Command</th></tr></thead><tbody>${todoHtml}
      </tbody></table>
    </section>
    <section>
      <h2>11/10 Blockers</h2>
      <table><thead><tr><th>Area</th><th>Evidence</th><th>Command</th></tr></thead><tbody>${blockerHtml}
      </tbody></table>
    </section>
    <p class="links">Sender setup: ${htmlEscape(senderGuide.htmlPath)} · Market proof cockpit: ${htmlEscape(marketProof.htmlPath)} · Growth doctor: ${htmlEscape(doctor.path)} · Market parity: growth-brain/ops/market-parity-readiness.md</p>
  </main>
</body>
</html>
`;

write(outputPath, markdown);
write(htmlPath, html);

const result = {
  status: doctor.status === "blocked" || parity.status === "not-11-10-yet" || serviceQueueBlocked > 0 || clientIntegrityBlocked > 0 ? "attention-needed" : "ready",
  path: outputPath,
  htmlPath,
  date: today,
  nextCommand: doctor.nextCommand,
  mission: doctor.mission,
  counts,
  actions: dedupedActions,
  tasks: taskList,
  serviceQueue: {
    status: serviceQueueBlocked > 0 || clientIntegrityBlocked > 0 ? "attention-needed" : "ready",
    active: serviceQueueAttention,
    blocked: serviceQueueBlocked,
    clientsBlocked: clientIntegrityBlocked,
    error: serviceQueue.error || "",
    counts: serviceQueue.counts || {}
  },
  marketProof: {
    status: marketProof.checkStatus,
    path: marketProof.path,
    htmlPath: marketProof.htmlPath,
    rows: marketProof.rows,
    sentProofRows: marketProof.sentProofRows
  },
  sender: {
    status: senderGuide.senderStatus,
    recommendedChannel: channelGuidance.recommendedChannel,
    guidePath: senderGuide.path,
    guideHtmlPath: senderGuide.htmlPath,
    warnings: channelGuidance.warnings
  },
  parity: {
    status: parity.status,
    score: parityScore.score,
    total: parityScore.total,
    display: parityScoreLabel
  }
};

console.log(plain ? `${result.status}: ${doctor.mission} Next: ${doctor.nextCommand}` : JSON.stringify(result, null, 2));
