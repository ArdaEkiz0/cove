import type { BrowserTabItem, TabTriageSummary } from '../lib/types';

export function extractDomain(rawUrl: string): string {
  try {
    const u = new URL(rawUrl);
    return u.hostname.replace(/^www\./, '') || u.protocol.replace(':', '');
  } catch {
    return 'local';
  }
}

/**
 * Extracts unread notification count from tab title without scraping page content.
 * Matches patterns like "(3) Inbox - Gmail", "(12) Discord", "[2] Slack", "• GitHub".
 */
export function parseTabUnreadCount(title: string, domain: string): number {
  if (!title) return 0;
  const parenMatch = title.match(/^\((\d{1,4})\+?\)[\s-]/);
  if (parenMatch) return parseInt(parenMatch[1], 10);

  const bracketMatch = title.match(/^\[(\d{1,4})\+?\]\s/);
  if (bracketMatch) return parseInt(bracketMatch[1], 10);

  const trailingParen = title.match(/\s\((\d{1,3})\)$/);
  if (
    trailingParen &&
    (domain.includes('slack.com') ||
      domain.includes('discord.com') ||
      domain.includes('mail.google.com') ||
      domain.includes('github.com') ||
      domain.includes('x.com') ||
      domain.includes('twitter.com'))
  ) {
    return parseInt(trailingParen[1], 10);
  }

  if (/^[•●]\s/.test(title)) return 1;
  return 0;
}

/**
 * Estimates per-tab memory footprint in MB when running in standard Chrome MV3
 * (since chrome.processes is Dev-channel only, we combine domain media weight +
 * audible state + discarded state so heavy media/SPA tabs surface realistically).
 */
export function estimateTabRamMb(domain: string, audible: boolean, discarded: boolean, idSeed: number): number {
  if (discarded) return 12;
  let base = 85 + ((idSeed * 19) % 55);
  if (audible) base += 140;
  if (
    domain.includes('figma.com') ||
    domain.includes('youtube.com') ||
    domain.includes('docs.google.com') ||
    domain.includes('meet.google.com') ||
    domain.includes('notion.so') ||
    domain.includes('slack.com') ||
    domain.includes('discord.com')
  ) {
    base += 195;
  } else if (domain.includes('github.com') || domain.includes('mail.google.com') || domain.includes('linear.app')) {
    base += 95;
  }
  return base;
}

export function computeTabTriage(
  tabs: BrowserTabItem[],
  staleHoursThreshold = 2,
  nowMs = Date.now()
): TabTriageSummary {
  const t0 = performance.now();
  const staleCutoffMs = nowMs - staleHoursThreshold * 3600_000;

  const audioTabs = tabs.filter((t) => t.audible || t.muted);

  const byDomain = new Map<string, BrowserTabItem[]>();
  for (const tab of tabs) {
    if (!tab.domain || tab.domain === 'newtab' || tab.url.startsWith('chrome://')) continue;
    const arr = byDomain.get(tab.domain) || [];
    arr.push(tab);
    byDomain.set(tab.domain, arr);
  }

  const duplicateGroups: { domain: string; tabs: BrowserTabItem[] }[] = [];
  let duplicateExtraCount = 0;
  for (const [domain, groupTabs] of byDomain.entries()) {
    if (groupTabs.length > 1) {
      const sorted = [...groupTabs].sort((a, b) => b.lastAccessed - a.lastAccessed);
      duplicateGroups.push({ domain, tabs: sorted });
      duplicateExtraCount += sorted.length - 1;
    }
  }
  duplicateGroups.sort((a, b) => b.tabs.length - a.tabs.length);

  const staleTabs = tabs
    .filter(
      (t) =>
        !t.active &&
        !t.pinned &&
        !t.audible &&
        !t.discarded &&
        t.lastAccessed > 0 &&
        t.lastAccessed < staleCutoffMs
    )
    .sort((a, b) => a.lastAccessed - b.lastAccessed);

  const updateTabs = tabs
    .filter((t) => t.unreadCount > 0)
    .sort((a, b) => b.unreadCount - a.unreadCount);

  const heavyTabs = tabs
    .filter((t) => !t.discarded && !t.active)
    .sort((a, b) => b.estimatedRamMb - a.estimatedRamMb)
    .slice(0, 5);

  return {
    totalTabs: tabs.length,
    audioTabs,
    duplicateGroups,
    duplicateExtraCount,
    staleTabs,
    updateTabs,
    heavyTabs,
    computedInMs: Math.round((performance.now() - t0) * 100) / 100
  };
}
