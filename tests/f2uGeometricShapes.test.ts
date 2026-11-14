import test from 'node:test';
import assert from 'node:assert/strict';
import {
  buildF2UCornerMaskOverlayCss,
  buildF2UQuadrantSurfaceCss,
  F2U_GEOMETRIC_SHAPES,
  isF2UGeometricShape,
} from '../src/utils/f2uShapeCss';
import { getElementF2UShieldReport, isF2USafeShape } from '../src/engine/f2uShield';
import { generatePlatformExport, getImageClipPath } from '../src/engine/layoutSolver';
import { buildDefaultElement } from '../src/utils/elementFactory';
import { PURE_PRIMITIVE_GROUPS } from '../src/data/purePrimitives';
import { DesignElement } from '../src/types/schema';

test('All geometric polygon shapes are marked F2U-safe in core shape helpers and Pure sidebar', () => {
  for (const shp of F2U_GEOMETRIC_SHAPES) {
    assert.equal(isF2UGeometricShape(shp), true);
    assert.equal(isF2USafeShape(shp), true);
  }
  assert.equal(isF2USafeShape('star'), true);
  assert.equal(isF2USafeShape('heart'), true);
  assert.equal(isF2USafeShape('shield'), true);
  assert.equal(isF2USafeShape('ticket'), true);
  assert.equal(isF2USafeShape('cross_star'), true);
  assert.equal(isF2USafeShape('scallop'), true);

  const shapeGroup = PURE_PRIMITIVE_GROUPS.find((g) => g.id === 'pure_shapes');
  assert.ok(shapeGroup);
  const byType = new Map(shapeGroup.items.map((item) => [item.type, item]));
  assert.equal(byType.get('pure_hexagon')?.f2uSafe, true);
  assert.equal(byType.get('pure_octagon')?.f2uSafe, true);
  assert.equal(byType.get('pure_diamond')?.f2uSafe, true);
  assert.equal(byType.get('pure_star')?.f2uSafe, true);
});

test('Quadrant CSS generator builds HTMLPurifier-safe inline gradients without calc() or clip-path', () => {
  const hexPointy = buildF2UQuadrantSurfaceCss('hexagon', '#FFFFFF');
  assert.match(hexPointy, /150deg/);
  assert.match(hexPointy, /210deg/);
  assert.match(hexPointy, /30deg/);
  assert.match(hexPointy, /330deg/);
  assert.match(hexPointy, /background-size:\s*51%\s+51%/);
  assert.equal(/clip-path|calc\(|<svg/i.test(hexPointy), false);

  const hexFlat = buildF2UQuadrantSurfaceCss('hexagon_flat', '#222222');
  assert.match(hexFlat, /120deg/);
  assert.match(hexFlat, /240deg/);

  const bevelCss = buildF2UQuadrantSurfaceCss('bevel', '#FAF8F5', 22);
  assert.match(bevelCss, /transparent 22px/);
  assert.match(bevelCss, /#FAF8F5 22\.6px/);

  const maskCss = buildF2UCornerMaskOverlayCss('diamond', '#141413');
  assert.match(maskCss, /to bottom right,\s*#141413 49\.5%, transparent 50%/);
  assert.match(maskCss, /pointer-events:\s*none/);
});

test('Pure Hexagon, Octagon, Diamond and Box Bevel export in toyhouse_free without clip-path, svg, or style tags', () => {
  const hex = buildDefaultElement('pure_hexagon', [], 'paper', null);
  hex.borderWidth = 2;
  hex.borderColor = '#C86D51';
  hex.bgColor = '#FFFFFF';
  hex.content = 'HEX NODE';

  const diamond = buildDefaultElement('pure_diamond', [], 'paper', null);
  diamond.borderWidth = 0;
  diamond.bgColor = '#FAF8F5';

  const bevelBox: DesignElement = {
    ...buildDefaultElement('box', [], 'paper', null),
    boxClipShape: 'bevel',
    shapeCutPx: 18,
    bgColor: '#ECE7DF',
    borderColor: '#2C2A28',
    borderWidth: 2,
  };

  for (const el of [hex, diamond, bevelBox]) {
    const report = getElementF2UShieldReport(el);
    assert.equal(report.isShielded, false);
  }

  const f2u = generatePlatformExport([hex, diamond, bevelBox], 'hybrid', 'toyhouse_free', 760, 540);
  assert.equal(f2u.html.includes('clip-path'), false);
  assert.equal(f2u.html.includes('<svg'), false);
  assert.equal(f2u.html.includes('<style'), false);
  assert.equal(f2u.html.includes('calc('), false);
  assert.equal(f2u.warnings.some((w) => w.code === 'TH_F2U_CLIP_NOTE'), false);
  assert.match(f2u.html, /linear-gradient\(150deg, transparent 33%, #C86D51 33\.6%\)/);
  assert.match(f2u.html, /linear-gradient\(150deg, transparent 33%, #FFFFFF 33\.6%\)/);
  assert.match(f2u.html, /linear-gradient\(135deg, transparent 18px, #2C2A28 18\.6px\)/);
  assert.match(f2u.html, /HEX NODE/);
});

test('Images use reverse corner wedge overlay on F2U and clip-path polygons on Pro', () => {
  const borderlessHexImg: DesignElement = {
    ...buildDefaultElement('image', [], 'paper', null),
    imageShape: 'hexagon_flat',
    shapeMaskBgColor: '#1E1D1B',
    borderWidth: 0,
    borderColor: 'transparent',
  };

  const f2uImg = generatePlatformExport([borderlessHexImg], 'hybrid', 'toyhouse_free', 760, 540);
  assert.equal(f2uImg.html.includes('clip-path'), false);
  assert.match(f2uImg.html, /linear-gradient\(120deg,\s*#1E1D1B 33%, transparent 33\.6%\)/);
  assert.match(f2uImg.html, /pointer-events:\s*none/);

  const proImg = generatePlatformExport([borderlessHexImg], 'hybrid', 'toyhouse_premium', 760, 540);
  assert.match(proImg.html, /clip-path:\s*polygon\(25% 0%, 75% 0%, 100% 50%, 75% 100%, 25% 100%, 0% 50%\)/);

  // Align Pointy vs Flat clip-paths accurately
  assert.equal(
    getImageClipPath('hexagon'),
    'polygon(50% 0%, 100% 25%, 100% 75%, 50% 100%, 0% 75%, 0% 25%)',
  );
});
