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

const F2U_SAFE_SHAPES = new Set<ImageShape>([
  'rect',
  'circle',
  'pill',
  'arch',
  'leaf',
  'polaroid',
  'diamond',
  'hexagon',
  'hexagon_flat',
  'octagon',
  'bevel',
  'ticket',
  'shield',
  'cross_star',
  'scallop',
  'star',
  'heart',
]);

export function isF2USafeShape(shape?: ImageShape): boolean {
  return !shape || F2U_SAFE_SHAPES.has(shape) || isF2UGeometricShape(shape);
}

export function stripStyleTagsFromHtml(raw: string): string {
  return raw.replace(/<style\b[^>]*>[\s\S]*?<\/style>/gi, '').trim();
}

const SAFE_BODY_TAGS = new Set([
  'b',
  'i',
  'u',
  's',
  'em',
  'strong',
  'small',
  'mark',
  'code',
  'sub',
  'sup',
  'br',
  'p',
  'span',
  'a',
  'hr',
  'ul',
  'ol',
  'li',
  'div',
]);

const VOID_BODY_TAGS = new Set(['br', 'hr']);

export function escapeHtmlAttr(val: string): string {
  return val
    .replace(/&/g, '&amp;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
}

export function isSafeUrlValue(raw: string): boolean {
  if (/["'<>\r\n]/.test(raw)) {
    return false;
  }
  const normalized = raw
    .replace(/&#(\d+);?/g, (_, d: string) => String.fromCharCode(Number(d)))
    .replace(/&#x([0-9a-f]+);?/gi, (_, h: string) => String.fromCharCode(parseInt(h, 16)))
    .replace(/[\s\u0000-\u001f]+/g, '')
    .toLowerCase();
  if (
    normalized.startsWith('javascript:') ||
    normalized.startsWith('vbscript:') ||
    normalized.startsWith('data:text/html') ||
    normalized.startsWith('data:image/svg+xml') ||
    normalized.startsWith('data:application/xhtml+xml') ||
    normalized.startsWith('data:text/xml') ||
    normalized.startsWith('data:application/xml')
  ) {
    return false;
  }
  return true;
}

export function sanitizeHrefUrl(raw?: string, fallback = '#'): string {
  const trimmed = (raw || '').trim();
  if (!trimmed || !isSafeUrlValue(trimmed)) return fallback;
  return escapeHtmlAttr(trimmed);
}

export function escapeCssUrl(raw?: string): string {
  const trimmed = (raw || '').trim();
  if (!trimmed || !isSafeUrlValue(trimmed)) return '';
  if (/['"()\\<>\r\n]/.test(trimmed)) return '';
  return escapeHtmlAttr(trimmed);
}

const F2U_FORBIDDEN_CSS_PROPS = new Set([
  'backdrop-filter',
  '-webkit-backdrop-filter',
  'clip-path',
  '-webkit-clip-path',
  'mask',
  '-webkit-mask',
  'mask-image',
  '-webkit-mask-image',
  'mask-mode',
  '-webkit-mask-composite',
  'mask-composite',
  'filter',
  'mix-blend-mode',
  'transform',
  'transform-origin',
  'animation',
  'animation-name',
  'transition',
]);

function splitCssDeclarations(cssText: string): string[] {
  const parts: string[] = [];
  let current = '';
  let quote: string | null = null;
  let parenDepth = 0;

  for (let i = 0; i < cssText.length; i += 1) {
    const ch = cssText[i];
    if (quote) {
      current += ch;
      if (ch === quote && cssText[i - 1] !== '\\') quote = null;
      continue;
    }
    if (ch === '"' || ch === "'") {
      quote = ch;
      current += ch;
    } else if (ch === '(') {
      parenDepth += 1;
      current += ch;
    } else if (ch === ')') {
      parenDepth = Math.max(0, parenDepth - 1);
      current += ch;
    } else if (ch === ';' && parenDepth === 0) {
      if (current.trim()) parts.push(current.trim());
      current = '';
    } else {
      current += ch;
    }
  }
  if (current.trim()) parts.push(current.trim());
  return parts;
}

function hasUnsafeCssValue(decl: string): boolean {
  const colonIdx = decl.indexOf(':');
  if (colonIdx <= 0) {
    return true;
  }
  const propName = decl.slice(0, colonIdx).trim();
  if (!/^(?:--[a-zA-Z0-9_-]+|-?[a-zA-Z][a-zA-Z0-9-]*)$/.test(propName)) {
    return true;
  }
  if (/[<>{}]/.test(decl)) {
    return true;
  }
  if (/["']\s*\/?\s*(?:on[a-z]+|style|href|src|srcdoc)\s*=/i.test(decl)) {
    return true;
  }
  if (
    ((decl.match(/"/g)?.length ?? 0) % 2 !== 0) ||
    ((decl.match(/'/g)?.length ?? 0) % 2 !== 0)
  ) {
    return true;
  }
  if (/expression\s*\(|javascript:|vbscript:|behavior\s*:/i.test(decl)) {
    return true;
  }
  const urlCallRegex = /url\s*\(([^)]*)\)/gi;
  let match: RegExpExecArray | null;
  while ((match = urlCallRegex.exec(decl)) !== null) {
    const inner = match[1].trim().replace(/^['"]|['"]$/g, '');
    if (!isSafeUrlValue(inner)) return true;
  }
  // Reject malformed unclosed url( if present alongside suspicious schemes
  if (/url\s*\(/i.test(decl) && !/url\s*\([^)]*\)/i.test(decl)) {
    return true;
  }
  return false;
}

function sanitizeSurvivingCssDecl(decl: string): string {
  return decl.replace(/"/g, "'").replace(/[<>]/g, '');
}

/**
 * Sanitizes rich body HTML (`content`, `subContent`, tab/gallery captions) using a strict inline tag
 * whitelist so safe formatting (`<b>`, `<i>`, `<a href>`, `<br>`, `<span style>`, etc.) is preserved
 * while stripping `<script>`, `<style>`, `<iframe>`, `on*` handlers, slash-separated bypasses, and unsafe URLs.
 */
export function sanitizeF2UBodyHtml(raw: string): string {
  if (!raw) return '';
  // Remove dangerous blocks along with their contents (including slash-separated attributes like <script/src=x>)
  let stripped = raw.replace(
    /<(script|style|iframe|object|embed|svg|math|form|textarea|noscript)(?=[\s/>]|$)[^>]*>[\s\S]*?<\/\1>/gi,
    ''
  );
  stripped = stripped.replace(
    /<\/?(script|style|iframe|object|embed|svg|math|form|textarea|noscript)(?=[\s/>]|$)[^>]*\/?>/gi,
    ''
  );

  // Filter individual HTML tags using a safe attribute whitelist (supports space and HTML5 slash attribute separators)
  return stripped.replace(/<\/?([a-zA-Z][a-zA-Z0-9:-]*)((?:[\s/][^<>]*)?)>/g, (full, rawTag: string, rawAttrs = '') => {
    const tag = rawTag.toLowerCase();
    if (!SAFE_BODY_TAGS.has(tag)) return '';
    if (full.startsWith('</')) {
      return VOID_BODY_TAGS.has(tag) ? '' : `</${tag}>`;
    }

    const cleanAttrs: string[] = [];
    const attrRegex = /([a-zA-Z_:][-a-zA-Z0-9_:.]*)(?:\s*=\s*(?:"([^"]*)"|'([^']*)'|([^\s"'=<>`]+)))?/g;
    let m: RegExpExecArray | null;
    while ((m = attrRegex.exec(rawAttrs)) !== null) {
      const name = m[1].toLowerCase();
      const val = m[2] ?? m[3] ?? m[4] ?? '';
      if (name.startsWith('on')) continue;

      if (name === 'href' && tag === 'a') {
        if (!isSafeUrlValue(val)) continue;
        cleanAttrs.push(`href="${escapeHtmlAttr(val.trim())}"`);
      } else if (name === 'target' && tag === 'a') {
        const safeTarget = val === '_blank' ? '_blank' : '_self';
        cleanAttrs.push(`target="${safeTarget}"`);
      } else if (name === 'rel' && tag === 'a') {
        cleanAttrs.push(`rel="${escapeHtmlAttr(val)}"`);
      } else if (name === 'class' || name === 'title') {
        cleanAttrs.push(`${name}="${escapeHtmlAttr(val)}"`);
      } else if (name === 'style') {
        if (hasUnsafeCssValue(val)) continue;
        const { cleanCss } = sanitizeInlineCssForF2U(val);
        if (cleanCss) cleanAttrs.push(`style="${escapeHtmlAttr(cleanCss)}"`);
      }
    }

    const attrStr = cleanAttrs.length > 0 ? ` ${cleanAttrs.join(' ')}` : '';
    if (VOID_BODY_TAGS.has(tag)) return `<${tag}${attrStr} />`;
    return `<${tag}${attrStr}>`;
  });
}

function sanitizeHtmlTagAttributesForPro(tagChunk: string): string {
  const URL_ATTRS = new Set(['href', 'src', 'action', 'formaction', 'xlink:href', 'poster', 'data']);
  return tagChunk.replace(/<\/?([a-zA-Z][a-zA-Z0-9:-]*)((?:[\s/][^<>]*)?)>/g, (full, rawTag: string, rawAttrs = '') => {
    if (full.startsWith('</')) return `</${rawTag}>`;
    const isSelfClosing = full.trimEnd().endsWith('/>');
    const cleanAttrs: string[] = [];
    const attrRegex = /([a-zA-Z_:][-a-zA-Z0-9_:.]*)(?:\s*=\s*(?:"([^"]*)"|'([^']*)'|([^\s"'=<>`]+)))?/g;
    let m: RegExpExecArray | null;
    while ((m = attrRegex.exec(rawAttrs)) !== null) {
      const attrName = m[1];
      const lowerName = attrName.toLowerCase();
      const rawVal = m[2] ?? m[3] ?? m[4];
      if (lowerName.startsWith('on')) continue;

      if (rawVal === undefined) {
        cleanAttrs.push(attrName);
        continue;
      }

      if (URL_ATTRS.has(lowerName)) {
        if (!isSafeUrlValue(rawVal)) continue;
        cleanAttrs.push(`${attrName}="${escapeHtmlAttr(rawVal.trim())}"`);
      } else if (lowerName === 'style') {
        const cleanStyle = sanitizeInlineCssForPro(rawVal);
        if (cleanStyle) cleanAttrs.push(`style="${escapeHtmlAttr(cleanStyle)}"`);
      } else {
        cleanAttrs.push(`${attrName}="${escapeHtmlAttr(rawVal)}"`);
      }
    }
    const attrStr = cleanAttrs.length > 0 ? ` ${cleanAttrs.join(' ')}` : '';
    return isSelfClosing ? `<${rawTag}${attrStr} />` : `<${rawTag}${attrStr}>`;
  });
}

/**
 * Sanitizes Pro custom/raw HTML while preserving `<style>` blocks and rich layout tags:
 * strips `<script>`, `<iframe>`, `<object>`, `<embed>`, `<form>`, `<meta>`, `<base>`, `<noscript>`,
 * all inline `on*` event attributes (including slash-separated), and unsafe `javascript:`/`data:` URLs.
 */
export function sanitizeRichHtmlForPro(raw: string): string {
  if (!raw) return '';
  let stripped = raw;
  // Loop briefly so nested obfuscations like <scr<script>ipt> cannot reassemble dangerous tags
  for (let pass = 0; pass < 2; pass += 1) {
    const next = stripped
      .replace(
        /<(script|iframe|object|embed|form|meta|base|noscript)(?=[\s/>]|$)[^>]*>[\s\S]*?<\/\1>/gi,
        ''
      )
      .replace(
        /<\/?(script|iframe|object|embed|form|meta|base|noscript)(?=[\s/>]|$)[^>]*\/?>/gi,
        ''
      );
    stripped = next;
    if (!/<\/?(script|iframe|object|embed|form|meta|base|noscript)(?=[\s/>]|$)/i.test(stripped)) {
      break;
    }
  }

  // Preserve <style> bodies cleanly while sanitizing <style> opening tag attributes and dangerous CSS expressions
  const styleTokenRegex = /<style((?:[\s/][^<>]*)?)>([\s\S]*?)<\/style>/gi;
  let result = '';
  let lastIndex = 0;
  let styleMatch: RegExpExecArray | null;
  while ((styleMatch = styleTokenRegex.exec(stripped)) !== null) {
    const before = stripped.slice(lastIndex, styleMatch.index);
    result += sanitizeHtmlTagAttributesForPro(before);
    const cleanStyleOpen = sanitizeHtmlTagAttributesForPro(`<style${styleMatch[1] || ''}>`);
    const cleanCssBody = styleMatch[2]
      .replace(/expression\s*\(/gi, 'invalid(')
      .replace(/javascript\s*:/gi, 'invalid:')
      .replace(/vbscript\s*:/gi, 'invalid:')
      .replace(/behavior\s*:/gi, 'invalid:');
    result += `${cleanStyleOpen}${cleanCssBody}</style>`;
    lastIndex = styleMatch.index + styleMatch[0].length;
  }
  result += sanitizeHtmlTagAttributesForPro(stripped.slice(lastIndex));
  return result;
}

export function sanitizeInlineCssForF2U(rawCss?: string): {
  cleanCss: string;
  strippedProps: string[];
} {
  if (!rawCss || !rawCss.trim()) {
    return { cleanCss: '', strippedProps: [] };
  }
  const uncommented = rawCss.replace(/\/\*[\s\S]*?\*\//g, '').trim();
  if (!uncommented) {
    return { cleanCss: '', strippedProps: [] };
  }

  const strippedProps: string[] = [];
  const declarations = splitCssDeclarations(uncommented);

  const safeDeclarations: string[] = [];
  for (const decl of declarations) {
    if (hasUnsafeCssValue(decl)) {
      const colonIdx = decl.indexOf(':');
      strippedProps.push((colonIdx >= 0 ? decl.slice(0, colonIdx) : decl).trim().toLowerCase() || 'unsafe-css');
      continue;
    }
    const colonIdx = decl.indexOf(':');
    const propName = (colonIdx >= 0 ? decl.slice(0, colonIdx) : decl).trim().toLowerCase();
    const propVal = colonIdx >= 0 ? decl.slice(colonIdx + 1) : '';
    if (F2U_FORBIDDEN_CSS_PROPS.has(propName) || /\bcalc\s*\(/i.test(propVal)) {
      strippedProps.push(propName);
      continue;
    }
    safeDeclarations.push(sanitizeSurvivingCssDecl(decl));
  }

  return {
    cleanCss: safeDeclarations.join('; '),
    strippedProps,
  };
}

export function sanitizeInlineCssForPro(rawCss?: string): string {
  if (!rawCss || !rawCss.trim()) return '';
  const uncommented = rawCss.replace(/\/\*[\s\S]*?\*\//g, '').trim();
  if (!uncommented) return '';
  const declarations = splitCssDeclarations(uncommented);
  return declarations
    .filter((decl) => !hasUnsafeCssValue(decl))
    .map(sanitizeSurvivingCssDecl)
    .filter(Boolean)
    .join('; ');
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

  if (el.rotation && Math.round(el.rotation) % 90 !== 0 && el.type !== 'pure_line') {
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

  const preFilteredMods = el.modifiers
    ? el.modifiers.filter((m) => {
        if (!m.enabled) return true;
        if (m.kind === 'boolean_mask') return false;
        if (
          m.kind === 'divider_line' &&
          (m.orientation === 'diag_fwd' || m.orientation === 'diag_back')
        ) {
          return false;
        }
        if (
          m.kind === 'cutout_hole' &&
          m.mode === 'transparent_hole' &&
          (m.shape === 'ticket_corners' || m.shape === 'diamond' || m.shape === 'star')
        ) {
          return false;
        }
        return true;
      })
    : undefined;
  const preFilteredEl: DesignElement = preFilteredMods ? { ...el, modifiers: preFilteredMods } : el;
  const proModifiers = (el.modifiers || []).filter((m) => isModifierProOnly(m, preFilteredEl));
  if (proModifiers.length > 0) {
    items.push({
      key: 'modifiers',
      label: `Pro Modifiers (${proModifiers.length})`,
      detail: 'Boolean SVG mask, diagonal lines, or multi-hole/ticket SVG cutouts require Pro',
      category: 'modifier',
    });
  }

  if (
    (el.hoverEffect && el.hoverEffect !== 'none') ||
    (el.hoverAction && el.hoverAction !== 'none') ||
    (el.imageHoverEffect && el.imageHoverEffect !== 'none')
  ) {
    const hoverName =
      el.hoverEffect && el.hoverEffect !== 'none'
        ? el.hoverEffect
        : el.hoverAction && el.hoverAction !== 'none'
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
  const preFilteredMods = el.modifiers
    ? el.modifiers.filter((m) => {
        if (!m.enabled) return true;
        if (m.kind === 'boolean_mask') return false;
        if (
          m.kind === 'divider_line' &&
          (m.orientation === 'diag_fwd' || m.orientation === 'diag_back')
        ) {
          return false;
        }
        if (
          m.kind === 'cutout_hole' &&
          m.mode === 'transparent_hole' &&
          (m.shape === 'ticket_corners' || m.shape === 'diamond' || m.shape === 'star')
        ) {
          return false;
        }
        return true;
      })
    : undefined;
  const preFilteredEl: DesignElement = preFilteredMods ? { ...el, modifiers: preFilteredMods } : el;
  const safeMods = preFilteredMods
    ? preFilteredMods.filter((m) => !isModifierProOnly(m, preFilteredEl))
    : undefined;

  return {
    ...el,
    glassBlur: 0,
    rotation: el.type === 'pure_line' ? el.rotation : normalizeF2URotation(el.rotation),
    imgRotation: normalizeF2URotation(el.imgRotation),
    hoverEffect: 'none',
    hoverAction: 'none',
    imageHoverEffect: 'none',
    idleAnimation: el.idleAnimation === 'float' ? 'none' : el.idleAnimation,
    imageShape: isF2USafeShape(el.imageShape) ? el.imageShape : 'rect',
    boxClipShape: isF2USafeShape(el.boxClipShape) ? el.boxClipShape : 'rect',
    blendMode: 'normal',
    imgBrightness: undefined,
    imgContrast: undefined,
    imgGrayscale: undefined,
    imgSepia: undefined,
    imgBlur: undefined,
    googleFont: undefined,
    modifiers: safeMods,
    customInlineStyle: cleanCss || undefined,
    customHtml: el.customHtml
      ? stripStyleTagsFromHtml(sanitizeRichHtmlForPro(el.customHtml))
      : el.customHtml,
    rawInnerHtml: el.rawInnerHtml
      ? stripStyleTagsFromHtml(sanitizeRichHtmlForPro(el.rawInnerHtml))
      : el.rawInnerHtml,
  };
}

