# TinyStudio managed service

TinyStudio is a human-reviewed delivery system for one narrow offer:

**7-Day Website Revenue Leak Fix Sprint**

The buyer is a founder-led Managed IT/MSP/cybersecurity company with a live site and a high-value offer. The first 3 clients are exactly **$1,000 founder pilots**. Each sprint fixes one highest-leverage page and leaves the client with a usable, measurable implementation package.

## The sprint contract

Included in every paid sprint:

- leak map for the selected page
- rewrite or redesign of that page
- one implementation pass **or** a dev-ready handoff
- search-trust basics (titles, headings, internal links, FAQs, proof, and crawl essentials)
- before/after proof
- a Loom walkthrough
- a measurement plan
- one revision
- 14-day implementation tracking

Day 0 starts only after payment, required context, an approval owner, and an implementation owner are present. Client delay pauses the clock. The sprint does not guarantee revenue, rankings, ROAS, conversion, booked calls, or sales volume.

## Human review and automation

Human review gates fit, claims, client-facing work, delivery/acceptance, and renewal. Automation may prepare research, drafts, QA, packages, and routing. It may not autonomously send, publish, spend, approve, accept, or renew.
Operational dates deliberately use `Asia/Kolkata` regardless of host or CI timezone; its fixed `+05:30` offset has no daylight-saving transition.

## Repository map

- `PRODUCT.md` and `MEMORY.md` hold the current product truth.
- `growth-brain/offer.md` is the canonical offer.
- `growth-brain/sales/` contains the one-page offer, proposal, and buyer-room templates.
- `growth-brain/sprint-checklist.md`, `growth-brain/delivery-template.md`, and `growth-brain/workflows/client-sprint-workflow.md` define delivery.
- `growth-brain/quality/` contains acceptance and proof gates.
- `growth-brain/ops/agency-config.json` is the shared configuration for generated drafts.
- `scripts/check-product-truth.mjs` checks active service surfaces only.
- `public/` is the separate tinystudio.in portfolio and is intentionally outside the service truth gate.

## Safe operating loop

1. Confirm fit and the one highest-leverage page.
2. Collect payment, required context, approval owner, and implementation owner.
3. Start Day 0; pause the clock when the client is blocking progress.
4. Prepare research and drafts, then complete every human review gate.
5. Deliver the approved page rewrite or redesign, implementation pass or handoff, proof, Loom, measurement plan, revision, and 14-day tracking.
6. Review delivery and acceptance with the client, then separately review renewal.

The operator engine turns that loop into an offline queue. `service:queue` prepares bounded work packets; `service:decide` is the only review-decision writer; `service:day0` promotes a paid founder pilot into the canonical client scaffold; `service:resume` maintains the clock; and `service:evidence` records outcome, implementation or handoff, before/after proof, Loom, baseline, acceptance, usefulness, and tracking. Missing context becomes a human-reviewed `needs-info` request. Work must stay on the reviewed page and preserve the accepted metric and baseline. `client:new` is repair-only, while requests beyond the included revision stop at `scope-review` until a reviewer authorizes scope and fee. Changed inputs, partial work, cross-page work, unbound claims, stale decisions, replays, and missing evidence fail closed. Client-facing work requires a fresh decision bound to its artifact hash and exact no-guarantee policy. Interrupted state changes leave roll-forward records that `service:repair -- APPLICATION_ID` can complete exactly.

### Private state backup and recovery

`clients/`, `prospects/`, `service-decisions/`, and `runs/service-engine/outputs/` contain private, load-bearing records and are intentionally git-ignored. After every mutating service command and before any cleanup, create a permission-restricted snapshot at an explicit path outside this repository:

```bash
npm run service:backup -- --output "/absolute/private/outside-repo/tinystudio-service-YYYYMMDD-HHMMSS"
npm run service:backup-check -- --input "/absolute/private/outside-repo/tinystudio-service-YYYYMMDD-HHMMSS"
```

The export takes the shared service lock and rejects pending promotions, symlinks, special files, in-repo or existing destinations, unsafe permissions, and changed bytes. Restore only into a clean clone: verify the snapshot; copy `clients/`, `prospects/`, `service-decisions/`, and `runs/service-engine/outputs/` to the same relative paths without merging or overwriting; run `npm run service:queue -- --mode=prepare --scope all`; then run `npm run service:queue-check -- --scope all`. Keep the snapshot local until a human approves its storage destination, access, retention, and deletion policy.

The Friday retention-prep automation is optional only while there are no client records. Once a client exists, `retention:automation-check` fails closed and prints the exact replacement prompt.

Run the checks before treating a packet as ready:

```bash
npm run product:truth
npm run claims:check
npm run config:check
node scripts/test-service-engine.mjs
node scripts/test-cross-repo-service.mjs --public-repo "/absolute/path/to/TinyStudio.io"
git diff --check
```

## SaaS graduation evidence gate

TinyStudio does not become SaaS by assumption. Graduation requires **at least 10 paid sprints**, the **same problem in at least 7**, **at least 70% workflow repeatability**, **usefulness at least 8/10**, **approval at least 70%**, a **recurring need**, and **at least 3 deposits or preorders**. Until every threshold is evidenced, this remains a managed service.

## Non-negotiables

- Never broaden the active buyer, page scope, or deliverables without a reviewed decision.
- Never make revenue, ranking, ROAS, conversion, booked-call, or sales-volume guarantees.
- Never send, publish, spend, approve, accept, or renew without the applicable human gate.
- Keep the tinystudio.in portfolio in `public/`; it is not service positioning.
