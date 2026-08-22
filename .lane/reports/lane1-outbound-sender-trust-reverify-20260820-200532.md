# Lane 1 report: outbound email blocked on sender trust (empty postal address and empty dkimSel)

Lane: tinystudio-in lane 1 (worktree tinystudio-in-lane1-20260820-200532)
Date: 2026-08-20
Branch: `lane1-outbound-sender-trust-reverify-20260820-200532`
Outcome: **Re-verification confirms the DKIM half is fixed and live on main (commit `e18c176`, PR #200, `dkimSelector: "cf2024-1"` resolves in DNS; SPF, DMARC, DKIM all found live). The single remaining sender-trust blocker is the empty `senderPhysicalAddress` in `growth-brain/ops/agency-config.json` — a real operator fact (the operator's actual published business location) that code cannot invent. No product code change is possible or needed; the remaining half is a NEEDS-NISH operator action.**

## The one item

> [unreviewed-by-opus] Outbound email stays blocked on sender trust: empty physical postal address and empty dkimSel

## Verification performed (live, 2026-08-20)

### 1. DKIM half — fixed on main today (PR #200) and verified live in DNS

- `growth-brain/ops/agency-config.json` at origin/main (HEAD `e18c176`, "chore(ops): outbound email is Cloudflare — DKIM selector cf2024-1 (#200)", authored 2026-08-20) carries `dkimSelector: "cf2024-1"` — Nish's direct decision that all outbound email runs on Cloudflare, not Resend.
- `node scripts/check-outbound-sender-setup.mjs` (live DNS, run 2026-08-20 against `tinystudio.io`) reports:
  - SPF: **found** at `tinystudio.io`
  - DMARC: **found** at `_dmarc.tinystudio.io`
  - DKIM: **found** at `cf2024-1._domainkey.tinystudio.io`
  - `dkimCandidates`: `[]` (no discovery needed once the selector is configured)
  - One warning remains: `missing physical postal address` (the unresolved half).
- Strict run (`--strict`) exits `1` with exactly the one expected postal-address warning — the blocker stays honestly red.

### 2. Postal address half — blocked on a real operator fact (NEEDS-NISH)

- `senderPhysicalAddress` is `""` in `growth-brain/ops/agency-config.json` at origin/main.
- The CAN-SPAM physical-address requirement is an operator fact: it must be the real published business location (or PO box / private mailbox). It cannot be defaulted, auto-detected, or invented. `scripts/configure-sender-setup.mjs` already refuses placeholders (`todo`, `tbd`, `n/a`, `example`, ...) and requires a real-looking address (≥12 chars, letters and digits), so no code gap remains on this side.
- Searched the repo and the nish-vault for a published TinyStudio business address — none exists. The vault files matching the search are prior lane outcome drops, not an address source.
- Outbound mail path note: MX records point at Cloudflare Email Routing (`route1/2/3.mx.cloudflare.net`), which forwards inbound mail only. The strict check does not flag this independently while `dkimSelector` is configured (a configured selector implies a connected sending provider — Cloudflare here, per PR #200). External cold email still depends on the Cloudflare sending path being active.

### 3. Why no product PR was opened

The packet's fallback: "or by reporting plainly why the item cannot be done." The DKIM half is already merged (PR #200, superseding PR #141's `resend` selector) and verified live; the postal-address half is a NEEDS-NISH fact that no code change can supply. Re-implementing merged work or inventing a fake address would break the honest-blocker design the check enforces.

### 4. Regression status

- `node scripts/check-outbound-sender-setup.mjs --strict` — exits `1` with exactly the one expected postal-address warning (blocker still honestly red); advisory alias exits `0` (report only), as designed.
- `node scripts/check-outbound-sender-setup.mjs` (advisory) — exits `0`; payload shows SPF/DMARC/DKIM all found, only the postal-address warning remains.

## What unblocks the remaining half

1. Nish publishes a real business postal address (or PO box / private mailbox) for TinyStudio and saves it:
   `npm run send:configure -- --physical-address="<real address>" --dkim-selector=cf2024-1`
   (or edit `senderPhysicalAddress` in `growth-brain/ops/agency-config.json` directly).
2. Re-run `npm run send:setup` — it should then pass with SPF, DMARC, DKIM, and the address all verified.

## Files touched

- `/home/nish/workspaces/agent-state/lanes/tinystudio-in/lane-1.json` — `claims` list only (`.lane/reports/lane1-outbound-sender-trust-reverify-20260820-200532.md`); no other field changed.
- `.lane/reports/lane1-outbound-sender-trust-reverify-20260820-200532.md` — this report (unique to this lane).
- No product code or config files changed.
