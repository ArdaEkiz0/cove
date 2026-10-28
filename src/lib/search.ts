import type { SearchEngine } from './types';

/**
 * Small, dependency-free helpers for search providers, !bangs, and custom
 * URL templates. Everything here is pure so it can run in the extension, the
 * import validator, and Node tests without touching the DOM or the network.
 */

export const SEARCH_PLACEHOLDER = '{q}';
export const MAX_SEARCH_TEMPLATE_LENGTH = 2048;
export const MAX_BANG_LENGTH = 24;

export interface SearchTemplateValidation {
  ok: boolean;
  urlTemplate?: string;
  domain?: string;
  error?: string;
}

export interface BangMatch {
  engine: SearchEngine;
  token: string;
  cleanQuery: string;
}

export type SearchEnginePreset = Omit<SearchEngine, 'enabled' | 'isCustom'> & {
  description: string;
};

export function normalizeBang(raw: string): string {
  const cleaned = raw.trim().toLowerCase();
  if (!cleaned) return '';
  return cleaned.startsWith('!') ? cleaned : `!${cleaned}`;
}

export function isValidBang(raw: string): boolean {
  const normalized = normalizeBang(raw);
  return (
    normalized.length >= 2 &&
    normalized.length <= MAX_BANG_LENGTH + 1 &&
    /^![a-z0-9][a-z0-9_-]*$/i.test(normalized)
  );
}

/**
 * A provider URL must be an absolute http(s) URL, must contain {q}, and must
 * not smuggle credentials or whitespace into the template. We validate a sample
 * URL with the placeholder replaced so malformed query strings are caught too.
 */
export function validateSearchUrlTemplate(raw: string): SearchTemplateValidation {
  const urlTemplate = raw.trim();
  if (!urlTemplate) {
    return { ok: false, error: 'Enter a search URL.' };
  }
  if (urlTemplate.length > MAX_SEARCH_TEMPLATE_LENGTH) {
    return { ok: false, error: 'The search URL is too long.' };
  }
  if (!urlTemplate.includes(SEARCH_PLACEHOLDER)) {
    return { ok: false, error: `Include ${SEARCH_PLACEHOLDER} where the query goes.` };
  }
  if (/\s/.test(urlTemplate)) {
    return { ok: false, error: 'The search URL cannot contain spaces.' };
  }
  if (!/^https?:\/\//i.test(urlTemplate)) {
    return { ok: false, error: 'Use an absolute http:// or https:// URL.' };
  }

  const sample = urlTemplate.split(SEARCH_PLACEHOLDER).join('cove');
  let parsed: URL;
  try {
    parsed = new URL(sample);
  } catch {
    return { ok: false, error: 'That search URL is not valid.' };
  }

  if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') {
    return { ok: false, error: 'Only http:// and https:// search URLs are supported.' };
  }
  if (parsed.username || parsed.password) {
    return { ok: false, error: 'Search URLs cannot contain credentials.' };
  }
  if (!parsed.hostname || !parsed.hostname.includes('.')) {
    return { ok: false, error: 'The search URL needs a valid domain.' };
  }

  return {
    ok: true,
    urlTemplate,
    domain: parsed.hostname.replace(/^www\./i, '').toLowerCase()
  };
}

export function buildSearchUrl(urlTemplate: string, query: string): string | null {
  const validation = validateSearchUrlTemplate(urlTemplate);
  if (!validation.ok) return null;
  return urlTemplate.split(SEARCH_PLACEHOLDER).join(encodeURIComponent(query));
}

function engineMatchesToken(engine: SearchEngine, token: string): boolean {
  const normalized = normalizeBang(token);
  if (engine.bang.toLowerCase() === normalized) return true;
  return (engine.aliases || []).some((alias) => normalizeBang(alias) === normalized);
}

export function findSearchEngineByBang(
  engines: SearchEngine[],
  token: string
): SearchEngine | null {
  return engines.find((engine) => engineMatchesToken(engine, token)) || null;
}

/**
 * Supports both `!g query` and `query !g`. A trailing bang is only recognized
 * when there is a real query before it, so typing `!g` alone still selects the
 * provider for the next word.
 */
export function detectBang(query: string, engines: SearchEngine[]): BangMatch | null {
  const trimmed = query.trimStart();
  if (!trimmed) return null;

  const prefix = trimmed.match(/^(![a-z0-9][a-z0-9_-]*)\b\s*(.*)$/i);
  if (prefix) {
    const engine = findSearchEngineByBang(engines, prefix[1]);
    if (engine) {
      return { engine, token: prefix[1].toLowerCase(), cleanQuery: prefix[2] };
    }
  }

  const suffix = trimmed.match(/^(.*?)\s+(![a-z0-9][a-z0-9_-]*)\s*$/i);
  if (suffix && suffix[1].trim()) {
    const engine = findSearchEngineByBang(engines, suffix[2]);
    if (engine) {
      return { engine, token: suffix[2].toLowerCase(), cleanQuery: suffix[1].trim() };
    }
  }

  return null;
}

export function parseBangAliases(raw: string): string[] {
  const aliases: string[] = [];
  for (const piece of raw.split(/[\s,]+/)) {
    if (!piece.trim()) continue;
    const normalized = normalizeBang(piece);
    if (!isValidBang(normalized)) continue;
    if (!aliases.includes(normalized)) aliases.push(normalized);
  }
  return aliases.slice(0, 6);
}

/**
 * Curated keyless providers that can be added with one click. None are enabled
 * by default; the user chooses which services receive their queries.
 */
export const SEARCH_ENGINE_PRESETS: SearchEnginePreset[] = [
  {
    id: 'startpage',
    name: 'Startpage',
    shortLabel: 'SP',
    bang: '!sp',
    aliases: ['!startpage'],
    domain: 'startpage.com',
    urlTemplate: 'https://www.startpage.com/sp/search?query={q}',
    description: 'Private Google results'
  },
  {
    id: 'kagi',
    name: 'Kagi',
    shortLabel: 'KAGI',
    bang: '!k',
    aliases: ['!kagi'],
    domain: 'kagi.com',
    urlTemplate: 'https://kagi.com/search?q={q}',
    description: 'Paid search with extras'
  },
  {
    id: 'perplexity',
    name: 'Perplexity',
    shortLabel: 'PPLX',
    bang: '!pp',
    aliases: ['!perplexity'],
    domain: 'perplexity.ai',
    urlTemplate: 'https://www.perplexity.ai/search?q={q}',
    description: 'Answer engine with citations'
  },
  {
    id: 'chatgpt',
    name: 'ChatGPT',
    shortLabel: 'GPT',
    bang: '!gpt',
    aliases: ['!chatgpt'],
    domain: 'chatgpt.com',
    urlTemplate: 'https://chatgpt.com/?q={q}',
    description: 'Ask ChatGPT with a prompt'
  },
  {
    id: 'claude',
    name: 'Claude',
    shortLabel: 'CLD',
    bang: '!claude',
    domain: 'claude.ai',
    urlTemplate: 'https://claude.ai/new?q={q}',
    description: 'Ask Claude with a prompt'
  },
  {
    id: 'stackoverflow',
    name: 'Stack Overflow',
    shortLabel: 'SO',
    bang: '!so',
    aliases: ['!stackoverflow'],
    domain: 'stackoverflow.com',
    urlTemplate: 'https://stackoverflow.com/search?q={q}',
    description: 'Programming Q&A'
  },
  {
    id: 'gitlab',
    name: 'GitLab',
    shortLabel: 'GL',
    bang: '!gl',
    aliases: ['!gitlab'],
    domain: 'gitlab.com',
    urlTemplate: 'https://gitlab.com/search?search={q}',
    description: 'GitLab code and projects'
  },
  {
    id: 'npm',
    name: 'npm',
    shortLabel: 'NPM',
    bang: '!npm',
    domain: 'npmjs.com',
    urlTemplate: 'https://www.npmjs.com/search?q={q}',
    description: 'JavaScript packages'
  },
  {
    id: 'pypi',
    name: 'PyPI',
    shortLabel: 'PYPI',
    bang: '!pypi',
    domain: 'pypi.org',
    urlTemplate: 'https://pypi.org/search/?q={q}',
    description: 'Python packages'
  },
  {
    id: 'reddit',
    name: 'Reddit',
    shortLabel: 'R',
    bang: '!r',
    aliases: ['!reddit'],
    domain: 'reddit.com',
    urlTemplate: 'https://www.reddit.com/search/?q={q}',
    description: 'Community discussions'
  },
  {
    id: 'hackernews',
    name: 'Hacker News',
    shortLabel: 'HN',
    bang: '!hn',
    aliases: ['!hackernews'],
    domain: 'hn.algolia.com',
    urlTemplate: 'https://hn.algolia.com/?q={q}',
    description: 'Tech news and comments'
  },
  {
    id: 'arxiv',
    name: 'arXiv',
    shortLabel: 'ARX',
    bang: '!arxiv',
    domain: 'arxiv.org',
    urlTemplate: 'https://arxiv.org/search/?query={q}&searchtype=all',
    description: 'Research preprints'
  },
  {
    id: 'maps',
    name: 'Google Maps',
    shortLabel: 'MAPS',
    bang: '!maps',
    domain: 'maps.google.com',
    urlTemplate: 'https://www.google.com/maps/search/{q}',
    description: 'Places and directions'
  },
  {
    id: 'unsplash',
    name: 'Unsplash',
    shortLabel: 'UNS',
    bang: '!unsplash',
    domain: 'unsplash.com',
    urlTemplate: 'https://unsplash.com/s/photos/{q}',
    description: 'Free photography'
  }
];

export function createPresetEngine(preset: SearchEnginePreset): SearchEngine {
  return {
    ...preset,
    enabled: true,
    isCustom: true
  };
}
