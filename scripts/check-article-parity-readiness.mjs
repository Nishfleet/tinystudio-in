import { existsSync, readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";

const root = process.cwd();
const publicRoot =
  process.env.TINYSTUDIO_PUBLIC_SITE || "/Users/nish/Vibecoded projects/TinyStudio.io";

const failures = [];

const read = (path) => readFileSync(join(root, path), "utf8");
const readPublic = (path) => readFileSync(join(publicRoot, path), "utf8");
const exists = (path) => existsSync(join(root, path));
const existsPublic = (path) => existsSync(join(publicRoot, path));

function requireFile(path) {
  if (!exists(path)) failures.push(`Missing file: ${path}`);
}

function requirePublicFile(path) {
  if (!existsPublic(path)) failures.push(`Missing public file: ${path}`);
}

function requireCopy(label, haystack, snippets) {
  for (const snippet of snippets) {
    if (!haystack.includes(snippet)) failures.push(`${label} missing: ${snippet}`);
  }
}

function countMarkdownFiles(path) {
  return readdirSync(join(root, path)).filter((file) => file.endsWith(".md")).length;
}

requireFile("docs/strategy/solo-ai-agency-pre-customer-parity.md");
requireFile("docs/strategy/solo-ai-agency-90-day-rollout.md");
requireFile("docs/strategy/90-day-start-here.md");
requireFile("docs/strategy/friction-triggered-build-backlog.md");
requireFile("growth-brain/offer.md");
requireFile("growth-brain/ops/model-routing-standard.md");
requireFile("growth-brain/ops/unit-economics-ledger.md");
requireFile("growth-brain/ops/pre-revenue-agent-orchestration.md");
requireFile("growth-brain/ops/parallel-production-pool.md");
requireFile("growth-brain/ops/specialist-escalation-lane.md");
requireFile("growth-brain/ops/verifier-agent-gate.md");
requireFile("growth-brain/ops/handoff-agent-gate.md");
requireFile("growth-brain/ops/skills-library-feedback-loop.md");
requireFile("growth-brain/ops/background-agent-pool.md");
requireFile("growth-brain/ops/pre-revenue-agent-parity-ledger.md");
requireFile("growth-brain/workflows/repeatable-workflow-operating-system.md");
requireFile("growth-brain/ops/market-proof-cockpit.md");
requireFile("growth-brain/ops/market-proof-run-check.md");
requireFile("growth-brain/ops/market-parity-readiness.md");
requireFile("growth-brain/ops/value-retention-stress-test.md");
requireFile("prospects/loom-links.txt");

requirePublicFile("public/index.html");
requirePublicFile("public/llms.txt");
requirePublicFile("public/offer.md");

const parityDoc = read("docs/strategy/solo-ai-agency-pre-customer-parity.md");
requireCopy("parity doc", parityDoc, [
  "Pre-customer / pre-revenue parity",
  "intake, system production, human review, handoff loop",
  "model/task routing standard",
  "unit-economics ledger",
  "Still Not Proven",
  "revenue, margin, or customer-count claims"
]);

const rollout90 = read("docs/strategy/solo-ai-agency-90-day-rollout.md");
requireCopy("90-day rollout", rollout90, [
  "Days 1-30",
  "Days 31-60",
  "Days 61-90",
  "unit-economics ledger",
  "What Still Blocks Article-Level Proof",
  "friction-triggered build backlog"
]);

const startHere = read("docs/strategy/90-day-start-here.md");
requireCopy("90-day start here", startHere, [
  "Record the first five approved Loom audits.",
  "ByteMe Networks",
  "IT Umbrella Group",
  "Talos Cyber Solutions",
  "Xentz Technologies",
  "YPM IT Solutions",
  "npm run market:after-recording -- --from-clipboard",
  "Do Not Build Yet"
]);

const frictionBacklog = read("docs/strategy/friction-triggered-build-backlog.md");
requireCopy("friction-triggered build backlog", frictionBacklog, [
  "Cold email setup",
  "Intake form",
  "Background agents",
  "Hard-wired model router",
  "Public case-study pages",
  "Build them only when real sales or delivery friction proves they are the bottleneck."
]);

const publicIndex = readPublic("public/index.html");
const publicLlms = readPublic("public/llms.txt");
const publicOffer = readPublic("public/offer.md");
const publicAll = `${publicIndex}\n${publicLlms}\n${publicOffer}`;

requireCopy("public workflow view", publicIndex, [
  "The workflow is the product.",
  "Production system",
  "Human review",
  "Handoff loop",
  "Search trust ledger",
  "does not auto-publish client work"
]);

requireCopy("agent-readable public copy", publicAll, [
  "The workflow is the product",
  "client brain",
  "leak map",
  "measurement contract",
  "does not auto-publish"
]);

const offer = read("growth-brain/offer.md");
requireCopy("Growth Brain offer", offer, [
  "Tangible Revenue Leak Sprint + Search Trust Layer",
  "First proof clients",
  "Weekly Growth Desk",
  "Full-Stack Growth Desk",
  "We do not promise revenue, ROAS, rankings, or specific sales lift."
]);

const workflowOs = read("growth-brain/workflows/repeatable-workflow-operating-system.md");
requireCopy("repeatable workflow OS", workflowOs, [
  "clear input",
  "human approval gate",
  "real test with real data",
  "saved learning",
  "next iteration"
]);

const routing = read("growth-brain/ops/model-routing-standard.md");
requireCopy("model routing standard", routing, [
  "Workhorse",
  "Specialist",
  "Utility",
  "Manual",
  "Nothing gets sent, published, approved, or billed automatically."
]);

const economics = read("growth-brain/ops/unit-economics-ledger.md");
requireCopy("unit economics ledger", economics, [
  "Pre-customer / pre-revenue",
  "Production tool/model route",
  "Direct software/model cost",
  "Founder review time",
  "Blocked before customers"
]);

const agentOrchestration = read("growth-brain/ops/pre-revenue-agent-orchestration.md");
requireCopy("agent diagram parity", agentOrchestration, [
  "one operator",
  "three human touchpoints",
  "parallel production lanes",
  "specialist escalation",
  "verifier QA",
  "handoff",
  "skills/library feedback",
  "background pool",
  "It does not mean TinyStudio has paid-client proof"
]);

const pkg = JSON.parse(read("package.json"));
const requiredScripts = [
  "prospect:import",
  "prospect:batch-score",
  "prospect:prep-recording",
  "prospect:rehearsal",
  "prospect:outbox",
  "prospect:followups",
  "prospect:sales-cockpit",
  "market:proof-cockpit",
  "market:proof-check",
  "market:learn",
  "client:workflow",
  "client:weekly-loop",
  "owned:workflow-proof",
  "value:stress",
  "claims:check",
  "send:check",
  "agent:run",
  "agent:parity"
];

for (const script of requiredScripts) {
  if (!pkg.scripts?.[script]) failures.push(`Missing package script: ${script}`);
}

if (countMarkdownFiles("growth-brain/agents") < 7) {
  failures.push("Need at least seven agent workflow files.");
}

if (countMarkdownFiles("growth-brain/workflows") < 8) {
  failures.push("Need at least eight workflow files.");
}

const loomRows = read("prospects/loom-links.txt")
  .split("\n")
  .filter((line) => line.startsWith("prospects/") && line.includes("|approved|"));

if (loomRows.length < 5) {
  failures.push("Need at least five approved proof-run Loom rows.");
}

const marketParity = read("growth-brain/ops/market-parity-readiness.md");
const valueStress = read("growth-brain/ops/value-retention-stress-test.md");

requireCopy("market proof boundaries", `${marketParity}\n${valueStress}`, [
  "Owned products like AI Converter, SiteRep, and Five to Nine 0509 can prove delivery quality",
  "They do not replace external market proof",
  "Do not treat owned-startup proof as paid-client value proof."
]);

const forbiddenPublicClaims = [
  "guaranteed revenue",
  "guaranteed ROAS",
  "guaranteed rankings",
  "guaranteed sales",
  "$40k MRR",
  "90% margin"
];

for (const claim of forbiddenPublicClaims) {
  if (publicAll.toLowerCase().includes(claim.toLowerCase())) {
    failures.push(`Forbidden public article/revenue claim found: ${claim}`);
  }
}

if (failures.length) {
  console.error(failures.map((failure) => `- ${failure}`).join("\n"));
  process.exit(1);
}

console.log(
  JSON.stringify(
    {
      status: "pass",
      gate: "pre-customer-pre-revenue-article-parity",
      publicWorkflowView: "present",
      agentDiagramParity: "present",
      approvedProofRows: loomRows.length,
      agentWorkflowFiles: countMarkdownFiles("growth-brain/agents"),
      workflowFiles: countMarkdownFiles("growth-brain/workflows"),
      publicRoot
    },
    null,
    2
  )
);
