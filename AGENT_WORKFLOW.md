# Human-review workflow: automation prepares; humans judge.

## Autonomous loop

1. Run `npm run service:queue -- --mode=prepare` offline.
2. Complete `needs-agent-work` from public evidence at `targetIgnoredPath`; preserve hashes.
3. At `needs-review`, a human uses `service:decide`.
4. Apply one: `npm run service:queue -- --mode=apply --application APPLICATION_ID`.

Required: fault map, same-page fix, search trust, proof, Loom, baseline, implementation/handoff, revision boundary, and tracking. Cite evidence; reject partial work; keep human-only claims and no guarantees.

Missing context returns `needs-input`, null deliverables, and `missingContext`; human `needs-info` resumes it.

## Human gates

Humans own fit, claims, client work, acceptance, usefulness, and continuation; automation cannot send, publish, spend, use providers, or renew.

`service:day0` needs payment, context, and both owners. Pauses extend weekdays and retain history.

Journal error: run `npm run service:repair -- APPLICATION_ID`. Missing/corrupt review-cap ledger: stop and restore a verified off-repo snapshot; never recreate it. Without one, require human forensic recovery.

After every state mutation, export `clients/`, `prospects/`, `service-decisions/`, and the hash-bound private output subtree with `npm run service:backup -- --output /absolute/private/outside-repo/snapshot`. Verify it with `npm run service:backup-check -- --input /absolute/private/outside-repo/snapshot`. Never use a synced or provider destination until its privacy and retention policy is human-approved.

`service:evidence` records acceptance, proof, baseline, and tracking. Decisions bind artifacts. One revision is included; a second stops at `scope-review` until a human records the scope, fee, and reviewer with `service:resume`; tracking waits 14 days.

Never promise revenue, rankings, ROAS, conversion lift, booked calls, or sales volume.
