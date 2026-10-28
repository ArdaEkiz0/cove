import test from 'node:test';
import assert from 'node:assert/strict';
import { resolveInstantAnswer } from '../src/lib/instant-answer.ts';

test('calculates percentages without eval', () => {
  const answer = resolveInstantAnswer('18% of 4,800');
  assert.ok(answer);
  assert.equal(answer.kind, 'math');
  assert.equal(answer.primary, '= 864');
  assert.equal(answer.copyText, '864');
});

test('evaluates arithmetic with precedence and unary operators', () => {
  assert.equal(resolveInstantAnswer('2 + 2 * 3')?.primary, '= 8');
  assert.equal(resolveInstantAnswer('2^3')?.primary, '= 8');
  assert.equal(resolveInstantAnswer('-5 + 2')?.primary, '= -3');
  assert.equal(resolveInstantAnswer('(10 + 2) / 3')?.primary, '= 4');
});

test('rejects plain numbers, division by zero, and malformed expressions', () => {
  assert.equal(resolveInstantAnswer('2026'), null);
  assert.equal(resolveInstantAnswer('1 / 0'), null);
  assert.equal(resolveInstantAnswer('sin(2)'), null);
  assert.equal(resolveInstantAnswer('2 +'), null);
});

test('converts temperature, distance, data, and time units', () => {
  const temp = resolveInstantAnswer('72 f in c');
  assert.ok(temp);
  assert.equal(temp.kind, 'unit');
  assert.match(temp.primary, /22\.222 °C/);

  const distance = resolveInstantAnswer('15 km to mi');
  assert.ok(distance);
  assert.match(distance.primary, /9\.321 mi/);

  const data = resolveInstantAnswer('2048 mb to gb');
  assert.ok(data);
  assert.equal(data.primary, '2 GB');

  const time = resolveInstantAnswer('90 min to hr');
  assert.ok(time);
  assert.equal(time.primary, '1.5 hr');
});

test('clamps quick focus commands to a safe range', () => {
  assert.equal(resolveInstantAnswer('focus 45')?.focusMinutes, 45);
  assert.equal(resolveInstantAnswer('pomodoro 500')?.focusMinutes, 180);
  assert.equal(resolveInstantAnswer('timer 0')?.focusMinutes, 1);
});

test('inspects short and long hex colors', () => {
  const short = resolveInstantAnswer('#abc');
  assert.ok(short);
  assert.equal(short.kind, 'color');
  assert.equal(short.swatchHex, '#aabbcc');
  assert.equal(short.copyText, 'rgb(170, 187, 204)');

  const long = resolveInstantAnswer('#63b3b6');
  assert.ok(long);
  assert.equal(long.copyText, 'rgb(99, 179, 182)');
});

test('resolves world clocks with a deterministic date', () => {
  const now = new Date('2026-10-27T12:00:00.000Z');
  const answer = resolveInstantAnswer('time in tokyo', now);
  assert.ok(answer);
  assert.equal(answer.kind, 'time');
  assert.match(answer.secondary, /Tokyo, Japan \(Asia\/Tokyo\)/);
  assert.ok(answer.primary.includes('·'));
});

test('calculates date differences and offsets deterministically', () => {
  const now = new Date('2026-10-28T12:00:00.000Z');
  const between = resolveInstantAnswer('days between 2026-01-01 and 2026-12-31', now);
  assert.ok(between);
  assert.equal(between.kind, 'date');
  assert.equal(between.primary, '= 364 days');
  assert.equal(between.copyText, '364');

  const until = resolveInstantAnswer('days until 2026-12-25', now);
  assert.ok(until);
  assert.equal(until.copyText, '58');

  const offset = resolveInstantAnswer('2026-10-28 + 14 days', now);
  assert.ok(offset);
  assert.equal(offset.copyText, '2026-11-11');

  assert.equal(resolveInstantAnswer('days until 2026-02-30', now), null);
});

test('converts number bases and rejects invalid digits', () => {
  assert.equal(resolveInstantAnswer('255 in hex')?.primary, '= 0xFF');
  assert.equal(resolveInstantAnswer('0xff in decimal')?.primary, '= 255');
  assert.equal(resolveInstantAnswer('binary 1010')?.primary, '= 10');
  assert.equal(resolveInstantAnswer('hex ff')?.primary, '= 255');
  assert.equal(resolveInstantAnswer('0b102 in decimal'), null);
  assert.equal(resolveInstantAnswer('0o17 to decimal')?.primary, '= 15');
});

test('inspects Unix timestamps', () => {
  const answer = resolveInstantAnswer('unix 1700000000');
  assert.ok(answer);
  assert.equal(answer.kind, 'timestamp');
  assert.match(answer.primary, /^2023-11-14 22:13:20 UTC$/);
  assert.equal(answer.copyText, '2023-11-14T22:13:20.000Z');
  assert.equal(resolveInstantAnswer('unix 123'), null);
});

test('handles tips, percentage change, and color formats', () => {
  const tip = resolveInstantAnswer('tip 20% on 45');
  assert.ok(tip);
  assert.match(tip.primary, /Tip 9 - Total 54/);
  assert.equal(tip.copyText, '54');

  const change = resolveInstantAnswer('from 80 to 100');
  assert.ok(change);
  assert.equal(change.primary, '+25%');

  const rgb = resolveInstantAnswer('rgb(99, 179, 182)');
  assert.ok(rgb);
  assert.equal(rgb.copyText, '#63b3b6');
  assert.equal(rgb.swatchHex, '#63b3b6');

  const hsl = resolveInstantAnswer('hsl(180, 40%, 55%)');
  assert.ok(hsl);
  assert.equal(hsl.kind, 'color');
  assert.match(hsl.copyText, /^#[0-9a-f]{6}$/);
});

test('counts words and characters locally', () => {
  const answer = resolveInstantAnswer('word count: Cove is calm');
  assert.ok(answer);
  assert.equal(answer.kind, 'text');
  assert.equal(answer.primary, '= 3 words');
  assert.equal(answer.copyText, '3 words, 12 characters');
});

test('ignores whitespace-only and unknown queries', () => {
  assert.equal(resolveInstantAnswer('   '), null);
  assert.equal(resolveInstantAnswer('what is the meaning of life'), null);
});
