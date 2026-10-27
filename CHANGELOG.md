# Changelog

All notable changes to **Cove** are documented in this file.

## [0.1.1] — 2026-10-27

### Added
- **Midnight Cobalt Dark Mode (Default)**: Zero-flash pre-paint dark glass theme (`#060a14` obsidian-indigo canvas, ambient sapphire glow, `1px` specular rims) with 1-click **Dark / Light / 4K Scenic** switching.
- **Side-Navigation `Cove Discover` Section**: Dedicated two-pane Discover workspace (`#discover`, shortcut `D`) with sticky channel rail (`For You`, `AI & Tech`, `Engineering`, `Science & Space`, `World`, `Business`, `Design & Culture`, `Saved Vault`), live `#trending` topic tags, and custom RSS following.
- **3-Tier IndexedDB News & Full-Article Cache (`cove_news_cache_v1`)**: `0ms` in-memory + `< 5ms` IndexedDB feed & LRU full-article cache (up to 120 clean articles), Stale-While-Revalidate sync, `180ms` hover pre-fetching, and 1-click offline batch pre-caching.
- **Two-Stage `Story Brief` + Ad-Free `Cove News` Reader**: Instant executive summary popup on card click and distraction-free full-article source extraction (`Serif`/`Sans`, `Glass`/`Paper`/`Ink`, reading progress bar, and coupled `8.5 Hz` Calm Reading audio).
- **Functional Neural Sound Engine (`0 KB` Procedural Web Audio)**: Real-time phase-modulated polyphonic pads + acoustic textures (`16 Hz Beta`, `10.5 Hz Alpha`, `8.5 Hz Low-Alpha`, `5.5 Hz Theta`), `300–2500 Hz` Speech Distraction Shield, and `AnalyserNode` spectrum visualizer.
- **Autonomous Cove Smart Engine (CSE v4)**: 2nd-order Markov workflow transitions (`A → B → C`), 14-day recency half-life decay, circadian 4K scene harmony, and Whisper Mode (`whisperMode: true`).
- **4 Bundled Offline Font Pairings & 10-Section Settings Studio**: Self-hosted `Plus Jakarta Sans`, `Inter`, `Instrument Serif`, and `JetBrains Mono` `.woff2` fonts + full-viewport searchable Settings Studio (`,` or `⌘,`).

### Fixed
- Eliminated `6.5s` Discover load bottleneck by decoupling custom client RSS fetches from verified feed hydration.
- Fixed `localStorage` quota overflow on large `content:encoded` RSS feeds by migrating feed & article caches to IndexedDB.
- Resolved responsive header, clock/weather popover, Bento card, and mobile bottom-dock collisions from `360px` to `2560px`.
