#!/usr/bin/env node
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { localIsoDate } from "./date-utils.mjs";
import { runCodeRepoJson, serviceRoot } from "./lib/runtime-roots.mjs";
import { resolveRepoPath } from "./lib/service-contract.mjs";

const args = process.argv.slice(2);
const clientArg = args.find((arg) => !arg.startsWith("--"));
const approveArg = args.find((arg) => arg.startsWith("--approve="));
const removeArg = args.find((arg) => arg.startsWith("--remove="));
const reviewerArg = args.find((arg) => arg.startsWith("--reviewer="));
const dateArg = args.find((arg) => arg.startsWith("--date="));
const dryRun = args.includes("--dry-run");

if (args.includes("--approve-scorecard")) {
  console.error("--approve-scorecard is retired; scorecards require the dedicated human review workflow.");
  process.exit(1);
}

if (!clientArg) {
  console.error("Usage: npm run client:proof-review -- clients/client-slug [--approve=1,2|all] [--remove=3] --reviewer=\"Name\" [--dry-run]");
  process.exit(1);
}

const clientPath = resolveRepoPath(serviceRoot, clientArg);

if (!existsSync(clientPath)) {
  console.error(`Client folder not found: ${clientPath}`);
  process.exit(1);
}

const today = dateArg ? dateArg.split("=").slice(1).join("=") : localIsoDate();
const reviewer = reviewerArg ? reviewerArg.split("=").slice(1).join("=").trim() : "";
const ledgerPath = join(clientPath, "quality/claim-proof-ledger.md");
const reviewPath = join(clientPath, "quality/claim-review.md");

function read(path) {
  return existsSync(path) ? readFileSync(path, "utf8") : "";
}

function write(path, content) {
  const dir = path.split("/").slice(0, -1).join("/");
  if (dir) mkdirSync(dir, { recursive: true });
  writeFileSync(path, content);
}

function tableRows(markdown) {
  return String(markdown || "")
    .split("\n")
    .map((line) => line.trim())
    .filter((line) => line.startsWith("|") && line.endsWith("|"))
    .map((line) => line.split("|").slice(1, -1).map((cell) => cell.trim()))
    .filter((cells) => cells.some(Boolean) && !cells.every((cell) => /^:?-+:?$/.test(cell)));
}

function ledgerRows(markdown) {
  return tableRows(markdown)
    .filter((cells) => cells[0] && !/^Claim$/i.test(cells[0]))
    .map(([claim, source, proofType, approvedBy, status], index) => ({
      index: index + 1,
      claim,
      source,
      proofType,
      approvedBy,
      status
    }));
}

function reviewRows(markdown) {
  return tableRows(markdown)
    .filter((cells) => cells[0] && !/^#$/i.test(cells[0]) && !/^Claim$/i.test(cells[1] || ""))
    .map(([index, claim, source, proofType, sourceStatus, decision]) => ({
      index: Number(index),
      claim,
      source,
      proofType,
      sourceStatus,
      decision
    }));
}

function sourceStatusMap(markdown) {
  return new Map(reviewRows(markdown).map((row) => [row.claim, row.sourceStatus || "source-needs-review"]));
}

function sourceReady(status) {
  return /^(source-found|source-verified|source-reviewed|client-confirmed)$/i.test(String(status || "").trim());
}

function parseIndexes(value, count) {
  if (!value) return new Set();
  const raw = value.split("=").slice(1).join("=").trim();
  if (!raw) return new Set();
  if (/^all$/i.test(raw)) return new Set(Array.from({ length: count }, (_, index) => index + 1));
  const indexes = raw
    .split(",")
    .map((part) => Number(part.trim()))
    .filter((number) => Number.isInteger(number));
  return new Set(indexes);
}

function replaceSection(markdown, heading, replacement) {
  const escaped = heading.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const pattern = new RegExp(`## ${escaped}\\n[\\s\\S]*?(?=\\n## |$)`);
  if (!pattern.test(markdown)) return `${markdown.trimEnd()}\n\n## ${heading}\n\n${replacement.trim()}\n`;
  return markdown.replace(pattern, `## ${heading}\n\n${replacement.trim()}`);
}

function renderLedger(existing, rows) {
  const table = rows.map((row) => (
    `| ${row.claim} | ${row.source} | ${row.proofType} | ${row.approvedBy || ""} | ${row.status || "draft"} |`
  )).join("\n");

  return replaceSection(existing, "Ledger", [
    "| Claim | Source | Proof Type | Approved By | Status |",
    "|---|---|---|---|---|",
    table || "|  |  | review / analytics / client / public source / screenshot |  | draft |"
  ].join("\n"));
}

function renderReview(existing, rows) {
  if (!existing.trim()) return existing;
  const sourceStatuses = sourceStatusMap(existing);
  const table = rows.map((row) => {
    const sourceStatus = sourceStatuses.get(row.claim) || "source-needs-review";
    const decision = row.status === "approved"
      ? `approved by ${row.approvedBy} on ${today}`
      : row.status === "removed"
        ? `removed by ${row.approvedBy} on ${today}`
        : "approve / remove";
    return `| ${row.index} | ${row.claim} | ${row.source} | ${row.proofType} | ${sourceStatus} | ${decision} |`;
  }).join("\n");

  return replaceSection(existing, "Candidate Claims", [
    "| # | Claim | Source | Proof Type | Source Status | Owner Decision |",
    "|---:|---|---|---|---|---|",
    table
  ].join("\n"));
}

const ledger = read(ledgerPath);
if (!ledger.trim()) {
  console.error(`Missing claim ledger: ${ledgerPath}`);
  process.exit(1);
}

const review = read(reviewPath);
const reviewSourceStatuses = sourceStatusMap(review);
const rows = ledgerRows(ledger);
const approveIndexes = parseIndexes(approveArg, rows.length);
const removeIndexes = parseIndexes(removeArg, rows.length);
const mutating = approveIndexes.size > 0 || removeIndexes.size > 0;

if (mutating && !dryRun && !reviewer) {
  console.error("Proof review mutations require --reviewer=\"Name\".");
  process.exit(1);
}

for (const index of [...approveIndexes, ...removeIndexes]) {
  if (index < 1 || index > rows.length) {
    console.error(`Claim index out of range: ${index}. This client has ${rows.length} claim(s).`);
    process.exit(1);
  }
}

for (const index of approveIndexes) {
  if (removeIndexes.has(index)) {
    console.error(`Claim index ${index} cannot be approved and removed in the same run.`);
    process.exit(1);
  }
}

const unverifiedApprovals = rows
  .filter((row) => approveIndexes.has(row.index))
  .map((row) => ({
    ...row,
    sourceStatus: reviewSourceStatuses.get(row.claim) || "source-needs-review"
  }))
  .filter((row) => !sourceReady(row.sourceStatus));

if (unverifiedApprovals.length > 0) {
  console.error([
    "Cannot approve claim until source evidence is found or confirmed in claim-review.md.",
    ...unverifiedApprovals.map((row) => `#${row.index}: ${row.sourceStatus} - ${row.claim}`)
  ].join("\n"));
  process.exit(1);
}

const nextRows = rows.map((row) => {
  if (approveIndexes.has(row.index)) return { ...row, status: "approved", approvedBy: reviewer };
  if (removeIndexes.has(row.index)) return { ...row, status: "removed", approvedBy: reviewer };
  return row;
});

const approvedCount = nextRows.filter((row) => /^approved$/i.test(row.status || "")).length;
if (!dryRun && mutating) {
  write(ledgerPath, renderLedger(ledger, nextRows));
  if (review.trim()) write(reviewPath, renderReview(review, nextRows));

  for (const commandArgs of [
    ["scripts/export-client-delivery-cockpit.mjs", clientPath]
  ]) {
    runCodeRepoJson(commandArgs);
  }
}

const readiness = runCodeRepoJson(["scripts/check-client-readiness.mjs", clientPath]);
const claims = nextRows.map((row) => {
  const sourceStatus = reviewSourceStatuses.get(row.claim) || "source-needs-review";
  return {
    ...row,
    sourceStatus,
    sourceReady: sourceReady(sourceStatus)
  };
});

console.log(JSON.stringify({
  status: dryRun ? "dry-run" : mutating ? "updated" : "review-only",
  clientPath,
  approvedCount,
  removedCount: nextRows.filter((row) => /^removed$/i.test(row.status || "")).length,
  pendingCount: nextRows.filter((row) => !/^(approved|removed)$/i.test(row.status || "")).length,
  sourceReadyCount: claims.filter((row) => row.sourceReady).length,
  claims,
  readiness,
  next: readiness.status === "ready"
    ? "Client proof is ready."
    : "Fix remaining readiness warnings before client-facing handoff."
}, null, 2));
