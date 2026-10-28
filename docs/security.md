# Security

Cove handles browsing context, saved reading, and personal notes. This page describes the threat model, the controls in place, and the limits of those controls.

## Reporting a vulnerability

Use GitHub Security Advisories: **Security > Report a vulnerability** in the repository. Do not open a public issue for a suspected vulnerability.

Include:

- affected version and browser,
- a minimal reproduction,
- the affected surface (background worker, new tab, reader, import, build),
- impact and any proof of concept.

We aim to acknowledge within 48 hours and to ship a fix or mitigation as soon as practical. Please allow time for a release before public disclosure.

## Assets

1. **Workspace content** - notes, read-later articles, sessions, quick links, countdowns.
2. **Browsing metadata** - open tab titles and URLs, tab groups, bookmarks during import, recent sessions.
3. **Preference and profile data** - settings, Discover interests, smart-engine memory.
4. **Integrity of the shipped extension** - code, manifest, release archives, checksums.
5. **User trust** - the promise that no analytics or hidden endpoint receives this data.

## Trust boundaries

| Boundary | Untrusted side | Control |
| :--- | :--- | :--- |
| Feed ingestion | RSS/Atom XML, JSON APIs | Parser limits, text extraction, no HTML execution |
| Article extraction | Publisher HTML | `DOMParser`, active-element stripping, escaped output |
| Backup import | User-supplied JSON | Schema validation, URL scheme checks, size bounds |
| Custom feed URL | User-supplied URL | HTTP(S) URL validation; dev proxy blocks private hosts |
| Browser APIs | `chrome.tabs`, `chrome.bookmarks`, `chrome.sessions` | Feature-scoped calls, no background content script |
| Build pipeline | npm dependencies, GitHub Actions | Lockfile, CodeQL, dependency review, Scorecard, checksums |
| Network | Publishers and public APIs | Minimal surface, opt-out controls, no credentials |

## Adversaries considered

### Malicious feed or article content

**Goal:** execute script in the extension origin, exfiltrate storage, or spoof the UI.

**Controls:**

- Manifest V3 CSP: `script-src 'self'; object-src 'self'`.
- No inline scripts in `index.html` or `blocked.html`.
- Feed XML is parsed as text; titles and summaries are inserted as text, not HTML.
- Article extraction removes `script`, `style`, `iframe`, `form`, `svg`, `nav`, `aside`, and similar elements.
- Extracted prose is escaped; Markdown rendering escapes raw HTML and rejects `javascript:` and `data:` links.
- Remote images use `referrerpolicy="no-referrer"`.

**Residual risk:** a crafted image can still be a tracking pixel, and a link can lead to a phishing page. Cove does not scan publisher content.

### Malicious backup file

**Goal:** inject script through imported settings, create a huge array that freezes the tab, or smuggle a dangerous URL.

**Controls:**

- `src/lib/validation.ts` accepts only objects, bounds array lengths, clamps numeric fields, validates URL schemes, and reconstructs settings over safe defaults.
- Import errors are surfaced without partially applying a malformed object where possible.
- No `eval`, `Function`, or dynamic script insertion is used.

**Residual risk:** importing a backup from an untrusted source can still import unwanted but valid content, such as distracting quick links. Review before importing.

### Malicious custom feed or SSRF through the dev proxy

**Goal:** make the local development server fetch internal resources.

**Controls:**

- The Vite middleware rejects non-HTTP(S) URLs.
- `isPrivateHost` blocks localhost, loopback, link-local, and common RFC1918 ranges for proxy and article routes.
- The proxy is a development-only convenience; it is not part of the packaged extension.
- Timeouts and response-size caps limit resource exhaustion.

**Residual risk:** the development proxy is not a hardened production gateway. Do not expose the dev server to an untrusted network.

### Supply-chain compromise

**Goal:** ship malicious code through a dependency or CI action.

**Controls:**

- Small dependency surface; the runtime ships no third-party UI framework beyond Svelte's compiled output.
- `package-lock.json` is committed and CI uses `npm ci`.
- Dependabot, dependency review, CodeQL, and OpenSSF Scorecard workflows are configured.
- Release archives are generated from a clean build and accompanied by SHA-256 checksums.
- GitHub Actions use pinned major versions; maintainers should review action updates.

**Residual risk:** no reproducible-build attestation or code signing is shipped in `v0.1.3`. Verify checksums and build from source if you need a stronger guarantee.

### Local attacker with profile access

**Goal:** read Cove data from the browser profile.

**Controls:** browser profile permissions and OS disk encryption are the real boundary. Cove does not add a second encryption layer.

**Residual risk:** malware running as the user, or a browser profile copied without encryption, can read extension storage. Cove is not a password manager or a secure vault.

### Network observer

**Goal:** infer reading interests or location.

**Controls:** TLS for all supported endpoints; no analytics; local caches reduce repeat requests; optional features can be disabled.

**Residual risk:** destination hosts and DNS queries reveal which publishers and services you contact. A VPN or network-level privacy tool is outside Cove's scope.

## Permissions rationale

See the permission table in [Privacy](privacy.md#browser-permissions). The broad `<all_urls>` host permission is the most consequential. It exists because custom RSS feeds and article extraction can target arbitrary publishers. It is not used to inject scripts into pages.

## Focus blocker is not a security control

The blocker uses `declarativeNetRequest` redirects for configured domains. It is designed to reduce temptation during focus sessions.

- It does not survive the user disabling or removing the extension.
- It does not block subresources or alternate domains.
- It can be paused for five minutes from the blocked page.
- It is not parental control, endpoint security, or a tamper-proof policy.

## Privacy-adjacent hardening

- No remote code, remote CSS, or remote fonts.
- No content script registration.
- No `web_accessible_resources` beyond what the packaged UI needs.
- No account, token, or cookie is sent to a Cove service because no such service exists.
- Optional network features are individually documented and disableable.
- Images and links are treated as untrusted content.

## Verification

Run the local gates:

```bash
npm ci
npm run typecheck
npm test
npm run build
npm run test:core
npm run budget
npm run verify
```

`test:core` checks the MV3 manifest, CSP, absence of inline scripts, local wallpapers, release archives, and the bundle budget. `verify` checks the packaged archives, checksums, and manifest consistency.

## Out of scope

- Browser zero-days and compromised browser binaries.
- OS-level malware or a compromised user account.
- Physical access to an unlocked device.
- Publishers changing their content or terms.
- Third-party services changing their API or retention policy.
- Denial of service against a publisher or public API.

## Related reading

- [Privacy](privacy.md)
- [Architecture](architecture.md)
- [Testing](testing.md)
- [Releasing](releasing.md)
