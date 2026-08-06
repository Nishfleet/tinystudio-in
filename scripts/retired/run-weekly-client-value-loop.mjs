#!/usr/bin/env node
import { execFileSync } from "node:child_process";
import { existsSync, mkdirSync, readdirSync, readFileSync, writeFileSync } from "node:fs";
import { basename, join } from "node:path";
import { localIsoDate } from "./date-utils.mjs";

const args = process.argv.slice(2);
const dateArg = args.find((arg) => arg.startsWith("--date="));
const clientArg = args.find((arg) => arg.startsWith("--client="));
const clientsArg = args.find((arg) => arg.startsWith("--clients="));
const dryRun = args.includes("--dry-run");
const today = dateArg ? dateArg.split("=").slice(1).join("=") : localIsoDate();

function listClientFolders() {
  if (clientArg) return [clientArg.split("=").slice(1).join("=")];
  if (clientsArg) {
    return clientsArg
      .split("=")
      .slice(1)
      .join("=")
      .split(",")
      .map((value) => value.trim())
      .filter(Boolean);
  }
  if (!existsSync("clients")) return [];
  return readdirSync("clients", { withFileTypes: true })
    .filter((entry) => entry.isDirectory())
    .filter((entry) => !/^(kit|import)-smoke/.test(entry.name))
    .map((entry) => join("clients", entry.name))
    .filter((clientPath) => existsSync(join(clientPath, "intake.md")))
    .sort();
}

function read(path) {
  return existsSync(path) ? readFileSync(path, "utf8") : "";
}

function write(path, content) {
  const dir = path.split("/").slice(0, -1).join("/");
  if (dir) mkdirSync(dir, { recursive: true });
  writeFileSync(path, content);
}

function bulletValue(markdown, label, fallback = "") {
  const escaped = label.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const match = String(markdown || "").match(new RegExp(`^- ${escaped}:[ \\t]*([^\\n]*)$`, "m"));
  return match && match[1].trim() ? match[1].trim() : fallback;
}

function compact(value, length = 180) {
  const normalized = String(value || "").replace(/\s+/g, " ").trim();
  if (!normalized) return "";
  return normalized.length <= length ? normalized : `${normalized.slice(0, length - 1).trim()}...`;
}

function parseJson(raw) {
  try {
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

function runNodeStep(label, commandArgs, { mutates = false } = {}) {
  if (dryRun && mutates) {
    return {
      label,
      status: "planned",
      command: `node ${commandArgs.join(" ")}`,
      output: null,
      error: ""
    };
  }

  try {
    const raw = execFileSync("node", commandArgs, {
      encoding: "utf8",
      stdio: ["ignore", "pipe", "pipe"]
    });
    return {
      label,
      status: "pass",
      command: `node ${commandArgs.join(" ")}`,
      output: parseJson(raw) || compact(raw, 800),
      error: ""
    };
  } catch (error) {
    const stdout = String(error.stdout || "");
    const stderr = String(error.stderr || "");
    return {
      label,
      status: "fail",
      command: `node ${commandArgs.join(" ")}`,
      output: parseJson(stdout) || compact(stdout, 800),
      error: compact(stderr || error.message, 800)
    };
  }
}

function outputStatus(step, fallback = "unknown") {
  if (!step || !step.output || typeof step.output !== "object") return fallback;
  return step.output.status || fallback;
}

function outputWarnings(step) {
  if (!step || !step.output || typeof step.output !== "object") return [];
  return [
    ...(Array.isArray(step.output.warnings) ? step.output.warnings : []),
    ...(Array.isArray(step.output.blockers) ? step.output.blockers : [])
  ];
}

function nextActionFor({ weeklyCheck, channelReadiness, repeatableWorkflow, dashboard, readiness, acceptance, proofReview }) {
  if ([weeklyCheck, channelReadiness, repeatableWorkflow, dashboard, readiness, acceptance, proofReview].some((step) => step.status === "fail")) {
    return "Fix the failed weekly loop command before client update.";
  }
  if (outputStatus(weeklyCheck) !== "ready") {
    return `Finish weekly report: ${outputWarnings(weeklyCheck)[0] || "missing shipped work, learning, next action, or retention signal"}`;
  }
  if (channelReadiness.output && channelReadiness.output.proofSprintReady === false) {
    return "Finish channel readiness before expanding scope: CRO / conversion and SEO / search trust must both be ready.";
  }
  if (outputStatus(repeatableWorkflow) !== "ready") {
    return `Finish repeatable workflow proof: ${(repeatableWorkflow.output?.missing || [])[0] || "bottleneck, gap, principle, test, feedback, or iteration is missing"}`;
  }
  if (dashboard.output && dashboard.output.clientConfirmed === false) {
    return "Get client confirmation that they saw the delta, understood value, approved the next action, and want to continue.";
  }
  if (outputStatus(readiness) !== "ready") {
    return `Fix delivery proof before handoff: ${outputWarnings(readiness)[0] || "client readiness is still draft"}`;
  }
  if (outputStatus(acceptance) === "blocked") {
    return acceptance.output?.next || "Fix acceptance blockers before handoff.";
  }
  if (proofReview.output?.pendingCount > 0) {
    return "Review pending proof claims before reusing them in client-facing copy.";
  }
  return "Send the weekly value update, confirm the next test, and log the client response.";
}

function clientName(clientPath) {
  return bulletValue(read(join(clientPath, "intake.md")), "Name", basename(clientPath));
}

function runClient(clientPath) {
  const opsDir = join(clientPath, "ops", "weekly-runs");
  mkdirSync(opsDir, { recursive: true });

  const steps = [];
  steps.push(runNodeStep("Export weekly report", ["scripts/export-client-weekly-report.mjs", clientPath], { mutates: true }));
  steps.push(runNodeStep("Check weekly report", ["scripts/check-client-weekly-report.mjs", clientPath]));
  steps.push(runNodeStep("Export channel readiness", ["scripts/export-client-channel-readiness.mjs", clientPath], { mutates: true }));
  steps.push(runNodeStep("Check channel readiness", ["scripts/check-client-channel-readiness.mjs", clientPath]));
  steps.push(runNodeStep("Export repeatable workflow", ["scripts/export-client-repeatable-workflow.mjs", clientPath], { mutates: true }));
  steps.push(runNodeStep("Export client dashboard", ["scripts/export-client-facing-dashboard.mjs", clientPath], { mutates: true }));
  steps.push(runNodeStep("Export renewal review", ["scripts/export-client-renewal-review.mjs", clientPath], { mutates: true }));
  steps.push(runNodeStep("Export delivery cockpit", ["scripts/export-client-delivery-cockpit.mjs", clientPath], { mutates: true }));
  steps.push(runNodeStep("Check client readiness", ["scripts/check-client-readiness.mjs", clientPath]));
  steps.push(runNodeStep("Proof review dry run", ["scripts/review-client-proof.mjs", clientPath, "--dry-run"]));
  steps.push(runNodeStep("Acceptance dry run", ["scripts/review-client-acceptance.mjs", clientPath, "--dry-run"]));

  const weeklyCheck = steps.find((step) => step.label === "Check weekly report");
  const channelReadiness = steps.find((step) => step.label === "Check channel readiness");
  const repeatableWorkflow = steps.find((step) => step.label === "Export repeatable workflow");
  const dashboard = steps.find((step) => step.label === "Export client dashboard");
  const readiness = steps.find((step) => step.label === "Check client readiness");
  const proofReview = steps.find((step) => step.label === "Proof review dry run");
  const acceptance = steps.find((step) => step.label === "Acceptance dry run");
  const nextAction = nextActionFor({ weeklyCheck, channelReadiness, repeatableWorkflow, dashboard, readiness, proofReview, acceptance });
  const risk = steps.some((step) => step.status === "fail")
    ? "failed"
    : outputStatus(weeklyCheck) !== "ready" || dashboard.output?.clientConfirmed === false
      ? "needs-attention"
      : outputStatus(readiness) !== "ready"
        ? "watch"
        : "healthy";

  const runPath = join(opsDir, `${today}.md`);
  const stepRows = steps.map((step) => {
    const status = step.output && typeof step.output === "object" && step.output.status
      ? `${step.status}/${step.output.status}`
      : step.status;
    const notes = step.error || outputWarnings(step)[0] || step.output?.next || "";
    return `| ${step.label} | ${status} | \`${step.command}\` | ${compact(notes, 220)} |`;
  }).join("\n");

  const artifacts = [
    "reports/week-1-report.md",
    "quality/channel-readiness-scorecard.md",
    "ops/repeatable-workflow.md",
    "ops/repeatable-workflow.html",
    "client-dashboard.md",
    "client-dashboard.html",
    "reports/monthly-renewal-review.md",
    "reports/monthly-renewal-review.html",
    "delivery-cockpit.html",
    `ops/weekly-runs/${today}.md`
  ];

  write(runPath, `# Weekly Client Value Loop

Generated: ${today}

## Client

- Name: ${clientName(clientPath)}
- Folder: ${clientPath}
- Isolation rule: This run only reads and writes inside this client folder, except for the global summary in \`growth-brain/ops/weekly-client-value-loop.md\`.

## Steps

| Step | Status | Command | Notes |
|---|---|---|---|
${stepRows}

## Artifacts

${artifacts.map((artifact) => `- \`${artifact}\``).join("\n")}

## Next Action

${nextAction}

## Guardrails

- Do not send client messages automatically.
- Do not approve proof claims automatically.
- Do not copy proof, metrics, reports, dashboards, or client notes between client folders.
- Do not pitch renewal unless the weekly report, client dashboard, proof, and client confirmation are clean.
`);

  return {
    clientPath,
    name: clientName(clientPath),
    risk,
    weekly: outputStatus(weeklyCheck),
    channelReadiness: outputStatus(channelReadiness),
    repeatableWorkflow: outputStatus(repeatableWorkflow),
    readyChannels: channelReadiness.output?.readyChannels || [],
    readiness: outputStatus(readiness),
    clientConfirmed: dashboard.output?.clientConfirmed === true,
    approvedClaims: proofReview.output?.approvedCount ?? 0,
    pendingClaims: proofReview.output?.pendingCount ?? 0,
    acceptance: outputStatus(acceptance),
    runPath,
    nextAction,
    failedSteps: steps.filter((step) => step.status === "fail").map((step) => step.label)
  };
}

const clientPaths = listClientFolders();
const results = clientPaths.map(runClient);
const globalPath = "growth-brain/ops/weekly-client-value-loop.md";
const healthy = results.filter((row) => row.risk === "healthy").length;
const needsAttention = results.filter((row) => row.risk !== "healthy").length;
const status = dryRun
  ? "dry-run"
  : results.some((row) => row.failedSteps.length)
    ? "completed-with-errors"
    : needsAttention
      ? "completed-needs-attention"
      : "completed";

const summaryRows = results.length
  ? results.map((row) => `| ${row.name} | ${row.weekly} | ${row.channelReadiness} | ${row.repeatableWorkflow} | ${row.readyChannels.length ? row.readyChannels.join(", ") : "none"} | ${row.readiness} | ${row.clientConfirmed ? "yes" : "no"} | ${row.acceptance} | ${row.risk} | ${row.nextAction} | \`${row.runPath}\` |`).join("\n")
  : "| - | - | - | - | - | - | - | - | - | No client folders found. | - |";

write(globalPath, `# Weekly Client Value Loop

Generated: ${today}

This is the autonomous weekly workflow for every onboarded client. Each client gets its own isolated run log under \`clients/client-slug/ops/weekly-runs/\`.

## Summary

| Signal | Count |
|---|---:|
| Clients processed | ${results.length} |
| Healthy clients | ${healthy} |
| Needs attention | ${needsAttention} |

## Client Runs

| Client | Weekly report | Channel readiness | Workflow proof | Ready channels | Delivery readiness | Client confirmed value | Acceptance | Risk | Next action | Run log |
|---|---|---|---|---|---|---|---|---|---|---|
${summaryRows}

## Weekly Order

1. Export the weekly report from the client folder.
2. Check the weekly report for shipped work, learning, next action, measurement, search trust, and retention signal.
3. Refresh and check the client channel-readiness scorecard.
4. Refresh repeatable workflow proof: bottleneck, gap, principle, flow, test, feedback, and iteration.
5. Refresh the client-facing dashboard.
6. Refresh the monthly renewal review.
7. Refresh the delivery cockpit.
8. Check client readiness.
9. Run proof and acceptance dry-runs.
10. Write the client-specific run log and this global summary.

## Guardrails

- Each client folder is the source of truth for that client.
- Do not mix proof, metrics, claims, or reports between clients.
- Do not send messages, approve claims, or pitch renewal automatically.
- Retention is earned by a visible weekly delta, a learning, a next action, and client-confirmed value.
`);

console.log(JSON.stringify({
  status,
  date: today,
  clientsProcessed: results.length,
  healthy,
  needsAttention,
  path: globalPath,
  results
}, null, 2));
