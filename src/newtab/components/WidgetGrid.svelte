<script lang="ts">
  import { t } from '../../lib/i18n';
  import { cove } from '../../lib/state.svelte';
  import type { WidgetConfig, WidgetType } from '../../lib/types';
  import Clock from './Clock.svelte';
  import Countdown from './Countdown.svelte';
  import CustomIframe from './CustomIframe.svelte';
  import FocusTimer from './FocusTimer.svelte';
  import Icon from './Icon.svelte';
  import Notes from './Notes.svelte';
  import QuickLinks from './QuickLinks.svelte';
  import ReadLater from './ReadLater.svelte';
  import RSS from './RSS.svelte';
  import TabTriage from './TabTriage.svelte';
  import Weather from './Weather.svelte';

  let draggedWidgetId = $state<string | null>(null);
  let dragOverWidgetId = $state<string | null>(null);

  const visibleWidgets = $derived(
    [...cove.settings.widgets].filter((w) => w.visible).sort((a, b) => a.order - b.order)
  );

  function widgetTitle(w: WidgetConfig): string {
    const lang = cove.settings.language;
    const map: Record<WidgetType, string> = {
      quicklinks: 'Quick Access',
      triage: 'Open Tabs',
      focus: 'Focus & Sound',
      weather: t(lang, 'weather'),
      notes: 'Tasks & Notes',
      readlater: t(lang, 'readLater'),
      rss: 'Calm Feed',
      clock: t(lang, 'clock'),
      countdown: t(lang, 'countdown'),
      iframe: w.iframeTitle || t(lang, 'customFrame')
    };
    return w.title || map[w.type];
  }

  function spanCols(size: 'S' | 'M' | 'L', maxCols: number): number {
    const raw = size === 'L' ? 3 : size === 'M' ? 2 : 1;
    return Math.min(raw, maxCols);
  }
</script>

<section
  class="bento-grid"
  class:editing={cove.editGridMode}
  style="--cols: {cove.settings.gridCols};"
  aria-label="Bento dashboard"
>
  {#each visibleWidgets as w (w.id)}
    <!-- svelte-ignore a11y_no_static_element_interactions -->
    <article
      class="bento-card"
      class:scenic-flush={w.type === 'focus' && !cove.editGridMode}
      class:drag-over={dragOverWidgetId === w.id && draggedWidgetId !== w.id}
      style="--span: {spanCols(w.size, cove.settings.gridCols)};"
      draggable="true"
      ondragstart={(e) => {
        const tag = (e.target as HTMLElement)?.tagName;
        if (tag === 'INPUT' || tag === 'TEXTAREA') {
          e.preventDefault();
          return;
        }
        draggedWidgetId = w.id;
      }}
      ondragover={(e) => {
        e.preventDefault();
        dragOverWidgetId = w.id;
      }}
      ondragleave={() => {
        if (dragOverWidgetId === w.id) dragOverWidgetId = null;
      }}
      ondrop={() => {
        if (draggedWidgetId) cove.reorderWidgets(draggedWidgetId, w.id);
        draggedWidgetId = null;
        dragOverWidgetId = null;
      }}
    >
      {#if w.type !== 'focus' || cove.editGridMode}
        <header class="bento-head">
          <h3>{widgetTitle(w)}</h3>

          <div class="bento-tools" class:visible={cove.editGridMode}>
            <button
              type="button"
              class="tool-pill"
              class:pinned={w.pinned}
              onclick={() => cove.toggleWidgetPin(w.id)}
              title={w.pinned ? 'Pinned position (click to unpin)' : 'Pin card position against autonomous reorder'}
            >
              {w.pinned ? 'Pinned' : 'Pin'}
            </button>
            <button
              type="button"
              class="tool-pill"
              onclick={() => cove.cycleWidgetSize(w.id)}
              title={`Span: ${w.size} (click to resize)`}
            >
              {w.size}
            </button>
            <button
              type="button"
              class="tool-close"
              onclick={() => cove.toggleWidgetVisibility(w.type)}
              title="Hide card"
              aria-label={`Hide ${widgetTitle(w)}`}
            >
              <Icon name="x" size={12} />
            </button>
          </div>
        </header>
      {/if}

      <div class="bento-body">
        {#if w.type === 'quicklinks'}
          <QuickLinks />
        {:else if w.type === 'triage'}
          <TabTriage />
        {:else if w.type === 'focus'}
          <FocusTimer />
        {:else if w.type === 'weather'}
          <Weather />
        {:else if w.type === 'notes'}
          <Notes />
        {:else if w.type === 'readlater'}
          <ReadLater />
        {:else if w.type === 'rss'}
          <RSS />
        {:else if w.type === 'clock'}
          <Clock />
        {:else if w.type === 'countdown'}
          <Countdown />
        {:else if w.type === 'iframe'}
          <CustomIframe widget={w} />
        {/if}
      </div>
    </article>
  {/each}
</section>

<style>
  .bento-grid {
    display: grid;
    grid-template-columns: repeat(var(--cols, 4), minmax(0, 1fr));
    grid-auto-flow: dense;
    gap: 16px;
    width: 100%;
    max-width: 1320px;
    margin: 0 auto;
    padding: 0 var(--stage-pad-right) 20px var(--stage-pad-left);
  }

  .bento-card {
    grid-column: span var(--span, 1);
    border-radius: var(--r-card);
    background: var(--surface-card);
    backdrop-filter: var(--glass-blur);
    border: 1px solid var(--border-subtle);
    box-shadow: var(--shadow-card);
    padding: 18px 20px;
    display: flex;
    flex-direction: column;
    gap: 12px;
    min-width: 0;
    transition:
      transform 220ms cubic-bezier(0.22, 1, 0.36, 1),
      border-color 200ms var(--ease-calm),
      box-shadow 220ms var(--ease-calm);
  }

  .bento-card:hover {
    border-color: var(--border-strong);
    transform: translateY(-2px);
  }

  .bento-card.scenic-flush {
    padding: 6px;
  }

  .bento-grid.editing .bento-card {
    border-style: dashed;
    border-color: var(--accent);
  }

  .bento-card.drag-over {
    border-color: var(--accent);
    box-shadow: 0 0 0 3px var(--accent-soft);
  }

  .bento-head {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 8px;
    cursor: grab;
  }
  .bento-head:active {
    cursor: grabbing;
  }

  .bento-head h3 {
    margin: 0;
    font-family: var(--font-display);
    font-size: 1.02rem;
    font-weight: 610;
    letter-spacing: var(--tracking-heading, -0.018em);
    color: var(--text-primary);
  }

  .bento-tools {
    display: inline-flex;
    align-items: center;
    gap: 4px;
    opacity: 0;
    transition: opacity var(--dur-fast) var(--ease-calm);
  }
  .bento-card:hover .bento-tools,
  .bento-tools.visible {
    opacity: 1;
  }

  .tool-pill {
    padding: 2px 8px;
    border-radius: var(--r-pill);
    font-family: var(--font-mono);
    font-size: 10.5px;
    background: var(--surface-row);
    color: var(--text-secondary);
  }
  .tool-pill.pinned {
    background: var(--accent-soft);
    color: var(--accent-text);
  }
  .tool-pill:hover {
    color: var(--text-primary);
  }

  .tool-close {
    width: 22px;
    height: 22px;
    border-radius: 50%;
    display: grid;
    place-items: center;
    background: var(--surface-row);
    color: var(--text-muted);
  }
  .tool-close:hover {
    color: var(--status-danger);
    background: var(--status-danger-soft);
  }

  .bento-body {
    flex: 1;
    min-height: 0;
    display: flex;
    flex-direction: column;
  }

  @media (max-width: 1240px) {
    .bento-grid {
      grid-template-columns: repeat(2, minmax(0, 1fr));
    }
    .bento-card {
      grid-column: span min(var(--span, 1), 2);
    }
  }

  @media (max-width: 720px) {
    .bento-grid {
      grid-template-columns: 1fr;
    }
    .bento-card {
      grid-column: span 1 !important;
      padding: 15px 16px;
    }
    .bento-tools {
      opacity: 1;
    }
  }
</style>
