# Performance

Cove's performance story is a strict code budget, a pre-paint theme, local assets, and caches that make repeat visits cheap. It is not a claim that every device paints in a fixed number of milliseconds.

## The measured number

At `v0.1.1`, the production build measures:

```text
     0.3 KB  assets/blocked-*.js
     3.4 KB  assets/boot-theme-*.css
     0.5 KB  assets/boot-theme-*.js
   138.8 KB  assets/newtab-*.js
    21.4 KB  assets/newtab-*.css
     0.9 KB  assets/triage-core-*.js
     0.6 KB  assets/triage.worker-*.js
     1.5 KB  background.js
-----------
   167.5 KB  TOTAL gzipped JS + CSS
   170.0 KB  BUDGET
     2.5 KB  HEADROOM
```

These numbers come from `npm run budget` on the tracked `dist/` build. They will drift slightly with code changes and hashed file names; the budget is the durable claim.

## What the budget measures

`scripts/check-budget.mjs`:

1. Reads every `.js` and `.css` file in `dist/assets/`.
2. Adds `dist/background.js`.
3. Gzips each file with Node's `zlib.gzipSync` at the default level.
4. Sums the compressed bytes.
5. Fails if the total is greater than or equal to `170 * 1024` bytes.

It deliberately excludes:

- wallpapers and fonts (binary assets, served locally),
- source maps (not shipped),
- HTML,
- icons,
- caches created at runtime.

This is a **code weight** budget, not a total download budget. The complete extension archive is larger because it contains eight wallpapers and four font families. Those assets are local and do not require a network request at runtime.

## Why 170 KB

The budget is a guardrail against accidental dependency creep. It is intentionally close to the current size so that a new library or a large generated data file fails CI instead of silently shipping. The previous target in the product brief was 150 KB; the project currently sits above it, so the enforced limit is the honest one: 170 KB. Lowering the limit is a roadmap item, not a claim already achieved.

## Startup path

1. `index.html` loads `boot-theme.ts` as an external module.
2. `boot-theme.ts` imports the token/theme CSS and applies cached theme attributes from `localStorage`.
3. The Svelte application mounts.
4. The store hydrates settings and lists from `chrome.storage.local`, the read-later queue from IndexedDB, and the cached Discover feed from IndexedDB.
5. Network refreshes start only after the local shell is available.

The result is a shell that does not wait for the network to choose its theme. The exact time to first paint depends on the device, browser, disk, profile size, and whether the new tab process is warm.

### "0 ms" language

In this repository, "0 ms" is used in two narrow senses:

- **pre-paint theme**: the cached theme is applied synchronously before the app renders;
- **warm cache hit**: an in-memory map returns an article or feed entry without an IndexedDB or network round trip.

It is not a universal latency guarantee. Documentation and README copy should avoid implying that every cold start is instant.

## Caching layers

| Layer | Scope | Eviction |
| :--- | :--- | :--- |
| In-memory maps | Current tab session | Tab close |
| `chrome.storage.local` | Settings, lists, smart memory, RSS cache | Manual reset or quota |
| IndexedDB `cove_news_cache_v1` | Feed snapshot, up to 120 full articles | LRU by cached time |
| HTTP/browser cache | Publisher images and static assets | Browser policy |
| Local assets | Fonts, wallpapers, icons | Shipped with the extension |

Feed freshness is 3 minutes for Discover and 20 minutes for the RSS widget. Weather is 30 minutes. These are freshness targets, not performance guarantees.

## Optimizations in place

- **No runtime framework download.** Svelte compiles components; there is no React/Vue runtime shipped.
- **No third-party fonts.** Four `.woff2` families are bundled and subset by usage.
- **No audio files.** Neural audio and soundscapes are synthesized with Web Audio nodes.
- **Local wallpapers.** Eight scenes ship in the archive; the default does not fetch Unsplash.
- **Dependency-light parsing.** RSS and article extraction use platform APIs (`DOMParser`, `fetch`) rather than large parser libraries.
- **Bounded work.** Feed batches, article limits, LRU eviction, and response-size caps prevent unbounded memory growth.
- **Incremental caching.** Lead story prewarm and hover prefetch make the common path fast without preloading everything.
- **CSS tokens.** Themes change custom properties instead of shipping duplicate component CSS.

## What is not benchmarked

The repository does not currently ship a reproducible Lighthouse or WebPageTest harness for the extension origin, because extension pages are not directly comparable to a public URL. Claims about cold paint, memory, or CPU should be treated as design intent until a harness is added.

If you publish a benchmark, include:

- browser and version,
- extension build and commit,
- device and OS,
- profile size and cache state,
- whether the new tab process was warm,
- the exact command or script used,
- raw runs, not only a best-case number.

Do not compare Cove's local extension page to a cloud SPA without stating the difference in network and runtime conditions.

## Regression policy

A pull request that changes runtime code must pass:

```bash
npm run typecheck
npm test
npm run build
npm run test:core
npm run budget
npm run verify
```

The budget job is not advisory. If a feature needs more room, the pull request must explain the trade-off and adjust the documented limit deliberately, not quietly.

## Future work

- A repeatable extension-page performance harness.
- A smaller Discover bundle split.
- Optional lazy loading for the settings surface.
- Memory profiling for large read-later queues.
- A published archive-size table alongside the code budget.

## Related reading

- [Architecture](architecture.md)
- [Testing](testing.md)
- [Releasing](releasing.md)
- [Design system](design-system.md)
