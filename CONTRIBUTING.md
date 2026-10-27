# Contributing to Cove

Thank you for helping build a calmer, local-first web!

## Core Engineering Principles

1. **Zero Mocks, Ever**: Never add fake/simulated browser tabs, seeded fake analytics, or placeholder controls. Every metric and control must reflect real runtime state.
2. **Strict `< 165 KB` Gzipped Code Budget**: Total compiled JS + CSS (`dist/assets/*` + `dist/background.js`) is enforced by `tests/core.test.mjs`. Keep dependencies near zero.
3. **100% Offline Boot (`0ms`)**: Fonts (`.woff2`), icons, procedural Web Audio synthesis, and 8 curated 4K wallpapers are bundled locally—never block initial paint on network calls.
4. **Manifest V3 CSP Compliance**: No inline `<script>` blocks in HTML entrypoints (`index.html`, `blocked.html`).

## Local Setup

```bash
git clone https://github.com/cove-tab/cove.git
cd cove
npm install
npm run dev
```

## Pre-PR Verification Checklist

```bash
npx tsc --noEmit
npm run build
node --test tests/core.test.mjs
```

All PRs must pass TypeScript strict checking, compile under the `< 165 KB` gzipped budget, and pass `tests/core.test.mjs` with zero warnings.
