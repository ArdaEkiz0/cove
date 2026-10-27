# Security Policy

## Local-First & Zero-Telemetry Guarantee

Cove is architected from the ground up around **100% on-device execution**:

- **Strict Manifest V3 Content Security Policy**: `script-src 'self'; object-src 'none'` — remote code execution and third-party tracking scripts are structurally impossible.
- **Zero Cloud Sync / Zero Analytics**: Your workflow graph (CSE v4), Quick Access shortcuts, tasks, notes, and saved offline articles live exclusively in browser `chrome.storage.local` and `IndexedDB`.
- **Auditable Network Ledger**: Every opt-in network request (Open-Meteo weather, verified RSS feeds, or source article extraction) is counted live in **Settings → Content & Privacy**.

## Supported Versions

| Version | Supported | Manifest |
| :--- | :--- | :--- |
| `0.1.x` | Yes | Manifest V3 (Chromium & Gecko) |

## Reporting a Vulnerability

Please report security issues privately via GitHub Security Advisories (`Security → Report a vulnerability`) rather than opening a public issue. Include reproduction steps, browser version, and affected component (`background`, `newtab`, or `reader`). We respond within 48 hours.
