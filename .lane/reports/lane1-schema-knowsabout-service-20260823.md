# Lane 1 evidence: knowsAbout + Service schema (item 51e086a128)

Branch: `lane1-schema-knowsabout-service-20260823`

## What changed

### 1. Organization `knowsAbout` on all 13 static pages

Added the same eight-topic `knowsAbout` array immediately after each page's existing Organization `description` in every `public/**/index.html` file.

Copy traceability (visible page copy sources):

| Topic | Source page copy |
|---|---|
| Promptly | Product names on homepage, product pages, support meta |
| Drishti | Product names on homepage, product pages, support meta |
| 0509 | Product names on homepage, product pages, support meta |
| The Website Correction | Product/service name on compare page, contact page, homepage JSON-LD |
| bookings and no-show prevention for solo professionals | `public/promptly/index.html` + `public/contact/index.html` ("bookings and no-show prevention") |
| mindful screen time | `public/drishti/index.html` + support meta ("mindful screen time") |
| competitor monitoring for growth teams | `public/index.html` ("Competitor monitoring for growth teams that want evidence") |
| one-page website correction sprints | `public/compare/index.html` ("The Website Correction is a focused one-page sprint") |

### 2. Homepage Service node (`public/index.html` only)

Appended one `Service` node to the homepage `@graph` after the WebPage node:

- `@id`: `https://tinystudio.in/#website-correction-service`
- `name`: The Website Correction
- `serviceType`: Website correction
- `provider`: Organization reference
- `description`: verbatim sprint copy from `public/compare/index.html` (human-reviewed one-page sprint, fault map, Loom, measurement plan, 14-day tracking, etc.)

No `url`, `offers`, `areaServed`, or other properties (homepage-only safe minimum per verdict).

### 3. Extended `scripts/test-public-structured-data.mjs`

Added pinned constants, section B5 (studio-wide `knowsAbout` on every public page Organization), and section B6 (homepage Service node exact-match guard).

## Verification

### `node scripts/test-public-structured-data.mjs` (PASS)

```
B5. every public page Organization carries the studio-wide knowsAbout list
  ok public/compare/index.html Organization knowsAbout matches the studio-wide topic list exactly (order included)
  ok public/contact/index.html Organization knowsAbout matches the studio-wide topic list exactly (order included)
  ok public/drishti/index.html Organization knowsAbout matches the studio-wide topic list exactly (order included)
  ok public/drishti/privacy/index.html Organization knowsAbout matches the studio-wide topic list exactly (order included)
  ok public/drishti/support/index.html Organization knowsAbout matches the studio-wide topic list exactly (order included)
  ok public/index.html Organization knowsAbout matches the studio-wide topic list exactly (order included)
  ok public/privacy/index.html Organization knowsAbout matches the studio-wide topic list exactly (order included)
  ok public/privacy-choices/index.html Organization knowsAbout matches the studio-wide topic list exactly (order included)
  ok public/promptly/index.html Organization knowsAbout matches the studio-wide topic list exactly (order included)
  ok public/promptly/privacy/index.html Organization knowsAbout matches the studio-wide topic list exactly (order included)
  ok public/promptly/support/index.html Organization knowsAbout matches the studio-wide topic list exactly (order included)
  ok public/support/index.html Organization knowsAbout matches the studio-wide topic list exactly (order included)
  ok public/terms/index.html Organization knowsAbout matches the studio-wide topic list exactly (order included)
B6. the homepage graph declares The Website Correction as a Service node
  ok homepage JSON-LD graph carries exactly one Service node
  ok homepage Service node @id matches the pinned website-correction service id
  ok homepage Service node name matches The Website Correction
  ok homepage Service node serviceType matches Website correction
  ok homepage Service node provider references the Tiny Studio organization
  ok homepage Service node description matches the pinned sprint copy
  ok homepage Service node carries only the six pinned properties
187 checks, 0 failures
```

### `rg -c '"knowsAbout"' public -g 'index.html' | wc -l`

`13` (PASS)

### Deploy-bundle CI conflict (pre-existing snooze vs this packet)

`node scripts/test-public-deploy-bundle.mjs` fails after this change because `scripts/prepare-public-deploy-bundle.mjs` treats any `Website Correction` substring in the publishable bundle as a forbidden snoozed marker (`FORBIDDEN_MARKERS`), while this packet pins that exact string in JSON-LD `knowsAbout` and the homepage `Service` node. That script is outside this packet's owned files. `npm test` / `npm run ci` therefore fail at the deploy-bundle step until a follow-up updates the snooze filter to strip or allow structured-data entity signals separately from the snoozed buyer-path HTML.

## Follow-up fleet item required: /support/ deploy-time schema degradation

> `scripts/prepare-static-site-bundle.mjs` injects a second, template-built
> Organization block onto `/support/` at deploy time (`addSupportSchema`,
> `data-page-schema="support"`). Its `supportSchema` constant lacks the
> `alternateName` ("tinystudio.in") and the enriched `description` that the
> checked-in `public/support/index.html` block carries, and the script strips
> the checked-in block before re-injecting the thinner template version, so
> `npm run site:prepare` silently degrades the live support-page entity. File
> and fix this as its own fleet item; deliberately NOT fixed in this packet.
