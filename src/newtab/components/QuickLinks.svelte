<script lang="ts">
  import { extractDomain } from '../../background/triage-core';
  import { cove } from '../../lib/state.svelte';
  import type { QuickLinkItem } from '../../lib/types';
  import BrandIcon from './BrandIcon.svelte';
  import Icon from './Icon.svelte';

  let selectedGroupId = $state<string>('auto');
  let showAddForm = $state(false);
  let newTitle = $state('');
  let newUrl = $state('');
  let bookmarkFileInput: HTMLInputElement | null = null;

  let editingItem = $state<QuickLinkItem | null>(null);
  let contextMenu = $state<{ x: number; y: number; item: QuickLinkItem } | null>(null);
  let draggedLinkId = $state<string | null>(null);

  const sortedGroups = $derived.by(() => {
    const ctx = cove.activeContext;
    return [...cove.quickLinkGroups].sort((a, b) => {
      const aMatch = a.context === ctx ? 0 : a.context === 'both' ? 1 : 2;
      const bMatch = b.context === ctx ? 0 : b.context === 'both' ? 1 : 2;
      return aMatch - bMatch;
    });
  });

  const displayedRanked = $derived.by(() => {
    let pool = cove.quickLinks;
    if (selectedGroupId === 'auto') {
      const matchingGroups = new Set(
        cove.quickLinkGroups
          .filter((g) => g.context === cove.activeContext || g.context === 'both')
          .map((g) => g.id)
      );
      pool = cove.quickLinks.filter((q) => matchingGroups.has(q.groupId));
    } else if (selectedGroupId !== 'all') {
      pool = cove.quickLinks.filter((q) => q.groupId === selectedGroupId);
    }
    return cove.getRankedQuickLinks(pool);
  });

  function getBadgeCount(item: QuickLinkItem): number {
    const dom = (item.badgeDomain || extractDomain(item.url)).toLowerCase();
    return cove.badgeCountsByDomain[dom] || 0;
  }

  function handleAddLink(e: SubmitEvent) {
    e.preventDefault();
    if (!newUrl.trim()) return;
    const url = /^https?:\/\//i.test(newUrl.trim()) ? newUrl.trim() : `https://${newUrl.trim()}`;
    const rawHost = extractDomain(url).split('.')[0] || 'Site';
    const prettyName = rawHost.charAt(0).toUpperCase() + rawHost.slice(1);
    const targetGroup =
      selectedGroupId !== 'auto' && selectedGroupId !== 'all'
        ? selectedGroupId
        : sortedGroups[0]?.id || 'grp-work';
    cove.addQuickLink({
      title: newTitle.trim() || prettyName,
      url,
      groupId: targetGroup
    });
    newTitle = '';
    newUrl = '';
    showAddForm = false;
  }

  async function handleBookmarkImport(e: Event) {
    const input = e.currentTarget as HTMLInputElement;
    const file = input.files?.[0];
    if (!file) return;
    const html = await file.text();
    await cove.importBookmarksHtmlFile(html);
    input.value = '';
  }

  function openContextMenu(e: MouseEvent, item: QuickLinkItem) {
    e.preventDefault();
    e.stopPropagation();
    contextMenu = {
      x: Math.min(e.clientX, window.innerWidth - 190),
      y: Math.min(e.clientY, window.innerHeight - 150),
      item
    };
  }
</script>

<svelte:window onclick={() => (contextMenu = null)} />

<div class="qa-widget">
  <div class="qa-bar">
    <div class="qa-groups" role="tablist">
      <button
        type="button"
        role="tab"
        aria-selected={selectedGroupId === 'auto'}
        class="qa-tab"
        class:active={selectedGroupId === 'auto'}
        onclick={() => (selectedGroupId = 'auto')}
      >
        {cove.activeContext === 'work' ? 'Work' : 'Personal'}
      </button>
      {#each sortedGroups as g (g.id)}
        {#if g.name.toLowerCase() !== cove.activeContext}
          <button
            type="button"
            role="tab"
            aria-selected={selectedGroupId === g.id}
            class="qa-tab"
            class:active={selectedGroupId === g.id}
            onclick={() => (selectedGroupId = g.id)}
          >
            {g.name}
          </button>
        {/if}
      {/each}
      <button
        type="button"
        role="tab"
        aria-selected={selectedGroupId === 'all'}
        class="qa-tab"
        class:active={selectedGroupId === 'all'}
        onclick={() => (selectedGroupId = 'all')}
      >
        All
      </button>
    </div>

    <div class="qa-actions">
      <input
        bind:this={bookmarkFileInput}
        type="file"
        accept=".html,.htm"
        hidden
        onchange={handleBookmarkImport}
      />
      <button
        type="button"
        class="import-mini"
        onclick={() => bookmarkFileInput?.click()}
        title="Import real Chrome / Firefox / Safari / Arc bookmarks (.html)"
      >
        Import
      </button>

      {#if !cove.settings.smartEngine.whisperMode}
        <button
          type="button"
          class="smart-rank-btn"
          class:on={cove.settings.smartEngine.smartSortLinks}
          onclick={() => {
            cove.settings.smartEngine.smartSortLinks = !cove.settings.smartEngine.smartSortLinks;
            cove.saveSettings();
          }}
          title="Rank shortcuts dynamically by your current-hour habits"
        >
          <Icon name="sparkle" size={11} />
        </button>
      {/if}
    </div>
  </div>

  {#if showAddForm}
    <form class="qa-form" onsubmit={handleAddLink}>
      <input type="text" bind:value={newTitle} placeholder="Name (optional)" />
      <input type="text" bind:value={newUrl} placeholder="URL (e.g. stripe.com)" required />
      <button type="submit" class="btn-primary">Add</button>
    </form>
  {/if}

  {#if editingItem}
    <form
      class="qa-form"
      onsubmit={(e) => {
        e.preventDefault();
        if (editingItem) cove.updateQuickLink(editingItem);
        editingItem = null;
      }}
    >
      <input type="text" bind:value={editingItem.title} required />
      <input type="text" bind:value={editingItem.url} required />
      <button type="submit" class="btn-primary">Save</button>
    </form>
  {/if}

  <div class="qa-grid" style="--qa-cols: {cove.settings.quickLinkCols};">
    {#each displayedRanked.slice(0, Math.max(7, cove.settings.quickLinkCols * 2 - 1)) as entry (entry.item.id)}
      {@const item = entry.item}
      {@const badge = getBadgeCount(item)}
      <!-- svelte-ignore a11y_no_static_element_interactions -->
      <div
        class="qa-tile"
        class:top-pick={entry.isTopPick || entry.isChainNext}
        draggable="true"
        ondragstart={() => (draggedLinkId = item.id)}
        ondragover={(e) => e.preventDefault()}
        ondrop={() => {
          if (draggedLinkId) cove.reorderQuickLinks(draggedLinkId, item.id);
          draggedLinkId = null;
        }}
        oncontextmenu={(e) => openContextMenu(e, item)}
      >
        <button
          type="button"
          class="qa-tile-btn"
          onclick={() => cove.openQuickLink(item, true)}
          title={entry.isChainNext
            ? `${item.title} · Next in your learned workflow chain`
            : entry.isTopPick
              ? `${item.title} · #1 Smart Engine pick this hour`
              : item.title}
        >
          <span class="qa-squircle">
            <BrandIcon
              url={item.url}
              title={item.title}
              explicitIcon={item.customIcon}
              size={25}
              radius={6}
            />
            {#if badge > 0}
              <span class="qa-badge">{badge}</span>
            {:else if !cove.settings.smartEngine.whisperMode && (entry.isChainNext || entry.isTopPick)}
              <span class="qa-smart-dot" title={entry.isChainNext ? 'Next in workflow chain' : 'Predicted #1 right now'}></span>
            {/if}
          </span>
          <span class="qa-label">{item.title}</span>
        </button>
      </div>
    {/each}

    <div class="qa-tile add-tile">
      <button
        type="button"
        class="qa-tile-btn"
        onclick={() => (showAddForm = !showAddForm)}
      >
        <span class="qa-squircle ghost">
          <Icon name="plus" size={18} />
        </span>
        <span class="qa-label muted">Add</span>
      </button>
    </div>
  </div>
</div>

{#if contextMenu}
  <!-- svelte-ignore a11y_click_events_have_key_events -->
  <!-- svelte-ignore a11y_no_static_element_interactions -->
  <div
    class="qa-menu"
    style="left: {contextMenu.x}px; top: {contextMenu.y}px"
    onclick={(e) => e.stopPropagation()}
  >
    <button
      type="button"
      onclick={() => {
        if (contextMenu) cove.openQuickLink(contextMenu.item, true);
        contextMenu = null;
      }}
    >
      Open in new tab
    </button>
    <button
      type="button"
      onclick={() => {
        if (contextMenu) editingItem = { ...contextMenu.item };
        contextMenu = null;
      }}
    >
      Edit shortcut
    </button>
    <button
      type="button"
      class="danger"
      onclick={() => {
        if (contextMenu) cove.removeQuickLink(contextMenu.item.id);
        contextMenu = null;
      }}
    >
      Remove
    </button>
  </div>
{/if}

<style>
  .qa-widget {
    display: flex;
    flex-direction: column;
    gap: 10px;
    height: 100%;
  }

  .qa-bar {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 6px;
  }

  .qa-groups {
    display: flex;
    gap: 3px;
    flex-wrap: wrap;
  }

  .qa-actions {
    display: inline-flex;
    align-items: center;
    gap: 5px;
  }

  .import-mini {
    font-size: 10.5px;
    padding: 3px 8px;
    border-radius: var(--r-pill);
    background: var(--surface-subtle);
    color: var(--text-muted);
    transition: all var(--dur-fast) var(--ease-calm);
  }
  .import-mini:hover {
    color: var(--text-primary);
    background: var(--surface-hover);
  }

  .qa-tab {
    padding: 3px 9px;
    border-radius: var(--r-pill);
    font-size: 11.5px;
    color: var(--text-muted);
    transition: all var(--dur-fast) var(--ease-calm);
  }
  .qa-tab:hover {
    color: var(--text-primary);
  }
  .qa-tab.active {
    background: var(--surface-row);
    color: var(--text-primary);
    font-weight: 500;
  }

  .smart-rank-btn {
    width: 24px;
    height: 24px;
    border-radius: 50%;
    display: grid;
    place-items: center;
    color: var(--text-muted);
    background: var(--surface-subtle);
    transition: all var(--dur-fast) var(--ease-calm);
  }
  .smart-rank-btn.on {
    color: var(--accent-text);
    background: var(--accent-soft);
  }

  .qa-form {
    display: flex;
    gap: 6px;
    flex-wrap: wrap;
  }
  .qa-form input {
    flex: 1;
    min-width: 85px;
    padding: 6px 10px;
    border-radius: 10px;
    border: 1px solid var(--border-subtle);
    background: var(--surface-input);
    font-size: 12px;
  }

  .qa-grid {
    display: grid;
    grid-template-columns: repeat(var(--qa-cols, 4), minmax(0, 1fr));
    gap: 10px;
    flex: 1;
  }

  @media (max-width: 560px) {
    .qa-grid {
      grid-template-columns: repeat(auto-fill, minmax(74px, 1fr));
      gap: 8px;
    }
  }

  .qa-tile {
    border-radius: 18px;
    background: var(--surface-row);
    border: 1px solid transparent;
    transition:
      transform var(--dur-fast) var(--ease-spring),
      background var(--dur-fast) var(--ease-calm),
      border-color var(--dur-fast) var(--ease-calm);
  }
  .qa-tile:hover {
    background: var(--surface-hover);
    border-color: var(--border-subtle);
    transform: translateY(-2px);
  }
  .qa-tile.top-pick {
    border-color: color-mix(in oklch, var(--accent) 32%, transparent);
  }

  .qa-tile-btn {
    width: 100%;
    height: 100%;
    padding: 13px 8px 11px;
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    gap: 8px;
  }

  .qa-squircle {
    position: relative;
    width: 42px;
    height: 42px;
    border-radius: 13px;
    background: var(--surface-icon);
    border: 1px solid var(--border-subtle);
    box-shadow: inset 0 1px 0 rgba(255, 255, 255, 0.14), 0 4px 10px rgba(0, 0, 0, 0.12);
    display: grid;
    place-items: center;
  }
  .qa-squircle.ghost {
    background: transparent;
    border: 1px dashed var(--border-strong);
    box-shadow: none;
    color: var(--text-muted);
  }

  .qa-badge {
    position: absolute;
    top: -5px;
    right: -5px;
    min-width: 16px;
    height: 16px;
    padding: 0 4px;
    border-radius: var(--r-pill);
    background: var(--accent);
    color: var(--accent-ink);
    font-family: var(--font-mono);
    font-size: 10px;
    font-weight: 700;
    display: inline-grid;
    place-items: center;
  }

  .qa-smart-dot {
    position: absolute;
    top: -3px;
    right: -3px;
    width: 8px;
    height: 8px;
    border-radius: 50%;
    background: var(--accent);
    box-shadow: 0 0 8px var(--accent);
  }

  .qa-label {
    font-size: 11.5px;
    font-weight: 500;
    color: var(--text-primary);
    max-width: 100%;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
  }
  .qa-label.muted {
    color: var(--text-muted);
  }

  .qa-menu {
    position: fixed;
    z-index: 150;
    min-width: 160px;
    padding: 6px;
    border-radius: 16px;
    background: var(--surface-overlay);
    backdrop-filter: var(--glass-blur-heavy);
    border: 1px solid var(--border-strong);
    box-shadow: var(--shadow-elevated);
    display: flex;
    flex-direction: column;
    gap: 2px;
  }
  .qa-menu button {
    padding: 7px 11px;
    border-radius: 10px;
    text-align: left;
    font-size: 12.5px;
  }
  .qa-menu button:hover {
    background: var(--surface-hover);
  }
  .qa-menu button.danger {
    color: var(--status-danger);
  }
</style>
