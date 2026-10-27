/**
 * Cove Atmosphere Engine
 * Dynamically analyzes wallpaper luminance, top-hero sky brightness, and
 * chromatic palette on an offscreen HTML5 <canvas>, then adapts scrim brightness,
 * hero text contrast, glass frosting density, and Chameleon UI accent colors.
 */

export interface WallpaperAtmosphere {
  overallLuminance: number; // 0..1 perceptual luminance
  heroLuminance: number; // 0..1 top 38% region where Hero Clock & TopBar sit
  accentHex: string;
  accentHoverHex: string;
  accentTextDarkHex: string;
  accentTextLightHex: string;
  accentSoftRgba: string;
  accentInkHex: string;
  exposureTag: 'low-key' | 'balanced' | 'bright-sky';
}

const sampleCache = new Map<string, WallpaperAtmosphere>();

function clamp(n: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, n));
}

function rgbToHsl(r: number, g: number, b: number): [number, number, number] {
  const rn = r / 255;
  const gn = g / 255;
  const bn = b / 255;
  const max = Math.max(rn, gn, bn);
  const min = Math.min(rn, gn, bn);
  let h = 0;
  let s = 0;
  const l = (max + min) / 2;

  if (max !== min) {
    const d = max - min;
    s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
    switch (max) {
      case rn:
        h = (gn - bn) / d + (gn < bn ? 6 : 0);
        break;
      case gn:
        h = (bn - rn) / d + 2;
        break;
      default:
        h = (rn - gn) / d + 4;
        break;
    }
    h /= 6;
  }
  return [h * 360, s * 100, l * 100];
}

function hslToRgb(h: number, s: number, l: number): [number, number, number] {
  const hn = ((h % 360) + 360) % 360 / 360;
  const sn = clamp(s, 0, 100) / 100;
  const ln = clamp(l, 0, 100) / 100;

  if (sn === 0) {
    const v = Math.round(ln * 255);
    return [v, v, v];
  }
  const hue2rgb = (p: number, q: number, t: number) => {
    let tt = t;
    if (tt < 0) tt += 1;
    if (tt > 1) tt -= 1;
    if (tt < 1 / 6) return p + (q - p) * 6 * tt;
    if (tt < 1 / 2) return q;
    if (tt < 2 / 3) return p + (q - p) * (2 / 3 - tt) * 6;
    return p;
  };
  const q = ln < 0.5 ? ln * (1 + sn) : ln + sn - ln * sn;
  const p = 2 * ln - q;
  return [
    Math.round(hue2rgb(p, q, hn + 1 / 3) * 255),
    Math.round(hue2rgb(p, q, hn) * 255),
    Math.round(hue2rgb(p, q, hn - 1 / 3) * 255)
  ];
}

function rgbToHex(r: number, g: number, b: number): string {
  return `#${[r, g, b].map((c) => clamp(Math.round(c), 0, 255).toString(16).padStart(2, '0')).join('')}`;
}

function hexToRgb(hex: string): [number, number, number] {
  const clean = hex.replace('#', '').trim();
  if (clean.length === 3) {
    return [
      parseInt(clean[0] + clean[0], 16),
      parseInt(clean[1] + clean[1], 16),
      parseInt(clean[2] + clean[2], 16)
    ];
  }
  return [
    parseInt(clean.slice(0, 2) || '63', 16),
    parseInt(clean.slice(2, 4) || 'b3', 16),
    parseInt(clean.slice(4, 6) || 'b6', 16)
  ];
}

export function buildAtmosphereFromSeed(
  overallLum: number,
  heroLum: number,
  seedHex: string
): WallpaperAtmosphere {
  const [r, g, b] = hexToRgb(seedHex);
  const [h, rawS] = rgbToHsl(r, g, b);
  const sat = clamp(rawS, 34, 64);

  const [ar, ag, ab] = hslToRgb(h, sat, 56);
  const [hr, hg, hb] = hslToRgb(h, sat + 4, 62);
  const [tdr, tdg, tdb] = hslToRgb(h, sat + 6, 74);
  const [tlr, tlg, tlb] = hslToRgb(h, sat + 6, 33);

  const exposureTag: WallpaperAtmosphere['exposureTag'] =
    heroLum > 0.58 ? 'bright-sky' : overallLum < 0.25 ? 'low-key' : 'balanced';

  return {
    overallLuminance: Math.round(overallLum * 100) / 100,
    heroLuminance: Math.round(heroLum * 100) / 100,
    accentHex: rgbToHex(ar, ag, ab),
    accentHoverHex: rgbToHex(hr, hg, hb),
    accentTextDarkHex: rgbToHex(tdr, tdg, tdb),
    accentTextLightHex: rgbToHex(tlr, tlg, tlb),
    accentSoftRgba: `rgba(${ar}, ${ag}, ${ab}, 0.20)`,
    accentInkHex: '#081316',
    exposureTag
  };
}

/**
 * Samples actual pixels of any local/uploaded/remote wallpaper on a 64x36 canvas
 * to compute perceptual luminance + vibrant chromatic accent color.
 */
export async function analyzeWallpaperImage(
  imageUrl: string,
  fallback: WallpaperAtmosphere
): Promise<WallpaperAtmosphere> {
  if (!imageUrl || typeof document === 'undefined') return fallback;
  const cached = sampleCache.get(imageUrl);
  if (cached) return cached;

  return new Promise((resolve) => {
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.decoding = 'async';

    img.onload = () => {
      try {
        const w = 64;
        const h = 36;
        const canvas = document.createElement('canvas');
        canvas.width = w;
        canvas.height = h;
        const ctx = canvas.getContext('2d', { willReadFrequently: true });
        if (!ctx) {
          resolve(fallback);
          return;
        }
        ctx.drawImage(img, 0, 0, w, h);
        const { data } = ctx.getImageData(0, 0, w, h);

        let totalLum = 0;
        let heroLum = 0;
        let heroCount = 0;
        const heroRows = Math.floor(h * 0.38);

        // Hue histogram (12 buckets of 30deg) weighted by saturation & mid-lightness
        const hueWeights = new Float64Array(12);
        const hueR = new Float64Array(12);
        const hueG = new Float64Array(12);
        const hueB = new Float64Array(12);

        const totalPixels = w * h;
        for (let py = 0; py < h; py++) {
          for (let px = 0; px < w; px++) {
            const idx = (py * w + px) * 4;
            const r = data[idx];
            const g = data[idx + 1];
            const b = data[idx + 2];

            // Rec.709 perceptual luminance (0..1)
            const lum = (0.2126 * r + 0.7152 * g + 0.0722 * b) / 255;
            totalLum += lum;
            if (py < heroRows) {
              heroLum += lum;
              heroCount += 1;
            }

            const [hue, sat, light] = rgbToHsl(r, g, b);
            if (sat >= 16 && light >= 18 && light <= 84) {
              const bucket = Math.floor(hue / 30) % 12;
              const weight = (sat / 100) * (1 - Math.abs(light - 52) / 52);
              hueWeights[bucket] += weight;
              hueR[bucket] += r * weight;
              hueG[bucket] += g * weight;
              hueB[bucket] += b * weight;
            }
          }
        }

        const avgLum = totalLum / totalPixels;
        const avgHeroLum = heroCount > 0 ? heroLum / heroCount : avgLum;

        let bestBucket = -1;
        let bestWeight = 0;
        for (let i = 0; i < 12; i++) {
          if (hueWeights[i] > bestWeight) {
            bestWeight = hueWeights[i];
            bestBucket = i;
          }
        }

        let seedHex = fallback.accentHex;
        if (bestBucket >= 0 && bestWeight > 1.2) {
          seedHex = rgbToHex(
            hueR[bestBucket] / bestWeight,
            hueG[bestBucket] / bestWeight,
            hueB[bestBucket] / bestWeight
          );
        }

        const result = buildAtmosphereFromSeed(avgLum, avgHeroLum, seedHex);
        sampleCache.set(imageUrl, result);
        resolve(result);
      } catch {
        // Tainted cross-origin fallback
        resolve(fallback);
      }
    };

    img.onerror = () => resolve(fallback);
    img.src = imageUrl;
  });
}

/**
 * Computes effective scrim alpha, top hero gradient protection, card frosting density,
 * and CSS variables so bright snow scenes and dark midnight scenes both look effortless.
 */
export function applyAtmosphereVariables(params: {
  atmo: WallpaperAtmosphere;
  userDim: number;
  userBrightness: number;
  userContrast: number;
  userVignette: number;
  autoBrightness: boolean;
  chameleonAccent: boolean;
  effectiveLightTheme: boolean;
}): { effectiveScrim: number; topHeroScrim: number; autoAdjustedBrightness: number } {
  const {
    atmo,
    userDim,
    userBrightness,
    userContrast,
    userVignette,
    autoBrightness,
    chameleonAccent,
    effectiveLightTheme
  } = params;

  let effectiveScrim = userDim;
  let topHeroScrim = userDim * 0.65;
  let autoAdjustedBrightness = userBrightness;
  let cardAlphaDark = 0.66;
  let cardAlphaLight = 0.74;

  if (autoBrightness) {
    // If wallpaper is bright (>0.55) in dark theme, gently add protective scrim & slightly tame glare
    if (!effectiveLightTheme && atmo.heroLuminance > 0.52) {
      const excess = atmo.heroLuminance - 0.52;
      effectiveScrim = clamp(userDim + excess * 0.36, 0.16, 0.68);
      topHeroScrim = clamp(0.22 + excess * 0.48, 0.18, 0.58);
      autoAdjustedBrightness = clamp(userBrightness * (1 - excess * 0.16), 0.72, 1.35);
      cardAlphaDark = clamp(0.68 + excess * 0.22, 0.66, 0.80);
    } else if (!effectiveLightTheme && atmo.overallLuminance < 0.24) {
      // Very dark moody scene (Midnight Fjord / Blue Hour Cafe) — lift shadows gently & keep scrim light!
      const darkness = 0.24 - atmo.overallLuminance;
      effectiveScrim = clamp(userDim - darkness * 0.45, 0.08, 0.65);
      topHeroScrim = clamp(0.10, 0.06, 0.35);
      autoAdjustedBrightness = clamp(userBrightness * (1 + darkness * 0.35), 0.75, 1.35);
      cardAlphaDark = 0.63;
    } else if (effectiveLightTheme) {
      topHeroScrim = atmo.heroLuminance > 0.64 ? 0.04 : 0.22;
      effectiveScrim = clamp(userDim * 0.72, 0.05, 0.45);
      cardAlphaLight = atmo.overallLuminance > 0.55 ? 0.78 : 0.72;
    }
  }

  if (typeof document !== 'undefined') {
    const root = document.documentElement;
    root.dataset.chameleon = chameleonAccent ? 'true' : 'false';
    root.dataset.heroTone =
      effectiveLightTheme && atmo.heroLuminance > 0.62 && autoBrightness ? 'dark-ink' : 'light-ink';

    root.style.setProperty('--wp-brightness', String(Math.round(autoAdjustedBrightness * 100) / 100));
    root.style.setProperty('--wp-contrast', String(Math.round(userContrast * 100) / 100));
    root.style.setProperty('--atmo-scrim-alpha', String(Math.round(effectiveScrim * 100) / 100));
    root.style.setProperty('--atmo-top-scrim', String(Math.round(topHeroScrim * 100) / 100));
    root.style.setProperty('--atmo-vignette', String(Math.round(userVignette * 100) / 100));
    root.style.setProperty('--card-alpha', String(Math.round(cardAlphaDark * 100) / 100));
    root.style.setProperty('--card-alpha-light', String(Math.round(cardAlphaLight * 100) / 100));

    if (chameleonAccent) {
      root.style.setProperty('--chameleon-accent', atmo.accentHex);
      root.style.setProperty('--chameleon-hover', atmo.accentHoverHex);
      root.style.setProperty(
        '--chameleon-text',
        effectiveLightTheme ? atmo.accentTextLightHex : atmo.accentTextDarkHex
      );
      root.style.setProperty('--chameleon-soft', atmo.accentSoftRgba);
      root.style.setProperty('--chameleon-ink', effectiveLightTheme ? '#ffffff' : atmo.accentInkHex);
    }
  }

  return {
    effectiveScrim: Math.round(effectiveScrim * 100) / 100,
    topHeroScrim: Math.round(topHeroScrim * 100) / 100,
    autoAdjustedBrightness: Math.round(autoAdjustedBrightness * 100) / 100
  };
}
