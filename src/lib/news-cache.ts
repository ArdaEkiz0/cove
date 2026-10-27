import type { DiscoverFullArticle, DiscoverStory } from './discover';

const NEWS_DB_NAME = 'cove_news_cache_v1';
const NEWS_DB_VERSION = 1;
const STORE_FEED = 'feed_cache';
const STORE_ARTICLES = 'article_cache';
const MAX_CACHED_ARTICLES = 120;

interface StoredArticleEntry {
  urlKey: string;
  cachedAt: number;
  article: DiscoverFullArticle;
}

const memArticles = new Map<string, DiscoverFullArticle>();
let dbPromise: Promise<IDBDatabase> | null = null;

export function normalizeStoryKey(rawUrl: string): string {
  return rawUrl.trim().replace(/#.*$/, '');
}

function openNewsCacheDb(): Promise<IDBDatabase> {
  if (typeof indexedDB === 'undefined') {
    return Promise.reject(new Error('IndexedDB unavailable'));
  }
  if (dbPromise) return dbPromise;

  dbPromise = new Promise((resolve, reject) => {
    const req = indexedDB.open(NEWS_DB_NAME, NEWS_DB_VERSION);
    req.onupgradeneeded = () => {
      const db = req.result;
      if (!db.objectStoreNames.contains(STORE_FEED)) {
        db.createObjectStore(STORE_FEED);
      }
      if (!db.objectStoreNames.contains(STORE_ARTICLES)) {
        const artStore = db.createObjectStore(STORE_ARTICLES, { keyPath: 'urlKey' });
        artStore.createIndex('cachedAt', 'cachedAt', { unique: false });
      }
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => {
      dbPromise = null;
      reject(req.error);
    };
  });

  return dbPromise;
}

export async function loadCachedDiscoverFeed(): Promise<{
  fetchedAt: number;
  stories: DiscoverStory[];
} | null> {
  try {
    const db = await openNewsCacheDb();
    return await new Promise((resolve) => {
      const tx = db.transaction(STORE_FEED, 'readonly');
      const req = tx.objectStore(STORE_FEED).get('primary_feed');
      req.onsuccess = () => {
        const res = req.result as { fetchedAt: number; stories: DiscoverStory[] } | undefined;
        if (res && Array.isArray(res.stories) && res.stories.length > 0) {
          resolve(res);
        } else {
          resolve(null);
        }
      };
      req.onerror = () => resolve(null);
    });
  } catch {
    return null;
  }
}

export async function saveCachedDiscoverFeed(
  stories: DiscoverStory[],
  fetchedAt = Date.now()
): Promise<void> {
  try {
    const plainStories: DiscoverStory[] = JSON.parse(
      JSON.stringify(
        stories.slice(0, 90).map((s) => ({
          ...s,
          // Keep feed list fast; fullFeedHtml > 25 KB is only needed during extraction
          fullFeedHtml: s.fullFeedHtml && s.fullFeedHtml.length < 25_000 ? s.fullFeedHtml : undefined
        }))
      )
    );
    const db = await openNewsCacheDb();
    await new Promise<void>((resolve) => {
      const tx = db.transaction(STORE_FEED, 'readwrite');
      tx.objectStore(STORE_FEED).put({ fetchedAt, stories: plainStories }, 'primary_feed');
      tx.oncomplete = () => resolve();
      tx.onerror = () => resolve();
    });
  } catch {
    // ignore quota/private mode errors
  }
}

export function getMemoryCachedArticle(url: string): DiscoverFullArticle | undefined {
  return memArticles.get(normalizeStoryKey(url));
}

export async function getCachedFullArticle(url: string): Promise<DiscoverFullArticle | null> {
  const key = normalizeStoryKey(url);
  const memHit = memArticles.get(key);
  if (memHit) return memHit;

  try {
    const db = await openNewsCacheDb();
    return await new Promise((resolve) => {
      const tx = db.transaction(STORE_ARTICLES, 'readonly');
      const req = tx.objectStore(STORE_ARTICLES).get(key);
      req.onsuccess = () => {
        const entry = req.result as StoredArticleEntry | undefined;
        if (entry?.article?.contentHtml) {
          memArticles.set(key, entry.article);
          resolve(entry.article);
        } else {
          resolve(null);
        }
      };
      req.onerror = () => resolve(null);
    });
  } catch {
    return null;
  }
}

export async function saveCachedFullArticle(
  url: string,
  article: DiscoverFullArticle
): Promise<void> {
  const key = normalizeStoryKey(url);
  const plain: DiscoverFullArticle = JSON.parse(JSON.stringify(article));
  memArticles.set(key, plain);

  try {
    const db = await openNewsCacheDb();
    await new Promise<void>((resolve) => {
      const tx = db.transaction(STORE_ARTICLES, 'readwrite');
      const store = tx.objectStore(STORE_ARTICLES);
      store.put({ urlKey: key, cachedAt: Date.now(), article: plain } satisfies StoredArticleEntry);

      // Prune oldest articles if over MAX_CACHED_ARTICLES
      const countReq = store.count();
      countReq.onsuccess = () => {
        const excess = countReq.result - MAX_CACHED_ARTICLES;
        if (excess > 0) {
          const idx = store.index('cachedAt');
          let removed = 0;
          idx.openCursor().onsuccess = (ev) => {
            const cursor = (ev.target as IDBRequest<IDBCursorWithValue | null>).result;
            if (cursor && removed < excess) {
              cursor.delete();
              removed += 1;
              cursor.continue();
            }
          };
        }
      };

      tx.oncomplete = () => resolve();
      tx.onerror = () => resolve();
    });
  } catch {
    // ignore
  }
}

export async function listCachedArticleKeys(): Promise<string[]> {
  try {
    const db = await openNewsCacheDb();
    return await new Promise((resolve) => {
      const tx = db.transaction(STORE_ARTICLES, 'readonly');
      const req = tx.objectStore(STORE_ARTICLES).getAllKeys();
      req.onsuccess = () => {
        const keys = (req.result as string[]) || [];
        resolve(keys);
      };
      req.onerror = () => resolve(Array.from(memArticles.keys()));
    });
  } catch {
    return Array.from(memArticles.keys());
  }
}

export async function clearAllNewsCache(): Promise<void> {
  memArticles.clear();
  try {
    const db = await openNewsCacheDb();
    await new Promise<void>((resolve) => {
      const tx = db.transaction([STORE_FEED, STORE_ARTICLES], 'readwrite');
      tx.objectStore(STORE_FEED).clear();
      tx.objectStore(STORE_ARTICLES).clear();
      tx.oncomplete = () => resolve();
      tx.onerror = () => resolve();
    });
  } catch {
    // ignore
  }
}
