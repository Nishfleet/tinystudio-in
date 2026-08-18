#!/usr/bin/env node
import { mkdirSync, writeFileSync } from "node:fs";
import { localIsoDate } from "./date-utils.mjs";
import { agencyConfig } from "./lib/agency-config.mjs";
import { handleHelp, resolveOutputPath } from "./lib/operator-cli.mjs";

handleHelp(process.argv.slice(2), `Usage: node scripts/export-proof-library.mjs [--output=growth-brain/ops/proof-library.md]`);
const outputArg = process.argv.find((arg) => arg.startsWith("--output="));
const outputPath = resolveOutputPath(outputArg?.split("=").slice(1).join("="), { fallback: "growth-brain/ops/proof-library.md" });
const today = localIsoDate();
const config = agencyConfig();

// Tracked proof never reads private workspaces and requires human sanitization.
const content = `# TinyStudio Proof And Learning Library

Generated: ${today}

This tracked file contains operating rules and approved product facts only. It never reads private prospect or client folders.

## Funnel Proof State

- Prospect-derived proof rows: excluded from tracked output
- Client-derived proof rows: excluded from tracked output

## Current Truth

- No private prospect or client evidence is exported here.
- Keep public claims limited to the approved product facts below until a separate human-approved sanitization workflow exists.

## Decision Rule

- If a public claim is not listed here or in an explicitly approved claim-proof ledger, do not use it.
- Never copy names, companies, websites, page URLs, statuses, notes, reports, measurements, or learnings from ignored workspaces into this tracked file.
- A reusable case study requires explicit client permission plus a human-reviewed sanitized artifact outside this exporter.

## Audit Patterns

| Prospect | Vertical | Score | Priority | Fault | First Fix |
|---|---|---|---|---|---|
| - | - | - | - | Private prospect-derived proof is intentionally excluded. | - |

## Replies, Objections, And Decisions

| Date | Prospect | Stage | Note |
|---|---|---|---|
| - | - | - | Private prospect-derived proof is intentionally excluded. |

## Client Learnings

| Client | Website | Highest-leverage page | Status | Learning |
|---|---|---|---|---|
| - | - | - | - | Private client-derived proof is intentionally excluded. |

## Reusable Claims

| Claim | Source | Approved For Use |
|---|---|---|
| TinyStudio runs a human-reviewed ${config.offerName} for one highest-leverage page with a fault map, rewrite or redesign, implementation pass or handoff, proof, measurement plan, one client revision, and 14-day implementation tracking. | growth-brain/offer.md | yes |
| No revenue, ranking, ROAS, conversion-lift, booked-call, or sales-volume outcome is guaranteed. | growth-brain/offer.md and sales assets | yes |

## Next Learning To Capture

1. Obtain explicit permission for any reusable result.
2. Sanitize the approved evidence in a separate private-to-public review flow.
3. Add only the final human-approved artifact and its permission record.
`;

const outputDir = outputPath.split("/").slice(0, -1).join("/");
if (outputDir) mkdirSync(outputDir, { recursive: true });
writeFileSync(outputPath, content);

console.log(JSON.stringify({
  status: "created",
  path: outputPath,
  date: today,
  scoredProspects: 0,
  recordedOrSent: 0,
  replies: 0,
  won: 0,
  clients: 0,
  privateDataExcluded: true
}, null, 2));
