import { extractDomain, estimateTabRamMb, parseTabUnreadCount } from '../background/triage-core';
import { isExtensionContext, storageGet, storageSet } from './storage';
import type { BrowserTabItem, TabSession } from './types';

/**
 * Generates a crisp local SVG letter monogram icon as terminal offline fallback.
 */
export function getLocalMonogramDataUri(title: string, domain: string): string {
  const letter = (title?.trim()?.[0] || domain?.[0] || 'C').toUpperCase();
  let hash = 0;
  for (let i = 0; i < domain.length; i++) {
    hash = domain.charCodeAt(i) + ((hash << 5) - hash);
  }
  const hues = [182, 198, 162, 215, 245, 38, 145];
  const hue = hues[Math.abs(hash) % hues.length];
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 36 36"><rect width="36" height="36" rx="9" fill="hsl(${hue}, 26%, 26%)"/><text x="18" y="23.5" text-anchor="middle" font-family="-apple-system,BlinkMacSystemFont,sans-serif" font-size="16" font-weight="600" fill="hsl(${hue}, 48%, 82%)">${letter.replace(/[<>&"]/g, '')}</text></svg>`;
  return `data:image/svg+xml;utf8,${encodeURIComponent(svg)}`;
}

export function resolveSiteIcon(url: string, title: string, customIcon?: string): string {
  if (customIcon) return customIcon;
  const domain = extractDomain(url);
  if (isExtensionContext() && chrome?.runtime?.getURL) {
    const iconUrl = new URL(chrome.runtime.getURL('/_favicon/'));
    iconUrl.searchParams.set('pageUrl', url);
    iconUrl.searchParams.set('size', '32');
    return iconUrl.toString();
  }
  return getLocalMonogramDataUri(title, domain);
}

/* ============================================================================
 * Zero-Mock Real Workspace & Cross-Tab Presence Engine
 * - In Chrome / Firefox MV3 Extension: Live `chrome.tabs` & `chrome.windows`
 * - In Standalone Web Mode: Live `BroadcastChannel` presence across open Cove
 *   tabs + real user-launched workspace URLs (zero fake pre-populated tabs).
 * ========================================================================== */

const WORKSPACE_TABS_KEY = 'cove_real_workspace_tabs';

interface LivePeerPresence {
  peerId: number;
  title: string;
  url: string;
  lastSeen: number;
  ramMb: number;
}

const selfPeerId = Math.floor(10000 + Math.random() * 89000);
const livePeers = new Map<number, LivePeerPresence>();
let presenceChannel: BroadcastChannel | null = null;

function readRealTabHeapMb(): number {
  const perfMem = (performance as any)?.memory;
  if (perfMem?.usedJSHeapSize) {
    return Math.max(24, Math.round(perfMem.usedJSHeapSize / (1024 * 1024)));
  }
  return 48;
}

export function initLiveCrossTabPresence(onPeerChange: () => void): void {
  if (isExtensionContext() || typeof BroadcastChannel === 'undefined' || presenceChannel) return;

  try {
    presenceChannel = new BroadcastChannel('cove_live_workspace_v4');
    const announceSelf = () => {
      presenceChannel?.postMessage({
        type: 'HEARTBEAT',
        peerId: selfPeerId,
        title: document.title || 'New Tab — Cove',
        url: window.location.href,
        lastSeen: Date.now(),
        ramMb: readRealTabHeapMb()
      });
    };

    presenceChannel.onmessage = (ev) => {
      const msg = ev.data;
      if (msg?.type === 'HEARTBEAT' && msg.peerId && msg.peerId !== selfPeerId) {
        const isNew = !livePeers.has(msg.peerId);
        livePeers.set(msg.peerId, {
          peerId: msg.peerId,
          title: msg.title,
          url: msg.url,
          lastSeen: msg.lastSeen,
          ramMb: msg.ramMb || 48
        });
        if (isNew) onPeerChange();
      } else if (msg?.type === 'GOODBYE' && msg.peerId) {
        livePeers.delete(msg.peerId);
        onPeerChange();
      } else if (msg?.type === 'WORKSPACE_UPDATED') {
        onPeerChange();
      }
    };

    announceSelf();
    window.setInterval(() => {
      announceSelf();
      // Prune closed peers > 15s
      const cutoff = Date.now() - 15_000;
      for (const [id, p] of livePeers.entries()) {
        if (p.lastSeen < cutoff) livePeers.delete(id);
      }
    }, 5000);

    window.addEventListener('beforeunload', () => {
      presenceChannel?.postMessage({ type: 'GOODBYE', peerId: selfPeerId });
    });
  } catch {
    presenceChannel = null;
  }
}

export function notifyWorkspacePeersUpdated(): void {
  presenceChannel?.postMessage({ type: 'WORKSPACE_UPDATED' });
}

export async function recordLaunchedWorkspaceUrl(rawUrl: string, customTitle?: string): Promise<BrowserTabItem> {
  const url = /^https?:\/\//i.test(rawUrl.trim()) ? rawUrl.trim() : `https://${rawUrl.trim()}`;
  const domain = extractDomain(url);
  const saved = await storageGet<BrowserTabItem[]>(WORKSPACE_TABS_KEY, []);
  const id = Date.now() % 1_000_000_000;
  const title = customTitle?.trim() || domain;

  const entry: BrowserTabItem = {
    id,
    windowId: 1,
    title,
    url,
    domain,
    active: false,
    pinned: false,
    audible: false,
    muted: false,
    discarded: false,
    lastAccessed: Date.now(),
    estimatedRamMb: estimateTabRamMb(domain, false, false, id),
    unreadCount: parseTabUnreadCount(title, domain),
    source: 'launched'
  };

  await storageSet(WORKSPACE_TABS_KEY, [entry, ...saved].slice(0, 80));
  notifyWorkspacePeersUpdated();
  return entry;
}

export async function updateLaunchedTabTitle(id: number, realTitle: string): Promise<void> {
  const saved = await storageGet<BrowserTabItem[]>(WORKSPACE_TABS_KEY, []);
  const next = saved.map((t) =>
    t.id === id
      ? {
          ...t,
          title: realTitle,
          unreadCount: parseTabUnreadCount(realTitle, t.domain)
        }
      : t
  );
  await storageSet(WORKSPACE_TABS_KEY, next);
  notifyWorkspacePeersUpdated();
}

export async function queryBrowserTabs(): Promise<BrowserTabItem[]> {
  if (isExtensionContext() && chrome?.tabs?.query) {
    const [rawTabs, activeMap] = await Promise.all([
      chrome.tabs.query({}),
      storageGet<Record<string, number>>('tab_last_active', {})
    ]);
    const now = Date.now();
    return rawTabs
      .filter((t) => t.id !== undefined && !t.url?.startsWith('chrome-extension://'))
      .map((t) => {
        const url = t.url || t.pendingUrl || 'chrome://newtab';
        const domain = extractDomain(url);
        const id = t.id!;
        const lastAccessed =
          (t as any).lastAccessed ||
          activeMap[String(id)] ||
          (t.active ? now : now - 45 * 60_000);
        const audible = Boolean(t.audible);
        const muted = Boolean(t.mutedInfo?.muted);
        const discarded = Boolean(t.discarded);
        const title = t.title || domain;
        return {
          id,
          windowId: t.windowId,
          title,
          url,
          domain,
          favIconUrl: t.favIconUrl,
          active: Boolean(t.active),
          pinned: Boolean(t.pinned),
          audible,
          muted,
          discarded,
          lastAccessed,
          estimatedRamMb: estimateTabRamMb(domain, audible, discarded, id),
          unreadCount: parseTabUnreadCount(title, domain),
          source: 'extension'
        };
      });
  }

  // Standalone Web Mode: Real Launched Workspace Items + Live Open Cove Peers (zero fake mocks)
  const saved = await storageGet<BrowserTabItem[]>(WORKSPACE_TABS_KEY, []);
  const peerItems: BrowserTabItem[] = [...livePeers.values()].map((p) => ({
    id: p.peerId,
    windowId: 1,
    title: p.title,
    url: p.url,
    domain: extractDomain(p.url) || 'localhost',
    active: false,
    pinned: false,
    audible: false,
    muted: false,
    discarded: false,
    lastAccessed: p.lastSeen,
    estimatedRamMb: p.ramMb,
    unreadCount: 0,
    source: 'live-tab'
  }));

  return [...peerItems, ...saved];
}

export async function focusBrowserTab(tab: BrowserTabItem): Promise<string> {
  if (isExtensionContext() && chrome?.tabs?.update) {
    await chrome.tabs.update(tab.id, { active: true });
    if (chrome.windows?.update) {
      await chrome.windows.update(tab.windowId, { focused: true });
    }
    return `Switched to "${tab.title}"`;
  }
  const saved = await storageGet<BrowserTabItem[]>(WORKSPACE_TABS_KEY, []);
  const updated = saved.map((t) =>
    t.id === tab.id ? { ...t, active: true, discarded: false, lastAccessed: Date.now() } : { ...t, active: false }
  );
  await storageSet(WORKSPACE_TABS_KEY, updated);
  notifyWorkspacePeersUpdated();
  window.open(tab.url, '_blank', 'noopener,noreferrer');
  return `Opened "${tab.title}"`;
}

export async function closeBrowserTabs(tabIds: number[]): Promise<number> {
  if (!tabIds.length) return 0;
  if (isExtensionContext() && chrome?.tabs?.remove) {
    await chrome.tabs.remove(tabIds);
    return tabIds.length;
  }
  const idSet = new Set(tabIds);
  const saved = await storageGet<BrowserTabItem[]>(WORKSPACE_TABS_KEY, []);
  const remaining = saved.filter((t) => !idSet.has(t.id));
  await storageSet(WORKSPACE_TABS_KEY, remaining);
  notifyWorkspacePeersUpdated();
  return saved.length - remaining.length;
}

export async function suspendBrowserTabs(tabIds: number[]): Promise<{ count: number; savedMb: number }> {
  if (!tabIds.length) return { count: 0, savedMb: 0 };
  const current = await queryBrowserTabs();
  const idSet = new Set(tabIds);
  let savedMb = 0;
  for (const t of current) {
    if (idSet.has(t.id) && !t.discarded) {
      savedMb += Math.max(0, t.estimatedRamMb - 12);
    }
  }

  if (isExtensionContext() && chrome?.tabs?.discard) {
    let discardedCount = 0;
    for (const id of tabIds) {
      try {
        await chrome.tabs.discard(id);
        discardedCount++;
      } catch {
        // Active or non-discardable tab
      }
    }
    return { count: discardedCount, savedMb };
  }

  const saved = await storageGet<BrowserTabItem[]>(WORKSPACE_TABS_KEY, []);
  const updated = saved.map((t) =>
    idSet.has(t.id) ? { ...t, discarded: true, audible: false, estimatedRamMb: 12 } : t
  );
  await storageSet(WORKSPACE_TABS_KEY, updated);
  notifyWorkspacePeersUpdated();
  return { count: tabIds.length, savedMb };
}

export async function setBrowserTabsMuted(tabIds: number[], muted: boolean): Promise<void> {
  if (!tabIds.length) return;
  if (isExtensionContext() && chrome?.tabs?.update) {
    await Promise.all(tabIds.map((id) => chrome.tabs.update(id, { muted })));
    return;
  }
  const idSet = new Set(tabIds);
  const saved = await storageGet<BrowserTabItem[]>(WORKSPACE_TABS_KEY, []);
  const updated = saved.map((t) => (idSet.has(t.id) ? { ...t, muted } : t));
  await storageSet(WORKSPACE_TABS_KEY, updated);
  notifyWorkspacePeersUpdated();
}

export async function groupTabsByDomain(): Promise<number> {
  const tabs = await queryBrowserTabs();
  const domainMap = new Map<string, BrowserTabItem[]>();
  for (const tab of tabs) {
    if (tab.pinned || tab.domain === 'newtab' || tab.domain === 'local') continue;
    const list = domainMap.get(tab.domain) || [];
    list.push(tab);
    domainMap.set(tab.domain, list);
  }

  let groupCount = 0;
  if (isExtensionContext() && chrome?.tabs?.group) {
    for (const [domain, list] of domainMap.entries()) {
      if (list.length < 2) continue;
      try {
        const groupId = await chrome.tabs.group({ tabIds: list.map((t) => t.id) });
        if (chrome.tabGroups?.update) {
          await chrome.tabGroups.update(groupId, { title: domain.split('.')[0], color: 'cyan' });
        }
        groupCount++;
      } catch {
        // Ignore cross-window grouping error
      }
    }
    return groupCount;
  }

  const saved = await storageGet<BrowserTabItem[]>(WORKSPACE_TABS_KEY, []);
  const updated = saved.map((t) => {
    const list = domainMap.get(t.domain);
    if (list && list.length >= 2) {
      return { ...t, groupTitle: t.domain.split('.')[0] };
    }
    return t;
  });
  for (const list of domainMap.values()) {
    if (list.length >= 2) groupCount++;
  }
  await storageSet(WORKSPACE_TABS_KEY, updated);
  notifyWorkspacePeersUpdated();
  return groupCount;
}

export async function restoreTabSessionInBrowser(session: TabSession): Promise<string> {
  if (!session.tabs.length) return 'Session has no tabs.';
  if (isExtensionContext() && chrome?.windows?.create) {
    const urls = session.tabs.map((t) => t.url);
    await chrome.windows.create({ url: urls, focused: true });
    return `Restored "${session.name}" (${urls.length} tabs) in a new window.`;
  }

  // In standalone web mode, launch tabs and record them in real workspace stream
  const saved = await storageGet<BrowserTabItem[]>(WORKSPACE_TABS_KEY, []);
  let nextId = Date.now() % 1_000_000_000;
  const restored: BrowserTabItem[] = session.tabs.map((st) => ({
    id: nextId++,
    windowId: 1,
    title: st.title,
    url: st.url,
    domain: st.domain || extractDomain(st.url),
    active: false,
    pinned: Boolean(st.pinned),
    audible: false,
    muted: false,
    discarded: false,
    lastAccessed: Date.now(),
    estimatedRamMb: estimateTabRamMb(st.domain || '', false, false, nextId),
    unreadCount: 0,
    groupTitle: st.groupName || session.name,
    source: 'launched'
  }));
  await storageSet(WORKSPACE_TABS_KEY, [...restored, ...saved].slice(0, 80));
  notifyWorkspacePeersUpdated();
  if (session.tabs[0]?.url) {
    window.open(session.tabs[0].url, '_blank', 'noopener,noreferrer');
  }
  return `Restored "${session.name}" (${restored.length} tabs).`;
}

export async function syncFocusBlocker(domains: string[], active: boolean): Promise<void> {
  if (isExtensionContext() && chrome?.runtime?.sendMessage) {
    try {
      await chrome.runtime.sendMessage({
        type: 'SYNC_BLOCKER_RULES',
        domains,
        active
      });
    } catch {
      // SW waking up
    }
  }
}

export async function fetchOptInText(url: string): Promise<string> {
  if (isExtensionContext()) {
    const res = await fetch(url);
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    return await res.text();
  }

  try {
    const direct = await fetch(url, { mode: 'cors' });
    if (direct.ok) return await direct.text();
  } catch {
    // Expected CORS block on external sites in standalone web mode
  }

  const proxied = await fetch(`/__cove_proxy?url=${encodeURIComponent(url)}`);
  if (!proxied.ok) throw new Error(`HTTP ${proxied.status}`);
  return await proxied.text();
}
