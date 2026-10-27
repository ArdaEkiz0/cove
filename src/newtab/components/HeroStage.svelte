<script lang="ts">
  import { describeWeatherCode, getMoonPhase } from '../../lib/moon';
  import { cove, type GeocodedCityOption } from '../../lib/state.svelte';
  import Icon from './Icon.svelte';

  let cityQuery = $state('');
  let cityOptions = $state<GeocodedCityOption[]>([]);
  let searchTimer: number | null = null;

  const lang = $derived(cove.settings.language);
  const unit = $derived(cove.settings.weather.unit);
  const moon = $derived(getMoonPhase(cove.now));

  const clockParts = $derived.by(() => {
    const d = cove.now;
    const rawHours = d.getHours();
    const mins = String(d.getMinutes()).padStart(2, '0');
    const secs = String(d.getSeconds()).padStart(2, '0');

    if (cove.settings.clock24h) {
      return {
        main: `${String(rawHours).padStart(2, '0')}:${mins}`,
        sec: cove.settings.clockShowSeconds ? `:${secs}` : '',
        meridiem: ''
      };
    }

    const h12 = rawHours % 12 || 12;
    return {
      main: `${String(h12).padStart(2, '0')}:${mins}`,
      sec: cove.settings.clockShowSeconds ? `:${secs}` : '',
      meridiem: rawHours >= 12 ? 'PM' : 'AM'
    };
  });

  const dateLine = $derived(
    cove.now.toLocaleDateString(lang === 'en' ? 'en-US' : lang, {
      weekday: 'long',
      day: 'numeric',
      month: 'long'
    })
  );

  const cond = $derived(
    cove.weatherCache
      ? describeWeatherCode(cove.weatherCache.weatherCode)
      : { label: cove.weatherLoading ? 'Syncing sky…' : 'Live Sky', icon: 'cloud-sun' as const }
  );

  const sparklinePath = $derived.by(() => {
    const pts = cove.weatherCache?.hourly || [];
    if (pts.length < 2) return '';
    const temps = pts.map((p) => p.tempC);
    const min = Math.min(...temps);
    const max = Math.max(...temps);
    const span = Math.max(1, max - min);
    const w = 240;
    const h = 38;
    return pts
      .map((p, idx) => {
        const x = (idx / (pts.length - 1)) * w;
        const y = h - ((p.tempC - min) / span) * (h - 10) - 5;
        return `${idx === 0 ? 'M' : 'L'}${x.toFixed(1)},${y.toFixed(1)}`;
      })
      .join(' ');
  });

  function fmtTemp(c: number): string {
    const v = unit === 'F' ? Math.round((c * 9) / 5 + 32) : c;
    return `${v}°`;
  }

  function fmtDayLabel(isoDate: string, idx: number): string {
    if (idx === 0) return 'Today';
    const d = new Date(`${isoDate}T12:00:00`);
    return d.toLocaleDateString('en-US', { weekday: 'short' });
  }

  function cycleClockStyle() {
    const order = ['editorial', 'serif', 'segmented', 'bold'] as const;
    const idx = order.indexOf(cove.settings.clockStyle);
    cove.settings.clockStyle = order[(idx + 1) % order.length];
    cove.saveSettings();
  }

  function handleCityInput(val: string) {
    cityQuery = val;
    if (searchTimer) window.clearTimeout(searchTimer);
    if (val.trim().length < 2) {
      cityOptions = [];
      return;
    }
    searchTimer = window.setTimeout(async () => {
      cityOptions = await cove.searchWeatherCities(val);
    }, 220);
  }

  async function pickCity(opt: GeocodedCityOption) {
    cityQuery = '';
    cityOptions = [];
    await cove.selectGeocodedCity(opt);
  }
</script>

<div class="hero-stage">
  <!-- Monumental Sculptural Clock with Wallpaper-Adaptive Contrast -->
  <div class="hero-clock-block">
    <button
      type="button"
      class="clock-btn"
      class:is-segmented={cove.settings.clockStyle === 'segmented'}
      class:is-serif={cove.settings.clockStyle === 'serif'}
      class:is-bold={cove.settings.clockStyle === 'bold'}
      onclick={cycleClockStyle}
      title="Click to switch Editorial / Architectural Tabular clock style"
    >
      <span class="clock-numerals">
        {clockParts.main}<span class="clock-secs">{clockParts.sec}</span>
      </span>
      {#if clockParts.meridiem}
        <span class="clock-ampm">{clockParts.meridiem}</span>
      {/if}
    </button>
    <p class="hero-date">{dateLine}</p>
  </div>

  <!-- Right-Flanking Floating Weather & Lunar Observatory Card -->
  {#if cove.settings.weather.enabledOptIn}
    <div class="floating-weather-wrap">
      <div class="floating-weather-card">
        <div class="fw-main">
          <button
            type="button"
            class="fw-emblem"
            onclick={() => (cove.weatherPopoverOpen = !cove.weatherPopoverOpen)}
            title="Click to open 12h curve & 5-day Sky Observatory"
          >
            {#if cove.now.getHours() >= 19 || cove.now.getHours() < 6}
              <svg width="30" height="30" viewBox="0 0 36 36" fill="none">
                <path
                  d="M27.5 20.8A10.5 10.5 0 0 1 15.2 8.5a10.5 10.5 0 1 0 12.3 12.3Z"
                  fill="var(--accent)"
                  fill-opacity="0.92"
                />
              </svg>
            {:else}
              <span class="day-icon">
                <Icon name={cond.icon} size={26} />
              </span>
            {/if}
          </button>

          <div class="fw-copy">
            <div class="fw-temp-row">
              {#if cove.weatherCache}
                <button
                  type="button"
                  class="fw-temp"
                  onclick={() => {
                    cove.settings.weather.unit = unit === 'C' ? 'F' : 'C';
                    cove.saveSettings();
                  }}
                  title="Click to toggle °C / °F"
                >
                  {fmtTemp(cove.weatherCache.tempC)}<small>{unit}</small>
                </button>
                <span class="fw-hl">
                  H:{fmtTemp(cove.weatherCache.highC)} L:{fmtTemp(cove.weatherCache.lowC)}
                </span>
              {:else}
                <span class="fw-temp loading">--°<small>{unit}</small></span>
              {/if}
            </div>

            <span class="fw-cond">
              {cond.label}
              {#if cove.weatherCache?.humidity !== undefined}
                · {cove.weatherCache.humidity}%
              {/if}
            </span>

            <button
              type="button"
              class="fw-city"
              onclick={() => (cove.weatherPopoverOpen = !cove.weatherPopoverOpen)}
              title="Open 5-day forecast & change city"
            >
              {cove.settings.weather.city} · {moon.name}
            </button>
          </div>
        </div>
      </div>

      {#if cove.weatherPopoverOpen}
        <div class="sky-popover" role="dialog" tabindex="-1" aria-label="Sky Observatory">
          <div class="pop-head">
            <div class="pop-city-search">
              <Icon name="search" size={13} />
              <input
                type="text"
                value={cityQuery}
                oninput={(e) => handleCityInput((e.currentTarget as HTMLInputElement).value)}
                placeholder={`Search city (${cove.settings.weather.city})…`}
              />
            </div>
            <button
              type="button"
              class="gps-btn"
              onclick={() => cove.useBrowserGeolocation()}
              title="Use exact browser GPS coordinates"
            >
              Locate
            </button>
            <button
              type="button"
              class="pop-close"
              onclick={() => (cove.weatherPopoverOpen = false)}
              aria-label="Close forecast"
            >
              <Icon name="x" size={14} />
            </button>
          </div>

          {#if cityOptions.length > 0}
            <div class="city-dropdown">
              {#each cityOptions as opt}
                <button type="button" class="city-opt" onclick={() => pickCity(opt)}>
                  <span class="opt-name">{opt.name}</span>
                  <span class="opt-sub">
                    {[opt.admin1, opt.country].filter(Boolean).join(', ')}
                  </span>
                </button>
              {/each}
            </div>
          {/if}

          {#if cove.weatherCache}
            {#if sparklinePath}
              <div class="hourly-box">
                <div class="hourly-caption">
                  <span>Next 12 Hours</span>
                  <span>
                    {#if cove.weatherCache.uvIndex !== undefined}
                      UV {cove.weatherCache.uvIndex} ·
                    {/if}
                    Wind {cove.weatherCache.windKmh} km/h
                  </span>
                </div>
                <svg viewBox="0 0 240 42" class="spark-svg">
                  <path d={sparklinePath} fill="none" stroke="var(--accent)" stroke-width="2.2" stroke-linecap="round" />
                </svg>
                <div class="hourly-ticks">
                  {#each (cove.weatherCache.hourly || []).filter((_, i) => i % 3 === 0) as hp}
                    <div class="h-tick">
                      <span>{hp.time}</span>
                      <strong>{fmtTemp(hp.tempC)}</strong>
                    </div>
                  {/each}
                </div>
              </div>
            {/if}

            {#if cove.weatherCache.daily?.length}
              <div class="daily-list">
                {#each cove.weatherCache.daily as day, idx}
                  {@const dc = describeWeatherCode(day.weatherCode)}
                  <div class="day-row">
                    <span class="day-name">{fmtDayLabel(day.date, idx)}</span>
                    <span class="day-ic"><Icon name={dc.icon} size={14} /></span>
                    <span class="day-range">
                      <strong>{fmtTemp(day.highC)}</strong>
                      <small>{fmtTemp(day.lowC)}</small>
                    </span>
                  </div>
                {/each}
              </div>
            {/if}

            <div class="astro-foot">
              {#if cove.weatherCache.sunrise && cove.weatherCache.sunset}
                <span>↑ {cove.weatherCache.sunrise} · ↓ {cove.weatherCache.sunset}</span>
              {/if}
              <span>{moon.name} ({moon.illumination}%)</span>
            </div>
          {:else if cove.weatherError}
            <p class="err-msg">{cove.weatherError}</p>
          {/if}
        </div>
      {/if}
    </div>
  {/if}
</div>

<style>
  .hero-stage {
    position: relative;
    width: 100%;
    max-width: 1320px;
    margin: 68px auto 14px;
    padding: 0 var(--stage-pad-right) 0 var(--stage-pad-left);
    display: flex;
    align-items: center;
    justify-content: center;
    min-height: 112px;
    z-index: 30;
  }

  .hero-clock-block {
    display: flex;
    flex-direction: column;
    align-items: center;
    text-align: center;
    color: var(--hero-ink);
    text-shadow: var(--hero-shadow);
    transition: color var(--dur-atmo) var(--ease-calm);
  }

  .clock-btn {
    display: inline-flex;
    align-items: baseline;
    gap: 8px;
    padding: 0;
    color: inherit;
    text-shadow: inherit;
    transition: transform var(--dur-fast) var(--ease-calm);
  }
  .clock-btn:hover {
    transform: scale(1.012);
  }

  .clock-numerals {
    font-family: var(--font-display);
    font-size: clamp(50px, 7.6vw, 82px);
    font-weight: 760;
    letter-spacing: -0.048em;
    line-height: 0.94;
    font-variant-numeric: tabular-nums lining-nums;
  }

  .clock-btn.is-serif .clock-numerals {
    font-family: var(--font-serif);
    font-weight: 400;
    font-size: clamp(54px, 8vw, 88px);
    letter-spacing: -0.022em;
  }

  .clock-btn.is-bold .clock-numerals {
    font-family: var(--font-display);
    font-weight: 800;
    font-size: clamp(48px, 7.4vw, 80px);
    letter-spacing: -0.05em;
  }

  .clock-btn.is-segmented .clock-numerals {
    font-family: var(--font-mono);
    font-weight: 600;
    font-size: clamp(40px, 6.2vw, 64px);
    letter-spacing: 0.025em;
  }

  .clock-secs {
    font-size: 0.48em;
    opacity: 0.72;
  }

  .clock-ampm {
    font-family: var(--font-editorial, 'Instrument Serif', Georgia, serif);
    font-style: italic;
    font-size: 22px;
    font-weight: 400;
    letter-spacing: 0.01em;
    color: var(--accent-text);
  }

  .hero-date {
    margin: 8px 0 0;
    font-family: var(--font-display);
    font-size: 13.5px;
    font-weight: 560;
    color: var(--hero-sub);
    letter-spacing: -0.008em;
  }

  .floating-weather-wrap {
    position: absolute;
    right: 28px;
    top: 50%;
    transform: translateY(-50%);
  }

  .floating-weather-card {
    min-width: 226px;
    padding: 13px 16px;
    border-radius: 22px;
    background: var(--surface-card);
    backdrop-filter: var(--glass-blur);
    border: 1px solid var(--border-subtle);
    box-shadow: var(--shadow-card);
    transition: border-color var(--dur-fast) var(--ease-calm);
  }
  .floating-weather-card:hover {
    border-color: var(--border-strong);
  }

  .fw-main {
    display: flex;
    align-items: center;
    gap: 13px;
  }

  .fw-emblem {
    width: 44px;
    height: 44px;
    border-radius: 14px;
    background: var(--surface-row);
    border: 1px solid var(--border-subtle);
    display: grid;
    place-items: center;
    flex-shrink: 0;
    color: var(--accent-text);
  }
  .fw-emblem:hover {
    border-color: var(--accent);
  }

  .day-icon {
    display: grid;
    place-items: center;
  }

  .fw-copy {
    display: flex;
    flex-direction: column;
    align-items: flex-start;
    min-width: 0;
  }

  .fw-temp-row {
    display: flex;
    align-items: baseline;
    gap: 8px;
  }

  .fw-temp {
    padding: 0;
    font-size: 23px;
    font-weight: 650;
    letter-spacing: -0.03em;
    line-height: 1.08;
    color: var(--text-primary);
  }
  .fw-temp.loading {
    opacity: 0.55;
  }
  .fw-temp small {
    font-size: 13px;
    font-weight: 500;
    color: var(--text-muted);
    margin-left: 1px;
  }

  .fw-hl {
    font-family: var(--font-mono);
    font-size: 10.5px;
    color: var(--text-muted);
  }

  .fw-cond {
    font-size: 12px;
    color: var(--text-secondary);
    margin-top: 2px;
  }

  .fw-city {
    padding: 0;
    margin-top: 1px;
    font-size: 11px;
    color: var(--text-muted);
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
    max-width: 170px;
  }
  .fw-city:hover {
    color: var(--accent-text);
  }

  .sky-popover {
    position: absolute;
    top: calc(100% + 10px);
    right: 0;
    width: min(318px, calc(100vw - 28px));
    padding: 14px;
    border-radius: 22px;
    background: var(--surface-overlay);
    backdrop-filter: var(--glass-blur-heavy);
    -webkit-backdrop-filter: var(--glass-blur-heavy);
    border: 1px solid var(--border-strong);
    box-shadow: var(--shadow-elevated);
    display: flex;
    flex-direction: column;
    gap: 12px;
    z-index: 60;
  }

  .pop-head {
    display: flex;
    align-items: center;
    gap: 6px;
  }

  .pop-city-search {
    flex: 1;
    display: flex;
    align-items: center;
    gap: 6px;
    padding: 5px 9px;
    border-radius: 10px;
    background: var(--surface-input);
    border: 1px solid var(--border-subtle);
    color: var(--text-muted);
  }
  .pop-city-search input {
    width: 100%;
    font-size: 12px;
    background: transparent;
    border: none;
    outline: none;
    color: var(--text-primary);
  }

  .gps-btn {
    padding: 5px 9px;
    border-radius: 10px;
    font-size: 11px;
    font-weight: 600;
    background: var(--accent-soft);
    color: var(--accent-text);
  }

  .pop-close {
    width: 26px;
    height: 26px;
    border-radius: 8px;
    display: grid;
    place-items: center;
    color: var(--text-muted);
  }

  .city-dropdown {
    display: flex;
    flex-direction: column;
    gap: 3px;
    padding: 5px;
    border-radius: 12px;
    background: var(--surface-row);
    border: 1px solid var(--border-subtle);
  }

  .city-opt {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: 6px 8px;
    border-radius: 8px;
    font-size: 12px;
    text-align: left;
  }
  .city-opt:hover {
    background: var(--surface-hover);
  }
  .opt-name {
    font-weight: 600;
    color: var(--text-primary);
  }
  .opt-sub {
    font-size: 11px;
    color: var(--text-muted);
  }

  .hourly-box {
    padding: 9px 10px;
    border-radius: 14px;
    background: var(--surface-row);
    display: flex;
    flex-direction: column;
    gap: 4px;
  }
  .hourly-caption {
    display: flex;
    justify-content: space-between;
    font-size: 10.5px;
    color: var(--text-muted);
    font-family: var(--font-mono);
  }
  .spark-svg {
    width: 100%;
    height: 40px;
  }
  .hourly-ticks {
    display: flex;
    justify-content: space-between;
    font-size: 10.5px;
    color: var(--text-secondary);
  }
  .h-tick {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 1px;
  }
  .h-tick span {
    font-size: 9.5px;
    color: var(--text-muted);
  }

  .daily-list {
    display: flex;
    flex-direction: column;
    gap: 4px;
  }
  .day-row {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 5px 8px;
    border-radius: 9px;
    font-size: 12px;
    background: rgba(128, 138, 160, 0.06);
  }
  .day-name {
    width: 56px;
    color: var(--text-secondary);
    font-weight: 500;
  }
  .day-ic {
    color: var(--accent-text);
  }
  .day-range {
    display: flex;
    gap: 7px;
    font-family: var(--font-mono);
    font-size: 11.5px;
  }
  .day-range small {
    color: var(--text-muted);
  }

  .astro-foot {
    display: flex;
    justify-content: space-between;
    font-size: 10.5px;
    color: var(--text-muted);
    font-family: var(--font-mono);
    padding-top: 4px;
    border-top: 1px solid var(--border-subtle);
  }

  .err-msg {
    font-size: 12px;
    color: var(--text-muted);
    margin: 0;
  }

  @media (max-width: 1180px) {
    .hero-stage {
      flex-direction: column;
      gap: 12px;
      margin-top: 64px;
    }
    .floating-weather-wrap {
      position: relative;
      right: auto;
      top: auto;
      transform: none;
    }
    .sky-popover {
      left: 50%;
      right: auto;
      transform: translateX(-50%);
    }
  }
</style>
