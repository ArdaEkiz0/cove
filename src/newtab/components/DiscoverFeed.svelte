<script lang="ts">
  import {
    computeTrendingKeywords,
    DISCOVER_TOPICS,
    type DiscoverStory,
    type DiscoverTopicId
  } from '../../lib/discover';
  import { isExtensionContext } from '../../lib/storage';
  import { cove } from '../../lib/state.svelte';
  import BrandIcon from './BrandIcon.svelte';
  import Icon from './Icon.svelte';

  let customizeOpen = $state(false);
  let followOpen = $state(false);
  let savedTabActive = $state(false);
  let filterQuery = $state('');
  let customFeedName = $state('');
  let customFeedUrl = $state('');
  let visibleCount = $state(12);
  let hoverTimer: number | null = null;

  let imgStage = $state<Record<string, 'proxy' | 'failed'>>({});

  const EXTRA_CURATED_FEEDS = [
    { name: 'MIT Tech Review', url: 'https://www.technologyreview.com/feed/' },
    { name: 'Wired', url: 'https://www.wired.com/feed/rss' },
    { name: 'Quanta Magazine', url: 'https://api.quantamagazine.org/feed/' },
    { name: 'GitHub Blog', url: 'https://github.blog/feed/' }
  ];

  const trendingKeywords = $derived(computeTrendingKeywords(cove.discoverStories, 8));

  const topicCounts = $derived.by<Record<string, number>>(() => {
    const counts: Record<string, number> = { 'for-you': cove.discoverStories.length };
    for (const s of cove.discoverStories) {
      counts[s.topic] = (counts[s.topic] || 0) + 1;
    }
    return counts;
  });

  const activeChannelTitle = $derived.by(() => {
    if (savedTabActive) return 'Saved Reading Vault';
    const found = DISCOVER_TOPICS.find((t) => t.id === cove.discoverActiveTopic);
    return found ? found.label : 'For You';
  });

  const filteredStories = $derived.by<DiscoverStory[]>(() => {
    const q = filterQuery.trim().toLowerCase().replace(/^#/, '');
    if (!q) return cove.rankedDiscoverStories;
    return cove.rankedDiscoverStories.filter(
      (s) =>
        s.title.toLowerCase().includes(q) ||
        s.publisher.toLowerCase().includes(q) ||
        s.summary.toLowerCase().includes(q) ||
        s.topic.toLowerCase().includes(q)
    );
  });

  const heroStory = $derived.by<DiscoverStory | null>(() => {
    if (filteredStories.length === 0) return null;
    return (
      filteredStories.find((s) => s.bannerUrl && imgStage[s.id] !== 'failed') ||
      filteredStories[0]
    );
  });

  const sideBriefStories = $derived.by<DiscoverStory[]>(() => {
    if (!heroStory) return [];
    return filteredStories.filter((s) => s.id !== heroStory.id).slice(0, 2);
  });

  const allRemainingStories = $derived.by<DiscoverStory[]>(() => {
    if (!heroStory) return [];
    const usedIds = new Set([heroStory.id, ...sideBriefStories.map((s) => s.id)]);
    return filteredStories.filter((s) => !usedIds.has(s.id));
  });

  const gridStories = $derived(allRemainingStories.slice(0, visibleCount));

  const savedUrlSet = $derived(new Set(cove.readLater.map((r) => r.url)));

  const topLearnedKeywords = $derived.by(() =>
    Object.entries(cove.discoverProfile.keywordScores || {})
      .filter(([, v]) => v >= 1.2)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 6)
      .map(([k]) => k)
  );

  function scheduleHoverPrefetch(story: DiscoverStory) {
    if (hoverTimer) window.clearTimeout(hoverTimer);
    hoverTimer = window.setTimeout(() => {
      cove.prefetchDiscoverArticle(story);
    }, 180);
  }

  function cancelHoverPrefetch() {
    if (hoverTimer) {
      window.clearTimeout(hoverTimer);
      hoverTimer = null;
    }
  }

  function resolveBannerSrc(id: string, rawUrl?: string): string | undefined {
    if (!rawUrl || imgStage[id] === 'failed') return undefined;
    if (imgStage[id] === 'proxy' && !isExtensionContext()) {
      return `/api/img?url=${encodeURIComponent(rawUrl)}`;
    }
    return rawUrl;
  }

  function handleImgError(id: string) {
    const cur = imgStage[id];
    if (!cur && !isExtensionContext()) {
      imgStage = { ...imgStage, [id]: 'proxy' };
    } else {
      imgStage = { ...imgStage, [id]: 'failed' };
    }
  }

  function selectChannel(id: DiscoverTopicId) {
    savedTabActive = false;
    cove.discoverActiveTopic = id;
    visibleCount = 12;
  }

  async function submitCustomFeed(e: SubmitEvent) {
    e.preventDefault();
    const ok = await cove.followDiscoverFeed(customFeedName, customFeedUrl);
    if (ok) {
      customFeedName = '';
      customFeedUrl = '';
      followOpen = false;
    }
  }

  function fmtRel(ts: number): string {
    const mins = Math.max(1, Math.floor((Date.now() - ts) / 60_000));
    if (mins < 60) return `${mins}m ago`;
    const hrs = Math.floor(mins / 60);
    if (hrs < 24) return `${hrs}h ago`;
    return `${Math.floor(hrs / 24)}d ago`;
  }
</script>

<section class="discover-section" aria-label="Cove Discover — Personalized Verified News">
  <!-- ========================================================================
       LEFT SIDE NAVIGATION PANEL (CHANNELS · TRENDING · RSS · LOCAL CACHE)
       ======================================================================== -->
  <aside class="disc-sidenav" aria-label="Discover channels and cache">
    <div class="sn-card">
      <div class="sn-head">
        <div class="sn-brand">
          <Icon name="compass" size={15} />
          <span>Discover</span>
        </div>
        <span class="sn-live-pill">
          <i class="pulse-dot" class:syncing={cove.discoverLoading || cove.discoverRevalidating}></i>
          <span>{cove.discoverRevalidating ? 'Syncing' : `${cove.discoverStories.length} live`}</span>
        </span>
      </div>

      <!-- Vertical Channel Side Navigation (Horizontal Pills on Tablet/Mobile) -->
      <div class="sn-channels" role="tablist" aria-label="News topics">
        {#each DISCOVER_TOPICS as t (t.id)}
          {@const isSelected = !savedTabActive && cove.discoverActiveTopic === t.id}
          <button
            type="button"
            role="tab"
            aria-selected={isSelected}
            class="sn-nav-item"
            class:active={isSelected}
            onclick={() => selectChannel(t.id as DiscoverTopicId)}
          >
            <span class="sn-item-label">
              {#if t.id === 'for-you'}
                <Icon name="sparkle" size={13} />
              {/if}
              <span>{t.label}</span>
            </span>
            <span class="sn-count">{topicCounts[t.id] || 0}</span>
          </button>
        {/each}

        <div class="sn-divider"></div>

        <button
          type="button"
          role="tab"
          aria-selected={savedTabActive}
          class="sn-nav-item"
          class:active={savedTabActive}
          onclick={() => (savedTabActive = true)}
        >
          <span class="sn-item-label">
            <Icon name="bookmark" size={13} />
            <span>Saved Vault</span>
          </span>
          <span class="sn-count">{cove.readLater.length}</span>
        </button>
      </div>

      <!-- Trending Keywords Block -->
      {#if trendingKeywords.length > 0}
        <div class="sn-block hide-mobile-sn">
          <span class="sn-kicker">Trending Now</span>
          <div class="sn-tags">
            {#each trendingKeywords as kw (kw)}
              {@const isOn = filterQuery.toLowerCase().replace(/^#/, '') === kw}
              <button
                type="button"
                class="sn-tag"
                class:on={isOn}
                onclick={() => {
                  savedTabActive = false;
                  filterQuery = isOn ? '' : `#${kw}`;
                }}
              >
                #{kw}
              </button>
            {/each}
          </div>
        </div>
      {/if}

      <!-- Multi-Tier IndexedDB Cache Card -->
      <div class="sn-cache-box hide-mobile-sn">
        <div class="sn-cache-top">
          <span class="sn-kicker">⚡ Local Cache</span>
          <span class="sn-cache-stat">{cove.cachedArticleKeys.length} articles</span>
        </div>
        <p class="sn-cache-sub">
          IndexedDB + memory cache opens full ad-free articles in <code>0ms</code>.
        </p>
        <div class="sn-cache-actions">
          <button
            type="button"
            class="sn-mini-btn primary"
            disabled={cove.precacheRunning}
            onclick={() => cove.precacheTopDiscoverArticles(6)}
          >
            {cove.precacheRunning ? 'Caching…' : 'Cache Top 6'}
          </button>
          <button
            type="button"
            class="sn-mini-btn"
            onclick={() => cove.purgeDiscoverCache()}
            title="Clear IndexedDB news cache and resync"
          >
            Clear
          </button>
        </div>
      </div>
    </div>
  </aside>

  <!-- ========================================================================
       RIGHT MAIN CONTENT STAGE (FRAMED EDITORIAL STREAM)
       ======================================================================== -->
  <div class="disc-main">
    <!-- Clean Framed Section Header Bar -->
    <header class="dm-topbar">
      <div class="dm-heading">
        <h2>
          {activeChannelTitle}
          {#if !savedTabActive && cove.discoverActiveTopic === 'for-you'}
            <em class="serif-accent">edition</em>
          {/if}
        </h2>
        <span class="dm-meta">
          {#if filterQuery}
            Filtering <strong>{filteredStories.length}</strong> matches for “{filterQuery}”
          {:else if savedTabActive}
            {cove.readLater.length} articles stored offline for ad-free reading
          {:else}
            Verified RSS &amp; open APIs · Hover any card to pre-cache · Zero ads
          {/if}
        </span>
      </div>

      <div class="dm-controls">
        <label class="dm-search" aria-label="Filter stories">
          <Icon name="search" size={13} />
          <input
            type="text"
            bind:value={filterQuery}
            placeholder="Filter stories, sources, #tags…"
          />
          {#if filterQuery}
            <button
              type="button"
              class="dm-clear"
              onclick={() => (filterQuery = '')}
              aria-label="Clear filter"
            >
              <Icon name="x" size={11} />
            </button>
          {/if}
        </label>

        <button
          type="button"
          class="dm-pill"
          class:active={followOpen}
          onclick={() => {
            followOpen = !followOpen;
            if (followOpen) customizeOpen = false;
          }}
        >
          <Icon name="plus" size={12} />
          <span>Follow RSS</span>
        </button>

        <button
          type="button"
          class="dm-pill"
          class:active={customizeOpen}
          onclick={() => {
            customizeOpen = !customizeOpen;
            if (customizeOpen) followOpen = false;
          }}
        >
          <Icon name="sparkle" size={12} />
          <span>Interests</span>
        </button>

        <button
          type="button"
          class="dm-pill show-mobile-sn"
          disabled={cove.precacheRunning}
          onclick={() => cove.precacheTopDiscoverArticles(6)}
          title="Pre-cache top 6 articles offline"
        >
          <span>⚡ {cove.cachedArticleKeys.length}</span>
        </button>

        <button
          type="button"
          class="dm-pill"
          disabled={cove.discoverLoading}
          onclick={() => cove.refreshDiscover(true)}
          title="Refresh verified feeds"
        >
          <Icon name="refresh" size={12} />
          <span>{cove.discoverLoading ? 'Syncing…' : 'Refresh'}</span>
        </button>
      </div>
    </header>

    <!-- Inline Follow RSS Drawer -->
    {#if followOpen}
      <div class="dm-drawer">
        <form class="follow-form" onsubmit={submitCustomFeed}>
          <input
            type="text"
            bind:value={customFeedName}
            placeholder="Publication name (optional)"
            class="ff-input name"
          />
          <input
            type="url"
            bind:value={customFeedUrl}
            placeholder="https://example.com/feed.xml"
            required
            class="ff-input url"
          />
          <button type="submit" class="ff-submit">Follow Feed</button>
        </form>

        <div class="drawer-row">
          <span class="drawer-lbl">1-Click Verified Publications:</span>
          <div class="drawer-chips">
            {#each EXTRA_CURATED_FEEDS as ex (ex.url)}
              {@const added = cove.rssFeeds.some((f) => f.url === ex.url)}
              <button
                type="button"
                class="tune-chip"
                class:on={added}
                disabled={added}
                onclick={() => cove.followDiscoverFeed(ex.name, ex.url)}
              >
                {added ? '✓ ' : '+ '}{ex.name}
              </button>
            {/each}
          </div>
        </div>
      </div>
    {/if}

    <!-- Inline Interest Tuner Drawer -->
    {#if customizeOpen}
      <div class="dm-drawer">
        <div class="drawer-row">
          <span class="drawer-lbl">Pinned Channels in “For You”:</span>
          <div class="drawer-chips">
            {#each DISCOVER_TOPICS.filter((x) => x.id !== 'for-you') as ch (ch.id)}
              {@const active = cove.discoverProfile.selectedTopics.includes(ch.id as any)}
              <button
                type="button"
                class="tune-chip"
                class:on={active}
                onclick={() => cove.toggleDiscoverFavoriteTopic(ch.id as any)}
              >
                {active ? '✓ ' : '+ '}{ch.shortLabel}
              </button>
            {/each}
          </div>
        </div>
        {#if topLearnedKeywords.length > 0}
          <div class="drawer-row">
            <span class="drawer-lbl">Learned from Your Reads:</span>
            <div class="drawer-chips">
              {#each topLearnedKeywords as kw}
                <button
                  type="button"
                  class="sn-tag on"
                  onclick={() => (filterQuery = `#${kw}`)}
                >
                  #{kw}
                </button>
              {/each}
            </div>
          </div>
        {/if}
      </div>
    {/if}

    <!-- ======================================================================
         SAVED VAULT STREAM
         ====================================================================== -->
    {#if savedTabActive}
      {#if cove.readLater.length === 0}
        <div class="dm-empty">
          <p>Your offline vault is empty. Click “Save Offline” on any story to keep a clean ad-free copy here.</p>
          <button type="button" class="dm-pill active" onclick={() => (savedTabActive = false)}>
            Browse Live Stories
          </button>
        </div>
      {:else}
        <div class="dm-grid">
          {#each cove.readLater as item (item.id)}
            <!-- svelte-ignore a11y_click_events_have_key_events -->
            <!-- svelte-ignore a11y_no_noninteractive_element_interactions -->
            <article class="story-card" onclick={() => cove.openSavedInCoveNews(item)}>
              <div class="sc-banner">
                {#if item.image}
                  <img src={item.image} referrerpolicy="no-referrer" alt={item.title} loading="lazy" />
                {:else}
                  <div class="sc-fallback">
                    <BrandIcon url={item.url} title={item.domain} size={26} radius={7} />
                    <span>{item.siteName || item.domain}</span>
                  </div>
                {/if}
                <span class="sc-badge saved">Offline Ready ✓</span>
                <button
                  type="button"
                  class="sc-dismiss"
                  title="Remove from Saved Vault"
                  onclick={(e) => {
                    e.stopPropagation();
                    cove.removeReadLater(item.id);
                  }}
                >
                  <Icon name="x" size={12} />
                </button>
              </div>
              <div class="sc-body">
                <div class="sc-source">
                  <BrandIcon url={item.url} title={item.domain} size={14} radius={3} />
                  <strong>{item.siteName || item.domain}</strong>
                  <span>·</span>
                  <span>{fmtRel(item.addedAt)}</span>
                </div>
                <h3 class="sc-title">{item.title}</h3>
                <p class="sc-summary">{item.description || 'Saved full article ready for ad-free offline reading.'}</p>
                <footer class="sc-foot">
                  <span class="sc-reason">{item.readingTimeMin || 4} min read</span>
                  <span class="sc-read">Open Reader →</span>
                </footer>
              </div>
            </article>
          {/each}
        </div>
      {/if}

    <!-- ======================================================================
         LOADING SKELETON
         ====================================================================== -->
    {:else if cove.discoverLoading && filteredStories.length === 0}
      <div class="dm-skeleton">
        <div class="sk-lead">
          <div class="sk-block hero"></div>
          <div class="sk-side">
            <div class="sk-block brief"></div>
            <div class="sk-block brief"></div>
          </div>
        </div>
        <div class="dm-grid">
          <div class="sk-block card"></div>
          <div class="sk-block card"></div>
          <div class="sk-block card"></div>
        </div>
      </div>

    <!-- ======================================================================
         FRAMED FEATURED LEAD + PERSONALIZED STORY CARDS
         ====================================================================== -->
    {:else if heroStory}
      <div class="dm-lead-row">
        <!-- svelte-ignore a11y_click_events_have_key_events -->
        <!-- svelte-ignore a11y_no_noninteractive_element_interactions -->
        <article
          class="lead-hero-card"
          onmouseenter={() => scheduleHoverPrefetch(heroStory)}
          onmouseleave={cancelHoverPrefetch}
          onclick={() => cove.openDiscoverBrief(heroStory)}
        >
          {#if resolveBannerSrc(heroStory.id, heroStory.bannerUrl)}
            <img
              src={resolveBannerSrc(heroStory.id, heroStory.bannerUrl)}
              referrerpolicy="no-referrer"
              alt={heroStory.title}
              class="lh-img"
              onerror={() => handleImgError(heroStory.id)}
            />
          {:else}
            <div class="lh-fallback">
              <span>{heroStory.publisher}</span>
            </div>
          {/if}
          <div class="lh-scrim"></div>

          <div class="lh-content">
            <div class="lh-meta">
              <span class="lh-pub">
                <BrandIcon url={heroStory.url} title={heroStory.publisher} size={14} radius={4} />
                <strong>{heroStory.publisher}</strong>
                {#if heroStory.verified}<i class="v-check">✓</i>{/if}
              </span>
              {#if cove.isStoryCached(heroStory.url)}
                <span class="lh-tag">⚡ Instant Cached</span>
              {:else if heroStory.reasonTag}
                <span class="lh-tag">{heroStory.reasonTag}</span>
              {/if}
              <span class="lh-time">
                {fmtRel(heroStory.publishedAt)} · {heroStory.readingTimeMin}m read
              </span>
            </div>

            <h3 class="lh-title">{heroStory.title}</h3>
            <p class="lh-summary">{heroStory.summary}</p>

            <div class="lh-actions">
              <button
                type="button"
                class="lh-btn-light"
                onclick={(e) => {
                  e.stopPropagation();
                  cove.openDiscoverBrief(heroStory);
                }}
              >
                Brief
              </button>
              <button
                type="button"
                class="lh-btn-primary"
                onclick={(e) => {
                  e.stopPropagation();
                  cove.openFullCoveNews(heroStory);
                }}
              >
                <Icon name="newspaper" size={13} />
                <span>Read Article</span>
              </button>
            </div>
          </div>
        </article>

        {#if sideBriefStories.length > 0}
          <div class="lead-brief-col">
            {#each sideBriefStories as sb (sb.id)}
              <!-- svelte-ignore a11y_click_events_have_key_events -->
              <!-- svelte-ignore a11y_no_noninteractive_element_interactions -->
              <article
                class="brief-row-card"
                onmouseenter={() => scheduleHoverPrefetch(sb)}
                onmouseleave={cancelHoverPrefetch}
                onclick={() => cove.openDiscoverBrief(sb)}
              >
                {#if resolveBannerSrc(sb.id, sb.bannerUrl)}
                  <div class="br-thumb">
                    <img
                      src={resolveBannerSrc(sb.id, sb.bannerUrl)}
                      referrerpolicy="no-referrer"
                      alt={sb.title}
                      loading="lazy"
                      onerror={() => handleImgError(sb.id)}
                    />
                  </div>
                {/if}
                <div class="br-body">
                  <div class="sc-source">
                    <BrandIcon url={sb.url} title={sb.publisher} size={13} radius={3} />
                    <strong>{sb.publisher}</strong>
                    {#if sb.verified}<i class="v-check">✓</i>{/if}
                    <span>·</span>
                    <span>{fmtRel(sb.publishedAt)}</span>
                    {#if cove.isStoryCached(sb.url)}
                      <span class="cached-bolt" title="Cached in IndexedDB">⚡</span>
                    {/if}
                  </div>
                  <h4 class="br-title">{sb.title}</h4>
                  <p class="br-excerpt">{sb.summary}</p>
                  <div class="br-foot">
                    <span class="sc-reason">{sb.reasonTag || `${sb.readingTimeMin} min read`}</span>
                    <button
                      type="button"
                      class="sc-read"
                      onclick={(e) => {
                        e.stopPropagation();
                        cove.openFullCoveNews(sb);
                      }}
                    >
                      Read →
                    </button>
                  </div>
                </div>
              </article>
            {/each}
          </div>
        {/if}
      </div>

      <!-- Story Cards Grid -->
      <div class="dm-grid">
        {#each gridStories as story (story.id)}
          <!-- svelte-ignore a11y_click_events_have_key_events -->
          <!-- svelte-ignore a11y_no_noninteractive_element_interactions -->
          <article
            class="story-card"
            onmouseenter={() => scheduleHoverPrefetch(story)}
            onmouseleave={cancelHoverPrefetch}
            onclick={() => cove.openDiscoverBrief(story)}
          >
            <div class="sc-banner">
              {#if resolveBannerSrc(story.id, story.bannerUrl)}
                <img
                  src={resolveBannerSrc(story.id, story.bannerUrl)}
                  referrerpolicy="no-referrer"
                  alt={story.title}
                  loading="lazy"
                  onerror={() => handleImgError(story.id)}
                />
              {:else}
                <div class="sc-fallback">
                  <BrandIcon url={story.url} title={story.publisher} size={26} radius={7} />
                  <span>{story.publisher}</span>
                </div>
              {/if}

              <span class="sc-topic">
                {DISCOVER_TOPICS.find((t) => t.id === story.topic)?.shortLabel || story.topic}
              </span>

              {#if savedUrlSet.has(story.url)}
                <span class="sc-badge saved">Saved ✓</span>
              {:else if cove.isStoryCached(story.url)}
                <span class="sc-badge cached">⚡ Instant</span>
              {/if}

              <button
                type="button"
                class="sc-dismiss"
                title="Show fewer stories like this"
                aria-label="Show fewer stories like this"
                onclick={(e) => {
                  e.stopPropagation();
                  cove.giveDiscoverFeedback(story, 'less');
                }}
              >
                <Icon name="x" size={12} />
              </button>
            </div>

            <div class="sc-body">
              <div class="sc-source">
                <BrandIcon url={story.url} title={story.publisher} size={14} radius={3} />
                <strong>{story.publisher}</strong>
                {#if story.verified}<i class="v-check" title="Verified Source">✓</i>{/if}
                <span>·</span>
                <span>{fmtRel(story.publishedAt)}</span>
              </div>

              <h3 class="sc-title">{story.title}</h3>
              <p class="sc-summary">{story.summary}</p>

              <footer class="sc-foot">
                <span class="sc-reason">{story.reasonTag || `${story.readingTimeMin} min read`}</span>
                <button
                  type="button"
                  class="sc-read"
                  onclick={(e) => {
                    e.stopPropagation();
                    cove.openFullCoveNews(story);
                  }}
                >
                  Read · {story.readingTimeMin}m →
                </button>
              </footer>
            </div>
          </article>
        {/each}
      </div>

      {#if visibleCount < allRemainingStories.length}
        <div class="dm-more">
          <button
            type="button"
            class="dm-more-btn"
            onclick={() => (visibleCount += 12)}
          >
            <span>Show More Stories</span>
            <small>({allRemainingStories.length - visibleCount} remaining)</small>
          </button>
        </div>
      {/if}

    {:else}
      <div class="dm-empty">
        <p>{filterQuery ? `No stories matched “${filterQuery}”.` : 'Connecting to verified feeds…'}</p>
        <button
          type="button"
          class="dm-pill active"
          onclick={() => {
            if (filterQuery) filterQuery = '';
            else cove.refreshDiscover(true);
          }}
        >
          {filterQuery ? 'Clear Filter' : 'Retry Sync'}
        </button>
      </div>
    {/if}
  </div>
</section>

<style>
  /* ==========================================================================
     TWO-PANE FRAMED WORKSPACE SECTION (SIDE NAV + EDITORIAL STREAM)
     ========================================================================== */
  .discover-section {
    width: 100%;
    max-width: 1360px;
    margin: 4px auto 0;
    padding: 0 var(--stage-pad-right) 36px var(--stage-pad-left);
    display: grid;
    grid-template-columns: 224px minmax(0, 1fr);
    gap: 18px;
    align-items: start;
  }

  /* Left Sticky Side Navigation Panel */
  .disc-sidenav {
    position: sticky;
    top: 68px;
    z-index: 25;
  }

  .sn-card {
    border-radius: var(--r-card);
    background: var(--surface-card);
    backdrop-filter: var(--glass-blur);
    -webkit-backdrop-filter: var(--glass-blur);
    border: 1px solid var(--border-subtle);
    box-shadow: var(--shadow-card);
    padding: 14px;
    display: flex;
    flex-direction: column;
    gap: 12px;
  }

  .sn-head {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 2px 4px 4px;
  }

  .sn-brand {
    display: inline-flex;
    align-items: center;
    gap: 7px;
    font-family: var(--font-display);
    font-size: 14px;
    font-weight: 760;
    letter-spacing: -0.02em;
    color: var(--text-primary);
  }

  .sn-live-pill {
    display: inline-flex;
    align-items: center;
    gap: 5px;
    padding: 2px 8px;
    border-radius: var(--r-pill);
    background: var(--surface-row);
    font-family: var(--font-mono);
    font-size: 10px;
    color: var(--text-secondary);
  }

  .pulse-dot {
    width: 6px;
    height: 6px;
    border-radius: 50%;
    background: var(--status-ok);
    box-shadow: 0 0 7px var(--status-ok);
  }
  .pulse-dot.syncing {
    background: var(--accent);
    box-shadow: 0 0 8px var(--accent);
  }

  .sn-channels {
    display: flex;
    flex-direction: column;
    gap: 3px;
  }

  .sn-nav-item {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 8px;
    width: 100%;
    padding: 8px 10px;
    border-radius: 12px;
    font-family: var(--font-display);
    font-size: 12.5px;
    font-weight: 600;
    color: var(--text-secondary);
    text-align: left;
    transition: all 150ms ease;
  }
  .sn-nav-item:hover {
    background: var(--surface-hover);
    color: var(--text-primary);
  }
  .sn-nav-item.active {
    background: linear-gradient(180deg, #3b82f6 0%, #1d5bff 100%);
    color: #ffffff;
    box-shadow: 0 6px 16px -4px rgba(29, 91, 255, 0.45);
  }

  .sn-item-label {
    display: inline-flex;
    align-items: center;
    gap: 7px;
    min-width: 0;
    white-space: nowrap;
  }

  .sn-count {
    font-family: var(--font-mono);
    font-size: 10px;
    font-weight: 650;
    padding: 1px 6px;
    border-radius: var(--r-pill);
    background: var(--surface-row);
    color: var(--text-muted);
  }
  .sn-nav-item.active .sn-count {
    background: rgba(255, 255, 255, 0.22);
    color: #ffffff;
  }

  .sn-divider {
    height: 1px;
    background: var(--border-subtle);
    margin: 4px 2px;
  }

  .sn-block {
    padding-top: 10px;
    border-top: 1px solid var(--border-subtle);
    display: flex;
    flex-direction: column;
    gap: 7px;
  }

  .sn-kicker {
    font-family: var(--font-mono);
    font-size: 10px;
    font-weight: 700;
    text-transform: uppercase;
    letter-spacing: 0.07em;
    color: var(--text-muted);
  }

  .sn-tags {
    display: flex;
    flex-wrap: wrap;
    gap: 5px;
  }

  .sn-tag {
    padding: 3px 8px;
    border-radius: var(--r-pill);
    background: var(--surface-row);
    border: 1px solid var(--border-subtle);
    font-family: var(--font-mono);
    font-size: 10.5px;
    font-weight: 600;
    color: var(--text-secondary);
    transition: all 140ms ease;
  }
  .sn-tag:hover,
  .sn-tag.on {
    background: var(--accent-soft);
    border-color: var(--accent);
    color: var(--accent-text);
  }

  .sn-cache-box {
    padding: 10px 11px;
    border-radius: 14px;
    background: var(--surface-subtle);
    border: 1px solid var(--border-subtle);
    display: flex;
    flex-direction: column;
    gap: 6px;
  }
  .sn-cache-top {
    display: flex;
    align-items: center;
    justify-content: space-between;
  }
  .sn-cache-stat {
    font-family: var(--font-mono);
    font-size: 10.5px;
    font-weight: 700;
    color: var(--accent-text);
  }
  .sn-cache-sub {
    margin: 0;
    font-size: 11px;
    line-height: 1.42;
    color: var(--text-muted);
  }
  .sn-cache-actions {
    display: flex;
    gap: 6px;
    margin-top: 2px;
  }
  .sn-mini-btn {
    flex: 1;
    padding: 5px 8px;
    border-radius: 9px;
    background: var(--surface-row);
    border: 1px solid var(--border-subtle);
    font-family: var(--font-display);
    font-size: 11px;
    font-weight: 650;
    color: var(--text-secondary);
    text-align: center;
  }
  .sn-mini-btn.primary {
    background: var(--accent-soft);
    border-color: color-mix(in oklch, var(--accent) 45%, transparent);
    color: var(--accent-text);
  }
  .sn-mini-btn:hover:not(:disabled) {
    color: var(--text-primary);
    border-color: var(--accent);
  }

  /* ==========================================================================
     RIGHT MAIN EDITORIAL STAGE
     ========================================================================== */
  .disc-main {
    min-width: 0;
    display: flex;
    flex-direction: column;
    gap: 16px;
  }

  .dm-topbar {
    border-radius: var(--r-card);
    background: var(--surface-card);
    backdrop-filter: var(--glass-blur);
    -webkit-backdrop-filter: var(--glass-blur);
    border: 1px solid var(--border-subtle);
    box-shadow: var(--shadow-card);
    padding: 15px 20px;
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 14px;
    flex-wrap: wrap;
  }

  .dm-heading {
    display: flex;
    flex-direction: column;
    gap: 2px;
  }

  .dm-heading h2 {
    margin: 0;
    font-family: var(--font-display);
    font-size: 1.38rem;
    font-weight: 800;
    letter-spacing: -0.032em;
    line-height: 1.15;
    color: var(--text-primary);
  }

  .serif-accent {
    font-family: var(--font-editorial, 'Instrument Serif', Georgia, serif);
    font-weight: 400;
    font-style: italic;
    letter-spacing: -0.01em;
    color: var(--accent-text);
    margin-left: 3px;
  }

  .dm-meta {
    font-size: 12px;
    color: var(--text-muted);
  }

  .dm-controls {
    display: flex;
    align-items: center;
    gap: 7px;
    flex-wrap: wrap;
  }

  .dm-search {
    display: inline-flex;
    align-items: center;
    gap: 7px;
    padding: 6px 12px;
    border-radius: var(--r-pill);
    background: var(--surface-input);
    border: 1px solid var(--border-subtle);
    color: var(--text-muted);
  }
  .dm-search:focus-within {
    border-color: var(--accent);
    box-shadow: 0 0 0 3px var(--accent-soft);
    color: var(--text-primary);
  }
  .dm-search input {
    width: 175px;
    border: 0;
    outline: none;
    background: transparent;
    color: var(--text-primary);
    font-size: 12.5px;
  }
  .dm-search input::placeholder {
    color: var(--text-muted);
  }
  .dm-clear {
    display: grid;
    place-items: center;
    color: var(--text-muted);
  }

  .dm-pill {
    display: inline-flex;
    align-items: center;
    gap: 5px;
    padding: 6px 12px;
    border-radius: var(--r-pill);
    background: var(--surface-row);
    border: 1px solid var(--border-subtle);
    font-family: var(--font-display);
    font-size: 12px;
    font-weight: 640;
    color: var(--text-secondary);
    transition: all 150ms ease;
  }
  .dm-pill:hover,
  .dm-pill.active {
    background: var(--accent-soft);
    border-color: var(--accent);
    color: var(--accent-text);
  }

  .show-mobile-sn {
    display: none;
  }

  /* Inline Drawers */
  .dm-drawer {
    border-radius: var(--r-card);
    background: var(--surface-card);
    backdrop-filter: var(--glass-blur);
    border: 1px solid var(--border-strong);
    box-shadow: var(--shadow-card);
    padding: 14px 18px;
    display: flex;
    flex-direction: column;
    gap: 10px;
  }
  .follow-form {
    display: flex;
    align-items: center;
    gap: 8px;
    flex-wrap: wrap;
  }
  .ff-input {
    padding: 7px 12px;
    border-radius: 10px;
    border: 1px solid var(--border-subtle);
    background: var(--surface-input);
    color: var(--text-primary);
    font-size: 12.5px;
    outline: none;
  }
  .ff-input.name { width: 180px; }
  .ff-input.url { flex: 1; min-width: 220px; }
  .ff-submit {
    padding: 7px 15px;
    border-radius: var(--r-pill);
    background: linear-gradient(180deg, #3b82f6 0%, #1d5bff 100%);
    color: #ffffff;
    font-family: var(--font-display);
    font-size: 12px;
    font-weight: 660;
  }
  .drawer-row {
    display: flex;
    align-items: center;
    gap: 8px;
    flex-wrap: wrap;
  }
  .drawer-lbl {
    font-size: 11.5px;
    font-weight: 650;
    color: var(--text-muted);
  }
  .drawer-chips {
    display: flex;
    flex-wrap: wrap;
    gap: 6px;
  }
  .tune-chip {
    padding: 4px 11px;
    border-radius: var(--r-pill);
    background: var(--surface-row);
    border: 1px solid var(--border-subtle);
    font-size: 11.5px;
    font-weight: 600;
    color: var(--text-secondary);
  }
  .tune-chip.on,
  .tune-chip:hover {
    background: var(--accent-soft);
    border-color: var(--accent);
    color: var(--accent-text);
  }

  /* Framed Lead Feature + Side Pair */
  .dm-lead-row {
    display: grid;
    grid-template-columns: minmax(0, 1.45fr) minmax(0, 1fr);
    gap: 16px;
    align-items: stretch;
  }

  .lead-hero-card {
    position: relative;
    min-height: 332px;
    border-radius: var(--r-card);
    overflow: hidden;
    border: 1px solid var(--border-subtle);
    box-shadow: var(--shadow-card);
    cursor: pointer;
    display: flex;
    align-items: flex-end;
    background: #0b1326;
    transition: transform 200ms ease, border-color 180ms ease;
  }
  .lead-hero-card:hover {
    transform: translateY(-2px);
    border-color: var(--border-strong);
  }

  .lh-img {
    position: absolute;
    inset: 0;
    width: 100%;
    height: 100%;
    object-fit: cover;
    transition: transform 500ms var(--ease-calm);
  }
  .lead-hero-card:hover .lh-img {
    transform: scale(1.03);
  }

  .lh-fallback {
    position: absolute;
    inset: 0;
    display: grid;
    place-items: center;
    background: radial-gradient(circle at 25% 25%, rgba(59, 130, 246, 0.38), transparent 60%), #091022;
    font-family: var(--font-display);
    font-size: 2.4rem;
    font-weight: 800;
    color: rgba(255, 255, 255, 0.14);
  }

  .lh-scrim {
    position: absolute;
    inset: 0;
    background: linear-gradient(180deg, rgba(6, 10, 20, 0.08) 0%, rgba(6, 10, 20, 0.58) 46%, rgba(6, 10, 20, 0.94) 100%);
  }

  .lh-content {
    position: relative;
    z-index: 2;
    width: 100%;
    padding: 22px 24px;
    display: flex;
    flex-direction: column;
    gap: 8px;
    color: #f8fafc;
  }

  .lh-meta {
    display: flex;
    align-items: center;
    gap: 8px;
    flex-wrap: wrap;
    font-size: 11.5px;
  }

  .lh-pub {
    display: inline-flex;
    align-items: center;
    gap: 5px;
    padding: 3px 9px;
    border-radius: var(--r-pill);
    background: rgba(255, 255, 255, 0.16);
    backdrop-filter: blur(8px);
    color: #ffffff;
  }

  .v-check {
    font-style: normal;
    color: var(--status-ok);
    font-weight: 700;
  }

  .lh-tag {
    padding: 2px 9px;
    border-radius: var(--r-pill);
    background: rgba(37, 99, 235, 0.44);
    border: 1px solid rgba(96, 165, 250, 0.55);
    color: #dbeafe;
    font-family: var(--font-mono);
    font-size: 10.5px;
  }

  .lh-time {
    color: rgba(241, 245, 249, 0.78);
    font-family: var(--font-mono);
    font-size: 11px;
  }

  .lh-title {
    margin: 0;
    font-family: var(--font-display);
    font-size: clamp(1.24rem, 1.9vw, 1.62rem);
    font-weight: 800;
    line-height: 1.18;
    letter-spacing: -0.03em;
    color: #ffffff;
  }

  .lh-summary {
    margin: 0;
    font-size: 13px;
    line-height: 1.5;
    color: rgba(241, 245, 249, 0.88);
    display: -webkit-box;
    -webkit-line-clamp: 2;
    -webkit-box-orient: vertical;
    overflow: hidden;
  }

  .lh-actions {
    margin-top: 4px;
    display: flex;
    align-items: center;
    gap: 8px;
    flex-wrap: wrap;
  }

  .lh-btn-light {
    padding: 7px 15px;
    border-radius: var(--r-pill);
    background: #ffffff;
    color: #0b1221;
    font-family: var(--font-display);
    font-size: 12px;
    font-weight: 700;
  }

  .lh-btn-primary {
    display: inline-flex;
    align-items: center;
    gap: 6px;
    padding: 7px 15px;
    border-radius: var(--r-pill);
    background: linear-gradient(180deg, #3b82f6 0%, #1d5bff 100%);
    color: #ffffff;
    font-family: var(--font-display);
    font-size: 12px;
    font-weight: 680;
    box-shadow: 0 8px 20px -4px rgba(29, 91, 255, 0.5);
  }

  /* Right 2-Story Briefing Column */
  .lead-brief-col {
    display: flex;
    flex-direction: column;
    gap: 12px;
  }

  .brief-row-card {
    flex: 1;
    border-radius: var(--r-card);
    background: var(--surface-card);
    backdrop-filter: var(--glass-blur);
    border: 1px solid var(--border-subtle);
    box-shadow: var(--shadow-card);
    padding: 13px 14px;
    display: flex;
    gap: 12px;
    cursor: pointer;
    transition: all 180ms ease;
  }
  .brief-row-card:hover {
    border-color: var(--border-strong);
    transform: translateY(-2px);
  }

  .br-thumb {
    width: 82px;
    height: 82px;
    border-radius: 12px;
    overflow: hidden;
    flex-shrink: 0;
    background: var(--surface-row);
  }
  .br-thumb img {
    width: 100%;
    height: 100%;
    object-fit: cover;
  }

  .br-body {
    flex: 1;
    min-width: 0;
    display: flex;
    flex-direction: column;
    gap: 4px;
  }
  .cached-bolt {
    color: var(--accent-text);
    font-size: 11px;
  }
  .br-title {
    margin: 0;
    font-family: var(--font-display);
    font-size: 0.94rem;
    font-weight: 700;
    line-height: 1.28;
    letter-spacing: -0.02em;
    color: var(--text-primary);
    display: -webkit-box;
    -webkit-line-clamp: 2;
    -webkit-box-orient: vertical;
    overflow: hidden;
  }
  .br-excerpt {
    margin: 0;
    font-size: 11.8px;
    line-height: 1.42;
    color: var(--text-secondary);
    display: -webkit-box;
    -webkit-line-clamp: 2;
    -webkit-box-orient: vertical;
    overflow: hidden;
  }
  .br-foot {
    margin-top: auto;
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 8px;
  }

  /* Story Cards Grid */
  .dm-grid {
    display: grid;
    grid-template-columns: repeat(3, minmax(0, 1fr));
    gap: 16px;
  }

  .story-card {
    border-radius: var(--r-card);
    background: var(--surface-card);
    backdrop-filter: var(--glass-blur);
    border: 1px solid var(--border-subtle);
    box-shadow: var(--shadow-card);
    overflow: hidden;
    display: flex;
    flex-direction: column;
    cursor: pointer;
    transition: transform 200ms ease, border-color 180ms ease;
  }
  .story-card:hover {
    transform: translateY(-3px);
    border-color: var(--border-strong);
  }

  .sc-banner {
    position: relative;
    aspect-ratio: 16 / 9;
    width: 100%;
    overflow: hidden;
    background: var(--surface-row);
  }
  .sc-banner img {
    width: 100%;
    height: 100%;
    object-fit: cover;
    transition: transform 400ms var(--ease-calm);
  }
  .story-card:hover .sc-banner img {
    transform: scale(1.045);
  }

  .sc-fallback {
    width: 100%;
    height: 100%;
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    gap: 7px;
    background: radial-gradient(circle at 30% 25%, var(--accent-soft), transparent 65%), var(--surface-subtle);
    font-family: var(--font-display);
    font-size: 12.5px;
    font-weight: 700;
    color: var(--text-secondary);
  }

  .sc-topic {
    position: absolute;
    left: 10px;
    bottom: 10px;
    padding: 2px 9px;
    border-radius: var(--r-pill);
    background: rgba(9, 14, 28, 0.82);
    backdrop-filter: blur(8px);
    color: #ffffff;
    font-family: var(--font-mono);
    font-size: 10px;
    font-weight: 600;
  }

  .sc-badge {
    position: absolute;
    left: 10px;
    top: 10px;
    padding: 2px 8px;
    border-radius: var(--r-pill);
    color: #ffffff;
    font-family: var(--font-mono);
    font-size: 10px;
    font-weight: 700;
  }
  .sc-badge.saved {
    background: #059669;
  }
  .sc-badge.cached {
    background: rgba(37, 99, 235, 0.9);
    backdrop-filter: blur(6px);
  }

  .sc-dismiss {
    position: absolute;
    top: 9px;
    right: 9px;
    width: 24px;
    height: 24px;
    border-radius: 50%;
    display: grid;
    place-items: center;
    background: rgba(10, 14, 24, 0.7);
    color: #ffffff;
    opacity: 0;
    transition: opacity 140ms ease;
  }
  .story-card:hover .sc-dismiss {
    opacity: 1;
  }
  .sc-dismiss:hover {
    background: var(--status-danger);
  }

  .sc-body {
    padding: 15px 17px;
    display: flex;
    flex-direction: column;
    gap: 7px;
    flex: 1;
  }

  .sc-source {
    display: flex;
    align-items: center;
    gap: 6px;
    font-size: 11px;
    color: var(--text-muted);
  }
  .sc-source strong {
    color: var(--text-secondary);
    font-weight: 650;
  }

  .sc-title {
    margin: 0;
    font-family: var(--font-display);
    font-size: 0.99rem;
    font-weight: 700;
    line-height: 1.32;
    letter-spacing: -0.02em;
    color: var(--text-primary);
    display: -webkit-box;
    -webkit-line-clamp: 2;
    -webkit-box-orient: vertical;
    overflow: hidden;
  }
  .story-card:hover .sc-title {
    color: var(--accent-text);
  }

  .sc-summary {
    margin: 0;
    font-size: 12.4px;
    line-height: 1.5;
    color: var(--text-secondary);
    display: -webkit-box;
    -webkit-line-clamp: 2;
    -webkit-box-orient: vertical;
    overflow: hidden;
  }

  .sc-foot {
    margin-top: auto;
    padding-top: 8px;
    border-top: 1px solid var(--border-subtle);
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 8px;
  }

  .sc-reason {
    font-family: var(--font-mono);
    font-size: 10px;
    font-weight: 600;
    color: var(--accent-text);
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
  }

  .sc-read {
    font-family: var(--font-display);
    font-size: 11.5px;
    font-weight: 700;
    color: var(--text-primary);
    flex-shrink: 0;
  }
  .sc-read:hover {
    color: var(--accent-text);
  }

  .dm-more {
    display: flex;
    justify-content: center;
    padding-top: 4px;
  }
  .dm-more-btn {
    display: inline-flex;
    align-items: center;
    gap: 8px;
    padding: 10px 22px;
    border-radius: var(--r-pill);
    background: var(--surface-card);
    border: 1px solid var(--border-strong);
    box-shadow: var(--shadow-card);
    font-family: var(--font-display);
    font-size: 12.5px;
    font-weight: 700;
    transition: all 170ms ease;
  }
  .dm-more-btn:hover {
    background: linear-gradient(180deg, #3b82f6 0%, #1d5bff 100%);
    color: #ffffff;
    transform: translateY(-2px);
  }
  .dm-more-btn small {
    font-family: var(--font-mono);
    opacity: 0.78;
  }

  .dm-empty {
    padding: 36px 24px;
    border-radius: var(--r-card);
    background: var(--surface-card);
    border: 1px solid var(--border-subtle);
    display: flex;
    flex-direction: column;
    align-items: center;
    text-align: center;
    gap: 12px;
    color: var(--text-secondary);
  }

  /* Skeletons */
  .dm-skeleton {
    display: flex;
    flex-direction: column;
    gap: 16px;
  }
  .sk-lead {
    display: grid;
    grid-template-columns: 1.45fr 1fr;
    gap: 16px;
  }
  .sk-side {
    display: flex;
    flex-direction: column;
    gap: 12px;
  }
  .sk-block {
    border-radius: var(--r-card);
    background: var(--surface-card);
    animation: discSk 1.5s ease-in-out infinite;
  }
  .sk-block.hero { height: 332px; }
  .sk-block.brief { flex: 1; min-height: 150px; }
  .sk-block.card { height: 245px; }

  @keyframes discSk {
    0%, 100% { opacity: 0.5; }
    50% { opacity: 0.88; }
  }

  /* ==========================================================================
     RESPONSIVE BREAKPOINTS (1340px → 1060px → 720px → 480px)
     ========================================================================== */
  @media (max-width: 1340px) {
    .dm-grid {
      grid-template-columns: repeat(2, minmax(0, 1fr));
    }
  }

  @media (max-width: 1120px) {
    .dm-lead-row,
    .sk-lead {
      grid-template-columns: 1fr;
    }
  }

  @media (max-width: 980px) {
    .discover-section {
      grid-template-columns: 1fr;
      gap: 12px;
    }
    .disc-sidenav {
      position: static;
    }
    .sn-card {
      padding: 10px 12px;
      gap: 8px;
    }
    .sn-channels {
      flex-direction: row;
      overflow-x: auto;
      scrollbar-width: none;
      gap: 6px;
    }
    .sn-channels::-webkit-scrollbar {
      display: none;
    }
    .sn-nav-item {
      width: auto;
      padding: 6px 12px;
      border-radius: var(--r-pill);
      flex-shrink: 0;
    }
    .sn-divider,
    .hide-mobile-sn {
      display: none;
    }
    .show-mobile-sn {
      display: inline-flex;
    }
  }

  @media (max-width: 680px) {
    .dm-topbar {
      padding: 14px;
    }
    .dm-controls,
    .dm-search {
      width: 100%;
    }
    .dm-search input {
      width: 100%;
    }
    .dm-grid {
      grid-template-columns: 1fr;
    }
    .lead-hero-card {
      min-height: 290px;
    }
    .lh-content {
      padding: 18px;
    }
  }

  @media (max-width: 460px) {
    .brief-row-card {
      flex-direction: column;
    }
    .br-thumb {
      width: 100%;
      height: 135px;
    }
    .ff-input.name,
    .ff-input.url {
      width: 100%;
      min-width: 0;
    }
  }
</style>
