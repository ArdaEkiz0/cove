# Changelog

All notable changes to **Cove** are documented in this file.

## [0.1.1] — 2026-10-27

### Added
- **Midnight Cobalt Dark Mode (Default)**: Pre-paint dark glass theme (`#060a14` obsidian-indigo canvas, ambient sapphire glow, `1px` specular rims) with 1-click **Dark / Light / 4K Scenic** switching.
- **Side-Navigation `Cove Discover` Section**: Dedicated two-pane Discover workspace (`#discover`, shortcut `D`) with sticky channel rail (`For You`, `AI & Tech`, `Engineering`, `Science & Space`, `World`, `Business`, `Design & Culture`, `Saved Vault`), live `#trending` topic tags, and custom RSS following.
- **IndexedDB News & Full-Article Cache (`cove_news_cache_v1`)**: Warm in-memory and IndexedDB feed/read cache (up to 120 extracted articles), stale-while-revalidate sync, hover prefetching, and 1-click offline batch pre-caching.
- **Two-Stage `Story Brief` + Clean `Cove News` Reader**: Executive summary popup on card click and distraction-free full-article extraction (`Serif`/`Sans`, `Glass`/`Paper`/`Ink`, reading progress bar, and optional `8.5 Hz` Calm Reading audio). No paywall bypass.
- **Procedural Neural Sound Engine (Web Audio, no audio files)**: Real-time phase-modulated polyphonic pads and acoustic textures (`16 Hz Beta`, `10.5 Hz Alpha`, `8.5 Hz Low-Alpha`, `5.5 Hz Theta`), a speech-band shaping filter, and an `AnalyserNode` spectrum visualizer. Aesthetic tool, not a medical device.
- **On-Device Cove Smart Engine (CSE v4)**: Second-order Markov workflow transitions (`A → B → C`), 14-day recency half-life decay, circadian scene harmony, and Whisper Mode (`whisperMode: true`).
- **4 Bundled Offline Font Pairings & 10-Section Settings Studio**: Self-hosted `Plus Jakarta Sans`, `Inter`, `Instrument Serif`, and `JetBrains Mono` `.woff2` fonts + full-viewport searchable Settings Studio (`,` or `⌘,`).

### Fixed
- Reduced Discover cold-load stalls by decoupling custom client RSS fetches from verified feed hydration.
- Fixed `localStorage` quota overflow on large `content:encoded` RSS feeds by migrating feed and article caches to IndexedDB.
- Resolved responsive header, clock/weather popover, Bento card, and mobile bottom-dock collisions from `360px` to `2560px`.

### Documentation and verification
- Added the docs suite: architecture, privacy ledger, security model, performance method, data model, Discover, audio, Smart Engine, accessibility, i18n, testing, releasing, FAQ, and comparison.
- Added a cross-platform release verifier, version sync, and a 170 KB gzipped budget check.
- Added 54 unit tests and 2 integration audits covering MV3/CSP constraints and a no-mock UI gate.
- Added `llms.txt`, `llms-full.txt`, structured data, and a launch/repository metadata playbook.
