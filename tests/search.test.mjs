import test from 'node:test';
import assert from 'node:assert/strict';
import {
  SEARCH_ENGINE_PRESETS,
  buildSearchUrl,
  detectBang,
  findSearchEngineByBang,
  isValidBang,
  normalizeBang,
  parseBangAliases,
  validateSearchUrlTemplate
} from '../src/lib/search.ts';
import { createDefaultSettings } from '../src/lib/defaults.ts';

test('normalizes and validates !bangs', () => {
  assert.equal(normalizeBang('GH'), '!gh');
  assert.equal(normalizeBang('!gh'), '!gh');
  assert.equal(isValidBang('gh'), true);
  assert.equal(isValidBang('!gh-2'), true);
  assert.equal(isValidBang('!'), false);
  assert.equal(isValidBang('!two words'), false);
  assert.equal(isValidBang('!two!words'), false);
});

test('validates custom search URL templates', () => {
  assert.equal(validateSearchUrlTemplate('https://kagi.com/search?q={q}').ok, true);
  assert.equal(validateSearchUrlTemplate('https://example.com/?a=1&b={q}').ok, true);
  assert.equal(validateSearchUrlTemplate('https://example.com/?q={q}').domain, 'example.com');

  assert.equal(validateSearchUrlTemplate('https://example.com/search').ok, false);
  assert.equal(validateSearchUrlTemplate('javascript:alert({q})').ok, false);
  assert.equal(validateSearchUrlTemplate('https://user:pass@example.com/?q={q}').ok, false);
  assert.equal(validateSearchUrlTemplate('https://example.com/?q={q} with spaces').ok, false);
  assert.equal(validateSearchUrlTemplate('not a url {q}').ok, false);
});

test('builds encoded search URLs and replaces every placeholder', () => {
  assert.equal(
    buildSearchUrl('https://example.com/?q={q}&ref={q}', 'svelte 5 & co'),
    'https://example.com/?q=svelte%205%20%26%20co&ref=svelte%205%20%26%20co'
  );
  assert.equal(buildSearchUrl('javascript:alert({q})', 'x'), null);
});

test('detects prefix, suffix, and alias bangs', () => {
  const engines = createDefaultSettings().searchEngines;
  const prefix = detectBang('!gh svelte', engines);
  assert.equal(prefix?.engine.id, 'github');
  assert.equal(prefix?.cleanQuery, 'svelte');

  const suffix = detectBang('svelte !gh', engines);
  assert.equal(suffix?.engine.id, 'github');
  assert.equal(suffix?.cleanQuery, 'svelte');

  const alias = detectBang('!github svelte', engines);
  assert.equal(alias?.engine.id, 'github');
  assert.equal(findSearchEngineByBang(engines, '!wiki')?.id, 'wiki');
  assert.equal(detectBang('!unknown svelte', engines), null);
});

test('parses aliases without duplicates or invalid tokens', () => {
  assert.deepEqual(parseBangAliases('!k, kagi  !K'), ['!k', '!kagi']);
  assert.deepEqual(parseBangAliases(''), []);
});

test('ships valid, unique provider presets', () => {
  const bangs = new Set();
  for (const preset of SEARCH_ENGINE_PRESETS) {
    const validation = validateSearchUrlTemplate(preset.urlTemplate);
    assert.equal(validation.ok, true, `${preset.name} has an invalid template`);
    assert.equal(isValidBang(preset.bang), true);
    assert.equal(bangs.has(preset.bang), false, `${preset.bang} is duplicated`);
    bangs.add(preset.bang);
    for (const alias of preset.aliases || []) {
      assert.equal(isValidBang(alias), true);
      assert.equal(bangs.has(alias), false, `${alias} is duplicated`);
      bangs.add(alias);
    }
  }
});

test('ships valid default provider URLs, including Wikipedia', () => {
  const engines = createDefaultSettings().searchEngines;
  for (const engine of engines) {
    assert.equal(validateSearchUrlTemplate(engine.urlTemplate).ok, true, engine.name);
    assert.equal(isValidBang(engine.bang), true, engine.name);
  }
  const wiki = engines.find((engine) => engine.id === 'wiki');
  assert.equal(wiki?.urlTemplate, 'https://en.wikipedia.org/w/index.php?search={q}');
});
