#!/usr/bin/env node
import { existsSync, mkdirSync, readdirSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { localIsoDate } from "./date-utils.mjs";
import { checkProspectReadiness, prospectWarningWeight } from "./lib/prospect-readiness.mjs";
import { listOutboundProspectFolders } from "./lib/outbound-prospects.mjs";
import { runRepoJson as runJson } from "./lib/runtime-roots.mjs";

const outputArg = process.argv.find((arg) => arg.startsWith("--output="));
const outputPath = outputArg ? outputArg.split("=")[1] : "runs/growth-doctor.md";
const skipChecks = process.argv.includes("--no-checks");
const plain = process.argv.includes("--plain");
const today = localIsoDate();

function runCheck(name, args) {
  const start = Date.now();
  try {
    const result = runJson(args);
    const reported = result.status || "passed";
    const status = ["pass", "passed", "ready"].includes(reported) ? "pass" : reported;
    return {
      name,
      status,
      durationMs: Date.now() - start,
      detail: result.warnings?.length ? `${reported}: ${result.warnings.length} warning(s)` : reported,
      warnings: result.warnings || []
    };
  } catch (error) {
    const output = String(error.stderr || error.stdout || error.message || "").trim();
    return {
      name,
      status: "fail",
      durationMs: Date.now() - start,
      detail: output.split("\n").slice(0, 6).join(" "),
      warnings: []
    };
  }
}

function listFolders(root) {
  if (root === "prospects" || root.endsWith("/prospects")) return listOutboundProspectFolders(root).filter((path) => !/(^|\/)(?:kit|import)-smoke/.test(path));
  if (!existsSync(root)) return [];
  return readdirSync(root, { withFileTypes: true })
    .filter((entry) => entry.isDirectory())
    .filter((entry) => !/^(kit|import)-smoke/.test(entry.name))
    .map((entry) => join(root, entry.name))
    .sort();
}

function json(path) {
  return existsSync(path) ? JSON.parse(readFileSync(path, "utf8")) : {};
}

function read(path) {
  return existsSync(path) ? readFileSync(path, "utf8") : "";
}

function recordingPrepStatus(limit = 5) {
  const prospects = listFolders("prospects")
    .map((path) => {
      const metadata = json(join(path, "metadata.json"));
      const pipeline = json(join(path, "pipeline.json"));
      const result = checkProspectReadiness(path);
      return {
        path,
        name: metadata.name || path.split("/").at(-1),
        stage: pipeline.stage || "new",
        warnings: result.warnings || [],
        weight: prospectWarningWeight(result.warnings || [])
      };
    })
    .filter((prospect) => !["won", "lost", "paused"].includes(prospect.stage))
    .sort((a, b) => a.weight - b.weight || a.name.localeCompare(b.name))
    .slice(0, limit);

  const rows = prospects.map((prospect) => {
    const missing = [];
    const script = read(join(prospect.path, "recording-script.md"));
    if (!existsSync(join(prospect.path, "page-snapshot.md"))) missing.push("page snapshot");
    if (!existsSync(join(prospect.path, "contact-plan.md"))) missing.push("contact plan");
    if (!existsSync(join(prospect.path, "recording-sharpness-brief.md"))) missing.push("recording sharpness brief");
    if (!script.includes("## Live Page Cues")) missing.push("snapshot-aware recording script");
    if (!script.includes("## Recording Sharpness")) missing.push("sharpness-aware recording script");
    return { ...prospect, missing };
  });

  return {
    fresh: rows.length > 0 && rows.every((row) => row.missing.length === 0),
    count: rows.length,
    missing: rows.filter((row) => row.missing.length).map((row) => `${row.name}: ${row.missing.join(", ")}`)
  };
}

function bottleneck(counts, recordingPrep, rehearsal) {
  if (counts.replies > counts.calls) {
    return {
      mission: "Book calls from replies before doing more cold outbound.",
      view: "sales",
      command: "npm run growth:start"
    };
  }
  if (counts.calls > counts.closed) {
    return {
      mission: "Close open sales calls before starting more new conversations.",
      view: "sales",
      command: "npm run growth:start"
    };
  }
  if (counts.dueFollowUp > 0) {
    return {
      mission: "Send due follow-ups before recording new Looms.",
      view: "followup",
      command: "npm run growth:start"
    };
  }
  if (counts.scored > counts.loomsRecorded) {
    const recordCommand = !recordingPrep.fresh
      ? "npm run prospect:prep-recording -- --limit=5"
      : rehearsal.status !== "ready"
        ? "npm run prospect:rehearsal -- --limit=5"
        : "npm run growth:start -- --view=record";
    return {
      mission: "Record the scored Looms. This is the current money bottleneck.",
      view: "record",
      command: recordCommand
    };
  }
  if (counts.readyToSend > 0 || counts.loomsRecorded > counts.sends) {
    return {
      mission: "Send the recorded Looms and mark them sent.",
      view: "send",
      command: "npm run growth:start"
    };
  }
  return {
    mission: "Score the next prospects and keep the outbound batch moving.",
    view: "score",
    command: "npm run growth:start"
  };
}

function statusFor(checks) {
  if (skipChecks) return "not-verified";
  if (checks.some((check) => check.status === "fail")) return "blocked";
  if (checks.some((check) => check.status === "warn" || check.status === "warning")) return "warning";
  return "ready";
}

const metrics = runJson(["scripts/export-growth-metrics.mjs", "--output=runs/live-metrics.md"]);
const todayResult = runJson(["scripts/show-growth-command-center.mjs", "--limit=8"]);
const recordingPrep = recordingPrepStatus(5);
const rehearsal = runJson(["scripts/export-recording-rehearsal-check.mjs", "--limit=5"]);
const next = bottleneck(metrics.counts, recordingPrep, rehearsal);
const checks = skipChecks ? [] : [
  runCheck("Agency defaults", ["scripts/check-agency-defaults.mjs"]),
  runCheck("Sender setup", ["scripts/check-outbound-sender-setup.mjs"]),
  runCheck("Claim safety", ["scripts/check-outbound-claim-safety.mjs"]),
  runCheck("Send readiness", ["scripts/check-outbound-send-readiness.mjs"])
];
const status = statusFor(checks);

const checkRows = checks.length
  ? checks.map((check) => `| ${check.name} | ${check.status} | ${check.detail} |`).join("\n")
  : "| skipped | skipped | Run without `--no-checks` before sending. |";

const warningRows = checks
  .flatMap((check) => (check.warnings || []).map((warning) => ({ check: check.name, ...warning })))
  .map((warning) => `| ${warning.check} | ${warning.rule || "-"} | ${warning.detail || "-"} |`)
  .join("\n");

const focusRows = (todayResult.todayFocus || []).map((item) => `- ${String(item).replace(/\*\*/g, "")}`).join("\n");

const markdown = `# Growth Doctor

Generated: ${today}

## Status

${status === "ready" ? "Ready. The workflow checks passed." : status === "warning" ? "Warning. The workflow can run, but sender setup needs attention before cold email." : status === "not-verified" ? "Not verified. Checks were skipped; run without `--no-checks` before sending client-facing copy." : "Blocked. Fix the failed check before sending client-facing copy."}

## Current Bottleneck

${next.mission}

Target view: ${next.view}

Recording prep: ${recordingPrep.fresh ? "fresh" : `needs refresh (${recordingPrep.missing.join("; ") || "no active prospects"})`}

Recording rehearsal: ${rehearsal.status} (minimum ${rehearsal.minimumScore}/10)

Next command:

\`\`\`bash
${next.command}
\`\`\`

## Safety Checks

| Check | Status | Detail |
|---|---|---|
${checkRows}

## Warnings

| Check | Rule | Detail |
|---|---|---|
${warningRows || (skipChecks ? "| - | - | Checks were skipped; no warnings were collected. |" : "| - | - | No warnings. |")}

${warningRows ? "Sender setup warnings: run `npm run send:configure -- --physical-address=\"...\" --dkim-selector=... --dry-run` with real values before using cold email." : ""}

## Scoreboard

| Metric | Count |
|---|---:|
| Prospects total | ${metrics.counts.prospectsTotal} |
| Scored prospects | ${metrics.counts.scored} |
| Looms recorded | ${metrics.counts.loomsRecorded} |
| Ready to send | ${metrics.counts.readyToSend} |
| Sends | ${metrics.counts.sends} |
| Replies | ${metrics.counts.replies} |
| Calls | ${metrics.counts.calls} |
| Closed | ${metrics.counts.closed} |
| Due follow-up | ${metrics.counts.dueFollowUp} |
| Clients | ${metrics.counts.clients} |
| Client records blocked | ${metrics.counts.clientsBlocked} |

## Today's Focus

${focusRows || "- No active focus items."}

## Rule

Do not build more system surface until the current bottleneck is worked.
`;

const outputDir = outputPath.split("/").slice(0, -1).join("/");
if (outputDir) mkdirSync(outputDir, { recursive: true });
writeFileSync(outputPath, markdown);

const result = {
  status,
  path: outputPath,
  date: today,
  mission: next.mission,
  view: next.view,
  nextCommand: next.command,
  recordingPrep,
  rehearsal: {
    status: rehearsal.status,
    minimumScore: rehearsal.minimumScore,
    path: rehearsal.path,
    htmlPath: rehearsal.htmlPath
  },
  checks,
  counts: metrics.counts
};

if (plain) {
  console.log("TinyStudio Growth Doctor");
  console.log("");
  console.log(`Status: ${status}`);
  console.log(`Bottleneck: ${next.mission}`);
  console.log(`Recording prep: ${recordingPrep.fresh ? "fresh" : "needs refresh"}`);
  console.log(`Next: ${next.command}`);
  console.log(`Looms: ${metrics.counts.loomsRecorded}/${metrics.counts.scored} scored`);
  console.log(`Sends: ${metrics.counts.sends}`);
  console.log(`Replies: ${metrics.counts.replies}`);
  console.log(`Closed: ${metrics.counts.closed}`);
  const warningLines = checks.flatMap((check) => (check.warnings || []).map((warning) => `${check.name}: ${warning.rule} - ${warning.detail}`));
  if (warningLines.length) {
    console.log("");
    console.log("Warnings:");
    for (const warning of warningLines) console.log(`- ${warning}`);
    console.log("");
    console.log("Sender setup fix: npm run send:configure -- --physical-address=\"...\" --dkim-selector=... --dry-run");
  }
} else {
  console.log(JSON.stringify(result, null, 2));
}
