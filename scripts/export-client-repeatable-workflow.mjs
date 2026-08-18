#!/usr/bin/env node
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { basename, join } from "node:path";
import { localIsoDate } from "./date-utils.mjs";
import { handleHelp, resolveOutputPath } from "./lib/operator-cli.mjs";

const args = process.argv.slice(2);
handleHelp(args, `Usage: node scripts/export-client-repeatable-workflow.mjs clients/client-slug [--output=...] [--html=...]`);
const clientPath = args.find((arg) => !arg.startsWith("--"));
const outputArg = args.find((arg) => arg.startsWith("--output="));
const htmlArg = args.find((arg) => arg.startsWith("--html="));
const today = localIsoDate();

if (!clientPath) {
  console.error("Usage: node scripts/export-client-repeatable-workflow.mjs clients/client-slug");
  process.exit(1);
}

if (!existsSync(clientPath)) {
  console.error(`Client folder not found: ${clientPath}`);
  process.exit(1);
}

const outputPath = resolveOutputPath(outputArg?.split("=").slice(1).join("="), { fallback: join(clientPath, "ops/repeatable-workflow.md") });
const htmlPath = resolveOutputPath(htmlArg?.split("=").slice(1).join("="), { flag: "--html", fallback: join(clientPath, "ops/repeatable-workflow.html") });

function read(relativePath) {
  const path = join(clientPath, relativePath);
  return existsSync(path) ? readFileSync(path, "utf8") : "";
}

function readRoot(path) {
  return existsSync(path) ? readFileSync(path, "utf8") : "";
}

function write(path, content) {
  const dir = path.split("/").slice(0, -1).join("/");
  if (dir) mkdirSync(dir, { recursive: true });
  writeFileSync(path, content);
}

function htmlEscape(value) {
  return String(value || "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;");
}

function clean(value) {
  return String(value || "").replace(/\s+/g, " ").replace(/\|/g, "/").trim();
}

function meaningful(value, minLength = 8) {
  const normalized = clean(value);
  return normalized.length >= minLength && !/^(todo|tbd|n\/a|none|placeholder|add|replace|-|\[.*\])$/i.test(normalized);
}

function bulletValue(markdown, label, fallback = "") {
  const escaped = label.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const match = String(markdown || "").match(new RegExp(`^- ${escaped}:[ \\t]*([^\\n]*)$`, "m"));
  return clean(match?.[1] || fallback);
}

function section(markdown, heading) {
  const escaped = heading.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const match = String(markdown || "").match(new RegExp(`## ${escaped}\\n+([\\s\\S]*?)(?:\\n## |$)`));
  return match ? match[1].trim() : "";
}

function tableRows(markdown) {
  return String(markdown || "")
    .split("\n")
    .map((line) => line.trim())
    .filter((line) => line.startsWith("|") && line.endsWith("|"))
    .map((line) => line.split("|").slice(1, -1).map(clean))
    .filter((cells) => cells.some(Boolean) && !cells.every((cell) => /^:?-+:?$/.test(cell)));
}

function firstDataRow(markdown, heading, headerPattern) {
  return tableRows(section(markdown, heading)).find((cells) => {
    const first = cells[0] || "";
    return first && !(headerPattern || /^(Before|Metric|Signal|Priority|Field|Source|Lane|Week|Requirement|Channel)$/i).test(first);
  }) || [];
}

function firstFilledLine(markdown, fallback = "") {
  return clean(String(markdown || "")
    .split("\n")
    .map((line) => line.replace(/^[-#*\s]+/, "").trim())
    .find((line) => meaningful(line, 24)) || fallback);
}

function currentMetric(report, productPacket = "") {
  const packetRow = firstDataRow(productPacket, "Current Metric", /^Metric$/i);
  if (packetRow.length && meaningful(packetRow[2] || packetRow[1], 1)) {
    return `${packetRow[0]}: ${packetRow[2] || packetRow[1]}`;
  }
  const row = firstDataRow(report, "Numbers To Review", /^Metric$/i);
  return row.length ? `${row[0]}: ${row[2] || row[1] || "needs current value"}` : "";
}

function measurementContract(report) {
  const row = firstDataRow(report, "Measurement Contract", /^Signal$/i);
  return {
    signal: row[0] || "",
    source: row[1] || "",
    owner: row[2] || "",
    nextCheck: row[3] || "",
    baseline: row[4] || "",
    decisionRule: row[5] || ""
  };
}

function revenueLeak(report) {
  const row = firstDataRow(report, "Revenue Fault Loop", /^Lane$/i);
  return {
    lane: row[0] || "",
    before: row[1] || "",
    fix: row[2] || "",
    value: row[3] || "",
    nextAction: row[4] || ""
  };
}

function tangibleImprovement(evidence, delivery) {
  const evidenceRow = firstDataRow(evidence, "Tangible Improvement Draft");
  if (evidenceRow.length >= 4) {
    return {
      before: evidenceRow[0] || "",
      after: evidenceRow[1] || "",
      value: evidenceRow[2] || "",
      nextMeasurement: evidenceRow[3] || ""
    };
  }
  const deliveryRow = firstDataRow(delivery, "Tangible Improvements");
  return {
    before: deliveryRow[1] || "",
    after: deliveryRow[2] || "",
    value: deliveryRow[3] || "",
    nextMeasurement: deliveryRow[4] || ""
  };
}

function evidenceSources(evidence, claimLedger) {
  const sourceRows = tableRows(section(evidence, "Evidence Sources"))
    .filter((cells) => cells[0] && !/^Source$/i.test(cells[0]))
    .map((cells) => cells[0]);
  const claimRows = tableRows(claimLedger)
    .filter((cells) => cells[0] && !/^Claim$/i.test(cells[0]) && /^approved$/i.test(cells[4] || ""))
    .map((cells) => cells[1]);
  return [...new Set([...sourceRows, ...claimRows].filter(Boolean))];
}

function principleFor(slug, fallbackValue) {
  const principles = {
    "ai-converter": "A specific accounting conversion path beats a broad file-conversion promise when the buyer needs a fast, trusted next step.",
    "siterep": "Source-backed, owner-visible workflows beat vague AI support claims because buyers can verify what the assistant knows and what happens next.",
    "five-to-nine-0509": "Competitor monitoring retains when it turns raw changes into proof-backed decisions, not another passive dashboard."
  };
  return principles[slug] || fallbackValue || "One visible buyer path with proof and a next measurement beats more unmeasured marketing activity.";
}

function statusCell(value) {
  return meaningful(value) ? "pass" : "missing";
}

function statusFromRows(rows) {
  return rows.every((row) => row.status === "pass") ? "ready" : "draft";
}

const slug = basename(clientPath);
const intake = read("intake.md");
const report = read("reports/week-1-report.md");
const evidence = read("research/owned-proof-evidence.md");
const delivery = read("deliverables/delivery.md");
const claimLedger = read("quality/claim-proof-ledger.md");
const weeklyLearnings = read("brain/weekly-learnings.md");
const channelReadiness = read("quality/channel-readiness-scorecard.md");
const proofContext = read("proof-context.md");
const productPacket = read("owned-product-proof-packet.md");
const workflowOs = readRoot("growth-brain/workflows/repeatable-workflow-operating-system.md");

const name = bulletValue(intake, "Name", basename(clientPath));
const proofType = bulletValue(proofContext, "Proof Type", proofContext.includes("owned-startup") ? "owned-startup" : "client");
const tangible = tangibleImprovement(evidence, delivery);
const fault = revenueLeak(report);
const contract = measurementContract(report);
const sources = evidenceSources(evidence, claimLedger);
const metric = currentMetric(report, productPacket);
const learning = firstFilledLine(section(weeklyLearnings, "Durable Rules"), firstFilledLine(section(weeklyLearnings, "Log")));
const readyChannels = bulletValue(channelReadiness, "Ready channels", "none");
const workflowPrinciple = principleFor(slug, tangible.value || fault.value);
const bottleneck = tangible.before || fault.before || "Bottleneck not captured yet.";
const gap = tangible.before
  ? `${tangible.before} The gap is that the current path does not make the strongest buyer decision obvious enough.`
  : fault.before || "Gap not captured yet.";
const flow = [
  "Trigger: weekly client or owned-product value loop",
  "Step 1: read client brain, proof packet, delivery, weekly report, and channel readiness",
  "Step 2: choose one bottleneck and one improvement",
  "Step 3: ship or hand off the smallest useful fix",
  "Step 4: refresh dashboard, weekly report, proof packet, and learning log",
  "Human gate: proof claims, external copy, sending, publishing, budget changes, and acceptance",
  "Output: before/after proof, client-visible value, measurement contract, and next iteration"
];
const systemArtifacts = [
  `${clientPath}/owned-product-proof-packet.md`,
  `${clientPath}/client-dashboard.md`,
  `${clientPath}/reports/week-1-report.md`,
  `${clientPath}/quality/channel-readiness-scorecard.md`,
  `${clientPath}/brain/weekly-learnings.md`
];
const systemArtifactsForCheck = systemArtifacts.filter((path) => path !== outputPath && path !== htmlPath);
const nextIteration = tangible.nextMeasurement || fault.nextAction || contract.decisionRule || "Pick one next measurement after the current fix is reviewed.";

const rows = [
  {
    step: "Find the real bottleneck",
    status: statusCell(bottleneck),
    proof: bottleneck
  },
  {
    step: "Study the gap",
    status: statusCell(gap),
    proof: gap
  },
  {
    step: "Draw inspiration from four places",
    status: sources.length ? "pass" : "missing",
    proof: sources.length ? sources.slice(0, 5).join("; ") : "Add market, source, competitor, customer, or owned-data evidence."
  },
  {
    step: "Extract the principle",
    status: statusCell(workflowPrinciple),
    proof: workflowPrinciple
  },
  {
    step: "Design the flow",
    status: "pass",
    proof: flow.join(" -> ")
  },
  {
    step: "Build the system",
    status: systemArtifactsForCheck.every((path) => existsSync(path)) ? "pass" : "missing",
    proof: systemArtifacts.join("; ")
  },
  {
    step: "Delegate execution deliberately",
    status: "pass",
    proof: "Automation drafts, scores, exports, checks, and refreshes. Human review remains required for proof approval, client messaging, publishing, budget changes, and acceptance."
  },
  {
    step: "Test",
    status: meaningful(contract.signal) && meaningful(contract.decisionRule) ? "pass" : "missing",
    proof: contract.signal ? `${contract.signal}; decision rule: ${contract.decisionRule}` : "Measurement contract missing."
  },
  {
    step: "Feed results back",
    status: statusCell(learning),
    proof: learning || "Add the durable learning to the client brain."
  },
  {
    step: "Iterate",
    status: statusCell(nextIteration),
    proof: nextIteration
  }
];

const status = statusFromRows(rows);
const guardrail = proofType === "owned-startup"
  ? "This is owned-product delivery proof. It can prove our process quality, not external market demand, paid-client outcomes, or retention."
  : "This is client workflow proof. Do not reuse claims externally unless the claim-proof ledger approves them.";

const markdown = `# ${name} Repeatable Workflow Proof

Generated: ${today}

Status: ${status}

## Guardrail

${guardrail}

## Source Workflow

\`growth-brain/workflows/repeatable-workflow-operating-system.md\`

${workflowOs.includes("Canonical 10-Step Loop") ? "The canonical 10-step loop is installed and this file maps the client/product work against it." : "The canonical workflow source is missing or unreadable."}

## Current Workflow Snapshot

- Client/product: ${name}
- Folder: ${clientPath}
- Proof type: ${proofType || "client"}
- Ready channels: ${readyChannels}
- Current metric: ${metric || "No current metric captured yet."}
- Bottleneck: ${bottleneck}
- Gap: ${gap}
- Principle: ${workflowPrinciple}
- Smallest system: ${systemArtifacts.join("; ")}
- Next iteration: ${nextIteration}

## Canonical Loop Check

| # | Step | Status | Proof / Output |
|---:|---|---|---|
${rows.map((row, index) => `| ${index + 1} | ${row.step} | ${row.status} | ${row.proof} |`).join("\n")}

## Flow

${flow.map((item) => `- ${item}`).join("\n")}

## What This Proves

- We can run the same improvement method on a real product folder.
- The workflow produces a bottleneck, gap, principle, flow, proof artifact, measurement contract, saved learning, and next iteration.
- The client/product folder stays isolated.

## What This Does Not Prove

- It does not prove strangers will reply.
- It does not prove strangers will pay.
- It does not prove retained monthly client value.
- It does not prove revenue, rankings, ROAS, or sales lift.

## Next Action

${nextIteration}
`;

const loopRowsHtml = rows.map((row, index) => `
        <tr>
          <td>${index + 1}</td>
          <td>${htmlEscape(row.step)}</td>
          <td><span class="${row.status === "pass" ? "good" : "warn"}">${htmlEscape(row.status)}</span></td>
          <td>${htmlEscape(row.proof)}</td>
        </tr>`).join("");

const html = `<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>${htmlEscape(name)} Repeatable Workflow Proof</title>
  <style>
    body { margin:0; font-family:Inter, ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif; background:#f7f8fb; color:#171717; }
    main { max-width:1120px; margin:0 auto; padding:32px 18px 52px; }
    h1 { margin:0; font-size:clamp(30px,5vw,52px); letter-spacing:0; }
    p, li { color:#46505c; line-height:1.55; }
    .hero, .panel { background:#fff; border:1px solid #dbe1ea; border-radius:8px; padding:18px; margin-top:16px; }
    .grid { display:grid; grid-template-columns:repeat(auto-fit,minmax(220px,1fr)); gap:12px; margin-top:16px; }
    .stat { background:#fff; border:1px solid #dbe1ea; border-radius:8px; padding:14px; }
    .stat b { display:block; color:#667085; font-size:12px; text-transform:uppercase; letter-spacing:.04em; margin-bottom:6px; }
    table { width:100%; border-collapse:collapse; border:1px solid #dbe1ea; border-radius:8px; overflow:hidden; background:#fff; }
    th, td { text-align:left; vertical-align:top; border-bottom:1px solid #dbe1ea; padding:11px; }
    th { background:#eef2f6; color:#475467; font-size:12px; text-transform:uppercase; letter-spacing:.04em; }
    .good, .warn { border-radius:999px; padding:4px 8px; font-size:12px; font-weight:800; text-transform:uppercase; white-space:nowrap; }
    .good { background:#dff3df; color:#155724; }
    .warn { background:#fff1c2; color:#684b00; }
    @media (max-width:760px) { table { display:block; overflow-x:auto; } }
  </style>
</head>
<body>
  <main>
    <section class="hero">
      <h1>${htmlEscape(name)} Repeatable Workflow Proof</h1>
      <p>${htmlEscape(guardrail)}</p>
    </section>
    <section class="grid">
      <div class="stat"><b>Status</b>${htmlEscape(status)}</div>
      <div class="stat"><b>Proof type</b>${htmlEscape(proofType || "client")}</div>
      <div class="stat"><b>Metric</b>${htmlEscape(metric || "No current metric captured yet.")}</div>
      <div class="stat"><b>Ready channels</b>${htmlEscape(readyChannels)}</div>
    </section>
    <section class="panel">
      <h2>Current Workflow Snapshot</h2>
      <p><b>Bottleneck:</b> ${htmlEscape(bottleneck)}</p>
      <p><b>Gap:</b> ${htmlEscape(gap)}</p>
      <p><b>Principle:</b> ${htmlEscape(workflowPrinciple)}</p>
      <p><b>Next iteration:</b> ${htmlEscape(nextIteration)}</p>
    </section>
    <section class="panel">
      <h2>Canonical Loop Check</h2>
      <table><thead><tr><th>#</th><th>Step</th><th>Status</th><th>Proof / Output</th></tr></thead><tbody>${loopRowsHtml}
      </tbody></table>
    </section>
  </main>
</body>
</html>
`;

write(outputPath, markdown);
write(htmlPath, html);

console.log(JSON.stringify({
  status,
  clientPath,
  name,
  proofType,
  path: outputPath,
  htmlPath,
  metric: metric || "",
  missing: rows.filter((row) => row.status !== "pass").map((row) => row.step),
  nextIteration
}, null, 2));
