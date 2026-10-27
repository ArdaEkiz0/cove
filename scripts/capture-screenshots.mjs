#!/usr/bin/env node
/**
 * Reproducible README screenshot capture.
 *
 * Runs the local Vite app in headless Chrome over the DevTools Protocol and
 * writes deterministic PNGs to assets/screenshots. No Playwright dependency.
 *
 * Usage:
 *   npm run dev
 *   node scripts/capture-screenshots.mjs
 *   node scripts/capture-screenshots.mjs --url http://localhost:5173
 */
import { spawn } from 'node:child_process';
import { mkdir, writeFile, rm } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';

const args = process.argv.slice(2);
const argValue = (name, fallback) => {
  const index = args.indexOf(name);
  return index >= 0 && args[index + 1] ? args[index + 1] : fallback;
};

const APP_URL = argValue('--url', 'http://localhost:5173/');
const OUT_DIR = resolve('assets/screenshots');
const PORT = 9333;
const PROFILE = join(tmpdir(), `cove-screenshots-${process.pid}`);

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

const sleep = (ms) => new Promise((done) => setTimeout(done, ms));

async function waitForDebugger() {
  for (let attempt = 0; attempt < 80; attempt += 1) {
    try {
      const response = await fetch(`http://127.0.0.1:${PORT}/json/version`);
      if (response.ok) return response.json();
    } catch {
      // Chrome is still starting.
    }
    await sleep(250);
  }
  throw new Error('Chrome DevTools endpoint did not become ready.');
}

class Cdp {
  constructor(url) {
    this.id = 0;
    this.pending = new Map();
    this.socket = new WebSocket(url);
  }

  async connect() {
    await new Promise((resolvePromise, reject) => {
      this.socket.addEventListener('open', resolvePromise, { once: true });
      this.socket.addEventListener('error', reject, { once: true });
    });
    this.socket.addEventListener('message', (event) => {
      const message = JSON.parse(event.data);
      if (!message.id) return;
      const pending = this.pending.get(message.id);
      if (!pending) return;
      this.pending.delete(message.id);
      if (message.error) pending.reject(new Error(message.error.message));
      else pending.resolve(message.result);
    });
  }

  send(method, params = {}) {
    const id = (this.id += 1);
    this.socket.send(JSON.stringify({ id, method, params }));
    return new Promise((resolvePromise, reject) => {
      this.pending.set(id, { resolve: resolvePromise, reject });
    });
  }

  async evaluate(expression) {
    const result = await this.send('Runtime.evaluate', {
      expression,
      awaitPromise: true,
      returnByValue: true
    });
    if (result.exceptionDetails) {
      throw new Error(result.exceptionDetails.text || 'Page evaluation failed');
    }
    return result.result?.value;
  }

  close() {
    this.socket.close();
  }
}

async function capture(cdp, name, { width = 1600, height = 1000, wait = 900 } = {}) {
  await cdp.send('Emulation.setDeviceMetricsOverride', {
    width,
    height,
    deviceScaleFactor: 1,
    mobile: width < 600
  });
  await sleep(wait);
  const { data } = await cdp.send('Page.captureScreenshot', {
    format: 'png',
    fromSurface: true,
    captureBeyondViewport: false
  });
  const file = join(OUT_DIR, `${name}.png`);
  await writeFile(file, Buffer.from(data, 'base64'));
  console.log(`captured ${file}`);
}

async function clickLabel(cdp, label) {
  const clicked = await cdp.evaluate(`(() => {
    const target = [...document.querySelectorAll('[aria-label]')]
      .find((element) => element.getAttribute('aria-label') === ${JSON.stringify(label)});
    if (!target) return false;
    target.click();
    return true;
  })()`);
  if (!clicked) throw new Error(`Could not find aria-label="${label}"`);
  await sleep(700);
}

async function clickText(cdp, label) {
  const clicked = await cdp.evaluate(`(() => {
    const target = [...document.querySelectorAll('button')]
      .find((element) => element.textContent.replace(/\\s+/g, ' ').trim().startsWith(${JSON.stringify(label)}));
    if (!target) return false;
    target.click();
    return true;
  })()`);
  if (!clicked) throw new Error(`Could not find button text="${label}"`);
  await sleep(700);
}

async function clickSelector(cdp, selector) {
  const clicked = await cdp.evaluate(`(() => {
    const target = document.querySelector(${JSON.stringify(selector)});
    if (!target) return false;
    target.click();
    return true;
  })()`);
  if (!clicked) throw new Error(`Could not find selector="${selector}"`);
  await sleep(700);
}

async function openTarget(url) {
  return fetch(`http://127.0.0.1:${PORT}/json/new?${encodeURIComponent(url)}`, {
    method: 'PUT'
  }).then((response) => response.json());
}

async function main() {
  await mkdir(OUT_DIR, { recursive: true });
  const chrome = spawn(
    chromePath,
    [
      '--headless=new',
      '--disable-gpu',
      '--hide-scrollbars',
      '--no-first-run',
      '--no-default-browser-check',
      '--disable-extensions',
      `--remote-debugging-port=${PORT}`,
      `--user-data-dir=${PROFILE}`,
      '--window-size=1600,1000',
      'about:blank'
    ],
    { stdio: 'ignore' }
  );

  try {
    await waitForDebugger();
    const target = await openTarget(APP_URL);

    const cdp = new Cdp(target.webSocketDebuggerUrl);
    await cdp.connect();
    await cdp.send('Page.enable');
    await cdp.send('Runtime.enable');
    await sleep(6000);

    await capture(cdp, 'newtab-dark');
    await clickLabel(cdp, 'Settings Studio');
    await capture(cdp, 'settings-studio');
    await clickSelector(cdp, '.done-btn');
    await clickLabel(cdp, 'Toggle Dark or Light Mode');
    await capture(cdp, 'newtab-light');
    await clickLabel(cdp, 'Toggle Dark or Light Mode');
    await clickLabel(cdp, 'Focus Sanctuary');
    await capture(cdp, 'focus');
    await clickText(cdp, 'New Tab');
    await clickLabel(cdp, 'Sound Sanctuary');
    await capture(cdp, 'sound-sanctuary');
    await cdp.close();

    const discoverTarget = await openTarget(`${APP_URL}?capture=discover#discover`);
    const discoverCdp = new Cdp(discoverTarget.webSocketDebuggerUrl);
    await discoverCdp.connect();
    await discoverCdp.send('Page.enable');
    await discoverCdp.send('Runtime.enable');
    await sleep(8000);
    await capture(discoverCdp, 'discover');
    await discoverCdp.close();
  } finally {
    chrome.kill();
    await sleep(300);
    await rm(PROFILE, { recursive: true, force: true }).catch(() => {});
  }
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
