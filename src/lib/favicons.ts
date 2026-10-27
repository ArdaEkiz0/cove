import { extractDomain } from '../background/triage-core';
import { getLocalMonogramDataUri } from './browser';

/**
 * Multi-tier Real Favicon API + Authentic Brand Vector Resolver
 * 1. Explicit tab.favIconUrl or customIcon
 * 2. Real Favicon API (Google S2 High-DPI 128px -> DuckDuckGo Icon API)
 * 3. Instant crisp full-color Brand SVG data URI for localhost / offline fallback
 * 4. Harmonized tinted monogram fallback
 */

const BRAND_SVG_MAP: Record<string, string> = {
  'github.com': `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64"><rect width="64" height="64" rx="16" fill="#161b22"/><path fill="#ffffff" fill-rule="evenodd" d="M32 13c-10.5 0-19 8.5-19 19 0 8.4 5.4 15.5 13 18 .95.18 1.3-.41 1.3-.92 0-.45-.02-1.95-.03-3.54-5.28 1.15-6.4-2.25-6.4-2.25-.86-2.2-2.1-2.78-2.1-2.78-1.72-1.18.13-1.15.13-1.15 1.9.13 2.9 1.95 2.9 1.95 1.7 2.9 4.45 2.06 5.54 1.58.17-1.22.66-2.06 1.2-2.53-4.22-.48-8.65-2.11-8.65-9.4 0-2.08.74-3.78 1.95-5.11-.2-.48-.85-2.42.19-5.04 0 0 1.6-.51 5.23 1.95a18.2 18.2 0 0 1 9.54 0c3.63-2.46 5.22-1.95 5.22-1.95 1.04 2.62.39 4.56.19 5.04 1.22 1.33 1.95 3.03 1.95 5.11 0 7.31-4.44 8.91-8.67 9.38.68.59 1.29 1.75 1.29 3.53 0 2.55-.02 4.6-.02 5.23 0 .51.34 1.11 1.31.92 7.56-2.52 13-9.65 13-18.02 0-10.5-8.5-19-19-19Z"/></svg>`,
  'google.com': `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64"><rect width="64" height="64" rx="16" fill="#ffffff"/><path fill="#4285F4" d="M49.6 32.4c0-1.3-.1-2.6-.3-3.8H32v7.3h9.9c-.4 2.3-1.7 4.3-3.7 5.6v4.6h6c3.5-3.2 5.4-8 5.4-13.7Z"/><path fill="#34A853" d="M32 50.3c5 0 9.1-1.6 12.2-4.4l-6-4.6c-1.6 1.1-3.7 1.8-6.2 1.8-4.8 0-8.8-3.2-10.3-7.6h-6.2v4.8c3 6 9.3 10 16.5 10Z"/><path fill="#FBBC05" d="M21.7 35.5a11 11 0 0 1 0-7v-4.8h-6.2a18.4 18.4 0 0 0 0 16.6l6.2-4.8Z"/><path fill="#EA4335" d="M32 21c2.7 0 5.1.9 7 2.7l5.3-5.3C41.1 15.4 37 13.7 32 13.7c-7.2 0-13.5 4-16.5 10l6.2 4.8c1.5-4.4 5.5-7.5 10.3-7.5Z"/></svg>`,
  'mail.google.com': `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64"><rect width="64" height="64" rx="16" fill="#ffffff"/><path fill="#4285F4" d="M14 23v22c0 1.7 1.3 3 3 3h5V29l-8-6Z"/><path fill="#34A853" d="M42 48h5c1.7 0 3-1.3 3-3V23l-8 6v19Z"/><path fill="#EA4335" d="M22 29V18l10 7.5L42 18v11l-10 7.5L22 29Z"/><path fill="#C5221F" d="M14 20.5V23l8 6V18l-2.6-2c-2.6-2-5.4-.1-5.4 2.5Z"/><path fill="#FBBC04" d="M50 20.5c0-2.6-2.8-4.5-5.4-2.5L42 18v11l8-6v-2.5Z"/></svg>`,
  'duckduckgo.com': `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64"><rect width="64" height="64" rx="16" fill="#DE5833"/><circle cx="32" cy="32" r="19" fill="#ffffff"/><ellipse cx="29" cy="27" rx="2.6" ry="3.4" fill="#2d333a"/><ellipse cx="38" cy="27" rx="2.4" ry="3.2" fill="#2d333a"/><path fill="#F3A62E" d="M31 32c5-1 13-.5 14 2.3.8 2.2-5.4 4.2-12.5 3.7-4.2-.3-5.2-5-1.5-6Z"/><path fill="#48A842" d="M25 45l7 3 7-3-3.5 5.5h-7L25 45Z"/></svg>`,
  'youtube.com': `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64"><rect width="64" height="64" rx="16" fill="#FF0000"/><path fill="#ffffff" d="M26 22l17 10-17 10V22Z"/></svg>`,
  'linear.app': `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64"><rect width="64" height="64" rx="16" fill="#5E6AD2"/><circle cx="32" cy="32" r="18" fill="none" stroke="#ffffff" stroke-width="4.2"/><path stroke="#ffffff" stroke-width="3.6" d="M18 32L32 46M15 26L38 49M22 19L45 42"/></svg>`,
  'figma.com': `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64"><rect width="64" height="64" rx="16" fill="#1E1E1E"/><circle cx="37.5" cy="32" r="6.5" fill="#1ABCFE"/><path fill="#0ACF83" d="M24.5 38.5h6.5v6.5a6.5 6.5 0 1 1-6.5-6.5Z"/><path fill="#FF7262" d="M31 12.5h6.5a6.5 6.5 0 1 1 0 13H31v-13Z"/><path fill="#F24E1E" d="M24.5 19a6.5 6.5 0 0 1 6.5-6.5v13h-6.5A6.5 6.5 0 0 1 24.5 19Z"/><path fill="#A259FF" d="M24.5 32a6.5 6.5 0 0 1 6.5-6.5v13h-6.5A6.5 6.5 0 0 1 24.5 32Z"/></svg>`,
  'slack.com': `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64"><rect width="64" height="64" rx="16" fill="#1F1926"/><rect x="16" y="34" width="13" height="6" rx="3" fill="#E01E5A"/><circle cx="26" cy="45" r="3.5" fill="#E01E5A"/><rect x="24" y="16" width="6" height="13" rx="3" fill="#36C5F0"/><circle cx="19" cy="26" r="3.5" fill="#36C5F0"/><rect x="35" y="24" width="13" height="6" rx="3" fill="#2EB67D"/><circle cx="38" cy="19" r="3.5" fill="#2EB67D"/><rect x="34" y="35" width="6" height="13" rx="3" fill="#ECB22E"/><circle cx="45" cy="38" r="3.5" fill="#ECB22E"/></svg>`,
  'svelte.dev': `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64"><rect width="64" height="64" rx="16" fill="#FF3E00"/><path fill="#ffffff" d="M42.8 18.6c-4-5.7-11.9-7.4-17.8-3.7l-7.2 4.6a12.3 12.3 0 0 0-5.4 13.4c.5 1.8 1.5 3.5 2.8 4.8-1 2.2-1.2 4.7-.5 7.1a12.4 12.4 0 0 0 16.5 8l7.2-4.6a12.3 12.3 0 0 0 5.4-13.4 12 12 0 0 0-2.8-4.8c1-2.2 1.2-4.7.5-7.1-.2-1.5-.9-3-1.7-4.3Zm-6.2 21.8-6.4 4.1a5.8 5.8 0 0 1-8-1.6 5.5 5.5 0 0 1-.8-4.2l.4-1.2 1.1.7c1.6 1 3.4 1.6 5.3 1.8l.5.1-.1.5a1.8 1.8 0 0 0 2.7 1.8l5.3-3.4a1.7 1.7 0 0 0 .3-2.8c-.4-.4-.9-.6-1.5-.7l-3.9-.8c-3.6-.8-6.5-3.4-7.4-6.9a8.7 8.7 0 0 1 3.9-9.5l6.4-4.1a5.8 5.8 0 0 1 8 1.6c.8 1.2 1.1 2.7.8 4.2l-.4 1.2-1.1-.7a12.8 12.8 0 0 0-5.3-1.8l-.5-.1.1-.5a1.8 1.8 0 0 0-2.7-1.8l-5.3 3.4a1.7 1.7 0 0 0-.3 2.8c.4.4.9.6 1.5.7l3.9.8c3.6.8 6.5 3.4 7.4 6.9a8.7 8.7 0 0 1-3.9 9.5Z"/></svg>`,
  'localhost': `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64"><rect width="64" height="64" rx="16" fill="#13222b"/><path stroke="#63e6be" stroke-width="4" stroke-linecap="round" stroke-linejoin="round" fill="none" d="M20 25l8 7-8 7m12 0h12"/></svg>`,
  'news.ycombinator.com': `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64"><rect width="64" height="64" rx="16" fill="#FF6600"/><path fill="#ffffff" d="M20 17h5.8l6.2 12.6L38.2 17H44L34.7 35v12h-5.4V35L20 17Z"/></svg>`,
  'vercel.com': `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64"><rect width="64" height="64" rx="16" fill="#0d0f14"/><path fill="#ffffff" d="M32 16l18 31H14L32 16Z"/></svg>`
};

function toSvgDataUri(svg: string): string {
  return `data:image/svg+xml;utf8,${encodeURIComponent(svg)}`;
}

export function normalizeCleanDomain(urlOrDomain: string): string {
  const raw = extractDomain(urlOrDomain).toLowerCase().replace(/^www\./, '');
  if (!raw || raw === 'local') return 'localhost';
  return raw;
}

export function getBrandSvgFallback(domain: string): string | null {
  const clean = domain.toLowerCase().replace(/^www\./, '');
  if (BRAND_SVG_MAP[clean]) return toSvgDataUri(BRAND_SVG_MAP[clean]);
  if (clean.endsWith('.slack.com')) return toSvgDataUri(BRAND_SVG_MAP['slack.com']);
  if (clean.endsWith('.github.com')) return toSvgDataUri(BRAND_SVG_MAP['github.com']);
  if (clean.endsWith('.youtube.com')) return toSvgDataUri(BRAND_SVG_MAP['youtube.com']);
  return null;
}

/**
 * Ordered list of icon candidate URLs for a site:
 * 1. Explicit customIcon / tab.favIconUrl (if valid)
 * 2. Real Favicon API (Google S2 128px retina -> DuckDuckGo Icon API) when enabled
 * 3. Instant crisp Brand SVG (or local monogram SVG) as bulletproof terminal fallback
 */
export function getFaviconCandidates(
  urlOrDomain: string,
  title: string,
  useFaviconApi = true,
  explicitIcon?: string
): string[] {
  const candidates: string[] = [];
  if (explicitIcon && /^(https?:|data:|chrome-extension:)/i.test(explicitIcon)) {
    candidates.push(explicitIcon);
  }

  const domain = normalizeCleanDomain(urlOrDomain);
  const isLocalHost =
    domain === 'localhost' ||
    domain === '127.0.0.1' ||
    domain.endsWith('.local') ||
    !domain.includes('.');

  if (useFaviconApi && !isLocalHost) {
    // Primary Real Favicon API: Google S2 128px High-DPI
    candidates.push(`https://www.google.com/s2/favicons?domain=${encodeURIComponent(domain)}&sz=128`);
    // Secondary Real Favicon API: DuckDuckGo IP3 Icon Service
    candidates.push(`https://icons.duckduckgo.com/ip3/${encodeURIComponent(domain)}.ico`);
  }

  const brandSvg = getBrandSvgFallback(domain);
  if (brandSvg) {
    candidates.push(brandSvg);
  }

  candidates.push(getLocalMonogramDataUri(title || domain, domain));
  return candidates;
}
