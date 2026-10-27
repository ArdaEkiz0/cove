# Brand

Cove is a quiet product. The brand should feel like a well-made room: warm light, good paper, nothing shouting for attention.

## Name

- Written **Cove** in prose. Not COVE, not Cove™.
- The wordmark is set in a humanist sans or the Editorial serif depending on context.
- Product surfaces use **Cove Discover**, **Cove News**, **Smart Engine**, **Focus Sanctuary**, and **Sound Sanctuary** as proper names.
- The repository is `cove`; the extension package is `cove-tab`; the website is `appcove.vercel.app`.

## Tagline

Primary:

> **Your calm corner of the web.**

Supporting lines:

- A quieter new tab.
- Read, focus, and breathe in one place.
- Local-first by design.
- The new tab that leaves you alone.

Use one line at a time. Do not stack three superlatives.

## Logo

- Primary mark: `public/icons/cove.svg`.
- Raster icons: `public/icons/icon16.png`, `icon32`, `icon48`, `icon128`.
- The mark is a stylised cove/wave inside a rounded square.
- Keep clear space around the mark equal to at least the width of the inner wave.
- Do not rotate, stretch, add drop shadows, or place it on a busy photo without a surface behind it.
- Do not recolour the mark outside the approved accent palette unless you are making a clearly labelled derivative.

## Colour

| Role | Token / value | Notes |
| :--- | :--- | :--- |
| Canvas | near-black indigo | Default dark stage |
| Primary accent | Cobalt `#2563EB`-family | Links, focus, primary actions |
| Secondary accent | Teal | Calm/data emphasis |
| Warm accent | Amber | Weather, time, small highlights |
| Paper | warm off-white | Light theme surface |
| Ink | deep slate | Light theme text |

The five presets are Website Cobalt, Harbor Teal, Nordic Slate, Cedar Moss, and Twilight. Social assets should use Cobalt unless a scene calls for another accent.

## Typography

- Display: Instrument Serif for editorial headlines.
- UI: Inter for controls and body.
- Alternate: Plus Jakarta Sans for a softer product tone.
- Code and tabular data: JetBrains Mono.

Do not use more than two families in one asset. Do not use all caps for long headlines. Letter-spacing should be slightly tight for display and neutral for body.

## Voice

| Do | Don't |
| :--- | :--- |
| Calm, specific, quietly confident | Hype, urgency, growth language |
| "Cove keeps your tabs healthy." | "Revolutionary AI tab optimizer!" |
| "167.7 KB gzipped, measured." | "The smallest extension ever." |
| "No account, no analytics, no Cove server." | "0 network calls." |
| "Designed for focus." | "Clinically proven to double focus." |
| "11 curated feeds + 3 APIs." | "20+ premium sources." |

Write for a skeptical staff engineer and a tired reader at the same time. If a sentence would embarrass you in a security review, cut it.

## Asset usage

| Asset | Use |
| :--- | :--- |
| `assets/readme/hero-banner.svg` | README hero; keep claims in sync with the release |
| `assets/screenshots/newtab-dark.png` | Primary product screenshot |
| `assets/screenshots/newtab-light.png` | Light theme proof |
| `assets/screenshots/discover.png` | Reading surface |
| `assets/screenshots/focus.png` | Focus stage |
| `assets/screenshots/sound-sanctuary.png` | Audio mixer |
| `assets/screenshots/settings-studio.png` | Settings depth |
| `assets/readme/social-preview-1280x640.png` | GitHub social preview |

Screenshots must be captured from the real build. Do not composite features that do not exist. Update them when the UI changes materially.

## Social copy

Short bio:

> Cove is a calm, local-first new tab for Chrome, Brave, Arc, Edge, Firefox, and Zen. Curated reading, an offline reader, focus tools, and procedural sound. No account, no analytics, no Cove server.

Launch line:

> A new tab should give you a place to think, not another feed to scroll. Cove is open source, local-first, and 167.7 KB gzipped.

## Licensing of brand assets

The code is Apache-2.0. The Cove name and logo identify the project. If you fork Cove, please use a different name and mark so users are not confused about the source. See [NOTICE](../NOTICE) and [LICENSE](../LICENSE).

## Related reading

- [Design system](design-system.md)
- [Repo metadata](repo-metadata.md)
- [Launch kit](launch-kit.md)
- [SEO and AEO](seo-aeo.md)
