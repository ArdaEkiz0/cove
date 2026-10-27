<script lang="ts">
  import { getFaviconCandidates } from '../../lib/favicons';
  import { cove } from '../../lib/state.svelte';

  interface Props {
    url: string;
    title?: string;
    explicitIcon?: string;
    size?: number;
    radius?: number;
  }

  let { url, title = '', explicitIcon = undefined, size = 22, radius = 6 }: Props = $props();

  let attemptIdx = $state(0);

  const candidates = $derived(
    getFaviconCandidates(url, title, cove.settings.useFaviconApi, explicitIcon)
  );

  // Reset attempt index whenever the target URL changes
  $effect(() => {
    void url;
    void explicitIcon;
    void cove.settings.useFaviconApi;
    attemptIdx = 0;
  });

  const activeSrc = $derived(
    candidates[Math.min(attemptIdx, candidates.length - 1)] || candidates[candidates.length - 1]
  );

  function advanceFallback() {
    if (attemptIdx < candidates.length - 1) {
      attemptIdx += 1;
    }
  }

  function handleLoad(e: Event) {
    const img = e.currentTarget as HTMLImageElement;
    // Google S2 returns a 16x16 generic grey globe when sz=128 has no real favicon.
    // Stepping forward gives us either DuckDuckGo's icon, a crisp Brand SVG, or a clean monogram!
    if (
      activeSrc.includes('google.com/s2/favicons') &&
      img.naturalWidth > 0 &&
      img.naturalWidth <= 16 &&
      attemptIdx < candidates.length - 1
    ) {
      attemptIdx += 1;
    } else if (activeSrc.startsWith('https://')) {
      cove.networkLedger.favicons += 1;
    }
  }
</script>

<img
  src={activeSrc}
  alt=""
  width={size}
  height={size}
  loading="lazy"
  decoding="async"
  referrerpolicy="no-referrer"
  class="brand-logo"
  style="width: {size}px; height: {size}px; border-radius: {radius}px;"
  onload={handleLoad}
  onerror={advanceFallback}
/>

<style>
  .brand-logo {
    display: block;
    object-fit: contain;
    flex-shrink: 0;
    user-select: none;
    -webkit-user-drag: none;
  }
</style>
