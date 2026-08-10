#!/usr/bin/env node
import { readFileSync, writeFileSync } from "node:fs";
import { handleHelp } from "./lib/operator-cli.mjs";

handleHelp(process.argv.slice(2), `Usage: npm run sales:one-pager -- (writes growth-brain/sales/managed-it-one-page-offer.html)`);
const inputPath = "growth-brain/sales/managed-it-one-page-offer.md";
const outputPath = "growth-brain/sales/managed-it-one-page-offer.html";

function escapeHtml(value) {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function inline(markdown) {
  return escapeHtml(markdown)
    .replace(/\*\*([^*]+)\*\*/g, "<strong>$1</strong>")
    .replace(/`([^`]+)`/g, "<code>$1</code>");
}

function markdownToHtml(markdown) {
  const lines = markdown.trim().split("\n");
  const html = [];
  let inList = false;

  function closeList() {
    if (!inList) return;
    html.push("</ul>");
    inList = false;
  }

  for (const line of lines) {
    if (!line.trim()) {
      closeList();
      continue;
    }
    if (line.startsWith("# ")) {
      closeList();
      html.push(`<h1>${inline(line.slice(2))}</h1>`);
      continue;
    }
    if (line.startsWith("## ")) {
      closeList();
      html.push(`<h2>${inline(line.slice(3))}</h2>`);
      continue;
    }
    if (line.startsWith("- ")) {
      if (!inList) {
        html.push("<ul>");
        inList = true;
      }
      html.push(`<li>${inline(line.slice(2))}</li>`);
      continue;
    }
    closeList();
    html.push(`<p>${inline(line)}</p>`);
  }

  closeList();
  return html.join("\n");
}

const body = markdownToHtml(readFileSync(inputPath, "utf8"));
const html = `<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>Managed IT One-Page Offer</title>
  <link rel="icon" href="data:," />
  <style>
    :root {
      --ink: #171717;
      --muted: #5f6368;
      --line: #d8dfd8;
      --paper: #fbfaf6;
      --panel: #ffffff;
      --accent: #0d6b57;
    }
    * { box-sizing: border-box; }
    body {
      margin: 0;
      background: var(--paper);
      color: var(--ink);
      font-family: Inter, ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
      line-height: 1.45;
    }
    main {
      width: min(860px, calc(100% - 32px));
      margin: 28px auto;
      border: 1px solid var(--line);
      border-radius: 8px;
      background: var(--panel);
      padding: 34px;
    }
    h1 {
      margin: 0 0 10px;
      font-size: 34px;
      line-height: 1.05;
      letter-spacing: 0;
    }
    h2 {
      margin: 24px 0 8px;
      border-top: 1px solid var(--line);
      padding-top: 16px;
      color: var(--accent);
      font-size: 14px;
      letter-spacing: 0;
      text-transform: uppercase;
    }
    p, li {
      font-size: 15px;
    }
    p {
      margin: 0 0 10px;
    }
    ul {
      margin: 0;
      padding-left: 20px;
    }
    li + li {
      margin-top: 6px;
    }
    code {
      border: 1px solid var(--line);
      border-radius: 4px;
      padding: 1px 4px;
      background: #f6f8f5;
      font: inherit;
    }
    @media print {
      body { background: white; }
      main {
        width: 100%;
        margin: 0;
        border: 0;
        border-radius: 0;
        padding: 0.35in;
      }
    }
  </style>
</head>
<body>
  <main>
${body}
  </main>
</body>
</html>
`;

writeFileSync(outputPath, html);

console.log(JSON.stringify({
  status: "created",
  source: inputPath,
  path: outputPath
}, null, 2));
