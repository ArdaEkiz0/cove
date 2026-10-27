import type { RssEntry } from './types';

function stripTags(html: string): string {
  return html
    .replace(/<!\[CDATA\[([\s\S]*?)\]\]>/g, '$1')
    .replace(/<[^>]*>/g, '')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&#x27;/g, "'")
    .replace(/\s+/g, ' ')
    .trim();
}

export function parseFeedXml(xmlText: string, fallbackSource: string): RssEntry[] {
  const parser = new DOMParser();
  const doc = parser.parseFromString(xmlText, 'text/xml');
  if (doc.querySelector('parsererror')) {
    throw new Error('Invalid RSS/Atom XML');
  }

  const entries: RssEntry[] = [];

  // RSS 2.0
  const rssChannelTitle = stripTags(doc.querySelector('channel > title')?.textContent || '') || fallbackSource;
  const rssItems = Array.from(doc.querySelectorAll('item'));
  if (rssItems.length > 0) {
    for (const item of rssItems.slice(0, 10)) {
      const title = stripTags(item.querySelector('title')?.textContent || 'Untitled');
      const link = (
        item.querySelector('link')?.textContent ||
        item.querySelector('guid')?.textContent ||
        ''
      ).trim();
      const pubRaw =
        item.querySelector('pubDate')?.textContent ||
        item.getElementsByTagName('dc:date')[0]?.textContent ||
        '';
      const parsedDate = pubRaw ? Date.parse(pubRaw) : NaN;
      if (link && /^https?:\/\//i.test(link)) {
        entries.push({
          id: `${rssChannelTitle}-${link}`,
          title,
          link,
          source: rssChannelTitle,
          publishedAt: Number.isNaN(parsedDate) ? Date.now() : parsedDate
        });
      }
    }
    return entries;
  }

  // Atom 1.0
  const atomTitle = stripTags(doc.querySelector('feed > title')?.textContent || '') || fallbackSource;
  const atomEntries = Array.from(doc.querySelectorAll('entry'));
  for (const entry of atomEntries.slice(0, 10)) {
    const title = stripTags(entry.querySelector('title')?.textContent || 'Untitled');
    const linkEl =
      entry.querySelector('link[rel="alternate"]') ||
      entry.querySelector('link:not([rel])') ||
      entry.querySelector('link');
    const link = (linkEl?.getAttribute('href') || linkEl?.textContent || '').trim();
    const pubRaw =
      entry.querySelector('published')?.textContent ||
      entry.querySelector('updated')?.textContent ||
      '';
    const parsedDate = pubRaw ? Date.parse(pubRaw) : NaN;
    if (link && /^https?:\/\//i.test(link)) {
      entries.push({
        id: `${atomTitle}-${link}`,
        title,
        link,
        source: atomTitle,
        publishedAt: Number.isNaN(parsedDate) ? Date.now() : parsedDate
      });
    }
  }

  return entries;
}

export function formatTimeAgo(timestampMs: number): string {
  const diffSec = Math.max(0, Math.floor((Date.now() - timestampMs) / 1000));
  if (diffSec < 60) return 'just now';
  const mins = Math.floor(diffSec / 60);
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  const days = Math.floor(hrs / 24);
  if (days < 30) return `${days}d ago`;
  return new Date(timestampMs).toLocaleDateString();
}
