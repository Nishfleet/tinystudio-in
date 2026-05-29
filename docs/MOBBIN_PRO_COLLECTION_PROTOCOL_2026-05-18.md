# Mobbin Pro Collection Protocol

Date: 2026-05-18
Status: active lab contract

## Principle

Mobbin research should be broad. The transcript should be narrow.

The system must not reduce research quality to avoid a noisy chat. It should pull wide, save the full evidence locally, then show only the digest needed for review.

## Per-Redesign Flow

1. Take the specific business and generate a fresh Mobbin search brief.
2. Run every required query angle: niche, page job, tone, and constraint.
3. Use repeated Mobbin MCP chunks with `exclude_screen_ids` when large pulls time out.
4. Save every returned Mobbin screen metadata row to `raw-pull-log.json`.
5. Stop only after the raw pool has at least 32 returned screens and 20 unique screens.
6. Compress the raw pool into the 12-20 raw candidates allowed in `reference-packet.json`.
7. Shortlist 6-8 references and at least 2 anti-references.
8. Extract the full ingredient ledger from the shortlist.
9. Validate hashes so the shortlist cannot pretend to come from a different business, search brief, or raw pull.

## Required Files

Each business run needs:

- `docs/evidence/design-system-proving-lab/reference-runs/latest/<business-id>/raw-pull-log.json`
- `docs/evidence/design-system-proving-lab/reference-runs/latest/<business-id>/reference-packet.json`

The raw pull log is the evidence vault. The reference packet is the decision artifact.

## Raw Pull Log

The raw pull log must include:

- `schemaVersion: mobbin.mobbin-pro.raw-pull-log.v1`
- `sourceProvider: Mobbin Pro MCP`
- `platform: web`
- `businessId`
- `businessHash`
- `searchBriefHash`
- `generatedAt`
- `queryRuns`
- returned screen IDs, Mobbin URLs, image URLs, app/site names, and query metadata

The raw pull log may contain more than 20 results. That is expected.

## Reference Packet

The reference packet must include:

- `schemaVersion: mobbin.mobbin-pro.per-redesign-reference-packet.v1`
- `rawPullLogPath`
- `rawPullLogHash`
- `businessHash`
- `searchBriefHash`
- `generatedAt`
- `queryLog`
- 12-20 raw candidates selected from the raw pull log
- 6-8 shortlisted references
- at least 2 rejected or anti-reference screens
- fit scores
- full ingredient ledger
- banned uses for every shortlisted reference

## No-Flood Rule

Do not paste the raw Mobbin pull into chat.

The chat should report:

- raw returned count
- raw unique count
- packet path
- shortlist IDs
- blockers
- pass/fail status

The full evidence belongs in the repo, not in the conversation.
