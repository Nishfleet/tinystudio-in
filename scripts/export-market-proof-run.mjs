#!/usr/bin/env node
import { existsSync, mkdirSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { isAbsolute, join, relative, resolve } from "node:path";
import { localIsoDate } from "./date-utils.mjs";
import { checkProspectReadiness, prospectWarningWeight } from "./lib/prospect-readiness.mjs";
import { isValidLoomUrl } from "./lib/loom-url.mjs";
import { sendChannelGuidance } from "./lib/send-channel-guidance.mjs";
import { routedContactPlan } from "./lib/contact-route.mjs";
import { canonicalProspectAsk } from "./lib/canonical-service-copy.mjs";
import { listOutboundProspectFolders } from "./lib/outbound-prospects.mjs";
import { runRepoJson, serviceRoot } from "./lib/runtime-roots.mjs";

const outputArg = process.argv.find((arg) => arg.startsWith("--output="));
const outputPath = outputArg ? outputArg.split("=")[1] : "growth-brain/ops/11-10-proof-run.md";
const loomLinksArg = process.argv.find((arg) => arg.startsWith("--loom-links="));
const skipKit = process.argv.includes("--skip-kit");
const limitArg = process.argv.find((arg) => arg.startsWith("--limit="));
const limit = limitArg ? Number(limitArg.split("=")[1]) : 5;
const today = localIsoDate();
const loomLinksPath = loomLinksArg
  ? loomLinksArg.split("=")[1]
  : outputPath.startsWith("prospects/kit-")
    ? "prospects/kit-proof-run-loom-links.txt"
    : "prospects/loom-links.txt";

// Every read and write is anchored to the service root (SERVICE_REPO_ROOT or
// the invocation directory) so a brief regenerated from any working directory
// reports the same pipeline state the rest of the operator surfaces read.
const resolvedOutputPath = isAbsolute(outputPath) ? outputPath : join(serviceRoot, outputPath);
const resolvedLoomLinksPath = isAbsolute(loomLinksPath) ? loomLinksPath : join(serviceRoot, loomLinksPath);
const prospectRoot = join(serviceRoot, "prospects");
const trackedBriefPath = join(serviceRoot, "growth-brain/ops/11-10-proof-run.md");

// Outbound pipeline state exists only when at least one real prospect folder
// carries a pipeline record. An absent prospects/ directory AND an empty one
// (for example one left behind by a private zero-state run that wrote the
// default loom sheet) both mean the pipeline is unavailable, never empty.
const hasProspectPipelineState = existsSync(prospectRoot)
  && listFolders(prospectRoot).some((path) => existsSync(join(path, "pipeline.json")));

// The default output is a git-tracked operator surface. When the service root
// holds no outbound prospect pipeline state, regeneration cannot tell an empty
// pipeline from an unavailable one, so it refuses instead of silently
// clobbering the tracked brief with a zero pipeline. Explicit private outputs
// under runs/ keep generating zero-state reports on purpose.
const regeneratesTrackedBrief = resolve(resolvedOutputPath) === resolve(trackedBriefPath);
if (regeneratesTrackedBrief && !hasProspectPipelineState) {
  console.error(`Refusing to regenerate the tracked 11/10 proof-run brief with a zero pipeline: no outbound prospect pipeline state found at ${prospectRoot}. Run this command from the service root that holds prospects/, or set SERVICE_REPO_ROOT to it, or pass an explicit --output= under runs/ for a private zero-state report.`);
  process.exit(1);
}
if (!hasProspectPipelineState) {
  console.warn(`Warning: no outbound prospect pipeline state found at ${prospectRoot}; pipeline counts in ${outputPath} will be zero.`);
}

// Child gate/metrics entrypoints resolve against the code checkout while
// running with the service root as their working/data directory, so a
// data-only SERVICE_REPO_ROOT keeps working like the other operator surfaces.
const runJson = (args) => runRepoJson(args);

function listFolders(root) {
  return listOutboundProspectFolders(root).filter((path) => !/(^|\/)(?:kit|import)-smoke/.test(path));
}

function read(path) {
  return existsSync(path) ? readFileSync(path, "utf8") : "";
}

function json(path) {
  return existsSync(path) ? JSON.parse(readFileSync(path, "utf8")) : {};
}

function lineValue(content, pattern, fallback = "") {
  const match = content.match(pattern);
  return match && match[1].trim() ? match[1].trim() : fallback;
}

function compact(value, maxLength = 140) {
  const normalized = String(value || "").replace(/\s+/g, " ").trim();
  if (!normalized) return "";
  return normalized.length <= maxLength ? normalized : `${normalized.slice(0, maxLength - 1).trim()}...`;
}

function cleanSheetNote(value, fallback) {
  const normalized = String(value || fallback || "")
    .replace(/\s+/g, " ")
    .replace(/\|/g, "/")
    .trim();
  return normalized.length >= 8 ? normalized : fallback;
}

function sharpnessValue(content, label) {
  const escaped = label.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  return String(content || "").match(new RegExp(`^- ${escaped}:[ \\t]*([^\\n]*)$`, "m"))?.[1]?.trim() || "";
}

function sharpnessSectionItems(content, heading, limit = 3) {
  const escaped = heading.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const match = String(content || "").match(new RegExp(`### ${escaped}\\n+([\\s\\S]*?)(?:\\n### |\\n## |$)`));
  if (!match) return [];
  return match[1]
    .split("\n")
    .map((line) => line.replace(/^-\s*/, "").trim())
    .filter(Boolean)
    .slice(0, limit);
}

function genericImpact(value) {
  return /asking buyers to understand multiple technical services|offer feels generic|hard to evaluate|without hunting through the page|safer, clearer choice|more qualified visitors should reach|a buyer can see the right next path sooner|page feels safer because the buyer/i.test(String(value || ""));
}

function proofRunImpact({ outlineImpact, sharpness, firstFix, route }) {
  const financial = sharpnessValue(sharpness, "Financial");
  const emotional = sharpnessValue(sharpness, "Emotional");
  const functional = sharpnessValue(sharpness, "Functional");
  const visiblePromise = sharpnessValue(sharpness, "Visible promise");
  const ctaCues = sharpnessSectionItems(sharpness, "CTA / Route Cues", 3);
  const proofCues = sharpnessSectionItems(sharpness, "Proof Cues", 3);
  if (outlineImpact && !genericImpact(outlineImpact)) return outlineImpact;
  if (financial && !genericImpact(financial)) return financial;
  if (functional && !genericImpact(functional)) return functional;
  const buyerLine = visiblePromise
    ? `A buyer landing on "${visiblePromise}" can recognize the right path faster.`
    : "A buyer can recognize the right path faster.";
  const cleanFix = String(firstFix || "").replace(/[.]+$/g, "").trim();
  const fixLine = cleanFix ? ` The first fix makes that path concrete: ${cleanFix}.` : "";
  const proofLine = proofCues.length
    ? ` It moves proof cues like ${proofCues.join(", ")} closer to the decision.`
    : "";
  const routeLine = ctaCues.length
    ? ` The next click becomes easier to choose: ${ctaCues.join(", ")}.`
    : route
      ? ` The next route is already clear: ${route}.`
      : "";
  const feelingLine = emotional && !genericImpact(emotional)
    ? ` ${emotional}`
    : "";
  return `${buyerLine}${fixLine}${proofLine}${routeLine}${feelingLine}`.trim();
}

function hasLeadScore(path) {
  const content = read(join(path, "lead-score.md"));
  return Boolean(content.trim()) && !/Score:\s*$/m.test(content) && !/Priority:\s*record \/ research-more \/ skip/m.test(content);
}

function hasLoom(path) {
  const buyerRoom = read(join(path, "buyer-room.md"));
  const loomMatch = buyerRoom.match(/^- Link:[ \t]*([^\n]*)$/m);
  return Boolean(loomMatch && isValidLoomUrl(loomMatch[1].trim()));
}

function parseLoomSheetLine(line) {
  const trimmed = String(line || "").trim();
  if (!trimmed || trimmed.startsWith("#")) return null;
  const separator = trimmed.includes("|") ? "|" : ",";
  const [path, loomUrl, approval] = trimmed.split(separator).map((part) => part.trim());
  return { path, loomUrl, approval };
}

function approved(value) {
  return ["approved", "quality-approved", "loom-approved"].includes(String(value || "").toLowerCase().replace(/\s+/g, "-"));
}

function sentProofFor(row) {
  const pipeline = json(join(row.path, "pipeline.json"));
  const notes = Array.isArray(pipeline.notes) ? pipeline.notes : [];
  const touches = Array.isArray(pipeline.touches) ? pipeline.touches : [];
  const referencesLoom = notes.some((note) => note?.action === "sent" && String(note.note || "").includes(row.loomUrl))
    || touches.some((touch) => touch?.action === "sent" && String(touch.note || "").includes(row.loomUrl));
  return Boolean(pipeline.sentAt) && referencesLoom && Boolean(pipeline.sentChannel || pipeline.lastChannel);
}

function isRecordedTouch(touch) {
  return Boolean(
    touch
    && typeof touch === "object"
    && /^(sent|followup-[1-3])$/.test(String(touch.action || ""))
    && (String(touch.channel || "").trim() || String(touch.note || "").trim())
  );
}

function directionGateCounts(loomRows, prospectRows) {
  const approvedRows = loomRows.filter((row) => row.path && existsSync(row.path) && approved(row.approval));
  const approvedLooms = approvedRows.length;
  const recordedLooms = approvedRows.filter((row) => isValidLoomUrl(row.loomUrl)).length;
  const sentLooms = approvedRows.filter((row) => isValidLoomUrl(row.loomUrl) && sentProofFor(row)).length;
  const touchStates = prospectRows.map((prospect) => {
    const pipeline = json(join(prospect.path, "pipeline.json"));
    const recorded = Array.isArray(pipeline.touches) ? pipeline.touches.filter(isRecordedTouch).length : 0;
    return { scored: prospect.scored, recorded };
  });
  const qualifiedTouches = touchStates.reduce((total, item) => total + (item.scored ? item.recorded : 0), 0);
  const qualifiedProspectsWithTouches = touchStates.filter((item) => item.scored && item.recorded > 0).length;
  return {
    approvedLooms,
    recordedLooms,
    sentLooms,
    qualifiedTouches,
    qualifiedProspectsWithTouches,
    pendingRecording: approvedLooms - recordedLooms,
    recordedWithoutSentProof: recordedLooms - sentLooms
  };
}

const parityOutputPath = outputPath.startsWith("prospects/kit-")
  ? "prospects/kit-market-proof-run-parity.md"
  : "prospects/market-proof-run-parity.md";
const resolvedParityOutputPath = isAbsolute(parityOutputPath) ? parityOutputPath : join(serviceRoot, parityOutputPath);
const parityArgs = ["scripts/check-market-parity-readiness.mjs", `--output=${parityOutputPath}`];
if (skipKit || !existsSync(resolvedOutputPath)) parityArgs.push("--skip-kit");
const parity = runJson(parityArgs);
rmSync(resolvedParityOutputPath, { force: true });

const metrics = runJson(["scripts/export-growth-metrics.mjs", "--output=runs/live-metrics.md"]);
const channelGuidance = sendChannelGuidance();

const prospects = listFolders(prospectRoot).map((path) => {
  const metadata = json(join(path, "metadata.json"));
  const pipeline = json(join(path, "pipeline.json"));
  const readiness = checkProspectReadiness(path);
  const leadScore = read(join(path, "lead-score.md"));
  const loomOutline = read(join(path, "loom-outline.md"));
  const sharpness = read(join(path, "recording-sharpness-brief.md"));
  const route = routedContactPlan(read(join(path, "contact-plan.md")), { emailReady: channelGuidance.emailReady });
  const firstFix = lineValue(loomOutline, /^6\. [^\n:]+:[ \t]*([^\n]*)$/m, "");
  return {
    path,
    name: metadata.name || path.split("/").at(-1),
    stage: pipeline.stage || "new",
    score: lineValue(leadScore, /^- Score:[ \t]*([^\n]*)$/m, "-"),
    priority: lineValue(leadScore, /^- Priority:[ \t]*([^\n]*)$/m, "-"),
    fault: lineValue(loomOutline, /^3\. [^\n:]+:[ \t]*([^\n]*)$/m, ""),
    impact: proofRunImpact({
      outlineImpact: lineValue(loomOutline, /^4\. [^\n:]+:[ \t]*([^\n]*)$/m, ""),
      sharpness,
      firstFix,
      route
    }),
    fix: firstFix,
    ask: canonicalProspectAsk(),
    route,
    scored: hasLeadScore(path),
    loomRecorded: hasLoom(path),
    warnings: readiness.warnings || [],
    weight: prospectWarningWeight(readiness.warnings || [])
  };
});

const recordingBatch = prospects
  .filter((prospect) => prospect.scored)
  .filter((prospect) => !prospect.loomRecorded)
  .filter((prospect) => !["won", "lost", "paused"].includes(prospect.stage))
  .sort((a, b) => a.weight - b.weight || a.name.localeCompare(b.name))
  .slice(0, limit);

const directionGate = directionGateCounts(
  read(resolvedLoomLinksPath).split("\n").map(parseLoomSheetLine).filter(Boolean).map((row) => ({
    ...row,
    path: row.path && (isAbsolute(row.path) ? row.path : join(serviceRoot, row.path))
  })),
  prospects
);

const requirementByArea = {
  "Sender trust": "Run `npm run send:configure -- --physical-address=\"...\" --dkim-selector=... --dry-run` with the real values, then apply it without `--dry-run`. Until then, use contact forms or DMs.",
  "Market proof": "Record and send 5 approved Looms with fault, impact, fix, and ask notes.",
  "Sales proof": "Capture at least 1 external consented application, human fit approval, and validated paid Day 0 record.",
  "Delivery proof": "Complete hash-bound human approval, implementation acceptance, approved claims, scorecard, and client readiness for that paid client.",
  "Retention proof": "Complete the 14-day tracking gate with hash-bound evidence and human-approved customer usefulness and acceptance."
};

const blockerRows = parity.blockers.length
  ? parity.blockers.map((blocker) => `| ${blocker.area} | ${blocker.evidence} | ${requirementByArea[blocker.area] || "Capture stronger proof before claiming this area."} |`).join("\n")
  : "| - | - | No blockers. |";

const loomSheetRows = recordingBatch.length
  ? recordingBatch.map((prospect) => `${relative(serviceRoot, prospect.path)}|LOOM_URL|approved|${cleanSheetNote(prospect.fault, "specific visible fault")}|${cleanSheetNote(prospect.impact, "buyer impact from the recording")}|${cleanSheetNote(prospect.fix, "first fix shown in the recording")}|${cleanSheetNote(prospect.ask, "ask if they want the sprint plan")}`).join("\n")
  : "prospects/prospect-slug|https://www.loom.com/share/...|approved|specific fault|buyer impact|first fix|clean ask";

const markdown = `# 11/10 Proof Run

Generated: ${today}

## Current Verdict

${parity.status === "11-10-ready" ? "11/10-ready. Current proof satisfies the market parity gate." : "Not 11/10 yet. The internal system is useful, but the proof run below must be completed before making stronger claims."}

Parity score: ${parity.score}/${parity.total}.

## Current Proof Blockers

| Area | Current Evidence | Required Proof |
|---|---|---|
${blockerRows}

## Today’s Proof Run

1. Open the recording view:

\`\`\`bash
npm run growth:start -- --view=record
\`\`\`

2. Record the five-item batch in the recording view. The folders and approved notes are in \`${loomLinksPath}\`. Each Loom shows one fault, its buyer impact, the first fix, and one ask.

3. Paste the recorded Loom URLs into the post-recording prep command:

The prefilled sheet is in \`${loomLinksPath}\`; it is the single source for approved fault, impact, fix, and ask notes. After recording, copy five Loom URLs in the same order, then run:

\`\`\`bash
npm run market:after-recording -- --from-clipboard
\`\`\`

4. Check the proof run status:

\`\`\`bash
npm run market:proof-check
\`\`\`

5. Send from the outbox, using the route shown for each prospect. Recommended channel right now: ${channelGuidance.recommendedChannel}.

${channelGuidance.warnings.length ? `Sender warnings: ${channelGuidance.warnings.join("; ")}.` : "Sender setup is clean."}

6. After sending, use the outbox copied sent sheet:

\`\`\`bash
npm run prospect:batch-sent -- --from-clipboard
\`\`\`

7. Run the proof check again. It should say \`sent-proof-captured\` before the market proof blocker can clear.

## Proof Capture Rules

- Market proof is real only after 5 Looms are recorded, send packages are ready, messages are sent, and stages are marked sent.
- Email sent proof does not count while \`npm run send:setup\` still warns. Use contact forms, DMs, LinkedIn, X, phone, mixed, or other until sender trust is clean.
- Sales proof is real only after an external consented application, human fit approval, and validated paid Day 0 record exist.
- Delivery proof is real only after that paid client has a hash-bound human-approved delivery, implementation acceptance, approved claims, filled scorecard, completed acceptance checks, and clean readiness.
- Retention proof is real only after the 14-day tracking gate has hash-bound evidence and human-approved customer usefulness and acceptance.
- Do not claim better, comparable, 11/10, retained, or proven until \`npm run market:parity\` passes.

## Current Counts

| Metric | Count |
|---|---:|
| Scored prospects | ${metrics.counts.scored} |
| Looms recorded | ${metrics.counts.loomsRecorded} |
| Sends | ${metrics.counts.sends} |
| Replies | ${metrics.counts.replies} |
| Calls | ${metrics.counts.calls} |
| Closed | ${metrics.counts.closed} |
| Clients ready | ${metrics.counts.clientsReady} |

## Direction Proof Gate

Source: the direction dossier gates this proof run on 5 approved Looms (recorded, then sent) and 40 qualified personalized touches. Counters read only existing repository state: approval rows and recorded Loom URLs in \`${loomLinksPath}\`, and pipeline \`touches\`/\`sentAt\`/notes under \`prospects/<slug>/\`. Drafts, raw LOOM_URL placeholders, unapproved rows, and prospects without touch evidence never count. Regeneration refuses to overwrite this tracked brief when the service root holds no prospect pipeline state, so an unavailable pipeline is never mistaken for an empty one.

| Gate | Progress | Counted Evidence |
|---|---:|---|
| Approved Looms | ${directionGate.approvedLooms}/5 | \`${loomLinksPath}\` rows marked approved for an existing prospect folder |
| Recorded Looms | ${directionGate.recordedLooms}/5 | approved rows carrying a real recorded Loom share URL |
| Sent Looms | ${directionGate.sentLooms}/5 | recorded Looms whose pipeline has \`sentAt\` plus a sent touch or note naming that exact Loom URL |
| Qualified touches | ${directionGate.qualifiedTouches}/40 | recorded \`touches\` entries with channel or note evidence in lead-scored prospect pipelines |

- Pending: ${directionGate.pendingRecording} approved row(s) still carry a raw Loom placeholder and do not count as recorded.
- Unknown: ${directionGate.recordedWithoutSentProof} recorded Loom(s) have no pipeline sent proof tied to that Loom URL yet.
- Missing: ${40 - directionGate.qualifiedTouches} qualified touch(es) are still absent; ${directionGate.qualifiedProspectsWithTouches} qualified prospect(s) currently carry touch evidence.
`;

const outputDir = resolvedOutputPath.split("/").slice(0, -1).join("/");
if (outputDir) mkdirSync(outputDir, { recursive: true });
writeFileSync(resolvedOutputPath, markdown);

const loomLinksDir = resolvedLoomLinksPath.split("/").slice(0, -1).join("/");
if (loomLinksDir) mkdirSync(loomLinksDir, { recursive: true });
// Retired broad-agency promise language must never persist in the proof-run
// sheet: it is the single source the brief tells the operator to record and
// send from. Existing rows keep their operator-captured fault/impact/fix
// notes and Loom URL, but any ask column that still names a retired offer is
// refreshed to the canonical ask. Mirrors the retired-offer pattern in
// check-outbound-send-readiness.mjs and export-recording-rehearsal-check.mjs.
const retiredPromisePattern = /7[-\s]day (?:site|website) revenue (?:leak|fault) (?:fix )?sprint|7[-\s]day sprint|tangible revenue (?:leak|fault) sprint|30[-\s]day action plan|growth desk|three pages|founder sprint|\$\s?500\b/i;
let refreshedAsks = 0;
const existingLoomRows = read(resolvedLoomLinksPath)
  .split("\n")
  .map((line) => line.trim())
  .filter((line) => line && !line.startsWith("#"))
  .map((line) => {
    if (!line.includes("|")) return line;
    const parts = line.split("|");
    if (parts.length < 7 || !retiredPromisePattern.test(parts[6])) return line;
    refreshedAsks += 1;
    return [...parts.slice(0, 6), cleanSheetNote(canonicalProspectAsk(), parts[6])].join("|");
  });
// Sheet row paths may be service-root relative or absolute; normalize both
// sides before deduplicating so regeneration never appends a duplicate row.
const sheetRowKey = (line) => {
  const first = line.split("|")[0].trim();
  return relative(serviceRoot, isAbsolute(first) ? first : join(serviceRoot, first));
};
const existingLoomPaths = new Set(existingLoomRows.map(sheetRowKey));
const generatedLoomRows = recordingBatch.length ? loomSheetRows.split("\n").filter((line) => !existingLoomPaths.has(sheetRowKey(line))) : existingLoomRows.length ? [] : [loomSheetRows];
const mergedLoomRows = [...existingLoomRows, ...generatedLoomRows];
writeFileSync(resolvedLoomLinksPath, `# Replace LOOM_URL with each real Loom share link, or run: npm run market:after-recording -- --from-clipboard\n# Fast format after recording: paste either URL-only lines in this exact order, or prospects/prospect-slug|https://www.loom.com/share/...\n# Full format still works: prospects/prospect-slug|https://www.loom.com/share/...|approved|fault note|impact note|fix note|ask note\n\n${mergedLoomRows.join("\n")}\n`);

console.log(JSON.stringify({
  status: "created",
  path: outputPath,
  loomLinksPath,
  date: today,
  parityStatus: parity.status,
  parityScore: parity.score,
  parityTotal: parity.total,
  blockers: parity.blockers.map((blocker) => blocker.area),
  selectedProspects: recordingBatch.map((prospect) => prospect.path),
  directionGate,
  refreshedAsks,
  recommendedChannel: channelGuidance.recommendedChannel
}, null, 2));
