#!/usr/bin/env node
import fs from "node:fs/promises";
import { existsSync, readFileSync } from "node:fs";
import path from "node:path";
import { createHash } from "node:crypto";

const root = process.cwd();

const args = process.argv.slice(2);
const dryRun = args.includes("--dry-run");
const readyMode = args.includes("--ready");
const noWrite = dryRun || args.includes("--no-write");
const referenceRunArg = valueAfterArg("--reference-run");
const maxReferenceAgeHours = Number(valueAfterArg("--max-reference-age-hours") || process.env.MOBBIN_REFERENCE_MAX_AGE_HOURS || 48);
const minimumRawPoolScreens = Number(valueAfterArg("--min-raw-pool-screens") || process.env.MOBBIN_MIN_RAW_POOL_SCREENS || 32);
const minimumUniqueRawPoolScreens = Number(valueAfterArg("--min-unique-raw-pool-screens") || process.env.MOBBIN_MIN_UNIQUE_RAW_POOL_SCREENS || 20);

const benchmarkPath = path.join(root, "data", "design-system-proving-lab", "benchmark-businesses.json");
const evidenceRoot = path.join(root, "docs", "evidence", "design-system-proving-lab");
const searchBriefRoot = path.join(evidenceRoot, "search-briefs");
const defaultReferenceRunRoot = path.join(evidenceRoot, "reference-runs", "latest");
const referenceRunRoot = referenceRunArg ? path.resolve(root, referenceRunArg) : defaultReferenceRunRoot;
const reportPath = path.join(evidenceRoot, "proving-lab-report.json");
const reportMdPath = path.join(evidenceRoot, "proving-lab-report.md");

const requiredIngredientLayers = [
  "business-job",
  "information-architecture",
  "content-strategy",
  "voice-and-tone",
  "typography",
  "layout-structure",
  "spacing-system",
  "responsive-behavior",
  "color-system",
  "surfaces-and-materials",
  "depth",
  "shape",
  "component-anatomy",
  "component-states",
  "interaction-model",
  "motion",
  "media-direction",
  "iconography",
  "illustration-graphics",
  "proof-architecture",
  "cta-system",
  "forms-and-lead-capture",
  "accessibility",
  "localization-and-formatting",
  "seo-aeo-metadata",
  "performance",
  "implementation-tokens",
  "governance"
];

const requiredQueryAngles = ["niche", "page-job", "tone", "constraint"];
const fitScoreKeys = ["job", "niche", "firstViewport", "cta", "proof", "mobile", "distinctiveness", "buildability", "truth"];
const visualTerritoryTaxonomyVersion = "mobbin.visual-territories.v1";
const visualTerritories = [
  { id: "minimalist", label: "Minimalist" },
  { id: "brutalist-anti-design", label: "Brutalist / Anti-Design" },
  { id: "illustrative-playful", label: "Illustrative / Playful" },
  { id: "retro-nostalgic", label: "Retro / Nostalgic" },
  { id: "typographic", label: "Typographic" },
  { id: "corporate-traditional", label: "Corporate / Traditional" },
  { id: "ecommerce-retail", label: "E-Commerce / Retail" },
  { id: "editorial-magazine", label: "Editorial / Magazine" },
  { id: "immersive-cinematic", label: "Immersive / Cinematic" },
  { id: "one-page-parallax", label: "One-Page / Parallax" },
  { id: "dark-mode", label: "Dark Mode" },
  { id: "craft-handmade", label: "Craft / Handmade" },
  { id: "clinical-regulated", label: "Clinical / Regulated" },
  { id: "luxury-hospitality", label: "Luxury / Hospitality" },
  { id: "utility-conversion-first", label: "Utility / Conversion-First" },
  { id: "local-place-led", label: "Local / Place-Led" },
  { id: "proof-led-data-led", label: "Proof-Led / Data-Led" }
];
const visualTerritoryIds = new Set(visualTerritories.map((territory) => territory.id));
const previewScoreKeys = ["variability", "truth", "mobile", "commercialStrength"];
const validBusinessModels = new Set(["service", "product", "hybrid"]);
const validModes = new Set(["fixture", "real"]);
const validActions = new Set(["book", "call", "whatsapp", "quote", "enquire", "view-menu", "purchase", "order", "visit"]);
const ownerLedStatuses = new Set(["owner-led", "likely-owner-led", "fixture-owner-led"]);

function valueAfterArg(name) {
  const index = args.indexOf(name);
  return index >= 0 ? args[index + 1] : "";
}

function sha256(value) {
  return createHash("sha256").update(value).digest("hex");
}

function stableJson(value) {
  if (Array.isArray(value)) return `[${value.map(stableJson).join(",")}]`;
  if (value && typeof value === "object") {
    return `{${Object.keys(value).sort().map((key) => `${JSON.stringify(key)}:${stableJson(value[key])}`).join(",")}}`;
  }
  return JSON.stringify(value);
}

function hashObject(value) {
  return sha256(stableJson(value));
}

function rel(filePath) {
  return path.relative(root, filePath).replace(/\\/g, "/");
}

function readJson(filePath) {
  return JSON.parse(readFileSync(filePath, "utf8"));
}

function readJsonIfExists(filePath) {
  if (!existsSync(filePath)) return null;
  try {
    return readJson(filePath);
  } catch {
    return null;
  }
}

function unique(values) {
  return [...new Set(values.filter(Boolean))];
}

function arrayOf(value) {
  return Array.isArray(value) ? value : [];
}

function compact(value) {
  return String(value || "").trim();
}

function hasObject(value) {
  return Boolean(value && typeof value === "object" && !Array.isArray(value));
}

function isSpecificText(value) {
  const text = compact(value);
  if (text.length < 18) return false;
  return !/\b(example|sample|generic|placeholder|test business|lorem)\b/i.test(text);
}

function isBareVisualTerritoryName(value) {
  const text = compact(value).toLowerCase();
  if (!text) return false;
  return visualTerritories.some((territory) => text === territory.id || text === territory.label.toLowerCase());
}

function fileExistsFromRoot(value) {
  const text = compact(value);
  if (!text) return false;
  return existsSync(path.resolve(root, text));
}

function hashFileFromRoot(value) {
  const text = compact(value);
  if (!text) return "";
  const absolutePath = path.resolve(root, text);
  if (!existsSync(absolutePath)) return "";
  return sha256(readFileSync(absolutePath, "utf8"));
}

function asBusinesses(payload) {
  if (Array.isArray(payload)) return payload;
  return Array.isArray(payload?.businesses) ? payload.businesses : [];
}

function buildSearchBrief(business) {
  const existingQueries = arrayOf(business.mobbinSearchBrief?.queries);
  const queryByAngle = new Map(existingQueries.map((query) => [query.angle, query.query]));
  const queries = requiredQueryAngles.map((angle) => ({
    angle,
    query: compact(queryByAngle.get(angle)) || fallbackQueryFor(angle, business),
    mode: "deep",
    platform: "web",
    minimumRawCandidates: 12,
    targetRawCandidates: 20
  }));
  const brief = {
    schemaVersion: "mobbin.mobbin-search-brief.v1",
    businessId: business.id,
    businessName: business.businessName,
    businessModel: business.businessModel,
    category: business.category,
    subcategory: business.subcategory,
    targetCustomerDecision: business.targetCustomerDecision,
    primaryAction: business.primaryAction,
    sourceProvider: "Mobbin Pro MCP",
    platform: "web",
    requiredQueryAngles,
    requiredRawCandidates: { min: 12, max: 20 },
    requiredShortlist: { min: 6, max: 8 },
    requiredAntiReferences: 2,
    requiredIngredientLayers,
    collectionPolicy: {
      sourceCategory: "Mobbin Pro web platform / websites category",
      strategy: "wide-pull-then-compress",
      minimumReturnedScreensAcrossQueries: minimumRawPoolScreens,
      minimumUniqueRawPoolScreens,
      packetRawCandidates: { min: 12, max: 20 },
      recommendedChunkSize: 8,
      chunkRule: "Use repeated Mobbin MCP calls with exclude_screen_ids when one large pull times out; chunking is allowed, narrowing the search to save transcript space is not.",
      transcriptPolicy: "Save the full raw Mobbin metadata and links in raw-pull-log.json. The chat/report should show only counts, hashes, shortlist, and blockers."
    },
    queries,
    noCopyRules: [
      "Do not copy source brands, logos, product claims, trust claims, screenshots, or exact layouts.",
      "Do not use Mobbin reference proof as business proof.",
      "Every selected ingredient must map to this business job or a quality requirement."
    ]
  };
  return {
    ...brief,
    briefHash: hashObject(brief),
    businessHash: hashObject(business)
  };
}

function fallbackQueryFor(angle, business) {
  const base = `${business.subcategory} ${business.businessModel} marketing website homepage ${business.primaryAction} CTA`;
  if (angle === "niche") return `${business.category} ${base} landing page website inspiration`;
  if (angle === "page-job") return `${business.primaryAction} CTA homepage with trust proof, service or product menu, and local customer decision path website`;
  if (angle === "tone") return `premium credible owner-led ${business.businessModel} business landing page website`;
  return `${arrayOf(business.benchmarkConstraintTags).slice(0, 3).join(" ")} responsive mobile-first homepage website not dashboard not app`;
}

function validateBenchmarkSpread(businesses) {
  const failures = [];
  const count = businesses.length;
  const models = businesses.map((business) => business.businessModel);
  const categories = unique(businesses.map((business) => business.category));
  const subcategories = unique(businesses.map((business) => business.subcategory));
  const countries = unique(businesses.map((business) => business.country));
  const modelCounts = Object.fromEntries(["service", "product", "hybrid"].map((model) => [model, models.filter((value) => value === model).length]));
  const categoryCounts = new Map();
  for (const category of businesses.map((business) => business.category)) categoryCounts.set(category, (categoryCounts.get(category) || 0) + 1);
  const overusedCategories = [...categoryCounts.entries()].filter(([, value]) => value > 2).map(([key]) => key);

  if (count < 8 || count > 12) failures.push(`benchmark needs 8-12 relevant businesses, got ${count}`);
  if (categories.length < Math.min(7, count)) failures.push(`benchmark needs broad category spread, got ${categories.length} categories`);
  if (subcategories.length < count) failures.push("every benchmark business should have a distinct subcategory");
  if (countries.length < 4) failures.push(`benchmark needs international spread across at least 4 countries, got ${countries.length}`);
  if (modelCounts.service < 4) failures.push("benchmark needs at least 4 service-led businesses for the service-site benchmark set");
  if (modelCounts.product + modelCounts.hybrid < 2) failures.push("benchmark needs at least 2 product-led or hybrid businesses so the system does not overfit to services");
  if (overusedCategories.length) failures.push(`max 2 businesses per broad category; overused: ${overusedCategories.join(", ")}`);

  return {
    failures,
    spread: {
      businessCount: count,
      categories,
      subcategories,
      countries,
      modelCounts
    }
  };
}

function businessFailures(business, index) {
  const failures = [];
  for (const key of ["id", "mode", "businessName", "businessModel", "category", "subcategory", "city", "country", "market", "ownerLedStatus", "redesignOpportunity", "targetVisitor", "targetCustomerDecision", "primaryAction", "contactPath", "bookingOrEnquiryPath", "regulatedRisk", "relevanceReason", "status"]) {
    if (!compact(business[key])) failures.push(`business[${index}] missing ${key}`);
  }
  if (!validModes.has(business.mode)) failures.push(`${business.id || `business[${index}]`}: mode must be fixture or real`);
  if (!validBusinessModels.has(business.businessModel)) failures.push(`${business.id || `business[${index}]`}: businessModel must be service, product, or hybrid`);
  if (!ownerLedStatuses.has(business.ownerLedStatus)) failures.push(`${business.id || `business[${index}]`}: ownerLedStatus must be owner-led, likely-owner-led, or fixture-owner-led`);
  if (!validActions.has(business.primaryAction)) failures.push(`${business.id || `business[${index}]`}: unsupported primaryAction ${business.primaryAction}`);
  if (!hasObject(business.currentPresence) || Object.values(business.currentPresence || {}).filter(Boolean).length < 1) failures.push(`${business.id || `business[${index}]`}: currentPresence needs at least one website/social/listing URL or fixture note`);
  if (!isSpecificText(business.redesignOpportunity)) failures.push(`${business.id || `business[${index}]`}: redesignOpportunity must be specific`);
  if (!isSpecificText(business.targetCustomerDecision)) failures.push(`${business.id || `business[${index}]`}: targetCustomerDecision must be specific`);
  if (!isSpecificText(business.relevanceReason)) failures.push(`${business.id || `business[${index}]`}: relevanceReason must be specific`);
  if (arrayOf(business.offerings).length < 3 && arrayOf(business.services).length < 3 && arrayOf(business.products).length < 3) failures.push(`${business.id || `business[${index}]`}: needs at least 3 services/products/offerings`);
  if (arrayOf(business.groundingSignals).length < 3) failures.push(`${business.id || `business[${index}]`}: needs at least 3 groundingSignals`);
  if (arrayOf(business.allowedClaims).length < 1) failures.push(`${business.id || `business[${index}]`}: needs allowedClaims`);
  if (arrayOf(business.forbiddenClaims).length < 3) failures.push(`${business.id || `business[${index}]`}: needs at least 3 forbiddenClaims`);
  if (arrayOf(business.fixtureSourceNotes).length < 2 && arrayOf(business.sourceUrls).length < 2) failures.push(`${business.id || `business[${index}]`}: needs fixtureSourceNotes or sourceUrls`);
  if (arrayOf(business.benchmarkConstraintTags).length < 3) failures.push(`${business.id || `business[${index}]`}: needs at least 3 benchmarkConstraintTags`);
  if (!Number.isFinite(Number(business.priorityScore)) || Number(business.priorityScore) < 80) failures.push(`${business.id || `business[${index}]`}: priorityScore must be at least 80`);
  if (!hasObject(business.photoConstraint) && !hasObject(business.approvedPhotos)) failures.push(`${business.id || `business[${index}]`}: needs photoConstraint or approvedPhotos`);
  if (arrayOf(business.selectedReferenceIds).length || arrayOf(business.antiReferenceIds).length) failures.push(`${business.id || `business[${index}]`}: benchmark business must not hardcode Mobbin selectedReferenceIds or antiReferenceIds`);
  if (arrayOf(business.mobbinSearchBrief?.rawCandidateIds).length) failures.push(`${business.id || `business[${index}]`}: benchmark business must not hardcode Mobbin rawCandidateIds`);
  return failures;
}

function validateReferencePacket({ business, searchBrief, packet, packetPath }) {
  const failures = [];
  if (!packet) {
    return {
      status: "missing",
      packetPath: rel(packetPath),
      failures: [`${business.id}: missing fresh Mobbin reference packet at ${rel(packetPath)}`],
      rawPullLogPath: rel(path.join(path.dirname(packetPath), "raw-pull-log.json")),
      rawPullLogStatus: "missing",
      rawPoolReturnedCount: 0,
      rawPoolUniqueCount: 0,
      rawCandidateCount: 0,
      shortlistCount: 0,
      antiReferenceCount: 0,
      structureFamilies: [],
      layerCoverageCount: 0
    };
  }

  if (packet.schemaVersion !== "mobbin.mobbin-pro.per-redesign-reference-packet.v1") failures.push(`${business.id}: reference packet schemaVersion is invalid`);
  if (packet.sourceProvider !== "Mobbin Pro MCP") failures.push(`${business.id}: reference packet must be sourced from Mobbin Pro MCP`);
  if (packet.platform !== "web") failures.push(`${business.id}: reference packet platform must be web`);
  if (packet.businessId !== business.id) failures.push(`${business.id}: reference packet businessId mismatch`);
  if (packet.businessHash !== searchBrief.businessHash) failures.push(`${business.id}: reference packet businessHash is stale`);
  if (packet.searchBriefHash !== searchBrief.briefHash) failures.push(`${business.id}: reference packet searchBriefHash is stale`);
  const rawPullLogCheck = validateRawPullLog({ business, searchBrief, packet, packetPath });
  failures.push(...rawPullLogCheck.failures);

  const generatedAt = Date.parse(packet.generatedAt || "");
  const ageHours = Number.isFinite(generatedAt) ? (Date.now() - generatedAt) / 36e5 : Infinity;
  if (!Number.isFinite(generatedAt)) failures.push(`${business.id}: reference packet generatedAt is missing or invalid`);
  if (ageHours > maxReferenceAgeHours) failures.push(`${business.id}: reference packet is stale (${Number(ageHours.toFixed(1))}h old; max ${maxReferenceAgeHours}h)`);

  const queryLog = arrayOf(packet.queryLog);
  const queryAngles = unique(queryLog.map((entry) => entry.angle));
  if (queryLog.length < requiredQueryAngles.length) failures.push(`${business.id}: reference packet needs queryLog for all required query angles`);
  for (const angle of requiredQueryAngles) {
    if (!queryAngles.includes(angle)) failures.push(`${business.id}: reference packet missing query angle ${angle}`);
  }

  const rawCandidates = arrayOf(packet.rawCandidates);
  const rawIds = unique(rawCandidates.map(candidateIdFor));
  if (rawCandidates.length < 12 || rawCandidates.length > 20) failures.push(`${business.id}: reference packet needs 12-20 raw candidates, got ${rawCandidates.length}`);
  if (rawIds.length !== rawCandidates.length) failures.push(`${business.id}: raw candidates must be unique`);
  for (const candidate of rawCandidates) {
    if (!String(candidate.sourceUrl || candidate.mobbinUrl || "").startsWith("https://mobbin.com/screens/")) failures.push(`${business.id}: raw candidate ${candidateIdFor(candidate) || "unknown"} missing Mobbin URL`);
    if (rawPullLogCheck.rawPoolIds.size && !rawPullLogCheck.rawPoolIds.has(candidateIdFor(candidate))) failures.push(`${business.id}: raw candidate ${candidateIdFor(candidate) || "unknown"} is not present in the raw pull log`);
  }

  const shortlist = arrayOf(packet.shortlist);
  const shortlistIds = unique(shortlist.map(referenceIdFor));
  if (shortlist.length < 6 || shortlist.length > 8) failures.push(`${business.id}: reference packet needs 6-8 shortlisted references, got ${shortlist.length}`);
  if (shortlistIds.length !== shortlist.length) failures.push(`${business.id}: shortlisted references must be unique`);

  const antiReferences = arrayOf(packet.antiReferences);
  if (antiReferences.length < 2) failures.push(`${business.id}: reference packet needs at least 2 anti-references`);

  const structureFamilies = unique(shortlist.map((reference) => reference.structureFamily));
  if (structureFamilies.length < 2) failures.push(`${business.id}: shortlist needs at least 2 structure families`);

  const layerCoverage = new Set(shortlist.flatMap((reference) => arrayOf(reference.ingredientLedger).map((entry) => entry.layer)));
  const missingLayers = requiredIngredientLayers.filter((layer) => !layerCoverage.has(layer));
  if (missingLayers.length) failures.push(`${business.id}: shortlist ingredient ledger is missing layers: ${missingLayers.join(", ")}`);

  const lowFit = shortlist.flatMap((reference) => {
    const scores = reference.fitScores || {};
    return fitScoreKeys
      .filter((key) => !Number.isFinite(Number(scores[key])) || Number(scores[key]) < 7)
      .map((key) => `${referenceIdFor(reference) || "unknown"}:${key}`);
  });
  if (lowFit.length) failures.push(`${business.id}: shortlisted fit scores below 7 or missing: ${lowFit.join(", ")}`);

  const weakIngredients = shortlist
    .filter((reference) => arrayOf(reference.ingredientLedger).length < 3 || arrayOf(reference.bannedUses).length < 1)
    .map(referenceIdFor);
  if (weakIngredients.length) failures.push(`${business.id}: shortlisted references need ingredient ledgers and banned uses: ${weakIngredients.join(", ")}`);

  return {
    status: failures.length ? "blocked" : "pass",
    packetPath: rel(packetPath),
    failures,
    generatedAt: packet.generatedAt || "",
    ageHours: Number.isFinite(ageHours) ? Number(ageHours.toFixed(2)) : null,
    rawPullLogPath: rawPullLogCheck.rawPullLogPath,
    rawPullLogStatus: rawPullLogCheck.status,
    rawPoolReturnedCount: rawPullLogCheck.totalReturned,
    rawPoolUniqueCount: rawPullLogCheck.uniqueScreenCount,
    rawCandidateCount: rawCandidates.length,
    shortlistCount: shortlist.length,
    antiReferenceCount: antiReferences.length,
    structureFamilies,
    layerCoverageCount: layerCoverage.size
  };
}

function validateRawPullLog({ business, searchBrief, packet, packetPath }) {
  const failures = [];
  const rawPullLogPath = compact(packet.rawPullLogPath);
  if (!rawPullLogPath) failures.push(`${business.id}: reference packet missing rawPullLogPath`);

  const absolutePath = rawPullLogPath
    ? path.resolve(root, rawPullLogPath)
    : path.join(path.dirname(packetPath), "raw-pull-log.json");
  const rawPullLog = readJsonIfExists(absolutePath);
  if (!rawPullLog) {
    failures.push(`${business.id}: missing raw Mobbin pull log at ${rel(absolutePath)}`);
    return {
      status: "missing",
      failures,
      rawPullLogPath: rel(absolutePath),
      totalReturned: 0,
      uniqueScreenCount: 0,
      rawPoolIds: new Set()
    };
  }

  const rawPullLogText = readFileSync(absolutePath, "utf8");
  if (packet.rawPullLogHash !== sha256(rawPullLogText)) failures.push(`${business.id}: rawPullLogHash does not match raw-pull-log.json`);
  if (rawPullLog.schemaVersion !== "mobbin.mobbin-pro.raw-pull-log.v1") failures.push(`${business.id}: raw pull log schemaVersion is invalid`);
  if (rawPullLog.sourceProvider !== "Mobbin Pro MCP") failures.push(`${business.id}: raw pull log must be sourced from Mobbin Pro MCP`);
  if (rawPullLog.platform !== "web") failures.push(`${business.id}: raw pull log platform must be web`);
  if (rawPullLog.businessId !== business.id) failures.push(`${business.id}: raw pull log businessId mismatch`);
  if (rawPullLog.businessHash !== searchBrief.businessHash) failures.push(`${business.id}: raw pull log businessHash is stale`);
  if (rawPullLog.searchBriefHash !== searchBrief.briefHash) failures.push(`${business.id}: raw pull log searchBriefHash is stale`);

  const queryRuns = arrayOf(rawPullLog.queryRuns);
  const queryAngles = unique(queryRuns.map((entry) => entry.angle));
  for (const angle of requiredQueryAngles) {
    if (!queryAngles.includes(angle)) failures.push(`${business.id}: raw pull log missing query angle ${angle}`);
  }

  const entriesFromRuns = queryRuns.flatMap((run) => [
    ...arrayOf(run.results),
    ...arrayOf(run.screens),
    ...arrayOf(run.returnedScreens),
    ...arrayOf(run.resultIds).map((id) => ({ screenId: id }))
  ]);
  const entriesFromPool = [
    ...arrayOf(rawPullLog.rawCandidates),
    ...arrayOf(rawPullLog.candidates),
    ...arrayOf(rawPullLog.allCandidates),
    ...arrayOf(rawPullLog.rawPool)
  ];
  const allEntries = [...entriesFromRuns, ...entriesFromPool];
  const totalReturned = Number(rawPullLog.totalReturned) || queryRuns.reduce((sum, run) => {
    const runResults = [
      ...arrayOf(run.results),
      ...arrayOf(run.screens),
      ...arrayOf(run.returnedScreens),
      ...arrayOf(run.resultIds)
    ];
    return sum + (Number(run.returnedCount) || runResults.length);
  }, 0) || allEntries.length;
  const rawPoolIds = new Set(unique(allEntries.map(candidateIdFor)));

  if (queryRuns.length < requiredQueryAngles.length) failures.push(`${business.id}: raw pull log needs at least one run per required query angle`);
  if (totalReturned < minimumRawPoolScreens) failures.push(`${business.id}: raw pull log needs at least ${minimumRawPoolScreens} returned screens across the wide pull, got ${totalReturned}`);
  if (rawPoolIds.size < minimumUniqueRawPoolScreens) failures.push(`${business.id}: raw pull log needs at least ${minimumUniqueRawPoolScreens} unique screens, got ${rawPoolIds.size}`);

  return {
    status: failures.length ? "blocked" : "pass",
    failures,
    rawPullLogPath: rel(absolutePath),
    totalReturned,
    uniqueScreenCount: rawPoolIds.size,
    rawPoolIds
  };
}

function referenceIdFor(reference = {}) {
  return compact(reference.referenceId || reference.id || reference.screenId || reference.sourceUrl);
}

function candidateIdFor(candidate = {}) {
  return compact(candidate.candidateId || candidate.id || candidate.screenId || candidate.sourceUrl || candidate.mobbinUrl);
}

function validateReferenceSelectionDiversity(packetResults) {
  const signatures = new Map();
  for (const result of packetResults) {
    const packet = result.packet;
    if (!packet || result.packetCheck.status !== "pass") continue;
    const signature = arrayOf(packet.shortlist).map(referenceIdFor).sort().join("|");
    if (!signature) continue;
    if (!signatures.has(signature)) signatures.set(signature, []);
    signatures.get(signature).push(result.business.id);
  }
  const failures = [...signatures.entries()]
    .filter(([, ids]) => ids.length > 2)
    .map(([, ids]) => `no more than 2 businesses may share the same fresh Mobbin shortlist; shared by ${ids.join(", ")}`);
  return {
    failures,
    distinctSignatures: signatures.size
  };
}

function validateDirectionPacket({ business, searchBrief, directionPacket, directionPacketPath, referencePacketPath }) {
  const failures = [];
  if (!directionPacket) {
    return {
      status: "missing",
      directionPacketPath: rel(directionPacketPath),
      failures: [`${business.id}: missing visual-territory exploration and Mobbin-backed finalist concepts at ${rel(directionPacketPath)}`],
      exploredTerritoryCount: 0,
      directionCount: 0,
      conceptImageCount: 0,
      chosenDirection: "",
      visualTerritories: []
    };
  }

  if (directionPacket.schemaVersion !== "mobbin.mobbin-pro.visual-territory-direction-packet.v1") failures.push(`${business.id}: direction packet schemaVersion is invalid`);
  if (directionPacket.sourceProvider !== "Mobbin Pro MCP") failures.push(`${business.id}: direction packet must be sourced from Mobbin Pro MCP`);
  if (directionPacket.platform !== "web") failures.push(`${business.id}: direction packet platform must be web`);
  if (directionPacket.businessId !== business.id) failures.push(`${business.id}: direction packet businessId mismatch`);
  if (directionPacket.businessHash !== searchBrief.businessHash) failures.push(`${business.id}: direction packet businessHash is stale`);
  if (directionPacket.searchBriefHash !== searchBrief.briefHash) failures.push(`${business.id}: direction packet searchBriefHash is stale`);

  const expectedReferencePacketPath = rel(referencePacketPath);
  if (compact(directionPacket.referencePacketPath) !== expectedReferencePacketPath) failures.push(`${business.id}: direction packet referencePacketPath mismatch`);
  const referencePacketHash = hashFileFromRoot(expectedReferencePacketPath);
  if (!referencePacketHash || directionPacket.referencePacketHash !== referencePacketHash) failures.push(`${business.id}: direction packet referencePacketHash does not match current reference packet`);

  if (directionPacket.visualTerritoryTaxonomyVersion !== visualTerritoryTaxonomyVersion) failures.push(`${business.id}: direction packet visualTerritoryTaxonomyVersion is invalid`);
  const exploredTerritories = arrayOf(directionPacket.exploredTerritories);
  if (exploredTerritories.length < 6 || exploredTerritories.length > 8) failures.push(`${business.id}: direction packet needs 6-8 explored visual territories, got ${exploredTerritories.length}`);
  const exploredIds = unique(exploredTerritories.map((territory) => compact(territory.territoryId)));
  if (exploredIds.length !== exploredTerritories.length) failures.push(`${business.id}: explored visual territories must be unique`);
  for (const territory of exploredTerritories) {
    const territoryId = compact(territory.territoryId);
    if (!visualTerritoryIds.has(territoryId)) failures.push(`${business.id}: unknown explored visual territory ${territoryId || "missing"}`);
    if (!isSpecificText(territory.businessSpecificName)) failures.push(`${business.id}: explored territory ${territoryId || "unknown"} needs a business-specific name`);
    if (!isSpecificText(territory.fitReason)) failures.push(`${business.id}: explored territory ${territoryId || "unknown"} needs a specific fitReason`);
    if (!["shortlisted", "rejected"].includes(compact(territory.status))) failures.push(`${business.id}: explored territory ${territoryId || "unknown"} must be shortlisted or rejected`);
    if (!Number.isFinite(Number(territory.fitScore)) || Number(territory.fitScore) < 1 || Number(territory.fitScore) > 10) failures.push(`${business.id}: explored territory ${territoryId || "unknown"} needs fitScore 1-10`);
  }

  const directions = arrayOf(directionPacket.directions);
  const directionIds = unique(directions.map((direction) => compact(direction.directionId || direction.direction)));
  if (directions.length < 3 || directions.length > 4) failures.push(`${business.id}: direction packet needs 3-4 screenshot-level finalist concepts, got ${directions.length}`);
  if (directionIds.length !== directions.length) failures.push(`${business.id}: finalist concept directions must be unique`);

  let conceptImageCount = 0;
  for (const direction of directions) {
    const name = compact(direction.directionName || direction.businessSpecificName || direction.direction || direction.directionId) || "unknown";
    const directionId = compact(direction.directionId || direction.direction);
    if (!directionId) failures.push(`${business.id}: direction ${name} needs directionId`);
    if (!isSpecificText(name) || isBareVisualTerritoryName(name)) failures.push(`${business.id}: direction ${name} needs a business-specific name, not a generic style label`);
    const directionTerritories = arrayOf(direction.visualTerritories);
    if (directionTerritories.length < 1 || directionTerritories.length > 3) failures.push(`${business.id}: direction ${name} needs 1-3 visualTerritories`);
    for (const territoryId of directionTerritories) {
      if (!visualTerritoryIds.has(compact(territoryId))) failures.push(`${business.id}: direction ${name} uses unknown visual territory ${territoryId}`);
    }
    if (directionTerritories.some((territoryId) => !exploredIds.includes(compact(territoryId)))) failures.push(`${business.id}: direction ${name} uses a territory that was not explored`);
    if (!isSpecificText(direction.jobStructure)) failures.push(`${business.id}: direction ${name} needs a jobStructure tying the territory to the visitor decision`);
    if (!isSpecificText(direction.ownerWouldPayBecause)) failures.push(`${business.id}: direction ${name} needs a specific ownerWouldPayBecause`);
    if (!isSpecificText(direction.materiallyDifferentBecause)) failures.push(`${business.id}: direction ${name} needs a specific materiallyDifferentBecause`);
    if (!Number.isFinite(Number(direction.score)) || Number(direction.score) < 8) failures.push(`${business.id}: direction ${name} needs score >= 8`);
    if (arrayOf(direction.referenceInputs).length < 3) failures.push(`${business.id}: direction ${name} needs at least 3 referenceInputs`);
    if (arrayOf(direction.antiReferenceInputs).length < 1) failures.push(`${business.id}: direction ${name} needs at least 1 antiReferenceInput`);
    if (arrayOf(direction.selectedIngredients).length < 6) failures.push(`${business.id}: direction ${name} needs at least 6 selectedIngredients`);
    if (arrayOf(direction.rejectedIngredients).length < 3) failures.push(`${business.id}: direction ${name} needs at least 3 rejectedIngredients`);
    if (!fileExistsFromRoot(direction.desktopFirstViewportPath)) failures.push(`${business.id}: direction ${name} missing desktop first-viewport concept image`);
    else conceptImageCount += 1;
    if (!fileExistsFromRoot(direction.mobileFirstTwoScreensPath)) failures.push(`${business.id}: direction ${name} missing mobile first-two-screens concept image`);
    else conceptImageCount += 1;
  }

  const chosenDirection = compact(directionPacket.chosenDirectionId || directionPacket.chosenDirection);
  if (!directionIds.includes(chosenDirection)) failures.push(`${business.id}: direction packet needs chosenDirectionId matching a finalist concept`);
  const rejectedDirections = arrayOf(directionPacket.rejectedDirections);
  if (rejectedDirections.length < 2) failures.push(`${business.id}: direction packet needs two rejected directions with reasons`);
  for (const rejected of rejectedDirections) {
    if (!directionIds.includes(compact(rejected.directionId || rejected.direction)) || !isSpecificText(rejected.reason)) failures.push(`${business.id}: rejected direction needs valid directionId and specific reason`);
  }

  return {
    status: failures.length ? "blocked" : "pass",
    directionPacketPath: rel(directionPacketPath),
    failures,
    exploredTerritoryCount: exploredTerritories.length,
    directionCount: directions.length,
    conceptImageCount,
    chosenDirection,
    visualTerritories: unique(directions.flatMap((direction) => arrayOf(direction.visualTerritories).map(compact)))
  };
}

function validatePreviewProof({ business, searchBrief, previewProof, previewProofPath, referencePacketPath, directionPacketPath }) {
  const failures = [];
  if (!previewProof) {
    return {
      status: "missing",
      previewProofPath: rel(previewProofPath),
      failures: [`${business.id}: missing rendered preview proof at ${rel(previewProofPath)}`],
      desktopScreenshotStatus: "missing",
      mobileScreenshotStatus: "missing",
      similarityStatus: "missing",
      humanApprovalStatus: "missing",
      qaStatus: "",
      scoreSummary: {}
    };
  }

  if (previewProof.schemaVersion !== "mobbin.mobbin-pro.preview-proof.v1") failures.push(`${business.id}: preview proof schemaVersion is invalid`);
  if (previewProof.sourceProvider !== "Mobbin Pro MCP") failures.push(`${business.id}: preview proof must be sourced from Mobbin Pro MCP`);
  if (previewProof.platform !== "web") failures.push(`${business.id}: preview proof platform must be web`);
  if (previewProof.businessId !== business.id) failures.push(`${business.id}: preview proof businessId mismatch`);
  if (previewProof.businessHash !== searchBrief.businessHash) failures.push(`${business.id}: preview proof businessHash is stale`);
  if (previewProof.searchBriefHash !== searchBrief.briefHash) failures.push(`${business.id}: preview proof searchBriefHash is stale`);
  if (!compact(previewProof.chosenDirectionId || previewProof.chosenDirection)) failures.push(`${business.id}: preview proof needs chosenDirectionId`);

  const expectedReferencePacketPath = rel(referencePacketPath);
  const expectedDirectionPacketPath = rel(directionPacketPath);
  if (compact(previewProof.referencePacketPath) !== expectedReferencePacketPath) failures.push(`${business.id}: preview proof referencePacketPath mismatch`);
  if (compact(previewProof.directionPacketPath) !== expectedDirectionPacketPath) failures.push(`${business.id}: preview proof directionPacketPath mismatch`);
  const referencePacketHash = hashFileFromRoot(expectedReferencePacketPath);
  const directionPacketHash = hashFileFromRoot(expectedDirectionPacketPath);
  if (!referencePacketHash || previewProof.referencePacketHash !== referencePacketHash) failures.push(`${business.id}: preview proof referencePacketHash does not match current reference packet`);
  if (!directionPacketHash || previewProof.directionPacketHash !== directionPacketHash) failures.push(`${business.id}: preview proof directionPacketHash does not match current direction packet`);

  const desktopScreenshotStatus = fileExistsFromRoot(previewProof.desktopScreenshotPath) ? "pass" : "missing";
  const mobileScreenshotStatus = fileExistsFromRoot(previewProof.mobileScreenshotPath) ? "pass" : "missing";
  if (desktopScreenshotStatus !== "pass") failures.push(`${business.id}: preview proof missing desktop screenshot`);
  if (mobileScreenshotStatus !== "pass") failures.push(`${business.id}: preview proof missing mobile screenshot`);

  const similarityStatus = compact(previewProof.similarityCheck?.status) || "missing";
  if (similarityStatus !== "pass") failures.push(`${business.id}: preview proof similarity check must pass`);
  const humanApprovalStatus = compact(previewProof.humanApproval?.status) || "missing";
  if (humanApprovalStatus !== "approved") failures.push(`${business.id}: preview proof needs human commercial-strength approval`);

  const scores = hasObject(previewProof.scores) ? previewProof.scores : {};
  for (const key of previewScoreKeys) {
    if (!Number.isFinite(Number(scores[key])) || Number(scores[key]) < 8) failures.push(`${business.id}: preview proof score ${key} must be >= 8`);
  }

  const qaStatus = compact(previewProof.qaStatus);
  if (!["send", "review"].includes(qaStatus)) failures.push(`${business.id}: preview proof qaStatus must be send or review for lab proof`);

  return {
    status: failures.length ? "blocked" : "pass",
    previewProofPath: rel(previewProofPath),
    failures,
    desktopScreenshotStatus,
    mobileScreenshotStatus,
    similarityStatus,
    humanApprovalStatus,
    qaStatus,
    scoreSummary: scores
  };
}

function buildBusinessPacket({ business, searchBrief, packetCheck, directionPacketCheck, previewProofCheck }) {
  const conceptTodo = [
    {
      step: "explore-visual-territories",
      status: "blocked",
      required: "explore 6-8 visual territories against the fresh Mobbin packet",
      minimumExploredTerritories: 6,
      maximumExploredTerritories: 8
    },
    {
      step: "shortlist-finalists",
      status: "blocked",
      required: "shortlist 3-4 business-specific screenshot-level finalists",
      minimumFinalists: 3,
      maximumFinalists: 4,
      minimumScore: 8
    },
    {
      step: "choose-winner",
      status: "blocked",
      required: "choose one finalist, reject the others with reasons, then write the build brief"
    }
  ];
  return {
    schemaVersion: "mobbin.design-system-proving-lab.business-packet.v2",
    businessId: business.id,
    businessName: business.businessName,
    businessModel: business.businessModel,
    category: business.category,
    subcategory: business.subcategory,
    relevanceReason: business.relevanceReason,
    targetCustomerDecision: business.targetCustomerDecision,
    searchBriefPath: `docs/evidence/design-system-proving-lab/search-briefs/${business.id}.json`,
    searchBriefHash: searchBrief.briefHash,
    referencePacketStatus: packetCheck.status,
    referencePacketPath: packetCheck.packetPath,
    rawPullLogPath: packetCheck.rawPullLogPath,
    rawPullLogStatus: packetCheck.rawPullLogStatus,
    rawPoolReturnedCount: packetCheck.rawPoolReturnedCount,
    rawPoolUniqueCount: packetCheck.rawPoolUniqueCount,
    referencePacketFailures: packetCheck.failures,
    directionPacketStatus: directionPacketCheck.status,
    directionPacketPath: directionPacketCheck.directionPacketPath,
    directionPacketFailures: directionPacketCheck.failures,
    exploredTerritoryCount: directionPacketCheck.exploredTerritoryCount,
    selectedVisualTerritories: directionPacketCheck.visualTerritories,
    chosenDirection: directionPacketCheck.chosenDirection,
    conceptImageCount: directionPacketCheck.conceptImageCount,
    previewProofStatus: previewProofCheck.status,
    previewProofPath: previewProofCheck.previewProofPath,
    previewProofFailures: previewProofCheck.failures,
    desktopScreenshotStatus: previewProofCheck.desktopScreenshotStatus,
    mobileScreenshotStatus: previewProofCheck.mobileScreenshotStatus,
    similarityStatus: previewProofCheck.similarityStatus,
    humanApprovalStatus: previewProofCheck.humanApprovalStatus,
    conceptTodo,
    currentStatus: packetCheck.status !== "pass"
      ? "blocked-before-fresh-mobbin-reference-packet"
      : directionPacketCheck.status !== "pass"
        ? "blocked-before-concepts"
        : previewProofCheck.status !== "pass"
          ? "blocked-before-preview-proof"
          : "pass",
    externalUseAllowed: false,
    nextAction: packetCheck.status !== "pass"
      ? "Pull fresh Mobbin Pro references for this business and save a per-redesign reference packet before concepting."
      : directionPacketCheck.status !== "pass"
        ? "Explore 6-8 visual territories, shortlist 3-4 business-specific screenshot-level finalists, and save direction-packet.json."
        : previewProofCheck.status !== "pass"
          ? "Build the chosen direction, attach desktop/mobile screenshots, run similarity and score checks, then attach human approval."
          : "Candidate proof packet is complete; external use still depends on the release policy for this surface."
  };
}

async function writeBusinessArtifacts(items) {
  await fs.mkdir(searchBriefRoot, { recursive: true });
  for (const item of items) {
    await fs.writeFile(path.join(searchBriefRoot, `${item.business.id}.json`), `${JSON.stringify(item.searchBrief, null, 2)}\n`);
    await fs.writeFile(path.join(searchBriefRoot, `${item.business.id}.mobbin-todo.md`), renderMobbinTodo(item));

    const packetRoot = path.join(evidenceRoot, "business-packets", item.business.id);
    await fs.mkdir(packetRoot, { recursive: true });
    await fs.writeFile(path.join(packetRoot, "business-packet.json"), `${JSON.stringify(item.businessPacket, null, 2)}\n`);
    await fs.writeFile(path.join(packetRoot, "approval-packet.todo.md"), renderBusinessTodo(item.businessPacket));
  }
}

function renderMobbinTodo({ business, searchBrief }) {
  return `# ${business.businessName} Mobbin Search TODO

Business: ${business.businessName}
Business model: ${business.businessModel}
Target decision: ${business.targetCustomerDecision}
Raw pull log path: \`docs/evidence/design-system-proving-lab/reference-runs/latest/${business.id}/raw-pull-log.json\`
Reference packet path: \`docs/evidence/design-system-proving-lab/reference-runs/latest/${business.id}/reference-packet.json\`

## Run These Fresh In Mobbin Pro MCP

${searchBrief.queries.map((query) => `- ${query.angle}: ${query.query}`).join("\n")}

## Packet Requirements

- Save the full raw Mobbin metadata locally first; do not use the chat transcript as the evidence store.
- Use repeated chunks with \`exclude_screen_ids\` if a single large pull times out.
- Pull broadly until the raw log has at least ${minimumRawPoolScreens} returned screens and ${minimumUniqueRawPoolScreens} unique screens.
- 12-20 raw candidates
- 6-8 shortlisted references
- 2+ anti-references
- query log with timestamps
- fit scores of 7+ for job, niche, first viewport, CTA, proof, mobile, distinctiveness, buildability, truth
- ingredient ledger covering all required layers
- stale after ${maxReferenceAgeHours} hours

Do not reuse an old packet when the business, search brief, or timestamp changes.
`;
}

function renderBusinessTodo(packet) {
  return `# ${packet.businessName} Proving-Lab Packet TODO

Status: ${packet.currentStatus}
External use allowed: no
Raw Mobbin pull log: ${packet.rawPullLogPath}
Raw pool: ${packet.rawPoolReturnedCount} returned / ${packet.rawPoolUniqueCount} unique

## Why This Business Is In The Lab

${packet.relevanceReason}

## Visitor Decision

${packet.targetCustomerDecision}

## Required Next Evidence

- [ ] Fresh per-redesign Mobbin Pro reference packet
- [ ] Explore 6-8 visual territories from the approved taxonomy
- [ ] Shortlist 3-4 business-specific screenshot-level finalists
- [ ] Chosen finalist with rejected alternatives
- [ ] Desktop screenshot
- [ ] Mobile first-two-screens screenshot
- [ ] Similarity check against the benchmark set
- [ ] Accessibility, performance, content, and truth checks
- [ ] Human commercial-strength approval

## Current Reference Packet Status

${packet.referencePacketStatus}

${packet.referencePacketFailures.map((failure) => `- ${failure}`).join("\n") || "- Fresh Mobbin packet is present."}

## Current Direction Packet Status

${packet.directionPacketStatus}

${packet.directionPacketFailures.map((failure) => `- ${failure}`).join("\n") || "- Visual territory exploration and finalist concepts are present."}

## Current Preview Proof Status

${packet.previewProofStatus}

${packet.previewProofFailures.map((failure) => `- ${failure}`).join("\n") || "- Rendered preview proof is present."}
`;
}

function renderReportMarkdown(report) {
  const lines = [
    "# Mobbin Proving Lab Design-System Proving Lab",
    "",
    `Generated: ${report.generatedAt}`,
    `Setup status: ${report.setupStatus}`,
    `Lab status: ${report.labStatus}`,
    `External use allowed: ${report.externalUseAllowed ? "yes" : "no"}`,
    "",
    "## Benchmark",
    "",
    `- Businesses: ${report.spread.businessCount}`,
    `- Business models: service ${report.spread.modelCounts.service}, product ${report.spread.modelCounts.product}, hybrid ${report.spread.modelCounts.hybrid}`,
    `- Categories: ${report.spread.categories.join(", ")}`,
    `- Countries: ${report.spread.countries.join(", ")}`,
    "",
    "## Fresh Mobbin Packets",
    "",
    `- Reference run: ${report.referenceRunPath}`,
    `- Max age: ${report.maxReferenceAgeHours} hours`,
    `- Minimum wide raw pull: ${report.minimumRawPoolScreens} returned screens, ${report.minimumUniqueRawPoolScreens} unique screens`,
    `- Missing: ${report.referencePacketSummary.missing}`,
    `- Blocked/stale: ${report.referencePacketSummary.blocked}`,
    `- Pass: ${report.referencePacketSummary.pass}`,
    `- Distinct passing shortlists: ${report.referenceSelectionDiversity.distinctSignatures}`,
    "",
    "## Direction Packets",
    "",
    `- Territory taxonomy: ${report.visualTerritoryTaxonomyVersion}`,
    `- Valid territories: ${report.visualTerritories.map((territory) => territory.label).join("; ")}`,
    `- Missing: ${report.directionPacketSummary.missing}`,
    `- Blocked/incomplete: ${report.directionPacketSummary.blocked}`,
    `- Pass: ${report.directionPacketSummary.pass}`,
    "",
    "## Preview Proof",
    "",
    `- Missing: ${report.previewProofSummary.missing}`,
    `- Blocked/incomplete: ${report.previewProofSummary.blocked}`,
    `- Pass: ${report.previewProofSummary.pass}`,
    `- Desktop screenshots: ${report.previewProofSummary.desktopScreenshots}`,
    `- Mobile screenshots: ${report.previewProofSummary.mobileScreenshots}`,
    `- Similarity passed: ${report.previewProofSummary.similarityPassed}`,
    `- Human approved: ${report.previewProofSummary.humanApproved}`,
    "",
    "## Blockers",
    ""
  ];
  for (const blocker of report.trustBlockers) lines.push(`- ${blocker}`);
  lines.push("", "## Businesses", "");
  for (const business of report.businesses) {
    lines.push(`- ${business.status === "pass" ? "PASS" : "BLOCKED"} ${business.id}: ${business.businessName} (${business.businessModel}, ${business.subcategory})`);
    lines.push(`  - Reference packet: ${business.referencePacketStatus}`);
    lines.push(`  - Direction packet: ${business.directionPacketStatus}`);
    lines.push(`  - Territories explored: ${business.exploredTerritoryCount || 0}`);
    lines.push(`  - Finalists: ${business.directionCount || 0}`);
    lines.push(`  - Preview proof: ${business.previewProofStatus}`);
    lines.push(`  - Raw pool: ${business.rawPoolReturnedCount} returned / ${business.rawPoolUniqueCount} unique`);
    for (const blocker of business.failures.slice(0, 3)) lines.push(`  - ${blocker}`);
    for (const blocker of business.referencePacketFailures.slice(0, 2)) lines.push(`  - ${blocker}`);
    for (const blocker of business.directionPacketFailures.slice(0, 2)) lines.push(`  - ${blocker}`);
    for (const blocker of business.previewProofFailures.slice(0, 2)) lines.push(`  - ${blocker}`);
  }
  lines.push("", "This report does not approve any output for public use. It only proves the lab contract and names the missing proof.");
  return `${lines.join("\n")}\n`;
}

async function main() {
  if (!existsSync(benchmarkPath)) throw new Error(`Missing benchmark fixture file: ${rel(benchmarkPath)}`);

  const benchmarkPayload = readJson(benchmarkPath);
  const businesses = asBusinesses(benchmarkPayload);
  const spreadResult = validateBenchmarkSpread(businesses);

  const items = businesses.map((business, index) => {
    const searchBrief = buildSearchBrief(business);
    const packetPath = path.join(referenceRunRoot, business.id, "reference-packet.json");
    const packet = readJsonIfExists(packetPath);
    const packetCheck = validateReferencePacket({ business, searchBrief, packet, packetPath });
    const businessPacketRoot = path.join(evidenceRoot, "business-packets", business.id);
    const directionPacketPath = path.join(businessPacketRoot, "direction-packet.json");
    const directionPacket = readJsonIfExists(directionPacketPath);
    const directionPacketCheck = validateDirectionPacket({ business, searchBrief, directionPacket, directionPacketPath, referencePacketPath: packetPath });
    const previewProofPath = path.join(businessPacketRoot, "preview-proof.json");
    const previewProof = readJsonIfExists(previewProofPath);
    const previewProofCheck = validatePreviewProof({ business, searchBrief, previewProof, previewProofPath, referencePacketPath: packetPath, directionPacketPath });
    const businessSchemaFailures = businessFailures(business, index);
    return {
      business,
      searchBrief,
      packet,
      packetCheck,
      directionPacket,
      directionPacketCheck,
      previewProof,
      previewProofCheck,
      businessPacket: null,
      businessSchemaFailures
    };
  });

  const referenceSelectionDiversity = validateReferenceSelectionDiversity(items);
  for (const item of items) item.businessPacket = buildBusinessPacket(item);

  const benchmarkFailures = [
    ...spreadResult.failures,
    ...items.flatMap((item) => item.businessSchemaFailures)
  ];
  const referencePacketFailures = [
    ...items.flatMap((item) => item.packetCheck.failures),
    ...referenceSelectionDiversity.failures
  ];
  const directionPacketFailures = items.flatMap((item) => item.directionPacketCheck.failures);
  const previewProofFailures = items.flatMap((item) => item.previewProofCheck.failures);
  const packetCounts = items.reduce((counts, item) => {
    counts[item.packetCheck.status] = (counts[item.packetCheck.status] || 0) + 1;
    return counts;
  }, { missing: 0, blocked: 0, pass: 0 });
  const directionPacketCounts = items.reduce((counts, item) => {
    counts[item.directionPacketCheck.status] = (counts[item.directionPacketCheck.status] || 0) + 1;
    return counts;
  }, { missing: 0, blocked: 0, pass: 0 });
  const previewProofCounts = items.reduce((counts, item) => {
    counts[item.previewProofCheck.status] = (counts[item.previewProofCheck.status] || 0) + 1;
    return counts;
  }, { missing: 0, blocked: 0, pass: 0 });

  const labStatus = benchmarkFailures.length
    ? "invalid-benchmark"
    : referencePacketFailures.length
      ? "blocked-before-fresh-mobbin-reference-packets"
      : directionPacketFailures.length
        ? "blocked-before-concepts"
        : previewProofFailures.length
          ? "blocked-before-preview-proof"
          : "pass";

  const trustBlockers = [
    ...(referencePacketFailures.length ? ["Fresh per-business Mobbin Pro reference packets are missing, stale, or incomplete."] : []),
    ...(directionPacketFailures.length ? ["Visual territory exploration or Mobbin-backed screenshot-level finalist concepts are missing or incomplete."] : []),
    ...(previewProofFailures.length ? [
      "Rendered desktop/mobile preview screenshots, score checks, similarity checks, or human approval are missing or incomplete."
    ] : []),
    ...(labStatus !== "pass" ? ["External/public/outreach use remains blocked until the proof packet passes."] : [])
  ];

  const report = {
    schemaVersion: "mobbin.design-system-proving-lab.report.v2",
    generatedAt: new Date().toISOString(),
    setupStatus: benchmarkFailures.length ? "fail" : "pass",
    labStatus,
    externalUseAllowed: false,
    readyMode,
    dryRun,
    benchmarkPath: rel(benchmarkPath),
    benchmarkHash: sha256(readFileSync(benchmarkPath)),
    referenceRunPath: rel(referenceRunRoot),
    maxReferenceAgeHours,
    minimumRawPoolScreens,
    minimumUniqueRawPoolScreens,
    spread: spreadResult.spread,
    requiredIngredientLayers,
    referencePacketSummary: {
      missing: packetCounts.missing || 0,
      blocked: packetCounts.blocked || 0,
      pass: packetCounts.pass || 0
    },
    directionPacketSummary: {
      missing: directionPacketCounts.missing || 0,
      blocked: directionPacketCounts.blocked || 0,
      pass: directionPacketCounts.pass || 0
    },
    previewProofSummary: {
      missing: previewProofCounts.missing || 0,
      blocked: previewProofCounts.blocked || 0,
      pass: previewProofCounts.pass || 0,
      humanApproved: items.filter((item) => item.previewProofCheck.humanApprovalStatus === "approved").length,
      similarityPassed: items.filter((item) => item.previewProofCheck.similarityStatus === "pass").length,
      desktopScreenshots: items.filter((item) => item.previewProofCheck.desktopScreenshotStatus === "pass").length,
      mobileScreenshots: items.filter((item) => item.previewProofCheck.mobileScreenshotStatus === "pass").length
    },
    referenceSelectionDiversity: {
      distinctSignatures: referenceSelectionDiversity.distinctSignatures,
      maxAllowedBusinessesPerSignature: 2
    },
    visualTerritoryTaxonomyVersion,
    visualTerritories,
    trustBlockers,
    benchmarkFailures,
    referencePacketFailures,
    directionPacketFailures,
    previewProofFailures,
    businesses: items.map((item) => ({
      id: item.business.id,
      businessName: item.business.businessName,
      businessModel: item.business.businessModel,
      category: item.business.category,
      subcategory: item.business.subcategory,
      status: item.businessSchemaFailures.length ? "blocked" : "pass",
      failures: item.businessSchemaFailures,
      searchBriefPath: `docs/evidence/design-system-proving-lab/search-briefs/${item.business.id}.json`,
      referencePacketStatus: item.packetCheck.status,
      referencePacketPath: item.packetCheck.packetPath,
      rawPullLogStatus: item.packetCheck.rawPullLogStatus,
      rawPullLogPath: item.packetCheck.rawPullLogPath,
      rawPoolReturnedCount: item.packetCheck.rawPoolReturnedCount,
      rawPoolUniqueCount: item.packetCheck.rawPoolUniqueCount,
      referencePacketFailures: item.packetCheck.failures,
      rawCandidateCount: item.packetCheck.rawCandidateCount,
      shortlistCount: item.packetCheck.shortlistCount,
      antiReferenceCount: item.packetCheck.antiReferenceCount,
      directionPacketStatus: item.directionPacketCheck.status,
      directionPacketPath: item.directionPacketCheck.directionPacketPath,
      directionPacketFailures: item.directionPacketCheck.failures,
      exploredTerritoryCount: item.directionPacketCheck.exploredTerritoryCount,
      selectedVisualTerritories: item.directionPacketCheck.visualTerritories,
      directionCount: item.directionPacketCheck.directionCount,
      conceptImageCount: item.directionPacketCheck.conceptImageCount,
      chosenDirection: item.directionPacketCheck.chosenDirection,
      previewProofStatus: item.previewProofCheck.status,
      previewProofPath: item.previewProofCheck.previewProofPath,
      previewProofFailures: item.previewProofCheck.failures,
      desktopScreenshotStatus: item.previewProofCheck.desktopScreenshotStatus,
      mobileScreenshotStatus: item.previewProofCheck.mobileScreenshotStatus,
      similarityStatus: item.previewProofCheck.similarityStatus,
      humanApprovalStatus: item.previewProofCheck.humanApprovalStatus,
      qaStatus: item.previewProofCheck.qaStatus
    })),
    businessPacketPaths: items.map((item) => `docs/evidence/design-system-proving-lab/business-packets/${item.business.id}/business-packet.json`)
  };

  if (!noWrite) {
    await fs.mkdir(evidenceRoot, { recursive: true });
    await writeBusinessArtifacts(items);
    await fs.writeFile(reportPath, `${JSON.stringify(report, null, 2)}\n`);
    await fs.writeFile(reportMdPath, renderReportMarkdown(report));
  }

  console.log(JSON.stringify({
    status: report.setupStatus,
    labStatus: report.labStatus,
    externalUseAllowed: report.externalUseAllowed,
    businessCount: businesses.length,
    productOrHybridCount: report.spread.modelCounts.product + report.spread.modelCounts.hybrid,
    minimumRawPoolScreens: report.minimumRawPoolScreens,
    minimumUniqueRawPoolScreens: report.minimumUniqueRawPoolScreens,
    missingReferencePacketCount: report.referencePacketSummary.missing,
    blockedReferencePacketCount: report.referencePacketSummary.blocked,
    passingReferencePacketCount: report.referencePacketSummary.pass,
    missingDirectionPacketCount: report.directionPacketSummary.missing,
    blockedDirectionPacketCount: report.directionPacketSummary.blocked,
    passingDirectionPacketCount: report.directionPacketSummary.pass,
    missingPreviewProofCount: report.previewProofSummary.missing,
    blockedPreviewProofCount: report.previewProofSummary.blocked,
    passingPreviewProofCount: report.previewProofSummary.pass,
    humanApprovedPreviewCount: report.previewProofSummary.humanApproved,
    trustBlockers: report.trustBlockers,
    reportPath: noWrite ? null : rel(reportPath)
  }, null, 2));

  if (report.setupStatus !== "pass") process.exit(1);
  if (readyMode) process.exit(1);
}

main().catch((error) => {
  console.error(JSON.stringify({
    status: "fail",
    error: error.message
  }, null, 2));
  process.exit(1);
});
