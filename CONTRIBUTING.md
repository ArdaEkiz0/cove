# Contributing to Cove

Thank you for helping build a calmer, local-first web!

## Core Engineering Principles

1. **Zero Mocks, Ever**: Never add fake/simulated browser tabs, seeded fake analytics, or placeholder controls. Every metric and control must reflect real runtime state.
2. **Strict `< 170 KB` Gzipped Code Budget**: Total compiled JS + CSS (`dist/assets/*` + `dist/background.js`) is enforced by `npm run budget` in CI and checked by `tests/core.test.mjs`. Keep dependencies near zero.
3. **Offline-Capable Boot (pre-paint theme)**: Fonts (`.woff2`), icons, procedural Web Audio synthesis, and 8 curated wallpapers are bundled locally, so initial paint never waits on a network call. The cached theme is applied before the app mounts; this is not a literal zero-millisecond startup guarantee.
4. **Manifest V3 CSP Compliance**: No inline `<script>` blocks in HTML entrypoints (`index.html`, `blocked.html`).

## Local Setup

```bash
git clone https://github.com/DevAnimecx/cove.git
cd cove
npm ci
npm run dev
```

## Pre-PR Verification Checklist

```bash
npm run typecheck
npm test
npm run build
npm run test:core
npm run budget
npm run verify
```

All PRs must pass the strict TypeScript check, the unit suite, the integration audits, and the 170 KB gzipped budget. If a change genuinely needs more room, explain the trade-off and adjust the documented limit deliberately.

## Licensing

By submitting a contribution, you agree that your contribution is licensed under the [Apache License, Version 2.0](LICENSE) (per Section 5 of Apache-2.0).
