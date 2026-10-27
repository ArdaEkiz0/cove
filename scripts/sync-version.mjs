import { readFileSync, writeFileSync } from 'node:fs';
import { join, resolve } from 'node:path';

const root = resolve(import.meta.dirname, '..');
const pkg = JSON.parse(readFileSync(join(root, 'package.json'), 'utf8'));
const version = pkg.version;
const checkOnly = process.argv.includes('--check');
const targets = [
  'public/manifest.json',
  'manifest.json',
  'manifest.firefox.json'
];

let changed = 0;
for (const relativePath of targets) {
  const path = join(root, relativePath);
  const before = readFileSync(path, 'utf8');
  const after = before.replace(/("version"\s*:\s*")[^"]+(")/, `$1${version}$2`);
  if (before === after) continue;
  changed += 1;
  if (checkOnly) {
    console.error(`✖ ${relativePath} is out of sync with package.json (${version}).`);
  } else {
    writeFileSync(path, after, 'utf8');
    console.log(`✓ Synced ${relativePath} → ${version}`);
  }
}

if (checkOnly && changed > 0) {
  console.error('Run `npm run sync:version` to update manifests.');
  process.exit(1);
}

if (changed === 0) {
  console.log(`✓ Manifests already match package.json (${version}).`);
}
