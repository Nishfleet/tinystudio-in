#!/usr/bin/env node
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { execFileSync } from "node:child_process";

const args = process.argv.slice(2);
const configPath = "growth-brain/ops/agency-config.json";
const dryRun = args.includes("--dry-run");
const help = args.includes("--help") || args.includes("-h");

function option(name) {
  const equalArg = args.find((arg) => arg.startsWith(`--${name}=`));
  if (equalArg) return equalArg.split("=").slice(1).join("=").trim();
  const index = args.indexOf(`--${name}`);
  return index >= 0 ? String(args[index + 1] || "").trim() : "";
}

function usage() {
  console.log([
    "Usage:",
    "  npm run send:configure -- --physical-address=\"Address\" --dkim-selector=selector",
    "  npm run send:configure -- --physical-address=\"Address\" --dkim-selector=selector --dry-run",
    "",
    "Optional:",
    "  --sender-email=hello@tinystudio.io",
    "  --daily-cap=20"
  ].join("\n"));
}

if (help) {
  usage();
  process.exit(0);
}

function readConfig() {
  if (!existsSync(configPath)) return {};
  return JSON.parse(readFileSync(configPath, "utf8"));
}

function writeConfig(config) {
  const dir = configPath.split("/").slice(0, -1).join("/");
  if (dir) mkdirSync(dir, { recursive: true });
  writeFileSync(configPath, `${JSON.stringify(config, null, 2)}\n`);
}

function isPlaceholder(value) {
  return !value
    || /^(todo|tbd|n\/a|none|placeholder|address|physical address|add address|your address|test)$/i.test(value.trim())
    || /example/i.test(value);
}

function validateAddress(value) {
  if (isPlaceholder(value)) return "Physical address must be real, not a placeholder.";
  if (value.length < 12) return "Physical address looks too short.";
  if (!/[a-z]/i.test(value) || !/\d/.test(value)) return "Physical address should include street/city details and a number.";
  return "";
}

function validateDkimSelector(value) {
  if (isPlaceholder(value)) return "DKIM selector must come from the mail provider, not a placeholder.";
  if (!/^[a-z0-9][a-z0-9._-]{0,62}$/i.test(value)) return "DKIM selector should use only letters, numbers, dots, underscores, or hyphens.";
  return "";
}

function validateEmail(value) {
  if (!value) return "";
  return /^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(value) ? "" : "Sender email is not a valid email address.";
}

function validateDailyCap(value) {
  if (!value) return "";
  const number = Number(value);
  if (!Number.isInteger(number) || number <= 0) return "Daily cap must be a positive integer.";
  if (number > 50) return "Daily cap is intentionally capped at 50 while reply data is thin.";
  return "";
}

function runJson(commandArgs) {
  const output = execFileSync("node", commandArgs, {
    encoding: "utf8",
    stdio: ["ignore", "pipe", "pipe"]
  });
  return JSON.parse(output);
}

const current = readConfig();
const physicalAddress = option("physical-address") || current.senderPhysicalAddress || "";
const dkimSelector = option("dkim-selector") || current.dkimSelector || "";
const senderEmail = option("sender-email") || current.senderEmail || "";
const dailyCap = option("daily-cap") || String(current.manualDailySendCap || "");

const errors = [
  validateAddress(physicalAddress),
  validateDkimSelector(dkimSelector),
  validateEmail(senderEmail),
  validateDailyCap(dailyCap)
].filter(Boolean);

if (errors.length) {
  console.error(JSON.stringify({
    status: "invalid",
    errors,
    next: "Use the real postal address and the exact DKIM selector from the mail provider."
  }, null, 2));
  process.exit(1);
}

const nextConfig = {
  ...current,
  senderPhysicalAddress: physicalAddress,
  dkimSelector,
  senderEmail,
  manualDailySendCap: Number(dailyCap)
};

if (!dryRun) writeConfig(nextConfig);

const setup = dryRun
  ? null
  : runJson(["scripts/check-outbound-sender-setup.mjs"]);
const guide = dryRun
  ? null
  : runJson(["scripts/export-sender-setup-guide.mjs"]);

console.log(JSON.stringify({
  status: dryRun ? "dry-run" : setup.status === "pass" ? "configured-and-clean" : "configured-with-warnings",
  dryRun,
  changed: {
    senderEmail: nextConfig.senderEmail,
    senderPhysicalAddress: nextConfig.senderPhysicalAddress,
    dkimSelector: nextConfig.dkimSelector,
    manualDailySendCap: nextConfig.manualDailySendCap
  },
  senderSetup: setup,
  guidePath: guide?.path || "growth-brain/ops/sender-setup-guide.md",
  next: dryRun
    ? "Run without --dry-run after confirming the address and DKIM selector are correct."
    : setup.status === "pass"
      ? "Sender trust is clean. Email can join contact forms and DMs."
      : "Fix remaining sender warnings before relying on cold email."
}, null, 2));
