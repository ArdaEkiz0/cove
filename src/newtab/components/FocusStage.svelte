<script lang="ts">
  import { NEURAL_MODES } from '../../lib/audio';
  import { cove } from '../../lib/state.svelte';
  import type { NeuralModeId } from '../../lib/types';
  import Icon from './Icon.svelte';

  let editingIntention = $state(false);
  let showBlocker = $state(false);
  let domainInput = $state('');

  const NEURAL_OPTIONS: { id: Exclude<NeuralModeId, 'off'>; label: string; hz: string }[] = [
    { id: 'deep_focus', label: 'Deep Work', hz: '16Hz' },
    { id: 'creative_flow', label: 'Flow', hz: '10.5Hz' },
    { id: 'calm_read', label: 'Read', hz: '8.5Hz' },
    { id: 'unwind', label: 'Unwind', hz: '5.5Hz' }
  ];

  const totalSec = $derived(
    (cove.focusPhase === 'work'
      ? cove.settings.focus.workMinutes
      : cove.focusPhase === 'break'
        ? cove.settings.focus.breakMinutes
        : cove.settings.focus.longBreakMinutes || 15) * 60
  );

  const progressRatio = $derived(
    totalSec > 0 ? Math.max(0, Math.min(1, 1 - cove.focusRemainingSec / totalSec)) : 0
  );

  const ringCircumference = 2 * Math.PI * 116;
  const strokeOffset = $derived(ringCircumference * (1 - progressRatio));

  function fmt(sec: number): string {
    const m = Math.floor(sec / 60);
    const s = sec % 60;
    return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
  }

  function addDomain(e: SubmitEvent) {
    e.preventDefault();
    const cleaned = domainInput
      .trim()
      .toLowerCase()
      .replace(/^https?:\/\//, '')
      .replace(/^www\./, '')
      .replace(/\/.*$/, '');
    if (cleaned && !cove.settings.focus.blockedDomains.includes(cleaned)) {
      cove.settings.focus.blockedDomains = [...cove.settings.focus.blockedDomains, cleaned];
      cove.saveSettings();
    }
    domainInput = '';
  }
</script>

<section class="focus-sanctuary" aria-label="Focus Sanctuary">
  <div class="sanctuary-center">
    <div class="intention-row">
      {#if editingIntention}
        <form
          onsubmit={(e) => {
            e.preventDefault();
            editingIntention = false;
            cove.saveSettings();
          }}
        >
          <input
            type="text"
            class="intention-input"
            bind:value={cove.settings.focus.intention}
            placeholder="What do you want to focus on?"
            onblur={() => {
              editingIntention = false;
              cove.saveSettings();
            }}
          />
        </form>
      {:else}
        <button
          type="button"
          class="intention-btn"
          onclick={() => (editingIntention = true)}
        >
          <span>{cove.settings.focus.intention || 'What do you want to focus on?'}</span>
          <Icon name="edit" size={14} />
        </button>
      {/if}
    </div>

    <div class="phase-pills">
      <button
        type="button"
        class="ph-pill"
        class:active={cove.focusPhase === 'work'}
        onclick={() => cove.selectFocusPhase('work')}
      >
        Focus
      </button>
      <button
        type="button"
        class="ph-pill"
        class:active={cove.focusPhase === 'break'}
        onclick={() => cove.selectFocusPhase('break')}
      >
        Short Break
      </button>
      <button
        type="button"
        class="ph-pill"
        class:active={cove.focusPhase === 'longBreak'}
        onclick={() => cove.selectFocusPhase('longBreak')}
      >
        Long Break
      </button>
    </div>

    <!-- Sculptural Circular Halo + Monumental Countdown -->
    <div class="timer-halo-wrap" class:breathing={cove.audioPlaying}>
      <svg class="halo-svg" viewBox="0 0 256 256" aria-hidden="true">
        <circle class="halo-track" cx="128" cy="128" r="116" />
        <circle
          class="halo-progress"
          cx="128"
          cy="128"
          r="116"
          stroke-dasharray={ringCircumference}
          stroke-dashoffset={strokeOffset}
        />
      </svg>
      <div class="halo-inner">
        <div class="monumental-timer">{fmt(cove.focusRemainingSec)}</div>
        {#if cove.audioPlaying && cove.settings.focus.neuralMode !== 'off'}
          <span class="halo-sub">
            {NEURAL_MODES[cove.settings.focus.neuralMode].band}
          </span>
        {/if}
      </div>
    </div>

    {#if cove.focusPhase === 'work' && !cove.focusRunning}
      <div class="dur-chips">
        {#each [15, 25, 45, 60] as m}
          <button
            type="button"
            class="dur-chip"
            class:active={cove.settings.focus.workMinutes === m}
            onclick={() => {
              cove.settings.focus.workMinutes = m;
              cove.focusRemainingSec = m * 60;
              cove.saveSettings();
            }}
          >
            {m}m
          </button>
        {/each}
      </div>
    {/if}

    <div class="stage-cta-row">
      <button
        type="button"
        class="start-stage-btn"
        onclick={() => (cove.focusRunning ? cove.pauseFocus() : cove.startFocus())}
      >
        {cove.focusRunning ? 'Pause Session' : 'Start Flow'}
      </button>

      <button
        type="button"
        class="reset-circle-btn"
        onclick={() => cove.resetFocus()}
        aria-label="Reset timer"
        title="Reset timer"
      >
        <Icon name="refresh" size={18} />
      </button>
    </div>

    <!-- Functional Neural Sound Dock -->
    <div class="sanctuary-dock">
      <div class="sc-strip">
        <button
          type="button"
          class="sc-chip"
          class:active={!cove.audioPlaying}
          onclick={() => cove.stopAllSounds()}
        >
          Quiet
        </button>

        {#each NEURAL_OPTIONS as opt (opt.id)}
          <button
            type="button"
            class="sc-chip"
            class:active={cove.audioPlaying && cove.settings.focus.neuralMode === opt.id}
            onclick={() => cove.setNeuralMode(opt.id, true)}
          >
            <span>{opt.label}</span>
            <small>{opt.hz}</small>
          </button>
        {/each}

        <button
          type="button"
          class="sc-chip studio-btn"
          onclick={() => (cove.soundMixerOpen = true)}
        >
          <Icon name="sliders" size={12} />
          <span>Sound Studio</span>
        </button>
      </div>

      <div class="meta-strip">
        {#if cove.settings.focus.streakDays > 0}
          <span class="streak-pill">{cove.settings.focus.streakDays}-day streak</span>
        {/if}
        <button
          type="button"
          class="shield-pill"
          class:enforced={cove.isBlockerCurrentlyEnforced}
          onclick={() => (showBlocker = !showBlocker)}
        >
          <Icon name="shield" size={13} />
          <span>{cove.settings.focus.blockedDomains.length} distracting sites paused</span>
        </button>
      </div>

      {#if showBlocker}
        <div class="stage-blocker-card">
          <form class="sb-form" onsubmit={addDomain}>
            <input type="text" bind:value={domainInput} placeholder="Block domain during focus (e.g. reddit.com)" />
            <button type="submit" class="btn-primary">Add</button>
          </form>
          <div class="sb-tags">
            {#each cove.settings.focus.blockedDomains as d}
              <span class="sb-tag">
                {d}
                <button
                  type="button"
                  onclick={() => {
                    cove.settings.focus.blockedDomains = cove.settings.focus.blockedDomains.filter((x) => x !== d);
                    cove.saveSettings();
                  }}
                >
                  ×
                </button>
              </span>
            {/each}
          </div>
        </div>
      {/if}
    </div>
  </div>
</section>

<style>
  .focus-sanctuary {
    position: relative;
    z-index: 15;
    flex: 1;
    display: grid;
    place-items: center;
    padding: 64px var(--stage-pad-right) 72px var(--stage-pad-left);
  }

  .sanctuary-center {
    display: flex;
    flex-direction: column;
    align-items: center;
    text-align: center;
    max-width: 620px;
    width: 100%;
  }

  .intention-row {
    margin-bottom: 12px;
  }

  .intention-btn {
    display: inline-flex;
    align-items: center;
    gap: 8px;
    font-size: 18px;
    font-weight: 500;
    color: var(--hero-ink);
    text-shadow: var(--hero-shadow);
    padding: 6px 14px;
    border-radius: var(--r-pill);
    transition: background var(--dur-fast) var(--ease-calm);
  }
  .intention-btn:hover {
    background: rgba(255, 255, 255, 0.12);
  }

  .intention-input {
    font-size: 18px;
    font-weight: 500;
    text-align: center;
    padding: 6px 18px;
    border-radius: var(--r-pill);
    border: 1px solid rgba(255, 255, 255, 0.35);
    background: rgba(16, 18, 28, 0.65);
    backdrop-filter: blur(18px);
    color: #fff;
    min-width: 310px;
    outline: none;
  }

  .phase-pills {
    display: inline-flex;
    gap: 8px;
    margin-bottom: 14px;
  }

  .ph-pill {
    padding: 6px 15px;
    border-radius: var(--r-pill);
    font-size: 12px;
    font-weight: 500;
    color: rgba(255, 255, 255, 0.9);
    background: rgba(18, 20, 32, 0.42);
    backdrop-filter: blur(16px);
    border: 1px solid rgba(255, 255, 255, 0.22);
    transition: all var(--dur-fast) var(--ease-calm);
  }
  .ph-pill.active {
    background: var(--accent);
    border-color: var(--accent);
    color: var(--accent-ink);
    font-weight: 600;
  }

  /* Circular Halo */
  .timer-halo-wrap {
    position: relative;
    width: 248px;
    height: 248px;
    display: grid;
    place-items: center;
    margin: 4px 0 14px;
  }
  .halo-svg {
    position: absolute;
    inset: 0;
    width: 100%;
    height: 100%;
    transform: rotate(-90deg);
  }
  .halo-track {
    fill: rgba(12, 16, 26, 0.24);
    stroke: rgba(255, 255, 255, 0.18);
    stroke-width: 4;
  }
  .halo-progress {
    fill: none;
    stroke: var(--accent);
    stroke-width: 5;
    stroke-linecap: round;
    transition: stroke-dashoffset 0.8s var(--ease-calm);
  }
  .halo-inner {
    position: relative;
    z-index: 2;
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 4px;
  }
  .monumental-timer {
    font-size: 68px;
    font-weight: 700;
    letter-spacing: -0.045em;
    line-height: 1;
    font-variant-numeric: tabular-nums;
    color: var(--hero-ink);
    text-shadow: var(--hero-shadow);
  }
  .halo-sub {
    font-family: var(--font-mono);
    font-size: 11px;
    color: rgba(255, 255, 255, 0.85);
    padding: 2px 9px;
    border-radius: var(--r-pill);
    background: rgba(255, 255, 255, 0.14);
  }

  .dur-chips {
    display: inline-flex;
    gap: 6px;
    margin-bottom: 16px;
  }
  .dur-chip {
    padding: 3px 10px;
    border-radius: var(--r-pill);
    font-family: var(--font-mono);
    font-size: 11.5px;
    color: rgba(255, 255, 255, 0.82);
    background: rgba(16, 18, 28, 0.36);
    border: 1px solid rgba(255, 255, 255, 0.18);
  }
  .dur-chip.active {
    background: var(--accent-soft);
    border-color: var(--accent);
    color: #fff;
  }

  .stage-cta-row {
    display: inline-flex;
    align-items: center;
    gap: 12px;
    margin-bottom: 22px;
  }

  .start-stage-btn {
    min-width: 142px;
    height: 44px;
    padding: 0 28px;
    border-radius: var(--r-pill);
    background: linear-gradient(180deg, color-mix(in oklch, var(--accent) 92%, white), var(--accent));
    color: var(--accent-ink);
    font-size: 14.5px;
    font-weight: 600;
    box-shadow: inset 0 1px 0 rgba(255, 255, 255, 0.3), 0 8px 26px var(--accent-soft);
    transition: transform var(--dur-fast) var(--ease-calm), filter var(--dur-fast) var(--ease-calm);
  }
  .start-stage-btn:hover {
    filter: brightness(1.06);
    transform: translateY(-1px);
  }

  .reset-circle-btn {
    width: 42px;
    height: 42px;
    border-radius: 50%;
    background: rgba(18, 20, 32, 0.44);
    backdrop-filter: blur(14px);
    border: 1px solid rgba(255, 255, 255, 0.22);
    color: #ffffff;
    display: grid;
    place-items: center;
  }

  .sanctuary-dock {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 10px;
    padding: 12px 16px;
    border-radius: 22px;
    background: var(--surface-card);
    backdrop-filter: var(--glass-blur);
    border: 1px solid var(--border-subtle);
    box-shadow: var(--shadow-card);
  }

  .sc-strip {
    display: flex;
    flex-wrap: wrap;
    justify-content: center;
    gap: 5px;
  }

  .sc-chip {
    display: inline-flex;
    align-items: center;
    gap: 5px;
    padding: 5px 11px;
    border-radius: var(--r-pill);
    font-size: 11.5px;
    color: var(--text-secondary);
    background: var(--surface-row);
    transition: all var(--dur-fast) var(--ease-calm);
  }
  .sc-chip small {
    font-family: var(--font-mono);
    font-size: 9.8px;
    opacity: 0.72;
  }
  .sc-chip:hover {
    color: var(--text-primary);
    background: var(--surface-hover);
  }
  .sc-chip.active {
    background: var(--accent);
    color: var(--accent-ink);
    font-weight: 560;
  }
  .sc-chip.studio-btn {
    border: 1px solid var(--border-subtle);
  }

  .meta-strip {
    display: flex;
    align-items: center;
    gap: 10px;
    font-size: 11.5px;
  }
  .streak-pill {
    color: var(--status-ok);
    font-weight: 500;
  }
  .shield-pill {
    display: inline-flex;
    align-items: center;
    gap: 5px;
    color: var(--text-secondary);
  }
  .shield-pill.enforced {
    color: var(--accent-text);
  }

  .stage-blocker-card {
    width: 100%;
    padding-top: 8px;
    border-top: 1px solid var(--border-subtle);
    display: flex;
    flex-direction: column;
    gap: 8px;
  }
  .sb-form {
    display: flex;
    gap: 6px;
  }
  .sb-form input {
    flex: 1;
    padding: 6px 11px;
    border-radius: var(--r-pill);
    border: 1px solid var(--border-subtle);
    background: var(--surface-input);
    font-size: 12px;
  }
  .sb-tags {
    display: flex;
    flex-wrap: wrap;
    gap: 5px;
    justify-content: center;
  }
  .sb-tag {
    display: inline-flex;
    align-items: center;
    gap: 4px;
    padding: 2px 9px;
    border-radius: var(--r-pill);
    background: var(--surface-row);
    font-family: var(--font-mono);
    font-size: 11px;
    color: var(--text-secondary);
  }

  @media (max-width: 900px) {
    .focus-sanctuary {
      padding: 16px 16px 84px;
    }
  }
</style>
