# Accessibility

Cove aims to be a calm, keyboard-friendly surface. This page describes what is implemented, what is verified, and what still needs work. It is not a claim of full WCAG conformance.

## Implemented

### Keyboard

- Global shortcuts for search, palette, settings, stages, sound, and Discover.
- Single-key shortcuts are ignored inside inputs, textareas, selects, and contenteditable elements.
- `Esc` closes the topmost surface in a predictable order.
- The command palette is operable with arrow keys and `Enter`.
- Extension commands are registered in the manifest and can be rebound by the user.

### Semantics

- Interactive controls are native `button` elements where possible.
- Settings toggles use `role="switch"` with an accessible name and checked state.
- Navigation rails use `nav` with labels.
- Images have alt text; decorative marks are hidden where appropriate.
- Form fields have associated labels or accessible names.

### Focus

- A global `:focus-visible` rule draws a two-pixel accent outline with an offset.
- Focus is not indicated by colour alone.
- Modal surfaces close with `Esc` and return the user to the previous context where implemented.

### Motion

- `prefers-reduced-motion: reduce` disables non-essential transitions.
- No infinite decorative animation runs behind body text.
- The audio visualizer is driven by real data and stops when audio stops.

### Contrast and type

- Body text and controls target WCAG AA contrast against their surfaces.
- Muted text is reserved for metadata, not the only label of a control.
- UI scale options increase base size and spacing.
- Fonts are local, so text does not disappear while a third-party font loads.

### Audio

- Audio starts only after a user gesture.
- Volume is adjustable.
- Sound can be stopped from the mixer or the focus stage.
- The speech shield is a gentle filter, not a masking promise.

## Verification status

| Area | Status |
| :--- | :--- |
| Keyboard paths | Implemented, manually checked |
| Focus visibility | Token-level rule, manually checked |
| Switch semantics | Covered by `tests/core.test.mjs` |
| Reduced motion | CSS media query present |
| Colour contrast | Designed for AA, not formally audited |
| Screen reader pass | Not yet published |
| Automated axe/Lighthouse audit | Not yet in CI |
| 200% zoom / reflow | Manually checked at common widths |
| RTL layout | Not supported |

## Known gaps

1. **No formal WCAG audit.** The project should not claim "WCAG AA compliant" until an audit is published.
2. **No screen-reader test matrix.** VoiceOver, NVDA, and Orca passes are welcome contributions.
3. **Some custom controls need review.** Icon-only buttons, drag-and-drop reordering, and the audio mixer need a dedicated accessibility pass.
4. **Discovery and reading surfaces are dense.** Feed cards and the reader toolbar should be tested with keyboard-only navigation and zoom.
5. **Motion and blur are user-controlled but not automatically reduced.** The system preference is respected, but users may still want a one-click "reduce effects" preset.
6. **No RTL locale.** Arabic, Hebrew, and other RTL languages are not supported yet.
7. **Touch targets.** Compact scale may produce targets below 44px in dense areas; spacious scale is the recommended touch configuration.

## Testing checklist

### Keyboard only

- [ ] Reach search, palette, settings, stages, Discover, and sound without a mouse.
- [ ] Open and close every modal with `Esc`.
- [ ] Move through the palette with arrows; run with `Enter`.
- [ ] Change a setting with the keyboard.
- [ ] Start and stop a focus session.
- [ ] Reach the reader controls and return to the feed.

### Zoom and reflow

- [ ] 200% browser zoom at 1280px width.
- [ ] 400% zoom at 1280px width (320 CSS pixels).
- [ ] No horizontal scrolling for body content.
- [ ] Text does not overlap controls.

### Screen reader

- [ ] The page has a sensible title and landmark structure.
- [ ] Switch roles announce on/off.
- [ ] Decorative images are skipped.
- [ ] Live notifications are announced without stealing focus.
- [ ] The reader's progress and controls are understandable.

### Motion and audio

- [ ] Enable reduced motion; confirm transitions are removed.
- [ ] Start audio; confirm it is user-initiated and stoppable.
- [ ] Confirm the visualizer stops with audio.

## Contribution guide

If you fix an accessibility issue:

1. Describe the user impact.
2. Include the browser, assistive technology, and steps.
3. Add a test where the behaviour can be tested without a browser.
4. Update this page and the manual checklist.
5. Avoid "accessibility overlay" solutions. Fix the semantics.

## Related reading

- [Design system](design-system.md)
- [Keyboard shortcuts](keyboard-shortcuts.md)
- [Testing](testing.md)
- [Features](features.md)
