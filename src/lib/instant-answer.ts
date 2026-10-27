/**
 * Zero-Latency Local Instant Answer Engine for Cove Search & Command Palette
 * Evaluates math expressions, percentages, common unit conversions, world clocks,
 * and hex color swatches strictly on-device with zero eval() and zero network calls.
 */

export interface InstantAnswer {
  kind: 'math' | 'unit' | 'time' | 'color' | 'focus';
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

  // 6. Safe arithmetic expression
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
