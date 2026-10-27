# SEO and AEO playbook

Cove is a small open-source project. It will not outrank established products on generic terms by volume. It can win specific, high-intent queries by being the most precise, verifiable answer.

AEO here means **answer engine optimization**: making the repository and website easy for search engines and AI assistants to quote correctly.

## Positioning

**Category:** local-first browser new tab / RSS reader / focus workspace.

**Primary promise:** a calm, account-free new tab with curated reading, offline articles, and focus tools.

**Proof points:**

- Apache-2.0, source available.
- No account, no analytics, no Cove server.
- 167.7 KB gzipped runtime, 170 KB enforced budget.
- 11 curated RSS sources + 3 keyless APIs.
- Offline article cache up to 120 articles.
- Manifest V3 for Chromium and Gecko.
- 54 unit tests and 2 integration audits at `v0.1.1`.

## Query clusters

### High intent

- local-first new tab extension
- privacy-focused new tab extension
- open source RSS reader extension
- Chrome new tab extension with RSS
- Firefox new tab extension open source
- Momentum alternative open source
- new tab extension no account
- offline RSS reader browser extension

### Comparative

- Cove vs Momentum
- local-first RSS reader vs Feedly
- browser new tab with focus timer
- open source alternative to start page extensions

### Technical

- Svelte 5 Manifest V3 extension
- IndexedDB RSS article cache
- Web Audio procedural focus sound
- on-device Markov workflow engine
- Manifest V3 CSP no inline script

Do not target all of these in the README. Pick the top three and let the docs own the long tail.

## README as the landing page

The README should answer, in order:

1. What is Cove?
2. Who is it for?
3. What is actually included?
4. How is it different?
5. How do I install it?
6. What does it cost, and what data does it collect?
7. How is it built and verified?
8. Where can I read more?

Use:

- one `H1`,
- a short answer paragraph in the first screen,
- a quick-facts table,
- real screenshots with descriptive alt text,
- a comparison table with honest limits,
- FAQ links,
- a star history chart only if it renders reliably.

Avoid:

- keyword lists disguised as paragraphs,
- fake awards,
- "best" claims without a source,
- unverified performance numbers,
- "0 network calls" when the product fetches feeds,
- store badges before a store listing exists.

## Structured data

`assets/seo/structured-data.json` contains a `@graph` with:

- `SoftwareApplication` for Cove,
- `WebSite` for the project site,
- `FAQPage` for selected questions.

Use it on the website, not as a GitHub README script (GitHub strips scripts). Keep the FAQ answers identical to the visible page. Do not add `aggregateRating` without real ratings.

## llms.txt

`llms.txt` is a compact, link-rich summary for AI crawlers. `llms-full.txt` is a longer plain-text overview. Both should:

- state what Cove is in the first sentence,
- link to canonical docs,
- list facts with units and versions,
- distinguish shipped from planned,
- avoid marketing adjectives.

Update them when the release changes. Do not create a separate set of claims for AI systems.

## GitHub discovery

1. Repository name: `cove`.
2. About: one clear sentence with the category and differentiators.
3. Topics: 15-20 relevant, specific topics.
4. Social preview: 1280x640 PNG with the product name and one line.
5. Releases: semantic tags with notes and checksums.
6. Discussions: enable Q&A and show-and-tell.
7. Pinned issue: installation help and known limitations.
8. README: screenshots, install, privacy, architecture, FAQ.
9. License: visible and correct.
10. Security policy: visible.

See [Repo metadata](repo-metadata.md) for copy-paste values.

## Website

No public project website is deployed yet. Until a landing site ships, GitHub is the canonical destination: leave the repository's **Website** field blank or use `https://github.com/DevAnimecx/cove`. Do not publish `appcove.vercel.app` while it returns `DEPLOYMENT_NOT_FOUND`.

When the site is live, recommend this page set:

- `/` - product landing with the same facts as the README.
- `/install` - browser-specific install with screenshots.
- `/privacy` - the network ledger.
- `/docs` - a rendered docs hub.
- `/changelog` - release notes.
- `/compare` - honest category comparison.
- `/faq` - answer-first FAQ with structured data.

Use static rendering, semantic headings, descriptive alt text, canonical URLs, Open Graph tags, and a sitemap. Do not add an analytics script just to measure SEO; use server logs or GitHub traffic instead.

## Content plan

| Piece | Intent | Owner |
| :--- | :--- | :--- |
| "A local-first new tab" | Category | Maintainer |
| "How Cove caches articles offline" | Technical | Maintainer |
| "What 167.7 KB actually means" | Proof | Maintainer |
| "Why Cove has no analytics" | Trust | Maintainer |
| "Momentum alternative for people who want local data" | Comparative | Maintainer |
| "Manifest V3 without inline script" | Developer | Contributor |
| "Designing a calm settings studio" | Design | Contributor |

Publish on the project site and cross-post a condensed version to dev.to or Hashnode with a canonical link.

## Measurement without surveillance

Use:

- GitHub stars, forks, watchers, and traffic (repository insights),
- release download counts,
- issue and discussion quality,
- referrer data from the website host,
- search console impressions and queries,
- direct replies and mentions.

Do not add a Cove analytics endpoint, a pixel, or a third-party tag to the extension. Website analytics, if used, must be disclosed and should be privacy-preserving.

## Launch ethics

- Do not buy stars, reviews, or upvotes.
- Do not astroturf comparisons.
- Do not claim a store listing before approval.
- Do not claim an award or "repo of the month" that was not given.
- Disclose that you are the maintainer when posting.
- Answer criticism with specifics, not defensiveness.

## 30-day checklist

- [ ] Rewrite README with the answer-first structure.
- [ ] Add `llms.txt`, `llms-full.txt`, `humans.txt`, and `security.txt`.
- [ ] Add structured data to the website.
- [ ] Set About, topics, and social preview.
- [ ] Publish v0.1.1 release notes.
- [ ] Write the install guide.
- [ ] Publish the privacy ledger.
- [ ] Post one technical deep dive.
- [ ] Submit to relevant open-source newsletters.
- [ ] Review search queries after two weeks and improve the matching page.
- [ ] Fix any inaccurate claim immediately.

## Related reading

- [Launch kit](launch-kit.md)
- [Repo metadata](repo-metadata.md)
- [Brand](brand.md)
- [FAQ](faq.md)
