import type { ReadLaterItem } from './types';

export function isExtensionContext(): boolean {
  return (
    typeof chrome !== 'undefined' &&
    Boolean(chrome?.runtime?.id) &&
    Boolean(chrome?.storage?.local)
  );
}

/**
 * Unified local key-value storage:
 * - Uses chrome.storage.local when running as an unpacked/installed MV3 extension
 * - Falls back to localStorage in web preview mode
 */
export async function storageGet<T>(key: string, fallback: T): Promise<T> {
  if (isExtensionContext()) {
    try {
      const result = await chrome.storage.local.get(key);
      if (result && key in result && result[key] !== undefined) {
        return result[key] as T;
      }
      return fallback;
    } catch {
      return fallback;
    }
  }

  try {
    const raw = localStorage.getItem(`cove:${key}`);
    if (!raw) return fallback;
    return JSON.parse(raw) as T;
  } catch {
    return fallback;
  }
}

export async function storageSet<T>(key: string, value: T): Promise<void> {
  // Svelte 5 state proxies serialize cleanly via JSON clone
  const plain = JSON.parse(JSON.stringify(value));
  if (isExtensionContext()) {
    try {
      await chrome.storage.local.set({ [key]: plain });
      return;
    } catch {
      // Fallback below
    }
  }
  try {
    localStorage.setItem(`cove:${key}`, JSON.stringify(plain));
  } catch {
    // Quota guard
  }
}

export async function storageClearAll(): Promise<void> {
  if (isExtensionContext()) {
    try {
      await chrome.storage.local.clear();
    } catch {
      // ignore
    }
  }
  const toRemove: string[] = [];
  for (let i = 0; i < localStorage.length; i++) {
    const k = localStorage.key(i);
    if (k && (k.startsWith('cove:') || k === 'cove_fast_boot')) {
      toRemove.push(k);
    }
  }
  toRemove.forEach((k) => localStorage.removeItem(k));
  await idbClearReadLater();
}

/* ============================================================================
 * IndexedDB Storage for Read Later Queue & Large Local Wallpaper Blobs (PRD 3.6)
 * ========================================================================== */

const DB_NAME = 'cove_local_db';
const DB_VERSION = 1;
const STORE_READ_LATER = 'read_later';
const STORE_BLOBS = 'blobs';

function openCoveDb(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, DB_VERSION);
    req.onupgradeneeded = () => {
      const db = req.result;
      if (!db.objectStoreNames.contains(STORE_READ_LATER)) {
        db.createObjectStore(STORE_READ_LATER, { keyPath: 'id' });
      }
      if (!db.objectStoreNames.contains(STORE_BLOBS)) {
        db.createObjectStore(STORE_BLOBS);
      }
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

export async function idbGetReadLater(fallback: ReadLaterItem[]): Promise<ReadLaterItem[]> {
  try {
    const db = await openCoveDb();
    return await new Promise<ReadLaterItem[]>((resolve, reject) => {
      const tx = db.transaction(STORE_READ_LATER, 'readonly');
      const store = tx.objectStore(STORE_READ_LATER);
      const req = store.getAll();
      req.onsuccess = () => {
        const items = (req.result as ReadLaterItem[]) || [];
        if (items.length === 0) {
          // Check if initialized before
          const initialized = localStorage.getItem('cove:rl_initialized');
          if (!initialized) {
            localStorage.setItem('cove:rl_initialized', '1');
            idbSaveAllReadLater(fallback).catch(() => {});
            resolve(fallback);
            return;
          }
        }
        items.sort((a, b) => b.addedAt - a.addedAt);
        resolve(items);
      };
      req.onerror = () => reject(req.error);
    });
  } catch {
    return fallback;
  }
}

export async function idbSaveAllReadLater(items: ReadLaterItem[]): Promise<void> {
  try {
    const plain: ReadLaterItem[] = JSON.parse(JSON.stringify(items));
    localStorage.setItem('cove:rl_initialized', '1');
    const db = await openCoveDb();
    await new Promise<void>((resolve, reject) => {
      const tx = db.transaction(STORE_READ_LATER, 'readwrite');
      const store = tx.objectStore(STORE_READ_LATER);
      store.clear();
      for (const item of plain) {
        store.put(item);
      }
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
    });
  } catch {
    // Ignore IDB unavailable
  }
}

export async function idbClearReadLater(): Promise<void> {
  try {
    localStorage.removeItem('cove:rl_initialized');
    const db = await openCoveDb();
    await new Promise<void>((resolve) => {
      const tx = db.transaction([STORE_READ_LATER, STORE_BLOBS], 'readwrite');
      tx.objectStore(STORE_READ_LATER).clear();
      tx.objectStore(STORE_BLOBS).clear();
      tx.oncomplete = () => resolve();
      tx.onerror = () => resolve();
    });
  } catch {
    // Ignore
  }
}

export async function idbSetBlob(key: string, dataUrl: string): Promise<void> {
  try {
    const db = await openCoveDb();
    await new Promise<void>((resolve, reject) => {
      const tx = db.transaction(STORE_BLOBS, 'readwrite');
      tx.objectStore(STORE_BLOBS).put(dataUrl, key);
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
    });
  } catch {
    // Ignore
  }
}

export async function idbGetBlob(key: string): Promise<string | undefined> {
  try {
    const db = await openCoveDb();
    return await new Promise<string | undefined>((resolve) => {
      const tx = db.transaction(STORE_BLOBS, 'readonly');
      const req = tx.objectStore(STORE_BLOBS).get(key);
      req.onsuccess = () => resolve(req.result as string | undefined);
      req.onerror = () => resolve(undefined);
    });
  } catch {
    return undefined;
  }
}
