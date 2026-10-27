<script lang="ts">
  import { NEURAL_MODES } from '../../lib/audio';
  import { CURATED_WALLPAPERS } from '../../lib/defaults';
  import { cove } from '../../lib/state.svelte';
  import type { NeuralModeId } from '../../lib/types';
  import Icon from './Icon.svelte';

  let editingIntention = $state(false);
  let intentionDraft = $state('');

  const NEURAL_CYCLE: Exclude<NeuralModeId, 'off'>[] = [
    'deep_focus',
    'creative_flow',
    'calm_read',
    'unwind'
  ];

  const scene = $derived(
    CURATED_WALLPAPERS[(cove.settings.background.curatedIndex + 1) % CURATED_WALLPAPERS.length]
  );

  const totalSec = $derived(
    (cove.focusPhase === 'work'
      ? cove.settings.focus.workMinutes
      : cove.focusPhase === 'break'
        ? cove.settings.focus.breakMinutes
        : cove.settings.focus.longBreakMinutes || 15) * 60
  );

  const progressPct = $derived(
    totalSec > 0
      ? Math.round(Math.max(0, Math.min(1, 1 - cove.focusRemainingSec / totalSec)) * 100)
      : 0
  );

  const soundSubtitle = $derived.by(() => {
    if (cove.audioPlaying) return cove.activeAudioLabel;
    const rec = cove.recommendedNeural.mode;
    return `${NEURAL_MODES[rec].shortLabel} · ${NEURAL_MODES[rec].hz}Hz Ready`;
  });

  const statBadge = $derived.by(() => {
    const mins = cove.settings.focus.totalFocusMinutes || 0;
    const streak = cove.settings.focus.streakDays || 0;
    if (mins > 0) return `${mins}m · ${streak}d streak`;
    if (streak > 0) return `${streak}d streak`;
    return `${cove.settings.focus.workMinutes}m Flow`;
  });

  function cycleNeuralMode(step: 1 | -1) {
    const cur =
      cove.settings.focus.neuralMode !== 'off'
        ? cove.settings.focus.neuralMode
        : cove.recommendedNeural.mode;
    const idx = NEURAL_CYCLE.indexOf(cur);
    const next = NEURAL_CYCLE[(idx + step + NEURAL_CYCLE.length) % NEURAL_CYCLE.length];
    cove.setNeuralMode(next, true);
  }

  function fmt(sec: number): string {
    const m = Math.floor(sec / 60);
    const s = sec % 60;
    return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
  }

  function saveIntention(e: SubmitEvent) {
    e.preventDefault();
    cove.settings.focus.intention = intentionDraft.trim();
    cove.saveSettings();
    editingIntention = false;
  }
</script>

<div class="scenic-focus-card" style="background-image: url('{scene.localUrl}');">
  <div class="scenic-scrim"></div>

  <div class="sf-top">
    <span class="sf-pill">{statBadge}</span>
    <div class="sf-top-btns">
      <button
        type="button"
        class="sf-expand"
        class:live={cove.audioPlaying}
        onclick={() => (cove.soundMixerOpen = true)}
        title="Open Functional Neural Sound Sanctuary (M)"
      >
        <Icon name="waves" size={13} />
      </button>
      <button
        type="button"
        class="sf-expand"
        onclick={() => cove.setLayoutMode('focus')}
        title="Open full-screen Focus Sanctuary (3)"
      >
        <Icon name="maximize" size={13} />
      </button>
    </div>
  </div>

  <div class="sf-center">
    <span class="sf-timer">{fmt(cove.focusRemainingSec)}</span>
    {#if editingIntention}
      <form class="intent-form" onsubmit={saveIntention}>
        <input
          type="text"
          bind:value={intentionDraft}
          placeholder="What are you focusing on?"
          maxlength="48"
        />
      </form>
    {:else}
      <button
        type="button"
        class="sf-intention"
        onclick={() => {
          intentionDraft = cove.settings.focus.intention || '';
          editingIntention = true;
        }}
        title="Click to set your focus intention"
      >
        {cove.settings.focus.intention?.trim() || 'Set focus intention…'}
      </button>
    {/if}
  </div>

  <div class="sf-bottom">
    <div class="sf-track-meta">
      <span class="sf-label">{cove.focusPhase === 'work' ? 'Focus' : 'Recharge'}</span>
      <button
        type="button"
        class="sf-sound"
        class:playing={cove.audioPlaying}
        onclick={() => (cove.soundMixerOpen = true)}
      >
        {soundSubtitle}
      </button>
    </div>

    <div class="sf-controls">
      <button
        type="button"
        class="sf-skip"
        onclick={() => cycleNeuralMode(-1)}
        title="Previous functional neural state"
        aria-label="Previous neural mode"
      >
        <Icon name="skip-prev" size={15} />
      </button>

      <button
        type="button"
        class="sf-play-circle"
        onclick={() => (cove.focusRunning ? cove.pauseFocus() : cove.startFocus())}
        aria-label={cove.focusRunning ? 'Pause focus' : 'Start focus'}
      >
        <Icon name={cove.focusRunning ? 'pause' : 'play'} size={16} />
      </button>

      <button
        type="button"
        class="sf-skip"
        onclick={() => cycleNeuralMode(1)}
        title="Next functional neural state"
        aria-label="Next neural mode"
      >
        <Icon name="skip-next" size={15} />
      </button>
    </div>

    <div class="sf-bar">
      <div class="sf-bar-fill" style="width: {progressPct}%"></div>
    </div>
  </div>
</div>

<style>
  .scenic-focus-card {
    position: relative;
    border-radius: 18px;
    overflow: hidden;
    background-size: cover;
    background-position: center;
    min-height: 225px;
    height: 100%;
    padding: 14px 16px;
    display: flex;
    flex-direction: column;
    justify-content: space-between;
    color: #ffffff;
  }

  .scenic-scrim {
    position: absolute;
    inset: 0;
    background: linear-gradient(
      180deg,
      rgba(12, 16, 26, 0.25) 0%,
      rgba(12, 16, 26, 0.45) 45%,
      rgba(10, 14, 24, 0.88) 100%
    );
    pointer-events: none;
  }

  .sf-top,
  .sf-center,
  .sf-bottom {
    position: relative;
    z-index: 2;
  }

  .sf-top {
    display: flex;
    justify-content: space-between;
    align-items: center;
  }

  .sf-top-btns {
    display: inline-flex;
    gap: 5px;
  }

  .sf-pill {
    padding: 3px 9px;
    border-radius: var(--r-pill);
    background: rgba(255, 255, 255, 0.16);
    backdrop-filter: blur(10px);
    font-size: 11px;
    font-weight: 500;
  }

  .sf-expand {
    width: 26px;
    height: 26px;
    border-radius: 50%;
    background: rgba(255, 255, 255, 0.16);
    backdrop-filter: blur(10px);
    display: grid;
    place-items: center;
    color: #fff;
    transition: background var(--dur-fast) var(--ease-calm);
  }
  .sf-expand.live {
    background: var(--accent);
    color: var(--accent-ink);
  }
  .sf-expand:hover {
    background: rgba(255, 255, 255, 0.28);
  }

  .sf-center {
    display: flex;
    flex-direction: column;
    align-items: center;
    text-align: center;
    margin: 8px 0;
  }

  .sf-timer {
    font-size: 36px;
    font-weight: 600;
    letter-spacing: -0.04em;
    font-variant-numeric: tabular-nums;
    line-height: 1.05;
    text-shadow: 0 2px 14px rgba(0, 0, 0, 0.4);
  }

  .sf-intention {
    font-size: 11.5px;
    color: rgba(255, 255, 255, 0.78);
    margin-top: 3px;
    padding: 1px 6px;
    border-radius: 999px;
    max-width: 100%;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
  }
  .sf-intention:hover {
    color: #fff;
    background: rgba(255, 255, 255, 0.14);
  }

  .intent-form input {
    margin-top: 4px;
    padding: 4px 10px;
    border-radius: 999px;
    border: 1px solid rgba(255, 255, 255, 0.35);
    background: rgba(12, 16, 26, 0.65);
    color: #fff;
    font-size: 11.5px;
    text-align: center;
  }

  .sf-bottom {
    display: flex;
    flex-direction: column;
    gap: 9px;
  }

  .sf-track-meta {
    display: flex;
    justify-content: space-between;
    align-items: baseline;
  }
  .sf-label {
    font-size: 12.5px;
    font-weight: 600;
  }
  .sf-sound {
    padding: 0;
    font-size: 11px;
    font-family: var(--font-mono);
    color: rgba(255, 255, 255, 0.8);
  }
  .sf-sound.playing {
    color: #ffffff;
    font-weight: 600;
  }
  .sf-sound:hover {
    color: #fff;
    text-decoration: underline;
  }

  .sf-controls {
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 16px;
  }

  .sf-skip {
    color: rgba(255, 255, 255, 0.82);
    display: grid;
    place-items: center;
    padding: 4px;
  }
  .sf-skip:hover {
    color: #fff;
  }

  .sf-play-circle {
    width: 40px;
    height: 40px;
    border-radius: 50%;
    background: #ffffff;
    color: #161a28;
    display: grid;
    place-items: center;
    box-shadow: 0 6px 18px rgba(0, 0, 0, 0.35);
    transition: transform var(--dur-fast) var(--ease-calm);
  }
  .sf-play-circle:hover {
    transform: scale(1.05);
  }

  .sf-bar {
    height: 3px;
    border-radius: var(--r-pill);
    background: rgba(255, 255, 255, 0.22);
    overflow: hidden;
  }
  .sf-bar-fill {
    height: 100%;
    background: #ffffff;
    border-radius: var(--r-pill);
    transition: width var(--dur-calm) var(--ease-calm);
  }
</style>
