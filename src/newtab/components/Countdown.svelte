<script lang="ts">
  import { cove } from '../../lib/state.svelte';
  import Icon from './Icon.svelte';

  let adding = $state(false);
  let label = $state('');
  let targetDate = $state('');

  function daysUntil(dateStr: string): number {
    const target = new Date(`${dateStr}T00:00:00`);
    const today = new Date(cove.now.getFullYear(), cove.now.getMonth(), cove.now.getDate());
    return Math.ceil((target.getTime() - today.getTime()) / 86_400_000);
  }

  function progressPct(dateStr: string, createdAt?: number): number {
    const target = new Date(`${dateStr}T00:00:00`).getTime();
    const start = createdAt || target - 30 * 86_400_000;
    const total = Math.max(86_400_000, target - start);
    const elapsed = cove.now.getTime() - start;
    return Math.min(100, Math.max(6, Math.round((elapsed / total) * 100)));
  }

  function handleAdd(e: SubmitEvent) {
    e.preventDefault();
    if (!label.trim() || !targetDate) return;
    cove.addCountdown(label, targetDate);
    label = '';
    targetDate = '';
    adding = false;
  }
</script>

<div class="cd-widget">
  <div class="cd-head">
    <span class="cd-sub">Milestones</span>
    <button type="button" class="add-mini" onclick={() => (adding = !adding)} title="Add countdown">
      <Icon name="plus" size={12} />
    </button>
  </div>

  {#if adding || cove.countdowns.length === 0}
    <form class="cd-form" onsubmit={handleAdd}>
      <input type="text" bind:value={label} placeholder="Real milestone or deadline…" required />
      <input type="date" bind:value={targetDate} required />
      <button type="submit" class="btn-primary">Add</button>
    </form>
  {/if}

  {#if cove.countdowns.length > 0}
    <div class="cd-list">
      {#each cove.countdowns as item (item.id)}
        {@const days = daysUntil(item.targetDate)}
        {@const pct = progressPct(item.targetDate, item.createdAt)}
        <div class="cd-row">
          <div class="cd-top">
            <span class="cd-label">{item.label}</span>
            <div class="cd-right">
              <span class="cd-days" class:past={days < 0}>
                {days === 0 ? 'Today' : days > 0 ? `${days}d` : `${Math.abs(days)}d ago`}
              </span>
              <button
                type="button"
                class="cd-del"
                onclick={() => cove.removeCountdown(item.id)}
                aria-label="Remove countdown"
              >
                ×
              </button>
            </div>
          </div>
          <div class="cd-bar">
            <div style="width: {pct}%"></div>
          </div>
        </div>
      {/each}
    </div>
  {/if}
</div>

<style>
  .cd-widget {
    display: flex;
    flex-direction: column;
    gap: 8px;
    height: 100%;
  }
  .cd-head {
    display: flex;
    justify-content: space-between;
    align-items: center;
  }
  .cd-sub {
    font-size: 11.5px;
    color: var(--text-muted);
  }
  .add-mini {
    width: 24px;
    height: 24px;
    border-radius: 50%;
    background: var(--surface-row);
    display: grid;
    place-items: center;
    color: var(--text-secondary);
  }

  .cd-form {
    display: flex;
    flex-direction: column;
    gap: 6px;
    padding: 8px;
    border-radius: var(--r-row);
    background: var(--surface-row);
  }
  .cd-form input {
    padding: 6px 9px;
    border-radius: 8px;
    border: 1px solid var(--border-subtle);
    background: var(--surface-input);
    font-size: 12px;
  }

  .cd-list {
    display: flex;
    flex-direction: column;
    gap: 7px;
  }
  .cd-row {
    display: flex;
    flex-direction: column;
    gap: 6px;
    padding: 9px 11px;
    border-radius: var(--r-row);
    background: var(--surface-row);
  }
  .cd-top {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 8px;
  }
  .cd-label {
    font-size: 12.5px;
    font-weight: 500;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
  }
  .cd-right {
    display: inline-flex;
    align-items: center;
    gap: 5px;
    flex-shrink: 0;
  }
  .cd-days {
    padding: 2px 8px;
    border-radius: var(--r-pill);
    background: var(--accent-soft);
    color: var(--accent-text);
    font-family: var(--font-mono);
    font-size: 11px;
    font-weight: 600;
  }
  .cd-days.past {
    background: var(--surface-hover);
    color: var(--text-muted);
  }
  .cd-del {
    color: var(--text-muted);
    font-size: 14px;
    padding: 0 2px;
  }
  .cd-del:hover {
    color: var(--status-danger);
  }
  .cd-bar {
    height: 3px;
    border-radius: var(--r-pill);
    background: var(--surface-subtle);
    overflow: hidden;
  }
  .cd-bar div {
    height: 100%;
    border-radius: var(--r-pill);
    background: var(--accent);
  }
</style>
