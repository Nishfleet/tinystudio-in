# Market Proof Run Check

Generated: 2026-06-04

## Verdict

needs-recording

## Counts

| Proof Step | Count | Required |
|---|---:|---:|
| Valid approved Loom rows | 0 | 5 |
| Ready send packages with recording notes | 0 | 5 |
| Actually sent proof rows | 0 | 5 |
| Recommended send channel | contact form or DM | - |

## Next Command

```bash
npm run growth:start -- --view=record
```

## Row Review

| Line | Prospect | Loom | Status | Missing |
|---:|---|---|---|---|
| 5 | prospects/byteme-networks | LOOM_URL | needs-recording | Loom URL must be a Loom share or embed link like https://www.loom.com/share/...; row is not ready; send package is not ready |
| 6 | prospects/it-umbrella-group | LOOM_URL | needs-recording | Loom URL must be a Loom share or embed link like https://www.loom.com/share/...; row is not ready; send package is not ready |
| 7 | prospects/talos-cyber-solutions | LOOM_URL | needs-recording | Loom URL must be a Loom share or embed link like https://www.loom.com/share/...; row is not ready; send package is not ready |
| 8 | prospects/xentz-technologies | LOOM_URL | needs-recording | Loom URL must be a Loom share or embed link like https://www.loom.com/share/...; row is not ready; send package is not ready |
| 9 | prospects/ypm-it-solutions | LOOM_URL | needs-recording | Loom URL must be a Loom share or embed link like https://www.loom.com/share/...; row is not ready; send package is not ready |

## Rules

- A proof-run row is valid only with a real Loom URL, approved marker, and leak/impact/fix/ask notes.
- A send package counts only when it is readiness-ready, Loom-approved, and includes captured recording notes.
- Sent proof counts only after the outbox sent sheet or stage command records a real sent touch with channel and Loom URL.
- Email sent proof does not count while `npm run send:setup` still warns. Use contact forms, DMs, LinkedIn, X, phone, mixed, or other until sender trust is clean.
- This checker does not replace `npm run market:parity`; it only verifies the market-proof session loop.
