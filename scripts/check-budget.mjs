import { existsSync, readFileSync, readdirSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { gzipSync } from 'node:zlib';

const root = resolve(import.meta.dirname, '..');
const dist = join(root, 'dist');
const limitBytes = 170 * 1024;

if (!existsSync(dist)) {
  console.error('✖ dist/ is missing. Run `npm run build` before checking the bundle budget.');
  process.exit(1);
}

const assetsDir = join(dist, 'assets');
const rows = [];
let total = 0;

for (const file of readdirSync(assetsDir).sort()) {
  if (!/\.(js|css)$/.test(file)) continue;
  const bytes = gzipSync(readFileSync(join(assetsDir, file))).byteLength;
  rows.push({ file: `assets/${file}`, bytes });
  total += bytes;
}

const background = join(dist, 'background.js');
if (existsSync(background)) {
  const bytes = gzipSync(readFileSync(background)).byteLength;
  rows.push({ file: 'background.js', bytes });
  total += bytes;
}

const format = (bytes) => `${(bytes / 1024).toFixed(1)} KB`;
for (const row of rows) {
  console.log(`  ${format(row.bytes).padStart(9)}  ${row.file}`);
}

console.log(`\n  ${format(total).padStart(9)}  TOTAL gzipped JS + CSS`);
console.log(`  ${format(limitBytes).padStart(9)}  BUDGET`);
console.log(`  ${format(limitBytes - total).padStart(9)}  HEADROOM`);

if (total >= limitBytes) {
  console.error(`\n✖ Bundle budget exceeded by ${format(total - limitBytes)}.`);
  process.exit(1);
}

console.log('\n✓ Bundle budget verified.');
