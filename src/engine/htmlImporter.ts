import {
  BorderStyle,
  DesignElement,
  ElementType,
  TabItem,
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
}

export interface HtmlImportOptions {
  uiTheme: 'carbon' | 'paper';
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
  if (el.querySelector('table, svg, iframe, video, audio')) return true;
  if (el.querySelector('[data-toggle="collapse"], .carousel, .accordion')) return true;
  if (el.querySelectorAll('.progress').length > 1) return true;
  // Deeply nested stylized structures beyond simple header/paragraph/img
  const nestedCards = el.querySelectorAll('.card, .row').length;
  if (nestedCards > 0) return true;
  const richLinks = el.querySelectorAll('a, i.fa, i[class*="fa-"]').length;
  if (richLinks > 3) return true;
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

  const parser = new DOMParser();
  const doc = parser.parseFromString(trimmed, 'text/html');
  doc.querySelectorAll('script, style').forEach((n) => n.remove());

  const extractedSwatches = extractHexSwatchesFromHtml(trimmed);
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
    if (!navEl.classList.contains('nav') && !navEl.classList.contains('nav-tabs')) return null;
    if (!contentEl || !contentEl.classList.contains('tab-content')) return null;

    const links = Array.from(navEl.querySelectorAll('.nav-link, a'));
    const panes = Array.from(contentEl.querySelectorAll(':scope > .tab-pane'));
    if (links.length === 0 || panes.length === 0) return null;

    const tabs: TabItem[] = panes.map((pane, idx) => {
      const link = links[idx];
      const title = link?.textContent?.trim() || `Tab ${idx + 1}`;
      const bodyText = pane.textContent?.replace(/\s+/g, ' ').trim() || '';
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

    // 5. Horizontal Rule -> Divider
    if (tag === 'hr') {
      breakdown.boxes += 1;
      const base = createFromType('divider', rowIndex, colSpan, x, y, width, 24);
      return {
        ...applyCommonInlineCssToElement(base, node),
        label: 'Divider Line',
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

  const processNodeList = (nodes: Element[]) => {
    for (let i = 0; i < nodes.length; i++) {
      const node = nodes[i];
      const tag = node.tagName.toLowerCase();

      // Skip blank decorative spacers/comments
      if (tag === 'br') continue;

      // Pair .nav-tabs + next .tab-content into native tabs widget
      if (node.classList.contains('nav') || node.classList.contains('nav-tabs')) {
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
          produced.push(tabEl);
          currentRowIndex += 1;
          currentY += tabEl.height + 16;
          i += 1;
          continue;
        }
      }

      // Bootstrap .row -> convert .col* children horizontally
      if (node.classList.contains('row')) {
        const rowChildren = Array.from(node.children).filter(
          (ch) => ch.tagName.toLowerCase() !== 'br'
        );
        if (rowChildren.length > 0) {
          breakdown.rows += 1;
          let colCursor = 0;
          let rowMaxH = 0;
          const colGap = 12;

          for (const colEl of rowChildren) {
            const span = parseBootstrapColSpan(colEl, rowChildren.length);
            if (colCursor + span > 12 && colCursor > 0) {
              currentRowIndex += 1;
              currentY += rowMaxH + 16;
              colCursor = 0;
              rowMaxH = 0;
            }

            const colX = marginX + Math.round((usableWidth * colCursor) / 12);
            const colW = Math.max(
              80,
              Math.round((usableWidth * span) / 12) - (colCursor + span < 12 ? colGap : 0)
            );

            // Inspect inside single .col wrapper: unwrap if simple single child or convert directly
            const innerChildren = Array.from(colEl.children);
            let parsedEl: DesignElement;
            if (
              innerChildren.length === 2 &&
              (innerChildren[0].classList.contains('nav') ||
                innerChildren[0].classList.contains('nav-tabs')) &&
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
                innerChildren[0].classList.contains('nav-tabs'))
            ) {
              parsedEl = convertLeafNode(
                innerChildren[0],
                currentRowIndex,
                span,
                colX,
                currentY,
                colW
              );
              parsedEl = applyCommonInlineCssToElement(parsedEl, colEl);
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
    (rootElements[0].querySelector(':scope > .row') ||
      rootElements[0].children.length >= 2)
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
