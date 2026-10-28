import { extractDomain } from '../background/triage-core';
import { CURATED_WALLPAPERS } from './defaults';
import type {
  CircadianSlot,
  NeuralModeId,
  QuickLinkItem,
  ReadLaterItem,
  SearchEngine,
  SmartEngineMemory,
  SmartSignalKind,
  SmartSignalLogEntry,
  SoundscapeId,
  TabTriageSummary,
  WidgetConfig,
  WidgetType
} from './types';

/**
 * Cove Smart Engine v3 — Zero-Mock Circadian Kernel + Markov Workflow Intelligence
 *
 * 100% private on-device learning:
 * - Starts cleanly at 0 signals (zero pre-seeded/mock weights).
 * - Smooth Circadian Kernel: blends adjacent time windows + weekday/weekend priors.
 * - First-Order Markov Chain: learns sequential workflows (Action A -> Action B) within 15m sessions.
 * - Reinforcement Loop: adapts suggestion category affinity + exponential quiet backoff from user feedback.
 */

const SLOT_ORDER: CircadianSlot[] = [
  'dawn',
  'deep_morning',
  'afternoon',
  'evening',
  'late_night'
];

const MARKOV_SESSION_WINDOW_MS = 15 * 60_000;

export interface SmartPulseSuggestion {
  id: string;
  kind: 'chain' | 'hygiene' | 'shortcut' | 'focus' | 'reading' | 'scene';
  title: string;
  subtitle: string;
  ctaLabel: string;
  reason: string;
  chainFrom?: string;
  domainForLogo?: string;
  confidence: number;
  action:
    | 'clean_dupes'
    | 'rest_stale'
    | 'open_url'
    | 'start_focus'
    | 'surprise_read'
    | 'apply_scene';
  payload?: string;
}

export interface EvolutionStatus {
  stageName: 'Seed' | 'Sprout' | 'Calibrated' | 'Attuned' | 'Symbiotic';
  level: 1 | 2 | 3 | 4 | 5;
  progressPct: number;
  nextMilestoneSignals: number;
  confidencePct: number;
  slotLabel: string;
  slotKey: string;
  unlockedCapabilities: string[];
  nextCapability: string;
}

export interface LearnedWorkflowChain {
  fromKey: string;
  toKey: string;
  fromLabel: string;
  toLabel: string;
  toKind: SmartSignalKind;
  toTarget?: string;
  probabilityPct: number;
  weight: number;
}

export interface LearnedInsight {
  id: string;
  label: string;
  value: string;
  detail: string;
}

export function getCircadianSlot(date: Date): {
  slot: CircadianSlot;
  dayKind: 'weekday' | 'weekend';
  slotKey: string;
  label: string;
} {
  const hr = date.getHours();
  const day = date.getDay();
  const dayKind = day === 0 || day === 6 ? 'weekend' : 'weekday';

  let slot: CircadianSlot = 'deep_morning';
  let label = 'Morning Flow';
  if (hr >= 5 && hr < 9) {
    slot = 'dawn';
    label = 'Early Dawn';
  } else if (hr >= 9 && hr < 13) {
    slot = 'deep_morning';
    label = 'Morning Flow';
  } else if (hr >= 13 && hr < 17) {
    slot = 'afternoon';
    label = 'Afternoon Sprint';
  } else if (hr >= 17 && hr < 22) {
    slot = 'evening';
    label = 'Evening Unwind';
  } else {
    slot = 'late_night';
    label = 'Quiet Night';
  }

  return {
    slot,
    dayKind,
    slotKey: `${dayKind}:${slot}`,
    label: `${dayKind === 'weekend' ? 'Weekend' : 'Weekday'} · ${label}`
  };
}

/** 100% honest zero-mock initial memory (v3) */
export function createInitialSmartMemory(): SmartEngineMemory {
  const now = Date.now();
  return {
    version: 4,
    totalSignals: 0,
    lastDecayAt: now,
    hourlyActivity: new Array(24).fill(0),
    hourlyFocus: new Array(24).fill(0),
    hourlyWorkSignals: new Array(24).fill(0),
    hourlyPersonalSignals: new Array(24).fill(0),
    weeklyHeatmap: Array.from({ length: 7 }, () => new Array(24).fill(0)),
    linkClicks: {},
    slotLinkScores: {},
    slotDomainScores: {},
    slotEngineScores: {},
    slotWidgetScores: {},
    slotSoundScores: {},
    slotNeuralScores: {},
    neuralFocusCompletions: {},
    slotSceneScores: {},
    commandScores: {},
    transitionMatrix: {},
    biTransitionMatrix: {},
    nodeLabels: {},
    prevNodeKey: undefined,
    lastNodeKey: undefined,
    lastNodeAt: undefined,
    categoryAffinity: {
      chain: 1.0,
      hygiene: 1.0,
      shortcut: 1.0,
      focus: 1.0,
      reading: 1.0,
      scene: 1.0
    },
    dismissCountByPulse: {},
    preferredFocusMinutes: 25,
    dismissedPulseIds: {},
    acceptedCount: 0,
    dismissedCount: 0,
    autopilotLog: [],
    recentSignals: [],
    lastUpdatedAt: now
  };
}

/** Upgrades v2/v3 memory seamlessly to v4 without losing any real user signals */
export function upgradeSmartMemory(raw: Partial<SmartEngineMemory> | null): SmartEngineMemory {
  const base = createInitialSmartMemory();
  if (!raw || typeof raw.totalSignals !== 'number') return base;
  return {
    ...base,
    ...raw,
    version: 4,
    lastDecayAt: raw.lastDecayAt || raw.lastUpdatedAt || Date.now(),
    hourlyActivity:
      Array.isArray(raw.hourlyActivity) && raw.hourlyActivity.length === 24
        ? raw.hourlyActivity
        : base.hourlyActivity,
    hourlyFocus:
      Array.isArray(raw.hourlyFocus) && raw.hourlyFocus.length === 24
        ? raw.hourlyFocus
        : base.hourlyFocus,
    hourlyWorkSignals:
      Array.isArray(raw.hourlyWorkSignals) && raw.hourlyWorkSignals.length === 24
        ? raw.hourlyWorkSignals
        : base.hourlyWorkSignals,
    hourlyPersonalSignals:
      Array.isArray(raw.hourlyPersonalSignals) && raw.hourlyPersonalSignals.length === 24
        ? raw.hourlyPersonalSignals
        : base.hourlyPersonalSignals,
    weeklyHeatmap:
      Array.isArray(raw.weeklyHeatmap) && raw.weeklyHeatmap.length === 7
        ? raw.weeklyHeatmap
        : base.weeklyHeatmap,
    categoryAffinity: { ...base.categoryAffinity, ...(raw.categoryAffinity || {}) },
    linkClicks: raw.linkClicks || {},
    slotNeuralScores: raw.slotNeuralScores || {},
    neuralFocusCompletions: raw.neuralFocusCompletions || {},
    transitionMatrix: raw.transitionMatrix || {},
    biTransitionMatrix: raw.biTransitionMatrix || {},
    nodeLabels: raw.nodeLabels || {},
    commandScores: raw.commandScores || {},
    dismissCountByPulse: raw.dismissCountByPulse || {},
    autopilotLog: Array.isArray(raw.autopilotLog) ? raw.autopilotLog : [],
    recentSignals: Array.isArray(raw.recentSignals) ? raw.recentSignals : []
  };
}

/**
 * Autonomous Temporal Half-Life Decay (~14-day half-life):
 * Ensures outdated temporary projects gently fade so CSE adapts continuously to current habits.
 */
export function applyAutonomousDecay(mem: SmartEngineMemory, nowTs = Date.now()): boolean {
  const elapsedMs = nowTs - (mem.lastDecayAt || nowTs);
  const elapsedDays = elapsedMs / 86_400_000;
  if (elapsedDays < 0.5) return false;

  const factor = Math.pow(0.952, Math.min(30, elapsedDays));
  const decayNested = (table: Record<string, Record<string, number>>) => {
    for (const map of Object.values(table)) {
      for (const k of Object.keys(map)) {
        const next = Math.round(map[k] * factor * 1000) / 1000;
        if (next < 0.04) delete map[k];
        else map[k] = next;
      }
    }
  };

  decayNested(mem.slotLinkScores);
  decayNested(mem.slotDomainScores);
  decayNested(mem.slotEngineScores);
  decayNested(mem.slotWidgetScores);
  decayNested(mem.transitionMatrix);
  decayNested(mem.biTransitionMatrix);

  mem.lastDecayAt = nowTs;
  return true;
}

export function recordAutopilotAction(
  mem: SmartEngineMemory,
  action: string,
  detail: string
): void {
  const last = mem.autopilotLog?.[0];
  if (last && last.action === action && last.detail === detail && Date.now() - last.at < 180_000) {
    return;
  }
  mem.autopilotLog = [
    {
      id: `ap-${Date.now()}-${Math.random().toString(36).slice(2, 5)}`,
      at: Date.now(),
      action,
      detail
    },
    ...(mem.autopilotLog || [])
  ].slice(0, 20);
}

function bumpNestedScore(
  table: Record<string, Record<string, number>>,
  slotKey: string,
  itemKey: string,
  delta: number
): void {
  if (!table[slotKey]) table[slotKey] = {};
  const map = table[slotKey];
  for (const k of Object.keys(map)) {
    map[k] = Math.round(map[k] * 0.968 * 1000) / 1000;
  }
  map[itemKey] = Math.max(0, Math.round(((map[itemKey] || 0) + delta) * 1000) / 1000);
}

/**
 * Gaussian-like Circadian Kernel Smoothing:
 * Combines exact slot (1.0), opposite day-kind same slot (0.32), and neighbor time slots (0.22)
 */
export function getBlendedSlotScores(
  table: Record<string, Record<string, number>>,
  date: Date
): Record<string, number> {
  const { slot, dayKind, slotKey } = getCircadianSlot(date);
  const idx = SLOT_ORDER.indexOf(slot);
  const prevSlot = SLOT_ORDER[(idx - 1 + SLOT_ORDER.length) % SLOT_ORDER.length];
  const nextSlot = SLOT_ORDER[(idx + 1) % SLOT_ORDER.length];
  const otherDay = dayKind === 'weekday' ? 'weekend' : 'weekday';

  const sources: [Record<string, number> | undefined, number][] = [
    [table[slotKey], 1.0],
    [table[`${otherDay}:${slot}`], 0.32],
    [table[`${dayKind}:${prevSlot}`], 0.22],
    [table[`${dayKind}:${nextSlot}`], 0.22]
  ];

  const out: Record<string, number> = {};
  for (const [map, weight] of sources) {
    if (!map) continue;
    for (const [k, v] of Object.entries(map)) {
      out[k] = (out[k] || 0) + v * weight;
    }
  }
  return out;
}

function recordMarkovTransition(
  mem: SmartEngineMemory,
  nodeKey: string,
  meta: { label: string; kind: SmartSignalKind; target?: string },
  nowTs: number
): void {
  mem.nodeLabels[nodeKey] = meta;

  if (
    mem.lastNodeKey &&
    mem.lastNodeKey !== nodeKey &&
    mem.lastNodeAt &&
    nowTs - mem.lastNodeAt <= MARKOV_SESSION_WINDOW_MS
  ) {
    // 1st-Order Markov (B -> C)
    if (!mem.transitionMatrix[mem.lastNodeKey]) {
      mem.transitionMatrix[mem.lastNodeKey] = {};
    }
    const row = mem.transitionMatrix[mem.lastNodeKey];
    for (const k of Object.keys(row)) {
      row[k] = Math.round(row[k] * 0.96 * 1000) / 1000;
    }
    row[nodeKey] = Math.round(((row[nodeKey] || 0) + 1.0) * 1000) / 1000;

    // 2nd-Order Context Markov (A >> B -> C)
    if (mem.prevNodeKey && mem.prevNodeKey !== mem.lastNodeKey) {
      const biKey = `${mem.prevNodeKey}>>${mem.lastNodeKey}`;
      if (!mem.biTransitionMatrix[biKey]) mem.biTransitionMatrix[biKey] = {};
      const biRow = mem.biTransitionMatrix[biKey];
      for (const k of Object.keys(biRow)) {
        biRow[k] = Math.round(biRow[k] * 0.95 * 1000) / 1000;
      }
      biRow[nodeKey] = Math.round(((biRow[nodeKey] || 0) + 1.15) * 1000) / 1000;
    }

    mem.prevNodeKey = mem.lastNodeKey;
  } else {
    mem.prevNodeKey = undefined;
  }

  mem.lastNodeKey = nodeKey;
  mem.lastNodeAt = nowTs;
}

function pushSignalLog(
  mem: SmartEngineMemory,
  kind: SmartSignalKind,
  label: string,
  slotLabel: string,
  nodeKey: string
): void {
  const entry: SmartSignalLogEntry = {
    id: `sig-${Date.now()}-${Math.random().toString(36).slice(2, 5)}`,
    at: Date.now(),
    kind,
    label,
    slotLabel,
    nodeKey
  };
  mem.recentSignals = [entry, ...(mem.recentSignals || [])].slice(0, 32);
}

export function recordSmartInteraction(
  mem: SmartEngineMemory,
  now: Date,
  event:
    | {
        type: 'link';
        linkId: string;
        url: string;
        title?: string;
        contextKind?: 'work' | 'personal' | 'both';
      }
    | { type: 'tab'; url: string; title?: string }
    | { type: 'search'; engineId: string; engineName?: string }
    | { type: 'widget'; widgetType: WidgetType }
    | { type: 'focus_start'; minutes: number; sound: SoundscapeId; neuralMode?: NeuralModeId }
    | { type: 'focus_complete'; minutes: number; neuralMode?: NeuralModeId; sound?: SoundscapeId }
    | { type: 'focus_abort'; elapsedMinutes: number }
    | { type: 'neural_sound'; mode: NeuralModeId; sound?: SoundscapeId }
    | { type: 'scene'; curatedIndex: number; sceneName?: string }
    | { type: 'command'; commandId: string; title: string }
): void {
  const { slotKey, label: slotLabel } = getCircadianSlot(now);
  const hr = now.getHours();
  const day = now.getDay();
  const nowTs = Date.now();

  applyAutonomousDecay(mem, nowTs);
  mem.totalSignals += 1;
  mem.hourlyActivity[hr] = (mem.hourlyActivity[hr] || 0) + 1;
  if (!mem.weeklyHeatmap[day]) mem.weeklyHeatmap[day] = new Array(24).fill(0);
  mem.weeklyHeatmap[day][hr] = (mem.weeklyHeatmap[day][hr] || 0) + 1;
  mem.lastUpdatedAt = nowTs;

  if (event.type === 'link') {
    mem.linkClicks[event.linkId] = (mem.linkClicks[event.linkId] || 0) + 1;
    if (event.contextKind === 'work') {
      mem.hourlyWorkSignals[hr] = (mem.hourlyWorkSignals[hr] || 0) + 1;
    } else if (event.contextKind === 'personal') {
      mem.hourlyPersonalSignals[hr] = (mem.hourlyPersonalSignals[hr] || 0) + 1;
    }
    bumpNestedScore(mem.slotLinkScores, slotKey, event.linkId, 1.45);
    const dom = extractDomain(event.url).toLowerCase();
    if (dom) bumpNestedScore(mem.slotDomainScores, slotKey, dom, 1.15);
    bumpNestedScore(mem.slotWidgetScores, slotKey, 'quicklinks', 0.45);
    const nodeKey = `link:${event.linkId}`;
    const lbl = event.title || dom;
    recordMarkovTransition(mem, nodeKey, { label: lbl, kind: 'link', target: `${event.linkId}|${event.url}` }, nowTs);
    pushSignalLog(mem, 'link', `Opened ${lbl}`, slotLabel, nodeKey);
  } else if (event.type === 'tab') {
    const dom = extractDomain(event.url).toLowerCase();
    if (dom) bumpNestedScore(mem.slotDomainScores, slotKey, dom, 1.0);
    bumpNestedScore(mem.slotWidgetScores, slotKey, 'triage', 0.45);
    const nodeKey = `domain:${dom}`;
    recordMarkovTransition(mem, nodeKey, { label: event.title || dom, kind: 'tab', target: event.url }, nowTs);
    pushSignalLog(mem, 'tab', `Switched to ${event.title || dom}`, slotLabel, nodeKey);
  } else if (event.type === 'search') {
    bumpNestedScore(mem.slotEngineScores, slotKey, event.engineId, 1.35);
    const nodeKey = `search:${event.engineId}`;
    const engLbl = event.engineName || event.engineId.toUpperCase();
    recordMarkovTransition(mem, nodeKey, { label: `${engLbl} Search`, kind: 'search', target: event.engineId }, nowTs);
    pushSignalLog(mem, 'search', `Searched via ${engLbl}`, slotLabel, nodeKey);
  } else if (event.type === 'widget') {
    bumpNestedScore(mem.slotWidgetScores, slotKey, event.widgetType, 0.9);
    const nodeKey = `widget:${event.widgetType}`;
    recordMarkovTransition(mem, nodeKey, { label: `${event.widgetType} card`, kind: 'widget' }, nowTs);
    pushSignalLog(mem, 'widget', `Interacted with ${event.widgetType}`, slotLabel, nodeKey);
  } else if (event.type === 'focus_start') {
    mem.hourlyFocus[hr] = (mem.hourlyFocus[hr] || 0) + 2;
    mem.preferredFocusMinutes = Math.round(mem.preferredFocusMinutes * 0.72 + event.minutes * 0.28);
    if (event.sound !== 'none') {
      bumpNestedScore(mem.slotSoundScores, slotKey, event.sound, 1.45);
    }
    if (event.neuralMode && event.neuralMode !== 'off') {
      bumpNestedScore(mem.slotNeuralScores, slotKey, event.neuralMode, 1.4);
    }
    bumpNestedScore(mem.slotWidgetScores, slotKey, 'focus', 1.15);
    const nodeKey = `focus:pomodoro`;
    recordMarkovTransition(mem, nodeKey, { label: `${mem.preferredFocusMinutes}m Focus`, kind: 'focus', target: event.sound }, nowTs);
    pushSignalLog(mem, 'focus', `Started ${event.minutes}m focus`, slotLabel, nodeKey);
  } else if (event.type === 'focus_complete') {
    if (event.neuralMode && event.neuralMode !== 'off') {
      mem.neuralFocusCompletions[event.neuralMode] =
        (mem.neuralFocusCompletions[event.neuralMode] || 0) + 1;
      bumpNestedScore(mem.slotNeuralScores, slotKey, event.neuralMode, 2.2);
    }
    if (event.sound && event.sound !== 'none') {
      bumpNestedScore(mem.slotSoundScores, slotKey, event.sound, 1.8);
    }
    const nudged = Math.round((mem.preferredFocusMinutes * 0.78 + event.minutes * 1.05 * 0.22) / 5) * 5;
    mem.preferredFocusMinutes = Math.max(15, Math.min(60, nudged || 25));
    pushSignalLog(mem, 'focus', `Completed ${event.minutes}m sprint`, slotLabel, 'focus:complete');
  } else if (event.type === 'focus_abort') {
    if (event.elapsedMinutes >= 5 && event.elapsedMinutes < mem.preferredFocusMinutes - 5) {
      const calibrated =
        Math.round((mem.preferredFocusMinutes * 0.8 + event.elapsedMinutes * 0.2) / 5) * 5;
      mem.preferredFocusMinutes = Math.max(15, Math.min(60, calibrated));
    }
  } else if (event.type === 'neural_sound') {
    if (event.mode !== 'off') {
      bumpNestedScore(mem.slotNeuralScores, slotKey, event.mode, 1.35);
    }
    if (event.sound && event.sound !== 'none') {
      bumpNestedScore(mem.slotSoundScores, slotKey, event.sound, 1.1);
    }
    pushSignalLog(mem, 'sound', `Focus audio: ${event.mode.replace('_', ' ')}`, slotLabel, `sound:${event.mode}`);
  } else if (event.type === 'scene') {
    if (!mem.slotSceneScores[slotKey]) mem.slotSceneScores[slotKey] = {};
    mem.slotSceneScores[slotKey][event.curatedIndex] =
      (mem.slotSceneScores[slotKey][event.curatedIndex] || 0) + 1.25;
    const nodeKey = `scene:${event.curatedIndex}`;
    const scName = event.sceneName || CURATED_WALLPAPERS[event.curatedIndex]?.label || '4K Scene';
    recordMarkovTransition(mem, nodeKey, { label: scName, kind: 'scene', target: String(event.curatedIndex) }, nowTs);
    pushSignalLog(mem, 'scene', `Atmosphere -> ${scName}`, slotLabel, nodeKey);
  } else if (event.type === 'command') {
    for (const k of Object.keys(mem.commandScores)) {
      mem.commandScores[k] = Math.round(mem.commandScores[k] * 0.97 * 1000) / 1000;
    }
    mem.commandScores[event.commandId] = (mem.commandScores[event.commandId] || 0) + 1.2;
    const nodeKey = `cmd:${event.commandId}`;
    recordMarkovTransition(mem, nodeKey, { label: event.title, kind: 'command', target: event.commandId }, nowTs);
    pushSignalLog(mem, 'command', `Ran "${event.title}"`, slotLabel, nodeKey);
  }
}

export function recordPulseFeedback(
  mem: SmartEngineMemory,
  pulseId: string,
  kind: SmartPulseSuggestion['kind'],
  accepted: boolean
): void {
  const cur = mem.categoryAffinity[kind] ?? 1.0;
  if (accepted) {
    mem.acceptedCount += 1;
    mem.categoryAffinity[kind] = Math.min(1.65, Math.round((cur + 0.14) * 100) / 100);
    delete mem.dismissedPulseIds[pulseId];
  } else {
    mem.dismissedCount += 1;
    mem.categoryAffinity[kind] = Math.max(0.35, Math.round(cur * 0.85 * 100) / 100);
    const strikes = (mem.dismissCountByPulse[pulseId] || 0) + 1;
    mem.dismissCountByPulse[pulseId] = strikes;
    mem.dismissedPulseIds[pulseId] = Date.now();
  }
}

export function getEvolutionStatus(mem: SmartEngineMemory, now: Date): EvolutionStatus {
  const { slotKey, label } = getCircadianSlot(now);
  const s = mem.totalSignals;

  let stageName: EvolutionStatus['stageName'] = 'Seed';
  let level: EvolutionStatus['level'] = 1;
  let progressPct = Math.min(100, Math.round((s / 8) * 100));
  let nextMilestoneSignals = 8;
  let nextCapability = 'Circadian Shortcut & Search Adaptation (at 8 signals)';
  const unlockedCapabilities: string[] = ['On-Device Signal & Rhythm Mapping'];

  if (s >= 8) {
    unlockedCapabilities.push('Circadian Shortcut & Search Adaptation');
  }
  if (s >= 22) {
    unlockedCapabilities.push('Markov Workflow Chain Prediction (A -> B)');
  }
  if (s >= 50) {
    unlockedCapabilities.push('Autonomous Bento Grid & 7x24 Heatmap');
  }
  if (s >= 100) {
    unlockedCapabilities.push('Symbiotic Living Workspace & Scene Harmony');
  }

  if (s >= 100) {
    stageName = 'Symbiotic';
    level = 5;
    progressPct = 100;
    nextMilestoneSignals = s;
    nextCapability = 'All autonomous learning layers unlocked';
  } else if (s >= 50) {
    stageName = 'Attuned';
    level = 4;
    progressPct = Math.round(((s - 50) / 50) * 100);
    nextMilestoneSignals = 100;
    nextCapability = 'Symbiotic Scene & Sound Harmony (at 100 signals)';
  } else if (s >= 22) {
    stageName = 'Calibrated';
    level = 3;
    progressPct = Math.round(((s - 22) / 28) * 100);
    nextMilestoneSignals = 50;
    nextCapability = 'Circadian Bento Grid Shaping (at 50 signals)';
  } else if (s >= 8) {
    stageName = 'Sprout';
    level = 2;
    progressPct = Math.round(((s - 8) / 14) * 100);
    nextMilestoneSignals = 22;
    nextCapability = 'Markov Workflow Chains (at 22 signals)';
  }

  const chainCount = Object.keys(mem.transitionMatrix || {}).length;
  const feedbackTotal = mem.acceptedCount + mem.dismissedCount;
  const acceptBonus = feedbackTotal > 0 ? (mem.acceptedCount / feedbackTotal) * 12 : 0;
  const chainBonus = Math.min(10, chainCount * 1.5);
  const confidencePct =
    s === 0
      ? 0
      : Math.min(99, Math.round(Math.min(78, 14 + s * 1.15) + acceptBonus + chainBonus));

  return {
    stageName,
    level,
    progressPct,
    nextMilestoneSignals,
    confidencePct,
    slotLabel: label,
    slotKey,
    unlockedCapabilities,
    nextCapability
  };
}

/**
 * Extracts top learned sequential workflow chains (A -> B) across the user's real history
 */
export function getTopWorkflowChains(mem: SmartEngineMemory, limit = 5): LearnedWorkflowChain[] {
  const chains: LearnedWorkflowChain[] = [];
  for (const [fromKey, targets] of Object.entries(mem.transitionMatrix || {})) {
    const entries = Object.entries(targets).filter(([, w]) => w >= 0.8);
    const rowSum = entries.reduce((acc, [, w]) => acc + w, 0);
    if (rowSum <= 0) continue;
    const fromMeta = mem.nodeLabels[fromKey];
    if (!fromMeta) continue;

    for (const [toKey, weight] of entries) {
      const toMeta = mem.nodeLabels[toKey];
      if (!toMeta || weight < 1.1) continue;
      const prob = Math.min(98, Math.round((weight / rowSum) * 100));
      chains.push({
        fromKey,
        toKey,
        fromLabel: fromMeta.label,
        toLabel: toMeta.label,
        toKind: toMeta.kind,
        toTarget: toMeta.target,
        probabilityPct: prob,
        weight
      });
    }
  }
  chains.sort((a, b) => b.weight * (b.probabilityPct / 100) - a.weight * (a.probabilityPct / 100));
  return chains.slice(0, limit);
}

/**
 * Checks if the user's most recent action triggers a learned Markov next step
 */
export function getActiveMarkovPrediction(
  mem: SmartEngineMemory,
  nowTs: number
): LearnedWorkflowChain | null {
  if (
    !mem.lastNodeKey ||
    !mem.lastNodeAt ||
    nowTs - mem.lastNodeAt > MARKOV_SESSION_WINDOW_MS
  ) {
    return null;
  }

  // 1. Check 2nd-Order Context Chain first (A >> B -> C)
  if (mem.prevNodeKey) {
    const biKey = `${mem.prevNodeKey}>>${mem.lastNodeKey}`;
    const biTargets = mem.biTransitionMatrix?.[biKey];
    if (biTargets) {
      const biEntries = Object.entries(biTargets);
      if (biEntries.length > 0) {
        const biTotal = biEntries.reduce((acc, [, w]) => acc + w, 0);
        biEntries.sort((a, b) => b[1] - a[1]);
        const [bestBiTo, bestBiWeight] = biEntries[0];
        const biProb = Math.min(99, Math.round((bestBiWeight / Math.max(0.01, biTotal)) * 100));
        const prevMeta = mem.nodeLabels[mem.prevNodeKey];
        const lastMeta = mem.nodeLabels[mem.lastNodeKey];
        const toMeta = mem.nodeLabels[bestBiTo];
        if (bestBiWeight >= 1.3 && biProb >= 40 && lastMeta && toMeta) {
          return {
            fromKey: biKey,
            toKey: bestBiTo,
            fromLabel: prevMeta ? `${prevMeta.label} → ${lastMeta.label}` : lastMeta.label,
            toLabel: toMeta.label,
            toKind: toMeta.kind,
            toTarget: toMeta.target,
            probabilityPct: biProb,
            weight: bestBiWeight
          };
        }
      }
    }
  }

  // 2. Fallback to 1st-Order Chain (B -> C)
  const targets = mem.transitionMatrix[mem.lastNodeKey];
  if (!targets) return null;

  const entries = Object.entries(targets);
  if (!entries.length) return null;
  const total = entries.reduce((acc, [, w]) => acc + w, 0);
  entries.sort((a, b) => b[1] - a[1]);
  const [bestToKey, bestWeight] = entries[0];
  if (bestWeight < 1.5) return null;

  const prob = Math.min(98, Math.round((bestWeight / Math.max(0.01, total)) * 100));
  if (prob < 34) return null;

  const fromMeta = mem.nodeLabels[mem.lastNodeKey];
  const toMeta = mem.nodeLabels[bestToKey];
  if (!fromMeta || !toMeta) return null;

  return {
    fromKey: mem.lastNodeKey,
    toKey: bestToKey,
    fromLabel: fromMeta.label,
    toLabel: toMeta.label,
    toKind: toMeta.kind,
    toTarget: toMeta.target,
    probabilityPct: prob,
    weight: bestWeight
  };
}

/**
 * Autonomously infers Work vs Personal context for the current hour once enough
 * real link-group signals exist, falling back cleanly to the configured schedule.
 */
export function inferAutonomousContext(
  mem: SmartEngineMemory,
  now: Date,
  scheduledDefault: 'work' | 'personal'
): 'work' | 'personal' {
  const hr = now.getHours();
  const prevHr = (hr + 23) % 24;
  const nextHr = (hr + 1) % 24;

  const workScore =
    (mem.hourlyWorkSignals?.[hr] || 0) * 1.0 +
    (mem.hourlyWorkSignals?.[prevHr] || 0) * 0.25 +
    (mem.hourlyWorkSignals?.[nextHr] || 0) * 0.25;
  const persScore =
    (mem.hourlyPersonalSignals?.[hr] || 0) * 1.0 +
    (mem.hourlyPersonalSignals?.[prevHr] || 0) * 0.25 +
    (mem.hourlyPersonalSignals?.[nextHr] || 0) * 0.25;

  const total = workScore + persScore;
  if (total < 3.0) return scheduledDefault;

  const workRatio = workScore / total;
  if (workRatio >= 0.64) return 'work';
  if (workRatio <= 0.36) return 'personal';
  return scheduledDefault;
}

export function rankQuickLinksSmart(
  links: QuickLinkItem[],
  mem: SmartEngineMemory,
  now: Date
): { item: QuickLinkItem; score: number; isTopPick: boolean; isChainNext: boolean }[] {
  const blendedLinks = getBlendedSlotScores(mem.slotLinkScores, now);
  const blendedDomains = getBlendedSlotScores(mem.slotDomainScores, now);
  const activeChain = getActiveMarkovPrediction(mem, now.getTime());

  const scored = links.map((item, idx) => {
    const dom = extractDomain(item.url).toLowerCase();
    const isChainNext = activeChain?.toKey === `link:${item.id}`;
    const markovBoost = isChainNext ? 3.2 : 0;
    const learned = (blendedLinks[item.id] || 0) * 1.6 + (blendedDomains[dom] || 0) * 0.8 + markovBoost;
    const tieBreak = Math.max(0, 0.25 - idx * 0.015);
    return {
      item,
      score: Math.round((learned + tieBreak) * 100) / 100,
      learned,
      isTopPick: false,
      isChainNext
    };
  });

  scored.sort((a, b) => b.score - a.score);
  if (scored.length > 0 && scored[0].learned >= 1.15) {
    scored[0].isTopPick = true;
  }
  return scored.map(({ item, score, isTopPick, isChainNext }) => ({
    item,
    score,
    isTopPick,
    isChainNext
  }));
}

export function getPredictedSearchEngine(
  engines: SearchEngine[],
  mem: SmartEngineMemory,
  now: Date
): SearchEngine | undefined {
  const enabled = engines.filter((e) => e.enabled);
  if (enabled.length === 0) return engines[0];
  const blended = getBlendedSlotScores(mem.slotEngineScores, now);
  let best = enabled[0];
  let bestScore = 0;
  for (const eng of enabled) {
    const sc = blended[eng.id] || 0;
    if (sc > bestScore) {
      bestScore = sc;
      best = eng;
    }
  }
  return best;
}

export function getPredictedSoundscape(mem: SmartEngineMemory, now: Date): SoundscapeId {
  const blended = getBlendedSlotScores(mem.slotSoundScores, now);
  let best: SoundscapeId = 'waves';
  let bestVal = 0;
  for (const [k, v] of Object.entries(blended)) {
    if (v > bestVal && k !== 'none') {
      bestVal = v;
      best = k as SoundscapeId;
    }
  }
  return best;
}

export function getRecommendedNeuralProfile(
  mem: SmartEngineMemory,
  now: Date,
  activity?: 'focus' | 'reading' | 'break'
): {
  mode: Exclude<NeuralModeId, 'off'>;
  sound: SoundscapeId;
  reason: string;
  isLearned: boolean;
} {
  if (activity === 'break') {
    return {
      mode: 'unwind',
      sound: getPredictedSoundscape(mem, now),
      reason: '5.5 Hz pulse decompression during break',
      isLearned: false
    };
  }
  if (activity === 'reading') {
    return {
      mode: 'calm_read',
      sound: 'rain',
      reason: '8.5 Hz pulse for deep offline reading',
      isLearned: false
    };
  }

  const blendedNeural = getBlendedSlotScores(mem.slotNeuralScores || {}, now);
  const completions = mem.neuralFocusCompletions || {};
  const validModes: Exclude<NeuralModeId, 'off'>[] = [
    'deep_focus',
    'creative_flow',
    'calm_read',
    'unwind'
  ];

  let bestMode: Exclude<NeuralModeId, 'off'> | null = null;
  let bestScore = 1.1;
  for (const m of validModes) {
    const score = (blendedNeural[m] || 0) + (completions[m] || 0) * 0.85;
    if (score > bestScore) {
      bestScore = score;
      bestMode = m;
    }
  }

  const bestSound = getPredictedSoundscape(mem, now);
  const { slot, label } = getCircadianSlot(now);

  if (bestMode) {
    return {
      mode: bestMode,
      sound: bestSound,
      reason: `Tuned to your ${label.split('·')[1]?.trim().toLowerCase() || 'current'} flow`,
      isLearned: true
    };
  }

  // Calm circadian prior before personal acoustic history accumulates
  if (slot === 'dawn' || slot === 'deep_morning') {
    return {
      mode: 'deep_focus',
      sound: 'rain',
      reason: 'Morning 16 Hz pulse clarity',
      isLearned: false
    };
  }
  if (slot === 'afternoon') {
    return {
      mode: 'creative_flow',
      sound: 'waves',
      reason: 'Afternoon 10.5 Hz pulse flow',
      isLearned: false
    };
  }
  if (slot === 'evening') {
    return {
      mode: 'calm_read',
      sound: 'rain',
      reason: 'Evening 8.5 Hz calm focus',
      isLearned: false
    };
  }
  return {
    mode: 'unwind',
    sound: 'waves',
    reason: 'Late-night 5.5 Hz pulse wind-down',
    isLearned: false
  };
}

export function getPredictedSceneIndex(mem: SmartEngineMemory, now: Date): number | null {
  const { slotKey, slot } = getCircadianSlot(now);
  const direct = mem.slotSceneScores[slotKey] || mem.slotSceneScores[`weekday:${slot}`];
  if (!direct) return null;
  let bestIdx: number | null = null;
  let bestScore = 1.8; // Require at least 2 real picks in this circadian window
  for (const [idxStr, val] of Object.entries(direct)) {
    if (val > bestScore) {
      bestScore = val;
      bestIdx = Number(idxStr);
    }
  }
  return bestIdx;
}

export function getAutonomousCircadianSceneIndex(
  mem: SmartEngineMemory,
  now: Date
): { index: number; isLearned: boolean } {
  const learned = getPredictedSceneIndex(mem, now);
  if (learned !== null) {
    return { index: learned, isLearned: true };
  }
  const { slot } = getCircadianSlot(now);
  // Calm default circadian scene harmony:
  // dawn -> 1 (Alpine Mist), deep_morning -> 0 (Sheltered Cove), afternoon -> 2 (Emerald Cloud),
  // evening -> 3 (Twilight Café), late_night -> 5 (Midnight Fjord)
  const map: Record<CircadianSlot, number> = {
    dawn: 1,
    deep_morning: 0,
    afternoon: 2,
    evening: 3,
    late_night: 5
  };
  return { index: map[slot] ?? 1, isLearned: false };
}

export function computeSmartShapedWidgets(
  widgets: WidgetConfig[],
  mem: SmartEngineMemory,
  now: Date
): WidgetConfig[] {
  const scores = getBlendedSlotScores(mem.slotWidgetScores, now);

  const copy = structuredClone(widgets);
  const visible = copy.filter((w) => w.visible).sort((a, b) => a.order - b.order);
  const hidden = copy.filter((w) => !w.visible);

  // Respect pinned cards in their exact slot indices while autonomously sorting unpinned cards!
  const unpinned = visible.filter((w) => !w.pinned);
  unpinned.sort((a, b) => (scores[b.type] || 0) - (scores[a.type] || 0));

  let unpinnedCursor = 0;
  const mergedVisible = visible.map((orig, idx) => {
    const chosen = orig.pinned ? orig : unpinned[unpinnedCursor++];
    chosen.order = idx;
    return chosen;
  });

  hidden.forEach((w, idx) => {
    w.order = mergedVisible.length + idx;
  });

  return [...mergedVisible, ...hidden];
}

/**
 * Generates concise, 100% factual insights synthesized from on-device memory
 */
export function buildLearnedInsights(
  mem: SmartEngineMemory,
  engines: SearchEngine[],
  now: Date
): LearnedInsight[] {
  const insights: LearnedInsight[] = [];

  if (mem.totalSignals === 0) {
    return [
      {
        id: 'awaiting',
        label: 'Clean Slate Active',
        value: '0 signals',
        detail: 'Open shortcuts, run searches, or start focus timers — Cove builds its circadian & workflow graph strictly from your real actions.'
      }
    ];
  }

  // 1. Peak Circadian Hour
  let peakHour = 0;
  let peakCount = 0;
  mem.hourlyActivity.forEach((c, hr) => {
    if (c > peakCount) {
      peakCount = c;
      peakHour = hr;
    }
  });
  if (peakCount > 0) {
    const nextHr = (peakHour + 1) % 24;
    const fmt = (h: number) => `${String(h).padStart(2, '0')}:00`;
    insights.push({
      id: 'peak-hour',
      label: 'Peak Flow Window',
      value: `${fmt(peakHour)}–${fmt(nextHr)}`,
      detail: `${peakCount} interactions recorded during this hour`
    });
  }

  // 2. Top Markov Workflow Chain
  const topChain = getTopWorkflowChains(mem, 1)[0];
  if (topChain) {
    insights.push({
      id: 'top-chain',
      label: 'Learned Workflow Chain',
      value: `${topChain.fromLabel} → ${topChain.toLabel}`,
      detail: `${topChain.probabilityPct}% transition likelihood within 15m`
    });
  }

  // 3. Preferred Focus Duration
  const totalFocusSignals = mem.hourlyFocus.reduce((a, b) => a + b, 0);
  if (totalFocusSignals > 0) {
    insights.push({
      id: 'focus-pref',
      label: 'Calibrated Focus Sprint',
      value: `${mem.preferredFocusMinutes} min`,
      detail: `Adapted via EMA from ${Math.round(totalFocusSignals / 2)} focus session(s)`
    });
  }

  // 4. Current Window Engine
  const predEng = getPredictedSearchEngine(engines, mem, now);
  if (predEng) {
    insights.push({
      id: 'slot-engine',
      label: 'Current Slot Search',
      value: `${predEng.name} (${predEng.bang})`,
      detail: `Matched to ${getCircadianSlot(now).label}`
    });
  }

  return insights;
}

export function buildSmartPulseSuggestions(params: {
  mem: SmartEngineMemory;
  now: Date;
  triage: TabTriageSummary;
  quickLinks: QuickLinkItem[];
  readLater: ReadLaterItem[];
  focusRunning: boolean;
  enableMarkov?: boolean;
  currentSceneIndex?: number;
}): SmartPulseSuggestion[] {
  const {
    mem,
    now,
    triage,
    quickLinks,
    readLater,
    focusRunning,
    enableMarkov = true,
    currentSceneIndex
  } = params;
  const candidates: (SmartPulseSuggestion & { rankScore: number })[] = [];
  const nowTs = now.getTime();
  const { label: slotLabel } = getCircadianSlot(now);

  // Exponential backoff per pulse dismissal: 6h -> 24h -> 72h -> 168h
  const isDismissed = (id: string) => {
    const ts = mem.dismissedPulseIds[id];
    if (!ts) return false;
    const strikes = mem.dismissCountByPulse?.[id] || 1;
    const quietHours = strikes === 1 ? 6 : strikes === 2 ? 24 : strikes === 3 ? 72 : 168;
    return nowTs - ts < quietHours * 3600_000;
  };

  const aff = (kind: SmartPulseSuggestion['kind']) => mem.categoryAffinity?.[kind] ?? 1.0;

  // 1. First-Order Markov Next-Step Chain Suggestion
  if (enableMarkov) {
    const chain = getActiveMarkovPrediction(mem, nowTs);
    if (chain) {
      const pulseId = `chain-${chain.fromKey}-${chain.toKey}`;
      if (!isDismissed(pulseId)) {
        if (chain.toKind === 'link' && chain.toTarget) {
          const [, url] = chain.toTarget.split('|');
          candidates.push({
            id: pulseId,
            kind: 'chain',
            chainFrom: chain.fromLabel,
            title: `Next up: ${chain.toLabel}`,
            subtitle: `${chain.probabilityPct}% after ${chain.fromLabel}`,
            ctaLabel: 'Continue',
            reason: `Learned workflow: ${chain.fromLabel} → ${chain.toLabel} (${chain.probabilityPct}%)`,
            domainForLogo: url,
            confidence: chain.probabilityPct,
            action: 'open_url',
            payload: chain.toTarget,
            rankScore: 96 * aff('chain')
          });
        } else if (chain.toKind === 'focus' && !focusRunning) {
          candidates.push({
            id: pulseId,
            kind: 'chain',
            chainFrom: chain.fromLabel,
            title: `Start ${mem.preferredFocusMinutes}m Focus`,
            subtitle: `Usual next step after ${chain.fromLabel}`,
            ctaLabel: 'Start flow',
            reason: `Learned workflow: ${chain.fromLabel} → Focus (${chain.probabilityPct}%)`,
            confidence: chain.probabilityPct,
            action: 'start_focus',
            payload: (chain.toTarget as SoundscapeId) || 'waves',
            rankScore: 94 * aff('chain')
          });
        }
      }
    }
  }

  // 2. Workspace Tab Hygiene
  if (triage.duplicateExtraCount >= 1 && !isDismissed('hygiene-dupes')) {
    const topGrp = triage.duplicateGroups[0];
    candidates.push({
      id: 'hygiene-dupes',
      kind: 'hygiene',
      title: `${triage.duplicateExtraCount} duplicate tab${triage.duplicateExtraCount > 1 ? 's' : ''} (${topGrp?.domain || 'domain'})`,
      subtitle: 'Keep newest, close redundant copies',
      ctaLabel: 'Clean',
      reason: `Detected ${triage.duplicateExtraCount} duplicate tab(s) in active workspace`,
      domainForLogo: topGrp?.domain,
      confidence: 95,
      action: 'clean_dupes',
      rankScore: 93 * aff('hygiene')
    });
  } else if (triage.staleTabs.length >= 2 && !isDismissed('hygiene-stale')) {
    const estMb = triage.staleTabs.reduce((acc, t) => acc + t.estimatedRamMb, 0);
    candidates.push({
      id: 'hygiene-stale',
      kind: 'hygiene',
      title: `${triage.staleTabs.length} idle tabs (~${estMb} MB)`,
      subtitle: 'Suspend gracefully without losing URLs',
      ctaLabel: 'Rest tabs',
      reason: `Inactive past your stale threshold`,
      domainForLogo: triage.staleTabs[0]?.domain,
      confidence: 91,
      action: 'rest_stale',
      rankScore: 89 * aff('hygiene')
    });
  }

  // 3. Learned Circadian Focus Window
  const hr = now.getHours();
  const focusScoreAtHour = mem.hourlyFocus[hr] || 0;
  if (!focusRunning && focusScoreAtHour >= 2 && !isDismissed('focus-window')) {
    const bestSound = getPredictedSoundscape(mem, now);
    candidates.push({
      id: 'focus-window',
      kind: 'focus',
      title: `Peak focus window (${mem.preferredFocusMinutes}m)`,
      subtitle: 'Start deep work session',
      ctaLabel: 'Focus',
      reason: `Based on your real focus sessions around ${hr}:00`,
      confidence: 88,
      action: 'start_focus',
      payload: bestSound,
      rankScore: 87 * aff('focus')
    });
  }

  // 4. Circadian Top Shortcut
  const ranked = rankQuickLinksSmart(quickLinks, mem, now);
  if (ranked[0] && ranked[0].isTopPick && !ranked[0].isChainNext) {
    const top = ranked[0].item;
    const pulseId = `shortcut-${top.id}`;
    if (!isDismissed(pulseId)) {
      candidates.push({
        id: pulseId,
        kind: 'shortcut',
        title: `${slotLabel.split('·')[1]?.trim() || 'Routine'}: ${top.title}`,
        subtitle: extractDomain(top.url),
        ctaLabel: 'Open',
        reason: `Ranked #1 in ${slotLabel} from your history`,
        domainForLogo: top.url,
        confidence: 86,
        action: 'open_url',
        payload: `${top.id}|${top.url}`,
        rankScore: 84 * aff('shortcut')
      });
    }
  }

  // 5. Circadian Scene Harmony Suggestion
  const predScene = getPredictedSceneIndex(mem, now);
  if (
    predScene !== null &&
    currentSceneIndex !== undefined &&
    predScene !== currentSceneIndex &&
    !isDismissed(`scene-${predScene}`)
  ) {
    const sc = CURATED_WALLPAPERS[predScene];
    if (sc) {
      candidates.push({
        id: `scene-${predScene}`,
        kind: 'scene',
        title: `Switch to ${sc.label}`,
        subtitle: `Your favorite ${slotLabel.split('·')[1]?.trim().toLowerCase() || 'slot'} scene`,
        ctaLabel: 'Apply',
        reason: `You frequently choose ${sc.label} during ${slotLabel}`,
        confidence: 82,
        action: 'apply_scene',
        payload: String(predScene),
        rankScore: 79 * aff('scene')
      });
    }
  }

  // 6. Unread Offline Articles
  const unread = readLater.filter((r) => !r.read);
  if (unread.length > 0 && !isDismissed('unread-queue')) {
    candidates.push({
      id: 'unread-queue',
      kind: 'reading',
      title: `${unread.length} unread in Offline Reader`,
      subtitle: unread[0].title,
      ctaLabel: 'Read',
      reason: `${unread.length} saved article(s) ready offline`,
      domainForLogo: unread[0].url,
      confidence: 84,
      action: 'surprise_read',
      rankScore: 81 * aff('reading')
    });
  }

  candidates.sort((a, b) => b.rankScore - a.rankScore);
  return candidates.slice(0, 2);
}
