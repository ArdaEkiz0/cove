function escapeHtml(raw: string): string {
  return raw
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function formatInline(escaped: string): string {
  return escaped
    .replace(/`([^`]+)`/g, '<code>$1</code>')
    .replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>')
    .replace(/\*([^*]+)\*/g, '<em>$1</em>')
    .replace(/\[([^\]]+)\]\((https?:\/\/[^\s)]+)\)/g, '<a href="$2" target="_blank" rel="noopener noreferrer">$1</a>');
}

/**
 * Lightweight, XSS-safe Markdown formatter supporting bold, italic,
 * inline code, code blocks, checklists, and bullet lists.
 */
export function renderNoteMarkdown(raw: string): string {
  const lines = raw.split(/\r?\n/);
  const out: string[] = [];
  let inCodeBlock = false;
  let codeLines: string[] = [];
  let inList = false;

  const closeList = () => {
    if (inList) {
      out.push('</ul>');
      inList = false;
    }
  };

  for (const line of lines) {
    if (line.trim().startsWith('```')) {
      closeList();
      if (!inCodeBlock) {
        inCodeBlock = true;
        codeLines = [];
      } else {
        out.push(`<pre><code>${escapeHtml(codeLines.join('\n'))}</code></pre>`);
        inCodeBlock = false;
      }
      continue;
    }

    if (inCodeBlock) {
      codeLines.push(line);
      continue;
    }

    const trimmed = line.trim();
    if (!trimmed) {
      closeList();
      out.push('<div class="md-spacer"></div>');
      continue;
    }

    if (trimmed.startsWith('### ')) {
      closeList();
      out.push(`<h4>${formatInline(escapeHtml(trimmed.slice(4)))}</h4>`);
      continue;
    }
    if (trimmed.startsWith('## ')) {
      closeList();
      out.push(`<h3>${formatInline(escapeHtml(trimmed.slice(3)))}</h3>`);
      continue;
    }
    if (trimmed.startsWith('# ')) {
      closeList();
      out.push(`<h3>${formatInline(escapeHtml(trimmed.slice(2)))}</h3>`);
      continue;
    }

    const checkMatch = trimmed.match(/^[-*]\s+\[([ xX])\]\s+(.*)$/);
    if (checkMatch) {
      if (!inList) {
        out.push('<ul class="md-list">');
        inList = true;
      }
      const checked = checkMatch[1].toLowerCase() === 'x';
      out.push(
        `<li class="md-task ${checked ? 'done' : ''}"><span class="md-box">${checked ? '✓' : ''}</span><span>${formatInline(escapeHtml(checkMatch[2]))}</span></li>`
      );
      continue;
    }

    const bulletMatch = trimmed.match(/^[-*]\s+(.*)$/);
    if (bulletMatch) {
      if (!inList) {
        out.push('<ul class="md-list">');
        inList = true;
      }
      out.push(`<li>${formatInline(escapeHtml(bulletMatch[1]))}</li>`);
      continue;
    }

    closeList();
    out.push(`<p>${formatInline(escapeHtml(line))}</p>`);
  }

  closeList();
  if (inCodeBlock && codeLines.length) {
    out.push(`<pre><code>${escapeHtml(codeLines.join('\n'))}</code></pre>`);
  }

  return out.join('');
}
