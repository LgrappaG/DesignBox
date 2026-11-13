import test from 'node:test';
import assert from 'node:assert/strict';
import { CURATED_ASSETS } from '../src/data/assets';
import { filterFaIcons } from '../src/data/faIcons';
import { extractHexSwatchesFromHtml } from '../src/engine/htmlImporter';
import { applyThemeToElements, GLOBAL_THEME_PRESETS } from '../src/engine/themeEngine';
import { buildDefaultElement, buildElementFromAssetPreset, buildElementFromFaIcon } from '../src/utils/elementFactory';
import { computeSmartMoveSnap, computeSmartResizeSnap } from '../src/utils/snapGeometry';
import { CanvasGuide, DesignElement } from '../src/types/schema';

test('Smart snap aligns to canvas center, fixed ruler guides, and measures neighbor gap', () => {
  const guides: CanvasGuide[] = [{ id: 'g1', axis: 'x', pos: 200 }];
  const neighbor = { id: 'other', x: 300, y: 100, width: 100, height: 100 };

  // Snap to fixed guide X=200 (with box width 60 at rawX=196 -> snaps x to 200; right edge at 260, gap to 300 = 40px)
  const snapGuide = computeSmartMoveSnap({
    rawX: 196,
    rawY: 100,
    width: 60,
    height: 100,
    canvasWidth: 800,
    canvasHeight: 600,
    others: [neighbor],
    guides,
    magneticSnap: true,
  });

  assert.equal(snapGuide.x, 200);
  assert.equal(snapGuide.y, 100);
  assert.ok(snapGuide.lines.some((l) => l.axis === 'x' && l.pos === 200 && l.kind === 'guide'));
  assert.ok(snapGuide.spacing.some((s) => s.axis === 'h' && s.gap === 40));

  // Snap to horizontal canvas center (800 / 2 = 400 -> width 100 => x = 350)
  const snapCenter = computeSmartMoveSnap({
    rawX: 346,
    rawY: 20,
    width: 100,
    height: 80,
    canvasWidth: 800,
    canvasHeight: 600,
    others: [],
    guides: [],
    magneticSnap: true,
  });
  assert.equal(snapCenter.x, 350);
  assert.ok(snapCenter.lines.some((l) => l.axis === 'x' && l.kind === 'center' && l.pos === 400));
});

test('Smart resize snaps east edge to fixed guide line', () => {
  const guides: CanvasGuide[] = [{ id: 'g-res', axis: 'x', pos: 320 }];
  const res = computeSmartResizeSnap({
    dir: 'e',
    origX: 100,
    origY: 50,
    origW: 180,
    origH: 90,
    dx: 37, // target right = 100 + 217 = 317 -> snaps to 320
    dy: 0,
    minW: 24,
    minH: 20,
    canvasWidth: 800,
    canvasHeight: 600,
    others: [],
    guides,
    magneticSnap: true,
  });
  assert.equal(res.width, 220);
  assert.ok(res.lines.some((l) => l.axis === 'x' && l.pos === 320 && l.kind === 'guide'));
});

test('Global Theme engine updates surfaces, accent elements, and modifiers while keeping transparent text transparent', () => {
  const palette = {
    ...GLOBAL_THEME_PRESETS[5],
    googleFont: 'Orbitron',
  };

  const card = buildDefaultElement('box', [], 'paper', null);
  const btn = buildDefaultElement('button', [card], 'paper', null);
  const heading: DesignElement = {
    ...buildDefaultElement('pure_heading', [card, btn], 'paper', null),
    bgColor: 'transparent',
  };

  const f2uApplied = applyThemeToElements([card, btn, heading], palette, {
    applyColors: true,
    applyFonts: true,
    isToyhouseFree: true,
  });

  assert.equal(f2uApplied[0].bgColor, palette.surfaceBg);
  assert.equal(f2uApplied[1].bgColor, palette.accentColor);
  assert.equal(f2uApplied[2].bgColor, 'transparent');
  assert.equal(f2uApplied[2].textColor, palette.textColor);
  assert.equal(f2uApplied[0].fontFamily, palette.fontFamily);
  assert.equal(f2uApplied[0].googleFont, undefined);

  const proApplied = applyThemeToElements([card], palette, {
    applyColors: true,
    applyFonts: true,
    isToyhouseFree: false,
  });
  assert.equal(proApplied[0].googleFont, 'Orbitron');
});

test('Curated Assets & FontAwesome 6 browser build valid DesignElements and filter Pro classes cleanly', () => {
  const stampPreset = CURATED_ASSETS.find((a) => a.category === 'stamps');
  assert.ok(stampPreset);
  const stampEl = buildElementFromAssetPreset(stampPreset, [], 'paper', null);
  assert.equal(stampEl.frameStyle, 'stamp');
  assert.equal(stampEl.pinnedOverlay, true);

  const badgeEl = buildElementFromFaIcon('fa-solid fa-crown', 'Royal Crown', 'badge', [], 'carbon', null);
  assert.equal(badgeEl.type, 'badge');
  assert.equal(badgeEl.faIcon, 'fa-solid fa-crown');

  const f2uIcons = filterFaIcons('', 'all', true);
  assert.ok(f2uIcons.length > 30);
  assert.equal(f2uIcons.some((ic) => !ic.f2uSafe), false);

  const moonResults = filterFaIcons('moon', 'all', false);
  assert.ok(moonResults.some((ic) => ic.cls.includes('moon')));
});

test('HTML swatch extractor deduplicates and expands shorthand hex tokens', () => {
  const swatches = extractHexSwatchesFromHtml(
    '<div style="color:#fff;background:#c86d51;border:1px solid #FFFFFF"><span style="color:#2C2A28">hi</span></div>'
  );
  assert.deepEqual(swatches, ['#FFFFFF', '#C86D51', '#2C2A28']);
});

