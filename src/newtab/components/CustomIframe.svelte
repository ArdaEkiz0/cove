<script lang="ts">
  import { cove } from '../../lib/state.svelte';
  import type { WidgetConfig } from '../../lib/types';

  interface Props {
    widget: WidgetConfig;
  }
  let { widget }: Props = $props();
  let editing = $state(false);
  let urlDraft = $state('');

  function saveUrl(e: SubmitEvent) {
    e.preventDefault();
    widget.iframeUrl = /^https?:\/\//i.test(urlDraft.trim())
      ? urlDraft.trim()
      : `https://${urlDraft.trim()}`;
    cove.saveSettings();
    editing = false;
  }
</script>

<div class="iframe-widget">
  <div class="if-bar">
    <span class="mono">{widget.iframeUrl || 'https://example.org'}</span>
    <button
      type="button"
      class="tiny-btn"
      onclick={() => {
        urlDraft = widget.iframeUrl || '';
        editing = !editing;
      }}
    >
      {editing ? 'Close' : 'Set URL'}
    </button>
  </div>

  {#if editing}
    <form class="if-form" onsubmit={saveUrl}>
      <input type="text" bind:value={urlDraft} placeholder="https://localhost:8080 or tool URL" required />
      <button type="submit" class="btn-primary">Embed</button>
    </form>
  {/if}

  <iframe
    title={widget.iframeTitle || 'Custom Widget'}
    src={widget.iframeUrl || 'https://example.org'}
    sandbox="allow-scripts allow-forms allow-same-origin"
    loading="lazy"
  ></iframe>
</div>

<style>
  .iframe-widget {
    display: flex;
    flex-direction: column;
    gap: 6px;
    height: 100%;
  }
  .if-bar {
    display: flex;
    justify-content: space-between;
    align-items: center;
    gap: 8px;
  }
  .mono {
    font-family: var(--font-mono);
    font-size: 11px;
    color: var(--text-muted);
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }
  .tiny-btn {
    font-size: 11px;
    color: var(--accent-text);
  }
  .if-form {
    display: flex;
    gap: 6px;
  }
  .if-form input {
    flex: 1;
    padding: 5px 8px;
    border-radius: 6px;
    border: 1px solid var(--border-subtle);
    background: var(--surface-input);
    font-size: 12px;
  }
  iframe {
    width: 100%;
    min-height: 165px;
    flex: 1;
    border: 1px solid var(--border-subtle);
    border-radius: var(--r-sm);
    background: var(--surface-input);
  }
</style>
