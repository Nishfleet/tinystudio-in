# Project Memory

## Current Shape

- This folder is the new TinyStudio Growth Brain agency repo at `/Users/nish/Documents/TINY STUDIO`.
- Legacy TinyStudio local repos, worktrees, static backups, and the old GitHub remote were removed after explicit confirmation.
- The preserved Mobbin proving lab now lives inside this repo as a support system for design reference and page direction.
- Spec Kit is installed so meaningful changes should have specs, checks, and clear acceptance criteria.

## Business Direction

TinyStudio is now a cash-now AI marketing ops agency.

Sell the 7-Day Site Revenue Leak Sprint first. Treat TinyStudio Growth Brain as the internal operating system. Do not wait for SaaS, ads, or a large website. The sprint gives a client:

- a client brain built from real context
- page and offer fixes
- ad angle ideas
- email/SMS drafts
- competitor notes
- a weekly measurement/reporting loop

## Operating Rules

- Start with founder-led ecommerce or small businesses that already have sales, traffic, reviews, or past campaigns.
- Keep founder name, offer name, price defaults, placeholders, and opt-out language in `growth-brain/ops/agency-config.json`.
- Do not promise specific revenue, ROAS, SEO ranking, or sales-multiple outcomes.
- Treat tangible improvement proof as the no-trust startup wedge: every client-facing artifact should show what changed, why it matters, what proves it, the measurement contract, and what gets checked next.
- Treat AI Converter, SiteRep, and 0509 as owned-product delivery proof, not market proof. They can be used in outbound only with the owned-product label intact until real external clients reply, pay, retain, and confirm value.
- Use `npm run owned:metrics -- --from-clipboard` to turn owned-product proof packets into full case studies only after one real current metric is available for each owned product.
- Treat each agent as a repeatable workflow first: inputs, checklist, output, human approval, measurement.
- Save reusable learnings back into the client brain after every delivery.
- Use Mobbin only for reference-backed design direction, never for copying.

## Commands

```bash
npm test
npm run claims:check
npm run send:setup
npm run send:guide
npm run send:normalize
npm run send:check
npm run growth:start
npm run growth:mission
npm run growth:today
npm run growth:cockpit
npm run growth:metrics
npm run growth:proof
npm run growth-brain:check
npm run prospect:contact-plan -- prospects/prospect-slug
npm run prospect:batch-contact-plan -- --limit=10
npm run prospect:score-cockpit
npm run prospect:batch-score -- --from-clipboard
npm run prospect:score-check
npm run prospect:brief -- prospects/prospect-slug
npm run prospect:prep-recording -- --limit=5
npm run prospect:queue -- --limit=5
npm run prospect:cockpit -- --limit=5
npm run prospect:teleprompter -- --limit=5
npm run prospect:rehearsal -- --limit=5
npm run prospect:outbox
npm run prospect:followups
npm run prospect:sales-cockpit
npm run mobbin:check
npm run prospect:check -- prospects/prospect-slug
npm run prospect:script -- prospects/prospect-slug
npm run prospect:loom -- prospects/prospect-slug https://www.loom.com/share/...
npm run prospect:send-prep -- prospects/prospect-slug https://www.loom.com/share/... --approved
npm run market:after-recording -- --from-clipboard
npm run prospect:batch-send-prep
npm run prospect:batch-sent -- --from-clipboard
npm run prospect:message -- prospects/prospect-slug
npm run prospect:stage -- prospects/prospect-slug sent --channel contact-form
npm run prospect:reply-prep -- prospects/prospect-slug
npm run prospect:call-booked-prep -- prospects/prospect-slug
npm run prospect:call-prep -- prospects/prospect-slug
npm run prospect:close-prep -- prospects/prospect-slug
npm run prospect:stage -- prospects/prospect-slug won --note "Approved sprint"
npm run prospect:convert -- prospects/prospect-slug
npm run client:cockpit -- clients/client-slug
npm run client:kickoff -- clients/client-slug
npm run client:check -- clients/client-slug
npm run sales:one-pager
```
