import test from 'node:test';
import assert from 'node:assert/strict';
import { DesignElement } from '../src/types/schema';
import {
  auditElementsAcrossToyhouseThemes,
  evaluateWcagContrast,
  getWcagContrastRatio,
  getWcagRelativeLuminance,
  suggestAccessibleTextColor,
} from '../src/utils/colorMath';
import { buildLayerTree } from '../src/utils/elementHierarchy';
import {
  classifyPastedPayload,
  INTERNAL_CLIPBOARD_PREFIX,
  isDirectImageUrl,
} from '../src/utils/smartPaste';

function makeElement(overrides: Partial<DesignElement> & { id: string }): DesignElement {
  return {
    id: overrides.id,
    type: overrides.type || 'box',
    label: overrides.label || overrides.id,
    content: overrides.content ?? 'Sample Copy',
    x: overrides.x ?? 0,
    y: overrides.y ?? 0,
    width: overrides.width ?? 200,
    height: overrides.height ?? 100,
    order: overrides.order ?? 0,
    rowIndex: overrides.rowIndex ?? 0,
    colSpan: overrides.colSpan ?? 12,
    bgColor: overrides.bgColor ?? '#FAF8F5',
    textColor: overrides.textColor ?? '#18181B',
    borderColor: overrides.borderColor ?? '#DCD6C8',
    borderWidth: overrides.borderWidth ?? 1,
    borderRadius: overrides.borderRadius ?? 6,
    padding: overrides.padding ?? 12,
    fontSize: overrides.fontSize ?? 13,
    fontWeight: overrides.fontWeight ?? 'normal',
    textAlign: overrides.textAlign ?? 'left',
    shadow: overrides.shadow ?? 'none',
    hoverEffect: overrides.hoverEffect ?? 'none',
    ...overrides,
  };
}

test('WCAG 2.1 contrast calculation computes exact luminance, contrast ratio, AA/AAA levels, and auto-fix color', () => {
  assert.equal(getWcagRelativeLuminance('#000000'), 0);
  assert.equal(Math.round(getWcagRelativeLuminance('#FFFFFF') * 1000) / 1000, 1);
  assert.equal(getWcagContrastRatio('#000000', '#FFFFFF'), 21);
  assert.equal(getWcagContrastRatio('#336699', '#336699'), 1);

  const high = evaluateWcagContrast('#18181B', '#FAF8F5', '#FFFFFF', 13, false);
  assert.equal(high.level, 'AAA');
  assert.equal(high.passesAA, true);
  assert.ok(high.ratio > 15);

  const low = evaluateWcagContrast('#B5B5B5', '#FFFFFF', '#FFFFFF', 12, false);
  assert.equal(low.level, 'Fail');
  assert.equal(low.passesAA, false);

  const normalTextAa = evaluateWcagContrast('#767676', '#FFFFFF', '#FFFFFF', 13, false);
  assert.equal(normalTextAa.passesAA, true);
  assert.equal(normalTextAa.level, 'AA');

  const largeThresholdOnly = evaluateWcagContrast('#8E8E8E', '#FFFFFF', '#FFFFFF', 18, false);
  assert.equal(largeThresholdOnly.level, 'AA Large');
  assert.equal(largeThresholdOnly.passesAA, true);

  assert.equal(suggestAccessibleTextColor('#16141C', '#FFFFFF'), '#FAF8F5');
  assert.equal(suggestAccessibleTextColor('#FAF8F5', '#16141C'), '#18181B');
  // Semi-transparent glass fill composites over backdrop before picking ink
  assert.equal(suggestAccessibleTextColor('transparent', '#16141C'), '#FAF8F5');
});

test('auditElementsAcrossToyhouseThemes catches transparent low-contrast text on TH Night and honors opaque ancestors', () => {
  const transparentDarkText = makeElement({
    id: 'transparent-bio',
    label: 'Transparent Bio',
    bgColor: 'transparent',
    textColor: '#18181B',
  });
  const solidDarkCard = makeElement({
    id: 'solid-card',
    label: 'Solid Card',
    bgColor: '#1E1B24',
    textColor: '#FAF8F5',
  });
  const parentOpaque = makeElement({
    id: 'parent-light',
    label: 'Light Panel',
    content: '',
    bgColor: '#FFFFFF',
    textColor: '#18181B',
  });
  const nestedDarkText = makeElement({
    id: 'nested-text',
    parentId: 'parent-light',
    label: 'Nested Label',
    bgColor: 'transparent',
    textColor: '#18181B',
  });
  const hiddenLowContrast = makeElement({
    id: 'hidden-bad',
    label: 'Hidden Layer',
    hidden: true,
    bgColor: '#FFFFFF',
    textColor: '#FFFFFF',
  });

  const audits = auditElementsAcrossToyhouseThemes(
    [transparentDarkText, solidDarkCard, parentOpaque, nestedDarkText, hiddenLowContrast],
    'transparent',
    '#FFF6FB'
  );

  const night = audits.find((a) => a.surfaceId === 'th_dark')!;
  const light = audits.find((a) => a.surfaceId === 'th_light')!;

  assert.equal(night.checkedCount, 3);
  assert.equal(night.failingElements.length, 1);
  assert.equal(night.failingElements[0].id, 'transparent-bio');
  assert.equal(night.failingElements[0].usedSurfaceBg, true);

  assert.equal(light.failingElements.length, 0);
});

test('buildLayerTree builds indented parent-child hierarchy, handles collapsed subtrees, orphans, and cycles safely', () => {
  const rootA = makeElement({ id: 'a', label: 'Outer Card' });
  const childA1 = makeElement({ id: 'a1', label: 'Header', parentId: 'a' });
  const grandA1i = makeElement({ id: 'a1i', label: 'Badge', parentId: 'a1' });
  const rootB = makeElement({ id: 'b', label: 'Footer' });
  const orphan = makeElement({ id: 'orphan', label: 'Orphan', parentId: 'does-not-exist' });
  const cyc1 = makeElement({ id: 'cyc1', label: 'Cyc 1', parentId: 'cyc2' });
  const cyc2 = makeElement({ id: 'cyc2', label: 'Cyc 2', parentId: 'cyc1' });

  // Input intentionally places children after rootB to test grouping directly under parent
  const input = [rootA, rootB, childA1, grandA1i, orphan, cyc1, cyc2];
  const expanded = buildLayerTree(input);

  assert.deepEqual(
    expanded.map((r) => [r.element.id, r.depth, r.childCount]),
    [
      ['a', 0, 1],
      ['a1', 1, 1],
      ['a1i', 2, 0],
      ['b', 0, 0],
      ['orphan', 0, 0],
      ['cyc1', 0, 1],
      ['cyc2', 1, 0],
    ]
  );

  const collapsed = buildLayerTree(input, new Set(['a']));
  assert.deepEqual(
    collapsed.map((r) => [r.element.id, r.isCollapsed, r.childCount]),
    [
      ['a', true, 1],
      ['b', false, 0],
      ['orphan', false, 0],
      ['cyc1', false, 1],
      ['cyc2', false, 0],
    ]
  );
});

test('smartPaste classifies internal copies, direct image URLs, HTML snippets, and plain text safely', () => {
  assert.deepEqual(
    classifyPastedPayload(`${INTERNAL_CLIPBOARD_PREFIX}1700000000000`),
    { kind: 'internal' }
  );

  assert.equal(isDirectImageUrl('https://f2.toyhou.se/file/f2-toyhou-se/images/12345'), true);
  assert.equal(isDirectImageUrl('https://example.com/art/portrait.webp?v=2'), true);
  assert.equal(isDirectImageUrl('javascript:alert(1)'), false);
  assert.equal(isDirectImageUrl('data:image/png;base64,AAAA'), false);

  assert.deepEqual(
    classifyPastedPayload('https://images.unsplash.com/photo-1579783902614-a3fb3927b675'),
    { kind: 'image_url', url: 'https://images.unsplash.com/photo-1579783902614-a3fb3927b675' }
  );

  const htmlPayload = classifyPastedPayload('<div class="card p-3"><p>Hello OC</p></div>');
  assert.equal(htmlPayload.kind, 'html_snippet');

  assert.deepEqual(
    classifyPastedPayload('Character bio summary text'),
    { kind: 'plain_text', text: 'Character bio summary text' }
  );

  // When copying an image from a webpage produces empty plainText and <img src="..."> HTML
  assert.deepEqual(
    classifyPastedPayload('', '<meta charset="utf-8"><img src="https://i.ibb.co/demo/art.png" alt="oc" />'),
    { kind: 'image_url', url: 'https://i.ibb.co/demo/art.png' }
  );

  assert.deepEqual(classifyPastedPayload('   ', ''), { kind: 'empty' });
});
