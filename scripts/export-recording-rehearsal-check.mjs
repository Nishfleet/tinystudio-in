#!/usr/bin/env node
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join, relative } from "node:path";
import { checkProspectReadiness, prospectWarningWeight } from "./lib/prospect-readiness.mjs";
import { sendChannelGuidance } from "./lib/send-channel-guidance.mjs";
import { routedContactPlan } from "./lib/contact-route.mjs";
import { localIsoDate } from "./date-utils.mjs";
import { listOutboundProspectFolders } from "./lib/outbound-prospects.mjs";

const args = process.argv.slice(2);
const limitArg = args.find((arg) => arg.startsWith("--limit="));
const outputArg = args.find((arg) => arg.startsWith("--output="));
const htmlArg = args.find((arg) => arg.startsWith("--html="));
const includeSmoke = args.includes("--include-smoke");
const limit = limitArg ? Number(limitArg.split("=")[1]) : 5;
const outputPath = outputArg ? outputArg.split("=")[1] : "prospects/recording-rehearsal-check.md";
const htmlPath = htmlArg ? htmlArg.split("=")[1] : "prospects/recording-rehearsal-check.html";
const today = localIsoDate();

function read(path) {
  return existsSync(path) ? readFileSync(path, "utf8") : "";
}

function json(path) {
  return existsSync(path) ? JSON.parse(readFileSync(path, "utf8")) : {};
}

function write(path, content) {
  const dir = dirname(path);
  if (dir && dir !== ".") mkdirSync(dir, { recursive: true });
  writeFileSync(path, content);
}

function listFolders(root) {
  return listOutboundProspectFolders(root).filter((path) => includeSmoke || !/(^|\/)(?:kit|import)-smoke/.test(path));
}

function section(markdown, heading, level = "##") {
  const escaped = heading.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const nextHeading = level === "##" ? "\\n## " : "\\n(?:## |### )";
  const match = String(markdown || "").match(new RegExp(`(?:^|\\n)${level} ${escaped}\\n+([\\s\\S]*?)(?=${nextHeading}|$)`));
  return match ? match[1].trim() : "";
}

function lineValue(markdown, number) {
  return String(markdown || "").match(new RegExp(`^${number}\\. [^\\n:]+:[ \\t]*([^\\n]*)$`, "m"))?.[1]?.trim() || "";
}

function bulletValues(content) {
  return String(content || "")
    .split("\n")
    .map((line) => line.trim().replace(/^- /, ""))
    .filter((line) => line && line !== "none found" && line !== "-");
}

function labeledValue(content, label) {
  const escaped = label.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  return String(content || "").match(new RegExp(`^- ${escaped}:\\s*([^\\n]+)$`, "m"))?.[1]?.trim() || "";
}

function meaningful(value, minLength = 18) {
  const normalized = String(value || "").replace(/\s+/g, " ").trim();
  return normalized.length >= minLength && !/^(todo|tbd|n\/a|none|placeholder|add|replace|-|\[.*\])$/i.test(normalized);
}

function genericValue(value) {
  return /asking buyers to understand multiple technical services|offer feels generic|hard to evaluate|without hunting through the page|safer, clearer choice|more qualified visitors should reach|a buyer can see the right next path sooner|page feels safer because the buyer/i.test(String(value || ""));
}

function bannedClaims(content) {
  const text = String(content || "")
    .split("\n")
    .filter((line) => !/do not|without promising|blocked claim|guardrail/i.test(line))
    .join("\n");
  return [
    /\bguarantee(?:d|s)?\b/i,
    /\b\d+%\s*(?:lift|increase|more|growth|roi|roas|conversion|traffic|rankings?)\b/i,
    /\b(rank|ranking|rankings)\s+(?:guarantee|guaranteed|in\s+\d+\s+days)\b/i,
    /\bROAS\b/i
  ].filter((pattern) => pattern.test(text)).map((pattern) => pattern.source);
}

function containsAny(haystack, values) {
  const normalize = (value) => String(value || "")
    .toLowerCase()
    .replace(/[“”"]/g, "'")
    .replace(/[.,;:!?]+/g, "")
    .replace(/\s+/g, " ")
    .trim();
  const text = normalize(haystack);
  return values
    .map((value) => normalize(value))
    .filter((value) => value.length >= 4)
    .some((value) => text.includes(value));
}

function excerpt(value, max = 120) {
  const clean = String(value || "").replace(/\s+/g, " ").trim();
  return clean.length > max ? `${clean.slice(0, max - 3).trim()}...` : clean;
}

function localHref(path) {
  return relative(dirname(htmlPath), path).replace(/\\/g, "/") || path.split("/").at(-1);
}

function htmlEscape(value) {
  return String(value || "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;");
}

function snapshotCues(snapshot) {
  const pagePromise = section(snapshot, "Page Promise");
  return {
    visiblePromise: bulletValues(section(snapshot, "H1", "###"))[0] || labeledValue(pagePromise, "Title"),
    routes: bulletValues(section(snapshot, "CTA And Route Cues")).slice(0, 5),
    proof: bulletValues(section(snapshot, "Trust / Proof Cues")).slice(0, 5)
  };
}

function scoreProspect(prospectPath, channelGuidance) {
  const metadata = json(join(prospectPath, "metadata.json"));
  const pipeline = json(join(prospectPath, "pipeline.json"));
  const script = read(join(prospectPath, "recording-script.md"));
  const brief = read(join(prospectPath, "recording-sharpness-brief.md"));
  const snapshot = read(join(prospectPath, "page-snapshot.md"));
  const contactPlan = read(join(prospectPath, "contact-plan.md"));
  const outline = read(join(prospectPath, "loom-outline.md"));
  const cues = snapshotCues(snapshot);
  const talkTrack = section(script, "Talk Track");
  const route = routedContactPlan(contactPlan, { emailReady: channelGuidance.emailReady });
  const leak = lineValue(outline, 3);
  const outlineImpact = lineValue(outline, 4);
  const fix = lineValue(outline, 6);
  const ask = lineValue(outline, 7) || section(outline, "Close");
  const words = talkTrack.split(/\s+/).filter(Boolean).length;
  const unsupportedClaims = bannedClaims([talkTrack, ask].join("\n\n"));
  const cueValues = [cues.visiblePromise, ...cues.routes, ...cues.proof];
  const talkHasBuyerValue = /that matters because/i.test(talkTrack)
    && meaningful(talkTrack, 120)
    && !genericValue(talkTrack)
    && containsAny(talkTrack, cueValues);

  const checks = [
    {
      area: "Talk track",
      points: 1,
      passed: meaningful(talkTrack, 180),
      evidence: `${words} spoken words`
    },
    {
      area: "Specific leak",
      points: 2,
      passed: meaningful(leak) && !genericValue(leak) && containsAny(talkTrack, [leak]),
      evidence: leak || "missing leak"
    },
    {
      area: "Buyer impact",
      points: 2,
      passed: talkHasBuyerValue,
      evidence: outlineImpact && !genericValue(outlineImpact) ? outlineImpact : excerpt(talkTrack)
    },
    {
      area: "First fix",
      points: 2,
      passed: meaningful(fix) && !genericValue(fix) && containsAny(talkTrack, [fix]),
      evidence: fix || "missing first fix"
    },
    {
      area: "Clean ask",
      points: 1,
      passed: meaningful(ask) && /if useful|sprint|next step|reply|send|worth/i.test(ask) && unsupportedClaims.length === 0,
      evidence: unsupportedClaims.length ? `blocked claim patterns: ${unsupportedClaims.join(", ")}` : ask || "missing ask"
    },
    {
      area: "2-3 minute shape",
      points: 1,
      passed: words >= 250 && words <= 520,
      evidence: `${words} spoken words`
    },
    {
      area: "Contact route",
      points: 1,
      passed: meaningful(route) && !/run contact plan|contact-plan needs/i.test(route),
      evidence: route || "missing route"
    }
  ];

  const score = checks.reduce((sum, check) => sum + (check.passed ? check.points : 0), 0);
  const weakSpots = checks
    .filter((check) => !check.passed)
    .map((check) => check.area);

  return {
    prospectPath,
    name: metadata.name || prospectPath.split("/").at(-1),
    website: metadata.website || "",
    stage: pipeline.stage || "new",
    score,
    total: 10,
    status: score >= 8 && weakSpots.length === 0 ? "ready" : score >= 8 ? "polish" : "needs-work",
    weakSpots,
    checks,
    route,
    scriptPath: join(prospectPath, "recording-script.md")
  };
}

const channelGuidance = sendChannelGuidance();
const selectedProspects = listFolders("prospects")
  .map((path) => {
    const metadata = json(join(path, "metadata.json"));
    const pipeline = json(join(path, "pipeline.json"));
    const readiness = checkProspectReadiness(path);
    return {
      path,
      name: metadata.name || path.split("/").at(-1),
      website: metadata.website || "",
      stage: pipeline.stage || "new",
      weight: prospectWarningWeight(readiness.warnings || [])
    };
  })
  .filter((prospect) => prospect.website && !["won", "lost", "paused"].includes(prospect.stage))
  .sort((a, b) => a.weight - b.weight || a.name.localeCompare(b.name))
  .slice(0, limit);

const rows = selectedProspects.map((prospect) => scoreProspect(prospect.path, channelGuidance));
const minimumScore = rows.length ? Math.min(...rows.map((row) => row.score)) : 0;
const ready = rows.length > 0 && rows.every((row) => row.status === "ready");
const status = ready ? "ready" : rows.length ? "needs-polish" : "empty";

const summaryRows = rows.length
  ? rows.map((row) => `| ${row.name} | ${row.score}/${row.total} | ${row.status} | ${row.weakSpots.join(", ") || "none"} | \`${row.scriptPath}\` |`).join("\n")
  : "| - | - | empty | No active prospects found. | - |";

const detailSections = rows.map((row) => {
  const checkRows = row.checks
    .map((check) => `| ${check.area} | ${check.passed ? "pass" : "missing"} | ${check.points} | ${excerpt(check.evidence, 160)} |`)
    .join("\n");
  return `### ${row.name}

Score: ${row.score}/${row.total} - ${row.status}

| Check | Status | Points | Evidence |
|---|---|---:|---|
${checkRows}
`;
}).join("\n");

const markdown = `# Recording Rehearsal Check

Generated: ${today}

Status: ${status}

## Batch Verdict

${ready
  ? "Ready to record. The selected Loom scripts show a specific leak, buyer-visible value, first fix, and clean next step."
  : "Needs polish before recording. Do not record or send a Loom that cannot show the improvement delta in plain language."}

Minimum score: ${minimumScore}/10

## Summary

| Prospect | Score | Status | Weak Spots | Script |
|---|---:|---|---|---|
${summaryRows}

## Recording Rules

- Record only after every selected prospect is ready.
- The Loom must show one visible leak, one first fix, and one buyer-visible improvement.
- The value line must reference the prospect's actual promise, route, proof, or decision moment.
- Do not claim revenue, ranking, ROAS, traffic, or conversion lift.
- Do not count this as market proof until the Loom is sent and the send is logged.

## Prospect Checks

${detailSections || "No active prospects found."}

## Next Commands

\`\`\`bash
npm run prospect:rehearsal -- --limit=${limit}
npm run market:proof-cockpit
npm run market:after-recording -- --from-clipboard
\`\`\`
`;

const tableHtml = rows.length
  ? rows.map((row) => `
        <tr>
          <td>${htmlEscape(row.name)}</td>
          <td><strong>${row.score}/${row.total}</strong></td>
          <td><span class="pill ${row.status === "ready" ? "good" : row.status === "polish" ? "warn" : "bad"}">${htmlEscape(row.status)}</span></td>
          <td>${htmlEscape(row.weakSpots.join(", ") || "none")}</td>
          <td><a href="${htmlEscape(localHref(row.scriptPath))}">Script</a></td>
        </tr>`).join("")
  : `<tr><td>-</td><td>-</td><td>empty</td><td>No active prospects found.</td><td>-</td></tr>`;

const detailHtml = rows.map((row) => `
      <section>
        <h2>${htmlEscape(row.name)}</h2>
        <p><strong>${row.score}/${row.total}</strong> - ${htmlEscape(row.status)}</p>
        <table>
          <thead><tr><th>Check</th><th>Status</th><th>Points</th><th>Evidence</th></tr></thead>
          <tbody>
            ${row.checks.map((check) => `
              <tr>
                <td>${htmlEscape(check.area)}</td>
                <td><span class="pill ${check.passed ? "good" : "bad"}">${check.passed ? "pass" : "missing"}</span></td>
                <td>${check.points}</td>
                <td>${htmlEscape(excerpt(check.evidence, 180))}</td>
              </tr>`).join("")}
          </tbody>
        </table>
      </section>`).join("");

const html = `<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>TinyStudio Recording Rehearsal Check</title>
  <style>
    :root { color-scheme: light; --ink:#15171a; --muted:#667085; --line:#d8dee6; --paper:#f7f9fb; --good:#0f7b45; --warn:#9a5b00; --bad:#b42318; }
    * { box-sizing: border-box; }
    body { margin: 0; font-family: Inter, ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif; color: var(--ink); background: #fff; }
    main { max-width: 1120px; margin: 0 auto; padding: 28px 18px 42px; }
    header { border-bottom: 1px solid var(--line); padding-bottom: 18px; margin-bottom: 18px; }
    h1 { margin: 0; font-size: clamp(30px, 4vw, 44px); line-height: 1; letter-spacing: 0; }
    p { color: var(--muted); }
    section { margin-top: 22px; padding-top: 18px; border-top: 1px solid var(--line); }
    table { width: 100%; border-collapse: collapse; background: #fff; border: 1px solid var(--line); border-radius: 8px; overflow: hidden; }
    th, td { padding: 10px; border-bottom: 1px solid var(--line); text-align: left; vertical-align: top; font-size: 14px; }
    th { background: var(--paper); color: #344054; }
    a { color: #175cd3; }
    .pill { display: inline-block; padding: 3px 8px; border-radius: 999px; font-size: 12px; font-weight: 700; }
    .good { background: #e8f5ee; color: var(--good); }
    .warn { background: #fff4df; color: var(--warn); }
    .bad { background: #fdecec; color: var(--bad); }
    .verdict { padding: 14px; background: var(--paper); border: 1px solid var(--line); border-radius: 8px; }
    code { font-family: ui-monospace, SFMono-Regular, Menlo, Consolas, monospace; }
    @media (max-width: 760px) { table { display: block; overflow-x: auto; } th, td { min-width: 150px; } }
  </style>
</head>
<body>
  <main>
    <header>
      <h1>Recording Rehearsal Check</h1>
      <p>Generated ${htmlEscape(today)}. Record only after each Loom script shows a visible leak, buyer value, first fix, and clean ask.</p>
    </header>
    <div class="verdict">
      <p><strong>Status:</strong> <span class="pill ${ready ? "good" : status === "empty" ? "warn" : "bad"}">${htmlEscape(status)}</span></p>
      <p><strong>Minimum score:</strong> ${minimumScore}/10</p>
      <p>${ready ? "Ready to record." : "Needs polish before recording."}</p>
    </div>
    <section>
      <h2>Summary</h2>
      <table>
        <thead><tr><th>Prospect</th><th>Score</th><th>Status</th><th>Weak Spots</th><th>Script</th></tr></thead>
        <tbody>${tableHtml}</tbody>
      </table>
    </section>
    ${detailHtml}
  </main>
</body>
</html>
`;

write(outputPath, markdown);
write(htmlPath, html);

console.log(JSON.stringify({
  status,
  path: outputPath,
  htmlPath,
  ready,
  count: rows.length,
  minimumScore,
  rows
}, null, 2));
