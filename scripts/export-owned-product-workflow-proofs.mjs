#!/usr/bin/env node
import { execFileSync } from "node:child_process";
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { localIsoDate } from "./date-utils.mjs";
import { handleHelp, resolveOutputPath } from "./lib/operator-cli.mjs";

handleHelp(process.argv.slice(2), `Usage: node scripts/export-owned-product-workflow-proofs.mjs [--output=growth-brain/ops/owned-product-workflow-proofs.md] [--html=growth-brain/ops/owned-product-workflow-proofs.html]`);
const clients = [
  "clients/ai-converter",
  "clients/siterep",
  "clients/five-to-nine-0509"
];

const outputArg = process.argv.find((arg) => arg.startsWith("--output="));
const htmlArg = process.argv.find((arg) => arg.startsWith("--html="));
const outputPath = resolveOutputPath(outputArg?.split("=").slice(1).join("="), { fallback: "growth-brain/ops/owned-product-workflow-proofs.md" });
const htmlPath = resolveOutputPath(htmlArg?.split("=").slice(1).join("="), { flag: "--html", fallback: "growth-brain/ops/owned-product-workflow-proofs.html" });
const today = localIsoDate();

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

function runWorkflow(clientPath) {
  const output = execFileSync("node", ["scripts/export-client-repeatable-workflow.mjs", clientPath], {
    encoding: "utf8",
    stdio: ["ignore", "pipe", "pipe"]
  });
  return JSON.parse(output);
}

const results = clients.map(runWorkflow);
const ready = results.filter((result) => result.status === "ready").length;
const status = ready === results.length ? "ready" : "attention-needed";

const rows = results.map((result) => `| ${result.name} | ${result.status} | ${result.proofType} | ${result.metric || "missing"} | ${result.missing.length ? result.missing.join(", ") : "none"} | ${result.nextIteration} | \`${result.path}\` |`).join("\n");

const markdown = `# Owned Product Workflow Proofs

Generated: ${today}

## Verdict

${status}

These are the first live examples of the repeatable workflow operating system applied to TinyStudio-owned products.

## Guardrail

AI Converter, SiteRep, and 0509 can prove delivery quality and workflow discipline. They do not replace external proof from strangers replying, paying, retaining, or saying the work was worth it.

## Scoreboard

| Signal | Count |
|---|---:|
| Owned products processed | ${results.length} |
| Workflow proof ready | ${ready} |
| Needs attention | ${results.length - ready} |

## Products

| Product | Status | Proof Type | Current Metric | Missing | Next Iteration | Workflow Proof |
|---|---|---|---|---|---|---|
${rows}

## What This Gives Us

- Three owned-product case studies for delivery quality.
- One repeatable workflow shape per product.
- Clean folder separation.
- A weekly way to improve each product without mixing proof.

## What Still Needs External Proof

- Five Looms recorded and sent to real prospects.
- Real replies.
- One real sales call.
- One won paid sprint.
- Retention feedback from a real retained customer.
`;

const cards = results.map((result) => `
      <article class="card">
        <span class="${result.status === "ready" ? "good" : "warn"}">${htmlEscape(result.status)}</span>
        <h2>${htmlEscape(result.name)}</h2>
        <p><b>Metric:</b> ${htmlEscape(result.metric || "missing")}</p>
        <p><b>Next:</b> ${htmlEscape(result.nextIteration)}</p>
        <p><b>Missing:</b> ${htmlEscape(result.missing.length ? result.missing.join(", ") : "none")}</p>
        <code>${htmlEscape(result.path)}</code>
      </article>`).join("");

const html = `<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>Owned Product Workflow Proofs</title>
  <style>
    body { margin:0; background:#f7f8fb; color:#171717; font-family:Inter, ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif; }
    main { max-width:1080px; margin:0 auto; padding:34px 18px 54px; }
    h1 { margin:0; font-size:clamp(32px,5vw,56px); letter-spacing:0; }
    .lead { color:#4d5764; max-width:780px; line-height:1.55; }
    .grid { display:grid; grid-template-columns:repeat(auto-fit,minmax(280px,1fr)); gap:14px; margin-top:20px; }
    .card { background:#fff; border:1px solid #dbe1ea; border-radius:8px; padding:16px; }
    .good, .warn { border-radius:999px; padding:4px 8px; font-size:12px; font-weight:800; text-transform:uppercase; }
    .good { background:#dff3df; color:#155724; }
    .warn { background:#fff1c2; color:#684b00; }
    p { color:#46505c; line-height:1.5; }
    code { display:block; background:#171717; color:#fff; padding:10px; border-radius:6px; overflow-wrap:anywhere; }
  </style>
</head>
<body>
  <main>
    <h1>Owned Product Workflow Proofs</h1>
    <p class="lead">These are owned-product delivery proof loops. They show workflow discipline; they do not replace external market proof.</p>
    <section class="grid">${cards}</section>
  </main>
</body>
</html>
`;

write(outputPath, markdown);
write(htmlPath, html);

for (const result of results) {
  if (!existsSync(result.path)) throw new Error(`Missing workflow proof: ${result.path}`);
}

console.log(JSON.stringify({
  status,
  path: outputPath,
  htmlPath,
  clients: results.length,
  ready,
  results
}, null, 2));
