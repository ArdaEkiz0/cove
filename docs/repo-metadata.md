# Repository metadata

Copy-paste values for GitHub. Keep them aligned with the release; do not add a store badge or award that does not exist.

## About

GitHub's About field should be one clear sentence or two. Recommended:

```text
Calm, local-first Manifest V3 new tab: 11 curated feeds + 3 keyless APIs, offline reader, tab workspace, Pomodoro, and procedural focus audio. 167.5 KB gzipped, zero telemetry, no account. Svelte 5 + TypeScript. Apache-2.0.
```

Shorter alternative:

```text
A calm, local-first new tab with curated reading, offline articles, and focus tools. No account, no analytics, no Cove server. Apache-2.0.
```

## Website

```text
https://appcove.vercel.app/
```

Use the repository releases page as the install source until the site's download links are verified for the current release.

## Topics

GitHub allows up to 20 topics. Recommended set:

```text
browser-extension
new-tab
chrome-extension
firefox-addon
manifest-v3
svelte
typescript
rss-reader
local-first
privacy
focus-timer
pomodoro
web-audio
indexeddb
productivity
momentum-alternative
zen-browser
brave-browser
offline-reader
ad-free
```

Remove or replace topics that do not describe the shipped product. Do not add `ai` unless the local heuristic genuinely warrants it; "smart engine" is not a cloud AI product.

## Social preview

Upload `assets/readme/social-preview-1280x640.png` under **Settings > General > Social preview**.

Guidance:

- 1280x640 PNG, under 1 MB if possible.
- Product name large enough to read in a timeline.
- One line of positioning, not a feature list.
- Real UI, not a fake dashboard.
- Avoid text smaller than 24px at 1280px wide.
- Keep the current version and bundle claim out of the image so it does not age badly.

Suggested overlay copy:

```text
Cove
Your calm corner of the web.
Local-first. Open source. No account.
```

## Release title and notes

Title:

```text
Cove v0.1.1 - A calmer, local-first new tab
```

Notes outline:

```markdown
## Highlights
- Calm Bento / Ambient / Focus / Stillness stages
- Cove Discover: 11 curated feeds + 3 keyless APIs
- Offline Cove News reader with a 120-article cache
- Focus timer, blocker, and procedural neural audio
- Local Smart Engine with inspectable Markov memory

## Measurements
- 167.5 KB gzipped JS + CSS (170 KB CI budget)
- 54 unit tests + 2 integration audits
- Manifest V3, strict CSP, no inline script

## Install
Download the Chrome or Firefox ZIP, unzip, and load it manually. Store listings are not available yet.

## Known limitations
- No sync or account
- No paywall bypass
- No formal accessibility audit
- Some publishers block extraction

## Verification
See SHA256SUMS.txt and release-manifest.json.
```

## Pinned issue

Title: **Start here: install, known limitations, and broken-feed reports**

Body:

```markdown
Welcome to Cove.

- Install: download the Chrome or Firefox ZIP from Releases, unzip, and load it as an unpacked extension.
- Requirements: Chrome/Brave/Arc/Edge, or Firefox 128+/Zen.
- Not available on a store yet. Do not use a store listing claiming to be Cove.
- Privacy: read docs/privacy.md for the complete network ledger.
- Broken feed: include the publisher, feed URL, browser, and a screenshot.
- Security: use GitHub Security Advisories, not a public issue.

Known limits: no sync, no paywall bypass, no formal accessibility audit, and some article pages cannot be extracted.
```

## Discussion categories

Enable Discussions with:

- **Announcements** - releases and project news.
- **Q&A** - install and usage questions.
- **Show and tell** - setups, screenshots, forks.
- **Ideas** - roadmap proposals.
- **General** - everything else.

Pin the start-here issue in Issues and a welcome post in Discussions.

## Repository settings checklist

- [ ] Description set.
- [ ] Website set.
- [ ] Topics set.
- [ ] Social preview uploaded.
- [ ] Issues enabled.
- [ ] Discussions enabled.
- [ ] Security advisories enabled.
- [ ] Dependabot alerts enabled.
- [ ] Secret scanning enabled where available.
- [ ] Branch protection on `main`: require CI, require review, no force push.
- [ ] Actions permissions restricted to read by default.
- [ ] Release immutability enabled if available.
- [ ] Wiki disabled unless actively maintained.
- [ ] Projects disabled unless used.

## README badges

Use only badges that resolve:

- release version from GitHub,
- license from GitHub,
- CI status from the workflow,
- bundle budget static badge only if it matches the measured build,
- Manifest V3 static badge,
- "no telemetry" static badge, phrased precisely.

Do not add:

- Chrome Web Store rating,
- Firefox Add-ons users,
- Product Hunt badge,
- "GitHub trending",
- "repo of the month",
- any award not actually received.

## Profile and organization

If the project later moves to an organization:

- keep the repository name `cove`,
- preserve release asset names and checksums,
- update `homepage`, `repository`, and `bugs` in `package.json`,
- redirect the old URLs,
- update the security contact and citation file.

## Related reading

- [SEO and AEO](seo-aeo.md)
- [Launch kit](launch-kit.md)
- [Brand](brand.md)
- [Publish to GitHub](publish-to-github.md)
