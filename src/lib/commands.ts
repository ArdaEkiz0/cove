import { cove } from './state.svelte';

export interface PaletteItem {
  id: string;
  category:
    | 'Smart Engine'
    | 'Command'
    | 'Tab Ops'
    | 'Open Tab'
    | 'Quick Link'
    | 'Session'
    | 'Note'
    | 'Read Later'
    | 'Focus'
    | 'System';
  title: string;
  subtitle?: string;
  shortcut?: string;
  badge?: string;
  icon: string;
  faviconUrl?: string;
  faviconDomain?: string;
  searchText: string;
  run: () => void | Promise<void>;
}

export function buildPaletteIndex(rawQuery: string): PaletteItem[] {
  const q = rawQuery.trim();
  const dynamicTop: PaletteItem[] = [];

  const noteMatch = q.match(/^note:\s*(.+)$/i);
  if (noteMatch) {
    const text = noteMatch[1].trim();
    dynamicTop.push({
      id: 'dyn-note',
      category: 'Note',
      title: `Add note: "${text}"`,
      subtitle: 'Appends instantly to your pinned local scratchpad',
      shortcut: '↵',
      icon: 'note',
      searchText: q,
      run: () => cove.quickCaptureNote(text)
    });
  }

  const weatherMatch = q.match(/^weather:\s*(.+)$/i);
  if (weatherMatch) {
    const city = weatherMatch[1].trim();
    dynamicTop.push({
      id: 'dyn-weather',
      category: 'Command',
      title: `Set weather location to "${city}"`,
      subtitle: 'Fetches real live Open-Meteo 5-day forecast',
      shortcut: '↵',
      icon: 'sun',
      searchText: q,
      run: async () => {
        cove.settings.weather.enabledOptIn = true;
        await cove.setWeatherCityByName(city);
      }
    });
  }

  const sessMatch = q.match(/^(?:new|save)\s+session:\s*(.+)$/i);
  if (sessMatch) {
    const name = sessMatch[1].trim();
    dynamicTop.push({
      id: 'dyn-save-session',
      category: 'Session',
      title: `Save workspace tabs as "${name}"`,
      subtitle: `Snapshots ${cove.openTabs.length} open tabs without closing them`,
      shortcut: '↵',
      icon: 'layers',
      searchText: q,
      run: () => cove.saveCurrentSession(name)
    });
  }

  const rlMatch = q.match(/^read\s*later:\s*(.+)$/i);
  if (rlMatch) {
    const targetUrl = rlMatch[1].trim();
    dynamicTop.push({
      id: 'dyn-rl',
      category: 'Read Later',
      title: `Save to Offline Reader: ${targetUrl}`,
      subtitle: 'Extracts clean article text locally into IndexedDB',
      shortcut: '↵',
      icon: 'bookmark',
      faviconDomain: targetUrl,
      searchText: q,
      run: () => cove.addReadLater(targetUrl)
    });
  }

  const navMatch = q.match(/^(?:open|go\s+to)\s+([a-z0-9.-]+\.[a-z]{2,}\S*)$/i);
  if (navMatch) {
    const dest = navMatch[1].trim();
    dynamicTop.push({
      id: 'dyn-go',
      category: 'Command',
      title: `Go to ${dest}`,
      subtitle: 'Navigate directly & record in workspace',
      shortcut: '↵',
      icon: 'external',
      faviconDomain: dest,
      searchText: q,
      run: () => cove.openUrlSafely(dest, true)
    });
  }

  const staticCommands: PaletteItem[] = [
    {
      id: 'cmd-smart-engine',
      category: 'Smart Engine',
      title: 'Open Cove Smart Engine Studio',
      subtitle: `${cove.smartStatus.stageName} · ${cove.smartMemory.totalSignals} real signals · inspect circadian log`,
      shortcut: '⌘J',
      badge: cove.smartStatus.stageName,
      icon: 'sparkle',
      searchText: 'cove smart engine self learning habits rhythm adaptive intelligence',
      run: () => {
        cove.smartModalOpen = true;
      }
    },
    {
      id: 'cmd-sound-mixer',
      category: 'Focus',
      title: 'Open Multi-Layer Soundscape Studio',
      subtitle: 'Blend Cove Waves, Rain, Quiet Café, Velvet Noise & Pine Wind',
      badge: cove.activeSoundLayersCount > 0 ? `${cove.activeSoundLayersCount} active` : 'Audio: local',
      icon: 'waves',
      searchText: 'sound mixer studio rain waves cafe wind ambient audio blend',
      run: () => {
        cove.soundMixerOpen = true;
      }
    },
    {
      id: 'cmd-edit-bento',
      category: 'System',
      title: cove.editGridMode ? 'Finish Editing Bento Grid' : 'Edit Bento Grid & Add/Resize Cards',
      subtitle: 'Toggle floating widget dock, resize spans (S/M/L), or drag to reorder',
      icon: 'grid',
      searchText: 'edit bento grid customize widgets add remove resize columns',
      run: () => {
        cove.setLayoutMode('dashboard');
        cove.editGridMode = !cove.editGridMode;
      }
    },
    {
      id: 'cmd-weather-locate',
      category: 'System',
      title: 'Detect My Exact Weather Location',
      subtitle: 'Uses browser geolocation to load live sky & 5-day forecast',
      icon: 'sun',
      searchText: 'weather detect my location gps city forecast sky',
      run: () => {
        cove.settings.weather.enabledOptIn = true;
        cove.useBrowserGeolocation();
      }
    },
    {
      id: 'cmd-smart-shape',
      category: 'Smart Engine',
      title: 'Shape Bento Dashboard to current habits',
      subtitle: `Reorders & sizes cards for ${cove.smartStatus.slotLabel}`,
      icon: 'sparkle',
      searchText: 'shape bento layout smart adapt reorder habits',
      run: () => cove.applySmartBentoShape()
    },
    {
      id: 'cmd-smart-sweep',
      category: 'Tab Ops',
      title: 'Smart Sweep Tabs (dedupe + suspend stale)',
      subtitle: 'One-click hygiene pass across duplicates and idle tabs',
      badge: `${cove.triage.duplicateExtraCount + cove.triage.staleTabs.length} action(s)`,
      icon: 'sparkle',
      searchText: 'smart sweep clean tabs dedupe suspend stale hygiene',
      run: () => cove.smartSweepTabs()
    },
    {
      id: 'cmd-suspend-stale',
      category: 'Tab Ops',
      title: 'Suspend stale tabs',
      subtitle: `Free memory on tabs inactive >${cove.settings.staleHoursThreshold}h`,
      badge: `${cove.triage.staleTabs.length} stale`,
      icon: 'moon',
      searchText: 'close stale tabs suspend stale tabs memory sleep discard',
      run: () => cove.suspendStaleTabs()
    },
    {
      id: 'cmd-dedupe-tabs',
      category: 'Tab Ops',
      title: 'Deduplicate tabs (keep newest, close rest)',
      subtitle: 'Cleans up repeated domains across your workspace',
      badge: `${cove.triage.duplicateExtraCount} dupes`,
      icon: 'copy',
      searchText: 'deduplicate close duplicate tabs same domain keep newest',
      run: () => cove.deduplicateDomainTabs()
    },
    {
      id: 'cmd-mute-audio',
      category: 'Tab Ops',
      title: cove.triage.audioTabs.some((t) => !t.muted) ? 'Mute all audio tabs' : 'Unmute audio tabs',
      subtitle: 'Toggle sound across audible browser tabs',
      badge: `${cove.triage.audioTabs.length} audio`,
      icon: 'volume',
      searchText: 'mute audio tabs sound unmute speaker',
      run: () => cove.toggleAudioMuteAll()
    },
    {
      id: 'cmd-group-domain',
      category: 'Tab Ops',
      title: 'Group open tabs by domain',
      subtitle: 'Organizes multi-tab domains into tidy tab groups',
      icon: 'grid',
      searchText: 'group tabs by domain cluster organize',
      run: () => cove.groupOpenTabsByDomain()
    },
    {
      id: 'cmd-save-session',
      category: 'Session',
      title: 'Save current tabs as session',
      subtitle: 'Non-destructive snapshot — keeps your tabs open',
      shortcut: '⌃⇧S',
      icon: 'layers',
      searchText: 'save current tabs new session snapshot bookmark window',
      run: () => cove.saveCurrentSession()
    },
    {
      id: 'cmd-manage-sessions',
      category: 'Session',
      title: 'Browse & restore saved tab sessions',
      subtitle: `${cove.sessions.length} saved session(s)`,
      icon: 'layers',
      searchText: 'open session restore sessions view snapshots',
      run: () => {
        cove.sessionsModalOpen = true;
      }
    },
    {
      id: 'cmd-toggle-focus',
      category: 'Focus',
      title: cove.focusRunning ? 'Pause Focus Pomodoro' : 'Start Focus Pomodoro',
      subtitle: `${cove.settings.focus.workMinutes}m focus · syncs functional neural audio`,
      icon: 'target',
      searchText: 'toggle focus mode start pomodoro timer',
      run: () => (cove.focusRunning ? cove.pauseFocus() : cove.startFocus())
    },
    {
      id: 'cmd-neural-deep-work',
      category: 'Focus',
      title: 'Play Neural Sound: Deep Work (16 Hz Beta)',
      subtitle: 'Phase-locked polyphonic focus pad + speech distraction shield',
      shortcut: 'M',
      icon: 'waves',
      searchText: 'neural sound brain fm deep work focus beta 16hz audio music',
      run: () => cove.setNeuralMode('deep_focus', true)
    },
    {
      id: 'cmd-neural-flow',
      category: 'Focus',
      title: 'Play Neural Sound: Creative Flow (10.5 Hz Alpha)',
      subtitle: 'Warm major-9th alpha shimmer for writing, design & exploration',
      icon: 'waves',
      searchText: 'neural sound brain fm creative flow alpha 10hz audio music',
      run: () => cove.setNeuralMode('creative_flow', true)
    },
    {
      id: 'cmd-neural-read',
      category: 'Focus',
      title: 'Play Neural Sound: Calm Reading (8.5 Hz Low-Alpha)',
      subtitle: 'Low-arousal acoustic stillness for deep offline reading',
      icon: 'waves',
      searchText: 'neural sound brain fm calm reading read study alpha 8hz audio',
      run: () => cove.setNeuralMode('calm_read', true)
    },
    {
      id: 'cmd-neural-unwind',
      category: 'Focus',
      title: 'Play Neural Sound: Recharge & Unwind (5.5 Hz Theta)',
      subtitle: 'Restorative theta decompression between work sprints',
      icon: 'waves',
      searchText: 'neural sound brain fm unwind relax theta 5hz break rest',
      run: () => cove.setNeuralMode('unwind', true)
    },
    {
      id: 'cmd-sound-studio',
      category: 'Focus',
      title: 'Open Functional Neural Sound Sanctuary',
      subtitle: 'Adjust Neural Effect (Subtle/Balanced/Deep), Speech Shield & organic textures',
      icon: 'sliders',
      searchText: 'sound studio sanctuary mixer rain waves cafe noise neural',
      run: () => {
        cove.soundMixerOpen = true;
      }
    },
    {
      id: 'cmd-surprise-rl',
      category: 'Read Later',
      title: 'Surprise me — open random article in Offline Reader',
      subtitle: `Picks randomly from ${cove.readLater.length} queued reads`,
      icon: 'sparkle',
      searchText: 'surprise me random read later rediscover reader bookmark',
      run: () => {
        cove.surpriseMeReadLater();
      }
    },
    {
      id: 'cmd-chameleon-toggle',
      category: 'System',
      title: `Toggle Chameleon Wallpaper Accent (${cove.settings.background.chameleonAccent ? 'On' : 'Off'})`,
      subtitle: 'Syncs Cove accent color & brightness contrast to the active wallpaper',
      icon: 'image',
      searchText: 'chameleon wallpaper accent brightness luminance auto adapt',
      run: () => {
        cove.settings.background.chameleonAccent = !cove.settings.background.chameleonAccent;
        cove.saveSettings();
        cove.notify(
          cove.settings.background.chameleonAccent
            ? 'Chameleon wallpaper accent enabled.'
            : 'Using manual preset accent.'
        );
      }
    },
    {
      id: 'cmd-layout-dashboard',
      category: 'System',
      title: 'Switch stage: Bento Dashboard',
      subtitle: 'Frosted glass bento grid with hero clock & weather',
      shortcut: '1',
      icon: 'grid',
      searchText: 'switch layout dashboard grid widgets bento',
      run: () => cove.setLayoutMode('dashboard')
    },
    {
      id: 'cmd-layout-ambient',
      category: 'System',
      title: 'Switch stage: Ambient Home',
      subtitle: 'Sculptural clock & calm search over full-bleed 4K scenery',
      shortcut: '2',
      icon: 'home',
      searchText: 'switch layout minimal ambient home scenic clock',
      run: () => cove.setLayoutMode('ambient')
    },
    {
      id: 'cmd-layout-focus',
      category: 'Focus',
      title: 'Switch stage: Focus Sanctuary',
      subtitle: 'Full-screen Pomodoro & multi-track soundscape stage',
      shortcut: '3',
      icon: 'target',
      searchText: 'switch layout focus stage sanctuary pomodoro',
      run: () => cove.setLayoutMode('focus')
    },
    {
      id: 'cmd-layout-blank',
      category: 'System',
      title: 'Switch stage: Pure 4K Stillness',
      subtitle: 'Uninterrupted scenic canvas (press ⌘K anytime)',
      shortcut: '4',
      icon: 'square',
      searchText: 'switch layout blank empty tab stillness',
      run: () => cove.setLayoutMode('blank')
    },
    {
      id: 'cmd-cycle-theme',
      category: 'System',
      title: 'Toggle theme (Smoked Dark / Frosted Light / System)',
      subtitle: `Current: ${cove.settings.theme}`,
      icon: 'sun',
      searchText: 'toggle dark mode light theme system appearance',
      run: () => cove.cycleTheme()
    },
    {
      id: 'cmd-cycle-wallpaper',
      category: 'System',
      title: 'Cycle 4K background wallpaper',
      subtitle: 'One-click switch to next local atmospheric scene',
      icon: 'image',
      searchText: 'cycle wallpaper next background scene image',
      run: () => cove.cycleWallpaper()
    },
    {
      id: 'cmd-open-settings',
      category: 'System',
      title: 'Open Full-Page Settings (v0.1.1)',
      subtitle: 'General, Typography, Atmosphere, Bento Layout, Autonomous CSE, Sound, Search & Backup',
      shortcut: ',',
      icon: 'sliders',
      searchText: 'settings full page customize general typography atmosphere grid widgets smart search privacy backup',
      run: () => cove.openSettings('general')
    },
    {
      id: 'cmd-settings-typography',
      category: 'System',
      title: 'Settings: Typography, Font Pairings & Type Scale',
      subtitle: 'Swiss Neo-Grotesque, Editorial Serif, Warm Humanist, Architectural Mono & 4 clock faces',
      icon: 'edit',
      searchText: 'settings typography typology font swiss editorial serif humanist mono scale clock',
      run: () => cove.openSettings('typography')
    },
    {
      id: 'cmd-settings-autonomous-cse',
      category: 'System',
      title: 'Settings: Autonomous CSE & Whisper Mode',
      subtitle: `Mode: ${cove.settings.smartEngine.autonomyMode} · Auto Bento, Circadian 4K & 2nd-order workflows`,
      icon: 'sparkle',
      searchText: 'settings smart engine cse autonomous autopilot whisper invisible markov',
      run: () => cove.openSettings('smart')
    },
    {
      id: 'cmd-settings-appearance',
      category: 'System',
      title: 'Settings: Atmosphere & 4K Wallpapers',
      subtitle: 'Luminance calibration, Chameleon accent, blur, dim & custom uploads',
      icon: 'image',
      searchText: 'settings appearance wallpaper atmosphere blur dim dark light theme',
      run: () => cove.openSettings('appearance')
    },
    {
      id: 'cmd-settings-search',
      category: 'System',
      title: 'Settings: Search Engines & Custom !Bangs',
      subtitle: 'Manage search providers, split search & add custom !bang URLs',
      icon: 'search',
      searchText: 'settings search engines bang custom kagi google duckduckgo',
      run: () => cove.openSettings('search')
    },
    {
      id: 'cmd-settings-privacy',
      category: 'System',
      title: 'Settings: Privacy & Network Ledger',
      subtitle: 'Inspect external network calls & local storage guarantees',
      icon: 'shield',
      searchText: 'settings privacy ledger network switches offline',
      run: () => cove.openSettings('privacy')
    },
    {
      id: 'cmd-export',
      category: 'System',
      title: 'Export all settings & Smart Engine memory (JSON)',
      subtitle: 'Downloads single local backup file',
      icon: 'download',
      searchText: 'export settings backup json download data',
      run: () => cove.exportAllDataJson()
    }
  ];

  const tabItems: PaletteItem[] = cove.openTabs.map((tab) => ({
    id: `tab-${tab.id}`,
    category: 'Open Tab',
    title: tab.title,
    subtitle: `${tab.domain}${tab.audible ? ' · Playing audio' : ''}${tab.discarded ? ' · Suspended' : ''}`,
    badge: tab.unreadCount > 0 ? `${tab.unreadCount} new` : `${tab.estimatedRamMb} MB`,
    icon: 'globe',
    faviconUrl: tab.favIconUrl,
    faviconDomain: tab.url,
    searchText: `${tab.title} ${tab.domain} ${tab.url} open tab`,
    run: () => cove.jumpToTab(tab)
  }));

  const groupNames = new Map(cove.quickLinkGroups.map((g) => [g.id, g.name]));
  const linkItems: PaletteItem[] = cove.quickLinks.map((ql) => ({
    id: `ql-${ql.id}`,
    category: 'Quick Link',
    title: `Open ${ql.title}`,
    subtitle: `${groupNames.get(ql.groupId) || 'Links'} · ${ql.url}`,
    icon: 'external',
    faviconUrl: ql.customIcon,
    faviconDomain: ql.url,
    searchText: `open ${ql.title} ${ql.url} ${groupNames.get(ql.groupId) || ''}`,
    run: () => cove.openQuickLink(ql, true)
  }));

  const sessionItems: PaletteItem[] = cove.sessions.map((s) => ({
    id: `sess-${s.id}`,
    category: 'Session',
    title: `Restore session: ${s.name}`,
    subtitle: `${s.tabs.length} tabs · non-destructive`,
    icon: 'layers',
    faviconDomain: s.tabs[0]?.url,
    searchText: `open session ${s.name} restore tabs`,
    run: () => cove.restoreSession(s.id)
  }));

  const rlItems: PaletteItem[] = cove.readLater.map((r) => ({
    id: `rl-${r.id}`,
    category: 'Read Later',
    title: r.title,
    subtitle: `Offline Reader · ${r.domain}${r.readingTimeMin ? ` · ${r.readingTimeMin}m read` : ''}`,
    icon: 'bookmark',
    faviconDomain: r.url,
    searchText: `${r.title} ${r.domain} ${r.note || ''} read later reader`,
    run: () => cove.openArticleInReader(r)
  }));

  const noteItems: PaletteItem[] = cove.notes.map((n) => ({
    id: `note-${n.id}`,
    category: 'Note',
    title: n.title,
    subtitle: n.content.replace(/\s+/g, ' ').slice(0, 72) || 'Blank scratchpad',
    icon: 'note',
    searchText: `show notes ${n.title} ${n.content}`,
    run: () => {
      const w = cove.settings.widgets.find((item) => item.type === 'notes');
      if (w && !w.visible) {
        w.visible = true;
        cove.saveSettings();
      }
      cove.setLayoutMode('dashboard');
      cove.notify(`Showing note: ${n.title}`);
    }
  }));

  const cmdScores = cove.smartMemory.commandScores || {};
  const wrappedCommands = staticCommands.map((cmd, idx) => {
    const origRun = cmd.run;
    const learnedWeight = cove.settings.smartEngine.smartCommandSort ? cmdScores[cmd.id] || 0 : 0;
    return {
      item: {
        ...cmd,
        badge: learnedWeight >= 2.2 && !cmd.badge ? 'Frequent' : cmd.badge,
        run: () => {
          cove.recordSignal({ type: 'command', commandId: cmd.id, title: cmd.title });
          return origRun();
        }
      },
      sortScore: learnedWeight - idx * 0.01
    };
  });

  if (cove.settings.smartEngine.enabled && cove.settings.smartEngine.smartCommandSort) {
    wrappedCommands.sort((a, b) => b.sortScore - a.sortScore);
  }

  return [
    ...dynamicTop,
    ...wrappedCommands.map((w) => w.item),
    ...tabItems,
    ...sessionItems,
    ...linkItems,
    ...rlItems,
    ...noteItems
  ];
}
