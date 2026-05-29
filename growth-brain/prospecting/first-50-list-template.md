# First 50 Prospect List Template

Use one row per prospect.

| # | Business | Vertical | City | Website | Decision Maker | Contact | Fit Score | Loom Status | Next Step |
|---:|---|---|---|---|---|---|---:|---|---|
| 1 |  |  |  |  |  |  |  | not-started |  |

## Status Values

- `not-started`
- `scored`
- `loom-recorded`
- `sent`
- `replied`
- `call-booked`
- `closed`
- `not-fit`

## Rule

The first list should be boring and focused: one vertical, one region, 50 businesses.

## Batch Import Format

For `npm run prospect:import -- prospects.txt`, use:

```text
Business Name|Website|Vertical|City|Contact|Notes
```

Supported vertical slugs:

- `managed-it-cybersecurity`
- `accounting-bookkeeping`
- `dental-medspa-clinics`
- `home-services`
