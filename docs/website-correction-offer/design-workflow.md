# The Website Correction — public offer surface (design workflow record)

This document records the design-workflow steps for the public sales surface
(homepage repositioning + one offer page) that the mandatory site-design
pipeline (`~/.claude/rules/common/design-workflow.md`) requires BEFORE any
production code. It is the human-review artifact for the conversion surface.

Status: PR-only, never merged. The conversion surface needs human review
before it can ship.

---

## 1. References first

Tool note: the workflow names Mobbin MCP for reference gathering. Mobbin is not
available in this environment, so references are shortlisted from working
knowledge of the buyer's world (founder-led Managed IT / MSP / cybersecurity
companies and the professional-services landing pages that convert them). The
reference logic — pick for the business job, not beauty; remix at least three;
no single reference dominates; never copy a layout, brand, or copy — is
followed and each ingredient is called out below.

### Chosen for the business job (6)

1. **MSP "one-page rescue" consultancies** — a single clear service with a
   stated scope and price, no catalog. Kept: single-offer focus, explicit
   scope list, one ask.
2. **Founder-led security/business continuity firms** — trust-first, calm,
   "we are a real human you talk to." Kept: human-first language, calm trust,
   named human review.
3. **Agency "we fix your landing page" offer pages** — before/after framing
   and a clear "what you get" section. Kept: proof-first framing, numbered
   deliverable list.
4. **Premium professional-services pricing pages** — one price stated plainly
   with the conditions (limited seats) spelled out. Kept: honest price line
   with explicit first-3-clients condition.
5. **Diagnostic-first SaaS audit pages** — start from the buyer's painful
   question, then present the offer as the fix. Kept: question-led hero.
6. **Calm editorial studio sites** (existing Tiny Studio system) — warm
   paper, one teal accent, wide comfortable measure. Kept for cohesion
   (whole-funnel rule): the offer page must read as part of the same site.

### Anti-references (2, what to avoid)

- **"AI agency" hype pages** — purple-blue gradients, "unlock exponential
  growth," floating robo-chat. Rejected: no gradients, no growth hype, no
  unsourced "AI" positioning (the offer is human-reviewed, not a magic engine).
- **Template SaaS marketing sites** — generic hero + three identical cards +
  grid of logos. Rejected: no equal repeated card grids, no fake logos, no
  "trusted by 10,000" claims (PRODUCT.md supports no such evidence).

### Remix decision
Remix 1 (single offer + scope), 3 (before/after + numbered deliverables), and
4 (honest price + conditions) into one page, on top of reference 6 (existing
studio system). Reference 2 and 5 inform the voice (human-first, diagnostic)
more than the layout.

---

## 2. Three directions before code

Each is rendered as a real HTML concept page in Chrome at 1440px and
screenshotted (see `concepts/`). This is the required format — not inline
chat-widget mockups — because it preserves typography and scale.

### Direction A — "The quiet specialist" (safe)
References: 2, 4, 6. Kept: calm trust, honest price, studio system. Rejected:
before/after boldness, diagnostic hooks.
Why: lowest risk, closest to the current studio voice; would read as a
polished sub-page, not a landing page.

### Direction B — "The proof-first correction" (bold)
References: 1, 3, 4, 6. Kept: single offer, numbered deliverable pipeline,
before/after framing, honest price. Rejected: the quiet hero.
Why: makes the offer LAND — first viewport names the buyer, the service, and
the one action; scope is a numbered pipeline; price is unmissable.

### Direction C — "The one-page clinic" (weird-but-plausible)
References: 5, 2, 1. Kept: diagnostic-first question hero, correction/field-
notes motif. Rejected: standard hero/card layout.
Why: distinctive and memorable, but higher risk the motif reads gimmicky to a
founder who wants a serious MSP purchase.

### Decision
**Winner: Direction B**, pulled slightly toward A's calm trust for the body
(keep the studio warmth, keep the human-review emphasis). The workflow says a
tasteful-but-quiet winner must be pushed louder before settling; Direction A
was that quiet candidate, and B is the louder, more conversion-honest variant.
C is rejected as the primary because the clinic motif adds risk without a
clear buyer-job payoff, but its "start from the buyer's question" hook is
borrowed into the B hero sub-copy.

---

## 3. Build brief (before code)

### Section order (offer page)
1. **Hero** — buyer named ("for founder-led MSP companies"), offer named, one
   CTA ("Apply by email"), honest human-review note. Question-led sub-copy.
2. **Fit line** — who this is for and what "a fit" means (one page where
   clarity/trust/readiness is the constraint).
3. **Scope pipeline** — the fixed scope as a numbered, ordered list (fault
   map, rewrite or redesign, implementation pass or dev-ready handoff,
   search-trust basics, before/after proof, Loom walkthrough, measurement
   plan, one revision, 14-day implementation tracking).
4. **Price + how day 0 works** — $1,000 founder pilot, first 3 clients, and
   the day-0 gates (payment, context, approval owner, implementation owner).
5. **No-guarantee boundary** — honest statement that TinyStudio makes no
   revenue/ranking/conversion guarantees (PRODUCT.md truth).
6. **Apply** — mailto route (same measurement contract as the homepage).

### Above-fold composition (desktop 1440)
- Header (shared chrome).
- Left: eyebrow + H1 + lead + CTA. Right: a dark scope card with the price and
  "first 3 clients" line.
- No image above the fold (none of the claims are visual proof we can ship).

### Typography rhythm
- Keep the existing studio serif-less system stack and wide measure (cohesion).
- Big H1, generous vertical rhythm, one teal accent (`#1f7268`).

### One accent color
`--accent: #1f7268` (existing). One use: primary CTA + eyebrow + key price line.

### CTA hierarchy
- Primary (one): "Apply by email" → mailto with the Website Correction subject.
- Secondary: "How it works" anchor; tertiary links to support/contact.

### Proof architecture (only sourced claims)
- No testimonials, no revenue/ranking/conversion claims, no "trusted by."
- Proof = the fixed scope list (PRODUCT.md) + the human-review gate (PRODUCT.md)
  + the honest no-guarantee boundary.

### Mobile behavior
- Single column, hero stacks above the dark price card, scope pipeline keeps
  its numbering, CTAs ≥24px tap targets (shared rule), no horizontal scroll.

### Performance budget
- No external fonts or scripts; static HTML + existing styles.css + one inline
  measurement script (shared with the contact page contract).

---

## 4. Homepage repositioning (brief)

- Lead the first viewport with the managed-service offer (buyer named, offer
  named, one CTA) instead of the app catalog.
- Keep the portfolio (Promptly, Drishti, 0509) as a clearly secondary "the
  studio's products" section.
- Fix `<title>` and meta so the homepage no longer reads as "Promptly, Drishti,
  and 0509" only.
- Preserve the brand-disambiguation statement and the site-wide invariants
  (exactly one JSON-LD block, one H1, 24px tap targets, shared chrome).

---

## 5. Screenshots

The three concept directions are rendered at 1440px and saved in
`docs/website-correction-offer/concepts/`:
- `direction-a-quiet-specialist.png`
- `direction-b-proof-first.png`
- `direction-c-one-page-clinic.png`
