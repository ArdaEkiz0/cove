# Launch kit

This is a practical launch plan for Cove, not a promise of virality. The goal is to reach the people who genuinely want a local-first new tab, earn useful feedback, and build a credible project history.

## Narrative

**One line:** A calm, local-first new tab with curated reading, offline articles, and focus tools. No account, no analytics, no Cove server.

**Problem:** Browser start pages are ad portals, wallpaper subscriptions, or unread-count inboxes. Focus apps and readers live in separate tabs with separate accounts.

**Solution:** Cove puts a quiet workspace, a small newsroom, an offline reader, a Pomodoro timer, and procedural sound in one Manifest V3 extension. It stores data locally, ships 167.7 KB of gzipped runtime, and can be audited.

**Proof:** Apache-2.0, 54 unit tests, 2 integration audits, 170 KB budget, documented network ledger.

**Ask:** Try it, file specific issues, and tell us which source or browser breaks.

## Audience

1. **Privacy and local-first developers** - care about architecture, permissions, and telemetry.
2. **RSS refugees** - want a small, calm reader without a cloud account.
3. **Focus-tool users** - want a timer and soundscape without another subscription.
4. **Browser tinkerers** - Chrome, Brave, Arc, Edge, Firefox, Zen users who load unpacked extensions.
5. **Design-minded productivity people** - want a beautiful new tab that is not a billboard.

Do not target "everyone with a browser." The product is opinionated; the launch should be too.

## Assets

- [x] Hero banner: `assets/readme/hero-banner.svg`
- [x] Screenshots: dark, light, Discover, focus, sound, settings
- [x] Social preview: `assets/readme/social-preview-1280x640.png`
- [x] README with install, privacy, architecture, FAQ
- [x] Release archives and checksums
- [x] Privacy ledger and security policy
- [x] 60-second demo script (below)
- [ ] 30-second screen recording
- [ ] Store listing (not available yet)

## Demo script

1. Open a new tab. Let the dark stage settle for two seconds.
2. Press `D`. Scroll the Discover rail, open a story brief, then the full reader.
3. Press `Esc`, then `3`. Start a 25-minute focus session.
4. Press `M`. Blend rain and waves; switch to Deep Work.
5. Press `,`. Search settings for "privacy"; show the network ledger.
6. Press `Cmd/Ctrl+J`. Show the empty smart-engine state and explain that it starts at zero signals.
7. Close on the new tab and the line: "No account. No analytics. No Cove server."

Record at 1440p or 1080p, 30fps, no fake data. If the smart engine has no signals, say so; that is the honest demo.

## Launch channels

### GitHub

- Publish the release with notes and checksums.
- Pin an issue: "Start here: install, known limitations, and how to report a broken feed."
- Enable Discussions with Q&A and Show and tell.
- Add topics and a social preview.
- Do not ask for stars in the release notes.

### Hacker News

Post as **Show HN: Cove - a local-first new tab with an offline reader**. Link to the repository, not a landing page with a gate.

First comment should include:

- why it exists,
- what is genuinely different,
- the measured bundle and test count,
- the honest limitations,
- an invitation to audit the privacy ledger.

Expect criticism about `<all_urls>`, feed scraping, and the word "neural." Answer with specifics. Do not argue about taste.

### Reddit

Relevant communities:

- r/browsers
- r/firefox
- r/chrome_extensions
- r/privacy
- r/rss
- r/productivity
- r/SideProject

Rules differ. Read them. Post a screenshot and a short story, not a copy-paste ad. Disclose that you are the maintainer. Answer questions for the first few hours.

### Product Hunt

Prepare:

- 240-character tagline,
- 3-5 gallery images,
- a first comment with the story and limitations,
- a demo GIF,
- a clear "not on the Chrome Web Store yet" note.

Product Hunt rewards polish and a real maker story. It does not guarantee traffic.

### X / Mastodon / Bluesky

A short thread:

1. The problem with start pages.
2. The Cove approach.
3. Three screenshots.
4. The measured proof.
5. The install link and the honest caveat.

Avoid engagement bait. Pin the thread for a week.

### Newsletters and directories

Submit to:

- open-source newsletters,
- privacy tool lists,
- RSS directories,
- browser extension directories,
- local-first software communities.

Use the same description everywhere. Do not pay for placement without disclosure.

## 14-day timeline

| Day | Work |
| :--- | :--- |
| -7 | Freeze features; update README, screenshots, privacy ledger, release notes |
| -3 | Build and verify archives; test clean installs on Chromium and Firefox |
| -1 | Prepare posts, demo recording, pinned issue, discussion categories |
| 0 | Publish release; post Show HN, Reddit, X, LinkedIn; reply all day |
| +1 | Post the technical deep dive; answer issues; fix install friction |
| +2 | Submit to newsletters and directories; publish the comparison page |
| +3 | Share one user story or a design note; do not spam |
| +7 | Publish a "what we learned" note with real numbers and fixes |
| +14 | Review search queries, downloads, and issues; update docs |

## Post templates

### Show HN

```text
Show HN: Cove - a local-first new tab with an offline reader

Cove is an open-source Manifest V3 new tab for Chrome/Firefox. It combines a
small RSS newsroom (11 curated feeds + 3 keyless APIs), an offline article
reader, a Pomodoro timer, tab triage, and a procedural Web Audio focus engine.

It has no account, no analytics, and no Cove server. Runtime JS+CSS is 167.7 KB
gzipped against a 170 KB CI budget. Data lives in chrome.storage.local and
IndexedDB. The privacy ledger lists every network destination.

Things it does not do: bypass paywalls, sync across devices, or prove anything
medical with the audio. I would especially value feedback on feed extraction,
the <all_urls> permission, and accessibility.

Repo: https://github.com/DevAnimecx/cove
```

### Reddit

```text
I built a calm new tab because I was tired of ad carousels and unread-count
anxiety. It is local-first, open source, and works in Chrome/Firefox.

The part I am most unsure about is the permission model: the extension needs
<all_urls> to fetch custom RSS feeds and extract articles. I documented why in
the privacy ledger and made Discover/RSS/weather individually disableable.

Happy to answer architecture questions or hear what would make it a daily driver.
```

### Short post

```text
Cove v0.1.1 is out: a local-first new tab with a small RSS newsroom, offline
reader, focus timer, and procedural sound. No account, no analytics, no Cove
server. 167.7 KB gzipped. Apache-2.0.

Install: https://github.com/DevAnimecx/cove/releases
Limits: no store listing yet, no sync, no paywall bypass.
```

## Metrics that matter

- installs that lead to a second session,
- feed extraction failures by publisher,
- issue quality and time to first response,
- release download counts,
- GitHub traffic referrers,
- search impressions for the target clusters,
- whether people describe the product accurately in their own words.

Stars are a lagging indicator. Do not optimize for them.

## Launch risks

| Risk | Response |
| :--- | :--- |
| "It's just another new tab." | Show the offline reader, local data model, and measured budget |
| "`<all_urls>` is too broad." | Explain custom feeds and extraction; link the ledger; discuss a future optional-host model |
| "Neural audio is pseudoscience." | Agree that it is not medical; describe the actual DSP and remove any overclaim |
| "No store listing." | Be explicit; provide a signed release and checksums |
| "Feed X is broken." | Reproduce, fix, add a test or a documented limitation |
| "It looks AI-generated." | Show real screenshots, real commits, and specific design decisions |

## Post-launch

1. Fix install blockers first.
2. Publish a short retrospective with real numbers.
3. Turn repeated questions into docs.
4. Thank contributors publicly.
5. Do not chase a second launch with the same story; ship a meaningful release first.

## Related reading

- [SEO and AEO](seo-aeo.md)
- [Repo metadata](repo-metadata.md)
- [Brand](brand.md)
- [Publish to GitHub](publish-to-github.md)
