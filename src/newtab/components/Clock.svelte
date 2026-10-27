<script lang="ts">
  import { cove } from '../../lib/state.svelte';
  import Icon from './Icon.svelte';

  const localTime = $derived(
    cove.now.toLocaleTimeString([], {
      hour: '2-digit',
      minute: '2-digit',
      second: cove.settings.clockShowSeconds ? '2-digit' : undefined,
      hour12: !cove.settings.clock24h
    })
  );

  function zoneInfo(tz: string) {
    try {
      const time = cove.now.toLocaleTimeString([], {
        timeZone: tz,
        hour: '2-digit',
        minute: '2-digit',
        hour12: !cove.settings.clock24h
      });
      const hr = Number(
        cove.now.toLocaleTimeString('en-GB', {
          timeZone: tz,
          hour: '2-digit',
          hour12: false
        })
      );
      const isDay = hr >= 7 && hr < 19;
      return { time, isDay };
    } catch {
      return { time: '--:--', isDay: true };
    }
  }
</script>

<div class="world-clock-bento">
  <button
    type="button"
    class="wc-local"
    onclick={() => {
      cove.settings.clock24h = !cove.settings.clock24h;
      cove.saveSettings();
    }}
    title="Click to toggle 12h / 24h format"
  >
    <span class="wc-digits">{localTime}</span>
    <span class="wc-tag">{cove.settings.clock24h ? '24H' : '12H'}</span>
  </button>

  <div class="wc-zones">
    {#each cove.settings.worldClocks as z (z.city)}
      {@const info = zoneInfo(z.timeZone)}
      <div class="wc-row">
        <span class="wc-city">
          <Icon name={info.isDay ? 'sun' : 'moon'} size={12} />
          <span>{z.city}</span>
        </span>
        <span class="wc-time">{info.time}</span>
      </div>
    {/each}
  </div>
</div>

<style>
  .world-clock-bento {
    display: flex;
    flex-direction: column;
    justify-content: space-between;
    gap: 10px;
    height: 100%;
  }

  .wc-local {
    display: flex;
    align-items: baseline;
    justify-content: space-between;
    padding: 0;
    text-align: left;
  }

  .wc-digits {
    font-size: 28px;
    font-weight: 650;
    letter-spacing: -0.035em;
    font-variant-numeric: tabular-nums;
    color: var(--text-primary);
  }

  .wc-tag {
    font-family: var(--font-mono);
    font-size: 10px;
    padding: 2px 6px;
    border-radius: var(--r-pill);
    background: var(--surface-row);
    color: var(--text-muted);
  }

  .wc-zones {
    display: flex;
    flex-direction: column;
    gap: 5px;
  }

  .wc-row {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 6px 10px;
    border-radius: var(--r-row);
    background: var(--surface-row);
    font-size: 12px;
  }

  .wc-city {
    display: inline-flex;
    align-items: center;
    gap: 6px;
    color: var(--text-secondary);
  }

  .wc-time {
    font-family: var(--font-mono);
    font-size: 12px;
    font-weight: 500;
    color: var(--text-primary);
  }
</style>
