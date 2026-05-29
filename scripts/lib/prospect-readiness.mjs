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
  if (warnings.length === 1 && warnings[0] === "Buyer room Loom link is blank") return 1;
  if (warnings.includes("Buyer room Loom link is not a valid Loom URL")) return 1;
  if (warnings.includes("Recording script is not snapshot-aware")) return 2;
  if (warnings.includes("Recording script is not sharpness-aware")) return 2;
  if (warnings.includes("Recording sharpness brief has not been generated")) return 2;
  if (warnings.includes("Page snapshot has not been generated")) return 2;
  if (warnings.includes("Recording script has not been generated")) return 2;
  if (warnings.includes("Loom package has not been generated")) return 4;
  if (warnings.includes("Lead score is blank") || warnings.includes("Priority is not chosen")) return 5;
  return warnings.length + 2;
}
