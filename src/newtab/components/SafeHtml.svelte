<script lang="ts">
  /**
   * Renders a small, sanitized subset of HTML without assigning to innerHTML.
   *
   * The app only generates article and note markup from escaped text plus a
   * fixed tag whitelist. This component re-checks that whitelist before moving
   * nodes into the live document so extension linters and browsers never see a
   * dynamic innerHTML assignment.
   */
  let {
    html,
    class: className = ''
  }: {
    html: string;
    class?: string;
  } = $props();

  let host: HTMLDivElement | undefined = $state();

  const ALLOWED_TAGS = new Set([
    'a',
    'b',
    'blockquote',
    'br',
    'code',
    'div',
    'em',
    'figcaption',
    'figure',
    'h1',
    'h2',
    'h3',
    'h4',
    'hr',
    'i',
    'img',
    'li',
    'ol',
    'p',
    'pre',
    'span',
    'strong',
    'ul'
  ]);

  const ALLOWED_ATTRS = new Set([
    'alt',
    'class',
    'href',
    'rel',
    'src',
    'target',
    'title'
  ]);

  function isSafeUrl(value: string): boolean {
    const trimmed = value.trim();
    return (
      /^https?:\/\//i.test(trimmed) ||
      /^mailto:/i.test(trimmed) ||
      trimmed.startsWith('#') ||
      trimmed.startsWith('/')
    );
  }

  function cleanNode(node: Node): Node {
    if (node.nodeType === Node.TEXT_NODE) {
      return document.createTextNode(node.textContent ?? '');
    }
    if (!(node instanceof HTMLElement)) {
      return document.createTextNode('');
    }

    const tag = node.tagName.toLowerCase();
    if (!ALLOWED_TAGS.has(tag)) {
      return document.createTextNode(node.textContent ?? '');
    }

    const clean = document.createElement(tag);
    for (const attr of Array.from(node.attributes)) {
      const name = attr.name.toLowerCase();
      if (!ALLOWED_ATTRS.has(name)) continue;
      if ((name === 'href' || name === 'src') && !isSafeUrl(attr.value)) continue;
      clean.setAttribute(name, attr.value);
    }

    if (tag === 'a') {
      clean.setAttribute('target', '_blank');
      clean.setAttribute('rel', 'noopener noreferrer');
    }
    if (tag === 'img') {
      clean.setAttribute('referrerpolicy', 'no-referrer');
      clean.setAttribute('loading', 'lazy');
    }

    for (const child of Array.from(node.childNodes)) {
      clean.appendChild(cleanNode(child));
    }
    return clean;
  }

  function renderInto(container: HTMLDivElement, markup: string): void {
    const parsed = new DOMParser().parseFromString(
      `<body>${markup}</body>`,
      'text/html'
    );
    const fragment = document.createDocumentFragment();
    for (const child of Array.from(parsed.body.childNodes)) {
      fragment.appendChild(cleanNode(child));
    }
    container.replaceChildren(fragment);
  }

  $effect(() => {
    if (host) renderInto(host, html);
  });
</script>

<div bind:this={host} class={className}></div>
