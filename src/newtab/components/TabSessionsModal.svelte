<script lang="ts">
  import { formatTimeAgo } from '../../lib/rss-parser';
  import { cove } from '../../lib/state.svelte';
  import BrandIcon from './BrandIcon.svelte';
  import Icon from './Icon.svelte';

  let sessionName = $state('');
  let showManualCreate = $state(false);
  let manualName = $state('');
  let manualUrls = $state('');
  let expandedId = $state<string | null>(null);

  function handleSave(e: SubmitEvent) {
    e.preventDefault();
    cove.saveCurrentSession(sessionName);
    sessionName = '';
  }

  async function handleManualCreate(e: SubmitEvent) {
    e.preventDefault();
    if (!manualUrls.trim()) return;
    await cove.createSessionFromUrls(manualName, manualUrls);
    manualName = '';
    manualUrls = '';
    showManualCreate = false;
  }

  function close() {
    cove.sessionsModalOpen = false;
  }
</script>

{#if cove.sessionsModalOpen}
  <!-- svelte-ignore a11y_click_events_have_key_events -->
  <!-- svelte-ignore a11y_no_static_element_interactions -->
  <div class="modal-backdrop" onclick={close}>
    <div
      class="modal-card"
      role="dialog"
      aria-modal="true"
      aria-label="Tab Sessions"
      tabindex="-1"
      onclick={(e) => e.stopPropagation()}
    >
      <div class="modal-head">
        <div>
          <h2>Tab Sessions</h2>
          <p>Non-destructive snapshots — saving or restoring never wipes your open tabs.</p>
        </div>
        <button type="button" class="close-btn" onclick={close} aria-label="Close">
          <Icon name="x" size={16} />
        </button>
      </div>

      <form class="save-bar" onsubmit={handleSave}>
        <input
          type="text"
          bind:value={sessionName}
          placeholder={`Snapshot ${cove.openTabs.length} open tabs as… (e.g. Research)`}
        />
        <button type="submit" class="btn-primary">
          <Icon name="layers" size={14} />
          <span>Save snapshot</span>
        </button>
        <button
          type="button"
          class="btn-ghost"
          onclick={() => (showManualCreate = !showManualCreate)}
        >
          + Paste URLs
        </button>
      </form>

      {#if showManualCreate}
        <form class="manual-box" onsubmit={handleManualCreate}>
          <input type="text" bind:value={manualName} placeholder="Session name (e.g. Daily Standup)" />
          <textarea
            rows="3"
            bind:value={manualUrls}
            placeholder="Paste one URL per line (e.g. github.com, linear.app)…"
            required
          ></textarea>
          <button type="submit" class="btn-primary">Create Session</button>
        </form>
      {/if}

      <div class="session-list">
        {#if cove.sessions.length === 0}
          <div class="sess-empty">
            <p>
              No saved sessions yet. Snapshot your open workspace tabs above or click <strong>+ Paste URLs</strong> to create a reusable multi-tab bundle.
            </p>
          </div>
        {:else}
          {#each cove.sessions as sess (sess.id)}
            <div class="session-card">
              <div class="session-row">
                <div class="fav-stack">
                  {#each sess.tabs.slice(0, 4) as st}
                    <span class="fav-chip">
                      <BrandIcon url={st.url} title={st.title} size={16} radius={4} />
                    </span>
                  {/each}
                </div>

                <button
                  type="button"
                  class="session-expand"
                  onclick={() => (expandedId = expandedId === sess.id ? null : sess.id)}
                >
                  <span class="sess-title">{sess.name}</span>
                  <span class="sess-meta">
                    {sess.tabs.length} tabs · {formatTimeAgo(sess.createdAt)} · {sess.context}
                  </span>
                </button>

                <div class="sess-actions">
                  <button
                    type="button"
                    class="btn-ghost"
                    onclick={() => cove.restoreSession(sess.id)}
                  >
                    Restore
                  </button>
                  <button
                    type="button"
                    class="del-btn"
                    onclick={() => cove.deleteSession(sess.id)}
                    aria-label="Delete session"
                  >
                    <Icon name="x" size={14} />
                  </button>
                </div>
              </div>

              {#if expandedId === sess.id}
                <ul class="sess-tabs">
                  {#each sess.tabs as st}
                    <li>
                      <a href={st.url} target="_blank" rel="noopener noreferrer">
                        <span class="st-left">
                          <BrandIcon url={st.url} title={st.title} size={14} radius={3} />
                          <span>{st.title}</span>
                        </span>
                        <span class="mono">{st.domain}</span>
                      </a>
                    </li>
                  {/each}
                </ul>
              {/if}
            </div>
          {/each}
        {/if}
      </div>
    </div>
  </div>
{/if}

<style>
  .modal-backdrop {
    position: fixed;
    inset: 0;
    z-index: 130;
    background: var(--backdrop-scrim);
    backdrop-filter: blur(8px);
    display: grid;
    place-items: center;
    padding: 20px;
  }

  .modal-card {
    width: 100%;
    max-width: 600px;
    max-height: 82vh;
    border-radius: var(--r-xl);
    background: var(--surface-overlay);
    backdrop-filter: var(--glass-blur-heavy);
    border: 1px solid var(--border-strong);
    box-shadow: var(--shadow-elevated);
    padding: 22px 24px;
    display: flex;
    flex-direction: column;
    gap: 16px;
  }

  .modal-head {
    display: flex;
    justify-content: space-between;
    align-items: flex-start;
    gap: 12px;
  }
  .modal-head h2 {
    margin: 0;
    font-size: 17px;
    font-weight: 600;
  }
  .modal-head p {
    margin: 3px 0 0;
    font-size: 12.5px;
    color: var(--text-secondary);
  }

  .close-btn {
    width: 30px;
    height: 30px;
    border-radius: 50%;
    display: grid;
    place-items: center;
    color: var(--text-muted);
  }
  .close-btn:hover {
    background: var(--surface-hover);
    color: var(--text-primary);
  }

  .save-bar {
    display: flex;
    gap: 8px;
    flex-wrap: wrap;
  }
  .save-bar input {
    flex: 1;
    min-width: 180px;
    padding: 9px 13px;
    border-radius: var(--r-pill);
    border: 1px solid var(--border-subtle);
    background: var(--surface-input);
    font-size: 13px;
  }

  .manual-box {
    display: flex;
    flex-direction: column;
    gap: 8px;
    padding: 12px;
    border-radius: 16px;
    background: var(--surface-row);
    border: 1px solid var(--border-subtle);
  }
  .manual-box input,
  .manual-box textarea {
    padding: 8px 10px;
    border-radius: 10px;
    border: 1px solid var(--border-subtle);
    background: var(--surface-input);
    font-size: 12.5px;
  }

  .session-list {
    display: flex;
    flex-direction: column;
    gap: 8px;
    overflow-y: auto;
  }

  .sess-empty {
    padding: 20px;
    border-radius: 16px;
    background: var(--surface-row);
    border: 1px dashed var(--border-subtle);
    font-size: 12.5px;
    color: var(--text-secondary);
    line-height: 1.5;
  }
  .sess-empty p {
    margin: 0;
  }

  .session-card {
    border-radius: 18px;
    background: var(--surface-row);
    border: 1px solid var(--border-subtle);
    padding: 11px 13px;
  }

  .session-row {
    display: flex;
    align-items: center;
    gap: 11px;
  }

  .fav-stack {
    display: inline-flex;
    align-items: center;
    flex-shrink: 0;
  }
  .fav-chip {
    width: 26px;
    height: 26px;
    border-radius: 8px;
    background: var(--surface-icon);
    border: 1.5px solid var(--surface-card-solid);
    display: grid;
    place-items: center;
    margin-left: -7px;
  }
  .fav-chip:first-child {
    margin-left: 0;
  }

  .session-expand {
    flex: 1;
    min-width: 0;
    text-align: left;
    display: flex;
    flex-direction: column;
    gap: 2px;
  }
  .sess-title {
    font-weight: 550;
    font-size: 13.5px;
    color: var(--text-primary);
  }
  .sess-meta {
    font-size: 11.5px;
    color: var(--text-muted);
  }

  .sess-actions {
    display: flex;
    align-items: center;
    gap: 6px;
  }

  .del-btn {
    width: 28px;
    height: 28px;
    border-radius: 50%;
    display: grid;
    place-items: center;
    color: var(--text-muted);
  }
  .del-btn:hover {
    background: var(--status-danger-soft);
    color: var(--status-danger);
  }

  .sess-tabs {
    margin: 10px 0 0;
    padding: 8px 0 0;
    border-top: 1px solid var(--border-subtle);
    list-style: none;
    display: flex;
    flex-direction: column;
    gap: 4px;
  }
  .sess-tabs a {
    display: flex;
    justify-content: space-between;
    align-items: center;
    gap: 10px;
    padding: 5px 8px;
    border-radius: 9px;
    font-size: 12px;
    color: var(--text-secondary);
  }
  .sess-tabs a:hover {
    background: var(--surface-hover);
    color: var(--text-primary);
  }
  .st-left {
    display: inline-flex;
    align-items: center;
    gap: 8px;
    min-width: 0;
  }
  .mono {
    font-family: var(--font-mono);
    color: var(--text-muted);
    font-size: 11px;
  }
</style>
