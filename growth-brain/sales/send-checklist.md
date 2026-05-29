# Send Checklist

Use this immediately after a Loom is recorded.

## Goal

Send the right message through the right channel, then update the pipeline so follow-ups happen on time.

## Order

1. Paste the Loom link once and create the send package:

```bash
npm run prospect:send-prep -- prospects/prospect-slug https://www.loom.com/share/... --approved
```

The link must be a real Loom `share` or `embed` URL. The send-prep commands reject generic web links so the wrong URL cannot be sent by accident.

For batch recording, copy the Loom-link sheet from the mission page and run:

```bash
npm run market:after-recording -- --from-clipboard
```

The post-recording command accepts URL-only lines in the same order as `prospects/loom-links.txt`, or rows like `prospects/prospect-slug|https://www.loom.com/share/...`. It preserves the existing proof notes, prepares send packages, refreshes the outbox, refreshes the proof cockpit, and does not mark anything sent.

2. Open `send-package.md` in the prospect folder, or `prospects/batch-send-package.md` after batch prep.

3. Send based on the package's channel guidance:

- If `send:setup` is clean: use the best available route.
- If `send:setup` warns: use `Contact Form Version` or `DM Version` first.
- Email uses `Subject` and `Body`, but only after sender setup is clean.
- While `send:setup` warns, the outbox and pipeline stage commands block email as a send channel unless you use `--force` for explicit recovery.

4. Mark the send with the channel actually used:

```bash
npm run prospect:stage -- prospects/prospect-slug sent --channel contact-form
npm run prospect:stage -- prospects/prospect-slug sent --channel dm
npm run prospect:stage -- prospects/prospect-slug sent --channel email
npm run prospect:stage -- prospects/prospect-slug sent --channel linkedin
npm run prospect:stage -- prospects/prospect-slug sent --channel x
npm run prospect:stage -- prospects/prospect-slug sent --channel phone
```

Use the exact route actually used. The outbox supports contact form, DM, LinkedIn, X, phone, mixed, other, and email so follow-ups start from the right place. Email appears only after sender setup is clean.

For batches, only mark the whole batch after every message has actually been sent. In `prospects/outbox.html`, choose the channel actually used for each prospect, copy the batch sent sheet, then run:

```bash
npm run prospect:batch-sent -- --from-clipboard
```

This command refuses to advance prospects unless each row already has a ready, Loom-approved `send-package.md` with the same Loom URL. Follow-ups are scheduled in business days, not weekends, and early follow-up stage commands are blocked unless explicitly forced for recovery.

The channel is saved into `pipeline.json` so follow-ups can start from the last working route instead of treating every prospect like email.

5. Review what the market taught us:

```bash
npm run market:learn
```

Use that review before changing lead fit, Loom hook, first message, or send channel. It keeps the next batch tied to evidence, not reaction.

6. Check tomorrow's work:

```bash
npm run growth:today
```

## Rules

- Do not send while `send-package.md` lists warnings.
- Every first send and follow-up must include a simple no-follow-up option.
- Use accurate sender information, honest subjects, and a real reply path.
- Do not scale volume until domain authentication, opt-out handling, and sender address are configured.
- Do not paste the long email body into a small contact form.
- Do not promise revenue, rankings, ROAS, conversion lift, or sales volume.
- If a prospect replies, run `npm run prospect:reply-prep -- prospects/prospect-slug`.

Source rules to keep in mind:

- FTC CAN-SPAM guide: https://www.ftc.gov/business-guidance/resources/can-spam-act-compliance-guide-business
- Google sender guidelines: https://support.google.com/a/answer/81126

Run before a sending session:

```bash
npm run send:setup
npm run send:guide
npm run send:check
```

`send:setup` checks the configured sender email, physical postal address, manual daily cap, SPF, DMARC, and DKIM selector. If it warns, run `send:guide` and use contact forms or DMs until email setup is fixed. Email send buttons and email stage commands stay blocked while those warnings remain.

The outbox and each `send-package.md` now repeat this guidance so the sending step cannot silently drift back to cold email while setup is incomplete.

## Next Step

After sending, run `npm run growth:today` and follow the next due action.
