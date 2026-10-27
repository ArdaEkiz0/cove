<script lang="ts">
  import { cove } from '../../lib/state.svelte';
  import type { WidgetType } from '../../lib/types';
  import Icon from './Icon.svelte';

  const WIDGET_META: { type: WidgetType; label: string; icon: string }[] = [
    { type: 'triage', label: 'Tab Triage', icon: 'layers' },
    { type: 'quicklinks', label: 'Quick Access', icon: 'external' },
    { type: 'focus', label: 'Focus', icon: 'target' },
    { type: 'notes', label: 'Notes', icon: 'note' },
    { type: 'readlater', label: 'Read Later', icon: 'bookmark' },
    { type: 'weather', label: 'Weather', icon: 'sun' },
    { type: 'rss', label: 'RSS', icon: 'rss' },
    { type: 'countdown', label: 'Countdowns', icon: 'calendar' }
  ];
</script>

{#if cove.editGridMode && cove.settings.layoutMode === 'dashboard'}
  <div class="edit-dock" role="toolbar" aria-label="Customize Bento Grid">
    <div class="dock-section">
      <span class="dock-label">Cards</span>
      <div class="widget-pills">
        {#each WIDGET_META as wm (wm.type)}
          {@const w = cove.settings.widgets.find((item) => item.type === wm.type)}
          <button
            type="button"
            class="dock-chip"
            class:active={w?.visible}
            onclick={() => cove.toggleWidgetVisibility(wm.type)}
          >
            <Icon name={wm.icon} size={12} />
            <span>{wm.label}</span>
          </button>
        {/each}
      </div>
    </div>

    <div class="dock-divider"></div>

    <div class="dock-section">
      <span class="dock-label">Cols</span>
      <div class="cols-seg">
        {#each [2, 3, 4] as cols}
          <button
            type="button"
            class:active={cove.settings.gridCols === cols}
            onclick={() => {
              cove.settings.gridCols = cols;
              cove.saveSettings();
            }}
          >
            {cols}
          </button>
        {/each}
      </div>

      <button
        type="button"
        class="btn-primary"
        onclick={() => (cove.editGridMode = false)}
      >
        <Icon name="check" size={12} />
        <span>Done</span>
      </button>
    </div>
  </div>
{/if}

<style>
  .edit-dock {
    position: fixed;
    bottom: 64px;
    left: 50%;
    transform: translateX(-50%);
    z-index: 95;
    display: flex;
    align-items: center;
    gap: 14px;
    padding: 10px 14px;
    border-radius: 22px;
    background: var(--surface-overlay);
    backdrop-filter: var(--glass-blur-heavy);
    border: 1px solid var(--border-strong);
    box-shadow: var(--shadow-elevated);
    max-width: calc(100vw - 32px);
    flex-wrap: wrap;
    justify-content: center;
  }

  .dock-section {
    display: flex;
    align-items: center;
    gap: 8px;
    flex-wrap: wrap;
  }

  .dock-label {
    font-size: 10.5px;
    text-transform: uppercase;
    letter-spacing: 0.08em;
    color: var(--text-muted);
    font-weight: 650;
  }

  .widget-pills {
    display: flex;
    align-items: center;
    gap: 5px;
    flex-wrap: wrap;
  }

  .dock-chip {
    display: inline-flex;
    align-items: center;
    gap: 5px;
    padding: 5px 10px;
    border-radius: var(--r-pill);
    font-size: 11.5px;
    font-weight: 550;
    color: var(--text-muted);
    background: var(--surface-row);
    border: 1px solid var(--border-subtle);
    transition: all 130ms ease;
  }

  .dock-chip.active {
    background: var(--accent-soft);
    color: var(--accent-text);
    border-color: var(--accent);
  }

  .dock-divider {
    width: 1px;
    height: 22px;
    background: var(--border-subtle);
  }

  .cols-seg {
    display: inline-flex;
    padding: 2px;
    border-radius: var(--r-pill);
    background: var(--surface-row);
    border: 1px solid var(--border-subtle);
  }

  .cols-seg button {
    padding: 3px 9px;
    border-radius: var(--r-pill);
    font-size: 11.5px;
    font-weight: 600;
    color: var(--text-muted);
  }

  .cols-seg button.active {
    background: var(--surface-card-solid);
    color: var(--text-primary);
  }
</style>
