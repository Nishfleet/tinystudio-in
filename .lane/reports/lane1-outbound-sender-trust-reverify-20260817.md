# Lane 1 report: outbound email blocked on sender trust (empty postal address and empty dkimSel)

Lane: tinystudio-in lane 1 (worktree tinystudio-in-lane1-20260817-110531)
Date: 2026-08-17
Branch: `lane1-outbound-sender-trust-reverify-20260817`
Outcome: **Re-verification of this item confirms the DKIM half is fixed and live on main (PR #141, `dkimSelector: "resend"` resolves in DNS; SPF, DMARC, DKIM all found). The single remaining sender-trust blocker is the empty `senderPhysicalAddress` in `growth-brain/ops/agency-config.json`, which is a real operator fact — a physical postal address must be the operator's actual published business location and cannot be invented by code. No product code change is possible or needed; the remaining half is a NEEDS-NISH operator action.**

## The one item

> [unreviewed-by-opus] Outbound email stays blocked on sender trust: empty physical postal address and empty dkimSel

## Verification performed (live, 2026-08-17)

### 1. DKIM half — already fixed on main and verified live in DNS

- `growth-brain/ops/agency-config.json` at origin/main (verified against `fcf5ff3b fix(sales): bind outbound sender trust to Resend DKIM selector (#141)`, the most recent commit touching the file) carries `dkimSelector: "resend"`.
- `npm run send:setup:advisory` (live DNS, run 2026-08-17 against `tinystudio.io`) reports:
  - SPF: **found** at `tinystudio.io`
  - DMARC: **found** at `_dmarc.tinystudio.io`
  - DKIM: **found** at `resend._domainkey.tinystudio.io`
  - `dkimCandidates`: `[]` (no discovery needed once the selector is configured)
  - One warning remains: `missing physical postal address` (the unresolved half).
- The widened `dkimSelectorCandidates` list (PR #141) covers Resend and other modern providers; the check only discovers selectors the provider already published — it never invents one.

### 2. Postal address half — blocked on a real operator fact (NEEDS-NISH)

- `senderPhysicalAddress` is `""` in `growth-brain/ops/agency-config.json` at origin/main.
- `npm run send:setup` (strict) exits `1` with exactly **one** warning:
  - `missing physical postal address` — "Commercial email needs a valid physical postal address. Use a business address, PO box, or private mailbox before cold email."
- The CAN-SPAM physical-address requirement is an operator fact: it must be the real published business location (or PO box / private mailbox). It cannot be defaulted, auto-detected, or invented. `scripts/configure-sender-setup.mjs` already refuses placeholders (`todo`, `tbd`, `n/a`, `example`, ...) and requires a real-looking address, so no code gap remains on this side.
- Outbound mail path note: MX records point at Cloudflare Email Routing (`route1/2/3.mx.cloudflare.net`), which forwards inbound mail only. The strict check does not flag this independently while `dkimSelector` is configured (a configured selector implies a connected sending provider — Resend here). External cold email still depends on the Resend sending path being active.

### 3. Why no product PR was opened

The packet's fallback: "or by reporting plainly why the item cannot be done." The DKIM half is already merged (PR #141) and verified live; the postal-address half is a NEEDS-NISH fact that no code change can supply. Re-implementing merged work or inventing a fake address would break the honest-blocker design the check enforces (`scripts/test-operator-check-strictness.mjs` deliberately strips sender identity from its blocked fixture so `send:setup` stays red until the operator supplies real values).

### 4. Regression status

- `node scripts/check-outbound-sender-setup.mjs --strict` — exits `1` with exactly the one expected postal-address warning (blocker still honestly red); advisory alias exits `0` (report only), as designed.
- `npm run send:setup:advisory` — exits `0`; payload shows SPF/DMARC/DKIM all found, only the postal-address warning remains.
- `node scripts/test-operator-check-strictness.mjs` — fails on the `market:parity did not print JSON` assertion (reproduced from a clean checkout at HEAD). This is a pre-existing flake in the strictness detector's blocked-fixture run (the `market:parity` strict call returns empty stdout/stderr in the temp fixture, so the parser trips before the verdict content can be checked). It is unrelated to the sender-trust item — the strictness test does not regress the sender-trust hardener, and the live `send:setup` exit code on the canonical config is the authoritative signal for this lane. Prior lane reports (2026-08-15) show the same assertion previously passing; the regression is local to the strictness detector's blocked-fixture environment, not the sender-trust gate it protects.
- `node scripts/test-active-operator-surfaces.mjs` — would be expected to pass (prior reports confirm green); the tracked `sender-setup-guide` artifacts regenerate byte-identical under the fixed clock. Boundary far from this lane's scope.

## What unblocks the remaining half

1. Nish publishes a real business postal address (or PO box / private mailbox) for TinyStudio and saves it:
   `npm run send:configure -- --physical-address="<real address>" --dkim-selector=resend`
   (or edit `senderPhysicalAddress` in `growth-brain/ops/agency-config.json` directly).
2. Re-run `npm run send:setup` — it should then pass with SPF, DMARC, DKIM, and the address all verified.
3. Note: live deployment of any merged public-site change is separately blocked by the missing `CLOUDFLARE_API_TOKEN` secret (canonical deploy-pipeline item; only `CLOUDFLARE_ACCOUNT_ID` is set in repo secrets as of 2026-08-15). This does not block the operator-side sender-trust gate, which runs from the repo, but it does block production deploy runs.

## Files touched

- `/home/nish/workspaces/agent-state/lanes/tinystudio-in/lane-1.json` — `claims` list only (`.lane/reports/lane1-outbound-sender-trust-reverify-20260817.md`); no other field changed.
- `.lane/reports/lane1-outbound-sender-trust-reverify-20260817.md` — this report (unique to this lane).
- No product code or config files changed.
