# Public Conversion Signal (measurement layer)

Status: active (measurement only, read-only, no deployment, no communications,
no message-content collection)

## Purpose

TinyStudio.in is a human-reviewed managed service. This document is the contract
for the measurement layer that observes which reviewed-service call-to-action
(CTA) on the public homepage sent a visitor to the reviewed application/contact
path. It is deliberately separate from public copy work: it does not change what
the homepage promises or how the reviewed service is described, and it adds no
pricing or legal claims.

The whole signal is read-only: it adds first-party URL parameters and HTML
marker attributes, and nothing on the site sends, submits, or stores anything
on its own.

## Signal source

The registry below is the single source of truth for reviewed-service CTA
source markers. A source slug is stable (it must not be reused for another CTA)
and lowercase (`^[a-z0-9-]+$`).

| Source slug | Homepage CTA | Route | Marker |
| --- | --- | --- | --- |
| `homepage-service` | Teams lane "Ask about 0509" button | `/contact/?src=homepage-service` | `data-measure-source="homepage-service"` |
| `homepage-footer` | Footer "0509" link | `/contact/?src=homepage-footer` | `data-measure-source="homepage-footer"` |

Every reviewed-service CTA on the homepage carries its marker attribute and
routes to the contact endpoint with its `src` parameter. Generic contact links
(such as the "Contact" nav and footer entries) are not reviewed-service CTAs and
carry no marker. New reviewed-service CTAs must be added to this registry and
mirrored in `scripts/test-public-conversion-signal.mjs` before they ship.

## Owner

TinyStudio founder (single operator). The owner is responsible for adding or
retiring source slugs, reviewing the falsifiable decision rule below, and
keeping the registry and the test in sync.

## Retention

The `src` parameter is ephemeral page state: it is never persisted by the site,
never logged by the site, and no analytics provider or cookie is involved. If a
visitor contacts TinyStudio by email, the source may be kept only as part of the
human conversation record the visitor themselves creates. Retired source slugs
should be removed from the registry in the next deploy after retirement.

## Privacy boundary

- No analytics provider, cookie, fingerprinting, hidden field, or
  message-content collection is added or allowed on the owned public pages.
- The signal is first-party and human-readable (`?src=homepage-service`).
- Nothing auto-sends or auto-submits; the contact page states explicitly that
  the signal is for internal measurement only.
- Mentioning where they came from is optional for visitors and never required.

## Honesty about evidence

Static-site source tagging is not proof of completed applications. A source
marker only records that a CTA was written to point at the contact endpoint; it
cannot observe what happens after the visitor leaves the page. Only received
human messages (an email, reply, or other human contact that references the
source or the application) count as completion evidence for the reviewed
service.

## Falsifiable decision rule

After at least 30 calendar days with a registry entry live in production, if
zero received human messages reference that entry's source (by URL, parameter,
or page), the source tagging is judged ineffective for that CTA, and the entry
must be reworked or removed. The rule is falsifiable: a single received human
message referencing the source keeps the entry valid; the absence of any such
message for 30+ days invalidates it.

## Verification

`node scripts/test-public-conversion-signal.mjs` validates that every signal
definition, homepage CTA marker, route, source propagation note, privacy
constraint, and documentation decision rule stays in sync. It is wired into
`npm test`.
