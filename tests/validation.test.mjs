import test from 'node:test';
import assert from 'node:assert/strict';
import { createDefaultSettings } from '../src/lib/defaults.ts';
import {
  asFiniteNumber,
  asHttpUrl,
  asImageUrl,
  sanitizeCountdowns,
  sanitizeImportedSettings,
  sanitizeNotes,
  sanitizeQuickLinkGroups,
  sanitizeQuickLinks,
  sanitizeReadLater,
  sanitizeRssFeeds,
  sanitizeSessions
} from '../src/lib/validation.ts';

test('asHttpUrl accepts only credential-free http(s) URLs', () => {
  assert.equal(asHttpUrl('https://example.com/a?b=1'), 'https://example.com/a?b=1');
  assert.equal(asHttpUrl('http://example.com'), 'http://example.com/');
  assert.equal(asHttpUrl('javascript:alert(1)'), null);
  assert.equal(asHttpUrl('data:text/html,hi'), null);
  assert.equal(asHttpUrl('file:///etc/passwd'), null);
  assert.equal(asHttpUrl('https://user:pass@example.com'), null);
  assert.equal(asHttpUrl('not a url'), null);
  assert.equal(asHttpUrl('   '), null);
});

test('asImageUrl allows bounded image data URLs and https images only', () => {
  assert.match(asImageUrl('https://example.com/cover.jpg'), /^https:\/\//);
  assert.match(asImageUrl('data:image/png;base64,iVBORw0KGgo='), /^data:image\/png/);
  assert.equal(asImageUrl('data:text/html;base64,PGgxPmhpPC9oMT4='), undefined);
  assert.equal(asImageUrl('javascript:alert(1)'), undefined);
  assert.equal(asImageUrl('x'.repeat(600_000)), undefined);
});

test('asFiniteNumber clamps, rounds, and rejects non-finite values', () => {
  assert.equal(asFiniteNumber(42, 0, 0, 100), 42);
  assert.equal(asFiniteNumber(999, 0, 0, 100), 100);
  assert.equal(asFiniteNumber(-10, 0, 0, 100), 0);
  assert.equal(asFiniteNumber(4.6, 0, 0, 10, true), 5);
  assert.equal(asFiniteNumber(Number.NaN, 7, 0, 10), 7);
  assert.equal(asFiniteNumber('9', 7, 0, 10), 7);
});

test('sanitizes quick links, groups, notes, feeds, sessions, read-later, and countdowns', () => {
  const groups = sanitizeQuickLinkGroups([
    { id: 'g1', name: 'Reading', context: 'personal' },
    { id: 'g1', name: 'Duplicate', context: 'work' },
    { id: 'g2', name: '', context: 'work' }
  ]);
  assert.deepEqual(groups, [{ id: 'g1', name: 'Reading', context: 'personal' }]);

  const links = sanitizeQuickLinks([
    { id: 'l1', title: 'Cove', url: 'https://github.com/DevAnimecx/cove', groupId: 'g1' },
    { id: 'l2', title: 'Bad', url: 'javascript:alert(1)', groupId: 'g1' },
    { id: 'l1', title: 'Duplicate', url: 'https://example.com/', groupId: 'g1' }
  ]);
  assert.equal(links.length, 1);
  assert.equal(links[0].url, 'https://github.com/DevAnimecx/cove');

  const notes = sanitizeNotes([{ id: 'n1', title: 'Note', content: 'x'.repeat(200_000), pinned: true }]);
  assert.equal(notes[0].content.length, 100_000);
  assert.equal(notes[0].pinned, true);

  const feeds = sanitizeRssFeeds([
    { id: 'f1', title: 'Feed', url: 'https://example.com/rss.xml' },
    { id: 'f2', title: 'Bad', url: 'data:text/xml,<rss/>' }
  ]);
  assert.equal(feeds.length, 1);

  const sessions = sanitizeSessions([
    {
      id: 's1',
      name: 'Work',
      context: 'work',
      tabs: Array.from({ length: 150 }, (_, index) => ({
        url: `https://example.com/${index}`,
        title: `Tab ${index}`,
        domain: 'example.com'
      }))
    }
  ]);
  assert.equal(sessions[0].tabs.length, 100);

  const readLater = sanitizeReadLater([
    { id: 'r1', title: 'Article', url: 'https://example.com/a', domain: 'example.com' },
    { id: 'r2', title: 'Bad', url: 'file:///secret', domain: 'local' }
  ]);
  assert.equal(readLater.length, 1);

  const countdowns = sanitizeCountdowns([
    { id: 'c1', label: 'Launch', targetDate: '2026-12-31' },
    { id: 'c2', label: '', targetDate: '2026-12-31' }
  ]);
  assert.equal(countdowns.length, 1);
});

test('sanitizeImportedSettings clamps hostile values and keeps valid ones', () => {
  const base = createDefaultSettings();
  const imported = sanitizeImportedSettings(
    {
      version: 1,
      userName: 'x'.repeat(200),
      theme: 'neon',
      preset: 'not-a-preset',
      layoutMode: 'dashboard',
      language: 'xx',
      gridCols: 999,
      gridRows: -5,
      quickLinkCols: 0,
      quickLinkTileSize: 'XL',
      staleHoursThreshold: 0,
      worldClocks: [{ city: 'Tokyo', timeZone: 'Asia/Tokyo' }],
      background: {
        type: 'solid',
        curatedIndex: 99,
        dim: 200,
        blur: -2,
        brightness: 999,
        contrast: 1,
        solidColor: '#101820'
      },
      timeAware: { workStartHour: 50, workEndHour: 0, workDays: [1, 2, 2, 9] },
      smartEngine: { autonomyMode: 'rogue', whisperMode: false, enabled: 'yes' },
      weather: { latitude: 999, longitude: -999, unit: 'K', city: '' },
      focus: {
        workMinutes: 0,
        ambientVolume: 2,
        neuralMode: 'unknown',
        blockedDomains: ['example.com', 'not a domain', '*.bad.com'],
        history: []
      },
      searchEngines: [{ id: 'bad', name: 'Bad', shortLabel: 'B', bang: '!b', domain: 'x', urlTemplate: 'javascript:alert(1)' }],
      widgets: [{ id: 'w1', type: 'weather', size: 'M', visible: true, order: 9999 }]
    },
    base
  );

  assert.equal(imported.version, base.version);
  assert.equal(imported.userName.length, 80);
  assert.equal(imported.theme, base.theme);
  assert.equal(imported.preset, base.preset);
  assert.equal(imported.language, base.language);
  assert.equal(imported.gridCols, 6);
  assert.equal(imported.gridRows, 1);
  assert.equal(imported.quickLinkCols, 1);
  assert.equal(imported.quickLinkTileSize, base.quickLinkTileSize);
  assert.equal(imported.staleHoursThreshold, 1);
  assert.equal(imported.background.type, 'solid');
  assert.equal(imported.background.curatedIndex, 7);
  assert.equal(imported.background.dim, 100);
  assert.equal(imported.background.blur, 0);
  assert.equal(imported.background.brightness, 150);
  assert.equal(imported.background.contrast, 50);
  assert.equal(imported.background.solidColor, '#101820');
  assert.equal(imported.timeAware.workStartHour, 23);
  assert.equal(imported.timeAware.workDays.length, 2);
  assert.equal(imported.smartEngine.autonomyMode, base.smartEngine.autonomyMode);
  assert.equal(imported.smartEngine.whisperMode, false);
  assert.equal(imported.smartEngine.enabled, base.smartEngine.enabled);
  assert.equal(imported.weather.latitude, 90);
  assert.equal(imported.weather.longitude, -180);
  assert.equal(imported.weather.unit, base.weather.unit);
  assert.equal(imported.focus.workMinutes, 1);
  assert.equal(imported.focus.ambientVolume, 1);
  assert.equal(imported.focus.neuralMode, base.focus.neuralMode);
  assert.deepEqual(imported.focus.blockedDomains, ['example.com']);
  assert.equal(imported.searchEngines, base.searchEngines);
  assert.equal(imported.widgets[0].order, 1000);
  assert.equal(imported.widgets[0].type, 'weather');
});

test('sanitizeImportedSettings never mutates the base settings or global prototypes', () => {
  const base = createDefaultSettings();
  const snapshot = JSON.stringify(base);
  sanitizeImportedSettings(JSON.parse('{"__proto__":{"polluted":true},"theme":"light"}'), base);
  assert.equal(JSON.stringify(base), snapshot);
  assert.equal({}.polluted, undefined);
});

test('sanitizeImportedSettings rejects non-object input', () => {
  const base = createDefaultSettings();
  for (const value of [null, undefined, 'settings', 42, [], true]) {
    assert.deepEqual(sanitizeImportedSettings(value, base), base);
  }
});

test('empty arrays are bounded instead of trusting a huge backup', () => {
  const notes = sanitizeNotes(Array.from({ length: 1000 }, (_, index) => ({ id: `n${index}`, title: `N${index}` })));
  assert.equal(notes.length, 500);
  assert.equal(new Set(notes.map((note) => note.id)).size, 500);
});
