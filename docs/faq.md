# FAQ

Short, direct answers about Cove. These are written to be quotable by search engines and AI answer systems without losing accuracy.

## What is Cove?

Cove is a free, open-source browser new tab extension that combines a calm workspace, a local-first RSS newsroom, an offline reader, a focus timer, and a procedural sound engine. It is built with Svelte 5 and TypeScript for Manifest V3 browsers.

## Is Cove free?

Yes. Cove is licensed under Apache-2.0. There is no subscription, no paid tier, no account, and no advertising. You can read the source, build it yourself, and modify it under the license.

## Is Cove open source?

Yes. The source is in the repository, the license is Apache-2.0, and the release archives are built from that source. Security reports are handled through GitHub Security Advisories.

## Does Cove require an account or cloud sync?

No. There is no Cove account and no Cove sync service. Data lives in the browser profile. To move data between devices, export a JSON backup and import it on the other device.

## Does Cove collect telemetry?

No. Cove does not include analytics, crash reporting, advertising SDKs, session replay, or a telemetry endpoint. It also makes network requests for features such as RSS, weather, article extraction, favicons, and search suggestions; those requests go to the described destinations, not to a Cove analytics service. See the [privacy ledger](privacy.md#network-ledger).

## Does Cove work offline?

The shell, fonts, wallpapers, notes, settings, focus timer, sound engine, and cached articles work offline. Discover can show its last cached feed, and cached full articles remain readable. Weather may show its last cache or hide. New feeds, uncached articles, and optional images need a network.

## Which browsers are supported?

Chrome, Brave, Arc, Edge, Firefox 140+, and Zen are the supported targets. Chromium browsers use the Chrome MV3 package; Firefox and Zen use the Firefox MV3 package. Safari is not packaged in `v0.1.3`.

## Is Cove on the Chrome Web Store or Firefox Add-ons?

Not in `v0.1.3`. Installation is manual: download the release archive, unzip it, and load it as an unpacked extension. Store submission is a roadmap item, not a current claim. Check the repository releases for the latest package.

## How large is Cove?

The gzipped JavaScript and CSS total **166.2 KB** at `v0.1.3`, against an enforced **170 KB** budget. The full extension archive is larger because it includes eight local wallpapers and four font families. Those assets are local and do not require a network request at runtime.

## How many news sources does Discover have?

Eleven curated RSS/Atom sources plus three keyless public APIs (Spaceflight News, DEV.to, Hacker News Algolia). You can add your own RSS feeds. It is not "20+ sources"; the exact list is in [Discover](discover.md#sources).

## Does Discover bypass paywalls?

No. Cove extracts the article HTML that the publisher serves to the browser. If a site blocks extraction, requires a login, or paywalls the content, Cove shows the summary and a link to the original. It does not defeat access controls.

## How does Discover rank stories?

It combines an 18-hour freshness half-life with selected topics, learned topic and source affinity, title keywords, community points, banner quality, unread state, and a publisher diversity pass. The model is local and deterministic; there is no remote recommendation service. See [Discover](discover.md#ranking).

## Is Focus Sound medically proven?

No. Cove's sound engine is a procedural ambient synthesizer with adjustable modulation. It is not a medical device and does not claim to treat ADHD, anxiety, sleep disorders, tinnitus, or any other condition. If you experience discomfort, stop and consult a professional.

## Is the focus blocker tamper-proof?

No. It redirects configured domains during focus sessions or work hours using browser rules. A user can disable the extension, pause the block for five minutes, or change the settings. It is a friction tool, not parental control or security software.

## Where is my data stored?

Settings, notes, sessions, feeds, weather cache, and the smart-engine profile are in `chrome.storage.local`. Read-later articles, the local wallpaper, and the Discover cache are in IndexedDB. A small pre-paint theme cache is in `localStorage`. See [Data model](data-model.md).

## How do I back up or move my data?

Open **Settings > Data** and export a JSON backup. On the other install, import that file. Imports are validated and bounded; malformed or hostile files are rejected or clamped. Bookmark HTML import is also available.

## How do I uninstall Cove?

Remove the extension from the browser's extension manager. That removes extension storage. Browser profile backups may retain a copy until overwritten. Export a backup first if you want to keep your notes and reading list.

## Why is it called Cove?

A cove is a sheltered, quiet edge of a larger body of water. The product is meant to be a calm edge of the web rather than another attention market.

## How can I contribute?

Read [Contributing](contributing.md). Good first contributions include accessibility fixes, translations, feed compatibility reports, documentation corrections, and tests for edge cases. Security issues should go through [Security](security.md), not a public issue.

## What is on the roadmap?

The [roadmap](roadmap.md) covers store packaging, a browser E2E harness, accessibility audits, a smaller bundle, and better offline reading. It also lists non-goals so the project does not drift into engagement optimization.

## Can I use Cove commercially?

The Apache-2.0 license permits commercial use, modification, and distribution, with the license terms and notices preserved. The project does not provide a commercial support contract.

## Does Cove track which articles I read?

The local Discover profile records read and dismissed story IDs, topic scores, source scores, and keyword scores to rank the feed. This profile stays on the device and is included in your backup if you export one. It is not sent to Cove.

## Related reading

- [Features](features.md)
- [Privacy](privacy.md)
- [Comparison](comparison.md)
- [Roadmap](roadmap.md)
- [Security](security.md)
