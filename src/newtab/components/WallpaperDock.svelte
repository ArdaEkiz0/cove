<script lang="ts">
  import { CURATED_WALLPAPERS } from '../../lib/defaults';
  import { t } from '../../lib/i18n';
  import { cove } from '../../lib/state.svelte';
  import Icon from './Icon.svelte';

  const activeScene = $derived(
    CURATED_WALLPAPERS[cove.settings.background.curatedIndex % CURATED_WALLPAPERS.length]
  );
</script>

<!-- Visual 4K Wallpaper & Atmosphere Studio Sheet -->
{#if cove.wallpaperPickerOpen}
  <!-- svelte-ignore a11y_click_events_have_key_events -->
  <!-- svelte-ignore a11y_no_static_element_interactions -->
  <div class="gallery-scrim" onclick={() => (cove.wallpaperPickerOpen = false)}>
    <div class="gallery-sheet" onclick={(e) => e.stopPropagation()}>
      <div class="gallery-head">
        <div>
          <h3>4K Atmospheric Scenes & Luminance Engine</h3>
          <p>
            Bundled locally for <span class="mono">0ms</span> offline load. Cove dynamically samples scene brightness & palette to calibrate glass contrast.
          </p>
        </div>
        <div style="display:flex;align-items:center;gap:8px;">
          <button
            type="button"
            class="btn-ghost"
            onclick={() => {
              cove.wallpaperPickerOpen = false;
              cove.openSettings('appearance');
            }}
          >
            <Icon name="sliders" size={12} />
            <span>Full Studio</span>
          </button>
          <button
            type="button"
            class="close-mini"
            onclick={() => (cove.wallpaperPickerOpen = false)}
            aria-label="Close wallpaper gallery"
          >
            <Icon name="x" size={15} />
          </button>
        </div>
      </div>

      <div class="gallery-grid">
        {#each CURATED_WALLPAPERS as sc, idx (sc.id)}
          <button
            type="button"
            class="scene-card"
            class:selected={cove.settings.background.curatedIndex === idx && cove.settings.background.type === 'wallpaper'}
            onclick={() => cove.selectWallpaper(idx)}
          >
            <img src={sc.localUrl} alt={sc.label} loading="lazy" />
            <span class="scene-lum-badge">
              <i style="background: {sc.accentHex}"></i>
              {Math.round(sc.luminance * 100)}%
            </span>
            <div class="scene-caption">
              <span class="sc-name">{sc.label}</span>
              <span class="sc-sub">{sc.subtitle}</span>
            </div>
          </button>
        {/each}
      </div>

      <div class="atmo-sliders">
        <label class="sl-item">
          <span>Brightness <strong>{Math.round(cove.settings.background.brightness * 100)}%</strong></span>
          <input
            type="range"
            min="0.68"
            max="1.32"
            step="0.02"
            bind:value={cove.settings.background.brightness}
            oninput={() => cove.saveSettings()}
          />
        </label>

        <label class="sl-item">
          <span>Scrim Dim <strong>{Math.round(cove.effectiveScrim * 100)}%</strong></span>
          <input
            type="range"
            min="0"
            max="0.65"
            step="0.03"
            bind:value={cove.settings.background.dim}
            oninput={() => cove.saveSettings()}
          />
        </label>

        <label class="sl-item">
          <span>Backdrop Blur <strong>{cove.settings.background.blur}px</strong></span>
          <input
            type="range"
            min="0"
            max="16"
            step="1"
            bind:value={cove.settings.background.blur}
            oninput={() => cove.saveSettings()}
          />
        </label>
      </div>

      <div class="gallery-foot">
        <div class="atmo-pills">
          <button
            type="button"
            class="chip-toggle"
            class:on={cove.settings.background.autoBrightness}
            onclick={() => {
              cove.settings.background.autoBrightness = !cove.settings.background.autoBrightness;
              cove.saveSettings();
            }}
          >
            <Icon name="sparkle" size={12} />
            <span>Auto-Brightness Adapt</span>
          </button>

          <button
            type="button"
            class="chip-toggle"
            class:on={cove.settings.background.chameleonAccent}
            onclick={() => {
              cove.settings.background.chameleonAccent = !cove.settings.background.chameleonAccent;
              cove.saveSettings();
            }}
          >
            <span class="dot-swatch" style="background: {cove.atmosphere.accentHex}"></span>
            <span>Chameleon Accent</span>
          </button>
        </div>

        <div class="pair-btns">
          <button
            type="button"
            class="btn-ghost"
            onclick={() => {
              cove.settings.theme = 'light';
              cove.saveSettings();
            }}
          >
            Frosted Light
          </button>
          <button
            type="button"
            class="btn-ghost"
            onclick={() => {
              cove.settings.theme = 'dark';
              cove.saveSettings();
            }}
          >
            Smoked Dark
          </button>
        </div>
      </div>
    </div>
  </div>
{/if}

<!-- Bottom Micro-Docks -->
<footer class="bottom-micro-bar" class:whisper={cove.settings.layoutMode === 'blank'}>
  <div class="micro-pill">
    <button
      type="button"
      class="mp-btn"
      class:playing={cove.audioPlaying}
      onclick={() => (cove.soundMixerOpen = true)}
      title="Open Functional Neural Sound Sanctuary (M)"
    >
      {#if cove.audioPlaying}
        <span class="eq-bars" aria-hidden="true"><i></i><i></i><i></i></span>
      {:else}
        <Icon name="waves" size={13} />
      {/if}
      <span>{cove.audioPlaying ? cove.activeAudioLabel : 'Sound Sanctuary'}</span>
    </button>
    {#if cove.audioPlaying}
      <button
        type="button"
        class="mp-stop"
        onclick={() => cove.stopAllSounds()}
        title="Silence neural soundscape"
      >
        <Icon name="x" size={12} />
      </button>
    {/if}
  </div>

  <button
    type="button"
    class="whisper-center-pill"
    onclick={() => {
      cove.commandInitialQuery = '';
      cove.commandPaletteOpen = true;
    }}
  >
    <Icon name="sparkle" size={13} />
    <span>{t(cove.settings.language, 'tagline')}</span>
  </button>

  <div class="micro-pill">
    <button
      type="button"
      class="mp-btn"
      onclick={() => (cove.wallpaperPickerOpen = !cove.wallpaperPickerOpen)}
      title="Open 4K Wallpaper & Atmosphere Studio"
    >
      <span class="dot-swatch" style="background: {cove.atmosphere.accentHex}"></span>
      <span>{activeScene.label}</span>
    </button>
    <span class="mp-sep"></span>
    <button
      type="button"
      class="mp-icon"
      onclick={() => cove.cycleWallpaper()}
      title="Next 4K wallpaper"
      aria-label="Next wallpaper"
    >
      <Icon name="refresh" size={13} />
    </button>
    <button
      type="button"
      class="mp-icon"
      onclick={() =>
        cove.setLayoutMode(cove.settings.layoutMode === 'blank' ? 'dashboard' : 'blank')}
      title={cove.settings.layoutMode === 'blank' ? 'Show Bento Dashboard' : 'Pure 4K Stillness Mode'}
      aria-label="Toggle stillness mode"
    >
      <Icon name="maximize" size={13} />
    </button>
  </div>
</footer>

<style>
  .bottom-micro-bar {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 12px;
    padding: 8px var(--stage-pad-right) 18px var(--stage-pad-left);
    width: 100%;
    max-width: 1520px;
    margin: auto auto 0;
    position: relative;
    z-index: 25;
    transition: opacity var(--dur-calm) var(--ease-calm);
  }

  .bottom-micro-bar.whisper {
    opacity: 0.18;
  }
  .bottom-micro-bar.whisper:hover,
  .bottom-micro-bar.whisper:focus-within {
    opacity: 1;
  }

  .micro-pill {
    display: inline-flex;
    align-items: center;
    height: 34px;
    padding: 0 6px;
    border-radius: var(--r-pill);
    background: var(--surface-card);
    backdrop-filter: var(--glass-blur);
    border: 1px solid var(--border-subtle);
    box-shadow: var(--shadow-card);
  }

  .mp-btn {
    display: inline-flex;
    align-items: center;
    gap: 7px;
    padding: 4px 10px;
    border-radius: var(--r-pill);
    font-size: 12px;
    color: var(--text-secondary);
    transition: color var(--dur-fast) var(--ease-calm);
  }
  .mp-btn:hover {
    color: var(--text-primary);
  }
  .mp-btn.playing {
    color: var(--accent-text);
    font-weight: 500;
  }

  .eq-bars {
    display: inline-flex;
    align-items: flex-end;
    gap: 2px;
    height: 11px;
  }
  .eq-bars i {
    width: 2.5px;
    height: 100%;
    border-radius: 2px;
    background: var(--accent);
    transform-origin: bottom;
    animation: coveEqBar 0.9s ease-in-out infinite;
  }
  .eq-bars i:nth-child(2) {
    animation-delay: 0.2s;
  }
  .eq-bars i:nth-child(3) {
    animation-delay: 0.4s;
  }

  .dot-swatch {
    width: 8px;
    height: 8px;
    border-radius: 50%;
    border: 1px solid rgba(255, 255, 255, 0.5);
    display: inline-block;
    flex-shrink: 0;
  }

  .mp-stop,
  .mp-icon {
    width: 26px;
    height: 26px;
    border-radius: 50%;
    display: grid;
    place-items: center;
    color: var(--text-secondary);
  }
  .mp-stop:hover,
  .mp-icon:hover {
    background: var(--surface-hover);
    color: var(--text-primary);
  }

  .mp-sep {
    width: 1px;
    height: 13px;
    background: var(--border-subtle);
    margin: 0 2px;
  }

  .whisper-center-pill {
    display: inline-flex;
    align-items: center;
    gap: 7px;
    height: 34px;
    padding: 0 16px;
    border-radius: var(--r-pill);
    background: var(--surface-card);
    backdrop-filter: var(--glass-blur);
    border: 1px solid var(--border-subtle);
    box-shadow: var(--shadow-card);
    font-size: 12px;
    color: var(--text-secondary);
    transition: all var(--dur-fast) var(--ease-calm);
  }
  .whisper-center-pill:hover {
    color: var(--text-primary);
    background: var(--surface-hover);
  }

  .gallery-scrim {
    position: fixed;
    inset: 0;
    z-index: 135;
    background: var(--backdrop-scrim);
    backdrop-filter: blur(8px);
    display: grid;
    place-items: center;
    padding: 20px;
  }

  .gallery-sheet {
    width: 100%;
    max-width: 840px;
    max-height: calc(100vh - 32px);
    overflow-y: auto;
    padding: 22px 24px;
    border-radius: var(--r-xl);
    background: var(--surface-overlay);
    backdrop-filter: var(--glass-blur-heavy);
    border: 1px solid var(--border-strong);
    box-shadow: var(--shadow-elevated);
    display: flex;
    flex-direction: column;
    gap: 16px;
  }

  .gallery-head {
    display: flex;
    justify-content: space-between;
    align-items: flex-start;
    gap: 12px;
  }
  .gallery-head h3 {
    margin: 0;
    font-size: 16px;
    font-weight: 600;
  }
  .gallery-head p {
    margin: 3px 0 0;
    font-size: 12px;
    color: var(--text-muted);
  }
  .mono {
    font-family: var(--font-mono);
    color: var(--accent-text);
  }
  .close-mini {
    width: 30px;
    height: 30px;
    border-radius: 50%;
    display: grid;
    place-items: center;
    color: var(--text-muted);
  }
  .close-mini:hover {
    background: var(--surface-hover);
    color: var(--text-primary);
  }

  .gallery-grid {
    display: grid;
    grid-template-columns: repeat(4, minmax(0, 1fr));
    gap: 12px;
  }

  .scene-card {
    position: relative;
    border-radius: 16px;
    overflow: hidden;
    aspect-ratio: 16 / 10;
    border: 2px solid transparent;
    padding: 0;
    text-align: left;
    transition: transform var(--dur-fast) var(--ease-calm), border-color var(--dur-fast) var(--ease-calm);
  }
  .scene-card:hover {
    transform: translateY(-2px);
  }
  .scene-card.selected {
    border-color: var(--accent);
    box-shadow: 0 0 0 3px var(--accent-soft);
  }

  .scene-card img {
    width: 100%;
    height: 100%;
    object-fit: cover;
    display: block;
  }

  .scene-lum-badge {
    position: absolute;
    top: 7px;
    right: 7px;
    display: inline-flex;
    align-items: center;
    gap: 4px;
    padding: 2px 7px;
    border-radius: var(--r-pill);
    background: rgba(10, 14, 24, 0.65);
    backdrop-filter: blur(8px);
    font-family: var(--font-mono);
    font-size: 10px;
    color: #fff;
  }
  .scene-lum-badge i {
    width: 7px;
    height: 7px;
    border-radius: 50%;
    display: inline-block;
  }

  .scene-caption {
    position: absolute;
    inset: auto 0 0 0;
    padding: 18px 10px 8px;
    background: linear-gradient(transparent, rgba(8, 10, 18, 0.86));
    display: flex;
    flex-direction: column;
  }
  .sc-name {
    font-size: 12px;
    font-weight: 600;
    color: #fff;
  }
  .sc-sub {
    font-size: 10px;
    color: rgba(255, 255, 255, 0.75);
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
  }

  .atmo-sliders {
    display: grid;
    grid-template-columns: repeat(3, minmax(0, 1fr));
    gap: 12px;
    padding: 11px 14px;
    border-radius: 14px;
    background: var(--surface-row);
    border: 1px solid var(--border-subtle);
  }
  .sl-item {
    display: flex;
    flex-direction: column;
    gap: 5px;
    font-size: 11.5px;
    color: var(--text-secondary);
  }
  .sl-item span {
    display: flex;
    justify-content: space-between;
  }
  .sl-item strong {
    font-family: var(--font-mono);
    color: var(--text-primary);
  }
  .sl-item input {
    accent-color: var(--accent);
  }

  .gallery-foot {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 12px;
    flex-wrap: wrap;
    padding-top: 4px;
  }
  .atmo-pills,
  .pair-btns {
    display: flex;
    gap: 8px;
    flex-wrap: wrap;
  }

  .chip-toggle {
    display: inline-flex;
    align-items: center;
    gap: 6px;
    padding: 6px 12px;
    border-radius: var(--r-pill);
    background: var(--surface-row);
    border: 1px solid var(--border-subtle);
    font-size: 12px;
    color: var(--text-secondary);
    transition: all var(--dur-fast) var(--ease-calm);
  }
  .chip-toggle.on {
    background: var(--accent-soft);
    border-color: color-mix(in oklch, var(--accent) 45%, transparent);
    color: var(--accent-text);
    font-weight: 500;
  }

  @media (max-width: 900px) {
    .bottom-micro-bar {
      padding: 8px var(--stage-pad-right) 74px var(--stage-pad-left);
      justify-content: center;
      flex-wrap: wrap;
    }
    .whisper-center-pill {
      display: none;
    }
    .gallery-sheet {
      padding: 16px;
    }
    .gallery-grid {
      grid-template-columns: repeat(2, minmax(0, 1fr));
    }
    .atmo-sliders {
      grid-template-columns: 1fr;
    }
  }

  @media (max-width: 540px) {
    .gallery-grid {
      grid-template-columns: 1fr;
    }
  }
</style>
