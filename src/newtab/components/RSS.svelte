<script lang="ts">
  import { STARTER_RSS_CATALOG } from '../../lib/defaults';
  import { formatTimeAgo } from '../../lib/rss-parser';
  import { cove } from '../../lib/state.svelte';
  import BrandIcon from './BrandIcon.svelte';
  import Icon from './Icon.svelte';

  let manageOpen = $state(false);
  let feedTitle = $state('');
  let feedUrl = $state('');

  async function handleAddFeed(e: SubmitEvent) {
    e.preventDefault();
    if (!feedUrl.trim()) return;
    await cove.addRssFeed(feedTitle, feedUrl);
    feedTitle = '';
    feedUrl = '';
  }
</script>

<div class="rss-bento">
  <div class="rss-top">
    <span class="rss-sub">{cove.rssFeeds.map((f) => f.title).join(' · ') || 'No feeds'}</span>
    <div class="rss-btns">
      <button type="button" class="r-chip" onclick={() => (manageOpen = !manageOpen)}>
        {manageOpen ? 'Done' : 'Feeds'}
      </button>
      <button type="button" class="r-ico" onclick={() => cove.refreshRss(true)} title="Refresh">
        <Icon name="refresh" size={12} />
      </button>
    </div>
  </div>

  {#if manageOpen}
    <div class="rss-drawer">
      <form class="f-row" onsubmit={handleAddFeed}>
        <input type="text" bind:value={feedUrl} placeholder="RSS/Atom URL…" required />
        <button type="submit" class="btn-primary">Add</button>
      </form>
      <div class="f-chips">
        {#each STARTER_RSS_CATALOG as st}
          {#if !cove.rssFeeds.some((f) => f.url === st.url)}
            <button type="button" class="add-st" onclick={() => cove.addRssFeed(st.title, st.url)}>
              + {st.title}
            </button>
          {/if}
        {/each}
      </div>
      <div class="f-chips">
        {#each cove.rssFeeds as f (f.id)}
          <span class="active-st">
            {f.title}
            <button type="button" onclick={() => cove.removeRssFeed(f.id)}>×</button>
          </span>
        {/each}
      </div>
    </div>
  {/if}

  <div class="rss-rows">
    {#if cove.rssEntries.length === 0}
      <div class="rss-empty">
        {cove.rssLoading ? 'Refreshing feeds…' : cove.rssError || 'Add up to 5 calm RSS feeds.'}
      </div>
    {:else}
      {#each cove.rssEntries.slice(0, 4) as entry (entry.id)}
        <a
          href={entry.link}
          target="_blank"
          rel="noopener noreferrer"
          class="rss-capsule"
          onclick={() => cove.recordSignal({ type: 'widget', widgetType: 'rss' })}
        >
          <span class="rss-ico">
            <BrandIcon url={entry.link} title={entry.source} size={16} radius={4} />
          </span>
          <span class="rss-copy">
            <span class="rss-t">{entry.title}</span>
            <span class="rss-m">{entry.source} · {formatTimeAgo(entry.publishedAt).replace(' ago', '')}</span>
          </span>
        </a>
      {/each}
    {/if}
  </div>
</div>

<style>
  .rss-bento {
    display: flex;
    flex-direction: column;
    gap: 8px;
    height: 100%;
  }

  .rss-top {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 6px;
  }
  .rss-sub {
    font-size: 11px;
    color: var(--text-muted);
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
  }
  .rss-btns {
    display: inline-flex;
    align-items: center;
    gap: 4px;
    flex-shrink: 0;
  }
  .r-chip {
    padding: 3px 9px;
    border-radius: var(--r-pill);
    font-size: 11px;
    background: var(--surface-row);
    color: var(--text-secondary);
  }
  .r-ico {
    width: 24px;
    height: 24px;
    border-radius: 50%;
    display: grid;
    place-items: center;
    background: var(--surface-row);
    color: var(--text-secondary);
  }

  .rss-drawer {
    padding: 8px;
    border-radius: 12px;
    background: var(--surface-row);
    display: flex;
    flex-direction: column;
    gap: 6px;
  }
  .f-row {
    display: flex;
    gap: 5px;
  }
  .f-row input {
    flex: 1;
    min-width: 0;
    padding: 5px 9px;
    border-radius: 8px;
    border: 1px solid var(--border-subtle);
    background: var(--surface-input);
    font-size: 11.5px;
  }
  .f-chips {
    display: flex;
    flex-wrap: wrap;
    gap: 4px;
  }
  .add-st {
    font-size: 10.5px;
    padding: 2px 7px;
    border-radius: var(--r-pill);
    background: var(--accent-soft);
    color: var(--accent-text);
  }
  .active-st {
    font-size: 10.5px;
    padding: 2px 7px;
    border-radius: var(--r-pill);
    background: var(--surface-hover);
    color: var(--text-secondary);
    display: inline-flex;
    align-items: center;
    gap: 4px;
  }

  .rss-rows {
    display: flex;
    flex-direction: column;
    gap: 6px;
    flex: 1;
  }
  .rss-empty {
    padding: 18px 8px;
    text-align: center;
    font-size: 12px;
    color: var(--text-muted);
  }
  .rss-capsule {
    display: flex;
    align-items: center;
    gap: 9px;
    padding: 7px 10px;
    border-radius: var(--r-row);
    background: var(--surface-row);
    border: 1px solid transparent;
    transition: background var(--dur-fast) var(--ease-calm), border-color var(--dur-fast) var(--ease-calm);
  }
  .rss-capsule:hover {
    background: var(--surface-hover);
    border-color: var(--border-subtle);
  }
  .rss-ico {
    width: 26px;
    height: 26px;
    border-radius: 8px;
    background: var(--surface-icon);
    border: 1px solid var(--border-subtle);
    display: grid;
    place-items: center;
    flex-shrink: 0;
  }
  .rss-copy {
    flex: 1;
    min-width: 0;
    display: flex;
    flex-direction: column;
  }
  .rss-t {
    font-size: 12.5px;
    font-weight: 500;
    color: var(--text-primary);
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
  }
  .rss-m {
    font-size: 10.5px;
    color: var(--text-muted);
  }
</style>
