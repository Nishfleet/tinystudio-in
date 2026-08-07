#!/usr/bin/env node
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { localIsoDate } from "./date-utils.mjs";

const clients = [
  { path: "clients/ai-converter", name: "AI Converter" },
  { path: "clients/siterep", name: "SiteRep" },
  { path: "clients/five-to-nine-0509", name: "Five to Nine 0509" }
];

const outputArg = process.argv.find((arg) => arg.startsWith("--output="));
const htmlArg = process.argv.find((arg) => arg.startsWith("--html="));
const outputPath = outputArg ? outputArg.split("=").slice(1).join("=") : "growth-brain/ops/owned-product-case-studies.md";
const htmlPath = htmlArg ? htmlArg.split("=").slice(1).join("=") : "growth-brain/ops/owned-product-case-studies.html";
const today = localIsoDate();

function read(path) {
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

function tableRows(markdown) {
  return String(markdown || "")
    .split("\n")
    .map((line) => line.trim())
    .filter((line) => line.startsWith("|") && line.endsWith("|"))
    .map((line) => line.split("|").slice(1, -1).map((cell) => cell.trim()))
    .filter((cells) => cells.some(Boolean) && !cells.every((cell) => /^:?-+:?$/.test(cell)));
}

function section(markdown, heading) {
  const escaped = heading.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const match = String(markdown || "").match(new RegExp(`## ${escaped}\\n+([\\s\\S]*?)(?:\\n## |$)`));
  return match ? match[1].trim() : "";
}

function meaningful(value, minLength = 8) {
  const normalized = String(value || "").trim();
  return normalized.length >= minLength && !/^(todo|tbd|n\/a|none|placeholder|add|replace|-|\[.*\])$/i.test(normalized);
}

function firstDataRow(markdown, heading) {
  return tableRows(section(markdown, heading)).find((cells) => {
    const first = cells[0] || "";
    return first && !/^(Before|Metric|Signal|Priority|Field|Source)$/i.test(first);
  }) || [];
}

function measurementContract(report) {
  const row = firstDataRow(report, "Measurement Contract");
  return {
    signal: row[0] || "",
    source: row[1] || "",
    owner: row[2] || "",
    nextCheck: row[3] || "",
    baseline: row[4] || "",
    decisionRule: row[5] || ""
  };
}

function filledMetricRows(report) {
  return tableRows(section(report, "Numbers To Review"))
    .filter((cells) => cells[0] && !/^Metric$/i.test(cells[0]))
    .filter((cells) => meaningful(cells[1], 1) || meaningful(cells[2], 1))
    .map(([metric, lastPeriod, thisPeriod, notes]) => ({ metric, lastPeriod, thisPeriod, notes }));
}

function evidenceSources(evidence) {
  return tableRows(section(evidence, "Evidence Sources"))
    .filter((cells) => cells[0] && !/^Source$/i.test(cells[0]))
    .map(([source, status, notes]) => ({ source, status, notes }));
}

function isScreenshotSource(source) {
  return /\.(png|jpe?g|webp|gif|svg)$/i.test(source) || /screenshot|desktop|mobile|landing|current|proof/i.test(source);
}

function statusLabel(ok) {
  return ok ? "pass" : "missing";
}

function isPublicDeliveryMetric(metric) {
  return /^owned public proof surfaces passing$/i.test(String(metric || "").trim());
}

function hasBusinessMetric(metrics) {
  return metrics.some((row) => !isPublicDeliveryMetric(row.metric));
}

function hasPublicDeliveryMetric(metrics) {
  return metrics.some((row) => isPublicDeliveryMetric(row.metric));
}

function packetFor(client) {
  const evidence = read(join(client.path, "research/owned-proof-evidence.md"));
  const report = read(join(client.path, "reports/week-1-report.md"));
  const delivery = read(join(client.path, "deliverables/delivery.md"));
  const tangible = firstDataRow(evidence, "Tangible Improvement Draft").length
    ? firstDataRow(evidence, "Tangible Improvement Draft")
    : firstDataRow(delivery, "Tangible Improvements").slice(1);
  const [before, after, clientValue, nextMeasurement] = tangible;
  const sources = evidenceSources(evidence);
  const screenshots = sources.filter((source) => isScreenshotSource(source.source));
  const metrics = filledMetricRows(report);
  const contract = measurementContract(report);
  const contractComplete = Object.values(contract).every(meaningful);
  const tangibleComplete = [before, after, clientValue, nextMeasurement].every(meaningful);
  const hasScreenshot = screenshots.length > 0;
  const hasCurrentMetric = metrics.length > 0;
  const businessMetric = hasBusinessMetric(metrics);
  const publicDeliveryMetric = hasPublicDeliveryMetric(metrics);
  const status = tangibleComplete && hasScreenshot && contractComplete && businessMetric
    ? "case-study-ready"
    : tangibleComplete && hasScreenshot && contractComplete && publicDeliveryMetric
      ? "delivery-proof-ready"
      : !hasCurrentMetric
        ? "needs-current-metric"
        : "draft";
  const safeLine = `We run measurable improvement loops on our own products every week too. ${client.name} is owned-product proof: before/after, proof source, client-visible value, and next measurement. It is not a client-result claim.`;
  const packetPath = join(client.path, "owned-product-proof-packet.md");

  const metricRows = metrics.length
    ? metrics.map((row) => `| ${row.metric} | ${row.lastPeriod || "not recorded"} | ${row.thisPeriod || "not recorded"} | ${row.notes || ""} |`).join("\n")
    : "| Missing current metric | Add the current value before using this as a full case study. | - | Needed before outbound proof reuse. |";

  const sourceRows = sources.length
    ? sources.map((row) => `| ${row.source} | ${row.status} | ${row.notes || ""} |`).join("\n")
    : "| Missing | missing | Add baseline screenshot or source proof. |";

  const readinessRows = [
    ["Baseline screenshot/source", statusLabel(hasScreenshot), screenshots.map((row) => row.source).join("; ") || "Add baseline screenshot/source proof"],
    ["Current metric", statusLabel(hasCurrentMetric), metrics.map((row) => `${row.metric}: ${row.thisPeriod || row.lastPeriod}`).join("; ") || "Add current metric value"],
    ["Business metric", statusLabel(businessMetric), businessMetric ? "At least one non-public-delivery metric is present." : "Still missing. Public proof checks are useful delivery proof, but business metrics are needed before calling this a full case study."],
    ["One improvement", statusLabel(tangibleComplete), after || "Add the improved state"],
    ["Next measurement", statusLabel(meaningful(nextMeasurement)), nextMeasurement || "Add the next signal"],
    ["Measurement contract", statusLabel(contractComplete), contractComplete ? `${contract.signal}; ${contract.owner}; ${contract.nextCheck}` : "Fill signal, source, owner, next check, baseline/current, and decision rule"],
    ["Sales-safe label", "pass", "Owned-product proof only; not external client results"]
  ];

  const markdown = `# ${client.name} Owned-Product Proof Packet

Generated: ${today}

Status: ${status}

## Guardrail

This is owned-product delivery proof. It can show that TinyStudio can find faults, ship improvements, explain value, and set a measurement loop on real products. It does not prove external demand, paid-client results, paid retention, reply rate, or close rate.

## Sales-Safe Outbound Line

${safeLine}

## Proof Packet

| Requirement | Status | Detail |
|---|---|---|
${readinessRows.map((row) => `| ${row[0]} | ${row[1]} | ${row[2]} |`).join("\n")}

## What Changed

- Before: ${before || "Missing. Add baseline before state."}
- After: ${after || "Missing. Add improved current state."}
- Why it mattered: ${clientValue || "Missing. Add client-visible value."}
- Proof source: ${sources.map((row) => row.source).join("; ") || "Missing. Add screenshot, page, test, or source proof."}
- Next signal: ${nextMeasurement || "Missing. Add next measurement."}

## Current Metric

| Metric | Last Period | This Period | Notes |
|---|---:|---:|---|
${metricRows}

## Measurement Contract

| Signal | Source | Owner | Next Check | Baseline / Current | Decision Rule |
|---|---|---|---|---|---|
| ${contract.signal || ""} | ${contract.source || ""} | ${contract.owner || ""} | ${contract.nextCheck || ""} | ${contract.baseline || ""} | ${contract.decisionRule || ""} |

## Evidence Sources

| Source | Status | Notes |
|---|---|---|
${sourceRows}

## Do Not Say

- Do not say this is client proof.
- Do not say this proves market demand.
- Do not say this proves retention.
- Do not call public live-signal checks revenue proof.
- Do not claim revenue moved unless a real business metric row is filled and approved.
`;

  write(packetPath, markdown);

  return {
    ...client,
    status,
    packetPath,
    safeLine,
    before,
    after,
    clientValue,
    nextMeasurement,
    screenshots: screenshots.length,
    currentMetrics: metrics.length,
    businessMetrics: metrics.filter((row) => !isPublicDeliveryMetric(row.metric)).length,
    publicDeliveryMetrics: metrics.filter((row) => isPublicDeliveryMetric(row.metric)).length,
    measurementContractComplete: contractComplete
  };
}

const packets = clients.map(packetFor);
const readyCount = packets.filter((packet) => packet.status === "case-study-ready").length;
const deliveryReadyCount = packets.filter((packet) => ["case-study-ready", "delivery-proof-ready"].includes(packet.status)).length;
const needsMetricCount = packets.filter((packet) => packet.status === "needs-current-metric").length;

const markdown = `# Owned-Product Case Studies

Generated: ${today}

## Rule

Owned startup proof = delivery proof. External client proof = market proof. Use these packets to show our method honestly, not to imply client results.

## Moat Story

We do not sell vague marketing. We run measurable improvement loops on real products, including our own, and show the proof every week.

## Scoreboard

| Area | Count |
|---|---:|
| Owned products | ${packets.length} |
| Delivery-proof ready | ${deliveryReadyCount} |
| Business-metric case-study ready | ${readyCount} |
| Need current metric | ${needsMetricCount} |

## Packets

| Product | Status | Baseline Screenshot Sources | Current Metrics | Business Metrics | Public Delivery Metrics | Measurement Contract | Packet |
|---|---|---:|---:|---:|---:|---|---|
${packets.map((packet) => `| ${packet.name} | ${packet.status} | ${packet.screenshots} | ${packet.currentMetrics} | ${packet.businessMetrics} | ${packet.publicDeliveryMetrics} | ${packet.measurementContractComplete ? "complete" : "missing"} | \`${packet.packetPath}\` |`).join("\n")}

## Outbound-Safe Proof Lines

${packets.map((packet) => `- ${packet.safeLine}`).join("\n")}

## Next Actions

${needsMetricCount ? "- Add one real current metric value to each owned product packet before using it as delivery proof." : "- All owned-product packets have a current metric. Keep updating them weekly."}
${readyCount < packets.length ? "- Add product analytics or sales metrics before calling these full business case studies." : "- All owned-product packets have business metrics. Keep the proof fresh."}
- Keep the owned-product label in every outbound Loom.
- Keep external market proof separate: replies, sales calls, closes, and paid-client retention still need real external evidence.
`;

write(outputPath, markdown);

const cards = packets.map((packet) => `
      <article class="card">
        <div class="meta">
          <span>${htmlEscape(packet.name)}</span>
          <span class="${["case-study-ready", "delivery-proof-ready"].includes(packet.status) ? "good" : "warn"}">${htmlEscape(packet.status)}</span>
          <span>${packet.screenshots} screenshot/source proof</span>
          <span>${packet.currentMetrics} current metric(s)</span>
          <span>${packet.businessMetrics} business metric(s)</span>
        </div>
        <h2>${htmlEscape(packet.name)}</h2>
        <dl>
          <dt>Before</dt>
          <dd>${htmlEscape(packet.before || "Missing baseline state")}</dd>
          <dt>After</dt>
          <dd>${htmlEscape(packet.after || "Missing improved state")}</dd>
          <dt>Value</dt>
          <dd>${htmlEscape(packet.clientValue || "Missing value statement")}</dd>
          <dt>Next signal</dt>
          <dd>${htmlEscape(packet.nextMeasurement || "Missing next measurement")}</dd>
        </dl>
        <p>${htmlEscape(packet.safeLine)}</p>
        <code>${htmlEscape(packet.packetPath)}</code>
      </article>`).join("");

const html = `<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>Owned-Product Case Studies</title>
  <style>
    body { margin:0; font-family: Inter, ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif; background:#f6f7f9; color:#171717; }
    main { max-width:1120px; margin:0 auto; padding:36px 18px 56px; }
    h1 { margin:0; font-size:clamp(32px,5vw,56px); letter-spacing:0; }
    .lead { color:#565f6b; max-width:760px; line-height:1.55; }
    .stats, .grid { display:grid; gap:14px; margin-top:22px; }
    .stats { grid-template-columns:repeat(auto-fit,minmax(160px,1fr)); }
    .stat, .card { background:#fff; border:1px solid #dbe1ea; border-radius:8px; padding:16px; }
    .stat b { display:block; font-size:32px; }
    .grid { grid-template-columns:repeat(auto-fit,minmax(280px,1fr)); }
    .meta { display:flex; flex-wrap:wrap; gap:8px; margin-bottom:12px; }
    .meta span { border-radius:999px; background:#edf1f5; padding:5px 9px; font-size:12px; font-weight:700; }
    .meta .good { background:#dff3df; color:#155724; }
    .meta .warn { background:#fff1c2; color:#684b00; }
    h2 { margin:0 0 14px; font-size:22px; }
    dl { margin:0; display:grid; gap:7px; }
    dt { color:#667085; font-size:12px; font-weight:800; text-transform:uppercase; letter-spacing:.04em; }
    dd { margin:0 0 8px; line-height:1.45; }
    p { color:#3f4752; line-height:1.5; }
    code { display:block; background:#171717; color:#fff; padding:10px; border-radius:6px; overflow-wrap:anywhere; }
  </style>
</head>
<body>
  <main>
    <h1>Owned-Product Case Studies</h1>
    <p class="lead">Owned startup proof is delivery proof. External client proof is market proof. These packets show our method honestly without pretending our own products are client results.</p>
    <h2>Scoreboard</h2>
    <section class="stats">
      <div class="stat"><b>${packets.length}</b><span>owned products</span></div>
      <div class="stat"><b>${deliveryReadyCount}</b><span>delivery-proof ready</span></div>
      <div class="stat"><b>${readyCount}</b><span>business-metric ready</span></div>
      <div class="stat"><b>${needsMetricCount}</b><span>need current metric</span></div>
    </section>
    <section class="grid">${cards}</section>
  </main>
</body>
</html>
`;

write(htmlPath, html);

console.log(JSON.stringify({
  status: readyCount === packets.length ? "ready" : deliveryReadyCount === packets.length ? "delivery-proof-ready" : "needs-current-metrics",
  path: outputPath,
  htmlPath,
  packets: packets.map((packet) => ({
    clientPath: packet.path,
    status: packet.status,
    packetPath: packet.packetPath,
    screenshots: packet.screenshots,
    currentMetrics: packet.currentMetrics,
    businessMetrics: packet.businessMetrics,
    publicDeliveryMetrics: packet.publicDeliveryMetrics,
    measurementContractComplete: packet.measurementContractComplete
  }))
}, null, 2));
