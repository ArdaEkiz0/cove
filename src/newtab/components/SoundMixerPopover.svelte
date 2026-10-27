<script lang="ts">
  import { NEURAL_MODES, soundEngine, type NeuralModeSpec } from '../../lib/audio';
  import { cove } from '../../lib/state.svelte';
  import type { NeuralDepth, NeuralModeId, SoundLayerMix, SoundTrackId } from '../../lib/types';
  import Icon from './Icon.svelte';

  let showTextureMixer = $state(false);
  let spectrumBars = $state<number[]>(new Array(24).fill(0));

  const MODE_LIST: NeuralModeSpec[] = [
    NEURAL_MODES.deep_focus,
    NEURAL_MODES.creative_flow,
    NEURAL_MODES.calm_read,
    NEURAL_MODES.unwind
  ];

  const TRACKS: { id: SoundTrackId; label: string; icon: string }[] = [
    { id: 'rain', label: 'Gentle Rain', icon: 'cloud-rain' },
    { id: 'waves', label: 'Cove Waves', icon: 'waves' },
    { id: 'whitenoise', label: 'Velvet Noise', icon: 'volume' },
    { id: 'wind', label: 'Pine Wind', icon: 'sun' },
    { id: 'cafe', label: 'Quiet Café', icon: 'coffee' }
  ];

  const CURATED_SCENES: {
    label: string;
    mode: Exclude<NeuralModeId, 'off'>;
    depth: NeuralDepth;
    mix: SoundLayerMix;
  }[] = [
    {
      label: 'Rainy Deep Work',
      mode: 'deep_focus',
      depth: 'balanced',
      mix: { waves: 0, rain: 0.62, cafe: 0, whitenoise: 0.25, wind: 0 }
    },
    {
      label: 'Coastal Alpha Flow',
      mode: 'creative_flow',
      depth: 'balanced',
      mix: { waves: 0.68, rain: 0, cafe: 0, whitenoise: 0, wind: 0.28 }
    },
    {
      label: 'Study Café Shield',
      mode: 'deep_focus',
      depth: 'subtle',
      mix: { waves: 0, rain: 0.35, cafe: 0.52, whitenoise: 0.22, wind: 0 }
    },
    {
      label: 'Theta Ocean Rest',
      mode: 'unwind',
      depth: 'subtle',
      mix: { waves: 0.78, rain: 0, cafe: 0, whitenoise: 0, wind: 0.32 }
    }
  ];

  // Genuine real-time AnalyserNode spectrum loop while modal is open & audio is playing
  $effect(() => {
    if (!cove.soundMixerOpen || !cove.audioPlaying) {
      spectrumBars = new Array(24).fill(0);
      return;
    }
    let raf = 0;
    const tick = () => {
      spectrumBars = soundEngine.sampleSpectrum(24);
      raf = window.requestAnimationFrame(tick);
    };
    raf = window.requestAnimationFrame(tick);
    return () => window.cancelAnimationFrame(raf);
  });

  function applyScene(sc: (typeof CURATED_SCENES)[number]) {
    cove.settings.focus.soundMix = { ...sc.mix };
    cove.setNeuralDepth(sc.depth);
    cove.setNeuralMode(sc.mode, false);
  }

  const currentModeSpec = $derived(
    cove.settings.focus.neuralMode !== 'off'
      ? NEURAL_MODES[cove.settings.focus.neuralMode]
      : null
  );

  const activeTexturesCount = $derived(
    Object.values(cove.settings.focus.soundMix || {}).filter((v) => v > 0.02).length
  );
</script>

{#if cove.soundMixerOpen}
  <!-- svelte-ignore a11y_click_events_have_key_events -->
  <!-- svelte-ignore a11y_no_static_element_interactions -->
  <div class="neural-backdrop" onclick={() => (cove.soundMixerOpen = false)}>
    <div
      class="neural-studio"
      role="dialog"
      aria-modal="true"
      tabindex="-1"
      aria-label="Cove Functional Neural Sound Engine"
      onclick={(e) => e.stopPropagation()}
    >
      <!-- Header -->
      <header class="ns-head">
        <div>
          <span class="ns-eyebrow">Functional Neural Audio · 0 KB Synth</span>
          <h2>Sound Sanctuary</h2>
        </div>

        <div class="ns-head-right">
          <div class="fade-pills" title="Auto-fade sleep timer">
            {#each [null, 15, 30, 60] as mins}
              <button
                type="button"
                class:active={cove.soundFadeRemainingMin === mins}
                onclick={() => cove.setSoundFadeTimer(mins)}
              >
                {mins === null ? '∞' : `${mins}m`}
              </button>
            {/each}
          </div>

          <button
            type="button"
            class="ns-close"
            onclick={() => (cove.soundMixerOpen = false)}
            aria-label="Close Sound Sanctuary"
          >
            <Icon name="x" size={16} />
          </button>
        </div>
      </header>

      <!-- Hero Neural Player Stage -->
      <div class="ns-hero" class:playing={cove.audioPlaying}>
        <button
          type="button"
          class="ns-play-orb"
          onclick={() => cove.toggleAudioPlayback()}
          aria-label={cove.audioPlaying ? 'Pause neural audio' : 'Play neural audio'}
        >
          <Icon name={cove.audioPlaying ? 'pause' : 'play'} size={20} />
        </button>

        <div class="ns-hero-info">
          {#if cove.audioPlaying && currentModeSpec}
            <div class="ns-live-row">
              <strong>{currentModeSpec.label}</strong>
              <span class="hz-badge">{currentModeSpec.band}</span>
            </div>
            <p>{currentModeSpec.tagline}</p>
          {:else if cove.audioPlaying}
            <div class="ns-live-row">
              <strong>Pure Acoustic Nature</strong>
              <span class="hz-badge">{activeTexturesCount} Layer{activeTexturesCount === 1 ? '' : 's'}</span>
            </div>
            <p>Unmodulated organic ambient textures</p>
          {:else}
            <div class="ns-live-row">
              <strong>Ready · {NEURAL_MODES[cove.recommendedNeural.mode].label}</strong>
              <span class="hz-badge subtle">{NEURAL_MODES[cove.recommendedNeural.mode].band}</span>
            </div>
            <p>{cove.recommendedNeural.reason}</p>
          {/if}
        </div>

        <!-- Genuine Real-Time AnalyserNode Spectrum -->
        <div class="ns-spectrum" aria-hidden="true">
          {#each spectrumBars as energy, idx (idx)}
            <span
              class="spec-bar"
              style="height: {cove.audioPlaying ? Math.max(14, Math.round(energy * 100)) : 12}%; opacity: {cove.audioPlaying ? 0.45 + energy * 0.55 : 0.22}"
            ></span>
          {/each}
        </div>
      </div>

      <!-- 4 Brain.fm-Inspired Functional Mental States -->
      <div class="mode-grid">
        {#each MODE_LIST as m (m.id)}
          {@const selected = cove.settings.focus.neuralMode === m.id && cove.audioPlaying}
          {@const suggested = !cove.audioPlaying && cove.recommendedNeural.mode === m.id}
          <button
            type="button"
            class="mode-card"
            class:selected
            class:suggested
            onclick={() => cove.setNeuralMode(m.id, true)}
          >
            <div class="mc-top">
              <strong>{m.label}</strong>
              <span class="mc-hz">{m.band}</span>
            </div>
            <span class="mc-desc">{m.tagline}</span>
          </button>
        {/each}
      </div>

      <!-- Neural Phase-Locking Effect Depth & Acoustic Intelligence Row -->
      <div class="effect-bar">
        <div class="eff-left">
          <span class="eff-label">Neural Effect</span>
          <div class="depth-seg">
            <button
              type="button"
              class:active={cove.settings.focus.neuralMode === 'off'}
              onclick={() => cove.setNeuralMode('off')}
            >
              Off
            </button>
            {#each [
              { id: 'subtle', label: 'Subtle' },
              { id: 'balanced', label: 'Balanced' },
              { id: 'high', label: 'Deep' }
            ] as d (d.id)}
              <button
                type="button"
                class:active={cove.settings.focus.neuralMode !== 'off' && cove.settings.focus.neuralDepth === d.id}
                onclick={() => {
                  if (cove.settings.focus.neuralMode === 'off') {
                    cove.setNeuralMode(cove.recommendedNeural.mode, true);
                  }
                  cove.setNeuralDepth(d.id as NeuralDepth);
                }}
              >
                {d.label}
              </button>
            {/each}
          </div>
        </div>

        <div class="eff-toggles">
          <button
            type="button"
            class="mini-opt"
            class:on={cove.settings.focus.speechBlocker}
            onclick={() => cove.toggleSpeechBlocker()}
            title="Masks human vocal frequencies (300–2500 Hz) so background chatter fades away"
          >
            Speech Shield
          </button>
          <button
            type="button"
            class="mini-opt"
            class:on={cove.settings.focus.coupleSoundWithFocus}
            onclick={() => {
              cove.settings.focus.coupleSoundWithFocus = !cove.settings.focus.coupleSoundWithFocus;
              cove.saveSettings();
            }}
            title="Auto-starts with Pomodoro & shifts to 5.5 Hz Theta during breaks"
          >
            Sync Focus
          </button>
        </div>
      </div>

      <!-- 1-Tap Curated Neural Scenes -->
      <div class="scene-pills">
        {#each CURATED_SCENES as sc (sc.label)}
          <button type="button" class="sc-pill" onclick={() => applyScene(sc)}>
            {sc.label}
          </button>
        {/each}
      </div>

      <!-- Expandable Organic Texture Mixer -->
      <div class="texture-drawer">
        <button
          type="button"
          class="tex-trigger"
          onclick={() => (showTextureMixer = !showTextureMixer)}
        >
          <span>Organic Background Textures ({activeTexturesCount} active)</span>
          <span class="chev">{showTextureMixer ? '−' : '+'}</span>
        </button>

        {#if showTextureMixer}
          <div class="track-list">
            {#each TRACKS as tr (tr.id)}
              {@const level = cove.settings.focus.soundMix?.[tr.id] ?? 0}
              <div class="track-row" class:active={level > 0.02}>
                <button
                  type="button"
                  class="track-ico"
                  onclick={() => cove.setSoundTrackLevel(tr.id, level > 0.02 ? 0 : 0.6)}
                >
                  <Icon name={tr.icon} size={14} />
                </button>
                <span class="track-name">{tr.label}</span>
                <input
                  type="range"
                  min="0"
                  max="1"
                  step="0.02"
                  value={level}
                  aria-label={`${tr.label} level`}
                  oninput={(e) =>
                    cove.setSoundTrackLevel(tr.id, Number((e.currentTarget as HTMLInputElement).value))}
                />
                <span class="track-pct">{Math.round(level * 100)}%</span>
              </div>
            {/each}
          </div>
        {/if}
      </div>

      <!-- Master Output Bar -->
      <div class="master-row">
        <span class="m-lbl">Master Volume</span>
        <input
          type="range"
          min="0.05"
          max="1"
          step="0.02"
          value={cove.settings.focus.ambientVolume}
          aria-label="Master sound volume"
          oninput={(e) =>
            cove.setAmbientVolume(Number((e.currentTarget as HTMLInputElement).value))}
        />
        <span class="m-val">{Math.round(cove.settings.focus.ambientVolume * 100)}%</span>
      </div>
    </div>
  </div>
{/if}

<style>
  .neural-backdrop {
    position: fixed;
    inset: 0;
    z-index: 150;
    background: var(--backdrop-scrim);
    backdrop-filter: blur(10px);
    -webkit-backdrop-filter: blur(10px);
    display: grid;
    place-items: center;
    padding: 18px;
  }

  .neural-studio {
    width: min(540px, 100%);
    max-height: 88vh;
    overflow-y: auto;
    padding: 20px 22px;
    border-radius: var(--r-xl);
    background: var(--surface-overlay);
    backdrop-filter: var(--glass-blur-heavy);
    border: 1px solid var(--border-strong);
    box-shadow: var(--shadow-elevated);
    display: flex;
    flex-direction: column;
    gap: 14px;
  }

  .ns-head {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 12px;
  }
  .ns-eyebrow {
    font-family: var(--font-mono);
    font-size: 10px;
    text-transform: uppercase;
    letter-spacing: 0.08em;
    color: var(--accent-text);
  }
  .ns-head h2 {
    margin: 2px 0 0;
    font-size: 18px;
    font-weight: 650;
    letter-spacing: -0.02em;
  }
  .ns-head-right {
    display: flex;
    align-items: center;
    gap: 8px;
  }

  .fade-pills {
    display: inline-flex;
    padding: 2px;
    border-radius: 10px;
    background: var(--surface-subtle);
    border: 1px solid var(--border-subtle);
  }
  .fade-pills button {
    padding: 3px 7px;
    border-radius: 7px;
    font-family: var(--font-mono);
    font-size: 10.5px;
    color: var(--text-muted);
  }
  .fade-pills button.active {
    background: var(--surface-card-solid);
    color: var(--text-primary);
  }

  .ns-close {
    width: 30px;
    height: 30px;
    border-radius: 50%;
    display: grid;
    place-items: center;
    color: var(--text-secondary);
  }
  .ns-close:hover {
    background: var(--surface-hover);
    color: var(--text-primary);
  }

  /* Hero Neural Stage */
  .ns-hero {
    display: grid;
    grid-template-columns: 50px 1fr 96px;
    align-items: center;
    gap: 14px;
    padding: 14px 16px;
    border-radius: 18px;
    background: var(--surface-row);
    border: 1px solid var(--border-subtle);
    transition: border-color var(--dur-calm) var(--ease-calm), background var(--dur-calm) var(--ease-calm);
  }
  .ns-hero.playing {
    background: linear-gradient(
      135deg,
      color-mix(in oklch, var(--accent) 18%, var(--surface-row)),
      var(--surface-row)
    );
    border-color: color-mix(in oklch, var(--accent) 45%, var(--border-subtle));
  }

  .ns-play-orb {
    width: 50px;
    height: 50px;
    border-radius: 50%;
    background: var(--accent);
    color: var(--accent-ink);
    display: grid;
    place-items: center;
    box-shadow: 0 6px 20px var(--accent-soft);
    transition: transform var(--dur-fast) var(--ease-spring), filter var(--dur-fast) var(--ease-calm);
  }
  .ns-play-orb:hover {
    transform: scale(1.05);
    filter: brightness(1.06);
  }

  .ns-hero-info {
    min-width: 0;
  }
  .ns-live-row {
    display: flex;
    align-items: center;
    gap: 8px;
    flex-wrap: wrap;
  }
  .ns-live-row strong {
    font-size: 14.5px;
    font-weight: 650;
  }
  .hz-badge {
    padding: 2px 7px;
    border-radius: var(--r-pill);
    background: var(--accent-soft);
    color: var(--accent-text);
    font-family: var(--font-mono);
    font-size: 10px;
    font-weight: 600;
  }
  .hz-badge.subtle {
    background: var(--surface-subtle);
    color: var(--text-muted);
  }
  .ns-hero-info p {
    margin: 3px 0 0;
    font-size: 11.8px;
    color: var(--text-secondary);
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
  }

  .ns-spectrum {
    height: 36px;
    display: flex;
    align-items: flex-end;
    gap: 2px;
  }
  .spec-bar {
    flex: 1;
    border-radius: 2px;
    background: var(--accent);
    transition: height 75ms linear;
  }

  /* 4 Mental State Cards */
  .mode-grid {
    display: grid;
    grid-template-columns: repeat(2, minmax(0, 1fr));
    gap: 8px;
  }
  .mode-card {
    text-align: left;
    padding: 11px 13px;
    border-radius: 15px;
    background: var(--surface-subtle);
    border: 1px solid var(--border-subtle);
    display: flex;
    flex-direction: column;
    gap: 4px;
    transition: all var(--dur-fast) var(--ease-calm);
  }
  .mode-card:hover {
    background: var(--surface-hover);
    border-color: var(--border-strong);
  }
  .mode-card.suggested {
    border-color: color-mix(in oklch, var(--accent) 32%, var(--border-subtle));
  }
  .mode-card.selected {
    background: color-mix(in oklch, var(--accent) 15%, var(--surface-row));
    border-color: var(--accent);
  }
  .mc-top {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 6px;
  }
  .mc-top strong {
    font-size: 13px;
    font-weight: 620;
    color: var(--text-primary);
  }
  .mc-hz {
    font-family: var(--font-mono);
    font-size: 9.8px;
    color: var(--accent-text);
  }
  .mc-desc {
    font-size: 11px;
    color: var(--text-muted);
    line-height: 1.35;
  }

  /* Neural Effect & Options */
  .effect-bar {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 10px;
    flex-wrap: wrap;
    padding: 9px 12px;
    border-radius: 14px;
    background: var(--surface-subtle);
    border: 1px solid var(--border-subtle);
  }
  .eff-left {
    display: flex;
    align-items: center;
    gap: 8px;
  }
  .eff-label {
    font-size: 11.5px;
    font-weight: 580;
    color: var(--text-secondary);
  }
  .depth-seg {
    display: inline-flex;
    padding: 2px;
    border-radius: 10px;
    background: var(--surface-row);
    gap: 2px;
  }
  .depth-seg button {
    padding: 4px 9px;
    border-radius: 8px;
    font-size: 11px;
    font-weight: 550;
    color: var(--text-muted);
  }
  .depth-seg button.active {
    background: var(--accent);
    color: var(--accent-ink);
  }

  .eff-toggles {
    display: inline-flex;
    gap: 6px;
  }
  .mini-opt {
    padding: 4px 9px;
    border-radius: var(--r-pill);
    font-size: 11px;
    font-weight: 550;
    background: var(--surface-row);
    color: var(--text-muted);
    border: 1px solid transparent;
  }
  .mini-opt.on {
    background: var(--accent-soft);
    color: var(--accent-text);
    border-color: color-mix(in oklch, var(--accent) 30%, transparent);
  }

  .scene-pills {
    display: flex;
    flex-wrap: wrap;
    gap: 6px;
  }
  .sc-pill {
    padding: 5px 11px;
    border-radius: var(--r-pill);
    font-size: 11.5px;
    font-weight: 540;
    background: var(--surface-row);
    border: 1px solid var(--border-subtle);
    color: var(--text-secondary);
    transition: all var(--dur-fast) var(--ease-calm);
  }
  .sc-pill:hover {
    color: var(--text-primary);
    border-color: var(--accent);
    background: var(--accent-soft);
  }

  /* Texture Drawer */
  .texture-drawer {
    border-radius: 14px;
    background: var(--surface-subtle);
    border: 1px solid var(--border-subtle);
    overflow: hidden;
  }
  .tex-trigger {
    width: 100%;
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 10px 13px;
    font-size: 12px;
    font-weight: 580;
    color: var(--text-secondary);
  }
  .tex-trigger:hover {
    color: var(--text-primary);
  }
  .chev {
    font-family: var(--font-mono);
    font-size: 14px;
  }

  .track-list {
    display: flex;
    flex-direction: column;
    gap: 6px;
    padding: 2px 12px 12px;
  }
  .track-row {
    display: grid;
    grid-template-columns: 28px 92px 1fr 36px;
    align-items: center;
    gap: 8px;
  }
  .track-ico {
    width: 28px;
    height: 28px;
    border-radius: 8px;
    background: var(--surface-row);
    color: var(--text-muted);
    display: grid;
    place-items: center;
  }
  .track-row.active .track-ico {
    background: var(--accent);
    color: var(--accent-ink);
  }
  .track-name {
    font-size: 12px;
    color: var(--text-secondary);
  }
  .track-row.active .track-name {
    color: var(--text-primary);
    font-weight: 560;
  }
  .track-pct {
    font-family: var(--font-mono);
    font-size: 10.5px;
    color: var(--text-muted);
    text-align: right;
  }

  input[type='range'] {
    width: 100%;
    accent-color: var(--accent);
    cursor: pointer;
  }

  .master-row {
    display: grid;
    grid-template-columns: auto 1fr 38px;
    align-items: center;
    gap: 10px;
    padding-top: 6px;
    border-top: 1px solid var(--border-subtle);
    font-size: 12px;
  }
  .m-lbl {
    color: var(--text-muted);
    font-weight: 560;
  }
  .m-val {
    font-family: var(--font-mono);
    font-size: 11px;
    color: var(--text-muted);
    text-align: right;
  }

  @media (max-width: 560px) {
    .mode-grid {
      grid-template-columns: 1fr;
    }
    .ns-hero {
      grid-template-columns: 46px 1fr;
    }
    .ns-spectrum {
      display: none;
    }
  }
</style>
