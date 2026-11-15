import { getElementEffectiveLinkUrl } from '../engine/layoutSolver';
import { DesignElement, ElementType } from '../types/schema';
import { getDisplayBorderStyle, getDisplayBorderWidth } from './borderHelpers';

const NON_TYPOGRAPHY_TYPES: ReadonlySet<ElementType> = new Set([
  'image',
  'pure_image_slot',
  'divider',
  'pure_divider',
  'washi_tape',
  'lace_divider',
  'palette_strip',
  'pagedoll',
  'fa_watermark',
  'pure_line',
]);

const NON_PRIMARY_TEXT_TYPES: ReadonlySet<ElementType> = new Set([
  'image',
  'pure_image_slot',
  'divider',
  'pure_divider',
  'washi_tape',
  'lace_divider',
  'palette_strip',
  'pagedoll',
  'fa_watermark',
  'pure_line',
  'relationship_tree',
]);

export interface InspectorSectionSummaries {
  content: string;
  layout: string;
  appearance: string;
  typography: string;
  effects: string;
  interactions: string;
  bsFa: string;
  rawOverride: string;
}

/** Returns true when Typography controls meaningfully affect the element's rendered output. */
export function isTypographyRelevantForElement(el: DesignElement): boolean {
  return !NON_TYPOGRAPHY_TYPES.has(el.type);
}

/** Returns true when the generic top Primary Text input should be displayed in Content. */
export function shouldShowPrimaryTextField(el: DesignElement): boolean {
  return !NON_PRIMARY_TEXT_TYPES.has(el.type);
}

function truncateLabel(value: string, maxLen = 18): string {
  const trimmed = value.trim();
  if (trimmed.length <= maxLen) return trimmed;
  return `${trimmed.slice(0, maxLen - 1)}…`;
}

/** Builds concise 1-line summary badges shown on collapsed Figma-style Inspector sections. */
export function getInspectorSectionSummaries(
  el: DesignElement,
  nestedChildrenCount: number
): InspectorSectionSummaries {
  let contentSummary: string;
  if (el.type === 'image' || el.type === 'pure_image_slot' || el.type === 'pagedoll') {
    contentSummary = el.url?.trim() ? 'Image Set' : 'No URL';
  } else if (el.type === 'moodboard' || el.type === 'gallery') {
    const count = el.gallery && el.gallery.length > 0 ? el.gallery.length : 4;
    contentSummary = `${count} Slots`;
  } else if (el.type === 'tabs' || el.type === 'pure_f2u_tabs') {
    contentSummary = `${(el.tabs || []).length} Tabs`;
  } else if (el.type === 'relationship_tree') {
    const count = el.relationNodes && el.relationNodes.length > 0 ? el.relationNodes.length : 3;
    contentSummary = `${count} Bonds`;
  } else if (el.type === 'palette_strip') {
    const count = el.paletteColors && el.paletteColors.length > 0 ? el.paletteColors.length : 5;
    contentSummary = `${count} Swatches`;
  } else if (el.type === 'fa_watermark') {
    contentSummary = truncateLabel(el.faIcon || el.content || 'Icon');
  } else if (el.type === 'divider' || el.type === 'pure_divider' || el.type === 'pure_line') {
    contentSummary = `${getDisplayBorderWidth(el)}px ${getDisplayBorderStyle(el)}`;
  } else {
    contentSummary = truncateLabel(el.content?.trim() || el.type);
  }

  const layoutParts = [`${el.width}×${el.height}`, `${el.x},${el.y}`];
  if (el.rotation) {
    layoutParts.push(`${el.rotation}°`);
  }
  if (nestedChildrenCount > 0) {
    layoutParts.push(`${nestedChildrenCount} items`);
  }
  const layoutSummary = layoutParts.join(' · ');

  const borderW = getDisplayBorderWidth(el);
  const fillLabel = el.bgColor === 'transparent' ? 'Clear' : el.bgColor;
  const sideTag = el.bordersLinked === false && el.type !== 'pure_line' ? ' 4-side' : '';
  const appearanceSummary = `${fillLabel} · ${borderW}px${sideTag}`;

  const typographySummary = `${el.googleFont || el.fontFamily || 'sans'} · ${el.fontSize}px`;

  const modCount = el.modifiers?.length || 0;
  const activeEffectsCount = [
    el.shadow !== 'none',
    Boolean(el.customBoxShadowEnabled),
    Boolean(el.customTextShadowEnabled),
    Boolean(el.glassBlur && el.glassBlur > 0),
    Boolean(el.innerGlow),
    modCount > 0,
  ].filter(Boolean).length;

  const effectsSummary =
    activeEffectsCount === 0
      ? 'None'
      : modCount > 0
      ? `${activeEffectsCount} Active (${modCount} Mod)`
      : `${activeEffectsCount} Active`;

  const interactionTags: string[] = [];
  if (getElementEffectiveLinkUrl(el)) {
    interactionTags.push('Link');
  } else if (el.clickAction === 'lightbox') {
    interactionTags.push('Lightbox');
  }
  if (el.collapsible) {
    interactionTags.push('Spoiler');
  }
  if (el.hoverEffect !== 'none' || (el.hoverAction && el.hoverAction !== 'none')) {
    interactionTags.push('Hover');
  }
  if (el.idleAnimation && el.idleAnimation !== 'none') {
    interactionTags.push('Anim');
  }
  if (el.tooltip?.trim()) {
    interactionTags.push('Tip');
  }
  const interactionsSummary =
    interactionTags.length > 0 ? interactionTags.join(', ') : 'Static';

  const bsCount = (el.bsClasses || '').split(/\s+/).filter(Boolean).length;
  const hasFa = Boolean(el.faIcon?.trim());
  const bsFaParts: string[] = [];
  if (bsCount > 0) bsFaParts.push(`${bsCount} BS`);
  if (hasFa) bsFaParts.push('FA');
  const bsFaSummary = bsFaParts.length > 0 ? bsFaParts.join(' · ') : 'None';

  const hasRawOverride = Boolean(
    el.customCssClass?.trim() || el.customInlineStyle?.trim() || el.rawInnerHtml?.trim()
  );
  const rawOverrideSummary = hasRawOverride ? 'Active' : 'None';

  return {
    content: contentSummary,
    layout: layoutSummary,
    appearance: appearanceSummary,
    typography: typographySummary,
    effects: effectsSummary,
    interactions: interactionsSummary,
    bsFa: bsFaSummary,
    rawOverride: rawOverrideSummary,
  };
}
