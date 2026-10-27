import test from 'node:test';
import assert from 'node:assert/strict';
import { describeWeatherCode, getMoonPhase } from '../src/lib/moon.ts';

test('anchors the lunar cycle to a known new moon', () => {
  const newMoon = getMoonPhase(new Date('2000-01-06T18:14:00.000Z'));
  assert.ok(newMoon.phase < 0.01 || newMoon.phase > 0.99);
  assert.equal(newMoon.name, 'New Moon');
  assert.ok(newMoon.illumination <= 1);
});

test('identifies a full moon near the middle of the synodic cycle', () => {
  const fullMoon = getMoonPhase(new Date('2024-04-23T23:49:00.000Z'));
  assert.ok(fullMoon.phase > 0.47 && fullMoon.phase < 0.53);
  assert.equal(fullMoon.name, 'Full Moon');
  assert.ok(fullMoon.illumination >= 99);
});

test('always returns a normalized phase and bounded illumination', () => {
  for (const iso of [
    '2020-01-01T00:00:00.000Z',
    '2023-07-14T12:30:00.000Z',
    '2026-10-27T00:00:00.000Z',
    '1999-12-31T23:59:59.000Z'
  ]) {
    const info = getMoonPhase(new Date(iso));
    assert.ok(info.phase >= 0 && info.phase < 1);
    assert.ok(info.illumination >= 0 && info.illumination <= 100);
    assert.ok(info.name.length > 0);
  }
});

test('maps WMO weather codes to stable labels and icons', () => {
  assert.deepEqual(describeWeatherCode(0), { label: 'Clear sky', icon: 'sun' });
  assert.deepEqual(describeWeatherCode(3), { label: 'Overcast', icon: 'cloud' });
  assert.deepEqual(describeWeatherCode(45), { label: 'Calm mist', icon: 'fog' });
  assert.equal(describeWeatherCode(61).icon, 'rain');
  assert.equal(describeWeatherCode(75).icon, 'snow');
  assert.equal(describeWeatherCode(95).icon, 'storm');
  assert.equal(describeWeatherCode(4).label, 'Mild');
});
