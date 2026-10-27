/**
 * Deterministic, collision-resistant story identifiers.
 *
 * Earlier builds derived IDs from the first 22 base64 characters of an
 * article URL. Because every URL from the same publisher starts with the same
 * scheme + hostname, those IDs collided inside a single feed and Svelte's
 * keyed `{#each}` blocks refused to render the Discover stream.
 *
 * This helper mixes two independent 32-bit lanes across the entire URL and
 * returns a compact base36 fingerprint. It is dependency-free, stable across
 * reloads, and safe to run in the new-tab page.
 */
export function storyUrlHash(url: string): string {
  const input = url.trim();
  let h1 = 0xdeadbeef ^ input.length;
  let h2 = 0x41c6ce57 ^ input.length;

  for (let index = 0; index < input.length; index += 1) {
    const code = input.charCodeAt(index);
    h1 = Math.imul(h1 ^ code, 2654435761);
    h2 = Math.imul(h2 ^ code, 1597334677);
  }

  h1 = Math.imul(h1 ^ (h1 >>> 16), 2246822507) ^ Math.imul(h2 ^ (h2 >>> 13), 3266489909);
  h2 = Math.imul(h2 ^ (h2 >>> 16), 2246822507) ^ Math.imul(h1 ^ (h1 >>> 13), 3266489909);

  return `${(h2 >>> 0).toString(36)}${(h1 >>> 0).toString(36)}`;
}

export function buildStoryId(sourceId: string, url: string): string {
  return `${sourceId}-${storyUrlHash(url)}`;
}

/**
 * Repairs caches written by older builds whose IDs were truncated by domain.
 * The first occurrence keeps its ID (preserving existing read/dismiss state);
 * every later duplicate is re-keyed from its full article URL.
 */
export function ensureUniqueStoryIds<T extends { id: string; url: string }>(stories: T[]): T[] {
  const seen = new Set<string>();

  return stories.map((story) => {
    let id = story.id;

    if (!id || seen.has(id)) {
      const base = buildStoryId('story', story.url || `${story.id}-${seen.size}`);
      id = base;
      let suffix = 2;
      while (seen.has(id)) {
        id = `${base}-${suffix}`;
        suffix += 1;
      }
    }

    seen.add(id);
    return id === story.id ? story : { ...story, id };
  });
}
