import test from 'node:test';
import assert from 'node:assert/strict';
import {
  getElementF2UShieldReport,
  isF2USafeShape,
  maskElementForF2USimulation,
} from '../src/engine/f2uShield';
import { generatePlatformExport } from '../src/engine/layoutSolver';
import { buildDefaultElement } from '../src/utils/elementFactory';
import { DesignElement } from '../src/types/schema';

test('F2U Shield detects Pro settings and masks without mutating user element', () => {
  const base = buildDefaultElement('box', [], 'paper', null);
  const proRichBox: DesignElement = {
    ...base,
    glassBlur: 12,
    rotation: -15,
    imgRotation: 22,
    boxClipShape: 'octagon',
    hoverEffect: 'glow',
    idleAnimation: 'float',
    googleFont: 'Cinzel',
    customHtml: '<style>.secret { color: red; }</style><div>Body</div>',
    modifiers: [
      {
        id: 'mod-bool-1',
        kind: 'boolean_mask',
        enabled: true,
        operation: 'subtract',
        maskShape: 'shield',
        xPct: 50,
        yPct: 50,
        widthPx: 80,
        heightPx: 80,
      },
    ],
  };

  const report = getElementF2UShieldReport(proRichBox);
  assert.equal(report.isShielded, true);
  assert.ok(report.items.length >= 6);

  const masked = maskElementForF2USimulation(proRichBox);
  assert.equal(masked.glassBlur, 0);
  assert.equal(masked.rotation, 0);
  assert.equal(masked.imgRotation, 0);
  assert.equal(masked.boxClipShape, 'rect');
  assert.equal(masked.hoverEffect, 'none');
  assert.equal(masked.idleAnimation, 'none');
  assert.equal(masked.googleFont, undefined);
  assert.equal(masked.customHtml?.includes('<style'), false);
  assert.equal(masked.modifiers?.length, 0);

  // Original element MUST stay completely unmutated so returning to Pro restores everything
  assert.equal(proRichBox.glassBlur, 12);
  assert.equal(proRichBox.rotation, -15);
  assert.equal(proRichBox.boxClipShape, 'octagon');
  assert.equal(proRichBox.hoverEffect, 'glow');
  assert.equal(proRichBox.idleAnimation, 'float');
  assert.equal(proRichBox.googleFont, 'Cinzel');
  assert.equal(proRichBox.modifiers?.[0].enabled, true);
});

test('F2U Shield keeps F2U-safe shapes, 90-degree rotations, and native FA animations active', () => {
  assert.equal(isF2USafeShape('arch'), true);
  assert.equal(isF2USafeShape('pill'), true);
  assert.equal(isF2USafeShape('leaf'), true);
  assert.equal(isF2USafeShape('ticket'), false);
  assert.equal(isF2USafeShape('cross_star'), false);

  const safeBox: DesignElement = {
    ...buildDefaultElement('box', [], 'paper', null),
    boxClipShape: 'arch',
    rotation: 90,
    idleAnimation: 'bounce',
  };
  const report = getElementF2UShieldReport(safeBox);
  assert.equal(report.isShielded, false);
});

test('Dual-Mode Export strips Pro CSS on toyhouse_free and preserves it on toyhouse_premium', () => {
  const proBox: DesignElement = {
    ...buildDefaultElement('box', [], 'carbon', null),
    glassBlur: 10,
    hoverEffect: 'lift',
    boxClipShape: 'ticket',
    borderStyle: 'groove',
    modifiers: [
      {
        id: 'frame-1',
        kind: 'inner_frame',
        enabled: true,
        frameStyle: 'double_mat',
        insetPx: 8,
        thickness: 2,
        borderStyle: 'solid',
        color: '#D4A373',
        radiusPx: 6,
        bracketSizePx: 14,
      },
    ],
  };

  const f2uExport = generatePlatformExport([proBox], 'hybrid', 'toyhouse_free', 760, 540);
  assert.equal(f2uExport.html.includes('<style'), false);
  assert.equal(f2uExport.html.includes('backdrop-filter'), false);
  assert.equal(f2uExport.html.includes('groove'), true);

  const proExport = generatePlatformExport([proBox], 'hybrid', 'toyhouse_premium', 760, 540);
  assert.equal(proExport.html.includes('<style'), true);
  assert.equal(proExport.html.includes('backdrop-filter'), true);
  assert.equal(proExport.html.includes('clip-path'), true);
});

test('Responsive Bootstrap 4 grids emit col-12 col-sm-6 col-md-* classes', () => {
  const grid = buildDefaultElement('pure_grid_2', [], 'paper', null);
  const exported = generatePlatformExport([grid], 'hybrid', 'toyhouse_free', 760, 540);
  assert.match(exported.html, /class="row\b/);
  assert.match(exported.html, /col-12 col-md-6/);
});

test('Unlocked fa_watermark supports configurable anchors and offsets cleanly', () => {
  const wm: DesignElement = {
    ...buildDefaultElement('fa_watermark', [], 'carbon', null),
    watermarkAnchor: 'top_left',
    watermarkOffsetX: 25,
    watermarkOffsetY: 14,
    rotation: 90,
  };
  const exported = generatePlatformExport([wm], 'hybrid', 'toyhouse_free', 760, 540);
  assert.equal(exported.html.includes('right: -10px; bottom: -20px'), false);
  assert.equal(exported.html.includes('justify-content: flex-start'), true);
  assert.equal(exported.html.includes('align-items: flex-start'), true);
  assert.equal(exported.html.includes('margin-left: 25px'), true);
  assert.equal(exported.html.includes('margin-top: 14px'), true);
  assert.equal(exported.html.includes('fa-rotate-90'), true);
});
