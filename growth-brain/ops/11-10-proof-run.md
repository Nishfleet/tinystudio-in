# 11/10 Proof Run

Generated: 2026-05-31

## Current Verdict

Not 11/10 yet. The internal system is useful, but the proof run below must be completed before making stronger claims.

Parity score: 3/10.

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
| 1 | LayerLogix | prospects/layerlogix | 14/16 | The homepage asks buyers to parse IT services, cybersecurity, PAM, web development, cabling, cloud, healthcare IT, and business IT before g... | Add a "Choose your path" section near the first CTA: urgent IT support, compliance/security, healthcare/HIPAA, cloud/network modernization. | Use contact form/page: https://layerlogix.com/contact?service=security-assessment. Email route after sender setup: Email support@layerlogix... |
| 2 | PROTBYTE | prospects/protbyte | 12/16 | The headline and sections describe a "living security intelligence program" before translating the offer into simple buyer choices like ass... | Add a buyer-path section above the platform depth: "Need assessment", "Need ongoing monitoring", "Need board/compliance narrative." | Use contact form/page: https://protbyte.com/contact.html. Email route after sender setup: Email contact@protbyte.com. |
| 3 | Sagiss | prospects/sagiss | 12/16 | The strongest buying proof, including operational capacity, ownership, contract structure, SOC II/MSP Cloud Verify, and pricing-context con... | Move the strongest proof points into a compact "Why Dallas teams choose Sagiss" section near the top, then route buyers to IT support, clou... | Use contact form/page: https://www.sagiss.com/contact-us-1. Email route after sender setup: Email support@sagiss.com. |
| 4 | Scorpion Technology | prospects/scorpion-technology | 12/16 | The page has strong industry proof for healthcare, CPA, property management, and professional services, but those paths could be more direc... | Turn the strongest industry proof into a clearer route: "Choose your industry" plus one proof block and CTA per path. | Use LinkedIn DM/profile: https://www.linkedin.com/company/scorpion-it-support/. Email route after sender setup: Email info@scorpionitsuppor... |
| 5 | Stradiant | prospects/stradiant | 12/16 | The page opens with a broad cyber-disaster warning before making the core buying path clear: managed IT, cybersecurity, or assessment. | Make the homepage own one primary intent, then route buyers into Managed IT, Cybersecurity, and Assessment paths with proof and FAQ support. | Use contact form/page: https://www.stradiant.com/contact/#wpcf7-f302-p37-o1. Email route after sender setup: Email info@stradiant.com. |

3. Paste the recorded Loom URLs into the post-recording prep command:

This proof run also wrote the same prefilled sheet to `prospects/loom-links.txt`. After recording, copy either five Loom URLs in the same order or rows like `prospects/prospect-slug|https://www.loom.com/share/...`. The post-recording prep preserves the existing approved leak, impact, fix, and ask notes, prepares send packages, refreshes the outbox, and refreshes the proof cockpit without marking anything sent.

```text
prospects/layerlogix|LOOM_URL|approved|The homepage asks buyers to parse IT services, cybersecurity, PAM, web development, cabling, cloud, healthcare IT, and business IT before giving them one obvious first path.|Protect sales time by sending better-fit visitors toward Services, Contact, Get Started → with a clearer reason to act.|Add a "Choose your path" section near the first CTA: urgent IT support, compliance/security, healthcare/HIPAA, cloud/network modernization.|If useful, I can run a 7-day sprint where I map this leak, rewrite the key sections, and give you a 30-day action plan.
prospects/protbyte|LOOM_URL|approved|The headline and sections describe a "living security intelligence program" before translating the offer into simple buyer choices like assessment, managed cybersecurity, or advisory.|Protect sales time by sending better-fit visitors toward Services, Managed IT Day-to-day IT operations, endpoints, support, vCIO Services Strategic IT leadership & roadmap with a clearer reason to act.|Add a buyer-path section above the platform depth: "Need assessment", "Need ongoing monitoring", "Need board/compliance narrative."|If useful, I can run a 7-day sprint where I map this leak, rewrite the key sections, and give you a 30-day action plan.
prospects/sagiss|LOOM_URL|approved|The strongest buying proof, including operational capacity, ownership, contract structure, SOC II/MSP Cloud Verify, and pricing-context content, appears far below the first CTA.|Protect sales time by sending better-fit visitors toward Contact Us, Get Support, IT Support with a clearer reason to act.|Move the strongest proof points into a compact "Why Dallas teams choose Sagiss" section near the top, then route buyers to IT support, cloud, or security.|If useful, I can run a 7-day sprint where I map this leak, rewrite the key sections, and give you a 30-day action plan.
prospects/scorpion-technology|LOOM_URL|approved|The page has strong industry proof for healthcare, CPA, property management, and professional services, but those paths could be more directly converted into dedicated buying flows from the first screen.|Protect sales time by sending better-fit visitors toward Services, Managed IT Services, VoIP Services with a clearer reason to act.|Turn the strongest industry proof into a clearer route: "Choose your industry" plus one proof block and CTA per path.|If useful, I can run a 7-day sprint where I map this leak, rewrite the key sections, and give you a 30-day action plan.
prospects/stradiant|LOOM_URL|approved|The page opens with a broad cyber-disaster warning before making the core buying path clear: managed IT, cybersecurity, or assessment.|Protect sales time by sending better-fit visitors toward Services, Contact, Call Us Now with a clearer reason to act.|Make the homepage own one primary intent, then route buyers into Managed IT, Cybersecurity, and Assessment paths with proof and FAQ support.|If useful, I can run a 7-day sprint where I map this leak, rewrite the key sections, and give you a 30-day action plan.
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
| Scored prospects | 5 |
| Looms recorded | 0 |
| Sends | 0 |
| Replies | 0 |
| Calls | 0 |
| Closed | 0 |
| Clients ready | 0 |
