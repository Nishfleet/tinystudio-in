#!/usr/bin/env node
import { execFileSync } from "node:child_process";
import { existsSync, mkdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { localIsoDate } from "./date-utils.mjs";

const args = process.argv.slice(2);
const noUpdate = args.includes("--no-update");
const strict = args.includes("--strict");
const outputArg = args.find((arg) => arg.startsWith("--output="));
const htmlArg = args.find((arg) => arg.startsWith("--html="));
const timeoutArg = args.find((arg) => arg.startsWith("--timeout="));
const timeoutMs = timeoutArg ? Number(timeoutArg.split("=")[1]) : 12000;
const outputPath = outputArg ? outputArg.split("=").slice(1).join("=") : "growth-brain/ops/owned-product-live-signals.md";
const htmlPath = htmlArg ? htmlArg.split("=").slice(1).join("=") : "growth-brain/ops/owned-product-live-signals.html";
const today = localIsoDate();

const products = [
  {
    clientPath: "clients/ai-converter",
    name: "AI Converter",
    checks: [
      {
        label: "Homepage",
        url: "https://aiconverter.app/",
        terms: ["Fix bank statement PDFs", "accounting imports"]
      },
      {
        label: "Accounting wedge page",
        url: "https://aiconverter.app/bank-statement-converter-for-bookkeepers/",
        terms: ["Bank Statement", "CSV"]
      },
      {
        label: "AI-readable context",
        url: "https://aiconverter.app/llms.txt",
        terms: ["bank-statement accounting import prep", "Bank statement PDF to CSV"]
      }
    ]
  },
  {
    clientPath: "clients/siterep",
    name: "SiteRep",
    checks: [
      {
        label: "Homepage",
        url: "https://siterep.net/",
        terms: ["Site Rep", "source-backed"]
      },
      {
        label: "AI-readable context",
        url: "https://siterep.net/llms.txt",
        terms: ["source-backed website assistant", "owner-visible repair queue"]
      }
    ]
  },
  {
    clientPath: "clients/five-to-nine-0509",
    name: "Five to Nine 0509",
    checks: [
      {
        label: "Homepage",
        url: "https://0509.in/",
        terms: ["Five to Nine", "proof"]
      },
      {
        label: "Public health",
        url: "https://0509.in/api/health",
        terms: ['"status":"ok"', '"app":"0509"']
      }
    ]
  }
];

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

function decodeHtml(value) {
  return String(value || "")
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&quot;/g, "\"")
    .replace(/&#39;/g, "'")
    .replace(/&#x([0-9a-f]+);/gi, (_, code) => String.fromCodePoint(Number.parseInt(code, 16)))
    .replace(/&#(\d+);/g, (_, code) => String.fromCodePoint(Number.parseInt(code, 10)))
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">");
}

function stripHtml(value) {
  return decodeHtml(String(value || "")
    .replace(/<script[\s\S]*?<\/script>/gi, " ")
    .replace(/<style[\s\S]*?<\/style>/gi, " ")
    .replace(/<!--[\s\S]*?-->/g, " ")
    .replace(/<[^>]+>/g, " ")
  ).replace(/\s+/g, " ").trim();
}

function compact(value, maxLength = 180) {
  const normalized = decodeHtml(value).replace(/\s+/g, " ").trim();
  if (normalized.length <= maxLength) return normalized;
  return `${normalized.slice(0, maxLength - 1).trim()}...`;
}

function extractTitle(body) {
  return compact(body.match(/<title[^>]*>([\s\S]*?)<\/title>/i)?.[1] || "");
}

function extractMetaDescription(body) {
  const tags = Array.from(body.matchAll(/<meta\b[^>]*>/gi)).map((match) => match[0]);
  for (const tag of tags) {
    const name = tag.match(/\b(?:name|property)=["']?([^"'\s>]+)/i)?.[1]?.toLowerCase() || "";
    if (!["description", "og:description", "twitter:description"].includes(name)) continue;
    const content = tag.match(/\bcontent=["']([^"']*)["']/i)?.[1] || "";
    if (content.trim()) return compact(content, 260);
  }
  return "";
}

function extractHeadings(body, tag) {
  return Array.from(body.matchAll(new RegExp(`<${tag}[^>]*>([\\s\\S]*?)<\\/${tag}>`, "gi")))
    .map((match) => compact(stripHtml(match[1]), 120))
    .filter(Boolean)
    .slice(0, tag === "h1" ? 3 : 8);
}

function termFound(body, term) {
  return body.toLowerCase().includes(String(term || "").toLowerCase());
}

async function fetchCheck(check) {
  const controller = new AbortController();
  const started = Date.now();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const response = await fetch(check.url, {
      method: "GET",
      redirect: "follow",
      signal: controller.signal,
      headers: {
        "user-agent": "TinyStudio owned product proof check; contact hello@tinystudio.io"
      }
    });
    const body = await response.text();
    clearTimeout(timer);
    const missingTerms = check.terms.filter((term) => !termFound(body, term));
    const statusOk = response.status >= 200 && response.status < 400;
    return {
      ...check,
      ok: statusOk && missingTerms.length === 0,
      statusCode: response.status,
      finalUrl: response.url,
      ms: Date.now() - started,
      missingTerms,
      title: extractTitle(body),
      description: extractMetaDescription(body),
      h1: extractHeadings(body, "h1"),
      sample: compact(stripHtml(body), 280),
      error: ""
    };
  } catch (error) {
    clearTimeout(timer);
    return {
      ...check,
      ok: false,
      statusCode: 0,
      finalUrl: "",
      ms: Date.now() - started,
      missingTerms: check.terms,
      title: "",
      description: "",
      h1: [],
      sample: "",
      error: error.name === "AbortError" ? `timeout after ${timeoutMs}ms` : error.message
    };
  }
}

const productResults = [];

for (const product of products) {
  const checks = [];
  for (const check of product.checks) {
    checks.push(await fetchCheck(check));
  }
  const passing = checks.filter((check) => check.ok).length;
  const researchPath = join(product.clientPath, "research/owned-live-signals.md");
  const researchMarkdown = `# ${product.name} Owned Live Signals

Generated: ${today}

## Rule

This is a public delivery signal, not revenue proof and not paid-client proof. It only proves that owned public proof surfaces are live and contain the expected delivery language right now.

## Summary

- Public proof surfaces passing: ${passing}/${checks.length}
- Source: live fetch from public URLs
- Next: keep this as a weekly delivery check, then replace or supplement it with product analytics when available.

## Checks

| Surface | Status | HTTP | Time | URL | Missing Terms |
|---|---|---:|---:|---|---|
${checks.map((check) => `| ${check.label} | ${check.ok ? "pass" : "fail"} | ${check.statusCode || "-"} | ${check.ms}ms | ${check.finalUrl || check.url} | ${check.missingTerms.join("; ") || "-"} |`).join("\n")}

## Page Signals

${checks.map((check) => `### ${check.label}

- Title: ${check.title || "-"}
- Description: ${check.description || "-"}
- H1: ${check.h1.join("; ") || "-"}
- Sample: ${check.sample || check.error || "-"}
`).join("\n")}
`;
  write(researchPath, researchMarkdown);
  productResults.push({ ...product, checks, passing, total: checks.length, researchPath });
}

const metricsInputPath = ".tmp/owned-live-signal-metrics.txt";
mkdirSync(".tmp", { recursive: true });
writeFileSync(metricsInputPath, productResults.map((product) => [
  product.clientPath,
  "Owned public proof surfaces passing",
  "",
  `${product.passing}/${product.total}`,
  `Public delivery metric from ${product.researchPath}; not revenue proof or paid-client proof.`
].join("|")).join("\n"));

if (!noUpdate) {
  execFileSync("node", ["scripts/update-owned-product-metrics.mjs", `--input=${metricsInputPath}`], {
    encoding: "utf8",
    stdio: ["ignore", "pipe", "pipe"]
  });
}

const rows = productResults.flatMap((product) => product.checks.map((check) => ({
  product,
  check
})));

const markdown = `# Owned Product Live Signals

Generated: ${today}

## Verdict

${productResults.every((product) => product.passing === product.total) ? "All owned public proof surfaces passed." : "Some owned public proof surfaces need attention."}

## Rule

Owned public proof surfaces are delivery proof only. They do not prove paid-client results, market demand, retention, revenue, or reply rate.

## Scoreboard

| Product | Public Proof Surfaces Passing | Research Source |
|---|---:|---|
${productResults.map((product) => `| ${product.name} | ${product.passing}/${product.total} | \`${product.researchPath}\` |`).join("\n")}

## Checks

| Product | Surface | Status | HTTP | Time | URL | Missing Terms |
|---|---|---|---:|---:|---|---|
${rows.map(({ product, check }) => `| ${product.name} | ${check.label} | ${check.ok ? "pass" : "fail"} | ${check.statusCode || "-"} | ${check.ms}ms | ${check.finalUrl || check.url} | ${check.missingTerms.join("; ") || "-"} |`).join("\n")}

## What This Unlocks

- A real current metric for owned-product proof packets: public proof surfaces passing.
- A weekly delivery-quality check for our own products.
- A cleaner outbound line: "we run this proof loop on our own products every week" without implying client results.

## What This Does Not Unlock

- No revenue proof.
- No external market proof.
- No paid-client retention proof.
- No claim that the product improvement increased conversion.
`;

write(outputPath, markdown);

const html = `<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>Owned Product Live Signals</title>
  <style>
    :root { color-scheme: light; --ink:#14161a; --muted:#667085; --line:#d8dee8; --paper:#f7f9fc; --good:#0f7b45; --bad:#b42318; }
    * { box-sizing: border-box; }
    body { margin:0; background:#fff; color:var(--ink); font-family:Inter, ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif; }
    main { max-width:1120px; margin:0 auto; padding:28px 18px 44px; }
    h1 { margin:0; font-size:clamp(30px,4vw,46px); letter-spacing:0; }
    p { color:var(--muted); max-width:820px; }
    .grid { display:grid; grid-template-columns:repeat(auto-fit,minmax(260px,1fr)); gap:14px; margin:24px 0; }
    .card { border:1px solid var(--line); background:var(--paper); border-radius:8px; padding:16px; }
    .card b { display:block; font-size:34px; }
    .pass { color:var(--good); font-weight:800; }
    .fail { color:var(--bad); font-weight:800; }
    table { width:100%; border-collapse:collapse; margin-top:18px; font-size:14px; }
    th, td { border-bottom:1px solid var(--line); padding:10px; text-align:left; vertical-align:top; }
    th { color:var(--muted); font-size:12px; text-transform:uppercase; letter-spacing:.04em; }
    code { white-space:normal; }
  </style>
</head>
<body>
  <main>
    <h1>Owned Product Live Signals</h1>
    <p>Delivery proof only. These checks show public owned-product proof surfaces are live right now. They do not prove revenue, market demand, or paid-client retention.</p>
    <section class="grid">
      ${productResults.map((product) => `
      <article class="card">
        <span>${htmlEscape(product.name)}</span>
        <b>${product.passing}/${product.total}</b>
        <p>${htmlEscape(product.researchPath)}</p>
      </article>`).join("")}
    </section>
    <table>
      <thead><tr><th>Product</th><th>Surface</th><th>Status</th><th>HTTP</th><th>Time</th><th>URL</th><th>Missing Terms</th></tr></thead>
      <tbody>
        ${rows.map(({ product, check }) => `
        <tr>
          <td>${htmlEscape(product.name)}</td>
          <td>${htmlEscape(check.label)}</td>
          <td class="${check.ok ? "pass" : "fail"}">${check.ok ? "pass" : "fail"}</td>
          <td>${check.statusCode || "-"}</td>
          <td>${check.ms}ms</td>
          <td><code>${htmlEscape(check.finalUrl || check.url)}</code></td>
          <td>${htmlEscape(check.missingTerms.join("; ") || "-")}</td>
        </tr>`).join("")}
      </tbody>
    </table>
  </main>
</body>
</html>
`;

write(htmlPath, html);

const failures = productResults.flatMap((product) => product.checks.filter((check) => !check.ok).map((check) => ({
  product: product.name,
  label: check.label,
  url: check.url,
  error: check.error || `missing ${check.missingTerms.join(", ")}`
})));

const payload = {
  status: failures.length ? "attention-needed" : "pass",
  path: outputPath,
  htmlPath,
  updatedMetrics: !noUpdate,
  products: productResults.length,
  passing: productResults.reduce((sum, product) => sum + product.passing, 0),
  total: productResults.reduce((sum, product) => sum + product.total, 0),
  failures
};

console.log(JSON.stringify(payload, null, 2));

if (strict && failures.length) process.exit(1);
