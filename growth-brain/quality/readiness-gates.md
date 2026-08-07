# Readiness Gates

Use these gates to prevent weak work from leaving the system.

## Prospect Loom Gate

Run:

```bash
npm run prospect:check -- prospects/prospect-slug
```

After recording the Loom, paste the link once and create the send package:

```bash
npm run prospect:send-prep -- prospects/prospect-slug https://www.loom.com/share/... --approved
```

For a recorded batch, use:

```bash
npm run market:after-recording -- --from-clipboard
```

Before recording, generate the talk track with:

```bash
npm run prospect:script -- prospects/prospect-slug
```

If you need to update the Loom link or message separately, use:

```bash
npm run prospect:loom -- prospects/prospect-slug https://www.loom.com/share/...
npm run prospect:message -- prospects/prospect-slug
```

Do not send a Loom until:

- website is filled
- vertical is chosen
- contact is known
- lead score is filled
- priority is chosen
- specific fault is identified
- Loom package is generated
- recording script is generated
- buyer room has price and Loom link

After sending, schedule follow-ups with:

```bash
npm run prospect:stage -- prospects/prospect-slug sent --channel contact-form
npm run prospect:stage -- prospects/prospect-slug sent --channel dm
npm run prospect:stage -- prospects/prospect-slug sent --channel email
```

Use strict mode before sending:

```bash
npm run prospect:check -- prospects/prospect-slug -- --strict
```

## Client Delivery Gate

Run:

```bash
npm run client:check -- clients/client-slug
```

Do not send final delivery until:

- intake is complete
- kickoff message has been sent
- sprint wedge is chosen
- client brain has enough context
- claim-proof ledger is filled
- delivery scorecard passes
- conversion optimization scorecard is filled
- search trust layer is filled after the conversion fix
- implementation handoff is ready
- approval-needed items are marked

Client readiness requires at least one real approved claim row with claim, source, proof type, approver, and `approved` status. The delivery scorecard must average 4+ with no area below 3. The conversion optimization scorecard must have filled critical checks, top failure rows, copy review, angle review, weekly test, search trust rows, and search trust guardrails. The sprint acceptance checklist must have every checkbox complete. Delivery, implementation handoff, and week-1 report artifacts must contain filled rows/copy, not just templates.

The required order is conversion first, on-site search trust second, and off-site trust/distribution only when it is real. Do not send backlink schemes, fake citations, fake reviews, spam directory work, doorway pages, or ranking promises.

Weekly reports and client dashboards must include a measurement contract for the tangible improvement: signal, source, owner, next check, baseline/current state, and decision rule. If that contract is missing, the work is activity reporting, not retention proof.

In the delivery cockpit, client update and handoff copy must be edited before copying. Bracket placeholders like `[specific action]`, `[approval/context/blocker]`, and `[next sprint step]` are blocked.

Use strict mode before final handoff:

```bash
npm run client:check -- clients/client-slug -- --strict
```

## Rule

Draft status is fine while working. Strict mode is for before sending.

Run this before outbound or client-facing material leaves TinyStudio:

```bash
npm run claims:check
```
