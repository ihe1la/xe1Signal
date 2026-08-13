# Pinqued / l30on Tools Integration

Short note for `/tools` in xe1Signal.

## Discovered (live inspection)

### https://pinqued.top/
- Public: login wall, `/app` desktop/Android downloads
- Auth-gated (redirect to `/login`): `/recon`, `/terminal`, `/files`, `/dashboard`, `/tools`, `/vibe`
- Meta: "Recon and File Management"
- No `X-Frame-Options` / `frame-ancestors` on public responses; iframe can load, but authenticated sessions are not reliable cross-origin (third-party cookies). Do not reverse-proxy to bypass that.

### https://l30on.top/dashboard/
- Currently Cloudflare **403** from this environment
- Tool names/layout taken from the provided dashboard reference: URL Encode/Decode, Base64, HTML Encode/Decode, JWT Decoder, JSON Formatter, URL Parser, Timestamp Converter, Text Diff, Hash Generator, UUID Generator, Lorem Ipsum

## What xe1Signal implements locally
Lightweight client-side only:
- URL Encode / Decode
- Base64
- JSON Formatter
- Hash Generator (SHA-1 / SHA-256 / SHA-512)
- UUID Generator

## What stays on the original sites
Pinqued auth workspaces (open original, stay synced):
- https://pinqued.top/recon
- https://pinqued.top/terminal
- https://pinqued.top/files
- https://pinqued.top/dashboard
- https://pinqued.top/app

Also linked: https://l30on.top/dashboard/

## Attribution (required)
- Header credit + footer: Pinqued → https://pinqued.top/
- Open original ↗ → https://pinqued.top/ (`target="_blank"` `rel="noopener noreferrer"`)
- Mention l30on dashboard inspiration

## Not integrated
- Full Pinqued recon/terminal/file backends (private, login-required)
- Full l30on dashboard catalog (site 403 here; kept to a small local subset + outbound link)
- No credentials, cookies, or secret scraping
