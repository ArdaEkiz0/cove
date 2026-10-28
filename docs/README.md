# Cove Documentation

Cove is a local-first Manifest V3 new tab for people who want a quieter browser start page without giving up useful tools. This directory is the source of truth for how it works, what it stores, how it is tested, and how it is released.

> **Product status:** `v0.1.3`, pre-1.0. The extension is usable today and every feature described here exists in the repository. Features that are planned, partial, or browser-dependent are labelled as such.

## Start here

| If you want to... | Read |
| :--- | :--- |
| Understand the product in five minutes | [Features](features.md) |
| Install it for development | [Contributor onboarding](contributing.md) |
| Fix an install or runtime problem | [Troubleshooting](troubleshooting.md) |
| Know exactly what leaves your device | [Privacy](privacy.md) |
| Review the architecture | [Architecture](architecture.md) |
| Learn the keyboard | [Keyboard shortcuts](keyboard-shortcuts.md) |
| Ship a release | [Releasing](releasing.md) |
| Understand the newsroom | [Discover](discover.md) |
| Understand the focus sound | [Focus Sound](neural-audio.md) |
| Understand the adaptive layer | [Smart engine](smart-engine.md) |
| Contribute code or docs | [Contributing](contributing.md) |
| Report a vulnerability | [Security](security.md) |
| Position or launch the project | [SEO and AEO](seo-aeo.md), [Launch kit](launch-kit.md) |

## Documentation map

### Product

- [Features](features.md) - every surface, including honest limitations.
- [Comparison](comparison.md) - Cove next to browser start pages, RSS readers, and focus tools.
- [FAQ](faq.md) - short answers for users, reviewers, and search engines.
- [Roadmap](roadmap.md) - priorities, non-goals, and what "done" means.
- [Brand](brand.md) - naming, voice, and asset usage.

### Engineering

- [Architecture](architecture.md) - runtime layers, data flow, and failure modes.
- [Data model](data-model.md) - storage keys, schemas, and backup format.
- [Discover](discover.md) - sources, ranking, extraction, and caching.
- [Focus Sound](neural-audio.md) - synthesis graph, modes, and safety notes.
- [Smart engine](smart-engine.md) - signals, Markov memory, decay, and controls.
- [Design system](design-system.md) - tokens, typography, atmosphere, and motion.
- [Accessibility](accessibility.md) - keyboard, focus, contrast, and motion.
- [Internationalization](i18n.md) - supported locales and adding a language.
- [Performance](performance.md) - budget method and measured results.
- [Testing](testing.md) - test pyramid and release gates.
- [Security](security.md) - threat model, permissions, and disclosure.
- [Privacy](privacy.md) - network ledger and local data boundaries.

### Project operations

- [Releasing](releasing.md) - versioning, packaging, checksums, and CI.
- [Contributing](contributing.md) - setup, conventions, and review expectations.
- [SEO and AEO](seo-aeo.md) - structured data, answer-first content, and discovery.
- [SEO assets](../assets/seo/README.md) - `llms.txt`, structured data, and crawler files.
- [Launch kit](launch-kit.md) - launch narrative, channels, and assets.
- [Repo metadata](repo-metadata.md) - GitHub About text, topics, and social preview copy.
- [Publish to GitHub](publish-to-github.md) - copy-paste runbook for the first push.

## Conventions

- **Claims are measurable.** Bundle size comes from `npm run budget`; test counts come from `npm test`; network endpoints come from source.
- **No mock data is presented as real.** The UI must never show simulated tabs, fake analytics, or seeded engagement.
- **Local-first means local by default.** Some network features (Discover, RSS, weather, favicons, search suggestions, and read-later metadata) are enabled by default and can be disabled. Every destination is listed in the [privacy ledger](privacy.md#network-ledger).
- **Zero telemetry means no analytics, no accounts, and no Cove server.** It does not mean the extension can never make a request; RSS, weather, article extraction, favicons, and optional Unsplash images are network features.
- **`0 ms` is a design goal, not a stopwatch promise.** It refers to pre-paint theme application or a warm in-memory cache hit. Cold device performance varies.

## Versioning

The docs track the code in `main`. When behaviour changes, update the relevant page in the same pull request. The release checklist in [Releasing](releasing.md) includes a documentation pass for this reason.

## License

Documentation is licensed under Apache-2.0, the same as the project. See [LICENSE](../LICENSE).
