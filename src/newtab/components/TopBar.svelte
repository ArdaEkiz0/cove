<script lang="ts">
  import { t } from '../../lib/i18n';
  import { cove } from '../../lib/state.svelte';
  import Icon from './Icon.svelte';

  let editingName = $state(false);
  let nameDraft = $state('');

  const lang = $derived(cove.settings.language);
  const modeOverride = $derived(cove.settings.timeAware.modeOverride);

  const activeAtmoMode = $derived.by(() => {
    if (cove.settings.background.type === 'cloud') {
      return cove.isEffectiveLightTheme() ? 'cloud-light' : 'cloud-dark';
    }
    return 'scenic';
  });

  const greetingBase = $derived.by(() => {
    const hr = cove.now.getHours();
    let base = t(lang, 'goodEvening').replace(/\.$/, '');
    if (hr >= 5 && hr < 12) base = t(lang, 'goodMorning').replace(/\.$/, '');
    else if (hr >= 12 && hr < 17) base = t(lang, 'goodAfternoon').replace(/\.$/, '');
    else if (hr >= 22 || hr < 5) base = t(lang, 'quietNight').replace(/\.$/, '');
    return base;
  });

  function cycleTimeContext() {
    const order: ('auto' | 'work' | 'personal')[] = ['auto', 'work', 'personal'];
    const next = order[(order.indexOf(cove.settings.timeAware.modeOverride) + 1) % order.length];
    cove.settings.timeAware.modeOverride = next;
    cove.saveSettings();
    const label =
      next === 'auto'
        ? `Auto (${cove.activeContext === 'work' ? 'Work' : 'Personal'})`
        : next === 'work'
          ? 'Work hours'
          : 'Personal time';
    cove.notify(`Context: ${label}`);
  }

  function saveName(e: SubmitEvent) {
    e.preventDefault();
    cove.settings.userName = nameDraft.trim();
    cove.saveSettings();
    editingName = false;
  }
</script>

<header class="floating-corners" class:whisper={cove.settings.layoutMode === 'blank'}>
  <!-- Top-left Greeting + Personal Name + Time-Aware Context Capsule -->
  <div class="greeting-capsule">
    {#if editingName}
      <form class="name-form" onsubmit={saveName}>
        <input
          type="text"
          bind:value={nameDraft}
          placeholder="Your name…"
          maxlength="24"
          aria-label="Your name"
        />
        <button type="submit" class="save-mini">Save</button>
      </form>
    {:else}
      <button
        type="button"
        class="greeting-btn"
        onclick={() => {
          nameDraft = cove.settings.userName || '';
          editingName = true;
        }}
        title="Click to personalize your greeting"
      >
        <span class="greeting-main">
          {cove.settings.userName?.trim()
            ? `${greetingBase}, ${cove.settings.userName.trim()}`
            : greetingBase}
        </span>
      </button>
    {/if}

    <span class="capsule-sep">·</span>

    <button
      type="button"
      class="ctx-indicator"
      class:work={cove.activeContext === 'work'}
      onclick={cycleTimeContext}
      title="Time-aware context (click to cycle Auto / Work / Personal)"
    >
      <span class="ctx-dot"></span>
      <span>{cove.activeContext === 'work' ? t(lang, 'workMode') : t(lang, 'personalMode')}</span>
      {#if modeOverride !== 'auto'}
        <span class="pinned-badge">pinned</span>
      {/if}
    </button>
  </div>

  <!-- Top-Center Website-Style Dynamic-Island Navigation Switcher -->
  <nav class="dynamic-island-nav" aria-label="Primary Cove Views">
    <button
      type="button"
      class="cove-squircle-brand"
      onclick={() => cove.setLayoutMode('dashboard')}
      title="Cove v{cove.currentVersion} — Calm Spatial New Tab"
    >
      <img src="/icons/cove.svg" alt="" aria-hidden="true" draggable="false" />
    </button>

    <button
      type="button"
      class="island-tab"
      class:active={cove.settings.layoutMode === 'dashboard'}
      onclick={() => cove.setLayoutMode('dashboard')}
    >
      <span>New Tab</span>
    </button>

    <button
      type="button"
      class="island-tab"
      class:active={cove.settings.layoutMode === 'discover'}
      onclick={() => cove.setLayoutMode('discover')}
    >
      <Icon name="compass" size={13} />
      <span>Discover</span>
      {#if cove.discoverStories.length > 0}
        <span class="island-count">{cove.discoverStories.length}</span>
      {/if}
    </button>

    <button
      type="button"
      class="island-tab hide-xs"
      class:active={cove.settings.layoutMode === 'focus'}
      onclick={() => cove.setLayoutMode('focus')}
    >
      <Icon name="target" size={13} />
      <span>Focus</span>
    </button>
  </nav>

  <!-- Top-right Clean Capsules: 1-Click Dark/Light/4K + Focus Sound + Utility -->
  <div class="right-capsules">
    <!-- 1-Click Signature Theme Switcher (Midnight Dark First) -->
    <div class="atmo-mode-capsule hide-md" role="group" aria-label="Theme style">
      <button
        type="button"
        class="atmo-chip"
        class:active={activeAtmoMode === 'cloud-dark'}
        onclick={() => cove.setAtmosphereStyle('cloud-dark')}
        title="Midnight Cobalt (Signature Dark Mode)"
      >
        Dark
      </button>
      <button
        type="button"
        class="atmo-chip"
        class:active={activeAtmoMode === 'cloud-light'}
        onclick={() => cove.setAtmosphereStyle('cloud-light')}
        title="Alabaster Cloud (Light Mode)"
      >
        Light
      </button>
      <button
        type="button"
        class="atmo-chip"
        class:active={activeAtmoMode === 'scenic'}
        onclick={() => cove.setAtmosphereStyle('scenic')}
        title="4K Scenic Photography Mode"
      >
        4K
      </button>
    </div>

    <!-- Brain.fm-Style 1-Click Play + Sound Sanctuary Split Capsule -->
    <div class="neural-audio-capsule" class:playing={cove.audioPlaying}>
      <button
        type="button"
        class="na-play-toggle"
        onclick={() => cove.toggleAudioPlayback()}
        title={cove.audioPlaying ? 'Pause focus soundscape' : `Play ${cove.recommendedNeural.reason}`}
        aria-label={cove.audioPlaying ? 'Pause sound' : 'Play focus sound'}
      >
        <Icon name={cove.audioPlaying ? 'pause' : 'play'} size={12} />
      </button>

      <button
        type="button"
        class="na-open-studio"
        onclick={() => (cove.soundMixerOpen = true)}
        title="Open Focus Sound Sanctuary (M)"
      >
        {#if cove.audioPlaying}
          <span class="eq-bars" aria-hidden="true">
            <i></i><i></i><i></i>
          </span>
        {/if}
        <span class="na-label">{cove.activeAudioLabel}</span>
      </button>
    </div>

    {#if cove.updateAvailable}
      <button
        type="button"
        class="update-badge"
        onclick={() => cove.downloadUpdate()}
        title={`Download Cove v${cove.latestVersion} from GitHub, then reload the unpacked extension`}
        aria-label={`Update Cove to v${cove.latestVersion}`}
      >
        <span class="update-spark" aria-hidden="true">✦</span>
        <span class="update-label">Update</span>
        <span class="update-version">v{cove.latestVersion}</span>
      </button>
    {/if}

    <div class="utility-capsule">
      <button
        type="button"
        class="u-btn show-md-only"
        onclick={() =>
          cove.setAtmosphereStyle(cove.isEffectiveLightTheme() ? 'cloud-dark' : 'cloud-light')}
        title={cove.isEffectiveLightTheme() ? 'Switch to Midnight Dark Mode' : 'Switch to Alabaster Light Mode'}
        aria-label="Toggle Dark or Light Mode"
      >
        <Icon name={cove.isEffectiveLightTheme() ? 'moon' : 'sun'} size={14} />
      </button>

      <button
        type="button"
        class="u-btn hide-xs"
        class:active={cove.editGridMode}
        onclick={() => {
          cove.editGridMode = !cove.editGridMode;
          if (cove.settings.layoutMode !== 'dashboard') {
            cove.setLayoutMode('dashboard');
          }
        }}
        title="Customize Bento Grid & Toggle Widgets"
        aria-label="Edit layout"
      >
        <Icon name="edit" size={14} />
      </button>

      <button
        type="button"
        class="u-btn"
        onclick={() => cove.openSettings('general')}
        title="Full-Page Settings Studio (,)"
        aria-label="Settings"
      >
        <Icon name="sliders" size={14} />
      </button>
    </div>
  </div>
</header>

<style>
  .floating-corners {
    position: fixed;
    top: 14px;
    left: 20px;
    right: 20px;
    z-index: 50;
    display: grid;
    grid-template-columns: 1fr auto 1fr;
    align-items: center;
    gap: 12px;
    pointer-events: none;
    transition: opacity var(--dur-calm) var(--ease-calm);
  }

  .floating-corners.whisper {
    opacity: 0.22;
  }
  .floating-corners.whisper:hover {
    opacity: 1;
  }

  .greeting-capsule,
  .dynamic-island-nav,
  .right-capsules {
    pointer-events: auto;
  }

  .greeting-capsule {
    justify-self: start;
    display: inline-flex;
    align-items: center;
    gap: 8px;
    padding: 6px 14px;
    border-radius: var(--r-pill);
    background: var(--surface-dock);
    backdrop-filter: var(--glass-blur);
    border: 1px solid var(--border-subtle);
    box-shadow: var(--shadow-card);
  }

  .greeting-btn {
    color: var(--text-primary);
    font-family: var(--font-display);
    font-size: 13px;
    font-weight: 650;
    letter-spacing: -0.015em;
  }

  .name-form {
    display: inline-flex;
    align-items: center;
    gap: 6px;
  }

  .name-form input {
    width: 110px;
    padding: 2px 8px;
    border-radius: 6px;
    border: 1px solid var(--accent);
    background: var(--surface-input);
    color: var(--text-primary);
    font-size: 12.5px;
    outline: none;
  }

  .save-mini {
    padding: 2px 8px;
    border-radius: 6px;
    background: var(--accent);
    color: #ffffff;
    font-size: 11px;
    font-weight: 600;
  }

  .capsule-sep {
    color: var(--text-muted);
    font-size: 12px;
  }

  .ctx-indicator {
    display: inline-flex;
    align-items: center;
    gap: 6px;
    font-size: 12px;
    font-weight: 560;
    color: var(--text-secondary);
  }

  .ctx-dot {
    width: 7px;
    height: 7px;
    border-radius: 50%;
    background: #10b981;
  }
  .ctx-indicator.work .ctx-dot {
    background: var(--accent);
  }

  .pinned-badge {
    padding: 1px 6px;
    border-radius: var(--r-pill);
    background: var(--accent-soft);
    color: var(--accent-text);
    font-family: var(--font-mono);
    font-size: 9.5px;
    font-weight: 600;
  }

  /* ==========================================================================
     WEBSITE SIGNATURE FLOATING DYNAMIC-ISLAND NAVBAR
     ========================================================================== */
  .dynamic-island-nav {
    justify-self: center;
    display: inline-flex;
    align-items: center;
    gap: 4px;
    padding: 5px 6px;
    border-radius: var(--r-pill);
    background: var(--surface-dock);
    backdrop-filter: var(--glass-blur);
    border: 1px solid var(--border-subtle);
    box-shadow: var(--shadow-card);
  }

  .cove-squircle-brand {
    width: 30px;
    height: 30px;
    border-radius: 9px;
    display: grid;
    place-items: center;
    background: transparent;
    margin-right: 2px;
    filter: drop-shadow(0 5px 10px rgba(29, 91, 255, 0.32));
    transition: transform 180ms cubic-bezier(0.22, 1, 0.36, 1);
  }

  .cove-squircle-brand img {
    display: block;
    width: 100%;
    height: 100%;
    object-fit: contain;
    user-select: none;
    -webkit-user-drag: none;
  }

  .cove-squircle-brand:hover {
    transform: rotate(-4deg) scale(1.06);
  }

  .island-tab {
    display: inline-flex;
    align-items: center;
    gap: 6px;
    padding: 6px 14px;
    border-radius: var(--r-pill);
    font-family: var(--font-display);
    font-size: 12.5px;
    font-weight: 650;
    letter-spacing: -0.014em;
    color: var(--text-secondary);
    transition: all 180ms cubic-bezier(0.22, 1, 0.36, 1);
  }

  .island-tab:hover {
    color: var(--text-primary);
    background: var(--surface-hover);
  }

  .island-tab.active {
    background: linear-gradient(180deg, #2f6bff 0%, #1d5bff 100%);
    color: #ffffff;
    box-shadow:
      0 8px 20px -4px rgba(29, 91, 255, 0.45),
      inset 0 1px 0 rgba(255, 255, 255, 0.32);
  }

  .island-count {
    padding: 1px 6px;
    border-radius: var(--r-pill);
    background: var(--accent-soft);
    color: var(--accent-text);
    font-family: var(--font-mono);
    font-size: 10px;
    font-weight: 700;
  }

  .island-tab.active .island-count {
    background: rgba(255, 255, 255, 0.22);
    color: #ffffff;
  }

  /* Right Capsules */
  .right-capsules {
    justify-self: end;
    display: inline-flex;
    align-items: center;
    gap: 8px;
  }

  .atmo-mode-capsule {
    display: inline-flex;
    align-items: center;
    padding: 3px;
    border-radius: var(--r-pill);
    background: var(--surface-dock);
    backdrop-filter: var(--glass-blur);
    border: 1px solid var(--border-subtle);
    box-shadow: var(--shadow-card);
  }

  .atmo-chip {
    padding: 4px 10px;
    border-radius: var(--r-pill);
    font-family: var(--font-display);
    font-size: 11.5px;
    font-weight: 640;
    color: var(--text-secondary);
    transition: all 160ms ease;
  }

  .atmo-chip:hover {
    color: var(--text-primary);
  }

  .atmo-chip.active {
    background: var(--dock-active-bg);
    color: var(--dock-active-ink);
    box-shadow: 0 3px 10px rgba(29, 91, 255, 0.28);
  }

  .neural-audio-capsule {
    display: inline-flex;
    align-items: center;
    padding: 3px 4px;
    border-radius: var(--r-pill);
    background: var(--surface-dock);
    backdrop-filter: var(--glass-blur);
    border: 1px solid var(--border-subtle);
    box-shadow: var(--shadow-card);
  }

  .neural-audio-capsule.playing {
    border-color: var(--border-strong);
  }

  .na-play-toggle {
    width: 26px;
    height: 26px;
    border-radius: 50%;
    display: grid;
    place-items: center;
    background: var(--accent-soft);
    color: var(--accent-text);
    transition: all 150ms ease;
  }

  .neural-audio-capsule.playing .na-play-toggle,
  .na-play-toggle:hover {
    background: linear-gradient(180deg, #2f6bff 0%, #1d5bff 100%);
    color: #ffffff;
  }

  .na-open-studio {
    display: inline-flex;
    align-items: center;
    gap: 6px;
    padding: 4px 10px 4px 8px;
    font-size: 12px;
    font-weight: 600;
    color: var(--text-primary);
  }

  .eq-bars {
    display: inline-flex;
    align-items: flex-end;
    gap: 2px;
    height: 11px;
  }

  .eq-bars i {
    width: 2.5px;
    border-radius: 2px;
    background: var(--accent);
    animation: eqBounce 850ms ease-in-out infinite;
  }
  .eq-bars i:nth-child(1) { height: 5px; animation-delay: 0ms; }
  .eq-bars i:nth-child(2) { height: 11px; animation-delay: 180ms; }
  .eq-bars i:nth-child(3) { height: 7px; animation-delay: 340ms; }

  @keyframes eqBounce {
    0%, 100% { transform: scaleY(0.45); }
    50% { transform: scaleY(1); }
  }

  .update-badge {
    display: inline-flex;
    align-items: center;
    gap: 5px;
    padding: 6px 11px 6px 9px;
    border-radius: var(--r-pill);
    border: 1px solid color-mix(in srgb, var(--accent) 38%, transparent);
    background:
      linear-gradient(var(--surface-dock), var(--surface-dock)) padding-box,
      linear-gradient(120deg, color-mix(in srgb, var(--accent) 72%, #ffffff), transparent 55%, color-mix(in srgb, var(--accent) 42%, transparent)) border-box;
    color: var(--accent-text);
    font-family: var(--font-display);
    font-size: 11.5px;
    font-weight: 700;
    letter-spacing: -0.01em;
    white-space: nowrap;
    box-shadow:
      0 8px 20px -8px color-mix(in srgb, var(--accent) 55%, transparent),
      inset 0 1px 0 rgba(255, 255, 255, 0.38);
    transition: transform 160ms ease, box-shadow 160ms ease;
  }

  .update-badge:hover {
    transform: translateY(-1px);
    box-shadow:
      0 12px 24px -8px color-mix(in srgb, var(--accent) 62%, transparent),
      inset 0 1px 0 rgba(255, 255, 255, 0.48);
  }

  .update-spark {
    display: inline-grid;
    place-items: center;
    width: 17px;
    height: 17px;
    border-radius: 50%;
    background: color-mix(in srgb, var(--accent) 16%, transparent);
    color: var(--accent-text);
    font-size: 10px;
    line-height: 1;
  }

  .update-version {
    padding: 1px 5px;
    border-radius: var(--r-pill);
    background: color-mix(in srgb, var(--accent) 13%, transparent);
    font-family: var(--font-mono);
    font-size: 9.5px;
    font-weight: 700;
  }

  .utility-capsule {
    display: inline-flex;
    align-items: center;
    gap: 2px;
    padding: 3px;
    border-radius: var(--r-pill);
    background: var(--surface-dock);
    backdrop-filter: var(--glass-blur);
    border: 1px solid var(--border-subtle);
    box-shadow: var(--shadow-card);
  }

  .u-btn {
    width: 30px;
    height: 30px;
    border-radius: 50%;
    display: grid;
    place-items: center;
    color: var(--text-secondary);
    transition: all 150ms ease;
  }

  .u-btn:hover,
  .u-btn.active {
    background: var(--surface-hover);
    color: var(--accent-text);
  }

  .show-md-only {
    display: none;
  }

  @media (max-width: 1120px) {
    .hide-md {
      display: none !important;
    }
    .show-md-only {
      display: grid;
    }
    .capsule-sep,
    .ctx-indicator {
      display: none;
    }
  }

  @media (max-width: 920px) {
    .floating-corners {
      left: 12px;
      right: 12px;
      top: 10px;
      grid-template-columns: auto 1fr;
      gap: 8px;
    }
    .greeting-capsule {
      display: none;
    }
    .dynamic-island-nav {
      justify-self: start;
    }
    .na-label {
      display: none;
    }
    .na-open-studio {
      padding: 4px 6px;
    }
  }

  @media (max-width: 560px) {
    .hide-xs {
      display: none !important;
    }
    .update-badge {
      padding: 5px 8px;
    }
    .update-version {
      display: none;
    }
    .island-tab {
      padding: 5px 10px;
      font-size: 12px;
    }
    .island-count {
      display: none;
    }
  }
</style>
