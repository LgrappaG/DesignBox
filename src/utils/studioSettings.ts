import { DesignElement, ElementType, LayoutMode, UiTheme } from '../types/schema';

export type ShortcutActionId =
  | 'tool_select'
  | 'tool_box'
  | 'tool_line'
  | 'tool_ring'
  | 'quick_add_text'
  | 'spotlight_search'
  | 'undo'
  | 'redo'
  | 'duplicate'
  | 'copy'
  | 'paste'
  | 'copy_style'
  | 'paste_style'
  | 'delete'
  | 'select_all'
  | 'group_box'
  | 'ungroup'
  | 'bring_forward'
  | 'send_backward'
  | 'bring_front'
  | 'send_back'
  | 'lock_toggle'
  | 'hide_toggle'
  | 'rotate_90'
  | 'flip_h'
  | 'flip_v'
  | 'zen_mode'
  | 'live_preview'
  | 'copy_html'
  | 'toggle_snap'
  | 'zoom_reset'
  | 'zoom_fit'
  | 'save_project'
  | 'save_project_as'
  | 'open_project';

export type ShortcutProfileId = 'default' | 'figma' | 'krita';

export type KeybindingMap = Record<ShortcutActionId, string>;

export interface ShortcutDefinition {
  id: ShortcutActionId;
  label: string;
  category: 'Tools & Quick Add' | 'Edit & Style' | 'Layers & Geometry' | 'Workspace & Export';
  defaultCombo: string;
  secondaryCombo?: string;
}

export interface CuteThemeColors {
  bgApp: string;
  bgPanel: string;
  bgPanelAlt: string;
  bgCanvasWell: string;
  borderMain: string;
  accentPrimary: string;
  accentSecondary: string;
  textMain: string;
  textMuted: string;
  rulerBg: string;
  rulerTick: string;
}

export const DEFAULT_CUTE_THEME_COLORS: CuteThemeColors = {
  bgApp: '#FAF5FF',
  bgPanel: '#FDF8FF',
  bgPanelAlt: '#F3E8FF',
  bgCanvasWell: '#F5EBF9',
  borderMain: '#E9D5FF',
  accentPrimary: '#EC4899',
  accentSecondary: '#A855F7',
  textMain: '#3B234A',
  textMuted: '#8B6F9C',
  rulerBg: '#F3E8FF',
  rulerTick: '#8B6F9C',
};

export const CUTE_THEME_PRESETS: ReadonlyArray<{
  id: string;
  label: string;
  colors: CuteThemeColors;
}> = [
  {
    id: 'kawaii_lavender',
    label: 'Kawaii Pink & Lavender',
    colors: { ...DEFAULT_CUTE_THEME_COLORS },
  },
  {
    id: 'strawberry_milk',
    label: 'Strawberry Milk',
    colors: {
      bgApp: '#FFF6F9',
      bgPanel: '#FFFDFD',
      bgPanelAlt: '#FCEBF2',
      bgCanvasWell: '#F9E1EB',
      borderMain: '#F2CEDC',
      accentPrimary: '#FF6B9E',
      accentSecondary: '#E85D8C',
      textMain: '#4A3540',
      textMuted: '#997486',
      rulerBg: '#FCEBF2',
      rulerTick: '#997486',
    },
  },
  {
    id: 'mint_berry',
    label: 'Mint Berry Pastel',
    colors: {
      bgApp: '#F3FBF8',
      bgPanel: '#FFFFFF',
      bgPanelAlt: '#E6F7F1',
      bgCanvasWell: '#E9F4F6',
      borderMain: '#C7E9DC',
      accentPrimary: '#EC4899',
      accentSecondary: '#14B8A6',
      textMain: '#233D38',
      textMuted: '#63857E',
      rulerBg: '#E6F7F1',
      rulerTick: '#63857E',
    },
  },
];

function hexToRgba(hex: string, alpha: number): string {
  const clean = hex.replace('#', '').trim();
  const full =
    clean.length === 3
      ? clean
          .split('')
          .map((c) => c + c)
          .join('')
      : clean;
  if (!/^[0-9a-fA-F]{6}$/.test(full)) {
    return `rgba(236, 72, 153, ${alpha})`;
  }
  const r = parseInt(full.slice(0, 2), 16);
  const g = parseInt(full.slice(2, 4), 16);
  const b = parseInt(full.slice(4, 6), 16);
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
}

export function buildCuteThemeCssVars(colors: CuteThemeColors): Record<string, string> {
  return {
    '--bg-app': colors.bgApp,
    '--bg-panel': colors.bgPanel,
    '--bg-panel-alt': colors.bgPanelAlt,
    '--bg-input': '#FFFFFF',
    '--bg-canvas-well': colors.bgCanvasWell,
    '--border-main': colors.borderMain,
    '--border-strong': colors.accentSecondary,
    '--text-main': colors.textMain,
    '--text-muted': colors.textMuted,
    '--accent': colors.accentPrimary,
    '--accent-hover': colors.accentSecondary,
    '--accent-soft': hexToRgba(colors.accentPrimary, 0.14),
    '--ruler-bg': colors.rulerBg || colors.bgPanelAlt,
    '--ruler-tick': colors.rulerTick || colors.textMuted,
    '--grid-dot': hexToRgba(colors.accentSecondary, 0.24),
  };
}

export interface ResolvedRulerPalette {
  rulerBg: string;
  tickColor: string;
  textColor: string;
  accentColor: string;
  spanHighlight: string;
}

export function resolveRulerPalette(
  uiTheme: UiTheme,
  cuteColors: CuteThemeColors = DEFAULT_CUTE_THEME_COLORS
): ResolvedRulerPalette {
  if (uiTheme === 'carbon') {
    return {
      rulerBg: '#1E1D1B',
      tickColor: '#524E48',
      textColor: '#948E84',
      accentColor: '#D97757',
      spanHighlight: 'rgba(217, 119, 87, 0.11)',
    };
  }
  if (uiTheme === 'paper') {
    return {
      rulerBg: '#EAE5D9',
      tickColor: '#A39B8B',
      textColor: '#78736A',
      accentColor: '#C86D51',
      spanHighlight: 'rgba(200, 109, 81, 0.08)',
    };
  }
  const rBg = cuteColors.rulerBg || cuteColors.bgPanelAlt;
  const rTick = cuteColors.rulerTick || cuteColors.textMuted;
  return {
    rulerBg: rBg,
    tickColor: rTick,
    textColor: cuteColors.textMuted || rTick,
    accentColor: cuteColors.accentPrimary,
    spanHighlight: hexToRgba(cuteColors.accentPrimary, 0.11),
  };
}

export function applyStudioThemeToDocument(
  uiTheme: UiTheme,
  cuteColors: CuteThemeColors
): void {
  if (typeof document === 'undefined') return;
  const root = document.documentElement;
  root.setAttribute('data-theme', uiTheme);
  const vars = buildCuteThemeCssVars(cuteColors);
  if (uiTheme === 'cute') {
    for (const [key, val] of Object.entries(vars)) {
      root.style.setProperty(key, val);
    }
  } else {
    for (const key of Object.keys(vars)) {
      root.style.removeProperty(key);
    }
  }
  if (typeof window !== 'undefined') {
    window.dispatchEvent(
      new CustomEvent('dbx-theme-vars-updated', { detail: { uiTheme, cuteColors } })
    );
  }
}

export interface StudioPreferences {
  defaultCanvasWidth: number;
  defaultCanvasHeight: number;
  defaultTransparentCanvas: boolean;
  defaultLayoutMode: LayoutMode;
  nudgeStepPx: number;
  shiftNudgeStepPx: number;
  showRulers: boolean;
  showSpacingBadges: boolean;
  autoSnapshotIntervalSec: 0 | 30 | 60 | 300;
  uiDensity: 'compact' | 'comfortable';
  pasteOffsetSide: 'right';
  cuteThemeColors: CuteThemeColors;
}

export const DEFAULT_STUDIO_PREFERENCES: StudioPreferences = {
  defaultCanvasWidth: 760,
  defaultCanvasHeight: 540,
  defaultTransparentCanvas: true,
  defaultLayoutMode: 'freeform',
  nudgeStepPx: 1,
  shiftNudgeStepPx: 8,
  showRulers: true,
  showSpacingBadges: true,
  autoSnapshotIntervalSec: 60,
  uiDensity: 'compact',
  pasteOffsetSide: 'right',
  cuteThemeColors: { ...DEFAULT_CUTE_THEME_COLORS },
};

export const SHORTCUT_DEFINITIONS: ReadonlyArray<ShortcutDefinition> = [
  { id: 'tool_select', label: 'Select / Pointer Tool', category: 'Tools & Quick Add', defaultCombo: 'v' },
  { id: 'tool_box', label: 'Draw Box Tool', category: 'Tools & Quick Add', defaultCombo: 'r' },
  { id: 'tool_line', label: 'Draw Line Tool', category: 'Tools & Quick Add', defaultCombo: 'l' },
  { id: 'tool_ring', label: 'Draw Circle Ring Tool', category: 'Tools & Quick Add', defaultCombo: 'o' },
  { id: 'quick_add_text', label: 'Quick Add Text Block', category: 'Tools & Quick Add', defaultCombo: 't' },
  { id: 'spotlight_search', label: 'Open Spotlight Search', category: 'Tools & Quick Add', defaultCombo: '/', secondaryCombo: 'ctrl+k' },
  { id: 'undo', label: 'Undo', category: 'Edit & Style', defaultCombo: 'ctrl+z' },
  { id: 'redo', label: 'Redo', category: 'Edit & Style', defaultCombo: 'ctrl+y', secondaryCombo: 'ctrl+shift+z' },
  { id: 'copy', label: 'Copy Element(s)', category: 'Edit & Style', defaultCombo: 'ctrl+c' },
  { id: 'paste', label: 'Paste Element(s) (Right Offset)', category: 'Edit & Style', defaultCombo: 'ctrl+v' },
  { id: 'duplicate', label: 'Duplicate Selection', category: 'Edit & Style', defaultCombo: 'ctrl+d' },
  { id: 'copy_style', label: 'Copy Visual Style', category: 'Edit & Style', defaultCombo: 'ctrl+alt+c' },
  { id: 'paste_style', label: 'Paste Visual Style', category: 'Edit & Style', defaultCombo: 'ctrl+alt+v' },
  { id: 'delete', label: 'Delete Selected', category: 'Edit & Style', defaultCombo: 'delete', secondaryCombo: 'backspace' },
  { id: 'select_all', label: 'Select All Unlocked', category: 'Edit & Style', defaultCombo: 'ctrl+a' },
  { id: 'group_box', label: 'Group Selected into Box', category: 'Layers & Geometry', defaultCombo: 'ctrl+g' },
  { id: 'ungroup', label: 'Pop Out of Container', category: 'Layers & Geometry', defaultCombo: 'ctrl+shift+g' },
  { id: 'bring_forward', label: 'Bring Forward (+Z)', category: 'Layers & Geometry', defaultCombo: ']' },
  { id: 'send_backward', label: 'Send Backward (-Z)', category: 'Layers & Geometry', defaultCombo: '[' },
  { id: 'bring_front', label: 'Bring to Front', category: 'Layers & Geometry', defaultCombo: 'ctrl+]' },
  { id: 'send_back', label: 'Send to Back', category: 'Layers & Geometry', defaultCombo: 'ctrl+[' },
  { id: 'lock_toggle', label: 'Lock / Unlock Selected', category: 'Layers & Geometry', defaultCombo: 'ctrl+l' },
  { id: 'hide_toggle', label: 'Hide / Show Selected', category: 'Layers & Geometry', defaultCombo: 'ctrl+shift+h' },
  { id: 'rotate_90', label: 'Rotate +90°', category: 'Layers & Geometry', defaultCombo: 'shift+r' },
  { id: 'flip_h', label: 'Flip Horizontal', category: 'Layers & Geometry', defaultCombo: 'shift+h' },
  { id: 'flip_v', label: 'Flip Vertical', category: 'Layers & Geometry', defaultCombo: 'shift+v' },
  { id: 'zen_mode', label: 'Zen Mode (Toggle Sidebars)', category: 'Workspace & Export', defaultCombo: 'tab' },
  { id: 'live_preview', label: 'Toggle Live Preview Modal', category: 'Workspace & Export', defaultCombo: 'ctrl+p' },
  { id: 'copy_html', label: 'Copy Export HTML', category: 'Workspace & Export', defaultCombo: 'ctrl+shift+c' },
  { id: 'toggle_snap', label: 'Toggle Magnetic Snap', category: 'Workspace & Export', defaultCombo: 'alt+s' },
  { id: 'zoom_reset', label: 'Zoom 100% & Center', category: 'Workspace & Export', defaultCombo: 'ctrl+0' },
  { id: 'zoom_fit', label: 'Fit Canvas to Viewport', category: 'Workspace & Export', defaultCombo: 'ctrl+1' },
  { id: 'save_project', label: 'Save Project', category: 'Workspace & Export', defaultCombo: 'ctrl+s' },
  { id: 'save_project_as', label: 'Save Project As...', category: 'Workspace & Export', defaultCombo: 'ctrl+shift+s' },
  { id: 'open_project', label: 'Open Project', category: 'Workspace & Export', defaultCombo: 'ctrl+o' },
];

export const DEFAULT_KEYBINDINGS: KeybindingMap = SHORTCUT_DEFINITIONS.reduce((acc, item) => {
  acc[item.id] = item.defaultCombo;
  return acc;
}, {} as KeybindingMap);

export const SHORTCUT_PROFILES: Record<ShortcutProfileId, { label: string; map: KeybindingMap }> = {
  default: {
    label: 'DesignBox Default',
    map: { ...DEFAULT_KEYBINDINGS },
  },
  figma: {
    label: 'Figma / Canva Style',
    map: {
      ...DEFAULT_KEYBINDINGS,
      tool_box: 'f',
      tool_ring: 'o',
      tool_line: 'l',
      zen_mode: 'ctrl+\\',
      hide_toggle: 'ctrl+shift+h',
      lock_toggle: 'ctrl+shift+l',
      spotlight_search: 'ctrl+k',
    },
  },
  krita: {
    label: 'Krita / Creative Style',
    map: {
      ...DEFAULT_KEYBINDINGS,
      tool_select: 'b',
      tool_box: 'u',
      tool_line: 'v',
      zen_mode: 'tab',
      rotate_90: 'ctrl+r',
      flip_h: 'm',
      flip_v: 'shift+m',
      bring_forward: 'pageup',
      send_backward: 'pagedown',
    },
  },
};

const PREFS_STORAGE_KEY = 'dbx_studio_prefs_v1';
const KEYBINDINGS_STORAGE_KEY = 'dbx_keybindings_v1';

export function loadStudioPreferences(): StudioPreferences {
  if (typeof localStorage === 'undefined') return { ...DEFAULT_STUDIO_PREFERENCES };
  try {
    const raw = localStorage.getItem(PREFS_STORAGE_KEY);
    if (!raw) return { ...DEFAULT_STUDIO_PREFERENCES };
    const parsed = JSON.parse(raw) as Partial<StudioPreferences>;
    return {
      defaultCanvasWidth:
        typeof parsed.defaultCanvasWidth === 'number' && parsed.defaultCanvasWidth >= 200
          ? Math.min(2400, parsed.defaultCanvasWidth)
          : DEFAULT_STUDIO_PREFERENCES.defaultCanvasWidth,
      defaultCanvasHeight:
        typeof parsed.defaultCanvasHeight === 'number' && parsed.defaultCanvasHeight >= 200
          ? Math.min(2400, parsed.defaultCanvasHeight)
          : DEFAULT_STUDIO_PREFERENCES.defaultCanvasHeight,
      defaultTransparentCanvas:
        typeof parsed.defaultTransparentCanvas === 'boolean'
          ? parsed.defaultTransparentCanvas
          : DEFAULT_STUDIO_PREFERENCES.defaultTransparentCanvas,
      defaultLayoutMode:
        parsed.defaultLayoutMode === 'freeform' ||
        parsed.defaultLayoutMode === 'hybrid' ||
        parsed.defaultLayoutMode === 'block'
          ? parsed.defaultLayoutMode
          : DEFAULT_STUDIO_PREFERENCES.defaultLayoutMode,
      nudgeStepPx:
        typeof parsed.nudgeStepPx === 'number' && parsed.nudgeStepPx >= 1 && parsed.nudgeStepPx <= 20
          ? parsed.nudgeStepPx
          : DEFAULT_STUDIO_PREFERENCES.nudgeStepPx,
      shiftNudgeStepPx:
        typeof parsed.shiftNudgeStepPx === 'number' &&
        parsed.shiftNudgeStepPx >= 2 &&
        parsed.shiftNudgeStepPx <= 64
          ? parsed.shiftNudgeStepPx
          : DEFAULT_STUDIO_PREFERENCES.shiftNudgeStepPx,
      showRulers:
        typeof parsed.showRulers === 'boolean'
          ? parsed.showRulers
          : DEFAULT_STUDIO_PREFERENCES.showRulers,
      showSpacingBadges:
        typeof parsed.showSpacingBadges === 'boolean'
          ? parsed.showSpacingBadges
          : DEFAULT_STUDIO_PREFERENCES.showSpacingBadges,
      autoSnapshotIntervalSec:
        parsed.autoSnapshotIntervalSec === 0 ||
        parsed.autoSnapshotIntervalSec === 30 ||
        parsed.autoSnapshotIntervalSec === 60 ||
        parsed.autoSnapshotIntervalSec === 300
          ? parsed.autoSnapshotIntervalSec
          : DEFAULT_STUDIO_PREFERENCES.autoSnapshotIntervalSec,
      uiDensity:
        parsed.uiDensity === 'compact' || parsed.uiDensity === 'comfortable'
          ? parsed.uiDensity
          : DEFAULT_STUDIO_PREFERENCES.uiDensity,
      pasteOffsetSide: 'right',
      cuteThemeColors: {
        bgApp:
          typeof parsed.cuteThemeColors?.bgApp === 'string'
            ? parsed.cuteThemeColors.bgApp
            : DEFAULT_CUTE_THEME_COLORS.bgApp,
        bgPanel:
          typeof parsed.cuteThemeColors?.bgPanel === 'string'
            ? parsed.cuteThemeColors.bgPanel
            : DEFAULT_CUTE_THEME_COLORS.bgPanel,
        bgPanelAlt:
          typeof parsed.cuteThemeColors?.bgPanelAlt === 'string'
            ? parsed.cuteThemeColors.bgPanelAlt
            : DEFAULT_CUTE_THEME_COLORS.bgPanelAlt,
        bgCanvasWell:
          typeof parsed.cuteThemeColors?.bgCanvasWell === 'string'
            ? parsed.cuteThemeColors.bgCanvasWell
            : DEFAULT_CUTE_THEME_COLORS.bgCanvasWell,
        borderMain:
          typeof parsed.cuteThemeColors?.borderMain === 'string'
            ? parsed.cuteThemeColors.borderMain
            : DEFAULT_CUTE_THEME_COLORS.borderMain,
        accentPrimary:
          typeof parsed.cuteThemeColors?.accentPrimary === 'string'
            ? parsed.cuteThemeColors.accentPrimary
            : DEFAULT_CUTE_THEME_COLORS.accentPrimary,
        accentSecondary:
          typeof parsed.cuteThemeColors?.accentSecondary === 'string'
            ? parsed.cuteThemeColors.accentSecondary
            : DEFAULT_CUTE_THEME_COLORS.accentSecondary,
        textMain:
          typeof parsed.cuteThemeColors?.textMain === 'string'
            ? parsed.cuteThemeColors.textMain
            : DEFAULT_CUTE_THEME_COLORS.textMain,
        textMuted:
          typeof parsed.cuteThemeColors?.textMuted === 'string'
            ? parsed.cuteThemeColors.textMuted
            : DEFAULT_CUTE_THEME_COLORS.textMuted,
        rulerBg:
          typeof parsed.cuteThemeColors?.rulerBg === 'string'
            ? parsed.cuteThemeColors.rulerBg
            : typeof parsed.cuteThemeColors?.bgPanelAlt === 'string'
            ? parsed.cuteThemeColors.bgPanelAlt
            : DEFAULT_CUTE_THEME_COLORS.rulerBg,
        rulerTick:
          typeof parsed.cuteThemeColors?.rulerTick === 'string'
            ? parsed.cuteThemeColors.rulerTick
            : typeof parsed.cuteThemeColors?.textMuted === 'string'
            ? parsed.cuteThemeColors.textMuted
            : DEFAULT_CUTE_THEME_COLORS.rulerTick,
      },
    };
  } catch {
    return { ...DEFAULT_STUDIO_PREFERENCES };
  }
}

export function saveStudioPreferences(prefs: StudioPreferences): void {
  if (typeof localStorage === 'undefined') return;
  try {
    localStorage.setItem(PREFS_STORAGE_KEY, JSON.stringify(prefs));
  } catch {
    // Ignore storage quota errors
  }
}

export function loadKeybindings(): KeybindingMap {
  if (typeof localStorage === 'undefined') return { ...DEFAULT_KEYBINDINGS };
  try {
    const raw = localStorage.getItem(KEYBINDINGS_STORAGE_KEY);
    if (!raw) return { ...DEFAULT_KEYBINDINGS };
    const parsed = JSON.parse(raw) as Partial<Record<ShortcutActionId, string>>;
    const next = { ...DEFAULT_KEYBINDINGS };
    for (const def of SHORTCUT_DEFINITIONS) {
      const val = parsed[def.id];
      if (typeof val === 'string') {
        next[def.id] = normalizeComboString(val);
      }
    }
    return next;
  } catch {
    return { ...DEFAULT_KEYBINDINGS };
  }
}

export function saveKeybindings(bindings: KeybindingMap): void {
  if (typeof localStorage === 'undefined') return;
  try {
    localStorage.setItem(KEYBINDINGS_STORAGE_KEY, JSON.stringify(bindings));
  } catch {
    // Ignore storage quota errors
  }
}

const MODIFIER_KEYS = new Set(['control', 'shift', 'alt', 'meta']);

export function normalizeComboString(combo: string): string {
  const raw = combo.trim().toLowerCase();
  if (!raw) return '';
  const parts = raw.split('+').map((p) => p.trim()).filter(Boolean);
  let hasCtrl = false;
  let hasAlt = false;
  let hasShift = false;
  let keyPart = '';

  for (const part of parts) {
    if (part === 'ctrl' || part === 'control' || part === 'cmd' || part === 'meta') {
      hasCtrl = true;
    } else if (part === 'alt' || part === 'option') {
      hasAlt = true;
    } else if (part === 'shift') {
      hasShift = true;
    } else {
      keyPart = part;
    }
  }

  if (!keyPart) return '';
  const tokens: string[] = [];
  if (hasCtrl) tokens.push('ctrl');
  if (hasAlt) tokens.push('alt');
  if (hasShift) tokens.push('shift');
  tokens.push(keyPart);
  return tokens.join('+');
}

function normalizeEventKeyName(e: { key: string; code?: string }): string {
  const k = e.key.toLowerCase();
  if (k === ' ') return 'space';
  if (k === 'escape') return 'esc';
  if (e.code === 'BracketLeft') return '[';
  if (e.code === 'BracketRight') return ']';
  if (e.code === 'Backslash') return '\\';
  if (e.code === 'Slash') return '/';
  return k;
}

export function formatKeyboardEventToCombo(e: {
  key: string;
  code?: string;
  ctrlKey: boolean;
  metaKey: boolean;
  altKey: boolean;
  shiftKey: boolean;
}): string | null {
  const keyName = normalizeEventKeyName(e);
  if (MODIFIER_KEYS.has(keyName)) return null;
  const parts: string[] = [];
  if (e.ctrlKey || e.metaKey) parts.push('ctrl');
  if (e.altKey) parts.push('alt');
  if (e.shiftKey) parts.push('shift');
  parts.push(keyName);
  return parts.join('+');
}

export function matchesShortcut(
  e: {
    key: string;
    code?: string;
    ctrlKey: boolean;
    metaKey: boolean;
    altKey: boolean;
    shiftKey: boolean;
  },
  combo: string
): boolean {
  const normalizedTarget = normalizeComboString(combo);
  if (!normalizedTarget) return false;
  const eventCombo = formatKeyboardEventToCombo(e);
  if (!eventCombo) return false;
  if (eventCombo === normalizedTarget) return true;

  // Handle shifted punctuation characters like '?' or '{' cleanly when user bound them without typing 'shift+'
  const targetParts = normalizedTarget.split('+');
  const targetKey = targetParts[targetParts.length - 1];
  const requiresShift = targetParts.includes('shift');
  const requiresCtrl = targetParts.includes('ctrl');
  const requiresAlt = targetParts.includes('alt');
  const rawKey = e.key.toLowerCase();
  const isPunctuationGlyph = targetKey.length === 1 && !/[a-z0-9]/.test(targetKey);
  if (
    isPunctuationGlyph &&
    !requiresShift &&
    e.shiftKey &&
    rawKey === targetKey &&
    (e.ctrlKey || e.metaKey) === requiresCtrl &&
    e.altKey === requiresAlt
  ) {
    return true;
  }

  return false;
}

export function formatComboDisplay(combo: string): string {
  if (!combo) return 'Unbound';
  return combo
    .split('+')
    .map((p) => {
      if (p === 'ctrl') return 'Ctrl';
      if (p === 'alt') return 'Alt';
      if (p === 'shift') return 'Shift';
      if (p === 'delete') return 'Del';
      if (p === 'backspace') return 'Backspace';
      if (p === 'tab') return 'Tab';
      return p.length === 1 ? p.toUpperCase() : p[0].toUpperCase() + p.slice(1);
    })
    .join(' + ');
}

const NON_IMAGE_URL_ELEMENT_TYPES = new Set<ElementType>([
  'button',
  'pure_link',
  'music_player',
  'cassette_player',
  'social_links',
]);

function isRenderableImageUrl(candidate: string | undefined): candidate is string {
  if (!candidate) return false;
  const trimmed = candidate.trim();
  if (!trimmed) return false;
  return (
    trimmed.startsWith('http://') ||
    trimmed.startsWith('https://') ||
    trimmed.startsWith('data:image/')
  );
}

/** Collect unique visible image URLs used anywhere in the user's design for Toyhouse Preview. */
export function extractDesignImageUrls(elements: ReadonlyArray<DesignElement>): string[] {
  const seen = new Set<string>();
  const results: string[] = [];

  const pushUrl = (raw: string | undefined) => {
    if (!isRenderableImageUrl(raw)) return;
    const trimmed = raw.trim();
    if (!seen.has(trimmed)) {
      seen.add(trimmed);
      results.push(trimmed);
    }
  };

  for (const el of elements) {
    if (el.hidden) continue;
    if (!NON_IMAGE_URL_ELEMENT_TYPES.has(el.type)) {
      pushUrl(el.url);
    }
    pushUrl(el.hoverImageUrl);
    pushUrl(el.bgImageUrl);
    if (Array.isArray(el.gallery)) {
      for (const item of el.gallery) {
        pushUrl(item.url);
      }
    }
    if (Array.isArray(el.relationNodes)) {
      for (const node of el.relationNodes) {
        pushUrl(node.avatarUrl);
      }
    }
  }

  return results;
}
