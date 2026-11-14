import test from 'node:test';
import assert from 'node:assert/strict';
import { installNodeDomParser } from './helpers/nodeDomParser';

installNodeDomParser();

import { searchStudioCatalog } from '../src/data/searchCatalog';
import { parseToyhouseHtmlToDesign } from '../src/engine/htmlImporter';
import { getElementF2UShieldReport } from '../src/engine/f2uShield';
import {
  generatePlatformExport,
  getElementEffectiveLinkUrl,
} from '../src/engine/layoutSolver';
import { DesignElement } from '../src/types/schema';
import { buildDefaultElement } from '../src/utils/elementFactory';
import { buildF2UAngledLineCss, buildF2URadialCutoutCss } from '../src/utils/f2uShapeCss';
import {
  buildCuteThemeCssVars,
  DEFAULT_CUTE_THEME_COLORS,
  DEFAULT_KEYBINDINGS,
  DEFAULT_STUDIO_PREFERENCES,
  extractDesignImageUrls,
  matchesShortcut,
  resolveRulerPalette,
  SHORTCUT_PROFILES,
} from '../src/utils/studioSettings';

function makeBaseElement(overrides: Partial<DesignElement> = {}): DesignElement {
  return {
    id: 'el-test-1',
    type: 'box',
    label: 'Test Box',
    content: 'Hello World',
    subContent: '',
    x: 48,
    y: 72,
    width: 240,
    height: 140,
    rotation: 0,
    zIndex: 12,
    opacity: 100,
    order: 0,
    rowIndex: 1,
    colSpan: 6,
    bgColor: '#FFFFFF',
    textColor: '#2C2A28',
    borderColor: '#C86D51',
    borderWidth: 2,
    borderStyle: 'solid',
    borderRadius: 10,
    padding: 12,
    fontSize: 13,
    fontWeight: 'medium',
    textAlign: 'left',
    shadow: 'none',
    hoverEffect: 'none',
    ...overrides,
  };
}

test('DBX_ROUNDTRIP_V1 exports cleanly and restores freeform state + Pro properties losslessly', () => {
  const proBox = makeBaseElement({
    id: 'rt-1',
    label: 'Pro Ticket Panel',
    x: 84,
    y: 110,
    width: 310,
    height: 170,
    rotation: 25,
    glassBlur: 8,
    boxClipShape: 'ticket',
  });

  const exp = generatePlatformExport(
    [proBox],
    'freeform',
    'toyhouse_free',
    760,
    540,
    'transparent',
    'none'
  );

  assert.equal(exp.html.includes('DBX_ROUNDTRIP_V1:'), true);
  assert.equal(exp.html.includes('<style'), false);
  assert.equal(exp.html.includes('backdrop-filter'), false);
  assert.equal(exp.html.includes('clip-path'), false);

  const imported = parseToyhouseHtmlToDesign(exp.html, {
    canvasWidth: 760,
    uiTheme: 'paper',
    existingCount: 0,
    maxRowIndex: 0,
    startY: 24,
  });

  assert.equal(imported.roundTripMeta?.mode, 'freeform');
  assert.equal(imported.roundTripMeta?.canvasWidth, 760);
  assert.equal(imported.roundTripMeta?.canvasHeight, 540);
  assert.equal(imported.roundTripMeta?.canvasBg, 'transparent');
  assert.equal(imported.elements.length, 1);

  const restored = imported.elements[0];
  assert.equal(restored.x, 84);
  assert.equal(restored.y, 110);
  assert.equal(restored.width, 310);
  assert.equal(restored.height, 170);
  assert.equal(restored.rotation, 25);
  assert.equal(restored.glassBlur, 8);
  assert.equal(restored.boxClipShape, 'ticket');
});

test('F2U angled lines, radial cutouts, and pure_star emit HTMLPurifier-safe inline CSS', () => {
  const lineCss = buildF2UAngledLineCss(45, '#C86D51', 3);
  assert.equal(lineCss.includes('linear-gradient'), true);
  assert.equal(lineCss.includes('clip-path'), false);
  assert.equal(lineCss.includes('calc('), false);

  const ticketCss = buildF2URadialCutoutCss('ticket', '#FAF8F5', '#18181B');
  assert.equal(ticketCss.includes('radial-gradient'), true);
  assert.equal(ticketCss.includes('clip-path'), false);
  assert.equal(ticketCss.includes('<svg'), false);

  const angledLine = makeBaseElement({
    id: 'f2u-line',
    type: 'pure_line',
    width: 180,
    height: 40,
    rotation: 33,
    borderColor: '#C86D51',
    borderWidth: 2,
  });
  const starIcon = makeBaseElement({
    id: 'f2u-star',
    type: 'pure_star',
    width: 64,
    height: 64,
    bgColor: '#D4A373',
  });
  const heartBox = makeBaseElement({
    id: 'f2u-heart-box',
    type: 'pure_box',
    boxClipShape: 'heart',
    bgColor: '#E11D48',
  });
  const shieldBox = makeBaseElement({
    id: 'f2u-shield-box',
    type: 'pure_box',
    boxClipShape: 'shield',
    bgColor: '#2563EB',
  });

  const exp = generatePlatformExport(
    [angledLine, starIcon, heartBox, shieldBox],
    'freeform',
    'toyhouse_free',
    760,
    540,
    'transparent',
    'none'
  );

  assert.equal(exp.html.includes('linear-gradient('), true);
  assert.equal(exp.html.includes('fa-star'), true);
  assert.equal(exp.html.includes('fa-heart'), true);
  assert.equal(exp.html.includes('fa-shield-alt'), true);
  assert.equal(exp.html.includes('<style'), false);
  assert.equal(exp.html.includes('<svg'), false);
  assert.equal(exp.html.includes('clip-path'), false);
  assert.equal(exp.html.includes('calc('), false);
  assert.equal(getElementF2UShieldReport(angledLine).isShielded, false);
});

test('searchStudioCatalog matches English and Toyhouse community semantic tags', () => {
  const dniResults = searchStudioCatalog('dni', true, [], 20);
  assert.equal(dniResults.length > 0, true);

  const spotifyResults = searchStudioCatalog('spotify', true, [], 20);
  assert.equal(
    spotifyResults.some(
      (item) =>
        item.elementType === 'music_player' ||
        item.elementType === 'cassette_player' ||
        item.id.includes('music')
    ),
    true
  );

  const spoilerResults = searchStudioCatalog('spoiler', true, [], 20);
  assert.equal(
    spoilerResults.some(
      (item) => item.elementType === 'accordion' || item.elementType === 'pure_details'
    ),
    true
  );

  const circleResults = searchStudioCatalog('circle', true, [], 20);
  assert.equal(
    circleResults.some((item) => item.elementType === 'pure_circle' || item.elementType === 'pure_ring'),
    true
  );
});

test('studioSettings provides freeform/transparent defaults, profiles, and exact shortcut matching', () => {
  assert.equal(DEFAULT_STUDIO_PREFERENCES.defaultLayoutMode, 'freeform');
  assert.equal(DEFAULT_STUDIO_PREFERENCES.defaultTransparentCanvas, true);
  assert.equal(DEFAULT_STUDIO_PREFERENCES.defaultCanvasWidth, 760);
  assert.equal(DEFAULT_STUDIO_PREFERENCES.defaultCanvasHeight, 540);
  assert.equal(DEFAULT_STUDIO_PREFERENCES.pasteOffsetSide, 'right');

  assert.equal(Boolean(SHORTCUT_PROFILES.default), true);
  assert.equal(Boolean(SHORTCUT_PROFILES.figma), true);
  assert.equal(Boolean(SHORTCUT_PROFILES.krita), true);
  assert.equal(SHORTCUT_PROFILES.krita.map.tool_box.length > 0, true);
  assert.equal(SHORTCUT_PROFILES.figma.map.spotlight_search, 'ctrl+k');

  assert.equal(
    matchesShortcut(
      { key: 's', ctrlKey: true, metaKey: false, altKey: false, shiftKey: false },
      DEFAULT_KEYBINDINGS.save_project
    ),
    true
  );
  assert.equal(
    matchesShortcut(
      { key: 's', ctrlKey: true, metaKey: false, altKey: false, shiftKey: true },
      DEFAULT_KEYBINDINGS.save_project
    ),
    false
  );
  assert.equal(
    matchesShortcut(
      { key: 's', ctrlKey: true, metaKey: false, altKey: false, shiftKey: true },
      DEFAULT_KEYBINDINGS.save_project_as
    ),
    true
  );
  assert.equal(
    matchesShortcut(
      { key: 'c', ctrlKey: true, metaKey: false, altKey: true, shiftKey: false },
      DEFAULT_KEYBINDINGS.copy_style
    ),
    true
  );
  assert.equal(
    matchesShortcut(
      { key: '/', ctrlKey: false, metaKey: false, altKey: false, shiftKey: false },
      DEFAULT_KEYBINDINGS.spotlight_search
    ),
    true
  );
  assert.equal(
    matchesShortcut(
      { key: 'Tab', ctrlKey: false, metaKey: false, altKey: false, shiftKey: false },
      DEFAULT_KEYBINDINGS.zen_mode
    ),
    true
  );
});

test('cute theme customizer defaults, CSS vars, ruler palettes, element defaults, and Toyhouse image extraction work cleanly', () => {
  assert.equal(DEFAULT_CUTE_THEME_COLORS.bgApp, '#FAF5FF');
  assert.equal(DEFAULT_CUTE_THEME_COLORS.accentPrimary, '#EC4899');
  assert.equal(DEFAULT_CUTE_THEME_COLORS.accentSecondary, '#A855F7');
  assert.equal(DEFAULT_CUTE_THEME_COLORS.rulerBg, '#F3E8FF');
  assert.equal(DEFAULT_CUTE_THEME_COLORS.rulerTick, '#8B6F9C');

  const vars = buildCuteThemeCssVars({
    ...DEFAULT_CUTE_THEME_COLORS,
    accentPrimary: '#FF6B9E',
    rulerBg: '#1F1B24',
    rulerTick: '#E2D4F0',
  });
  assert.equal(vars['--bg-app'], '#FAF5FF');
  assert.equal(vars['--accent'], '#FF6B9E');
  assert.equal(vars['--accent-soft'], 'rgba(255, 107, 158, 0.14)');
  assert.equal(vars['--grid-dot'], 'rgba(168, 85, 247, 0.24)');
  assert.equal(vars['--ruler-bg'], '#1F1B24');
  assert.equal(vars['--ruler-tick'], '#E2D4F0');

  const carbonRuler = resolveRulerPalette('carbon');
  assert.equal(carbonRuler.rulerBg, '#1E1D1B');
  assert.equal(carbonRuler.tickColor, '#524E48');
  assert.equal(carbonRuler.accentColor, '#D97757');

  const paperRuler = resolveRulerPalette('paper');
  assert.equal(paperRuler.rulerBg, '#EAE5D9');
  assert.equal(paperRuler.tickColor, '#A39B8B');
  assert.equal(paperRuler.accentColor, '#C86D51');

  const cuteRuler = resolveRulerPalette('cute', {
    ...DEFAULT_CUTE_THEME_COLORS,
    rulerBg: '#2A1E30',
    rulerTick: '#F472B6',
    textMuted: '#D8B4FE',
    accentPrimary: '#EC4899',
  });
  assert.equal(cuteRuler.rulerBg, '#2A1E30');
  assert.equal(cuteRuler.tickColor, '#F472B6');
  assert.equal(cuteRuler.textColor, '#D8B4FE');
  assert.equal(cuteRuler.accentColor, '#EC4899');

  const cuteBox = buildDefaultElement('box', [], 'cute', null);
  assert.equal(cuteBox.bgColor, '#FDF8FF');
  assert.equal(cuteBox.borderColor, '#EC4899');

  const imgEl = makeBaseElement({
    id: 'img-1',
    type: 'image',
    url: 'https://example.com/art1.png',
  });
  const btnEl = makeBaseElement({
    id: 'btn-1',
    type: 'button',
    url: 'https://toyhou.se',
  });
  const galleryEl = makeBaseElement({
    id: 'gal-1',
    type: 'gallery',
    url: undefined,
    gallery: [
      { id: 'g1', url: 'https://example.com/art1.png' },
      { id: 'g2', url: 'https://example.com/art2.webp' },
    ],
  });
  const hiddenImgEl = makeBaseElement({
    id: 'img-hidden',
    type: 'image',
    hidden: true,
    url: 'https://example.com/hidden.png',
  });
  const relEl = makeBaseElement({
    id: 'rel-1',
    type: 'relationship_tree',
    relationNodes: [
      { id: 'n1', name: 'A', role: 'Ally', relationType: 'ally', avatarUrl: 'https://example.com/rel.png' },
    ],
  });

  const extracted = extractDesignImageUrls([imgEl, btnEl, galleryEl, hiddenImgEl, relEl]);
  assert.deepEqual(extracted, [
    'https://example.com/art1.png',
    'https://example.com/art2.webp',
    'https://example.com/rel.png',
  ]);
});

test('Universal object & image links resolve, export safely in F2U/Premium without nested anchors, and round-trip via DOM import', () => {
  // 1. Helper resolution
  const linkedImgDefaultClick = makeBaseElement({
    id: 'img-link-default',
    type: 'image',
    url: 'https://example.com/art.png',
    clickAction: 'none',
    linkUrl: 'https://toyhou.se/char-1',
    linkTarget: '_self',
  });
  assert.equal(getElementEffectiveLinkUrl(linkedImgDefaultClick), 'https://toyhou.se/char-1');

  const lightboxImg = makeBaseElement({
    id: 'img-lb',
    type: 'image',
    url: 'https://example.com/art.png',
    clickAction: 'lightbox',
    linkUrl: 'https://toyhou.se/ignored',
  });
  assert.equal(getElementEffectiveLinkUrl(lightboxImg), null);

  const btnEl = makeBaseElement({
    id: 'btn-1',
    type: 'button',
    url: 'https://toyhou.se/~bulletins',
    content: 'Bulletins',
  });
  assert.equal(getElementEffectiveLinkUrl(btnEl), 'https://toyhou.se/~bulletins');

  const stickerEl = makeBaseElement({
    id: 'stk-1',
    type: 'sticker',
    stickerIcon: '✦',
    content: 'Sticker Link',
    linkUrl: 'https://example.com/sticker',
    linkTarget: '_blank',
  });
  const badgeEl = makeBaseElement({
    id: 'bdg-1',
    type: 'badge',
    content: 'COMMISSIONS OPEN',
    linkUrl: 'https://example.com/commissions',
    linkTarget: '_self',
  });
  const pagedollEl = makeBaseElement({
    id: 'pd-1',
    type: 'pagedoll',
    url: 'https://example.com/doll.png',
    linkUrl: 'https://example.com/doll-credit',
  });
  const headingEl = makeBaseElement({
    id: 'hd-1',
    type: 'pure_heading',
    content: 'Linked Heading',
    linkUrl: 'https://example.com/heading',
  });
  const boxEl = makeBaseElement({
    id: 'bx-1',
    type: 'pure_box',
    content: 'Linked Box',
    linkUrl: 'https://example.com/box',
  });
  const collapsibleBox = makeBaseElement({
    id: 'col-1',
    type: 'box',
    collapsible: true,
    content: 'Spoiler',
    linkUrl: 'https://example.com/should-not-wrap',
  });
  assert.equal(getElementEffectiveLinkUrl(stickerEl), 'https://example.com/sticker');
  assert.equal(getElementEffectiveLinkUrl(collapsibleBox), null);

  // 2. Dual-mode export for universal linked objects
  const linkedElements = [
    linkedImgDefaultClick,
    stickerEl,
    badgeEl,
    pagedollEl,
    headingEl,
    boxEl,
  ];
  for (const platform of ['toyhouse_free', 'toyhouse_premium'] as const) {
    const exp = generatePlatformExport(linkedElements, 'freeform', platform, 760, 540);
    assert.match(exp.html, /href="https:\/\/toyhou\.se\/char-1"\s+target="_self"/);
    assert.match(exp.html, /href="https:\/\/example\.com\/sticker"\s+target="_blank"/);
    assert.match(exp.html, /href="https:\/\/example\.com\/commissions"\s+target="_self"/);
    assert.match(exp.html, /href="https:\/\/example\.com\/doll-credit"/);
    assert.match(exp.html, /href="https:\/\/example\.com\/heading"/);
    assert.match(exp.html, /href="https:\/\/example\.com\/box"/);
    if (platform === 'toyhouse_free') {
      assert.equal(exp.html.includes('<style'), false);
    }
  }

  // 3. Container box with linkUrl containing a child button must keep child <a> intact without nested <a><a
  const parentBox = makeBaseElement({
    id: 'parent-box',
    type: 'box',
    content: 'Container With Child CTA',
    linkUrl: 'https://example.com/outer-skipped',
  });
  const childBtn = makeBaseElement({
    id: 'child-btn',
    type: 'button',
    parentId: 'parent-box',
    content: 'Inner CTA',
    url: 'https://example.com/inner-cta',
    linkTarget: '_blank',
  });
  const nestedExport = generatePlatformExport([parentBox, childBtn], 'block', 'toyhouse_free', 760, 540);
  assert.equal(nestedExport.html.includes('href="https://example.com/inner-cta"'), true);
  assert.equal(nestedExport.html.includes('href="https://example.com/outer-skipped"'), false);

  // 4. DOM round-trip import without DBX_ROUNDTRIP_V1 comment for linked images (f2u_bg & native_img) and linked box
  const nativeImg = makeBaseElement({
    id: 'img-native',
    type: 'image',
    imageRenderMode: 'native_img',
    url: 'https://example.com/native.png',
    clickAction: 'link',
    linkUrl: 'https://example.com/native-target',
    linkTarget: '_self',
  });
  const blockExp = generatePlatformExport(
    [linkedImgDefaultClick, nativeImg, boxEl],
    'block',
    'toyhouse_free',
    760,
    540
  );
  const strippedHtml = blockExp.html.replace(/<!--[\s\S]*?-->/g, '');
  const domImported = parseToyhouseHtmlToDesign(strippedHtml, {
    uiTheme: 'paper',
    canvasWidth: 760,
    startRowIndex: 0,
    startY: 24,
  });

  const importedBgImg = domImported.elements.find((e) => e.url === 'https://example.com/art.png');
  assert.ok(
    importedBgImg,
    `Expected background-image linked image to import from raw HTML. Got: ${JSON.stringify(
      domImported.elements.map((e) => ({ type: e.type, url: e.url, linkUrl: e.linkUrl, label: e.label }))
    )}`
  );
  assert.equal(importedBgImg.linkUrl, 'https://toyhou.se/char-1');
  assert.equal(importedBgImg.linkTarget, '_self');
  assert.equal(importedBgImg.clickAction, 'link');

  const importedNativeImg = domImported.elements.find((e) => e.url === 'https://example.com/native.png');
  assert.ok(importedNativeImg, 'Expected native <img> linked image to import from raw HTML');
  assert.equal(importedNativeImg.linkUrl, 'https://example.com/native-target');
  assert.equal(importedNativeImg.linkTarget, '_self');
  assert.equal(importedNativeImg.clickAction, 'link');

  const importedLinkedBox = domImported.elements.find((e) => e.linkUrl === 'https://example.com/box');
  assert.ok(importedLinkedBox, 'Expected linked non-image object wrapper <a href> to preserve linkUrl on DOM import');
  assert.equal(importedLinkedBox.linkTarget, '_blank');
});
