<script lang="ts">
  import { NEURAL_MODES } from '../../lib/audio';
  import { CURATED_WALLPAPERS, STARTER_RSS_CATALOG } from '../../lib/defaults';
  import { LANGUAGE_LABELS } from '../../lib/i18n';
  import { cove } from '../../lib/state.svelte';
  import type {
    AutonomyMode,
    ClockFaceStyle,
    CornerRadiusStyle,
    FontPairId,
    LanguageCode,
    LayoutMode,
    NeuralDepth,
    NeuralModeId,
    SettingsSectionId,
    ThemeMode,
    ThemePreset,
    UiScaleId,
    WidgetSize
  } from '../../lib/types';
  import BrandIcon from './BrandIcon.svelte';
  import Icon from './Icon.svelte';

  let filterQuery = $state('');
  let confirmReset = $state(false);
  let dragImportActive = $state(false);
  let bookmarkFileInput = $state<HTMLInputElement | null>(null);

  let newEngineName = $state('');
  let newEngineBang = $state('');
  let newEngineUrl = $state('');

  let newClockCity = $state('');
  let newClockTz = $state('America/New_York');

  let newFeedTitle = $state('');
  let newFeedUrl = $state('');

  let newBlockedDomain = $state('');

  const NAV_ITEMS: {
    id: SettingsSectionId;
    label: string;
    subtitle: string;
    icon: string;
    keywords: string;
  }[] = [
    {
      id: 'general',
      label: 'General & Profile',
      subtitle: 'Greeting, language & workspace stage',
      icon: 'home',
      keywords: 'general name greeting language stage snapshot startup'
    },
    {
      id: 'typography',
      label: 'Typography & Scale',
      subtitle: 'Font pairings, type scale & clock face',
      icon: 'edit',
      keywords: 'typography typology font swiss editorial serif humanist mono scale density corners clock 24h seconds world timezone'
    },
    {
      id: 'appearance',
      label: 'Atmosphere & 4K',
      subtitle: 'Scenes, glass & optical calibration',
      icon: 'image',
      keywords: 'atmosphere wallpaper 4k scene dark light theme chameleon accent blur dim brightness contrast vignette solid upload'
    },
    {
      id: 'layout',
      label: 'Bento Layout',
      subtitle: 'Columns, spans, pinning & card order',
      icon: 'grid',
      keywords: 'bento layout grid columns pin cards widgets quicklinks triage notes focus readlater rss weather countdown iframe'
    },
    {
      id: 'smart',
      label: 'Autonomous CSE',
      subtitle: 'Autopilot mode, whisper UI & workflows',
      icon: 'sparkle',
      keywords: 'smart engine cse autonomous autopilot whisper invisible markov workflow chains circadian rhythm decay'
    },
    {
      id: 'sound',
      label: 'Neural Sound Engine',
      subtitle: 'Brainwave modulation & speech shield',
      icon: 'waves',
      keywords: 'sound audio brain fm neural beta alpha theta deep work flow calm read unwind speech shield volume chime'
    },
    {
      id: 'search',
      label: 'Search & !Bangs',
      subtitle: 'Providers, instant answers & custom URLs',
      icon: 'search',
      keywords: 'search engines bang split autocomplete instant answers duckduckgo google brave github youtube custom kagi'
    },
    {
      id: 'focus',
      label: 'Focus & Schedule',
      subtitle: 'Pomodoro, work hours & site blocker',
      icon: 'target',
      keywords: 'focus pomodoro timer break work personal schedule hours blocked domains stale tabs'
    },
    {
      id: 'privacy',
      label: 'Privacy & Feeds',
      subtitle: 'Zero-tracking ledger & RSS sources',
      icon: 'shield',
      keywords: 'privacy network ledger telemetry favicons open-meteo rss feeds offline reader'
    },
    {
      id: 'data',
      label: 'Backup & v0.1.1',
      subtitle: 'JSON export, bookmarks & MV3 extension',
      icon: 'download',
      keywords: 'backup export import json bookmarks html chrome firefox mv3 extension shortcuts factory reset version 0.1.1'
    }
  ];

  const FONT_PAIRS: { id: FontPairId; name: string; sample: string; desc: string }[] = [
    {
      id: 'swiss',
      name: 'Swiss Neo-Grotesque',
      sample: 'Aa 09:41',
      desc: 'Crisp geometric clarity inspired by Swiss modernist grids'
    },
    {
      id: 'editorial',
      name: 'Editorial Serif',
      sample: 'Aa 09:41',
      desc: 'Literary serif headings & clock paired with clean sans controls'
    },
    {
      id: 'humanist',
      name: 'Warm Humanist',
      sample: 'Aa 09:41',
      desc: 'Open, organic letterforms for calm extended reading'
    },
    {
      id: 'technical',
      name: 'Architectural Mono',
      sample: 'Aa 09:41',
      desc: 'Precision tabular monospace across display and interface'
    }
  ];

  const WIDGET_META: Record<string, { name: string; desc: string; icon: string }> = {
    quicklinks: { name: 'Quick Access', desc: 'Smart-ranked app squircles & bookmark groups', icon: 'external' },
    triage: { name: 'Open Tabs & Triage', desc: 'Duplicate sweep, stale tab rest & live peers', icon: 'layers' },
    focus: { name: 'Scenic Focus & Sound', desc: 'Pomodoro timer & Functional Neural Sound card', icon: 'target' },
    notes: { name: 'Tasks & Local Notes', desc: 'Markdown scratchpad & interactive checklists', icon: 'note' },
    readlater: { name: 'Offline Article Reader', desc: 'Clean prose extracted locally into IndexedDB', icon: 'bookmark' },
    rss: { name: 'Calm RSS Feed', desc: 'Chronological headlines with zero algorithmic noise', icon: 'rss' },
    weather: { name: 'Weather & Lunar Card', desc: '5-day Open-Meteo sky & astronomical moon phase', icon: 'sun' },
    clock: { name: 'World Clocks', desc: 'Multi-timezone live comparison strip', icon: 'clock' },
    countdown: { name: 'Milestone Countdowns', desc: 'Days remaining toward launches & deadlines', icon: 'clock' },
    iframe: { name: 'Custom Web Embed', desc: 'Sandboxed iframe card for dashboards or tools', icon: 'globe' }
  };

  const COMMON_TIMEZONES = [
    { label: 'San Francisco (America/Los_Angeles)', tz: 'America/Los_Angeles' },
    { label: 'New York (America/New_York)', tz: 'America/New_York' },
    { label: 'London (Europe/London)', tz: 'Europe/London' },
    { label: 'Berlin / Paris (Europe/Berlin)', tz: 'Europe/Berlin' },
    { label: 'India / Kolkata (Asia/Kolkata)', tz: 'Asia/Kolkata' },
    { label: 'Dubai (Asia/Dubai)', tz: 'Asia/Dubai' },
    { label: 'Singapore (Asia/Singapore)', tz: 'Asia/Singapore' },
    { label: 'Tokyo (Asia/Tokyo)', tz: 'Asia/Tokyo' },
    { label: 'Sydney (Australia/Sydney)', tz: 'Australia/Sydney' },
    { label: 'UTC (Etc/UTC)', tz: 'UTC' }
  ];

  const DAY_LABELS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

  const qLower = $derived(filterQuery.trim().toLowerCase());

  function showSection(id: SettingsSectionId): boolean {
    if (!qLower) return cove.settingsTab === id;
    const item = NAV_ITEMS.find((n) => n.id === id);
    if (!item) return false;
    return `${item.label} ${item.subtitle} ${item.keywords}`.toLowerCase().includes(qLower);
  }

  const anySearchMatch = $derived(!qLower || NAV_ITEMS.some((n) => showSection(n.id)));

  const sortedWidgets = $derived(
    [...cove.settings.widgets].sort((a, b) => a.order - b.order)
  );

  function close() {
    cove.settingsOpen = false;
    confirmReset = false;
    filterQuery = '';
  }

  function toggleWorkDay(dayIdx: number) {
    const days = cove.settings.timeAware.workDays;
    if (days.includes(dayIdx)) {
      cove.settings.timeAware.workDays = days.filter((d) => d !== dayIdx);
    } else {
      cove.settings.timeAware.workDays = [...days, dayIdx].sort();
    }
    cove.saveSettings();
  }

  function handleAddEngine(e: SubmitEvent) {
    e.preventDefault();
    if (cove.addCustomSearchEngine(newEngineName, newEngineBang, newEngineUrl)) {
      newEngineName = '';
      newEngineBang = '';
      newEngineUrl = '';
    }
  }

  function handleAddClock(e: SubmitEvent) {
    e.preventDefault();
    if (!newClockCity.trim()) return;
    cove.settings.worldClocks = [
      ...cove.settings.worldClocks,
      { city: newClockCity.trim(), timeZone: newClockTz }
    ];
    cove.saveSettings();
    newClockCity = '';
  }

  function handleAddBlockedDomain(e: SubmitEvent) {
    e.preventDefault();
    const cleaned = newBlockedDomain
      .trim()
      .toLowerCase()
      .replace(/^https?:\/\//, '')
      .replace(/^www\./, '')
      .replace(/\/.*$/, '');
    if (cleaned && !cove.settings.focus.blockedDomains.includes(cleaned)) {
      cove.settings.focus.blockedDomains = [...cove.settings.focus.blockedDomains, cleaned];
      cove.saveSettings();
    }
    newBlockedDomain = '';
  }

  async function handleAddRss(e: SubmitEvent) {
    e.preventDefault();
    if (!newFeedUrl.trim()) return;
    await cove.addRssFeed(newFeedTitle, newFeedUrl);
    newFeedTitle = '';
    newFeedUrl = '';
  }

  async function handleImportJson(file?: File) {
    if (!file) return;
    const text = await file.text();
    await cove.importAllDataJson(text);
  }

  async function handleImportBookmarks(e: Event) {
    const input = e.currentTarget as HTMLInputElement;
    const file = input.files?.[0];
    if (!file) return;
    const html = await file.text();
    await cove.importBookmarksHtmlFile(html);
    input.value = '';
  }

  function fmtRel(ts: number): string {
    const m = Math.max(1, Math.floor((Date.now() - ts) / 60_000));
    if (m < 60) return `${m}m ago`;
    const h = Math.floor(m / 60);
    if (h < 24) return `${h}h ago`;
    return `${Math.floor(h / 24)}d ago`;
  }
</script>

{#snippet switchControl(checked: boolean, onToggle: () => void, label: string)}
  <button
    type="button"
    role="switch"
    aria-checked={checked}
    aria-label={label}
    class="pill-switch"
    class:on={checked}
    onclick={onToggle}
  >
    <span class="pill-thumb"></span>
  </button>
{/snippet}

{#if cove.settingsOpen}
  <div class="fullpage-settings" role="dialog" aria-modal="true" tabindex="-1" aria-label="Cove Settings">
    <!-- Left Architectural Navigation Rail -->
    <aside class="settings-rail">
      <div class="rail-header">
        <button type="button" class="back-pill" onclick={close} title="Return to Cove (Esc)">
          <span>←</span>
          <span>Workspace</span>
        </button>
        <span class="ver-tag">v0.1.1</span>
      </div>

      <div class="rail-title-block">
        <h2>Settings</h2>
        <p>Local-first · Zero telemetry</p>
      </div>

      <div class="rail-search">
        <Icon name="search" size={14} />
        <input
          type="text"
          bind:value={filterQuery}
          placeholder="Search all settings…"
          aria-label="Search settings"
        />
        {#if filterQuery}
          <button type="button" class="clear-q" onclick={() => (filterQuery = '')} aria-label="Clear">
            <Icon name="x" size={12} />
          </button>
        {/if}
      </div>

      <nav class="rail-nav" aria-label="Settings sections">
        {#each NAV_ITEMS as nav (nav.id)}
          <button
            type="button"
            class="nav-item"
            class:active={!qLower && cove.settingsTab === nav.id}
            class:matched={Boolean(qLower) && showSection(nav.id)}
            onclick={() => {
              filterQuery = '';
              cove.settingsTab = nav.id;
            }}
          >
            <span class="nav-ico"><Icon name={nav.icon} size={15} /></span>
            <span class="nav-copy">
              <span class="nav-title">{nav.label}</span>
              <span class="nav-sub">{nav.subtitle}</span>
            </span>
            {#if nav.id === 'smart'}
              <span class="nav-pill">
                {cove.settings.smartEngine.autonomyMode === 'autonomous'
                  ? 'Auto'
                  : cove.settings.smartEngine.autonomyMode === 'assisted'
                    ? 'Assist'
                    : 'Manual'}
              </span>
            {/if}
          </button>
        {/each}
      </nav>
    </aside>

    <!-- Full-Viewport Right Content Page -->
    <div class="settings-page-main">
      <header class="page-topbar">
        <div class="page-head-copy">
          {#if qLower}
            <h1>Results for “{filterQuery}”</h1>
            <p>Matching preferences across all Cove v0.1.1 sections</p>
          {:else}
            {@const activeNav = NAV_ITEMS.find((n) => n.id === cove.settingsTab) || NAV_ITEMS[0]}
            <h1>{activeNav.label}</h1>
            <p>{activeNav.subtitle}</p>
          {/if}
        </div>

        <button type="button" class="done-btn" onclick={close}>
          <span>Done</span>
          <kbd class="kbd">Esc</kbd>
        </button>
      </header>

      <div class="page-scroll">
        <div class="page-container">
          {#if !anySearchMatch}
            <div class="empty-search">
              <p>No settings matched “{filterQuery}”.</p>
              <button type="button" class="btn-ghost" onclick={() => (filterQuery = '')}>
                Clear search filter
              </button>
            </div>
          {/if}

          <!-- ================================================================
               1. GENERAL & PROFILE
               ================================================================ -->
          {#if showSection('general')}
            <section class="studio-section">
              {#if qLower}<h3 class="sec-heading">General &amp; Profile</h3>{/if}

              <div class="studio-card">
                <div class="card-row">
                  <div class="row-info">
                    <strong>Personal Greeting Name</strong>
                    <span>Shown in the top-left time-of-day greeting capsule</span>
                  </div>
                  <input
                    type="text"
                    class="studio-input w-48"
                    placeholder="Your name (optional)"
                    bind:value={cove.settings.userName}
                    onchange={() => cove.saveSettings()}
                  />
                </div>

                <div class="card-row">
                  <div class="row-info">
                    <strong>Interface Language</strong>
                    <span>Localizes greetings, labels, and dates completely offline</span>
                  </div>
                  <select
                    class="studio-select"
                    value={cove.settings.language}
                    onchange={(e) => {
                      cove.settings.language = (e.currentTarget as HTMLSelectElement).value as LanguageCode;
                      cove.saveSettings();
                    }}
                  >
                    {#each Object.entries(LANGUAGE_LABELS) as [code, label]}
                      <option value={code}>{label}</option>
                    {/each}
                  </select>
                </div>

                <div class="card-row">
                  <div class="row-info">
                    <strong>Default Workspace Stage</strong>
                    <span>Switch stages anytime using keys 1, 2, 3, or 4</span>
                  </div>
                  <div class="seg-group">
                    {#each [
                      { id: 'dashboard', label: 'Bento' },
                      { id: 'ambient', label: 'Ambient' },
                      { id: 'focus', label: 'Focus' },
                      { id: 'blank', label: 'Stillness' }
                    ] as st}
                      <button
                        type="button"
                        class:active={cove.settings.layoutMode === st.id}
                        onclick={() => {
                          cove.settings.layoutMode = st.id as LayoutMode;
                          cove.saveSettings();
                        }}
                      >
                        {st.label}
                      </button>
                    {/each}
                  </div>
                </div>

                <div class="card-row">
                  <div class="row-info">
                    <strong>Show Hero Clock &amp; Sky Header</strong>
                    <span>Displays the sculptural clock and live sky capsule above Bento</span>
                  </div>
                  {@render switchControl(
                    cove.settings.showHeroHeader,
                    () => {
                      cove.settings.showHeroHeader = !cove.settings.showHeroHeader;
                      cove.saveSettings();
                    },
                    'Show Hero Clock & Sky Header'
                  )}
                </div>

                <div class="card-row">
                  <div class="row-info">
                    <strong>Auto-Snapshot Open Tabs</strong>
                    <span>Maintains rolling local recovery snapshots of your active session</span>
                  </div>
                  {@render switchControl(
                    cove.settings.autoSnapshotSessions,
                    () => {
                      cove.settings.autoSnapshotSessions = !cove.settings.autoSnapshotSessions;
                      cove.saveSettings();
                    },
                    'Auto-Snapshot Open Tabs'
                  )}
                </div>
              </div>
            </section>
          {/if}

          <!-- ================================================================
               2. TYPOGRAPHY, SCALE & CLOCK GEOMETRY
               ================================================================ -->
          {#if showSection('typography')}
            <section class="studio-section">
              {#if qLower}<h3 class="sec-heading">Typography &amp; Scale</h3>{/if}

              <div class="studio-card">
                <div class="card-subhead">
                  <div>
                    <strong>Typographic Pairing</strong>
                    <span>Zero-network local font stacks with tuned optical kerning &amp; tabular numerals</span>
                  </div>
                </div>

                <div class="font-pair-grid">
                  {#each FONT_PAIRS as fp (fp.id)}
                    <button
                      type="button"
                      class="font-specimen-card pair-{fp.id}"
                      class:active={cove.settings.typography?.fontPair === fp.id}
                      onclick={() => {
                        cove.settings.typography.fontPair = fp.id;
                        cove.saveSettings();
                      }}
                    >
                      <span class="spec-glyph">{fp.sample}</span>
                      <strong>{fp.name}</strong>
                      <span class="spec-desc">{fp.desc}</span>
                    </button>
                  {/each}
                </div>

                <div class="card-row">
                  <div class="row-info">
                    <strong>Interface Type Scale</strong>
                    <span>Adjusts base rem typography across cards, inputs, and reader</span>
                  </div>
                  <div class="seg-group">
                    {#each [
                      { id: 'compact', label: 'Compact (13px)' },
                      { id: 'balanced', label: 'Balanced (14px)' },
                      { id: 'spacious', label: 'Spacious (15px)' }
                    ] as sc}
                      <button
                        type="button"
                        class:active={cove.settings.typography?.uiScale === sc.id}
                        onclick={() => {
                          cove.settings.typography.uiScale = sc.id as UiScaleId;
                          cove.saveSettings();
                        }}
                      >
                        {sc.label}
                      </button>
                    {/each}
                  </div>
                </div>

                <div class="card-row">
                  <div class="row-info">
                    <strong>Surface Corner Geometry</strong>
                    <span>Controls squircle curvature across Bento cards and studios</span>
                  </div>
                  <div class="seg-group">
                    {#each [
                      { id: 'sharp', label: 'Architectural' },
                      { id: 'balanced', label: 'Balanced' },
                      { id: 'soft', label: 'Sculptural Soft' }
                    ] as cr}
                      <button
                        type="button"
                        class:active={cove.settings.typography?.cornerStyle === cr.id}
                        onclick={() => {
                          cove.settings.typography.cornerStyle = cr.id as CornerRadiusStyle;
                          cove.saveSettings();
                        }}
                      >
                        {cr.label}
                      </button>
                    {/each}
                  </div>
                </div>
              </div>

              <div class="studio-card">
                <div class="card-row">
                  <div class="row-info">
                    <strong>Hero Clock Typeface</strong>
                    <span>Click the Hero Clock anytime to cycle between all 4 faces</span>
                  </div>
                  <div class="seg-group">
                    {#each [
                      { id: 'editorial', label: 'Light Sans' },
                      { id: 'serif', label: 'Literary Serif' },
                      { id: 'bold', label: 'Sculptural Bold' },
                      { id: 'segmented', label: 'Tabular Mono' }
                    ] as cf}
                      <button
                        type="button"
                        class:active={cove.settings.clockStyle === cf.id}
                        onclick={() => {
                          cove.settings.clockStyle = cf.id as ClockFaceStyle;
                          cove.saveSettings();
                        }}
                      >
                        {cf.label}
                      </button>
                    {/each}
                  </div>
                </div>

                <div class="card-row">
                  <div class="row-info">
                    <strong>24-Hour Time Format</strong>
                    <span>Display 14:30 instead of 02:30 PM</span>
                  </div>
                  {@render switchControl(
                    cove.settings.clock24h,
                    () => {
                      cove.settings.clock24h = !cove.settings.clock24h;
                      cove.saveSettings();
                    },
                    '24-Hour Time Format'
                  )}
                </div>

                <div class="card-row">
                  <div class="row-info">
                    <strong>Show Live Seconds</strong>
                    <span>Appends tabular seconds to the Hero Clock</span>
                  </div>
                  {@render switchControl(
                    cove.settings.clockShowSeconds,
                    () => {
                      cove.settings.clockShowSeconds = !cove.settings.clockShowSeconds;
                      cove.saveSettings();
                    },
                    'Show Live Seconds'
                  )}
                </div>
              </div>

              <div class="studio-card">
                <div class="card-subhead">
                  <div>
                    <strong>World Clocks</strong>
                    <span>Cities compared inside the World Clocks Bento card</span>
                  </div>
                </div>

                <div class="chip-list">
                  {#each cove.settings.worldClocks as wc, idx}
                    <span class="removable-chip">
                      <strong>{wc.city}</strong>
                      <small>{wc.timeZone}</small>
                      <button
                        type="button"
                        onclick={() => {
                          cove.settings.worldClocks = cove.settings.worldClocks.filter((_, i) => i !== idx);
                          cove.saveSettings();
                        }}
                        aria-label={`Remove ${wc.city}`}
                      >
                        ×
                      </button>
                    </span>
                  {/each}
                </div>

                <form class="inline-add-form" onsubmit={handleAddClock}>
                  <input
                    type="text"
                    class="studio-input"
                    bind:value={newClockCity}
                    placeholder="City label (e.g. Zurich)"
                    required
                  />
                  <select class="studio-select" bind:value={newClockTz}>
                    {#each COMMON_TIMEZONES as tz}
                      <option value={tz.tz}>{tz.label}</option>
                    {/each}
                  </select>
                  <button type="submit" class="btn-primary">Add Clock</button>
                </form>
              </div>
            </section>
          {/if}

          <!-- ================================================================
               3. ATMOSPHERE & 4K SCENES
               ================================================================ -->
          {#if showSection('appearance')}
            <section class="studio-section">
              {#if qLower}<h3 class="sec-heading">Atmosphere &amp; 4K</h3>{/if}

              <div class="studio-card">
                <div class="card-row">
                  <div class="row-info">
                    <strong>Glass Material</strong>
                    <span>Smoked Harbor dark glass or luminous Frosted Alpine light glass</span>
                  </div>
                  <div class="seg-group">
                    {#each [
                      { id: 'dark', label: 'Smoked Dark' },
                      { id: 'light', label: 'Frosted Light' },
                      { id: 'system', label: 'System Auto' }
                    ] as m}
                      <button
                        type="button"
                        class:active={cove.settings.theme === m.id}
                        onclick={() => {
                          cove.settings.theme = m.id as ThemeMode;
                          cove.saveSettings();
                        }}
                      >
                        {m.label}
                      </button>
                    {/each}
                  </div>
                </div>

                <div class="card-row">
                  <div class="row-info">
                    <strong>Backdrop Source</strong>
                    <span>Bundled 4K offline scenes, custom local photo, gradient, or solid canvas</span>
                  </div>
                  <div class="seg-group">
                    {#each [
                      { id: 'cloud', label: 'Cloud Sky' },
                      { id: 'wallpaper', label: '4K Scene' },
                      { id: 'local', label: 'Custom Image' },
                      { id: 'gradient', label: 'Gradient' },
                      { id: 'solid', label: 'Solid' }
                    ] as b}
                      <button
                        type="button"
                        class:active={cove.settings.background.type === b.id}
                        onclick={() => {
                          cove.settings.background.type = b.id as any;
                          if (b.id === 'cloud') cove.settings.background.chameleonAccent = false;
                          cove.refreshWallpaperAtmosphere();
                          cove.saveSettings();
                        }}
                      >
                        {b.label}
                      </button>
                    {/each}
                  </div>
                </div>

                {#if cove.settings.background.type === 'local'}
                  <div class="card-row">
                    <div class="row-info">
                      <strong>Upload Local 4K Wallpaper</strong>
                      <span>Stored offline in IndexedDB and sampled locally by Atmosphere Engine</span>
                    </div>
                    <label class="btn-primary upload-trigger">
                      <Icon name="upload" size={13} />
                      <span>Choose Image…</span>
                      <input
                        type="file"
                        accept="image/*"
                        hidden
                        onchange={(e) => {
                          const f = (e.currentTarget as HTMLInputElement).files?.[0];
                          if (f) cove.setLocalWallpaperFile(f);
                        }}
                      />
                    </label>
                  </div>
                {:else if cove.settings.background.type === 'solid'}
                  <div class="card-row">
                    <div class="row-info">
                      <strong>Solid Canvas Color</strong>
                      <span>Minimal zero-distraction backdrop</span>
                    </div>
                    <input
                      type="color"
                      value={cove.settings.background.solidColor}
                      onchange={(e) => {
                        cove.settings.background.solidColor = (e.currentTarget as HTMLInputElement).value;
                        cove.refreshWallpaperAtmosphere();
                        cove.saveSettings();
                      }}
                    />
                  </div>
                {/if}

                <div class="scene-gallery">
                  {#each CURATED_WALLPAPERS as sc, idx (sc.id)}
                    <button
                      type="button"
                      class="scene-tile"
                      class:active={cove.settings.background.curatedIndex === idx && cove.settings.background.type === 'wallpaper'}
                      onclick={() => cove.selectWallpaper(idx)}
                    >
                      <img src={sc.localUrl} alt={sc.label} loading="lazy" />
                      <span class="lum-tag">
                        <i style="background: {sc.accentHex}"></i>
                        {Math.round(sc.luminance * 100)}%
                      </span>
                      <span class="scene-title">{sc.label}</span>
                    </button>
                  {/each}
                </div>
              </div>

              <div class="studio-card">
                <div class="card-row">
                  <div class="row-info">
                    <strong>Adaptive Wallpaper Brightness Shield</strong>
                    <span>Automatically calibrates scrim &amp; card opacity from <code>&lt;canvas&gt;</code> luminance ({Math.round(cove.atmosphere.overallLuminance * 100)}%)</span>
                  </div>
                  {@render switchControl(
                    cove.settings.background.autoBrightness,
                    () => {
                      cove.settings.background.autoBrightness = !cove.settings.background.autoBrightness;
                      cove.saveSettings();
                    },
                    'Adaptive Wallpaper Brightness'
                  )}
                </div>

                <div class="card-row">
                  <div class="row-info">
                    <strong>Chameleon Accent Harmony</strong>
                    <span>Extracts dominant scene hue ({cove.atmosphere.accentHex}) for buttons, rings, and highlights</span>
                  </div>
                  {@render switchControl(
                    cove.settings.background.chameleonAccent,
                    () => {
                      cove.settings.background.chameleonAccent = !cove.settings.background.chameleonAccent;
                      cove.saveSettings();
                    },
                    'Chameleon Accent Harmony'
                  )}
                </div>

                {#if !cove.settings.background.chameleonAccent}
                  <div class="card-row">
                    <div class="row-info">
                      <strong>Manual Accent Palette</strong>
                      <span>Used when Chameleon Accent is turned off</span>
                    </div>
                    <div class="seg-group">
                      {#each [
                        { id: 'cobalt', label: 'Website Cobalt' },
                        { id: 'harbor', label: 'Harbor Teal' },
                        { id: 'nordic', label: 'Nordic Slate' },
                        { id: 'cedar', label: 'Cedar Moss' },
                        { id: 'dusk', label: 'Twilight' }
                      ] as p}
                        <button
                          type="button"
                          class:active={cove.settings.preset === p.id}
                          onclick={() => {
                            cove.settings.preset = p.id as ThemePreset;
                            cove.saveSettings();
                          }}
                        >
                          {p.label}
                        </button>
                      {/each}
                    </div>
                  </div>
                {/if}

                <div class="slider-grid">
                  <label class="slider-box">
                    <div class="sl-head">
                      <span>Scene Brightness</span>
                      <strong>{Math.round(cove.settings.background.brightness * 100)}%</strong>
                    </div>
                    <input
                      type="range"
                      min="0.68"
                      max="1.32"
                      step="0.02"
                      bind:value={cove.settings.background.brightness}
                      oninput={() => cove.saveSettings()}
                    />
                  </label>

                  <label class="slider-box">
                    <div class="sl-head">
                      <span>Optical Contrast</span>
                      <strong>{Math.round(cove.settings.background.contrast * 100)}%</strong>
                    </div>
                    <input
                      type="range"
                      min="0.88"
                      max="1.22"
                      step="0.02"
                      bind:value={cove.settings.background.contrast}
                      oninput={() => cove.saveSettings()}
                    />
                  </label>

                  <label class="slider-box">
                    <div class="sl-head">
                      <span>Scrim Dimming</span>
                      <strong>{Math.round(cove.effectiveScrim * 100)}%</strong>
                    </div>
                    <input
                      type="range"
                      min="0"
                      max="0.65"
                      step="0.02"
                      bind:value={cove.settings.background.dim}
                      oninput={() => cove.saveSettings()}
                    />
                  </label>

                  <label class="slider-box">
                    <div class="sl-head">
                      <span>Backdrop Blur</span>
                      <strong>{cove.settings.background.blur}px</strong>
                    </div>
                    <input
                      type="range"
                      min="0"
                      max="18"
                      step="1"
                      bind:value={cove.settings.background.blur}
                      oninput={() => cove.saveSettings()}
                    />
                  </label>
                </div>

                <div class="card-foot-right">
                  <button type="button" class="btn-ghost" onclick={() => cove.resetOpticalAtmosphere()}>
                    Reset Optical Defaults
                  </button>
                </div>
              </div>
            </section>
          {/if}

          <!-- ================================================================
               4. BENTO LAYOUT & PINNING
               ================================================================ -->
          {#if showSection('layout')}
            <section class="studio-section">
              {#if qLower}<h3 class="sec-heading">Bento Layout</h3>{/if}

              <div class="studio-card">
                <div class="card-row">
                  <div class="row-info">
                    <strong>Bento Dashboard Columns</strong>
                    <span>Total columns across desktop Bento stage</span>
                  </div>
                  <div class="seg-group">
                    {#each [2, 3, 4] as cols}
                      <button
                        type="button"
                        class:active={cove.settings.gridCols === cols}
                        onclick={() => {
                          cove.settings.gridCols = cols;
                          cove.saveSettings();
                        }}
                      >
                        {cols} Columns
                      </button>
                    {/each}
                  </div>
                </div>

                <div class="card-row">
                  <div class="row-info">
                    <strong>Quick Access Tile Columns</strong>
                    <span>Number of squircle shortcuts per row inside Quick Access</span>
                  </div>
                  <div class="seg-group">
                    {#each [3, 4, 5, 6] as qcols}
                      <button
                        type="button"
                        class:active={cove.settings.quickLinkCols === qcols}
                        onclick={() => {
                          cove.settings.quickLinkCols = qcols;
                          cove.saveSettings();
                        }}
                      >
                        {qcols}
                      </button>
                    {/each}
                  </div>
                </div>
              </div>

              <div class="studio-card">
                <div class="card-subhead">
                  <div>
                    <strong>Bento Cards, Pinning &amp; Spans</strong>
                    <span>Pin any card to lock its position while Autonomous CSE adapts the rest</span>
                  </div>
                  <button type="button" class="btn-ghost" onclick={() => cove.applySmartBentoShape()}>
                    <span>Order by Rhythm Now</span>
                  </button>
                </div>

                <div class="widget-manager-list">
                  {#each sortedWidgets as w, idx (w.id)}
                    {@const meta = WIDGET_META[w.type] || { name: w.type, desc: '', icon: 'grid' }}
                    <div class="wm-row" class:dimmed={!w.visible}>
                      <div class="wm-left">
                        <span class="wm-ico"><Icon name={meta.icon} size={15} /></span>
                        <div class="wm-copy">
                          <strong>{meta.name}</strong>
                          <span>{meta.desc}</span>
                        </div>
                      </div>

                      <div class="wm-controls">
                        <button
                          type="button"
                          class="pin-chip"
                          class:pinned={w.pinned}
                          onclick={() => cove.toggleWidgetPin(w.id)}
                          title="Lock card position during autonomous Bento shaping"
                        >
                          {w.pinned ? 'Pinned' : 'Pin'}
                        </button>

                        <div class="seg-group compact" aria-label={`${meta.name} span`}>
                          {#each ['S', 'M', 'L'] as sz}
                            <button
                              type="button"
                              class:active={w.size === sz}
                              onclick={() => cove.setWidgetSize(w.id, sz as WidgetSize)}
                            >
                              {sz}
                            </button>
                          {/each}
                        </div>

                        <div class="order-btns">
                          <button
                            type="button"
                            disabled={idx === 0}
                            onclick={() => cove.moveWidgetOrder(w.id, -1)}
                            title="Move earlier"
                          >
                            ↑
                          </button>
                          <button
                            type="button"
                            disabled={idx === sortedWidgets.length - 1}
                            onclick={() => cove.moveWidgetOrder(w.id, 1)}
                            title="Move later"
                          >
                            ↓
                          </button>
                        </div>

                        {@render switchControl(
                          w.visible,
                          () => cove.toggleWidgetVisibility(w.type),
                          `Toggle ${meta.name}`
                        )}
                      </div>
                    </div>

                    {#if w.type === 'iframe' && w.visible}
                      <div class="iframe-config-row">
                        <input
                          type="text"
                          class="studio-input"
                          placeholder="Embed title"
                          bind:value={w.iframeTitle}
                          onchange={() => cove.saveSettings()}
                        />
                        <input
                          type="url"
                          class="studio-input flex-1"
                          placeholder="https://..."
                          bind:value={w.iframeUrl}
                          onchange={() => cove.saveSettings()}
                        />
                      </div>
                    {/if}
                  {/each}
                </div>
              </div>
            </section>
          {/if}

          <!-- ================================================================
               5. AUTONOMOUS CSE (COVE SMART ENGINE v4)
               ================================================================ -->
          {#if showSection('smart')}
            <section class="studio-section">
              {#if qLower}<h3 class="sec-heading">Autonomous CSE</h3>{/if}

              <div class="evolution-hero-card">
                <div class="evo-top">
                  <div>
                    <span class="evo-eyebrow">
                      On-Device CSE v4 · {cove.smartStatus.slotLabel}
                    </span>
                    <h3>Autonomous Workspace Intelligence</h3>
                    <p>
                      {cove.smartMemory.totalSignals} local signals · 14-day recency decay · 2nd-order workflow chains · 0 cloud calls
                    </p>
                  </div>
                  <button
                    type="button"
                    class="btn-ghost"
                    onclick={() => {
                      close();
                      cove.smartModalOpen = true;
                    }}
                  >
                    <span>Inspect Rhythm Matrix (⌘J)</span>
                  </button>
                </div>

                <!-- 3-Tier Autonomy Mode Selector -->
                <div class="autonomy-tier-grid">
                  {#each [
                    {
                      id: 'autonomous',
                      title: 'Full Autonomous',
                      desc: 'Silently orchestrates Bento cards, circadian 4K scenes, work/personal hours, search, sound & focus sizing'
                    },
                    {
                      id: 'assisted',
                      title: 'Assisted',
                      desc: 'Ranks shortcuts & search providers automatically while keeping layout and wallpaper manual'
                    },
                    {
                      id: 'manual',
                      title: 'Manual Only',
                      desc: 'Freezes all automatic workspace adaptations'
                    }
                  ] as tier (tier.id)}
                    <button
                      type="button"
                      class="tier-card"
                      class:active={cove.settings.smartEngine.autonomyMode === tier.id}
                      onclick={() => cove.setAutonomyMode(tier.id as AutonomyMode)}
                    >
                      <strong>{tier.title}</strong>
                      <span>{tier.desc}</span>
                    </button>
                  {/each}
                </div>
              </div>

              <div class="studio-card">
                <div class="card-row">
                  <div class="row-info">
                    <strong>Whisper Mode (Invisible UI)</strong>
                    <span>Hides all CSE badges, orbs, and stage labels from the workspace so intelligence stays invisible</span>
                  </div>
                  {@render switchControl(
                    cove.settings.smartEngine.whisperMode,
                    () => {
                      cove.settings.smartEngine.whisperMode = !cove.settings.smartEngine.whisperMode;
                      cove.saveSettings();
                    },
                    'Whisper Mode (Invisible UI)'
                  )}
                </div>

                <div class="card-row">
                  <div class="row-info">
                    <strong>Autonomous Bento Grid Orchestration</strong>
                    <span>Reorders unpinned Bento cards around your active circadian habits</span>
                  </div>
                  {@render switchControl(
                    cove.settings.smartEngine.autoShapeBento,
                    () => {
                      cove.settings.smartEngine.autoShapeBento = !cove.settings.smartEngine.autoShapeBento;
                      cove.saveSettings();
                    },
                    'Autonomous Bento Grid Orchestration'
                  )}
                </div>

                <div class="card-row">
                  <div class="row-info">
                    <strong>Autonomous Circadian 4K Scene Harmony</strong>
                    <span>Transitions wallpapers naturally across Dawn, Morning, Afternoon, Evening &amp; Night</span>
                  </div>
                  {@render switchControl(
                    cove.settings.smartEngine.autoEvolveScene,
                    () => {
                      cove.settings.smartEngine.autoEvolveScene = !cove.settings.smartEngine.autoEvolveScene;
                      cove.saveSettings();
                    },
                    'Autonomous Circadian 4K Scene Harmony'
                  )}
                </div>

                <div class="card-row">
                  <div class="row-info">
                    <strong>Autonomous Work / Personal Boundary Learning</strong>
                    <span>Learns your actual work vs personal hours from shortcut usage instead of rigid 9–6 schedules</span>
                  </div>
                  {@render switchControl(
                    cove.settings.smartEngine.autonomousContext,
                    () => {
                      cove.settings.smartEngine.autonomousContext = !cove.settings.smartEngine.autonomousContext;
                      cove.saveSettings();
                    },
                    'Autonomous Work / Personal Boundary Learning'
                  )}
                </div>

                <div class="card-row">
                  <div class="row-info">
                    <strong>Adaptive Focus Sprint Calibration</strong>
                    <span>Autonomously tunes Pomodoro sprint length (15–60m) to match your real completion rhythm</span>
                  </div>
                  {@render switchControl(
                    cove.settings.smartEngine.adaptiveFocusDuration,
                    () => {
                      cove.settings.smartEngine.adaptiveFocusDuration =
                        !cove.settings.smartEngine.adaptiveFocusDuration;
                      cove.saveSettings();
                    },
                    'Adaptive Focus Sprint Calibration'
                  )}
                </div>

                <div class="card-row">
                  <div class="row-info">
                    <strong>Adaptive Neural Sound Intelligence</strong>
                    <span>Pre-tunes functional brainwave modulation (16Hz Beta / 10.5Hz Alpha / 5.5Hz Theta) to what helps you finish</span>
                  </div>
                  {@render switchControl(
                    cove.settings.smartEngine.adaptiveSoundIntelligence,
                    () => {
                      cove.settings.smartEngine.adaptiveSoundIntelligence =
                        !cove.settings.smartEngine.adaptiveSoundIntelligence;
                      cove.saveSettings();
                    },
                    'Adaptive Neural Sound Intelligence'
                  )}
                </div>

                <div class="card-row">
                  <div class="row-info">
                    <strong>2nd-Order Markov Workflow Anticipation (A → B → C)</strong>
                    <span>Predicts sequential actions within 15m sessions with recency half-life decay</span>
                  </div>
                  {@render switchControl(
                    cove.settings.smartEngine.markovPredictions,
                    () => {
                      cove.settings.smartEngine.markovPredictions = !cove.settings.smartEngine.markovPredictions;
                      cove.saveSettings();
                    },
                    '2nd-Order Markov Workflow Anticipation'
                  )}
                </div>

                <div class="card-row">
                  <div class="row-info">
                    <strong>Contextual Action Pills</strong>
                    <span>Whispers up to 2 high-conviction actions below search (with exponential quiet backoff on dismiss)</span>
                  </div>
                  {@render switchControl(
                    cove.settings.smartEngine.showPulseSuggestions,
                    () => {
                      cove.settings.smartEngine.showPulseSuggestions =
                        !cove.settings.smartEngine.showPulseSuggestions;
                      cove.saveSettings();
                    },
                    'Contextual Action Pills'
                  )}
                </div>

                <div class="card-row">
                  <div class="row-info">
                    <strong>Autonomous Search &amp; ⌘K Ranking</strong>
                    <span>Adapts primary search engine by circadian slot and floats frequent commands in ⌘K</span>
                  </div>
                  {@render switchControl(
                    cove.settings.smartEngine.autoAdaptEngine,
                    () => {
                      const next = !cove.settings.smartEngine.autoAdaptEngine;
                      cove.settings.smartEngine.autoAdaptEngine = next;
                      cove.settings.smartEngine.smartCommandSort = next;
                      cove.saveSettings();
                    },
                    'Autonomous Search & Command Ranking'
                  )}
                </div>

                {#if cove.smartMemory.autopilotLog?.length}
                  <div class="autopilot-log-box">
                    <span class="ap-head">Recent Quiet Autopilot Adjustments</span>
                    {#each cove.smartMemory.autopilotLog.slice(0, 4) as ap (ap.id)}
                      <div class="ap-row">
                        <span class="ap-tag">{ap.action}</span>
                        <span class="ap-det">{ap.detail}</span>
                        <time>{fmtRel(ap.at)}</time>
                      </div>
                    {/each}
                  </div>
                {/if}

                <div class="card-foot-right">
                  <button type="button" class="btn-ghost danger-txt" onclick={() => cove.resetSmartMemory()}>
                    Reset Learned Memory
                  </button>
                </div>
              </div>
            </section>
          {/if}

          <!-- ================================================================
               6. FUNCTIONAL NEURAL SOUND ENGINE
               ================================================================ -->
          {#if showSection('sound')}
            <section class="studio-section">
              {#if qLower}<h3 class="sec-heading">Neural Sound Engine</h3>{/if}

              <div class="studio-card">
                <div class="card-subhead">
                  <div>
                    <strong>Functional Neural Entrainment Mode (0 KB Web Audio Synth)</strong>
                    <span>Polyphonic harmonic beds with phase-locked filter &amp; amplitude modulation</span>
                  </div>
                  <button
                    type="button"
                    class="btn-primary"
                    onclick={() => cove.toggleAudioPlayback()}
                  >
                    <Icon name={cove.audioPlaying ? 'pause' : 'play'} size={13} />
                    <span>{cove.audioPlaying ? 'Pause Audio' : 'Test Play'}</span>
                  </button>
                </div>

                <div class="font-pair-grid">
                  {#each Object.values(NEURAL_MODES) as nm (nm.id)}
                    <button
                      type="button"
                      class="font-specimen-card"
                      class:active={cove.settings.focus.neuralMode === nm.id}
                      onclick={() => cove.setNeuralMode(nm.id as NeuralModeId, true)}
                    >
                      <span class="spec-hz">{nm.band}</span>
                      <strong>{nm.label}</strong>
                      <span class="spec-desc">{nm.tagline}</span>
                    </button>
                  {/each}
                </div>

                <div class="card-row">
                  <div class="row-info">
                    <strong>Neural Phase-Locking Depth</strong>
                    <span>Controls modulation intensity on harmonic pads and coupled acoustic textures</span>
                  </div>
                  <div class="seg-group">
                    <button
                      type="button"
                      class:active={cove.settings.focus.neuralMode === 'off'}
                      onclick={() => cove.setNeuralMode('off')}
                    >
                      Off (Pure Nature)
                    </button>
                    {#each [
                      { id: 'subtle', label: 'Subtle' },
                      { id: 'balanced', label: 'Balanced' },
                      { id: 'high', label: 'Deep' }
                    ] as d}
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

                <div class="card-row">
                  <div class="row-info">
                    <strong>Speech Distraction Shield (300–2500 Hz)</strong>
                    <span>Shapes acoustic masking curve so background human speech fades into velvet hush</span>
                  </div>
                  {@render switchControl(
                    cove.settings.focus.speechBlocker,
                    () => cove.toggleSpeechBlocker(),
                    'Speech Distraction Shield'
                  )}
                </div>

                <div class="card-row">
                  <div class="row-info">
                    <strong>Auto-Couple with Pomodoro &amp; Restorative Breaks</strong>
                    <span>Starts automatically with Focus and shifts to 5.5 Hz Theta during breaks</span>
                  </div>
                  {@render switchControl(
                    cove.settings.focus.coupleSoundWithFocus,
                    () => {
                      cove.settings.focus.coupleSoundWithFocus = !cove.settings.focus.coupleSoundWithFocus;
                      cove.saveSettings();
                    },
                    'Auto-Couple with Pomodoro'
                  )}
                </div>

                <div class="card-row">
                  <div class="row-info">
                    <strong>Harmonic Completion Chime</strong>
                    <span>Plays a gentle 3-note 528Hz harmonic chime when a Focus phase finishes</span>
                  </div>
                  {@render switchControl(
                    cove.settings.focus.soundBell,
                    () => {
                      cove.settings.focus.soundBell = !cove.settings.focus.soundBell;
                      cove.saveSettings();
                    },
                    'Harmonic Completion Chime'
                  )}
                </div>

                <div class="card-row">
                  <div class="row-info">
                    <strong>Master Acoustic Gain ({Math.round(cove.settings.focus.ambientVolume * 100)}%)</strong>
                    <span>Smooth output ceiling across all neural and nature layers</span>
                  </div>
                  <input
                    type="range"
                    min="0.05"
                    max="1"
                    step="0.02"
                    value={cove.settings.focus.ambientVolume}
                    oninput={(e) =>
                      cove.setAmbientVolume(Number((e.currentTarget as HTMLInputElement).value))}
                  />
                </div>
              </div>
            </section>
          {/if}

          <!-- ================================================================
               7. SEARCH & !BANGS
               ================================================================ -->
          {#if showSection('search')}
            <section class="studio-section">
              {#if qLower}<h3 class="sec-heading">Search &amp; !Bangs</h3>{/if}

              <div class="studio-card">
                <div class="card-row">
                  <div class="row-info">
                    <strong>Zero-Latency Instant Answers</strong>
                    <span>Evaluates math, unit conversions, world time &amp; hex swatches locally in 0ms</span>
                  </div>
                  {@render switchControl(
                    cove.settings.instantAnswers !== false,
                    () => {
                      cove.settings.instantAnswers = !(cove.settings.instantAnswers !== false);
                      cove.saveSettings();
                    },
                    'Zero-Latency Instant Answers'
                  )}
                </div>

                <div class="card-row">
                  <div class="row-info">
                    <strong>Live Zero-Cookie Search Autocomplete</strong>
                    <span>Fetches instant phrase completions as you type</span>
                  </div>
                  {@render switchControl(
                    cove.settings.liveSearchSuggestions,
                    () => {
                      cove.settings.liveSearchSuggestions = !cove.settings.liveSearchSuggestions;
                      cove.saveSettings();
                    },
                    'Live Search Autocomplete'
                  )}
                </div>

                <div class="card-row">
                  <div class="row-info">
                    <strong>Split Multi-Engine Search</strong>
                    <span>Opens your query across all enabled search engines simultaneously</span>
                  </div>
                  {@render switchControl(
                    cove.settings.splitSearch,
                    () => {
                      cove.settings.splitSearch = !cove.settings.splitSearch;
                      cove.saveSettings();
                    },
                    'Split Multi-Engine Search'
                  )}
                </div>
              </div>

              <div class="studio-card">
                <div class="card-subhead">
                  <div>
                    <strong>Search Providers &amp; <code>!bang</code> Triggers</strong>
                    <span>Type any <code>!bang</code> in the search bar (e.g. <code>!gh svelte</code>) to route directly</span>
                  </div>
                </div>

                <div class="engine-list">
                  {#each cove.settings.searchEngines as eng (eng.id)}
                    <div class="engine-row">
                      <div class="eng-left">
                        <BrandIcon url={eng.domain} title={eng.name} size={18} radius={4} />
                        <div class="eng-meta">
                          <strong>{eng.name}</strong>
                          <span>{eng.urlTemplate}</span>
                        </div>
                      </div>

                      <div class="eng-right">
                        <code class="bang-pill">{eng.bang}</code>
                        {#if eng.isCustom}
                          <button
                            type="button"
                            class="icon-del"
                            onclick={() => cove.removeSearchEngine(eng.id)}
                            title="Remove custom engine"
                          >
                            <Icon name="x" size={13} />
                          </button>
                        {/if}
                        {@render switchControl(
                          eng.enabled,
                          () => {
                            const enabledCount = cove.settings.searchEngines.filter((x) => x.enabled).length;
                            if (eng.enabled && enabledCount <= 1) return;
                            eng.enabled = !eng.enabled;
                            cove.saveSettings();
                          },
                          `Enable ${eng.name}`
                        )}
                      </div>
                    </div>
                  {/each}
                </div>

                <form class="inline-add-form" onsubmit={handleAddEngine}>
                  <input
                    type="text"
                    class="studio-input"
                    bind:value={newEngineName}
                    placeholder="Name (e.g. Kagi)"
                    required
                  />
                  <input
                    type="text"
                    class="studio-input w-28"
                    bind:value={newEngineBang}
                    placeholder="!k"
                    required
                  />
                  <input
                    type="url"
                    class="studio-input flex-1"
                    bind:value={newEngineUrl}
                    placeholder="https://kagi.com/search?q={q}"
                    required
                  />
                  <button type="submit" class="btn-primary">Add Engine</button>
                </form>
              </div>
            </section>
          {/if}

          <!-- ================================================================
               8. FOCUS, SCHEDULE & DISTRACTION SHIELD
               ================================================================ -->
          {#if showSection('focus')}
            <section class="studio-section">
              {#if qLower}<h3 class="sec-heading">Focus &amp; Schedule</h3>{/if}

              <div class="studio-card">
                <div class="card-row">
                  <div class="row-info">
                    <strong>Time-Aware Context Mode</strong>
                    <span>Auto mode combines your fallback schedule with Autonomous CSE boundary learning</span>
                  </div>
                  <div class="seg-group">
                    {#each [
                      { id: 'auto', label: 'Autonomous Auto' },
                      { id: 'work', label: 'Pin Work' },
                      { id: 'personal', label: 'Pin Personal' }
                    ] as tm}
                      <button
                        type="button"
                        class:active={cove.settings.timeAware.modeOverride === tm.id}
                        onclick={() => {
                          cove.settings.timeAware.modeOverride = tm.id as any;
                          cove.saveSettings();
                        }}
                      >
                        {tm.label}
                      </button>
                    {/each}
                  </div>
                </div>

                <div class="card-row">
                  <div class="row-info">
                    <strong>Scheduled Workdays</strong>
                    <span>Baseline workdays before personal habit boundaries accumulate</span>
                  </div>
                  <div class="day-pills">
                    {#each DAY_LABELS as dLbl, dIdx}
                      <button
                        type="button"
                        class="day-btn"
                        class:active={cove.settings.timeAware.workDays.includes(dIdx)}
                        onclick={() => toggleWorkDay(dIdx)}
                      >
                        {dLbl}
                      </button>
                    {/each}
                  </div>
                </div>

                <div class="card-row">
                  <div class="row-info">
                    <strong>Scheduled Work Hours Window</strong>
                    <span>Start and end hour (24h clock)</span>
                  </div>
                  <div class="hour-pair">
                    <input
                      type="number"
                      class="studio-input w-20"
                      min="0"
                      max="23"
                      bind:value={cove.settings.timeAware.workStartHour}
                      onchange={() => cove.saveSettings()}
                    />
                    <span>to</span>
                    <input
                      type="number"
                      class="studio-input w-20"
                      min="0"
                      max="23"
                      bind:value={cove.settings.timeAware.workEndHour}
                      onchange={() => cove.saveSettings()}
                    />
                  </div>
                </div>
              </div>

              <div class="studio-card">
                <div class="card-row">
                  <div class="row-info">
                    <strong>Pomodoro Durations (Minutes)</strong>
                    <span>Focus sprint, short break, and long break</span>
                  </div>
                  <div class="hour-pair">
                    <input
                      type="number"
                      class="studio-input w-20"
                      min="5"
                      max="120"
                      bind:value={cove.settings.focus.workMinutes}
                      onchange={() => {
                        cove.resetFocus();
                        cove.saveSettings();
                      }}
                    />
                    <input
                      type="number"
                      class="studio-input w-20"
                      min="1"
                      max="30"
                      bind:value={cove.settings.focus.breakMinutes}
                      onchange={() => cove.saveSettings()}
                    />
                    <input
                      type="number"
                      class="studio-input w-20"
                      min="5"
                      max="60"
                      bind:value={cove.settings.focus.longBreakMinutes}
                      onchange={() => cove.saveSettings()}
                    />
                  </div>
                </div>

                <div class="card-row">
                  <div class="row-info">
                    <strong>Pause Distracting Sites During Focus Sprints</strong>
                    <span>Enforced via MV3 declarativeNetRequest &amp; in-app guard</span>
                  </div>
                  {@render switchControl(
                    cove.settings.focus.blockerActiveDuringFocus,
                    () => {
                      cove.settings.focus.blockerActiveDuringFocus =
                        !cove.settings.focus.blockerActiveDuringFocus;
                      cove.saveSettings();
                    },
                    'Pause Distracting Sites During Focus'
                  )}
                </div>

                <div class="card-row">
                  <div class="row-info">
                    <strong>Always Pause Distracting Sites During Work Hours</strong>
                    <span>Keeps distracting domains blocked whenever Work context is active</span>
                  </div>
                  {@render switchControl(
                    cove.settings.focus.blockerActiveDuringWorkHours,
                    () => {
                      cove.settings.focus.blockerActiveDuringWorkHours =
                        !cove.settings.focus.blockerActiveDuringWorkHours;
                      cove.saveSettings();
                    },
                    'Pause Distracting Sites During Work Hours'
                  )}
                </div>

                <div class="chip-list">
                  {#each cove.settings.focus.blockedDomains as dom}
                    <span class="removable-chip">
                      <strong>{dom}</strong>
                      <button
                        type="button"
                        onclick={() => {
                          cove.settings.focus.blockedDomains = cove.settings.focus.blockedDomains.filter((d) => d !== dom);
                          cove.saveSettings();
                        }}
                      >
                        ×
                      </button>
                    </span>
                  {/each}
                </div>

                <form class="inline-add-form" onsubmit={handleAddBlockedDomain}>
                  <input
                    type="text"
                    class="studio-input flex-1"
                    bind:value={newBlockedDomain}
                    placeholder="Add distracting domain (e.g. news.ycombinator.com)"
                  />
                  <button type="submit" class="btn-primary">Add Domain</button>
                </form>

                <div class="card-row">
                  <div class="row-info">
                    <strong>Stale Tab Threshold ({cove.settings.staleHoursThreshold} hours)</strong>
                    <span>Marks inactive tabs as ready for memory suspension in Tab Triage</span>
                  </div>
                  <input
                    type="range"
                    min="1"
                    max="12"
                    step="1"
                    bind:value={cove.settings.staleHoursThreshold}
                    onchange={() => {
                      cove.saveSettings();
                      cove.refreshTabs();
                    }}
                  />
                </div>
              </div>
            </section>
          {/if}

          <!-- ================================================================
               9. PRIVACY LEDGER & RSS FEEDS
               ================================================================ -->
          {#if showSection('privacy')}
            <section class="studio-section">
              {#if qLower}<h3 class="sec-heading">Privacy &amp; Feeds</h3>{/if}

              <div class="studio-card">
                <div class="card-subhead">
                  <div>
                    <strong>Transparent Session Network Ledger</strong>
                    <span>Every external request is opt-in and counted live. Zero analytics or cloud AI.</span>
                  </div>
                </div>

                <div class="ledger-grid">
                  <div class="ledger-box ok">
                    <span>Analytics / Telemetry</span>
                    <strong>0 (Hardcoded)</strong>
                  </div>
                  <div class="ledger-box ok">
                    <span>Autonomous CSE Cloud Calls</span>
                    <strong>0 (100% Local)</strong>
                  </div>
                  <div class="ledger-box">
                    <span>Open-Meteo Weather</span>
                    <strong>{cove.networkLedger.weather}</strong>
                  </div>
                  <div class="ledger-box">
                    <span>Offline Reader Extractions</span>
                    <strong>{cove.networkLedger.metadata}</strong>
                  </div>
                  <div class="ledger-box">
                    <span>Search Autocomplete</span>
                    <strong>{cove.networkLedger.searchSuggest}</strong>
                  </div>
                  <div class="ledger-box">
                    <span>RSS Feed Refreshes</span>
                    <strong>{cove.networkLedger.rss}</strong>
                  </div>
                </div>

                <div class="card-row">
                  <div class="row-info">
                    <strong>Brand Logos via Favicon API</strong>
                    <span>Loads crisp site icons with automatic local monogram fallback</span>
                  </div>
                  {@render switchControl(
                    cove.settings.useFaviconApi,
                    () => {
                      cove.settings.useFaviconApi = !cove.settings.useFaviconApi;
                      cove.saveSettings();
                    },
                    'Brand Logos via Favicon API'
                  )}
                </div>

                <div class="card-row">
                  <div class="row-info">
                    <strong>Live Open-Meteo Weather</strong>
                    <span>Fetches 12h curve &amp; 5-day forecast without API keys or cookies</span>
                  </div>
                  {@render switchControl(
                    cove.settings.weather.enabledOptIn,
                    () => {
                      cove.settings.weather.enabledOptIn = !cove.settings.weather.enabledOptIn;
                      cove.saveSettings();
                      if (cove.settings.weather.enabledOptIn) cove.refreshWeather(true);
                    },
                    'Live Open-Meteo Weather'
                  )}
                </div>

                <div class="card-row">
                  <div class="row-info">
                    <strong>Extract Clean Article Prose on Read Later Save</strong>
                    <span>Parses HTML locally into IndexedDB for distraction-free offline reading</span>
                  </div>
                  {@render switchControl(
                    cove.settings.readLaterFetchMetadataOptIn,
                    () => {
                      cove.settings.readLaterFetchMetadataOptIn =
                        !cove.settings.readLaterFetchMetadataOptIn;
                      cove.saveSettings();
                    },
                    'Extract Clean Article Prose'
                  )}
                </div>

                <div class="card-row">
                  <div class="row-info">
                    <strong>Enable Cove Discover &amp; Ad-Free Cove News</strong>
                    <span>Aggregates verified RSS &amp; free public news APIs with on-device interest ranking</span>
                  </div>
                  {@render switchControl(
                    cove.settings.discoverOptIn !== false,
                    () => {
                      cove.settings.discoverOptIn = !(cove.settings.discoverOptIn !== false);
                      cove.saveSettings();
                      if (cove.settings.discoverOptIn) cove.refreshDiscover(true);
                    },
                    'Enable Cove Discover'
                  )}
                </div>

                <div class="card-row">
                  <div class="row-info">
                    <strong>Enable Calm RSS Reader</strong>
                    <span>Fetches chronological XML feeds (up to 5 sources)</span>
                  </div>
                  {@render switchControl(
                    cove.settings.rssOptIn,
                    () => {
                      cove.settings.rssOptIn = !cove.settings.rssOptIn;
                      cove.saveSettings();
                      if (cove.settings.rssOptIn) cove.refreshRss(true);
                    },
                    'Enable Calm RSS Reader'
                  )}
                </div>
              </div>

              <div class="studio-card">
                <div class="card-subhead">
                  <div>
                    <strong>RSS Feed Sources ({cove.rssFeeds.length}/5)</strong>
                    <span>Manage feeds displayed inside the Calm Feed card</span>
                  </div>
                </div>

                <div class="chip-list">
                  {#each cove.rssFeeds as feed (feed.id)}
                    <span class="removable-chip">
                      <strong>{feed.title}</strong>
                      <button type="button" onclick={() => cove.removeRssFeed(feed.id)}>×</button>
                    </span>
                  {/each}
                </div>

                <div class="preset-rss-row">
                  {#each STARTER_RSS_CATALOG as cat}
                    {#if !cove.rssFeeds.some((f) => f.url === cat.url)}
                      <button
                        type="button"
                        class="btn-ghost"
                        onclick={() => cove.addRssFeed(cat.title, cat.url)}
                      >
                        + {cat.title}
                      </button>
                    {/if}
                  {/each}
                </div>

                <form class="inline-add-form" onsubmit={handleAddRss}>
                  <input
                    type="text"
                    class="studio-input"
                    bind:value={newFeedTitle}
                    placeholder="Feed title"
                  />
                  <input
                    type="url"
                    class="studio-input flex-1"
                    bind:value={newFeedUrl}
                    placeholder="https://example.com/rss.xml"
                    required
                  />
                  <button type="submit" class="btn-primary">Add Feed</button>
                </form>
              </div>
            </section>
          {/if}

          <!-- ================================================================
               10. BACKUP, EXTENSION & VERSION 0.1.1
               ================================================================ -->
          {#if showSection('data')}
            <section class="studio-section">
              {#if qLower}<h3 class="sec-heading">Backup &amp; v0.1.1</h3>{/if}

              <div class="studio-card">
                <div class="card-subhead">
                  <div>
                    <strong>Portable Local Data &amp; Bookmarks</strong>
                    <span>Own 100% of your preferences, CSE memory, notes, and offline articles</span>
                  </div>
                </div>

                <div class="action-btn-grid">
                  <button type="button" class="btn-primary" onclick={() => cove.exportAllDataJson()}>
                    <Icon name="download" size={14} />
                    <span>Export Full Backup (.json)</span>
                  </button>

                  <input
                    bind:this={bookmarkFileInput}
                    type="file"
                    accept=".html,.htm"
                    hidden
                    onchange={handleImportBookmarks}
                  />
                  <button
                    type="button"
                    class="btn-ghost"
                    onclick={() => bookmarkFileInput?.click()}
                  >
                    <Icon name="upload" size={14} />
                    <span>Import Browser Bookmarks (.html)</span>
                  </button>

                  <button type="button" class="btn-ghost" onclick={() => cove.exportReadLaterHtml()}>
                    <Icon name="bookmark" size={14} />
                    <span>Export Read Later (.html)</span>
                  </button>
                </div>

                <!-- svelte-ignore a11y_no_static_element_interactions -->
                <label
                  class="drop-zone"
                  class:active={dragImportActive}
                  ondragover={(e) => {
                    e.preventDefault();
                    dragImportActive = true;
                  }}
                  ondragleave={() => (dragImportActive = false)}
                  ondrop={async (e) => {
                    e.preventDefault();
                    dragImportActive = false;
                    await handleImportJson(e.dataTransfer?.files?.[0]);
                  }}
                >
                  <Icon name="upload" size={18} />
                  <span>Drop a Cove <code>.json</code> backup file here, or click to restore</span>
                  <input
                    type="file"
                    accept="application/json,.json"
                    hidden
                    onchange={(e) => handleImportJson((e.currentTarget as HTMLInputElement).files?.[0])}
                  />
                </label>
              </div>

              <div class="studio-card">
                <div class="card-subhead">
                  <div>
                    <strong>Install Manifest V3 Browser Extension (v0.1.1)</strong>
                    <span>Unzip and load via <code>chrome://extensions</code> → Developer mode → Load unpacked</span>
                  </div>
                </div>
                <div class="action-btn-grid">
                  <a href="/downloads/cove-chrome-mv3.zip" download class="btn-primary">
                    <Icon name="download" size={14} />
                    <span>Download Chrome / Brave / Arc MV3 (.zip)</span>
                  </a>
                  <a href="/downloads/cove-firefox-mv3.zip" download class="btn-ghost">
                    <Icon name="download" size={14} />
                    <span>Download Firefox MV3 (.zip)</span>
                  </a>
                </div>
              </div>

              <div class="studio-card">
                <div class="card-subhead">
                  <div>
                    <strong>Keyboard Shortcuts</strong>
                    <span>Designed for zero-mouse daily flow</span>
                  </div>
                </div>
                <div class="shortcut-grid">
                  <div class="sc-item"><span>Command Palette</span><kbd class="kbd">⌘K</kbd></div>
                  <div class="sc-item"><span>Full-Page Settings</span><kbd class="kbd">,</kbd></div>
                  <div class="sc-item"><span>Focus Search Bar</span><kbd class="kbd">/</kbd></div>
                  <div class="sc-item"><span>Sound Sanctuary</span><kbd class="kbd">M</kbd></div>
                  <div class="sc-item"><span>CSE Rhythm Inspector</span><kbd class="kbd">⌘J</kbd></div>
                  <div class="sc-item"><span>Switch Stages</span><kbd class="kbd">1–4</kbd></div>
                </div>
              </div>

              <div class="studio-card danger-card">
                <div class="card-row">
                  <div class="row-info">
                    <strong>Factory Reset Cove v0.1.1</strong>
                    <span>Wipes local preferences, notes, offline articles, and CSE memory</span>
                  </div>
                  {#if !confirmReset}
                    <button type="button" class="btn-ghost danger-txt" onclick={() => (confirmReset = true)}>
                      Factory Reset…
                    </button>
                  {:else}
                    <div class="hour-pair">
                      <button
                        type="button"
                        class="btn-danger"
                        onclick={() => {
                          cove.factoryReset();
                          confirmReset = false;
                        }}
                      >
                        Confirm Erase
                      </button>
                      <button type="button" class="btn-ghost" onclick={() => (confirmReset = false)}>
                        Cancel
                      </button>
                    </div>
                  {/if}
                </div>
              </div>
            </section>
          {/if}
        </div>
      </div>
    </div>
  </div>
{/if}

<style>
  /* True Edge-to-Edge Full-Viewport Architectural Settings Page */
  .fullpage-settings {
    position: fixed;
    inset: 0;
    z-index: 145;
    width: 100vw;
    height: 100vh;
    background: var(--surface-overlay);
    backdrop-filter: var(--glass-blur-heavy);
    -webkit-backdrop-filter: var(--glass-blur-heavy);
    display: grid;
    grid-template-columns: 278px minmax(0, 1fr);
    overflow: hidden;
  }

  /* Left Rail */
  .settings-rail {
    background: var(--surface-subtle);
    border-right: 1px solid var(--border-subtle);
    padding: 22px 16px 18px;
    display: flex;
    flex-direction: column;
    gap: 14px;
    min-height: 0;
  }

  .rail-header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 0 4px;
  }

  .back-pill {
    display: inline-flex;
    align-items: center;
    gap: 6px;
    padding: 6px 12px;
    border-radius: var(--r-pill);
    background: var(--surface-row);
    border: 1px solid var(--border-subtle);
    font-size: 0.86rem;
    font-weight: 560;
    color: var(--text-secondary);
    transition: all var(--dur-fast) var(--ease-calm);
  }
  .back-pill:hover {
    background: var(--surface-hover);
    color: var(--text-primary);
  }

  .ver-tag {
    font-family: var(--font-mono);
    font-size: 0.78rem;
    padding: 3px 8px;
    border-radius: var(--r-pill);
    background: var(--accent-soft);
    color: var(--accent-text);
    font-weight: 600;
  }

  .rail-title-block {
    padding: 2px 6px 0;
  }
  .rail-title-block h2 {
    margin: 0;
    font-size: 1.45rem;
    font-weight: 650;
    line-height: 1.15;
  }
  .rail-title-block p {
    margin: 3px 0 0;
    font-size: 0.82rem;
    color: var(--text-muted);
  }

  .rail-search {
    display: flex;
    align-items: center;
    gap: 8px;
    padding: 8px 12px;
    border-radius: var(--r-row);
    background: var(--surface-input);
    border: 1px solid var(--border-subtle);
    color: var(--text-muted);
  }
  .rail-search:focus-within {
    border-color: var(--accent);
  }
  .rail-search input {
    flex: 1;
    min-width: 0;
    border: none;
    outline: none;
    background: transparent;
    font-size: 0.9rem;
    color: var(--text-primary);
  }
  .clear-q {
    display: grid;
    place-items: center;
    color: var(--text-muted);
  }

  .rail-nav {
    flex: 1;
    overflow-y: auto;
    display: flex;
    flex-direction: column;
    gap: 2px;
  }

  .nav-item {
    display: flex;
    align-items: center;
    gap: 10px;
    padding: 9px 11px;
    border-radius: var(--r-row);
    text-align: left;
    color: var(--text-secondary);
    transition: all var(--dur-fast) var(--ease-calm);
  }
  .nav-item:hover {
    background: var(--surface-hover);
    color: var(--text-primary);
  }
  .nav-item.active {
    background: var(--accent-soft);
    color: var(--text-primary);
  }
  .nav-item.active .nav-ico {
    color: var(--accent-text);
  }
  .nav-item.matched {
    border: 1px solid color-mix(in oklch, var(--accent) 35%, transparent);
  }

  .nav-ico {
    width: 26px;
    height: 26px;
    border-radius: 8px;
    display: grid;
    place-items: center;
    flex-shrink: 0;
  }
  .nav-copy {
    flex: 1;
    min-width: 0;
    display: flex;
    flex-direction: column;
  }
  .nav-title {
    font-size: 0.92rem;
    font-weight: 580;
    line-height: 1.25;
  }
  .nav-sub {
    font-size: 0.76rem;
    color: var(--text-muted);
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
  }
  .nav-pill {
    font-family: var(--font-mono);
    font-size: 0.7rem;
    padding: 2px 7px;
    border-radius: var(--r-pill);
    background: var(--surface-row);
    color: var(--accent-text);
  }

  /* Main Full-Page Canvas */
  .settings-page-main {
    display: flex;
    flex-direction: column;
    min-height: 0;
  }

  .page-topbar {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 16px;
    padding: 24px 40px 18px;
    border-bottom: 1px solid var(--border-subtle);
  }
  .page-head-copy h1 {
    margin: 0;
    font-size: 1.6rem;
    font-weight: 650;
    line-height: 1.15;
  }
  .page-head-copy p {
    margin: 4px 0 0;
    font-size: 0.92rem;
    color: var(--text-muted);
  }

  .done-btn {
    display: inline-flex;
    align-items: center;
    gap: 8px;
    padding: 7px 14px;
    border-radius: var(--r-pill);
    background: var(--surface-row);
    border: 1px solid var(--border-subtle);
    font-size: 0.88rem;
    font-weight: 560;
    color: var(--text-primary);
  }
  .done-btn:hover {
    background: var(--surface-hover);
  }

  .page-scroll {
    flex: 1;
    overflow-y: auto;
    padding: 28px 40px 56px;
  }

  .page-container {
    max-width: 840px;
    margin: 0 auto;
    display: flex;
    flex-direction: column;
    gap: 26px;
  }

  .studio-section {
    display: flex;
    flex-direction: column;
    gap: 16px;
  }

  .sec-heading {
    margin: 4px 0 0;
    font-size: 0.78rem;
    text-transform: uppercase;
    letter-spacing: var(--tracking-caps, 0.075em);
    color: var(--accent-text);
  }

  .studio-card {
    border-radius: var(--r-card);
    background: var(--surface-row);
    border: 1px solid var(--border-subtle);
    padding: 8px 22px;
    display: flex;
    flex-direction: column;
  }

  .card-subhead {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 14px;
    padding: 14px 0 10px;
    flex-wrap: wrap;
  }
  .card-subhead strong {
    display: block;
    font-family: var(--font-display);
    font-size: 1rem;
    font-weight: 620;
  }
  .card-subhead span {
    font-size: 0.86rem;
    color: var(--text-muted);
  }

  .card-row {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 20px;
    padding: 15px 0;
    border-bottom: 1px solid var(--border-subtle);
    flex-wrap: wrap;
  }
  .card-row:last-child {
    border-bottom: none;
  }

  .row-info {
    flex: 1;
    min-width: 220px;
    display: flex;
    flex-direction: column;
    gap: 3px;
  }
  .row-info strong {
    font-size: 0.95rem;
    font-weight: 590;
    color: var(--text-primary);
  }
  .row-info span {
    font-size: 0.84rem;
    color: var(--text-muted);
    line-height: 1.45;
  }

  /* Font Pairing Specimen Grid */
  .font-pair-grid {
    display: grid;
    grid-template-columns: repeat(2, minmax(0, 1fr));
    gap: 10px;
    padding: 6px 0 14px;
  }
  .font-specimen-card {
    text-align: left;
    padding: 14px 16px;
    border-radius: var(--r-md);
    background: var(--surface-subtle);
    border: 1px solid var(--border-subtle);
    display: flex;
    flex-direction: column;
    gap: 4px;
    transition: all var(--dur-fast) var(--ease-calm);
  }
  .font-specimen-card:hover {
    background: var(--surface-hover);
    border-color: var(--border-strong);
  }
  .font-specimen-card.active {
    background: color-mix(in oklch, var(--accent) 14%, var(--surface-row));
    border-color: var(--accent);
  }
  .spec-glyph {
    font-size: 1.55rem;
    font-weight: 500;
    line-height: 1.1;
    color: var(--text-primary);
    font-variant-numeric: tabular-nums;
  }
  .pair-swiss .spec-glyph { font-family: 'SF Pro Display', 'Inter', system-ui, sans-serif; letter-spacing: -0.03em; }
  .pair-editorial .spec-glyph { font-family: 'Iowan Old Style', 'Charter', Georgia, serif; }
  .pair-humanist .spec-glyph { font-family: 'Avenir Next', 'Optima', system-ui, sans-serif; }
  .pair-technical .spec-glyph { font-family: 'JetBrains Mono', 'SF Mono', ui-monospace, monospace; font-size: 1.35rem; }

  .spec-hz {
    font-family: var(--font-mono);
    font-size: 0.76rem;
    color: var(--accent-text);
    font-weight: 600;
  }
  .font-specimen-card strong {
    font-size: 0.94rem;
    font-weight: 620;
  }
  .spec-desc {
    font-size: 0.8rem;
    color: var(--text-muted);
    line-height: 1.38;
  }

  /* Autonomy Tier Cards */
  .autonomy-tier-grid {
    display: grid;
    grid-template-columns: repeat(3, minmax(0, 1fr));
    gap: 10px;
  }
  .tier-card {
    text-align: left;
    padding: 13px 14px;
    border-radius: var(--r-md);
    background: var(--surface-subtle);
    border: 1px solid var(--border-subtle);
    display: flex;
    flex-direction: column;
    gap: 4px;
    transition: all var(--dur-fast) var(--ease-calm);
  }
  .tier-card:hover {
    border-color: var(--border-strong);
  }
  .tier-card.active {
    background: color-mix(in oklch, var(--accent) 16%, var(--surface-row));
    border-color: var(--accent);
  }
  .tier-card strong {
    font-size: 0.92rem;
    font-weight: 630;
  }
  .tier-card span {
    font-size: 0.78rem;
    color: var(--text-muted);
    line-height: 1.4;
  }

  .autopilot-log-box {
    margin: 8px 0 6px;
    padding: 12px 14px;
    border-radius: var(--r-md);
    background: var(--surface-subtle);
    display: flex;
    flex-direction: column;
    gap: 6px;
  }
  .ap-head {
    font-size: 0.74rem;
    text-transform: uppercase;
    letter-spacing: 0.06em;
    color: var(--text-muted);
  }
  .ap-row {
    display: flex;
    align-items: center;
    gap: 10px;
    font-size: 0.84rem;
  }
  .ap-tag {
    font-family: var(--font-mono);
    font-size: 0.74rem;
    padding: 2px 7px;
    border-radius: var(--r-pill);
    background: var(--accent-soft);
    color: var(--accent-text);
  }
  .ap-det {
    flex: 1;
    color: var(--text-secondary);
  }
  .ap-row time {
    font-family: var(--font-mono);
    font-size: 0.76rem;
    color: var(--text-muted);
  }

  /* Tactile Pill Switch */
  .pill-switch {
    position: relative;
    width: 44px;
    height: 25px;
    border-radius: 999px;
    background: rgba(128, 138, 160, 0.28);
    border: 1px solid var(--border-subtle);
    padding: 2px;
    flex-shrink: 0;
    transition: background var(--dur-fast) var(--ease-calm), border-color var(--dur-fast) var(--ease-calm);
  }
  .pill-switch.on {
    background: var(--accent);
    border-color: var(--accent);
  }
  .pill-thumb {
    display: block;
    width: 19px;
    height: 19px;
    border-radius: 50%;
    background: #ffffff;
    box-shadow: 0 2px 5px rgba(0, 0, 0, 0.26);
    transition: transform var(--dur-fast) var(--ease-spring);
  }
  .pill-switch.on .pill-thumb {
    transform: translateX(19px);
  }

  /* Inputs & Segmented Controls */
  .studio-input,
  .studio-select {
    padding: 8px 12px;
    border-radius: var(--r-sm);
    border: 1px solid var(--border-subtle);
    background: var(--surface-input);
    font-size: 0.9rem;
    color: var(--text-primary);
    outline: none;
  }
  .studio-input:focus,
  .studio-select:focus {
    border-color: var(--accent);
  }
  .w-48 { width: 195px; }
  .w-28 { width: 92px; }
  .w-20 { width: 70px; text-align: center; }
  .flex-1 { flex: 1; min-width: 160px; }

  .seg-group {
    display: inline-flex;
    padding: 3px;
    border-radius: var(--r-row);
    background: var(--surface-subtle);
    border: 1px solid var(--border-subtle);
    gap: 2px;
    flex-wrap: wrap;
  }
  .seg-group button {
    padding: 5px 11px;
    border-radius: 9px;
    font-size: 0.84rem;
    font-weight: 560;
    color: var(--text-secondary);
    transition: all var(--dur-fast) var(--ease-calm);
  }
  .seg-group button.active {
    background: var(--surface-card-solid);
    color: var(--text-primary);
    box-shadow: 0 2px 6px rgba(0, 0, 0, 0.14);
  }
  .seg-group.compact button {
    padding: 3px 8px;
    font-size: 0.78rem;
    font-family: var(--font-mono);
  }

  .pin-chip {
    padding: 4px 9px;
    border-radius: var(--r-pill);
    font-family: var(--font-mono);
    font-size: 0.74rem;
    background: var(--surface-row);
    color: var(--text-muted);
  }
  .pin-chip.pinned {
    background: var(--accent-soft);
    color: var(--accent-text);
    font-weight: 600;
  }

  /* 4K Scene Grid */
  .scene-gallery {
    display: grid;
    grid-template-columns: repeat(4, minmax(0, 1fr));
    gap: 10px;
    padding: 12px 0 14px;
  }
  .scene-tile {
    position: relative;
    aspect-ratio: 16 / 10;
    border-radius: var(--r-row);
    overflow: hidden;
    padding: 0;
    border: 2px solid transparent;
    transition: transform var(--dur-fast) var(--ease-calm), border-color var(--dur-fast) var(--ease-calm);
  }
  .scene-tile:hover {
    transform: translateY(-2px);
  }
  .scene-tile.active {
    border-color: var(--accent);
    box-shadow: 0 0 0 3px var(--accent-soft);
  }
  .scene-tile img {
    width: 100%;
    height: 100%;
    object-fit: cover;
    display: block;
  }
  .lum-tag {
    position: absolute;
    top: 6px;
    right: 6px;
    display: inline-flex;
    align-items: center;
    gap: 4px;
    padding: 2px 6px;
    border-radius: 999px;
    background: rgba(10, 14, 24, 0.68);
    color: #fff;
    font-family: var(--font-mono);
    font-size: 9.5px;
  }
  .lum-tag i {
    width: 6px;
    height: 6px;
    border-radius: 50%;
  }
  .scene-title {
    position: absolute;
    inset: auto 0 0 0;
    padding: 14px 8px 6px;
    background: linear-gradient(transparent, rgba(8, 10, 18, 0.88));
    color: #fff;
    font-size: 0.78rem;
    font-weight: 600;
    text-align: left;
  }

  .slider-grid {
    display: grid;
    grid-template-columns: repeat(2, minmax(0, 1fr));
    gap: 14px;
    padding: 14px 0;
  }
  .slider-box {
    display: flex;
    flex-direction: column;
    gap: 6px;
    padding: 11px 14px;
    border-radius: var(--r-row);
    background: var(--surface-subtle);
  }
  .sl-head {
    display: flex;
    justify-content: space-between;
    font-size: 0.86rem;
    color: var(--text-secondary);
  }
  .sl-head strong {
    font-family: var(--font-mono);
    color: var(--text-primary);
  }
  .slider-box input[type='range'],
  .card-row input[type='range'] {
    accent-color: var(--accent);
    cursor: pointer;
  }

  .card-foot-right {
    display: flex;
    justify-content: flex-end;
    padding: 8px 0 12px;
  }

  /* Widget Manager */
  .widget-manager-list {
    display: flex;
    flex-direction: column;
    gap: 6px;
    padding: 6px 0 14px;
  }
  .wm-row {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 12px;
    padding: 11px 13px;
    border-radius: var(--r-row);
    background: var(--surface-subtle);
    transition: opacity var(--dur-fast) var(--ease-calm);
  }
  .wm-row.dimmed {
    opacity: 0.56;
  }
  .wm-left {
    display: flex;
    align-items: center;
    gap: 11px;
    min-width: 0;
  }
  .wm-ico {
    width: 30px;
    height: 30px;
    border-radius: 9px;
    background: var(--surface-icon);
    color: var(--accent-text);
    display: grid;
    place-items: center;
    flex-shrink: 0;
  }
  .wm-copy {
    display: flex;
    flex-direction: column;
    min-width: 0;
  }
  .wm-copy strong {
    font-size: 0.92rem;
    font-weight: 590;
  }
  .wm-copy span {
    font-size: 0.8rem;
    color: var(--text-muted);
  }
  .wm-controls {
    display: flex;
    align-items: center;
    gap: 8px;
    flex-shrink: 0;
  }
  .order-btns {
    display: inline-flex;
    gap: 2px;
  }
  .order-btns button {
    width: 24px;
    height: 24px;
    border-radius: 7px;
    background: var(--surface-row);
    font-size: 12px;
    color: var(--text-secondary);
  }
  .order-btns button:disabled {
    opacity: 0.3;
    cursor: default;
  }
  .iframe-config-row {
    display: flex;
    gap: 8px;
    padding: 4px 12px 10px;
  }

  /* Evolution Hero Card */
  .evolution-hero-card {
    border-radius: var(--r-card);
    padding: 20px 22px;
    background: linear-gradient(
      135deg,
      color-mix(in oklch, var(--accent) 15%, var(--surface-row)),
      var(--surface-row)
    );
    border: 1px solid color-mix(in oklch, var(--accent) 34%, var(--border-subtle));
    display: flex;
    flex-direction: column;
    gap: 16px;
  }
  .evo-top {
    display: flex;
    align-items: flex-start;
    justify-content: space-between;
    gap: 14px;
    flex-wrap: wrap;
  }
  .evo-eyebrow {
    font-family: var(--font-mono);
    font-size: 0.74rem;
    text-transform: uppercase;
    letter-spacing: 0.06em;
    color: var(--accent-text);
  }
  .evo-top h3 {
    margin: 3px 0 4px;
    font-size: 1.25rem;
    font-weight: 650;
  }
  .evo-top p {
    margin: 0;
    font-size: 0.86rem;
    color: var(--text-secondary);
  }

  /* Search Engines */
  .engine-list {
    display: flex;
    flex-direction: column;
    gap: 6px;
    padding: 6px 0 12px;
  }
  .engine-row {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 12px;
    padding: 10px 13px;
    border-radius: var(--r-row);
    background: var(--surface-subtle);
  }
  .eng-left {
    display: flex;
    align-items: center;
    gap: 10px;
    min-width: 0;
  }
  .eng-meta {
    display: flex;
    flex-direction: column;
    min-width: 0;
  }
  .eng-meta strong {
    font-size: 0.92rem;
  }
  .eng-meta span {
    font-size: 0.76rem;
    font-family: var(--font-mono);
    color: var(--text-muted);
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
    max-width: 380px;
  }
  .eng-right {
    display: flex;
    align-items: center;
    gap: 10px;
  }
  .bang-pill {
    padding: 3px 8px;
    border-radius: 7px;
    background: var(--surface-row);
    color: var(--accent-text);
    font-family: var(--font-mono);
    font-size: 0.8rem;
  }
  .icon-del {
    color: var(--text-muted);
    display: grid;
    place-items: center;
  }
  .icon-del:hover {
    color: var(--status-danger);
  }

  /* Chips, Forms & Ledger */
  .chip-list,
  .preset-rss-row {
    display: flex;
    flex-wrap: wrap;
    gap: 6px;
    padding: 6px 0;
  }
  .removable-chip {
    display: inline-flex;
    align-items: center;
    gap: 6px;
    padding: 4px 10px;
    border-radius: var(--r-pill);
    background: var(--surface-subtle);
    border: 1px solid var(--border-subtle);
    font-size: 0.86rem;
  }
  .removable-chip small {
    color: var(--text-muted);
    font-family: var(--font-mono);
    font-size: 0.75rem;
  }
  .removable-chip button {
    color: var(--text-muted);
    font-size: 14px;
    line-height: 1;
  }
  .removable-chip button:hover {
    color: var(--status-danger);
  }

  .inline-add-form {
    display: flex;
    gap: 8px;
    padding: 8px 0 14px;
    flex-wrap: wrap;
  }

  .day-pills {
    display: inline-flex;
    gap: 4px;
    flex-wrap: wrap;
  }
  .day-btn {
    padding: 5px 9px;
    border-radius: 9px;
    font-size: 0.82rem;
    font-weight: 560;
    background: var(--surface-subtle);
    color: var(--text-muted);
  }
  .day-btn.active {
    background: var(--accent-soft);
    color: var(--accent-text);
  }

  .hour-pair {
    display: inline-flex;
    align-items: center;
    gap: 8px;
  }

  .ledger-grid {
    display: grid;
    grid-template-columns: repeat(3, minmax(0, 1fr));
    gap: 8px;
    padding: 6px 0 12px;
  }
  .ledger-box {
    padding: 11px 13px;
    border-radius: var(--r-row);
    background: var(--surface-subtle);
    display: flex;
    flex-direction: column;
    gap: 3px;
  }
  .ledger-box span {
    font-size: 0.78rem;
    color: var(--text-muted);
  }
  .ledger-box strong {
    font-family: var(--font-mono);
    font-size: 0.92rem;
  }
  .ledger-box.ok strong {
    color: var(--status-ok);
  }

  .action-btn-grid {
    display: flex;
    flex-wrap: wrap;
    gap: 8px;
    padding: 6px 0 12px;
  }

  .drop-zone {
    margin: 4px 0 14px;
    padding: 20px;
    border-radius: var(--r-md);
    border: 1.5px dashed var(--border-strong);
    background: var(--surface-subtle);
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 10px;
    font-size: 0.9rem;
    color: var(--text-secondary);
    cursor: pointer;
  }
  .drop-zone.active {
    border-color: var(--accent);
    background: var(--accent-soft);
  }

  .shortcut-grid {
    display: grid;
    grid-template-columns: repeat(2, minmax(0, 1fr));
    gap: 8px;
    padding: 6px 0 14px;
  }
  .sc-item {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 9px 13px;
    border-radius: var(--r-sm);
    background: var(--surface-subtle);
    font-size: 0.9rem;
  }

  .danger-card {
    border-color: color-mix(in oklch, var(--status-danger) 35%, var(--border-subtle));
  }
  .danger-txt {
    color: var(--status-danger);
  }
  .btn-danger {
    padding: 7px 14px;
    border-radius: var(--r-pill);
    background: var(--status-danger);
    color: #fff;
    font-size: 0.86rem;
    font-weight: 600;
  }
  .upload-trigger {
    cursor: pointer;
  }
  .empty-search {
    padding: 40px;
    text-align: center;
    color: var(--text-muted);
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 10px;
  }

  @media (max-width: 900px) {
    .fullpage-settings {
      grid-template-columns: 1fr;
    }
    .settings-rail {
      border-right: none;
      border-bottom: 1px solid var(--border-subtle);
      padding: 14px;
    }
    .rail-nav {
      flex-direction: row;
      overflow-x: auto;
    }
    .nav-sub,
    .rail-title-block {
      display: none;
    }
    .page-topbar,
    .page-scroll {
      padding-left: 18px;
      padding-right: 18px;
    }
    .scene-gallery,
    .font-pair-grid,
    .autonomy-tier-grid,
    .slider-grid,
    .ledger-grid,
    .shortcut-grid {
      grid-template-columns: 1fr;
    }
  }
</style>
