# Pinqued / l30on Tools Integration

Short note for `/tools` in xe1Signal. The page keeps the graphite/violet shell and uses local browser-only utilities for the simple tools that can be reproduced without a private backend.

## Live discovery — 2026-08-11

### https://pinqued.top/

- `/` is public but exposes only the Pinqued login entry point.
- `/tools`, `/recon`, `/terminal`, `/files`, and `/dashboard` each return a `307` redirect to their matching `/login?returnUrl=...` page when checked without a session.
- `/app` is a public download page for the desktop and Android applications; it is not an in-browser tools catalog.
- The sampled public/login responses did not expose `X-Frame-Options`, `Content-Security-Policy`, or `frame-ancestors`, but authenticated cross-origin iframe sessions are still not a reliable integration contract. No proxy or policy bypass is used.

### https://l30on.top/dashboard/

- The live page currently returns Cloudflare `403 Forbidden` from this environment (`server: cloudflare`).
- The available dashboard reference identifies these utility names: URL Encode/Decode, Base64, HTML Encode/Decode, JWT Decoder, JSON Formatter, URL Parser, Timestamp Converter, Text Diff, Hash Generator, UUID Generator, Lorem Ipsum, and More Tools.
- Because the live dashboard is unavailable here, the reference list is documented as a discovery source rather than a claim about its current complete catalog.

## Implemented locally

All local tools run in the browser and do not send input to Pinqued, l30on, or xe1Signal APIs:

- URL Encode / Decode
- Base64
- HTML Encode / Decode
- JSON Formatter
- JWT Decoder (header/payload inspection only; no signature verification)
- URL Parser
- Timestamp Converter
- Text Diff
- Hash Generator (MD5 / SHA-1 / SHA-256 / SHA-512)
- UUID Generator
- Lorem Ipsum

## Linked to originals

Authenticated Pinqued workspaces remain outbound links so their real session, backend, and permissions stay on Pinqued:

- https://pinqued.top/recon
- https://pinqued.top/terminal
- https://pinqued.top/files
- https://pinqued.top/dashboard
- https://pinqued.top/app

The original l30on dashboard is also linked from the Tools workspace:

- https://l30on.top/dashboard/

## Attribution

- Header: “Utilities powered by / inspired by Pinqued” with links to Pinqued and the l30on dashboard.
- Top-right `Open original ↗`: https://pinqued.top/ with `target="_blank"` and `rel="noopener noreferrer"`.
- Footer: “Original tools by Pinqued” plus l30on dashboard inspiration.
- Credits remain visible on mobile.

## Not integrated

- Pinqued recon, terminal, files, dashboard, and app backends are private/auth-gated; xe1Signal does not recreate or proxy them.
- The full l30on dashboard catalog, including the current contents of “More Tools,” cannot be verified while the source returns 403; the page keeps the reference-grounded local subset and an original link.
- No credentials, cookies, private API tokens, or server-side scraping are used.
