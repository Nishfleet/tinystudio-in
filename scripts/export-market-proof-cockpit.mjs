#!/usr/bin/env node
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { execFileSync } from "node:child_process";
import { localIsoDate } from "./date-utils.mjs";
import { isValidLoomUrl, loomUrlError } from "./lib/loom-url.mjs";
import { sendChannelGuidance } from "./lib/send-channel-guidance.mjs";
import { routedContactPlan } from "./lib/contact-route.mjs";

const args = process.argv.slice(2);
const inputPath = args.find((arg) => !arg.startsWith("--")) || "prospects/loom-links.txt";
const outputArg = args.find((arg) => arg.startsWith("--output="));
const htmlArg = args.find((arg) => arg.startsWith("--html="));
const limitArg = args.find((arg) => arg.startsWith("--limit="));
const plain = args.includes("--plain");
const outputPath = outputArg ? outputArg.split("=").slice(1).join("=") : "growth-brain/ops/market-proof-cockpit.md";
const htmlPath = htmlArg ? htmlArg.split("=").slice(1).join("=") : "growth-brain/ops/market-proof-cockpit.html";
const limit = limitArg ? Number(limitArg.split("=").slice(1).join("=")) : 5;
const today = localIsoDate();

function read(path) {
  return existsSync(path) ? readFileSync(path, "utf8") : "";
}

function json(path) {
  return existsSync(path) ? JSON.parse(readFileSync(path, "utf8")) : {};
}

function write(path, content) {
  const dir = path.split("/").slice(0, -1).join("/");
  if (dir) mkdirSync(dir, { recursive: true });
  writeFileSync(path, content);
}

function clean(value, fallback = "") {
  const normalized = String(value || fallback || "")
    .replace(/\s+/g, " ")
    .replace(/\|/g, "/")
    .trim();
  return normalized;
}

function meaningful(value) {
  return clean(value).length >= 8 && !/^(todo|tbd|n\/a|none|placeholder|add|replace|-|LOOM_URL)$/i.test(clean(value));
}

function sharpnessValue(content, label) {
  const escaped = label.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  return String(content || "").match(new RegExp(`^- ${escaped}:[ \\t]*([^\\n]*)$`, "m"))?.[1]?.trim() || "";
}

function genericImpact(value) {
  return /asking buyers to understand multiple technical services|offer feels generic|hard to evaluate|without hunting through the page|safer, clearer choice/i.test(String(value || ""));
}

function proofRunImpact({ outlineImpact, sharpness, firstFix, route }) {
  const financial = sharpnessValue(sharpness, "Financial");
  const emotional = sharpnessValue(sharpness, "Emotional");
  const functional = sharpnessValue(sharpness, "Functional");
  if (outlineImpact && !genericImpact(outlineImpact)) return outlineImpact;
  if (financial && !genericImpact(financial)) return financial;
  if (functional && !genericImpact(functional)) return functional;
  const routeLine = route ? ` The next route is already clear: ${route}.` : "";
  const fixLine = firstFix ? ` The first fix is specific: ${firstFix}.` : "";
  const feelingLine = emotional && !genericImpact(emotional)
    ? ` ${emotional}`
    : " The page should feel easier to act on before the first call.";
  return `${fixLine}${routeLine}${feelingLine}`.trim();
}

function htmlEscape(value) {
  return String(value || "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;");
}

function shellArg(value) {
  const normalized = String(value || "");
  if (!normalized) return "\"\"";
  if (/^[a-zA-Z0-9_./:=@%+-]+$/.test(normalized)) return normalized;
  return `"${normalized.replaceAll("\\", "\\\\").replaceAll('"', '\\"')}"`;
}

function parseLine(line, index) {
  const trimmed = line.trim();
  if (!trimmed || trimmed.startsWith("#")) return null;
  const separator = trimmed.includes("|") ? "|" : ",";
  const [path, loomUrl, approval, leak, impact, fix, ask] = trimmed
    .split(separator)
    .map((part) => part.trim());
  return {
    line: index + 1,
    path,
    loomUrl,
    approval,
    notes: {
      leak: clean(leak),
      impact: clean(impact),
      fix: clean(fix),
      ask: clean(ask)
    }
  };
}

function approved(value) {
  return ["approved", "quality-approved", "loom-approved"].includes(clean(value).toLowerCase().replace(/\s+/g, "-"));
}

function hasRequiredNotes(notes) {
  return ["leak", "impact", "fix", "ask"].every((key) => meaningful(notes?.[key]));
}

function runJson(commandArgs) {
  const output = execFileSync("node", commandArgs, {
    encoding: "utf8",
    stdio: ["ignore", "pipe", "pipe"]
  });
  return JSON.parse(output);
}

function sendPackageStatus(row) {
  const packagePath = join(row.path || "", "send-package.md");
  const content = read(packagePath);
  if (!content) return { ok: false, missing: "send package missing" };
  const reasons = [];
  if (!content.includes(`- Loom: ${row.loomUrl}`)) reasons.push("Loom mismatch");
  if (!/- Readiness:\s*ready/.test(content)) reasons.push("not readiness-ready");
  if (!/- Loom quality:\s*approved/.test(content)) reasons.push("Loom not approved in package");
  if (!content.includes("## Recording Notes") || /- none captured; use the Loom and page notes only\./.test(content)) {
    reasons.push("recording notes missing");
  }
  return { ok: reasons.length === 0, missing: reasons.join("; ") };
}

function recordingNotesStatus(row) {
  const content = read(join(row.path || "", "recording-notes.md"));
  if (!content) return { ok: false, missing: "recording notes missing" };
  const missing = ["Visible leak:", "Buyer impact:", "First fix:", "Clean ask:"]
    .filter((phrase) => !content.includes(phrase));
  return { ok: missing.length === 0, missing: missing.join("; ") };
}

function sentStatus(row) {
  const pipeline = json(join(row.path || "", "pipeline.json"));
  const notes = Array.isArray(pipeline.notes) ? pipeline.notes : [];
  const touches = Array.isArray(pipeline.touches) ? pipeline.touches : [];
  const sentNote = notes.some((note) => note.action === "sent" && String(note.note || "").includes(row.loomUrl));
  const sentTouch = touches.some((touch) => touch.action === "sent" && String(touch.note || "").includes(row.loomUrl));
  const reasons = [];
  if (!pipeline.sentAt) reasons.push("sentAt blank");
  if (!sentNote && !sentTouch) reasons.push("no sent note for Loom");
  if (!pipeline.sentChannel && !pipeline.lastChannel) reasons.push("send channel missing");
  return { ok: reasons.length === 0, missing: reasons.join("; ") };
}

function bestRoute(path) {
  return routedContactPlan(read(join(path || "", "contact-plan.md")), { emailReady: channel.emailReady });
}

function rowStatus(row) {
  const missing = [];
  if (!row.path || !existsSync(row.path)) missing.push("prospect folder missing");
  if (!row.loomUrl || !isValidLoomUrl(row.loomUrl)) missing.push(row.loomUrl ? loomUrlError() : "record Loom URL");
  if (!approved(row.approval)) missing.push("approve Loom quality");
  if (!hasRequiredNotes(row.notes)) missing.push("complete leak, impact, fix, and ask notes");

  if (missing.length) {
    return { label: "record Loom", level: "bad", missing, command: "npm run growth:start -- --view=record" };
  }

  const notes = recordingNotesStatus(row);
  const sendPackage = sendPackageStatus(row);
  const sent = sendPackage.ok ? sentStatus(row) : { ok: false, missing: "send package not ready" };

  if (!sendPackage.ok || !notes.ok) {
    return {
      label: "prep send package",
      level: "warn",
      missing: [sendPackage.missing, notes.missing].filter(Boolean),
      command: `npm run prospect:send-prep -- ${shellArg(row.path)} ${shellArg(row.loomUrl)} --approved`
    };
  }

  if (!sent.ok) {
    return {
      label: "send from outbox",
      level: "warn",
      missing: [sent.missing].filter(Boolean),
      command: "npm run prospect:outbox"
    };
  }

  return {
    label: "sent proof captured",
    level: "good",
    missing: [],
    command: "npm run market:parity"
  };
}

if (!Number.isFinite(limit) || limit < 1) {
  console.error("--limit must be a positive number.");
  process.exit(1);
}

if (!existsSync(inputPath)) {
  console.error(`Proof-run Loom sheet not found: ${inputPath}`);
  process.exit(1);
}

const checkOutputPath = outputPath.startsWith("prospects/kit-")
  ? "prospects/kit-market-proof-run-check.md"
  : "growth-brain/ops/market-proof-run-check.md";
const check = runJson(["scripts/check-market-proof-run.mjs", inputPath, `--output=${checkOutputPath}`, `--limit=${limit}`]);
const channel = sendChannelGuidance();

const rows = read(inputPath)
  .split("\n")
  .map(parseLine)
  .filter(Boolean)
  .slice(0, limit)
  .map((row) => {
    const metadata = json(join(row.path || "", "metadata.json"));
    const status = rowStatus(row);
    const sendRoute = bestRoute(row.path);
    const sharpness = read(join(row.path || "", "recording-sharpness-brief.md"));
    return {
      ...row,
      name: metadata.name || row.path?.split("/").at(-1) || `row-${row.line}`,
      website: metadata.website || "",
      status,
      route: sendRoute,
      before: row.notes.leak || "Visible leak pending",
      after: row.notes.fix || "First fix pending",
      value: proofRunImpact({
        outlineImpact: row.notes.impact,
        sharpness,
        firstFix: row.notes.fix,
        route: sendRoute
      }) || "Client-visible value pending",
      nextMeasurement: status.label === "sent proof captured"
        ? "Watch for reply, call booking, close, then delivery proof"
        : status.label === "send from outbox"
          ? "Send touch with channel and mark sent from the outbox"
          : "Record a short Loom and capture leak, impact, fix, and ask"
    };
  });

const statusCounts = rows.reduce((accumulator, row) => {
  accumulator[row.status.label] = (accumulator[row.status.label] || 0) + 1;
  return accumulator;
}, {});

const cockpitStatus = check.status === "sent-proof-captured" ? "sent-proof-captured" : "proof-run-active";

const rowMarkdown = rows.length
  ? rows.map((row, index) => `| ${index + 1} | ${row.name} | ${row.status.label} | ${row.before} | ${row.after} | ${row.value} | ${row.nextMeasurement} | \`${row.status.command}\` |`).join("\n")
  : "| - | - | record Loom | No proof rows found. | - | - | - | `npm run market:proof-run` |";

const missingMarkdown = rows.length
  ? rows.map((row, index) => `| ${index + 1} | ${row.name} | ${row.status.missing.join("; ") || "clean"} | ${row.route} |`).join("\n")
  : "| - | - | No rows found. | - |";

const markdown = `# Market Proof Cockpit

Generated: ${today}

## Moat Verdict

Yes, the wedge can be a moat if it stays visible and measurable: every touch must show the tangible improvement delta, the proof source, the client-visible value, and the next measurement. This cockpit keeps the first external proof run honest.

## Proof Run Status

| Area | Current |
|---|---:|
| Proof checker status | ${check.status} |
| Valid approved Loom rows | ${check.validApprovedRows}/${limit} |
| Ready send packages | ${check.readySendPackages}/${limit} |
| Sent proof rows | ${check.sentProofRows}/${limit} |
| Recommended send channel | ${channel.recommendedChannel} |

${channel.warnings.length ? `Sender warnings: ${channel.warnings.join("; ")}.` : "Sender setup is clean."}

## Tangible Improvement Queue

| # | Prospect | Status | Before / Leak | After / First Fix | Client-Visible Value | Next Measurement | Command |
|---:|---|---|---|---|---|---|---|
${rowMarkdown}

## Missing / Route Review

| # | Prospect | Missing | Route |
|---:|---|---|---|
${missingMarkdown}

## Operating Rule

- Do not claim market proof until this reaches \`sent-proof-captured\`.
- Do not claim sales proof until at least one real reply becomes a call, close package, and won sprint.
- Do not claim delivery proof until a client or owned-startup folder has approved proof claims.
- Do not pitch renewal until weekly/monthly retention checkups show shipped work, learnings, next actions, and client pulse.
- The moat is not the dashboard. The moat is the discipline of showing what changed, why it mattered, what proves it, and what gets measured next.

## Dashboard Rule

Use this dashboard before every recording/send session so the proof run stays tied to visible improvement, not vague agency claims.

## Next Command

\`\`\`bash
${check.nextCommand}
\`\`\`
`;

const statusRowsHtml = [
  ["Proof checker", check.status],
  ["Valid approved Loom rows", `${check.validApprovedRows}/${limit}`],
  ["Ready send packages", `${check.readySendPackages}/${limit}`],
  ["Sent proof rows", `${check.sentProofRows}/${limit}`],
  ["Recommended channel", channel.recommendedChannel]
].map(([label, value]) => `
      <div class="card"><b>${htmlEscape(value)}</b><span>${htmlEscape(label)}</span></div>`).join("");

const proofRowsHtml = rows.length
  ? rows.map((row, index) => `
        <tr>
          <td>${index + 1}</td>
          <td><b>${htmlEscape(row.name)}</b><br><span>${htmlEscape(row.website || row.path)}</span></td>
          <td><span class="pill ${htmlEscape(row.status.level)}">${htmlEscape(row.status.label)}</span></td>
          <td>${htmlEscape(row.before)}</td>
          <td>${htmlEscape(row.after)}</td>
          <td>${htmlEscape(row.value)}</td>
          <td>${htmlEscape(row.nextMeasurement)}</td>
          <td><code>${htmlEscape(row.status.command)}</code></td>
        </tr>`).join("")
  : `<tr><td>-</td><td>No proof rows found.</td><td><span class="pill bad">record Loom</span></td><td>-</td><td>-</td><td>-</td><td>-</td><td><code>npm run market:proof-run</code></td></tr>`;

const proofCardsHtml = rows.length
  ? rows.map((row, index) => `
        <article class="proof-card">
          <div class="proof-card-head">
            <div>
              <span class="eyebrow">#${index + 1}</span>
              <h3>${htmlEscape(row.name)}</h3>
              <p>${htmlEscape(row.website || row.path)}</p>
            </div>
            <span class="pill ${htmlEscape(row.status.level)}">${htmlEscape(row.status.label)}</span>
          </div>
          <dl>
            <div><dt>Before / Leak</dt><dd>${htmlEscape(row.before)}</dd></div>
            <div><dt>After / First Fix</dt><dd>${htmlEscape(row.after)}</dd></div>
            <div><dt>Client Value</dt><dd>${htmlEscape(row.value)}</dd></div>
            <div><dt>Next Measurement</dt><dd>${htmlEscape(row.nextMeasurement)}</dd></div>
            <div><dt>Command</dt><dd><code>${htmlEscape(row.status.command)}</code></dd></div>
          </dl>
        </article>`).join("")
  : `<article class="proof-card"><div class="proof-card-head"><div><span class="eyebrow">Empty</span><h3>No proof rows found</h3></div><span class="pill bad">record Loom</span></div><dl><div><dt>Command</dt><dd><code>npm run market:proof-run</code></dd></div></dl></article>`;

const missingRowsHtml = rows.length
  ? rows.map((row, index) => `
        <tr>
          <td>${index + 1}</td>
          <td>${htmlEscape(row.name)}</td>
          <td>${htmlEscape(row.status.missing.join("; ") || "clean")}</td>
          <td>${htmlEscape(row.route)}</td>
        </tr>`).join("")
  : `<tr><td>-</td><td>-</td><td>No rows found.</td><td>-</td></tr>`;

const missingCardsHtml = rows.length
  ? rows.map((row, index) => `
        <article class="route-card">
          <span class="eyebrow">#${index + 1}</span>
          <h3>${htmlEscape(row.name)}</h3>
          <dl>
            <div><dt>Missing</dt><dd>${htmlEscape(row.status.missing.join("; ") || "clean")}</dd></div>
            <div><dt>Route</dt><dd>${htmlEscape(row.route)}</dd></div>
          </dl>
        </article>`).join("")
  : `<article class="route-card"><span class="eyebrow">Empty</span><h3>No rows found</h3></article>`;

const html = `<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <link rel="icon" href="data:,">
  <title>TinyStudio Market Proof Cockpit</title>
  <style>
    :root { color-scheme: light; --ink:#14161a; --muted:#667085; --line:#d9e1ea; --paper:#f7f9fc; --good:#0f7b45; --warn:#9a5b00; --bad:#b42318; }
    * { box-sizing: border-box; }
    body { margin:0; background:#fff; color:var(--ink); font-family:Inter, ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif; }
    main { max-width:1220px; margin:0 auto; padding:28px 18px 44px; }
    header { display:grid; grid-template-columns:1fr auto; gap:16px; align-items:end; padding-bottom:18px; border-bottom:1px solid var(--line); }
    h1 { margin:0; font-size:clamp(30px, 4vw, 46px); line-height:1; letter-spacing:0; }
    h2 { margin:0 0 10px; font-size:18px; letter-spacing:0; }
    p { margin:8px 0 0; color:var(--muted); max-width:820px; }
    .date { color:var(--muted); font-size:14px; text-align:right; white-space:nowrap; }
    .cards { display:grid; grid-template-columns:repeat(5, minmax(0, 1fr)); gap:12px; margin:18px 0; }
    .card { border:1px solid var(--line); border-radius:8px; background:var(--paper); padding:13px; min-height:74px; }
    .card b { display:block; font-size:23px; line-height:1.1; margin-bottom:8px; overflow-wrap:anywhere; }
    .card span, td span { color:var(--muted); font-size:13px; }
    section { margin-top:18px; }
    table { width:100%; border-collapse:collapse; border:1px solid var(--line); border-radius:8px; overflow:hidden; }
    th, td { text-align:left; padding:11px; border-bottom:1px solid var(--line); vertical-align:top; }
    th { background:var(--paper); color:#475467; font-size:12px; text-transform:uppercase; letter-spacing:.04em; }
    code { font-family:ui-monospace, SFMono-Regular, Menlo, Consolas, monospace; font-size:12px; overflow-wrap:anywhere; }
    .next { padding:16px; border:1px solid var(--line); border-radius:8px; background:var(--paper); }
    .pill { display:inline-flex; border-radius:999px; padding:4px 8px; color:#fff; font-size:12px; font-weight:800; text-transform:uppercase; letter-spacing:.03em; white-space:nowrap; }
    .good { background:var(--good); }
    .warn { background:var(--warn); }
    .bad { background:var(--bad); }
    .mobile-list { display:none; }
    .proof-card, .route-card { border:1px solid var(--line); border-radius:8px; background:#fff; padding:14px; }
    .proof-card + .proof-card, .route-card + .route-card { margin-top:12px; }
    .proof-card-head { display:flex; gap:12px; justify-content:space-between; align-items:flex-start; }
    .proof-card h3, .route-card h3 { margin:3px 0 0; font-size:18px; letter-spacing:0; }
    .proof-card p { margin:4px 0 0; max-width:none; overflow-wrap:anywhere; }
    .eyebrow { color:var(--muted); font-size:12px; font-weight:800; text-transform:uppercase; letter-spacing:.04em; }
    dl { margin:13px 0 0; display:grid; gap:11px; }
    dt { color:#475467; font-size:12px; font-weight:800; text-transform:uppercase; letter-spacing:.04em; }
    dd { margin:3px 0 0; color:var(--ink); overflow-wrap:anywhere; }
    @media (max-width:860px) {
      header { display:block; }
      .date { text-align:left; margin-top:10px; }
      .cards { grid-template-columns:repeat(2, minmax(0, 1fr)); }
      .desktop-table { display:none; }
      .mobile-list { display:block; }
    }
    @media (max-width:460px) {
      main { padding:28px 16px 40px; }
      .cards { grid-template-columns:1fr 1fr; gap:10px; }
      .card { padding:12px; min-height:84px; }
      .card b { font-size:20px; }
      .proof-card-head { display:block; }
      .proof-card-head .pill { margin-top:10px; }
    }
  </style>
</head>
<body>
  <main>
    <header>
      <div>
        <h1>Market Proof Cockpit</h1>
        <p>The wedge is tangible improvement proof: before, after, proof, value, and the next measurement. This dashboard keeps the first external proof run honest.</p>
      </div>
      <div class="date">Generated ${htmlEscape(today)}</div>
    </header>
    <section class="cards">${statusRowsHtml}
    </section>
    <section class="next">
      <h2>Next Command</h2>
      <code>${htmlEscape(check.nextCommand)}</code>
      <p>${htmlEscape(channel.warnings.length ? `Sender warnings: ${channel.warnings.join("; ")}.` : "Sender setup is clean.")}</p>
    </section>
    <section>
      <h2>Tangible Improvement Queue</h2>
      <div class="mobile-list">${proofCardsHtml}
      </div>
      <table class="desktop-table"><thead><tr><th>#</th><th>Prospect</th><th>Status</th><th>Before / Leak</th><th>After / First Fix</th><th>Client Value</th><th>Next Measurement</th><th>Command</th></tr></thead><tbody>${proofRowsHtml}
      </tbody></table>
    </section>
    <section>
      <h2>Missing / Route Review</h2>
      <div class="mobile-list">${missingCardsHtml}
      </div>
      <table class="desktop-table"><thead><tr><th>#</th><th>Prospect</th><th>Missing</th><th>Route</th></tr></thead><tbody>${missingRowsHtml}
      </tbody></table>
    </section>
  </main>
</body>
</html>
`;

write(outputPath, markdown);
write(htmlPath, html);

const result = {
  status: cockpitStatus,
  path: outputPath,
  htmlPath,
  inputPath,
  checkPath: checkOutputPath,
  checkStatus: check.status,
  rows: rows.length,
  statusCounts,
  sentProofRows: check.sentProofRows,
  nextCommand: check.nextCommand,
  recommendedChannel: channel.recommendedChannel
};

console.log(plain ? `${result.status}: ${check.status}. Next: ${check.nextCommand}` : JSON.stringify(result, null, 2));
