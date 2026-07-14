# Implementation Plan: Growth Brain Agency Operating Kit

## Scope

Create the minimum complete agency operating kit inside this repo.

## Pieces

- Root repo docs explain the new TinyStudio direction.
- `growth-brain/` contains the operating kit.
- `docs/strategy/` contains the full plan and 14-day sales path.
- `specs/001-growth-brain-agency/` contains the Spec Kit control surface.
- `scripts/retired/check-growth-brain-kit.mjs` is the archived broad-agency checker; it is not an active gate.
- `scripts/check-prospect-readiness.mjs` and `scripts/check-client-readiness.mjs` prevent draft work from being sent.
- `scripts/check-outbound-claim-safety.mjs` prevents unprovable outbound claims from leaving the system.
- `scripts/enrich-prospect-contact-plan.mjs` creates a prospect send-route file from listed website contact surfaces.
- `scripts/draft-loom-recording-script.mjs` creates a record-ready talk track from prospect notes.
- `scripts/export-recording-queue.mjs` exports the next batch of Looms to record.
- `scripts/export-recording-cockpit.mjs` exports the next recording batch as a browser page.
- `scripts/export-recording-teleprompter.mjs` exports a focused recording page for batch Loom work.
- `scripts/add-prospect-loom-link.mjs` updates prospect send surfaces after a real Loom exists.
- `scripts/draft-prospect-message.mjs` creates the exact next message for first sends and follow-ups.
- `scripts/export-prospect-outbox.mjs` exports recorded Looms with channel copy and stage commands.
- `scripts/prepare-prospect-send.mjs` turns one Loom URL into updated send surfaces, a readiness check, and a final send package.
- `scripts/prepare-prospect-batch-send.mjs` turns a batch Loom-link file into multiple send packages.
- `scripts/complete-prospect-batch-send.mjs` marks a sent Loom-link batch as sent and schedules follow-ups.
- `scripts/update-prospect-pipeline.mjs` tracks sent Looms, follow-ups, replies, calls, wins, and losses.
- `scripts/export-followup-cockpit.mjs` exports due follow-ups as a browser page with copyable channel messages.
- `scripts/prepare-prospect-reply.mjs` turns a reply into a reply package and call-prep packet.
- `scripts/draft-sales-call-prep.mjs` creates the sales-call close packet.
- `scripts/prepare-prospect-call-booked.mjs` turns a booked call into confirmation copy, call prep, agenda, and close-loop commands.
- `scripts/prepare-prospect-close-package.mjs` turns a completed call into a scoped proposal/follow-up, payment CTA, and conversion commands.
- `scripts/convert-prospect-to-client.mjs` creates a client sprint folder from a won prospect.
- `scripts/draft-client-kickoff.mjs` creates the first client kickoff message and context checklist.
- `scripts/export-client-delivery-cockpit.mjs` creates one delivery board for running a paid sprint.
- `scripts/retired/export-client-facing-dashboard.mjs` preserves the historical broad-agency dashboard generator outside the active command surface.
- `scripts/retired/export-client-renewal-review.mjs` preserves the historical automated renewal packager outside the active command surface; continuation now requires the human service review gate.
- `scripts/show-growth-command-center.mjs` turns current prospect/client state into today's action list.
- `scripts/export-growth-cockpit.mjs` exports one browser start screen for the daily workflow.
- `scripts/export-growth-metrics.mjs` exports the current funnel scoreboard.
- `scripts/export-proof-library.mjs` exports the current proof and learning library.
- `scripts/retired/export-retention-checkups.mjs` preserves the historical broad-agency retention exporter outside the active service surface.
- `scripts/export-internal-dashboard.mjs` exports the concise owner dashboard with next/pending actions, a TASKS-backed to-do list, funnel counts, retention risk, and 11/10 blockers.
- `scripts/export-managed-it-one-pager.mjs` exports the first niche-specific sales sheet to printable HTML.

## Verification

- Run `npm test`.
- Confirm the Mobbin proving lab still passes.
- Confirm the Growth Brain kit check passes.
- Confirm prospect and client readiness checks are covered by the kit smoke test.
- Confirm contact-plan generation is covered by the kit smoke test.
- Confirm outbound claim-safety check is part of `npm test`.
- Confirm recording script generation is covered by the kit smoke test.
- Confirm recording queue export is covered by the kit smoke test.
- Confirm recording cockpit export is covered by the kit smoke test.
- Confirm recording teleprompter export is covered by the kit smoke test.
- Confirm Loom link injection is covered by the kit smoke test.
- Confirm next-message generation is covered by the kit smoke test.
- Confirm prospect outbox export is covered by the kit smoke test.
- Confirm send-prep package generation is covered by the kit smoke test.
- Confirm batch send-prep package generation is covered by the kit smoke test.
- Confirm batch sent completion is covered by the kit smoke test.
- Confirm prospect stage tracking is covered by the kit smoke test.
- Confirm follow-up cockpit export is covered by the kit smoke test.
- Confirm reply-prep generation is covered by the kit smoke test.
- Confirm sales call prep generation is covered by the kit smoke test.
- Confirm call-booked prep generation is covered by the kit smoke test.
- Confirm close-package generation is covered by the kit smoke test.
- Confirm prospect-to-client conversion is covered by the kit smoke test.
- Confirm client kickoff generation is covered by the kit smoke test.
- Confirm client delivery cockpit generation is covered by the kit smoke test.
- Confirm client-facing dashboard generation is covered by the kit smoke test.
- Confirm client renewal review generation is covered by the kit smoke test.
- Confirm the daily command-center script is covered by the kit smoke test.
- Confirm the browser growth cockpit export is covered by the kit smoke test.
- Confirm the live metrics export is covered by the kit smoke test.
- Confirm the proof and learning library export is covered by the kit smoke test.
- Confirm the retention checkups and dashboard export are covered by the kit smoke test.
- Confirm the internal dashboard export is covered by the kit smoke test.
- Confirm the managed IT one-page sales sheet export is covered by the kit smoke test.

## Fallback

If the agency direction changes, keep the kit as docs and update `growth-brain/offer.md` first. Do not rebuild software before validating a paid sprint.
