# Lane 1 — Strategy docs mirror PRODUCT.md canonical truth: already fixed on main (reverify 2026-08-21)

## Item

- [unreviewed-by-opus] docs/strategy/first-14-days.md and docs/strategy/growth-brain-agency-plan.md still describe the retired 7-Day Site Revenue Fault Sprint ($750-$2,500) for ecommerce/local-service niches - PRODUCT.md and growth-brain/sprint-checklist.md already moved to The Website Correction ($1,000 founder pilot, Managed IT/MSP/cybersecurity)

## Verdict

**Already fixed and merged on main by PR #86 + its CodeRabbit follow-up.**
No source change is possible or needed; this run reverified the shipped fix
against fresh `origin/main` (`ccfbd4b`, "Merge pull request #202 from
nish3451/docs/lane1-growth-ops-exporters-honor-help-reverify-20260820").
The two hand-written strategy files now describe the same offer, price,
buyer, and continuation as `PRODUCT.md`, `README.md`, and
`growth-brain/offer.md`.

## Evidence (re-verified 2026-08-21 on this worktree, branch
`docs-lane1-strategy-docs-canonical-truth-reverify-20260821` off
`origin/main` @ `ccfbd4b`)

- The drift-clearing commits are on the mainline:
  - `f1d5c1cc` (2026-08-11) "docs(strategy): replace retired Site Revenue
    Fault Sprint offer in strategy docs" - the original PR #86 sweep.
  - `4498cc39` (2026-08-19) "docs(strategy): use canonical The Website
    Correction name and fix article grammar" - addressed CodeRabbit
    review comments on PR #86.
  - `git merge-base --is-ancestor f1d5c1cc HEAD` → exit 0.
  - `git merge-base --is-ancestor 4498cc39 HEAD` → exit 0.
- The two files named in the item title now match PRODUCT.md's
  authoritative truth on offer name, price, buyer, and continuation:
  - Offer name: `The Website Correction` - canonical in PRODUCT.md,
    README.md, growth-brain/offer.md; both strategy files use the
    canonical product name (and `growth-brain-agency-plan.md` line 11
    bolds it as `human-reviewed **The Website Correction**`).
  - Price: `$1,000 founder pilot` - canonical in PRODUCT.md ("exactly
    $1,000 founder pilot"), growth-brain/offer.md ("exactly $1,000
    founder pilots"); `growth-brain-agency-plan.md` line 35
    (`| First sale | The Website Correction (founder pilot) | `$1,000` |`)
    and `first-14-days.md` line 38
    (`Close the $1,000 founder-pilot Website Correction ...`) match.
  - Buyer: `Founder-led Managed IT/MSP/cybersecurity` - canonical in
    PRODUCT.md, growth-brain/offer.md; both strategy files state it
    (`first-14-days.md` line 13, `growth-brain-agency-plan.md` line 41).
  - Continuation: `Weekly Growth Desk | $2,000-$5,000/month` - matches
    `growth-brain/strategy/full-stack-growth-offer-ladder.md` line 63
    ("Price: `$2,000-$5,000/month`"); the retired `$1,500+/month` anchor
    is gone from both files.
- The scout-defined retire-terminology grep returns zero matches in the
  two files:
  - `grep -nE '7-Day Site Revenue Fault Sprint|ecommerce brands with
    clear product pages|local-service companies with confusing'
    docs/strategy/first-14-days.md docs/strategy/growth-brain-agency-plan.md`
    → no output, exit 1.
  - `grep -nE '\$750[^0-9]|\$1,500\+?/month|\$750-\$2,500'
    docs/strategy/first-14-days.md docs/strategy/growth-brain-agency-plan.md`
    → no output, exit 1.
- The canonical terminology grep returns the expected rows in both
  files:
  - `grep -nE '\$1,000|Website Correction|Managed IT|MSP|cybersecurity|founder pilot' docs/strategy/first-14-days.md docs/strategy/growth-brain-agency-plan.md`
    returns 7 matches covering the goal, Day 1 niche, Day 5 close,
    retainer script, offer ladder First Sale row, and First Niche
    paragraph.
- Surrounding canonical references agree on the same truth:
  - PRODUCT.md: managed service `The Website Correction`; buyer
    `Founder-led Managed IT/MSP/cybersecurity companies`; price
    `exactly $1,000 founder pilot`.
  - README.md: managed service `The Website Correction`; buyer
    `founder-led Managed IT/MSP/cybersecurity company`; price
    `$1,000 founder pilots`.
  - growth-brain/offer.md: offer heading `# The Website Correction`;
    buyer `Founder-led Managed IT/MSP/cybersecurity companies`; price
    `exactly $1,000 founder pilots`.
  - growth-brain/strategy/full-stack-growth-offer-ladder.md:
    continuation `Weekly Growth Desk` at `$2,000-$5,000/month`
    (matches the agency-plan ladder).
- "sprint" still appears in both files as a unit-of-delivery noun
  (`Start first sprint if closed`, `Deliver first sprint assets`,
  `Close second and third sprint`, `The sprint needs raw material`,
  `The sprint gets the first cash`, `Close 3 founder-priced sprints`).
  That usage matches README.md ("Each sprint fixes one highest-leverage
  page", "sprint contract", "paid sprint") and PRODUCT.md ("at least 10
  paid sprints"), so it is canonical and not part of the retired
  terminology.

## Files

None changed (verification-only run). The prior fix touched only the
two files named in the item title:

- `docs/strategy/first-14-days.md`
- `docs/strategy/growth-brain-agency-plan.md`

via PR #86 (commit `f1d5c1cc`) and its CodeRabbit follow-up (commit
`4498cc39`). This docs report is the durable deliverable for this lane
run.
