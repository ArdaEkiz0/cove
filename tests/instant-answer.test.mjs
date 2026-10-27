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

test('ignores whitespace-only and unknown queries', () => {
  assert.equal(resolveInstantAnswer('   '), null);
  assert.equal(resolveInstantAnswer('what is the meaning of life'), null);
});
