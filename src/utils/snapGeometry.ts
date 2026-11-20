import { CanvasGuide, DesignElement, SnapDistanceBadge, SnapGuideLine } from '../types/schema';
import { getRotatedBoundingBox } from './canvasGeometry';

export interface SnapRect {
  id: string;
  x: number;
  y: number;
  width: number;
  height: number;
}

const SNAP_GRID = 4;
const EDGE_SNAP_TOLERANCE = 7;
const CENTER_SNAP_TOLERANCE = 9;

export interface AxisTarget {
  pos: number;
  kind: 'center' | 'edge' | 'guide';
  tolerance: number;
}

export interface SnapTargetCache {
  xTargets: AxisTarget[];
  yTargets: AxisTarget[];
  others: SnapRect[];
}

export function buildSnapTargetCache(params: {
  others: SnapRect[];
  guides: CanvasGuide[];
  canvasWidth: number;
  canvasHeight: number;
  zoom?: number;
}): SnapTargetCache {
  const { others, guides, canvasWidth, canvasHeight, zoom = 1 } = params;
  return {
    xTargets: collectAxisTargets('x', canvasWidth, others, guides, zoom),
    yTargets: collectAxisTargets('y', canvasHeight, others, guides, zoom),
    others,
  };
}

function clampSnapZoom(zoom?: number): number {
  if (typeof zoom !== 'number' || !Number.isFinite(zoom) || zoom <= 0) return 1;
  return Math.max(0.25, Math.min(4, zoom));
}

function collectAxisTargets(
  axis: 'x' | 'y',
  canvasExtent: number,
  others: SnapRect[],
  guides: CanvasGuide[],
  zoom = 1
): AxisTarget[] {
  const tolScale = 1 / clampSnapZoom(zoom);
  const edgeTol = EDGE_SNAP_TOLERANCE * tolScale;
  const centerTol = CENTER_SNAP_TOLERANCE * tolScale;
  const targets: AxisTarget[] = [
    { pos: Math.round(canvasExtent / 2), kind: 'center', tolerance: centerTol },
    { pos: 0, kind: 'edge', tolerance: edgeTol },
    { pos: canvasExtent, kind: 'edge', tolerance: edgeTol },
  ];

  guides.forEach((g) => {
    if (g.axis === axis) {
      targets.push({ pos: g.pos, kind: 'guide', tolerance: centerTol });
    }
  });

  others.forEach((o) => {
    const start = axis === 'x' ? o.x : o.y;
    const size = axis === 'x' ? o.width : o.height;
    targets.push(
      { pos: start, kind: 'edge', tolerance: edgeTol },
      { pos: start + size, kind: 'edge', tolerance: edgeTol },
      { pos: Math.round(start + size / 2), kind: 'center', tolerance: edgeTol }
    );
  });

  return targets;
}

function snapBoxAxis(
  rawStart: number,
  size: number,
  targets: AxisTarget[]
): { pos: number; matchedLine: SnapGuideLine | null; axisOffset: number } {
  const anchors = [0, Math.round(size / 2), size];
  let bestDelta = Infinity;
  let bestTarget: AxisTarget | null = null;
  let bestOrigin = rawStart;

  for (const target of targets) {
    for (const anchorOffset of anchors) {
      const candidatePos = rawStart + anchorOffset;
      const dist = Math.abs(candidatePos - target.pos);
      if (dist <= target.tolerance && dist < Math.abs(bestDelta)) {
        bestDelta = target.pos - candidatePos;
        bestTarget = target;
        bestOrigin = target.pos - anchorOffset;
      }
    }
  }

  if (bestTarget) {
    return {
      pos: Math.round(bestOrigin),
      matchedLine: { axis: 'x', pos: bestTarget.pos, kind: bestTarget.kind },
      axisOffset: bestDelta,
    };
  }
  return {
    pos: Math.round(rawStart / SNAP_GRID) * SNAP_GRID,
    matchedLine: null,
    axisOffset: 0,
  };
}

function computeNeighborSpacing(
  box: { x: number; y: number; width: number; height: number },
  others: SnapRect[]
): SnapDistanceBadge[] {
  const badges: SnapDistanceBadge[] = [];
  let closestLeft: { rect: SnapRect; gap: number } | null = null;
  let closestRight: { rect: SnapRect; gap: number } | null = null;
  let closestTop: { rect: SnapRect; gap: number } | null = null;
  let closestBottom: { rect: SnapRect; gap: number } | null = null;

  for (const o of others) {
    const yOverlap = o.y < box.y + box.height && o.y + o.height > box.y;
    if (yOverlap) {
      const leftGap = box.x - (o.x + o.width);
      if (leftGap > 0 && (!closestLeft || leftGap < closestLeft.gap)) {
        closestLeft = { rect: o, gap: leftGap };
      }
      const rightGap = o.x - (box.x + box.width);
      if (rightGap > 0 && (!closestRight || rightGap < closestRight.gap)) {
        closestRight = { rect: o, gap: rightGap };
      }
    }

    const xOverlap = o.x < box.x + box.width && o.x + o.width > box.x;
    if (xOverlap) {
      const topGap = box.y - (o.y + o.height);
      if (topGap > 0 && (!closestTop || topGap < closestTop.gap)) {
        closestTop = { rect: o, gap: topGap };
      }
      const bottomGap = o.y - (box.y + box.height);
      if (bottomGap > 0 && (!closestBottom || bottomGap < closestBottom.gap)) {
        closestBottom = { rect: o, gap: bottomGap };
      }
    }
  }

  if (closestLeft && closestLeft.gap <= 320) {
    badges.push({
      axis: 'h',
      x: Math.round(closestLeft.rect.x + closestLeft.rect.width + closestLeft.gap / 2),
      y: Math.round(box.y + box.height / 2),
      gap: Math.round(closestLeft.gap),
    });
  }
  if (closestRight && closestRight.gap <= 320) {
    badges.push({
      axis: 'h',
      x: Math.round(box.x + box.width + closestRight.gap / 2),
      y: Math.round(box.y + box.height / 2),
      gap: Math.round(closestRight.gap),
    });
  }
  if (closestTop && closestTop.gap <= 320) {
    badges.push({
      axis: 'v',
      x: Math.round(box.x + box.width / 2),
      y: Math.round(closestTop.rect.y + closestTop.rect.height + closestTop.gap / 2),
      gap: Math.round(closestTop.gap),
    });
  }
  if (closestBottom && closestBottom.gap <= 320) {
    badges.push({
      axis: 'v',
      x: Math.round(box.x + box.width / 2),
      y: Math.round(box.y + box.height + closestBottom.gap / 2),
      gap: Math.round(closestBottom.gap),
    });
  }

  return badges;
}

/** Computes snapped delta for a multi-element selection union bounding box. */
export function computeMultiSelectMoveDelta(params: {
  movingRects: ReadonlyArray<SnapRect>;
  dx: number;
  dy: number;
  canvasWidth: number;
  canvasHeight: number;
  others: SnapRect[];
  guides: CanvasGuide[];
  magneticSnap: boolean;
  zoom?: number;
  cachedTargets?: SnapTargetCache;
}): { dx: number; dy: number; lines: SnapGuideLine[]; spacing: SnapDistanceBadge[] } {
  const { movingRects, dx, dy, canvasWidth, canvasHeight, others, guides, magneticSnap, zoom, cachedTargets } = params;
  if (movingRects.length === 0) {
    return { dx: Math.round(dx), dy: Math.round(dy), lines: [], spacing: [] };
  }
  const minX = Math.min(...movingRects.map((r) => r.x));
  const minY = Math.min(...movingRects.map((r) => r.y));
  const maxX = Math.max(...movingRects.map((r) => r.x + r.width));
  const maxY = Math.max(...movingRects.map((r) => r.y + r.height));
  const unionW = Math.max(1, maxX - minX);
  const unionH = Math.max(1, maxY - minY);

  const snap = computeSmartMoveSnap({
    rawX: minX + dx,
    rawY: minY + dy,
    width: unionW,
    height: unionH,
    canvasWidth,
    canvasHeight,
    others,
    guides,
    magneticSnap,
    clampToCanvas: true,
    zoom,
    cachedTargets,
  });

  return {
    dx: snap.x - minX,
    dy: snap.y - minY,
    lines: snap.lines,
    spacing: snap.spacing,
  };
}

export function computeSmartMoveSnap(params: {
  rawX: number;
  rawY: number;
  width: number;
  height: number;
  canvasWidth: number;
  canvasHeight: number;
  others: SnapRect[];
  guides: CanvasGuide[];
  magneticSnap: boolean;
  clampToCanvas?: boolean;
  zoom?: number;
  cachedTargets?: SnapTargetCache;
}): {
  x: number;
  y: number;
  lines: SnapGuideLine[];
  spacing: SnapDistanceBadge[];
} {
  const {
    rawX,
    rawY,
    width,
    height,
    canvasWidth,
    canvasHeight,
    others,
    guides,
    magneticSnap,
    clampToCanvas = true,
    zoom = 1,
    cachedTargets,
  } = params;

  const boundedX = clampToCanvas
    ? Math.max(0, Math.min(Math.max(0, canvasWidth - width), rawX))
    : rawX;
  const boundedY = clampToCanvas
    ? Math.max(0, Math.min(Math.max(0, canvasHeight - height), rawY))
    : rawY;

  if (!magneticSnap) {
    return {
      x: Math.round(boundedX / SNAP_GRID) * SNAP_GRID,
      y: Math.round(boundedY / SNAP_GRID) * SNAP_GRID,
      lines: [],
      spacing: [],
    };
  }

  const xTargets = cachedTargets ? cachedTargets.xTargets : collectAxisTargets('x', canvasWidth, others, guides, zoom);
  const yTargets = cachedTargets ? cachedTargets.yTargets : collectAxisTargets('y', canvasHeight, others, guides, zoom);
  const spacingOthers = cachedTargets ? cachedTargets.others : others;

  const snappedX = snapBoxAxis(boundedX, width, xTargets);
  const snappedY = snapBoxAxis(boundedY, height, yTargets);

  const finalX = clampToCanvas
    ? Math.max(0, Math.min(Math.max(0, canvasWidth - width), snappedX.pos))
    : snappedX.pos;
  const finalY = clampToCanvas
    ? Math.max(0, Math.min(Math.max(0, canvasHeight - height), snappedY.pos))
    : snappedY.pos;

  const lines: SnapGuideLine[] = [];
  if (snappedX.matchedLine) {
    lines.push({ ...snappedX.matchedLine, axis: 'x' });
  }
  if (snappedY.matchedLine) {
    lines.push({ ...snappedY.matchedLine, axis: 'y' });
  }

  const spacing = computeNeighborSpacing({ x: finalX, y: finalY, width, height }, spacingOthers);

  return { x: finalX, y: finalY, lines, spacing };
}

export function computeSmartResizeSnap(params: {
  dir: string;
  origX: number;
  origY: number;
  origW: number;
  origH: number;
  dx: number;
  dy: number;
  minW: number;
  minH: number;
  canvasWidth: number;
  canvasHeight: number;
  others: SnapRect[];
  guides: CanvasGuide[];
  magneticSnap: boolean;
  zoom?: number;
  cachedTargets?: SnapTargetCache;
}): {
  x: number;
  y: number;
  width: number;
  height: number;
  lines: SnapGuideLine[];
} {
  const {
    dir,
    origX,
    origY,
    origW,
    origH,
    dx,
    dy,
    minW,
    minH,
    canvasWidth,
    canvasHeight,
    others,
    guides,
    magneticSnap,
    zoom = 1,
    cachedTargets,
  } = params;

  const anchorRight = origX + origW;
  const anchorBottom = origY + origH;

  const snapExtent = (raw: number, minVal: number, maxVal: number): number => {
    const safeMax = Math.max(minVal, maxVal);
    if (raw <= minVal) return minVal;
    const capped = Math.min(safeMax, raw);
    if (capped >= safeMax) return safeMax;
    const gridded = Math.round(capped / SNAP_GRID) * SNAP_GRID;
    return Math.max(minVal, Math.min(safeMax, gridded));
  };

  let finalX = origX;
  let finalY = origY;
  let finalW = origW;
  let finalH = origH;

  if (dir.includes('e')) {
    const rawW = origW + dx;
    finalW = snapExtent(rawW, minW, Math.max(minW, canvasWidth - origX));
  } else if (dir.includes('w')) {
    const rawW = origW - dx;
    finalW = snapExtent(rawW, minW, Math.max(minW, anchorRight));
    finalX = Math.max(0, anchorRight - finalW);
  }

  if (dir.includes('s')) {
    const rawH = origH + dy;
    finalH = snapExtent(rawH, minH, Math.max(minH, canvasHeight - origY));
  } else if (dir.includes('n')) {
    const rawH = origH - dy;
    finalH = snapExtent(rawH, minH, Math.max(minH, anchorBottom));
    finalY = Math.max(0, anchorBottom - finalH);
  }

  const lines: SnapGuideLine[] = [];

  if (!magneticSnap) {
    return { x: finalX, y: finalY, width: finalW, height: finalH, lines };
  }

  const xTargets = cachedTargets ? cachedTargets.xTargets : collectAxisTargets('x', canvasWidth, others, guides, zoom);
  const yTargets = cachedTargets ? cachedTargets.yTargets : collectAxisTargets('y', canvasHeight, others, guides, zoom);

  const findEdgeMatch = (val: number, targets: AxisTarget[]): AxisTarget | null => {
    let best: AxisTarget | null = null;
    let bestDist = Infinity;
    for (const t of targets) {
      const dist = Math.abs(val - t.pos);
      if (dist <= t.tolerance && dist < bestDist) {
        best = t;
        bestDist = dist;
      }
    }
    return best;
  };

  if (dir.includes('e')) {
    const m = findEdgeMatch(finalX + finalW, xTargets);
    if (m && m.pos <= canvasWidth && m.pos - finalX >= minW) {
      finalW = Math.round(m.pos - finalX);
      lines.push({ axis: 'x', pos: m.pos, kind: m.kind });
    }
  } else if (dir.includes('w')) {
    const m = findEdgeMatch(finalX, xTargets);
    if (m && m.pos >= 0 && anchorRight - m.pos >= minW) {
      finalX = Math.round(m.pos);
      finalW = Math.round(anchorRight - m.pos);
      lines.push({ axis: 'x', pos: m.pos, kind: m.kind });
    }
  }

  if (dir.includes('s')) {
    const m = findEdgeMatch(finalY + finalH, yTargets);
    if (m && m.pos <= canvasHeight && m.pos - finalY >= minH) {
      finalH = Math.round(m.pos - finalY);
      lines.push({ axis: 'y', pos: m.pos, kind: m.kind });
    }
  } else if (dir.includes('n')) {
    const m = findEdgeMatch(finalY, yTargets);
    if (m && m.pos >= 0 && anchorBottom - m.pos >= minH) {
      finalY = Math.round(m.pos);
      finalH = Math.round(anchorBottom - m.pos);
      lines.push({ axis: 'y', pos: m.pos, kind: m.kind });
    }
  }

  return { x: finalX, y: finalY, width: finalW, height: finalH, lines };
}

export function extractOtherSnapRects(
  elements: DesignElement[],
  excludeIds: Set<string>,
  parentId?: string,
  paneIndex?: number
): SnapRect[] {
  return elements
    .filter((el) => {
      if (excludeIds.has(el.id) || el.hidden) return false;
      if (parentId) {
        return el.parentId === parentId && (el.parentPaneIndex ?? 0) === (paneIndex ?? 0);
      }
      return !el.parentId;
    })
    .map((el) => {
      const rawX = parentId ? (el.childOffsetX ?? 12) : el.x;
      const rawY = parentId ? (el.childOffsetY ?? 12) : el.y;
      const rawW = parentId ? (el.childCustomWidth || el.width) : el.width;
      const rawH = parentId ? (el.childCustomHeight || el.height) : el.height;
      const aabb = getRotatedBoundingBox({
        x: rawX,
        y: rawY,
        width: rawW,
        height: rawH,
        rotation: el.rotation,
      });
      return {
        id: el.id,
        x: aabb.x,
        y: aabb.y,
        width: aabb.width,
        height: aabb.height,
      };
    });
}

