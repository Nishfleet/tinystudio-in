# Sender Setup Guide

Generated: 2026-08-06

Use this before cold email. Until this guide is clean, use contact forms or DMs first.

## Current Status

- Sender email: hello@tinystudio.io
- Sender domain: tinystudio.io
- Manual daily send cap: 20
- Overall: needs work

## Checks

| Check | Status | Domain |
|---|---|---|
| SPF | ready | tinystudio.io |
| DMARC | ready | _dmarc.tinystudio.io |
| Outbound mail path | needs work | route3.mx.cloudflare.net, route1.mx.cloudflare.net, route2.mx.cloudflare.net |
| DKIM | ready | resend._domainkey.tinystudio.io |

## Warnings To Fix

| Warning | What It Means |
|---|---|
| missing physical postal address | Commercial email needs a valid physical postal address. Use a business address, PO box, or private mailbox before cold email. |

## DKIM Discovery

| Selector | DNS Host |
|---|---|
| resend | resend._domainkey.tinystudio.io |

Suggested dry-run command:

```bash
npm run send:configure -- --physical-address="..." --dkim-selector=resend --dry-run
```

## Fix Order

1. Connect an outbound sending provider for `tinystudio.io` (Cloudflare Email Routing forwards inbound mail only and cannot send).
2. Add a real sender postal address to `senderPhysicalAddress` in `growth-brain/ops/agency-config.json` (business address, PO box, or private mailbox). The address must be a published business location, never a placeholder.
3. DKIM is configured for `resend` at `resend._domainkey.tinystudio.io`. Confirm the selector still matches the mail provider if you swap providers.
4. Run `npm run send:setup`.
5. If it is clean, email can join contact forms and DMs as an outbound route.

## Notes

- Do not invent the DKIM selector. Use the exact selector from the mail provider.
- If DKIM discovery finds a selector, still confirm it in the mail provider before saving it.
- For Google Workspace, the default selector is often `google`, but verify it in the Google Admin DKIM screen before saving it here.
- Cloudflare TXT records are the normal DNS record type for DKIM, SPF, and DMARC values.
- Keep the manual daily cap low while there is no reply data.

## Sources

- FTC CAN-SPAM business guide: https://www.ftc.gov/business-guidance/resources/can-spam-act-compliance-guide-business
- Google Workspace DKIM setup: https://support.google.com/a/answer/174124
- Cloudflare DNS TXT records: https://developers.cloudflare.com/dns/manage-dns-records/reference/dns-record-types/
