#!/usr/bin/env node
import { existsSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { addIsoBusinessDays, localIsoDate } from "./date-utils.mjs";
import { isValidLoomUrl } from "./lib/loom-url.mjs";
import { sendChannelGuidance } from "./lib/send-channel-guidance.mjs";

const args = process.argv.slice(2);
const prospectPath = args[0];
const action = args[1];

function option(name) {
  const equalArg = args.find((arg) => arg.startsWith(`--${name}=`));
  if (equalArg) return equalArg.slice(name.length + 3);
  const index = args.indexOf(`--${name}`);
  return index >= 0 ? args[index + 1] || "" : "";
}

const date = option("date") || localIsoDate();
const note = option("note");
const rawChannel = option("channel");
const force = args.includes("--force");

function normalizeChannel(value) {
  return String(value || "").trim().toLowerCase().replace(/\s+/g, "-");
}

const channel = normalizeChannel(rawChannel);
const validChannels = new Set(["", "email", "contact-form", "dm", "linkedin", "x", "phone", "mixed", "other"]);

const validActions = new Set([
  "new",
  "scored",
  "recorded",
  "sent",
  "followup-1",
  "followup-2",
  "followup-3",
  "replied",
  "call-booked",
  "won",
  "lost",
  "paused"
]);

if (!prospectPath || !action || !validActions.has(action)) {
  console.error("Usage: npm run prospect:stage -- prospects/prospect-slug new|scored|recorded|sent|followup-1|followup-2|followup-3|replied|call-booked|won|lost|paused [--date YYYY-MM-DD] [--channel email|contact-form|dm|linkedin|x|phone|mixed|other] [--note \"...\"] [--force]");
  process.exit(1);
}

if (!validChannels.has(channel)) {
  console.error("Channel must be one of: email, contact-form, dm, linkedin, x, phone, mixed, other");
  process.exit(1);
}

if (!existsSync(prospectPath)) {
  console.error(`Prospect folder not found: ${prospectPath}`);
  process.exit(1);
}

function read(relativePath) {
  const path = join(prospectPath, relativePath);
  return existsSync(path) ? readFileSync(path, "utf8") : "";
}

function currentLoomUrl() {
  const buyerRoom = read("buyer-room.md");
  return buyerRoom.match(/^- Link:[ \t]*([^\n]*)$/m)?.[1]?.trim() || "";
}

function approvedSendPackageReady() {
  const loomUrl = currentLoomUrl();
  if (!isValidLoomUrl(loomUrl)) {
    return { ok: false, reason: "buyer room does not have a valid Loom URL" };
  }
  const sendPackage = read("send-package.md");
  if (!sendPackage) return { ok: false, reason: "send package missing; run prospect:send-prep first" };
  if (!sendPackage.includes(`- Loom: ${loomUrl}`)) return { ok: false, reason: "send package Loom does not match buyer-room Loom" };
  if (!/- Loom quality:\s*approved/.test(sendPackage)) return { ok: false, reason: "send package is missing Loom quality approval" };
  if (!/- Readiness:\s*ready/.test(sendPackage)) return { ok: false, reason: "send package is not ready" };
  return { ok: true, reason: "" };
}

function followUpIndexForAction(value) {
  if (!value.startsWith("followup-")) return -1;
  const number = Number(value.split("-")[1]);
  return Number.isInteger(number) ? number - 1 : -1;
}

function followUpStageReady(pipeline, value) {
  const followUpIndex = followUpIndexForAction(value);
  const followUp = pipeline.followUps[followUpIndex];
  if (!followUp) return { ok: false, reason: `unknown follow-up action: ${value}` };
  if (!["sent", "followup-1", "followup-2", "followup-3"].includes(pipeline.stage || "")) {
    return { ok: false, reason: "prospect has not been sent yet" };
  }
  const priorPending = pipeline.followUps
    .slice(0, followUpIndex)
    .find((item) => item.status !== "sent" || !item.sentAt);
  if (priorPending) {
    return { ok: false, reason: `${priorPending.step} must be marked sent first` };
  }
  if (followUp.status === "sent" || followUp.sentAt) {
    return { ok: false, reason: `${followUp.step} is already marked sent` };
  }
  if (!followUp.dueAt) return { ok: false, reason: `${followUp.step} does not have a due date yet` };
  if (followUp.dueAt > date) return { ok: false, reason: `${followUp.step} is not due until ${followUp.dueAt}` };
  return { ok: true, reason: "" };
}

function pipelineProgressionReady(pipeline, value) {
  const currentStage = pipeline.stage || "new";
  if (value === "replied" && !["sent", "followup-1", "followup-2", "followup-3", "replied"].includes(currentStage)) {
    return { ok: false, reason: `cannot mark replied from ${currentStage}; mark sent first` };
  }
  if (value === "call-booked" && !["replied", "call-booked"].includes(currentStage)) {
    return { ok: false, reason: `cannot mark call-booked from ${currentStage}; mark replied first` };
  }
  if (value === "won" && !["call-booked", "won"].includes(currentStage)) {
    return { ok: false, reason: `cannot mark won from ${currentStage}; mark call-booked first` };
  }
  return { ok: true, reason: "" };
}

if (action === "sent" && !force) {
  const sendPackageCheck = approvedSendPackageReady();
  if (!sendPackageCheck.ok) {
    console.error(`Cannot mark sent: ${sendPackageCheck.reason}. Use --force only for explicit recovery.`);
    process.exit(1);
  }
}

function defaultPipeline() {
  return {
    stage: "new",
    createdAt: date,
    sentAt: "",
    sentChannel: "",
    lastChannel: "",
    lastTouchAt: "",
    nextFollowUpAt: "",
    followUps: [
      { step: "day-2", dueAt: "", sentAt: "", status: "pending" },
      { step: "day-5", dueAt: "", sentAt: "", status: "pending" },
      { step: "day-10", dueAt: "", sentAt: "", status: "pending" }
    ],
    touches: [],
    notes: []
  };
}

const pipelinePath = join(prospectPath, "pipeline.json");
const pipeline = existsSync(pipelinePath)
  ? { ...defaultPipeline(), ...JSON.parse(readFileSync(pipelinePath, "utf8")) }
  : defaultPipeline();

pipeline.notes = Array.isArray(pipeline.notes) ? pipeline.notes : [];
pipeline.touches = Array.isArray(pipeline.touches) ? pipeline.touches : [];
pipeline.followUps = Array.isArray(pipeline.followUps) && pipeline.followUps.length === 3
  ? pipeline.followUps
  : defaultPipeline().followUps;

if (action.startsWith("followup-") && !force) {
  const followUpCheck = followUpStageReady(pipeline, action);
  if (!followUpCheck.ok) {
    console.error(`Cannot mark follow-up sent: ${followUpCheck.reason}. Use --force only for explicit recovery.`);
    process.exit(1);
  }
}

if (["replied", "call-booked", "won"].includes(action) && !force) {
  const progressionCheck = pipelineProgressionReady(pipeline, action);
  if (!progressionCheck.ok) {
    console.error(`Cannot mark ${action}: ${progressionCheck.reason}. Use --force only for explicit recovery.`);
    process.exit(1);
  }
}

if (["lost", "paused"].includes(action) && !force && !note.trim()) {
  console.error(`Cannot mark ${action}: add a short --note so the Growth Brain learns. Use --force only for explicit recovery.`);
  process.exit(1);
}

if ((action === "sent" || action.startsWith("followup-")) && channel === "email" && !force) {
  const guidance = sendChannelGuidance();
  if (!guidance.emailReady) {
    console.error(`Cannot mark email send: sender setup is not clean (${guidance.warnings.join("; ")}). Use contact-form, dm, linkedin, x, phone, mixed, or other. Use --force only for explicit recovery.`);
    process.exit(1);
  }
}

pipeline.stage = action;
pipeline.lastTouchAt = date;

if (action === "sent") {
  pipeline.sentAt = date;
  if (channel) {
    pipeline.sentChannel = channel;
    pipeline.lastChannel = channel;
  }
  pipeline.followUps = [
    { step: "day-2", dueAt: addIsoBusinessDays(date, 2), sentAt: "", status: "pending" },
    { step: "day-5", dueAt: addIsoBusinessDays(date, 5), sentAt: "", status: "pending" },
    { step: "day-10", dueAt: addIsoBusinessDays(date, 10), sentAt: "", status: "pending" }
  ];
}

if (action.startsWith("followup-")) {
  const followUpIndex = Number(action.split("-")[1]) - 1;
  if (!pipeline.followUps[followUpIndex]) {
    console.error(`Unknown follow-up action: ${action}`);
    process.exit(1);
  }
  pipeline.followUps[followUpIndex] = {
    ...pipeline.followUps[followUpIndex],
    sentAt: date,
    status: "sent"
  };
  if (channel) pipeline.lastChannel = channel;
}

if (["replied", "call-booked", "won", "lost", "paused"].includes(action)) {
  pipeline.nextFollowUpAt = "";
} else {
  const next = pipeline.followUps.find((followUp) => followUp.status !== "sent");
  pipeline.nextFollowUpAt = next ? next.dueAt : "";
}

if (note) pipeline.notes.push({ date, action, note });

if (action === "sent" || action.startsWith("followup-")) {
  pipeline.touches.push({
    date,
    action,
    channel: channel || pipeline.lastChannel || pipeline.sentChannel || "",
    note: note || ""
  });
}

writeFileSync(pipelinePath, `${JSON.stringify(pipeline, null, 2)}\n`);

console.log(JSON.stringify({
  status: "updated",
  prospectPath,
  action,
  stage: pipeline.stage,
  channel: channel || pipeline.lastChannel || "",
  sentChannel: pipeline.sentChannel || "",
  lastChannel: pipeline.lastChannel || "",
  nextFollowUpAt: pipeline.nextFollowUpAt
}, null, 2));
