import type {
  NeuralDepth,
  NeuralModeId,
  SoundLayerMix,
  SoundscapeId,
  SoundTrackId
} from './types';

/**
 * Cove Neural Sound Engine (focus-oriented procedural Web Audio synthesizer)
 *
 * 100% Procedural Web Audio API — 0 KB external audio assets, 0 network requests.
 * Combines:
 *  1. Polyphonic Warm Harmonic Drone Pads (open 5th/9th voicings, zero melodic ear-catch)
 *  2. Neural Phase-Locking Modulation (Beta 16 Hz, Alpha 10.5 Hz, Low-Alpha 8.5 Hz, Theta 5.5 Hz)
 *     applied simultaneously to filter cutoff & smooth amplitude envelope + 3D spatial stereo drift
 *  3. Coupled Acoustic Nature & Room Textures (Waves, Rain, Café, Velvet Noise, Pine Wind)
 *  4. Vocal-Formant Distraction Shield (gentle speech-frequency masking curve)
 *  5. Real-time AnalyserNode spectrum sampling for genuine live visualizers
 */

export interface NeuralModeSpec {
  id: Exclude<NeuralModeId, 'off'>;
  label: string;
  shortLabel: string;
  band: string;
  hz: number;
  tagline: string;
  chordHz: [number, number, number, number];
  baseCutoffHz: number;
  spatialRateHz: number;
  recommendedMix: SoundLayerMix;
}

export const NEURAL_MODES: Record<Exclude<NeuralModeId, 'off'>, NeuralModeSpec> = {
  deep_focus: {
    id: 'deep_focus',
    label: 'Deep Work',
    shortLabel: 'Deep Work',
    band: '16 Hz Beta',
    hz: 16.0,
    tagline: 'Sustained cognitive drive & distraction masking',
    chordHz: [73.42, 110.0, 164.81, 220.0], // D2 - A2 - E3 - A3 (open suspended 5th/9th)
    baseCutoffHz: 460,
    spatialRateHz: 0.09,
    recommendedMix: { waves: 0, rain: 0.42, cafe: 0, whitenoise: 0.28, wind: 0 }
  },
  creative_flow: {
    id: 'creative_flow',
    label: 'Creative Flow',
    shortLabel: 'Flow',
    band: '10.5 Hz Alpha',
    hz: 10.5,
    tagline: 'Unhurried clarity for writing, design & exploration',
    chordHz: [65.41, 98.0, 146.83, 164.81], // C2 - G2 - D3 - E3 (warm major 9th)
    baseCutoffHz: 520,
    spatialRateHz: 0.065,
    recommendedMix: { waves: 0.52, rain: 0, cafe: 0.25, whitenoise: 0, wind: 0.22 }
  },
  calm_read: {
    id: 'calm_read',
    label: 'Calm Reading',
    shortLabel: 'Read',
    band: '8.5 Hz Low-Alpha',
    hz: 8.5,
    tagline: 'Soft, low-arousal stillness for deep reading & study',
    chordHz: [87.31, 130.81, 196.0, 220.0], // F2 - C3 - G3 - A3
    baseCutoffHz: 390,
    spatialRateHz: 0.045,
    recommendedMix: { waves: 0, rain: 0.48, cafe: 0, whitenoise: 0.16, wind: 0.2 }
  },
  unwind: {
    id: 'unwind',
    label: 'Recharge & Unwind',
    shortLabel: 'Unwind',
    band: '5.5 Hz Theta',
    hz: 5.5,
    tagline: 'Restorative mental decompression between sprints',
    chordHz: [55.0, 82.41, 123.47, 138.59], // A1 - E2 - B2 - C#3
    baseCutoffHz: 330,
    spatialRateHz: 0.032,
    recommendedMix: { waves: 0.68, rain: 0, cafe: 0, whitenoise: 0, wind: 0.35 }
  }
};

const DEPTH_SCALES: Record<NeuralDepth, { ampDepth: number; filterDepth: number; padGain: number }> = {
  subtle: { ampDepth: 0.13, filterDepth: 95, padGain: 0.26 },
  balanced: { ampDepth: 0.24, filterDepth: 175, padGain: 0.36 },
  high: { ampDepth: 0.37, filterDepth: 265, padGain: 0.45 }
};

interface ActiveLayer {
  gain: GainNode;
  nodes: AudioNode[];
  timers: number[];
}

interface NeuralGraph {
  mode: Exclude<NeuralModeId, 'off'>;
  padOutGain: GainNode;
  padFilter: BiquadFilterNode;
  modOsc: OscillatorNode;
  modAmpGain: GainNode;
  modFilterGain: GainNode;
  nodes: AudioNode[];
}

class NeuralSoundEngine {
  private ctx: AudioContext | null = null;
  private masterGain: GainNode | null = null;
  private textureBus: GainNode | null = null;
  private speechShieldEQ: BiquadFilterNode | null = null;
  private analyser: AnalyserNode | null = null;
  private freqBins: Uint8Array<ArrayBuffer> | null = null;
  private noiseBuffer: AudioBuffer | null = null;

  private layers = new Map<SoundTrackId, ActiveLayer>();
  private neuralGraph: NeuralGraph | null = null;

  private volume = 0.45;
  private currentDepth: NeuralDepth = 'balanced';
  private speechBlockerEnabled = true;

  private ensureContext(): AudioContext {
    if (!this.ctx) {
      const AudioCtx = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      const ctx = new AudioCtx();
      this.ctx = ctx;

      this.masterGain = ctx.createGain();
      this.masterGain.gain.value = 0.0001; // Smooth ramp on start

      this.speechShieldEQ = ctx.createBiquadFilter();
      this.speechShieldEQ.type = 'peaking';
      this.speechShieldEQ.frequency.value = 540;
      this.speechShieldEQ.Q.value = 0.65;
      this.speechShieldEQ.gain.value = this.speechBlockerEnabled ? 3.2 : 0;

      this.textureBus = ctx.createGain();
      this.textureBus.gain.value = 0.92;

      this.analyser = ctx.createAnalyser();
      this.analyser.fftSize = 64;
      this.analyser.smoothingTimeConstant = 0.82;
      this.freqBins = new Uint8Array(new ArrayBuffer(this.analyser.frequencyBinCount));

      this.textureBus.connect(this.speechShieldEQ);
      this.speechShieldEQ.connect(this.masterGain);
      this.masterGain.connect(this.analyser);
      this.analyser.connect(ctx.destination);

      this.noiseBuffer = this.createPinkNoiseBuffer(ctx, 7);
      this.masterGain.gain.setTargetAtTime(this.volume, ctx.currentTime, 0.35);
    }
    if (this.ctx.state === 'suspended') {
      this.ctx.resume().catch(() => {});
    }
    return this.ctx;
  }

  private createPinkNoiseBuffer(ctx: AudioContext, seconds = 7): AudioBuffer {
    const length = ctx.sampleRate * seconds;
    const buffer = ctx.createBuffer(2, length, ctx.sampleRate);
    for (let ch = 0; ch < 2; ch++) {
      const data = buffer.getChannelData(ch);
      let b0 = 0, b1 = 0, b2 = 0, b3 = 0, b4 = 0, b5 = 0, b6 = 0;
      for (const i of Array.from({ length }, (_, idx) => idx)) {
        const white = Math.random() * 2 - 1;
        b0 = 0.99886 * b0 + white * 0.0555179;
        b1 = 0.99332 * b1 + white * 0.0750759;
        b2 = 0.96900 * b2 + white * 0.1538520;
        b3 = 0.86650 * b3 + white * 0.3104856;
        b4 = 0.55000 * b4 + white * 0.5329522;
        b5 = -0.7616 * b5 - white * 0.0168980;
        data[i] = (b0 + b1 + b2 + b3 + b4 + b5 + b6 + white * 0.5362) * 0.042;
        b6 = white * 0.115926;
      }
      // Seamless crossfade loop
      const fadeSamples = Math.floor(ctx.sampleRate * 0.35);
      for (let i = 0; i < fadeSamples; i++) {
        const t = i / fadeSamples;
        const endIdx = length - fadeSamples + i;
        data[endIdx] = data[endIdx] * (1 - t) + data[i] * t;
      }
    }
    return buffer;
  }

  /**
   * Spawns or transitions the procedural polyphonic audio graph
   */
  public setNeuralState(
    mode: NeuralModeId,
    depth: NeuralDepth = this.currentDepth,
    speechBlocker = this.speechBlockerEnabled
  ): void {
    this.currentDepth = depth;
    this.speechBlockerEnabled = speechBlocker;

    if (this.speechShieldEQ && this.ctx) {
      this.speechShieldEQ.gain.setTargetAtTime(speechBlocker ? 3.2 : 0, this.ctx.currentTime, 0.25);
    }

    if (mode === 'off') {
      this.destroyNeuralGraph();
      return;
    }

    const ctx = this.ensureContext();
    const spec = NEURAL_MODES[mode];
    const scale = DEPTH_SCALES[depth];

    // If same mode is already running, smoothly morph depth & modulation parameters
    if (this.neuralGraph && this.neuralGraph.mode === mode) {
      const now = ctx.currentTime;
      this.neuralGraph.modOsc.frequency.setTargetAtTime(spec.hz, now, 0.35);
      this.neuralGraph.padFilter.frequency.setTargetAtTime(spec.baseCutoffHz, now, 0.35);
      this.neuralGraph.modAmpGain.gain.setTargetAtTime(scale.ampDepth, now, 0.25);
      this.neuralGraph.modFilterGain.gain.setTargetAtTime(scale.filterDepth, now, 0.25);
      this.neuralGraph.padOutGain.gain.setTargetAtTime(scale.padGain, now, 0.35);
      return;
    }

    this.destroyNeuralGraph();

    const now = ctx.currentTime;
    const nodes: AudioNode[] = [];

    // Warm resonant low-pass filter on the harmonic chord bed
    const padFilter = ctx.createBiquadFilter();
    padFilter.type = 'lowpass';
    padFilter.frequency.value = spec.baseCutoffHz;
    padFilter.Q.value = 0.85;

    // Phase-locked amplitude modulation stage
    const modulatedCarrierGain = ctx.createGain();
    modulatedCarrierGain.gain.value = 1 - scale.ampDepth * 0.5;

    // 3D Spatial stereo movement (gentle figure-8 drift)
    const stereoPanner = ctx.createStereoPanner();
    const spatialLfo = ctx.createOscillator();
    spatialLfo.type = 'sine';
    spatialLfo.frequency.value = spec.spatialRateHz;
    const spatialDepth = ctx.createGain();
    spatialDepth.gain.value = 0.34;
    spatialLfo.connect(spatialDepth).connect(stereoPanner.pan);
    spatialLfo.start(now);

    // Smooth fade-in output stage (3.5s gentle amplitude ramp)
    const padOutGain = ctx.createGain();
    padOutGain.gain.setValueAtTime(0.0001, now);
    padOutGain.gain.setTargetAtTime(scale.padGain, now, 0.9);

    // Neural Phase-Locking LFO (16 Hz Beta / 10.5 Hz Alpha / 8.5 Hz Read / 5.5 Hz Theta)
    const modOsc = ctx.createOscillator();
    modOsc.type = 'sine';
    modOsc.frequency.value = spec.hz;

    const modAmpGain = ctx.createGain();
    modAmpGain.gain.value = scale.ampDepth;

    const modFilterGain = ctx.createGain();
    modFilterGain.gain.value = scale.filterDepth;

    modOsc.connect(modAmpGain).connect(modulatedCarrierGain.gain);
    modOsc.connect(modFilterGain).connect(padFilter.frequency);

    // Couple subtle 22% neural pulse into the acoustic texture bus so rain/waves breathe together
    if (this.textureBus) {
      const texCoupleGain = ctx.createGain();
      texCoupleGain.gain.value = scale.ampDepth * 0.28;
      modOsc.connect(texCoupleGain).connect(this.textureBus.gain);
      nodes.push(texCoupleGain);
    }

    modOsc.start(now);

    // 4-voice polyphonic warm harmonic bed + gentle slow breathing detune
    spec.chordHz.forEach((freq, idx) => {
      const osc = ctx.createOscillator();
      osc.type = idx % 2 === 0 ? 'sine' : 'triangle';
      // Subtle stereo binaural micro-shimmer on top voice
      const detuneHz = idx === 3 ? Math.min(3.5, spec.hz * 0.2) : 0;
      osc.frequency.value = freq + detuneHz;

      const voiceGain = ctx.createGain();
      const voiceWeights = [0.36, 0.3, 0.2, 0.14];
      voiceGain.gain.value = voiceWeights[idx] || 0.2;

      const voicePanner = ctx.createStereoPanner();
      voicePanner.pan.value = idx % 2 === 0 ? -0.22 : 0.22;

      osc.connect(voiceGain).connect(voicePanner).connect(padFilter);
      osc.start(now);
      nodes.push(osc, voiceGain, voicePanner);
    });

    // Sub-velvet warm pink floor under the chord pad so it feels acoustic, never clinical
    const velvetSrc = ctx.createBufferSource();
    velvetSrc.buffer = this.noiseBuffer!;
    velvetSrc.loop = true;
    const velvetLp = ctx.createBiquadFilter();
    velvetLp.type = 'lowpass';
    velvetLp.frequency.value = 290;
    const velvetGain = ctx.createGain();
    velvetGain.gain.value = 0.24;
    velvetSrc.connect(velvetLp).connect(velvetGain).connect(padFilter);
    velvetSrc.start(now, Math.random() * 2);

    padFilter
      .connect(modulatedCarrierGain)
      .connect(stereoPanner)
      .connect(padOutGain)
      .connect(this.masterGain!);

    nodes.push(
      padFilter,
      modulatedCarrierGain,
      stereoPanner,
      spatialLfo,
      spatialDepth,
      padOutGain,
      modOsc,
      modAmpGain,
      modFilterGain,
      velvetSrc,
      velvetLp,
      velvetGain
    );

    this.neuralGraph = {
      mode,
      padOutGain,
      padFilter,
      modOsc,
      modAmpGain,
      modFilterGain,
      nodes
    };
  }

  private destroyNeuralGraph(): void {
    const g = this.neuralGraph;
    if (!g) return;
    this.neuralGraph = null;
    if (this.textureBus && this.ctx) {
      this.textureBus.gain.setTargetAtTime(0.92, this.ctx.currentTime, 0.1);
    }
    for (const n of g.nodes) {
      try {
        if ('stop' in n && typeof (n as OscillatorNode).stop === 'function') {
          (n as OscillatorNode).stop();
        }
        n.disconnect();
      } catch {
        // ignore already stopped
      }
    }
  }

  private spawnTrack(id: SoundTrackId, initialGain: number): ActiveLayer {
    const ctx = this.ensureContext();
    const outGain = ctx.createGain();
    outGain.gain.value = 0.0001;
    outGain.gain.setTargetAtTime(Math.max(0, Math.min(1, initialGain)), ctx.currentTime, 0.25);
    outGain.connect(this.textureBus!);

    const nodes: AudioNode[] = [outGain];
    const timers: number[] = [];

    const makeNoise = () => {
      const src = ctx.createBufferSource();
      src.buffer = this.noiseBuffer!;
      src.loop = true;
      src.start(0, Math.random() * 3);
      nodes.push(src);
      return src;
    };

    if (id === 'whitenoise') {
      const src = makeNoise();
      const lp = ctx.createBiquadFilter();
      lp.type = 'lowpass';
      lp.frequency.value = 1350;
      src.connect(lp).connect(outGain);
      nodes.push(lp);
    } else if (id === 'rain') {
      const src = makeNoise();
      const bp = ctx.createBiquadFilter();
      bp.type = 'bandpass';
      bp.frequency.value = 1280;
      bp.Q.value = 0.52;
      src.connect(bp).connect(outGain);
      nodes.push(bp);

      const timer = window.setInterval(() => {
        if (!this.ctx || !this.layers.has('rain')) return;
        const dropOsc = this.ctx.createOscillator();
        const dropGain = this.ctx.createGain();
        dropOsc.type = 'sine';
        const freq = 850 + Math.random() * 1050;
        const now = this.ctx.currentTime;
        dropOsc.frequency.setValueAtTime(freq, now);
        dropOsc.frequency.exponentialRampToValueAtTime(freq * 0.58, now + 0.045);
        dropGain.gain.setValueAtTime(0.0001, now);
        dropGain.gain.linearRampToValueAtTime(0.015 * Math.random(), now + 0.006);
        dropGain.gain.exponentialRampToValueAtTime(0.0001, now + 0.05);
        dropOsc.connect(dropGain).connect(outGain);
        dropOsc.start(now);
        dropOsc.stop(now + 0.055);
      }, 220);
      timers.push(timer);
    } else if (id === 'waves') {
      const src = makeNoise();
      const lp = ctx.createBiquadFilter();
      lp.type = 'lowpass';
      lp.frequency.value = 440;

      const waveGain = ctx.createGain();
      waveGain.gain.value = 0.55;

      const lfo = ctx.createOscillator();
      lfo.type = 'sine';
      lfo.frequency.value = 0.105;

      const lfoFilterDepth = ctx.createGain();
      lfoFilterDepth.gain.value = 290;

      const lfoAmpDepth = ctx.createGain();
      lfoAmpDepth.gain.value = 0.28;

      lfo.connect(lfoFilterDepth).connect(lp.frequency);
      lfo.connect(lfoAmpDepth).connect(waveGain.gain);
      lfo.start();

      src.connect(lp).connect(waveGain).connect(outGain);
      nodes.push(lp, waveGain, lfo, lfoFilterDepth, lfoAmpDepth);
    } else if (id === 'cafe') {
      const src1 = makeNoise();
      const bp1 = ctx.createBiquadFilter();
      bp1.type = 'bandpass';
      bp1.frequency.value = 390;
      bp1.Q.value = 1.05;

      const src2 = makeNoise();
      const bp2 = ctx.createBiquadFilter();
      bp2.type = 'bandpass';
      bp2.frequency.value = 760;
      bp2.Q.value = 1.75;

      const lfo = ctx.createOscillator();
      lfo.frequency.value = 0.21;
      const lfoDepth = ctx.createGain();
      lfoDepth.gain.value = 135;
      lfo.connect(lfoDepth).connect(bp2.frequency);
      lfo.start();

      src1.connect(bp1).connect(outGain);
      src2.connect(bp2).connect(outGain);
      nodes.push(bp1, bp2, lfo, lfoDepth);
    } else if (id === 'wind') {
      const src = makeNoise();
      const bp = ctx.createBiquadFilter();
      bp.type = 'bandpass';
      bp.frequency.value = 510;
      bp.Q.value = 3.0;

      const lfo = ctx.createOscillator();
      lfo.frequency.value = 0.075;
      const depth = ctx.createGain();
      depth.gain.value = 210;
      lfo.connect(depth).connect(bp.frequency);
      lfo.start();

      src.connect(bp).connect(outGain);
      nodes.push(bp, lfo, depth);
    }

    const layer: ActiveLayer = { gain: outGain, nodes, timers };
    this.layers.set(id, layer);
    return layer;
  }

  private destroyLayer(id: SoundTrackId): void {
    const layer = this.layers.get(id);
    if (!layer) return;
    this.layers.delete(id);
    for (const t of layer.timers) window.clearInterval(t);
    for (const n of layer.nodes) {
      try {
        if ('stop' in n && typeof (n as OscillatorNode).stop === 'function') {
          (n as OscillatorNode).stop();
        }
        n.disconnect();
      } catch {
        // ignore
      }
    }
  }

  public stop(): void {
    this.destroyNeuralGraph();
    for (const id of [...this.layers.keys()]) {
      this.destroyLayer(id);
    }
  }

  public setVolume(vol: number): void {
    this.volume = Math.max(0, Math.min(1, vol));
    if (this.masterGain && this.ctx) {
      this.masterGain.gain.setTargetAtTime(this.volume, this.ctx.currentTime, 0.08);
    }
  }

  public applyMix(mix: SoundLayerMix, masterVol = this.volume): void {
    this.setVolume(masterVol);
    const tracks: SoundTrackId[] = ['waves', 'rain', 'cafe', 'whitenoise', 'wind'];
    for (const id of tracks) {
      const level = Math.max(0, Math.min(1, mix[id] || 0));
      if (level <= 0.01) {
        this.destroyLayer(id);
      } else {
        const existing = this.layers.get(id);
        if (existing && this.ctx) {
          existing.gain.gain.setTargetAtTime(level, this.ctx.currentTime, 0.08);
        } else {
          this.spawnTrack(id, level);
        }
      }
    }
  }

  public play(id: SoundscapeId, volume = this.volume): void {
    for (const tid of [...this.layers.keys()]) {
      this.destroyLayer(tid);
    }
    this.setVolume(volume);
    if (id === 'none') return;
    this.spawnTrack(id, 0.8);
  }

  /**
   * Samples genuine real-time Web Audio spectrum bars (0..1) from the master AnalyserNode.
   * Returns all zeros honestly when audio is stopped.
   */
  public sampleSpectrum(barCount = 20): number[] {
    if (!this.analyser || !this.freqBins || (!this.neuralGraph && this.layers.size === 0)) {
      return new Array(barCount).fill(0);
    }
    this.analyser.getByteFrequencyData(this.freqBins);
    const out: number[] = [];
    const usableBins = Math.min(this.freqBins.length, 24);
    for (let i = 0; i < barCount; i++) {
      const binIdx = Math.floor((i / barCount) * usableBins);
      const v = (this.freqBins[binIdx] || 0) / 255;
      out.push(Math.min(1, Math.pow(v, 0.85)));
    }
    return out;
  }

  public isActive(): boolean {
    return Boolean(this.neuralGraph) || this.layers.size > 0;
  }

  public playCalmChime(): void {
    const ctx = this.ensureContext();
    const now = ctx.currentTime;
    const freqs = [528, 660, 792];
    freqs.forEach((f, idx) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'sine';
      osc.frequency.value = f;
      const start = now + idx * 0.12;
      gain.gain.setValueAtTime(0.0001, start);
      gain.gain.linearRampToValueAtTime(0.13, start + 0.03);
      gain.gain.exponentialRampToValueAtTime(0.0001, start + 1.9);
      osc.connect(gain).connect(ctx.destination);
      osc.start(start);
      osc.stop(start + 1.95);
    });
  }
}

export const soundEngine = new NeuralSoundEngine();
