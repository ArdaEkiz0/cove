# Roadmap

Cove is pre-1.0. The roadmap is a set of priorities, not a promise of dates. Items move when the work is ready and the release gates pass.

## Guiding constraints

1. Keep the runtime local-first and account-free.
2. Keep the code budget under 170 KB gzipped unless a deliberate, documented exception is approved.
3. Do not add engagement metrics, ads, or a recommendation server.
4. Prefer platform APIs over new dependencies.
5. Ship accessibility and privacy improvements before growth features.

## Now: v0.1.x hardening

- [x] Cross-platform release packaging and checksums.
- [x] Strict import validation for backups.
- [x] Story ID collision repair for cached Discover feeds.
- [x] Documentation suite and launch assets.
- [ ] Reproducible screenshots in CI.
- [ ] Browser E2E smoke tests for install, new tab, Discover, and read later.
- [ ] Accessibility audit with published findings.
- [ ] Reduce the bundle below 160 KB without removing core features.
- [ ] Fix any feed-specific extraction regressions reported by users.

## Next: v0.2 store readiness

- [ ] Chrome Web Store and Firefox Add-ons packaging review.
- [ ] Privacy policy and permission justification pages suitable for store review.
- [ ] Signed release artifacts and a documented verification path.
- [ ] First-run onboarding that explains network features and opt-outs.
- [ ] Import/export round-trip tests across at least two previous backup versions.
- [ ] Localized settings descriptions for all five locales.
- [ ] A public compatibility matrix for Chromium and Gecko versions.

## Later: reading and focus depth

- [ ] Full-text search across the local article cache.
- [ ] Saved-story collections with local tags.
- [ ] Reader typography controls and a print/export path.
- [ ] Per-source mute and priority rules.
- [ ] Focus session notes and a weekly local review.
- [ ] Adaptive sound suggestions that are explainable and dismissible.
- [ ] More procedural soundscapes, still without audio files.

## Exploratory

- [ ] Optional encrypted local backup.
- [ ] WebDAV or file-system sync that the user controls.
- [ ] A portable web build with the same local data model.
- [ ] A command-line exporter for notes and read-later items.
- [ ] Firefox container-aware tab sessions.
- [ ] Reduced-motion and high-contrast presets.

## Non-goals

- A Cove account, cloud sync, or subscription.
- Advertising, sponsored stories, or affiliate ranking.
- Selling or sharing local data.
- A remote recommendation model.
- Infinite scroll optimized for time on page.
- A paywall bypass.
- A mobile app in the near term.
- A team workspace or enterprise admin console.
- Chasing a feature checklist at the expense of the code budget.

## How priorities are chosen

1. **Correctness and trust** - data loss, security, broken installs, misleading claims.
2. **Access** - keyboard, screen reader, localization, low-end devices.
3. **Core loop** - new tab, reading, focus.
4. **Polish** - visual and copy refinements.
5. **Growth** - launch and distribution work.

A feature that violates a guiding constraint is rejected even if it is popular. A feature that improves trust or access can jump the queue.

## Release rhythm

There is no fixed cadence. A release ships when:

- the test suite, typecheck, build, budget, and verification pass,
- the manual QA checklist is complete,
- the changelog and docs are updated,
- the archives and checksums are regenerated,
- a maintainer has reviewed the diff.

## Suggesting a roadmap change

Open a discussion with:

- the user problem,
- the proposed behaviour,
- the privacy and performance impact,
- the maintenance cost,
- what you would cut to stay within the budget.

Roadmap discussions are prioritization conversations, not feature auctions.

## Related reading

- [Features](features.md)
- [Comparison](comparison.md)
- [Releasing](releasing.md)
- [Contributing](contributing.md)
