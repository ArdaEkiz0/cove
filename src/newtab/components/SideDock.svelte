<script lang="ts">
  import { cove } from '../../lib/state.svelte';
  import Icon from './Icon.svelte';

  const tabAttentionCount = $derived(
    cove.triage.duplicateExtraCount + cove.triage.audioTabs.length + cove.triage.staleTabs.length
  );
</script>

<nav
  class="side-dock"
  class:whisper={cove.settings.layoutMode === 'blank'}
  aria-label="Cove workspaces and stages"
>
  <button
    type="button"
    class="dock-btn"
    class:active={cove.settings.layoutMode === 'dashboard'}
    data-tip="Dashboard · 1"
    onclick={() => cove.setLayoutMode('dashboard')}
    aria-label="Bento Dashboard"
  >
    <Icon name="grid" size={18} />
  </button>

  <button
    type="button"
    class="dock-btn"
    class:active={cove.settings.layoutMode === 'discover'}
    data-tip={cove.discoverStories.length > 0 ? `Discover · ${cove.discoverStories.length} Stories (D)` : 'Cove Discover · D'}
    onclick={() => cove.setLayoutMode('discover')}
    aria-label="Cove Discover"
  >
    <Icon name="compass" size={18} />
    {#if cove.discoverStories.length > 0 && cove.settings.layoutMode !== 'discover'}
      <span class="live-dot accent"></span>
    {/if}
  </button>

  <button
    type="button"
    class="dock-btn"
    class:active={cove.settings.layoutMode === 'ambient'}
    data-tip="Ambient Clock · 2"
    onclick={() => cove.setLayoutMode('ambient')}
    aria-label="Ambient Home Stage"
  >
    <Icon name="home" size={18} />
  </button>

  <button
    type="button"
    class="dock-btn"
    class:active={cove.settings.layoutMode === 'focus'}
    data-tip="Focus Sanctuary · 3"
    onclick={() => cove.setLayoutMode('focus')}
    aria-label="Focus Sanctuary"
  >
    <Icon name="target" size={18} />
    {#if cove.focusRunning}
      <span class="live-dot accent"></span>
    {/if}
  </button>

  <div class="dock-sep"></div>

  <button
    type="button"
    class="dock-btn"
    class:active={cove.soundMixerOpen || cove.audioPlaying}
    data-tip="Neural Sound · M"
    onclick={() => (cove.soundMixerOpen = !cove.soundMixerOpen)}
    aria-label="Sound Sanctuary"
  >
    <Icon name="waves" size={18} />
    {#if cove.audioPlaying}
      <span class="live-dot accent"></span>
    {/if}
  </button>

  <button
    type="button"
    class="dock-btn hide-mobile-dock"
    data-tip="Tab Sessions"
    onclick={() => (cove.sessionsModalOpen = true)}
    aria-label="Tab Sessions"
  >
    <Icon name="layers" size={18} />
    {#if tabAttentionCount > 0}
      <span class="live-dot"></span>
    {/if}
  </button>

  <button
    type="button"
    class="dock-btn"
    class:active={cove.wallpaperPickerOpen}
    data-tip="4K Scenes"
    onclick={() => (cove.wallpaperPickerOpen = !cove.wallpaperPickerOpen)}
    aria-label="4K Wallpaper Scenes"
  >
    <Icon name="image" size={18} />
  </button>

  <button
    type="button"
    class="dock-btn hide-mobile-dock"
    data-tip="Command Bar · ⌘K"
    onclick={() => {
      cove.commandInitialQuery = '';
      cove.commandPaletteOpen = true;
    }}
    aria-label="Command Palette"
  >
    <Icon name="command" size={17} />
  </button>

  {#if cove.settings.smartEngine.enabled && !cove.settings.smartEngine.whisperMode}
    <button
      type="button"
      class="dock-btn hide-mobile-dock"
      class:active={cove.smartModalOpen}
      data-tip="CSE Inspector · ⌘J"
      onclick={() => (cove.smartModalOpen = !cove.smartModalOpen)}
      aria-label="Intelligence Inspector"
    >
      <Icon name="sparkle" size={17} />
    </button>
  {/if}

  <div class="dock-sep hide-mobile-dock"></div>

  <button
    type="button"
    class="dock-btn hide-mobile-dock"
    class:active={cove.editGridMode}
    data-tip="Edit Cards"
    onclick={() => {
      cove.setLayoutMode('dashboard');
      cove.editGridMode = !cove.editGridMode;
    }}
    aria-label="Customize Bento Cards"
  >
    <Icon name="plus" size={18} />
  </button>

  <button
    type="button"
    class="dock-btn"
    class:active={cove.settingsOpen}
    data-tip="Settings · ,"
    onclick={() => cove.openSettings('general')}
    aria-label="Settings Studio"
  >
    <Icon name="sliders" size={17} />
  </button>
</nav>

<style>
  .side-dock {
    position: fixed;
    left: 18px;
    top: 50%;
    transform: translateY(-50%);
    z-index: 45;
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 6px;
    padding: 9px 7px;
    border-radius: 22px;
    background: var(--surface-dock);
    backdrop-filter: var(--glass-blur);
    border: 1px solid var(--border-subtle);
    box-shadow: var(--shadow-card);
    transition: opacity var(--dur-calm) var(--ease-calm), border-color var(--dur-fast) var(--ease-calm);
  }

  .side-dock:hover {
    border-color: var(--border-strong);
  }

  .side-dock.whisper {
    opacity: 0.2;
  }
  .side-dock.whisper:hover,
  .side-dock.whisper:focus-within {
    opacity: 1;
  }

  .dock-btn {
    position: relative;
    width: 38px;
    height: 38px;
    border-radius: 13px;
    display: grid;
    place-items: center;
    color: var(--text-secondary);
    transition: all 160ms cubic-bezier(0.22, 1, 0.36, 1);
  }

  .dock-btn:hover {
    background: var(--surface-hover);
    color: var(--text-primary);
    transform: scale(1.06);
  }

  .dock-btn.active {
    background: var(--dock-active-bg);
    color: var(--dock-active-ink);
    box-shadow: 0 6px 16px rgba(29, 91, 255, 0.36), inset 0 1px 0 rgba(255, 255, 255, 0.28);
  }

  .dock-btn.active::before {
    content: '';
    position: absolute;
    left: -5px;
    top: 10px;
    bottom: 10px;
    width: 3px;
    border-radius: 99px;
    background: var(--accent-text);
    box-shadow: 0 0 8px var(--accent);
  }

  /* Floating Optical Glass Tooltip */
  .dock-btn[data-tip]::after {
    content: attr(data-tip);
    position: absolute;
    left: calc(100% + 14px);
    top: 50%;
    transform: translateY(-50%) translateX(-4px);
    padding: 5px 10px;
    border-radius: 9px;
    background: var(--surface-overlay);
    backdrop-filter: var(--glass-blur-heavy);
    border: 1px solid var(--border-strong);
    box-shadow: var(--shadow-card);
    color: var(--text-primary);
    font-family: var(--font-sans);
    font-size: 11.5px;
    font-weight: 560;
    white-space: nowrap;
    pointer-events: none;
    opacity: 0;
    transition: opacity 150ms ease, transform 150ms cubic-bezier(0.22, 1, 0.36, 1);
    z-index: 60;
  }

  .dock-btn[data-tip]:hover::after {
    opacity: 1;
    transform: translateY(-50%) translateX(0);
  }

  .dock-sep {
    width: 20px;
    height: 1px;
    background: var(--border-subtle);
    margin: 2px 0;
  }

  .live-dot {
    position: absolute;
    top: 7px;
    right: 7px;
    width: 6px;
    height: 6px;
    border-radius: 50%;
    background: var(--status-warn);
  }
  .live-dot.accent {
    background: var(--accent);
    box-shadow: 0 0 8px var(--accent);
  }

  @media (max-width: 900px) {
    .side-dock {
      left: 50%;
      top: auto;
      bottom: 12px;
      transform: translateX(-50%);
      flex-direction: row;
      padding: 6px 9px;
      max-width: calc(100vw - 20px);
      overflow-x: auto;
      scrollbar-width: none;
    }
    .side-dock::-webkit-scrollbar {
      display: none;
    }
    .dock-sep {
      width: 1px;
      height: 20px;
      flex-shrink: 0;
    }
    .dock-btn {
      flex-shrink: 0;
    }
    .dock-btn[data-tip]::after,
    .dock-btn.active::before {
      display: none;
    }
  }

  @media (max-width: 600px) {
    .hide-mobile-dock {
      display: none;
    }
    .dock-btn {
      width: 36px;
      height: 36px;
    }
  }
</style>
