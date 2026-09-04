# Public conversion signal contract (The Website Correction path)

Scope: read-only measurement of which public page pointed a visitor to the
application route for The Website Correction. This layer does not deploy,
send, or collect anything. It does not change pricing or legal copy, does not
touch auth, payments, or leads, and does not depend on the public homepage
copy (PR #10) being merged.

## Offer naming

The measured offer is named **The Website Correction** everywhere in this
layer, matching the repo truth in `PRODUCT.md`, `growth-brain/`, and the
message house: this is a human-reviewed managed service, never a generic
label. The operator-visible measurement signal is the received application
email itself: its subject line (the offer name plus an optional source
marker) and its body. This layer adds no pricing, legal terms, or outcome
promises; the subject line only identifies the offer and, when present, the
referring placement.

## Signal source

A Website Correction CTA is any public link that routes to the application
route (the contact page application section or the application email route)
or carries a `data-measure-source` marker. Every such CTA must carry an
explicit stable source tag naming its placement.

Canonical stable source names:

| Name | Placement | State in this checkout |
| --- | --- | --- |
| `homepage-hero` | Website Correction CTA in the homepage hero rail | Defined; no live CTA (homepage copy not merged) |
| `homepage-service` | Website Correction CTA in the homepage managed-service section | Defined; no live CTA (homepage copy not merged) |
| `homepage-footer` | Website Correction CTA in the homepage footer | Defined; no live CTA |

Names are used only when they correspond to a real Website Correction CTA;
a name with no live CTA is dormant, not attached to unrelated links. In this
checkout the homepage has no Website Correction CTA: the "Ask about 0509"
button, the app product links, and the footer "support@tinystudio.in" link
are product or support CTAs (0509 is a product, not The Website Correction)
and must never carry a Website Correction source name. Any new placement
needs a new registered name, added here, to the allowlist in
`public/contact/index.html`, and to `scripts/test-public-conversion-signal.mjs`.

## Marker mechanics

- CTA side: `data-measure-source="<name>"` on the anchor, routing to
  `/contact/?source=<name>` or to the application mailto route with the
  source name visible in the subject line.
- Endpoint side: `public/contact/index.html` reads the `?source=` parameter,
  accepts only registered names, and prefills the application email subject
  as `The Website Correction application — from <name> (internal measurement marker)`.
  Without a marker the subject is simply `The Website Correction application`.
  The prefilled subject is the human-readable, manual measurement signal.
- Nothing auto-sends or auto-submits: the route is a plain `mailto:` link the
  visitor opens and sends themselves. There is no form, no hidden field, no
  script-triggered navigation.

## Owner

The Tiny Studio operator (the repo operator) owns this signal contract and is
the only reader of the measurement signal. Interpretation happens only during
manual review of received application emails; no automation reads, tallies, or
acts on the signal.

## Retention

The static site stores nothing: this layer adds no cookie, no server log, no
client-side storage, and no third-party request. The only retention is what an
applicant voluntarily includes in the subject line and body of the email they
send to `support@tinystudio.in`; that email is governed by the studio inbox
policy and is not processed automatically.

## Privacy boundary

- No analytics provider, no cookies, no fingerprinting, no hidden fields, no
  message-content collection.
- The marker is a first-party URL parameter and email subject prefill the
  visitor can see, edit, or remove before sending. Removing it never blocks
  the application.
- `public/privacy-choices/index.html` documents this marker mechanism
  narrowly in its "Current setup" card. No data choices are offered because
  the layer collects nothing; the contact page carries the full disclosure
  where the marker is applied.

## Honesty

Static-site source tagging is not proof of completed applications; only received human messages count as completion evidence.
A tag being present or a link being opened proves nothing about completion.

## Falsifiable decision rules

1. The tag pipeline is falsified iff any Website Correction CTA exists on the
   public homepage without a registered `data-measure-source` tag, or the
   contact endpoint fails to propagate an accepted source into the visible
   subject line. `scripts/test-public-conversion-signal.mjs` enforces this
   rule deterministically and fails when it breaks.
2. A completed application is counted only when a received human message
   arrives in the studio inbox. If an application email arrives whose subject
   carries no registered source name, the propagation rule is falsified and
   the contact wiring must be re-verified before any conversion conclusion is
   drawn. Under this rule, "no tagged clicks" and "no applications" are both
   observable, and either direction can be disproven by a single counterexample.
