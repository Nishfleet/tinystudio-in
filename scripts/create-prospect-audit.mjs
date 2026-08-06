#!/usr/bin/env node
import { existsSync } from "node:fs";
import { join } from "node:path";
import { localIsoDate } from "./date-utils.mjs";
import { agencyConfig } from "./lib/agency-config.mjs";
import { serviceRoot } from "./lib/runtime-roots.mjs";
import { atomicWrite, ensureDir, resolveRepoPath } from "./lib/service-contract.mjs";

const rawArgs = process.argv.slice(2);
const fields = {};
const nameParts = [];

for (let index = 0; index < rawArgs.length; index += 1) {
  const arg = rawArgs[index];
  if (arg.startsWith("--")) {
    const key = arg.slice(2);
    const value = rawArgs[index + 1] && !rawArgs[index + 1].startsWith("--") ? rawArgs[index + 1] : "";
    fields[key] = value;
    if (value) index += 1;
  } else {
    nameParts.push(arg);
  }
}

const name = nameParts.join(" ").trim();

function slugify(value) {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 80);
}

if (!name) {
  console.error(
    'Usage: npm run prospect:new -- "Prospect Name" -- --website https://example.com --vertical managed-it-cybersecurity --city Austin --contact Jane'
  );
  process.exit(1);
}

const slug = slugify(name);
if (!slug) {
  console.error("Prospect name must contain letters or numbers.");
  process.exit(1);
}

const root = resolveRepoPath(serviceRoot, join("prospects", slug));
if (existsSync(root)) {
  console.error(`Prospect audit already exists: ${root}`);
  process.exit(1);
}

ensureDir(root);

const vertical = fields.vertical || "";
const website = fields.website || "";
const city = fields.city || "";
const contact = fields.contact || "";
const notes = fields.notes || "";
const config = agencyConfig();
const verticalHooks = {
  "managed-it-cybersecurity":
    "Buyers should reach the right managed IT, cybersecurity, compliance, or assessment path faster, with proof beside the decision point instead of a broad service menu.",
  "accounting-bookkeeping": "Your site lists services, but it does not make it obvious which buyer should choose you and what problem you solve first.",
  "dental-medspa-clinics":
    "Patients are trying to decide whether they trust you before they contact you. The page needs to answer fear, proof, cost, timing, and next-step questions faster.",
  "home-services": "A homeowner needs to know three things fast: do you handle my problem, do you serve my area, and can I trust you?"
};
const hook =
  verticalHooks[vertical] || "Your site is probably making the buyer work too hard before they understand what you sell, why it matters, and what to do next.";

atomicWrite(join(root, "metadata.json"), `${JSON.stringify({ name, slug, website, vertical, city, contact, notes }, null, 2)}\n`);

atomicWrite(
  join(root, "pipeline.json"),
  `${JSON.stringify(
    {
      stage: "new",
      createdAt: localIsoDate(),
      sentAt: "",
      sentChannel: "",
      lastChannel: "",
      lastTouchAt: "",
      nextFollowUpAt: "",
      followUps: [
        { step: "day-2", dueAt: "", sentAt: "", status: "pending" },
        { step: "day-5", dueAt: "", sentAt: "", status: "pending" },
        { step: "day-10", dueAt: "", sentAt: "", status: "pending" }
      ],
      touches: [],
      notes: []
    },
    null,
    2
  )}\n`
);

atomicWrite(
  join(root, "lead-score.md"),
  `# ${name} Lead Score

## Prospect

- Website: ${website}
- Vertical: ${vertical}
- City: ${city}
- Contact: ${contact}
- Notes: ${notes}

## Fit Score

| Signal | Points | Notes |
|---|---:|---|
| Live service/product offer |  |  |
| Clear decision-maker or founder |  |  |
| High-ticket or repeat-purchase economics |  |  |
| Obvious architecture, copy, trust, or CTA fault |  |  |
| Reviews, case studies, or customer proof exist |  |  |
| Competitors are clearer than them |  |  |
| Already spending on SEO, ads, email, or content |  |  |
| Fix can be explained in a 2-3 minute Loom |  |  |

## Total

- Score:
- Priority: record / research-more / skip
`
);

atomicWrite(
  join(root, "loom-outline.md"),
  `# ${name} Loom Outline

## Wedge

Pick one:

- Homepage
- Service page
- Landing page
- Offer page
- Contact or demo page

## Recording Flow

1. Why I picked the business: ${website ? `I reviewed ${website}.` : ""}
2. Main money page:
3. Specific fault:
4. Why it matters: ${hook}
5. Competitor/reference contrast:
6. First fix:
7. Sprint pitch: ${config.offerName}

## Close

"If useful, I can fix this one highest-leverage page in a human-reviewed 7-day sprint with a fault map, rewrite or redesign, implementation pass or dev-ready handoff, proof, measurement plan, and 14-day implementation tracking."
`
);

atomicWrite(
  join(root, "outreach.md"),
  `# ${name} Outreach

## Contact

- Name:
- Role:
- Email:
- LinkedIn/X: ${contact}

## First Message

Subject: Quick audit for ${name}

Hey [Name],

I recorded a short audit for ${name}. The main thing I noticed is [specific fault].

Here is the Loom: [link]

If useful, I can run a ${config.offerName} for this one highest-leverage page, with human review, a rewrite or redesign, implementation handoff, proof, measurement plan, and 14-day implementation tracking.

${config.optOutLine}

${config.founderName}

## Follow-Ups

- Day 2:
- Day 5:
- Day 10:
`
);

atomicWrite(
  join(root, "buyer-room.md"),
  `# ${name} Buyer Room

## Loom

- Link:

## What I Saw

- Fault 1:
- Fault 2:
- Fault 3:

## Scope

- Sprint:
- Timeline:
- Price:

## Next Step

- Approve:
- Pay:
- Complete intake:
`
);

atomicWrite(
  join(root, "value-calculator.md"),
  `# ${name} Value Calculator

## Inputs

- Average customer value:
- Gross margin:
- Estimated value of one extra customer:
- Sprint price:

## Payback

- Payback customers needed:

## Decision

- Good fit / weak fit:
- Why:
`
);

atomicWrite(
  join(root, "audit-brief.md"),
  `# ${name} Audit Brief

## Prospect Snapshot

- Website: ${website}
- Vertical: ${vertical || "unknown"}
- City: ${city}
- Contact: ${contact}

## Default Hook

${hook}

## First Things To Inspect

- Homepage promise and primary CTA.
- Money page/service page hierarchy.
- Trust proof near the point of decision.
- FAQ coverage for buying questions.
- Competitor clarity.
- AI/search phrase gaps.

## Best First Wedge

Pick one after inspection:

- Site architecture
- Product/service page
- Landing page
- Offer clarity
- Trust/FAQ

## Loom Target

Show one visible fault in under 2 minutes, then explain the 7-day sprint in one clear ask.
`
);

console.log(JSON.stringify({ status: "created", prospect: name, path: root }, null, 2));
