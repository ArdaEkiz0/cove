# Keyboard shortcuts

Cove is designed to be usable without reaching for the mouse. Shortcuts are ignored while you are typing in an input, textarea, select, or contenteditable element.

## Global shortcuts

| Shortcut | Action | Notes |
| :--- | :--- | :--- |
| `/` | Focus search, or open the command palette | Focuses the search field on Bento and Ambient; opens the palette on other stages |
| `Cmd/Ctrl+K` | Open or close the command palette | Works even when a field is focused |
| `Cmd/Ctrl+J` | Open or close the Smart Engine studio | Inspect local signals, chains, and autopilot log |
| `Cmd/Ctrl+,` | Open or close Settings Studio | Toggles the full-viewport settings surface |
| `Cmd/Ctrl+Shift+S` | Save the current window as a session | Non-destructive; tabs stay open |
| `Cmd/Ctrl+Shift+L` | Save the active tab to Read Later | Opens the palette prefilled with `read later:` in the new tab |
| `Esc` | Close the topmost surface | Reader, story, smart engine, settings, sound mixer, weather, edit mode |
| `,` | Open Settings Studio | Only outside editable fields |
| `M` | Toggle the Sound Sanctuary | Only outside editable fields |
| `D` | Toggle Discover and the previous stage | Only outside editable fields |
| `1` | Bento Dashboard | |
| `2` | Ambient Home | |
| `3` | Focus Sanctuary | |
| `4` | Pure 4K Stillness | |

On macOS, use `Command` wherever `Ctrl` is listed. Browser-level shortcuts can be reassigned at `chrome://extensions/shortcuts` (or the Firefox equivalent).

## Search syntax

| Input | Result |
| :--- | :--- |
| `quiet productivity` | Web search with the active engine |
| `!g quiet productivity` | Google |
| `!ddg quiet productivity` | DuckDuckGo |
| `!gh svelte` | GitHub search |
| `!yt ambient mix` | YouTube search |
| `!w kyoto` | Wikipedia |
| `!mdn fetch` | MDN search |
| `!sp svelte` | Startpage, when enabled |
| `12 * (8 + 4)` | Instant arithmetic |
| `18% of 240` | Instant percentage |
| `100 usd to eur` | Instant conversion where supported |
| `72 f to c` | Temperature conversion |
| `5 km to mi` | Distance conversion |
| `2 gb to mb` | Data conversion |
| `3 pm tokyo` | World clock answer |
| `#2563eb` | Hex colour preview |
| `focus 45` | Start a 45-minute focus session |

Bangs are configurable in **Settings > Search & !Bangs**. Custom engines can define their own bang token.

## Command palette

`Cmd/Ctrl+K` opens a fuzzy index of:

- Smart Engine actions,
- tab operations (sweep, dedupe, suspend, mute, group),
- sessions,
- quick links,
- notes,
- read-later items,
- focus and Focus Sound modes,
- stage and theme changes,
- settings sections and data tools.

Type a few characters; matching is case-insensitive and word-boundary aware. `Enter` runs the selected item. `Esc` closes the palette.

### Inline commands

| Prefix | Example | Result |
| :--- | :--- | :--- |
| `note:` | `note: call the dentist` | Append to the local scratchpad |
| `weather:` | `weather: Kyoto` | Set the weather location by name |
| `new session:` | `new session: research` | Save current tabs as a named session |
| `read later:` | `read later: https://example.com` | Extract and save an article |
| `open` or `go to` | `open example.com` | Navigate directly |

## Mouse and touch

- Click a Discover card for the story brief; use the reader action for the full article.
- Hover a story to prefetch its article where caching is available.
- Use the side dock for stage navigation on narrow screens.
- Drag cards in edit mode to reorder; use the size control to change spans.
- Long-press is not required for any action.

## Shortcut design rules

1. Single-letter shortcuts never fire inside an editable field.
2. Destructive actions require confirmation or provide an undo path.
3. A shortcut is an accelerator, not the only way to reach a feature.
4. Browser-reserved combinations are avoided in page code; the two extension commands are registered in the manifest so users can rebind them.
5. New shortcuts must be documented here and added to the command palette.

## Related reading

- [Features](features.md)
- [Accessibility](accessibility.md)
- [Design system](design-system.md)
