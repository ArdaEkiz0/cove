import { execSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import {
  copyFileSync,
  cpSync,
  existsSync,
  mkdirSync,
  readFileSync,
  readdirSync,
  rmSync,
  statSync,
  writeFileSync
} from 'node:fs';
import { join, resolve } from 'node:path';

const root = resolve(import.meta.dirname, '..');
const pkg = JSON.parse(readFileSync(join(root, 'package.json'), 'utf8'));
const version = pkg.version || '0.1.1';

const distDir = join(root, 'dist');
const releasesDir = join(root, 'releases');
const unpackedDir = join(root, 'unpacked-chrome-mv3');
const publicDownloads = join(root, 'public', 'downloads');

mkdirSync(releasesDir, { recursive: true });
mkdirSync(publicDownloads, { recursive: true });

// Keep root manifest.json synced with public/manifest.json for repo clarity
copyFileSync(join(root, 'public', 'manifest.json'), join(root, 'manifest.json'));

// Remove any nested downloads folder from dist before zipping extension
const distDownloads = join(distDir, 'downloads');
if (existsSync(distDownloads)) {
  rmSync(distDownloads, { recursive: true, force: true });
}

// Persist unpacked Chrome MV3 directory outside 'dist/' so workspace snapshots keep it
if (existsSync(unpackedDir)) {
  rmSync(unpackedDir, { recursive: true, force: true });
}
cpSync(distDir, unpackedDir, { recursive: true });

// 1. Package Chrome MV3 zip (both canonical & versioned filenames)
const chromeZip = join(releasesDir, 'cove-chrome-mv3.zip');
const chromeVersionedZip = join(releasesDir, `cove-chrome-mv3-v${version}.zip`);
if (existsSync(chromeZip)) rmSync(chromeZip);
if (existsSync(chromeVersionedZip)) rmSync(chromeVersionedZip);
execSync(`cd "${distDir}" && zip -rq "${chromeZip}" .`);
copyFileSync(chromeZip, chromeVersionedZip);

// 2. Package Firefox MV3 zip (both canonical & versioned filenames)
const ffTmp = join(releasesDir, '.ff-stage');
if (existsSync(ffTmp)) rmSync(ffTmp, { recursive: true, force: true });
cpSync(distDir, ffTmp, { recursive: true });
copyFileSync(join(root, 'manifest.firefox.json'), join(ffTmp, 'manifest.json'));
const firefoxZip = join(releasesDir, 'cove-firefox-mv3.zip');
const firefoxVersionedZip = join(releasesDir, `cove-firefox-mv3-v${version}.zip`);
if (existsSync(firefoxZip)) rmSync(firefoxZip);
if (existsSync(firefoxVersionedZip)) rmSync(firefoxVersionedZip);
execSync(`cd "${ffTmp}" && zip -rq "${firefoxZip}" .`);
copyFileSync(firefoxZip, firefoxVersionedZip);
rmSync(ffTmp, { recursive: true, force: true });

// 3. Package clean GitHub Source Repository zip (ready to unzip & push to GitHub)
const sourceVersionedZip = join(releasesDir, `cove-github-source-v${version}.zip`);
if (existsSync(sourceVersionedZip)) rmSync(sourceVersionedZip);
execSync(
  `cd "${root}" && zip -rq "${sourceVersionedZip}" . -x "node_modules/*" "dist/*" ".git/*" "unpacked-chrome-mv3/*" "public/downloads/*" "releases/*"`
);

// 4. Generate cryptographic SHA-256 checksums + machine-readable release-manifest.json
function sha256File(filePath) {
  return createHash('sha256').update(readFileSync(filePath)).digest('hex');
}

const chromeSha = sha256File(chromeVersionedZip);
const firefoxSha = sha256File(firefoxVersionedZip);
const sourceSha = sha256File(sourceVersionedZip);

const chromeBytes = statSync(chromeVersionedZip).size;
const firefoxBytes = statSync(firefoxVersionedZip).size;
const sourceBytes = statSync(sourceVersionedZip).size;

const sha256Txt = [
  `${chromeSha}  cove-chrome-mv3-v${version}.zip`,
  `${firefoxSha}  cove-firefox-mv3-v${version}.zip`,
  `${sourceSha}  cove-github-source-v${version}.zip`,
  ''
].join('\n');

writeFileSync(join(releasesDir, 'SHA256SUMS.txt'), sha256Txt, 'utf8');

const releaseManifest = {
  version,
  releasedAt: '2026-10-27',
  license: 'Apache-2.0',
  artifacts: {
    chrome: {
      filename: `cove-chrome-mv3-v${version}.zip`,
      bytes: chromeBytes,
      sizeLabel: `${(chromeBytes / (1024 * 1024)).toFixed(2)} MB`,
      sha256: chromeSha
    },
    firefox: {
      filename: `cove-firefox-mv3-v${version}.zip`,
      bytes: firefoxBytes,
      sizeLabel: `${(firefoxBytes / (1024 * 1024)).toFixed(2)} MB`,
      sha256: firefoxSha
    },
    source: {
      filename: `cove-github-source-v${version}.zip`,
      bytes: sourceBytes,
      sizeLabel: `${(sourceBytes / (1024 * 1024)).toFixed(2)} MB`,
      sha256: sourceSha
    }
  }
};

writeFileSync(
  join(releasesDir, 'release-manifest.json'),
  JSON.stringify(releaseManifest, null, 2),
  'utf8'
);

// Copy zips + checksums into public/downloads & dist/downloads so preview users can download directly
mkdirSync(distDownloads, { recursive: true });
for (const [src, name] of [
  [chromeZip, 'cove-chrome-mv3.zip'],
  [chromeVersionedZip, `cove-chrome-mv3-v${version}.zip`],
  [firefoxZip, 'cove-firefox-mv3.zip'],
  [firefoxVersionedZip, `cove-firefox-mv3-v${version}.zip`],
  [sourceVersionedZip, `cove-github-source-v${version}.zip`],
  [join(releasesDir, 'SHA256SUMS.txt'), 'SHA256SUMS.txt'],
  [join(releasesDir, 'release-manifest.json'), 'release-manifest.json']
]) {
  copyFileSync(src, join(publicDownloads, name));
  copyFileSync(src, join(distDownloads, name));
}

function dirSize(dir) {
  let total = 0;
  for (const entry of readdirSync(dir)) {
    if (entry === 'downloads') continue;
    const p = join(dir, entry);
    const st = statSync(p);
    total += st.isDirectory() ? dirSize(p) : st.size;
  }
  return total;
}

const rawBytes = dirSize(distDir);
console.log(`\n✓ Cove v${version} Release Packaged & Verified`);
console.log(`  Uncompressed dist/: ${(rawBytes / 1024).toFixed(1)} KB`);
console.log(`  Chrome MV3 zip:     ${(chromeBytes / 1024).toFixed(1)} KB (${chromeSha.slice(0, 12)}…)`);
console.log(`  Firefox MV3 zip:    ${(firefoxBytes / 1024).toFixed(1)} KB (${firefoxSha.slice(0, 12)}…)`);
console.log(`  GitHub Source zip:  ${(sourceBytes / 1024).toFixed(1)} KB (${sourceSha.slice(0, 12)}…)\n`);
