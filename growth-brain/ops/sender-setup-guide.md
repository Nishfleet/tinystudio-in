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
| DKIM discovery | needs work | common selectors at _domainkey.tinystudio.io |

## Warnings To Fix

| Warning | What It Means |
|---|---|
| missing physical postal address | Commercial email needs a valid physical postal address. Use a business address, PO box, or private mailbox before cold email. |
| DKIM selector not configured | Set dkimSelector after enabling DKIM in the mail provider. No common DKIM selectors were found in DNS. |

## DKIM Discovery

| Selector | DNS Host |
|---|---|
| - | No common DKIM selector found in DNS yet. |

Suggested dry-run command:

```bash
npm run send:configure -- --physical-address="..." --dkim-selector=... --dry-run
```

## Fix Order

1. Add a real sender postal address to `senderPhysicalAddress` in `growth-brain/ops/agency-config.json`.
2. In the mail provider for `tinystudio.io`, enable DKIM and copy the selector.
3. Add the selector to `dkimSelector` in `growth-brain/ops/agency-config.json`.
4. If the mail provider gives a DKIM TXT record, add it in Cloudflare DNS at `<selector>._domainkey.tinystudio.io`.
5. Run `npm run send:setup`.
6. If it is clean, email can join contact forms and DMs as an outbound route.

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
