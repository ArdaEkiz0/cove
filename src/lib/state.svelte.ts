import { computeTabTriage, extractDomain } from '../background/triage-core';
import {
  analyzeWallpaperImage,
  applyAtmosphereVariables,
  buildAtmosphereFromSeed,
  type WallpaperAtmosphere
} from './atmosphere';
import { NEURAL_MODES, soundEngine } from './audio';
import {
  closeBrowserTabs,
  fetchOptInText,
  focusBrowserTab,
  groupTabsByDomain,
  initLiveCrossTabPresence,
  queryBrowserTabs,
  recordLaunchedWorkspaceUrl,
  restoreTabSessionInBrowser,
  setBrowserTabsMuted,
  suspendBrowserTabs,
  syncFocusBlocker,
  updateLaunchedTabTitle
} from './browser';
import {
  createDefaultSettings,
  CURATED_WALLPAPERS,
  DEFAULT_COUNTDOWNS,
  DEFAULT_NOTES,
  DEFAULT_QUICKLINK_GROUPS,
  DEFAULT_QUICKLINKS,
  DEFAULT_READ_LATER,
  DEFAULT_RSS_FEEDS,
  DEFAULT_SESSIONS
} from './defaults';
import { extractReadableArticle, parseNetscapeBookmarksHtml } from './reader';
import { parseFeedXml } from './rss-parser';
import {
  buildLearnedInsights,
  buildSmartPulseSuggestions,
  computeSmartShapedWidgets,
  createInitialSmartMemory,
  getAutonomousCircadianSceneIndex,
  getEvolutionStatus,
  getPredictedSceneIndex,
  getPredictedSearchEngine,
  getRecommendedNeuralProfile,
  getTopWorkflowChains,
  inferAutonomousContext,
  rankQuickLinksSmart,
  recordAutopilotAction,
  recordPulseFeedback,
  recordSmartInteraction,
  upgradeSmartMemory,
  type SmartPulseSuggestion
} from './smart-engine';
import {
  createDefaultDiscoverProfile,
  fetchAllDiscoverStories,
  fetchCustomRssStories,
  fetchFullCoveNewsArticle,
  rankStoriesForUser,
  recordDiscoverFeedback,
  type DiscoverFullArticle,
  type DiscoverInterestProfile,
  type DiscoverStory,
  type DiscoverTopicId
} from './discover';
import {
  clearAllNewsCache,
  getCachedFullArticle,
  getMemoryCachedArticle,
  listCachedArticleKeys,
  loadCachedDiscoverFeed,
  normalizeStoryKey,
  saveCachedDiscoverFeed,
  saveCachedFullArticle
} from './news-cache';
import {
  idbGetBlob,
  idbGetReadLater,
  idbSaveAllReadLater,
  idbSetBlob,
  isExtensionContext,
  storageClearAll,
  storageGet,
  storageSet
} from './storage';
import { ensureUniqueStoryIds } from './story-id';
import {
  sanitizeCountdowns,
  sanitizeImportedSettings,
  sanitizeNotes,
  sanitizeQuickLinkGroups,
  sanitizeQuickLinks,
  sanitizeReadLater,
  sanitizeRssFeeds,
  sanitizeSessions
} from './validation';
import type {
  AutonomyMode,
  BrowserTabItem,
  CountdownItem,
  CoveFullExport,
  CoveSettings,
  LayoutMode,
  NeuralDepth,
  NeuralModeId,
  NoteItem,
  QuickLinkGroup,
  QuickLinkItem,
  ReadLaterItem,
  RssEntry,
  RssFeedSource,
  SettingsSectionId,
  SmartEngineMemory,
  SoundscapeId,
  SoundTrackId,
  TabSession,
  TabTriageSummary,
  WeatherCache,
  WeatherDailyPoint,
  WeatherHourlyPoint,
  WidgetSize,
  WidgetType
} from './types';

const SOUNDSCAPE_CYCLE: SoundscapeId[] = ['none', 'waves', 'rain', 'cafe', 'whitenoise', 'wind'];

export interface GeocodedCityOption {
  name: string;
  admin1?: string;
  country?: string;
  latitude: number;
  longitude: number;
}

class CoveStore {
  settings = $state<CoveSettings>(createDefaultSettings());
  smartMemory = $state<SmartEngineMemory>(createInitialSmartMemory());
  quickLinkGroups = $state<QuickLinkGroup[]>(structuredClone(DEFAULT_QUICKLINK_GROUPS));
  quickLinks = $state<QuickLinkItem[]>(structuredClone(DEFAULT_QUICKLINKS));
  notes = $state<NoteItem[]>(structuredClone(DEFAULT_NOTES));
  sessions = $state<TabSession[]>(structuredClone(DEFAULT_SESSIONS));
  readLater = $state<ReadLaterItem[]>(structuredClone(DEFAULT_READ_LATER));
  rssFeeds = $state<RssFeedSource[]>(structuredClone(DEFAULT_RSS_FEEDS));
  rssEntries = $state<RssEntry[]>([]);
  rssLoading = $state(false);
  rssError = $state<string | null>(null);
  countdowns = $state<CountdownItem[]>(structuredClone(DEFAULT_COUNTDOWNS));

  weatherCache = $state<WeatherCache | null>(null);
  weatherLoading = $state(false);
  weatherError = $state<string | null>(null);
  weatherPopoverOpen = $state(false);

  openTabs = $state<BrowserTabItem[]>([]);
  triage = $state<TabTriageSummary>({
    totalTabs: 0,
    audioTabs: [],
    duplicateGroups: [],
    duplicateExtraCount: 0,
    staleTabs: [],
    updateTabs: [],
    heavyTabs: [],
    computedInMs: 0
  });

  localWallpaperUrl = $state<string | undefined>(undefined);

  atmosphere = $state<WallpaperAtmosphere>(
    buildAtmosphereFromSeed(
      CURATED_WALLPAPERS[1].luminance,
      CURATED_WALLPAPERS[1].heroLuminance,
      CURATED_WALLPAPERS[1].accentHex
    )
  );
  effectiveScrim = $state(0.22);
  topHeroScrim = $state(0.14);

  // Full-Page Settings Studio & Overlays
  commandPaletteOpen = $state(false);
  commandInitialQuery = $state('');
  settingsOpen = $state(false);
  settingsTab = $state<SettingsSectionId>('general');
  smartModalOpen = $state(false);
  sessionsModalOpen = $state(false);
  wallpaperPickerOpen = $state(false);
  soundMixerOpen = $state(false);
  activeReaderItem = $state<ReadLaterItem | null>(null);
  editGridMode = $state(false);
  blockedPreviewDomain = $state<string | null>(null);

  // Cove Discover (Verified News + IndexedDB Cache + Ad-Free Cove News Reader)
  discoverStories = $state<DiscoverStory[]>([]);
  discoverLoading = $state(false);
  discoverRevalidating = $state(false);
  discoverFromCache = $state(false);
  discoverLastFetchedAt = $state(0);
  discoverProfile = $state<DiscoverInterestProfile>(createDefaultDiscoverProfile());
  discoverActiveTopic = $state<DiscoverTopicId>('for-you');
  activeDiscoverStory = $state<DiscoverStory | null>(null);
  coveNewsMode = $state<'brief' | 'article'>('brief');
  coveNewsArticle = $state<DiscoverFullArticle | null>(null);
  coveNewsLoading = $state(false);
  coveNewsWasCached = $state(false);
  cachedArticleKeys = $state<string[]>([]);
  precacheRunning = $state(false);
  private inFlightPrefetches = new Set<string>();

  rankedDiscoverStories = $derived.by(() =>
    rankStoriesForUser(this.discoverStories, this.discoverProfile, this.discoverActiveTopic)
  );

  toastMessage = $state<string | null>(null);
  private toastTimer: number | null = null;

  now = $state<Date>(new Date());

  // Focus Pomodoro & Neural Sound Runtime State
  focusRunning = $state(false);
  focusPhase = $state<'work' | 'break' | 'longBreak'>('work');
  focusRemainingSec = $state(25 * 60);
  audioPlaying = $state(false);
  soundFadeRemainingMin = $state<number | null>(null);
  private focusInterval: number | null = null;
  private fadeTimer: number | null = null;

  networkLedger = $state({
    weather: 0,
    rss: 0,
    metadata: 0,
    searchSuggest: 0,
    wallpaper: 0,
    favicons: 0,
    telemetry: 0
  });

  hydrated = $state(false);
  isExtension = isExtensionContext();

  private triageWorker: Worker | null = null;
  private workerReqSeq = 0;
  private notesDebounceTimer: number | null = null;
  private smartSaveTimer: number | null = null;
  private lastAutoSceneSlot = '';

  activeContext = $derived.by<'work' | 'personal'>(() => {
    const ta = this.settings.timeAware;
    if (!ta.enabled) return 'work';
    if (ta.modeOverride === 'work') return 'work';
    if (ta.modeOverride === 'personal') return 'personal';

    const day = this.now.getDay();
    const hr = this.now.getHours();
    const isWorkDay = ta.workDays.includes(day);
    const inHours =
      ta.workStartHour <= ta.workEndHour
        ? hr >= ta.workStartHour && hr < ta.workEndHour
        : hr >= ta.workStartHour || hr < ta.workEndHour;
    const scheduled: 'work' | 'personal' = isWorkDay && inHours ? 'work' : 'personal';

    if (this.settings.smartEngine.enabled && this.settings.smartEngine.autonomousContext) {
      return inferAutonomousContext(this.smartMemory, this.now, scheduled);
    }
    return scheduled;
  });

  badgeCountsByDomain = $derived.by<Record<string, number>>(() => {
    const map: Record<string, number> = {};
    for (const tab of this.openTabs) {
      if (tab.unreadCount > 0) {
        map[tab.domain] = (map[tab.domain] || 0) + tab.unreadCount;
        const parts = tab.domain.split('.');
        if (parts.length > 2) {
          const root = parts.slice(-2).join('.');
          map[root] = (map[root] || 0) + tab.unreadCount;
        }
      }
    }
    return map;
  });

  isBlockerCurrentlyEnforced = $derived.by<boolean>(() => {
    const f = this.settings.focus;
    if (this.focusRunning && this.focusPhase === 'work' && f.blockerActiveDuringFocus) {
      return true;
    }
    if (this.activeContext === 'work' && f.blockerActiveDuringWorkHours) {
      return true;
    }
    return false;
  });

  activeSoundLayersCount = $derived.by<number>(() => {
    if (!this.audioPlaying) return 0;
    const mix = this.settings.focus.soundMix;
    const texCount = mix ? Object.values(mix).filter((v) => v > 0.02).length : 0;
    const neuralCount = this.settings.focus.neuralMode && this.settings.focus.neuralMode !== 'off' ? 1 : 0;
    return texCount + neuralCount;
  });

  recommendedNeural = $derived.by(() => {
    const activity =
      this.focusRunning && this.focusPhase !== 'work'
        ? 'break'
        : this.activeDiscoverStory
          ? 'reading'
          : undefined;
    return getRecommendedNeuralProfile(this.smartMemory, this.now, activity);
  });

  activeAudioLabel = $derived.by<string>(() => {
    if (!this.audioPlaying) return 'Neural Sound';
    const nm = this.settings.focus.neuralMode;
    if (nm && nm !== 'off' && NEURAL_MODES[nm]) {
      return `${NEURAL_MODES[nm].shortLabel} · ${NEURAL_MODES[nm].hz}Hz`;
    }
    const mix = this.settings.focus.soundMix || {};
    const active = Object.entries(mix).filter(([, v]) => v > 0.02);
    if (active.length > 1) return `${active.length} Textures`;
    if (active.length === 1) {
      const k = active[0][0];
      if (k === 'waves') return 'Cove Waves';
      if (k === 'rain') return 'Gentle Rain';
      if (k === 'cafe') return 'Quiet Café';
      if (k === 'whitenoise') return 'Velvet Noise';
      return 'Pine Wind';
    }
    return 'Neural Sound';
  });

  smartStatus = $derived.by(() => getEvolutionStatus(this.smartMemory, this.now));

  learnedChains = $derived.by(() => getTopWorkflowChains(this.smartMemory, 6));

  learnedInsights = $derived.by(() =>
    buildLearnedInsights(this.smartMemory, this.settings.searchEngines, this.now)
  );

  smartPulses = $derived.by<SmartPulseSuggestion[]>(() => {
    if (!this.settings.smartEngine.enabled || !this.settings.smartEngine.showPulseSuggestions) {
      return [];
    }
    return buildSmartPulseSuggestions({
      mem: this.smartMemory,
      now: this.now,
      triage: this.triage,
      quickLinks: this.quickLinks,
      readLater: this.readLater,
      focusRunning: this.focusRunning,
      enableMarkov: this.settings.smartEngine.markovPredictions,
      currentSceneIndex:
        this.settings.background.type === 'wallpaper'
          ? this.settings.background.curatedIndex
          : undefined
    });
  });

  predictedEngine = $derived.by(() =>
    getPredictedSearchEngine(this.settings.searchEngines, this.smartMemory, this.now)
  );

  public openSettings(section: SettingsSectionId = 'general'): void {
    this.settingsTab = section;
    this.settingsOpen = true;
  }

  async init(): Promise<void> {
    this.initWorker();
    initLiveCrossTabPresence(() => {
      this.refreshTabs();
    });

    window.setInterval(() => {
      this.now = new Date();
      this.checkCircadianAutoScene();
    }, 1000);

    const [
      savedSettings,
      savedSmartMemory,
      savedGroups,
      savedLinks,
      savedNotes,
      savedSessions,
      savedFeeds,
      savedCountdowns,
      savedWeatherCache,
      savedRssCache,
      savedReadLater,
      savedWallpaperBlob,
      savedDiscoverProfile,
      savedDiscoverCache
    ] = await Promise.all([
      storageGet<CoveSettings | null>('settings', null),
      storageGet<SmartEngineMemory | null>('smartMemory', null),
      storageGet<QuickLinkGroup[] | null>('quickLinkGroups', null),
      storageGet<QuickLinkItem[] | null>('quickLinks', null),
      storageGet<NoteItem[] | null>('notes', null),
      storageGet<TabSession[] | null>('sessions', null),
      storageGet<RssFeedSource[] | null>('rssFeeds', null),
      storageGet<CountdownItem[] | null>('countdowns', null),
      storageGet<WeatherCache | null>('weatherCache', null),
      storageGet<RssEntry[] | null>('rssCache', null),
      idbGetReadLater(DEFAULT_READ_LATER),
      idbGetBlob('localWallpaper'),
      storageGet<DiscoverInterestProfile | null>('discoverProfile', null),
      storageGet<{ fetchedAt: number; stories: DiscoverStory[] } | null>('discoverCache', null)
    ]);

    if (savedSettings && savedSettings.version >= 4) {
      const def = createDefaultSettings();
      const mergedEngines = (savedSettings.searchEngines || def.searchEngines).map((se) => {
        const match = def.searchEngines.find((d) => d.id === se.id);
        return {
          ...se,
          bang: se.bang || match?.bang || `!${se.id}`,
          domain: se.domain || match?.domain || extractDomain(se.urlTemplate)
        };
      });
      const migrateToMidnightDark = (savedSettings.version || 0) < 8;

      this.settings = {
        ...def,
        ...savedSettings,
        version: 8,
        theme: migrateToMidnightDark ? 'dark' : savedSettings.theme || def.theme,
        preset: migrateToMidnightDark ? 'cobalt' : savedSettings.preset || def.preset,
        typography: { ...def.typography, ...(savedSettings.typography || {}) },
        background: migrateToMidnightDark
          ? { ...def.background }
          : { ...def.background, ...(savedSettings.background || {}) },
        timeAware: { ...def.timeAware, ...(savedSettings.timeAware || {}) },
        smartEngine: { ...def.smartEngine, ...(savedSettings.smartEngine || {}) },
        weather: { ...def.weather, ...(savedSettings.weather || {}) },
        focus: {
          ...def.focus,
          ...(savedSettings.focus || {}),
          soundMix: { ...def.focus.soundMix, ...(savedSettings.focus?.soundMix || {}) },
          history: savedSettings.focus?.history || []
        },
        searchEngines: mergedEngines
      };
      if (migrateToMidnightDark) {
        await storageSet('settings', this.settings);
      }
      if (this.settings.layoutMode === 'minimal') {
        this.settings.layoutMode = 'ambient';
      }
      if (savedGroups?.length) this.quickLinkGroups = savedGroups;
      if (savedLinks?.length) this.quickLinks = savedLinks;
      if (savedNotes?.length) this.notes = savedNotes;
      if (savedSessions) this.sessions = savedSessions;
      if (savedFeeds) {
        // Upgrade legacy slow hnrss feed to verified fast feed automatically
        this.rssFeeds = savedFeeds.filter((f) => !f.url.includes('hnrss.org'));
        if (this.rssFeeds.length === 0) {
          this.rssFeeds = structuredClone(DEFAULT_RSS_FEEDS);
        }
      }
      if (savedCountdowns) this.countdowns = savedCountdowns;
      this.readLater = savedReadLater;
    } else if (savedSettings) {
      const def = createDefaultSettings();
      this.settings = {
        ...def,
        version: 8,
        userName: savedSettings.userName || '',
        theme: 'dark',
        preset: 'cobalt',
        clockStyle: savedSettings.clockStyle || def.clockStyle,
        language: savedSettings.language || def.language,
        background: { ...def.background }
      };
      await storageSet('settings', this.settings);
      await idbSaveAllReadLater([]);
    }

    if (savedSmartMemory && savedSmartMemory.version >= 2) {
      this.smartMemory = upgradeSmartMemory(savedSmartMemory);
    }

    if (savedWeatherCache) this.weatherCache = savedWeatherCache;
    if (savedRssCache?.length) this.rssEntries = savedRssCache;
    if (savedDiscoverProfile?.version) {
      this.discoverProfile = { ...createDefaultDiscoverProfile(), ...savedDiscoverProfile };
    }

    // Hydrate IndexedDB News Feed + Cached Full-Article Index (0ms instant load)
    const idbFeed = await loadCachedDiscoverFeed();
    if (idbFeed?.stories?.length) {
      this.discoverStories = ensureUniqueStoryIds(idbFeed.stories);
      this.discoverLastFetchedAt = idbFeed.fetchedAt;
      this.discoverFromCache = true;
    } else if (savedDiscoverCache?.stories?.length) {
      this.discoverStories = ensureUniqueStoryIds(savedDiscoverCache.stories);
      this.discoverLastFetchedAt = savedDiscoverCache.fetchedAt || 0;
      this.discoverFromCache = true;
    }
    this.cachedArticleKeys = await listCachedArticleKeys();

    // URL Hash Navigation (#discover / #focus / #workspace / #ambient)
    if (typeof window !== 'undefined') {
      const syncFromHash = () => {
        const h = window.location.hash.replace(/^#/, '').toLowerCase();
        if (h === 'discover' || h === 'focus' || h === 'ambient') {
          this.settings.layoutMode = h;
        } else if (h === 'home' || h === 'dashboard' || h === 'workspace') {
          this.settings.layoutMode = 'dashboard';
        }
      };
      syncFromHash();
      window.addEventListener('hashchange', syncFromHash);
    }
    this.localWallpaperUrl = savedWallpaperBlob;

    if (this.isExtension) {
      const pending = await storageGet<ReadLaterItem[]>('pending_read_later', []);
      if (pending.length > 0) {
        this.readLater = [...pending, ...this.readLater];
        await storageSet('pending_read_later', []);
        await idbSaveAllReadLater(this.readLater);
      }
    }

    this.focusRemainingSec = this.settings.focus.workMinutes * 60;
    this.applyDomTheme();
    await this.refreshWallpaperAtmosphere();
    this.hydrated = true;

    this.checkCircadianAutoScene();
    await this.refreshTabs();

    if (this.settings.weather.enabledOptIn) {
      this.refreshWeather(false);
    }
    if (this.settings.rssOptIn && this.rssFeeds.length > 0) {
      this.refreshRss(false);
    }
    if (this.settings.discoverOptIn !== false) {
      this.refreshDiscover(false);
    }

    if (this.isExtension && chrome?.tabs) {
      const debouncedRefresh = () => {
        this.refreshTabs();
      };
      chrome.tabs.onCreated.addListener(debouncedRefresh);
      chrome.tabs.onRemoved.addListener(debouncedRefresh);
      chrome.tabs.onUpdated.addListener(debouncedRefresh);
    }
  }

  private checkCircadianAutoScene(): void {
    const se = this.settings.smartEngine;
    if (
      !this.hydrated ||
      !se.enabled ||
      se.autonomyMode === 'manual' ||
      !se.autoEvolveScene ||
      this.settings.background.type !== 'wallpaper'
    ) {
      return;
    }
    const slotKey = this.smartStatus.slotKey;
    if (slotKey === this.lastAutoSceneSlot) return;
    this.lastAutoSceneSlot = slotKey;

    const { index: targetIdx, isLearned } =
      se.autonomyMode === 'autonomous'
        ? getAutonomousCircadianSceneIndex(this.smartMemory, this.now)
        : { index: getPredictedSceneIndex(this.smartMemory, this.now) ?? -1, isLearned: true };

    if (targetIdx >= 0 && targetIdx !== this.settings.background.curatedIndex) {
      const sc = CURATED_WALLPAPERS[targetIdx];
      this.settings.background.curatedIndex = targetIdx;
      if (sc) this.settings.background.gradientId = sc.id;
      recordAutopilotAction(
        this.smartMemory,
        'Atmosphere',
        `${isLearned ? 'Learned' : 'Circadian'} scene → ${sc?.label || '4K Scene'}`
      );
      this.scheduleSaveSmartMemory();
      this.refreshWallpaperAtmosphere();
      this.saveSettings();
    }

    if (se.autonomyMode === 'autonomous' && se.autoShapeBento && this.smartMemory.totalSignals >= 8) {
      this.settings.widgets = computeSmartShapedWidgets(
        this.settings.widgets,
        this.smartMemory,
        this.now
      );
      this.saveSettings();
    }
  }

  private initWorker(): void {
    try {
      this.triageWorker = new Worker(new URL('../workers/triage.worker.ts', import.meta.url), {
        type: 'module'
      });
      this.triageWorker.onmessage = (ev) => {
        if (ev.data?.summary) {
          this.triage = ev.data.summary;
        }
      };
    } catch {
      this.triageWorker = null;
    }
  }

  public isEffectiveLightTheme(): boolean {
    if (this.settings.theme === 'light') return true;
    if (this.settings.theme === 'dark') return false;
    return (
      typeof window !== 'undefined' &&
      window.matchMedia?.('(prefers-color-scheme: light)').matches
    );
  }

  public setAtmosphereStyle(style: 'cloud-light' | 'cloud-dark' | 'scenic'): void {
    if (style === 'cloud-light') {
      this.settings.theme = 'light';
      this.settings.preset = 'cobalt';
      this.settings.background.type = 'cloud';
      this.settings.background.chameleonAccent = false;
    } else if (style === 'cloud-dark') {
      this.settings.theme = 'dark';
      this.settings.preset = 'cobalt';
      this.settings.background.type = 'cloud';
      this.settings.background.chameleonAccent = false;
    } else {
      this.settings.background.type = 'wallpaper';
      this.settings.background.chameleonAccent = true;
    }
    this.applyDomTheme();
    this.refreshWallpaperAtmosphere();
    this.saveSettings();
  }

  public async refreshWallpaperAtmosphere(): Promise<void> {
    const bg = this.settings.background;
    if (typeof document !== 'undefined') {
      document.documentElement.removeAttribute('data-photo-hero');
    }

    if (bg.type === 'cloud') {
      const light = this.isEffectiveLightTheme();
      this.atmosphere = buildAtmosphereFromSeed(
        light ? 0.92 : 0.08,
        light ? 0.94 : 0.1,
        light ? '#1d5bff' : '#3b7bff'
      );
      this.syncAtmosphereCss();
      return;
    }

    const scene =
      CURATED_WALLPAPERS[bg.curatedIndex % CURATED_WALLPAPERS.length] || CURATED_WALLPAPERS[0];

    const seedFallback = buildAtmosphereFromSeed(
      scene.luminance,
      scene.heroLuminance,
      scene.accentHex
    );

    if (bg.type === 'solid') {
      const clean = bg.solidColor.replace('#', '');
      const r = parseInt(clean.slice(0, 2) || '15', 16);
      const g = parseInt(clean.slice(2, 4) || '18', 16);
      const b = parseInt(clean.slice(4, 6) || '28', 16);
      const lum = (0.2126 * r + 0.7152 * g + 0.0722 * b) / 255;
      this.atmosphere = buildAtmosphereFromSeed(lum, lum, bg.solidColor);
      this.syncAtmosphereCss();
      return;
    }

    this.atmosphere = seedFallback;
    this.syncAtmosphereCss();

    let targetImgUrl = scene.localUrl;
    if (bg.type === 'local' && this.localWallpaperUrl) {
      targetImgUrl = this.localWallpaperUrl;
    } else if (bg.type === 'curated' && bg.unsplashOptIn) {
      targetImgUrl = scene.unsplashUrl;
    }

    if (bg.type === 'wallpaper' || bg.type === 'local' || bg.type === 'curated') {
      const sampled = await analyzeWallpaperImage(targetImgUrl, seedFallback);
      this.atmosphere = sampled;
      if (typeof document !== 'undefined') {
        if (this.isEffectiveLightTheme() && sampled.heroLuminance < 0.56) {
          document.documentElement.dataset.photoHero = 'light-ink';
        } else {
          document.documentElement.removeAttribute('data-photo-hero');
        }
      }
      this.syncAtmosphereCss();
    }
  }

  public syncAtmosphereCss(): void {
    const bg = this.settings.background;
    const res = applyAtmosphereVariables({
      atmo: this.atmosphere,
      userDim: bg.dim ?? 0.22,
      userBrightness: bg.brightness ?? 1.0,
      userContrast: bg.contrast ?? 1.03,
      userVignette: bg.vignette ?? 0.28,
      autoBrightness: bg.autoBrightness ?? true,
      chameleonAccent: bg.chameleonAccent ?? true,
      effectiveLightTheme: this.isEffectiveLightTheme()
    });
    this.effectiveScrim = res.effectiveScrim;
    this.topHeroScrim = res.topHeroScrim;
  }

  public resetOpticalAtmosphere(): void {
    this.settings.background.brightness = 1.0;
    this.settings.background.contrast = 1.03;
    this.settings.background.dim = 0.22;
    this.settings.background.blur = 0;
    this.settings.background.vignette = 0.28;
    this.settings.background.autoBrightness = true;
    this.settings.background.chameleonAccent = true;
    this.saveSettings();
    this.notify('Optical calibration reset to balanced defaults.');
  }

  public applyDomTheme(): void {
    const html = document.documentElement;
    const typo = this.settings.typography || {
      fontPair: 'swiss',
      uiScale: 'balanced',
      cornerStyle: 'balanced'
    };
    html.dataset.theme = this.settings.theme;
    html.dataset.preset = this.settings.preset;
    html.dataset.fontPair = typo.fontPair;
    html.dataset.uiScale = typo.uiScale;
    html.dataset.corners = typo.cornerStyle;
    html.lang = this.settings.language;
    this.syncAtmosphereCss();
    try {
      localStorage.setItem(
        'cove_fast_boot',
        JSON.stringify({
          theme: this.settings.theme,
          preset: this.settings.preset,
          fontPair: typo.fontPair,
          uiScale: typo.uiScale,
          corners: typo.cornerStyle,
          lang: this.settings.language
        })
      );
    } catch {
      // ignore
    }
  }

  public notify(msg: string): void {
    this.toastMessage = msg;
    if (this.toastTimer) window.clearTimeout(this.toastTimer);
    this.toastTimer = window.setTimeout(() => {
      this.toastMessage = null;
    }, 3000);
  }

  public async saveSettings(): Promise<void> {
    this.applyDomTheme();
    await storageSet('settings', this.settings);
    await syncFocusBlocker(this.settings.focus.blockedDomains, this.isBlockerCurrentlyEnforced);
  }

  /* ==========================================================================
   * Cove Smart Engine v3 — Circadian Kernel + Markov Workflow Intelligence
   * ======================================================================== */

  private scheduleSaveSmartMemory(): void {
    if (this.smartSaveTimer) window.clearTimeout(this.smartSaveTimer);
    this.smartSaveTimer = window.setTimeout(() => {
      storageSet('smartMemory', this.smartMemory);
    }, 280);
  }

  public recordSignal(event: Parameters<typeof recordSmartInteraction>[2]): void {
    if (!this.settings.smartEngine.enabled) return;
    const prevStage = this.smartStatus.level;
    recordSmartInteraction(this.smartMemory, this.now, event);
    const nextStage = this.smartStatus.level;

    if (nextStage > prevStage && !this.settings.smartEngine.whisperMode) {
      this.notify(
        `Intelligence evolved to Stage ${nextStage}: ${this.smartStatus.stageName}`
      );
    }

    if (this.settings.smartEngine.autoShapeBento && event.type === 'widget') {
      this.settings.widgets = computeSmartShapedWidgets(
        this.settings.widgets,
        this.smartMemory,
        this.now
      );
      this.saveSettings();
    }
    this.scheduleSaveSmartMemory();
  }

  public getRankedQuickLinks(pool: QuickLinkItem[]) {
    if (!this.settings.smartEngine.enabled || !this.settings.smartEngine.smartSortLinks) {
      return pool.map((item) => ({ item, score: 0, isTopPick: false, isChainNext: false }));
    }
    return rankQuickLinksSmart(pool, this.smartMemory, this.now);
  }

  public applySmartBentoShape(): void {
    if (this.smartMemory.totalSignals === 0) {
      this.notify('Interact with your cards first so Smart Engine learns your rhythm.');
      return;
    }
    this.settings.widgets = computeSmartShapedWidgets(
      this.settings.widgets,
      this.smartMemory,
      this.now
    );
    this.saveSettings();
    this.notify('Bento Grid shaped to your learned circadian habits.');
  }

  public acceptSmartPulse(pulse: SmartPulseSuggestion): void {
    recordPulseFeedback(this.smartMemory, pulse.id, pulse.kind, true);
    this.scheduleSaveSmartMemory();

    if (pulse.action === 'clean_dupes') {
      this.deduplicateDomainTabs();
    } else if (pulse.action === 'rest_stale') {
      this.suspendStaleTabs();
    } else if (pulse.action === 'start_focus') {
      if (pulse.payload && pulse.payload !== 'none') {
        this.setAmbientSound(pulse.payload as SoundscapeId);
      }
      this.focusRemainingSec = this.smartMemory.preferredFocusMinutes * 60;
      this.startFocus();
    } else if (pulse.action === 'open_url' && pulse.payload) {
      const [linkId, url] = pulse.payload.split('|');
      const found = this.quickLinks.find((q) => q.id === linkId);
      this.recordSignal({ type: 'link', linkId, url, title: found?.title });
      this.openUrlSafely(url, true, found?.title);
    } else if (pulse.action === 'apply_scene' && pulse.payload !== undefined) {
      this.selectWallpaper(Number(pulse.payload));
    } else if (pulse.action === 'surprise_read') {
      const unread = this.readLater.find((r) => !r.read) || this.readLater[0];
      if (unread) {
        this.openArticleInReader(unread);
      }
    }
  }

  public dismissSmartPulse(pulse: SmartPulseSuggestion): void {
    recordPulseFeedback(this.smartMemory, pulse.id, pulse.kind, false);
    this.scheduleSaveSmartMemory();
    this.notify('Preference learned — adjusted future suggestions.');
  }

  public async resetSmartMemory(): Promise<void> {
    this.smartMemory = createInitialSmartMemory();
    await storageSet('smartMemory', this.smartMemory);
    this.notify('On-device Smart Engine memory cleared.');
  }

  /* ==========================================================================
   * Search Engines Management
   * ======================================================================== */

  public addCustomSearchEngine(name: string, rawBang: string, urlTemplate: string): boolean {
    const cleanName = name.trim();
    const cleanBang = rawBang.trim().startsWith('!')
      ? rawBang.trim().toLowerCase()
      : `!${rawBang.trim().toLowerCase()}`;
    const cleanTpl = urlTemplate.trim();

    if (!cleanName || cleanBang.length < 2 || !cleanTpl.includes('{q}')) {
      this.notify('Include {q} in the search URL template (e.g. https://kagi.com/search?q={q}).');
      return false;
    }

    const id = `custom-${Date.now().toString(36)}`;
    this.settings.searchEngines = [
      ...this.settings.searchEngines,
      {
        id,
        name: cleanName,
        shortLabel: cleanName.slice(0, 3).toUpperCase(),
        bang: cleanBang,
        domain: extractDomain(cleanTpl),
        urlTemplate: cleanTpl,
        enabled: true,
        isCustom: true
      }
    ];
    this.saveSettings();
    this.notify(`Added search engine "${cleanName}" (${cleanBang}).`);
    return true;
  }

  public removeSearchEngine(id: string): void {
    if (this.settings.searchEngines.length <= 1) return;
    this.settings.searchEngines = this.settings.searchEngines.filter((e) => e.id !== id);
    if (!this.settings.searchEngines.some((e) => e.enabled)) {
      this.settings.searchEngines[0].enabled = true;
    }
    this.saveSettings();
  }

  /* ==========================================================================
   * Layout, Widgets & 4K Wallpaper Controls
   * ======================================================================== */

  public setLayoutMode(mode: LayoutMode): void {
    const resolved = mode === 'minimal' ? 'ambient' : mode;
    this.settings.layoutMode = resolved;
    this.settingsOpen = false;
    this.saveSettings();
    if (typeof window !== 'undefined') {
      const nextHash = resolved === 'dashboard' ? '' : `#${resolved}`;
      const base = window.location.pathname + window.location.search;
      window.history.replaceState(null, '', nextHash ? `${base}${nextHash}` : base);
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
    if (resolved === 'discover' && this.discoverStories.length === 0) {
      this.refreshDiscover(false);
    }
  }

  public cycleTheme(): void {
    const order: CoveSettings['theme'][] = ['dark', 'light', 'system'];
    const idx = order.indexOf(this.settings.theme);
    this.settings.theme = order[(idx + 1) % order.length];
    this.saveSettings();
    const label =
      this.settings.theme === 'light'
        ? 'Alabaster Cloud (Light)'
        : this.settings.theme === 'dark'
          ? 'Midnight Cobalt (Dark)'
          : 'System Auto';
    this.notify(label);
  }

  public async selectWallpaper(idx: number): Promise<void> {
    const safeIdx =
      ((idx % CURATED_WALLPAPERS.length) + CURATED_WALLPAPERS.length) %
      CURATED_WALLPAPERS.length;
    this.settings.background.curatedIndex = safeIdx;
    const scene = CURATED_WALLPAPERS[safeIdx];
    this.settings.background.gradientId = scene.id;
    if (this.settings.background.type !== 'curated') {
      this.settings.background.type = 'wallpaper';
    }
    this.recordSignal({ type: 'scene', curatedIndex: safeIdx, sceneName: scene.label });
    await this.refreshWallpaperAtmosphere();
    await this.saveSettings();
    this.notify(`${scene.label} · Luminance ${Math.round(this.atmosphere.overallLuminance * 100)}%`);
  }

  public cycleWallpaper(): void {
    const nextIdx = (this.settings.background.curatedIndex + 1) % CURATED_WALLPAPERS.length;
    if (this.settings.background.unsplashOptIn && this.settings.background.type === 'curated') {
      this.networkLedger.wallpaper += 1;
    }
    this.selectWallpaper(nextIdx);
  }

  public async setLocalWallpaperFile(file: File): Promise<void> {
    const reader = new FileReader();
    const dataUrl = await new Promise<string>((resolve, reject) => {
      reader.onload = () => resolve(String(reader.result));
      reader.onerror = () => reject(reader.error);
      reader.readAsDataURL(file);
    });
    this.localWallpaperUrl = dataUrl;
    await idbSetBlob('localWallpaper', dataUrl);
    this.settings.background.type = 'local';
    await this.refreshWallpaperAtmosphere();
    await this.saveSettings();
    this.notify('Custom wallpaper analyzed & adapted offline.');
  }

  public setAutonomyMode(mode: AutonomyMode): void {
    const se = this.settings.smartEngine;
    se.autonomyMode = mode;
    if (mode === 'autonomous') {
      se.enabled = true;
      se.autoShapeBento = true;
      se.autoEvolveScene = true;
      se.autoAdaptEngine = true;
      se.autonomousContext = true;
      se.adaptiveFocusDuration = true;
      se.smartSortLinks = true;
      se.markovPredictions = true;
      se.smartCommandSort = true;
      this.lastAutoSceneSlot = '';
      this.checkCircadianAutoScene();
    } else if (mode === 'assisted') {
      se.enabled = true;
      se.autoShapeBento = false;
      se.autoEvolveScene = false;
      se.autoAdaptEngine = true;
      se.smartSortLinks = true;
      se.markovPredictions = true;
    } else {
      se.autoShapeBento = false;
      se.autoEvolveScene = false;
      se.autoAdaptEngine = false;
      se.autonomousContext = false;
      se.adaptiveFocusDuration = false;
      se.smartSortLinks = false;
      se.markovPredictions = false;
    }
    this.saveSettings();
  }

  public toggleWidgetPin(widgetId: string): void {
    const w = this.settings.widgets.find((item) => item.id === widgetId);
    if (!w) return;
    w.pinned = !w.pinned;
    this.saveSettings();
  }

  public toggleWidgetVisibility(widgetType: WidgetType): void {
    const w = this.settings.widgets.find((item) => item.type === widgetType);
    if (w) {
      w.visible = !w.visible;
      this.saveSettings();
    }
  }

  public setWidgetSize(widgetId: string, size: WidgetSize): void {
    const w = this.settings.widgets.find((item) => item.id === widgetId);
    if (!w) return;
    w.size = size;
    this.saveSettings();
  }

  public cycleWidgetSize(widgetId: string): void {
    const w = this.settings.widgets.find((item) => item.id === widgetId);
    if (!w) return;
    const sizes: WidgetSize[] = ['S', 'M', 'L'];
    w.size = sizes[(sizes.indexOf(w.size) + 1) % sizes.length];
    this.saveSettings();
  }

  public moveWidgetOrder(widgetId: string, dir: -1 | 1): void {
    const sorted = [...this.settings.widgets].sort((a, b) => a.order - b.order);
    const idx = sorted.findIndex((w) => w.id === widgetId);
    const targetIdx = idx + dir;
    if (idx < 0 || targetIdx < 0 || targetIdx >= sorted.length) return;
    const [moved] = sorted.splice(idx, 1);
    sorted.splice(targetIdx, 0, moved);
    sorted.forEach((w, i) => {
      w.order = i;
    });
    this.settings.widgets = sorted;
    this.saveSettings();
  }

  public reorderWidgets(draggedId: string, targetId: string): void {
    if (draggedId === targetId) return;
    const sorted = [...this.settings.widgets].sort((a, b) => a.order - b.order);
    const fromIdx = sorted.findIndex((w) => w.id === draggedId);
    const toIdx = sorted.findIndex((w) => w.id === targetId);
    if (fromIdx < 0 || toIdx < 0) return;
    const [moved] = sorted.splice(fromIdx, 1);
    sorted.splice(toIdx, 0, moved);
    sorted.forEach((w, i) => {
      w.order = i;
    });
    this.settings.widgets = sorted;
    this.saveSettings();
  }

  /* ==========================================================================
   * Real Workspace & Tab Triage Operations
   * ======================================================================== */

  public async refreshTabs(): Promise<void> {
    const tabs = await queryBrowserTabs();
    this.openTabs = tabs;
    const plainTabs: BrowserTabItem[] = JSON.parse(JSON.stringify(tabs));
    if (this.triageWorker) {
      this.workerReqSeq += 1;
      this.triageWorker.postMessage({
        requestId: this.workerReqSeq,
        tabs: plainTabs,
        staleHoursThreshold: this.settings.staleHoursThreshold
      });
    } else {
      this.triage = computeTabTriage(plainTabs, this.settings.staleHoursThreshold);
    }
  }

  public async trackAndResolveWorkspaceUrl(url: string, initialTitle?: string): Promise<void> {
    if (this.isExtension) return;
    const created = await recordLaunchedWorkspaceUrl(url, initialTitle);
    await this.refreshTabs();

    if (!initialTitle || initialTitle === created.domain) {
      try {
        const html = await fetchOptInText(created.url);
        const doc = new DOMParser().parseFromString(html, 'text/html');
        const realTitle =
          doc.querySelector('meta[property="og:title"]')?.getAttribute('content') ||
          doc.querySelector('title')?.textContent;
        if (realTitle?.trim()) {
          await updateLaunchedTabTitle(created.id, realTitle.trim().slice(0, 120));
          await this.refreshTabs();
        }
      } catch {
        // Keep domain title
      }
    }
  }

  public async smartSweepTabs(): Promise<void> {
    const dupeIds: number[] = [];
    for (const grp of this.triage.duplicateGroups) {
      for (let i = 1; i < grp.tabs.length; i++) {
        if (!grp.tabs[i].pinned) dupeIds.push(grp.tabs[i].id);
      }
    }
    let closed = 0;
    if (dupeIds.length) {
      closed = await closeBrowserTabs(dupeIds);
    }
    await this.refreshTabs();
    const staleIds = this.triage.staleTabs.filter((t) => !t.pinned).map((t) => t.id);
    let suspended = 0;
    let savedMb = 0;
    if (staleIds.length) {
      const res = await suspendBrowserTabs(staleIds);
      suspended = res.count;
      savedMb = res.savedMb;
    }
    await this.refreshTabs();
    this.recordSignal({ type: 'widget', widgetType: 'triage' });
    if (closed === 0 && suspended === 0) {
      this.notify('Workspace is already clean.');
    } else {
      this.notify(`Smart Sweep: ${closed} duplicate(s) removed · ${suspended} rested (~${savedMb} MB).`);
    }
  }

  public async toggleAudioMuteAll(): Promise<void> {
    const audio = this.triage.audioTabs;
    if (!audio.length) {
      this.notify('No audible tabs right now.');
      return;
    }
    const anyUnmuted = audio.some((t) => !t.muted);
    await setBrowserTabsMuted(
      audio.map((t) => t.id),
      anyUnmuted
    );
    await this.refreshTabs();
    this.notify(
      anyUnmuted ? `Muted ${audio.length} audio tab(s).` : `Unmuted ${audio.length} audio tab(s).`
    );
  }

  public async deduplicateDomainTabs(domain?: string): Promise<void> {
    const groups = domain
      ? this.triage.duplicateGroups.filter((g) => g.domain === domain)
      : this.triage.duplicateGroups;
    const toClose: number[] = [];
    for (const grp of groups) {
      for (let i = 1; i < grp.tabs.length; i++) {
        if (!grp.tabs[i].pinned) {
          toClose.push(grp.tabs[i].id);
        }
      }
    }
    if (!toClose.length) {
      this.notify('No duplicate tabs to close.');
      return;
    }
    const closed = await closeBrowserTabs(toClose);
    await this.refreshTabs();
    this.recordSignal({ type: 'widget', widgetType: 'triage' });
    this.notify(`Kept newest, removed ${closed} duplicate(s).`);
  }

  public async suspendStaleTabs(): Promise<void> {
    const ids = this.triage.staleTabs.map((t) => t.id);
    if (!ids.length) {
      this.notify('No stale tabs right now.');
      return;
    }
    const { count, savedMb } = await suspendBrowserTabs(ids);
    await this.refreshTabs();
    this.recordSignal({ type: 'widget', widgetType: 'triage' });
    this.notify(`Rested ${count} stale tab(s) · ~${savedMb} MB freed.`);
  }

  public async suspendHeavyTabs(): Promise<void> {
    const ids = this.triage.heavyTabs.filter((t) => !t.pinned).map((t) => t.id);
    if (!ids.length) {
      this.notify('No heavy background tabs to suspend.');
      return;
    }
    const { count, savedMb } = await suspendBrowserTabs(ids);
    await this.refreshTabs();
    this.notify(`Suspended ${count} heavy tab(s) · ~${savedMb} MB freed.`);
  }

  public async openTabsWithUpdates(): Promise<void> {
    const updates = this.triage.updateTabs;
    if (!updates.length) {
      this.notify('No unread badges detected.');
      return;
    }
    await focusBrowserTab(updates[0]);
    await this.refreshTabs();
  }

  public async groupOpenTabsByDomain(): Promise<void> {
    const count = await groupTabsByDomain();
    await this.refreshTabs();
    this.notify(
      count > 0 ? `Grouped ${count} domain cluster(s).` : 'No multi-tab domains to group.'
    );
  }

  public async closeSingleTab(tabId: number): Promise<void> {
    await closeBrowserTabs([tabId]);
    await this.refreshTabs();
  }

  public async jumpToTab(tab: BrowserTabItem): Promise<void> {
    if (this.checkUrlBlocked(tab.url)) return;
    this.recordSignal({ type: 'tab', url: tab.url, title: tab.title });
    const msg = await focusBrowserTab(tab);
    await this.refreshTabs();
    this.notify(msg);
  }

  public async saveCurrentSession(name?: string): Promise<void> {
    if (this.openTabs.length === 0) {
      this.notify('Open or add URLs to your workspace first before saving a session.');
      return;
    }
    const cleanName =
      name?.trim() ||
      `${this.activeContext === 'work' ? 'Work' : 'Personal'} · ${new Date().toLocaleTimeString([], {
        hour: '2-digit',
        minute: '2-digit'
      })}`;
    const items = this.openTabs.map((t) => ({
      url: t.url,
      title: t.title,
      domain: t.domain,
      groupName: t.groupTitle,
      pinned: t.pinned
    }));
    const sess: TabSession = {
      id: `sess-${Date.now()}`,
      name: cleanName,
      createdAt: Date.now(),
      context: this.activeContext,
      tabs: items
    };
    this.sessions = [sess, ...this.sessions];
    await storageSet('sessions', this.sessions);
    this.notify(`Saved "${cleanName}" (${items.length} tabs).`);
  }

  public async createSessionFromUrls(name: string, rawLines: string): Promise<void> {
    const urls = rawLines
      .split(/\r?\n/)
      .map((l) => l.trim())
      .filter(Boolean);
    if (!urls.length) return;
    const items = urls.map((u) => {
      const full = /^https?:\/\//i.test(u) ? u : `https://${u}`;
      const dom = extractDomain(full);
      return { url: full, title: dom, domain: dom };
    });
    const sess: TabSession = {
      id: `sess-${Date.now()}`,
      name: name.trim() || `Session (${items.length})`,
      createdAt: Date.now(),
      context: this.activeContext,
      tabs: items
    };
    this.sessions = [sess, ...this.sessions];
    await storageSet('sessions', this.sessions);
    this.notify(`Created session "${sess.name}" (${items.length} links).`);
  }

  public async restoreSession(sessionId: string): Promise<void> {
    const sess = this.sessions.find((s) => s.id === sessionId);
    if (!sess) return;
    const msg = await restoreTabSessionInBrowser(sess);
    await this.refreshTabs();
    this.notify(msg);
  }

  public async deleteSession(sessionId: string): Promise<void> {
    this.sessions = this.sessions.filter((s) => s.id !== sessionId);
    await storageSet('sessions', this.sessions);
  }

  /* ==========================================================================
   * Quick Links & Real Bookmark Import
   * ======================================================================== */

  public openQuickLink(item: QuickLinkItem, newTab = true): void {
    const grp = this.quickLinkGroups.find((g) => g.id === item.groupId);
    this.recordSignal({
      type: 'link',
      linkId: item.id,
      url: item.url,
      title: item.title,
      contextKind: grp?.context
    });
    this.openUrlSafely(item.url, newTab, item.title);
  }

  public async addQuickLink(item: Omit<QuickLinkItem, 'id'>): Promise<void> {
    const domain = extractDomain(item.url);
    const created: QuickLinkItem = {
      ...item,
      id: `ql-${Date.now()}-${Math.random().toString(36).slice(2, 5)}`,
      badgeDomain: item.badgeDomain || domain
    };
    this.quickLinks = [...this.quickLinks, created];
    await storageSet('quickLinks', this.quickLinks);
    this.notify(`Added ${created.title}.`);
  }

  public async importBookmarksHtmlFile(rawHtml: string): Promise<number> {
    const parsed = parseNetscapeBookmarksHtml(rawHtml);
    if (!parsed.length) {
      this.notify('No valid http/https bookmarks found in file.');
      return 0;
    }
    const existingUrls = new Set(this.quickLinks.map((q) => q.url));
    const added: QuickLinkItem[] = [];
    for (const bm of parsed.slice(0, 36)) {
      if (existingUrls.has(bm.url)) continue;
      existingUrls.add(bm.url);
      added.push({
        id: `ql-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
        title: bm.title.slice(0, 28),
        url: bm.url,
        groupId: 'grp-work',
        badgeDomain: extractDomain(bm.url)
      });
    }
    if (added.length > 0) {
      this.quickLinks = [...this.quickLinks, ...added];
      await storageSet('quickLinks', this.quickLinks);
      this.notify(`Imported ${added.length} browser bookmarks into Quick Access.`);
    } else {
      this.notify('All bookmarks in file are already in Quick Access.');
    }
    return added.length;
  }

  public async updateQuickLink(updated: QuickLinkItem): Promise<void> {
    this.quickLinks = this.quickLinks.map((q) => (q.id === updated.id ? updated : q));
    await storageSet('quickLinks', this.quickLinks);
  }

  public async removeQuickLink(id: string): Promise<void> {
    this.quickLinks = this.quickLinks.filter((q) => q.id !== id);
    await storageSet('quickLinks', this.quickLinks);
  }

  public async reorderQuickLinks(fromId: string, toId: string): Promise<void> {
    if (fromId === toId) return;
    const arr = [...this.quickLinks];
    const fromIdx = arr.findIndex((i) => i.id === fromId);
    const toIdx = arr.findIndex((i) => i.id === toId);
    if (fromIdx < 0 || toIdx < 0) return;
    const [moved] = arr.splice(fromIdx, 1);
    arr.splice(toIdx, 0, moved);
    this.quickLinks = arr;
    await storageSet('quickLinks', this.quickLinks);
  }

  public async addQuickLinkGroup(name: string, context: QuickLinkGroup['context']): Promise<string> {
    const id = `grp-${Date.now()}`;
    this.quickLinkGroups = [...this.quickLinkGroups, { id, name, context }];
    await storageSet('quickLinkGroups', this.quickLinkGroups);
    return id;
  }

  /* ==========================================================================
   * Focus Engine, Multi-Layer Sound Studio & Site Blocker
   * ======================================================================== */

  public checkUrlBlocked(url: string): boolean {
    if (!this.isBlockerCurrentlyEnforced) return false;
    const domain = extractDomain(url).toLowerCase();
    const matched = this.settings.focus.blockedDomains.find(
      (b) => domain === b.toLowerCase() || domain.endsWith(`.${b.toLowerCase()}`)
    );
    if (matched) {
      this.blockedPreviewDomain = matched;
      return true;
    }
    return false;
  }

  public openUrlSafely(url: string, newTab = true, titleHint?: string): void {
    const normalized = /^https?:\/\//i.test(url) ? url : `https://${url}`;
    if (this.checkUrlBlocked(normalized)) return;
    this.trackAndResolveWorkspaceUrl(normalized, titleHint);
    if (newTab) {
      window.open(normalized, '_blank', 'noopener,noreferrer');
    } else {
      window.location.href = normalized;
    }
  }

  public selectFocusPhase(phase: 'work' | 'break' | 'longBreak'): void {
    this.pauseFocus();
    this.focusPhase = phase;
    const mins =
      phase === 'work'
        ? this.settings.focus.workMinutes
        : phase === 'break'
          ? this.settings.focus.breakMinutes
          : this.settings.focus.longBreakMinutes || 15;
    this.focusRemainingSec = mins * 60;
  }

  public startFocus(customMinutes?: number): void {
    if (customMinutes && customMinutes > 0) {
      this.settings.focus.workMinutes = customMinutes;
      this.focusPhase = 'work';
      this.focusRemainingSec = customMinutes * 60;
      this.saveSettings();
    }
    if (this.focusRunning) return;
    this.focusRunning = true;
    const f = this.settings.focus;

    // Auto-couple Brain.fm-style Neural Soundscape when starting Focus if enabled
    if (f.coupleSoundWithFocus && !this.audioPlaying) {
      const rec = this.settings.smartEngine.adaptiveSoundIntelligence
        ? this.recommendedNeural
        : { mode: 'deep_focus' as const, sound: 'rain' as const };
      const chosenMode = f.neuralMode && f.neuralMode !== 'off' ? f.neuralMode : rec.mode;
      this.setNeuralMode(chosenMode, true, true);
    } else if (f.coupleSoundWithFocus && this.audioPlaying && this.focusPhase === 'work' && f.neuralMode === 'unwind') {
      // Shift back up from Theta break into Beta/Alpha focus
      const rec = this.recommendedNeural;
      this.setNeuralMode(rec.mode === 'unwind' ? 'deep_focus' : rec.mode, false, true);
    }

    this.recordSignal({
      type: 'focus_start',
      minutes: Math.round(this.focusRemainingSec / 60) || f.workMinutes,
      sound: f.ambientSound,
      neuralMode: f.neuralMode
    });
    syncFocusBlocker(f.blockedDomains, this.isBlockerCurrentlyEnforced);

    if (this.audioPlaying) {
      this.syncAudioHardware();
    }

    if (this.focusInterval) window.clearInterval(this.focusInterval);
    this.focusInterval = window.setInterval(() => {
      if (this.focusRemainingSec > 1) {
        this.focusRemainingSec -= 1;
      } else {
        this.completeFocusPhase();
      }
    }, 1000);
  }

  public pauseFocus(): void {
    this.focusRunning = false;
    if (this.focusInterval) {
      window.clearInterval(this.focusInterval);
      this.focusInterval = null;
    }
    syncFocusBlocker(this.settings.focus.blockedDomains, this.isBlockerCurrentlyEnforced);
  }

  public resetFocus(): void {
    if (this.focusPhase === 'work') {
      const elapsedMin = Math.floor(
        (this.settings.focus.workMinutes * 60 - this.focusRemainingSec) / 60
      );
      if (elapsedMin >= 5) {
        this.recordSignal({ type: 'focus_abort', elapsedMinutes: elapsedMin });
        if (
          this.settings.smartEngine.enabled &&
          this.settings.smartEngine.adaptiveFocusDuration &&
          this.smartMemory.preferredFocusMinutes !== this.settings.focus.workMinutes
        ) {
          this.settings.focus.workMinutes = this.smartMemory.preferredFocusMinutes;
          recordAutopilotAction(
            this.smartMemory,
            'Focus',
            `Calibrated sprint duration → ${this.settings.focus.workMinutes}m`
          );
          this.saveSettings();
        }
      }
    }
    this.pauseFocus();
    this.selectFocusPhase(this.focusPhase);
  }

  private completeFocusPhase(): void {
    const completedMins = this.settings.focus.workMinutes;
    this.pauseFocus();
    if (this.settings.focus.soundBell) {
      soundEngine.playCalmChime();
    }
    if (this.focusPhase === 'work') {
      const today = new Date().toISOString().slice(0, 10);
      if (this.settings.focus.lastCompletedDate !== today) {
        const yesterday = new Date(Date.now() - 86_400_000).toISOString().slice(0, 10);
        this.settings.focus.streakDays =
          this.settings.focus.lastCompletedDate === yesterday
            ? this.settings.focus.streakDays + 1
            : 1;
        this.settings.focus.lastCompletedDate = today;
        this.settings.focus.completedSessionsToday = 1;
      } else {
        this.settings.focus.completedSessionsToday += 1;
      }
      this.settings.focus.totalFocusMinutes =
        (this.settings.focus.totalFocusMinutes || 0) + completedMins;
      this.settings.focus.history = [
        {
          id: `fh-${Date.now()}`,
          completedAt: Date.now(),
          minutes: completedMins,
          intention: this.settings.focus.intention || 'Deep Work',
          neuralMode: this.settings.focus.neuralMode
        },
        ...(this.settings.focus.history || [])
      ].slice(0, 40);
      this.recordSignal({
        type: 'focus_complete',
        minutes: completedMins,
        neuralMode: this.settings.focus.neuralMode,
        sound: this.settings.focus.ambientSound
      });
      if (
        this.settings.smartEngine.enabled &&
        this.settings.smartEngine.adaptiveFocusDuration &&
        this.smartMemory.preferredFocusMinutes !== this.settings.focus.workMinutes
      ) {
        this.settings.focus.workMinutes = this.smartMemory.preferredFocusMinutes;
        recordAutopilotAction(
          this.smartMemory,
          'Focus',
          `Evolved optimal sprint → ${this.settings.focus.workMinutes}m`
        );
      }
      this.saveSettings();
      this.selectFocusPhase('break');
      // Gently morph neural entrainment down to 5.5 Hz Theta Unwind for restorative break
      if (this.audioPlaying && this.settings.focus.coupleSoundWithFocus && this.settings.focus.neuralMode !== 'off') {
        soundEngine.setNeuralState('unwind', 'subtle', this.settings.focus.speechBlocker);
      }
      this.notify('Sprint complete — shifting into restorative break.');
    } else {
      this.selectFocusPhase('work');
      this.notify('Break finished. Ready when you are.');
    }
  }

  private syncAudioHardware(): void {
    const f = this.settings.focus;
    soundEngine.setVolume(f.ambientVolume);
    soundEngine.setNeuralState(
      f.neuralMode || 'off',
      f.neuralDepth || 'balanced',
      f.speechBlocker !== false
    );
    soundEngine.applyMix(f.soundMix, f.ambientVolume);
  }

  public toggleAudioPlayback(): void {
    if (this.audioPlaying) {
      this.stopAllSounds();
    } else {
      this.playSmartNeuralSession();
    }
  }

  public playSmartNeuralSession(activity?: 'focus' | 'reading' | 'break'): void {
    const rec = getRecommendedNeuralProfile(this.smartMemory, this.now, activity);
    const f = this.settings.focus;
    const mode =
      !activity && f.neuralMode && f.neuralMode !== 'off' ? f.neuralMode : rec.mode;
    f.neuralMode = mode;

    const hasMix = Object.values(f.soundMix || {}).some((v) => v > 0.02);
    if (!hasMix) {
      f.soundMix = { ...NEURAL_MODES[mode].recommendedMix };
      const firstActive = Object.entries(f.soundMix).find(([, v]) => v > 0.02);
      f.ambientSound = firstActive ? (firstActive[0] as SoundscapeId) : 'none';
    }

    this.audioPlaying = true;
    this.syncAudioHardware();
    this.recordSignal({ type: 'neural_sound', mode, sound: f.ambientSound });
    this.saveSettings();
  }

  public setNeuralMode(
    mode: NeuralModeId,
    blendDefaultTexturesIfSilent = true,
    silentRecord = false
  ): void {
    const f = this.settings.focus;
    f.neuralMode = mode;

    if (mode === 'off') {
      const hasTextures = Object.values(f.soundMix || {}).some((v) => v > 0.02);
      if (!hasTextures) {
        this.audioPlaying = false;
        soundEngine.stop();
      } else {
        soundEngine.setNeuralState('off', f.neuralDepth, f.speechBlocker);
      }
      this.saveSettings();
      return;
    }

    const hasTextures = Object.values(f.soundMix || {}).some((v) => v > 0.02);
    if (!hasTextures && blendDefaultTexturesIfSilent) {
      f.soundMix = { ...NEURAL_MODES[mode].recommendedMix };
      const firstActive = Object.entries(f.soundMix).find(([, v]) => v > 0.02);
      f.ambientSound = firstActive ? (firstActive[0] as SoundscapeId) : 'none';
    }

    this.audioPlaying = true;
    this.syncAudioHardware();
    if (!silentRecord) {
      this.recordSignal({ type: 'neural_sound', mode, sound: f.ambientSound });
    }
    this.saveSettings();
  }

  public setNeuralDepth(depth: NeuralDepth): void {
    this.settings.focus.neuralDepth = depth;
    if (this.audioPlaying && this.settings.focus.neuralMode !== 'off') {
      soundEngine.setNeuralState(
        this.settings.focus.neuralMode,
        depth,
        this.settings.focus.speechBlocker
      );
    }
    this.saveSettings();
  }

  public toggleSpeechBlocker(): void {
    this.settings.focus.speechBlocker = !this.settings.focus.speechBlocker;
    if (this.audioPlaying) {
      soundEngine.setNeuralState(
        this.settings.focus.neuralMode,
        this.settings.focus.neuralDepth,
        this.settings.focus.speechBlocker
      );
    }
    this.saveSettings();
  }

  public setSoundFadeTimer(minutes: number | null): void {
    if (this.fadeTimer) {
      window.clearInterval(this.fadeTimer);
      this.fadeTimer = null;
    }
    this.soundFadeRemainingMin = minutes;
    if (!minutes) return;
    this.fadeTimer = window.setInterval(() => {
      if (this.soundFadeRemainingMin === null) return;
      if (this.soundFadeRemainingMin <= 1) {
        this.soundFadeRemainingMin = null;
        if (this.fadeTimer) window.clearInterval(this.fadeTimer);
        this.fadeTimer = null;
        this.stopAllSounds();
        this.notify('Neural soundscape faded out.');
      } else {
        this.soundFadeRemainingMin -= 1;
      }
    }, 60_000);
  }

  public setSoundTrackLevel(track: SoundTrackId, level: number): void {
    const clamped = Math.max(0, Math.min(1, level));
    this.settings.focus.soundMix[track] = clamped;
    const anyActive = Object.entries(this.settings.focus.soundMix).find(([, v]) => v > 0.02);
    this.settings.focus.ambientSound = anyActive ? (anyActive[0] as SoundscapeId) : 'none';
    const hasNeural = this.settings.focus.neuralMode && this.settings.focus.neuralMode !== 'off';
    if (anyActive || hasNeural) {
      this.audioPlaying = true;
      this.syncAudioHardware();
    } else {
      this.audioPlaying = false;
      soundEngine.stop();
    }
    this.saveSettings();
  }

  public setAmbientSound(id: SoundscapeId): void {
    this.settings.focus.ambientSound = id;
    this.settings.focus.soundMix = {
      waves: id === 'waves' ? 0.72 : 0,
      rain: id === 'rain' ? 0.72 : 0,
      cafe: id === 'cafe' ? 0.72 : 0,
      whitenoise: id === 'whitenoise' ? 0.72 : 0,
      wind: id === 'wind' ? 0.72 : 0
    };
    if (id === 'none' && this.settings.focus.neuralMode === 'off') {
      this.audioPlaying = false;
      soundEngine.stop();
    } else if (id === 'none') {
      this.settings.focus.neuralMode = 'off';
      this.audioPlaying = false;
      soundEngine.stop();
    } else {
      this.audioPlaying = true;
      this.syncAudioHardware();
    }
    this.saveSettings();
  }

  public stopAllSounds(): void {
    this.audioPlaying = false;
    this.setSoundFadeTimer(null);
    soundEngine.stop();
  }

  public cycleAmbientSound(step: 1 | -1 = 1): void {
    const idx = SOUNDSCAPE_CYCLE.indexOf(this.settings.focus.ambientSound);
    const next = SOUNDSCAPE_CYCLE[(idx + step + SOUNDSCAPE_CYCLE.length) % SOUNDSCAPE_CYCLE.length];
    this.setAmbientSound(next);
  }

  public setAmbientVolume(vol: number): void {
    this.settings.focus.ambientVolume = vol;
    soundEngine.setVolume(vol);
    this.saveSettings();
  }

  /* ==========================================================================
   * Real Read Later Queue & In-App Offline Article Reader
   * ======================================================================== */

  public async addReadLater(rawUrl: string, customTitle?: string, note?: string): Promise<void> {
    const url = /^https?:\/\//i.test(rawUrl.trim()) ? rawUrl.trim() : `https://${rawUrl.trim()}`;
    const domain = extractDomain(url);
    const item: ReadLaterItem = {
      id: `rl-${Date.now()}`,
      url,
      title: customTitle?.trim() || domain,
      domain,
      note: note?.trim() || undefined,
      addedAt: Date.now(),
      read: false
    };

    this.readLater = [item, ...this.readLater];
    this.recordSignal({ type: 'widget', widgetType: 'readlater' });
    await idbSaveAllReadLater(this.readLater);

    if (this.settings.readLaterFetchMetadataOptIn) {
      try {
        this.networkLedger.metadata += 1;
        const html = await fetchOptInText(url);
        const extracted = extractReadableArticle(html, url);
        this.readLater = this.readLater.map((r) =>
          r.id === item.id
            ? {
                ...r,
                title: customTitle?.trim() || extracted.title || domain,
                siteName: extracted.siteName,
                description: extracted.description,
                contentHtml: extracted.contentHtml,
                readingTimeMin: extracted.readingTimeMin,
                image: extracted.image
              }
            : r
        );
        await idbSaveAllReadLater(this.readLater);
        this.notify(
          `Saved "${extracted.title.slice(0, 36)}" (${extracted.readingTimeMin}m offline read).`
        );
        return;
      } catch {
        // Offline or blocked — keep URL card
      }
    }
    this.notify('Saved to Read Later.');
  }

  public async openArticleInReader(item: ReadLaterItem): Promise<void> {
    this.recordSignal({ type: 'widget', widgetType: 'readlater' });
    if (!item.contentHtml && this.settings.readLaterFetchMetadataOptIn) {
      try {
        this.networkLedger.metadata += 1;
        const html = await fetchOptInText(item.url);
        const extracted = extractReadableArticle(html, item.url);
        const enriched: ReadLaterItem = {
          ...item,
          title: extracted.title || item.title,
          siteName: extracted.siteName,
          description: extracted.description,
          contentHtml: extracted.contentHtml,
          readingTimeMin: extracted.readingTimeMin,
          image: extracted.image || item.image
        };
        this.readLater = this.readLater.map((r) => (r.id === item.id ? enriched : r));
        await idbSaveAllReadLater(this.readLater);
        this.openSavedInCoveNews(enriched);
        return;
      } catch {
        // Fall through to Cove News live/cached scraper
      }
    }
    this.openSavedInCoveNews(item);
  }

  public async toggleReadLaterReadState(id: string): Promise<void> {
    this.readLater = this.readLater.map((r) => (r.id === id ? { ...r, read: !r.read } : r));
    if (this.activeReaderItem?.id === id) {
      this.activeReaderItem = { ...this.activeReaderItem, read: !this.activeReaderItem.read };
    }
    await idbSaveAllReadLater(this.readLater);
  }

  public async removeReadLater(id: string): Promise<void> {
    this.readLater = this.readLater.filter((i) => i.id !== id);
    if (this.activeReaderItem?.id === id) this.activeReaderItem = null;
    await idbSaveAllReadLater(this.readLater);
  }

  public surpriseMeReadLater(): ReadLaterItem | null {
    if (!this.readLater.length) {
      this.notify('Save an article URL first to use Surprise Me.');
      return null;
    }
    const pool = this.readLater.filter((r) => !r.read);
    const list = pool.length ? pool : this.readLater;
    const pick = list[Math.floor(Math.random() * list.length)];
    this.openArticleInReader(pick);
    return pick;
  }

  public exportReadLaterHtml(): void {
    const rows = this.readLater
      .map(
        (item) =>
          `<DT><A HREF="${item.url}" ADD_DATE="${Math.floor(item.addedAt / 1000)}">${item.title}</A>${
            item.note ? `<DD>${item.note}` : ''
          }`
      )
      .join('\n    ');
    const html = `<!DOCTYPE NETSCAPE-Bookmark-file-1>\n<META HTTP-EQUIV="Content-Type" CONTENT="text/html; charset=UTF-8">\n<TITLE>Cove Read Later</TITLE>\n<H1>Cove Read Later Queue</H1>\n<DL><p>\n    ${rows}\n</DL><p>\n`;
    const blob = new Blob([html], { type: 'text/html' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = `cove-read-later-${new Date().toISOString().slice(0, 10)}.html`;
    a.click();
    URL.revokeObjectURL(a.href);
  }

  /* ==========================================================================
   * Live Search Autocomplete
   * ======================================================================== */

  public async fetchLiveSearchSuggestions(q: string): Promise<string[]> {
    if (!this.settings.liveSearchSuggestions || q.trim().length < 2) return [];
    try {
      this.networkLedger.searchSuggest += 1;
      const raw = await fetchOptInText(
        `https://duckduckgo.com/ac/?q=${encodeURIComponent(q.trim())}&type=list`
      );
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed) && Array.isArray(parsed[1])) {
        return parsed[1].filter((s: unknown) => typeof s === 'string').slice(0, 4);
      }
      return [];
    } catch {
      return [];
    }
  }

  /* ==========================================================================
   * Local Notes & Interactive Tasks
   * ======================================================================== */

  public scheduleSaveNotes(): void {
    this.recordSignal({ type: 'widget', widgetType: 'notes' });
    if (this.notesDebounceTimer) window.clearTimeout(this.notesDebounceTimer);
    this.notesDebounceTimer = window.setTimeout(() => {
      storageSet('notes', this.notes);
    }, 450);
  }

  public createNote(title = 'Untitled', content = ''): string {
    const id = `note-${Date.now()}`;
    const note: NoteItem = {
      id,
      title,
      content,
      pinned: false,
      updatedAt: Date.now()
    };
    this.notes = [note, ...this.notes];
    storageSet('notes', this.notes);
    return id;
  }

  public quickCaptureNote(line: string): void {
    const pinned = this.notes.find((n) => n.pinned) || this.notes[0];
    if (pinned) {
      pinned.content = `${pinned.content.trim()}\n- [ ] ${line.trim()}`.trim();
      pinned.updatedAt = Date.now();
      storageSet('notes', this.notes);
    } else {
      this.createNote('Today', `- [ ] ${line.trim()}`);
    }
    this.notify('Added to Notes.');
  }

  public togglePinNote(id: string): void {
    this.notes = this.notes.map((n) => (n.id === id ? { ...n, pinned: !n.pinned } : n));
    storageSet('notes', this.notes);
  }

  public deleteNote(id: string): void {
    this.notes = this.notes.filter((n) => n.id !== id);
    storageSet('notes', this.notes);
  }

  /* ==========================================================================
   * Weather Observatory
   * ======================================================================== */

  public async refreshWeather(force = false): Promise<void> {
    if (!this.settings.weather.enabledOptIn) return;
    const thirtyMin = 30 * 60_000;
    if (
      !force &&
      this.weatherCache &&
      this.weatherCache.city === this.settings.weather.city &&
      this.weatherCache.daily?.length &&
      Date.now() - this.weatherCache.fetchedAt < thirtyMin
    ) {
      return;
    }

    this.weatherLoading = true;
    this.weatherError = null;
    try {
      this.networkLedger.weather += 1;
      const { latitude, longitude, city } = this.settings.weather;
      const url = `https://api.open-meteo.com/v1/forecast?latitude=${latitude}&longitude=${longitude}&current=temperature_2m,apparent_temperature,relative_humidity_2m,weather_code,wind_speed_10m&hourly=temperature_2m,weather_code&daily=weather_code,temperature_2m_max,temperature_2m_min,uv_index_max,sunrise,sunset&timezone=auto&forecast_days=5`;
      const res = await fetch(url);
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();

      const hourlyTimes: string[] = data.hourly?.time || [];
      const hourlyTemps: number[] = data.hourly?.temperature_2m || [];
      const hourlyCodes: number[] = data.hourly?.weather_code || [];
      const nowIsoHour = new Date().toISOString().slice(0, 13);
      let startIdx = hourlyTimes.findIndex((t) => t.slice(0, 13) >= nowIsoHour);
      if (startIdx < 0) startIdx = new Date().getHours();

      const hourly: WeatherHourlyPoint[] = [];
      for (let i = startIdx; i < Math.min(startIdx + 12, hourlyTimes.length); i++) {
        hourly.push({
          time: hourlyTimes[i].slice(11, 16),
          tempC: Math.round(hourlyTemps[i]),
          weatherCode: hourlyCodes[i]
        });
      }

      const dailyDates: string[] = data.daily?.time || [];
      const daily: WeatherDailyPoint[] = dailyDates.slice(0, 5).map((d, i) => ({
        date: d,
        highC: Math.round(data.daily.temperature_2m_max[i]),
        lowC: Math.round(data.daily.temperature_2m_min[i]),
        weatherCode: data.daily.weather_code[i]
      }));

      const cache: WeatherCache = {
        fetchedAt: Date.now(),
        city,
        tempC: Math.round(data.current.temperature_2m),
        feelsLikeC: Math.round(data.current.apparent_temperature ?? data.current.temperature_2m),
        humidity: Math.round(data.current.relative_humidity_2m ?? 50),
        uvIndex:
          data.daily?.uv_index_max?.[0] !== undefined
            ? Math.round(data.daily.uv_index_max[0])
            : undefined,
        sunrise: data.daily?.sunrise?.[0]?.slice(11, 16),
        sunset: data.daily?.sunset?.[0]?.slice(11, 16),
        highC: Math.round(data.daily.temperature_2m_max[0]),
        lowC: Math.round(data.daily.temperature_2m_min[0]),
        weatherCode: data.current.weather_code,
        windKmh: Math.round(data.current.wind_speed_10m),
        hourly,
        daily
      };
      this.weatherCache = cache;
      await storageSet('weatherCache', cache);
    } catch {
      this.weatherError = 'Weather service unreachable offline.';
    } finally {
      this.weatherLoading = false;
    }
  }

  public async searchWeatherCities(query: string): Promise<GeocodedCityOption[]> {
    const q = query.trim();
    if (q.length < 2) return [];
    try {
      this.networkLedger.weather += 1;
      const res = await fetch(
        `https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(q)}&count=5&language=en&format=json`
      );
      if (!res.ok) return [];
      const data = await res.json();
      return (data?.results || []).map((r: any) => ({
        name: r.name,
        admin1: r.admin1,
        country: r.country,
        latitude: r.latitude,
        longitude: r.longitude
      }));
    } catch {
      return [];
    }
  }

  public async selectGeocodedCity(opt: GeocodedCityOption): Promise<void> {
    this.settings.weather.city = opt.name;
    this.settings.weather.country = opt.country;
    this.settings.weather.latitude = opt.latitude;
    this.settings.weather.longitude = opt.longitude;
    await this.saveSettings();
    await this.refreshWeather(true);
    this.notify(`Weather set to ${opt.name}${opt.country ? `, ${opt.country}` : ''}.`);
  }

  public async setWeatherCityByName(query: string): Promise<boolean> {
    const hits = await this.searchWeatherCities(query);
    if (!hits.length) {
      this.notify(`City "${query.trim()}" not found.`);
      return false;
    }
    await this.selectGeocodedCity(hits[0]);
    return true;
  }

  public async useBrowserGeolocation(): Promise<void> {
    if (!navigator.geolocation) {
      this.notify('Geolocation is not supported in this browser.');
      return;
    }
    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        const lat = Number(pos.coords.latitude.toFixed(4));
        const lon = Number(pos.coords.longitude.toFixed(4));
        let label = 'Local Sky';
        try {
          this.networkLedger.weather += 1;
          const rev = await fetch(
            `https://api.bigdatacloud.net/data/reverse-geocode-client?latitude=${lat}&longitude=${lon}&localityLanguage=en`
          );
          if (rev.ok) {
            const j = await rev.json();
            label = j.city || j.locality || j.principalSubdivision || 'My Location';
          }
        } catch {
          // Keep Local Sky
        }
        this.settings.weather.city = label;
        this.settings.weather.latitude = lat;
        this.settings.weather.longitude = lon;
        await this.saveSettings();
        await this.refreshWeather(true);
        this.notify(`Updated weather to ${label}.`);
      },
      () => {
        this.notify('Location permission declined — search any city manually.');
      },
      { timeout: 8000 }
    );
  }

  /* ==========================================================================
   * RSS Reader
   * ======================================================================== */

  public async refreshRss(force = false): Promise<void> {
    if (!this.settings.rssOptIn || !this.rssFeeds.length) {
      this.rssEntries = [];
      return;
    }
    const lastFetched = await storageGet<number>('rssFetchedAt', 0);
    if (!force && this.rssEntries.length > 0 && Date.now() - lastFetched < 20 * 60_000) {
      return;
    }

    this.rssLoading = true;
    this.rssError = null;
    try {
      const results = await Promise.allSettled(
        this.rssFeeds.slice(0, 5).map(async (feed) => {
          this.networkLedger.rss += 1;
          const xml = await fetchOptInText(feed.url);
          return parseFeedXml(xml, feed.title);
        })
      );

      const merged: RssEntry[] = [];
      for (const r of results) {
        if (r.status === 'fulfilled') {
          merged.push(...r.value);
        }
      }
      merged.sort((a, b) => b.publishedAt - a.publishedAt);
      const top10 = merged.slice(0, 10);
      if (top10.length > 0) {
        this.rssEntries = top10;
        await storageSet('rssCache', top10);
        await storageSet('rssFetchedAt', Date.now());
      } else if (this.rssEntries.length === 0) {
        this.rssError = 'Could not load feed items right now.';
      }
    } catch {
      this.rssError = 'Feed refresh paused offline.';
    } finally {
      this.rssLoading = false;
    }
  }

  public async addRssFeed(title: string, url: string): Promise<void> {
    if (this.rssFeeds.length >= 5) {
      this.notify('Maximum of 5 RSS feeds reached.');
      return;
    }
    const normalized = /^https?:\/\//i.test(url.trim()) ? url.trim() : `https://${url.trim()}`;
    const feed: RssFeedSource = {
      id: `rss-${Date.now()}`,
      title: title.trim() || extractDomain(normalized),
      url: normalized
    };
    this.rssFeeds = [...this.rssFeeds, feed];
    await storageSet('rssFeeds', this.rssFeeds);
    await this.refreshRss(true);
  }

  public async removeRssFeed(id: string): Promise<void> {
    this.rssFeeds = this.rssFeeds.filter((f) => f.id !== id);
    await storageSet('rssFeeds', this.rssFeeds);
    await this.refreshRss(true);
  }

  /* ==========================================================================
   * Countdowns & Data Backup
   * ======================================================================== */

  public async addCountdown(label: string, targetDate: string): Promise<void> {
    this.countdowns = [
      ...this.countdowns,
      { id: `cd-${Date.now()}`, label: label.trim(), targetDate, createdAt: Date.now() }
    ];
    await storageSet('countdowns', this.countdowns);
  }

  public async removeCountdown(id: string): Promise<void> {
    this.countdowns = this.countdowns.filter((c) => c.id !== id);
    await storageSet('countdowns', this.countdowns);
  }

  public exportAllDataJson(): void {
    const payload: CoveFullExport = {
      exportedAt: new Date().toISOString(),
      app: 'Cove',
      version: 6,
      settings: JSON.parse(JSON.stringify(this.settings)),
      smartMemory: JSON.parse(JSON.stringify(this.smartMemory)),
      quickLinkGroups: JSON.parse(JSON.stringify(this.quickLinkGroups)),
      quickLinks: JSON.parse(JSON.stringify(this.quickLinks)),
      notes: JSON.parse(JSON.stringify(this.notes)),
      sessions: JSON.parse(JSON.stringify(this.sessions)),
      readLater: JSON.parse(JSON.stringify(this.readLater)),
      rssFeeds: JSON.parse(JSON.stringify(this.rssFeeds)),
      countdowns: JSON.parse(JSON.stringify(this.countdowns))
    };

    const blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = `cove-backup-${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    URL.revokeObjectURL(a.href);
    this.notify('Exported full Cove backup.');
  }

  public async importAllDataJson(rawJson: string): Promise<boolean> {
    try {
      if (typeof rawJson !== 'string' || rawJson.length > 25_000_000) {
        this.notify('Backup is too large. Cove accepts files up to 25 MB.');
        return false;
      }
      const parsed = JSON.parse(rawJson) as Partial<CoveFullExport>;
      if (!parsed || parsed.app !== 'Cove' || !parsed.settings) {
        this.notify('Invalid Cove backup file.');
        return false;
      }
      const base = createDefaultSettings();
      this.settings = sanitizeImportedSettings(parsed.settings, base);
      if (parsed.smartMemory) this.smartMemory = upgradeSmartMemory(parsed.smartMemory);
      if (Array.isArray(parsed.quickLinkGroups)) {
        this.quickLinkGroups = sanitizeQuickLinkGroups(parsed.quickLinkGroups);
      }
      if (Array.isArray(parsed.quickLinks)) {
        this.quickLinks = sanitizeQuickLinks(parsed.quickLinks);
      }
      if (Array.isArray(parsed.notes)) this.notes = sanitizeNotes(parsed.notes);
      if (Array.isArray(parsed.sessions)) this.sessions = sanitizeSessions(parsed.sessions);
      if (Array.isArray(parsed.readLater)) this.readLater = sanitizeReadLater(parsed.readLater);
      if (Array.isArray(parsed.rssFeeds)) this.rssFeeds = sanitizeRssFeeds(parsed.rssFeeds);
      if (Array.isArray(parsed.countdowns)) this.countdowns = sanitizeCountdowns(parsed.countdowns);

      this.applyDomTheme();
      await this.refreshWallpaperAtmosphere();
      await Promise.all([
        storageSet('settings', this.settings),
        storageSet('smartMemory', this.smartMemory),
        storageSet('quickLinkGroups', this.quickLinkGroups),
        storageSet('quickLinks', this.quickLinks),
        storageSet('notes', this.notes),
        storageSet('sessions', this.sessions),
        storageSet('rssFeeds', this.rssFeeds),
        storageSet('countdowns', this.countdowns),
        idbSaveAllReadLater(this.readLater)
      ]);
      this.notify('Restored settings, Smart Engine memory, sessions, and queues.');
      return true;
    } catch {
      this.notify('Could not parse JSON backup.');
      return false;
    }
  }

  /* ==========================================================================
     COVE DISCOVER, INDEXEDDB NEWS CACHE & AD-FREE COVE NEWS READER
     ========================================================================== */

  public isStoryCached(url: string): boolean {
    const key = normalizeStoryKey(url);
    return Boolean(getMemoryCachedArticle(key) || this.cachedArticleKeys.includes(key));
  }

  public async refreshDiscover(force = false): Promise<void> {
    if (this.settings.discoverOptIn === false) return;
    const ageMs = Date.now() - this.discoverLastFetchedAt;
    if (!force && this.discoverStories.length > 0 && ageMs < 3 * 60_000) {
      // Pre-warm lead story silently if not cached yet
      if (this.rankedDiscoverStories[0]) {
        this.prefetchDiscoverArticle(this.rankedDiscoverStories[0]);
      }
      return;
    }

    const hasCached = this.discoverStories.length > 0;
    if (hasCached && !force) {
      this.discoverRevalidating = true;
    } else {
      this.discoverLoading = true;
    }

    try {
      this.networkLedger.rss += 1;
      const stories = ensureUniqueStoryIds(await fetchAllDiscoverStories(this.rssFeeds, force));
      if (stories.length > 0) {
        this.discoverStories = stories;
        this.discoverLastFetchedAt = Date.now();
        this.discoverFromCache = false;
        await saveCachedDiscoverFeed(stories, this.discoverLastFetchedAt);

        // Pre-cache #1 hero lead story silently for 0ms instant reader open
        const topStory = rankStoriesForUser(stories, this.discoverProfile, this.discoverActiveTopic)[0];
        if (topStory) {
          this.prefetchDiscoverArticle(topStory);
        }
      }

      // Merge any custom user-followed feeds asynchronously without blocking feed paint
      fetchCustomRssStories(this.rssFeeds).then(async (customItems) => {
        if (customItems.length > 0) {
          const existingUrls = new Set(this.discoverStories.map((s) => s.url));
          const uniqueCustom = customItems.filter((c) => !existingUrls.has(c.url));
          if (uniqueCustom.length > 0) {
            this.discoverStories = ensureUniqueStoryIds([
              ...uniqueCustom,
              ...this.discoverStories
            ]);
            await saveCachedDiscoverFeed(this.discoverStories, this.discoverLastFetchedAt);
          }
        }
      });
    } finally {
      this.discoverLoading = false;
      this.discoverRevalidating = false;
    }
  }

  public async prefetchDiscoverArticle(story: DiscoverStory): Promise<void> {
    if (!story?.url) return;
    const key = normalizeStoryKey(story.url);
    if (this.isStoryCached(key) || this.inFlightPrefetches.has(key)) return;

    this.inFlightPrefetches.add(key);
    try {
      const existing = await getCachedFullArticle(key);
      if (existing) {
        if (!this.cachedArticleKeys.includes(key)) {
          this.cachedArticleKeys = [...this.cachedArticleKeys, key];
        }
        return;
      }
      this.networkLedger.metadata += 1;
      const article = await fetchFullCoveNewsArticle(story);
      if (article?.contentHtml) {
        await saveCachedFullArticle(key, article);
        if (!this.cachedArticleKeys.includes(key)) {
          this.cachedArticleKeys = [...this.cachedArticleKeys, key];
        }
      }
    } catch {
      // silent background prefetch
    } finally {
      this.inFlightPrefetches.delete(key);
    }
  }

  public async precacheTopDiscoverArticles(count = 6): Promise<void> {
    if (this.precacheRunning) return;
    const targets = this.rankedDiscoverStories.slice(0, count);
    if (targets.length === 0) return;
    this.precacheRunning = true;
    try {
      await Promise.all(targets.map((s) => this.prefetchDiscoverArticle(s)));
      this.notify(`Cached top ${targets.length} full articles for 0ms offline reading.`);
    } finally {
      this.precacheRunning = false;
    }
  }

  public async purgeDiscoverCache(): Promise<void> {
    await clearAllNewsCache();
    this.cachedArticleKeys = [];
    this.discoverFromCache = false;
    this.notify('Cleared Discover & Cove News cache — syncing fresh stories…');
    await this.refreshDiscover(true);
  }

  public async followDiscoverFeed(name: string, rawUrl: string): Promise<boolean> {
    const cleanUrl = rawUrl.trim();
    if (!/^https?:\/\//i.test(cleanUrl)) {
      this.notify('Enter a valid https:// RSS or Atom feed URL');
      return false;
    }
    const label = name.trim() || extractDomain(cleanUrl);
    if (!this.rssFeeds.some((f) => f.url.toLowerCase() === cleanUrl.toLowerCase())) {
      this.rssFeeds = [
        {
          id: `custom-${Date.now()}`,
          title: label,
          url: cleanUrl
        },
        ...this.rssFeeds
      ];
      await storageSet('rssFeeds', this.rssFeeds);
    }
    this.notify(`Following ${label} in Cove Discover…`);
    await this.refreshDiscover(true);
    return true;
  }

  public openSavedInCoveNews(item: ReadLaterItem): void {
    const pub = item.siteName || item.domain;
    const syntheticStory: DiscoverStory = {
      id: `saved-${item.id}`,
      title: item.title,
      summary: item.description || item.title,
      highlights: [],
      url: item.url,
      domain: item.domain,
      publisher: pub,
      verified: true,
      topic: 'tech-ai',
      bannerUrl: item.image,
      publishedAt: item.addedAt,
      readingTimeMin: item.readingTimeMin || 4
    };
    this.activeDiscoverStory = syntheticStory;
    this.coveNewsMode = 'article';
    this.coveNewsLoading = false;
    this.coveNewsWasCached = true;
    if (item.contentHtml && item.contentHtml.length > 60) {
      this.coveNewsArticle = {
        title: item.title,
        publisher: pub,
        domain: item.domain,
        publishedAt: item.addedAt,
        bannerUrl: item.image,
        leadSummary: item.description || '',
        contentHtml: item.contentHtml,
        readingTimeMin: item.readingTimeMin || 4,
        wordCount: Math.max(80, (item.readingTimeMin || 4) * 210),
        sourceUrl: item.url
      };
    } else {
      this.openFullCoveNews(syntheticStory);
    }
  }

  public async openDiscoverBrief(story: DiscoverStory): Promise<void> {
    this.activeDiscoverStory = story;
    this.coveNewsMode = 'brief';
    this.coveNewsArticle = null;
    this.coveNewsWasCached = this.isStoryCached(story.url);
    // Pre-fetch & cache the full article immediately while user reads the 15s brief!
    this.prefetchDiscoverArticle(story);
    this.discoverProfile = recordDiscoverFeedback(this.discoverProfile, story, 'brief');
    await storageSet('discoverProfile', this.discoverProfile);
  }

  public async openFullCoveNews(story?: DiscoverStory): Promise<void> {
    const target = story || this.activeDiscoverStory;
    if (!target) return;
    this.activeDiscoverStory = target;
    this.coveNewsMode = 'article';
    this.discoverProfile = recordDiscoverFeedback(this.discoverProfile, target, 'full_read');
    storageSet('discoverProfile', this.discoverProfile);

    const key = normalizeStoryKey(target.url);
    // 1. Synchronous memory cache check (0ms instant paint, zero spinner!)
    const memHit = getMemoryCachedArticle(key);
    if (memHit) {
      this.coveNewsArticle = memHit;
      this.coveNewsWasCached = true;
      this.coveNewsLoading = false;
      return;
    }

    // 2. IndexedDB cache check (< 4ms instant paint)
    this.coveNewsLoading = true;
    try {
      const idbHit = await getCachedFullArticle(key);
      if (idbHit) {
        this.coveNewsArticle = idbHit;
        this.coveNewsWasCached = true;
        if (!this.cachedArticleKeys.includes(key)) {
          this.cachedArticleKeys = [...this.cachedArticleKeys, key];
        }
        return;
      }

      // 3. Live source fetch + write-through to IndexedDB LRU cache
      this.coveNewsWasCached = false;
      this.networkLedger.metadata += 1;
      const fresh = await fetchFullCoveNewsArticle(target);
      this.coveNewsArticle = fresh;
      if (fresh?.contentHtml) {
        await saveCachedFullArticle(key, fresh);
        if (!this.cachedArticleKeys.includes(key)) {
          this.cachedArticleKeys = [...this.cachedArticleKeys, key];
        }
      }
    } finally {
      this.coveNewsLoading = false;
    }
  }

  public closeCoveNews(): void {
    this.activeDiscoverStory = null;
    this.coveNewsArticle = null;
    this.coveNewsMode = 'brief';
  }

  public async giveDiscoverFeedback(story: DiscoverStory, kind: 'boost' | 'less'): Promise<void> {
    this.discoverProfile = recordDiscoverFeedback(this.discoverProfile, story, kind);
    await storageSet('discoverProfile', this.discoverProfile);
    if (kind === 'less') {
      if (this.activeDiscoverStory?.id === story.id) {
        this.closeCoveNews();
      }
      this.notify('Tuned your Discover feed — showing fewer stories like this.');
    } else {
      this.notify(`Personalized Discover around ${story.publisher} & related topics.`);
    }
  }

  public async toggleDiscoverFavoriteTopic(
    topic: Exclude<DiscoverTopicId, 'for-you'>
  ): Promise<void> {
    const cur = this.discoverProfile.selectedTopics;
    const exists = cur.includes(topic);
    const updated = exists ? cur.filter((t) => t !== topic) : [...cur, topic];
    this.discoverProfile = {
      ...this.discoverProfile,
      selectedTopics: updated,
      topicScores: {
        ...this.discoverProfile.topicScores,
        [topic]: exists
          ? Math.max(0.5, (this.discoverProfile.topicScores[topic] ?? 1) - 0.8)
          : (this.discoverProfile.topicScores[topic] ?? 1) + 1.5
      }
    };
    await storageSet('discoverProfile', this.discoverProfile);
  }

  public async saveCoveNewsOffline(): Promise<void> {
    const story = this.activeDiscoverStory;
    if (!story) return;
    const art = this.coveNewsArticle;
    const item: ReadLaterItem = {
      id: `rl-${Date.now()}`,
      url: story.url,
      domain: story.domain,
      title: art?.title || story.title,
      siteName: story.publisher,
      description: story.summary.slice(0, 200),
      image: art?.bannerUrl || story.bannerUrl,
      contentHtml: art?.contentHtml,
      readingTimeMin: art?.readingTimeMin || story.readingTimeMin,
      addedAt: Date.now(),
      read: false
    };
    this.readLater = [item, ...this.readLater.filter((r) => r.url !== story.url)];
    await idbSaveAllReadLater(this.readLater);
    this.notify('Saved clean full article to Offline Reader.');
  }

  public async factoryReset(): Promise<void> {
    soundEngine.stop();
    await storageClearAll();
    this.settings = createDefaultSettings();
    this.smartMemory = createInitialSmartMemory();
    this.quickLinkGroups = structuredClone(DEFAULT_QUICKLINK_GROUPS);
    this.quickLinks = structuredClone(DEFAULT_QUICKLINKS);
    this.notes = structuredClone(DEFAULT_NOTES);
    this.sessions = structuredClone(DEFAULT_SESSIONS);
    this.readLater = structuredClone(DEFAULT_READ_LATER);
    this.rssFeeds = structuredClone(DEFAULT_RSS_FEEDS);
    this.countdowns = structuredClone(DEFAULT_COUNTDOWNS);
    this.localWallpaperUrl = undefined;
    this.applyDomTheme();
    await this.refreshWallpaperAtmosphere();
    await idbSaveAllReadLater(this.readLater);
    await this.refreshTabs();
    this.notify('Factory reset complete.');
  }
}

export const cove = new CoveStore();
