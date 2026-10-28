# Testing

Cove uses a small, fast test pyramid: pure unit tests for logic, two integration audits for the packaged extension, and a manual browser pass for visual and interaction quality. CI runs the same gates on every pull request and push to `main`.

## Current numbers

| Suite | Command | Count | Runtime |
| :--- | :--- | :--- | :--- |
| Unit | `npm test` | 66 tests | under 1 second on a laptop |
| Core integration | `npm run test:core` | 2 tests | a few seconds after a build |
| TypeScript | `npm run typecheck` | project-wide | depends on machine |
| Budget | `npm run budget` | 1 gate | under a second |
| Release verification | `npm run verify` | artifact checks | under a second |

Counts are from `v0.1.3`. Update this table when the suites change.

## Unit tests

Node's built-in test runner executes TypeScript source directly with `--experimental-strip-types`. There is no Jest, Vitest, or browser required.

| File | Covers |
| :--- | :--- |
| `tests/fuzzy.test.mjs` | scoring, word boundaries, consecutive runs, sorting, highlighting |
| `tests/instant-answer.test.mjs` | arithmetic, percentages, unit conversion, dates, base conversion, timestamps, colours, focus range, world clocks, malformed input |
| `tests/markdown.test.mjs` | escaping, headings, emphasis, links, lists, code blocks, dangerous schemes |
| `tests/moon.test.mjs` | lunar phase anchoring, illumination bounds, normalization |
| `tests/i18n.test.mjs` | locale coverage, real translations, fallback, no placeholders |
| `tests/triage-core.test.mjs` | domain normalization, unread parsing, RAM heuristic, duplicates, stale tabs, internal tabs |
| `tests/defaults.test.mjs` | eight wallpapers, default settings contract, unique groups, HTTPS feed catalogue |
| `tests/rss-parser.test.mjs` | WMO weather labels, relative time buckets, future timestamps, fallback dates |
| `tests/validation.test.mjs` | URL schemes, image data URLs, numeric bounds, hostile imports, no mutation, non-object input |
| `tests/story-id.test.mjs` | deterministic hashes, collision resistance, legacy cache repair, healthy-feed no-op |
| `tests/search.test.mjs` | bang aliases, prefix/suffix detection, URL-template validation, provider presets, Wikipedia URL |

The tests deliberately cover the parts where a quiet bug would be expensive: import validation, URL handling, Markdown sanitization, parsing, and feed identity.

## Core integration tests

`tests/core.test.mjs` inspects the built extension and source tree.

### Test 1: packaging contract

- `package.json` and `dist/manifest.json` are version `0.1.3`.
- Manifest V3 is declared.
- `chrome_url_overrides.newtab` is `index.html`.
- The background service worker is `background.js`.
- CSP is exactly `script-src 'self'; object-src 'self'`.
- `index.html` and `blocked.html` contain no inline script.
- Icons exist at 16, 32, 48, and 128 pixels.
- All eight wallpapers exist in `dist/` and `unpacked-chrome-mv3/`.
- Gzipped JS + CSS is below 170 KiB.
- Chrome and Firefox archives exist.

### Test 2: product integrity

- The removed mock browser drawer stays removed.
- The full-viewport Settings Studio exists.
- Settings uses accessible `role="switch"` controls, not raw checkboxes.
- All ten settings sections are present.
- Four font pairs and the UI scale tokens exist.
- Source scan rejects placeholder or simulated data patterns.

These are intentionally structural. They catch regressions that unit tests cannot see, such as a build that drops a manifest field or a page that reintroduces inline script.

## Release gates

```bash
npm ci
npm run typecheck
npm test
npm run build
npm run test:core
npm run budget
npm run verify
```

`npm run release:check` chains typecheck, build, unit tests, core tests, and verification. The CI workflow runs the same jobs and uploads the archives only after they pass.

## CI

`.github/workflows/ci-release.yml` runs on pull requests, pushes to `main`, and version tags.

- Node 22 with npm cache.
- `npm ci` for a locked install.
- Typecheck, unit tests, build, core tests, budget, verification.
- Artifact upload for the Chrome and Firefox archives, checksums, and manifest.
- On a `v*.*.*` tag, a release job publishes the verified artifacts to GitHub Releases.

Other workflows add CodeQL, dependency review, OpenSSF Scorecard, stale triage, labeler, and documentation link checking.

## Manual QA

Before a release, verify in a clean browser profile:

- [ ] Load `unpacked-chrome-mv3/` as an unpacked extension.
- [ ] Open a new tab; confirm the theme matches the saved setting with no white flash.
- [ ] Switch all four stages with `1`-`4`.
- [ ] Open Discover with `D`; confirm the feed renders and the lead story opens.
- [ ] Read one article offline after it has been cached.
- [ ] Save a page to Read Later from the context menu and from `Cmd/Ctrl+Shift+L`.
- [ ] Save a session and restore it.
- [ ] Open Settings with `,`; search for a section; change theme, font pair, and scale.
- [ ] Start a focus session; verify the blocker redirect and the five-minute pause.
- [ ] Start each neural mode; verify audio begins only after interaction and stops cleanly.
- [ ] Export a backup, reset, and import it.
- [ ] Disable Discover, RSS, weather, suggestions, and favicons; confirm the page still renders.
- [ ] Repeat the core pass in Firefox 140+ with the Firefox manifest.

## Known gaps

- No automated browser E2E suite yet.
- No coverage threshold; unit tests focus on pure logic rather than line coverage.
- No visual regression snapshots in CI. Screenshots are captured with `scripts/capture-screenshots.mjs` against a running server.
- No automated accessibility audit. The manual checklist and [accessibility notes](accessibility.md) are the current process.
- No performance harness for paint timing. The budget is the enforced performance gate.

These gaps are documented rather than papered over. Contributions that add a browser harness or an accessibility audit are welcome.

## Writing a test

1. Prefer a pure function with explicit inputs.
2. Test the failure mode, not only the happy path.
3. Use real fixtures from the repository when possible.
4. Do not assert on implementation details that will change with a refactor.
5. Add the file to the `test` script in `package.json`.
6. Keep the suite fast enough to run on every save.

## Related reading

- [Performance](performance.md)
- [Security](security.md)
- [Contributing](contributing.md)
- [Releasing](releasing.md)
