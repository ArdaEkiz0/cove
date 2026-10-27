<script lang="ts">
  import { buildPaletteIndex, type PaletteItem } from '../../lib/commands';
  import { fuzzyFilter, highlightMatches } from '../../lib/fuzzy';
  import { t } from '../../lib/i18n';
  import { resolveInstantAnswer } from '../../lib/instant-answer';
  import { cove } from '../../lib/state.svelte';
  import BrandIcon from './BrandIcon.svelte';
  import Icon from './Icon.svelte';

  let query = $state('');
  let activeCategory = $state<string>('All');
  let selectedIdx = $state(0);
  let inputEl = $state<HTMLInputElement | null>(null);

  const CATEGORIES = [
    'All',
    'Smart Engine',
    'Tab Ops',
    'Open Tab',
    'Session',
    'Quick Link',
    'Note',
    'Read Later',
    'Focus',
    'System'
  ];

  $effect(() => {
    if (cove.commandPaletteOpen) {
      query = cove.commandInitialQuery || '';
      activeCategory = 'All';
      selectedIdx = 0;
      queueMicrotask(() => inputEl?.focus());
    }
  });

  const instantResult = $derived(resolveInstantAnswer(query, cove.now));

  const filteredResults = $derived.by(() => {
    const t0 = performance.now();
    const all = buildPaletteIndex(query);
    const scoped =
      activeCategory === 'All' ? all : all.filter((item) => item.category === activeCategory);
    const matches = fuzzyFilter<PaletteItem>(
      query,
      scoped,
      (item) => `${item.title} ${item.searchText}`,
      35
    );
    const elapsedMs = Math.round((performance.now() - t0) * 100) / 100;
    return { matches, elapsedMs, totalIndexed: all.length };
  });

  function close() {
    cove.commandPaletteOpen = false;
  }

  function executeItem(item: PaletteItem) {
    close();
    item.run();
  }

  function runInstant() {
    if (!instantResult) return;
    if (instantResult.focusMinutes) {
      cove.startFocus(instantResult.focusMinutes);
      cove.setLayoutMode('focus');
    } else if (instantResult.copyText) {
      navigator.clipboard?.writeText(instantResult.copyText);
      cove.notify(`Copied ${instantResult.copyText}`);
    }
    close();
  }

  function onKeyDown(e: KeyboardEvent) {
    const len = filteredResults.matches.length;
    if (e.key === 'Escape') {
      e.preventDefault();
      close();
    } else if (e.key === 'ArrowDown' && len > 0) {
      e.preventDefault();
      selectedIdx = (selectedIdx + 1) % len;
    } else if (e.key === 'ArrowUp' && len > 0) {
      e.preventDefault();
      selectedIdx = (selectedIdx - 1 + len) % len;
    } else if (e.key === 'Enter') {
      e.preventDefault();
      if (instantResult && selectedIdx === 0) {
        runInstant();
        return;
      }
      if (len > 0) {
        const target = filteredResults.matches[Math.min(selectedIdx, len - 1)];
        if (target) executeItem(target.item);
      }
    }
  }
</script>

{#if cove.commandPaletteOpen}
  <!-- svelte-ignore a11y_click_events_have_key_events -->
  <!-- svelte-ignore a11y_no_static_element_interactions -->
  <div class="palette-backdrop" onclick={close}>
    <div
      class="palette-modal"
      role="dialog"
      aria-modal="true"
      aria-label="Command Palette"
      tabindex="-1"
      onclick={(e) => e.stopPropagation()}
      onkeydown={onKeyDown}
    >
      <div class="palette-input-row">
        <Icon name="command" size={18} />
        <input
          bind:this={inputEl}
          bind:value={query}
          type="text"
          autocomplete="off"
          spellcheck="false"
          placeholder={t(cove.settings.language, 'commandPlaceholder')}
          oninput={() => (selectedIdx = 0)}
        />
        <span class="kbd">ESC</span>
      </div>

      <div class="palette-cats">
        {#each CATEGORIES as cat}
          <button
            type="button"
            class="cat-pill"
            class:active={activeCategory === cat}
            onclick={() => {
              activeCategory = cat;
              selectedIdx = 0;
              inputEl?.focus();
            }}
          >
            {cat}
          </button>
        {/each}
      </div>

      <div class="palette-list" role="listbox">
        {#if instantResult}
          <button type="button" class="instant-banner" onclick={runInstant}>
            <span class="ib-ico">
              <Icon name="sparkle" size={15} />
            </span>
            <span class="ib-copy">
              <strong>{instantResult.primary}</strong>
              <small>{instantResult.secondary}</small>
            </span>
            <span class="kbd">↵</span>
          </button>
        {/if}

        {#if filteredResults.matches.length === 0 && !instantResult}
          <div class="palette-empty">
            No local matches. Try <code>48 * 19.5</code>, <code>time in tokyo</code>, <code>note: idea</code>, or <code>save session: work</code>.
          </div>
        {:else}
          {#each filteredResults.matches as entry, idx (entry.item.id)}
            <button
              type="button"
              role="option"
              aria-selected={idx === selectedIdx}
              class="palette-item"
              class:selected={idx === selectedIdx}
              onmouseenter={() => (selectedIdx = idx)}
              onclick={() => executeItem(entry.item)}
            >
              <span class="p-icon">
                {#if entry.item.faviconDomain || entry.item.faviconUrl}
                  <BrandIcon
                    url={entry.item.faviconDomain || entry.item.title}
                    title={entry.item.title}
                    explicitIcon={entry.item.faviconUrl}
                    size={18}
                    radius={4}
                  />
                {:else}
                  <Icon name={entry.item.icon} size={15} />
                {/if}
              </span>
              <span class="p-main">
                <span class="p-title">
                  {#each highlightMatches(entry.item.title, entry.matches.filter((m) => m < entry.item.title.length)) as seg}
                    {#if seg.matched}
                      <mark>{seg.text}</mark>
                    {:else}
                      {seg.text}
                    {/if}
                  {/each}
                </span>
                {#if entry.item.subtitle}
                  <span class="p-sub">{entry.item.subtitle}</span>
                {/if}
              </span>
              <span class="p-meta">
                {#if entry.item.badge}
                  <span class="p-badge">{entry.item.badge}</span>
                {/if}
                <span class="p-cat">{entry.item.category}</span>
                {#if entry.item.shortcut}
                  <span class="kbd">{entry.item.shortcut}</span>
                {/if}
              </span>
            </button>
          {/each}
        {/if}
      </div>

      <footer class="palette-footer">
        <span>
          Tips: <code>18% of 4800</code> · <code>focus 45</code> · <code>save session: work</code>
        </span>
        <span class="mono">
          {filteredResults.totalIndexed} indexed · {filteredResults.elapsedMs}ms
        </span>
      </footer>
    </div>
  </div>
{/if}

<style>
  .palette-backdrop {
    position: fixed;
    inset: 0;
    z-index: 140;
    background: var(--backdrop-scrim);
    backdrop-filter: blur(8px);
    display: flex;
    align-items: flex-start;
    justify-content: center;
    padding: 9vh 16px 24px;
  }

  .palette-modal {
    width: 100%;
    max-width: 670px;
    border-radius: var(--r-xl);
    background: var(--surface-overlay);
    backdrop-filter: var(--glass-blur-heavy);
    border: 1px solid var(--border-strong);
    box-shadow: var(--shadow-elevated);
    overflow: hidden;
    display: flex;
    flex-direction: column;
    max-height: 78vh;
  }

  .palette-input-row {
    display: flex;
    align-items: center;
    gap: 12px;
    padding: 16px 18px;
    border-bottom: 1px solid var(--border-subtle);
    color: var(--accent-text);
  }

  .palette-input-row input {
    flex: 1;
    border: none;
    background: transparent;
    font-size: 16px;
    color: var(--text-primary);
    outline: none;
  }

  .palette-cats {
    display: flex;
    gap: 5px;
    padding: 8px 14px;
    overflow-x: auto;
    border-bottom: 1px solid var(--border-subtle);
  }

  .cat-pill {
    padding: 3px 9px;
    border-radius: var(--r-pill);
    font-size: 11.5px;
    color: var(--text-muted);
    white-space: nowrap;
    transition: all var(--dur-fast) var(--ease-calm);
  }
  .cat-pill:hover {
    color: var(--text-primary);
    background: var(--surface-subtle);
  }
  .cat-pill.active {
    background: var(--accent-soft);
    color: var(--accent-text);
    font-weight: 500;
  }

  .palette-list {
    flex: 1;
    overflow-y: auto;
    padding: 7px;
    display: flex;
    flex-direction: column;
    gap: 2px;
  }

  .instant-banner {
    display: flex;
    align-items: center;
    gap: 11px;
    width: 100%;
    padding: 10px 12px;
    margin-bottom: 4px;
    border-radius: 14px;
    background: color-mix(in oklch, var(--accent) 14%, transparent);
    border: 1px solid color-mix(in oklch, var(--accent) 36%, transparent);
    text-align: left;
  }
  .ib-ico {
    width: 30px;
    height: 30px;
    border-radius: 9px;
    background: var(--accent-soft);
    color: var(--accent-text);
    display: grid;
    place-items: center;
  }
  .ib-copy {
    flex: 1;
    display: flex;
    flex-direction: column;
  }
  .ib-copy strong {
    font-size: 14px;
    color: var(--text-primary);
  }
  .ib-copy small {
    font-size: 11px;
    color: var(--text-secondary);
  }

  .palette-empty {
    padding: 28px 18px;
    text-align: center;
    color: var(--text-muted);
    font-size: 13px;
  }
  .palette-empty code {
    font-family: var(--font-mono);
    background: var(--surface-subtle);
    padding: 2px 5px;
    border-radius: 4px;
    color: var(--accent-text);
  }

  .palette-item {
    display: flex;
    align-items: center;
    gap: 11px;
    width: 100%;
    padding: 8px 11px;
    border-radius: 13px;
    text-align: left;
    transition: background var(--dur-fast) var(--ease-calm);
  }
  .palette-item.selected {
    background: var(--accent-soft);
  }

  .p-icon {
    width: 30px;
    height: 30px;
    border-radius: 9px;
    background: var(--surface-icon);
    border: 1px solid var(--border-subtle);
    color: var(--accent-text);
    display: grid;
    place-items: center;
    flex-shrink: 0;
  }

  .p-main {
    flex: 1;
    min-width: 0;
    display: flex;
    flex-direction: column;
  }
  .p-title {
    font-size: 13.5px;
    font-weight: 500;
    color: var(--text-primary);
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
  }
  .p-title mark {
    background: transparent;
    color: var(--accent-text);
    font-weight: 700;
    text-decoration: underline;
    text-underline-offset: 2px;
  }
  .p-sub {
    font-size: 11.5px;
    color: var(--text-muted);
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
  }

  .p-meta {
    display: inline-flex;
    align-items: center;
    gap: 6px;
    flex-shrink: 0;
  }
  .p-badge {
    font-size: 10.5px;
    font-family: var(--font-mono);
    padding: 2px 6px;
    border-radius: var(--r-pill);
    background: var(--surface-subtle);
    color: var(--accent-text);
  }
  .p-cat {
    font-size: 11px;
    color: var(--text-muted);
  }

  .palette-footer {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 10px;
    padding: 9px 16px;
    border-top: 1px solid var(--border-subtle);
    font-size: 11px;
    color: var(--text-muted);
    background: var(--surface-subtle);
  }
  .palette-footer code,
  .mono {
    font-family: var(--font-mono);
  }
  .palette-footer code {
    color: var(--text-secondary);
  }
</style>
