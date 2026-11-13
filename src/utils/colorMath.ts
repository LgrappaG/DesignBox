export interface RgbColor {
  r: number;
  g: number;
  b: number;
}

export interface HsvColor {
  h: number; // 0..360
  s: number; // 0..100
  v: number; // 0..100
}

export interface ParsedColor {
  hex: string;
  alpha: number; // 0..1
  isTransparent: boolean;
  isInherit: boolean;
}

function clamp(val: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, val));
}

/** Normalizes 3-digit or 6-digit hex strings into uppercase #RRGGBB. */
export function normalizeHexColor(raw: string): string | null {
  const cleaned = raw.trim().replace(/^#/, '');
  if (/^[0-9a-fA-F]{3}$/.test(cleaned)) {
    const [r, g, b] = cleaned.split('');
    return `#${r}${r}${g}${g}${b}${b}`.toUpperCase();
  }
  if (/^[0-9a-fA-F]{6}$/.test(cleaned)) {
    return `#${cleaned.toUpperCase()}`;
  }
  return null;
}

/** Converts #RRGGBB (or #RGB) into RGB channels (0..255). */
export function hexToRgb(hex: string): RgbColor {
  const normalized = normalizeHexColor(hex) || '#000000';
  const raw = normalized.slice(1);
  return {
    r: parseInt(raw.slice(0, 2), 16),
    g: parseInt(raw.slice(2, 4), 16),
    b: parseInt(raw.slice(4, 6), 16),
  };
}

/** Converts RGB channels (0..255) into uppercase #RRGGBB. */
export function rgbToHex({ r, g, b }: RgbColor): string {
  const toByte = (n: number) => clamp(Math.round(n), 0, 255).toString(16).padStart(2, '0');
  return `#${toByte(r)}${toByte(g)}${toByte(b)}`.toUpperCase();
}

/** Converts RGB (0..255) to HSV (h: 0..360, s: 0..100, v: 0..100). */
export function rgbToHsv({ r, g, b }: RgbColor): HsvColor {
  const rn = clamp(r, 0, 255) / 255;
  const gn = clamp(g, 0, 255) / 255;
  const bn = clamp(b, 0, 255) / 255;
  const max = Math.max(rn, gn, bn);
  const min = Math.min(rn, gn, bn);
  const delta = max - min;

  let h = 0;
  if (delta > 0) {
    if (max === rn) h = 60 * (((gn - bn) / delta) % 6);
    else if (max === gn) h = 60 * ((bn - rn) / delta + 2);
    else h = 60 * ((rn - gn) / delta + 4);
  }
  if (h < 0) h += 360;

  const s = max === 0 ? 0 : (delta / max) * 100;
  const v = max * 100;
  return { h, s, v };
}

/** Converts HSV (h: 0..360, s: 0..100, v: 0..100) to RGB (0..255). */
export function hsvToRgb({ h, s, v }: HsvColor): RgbColor {
  const hn = ((h % 360) + 360) % 360;
  const sn = clamp(s, 0, 100) / 100;
  const vn = clamp(v, 0, 100) / 100;
  const c = vn * sn;
  const x = c * (1 - Math.abs(((hn / 60) % 2) - 1));
  const m = vn - c;

  let r1 = 0;
  let g1 = 0;
  let b1 = 0;
  if (hn < 60) {
    r1 = c;
    g1 = x;
  } else if (hn < 120) {
    r1 = x;
    g1 = c;
  } else if (hn < 180) {
    g1 = c;
    b1 = x;
  } else if (hn < 240) {
    g1 = x;
    b1 = c;
  } else if (hn < 300) {
    r1 = x;
    b1 = c;
  } else {
    r1 = c;
    b1 = x;
  }

  return {
    r: Math.round((r1 + m) * 255),
    g: Math.round((g1 + m) * 255),
    b: Math.round((b1 + m) * 255),
  };
}

export function hexToHsv(hex: string): HsvColor {
  return rgbToHsv(hexToRgb(hex));
}

export function hsvToHex(hsv: HsvColor): string {
  return rgbToHex(hsvToRgb(hsv));
}

/** Parses hex, rgb/rgba, transparent, or inherit into structured color fields. */
export function parseColorValue(raw: string | undefined, fallbackHex = '#FAF8F5'): ParsedColor {
  const val = (raw || '').trim();
  if (!val || val === 'transparent') {
    return { hex: fallbackHex, alpha: 0, isTransparent: true, isInherit: false };
  }
  if (val === 'inherit') {
    return { hex: fallbackHex, alpha: 1, isTransparent: false, isInherit: true };
  }

  const hex6 = normalizeHexColor(val);
  if (hex6) {
    return { hex: hex6, alpha: 1, isTransparent: false, isInherit: false };
  }

  const hex8Match = val.match(/^#?([0-9a-fA-F]{8})$/);
  if (hex8Match) {
    const full = hex8Match[1];
    const alpha = clamp(parseInt(full.slice(6, 8), 16) / 255, 0, 1);
    return {
      hex: `#${full.slice(0, 6).toUpperCase()}`,
      alpha,
      isTransparent: alpha === 0,
      isInherit: false,
    };
  }

  const rgbaMatch = val.match(
    /^rgba?\(\s*(\d{1,3})\s*,\s*(\d{1,3})\s*,\s*(\d{1,3})(?:\s*,\s*([\d.]+))?\s*\)$/i
  );
  if (rgbaMatch) {
    const r = clamp(parseInt(rgbaMatch[1], 10), 0, 255);
    const g = clamp(parseInt(rgbaMatch[2], 10), 0, 255);
    const b = clamp(parseInt(rgbaMatch[3], 10), 0, 255);
    const alpha = rgbaMatch[4] !== undefined ? clamp(parseFloat(rgbaMatch[4]), 0, 1) : 1;
    return {
      hex: rgbToHex({ r, g, b }),
      alpha,
      isTransparent: alpha === 0,
      isInherit: false,
    };
  }

  return { hex: fallbackHex, alpha: 1, isTransparent: false, isInherit: false };
}

/** Formats hex + alpha back into #RRGGBB (when opaque) or rgba(r, g, b, a). */
export function formatColorOutput(hex: string, alpha = 1): string {
  const normalized = normalizeHexColor(hex) || '#000000';
  const a = clamp(alpha, 0, 1);
  if (a <= 0.001) return 'transparent';
  if (a >= 0.995) return normalized;
  const { r, g, b } = hexToRgb(normalized);
  const alphaRounded = Math.round(a * 100) / 100;
  return `rgba(${r}, ${g}, ${b}, ${alphaRounded})`;
}

/** Picks dark or light ink for high contrast over an opaque swatch color. */
export function getContrastInk(color: string): '#18181B' | '#FFFFFF' {
  const parsed = parseColorValue(color, '#FFFFFF');
  if (parsed.isTransparent || parsed.alpha < 0.4) return '#18181B';
  const { r, g, b } = hexToRgb(parsed.hex);
  const luminance = (0.299 * r + 0.587 * g + 0.114 * b) / 255;
  return luminance > 0.62 ? '#18181B' : '#FFFFFF';
}

