# Comparison

Cove sits at the intersection of a new tab, a reading app, and a focus tool. This page compares categories, not marketing checklists. Products change; verify current pricing and features with each vendor.

## At a glance

| | Cove v0.1.1 | Default browser new tab | Wallpaper/dashboard extension | Cloud RSS reader | Dedicated focus app |
| :--- | :--- | :--- | :--- | :--- | :--- |
| Primary job | Calm workspace + reading + focus | Search and content portal | Wallpaper and widgets | Feed inbox | Timer and sound |
| Account required | No | No | Usually no | Usually yes | Usually yes |
| Local-first data | Yes | N/A | Mostly | No, cloud sync | Varies |
| Ads in the surface | No | Often | Plan-dependent | Plan-dependent | No |
| RSS aggregation | Yes, 11 curated + 3 APIs + custom | No | Rare | Yes | No |
| Clean article reader | Yes, local extraction | No | Rare | Usually paid | No |
| Offline article cache | Yes, up to 120 | No | No | Plan-dependent | No |
| Procedural audio | Yes, no audio files | No | Loops or none | No | Usually loops |
| Focus timer | Yes | No | Sometimes | No | Yes |
| Tab triage and sessions | Yes | No | Rare | No | No |
| Open source | Yes, Apache-2.0 | No | Rare | No | Rare |
| Telemetry | None from Cove | Varies | Varies | Varies | Varies |
| Price | Free | Free, ad-supported | Free + paid tiers | Free + paid tiers | Subscription |

## What Cove does differently

### 1. One surface, local state

Most alternatives split the job across a new tab, a reader, and a focus app. Cove keeps the workspace, reading queue, and focus state in one extension with one local store. That reduces account sprawl and makes offline behaviour simpler.

### 2. No engagement economy

Cove does not sell ads, rank stories to maximize time on page, or run a recommendation server. Discover uses a small local model with an explicit 18-hour freshness half-life and user feedback. The feed can be empty; it will not invent stories.

### 3. Reading is a first-class surface

The reader extracts prose locally, strips scripts and navigation, and caches articles for offline reading. It does not bypass paywalls. When extraction fails, it says so and links to the source.

### 4. Audio without audio files

The sound engine synthesizes pads and textures with Web Audio. There are no sample packs, streaming licenses, or audio downloads. The trade-off is that it sounds synthetic by design; it is not a library of produced music.

### 5. Honest smallness

The code budget is 170 KB gzipped, measured at 167.5 KB in `v0.1.1`. The full archive is larger because wallpapers and fonts are bundled. Cove does not claim to be the smallest extension on earth; it claims to keep its runtime code deliberately constrained.

## Where Cove is weaker

| Area | Cove | Better fit |
| :--- | :--- | :--- |
| Feed power features | No rules, labels, or full-text search across an archive | A mature RSS service |
| Sync | Manual JSON backup | A cloud reader with multi-device sync |
| Mobile | Browser extension only | A native or web reading app |
| Audio library | Four synthesized modes and five textures | A produced music or ambient library |
| Team collaboration | None | Shared workspace tools |
| Store distribution | Manual install in `v0.1.1` | Products with store listings |
| Accessibility certification | No formal audit | Audited productivity software |
| Language coverage | Five locales, partial copy | Fully localized products |

## Who should use Cove

Cove is a good fit if you:

- want a calm new tab with real utility,
- prefer local data and no account,
- read a handful of curated sources rather than a thousand feeds,
- want a focus timer and soundscape in the same surface,
- are comfortable loading an unpacked extension or building from source.

Cove is a poor fit if you:

- need multi-device sync today,
- depend on team feed workflows,
- want a produced music library,
- need a formally audited accessibility certification,
- require a managed enterprise deployment.

## Pricing honesty

Cove is free under Apache-2.0. There is no paid tier and no plan to add one in the current roadmap. If the project later accepts donations or sponsorships, that must not change the local-first data model or add tracking.

Competitor prices are intentionally not listed here because they change frequently and vary by region, plan, and bundle. Check the vendor's current page before making a purchase decision.

## Methodology

This comparison is qualitative and based on the product surfaces described in this repository. It is not a benchmark, a security audit, or a legal review. If you maintain an alternative and believe a row is inaccurate, open an issue with a source.

## Related reading

- [Features](features.md)
- [FAQ](faq.md)
- [Privacy](privacy.md)
- [Roadmap](roadmap.md)
