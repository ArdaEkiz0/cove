<script lang="ts">
  import { cove } from '../../lib/state.svelte';
  import BrandIcon from './BrandIcon.svelte';
  import Icon from './Icon.svelte';
  import SafeHtml from './SafeHtml.svelte';

  let fontMode = $state<'serif' | 'sans'>('serif');
  let fontScale = $state<'sm' | 'md' | 'lg'>('md');
  let paperTone = $state<'glass' | 'paper' | 'night'>('glass');
  let scrollProgress = $state(0);
  let boostedIds = $state<Record<string, boolean>>({});
  let copiedLink = $state(false);

  const story = $derived(cove.activeDiscoverStory);
  const article = $derived(cove.coveNewsArticle);

  const currentIndex = $derived.by(() => {
    if (!story) return -1;
    return cove.rankedDiscoverStories.findIndex((s) => s.id === story.id);
  });

  const prevStory = $derived(
    currentIndex > 0 ? cove.rankedDiscoverStories[currentIndex - 1] : null
  );
  const nextStory = $derived(
    currentIndex >= 0 && currentIndex < cove.rankedDiscoverStories.length - 1
      ? cove.rankedDiscoverStories[currentIndex + 1]
      : null
  );

  const isSavedOffline = $derived.by(() => {
    if (!story) return false;
    return cove.readLater.some((r) => r.url === story.url);
  });

  const minutesRemaining = $derived.by(() => {
    const total = article?.readingTimeMin || story?.readingTimeMin || 4;
    if (scrollProgress >= 95) return 0;
    return Math.max(1, Math.ceil(total * (1 - scrollProgress / 100)));
  });

  const relatedStories = $derived.by(() => {
    if (!story) return [];
    return cove.rankedDiscoverStories
      .filter((s) => s.id !== story.id && s.topic === story.topic)
      .slice(0, 3);
  });

  function jumpStory(target: typeof prevStory) {
    if (!target) return;
    scrollProgress = 0;
    if (cove.coveNewsMode === 'article') {
      cove.openFullCoveNews(target);
    } else {
      cove.openDiscoverBrief(target);
    }
  }

  function handleArticleScroll(e: Event) {
    const el = e.currentTarget as HTMLElement;
    const max = Math.max(1, el.scrollHeight - el.clientHeight);
    scrollProgress = Math.min(100, Math.round((el.scrollTop / max) * 100));
  }

  function copyCleanUrl() {
    if (!story) return;
    navigator.clipboard?.writeText(story.url);
    copiedLink = true;
    setTimeout(() => (copiedLink = false), 2000);
    cove.notify('Copied story link');
  }

  function fmtDate(ts?: number): string {
    if (!ts) return '';
    return new Date(ts).toLocaleString(undefined, {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  }
</script>

{#if story}
  <!-- svelte-ignore a11y_click_events_have_key_events -->
  <!-- svelte-ignore a11y_no_static_element_interactions -->
  <div class="cove-news-backdrop" onclick={() => cove.closeCoveNews()}>
    {#if cove.coveNewsMode === 'brief'}
      <!-- ====================================================================
           STAGE 1: NEWS BRIEF POPUP (Instant Summary, Banner & Controls)
           ==================================================================== -->
      <div
        class="brief-popup"
        role="dialog"
        aria-modal="true"
        tabindex="-1"
        aria-label={story.title}
        onclick={(e) => e.stopPropagation()}
      >
        <div class="bp-banner">
          {#if story.bannerUrl}
            <img src={story.bannerUrl} referrerpolicy="no-referrer" alt={story.title} />
          {:else}
            <div class="bp-banner-fallback">
              <span>{story.publisher}</span>
            </div>
          {/if}
          <div class="bp-banner-scrim"></div>

          <div class="bp-top-controls">
            <div class="bp-nav-arrows">
              <button
                type="button"
                class="bp-round-btn"
                disabled={!prevStory}
                onclick={() => jumpStory(prevStory)}
                title="Previous story"
                aria-label="Previous story"
              >
                ←
              </button>
              <button
                type="button"
                class="bp-round-btn"
                disabled={!nextStory}
                onclick={() => jumpStory(nextStory)}
                title="Next story"
                aria-label="Next story"
              >
                →
              </button>
            </div>

            <button
              type="button"
              class="bp-round-btn"
              onclick={() => cove.closeCoveNews()}
              aria-label="Close popup"
            >
              <Icon name="x" size={15} />
            </button>
          </div>

          <div class="bp-source-badge">
            <BrandIcon url={story.url} title={story.publisher} size={16} radius={4} />
            <strong>{story.publisher}</strong>
            <span class="v-dot">✓ Verified</span>
          </div>
        </div>

        <div class="bp-body">
          <div class="bp-meta">
            <span>{fmtDate(story.publishedAt)}</span>
            <span>·</span>
            <span>{story.readingTimeMin} min read</span>
            {#if cove.isStoryCached(story.url)}
              <span>·</span>
              <span class="bp-reason">⚡ Cached for Instant Read</span>
            {:else if story.reasonTag}
              <span>·</span>
              <span class="bp-reason">{story.reasonTag}</span>
            {/if}
          </div>

          <h2 class="bp-title">{story.title}</h2>

          <div class="bp-summary-box">
            <span class="bp-kicker">Executive Story Brief</span>
            <p>{story.summary}</p>
            {#if story.highlights && story.highlights.length > 0}
              <ul class="bp-highlights">
                {#each story.highlights as hl}
                  <li>{hl}</li>
                {/each}
              </ul>
            {/if}
          </div>

          <!-- Auto-Learning Recommendation Controls -->
          <div class="bp-feedback-row">
            <div class="bp-fb-left">
              <button
                type="button"
                class="fb-chip"
                class:active={boostedIds[story.id]}
                onclick={() => {
                  boostedIds = { ...boostedIds, [story.id]: true };
                  cove.giveDiscoverFeedback(story, 'boost');
                }}
              >
                <Icon name="sparkle" size={12} />
                <span>{boostedIds[story.id] ? 'Boosted ✓' : 'More like this'}</span>
              </button>
              <button
                type="button"
                class="fb-chip"
                onclick={() => cove.giveDiscoverFeedback(story, 'less')}
              >
                <span>Less like this</span>
              </button>
              <button
                type="button"
                class="fb-chip"
                class:active={isSavedOffline}
                onclick={() => cove.saveCoveNewsOffline()}
              >
                <Icon name="bookmark" size={12} />
                <span>{isSavedOffline ? 'Saved Offline ✓' : 'Save Offline'}</span>
              </button>
            </div>

            <div class="bp-fb-right">
              <button
                type="button"
                class="fb-chip"
                onclick={copyCleanUrl}
              >
                <span>{copiedLink ? 'Copied ✓' : 'Copy Link'}</span>
              </button>
              <button
                type="button"
                class="fb-chip"
                onclick={() => cove.openUrlSafely(story.url, true, story.title)}
                title="Open publisher website in a new tab"
              >
                <Icon name="external" size={12} />
                <span>Source</span>
              </button>
            </div>
          </div>

          <!-- Primary CTA -> Opens Clean Article in Cove News -->
          <button
            type="button"
            class="read-full-cta"
            onclick={() => cove.openFullCoveNews(story)}
          >
            <Icon name="newspaper" size={16} />
            <span>Read Full Article in Cove News (Zero Ads)</span>
            <span class="cta-arrow">→</span>
          </button>

          {#if relatedStories.length > 0}
            <div class="bp-related">
              <span class="bp-kicker">More Verified Stories in This Channel</span>
              <div class="rel-grid">
                {#each relatedStories as rel (rel.id)}
                  <button
                    type="button"
                    class="rel-card"
                    onclick={() => cove.openDiscoverBrief(rel)}
                  >
                    <span class="rel-pub">{rel.publisher}</span>
                    <span class="rel-title">{rel.title}</span>
                  </button>
                {/each}
              </div>
            </div>
          {/if}
        </div>
      </div>
    {:else}
      <!-- ====================================================================
           STAGE 2: FULL-SCREEN CLEAN "COVE NEWS" MAGAZINE READER
           ==================================================================== -->
      <div
        class="cove-news-reader"
        class:tone-paper={paperTone === 'paper'}
        class:tone-night={paperTone === 'night'}
        role="dialog"
        aria-modal="true"
        tabindex="-1"
        aria-label={`Cove News — ${story.title}`}
        onclick={(e) => e.stopPropagation()}
      >
        <!-- Top Reading Progress Line -->
        <div class="cn-progress-bar" style="width: {scrollProgress}%;"></div>

        <!-- Reader Chrome Topbar -->
        <header class="cn-topbar">
          <div class="cn-brand">
            <button
              type="button"
              class="cn-back"
              onclick={() => (cove.coveNewsMode = 'brief')}
            >
              ← Brief
            </button>
            <span class="cn-badge">
              <Icon name="newspaper" size={13} />
              <strong>Cove News</strong>
              <em>{cove.coveNewsWasCached ? '⚡ Instant Cache' : 'Clean Reader'}</em>
            </span>
            <span class="cn-min-left">
              {minutesRemaining === 0 ? 'Completed ✓' : `${minutesRemaining} min left`}
            </span>
          </div>

          <div class="cn-controls">
            <!-- Prev / Next Story Flipper -->
            <div class="seg-group">
              <button
                type="button"
                disabled={!prevStory}
                onclick={() => jumpStory(prevStory)}
                title="Previous story"
              >
                ← Prev
              </button>
              <button
                type="button"
                disabled={!nextStory}
                onclick={() => jumpStory(nextStory)}
                title="Next story"
              >
                Next →
              </button>
            </div>

            <!-- 1-Click Calm Reading Soundscape -->
            <button
              type="button"
              class="cn-tool"
              class:active={cove.audioPlaying}
              onclick={() => {
                if (!cove.audioPlaying) cove.activateNeuralSoundMode('calm', true);
                else cove.toggleAudioPlayback();
              }}
              title="Toggle 8.5 Hz Calm Reading Soundscape"
            >
              <Icon name="waves" size={13} />
              <span>{cove.audioPlaying ? 'Sound On' : 'Calm Read · 8.5Hz'}</span>
            </button>

            <div class="seg-group">
              <button
                type="button"
                class:on={fontMode === 'serif'}
                onclick={() => (fontMode = 'serif')}
              >
                Serif
              </button>
              <button
                type="button"
                class:on={fontMode === 'sans'}
                onclick={() => (fontMode = 'sans')}
              >
                Sans
              </button>
            </div>

            <div class="seg-group">
              <button type="button" class:on={fontScale === 'sm'} onclick={() => (fontScale = 'sm')}>A-</button>
              <button type="button" class:on={fontScale === 'md'} onclick={() => (fontScale = 'md')}>A</button>
              <button type="button" class:on={fontScale === 'lg'} onclick={() => (fontScale = 'lg')}>A+</button>
            </div>

            <div class="seg-group">
              <button type="button" class:on={paperTone === 'glass'} onclick={() => (paperTone = 'glass')}>Glass</button>
              <button type="button" class:on={paperTone === 'paper'} onclick={() => (paperTone = 'paper')}>Paper</button>
              <button type="button" class:on={paperTone === 'night'} onclick={() => (paperTone = 'night')}>Ink</button>
            </div>

            <button
              type="button"
              class="cn-tool"
              class:active={isSavedOffline}
              onclick={() => cove.saveCoveNewsOffline()}
              title="Save clean article offline"
            >
              <Icon name="bookmark" size={13} />
              <span>{isSavedOffline ? 'Saved ✓' : 'Save'}</span>
            </button>

            <button
              type="button"
              class="cn-close"
              onclick={() => cove.closeCoveNews()}
              aria-label="Close Cove News"
            >
              <Icon name="x" size={16} />
            </button>
          </div>
        </header>

        <!-- Scrollable Clean Editorial Canvas -->
        <div class="cn-scroll" onscroll={handleArticleScroll}>
          <article
            class="cn-article"
            class:is-serif={fontMode === 'serif'}
            class:scale-sm={fontScale === 'sm'}
            class:scale-lg={fontScale === 'lg'}
          >
            <header class="cn-art-head">
              <div class="cn-pub-row">
                <BrandIcon url={story.url} title={story.publisher} size={18} radius={4} />
                <strong>{article?.publisher || story.publisher}</strong>
                <span class="cn-verified">✓ Verified Source</span>
                <span>·</span>
                <span>{fmtDate(story.publishedAt)}</span>
                <span>·</span>
                <span>{article?.readingTimeMin || story.readingTimeMin} min read</span>
              </div>

              <h1>{article?.title || story.title}</h1>

              {#if article?.author || story.author}
                <p class="cn-byline">By {article?.author || story.author}</p>
              {/if}
            </header>

            {#if (article?.bannerUrl || story.bannerUrl)}
              <figure class="cn-hero-figure">
                <img src={article?.bannerUrl || story.bannerUrl} referrerpolicy="no-referrer" alt={story.title} />
              </figure>
            {/if}

            {#if cove.coveNewsLoading}
              <div class="cn-loading">
                <div class="cn-line w90"></div>
                <div class="cn-line w100"></div>
                <div class="cn-line w85"></div>
                <div class="cn-line w95"></div>
                <div class="cn-line w70"></div>
                <span class="cn-load-label">
                  Fetching clean article directly from {story.domain}…
                </span>
              </div>
            {:else if article}
              <div class="cn-prose">
                <SafeHtml html={article.contentHtml} />
              </div>
            {/if}

            <footer class="cn-art-foot">
              <div class="cn-foot-note">
                <span>Fetched directly from <strong>{story.domain}</strong> · Rendered in Cove’s reader view</span>
                <div style="display:flex;gap:8px;flex-wrap:wrap;">
                  <button
                    type="button"
                    class="cn-orig-link"
                    onclick={copyCleanUrl}
                  >
                    <span>{copiedLink ? 'Copied Link ✓' : 'Copy Link'}</span>
                  </button>
                  <button
                    type="button"
                    class="cn-orig-link"
                    onclick={() => cove.openUrlSafely(story.url, true, story.title)}
                  >
                    <span>Original Publisher Page</span>
                    <Icon name="external" size={13} />
                  </button>
                </div>
              </div>
            </footer>
          </article>
        </div>
      </div>
    {/if}
  </div>
{/if}

<style>
  .cove-news-backdrop {
    position: fixed;
    inset: 0;
    z-index: 155;
    background: rgba(6, 9, 18, 0.74);
    backdrop-filter: blur(16px);
    display: grid;
    place-items: center;
    padding: 20px;
    animation: fadeScrim 180ms ease;
  }

  @keyframes fadeScrim {
    from { opacity: 0; }
    to { opacity: 1; }
  }

  @keyframes modalPop {
    from {
      opacity: 0;
      transform: scale(0.96) translateY(10px);
    }
    to {
      opacity: 1;
      transform: scale(1) translateY(0);
    }
  }

  /* ==========================================================================
     STAGE 1: NEWS BRIEF POPUP
     ========================================================================== */
  .brief-popup {
    width: min(680px, 95vw);
    max-height: 90vh;
    overflow-y: auto;
    border-radius: 26px;
    background: var(--surface-overlay);
    border: 1px solid var(--border-strong);
    box-shadow: var(--shadow-elevated);
    display: flex;
    flex-direction: column;
    animation: modalPop 240ms cubic-bezier(0.22, 1, 0.36, 1);
  }

  .bp-banner {
    position: relative;
    height: 248px;
    width: 100%;
    overflow: hidden;
    background: #111626;
    flex-shrink: 0;
  }

  .bp-banner img {
    width: 100%;
    height: 100%;
    object-fit: cover;
  }

  .bp-banner-fallback {
    width: 100%;
    height: 100%;
    display: grid;
    place-items: center;
    background: linear-gradient(135deg, #1b2845 0%, #0f172a 100%);
    font-family: var(--font-display);
    font-size: 2rem;
    font-weight: 800;
    color: rgba(255, 255, 255, 0.14);
  }

  .bp-banner-scrim {
    position: absolute;
    inset: 0;
    background: linear-gradient(180deg, rgba(8, 12, 22, 0.32) 0%, rgba(8, 12, 22, 0.88) 100%);
  }

  .bp-top-controls {
    position: absolute;
    top: 14px;
    left: 14px;
    right: 14px;
    display: flex;
    align-items: center;
    justify-content: space-between;
  }

  .bp-nav-arrows {
    display: inline-flex;
    gap: 6px;
  }

  .bp-round-btn {
    width: 34px;
    height: 34px;
    border-radius: 50%;
    display: grid;
    place-items: center;
    background: rgba(10, 14, 24, 0.68);
    backdrop-filter: blur(8px);
    color: #ffffff;
    border: 1px solid rgba(255, 255, 255, 0.18);
    font-size: 13px;
    transition: all 150ms ease;
  }
  .bp-round-btn:hover:not(:disabled) {
    background: rgba(10, 14, 24, 0.92);
    transform: scale(1.05);
  }
  .bp-round-btn:disabled {
    opacity: 0.35;
    cursor: default;
  }

  .bp-source-badge {
    position: absolute;
    left: 20px;
    bottom: 16px;
    display: inline-flex;
    align-items: center;
    gap: 7px;
    padding: 5px 12px;
    border-radius: var(--r-pill);
    background: rgba(15, 23, 42, 0.78);
    backdrop-filter: blur(10px);
    border: 1px solid rgba(255, 255, 255, 0.18);
    color: #ffffff;
    font-size: 12px;
  }

  .v-dot {
    color: #5eead4;
    font-family: var(--font-mono);
    font-size: 10.5px;
    font-weight: 600;
  }

  .bp-body {
    padding: 22px 26px 26px;
    display: flex;
    flex-direction: column;
    gap: 14px;
  }

  .bp-meta {
    display: flex;
    align-items: center;
    gap: 8px;
    flex-wrap: wrap;
    font-family: var(--font-mono);
    font-size: 11.5px;
    color: var(--text-muted);
  }

  .bp-reason {
    color: var(--accent-text);
  }

  .bp-title {
    margin: 0;
    font-family: var(--font-display);
    font-size: 1.48rem;
    font-weight: 700;
    line-height: 1.22;
    letter-spacing: -0.025em;
    color: var(--text-primary);
  }

  .bp-summary-box {
    border-radius: 16px;
    background: var(--surface-row);
    border: 1px solid var(--border-subtle);
    padding: 14px 16px;
    display: flex;
    flex-direction: column;
    gap: 8px;
  }

  .bp-kicker {
    font-family: var(--font-mono);
    font-size: 10.5px;
    font-weight: 650;
    text-transform: uppercase;
    letter-spacing: 0.08em;
    color: var(--accent-text);
  }

  .bp-summary-box p {
    margin: 0;
    font-size: 14.5px;
    line-height: 1.62;
    color: var(--text-primary);
  }

  .bp-highlights {
    margin: 4px 0 0;
    padding-left: 18px;
    display: flex;
    flex-direction: column;
    gap: 5px;
    font-size: 13px;
    color: var(--text-secondary);
  }

  .bp-feedback-row {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 8px;
    flex-wrap: wrap;
  }

  .bp-fb-left,
  .bp-fb-right {
    display: flex;
    align-items: center;
    gap: 7px;
    flex-wrap: wrap;
  }

  .fb-chip {
    display: inline-flex;
    align-items: center;
    gap: 6px;
    padding: 6px 12px;
    border-radius: var(--r-pill);
    background: var(--surface-subtle);
    border: 1px solid var(--border-subtle);
    color: var(--text-secondary);
    font-size: 12px;
    font-weight: 550;
    transition: all 150ms ease;
  }
  .fb-chip:hover,
  .fb-chip.active {
    background: var(--accent-soft);
    color: var(--text-primary);
    border-color: var(--accent);
  }

  .read-full-cta {
    margin-top: 2px;
    width: 100%;
    padding: 15px 22px;
    border-radius: 999px;
    background: linear-gradient(180deg, #2f6bff 0%, #1d5bff 100%);
    color: #ffffff;
    font-family: var(--font-display);
    font-size: 14.5px;
    font-weight: 700;
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 10px;
    box-shadow:
      0 14px 32px -6px rgba(29, 91, 255, 0.48),
      inset 0 1px 0 rgba(255, 255, 255, 0.36);
    transition: transform var(--dur-fast) var(--ease-calm), box-shadow var(--dur-fast) ease;
  }
  .read-full-cta:hover {
    transform: translateY(-2px);
    box-shadow:
      0 18px 38px -6px rgba(29, 91, 255, 0.58),
      inset 0 1px 0 rgba(255, 255, 255, 0.42);
  }
  .cta-arrow {
    font-family: var(--font-mono);
  }

  .bp-related {
    margin-top: 4px;
    padding-top: 12px;
    border-top: 1px solid var(--border-subtle);
    display: flex;
    flex-direction: column;
    gap: 8px;
  }

  .rel-grid {
    display: grid;
    grid-template-columns: repeat(3, minmax(0, 1fr));
    gap: 8px;
  }

  .rel-card {
    text-align: left;
    padding: 10px;
    border-radius: 12px;
    background: var(--surface-subtle);
    border: 1px solid var(--border-subtle);
    display: flex;
    flex-direction: column;
    gap: 4px;
  }
  .rel-card:hover {
    background: var(--surface-hover);
  }
  .rel-pub {
    font-family: var(--font-mono);
    font-size: 10px;
    color: var(--accent-text);
  }
  .rel-title {
    font-size: 12px;
    font-weight: 600;
    color: var(--text-primary);
    display: -webkit-box;
    -webkit-line-clamp: 2;
    -webkit-box-orient: vertical;
    overflow: hidden;
  }

  /* ==========================================================================
     STAGE 2: FRAMED FLOATING CLEAN "COVE NEWS" MAGAZINE READER
     ========================================================================== */
  .cove-news-reader {
    position: relative;
    width: min(940px, 95vw);
    height: min(88vh, 880px);
    border-radius: 26px;
    background: var(--surface-overlay);
    border: 1px solid var(--border-strong);
    box-shadow: var(--shadow-elevated);
    display: flex;
    flex-direction: column;
    overflow: hidden;
    color: var(--text-primary);
    animation: modalPop 220ms cubic-bezier(0.22, 1, 0.36, 1);
  }

  .cove-news-reader.tone-paper {
    background: #f9f5ec;
    color: #1c1917;
    --text-primary: #1c1917;
    --text-secondary: #44403c;
    --text-muted: #78716c;
    --border-subtle: rgba(28, 25, 23, 0.12);
    --surface-row: rgba(28, 25, 23, 0.06);
  }

  .cove-news-reader.tone-night {
    background: #0b0e17;
    color: #e2e8f0;
    --text-primary: #f1f5f9;
    --text-secondary: #cbd5e1;
    --text-muted: #64748b;
  }

  .cn-progress-bar {
    position: absolute;
    top: 0;
    left: 0;
    height: 3px;
    background: var(--accent);
    z-index: 10;
    transition: width 90ms linear;
  }

  .cn-topbar {
    padding: 13px 20px;
    border-bottom: 1px solid var(--border-subtle);
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 12px;
    flex-wrap: wrap;
    flex-shrink: 0;
  }

  .cn-brand {
    display: flex;
    align-items: center;
    gap: 10px;
  }

  .cn-back {
    padding: 5px 11px;
    border-radius: var(--r-pill);
    background: var(--surface-row);
    color: var(--text-secondary);
    font-size: 12px;
    font-weight: 600;
  }
  .cn-back:hover {
    color: var(--text-primary);
  }

  .cn-badge {
    display: inline-flex;
    align-items: center;
    gap: 6px;
    font-size: 13px;
    color: var(--text-primary);
  }
  .cn-badge em {
    font-style: normal;
    padding: 2px 8px;
    border-radius: var(--r-pill);
    background: var(--accent-soft);
    color: var(--accent-text);
    font-family: var(--font-mono);
    font-size: 10.5px;
  }

  .cn-min-left {
    font-family: var(--font-mono);
    font-size: 11px;
    color: var(--text-muted);
  }

  .cn-controls {
    display: flex;
    align-items: center;
    gap: 8px;
    flex-wrap: wrap;
  }

  .seg-group {
    display: inline-flex;
    border-radius: var(--r-pill);
    background: var(--surface-row);
    padding: 2px;
    border: 1px solid var(--border-subtle);
  }

  .seg-group button {
    padding: 4px 9px;
    border-radius: var(--r-pill);
    font-size: 11.5px;
    font-weight: 560;
    color: var(--text-secondary);
  }
  .seg-group button:disabled {
    opacity: 0.35;
    cursor: default;
  }
  .seg-group button.on {
    background: var(--dock-active-bg);
    color: var(--dock-active-ink);
  }

  .cn-tool {
    display: inline-flex;
    align-items: center;
    gap: 5px;
    padding: 5px 11px;
    border-radius: var(--r-pill);
    background: var(--surface-row);
    border: 1px solid var(--border-subtle);
    font-size: 11.5px;
    font-weight: 560;
    color: var(--text-secondary);
  }
  .cn-tool.active {
    background: var(--accent-soft);
    border-color: var(--accent);
    color: var(--text-primary);
  }

  .cn-close {
    width: 32px;
    height: 32px;
    border-radius: 50%;
    display: grid;
    place-items: center;
    background: var(--surface-row);
    color: var(--text-secondary);
  }

  .cn-scroll {
    flex: 1;
    overflow-y: auto;
    padding: 36px 28px 64px;
  }

  .cn-article {
    max-width: 68ch;
    margin: 0 auto;
    font-family: var(--font-sans);
    font-size: 17.5px;
    line-height: 1.76;
    color: var(--text-primary);
  }

  .cn-article.is-serif {
    font-family: var(--font-serif);
  }
  .cn-article.scale-sm {
    font-size: 15.5px;
  }
  .cn-article.scale-lg {
    font-size: 20px;
  }

  .cn-art-head {
    margin-bottom: 24px;
    font-family: var(--font-sans);
  }

  .cn-pub-row {
    display: flex;
    align-items: center;
    gap: 8px;
    flex-wrap: wrap;
    font-size: 12.5px;
    color: var(--text-muted);
    margin-bottom: 12px;
  }

  .cn-verified {
    color: var(--status-ok);
    font-family: var(--font-mono);
    font-size: 11px;
    font-weight: 600;
  }

  .cn-art-head h1 {
    margin: 0;
    font-family: var(--font-display);
    font-size: clamp(1.78rem, 3vw, 2.5rem);
    font-weight: 730;
    line-height: 1.15;
    letter-spacing: -0.03em;
    color: var(--text-primary);
  }

  .cn-byline {
    margin: 10px 0 0;
    font-size: 13.5px;
    color: var(--text-secondary);
  }

  .cn-hero-figure {
    margin: 0 0 28px;
    border-radius: 18px;
    overflow: hidden;
    border: 1px solid var(--border-subtle);
  }

  .cn-hero-figure img {
    width: 100%;
    max-height: 420px;
    object-fit: cover;
    display: block;
  }

  /* Editorial Drop-Cap in Serif Mode */
  .cn-article.is-serif .cn-prose :global(p:first-of-type::first-letter) {
    float: left;
    font-family: var(--font-serif);
    font-size: 3.35em;
    line-height: 0.84;
    padding-right: 10px;
    padding-top: 4px;
    font-weight: 700;
    color: var(--accent-text);
  }

  .cn-prose :global(p) {
    margin: 0 0 1.25em;
  }

  .cn-prose :global(h2),
  .cn-prose :global(h3) {
    font-family: var(--font-display);
    margin: 1.65em 0 0.6em;
    line-height: 1.25;
    letter-spacing: -0.02em;
  }

  .cn-prose :global(blockquote) {
    margin: 1.5em 0;
    padding: 6px 0 6px 18px;
    border-left: 3px solid var(--accent);
    color: var(--text-secondary);
    font-style: italic;
  }

  .cn-prose :global(.cove-news-fig) {
    margin: 1.6em 0;
    border-radius: 14px;
    overflow: hidden;
  }

  .cn-prose :global(.cove-news-fig img) {
    width: 100%;
    border-radius: 14px;
    display: block;
  }

  .cn-prose :global(.cove-news-fig figcaption) {
    margin-top: 7px;
    font-family: var(--font-sans);
    font-size: 12.5px;
    color: var(--text-muted);
    text-align: center;
  }

  .cn-loading {
    display: flex;
    flex-direction: column;
    gap: 12px;
    padding: 20px 0;
  }

  .cn-line {
    height: 14px;
    border-radius: 7px;
    background: var(--surface-row);
    animation: cnPulse 1.4s ease-in-out infinite;
  }
  .w100 { width: 100%; }
  .w95 { width: 95%; }
  .w90 { width: 90%; }
  .w85 { width: 85%; }
  .w70 { width: 70%; }

  .cn-load-label {
    margin-top: 8px;
    font-family: var(--font-mono);
    font-size: 12px;
    color: var(--text-muted);
  }

  @keyframes cnPulse {
    0%, 100% { opacity: 0.45; }
    50% { opacity: 0.9; }
  }

  .cn-art-foot {
    margin-top: 38px;
    padding-top: 20px;
    border-top: 1px solid var(--border-subtle);
    font-family: var(--font-sans);
  }

  .cn-foot-note {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 12px;
    flex-wrap: wrap;
    font-size: 12.5px;
    color: var(--text-muted);
  }

  .cn-orig-link {
    display: inline-flex;
    align-items: center;
    gap: 6px;
    padding: 7px 14px;
    border-radius: var(--r-pill);
    background: var(--surface-row);
    color: var(--text-primary);
    font-size: 12.5px;
    font-weight: 600;
  }

  @media (max-width: 760px) {
    .cove-news-backdrop {
      padding: 8px;
    }
    .brief-popup {
      width: 100%;
      max-height: 94vh;
      border-radius: 20px;
    }
    .bp-banner {
      height: 196px;
    }
    .bp-body {
      padding: 16px 18px 20px;
    }
    .cn-topbar {
      padding: 10px 12px;
      flex-wrap: wrap;
      gap: 8px;
    }
    .cn-controls {
      width: 100%;
      overflow-x: auto;
      padding-bottom: 2px;
      scrollbar-width: none;
    }
    .rel-grid {
      grid-template-columns: 1fr;
    }
    .cn-scroll {
      padding: 20px 16px 44px;
    }
  }
</style>
