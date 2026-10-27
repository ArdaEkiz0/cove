import { extractDomain } from './triage-core';
import type { ReadLaterItem, TabSession } from '../lib/types';

const MENU_READ_LATER_ID = 'cove-save-read-later';
const AUTO_SNAPSHOT_ALARM = 'cove-auto-snapshot';

async function getLocal<T>(key: string, fallback: T): Promise<T> {
  const res = await chrome.storage.local.get(key);
  return (res?.[key] as T) ?? fallback;
}

async function setLocal<T>(key: string, val: T): Promise<void> {
  await chrome.storage.local.set({ [key]: val });
}

async function recordTabActivity(tabId: number): Promise<void> {
  const map = await getLocal<Record<string, number>>('tab_last_active', {});
  map[String(tabId)] = Date.now();
  // Prune old entries beyond 300 keys
  const keys = Object.keys(map);
  if (keys.length > 300) {
    keys
      .sort((a, b) => map[a] - map[b])
      .slice(0, keys.length - 250)
      .forEach((k) => delete map[k]);
  }
  await setLocal('tab_last_active', map);
}

async function snapshotWindowSession(name: string, isAuto = false): Promise<void> {
  const tabs = await chrome.tabs.query({ currentWindow: true });
  const cleanTabs = tabs
    .filter((t) => t.url && /^https?:\/\//i.test(t.url))
    .map((t) => ({
      url: t.url!,
      title: t.title || extractDomain(t.url!),
      domain: extractDomain(t.url!),
      pinned: Boolean(t.pinned)
    }));

  if (!cleanTabs.length) return;

  const sessions = await getLocal<TabSession[]>('sessions', []);
  const newSession: TabSession = {
    id: isAuto ? 'sess-auto-latest' : `sess-${Date.now()}`,
    name,
    createdAt: Date.now(),
    context: 'both',
    isAutoSnapshot: isAuto,
    tabs: cleanTabs
  };

  const filtered = isAuto ? sessions.filter((s) => !s.isAutoSnapshot) : sessions;
  await setLocal('sessions', [newSession, ...filtered]);
}

async function queueReadLaterItem(url: string, title?: string): Promise<void> {
  if (!url || !/^https?:\/\//i.test(url)) return;
  const pending = await getLocal<ReadLaterItem[]>('pending_read_later', []);
  const domain = extractDomain(url);
  const item: ReadLaterItem = {
    id: `rl-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
    url,
    title: title || domain,
    domain,
    addedAt: Date.now()
  };
  await setLocal('pending_read_later', [item, ...pending]);
}

async function applyBlockerRules(domains: string[], active: boolean): Promise<void> {
  if (!chrome.declarativeNetRequest) return;
  const existing = await chrome.declarativeNetRequest.getDynamicRules();
  const removeRuleIds = existing.map((r) => r.id);

  if (!active || !domains.length) {
    if (removeRuleIds.length) {
      await chrome.declarativeNetRequest.updateDynamicRules({ removeRuleIds });
    }
    return;
  }

  const addRules: chrome.declarativeNetRequest.Rule[] = domains
    .map((d) => d.trim().toLowerCase().replace(/^https?:\/\//, '').replace(/\/.*$/, ''))
    .filter(Boolean)
    .slice(0, 50)
    .map((domain, idx) => ({
      id: 1000 + idx,
      priority: 1,
      action: {
        type: chrome.declarativeNetRequest.RuleActionType.REDIRECT,
        redirect: {
          extensionPath: `/blocked.html?domain=${encodeURIComponent(domain)}`
        }
      },
      condition: {
        urlFilter: `||${domain}^`,
        resourceTypes: [chrome.declarativeNetRequest.ResourceType.MAIN_FRAME]
      }
    }));

  await chrome.declarativeNetRequest.updateDynamicRules({
    removeRuleIds,
    addRules
  });
}

chrome.runtime.onInstalled.addListener(() => {
  chrome.contextMenus.removeAll(() => {
    chrome.contextMenus.create({
      id: MENU_READ_LATER_ID,
      title: 'Save to Cove Read Later',
      contexts: ['page', 'link']
    });
  });

  chrome.alarms.create(AUTO_SNAPSHOT_ALARM, { periodInMinutes: 15 });
});

chrome.contextMenus.onClicked.addListener((info, tab) => {
  if (info.menuItemId === MENU_READ_LATER_ID) {
    const targetUrl = info.linkUrl || info.pageUrl || tab?.url || '';
    const title = info.selectionText || tab?.title || extractDomain(targetUrl);
    queueReadLaterItem(targetUrl, title).catch(() => {});
  }
});

chrome.commands.onCommand.addListener(async (command) => {
  if (command === 'save-session') {
    const stamp = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    await snapshotWindowSession(`Saved Session (${stamp})`, false);
  } else if (command === 'read-later') {
    const [activeTab] = await chrome.tabs.query({ active: true, currentWindow: true });
    if (activeTab?.url) {
      await queueReadLaterItem(activeTab.url, activeTab.title);
    }
  }
});

chrome.tabs.onActivated.addListener(({ tabId }) => {
  recordTabActivity(tabId).catch(() => {});
});

chrome.tabs.onUpdated.addListener((tabId, changeInfo) => {
  if (changeInfo.status === 'complete') {
    recordTabActivity(tabId).catch(() => {});
  }
});

chrome.alarms.onAlarm.addListener(async (alarm) => {
  if (alarm.name === AUTO_SNAPSHOT_ALARM) {
    const settings = await getLocal<any>('settings', null);
    if (settings?.autoSnapshotSessions !== false) {
      await snapshotWindowSession('Last Browser State (Auto)', true);
    }
  } else if (alarm.name === 'cove-resume-blocker') {
    const lastState = await getLocal<{ domains: string[]; active: boolean }>('blocker_state', {
      domains: [],
      active: false
    });
    if (lastState.active) {
      await applyBlockerRules(lastState.domains, true);
    }
  }
});

chrome.runtime.onMessage.addListener((msg, _sender, sendResponse) => {
  if (msg?.type === 'SYNC_BLOCKER_RULES') {
    setLocal('blocker_state', { domains: msg.domains || [], active: Boolean(msg.active) })
      .then(() => applyBlockerRules(msg.domains || [], Boolean(msg.active)))
      .then(() => sendResponse({ ok: true }))
      .catch((err) => sendResponse({ ok: false, error: String(err) }));
    return true;
  }

  if (msg?.type === 'PAUSE_BLOCKER_5MIN') {
    applyBlockerRules([], false)
      .then(() => {
        chrome.alarms.create('cove-resume-blocker', { delayInMinutes: 5 });
        sendResponse({ ok: true });
      })
      .catch(() => sendResponse({ ok: false }));
    return true;
  }
  return false;
});
