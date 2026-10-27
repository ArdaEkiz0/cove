import { extractDomain } from '../background/triage-core';

/**
 * Clean Offline Article Extractor & Browser Bookmark HTML Importer
 * Zero external dependencies — parses real HTML pages into safe, readable
 * prose stored locally in IndexedDB for Cove's in-app Distraction-Free Reader.
 */

export interface ExtractedArticle {
  title: string;
  siteName: string;
  description: string;
  image?: string;
  contentHtml: string;
  readingTimeMin: number;
}

function escapeHtml(raw: string): string {
  return raw
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

export function extractReadableArticle(rawHtml: string, url: string): ExtractedArticle {
  const domain = extractDomain(url);
  const doc = new DOMParser().parseFromString(rawHtml, 'text/html');

  const ogTitle =
    doc.querySelector('meta[property="og:title"]')?.getAttribute('content') ||
    doc.querySelector('meta[name="twitter:title"]')?.getAttribute('content') ||
    doc.querySelector('h1')?.textContent ||
    doc.querySelector('title')?.textContent ||
    domain;

  const siteName =
    doc.querySelector('meta[property="og:site_name"]')?.getAttribute('content') || domain;

  const ogDesc =
    doc.querySelector('meta[property="og:description"]')?.getAttribute('content') ||
    doc.querySelector('meta[name="description"]')?.getAttribute('content') ||
    '';

  const ogImg = doc.querySelector('meta[property="og:image"]')?.getAttribute('content');

  // Remove noisy chrome elements before extracting prose
  doc
    .querySelectorAll(
      'script, style, noscript, nav, header, footer, aside, form, iframe, svg, button, [role="navigation"], .sidebar, .footer, .nav, .comments'
    )
    .forEach((el) => el.remove());

  const root =
    doc.querySelector('article') ||
    doc.querySelector('main') ||
    doc.querySelector('[role="main"]') ||
    doc.body;

  const blocks: string[] = [];
  let wordCount = 0;

  if (root) {
    const candidates = root.querySelectorAll('h2, h3, p, blockquote, pre, li');
    const seen = new Set<string>();

    candidates.forEach((el) => {
      const text = (el.textContent || '').replace(/\s+/g, ' ').trim();
      if (text.length < 24 || seen.has(text)) return;
      seen.add(text);

      const words = text.split(/\s+/).length;
      wordCount += words;

      const tag = el.tagName.toLowerCase();
      if (tag === 'h2' || tag === 'h3') {
        blocks.push(`<${tag}>${escapeHtml(text)}</${tag}>`);
      } else if (tag === 'blockquote') {
        blocks.push(`<blockquote>${escapeHtml(text)}</blockquote>`);
      } else if (tag === 'pre') {
        blocks.push(`<pre><code>${escapeHtml(text.slice(0, 1200))}</code></pre>`);
      } else if (tag === 'li') {
        if (words >= 6) {
          blocks.push(`<p>• ${escapeHtml(text)}</p>`);
        }
      } else {
        blocks.push(`<p>${escapeHtml(text)}</p>`);
      }
    });
  }

  const cleanDesc =
    ogDesc.trim() ||
    (blocks[0] ? blocks[0].replace(/<[^>]+>/g, '').slice(0, 180) : '');

  const contentHtml =
    blocks.slice(0, 85).join('\n') ||
    (cleanDesc ? `<p>${escapeHtml(cleanDesc)}</p>` : '');

  const readingTimeMin = Math.max(1, Math.round(wordCount / 215));

  let resolvedImage: string | undefined;
  if (ogImg) {
    try {
      resolvedImage = new URL(ogImg, url).toString();
    } catch {
      if (/^https?:\/\//i.test(ogImg)) resolvedImage = ogImg;
    }
  }

  return {
    title: ogTitle.trim().slice(0, 160) || domain,
    siteName: siteName.trim(),
    description: cleanDesc.slice(0, 220),
    image: resolvedImage,
    contentHtml,
    readingTimeMin
  };
}

export interface ImportedBookmarkItem {
  title: string;
  url: string;
  folder?: string;
}

/**
 * Parses standard Netscape Bookmark HTML exported from Chrome, Firefox, Brave, Edge, Safari, or Arc.
 */
export function parseNetscapeBookmarksHtml(rawHtml: string): ImportedBookmarkItem[] {
  const doc = new DOMParser().parseFromString(rawHtml, 'text/html');
  const anchors = doc.querySelectorAll('a[href]');
  const out: ImportedBookmarkItem[] = [];
  const seen = new Set<string>();

  anchors.forEach((a) => {
    const href = (a.getAttribute('href') || '').trim();
    if (!/^https?:\/\//i.test(href) || seen.has(href)) return;
    seen.add(href);
    const title = (a.textContent || '').trim() || extractDomain(href);
    const dl = a.closest('dl');
    const folderHeader = dl?.previousElementSibling;
    const folder =
      folderHeader && /^h3$/i.test(folderHeader.tagName)
        ? (folderHeader.textContent || '').trim()
        : undefined;
    out.push({ title, url: href, folder });
  });

  return out;
}
