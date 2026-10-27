# Contributing

Cove is a small, opinionated project. Contributions are welcome when they respect the local-first model, the code budget, and the calm design.

Start with [CONTRIBUTING.md](../CONTRIBUTING.md) for the short version. This page is the longer onboarding guide.

## Setup

Requirements:

- Node.js `>=22.18.0` (the tests use `--experimental-strip-types`),
- npm,
- a Chromium browser and/or Firefox 128+.

```bash
git clone https://github.com/DevAnimecx/cove.git
cd cove
npm install
npm run dev
```

Open `http://localhost:5173/` for the web preview. The Vite middleware provides local `/api/discover` and `/api/article` routes so the reading surfaces work without an extension context.

To test the real extension:

```bash
npm run build
```

Then load `unpacked-chrome-mv3/` at `chrome://extensions` with Developer mode enabled. For Firefox, use the Firefox ZIP or load `manifest.firefox.json` through `about:debugging`.

## Project layout

```text
src/
  boot-theme.ts          pre-paint theme and type cache
  background/            MV3 service worker and triage core
  lib/                   state, storage, discover, audio, smart engine, validation
  newtab/                Svelte app, components, styles
  workers/               tab triage worker
tests/                   Node test suites
scripts/                 packaging, budget, verification, screenshots
assets/                  README and social assets
docs/                    this documentation
public/                  fonts, icons, wallpapers, manifest source
```

## Engineering principles

1. **No mocks presented as real.** Do not add simulated tabs, seeded engagement, fake analytics, or placeholder metrics. The core test scan rejects known mock artifacts.
2. **Respect the budget.** Runtime JS + CSS must stay under 170 KB gzipped. Measure with `npm run budget`.
3. **Local-first.** No account, no Cove server, no analytics. A new network call is a privacy change and needs docs.
4. **Manifest V3 CSP.** No inline script, no remote code, no `eval`.
5. **Platform APIs first.** Do not add a dependency for something the browser already does.
6. **Small, explainable models.** Prefer a clear heuristic over an opaque one.
7. **Accessible by default.** Keyboard path, visible focus, semantic control, reduced motion.
8. **Honest copy.** Qualify "0 ms", avoid "best", "revolutionary", and unmeasured benchmarks.

## Code style

- TypeScript strict mode; no `any` unless boundary code requires it and the reason is local.
- Svelte 5 runes (`$state`, `$derived`, `$effect`) rather than legacy stores.
- Components stay focused; shared logic belongs in `src/lib/`.
- CSS uses tokens from `tokens.css`; avoid hard-coded colours and spacing.
- Comments explain why, not what.
- Prefer named exports for logic that is tested.
- Keep the store as the single mutation point for persistent state.

Formatting is enforced with Prettier:

```bash
npm run format
npm run format:check
```

## Tests

```bash
npm run typecheck
npm test
npm run build
npm run test:core
npm run budget
npm run verify
```

Add a test when you change:

- a parser,
- a validator,
- a scoring or ranking function,
- a cache migration,
- a URL or Markdown sanitizer,
- a backup shape.

Pure functions are preferred. Browser-only behaviour should get a manual QA note until an E2E harness exists.

## Commits

Use Conventional Commits:

```text
feat(discover): add source mute
fix(reader): keep figure captions
docs(privacy): list new endpoint
test(validation): reject credential URLs
chore(release): rebuild v0.1.2 artifacts
```

One logical change per commit. Do not mix a refactor with a behaviour change. Do not commit generated artifacts and source changes in the same commit unless the release process requires it.

## Pull requests

A good PR:

- explains the user problem,
- states the privacy and performance impact,
- includes screenshots for visual changes,
- includes tests for logic changes,
- updates docs and the changelog when behaviour changes,
- keeps the diff reviewable.

The PR template asks for these. CI must pass. A maintainer may ask for a smaller scope or a different approach.

## Documentation

- Update the relevant page in `docs/` in the same PR.
- Keep the README claims aligned with the measured build.
- Add new links to `docs/README.md`.
- Run the link checker or at least verify relative links.
- Use answer-first headings for FAQ and SEO pages.
- Do not add a badge for an award or store listing that does not exist.

## Translations

See [Internationalization](i18n.md). A translation PR should include:

- the new locale code and label,
- a complete dictionary,
- a test update,
- a layout check at compact and spacious scales,
- a note about any strings intentionally left in English.

## Security

Do not open a public issue for a vulnerability. Use GitHub Security Advisories. See [Security](security.md).

## Design contributions

Read [Design system](design-system.md). A design proposal should include:

- the problem,
- the surface and states,
- dark and light treatment,
- keyboard and reduced-motion behaviour,
- mobile and ultrawide behaviour,
- the effect on the bundle.

## Community

- [Code of Conduct](../CODE_OF_CONDUCT.md)
- [Support](../SUPPORT.md)
- [Governance](../GOVERNANCE.md)
- [Authors](../AUTHORS.md)

## License

By contributing, you agree that your contribution is licensed under Apache-2.0, as described in [CONTRIBUTING.md](../CONTRIBUTING.md) and the [LICENSE](../LICENSE).
