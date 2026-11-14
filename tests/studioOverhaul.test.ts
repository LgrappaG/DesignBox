import test from 'node:test';
import assert from 'node:assert/strict';
import { searchStudioCatalog } from '../src/data/searchCatalog';
import { parseToyhouseHtmlToDesign } from '../src/engine/htmlImporter';
import { getElementF2UShieldReport } from '../src/engine/f2uShield';
import { generatePlatformExport } from '../src/engine/layoutSolver';
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

test('cute theme customizer defaults, CSS vars, element defaults, and Toyhouse image extraction work cleanly', () => {
  assert.equal(DEFAULT_CUTE_THEME_COLORS.bgApp, '#FAF5FF');
  assert.equal(DEFAULT_CUTE_THEME_COLORS.accentPrimary, '#EC4899');
  assert.equal(DEFAULT_CUTE_THEME_COLORS.accentSecondary, '#A855F7');

  const vars = buildCuteThemeCssVars({
    ...DEFAULT_CUTE_THEME_COLORS,
    accentPrimary: '#FF6B9E',
  });
  assert.equal(vars['--bg-app'], '#FAF5FF');
  assert.equal(vars['--accent'], '#FF6B9E');
  assert.equal(vars['--accent-soft'], 'rgba(255, 107, 158, 0.14)');
  assert.equal(vars['--grid-dot'], 'rgba(168, 85, 247, 0.24)');

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
