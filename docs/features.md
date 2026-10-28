# Features

Cove is one new tab with several layers: a workspace, a reading room, a focus stage, and an optional adaptive engine. This page describes what each surface actually does in `v0.1.3` and where the limits are.

## The new tab workspace

### Spatial stages

Press `1` to `4` outside an input to switch stages:

| Key | Stage | What it is for |
| :--- | :--- | :--- |
| `1` | Bento Dashboard | Widget grid, quick links, notes, read later, tab health, focus card |
| `2` | Ambient Home | Large clock and search over the current atmosphere |
| `3` | Focus Sanctuary | Pomodoro, intention, soundscape, and blocker controls |
| `4` | Pure 4K Stillness | Wallpaper only; the command palette and shortcuts still work |

There is also a minimal layout value in settings for users who want a reduced shell. Discover is a separate side-navigation view rather than a numbered stage.

### Search and command palette

The search field supports:

- direct web search,
- `!bangs` for configured engines (`!g`, `!ddg`, `!gh`, `!yt`, `!w`, `!mdn`, `!sp` by default, plus custom engines),
- instant answers for arithmetic, percentages, unit and currency-style conversions, world time, hex colours, and quick focus commands,
- fuzzy switching to open tabs, quick links, notes, sessions, and read-later items,
- `>` commands and inline commands such as `note:`, `weather:`, `new session:`, and `read later:`.

`Cmd/Ctrl+K` opens the full command palette. It is the fastest path to tab operations, sessions, sound modes, layouts, settings, and the smart engine.

### Bento widgets

Available widgets: quick links, tab triage, notes, focus, read later, RSS, weather, clock, countdown, and a sandboxed embed. Widgets have small, medium, and large spans, can be hidden, pinned, and reordered in edit mode.

The layout is responsive from narrow mobile widths to ultrawide displays. The grid is intentionally not free-form: bounded spans keep the page legible and prevent a single card from taking over the screen.

### Quick links

Quick links are grouped by context: work, personal, or both. Time-aware mode can show the relevant group during work hours. Icons come from the tab, a custom image, a generated brand mark, or an optional favicon service.

### Tab triage

The triage engine reads real browser tabs through the `tabs` permission. It reports:

- duplicate domains,
- stale tabs based on last access,
- audible tabs,
- heavy tabs by an estimated RAM heuristic,
- unread counts parsed from common title badge formats.

Actions include deduplicating, suspending stale tabs, muting audio tabs, grouping by domain, and a combined smart sweep. Estimates are labelled as estimates; Cove does not claim to read actual per-tab memory.

### Sessions

Save the current window as a named session without closing anything. Restore later, or let the worker keep one automatic rolling snapshot. Sessions store URL, title, domain, pinned state, and group name.

### Notes

A local scratchpad with pinning and Markdown rendering. Markdown is sanitized before rendering: raw HTML is escaped, and `javascript:` or `data:` links are rejected.

### Read later

Save a page from the context menu, the toolbar command, the palette, or the reader. Cove extracts readable text locally and stores it in IndexedDB. The queue supports read/unread state, search, and offline reading.

Metadata fetching can be disabled; it is on by default. Without it, Cove keeps the title and URL you saved; with it, Cove fetches the page to improve the summary and image.

### Weather

Weather is enabled by default and can be disabled. It uses Open-Meteo for current conditions, a five-day forecast, humidity, UV, wind, sunrise, and sunset. Location can be set by city search or browser geolocation. The last response is cached so the card can render offline.

### Countdowns and embeds

Countdowns store a label and target date locally. Embeds accept an HTTPS URL and render in an iframe with a sandbox; sites that refuse framing will not work, and Cove does not try to circumvent that.

## Cove Discover

Discover is a two-pane newsroom. The left rail holds topics and saved stories; the right pane holds the feed. It is reachable with `D` or the side dock.

- 11 curated RSS/Atom sources across tech, world, science, engineering, design, and business.
- Three keyless public APIs: Spaceflight News, DEV.to, and Hacker News Algolia.
- Custom RSS URLs you add yourself.
- Topic ranking that learns from reads, saves, boosts, and "less like this" feedback.
- Story brief with a summary and key points.
- Cove News reader with a clean article view, reading progress, and optional calm-reading audio.
- IndexedDB cache for the feed and up to 120 full articles.

Discover is not a full-text archive and does not bypass paywalls. If extraction fails, the original link remains available. See [Discover](discover.md).

## Focus

### Pomodoro

Configurable work, short break, and long break durations, an intention field, session history, streaks, and a daily completion count. The timer can start from a quick focus command or the focus stage.

### Site blocker

A domain list can be enforced during focus sessions, work hours, or both. Enforcement uses `declarativeNetRequest` rules that redirect matching main-frame requests to a local blocked page. A five-minute pause is available from that page. The blocker is a friction tool, not a security boundary; a user with extension access can disable it.

### Soundscapes

Five procedural textures can be blended: rain, café room tone, white/velvet noise, waves, and pine wind. No audio files are bundled. The mix is local and starts only after interaction.

### Focus Sound

Four procedural, phase-modulated modes:

| Mode | Character | Intended use |
| :--- | :--- | :--- |
| Deep Work | Open suspended voicing, steady pulse, rain and velvet noise | Sustained tasks and distraction masking |
| Creative Flow | Warm major ninth, waves, room tone, wind | Writing, design, exploration |
| Calm Reading | Soft low-arousal pad, rain, quiet noise, wind | Reading and study |
| Recharge & Unwind | Deep, slow, wave-forward | Recovery between sprints |

Depth can be subtle, balanced, or high. A speech-band shaping filter gently reduces the intelligibility of nearby conversation. These are aesthetic and ergonomic tools, not medical treatment. See [Focus Sound](neural-audio.md).

## Atmosphere

- Eight bundled scenic wallpapers, no download required.
- Five accent presets: Website Cobalt, Harbor Teal, Nordic Slate, Cedar Moss, Twilight.
- Smoked Dark, Frosted Light, and System Auto themes.
- Cloud, wallpaper, gradient, solid, and local-image backgrounds.
- Dim, blur, brightness, contrast, vignette, automatic brightness, and chameleon accent controls.
- Optional Unsplash source image for a curated scene when the user explicitly enables it.
- Local images are stored as blobs in IndexedDB.

The default is local. Unsplash is not contacted unless the user opts in.

## Typography and control

- Four self-hosted font pairings: Swiss, Editorial, Humanist, Technical.
- Compact, balanced, and spacious UI scales.
- Sharp, balanced, and soft corner profiles.
- Four clock faces: light sans, literary serif, sculptural bold, tabular mono.
- 12/24-hour time, seconds, world clocks, and a time-zone picker.
- Ten-section Settings Studio with search: General, Typography, Atmosphere, Bento Layout, Smart Engine, Sound, Search, Focus, Privacy, Data.

## Data and portability

- Full JSON export including settings, lists, sessions, read later, feeds, countdowns, and smart memory.
- JSON import with strict validation and bounded arrays.
- Bookmark HTML import.
- JSON backup is the supported migration path between installs.
- Factory reset clears Cove keys and IndexedDB stores.

## Internationalization

Five interface languages: English, Hindi, Spanish, German, and Japanese. The language setting is persisted and applied before paint. Coverage is focused on the core shell; some long-form documentation and newer settings copy may remain English. See [Internationalization](i18n.md).

## Browser support

| Browser | Status | Notes |
| :--- | :--- | :--- |
| Chrome | Supported | Primary MV3 target |
| Brave | Supported | Chromium MV3 |
| Arc | Supported | Chromium MV3; new tab override depends on Arc settings |
| Edge | Supported | Chromium MV3 |
| Firefox 140+ | Supported | Gecko MV3 manifest; a few APIs are feature-detected |
| Zen | Supported | Firefox-based; install from file |
| Safari | Not shipped | Web build may render, but extension packaging is not provided |

## Honest limitations

- Discover depends on publisher feeds and CORS behaviour; a source can disappear or rate-limit.
- Article extraction is heuristic and will fail on some JavaScript-heavy or paywalled pages.
- The tab memory estimate is a heuristic, not a browser memory API.
- Binaural-style modulation is not a medical device and has no clinical guarantee.
- The smart engine needs local usage before its suggestions become useful; it starts with zero signals.
- The blocker deters distraction but does not survive a user who disables the extension.
- Some external images are fetched from publishers when Discover renders; they are disclosed in the privacy ledger.

## Related reading

- [Keyboard shortcuts](keyboard-shortcuts.md)
- [Privacy](privacy.md)
- [Comparison](comparison.md)
- [Roadmap](roadmap.md)
