# Cove Discover

Cove Discover is the reading room inside the new tab: a two-pane newsroom with curated feeds, keyless public APIs, custom RSS, a local interest model, an offline cache, and a distraction-free reader.

It is not a social feed, an algorithmic engagement machine, or a paywall bypass. It is a local aggregator that shows what published sources are saying and lets you read without the surrounding page.

## Sources

### Curated RSS/Atom (11)

| Publisher | Topic | Feed |
| :--- | :--- | :--- |
| The Verge | Tech & AI | `theverge.com/rss/index.xml` |
| Ars Technica | Tech & AI | `feeds.arstechnica.com/arstechnica/index` |
| BBC World | World | `feeds.bbci.co.uk/news/world/rss.xml` |
| The Guardian | World | `theguardian.com/world/rss` |
| NASA | Science & Space | `nasa.gov/feed/` |
| Guardian Science | Science & Space | `theguardian.com/science/rss` |
| Dezeen | Design & Culture | `dezeen.com/feed/` |
| Aeon Essays | Design & Culture | `aeon.co/feed.rss` |
| CNBC Markets | Business & Markets | `search.cnbc.com/rs/search/...` |
| Guardian Business | Business & Markets | `theguardian.com/uk/business/rss` |
| Cloudflare Engineering | Engineering | `blog.cloudflare.com/rss/` |

### Keyless public APIs (3)

| API | What it adds | Topic |
| :--- | :--- | :--- |
| Spaceflight News v4 | spaceflight and launch coverage | Science & Space |
| DEV.to | practitioner engineering posts | Engineering |
| Hacker News Algolia | front-page community links and points | Tech & AI |

All three require no API key. They are not scraped HTML APIs; they return JSON. Rate limits and availability are controlled by the providers.

### Custom feeds

You can add any HTTP(S) RSS/Atom URL. Custom feeds are merged after the curated feed so a slow or broken custom source never blocks the main newsroom. The feed title is used as the publisher label.

## Topics

The rail exposes:

- For You
- Tech & AI
- World Dispatch
- Science & Space
- Engineering
- Design & Culture
- Business & Markets
- Saved stories

The default interest profile starts with Tech & AI, Science, World, and Design selected, with mild initial weights. It is not a claim about the user; it is a usable starting point. The profile adapts after real interactions.

## Ranking

`rankStoriesForUser` combines:

1. **Freshness** - an 18-hour half-life. A story loses half its freshness weight every 18 hours.
2. **Explicit topic selection** - a boost for topics the user selected.
3. **Learned topic affinity** - topic scores updated by briefs, full reads, boosts, and dismissals.
4. **Source affinity** - publisher scores from feedback.
5. **Keyword affinity** - title keywords matched against positive and muted keyword scores.
6. **Community velocity** - points from Hacker News and reactions from DEV.to where available.
7. **Banner quality** - a small preference for stories with a usable image.
8. **Unread state** - a small boost for unread, a penalty for already read.
9. **Diversity pass** - prevents the top cards from being dominated by one publisher.

The ranking is deterministic for a given story set and profile. There is no remote model and no cross-user learning.

## Feedback

| Action | Topic | Source | Keywords | Notes |
| :--- | :--- | :--- | :--- | :--- |
| Open brief | +0.85 | +0.72 | +0.60 | Records a read ID |
| Open full article | +1.80 | +1.53 | +1.26 | Stronger signal |
| More like this | +2.40 | +2.04 | +1.68 | Explicit boost |
| Less like this | -0.65 | -1.40 | +1.50 mute | Dismisses the story and mutes related keywords |

Values are the actual deltas in `recordDiscoverFeedback`; scores are bounded, and dismissed IDs are capped.

Dismissed story IDs are capped at 200. Keyword and topic scores are bounded. The profile is stored in `chrome.storage.local` and can be exported with the backup.

## Story brief

Clicking a card opens a brief with:

- headline, publisher, topic, and time,
- a short summary,
- key points when the feed supplies them,
- reading time,
- a link to the original,
- actions for the full reader, save, boost, or less.

The brief is intentionally shallow. It is a decision surface, not a replacement for the article.

## Cove News reader

The reader fetches the original article and extracts the main prose locally:

1. Remove scripts, styles, navigation, forms, iframes, and similar chrome.
2. Prefer `article`, `main`, or `[role="main"]`.
3. Keep headings, paragraphs, blockquotes, code, figures, and captions.
4. Escape text before inserting it into the reader.
5. Fall back to `content:encoded` when the page is JavaScript-heavy.
6. Fall back to JSON-LD `articleBody` when the page yields too little prose.
7. If all else fails, show the summary and the original link.

The reader does not execute publisher scripts, does not embed remote frames, and does not attempt to defeat paywalls. Some sites will not work. That is an accepted limitation.

## Cache

| Layer | Content | Limit |
| :--- | :--- | :--- |
| Memory | Current feed and opened articles | Session |
| IndexedDB `feed_cache` | Feed snapshot | 90 stories |
| IndexedDB `article_cache` | Full articles | 120 articles, LRU by `cachedAt` |

Freshness targets: 3 minutes for the feed, 30 minutes for weather (separate), 20 minutes for the RSS widget. Cached content is served immediately while a refresh runs in the background where possible.

The cache is local. Clearing site data or resetting Cove removes it.

## Offline behaviour

- The last feed snapshot can render without a network.
- Cached full articles can be read offline.
- Images may be missing offline unless the browser cached them.
- Custom feeds that have never loaded cannot appear offline.
- Refresh failures do not erase the last good cache.

## Privacy

Discover is a network feature. On a new tab it can contact the curated feeds and public APIs, publisher pages for missing metadata, and publisher images. See the [privacy ledger](privacy.md#network-ledger) for the full list and the controls.

There is no Cove recommendation server. The interest profile never leaves the device.

## Design constraints

- No infinite scroll designed to maximize time on page.
- No sponsored stories.
- No autoplay video.
- No comment section.
- No fake engagement counts. Community points are shown only when a source provides them.
- No story is invented to fill space. An empty feed says it is empty.

## Known limitations

- Publishers change feed URLs and formats without notice.
- CORS and anti-bot behaviour can block extraction.
- Images are controlled by publishers and may track requests.
- The ranking is a small local heuristic, not a news judgment system.
- Topic classification is a static mapping per source plus keyword signals; it can misclassify edge cases.
- No full-text search across the archive yet.

## Related reading

- [Architecture](architecture.md)
- [Privacy](privacy.md)
- [Data model](data-model.md)
- [Features](features.md)
- [FAQ](faq.md)
