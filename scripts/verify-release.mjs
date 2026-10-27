import { createHash } from 'node:crypto';
import { existsSync, readFileSync } from 'node:fs';
import { join, resolve } from 'node:path';

const root = resolve(import.meta.dirname, '..');
const pkg = JSON.parse(readFileSync(join(root, 'package.json'), 'utf8'));
const expectedVersion = pkg.version;
const failures = [];
const checks = [];

function check(label, condition, detail = '') {
  checks.push({ label, ok: Boolean(condition), detail });
  if (!condition) failures.push(`${label}${detail ? ` — ${detail}` : ''}`);
}

function readJson(path) {
  return JSON.parse(readFileSync(path, 'utf8'));
}

const distManifest = join(root, 'dist', 'manifest.json');
check('dist/manifest.json exists', existsSync(distManifest));
if (existsSync(distManifest)) {
  const manifest = readJson(distManifest);
  check('manifest_version is 3', manifest.manifest_version === 3);
  check('version matches package.json', manifest.version === expectedVersion, `${manifest.version} !== ${expectedVersion}`);
  check('newtab override is index.html', manifest.chrome_url_overrides?.newtab === 'index.html');
  check('background service worker is background.js', manifest.background?.service_worker === 'background.js');
  check(
    'MV3 CSP is strict',
    manifest.content_security_policy?.extension_pages === "script-src 'self'; object-src 'self'"
  );
}

for (const size of [16, 32, 48, 128]) {
  check(`icon${size}.png is bundled`, existsSync(join(root, 'dist', 'icons', `icon${size}.png`)));
}

for (const name of [
  'sheltered-cove.jpg',
  'alpine-mist.jpg',
  'emerald-cloud.jpg',
  'twilight-cafe.jpg',
  'golden-crosswalk.jpg',
  'midnight-fjord.jpg',
  'zen-garden.jpg',
  'pastel-horizon.jpg'
]) {
  check(`wallpaper ${name} is bundled`, existsSync(join(root, 'dist', 'wallpapers', name)));
}

for (const htmlFile of ['index.html', 'blocked.html']) {
  const path = join(root, 'dist', htmlFile);
  check(`${htmlFile} exists`, existsSync(path));
  if (existsSync(path)) {
    const html = readFileSync(path, 'utf8');
    const inline = [...html.matchAll(/<script\b[^>]*>([\s\S]*?)<\/script>/gi)].some(
      (match) => match[1].trim().length > 0
    );
    check(`${htmlFile} has no inline scripts`, !inline);
  }
}

for (const name of [
  'cove-chrome-mv3.zip',
  `cove-chrome-mv3-v${expectedVersion}.zip`,
  'cove-firefox-mv3.zip',
  `cove-firefox-mv3-v${expectedVersion}.zip`,
  `cove-github-source-v${expectedVersion}.zip`
]) {
  check(`release artifact ${name} exists`, existsSync(join(root, 'releases', name)));
}

const sumsPath = join(root, 'releases', 'SHA256SUMS.txt');
if (existsSync(sumsPath)) {
  const lines = readFileSync(sumsPath, 'utf8').trim().split(/\r?\n/).filter(Boolean);
  for (const line of lines) {
    const [digest, filename] = line.trim().split(/\s+/);
    const artifact = join(root, 'releases', filename);
    check(`checksum entry for ${filename}`, existsSync(artifact));
    if (existsSync(artifact)) {
      const actual = createHash('sha256').update(readFileSync(artifact)).digest('hex');
      check(`sha256 matches for ${filename}`, actual === digest, 'digest mismatch');
    }
  }
}

const manifestPath = join(root, 'releases', 'release-manifest.json');
if (existsSync(manifestPath)) {
  const release = readJson(manifestPath);
  check('release manifest version matches', release.version === expectedVersion);
  check('release manifest is Apache-2.0', release.license === 'Apache-2.0');
  check('release manifest declares Chrome/Firefox/source artifacts', Object.keys(release.artifacts ?? {}).length === 3);
}

const passed = checks.filter((entry) => entry.ok).length;
console.log(`\nCove release verification: ${passed}/${checks.length} checks passed`);
for (const entry of checks.filter((item) => !item.ok)) {
  console.error(`  ✖ ${entry.label}${entry.detail ? ` — ${entry.detail}` : ''}`);
}

if (failures.length > 0) {
  console.error(`\n✖ ${failures.length} verification failure(s). Run \`npm run build\` and retry.`);
  process.exit(1);
}

console.log('✓ Release manifest, CSP, icons, wallpapers, artifacts, and checksums are consistent.\n');
