# Security Notes

This repo should not contain secrets, production credentials, customer private data, deploy state, billing state, DNS state, or live provider configuration.

## Local Rules

- Keep `.env`, `.env.local`, `.env.*.local`, `.wrangler/`, and local run artifacts out of git.
- Do not commit client analytics exports, customer lists, ad accounts, payment data, or private screenshots unless the client explicitly approves a sanitized version.
- Do not store API keys in proof packets, screenshots, raw pull logs, or client brain folders.
- Treat external reference captures as research inputs, not reusable assets.
- Before using any client material in a case study, create a sanitized public version and get written approval.
