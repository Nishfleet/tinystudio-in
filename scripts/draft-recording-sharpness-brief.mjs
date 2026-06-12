#!/usr/bin/env node
import { existsSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { agencyConfig } from "./lib/agency-config.mjs";

const prospectPath = process.argv[2];

if (!prospectPath) {
  console.error("Usage: npm run prospect:brief -- prospects/prospect-slug");
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

function json(relativePath) {
  const path = join(prospectPath, relativePath);
  return existsSync(path) ? JSON.parse(readFileSync(path, "utf8")) : {};
}

function clean(value, fallback = "") {
  const text = String(value || fallback)
    .replace(/\s+/g, " ")
    .replace(/[`*_#[\]]/g, "")
    .replace(/\.+$/g, "")
    .trim();
  return text || fallback;
}

function lineValue(content, number, fallback) {
  const pattern = new RegExp(`^${number}\\. [^\\n:]+:[ \\t]*([^\\n]*)$`, "m");
  const match = content.match(pattern);
  return clean(match?.[1], fallback);
}

function section(content, heading, level = "##") {
  const escaped = heading.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const nextHeading = level === "##" ? "\\n## " : "\\n(?:## |### )";
  const match = content.match(new RegExp(`(?:^|\\n)${level} ${escaped}\\n+([\\s\\S]*?)(?=${nextHeading}|$)`));
  return match ? match[1].trim() : "";
}

function bulletValues(content) {
  return content
    .split("\n")
    .map((line) => clean(line.replace(/^- /, "")))
    .filter((line) => line && line !== "none found" && line !== "-");
}

function labeledValue(content, label) {
  const escaped = label.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const match = content.match(new RegExp(`^- ${escaped}:\\s*([^\\n]+)$`, "m"));
  return clean(match?.[1]);
}

function firstFilled(values, fallback) {
  return values.find((value) => clean(value)) || fallback;
}

function inferMarketStage({ vertical, snapshot, leak, proof }) {
  const combined = `${vertical} ${snapshot} ${leak} ${proof}`.toLowerCase();
  if (/managed it|msp|cyber|security|compliance|it support/.test(combined)) {
    return "crowded";
  }
  if (/award|certified|partner|reviews?|years?|clients?/.test(combined)) {
    return "mature";
  }
  if (/unclear|generic|same as|no proof|missing/.test(combined)) {
    return "jaded";
  }
  return "growing";
}

function stageFrame(stage) {
  const frames = {
    new: "simple promise",
    growing: "bigger claim with a specific proof point",
    crowded: "show the mechanism that makes this page different",
    jaded: "prove it with visible evidence, not claims",
    mature: "self-identify the exact buyer and use case"
  };
  return frames[stage] || frames.crowded;
}

function inferAngle({ leak, firstFix, proof, ctas }) {
  const combined = `${leak} ${firstFix} ${proof} ${ctas}`.toLowerCase();
  if (/proof|trust|review|testimonial|case stud|certif|partner|years|clients/.test(combined)) {
    return "specificity";
  }
  if (/contact|form|book|call|schedule|demo|quote|cta|next step|route/.test(combined)) {
    return "speed";
  }
  if (/compliance|security|cyber|risk|audit|hipaa|soc/.test(combined)) {
    return "enemy";
  }
  if (/architecture|hierarchy|position|focus|message|section|rewrite/.test(combined)) {
    return "transformation";
  }
  return "specificity";
}

function angleFrame(angle) {
  const frames = {
    contrarian: "The page is doing what most sites do, but that is the problem.",
    transformation: "Move the buyer from vague interest to a clear next step.",
    enemy: "The enemy is buyer uncertainty, not the competitor.",
    speed: "The buyer should understand the next step in seconds.",
    specificity: "Specific proof beats a broader promise."
  };
  return frames[angle] || frames.specificity;
}

function mechanismName(wedge, firstFix) {
  const text = `${wedge} ${firstFix}`.toLowerCase();
  if (/architecture|hierarchy|homepage|service page/.test(text)) return "Money-page clarity pass";
  if (/proof|trust|reviews?|case/.test(text)) return "Proof-at-decision pass";
  if (/cta|contact|route|form/.test(text)) return "Next-step friction pass";
  if (/compliance|security|cyber/.test(text)) return "Compliance buyer confidence pass";
  return "Revenue leak pass";
}

function outcomeChain({ firstFix, visiblePromise, ctas, proof }) {
  const route = ctas.length ? ctas.slice(0, 3).join(", ") : "the next step";
  const proofCue = proof.length ? proof.slice(0, 3).join(", ") : "visible proof";
  const promise = visiblePromise ? `"${visiblePromise}"` : "the page promise";
  return {
    feature: firstFix,
    functional: `Move the buyer from ${promise} into ${route} without making them decode every service first.`,
    financial: `Protect sales time by sending better-fit visitors toward ${route} with a clearer reason to act.`,
    emotional: `Lower the risk of the first call by putting ${proofCue} close to the buyer's decision moment.`
  };
}

function compactList(values, max = 4) {
  return values.slice(0, max).map((value) => `- ${clean(value)}`).join("\n") || "- none captured";
}

const metadata = json("metadata.json");
const config = agencyConfig();
const outline = read("loom-outline.md");
const snapshot = read("page-snapshot.md");
const buyerRoom = read("buyer-room.md");
const leadScore = read("lead-score.md");

const name = metadata.name || prospectPath.split("/").at(-1);
const vertical = metadata.vertical || "unknown";
const pagePromise = section(snapshot, "Page Promise");
const h1 = bulletValues(section(snapshot, "H1", "###"));
const h2 = bulletValues(section(snapshot, "H2", "###"));
const ctas = bulletValues(section(snapshot, "CTA And Route Cues"));
const proof = bulletValues(section(snapshot, "Trust / Proof Cues"));
const visiblePromise = firstFilled(h1, labeledValue(pagePromise, "Title") || name);
const description = labeledValue(pagePromise, "Description");
const score = leadScore.match(/Score:\s*([^\n]+)/)?.[1]?.trim() || "not scored";
const priority = leadScore.match(/Priority:\s*([^\n]+)/)?.[1]?.trim() || "unknown";
const wedgeMatch = outline.match(/## Wedge\n+([\s\S]*?)(?:\n## |$)/);
const wedge = clean(
  wedgeMatch?.[1]
    ?.split("\n")
    .map((line) => line.trim().replace(/^-+\s*/, ""))
    .find((line) => line && !line.includes("Pick one")) || "Site architecture"
);
const mainPage = lineValue(outline, 2, "the main money page");
const leak = lineValue(outline, 3, "the page is making the buyer work too hard before the next step is obvious");
const impact = lineValue(outline, 4, "this creates friction for buyers and makes the offer harder to understand");
const contrast = lineValue(outline, 5, "a clearer competitor or reference pattern");
const firstFix = lineValue(outline, 6, "clarify the page hierarchy, proof, and CTA path");
const price = buyerRoom.match(/- Price:\s*(.+)/)?.[1]?.trim() || config.founderSprintPrice;
const stage = inferMarketStage({
  vertical,
  snapshot: `${visiblePromise} ${description} ${h2.join(" ")}`,
  leak,
  proof: proof.join(" ")
});
const angle = inferAngle({
  leak,
  firstFix,
  proof: proof.join(" "),
  ctas: ctas.join(" ")
});
const mechanism = mechanismName(wedge, firstFix);
const chain = outcomeChain({ firstFix, visiblePromise, ctas, proof });

const markdown = `# ${name} Recording Sharpness Brief

Use this before recording. The job is not to sound clever. The job is to make one visible leak feel obvious, specific, and useful.

## Snapshot

- Folder: ${prospectPath}
- Website: ${metadata.website || "-"}
- Lead score: ${score}
- Priority: ${priority}
- Vertical: ${vertical}
- Visible promise: ${visiblePromise}
- Description cue: ${description || "-"}
- Main page: ${mainPage}

## Positioning Angle

- Market stage: ${stage}
- Stage frame: ${stageFrame(stage)}
- Mechanism: ${mechanism}
- Angle type: ${angle}
- Angle frame: ${angleFrame(angle)}
- Believability test: point to the live page, not an opinion.

## Direct Response Slide

1. Headline: ${visiblePromise}
2. Problem: ${leak}
3. Agitate: ${impact}
4. Credibility: ${proof[0] || "use only visible proof from the live page"}
5. Solution: ${firstFix}
6. Proof: ${proof[1] || contrast}
7. CTA: Offer the ${config.offerName} at ${price} without promising revenue, rankings, ROAS, or lift.

## So-What Chain

- Feature: ${chain.feature}
- Functional: ${chain.functional}
- Financial: ${chain.financial}
- Emotional: ${chain.emotional}

Write from the emotional line, then prove it with the live-page details.

## Specificity Bank

### Visible Page Cues

${compactList([visiblePromise, description, ...h2], 6)}

### CTA / Route Cues

${compactList(ctas, 6)}

### Proof Cues

${compactList(proof, 8)}

## Recording Rules

- Start with the page promise.
- Show exactly one leak.
- Say why the buyer cares in plain language.
- Show the first fix, not a full rebuild.
- Keep the rhythm short: short sentence, breathe, land it.
- Use specific page details instead of broad claims.
- Ask for one next step.
- Do not mention guaranteed revenue, rankings, ROAS, traffic, or conversion lift.

## 20-Second Cold Open

"Hey ${name} team, ${config.founderName} here. I recorded this because your site has a clear ${wedge.toLowerCase()} opportunity. I am going to show one specific leak I noticed on ${mainPage}, why it could make buyers hesitate, and the first fix I would make."
`;

const outputPath = join(prospectPath, "recording-sharpness-brief.md");
writeFileSync(outputPath, markdown);

console.log(JSON.stringify({
  status: "created",
  path: outputPath,
  prospectPath,
  stage,
  angle,
  mechanism
}, null, 2));
