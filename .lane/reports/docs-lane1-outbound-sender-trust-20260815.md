# Lane 1 report: outbound email blocked on sender trust (empty postal address and empty dkimSel)

Lane: tinystudio-in lane 1 (worktree tinystudio-in-lane1-20260815-054542)
Date: 2026-08-15
Outcome: **The DKIM half of this item is already fixed on main (PR #141) and verified live in DNS; the remaining sender-trust blocker is the physical postal address, which is a real operator fact (no business address is published anywhere on tinystudio.in or in this repo) and cannot be invented by code. No product code change is possible or needed; delivery of the remaining fix is a NEEDS-NISH action.**

## The one item

> [unreviewed-by-opus] Outbound email stays blocked on sender trust: empty physical postal address and empty dkimSel

## Verification performed

### 1. DKIM half — already fixed on main

- `growth-brain/ops/agency-config.json` at HEAD already carries `dkimSelector: "resend"` (set by PR #141, commit `fcf5ff3`, "fix(sales): bind outbound sender trust to Resend DKIM selector", merged 2026-08-14). An earlier attempt (PR #102 / commit `6edda53`) had set it to Cloudflare's `cf2024-1` selector before Resend was the outbound provider.
- Live DNS verified 2026-08-15:
  - `resend._domainkey.tinystudio.io` -> `p=` RSA key published (the configured selector resolves).
  - `cf2024-1._domainkey.tinystudio.io` -> `v=DKIM1; h=sha256; k=rsa; p=...` (the earlier Cloudflare selector still resolves too).
  - `_dmarc.tinystudio.io` -> `v=DMARC1; p=none; ...` (found).
  - `tinystudio.io` -> `v=spf1 include:_spf.mx.cloudflare.net ~a` (found).
- `npm run send:setup:advisory` output: `checks` show SPF found, DMARC found, DKIM found (`resend._domainkey.tinystudio.io`); `dkimCandidates` empty (not needed once the selector is configured).
- The `dkimSelectorCandidates` list in `scripts/check-outbound-sender-setup.mjs` was widened by PR #141 to cover modern provider selectors (Resend, Postmark, Mailgun, SES, Mailjet, Brevo, SparkPost, Klaviyo, HubSpot, Mailchimp, Elastic Email, MailerSend, Fastmail, Tutanota). The check still does not invent selectors; it only discovers ones the provider already published.
- The sender-setup guide (`growth-brain/ops/sender-setup-guide.{md,html}`, a byte-identical tracked `ACTIVE_OPERATOR_ARTIFACT`) already reflects the DKIM-found state; regenerating it under the fixed clock produces no content diff beyond the frozen generation date. No stale "enable DKIM" instruction remains.

### 2. Postal address half — blocked on a real operator fact (NEEDS-NISH)

- `senderPhysicalAddress` is `""` in `growth-brain/ops/agency-config.json` at HEAD.
- `npm run send:setup` (strict) exits 1 with exactly one warning:
  - `missing physical postal address` — "Commercial email needs a valid physical postal address. Use a business address, PO box, or private mailbox before cold email."
- No physical postal address is published anywhere: searched all `public/` pages (home, contact, support, privacy, privacy-choices, terms, and the Promptly/Drishti sub-sites), `docs/`, `growth-brain/`, `contracts/`, `scripts/` for street/PO-box/suite patterns and for `tinystudio`/`hello@tinystudio` mentions — no business location exists.
- The FTC CAN-SPAM rule the check enforces requires a valid physical postal address in commercial email; the address must be the operator's real published business location (or PO box / private mailbox). It is not a value that can be invented, defaulted, or auto-detected. `scripts/configure-sender-setup.mjs` already refuses placeholders (`todo`, `tbd`, `n/a`, `example`, etc.) and requires ≥12 chars with letters and digits.
- The outbound mail path itself is inbound-only: MX records point at Cloudflare Email Routing (`route1/2/3.mx.cloudflare.net`), which forwards inbound mail only. The strict check does not flag this as an independent warning while `dkimSelector` is configured (a configured selector implies a connected sending provider), but cold email to external recipients will still need the provider's sending path active. The configured `resend` selector with a live published key indicates Resend is connected.

### 3. Why no product PR was opened

The packet's fallback: "or by reporting plainly why the item cannot be done." The item's DKIM half is already merged (PR #141) and verified live; the postal-address half is a NEEDS-NISH fact that no code change can supply. Re-implementing merged work or inventing a fake address would be wrong and would break the honest-blocker design the check enforces (`scripts/test-operator-check-strictness.mjs` deliberately strips sender identity from its blocked fixture so `send:setup` stays red until the operator supplies real values).

### 4. Regression status

- `scripts/test-operator-check-strictness.mjs`: passes (the named `send:setup` gate fails on the blocked fixture and the advisory alias exits 0, as designed).
- `scripts/test-active-operator-surfaces.mjs`: passes — the tracked `sender-setup-guide` artifacts regenerate byte-identical under the fixed clock.
- Full `npm test`: the only failure is `scripts/check-retention-automation.mjs`, pre-existing and unrelated to this item — it reports the canonical retention workspace `~/workspaces/products/tinystudio-in` is stale behind remote main and its service-decisions/runs parity counters are empty. Reproduced from a clean checkout at HEAD; not touched by this lane.

## What unblocks the remaining half

1. Nish publishes a real business postal address (or PO box / private mailbox) for TinyStudio and saves it:
   `npm run send:configure -- --physical-address="<real address>" --dkim-selector=resend`
   (or edit `senderPhysicalAddress` in `growth-brain/ops/agency-config.json` directly).
2. Re-run `npm run send:setup` — it should then pass with SPF, DMARC, DKIM, and the address all verified.
3. Note: live delivery of any merged public-site change is separately blocked by the missing `CLOUDFLARE_API_TOKEN` secret (canonical deploy-pipeline item; only `CLOUDFLARE_ACCOUNT_ID` is set in repo secrets as of 2026-08-15). This does not block the operator-side sender-trust gate, which runs from the repo, but it does block production deploy runs.

## Files touched

- `/home/nish/workspaces/agent-state/lanes/tinystudio-in/lane-1.json` — `claims` list only (`.lane/reports/docs-lane1-outbound-sender-trust-20260815.md`); no other field changed.
- `.lane/reports/docs-lane1-outbound-sender-trust-20260815.md` — this report.
- No product code or config files changed.
