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

