import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { isValidLoomUrl } from "./loom-url.mjs";

function readIfExists(path) {
  return existsSync(path) ? readFileSync(path, "utf8") : "";
}

function section(markdown, heading) {
  const escaped = heading.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const match = String(markdown || "").match(new RegExp(`## ${escaped}\\n+([\\s\\S]*?)(?:\\n## |$)`));
  return match ? match[1].trim() : "";
}

function lineValue(markdown, label) {
  const escaped = label.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  return String(markdown || "").match(new RegExp(`^- ${escaped}:[ \\t]*([^\\n]*)$`, "m"))?.[1]?.trim() || "";
}

function numberedValue(markdown, number) {
  const match = String(markdown || "").match(new RegExp(`^${number}\\. [^\\n:]+:[ \\t]*([^\\n]*)$`, "m"));
  return match?.[1]?.trim() || "";
}

function meaningful(value, minLength = 12) {
  const normalized = String(value || "").trim();
  return normalized.length >= minLength && !/^(todo|tbd|n\/a|none|placeholder|add|replace|-|\[.*\])$/i.test(normalized);
}

function hasSpecificity(value) {
  const normalized = String(value || "").trim();
  if (!meaningful(normalized, 18)) return false;
  return !/\b(website|page|copy|messaging|marketing|strategy|content)\s+(is|are|feels?)\s+(bad|weak|unclear|generic)\b/i.test(normalized);
}

function bannedClaims(content) {
  const text = String(content || "");
  return [
    /\bguarantee(?:d|s)?\b/i,
    /\b\d+%\s*(?:lift|increase|more|growth|roi|roas|conversion|traffic|rankings?)\b/i,
    /\b(rank|ranking|rankings)\s+(?:guarantee|guaranteed|in\s+\d+\s+days)\b/i,
    /\bROAS\b/i
  ].filter((pattern) => pattern.test(text)).map((pattern) => pattern.source);
}

function loomUrl(markdown) {
  return String(markdown || "").match(/https?:\/\/(?:www\.)?loom\.com\/(?:share|embed)\/[^\s)]+/i)?.[0] || "";
}

export function replyWorthiness(prospectPath) {
  const notes = readIfExists(join(prospectPath, "recording-notes.md"));
  const brief = readIfExists(join(prospectPath, "recording-sharpness-brief.md"));
  const script = readIfExists(join(prospectPath, "recording-script.md"));
  const message = readIfExists(join(prospectPath, "next-message.md"));
  const contactPlan = readIfExists(join(prospectPath, "contact-plan.md"));
  const buyerRoom = readIfExists(join(prospectPath, "buyer-room.md"));
  const outline = readIfExists(join(prospectPath, "loom-outline.md"));

  const noteValues = {
    fault: lineValue(notes, "Visible fault"),
    impact: lineValue(notes, "Buyer impact"),
    fix: lineValue(notes, "First fix"),
    ask: lineValue(notes, "Clean ask")
  };

  const fallbackLeak = numberedValue(outline, 3);
  const fallbackImpact = numberedValue(outline, 4);
  const fallbackFix = numberedValue(outline, 6);
  const currentLoomUrl = loomUrl(buyerRoom) || loomUrl(message);
  const allBannedClaims = bannedClaims([notes, brief, script, message].join("\n\n"));
  const contactRoute = section(contactPlan, "Best Route");
  const messageLeakEvidence = [noteValues.fault, fallbackLeak]
    .filter((value) => meaningful(value))
    .some((value) => message.includes(value));

  const checks = [
    {
      area: "Recording notes complete",
      points: 2,
      passed: Object.values(noteValues).every((value) => meaningful(value)),
      evidence: Object.entries(noteValues).filter(([, value]) => meaningful(value)).map(([key]) => key).join(", ") || "recording notes missing"
    },
    {
      area: "Specific visible fault",
      points: 1,
      passed: hasSpecificity(noteValues.fault || fallbackLeak),
      evidence: noteValues.fault || fallbackLeak || "no specific fault"
    },
    {
      area: "Buyer impact",
      points: 1,
      passed: meaningful(noteValues.impact || fallbackImpact),
      evidence: noteValues.impact || fallbackImpact || "no buyer impact"
    },
    {
      area: "First fix",
      points: 1,
      passed: meaningful(noteValues.fix || fallbackFix),
      evidence: noteValues.fix || fallbackFix || "no first fix"
    },
    {
      area: "Clean ask",
      points: 1,
      passed: meaningful(noteValues.ask) && /if useful|worth|reply|send|sprint|next step/i.test(noteValues.ask),
      evidence: noteValues.ask || "no clean ask"
    },
    {
      area: "Sharpness brief",
      points: 1,
      passed: ["Positioning Angle", "Direct Response Slide", "So-What Chain"].every((heading) => brief.includes(`## ${heading}`)),
      evidence: brief ? "positioning, direct response, and so-what chain present" : "sharpness brief missing"
    },
    {
      area: "Message includes Loom and fault",
      points: 1,
      passed: isValidLoomUrl(currentLoomUrl) && messageLeakEvidence,
      evidence: currentLoomUrl || "Loom URL missing from buyer room/message"
    },
    {
      area: "Safe send route",
      points: 1,
      passed: meaningful(contactRoute) && !/run contact plan/i.test(contactRoute),
      evidence: contactRoute || "best route missing"
    },
    {
      area: "No unsupported outcome claim",
      points: 1,
      passed: allBannedClaims.length === 0,
      evidence: allBannedClaims.length ? `blocked patterns: ${allBannedClaims.join(", ")}` : "no guaranteed revenue/ranking/ROAS/lift claim found"
    }
  ];

  const score = checks.reduce((sum, check) => sum + (check.passed ? check.points : 0), 0);
  const warnings = checks
    .filter((check) => !check.passed)
    .map((check) => `${check.area}: ${check.evidence}`);

  return {
    status: score >= 8 ? "reply-worthy" : "needs-work",
    prospectPath,
    score,
    total: 10,
    warnings,
    checks
  };
}

export function formatReplyWorthinessMarkdown(result) {
  const rows = result.checks
    .map((check) => `| ${check.area} | ${check.passed ? "pass" : "missing"} | ${check.points} | ${check.evidence} |`)
    .join("\n");
  return `## Reply-Worthy Proof Gate

Score: ${result.score}/${result.total} - ${result.status}

| Area | Status | Points | Evidence |
|---|---|---:|---|
${rows}
`;
}
