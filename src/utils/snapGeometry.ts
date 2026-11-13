import { CanvasGuide, DesignElement, SnapDistanceBadge, SnapGuideLine } from '../types/schema';

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

interface AxisTarget {
  pos: number;
  kind: 'center' | 'edge' | 'guide';
  tolerance: number;
}

function collectAxisTargets(
  axis: 'x' | 'y',
  canvasExtent: number,
  others: SnapRect[],
  guides: CanvasGuide[]
): AxisTarget[] {
  const targets: AxisTarget[] = [
    { pos: Math.round(canvasExtent / 2), kind: 'center', tolerance: CENTER_SNAP_TOLERANCE },
    { pos: 0, kind: 'edge', tolerance: EDGE_SNAP_TOLERANCE },
    { pos: canvasExtent, kind: 'edge', tolerance: EDGE_SNAP_TOLERANCE },
  ];

  guides.forEach((g) => {
    if (g.axis === axis) {
      targets.push({ pos: g.pos, kind: 'guide', tolerance: CENTER_SNAP_TOLERANCE });
    }
  });

  others.forEach((o) => {
    const start = axis === 'x' ? o.x : o.y;
    const size = axis === 'x' ? o.width : o.height;
    targets.push(
      { pos: Math.round(start + size / 2), kind: 'center', tolerance: EDGE_SNAP_TOLERANCE },
      { pos: start, kind: 'edge', tolerance: EDGE_SNAP_TOLERANCE },
      { pos: start + size, kind: 'edge', tolerance: EDGE_SNAP_TOLERANCE }
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

  const xTargets = collectAxisTargets('x', canvasWidth, others, guides);
  const yTargets = collectAxisTargets('y', canvasHeight, others, guides);

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

  const spacing = computeNeighborSpacing({ x: finalX, y: finalY, width, height }, others);

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
  } = params;

  let newX = origX;
  let newY = origY;
  let newW = origW;
  let newH = origH;

  if (dir.includes('e')) newW = Math.max(minW, origW + dx);
  if (dir.includes('s')) newH = Math.max(minH, origH + dy);
  if (dir.includes('w')) {
    const possibleW = origW - dx;
    if (possibleW >= minW) {
      newW = possibleW;
      newX = origX + dx;
    }
  }
  if (dir.includes('n')) {
    const possibleH = origH - dy;
    if (possibleH >= minH) {
      newH = possibleH;
      newY = origY + dy;
    }
  }

  let finalX = Math.round(newX / SNAP_GRID) * SNAP_GRID;
  let finalY = Math.round(newY / SNAP_GRID) * SNAP_GRID;
  let finalW = Math.round(newW / SNAP_GRID) * SNAP_GRID;
  let finalH = Math.round(newH / SNAP_GRID) * SNAP_GRID;
  const lines: SnapGuideLine[] = [];

  if (!magneticSnap) {
    return { x: finalX, y: finalY, width: finalW, height: finalH, lines };
  }

  const xTargets = collectAxisTargets('x', canvasWidth, others, guides);
  const yTargets = collectAxisTargets('y', canvasHeight, others, guides);

  const findEdgeMatch = (val: number, targets: AxisTarget[]): AxisTarget | null => {
    let best: AxisTarget | null = null;
    let bestDist = Infinity;
    for (const t of targets) {
      const dist = Math.abs(val - t.pos);
      if (dist <= EDGE_SNAP_TOLERANCE && dist < bestDist) {
        best = t;
        bestDist = dist;
      }
    }
    return best;
  };

  if (dir.includes('e')) {
    const m = findEdgeMatch(finalX + finalW, xTargets);
    if (m && m.pos - finalX >= minW) {
      finalW = Math.round(m.pos - finalX);
      lines.push({ axis: 'x', pos: m.pos, kind: m.kind });
    }
  } else if (dir.includes('w')) {
    const rightEdge = origX + origW;
    const m = findEdgeMatch(finalX, xTargets);
    if (m && rightEdge - m.pos >= minW) {
      finalX = Math.round(m.pos);
      finalW = Math.round(rightEdge - m.pos);
      lines.push({ axis: 'x', pos: m.pos, kind: m.kind });
    }
  }

  if (dir.includes('s')) {
    const m = findEdgeMatch(finalY + finalH, yTargets);
    if (m && m.pos - finalY >= minH) {
      finalH = Math.round(m.pos - finalY);
      lines.push({ axis: 'y', pos: m.pos, kind: m.kind });
    }
  } else if (dir.includes('n')) {
    const bottomEdge = origY + origH;
    const m = findEdgeMatch(finalY, yTargets);
    if (m && bottomEdge - m.pos >= minH) {
      finalY = Math.round(m.pos);
      finalH = Math.round(bottomEdge - m.pos);
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
    .map((el) => ({
      id: el.id,
      x: parentId ? (el.childOffsetX ?? 12) : el.x,
      y: parentId ? (el.childOffsetY ?? 12) : el.y,
      width: parentId ? (el.childCustomWidth || el.width) : el.width,
      height: parentId ? (el.childCustomHeight || el.height) : el.height,
    }));
}

