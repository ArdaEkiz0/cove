import test from 'node:test';
import assert from 'node:assert/strict';
import { renderNoteMarkdown } from '../src/lib/markdown.ts';

test('escapes raw HTML before rendering markdown', () => {
  const html = renderNoteMarkdown('<script>alert(1)</script>');
  assert.ok(!html.includes('<script>'));
  assert.ok(html.includes('&lt;script&gt;'));
});

test('renders headings, bold, italics, inline code, and safe links', () => {
  const html = renderNoteMarkdown(
    '# Heading\n## Subheading\n**bold** *italic* `code` [Cove](https://example.com)'
  );
  assert.ok(html.includes('<h3>Heading</h3>'));
  assert.ok(html.includes('<h3>Subheading</h3>'));
  assert.ok(html.includes('<strong>bold</strong>'));
  assert.ok(html.includes('<em>italic</em>'));
  assert.ok(html.includes('<code>code</code>'));
  assert.ok(
    html.includes('<a href="https://example.com" target="_blank" rel="noopener noreferrer">Cove</a>')
  );
});

test('does not create links for javascript or data URLs', () => {
  const html = renderNoteMarkdown('[click](javascript:alert(1)) [data](data:text/html,hi)');
  assert.ok(!html.includes('<a '));
  assert.ok(html.includes('[click](javascript:alert(1))'));
});

test('renders unordered lists and task checkboxes', () => {
  const html = renderNoteMarkdown('- one\n- two\n- [x] shipped\n- [ ] pending');
  assert.ok(html.includes('<ul class="md-list">'));
  assert.equal((html.match(/<li/g) || []).length, 4);
  assert.ok(html.includes('md-task done'));
  assert.ok(html.includes('md-task '));
  assert.ok(html.includes('✓'));
});

test('renders fenced code blocks and preserves their contents as text', () => {
  const html = renderNoteMarkdown('```\nconst x = "<tag>";\n```');
  assert.ok(html.includes('<pre><code>'));
  assert.ok(html.includes('const x = &quot;&lt;tag&gt;&quot;;'));
});

test('flushes an unclosed code block instead of dropping content', () => {
  const html = renderNoteMarkdown('```\nconst x = 1;');
  assert.ok(html.includes('<pre><code>'));
  assert.ok(html.includes('const x = 1;'));
});

test('escapes attribute-breaking characters in links and text', () => {
  const html = renderNoteMarkdown('[x](https://example.com/?a=1&b=2 "quoted")');
  assert.ok(!html.includes('"quoted"'));
  assert.ok(html.includes('&quot;quoted&quot;'));
});
