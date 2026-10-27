#!/usr/bin/env node
/**
 * Generate the GitHub social preview from a real product screenshot.
 *
 * Uses the installed Chrome/Edge headless mode; no extra dependency.
 *
 * Usage:
 *   node scripts/generate-social-preview.mjs
 *   CHROME_PATH=/path/to/chrome node scripts/generate-social-preview.mjs
 */
import { spawn } from 'node:child_process';
import { existsSync, mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { pathToFileURL } from 'node:url';

const CHROME_CANDIDATES = [
  process.env.CHROME_PATH,
  'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
  'C:\\Program Files (x86)\\Google\\Chrome\\Application\\chrome.exe',
  'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe',
  '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
  '/usr/bin/google-chrome',
  '/usr/bin/chromium',
  '/usr/bin/chromium-browser'
].filter(Boolean);

const chromePath = CHROME_CANDIDATES.find((candidate) => existsSync(candidate));
if (!chromePath) {
  console.error('No Chrome/Edge binary found. Set CHROME_PATH to a Chromium executable.');
  process.exit(1);
}

const source = resolve('assets/readme/social-preview.html');
const output = resolve('assets/readme/social-preview-1280x640.png');
const profile = mkdtempSync(join(tmpdir(), 'cove-social-'));

const args = [
  '--headless=new',
  '--disable-gpu',
  '--hide-scrollbars',
  '--no-first-run',
  '--no-default-browser-check',
  '--force-device-scale-factor=1',
  '--window-size=1280,640',
  `--user-data-dir=${profile}`,
  '--virtual-time-budget=1500',
  `--screenshot=${output}`,
  pathToFileURL(source).href
];

const child = spawn(chromePath, args, { stdio: 'inherit' });

child.on('error', (error) => {
  rmSync(profile, { recursive: true, force: true });
  console.error(error.message);
  process.exit(1);
});

child.on('exit', (code) => {
  rmSync(profile, { recursive: true, force: true });
  if (code !== 0) {
    console.error(`Chrome exited with code ${code}.`);
    process.exit(code ?? 1);
  }
  console.log(`Wrote ${output}`);
});
