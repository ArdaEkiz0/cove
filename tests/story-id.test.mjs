import assert from 'node:assert/strict';
import test from 'node:test';
import { buildStoryId, ensureUniqueStoryIds, storyUrlHash } from '../src/lib/story-id.ts';

test('storyUrlHash is deterministic', () => {
  const url = 'https://www.theverge.com/2026/10/27/example-story';
  assert.equal(storyUrlHash(url), storyUrlHash(url));
});

test('same publisher URLs produce distinct story hashes', () => {
  const base = 'https://www.theverge.com/2026/10/27/';
  const hashes = new Set();
  for (let index = 0; index < 500; index += 1) {
    hashes.add(storyUrlHash(`${base}story-${index}`));
  }
  assert.equal(hashes.size, 500);
});

test('buildStoryId namespaces the source without truncating the URL', () => {
  const url = 'https://feeds.bbci.co.uk/news/world/rss.xml?story=123';
  const id = buildStoryId('rss-bbc-world', url);

  assert.ok(id.startsWith('rss-bbc-world-'));
  assert.equal(id, buildStoryId('rss-bbc-world', url));
  assert.notEqual(id, buildStoryId('rss-guardian-world', url));
});

test('different paths on the same domain do not collide', () => {
  const first = buildStoryId('rss-verge', 'https://www.theverge.com/a');
  const second = buildStoryId('rss-verge', 'https://www.theverge.com/b');
  assert.notEqual(first, second);
});

test('legacy cached stories are repaired without losing the first ID', () => {
  const stories = [
    { id: 'verge-aHR0cHM6Ly93d3cudG', url: 'https://www.theverge.com/a' },
    { id: 'verge-aHR0cHM6Ly93d3cudG', url: 'https://www.theverge.com/b' },
    { id: 'verge-aHR0cHM6Ly93d3cudG', url: 'https://www.theverge.com/c' }
  ];

  const repaired = ensureUniqueStoryIds(stories);
  assert.equal(repaired.length, 3);
  assert.equal(repaired[0].id, stories[0].id);
  assert.equal(new Set(repaired.map((story) => story.id)).size, 3);
});

test('ensureUniqueStoryIds leaves healthy feeds untouched', () => {
  const stories = [
    { id: 'rss-bbc-1', url: 'https://www.bbc.co.uk/a' },
    { id: 'rss-bbc-2', url: 'https://www.bbc.co.uk/b' }
  ];

  assert.deepEqual(ensureUniqueStoryIds(stories), stories);
});
