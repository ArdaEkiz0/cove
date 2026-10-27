export interface MoonPhaseInfo {
  phase: number; // 0..1 (0 = New, 0.25 = First Quarter, 0.5 = Full, 0.75 = Last Quarter)
  name: string;
  illumination: number; // 0..100
}

/**
 * Calculates lunar phase from synodic cycle (29.53058867 days) anchored to
 * known New Moon epoch (Jan 6, 2000 18:14 UTC). Zero network calls.
 */
export function getMoonPhase(date: Date = new Date()): MoonPhaseInfo {
  const synodicMonth = 29.53058867;
  const knownNewMoonMs = Date.UTC(2000, 0, 6, 18, 14, 0);
  const diffDays = (date.getTime() - knownNewMoonMs) / 86_400_000;
  let phase = (diffDays % synodicMonth) / synodicMonth;
  if (phase < 0) phase += 1;

  const illumination = Math.round(((1 - Math.cos(2 * Math.PI * phase)) / 2) * 100);

  let name = 'New Moon';
  if (phase < 0.03 || phase >= 0.97) name = 'New Moon';
  else if (phase < 0.22) name = 'Waxing Crescent';
  else if (phase < 0.28) name = 'First Quarter';
  else if (phase < 0.47) name = 'Waxing Gibbous';
  else if (phase < 0.53) name = 'Full Moon';
  else if (phase < 0.72) name = 'Waning Gibbous';
  else if (phase < 0.78) name = 'Last Quarter';
  else name = 'Waning Crescent';

  return { phase, name, illumination };
}

export function describeWeatherCode(code: number): { label: string; icon: 'sun' | 'cloud-sun' | 'cloud' | 'fog' | 'rain' | 'snow' | 'storm' } {
  if (code === 0) return { label: 'Clear sky', icon: 'sun' };
  if (code === 1 || code === 2) return { label: 'Partly cloudy', icon: 'cloud-sun' };
  if (code === 3) return { label: 'Overcast', icon: 'cloud' };
  if (code === 45 || code === 48) return { label: 'Calm mist', icon: 'fog' };
  if (code >= 51 && code <= 67) return { label: 'Light rain', icon: 'rain' };
  if (code >= 71 && code <= 77) return { label: 'Snowfall', icon: 'snow' };
  if (code >= 80 && code <= 82) return { label: 'Rain showers', icon: 'rain' };
  if (code >= 85 && code <= 86) return { label: 'Snow showers', icon: 'snow' };
  if (code >= 95) return { label: 'Thunderstorm', icon: 'storm' };
  return { label: 'Mild', icon: 'cloud-sun' };
}
