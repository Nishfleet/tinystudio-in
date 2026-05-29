# Mobbin Pro Design System Architecture

Date: 2026-05-18
Status: active design-system blueprint

## Thesis

The lab's design system is not a visual template. It is a reference-led operating system.

The system should work like this:

Business truth in -> Mobbin Pro reference set -> ingredient extraction -> compatible remix -> direction packet -> build brief -> implementation -> screenshots -> scoring -> approval or hold.

The goal is not to make every site share the same look. The goal is to make every site reach the same quality bar while looking specific to that business.

## Non-Negotiables

- Pull Mobbin Pro references every time.
- Use 6-8 top references per redesign, not one inspiration image.
- Pick references for the job, not just for beauty.
- Remix ingredients, never copy a source page.
- Keep customer copy source-backed.
- Make every output visibly different from nearby outputs.
- Treat mobile as a first-class proof surface.
- Fail closed when evidence is missing.
- Human approval remains required before public/outreach use until the benchmark system proves itself repeatedly.

## Research Baseline

This blueprint is based on the recurring foundation layers in mature design systems:

- [Atlassian foundations](https://atlassian.design/foundations/): tokens, accessibility, content, spacing, grid, color, typography, iconography, illustrations, logos, elevation, border, and radius.
- [Atlassian motion](https://atlassian.design/foundations/motion/): motion must clarify change, guide attention, respect reduced-motion settings, and stay performant.
- [Microsoft Fluent layout](https://fluent2.microsoft.design/layout) and [accessibility](https://fluent2.microsoft.design/accessibility): layout, structure, hierarchy, navigation, responsive behavior, spacing, focus, accessibility, and semantic code are foundational.
- [GOV.UK Design System](https://design-system.service.gov.uk/) and [GOV.UK frontend accessibility guidance](https://www.gov.uk/service-manual/technology/accessibility-for-developers-an-introduction): accessible styles, components, and patterns still need progressive enhancement and care in HTML, CSS, and JavaScript.
- [W3C Design Tokens Community Group](https://www.w3.org/community/design-tokens/): tokens are the source of truth for colors, typography, spacing, theming, and cross-tool/code consistency.
- [W3C WAI-ARIA Authoring Practices](https://www.w3.org/WAI/ARIA/apg/): custom patterns need roles, states, properties, keyboard support, landmarks, names, and descriptions.
- [WCAG 2.2](https://www.w3.org/TR/WCAG22/): focus visibility, target size, consistent help, input assistance, and accessible authentication are explicit product-quality requirements.
- [Shopify Polaris accessibility](https://polaris-react.shopify.com/foundations/accessibility) and [internationalization](https://polaris-react.shopify.com/foundations/internationalization): content, voice, tone, information architecture, internationalization, component APIs, responsiveness, accessibility, and performance are part of the design system.
- [Visa Product Design System states](https://design.visa.com/base-elements/states/usage/): interaction states and target areas are base elements, not polish.

## The 11-Step Machine

### 1. Business Reality Pack

Inputs:

- business model: product, service, or hybrid
- business category
- target visitor decision
- real services
- prices or durations when sourced
- location
- contact or booking path
- purchase, menu, visit, quote, or enquiry path when relevant
- approved photos or no-photo constraint
- allowed proof
- forbidden proof
- source URLs or fixture notes

Vulnerabilities:

- generic business facts create generic pages
- fake proof creates legal/trust risk
- missing photo rights push the renderer toward fake lifestyle imagery
- unclear visitor decision creates brochure pages

Hard gates:

- no preview build without target decision
- no claims without source
- no photo-led design unless photos are approved
- no regulated/sensitive business without extra review

### 2. Mobbin Search Brief

The search brief converts the business job into Mobbin queries. It is created fresh for the specific business and current run.

Each run should use multiple query angles:

- niche angle: salon, clinic, gym, restaurant, home services, professional services
- page-job angle: booking, trust, pricing/menu, portfolio, lead capture, proof, local service
- tone angle: premium, clinical, editorial, utility, local trust, conversion-focused
- constraint angle: no photos, heavy service menu, strong CTA, mobile-first

Vulnerabilities:

- one query repeats the same Mobbin winners
- beautiful SaaS references can be wrong for local-service conversion
- references may overfit to one brand's layout
- motion and interaction cues may be invisible in still screenshots

Hard gates:

- save the exact queries
- save a broad raw Mobbin pull log outside the chat transcript
- reach at least 32 returned screens and 20 unique screens before compression
- compress the raw pull into 12-20 packet candidates
- shortlist 6-8 references
- record why each reference fits the business job
- record at least 2 anti-references
- save a per-business reference packet with `generatedAt`, `businessHash`, `searchBriefHash`, `rawPullLogPath`, and `rawPullLogHash`
- fail if the packet is stale or was created for a different business/search brief
- never let a static reference bank stand in for a fresh Mobbin run
- never lower research breadth to keep the conversation clean; save the evidence locally and report a digest

### 3. Fresh Reference Packet And Fit Matrix

Every shortlisted reference is scored before extraction. The packet belongs to one business and one run.

Scores:

- job fit
- niche fit
- first viewport clarity
- CTA clarity
- proof usefulness
- mobile transferability
- visual distinctiveness
- buildability
- truth safety

Vulnerabilities:

- selecting references by taste alone
- combining references that fight each other
- picking a reference that depends on unavailable assets
- copying a layout because it is easier than remixing

Hard gates:

- no reference below 7/10 enters the final set
- final set must include at least 3 compatible references
- final set must include at least 2 distinct structure families
- no direct logo, copy, claim, or exact layout reuse
- raw pull log must prove a broad pull before compression
- raw packet candidates must be 12-20 unique Mobbin screens selected from the raw pull log
- shortlisted references must be 6-8 unique Mobbin screens
- anti-references must be 2 or more
- every packet must include query logs and timestamps
- every packet expires and must be refreshed or revalidated before reuse

### 4. Ingredient Extraction

Extract design ingredients into a structured ledger.

Ingredient layers:

- business job: visitor decision, buying hesitation, service choice, proof need
- information architecture: nav, page hierarchy, section model, task order
- content strategy: headline job, labels, microcopy, proof wording, error/help wording
- voice and tone: plainness, confidence, warmth, category language, banned phrases
- typography: font family, scale, weight, line height, measure, casing, numerals, emphasis
- layout structure: hero composition, grid, alignment, asymmetry, scroll rhythm, section transitions
- spacing system: page margins, section gaps, component padding, proximity, density
- responsive behavior: desktop/tablet/mobile reflow, first two mobile screens, touch ergonomics
- color system: base, surface, accent, semantic roles, contrast, dark/light behavior
- surfaces and materials: backgrounds, panels, cards, inset surfaces, paper/glass/solid treatment
- depth: elevation, shadow, layering, overlap, z-order, sticky layers
- shape: radius scale, borders, dividers, outlines, corner logic
- component anatomy: hero, service menu, proof block, gallery, form, pricing/menu, FAQ/help
- component states: default, hover, pressed, focus, active, selected, disabled, read-only, loading, error, success, empty
- interaction model: click/tap behavior, keyboard path, disclosure, sticky CTA, form validation, transitions
- motion: duration, easing, reveal, feedback, reduced-motion behavior, performance limits
- media direction: approved photos, crop logic, no-photo motif, collage, artifact frame, maps, service objects
- iconography: icon style, stroke/fill, size, metaphor quality, accessibility labels
- illustration/graphics: when to use, when not to use, abstraction style, proof safety
- proof architecture: reviews, credentials, location, process, service evidence, portfolio, source status, missing-proof hold
- CTA system: primary/secondary action, placement, repetition, mobile persistence, disabled/blocker copy
- forms and lead capture: labels, helper text, errors, privacy note, submit states, success state
- accessibility: semantics, landmarks, heading order, alt text, focus, target size, contrast, keyboard support
- localization and formatting: currency, dates, phone formats, address conventions, language expansion
- SEO/AEO metadata: title, description, local business structure, agent-readable truth, no overclaiming
- performance: image weight, lazy loading, animation cost, font loading, layout stability
- implementation tokens: primitive, semantic, component-specific, and theme tokens
- governance: source hashes, approvals, goldens, anti-examples, versioning, change log

Vulnerabilities:

- extracting only colors, typography, and cards
- extracting too many ingredients and creating a Frankenstein page
- missing the reason behind a reference
- letting visual ingredients override business truth
- forgetting invisible layers: states, accessibility, performance, metadata, localization, and governance

Hard gates:

- every ingredient needs a source reference
- every selected ingredient needs a reason
- every rejected ingredient needs a reason
- each design must use ingredients from at least 3 references
- no single reference may dominate the final page
- every chosen ingredient must map to a business job or quality requirement
- every run must include invisible ingredients, not just visible style ingredients

### 5. Compatibility Pass

Before concepting, test whether selected ingredients belong together.

Checks:

- same visitor job
- compatible tone
- compatible density
- compatible media assumptions
- compatible CTA behavior
- compatible proof type
- mobile survivability

Vulnerabilities:

- high-quality ingredients can still clash
- bold hero plus quiet proof can feel incoherent
- SaaS-style proof can feel fake for a local business
- image-led references break when photos are missing

Hard gates:

- produce one sentence: "why these references belong together"
- reject any ingredient that weakens the visitor decision
- reject any ingredient that needs unavailable proof/photos
- if the set feels incoherent, rerun reference selection

### 6. Visual Territory Exploration And Finalists

Explore 6-8 visual territories from the fresh Mobbin packet before choosing what to build. The stable taxonomy is:

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

Then shortlist 3-4 screenshot-level finalist concepts. Each finalist must have a business-specific name, not a raw territory label. Good concept names tie the visual treatment to the visitor decision, such as "same-day quote control room" or "editorial product proof wall."

Dark Mode is separate from Neumorphism. Neumorphism is not a default territory; only allow it when the Mobbin packet, business niche, and accessibility proof justify the readability risk.

Vulnerabilities:

- coding first and rationalizing a concept after
- script-generated shape boards pretending to be real concepts
- finalist concepts that are really the same layout
- choosing novelty over commercial credibility
- bare style labels pretending to be business-specific concepts
- overusing one fashionable territory across unrelated businesses

Hard gates:

- 6-8 territories explored with fit score and fit reason
- 3-4 finalists with desktop first viewport
- 3-4 finalists with mobile first two screens
- each finalist needs a why-pay sentence
- each finalist needs a difference sentence
- each finalist needs selected and rejected ingredients
- anything under 8/10 is regenerated
- no code until a winner exists

### 7. Build Brief

The winning concept becomes a precise build brief.

Required:

- section order
- first viewport composition
- typography rules
- color rules
- media treatment
- CTA hierarchy
- proof rules
- mobile behavior
- interaction behavior
- what not to copy from references

Vulnerabilities:

- vague "make it like X" briefs
- missing mobile rules
- missing proof boundaries
- no instruction for no-photo state

Hard gates:

- build brief must map every major visual choice to a reference ingredient
- build brief must list forbidden copy/visual claims
- build brief must define mobile first two screens
- build brief must define what makes this business-specific

### 8. Build

Implementation follows the brief, not the agent's taste.

Vulnerabilities:

- generic component fallback under time pressure
- stale archived visual recipes leaking into new work
- same CSS architecture creating same-looking pages
- visual polish hiding poor conversion

Hard gates:

- no generic hero plus three cards
- no repeated nearby hero structure
- no unsourced proof
- no fake stock photos
- no hidden internal workflow language
- no mobile overflow
- no CTA below the first useful viewport unless deliberately justified

### 9. Screenshot And Runtime Proof

Every candidate needs rendered proof.

Required:

- desktop screenshot
- mobile screenshot
- tablet screenshot when layout changes meaningfully
- console error check
- link/CTA check
- contrast/accessibility pass
- text overflow check

Vulnerabilities:

- source checks passing while the page looks bad
- desktop looking good while mobile is broken
- screenshots stale after source edits
- proof packet approving a different source hash

Hard gates:

- evidence must hash the source
- screenshots must refresh after edits
- approval packet must reference exact screenshots
- stale approval blocks release

### 10. Scoring

Score the output, not the effort.

Minimum score dimensions:

- commercial strength
- business specificity
- reference quality
- remix coherence
- visual variability
- truth safety
- CTA clarity
- mobile quality
- build quality
- accessibility quality
- interaction-state completeness
- content clarity
- performance stability
- governance/evidence freshness

Vulnerabilities:

- self-scoring by the same script that generated the page
- score inflation because a page is different
- no comparison against prior outputs
- failing to record why a page is held

Hard gates:

- below 8/10 overall is hold
- below 8/10 truth safety is hold
- below 8/10 mobile quality is hold
- high visual score cannot override fake or weak proof
- approved previews become goldens only after human review

### 11. Similarity And Benchmark Gate

The system must prove repeatability across a set, not one page.

Checks:

- screenshot similarity
- DOM/section-order similarity
- hero-structure similarity
- CTA-layout similarity
- proof-presentation similarity
- palette/typography overuse
- niche-fit failures

Vulnerabilities:

- every output slowly converges on the same successful template
- the system becomes a style picker, not a designer
- benchmark businesses are too similar
- anti-examples are not saved, so failures repeat

Hard gates:

- no two approved benchmark previews can feel like the same template
- no single structure family can dominate a benchmark run
- failed examples must become anti-examples
- best examples must become goldens

## Data Artifacts

Each redesign run should save:

- `business-reality-pack.json`
- `mobbin-search-queries.json`
- `mobbin-raw-candidates.json`
- `reference-fit-matrix.json`
- `ingredient-ledger.json`
- `token-map.json`
- `compatibility-review.md`
- `concepts/`
- `chosen-concept.json`
- `build-brief.md`
- `screenshots/desktop.png`
- `screenshots/mobile.png`
- `qa-report.json`
- `similarity-report.json`
- `accessibility-report.json`
- `performance-report.json`
- `content-review.json`
- `approval-packet.md`

## Failure Modes And Repairs

| Failure | Detection | Repair |
| --- | --- | --- |
| Same-template output | similarity report, human review | rerun reference selection with banned structure family |
| Beautiful but wrong for business | commercial/niche score below 8 | rebuild Business Reality Pack and search brief |
| Copied reference too closely | ingredient dominance or reviewer flag | remix from at least 3 references and change structure |
| Fake proof | truth score below 8 | remove claim or mark proof as missing |
| Photo problem | no approved media for photo-led direction | switch to no-photo visual or request photos |
| Mobile collapse | screenshot/accessibility report | redesign first two mobile screens |
| CTA unclear | CTA score below 8 | rebuild first viewport around primary action |
| Frankenstein design | compatibility review fail | reduce ingredient set and choose a clearer tone |
| Stale evidence | source hash mismatch | recapture screenshots and approval packet |
| Self-scored weak work | human review fail | hold and regenerate concepts |
| Invisible-state failure | missing hover/focus/error/loading/success states | add state inventory before approval |
| Accessibility regression | accessibility score below 8 | rebuild affected component or simplify interaction |
| Performance drag | performance report fail | reduce motion/media weight and recapture proof |
| Content bloat | content clarity below 8 | rewrite around one visitor action |

## What Makes It Hard To Beat

- It starts with real business truth, not prompt vibes.
- It uses Mobbin Pro every time, so taste is constantly refreshed.
- It extracts ingredients instead of copying references.
- It forces compatibility before build.
- It forces visual territory exploration and screenshot-level finalists before code.
- It fails weak concepts before implementation.
- It records proof and source hashes.
- It compares outputs against each other for sameness.
- It saves goldens and anti-examples, so the system learns.
- It blocks release when approval is stale.

## Next Build Slice

Implement the proving lab in this order:

1. benchmark fixture schema
2. Mobbin reference packet schema
3. ingredient ledger schema
4. token map schema
5. compatibility review template
6. concept packet template
7. build brief template
8. screenshot capture runner
9. accessibility/content/performance checks
10. scoring rubric
11. similarity checker
12. approval packet
13. release gate that blocks public-home redesign until the lab passes
