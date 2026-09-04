# Public conversion signal (measurement layer)

Read-only, privacy-respecting conversion signal for TinyStudio.in's
reviewed-service path. This layer records *intent to apply* only; it cannot
prove that an application was completed.

## Signal name

`public-conversion-signal` — a first-party source marker carried on the
reviewed-service CTA route of the public homepage, preserved as a
human-readable manual note on the contact/application page.

## Source registry

Stable source names. A name may only be used when it corresponds to a real
reviewed-service CTA in the current public homepage checkout.

| Source name | Location | Meaning |
| --- | --- | --- |
| `homepage-hero` | Homepage hero action row | Reviewed-service CTA at the top of the homepage |
| `homepage-service` | Reserved for the homepage managed-service section | Reviewed-service CTA inside the service section (add together with that section) |
| `homepage-footer` | Homepage footer, For teams column | Reviewed-service CTA in the footer |

## Markers and routing

- Every reviewed-service CTA is an anchor carrying
  `data-signal-source="<name>"` and `data-signal-event="reviewed-service-apply"`,
  routing to `/contact/?source=<name>`.
- The `source` URL parameter is the only propagation channel: first-party,
  read-only, and validated on the contact page with `^[a-z0-9-]{1,40}$`.
- The contact page preserves the source as a manual, human-readable signal: an
  "internal measurement only" notice plus a prefilled subject/body on the
  application link (`mailto:support@tinystudio.in?subject=Website%20Correction`).
  Nothing is auto-sent or auto-submitted; the visitor chooses to send.
- Portfolio CTAs (for example the 0509 product links) never carry signal
  markers.

## Owner

Tiny Studio (Nish). This contract lives in this repository, and the
deterministic test `scripts/test-public-conversion-signal.mjs` enforces it.

## Retention

The `source` URL parameter is transient: it lives only in the visitor's browser
during the visit and is never stored server-side. If a visitor sends the
prefilled email, the source may appear in the received message's subject or
body and is then subject to the studio inbox's ordinary retention; no separate
copy is made.

## Privacy boundary

No analytics provider, no cookies, no fingerprinting, no hidden fields, and no
message-content collection. The public pages covered by the test contain no
external scripts and no tracking APIs. The signal is opt-in by construction: it
exists only when a visitor chooses to send an email.

## Honesty boundary

Static-site source tagging is not proof of completed applications. A routed
link only records where a visitor came from. Only received human messages
(email received at the application inbox) count as completion evidence.

## Falsifiable decision rule

The signal is worth keeping if it produces usable source attribution for the
reviewed-service path. It is falsified — and must be reviewed or retired before
further investment — if, over any rolling 8-week window after activation, fewer
than 20% of received Website Correction applications include a known source
marker (a `homepage-*` name) in the message subject or body, or if no human
reviewer ever uses the source to inform a fit decision. Thresholds are the
owner's to tune; the rule itself must stay falsifiable.
