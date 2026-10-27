import test from 'node:test';
import assert from 'node:assert/strict';
import {
  computeTabTriage,
  estimateTabRamMb,
  extractDomain,
  parseTabUnreadCount
} from '../src/background/triage-core.ts';

const NOW = 1_700_000_000_000;
const HOUR = 3_600_000;

function tab(overrides = {}) {
  return {
    id: 1,
    windowId: 1,
    title: 'Tab',
    url: 'https://example.com/',
    domain: 'example.com',
    active: false,
    pinned: false,
    audible: false,
    muted: false,
    discarded: false,
    lastAccessed: NOW - HOUR,
    estimatedRamMb: 100,
    unreadCount: 0,
    ...overrides
  };
}

test('extractDomain normalizes hosts and rejects malformed URLs', () => {
  assert.equal(extractDomain('https://www.example.com/a/b'), 'example.com');
  assert.equal(extractDomain('https://news.ycombinator.com/'), 'news.ycombinator.com');
  assert.equal(extractDomain('not a url'), 'local');
  assert.equal(extractDomain('chrome://newtab'), 'newtab');
});

test('parseTabUnreadCount reads common title badge formats', () => {
  assert.equal(parseTabUnreadCount('(3) Inbox - Gmail', 'mail.google.com'), 3);
  assert.equal(parseTabUnreadCount('[2] Slack', 'app.slack.com'), 2);
  assert.equal(parseTabUnreadCount('GitHub (5)', 'github.com'), 5);
  assert.equal(parseTabUnreadCount('Inbox (5)', 'example.com'), 0);
  assert.equal(parseTabUnreadCount('• Discord', 'discord.com'), 1);
  assert.equal(parseTabUnreadCount('', 'example.com'), 0);
});

test('estimateTabRamMb accounts for media, heavy apps, and discarded tabs', () => {
  assert.equal(estimateTabRamMb('example.com', false, true, 1), 12);
  const idle = estimateTabRamMb('example.com', false, false, 1);
  const audible = estimateTabRamMb('example.com', true, false, 1);
  const heavy = estimateTabRamMb('figma.com', false, false, 1);
  const medium = estimateTabRamMb('github.com', false, false, 1);
  assert.ok(audible > idle);
  assert.ok(heavy > medium);
  assert.ok(medium > idle);
});

test('computeTabTriage reports duplicates, stale tabs, audio, and unread updates', () => {
  const tabs = [
    tab({ id: 1, domain: 'github.com', lastAccessed: NOW - 3 * HOUR }),
    tab({ id: 2, domain: 'github.com', lastAccessed: NOW - HOUR }),
    tab({ id: 3, domain: 'youtube.com', audible: true, estimatedRamMb: 320 }),
    tab({ id: 4, domain: 'mail.google.com', unreadCount: 4 }),
    tab({ id: 5, domain: 'figma.com', active: true, lastAccessed: NOW - 5 * HOUR }),
    tab({ id: 6, domain: 'pinned.example', pinned: true, lastAccessed: NOW - 9 * HOUR })
  ];

  const summary = computeTabTriage(tabs, 2, NOW);
  assert.equal(summary.totalTabs, 6);
  assert.equal(summary.duplicateGroups.length, 1);
  assert.equal(summary.duplicateGroups[0].domain, 'github.com');
  assert.equal(summary.duplicateExtraCount, 1);
  assert.deepEqual(summary.staleTabs.map((item) => item.id), [1]);
  assert.deepEqual(summary.audioTabs.map((item) => item.id), [3]);
  assert.deepEqual(summary.updateTabs.map((item) => item.id), [4]);
  assert.ok(summary.heavyTabs.length <= 5);
  assert.ok(summary.heavyTabs.every((item) => !item.active && !item.discarded));
  assert.ok(summary.computedInMs >= 0);
});

test('computeTabTriage ignores browser-internal tabs when grouping duplicates', () => {
  const tabs = [
    tab({ id: 1, domain: 'newtab', url: 'chrome://newtab' }),
    tab({ id: 2, domain: 'newtab', url: 'chrome://newtab' }),
    tab({ id: 3, domain: 'docs.example', url: 'https://docs.example/' }),
    tab({ id: 4, domain: 'docs.example', url: 'https://docs.example/guide' })
  ];
  const summary = computeTabTriage(tabs, 2, NOW);
  assert.equal(summary.duplicateGroups.length, 1);
  assert.equal(summary.duplicateGroups[0].domain, 'docs.example');
  assert.equal(summary.duplicateExtraCount, 1);
});
