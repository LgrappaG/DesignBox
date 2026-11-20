import test from 'node:test';
import assert from 'node:assert/strict';
import { installNodeDomParser } from './helpers/nodeDomParser';

installNodeDomParser();

import {
  getElementF2UShieldReport,
  isSafeUrlValue,
  maskElementForF2USimulation,
  sanitizeF2UBodyHtml,
  sanitizeInlineCssForF2U,
  sanitizeInlineCssForPro,
  sanitizeRichHtmlForPro,
} from '../src/engine/f2uShield';
import {
  buildSvgMaskStyle,
  canUseF2UBackgroundPunch,
} from '../src/engine/modifierRenderer';
import {
  generatePlatformExport,
  renderInnerElementHTML,
} from '../src/engine/layoutSolver';
import { parseToyhouseHtmlToDesign } from '../src/engine/htmlImporter';
import { buildDefaultElement } from '../src/utils/elementFactory';
import { cloneElementsHierarchy } from '../src/utils/elementHierarchy';
import type {
  BooleanMaskModifier,
  CutoutHoleModifier,
  DesignElement,
  SplitModifier,
  UiTheme,
} from '../src/types/schema';

function makeBox(
  overrides: Partial<DesignElement> = {},
  existing: DesignElement[] = [],
  uiTheme: UiTheme = 'paper',
): DesignElement {
  const base = buildDefaultElement('box', existing, uiTheme, null);
  return {
    ...base,
    x: 24,
    y: 24,
    width: 320,
    height: 180,
    ...overrides,
  };
}

test('F2U Shield & Pro sanitizer block XSS, slash bypasses, XML data URLs, and CSS comment evasion', () => {
  assert.equal(isSafeUrlValue('https://example.com/banner.png'), true);
  assert.equal(isSafeUrlValue('#section-1'), true);
  assert.equal(isSafeUrlValue('javascript:alert(1)'), false);
  assert.equal(
    isSafeUrlValue('data:application/xhtml+xml,<svg xmlns="http://www.w3.org/2000/svg"/>'),
    false,
  );
  assert.equal(isSafeUrlValue('data:text/xml,<root/>'), false);
  assert.equal(isSafeUrlValue('data:application/xml,<root/>'), false);

  const f2uBody = sanitizeF2UBodyHtml(
    '<img/onerror="alert(1)" src="https://example.com/a.png"><a/href="javascript:alert(1)">bad</a><script/src="https://evil.test/x.js"></script><span>ok</span>',
  );
  assert.doesNotMatch(f2uBody, /onerror/i);
  assert.doesNotMatch(f2uBody, /javascript:/i);
  assert.doesNotMatch(f2uBody, /<script/i);
  assert.match(f2uBody, /<span>ok<\/span>/);

  const proHtml = sanitizeRichHtmlForPro(
    '<style>.card{color:#fff;width:expression(alert(1));background:url(javascript:alert(1))}</style><iframe src="https://evil.test"></iframe><img/onload="alert(2)" src="https://example.com/b.png"><div class="safe">hello</div>',
  );
  assert.match(proHtml, /<style>.*\.card.*<\/style>/s);
  assert.doesNotMatch(proHtml, /expression\(/i);
  assert.doesNotMatch(proHtml, /javascript:/i);
  assert.doesNotMatch(proHtml, /<iframe/i);
  assert.doesNotMatch(proHtml, /onload/i);
  assert.match(proHtml, /<div class="safe">hello<\/div>/);

  const f2uCss = sanitizeInlineCssForF2U(
    'color: #111" onclick="alert(1); /*trick*/backdrop-filter: blur(8px); transform: rotate(15deg); filter: blur(2px); mix-blend-mode: multiply; padding: calc(10px + 2px); font-family: "Georgia", serif; border-radius: 8px;',
  );
  assert.doesNotMatch(f2uCss.cleanCss, /"/);
  assert.doesNotMatch(f2uCss.cleanCss, /onclick=/i);
  assert.doesNotMatch(f2uCss.cleanCss, /backdrop-filter/i);
  assert.doesNotMatch(f2uCss.cleanCss, /transform/i);
  assert.doesNotMatch(f2uCss.cleanCss, /filter:/i);
  assert.doesNotMatch(f2uCss.cleanCss, /mix-blend-mode/i);
  assert.doesNotMatch(f2uCss.cleanCss, /calc\(/i);
  assert.match(f2uCss.cleanCss, /font-family:\s*'Georgia',\s*serif/i);
  assert.match(f2uCss.cleanCss, /border-radius:\s*8px/i);

  const proCss = sanitizeInlineCssForPro(
    'color: #fff; width: expression(alert(1)); background: url(javascript:alert(1)); opacity: 0.9;',
  );
  assert.doesNotMatch(proCss, /expression\(/i);
  assert.doesNotMatch(proCss, /javascript:/i);
  assert.match(proCss, /opacity:\s*0\.9/i);
});

test('F2U Shield report avoids undefined hover label and F2U mask simulation preserves non-destructive rules', () => {
  const boolMask: BooleanMaskModifier = {
    id: 'bm-1',
    kind: 'boolean_mask',
    enabled: true,
    operation: 'intersect',
    maskShape: 'star',
    xPct: 50,
    yPct: 50,
    widthPx: 80,
    heightPx: 80,
  };
  const cutoutHole: CutoutHoleModifier = {
    id: 'ch-1',
    kind: 'cutout_hole',
    enabled: true,
    mode: 'transparent_hole',
    shape: 'circle',
    xPct: 50,
    yPct: 50,
    widthPx: 40,
    heightPx: 40,
    ringWidth: 2,
    ringColor: '#111111',
  };

  const richEl = makeBox({
    bgColor: '#223344',
    bgPattern: 'none',
    overflowX: 'hidden',
    overflowY: 'hidden',
    hoverEffect: undefined as unknown as DesignElement['hoverEffect'],
    hoverAction: 'zoom',
    blendMode: 'multiply',
    imgBrightness: 120,
    imgContrast: 110,
    imgGrayscale: 40,
    imgSepia: 20,
    imgBlur: 4,
    customHtml: '<style>.x{color:red}</style><script>alert(1)</script><p>safe</p>',
    modifiers: [boolMask, cutoutHole],
  });

  const report = getElementF2UShieldReport(richEl);
  const labels = report.items.map((w) => w.label).join(' ');
  assert.doesNotMatch(labels, /undefined/);
  assert.match(labels, /Hover FX \(zoom\)/);

  const sim = maskElementForF2USimulation(richEl);
  assert.equal(sim.blendMode, 'normal');
  assert.equal(sim.imgBrightness, undefined);
  assert.equal(sim.imgContrast, undefined);
  assert.equal(sim.imgGrayscale, undefined);
  assert.equal(sim.imgSepia, undefined);
  assert.equal(sim.imgBlur, undefined);
  assert.doesNotMatch(sim.customHtml ?? '', /<style|<script/i);
  assert.match(sim.customHtml ?? '', /<p>safe<\/p>/);
  assert.equal(sim.modifiers?.some((m) => m.kind === 'boolean_mask'), false);
  assert.equal(sim.modifiers?.some((m) => m.kind === 'cutout_hole'), true);
  // Original Pro state stays intact
  assert.equal(richEl.blendMode, 'multiply');
  assert.equal(richEl.modifiers?.length, 2);

  const line = buildDefaultElement('pure_line', [], 'paper', null);
  line.rotation = 37;
  const lineSim = maskElementForF2USimulation(line);
  assert.equal(lineSim.rotation, 37);
});

test('modifierRenderer handles cutout overflow guard, single-quoted SVG <mask>, and nested intersects', () => {
  const hole: CutoutHoleModifier = {
    id: 'ch-1',
    kind: 'cutout_hole',
    enabled: true,
    mode: 'transparent_hole',
    shape: 'circle',
    xPct: 50,
    yPct: 50,
    widthPx: 40,
    heightPx: 40,
    ringWidth: 2,
    ringColor: '#111111',
  };

  const visibleOverflowEl = makeBox({
    bgColor: '#223344',
    bgPattern: 'none',
    overflowX: 'visible',
    overflowY: 'hidden',
    modifiers: [hole],
  });
  assert.equal(canUseF2UBackgroundPunch(visibleOverflowEl), false);

  const clippedEl = makeBox({
    bgColor: '#223344',
    bgPattern: 'none',
    overflowX: 'hidden',
    overflowY: 'hidden',
    modifiers: [hole],
  });
  assert.equal(canUseF2UBackgroundPunch(clippedEl), true);

  const m1: BooleanMaskModifier = {
    id: 'bm-1',
    kind: 'boolean_mask',
    enabled: true,
    operation: 'intersect',
    maskShape: 'circle',
    xPct: 50,
    yPct: 50,
    widthPx: 80,
    heightPx: 80,
  };
  const m2: BooleanMaskModifier = {
    id: 'bm-2',
    kind: 'boolean_mask',
    enabled: true,
    operation: 'intersect',
    maskShape: 'star',
    xPct: 50,
    yPct: 50,
    widthPx: 80,
    heightPx: 80,
  };
  const maskedEl = makeBox({ modifiers: [m1, m2] });
  const { maskCss } = buildSvgMaskStyle(maskedEl);
  assert.match(maskCss, /url\('data:image\/svg\+xml,/);
  assert.doesNotMatch(maskCss, /url\("data:image\/svg\+xml/);
  const encodedSvgMatch = maskCss.match(/url\('data:image\/svg\+xml,([^']+)'\)/);
  assert.ok(encodedSvgMatch);
  const decodedCss = decodeURIComponent(encodedSvgMatch[1]);
  assert.match(decodedCss, /<mask\b/);
  assert.match(decodedCss, /<g\s+mask="url\(#mi0\)"/);
  assert.match(decodedCss, /<g\s+mask="url\(#mi1\)"/);
});

test('export preserves CSS semicolons, align-content, single finalize pass on pure_image_slot, and excludes hidden subtree', () => {
  const styledBox = makeBox({
    bgColor: '#223344',
    bgPattern: 'dots',
    borderWidth: 2,
    borderColor: '#aabbcc',
  });

  for (const mode of ['freeform', 'hybrid'] as const) {
    for (const platform of ['toyhouse_free', 'toyhouse_premium'] as const) {
      const res = generatePlatformExport([styledBox], mode, platform, 1200, 900);
      assert.match(res.html, /background-color:\s*#223344;/i);
      assert.match(res.html, /border:\s*2px\s+solid\s+#aabbcc;/i);
      assert.doesNotMatch(res.html, /\)border:/i);
      assert.doesNotMatch(res.html, /#[0-9a-f]{6}border:/i);
      if (mode === 'hybrid' && platform === 'toyhouse_free') {
        assert.match(res.html, /align-content:\s*flex-start;/i);
      }
    }
  }

  const slot = buildDefaultElement('pure_image_slot', [], 'paper', null);
  slot.url = 'https://example.com/pic.png';
  slot.rotation = 90;
  slot.f2uCollapseRole = 'target';
  slot.f2uCollapseId = 'cslot-1';
  const slotHtml = renderInnerElementHTML(slot, true, [slot], false, true);
  const rotateCount = (slotHtml.match(/fa-rotate-90/g) || []).length;
  assert.equal(rotateCount <= 1, true);
  const collapseCount = (slotHtml.match(/id="cslot-1"/g) || []).length;
  assert.equal(collapseCount, 1);

  const hiddenParent = makeBox({ id: 'hidden-parent', hidden: true });
  const childOfHidden = makeBox({
    id: 'child-of-hidden',
    parentId: 'hidden-parent',
    hidden: false,
    content: 'SHOULD_NOT_EXPORT',
  });
  const hiddenExport = generatePlatformExport(
    [hiddenParent, childOfHidden],
    'freeform',
    'toyhouse_free',
    1200,
    900,
  );
  assert.doesNotMatch(hiddenExport.html, /SHOULD_NOT_EXPORT/);
});

test('export strips F2U CSS leaks, XSS payloads, comment breakouts, nested anchors, and renders modifiers/widgets cleanly', () => {
  const widget = buildDefaultElement('custom_widget', [], 'paper', null);
  widget.customHtml = '<style>.w{color:cyan}</style><script>alert(1)</script><p>{{label}}</p>';
  widget.customProps = {
    label: '<b>ok</b><img/onerror="alert(1)" src="https://example.com/a.png">',
  };

  const f2uWidgetOut = generatePlatformExport([widget], 'freeform', 'toyhouse_free', 1200, 900);
  assert.doesNotMatch(f2uWidgetOut.html, /<script|<style|onerror/i);
  const proWidgetOut = generatePlatformExport([widget], 'freeform', 'toyhouse_premium', 1200, 900);
  assert.doesNotMatch(proWidgetOut.html, /<script|onerror/i);
  assert.match(proWidgetOut.html, /<style>.*\.w.*<\/style>/s);

  const attackerBox = makeBox({
    label: 'Card --> <script>alert(1)</script> <!--',
    customInlineStyle:
      'color: red" onclick="alert(2); /*x*/backdrop-filter: blur(4px); filter: blur(3px); mix-blend-mode: screen;',
    bsClasses: 'shadow" onmouseover="alert(3)',
    customCssClass: 'myclass" onclick="alert(4)',
    googleFont: 'Inter;}</style><script>alert(5)</script>',
  });
  const f2uAttackerOut = generatePlatformExport([attackerBox], 'freeform', 'toyhouse_free', 1200, 900);
  assert.doesNotMatch(f2uAttackerOut.html, /onmouseover=|onclick=|<script/i);
  assert.doesNotMatch(f2uAttackerOut.html, /filter:|mix-blend-mode:|backdrop-filter:/i);

  const taped = buildDefaultElement('image', [], 'paper', null);
  taped.url = 'https://example.com/img.png';
  taped.imageRenderMode = 'native_img';
  taped.frameStyle = 'tape';
  taped.rotation = 360;
  const f2uTaped = renderInnerElementHTML(taped, true, [taped], false, true);
  assert.doesNotMatch(f2uTaped, /transform:\s*rotate/i);
  assert.doesNotMatch(f2uTaped, /transition:/i);

  const pureLine = buildDefaultElement('pure_line', [], 'paper', null);
  pureLine.rotation = 37;
  const lineExport = generatePlatformExport([pureLine], 'freeform', 'toyhouse_free', 1200, 900);
  assert.equal(lineExport.warnings.some((w) => w.code === 'TH_F2U_ROTATION_NOTE'), false);
  assert.match(lineExport.html, /37deg/);

  const darkSplit = buildDefaultElement('split_box', [], 'paper', null);
  darkSplit.textColor = '#1F2937';
  const splitMod: SplitModifier = {
    id: 'sp-1',
    kind: 'split',
    enabled: true,
    axis: 'vertical',
    panes: 2,
    ratio: 35,
    dividerWidth: 1,
    dividerStyle: 'solid',
    dividerColor: '#333333',
    pane1Bg: '#0f172a',
    pane2Bg: '#ffffff',
    pane1Text: 'Dark side',
    pane2Text: 'Light side',
  };
  darkSplit.modifiers = [splitMod];
  const splitHtml = renderInnerElementHTML(darkSplit, true, [darkSplit], false, false);
  assert.match(splitHtml, /flex:\s*0\s+0\s+35%/);
  assert.match(splitHtml, /background-color:\s*#0f172a;\s*color:\s*#FFFFFF/i);

  const accordion = buildDefaultElement('accordion', [], 'paper', null);
  accordion.collapseDefaultOpen = true;
  const accHtml = renderInnerElementHTML(accordion, true, [accordion], false, false);
  assert.match(accHtml, /^<div[\s>].*<details\s+open[\s>]/s);

  const folder = buildDefaultElement('folder_header', [], 'paper', null);
  const folderChild = makeBox({
    id: 'folder-child-1',
    parentId: folder.id,
    content: 'NESTED_FOLDER_CHILD',
  });
  const folderExport = generatePlatformExport([folder, folderChild], 'freeform', 'toyhouse_free', 1200, 900);
  assert.match(folderExport.html, /NESTED_FOLDER_CHILD/);

  const stat = buildDefaultElement('stat_bar', [], 'paper', null);
  stat.subContent = '0';
  const statHtml = renderInnerElementHTML(stat, true, [stat], false, false);
  assert.match(statHtml, /0%/);

  const prog = buildDefaultElement('pure_progress', [], 'paper', null);
  prog.subContent = '0';
  const progHtml = renderInnerElementHTML(prog, true, [prog], false, false);
  assert.match(progHtml, /0%/);

  const cassette = buildDefaultElement('cassette_player', [], 'paper', null);
  const cassetteHtml = renderInnerElementHTML(cassette, true, [cassette], false, false);
  assert.doesNotMatch(cassetteHtml, /(?:^|[;\s])py\s*:/);

  const inv = buildDefaultElement('inventory', [], 'paper', null);
  const invHtml = renderInnerElementHTML(inv, true, [inv], false, false);
  assert.doesNotMatch(invHtml, /(?:^|[;\s])shrink\s*:/);
  assert.match(invHtml, /flex-shrink:\s*0/);

  const triggerEl = makeBox({
    f2uCollapseRole: 'trigger',
    f2uCollapseId: 'col-99',
    linkUrl: 'https://example.com/nested',
    content: '<a href="https://example.com/inner">inner link</a> label',
  });
  const triggerHtml = renderInnerElementHTML(triggerEl, true, [triggerEl], false, true);
  const outerAnchorStart = triggerHtml.indexOf('<a ');
  if (outerAnchorStart !== -1) {
    const afterFirstTag = triggerHtml.indexOf('>', outerAnchorStart);
    assert.equal(triggerHtml.slice(afterFirstTag + 1).includes('<a '), false);
  }
});

test('htmlImporter handles numeric collapse IDs, preserves .row containers, avoids card-body > p dupes, sans-serif, and round-trip remapping', () => {
  const numericCollapseHtml = `
    <div class="container">
      <a data-toggle="collapse" href="#123">Toggle</a>
      <div class="collapse" id="123"><div class="card card-body"><p>Inside panel</p></div></div>
    </div>
  `;
  assert.doesNotThrow(() => parseToyhouseHtmlToDesign(numericCollapseHtml, { uiTheme: 'paper' }));

  const rowWithTrigger = `
    <div class="row">
      <div class="col-6"><a data-toggle="collapse" href="#abc">Trigger</a></div>
      <div class="col-6"><div class="card card-body"><p>Col B</p></div></div>
    </div>
  `;
  const importedRow = parseToyhouseHtmlToDesign(rowWithTrigger, { uiTheme: 'paper' });
  assert.equal(importedRow.elements.length >= 2, true);

  const singleCardHtml = `
    <div class="card card-body" style="font-family: Arial, sans-serif;">
      <p>Only once</p>
    </div>
  `;
  const importedCard = parseToyhouseHtmlToDesign(singleCardHtml, { uiTheme: 'paper' });
  const textContents = importedCard.elements
    .map((e) => `${e.content || ''} ${e.subContent || ''}`)
    .filter((c) => c.includes('Only once'));
  assert.equal(textContents.length, 1);
  const sansEl = importedCard.elements.find((e) =>
    `${e.content || ''} ${e.subContent || ''}`.includes('Only once'),
  );
  assert.equal(sansEl?.fontFamily, 'sans');

  const roundtripBox = makeBox({ id: 'el-1', parentId: null });
  const roundtripChild = makeBox({ id: 'el-2', parentId: 'el-1', content: 'Child RT' });
  const exported = generatePlatformExport(
    [roundtripBox, roundtripChild],
    'freeform',
    'toyhouse_free',
    1200,
    900,
  );
  const reimported = parseToyhouseHtmlToDesign(exported.html, {
    uiTheme: 'paper',
    existingCount: 2,
    startRowIndex: 3,
    maxRowIndex: 3,
    startY: 400,
  });
  const ids = reimported.elements.map((e) => e.id);
  assert.equal(ids.includes('el-1'), false);
  assert.equal(ids.includes('el-2'), false);
  const child = reimported.elements.find((e) => (e.content || '').includes('Child RT'));
  const parent = reimported.elements.find((e) => e.id !== child?.id);
  assert.ok(child && parent);
  assert.equal(child.parentId, parent.id);
});

test('elementFactory & elementHierarchy generate unique collapse IDs, preserve watermark opacity, and deep-clone split centerBadge', () => {
  const col1 = buildDefaultElement('pure_collapse', [], 'paper', null);
  const col2 = buildDefaultElement('pure_collapse', [col1], 'paper', null);
  assert.ok(col1.f2uCollapseId && col2.f2uCollapseId);
  assert.notEqual(col1.f2uCollapseId, col2.f2uCollapseId);
  assert.notEqual(col1.id, col2.id);

  const watermark = buildDefaultElement('fa_watermark', [], 'paper', null);
  assert.equal(watermark.opacity, 55);

  const splitMod: SplitModifier = {
    id: 'sp-badge-1',
    kind: 'split',
    enabled: true,
    axis: 'horizontal',
    panes: 2,
    ratio: 50,
    dividerWidth: 1,
    dividerStyle: 'solid',
    dividerColor: '#333333',
    centerBadge: {
      enabled: true,
      shape: 'circle',
      size: 28,
      bgColor: '#111111',
      borderColor: '#ffffff',
      borderWidth: 1,
      text: '★',
    },
  };
  const splitOwner = makeBox({
    id: 'split-owner-1',
    modifiers: [splitMod],
  });
  const cloned = cloneElementsHierarchy([splitOwner, col1], [splitOwner.id, col1.id], {
    canvasWidth: 1200,
    canvasHeight: 900,
    offsetX: 20,
    offsetY: 20,
  });
  const clonedSplit = cloned.clones.find((c) => c.modifiers?.some((m) => m.kind === 'split'));
  const clonedCol = cloned.clones.find((c) => c.type === 'pure_collapse');
  assert.ok(clonedSplit && clonedCol);
  assert.notEqual(clonedCol.f2uCollapseId, col1.f2uCollapseId);

  const origMod = splitOwner.modifiers?.[0];
  const cloneMod = clonedSplit.modifiers?.[0];
  assert.ok(origMod?.kind === 'split' && origMod.centerBadge);
  assert.ok(cloneMod?.kind === 'split' && cloneMod.centerBadge);
  cloneMod.centerBadge.bgColor = '#ff00ff';
  assert.equal(origMod.centerBadge.bgColor, '#111111');
});
