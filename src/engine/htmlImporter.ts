import {
  BgPattern,
  BorderStyle,
  DesignElement,
  ElementType,
  LayoutMode,
  SplitModifier,
  TabItem,
  UiTheme,
} from '../types/schema';
import { buildDefaultElement } from '../utils/elementFactory';

export interface HtmlImportBreakdown {
  rows: number;
  boxes: number;
  tabs: number;
  images: number;
  texts: number;
  buttons: number;
  customWidgets: number;
  styleTagsDetected: number;
}

export interface HtmlImportResult {
  elements: DesignElement[];
  extractedSwatches: string[];
  breakdown: HtmlImportBreakdown;
  warnings: string[];
  roundTripMeta?: {
    mode?: LayoutMode;
    canvasWidth?: number;
    canvasHeight?: number;
    canvasBg?: string;
    canvasPattern?: BgPattern;
  };
}

function decodeRoundTripPayload(rawB64: string): {
  mode?: LayoutMode;
  canvasWidth?: number;
  canvasHeight?: number;
  canvasBg?: string;
  canvasPattern?: BgPattern;
  elements?: DesignElement[];
} | null {
  try {
    const bin = atob(rawB64);
    const bytes = new Uint8Array(bin.length);
    for (let i = 0; i < bin.length; i += 1) {
      bytes[i] = bin.charCodeAt(i);
    }
    const json = new TextDecoder().decode(bytes);
    const parsed = JSON.parse(json) as {
      v?: number;
      mode?: LayoutMode;
      canvasWidth?: number;
      canvasHeight?: number;
      canvasBg?: string;
      canvasPattern?: BgPattern;
      elements?: DesignElement[];
    };
    if (!parsed || !Array.isArray(parsed.elements)) return null;
    return parsed;
  } catch {
    return null;
  }
}

export interface HtmlImportOptions {
  uiTheme: UiTheme;
  canvasWidth?: number;
  startRowIndex?: number;
  startY?: number;
}

function parseInlineStyles(styleAttr: string | null): Record<string, string> {
  const map: Record<string, string> = {};
  if (!styleAttr) return map;
  styleAttr.split(';').forEach((decl) => {
    const colon = decl.indexOf(':');
    if (colon <= 0) return;
    const key = decl.slice(0, colon).trim().toLowerCase();
    const val = decl.slice(colon + 1).trim();
    if (key && val) map[key] = val;
  });
  return map;
}

function extractColorToken(raw: string | undefined): string | undefined {
  if (!raw) return undefined;
  const trimmed = raw.trim();
  if (/^#([0-9a-fA-F]{3}|[0-9a-fA-F]{6}|[0-9a-fA-F]{8})$/.test(trimmed)) return trimmed;
  const hexMatch = trimmed.match(/#[0-9a-fA-F]{3,8}\b/);
  if (hexMatch) return hexMatch[0];
  const rgbMatch = trimmed.match(/rgba?\([^)]+\)/i);
  if (rgbMatch) return rgbMatch[0];
  if (trimmed.toLowerCase() === 'transparent') return 'transparent';
  return undefined;
}

function parseBorderShorthand(borderRaw: string | undefined): {
  width?: number;
  style?: BorderStyle;
  color?: string;
} {
  if (!borderRaw) return {};
  if (/^(0|none)$/i.test(borderRaw.trim())) {
    return { width: 0, color: 'transparent' };
  }
  const widthMatch = borderRaw.match(/(\d+(?:\.\d+)?)px/i);
  const styleMatch = borderRaw.match(/\b(solid|dashed|dotted|double|groove|ridge|inset|outset)\b/i);
  const color = extractColorToken(borderRaw);
  return {
    width: widthMatch ? Math.max(0, Math.round(parseFloat(widthMatch[1]))) : undefined,
    style: styleMatch ? (styleMatch[1].toLowerCase() as BorderStyle) : undefined,
    color,
  };
}

function parsePxNumber(raw: string | undefined): number | undefined {
  if (!raw) return undefined;
  const m = raw.match(/(-?\d+(?:\.\d+)?)px/i);
  return m ? Math.round(parseFloat(m[1])) : undefined;
}

function extractBgImageUrl(raw: string | undefined): string | undefined {
  if (!raw) return undefined;
  const m = raw.match(/url\(\s*['"]?([^'")]+)['"]?\s*\)/i);
  return m ? m[1].trim() : undefined;
}

export function extractHexSwatchesFromHtml(rawHtml: string): string[] {
  const matches = rawHtml.match(/#[0-9a-fA-F]{6}\b|#[0-9a-fA-F]{3}\b/g) || [];
  const normalized = new Map<string, string>();
  matches.forEach((hex) => {
    let full = hex.toLowerCase();
    if (full.length === 4) {
      full = `#${full[1]}${full[1]}${full[2]}${full[2]}${full[3]}${full[3]}`;
    }
    if (!normalized.has(full)) {
      normalized.set(full, full.toUpperCase());
    }
  });
  return Array.from(normalized.values()).slice(0, 12);
}

function parseBootstrapColSpan(el: Element, siblingCount: number): number {
  const cls = el.className || '';
  const exact =
    cls.match(/\bcol-(?:xl|lg|md|sm)-(\d{1,2})\b/) ||
    cls.match(/\bcol-(\d{1,2})\b/);
  if (exact) {
    return Math.max(1, Math.min(12, parseInt(exact[1], 10)));
  }
  if (/\bcol(?:-(?:xl|lg|md|sm))?\b/.test(cls)) {
    return Math.max(2, Math.min(12, Math.floor(12 / Math.max(1, siblingCount))));
  }
  return 12;
}

function hasComplexFallbackMarkup(el: Element): boolean {
  if (el.querySelector('svg, iframe, video, audio, .carousel')) return true;
  if (el.querySelectorAll('.progress').length > 1) return true;
  const nestedRows = el.querySelectorAll('.row').length;
  if (nestedRows > 0) return true;
  const nestedCards = el.querySelectorAll('.card').length;
  if (nestedCards > 1) return true;
  const richLinks = el.querySelectorAll('a, i.fa, i[class*="fa-"]').length;
  if (richLinks > 4) return true;
  return false;
}

function applyCommonInlineCssToElement(base: DesignElement, el: Element): DesignElement {
  const css = parseInlineStyles(el.getAttribute('style'));
  const cls = el.className || '';
  const next: DesignElement = { ...base };

  const bg = extractColorToken(css['background-color'] || css['background']);
  if (bg) next.bgColor = bg;

  const txt = extractColorToken(css['color']);
  if (txt) next.textColor = txt;

  const border = parseBorderShorthand(css['border']);
  if (border.width !== undefined) next.borderWidth = border.width;
  if (border.style) next.borderStyle = border.style;
  if (border.color) next.borderColor = border.color;
  if (/\bborder-0\b/.test(cls)) next.borderWidth = 0;

  const bCol = extractColorToken(css['border-color']);
  if (bCol) next.borderColor = bCol;

  const rad = parsePxNumber(css['border-radius']);
  if (rad !== undefined) {
    next.borderRadius = rad;
    next.radiusTL = rad;
    next.radiusTR = rad;
    next.radiusBR = rad;
    next.radiusBL = rad;
  } else if (/\brounded-circle\b/.test(cls)) {
    next.borderRadius = 999;
  } else if (/\brounded-0\b/.test(cls)) {
    next.borderRadius = 0;
  }

  const pad = parsePxNumber(css['padding']);
  if (pad !== undefined) next.padding = pad;

  const fSize = parsePxNumber(css['font-size']);
  if (fSize !== undefined && fSize >= 9 && fSize <= 72) next.fontSize = fSize;

  if (css['text-align'] === 'center' || /\btext-center\b/.test(cls)) next.textAlign = 'center';
  else if (css['text-align'] === 'right' || /\btext-right\b/.test(cls)) next.textAlign = 'right';

  if (css['font-family'] && /serif/i.test(css['font-family'])) next.fontFamily = 'serif';
  if (css['font-family'] && /mono|courier|consolas/i.test(css['font-family'])) next.fontFamily = 'mono';

  const overflowVal = (css['overflow'] || css['overflow-y'] || '').toLowerCase();
  if (overflowVal === 'auto' || overflowVal === 'scroll') {
    next.scrollable = true;
  }

  // Preserve unrecognized inline CSS properties so external HTML edits round-trip faithfully
  const handledCssProps = new Set([
    'background-color',
    'background',
    'color',
    'border',
    'border-color',
    'border-radius',
    'padding',
    'font-size',
    'text-align',
    'font-family',
    'overflow',
    'overflow-y',
    'position',
    'left',
    'top',
    'width',
    'height',
    'z-index',
  ]);
  const extraDecls = Object.entries(css)
    .filter(([k]) => !handledCssProps.has(k))
    .map(([k, v]) => `${k}: ${v}`);
  if (extraDecls.length > 0) {
    next.customInlineStyle = extraDecls.join('; ');
  }

  return next;
}

export function parseToyhouseHtmlToDesign(
  rawHtml: string,
  options: HtmlImportOptions
): HtmlImportResult {
  const { uiTheme, canvasWidth = 760, startRowIndex = 0, startY = 24 } = options;
  const warnings: string[] = [];
  const breakdown: HtmlImportBreakdown = {
    rows: 0,
    boxes: 0,
    tabs: 0,
    images: 0,
    texts: 0,
    buttons: 0,
    customWidgets: 0,
    styleTagsDetected: 0,
  };

  const trimmed = rawHtml.trim();
  if (!trimmed) {
    return {
      elements: [],
      extractedSwatches: [],
      breakdown,
      warnings: ['Paste HTML markup to inspect and import.'],
    };
  }

  const styleMatches = trimmed.match(/<style\b[^>]*>[\s\S]*?<\/style>/gi) || [];
  breakdown.styleTagsDetected = styleMatches.length;
  if (styleMatches.length > 0) {
    warnings.push(
      `Detected ${styleMatches.length} <style> block(s). They will be stripped automatically when exporting to Toyhouse Free (F2U).`
    );
  }

  const extractedSwatches = extractHexSwatchesFromHtml(trimmed);

  // 1. Check for DesignBox lossless round-trip metadata first
  const roundTripMatch = trimmed.match(/<!--\s*DBX_ROUNDTRIP_V1:([A-Za-z0-9+/=]+)\s*-->/);
  if (roundTripMatch) {
    const decoded = decodeRoundTripPayload(roundTripMatch[1]);
    if (decoded && Array.isArray(decoded.elements) && decoded.elements.length > 0) {
      const cloned = decoded.elements.map((el) => ({ ...el }));
      for (const el of cloned) {
        if (el.type === 'image' || el.type === 'pure_image_slot') breakdown.images += 1;
        else if (el.type === 'tabs' || el.type === 'pure_f2u_tabs') breakdown.tabs += 1;
        else if (el.type === 'button' || el.type === 'pure_link') breakdown.buttons += 1;
        else if (el.type === 'text' || el.type === 'pure_heading' || el.type === 'pure_paragraph') breakdown.texts += 1;
        else if (el.type === 'custom_widget') breakdown.customWidgets += 1;
        else breakdown.boxes += 1;
      }
      return {
        elements: cloned,
        extractedSwatches,
        breakdown,
        warnings,
        roundTripMeta: {
          mode: decoded.mode,
          canvasWidth: decoded.canvasWidth,
          canvasHeight: decoded.canvasHeight,
          canvasBg: decoded.canvasBg,
          canvasPattern: decoded.canvasPattern,
        },
      };
    }
  }

  const parser = new DOMParser();
  const doc = parser.parseFromString(trimmed, 'text/html');
  doc.querySelectorAll('script, style').forEach((n) => n.remove());

  const produced: DesignElement[] = [];

  let currentRowIndex = startRowIndex;
  let currentY = startY;
  const marginX = 20;
  const usableWidth = Math.max(320, canvasWidth - marginX * 2);

  const createFromType = (
    type: ElementType,
    rowIndex: number,
    colSpan: number,
    x: number,
    y: number,
    width: number,
    height: number
  ): DesignElement => {
    const el = buildDefaultElement(type, produced, uiTheme, null);
    const id = `imp-${type}-${produced.length + 1}-${Date.now().toString().slice(-3)}`;
    return {
      ...el,
      id,
      order: produced.length,
      rowIndex,
      colSpan,
      x,
      y,
      width: Math.max(48, Math.round(width)),
      height: Math.max(28, Math.round(height)),
      zIndex: 10 + produced.length,
    };
  };

  const buildCustomWidget = (
    node: Element,
    rowIndex: number,
    colSpan: number,
    x: number,
    y: number,
    width: number,
    height = 140
  ): DesignElement => {
    breakdown.customWidgets += 1;
    const base = createFromType('custom_widget', rowIndex, colSpan, x, y, width, height);
    const styled = applyCommonInlineCssToElement(base, node);
    const tagHint = node.className ? `.${node.className.split(/\s+/)[0]}` : `<${node.tagName.toLowerCase()}>`;
    return {
      ...styled,
      label: `Imported Widget (${tagHint})`,
      content: '',
      subContent: '',
      customHtml: node.outerHTML,
      customPropDefs: [],
      customProps: {},
      padding: parsePxNumber(parseInlineStyles(node.getAttribute('style'))['padding']) ?? 8,
    };
  };

  const tryParseTabPair = (
    navEl: Element,
    contentEl: Element | null,
    rowIndex: number,
    colSpan: number,
    x: number,
    y: number,
    width: number
  ): DesignElement | null => {
    if (
      !navEl.classList.contains('nav') &&
      !navEl.classList.contains('nav-tabs') &&
      !navEl.classList.contains('nav-pills')
    ) {
      return null;
    }
    if (!contentEl || !contentEl.classList.contains('tab-content')) return null;

    const links = Array.from(navEl.querySelectorAll('.nav-link, a'));
    const panes = Array.from(contentEl.querySelectorAll(':scope > .tab-pane'));
    if (links.length === 0 || panes.length === 0) return null;

    const tabs: TabItem[] = links.map((link, idx) => {
      const targetHref = (link.getAttribute('href') || link.getAttribute('data-target') || '').trim();
      const matchedPane =
        targetHref.startsWith('#') && targetHref.length > 1
          ? panes.find((p) => p.id === targetHref.slice(1)) || panes[idx]
          : panes[idx];
      const title = link.textContent?.trim() || `Tab ${idx + 1}`;
      const bodyText = matchedPane?.textContent?.replace(/\s+/g, ' ').trim() || '';
      return {
        id: `imp-tab-${idx + 1}-${Date.now().toString().slice(-3)}`,
        title,
        content: bodyText || `Panel ${idx + 1}`,
      };
    });

    breakdown.tabs += 1;
    const base = createFromType('tabs', rowIndex, colSpan, x, y, width, 160);
    return {
      ...applyCommonInlineCssToElement(base, contentEl),
      label: `Imported Tabs (${tabs.length})`,
      tabs,
    };
  };

  const convertLeafNode = (
    node: Element,
    rowIndex: number,
    colSpan: number,
    x: number,
    y: number,
    width: number
  ): DesignElement => {
    const tag = node.tagName.toLowerCase();
    const cls = node.className || '';
    const css = parseInlineStyles(node.getAttribute('style'));

    // 1. Direct Image or wrapped Image Link
    if (tag === 'img') {
      breakdown.images += 1;
      const src = node.getAttribute('src') || '';
      const base = createFromType('image', rowIndex, colSpan, x, y, width, 180);
      const styled = applyCommonInlineCssToElement(base, node);
      const isCircle =
        /\brounded-circle\b/.test(cls) ||
        (css['border-radius'] || '').includes('50%');
      const wAttr = parsePxNumber(css['width']) || parseInt(node.getAttribute('width') || '', 10);
      const hAttr = parsePxNumber(css['height']) || parseInt(node.getAttribute('height') || '', 10);
      return {
        ...styled,
        label: node.getAttribute('alt')?.trim() || 'Imported Image',
        url: src || base.url,
        imageShape: isCircle ? 'circle' : 'rect',
        width: !Number.isNaN(wAttr) && wAttr ? Math.min(width, Math.max(48, wAttr)) : styled.width,
        height: !Number.isNaN(hAttr) && hAttr ? Math.max(48, hAttr) : 180,
      };
    }

    // Single image inside an <a> or simple container div
    const directImgs = node.querySelectorAll('img');
    const textLen = (node.textContent || '').trim().length;
    if (directImgs.length === 1 && textLen < 24 && !node.querySelector('.row, .nav-tabs, table')) {
      const imgEl = directImgs[0];
      const converted = convertLeafNode(imgEl, rowIndex, colSpan, x, y, width);
      return {
        ...applyCommonInlineCssToElement(converted, node),
        url: imgEl.getAttribute('src') || converted.url,
      };
    }

    // Background image div with minimal text
    const bgUrl = extractBgImageUrl(css['background-image'] || css['background']);
    if (bgUrl && textLen < 30 && !node.querySelector('.row, .card, .nav-tabs')) {
      breakdown.images += 1;
      const base = createFromType('image', rowIndex, colSpan, x, y, width, parsePxNumber(css['height']) || 180);
      const isCircle = /\brounded-circle\b/.test(cls) || (css['border-radius'] || '').includes('50%');
      return {
        ...applyCommonInlineCssToElement(base, node),
        label: 'Imported Background Image',
        url: bgUrl,
        imageShape: isCircle ? 'circle' : 'rect',
      };
    }

    // 2. Headings h1-h6
    if (/^h[1-6]$/.test(tag)) {
      breakdown.texts += 1;
      const base = createFromType('pure_heading', rowIndex, colSpan, x, y, width, 56);
      const levelSizes: Record<string, number> = { h1: 28, h2: 24, h3: 20, h4: 17, h5: 15, h6: 13 };
      return {
        ...applyCommonInlineCssToElement(base, node),
        label: `Heading (${tag.toUpperCase()})`,
        content: node.textContent?.trim() || 'Heading',
        subContent: '',
        fontSize: levelSizes[tag] || 20,
        fontWeight: 'bold',
      };
    }

    // 3. Blockquote -> Quote Bubble
    if (tag === 'blockquote') {
      breakdown.texts += 1;
      const citeEl = node.querySelector('footer, cite, small');
      const citeText = citeEl?.textContent?.trim() || '';
      const bodyText = node.textContent?.replace(citeText, '').trim() || 'Quote';
      const base = createFromType('quote_bubble', rowIndex, colSpan, x, y, width, 96);
      return {
        ...applyCommonInlineCssToElement(base, node),
        label: 'Imported Quote',
        content: bodyText,
        subContent: citeText,
      };
    }

    // 4. Button / Link CTA
    if (tag === 'a' && (/\bbtn\b/.test(cls) || Boolean(css['background'] || css['background-color']))) {
      breakdown.buttons += 1;
      const base = createFromType('button', rowIndex, colSpan, x, y, Math.min(width, 220), 42);
      return {
        ...applyCommonInlineCssToElement(base, node),
        label: node.textContent?.trim() || 'Link Button',
        content: node.textContent?.trim() || 'LINK',
        linkUrl: node.getAttribute('href') || '#',
      };
    }

    // 4b. Bootstrap Progress Bar (.progress / .progress-bar) -> pure_progress
    if (
      node.classList.contains('progress') ||
      node.classList.contains('progress-bar') ||
      Boolean(node.querySelector('.progress-bar') && !node.querySelector('.card, .row'))
    ) {
      const barEl = node.classList.contains('progress-bar')
        ? node
        : node.querySelector('.progress-bar') || node;
      const barCss = parseInlineStyles(barEl.getAttribute('style'));
      const ariaVal = parseFloat(barEl.getAttribute('aria-valuenow') || '');
      const widthMatch = (barCss['width'] || '').match(/(\d+(?:\.\d+)?)\s*%/);
      const pct = Math.max(
        0,
        Math.min(
          100,
          Math.round(
            !Number.isNaN(ariaVal)
              ? ariaVal
              : widthMatch
              ? parseFloat(widthMatch[1])
              : 65
          )
        )
      );
      const barColor = extractColorToken(barCss['background-color'] || barCss['background']);
      const base = createFromType('pure_progress', rowIndex, colSpan, x, y, width, 54);
      const styled = applyCommonInlineCssToElement(base, node);
      breakdown.boxes += 1;
      return {
        ...styled,
        label: 'Imported Progress Bar',
        content: barEl.textContent?.trim() || 'Progress',
        subContent: String(pct),
        progressBarColor: barColor || styled.progressBarColor,
        progressStriped: barEl.classList.contains('progress-bar-striped'),
        progressAnimated: barEl.classList.contains('progress-bar-animated'),
      };
    }

    // 4c. Native HTML <details><summary> -> accordion
    if (tag === 'details') {
      const summaryEl = node.querySelector('summary');
      const headerText = summaryEl?.textContent?.trim() || 'Details';
      const bodyParts = Array.from(node.childNodes)
        .filter((ch) => ch !== summaryEl)
        .map((ch) => ch.textContent?.trim() || '')
        .filter(Boolean);
      const bodyText = bodyParts.join(' ').replace(/\s+/g, ' ').trim();
      const base = createFromType('accordion', rowIndex, colSpan, x, y, width, 88);
      breakdown.boxes += 1;
      return {
        ...applyCommonInlineCssToElement(base, node),
        label: 'Imported Accordion',
        content: headerText,
        subContent: bodyText || 'Collapsible content.',
        collapseDefaultOpen: node.hasAttribute('open'),
      };
    }

    // 4d. Bootstrap .alert -> dni_warning
    if (node.classList.contains('alert')) {
      const headEl = node.querySelector('h1, h2, h3, h4, h5, h6, strong, b, .alert-heading');
      const fullText = node.textContent?.replace(/\s+/g, ' ').trim() || 'Notice';
      const headText = headEl?.textContent?.trim() || 'NOTICE';
      const bodyText = headEl
        ? fullText.replace(headText, '').trim() || fullText
        : fullText;
      const base = createFromType('dni_warning', rowIndex, colSpan, x, y, width, 78);
      breakdown.boxes += 1;
      return {
        ...applyCommonInlineCssToElement(base, node),
        label: 'Imported Alert',
        content: headText,
        subContent: bodyText,
        bsClasses: cls,
      };
    }

    // 4e. Bootstrap .badge / .badge-pill -> badge
    if (node.classList.contains('badge')) {
      const badgeText = node.textContent?.trim() || 'BADGE';
      const isPill = node.classList.contains('badge-pill') || /\brounded-pill\b/.test(cls);
      const estW = Math.max(96, Math.min(width, badgeText.length * 9 + 42));
      const base = createFromType('badge', rowIndex, colSpan, x, y, estW, 38);
      const styled = applyCommonInlineCssToElement(base, node);
      breakdown.boxes += 1;
      return {
        ...styled,
        label: badgeText.slice(0, 24),
        content: badgeText,
        ...(isPill
          ? {
              borderRadius: 999,
              radiusTL: 999,
              radiusTR: 999,
              radiusBR: 999,
              radiusBL: 999,
              cornersLinked: true,
            }
          : {}),
      };
    }

    // 4f. Lists <ul> / <ol> -> pure_list
    if (
      (tag === 'ul' || tag === 'ol') &&
      !node.classList.contains('nav') &&
      !node.classList.contains('nav-tabs') &&
      !node.classList.contains('nav-pills')
    ) {
      const liItems = Array.from(node.querySelectorAll('li'))
        .map((li) => li.textContent?.replace(/\s+/g, ' ').trim() || '')
        .filter(Boolean);
      const estH = Math.max(64, Math.min(280, 32 + liItems.length * 24));
      const base = createFromType('pure_list', rowIndex, colSpan, x, y, width, estH);
      breakdown.texts += 1;
      return {
        ...applyCommonInlineCssToElement(base, node),
        label: tag === 'ol' ? 'Numbered List' : 'Bullet List',
        content: '',
        subContent: liItems.join('\n') || 'First item',
        listStyleType: tag === 'ol' ? 'decimal' : 'disc',
      };
    }

    // 5. Horizontal Rule -> Divider
    if (tag === 'hr') {
      breakdown.boxes += 1;
      const base = createFromType('divider', rowIndex, colSpan, x, y, width, 24);
      const topBorder = parseBorderShorthand(css['border-top']);
      const styled = applyCommonInlineCssToElement(base, node);
      return {
        ...styled,
        label: 'Divider Line',
        borderWidth: topBorder.width ?? styled.borderWidth,
        borderStyle: topBorder.style ?? styled.borderStyle,
        borderColor: topBorder.color ?? styled.borderColor,
      };
    }

    // 6. Paragraphs
    if (tag === 'p') {
      breakdown.texts += 1;
      const estH = Math.max(60, Math.min(260, 36 + Math.ceil(textLen / 55) * 20));
      const base = createFromType('text', rowIndex, colSpan, x, y, width, estH);
      return {
        ...applyCommonInlineCssToElement(base, node),
        label: 'Imported Paragraph',
        content: '',
        subContent: node.textContent?.trim() || '',
        bgColor: 'transparent',
        borderWidth: 0,
      };
    }

    // 7. Standalone FontAwesome watermark / icon node
    if (
      (tag === 'i' || tag === 'span') &&
      (/\bfa[a-z-]*\b/.test(cls) || Boolean(node.querySelector(':scope > i[class*="fa-"]'))) &&
      textLen < 4
    ) {
      const iconEl = tag === 'i' ? node : node.querySelector('i[class*="fa-"]');
      const faCls = iconEl?.className.trim() || cls.trim() || 'fa-solid fa-star';
      const base = createFromType('fa_watermark', rowIndex, colSpan, x, y, Math.min(width, 120), 110);
      return {
        ...applyCommonInlineCssToElement(base, node),
        label: 'Imported FA Icon',
        faIcon: faCls,
        content: faCls,
      };
    }

    // 8. Styled Card / Scrollbox / Generic Box vs Complex HTML Custom Widget Fallback
    if (hasComplexFallbackMarkup(node)) {
      return buildCustomWidget(node, rowIndex, colSpan, x, y, width, 160);
    }

    // Simple card or styled box with header + body text
    const isCardOrBox =
      tag === 'div' &&
      (/\bcard\b/.test(cls) ||
        Boolean(css['background'] || css['background-color'] || css['border']));

    if (isCardOrBox || tag === 'div') {
      const cardHeader = node.querySelector('.card-header, h1, h2, h3, h4, h5, h6');
      const headerText = cardHeader?.textContent?.trim() || '';
      const paragraphs = Array.from(node.querySelectorAll('p, .card-body, .card-block, .card-text'));
      const rawBodyText =
        paragraphs.length > 0
          ? paragraphs
              .map((p) => p.textContent?.trim())
              .filter(Boolean)
              .join('\n\n')
          : node.textContent?.replace(headerText, '').replace(/\s+/g, ' ').trim() || '';

      const overflowVal = (css['overflow'] || css['overflow-y'] || '').toLowerCase();
      const maxH = parsePxNumber(css['max-height'] || css['height']);
      const isScroll = overflowVal === 'auto' || overflowVal === 'scroll' || Boolean(maxH && maxH >= 90);
      const targetType: ElementType = isScroll ? 'scrollbox' : 'box';
      const estHeight = Math.max(88, Math.min(320, maxH || 70 + Math.ceil((headerText.length + rawBodyText.length) / 48) * 18));

      breakdown.boxes += 1;
      const base = createFromType(targetType, rowIndex, colSpan, x, y, width, estHeight);
      const styled = applyCommonInlineCssToElement(base, node);
      return {
        ...styled,
        label: headerText ? headerText.slice(0, 28) : isScroll ? 'Imported Scrollbox' : 'Imported Card Box',
        content: headerText,
        subContent: rawBodyText,
        scrollable: isScroll || styled.scrollable,
      };
    }

    // Anything else goes losslessly to Custom Widget
    return buildCustomWidget(node, rowIndex, colSpan, x, y, width, 120);
  };

  const consumedNodes = new Set<Element>();

  const hasRichNestedWidget = (el: Element): boolean =>
    Boolean(
      el.querySelector(
        '.nav-tabs, .nav-pills, .tab-content, .progress, details, [data-toggle="collapse"], .alert, table, .row, ul, ol, img'
      )
    );

  const extractColumnText = (el: Element): string => {
    const blocks = Array.from(el.querySelectorAll('p, h1, h2, h3, h4, h5, h6, .card-body, .card-text'));
    if (blocks.length > 0) {
      return blocks
        .map((b) => b.textContent?.replace(/\s+/g, ' ').trim())
        .filter(Boolean)
        .join('\n\n');
    }
    return el.textContent?.replace(/\s+/g, ' ').trim() || '';
  };

  const processNodeList = (nodes: Element[]) => {
    for (let i = 0; i < nodes.length; i++) {
      const node = nodes[i];
      if (consumedNodes.has(node)) continue;
      const tag = node.tagName.toLowerCase();

      // Skip blank decorative spacers/comments
      if (tag === 'br') continue;

      // Pair [data-toggle="collapse"] trigger + target .collapse panel -> accordion
      const collapseTrigger =
        node.getAttribute('data-toggle') === 'collapse'
          ? node
          : node.querySelector('[data-toggle="collapse"]');
      if (collapseTrigger) {
        const rawTarget = (
          collapseTrigger.getAttribute('href') ||
          collapseTrigger.getAttribute('data-target') ||
          ''
        ).trim();
        const targetId = rawTarget.startsWith('#') ? rawTarget.slice(1) : rawTarget;
        const siblingTarget =
          nodes[i + 1] &&
          (nodes[i + 1].classList.contains('collapse') ||
            (targetId !== '' && nodes[i + 1].id === targetId))
            ? nodes[i + 1]
            : null;
        const targetEl =
          siblingTarget ||
          node.querySelector('.collapse') ||
          (targetId ? doc.querySelector(`#${targetId}`) : null);

        if (targetEl) {
          consumedNodes.add(targetEl);
          const title = collapseTrigger.textContent?.replace(/\s+/g, ' ').trim() || 'Accordion';
          const bodyNode = targetEl.querySelector('.card-body, .card-block') || targetEl;
          const bodyText = bodyNode.textContent?.replace(/\s+/g, ' ').trim() || '';
          const base = createFromType('accordion', currentRowIndex, 12, marginX, currentY, usableWidth, 88);
          const styled = applyCommonInlineCssToElement(base, node);
          breakdown.boxes += 1;
          produced.push({
            ...styled,
            label: 'Imported Collapse Accordion',
            content: title,
            subContent: bodyText || 'Collapsed content.',
            collapseDefaultOpen: targetEl.classList.contains('show'),
            f2uCollapseId: targetId || undefined,
          });
          currentRowIndex += 1;
          currentY += 104;
          continue;
        }
      }

      // Pair .nav-tabs / .nav-pills + next .tab-content into native tabs widget
      if (
        node.classList.contains('nav') ||
        node.classList.contains('nav-tabs') ||
        node.classList.contains('nav-pills')
      ) {
        const nextNode = nodes[i + 1] || null;
        const tabEl = tryParseTabPair(
          node,
          nextNode,
          currentRowIndex,
          12,
          marginX,
          currentY,
          usableWidth
        );
        if (tabEl) {
          if (nextNode) consumedNodes.add(nextNode);
          produced.push(tabEl);
          currentRowIndex += 1;
          currentY += tabEl.height + 16;
          i += 1;
          continue;
        }
      }

      // Bootstrap .row -> 2-col split_box or proportional multi-column 12-grid placement
      if (node.classList.contains('row')) {
        const rowChildren = Array.from(node.children).filter(
          (ch) => ch.tagName.toLowerCase() !== 'br'
        );
        if (rowChildren.length > 0) {
          breakdown.rows += 1;

          // 2-column simple row -> split_box with exact split ratio
          if (
            rowChildren.length === 2 &&
            !hasRichNestedWidget(rowChildren[0]) &&
            !hasRichNestedWidget(rowChildren[1])
          ) {
            const [col1, col2] = rowChildren;
            const span1 = parseBootstrapColSpan(col1, 2);
            const span2 = parseBootstrapColSpan(col2, 2);
            const ratio = Math.max(
              15,
              Math.min(85, Math.round((span1 / Math.max(1, span1 + span2)) * 100))
            );
            const leftText = extractColumnText(col1);
            const rightText = extractColumnText(col2);
            const col1Css = parseInlineStyles(col1.getAttribute('style'));
            const col2Css = parseInlineStyles(col2.getAttribute('style'));
            const base = createFromType('split_box', currentRowIndex, 12, 0, currentY, canvasWidth, 148);
            const splitMod: SplitModifier = {
              id: `imp-split-${produced.length + 1}`,
              kind: 'split',
              enabled: true,
              axis: 'vertical',
              panes: 2,
              ratio,
              dividerWidth: 1,
              dividerStyle: 'solid',
              dividerColor: base.borderColor,
              pane1Bg: extractColorToken(col1Css['background-color'] || col1Css['background']),
              pane2Bg: extractColorToken(col2Css['background-color'] || col2Css['background']),
              pane1Text: leftText,
              pane2Text: rightText,
            };
            breakdown.boxes += 1;
            produced.push({
              ...applyCommonInlineCssToElement(base, node),
              label: 'Imported Split Box',
              content: '',
              subContent: `${leftText} || ${rightText}`,
              modifiers: [splitMod],
            });
            currentRowIndex += 1;
            currentY += 164;
            continue;
          }

          let colCursor = 0;
          let usedRowW = 0;
          let rowMaxH = 0;

          for (const colEl of rowChildren) {
            const span = parseBootstrapColSpan(colEl, rowChildren.length);
            if (colCursor + span > 12 && colCursor > 0) {
              currentRowIndex += 1;
              currentY += rowMaxH + 16;
              colCursor = 0;
              usedRowW = 0;
              rowMaxH = 0;
            }

            const colX = Math.round((canvasWidth * colCursor) / 12);
            const remainingCols = 12 - (colCursor + span);
            const colW = Math.max(
              48,
              remainingCols <= 0
                ? canvasWidth - usedRowW
                : Math.round((canvasWidth * span) / 12)
            );
            usedRowW += colW;

            // Inspect inside single .col wrapper: unwrap if simple single child or convert directly
            const innerChildren = Array.from(colEl.children);
            let parsedEl: DesignElement;
            if (
              innerChildren.length === 2 &&
              (innerChildren[0].classList.contains('nav') ||
                innerChildren[0].classList.contains('nav-tabs') ||
                innerChildren[0].classList.contains('nav-pills')) &&
              innerChildren[1].classList.contains('tab-content')
            ) {
              parsedEl =
                tryParseTabPair(
                  innerChildren[0],
                  innerChildren[1],
                  currentRowIndex,
                  span,
                  colX,
                  currentY,
                  colW
                ) || buildCustomWidget(colEl, currentRowIndex, span, colX, colYOrZero(currentY), colW);
            } else if (
              innerChildren.length === 1 &&
              (innerChildren[0].classList.contains('card') ||
                innerChildren[0].tagName.toLowerCase() === 'img' ||
                innerChildren[0].classList.contains('nav-tabs') ||
                innerChildren[0].classList.contains('progress') ||
                innerChildren[0].classList.contains('alert') ||
                innerChildren[0].classList.contains('badge') ||
                innerChildren[0].tagName.toLowerCase() === 'details' ||
                innerChildren[0].tagName.toLowerCase() === 'ul' ||
                innerChildren[0].tagName.toLowerCase() === 'ol')
            ) {
              parsedEl = convertLeafNode(
                innerChildren[0],
                currentRowIndex,
                span,
                colX,
                currentY,
                colW
              );
              parsedEl = {
                ...applyCommonInlineCssToElement(parsedEl, colEl),
                x: colX,
                width: colW,
              };
            } else {
              parsedEl = convertLeafNode(colEl, currentRowIndex, span, colX, currentY, colW);
            }

            produced.push(parsedEl);
            rowMaxH = Math.max(rowMaxH, parsedEl.height);
            colCursor += span;
          }

          currentRowIndex += 1;
          currentY += (rowMaxH || 120) + 16;
          continue;
        }
      }

      // Unwrap outer wrapper container if it solely wraps .row or block layout elements
      const childEls = Array.from(node.children);
      if (
        tag === 'div' &&
        (node.querySelector(':scope > .row') ||
          (childEls.length >= 2 && node.querySelector(':scope > .nav-tabs')))
      ) {
        processNodeList(childEls);
        continue;
      }

      // If node is a .card wrapping a .nav-tabs + .tab-content inside itself
      if (
        node.classList.contains('card') &&
        node.querySelector('.nav-tabs') &&
        node.querySelector('.tab-content')
      ) {
        const nav = node.querySelector('.nav-tabs, .nav');
        const tabContent = node.querySelector('.tab-content');
        if (nav) {
          const tabEl = tryParseTabPair(
            nav,
            tabContent,
            currentRowIndex,
            12,
            marginX,
            currentY,
            usableWidth
          );
          if (tabEl) {
            const cardStyled = applyCommonInlineCssToElement(tabEl, node);
            produced.push(cardStyled);
            currentRowIndex += 1;
            currentY += cardStyled.height + 16;
            continue;
          }
        }
      }

      // Position: absolute freeform collage element (from external Toyhouse codes or Freeform stage)
      const nodeCss = parseInlineStyles(node.getAttribute('style'));
      if (nodeCss['position'] === 'absolute') {
        const parseCoord = (raw: string | undefined, refTotal: number): number | undefined => {
          if (!raw) return undefined;
          const pctM = raw.match(/(-?\d+(?:\.\d+)?)%/);
          if (pctM) return Math.round((parseFloat(pctM[1]) / 100) * refTotal);
          return parsePxNumber(raw);
        };
        const absX = parseCoord(nodeCss['left'], canvasWidth) ?? marginX;
        const absY = parseCoord(nodeCss['top'], 540) ?? currentY;
        const absW = parseCoord(nodeCss['width'], canvasWidth) ?? 220;
        const absH = parseCoord(nodeCss['height'], 540) ?? 120;
        const absZ = parseInt(nodeCss['z-index'] || '10', 10) || 10;
        const innerTarget = node.children.length === 1 ? node.children[0] : node;
        const leaf = convertLeafNode(innerTarget, currentRowIndex, 6, absX, absY, absW);
        produced.push({
          ...leaf,
          x: Math.max(0, absX),
          y: Math.max(0, absY),
          width: Math.max(24, absW),
          height: Math.max(20, absH),
          zIndex: absZ,
        });
        currentRowIndex += 1;
        continue;
      }

      // Unwrap outer relative/freeform stage wrapper if its children are absolute-positioned
      if (
        tag === 'div' &&
        node.children.length >= 1 &&
        Array.from(node.children).some(
          (ch) => parseInlineStyles(ch.getAttribute('style'))['position'] === 'absolute'
        )
      ) {
        processNodeList(Array.from(node.children));
        continue;
      }

      const leaf = convertLeafNode(node, currentRowIndex, 12, marginX, currentY, usableWidth);
      produced.push(leaf);
      currentRowIndex += 1;
      currentY += leaf.height + 16;
    }
  };

  const rootElements = Array.from(doc.body.children);
  if (rootElements.length === 0 && doc.body.textContent?.trim()) {
    breakdown.texts += 1;
    const textOnly = createFromType('text', currentRowIndex, 12, marginX, currentY, usableWidth, 100);
    produced.push({
      ...textOnly,
      label: 'Imported Text',
      content: '',
      subContent: doc.body.textContent.trim(),
    });
  } else if (
    rootElements.length === 1 &&
    rootElements[0].tagName.toLowerCase() === 'div' &&
    !rootElements[0].classList.contains('row') &&
    !rootElements[0].classList.contains('card') &&
    !rootElements[0].classList.contains('alert') &&
    !rootElements[0].classList.contains('tab-content') &&
    (rootElements[0].querySelector(':scope > .row') ||
      rootElements[0].children.length >= 2 ||
      Array.from(rootElements[0].children).some(
        (ch) =>
          parseInlineStyles(ch.getAttribute('style'))['position'] === 'relative' ||
          parseInlineStyles(ch.getAttribute('style'))['position'] === 'absolute'
      ))
  ) {
    // Unwrap outermost centering/max-width page shell
    processNodeList(Array.from(rootElements[0].children));
  } else {
    processNodeList(rootElements);
  }

  return {
    elements: produced,
    extractedSwatches,
    breakdown,
    warnings,
  };
}

function colYOrZero(y: number): number {
  return Math.max(0, y);
}
