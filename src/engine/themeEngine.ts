import { DesignElement, GlobalThemePalette } from '../types/schema';

export const GLOBAL_THEME_PRESETS: ReadonlyArray<GlobalThemePalette> = [
  {
    id: 'oatmeal-editorial',
    name: 'Oatmeal Editorial',
    description: 'Warm archival paper with burnt terracotta accents',
    f2uSafe: true,
    canvasBg: '#FAF8F5',
    surfaceBg: '#F2EFE9',
    surfaceAltBg: '#E8E2D5',
    borderColor: '#C86D51',
    accentColor: '#C86D51',
    textColor: '#2C2A28',
    mutedTextColor: '#6B655D',
    fontFamily: 'serif',
  },
  {
    id: 'cozy-carbon-amber',
    name: 'Carbon & Amber',
    description: 'Dark dossier surface with warm copper highlights',
    f2uSafe: true,
    canvasBg: '#161514',
    surfaceBg: '#242220',
    surfaceAltBg: '#2E2B28',
    borderColor: '#D4A373',
    accentColor: '#E07A5F',
    textColor: '#ECE7DF',
    mutedTextColor: '#A8A29E',
    fontFamily: 'sans',
  },
  {
    id: 'forest-herbarium',
    name: 'Botanical Forest',
    description: 'Moss sage surfaces with parchment ink and gold trim',
    f2uSafe: true,
    canvasBg: '#181A17',
    surfaceBg: '#232722',
    surfaceAltBg: '#2C322A',
    borderColor: '#7A9A82',
    accentColor: '#84A98C',
    textColor: '#F0EAD2',
    mutedTextColor: '#B5C2B7',
    fontFamily: 'serif',
  },
  {
    id: 'strawberry-scrapbook',
    name: 'Strawberry Milk (F2U)',
    description: 'Soft rose cream cards with berry border accents',
    f2uSafe: true,
    canvasBg: '#FFF7F8',
    surfaceBg: '#FFEBEF',
    surfaceAltBg: '#FCE0E6',
    borderColor: '#D96B84',
    accentColor: '#D94B6A',
    textColor: '#4A2530',
    mutedTextColor: '#8B5A68',
    fontFamily: 'sans',
  },
  {
    id: 'mint-matcha-diary',
    name: 'Matcha Diary',
    description: 'Clean oat-mint stationery with forest ink text',
    f2uSafe: true,
    canvasBg: '#F4F8F4',
    surfaceBg: '#E7F1E8',
    surfaceAltBg: '#D8E7DA',
    borderColor: '#5B8C69',
    accentColor: '#487A57',
    textColor: '#1E3326',
    mutedTextColor: '#567060',
    fontFamily: 'sans',
  },
  {
    id: 'midnight-arcade',
    name: 'Midnight Terminal',
    description: 'Obsidian cyber deck with electric cyan & coral pops',
    f2uSafe: true,
    canvasBg: '#0E1117',
    surfaceBg: '#161B22',
    surfaceAltBg: '#1F2631',
    borderColor: '#38BDF8',
    accentColor: '#38BDF8',
    textColor: '#E6EDF3',
    mutedTextColor: '#8B949E',
    fontFamily: 'mono',
  },
  {
    id: 'velvet-noir-crimson',
    name: 'Velvet Crimson',
    description: 'Deep burgundy gothic cards with antique champagne gold',
    f2uSafe: true,
    canvasBg: '#140F12',
    surfaceBg: '#21181D',
    surfaceAltBg: '#2C2026',
    borderColor: '#B84A62',
    accentColor: '#D4A373',
    textColor: '#F5ECEF',
    mutedTextColor: '#B89CA6',
    fontFamily: 'serif',
  },
  {
    id: 'royal-parchment',
    name: 'Royal Observatory',
    description: 'Starlight indigo ink paired with warm vellum beige',
    f2uSafe: true,
    canvasBg: '#F5F2EB',
    surfaceBg: '#EAE4D7',
    surfaceAltBg: '#DDD5C4',
    borderColor: '#3D405B',
    accentColor: '#3D405B',
    textColor: '#222436',
    mutedTextColor: '#5E607A',
    fontFamily: 'serif',
  },
];

export function paletteToSwatches(palette: GlobalThemePalette): string[] {
  return Array.from(
    new Set([
      palette.canvasBg,
      palette.surfaceBg,
      palette.surfaceAltBg,
      palette.borderColor,
      palette.accentColor,
      palette.textColor,
      palette.mutedTextColor,
    ])
  );
}

function parseRgb(hex: string): { r: number; g: number; b: number } | null {
  const clean = hex.trim().replace('#', '');
  if (/^[0-9a-fA-F]{3}$/.test(clean)) {
    return {
      r: parseInt(clean[0] + clean[0], 16),
      g: parseInt(clean[1] + clean[1], 16),
      b: parseInt(clean[2] + clean[2], 16),
    };
  }
  if (/^[0-9a-fA-F]{6}$/.test(clean)) {
    return {
      r: parseInt(clean.slice(0, 2), 16),
      g: parseInt(clean.slice(2, 4), 16),
      b: parseInt(clean.slice(4, 6), 16),
    };
  }
  return null;
}

export function getRelativeLuminance(color: string): number | null {
  const rgb = parseRgb(color);
  if (!rgb) return null;
  return (0.299 * rgb.r + 0.587 * rgb.g + 0.114 * rgb.b) / 255;
}

export function getReadableOnColor(bgHex: string, lightText = '#FAF8F5', darkText = '#222222'): string {
  const lum = getRelativeLuminance(bgHex);
  if (lum === null) return lightText;
  return lum > 0.58 ? darkText : lightText;
}

export interface ApplyThemeOptions {
  targetIds?: string[] | null;
  applyColors: boolean;
  applyFonts: boolean;
  isToyhouseFree: boolean;
}

const ACCENT_SURFACE_TYPES = new Set([
  'button',
  'badge',
  'pure_pill',
  'sticker',
  'washi_tape',
]);

const TEXT_ONLY_TRANSPARENT_TYPES = new Set([
  'pure_heading',
  'pure_paragraph',
  'divider',
  'pure_divider',
  'pure_line',
  'lace_divider',
  'spacer',
  'fa_watermark',
]);

export function applyThemeToElements(
  elements: DesignElement[],
  palette: GlobalThemePalette,
  options: ApplyThemeOptions
): DesignElement[] {
  const targetSet = options.targetIds && options.targetIds.length > 0 ? new Set(options.targetIds) : null;

  return elements.map((el) => {
    if (targetSet && !targetSet.has(el.id)) return el;

    let next: DesignElement = { ...el };

    if (options.applyFonts) {
      next.fontFamily = palette.fontFamily;
      next.googleFont = !options.isToyhouseFree ? palette.googleFont : next.googleFont;
    }

    if (options.applyColors) {
      const hasTransparentBg =
        !el.bgColor ||
        el.bgColor === 'transparent' ||
        el.bgColor.toLowerCase() === 'none';

      if (ACCENT_SURFACE_TYPES.has(el.type)) {
        next.bgColor = palette.accentColor;
        next.borderColor = palette.borderColor;
        next.textColor = getReadableOnColor(palette.accentColor);
      } else if (el.type === 'pure_line' || el.type === 'divider' || el.type === 'pure_divider' || el.type === 'lace_divider') {
        next.bgColor = hasTransparentBg ? 'transparent' : palette.borderColor;
        next.borderColor = palette.borderColor;
        next.textColor = palette.mutedTextColor;
      } else if (el.type === 'pure_ring') {
        next.bgColor = 'transparent';
        next.borderColor = palette.accentColor;
        next.textColor = palette.textColor;
      } else if (el.type === 'fa_watermark') {
        next.bgColor = 'transparent';
        next.textColor = palette.accentColor;
        next.borderColor = 'transparent';
      } else if (hasTransparentBg || TEXT_ONLY_TRANSPARENT_TYPES.has(el.type)) {
        next.textColor = palette.textColor;
        if (el.borderColor && el.borderColor !== 'transparent') {
          next.borderColor = palette.borderColor;
        }
      } else {
        const useAltSurface =
          Boolean(el.parentId) ||
          el.type === 'quote_bubble' ||
          el.type === 'pure_card' ||
          el.type === 'folder_header';
        next.bgColor = useAltSurface ? palette.surfaceAltBg : palette.surfaceBg;
        next.textColor = palette.textColor;
        if (el.borderColor && el.borderColor !== 'transparent') {
          next.borderColor = palette.borderColor;
        }
      }

      if (el.type === 'palette_strip') {
        next.paletteColors = paletteToSwatches(palette).slice(0, 6);
      }

      if (el.modifiers && el.modifiers.length > 0) {
        next.modifiers = el.modifiers.map((mod) => {
          if (mod.kind === 'split') {
            return {
              ...mod,
              dividerColor: palette.borderColor,
              centerBadge: mod.centerBadge
                ? {
                    ...mod.centerBadge,
                    bgColor: palette.accentColor,
                    borderColor: palette.surfaceBg,
                  }
                : mod.centerBadge,
            };
          }
          if (mod.kind === 'divider_line') {
            return { ...mod, color: palette.borderColor };
          }
          if (mod.kind === 'inner_frame') {
            return { ...mod, color: palette.accentColor };
          }
          if (mod.kind === 'cutout_hole' && mod.mode === 'hollow_ring') {
            return { ...mod, ringColor: palette.accentColor };
          }
          return mod;
        });
      }
    }

    return next;
  });
}

