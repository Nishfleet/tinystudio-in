# Loom Audit Workflow

## Goal

Make the prospect feel: "They understand my business and showed me something fixable."

Default cold Loom length: 2-3 minutes. One leak, one buyer impact, one first fix, one clear ask.

## Prep

- Run `npm run growth:start -- --view=record` first. It creates `prospects/loom-links.txt` for the current queue and refreshes the mission, rehearsal check, teleprompter, market-proof cockpit, outbox, follow-up, and sales pages.
- Do not record until `prospects/recording-rehearsal-check.html` says the batch is ready.
- Run `npm run prospect:prep-recording -- --limit=5` before a recording block. It checks sites, pulls live page snapshots, refreshes contact plans, generates sharpness briefs, refreshes recording scripts, and rebuilds the queue, cockpit, teleprompter, and mission.
- After recording, copy either the Loom URLs in order or rows like `prospects/prospect-slug|https://www.loom.com/share/...`, then run `npm run market:after-recording -- --from-clipboard`. This updates `prospects/loom-links.txt`, preserves the approved leak, impact, fix, and ask notes, prepares send packages, refreshes the outbox, and refreshes the proof cockpit without marking anything sent.
- Paste only real Loom share or embed URLs into the teleprompter; the approved batch sheet only copies Looms with a valid URL plus leak, impact, fix, and ask checked and written as short notes. Clipboard batch prep rejects rows that are not marked `approved` or do not include the four notes.
- Open the prospect site.
- Open 1-2 competitors.
- Note the main money page.
- Note the clearest leak.
- Decide the wedge: site architecture, product page, landing page, offer, email, or ads.
- Run `npm run prospect:brief -- prospects/prospect-slug` and `npm run prospect:script -- prospects/prospect-slug` if you manually change a prospect. The sharpness brief locks the angle, direct-response slide, So-What chain, and proof guardrails before recording.

## Recording Structure

1. State why the business is a fit.
2. Show the main money page.
3. Show the leak.
4. Explain why it matters for buyers.
5. Show a competitor or reference pattern.
6. Show the first fix you would make.
7. Pitch the Tangible Revenue Leak Sprint + Search Trust Layer.

## B2B Site Architecture Hook

"Your site is trying to communicate too many services at the same level. That makes it harder for buyers, Google, and AI answer engines to understand what you should be known for."

## Ecommerce Hook

"Your product is interesting, but the page is forcing the buyer to do too much work before they understand why this is the right choice."

## Send Message

Subject: Quick audit for [Business]

Hey [Name],

I recorded a short audit for [Business]. The main thing I noticed is [specific leak].

Here is the Loom: [link]

If useful, I can run a Tangible Revenue Leak Sprint + Search Trust Layer where I map the leak, rewrite the key page sections, tighten the search trust layer, and give you a 30-day action plan.

Nish

## Follow-Up

Follow up after 2 business days:

"Worth sending over the exact page structure I would use for this?"

After sending the Loom, run:

```bash
npm run prospect:send-prep -- prospects/prospect-slug https://www.loom.com/share/... --approved
npm run prospect:outbox
```

One-off send prep requires Loom quality approval and refreshes `prospects/outbox.html`, so you can send from the guarded outbox instead of a stale page. Do not mark a prospect sent from the recording screen or recording script; sent stage movement belongs in the outbox after the message was actually sent and the real channel was chosen.

If you recorded several Looms before sending, run:

```bash
npm run market:after-recording -- --from-clipboard
```

Copy the Loom URLs or Loom-link rows from the recording block, run the post-recording prep, then send from `prospects/outbox.html`.
The post-recording prep saves `recording-notes.md` for each approved prospect, includes those notes in `send-package.md`, refreshes the outbox, and refreshes the proof cockpit.

After every message in the batch has been sent:

```bash
npm run prospect:batch-sent -- --from-clipboard
```

In `prospects/outbox.html`, check only the messages actually sent before copying the batch sent sheet. Individual Mark Sent buttons use the same checkbox gate. `batch-sent` checks that each prospect has a ready, Loom-approved send package with the same Loom URL before moving the pipeline.

Then use `npm run growth:today` to see due follow-ups.

If they reply or book:

```bash
npm run prospect:reply-prep -- prospects/prospect-slug
npm run prospect:call-booked-prep -- prospects/prospect-slug --time "add call time" --meeting "add meeting link"
npm run prospect:sales-cockpit
```

Replace `add call time` before running call-booked prep. Placeholder call times are blocked.

After the call:

```bash
npm run prospect:close-prep -- prospects/prospect-slug --price "$1,000" --payment "add payment link"
```

If they buy:

```bash
npm run prospect:stage -- prospects/prospect-slug won --note "Approved sprint"
npm run prospect:convert -- prospects/prospect-slug
```
