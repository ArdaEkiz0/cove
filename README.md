<div align="center">

<img src="public/icons/cove.svg" width="84" height="84" alt="Cove Logo" />

# Cove `v0.1.1`

### **The Browser New Tab that Quietly Evolves.**
*Midnight Dark Mode · Ad-Free Cove Discover News + IndexedDB Cache · 16 Hz Procedural Neural Audio · Autonomous On-Device Smart Engine — in **164 KB** with **0 Cloud Calls**.*

[![Release v0.1.1](https://img.shields.io/badge/release-v0.1.1-2563eb?style=flat-square)](CHANGELOG.md)
[![Manifest V3](https://img.shields.io/badge/Chrome%20%7C%20Brave%20%7C%20Arc%20%7C%20Edge%20%7C%20Firefox-Manifest%20V3-059669?style=flat-square)](#30-second-installation)
[![Bundle Size](https://img.shields.io/badge/gzip%20bundle-%3C165%20KB-7c3aed?style=flat-square)](#architecture--performance-budget)
[![Privacy](https://img.shields.io/badge/telemetry-0%20cloud%20calls-10b981?style=flat-square)](SECURITY.md)
[![License: MIT](https://img.shields.io/badge/license-MIT-0f172a?style=flat-square)](LICENSE)

[**Download Chrome / Brave / Arc / Edge (.zip)**](releases/cove-chrome-mv3-v0.1.1.zip) · [**Download Firefox / Zen (.zip)**](releases/cove-firefox-mv3-v0.1.1.zip) · [**SHA-256 Checksums**](releases/SHA256SUMS.txt) · [**Changelog**](CHANGELOG.md)

</div>

---

## Why Cove Exists

Modern browser start pages force an ugly trade-off:
- **Default browser tabs (Edge / MSN / Chrome NTP)** monetize your first 3 seconds with programmatic ad networks and clickbait carousels.
- **Wallpaper extensions (Momentum)** lock basic widgets and static sound loops behind `$40–$60/yr` cloud subscriptions.
- **Legacy RSS readers (Feedly / Inoreader)** dump unread-count anxiety and broken text snippets that kick you out to cookie-walled publisher sites.

**Cove** unifies a calm Midnight Cobalt spatial New Tab, a **side-navigation `Cove Discover` newsroom** with **0ms IndexedDB full-article caching**, a **Brain.fm-grade `0 KB` Web Audio neural synthesizer**, and an **autonomous on-device Markov workflow engine (CSE v4)**—100% free, open-source (MIT), and local-first.

---

## Signature Capabilities (`v0.1.1`)

| Capability | Cove `v0.1.1` | Default Browser Tabs | Momentum Plus | Cloud RSS Apps |
| :--- | :--- | :--- | :--- | :--- |
| **Opening Experience** | Sculpted Midnight Dark / Alabaster Light (`0ms` boot) | Ad carousels & trackers | Static photo + paywalls | Unread counter inbox |
| **Discover Newsroom** | Side-nav section (`D`) · 14+ verified feeds & free APIs | Sponsored tabloid network | None | Raw XML lists |
| **Ad-Free Full Reader** | Built-in **Cove News** (`Serif`/`Sans`/`Glass`/`Paper`/`Ink`) | External ad redirect | None | `$8–$15/mo` paywall |
| **Offline News Cache** | **3-Tier RAM + IndexedDB LRU Cache** (120 full articles) | None | None | Cloud account required |
| **Neural Focus Audio** | **`0 KB` Procedural Web Audio** (`16Hz` / `10.5Hz` / `8.5Hz` / `5.5Hz`) | None | Static MP3 loops | None |
| **Workflow Intelligence** | **Autonomous CSE v4** (2nd-order Markov + 14d decay) | Cloud behavioral profiling | Static links | Static folders |
| **Code Footprint** | **`~164 KB` gzipped** (`0` external runtime scripts) | Multi-MB ad SDKs | `4–9 MB` bundle | Cloud SPA |
| **Cost & Telemetry** | **Free · MIT · `0` Cloud Calls** | Paid with your data | `$40–$60 / yr` | `$72–$144 / yr` |

---

## 30-Second Installation

### Chrome, Brave, Arc & Microsoft Edge (Manifest V3)
1. Download **[`cove-chrome-mv3-v0.1.1.zip`](releases/cove-chrome-mv3-v0.1.1.zip)** and unzip it into a permanent folder (e.g., `~/Extensions/cove`).
2. Open `chrome://extensions` (or `brave://extensions`, `arc://extensions`, `edge://extensions`).
3. Toggle **Developer mode** ON (top-right corner).
4. Click **Load unpacked** and select the unzipped folder. Open a new tab (`⌘T` / `Ctrl+T`)—done!

### Firefox & Zen Browser (Gecko Manifest V3)
1. Download **[`cove-firefox-mv3-v0.1.1.zip`](releases/cove-firefox-mv3-v0.1.1.zip)**.
2. Open `about:debugging#/runtime/this-firefox` (or install permanently in Firefox Developer/Nightly via `about:addons` → ⚙️ → *Install Add-on From File*).
3. Select the `.zip` archive (or `manifest.firefox.json`).

---

## Keyboard-First Ergonomics

| Shortcut | Action |
| :--- | :--- |
| `/` | Focus Search & `!bang` Omnibar (`!g`, `!gh`, `!yt`, `!w`, `!mdn`, math & unit solver) |
| `⌘K` / `Ctrl+K` | Open Fuzzy Command Palette across tabs, sessions, notes & commands |
| `D` | Switch between **New Tab** and **Cove Discover** side-navigation section |
| `M` | Open **Functional Neural Sound Sanctuary** (`16 Hz` Beta / `10.5 Hz` Alpha / `5.5 Hz` Theta) |
| `1` · `2` · `3` · `4` | Switch Stage: `1` Bento New Tab · `2` Ambient Monolith · `3` Focus Sanctuary · `4` Pure 4K Stillness |
| `,` or `⌘,` | Open Full-Viewport 10-Section **Settings Studio** |
| `⌘J` / `Ctrl+J` | Inspect On-Device **Autonomous CSE v4** Markov Memory & Rhythm Graph |

---

## Architecture & Performance Budget

```text
cove/
├── src/
│   ├── boot-theme.ts              # Synchronous zero-flash Midnight Dark / Font Pair pre-paint
│   ├── background/                # MV3 service worker (Tab Triage Web Worker + Focus Blocker)
│   ├── lib/
│   │   ├── audio.ts               # 0 KB procedural Web Audio synth + 300-2500Hz Speech Shield
│   │   ├── discover.ts            # Verified RSS/Atom + Free API aggregator & ad-free extractor
│   │   ├── news-cache.ts          # 3-tier RAM + IndexedDB feed & 120-article LRU cache
│   │   ├── smart-engine.ts        # Autonomous CSE v4 (2nd-order Markov + 14-day half-life decay)
│   │   └── state.svelte.ts        # Reactive Svelte 5 runes store & URL #discover routing
│   └── newtab/
│       ├── components/            # Spatial Bento, Two-Pane Discover, Cove News Reader, 10-Tab Settings
│       └── styles/                # Self-hosted .woff2 fonts, OKLCH glass tokens & themes
├── public/                        # Bundled 4K wallpapers, .woff2 fonts, icons & Chrome MV3 manifest
├── manifest.firefox.json          # Native Gecko Manifest V3 configuration
├── scripts/package-extensions.mjs # Deterministicpackager + SHA-256 checksum generator
└── tests/core.test.mjs            # Automated MV3 CSP, <165 KB gzipped budget & zero-mock audit
```

---

## Build from Source

```bash
git clone https://github.com/cove-tab/cove.git
cd cove
npm install

# Start local dev & live preview server
npm run dev

# Run TypeScript check, build dist/, package .zip releases & verify SHA-256 + <165 KB budget
npx tsc --noEmit
npm run build
node --test tests/core.test.mjs
```

---

## License

Released under the [MIT License](LICENSE). Built with zero trackers, zero cloud lock-in, and calm craftsmanship.
