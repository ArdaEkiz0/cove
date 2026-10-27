import test from 'node:test';
import assert from 'node:assert/strict';
import { formatTimeAgo } from '../src/lib/rss-parser.ts';

test('formats recent feed timestamps with human-readable buckets', () => {
  const now = Date.now();
  assert.equal(formatTimeAgo(now - 30_000), 'just now');
  assert.equal(formatTimeAgo(now - 5 * 60_000), '5m ago');
  assert.equal(formatTimeAgo(now - 3 * 3_600_000), '3h ago');
  assert.equal(formatTimeAgo(now - 2 * 86_400_000), '2d ago');
});

test('never reports negative time for future timestamps', () => {
  assert.equal(formatTimeAgo(Date.now() + 60_000), 'just now');
});

test('falls back to a locale date after thirty days', () => {
  const value = formatTimeAgo(Date.now() - 40 * 86_400_000);
  assert.ok(value.length > 0);
  assert.ok(!value.endsWith(' ago'));
});
