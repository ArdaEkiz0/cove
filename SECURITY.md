# Security Policy

## Local-first and zero-telemetry posture

Cove runs its UI, ranking, article extraction, and audio synthesis on your device. It has no Cove backend, no account system, and no analytics service.

- **Strict Manifest V3 Content Security Policy**: `script-src 'self'; object-src 'none'` blocks remote scripts and inline script execution.
- **No cloud sync and no analytics**: Settings, notes, sessions, the local ranking profile, and saved articles live in `chrome.storage.local` and IndexedDB. There is no server-side copy.
- **Auditable network ledger**: Every external request is counted live in **Settings → Privacy & Feeds**, including features that are on by default. RSS, Discover, weather, favicons, search suggestions, and read-later metadata are network features; each has a control. Unsplash wallpapers are off by default.

The complete endpoint-level ledger, defaults, and deletion steps are in [docs/privacy.md](docs/privacy.md). The threat model is in [docs/security.md](docs/security.md).

## Supported versions

| Version | Supported | Manifest |
| :--- | :--- | :--- |
| `0.1.x` | Yes | Manifest V3 (Chromium & Gecko) |

## Reporting a vulnerability

Please report security issues privately via [GitHub Security Advisories](https://github.com/DevAnimecx/cove/security/advisories/new) rather than opening a public issue. Include reproduction steps, browser version, and the affected component (`background`, `newtab`, or `reader`). We aim to acknowledge reports within 48 hours.

Please do not include secrets, personal data, or weaponized payloads in a public issue. A machine-readable contact is available at [`.well-known/security.txt`](.well-known/security.txt).

## Scope

In scope: extension code, permissions, CSP, article extraction, Markdown rendering, import validation, and release packaging.

Out of scope: vulnerabilities in third-party publishers or APIs, browser zero-days, and the focus blocker's inability to resist a user who disables the extension.
