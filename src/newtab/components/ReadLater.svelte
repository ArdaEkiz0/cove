<script lang="ts">
  import { t } from '../../lib/i18n';
  import { formatTimeAgo } from '../../lib/rss-parser';
  import { cove } from '../../lib/state.svelte';
  import BrandIcon from './BrandIcon.svelte';
  import Icon from './Icon.svelte';

  let showCapture = $state(false);
  let urlInput = $state('');
  let noteInput = $state('');

  async function handleSave(e: SubmitEvent) {
    e.preventDefault();
    if (!urlInput.trim()) return;
    const raw = urlInput;
    const note = noteInput;
    urlInput = '';
    noteInput = '';
    showCapture = false;
    await cove.addReadLater(raw, undefined, note);
  }
</script>

<div class="rl-bento">
  <div class="rl-bar">
    <span class="rl-sub">{cove.readLater.length} in Offline Reader</span>
    <div class="rl-btns">
      {#if cove.readLater.length > 0}
        <button
          type="button"
          class="rl-pill accent"
          onclick={() => cove.surpriseMeReadLater()}
        >
          <Icon name="sparkle" size={12} />
          <span>{t(cove.settings.language, 'surpriseMe')}</span>
        </button>
      {/if}
      <button
        type="button"
        class="rl-pill"
        onclick={() => (showCapture = !showCapture)}
      >
        + Save URL
      </button>
    </div>
  </div>

  {#if showCapture || cove.readLater.length === 0}
    <form class="rl-capture" onsubmit={handleSave}>
      <input
        type="text"
        bind:value={urlInput}
        placeholder="Paste article URL to extract offline…"
        required
      />
      {#if showCapture}
        <input type="text" bind:value={noteInput} placeholder="Note (optional)" />
      {/if}
      <button type="submit" class="btn-primary">Save</button>
    </form>
  {/if}

  {#if cove.readLater.length === 0}
    <p class="rl-empty-hint">
      Paste any article URL above — Cove extracts clean prose into IndexedDB for distraction-free offline reading.
    </p>
  {:else}
    <div class="rl-rows">
      {#each cove.readLater.slice(0, 5) as item (item.id)}
        <div class="rl-capsule" class:is-read={item.read}>
          <button
            type="button"
            class="rl-open"
            onclick={() => cove.openArticleInReader(item)}
            title="Open in Distraction-Free Offline Reader"
          >
            <span class="rl-ico-box">
              <BrandIcon
                url={item.url}
                title={item.title}
                explicitIcon={item.image}
                size={18}
                radius={4}
              />
            </span>
            <span class="rl-copy">
              <span class="rl-title">{item.title}</span>
              <span class="rl-meta">
                {item.domain}
                {#if item.readingTimeMin}
                  · {item.readingTimeMin}m read
                {/if}
                · {formatTimeAgo(item.addedAt)}
              </span>
            </span>
            {#if item.contentHtml}
              <span class="offline-tag">Reader</span>
            {/if}
          </button>

          <button
            type="button"
            class="rl-ext"
            onclick={() => cove.openUrlSafely(item.url, true, item.title)}
            title="Open original web page"
            aria-label="Open original page"
          >
            <Icon name="external" size={12} />
          </button>

          <button
            type="button"
            class="rl-del"
            onclick={() => cove.removeReadLater(item.id)}
            aria-label="Remove"
          >
            <Icon name="x" size={12} />
          </button>
        </div>
      {/each}
    </div>
  {/if}
</div>

<style>
  .rl-bento {
    display: flex;
    flex-direction: column;
    gap: 9px;
    height: 100%;
  }

  .rl-bar {
    display: flex;
    align-items: center;
    justify-content: space-between;
  }
  .rl-sub {
    font-size: 11.5px;
    color: var(--text-muted);
  }
  .rl-btns {
    display: inline-flex;
    gap: 6px;
  }

  .rl-pill {
    display: inline-flex;
    align-items: center;
    gap: 5px;
    padding: 4px 10px;
    border-radius: var(--r-pill);
    font-size: 11.5px;
    font-weight: 500;
    background: var(--surface-row);
    color: var(--text-secondary);
    transition: all var(--dur-fast) var(--ease-calm);
  }
  .rl-pill:hover {
    color: var(--text-primary);
    background: var(--surface-hover);
  }
  .rl-pill.accent {
    background: var(--accent-soft);
    color: var(--accent-text);
  }

  .rl-capture {
    display: flex;
    gap: 6px;
    flex-wrap: wrap;
  }
  .rl-capture input {
    flex: 1;
    min-width: 115px;
    padding: 6px 10px;
    border-radius: 10px;
    border: 1px solid var(--border-subtle);
    background: var(--surface-input);
    font-size: 12px;
  }

  .rl-empty-hint {
    margin: 2px 0 0;
    font-size: 11.5px;
    color: var(--text-muted);
    line-height: 1.45;
  }

  .rl-rows {
    display: flex;
    flex-direction: column;
    gap: 6px;
  }

  .rl-capsule {
    display: flex;
    align-items: center;
    gap: 4px;
    padding: 7px 8px;
    border-radius: var(--r-row);
    background: var(--surface-row);
    border: 1px solid transparent;
    transition: background var(--dur-fast) var(--ease-calm), border-color var(--dur-fast) var(--ease-calm);
  }
  .rl-capsule:hover {
    background: var(--surface-hover);
    border-color: var(--border-subtle);
  }
  .rl-capsule.is-read .rl-title {
    opacity: 0.6;
  }

  .rl-open {
    flex: 1;
    min-width: 0;
    display: flex;
    align-items: center;
    gap: 10px;
    text-align: left;
  }

  .rl-ico-box {
    width: 28px;
    height: 28px;
    border-radius: 9px;
    background: var(--surface-icon);
    border: 1px solid var(--border-subtle);
    display: grid;
    place-items: center;
    flex-shrink: 0;
  }

  .rl-copy {
    flex: 1;
    min-width: 0;
    display: flex;
    flex-direction: column;
  }
  .rl-title {
    font-size: 12.5px;
    font-weight: 500;
    color: var(--text-primary);
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
  }
  .rl-meta {
    font-size: 11px;
    color: var(--text-muted);
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
  }

  .offline-tag {
    font-size: 9.5px;
    font-family: var(--font-mono);
    padding: 2px 6px;
    border-radius: var(--r-pill);
    background: var(--accent-soft);
    color: var(--accent-text);
  }

  .rl-ext,
  .rl-del {
    width: 22px;
    height: 22px;
    border-radius: 6px;
    display: grid;
    place-items: center;
    color: var(--text-muted);
    opacity: 0;
  }
  .rl-capsule:hover .rl-ext,
  .rl-capsule:hover .rl-del {
    opacity: 1;
  }
  .rl-ext:hover {
    color: var(--text-primary);
  }
  .rl-del:hover {
    color: var(--status-danger);
  }
</style>
