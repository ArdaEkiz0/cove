<script lang="ts">
  import { buildPaletteIndex } from '../../lib/commands';
  import { fuzzyFilter } from '../../lib/fuzzy';
  import { t } from '../../lib/i18n';
  import { resolveInstantAnswer } from '../../lib/instant-answer';
  import { cove } from '../../lib/state.svelte';
  import BrandIcon from './BrandIcon.svelte';
  import Icon from './Icon.svelte';

  let query = $state('');
  let focused = $state(false);
  let selectedIdx = $state(0);
  let livePhrases = $state<string[]>([]);
  let liveTimer: number | null = null;
  let inputEl: HTMLInputElement | null = null;

  export function focusInput() {
    inputEl?.focus();
    inputEl?.select();
  }

  const lang = $derived(cove.settings.language);
  const enabledEngines = $derived(cove.settings.searchEngines.filter((e) => e.enabled));

  // Detect !bang prefix (!g, !gh, !yt, !w, !mdn, !ddg, !sp)
  const bangDetected = $derived.by(() => {
    const trimmed = query.trimStart();
    const m = trimmed.match(/^(!\w+)\s*(.*)$/);
    if (!m) return null;
    const token = m[1].toLowerCase();
    const eng = cove.settings.searchEngines.find((e) => e.bang?.toLowerCase() === token);
    if (!eng) return null;
    return { engine: eng, cleanQuery: m[2] };
  });

  const primaryEngine = $derived(
    bangDetected?.engine ||
      (cove.settings.smartEngine.enabled &&
      cove.settings.smartEngine.autoAdaptEngine &&
      cove.predictedEngine
        ? cove.predictedEngine
        : enabledEngines[0] || cove.settings.searchEngines[0])
  );
  const isCommandMode = $derived(query.trimStart().startsWith('>'));

  interface SearchSuggestion {
    id: string;
    kind: 'instant' | 'web' | 'autocomplete' | 'tab' | 'link' | 'readlater' | 'command';
    title: string;
    subtitle: string;
    badge?: string;
    faviconUrl?: string;
    faviconDomain?: string;
    swatchHex?: string;
    execute: () => void;
  }

  const suggestions = $derived.by<SearchSuggestion[]>(() => {
    const raw = query.trim();
    if (!raw) return [];

    if (isCommandMode) {
      const cmdQuery = raw.replace(/^>\s*/, '');
      const all = buildPaletteIndex(cmdQuery);
      return fuzzyFilter(cmdQuery, all, (i) => `${i.title} ${i.searchText}`, 7).map((r) => ({
        id: r.item.id,
        kind: 'command',
        title: r.item.title,
        subtitle: r.item.subtitle || r.item.category,
        badge: r.item.badge || r.item.category,
        faviconUrl: r.item.faviconUrl,
        faviconDomain: r.item.faviconDomain,
        execute: () => {
          r.item.run();
          query = '';
          livePhrases = [];
        }
      }));
    }

    const searchTarget = bangDetected ? bangDetected.cleanQuery.trim() : raw;
    const out: SearchSuggestion[] = [];

    // 1. Zero-latency Instant Answer (Math, %, Unit conversion, World time, Hex color, Quick Focus)
    const instant =
      cove.settings.instantAnswers !== false
        ? resolveInstantAnswer(searchTarget || raw, cove.now)
        : null;
    if (instant) {
      out.push({
        id: 'instant-answer',
        kind: 'instant',
        title: instant.primary,
        subtitle: instant.secondary,
        badge: instant.kind === 'focus' ? 'Launch ↵' : 'Copy ↵',
        swatchHex: instant.swatchHex,
        execute: () => {
          if (instant.focusMinutes) {
            cove.startFocus(instant.focusMinutes);
            cove.setLayoutMode('focus');
          } else if (instant.copyText) {
            navigator.clipboard?.writeText(instant.copyText);
            cove.notify(`Copied ${instant.copyText}`);
          }
          query = '';
          livePhrases = [];
        }
      });
    }

    // 2. Primary Web Search or !Bang Search
    if (searchTarget) {
      const activeNames = enabledEngines.map((e) => e.name).join(' + ') || 'DuckDuckGo';
      out.push({
        id: 'web-query',
        kind: 'web',
        title: searchTarget,
        subtitle: bangDetected
          ? `Search ${bangDetected.engine.name} via ${bangDetected.engine.bang}`
          : cove.settings.splitSearch
            ? `Open across ${enabledEngines.length} engines (${activeNames})`
            : `Search ${primaryEngine?.name || 'DuckDuckGo'}`,
        badge: bangDetected ? bangDetected.engine.shortLabel : cove.settings.splitSearch ? 'Split ↵' : '↵',
        faviconDomain: primaryEngine?.domain || 'duckduckgo.com',
        execute: () => executeWebSearch(searchTarget, bangDetected?.engine)
      });
    }

    // 3. Direct URL navigation
    if (/^[a-z0-9.-]+\.[a-z]{2,}(\/\S*)?$/i.test(raw) && !raw.includes(' ')) {
      out.push({
        id: 'direct-url',
        kind: 'link',
        title: `Open https://${raw}`,
        subtitle: 'Direct URL · tracked in workspace',
        badge: 'Go',
        faviconDomain: raw,
        execute: () => {
          cove.openUrlSafely(raw, true);
          query = '';
          livePhrases = [];
        }
      });
    }

    // 4. Open Workspace / Browser Tabs
    const tabHits = fuzzyFilter(
      searchTarget || raw,
      cove.openTabs,
      (tab) => `${tab.title} ${tab.domain} ${tab.url}`,
      2
    );
    for (const hit of tabHits) {
      out.push({
        id: `tab-${hit.item.id}`,
        kind: 'tab',
        title: hit.item.title,
        subtitle: hit.item.domain,
        badge: 'Switch tab',
        faviconUrl: hit.item.favIconUrl,
        faviconDomain: hit.item.url,
        execute: () => {
          cove.jumpToTab(hit.item);
          query = '';
          livePhrases = [];
        }
      });
    }

    // 5. Smart-Ranked Quick Links
    const rankedLinks = cove.getRankedQuickLinks(cove.quickLinks).map((r) => r.item);
    const linkHits = fuzzyFilter(searchTarget || raw, rankedLinks, (q) => `${q.title} ${q.url}`, 2);
    for (const hit of linkHits) {
      out.push({
        id: `ql-${hit.item.id}`,
        kind: 'link',
        title: hit.item.title,
        subtitle: hit.item.url,
        badge: 'Shortcut',
        faviconUrl: hit.item.customIcon,
        faviconDomain: hit.item.url,
        execute: () => {
          cove.openQuickLink(hit.item, true);
          query = '';
          livePhrases = [];
        }
      });
    }

    // 6. Read Later Offline Articles
    const rlHits = fuzzyFilter(searchTarget || raw, cove.readLater, (r) => `${r.title} ${r.domain}`, 2);
    for (const hit of rlHits) {
      out.push({
        id: `rl-${hit.item.id}`,
        kind: 'readlater',
        title: hit.item.title,
        subtitle: `${hit.item.domain} · Offline Reader`,
        badge: 'Reader',
        faviconDomain: hit.item.url,
        execute: () => {
          cove.openArticleInReader(hit.item);
          query = '';
          livePhrases = [];
        }
      });
    }

    // 7. Live Zero-Cookie Web Search Autocomplete Phrases
    for (const phrase of livePhrases) {
      if (phrase.toLowerCase() === (searchTarget || raw).toLowerCase()) continue;
      out.push({
        id: `ac-${phrase}`,
        kind: 'autocomplete',
        title: phrase,
        subtitle: `Search ${primaryEngine?.name || 'DuckDuckGo'}`,
        badge: 'Suggest',
        execute: () => executeWebSearch(phrase, bangDetected?.engine)
      });
    }

    return out.slice(0, 8);
  });

  function triggerLiveSuggest() {
    selectedIdx = 0;
    if (liveTimer) window.clearTimeout(liveTimer);
    const raw = query.trim();
    if (!raw || isCommandMode || raw.length < 2) {
      livePhrases = [];
      return;
    }
    const clean = bangDetected ? bangDetected.cleanQuery.trim() : raw;
    if (clean.length < 2) {
      livePhrases = [];
      return;
    }
    liveTimer = window.setTimeout(async () => {
      livePhrases = await cove.fetchLiveSearchSuggestions(clean);
    }, 160);
  }

  function executeWebSearch(q: string, forcedEngine?: typeof primaryEngine) {
    const engines = enabledEngines.length ? enabledEngines : [cove.settings.searchEngines[0]];
    if (!forcedEngine && cove.settings.splitSearch && engines.length > 1) {
      engines.forEach((eng) => {
        cove.recordSignal({ type: 'search', engineId: eng.id, engineName: eng.name });
        const dest = eng.urlTemplate.replace('{q}', encodeURIComponent(q));
        cove.openUrlSafely(dest, true, `${q} — ${eng.name}`);
      });
      cove.notify(`Opened "${q}" across ${engines.length} engines.`);
    } else {
      const target = forcedEngine || primaryEngine || engines[0];
      cove.recordSignal({ type: 'search', engineId: target.id, engineName: target.name });
      const dest = target.urlTemplate.replace('{q}', encodeURIComponent(q));
      cove.openUrlSafely(dest, true, `${q} — ${target.name}`);
    }
    query = '';
    livePhrases = [];
  }

  function toggleEngine(id: string) {
    const currentEnabled = cove.settings.searchEngines.filter((e) => e.enabled);
    const target = cove.settings.searchEngines.find((e) => e.id === id);
    if (!target) return;
    if (target.enabled && currentEnabled.length <= 1) return;
    if (!target.enabled && currentEnabled.length >= 5) return;
    target.enabled = !target.enabled;
    if (target.enabled) {
      cove.recordSignal({ type: 'search', engineId: target.id, engineName: target.name });
    }
    cove.saveSettings();
  }

  function onKeyDown(e: KeyboardEvent) {
    if (e.key === 'ArrowDown' && suggestions.length > 0) {
      e.preventDefault();
      selectedIdx = (selectedIdx + 1) % suggestions.length;
    } else if (e.key === 'ArrowUp' && suggestions.length > 0) {
      e.preventDefault();
      selectedIdx = (selectedIdx - 1 + suggestions.length) % suggestions.length;
    } else if (e.key === 'Enter' && suggestions.length > 0) {
      e.preventDefault();
      suggestions[Math.min(selectedIdx, suggestions.length - 1)]?.execute();
    } else if (e.key === 'Escape') {
      query = '';
      livePhrases = [];
      inputEl?.blur();
    }
  }
</script>

<section class="search-capsule-wrap" aria-label="Search">
  <div class="search-pill" class:is-focused={focused} class:is-command={isCommandMode}>
    <span class="s-icon">
      {#if isCommandMode}
        <Icon name="command" size={17} />
      {:else if primaryEngine}
        <BrandIcon url={primaryEngine.domain} title={primaryEngine.name} size={18} radius={5} />
      {:else}
        <Icon name="search" size={17} />
      {/if}
    </span>

    <input
      bind:this={inputEl}
      bind:value={query}
      type="text"
      autocomplete="off"
      spellcheck="false"
      placeholder={t(lang, 'searchPlaceholder')}
      onfocus={() => {
        focused = true;
        selectedIdx = 0;
      }}
      onblur={() => {
        setTimeout(() => {
          focused = false;
        }, 170);
      }}
      oninput={triggerLiveSuggest}
      onkeydown={onKeyDown}
    />

    {#if query}
      <button
        type="button"
        class="s-clear"
        onclick={() => {
          query = '';
          livePhrases = [];
          inputEl?.focus();
        }}
        aria-label="Clear"
      >
        <Icon name="x" size={14} />
      </button>
    {/if}

    <button
      type="button"
      class="s-split-chip"
      class:active={cove.settings.splitSearch || Boolean(bangDetected)}
      onclick={() => {
        cove.settings.splitSearch = !cove.settings.splitSearch;
        cove.saveSettings();
      }}
      title="Split search or use !g / !gh / !yt / !w / !mdn bangs"
    >
      {#if bangDetected}
        {bangDetected.engine.bang} · {bangDetected.engine.shortLabel}
      {:else}
        {cove.settings.splitSearch ? `Split · ${enabledEngines.length}` : primaryEngine?.shortLabel || 'DDG'}
      {/if}
    </button>

    <button
      type="button"
      class="s-kbd-btn"
      onclick={() => {
        cove.commandInitialQuery = '';
        cove.commandPaletteOpen = true;
      }}
      title="Open Command Palette (⌘K)"
    >
      ⌘K
    </button>
  </div>

  {#if focused}
    <div class="engine-drawer">
      {#each cove.settings.searchEngines as eng (eng.id)}
        <button
          type="button"
          class="eng-chip"
          class:enabled={eng.enabled}
          class:predicted={primaryEngine?.id === eng.id}
          onmousedown={(e) => e.preventDefault()}
          onclick={() => toggleEngine(eng.id)}
          title={`${eng.name} (${eng.bang})`}
        >
          <BrandIcon url={eng.domain} title={eng.name} size={13} radius={3} />
          <span>{eng.name}</span>
          <small class="bang-hint">{eng.bang}</small>
        </button>
      {/each}
    </div>
  {/if}

  {#if focused && suggestions.length > 0}
    <div class="sug-popover" role="listbox">
      {#each suggestions as item, idx (item.id)}
        <button
          type="button"
          role="option"
          aria-selected={idx === selectedIdx}
          class="sug-item"
          class:selected={idx === selectedIdx}
          class:instant={item.kind === 'instant'}
          onmouseenter={() => (selectedIdx = idx)}
          onmousedown={(e) => e.preventDefault()}
          onclick={() => item.execute()}
        >
          <span class="sug-ico">
            {#if item.swatchHex}
              <span class="color-swatch" style="background: {item.swatchHex}"></span>
            {:else if item.kind === 'instant'}
              <Icon name="sparkle" size={15} />
            {:else if item.kind === 'autocomplete'}
              <Icon name="search" size={14} />
            {:else if item.faviconDomain || item.faviconUrl}
              <BrandIcon
                url={item.faviconDomain || item.title}
                title={item.title}
                explicitIcon={item.faviconUrl}
                size={18}
                radius={5}
              />
            {:else}
              <Icon
                name={item.kind === 'command'
                  ? 'command'
                  : item.kind === 'readlater'
                    ? 'bookmark'
                    : 'search'}
                size={14}
              />
            {/if}
          </span>
          <span class="sug-copy">
            <span class="sug-t">{item.title}</span>
            <span class="sug-s">{item.subtitle}</span>
          </span>
          {#if item.badge}
            <span class="sug-tag">{item.badge}</span>
          {/if}
        </button>
      {/each}
    </div>
  {/if}
</section>

<style>
  .search-capsule-wrap {
    width: 100%;
    max-width: 620px;
    margin: 0 auto 22px;
    position: relative;
    z-index: 32;
  }

  .search-pill {
    display: flex;
    align-items: center;
    gap: 11px;
    height: 52px;
    padding: 0 12px 0 18px;
    border-radius: var(--r-pill);
    background: var(--surface-card);
    backdrop-filter: var(--glass-blur);
    border: 1px solid var(--border-subtle);
    box-shadow: var(--shadow-card);
    transition:
      border-color var(--dur-fast) var(--ease-calm),
      box-shadow var(--dur-fast) var(--ease-calm),
      background var(--dur-fast) var(--ease-calm);
  }

  .search-pill.is-focused {
    border-color: var(--accent);
    background: var(--surface-overlay);
    box-shadow: var(--shadow-elevated), 0 0 0 3px var(--accent-soft);
  }

  .s-icon {
    width: 24px;
    height: 24px;
    border-radius: 7px;
    display: grid;
    place-items: center;
    color: var(--accent-text);
    flex-shrink: 0;
  }

  .search-pill input {
    flex: 1;
    min-width: 0;
    border: none;
    background: transparent;
    font-size: 14.5px;
    color: var(--text-primary);
    outline: none;
  }
  .search-pill input::placeholder {
    color: var(--text-muted);
  }

  .s-clear {
    width: 24px;
    height: 24px;
    border-radius: 50%;
    display: grid;
    place-items: center;
    color: var(--text-muted);
  }
  .s-clear:hover {
    background: var(--surface-hover);
    color: var(--text-primary);
  }

  .s-split-chip {
    padding: 4px 10px;
    border-radius: var(--r-pill);
    font-size: 11px;
    font-weight: 600;
    color: var(--text-secondary);
    background: var(--surface-row);
    border: 1px solid transparent;
    transition: all var(--dur-fast) var(--ease-calm);
  }
  .s-split-chip:hover {
    color: var(--text-primary);
  }
  .s-split-chip.active {
    background: var(--accent-soft);
    color: var(--accent-text);
    border-color: var(--accent);
  }

  .s-kbd-btn {
    padding: 4px 8px;
    border-radius: 8px;
    font-family: var(--font-mono);
    font-size: 11px;
    color: var(--text-muted);
    background: transparent;
  }
  .s-kbd-btn:hover {
    color: var(--text-primary);
    background: var(--surface-row);
  }

  .engine-drawer {
    display: flex;
    justify-content: center;
    flex-wrap: wrap;
    gap: 6px;
    margin-top: 8px;
  }

  .eng-chip {
    display: inline-flex;
    align-items: center;
    gap: 5px;
    padding: 4px 10px;
    border-radius: var(--r-pill);
    font-size: 11.5px;
    background: var(--surface-card);
    backdrop-filter: var(--glass-blur);
    border: 1px solid var(--border-subtle);
    color: var(--text-muted);
    opacity: 0.72;
    transition: all var(--dur-fast) var(--ease-calm);
  }
  .eng-chip.enabled {
    opacity: 1;
    color: var(--text-primary);
    border-color: var(--border-strong);
  }
  .eng-chip.predicted {
    border-color: var(--accent);
    box-shadow: 0 0 0 2px var(--accent-soft);
  }
  .bang-hint {
    font-family: var(--font-mono);
    font-size: 10px;
    opacity: 0.6;
  }

  .sug-popover {
    position: absolute;
    top: calc(100% + 7px);
    left: 0;
    right: 0;
    z-index: 55;
    padding: 7px;
    border-radius: 22px;
    background: var(--surface-overlay);
    backdrop-filter: var(--glass-blur-heavy);
    border: 1px solid var(--border-strong);
    box-shadow: var(--shadow-elevated);
    display: flex;
    flex-direction: column;
    gap: 3px;
  }

  @media (max-width: 520px) {
    .s-kbd-btn {
      display: none;
    }
    .search-pill {
      height: 48px;
      padding: 0 10px 0 14px;
    }
  }

  .sug-item {
    display: flex;
    align-items: center;
    gap: 11px;
    padding: 8px 11px;
    border-radius: 14px;
    text-align: left;
    transition: background var(--dur-fast) var(--ease-calm);
  }
  .sug-item.selected {
    background: var(--accent-soft);
  }
  .sug-item.instant {
    border: 1px solid color-mix(in oklch, var(--accent) 34%, transparent);
    background: color-mix(in oklch, var(--accent) 12%, transparent);
  }

  .sug-ico {
    width: 30px;
    height: 30px;
    border-radius: 9px;
    background: var(--surface-icon);
    color: var(--accent-text);
    display: grid;
    place-items: center;
    flex-shrink: 0;
  }
  .color-swatch {
    width: 18px;
    height: 18px;
    border-radius: 5px;
    border: 1px solid rgba(255, 255, 255, 0.5);
  }

  .sug-copy {
    flex: 1;
    min-width: 0;
    display: flex;
    flex-direction: column;
  }
  .sug-t {
    font-size: 13.5px;
    font-weight: 550;
    color: var(--text-primary);
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
  }
  .sug-s {
    font-size: 11px;
    color: var(--text-muted);
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
  }
  .sug-tag {
    font-size: 10.5px;
    font-family: var(--font-mono);
    padding: 2px 8px;
    border-radius: var(--r-pill);
    background: var(--surface-row);
    color: var(--text-secondary);
  }
</style>
