# Privacy

Cove is local-first, but "local-first" does not mean "offline-only." This page states exactly what is stored, what can leave the device, and which controls change the behaviour.

## The short version

- No Cove account.
- No Cove analytics, telemetry, crash reporting, or advertising SDK.
- No Cove server receives your data.
- Notes, sessions, read-later articles, settings, and the smart-engine profile are stored in your browser profile.
- Network requests go to the publishers and public services you enable. They can see your IP address and request timing, like any other web request.
- Discover, the RSS widget, weather, favicons, search suggestions, and read-later metadata are network features. Several are enabled by default because the product is a news and weather surface; each can be turned off.
- Unsplash wallpapers are opt-in and off by default.

## What is stored locally

| Data | Location | Purpose |
| :--- | :--- | :--- |
| Settings, layout, theme, focus preferences | `chrome.storage.local` key `settings` | Restore the workspace |
| Quick links and groups | `chrome.storage.local` | Workspace shortcuts |
| Notes | `chrome.storage.local` | Local scratchpad |
| Sessions | `chrome.storage.local` | Saved tab sets |
| RSS feeds, cached headlines | `chrome.storage.local` | RSS widget |
| Weather cache | `chrome.storage.local` | Offline weather card |
| Smart-engine memory | `chrome.storage.local` | On-device personalization |
| Discover profile | `chrome.storage.local` | Topic and source preferences |
| Discover feed cache | IndexedDB `cove_news_cache_v1` | Faster, offline-friendly feed |
| Full articles | IndexedDB `cove_news_cache_v1` | Offline reader, up to 120 articles |
| Read-later queue | IndexedDB `cove_local_db` | Offline reading list |
| Local wallpaper | IndexedDB `cove_local_db` | Custom background |
| Pre-paint theme cache | `localStorage` key `cove_fast_boot` | Avoid a theme flash |

There is no server-side copy. Uninstalling the extension or clearing site data removes the local copy. Use **Settings > Data** to export a JSON backup before uninstalling.

## Network ledger

This table is the complete production network surface in `v0.1.1`. The exact endpoints are visible in source.

| Feature | Destination | When | Default | Can disable |
| :--- | :--- | :--- | :--- | :--- |
| Discover curated feeds | 11 publisher RSS/Atom URLs | On new tab when Discover is enabled and cache is older than 3 minutes | On | Settings > Privacy & Feeds |
| Discover public APIs | `api.spaceflightnewsapi.net`, `dev.to`, `hn.algolia.com` | With Discover refresh | On | Settings > Privacy & Feeds |
| Discover custom feeds | URLs you add | When Discover refreshes | Off until you add one | Remove the feed |
| Article prefetch | Publisher article URL | Lead story prewarm, hover, or reader open | On with Discover | Disable Discover |
| Article images | Publisher/CDN image URLs | When a story or article renders | On with Discover | Disable Discover or block images |
| Open Graph enrichment | Publisher article URL | When a feed item has no banner or description | On with Discover | Disable Discover |
| RSS widget | Up to 5 feed URLs | On new tab, at most every 20 minutes | On | Settings > Privacy & Feeds |
| Weather forecast | `api.open-meteo.com` | On new tab when weather is enabled, cache 30 minutes | On | Settings > General |
| Weather geocoding | `geocoding-api.open-meteo.com` | When you search for a city | On demand | Use a fixed location |
| Browser geolocation | Browser/OS location service | Only when you press **Detect my location** | Off | Do not press it |
| Search autocomplete | `duckduckgo.com/ac/` | While typing at least 2 characters, if live suggestions are on | On | Settings > Search |
| Favicons | `google.com/s2/favicons`, `icons.duckduckgo.com` | When a quick link or tab needs an icon | On | Settings > Appearance/Search |
| Read-later metadata | The saved page URL | When you save an article, if metadata fetch is on | On | Settings > Privacy & Feeds |
| Unsplash scene image | `images.unsplash.com` | Only when you enable Unsplash for a curated scene | Off | Keep local wallpapers |

### What is never requested

- No Google Fonts, Adobe Fonts, or other font CDN. All fonts are bundled.
- No analytics, tag manager, session replay, heatmap, or A/B testing endpoint.
- No ad network or sponsored content feed.
- No remote JavaScript, remote CSS, or remote audio.
- No Cove synchronization endpoint.

## Defaults and informed consent

Cove is not a "network silent by default" product. The default build is a functioning newsroom, weather card, and favicon-rich workspace, so these features start enabled:

- Discover: on.
- RSS widget: on, with a small starter feed list.
- Weather: on, using an inferred initial location.
- Live search suggestions: on.
- Favicon service: on.
- Read-later metadata fetch: on.

If you want a network-minimal configuration:

1. Open **Settings > Privacy & Feeds** and disable Discover and RSS.
2. Open **Settings > General** and disable weather.
3. Open **Settings > Search** and disable live suggestions and the favicon service.
4. Keep Unsplash off.
5. Use local wallpapers and the built-in audio engine, which never touch the network.

The Settings Studio includes a live network ledger that counts requests by category during the session. It is a transparency aid, not a guarantee that every browser-level request is visible to the page.

## Browser permissions

| Permission | Why Cove asks | What it enables |
| :--- | :--- | :--- |
| `storage` | Persist the workspace | Settings, notes, sessions, caches |
| `tabs` | Tab triage and sessions | Read tab titles/URLs, close, mute, group, suspend |
| `tabGroups` | Group tabs by domain | Chromium tab groups |
| `sessions` | Restore recently closed tabs where supported | Session restore |
| `bookmarks` | Bookmark import | Read bookmarks during an explicit import |
| `contextMenus` | Save to Read Later | Right-click action |
| `declarativeNetRequest` + `declarativeNetRequestWithHostAccess` | Focus blocker | Redirect blocked main-frame requests |
| `alarms` | Auto-snapshot and blocker resume | Scheduled local jobs |
| `https://api.open-meteo.com/*` | Weather | Forecast requests |
| `https://geocoding-api.open-meteo.com/*` | City search | Geocoding requests |
| `<all_urls>` | RSS, article extraction, favicons, custom feeds | Fetch the sources you choose |

`<all_urls>` is broad because a custom RSS reader and article extractor cannot know every publisher in advance. Cove does not inject a content script into every page and does not read page content in the background. The permission is used for explicit feature requests from the extension page and worker.

## Data portability and deletion

- **Export:** Settings > Data produces a JSON file containing settings, lists, sessions, read later, feeds, countdowns, and smart memory.
- **Import:** JSON is validated and bounded before use. Invalid URLs and hostile values are rejected or clamped.
- **Delete:** Settings > Data includes a factory reset that clears Cove keys and IndexedDB stores.
- **Uninstall:** Removing the extension removes extension storage; browser profile backups may retain copies until overwritten.

## Children and sensitive data

Cove is a general-purpose productivity tool, not a service directed at children. It does not intentionally collect personal information. Because notes and read-later articles can contain sensitive material, protect your browser profile with disk encryption and a screen lock.

## Changes to this policy

Material changes to the network surface must update this page, the README privacy summary, and the release notes. A new endpoint is a privacy change even if it is "just an image."

## Related reading

- [Security](security.md)
- [Data model](data-model.md)
- [FAQ](faq.md)
- [Architecture](architecture.md)
