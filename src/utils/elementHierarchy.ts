import { DesignElement, UiTheme } from '../types/schema';
import { getInnerBoxGeometry } from './canvasGeometry';

export interface GroupElementsParams {
  elements: ReadonlyArray<DesignElement>;
  selectedIds: ReadonlyArray<string>;
  uiTheme: UiTheme;
  canvasWidth: number;
  canvasHeight?: number;
  generateId?: () => string;
}

export interface GroupElementsResult {
  elements: DesignElement[];
  containerId: string | null;
}

export interface CloneElementsOptions {
  offsetX?: number;
  offsetY?: number;
  canvasWidth: number;
  canvasHeight: number;
  generateId?: () => string;
  labelSuffix?: string;
}

export interface CloneElementsResult {
  clones: DesignElement[];
  rootCloneIds: string[];
}

function defaultIdGenerator(prefix = 'el'): () => string {
  let seq = 0;
  return () => `${prefix}-${Date.now().toString(36)}-${(++seq).toString(36)}-${Math.random().toString(36).slice(2, 5)}`;
}

/** Deep-copy nested array/object fields on a DesignElement so clones never share mutable references. */
function cloneElementFields(el: DesignElement): DesignElement {
  return {
    ...el,
    modifiers: el.modifiers ? el.modifiers.map((m) => ({ ...m })) : undefined,
    tabs: el.tabs ? el.tabs.map((t) => ({ ...t })) : undefined,
    gallery: el.gallery ? el.gallery.map((g) => ({ ...g })) : undefined,
    kvItems: el.kvItems ? el.kvItems.map((kv) => ({ ...kv })) : undefined,
    paletteColors: el.paletteColors ? [...el.paletteColors] : undefined,
    inventoryItems: el.inventoryItems ? el.inventoryItems.map((inv) => ({ ...inv })) : undefined,
    timelineMilestones: el.timelineMilestones ? el.timelineMilestones.map((tm) => ({ ...tm })) : undefined,
    relationNodes: el.relationNodes ? el.relationNodes.map((n) => ({ ...n })) : undefined,
    customPropDefs: el.customPropDefs ? el.customPropDefs.map((d) => ({ ...d })) : undefined,
    customProps: el.customProps ? { ...el.customProps } : undefined,
  };
}

/**
 * Wraps 2+ selected elements into a new `freeform_offset` container box and assigns
 * each grouped child's `childOffsetX`/`childOffsetY` relative to the box inner content origin.
 */
export function groupSelectedElementsIntoContainer({
  elements,
  selectedIds,
  uiTheme,
  canvasWidth,
  canvasHeight,
  generateId,
}: GroupElementsParams): GroupElementsResult {
  const selectedSet = new Set(selectedIds);
  const selected = elements.filter(
    (e) => selectedSet.has(e.id) && (!e.parentId || !selectedSet.has(e.parentId))
  );
  if (selected.length < 2) {
    return { elements: [...elements], containerId: null };
  }

  const minX = Math.min(...selected.map((e) => e.x));
  const minY = Math.min(...selected.map((e) => e.y));
  const maxX = Math.max(...selected.map((e) => e.x + (e.childCustomWidth || e.width)));
  const maxY = Math.max(...selected.map((e) => e.y + (e.childCustomHeight || e.height)));
  const pad = 16;

  const boxId = generateId
    ? generateId()
    : `box-group-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 6)}`;
  const isLight = uiTheme !== 'carbon';
  const boxX = Math.max(0, Math.round(minX - pad));
  const boxY = Math.max(0, Math.round(minY - pad));
  const boxW = Math.min(Math.max(40, canvasWidth - boxX), Math.max(40, Math.round(maxX - boxX + pad)));
  const rawH = Math.max(40, Math.round(maxY - boxY + pad));
  const boxH = canvasHeight !== undefined ? Math.min(Math.max(40, canvasHeight - boxY), rawH) : rawH;

  const minZ = Math.min(...selected.map((e) => e.zIndex || 10));
  const maxRow = elements.reduce((m, e) => Math.max(m, e.rowIndex), 0);

  const newBox: DesignElement = {
    id: boxId,
    type: 'box',
    label: `Group Box (${selected.length} items)`,
    content: '',
    x: boxX,
    y: boxY,
    width: boxW,
    height: boxH,
    zIndex: Math.max(1, minZ - 1),
    opacity: 100,
    order: elements.length,
    rowIndex: maxRow + 1,
    colSpan: 12,
    bgColor: isLight ? '#F2EFE9' : '#242220',
    textColor: isLight ? '#2C2A28' : '#ECE7DF',
    borderColor: isLight ? '#C86D51' : '#B85D3B',
    borderWidth: 1,
    borderStyle: 'solid',
    borderRadius: 10,
    padding: 12,
    fontSize: 13,
    fontWeight: 'medium',
    textAlign: 'left',
    shadow: 'none',
    hoverEffect: 'none',
    containerLayout: 'freeform_offset',
    modifiers: [],
  };

  const { bL, bT } = getInnerBoxGeometry(newBox);
  const contentOriginX = boxX + bL;
  const contentOriginY = boxY + bT;
  const groupedRootIds = new Set(selected.map((e) => e.id));

  const updated = elements.map((el) => {
    if (!groupedRootIds.has(el.id)) return el;
    return {
      ...el,
      parentId: boxId,
      parentPaneIndex: 0,
      childOffsetX: Math.max(0, Math.round(el.x - contentOriginX)),
      childOffsetY: Math.max(0, Math.round(el.y - contentOriginY)),
    };
  });

  return {
    elements: [...updated, newBox],
    containerId: boxId,
  };
}

/**
 * Collects top-most selected roots plus all recursive descendants, assigns fresh IDs,
 * remaps nested `parentId` references, and shifts root positions without mutating inputs.
 */
export function cloneElementsHierarchy(
  sourceElements: ReadonlyArray<DesignElement>,
  selectedRootIds: ReadonlyArray<string>,
  options: CloneElementsOptions
): CloneElementsResult {
  if (selectedRootIds.length === 0 || sourceElements.length === 0) {
    return { clones: [], rootCloneIds: [] };
  }

  const byId = new Map<string, DesignElement>();
  for (const el of sourceElements) {
    byId.set(el.id, el);
  }

  const requestedSet = new Set(selectedRootIds);
  const hasRequestedAncestor = (el: DesignElement): boolean => {
    const visited = new Set<string>([el.id]);
    let cur = el.parentId;
    while (cur) {
      if (visited.has(cur)) break;
      visited.add(cur);
      if (requestedSet.has(cur)) return true;
      cur = byId.get(cur)?.parentId;
    }
    return false;
  };

  const rootElements = sourceElements.filter(
    (e) => requestedSet.has(e.id) && !hasRequestedAncestor(e)
  );
  if (rootElements.length === 0) {
    return { clones: [], rootCloneIds: [] };
  }

  const collectedSet = new Set<string>(rootElements.map((e) => e.id));
  let added = true;
  while (added) {
    added = false;
    for (const el of sourceElements) {
      if (!collectedSet.has(el.id) && el.parentId && collectedSet.has(el.parentId)) {
        collectedSet.add(el.id);
        added = true;
      }
    }
  }

  const collected = sourceElements.filter((e) => collectedSet.has(e.id));
  const nextId = options.generateId ?? defaultIdGenerator('el');
  const idMap = new Map<string, string>();
  for (const el of collected) {
    idMap.set(el.id, nextId());
  }

  const dx = options.offsetX ?? 24;
  const dy = options.offsetY ?? 24;
  const maxOrderBase = sourceElements.reduce((m, e) => Math.max(m, e.order), -1) + 1;

  const clones: DesignElement[] = collected.map((el, idx) => {
    const newId = idMap.get(el.id)!;
    const isDescendant = Boolean(el.parentId && idMap.has(el.parentId));
    const cloned = cloneElementFields(el);
    cloned.id = newId;
    cloned.order = maxOrderBase + idx;

    if (isDescendant) {
      cloned.parentId = idMap.get(el.parentId!)!;
      return cloned;
    }

    const maxX = Math.max(0, options.canvasWidth - el.width);
    const maxY = Math.max(0, options.canvasHeight - el.height);
    cloned.x = Math.max(0, Math.min(maxX, Math.round(el.x + dx)));
    cloned.y = Math.max(0, Math.min(maxY, Math.round(el.y + dy)));
    if (cloned.parentId && cloned.childOffsetX !== undefined && cloned.childOffsetY !== undefined) {
      cloned.childOffsetX = Math.max(0, Math.round(cloned.childOffsetX + dx));
      cloned.childOffsetY = Math.max(0, Math.round(cloned.childOffsetY + dy));
    }
    if (options.labelSuffix) {
      cloned.label = `${el.label}${options.labelSuffix}`;
    }
    return cloned;
  });

  const rootCloneIds = rootElements.map((r) => idMap.get(r.id)!);
  return { clones, rootCloneIds };
}
