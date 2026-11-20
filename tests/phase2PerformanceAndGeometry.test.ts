import test from 'node:test';
import assert from 'node:assert/strict';
import { applyThemeToElements, GLOBAL_THEME_PRESETS } from '../src/engine/themeEngine';
import { applyCoalescedHistoryPush, HistoryCoalesceState } from '../src/hooks/useProjectHistory';
import {
  computeRotatedResizeRect,
  getElementCanvasOrigin,
  getRotatedBoundingBox,
  resolvePointInContainer,
} from '../src/utils/canvasGeometry';
import { buildDefaultElement } from '../src/utils/elementFactory';
import {
  cloneElementsHierarchy,
  groupSelectedElementsIntoContainer,
} from '../src/utils/elementHierarchy';
import {
  buildSnapTargetCache,
  computeMultiSelectMoveDelta,
  computeSmartMoveSnap,
  computeSmartResizeSnap,
  extractOtherSnapRects,
} from '../src/utils/snapGeometry';
import type { DesignElement, SplitModifier } from '../src/types/schema';

function makeBox(id: string, overrides: Partial<DesignElement> = {}): DesignElement {
  const base = buildDefaultElement('box', [], 'paper', null);
  return {
    ...base,
    id,
    x: 100,
    y: 100,
    width: 120,
    height: 80,
    ...overrides,
  };
}

function getWorldAnchorPoint(
  rect: { x: number; y: number; width: number; height: number },
  rotationDeg: number,
  anchorLocalX: number,
  anchorLocalY: number,
): { x: number; y: number } {
  const rad = (rotationDeg * Math.PI) / 180;
  const cos = Math.cos(rad);
  const sin = Math.sin(rad);
  const cx = rect.x + rect.width / 2;
  const cy = rect.y + rect.height / 2;
  return {
    x: cx + (anchorLocalX * cos - anchorLocalY * sin),
    y: cy + (anchorLocalX * sin + anchorLocalY * cos),
  };
}

test('computeRotatedResizeRect keeps opposite anchor fixed at 90°, 180°, and 45°', () => {
  // 90°: pulling East handle downward grows local width without shifting world top anchor
  const r90 = computeRotatedResizeRect({
    dir: 'e',
    origX: 100,
    origY: 100,
    origW: 120,
    origH: 80,
    rotationDeg: 90,
    dx: 0,
    dy: 40,
    minW: 24,
    minH: 20,
    canvasWidth: 1000,
    canvasHeight: 1000,
  });
  assert.equal(r90.width, 160);
  assert.equal(r90.height, 80);
  const before90 = getWorldAnchorPoint({ x: 100, y: 100, width: 120, height: 80 }, 90, -60, 0);
  const after90 = getWorldAnchorPoint(r90, 90, -80, 0);
  assert.ok(Math.abs(before90.x - after90.x) <= 1.1);
  assert.ok(Math.abs(before90.y - after90.y) <= 1.1);

  // 180°: pulling East handle leftward (-X in world = +localX) grows width with opposite anchor stationary
  const r180 = computeRotatedResizeRect({
    dir: 'e',
    origX: 200,
    origY: 150,
    origW: 100,
    origH: 60,
    rotationDeg: 180,
    dx: -30,
    dy: 0,
    minW: 24,
    minH: 20,
    canvasWidth: 1000,
    canvasHeight: 1000,
  });
  assert.equal(r180.width, 130);
  assert.equal(r180.height, 60);
  const before180 = getWorldAnchorPoint({ x: 200, y: 150, width: 100, height: 60 }, 180, -50, 0);
  const after180 = getWorldAnchorPoint(r180, 180, -65, 0);
  assert.ok(Math.abs(before180.x - after180.x) <= 1.1);
  assert.ok(Math.abs(before180.y - after180.y) <= 1.1);

  // 45°: pulling SE along diagonal grows width while keeping NW corner anchor fixed
  const r45 = computeRotatedResizeRect({
    dir: 'se',
    origX: 200,
    origY: 200,
    origW: 100,
    origH: 60,
    rotationDeg: 45,
    dx: 28,
    dy: 28,
    minW: 24,
    minH: 20,
    canvasWidth: 1000,
    canvasHeight: 1000,
  });
  assert.ok(r45.width > 130);
  const before45 = getWorldAnchorPoint({ x: 200, y: 200, width: 100, height: 60 }, 45, -50, -30);
  const after45 = getWorldAnchorPoint(r45, 45, -r45.width / 2, -r45.height / 2);
  assert.ok(Math.abs(before45.x - after45.x) <= 1.5);
  assert.ok(Math.abs(before45.y - after45.y) <= 1.5);
});

test('getRotatedBoundingBox, extractOtherSnapRects, and buildSnapTargetCache match uncached snap results', () => {
  const unrotated = makeBox('u1', { x: 100, y: 100, width: 120, height: 80, rotation: 0 });
  assert.deepEqual(getRotatedBoundingBox(unrotated), { x: 100, y: 100, width: 120, height: 80 });

  const rotatedSibling = makeBox('rot-1', { x: 300, y: 120, width: 100, height: 60, rotation: 45 });
  const aabb = getRotatedBoundingBox(rotatedSibling);
  const expectedExtent = (100 + 60) * Math.SQRT1_2;
  assert.ok(Math.abs(aabb.width - expectedExtent) < 0.01);
  assert.ok(Math.abs(aabb.height - expectedExtent) < 0.01);
  assert.ok(Math.abs(aabb.x + aabb.width / 2 - 350) < 0.01);

  const others = extractOtherSnapRects([unrotated, rotatedSibling], new Set(['u1']));
  assert.equal(others.length, 1);
  assert.ok(Math.abs(others[0].width - expectedExtent) < 0.01);

  const guides = [{ id: 'g1', axis: 'x' as const, pos: 250 }];
  const cache = buildSnapTargetCache({
    others,
    guides,
    canvasWidth: 1000,
    canvasHeight: 800,
    zoom: 1,
  });

  const uncachedMove = computeSmartMoveSnap({
    rawX: 247,
    rawY: 148,
    width: 120,
    height: 80,
    canvasWidth: 1000,
    canvasHeight: 800,
    others,
    guides,
    magneticSnap: true,
    zoom: 1,
  });
  const cachedMove = computeSmartMoveSnap({
    rawX: 247,
    rawY: 148,
    width: 120,
    height: 80,
    canvasWidth: 1000,
    canvasHeight: 800,
    others,
    guides,
    magneticSnap: true,
    zoom: 1,
    cachedTargets: cache,
  });
  assert.deepEqual(cachedMove, uncachedMove);

  const uncachedResize = computeSmartResizeSnap({
    dir: 'se',
    origX: 120,
    origY: 120,
    origW: 100,
    origH: 80,
    dx: 28,
    dy: 12,
    minW: 24,
    minH: 20,
    canvasWidth: 1000,
    canvasHeight: 800,
    others,
    guides,
    magneticSnap: true,
    zoom: 1,
  });
  const cachedResize = computeSmartResizeSnap({
    dir: 'se',
    origX: 120,
    origY: 120,
    origW: 100,
    origH: 80,
    dx: 28,
    dy: 12,
    minW: 24,
    minH: 20,
    canvasWidth: 1000,
    canvasHeight: 800,
    others,
    guides,
    magneticSnap: true,
    zoom: 1,
    cachedTargets: cache,
  });
  assert.deepEqual(cachedResize, uncachedResize);

  const movingRects = [{ id: 'm1', x: 200, y: 120, width: 60, height: 40 }];
  const uncachedMulti = computeMultiSelectMoveDelta({
    movingRects,
    dx: 48,
    dy: 4,
    canvasWidth: 1000,
    canvasHeight: 800,
    others,
    guides,
    magneticSnap: true,
    zoom: 1,
  });
  const cachedMulti = computeMultiSelectMoveDelta({
    movingRects,
    dx: 48,
    dy: 4,
    canvasWidth: 1000,
    canvasHeight: 800,
    others,
    guides,
    magneticSnap: true,
    zoom: 1,
    cachedTargets: cache,
  });
  assert.deepEqual(cachedMulti, uncachedMulti);
});

test('getElementCanvasOrigin and resolvePointInContainer resolve multi-level split pane geometry accurately', () => {
  const splitMod: SplitModifier = {
    id: 'sp-1',
    kind: 'split',
    enabled: true,
    axis: 'vertical',
    panes: 2,
    ratio: 40,
    dividerWidth: 2,
    dividerStyle: 'solid',
    dividerColor: '#333333',
  };
  const root = makeBox('root', {
    x: 50,
    y: 80,
    width: 408,
    height: 208,
    borderWidth: 4,
    bordersLinked: true,
    modifiers: [splitMod],
  });
  // innerW = 400; pane 1 starts at paneX = 160; root inner left = 50 + 4 = 54; top = 80 + 4 = 84
  const nestedParent = makeBox('nested-parent', {
    parentId: 'root',
    parentPaneIndex: 1,
    childOffsetX: 20,
    childOffsetY: 15,
    width: 184,
    height: 124,
    borderWidth: 2,
    bordersLinked: true,
  });
  const grandchild = makeBox('grandchild', {
    parentId: 'nested-parent',
    parentPaneIndex: 0,
    childOffsetX: 10,
    childOffsetY: 8,
    width: 70,
    height: 40,
  });

  const gcOrigin = getElementCanvasOrigin(grandchild, [root, nestedParent, grandchild]);
  // Expected x: 50 + 4 + 160 + 20 + 2 + 10 = 246
  // Expected y: 80 + 4 + 0 + 15 + 2 + 8 = 109
  assert.deepEqual(gcOrigin, { x: 246, y: 109, width: 70, height: 40 });

  const leftHit = resolvePointInContainer(root, 70, 100, 60, 40, root.x, root.y);
  assert.equal(leftHit.paneIdx, 0);
  assert.equal(leftHit.offsetX, 16);

  const rightHit = resolvePointInContainer(root, 260, 110, 60, 40, root.x, root.y);
  assert.equal(rightHit.paneIdx, 1);
  // rawRelX = 260 - 50 - 4 = 206; pane 1 paneX = 160 => offsetX = 46
  assert.equal(rightHit.offsetX, 46);
  assert.equal(rightHit.offsetY, 26);
});

test('applyCoalescedHistoryPush coalesces rapid same-key edits and respects expiry, key change, and maxEntries', () => {
  const s0 = [makeBox('a', { x: 10 })];
  const s1 = [makeBox('a', { x: 20 })];
  const s2 = [makeBox('a', { x: 30 })];
  const s3 = [makeBox('a', { x: 40 })];
  const s4 = [makeBox('a', { x: 40, y: 99 })];

  // Initial push from index 0
  const p1 = applyCoalescedHistoryPush([s0], 0, s1, null, 'edit:a:x', 1000, 450, 5);
  assert.equal(p1.history.length, 2);
  assert.equal(p1.historyIdx, 1);

  // Rapid same-key push within window (1200 - 1000 = 200 <= 450): replaces index 1 cleanly
  const p2 = applyCoalescedHistoryPush(p1.history, p1.historyIdx, s2, p1.coalesceState, 'edit:a:x', 1200, 450, 5);
  assert.equal(p2.history.length, 2);
  assert.equal(p2.historyIdx, 1);
  assert.equal(p2.history[1][0].x, 30);

  // Expired window (1750 - 1200 = 550 > 450): creates new entry at index 2
  const p3 = applyCoalescedHistoryPush(p2.history, p2.historyIdx, s3, p2.coalesceState, 'edit:a:x', 1750, 450, 5);
  assert.equal(p3.history.length, 3);
  assert.equal(p3.historyIdx, 2);

  // Different key within window: creates new entry at index 3
  const p4 = applyCoalescedHistoryPush(p3.history, p3.historyIdx, s4, p3.coalesceState, 'edit:a:y', 1800, 450, 5);
  assert.equal(p4.history.length, 4);
  assert.equal(p4.historyIdx, 3);

  // Cleared coalesce state forces new entry even with identical key
  const p5 = applyCoalescedHistoryPush(p4.history, p4.historyIdx, s1, null as HistoryCoalesceState | null, 'edit:a:y', 1820, 450, 5);
  assert.equal(p5.history.length, 5);
  assert.equal(p5.historyIdx, 4);

  // Max entries clamp trims oldest entry
  const p6 = applyCoalescedHistoryPush(p5.history, p5.historyIdx, s2, p5.coalesceState, 'edit:a:z', 1850, 450, 5);
  assert.equal(p6.history.length, 5);
  assert.equal(p6.historyIdx, 4);
  assert.equal(p6.history[0][0].x, 30); // s0 trimmed, shifted window starts at s2 (x=30)
});

test('pure lock guards block grouping & global theming of locked layers while clones unlock', () => {
  const unlocked1 = makeBox('u1', { x: 20, y: 20 });
  const unlocked2 = makeBox('u2', { x: 180, y: 40 });
  const locked = makeBox('l1', {
    x: 320,
    y: 40,
    locked: true,
    bgColor: '#123456',
    textColor: '#abcdef',
    fontFamily: 'mono',
  });

  // Grouping 1 unlocked + 1 locked refuses to group (< 2 unlocked)
  const blockedGroup = groupSelectedElementsIntoContainer({
    elements: [unlocked1, locked],
    selectedIds: ['u1', 'l1'],
    uiTheme: 'paper',
    canvasWidth: 1000,
    canvasHeight: 800,
  });
  assert.equal(blockedGroup.containerId, null);

  // Grouping 2 unlocked + 1 locked groups only the unlocked pair, leaving locked at root
  const mixedGroup = groupSelectedElementsIntoContainer({
    elements: [unlocked1, unlocked2, locked],
    selectedIds: ['u1', 'u2', 'l1'],
    uiTheme: 'paper',
    canvasWidth: 1000,
    canvasHeight: 800,
  });
  assert.ok(mixedGroup.containerId);
  const lockedAfter = mixedGroup.elements.find((e) => e.id === 'l1');
  assert.equal(lockedAfter?.parentId ?? null, null);

  // Cloning a locked element creates an unlocked editable copy
  const cloned = cloneElementsHierarchy([locked], ['l1'], {
    canvasWidth: 1000,
    canvasHeight: 800,
    offsetX: 20,
    offsetY: 20,
  });
  assert.equal(cloned.clones.length, 1);
  assert.equal(cloned.clones[0].locked, false);

  // Applying global theme leaves locked elements completely untouched
  const palette = GLOBAL_THEME_PRESETS[0];
  const themed = applyThemeToElements([unlocked1, locked], palette, {
    applyColors: true,
    applyFonts: true,
    isToyhouseFree: true,
  });
  const themedUnlocked = themed.find((e) => e.id === 'u1');
  const themedLocked = themed.find((e) => e.id === 'l1');
  assert.equal(themedUnlocked?.bgColor, palette.surfaceBg);
  assert.equal(themedLocked?.bgColor, '#123456');
  assert.equal(themedLocked?.textColor, '#abcdef');
  assert.equal(themedLocked?.fontFamily, 'mono');
});
