import { DesignElement, SplitModifier } from '../types/schema';

export interface InnerBoxGeometry {
  bL: number;
  bT: number;
  bR: number;
  bB: number;
  innerW: number;
  innerH: number;
}

export interface SplitPaneGeometry {
  paneX: number;
  paneY: number;
  paneW: number;
  paneH: number;
  split: SplitModifier | null;
}

export function getInnerBoxGeometry(parent: DesignElement): InnerBoxGeometry {
  const bL = parent.bordersLinked === false ? (parent.borderLeftWidth ?? 0) : (parent.borderWidth ?? 0);
  const bT = parent.bordersLinked === false ? (parent.borderTopWidth ?? 0) : (parent.borderWidth ?? 0);
  const bR = parent.bordersLinked === false ? (parent.borderRightWidth ?? 0) : (parent.borderWidth ?? 0);
  const bB = parent.bordersLinked === false ? (parent.borderBottomWidth ?? 0) : (parent.borderWidth ?? 0);
  return {
    bL,
    bT,
    bR,
    bB,
    innerW: Math.max(20, parent.width - bL - bR),
    innerH: Math.max(20, parent.height - bT - bB),
  };
}

export function getSplitPaneGeometry(parent: DesignElement, paneIdx: number): SplitPaneGeometry {
  const { innerW, innerH } = getInnerBoxGeometry(parent);
  const activeSplit = (parent.modifiers || []).find(
    (m): m is SplitModifier => m.kind === 'split' && m.enabled
  );
  if (!activeSplit) {
    return { paneX: 0, paneY: 0, paneW: innerW, paneH: innerH, split: null };
  }
  const r1 = activeSplit.ratio;
  const r2 = activeSplit.panes === 3 ? (activeSplit.ratio2 ?? 33) : 100 - r1;
  if (activeSplit.axis === 'vertical') {
    const w0 = Math.round((innerW * r1) / 100);
    const w1 = activeSplit.panes === 3 ? Math.round((innerW * r2) / 100) : Math.max(20, innerW - w0);
    const w2 = Math.max(20, innerW - w0 - w1);
    if (paneIdx === 1) return { paneX: w0, paneY: 0, paneW: w1, paneH: innerH, split: activeSplit };
    if (paneIdx === 2 && activeSplit.panes === 3) {
      return { paneX: w0 + w1, paneY: 0, paneW: w2, paneH: innerH, split: activeSplit };
    }
    return { paneX: 0, paneY: 0, paneW: w0, paneH: innerH, split: activeSplit };
  }
  const h0 = Math.round((innerH * r1) / 100);
  const h1 = activeSplit.panes === 3 ? Math.round((innerH * r2) / 100) : Math.max(20, innerH - h0);
  const h2 = Math.max(20, innerH - h0 - h1);
  if (paneIdx === 1) return { paneX: 0, paneY: h0, paneW: innerW, paneH: h1, split: activeSplit };
  if (paneIdx === 2 && activeSplit.panes === 3) {
    return { paneX: 0, paneY: h0 + h1, paneW: innerW, paneH: h2, split: activeSplit };
  }
  return { paneX: 0, paneY: 0, paneW: innerW, paneH: h0, split: activeSplit };
}

export function getRotatedBoundingBox(rect: {
  x: number;
  y: number;
  width: number;
  height: number;
  rotation?: number;
}): { x: number; y: number; width: number; height: number } {
  const rot = rect.rotation || 0;
  if (!rot || Math.abs(rot % 360) < 0.001) {
    return { x: rect.x, y: rect.y, width: rect.width, height: rect.height };
  }
  const rad = (rot * Math.PI) / 180;
  const rawCos = Math.cos(rad);
  const rawSin = Math.sin(rad);
  const cos = Math.abs(rawCos) < 1e-9 ? 0 : rawCos;
  const sin = Math.abs(rawSin) < 1e-9 ? 0 : rawSin;
  const cx = rect.x + rect.width / 2;
  const cy = rect.y + rect.height / 2;
  const aabbW = Math.abs(rect.width * cos) + Math.abs(rect.height * sin);
  const aabbH = Math.abs(rect.width * sin) + Math.abs(rect.height * cos);
  return {
    x: cx - aabbW / 2,
    y: cy - aabbH / 2,
    width: aabbW,
    height: aabbH,
  };
}

export function computeRotatedResizeRect(params: {
  dir: string;
  origX: number;
  origY: number;
  origW: number;
  origH: number;
  rotationDeg: number;
  dx: number;
  dy: number;
  minW: number;
  minH: number;
  canvasWidth: number;
  canvasHeight: number;
}): { x: number; y: number; width: number; height: number } {
  const {
    dir,
    origX,
    origY,
    origW,
    origH,
    rotationDeg,
    dx,
    dy,
    minW,
    minH,
    canvasWidth,
    canvasHeight,
  } = params;
  const theta = (rotationDeg * Math.PI) / 180;
  const rawCos = Math.cos(theta);
  const rawSin = Math.sin(theta);
  const cos = Math.abs(rawCos) < 1e-9 ? 0 : rawCos;
  const sin = Math.abs(rawSin) < 1e-9 ? 0 : rawSin;
  const localDx = dx * cos + dy * sin;
  const localDy = -dx * sin + dy * cos;

  const maxW = Math.max(minW, canvasWidth);
  const maxH = Math.max(minH, canvasHeight);
  let nextW = origW;
  if (dir.includes('e')) nextW = origW + localDx;
  else if (dir.includes('w')) nextW = origW - localDx;
  nextW = Math.max(minW, Math.min(maxW, Math.round(nextW)));

  let nextH = origH;
  if (dir.includes('s')) nextH = origH + localDy;
  else if (dir.includes('n')) nextH = origH - localDy;
  nextH = Math.max(minH, Math.min(maxH, Math.round(nextH)));

  const anchorLocalX = dir.includes('e') ? -origW / 2 : dir.includes('w') ? origW / 2 : 0;
  const anchorLocalY = dir.includes('s') ? -origH / 2 : dir.includes('n') ? origH / 2 : 0;
  const newAnchorLocalX = dir.includes('e') ? -nextW / 2 : dir.includes('w') ? nextW / 2 : 0;
  const newAnchorLocalY = dir.includes('s') ? -nextH / 2 : dir.includes('n') ? nextH / 2 : 0;

  const dlx = anchorLocalX - newAnchorLocalX;
  const dly = anchorLocalY - newAnchorLocalY;
  const newCx = origX + origW / 2 + (dlx * cos - dly * sin);
  const newCy = origY + origH / 2 + (dlx * sin + dly * cos);

  return {
    x: Math.round(newCx - nextW / 2),
    y: Math.round(newCy - nextH / 2),
    width: nextW,
    height: nextH,
  };
}

export function getElementCanvasOrigin(
  el: DesignElement,
  elements: ReadonlyArray<DesignElement>
): { x: number; y: number; width: number; height: number } {
  const ownW = el.parentId ? el.childCustomWidth || el.width : el.width;
  const ownH = el.parentId ? el.childCustomHeight || el.height : el.height;
  if (!el.parentId) {
    return { x: el.x, y: el.y, width: ownW, height: ownH };
  }
  const byId = new Map<string, DesignElement>();
  for (const item of elements) {
    byId.set(item.id, item);
  }
  let accX = el.childOffsetX ?? 12;
  let accY = el.childOffsetY ?? 12;
  const visited = new Set<string>([el.id]);
  let cur: DesignElement = el;
  while (cur.parentId) {
    if (visited.has(cur.parentId)) break;
    const parent = byId.get(cur.parentId);
    if (!parent) break;
    visited.add(parent.id);
    const { bL, bT } = getInnerBoxGeometry(parent);
    const pRect = getSplitPaneGeometry(parent, cur.parentPaneIndex ?? 0);
    accX += bL + pRect.paneX;
    accY += bT + pRect.paneY;
    if (!parent.parentId) {
      accX += parent.x;
      accY += parent.y;
      break;
    }
    accX += parent.childOffsetX ?? 12;
    accY += parent.childOffsetY ?? 12;
    cur = parent;
  }
  return { x: accX, y: accY, width: ownW, height: ownH };
}

export function resolvePointInContainer(
  parent: DesignElement,
  canvasX: number,
  canvasY: number,
  childW: number,
  childH: number,
  parentCanvasX = parent.x,
  parentCanvasY = parent.y
): { paneIdx: number; offsetX: number; offsetY: number } {
  const { bL, bT, innerW, innerH } = getInnerBoxGeometry(parent);
  const rawRelX = Math.round(canvasX - parentCanvasX - bL);
  const rawRelY = Math.round(canvasY - parentCanvasY - bT);
  let paneIdx = 0;
  const activeSplit = (parent.modifiers || []).find(
    (m): m is SplitModifier => m.kind === 'split' && m.enabled
  );
  if (activeSplit) {
    const midPct =
      activeSplit.axis === 'vertical'
        ? ((rawRelX + childW / 2) / Math.max(1, innerW)) * 100
        : ((rawRelY + childH / 2) / Math.max(1, innerH)) * 100;
    const r1 = activeSplit.ratio;
    const r2 = activeSplit.panes === 3 ? (activeSplit.ratio2 ?? 33) : 100 - r1;
    if (midPct > r1 + r2 && activeSplit.panes === 3) paneIdx = 2;
    else if (midPct > r1) paneIdx = 1;
  }
  const pRect = getSplitPaneGeometry(parent, paneIdx);
  return {
    paneIdx,
    offsetX: Math.max(0, Math.min(Math.max(0, pRect.paneW - childW), rawRelX - pRect.paneX)),
    offsetY: Math.max(0, Math.min(Math.max(0, pRect.paneH - childH), rawRelY - pRect.paneY)),
  };
}

