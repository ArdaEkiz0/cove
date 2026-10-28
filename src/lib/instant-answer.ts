/**
 * Zero-Latency Local Instant Answer Engine for Cove Search & Command Palette
 * Evaluates math expressions, percentages, common unit conversions, world clocks,
 * and hex color swatches strictly on-device with zero eval() and zero network calls.
 */

export interface InstantAnswer {
  kind: 'math' | 'unit' | 'time' | 'color' | 'focus' | 'date' | 'base' | 'text' | 'timestamp' | 'percent';
  primary: string;
  secondary: string;
  copyText?: string;
  swatchHex?: string;
  focusMinutes?: number;
}

const CITY_TIMEZONES: Record<string, { label: string; tz: string }> = {
  utc: { label: 'Coordinated Universal Time (UTC)', tz: 'UTC' },
  gmt: { label: 'Greenwich Mean Time (GMT)', tz: 'UTC' },
  london: { label: 'London, United Kingdom', tz: 'Europe/London' },
  uk: { label: 'London, United Kingdom', tz: 'Europe/London' },
  tokyo: { label: 'Tokyo, Japan', tz: 'Asia/Tokyo' },
  japan: { label: 'Tokyo, Japan', tz: 'Asia/Tokyo' },
  nyc: { label: 'New York, USA', tz: 'America/New_York' },
  'new york': { label: 'New York, USA', tz: 'America/New_York' },
  sf: { label: 'San Francisco, USA', tz: 'America/Los_Angeles' },
  'san francisco': { label: 'San Francisco, USA', tz: 'America/Los_Angeles' },
  la: { label: 'Los Angeles, USA', tz: 'America/Los_Angeles' },
  berlin: { label: 'Berlin, Germany', tz: 'Europe/Berlin' },
  paris: { label: 'Paris, France', tz: 'Europe/Paris' },
  dubai: { label: 'Dubai, UAE', tz: 'Asia/Dubai' },
  singapore: { label: 'Singapore', tz: 'Asia/Singapore' },
  sydney: { label: 'Sydney, Australia', tz: 'Australia/Sydney' },
  india: { label: 'India Standard Time (IST)', tz: 'Asia/Kolkata' },
  ist: { label: 'India Standard Time (IST)', tz: 'Asia/Kolkata' },
  mumbai: { label: 'Mumbai, India', tz: 'Asia/Kolkata' },
  bangalore: { label: 'Bengaluru, India', tz: 'Asia/Kolkata' },
  indore: { label: 'Indore, India', tz: 'Asia/Kolkata' },
  delhi: { label: 'New Delhi, India', tz: 'Asia/Kolkata' },
  toronto: { label: 'Toronto, Canada', tz: 'America/Toronto' }
};

/** Safe recursive-descent math parser (+, -, *, /, %, ^, parentheses) */
function safeEvaluateMath(expr: string): number | null {
  const cleaned = expr.replace(/,/g, '').replace(/×/g, '*').replace(/÷/g, '/').trim();
  if (!/^[0-9+\-*/().^\s%]+$/.test(cleaned)) return null;
  // Require at least one operator so plain numbers like "2026" don't trigger calculator
  if (!/[+\-*/^%]/.test(cleaned.replace(/^-/, ''))) return null;

  const tokens = cleaned.match(/(\d+\.?\d*|\.\d+|[+\-*/()^%])/g);
  if (!tokens || tokens.length < 2) return null;

  let pos = 0;

  function parseExpr(): number {
    let val = parseTerm();
    while (pos < tokens!.length && (tokens![pos] === '+' || tokens![pos] === '-')) {
      const op = tokens![pos++];
      const rhs = parseTerm();
      val = op === '+' ? val + rhs : val - rhs;
    }
    return val;
  }

  function parseTerm(): number {
    let val = parsePower();
    while (
      pos < tokens!.length &&
      (tokens![pos] === '*' || tokens![pos] === '/' || tokens![pos] === '%')
    ) {
      const op = tokens![pos++];
      const rhs = parsePower();
      if (op === '*') val *= rhs;
      else if (op === '/') val = rhs === 0 ? NaN : val / rhs;
      else val = val % rhs;
    }
    return val;
  }

  function parsePower(): number {
    let base = parseUnary();
    if (pos < tokens!.length && tokens![pos] === '^') {
      pos++;
      const exp = parsePower();
      base = Math.pow(base, exp);
    }
    return base;
  }

  function parseUnary(): number {
    if (tokens![pos] === '-') {
      pos++;
      return -parseUnary();
    }
    if (tokens![pos] === '+') {
      pos++;
      return parseUnary();
    }
    return parsePrimary();
  }

  function parsePrimary(): number {
    const tok = tokens![pos++];
    if (tok === '(') {
      const inner = parseExpr();
      if (tokens![pos] !== ')') return NaN;
      pos++;
      return inner;
    }
    return Number(tok);
  }

  const res = parseExpr();
  if (pos !== tokens.length || !Number.isFinite(res)) return null;
  return res;
}

function formatNum(n: number): string {
  if (Number.isInteger(n)) return n.toLocaleString('en-US');
  return Number(n.toFixed(6)).toLocaleString('en-US', { maximumFractionDigits: 6 });
}

function parseIsoDate(value: string): Date | null {
  const match = value.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (!match) return null;
  const year = Number(match[1]);
  const month = Number(match[2]);
  const day = Number(match[3]);
  if (year < 1900 || year > 2200 || month < 1 || month > 12 || day < 1 || day > 31) {
    return null;
  }
  const date = new Date(Date.UTC(year, month - 1, day));
  if (
    date.getUTCFullYear() !== year ||
    date.getUTCMonth() !== month - 1 ||
    date.getUTCDate() !== day
  ) {
    return null;
  }
  return date;
}

function utcDay(date: Date): number {
  return Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate());
}

function formatDateLabel(date: Date): string {
  return date.toLocaleDateString('en-US', {
    timeZone: 'UTC',
    month: 'short',
    day: 'numeric',
    year: 'numeric'
  });
}

function parseBaseNumber(value: string, forceBase?: number): { number: number; base: number } | null {
  const lower = value.toLowerCase();
  let base = forceBase ?? 10;
  let digits = lower;
  if (lower.startsWith('0x')) {
    base = 16;
    digits = lower.slice(2);
  } else if (lower.startsWith('0b')) {
    base = 2;
    digits = lower.slice(2);
  } else if (lower.startsWith('0o')) {
    base = 8;
    digits = lower.slice(2);
  }
  const validDigits =
    base === 2
      ? /^[01]+$/
      : base === 8
        ? /^[0-7]+$/
        : base === 10
          ? /^[0-9]+$/
          : /^[0-9a-f]+$/i;
  if (!digits || !validDigits.test(digits)) return null;
  const parsed = Number.parseInt(digits, base);
  if (!Number.isSafeInteger(parsed) || parsed < 0) return null;
  return { number: parsed, base };
}

function formatBase(value: number, base: number): string {
  if (base === 16) return `0x${value.toString(16).toUpperCase()}`;
  if (base === 2) return `0b${value.toString(2)}`;
  if (base === 8) return `0o${value.toString(8)}`;
  return String(value);
}

function rgbToHex(r: number, g: number, b: number): string {
  const clamp = (n: number) => Math.max(0, Math.min(255, Math.round(n)));
  return `#${[r, g, b].map((n) => clamp(n).toString(16).padStart(2, '0')).join('')}`;
}

function hslToRgb(h: number, s: number, l: number): [number, number, number] {
  const hue = ((h % 360) + 360) % 360;
  const sat = Math.max(0, Math.min(100, s)) / 100;
  const light = Math.max(0, Math.min(100, l)) / 100;
  const chroma = (1 - Math.abs(2 * light - 1)) * sat;
  const x = chroma * (1 - Math.abs(((hue / 60) % 2) - 1));
  const m = light - chroma / 2;
  let rgb: [number, number, number];
  if (hue < 60) rgb = [chroma, x, 0];
  else if (hue < 120) rgb = [x, chroma, 0];
  else if (hue < 180) rgb = [0, chroma, x];
  else if (hue < 240) rgb = [0, x, chroma];
  else if (hue < 300) rgb = [x, 0, chroma];
  else rgb = [chroma, 0, x];
  return [Math.round((rgb[0] + m) * 255), Math.round((rgb[1] + m) * 255), Math.round((rgb[2] + m) * 255)];
}

export function resolveInstantAnswer(rawQuery: string, now: Date = new Date()): InstantAnswer | null {
  const q = rawQuery.trim();
  if (!q) return null;
  const lower = q.toLowerCase();

  // 1. Percentage expression: "18% of 4800"
  const pctMatch = lower.match(/^(\d+(?:\.\d+)?)\s*%\s*of\s*([\d,]+(?:\.\d+)?)$/);
  if (pctMatch) {
    const pct = Number(pctMatch[1]);
    const total = Number(pctMatch[2].replace(/,/g, ''));
    const val = (pct / 100) * total;
    const formatted = formatNum(val);
    return {
      kind: 'math',
      primary: `= ${formatted}`,
      secondary: `${pct}% of ${formatNum(total)} · Enter to copy`,
      copyText: String(Number(val.toFixed(6)))
    };
  }

  // 2. Quick Focus Timer command: "focus 45", "pomodoro 30"
  const focusMatch = lower.match(/^(?:focus|timer|pomodoro)\s+(\d{1,3})\s*(?:m|min|mins)?$/);
  if (focusMatch) {
    const mins = Math.max(1, Math.min(180, Number(focusMatch[1])));
    return {
      kind: 'focus',
      primary: `Start ${mins}-minute Focus Session`,
      secondary: 'Cove Focus Sanctuary · Enter to launch immediately',
      focusMinutes: mins
    };
  }

  // 3. Unit conversions: "72 f in c", "15 km to mi", "2048 mb to gb", "75 kg in lb"
  const unitMatch = lower.match(
    /^(-?\d+(?:\.\d+)?)\s*(km|mi|miles|c|f|kg|lb|lbs|mb|gb|cm|in|inch|min|hr|hrs)\s+(?:in|to|as)\s+(km|mi|miles|c|f|kg|lb|lbs|mb|gb|cm|in|inch|min|hr|hrs)$/
  );
  if (unitMatch) {
    const v = Number(unitMatch[1]);
    const from = unitMatch[2];
    const to = unitMatch[3];
    let converted: number | null = null;
    let unitOut = to.toUpperCase();

    if (from === 'c' && to === 'f') {
      converted = (v * 9) / 5 + 32;
      unitOut = '°F';
    } else if (from === 'f' && to === 'c') {
      converted = ((v - 32) * 5) / 9;
      unitOut = '°C';
    } else if (from === 'km' && (to === 'mi' || to === 'miles')) {
      converted = v * 0.621371;
      unitOut = 'mi';
    } else if ((from === 'mi' || from === 'miles') && to === 'km') {
      converted = v / 0.621371;
      unitOut = 'km';
    } else if (from === 'kg' && (to === 'lb' || to === 'lbs')) {
      converted = v * 2.20462;
      unitOut = 'lb';
    } else if ((from === 'lb' || from === 'lbs') && to === 'kg') {
      converted = v / 2.20462;
      unitOut = 'kg';
    } else if (from === 'mb' && to === 'gb') {
      converted = v / 1024;
      unitOut = 'GB';
    } else if (from === 'gb' && to === 'mb') {
      converted = v * 1024;
      unitOut = 'MB';
    } else if (from === 'cm' && (to === 'in' || to === 'inch')) {
      converted = v / 2.54;
      unitOut = 'in';
    } else if ((from === 'in' || from === 'inch') && to === 'cm') {
      converted = v * 2.54;
      unitOut = 'cm';
    } else if (from === 'min' && (to === 'hr' || to === 'hrs')) {
      converted = v / 60;
      unitOut = 'hr';
    } else if ((from === 'hr' || from === 'hrs') && to === 'min') {
      converted = v * 60;
      unitOut = 'min';
    }

    if (converted !== null) {
      const text = `${formatNum(Number(converted.toFixed(3)))} ${unitOut}`;
      return {
        kind: 'unit',
        primary: text,
        secondary: `Instant conversion from ${v} ${from.toUpperCase()} · Enter to copy`,
        copyText: text
      };
    }
  }

  // 4. World Time lookup: "time in tokyo", "tokyo time", "utc"
  const timeMatch =
    lower.match(/^time\s+in\s+([a-z\s]+)$/) ||
    lower.match(/^([a-z\s]+)\s+time$/) ||
    (lower === 'utc' || lower === 'ist' || lower === 'gmt' ? [lower, lower] : null);
  if (timeMatch) {
    const key = timeMatch[1].trim();
    const hit = CITY_TIMEZONES[key];
    if (hit) {
      const formattedTime = now.toLocaleTimeString([], {
        timeZone: hit.tz,
        hour: '2-digit',
        minute: '2-digit',
        hour12: true
      });
      const formattedDate = now.toLocaleDateString('en-US', {
        timeZone: hit.tz,
        weekday: 'short',
        month: 'short',
        day: 'numeric'
      });
      return {
        kind: 'time',
        primary: `${formattedTime} · ${formattedDate}`,
        secondary: `${hit.label} (${hit.tz}) · Enter to copy`,
        copyText: `${formattedTime} (${hit.label})`
      };
    }
  }

  // 5. Hex color inspector: "#63b3b6"
  if (/^#([0-9a-f]{3}|[0-9a-f]{6})$/i.test(q)) {
    const hex = q.length === 4 ? `#${q[1]}${q[1]}${q[2]}${q[2]}${q[3]}${q[3]}` : q;
    const r = parseInt(hex.slice(1, 3), 16);
    const g = parseInt(hex.slice(3, 5), 16);
    const b = parseInt(hex.slice(5, 7), 16);
    const rgbStr = `rgb(${r}, ${g}, ${b})`;
    return {
      kind: 'color',
      primary: `${hex.toUpperCase()} · ${rgbStr}`,
      secondary: 'Color swatch · Enter to copy RGB',
      copyText: rgbStr,
      swatchHex: hex
    };
  }

  // 6. Date differences and simple date offsets
  const dateBetween = lower.match(
    /^days?\s+between\s+(\d{4}-\d{2}-\d{2})\s+(?:and|to)\s+(\d{4}-\d{2}-\d{2})$/
  );
  if (dateBetween) {
    const start = parseIsoDate(dateBetween[1]);
    const end = parseIsoDate(dateBetween[2]);
    if (start && end) {
      const diff = Math.round((utcDay(end) - utcDay(start)) / 86_400_000);
      return {
        kind: 'date',
        primary: `= ${Math.abs(diff).toLocaleString('en-US')} days`,
        secondary: `${formatDateLabel(start)} to ${formatDateLabel(end)} - Enter to copy`,
        copyText: String(diff)
      };
    }
  }

  const dateUntil = lower.match(
    /^days?\s+(until|to|till|before|since)\s+(\d{4}-\d{2}-\d{2})$/
  );
  if (dateUntil) {
    const target = parseIsoDate(dateUntil[2]);
    if (target) {
      const today = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()));
      const forward = dateUntil[1] !== 'since';
      const diff = forward
        ? Math.round((utcDay(target) - utcDay(today)) / 86_400_000)
        : Math.round((utcDay(today) - utcDay(target)) / 86_400_000);
      const label = diff >= 0 ? `${diff.toLocaleString('en-US')} days` : `${Math.abs(diff).toLocaleString('en-US')} days ago`;
      return {
        kind: 'date',
        primary: `= ${label}`,
        secondary: `${forward ? 'Until' : 'Since'} ${formatDateLabel(target)} - Enter to copy`,
        copyText: String(diff)
      };
    }
  }

  const dateOffset = lower.match(
    /^(today|\d{4}-\d{2}-\d{2})\s*([+-])\s*(\d{1,4})\s*days?$/
  );
  if (dateOffset) {
    const base =
      dateOffset[1] === 'today'
        ? new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()))
        : parseIsoDate(dateOffset[1]);
    if (base) {
      const amount = Number(dateOffset[3]) * (dateOffset[2] === '-' ? -1 : 1);
      const result = new Date(utcDay(base) + amount * 86_400_000);
      const iso = result.toISOString().slice(0, 10);
      return {
        kind: 'date',
        primary: `= ${formatDateLabel(result)}`,
        secondary: `${dateOffset[2] === '-' ? 'Minus' : 'Plus'} ${dateOffset[3]} days - Enter to copy`,
        copyText: iso
      };
    }
  }

  // 7. Base conversion: 255 in hex, 0xff in decimal, binary 1010
  const baseMatch =
    lower.match(
      /^(0x[0-9a-f]+|0b[01]+|0o[0-7]+|\d+)\s+(?:in|to|as)\s+(hex|hexadecimal|decimal|dec|binary|bin|octal|oct)$/i
    ) ||
    lower.match(
      /^(hex|hexadecimal|decimal|dec|binary|bin|octal|oct)\s+(0x[0-9a-f]+|0b[01]+|0o[0-7]+|[0-9a-f]+)$/i
    );
  if (baseMatch) {
    const firstIsNumber = /^(0x|0b|0o|\d)/i.test(baseMatch[1]);
    const sourceRaw = firstIsNumber ? baseMatch[1] : baseMatch[2];
    const targetRaw = firstIsNumber ? baseMatch[2] : 'decimal';
    const forcedBase = firstIsNumber
      ? undefined
      : baseMatch[1] === 'hex' || baseMatch[1] === 'hexadecimal'
        ? 16
        : baseMatch[1] === 'binary' || baseMatch[1] === 'bin'
          ? 2
          : baseMatch[1] === 'octal' || baseMatch[1] === 'oct'
            ? 8
            : 10;
    const parsed = parseBaseNumber(sourceRaw, forcedBase);
    const targetBase =
      targetRaw === 'hex' || targetRaw === 'hexadecimal'
        ? 16
        : targetRaw === 'binary' || targetRaw === 'bin'
          ? 2
          : targetRaw === 'octal' || targetRaw === 'oct'
            ? 8
            : 10;
    if (parsed) {
      const result = formatBase(parsed.number, targetBase);
      return {
        kind: 'base',
        primary: `= ${result}`,
        secondary: `Base ${parsed.base} to base ${targetBase} - Enter to copy`,
        copyText: result
      };
    }
  }

  // 8. Unix timestamp inspector
  const timestampMatch =
    lower.match(/^(?:unix|timestamp|epoch)\s+(\d{10,13})$/) ||
    lower.match(/^(\d{10,13})\s+(?:unix|timestamp|epoch)$/);
  if (timestampMatch) {
    const raw = timestampMatch[1];
    const millis = raw.length <= 10 ? Number(raw) * 1000 : Number(raw);
    const date = new Date(millis);
    if (Number.isFinite(date.getTime())) {
      const iso = date.toISOString();
      return {
        kind: 'timestamp',
        primary: iso.replace('T', ' ').replace(/\.\d{3}Z$/, ' UTC'),
        secondary: 'Unix timestamp - Enter to copy ISO date',
        copyText: iso
      };
    }
  }

  // 9. Tip and percentage change
  const tipMatch = lower.match(
    /^tip\s+(\d+(?:\.\d+)?)\s*%\s*(?:on|of)\s*([\d,]+(?:\.\d+)?)$/
  );
  if (tipMatch) {
    const pct = Number(tipMatch[1]);
    const base = Number(tipMatch[2].replace(/,/g, ''));
    const tipAmount = (pct / 100) * base;
    const total = base + tipAmount;
    return {
      kind: 'percent',
      primary: `Tip ${formatNum(Number(tipAmount.toFixed(2)))} - Total ${formatNum(Number(total.toFixed(2)))}`,
      secondary: `${pct}% on ${formatNum(base)} - Enter to copy total`,
      copyText: String(Number(total.toFixed(2)))
    };
  }

  const changeMatch = lower.match(
    /^(?:percent(?:age)?\s+change\s+)?from\s+(-?\d+(?:\.\d+)?)\s+to\s+(-?\d+(?:\.\d+)?)$/
  );
  if (changeMatch) {
    const from = Number(changeMatch[1]);
    const to = Number(changeMatch[2]);
    if (from !== 0) {
      const pct = ((to - from) / Math.abs(from)) * 100;
      const sign = pct > 0 ? '+' : '';
      return {
        kind: 'percent',
        primary: `${sign}${formatNum(Number(pct.toFixed(2)))}%`,
        secondary: `Change from ${formatNum(from)} to ${formatNum(to)} - Enter to copy`,
        copyText: String(Number(pct.toFixed(2)))
      };
    }
  }

  // 10. RGB and HSL color inspectors
  const rgbMatch = lower.match(
    /^rgb\(\s*(\d{1,3})\s*,\s*(\d{1,3})\s*,\s*(\d{1,3})\s*\)$/
  );
  if (rgbMatch) {
    const r = Number(rgbMatch[1]);
    const g = Number(rgbMatch[2]);
    const b = Number(rgbMatch[3]);
    if (r <= 255 && g <= 255 && b <= 255) {
      const hex = rgbToHex(r, g, b);
      return {
        kind: 'color',
        primary: `${hex.toUpperCase()} - rgb(${r}, ${g}, ${b})`,
        secondary: 'RGB color - Enter to copy hex',
        copyText: hex,
        swatchHex: hex
      };
    }
  }

  const hslMatch = lower.match(
    /^hsl\(\s*(-?\d+(?:\.\d+)?)\s*,\s*(\d+(?:\.\d+)?)%\s*,\s*(\d+(?:\.\d+)?)%\s*\)$/
  );
  if (hslMatch) {
    const h = Number(hslMatch[1]);
    const s = Number(hslMatch[2]);
    const l = Number(hslMatch[3]);
    if (s <= 100 && l <= 100) {
      const [r, g, b] = hslToRgb(h, s, l);
      const hex = rgbToHex(r, g, b);
      return {
        kind: 'color',
        primary: `${hex.toUpperCase()} - hsl(${h}, ${s}%, ${l}%)`,
        secondary: 'HSL color - Enter to copy hex',
        copyText: hex,
        swatchHex: hex
      };
    }
  }

  // 11. Local word and character count
  const textMatch = q.match(/^(?:wc|word count|count words)\s*[:\-]?\s+(.+)$/i);
  if (textMatch) {
    const text = textMatch[1].trim();
    const words = text ? text.split(/\s+/).filter(Boolean).length : 0;
    const characters = text.length;
    return {
      kind: 'text',
      primary: `= ${words.toLocaleString('en-US')} words`,
      secondary: `${characters.toLocaleString('en-US')} characters - Enter to copy`,
      copyText: `${words} words, ${characters} characters`
    };
  }

  // 12. Safe arithmetic expression
  const mathVal = safeEvaluateMath(q);
  if (mathVal !== null) {
    const formatted = formatNum(mathVal);
    return {
      kind: 'math',
      primary: `= ${formatted}`,
      secondary: `${q} · Instant local math · Enter to copy`,
      copyText: String(Number(mathVal.toFixed(6)))
    };
  }

  return null;
}
