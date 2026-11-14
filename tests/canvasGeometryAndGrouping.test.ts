import test from 'node:test';
import assert from 'node:assert/strict';
import {
  computeMultiSelectMoveDelta,
  computeSmartMoveSnap,
  computeSmartResizeSnap,
  SnapRect,
} from '../src/utils/snapGeometry';
import {
  cloneElementsHierarchy,
  groupSelectedElementsIntoContainer,
} from '../src/utils/elementHierarchy';
import { extractDesignImageUrls } from '../src/utils/studioSettings';
import { migrateProjectPayload, PROJECT_FILE_VERSION } from '../src/hooks/useProjectHistory';
import { buildDefaultElement } from '../src/utils/elementFactory';
import { DesignElement } from '../src/types/schema';

test('computeSmartMoveSnap scales snap tolerance by canvas zoom', () => {
  const stationary: SnapRect[] = [{ id: 'target', x: 100, y: 100, width: 120, height: 80 }];

  // Delta = 10px from edge x=100
  const zoomedOutSnap = computeSmartMoveSnap({
    rawX: 110,
    rawY: 200,
    width: 80,
    height: 60,
    canvasWidth: 800,
    canvasHeight: 600,
    others: stationary,
    guides: [],
    magneticSnap: true,
    zoom: 0.5, // screen tolerance 7px -> 14px canvas tolerance
  });
  assert.equal(zoomedOutSnap.x, 100, 'At zoom=0.5, delta 10px is within 14px scaled tolerance and snaps to 100');

  // Delta = 5px from edge x=100
  const zoomedInSnap = computeSmartMoveSnap({
    rawX: 105,
    rawY: 200,
    width: 80,
    height: 60,
    canvasWidth: 800,
    canvasHeight: 600,
    others: stationary,
    guides: [],
    magneticSnap: true,
    zoom: 2.0, // screen tolerance 7px -> 3.5px canvas tolerance
  });
  assert.notEqual(zoomedInSnap.x, 100, 'At zoom=2.0, delta 5px exceeds 3.5px scaled tolerance');
});

test('computeMultiSelectMoveDelta snaps selection union bounding box to nearby target edges', () => {
  const selectedA: SnapRect = { id: 'a', x: 100, y: 100, width: 80, height: 60 };
  const selectedB: SnapRect = { id: 'b', x: 200, y: 140, width: 100, height: 80 };
  // Union bbox: x=100, y=100, right=300, width=200, height=120
  const others: SnapRect[] = [{ id: 'other', x: 320, y: 90, width: 100, height: 100 }];

  // Moving dx=17 puts union right edge at 317 (3px from 320, within tolerance 7px)
  const res = computeMultiSelectMoveDelta({
    movingRects: [selectedA, selectedB],
    dx: 17,
    dy: 0,
    canvasWidth: 800,
    canvasHeight: 600,
    others,
    guides: [],
    magneticSnap: true,
    zoom: 1,
  });

  assert.equal(res.dx, 20, 'Selection union right edge should snap 300+dx -> 320 (dx = 20)');
  assert.equal(res.dy, 0);
  assert.ok(res.lines.some((l) => l.axis === 'x' && l.pos === 320));
});

test('computeSmartResizeSnap clamps west/north resize against minW/minH without sliding anchor edge', () => {
  // Resizing NW handle aggressively inward (dx = +90, dy = +80 on 100x100 box)
  const res = computeSmartResizeSnap({
    dir: 'nw',
    origX: 200,
    origY: 200,
    origW: 100,
    origH: 100,
    dx: 90,
    dy: 80,
    minW: 40,
    minH: 30,
    canvasWidth: 800,
    canvasHeight: 600,
    others: [],
    guides: [],
    magneticSnap: false,
  });

  // Anchor right=300, bottom=300 MUST remain intact!
  assert.equal(res.width, 40);
  assert.equal(res.height, 30);
  assert.equal(res.x, 260);
  assert.equal(res.y, 270);
  assert.equal(res.x + res.width, 300);
  assert.equal(res.y + res.height, 300);
});

test('groupSelectedElementsIntoContainer assigns childOffsetX/childOffsetY relative to new group padding', () => {
  const el1: DesignElement = {
    ...buildDefaultElement('text', [], 'paper', null),
    id: 'sel-1',
    x: 120,
    y: 150,
    width: 140,
    height: 60,
    parentId: null,
  };
  const el2: DesignElement = {
    ...buildDefaultElement('badge', [], 'paper', null),
    id: 'sel-2',
    x: 280,
    y: 210,
    width: 120,
    height: 44,
    parentId: null,
  };
  const untouched: DesignElement = {
    ...buildDefaultElement('text', [], 'paper', null),
    id: 'other-1',
    x: 20,
    y: 20,
  };

  const { elements, containerId } = groupSelectedElementsIntoContainer({
    elements: [el1, el2, untouched],
    selectedIds: ['sel-1', 'sel-2'],
    uiTheme: 'paper',
    canvasWidth: 800,
    generateId: () => 'group-box-1',
  });

  const groupBox = elements.find((e) => e.id === containerId);
  assert.ok(groupBox);
  assert.equal(groupBox.containerLayout, 'freeform_offset');
  // MinX=120, MinY=150, pad=16 -> box x=104, y=134, content origin = (104+12, 134+12) or (box.x+pad, box.y+pad)
  // Expect grouped children to preserve relative spacing exactly
  const c1 = elements.find((e) => e.id === 'sel-1')!;
  const c2 = elements.find((e) => e.id === 'sel-2')!;
  assert.equal(c1.parentId, containerId);
  assert.equal(c2.parentId, containerId);
  assert.equal((c2.childOffsetX ?? 0) - (c1.childOffsetX ?? 0), el2.x - el1.x);
  assert.equal((c2.childOffsetY ?? 0) - (c1.childOffsetY ?? 0), el2.y - el1.y);
  assert.ok((c1.childOffsetX ?? -1) >= 0);
  assert.ok((c1.childOffsetY ?? -1) >= 0);
  assert.equal(elements.find((e) => e.id === 'other-1')?.parentId, undefined);
});

test('cloneElementsHierarchy copies selected containers with all nested descendants and remaps parentIds across multiple pastes', () => {
  const parentBox: DesignElement = {
    ...buildDefaultElement('box', [], 'paper', null),
    id: 'box-orig',
    x: 60,
    y: 80,
    width: 300,
    height: 200,
    order: 0,
  };
  const childInside: DesignElement = {
    ...buildDefaultElement('text', [], 'paper', null),
    id: 'child-orig',
    parentId: 'box-orig',
    childOffsetX: 20,
    childOffsetY: 30,
    order: 1,
  };

  let seq = 0;
  const nextId = () => `clone-${++seq}`;

  const paste1 = cloneElementsHierarchy([parentBox, childInside], ['box-orig'], {
    offsetX: 24,
    offsetY: 24,
    canvasWidth: 800,
    canvasHeight: 600,
    generateId: nextId,
  });

  assert.equal(paste1.clones.length, 2, 'Cloning a container must include its nested children');
  const clonedParent1 = paste1.clones.find((e) => e.id === paste1.rootCloneIds[0])!;
  const clonedChild1 = paste1.clones.find((e) => e.id !== clonedParent1.id)!;
  assert.notEqual(clonedParent1.id, 'box-orig');
  assert.equal(clonedParent1.x, 84);
  assert.equal(clonedParent1.y, 104);
  assert.equal(clonedChild1.parentId, clonedParent1.id);
  assert.equal(clonedChild1.childOffsetX, 20);

  // Originals and source selection untouched on a second clone from the same source bundle
  const paste2 = cloneElementsHierarchy([parentBox, childInside], ['box-orig'], {
    offsetX: 48,
    offsetY: 48,
    canvasWidth: 800,
    canvasHeight: 600,
    generateId: nextId,
  });
  const clonedParent2 = paste2.clones.find((e) => e.id === paste2.rootCloneIds[0])!;
  const clonedChild2 = paste2.clones.find((e) => e.id !== clonedParent2.id)!;
  assert.notEqual(clonedParent2.id, clonedParent1.id);
  assert.equal(clonedChild2.parentId, clonedParent2.id);
  assert.equal(clonedParent2.x, 108);
});

test('extractDesignImageUrls includes bgImageUrl and hoverImageUrl', () => {
  const el: DesignElement = {
    ...buildDefaultElement('box', [], 'paper', null),
    id: 'media-box',
    url: 'https://cdn.example/main.png',
    hoverImageUrl: 'https://cdn.example/hover.png',
    bgImageUrl: 'https://cdn.example/bg.png',
  };
  const urls = extractDesignImageUrls([el]);
  assert.ok(urls.includes('https://cdn.example/main.png'));
  assert.ok(urls.includes('https://cdn.example/hover.png'));
  assert.ok(urls.includes('https://cdn.example/bg.png'));
});

test('migrateProjectPayload normalizes legacy v1/v2 payloads, clamps invalid numbers, and backfills missing arrays', () => {
  const legacyRaw = {
    version: '1.4.0',
    name: '  ',
    platform: 'toyhouse_free',
    layoutMode: 'hybrid',
    canvasWidth: -50,
    canvasHeight: Number.NaN,
    elements: [
      {
        ...buildDefaultElement('box', [], 'paper', null),
        id: 'bad-box',
        x: -100,
        y: Number.NaN,
        width: 2,
        height: -10,
      },
    ],
  };

  const migrated = migrateProjectPayload(legacyRaw);
  assert.equal(migrated.version, PROJECT_FILE_VERSION);
  assert.equal(migrated.name, 'Canvas Draft');
  assert.ok((migrated.canvasWidth ?? 0) >= 320);
  assert.ok((migrated.canvasHeight ?? 0) >= 320);
  assert.ok(Array.isArray(migrated.swatches));
  assert.ok(Array.isArray(migrated.guides));
  assert.ok(Array.isArray(migrated.customBlueprints));
  assert.equal(migrated.elements.length, 1);
  assert.ok(migrated.elements[0].x >= 0);
  assert.ok(migrated.elements[0].y >= 0);
  assert.ok(migrated.elements[0].width >= 16);
  assert.ok(migrated.elements[0].height >= 16);
  assert.ok(Array.isArray(migrated.elements[0].modifiers));
});
