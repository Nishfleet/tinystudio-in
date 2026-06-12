#!/usr/bin/env node
import { existsSync, readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { execFileSync } from "node:child_process";
import { localIsoDate } from "./date-utils.mjs";
import { checkProspectReadiness, prospectWarningWeight } from "./lib/prospect-readiness.mjs";

const plain = process.argv.includes("--plain");
const limitArg = process.argv.find((arg) => arg.startsWith("--limit="));
const limit = limitArg ? Number(limitArg.split("=")[1]) : 7;
const today = localIsoDate();

function listFolders(root) {
  if (!existsSync(root)) return [];
  return readdirSync(root, { withFileTypes: true })
    .filter((entry) => entry.isDirectory())
    .filter((entry) => !/^(kit|import)-smoke/.test(entry.name))
    .map((entry) => join(root, entry.name))
    .sort();
}

function readJson(path) {
  if (!existsSync(path)) return {};
  return JSON.parse(readFileSync(path, "utf8"));
}

function runJson(script, targetPath) {
  const output = execFileSync("node", [script, targetPath], {
    encoding: "utf8",
    stdio: ["ignore", "pipe", "pipe"]
  });
  return JSON.parse(output);
}

function activeTasks() {
  if (!existsSync("TASKS.md")) return [];
  const content = readFileSync("TASKS.md", "utf8");
  const activeMatch = content.match(/## Active\n([\s\S]*?)(?:\n## |$)/);
  if (!activeMatch) return [];
  return activeMatch[1]
    .split("\n")
    .map((line) => line.trim())
    .filter((line) => line.startsWith("- [ ]"))
    .map((line) => line.replace(/^- \[ \]\s*/, ""));
}

function prospectAction(result) {
  const warnings = result.warnings || [];
  if ((result.missing || []).length > 0) return "Regenerate the prospect folder; required files are missing.";
  if (!warnings.length) return "Send from send-package.md, then mark the prospect sent.";
  if (warnings.includes("Lead score is blank") || warnings.includes("Priority is not chosen")) {
    return "Score the lead and choose record, research-more, or skip.";
  }
  if (warnings.includes("Loom package has not been generated")) {
    return "Fill the Loom outline and generate the Loom package.";
  }
  if (warnings.includes("Loom specific leak is not filled")) {
    return "Pick one specific visible leak for the Loom.";
  }
  if (warnings.includes("Page snapshot has not been generated") || warnings.includes("Recording script is not snapshot-aware") || warnings.includes("Recording script has not been generated")) {
    return "Run prospect:prep-recording before recording this prospect.";
  }
  if (warnings.includes("Outreach still has placeholders")) {
    return "Personalize the outreach message and remove placeholders.";
  }
  if (warnings.includes("Buyer room Loom link is blank")) return "Record from the teleprompter, paste the Loom URL into market:after-recording, then send from the outbox.";
  if (warnings.includes("Buyer room price is blank")) return "Add the sprint price to the buyer room.";
  return warnings[0];
}

function pipelineAction(pipeline) {
  if (!pipeline || !pipeline.stage) return "";
  if (["won", "lost", "paused"].includes(pipeline.stage)) return "";
  if (pipeline.stage === "replied") return "Run prospect:reply-prep and book the sprint call.";
  if (pipeline.stage === "call-booked") return "Run prospect:close-prep after the call and send the sprint decision package.";
  if (pipeline.nextFollowUpAt && pipeline.nextFollowUpAt <= today) {
    const next = (pipeline.followUps || []).find((followUp) => followUp.status !== "sent" && followUp.dueAt === pipeline.nextFollowUpAt);
    return `Send ${next ? next.step : "next"} follow-up.`;
  }
  return "";
}

function clientAction(result) {
  const warnings = result.warnings || [];
  if ((result.missing || []).length > 0) return "Regenerate or repair the client folder; required files are missing.";
  if (!warnings.length) return "Send final delivery, then move to Weekly Growth Desk follow-up.";
  if (warnings.some((warning) => warning.startsWith("Intake missing"))) return "Complete intake before doing delivery work.";
  if (warnings.includes("Sprint wedge is not chosen")) return "Pick the one sprint wedge before running agents.";
  if (warnings.includes("Sprint status is blank")) return "Update sprint status so the next delivery step is clear.";
  if (warnings.includes("Claim-proof ledger has no approved claims yet")) return "Fill claim-proof ledger before client-facing copy goes out.";
  if (warnings.includes("Delivery scorecard is not filled")) return "Fill delivery scorecard before handoff.";
  if (warnings.includes("Delivery template still has blank client fields")) return "Finish the delivery document client fields.";
  return warnings[0];
}

function pipelineWeight(pipeline) {
  if (!pipeline || !pipeline.stage) return 3;
  if (["won", "lost", "paused"].includes(pipeline.stage)) return 99;
  if (pipeline.stage === "replied" || pipeline.stage === "call-booked") return 0;
  if (pipeline.nextFollowUpAt && pipeline.nextFollowUpAt <= today) return 0;
  return 3;
}

const prospects = listFolders("prospects").map((path) => {
  const metadata = readJson(join(path, "metadata.json"));
  const pipeline = readJson(join(path, "pipeline.json"));
  const readiness = checkProspectReadiness(path);
  const nextAction = pipelineAction(pipeline) || prospectAction(readiness);
  const pipelineUrgency = pipelineWeight(pipeline);
  return {
    path,
    name: metadata.name || path.split("/").at(-1),
    website: metadata.website || "",
    vertical: metadata.vertical || "",
    pipelineStage: pipeline.stage || "new",
    nextFollowUpAt: pipeline.nextFollowUpAt || "",
    status: readiness.status,
    warnings: readiness.warnings,
    readinessWeight: pipelineUrgency === 0
      ? 0
      : prospectWarningWeight(readiness.warnings) + pipelineUrgency,
    nextAction
  };
}).sort((a, b) => a.readinessWeight - b.readinessWeight || a.name.localeCompare(b.name));

const clients = listFolders("clients").map((path) => {
  const readiness = runJson("scripts/check-client-readiness.mjs", path);
  return {
    path,
    name: path.split("/").at(-1),
    status: readiness.status,
    warnings: readiness.warnings,
    readinessWeight: prospectWarningWeight(readiness.warnings),
    nextAction: clientAction(readiness)
  };
}).sort((a, b) => a.readinessWeight - b.readinessWeight || a.name.localeCompare(b.name));

const activeProspects = prospects.filter((prospect) => !["won", "lost", "paused"].includes(prospect.pipelineStage));
const waitingProspects = activeProspects.filter((prospect) => /^sent|followup-/.test(prospect.pipelineStage) && prospect.nextFollowUpAt > today);
const actionableProspects = activeProspects.filter((prospect) => !waitingProspects.includes(prospect));
const readyProspects = actionableProspects.filter((prospect) => prospect.status === "ready");
const draftProspects = actionableProspects.filter((prospect) => prospect.status !== "ready");
const readyClients = clients.filter((client) => client.status === "ready");
const draftClients = clients.filter((client) => client.status !== "ready");

const todayFocus = [];

for (const client of draftClients.slice(0, 3)) {
  todayFocus.push(`Client: ${client.name} - ${client.nextAction}`);
}

for (const client of readyClients.slice(0, 2)) {
  todayFocus.push(`Client: ${client.name} - ${client.nextAction}`);
}

for (const prospect of readyProspects.slice(0, 3)) {
  todayFocus.push(`Prospect: ${prospect.name} - ${prospect.nextAction}`);
}

for (const prospect of draftProspects.slice(0, 5)) {
  todayFocus.push(`Prospect: ${prospect.name} - ${prospect.nextAction}`);
}

if (prospects.length === 0) {
  todayFocus.push("Build the first-50 prospect list and import the strongest first batch.");
}

if (clients.length === 0 && prospects.length > 0 && readyProspects.length === 0) {
  todayFocus.push("Record and send the first Loom before researching more prospects.");
}

for (const task of activeTasks()) {
  if (todayFocus.length >= limit) break;
  todayFocus.push(`Task: ${task}`);
}

const result = {
  status: todayFocus.length > 0 ? "action-needed" : "clear",
  todayFocus: todayFocus.slice(0, limit),
  counts: {
    prospects: activeProspects.length,
    prospectsTotal: prospects.length,
    prospectsReadyToSend: readyProspects.length,
    prospectsDraft: draftProspects.length,
    prospectsWaitingFollowUp: waitingProspects.length,
    clients: clients.length,
    clientsReadyToDeliver: readyClients.length,
    clientsDraft: draftClients.length
  },
  prospects,
  clients,
  activeTasks: activeTasks()
};

if (plain) {
  console.log("TinyStudio Today");
  console.log("");
  for (const item of result.todayFocus) console.log(`- ${item}`);
  console.log("");
  console.log(`Prospects: ${result.counts.prospects} total, ${result.counts.prospectsReadyToSend} ready`);
  console.log(`Clients: ${result.counts.clients} total, ${result.counts.clientsReadyToDeliver} ready`);
} else {
  console.log(JSON.stringify(result, null, 2));
}
