<script lang="ts">
  import { getBlendedSlotScores, getCircadianSlot } from '../../lib/smart-engine';
  import { cove } from '../../lib/state.svelte';
  import type { CircadianSlot } from '../../lib/types';
  import BrandIcon from './BrandIcon.svelte';
  import Icon from './Icon.svelte';

  let activeTab = $state<'overview' | 'chains' | 'signals'>('overview');

  const SLOTS: { id: CircadianSlot; label: string }[] = [
    { id: 'dawn', label: 'Dawn' },
    { id: 'deep_morning', label: 'Morning' },
    { id: 'afternoon', label: 'Afternoon' },
    { id: 'evening', label: 'Evening' },
    { id: 'late_night', label: 'Night' }
  ];

  const STAGES = [
    { lvl: 1, name: 'Seed', min: 0 },
    { lvl: 2, name: 'Sprout', min: 8 },
    { lvl: 3, name: 'Calibrated', min: 22 },
    { lvl: 4, name: 'Attuned', min: 50 },
    { lvl: 5, name: 'Symbiotic', min: 100 }
  ];
  const DAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
  const HOURS = Array.from({ length: 24 }, (_, i) => i);

  function close() {
    cove.smartModalOpen = false;
  }

  const currentSlotInfo = $derived(getCircadianSlot(cove.now));

  const slotTotals = $derived.by(() => {
    const out: Record<CircadianSlot, number> = {
      dawn: 0,
      deep_morning: 0,
      afternoon: 0,
      evening: 0,
      late_night: 0
    };
    const sumMap = (m?: Record<string, number>) =>
      m ? Object.values(m).reduce((a, b) => a + b, 0) : 0;

    for (const s of SLOTS) {
      let total = 0;
      for (const dk of ['weekday', 'weekend']) {
        const key = `${dk}:${s.id}`;
        total +=
          sumMap(cove.smartMemory.slotLinkScores?.[key]) +
          sumMap(cove.smartMemory.slotEngineScores?.[key]) +
          sumMap(cove.smartMemory.slotWidgetScores?.[key]);
      }
      out[s.id] = Math.round(total * 10) / 10;
    }
    return out;
  });

  const maxSlotTotal = $derived(Math.max(1, ...Object.values(slotTotals)));

  const maxHeatCell = $derived.by(() => {
    let max = 1;
    for (const row of cove.smartMemory.weeklyHeatmap || []) {
      for (const val of row || []) {
        if (val > max) max = val;
      }
    }
    return max;
  });

  const topLearnedApps = $derived.by(() => {
    const blended = getBlendedSlotScores(cove.smartMemory.slotLinkScores || {}, cove.now);
    return cove.quickLinks
      .map((l) => ({
        link: l,
        slotWeight: Math.round((blended[l.id] || 0) * 10) / 10,
        clicks: cove.smartMemory.linkClicks?.[l.id] || 0
      }))
      .filter((x) => x.clicks > 0 || x.slotWeight > 0)
      .sort((a, b) => b.slotWeight * 2 + b.clicks - (a.slotWeight * 2 + a.clicks))
      .slice(0, 5);
  });

  function formatRelTime(ts: number): string {
    const sec = Math.max(1, Math.floor((Date.now() - ts) / 1000));
    if (sec < 60) return `${sec}s ago`;
    if (sec < 3600) return `${Math.floor(sec / 60)}m ago`;
    if (sec < 86400) return `${Math.floor(sec / 3600)}h ago`;
    return `${Math.floor(sec / 86400)}d ago`;
  }
</script>

{#if cove.smartModalOpen}
  <!-- svelte-ignore a11y_click_events_have_key_events -->
  <!-- svelte-ignore a11y_no_static_element_interactions -->
  <div class="smart-backdrop" onclick={close}>
    <div
      class="smart-dialog"
      role="dialog"
      aria-modal="true"
      tabindex="-1"
      aria-label="Cove Self-Learning Neural Inspector"
      onclick={(e) => e.stopPropagation()}
    >
      <header class="sm-header">
        <div class="sm-brand">
          <div class="sm-badge-icon">
            <Icon name="sparkle" size={18} />
          </div>
          <div>
            <div class="sm-title-row">
              <h2>Autonomous CSE v4 Inspector</h2>
              <span class="stage-pill">
                {cove.settings.smartEngine.autonomyMode === 'autonomous'
                  ? 'Full Autonomous'
                  : cove.settings.smartEngine.autonomyMode === 'assisted'
                    ? 'Assisted'
                    : 'Manual'} · Stage {cove.smartStatus.level}/5
              </span>
            </div>
            <p class="sm-sub">
              2nd-Order Markov Chains + 14d Recency Decay · {cove.smartMemory.totalSignals} local signals · 0 cloud calls
            </p>
          </div>
        </div>

        <div class="sm-head-actions">
          <button
            type="button"
            class="btn-ghost"
            onclick={() => {
              close();
              cove.openSettings('smart');
            }}
          >
            <Icon name="sliders" size={13} />
            <span>Autopilot Settings</span>
          </button>
          <button type="button" class="close-btn" onclick={close} aria-label="Close">
            <Icon name="x" size={16} />
          </button>
        </div>
      </header>

      <!-- 5-Stage Evolution Stepper -->
      <div class="stage-stepper">
        {#each STAGES as st (st.lvl)}
          <div
            class="stage-node"
            class:unlocked={cove.smartStatus.level >= st.lvl}
            class:current={cove.smartStatus.level === st.lvl}
          >
            <span class="st-dot">{st.lvl}</span>
            <span class="st-name">{st.name}</span>
          </div>
        {/each}
      </div>

      <nav class="sm-tabs">
        <button type="button" class:active={activeTab === 'overview'} onclick={() => (activeTab = 'overview')}>
          Rhythm &amp; Insights
        </button>
        <button type="button" class:active={activeTab === 'chains'} onclick={() => (activeTab = 'chains')}>
          Workflow Chains ({cove.learnedChains.length})
        </button>
        <button type="button" class:active={activeTab === 'signals'} onclick={() => (activeTab = 'signals')}>
          Audit Log ({cove.smartMemory.recentSignals.length})
        </button>
      </nav>

      <div class="sm-body">
        {#if activeTab === 'overview'}
          <div class="insights-row">
            {#each cove.learnedInsights as ins (ins.id)}
              <div class="ins-card">
                <span class="ins-k">{ins.label}</span>
                <strong class="ins-v">{ins.value}</strong>
                <span class="ins-d">{ins.detail}</span>
              </div>
            {/each}
          </div>

          <section class="panel-box">
            <div class="panel-head">
              <h3>Circadian Affinity Windows</h3>
              <span class="mono-note">Active: {cove.smartStatus.slotLabel}</span>
            </div>
            <div class="slot-grid">
              {#each SLOTS as s (s.id)}
                {@const pct =
                  cove.smartMemory.totalSignals === 0
                    ? 4
                    : Math.max(6, Math.round((slotTotals[s.id] / maxSlotTotal) * 100))}
                <div class="slot-col" class:current={currentSlotInfo.slot === s.id}>
                  <div class="bar-well">
                    <div class="bar-fill" style="height: {pct}%"></div>
                  </div>
                  <span class="slot-name">{s.label}</span>
                  <span class="slot-val">{slotTotals[s.id]} wt</span>
                </div>
              {/each}
            </div>
          </section>

          <section class="panel-box">
            <div class="panel-head">
              <h3>7×24 Weekly Habit Matrix</h3>
              <span class="mono-note">Local browser timezone</span>
            </div>
            <div class="heatmap-wrap">
              {#each DAYS as dayLabel, dIdx}
                <div class="hm-row">
                  <span class="hm-day">{dayLabel}</span>
                  <div class="hm-cells">
                    {#each HOURS as h}
                      {@const val = cove.smartMemory.weeklyHeatmap?.[dIdx]?.[h] || 0}
                      {@const intensity = val === 0 ? 0 : Math.max(0.22, Math.min(1, val / maxHeatCell))}
                      <span
                        class="hm-cell"
                        style="background: {val === 0
                          ? 'var(--surface-row)'
                          : `color-mix(in oklch, var(--accent) ${Math.round(intensity * 92)}%, transparent)`}"
                        title={`${dayLabel} ${String(h).padStart(2, '0')}:00 — ${val} signal(s)`}
                      ></span>
                    {/each}
                  </div>
                </div>
              {/each}
            </div>
          </section>

          <section class="panel-box">
            <div class="panel-head">
              <h3>Learned Shortcuts for {cove.smartStatus.slotLabel}</h3>
              <span class="mono-note">Neighbor-smoothed kernel</span>
            </div>
            {#if topLearnedApps.length === 0}
              <p class="empty-copy">
                Zero pre-seeded shortcuts. Click any Quick Access tile as you browse — Cove learns your personal morning, daytime, and evening favorites automatically.
              </p>
            {:else}
              <div class="learned-list">
                {#each topLearnedApps as item (item.link.id)}
                  <div class="learned-row">
                    <BrandIcon url={item.link.url} title={item.link.title} size={20} radius={5} />
                    <span class="l-title">{item.link.title}</span>
                    <span class="l-stat">{item.slotWeight} slot wt · {item.clicks} clicks</span>
                  </div>
                {/each}
              </div>
            {/if}
          </section>
        {:else if activeTab === 'chains'}
          <section class="panel-box">
            <div class="panel-head">
              <h3>Learned Markov Workflow Chains (A → B)</h3>
              <span class="mono-note">15-minute session window</span>
            </div>

            {#if cove.learnedChains.length === 0}
              <div class="empty-chain-state">
                <Icon name="sparkle" size={22} />
                <strong>No sequential chains recorded yet</strong>
                <p>
                  Whenever you open two shortcuts or start Focus within 15 minutes (for example, opening
                  <em>GitHub</em> and then <em>Linear</em>), Cove learns that transition locally and surfaces the next step in Smart Pulse &amp; Quick Access.
                </p>
              </div>
            {:else}
              <div class="chain-list">
                {#each cove.learnedChains as ch (`${ch.fromKey}->${ch.toKey}`)}
                  <div class="chain-row">
                    <div class="chain-nodes">
                      <span class="node-pill">{ch.fromLabel}</span>
                      <span class="chain-arrow">→</span>
                      <span class="node-pill dest">{ch.toLabel}</span>
                    </div>
                    <div class="chain-metrics">
                      <div class="conf-track">
                        <div style="width: {ch.probabilityPct}%"></div>
                      </div>
                      <span class="l-stat">{ch.probabilityPct}% ({ch.weight.toFixed(1)} wt)</span>
                    </div>
                  </div>
                {/each}
              </div>
            {/if}
          </section>

          <section class="panel-box">
            <div class="panel-head">
              <h3>Unlocked Capabilities</h3>
              <span class="mono-note">{cove.smartStatus.nextCapability}</span>
            </div>
            <div class="cap-chips">
              {#each cove.smartStatus.unlockedCapabilities as cap}
                <span class="cap-chip">✓ {cap}</span>
              {/each}
            </div>
          </section>
        {:else}
          <section class="panel-box">
            <div class="panel-head">
              <h3>Transparent On-Device Signal Log</h3>
              <button type="button" class="btn-ghost danger-txt" onclick={() => cove.resetSmartMemory()}>
                Wipe Memory
              </button>
            </div>
            {#if cove.smartMemory.recentSignals.length === 0}
              <p class="empty-copy">
                0 signals recorded yet. Every shortcut click, `!bang` search, command execution, and focus sprint appears here transparently.
              </p>
            {:else}
              <div class="sig-list">
                {#each cove.smartMemory.recentSignals.slice(0, 32) as sig (sig.id)}
                  <div class="sig-row">
                    <span class="sig-type">{sig.kind}</span>
                    <span class="sig-detail">{sig.label}</span>
                    <span class="sig-slot">{sig.slotLabel}</span>
                    <span class="sig-time">{formatRelTime(sig.at)}</span>
                  </div>
                {/each}
              </div>
            {/if}
          </section>
        {/if}
      </div>
    </div>
  </div>
{/if}

<style>
  .smart-backdrop {
    position: fixed;
    inset: 0;
    z-index: 150;
    background: var(--backdrop-scrim);
    backdrop-filter: blur(12px);
    -webkit-backdrop-filter: blur(12px);
    display: grid;
    place-items: center;
    padding: 20px;
  }

  .smart-dialog {
    width: min(740px, 100%);
    max-height: 86vh;
    display: flex;
    flex-direction: column;
    border-radius: var(--r-xl);
    background: var(--surface-overlay);
    backdrop-filter: var(--glass-blur-heavy);
    border: 1px solid var(--border-strong);
    box-shadow: var(--shadow-elevated);
    overflow: hidden;
  }

  .sm-header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 12px;
    padding: 18px 22px 14px;
    border-bottom: 1px solid var(--border-subtle);
  }
  .sm-brand {
    display: flex;
    align-items: center;
    gap: 12px;
  }
  .sm-badge-icon {
    width: 38px;
    height: 38px;
    border-radius: 12px;
    background: var(--accent-soft);
    color: var(--accent-text);
    display: grid;
    place-items: center;
  }
  .sm-title-row {
    display: flex;
    align-items: center;
    gap: 8px;
    flex-wrap: wrap;
  }
  .sm-title-row h2 {
    margin: 0;
    font-size: 16.5px;
    font-weight: 650;
  }
  .stage-pill {
    padding: 2px 9px;
    border-radius: var(--r-pill);
    background: var(--accent-soft);
    color: var(--accent-text);
    font-family: var(--font-mono);
    font-size: 10.5px;
    font-weight: 600;
  }
  .sm-sub {
    margin: 2px 0 0;
    font-size: 11.5px;
    color: var(--text-muted);
  }
  .sm-head-actions {
    display: flex;
    align-items: center;
    gap: 8px;
  }
  .close-btn {
    width: 32px;
    height: 32px;
    border-radius: 50%;
    display: grid;
    place-items: center;
    color: var(--text-secondary);
  }
  .close-btn:hover {
    background: var(--surface-hover);
  }

  .stage-stepper {
    display: grid;
    grid-template-columns: repeat(5, 1fr);
    gap: 6px;
    padding: 10px 22px;
    background: var(--surface-subtle);
    border-bottom: 1px solid var(--border-subtle);
  }
  .stage-node {
    display: flex;
    align-items: center;
    gap: 6px;
    opacity: 0.42;
    font-size: 11.5px;
  }
  .stage-node.unlocked {
    opacity: 0.85;
  }
  .stage-node.current {
    opacity: 1;
    font-weight: 650;
    color: var(--accent-text);
  }
  .st-dot {
    width: 20px;
    height: 20px;
    border-radius: 50%;
    background: var(--surface-row);
    border: 1px solid var(--border-subtle);
    display: grid;
    place-items: center;
    font-family: var(--font-mono);
    font-size: 10px;
  }
  .stage-node.current .st-dot {
    background: var(--accent);
    color: #fff;
    border-color: var(--accent);
  }

  .sm-tabs {
    display: flex;
    gap: 6px;
    padding: 10px 22px;
    border-bottom: 1px solid var(--border-subtle);
  }
  .sm-tabs button {
    padding: 6px 13px;
    border-radius: var(--r-pill);
    font-size: 12px;
    font-weight: 560;
    color: var(--text-secondary);
  }
  .sm-tabs button.active {
    background: var(--accent-soft);
    color: var(--accent-text);
  }

  .sm-body {
    padding: 18px 22px 24px;
    overflow-y: auto;
    display: flex;
    flex-direction: column;
    gap: 14px;
  }

  .insights-row {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(150px, 1fr));
    gap: 8px;
  }
  .ins-card {
    padding: 10px 12px;
    border-radius: 13px;
    background: var(--surface-subtle);
    border: 1px solid var(--border-subtle);
    display: flex;
    flex-direction: column;
    gap: 2px;
  }
  .ins-k {
    font-size: 10px;
    text-transform: uppercase;
    letter-spacing: 0.05em;
    color: var(--text-muted);
  }
  .ins-v {
    font-size: 13px;
    font-weight: 650;
  }
  .ins-d {
    font-size: 10.5px;
    color: var(--text-secondary);
  }

  .panel-box {
    padding: 14px 16px;
    border-radius: 16px;
    background: var(--surface-subtle);
    border: 1px solid var(--border-subtle);
    display: flex;
    flex-direction: column;
    gap: 10px;
  }
  .panel-head {
    display: flex;
    align-items: center;
    justify-content: space-between;
  }
  .panel-head h3 {
    margin: 0;
    font-size: 13px;
    font-weight: 600;
  }
  .mono-note {
    font-family: var(--font-mono);
    font-size: 10.5px;
    color: var(--accent-text);
  }

  .slot-grid {
    display: grid;
    grid-template-columns: repeat(5, 1fr);
    gap: 8px;
  }
  .slot-col {
    padding: 10px 6px;
    border-radius: 12px;
    background: var(--surface-row);
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 5px;
    border: 1px solid transparent;
  }
  .slot-col.current {
    border-color: var(--accent);
  }
  .bar-well {
    width: 100%;
    height: 46px;
    border-radius: 7px;
    background: rgba(128, 128, 128, 0.12);
    display: flex;
    align-items: flex-end;
    overflow: hidden;
  }
  .bar-fill {
    width: 100%;
    background: var(--accent);
    border-radius: 5px;
  }
  .slot-name {
    font-family: var(--font-mono);
    font-size: 10px;
    font-weight: 600;
  }
  .slot-val {
    font-size: 10px;
    color: var(--text-muted);
  }

  .heatmap-wrap {
    display: flex;
    flex-direction: column;
    gap: 4px;
  }
  .hm-row {
    display: grid;
    grid-template-columns: 32px 1fr;
    align-items: center;
    gap: 6px;
  }
  .hm-day {
    font-family: var(--font-mono);
    font-size: 9.5px;
    color: var(--text-muted);
  }
  .hm-cells {
    display: grid;
    grid-template-columns: repeat(24, 1fr);
    gap: 3px;
  }
  .hm-cell {
    aspect-ratio: 1;
    border-radius: 3px;
  }

  .learned-list,
  .chain-list,
  .sig-list {
    display: flex;
    flex-direction: column;
    gap: 6px;
  }
  .learned-row,
  .chain-row {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 10px;
    padding: 8px 11px;
    border-radius: 10px;
    background: var(--surface-row);
  }
  .l-title {
    flex: 1;
    font-size: 12.5px;
    font-weight: 550;
  }
  .l-stat {
    font-family: var(--font-mono);
    font-size: 11px;
    color: var(--text-muted);
  }

  .chain-nodes {
    display: flex;
    align-items: center;
    gap: 8px;
    flex-wrap: wrap;
  }
  .node-pill {
    padding: 3px 9px;
    border-radius: 8px;
    background: var(--surface-subtle);
    font-size: 12px;
    font-weight: 560;
  }
  .node-pill.dest {
    background: var(--accent-soft);
    color: var(--accent-text);
  }
  .chain-arrow {
    color: var(--text-muted);
    font-family: var(--font-mono);
  }
  .chain-metrics {
    display: flex;
    align-items: center;
    gap: 10px;
  }
  .conf-track {
    width: 64px;
    height: 5px;
    border-radius: 99px;
    background: var(--surface-subtle);
    overflow: hidden;
  }
  .conf-track div {
    height: 100%;
    background: var(--accent);
  }

  .empty-chain-state {
    padding: 18px;
    text-align: center;
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 6px;
    color: var(--text-secondary);
  }
  .empty-chain-state p {
    margin: 0;
    font-size: 12px;
    color: var(--text-muted);
    max-width: 480px;
    line-height: 1.45;
  }

  .cap-chips {
    display: flex;
    flex-wrap: wrap;
    gap: 6px;
  }
  .cap-chip {
    padding: 4px 10px;
    border-radius: var(--r-pill);
    background: var(--surface-row);
    color: var(--accent-text);
    font-size: 11.5px;
    font-weight: 550;
  }

  .sig-row {
    display: grid;
    grid-template-columns: 76px 1fr 110px 62px;
    align-items: center;
    gap: 8px;
    padding: 6px 10px;
    border-radius: 9px;
    background: var(--surface-row);
    font-size: 11.5px;
  }
  .sig-type {
    font-family: var(--font-mono);
    font-size: 10px;
    text-transform: uppercase;
    color: var(--accent-text);
  }
  .sig-detail {
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
  }
  .sig-slot,
  .sig-time {
    font-family: var(--font-mono);
    font-size: 10.5px;
    color: var(--text-muted);
    text-align: right;
  }

  .empty-copy {
    margin: 0;
    font-size: 12px;
    color: var(--text-muted);
    line-height: 1.45;
  }
  .danger-txt {
    color: var(--status-danger);
  }
</style>
