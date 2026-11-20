import { DesignElement, PreviewSurface } from '../types/schema';

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

export type WcagContrastLevel = 'AAA' | 'AA' | 'AA Large' | 'Fail';

export interface WcagContrastResult {
  ratio: number;
  level: WcagContrastLevel;
  passesAA: boolean;
  effectiveFgHex: string;
  effectiveBgHex: string;
  usedFallbackBg: boolean;
}

export interface ToyhouseStressSurface {
  id: PreviewSurface;
  label: string;
  bgHex: string;
}

export interface ToyhouseThemeContrastFailure {
  id: string;
  label: string;
  ratio: number;
  usedSurfaceBg: boolean;
}

export interface ToyhouseThemeContrastAudit {
  surfaceId: PreviewSurface;
  label: string;
  bgHex: string;
  checkedCount: number;
  failingElements: ToyhouseThemeContrastFailure[];
  minRatio: number | null;
}

export const TOYHOUSE_STRESS_SURFACES: ReadonlyArray<ToyhouseStressSurface> = [
  { id: 'th_dark', label: 'TH Night', bgHex: '#16141C' },
  { id: 'th_light', label: 'TH Light', bgHex: '#F4F5F7' },
  { id: 'th_pink', label: 'TH Pink', bgHex: '#FDF3F7' },
  { id: 'th_teal', label: 'TH Teal', bgHex: '#EDF6F7' },
  { id: 'th_cute', label: 'TH Cute', bgHex: '#FFF6FB' },
];

const NON_TEXT_ELEMENT_TYPES = new Set<DesignElement['type']>([
  'image',
  'pure_image_slot',
  'divider',
  'pure_divider',
  'pure_line',
  'pure_circle',
  'pure_ring',
  'pure_diamond',
  'pure_hexagon',
  'pure_octagon',
  'pure_star',
  'spacer',
  'sticker',
  'pagedoll',
  'fa_watermark',
  'palette_strip',
  'gallery',
  'moodboard',
]);

/** Computes WCAG 2.1 sRGB relative luminance in [0, 1]. */
export function getWcagRelativeLuminance(hex: string): number {
  const { r, g, b } = hexToRgb(hex);
  const linearize = (channel: number): number => {
    const srgb = clamp(channel, 0, 255) / 255;
    return srgb <= 0.03928 ? srgb / 12.92 : Math.pow((srgb + 0.055) / 1.055, 2.4);
  };
  return 0.2126 * linearize(r) + 0.7152 * linearize(g) + 0.0722 * linearize(b);
}

/** Computes WCAG 2.1 contrast ratio in [1, 21] between two opaque hex colors. */
export function getWcagContrastRatio(fgHex: string, bgHex: string): number {
  const l1 = getWcagRelativeLuminance(fgHex);
  const l2 = getWcagRelativeLuminance(bgHex);
  const bright = Math.max(l1, l2);
  const dark = Math.min(l1, l2);
  return Math.round(((bright + 0.05) / (dark + 0.05)) * 100) / 100;
}

/** Composites an arbitrarily alpha'd color string over an opaque fallback background hex. */
export function compositeColorOverBg(
  color: string | undefined,
  fallbackHex = '#FAF8F5'
): { hex: string; usedFallback: boolean } {
  const normalizedFallback = normalizeHexColor(fallbackHex) || '#FAF8F5';
  const parsed = parseColorValue(color, normalizedFallback);
  if (parsed.isTransparent || parsed.alpha <= 0.001) {
    return { hex: normalizedFallback, usedFallback: true };
  }
  if (parsed.alpha >= 0.995) {
    return { hex: parsed.hex, usedFallback: false };
  }
  const fg = hexToRgb(parsed.hex);
  const bg = hexToRgb(normalizedFallback);
  const a = clamp(parsed.alpha, 0, 1);
  return {
    hex: rgbToHex({
      r: fg.r * a + bg.r * (1 - a),
      g: fg.g * a + bg.g * (1 - a),
      b: fg.b * a + bg.b * (1 - a),
    }),
    usedFallback: true,
  };
}

/** Evaluates WCAG 2.1 contrast of foreground text over fill (falling back to parent/canvas surface). */
export function evaluateWcagContrast(
  fgColor: string | undefined,
  bgColor: string | undefined,
  fallbackBgHex = '#FAF8F5',
  fontSizePx = 13,
  isBold = false
): WcagContrastResult {
  const effectiveBg = compositeColorOverBg(bgColor, fallbackBgHex);
  const effectiveFg = compositeColorOverBg(fgColor, '#18181B');
  const ratio = getWcagContrastRatio(effectiveFg.hex, effectiveBg.hex);
  const isLargeText = fontSizePx >= 18 || (isBold && fontSizePx >= 14);
  const aaThreshold = isLargeText ? 3.0 : 4.5;
  const aaaThreshold = isLargeText ? 4.5 : 7.0;

  let level: WcagContrastLevel = 'Fail';
  if (ratio >= aaaThreshold) {
    level = 'AAA';
  } else if (ratio >= 4.5) {
    level = 'AA';
  } else if (ratio >= aaThreshold) {
    level = 'AA Large';
  }

  return {
    ratio,
    level,
    passesAA: ratio >= aaThreshold,
    effectiveFgHex: effectiveFg.hex,
    effectiveBgHex: effectiveBg.hex,
    usedFallbackBg: effectiveBg.usedFallback,
  };
}

/** Picks dark charcoal (#18181B) or soft ivory (#FAF8F5) whichever maximizes contrast on bgColor. */
export function suggestAccessibleTextColor(
  bgColor: string | undefined,
  fallbackBgHex = '#FAF8F5'
): string {
  const effectiveBg = compositeColorOverBg(bgColor, fallbackBgHex).hex;
  const darkRatio = getWcagContrastRatio('#18181B', effectiveBg);
  const lightRatio = getWcagContrastRatio('#FAF8F5', effectiveBg);
  return darkRatio >= lightRatio ? '#18181B' : '#FAF8F5';
}

function elementHasAuditableText(el: DesignElement): boolean {
  if (el.hidden || NON_TEXT_ELEMENT_TYPES.has(el.type)) return false;
  if ((el.content || '').trim().length > 0 || (el.subContent || '').trim().length > 0) {
    return true;
  }
  return Boolean(
    (el.tabs && el.tabs.length > 0) ||
      (el.kvItems && el.kvItems.length > 0) ||
      (el.inventoryItems && el.inventoryItems.length > 0) ||
      (el.timelineMilestones && el.timelineMilestones.length > 0) ||
      (el.relationNodes && el.relationNodes.length > 0)
  );
}

/** Resolves effective opaque background color for a nested element by walking its parent chain. */
export function resolveElementEffectiveBackdrop(
  el: DesignElement,
  byId: ReadonlyMap<string, DesignElement>,
  canvasBg: string,
  surfaceHex: string
): string {
  const effectiveCanvas = compositeColorOverBg(canvasBg, surfaceHex).hex;
  const chain: DesignElement[] = [];
  const visited = new Set<string>([el.id]);
  let curId = el.parentId;
  while (curId && !visited.has(curId)) {
    visited.add(curId);
    const parent = byId.get(curId);
    if (!parent) break;
    chain.push(parent);
    curId = parent.parentId;
  }
  let backdrop = effectiveCanvas;
  for (let i = chain.length - 1; i >= 0; i--) {
    backdrop = compositeColorOverBg(chain[i].bgColor, backdrop).hex;
  }
  return backdrop;
}

/** Audits visible text-bearing elements for WCAG AA contrast across all 5 Toyhouse community themes. */
export function auditElementsAcrossToyhouseThemes(
  elements: ReadonlyArray<DesignElement>,
  canvasBg: string,
  cuteBgHex = '#FFF6FB'
): ToyhouseThemeContrastAudit[] {
  const byId = new Map<string, DesignElement>(elements.map((e) => [e.id, e]));
  const auditable = elements.filter(elementHasAuditableText);

  return TOYHOUSE_STRESS_SURFACES.map((surf) => {
    const surfaceBg = surf.id === 'th_cute' ? normalizeHexColor(cuteBgHex) || surf.bgHex : surf.bgHex;
    const failingElements: ToyhouseThemeContrastFailure[] = [];
    let minRatio: number | null = null;

    for (const el of auditable) {
      const backdropHex = resolveElementEffectiveBackdrop(el, byId, canvasBg, surfaceBg);
      const contrast = evaluateWcagContrast(
        el.textColor,
        el.bgColor,
        backdropHex,
        el.fontSize || 13,
        el.fontWeight === 'bold'
      );
      if (minRatio === null || contrast.ratio < minRatio) {
        minRatio = contrast.ratio;
      }
      if (!contrast.passesAA) {
        failingElements.push({
          id: el.id,
          label: el.label,
          ratio: contrast.ratio,
          usedSurfaceBg: contrast.usedFallbackBg,
        });
      }
    }

    return {
      surfaceId: surf.id,
      label: surf.label,
      bgHex: surfaceBg,
      checkedCount: auditable.length,
      failingElements,
      minRatio,
    };
  });
}

