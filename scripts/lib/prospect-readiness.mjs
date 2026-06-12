import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { isValidLoomUrl } from "./loom-url.mjs";
import { replyWorthiness } from "./reply-worthy-proof.mjs";

const requiredFiles = [
  "metadata.json",
  "lead-score.md",
  "loom-outline.md",
  "outreach.md",
  "buyer-room.md",
  "value-calculator.md",
  "audit-brief.md"
];

function readIfExists(path) {
  return existsSync(path) ? readFileSync(path, "utf8") : "";
}

function soloFounderSizeMismatch(content) {
  const text = String(content || "").toLowerCase();
  const largeTeam = /\b(?:[5-9]\d|\d{3,})\+?\s+(?:it\s+)?(?:experts|employees|engineers|staff|specialists|consultants|team members)\b/.test(text);
  const largeClientBase = /\b(?:[1-9]\d{2,}|\d{4,})\+?\s+(?:businesses|clients|customers|companies)(?:\s+served)?\b/.test(text);
  const largeAdjacentProof = /\b(?:100s|hundreds)\s+(?:of\s+)?(?:businesses|clients|customers|companies|software launches|launches|projects)\b/.test(text);
  const multiDecadeExperience = /\b(?:over|more than|nearly|almost)?\s*(?:1[5-9]|[2-9]\d)\+?\s+(?:years|yrs)\b/.test(text)
    || /\b(?:nearly|almost|over|more than)?\s*(?:two|three|four|five|\d+)\s+decades?\b/.test(text);
  const oldFoundedSignal = /\b(?:since|founded|established)\s+(?:19\d{2}|200\d|201[0-4])\b/.test(text);
  const incumbentPositioning = /\b(?:enterprise[-\s]?grade|enterprise level|award[-\s]?winning|msp\s*501|premier managed service provider)\b/.test(text);
  const explicitMismatch = /(?:not[-\s]?fit|bad[-\s]?fit|disqualif|too large|large incumbent|mature incumbent|enterprise[-\s]?grade|big incumbent)/i.test(content);
  return largeTeam
    || largeClientBase
    || largeAdjacentProof
    || multiDecadeExperience
    || oldFoundedSignal
    || incumbentPositioning
    || (largeClientBase && explicitMismatch);
}

export function checkProspectReadiness(prospectPath) {
  const missing = [];
  const warnings = [];

  for (const file of requiredFiles) {
    if (!existsSync(join(prospectPath, file))) missing.push(`Missing ${file}`);
  }

  let metadata = {};
  if (existsSync(join(prospectPath, "metadata.json"))) {
    metadata = JSON.parse(readFileSync(join(prospectPath, "metadata.json"), "utf8"));
  }

  for (const field of ["website", "vertical", "contact"]) {
    if (!metadata[field]) warnings.push(`Metadata missing ${field}`);
  }

  const fitSignal = [
    JSON.stringify(metadata),
    readIfExists(join(prospectPath, "lead-score.md")),
    readIfExists(join(prospectPath, "page-snapshot.md")),
    readIfExists(join(prospectPath, "recording-sharpness-brief.md"))
  ].join("\n\n");
  if (soloFounderSizeMismatch(fitSignal)) {
    warnings.push("ICP size mismatch for solo-founder first batch");
  }

  const leadScore = readIfExists(join(prospectPath, "lead-score.md"));
  if (/Score:\s*$/m.test(leadScore)) warnings.push("Lead score is blank");
  if (/Priority:\s*record \/ research-more \/ skip/m.test(leadScore)) warnings.push("Priority is not chosen");

  const loomOutline = readIfExists(join(prospectPath, "loom-outline.md"));
  if (/\[specific leak\]|Specific leak:\s*$/m.test(loomOutline)) warnings.push("Loom specific leak is not filled");
  if (!existsSync(join(prospectPath, "loom-package.md"))) warnings.push("Loom package has not been generated");
  const hasPageSnapshot = existsSync(join(prospectPath, "page-snapshot.md"));
  const hasSharpnessBrief = existsSync(join(prospectPath, "recording-sharpness-brief.md"));
  const hasRecordingScript = existsSync(join(prospectPath, "recording-script.md"));
  const recordingScript = readIfExists(join(prospectPath, "recording-script.md"));
  if (!hasPageSnapshot) warnings.push("Page snapshot has not been generated");
  if (!hasSharpnessBrief) warnings.push("Recording sharpness brief has not been generated");
  if (!hasRecordingScript) warnings.push("Recording script has not been generated");
  if (hasRecordingScript && hasPageSnapshot && !recordingScript.includes("## Live Page Cues")) {
    warnings.push("Recording script is not snapshot-aware");
  }
  if (hasRecordingScript && hasSharpnessBrief && !recordingScript.includes("## Recording Sharpness")) {
    warnings.push("Recording script is not sharpness-aware");
  }

  const outreach = readIfExists(join(prospectPath, "outreach.md"));
  if (/\[specific leak\]|\[link\]/.test(outreach)) warnings.push("Outreach still has placeholders");

  const buyerRoom = readIfExists(join(prospectPath, "buyer-room.md"));
  if (/Loom\s*\n\s*-\s*Link:\s*$/m.test(buyerRoom)) warnings.push("Buyer room Loom link is blank");
  const loomMatch = buyerRoom.match(/^- Link:[ \t]*([^\n]*)$/m);
  if (loomMatch && loomMatch[1].trim() && !isValidLoomUrl(loomMatch[1].trim())) warnings.push("Buyer room Loom link is not a valid Loom URL");
  if (loomMatch && loomMatch[1].trim() && isValidLoomUrl(loomMatch[1].trim())) {
    const replyProof = replyWorthiness(prospectPath);
    if (replyProof.score < 8) warnings.push(`Reply-worthy proof score is below 8/10 (${replyProof.score}/10)`);
  }
  if (/Price:\s*$/m.test(buyerRoom)) warnings.push("Buyer room price is blank");

  return {
    status: missing.length === 0 && warnings.length === 0 ? "ready" : "draft",
    prospectPath,
    missing,
    warnings
  };
}

export function prospectWarningWeight(warnings) {
  if (!warnings || warnings.length === 0) return 0;
  if (warnings.includes("ICP size mismatch for solo-founder first batch")) return 20;

  let weight = 0;
  if (warnings.includes("Buyer room Loom link is not a valid Loom URL")) weight = Math.max(weight, 1);
  if (warnings.length === 1 && warnings[0] === "Buyer room Loom link is blank") weight = Math.max(weight, 1);
  if (warnings.includes("Recording script is not snapshot-aware")) weight = Math.max(weight, 3);
  if (warnings.includes("Recording script is not sharpness-aware")) weight = Math.max(weight, 3);
  if (warnings.includes("Loom specific leak is not filled")) weight = Math.max(weight, 4);
  if (warnings.includes("Loom package has not been generated")) weight = Math.max(weight, 4);
  if (warnings.includes("Outreach still has placeholders")) weight = Math.max(weight, 4);
  if (warnings.includes("Buyer room price is blank")) weight = Math.max(weight, 4);
  if (warnings.includes("Lead score is blank") || warnings.includes("Priority is not chosen")) weight = Math.max(weight, 8);
  if (warnings.includes("Recording sharpness brief has not been generated")) weight = Math.max(weight, 10);
  if (warnings.includes("Page snapshot has not been generated")) weight = Math.max(weight, 10);
  if (warnings.includes("Recording script has not been generated")) weight = Math.max(weight, 10);

  return weight || warnings.length + 2;
}
