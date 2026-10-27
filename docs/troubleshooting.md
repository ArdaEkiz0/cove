# Troubleshooting

Start with the release version and browser. Most install problems are caused by selecting the ZIP instead of the unzipped folder, or by another extension overriding the new tab.

## The extension will not load

**Chrome, Brave, Arc, Edge**

1. Unzip the Chrome MV3 archive into a permanent folder.
2. Confirm `manifest.json` is directly inside that folder, not one level deeper.
3. Open `chrome://extensions`, enable **Developer mode**, choose **Load unpacked**, and select the folder containing `manifest.json`.
4. If Chrome reports "Manifest file is missing or unreadable", you selected the ZIP or its parent folder.

**Firefox 128+ / Zen**

1. Open `about:debugging#/runtime/this-firefox`.
2. Choose **Load Temporary Add-on** and select `manifest.json` inside the unzipped Firefox package.
3. Temporary add-ons disappear when the browser closes. For a persistent install, use Firefox Developer Edition/Nightly and **Install Add-on From File**.

Cove is not on a store in `v0.1.1`. Do not install a store listing claiming to be Cove.

## The new tab did not change

Another extension or a browser policy may own the new tab page. Disable other new tab extensions, then reload the extension. In Chromium, check the new tab override in the extension's details. In Firefox, check **Settings → Home → New tabs**.

## Discover is empty or missing stories

- Open **Settings → Privacy & Feeds** and confirm Discover is enabled.
- Check the network. Discover needs publisher feeds or APIs on a cold cache; the last cached feed can still render offline.
- A single publisher can be down, rate-limited, or serving a changed feed. The rest of the feed should still load.
- Custom RSS feeds load after curated sources. A slow custom feed does not block the newsroom.
- If every source fails, check the browser console for CORS, DNS, or extension-permission errors and open an issue with the publisher and feed URL.

Discover is not a full-text archive and does not bypass paywalls.

## The reader cannot extract an article

Extraction is heuristic. JavaScript-heavy pages, login walls, consent walls, and paywalled content may fail. Cove keeps the publisher link available and does not attempt to defeat access controls. Try the original page, or save a different story.

## Weather is blank or stale

Weather uses Open-Meteo and is enabled by default. Confirm the feature is on in **Settings → General**, set a fixed city instead of browser geolocation, and check the network. The last response is cached for offline display; a stale card is expected without a connection.

## Search suggestions or favicons are missing

Autocomplete uses DuckDuckGo and favicons use public favicon services. Both are on by default and can be disabled in **Settings → Search**. If a network filter blocks those domains, suggestions and icons will be absent; search itself still works.

## There is no sound

- Audio starts only after a user interaction, by browser policy.
- Check the tab is not muted and the system output is correct.
- Try a different mode or texture; some mixes are intentionally quiet.
- Bluetooth devices and browser audio policies can add latency or drop the graph.
- The audio is an aesthetic tool, not a medical device. Stop if it is uncomfortable.

## The focus blocker is not blocking a site

- Confirm the domain is in the blocker list and the session/work-hours rule is active.
- Reload the page; existing requests may already be in flight.
- The five-minute pause and extension disable both bypass the block by design.
- The blocker is a friction tool, not parental control or a security boundary.

## Importing a backup fails

Cove validates and bounds imports. A file can be rejected because it is not valid JSON, comes from an unsupported schema, or contains values outside the allowed ranges. Export a fresh backup from the same version, do not hand-edit the file, and avoid importing a backup from an unrelated extension. See [Data model](data-model.md#backup-format).

## The build fails

- Use Node.js `>=22.18.0`.
- Run `npm ci` from the repository root.
- If the install was interrupted, remove `node_modules` and run `npm ci` again.
- Ports `5173` and `4173` must be free for dev and preview.
- A bundle failure at 170 KB is intentional. Run `npm run budget` to see the current size; do not raise the limit without documenting the trade-off.

## Reporting a bug

Include the Cove version, browser and OS, steps to reproduce, expected and actual behavior, console errors with secrets removed, and whether the problem occurs on a clean profile. For a broken feed, include the publisher and feed URL. Never paste a full backup or browsing history into an issue.

Security issues go through [GitHub Security Advisories](https://github.com/DevAnimecx/cove/security/advisories/new), not a public issue.

## Related reading

- [FAQ](faq.md)
- [Features and limitations](features.md)
- [Privacy](privacy.md)
- [Contributing](contributing.md)
