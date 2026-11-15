import test from 'node:test';
import assert from 'node:assert/strict';
import { DesignElement, ElementType } from '../src/types/schema';
import { buildDefaultElement } from '../src/utils/elementFactory';
import {
  getInspectorSectionSummaries,
  isTypographyRelevantForElement,
  shouldShowPrimaryTextField,
} from '../src/utils/inspectorHelpers';

function makeElement(
  type: ElementType,
  overrides: Partial<DesignElement> = {}
): DesignElement {
  return {
    ...buildDefaultElement(type, [], 'carbon', null),
    ...overrides,
  };
}

test('isTypographyRelevantForElement hides typography only on non-text elements', () => {
  const nonTextTypes: ElementType[] = [
    'image',
    'pure_image_slot',
    'divider',
    'pure_divider',
    'washi_tape',
    'lace_divider',
    'palette_strip',
    'pagedoll',
    'fa_watermark',
    'pure_line',
  ];
  for (const type of nonTextTypes) {
    assert.equal(
      isTypographyRelevantForElement(makeElement(type)),
      false,
      `Expected ${type} to hide Typography section`
    );
  }

  const textTypes: ElementType[] = [
    'box',
    'heading',
    'button',
    'badge',
    'tabs',
    'accordion',
    'pure_text',
    'relationship_tree',
  ];
  for (const type of textTypes) {
    assert.equal(
      isTypographyRelevantForElement(makeElement(type)),
      true,
      `Expected ${type} to show Typography section`
    );
  }
});

test('shouldShowPrimaryTextField gates generic top text box accurately', () => {
  assert.equal(shouldShowPrimaryTextField(makeElement('box')), true);
  assert.equal(shouldShowPrimaryTextField(makeElement('heading')), true);
  assert.equal(shouldShowPrimaryTextField(makeElement('button')), true);
  assert.equal(shouldShowPrimaryTextField(makeElement('pure_text')), true);

  assert.equal(shouldShowPrimaryTextField(makeElement('image')), false);
  assert.equal(shouldShowPrimaryTextField(makeElement('divider')), false);
  assert.equal(shouldShowPrimaryTextField(makeElement('pure_divider')), false);
  assert.equal(shouldShowPrimaryTextField(makeElement('fa_watermark')), false);
  assert.equal(shouldShowPrimaryTextField(makeElement('relationship_tree')), false);
});

test('getInspectorSectionSummaries formats compact Figma-style header summaries', () => {
  const baseBox = makeElement('box', {
    x: 40,
    y: 80,
    width: 300,
    height: 120,
    bgColor: '#242220',
    borderWidth: 2,
    bordersLinked: true,
    shadow: 'none',
    hoverEffect: 'none',
    idleAnimation: 'none',
    tooltip: '',
    collapsible: false,
    linkUrl: '',
    url: '',
    bsClasses: '',
    faIcon: '',
    customCssClass: '',
    customInlineStyle: '',
    rawInnerHtml: '',
    modifiers: [],
  });
  const baseSummary = getInspectorSectionSummaries(baseBox, 0);
  assert.equal(baseSummary.layout, '300×120 · 40,80');
  assert.equal(baseSummary.appearance, '#242220 · 2px');
  assert.equal(baseSummary.effects, 'None');
  assert.equal(baseSummary.interactions, 'Static');
  assert.equal(baseSummary.bsFa, 'None');
  assert.equal(baseSummary.rawOverride, 'None');

  const interactiveImage = makeElement('image', {
    url: 'https://example.com/art.png',
    clickAction: 'lightbox',
    hoverAction: 'swap_image',
    glassBlur: 8,
    bgColor: 'transparent',
    borderWidth: 0,
    modifiers: [
      {
        id: 'mod-1',
        type: 'ribbon',
        enabled: true,
        text: 'NEW',
        color: '#ff0066',
        position: 'top_right',
        size: 100,
      },
    ],
  });
  const imgSummary = getInspectorSectionSummaries(interactiveImage, 0);
  assert.equal(imgSummary.content, 'Image Set');
  assert.equal(imgSummary.appearance, 'Clear · 0px');
  assert.equal(imgSummary.effects, '2 Active (1 Mod)');
  assert.equal(imgSummary.interactions, 'Lightbox, Hover');

  const interactiveBtn = makeElement('button', {
    linkUrl: 'https://toyhou.se/char',
    collapsible: true,
    hoverEffect: 'lift',
    idleAnimation: 'float',
    tooltip: 'Character Sheet',
    bordersLinked: false,
    rotation: 15,
    bsClasses: 'btn shadow-sm',
    faIcon: 'fas fa-star',
    customInlineStyle: 'letter-spacing: 1px;',
  });
  const btnSummary = getInspectorSectionSummaries(interactiveBtn, 2);
  assert.equal(btnSummary.layout.includes('15°'), true);
  assert.equal(btnSummary.layout.includes('2 items'), true);
  assert.equal(btnSummary.appearance.includes('4-side'), true);
  assert.equal(btnSummary.interactions, 'Link, Spoiler, Hover, Anim, Tip');
  assert.equal(btnSummary.bsFa, '2 BS · FA');
  assert.equal(btnSummary.rawOverride, 'Active');

  const moodboard = makeElement('moodboard', { gallery: undefined });
  assert.equal(getInspectorSectionSummaries(moodboard, 0).content, '4 Slots');

  const pureDiv = makeElement('pure_divider', {
    borderWidth: 3,
    borderStyle: 'dashed',
  });
  assert.equal(getInspectorSectionSummaries(pureDiv, 0).content, '3px dashed');
});
