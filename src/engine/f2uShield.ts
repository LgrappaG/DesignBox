import { DesignElement, ImageShape, TargetPlatform } from '../types/schema';
import { isF2UGeometricShape } from '../utils/f2uShapeCss';
import { isModifierProOnly } from './modifierRenderer';

export type F2UShieldCategory =
  | 'style_tag'
  | 'backdrop'
  | 'clip'
  | 'transform'
  | 'modifier'
  | 'font';

export interface F2UShieldItem {
  key: string;
  label: string;
  detail: string;
  category: F2UShieldCategory;
}

export interface F2UShieldReport {
  elementId: string;
  isShielded: boolean;
  items: F2UShieldItem[];
  summaryLabel: string;
}

export function isToyhouseFreePlatform(platform: TargetPlatform): boolean {
  return platform === 'toyhouse_free' || platform === 'toyhouse_oc';
}

export function isF2USafeShape(shape?: ImageShape): boolean {
  return (
    !shape ||
    shape === 'rect' ||
    shape === 'circle' ||
    shape === 'pill' ||
    shape === 'arch' ||
    shape === 'leaf' ||
    shape === 'polaroid' ||
    isF2UGeometricShape(shape)
  );
}

export function stripStyleTagsFromHtml(raw: string): string {
  return raw.replace(/<style\b[^>]*>[\s\S]*?<\/style>/gi, '').trim();
}

export function sanitizeInlineCssForF2U(rawCss?: string): {
  cleanCss: string;
  strippedProps: string[];
} {
  if (!rawCss || !rawCss.trim()) {
    return { cleanCss: '', strippedProps: [] };
  }
  const strippedProps: string[] = [];
  const declarations = rawCss
    .split(';')
    .map((part) => part.trim())
    .filter(Boolean);

  const safeDeclarations = declarations.filter((decl) => {
    const colonIdx = decl.indexOf(':');
    const propName = (colonIdx >= 0 ? decl.slice(0, colonIdx) : decl).trim().toLowerCase();
    if (
      propName === 'backdrop-filter' ||
      propName === '-webkit-backdrop-filter' ||
      propName === 'clip-path' ||
      propName === '-webkit-clip-path' ||
      propName === 'mask-image' ||
      propName === '-webkit-mask-image'
    ) {
      strippedProps.push(propName);
      return false;
    }
    return true;
  });

  return {
    cleanCss: safeDeclarations.join('; '),
    strippedProps,
  };
}

function normalizeF2URotation(deg?: number): number | undefined {
  if (!deg) return deg;
  const rounded = Math.round(deg);
  return rounded % 90 === 0 ? rounded : 0;
}

/**
 * Computes every Pro-only setting on `el` that Toyhouse Free (F2U) strips during export
 * and that Canvas temporarily masks without deleting user data.
 */
export function getElementF2UShieldReport(el: DesignElement): F2UShieldReport {
  const items: F2UShieldItem[] = [];

  if (el.glassBlur && el.glassBlur > 0) {
    items.push({
      key: 'glassBlur',
      label: `Glass Blur (${el.glassBlur}px)`,
      detail: 'backdrop-filter: blur() is stripped by Toyhouse Free',
      category: 'backdrop',
    });
  }

  if (el.rotation && Math.round(el.rotation) % 90 !== 0) {
    items.push({
      key: 'rotation',
      label: `Rotation (${el.rotation}° → 0°)` ,
      detail: 'Arbitrary transform: rotate() is stripped on F2U (only 90°/180°/270° use fa-rotate-*)',
      category: 'transform',
    });
  }

  if (el.imgRotation && Math.round(el.imgRotation) % 90 !== 0) {
    items.push({
      key: 'imgRotation',
      label: `Image Tilt (${el.imgRotation}° → 0°)`,
      detail: 'Non-90° image transform rotation is stripped on F2U',
      category: 'transform',
    });
  }

  if (el.type === 'pure_star') {
    items.push({
      key: 'pureShapeClip',
      label: 'Polygon Shape (Star)',
      detail: 'CSS clip-path polygon is stripped on F2U; falls back to box radius',
      category: 'clip',
    });
  }

  if (!isF2USafeShape(el.imageShape)) {
    items.push({
      key: 'imageShape',
      label: `Clip Shape (${el.imageShape})`,
      detail: 'Complex clip-path curves are stripped on F2U; Hexagon, Diamond, Octagon, Bevel, Circle, Pill, Arch & Leaf stay active',
      category: 'clip',
    });
  }

  if (!isF2USafeShape(el.boxClipShape)) {
    items.push({
      key: 'boxClipShape',
      label: `Surface Cut (${el.boxClipShape})`,
      detail: 'Complex polygon clip-path is stripped on F2U; Hexagon, Diamond, Octagon, Bevel, Arch, Leaf, Circle & Pill stay active',
      category: 'clip',
    });
  }

  const proModifiers = (el.modifiers || []).filter((m) => isModifierProOnly(m, el));
  if (proModifiers.length > 0) {
    items.push({
      key: 'modifiers',
      label: `Pro Modifiers (${proModifiers.length})`,
      detail: 'Boolean SVG mask, diagonal lines, or multi-hole/ticket SVG cutouts require Pro',
      category: 'modifier',
    });
  }

  if (
    el.hoverEffect !== 'none' ||
    (el.hoverAction && el.hoverAction !== 'none') ||
    (el.imageHoverEffect && el.imageHoverEffect !== 'none')
  ) {
    const hoverName =
      el.hoverEffect !== 'none'
        ? el.hoverEffect
        : el.hoverAction !== 'none'
        ? el.hoverAction
        : el.imageHoverEffect;
    items.push({
      key: 'hover',
      label: `Hover FX (${hoverName})`,
      detail: ':hover transitions require <style> tags (stripped on F2U)',
      category: 'style_tag',
    });
  }

  if (el.idleAnimation === 'float') {
    items.push({
      key: 'floatAnim',
      label: 'Keyframes (Float)',
      detail: '@keyframes dbx-float requires <style>; FA native anims (bounce/beat/spin/shake/fade) stay live',
      category: 'style_tag',
    });
  }

  if (el.googleFont && el.googleFont.trim()) {
    items.push({
      key: 'googleFont',
      label: `Google Font (${el.googleFont})`,
      detail: '@import Google Fonts requires <style> tags (falls back to system font stack on F2U)',
      category: 'font',
    });
  }

  const { strippedProps } = sanitizeInlineCssForF2U(el.customInlineStyle);
  if (strippedProps.length > 0) {
    items.push({
      key: 'customInlineStyle',
      label: `Custom CSS (${strippedProps.join(', ')})`,
      detail: 'Custom inline Pro CSS declarations are stripped in F2U mode',
      category: 'backdrop',
    });
  }

  if (
    (el.customHtml && /<style\b/i.test(el.customHtml)) ||
    (el.rawInnerHtml && /<style\b/i.test(el.rawInnerHtml))
  ) {
    items.push({
      key: 'customStyleTag',
      label: 'Widget <style> Block',
      detail: 'Embedded <style> tags inside Raw/Widget HTML are stripped on F2U',
      category: 'style_tag',
    });
  }

  const summaryLabel =
    items.length === 0
      ? ''
      : items.length <= 2
      ? items.map((i) => i.label).join(' · ')
      : `${items[0].label} +${items.length - 1} more`;

  return {
    elementId: el.id,
    isShielded: items.length > 0,
    items,
    summaryLabel,
  };
}

/**
 * Returns a non-mutating F2U-masked view of `el` so Canvas rendering & F2U HTML export
 * stay 100% synchronized while preserving all Pro attributes intact in project state.
 */
export function maskElementForF2USimulation(el: DesignElement): DesignElement {
  const { cleanCss } = sanitizeInlineCssForF2U(el.customInlineStyle);
  const safeMods = el.modifiers
    ? el.modifiers.filter((m) => !isModifierProOnly(m, el))
    : undefined;

  return {
    ...el,
    glassBlur: 0,
    rotation: normalizeF2URotation(el.rotation),
    imgRotation: normalizeF2URotation(el.imgRotation),
    hoverEffect: 'none',
    hoverAction: 'none',
    imageHoverEffect: 'none',
    idleAnimation: el.idleAnimation === 'float' ? 'none' : el.idleAnimation,
    imageShape: isF2USafeShape(el.imageShape) ? el.imageShape : 'rect',
    boxClipShape: isF2USafeShape(el.boxClipShape) ? el.boxClipShape : 'rect',
    googleFont: undefined,
    modifiers: safeMods,
    customInlineStyle: cleanCss || undefined,
    customHtml: el.customHtml ? stripStyleTagsFromHtml(el.customHtml) : el.customHtml,
    rawInnerHtml: el.rawInnerHtml ? stripStyleTagsFromHtml(el.rawInnerHtml) : el.rawInnerHtml,
  };
}

