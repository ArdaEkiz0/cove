<script lang="ts">
  import { describeWeatherCode, getMoonPhase } from '../../lib/moon';
  import { cove, type GeocodedCityOption } from '../../lib/state.svelte';
  import Icon from './Icon.svelte';

  let editingCity = $state(false);
  let cityQuery = $state('');
  let cityOptions = $state<GeocodedCityOption[]>([]);
  let searchTimer: number | null = null;

  const unit = $derived(cove.settings.weather.unit);
  const moon = $derived(getMoonPhase(cove.now));
  const cond = $derived(
    cove.weatherCache
      ? describeWeatherCode(cove.weatherCache.weatherCode)
      : { label: cove.weatherLoading ? 'Loading sky…' : 'Open-Meteo Live', icon: 'cloud-sun' as const }
  );

  function fmtTemp(c: number): string {
    const val = unit === 'F' ? Math.round((c * 9) / 5 + 32) : c;
    return `${val}°`;
  }

  function toggleUnit() {
    cove.settings.weather.unit = cove.settings.weather.unit === 'C' ? 'F' : 'C';
    cove.saveSettings();
  }

  function onCityInput(val: string) {
    cityQuery = val;
    if (searchTimer) window.clearTimeout(searchTimer);
    if (val.trim().length < 2) {
      cityOptions = [];
      return;
    }
    searchTimer = window.setTimeout(async () => {
      cityOptions = await cove.searchWeatherCities(val);
    }, 200);
  }

  async function selectOpt(opt: GeocodedCityOption) {
    cityQuery = '';
    cityOptions = [];
    editingCity = false;
    await cove.selectGeocodedCity(opt);
  }
</script>

<div class="weather-widget">
  {#if !cove.settings.weather.enabledOptIn}
    <div class="optin-card">
      <p>Weather uses one labeled call to Open-Meteo (free, no API key, no tracking).</p>
      <button
        type="button"
        class="btn-primary"
        onclick={() => {
          cove.settings.weather.enabledOptIn = true;
          cove.saveSettings();
          cove.refreshWeather(true);
        }}
      >
        Enable Live Weather
      </button>
    </div>
  {:else}
    <div class="w-top">
      <div>
        <div class="city-row">
          <button
            type="button"
            class="city-btn"
            onclick={() => {
              cityQuery = '';
              cityOptions = [];
              editingCity = !editingCity;
            }}
            title="Click to search any city"
          >
            <span>{cove.settings.weather.city}</span>
            <span class="edit-hint">change</span>
          </button>
          <button
            type="button"
            class="gps-pill"
            onclick={() => cove.useBrowserGeolocation()}
            title="Detect exact GPS location"
          >
            GPS
          </button>
        </div>

        {#if cove.weatherLoading && !cove.weatherCache}
          <div class="skeleton-temp"></div>
        {:else if cove.weatherCache}
          <div class="temp-row">
            <span class="big-temp">{fmtTemp(cove.weatherCache.tempC)}{unit}</span>
            <button type="button" class="unit-btn" onclick={toggleUnit}>
              °{unit === 'C' ? 'F' : 'C'}
            </button>
          </div>
          <div class="cond-line">
            <span>{cond.label}</span>
            <span>·</span>
            <span>H {fmtTemp(cove.weatherCache.highC)} / L {fmtTemp(cove.weatherCache.lowC)}</span>
          </div>
          <div class="micro-telemetry">
            {#if cove.weatherCache.feelsLikeC !== undefined}
              <span>Feels {fmtTemp(cove.weatherCache.feelsLikeC)}</span>
            {/if}
            {#if cove.weatherCache.humidity !== undefined}
              <span>· {cove.weatherCache.humidity}%</span>
            {/if}
            {#if cove.weatherCache.uvIndex !== undefined}
              <span>· UV {cove.weatherCache.uvIndex}</span>
            {/if}
          </div>
        {:else}
          <div class="cond-line">
            <span>{cove.weatherError || 'Tap refresh to fetch live sky.'}</span>
          </div>
        {/if}
      </div>

      <div class="w-icon-box">
        <Icon name={cond.icon} size={28} />
        <button
          type="button"
          class="refresh-mini"
          onclick={() => cove.refreshWeather(true)}
          title="Refresh live weather"
        >
          <Icon name="refresh" size={12} />
        </button>
      </div>
    </div>

    {#if editingCity}
      <div class="city-search-wrap">
        <input
          type="text"
          value={cityQuery}
          oninput={(e) => onCityInput((e.currentTarget as HTMLInputElement).value)}
          placeholder="Search city (Tokyo, London, Indore)…"
        />
        {#if cityOptions.length > 0}
          <div class="opt-list">
            {#each cityOptions as opt}
              <button type="button" class="opt-btn" onclick={() => selectOpt(opt)}>
                <span>{opt.name}</span>
                <small>{[opt.admin1, opt.country].filter(Boolean).join(', ')}</small>
              </button>
            {/each}
          </div>
        {/if}
      </div>
    {/if}

    {#if cove.weatherCache?.daily?.length}
      <div class="five-day-strip">
        {#each cove.weatherCache.daily as d, idx}
          {@const dc = describeWeatherCode(d.weatherCode)}
          <div class="d-cell">
            <span class="d-lbl">
              {idx === 0
                ? 'Now'
                : new Date(`${d.date}T12:00:00`).toLocaleDateString('en-US', { weekday: 'short' })}
            </span>
            <Icon name={dc.icon} size={13} />
            <span class="d-hi">{fmtTemp(d.highC)}</span>
          </div>
        {/each}
      </div>
    {/if}

    <div class="moon-strip">
      <div class="moon-disc" title={`${moon.name} (${moon.illumination}% illuminated)`}>
        <svg width="18" height="18" viewBox="0 0 24 24">
          <circle
            cx="12"
            cy="12"
            r="9"
            fill="rgba(255,255,255,0.10)"
            stroke="var(--accent-text)"
            stroke-width="1.2"
          />
          {#if moon.illumination > 8}
            <circle
              cx={12 + (moon.phase < 0.5 ? 1 : -1) * (1 - moon.illumination / 100) * 6}
              cy="12"
              r="7.5"
              fill="var(--accent-text)"
              fill-opacity="0.78"
            />
          {/if}
        </svg>
      </div>
      <div class="moon-meta">
        <span class="moon-name">{moon.name} · {moon.illumination}%</span>
      </div>
      {#if cove.weatherCache?.sunset}
        <span class="net-tag">↓ {cove.weatherCache.sunset}</span>
      {:else}
        <span class="net-tag">Open-Meteo</span>
      {/if}
    </div>
  {/if}
</div>

<style>
  .weather-widget {
    display: flex;
    flex-direction: column;
    justify-content: space-between;
    gap: 10px;
    height: 100%;
  }

  .optin-card {
    display: flex;
    flex-direction: column;
    gap: 8px;
    font-size: 12px;
    color: var(--text-secondary);
  }
  .optin-card p {
    margin: 0;
  }

  .w-top {
    display: flex;
    justify-content: space-between;
    align-items: flex-start;
    gap: 8px;
  }

  .city-row {
    display: flex;
    align-items: center;
    gap: 6px;
  }

  .city-btn {
    display: inline-flex;
    align-items: baseline;
    gap: 6px;
    padding: 0;
    font-size: 13px;
    font-weight: 600;
    color: var(--text-primary);
  }
  .edit-hint {
    font-size: 10.5px;
    font-weight: 400;
    color: var(--text-muted);
    opacity: 0;
    transition: opacity var(--dur-fast) var(--ease-calm);
  }
  .city-btn:hover .edit-hint {
    opacity: 1;
  }

  .gps-pill {
    font-size: 9.5px;
    font-weight: 650;
    padding: 2px 6px;
    border-radius: 999px;
    background: var(--accent-soft);
    color: var(--accent-text);
  }

  .skeleton-temp {
    width: 78px;
    height: 30px;
    margin: 6px 0;
    border-radius: 6px;
    background: var(--surface-hover);
  }

  .temp-row {
    display: flex;
    align-items: baseline;
    gap: 6px;
    margin-top: 2px;
  }
  .big-temp {
    font-size: 27px;
    font-weight: 650;
    letter-spacing: -0.03em;
    line-height: 1.1;
  }
  .unit-btn {
    font-size: 11px;
    color: var(--text-muted);
    padding: 2px 6px;
    border-radius: var(--r-pill);
    background: var(--surface-row);
  }
  .unit-btn:hover {
    color: var(--text-primary);
  }

  .cond-line {
    display: flex;
    gap: 5px;
    font-size: 12px;
    color: var(--text-secondary);
    margin-top: 3px;
  }

  .micro-telemetry {
    display: flex;
    gap: 5px;
    font-size: 11px;
    font-family: var(--font-mono);
    color: var(--text-muted);
    margin-top: 2px;
  }

  .w-icon-box {
    display: flex;
    flex-direction: column;
    align-items: flex-end;
    gap: 6px;
    color: var(--accent-text);
  }
  .refresh-mini {
    width: 24px;
    height: 24px;
    border-radius: 50%;
    display: grid;
    place-items: center;
    color: var(--text-muted);
    background: var(--surface-row);
  }
  .refresh-mini:hover {
    background: var(--surface-hover);
    color: var(--text-primary);
  }

  .city-search-wrap {
    display: flex;
    flex-direction: column;
    gap: 4px;
  }
  .city-search-wrap input {
    width: 100%;
    padding: 6px 9px;
    border-radius: 9px;
    border: 1px solid var(--border-subtle);
    background: var(--surface-input);
    font-size: 12px;
  }
  .opt-list {
    display: flex;
    flex-direction: column;
    gap: 2px;
    padding: 4px;
    border-radius: 10px;
    background: var(--surface-row);
  }
  .opt-btn {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: 5px 7px;
    border-radius: 7px;
    font-size: 11.5px;
  }
  .opt-btn:hover {
    background: var(--surface-hover);
  }
  .opt-btn small {
    color: var(--text-muted);
    font-size: 10.5px;
  }

  .five-day-strip {
    display: grid;
    grid-template-columns: repeat(5, 1fr);
    gap: 4px;
    padding: 7px 6px;
    border-radius: var(--r-row);
    background: var(--surface-row);
  }
  .d-cell {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 3px;
    font-size: 10.5px;
    color: var(--accent-text);
  }
  .d-lbl {
    font-size: 10px;
    color: var(--text-muted);
  }
  .d-hi {
    font-family: var(--font-mono);
    color: var(--text-primary);
    font-weight: 600;
  }

  .moon-strip {
    display: flex;
    align-items: center;
    gap: 8px;
    padding: 6px 9px;
    border-radius: var(--r-row);
    background: var(--surface-row);
  }
  .moon-disc {
    display: grid;
    place-items: center;
  }
  .moon-meta {
    flex: 1;
    min-width: 0;
  }
  .moon-name {
    font-size: 11px;
    font-weight: 500;
    color: var(--text-secondary);
  }
  .net-tag {
    font-size: 10px;
    font-family: var(--font-mono);
    color: var(--text-muted);
    padding: 2px 6px;
    border-radius: var(--r-pill);
    background: var(--surface-subtle);
  }
</style>
