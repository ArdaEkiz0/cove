import { defineConfig, type Plugin } from 'vite';
import { svelte } from '@sveltejs/vite-plugin-svelte';
import tailwindcss from '@tailwindcss/vite';
import { existsSync, readFileSync } from 'node:fs';
import { resolve } from 'node:path';

type TopicKey = 'tech-ai' | 'world' | 'science' | 'engineering' | 'design' | 'business';

interface ServerStory {
  id: string;
  title: string;
  summary: string;
  highlights: string[];
  url: string;
  domain: string;
  publisher: string;
  verified: boolean;
  topic: TopicKey;
  bannerUrl?: string;
  publishedAt: number;
  author?: string;
  readingTimeMin: number;
  communityPoints?: number;
  fullFeedHtml?: string;
}

const VERIFIED_FEEDS: { id: string; publisher: string; topic: TopicKey; url: string }[] = [
  { id: 'verge', publisher: 'The Verge', topic: 'tech-ai', url: 'https://www.theverge.com/rss/index.xml' },
  { id: 'ars', publisher: 'Ars Technica', topic: 'tech-ai', url: 'https://feeds.arstechnica.com/arstechnica/index' },
  { id: 'bbc', publisher: 'BBC World', topic: 'world', url: 'https://feeds.bbci.co.uk/news/world/rss.xml' },
  { id: 'guardian-world', publisher: 'The Guardian', topic: 'world', url: 'https://www.theguardian.com/world/rss' },
  { id: 'nasa', publisher: 'NASA', topic: 'science', url: 'https://www.nasa.gov/feed/' },
  { id: 'guardian-sci', publisher: 'Guardian Science', topic: 'science', url: 'https://www.theguardian.com/science/rss' },
  { id: 'dezeen', publisher: 'Dezeen', topic: 'design', url: 'https://www.dezeen.com/feed/' },
  { id: 'aeon', publisher: 'Aeon Essays', topic: 'design', url: 'https://aeon.co/feed.rss' },
  { id: 'cnbc', publisher: 'CNBC Markets', topic: 'business', url: 'https://search.cnbc.com/rs/search/combinedcms/view.xml?partnerId=wrss01&id=100003114' },
  { id: 'guardian-biz', publisher: 'Guardian Business', topic: 'business', url: 'https://www.theguardian.com/uk/business/rss' },
  { id: 'cloudflare', publisher: 'Cloudflare Eng', topic: 'engineering', url: 'https://blog.cloudflare.com/rss/' }
];

const UA =
  'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/128.0.0.0 Safari/537.36';

const proxyCache = new Map<string, { at: number; status: number; contentType: string; body: string }>();
const articleCache = new Map<string, { at: number; json: string }>();
let discoverMemCache: { at: number; stories: ServerStory[] } | null = null;
let discoverInFlight: Promise<ServerStory[]> | null = null;

function isPrivateHost(hostname: string): boolean {
  const h = hostname.toLowerCase();
  return (
    h === 'localhost' ||
    h === '127.0.0.1' ||
    h === '0.0.0.0' ||
    h === '::1' ||
    h.startsWith('169.254.') ||
    h.startsWith('10.') ||
    h.startsWith('192.168.')
  );
}

function getDomain(raw: string): string {
  try {
    return new URL(raw).hostname.replace(/^www\./, '');
  } catch {
    return 'news';
  }
}

function decodeEnt(raw: string): string {
  return raw
    .replace(/<!\[CDATA\[([\s\S]*?)\]\]>/g, '$1')
    .replace(/&#(\d+);/g, (_, d) => String.fromCodePoint(Number(d)))
    .replace(/&#x([0-9a-fA-F]+);/g, (_, h) => String.fromCodePoint(parseInt(h, 16)))
    .replace(/&quot;/g, '"')
    .replace(/&apos;/g, "'")
    .replace(/&#039;/g, "'")
    .replace(/&rsquo;/g, '’')
    .replace(/&lsquo;/g, '‘')
    .replace(/&ldquo;/g, '“')
    .replace(/&rdquo;/g, '”')
    .replace(/&ndash;/g, '–')
    .replace(/&mdash;/g, '—')
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>');
}

function escHtml(raw: string): string {
  return raw.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

function upgradeBanner(raw: string | undefined, base: string): string | undefined {
  if (!raw) return undefined;
  let cleaned = decodeEnt(raw).trim();
  if (cleaned.startsWith('//')) cleaned = `https:${cleaned}`;
  try {
    const abs = new URL(cleaned, base).toString();
    if (!/^https?:\/\//i.test(abs)) return undefined;
    if (abs.includes('ichef.bbci.co.uk/ace/standard/')) {
      return abs.replace(/\/standard\/\d+\//, '/standard/1024/');
    }
    return abs;
  } catch {
    return undefined;
  }
}

function cleanTextSummary(html: string): { summary: string; highlights: string[] } {
  const plain = decodeEnt(
    html
      .replace(/<figure[\s\S]*?<\/figure>/gi, ' ')
      .replace(/<script[\s\S]*?<\/script>/gi, ' ')
      .replace(/<style[\s\S]*?<\/style>/gi, ' ')
      .replace(/<[^>]+>/g, ' ')
  )
    .replace(/\s+/g, ' ')
    .trim();

  const sents = plain
    .split(/(?<=[.!?])\s+/)
    .map((s) => s.trim())
    .filter((s) => s.length >= 26 && !/continue reading|appeared first on/i.test(s));

  return {
    summary: (sents.slice(0, 3).join(' ') || plain).slice(0, 420),
    highlights: sents.slice(1, 4).map((s) => s.slice(0, 165))
  };
}

function pickBestBanner(block: string, link: string): string | undefined {
  let best: string | undefined;
  let maxW = 0;

  for (const m of block.matchAll(/<media:(?:content|thumbnail)\b([^>]*?)\/?>/gi)) {
    const attrs = m[1];
    const u = attrs.match(/\burl=["']([^"']+)["']/i)?.[1];
    if (!u) continue;
    const tp = attrs.match(/\btype=["']([^"']+)["']/i)?.[1];
    if (tp && !tp.startsWith('image/')) continue;
    const w = parseInt(attrs.match(/\bwidth=["'](\d+)["']/i)?.[1] || '450', 10);
    if (w >= maxW) {
      maxW = w;
      best = u;
    }
  }

  if (!best) {
    const enc = block.match(/<enclosure\b[^>]*?\burl=["']([^"']+)["'][^>]*?>/i);
    if (enc && /\.(jpe?g|png|webp)|image\//i.test(enc[0])) best = enc[1];
  }

  if (!best) {
    const decoded = decodeEnt(block);
    for (const im of decoded.matchAll(/<img\b[^>]*?\b(?:src|data-src)=["']([^"']+)["'][^>]*?>/gi)) {
      if (/pixel|tracker|avatar|1x1|feedburner|emoji|badge/i.test(im[1])) continue;
      best = im[1];
      break;
    }
  }

  return upgradeBanner(best, link);
}

function getTag(block: string, pat: string): string {
  const m = block.match(new RegExp(`<(${pat})(?:\\s[^>]*)?>([\\s\\S]*?)<\\/\\1>`, 'i'));
  return m ? decodeEnt(m[2]).trim() : '';
}

function parseXmlFeed(xml: string, src: (typeof VERIFIED_FEEDS)[number]): ServerStory[] {
  const isAtom = /<entry[\s>]/i.test(xml) && !/<item[\s>]/i.test(xml);
  const re = isAtom ? /<entry\b[\s\S]*?<\/entry>/gi : /<item\b[\s\S]*?<\/item>/gi;
  const blocks = Array.from(xml.matchAll(re)).map((m) => m[0]).slice(0, 7);
  const out: ServerStory[] = [];

  for (const b of blocks) {
    const title = getTag(b, 'title').replace(/<[^>]+>/g, '').trim();
    if (!title) continue;

    let link = '';
    if (isAtom) {
      const hm =
        b.match(/<link\b[^>]*rel=["']alternate["'][^>]*href=["']([^"']+)["']/i) ||
        b.match(/<link\b[^>]*href=["']([^"']+)["']/i);
      link = hm ? decodeEnt(hm[1]) : '';
    } else {
      link = getTag(b, 'link');
    }
    if (!/^https?:\/\//i.test(link)) continue;

    const encoded = getTag(b, 'content:encoded|content');
    const desc = getTag(b, 'description|summary');
    const bannerUrl = pickBestBanner(b, link);
    const { summary, highlights } = cleanTextSummary(desc || encoded);

    const dt = getTag(b, 'pubDate|published|updated|dc:date');
    const ts = dt ? Date.parse(dt) : NaN;
    const publishedAt = Number.isNaN(ts) ? Date.now() - 1_200_000 : ts;

    const author = getTag(b, 'dc:creator|name').replace(/<[^>]+>/g, '').slice(0, 60) || undefined;
    const words = (encoded || desc).replace(/<[^>]+>/g, ' ').split(/\s+/).length;
    const readingTimeMin = Math.max(2, Math.min(16, Math.round(words / 215) || 4));

    out.push({
      id: `${src.id}-${Buffer.from(link).toString('base64url').slice(0, 18)}`,
      title,
      summary: summary || title,
      highlights,
      url: link,
      domain: getDomain(link),
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

async function timedFetch(url: string, ms = 6500): Promise<Response> {
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), ms);
  try {
    return await fetch(url, {
      signal: ctrl.signal,
      redirect: 'follow',
      headers: {
        'User-Agent': UA,
        Accept: 'application/rss+xml, application/atom+xml, application/xml, text/xml, application/json, text/html, */*'
      }
    });
  } finally {
    clearTimeout(timer);
  }
}

async function aggregateVerifiedDiscover(): Promise<ServerStory[]> {
  if (discoverMemCache && Date.now() - discoverMemCache.at < 5 * 60_000) {
    return discoverMemCache.stories;
  }
  if (discoverInFlight) return discoverInFlight;

  discoverInFlight = (async () => {
    try {
      const rssJobs = VERIFIED_FEEDS.map(async (src) => {
        try {
          const r = await timedFetch(src.url, 6500);
          return r.ok ? parseXmlFeed(await r.text(), src) : [];
        } catch {
          return [];
        }
      });

      const spaceJob = (async (): Promise<ServerStory[]> => {
        try {
          const r = await timedFetch('https://api.spaceflightnewsapi.net/v4/articles/?limit=7', 5500);
          if (!r.ok) return [];
          const d: any = await r.json();
          return (d.results || []).map((a: any) => ({
            id: `sf-${a.id}`,
            title: String(a.title || '').trim(),
            summary: String(a.summary || '').trim(),
            highlights: [],
            url: String(a.url),
            domain: getDomain(String(a.url)),
            publisher: String(a.news_site || 'SpaceNews'),
            verified: true,
            topic: 'science' as const,
            bannerUrl: upgradeBanner(String(a.image_url || ''), String(a.url)),
            publishedAt: Date.parse(String(a.published_at || '')) || Date.now(),
            readingTimeMin: 4
          }));
        } catch {
          return [];
        }
      })();

      const devtoJob = (async (): Promise<ServerStory[]> => {
        try {
          const r = await timedFetch('https://dev.to/api/articles?top=2&per_page=7', 5500);
          if (!r.ok) return [];
          const list: any = await r.json();
          return (list || []).map((a: any) => ({
            id: `devto-${a.id}`,
            title: String(a.title || '').trim(),
            summary: String(a.description || '').trim(),
            highlights: Array.isArray(a.tag_list) ? a.tag_list.map((t: any) => `#${String(t)}`) : [],
            url: String(a.url),
            domain: 'dev.to',
            publisher: 'DEV Engineering',
            verified: true,
            topic: 'engineering' as const,
            bannerUrl: upgradeBanner(String(a.cover_image || a.social_image || ''), String(a.url)),
            publishedAt: Date.parse(String(a.published_timestamp || '')) || Date.now(),
            author: a.user?.name,
            readingTimeMin: Number(a.reading_time_minutes) || 5,
            communityPoints: Number(a.public_reactions_count) || undefined
          }));
        } catch {
          return [];
        }
      })();

      const hnJob = (async (): Promise<ServerStory[]> => {
        try {
          const r = await timedFetch('https://hn.algolia.com/api/v1/search?tags=front_page&hitsPerPage=6', 5500);
          if (!r.ok) return [];
          const d: any = await r.json();
          return (d.hits || [])
            .filter((h: any) => h.url && h.title)
            .map((h: any) => ({
              id: `hn-${h.objectID}`,
              title: String(h.title).trim(),
              summary: `Trending on Hacker News (${h.points || 0} points · ${h.num_comments || 0} comments) from ${getDomain(String(h.url))}.`,
              highlights: [`${h.points || 0} community points`, `${h.num_comments || 0} discussion comments`],
              url: String(h.url),
              domain: getDomain(String(h.url)),
              publisher: getDomain(String(h.url)),
              verified: true,
              topic: 'tech-ai' as const,
              publishedAt: h.created_at_i ? Number(h.created_at_i) * 1000 : Date.now(),
              readingTimeMin: 5,
              communityPoints: Number(h.points) || undefined
            }));
        } catch {
          return [];
        }
      })();

      const [space, devto, hn, ...rssLists] = await Promise.all([spaceJob, devtoJob, hnJob, ...rssJobs]);
      const combined = [...rssLists.flat(), ...space, ...devto, ...hn];

      const seenU = new Set<string>();
      const seenT = new Set<string>();
      const deduped: ServerStory[] = [];
      for (const s of combined) {
        const uk = s.url.replace(/\?.*$/, '').toLowerCase();
        const tk = s.title.toLowerCase().replace(/[^a-z0-9]/g, '').slice(0, 42);
        if (!tk || seenU.has(uk) || seenT.has(tk)) continue;
        seenU.add(uk);
        seenT.add(tk);
        deduped.push(s);
      }

      // Enrich missing og:image banners on the server
      const missing = deduped.filter((s) => !s.bannerUrl).slice(0, 8);
      if (missing.length > 0) {
        await Promise.allSettled(
          missing.map(async (st) => {
            try {
              const r = await timedFetch(st.url, 3800);
              if (!r.ok) return;
              const html = (await r.text()).slice(0, 55_000);
              const ogImg =
                html.match(/<meta[^>]+property=["']og:image["'][^>]+content=["']([^"']+)["']/i)?.[1] ||
                html.match(/<meta[^>]+content=["']([^"']+)["'][^>]+property=["']og:image["']/i)?.[1] ||
                html.match(/<meta[^>]+name=["']twitter:image["'][^>]+content=["']([^"']+)["']/i)?.[1];
              const ogDesc =
                html.match(/<meta[^>]+property=["']og:description["'][^>]+content=["']([^"']+)["']/i)?.[1] ||
                html.match(/<meta[^>]+name=["']description["'][^>]+content=["']([^"']+)["']/i)?.[1];
              const resolved = upgradeBanner(ogImg, st.url);
              if (resolved) st.bannerUrl = resolved;
              if (ogDesc && ogDesc.length > 45) st.summary = decodeEnt(ogDesc).trim().slice(0, 380);
            } catch {
              // ignore
            }
          })
        );
      }

      const finalStories = deduped.slice(0, 76);
      if (finalStories.length > 0) {
        discoverMemCache = { at: Date.now(), stories: finalStories };
      }
      return finalStories;
    } finally {
      discoverInFlight = null;
    }
  })();

  return discoverInFlight;
}

async function scrapeCleanArticleJson(targetUrl: string): Promise<string> {
  const hit = articleCache.get(targetUrl);
  if (hit && Date.now() - hit.at < 10 * 60_000) return hit.json;

  const parsed = new URL(targetUrl);
  if (isPrivateHost(parsed.hostname)) throw new Error('Forbidden host');
  const domain = parsed.hostname.replace(/^www\./, '');

  const res = await timedFetch(parsed.toString(), 9000);
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  const rawHtml = (await res.text()).slice(0, 1_500_000);

  const ogTitle =
    rawHtml.match(/<meta[^>]+property=["']og:title["'][^>]+content=["']([^"']+)["']/i)?.[1] ||
    rawHtml.match(/<h1[^>]*>([\s\S]*?)<\/h1>/i)?.[1]?.replace(/<[^>]+>/g, '') ||
    domain;

  const ogSite =
    rawHtml.match(/<meta[^>]+property=["']og:site_name["'][^>]+content=["']([^"']+)["']/i)?.[1] || domain;

  const ogImage = upgradeBanner(
    rawHtml.match(/<meta[^>]+property=["']og:image["'][^>]+content=["']([^"']+)["']/i)?.[1] ||
      rawHtml.match(/<meta[^>]+name=["']twitter:image["'][^>]+content=["']([^"']+)["']/i)?.[1],
    targetUrl
  );

  const author =
    rawHtml.match(/<meta[^>]+name=["']author["'][^>]+content=["']([^"']+)["']/i)?.[1] || undefined;

  let jsonLdBody = '';
  for (const m of rawHtml.matchAll(/<script[^>]+type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi)) {
    try {
      const obj = JSON.parse(m[1].trim());
      const arr = Array.isArray(obj) ? obj : obj['@graph'] || [obj];
      for (const c of arr) {
        if (c?.articleBody && String(c.articleBody).length > jsonLdBody.length) {
          jsonLdBody = decodeEnt(String(c.articleBody));
        }
      }
    } catch {
      // ignore
    }
  }

  const artMatch =
    rawHtml.match(/<article\b[\s\S]*?<\/article>/i) || rawHtml.match(/<main\b[\s\S]*?<\/main>/i);
  let chunk = artMatch ? artMatch[0] : rawHtml;

  chunk = chunk
    .replace(/<script[\s\S]*?<\/script>/gi, ' ')
    .replace(/<style[\s\S]*?<\/style>/gi, ' ')
    .replace(/<noscript[\s\S]*?<\/noscript>/gi, ' ')
    .replace(/<iframe[\s\S]*?<\/iframe>/gi, ' ')
    .replace(/<aside[\s\S]*?<\/aside>/gi, ' ')
    .replace(/<nav[\s\S]*?<\/nav>/gi, ' ')
    .replace(/<footer[\s\S]*?<\/footer>/gi, ' ')
    .replace(/<form[\s\S]*?<\/form>/gi, ' ')
    .replace(/<svg[\s\S]*?<\/svg>/gi, ' ');

  const blocks: string[] = [];
  const seen = new Set<string>();
  let wordCount = 0;

  for (const m of chunk.matchAll(/<(h2|h3|p|blockquote|figure)\b[^>]*>([\s\S]*?)<\/\1>/gi)) {
    const tag = m[1].toLowerCase();
    const inner = m[2];

    if (tag === 'figure') {
      const im = inner.match(/<img\b[^>]*?\b(?:src|data-src)=["']([^"']+)["'][^>]*?>/i);
      const resolved = upgradeBanner(im?.[1], targetUrl);
      if (!resolved || /avatar|logo|icon|pixel|1x1|sprite|badge/i.test(resolved) || seen.has(resolved)) {
        continue;
      }
      seen.add(resolved);
      const cap = decodeEnt(
        (inner.match(/<figcaption[^>]*>([\s\S]*?)<\/figcaption>/i)?.[1] || '').replace(/<[^>]+>/g, ' ')
      )
        .replace(/\s+/g, ' ')
        .trim();
      blocks.push(
        `<figure class="cove-news-fig"><img src="${escHtml(resolved)}" referrerpolicy="no-referrer" alt="${escHtml(
          cap.slice(0, 120)
        )}" loading="lazy" />${cap.length > 8 ? `<figcaption>${escHtml(cap.slice(0, 220))}</figcaption>` : ''}</figure>`
      );
      continue;
    }

    const txt = decodeEnt(inner.replace(/<[^>]+>/g, ' ')).replace(/\s+/g, ' ').trim();
    if (txt.length < 28 || seen.has(txt)) continue;
    if (/^(sign up for|subscribe to|read more:|related:|advertisement|cookie policy|all rights reserved|follow us)/i.test(txt)) {
      continue;
    }
    seen.add(txt);
    wordCount += txt.split(/\s+/).length;
    blocks.push(`<${tag}>${escHtml(txt)}</${tag}>`);
    if (blocks.length >= 95) break;
  }

  if (wordCount < 90 && jsonLdBody.length > 180) {
    const paras = jsonLdBody
      .split(/\n+/)
      .map((p) => p.trim())
      .filter((p) => p.length > 26);
    blocks.push(...paras.map((p) => `<p>${escHtml(p)}</p>`));
    wordCount = jsonLdBody.split(/\s+/).length;
  }

  const json = JSON.stringify({
    title: decodeEnt(ogTitle).trim(),
    publisher: decodeEnt(ogSite).trim(),
    domain,
    author: author ? decodeEnt(author).trim() : undefined,
    bannerUrl: ogImage,
    contentHtml: blocks.join('\n'),
    wordCount,
    readingTimeMin: Math.max(2, Math.round(wordCount / 215)),
    sourceUrl: targetUrl
  });

  articleCache.set(targetUrl, { at: Date.now(), json });
  return json;
}

function coveLocalPreviewProxy(): Plugin {
  const handler = async (req: any, res: any, next: () => void) => {
    const reqUrl: string = req.url || '';

    // 1. Binary MV3 Extension .zip Downloads
    if (reqUrl.startsWith('/downloads/cove-chrome-mv3') || reqUrl.startsWith('/downloads/cove-firefox-mv3')) {
      const isFirefox = reqUrl.includes('firefox');
      const zipName = isFirefox ? 'cove-firefox-mv3.zip' : 'cove-chrome-mv3.zip';
      const downloadFilename = isFirefox ? 'cove-firefox-mv3-v0.1.1.zip' : 'cove-chrome-mv3-v0.1.1.zip';
      const zipPath = resolve(__dirname, 'releases', zipName);

      if (existsSync(zipPath)) {
        const buf = readFileSync(zipPath);
        res.statusCode = 200;
        res.setHeader('Content-Type', 'application/zip');
        res.setHeader('Content-Disposition', `attachment; filename="${downloadFilename}"`);
        res.setHeader('Content-Length', String(buf.byteLength));
        res.setHeader('X-Content-Type-Options', 'nosniff');
        res.end(buf);
        return;
      }
    }

    // 2. High-Speed Aggregated Discover Feed API (/api/discover)
    if (reqUrl.startsWith('/api/discover')) {
      try {
        const parsed = new URL(reqUrl, 'http://localhost');
        if (parsed.searchParams.get('force') === '1') {
          discoverMemCache = null;
        }
        const stories = await aggregateVerifiedDiscover();
        res.statusCode = 200;
        res.setHeader('Content-Type', 'application/json; charset=utf-8');
        res.setHeader('Cache-Control', 'private, max-age=120');
        res.end(JSON.stringify({ at: Date.now(), stories }));
        return;
      } catch (e: any) {
        res.statusCode = 502;
        res.setHeader('Content-Type', 'application/json');
        res.end(JSON.stringify({ error: e?.message || 'Discover failed', stories: [] }));
        return;
      }
    }

    // 3. Clean Full-Article Source Scraper API (/api/article?url=...)
    if (reqUrl.startsWith('/api/article')) {
      try {
        const parsed = new URL(reqUrl, 'http://localhost');
        const target = parsed.searchParams.get('url');
        if (!target || !/^https?:\/\//i.test(target)) {
          res.statusCode = 400;
          res.setHeader('Content-Type', 'application/json');
          res.end(JSON.stringify({ error: 'Invalid URL' }));
          return;
        }
        const json = await scrapeCleanArticleJson(target);
        res.statusCode = 200;
        res.setHeader('Content-Type', 'application/json; charset=utf-8');
        res.setHeader('Cache-Control', 'private, max-age=600');
        res.end(json);
        return;
      } catch (e: any) {
        res.statusCode = 502;
        res.setHeader('Content-Type', 'application/json');
        res.end(JSON.stringify({ error: e?.message || 'Article scrape failed' }));
        return;
      }
    }

    // 4. Same-Origin Hotlink-Safe Image Proxy Fallback (/api/img?url=...)
    if (reqUrl.startsWith('/api/img')) {
      try {
        const parsed = new URL(reqUrl, 'http://localhost');
        const target = parsed.searchParams.get('url');
        if (!target || !/^https?:\/\//i.test(target)) {
          res.statusCode = 400;
          res.end('Bad URL');
          return;
        }
        const u = new URL(target);
        if (isPrivateHost(u.hostname)) {
          res.statusCode = 403;
          res.end('Forbidden');
          return;
        }
        const upstream = await timedFetch(u.toString(), 6000);
        if (!upstream.ok) {
          res.statusCode = 502;
          res.end('Image fetch failed');
          return;
        }
        const arrBuf = await upstream.arrayBuffer();
        res.statusCode = 200;
        res.setHeader('Content-Type', upstream.headers.get('content-type') || 'image/jpeg');
        res.setHeader('Cache-Control', 'public, max-age=86400');
        res.end(Buffer.from(arrBuf));
        return;
      } catch {
        res.statusCode = 502;
        res.end('Image error');
        return;
      }
    }

    // 5. Generic RSS / Read-Later Proxy (/api/cove-proxy or /__cove_proxy)
    if (!reqUrl.startsWith('/__cove_proxy')) {
      return next();
    }

    try {
      const parsed = new URL(reqUrl, 'http://localhost');
      const target = parsed.searchParams.get('url');
      if (!target || !/^https?:\/\//i.test(target)) {
        res.statusCode = 400;
        res.setHeader('Content-Type', 'application/json');
        res.end(JSON.stringify({ error: 'Invalid URL' }));
        return;
      }
      const targetUrl = new URL(target);
      if (isPrivateHost(targetUrl.hostname)) {
        res.statusCode = 403;
        res.end('Forbidden host');
        return;
      }

      const key = targetUrl.toString();
      const cached = proxyCache.get(key);
      if (cached && Date.now() - cached.at < 5 * 60_000) {
        res.statusCode = cached.status;
        res.setHeader('Content-Type', cached.contentType);
        res.setHeader('Cache-Control', 'private, max-age=300');
        res.end(cached.body);
        return;
      }

      const upstream = await timedFetch(key, 8500);
      const text = (await upstream.text()).slice(0, 1_500_000);
      const contentType = upstream.headers.get('content-type') || 'text/plain; charset=utf-8';

      if (upstream.ok) {
        if (proxyCache.size > 200) {
          const oldest = proxyCache.keys().next().value;
          if (oldest) proxyCache.delete(oldest);
        }
        proxyCache.set(key, { at: Date.now(), status: upstream.status, contentType, body: text });
      }

      res.statusCode = upstream.status;
      res.setHeader('Content-Type', contentType);
      res.setHeader('Cache-Control', 'private, max-age=300');
      res.end(text);
    } catch (err: any) {
      res.statusCode = 502;
      res.setHeader('Content-Type', 'application/json');
      res.end(JSON.stringify({ error: err?.message || 'Fetch failed' }));
    }
  };

  const prewarmAll = () => {
    aggregateVerifiedDiscover()
      .then((stories) => {
        stories.slice(0, 4).forEach((s) => {
          scrapeCleanArticleJson(s.url).catch(() => {});
        });
      })
      .catch(() => {});
  };

  return {
    name: 'cove-local-preview-proxy',
    configureServer(server) {
      server.middlewares.use(handler);
      prewarmAll();
    },
    configurePreviewServer(server) {
      server.middlewares.use(handler);
      prewarmAll();
    }
  };
}

export default defineConfig({
  plugins: [tailwindcss(), svelte(), coveLocalPreviewProxy()],
  server: {
    host: '0.0.0.0',
    port: 5173,
    allowedHosts: true
  },
  preview: {
    host: '0.0.0.0',
    port: 4173,
    allowedHosts: true
  },
  build: {
    target: 'es2022',
    minify: 'terser',
    terserOptions: {
      compress: { inline: false }
    },
    outDir: 'dist',
    emptyOutDir: true,
    rollupOptions: {
      input: {
        newtab: resolve(__dirname, 'index.html'),
        blocked: resolve(__dirname, 'blocked.html'),
        background: resolve(__dirname, 'src/background/index.ts')
      },
      output: {
        entryFileNames: (chunkInfo) => {
          if (chunkInfo.name === 'background') return 'background.js';
          return 'assets/[name]-[hash].js';
        },
        chunkFileNames: 'assets/[name]-[hash].js',
        assetFileNames: 'assets/[name]-[hash][extname]'
      }
    }
  }
});
