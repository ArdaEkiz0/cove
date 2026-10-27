// Synchronous zero-flash theme & typography boot (external script for strict MV3 CSP compliance)
import './newtab/styles/tokens.css';
import './newtab/styles/themes.css';

try {
  const cached = localStorage.getItem('cove_fast_boot');
  if (cached) {
    const parsed = JSON.parse(cached);
    const root = document.documentElement;
    if (parsed.theme) root.dataset.theme = parsed.theme;
    if (parsed.preset) root.dataset.preset = parsed.preset;
    if (parsed.fontPair) root.dataset.fontPair = parsed.fontPair;
    if (parsed.uiScale) root.dataset.uiScale = parsed.uiScale;
    if (parsed.corners) root.dataset.corners = parsed.corners;
    if (parsed.lang) root.lang = parsed.lang;
  }
} catch {
  // Ignore malformed fast-boot cache
}
