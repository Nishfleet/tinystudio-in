#!/usr/bin/env node
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { execFileSync } from "node:child_process";
import { localIsoDate } from "./date-utils.mjs";
import { sendChannelGuidance } from "./lib/send-channel-guidance.mjs";

const outputArg = process.argv.find((arg) => arg.startsWith("--output="));
const htmlArg = process.argv.find((arg) => arg.startsWith("--html="));
const plain = process.argv.includes("--plain");
const today = localIsoDate();
const outputPath = outputArg ? outputArg.split("=")[1] : "growth-brain/ops/internal-dashboard.md";
const htmlPath = htmlArg ? htmlArg.split("=")[1] : "growth-brain/ops/internal-dashboard.html";

function runJson(args) {
  const output = execFileSync("node", args, {
    encoding: "utf8",
    stdio: ["ignore", "pipe", "pipe"]
  });
  return JSON.parse(output);
}

function htmlEscape(value) {
  return String(value || "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;");
}

function pill(status) {
  if (["ready", "pass", "11-10-ready", "healthy", "sent-proof-captured"].includes(status)) return "good";
  if (["warn", "warning", "watch", "commercially-conditional", "attention-needed", "proof-run-active", "ready-for-send-prep", "ready-to-mark-sent", "delivery-proof-ready"].includes(status)) return "warn";
  return "bad";
}

function write(path, content) {
  const dir = path.split("/").slice(0, -1).join("/");
  if (dir) mkdirSync(dir, { recursive: true });
  writeFileSync(path, content);
}

const doctor = runJson(["scripts/export-growth-doctor.mjs"]);
const metrics = runJson(["scripts/export-growth-metrics.mjs"]);
const retention = runJson(["scripts/export-retention-checkups.mjs"]);
const parity = runJson(["scripts/check-market-parity-readiness.mjs", "--skip-kit", "--output=/tmp/tinystudio-internal-dashboard-parity.md"]);
const todayView = runJson(["scripts/show-growth-command-center.mjs", "--limit=12"]);
const marketProof = runJson(["scripts/export-market-proof-cockpit.mjs"]);
const marketLearning = runJson(["scripts/export-market-learning-review.mjs"]);
const ownedHandoff = runJson(["scripts/export-owned-handoff-loom-cockpit.mjs"]);
const ownedCaseStudies = runJson(["scripts/export-owned-product-case-studies.mjs"]);
const rehearsal = runJson(["scripts/export-recording-rehearsal-check.mjs"]);
const senderGuide = runJson(["scripts/export-sender-setup-guide.mjs"]);
const channelGuidance = sendChannelGuidance();
const ownedDeliveryReadyCount = (ownedCaseStudies.packets || []).filter((packet) => ["case-study-ready", "delivery-proof-ready"].includes(packet.status)).length;
const ownedBusinessReadyCount = (ownedCaseStudies.packets || []).filter((packet) => packet.status === "case-study-ready").length;
const ownedNeedsMetricCount = (ownedCaseStudies.packets || []).filter((packet) => packet.status === "needs-current-metric").length;

function officialParityScore(fallbackScore, fallbackTotal) {
  const fallback = `${fallbackScore}/${fallbackTotal} full-pass areas`;
  if (!existsSync("growth-brain/ops/market-parity-readiness.md")) {
    return { score: fallbackScore, total: fallbackTotal, label: fallback };
  }
  const content = readFileSync("growth-brain/ops/market-parity-readiness.md", "utf8");
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
  ["Retention", retention.status, `${retention.weeklyReady}/${retention.clients} weekly reports ready; ${retention.highRisk} high-risk client(s)`],
  ["Market proof cockpit", marketProof.checkStatus, `${marketProof.sentProofRows}/5 sent proof rows; ${marketProof.rows} tangible improvement rows`],
  ["Sender trust", senderGuide.senderStatus, channelGuidance.emailReady ? channelGuidance.rule : `${channelGuidance.rule} Warnings: ${channelGuidance.warnings.join("; ")}`],
  ["Recording rehearsal", rehearsal.status, `${rehearsal.count} script(s); minimum ${rehearsal.minimumScore}/10`],
  ["Market learning", marketLearning.status, `next: ${marketLearning.nextCommand}`],
  ["Owned handoff", ownedHandoff.status, `${ownedHandoff.readyToRecord}/${ownedHandoff.clients} owned proof handoff(s) ready to record`],
  ["Owned case studies", ownedCaseStudies.status, `${ownedDeliveryReadyCount}/${(ownedCaseStudies.packets || []).length} delivery-proof ready; ${ownedBusinessReadyCount}/${(ownedCaseStudies.packets || []).length} business-metric ready; ${ownedNeedsMetricCount} need metric`],
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
  if (/owned-product live signals|live signal/i.test(item)) return "npm run owned:live-signals";
  if (/owned-product business metrics|business metrics/i.test(item)) return "npm run owned:metrics -- --from-clipboard";
  if (/owned-product current metrics|current metrics|owned:case-studies|case stud/i.test(item)) return "npm run owned:live-signals";
  if (/market learning|market:learn|learning review/i.test(item)) return "npm run market:learn";
  if (/recording rehearsal|rehearsal/i.test(item)) return "npm run prospect:rehearsal -- --limit=5";
  if (/Task:/i.test(item) && /handoff Loom acceptance|sprint acceptance/i.test(item)) return "npm run owned:handoff";
  if (/Client:/i.test(item) && /Sprint acceptance checklist/i.test(item) && clientMatch) {
    const clientPath = `clients/${clientMatch[1]}`;
    const proofContext = existsSync(`${clientPath}/proof-context.md`) ? readFileSync(`${clientPath}/proof-context.md`, "utf8") : "";
    if (/## Proof Type\s+owned-startup/i.test(proofContext) || existsSync(`${clientPath}/handoff-loom-script.md`)) return "npm run owned:handoff";
    return `npm run client:acceptance -- ${clientPath} --dry-run`;
  }
  if (/Client:/i.test(item) && /Claim-proof ledger/i.test(item) && clientMatch) return `npm run client:proof-review -- clients/${clientMatch[1]} --dry-run`;
  if (/owned-startup proof|proof claims/i.test(item)) return "npm run owned:proof-review";
  if (/reply-prep/i.test(item)) return "npm run prospect:reply-prep -- prospects/prospect-slug";
  if (/close-prep/i.test(item)) return "npm run prospect:close-prep -- prospects/prospect-slug";
  if (/follow-up|followup/i.test(item)) return "npm run prospect:followups";
  if (/send-package|mark the prospect sent|ready/i.test(item) && /Prospect:/i.test(item)) return "npm run prospect:outbox";
  if (/Record|Loom|teleprompter/i.test(item)) return "npm run growth:start -- --view=record";
  if (/prep-recording/i.test(item)) return "npm run prospect:prep-recording -- --limit=5";
  if (/Client:/i.test(item) && /weekly|Growth Desk/i.test(item)) return "npm run retention:checkups";
  if (/Client:/i.test(item)) return "npm run client:cockpit -- clients/client-slug";
  if (/Task:/i.test(item)) return "See TASKS.md";
  return doctor.nextCommand;
}

function parityBlockerCommand(area) {
  if (area === "Sender trust") return "npm run send:configure -- --physical-address=\"...\" --dkim-selector=... --dry-run";
  if (area === "Market proof") return "npm run market:proof-cockpit";
  if (area === "Sales proof") return "npm run growth:start -- --view=sales";
  if (area === "Delivery proof") return "npm run owned:handoff";
  if (area === "Retention proof") return "npm run retention:checkups";
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
  ...(todayView.todayFocus || []).map((item) => ({
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

if (ownedCaseStudies.status === "needs-current-metrics") {
  actionItems.splice(1, 0, {
    priority: "P1",
    item: `Owned product live signals: ${ownedNeedsMetricCount} packet(s) need a real current delivery metric`,
    command: "npm run owned:live-signals",
    why: "Owned proof case-study blocker"
  });
} else if (ownedBusinessReadyCount < (ownedCaseStudies.packets || []).length) {
  actionItems.splice(1, 0, {
    priority: "P2",
    item: `Owned product business metrics: ${ownedBusinessReadyCount}/${(ownedCaseStudies.packets || []).length} packet(s) have business metrics`,
    command: "npm run owned:metrics -- --from-clipboard",
    why: "Full case-study blocker"
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
  if (!existsSync("TASKS.md")) return [];
  const content = readFileSync("TASKS.md", "utf8");
  const escaped = title.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const match = content.match(new RegExp(`## ${escaped}\\n([\\s\\S]*?)(?:\\n## |$)`));
  if (!match) return [];
  return match[1]
    .split("\n")
    .map((line) => line.trim())
    .filter((line) => line.startsWith("- [ ]"))
    .map((line) => line.replace(/^- \[ \]\s*/, ""));
}

function taskCommand(task, bucket) {
  if (/owned-product live signals|live signal/i.test(task)) return "npm run owned:live-signals";
  if (/owned-product business metrics|business metrics/i.test(task)) return "npm run owned:metrics -- --from-clipboard";
  if (/owned-product current metrics|current metrics|owned:case-studies|case stud/i.test(task)) return "npm run owned:metrics -- --from-clipboard";
  if (/market learning|market:learn|learning review/i.test(task)) return "npm run market:learn";
  if (/handoff Loom acceptance|sprint acceptance/i.test(task)) return "npm run owned:handoff";
  if (/owned-startup proof|proof claims/i.test(task)) return "npm run owned:proof-review";
  if (/loom|record/i.test(task)) return "npm run growth:start -- --view=record";
  if (/close|paid sprint|buyer room|proposal/i.test(task)) return "npm run growth:start -- --view=sales";
  if (/deliver|client folder|client brain|client data|retention|weekly/i.test(task)) return "npm run retention:checkups";
  if (/intake|client/i.test(task)) return "npm run client:new -- client-slug";
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
- Retention dashboard: \`${retention.dashboardPath}\`
- Recording rehearsal: \`${rehearsal.htmlPath}\`
- Sender setup: \`${senderGuide.htmlPath}\`
- Market proof cockpit: \`${marketProof.htmlPath}\`
- Market learning review: \`${marketLearning.htmlPath}\`
- Owned handoff cockpit: \`${ownedHandoff.htmlPath}\`
- Owned case studies: \`${ownedCaseStudies.htmlPath}\`
- Owned live signals: \`growth-brain/ops/owned-product-live-signals.html\`
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
          <td>${htmlEscape(action.item)}</td>
          <td><code>${htmlEscape(action.command)}</code></td>
          <td>${htmlEscape(action.why)}</td>
        </tr>`).join("")
  : `<tr><td>-</td><td>No pending actions.</td><td>-</td><td>-</td></tr>`;

const todoHtml = taskList.length
  ? taskList.map((task) => `
        <tr>
          <td>${htmlEscape(task.bucket)}</td>
          <td><span class="pill ${task.priority === "P0" ? "bad" : task.priority === "P1" ? "warn" : "good"}">${htmlEscape(task.priority)}</span></td>
          <td>${htmlEscape(task.task)}</td>
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
    <p class="links">Retention dashboard: ${htmlEscape(retention.dashboardPath)} · Sender setup: ${htmlEscape(senderGuide.htmlPath)} · Market proof cockpit: ${htmlEscape(marketProof.htmlPath)} · Owned handoff cockpit: ${htmlEscape(ownedHandoff.htmlPath)} · Growth doctor: ${htmlEscape(doctor.path)} · Market parity: growth-brain/ops/market-parity-readiness.md</p>
  </main>
</body>
</html>
`;

write(outputPath, markdown);
write(htmlPath, html);

const result = {
  status: doctor.status === "blocked" || parity.status === "not-11-10-yet" || retention.status === "attention-needed" ? "attention-needed" : "ready",
  path: outputPath,
  htmlPath,
  date: today,
  nextCommand: doctor.nextCommand,
  mission: doctor.mission,
  counts,
  actions: dedupedActions,
  tasks: taskList,
  retention: {
    status: retention.status,
    weeklyReady: retention.weeklyReady,
    clients: retention.clients,
    highRisk: retention.highRisk
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
  ownedHandoff: {
    status: ownedHandoff.status,
    path: ownedHandoff.path,
    htmlPath: ownedHandoff.htmlPath,
    readyToRecord: ownedHandoff.readyToRecord,
    clients: ownedHandoff.clients
  },
  parity: {
    status: parity.status,
    score: parityScore.score,
    total: parityScore.total,
    display: parityScoreLabel
  }
};

console.log(plain ? `${result.status}: ${doctor.mission} Next: ${doctor.nextCommand}` : JSON.stringify(result, null, 2));
