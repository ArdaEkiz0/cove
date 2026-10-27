# Design system

Cove is designed to feel like a quiet room with good light: editorial type, restrained colour, soft spatial layers, and controls that appear when needed. The system is implemented with CSS custom properties in `src/newtab/styles/tokens.css` and `src/newtab/styles/themes.css`.

## Principles

1. **Calm is a feature.** Fewer simultaneous accents, generous negative space, and no badge anxiety.
2. **Editorial first.** Type carries the interface. Decoration supports hierarchy rather than replacing it.
3. **Spatial, not flat.** Glass surfaces, diffuse light, and subtle depth create place without heavy shadows.
4. **Local honesty.** No fake data, no decorative metrics, no progress that is not real.
5. **Keyboard parity.** Every important action has a keyboard path or a command-palette entry.
6. **Motion with consent.** Animation clarifies state and respects `prefers-reduced-motion`.

## Colour

The default is **Smoked Dark** with the **Website Cobalt** preset. A light theme and a system-following mode are available.

### Accent presets

| Preset | Character |
| :--- | :--- |
| Website Cobalt | Sapphire blue, the default and most recognisable Cove accent |
| Harbor Teal | Cool marine green for calmer, lower-arousal sessions |
| Nordic Slate | Desaturated blue-grey for minimal setups |
| Cedar Moss | Warm green for natural wallpapers |
| Twilight | Violet-rose for evening and creative scenes |

Accents are exposed as tokens and are used for focus rings, active navigation, links, and data emphasis. They are not used for large background fills except in controlled atmospheric layers.

### Surfaces

The dark theme uses a near-black indigo canvas, layered translucent panels, one-pixel specular rims, and low-opacity highlights. The light theme uses warm paper and frosted white surfaces. Both themes share the same semantic token names so components do not branch on theme.

### Contrast

Body text targets WCAG AA against its surface. Muted text is reserved for secondary metadata, never for the only label of an interactive control. Focus rings use the accent plus an outline offset so they remain visible on glass. See [Accessibility](accessibility.md).

## Typography

### Pairings

| Pair | Display | Body / UI | Mood |
| :--- | :--- | :--- | :--- |
| Swiss | Plus Jakarta Sans | Inter | Neutral, precise, product-focused |
| Editorial | Instrument Serif | Inter | Literary, calm, magazine-like |
| Humanist | Instrument Serif / humanist sans | Plus Jakarta Sans | Warm and approachable |
| Technical | JetBrains Mono accents | Inter | Engineered, tabular, developer-friendly |

Fonts are self-hosted `.woff2` files in `public/fonts/`. There are no Google Fonts requests, no render-blocking third-party styles, and no layout shift from late font swaps.

### Scale

Three UI scales adjust the base size and spacing rhythm:

- **Compact**: dense, for large monitors and keyboard-heavy use.
- **Balanced**: default.
- **Spacious**: larger touch targets and more air.

The scale changes tokens, not individual components, so layouts stay proportional.

### Clock faces

- **Light Sans** - modern and quiet.
- **Literary Serif** - editorial display.
- **Sculptural Bold** - high-presence hero.
- **Tabular Mono** - technical, aligned digits.

## Shape and spacing

Corner profiles:

- **Architectural** - small radii, crisp edges.
- **Balanced** - default softness.
- **Sculptural Soft** - larger radii and pill-like controls.

Spacing follows a 4px base rhythm with larger gaps for stage-level grouping. Cards use internal padding that scales with the UI scale. Avoid arbitrary pixel values in components; extend tokens instead.

## Glass and atmosphere

Glass is a composition of:

- a translucent surface tint,
- a subtle border highlight,
- a diffuse shadow,
- optional backdrop blur,
- a vignette or light bloom from the wallpaper.

Backdrop blur is capped for performance. On lower-powered devices, reducing blur and vignette is the first performance lever. The atmosphere controls expose dim, blur, brightness, contrast, and vignette separately so users can tune legibility rather than accept a single preset.

### Wallpapers

Eight local scenes ship with the extension: Alpine Mist, Sheltered Cove, Summer Cumulus, Blue Hour Café, Golden Crosswalk, Aurora Fjord, Kyoto Veranda, and Still Horizon. Each has a recommended theme, luminance metadata, and an accent colour used by chameleon mode.

Wallpapers are decorative. Text contrast must remain acceptable with the wallpaper removed or replaced, which is why panels carry their own surface tint.

## Motion

- Stage changes use short opacity and transform transitions.
- Panels enter with a small rise, not a bounce.
- The live audio visualizer is driven by real analyser data.
- No infinite decorative animation runs behind text.
- `prefers-reduced-motion: reduce` disables non-essential transitions and parallax.

Motion durations sit in the 120-320ms range for interface changes. Longer transitions are reserved for atmosphere and should never block input.

## Iconography

Cove uses a small set of inline SVG icons with consistent stroke weight and rounded joins. Brand icons are generated marks or local assets; external favicon services are optional. Icons never appear alone when the action is ambiguous: they are paired with a label or an accessible name.

## Components

### Surfaces

- Stage canvas: wallpaper or gradient plus atmosphere filters.
- Panel: glass surface with a 1px rim and a soft shadow.
- Popover: elevated panel with a stronger rim and a compact shadow.
- Modal: full-viewport scrim plus a centred or edge-aligned panel.

### Controls

- Pill switch with `role="switch"` and a visible label.
- Segmented control for mutually exclusive visual choices.
- Ghost button for secondary actions.
- Primary button for the single next action in a flow.
- Destructive action requires confirmation or an undo path.

### Empty states

Empty states explain the value of the surface and offer one action. They do not use fake sample content. For example, Read Later says what it does and invites the user to save a page; it does not preload invented articles.

## Copy

Voice: calm, specific, quietly confident. Prefer "Cove keeps your tabs healthy" over "Revolutionary AI-powered tab optimization." Avoid exclamation marks, growth language, and unverifiable superlatives. Every claim should survive a skeptical reader checking the source.

## Design review checklist

- [ ] Does the surface work in dark and light themes?
- [ ] Is the primary action obvious without colour alone?
- [ ] Can the entire flow be completed with a keyboard?
- [ ] Does it respect reduced motion?
- [ ] Are empty, loading, error, and offline states designed?
- [ ] Is any displayed number real and sourced?
- [ ] Does the layout hold at 360px and at 2560px?
- [ ] Are long labels and translated strings accommodated?
- [ ] Is the new asset local, licensed, and optimised?

## Related reading

- [Accessibility](accessibility.md)
- [Brand](brand.md)
- [Features](features.md)
- [Performance](performance.md)
