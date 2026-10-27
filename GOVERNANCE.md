# Governance

Cove is a small, maintainer-led open-source project. This document explains how decisions are made, how releases are approved, and how contributors can take on more responsibility.

## Principles

1. **Local-first by default.** A feature that requires a cloud account, remote analytics, or a server-side profile is out of scope unless it is strictly opt-in and clearly disclosed.
2. **Calm over clever.** New UI should reduce noise, not add it. Every widget must justify its pixels.
3. **Zero mocks.** No fake tabs, seeded analytics, placeholder metrics, or simulated success states. If a capability is unavailable, say so.
4. **Small, auditable surface.** Prefer native browser APIs and zero-runtime dependencies. The gzip budget is a product constraint, not a suggestion.
5. **Respect the user's machine.** No background timers that burn battery, no surprise network calls, no dark patterns.

## Roles

### Maintainer

Maintainers can merge pull requests, publish releases, manage repository settings, and appoint new maintainers. The current maintainer is listed in [AUTHORS.md](AUTHORS.md) and [CODEOWNERS](.github/CODEOWNERS).

### Triager

Triagers can label, reproduce, and close stale issues. They cannot merge code or publish releases.

### Contributor

Anyone who opens an issue, improves documentation, reports a bug, or submits a pull request. Contributions of every size are credited in release notes when appropriate.

## Decision making

- **Routine changes** (docs, tests, small fixes) are approved by one maintainer.
- **User-facing features** require a short design note in the issue and approval from one maintainer.
- **Architecture, privacy, permissions, and release process changes** require an explicit maintainer decision recorded in the pull request.
- **Disagreements** are resolved by discussing the user impact, the maintenance cost, and the project principles. The maintainer makes the final call and documents the reasoning.

## Becoming a maintainer

A contributor may be invited to become a maintainer after a sustained record of:

- High-quality pull requests that follow the engineering principles.
- Thoughtful issue triage and code review.
- Respectful community participation.
- Demonstrated care for privacy, accessibility, and long-term maintainability.

There is no fixed contribution count. Trust, judgment, and consistency matter more than volume.

## Releases

Cove follows [Semantic Versioning](https://semver.org/). Releases are prepared from `main`, verified by CI, and published with signed checksums. See [docs/releasing.md](docs/releasing.md) for the exact process.

## Changes to this document

Governance changes are proposed by pull request, discussed for at least seven days for significant changes, and approved by the maintainer. The goal is a process that is light enough for a small project and clear enough for new contributors.
