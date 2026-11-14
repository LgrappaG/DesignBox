import {
  BgPattern,
  DesignElement,
  ExportResult,
  FontFamily,
  IdleAnimation,
  ImageShape,
  LayoutMode,
  SplitModifier,
  TargetPlatform,
  ValidationWarning,
} from '../types/schema';
import {
  buildSvgMaskStyle,
  canUseF2UBackgroundPunch,
  elementHasProModifiers,
  renderOverlayModifiersHTML,
  renderSplitModifierHTML,
} from './modifierRenderer';
import { isF2USafeShape, maskElementForF2USimulation } from './f2uShield';
import {
  buildF2UAngledLineCss,
  buildF2UCornerMaskOverlayCss,
  buildF2UQuadrantSurfaceCss,
  buildF2URadialCutoutCss,
  isF2UGeometricShape,
  normalizeShapeCutPx,
} from '../utils/f2uShapeCss';

function encodeRoundTripPayload(payload: unknown): string {
  const json = JSON.stringify(payload);
  const bytes = new TextEncoder().encode(json);
  let bin = '';
  for (let i = 0; i < bytes.length; i += 1) {
    bin += String.fromCharCode(bytes[i]);
  }
  return btoa(bin);
}

export interface SolvedRow {
  rowIndex: number;
  elements: Array<{
    element: DesignElement;
    calculatedColSpan: number;
  }>;
}

export function getFontFamilyCSS(font?: FontFamily): string {
  switch (font) {
    case 'serif':
      return "'Georgia', 'Times New Roman', serif";
    case 'mono':
      return "'Courier New', Consolas, monospace";
    case 'display':
      return "'Trebuchet MS', 'Impact', sans-serif";
    case 'handwriting':
      return "'Segoe Print', 'Bradley Hand', cursive";
    case 'pixel':
      return "'Lucida Console', 'Monaco', monospace";
    case 'sans':
    default:
      return "system-ui, -apple-system, 'Segoe UI', sans-serif";
  }
}

export function getFontAwesomeAnimClass(anim?: IdleAnimation): string {
  switch (anim) {
    case 'bounce':
      return 'fa-bounce';
    case 'pulse':
    case 'heartbeat':
      return 'fa-beat';
    case 'spin':
      return 'fa-spin';
    case 'wiggle':
    case 'glitch':
    case 'sway':
      return 'fa-shake';
    case 'shimmer':
      return 'fa-fade';
    case 'rubber_band':
      return 'fa-bounce';
    default:
      return '';
  }
}

export function getFontAwesomeRotationClass(deg?: number): string {
  if (!deg) return '';
  const norm = ((Math.round(deg) % 360) + 360) % 360;
  if (norm === 90) return 'fa-rotate-90';
  if (norm === 180) return 'fa-rotate-180';
  if (norm === 270) return 'fa-rotate-270';
  return '';
}

export function getFontAwesomeFlipClass(flipH?: boolean, flipV?: boolean): string {
  if (flipH && flipV) return 'fa-flip-both';
  if (flipH) return 'fa-flip-horizontal';
  if (flipV) return 'fa-flip-vertical';
  return '';
}

function escapeHtmlAttr(val: string): string {
  return val
    .replace(/&/g, '&amp;')
    .replace(/"/g, '&quot;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
}

export function getShapeBorderRadiusOverride(shape?: ImageShape): string {
  switch (shape) {
    case 'circle':
      return '50%';
    case 'pill':
      return '999px';
    case 'arch':
      return '999px 999px 0 0';
    case 'leaf':
      return '0 55% 0 55%';
    default:
      return '';
  }
}

export function getImageClipPath(shape?: ImageShape, shapeCutPx?: number): string {
  switch (shape) {
    case 'circle':
      return 'circle(50% at 50% 50%)';
    case 'diamond':
      return 'polygon(50% 0%, 100% 50%, 50% 100%, 0% 50%)';
    case 'hexagon':
      return 'polygon(50% 0%, 100% 25%, 100% 75%, 50% 100%, 0% 75%, 0% 25%)';
    case 'hexagon_flat':
      return 'polygon(25% 0%, 75% 0%, 100% 50%, 75% 100%, 25% 100%, 0% 50%)';
    case 'octagon': {
      if (typeof shapeCutPx === 'number' && !Number.isNaN(shapeCutPx) && shapeCutPx > 0) {
        const px = normalizeShapeCutPx(shapeCutPx);
        return `polygon(${px}px 0, calc(100% - ${px}px) 0, 100% ${px}px, 100% calc(100% - ${px}px), calc(100% - ${px}px) 100%, ${px}px 100%, 0 calc(100% - ${px}px), 0 ${px}px)`;
      }
      return 'polygon(29% 0%, 71% 0%, 100% 29%, 100% 71%, 71% 100%, 29% 100%, 0% 71%, 0% 29%)';
    }
    case 'bevel': {
      const px = normalizeShapeCutPx(shapeCutPx);
      return `polygon(${px}px 0, calc(100% - ${px}px) 0, 100% ${px}px, 100% calc(100% - ${px}px), calc(100% - ${px}px) 100%, ${px}px 100%, 0 calc(100% - ${px}px), 0 ${px}px)`;
    }
    case 'ticket':
      return 'polygon(0 0, 100% 0, 100% 34%, calc(100% - 12px) 50%, 100% 66%, 100% 100%, 0 100%, 0 66%, 12px 50%, 0 34%)';
    case 'shield':
      return 'polygon(0 0, 100% 0, 100% 56%, 50% 100%, 0 56%)';
    case 'cross_star':
      return 'polygon(50% 0%, 62% 38%, 100% 50%, 62% 62%, 50% 100%, 38% 62%, 0% 50%, 38% 38%)';
    case 'scallop':
      return 'polygon(50% 0%, 64% 8%, 79% 6%, 86% 20%, 98% 30%, 94% 45%, 100% 60%, 88% 72%, 85% 88%, 70% 90%, 58% 100%, 42% 100%, 30% 90%, 15% 88%, 12% 72%, 0% 60%, 6% 45%, 2% 30%, 14% 20%, 21% 6%, 36% 8%)';
    case 'star':
      return 'polygon(50% 0%, 61% 35%, 98% 35%, 68% 57%, 79% 91%, 50% 70%, 21% 91%, 32% 57%, 2% 35%, 39% 35%)';
    case 'heart':
      return 'polygon(50% 18%, 65% 4%, 86% 6%, 98% 24%, 96% 48%, 50% 94%, 4% 48%, 2% 24%, 14% 6%, 35% 4%)';
    default:
      return 'none';
  }
}

export function getBorderRadiusCSS(el: DesignElement): string {
  if (
    el.radiusTL !== undefined ||
    el.radiusTR !== undefined ||
    el.radiusBR !== undefined ||
    el.radiusBL !== undefined
  ) {
    const tl = el.radiusTL ?? el.borderRadius ?? 0;
    const tr = el.radiusTR ?? el.borderRadius ?? 0;
    const br = el.radiusBR ?? el.borderRadius ?? 0;
    const bl = el.radiusBL ?? el.borderRadius ?? 0;
    return `${tl}px ${tr}px ${br}px ${bl}px`;
  }
  return `${el.borderRadius ?? 0}px`;
}

export function getImageFilterCSS(el: DesignElement): string {
  const filters: string[] = [];
  if (el.imgBrightness !== undefined && el.imgBrightness !== 100) {
    filters.push(`brightness(${el.imgBrightness}%)`);
  }
  if (el.imgContrast !== undefined && el.imgContrast !== 100) {
    filters.push(`contrast(${el.imgContrast}%)`);
  }
  if (el.imgGrayscale && el.imgGrayscale > 0) {
    filters.push(`grayscale(${el.imgGrayscale}%)`);
  }
  if (el.imgSepia && el.imgSepia > 0) {
    filters.push(`sepia(${el.imgSepia}%)`);
  }
  if (el.imgBlur && el.imgBlur > 0) {
    filters.push(`blur(${el.imgBlur}px)`);
  }
  return filters.length > 0 ? `filter: ${filters.join(' ')}` : '';
}

export function getBackgroundPatternCSS(
  bgColor: string,
  bgGradientTo?: string,
  pattern?: BgPattern
): string {
  const styles: string[] = [`background-color: ${bgColor}`];

  if (bgGradientTo && bgGradientTo !== '' && bgGradientTo !== bgColor) {
    styles.push(`background-image: linear-gradient(135deg, ${bgColor} 0%, ${bgGradientTo} 100%)`);
  } else if (pattern === 'dots') {
    styles.push(
      `background-image: radial-gradient(rgba(140,130,115,0.22) 1px, transparent 1px)`,
      `background-size: 14px 14px`
    );
  } else if (pattern === 'grid') {
    styles.push(
      `background-image: linear-gradient(rgba(140,130,115,0.12) 1px, transparent 1px), linear-gradient(90deg, rgba(140,130,115,0.12) 1px, transparent 1px)`,
      `background-size: 18px 18px`
    );
  } else if (pattern === 'cross_grid') {
    styles.push(
      `background-image: radial-gradient(rgba(140,130,115,0.28) 1.5px, transparent 1.5px), linear-gradient(rgba(140,130,115,0.07) 1px, transparent 1px), linear-gradient(90deg, rgba(140,130,115,0.07) 1px, transparent 1px)`,
      `background-size: 20px 20px`
    );
  } else if (pattern === 'lines') {
    styles.push(
      `background-image: repeating-linear-gradient(0deg, transparent, transparent 19px, rgba(140,130,115,0.15) 19px, rgba(140,130,115,0.15) 20px)`
    );
  } else if (pattern === 'stripes') {
    styles.push(
      `background-image: repeating-linear-gradient(45deg, transparent, transparent 8px, rgba(140,130,115,0.09) 8px, rgba(140,130,115,0.09) 16px)`
    );
  } else if (pattern === 'checker') {
    styles.push(
      `background-image: linear-gradient(45deg, rgba(140,130,115,0.08) 25%, transparent 25%), linear-gradient(-45deg, rgba(140,130,115,0.08) 25%, transparent 25%)`,
      `background-size: 16px 16px`
    );
  }

  return styles.join('; ');
}

export function getSurfaceBackgroundCSS(el: DesignElement): string {
  const styles: string[] = [`background-color: ${el.bgColor}`];
  const hasGradient = Boolean(el.bgGradientTo && el.bgGradientTo !== '' && el.bgGradientTo !== el.bgColor);
  const hasBgImg = Boolean(el.bgImageUrl && el.bgImageUrl.trim());

  let gradExpr = '';
  if (hasGradient) {
    const angle = el.bgGradientAngle ?? 135;
    const stops = el.bgGradientMid
      ? `${el.bgColor} 0%, ${el.bgGradientMid} 50%, ${el.bgGradientTo} 100%`
      : `${el.bgColor} 0%, ${el.bgGradientTo} 100%`;
    gradExpr =
      el.bgGradientType === 'radial'
        ? `radial-gradient(circle, ${stops})`
        : `linear-gradient(${angle}deg, ${stops})`;
  }

  if (hasBgImg && hasGradient) {
    styles.push(`background-image: ${gradExpr}, url('${escapeHtmlAttr(el.bgImageUrl!.trim())}')`);
    styles.push(`background-size: auto, ${el.bgSize || 'cover'}`);
    styles.push(`background-position: center, ${el.bgPosition || 'center center'}`);
    styles.push(`background-repeat: no-repeat, ${el.bgRepeat || 'no-repeat'}`);
    if (el.bgAttachment === 'fixed') styles.push('background-attachment: scroll, fixed');
  } else if (hasBgImg) {
    styles.push(`background-image: url('${escapeHtmlAttr(el.bgImageUrl!.trim())}')`);
    styles.push(`background-size: ${el.bgSize || 'cover'}`);
    styles.push(`background-position: ${el.bgPosition || 'center center'}`);
    styles.push(`background-repeat: ${el.bgRepeat || 'no-repeat'}`);
    if (el.bgAttachment === 'fixed') styles.push('background-attachment: fixed');
  } else if (hasGradient) {
    styles.push(`background-image: ${gradExpr}`);
  } else {
    return getBackgroundPatternCSS(el.bgColor, el.bgGradientTo, el.bgPattern);
  }

  return styles.join('; ');
}

export function getPaddingCSS(el: DesignElement): string {
  if (el.paddingLinked === false) {
    const t = el.paddingT ?? el.padding ?? 0;
    const r = el.paddingR ?? el.padding ?? 0;
    const b = el.paddingB ?? el.padding ?? 0;
    const l = el.paddingL ?? el.padding ?? 0;
    return `padding: ${t}px ${r}px ${b}px ${l}px`;
  }
  return `padding: ${el.padding || 0}px`;
}

export function getMarginCSS(el: DesignElement): string {
  const t = el.marginT ?? 0;
  const r = el.marginR ?? 0;
  const b = el.marginB ?? 0;
  const l = el.marginL ?? 0;
  if (t === 0 && r === 0 && b === 0 && l === 0) return '';
  return `margin: ${t}px ${r}px ${b}px ${l}px`;
}

export function getBorderCSS(el: DesignElement): string {
  if (el.bordersLinked === false) {
    const sides = [
      { prop: 'border-top', w: el.borderTopWidth ?? el.borderWidth ?? 0, s: el.borderTopStyle || el.borderStyle || 'solid', c: el.borderTopColor || el.borderColor },
      { prop: 'border-right', w: el.borderRightWidth ?? el.borderWidth ?? 0, s: el.borderRightStyle || el.borderStyle || 'solid', c: el.borderRightColor || el.borderColor },
      { prop: 'border-bottom', w: el.borderBottomWidth ?? el.borderWidth ?? 0, s: el.borderBottomStyle || el.borderStyle || 'solid', c: el.borderBottomColor || el.borderColor },
      { prop: 'border-left', w: el.borderLeftWidth ?? el.borderWidth ?? 0, s: el.borderLeftStyle || el.borderStyle || 'solid', c: el.borderLeftColor || el.borderColor },
    ];
    return sides
      .map((side) =>
        side.w > 0 && side.c !== 'transparent'
          ? `${side.prop}: ${side.w}px ${side.s} ${side.c}`
          : `${side.prop}: none`
      )
      .join('; ');
  }
  return el.borderWidth > 0 && el.borderColor !== 'transparent'
    ? `border: ${el.borderWidth}px ${el.borderStyle || 'solid'} ${el.borderColor}`
    : 'border: none';
}

export function getEffectiveBoxShadow(el: DesignElement): string {
  if (el.customBoxShadowEnabled) {
    const x = el.boxShadowX ?? 0;
    const y = el.boxShadowY ?? 4;
    const blur = el.boxShadowBlur ?? 12;
    const spread = el.boxShadowSpread ?? 0;
    const color = el.boxShadowColor || 'rgba(0,0,0,0.18)';
    const inset = el.boxShadowInset ? 'inset ' : '';
    const customPart = `${inset}${x}px ${y}px ${blur}px ${spread}px ${color}`;
    if (el.innerGlow) {
      return `${customPart}, inset 0 0 14px ${el.borderColor || 'rgba(200,109,81,0.35)'}`;
    }
    return customPart;
  }
  return getShadowStyle(el.shadow, el.innerGlow, el.borderColor);
}

export function getEffectiveTextShadow(el: DesignElement): string {
  if (el.customTextShadowEnabled) {
    const x = el.textShadowX ?? 0;
    const y = el.textShadowY ?? 2;
    const blur = el.textShadowBlur ?? 4;
    const color = el.textShadowColor || 'rgba(0,0,0,0.45)';
    return `text-shadow: ${x}px ${y}px ${blur}px ${color}`;
  }
  return el.textShadow ? 'text-shadow: 0 2px 6px rgba(0,0,0,0.45)' : '';
}

export function renderFontAwesomeInlineHTML(el: DesignElement): string {
  if (!el.faIcon || !el.faIcon.trim()) return '';
  const iconCls = [
    el.faIcon.trim(),
    el.faIconSize || '',
    el.faIconFixedWidth ? 'fa-fw' : '',
    el.faIconPull || '',
  ]
    .filter(Boolean)
    .join(' ');
  if (el.faStackBgIcon && el.faStackBgIcon.trim()) {
    return `<span class="fa-stack ${el.faIconSize || ''}" style="vertical-align: middle; margin-right: 6px;"><i class="${escapeHtmlAttr(el.faStackBgIcon.trim())} fa-stack-2x" style="opacity: 0.25;"></i><i class="${escapeHtmlAttr(el.faIcon.trim())} fa-stack-1x"></i></span>`;
  }
  return `<i class="${escapeHtmlAttr(iconCls)}" style="margin-right: 6px;" aria-hidden="true"></i>`;
}

/**
 * Only stickers, washi tapes, or elements explicitly marked as pinnedOverlay float above the grid.
 * Slightly tilted Polaroids stay in the responsive grid unless pinnedOverlay is checked!
 */
export function isFloatingCollageElement(el: DesignElement): boolean {
  if (el.parentId) return false;
  if (el.type === 'sticker' || el.type === 'washi_tape' || el.pinnedOverlay) return true;
  return false;
}

export function solveRowsFromElements(
  elements: DesignElement[],
  mode: LayoutMode,
  canvasWidth = 760
): SolvedRow[] {
  const flowElements = elements.filter(
    (el) => !el.parentId && (mode === 'block' || !isFloatingCollageElement(el))
  );

  if (mode === 'block') {
    const sorted = [...flowElements].sort((a, b) => a.order - b.order);
    const rowsMap = new Map<number, DesignElement[]>();
    sorted.forEach((el) => {
      const list = rowsMap.get(el.rowIndex) || [];
      list.push(el);
      rowsMap.set(el.rowIndex, list);
    });

    return Array.from(rowsMap.entries())
      .sort(([a], [b]) => a - b)
      .map(([rowIndex, rowEls]) => ({
        rowIndex,
        elements: rowEls.map((el) => ({
          element: el,
          calculatedColSpan: Math.max(2, Math.min(12, el.colSpan || Math.floor(12 / rowEls.length))),
        })),
      }));
  }

  const sortedByY = [...flowElements].sort((a, b) => a.y - b.y);
  const rawRows: DesignElement[][] = [];
  const ROW_THRESHOLD = 52;

  for (const el of sortedByY) {
    const elCenterY = el.y + el.height / 2;
    let placed = false;
    for (const row of rawRows) {
      const rowAvgY = row.reduce((acc, item) => acc + (item.y + item.height / 2), 0) / row.length;
      if (Math.abs(elCenterY - rowAvgY) <= ROW_THRESHOLD) {
        row.push(el);
        placed = true;
        break;
      }
    }
    if (!placed) {
      rawRows.push([el]);
    }
  }

  return rawRows.map((rowEls, idx) => {
    const sortedLeftToRight = [...rowEls].sort((a, b) => a.x - b.x);
    const totalRawCols = sortedLeftToRight.reduce((sum, el) => {
      const approxCol = Math.max(2, Math.min(12, Math.round((el.width / canvasWidth) * 12)));
      return sum + approxCol;
    }, 0);

    return {
      rowIndex: idx,
      elements: sortedLeftToRight.map((el) => {
        const approxCol = Math.max(2, Math.min(12, Math.round((el.width / canvasWidth) * 12)));
        const normalizedCol =
          sortedLeftToRight.length === 1
            ? Math.min(12, Math.max(4, approxCol))
            : Math.max(2, Math.min(12, Math.round((approxCol / Math.max(12, totalRawCols)) * 12)));
        return {
          element: el,
          calculatedColSpan: normalizedCol,
        };
      }),
    };
  });
}

function getShadowStyle(shadow: DesignElement['shadow'], innerGlow?: boolean, borderColor?: string): string {
  const parts: string[] = [];
  if (shadow === 'sm') parts.push('0 2px 6px rgba(0,0,0,0.18)');
  if (shadow === 'md') parts.push('0 6px 16px rgba(0,0,0,0.28)');
  if (shadow === 'lg') parts.push('0 12px 28px rgba(0,0,0,0.42)');
  if (innerGlow) parts.push(`inset 0 0 14px ${borderColor || 'rgba(200,109,81,0.35)'}`);
  return parts.length > 0 ? parts.join(', ') : 'none';
}

function renderTabsHTML(
  el: DesignElement,
  isToyhouse: boolean,
  baseStyle: string,
  classes: string,
  isToyhouseFree = false
): string {
  const tabs =
    el.tabs && el.tabs.length > 0
      ? el.tabs
      : [
          { id: 't1', title: '01. Overview', content: 'Overview tab content.' },
          { id: 't2', title: '02. Details', content: 'Details tab content.' },
        ];

  if (isToyhouseFree || el.type === 'pure_f2u_tabs') {
    const safePrefix = `dbx-tab-${el.id.replace(/[^a-zA-Z0-9_-]/g, '')}`;
    const navItems = tabs
      .map(
        (t, idx) =>
          `        <li class="nav-item"><a class="nav-link${idx === 0 ? ' active' : ''}" data-toggle="tab" href="#${safePrefix}-${idx}" style="color: ${el.textColor}; border-color: ${el.borderColor};">${t.title}</a></li>`
      )
      .join('\n');
    const tabPanes = tabs
      .map(
        (t, idx) =>
          `        <div class="tab-pane fade${idx === 0 ? ' show active' : ''}" id="${safePrefix}-${idx}" style="padding-top: 10px; font-size: ${el.fontSize}px; white-space: pre-line;">${t.content}</div>`
      )
      .join('\n');

    return `<div id="${el.id}-wrap" class="${classes}" style="${baseStyle}">
      ${el.content ? `<div style="font-weight: 700; margin-bottom: 8px; font-size: ${el.fontSize + 1}px;">${el.content}</div>` : ''}
      <ul class="nav nav-tabs" style="border-bottom-color: ${el.borderColor};">
${navItems}
      </ul>
      <div class="tab-content" style="flex: 1;">
${tabPanes}
      </div>
    </div>`;
  }

  // Pure CSS Radio Tabs for Toyhouse Premium / Carrd Pro
  const groupName = `dbx-tab-grp-${el.id}`;
  const radiosAndLabels = tabs
    .map(
      (t, idx) =>
        `      <input type="radio" name="${groupName}" id="${groupName}-${idx}" class="dbx-tab-radio" ${idx === 0 ? 'checked' : ''} style="display:none;" />
      <label for="${groupName}-${idx}" class="dbx-tab-label ${isToyhouse ? 'btn btn-sm' : ''}" style="cursor:pointer; padding: 5px 11px; border-radius: 6px; font-size: ${Math.max(11, el.fontSize - 1)}px; border: 1px solid ${el.borderColor}; margin-right: 6px; display: inline-block; user-select: none;">${t.title}</label>`
    )
    .join('\n');

  const panels = tabs
    .map(
      (t, idx) =>
        `      <div class="dbx-tab-panel dbx-panel-${idx}" style="margin-top: 10px; font-size: ${el.fontSize}px; white-space: pre-line; opacity: 0.92;">${t.content}</div>`
    )
    .join('\n');

  const scopedTabCss = `<style>
      #${el.id}-wrap .dbx-tab-panel { display: none; }
      ${tabs.map((_, idx) => `#${groupName}-${idx}:checked ~ .dbx-panels .dbx-panel-${idx} { display: block; } #${groupName}-${idx}:checked + label { background: ${el.borderColor}; color: #fff; }`).join('\n      ')}
    </style>`;

  return `<div id="${el.id}-wrap" class="${classes}" style="${baseStyle}">
      ${scopedTabCss}
      <div style="font-weight: 700; margin-bottom: 8px; font-size: ${el.fontSize + 1}px;">${el.content}</div>
${radiosAndLabels}
      <div class="dbx-panels">
${panels}
      </div>
    </div>`;
}

function renderGalleryHTML(el: DesignElement, baseStyle: string, classes: string): string {
  const items =
    el.gallery && el.gallery.length > 0
      ? el.gallery
      : [
          {
            id: 'g1',
            url: 'https://images.unsplash.com/photo-1579783902614-a3fb3927b675?w=400&auto=format&fit=crop&q=80',
            caption: 'Plate I',
          },
        ];

  const slotHeight = el.imageSlotHeight || 110;
  const fit = el.imageFit || 'cover';
  const imgRadius = el.imageBorderRadius !== undefined ? el.imageBorderRadius : Math.max(4, el.borderRadius);

  const cards = items
    .map((item) => {
      const imgTag = `<img src="${item.url}" alt="${item.caption || ''}" style="width: 100%; height: ${slotHeight}px; object-fit: ${fit}; display: block;" />`;
      let interactiveImg = imgTag;
      if (item.clickAction === 'lightbox') {
        interactiveImg = `<details class="dbx-lightbox-details" style="position: relative; width: 100%;">
          <summary style="cursor: pointer; list-style: none; outline: none;">${imgTag}</summary>
          <div style="position: fixed; top: 0; right: 0; bottom: 0; left: 0; background: rgba(0,0,0,0.85); z-index: 9999; display: flex; align-items: center; justify-content: center; padding: 16px; cursor: pointer;">
            <img src="${item.url}" style="max-width: 90vw; max-height: 90vh; object-fit: contain; border-radius: 8px; box-shadow: 0 10px 30px rgba(0,0,0,0.8);" />
          </div>
        </details>`;
      } else if (item.linkUrl) {
        interactiveImg = `<a href="${item.linkUrl}" target="_blank" rel="noopener noreferrer" style="text-decoration: none; display: block; width: 100%;" title="${item.caption || 'Open Link'}">
          ${imgTag}
        </a>`;
      }

      return `      <div style="flex: 1 1 140px; background: rgba(0,0,0,0.22); border-radius: ${imgRadius}px; overflow: hidden; border: 1px solid rgba(255,255,255,0.08);">
        ${interactiveImg}
        ${item.caption ? `<div style="padding: 5px 8px; font-size: 11px; text-align: center; opacity: 0.88;">${item.caption}</div>` : ''}
      </div>`;
    })
    .join('\n');

  return `<div class="${classes}" style="${baseStyle}">
    <div style="font-weight: 700; margin-bottom: 8px; font-size: ${el.fontSize}px;">${el.content}</div>
    <div style="display: flex; flex-wrap: wrap; gap: ${el.imageGap !== undefined ? el.imageGap : 10}px;">
${cards}
    </div>
  </div>`;
}

function renderMoodboardHTML(
  el: DesignElement,
  baseStyle: string,
  classes: string
): string {
  const items =
    el.gallery && el.gallery.length > 0
      ? el.gallery
      : [
          {
            id: 'm1',
            url: 'https://images.unsplash.com/photo-1579783902614-a3fb3927b675?w=400&auto=format&fit=crop&q=80',
            caption: 'Aesthetic I',
          },
          {
            id: 'm2',
            url: 'https://images.unsplash.com/photo-1518709268805-4e9042af9f23?w=400&auto=format&fit=crop&q=80',
            caption: 'Aesthetic II',
          },
          {
            id: 'm3',
            url: 'https://images.unsplash.com/photo-1509198397868-475647b2a1e5?w=400&auto=format&fit=crop&q=80',
            caption: 'Aesthetic III',
          },
          {
            id: 'm4',
            url: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=400&auto=format&fit=crop&q=80',
            caption: 'Aesthetic IV',
          },
        ];

  const layout = el.moodboardLayout || '2x2';
  const slotHeight = el.imageSlotHeight || 80;
  const gap = el.imageGap !== undefined ? el.imageGap : 6;
  const fit = el.imageFit || 'cover';
  const imgRadius = el.imageBorderRadius !== undefined ? el.imageBorderRadius : 4;

  let gridCols = 'repeat(2, 1fr)';
  if (layout === '3col') gridCols = 'repeat(3, 1fr)';
  else if (layout === 'strip') gridCols = `repeat(${items.length}, 1fr)`;
  else if (layout === 'hero') gridCols = '2fr 1fr';
  else if (layout === 'masonry') gridCols = 'repeat(auto-fit, minmax(90px, 1fr))';

  const hoverCls =
    el.imageHoverEffect === 'zoom'
      ? 'dbx-img-zoom-hover'
      : el.imageHoverEffect === 'lift'
      ? 'dbx-hover-lift'
      : el.imageHoverEffect === 'glow'
      ? 'dbx-hover-glow'
      : '';

  const slotsHtml = items
    .map((item, idx) => {
      const isHeroFirst = layout === 'hero' && idx === 0;
      const currentHeight = isHeroFirst ? slotHeight * 2 + gap : slotHeight;
      const heroSpan = isHeroFirst ? 'grid-row: span 2;' : '';

      const imgTag = `<img src="${item.url}" alt="${item.caption || ''}" style="width: 100%; height: ${currentHeight}px; object-fit: ${fit}; border-radius: ${imgRadius}px; border: 1px solid ${el.borderColor || 'rgba(150,140,125,0.3)'}; display: block; transition: transform 0.22s ease, filter 0.22s ease;" />`;

      let interactiveImg = imgTag;
      if (item.clickAction === 'lightbox') {
        interactiveImg = `<details class="dbx-lightbox-details" style="position: relative; width: 100%;">
          <summary style="cursor: pointer; list-style: none; outline: none;">${imgTag}</summary>
          <div style="position: fixed; top: 0; right: 0; bottom: 0; left: 0; background: rgba(0,0,0,0.85); z-index: 9999; display: flex; align-items: center; justify-content: center; padding: 16px; cursor: pointer;">
            <img src="${item.url}" style="max-width: 90vw; max-height: 90vh; object-fit: contain; border-radius: 8px; box-shadow: 0 10px 30px rgba(0,0,0,0.8);" />
          </div>
        </details>`;
      } else if (item.linkUrl) {
        interactiveImg = `<a href="${item.linkUrl}" target="_blank" rel="noopener noreferrer" style="text-decoration: none; display: block; width: 100%;" title="${item.caption || 'Open Link'}">
          ${imgTag}
        </a>`;
      }

      return `<div class="${hoverCls}" style="${heroSpan} position: relative; overflow: hidden; border-radius: ${imgRadius}px;">
        ${interactiveImg}
        ${item.caption ? `<div style="font-size: 9px; padding: 2px 4px; text-align: center; opacity: 0.8; font-family: monospace;">${item.caption}</div>` : ''}
      </div>`;
    })
    .join('\n');

  return `<div class="${classes}" style="${baseStyle}">
    ${el.content ? `<div style="font-size: 11px; font-weight: 700; margin-bottom: 6px; letter-spacing: 0.06em;">${el.content}</div>` : ''}
    <div style="display: grid; grid-template-columns: ${gridCols}; gap: ${gap}px; flex: 1;">
      ${slotsHtml}
    </div>
  </div>`;
}

export function renderInnerElementHTML(
  rawEl: DesignElement,
  isToyhouse: boolean,
  allElements: DesignElement[] = [],
  isFreeformFixed = false,
  isToyhouseFree = false
): string {
  if (rawEl.hidden) return '';
  const el = isToyhouseFree ? maskElementForF2USimulation(rawEl) : rawEl;
  const children = allElements.filter((c) => c.parentId === el.id && !c.hidden);
  const faAnimClass = isToyhouse ? getFontAwesomeAnimClass(el.idleAnimation) : '';
  const faRotateClass = isToyhouse ? getFontAwesomeRotationClass(el.rotation) : '';
  const rotationCss =
    !isToyhouseFree && el.rotation && !faRotateClass ? `transform: rotate(${el.rotation}deg)` : '';
  const opacityCss = el.opacity !== undefined && el.opacity < 100 ? `opacity: ${(el.opacity / 100).toFixed(2)}` : '';

  const overflowRule = (() => {
    if (el.overflowX || el.overflowY) {
      const ox = el.overflowX || (el.scrollable || el.type === 'scrollbox' || el.type === 'pure_scrollbox' ? 'hidden' : 'hidden');
      const oy = el.overflowY || (el.scrollable || el.type === 'scrollbox' || el.type === 'pure_scrollbox' ? 'auto' : 'hidden');
      return `overflow-x: ${ox}; overflow-y: ${oy}`;
    }
    return el.scrollable || el.type === 'scrollbox' || el.type === 'pure_scrollbox'
      ? 'overflow-y: auto'
      : 'overflow: hidden';
  })();

  const shadowVal = getEffectiveBoxShadow(el);
  const textShadowCss = getEffectiveTextShadow(el);
  const glassCss =
    !isToyhouseFree && el.glassBlur && el.glassBlur > 0
      ? `backdrop-filter: blur(${el.glassBlur}px)`
      : '';

  const justifyMap = {
    top: 'flex-start',
    center: 'center',
    bottom: 'flex-end',
  };

  const animDurationCss =
    el.animDuration || (el.idleAnimation && el.idleAnimation !== 'none')
      ? `animation-duration: ${el.animDuration || 2}s`
      : '';

  const parentEl = el.parentId ? allElements.find((p) => p.id === el.parentId) : undefined;
  const isChildFixed = Boolean(
    parentEl && (parentEl.containerLayout || 'freeform_offset') === 'freeform_offset'
  );
  const marginCss = !isFreeformFixed ? getMarginCSS(el) : '';
  const minHeightVal =
    el.minHeightPx !== undefined
      ? `${el.minHeightPx}px`
      : el.type === 'image' ||
        el.type === 'pure_image_slot' ||
        ((isFreeformFixed || isChildFixed) && !el.autoHeight)
      ? '0'
      : `${Math.max(24, el.height)}px`;
  const maxHeightCss = el.maxHeightPx ? `max-height: ${el.maxHeightPx}px` : '';
  const aspectRatioCss = el.aspectRatio ? `aspect-ratio: ${el.aspectRatio}` : '';
  const wordBreakCss = el.wordBreak && el.wordBreak !== 'normal' ? `word-break: ${el.wordBreak}` : '';
  const cursorCss = el.cursorStyle && el.cursorStyle !== 'auto' ? `cursor: ${el.cursorStyle}` : '';
  const pointerEventsCss = el.pointerEvents === 'none' ? 'pointer-events: none' : '';
  const userSelectCss = el.userSelect && el.userSelect !== 'auto' ? `user-select: ${el.userSelect}` : '';
  const rawInlineCss = el.customInlineStyle ? el.customInlineStyle.trim().replace(/;+$/, '') : '';
  const enabledMods = (el.modifiers || []).filter((m) => m.enabled);
  const activeSplit = enabledMods.find((m): m is SplitModifier => m.kind === 'split');
  const usesF2UPunch = canUseF2UBackgroundPunch(el);
  const { maskCss, maskRingOverlaysHtml } = isToyhouseFree
    ? { maskCss: '', maskRingOverlaysHtml: '' }
    : buildSvgMaskStyle(el);
  const { f2uPunchHtml, overlaysHtml } = renderOverlayModifiersHTML(el);

  const isImgSlotEmpty = el.type === 'pure_image_slot' && (!el.url || !el.url.trim());
  const isImageWithUrl = el.type === 'image' || (el.type === 'pure_image_slot' && !isImgSlotEmpty);
  const isNonGeoPrimitive =
    el.type === 'pure_line' ||
    el.type === 'lace_divider' ||
    el.type === 'folder_header' ||
    el.type === 'washi_tape' ||
    el.type === 'pure_star';
  const effectiveBoxShape: ImageShape | undefined = isImageWithUrl
    ? undefined
    : isImgSlotEmpty
    ? el.imageShape && el.imageShape !== 'rect'
      ? el.imageShape
      : el.boxClipShape
    : el.boxClipShape ||
      (el.type === 'pure_diamond'
        ? 'diamond'
        : el.type === 'pure_hexagon'
        ? 'hexagon'
        : el.type === 'pure_octagon'
        ? 'octagon'
        : undefined);

  const hasCustomBgSurface =
    Boolean(el.bgImageUrl && el.bgImageUrl.trim()) ||
    Boolean(el.bgGradientTo && el.bgGradientTo !== '' && el.bgGradientTo !== el.bgColor) ||
    (Boolean(el.bgPattern) && el.bgPattern !== 'none');
  const hasUniformBorder =
    el.bordersLinked !== false &&
    (el.borderWidth || 0) > 0 &&
    Boolean(el.borderColor && el.borderColor !== 'transparent');
  const isLinkElement = el.type === 'button' || el.type === 'pure_link';

  const isBoxF2UGeo =
    !isImageWithUrl &&
    !isNonGeoPrimitive &&
    isF2UGeometricShape(effectiveBoxShape) &&
    !usesF2UPunch;

  const geoUseQuadrantFill = isBoxF2UGeo && !hasCustomBgSurface;
  const geoBorderShell =
    isBoxF2UGeo &&
    hasUniformBorder &&
    !isLinkElement &&
    (!hasCustomBgSurface || isToyhouseFree);
  const geoCornerOverlayHtml =
    isBoxF2UGeo && hasCustomBgSurface && isToyhouseFree
      ? `<div style="position: absolute; top: 0; right: 0; bottom: 0; left: 0; z-index: 5; ${buildF2UCornerMaskOverlayCss(
          effectiveBoxShape!,
          geoBorderShell ? el.borderColor : el.shapeMaskBgColor || '#FAF8F5',
          el.shapeCutPx
        )}"></div>`
      : '';

  const activeImageShape = isImageWithUrl ? el.imageShape || el.boxClipShape : undefined;
  const isStandardImgFrame = !el.frameStyle || el.frameStyle === 'none';
  const hasImgGeoBorder =
    isImageWithUrl &&
    isToyhouseFree &&
    isStandardImgFrame &&
    isF2UGeometricShape(activeImageShape) &&
    hasUniformBorder;
  const isF2UGeoImage =
    isImageWithUrl && isToyhouseFree && isF2UGeometricShape(activeImageShape);

  const effectiveBoxRadius =
    (isBoxF2UGeo && (geoUseQuadrantFill || isToyhouseFree)) || (isF2UGeoImage && isStandardImgFrame)
      ? '0'
      : el.type !== 'image' && el.type !== 'pure_image_slot'
      ? getShapeBorderRadiusOverride(effectiveBoxShape || el.boxClipShape) || getBorderRadiusCSS(el)
      : getBorderRadiusCSS(el);
  const boxClipExpr =
    !isToyhouseFree && !isImageWithUrl && (!isBoxF2UGeo || hasCustomBgSurface)
      ? getImageClipPath(effectiveBoxShape || el.boxClipShape, el.shapeCutPx)
      : 'none';
  const boxClipCss = boxClipExpr !== 'none' ? `clip-path: ${boxClipExpr}` : '';

  const f2uRadialShape =
    isToyhouseFree &&
    !isImageWithUrl &&
    !hasCustomBgSurface &&
    !usesF2UPunch &&
    (rawEl.boxClipShape === 'ticket' ||
      rawEl.boxClipShape === 'cross_star' ||
      rawEl.boxClipShape === 'scallop')
      ? rawEl.boxClipShape
      : null;

  const f2uFaVectorShape =
    isToyhouseFree &&
    !isImageWithUrl &&
    !usesF2UPunch &&
    (rawEl.boxClipShape === 'star' ||
      rawEl.boxClipShape === 'heart' ||
      rawEl.boxClipShape === 'shield')
      ? rawEl.boxClipShape
      : null;

  const f2uFaVectorIconClass =
    f2uFaVectorShape === 'star'
      ? 'fas fa-star'
      : f2uFaVectorShape === 'heart'
      ? 'fas fa-heart'
      : f2uFaVectorShape === 'shield'
      ? 'fas fa-shield-alt'
      : '';

  const f2uFaVectorOverlayHtml = f2uFaVectorShape
    ? `      <div style="position: absolute; top: 0; right: 0; bottom: 0; left: 0; display: flex; align-items: center; justify-content: center; pointer-events: none; z-index: 0;"><i class="${f2uFaVectorIconClass}" style="font-size: ${Math.max(24, Math.round(Math.min(el.width, el.height) * 0.9))}px; color: ${el.bgColor && el.bgColor !== 'transparent' ? el.bgColor : el.borderColor}; line-height: 1;"></i></div>`
    : '';

  const surfaceBgCss = usesF2UPunch
    ? 'background-color: transparent'
    : hasImgGeoBorder
    ? buildF2UQuadrantSurfaceCss(activeImageShape!, el.borderColor, el.shapeCutPx)
    : isF2UGeoImage && isStandardImgFrame
    ? 'background-color: transparent'
    : f2uFaVectorShape
    ? 'background-color: transparent'
    : f2uRadialShape
    ? buildF2URadialCutoutCss(f2uRadialShape, el.bgColor, el.shapeMaskBgColor || 'transparent')
    : geoUseQuadrantFill
    ? buildF2UQuadrantSurfaceCss(
        effectiveBoxShape!,
        el.bgColor && el.bgColor !== 'transparent'
          ? el.bgColor
          : geoBorderShell
          ? el.shapeMaskBgColor || '#FAF8F5'
          : 'transparent',
        el.shapeCutPx
      )
    : getSurfaceBackgroundCSS(el);

  const effectiveBorderCss =
    f2uFaVectorShape ||
    (isBoxF2UGeo && (geoUseQuadrantFill || isToyhouseFree)) ||
    (isF2UGeoImage && isStandardImgFrame)
      ? 'border: none'
      : getBorderCSS(el);

  const effectivePaddingCss = activeSplit
    ? 'padding: 0px'
    : hasImgGeoBorder
    ? `padding: ${Math.max(el.padding || 0, Math.max(1, el.borderWidth))}px`
    : getPaddingCSS(el);

  const suppressBoxShadow = isBoxF2UGeo || (isF2UGeoImage && isStandardImgFrame);

  const geoOuterShellStyle = geoBorderShell
    ? [
        buildF2UQuadrantSurfaceCss(effectiveBoxShape!, el.borderColor, el.shapeCutPx),
        'border: none',
        'border-radius: 0',
        `padding: ${Math.max(1, el.borderWidth)}px`,
        marginCss,
        rotationCss,
        opacityCss,
        overflowRule,
        `min-height: ${minHeightVal}`,
        maxHeightCss,
        aspectRatioCss,
        cursorCss,
        pointerEventsCss,
        userSelectCss,
        'box-sizing: border-box',
        el.autoHeight
          ? 'height: auto; position: relative'
          : isFreeformFixed
          ? 'position: absolute; top: 0; right: 0; bottom: 0; left: 0'
          : 'height: 100%; position: relative',
        'display: flex',
        'flex-direction: column',
        animDurationCss,
        !isToyhouseFree ? 'transition: transform 0.22s ease, box-shadow 0.22s ease, opacity 0.22s ease' : '',
      ]
        .filter(Boolean)
        .join('; ')
    : '';

  const baseStyle = [
    surfaceBgCss,
    `color: ${el.textColor}`,
    effectiveBorderCss,
    `border-radius: ${effectiveBoxRadius}`,
    effectivePaddingCss,
    geoBorderShell ? '' : marginCss,
    `font-size: ${el.fontSize}px`,
    `font-family: ${el.googleFont ? `'${el.googleFont}', ` : ''}${getFontFamilyCSS(el.fontFamily)}`,
    `font-weight: ${el.fontWeight === 'bold' ? '700' : el.fontWeight === 'medium' ? '500' : '400'}`,
    `text-align: ${el.textAlign}`,
    el.lineHeight ? `line-height: ${el.lineHeight}` : 'line-height: 1.45',
    el.letterSpacing ? `letter-spacing: ${el.letterSpacing}px` : '',
    el.textTransform && el.textTransform !== 'none' ? `text-transform: ${el.textTransform}` : '',
    el.fontStyle === 'italic' ? 'font-style: italic' : '',
    el.textDecoration === 'underline' ? 'text-decoration: underline' : '',
    textShadowCss,
    !suppressBoxShadow && shadowVal !== 'none' ? `box-shadow: ${shadowVal}` : '',
    glassCss,
    geoBorderShell ? '' : rotationCss,
    geoBorderShell ? '' : opacityCss,
    geoBorderShell ? 'overflow: hidden' : overflowRule,
    maskCss,
    boxClipCss,
    geoBorderShell ? 'min-height: 0' : `min-height: ${minHeightVal}`,
    geoBorderShell ? '' : maxHeightCss,
    geoBorderShell ? '' : aspectRatioCss,
    wordBreakCss,
    geoBorderShell ? '' : cursorCss,
    geoBorderShell ? '' : pointerEventsCss,
    geoBorderShell ? '' : userSelectCss,
    'box-sizing: border-box',
    geoBorderShell
      ? `width: 100%; ${el.autoHeight ? 'height: auto' : 'height: 100%'}; flex: 1; position: relative`
      : el.autoHeight
      ? 'height: auto; position: relative'
      : isFreeformFixed
      ? 'position: absolute; top: 0; right: 0; bottom: 0; left: 0'
      : 'height: 100%; position: relative',
    'display: flex',
    'flex-direction: column',
    `justify-content: ${justifyMap[el.verticalAlign || 'center']}`,
    geoBorderShell ? '' : animDurationCss,
    !geoBorderShell && !isToyhouseFree ? 'transition: transform 0.22s ease, box-shadow 0.22s ease, opacity 0.22s ease' : '',
    rawInlineCss,
  ]
    .filter(Boolean)
    .join('; ');

  const classes = [
    'dbx-el',
    !isToyhouseFree && el.hoverEffect !== 'none' ? `dbx-hover-${el.hoverEffect}` : '',
    faAnimClass ? faAnimClass : '',
    faRotateClass && !faAnimClass ? faRotateClass : '',
    !isToyhouseFree && el.idleAnimation && el.idleAnimation !== 'none'
      ? `dbx-anim-${el.idleAnimation}`
      : '',
    el.bsClasses ? el.bsClasses.trim() : '',
    !isToyhouseFree && el.customCssClass ? el.customCssClass.trim() : '',
  ]
    .filter(Boolean)
    .join(' ');

  let wrapBoxLinkAfterGeo = false;

  const finalizeElementHTML = (rawHtml: string): string => {
    let out = rawHtml;
    if (f2uFaVectorOverlayHtml) {
      const firstTagEnd = out.indexOf('>');
      const lastCloseIdx =
        out.lastIndexOf('</div>') !== -1 ? out.lastIndexOf('</div>') : out.lastIndexOf('</a>');
      if (firstTagEnd !== -1 && lastCloseIdx > firstTagEnd) {
        const innerBody = out.slice(firstTagEnd + 1, lastCloseIdx);
        out =
          out.slice(0, firstTagEnd + 1) +
          `\n${f2uFaVectorOverlayHtml}\n<div style="position: relative; z-index: 1; width: 100%;">${innerBody}</div>` +
          out.slice(lastCloseIdx);
      }
    }
    if (f2uPunchHtml || overlaysHtml || geoCornerOverlayHtml) {
      const insertClose = out.lastIndexOf('</div>') !== -1 ? '</div>' : '</a>';
      const idx = out.lastIndexOf(insertClose);
      if (idx !== -1) {
        out =
          out.slice(0, idx) +
          (f2uPunchHtml ? `\n${f2uPunchHtml}` : '') +
          (overlaysHtml ? `\n${overlaysHtml}` : '') +
          (geoCornerOverlayHtml ? `\n${geoCornerOverlayHtml}` : '') +
          out.slice(idx);
      }
    }
    if (geoOuterShellStyle) {
      const innerClean = out.replace(`class="${classes}" `, '').replace(`class="${classes}"`, '');
      out = `<div class="${classes}" style="${geoOuterShellStyle}">${innerClean}</div>`;
    }
    if (wrapBoxLinkAfterGeo && el.linkUrl && !el.collapsible) {
      out = `<a href="${el.linkUrl}" target="${el.linkTarget || '_blank'}" rel="noopener noreferrer" style="text-decoration: none; color: inherit; display: block; height: 100%;" title="${escapeHtmlAttr(el.tooltip || el.content || 'Link')}">${out}</a>`;
    }
    if (maskCss && maskRingOverlaysHtml) {
      out = `<div style="position: relative; width: 100%; height: ${el.autoHeight ? 'auto' : '100%'};">\n${out}\n${maskRingOverlaysHtml}\n</div>`;
    }
    if (faRotateClass && faAnimClass && el.type !== 'pagedoll') {
      out = `<div class="${faRotateClass}" style="width: 100%; height: 100%; position: relative;">\n${out}\n</div>`;
    }
    const tip = el.tooltip?.trim();
    if (tip) {
      const escaped = escapeHtmlAttr(tip);
      if (/^<(div|a|details)\b[^>]*\btitle="/i.test(out)) {
        out = out.replace(/\btitle="[^"]*"/, `title="${escaped}"`);
      } else {
        out = out.replace(/^<(div|a|details)\b/, `<$1 title="${escaped}"`);
      }
    }
    if (el.f2uCollapseRole === 'target' && el.f2uCollapseId?.trim()) {
      const cid = escapeHtmlAttr(el.f2uCollapseId.trim().replace(/^#/, ''));
      out = `<div class="collapse${el.f2uCollapseDefaultOpen ? ' show' : ''}" id="${cid}">\n${out}\n</div>`;
    } else if (el.f2uCollapseRole === 'trigger' && el.f2uCollapseId?.trim()) {
      const cid = escapeHtmlAttr(el.f2uCollapseId.trim().replace(/^#/, ''));
      out = `<a data-toggle="collapse" href="#${cid}" role="button" aria-expanded="${el.f2uCollapseDefaultOpen ? 'true' : 'false'}" style="text-decoration: none; color: inherit; display: block; height: 100%;">\n${out}\n</a>`;
    }
    return out;
  };

  const cLayout = el.containerLayout || 'freeform_offset';
  const cGap = el.containerGap !== undefined ? el.containerGap : 8;
  const cAlign = el.containerAlign || 'stretch';
  const cJustify = el.containerJustify || 'flex-start';
  const cWrap = el.containerWrap !== false;
  const isBootstrapGrid = cLayout === 'grid_2' || cLayout === 'grid_3';
  const halfGap = (cGap / 2).toFixed(1).replace(/\.0$/, '');

  let containerCss = '';
  let containerClass = '';
  if (cLayout === 'flex_col') {
    containerCss = `margin-top: 10px; display: flex; flex-direction: column; gap: ${cGap}px; align-items: ${cAlign}; justify-content: ${cJustify}; width: 100%;`;
  } else if (cLayout === 'flex_row') {
    containerCss = `margin-top: 10px; display: flex; flex-direction: row; flex-wrap: ${cWrap ? 'wrap' : 'nowrap'}; gap: ${cGap}px; align-items: ${cAlign}; justify-content: ${cJustify}; width: 100%;`;
  } else if (cLayout === 'grid_2') {
    containerClass = 'row no-gutters dbx-bs-row dbx-bs-cols-2';
    containerCss = `margin-top: 10px; margin-left: -${halfGap}px; margin-right: -${halfGap}px; width: calc(100% + ${cGap}px);`;
  } else if (cLayout === 'grid_3') {
    containerClass = 'row no-gutters dbx-bs-row dbx-bs-cols-3';
    containerCss = `margin-top: 10px; margin-left: -${halfGap}px; margin-right: -${halfGap}px; width: calc(100% + ${cGap}px);`;
  } else if (cLayout === 'freeform_offset') {
    containerCss = `position: absolute; top: 0; right: 0; bottom: 0; left: 0; width: 100%; height: 100%; overflow: hidden; pointer-events: none; z-index: 4;`;
  }

  const nestedChildrenHTML =
    children.length > 0
      ? `\n      <div${containerClass ? ` class="${containerClass}"` : ''} style="${containerCss}">\n${children
          .map((child) => {
            let childWrapperStyle = '';
            let childWrapperClass = '';
            if (cLayout === 'freeform_offset') {
              const offX = child.childOffsetX !== undefined ? child.childOffsetX : 12;
              const offY = child.childOffsetY !== undefined ? child.childOffsetY : 12;
              const cw = child.childCustomWidth || child.width;
              const ch = child.childCustomHeight || child.height;
              childWrapperStyle = `position: absolute; left: ${offX}px; top: ${offY}px; width: ${cw}px; height: ${ch}px; overflow: hidden; box-sizing: border-box; pointer-events: auto; z-index: ${child.zIndex || 10};`;
            } else {
              const widthMode = child.childWidthMode || 'auto';
              const imageHeightGuard =
                child.type === 'image' || child.type === 'pure_image_slot'
                  ? ` height: ${child.childCustomHeight || child.height}px;`
                  : '';
              if (isBootstrapGrid) {
                childWrapperClass =
                  widthMode === 'full'
                    ? 'col-12'
                    : widthMode === 'half' || cLayout === 'grid_2'
                    ? 'col-12 col-md-6'
                    : 'col-12 col-md-4';
                childWrapperStyle = `padding-left: ${halfGap}px; padding-right: ${halfGap}px; margin-bottom: ${cGap}px; box-sizing: border-box;${imageHeightGuard}`;
              } else if (widthMode === 'full') {
                childWrapperStyle = `width: 100%; flex: 1 1 100%; min-width: 0;${imageHeightGuard}`;
              } else if (widthMode === 'half') {
                childWrapperStyle = `width: calc(50% - ${cGap / 2}px); flex: 1 1 calc(50% - ${cGap / 2}px); min-width: 120px;${imageHeightGuard}`;
              } else if (widthMode === 'custom') {
                childWrapperStyle = `width: ${child.childCustomWidth || child.width}px; flex-shrink: 0;${imageHeightGuard}`;
              } else {
                childWrapperStyle = `flex: 1 1 auto; min-width: 0;${imageHeightGuard}`;
              }
            }
            return `        <div${childWrapperClass ? ` class="${childWrapperClass}"` : ''} style="${childWrapperStyle}">${renderInnerElementHTML(child, isToyhouse, allElements, false, isToyhouseFree)}</div>`;
          })
          .join('\n')}\n      </div>`
      : '';

  const faInlineIconHtml = renderFontAwesomeInlineHTML(el);

  const rawElementHtml = (() => {
    if (el.rawInnerHtml && el.rawInnerHtml.trim()) {
      return `<div class="${classes}" style="${baseStyle}">${el.rawInnerHtml}${nestedChildrenHTML}</div>`;
    }

    switch (el.type) {
    case 'tabs':
    case 'pure_f2u_tabs':
      return renderTabsHTML(el, isToyhouse, baseStyle, classes, isToyhouseFree);

    case 'gallery':
      return renderGalleryHTML(el, baseStyle, classes);

    case 'split_box': {
      const parts = (el.subContent || 'Left column content... || Right column content...').split('||');
      return `<div class="${classes}" style="${baseStyle}">
      <div style="font-weight: 700; margin-bottom: 8px; border-bottom: 1px solid ${el.borderColor}; padding-bottom: 4px;">${el.content}</div>
      <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 12px; flex: 1;">
        <div style="padding: 8px; background: rgba(0,0,0,0.14); border-radius: 4px; font-size: ${Math.max(11, el.fontSize - 1)}px; white-space: pre-line;">${(parts[0] || '').trim()}</div>
        <div style="padding: 8px; background: rgba(0,0,0,0.14); border-radius: 4px; font-size: ${Math.max(11, el.fontSize - 1)}px; white-space: pre-line;">${(parts[1] || 'Right column notes...').trim()}</div>
      </div>
    </div>`;
    }

    case 'quote_bubble': {
      return `<div class="${classes}" style="${baseStyle}${isFreeformFixed && !el.autoHeight ? '' : '; position: relative;'}">
      <div style="font-size: ${el.fontSize + 8}px; line-height: 1; color: ${el.borderColor}; opacity: 0.65; margin-bottom: 2px;">“</div>
      <div style="font-style: italic; font-size: ${el.fontSize}px;">${el.content}</div>
      ${el.subContent ? `<div style="margin-top: 6px; font-size: 11px; font-weight: 700; color: ${el.borderColor}; text-align: right;">— ${el.subContent}</div>` : ''}
    </div>`;
    }

    case 'kv_table':
    case 'id_card': {
      const rows = (el.subContent || 'Name: Elara Vale\nSpecies: Human\nAge: 21\nPronouns: She/Her')
        .split('\n')
        .filter(Boolean);
      const rowsHtml = rows
        .map((line) => {
          const [k, ...rest] = line.split(':');
          return `<div style="display: flex; justify-content: space-between; padding: 4px 0; border-bottom: 1px dashed rgba(150,150,150,0.2); font-size: ${Math.max(11, el.fontSize - 1)}px;">
          <span style="font-weight: 700; color: ${el.borderColor};">${(k || '').trim()}</span>
          <span>${rest.join(':').trim()}</span>
        </div>`;
        })
        .join('');
      return `<div class="${classes}" style="${baseStyle}">
      <div style="font-weight: 700; margin-bottom: 6px; letter-spacing: 0.05em; font-size: ${el.fontSize}px;">${el.content}</div>
      <div>${rowsHtml}</div>
    </div>`;
    }

    case 'moodboard':
      return renderMoodboardHTML(el, baseStyle, classes);

    case 'rpg_stats': {
      const stats = (el.subContent || 'STR: 12\nDEX: 18\nCON: 14\nINT: 16\nWIS: 15\nCHA: 13')
        .split('\n')
        .filter(Boolean);
      return `<div class="${classes}" style="${baseStyle}">
      <div style="font-size: 11px; font-weight: 700; margin-bottom: 8px; letter-spacing: 0.06em;">${el.content}</div>
      <div style="display: grid; grid-template-columns: repeat(3, 1fr); gap: 6px;">
        ${stats
          .map((s) => {
            const [lbl, val] = s.split(':');
            return `<div style="background: rgba(0,0,0,0.2); border: 1px solid ${el.borderColor}; border-radius: 5px; padding: 6px; text-align: center;">
            <div style="font-size: 9px; font-weight: 700; opacity: 0.75;">${(lbl || 'STAT').trim()}</div>
            <div style="font-size: 14px; font-weight: 700; color: ${el.borderColor};">${(val || '10').trim()}</div>
          </div>`;
          })
          .join('')}
      </div>
    </div>`;
    }

    case 'cassette_player': {
      return `<div class="${classes}" style="${baseStyle}">
      <div style="border: 2px solid ${el.borderColor}; border-radius: 6px; padding: 8px; background: rgba(0,0,0,0.2);">
        <div style="font-size: 10px; font-weight: 700; letter-spacing: 0.08em; border-bottom: 1px solid ${el.borderColor}; padding-bottom: 3px; margin-bottom: 8px; display: flex; justify-content: space-between;">
          <span>SIDE A // MIXTAPE</span>
          <span>90 MIN</span>
        </div>
        <div style="display: flex; justify-content: space-around; align-items: center; py: 4px; background: rgba(0,0,0,0.35); border-radius: 999px; padding: 6px 14px;">
          <div class="${isToyhouse ? 'fa-spin' : 'dbx-anim-spin'}" style="width: 24px; height: 24px; border-radius: 50%; border: 3px dashed ${el.borderColor};"></div>
          <div style="font-size: 11px; font-weight: 700;">${el.content}</div>
          <div class="${isToyhouse ? 'fa-spin' : 'dbx-anim-spin'}" style="width: 24px; height: 24px; border-radius: 50%; border: 3px dashed ${el.borderColor};"></div>
        </div>
        <div style="font-size: 10px; opacity: 0.75; margin-top: 6px; text-align: center;">${el.subContent || 'Click to listen on YouTube / Spotify'}</div>
      </div>
    </div>`;
    }

    case 'social_links': {
      const links = (el.subContent || 'Toyhouse | https://toyhou.se\nCarrd | https://carrd.co\nVGen | https://vgen.co\nTwitter | https://x.com')
        .split('\n')
        .filter(Boolean);
      const wrapStyle = isToyhouse
        ? `display: flex; flex-wrap: wrap; margin: -3px; justify-content: ${el.textAlign === 'center' ? 'center' : 'flex-start'};`
        : `display: flex; flex-wrap: wrap; gap: 6px; justify-content: ${el.textAlign === 'center' ? 'center' : 'flex-start'};`;
      const pillMargin = isToyhouse ? 'margin: 3px; ' : '';
      return `<div class="${classes}" style="${baseStyle}">
      <div style="font-size: 11px; font-weight: 700; margin-bottom: 8px;">${el.content}</div>
      <div style="${wrapStyle}">
        ${links
          .map((item) => {
            const [label, href] = item.split('|');
            return `<a href="${(href || '#').trim()}" target="_blank" style="${pillMargin}padding: 5px 12px; border-radius: 999px; background: ${el.borderColor}; color: #fff; text-decoration: none; font-size: 11px; font-weight: 700;">${(label || 'Link').trim()} ↗</a>`;
          })
          .join('')}
      </div>
    </div>`;
    }

    case 'washi_tape': {
      return `<div class="${classes}" style="${baseStyle}; background: repeating-linear-gradient(45deg, ${el.bgColor}, ${el.bgColor} 6px, ${el.borderColor} 6px, ${el.borderColor} 12px); opacity: 0.85; display: flex; align-items: center; justify-content: center; font-size: 10px; font-weight: 700; letter-spacing: 0.1em;">
      <span>${el.content}</span>
    </div>`;
    }

    case 'lace_divider': {
      const dividerFontCss = `font-family: ${el.googleFont ? `'${el.googleFont}', ` : ''}${getFontFamilyCSS(el.fontFamily)};`;
      return `<div class="${classes}" style="width: 100%; height: 100%; box-sizing: border-box; display: flex; align-items: center; justify-content: center; padding: ${el.padding}px 0; text-align: center; color: ${el.borderColor}; font-size: ${el.fontSize}px; ${dividerFontCss} letter-spacing: 6px; user-select: none; ${rotationCss}; ${opacityCss};">
      <span>${el.content || '─── ･ ｡ﾟ☆: *.☽ .* :☆ﾟ. ───'}</span>
    </div>`;
    }

    case 'folder_header': {
      return `<div class="${classes}" style="height: 100%; display: flex; flex-direction: column; ${rotationCss}; ${opacityCss};">
      <div style="display: inline-block; width: fit-content; padding: 4px 14px; background: ${el.borderColor}; color: #fff; border-radius: 6px 6px 0 0; font-size: 10px; font-weight: 700; letter-spacing: 0.06em;">📁 ${el.content}</div>
      <div style="${baseStyle}; position: relative; top: auto; right: auto; bottom: auto; left: auto; transform: none; opacity: 1; border-top-left-radius: 0; flex: 1;">
        <div style="font-size: ${el.fontSize}px; opacity: 0.9; white-space: pre-line;">${el.subContent || 'Folder contents and archival records.'}</div>
      </div>
    </div>`;
    }

    case 'dni_warning': {
      return `<div class="${classes}" style="${baseStyle}; border-left: 5px solid ${el.borderColor};">
      <div style="display: flex; align-items: center; gap: 6px; font-weight: 700; color: ${el.borderColor}; margin-bottom: 4px;">
        <span>⚠</span>
        <span>${el.content}</span>
      </div>
      <div style="font-size: ${Math.max(11, el.fontSize - 1)}px; opacity: 0.88; white-space: pre-line;">${el.subContent || 'Please read boundary notes before interacting.'}</div>
    </div>`;
    }

    case 'music_player': {
      return `<div class="${classes}" style="${baseStyle}; flex-direction: row; align-items: center; gap: 12px;">
      <div class="dbx-anim-spin" style="width: 42px; height: 42px; border-radius: 999px; background: radial-gradient(circle, ${el.borderColor} 22%, #111 25%, #222 60%, #090909 100%); border: 2px solid ${el.borderColor}; flex-shrink: 0;"></div>
      <div style="flex: 1; min-width: 0; text-align: left;">
        <div style="font-weight: 700; font-size: ${el.fontSize}px; white-space: nowrap; overflow: hidden; text-overflow: ellipsis;">♫ ${el.content}</div>
        <div style="font-size: ${Math.max(10, el.fontSize - 2)}px; opacity: 0.75;">${el.subContent || 'Character Theme Track'}</div>
      </div>
      <a href="${el.url || 'https://youtube.com'}" target="_blank" style="padding: 6px 10px; border-radius: 6px; background: ${el.borderColor}; color: #fff; text-decoration: none; font-size: 11px; font-weight: 700;">▶ PLAY</a>
    </div>`;
    }

    case 'relation_card': {
      const heartsCount = Math.max(1, Math.min(5, el.relationHearts || 4));
      const heartsStr = '♥'.repeat(heartsCount) + '♡'.repeat(5 - heartsCount);
      return `<div class="${classes}" style="${baseStyle}; flex-direction: row; align-items: center; gap: 12px;">
      <img src="${el.url || 'https://images.unsplash.com/photo-1518709268805-4e9042af9f23?w=200&auto=format&fit=crop&q=80'}" alt="${el.content}" style="width: 56px; height: 56px; border-radius: 50%; object-fit: cover; border: 2px solid ${el.borderColor}; flex-shrink: 0;" />
      <div style="flex: 1; text-align: left;">
        <div style="display: flex; justify-content: space-between; align-items: center;">
          <span style="font-weight: 700;">${el.content}</span>
          <span style="color: ${el.borderColor}; letter-spacing: 2px; font-size: 12px;">${heartsStr}</span>
        </div>
        <div style="font-size: ${Math.max(11, el.fontSize - 2)}px; opacity: 0.82; margin-top: 3px;">${el.subContent || 'Close Ally / Childhood Friend'}</div>
      </div>
    </div>`;
    }

    case 'palette_strip': {
      const cols =
        el.paletteColors && el.paletteColors.length > 0
          ? el.paletteColors
          : ['#2C2A28', '#C86D51', '#D4A373', '#7A9A82', '#F7F5F0'];
      const swatchesHtml = cols
        .map(
          (hex) =>
            `<div style="flex: 1; height: 34px; background: ${hex}; border-radius: 4px; border: 1px solid rgba(255,255,255,0.18);" title="${hex}"></div>`
        )
        .join('');
      return `<div class="${classes}" style="${baseStyle}">
      <div style="font-size: 11px; font-weight: 700; margin-bottom: 6px; letter-spacing: 0.05em;">${el.content}</div>
      <div style="display: flex; gap: 6px;">${swatchesHtml}</div>
    </div>`;
    }

    case 'accordion': {
      return `<details class="${classes}" style="${baseStyle}; cursor: pointer;">
      <summary style="font-weight: 700; outline: none;">${el.content}</summary>
      <div style="margin-top: 8px; padding-top: 8px; border-top: 1px dashed ${el.borderColor}; font-size: ${Math.max(11, el.fontSize - 1)}px; white-space: pre-line; opacity: 0.88;">${el.subContent || 'Hidden spoiler or extended lore notes.'}</div>
    </details>`;
    }

    case 'sticker': {
      return `<div class="${classes}" style="${baseStyle}; flex-direction: row; align-items: center; justify-content: center; gap: 6px; user-select: none;">
      <span style="font-size: ${el.fontSize + 6}px;">${el.stickerIcon || '✦'}</span>
      ${el.content ? `<span style="font-weight: 700;">${el.content}</span>` : ''}
    </div>`;
    }

    case 'custom_widget': {
      let interpolated =
        el.customHtml ||
        `<div style="display:flex;align-items:center;justify-content:space-between;gap:10px;">
  <div>
    <div style="font-weight:700;color:{{accent}};">{{title}}</div>
    <div style="font-size:11px;opacity:0.8;margin-top:3px;">{{subtitle}}</div>
  </div>
</div>`;

      interpolated = interpolated
        .replace(/\{\{title\}\}/g, el.content || '')
        .replace(/\{\{subtitle\}\}/g, el.subContent || '')
        .replace(
          /\{\{image\}\}/g,
          el.url ||
            'https://images.unsplash.com/photo-1579783902614-a3fb3927b675?w=300&auto=format&fit=crop&q=80'
        )
        .replace(/\{\{link\}\}/g, el.url || '#')
        .replace(/\{\{accent\}\}/g, el.borderColor || '#C86D51')
        .replace(/\{\{text\}\}/g, el.textColor || '#2C2A28')
        .replace(/\{\{bg\}\}/g, el.bgColor || '#F7F5F0');

      // Interpolate any user-defined Custom Props (e.g. {{level}}, {{rank}}, {{badge}})
      if (el.customProps) {
        for (const [k, v] of Object.entries(el.customProps)) {
          interpolated = interpolated.replace(new RegExp(`\\{\\{${k}\\}\\}`, 'g'), v);
        }
      }

      return `<div class="${classes}" style="${baseStyle}">
      ${interpolated}${nestedChildrenHTML}
    </div>`;
    }

    case 'image': {
      const activeShape = el.imageShape || el.boxClipShape;
      const isCircle = activeShape === 'circle';
      const clipPath = !isToyhouseFree ? getImageClipPath(activeShape, el.shapeCutPx) : 'none';
      const geoImgMaskHtml =
        isToyhouseFree && isF2UGeometricShape(activeShape)
          ? `<div style="position: absolute; top: 0; right: 0; bottom: 0; left: 0; z-index: 5; ${buildF2UCornerMaskOverlayCss(
              activeShape,
              hasImgGeoBorder ? el.borderColor : el.shapeMaskBgColor || '#FAF8F5',
              el.shapeCutPx
            )}"></div>`
          : '';
      const shapeRadiusOverride = getShapeBorderRadiusOverride(activeShape);
      const isPolaroid = el.frameStyle === 'polaroid' || activeShape === 'polaroid';
      const isFilmstrip = el.frameStyle === 'filmstrip';
      const isStamp = el.frameStyle === 'stamp';
      const isTape = el.frameStyle === 'tape';
      const isTorn = el.frameStyle === 'torn';
      const isVintageGold = el.frameStyle === 'vintage_gold';
      const isNotebook = el.frameStyle === 'notebook';
      const filterCss = getImageFilterCSS(el);
      const borderRadiusCss = shapeRadiusOverride || getBorderRadiusCSS(el);

      const panX = el.panX ?? 50;
      const panY = el.panY ?? 50;
      const zoom = (el.imgZoom ?? 100) / 100;
      const scaleX = el.flipH ? -1 : 1;
      const scaleY = el.flipV ? -1 : 1;
      const rot = el.imgRotation ?? 0;
      const blendModeCss = el.blendMode && el.blendMode !== 'normal' ? `mix-blend-mode: ${el.blendMode};` : '';

      // Image transform with pan origin, zoom, flips, and rotation
      const imgTransform = `transform: scale(${zoom}) scaleX(${scaleX}) scaleY(${scaleY}) rotate(${rot}deg); transform-origin: ${panX}% ${panY}%; object-position: ${panX}% ${panY}%;`;

      let frameWrapperStyle = '';
      if (isPolaroid) {
        frameWrapperStyle = `padding: 10px 10px 28px 10px; background: #FAF8F5; color: #222; ${el.shadow !== 'none' ? 'box-shadow: 0 4px 16px rgba(0,0,0,0.12);' : ''}`;
      } else if (isFilmstrip) {
        frameWrapperStyle = `padding: 12px 10px; background: #161514; color: #FAF8F5; border-top: 5px dotted #777; border-bottom: 5px dotted #777; ${el.shadow !== 'none' ? 'box-shadow: 0 4px 14px rgba(0,0,0,0.3);' : ''}`;
      } else if (isStamp) {
        frameWrapperStyle = `padding: 8px; background: #FAF8F5; outline: 3px dashed ${el.borderColor || '#C86D51'}; outline-offset: -4px; ${el.shadow !== 'none' ? 'box-shadow: 0 3px 10px rgba(0,0,0,0.1);' : ''}`;
      } else if (isTape) {
        frameWrapperStyle = 'padding: 6px; position: relative;';
      } else if (isTorn) {
        frameWrapperStyle = `padding: 6px; ${el.shadow !== 'none' ? 'box-shadow: 0 2px 8px rgba(0,0,0,0.15); filter: drop-shadow(0 2px 4px rgba(0,0,0,0.2));' : ''}`;
      } else if (isVintageGold) {
        frameWrapperStyle = `padding: 9px; background-color: #C79C34; border: 4px ridge #F0D67B; box-shadow: inset 0 0 0 2px #6B4D12${el.shadow !== 'none' ? ', 0 4px 14px rgba(0,0,0,0.28)' : ''};`;
      } else if (isNotebook) {
        frameWrapperStyle = `padding: 8px 10px 10px 20px; background: #FFFDF8; color: #2B2826; border-left: 4px double #D96B6B; border-bottom: 2px dashed rgba(130,120,105,0.35); ${el.shadow !== 'none' ? 'box-shadow: 0 3px 10px rgba(0,0,0,0.08);' : ''}`;
      }

      const tapeDecorations = isTape
        ? `<div style="position: absolute; top: -6px; left: 14px; width: 38px; height: 14px; background: rgba(235, 222, 195, 0.82); transform: rotate(-7deg); z-index: 6; pointer-events: none; border-left: 2px dashed rgba(180,160,130,0.4); border-right: 2px dashed rgba(180,160,130,0.4); box-shadow: 0 1px 3px rgba(0,0,0,0.12);"></div>
           <div style="position: absolute; top: -6px; right: 14px; width: 38px; height: 14px; background: rgba(235, 222, 195, 0.82); transform: rotate(8deg); z-index: 6; pointer-events: none; border-left: 2px dashed rgba(180,160,130,0.4); border-right: 2px dashed rgba(180,160,130,0.4); box-shadow: 0 1px 3px rgba(0,0,0,0.12);"></div>`
        : '';

      const overlayHtml =
        el.overlayColor && (el.overlayOpacity ?? 0) > 0
          ? `<div style="position: absolute; top: 0; right: 0; bottom: 0; left: 0; background: ${el.overlayColor}; opacity: ${(el.overlayOpacity ?? 0) / 100}; pointer-events: none; border-radius: inherit; z-index: 4;"></div>`
          : '';

      const primaryImgSrc = el.url || 'https://images.unsplash.com/photo-1579783902614-a3fb3927b675?w=500&auto=format&fit=crop&q=80';
      const hasHoverSwap = el.hoverAction === 'swap_image' && Boolean(el.hoverImageUrl);

      const useF2UBg = el.imageRenderMode !== 'native_img';
      const zoomPct = Math.round(zoom * 100);

      let bgSize = 'cover';
      if (el.objectFit === 'contain') {
        bgSize = 'contain';
      } else if (zoom > 1) {
        if (el.zoomAxis === 'height') {
          bgSize = `auto ${zoomPct}%`;
        } else if (el.zoomAxis === 'width') {
          bgSize = `${zoomPct}% auto`;
        } else if (el.zoomAxis === 'fill') {
          bgSize = `${zoomPct}% ${zoomPct}%`;
        } else {
          // Smart default: If vertical pan is customized (panY !== 50) or container is square/portrait,
          // prioritize height scale so Focal Y has full vertical panning travel on Toyhouse!
          if (panY !== 50 || el.height >= el.width) {
            bgSize = `auto ${zoomPct}%`;
          } else {
            bgSize = `${zoomPct}% auto`;
          }
        }
      }

      const bgPosition = `${panX}% ${panY}%`;

      const effImgW = el.parentId ? (el.childCustomWidth || el.width) : el.width;
      const effImgH = el.parentId ? (el.childCustomHeight || el.height) : el.height;
      const circleSize = Math.max(16, Math.min(effImgW, effImgH) - (el.padding || 0) * 2 - (el.borderWidth || 0) * 2);
      const circleBoxSizeCss = isCircle
        ? Math.abs(effImgW - effImgH) <= 2
          ? 'width: 100%; height: 100%;'
          : `width: ${circleSize}px; height: ${circleSize}px; max-width: 100%; max-height: 100%; flex-shrink: 0;`
        : 'width: 100%; height: 100%;';
      const activeClipCss = clipPath !== 'none' && !isCircle ? `clip-path: ${clipPath};` : '';
      const imgCoreStyle = `width: 100%; height: 100%; max-height: 100%; object-fit: ${el.objectFit || 'cover'}; border-radius: ${borderRadiusCss}; ${activeClipCss} ${filterCss}; ${blendModeCss} ${imgTransform} transition: transform 0.3s ease, opacity 0.3s ease;`;

      let imgContentHtml = '';
      if (useF2UBg) {
        const faImgRotateClass = isToyhouse ? getFontAwesomeRotationClass(rot) : '';
        const faImgFlipClass = isToyhouse ? getFontAwesomeFlipClass(el.flipH, el.flipV) : '';
        const bgTransformParts: string[] = [];
        if (rot && !faImgRotateClass) bgTransformParts.push(`rotate(${rot}deg)`);
        if (!faImgFlipClass) {
          if (el.flipH) bgTransformParts.push('scaleX(-1)');
          if (el.flipV) bgTransformParts.push('scaleY(-1)');
        }
        const bgTransformCss =
          bgTransformParts.length > 0 ? `transform: ${bgTransformParts.join(' ')};` : '';
        const bgCoreStyle = `width: 100%; height: 100%; background-image: url('${primaryImgSrc}'); background-position: ${bgPosition}; background-size: ${bgSize}; background-repeat: no-repeat; border-radius: ${borderRadiusCss}; ${activeClipCss} ${filterCss}; ${blendModeCss} ${bgTransformCss} transition: opacity 0.3s ease;`;
        const swapBgStyle = hasHoverSwap ? `width: 100%; height: 100%; background-image: url('${el.hoverImageUrl}'); background-position: ${bgPosition}; background-size: ${bgSize}; background-repeat: no-repeat; border-radius: ${borderRadiusCss}; ${activeClipCss} ${filterCss}; ${blendModeCss} ${bgTransformCss} position: absolute; top: 0; right: 0; bottom: 0; left: 0; opacity: 0; transition: opacity 0.3s ease;` : '';

        let bgInner = `
          <div class="${hasHoverSwap ? 'dbx-img-primary-swap' : ''}" style="${bgCoreStyle}"></div>
          ${hasHoverSwap ? `<div class="dbx-img-swap" style="${swapBgStyle}"></div>` : ''}`;
        if (faImgRotateClass) {
          bgInner = `<div class="${faImgRotateClass}" style="width: 100%; height: 100%; position: relative;">${bgInner}</div>`;
        }
        if (faImgFlipClass) {
          bgInner = `<div class="${faImgFlipClass}" style="width: 100%; height: 100%; position: relative;">${bgInner}</div>`;
        }

        imgContentHtml = `
        <div style="position: relative; ${circleBoxSizeCss} overflow: hidden; border-radius: ${borderRadiusCss};">
          ${bgInner}
          ${overlayHtml}
          ${geoImgMaskHtml}
        </div>
      `;
      } else {
        imgContentHtml = `
        <div style="position: relative; ${circleBoxSizeCss} overflow: hidden; border-radius: ${borderRadiusCss}; display: flex; align-items: center; justify-content: center;">
          <img class="${hasHoverSwap ? 'dbx-img-primary-swap' : ''}" src="${primaryImgSrc}" alt="${el.content}" style="${imgCoreStyle}" />
          ${hasHoverSwap ? `<img class="dbx-img-swap" src="${el.hoverImageUrl}" alt="${el.content}" style="${imgCoreStyle} position: absolute; top: 0; right: 0; bottom: 0; left: 0; opacity: 0;" />` : ''}
          ${overlayHtml}
          ${geoImgMaskHtml}
        </div>
      `;
      }

      if (isPolaroid) {
        imgContentHtml += `<div style="margin-top: 6px; font-size: 11px; font-weight: 700; color: #222; text-align: center; letter-spacing: 0.04em;">${el.content}</div>`;
      }

      // Handle Click Lightbox or Link
      let finalWrappedInner = imgContentHtml;
      if (el.clickAction === 'link') {
        finalWrappedInner = `<a href="${el.linkUrl || primaryImgSrc}" target="_blank" rel="noopener noreferrer" style="width: 100%; height: 100%; display: flex; flex-direction: column; align-items: center; justify-content: center; text-decoration: none; color: inherit; cursor: pointer;">${imgContentHtml}</a>`;
      } else if (el.clickAction === 'lightbox') {
        finalWrappedInner = `
          <details class="dbx-lightbox-details" style="width: 100%; height: 100%;">
            <summary style="width: 100%; height: 100%; display: flex; flex-direction: column; align-items: center; justify-content: center; cursor: zoom-in; list-style: none;">
              ${imgContentHtml}
            </summary>
            <div style="position: fixed; top: 0; right: 0; bottom: 0; left: 0; z-index: 999999; background: rgba(14,13,12,0.88); backdrop-filter: blur(5px); display: flex; flex-direction: column; align-items: center; justify-content: center; padding: 24px; cursor: zoom-out;" onclick="this.parentElement.removeAttribute('open')">
              <img src="${primaryImgSrc}" alt="${el.content}" style="max-width: 90vw; max-height: 84vh; object-fit: contain; border-radius: 8px; box-shadow: 0 16px 48px rgba(0,0,0,0.7);" />
              ${el.content ? `<div style="color: #fff; margin-top: 10px; font-size: 13px; font-weight: 600;">${el.content}</div>` : ''}
              <div style="color: rgba(255,255,255,0.6); font-size: 11px; margin-top: 4px;">Click anywhere to dismiss</div>
            </div>
          </details>
        `;
      }

      const bgFillStyle = el.asBackgroundFill
        ? 'position: absolute; top: 0; right: 0; bottom: 0; left: 0; width: 100%; height: 100%; z-index: 0;'
        : '';

      const imgPosCss = isFreeformFixed && !el.autoHeight ? '' : 'position: relative;';

      return `<div class="${classes} dbx-img-wrapper ${el.hoverAction === 'zoom' ? 'dbx-img-zoom-hover' : ''}" style="${baseStyle}; ${bgFillStyle} ${frameWrapperStyle} align-items: center; justify-content: center; ${imgPosCss}">
      ${tapeDecorations}
      ${finalWrappedInner}
    </div>`;
    }

    case 'button': {
      const btnCls = `${classes} ${isToyhouse ? (isFreeformFixed && !el.autoHeight ? 'btn' : 'btn btn-block') : ''}`;
      if (isBoxF2UGeo && hasUniformBorder && (!hasCustomBgSurface || isToyhouseFree)) {
        const innerBtnBg = buildF2UQuadrantSurfaceCss(
          effectiveBoxShape!,
          el.bgColor && el.bgColor !== 'transparent' ? el.bgColor : el.shapeMaskBgColor || '#FAF8F5',
          el.shapeCutPx
        );
        return `<a href="${el.url || '#'}" class="${btnCls}" style="${baseStyle}; ${buildF2UQuadrantSurfaceCss(effectiveBoxShape!, el.borderColor, el.shapeCutPx)}; padding: ${Math.max(1, el.borderWidth)}px; text-decoration: none; ${isFreeformFixed && !el.autoHeight ? '' : 'width: 100%; '}cursor: pointer;">
      <span style="width: 100%; height: 100%; flex: 1; display: flex; flex-direction: row; align-items: center; justify-content: center; box-sizing: border-box; ${getPaddingCSS(el)}; ${innerBtnBg}">${el.content}</span>
    </a>`;
      }
      return `<a href="${el.url || '#'}" class="${btnCls}" style="${baseStyle}; flex-direction: row; align-items: center; justify-content: center; text-decoration: none; ${isFreeformFixed && !el.autoHeight ? '' : 'width: 100%; '}cursor: pointer;">
      <span>${el.content}</span>
    </a>`;
    }

    case 'stat_bar': {
      const pct = Math.max(0, Math.min(100, parseInt(el.subContent || '75', 10) || 75));
      return `<div class="${classes}" style="${baseStyle}">
      <div style="display: flex; justify-content: space-between; margin-bottom: 6px; font-size: ${Math.max(11, el.fontSize - 2)}px;">
        <span>${el.content}</span>
        <span style="opacity: 0.8;">${pct}%</span>
      </div>
      <div style="width: 100%; height: 8px; background: rgba(150,150,150,0.2); border-radius: 999px; overflow: hidden;">
        <div style="width: ${pct}%; height: 100%; background: ${el.borderColor !== 'transparent' ? el.borderColor : '#C86D51'}; border-radius: 999px;"></div>
      </div>
    </div>`;
    }

    case 'badge':
      return `<div class="${classes}" style="${baseStyle}; flex-direction: row; align-items: center; justify-content: center; ${isToyhouse ? '' : 'gap: 6px; '}${isFreeformFixed && !el.autoHeight ? '' : 'width: 100%;'}">
      <span style="width: 7px; height: 7px; border-radius: 999px; background: ${el.textColor}; display: inline-block;${isToyhouse ? ' margin-right: 6px;' : ''}"></span>
      <span>${el.content}</span>
    </div>`;

    case 'divider':
      return `<div class="${classes}" style="width: 100%; height: 100%; box-sizing: border-box; padding: ${el.padding}px 0; display: flex; align-items: center; ${rotationCss}; ${opacityCss};">
      <hr style="width: 100%; border: 0; border-top: ${Math.max(1, el.borderWidth)}px ${el.borderStyle || 'solid'} ${el.borderColor}; margin: 0;" />
    </div>`;

    case 'inventory': {
      const defaultSlots = [
        { name: 'Brass Astrolabe', count: 1, rarity: 'epic' as const, icon: '🧭' },
        { name: 'Star-Chart Map', count: 1, rarity: 'rare' as const, icon: '📜' },
        { name: 'Crystal Prism', count: 4, rarity: 'rare' as const, icon: '💎' },
        { name: 'Lapis Ink Bottle', count: 2, rarity: 'common' as const, icon: '🧪' },
        { name: 'Rift Key #07', count: 1, rarity: 'legendary' as const, icon: '🗝' },
        { name: 'Empty Slot', count: 0, rarity: 'common' as const, icon: '✦' },
      ];
      const items = (el.inventoryItems && el.inventoryItems.length > 0)
        ? el.inventoryItems
        : el.subContent
        ? el.subContent.split('\n').filter(Boolean).map((line, i) => {
            const parts = line.split('|').map((s) => s.trim());
            return {
              id: `inv-${i}`,
              name: parts[0] || 'Item',
              count: parseInt(parts[1] || '1', 10) || 1,
              rarity: (parts[2] as 'common' | 'rare' | 'epic' | 'legendary') || 'common',
              icon: parts[3] || '✦',
            };
          })
        : defaultSlots;

      const rarityColors: Record<string, string> = {
        common: '#8C827A',
        rare: '#3B82F6',
        epic: '#A855F7',
        legendary: '#F59E0B',
      };

      const slotHtml = items
        .map((item) => {
          const borderRarity = rarityColors[item.rarity || 'common'] || el.borderColor;
          return `        <div style="background: rgba(0,0,0,0.12); border: 1px solid ${borderRarity}; border-radius: 6px; padding: 6px 8px; display: flex; align-items: center; justify-content: space-between; gap: 6px; min-width: 0;">
          <div style="display: flex; align-items: center; gap: 6px; min-width: 0; overflow: hidden;">
            <span style="font-size: 13px; shrink: 0;">${item.icon || '✦'}</span>
            <span style="font-size: 11px; font-weight: 500; text-overflow: ellipsis; overflow: hidden; white-space: nowrap;">${item.name}</span>
          </div>
          ${item.count && item.count > 1 ? `<span style="font-size: 9px; font-family: monospace; font-weight: 700; background: ${el.borderColor}; color: #fff; padding: 1px 4px; border-radius: 4px;">x${item.count}</span>` : ''}
        </div>`;
        })
        .join('\n');

      return `<div class="${classes}" style="${baseStyle}">
      <div style="display: flex; align-items: center; justify-content: space-between; margin-bottom: 8px; border-bottom: 1px solid ${el.borderColor}; padding-bottom: 4px;">
        <span style="font-weight: 700; font-size: 12px; letter-spacing: 0.5px;">${el.content || 'EQUIPMENT & SATCHEL'}</span>
        <span style="font-size: 10px; font-family: monospace; opacity: 0.7;">CAP: ${items.length} SLOTS</span>
      </div>
      <div style="display: grid; grid-template-columns: repeat(auto-fill, minmax(130px, 1fr)); gap: 6px; flex: 1;">
${slotHtml}
      </div>${nestedChildrenHTML}
    </div>`;
    }

    case 'timeline': {
      const defaultMilestones = [
        { year: 'AGE 07', title: 'The Great Tidal Eclipse', desc: 'Discovered the first resonant brass gear washed up on the rocky shores.' },
        { year: 'AGE 14', title: 'Oak Observatory', desc: 'Apprenticed under Grand Astrologer Vance; mapped 12 new constellations.' },
        { year: 'AGE 21', title: 'The Void Rift Incident', desc: 'The astrolabe shattered during the midnight alignment, opening the northern rift.' },
      ];
      const milestones = (el.timelineMilestones && el.timelineMilestones.length > 0)
        ? el.timelineMilestones
        : el.subContent
        ? el.subContent.split('\n\n').filter(Boolean).map((block, i) => {
            const lines = block.split('\n');
            const [year, title] = (lines[0] || '').split('|').map((s) => s.trim());
            return {
              id: `tm-${i}`,
              year: year || 'ERA',
              title: title || 'Milestone',
              description: lines.slice(1).join(' ') || '',
            };
          })
        : defaultMilestones.map((m, i) => ({ id: `tm-${i}`, year: m.year, title: m.title, description: m.desc }));

      const nodesHtml = milestones
        .map((m, idx) => {
          const isLast = idx === milestones.length - 1;
          return `        <div style="display: flex; gap: 10px; position: relative;">
          <div style="display: flex; flex-direction: column; align-items: center;">
            <div style="width: 10px; height: 10px; border-radius: 50%; background: ${el.borderColor}; box-shadow: 0 0 0 3px rgba(200,109,81,0.2); shrink: 0;"></div>
            ${!isLast ? `<div style="width: 2px; flex: 1; background: ${el.borderColor}; opacity: 0.35; margin: 2px 0;"></div>` : ''}
          </div>
          <div style="padding-bottom: ${isLast ? '0' : '10px'}; flex: 1;">
            <div style="display: flex; align-items: center; gap: 6px;">
              <span style="font-family: monospace; font-size: 10px; font-weight: 700; color: ${el.borderColor};">${m.year}</span>
              <span style="font-size: 11px; font-weight: 700;">${m.title}</span>
            </div>
            ${m.description ? `<div style="font-size: 10.5px; opacity: 0.85; margin-top: 2px; line-height: 1.4;">${m.description}</div>` : ''}
          </div>
        </div>`;
        })
        .join('\n');

      return `<div class="${classes}" style="${baseStyle}">
      <div style="font-weight: 700; margin-bottom: 8px; border-bottom: 1px solid ${el.borderColor}; padding-bottom: 4px; font-size: 12px; letter-spacing: 0.5px;">${el.content || 'CHRONOLOGICAL TIMELINE'}</div>
      <div style="display: flex; flex-direction: column; flex: 1;">
${nodesHtml}
      </div>${nestedChildrenHTML}
    </div>`;
    }

    case 'relationship_tree': {
      const defaultNodes = [
        { name: 'Captain Kaelen', role: 'Flagship Commander', relationType: 'ally' as const, avatarUrl: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80', desc: 'Trusts his strategic judgment implicitly.' },
        { name: 'Vance the Astrologer', role: 'Former Mentor', relationType: 'mentor' as const, avatarUrl: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150&auto=format&fit=crop&q=80', desc: 'Taught Elara how to calculate astral coordinates.' },
        { name: 'Sylas of the Rift', role: 'Rival Cartographer', relationType: 'rival' as const, avatarUrl: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=150&auto=format&fit=crop&q=80', desc: 'Competing to map the anomalous islands first.' },
      ];

      const typeLabels: Record<string, { label: string; color: string }> = {
        ally: { label: 'ALLY', color: '#10B981' },
        rival: { label: 'RIVAL', color: '#EF4444' },
        family: { label: 'FAMILY', color: '#3B82F6' },
        romance: { label: 'BOND', color: '#EC4899' },
        mentor: { label: 'MENTOR', color: '#F59E0B' },
      };

      const nodes = (el.relationNodes && el.relationNodes.length > 0)
        ? el.relationNodes
        : defaultNodes.map((n, i) => ({ id: `rel-${i}`, ...n }));

      const nodesHtml = nodes
        .map((node) => {
          const meta = typeLabels[node.relationType] || {
            label: node.relationType.toUpperCase(),
            color: el.borderColor,
          };
          return `        <div style="background: rgba(0,0,0,0.12); border: 1px solid ${el.borderColor}; border-radius: 8px; padding: 8px; display: flex; gap: 8px; align-items: center;">
          ${node.avatarUrl ? `<img src="${node.avatarUrl}" style="width: 38px; height: 38px; border-radius: 6px; object-fit: cover; border: 1px solid ${meta.color}; shrink: 0;" />` : ''}
          <div style="flex: 1; min-width: 0;">
            <div style="display: flex; align-items: center; justify-content: space-between; gap: 4px;">
              <span style="font-weight: 700; font-size: 11px; text-overflow: ellipsis; overflow: hidden; white-space: nowrap;">${node.name}</span>
              <span style="font-size: 8px; font-family: monospace; font-weight: 700; color: #fff; background: ${meta.color}; padding: 1px 4px; border-radius: 3px;">${meta.label}</span>
            </div>
            <div style="font-size: 9.5px; opacity: 0.75; font-style: italic;">${node.role}</div>
            ${node.desc ? `<div style="font-size: 10px; opacity: 0.9; margin-top: 2px;">${node.desc}</div>` : ''}
          </div>
        </div>`;
        })
        .join('\n');

      return `<div class="${classes}" style="${baseStyle}">
      <div style="font-weight: 700; margin-bottom: 8px; border-bottom: 1px solid ${el.borderColor}; padding-bottom: 4px; font-size: 12px; letter-spacing: 0.5px;">${el.content || 'CHARACTER RELATION BINDINGS'}</div>
      <div style="display: grid; grid-template-columns: repeat(auto-fill, minmax(180px, 1fr)); gap: 8px; flex: 1;">
${nodesHtml}
      </div>${nestedChildrenHTML}
    </div>`;
    }

    case 'pagedoll': {
      const faAnim = getFontAwesomeAnimClass(el.idleAnimation || 'bounce') || 'fa-bounce';
      const animDur = el.animDuration || 2;
      const pagedollCore = `<div class="${faAnim}" style="background-image: url('${el.url || 'https://f2.toyhou.se/file/f2-toyhou-se/images/95980873_yi08DhLhBhCs6yr.png'}'); height: 100%; width: 100%; min-height: ${isFreeformFixed ? 0 : 120}px; background-size: contain; background-position: center; background-repeat: no-repeat; animation-duration: ${animDur}s;"></div>`;
      if (faRotateClass || rotationCss) {
        return `<div class="${faRotateClass}" style="width: 100%; height: ${isFreeformFixed ? '100%' : `${el.height}px`}; ${rotationCss}; ${opacityCss};">${pagedollCore}</div>`;
      }
      return `<div style="width: 100%; height: ${isFreeformFixed ? '100%' : `${el.height}px`}; ${opacityCss};">${pagedollCore}</div>`;
    }

    case 'fa_watermark': {
      const iconClass = el.faIcon || el.content || 'fa-light fa-moon-stars';
      const iconSize = el.fontSize || 70;
      const op = el.opacity !== undefined ? (el.opacity / 100).toFixed(2) : '0.55';
      const anchor = el.watermarkAnchor || 'center';
      const alignX =
        anchor === 'top_left' || anchor === 'bottom_left' || (!el.watermarkAnchor && el.textAlign === 'left')
          ? 'flex-start'
          : anchor === 'top_right' || anchor === 'bottom_right' || (!el.watermarkAnchor && el.textAlign === 'right')
          ? 'flex-end'
          : 'center';
      const alignY =
        anchor === 'top_left' || anchor === 'top_right' || (!el.watermarkAnchor && el.verticalAlign === 'top')
          ? 'flex-start'
          : anchor === 'bottom_left' || anchor === 'bottom_right' || (!el.watermarkAnchor && el.verticalAlign === 'bottom')
          ? 'flex-end'
          : 'center';
      const offX = el.watermarkOffsetX || 0;
      const offY = el.watermarkOffsetY || 0;
      const nudgeCss = offX || offY ? `margin-left: ${offX}px; margin-top: ${offY}px;` : '';
      const wmFlipCls = isToyhouse ? getFontAwesomeFlipClass(el.flipH, el.flipV) : '';
      const wmIconCls = [iconClass, wmFlipCls, faAnimClass].filter(Boolean).join(' ');
      const wmRotCss = !isToyhouseFree && el.rotation && !faRotateClass ? `transform: rotate(${el.rotation}deg);` : '';
      const wmStageCls = [classes, faRotateClass].filter(Boolean).join(' ');
      return `<div class="${wmStageCls}" style="width: 100%; height: 100%; display: flex; align-items: ${alignY}; justify-content: ${alignX}; font-size: ${iconSize}px; opacity: ${op}; pointer-events: none; color: ${el.textColor || el.borderColor}; ${wmRotCss} box-sizing: border-box;">
      <i class="${wmIconCls}" style="line-height: 1; ${nudgeCss}"></i>
    </div>`;
    }

    case 'scrollbox':
    case 'pure_scrollbox': {
      return `<div class="${classes}" style="${baseStyle}; overflow-y: auto; max-height: ${Math.max(60, el.maxHeightPx || el.height)}px;">
      ${el.content ? `<div style="font-weight: 700; font-size: ${el.fontSize}px; margin-bottom: 6px; letter-spacing: 0.05em; border-bottom: 1px solid ${el.borderColor || 'rgba(150,150,150,0.3)'}; padding-bottom: 4px;">${faInlineIconHtml}${el.content}</div>` : ''}
      ${el.subContent ? `<div style="font-size: ${Math.max(11, el.fontSize - 1)}px; opacity: 0.9; line-height: 1.5; white-space: pre-line;">${el.subContent}</div>` : ''}
      ${nestedChildrenHTML}
    </div>`;
    }

    case 'pure_box':
    case 'pure_flex_row':
    case 'pure_flex_col':
    case 'pure_banner':
    case 'pure_overlay_box':
    case 'pure_circle':
    case 'pure_ring':
    case 'pure_pill':
    case 'pure_diamond':
    case 'pure_hexagon':
    case 'pure_octagon':
    case 'pure_star': {
      const shapeClip =
        !isToyhouseFree && el.type === 'pure_star'
          ? '; clip-path: polygon(50% 0%, 61% 35%, 98% 35%, 68% 57%, 79% 91%, 50% 70%, 21% 91%, 32% 57%, 2% 35%, 39% 35%)'
          : '';
      const f2uStarBg =
        isToyhouseFree && el.type === 'pure_star'
          ? `<div style="position: absolute; top: 0; right: 0; bottom: 0; left: 0; display: flex; align-items: center; justify-content: center; pointer-events: none; z-index: 0;"><i class="fa-solid fa-star" style="font-size: ${Math.max(28, Math.round(Math.min(el.width, el.height) * 0.72))}px; color: ${el.bgColor && el.bgColor !== 'transparent' ? el.bgColor : el.textColor || '#D4A373'}; opacity: 0.28;"></i></div>`
          : '';
      const flexDirOverride = el.type === 'pure_flex_row' || el.type === 'pure_banner' ? '; flex-direction: row; flex-wrap: wrap; align-items: center' : '';
      const rawBody = activeSplit
        ? renderSplitModifierHTML(el, activeSplit, children, allElements, isToyhouse, isToyhouseFree, renderInnerElementHTML, escapeHtmlAttr)
        : `${f2uStarBg}
        ${el.content || faInlineIconHtml ? `<div style="position: relative; z-index: 1; font-weight: 600;">${faInlineIconHtml}${el.content}</div>` : ''}
        ${el.subContent ? `<div style="position: relative; z-index: 1; ${el.content ? 'margin-top: 4px; ' : ''}font-size: ${Math.max(11, el.fontSize - 1)}px; white-space: pre-line;">${el.subContent}</div>` : ''}${nestedChildrenHTML}`;
      const innerContent = usesF2UPunch
        ? `<div style="position: relative; z-index: 2; flex: 1; display: flex; flex-direction: column; min-height: 0; width: 100%; height: 100%;">${rawBody}</div>`
        : rawBody;
      wrapBoxLinkAfterGeo = Boolean(el.linkUrl && !el.collapsible);
      return `<div class="${classes}" style="${baseStyle}${flexDirOverride}${shapeClip}">${innerContent}</div>`;
    }

    case 'pure_line': {
      const isVertical = el.height > el.width * 1.4;
      const thick = Math.max(1, el.borderTopWidth || el.borderWidth || 2);
      const lStyle = el.borderTopStyle || el.borderStyle || 'solid';
      const lColor =
        el.borderTopColor ||
        (el.borderColor && el.borderColor !== 'transparent' ? el.borderColor : '#18181B');
      const hasArbitraryAngle = Boolean(rawEl.rotation && Math.round(rawEl.rotation) % 90 !== 0);
      if (isToyhouseFree && hasArbitraryAngle && rawEl.rotation) {
        return `<div class="${classes}" style="width: 100%; height: 100%; box-sizing: border-box; display: flex; align-items: center; justify-content: center; ${opacityCss};">
      <div style="${buildF2UAngledLineCss(rawEl.rotation, lColor, thick)}"></div>
    </div>`;
      }
      const lineCss = isVertical
        ? `height: 100%; width: 0; border-left: ${thick}px ${lStyle} ${lColor}; margin: 0 auto;`
        : `width: 100%; height: 0; border-top: ${thick}px ${lStyle} ${lColor};`;
      return `<div class="${classes}" style="width: 100%; height: 100%; box-sizing: border-box; display: flex; align-items: center; justify-content: center; ${rotationCss}; ${opacityCss};">
      <div style="${lineCss}"></div>
    </div>`;
    }

    case 'pure_grid_2':
    case 'pure_grid_3':
    case 'pure_grid_4': {
      const cols = el.type === 'pure_grid_4' ? 4 : el.type === 'pure_grid_3' ? 3 : 2;
      const gap = el.containerGap !== undefined ? el.containerGap : 10;
      const halfGridGap = (gap / 2).toFixed(1).replace(/\.0$/, '');
      const bsColClass =
        cols === 4 ? 'col-12 col-sm-6 col-md-3' : cols === 3 ? 'col-12 col-md-4' : 'col-12 col-md-6';
      let gridBody = '';
      if (children.length > 0) {
        gridBody = `\n      <div class="row no-gutters dbx-bs-row dbx-bs-cols-${cols}" style="margin-left: -${halfGridGap}px; margin-right: -${halfGridGap}px; width: calc(100% + ${gap}px); flex: 1;">\n${children
          .map(
            (child) =>
              `        <div class="${bsColClass}" style="padding-left: ${halfGridGap}px; padding-right: ${halfGridGap}px; margin-bottom: ${gap}px; box-sizing: border-box; min-width: 0;">${renderInnerElementHTML(child, isToyhouse, allElements, false, isToyhouseFree)}</div>`
          )
          .join('\n')}\n      </div>`;
      } else {
        const slotTexts = (el.subContent || Array.from({ length: cols }, (_, i) => `Slot ${i + 1}`).join(' || ')).split('||');
        gridBody = `\n      <div class="row no-gutters dbx-bs-row dbx-bs-cols-${cols}" style="margin-left: -${halfGridGap}px; margin-right: -${halfGridGap}px; width: calc(100% + ${gap}px); flex: 1;">\n${Array.from(
          { length: cols },
          (_, i) =>
            `        <div class="${bsColClass}" style="padding-left: ${halfGridGap}px; padding-right: ${halfGridGap}px; margin-bottom: ${gap}px; box-sizing: border-box;"><div style="height: 100%; padding: 8px; border: 1px dashed ${el.borderColor || '#E5E5E5'}; border-radius: 4px; font-size: ${Math.max(11, el.fontSize - 1)}px; white-space: pre-line; box-sizing: border-box;">${(slotTexts[i] || `Slot ${i + 1}`).trim()}</div></div>`
        ).join('\n')}\n      </div>`;
      }
      return `<div class="${classes}" style="${baseStyle}">
      ${el.content ? `<div style="font-weight: 700; margin-bottom: 8px;">${faInlineIconHtml}${el.content}</div>` : ''}${gridBody}
    </div>`;
    }

    case 'pure_card': {
      const cardCls = classes.includes('card') ? classes : `${classes} card`;
      const isFreeCard = cLayout === 'freeform_offset';
      return `<div class="${cardCls}" style="${baseStyle}">
      ${el.content ? `<div class="card-header" style="padding: 8px 12px; font-weight: 700; border-bottom: 1px solid ${el.borderColor || '#E5E5E5'}; background: rgba(0,0,0,0.02);">${faInlineIconHtml}${el.content}</div>` : ''}
      <div class="card-body" style="padding: 12px; flex: 1; display: flex; flex-direction: column;">
        ${el.subContent ? `<div style="font-size: ${Math.max(11, el.fontSize)}px; white-space: pre-line;">${el.subContent}</div>` : ''}${isFreeCard ? '' : nestedChildrenHTML}
      </div>${isFreeCard ? nestedChildrenHTML : ''}
    </div>`;
    }

    case 'pure_spoiler': {
      return `<div class="${classes}" style="${baseStyle}">
      <details ${el.collapseDefaultOpen ? 'open' : ''} style="width: 100%;">
        <summary style="cursor: pointer; font-weight: 700; user-select: none; list-style: none; display: flex; align-items: center; justify-content: space-between;">
          <span>${faInlineIconHtml}${el.collapseHeader || el.content || 'Click to expand'}</span>
          <span style="font-size: 10px; opacity: 0.6;">▼</span>
        </summary>
        <div style="padding-top: 8px; margin-top: 8px; border-top: 1px solid ${el.borderColor || '#E5E5E5'};">
          ${el.subContent ? `<div style="font-size: ${Math.max(11, el.fontSize - 1)}px; white-space: pre-line;">${el.subContent}</div>` : ''}${nestedChildrenHTML}
        </div>
      </details>
    </div>`;
    }

    case 'pure_collapse': {
      const colId = escapeHtmlAttr((el.f2uCollapseId || `col-${el.id}`).replace(/[^a-zA-Z0-9_-]/g, ''));
      return `<div class="${classes}" style="${baseStyle}">
      <a class="btn btn-sm btn-block text-left" data-toggle="collapse" href="#${colId}" role="button" aria-expanded="${el.f2uCollapseDefaultOpen ? 'true' : 'false'}" style="font-weight: 700; color: inherit; border-bottom: 1px solid ${el.borderColor || '#E5E5E5'}; padding: 4px 2px; display: flex; align-items: center; justify-content: space-between; text-decoration: none;">
        <span>${faInlineIconHtml}${el.content || 'Toggle Collapse'}</span>
        <i class="fa-solid fa-chevron-down" style="font-size: 10px; opacity: 0.65;"></i>
      </a>
      <div class="collapse${el.f2uCollapseDefaultOpen ? ' show' : ''}" id="${colId}" style="padding-top: 8px;">
        ${el.subContent ? `<div style="font-size: ${Math.max(11, el.fontSize - 1)}px; white-space: pre-line;">${el.subContent}</div>` : ''}${nestedChildrenHTML}
      </div>
    </div>`;
    }

    case 'pure_link': {
      const target = el.linkTarget || '_blank';
      if (isBoxF2UGeo && hasUniformBorder && (!hasCustomBgSurface || isToyhouseFree)) {
        const innerLinkBg = buildF2UQuadrantSurfaceCss(
          effectiveBoxShape!,
          el.bgColor && el.bgColor !== 'transparent' ? el.bgColor : el.shapeMaskBgColor || '#FAF8F5',
          el.shapeCutPx
        );
        return `<a href="${escapeHtmlAttr(el.url || '#')}" target="${target}" rel="noopener noreferrer" class="${classes}" style="${baseStyle}; ${buildF2UQuadrantSurfaceCss(effectiveBoxShape!, el.borderColor, el.shapeCutPx)}; padding: ${Math.max(1, el.borderWidth)}px; text-decoration: none; ${isFreeformFixed && !el.autoHeight ? '' : 'width: 100%;'}"><span style="width: 100%; height: 100%; flex: 1; display: flex; flex-direction: row; align-items: center; justify-content: center; box-sizing: border-box; ${getPaddingCSS(el)}; ${innerLinkBg}">${faInlineIconHtml}<span>${el.content || 'Link'}</span></span></a>`;
      }
      return `<a href="${escapeHtmlAttr(el.url || '#')}" target="${target}" rel="noopener noreferrer" class="${classes}" style="${baseStyle}; flex-direction: row; align-items: center; justify-content: center; text-decoration: none; ${isFreeformFixed && !el.autoHeight ? '' : 'width: 100%;'}">${faInlineIconHtml}<span>${el.content || 'Link'}</span></a>`;
    }

    case 'pure_image_slot': {
      if (!el.url || !el.url.trim()) {
        return `<div class="${classes}" style="${baseStyle}; align-items: center; justify-content: center; text-align: center; color: #9CA3AF;">
          <i class="fa-regular fa-image fa-2x" style="opacity: 0.45; margin-bottom: 6px;"></i>
          <div style="font-size: 11px;">Blank Image Slot</div>
        </div>`;
      }
      const imgObj: DesignElement = { ...el, type: 'image' };
      return renderInnerElementHTML(imgObj, isToyhouse, allElements, isFreeformFixed, isToyhouseFree);
    }

    case 'pure_heading': {
      return `<div class="${classes}" style="${baseStyle}">${faInlineIconHtml}${el.content || 'Heading Title'}</div>`;
    }

    case 'pure_paragraph': {
      return `<div class="${classes}" style="${baseStyle}; white-space: pre-line;">${faInlineIconHtml}${el.subContent || el.content || ''}</div>`;
    }

    case 'pure_list': {
      const lines = (el.subContent || 'First item\nSecond item\nThird item').split('\n').filter(Boolean);
      const lType = el.listStyleType || 'disc';
      if (lType === 'checklist') {
        const itemsHtml = lines
          .map((line) => `<li style="margin-bottom: 4px;"><span class="fa-li"><i class="fa-regular fa-square-check"></i></span>${line}</li>`)
          .join('');
        return `<div class="${classes}" style="${baseStyle}">${el.content ? `<div style="font-weight: 700; margin-bottom: 6px;">${faInlineIconHtml}${el.content}</div>` : ''}<ul class="fa-ul" style="margin: 0 0 0 20px; padding: 0;">${itemsHtml}</ul></div>`;
      }
      const tag = lType === 'decimal' ? 'ol' : 'ul';
      const itemsHtml = lines.map((line) => `<li style="margin-bottom: 3px;">${line}</li>`).join('');
      return `<div class="${classes}" style="${baseStyle}">${el.content ? `<div style="font-weight: 700; margin-bottom: 6px;">${faInlineIconHtml}${el.content}</div>` : ''}<${tag} style="margin: 0; padding-left: ${lType === 'none' ? '0' : '18px'}; list-style-type: ${lType};">${itemsHtml}</${tag}></div>`;
    }

    case 'pure_table': {
      const headers = (el.tableHeaders || 'Column 1 | Column 2').split('|').map((s) => s.trim()).filter(Boolean);
      const rows = (el.subContent || 'Row 1A | Row 1B\nRow 2A | Row 2B').split('\n').filter(Boolean);
      const tblCls = [
        'table',
        'table-sm',
        el.tableBordered !== false ? 'table-bordered' : '',
        el.tableStriped ? 'table-striped' : '',
        el.tableHover ? 'table-hover' : '',
      ]
        .filter(Boolean)
        .join(' ');
      const theadHtml = headers.length > 0
        ? `<thead><tr>${headers.map((h) => `<th style="border-color: ${el.borderColor || '#E5E5E5'}; color: ${el.textColor};">${h}</th>`).join('')}</tr></thead>`
        : '';
      const tbodyHtml = `<tbody>${rows
        .map((r) => {
          const cells = r.split('|').map((c) => c.trim());
          return `<tr>${cells.map((c) => `<td style="border-color: ${el.borderColor || '#E5E5E5'}; color: ${el.textColor};">${c}</td>`).join('')}</tr>`;
        })
        .join('')}</tbody>`;
      return `<div class="${classes}" style="${baseStyle}; overflow: auto;">${el.content ? `<div style="font-weight: 700; margin-bottom: 6px;">${faInlineIconHtml}${el.content}</div>` : ''}<table class="${tblCls}" style="width: 100%; margin-bottom: 0; font-size: ${Math.max(11, el.fontSize - 1)}px; color: ${el.textColor}; border-collapse: collapse;">${theadHtml}${tbodyHtml}</table></div>`;
    }

    case 'pure_progress': {
      const pct = Math.max(0, Math.min(100, parseInt(el.subContent || '65', 10) || 65));
      const barColor = el.progressBarColor || (el.borderColor !== '#E5E5E5' && el.borderColor !== 'transparent' ? el.borderColor : '#4B5563');
      const barCls = [
        'progress-bar',
        el.progressStriped ? 'progress-bar-striped' : '',
        el.progressAnimated ? 'progress-bar-animated' : '',
      ]
        .filter(Boolean)
        .join(' ');
      return `<div class="${classes}" style="${baseStyle}">
      ${el.content ? `<div style="display: flex; justify-content: space-between; margin-bottom: 6px; font-size: ${Math.max(11, el.fontSize - 1)}px; font-weight: 600;"><span>${faInlineIconHtml}${el.content}</span><span>${pct}%</span></div>` : ''}
      <div class="progress" style="height: 10px; background: rgba(150,150,150,0.18); border-radius: 999px; overflow: hidden;">
        <div class="${barCls}" role="progressbar" style="width: ${pct}%; background-color: ${barColor};" aria-valuenow="${pct}" aria-valuemin="0" aria-valuemax="100"></div>
      </div>
    </div>`;
    }

    case 'pure_divider':
      return `<div class="${classes}" style="width: 100%; height: 100%; box-sizing: border-box; ${getPaddingCSS(el)}; display: flex; align-items: center; ${rotationCss}; ${opacityCss};">
      <hr style="width: 100%; border: 0; border-top: ${Math.max(1, el.borderWidth || 1)}px ${el.borderStyle || 'solid'} ${el.borderColor !== 'transparent' ? el.borderColor : '#D4D4D8'}; margin: 0;" />
    </div>`;

    case 'spacer':
      return `<div class="${classes}" style="${baseStyle}">${nestedChildrenHTML}</div>`;

    case 'box':
    case 'text':
    default: {
      let innerOutput = '';
      if (activeSplit) {
        const splitBody = renderSplitModifierHTML(el, activeSplit, children, allElements, isToyhouse, isToyhouseFree, renderInnerElementHTML, escapeHtmlAttr);
        innerOutput = `<div class="${classes}" style="${baseStyle}">${usesF2UPunch ? `<div style="position: relative; z-index: 2; flex: 1; display: flex; flex-direction: column; width: 100%; height: 100%; min-height: 0;">${splitBody}</div>` : splitBody}</div>`;
      } else if (el.collapsible) {
        const collInner = `
        <details ${el.collapseDefaultOpen ? 'open' : ''} style="width: 100%;">
          <summary style="cursor: pointer; list-style: none; outline: none; font-weight: 700; user-select: none; display: flex; align-items: center; justify-content: space-between;">
            <span>${el.collapseHeader || el.content || 'Click to Expand'}</span>
            <span style="font-size: 10px; opacity: 0.7;">▼</span>
          </summary>
          <div style="padding-top: 8px; border-top: 1px dashed ${el.borderColor || 'rgba(150,150,150,0.3)'}; margin-top: 6px;">
            ${el.subContent ? `<div style="font-size: ${Math.max(11, el.fontSize - 1)}px; opacity: 0.85; white-space: pre-line;">${el.subContent}</div>` : ''}
            ${nestedChildrenHTML}
          </div>
        </details>`;
        innerOutput = `<div class="${classes}" style="${baseStyle}">${usesF2UPunch ? `<div style="position: relative; z-index: 2; flex: 1; display: flex; flex-direction: column; width: 100%;">${collInner}</div>` : collInner}</div>`;
      } else {
        const boxBody = `
        ${el.content ? `<div style="font-weight: 700;">${el.content}</div>` : ''}
        ${el.subContent ? `<div style="margin-top: 6px; font-size: ${Math.max(11, el.fontSize - 1)}px; opacity: 0.85; font-weight: 400; white-space: pre-line;">${el.subContent}</div>` : ''}${nestedChildrenHTML}`;
        innerOutput = `<div class="${classes}" style="${baseStyle}">${usesF2UPunch ? `<div style="position: relative; z-index: 2; flex: 1; display: flex; flex-direction: column; width: 100%;">${boxBody}</div>` : boxBody}</div>`;
      }

      wrapBoxLinkAfterGeo = Boolean(el.linkUrl && !el.collapsible);
      return innerOutput;
    }
  }
  })();

  return finalizeElementHTML(rawElementHtml);
}

export function generatePlatformExport(
  elements: DesignElement[],
  mode: LayoutMode,
  platform: TargetPlatform,
  canvasWidth = 760,
  canvasHeight = 520,
  canvasBg = '#F7F5F0',
  canvasPattern: BgPattern = 'none'
): ExportResult {
  const activeElements = elements.filter((e) => !e.hidden);
  const warnings: ValidationWarning[] = [];
  const isToyhouseFree = platform === 'toyhouse_free' || platform === 'toyhouse_oc';
  const isToyhousePremium =
    platform === 'toyhouse_premium' ||
    platform === 'toyhouse_profile' ||
    platform === 'toyhouse_world';
  const isToyhouse = isToyhouseFree || isToyhousePremium;

  const hasAnimationsOrHover = activeElements.some(
    (e) =>
      e.hoverEffect !== 'none' ||
      (e.idleAnimation && e.idleAnimation !== 'none') ||
      e.type === 'music_player' ||
      e.type === 'cassette_player'
  );
  const hasForbiddenScript = activeElements.some(
    (e) =>
      (e.customHtml && /<script\b/i.test(e.customHtml)) ||
      (e.rawInnerHtml && /<script\b/i.test(e.rawInnerHtml))
  );
  if (hasForbiddenScript) {
    warnings.push({
      severity: 'error',
      code: 'CUSTOM_WIDGET_SCRIPT_TAG',
      message: 'One or more Custom/Raw HTML blocks contain <script> tags, which Toyhouse strips.',
      suggestion: 'Use pure HTML/CSS, <details>, Bootstrap data-toggle, or CSS radio states instead of JavaScript.',
    });
  }

  const localImageElements = activeElements.filter((e) => {
    const isLocalUri = (val?: string) =>
      typeof val === 'string' && /^(data:image\/|blob:)/i.test(val.trim());
    if (isLocalUri(e.url) || isLocalUri(e.hoverImageUrl) || isLocalUri(e.bgImageUrl)) {
      return true;
    }
    if (Array.isArray(e.gallery) && e.gallery.some((item) => isLocalUri(item.url))) {
      return true;
    }
    if (Array.isArray(e.relationNodes) && e.relationNodes.some((node) => isLocalUri(node.avatarUrl))) {
      return true;
    }
    return false;
  });

  if (localImageElements.length > 0) {
    warnings.push({
      severity: 'warning',
      code: 'TH_LOCAL_IMAGE_URL',
      elementId: localImageElements[0].id,
      message: `${localImageElements.length} element(s) use offline Base64 DataURL or local blob images (${localImageElements
        .map((el) => el.label || el.type)
        .slice(0, 3)
        .join(', ')}${localImageElements.length > 3 ? '...' : ''}).`,
      suggestion: isToyhouse
        ? 'Toyhouse strips data: URLs and external viewers cannot see local images. Add an ImgBB API Key in Settings or replace with external HTTPS image links before pasting into Toyhouse.'
        : 'Embedded DataURLs work offline, or host images externally via ImgBB / HTTPS CDN for smaller HTML embeds.',
    });
  }

  const floatingElements =
    mode === 'hybrid' ? activeElements.filter((el) => isFloatingCollageElement(el)) : [];

  if (isToyhouseFree) {
    warnings.push({
      severity: 'info',
      code: 'TH_F2U_READY',
      message:
        'Toyhouse F2U (Non-Premium): Zero <style> tags used. Bootstrap 4 grid, nav-tabs, collapse, <details> and Font Awesome animations/rotations run natively on free Toyhouse accounts.',
      suggestion: 'Paste directly into profile with WYSIWYG disabled. No Premium subscription needed!',
    });

    const hasGlassOrProBackdrop = activeElements.some(
      (e) => (e.glassBlur && e.glassBlur > 0) || (e.customInlineStyle && /backdrop-filter/i.test(e.customInlineStyle))
    );
    if (hasGlassOrProBackdrop) {
      warnings.push({
        severity: 'warning',
        code: 'TH_F2U_GLASS_NOTE',
        message: 'Glass Blur (backdrop-filter) is stripped or unsupported on Toyhouse Free (F2U).',
        suggestion: 'Use semi-transparent rgba() Background Color or switch to Toyhouse Premium / Carrd Pro.',
      });
    }

    const hasDiamondOrClip = activeElements.some(
      (e) =>
        e.type === 'pure_star' ||
        !isF2USafeShape(e.imageShape) ||
        !isF2USafeShape(e.boxClipShape) ||
        (e.customInlineStyle && /clip-path/i.test(e.customInlineStyle))
    );
    if (hasDiamondOrClip) {
      warnings.push({
        severity: 'warning',
        code: 'TH_F2U_CLIP_NOTE',
        message: 'Complex SVG/polygon clip-path shapes (Star/Heart/Shield/Ticket/Scallop/Cross) are masked in F2U mode.',
        suggestion: 'Hexagon, Diamond, Octagon, Bevel, Circle, Pill, Arch & Leaf use F2U-safe CSS and stay active.',
      });
    }

    const hasInlineWidgetStyleTag = activeElements.some(
      (e) =>
        (e.customHtml && /<style\b/i.test(e.customHtml)) ||
        (e.rawInnerHtml && /<style\b/i.test(e.rawInnerHtml))
    );
    if (hasInlineWidgetStyleTag) {
      warnings.push({
        severity: 'warning',
        code: 'TH_F2U_STYLE_TAG_STRIP',
        message: 'One or more Custom/HTML widgets contain <style> blocks, which are automatically stripped on Toyhouse F2U export (non-destructively).',
        suggestion: 'Use inline CSS styles inside widgets for F2U safety, or switch to Toyhouse Premium / Carrd Pro.',
      });
    }

    const hasProModifiers = activeElements.some((e) => elementHasProModifiers(e));
    if (hasProModifiers) {
      warnings.push({
        severity: 'warning',
        code: 'TH_F2U_PRO_MODIFIER_NOTE',
        message:
          'One or more active Modifiers (Boolean Mask, Ticket Corners, Diagonal Lines, or Multi-Hole Cutouts) use CSS mask-image or transform: rotate(), which Toyhouse Free may strip.',
        suggestion:
          'Single-fill Hole Punch, Hollow Ring, H/V Split, H/V/Cross Lines & Corner Brackets are 100% F2U safe. Switch to Toyhouse Premium / Carrd Pro for full Boolean SVG masking.',
      });
    }

    const hasCustomHover = activeElements.some(
      (e) =>
        e.hoverEffect !== 'none' ||
        (e.hoverAction && e.hoverAction !== 'none') ||
        (e.imageHoverEffect && e.imageHoverEffect !== 'none')
    );
    if (hasCustomHover) {
      warnings.push({
        severity: 'warning',
        code: 'TH_F2U_HOVER_NOTE',
        message:
          'CSS :hover effects (Lift, Tilt, Glow, Scale, Fade, Image Zoom/Swap) require <style> tags, which Toyhouse Free strips.',
        suggestion:
          'Use "Hover Tooltip (title)" or "Collapsible / Click Expand" (<details>) for 100% F2U interaction, or switch target to Toyhouse Premium / Carrd Pro.',
      });
    }

    const hasArbitraryRotation = activeElements.some(
      (e) =>
        (e.rotation && Math.round(e.rotation) % 90 !== 0) ||
        (e.imgRotation && Math.round(e.imgRotation) % 90 !== 0)
    );
    if (hasArbitraryRotation) {
      warnings.push({
        severity: 'warning',
        code: 'TH_F2U_ROTATION_NOTE',
        message:
          'Toyhouse Free strips inline CSS transform: rotate(...) for arbitrary angles (e.g. 15°).',
        suggestion:
          'Snap rotations to 90° / 180° / 270° (which use native Font Awesome fa-rotate-* classes on F2U), or use Toyhouse Premium for arbitrary angles.',
      });
    }
  } else if (isToyhouse && hasAnimationsOrHover) {
    warnings.push({
      severity: 'warning',
      code: 'TH_CSS_ANIMATION_NOTE',
      message: 'Custom @keyframes and :hover CSS blocks require Toyhouse Premium on Toyhouse.',
      suggestion:
        'Without Toyhouse Premium, use Toyhouse Free (F2U) mode which uses native Font Awesome classes (fa-bounce).',
    });
  }

  if (mode === 'freeform') {
    warnings.push({
      severity: 'info',
      code: 'FREEFORM_FIXED_STAGE',
      message: `Freeform Collage uses a fixed ${canvasWidth}×${canvasHeight}px stage inside a horizontal scroll wrapper (overflow-x: auto) so exact X/Y coordinates, sizes & overlaps never break on Toyhouse or narrower viewports.`,
      suggestion: 'Use "Dynamic Hybrid" if you prefer columns to stack vertically on narrow mobile screens.',
    });
  }

  const usedGoogleFonts = Array.from(
    new Set(activeElements.map((e) => e.googleFont).filter(Boolean) as string[])
  );
  const googleFontsImportCss =
    usedGoogleFonts.length > 0
      ? usedGoogleFonts
          .map(
            (font) =>
              `@import url('https://fonts.googleapis.com/css2?family=${encodeURIComponent(font).replace(/%20/g, '+')}:ital,wght@0,300;0,400;0,500;0,600;0,700;1,400&display=swap');`
          )
          .join('\n  ') + '\n  '
      : '';

  // Self-contained Flexbox Grid + Responsive Bootstrap 4 Mirror CSS so Preview & Toyhouse/Carrd render columns accurately!
  const coreGridAndAnimationCss = isToyhouseFree
    ? ''
    : `<style>
  ${googleFontsImportCss}.dbx-row, .dbx-bs-row { display: flex; flex-wrap: wrap; }
  .dbx-row { margin: -6px; }
  .dbx-col { padding: 6px; box-sizing: border-box; }
  .col-12 { flex: 0 0 100%; max-width: 100%; box-sizing: border-box; }
  @media (min-width: 576px) { .col-sm-6 { flex: 0 0 50%; max-width: 50%; } }
  @media (min-width: 768px) {
    ${Array.from({ length: 12 }, (_, i) => `.col-md-${i + 1} { flex: 0 0 ${(((i + 1) / 12) * 100).toFixed(4)}%; max-width: ${(((i + 1) / 12) * 100).toFixed(4)}%; }`).join('\n    ')}
  }
  ${Array.from({ length: 12 }, (_, i) => `.dbx-col-${i + 1} { flex: 0 0 ${(((i + 1) / 12) * 100).toFixed(4)}%; max-width: ${(((i + 1) / 12) * 100).toFixed(4)}%; }`).join('\n  ')}
  @media (max-width: 767px) { .dbx-col { flex: 0 0 100% !important; max-width: 100% !important; } }
  .dbx-hover-lift:hover { transform: translateY(-4px) !important; box-shadow: 0 10px 20px rgba(0,0,0,0.18) !important; }
  .dbx-hover-scale:hover { transform: scale(1.025) !important; }
  .dbx-hover-glow:hover { box-shadow: 0 0 16px rgba(200, 109, 81, 0.5) !important; }
  .dbx-hover-fade:hover { opacity: 0.82 !important; }
  .dbx-hover-tilt:hover { transform: rotate(-2deg) scale(1.02) !important; }
  @keyframes dbx-float { 0%, 100% { transform: translateY(0px); } 50% { transform: translateY(-6px); } }
  @keyframes dbx-pulse { 0%, 100% { transform: scale(1); } 50% { transform: scale(1.035); } }
  @keyframes dbx-spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
  @keyframes dbx-wiggle { 0%, 100% { transform: rotate(-2.5deg); } 50% { transform: rotate(2.5deg); } }
  @keyframes dbx-bounce { 0%, 20%, 50%, 80%, 100% { transform: translateY(0); } 40% { transform: translateY(-16px) scale(0.96, 1.05); } 60% { transform: translateY(-8px) scale(0.98, 1.02); } }
  @keyframes dbx-rubber_band { 0% { transform: scale3d(1, 1, 1); } 30% { transform: scale3d(1.15, 0.85, 1); } 40% { transform: scale3d(0.88, 1.12, 1); } 50% { transform: scale3d(1.08, 0.92, 1); } 65% { transform: scale3d(0.97, 1.03, 1); } 75% { transform: scale3d(1.02, 0.98, 1); } 100% { transform: scale3d(1, 1, 1); } }
  @keyframes dbx-heartbeat { 0% { transform: scale(1); } 14% { transform: scale(1.09); } 28% { transform: scale(1); } 42% { transform: scale(1.09); } 70% { transform: scale(1); } }
  @keyframes dbx-sway { 0%, 100% { transform: rotate(0deg); transform-origin: top center; } 25% { transform: rotate(4deg); transform-origin: top center; } 75% { transform: rotate(-4deg); transform-origin: top center; } }
  @keyframes dbx-shimmer { 0%, 100% { filter: brightness(1); opacity: 1; } 50% { filter: brightness(1.22) drop-shadow(0 0 10px rgba(200, 109, 81, 0.45)); opacity: 0.92; } }
  @keyframes dbx-glitch { 0%, 90%, 100% { transform: translate(0, 0); } 92% { transform: translate(-2px, 1px); } 94% { transform: translate(2px, -1px); } 96% { transform: translate(-1px, 2px); } 98% { transform: translate(1px, -1px); } }
  .dbx-anim-float { animation: dbx-float 3.2s ease-in-out infinite; }
  .dbx-anim-pulse { animation: dbx-pulse 2.6s ease-in-out infinite; }
  .dbx-anim-spin { animation: dbx-spin 9s linear infinite; }
  .dbx-anim-wiggle { animation: dbx-wiggle 2.2s ease-in-out infinite; }
  .dbx-anim-bounce { animation: dbx-bounce 1.8s ease-in-out infinite; }
  .dbx-anim-rubber_band { animation: dbx-rubber_band 2.4s ease infinite; }
  .dbx-anim-heartbeat { animation: dbx-heartbeat 1.6s ease-in-out infinite; }
  .dbx-anim-sway { animation: dbx-sway 3.2s ease-in-out infinite; }
  .dbx-anim-shimmer { animation: dbx-shimmer 2.8s ease-in-out infinite; }
  .dbx-anim-glitch { animation: dbx-glitch 3.5s infinite; }
  .dbx-img-wrapper { position: relative; overflow: hidden; }
  .dbx-img-wrapper:hover .dbx-img-swap { opacity: 1 !important; }
  .dbx-img-wrapper:hover .dbx-img-primary-swap { opacity: 0 !important; }
  .dbx-img-zoom-hover:hover img { transform: scale(1.08) !important; }
  .dbx-lightbox-details summary::-webkit-details-marker { display: none; }
  .dbx-lightbox-details summary { list-style: none; outline: none; }
</style>\n`;

  const isCanvasTransparent =
    canvasBg === 'transparent' ||
    canvasBg === 'rgba(0,0,0,0)' ||
    canvasBg === 'none' ||
    !canvasBg;

  const containerSurfaceCss = isCanvasTransparent
    ? 'background-color: transparent;'
    : getBackgroundPatternCSS(canvasBg, undefined, canvasPattern);

  const containerBorderAndPaddingCss = isCanvasTransparent
    ? 'border: none; border-radius: 0; box-shadow: none; padding: 0;'
    : 'border: 1px solid rgba(150,140,125,0.35); border-radius: 10px; padding: 12px;';

  const containerOverflowCss = isCanvasTransparent ? 'overflow: visible;' : 'overflow: hidden;';

  const renderFloatingLayerHTML = (list: DesignElement[]) =>
    list
      .map((el) => {
        const leftPct = ((el.x / canvasWidth) * 100).toFixed(2);
        const topPct = ((el.y / canvasHeight) * 100).toFixed(2);
        const widthPct = ((el.width / canvasWidth) * 100).toFixed(2);
        const heightPct = ((el.height / canvasHeight) * 100).toFixed(2);
        return `  <!-- Floating / Pagedoll Layer: ${el.label} -->
  <div style="position: absolute; left: ${leftPct}%; top: ${topPct}%; width: ${widthPct}%; height: ${heightPct}%; z-index: ${el.zIndex || 25}; pointer-events: auto;">
    ${renderInnerElementHTML(el, isToyhouse, activeElements, false, isToyhouseFree)}
  </div>`;
      })
      .join('\n');

  if (mode === 'freeform') {
    const rootFreeform = activeElements.filter((e) => !e.parentId);
    const stageHeight = isCanvasTransparent
      ? Math.max(canvasHeight, ...rootFreeform.map((e) => Math.ceil(e.y + e.height)))
      : canvasHeight;
    const childrenHtml = rootFreeform
      .map((el) => {
        const leftPx = Math.round(el.x);
        const topPx = Math.round(el.y);
        const widthPx = Math.round(el.width);
        const heightPx = Math.round(el.height);

        return `  <div style="position: absolute; left: ${leftPx}px; top: ${topPx}px; width: ${widthPx}px; height: ${heightPx}px; z-index: ${el.zIndex || 10};">
    ${renderInnerElementHTML(el, isToyhouse, activeElements, true, isToyhouseFree)}
  </div>`;
      })
      .join('\n');

    const stageStyle = `width: ${canvasWidth}px; min-width: ${canvasWidth}px; height: ${stageHeight}px; margin: 0 auto; position: relative; box-sizing: border-box; ${containerSurfaceCss} ${containerBorderAndPaddingCss} ${containerOverflowCss}`;
    const roundTripComment =
      activeElements.length > 0
        ? `\n<!-- DBX_ROUNDTRIP_V1:${encodeRoundTripPayload({
            v: 1,
            mode,
            canvasWidth,
            canvasHeight,
            canvasBg,
            canvasPattern,
            elements: activeElements,
          })} -->`
        : '';

    const html = isToyhouseFree
      ? `<!-- Generated by DesignBox | Platform: TOYHOUSE F2U (Non-Premium / Free) | Mode: Freeform Collage (Fixed-Px + Scroll Safe) -->
<div style="width: 100%; max-width: 100%; overflow: auto; overflow-x: auto; overflow-y: visible;">
  <div class="mx-auto" style="${stageStyle}">
${childrenHtml}
  </div>
</div>${roundTripComment}`
      : `<!-- Generated by DesignBox | Platform: ${platform.toUpperCase()} | Mode: Freeform Collage (Fixed-Px + Scroll Safe) -->
${coreGridAndAnimationCss}<div style="width: 100%; max-width: 100%; overflow: auto; overflow-x: auto; overflow-y: visible;">
  <div class="${isToyhouse ? 'mx-auto' : 'dbx-carrd-root'}" style="${stageStyle}">
${childrenHtml}
  </div>
</div>${roundTripComment}`;

    return {
      html,
      warnings,
      stats: {
        elementsCount: activeElements.length,
        floatingCount: rootFreeform.length,
        layoutStrategy: isToyhouseFree
          ? `Toyhouse F2U Freeform (${canvasWidth}×${stageHeight}px Fixed Stage + Scroll Wrapper)`
          : `Freeform Collage (${canvasWidth}×${stageHeight}px Fixed Stage + Layer Z-Index)`,
        responsiveScore: 'Medium',
      },
    };
  }

  const solvedRows = solveRowsFromElements(activeElements, mode, canvasWidth);
  const floatingHtml =
    floatingElements.length > 0 ? `\n${renderFloatingLayerHTML(floatingElements)}` : '';

  const rowsHtml = solvedRows
    .map((row) => {
      const colsHtml = row.elements
        .map(
          ({ element, calculatedColSpan }) =>
            `    <div class="${isToyhouseFree ? `col-12 col-md-${calculatedColSpan} p-1` : `dbx-col dbx-col-${calculatedColSpan} ${isToyhouse ? `col-12 col-md-${calculatedColSpan}` : ''}`}">
      ${renderInnerElementHTML(element, isToyhouse, activeElements, false, isToyhouseFree)}
    </div>`
        )
        .join('\n');

      return `  <!-- Row ${row.rowIndex + 1} -->
  <div class="${isToyhouseFree ? 'row no-gutters w-100' : `dbx-row ${isToyhouse ? 'row no-gutters' : ''}`}" style="margin-bottom: 8px;">
${colsHtml}
  </div>`;
    })
    .join('\n\n');

  const roundTripComment =
    activeElements.length > 0
      ? `\n<!-- DBX_ROUNDTRIP_V1:${encodeRoundTripPayload({
          v: 1,
          mode,
          canvasWidth,
          canvasHeight,
          canvasBg,
          canvasPattern,
          elements: activeElements,
        })} -->`
      : '';

  const html = isToyhouseFree
    ? `<!-- Generated by DesignBox | Platform: TOYHOUSE F2U (Non-Premium / Free) | Mode: ${
        mode === 'hybrid'
          ? `Hybrid (${solvedRows.length} Rows + ${floatingElements.length} Pagedoll/Floating Layers)`
          : 'Block Grid'
      } -->
<div class="row no-gutters mx-auto" style="max-width: ${canvasWidth}px; width: 100%; position: relative; min-height: ${canvasHeight}px; ${containerSurfaceCss} ${containerBorderAndPaddingCss} ${containerOverflowCss}">
${rowsHtml}${floatingHtml}
</div>${roundTripComment}`
    : `<!-- Generated by DesignBox | Platform: ${platform.toUpperCase()} | Mode: ${
        mode === 'hybrid'
          ? `Dynamic Hybrid (${solvedRows.length} Grid Rows + ${floatingElements.length} Floating Stickers)`
          : 'Block Grid'
      } -->
${coreGridAndAnimationCss}<div class="${isToyhouse ? `container ${isCanvasTransparent ? 'p-0' : 'p-3'}` : 'dbx-carrd-root'}" style="max-width: ${canvasWidth}px; margin: 0 auto; position: relative; min-height: ${canvasHeight}px; ${containerSurfaceCss} ${containerBorderAndPaddingCss} ${containerOverflowCss}">
${rowsHtml}${floatingHtml}
</div>${roundTripComment}`;

  return {
    html,
    warnings,
    stats: {
      elementsCount: activeElements.length,
      floatingCount: floatingElements.length,
      layoutStrategy: isToyhouseFree
        ? 'Toyhouse F2U Non-Premium (Zero <style> Tags + Bootstrap 4 + FontAwesome)'
        : mode === 'hybrid'
        ? `Dynamic Hybrid Solver (${solvedRows.length} Rows + ${floatingElements.length} Overlays)`
        : 'Structured 12-Col Block Grid',
      responsiveScore: mode === 'hybrid' ? 'High' : 'Medium',
    },
  };
}
