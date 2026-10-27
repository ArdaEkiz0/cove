<script lang="ts">
  import { formatTimeAgo } from '../../lib/rss-parser';
  import { cove } from '../../lib/state.svelte';
  import type { BrowserTabItem } from '../../lib/types';
  import BrandIcon from './BrandIcon.svelte';
  import Icon from './Icon.svelte';

  type CleanFilter = 'all' | 'dupes' | 'stale' | 'audio' | 'updates';
  let filter = $state<CleanFilter>('all');
  let quickUrl = $state('');

  const tr = $derived(cove.triage);

  const activeTabs = $derived(cove.openTabs.filter((t) => !t.discarded));
  const totalRamMb = $derived(activeTabs.reduce((acc, t) => acc + t.estimatedRamMb, 0));
  const sweepableCount = $derived(tr.duplicateExtraCount + tr.staleTabs.length);

  const visibleTabs = $derived.by<BrowserTabItem[]>(() => {
    if (filter === 'dupes') {
      return tr.duplicateGroups.flatMap((g) => g.tabs);
    }
    if (filter === 'stale') return tr.staleTabs;
    if (filter === 'audio') return tr.audioTabs;
    if (filter === 'updates') return tr.updateTabs;
    return activeTabs;
  });

  const newestDupeIds = $derived(
    new Set(tr.duplicateGroups.map((g) => g.tabs[0]?.id).filter(Boolean))
  );

  function handleQuickOpen(e: SubmitEvent) {
    e.preventDefault();
    if (!quickUrl.trim()) return;
    cove.openUrlSafely(quickUrl.trim(), true);
    quickUrl = '';
  }
</script>

<div class="clean-tabs-widget">
  <div class="ct-toolbar">
    <div class="ct-filters" role="tablist">
      <button
        type="button"
        role="tab"
        aria-selected={filter === 'all'}
        class="ct-tab"
        class:active={filter === 'all'}
        onclick={() => (filter = 'all')}
      >
        <span>Open</span>
        <span class="ct-num">{activeTabs.length}</span>
      </button>

      <button
        type="button"
        role="tab"
        aria-selected={filter === 'dupes'}
        class="ct-tab"
        class:active={filter === 'dupes'}
        onclick={() => (filter = 'dupes')}
      >
        {#if tr.duplicateExtraCount > 0}<i class="dot warn"></i>{/if}
        <span>Duplicates</span>
        {#if tr.duplicateExtraCount > 0}<span class="ct-num">{tr.duplicateExtraCount}</span>{/if}
      </button>

      <button
        type="button"
        role="tab"
        aria-selected={filter === 'stale'}
        class="ct-tab"
        class:active={filter === 'stale'}
        onclick={() => (filter = 'stale')}
      >
        {#if tr.staleTabs.length > 0}<i class="dot"></i>{/if}
        <span>Stale</span>
        {#if tr.staleTabs.length > 0}<span class="ct-num">{tr.staleTabs.length}</span>{/if}
      </button>

      {#if cove.isExtension || tr.audioTabs.length > 0}
        <button
          type="button"
          role="tab"
          aria-selected={filter === 'audio'}
          class="ct-tab"
          class:active={filter === 'audio'}
          onclick={() => (filter = 'audio')}
        >
          {#if tr.audioTabs.length > 0}<i class="dot accent"></i>{/if}
          <span>Audio</span>
        </button>
      {/if}
    </div>

    <div class="ct-cta">
      {#if filter === 'dupes' && tr.duplicateExtraCount > 0}
        <button type="button" class="clean-pill accent" onclick={() => cove.deduplicateDomainTabs()}>
          Keep newest ({tr.duplicateExtraCount})
        </button>
      {:else if filter === 'stale' && tr.staleTabs.length > 0}
        <button type="button" class="clean-pill accent" onclick={() => cove.suspendStaleTabs()}>
          Rest all ({tr.staleTabs.length})
        </button>
      {:else if sweepableCount > 0}
        <button
          type="button"
          class="clean-pill accent"
          onclick={() => cove.smartSweepTabs()}
          title="One-click: close duplicate tabs and suspend stale background tabs"
        >
          <Icon name="sparkle" size={11} />
          <span>Smart Sweep ({sweepableCount})</span>
        </button>
      {:else if activeTabs.length > 0}
        <button
          type="button"
          class="clean-pill"
          onclick={() => cove.saveCurrentSession()}
          title="Save open tabs as session without closing them"
        >
          Snapshot
        </button>
      {/if}
    </div>
  </div>

  <div class="ct-list">
    {#if cove.openTabs.length === 0}
      <div class="ct-live-empty">
        <p class="empty-headline">
          {cove.isExtension
            ? 'No other browser tabs open in this window.'
            : 'Zero fake tabs — tracks real links you launch & live Cove tabs.'}
        </p>
        <form class="quick-open-bar" onsubmit={handleQuickOpen}>
          <input
            type="text"
            bind:value={quickUrl}
            placeholder="Launch URL in workspace (e.g. news.ycombinator.com)…"
          />
          <button type="submit" class="clean-pill accent">Open ↗</button>
        </form>
      </div>
    {:else if visibleTabs.length === 0}
      <div class="ct-empty">
        <span>All clear — zero {filter} tabs right now.</span>
      </div>
    {:else}
      {#each visibleTabs.slice(0, 6) as tab (tab.id)}
        <div class="capsule-row">
          <button type="button" class="row-main" onclick={() => cove.jumpToTab(tab)}>
            <span class="row-icon">
              <BrandIcon
                url={tab.url}
                title={tab.title}
                explicitIcon={tab.favIconUrl}
                size={18}
                radius={4}
              />
            </span>

            <span class="row-title">{tab.title}</span>

            <span class="row-meta">
              {#if filter === 'dupes' && newestDupeIds.has(tab.id)}
                <span class="micro-tag ok">newest</span>
              {:else if tab.source === 'cove-peer'}
                <span class="micro-tag accent">live peer</span>
              {:else if tab.audible && !tab.muted}
                <span class="micro-tag accent">audio</span>
              {:else if tab.unreadCount > 0}
                <span class="micro-tag accent">{tab.unreadCount} new</span>
              {:else}
                <span class="row-domain">{tab.domain}</span>
                <span class="row-age">{formatTimeAgo(tab.lastAccessed).replace(' ago', '')}</span>
              {/if}
            </span>
          </button>

          {#if tab.source !== 'cove-peer'}
            <button
              type="button"
              class="row-action"
              onclick={() => cove.closeSingleTab(tab.id)}
              aria-label="Remove from workspace"
              title="Close / remove"
            >
              <Icon name="x" size={13} />
            </button>
          {/if}
        </div>
      {/each}
    {/if}
  </div>

  <div class="ct-foot">
    <span class="foot-stat">
      {#if cove.isExtension}
        {tr.totalTabs} browser tabs · ~{(totalRamMb / 1024).toFixed(1)} GB · {tr.computedInMs}ms worker
      {:else}
        {tr.totalTabs} live workspace {tr.totalTabs === 1 ? 'item' : 'items'} · {tr.computedInMs}ms worker
      {/if}
    </span>
    <div class="foot-links">
      {#if activeTabs.length > 0}
        <button type="button" onclick={() => cove.saveCurrentSession()}>+ Save session</button>
        <span>·</span>
      {/if}
      <button type="button" onclick={() => (cove.sessionsModalOpen = true)}>
        Sessions ({cove.sessions.length})
      </button>
    </div>
  </div>
</div>

<style>
  .clean-tabs-widget {
    display: flex;
    flex-direction: column;
    gap: 10px;
    height: 100%;
  }

  .ct-toolbar {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 8px;
    flex-wrap: wrap;
  }

  .ct-filters {
    display: inline-flex;
    align-items: center;
    gap: 2px;
    flex-wrap: wrap;
  }

  .ct-tab {
    display: inline-flex;
    align-items: center;
    gap: 5px;
    padding: 4px 9px;
    border-radius: var(--r-pill);
    font-size: 12px;
    color: var(--text-muted);
    transition: all var(--dur-fast) var(--ease-calm);
  }
  .ct-tab:hover {
    color: var(--text-primary);
  }
  .ct-tab.active {
    background: var(--surface-row);
    color: var(--text-primary);
    font-weight: 500;
  }

  .ct-num {
    font-family: var(--font-mono);
    font-size: 10.5px;
    opacity: 0.72;
  }

  .dot {
    width: 5px;
    height: 5px;
    border-radius: 50%;
    background: var(--text-muted);
  }
  .dot.warn { background: var(--status-warn); }
  .dot.accent { background: var(--accent); }

  .clean-pill {
    display: inline-flex;
    align-items: center;
    gap: 5px;
    padding: 4px 11px;
    border-radius: var(--r-pill);
    font-size: 11.5px;
    font-weight: 500;
    background: var(--surface-row);
    border: 1px solid var(--border-subtle);
    color: var(--text-secondary);
    transition: all var(--dur-fast) var(--ease-calm);
    white-space: nowrap;
  }
  .clean-pill:hover {
    background: var(--surface-hover);
    color: var(--text-primary);
  }
  .clean-pill.accent {
    background: var(--accent-soft);
    border-color: color-mix(in oklch, var(--accent) 42%, transparent);
    color: var(--accent-text);
  }

  .ct-list {
    display: flex;
    flex-direction: column;
    gap: 6px;
    flex: 1;
  }

  .ct-live-empty {
    flex: 1;
    display: flex;
    flex-direction: column;
    justify-content: center;
    gap: 10px;
    padding: 14px;
    border-radius: 14px;
    background: var(--surface-row);
    border: 1px dashed var(--border-subtle);
  }
  .empty-headline {
    margin: 0;
    font-size: 12px;
    color: var(--text-secondary);
    line-height: 1.45;
  }
  .quick-open-bar {
    display: flex;
    gap: 6px;
  }
  .quick-open-bar input {
    flex: 1;
    min-width: 0;
    padding: 6px 10px;
    border-radius: 999px;
    border: 1px solid var(--border-subtle);
    background: var(--surface-input);
    font-size: 12px;
  }

  .ct-empty {
    flex: 1;
    display: grid;
    place-items: center;
    padding: 22px 12px;
    font-size: 12.5px;
    color: var(--text-muted);
  }

  .capsule-row {
    display: flex;
    align-items: center;
    gap: 4px;
    height: 42px;
    padding: 0 8px 0 6px;
    border-radius: var(--r-row);
    background: var(--surface-row);
    border: 1px solid transparent;
    transition:
      background var(--dur-fast) var(--ease-calm),
      border-color var(--dur-fast) var(--ease-calm);
  }
  .capsule-row:hover {
    background: var(--surface-hover);
    border-color: var(--border-subtle);
  }

  .row-main {
    flex: 1;
    min-width: 0;
    height: 100%;
    display: flex;
    align-items: center;
    gap: 10px;
    text-align: left;
    padding: 0 2px;
  }

  .row-icon {
    width: 28px;
    height: 28px;
    border-radius: 9px;
    background: var(--surface-icon);
    border: 1px solid var(--border-subtle);
    display: grid;
    place-items: center;
    flex-shrink: 0;
  }

  .row-title {
    flex: 1;
    min-width: 0;
    font-size: 13px;
    font-weight: 500;
    color: var(--text-primary);
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
  }

  .row-meta {
    display: inline-flex;
    align-items: center;
    gap: 8px;
    flex-shrink: 0;
    font-size: 11.5px;
    color: var(--text-muted);
  }

  .row-domain {
    max-width: 115px;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }

  .row-age {
    font-family: var(--font-mono);
    font-size: 10.5px;
    opacity: 0.72;
  }

  .micro-tag {
    display: inline-flex;
    align-items: center;
    gap: 4px;
    font-size: 10.5px;
    font-weight: 550;
    padding: 2px 7px;
    border-radius: var(--r-pill);
    background: var(--surface-subtle);
  }
  .micro-tag.ok {
    color: var(--status-ok);
    background: var(--status-ok-soft);
  }
  .micro-tag.accent {
    color: var(--accent-text);
    background: var(--accent-soft);
  }

  .row-action {
    width: 24px;
    height: 24px;
    border-radius: 7px;
    display: grid;
    place-items: center;
    color: var(--text-muted);
    opacity: 0;
    transition: opacity var(--dur-fast) var(--ease-calm), background var(--dur-fast) var(--ease-calm);
  }
  .capsule-row:hover .row-action,
  .row-action:focus-visible {
    opacity: 1;
  }
  .row-action:hover {
    background: var(--status-danger-soft);
    color: var(--status-danger);
  }

  .ct-foot {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding-top: 4px;
    font-size: 11.5px;
    color: var(--text-muted);
  }
  .foot-stat {
    font-family: var(--font-mono);
    font-size: 10.5px;
  }
  .foot-links {
    display: inline-flex;
    align-items: center;
    gap: 6px;
  }
  .foot-links button {
    font-size: 11.5px;
    color: var(--text-secondary);
    padding: 0;
  }
  .foot-links button:hover {
    color: var(--accent-text);
  }

  @media (max-width: 600px) {
    .row-domain {
      display: none;
    }
  }
</style>
