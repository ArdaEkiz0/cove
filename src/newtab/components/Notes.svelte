<script lang="ts">
  import { renderNoteMarkdown } from '../../lib/markdown';
  import { cove } from '../../lib/state.svelte';
  import Icon from './Icon.svelte';
  import SafeHtml from './SafeHtml.svelte';

  let selectedNoteId = $state<string>('');
  let editRaw = $state(false);
  let newTaskText = $state('');

  const sortedNotes = $derived(
    [...cove.notes].sort((a, b) => Number(b.pinned) - Number(a.pinned) || b.updatedAt - a.updatedAt)
  );

  const activeNote = $derived(
    sortedNotes.find((n) => n.id === selectedNoteId) || sortedNotes[0] || null
  );

  interface ParsedTask {
    lineIdx: number;
    done: boolean;
    label: string;
  }

  const parsedTasks = $derived.by<ParsedTask[]>(() => {
    if (!activeNote) return [];
    const lines = activeNote.content.split(/\r?\n/);
    const out: ParsedTask[] = [];
    lines.forEach((line, idx) => {
      const m = line.match(/^\s*[-*]\s+\[([ xX])\]\s+(.*)$/);
      if (m) {
        out.push({
          lineIdx: idx,
          done: m[1].toLowerCase() === 'x',
          label: m[2]
        });
      }
    });
    return out;
  });

  const doneCount = $derived(parsedTasks.filter((t) => t.done).length);

  function toggleTaskLine(lineIdx: number) {
    if (!activeNote) return;
    const lines = activeNote.content.split(/\r?\n/);
    const line = lines[lineIdx];
    if (!line) return;
    lines[lineIdx] = line.replace(
      /^(\s*[-*]\s+\[)([ xX])(\]\s+.*)$/,
      (_all, pre, mark, post) => `${pre}${mark.toLowerCase() === 'x' ? ' ' : 'x'}${post}`
    );
    activeNote.content = lines.join('\n');
    activeNote.updatedAt = Date.now();
    cove.scheduleSaveNotes();
  }

  function addTask(e: SubmitEvent) {
    e.preventDefault();
    if (!activeNote || !newTaskText.trim()) return;
    activeNote.content = `${activeNote.content.trim()}\n- [ ] ${newTaskText.trim()}`.trim();
    activeNote.updatedAt = Date.now();
    cove.scheduleSaveNotes();
    newTaskText = '';
  }
</script>

<div class="notes-bento">
  <div class="nb-head">
    <div class="nb-tabs">
      {#each sortedNotes as n (n.id)}
        <button
          type="button"
          class="nb-tab"
          class:active={activeNote?.id === n.id}
          onclick={() => (selectedNoteId = n.id)}
        >
          {n.title}
        </button>
      {/each}
    </div>

    <div class="nb-actions">
      <button
        type="button"
        class="nb-icon"
        class:active={editRaw}
        onclick={() => (editRaw = !editRaw)}
        title={editRaw ? 'Interactive view' : 'Edit Markdown'}
      >
        <Icon name="edit" size={13} />
      </button>
      <button
        type="button"
        class="nb-icon"
        onclick={() => {
          const id = cove.createNote('Note', '');
          selectedNoteId = id;
          editRaw = true;
        }}
        title="New note"
      >
        <Icon name="plus" size={14} />
      </button>
    </div>
  </div>

  {#if activeNote}
    {#if editRaw}
      <textarea
        class="nb-textarea"
        value={activeNote.content}
        oninput={(e) => {
          activeNote.content = (e.currentTarget as HTMLTextAreaElement).value;
          activeNote.updatedAt = Date.now();
          cove.scheduleSaveNotes();
        }}
        placeholder="- [ ] Task item or Markdown note…"
      ></textarea>
    {:else if parsedTasks.length > 0}
      <!-- Interactive To-Do Capsule Rows (Exact Image 2 "To Do" Card!) -->
      <div class="task-list">
        {#each parsedTasks as task (task.lineIdx)}
          <button
            type="button"
            class="task-capsule"
            class:done={task.done}
            onclick={() => toggleTaskLine(task.lineIdx)}
          >
            <span class="check-circle" class:checked={task.done}>
              {#if task.done}
                <Icon name="check" size={11} />
              {/if}
            </span>
            <span class="task-text">{task.label}</span>
          </button>
        {/each}
      </div>

      <form class="quick-task-form" onsubmit={addTask}>
        <input type="text" bind:value={newTaskText} placeholder="+ Add task…" />
      </form>

      <div class="task-progress-row">
        <span>Completed {doneCount} / {parsedTasks.length}</span>
        <div class="prog-track">
          <div
            class="prog-fill"
            style="width: {Math.round((doneCount / parsedTasks.length) * 100)}%"
          ></div>
        </div>
      </div>
    {:else}
      <!-- Clean Note Card View -->
      <!-- svelte-ignore a11y_click_events_have_key_events -->
      <!-- svelte-ignore a11y_no_static_element_interactions -->
      <div class="prose-surface" onclick={() => (editRaw = true)}>
        <SafeHtml html={renderNoteMarkdown(activeNote.content || '*Click to write a note, or add a task below…*')} />
      </div>
      <form class="quick-task-form" onsubmit={addTask}>
        <input type="text" bind:value={newTaskText} placeholder="+ Add task…" />
      </form>
    {/if}
  {/if}
</div>

<style>
  .notes-bento {
    display: flex;
    flex-direction: column;
    gap: 9px;
    height: 100%;
  }

  .nb-head {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 6px;
  }

  .nb-tabs {
    display: flex;
    gap: 3px;
    overflow-x: auto;
  }

  .nb-tab {
    padding: 3px 9px;
    border-radius: var(--r-pill);
    font-size: 11.5px;
    color: var(--text-muted);
    white-space: nowrap;
  }
  .nb-tab.active {
    background: var(--surface-row);
    color: var(--text-primary);
    font-weight: 500;
  }

  .nb-actions {
    display: inline-flex;
    gap: 4px;
  }
  .nb-icon {
    width: 24px;
    height: 24px;
    border-radius: 7px;
    display: grid;
    place-items: center;
    color: var(--text-muted);
  }
  .nb-icon:hover,
  .nb-icon.active {
    background: var(--surface-row);
    color: var(--text-primary);
  }

  .task-list {
    display: flex;
    flex-direction: column;
    gap: 6px;
    flex: 1;
  }

  .task-capsule {
    display: flex;
    align-items: center;
    gap: 10px;
    padding: 9px 11px;
    border-radius: var(--r-row);
    background: var(--surface-row);
    text-align: left;
    transition: background var(--dur-fast) var(--ease-calm);
  }
  .task-capsule:hover {
    background: var(--surface-hover);
  }

  .check-circle {
    width: 18px;
    height: 18px;
    border-radius: 50%;
    border: 1.5px solid var(--border-strong);
    display: grid;
    place-items: center;
    flex-shrink: 0;
    color: var(--accent-ink);
    transition: all var(--dur-fast) var(--ease-calm);
  }
  .check-circle.checked {
    background: var(--accent);
    border-color: var(--accent);
  }

  .task-text {
    font-size: 12.5px;
    color: var(--text-primary);
    line-height: 1.35;
  }
  .task-capsule.done .task-text {
    color: var(--text-muted);
    text-decoration: line-through;
  }

  .quick-task-form input {
    width: 100%;
    padding: 6px 10px;
    border-radius: 10px;
    border: 1px solid transparent;
    background: transparent;
    font-size: 12px;
    color: var(--text-primary);
    outline: none;
  }
  .quick-task-form input:focus {
    background: var(--surface-input);
    border-color: var(--border-subtle);
  }

  .task-progress-row {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 12px;
    font-size: 11px;
    color: var(--text-muted);
    padding-top: 2px;
  }
  .prog-track {
    flex: 1;
    height: 3px;
    border-radius: var(--r-pill);
    background: var(--surface-row);
    overflow: hidden;
  }
  .prog-fill {
    height: 100%;
    background: var(--accent);
    border-radius: var(--r-pill);
    transition: width var(--dur-calm) var(--ease-calm);
  }

  .nb-textarea {
    width: 100%;
    min-height: 155px;
    flex: 1;
    resize: vertical;
    padding: 10px 12px;
    border-radius: var(--r-row);
    border: 1px solid var(--border-subtle);
    background: var(--surface-input);
    font-size: 12.5px;
    line-height: 1.55;
    outline: none;
  }

  .prose-surface {
    flex: 1;
    padding: 12px 14px;
    border-radius: var(--r-row);
    background: var(--surface-row);
    font-size: 13px;
    line-height: 1.55;
    cursor: text;
  }
  .prose-surface :global(p) {
    margin: 0 0 6px;
  }
  .prose-surface :global(code) {
    font-family: var(--font-mono);
    font-size: 11.5px;
    padding: 1px 5px;
    border-radius: 5px;
    background: var(--surface-hover);
    color: var(--accent-text);
  }
</style>
