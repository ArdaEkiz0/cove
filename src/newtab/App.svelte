<script lang="ts">
  import { onMount } from 'svelte';
  import { CURATED_WALLPAPERS } from '../lib/defaults';
  import { cove } from '../lib/state.svelte';
  import CommandPalette from './components/CommandPalette.svelte';
  import CoveNewsModal from './components/CoveNewsModal.svelte';
  import DiscoverFeed from './components/DiscoverFeed.svelte';
  import EditModeBar from './components/EditModeBar.svelte';
  import FocusStage from './components/FocusStage.svelte';
  import HeroStage from './components/HeroStage.svelte';
  import Logo from './components/Logo.svelte';
  import QuickLinks from './components/QuickLinks.svelte';
  import SearchBar from './components/SearchBar.svelte';
  import SettingsStudio from './components/SettingsStudio.svelte';
  import SideDock from './components/SideDock.svelte';
  import SmartEngineModal from './components/SmartEngineModal.svelte';
  import SmartPulseBar from './components/SmartPulseBar.svelte';
  import SoundMixerPopover from './components/SoundMixerPopover.svelte';
  import TabSessionsModal from './components/TabSessionsModal.svelte';
  import TopBar from './components/TopBar.svelte';
  import WallpaperDock from './components/WallpaperDock.svelte';
  import WidgetGrid from './components/WidgetGrid.svelte';

  let searchBarRef = $state<ReturnType<typeof SearchBar> | null>(null);

  onMount(() => {
    cove.init();
  });

  const activeScene = $derived(
    CURATED_WALLPAPERS[cove.settings.background.curatedIndex % CURATED_WALLPAPERS.length] ||
      CURATED_WALLPAPERS[0]
  );

  const backgroundStyle = $derived.by(() => {
    const bg = cove.settings.background;
    if (bg.type === 'cloud') {
      return '';
    }
    if (bg.type === 'solid') {
      return `background: ${bg.solidColor};`;
    }
    if (bg.type === 'gradient') {
      return `background-image: ${activeScene.css};`;
    }
    const size = bg.fit === 'center' ? 'auto' : bg.fit;
    if (bg.type === 'local' && cove.localWallpaperUrl) {
      return `background-image: url("${cove.localWallpaperUrl}"); background-size: ${size}; background-position: center; background-repeat: no-repeat;`;
    }
    if (bg.type === 'curated' && bg.unsplashOptIn) {
      return `background-image: url("${activeScene.unsplashUrl}"); background-size: ${size}; background-position: center; background-repeat: no-repeat;`;
    }
    return `background-image: url("${activeScene.localUrl}"); background-size: ${size}; background-position: center; background-repeat: no-repeat;`;
  });

  const isCloudBackdrop = $derived(cove.settings.background.type === 'cloud');

  const usesPhotoBackdrop = $derived(
    cove.settings.background.type === 'wallpaper' ||
      cove.settings.background.type === 'local' ||
      cove.settings.background.type === 'curated'
  );

  const ambientTime = $derived(
    cove.now
      .toLocaleTimeString([], {
        hour: 'numeric',
        minute: '2-digit',
        hour12: !cove.settings.clock24h
      })
      .replace(/\s?[AP]M$/i, '')
  );

  const ambientPrompt = $derived.by(() => {
    const weekday = cove.now.toLocaleDateString('en-US', { weekday: 'long' });
    const name = cove.settings.userName?.trim();
    return name ? `Ready for ${weekday}, ${name}?` : `Calm ${weekday}. Your space is ready.`;
  });

  function isEditableTarget(el: EventTarget | null): boolean {
    if (!(el instanceof HTMLElement)) return false;
    const tag = el.tagName;
    return tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT' || el.isContentEditable;
  }

  function handleGlobalKeydown(e: KeyboardEvent) {
    if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
      e.preventDefault();
      cove.commandInitialQuery = '';
      cove.commandPaletteOpen = !cove.commandPaletteOpen;
      return;
    }

    if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'j') {
      e.preventDefault();
      cove.smartModalOpen = !cove.smartModalOpen;
      return;
    }

    if ((e.metaKey || e.ctrlKey) && e.shiftKey && e.key.toLowerCase() === 's') {
      e.preventDefault();
      cove.saveCurrentSession();
      return;
    }

    if ((e.metaKey || e.ctrlKey) && e.shiftKey && e.key.toLowerCase() === 'l') {
      e.preventDefault();
      cove.commandInitialQuery = 'read later: ';
      cove.commandPaletteOpen = true;
      return;
    }

    if ((e.metaKey || e.ctrlKey) && e.key === ',') {
      e.preventDefault();
      if (cove.settingsOpen) {
        cove.settingsOpen = false;
      } else {
        cove.openSettings('general');
      }
      return;
    }

    if (e.key === 'Escape') {
      if (cove.activeDiscoverStory) {
        cove.closeCoveNews();
        return;
      }
      if (cove.activeReaderItem) {
        cove.activeReaderItem = null;
        return;
      }
      if (cove.smartModalOpen) {
        cove.smartModalOpen = false;
        return;
      }
      if (cove.settingsOpen) {
        cove.settingsOpen = false;
        return;
      }
      if (cove.soundMixerOpen) {
        cove.soundMixerOpen = false;
        return;
      }
      if (cove.weatherPopoverOpen) {
        cove.weatherPopoverOpen = false;
        return;
      }
      if (cove.editGridMode) {
        cove.editGridMode = false;
        return;
      }
    }

    if (
      isEditableTarget(e.target) ||
      cove.commandPaletteOpen ||
      cove.smartModalOpen ||
      cove.settingsOpen ||
      cove.soundMixerOpen ||
      cove.activeDiscoverStory !== null ||
      cove.activeReaderItem !== null ||
      cove.wallpaperPickerOpen
    ) {
      return;
    }

    if (e.key === '/') {
      e.preventDefault();
      if (cove.settings.layoutMode === 'dashboard' || cove.settings.layoutMode === 'ambient') {
        searchBarRef?.focusInput();
      } else {
        cove.commandInitialQuery = '';
        cove.commandPaletteOpen = true;
      }
    } else if (e.key === ',') {
      e.preventDefault();
      cove.openSettings('general');
    } else if (e.key.toLowerCase() === 'm') {
      e.preventDefault();
      cove.soundMixerOpen = !cove.soundMixerOpen;
    } else if (e.key.toLowerCase() === 'd') {
      e.preventDefault();
      cove.setLayoutMode(cove.settings.layoutMode === 'discover' ? 'dashboard' : 'discover');
    } else if (e.key === '1') {
      cove.setLayoutMode('dashboard');
    } else if (e.key === '2') {
      cove.setLayoutMode('ambient');
    } else if (e.key === '3') {
      cove.setLayoutMode('focus');
    } else if (e.key === '4') {
      cove.setLayoutMode('blank');
    }
  }
</script>

<svelte:window onkeydown={handleGlobalKeydown} />

<div class="cove-viewport">
  <!-- Website Signature Volumetric Cloud-Orb Sky OR 4K Scenic Layer -->
  {#if isCloudBackdrop}
    <div class="cloud-sky-canvas" aria-hidden="true">
      <div class="cloud-dot-grid"></div>
      <div class="cloud-orb-top"></div>
      <div class="cloud-orb-horizon"></div>
    </div>
  {:else}
    <div class="bg-canvas" style={backgroundStyle}></div>
    {#if usesPhotoBackdrop}
      <div
        class="bg-atmosphere"
        style="backdrop-filter: blur({cove.settings.background.blur}px); -webkit-backdrop-filter: blur({cove.settings.background.blur}px);"
      ></div>
    {/if}
  {/if}

  <!-- Persistent Left Side Navigation Rail -->
  <SideDock />

  <!-- Persistent Floating Top Bar -->
  <TopBar />

  <!-- Stage 1: Spatial Bento New Tab (Clean Dark Sanctuary — Discover is its own Full Page!) -->
  {#if cove.settings.layoutMode === 'dashboard'}
    <main class="stage-bento">
      <div class="first-fold-sanctuary">
        <HeroStage />
        <div class="search-pad">
          <SearchBar bind:this={searchBarRef} />
          <SmartPulseBar />
        </div>
        <WidgetGrid />

        {#if cove.settings.discoverOptIn !== false}
          <div class="discover-cue-wrap">
            <button
              type="button"
              class="discover-scroll-cue"
              onclick={() => cove.setLayoutMode('discover')}
              title="Open Full-Page Cove Discover (Shortcut: D)"
            >
              <span class="cue-dot"></span>
              <span>
                Open Cove Discover
                {#if cove.discoverStories.length > 0}
                  · {cove.discoverStories.length} Verified Stories
                {/if}
                {#if cove.cachedArticleKeys.length > 0}
                  · {cove.cachedArticleKeys.length} Cached
                {/if}
              </span>
              <kbd>D</kbd>
              <span class="cue-arrow">→</span>
            </button>
          </div>
        {/if}
      </div>
    </main>

  <!-- Stage 1B: Cove Discover — Side-Navigation Workspace Section (Framed, Not Full-Screen) -->
  {:else if cove.settings.layoutMode === 'discover'}
    <main class="stage-bento stage-discover-section">
      <DiscoverFeed />
    </main>

  <!-- Stage 2: Ambient Home -->
  {:else if cove.settings.layoutMode === 'ambient' || cove.settings.layoutMode === 'minimal'}
    <main class="stage-ambient">
      <div class="ambient-centerpiece">
        <p class="ambient-greeting">{ambientPrompt}</p>
        <div
          class="ambient-monolith-clock"
          class:segmented={cove.settings.clockStyle === 'segmented'}
          class:serif={cove.settings.clockStyle === 'serif'}
          class:editorial={cove.settings.clockStyle === 'editorial'}
        >
          {ambientTime}
        </div>
        <div class="ambient-search">
          <SearchBar bind:this={searchBarRef} />
          <SmartPulseBar />
        </div>
        <div class="ambient-quick-dock">
          <QuickLinks />
        </div>
      </div>
    </main>

  <!-- Stage 3: Focus Sanctuary -->
  {:else if cove.settings.layoutMode === 'focus'}
    <FocusStage />

  <!-- Stage 4: Pure 4K Stillness -->
  {:else}
    <main class="stage-stillness" aria-label="Stillness stage"></main>
  {/if}

  <!-- Floating Interactive Bento Widget Dock (when Edit Mode is on) -->
  <EditModeBar />

  <!-- Floating Bottom Micro-Pills + 4K Wallpaper & Atmosphere Gallery -->
  <WallpaperDock />

  <!-- Modals & Full-Page Studios -->
  <CommandPalette />
  <SmartEngineModal />
  <SoundMixerPopover />
  <CoveNewsModal />
  <SettingsStudio />
  <TabSessionsModal />

  <!-- Calm Focus Site-Blocker Overlay -->
  {#if cove.blockedPreviewDomain}
    <!-- svelte-ignore a11y_click_events_have_key_events -->
    <!-- svelte-ignore a11y_no_static_element_interactions -->
    <div class="blocker-overlay" onclick={() => (cove.blockedPreviewDomain = null)}>
      <div class="blocked-card" onclick={(e) => e.stopPropagation()}>
        <Logo size={42} />
        <h1>Focus session in progress.</h1>
        <p class="blocked-domain">{cove.blockedPreviewDomain} is paused while you focus.</p>
        <p class="blocked-sub">Take a slow breath, or return to what matters right now.</p>
        <div class="blocked-actions">
          <button
            type="button"
            class="btn-primary"
            onclick={() => (cove.blockedPreviewDomain = null)}
          >
            Stay in Cove
          </button>
          <button
            type="button"
            class="btn-ghost"
            onclick={() => {
              const dom = cove.blockedPreviewDomain;
              cove.blockedPreviewDomain = null;
              cove.pauseFocus();
              if (dom) window.open(`https://${dom}`, '_blank', 'noopener,noreferrer');
            }}
          >
            Pause focus & continue
          </button>
        </div>
      </div>
    </div>
  {/if}

  {#if cove.toastMessage}
    <div class="cove-toast" role="status" aria-live="polite">
      <span class="toast-dot"></span>
      <span>{cove.toastMessage}</span>
    </div>
  {/if}
</div>

<style>
  .cove-viewport {
    position: relative;
    min-height: 100vh;
    display: flex;
    flex-direction: column;
  }

  /* Website Signature Volumetric Alabaster & Periwinkle Cloud-Orb Backdrop */
  .cloud-sky-canvas {
    position: fixed;
    inset: 0;
    z-index: 0;
    pointer-events: none;
    overflow: hidden;
    background: var(--bg-base);
    transition: background 320ms var(--ease-calm);
  }

  .cloud-dot-grid {
    position: absolute;
    inset: 0;
    background-image: radial-gradient(rgba(29, 91, 255, 0.085) 1px, transparent 1px);
    background-size: 26px 26px;
    mask-image: radial-gradient(ellipse at 50% 35%, black 25%, transparent 80%);
    -webkit-mask-image: radial-gradient(ellipse at 50% 35%, black 25%, transparent 80%);
  }

  :global(html[data-theme="dark"]) .cloud-dot-grid {
    background-image: radial-gradient(rgba(96, 155, 255, 0.12) 1px, transparent 1px);
  }

  .cloud-orb-top {
    position: absolute;
    top: -180px;
    left: 50%;
    transform: translateX(-50%);
    width: 980px;
    height: 460px;
    border-radius: 50%;
    background: radial-gradient(closest-side, rgba(164, 198, 255, 0.36), rgba(214, 228, 255, 0.12), transparent);
    filter: blur(28px);
  }

  :global(html[data-theme="dark"]) .cloud-orb-top {
    background: radial-gradient(
      closest-side,
      rgba(59, 130, 246, 0.22),
      rgba(29, 78, 216, 0.08),
      transparent
    );
  }

  .cloud-orb-horizon {
    position: absolute;
    bottom: -240px;
    left: 50%;
    transform: translateX(-50%);
    width: min(1400px, 130vw);
    height: 620px;
    border-radius: 50%;
    background: radial-gradient(
      closest-side,
      rgba(130, 174, 255, 0.45) 0%,
      rgba(198, 220, 255, 0.36) 48%,
      transparent 100%
    );
    filter: blur(36px);
  }

  :global(html[data-theme="dark"]) .cloud-orb-horizon {
    background: radial-gradient(
      closest-side,
      rgba(37, 99, 235, 0.25) 0%,
      rgba(15, 35, 85, 0.14) 52%,
      transparent 100%
    );
  }

  .bg-canvas {
    position: fixed;
    inset: 0;
    z-index: 0;
    pointer-events: none;
    transform: scale(1.015);
    filter: brightness(var(--wp-brightness, 1)) contrast(var(--wp-contrast, 1.03)) saturate(var(--wp-saturate, 1.05));
    transition:
      background-image var(--dur-atmo) var(--ease-calm),
      filter var(--dur-atmo) var(--ease-calm);
  }

  .bg-atmosphere {
    position: fixed;
    inset: 0;
    z-index: 1;
    pointer-events: none;
    background:
      radial-gradient(ellipse at 50% 45%, transparent 48%, rgba(6, 9, 18, var(--atmo-vignette, 0.28)) 100%),
      linear-gradient(
        180deg,
        rgba(8, 12, 22, var(--atmo-top-scrim, 0.16)) 0%,
        rgba(8, 12, 22, var(--atmo-scrim-alpha, 0.22)) 42%,
        rgba(8, 12, 22, calc(var(--atmo-scrim-alpha, 0.22) + 0.08)) 100%
      );
    transition: background var(--dur-atmo) var(--ease-calm);
  }

  .stage-bento,
  .stage-ambient,
  .stage-stillness {
    position: relative;
    z-index: 15;
    flex: 1;
    display: flex;
    flex-direction: column;
    animation: coveStageIn 340ms cubic-bezier(0.22, 1, 0.36, 1);
  }

  @keyframes coveStageIn {
    from {
      opacity: 0;
      transform: translateY(6px);
    }
    to {
      opacity: 1;
      transform: translateY(0);
    }
  }

  .first-fold-sanctuary {
    min-height: calc(100vh - 52px);
    display: flex;
    flex-direction: column;
    justify-content: flex-start;
  }

  .discover-cue-wrap {
    margin-top: auto;
    padding: 8px var(--stage-pad-right) 18px var(--stage-pad-left);
    display: flex;
    justify-content: center;
  }

  .discover-scroll-cue {
    display: inline-flex;
    align-items: center;
    gap: 8px;
    padding: 7px 15px;
    border-radius: var(--r-pill);
    background: var(--surface-dock);
    backdrop-filter: var(--glass-blur);
    border: 1px solid var(--border-subtle);
    box-shadow: var(--shadow-card);
    color: var(--text-secondary);
    font-size: 12px;
    font-weight: 560;
    letter-spacing: -0.008em;
    transition: all var(--dur-fast) var(--ease-calm);
  }

  .discover-scroll-cue:hover {
    color: var(--text-primary);
    border-color: var(--border-strong);
    transform: translateY(-2px);
  }

  .cue-dot {
    width: 6px;
    height: 6px;
    border-radius: 50%;
    background: var(--accent);
    box-shadow: 0 0 8px var(--accent);
  }

  .discover-scroll-cue kbd {
    padding: 1px 6px;
    border-radius: 5px;
    font-family: var(--font-mono);
    font-size: 10px;
    background: var(--surface-row);
    border: 1px solid var(--border-subtle);
    color: var(--text-muted);
  }

  .cue-arrow {
    font-size: 12px;
    opacity: 0.75;
  }

  .stage-discover-section {
    padding-top: 66px;
  }

  .search-pad {
    padding: 0 var(--stage-pad-right) 0 var(--stage-pad-left);
  }

  .stage-ambient {
    align-items: center;
    justify-content: center;
    padding: 64px var(--stage-pad-right) 36px var(--stage-pad-left);
  }

  .ambient-centerpiece {
    display: flex;
    flex-direction: column;
    align-items: center;
    text-align: center;
    width: 100%;
    max-width: 680px;
  }

  .ambient-greeting {
    margin: 0 0 4px;
    font-size: 20px;
    font-weight: 500;
    letter-spacing: -0.015em;
    color: var(--hero-ink);
    text-shadow: var(--hero-shadow);
  }

  .ambient-monolith-clock {
    font-family: var(--font-display);
    font-size: 132px;
    font-weight: 680;
    letter-spacing: -0.05em;
    line-height: 0.96;
    font-variant-numeric: tabular-nums lining-nums;
    color: var(--hero-ink);
    text-shadow: var(--hero-shadow);
    margin-bottom: 24px;
  }

  .ambient-monolith-clock.editorial {
    font-weight: 300;
  }

  .ambient-monolith-clock.serif {
    font-family: var(--font-serif);
    font-weight: 400;
    letter-spacing: -0.028em;
  }

  .ambient-monolith-clock.segmented {
    font-family: var(--font-mono);
    font-size: 104px;
    letter-spacing: 0.02em;
  }

  .ambient-search {
    width: 100%;
    max-width: 600px;
  }

  .ambient-quick-dock {
    width: 100%;
    max-width: 600px;
    padding: 16px 18px;
    border-radius: var(--r-card);
    background: var(--surface-card);
    backdrop-filter: var(--glass-blur);
    border: 1px solid var(--border-subtle);
    box-shadow: var(--shadow-card);
  }

  .blocker-overlay {
    position: fixed;
    inset: 0;
    z-index: 160;
    background: var(--backdrop-scrim);
    backdrop-filter: blur(12px);
    display: grid;
    place-items: center;
    padding: 20px;
  }

  .cove-toast {
    position: fixed;
    right: 26px;
    bottom: 64px;
    z-index: 180;
    display: inline-flex;
    align-items: center;
    gap: 8px;
    padding: 9px 16px;
    border-radius: var(--r-pill);
    background: var(--surface-overlay);
    backdrop-filter: var(--glass-blur-heavy);
    border: 1px solid var(--border-strong);
    color: var(--text-primary);
    font-size: 12.5px;
    font-weight: 500;
    box-shadow: var(--shadow-elevated);
  }
  .toast-dot {
    width: 7px;
    height: 7px;
    border-radius: 50%;
    background: var(--accent);
  }

  @media (max-width: 900px) {
    .ambient-monolith-clock {
      font-size: clamp(58px, 15vw, 86px);
    }
    .cove-toast {
      left: 16px;
      right: 16px;
      bottom: 84px;
      justify-content: center;
    }
  }
</style>
