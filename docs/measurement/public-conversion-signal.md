# Public conversion signal (read-only, privacy-respecting)

This is the measurement contract for TinyStudio.in's reviewed-service lane: a
read-only, first-party signal that records **which homepage position** a
potential applicant came from when they email the studio inbox about the
human-reviewed service. It is not an analytics product.

## Signal source

- `homepage-hero` — the managed-service link in the hero rail on the public
  homepage (`public/index.html`).
- `homepage-footer` — the managed-service link in the homepage footer
  (`public/index.html`).

Each reviewed-service CTA carries an explicit `data-signal-source` marker and
routes to the reviewed application endpoint
`/contact/?source=<name>#website-correction`. The contact page fills the
application email's subject and body from that first-party `?source=` query
parameter, but only when the value matches the allowlist above. Nothing is
sent or submitted automatically; the applicant presses send in their own mail
client.

The public homepage has exactly two reviewed-service CTAs (hero and footer).
If a CTA is added, it must carry a new stable source name and be documented
here and in `scripts/test-public-conversion-signal.mjs`.

## Owner

The Tiny Studio human operator (Nish) who reads `support@tinystudio.in` is
the owner of this signal. The owner counts received application emails by
source and makes the keep/remove decision below. No other party collects or
receives the signal.

## Retention

The source label lives only inside the received email thread in the studio
inbox (prefilled subject/body line). It is retained as long as the email
thread itself is kept under the studio's normal inbox retention, and is
deleted with it. There is no separate database, log file, or cookie that
stores source labels, and no third party receives them.

## Privacy boundary

- First-party URL parameter and prefilled email fields only.
- No analytics provider, no cookies, no fingerprinting, no hidden fields, and
  no automated collection of message content.
- The source label is visible to the applicant in their mail client before
  they press send.
- The public statement of this boundary lives on `/privacy-choices/`.

## What counts as evidence

Static source tagging is **not proof of completed applications**. The tag
only records which homepage position opened the email. Completion evidence is
a **received human message**: an application email from a real person that
lands in the studio inbox and is answered by a human. Click counts, opened
mailto links, and page views are never treated as completion evidence.

## Decision rule (falsifiable)

The owner counts received human application emails by source label each week
in the studio inbox.

- A source that produces **zero** received application emails over 60
  consecutive days is removed from the homepage (or moved to the contact page
  only) by the owner.
- If both sources together produce zero received application emails over 90
  consecutive days, the reviewed-service homepage lane is removed until the
  offer is re-evaluated by a human.
- The rule is falsifiable: it fails if a source keeps its homepage placement
  after 60 days with zero received application emails, or if the lane stays
  after 90 days with zero received application emails.

The rule never triggers autonomous action; removal decisions are made by the
human owner.
