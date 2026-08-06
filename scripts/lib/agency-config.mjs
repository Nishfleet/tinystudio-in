import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { NO_GUARANTEE_OUTCOMES } from "./service-contract.mjs";
import { codeRoot, serviceRoot } from "./runtime-roots.mjs";

const configPath = "growth-brain/ops/agency-config.json";

const defaults = {
  founderName: "Nish",
  offerName: "The Website Correction",
  buyer: "founder-led Managed IT/MSP/cybersecurity companies with a live site and high-value offer",
  founderSprintPrice: "$1,000 founder pilot",
  firstClientCount: 3,
  scope: "one highest-leverage page",
  includedDeliverables: [
    "leak map",
    "rewrite or redesign",
    "one implementation pass or dev-ready handoff",
    "search-trust basics",
    "before/after proof",
    "Loom",
    "measurement plan",
    "one revision",
    "14-day implementation tracking"
  ],
  dayZeroRule: "Day 0 starts only after payment, required context, approval owner, and implementation owner; client delay pauses the clock.",
  noGuarantees: [...NO_GUARANTEE_OUTCOMES],
  humanReviewGates: ["fit", "claims", "client-facing work", "delivery/acceptance", "renewal"],
  automationBoundary: "prepares research, drafts, QA, packages, and routing; never autonomously sends, publishes, spends, approves, accepts, or renews",
  saasGraduationEvidence: [
    "at least 10 paid sprints",
    "same problem in at least 7",
    "at least 70% workflow repeatability",
    "usefulness at least 8/10",
    "approval at least 70%",
    "recurring need",
    "at least 3 deposits or preorders"
  ],
  optOutLine: "If this is not useful, reply no and I will not follow up.",
  senderEmail: "hello@tinystudio.io",
  senderPhysicalAddress: "",
  dkimSelector: "",
  manualDailySendCap: 20,
  humanDailyReviewCap: 20,
  meetingPlaceholder: "add meeting link",
  paymentPlaceholder: "add payment link",
  legacyFounderSprintPrices: [],
  legacyPriceRanges: [],
  legacyOfferNames: []
};

export function agencyConfig(repoRoot = serviceRoot) {
  const canonicalPath = join(codeRoot, configPath);
  const resolvedConfigPath = join(repoRoot, configPath);
  return {
    ...defaults,
    ...(existsSync(canonicalPath) ? JSON.parse(readFileSync(canonicalPath, "utf8")) : {}),
    ...(existsSync(resolvedConfigPath) ? JSON.parse(readFileSync(resolvedConfigPath, "utf8")) : {})
  };
}

export function appendOptOut(value) {
  const config = agencyConfig();
  if (/reply\s+no|do not follow up|unsubscribe|opt out/i.test(value)) return value;
  return `${value.trim()}\n\n${config.optOutLine}`;
}

export function appendEmailComplianceFooter(value) {
  const config = agencyConfig();
  const withOptOut = appendOptOut(value);
  if (!config.senderPhysicalAddress || withOptOut.includes(config.senderPhysicalAddress)) return withOptOut;
  return `${withOptOut.trim()}\n\n${config.senderPhysicalAddress}`;
}
