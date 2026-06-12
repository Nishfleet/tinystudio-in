# 11/10 Proof Run

Generated: 2026-06-04

## Current Verdict

Not 11/10 yet. The internal system is useful, but the proof run below must be completed before making stronger claims.

Parity score: 5/10.

## Current Proof Blockers

| Area | Current Evidence | Required Proof |
|---|---|---|
| Sender trust | missing physical postal address; DKIM selector not configured | Run `npm run send:configure -- --physical-address="..." --dkim-selector=... --dry-run` with the real values, then apply it without `--dry-run`. Until then, use contact forms or DMs. |
| Market proof | 0/5 Looms, 0/5 sends, 0 replies | Record and send 5 approved Looms with leak, impact, fix, and ask notes. |
| Sales proof | 0 won sprint(s) with close package and won note | Turn at least 1 reply into a booked call, close package, and won sprint with a won-stage note. |
| Delivery proof | 0 external and 0 owned-startup ready client(s); approved claim folders: 0 external, 3 owned-startup | Convert a won prospect, complete the sprint readiness gates, and add an approved claim row in the same client folder. |

## Today’s Proof Run

1. Open the recording view:

```bash
npm run growth:start -- --view=record
```

2. Record this batch. Each Loom must make one leak obvious, quantify the buyer impact where possible, show the first fix, and end with one clean ask.

| # | Prospect | Folder | Score | Leak | First Fix | Send Route |
|---:|---|---|---|---|---|---|
| 1 | ByteMe Networks | prospects/byteme-networks | 12/16 | The hero combines managed IT, security cameras, business networking, phone systems, technical support, and quotes before making the best fi... | Add a "What do you need help with?" block above the service list: Managed IT, Cameras/Security, Phone Systems, Cabling/Networking, each wit... | Use form https://bytemenetworks.com/. |
| 2 | IT Umbrella Group | prospects/it-umbrella-group | 12/16 | The homepage promises complete IT coverage, then immediately asks buyers to parse managed IT, cybersecurity, cabling, networks, phones, cam... | Add a "Start with your problem" block above the service grid: IT support, cybersecurity, cabling/network, phones/cameras, each with one pro... | Use contact form/page: https://itumbrellagroup.com/contact-handler.php. Email route after sender setup: Email info@itumbrellagroup.com. |
| 3 | Talos Cyber Solutions | prospects/talos-cyber-solutions | 12/16 | The page has several competing promises, managed IT, cybersecurity, compliance, and cabling, plus a visible "Testamonials" typo before the... | Consolidate the hero around one promise, then add four path cards for Managed IT, Cybersecurity, Compliance, and Cabling with one proof cue... | Use contact form/page: https://taloscyber.com/contact-us/. Email route after sender setup: Email info@taloscyber.com. |
| 4 | Xentz Technologies | prospects/xentz-technologies | 12/16 | The page has a clear SMB managed IT promise, but several routes compete at once: schedule a consultation, view services, talk to a speciali... | Make "Request a Free IT Assessment" the primary CTA, keep "View Services" secondary, and group the service cards underneath with one proof... | Use contact form/page: https://xentztechnologies.com/. Email route after sender setup: Email info@xentztechnologies.com. |
| 5 | YPM IT Solutions | prospects/ypm-it-solutions | 12/16 | The homepage promise is broad, then services, portfolio, website, product store, and support paths appear before one managed IT buyer route... | Add a "Start here" decision block: Managed IT & Infrastructure, Helpdesk, Cloud, Compliance, each with one proof cue and one consultation C... | Use contact form/page: https://ypmitsolutions.com/contact/#gf_1. Email route after sender setup: Email contact@ypmitsolutions.com. |

3. Paste the recorded Loom URLs into the post-recording prep command:

This proof run also wrote the same prefilled sheet to `prospects/loom-links.txt`. After recording, copy either five Loom URLs in the same order or rows like `prospects/prospect-slug|https://www.loom.com/share/...`. The post-recording prep preserves the existing approved leak, impact, fix, and ask notes, prepares send packages, refreshes the outbox, and refreshes the proof cockpit without marking anything sent.

```text
prospects/byteme-networks|LOOM_URL|approved|The hero combines managed IT, security cameras, business networking, phone systems, technical support, and quotes before making the best first path obvious.|A Waco business owner needs to know whether to ask for IT support, security/cameras, phones, or cabling without decoding the whole service menu.|Add a "What do you need help with?" block above the service list: Managed IT, Cameras/Security, Phone Systems, Cabling/Networking, each with one proof cue and one CTA.|If useful, I can run a 7-day sprint where I map this leak, rewrite the key sections, and give you a 30-day action plan.
prospects/it-umbrella-group|LOOM_URL|approved|The homepage promises complete IT coverage, then immediately asks buyers to parse managed IT, cybersecurity, cabling, networks, phones, cameras, access control, and industry pages before one best path is clear.|An RGV business owner needs to know which first problem to choose before they book an assessment.|Add a "Start with your problem" block above the service grid: IT support, cybersecurity, cabling/network, phones/cameras, each with one proof cue and one assessment CTA.|If useful, I can run a 7-day sprint where I map this leak, rewrite the key sections, and give you a 30-day action plan.
prospects/talos-cyber-solutions|LOOM_URL|approved|The page has several competing promises, managed IT, cybersecurity, compliance, and cabling, plus a visible "Testamonials" typo before the buyer gets one clean path.|A small-business buyer needs to self-select the right service quickly, especially when the offer includes security and compliance.|Consolidate the hero around one promise, then add four path cards for Managed IT, Cybersecurity, Compliance, and Cabling with one proof cue and one CTA each.|If useful, I can run a 7-day sprint where I map this leak, rewrite the key sections, and give you a 30-day action plan.
prospects/xentz-technologies|LOOM_URL|approved|The page has a clear SMB managed IT promise, but several routes compete at once: schedule a consultation, view services, talk to a specialist, request an assessment, explore services, and request a consultation.|A small-business buyer should know whether the next step is an assessment, a service comparison, or a direct call.|Make "Request a Free IT Assessment" the primary CTA, keep "View Services" secondary, and group the service cards underneath with one proof cue per service.|If useful, I can run a 7-day sprint where I map this leak, rewrite the key sections, and give you a 30-day action plan.
prospects/ypm-it-solutions|LOOM_URL|approved|The homepage promise is broad, then services, portfolio, website, product store, and support paths appear before one managed IT buyer route is clear.|A Plano business buyer should be able to choose managed IT, helpdesk, cloud, or compliance without getting pulled into unrelated navigation.|Add a "Start here" decision block: Managed IT & Infrastructure, Helpdesk, Cloud, Compliance, each with one proof cue and one consultation CTA.|If useful, I can run a 7-day sprint where I map this leak, rewrite the key sections, and give you a 30-day action plan.
```

```bash
npm run market:after-recording -- --from-clipboard
```

4. Check the proof run status:

```bash
npm run market:proof-check
```

5. Send from the outbox, using the route shown for each prospect. Recommended channel right now: contact form or DM.

Sender warnings: missing physical postal address; DKIM selector not configured.

6. After sending, use the outbox copied sent sheet:

```bash
npm run prospect:batch-sent -- --from-clipboard
```

7. Run the proof check again. It should say `sent-proof-captured` before the market proof blocker can clear.

## Proof Capture Rules

- Market proof is real only after 5 Looms are recorded, send packages are ready, messages are sent, and stages are marked sent.
- Email sent proof does not count while `npm run send:setup` still warns. Use contact forms, DMs, LinkedIn, X, phone, mixed, or other until sender trust is clean.
- Sales proof is real only after a prospect reply, call-booked package, close package, and won-stage note exist.
- Delivery proof is real only after the same client folder passes readiness with approved claims, filled scorecards, completed acceptance checks, and filled delivery artifacts.
- Retention proof is real only after a filled weekly report shows shipped work, a learning, a next test, and customer confirmation that the delta was seen, understood, approved for next action, and worth continuing.
- Do not claim better, comparable, 11/10, retained, or proven until `npm run market:parity` passes.

## Current Counts

| Metric | Count |
|---|---:|
| Scored prospects | 12 |
| Looms recorded | 0 |
| Sends | 0 |
| Replies | 0 |
| Calls | 0 |
| Closed | 0 |
| Clients ready | 0 |
