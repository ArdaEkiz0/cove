import { isExtensionContext, storageGet, storageSet } from './storage';

const REPO = 'DevAnimecx/cove';
const API = `https://api.github.com/repos/${REPO}/releases/latest`;
export const GITHUB_LATEST_DOWNLOAD_BASE = `https://github.com/${REPO}/releases/latest/download`;

const CACHE_KEY = 'cove_github_update_cache_v1';
const CHECK_INTERVAL = 6 * 60 * 60 * 1000;

export interface UpdateCheckResult {
  currentVersion: string;
  latestVersion: string;
  updateAvailable: boolean;
  downloadUrl: string;
  checkedAt: number;
  error?: string;
}

function versionParts(raw: string): number[] {
  return raw
    .replace(/^v/i, '')
    .split(/[.+-]/)
    .map((part) => Number.parseInt(part, 10) || 0);
}

export function isNewerVersion(latest: string, current: string): boolean {
  const a = versionParts(latest);
  const b = versionParts(current);
  for (let i = 0; i < Math.max(a.length, b.length); i += 1) {
    const diff = (a[i] ?? 0) - (b[i] ?? 0);
    if (diff !== 0) return diff > 0;
  }
  return false;
}

export function getExtensionVersion(): string {
  try {
    return chrome.runtime?.getManifest?.().version ?? '';
  } catch {
    return '';
  }
}

function isFirefoxRuntime(): boolean {
  try {
    return chrome.runtime.getURL('').startsWith('moz-extension://');
  } catch {
    return false;
  }
}

function downloadUrlForCurrentBrowser(): string {
  const browser = isFirefoxRuntime() ? 'firefox' : 'chrome';
  return `${GITHUB_LATEST_DOWNLOAD_BASE}/cove-${browser}-mv3.zip`;
}

async function fetchLatestTag(): Promise<string> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 12_000);
  try {
    const response = await fetch(API, {
      headers: {
        Accept: 'application/vnd.github+json',
        'X-GitHub-Api-Version': '2022-11-28'
      },
      cache: 'no-store',
      signal: controller.signal
    });
    if (!response.ok) throw new Error(`GitHub HTTP ${response.status}`);
    const release = (await response.json()) as { tag_name?: string };
    const version = String(release.tag_name ?? '').replace(/^v/i, '');
    if (!version) throw new Error('GitHub returned no release tag');
    return version;
  } finally {
    clearTimeout(timer);
  }
}

/**
 * Checks GitHub's latest release and caches the answer for six hours so new
 * tabs do not burn the unauthenticated API quota.
 */
export async function checkForGithubUpdate(
  force = false
): Promise<UpdateCheckResult | null> {
  if (!isExtensionContext()) return null;
  const currentVersion = getExtensionVersion();
  if (!currentVersion) return null;

  const cached = await storageGet<UpdateCheckResult | null>(CACHE_KEY, null);
  const now = Date.now();
  if (
    !force &&
    cached &&
    cached.currentVersion === currentVersion &&
    now - cached.checkedAt < CHECK_INTERVAL
  ) {
    return cached;
  }

  try {
    const latestVersion = await fetchLatestTag();
    const result: UpdateCheckResult = {
      currentVersion,
      latestVersion,
      updateAvailable: isNewerVersion(latestVersion, currentVersion),
      downloadUrl: downloadUrlForCurrentBrowser(),
      checkedAt: now
    };
    await storageSet(CACHE_KEY, result);
    return result;
  } catch (error) {
    const message = error instanceof Error ? error.message : 'GitHub check failed';
    if (cached && cached.currentVersion === currentVersion) {
      return { ...cached, error: message };
    }
    return {
      currentVersion,
      latestVersion: currentVersion,
      updateAvailable: false,
      downloadUrl: downloadUrlForCurrentBrowser(),
      checkedAt: now,
      error: message
    };
  }
}

/** Downloads the official latest GitHub release archive. */
export function downloadGithubUpdate(
  result: UpdateCheckResult,
  onStatus?: (message: string) => void
): void {
  const anchor = document.createElement('a');
  anchor.href = result.downloadUrl;
  anchor.download = result.downloadUrl.split('/').pop() || 'cove-update.zip';
  anchor.rel = 'noopener noreferrer';
  anchor.style.display = 'none';
  document.body.appendChild(anchor);
  anchor.click();
  document.body.removeChild(anchor);
  onStatus?.(
    `Downloading Cove v${result.latestVersion}. Replace the Cove folder, then click Reload in the extensions page.`
  );
}
