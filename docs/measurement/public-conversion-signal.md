# Public conversion signal contract (The Website Correction application route)

Scope: read-only measurement of which public page pointed a visitor to The
Website Correction application route. This layer does not deploy, send, or
collect anything. It does not change pricing or legal copy, does not touch
auth, payments, or leads, and does not depend on PR #10's public copy.

## Signal source

A Website Correction CTA is any public link that routes to the application
route (the contact page application section or the application email route)
or carries a `data-measure-source` marker. Every such CTA must carry an
explicit stable source tag naming its placement.

Canonical stable source names:

| Name | Placement | State in this checkout |
| --- | --- | --- |
| `homepage-hero` | Website Correction CTA in the homepage hero rail | Defined; no live CTA (PR #10 copy not merged) |
| `homepage-service` | Website Correction CTA in the homepage managed-service section | Defined; no live CTA (PR #10 copy not merged) |
| `homepage-footer` | Website Correction CTA in the homepage footer | Defined; no live CTA |

Names are used only when they correspond to a real Website Correction CTA;
a name with no live CTA is dormant, not attached to unrelated links. In this
checkout the homepage has no Website Correction CTA: the "Ask about 0509" and
footer "0509" links are product CTAs (0509 is a product, not The Website
Correction) and must never carry a Website Correction source name. Any new
placement needs a new registered name, added here, to the allowlist in
`public/contact/index.html`, and to `scripts/test-public-conversion-signal.mjs`.

## Offer naming

The application route names the offer exactly as the public copy does:
The Website Correction. It is never presented as a generic "reviewed
service"; the human-reviewed nature of the offer is described in words
("reviewed by a human"), not used as a substitute offer name. The application
subject line is the operator-visible measurement signal: it names The
Website Correction and, when a marker is present, the source tag, so the
operator reads the signal directly in the received application email. The
default subject is exactly `The Website Correction application`; with a
marker present it becomes `The Website Correction application — from <name>
(internal measurement marker)`.

## Marker mechanics

- CTA side: `data-measure-source="<name>"` on the anchor, routing to
  `/contact/?source=<name>` or to the application mailto route with the
  source name visible in the subject line.
- Endpoint side: `public/contact/index.html` reads the `?source=` parameter,
  accepts only registered names, and prefills the application email subject
  as `The Website Correction application — from <name> (internal measurement
  marker)`. The prefilled subject is the human-readable, manual measurement
  signal; it is visible in the email client before sending, and the visitor
  can edit or remove it.
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
applicant voluntarily includes in the subject line of the email they send to
`support@tinystudio.in`; that email is governed by the studio inbox policy and
is not processed automatically.

## Privacy boundary

- No analytics provider, no cookies, no fingerprinting, no hidden fields, no
  message-content collection.
- The marker is a first-party URL parameter and email subject prefill the
  visitor can see, edit, or remove before sending. Removing it never blocks
  the application.
- The disclosure about the marker sits on the contact page next to the
  application route, where the visitor actually encounters the marker, and
  states that it is for internal measurement only and that nothing is sent
  until the visitor sends the email themselves.
- `public/privacy-choices/index.html` needs no change: this layer collects
  nothing and offers no data choices, so there is nothing to opt out of there.
  The privacy-choices page documents app-related data requests; this layer
  does not create app data or choices, and the contact-page disclosure already
  covers the only visitor-visible behavior this layer introduces.

## Honesty

Static-site source tagging is not proof of completed applications; only received human messages count as completion evidence.
A tag being present or a link being opened proves nothing about completion.

## Falsifiable decision rules

1. The tag pipeline is falsified iff any Website Correction CTA exists on the
   public homepage without a registered `data-measure-source` tag, or the
   contact endpoint fails to propagate an accepted source into the visible
   prefilled subject line. `scripts/test-public-conversion-signal.mjs`
   enforces this rule deterministically and fails when it breaks.
2. A completed application is counted only when a received human message
   arrives in the studio inbox. If an application email arrives whose subject
   carries no registered source name, the propagation rule is falsified and
   the contact wiring must be re-verified before any conversion conclusion is
   drawn. Under this rule, "no tagged clicks" and "no applications" are both
   observable, and either direction can be disproven by a single counterexample.

## Review dispositions

### 2026-08-11 — "homepage is missing the entire `<section id="managed-service">` block on the live site"

Grok live-review finding, dispositioned by the tinystudio-in lane (2026-08-11):
the live homepage has no managed-service section while the merged homepage on
main carries one. Verdict: **intended, snooze honored — not a regression.**

- The managed-service buyer path (PRs #10/#11) is snoozed-by-Nish (2026-08-08:
  do not build, publish, or deploy it without his explicit yes).
- The release lane strips the entire section (and every buyer-path marker)
  from the publishable bundle via `scripts/prepare-public-deploy-bundle.mjs`
  (fail-closed in both directions), and the live deploy check asserts its
  absence explicitly (`id="managed-service"` in
  `scripts/check-public-live-deploy.mjs`, mirrored by
  `scripts/test-public-deploy-bundle.mjs`).
- Live evidence 2026-08-11: `https://tinystudio.in/` contains no
  `id="managed-service"`, no "Website Correction", no "website-correction",
  and no `data-measure-source`. (The live site is still the 2026-06-20 bundle
  07acd07, which predates PR #10; the filter would strip the section even on a
  fresh deploy.)
- The section returns only when Nish lifts the snooze; the fail-closed filter
  is then updated deliberately, never silently.
