# Data model

Cove keeps state in three places: a synchronous boot cache, extension key-value storage, and IndexedDB. This page documents the shapes, keys, and migration rules.

## Storage map

| Store | Name | Contents |
| :--- | :--- | :--- |
| `localStorage` | `cove_fast_boot` | theme, preset, font pair, UI scale, corners, language |
| `chrome.storage.local` | `settings` | `CoveSettings` |
| `chrome.storage.local` | `smartMemory` | `SmartEngineMemory` |
| `chrome.storage.local` | `quickLinkGroups` | `QuickLinkGroup[]` |
| `chrome.storage.local` | `quickLinks` | `QuickLinkItem[]` |
| `chrome.storage.local` | `notes` | `NoteItem[]` |
| `chrome.storage.local` | `sessions` | `TabSession[]` |
| `chrome.storage.local` | `rssFeeds` | `RssFeedSource[]` |
| `chrome.storage.local` | `rssCache` | `RssEntry[]` |
| `chrome.storage.local` | `rssFetchedAt` | timestamp |
| `chrome.storage.local` | `countdowns` | `CountdownItem[]` |
| `chrome.storage.local` | `weatherCache` | `WeatherCache` |
| `chrome.storage.local` | `discoverProfile` | `DiscoverInterestProfile` |
| `chrome.storage.local` | `discoverCache` | legacy feed cache |
| `chrome.storage.local` | `pending_read_later` | items queued by the worker |
| `chrome.storage.local` | `blocker_state` | domains and active flag |
| `chrome.storage.local` | `tab_last_active` | tab id to timestamp map |
| IndexedDB | `cove_local_db` / `read_later` | `ReadLaterItem[]` |
| IndexedDB | `cove_local_db` / `blobs` | local wallpaper data URL |
| IndexedDB | `cove_news_cache_v1` / `feed_cache` | feed snapshot |
| IndexedDB | `cove_news_cache_v1` / `article_cache` | full articles with a `cachedAt` index |

In a plain web preview, `src/lib/storage.ts` uses `localStorage` keys prefixed with `cove:` instead of `chrome.storage.local`. IndexedDB names are unchanged.

## Settings

`CoveSettings` is the root object. Its major groups are:

- identity and shell: user name, language, theme, preset, layout, clock style
- typography: font pair, UI scale, corner style
- layout: grid columns/rows, quick-link columns/tile size, widget configs
- search: engines, split search, live suggestions, instant answers
- network opt-ins: RSS, Discover, favicons, read-later metadata
- atmosphere: background type, fit, dim, blur, brightness, contrast, vignette, chameleon accent, Unsplash opt-in
- time awareness: work hours, work days, mode override
- smart engine: autonomy mode, whisper mode, individual automation toggles
- weather: opt-in, city, coordinates, unit
- focus: durations, intention, blocked domains, sound mix, neural mode, depth, speech shield, history, streak
- widgets: type, size, visibility, order, pin, iframe URL/title

Defaults live in `createDefaultSettings()` and are covered by `tests/defaults.test.mjs`.

## Smart memory

`SmartEngineMemory` is a versioned object:

- `version`: currently 4
- signal counters: `totalSignals`, hourly arrays, weekly heatmap
- affinity maps: links, domains, engines, widgets, sounds, neural modes, scenes
- workflow matrices: `transitionMatrix` (first-order), `biTransitionMatrix` (second-order)
- labels: `nodeLabels` for human-readable chains
- feedback: `categoryAffinity`, dismissals, accepted/dismissed counts
- autopilot: `autopilotLog`
- recency: `lastDecayAt`, `lastUpdatedAt`

The engine starts at zero signals. There are no seeded weights. `upgradeSmartMemory()` fills missing fields when an older backup is imported.

## Discover profile

`DiscoverInterestProfile` stores:

- selected topics,
- topic scores,
- source scores,
- keyword scores,
- muted keywords,
- dismissed and read story IDs,
- total interactions.

It is local only and is included in the backup because it affects what the user sees.

## Feed cache

`cove_news_cache_v1` stores:

- `feed_cache/primary_feed`: `{ fetchedAt, stories }`, capped at 90 stories when saved.
- `article_cache`: keyed by normalized URL, with `cachedAt` for LRU eviction, capped at 120 articles.

`normalizeStoryKey` strips the fragment. Feed stories use `buildStoryId` so that two URLs from the same publisher cannot collide after truncation. Legacy cached IDs are repaired on hydration.

## Backup format

A JSON export has this shape:

```json
{
  "exportedAt": "2026-10-27T12:00:00.000Z",
  "app": "Cove",
  "version": 6,
  "settings": {},
  "smartMemory": {},
  "quickLinkGroups": [],
  "quickLinks": [],
  "notes": [],
  "sessions": [],
  "readLater": [],
  "rssFeeds": [],
  "countdowns": []
}
```

`version` is the backup schema version, not the extension version. The importer accepts files up to 25 MB and requires `app: "Cove"` and a `settings` object.

### Import rules

`src/lib/validation.ts` enforces:

- input must be a plain object,
- strings are trimmed and length-bounded,
- numbers must be finite and are clamped,
- enums must match known values,
- arrays are bounded,
- URLs must be credential-free HTTP(S),
- image values must be a bounded image data URL or HTTPS URL,
- settings are rebuilt over safe defaults rather than trusted wholesale,
- imported objects are not mutated and prototypes are not polluted.

If a value is invalid, it falls back rather than crashing the import. The importer reports success or failure in the UI.

## Migration rules

1. Never change a storage key without a migration path.
2. Add new fields with a default in `createDefaultSettings()`.
3. Bump the smart memory version when its shape changes and update `upgradeSmartMemory()`.
4. Bump the backup schema version when the export shape changes.
5. Keep old backups importable for at least one minor release.
6. Add a test for the migration path.
7. Document the change in the changelog.

## Deletion

Factory reset clears Cove keys and both IndexedDB databases. Uninstalling the extension removes extension storage; browser profile backups may retain copies until overwritten.

## Related reading

- [Architecture](architecture.md)
- [Privacy](privacy.md)
- [Discover](discover.md)
- [Smart engine](smart-engine.md)
- [Security](security.md)
