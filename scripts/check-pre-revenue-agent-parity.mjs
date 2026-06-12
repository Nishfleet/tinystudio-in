#!/usr/bin/env node
import { execFileSync } from "node:child_process";
import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";

const failures = [];
const root = process.cwd();

function read(path) {
  return readFileSync(join(root, path), "utf8");
}

function requireFile(path) {
  if (!existsSync(join(root, path))) failures.push(`Missing file: ${path}`);
}

function requireCopy(label, haystack, snippets) {
  for (const snippet of snippets) {
    if (!haystack.includes(snippet)) failures.push(`${label} missing: ${snippet}`);
  }
}

function runJson(args) {
  const output = execFileSync("node", args, {
    encoding: "utf8",
    stdio: ["ignore", "pipe", "pipe"]
  });
  return JSON.parse(output);
}

const requiredFiles = [
  "growth-brain/ops/pre-revenue-agent-orchestration.md",
  "growth-brain/ops/parallel-production-pool.md",
  "growth-brain/ops/specialist-escalation-lane.md",
  "growth-brain/ops/verifier-agent-gate.md",
  "growth-brain/ops/handoff-agent-gate.md",
  "growth-brain/ops/skills-library-feedback-loop.md",
  "growth-brain/ops/background-agent-pool.md",
  "growth-brain/ops/pre-revenue-agent-parity-ledger.md",
  "growth-brain/ops/model-routing-standard.md",
  "growth-brain/ops/unit-economics-ledger.md",
  "scripts/export-agent-orchestration-run.mjs",
  "scripts/check-pre-revenue-agent-parity.mjs"
];

for (const file of requiredFiles) requireFile(file);

if (!failures.length) {
  const orchestration = read("growth-brain/ops/pre-revenue-agent-orchestration.md");
  requireCopy("agent orchestration map", orchestration, [
    "one operator",
    "three human touchpoints",
    "parallel production lanes",
    "specialist escalation",
    "verifier QA",
    "handoff",
    "skills/library feedback",
    "background pool",
    "unit-economics tracking",
    "It does not mean TinyStudio has paid-client proof"
  ]);

  requireCopy("parallel production pool", read("growth-brain/ops/parallel-production-pool.md"), [
    "K-1 Leak Map",
    "K-2 Content",
    "K-3 Trust",
    "K-4 Tests",
    "This pool prepares work"
  ]);

  requireCopy("specialist lane", read("growth-brain/ops/specialist-escalation-lane.md"), [
    "Escalate When",
    "Specialist Packet",
    "approve its own claim"
  ]);

  requireCopy("verifier gate", read("growth-brain/ops/verifier-agent-gate.md"), [
    "pass",
    "revise",
    "escalate",
    "block",
    "does not approve claims"
  ]);

  requireCopy("handoff gate", read("growth-brain/ops/handoff-agent-gate.md"), [
    "what changed",
    "proof source",
    "measurement contract",
    "does not contact prospects or clients automatically"
  ]);

  requireCopy("skills library", read("growth-brain/ops/skills-library-feedback-loop.md"), [
    "Client brain",
    "Proof library",
    "Workflow docs",
    "Repo skills",
    "No secrets"
  ]);

  requireCopy("background pool", read("growth-brain/ops/background-agent-pool.md"), [
    "report-only",
    "No client messages",
    "automatic claim approval",
    "hard-wired model routing with live external spend"
  ]);

  requireCopy("parity ledger", read("growth-brain/ops/pre-revenue-agent-parity-ledger.md"), [
    "operating architecture",
    "Current blocked claim",
    "npm run agent:run",
    "npm run agent:parity"
  ]);

  requireCopy("model routing", read("growth-brain/ops/model-routing-standard.md"), [
    "Workhorse",
    "Specialist",
    "Utility",
    "Manual",
    "Nothing gets sent, published, approved, or billed automatically."
  ]);

  requireCopy("unit economics", read("growth-brain/ops/unit-economics-ledger.md"), [
    "Pre-customer / pre-revenue",
    "Production tool/model route",
    "Direct software/model cost",
    "Founder review time",
    "Any claim of 90% margin"
  ]);

  const pkg = JSON.parse(read("package.json"));
  for (const script of ["agent:run", "agent:parity", "article:parity"]) {
    if (!pkg.scripts?.[script]) failures.push(`Missing package script: ${script}`);
  }

  const run = runJson([
    "scripts/export-agent-orchestration-run.mjs",
    "--output=/tmp/tinystudio-pre-revenue-agent-parity-run.md"
  ]);
  if (run.status !== "created" || run.lanes !== 4 || run.operatorTouchpoints !== 3) {
    failures.push("agent orchestration run did not create the expected 4-lane, 3-touchpoint packet");
  } else {
    const packet = readFileSync("/tmp/tinystudio-pre-revenue-agent-parity-run.md", "utf8");
    requireCopy("agent run packet", packet, [
      "Operator Touchpoints",
      "Parallel Production Pool",
      "Specialist Escalation",
      "Verifier Gate",
      "Handoff Gate",
      "Skills Library Feedback",
      "Background Pool",
      "Unit Economics",
      "does not prove revenue"
    ]);
  }

  const article = runJson(["scripts/check-article-parity-readiness.mjs"]);
  if (article.status !== "pass") failures.push("article parity must pass before agent diagram parity can pass");
}

const result = {
  status: failures.length ? "fail" : "pass",
  gate: "pre-revenue-agent-diagram-parity",
  components: {
    operatorTouchpoints: "defined",
    intake: "folder-and-command-based",
    route: "manual-policy-plus-run-packet",
    parallelProductionPool: "four-lane-packet",
    specialist: "escalation-lane",
    verifier: "qa-gate",
    handoff: "package-gate",
    skillsLibrary: "feedback-loop",
    backgroundPool: "report-only",
    unitEconomics: "ledger-ready"
  },
  commercialProof: "blocked-until-real-paid-client-rows",
  failures
};

if (failures.length) {
  console.error(JSON.stringify(result, null, 2));
  process.exit(1);
}

console.log(JSON.stringify(result, null, 2));
