#!/usr/bin/env node
import { execFileSync } from "node:child_process";

function run(args) {
  return JSON.parse(execFileSync("node", args, {
    cwd: process.cwd(),
    encoding: "utf8",
    stdio: ["ignore", "pipe", "pipe"]
  }));
}

const emptyReferenceResult = run([
  "scripts/run-design-system-proving-lab.mjs",
  "--dry-run",
  "--reference-run",
  "docs/evidence/design-system-proving-lab/reference-runs/__empty-test-fixture__"
]);
const result = run(["scripts/run-design-system-proving-lab.mjs", "--dry-run"]);
const failures = [];

if (result.status !== "pass") failures.push("proving-lab setup contract should pass");
if (!/^blocked-before-/.test(result.labStatus || "")) failures.push("proving lab must stay blocked until all proof exists");
if (result.externalUseAllowed !== false) failures.push("proving lab must not allow public/outreach use from setup metadata");
if (result.businessCount < 8 || result.businessCount > 12) failures.push("benchmark must contain 8-12 relevant businesses");
if (emptyReferenceResult.missingReferencePacketCount !== emptyReferenceResult.businessCount) failures.push("empty reference fixture should report one missing fresh Mobbin packet per business");
if (emptyReferenceResult.passingReferencePacketCount !== 0) failures.push("empty reference fixture must not treat hardcoded references as passing fresh Mobbin packets");
if (result.missingReferencePacketCount + result.blockedReferencePacketCount + result.passingReferencePacketCount !== result.businessCount) failures.push("reference packet counts must add up to benchmark business count");
if (result.missingDirectionPacketCount + result.blockedDirectionPacketCount + result.passingDirectionPacketCount !== result.businessCount) failures.push("direction packet counts must add up to benchmark business count");
if (result.missingPreviewProofCount + result.blockedPreviewProofCount + result.passingPreviewProofCount !== result.businessCount) failures.push("preview proof counts must add up to benchmark business count");
if (result.passingReferencePacketCount === result.businessCount && result.labStatus !== "blocked-before-concepts" && result.passingDirectionPacketCount !== result.businessCount) failures.push("complete references must advance the blocker to missing concept directions");
if (result.productOrHybridCount < 2) failures.push("benchmark must include product-led or hybrid businesses, not services only");
if (result.minimumRawPoolScreens < 32) failures.push("wide Mobbin pull must require at least 32 returned screens before compression");
if (result.minimumUniqueRawPoolScreens < 20) failures.push("wide Mobbin pull must require at least 20 unique screens before compression");
if (!emptyReferenceResult.trustBlockers?.some((blocker) => /Fresh per-business Mobbin Pro reference packets/i.test(blocker))) failures.push("runner must block on missing fresh Mobbin packets");
if (!result.trustBlockers?.some((blocker) => /visual territory exploration.*screenshot-level finalist concepts/i.test(blocker))) failures.push("runner must block on missing visual territory exploration and finalist concepts");
if (result.passingDirectionPacketCount === result.businessCount && !result.trustBlockers?.some((blocker) => /human approval/i.test(blocker))) failures.push("runner must block on missing human approval after concepts exist");

if (failures.length) {
  console.error(JSON.stringify({ status: "fail", failures, result }, null, 2));
  process.exit(1);
}

console.log(JSON.stringify({
  status: "pass",
  checks: 16,
  labStatus: result.labStatus
}, null, 2));
