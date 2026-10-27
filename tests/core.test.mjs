import test from 'node:test';
import assert from 'node:assert/strict';
import { existsSync, readFileSync, readdirSync, statSync } from 'node:fs';
import { join } from 'node:path';
import { gzipSync } from 'node:zlib';

const root = join(import.meta.dirname, '..');

const EXPECTED_WALLPAPERS = [
  'sheltered-cove.jpg',
  'alpine-mist.jpg',
  'emerald-cloud.jpg',
  'twilight-cafe.jpg',
  'golden-crosswalk.jpg',
  'midnight-fjord.jpg',
  'zen-garden.jpg',
  'pastel-horizon.jpg'
];

function walkFiles(dir) {
  const out = [];
  for (const name of readdirSync(dir)) {
    const full = join(dir, name);
    if (statSync(full).isDirectory()) {
      out.push(...walkFiles(full));
    } else {
      out.push(full);
    }
  }
  return out;
}

test('MV3 Chrome manifest v0.1.1, CSP, 8 local scenic wallpapers, and <170 KB code budget', () => {
  const pkg = JSON.parse(readFileSync(join(root, 'package.json'), 'utf8'));
  assert.equal(pkg.version, '0.1.1', 'package.json version must be 0.1.1');

  const distManifestPath = join(root, 'dist', 'manifest.json');
  assert.ok(existsSync(distManifestPath), 'dist/manifest.json must exist');

  const manifest = JSON.parse(readFileSync(distManifestPath, 'utf8'));
  assert.equal(manifest.manifest_version, 3);
  assert.equal(manifest.version, '0.1.1');
  assert.equal(manifest.chrome_url_overrides.newtab, 'index.html');
  assert.equal(manifest.background.service_worker, 'background.js');
  assert.equal(
    manifest.content_security_policy.extension_pages,
    "script-src 'self'; object-src 'self'"
  );

  // Ensure zero inline scripts in dist/index.html and dist/blocked.html (required for MV3 CSP)
  for (const htmlFile of ['index.html', 'blocked.html']) {
    const html = readFileSync(join(root, 'dist', htmlFile), 'utf8');
    const scriptTags = [...html.matchAll(/<script\b[^>]*>([\s\S]*?)<\/script>/gi)];
    assert.ok(scriptTags.length >= 1, `${htmlFile} should include external script tag`);
    for (const match of scriptTags) {
      assert.equal(match[1].trim(), '', `${htmlFile} must not contain inline JS to satisfy MV3 CSP`);
    }
  }

  // Verify icons 16, 32, 48, 128 exist in dist/icons
  for (const sz of [16, 32, 48, 128]) {
    assert.ok(existsSync(join(root, 'dist', 'icons', `icon${sz}.png`)), `icon${sz}.png must exist`);
  }

  // Verify all 8 high-resolution local scenic wallpapers are bundled in dist/ and unpacked-chrome-mv3/
  for (const wp of EXPECTED_WALLPAPERS) {
    assert.ok(existsSync(join(root, 'dist', 'wallpapers', wp)), `dist/wallpapers/${wp} must exist`);
    assert.ok(
      existsSync(join(root, 'unpacked-chrome-mv3', 'wallpapers', wp)),
      `unpacked-chrome-mv3/wallpapers/${wp} must exist`
    );
  }

  // Verify total JS + CSS gzipped bundle stays under the 170 KB CI budget (excluding background images)
  const assetFiles = readdirSync(join(root, 'dist', 'assets'));
  let gzipBytes = 0;
  for (const f of assetFiles) {
    if (f.endsWith('.js') || f.endsWith('.css')) {
      gzipBytes += gzipSync(readFileSync(join(root, 'dist', 'assets', f))).byteLength;
    }
  }
  gzipBytes += gzipSync(readFileSync(join(root, 'dist', 'background.js'))).byteLength;
  assert.ok(
    gzipBytes < 170 * 1024,
    `JS+CSS gzipped bundle (${Math.round(gzipBytes / 1024)} KB) must remain < 170 KB`
  );

  // Verify Chrome and Firefox zip bundles exist
  assert.ok(
    existsSync(join(root, 'releases', 'cove-chrome-mv3.zip')),
    'cove-chrome-mv3.zip must exist'
  );
  assert.ok(
    existsSync(join(root, 'releases', 'cove-firefox-mv3.zip')),
    'cove-firefox-mv3.zip must exist'
  );
});

test('Zero-Mock Audit, Precision Typography, Autonomous CSE v4 & Complete Full-Page Settings v0.1.1', () => {
  assert.ok(
    !existsSync(join(root, 'src', 'newtab', 'components', 'BrowserSimDrawer.svelte')),
    'BrowserSimDrawer.svelte must not exist'
  );
  assert.ok(
    existsSync(join(root, 'src', 'newtab', 'components', 'SettingsStudio.svelte')),
    'Full-page SettingsStudio.svelte must exist'
  );

  const studioSrc = readFileSync(
    join(root, 'src', 'newtab', 'components', 'SettingsStudio.svelte'),
    'utf8'
  );
  assert.ok(
    !studioSrc.includes('type="checkbox"'),
    'SettingsStudio.svelte must use accessible pill switches (role="switch") instead of raw checkboxes'
  );
  assert.ok(
    studioSrc.includes('role="switch"'),
    'SettingsStudio.svelte must provide accessible role="switch" controls'
  );
  assert.ok(
    studioSrc.includes('width: 100vw') && studioSrc.includes('height: 100vh'),
    'SettingsStudio.svelte must render edge-to-edge full-viewport'
  );
  assert.ok(
    studioSrc.includes('v0.1.1'),
    'SettingsStudio.svelte must display release version v0.1.1'
  );

  // Verify all 10 complete settings sections exist
  for (const sec of [
    "'general'",
    "'typography'",
    "'appearance'",
    "'layout'",
    "'smart'",
    "'sound'",
    "'search'",
    "'focus'",
    "'privacy'",
    "'data'"
  ]) {
    assert.ok(studioSrc.includes(`id: ${sec}`), `Settings section ${sec} must exist`);
  }

  // Verify Global Precision Typography tokens
  const tokensCss = readFileSync(join(root, 'src', 'newtab', 'styles', 'tokens.css'), 'utf8');
  for (const pair of ['swiss', 'editorial', 'humanist', 'technical']) {
    assert.ok(
      tokensCss.includes(`data-font-pair='${pair}'`) || tokensCss.includes(`data-font-pair="${pair}"`),
      `Font pair ${pair} must be defined in tokens.css`
    );
  }
  assert.ok(
    tokensCss.includes('data-ui-scale'),
    'UI density scales must be defined in tokens.css'
  );

  // Zero-mock integrity scan
  const srcFiles = walkFiles(join(root, 'src'));
  const forbiddenTokens = [
    'createSimulatedBrowserTabs',
    'BrowserSimDrawer',
    'simulateEvolutionBurst',
    'trainSmartEngineDemo',
    'resetDemoTabs',
    'Simulate +25 Signals',
    'cached fallback'
  ];

  for (const file of srcFiles) {
    const content = readFileSync(file, 'utf8');
    for (const token of forbiddenTokens) {
      assert.ok(!content.includes(token), `Forbidden mock artifact "${token}" found in ${file}`);
    }
  }

  // Verify Autonomous CSE v4 + Whisper Mode + Neural Sound Engine
  const defaultsSrc = readFileSync(join(root, 'src', 'lib', 'defaults.ts'), 'utf8');
  assert.ok(defaultsSrc.includes('streakDays: 0'), 'Focus streak must start honestly at 0');
  assert.ok(defaultsSrc.includes("autonomyMode: 'autonomous'"), 'Full Autonomous CSE must be default');
  assert.ok(defaultsSrc.includes('whisperMode: true'), 'CSE Whisper Mode must be enabled by default');

  const smartSrc = readFileSync(join(root, 'src', 'lib', 'smart-engine.ts'), 'utf8');
  assert.ok(smartSrc.includes('version: 4'), 'Autonomous CSE v4 schema must be active');
  assert.ok(smartSrc.includes('biTransitionMatrix'), '2nd-order Markov chains must be active');
  assert.ok(smartSrc.includes('applyAutonomousDecay'), '14-day recency half-life decay must be active');
  assert.ok(smartSrc.includes('inferAutonomousContext'), 'Autonomous Work/Personal boundary learning must exist');
  assert.ok(smartSrc.includes('getAutonomousCircadianSceneIndex'), 'Autonomous circadian 4K scene harmony must exist');

  const audioSrc = readFileSync(join(root, 'src', 'lib', 'audio.ts'), 'utf8');
  assert.ok(audioSrc.includes('NEURAL_MODES'), 'Functional Neural Sound modes must exist');
  assert.ok(audioSrc.includes('sampleSpectrum'), 'Real-time AnalyserNode spectrum sampling must exist');

  // Verify Dark Mode Default + Standalone Full-Page Discover + Multi-Tier IndexedDB News Cache
  assert.ok(defaultsSrc.includes("theme: 'dark'"), 'New Tab must boot into Dark Mode by default');
  assert.ok(defaultsSrc.includes("preset: 'cobalt'"), 'Midnight Cobalt preset must be active by default');
  const indexHtmlSrc = readFileSync(join(root, 'index.html'), 'utf8');
  assert.ok(
    indexHtmlSrc.includes('data-theme="dark"'),
    'index.html must pre-set data-theme="dark" for zero-flash Dark Mode boot'
  );

  const appSrc = readFileSync(join(root, 'src', 'newtab', 'App.svelte'), 'utf8');
  assert.equal(
    (appSrc.match(/<DiscoverFeed\s*\/>/g) || []).length,
    1,
    'DiscoverFeed must render exclusively as its own dedicated workspace section'
  );
  assert.ok(
    !appSrc.includes("cove.settings.layoutMode !== 'discover'"),
    'Persistent SideDock and TopBar must remain mounted when switching to the Discover side-navigation section'
  );
  const discoverFeedSrc = readFileSync(
    join(root, 'src', 'newtab', 'components', 'DiscoverFeed.svelte'),
    'utf8'
  );
  assert.ok(
    discoverFeedSrc.includes('disc-sidenav'),
    'DiscoverFeed must provide a dedicated Channel & Cache side-navigation rail'
  );

  assert.ok(
    existsSync(join(root, 'src', 'lib', 'news-cache.ts')),
    'IndexedDB news-cache.ts must exist'
  );
  const cacheSrc = readFileSync(join(root, 'src', 'lib', 'news-cache.ts'), 'utf8');
  assert.ok(cacheSrc.includes('loadCachedDiscoverFeed'), 'Feed IndexedDB cache loader must exist');
  assert.ok(cacheSrc.includes('saveCachedFullArticle'), 'Full-article IndexedDB LRU cache must exist');
  assert.ok(cacheSrc.includes('clearAllNewsCache'), 'Cache purge helper must exist');

  // Verify Cove Discover + On-Device Auto-Learning Recommender + Clean Cove News Reader
  const discoverSrc = readFileSync(join(root, 'src', 'lib', 'discover.ts'), 'utf8');
  assert.ok(discoverSrc.includes('rankStoriesForUser'), 'Auto-learning Discover recommender must exist');
  assert.ok(discoverSrc.includes('fetchFullCoveNewsArticle'), 'Clean Cove News full-article extractor must exist');
  assert.ok(
    existsSync(join(root, 'src', 'newtab', 'components', 'DiscoverFeed.svelte')),
    'DiscoverFeed.svelte must exist'
  );
  assert.ok(
    existsSync(join(root, 'src', 'newtab', 'components', 'CoveNewsModal.svelte')),
    'CoveNewsModal.svelte must exist'
  );
});
