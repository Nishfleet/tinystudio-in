# Mobbin Pro Design System Proving Lab

Date: 2026-05-18
Status: active workflow correction

Architecture blueprint: `docs/MOBBIN_PRO_DESIGN_SYSTEM_ARCHITECTURE_2026-05-18.md`

## Why This Exists

The earlier public-page experiment failed the taste check because the workflow proved process artifacts, not a repeatable design outcome.

For a self-serve design system, one good page is not proof. The system has to create consistently strong outputs across different businesses, with real visual variability and saved evidence every time.

The design system is not a fixed visual template. It is the Mobbin Pro reference-led workflow:

1. take the specific business
2. build a fresh Mobbin search brief for that niche, business model, visitor decision, and page job
3. pull fresh Mobbin Pro website references broadly across every required angle
4. save the full raw Mobbin metadata locally in a raw pull log
5. compress that raw pool into 12-20 raw packet candidates with query logs
6. shortlist 6-8 best-fit references and at least 2 anti-references
7. extract a full ingredient ledger, not just the visible style layer
8. choose the strongest ingredients that work together
9. remix them into a source-backed direction for that specific business
10. build, screenshot, score, and reject anything below the bar

The ingredient ledger must cover:

- business job, visitor decision, and buying hesitation
- information architecture, section order, and navigation
- content strategy, voice, tone, labels, and microcopy
- typography, spacing, layout, grid, and responsive behavior
- color, surfaces, depth, shape, borders, and radius
- component anatomy and component states
- interaction model, motion, focus, keyboard path, and touch behavior
- media direction, photo rules, iconography, illustration, and no-photo motif
- proof architecture, CTA system, forms, errors, loading, and success states
- accessibility, localization, SEO/AEO metadata, performance, tokens, and governance

## New Standard

The Mobbin Pro workflow passes only when it can produce a benchmark set of previews that are:

- commercially strong
- source-backed
- mobile-readable
- truthful about proof and photos
- visibly specific to the business
- materially different from each other
- approved or rejected with screenshot evidence

## Real Variability Gate

Every generated design must differ in at least six major dimensions:

- structure: hero composition, grid logic, section shapes, and scrolling rhythm
- typography rhythm: scale, weight, density, hierarchy, and label treatment
- media treatment: photo crop, no-photo visual, artifact frame, collage, editorial image, or service menu emphasis
- CTA layout: booking/contact placement, sticky action, inline form, service-specific CTA, or proof-led CTA
- section order: what appears first, what is delayed, and how proof/services/contact are sequenced
- proof presentation: reviews, service proof, process proof, visual proof, owner trust, location proof, or no-proof hold state
- interaction details: hover/focus behavior, accordions, selectors, contact flows, mobile navigation, and error/empty states when relevant

The system fails if the designs only vary by:

- colors
- fonts
- copy swaps
- card order
- background texture
- icon changes
- generic hero plus three cards
- the same layout with different business data

Every benchmark run must record which Mobbin Pro references were used, which ingredients were selected, which ingredients were rejected, and why the final combination belongs together.

## Fresh Reference Packet Gate

The benchmark businesses can stay stable. The Mobbin references cannot.

Every actual redesign and every proving-lab run must create a fresh per-business reference packet:

- timestamped search brief
- exact Mobbin queries by angle: niche, page job, tone, and constraint
- raw pull log with the full Mobbin MCP result metadata saved locally
- broad raw pool: at least 32 returned screens and 20 unique screens before compression
- raw Mobbin packet candidates: 12-20 screens selected from the raw pull log
- shortlisted references: 6-8 screens
- rejected or anti-references: at least 2 screens
- raw-pull-log hash
- fit scores for job, niche, first viewport, CTA, proof, mobile transfer, distinctiveness, buildability, and truth
- structure family, proof pattern, CTA pattern, media assumption, and interaction notes
- selected and rejected ingredients
- no-copy restrictions
- stale-reference limit

The system fails if it relies on hardcoded Mobbin screens from an older run, a static reference bank, or a packet whose business hash, search-brief hash, or timestamp no longer matches.

The system also fails if it narrows the research just to keep the conversation clean. The full pull belongs in `raw-pull-log.json`; the chat and report should show only counts, hashes, shortlist IDs, and blockers.

## Benchmark Set

The first proving lab should use 8 to 12 relevant owner-led businesses, not one homepage.

The boundary is not service-only. The boundary is whether a better website can improve trust, choice, enquiry, booking, visit intent, or purchase intent. The first set should stay mostly service-led, but it must include product-led or hybrid businesses so the design system does not overfit to appointment pages.

- salon or spa
- barber or grooming studio
- dental or clinic
- gym or fitness studio
- tutor or coaching center
- home service business
- restaurant or cafe
- professional service business
- product-led boutique, bakery, florist, maker, or specialty retailer
- hybrid business with both appointment/enquiry and product purchase paths

Each benchmark item needs a Business Reality Pack:

- business name and category
- business model: service, product, or hybrid
- services
- products when product-led or hybrid
- prices or durations when sourced
- location and contact path
- booking or enquiry path
- approved photos or explicit no-photo rule
- allowed claims
- forbidden claims
- source URLs or fixture source notes
- target customer decision

## Direction Rule

For each benchmark business, explore 6-8 visual territories from the selected Mobbin Pro reference set before any code is written. The stable territory taxonomy is:

- Minimalist
- Brutalist / Anti-Design
- Illustrative / Playful
- Retro / Nostalgic
- Typographic
- Corporate / Traditional
- E-Commerce / Retail
- Editorial / Magazine
- Immersive / Cinematic
- One-Page / Parallax
- Dark Mode
- Craft / Handmade
- Clinical / Regulated
- Luxury / Hospitality
- Utility / Conversion-First
- Local / Place-Led
- Proof-Led / Data-Led

Dark Mode is a valid territory. Neumorphism is not a default territory because it often creates contrast, readability, and dated-style risk; only use it when a specific business, reference packet, and accessibility proof justify it.

From the 6-8 explored territories, shortlist 3-4 screenshot-level finalist concepts. Each finalist must have a business-specific name that combines the visitor job, the business truth, and the visual territory. Bare labels like "minimalist" or "editorial" do not count.

These finalists must be grounded in the fresh Mobbin packet and specific business truth. Script-generated CSS shape boards do not count as direction evidence.

Each finalist must include:

- desktop first viewport
- mobile first two screens
- one sentence on why the owner would pay for this direction
- one sentence on what makes it meaningfully different from the other finalists
- reference and anti-reference inputs
- selected and rejected ingredients

Anything under 8/10 is rejected or refreshed before code.

## Repeatability Proof

The lab must save a proof packet for every benchmark business:

- input Business Reality Pack
- fresh Mobbin search brief
- fresh Mobbin reference packet
- 6-8 visual territory explorations
- 3-4 Mobbin-backed finalist concept records
- chosen finalist and rejected alternatives
- build brief
- rendered desktop screenshot
- rendered mobile screenshot
- QA result: send, review, or hold
- variability score
- truth/proof score
- mobile score
- commercial strength score
- human note if approved for public/showable use

The final lab report must include:

- pass rate across the benchmark set
- visual similarity failures
- truth failures
- mobile failures
- weak-niche failures
- examples that should become goldens
- examples that should become anti-examples

## Pass Bar

The first lab does not pass unless:

- at least 8 benchmark previews are generated
- at least 6 are commercially strong enough for human review
- no two approved previews feel like the same template
- every approved preview has desktop and mobile evidence
- every approved preview has source-backed copy
- every held preview names the exact blocker
- Nish approves the strongest examples as a system direction, not just as isolated pages

## Public Home Rule

Do not build from a new design system until the proving lab has produced repeatable proof.

The public home should sell the proven system after the system works. It should not be the first proof that the system might work.

## Implementation Notes

The current public redesign workflow is insufficient because it can pass with:

- self-scored concept artifacts
- generated HTML shape boards
- DOM markers instead of commercial proof
- one public page instead of a benchmark set
- no cross-business visual-similarity gate

The next implementation slice should add a `design-system-proving-lab` workflow with:

- benchmark fixtures
- concept evidence folders
- screenshot capture
- variability scoring
- similarity checks
- human approval packet
- release block until the lab passes

The detailed threat model, artifacts, gates, and implementation order live in the architecture blueprint linked at the top of this document.
