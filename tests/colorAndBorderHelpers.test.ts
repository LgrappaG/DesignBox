import test from 'node:test';
import assert from 'node:assert/strict';
import {
  formatColorOutput,
  getContrastInk,
  hexToHsv,
  hsvToHex,
  normalizeHexColor,
  parseColorValue,
} from '../src/utils/colorMath';
import {
  buildUniformBorderPatch,
  getDisplayBorderColor,
  getDisplayBorderStyle,
  getDisplayBorderWidth,
} from '../src/utils/borderHelpers';
import { buildDefaultElement } from '../src/utils/elementFactory';

test('colorMath normalizes hex, converts HSV cleanly, and parses rgba/transparent/inherit', () => {
  assert.equal(normalizeHexColor('abc'), '#AABBCC');
  assert.equal(normalizeHexColor(' #4d2324 '), '#4D2324');
  assert.equal(normalizeHexColor('not-a-color'), null);

  for (const hex of ['#FFFFFF', '#000000', '#FF0000', '#00FF88', '#C86D51', '#3B82F6']) {
    const roundTrip = hsvToHex(hexToHsv(hex));
    assert.equal(roundTrip, hex);
  }

  assert.deepEqual(parseColorValue('transparent', '#FAF8F5'), {
    hex: '#FAF8F5',
    alpha: 0,
    isTransparent: true,
    isInherit: false,
  });

  assert.deepEqual(parseColorValue('inherit', '#18181B'), {
    hex: '#18181B',
    alpha: 1,
    isTransparent: false,
    isInherit: true,
  });

  const rgbaParsed = parseColorValue('rgba(200, 109, 81, 0.5)');
  assert.equal(rgbaParsed.hex, '#C86D51');
  assert.equal(rgbaParsed.alpha, 0.5);
  assert.equal(rgbaParsed.isTransparent, false);

  assert.equal(formatColorOutput('#C86D51', 1), '#C86D51');
  assert.equal(formatColorOutput('#C86D51', 0), 'transparent');
  assert.equal(formatColorOutput('#C86D51', 0.45), 'rgba(200, 109, 81, 0.45)');

  assert.equal(getContrastInk('#FAF8F5'), '#18181B');
  assert.equal(getContrastInk('#18181B'), '#FFFFFF');
});

test('borderHelpers handles uniform boxes, 4-side unlinked rails, transparent restore, and pure_line', () => {
  const box = buildDefaultElement('box', [], 'paper', null);
  box.borderWidth = 0;
  box.borderColor = 'transparent';
  box.borderStyle = 'solid';

  // Raising borderWidth from 0 on transparent auto-restores visible accent border
  const widthPatch = buildUniformBorderPatch(box, { borderWidth: 3 });
  assert.equal(widthPatch.borderWidth, 3);
  assert.equal(widthPatch.borderTopWidth, 3);
  assert.equal(widthPatch.borderRightWidth, 3);
  assert.equal(widthPatch.borderBottomWidth, 3);
  assert.equal(widthPatch.borderLeftWidth, 3);
  assert.equal(widthPatch.bordersLinked, true);
  assert.equal(widthPatch.borderColor, '#C86D51');

  // Setting color on 0px uniform border bumps borderWidth to 1px
  const colorPatch = buildUniformBorderPatch(box, { borderColor: '#2563EB' });
  assert.equal(colorPatch.borderColor, '#2563EB');
  assert.equal(colorPatch.borderWidth, 1);

  // Unlinked 4-side box reports max side width and preserves widths on color-only update
  const rail = buildDefaultElement('box', [], 'paper', null);
  rail.bordersLinked = false;
  rail.borderTopWidth = 0;
  rail.borderRightWidth = 0;
  rail.borderBottomWidth = 0;
  rail.borderLeftWidth = 4;
  rail.borderStyle = 'solid';
  rail.borderLeftStyle = 'dashed';
  rail.borderColor = '#C86D51';

  assert.equal(getDisplayBorderWidth(rail), 4);
  assert.equal(getDisplayBorderColor(rail), '#C86D51');
  const railColorPatch = buildUniformBorderPatch(rail, { borderColor: '#10B981' });
  assert.equal(railColorPatch.borderWidth, undefined);
  assert.equal(railColorPatch.borderLeftColor, '#10B981');
  assert.equal(railColorPatch.borderColor, '#10B981');

  // pure_line uses borderTop* and keeps bordersLinked=false and min top width 1
  const line = buildDefaultElement('pure_line', [], 'paper', null);
  assert.equal(getDisplayBorderWidth(line), line.borderTopWidth ?? 2);
  assert.equal(getDisplayBorderStyle(line), line.borderTopStyle || 'solid');
  const linePatch = buildUniformBorderPatch(line, {
    borderWidth: 0,
    borderStyle: 'dotted',
    borderColor: '#FF0066',
  });
  assert.equal(linePatch.bordersLinked, false);
  assert.equal(linePatch.borderTopWidth, 1);
  assert.equal(linePatch.borderWidth, 0);
  assert.equal(linePatch.borderTopStyle, 'dotted');
  assert.equal(linePatch.borderTopColor, '#FF0066');
});
