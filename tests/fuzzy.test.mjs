import test from 'node:test';
import assert from 'node:assert/strict';
import { fuzzyFilter, fuzzyScore, highlightMatches } from '../src/lib/fuzzy.ts';

test('fuzzyScore handles empty queries, prefixes, and case-insensitive matches', () => {
  assert.deepEqual(fuzzyScore('', 'anything'), { score: 1, matches: [] });
  assert.equal(fuzzyScore('toolong', 'short'), null);

  const prefix = fuzzyScore('git', 'GitHub');
  assert.ok(prefix);
  assert.deepEqual(prefix.matches, [0, 1, 2]);
  assert.ok(prefix.score > 0);

  const scattered = fuzzyScore('git', 'gist of it');
  assert.ok(scattered);
  assert.deepEqual(scattered.matches, [0, 1, 3]);
});

test('fuzzyScore rewards word boundaries and consecutive runs', () => {
  const boundary = fuzzyScore('gh', 'GitHub');
  const internal = fuzzyScore('gh', 'logh');
  assert.ok(boundary && internal);
  assert.ok(boundary.score > internal.score, 'prefix match should outrank an internal match');

  const consecutive = fuzzyScore('cove', 'cove');
  const gapped = fuzzyScore('cove', 'c o v e');
  assert.ok(consecutive && gapped);
  assert.ok(consecutive.score > gapped.score, 'consecutive matches should score higher');
});

test('fuzzyFilter sorts by score and limits results', () => {
  const items = [
    { name: 'Cove Notes' },
    { name: 'Chrome Open View Extension' },
    { name: 'Unrelated' },
    { name: 'Cobalt' }
  ];
  const results = fuzzyFilter('co', items, (item) => item.name, 2);
  assert.equal(results.length, 2);
  assert.equal(results[0].item.name, 'Cobalt');
  assert.ok(results[0].score >= results[1].score);
});

test('fuzzyFilter returns the original order for empty queries', () => {
  const items = ['one', 'two', 'three'];
  const results = fuzzyFilter('   ', items, (item) => item, 2);
  assert.deepEqual(
    results.map((result) => result.item),
    ['one', 'two']
  );
});

test('highlightMatches reconstructs the source text and marks only matched indices', () => {
  const segments = highlightMatches('Cove', [0, 2]);
  assert.equal(
    segments.map((segment) => segment.text).join(''),
    'Cove'
  );
  assert.deepEqual(
    segments.filter((segment) => segment.matched).map((segment) => segment.text),
    ['C', 'v']
  );
  assert.deepEqual(highlightMatches('Cove', []), [{ text: 'Cove', matched: false }]);
});
