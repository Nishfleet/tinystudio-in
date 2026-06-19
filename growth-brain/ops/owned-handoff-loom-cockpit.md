# Owned Handoff Loom Cockpit

Generated: 2026-06-19

## Rule

This does not approve work automatically. It turns tangible improvements into reviewable handoff Loom scripts, then requires a real Loom URL before sprint acceptance can complete.

## Why This Exists

The moat is the proof delta: before, after, proof source, client-visible value, next measurement, and weekly retention question. A client should never have to trust a vague agency claim to see what changed.

## Review Dashboard

| Area | Count |
|---|---:|
| Owned startup clients | 3 |
| Ready to record | 3 |
| Blocked | 0 |
| Approved source-backed claims | 6 |

## Handoff Queue

| Client | Status | Handoff Script | Dashboard | Acceptance Dry Run | Complete After Loom |
|---|---|---|---|---|---|
| clients/ai-converter | ready-to-record | `clients/ai-converter/handoff-loom-script.md` | `clients/ai-converter/client-dashboard.md` | `npm run client:acceptance -- clients/ai-converter --dry-run` | `npm run client:acceptance -- clients/ai-converter --handoff-loom=LOOM_URL --reviewer="Nish"` |
| clients/siterep | ready-to-record | `clients/siterep/handoff-loom-script.md` | `clients/siterep/client-dashboard.md` | `npm run client:acceptance -- clients/siterep --dry-run` | `npm run client:acceptance -- clients/siterep --handoff-loom=LOOM_URL --reviewer="Nish"` |
| clients/five-to-nine-0509 | ready-to-record | `clients/five-to-nine-0509/handoff-loom-script.md` | `clients/five-to-nine-0509/client-dashboard.md` | `npm run client:acceptance -- clients/five-to-nine-0509 --dry-run` | `npm run client:acceptance -- clients/five-to-nine-0509 --handoff-loom=LOOM_URL --reviewer="Nish"` |

## Client Scripts

### AI Converter

- Status: ready-to-record
- Before: Broad homepage promise: preview private files before checkout across many file types.
- After: Sharper accounting path: bank statement PDFs in, accounting CSV out, with Wave, QuickBooks, Xero, and spreadsheet routes visible.
- Client-visible value: The buyer can understand the most valuable use case faster, while the page keeps clear limits around accounting imports and review.
- Next measurement: Compare visits, upload starts, preview completions, and checkout starts on accounting pages versus the broad homepage path.
- Handoff script: `clients/ai-converter/handoff-loom-script.md`
- Dashboard: `clients/ai-converter/client-dashboard.md`
- Delivery cockpit: `clients/ai-converter/delivery-cockpit.html`

```bash
npm run client:acceptance -- clients/ai-converter --handoff-loom=LOOM_URL --reviewer="Nish"
```

### SiteRep

- Status: ready-to-record
- Before: A website assistant can drift into broad AI support claims that buyers cannot verify.
- After: The product contract is tighter: source-backed answers, lead capture, owner inbox, proof gaps, source repair, and gated customer activation.
- Client-visible value: The buyer sees a safer product promise with concrete owner workflows instead of vague AI replacement language.
- Next measurement: Track widget install proof, public lead capture proof, proof-gap tickets, and source repair completion.
- Handoff script: `clients/siterep/handoff-loom-script.md`
- Dashboard: `clients/siterep/client-dashboard.md`
- Delivery cockpit: `clients/siterep/delivery-cockpit.html`

```bash
npm run client:acceptance -- clients/siterep --handoff-loom=LOOM_URL --reviewer="Nish"
```

### Five to Nine 0509

- Status: ready-to-record
- Before: Competitor monitoring could read like generic market intelligence without a retention proof loop.
- After: The product promise is concrete: see what changed, with proof, through watchlists, proof capture, daily briefs, weekly digests, reports, and share/export flows.
- Client-visible value: The buyer gets decision-ready competitor changes with proof trails instead of another dashboard to inspect manually.
- Next measurement: Track fresh monitoring runs, proof captures, sent digests, and weekly report usefulness before broad launch.
- Handoff script: `clients/five-to-nine-0509/handoff-loom-script.md`
- Dashboard: `clients/five-to-nine-0509/client-dashboard.md`
- Delivery cockpit: `clients/five-to-nine-0509/delivery-cockpit.html`

```bash
npm run client:acceptance -- clients/five-to-nine-0509 --handoff-loom=LOOM_URL --reviewer="Nish"
```
