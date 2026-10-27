import { extractDomain } from '../background/triage-core';
import { buildStoryId } from './story-id';
import { isExtensionContext } from './storage';

/**
 * Cove Discover & Cove News Engine
 * - Multi-protocol aggregator combining 100% Free Keyless Public JSON APIs
 *   (Spaceflight News v4, DEV.to Public API, Hacker News Algolia Front-Page API,
 *   Wikimedia Featured News REST API) + Verified Rich Media RSS/Atom sources
 *   (BBC World, The Guardian, The Verge, Ars Technica, Dezeen, NASA).
 * - Smart high-res banner extraction + background og:image enrichment.
 * - 100% On-Device Auto-Learning Interest & Keyword Recommendation Engine.
 * - Clean Full-Article Source Scraper & Sanitizer for "Cove News".
 */

export type DiscoverTopicId =
  | 'for-you'
  | 'tech-ai'
  | 'world'
  | 'science'
  | 'engineering'
  | 'design'
  | 'business';

export interface DiscoverTopicMeta {
  id: DiscoverTopicId;
  label: string;
  shortLabel: string;
}

export const DISCOVER_TOPICS: DiscoverTopicMeta[] = [
  { id: 'for-you', label: 'For You', shortLabel: 'For You' },
  { id: 'tech-ai', label: 'Tech & AI', shortLabel: 'Tech & AI' },
  { id: 'world', label: 'World Dispatch', shortLabel: 'World' },
  { id: 'science', label: 'Science & Space', shortLabel: 'Science' },
  { id: 'engineering', label: 'Engineering', shortLabel: 'Engineering' },
  { id: 'design', label: 'Design & Culture', shortLabel: 'Design' },
  { id: 'business', label: 'Business & Markets', shortLabel: 'Business' }
];

export interface DiscoverStory {
  id: string;
  title: string;
  summary: string;
  highlights: string[];
  url: string;
  domain: string;
  publisher: string;
  verified: boolean;
  topic: Exclude<DiscoverTopicId, 'for-you'>;
  bannerUrl?: string;
  publishedAt: number;
  author?: string;
  readingTimeMin: number;
  communityPoints?: number;
  fullFeedHtml?: string;
  score?: number;
  reasonTag?: string;
}

export interface DiscoverFullArticle {
  title: string;
  publisher: string;
  domain: string;
  author?: string;
  publishedAt?: number;
  bannerUrl?: string;
  leadSummary: string;
  contentHtml: string;
  readingTimeMin: number;
  wordCount: number;
  sourceUrl: string;
}

export interface DiscoverInterestProfile {
  version: number;
  selectedTopics: Exclude<DiscoverTopicId, 'for-you'>[];
  topicScores: Record<string, number>;
  sourceScores: Record<string, number>;
  keywordScores: Record<string, number>;
  mutedKeywords: Record<string, number>;
  dismissedIds: string[];
  readIds: string[];
  totalInteractions: number;
}

interface VerifiedRssSource {
  id: string;
  publisher: string;
  topic: Exclude<DiscoverTopicId, 'for-you'>;
  url: string;
  trustBoost: number;
}

const VERIFIED_RSS_SOURCES: VerifiedRssSource[] = [
  {
    id: 'verge',
    publisher: 'The Verge',
    topic: 'tech-ai',
    url: 'https://www.theverge.com/rss/index.xml',
    trustBoost: 1.3
  },
  {
    id: 'arstechnica',
    publisher: 'Ars Technica',
    topic: 'tech-ai',
    url: 'https://feeds.arstechnica.com/arstechnica/index',
    trustBoost: 1.4
  },
  {
    id: 'bbc-world',
    publisher: 'BBC World',
    topic: 'world',
    url: 'https://feeds.bbci.co.uk/news/world/rss.xml',
    trustBoost: 1.45
  },
  {
    id: 'guardian-world',
    publisher: 'The Guardian',
    topic: 'world',
    url: 'https://www.theguardian.com/world/rss',
    trustBoost: 1.35
  },
  {
    id: 'nasa',
    publisher: 'NASA',
    topic: 'science',
    url: 'https://www.nasa.gov/feed/',
    trustBoost: 1.4
  },
  {
    id: 'guardian-science',
    publisher: 'Guardian Science',
    topic: 'science',
    url: 'https://www.theguardian.com/science/rss',
    trustBoost: 1.25
  },
  {
    id: 'dezeen',
    publisher: 'Dezeen',
    topic: 'design',
    url: 'https://www.dezeen.com/feed/',
    trustBoost: 1.3
  },
  {
    id: 'aeon',
    publisher: 'Aeon Essays',
    topic: 'design',
    url: 'https://aeon.co/feed.rss',
    trustBoost: 1.25
  },
  {
    id: 'cnbc',
    publisher: 'CNBC Markets',
    topic: 'business',
    url: 'https://search.cnbc.com/rs/search/combinedcms/view.xml?partnerId=wrss01&id=100003114',
    trustBoost: 1.2
  },
  {
    id: 'guardian-business',
    publisher: 'Guardian Business',
    topic: 'business',
    url: 'https://www.theguardian.com/uk/business/rss',
    trustBoost: 1.25
  },
  {
    id: 'cloudflare-eng',
    publisher: 'Cloudflare Eng',
    topic: 'engineering',
    url: 'https://blog.cloudflare.com/rss/',
    trustBoost: 1.3
  }
];

const STOP_WORDS = new Set([
  'the', 'and', 'for', 'that', 'with', 'this', 'from', 'your', 'have', 'more', 'will',
  'what', 'about', 'into', 'after', 'over', 'they', 'their', 'been', 'were', 'when',
  'who', 'why', 'how', 'new', 'its', 'says', 'could', 'than', 'first', 'just', 'now',
  'out', 'are', 'was', 'has', 'had', 'not', 'but', 'you', 'all', 'can', 'her', 'his',
  'one', 'our', 'may', 'two', 'most', 'some', 'make', 'made', 'like', 'back', 'year'
]);

export function createDefaultDiscoverProfile(): DiscoverInterestProfile {
  return {
    version: 1,
    selectedTopics: ['tech-ai', 'science', 'world', 'design'],
    topicScores: {
      'tech-ai': 1.5,
      science: 1.2,
      world: 1.1,
      design: 1.0,
      engineering: 1.0,
      business: 0.8
    },
    sourceScores: {},
    keywordScores: {},
    mutedKeywords: {},
    dismissedIds: [],
    readIds: [],
    totalInteractions: 0
  };
}

export function extractStoryKeywords(title: string): string[] {
  return title
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, ' ')
    .split(/\s+/)
    .filter((w) => w.length >= 4 && !STOP_WORDS.has(w))
    .slice(0, 7);
}

/**
 * Reinforces the on-device interest profile from user actions.
 * Positive actions add `delta` to the topic, 0.85 * delta to the source,
 * and 0.7 * delta to each title keyword. A "less" action lowers the topic
 * and source, mutes related keywords, and dismisses the story.
 * - brief: delta 0.85
 * - full_read: delta 1.8
 * - boost: delta 2.4
 * - less: topic -0.65, source -1.4, muted keyword +1.5
 */
export function recordDiscoverFeedback(
  profile: DiscoverInterestProfile,
  story: DiscoverStory,
  kind: 'brief' | 'full_read' | 'boost' | 'less'
): DiscoverInterestProfile {
  const next: DiscoverInterestProfile = {
    ...profile,
    topicScores: { ...profile.topicScores },
    sourceScores: { ...profile.sourceScores },
    keywordScores: { ...profile.keywordScores },
    mutedKeywords: { ...profile.mutedKeywords },
    dismissedIds: [...profile.dismissedIds],
    readIds: [...profile.readIds],
    totalInteractions: profile.totalInteractions + 1
  };

  const keywords = extractStoryKeywords(story.title);

  if (kind === 'less') {
    if (!next.dismissedIds.includes(story.id)) {
      next.dismissedIds = [story.id, ...next.dismissedIds].slice(0, 200);
    }
    next.topicScores[story.topic] = Math.max(0.1, (next.topicScores[story.topic] ?? 1) - 0.65);
    next.sourceScores[story.publisher] = (next.sourceScores[story.publisher] ?? 0) - 1.4;
    for (const kw of keywords) {
      next.mutedKeywords[kw] = (next.mutedKeywords[kw] ?? 0) + 1.5;
    }
    return next;
  }

  const delta = kind === 'boost' ? 2.4 : kind === 'full_read' ? 1.8 : 0.85;
  next.topicScores[story.topic] = Math.min(18, (next.topicScores[story.topic] ?? 1) + delta);
  next.sourceScores[story.publisher] = Math.min(
    14,
    (next.sourceScores[story.publisher] ?? 0) + delta * 0.85
  );

  for (const kw of keywords) {
    next.keywordScores[kw] = Math.min(12, (next.keywordScores[kw] ?? 0) + delta * 0.7);
  }

  if ((kind === 'brief' || kind === 'full_read') && !next.readIds.includes(story.id)) {
    next.readIds = [story.id, ...next.readIds].slice(0, 300);
  }

  return next;
}

/**
 * Scores and ranks stories using recency half-life, explicit/learned topic affinity,
 * source affinity, title keywords, banner quality, community velocity, unread state,
 * and a publisher diversity pass.
 */
export function rankStoriesForUser(
  stories: DiscoverStory[],
  profile: DiscoverInterestProfile,
  activeTopic: DiscoverTopicId
): DiscoverStory[] {
  const now = Date.now();
  const dismissed = new Set(profile.dismissedIds);

  const filtered = stories.filter((s) => {
    if (dismissed.has(s.id)) return false;
    if (activeTopic !== 'for-you' && s.topic !== activeTopic) return false;
    return true;
  });

  const scored = filtered.map((story) => {
    const ageHours = Math.max(0.25, (now - story.publishedAt) / 3_600_000);
    const freshness = Math.pow(0.5, ageHours / 18) * 5.0; // 18-hour news half-life

    const selectedBoost = profile.selectedTopics.includes(story.topic) ? 1.8 : 0;
    const topicWeight = (profile.topicScores[story.topic] ?? 1.0) * 1.35;
    const sourceWeight = (profile.sourceScores[story.publisher] ?? 0) * 0.9;

    const kws = extractStoryKeywords(story.title);
    let kwBoost = 0;
    let topMatchedKw = '';
    let topKwVal = 0;
    for (const kw of kws) {
      const pos = profile.keywordScores[kw] ?? 0;
      const neg = profile.mutedKeywords[kw] ?? 0;
      kwBoost += pos * 0.75 - neg * 1.2;
      if (pos > topKwVal) {
        topKwVal = pos;
        topMatchedKw = kw;
      }
    }

    const bannerQuality = story.bannerUrl ? 2.4 : 0;
    const communityBoost = story.communityPoints
      ? Math.min(2.2, Math.log10(Math.max(10, story.communityPoints)) * 0.7)
      : 0.7;
    const unreadBoost = profile.readIds.includes(story.id) ? -0.9 : 0.4;

    const total =
      freshness +
      selectedBoost +
      topicWeight +
      sourceWeight +
      kwBoost +
      bannerQuality +
      communityBoost +
      unreadBoost;

    let reasonTag = `Verified · ${story.publisher}`;
    if (topKwVal >= 1.4 && topMatchedKw) {
      reasonTag = `Recommended · "${topMatchedKw}"`;
    } else if ((profile.sourceScores[story.publisher] ?? 0) >= 1.8) {
      reasonTag = `Because you read ${story.publisher}`;
    } else if ((profile.topicScores[story.topic] ?? 1) >= 2.6) {
      const topicMeta = DISCOVER_TOPICS.find((t) => t.id === story.topic);
      reasonTag = `Picked for your ${topicMeta?.shortLabel || story.topic} feed`;
    } else if (story.communityPoints && story.communityPoints > 150) {
      reasonTag = `Trending · ${story.communityPoints} pts`;
    }

    return {
      ...story,
      score: Math.round(total * 100) / 100,
      reasonTag
    };
  });

  scored.sort((a, b) => (b.score ?? 0) - (a.score ?? 0));

  // Source diversity pass so top 8 cards aren't dominated by a single publisher
  const diversified: DiscoverStory[] = [];
  const deferred: DiscoverStory[] = [];
  const pubCounts: Record<string, number> = {};

  for (const s of scored) {
    const count = pubCounts[s.publisher] ?? 0;
    if (count < 2 || activeTopic !== 'for-you') {
      diversified.push(s);
      pubCounts[s.publisher] = count + 1;
    } else {
      deferred.push(s);
    }
  }

  return [...diversified, ...deferred];
}

/* ============================================================================
   NETWORK & MULTI-SOURCE SCRAPER HELPERS
   ============================================================================ */

async function fetchExternalText(targetUrl: string, timeoutMs = 7000): Promise<string> {
  const fetchUrl = isExtensionContext()
    ? targetUrl
    : `/__cove_proxy?url=${encodeURIComponent(targetUrl)}`;

  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), timeoutMs);
  try {
    const res = await fetch(fetchUrl, { signal: ctrl.signal });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    return await res.text();
  } finally {
    clearTimeout(timer);
  }
}

function upgradeBannerResolution(rawUrl: string | undefined, baseUrl: string): string | undefined {
  if (!rawUrl) return undefined;
  let cleaned = rawUrl.trim().replace(/&amp;/g, '&');
  if (cleaned.startsWith('//')) cleaned = `https:${cleaned}`;
  try {
    const abs = new URL(cleaned, baseUrl).toString();
    if (!/^https?:\/\//i.test(abs)) return undefined;
    // Upgrade BBC small 240px/320px thumbnails to crisp 1024px HD banners
    if (abs.includes('ichef.bbci.co.uk/ace/standard/')) {
      return abs.replace(/\/standard\/\d+\//, '/standard/1024/');
    }
    return abs;
  } catch {
    return undefined;
  }
}

function stripHtmlToCleanSentences(html: string): { summary: string; highlights: string[] } {
  if (!html) return { summary: '', highlights: [] };
  const doc = new DOMParser().parseFromString(html, 'text/html');
  doc.querySelectorAll('script, style, figure, figcaption').forEach((n) => n.remove());
  const rawText = (doc.body.textContent || '').replace(/\s+/g, ' ').trim();
  if (!rawText) return { summary: '', highlights: [] };

  const sentences = rawText
    .split(/(?<=[.!?])\s+/)
    .map((s) => s.trim())
    .filter((s) => s.length >= 28 && !s.toLowerCase().includes('continue reading'));

  const summary = (sentences.slice(0, 3).join(' ') || rawText).slice(0, 420);
  const highlights = sentences.slice(1, 4).map((s) => s.slice(0, 165));
  return { summary, highlights };
}

function extractBestImageFromXmlNode(node: Element, linkUrl: string, htmlBlob: string): string | undefined {
  let bestUrl: string | undefined;
  let bestWidth = 0;

  // 1. Check all media:content & media:thumbnail elements (pick largest width)
  const mediaEls = [
    ...Array.from(node.getElementsByTagName('media:content')),
    ...Array.from(node.getElementsByTagName('media:thumbnail')),
    ...Array.from(node.querySelectorAll('content[url], thumbnail[url]'))
  ];

  for (const m of mediaEls) {
    const u = m.getAttribute('url');
    const type = m.getAttribute('type') || '';
    if (!u || (type && !type.startsWith('image/'))) continue;
    const w = parseInt(m.getAttribute('width') || '400', 10) || 400;
    if (w >= bestWidth) {
      bestWidth = w;
      bestUrl = u;
    }
  }

  // 2. Check <enclosure type="image/*">
  if (!bestUrl) {
    const enc = node.querySelector('enclosure');
    const encUrl = enc?.getAttribute('url');
    const encType = enc?.getAttribute('type') || '';
    if (encUrl && (encType.startsWith('image/') || /\.(jpe?g|png|webp)/i.test(encUrl))) {
      bestUrl = encUrl;
    }
  }

  // 3. Check <img> inside content:encoded / Atom <content> / <description>
  if (!bestUrl && htmlBlob) {
    const htmlDoc = new DOMParser().parseFromString(htmlBlob, 'text/html');
    const imgs = Array.from(htmlDoc.querySelectorAll('img'));
    for (const img of imgs) {
      const src =
        img.getAttribute('src') ||
        img.getAttribute('data-src') ||
        img.getAttribute('srcset')?.split(/\s+/)[0];
      if (!src) continue;
      if (/pixel|tracker|avatar|1x1|feedburner|emoji/i.test(src)) continue;
      bestUrl = src;
      break;
    }
  }

  return upgradeBannerResolution(bestUrl, linkUrl);
}

function parseVerifiedRssFeed(xml: string, src: VerifiedRssSource): DiscoverStory[] {
  const doc = new DOMParser().parseFromString(xml, 'text/xml');
  const isAtom = doc.querySelectorAll('entry').length > 0 && doc.querySelectorAll('item').length === 0;
  const nodes = Array.from(doc.querySelectorAll(isAtom ? 'entry' : 'item')).slice(0, 8);
  const out: DiscoverStory[] = [];

  for (const node of nodes) {
    const rawTitle = (node.querySelector('title')?.textContent || '').replace(/\s+/g, ' ').trim();
    if (!rawTitle) continue;

    let link = '';
    if (isAtom) {
      const alt = node.querySelector('link[rel="alternate"]') || node.querySelector('link');
      link = alt?.getAttribute('href') || alt?.textContent || '';
    } else {
      link = node.querySelector('link')?.textContent || '';
    }
    link = link.trim();
    if (!/^https?:\/\//i.test(link)) continue;

    const encoded =
      node.getElementsByTagName('content:encoded')[0]?.textContent ||
      node.querySelector('content')?.textContent ||
      '';
    const desc = node.querySelector('description, summary')?.textContent || '';
    const richHtml = encoded.length > desc.length ? encoded : desc;

    const bannerUrl = extractBestImageFromXmlNode(node, link, richHtml);
    const { summary, highlights } = stripHtmlToCleanSentences(desc || encoded);

    const dateRaw =
      node.querySelector('pubDate, published, updated')?.textContent ||
      node.getElementsByTagName('dc:date')[0]?.textContent ||
      '';
    const parsedTime = dateRaw ? Date.parse(dateRaw) : NaN;
    const publishedAt = Number.isNaN(parsedTime) ? Date.now() - 1_800_000 : parsedTime;

    const author =
      node.querySelector('author > name')?.textContent?.trim() ||
      node.getElementsByTagName('dc:creator')[0]?.textContent?.trim() ||
      undefined;

    const words = (encoded || desc).replace(/<[^>]+>/g, ' ').split(/\s+/).length;
    const readingTimeMin = Math.max(2, Math.min(18, Math.round(words / 210) || 4));

    out.push({
      id: buildStoryId(`rss-${src.id}`, link),
      title: rawTitle,
      summary: summary || rawTitle,
      highlights,
      url: link,
      domain: extractDomain(link),
      publisher: src.publisher,
      verified: true,
      topic: src.topic,
      bannerUrl,
      publishedAt,
      author,
      readingTimeMin,
      fullFeedHtml: encoded.length > 450 ? encoded : undefined
    });
  }

  return out;
}

/* 100% Free Keyless Public JSON APIs */
async function fetchSpaceflightPublicApi(): Promise<DiscoverStory[]> {
  const ctrl = new AbortController();
  const t = setTimeout(() => ctrl.abort(), 6500);
  try {
    const res = await fetch('https://api.spaceflightnewsapi.net/v4/articles/?limit=8', {
      signal: ctrl.signal
    });
    if (!res.ok) return [];
    const data = await res.json();
    return (data.results || []).map((a: any) => ({
      id: `sf-${a.id}`,
      title: String(a.title || '').trim(),
      summary: String(a.summary || '').trim(),
      highlights: [],
      url: String(a.url),
      domain: extractDomain(String(a.url)),
      publisher: String(a.news_site || 'SpaceNews'),
      verified: true,
      topic: 'science' as const,
      bannerUrl: upgradeBannerResolution(a.image_url, String(a.url)),
      publishedAt: Date.parse(a.published_at) || Date.now(),
      readingTimeMin: 4
    }));
  } catch {
    return [];
  } finally {
    clearTimeout(t);
  }
}

async function fetchDevToPublicApi(): Promise<DiscoverStory[]> {
  const ctrl = new AbortController();
  const t = setTimeout(() => ctrl.abort(), 6500);
  try {
    const res = await fetch('https://dev.to/api/articles?top=2&per_page=8', {
      signal: ctrl.signal
    });
    if (!res.ok) return [];
    const items = await res.json();
    return (items || []).map((a: any) => ({
      id: `devto-${a.id}`,
      title: String(a.title || '').trim(),
      summary: String(a.description || '').trim(),
      highlights: (a.tag_list || []).map((tg: string) => `#${tg}`),
      url: String(a.url),
      domain: 'dev.to',
      publisher: 'DEV Engineering',
      verified: true,
      topic: 'engineering' as const,
      bannerUrl: upgradeBannerResolution(a.cover_image || a.social_image, String(a.url)),
      publishedAt: Date.parse(a.published_timestamp) || Date.now(),
      author: a.user?.name,
      readingTimeMin: Number(a.reading_time_minutes) || 5,
      communityPoints: Number(a.public_reactions_count) || undefined
    }));
  } catch {
    return [];
  } finally {
    clearTimeout(t);
  }
}

async function fetchHackerNewsFrontPageApi(): Promise<DiscoverStory[]> {
  const ctrl = new AbortController();
  const t = setTimeout(() => ctrl.abort(), 6500);
  try {
    const res = await fetch('https://hn.algolia.com/api/v1/search?tags=front_page&hitsPerPage=8', {
      signal: ctrl.signal
    });
    if (!res.ok) return [];
    const data = await res.json();
    return (data.hits || [])
      .filter((h: any) => h.url && h.title)
      .map((h: any) => ({
        id: `hn-${h.objectID}`,
        title: String(h.title).trim(),
        summary: `Featured on Hacker News front page (${h.points || 0} points · ${h.num_comments || 0} comments) from ${extractDomain(h.url)}.`,
        highlights: [`${h.points || 0} community points`, `${h.num_comments || 0} discussion comments`],
        url: String(h.url),
        domain: extractDomain(String(h.url)),
        publisher: extractDomain(String(h.url)),
        verified: true,
        topic: 'tech-ai' as const,
        publishedAt: (h.created_at_i ? h.created_at_i * 1000 : Date.now()),
        author: h.author,
        readingTimeMin: 5,
        communityPoints: Number(h.points) || undefined
      }));
  } catch {
    return [];
  } finally {
    clearTimeout(t);
  }
}

/**
 * Background OG Banner Scraper: enriches top text-only stories (e.g. Hacker News)
 * with real <meta property="og:image"> and clean <meta property="og:description">.
 */
async function enrichMissingBanners(stories: DiscoverStory[]): Promise<DiscoverStory[]> {
  const missing = stories.filter((s) => !s.bannerUrl).slice(0, 5);
  if (missing.length === 0) return stories;

  const updates = new Map<string, { bannerUrl?: string; summary?: string }>();

  await Promise.allSettled(
    missing.map(async (story) => {
      try {
        const html = await fetchExternalText(story.url, 4200);
        const headSlice = html.slice(0, 45_000);
        const doc = new DOMParser().parseFromString(headSlice, 'text/html');
        const ogImg =
          doc.querySelector('meta[property="og:image"]')?.getAttribute('content') ||
          doc.querySelector('meta[name="twitter:image"]')?.getAttribute('content');
        const ogDesc =
          doc.querySelector('meta[property="og:description"]')?.getAttribute('content') ||
          doc.querySelector('meta[name="description"]')?.getAttribute('content');

        const resolved = upgradeBannerResolution(ogImg || undefined, story.url);
        if (resolved || ogDesc) {
          updates.set(story.id, {
            bannerUrl: resolved,
            summary: ogDesc && ogDesc.trim().length > 45 ? ogDesc.trim() : undefined
          });
        }
      } catch {
        // leave graceful monogram card if site blocks scrape
      }
    })
  );

  return stories.map((s) => {
    const up = updates.get(s.id);
    if (!up) return s;
    return {
      ...s,
      bannerUrl: up.bannerUrl || s.bannerUrl,
      summary: up.summary || s.summary
    };
  });
}

/**
 * Computes top trending keywords across live stories for 1-click Discover topic filtering.
 */
export function computeTrendingKeywords(stories: DiscoverStory[], maxCount = 8): string[] {
  const counts = new Map<string, number>();
  const generic = new Set([
    'says', 'after', 'over', 'into', 'from', 'with', 'that', 'this', 'their', 'what',
    'year', 'years', 'time', 'first', 'more', 'most', 'make', 'made', 'week', 'today',
    'world', 'news', 'report', 'reports', 'show', 'shows', 'could', 'would', 'should',
    'people', 'million', 'billion', 'company', 'companies', 'using', 'used', 'work'
  ]);
  for (const s of stories) {
    const words = new Set(
      s.title
        .toLowerCase()
        .replace(/[^a-z0-9\s]/g, ' ')
        .split(/\s+/)
        .filter((w) => w.length >= 4 && !generic.has(w) && !/^\d+$/.test(w))
    );
    for (const w of words) {
      counts.set(w, (counts.get(w) || 0) + 1);
    }
  }
  return Array.from(counts.entries())
    .filter(([, c]) => c >= 2)
    .sort((a, b) => b[1] - a[1])
    .slice(0, maxCount)
    .map(([w]) => w);
}

/**
 * Fetches & deduplicates stories across all 100% free APIs, verified RSS feeds,
 * and optional user-followed custom RSS feeds.
 */
export async function fetchCustomRssStories(
  customFeeds: { id: string; title: string; url: string }[]
): Promise<DiscoverStory[]> {
  const userFeeds = customFeeds.filter(
    (f) =>
      f.id.startsWith('custom-') &&
      /^https?:\/\//i.test(f.url) &&
      !VERIFIED_RSS_SOURCES.some((v) => v.url.toLowerCase() === f.url.toLowerCase())
  );
  if (userFeeds.length === 0) return [];

  const lists = await Promise.all(
    userFeeds.map(async (cf) => {
      try {
        const xml = await fetchExternalText(cf.url, 5500);
        return parseVerifiedRssFeed(xml, {
          id: cf.id,
          publisher: cf.title || extractDomain(cf.url),
          topic: 'tech-ai',
          url: cf.url,
          trustBoost: 1.6
        });
      } catch {
        return [];
      }
    })
  );
  return lists.flat();
}

/**
 * Fetches & deduplicates stories across all 100% free APIs & verified RSS feeds
 * without blocking on user-added custom feeds.
 */
export async function fetchAllDiscoverStories(
  customFeeds: { id: string; title: string; url: string }[] = [],
  force = false
): Promise<DiscoverStory[]> {
  // Fast-path in Web / Live Preview: single pre-warmed server call (/api/discover)
  if (!isExtensionContext()) {
    try {
      const apiRes = await fetch(force ? '/api/discover?force=1' : '/api/discover');
      if (apiRes.ok) {
        const payload = await apiRes.json();
        if (Array.isArray(payload?.stories) && payload.stories.length > 0) {
          return payload.stories as DiscoverStory[];
        }
      }
    } catch {
      // fall through to direct client aggregation
    }
  }

  const userCustom = customFeeds.filter((f) => f.id.startsWith('custom-') && /^https?:\/\//i.test(f.url));
  const allRssSources: VerifiedRssSource[] = [
    ...userCustom.map((cf) => ({
      id: cf.id,
      publisher: cf.title || extractDomain(cf.url),
      topic: 'tech-ai' as const,
      url: cf.url,
      trustBoost: 1.5
    })),
    ...VERIFIED_RSS_SOURCES
  ];

  // Fetch RSS in clean batches of 5 to avoid browser HTTP/1.1 connection stalls
  const rssLists: DiscoverStory[][] = [];
  for (let i = 0; i < allRssSources.length; i += 5) {
    const chunk = allRssSources.slice(i, i + 5);
    const chunkRes = await Promise.all(
      chunk.map(async (src) => {
        try {
          const xml = await fetchExternalText(src.url, 6500);
          return parseVerifiedRssFeed(xml, src);
        } catch {
          return [];
        }
      })
    );
    rssLists.push(...chunkRes);
  }

  const [sf, devto, hn] = await Promise.all([
    fetchSpaceflightPublicApi(),
    fetchDevToPublicApi(),
    fetchHackerNewsFrontPageApi()
  ]);

  const combined = [...rssLists.flat(), ...sf, ...devto, ...hn];

  // Deduplicate by normalized title prefix & URL
  const seenUrls = new Set<string>();
  const seenTitleKeys = new Set<string>();
  const unique: DiscoverStory[] = [];

  for (const item of combined) {
    const normUrl = item.url.replace(/\?.*$/, '').toLowerCase();
    const normTitle = item.title
      .toLowerCase()
      .replace(/[^a-z0-9]/g, '')
      .slice(0, 42);
    if (!normTitle || seenUrls.has(normUrl) || seenTitleKeys.has(normTitle)) continue;
    seenUrls.add(normUrl);
    seenTitleKeys.add(normTitle);
    unique.push(item);
  }

  return await enrichMissingBanners(unique);
}

/* ============================================================================
   CLEAN FULL-ARTICLE SOURCE SCRAPER FOR "COVE NEWS" READER
   ============================================================================ */

function escapeHtml(raw: string): string {
  return raw
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function sanitizeExtractedContainer(root: Element, baseUrl: string): { html: string; wordCount: number } {
  const blocks: string[] = [];
  let wordCount = 0;
  const seenText = new Set<string>();

  const nodes = root.querySelectorAll('h2, h3, p, blockquote, pre, figure, img, li');

  nodes.forEach((el) => {
    const tag = el.tagName.toLowerCase();

    if (tag === 'figure' || tag === 'img') {
      const img = tag === 'img' ? el : el.querySelector('img');
      if (!img) return;
      // Skip if img inside figure was already processed
      if (tag === 'img' && el.closest('figure')) return;

      const rawSrc =
        img.getAttribute('src') ||
        img.getAttribute('data-src') ||
        img.getAttribute('data-lazy-src') ||
        img.getAttribute('srcset')?.split(/\s+/)[0];
      const resolved = upgradeBannerResolution(rawSrc || undefined, baseUrl);
      if (!resolved) return;
      if (/avatar|logo|icon|pixel|1x1|sprite|badge|button/i.test(resolved)) return;

      const wAttr = parseInt(img.getAttribute('width') || '600', 10);
      if (wAttr > 0 && wAttr < 160) return;

      if (seenText.has(resolved)) return;
      seenText.add(resolved);

      const caption =
        tag === 'figure'
          ? (el.querySelector('figcaption')?.textContent || '').replace(/\s+/g, ' ').trim()
          : (img.getAttribute('alt') || '').trim();

      blocks.push(
        `<figure class="cove-news-fig"><img src="${escapeHtml(resolved)}" referrerpolicy="no-referrer" alt="${escapeHtml(caption.slice(0, 120))}" loading="lazy" />${
          caption && caption.length > 8
            ? `<figcaption>${escapeHtml(caption.slice(0, 220))}</figcaption>`
            : ''
        }</figure>`
      );
      return;
    }

    const text = (el.textContent || '').replace(/\s+/g, ' ').trim();
    if (text.length < 26 || seenText.has(text)) return;

    // Filter common publisher promo/cookie boilerplate lines
    if (
      /^(sign up for|subscribe to|read more:|related:|advertisement|cookie policy|all rights reserved|follow us on)/i.test(
        text
      )
    ) {
      return;
    }

    seenText.add(text);
    const words = text.split(/\s+/).length;
    wordCount += words;

    if (tag === 'h2' || tag === 'h3') {
      blocks.push(`<${tag}>${escapeHtml(text)}</${tag}>`);
    } else if (tag === 'blockquote') {
      blocks.push(`<blockquote>${escapeHtml(text)}</blockquote>`);
    } else if (tag === 'pre') {
      blocks.push(`<pre><code>${escapeHtml(text.slice(0, 2400))}</code></pre>`);
    } else if (tag === 'li') {
      if (words >= 7 && !el.closest('nav, header, footer')) {
        blocks.push(`<p>• ${escapeHtml(text)}</p>`);
      }
    } else {
      blocks.push(`<p>${escapeHtml(text)}</p>`);
    }
  });

  return {
    html: blocks.slice(0, 120).join('\n'),
    wordCount
  };
}

/**
 * Fetches the full original article directly from the source, removes all ads,
 * trackers, popups, and clutter, and returns crisp magazine-grade Cove News HTML.
 */
export async function fetchFullCoveNewsArticle(story: DiscoverStory): Promise<DiscoverFullArticle> {
  // Fast server-extracted prose in Web / Live Preview mode
  if (!isExtensionContext()) {
    try {
      const apiRes = await fetch(`/api/article?url=${encodeURIComponent(story.url)}`);
      if (apiRes.ok) {
        const data = await apiRes.json();
        if (data?.contentHtml && Number(data.wordCount) >= 50) {
          return {
            title: data.title || story.title,
            publisher: data.publisher || story.publisher,
            domain: data.domain || story.domain,
            author: data.author || story.author,
            publishedAt: story.publishedAt,
            bannerUrl: data.bannerUrl || story.bannerUrl,
            leadSummary: story.summary,
            contentHtml: data.contentHtml,
            readingTimeMin: data.readingTimeMin || story.readingTimeMin,
            wordCount: data.wordCount,
            sourceUrl: story.url
          };
        }
      }
    } catch {
      // fall through to client DOMParser
    }
  }

  try {
    const rawHtml = await fetchExternalText(story.url, 9000);
    const doc = new DOMParser().parseFromString(rawHtml, 'text/html');

    const ogTitle =
      doc.querySelector('meta[property="og:title"]')?.getAttribute('content') ||
      doc.querySelector('h1')?.textContent ||
      story.title;

    const ogImage = upgradeBannerResolution(
      doc.querySelector('meta[property="og:image"]')?.getAttribute('content') ||
        doc.querySelector('meta[name="twitter:image"]')?.getAttribute('content') ||
        story.bannerUrl,
      story.url
    );

    const byline =
      doc.querySelector('meta[name="author"]')?.getAttribute('content') ||
      doc.querySelector('[rel="author"]')?.textContent ||
      story.author;

    // Check JSON-LD NewsArticle.articleBody as high-reliability backup
    let jsonLdBody = '';
    doc.querySelectorAll('script[type="application/ld+json"]').forEach((sc) => {
      try {
        const parsed = JSON.parse(sc.textContent || '{}');
        const list = Array.isArray(parsed) ? parsed : parsed['@graph'] || [parsed];
        for (const item of list) {
          if (item?.articleBody && String(item.articleBody).length > jsonLdBody.length) {
            jsonLdBody = String(item.articleBody);
          }
        }
      } catch {
        // ignore malformed ld+json
      }
    });

    // Strip all ads, popups, sidebars, navs, scripts, cookie banners, related widgets
    doc
      .querySelectorAll(
        [
          'script',
          'style',
          'noscript',
          'iframe',
          'nav',
          'header:not(article header)',
          'footer',
          'aside',
          'form',
          'button',
          'svg',
          '[role="navigation"]',
          '[role="complementary"]',
          '[role="banner"]',
          '[aria-label*="advertisement" i]',
          '[class*="ad-" i]',
          '[class*="ads-" i]',
          '[class*="advert" i]',
          '[class*="newsletter" i]',
          '[class*="subscribe" i]',
          '[class*="cookie" i]',
          '[class*="paywall" i]',
          '[class*="related" i]',
          '[class*="recirc" i]',
          '[class*="share" i]',
          '[class*="social" i]',
          '[class*="comments" i]',
          '[class*="sidebar" i]',
          '[class*="promo" i]'
        ].join(', ')
      )
      .forEach((n) => n.remove());

    // Pick best article prose container by paragraph text density
    const candidates = [
      ...Array.from(doc.querySelectorAll('[itemprop="articleBody"], [data-component="text-block"]')),
      ...Array.from(doc.querySelectorAll('article')),
      ...Array.from(doc.querySelectorAll('main, [role="main"]')),
      doc.body
    ].filter(Boolean) as Element[];

    let bestRoot = candidates[0] || doc.body;
    let bestScore = -1;
    for (const c of candidates) {
      const pLen = Array.from(c.querySelectorAll('p')).reduce(
        (acc, p) => acc + (p.textContent || '').trim().length,
        0
      );
      if (pLen > bestScore) {
        bestScore = pLen;
        bestRoot = c;
      }
    }

    let { html, wordCount } = sanitizeExtractedContainer(bestRoot, story.url);

    // Fallback 1: Full Atom/RSS content:encoded HTML if source page was JS-hydrated
    if (wordCount < 90 && story.fullFeedHtml) {
      const feedDoc = new DOMParser().parseFromString(story.fullFeedHtml, 'text/html');
      const fromFeed = sanitizeExtractedContainer(feedDoc.body, story.url);
      if (fromFeed.wordCount > wordCount) {
        html = fromFeed.html;
        wordCount = fromFeed.wordCount;
      }
    }

    // Fallback 2: JSON-LD articleBody paragraphs
    if (wordCount < 90 && jsonLdBody.length > 200) {
      const paras = jsonLdBody
        .split(/\n+/)
        .map((p) => p.trim())
        .filter((p) => p.length > 25);
      html = paras.map((p) => `<p>${escapeHtml(p)}</p>`).join('\n');
      wordCount = jsonLdBody.split(/\s+/).length;
    }

    // Fallback 3: Executive summary paragraphs
    if (!html) {
      html = `<p>${escapeHtml(story.summary)}</p>`;
      wordCount = story.summary.split(/\s+/).length;
    }

    return {
      title: ogTitle.trim() || story.title,
      publisher: story.publisher,
      domain: story.domain,
      author: byline?.trim(),
      publishedAt: story.publishedAt,
      bannerUrl: ogImage || story.bannerUrl,
      leadSummary: story.summary,
      contentHtml: html,
      readingTimeMin: Math.max(2, Math.round(wordCount / 215)),
      wordCount,
      sourceUrl: story.url
    };
  } catch {
    // Graceful offline/feed fallback if network unreachable
    let fallbackHtml = `<p>${escapeHtml(story.summary)}</p>`;
    let wc = story.summary.split(/\s+/).length;
    if (story.fullFeedHtml) {
      const feedDoc = new DOMParser().parseFromString(story.fullFeedHtml, 'text/html');
      const parsed = sanitizeExtractedContainer(feedDoc.body, story.url);
      if (parsed.html) {
        fallbackHtml = parsed.html;
        wc = parsed.wordCount;
      }
    }
    return {
      title: story.title,
      publisher: story.publisher,
      domain: story.domain,
      author: story.author,
      publishedAt: story.publishedAt,
      bannerUrl: story.bannerUrl,
      leadSummary: story.summary,
      contentHtml: fallbackHtml,
      readingTimeMin: Math.max(2, Math.round(wc / 215)),
      wordCount: wc,
      sourceUrl: story.url
    };
  }
}
