<script lang="ts">
  import { cove } from '../../lib/state.svelte';
  import type { SmartPulseSuggestion } from '../../lib/smart-engine';
  import BrandIcon from './BrandIcon.svelte';
  import Icon from './Icon.svelte';

  function iconForPulse(p: SmartPulseSuggestion): string {
    if (p.kind === 'chain') return 'external';
    if (p.kind === 'hygiene') return 'layers';
    if (p.kind === 'focus') return 'target';
    if (p.kind === 'reading') return 'bookmark';
    if (p.kind === 'scene') return 'image';
    return 'external';
  }
</script>

{#if cove.settings.smartEngine.enabled && cove.settings.smartEngine.showPulseSuggestions && cove.smartPulses.length > 0}
  <section class="pulse-bar" aria-label="Contextual workspace actions">
    {#each cove.smartPulses as pulse (pulse.id)}
      <div class="pulse-chip">
        <button
          type="button"
          class="chip-main"
          onclick={() => cove.acceptSmartPulse(pulse)}
          title={pulse.subtitle}
        >
          {#if pulse.domainForLogo}
            <BrandIcon url={pulse.domainForLogo} title={pulse.title} size={14} radius={4} />
          {:else}
            <span class="chip-icon">
              <Icon name={iconForPulse(pulse)} size={12} />
            </span>
          {/if}
          <span class="chip-label">{pulse.title}</span>
        </button>
        <button
          type="button"
          class="chip-dismiss"
          onclick={() => cove.dismissSmartPulse(pulse)}
          aria-label={`Hide: ${pulse.title}`}
          title="Hide suggestion"
        >
          <Icon name="x" size={10} />
        </button>
      </div>
    {/each}
  </section>
{/if}

<style>
  .pulse-bar {
    display: flex;
    align-items: center;
    justify-content: center;
    flex-wrap: wrap;
    gap: 7px;
    max-width: 720px;
    margin: -4px auto 0;
  }

  .pulse-chip {
    display: inline-flex;
    align-items: center;
    border-radius: var(--r-pill);
    background: var(--surface-card);
    backdrop-filter: var(--glass-blur);
    -webkit-backdrop-filter: var(--glass-blur);
    border: 1px solid var(--border-subtle);
    box-shadow: 0 3px 12px rgba(0, 0, 0, 0.1);
    transition: border-color var(--dur-fast) var(--ease-calm), transform var(--dur-fast) var(--ease-calm);
  }
  .pulse-chip:hover {
    border-color: var(--border-strong);
    transform: translateY(-1px);
  }

  .chip-main {
    display: inline-flex;
    align-items: center;
    gap: 7px;
    padding: 4px 7px 4px 11px;
    font-size: 11.8px;
    font-weight: 510;
    color: var(--text-secondary);
    transition: color var(--dur-fast) var(--ease-calm);
  }
  .chip-main:hover {
    color: var(--text-primary);
  }

  .chip-icon {
    color: var(--accent-text);
    display: grid;
    place-items: center;
  }

  .chip-label {
    max-width: 240px;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }

  .chip-dismiss {
    padding: 4px 8px 4px 3px;
    color: var(--text-muted);
    display: grid;
    place-items: center;
    opacity: 0.55;
  }
  .chip-dismiss:hover {
    opacity: 1;
    color: var(--text-primary);
  }
</style>
