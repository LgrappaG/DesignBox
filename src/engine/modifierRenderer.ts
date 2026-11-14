import {
  BooleanMaskModifier,
  CutoutHoleModifier,
  DesignElement,
  DividerLineModifier,
  ElementModifier,
  InnerFrameModifier,
  SplitModifier,
} from '../types/schema';

export function isModifierProOnly(
  mod: ElementModifier,
  el?: DesignElement
): boolean {
  if (!mod.enabled) return false;
  if (mod.kind === 'boolean_mask') return true;
  if (
    mod.kind === 'divider_line' &&
    (mod.orientation === 'diag_fwd' || mod.orientation === 'diag_back')
  ) {
    return true;
  }
  if (mod.kind === 'cutout_hole' && mod.mode === 'transparent_hole') {
    if (
      mod.shape === 'ticket_corners' ||
      mod.shape === 'diamond' ||
      mod.shape === 'star'
    ) {
      return true;
    }
    if (el) {
      return !canUseF2UBackgroundPunch(el);
    }
  }
  return false;
}

export function elementHasProModifiers(el: DesignElement): boolean {
  if (!el.modifiers || el.modifiers.length === 0) return false;
  return el.modifiers.some((m) => isModifierProOnly(m, el));
}

export function canUseF2UBackgroundPunch(el: DesignElement): boolean {
  const mods = (el.modifiers || []).filter((m) => m.enabled);
  const holes = mods.filter(
    (m): m is CutoutHoleModifier =>
      m.kind === 'cutout_hole' && m.mode === 'transparent_hole'
  );
  const masks = mods.filter((m) => m.kind === 'boolean_mask');
  if (holes.length !== 1 || masks.length > 0) return false;

  const hole = holes[0];
  if (hole.shape === 'ticket_corners' || hole.shape === 'diamond' || hole.shape === 'star') {
    return false;
  }
  if (!el.bgColor || el.bgColor === 'transparent') return false;
  if (el.bgGradientTo || el.bgImageUrl || (el.bgPattern && el.bgPattern !== 'none')) {
    return false;
  }

  const activeSplit = mods.find(
    (m): m is SplitModifier => m.kind === 'split'
  );
  if (
    activeSplit &&
    ((activeSplit.pane1Bg && activeSplit.pane1Bg !== 'inherit' && activeSplit.pane1Bg !== el.bgColor) ||
      (activeSplit.pane2Bg && activeSplit.pane2Bg !== 'inherit' && activeSplit.pane2Bg !== el.bgColor) ||
      (activeSplit.panes === 3 && activeSplit.pane3Bg && activeSplit.pane3Bg !== 'inherit' && activeSplit.pane3Bg !== el.bgColor))
  ) {
    return false;
  }
  return true;
}

function getStarPolygonPoints(cx: number, cy: number, rx: number, ry: number): string {
  const pts: string[] = [];
  for (let i = 0; i < 10; i++) {
    const angle = -Math.PI / 2 + (i * Math.PI) / 5;
    const scale = i % 2 === 0 ? 1 : 0.42;
    const x = cx + Math.cos(angle) * rx * scale;
    const y = cy + Math.sin(angle) * ry * scale;
    pts.push(`${x.toFixed(1)},${y.toFixed(1)}`);
  }
  return pts.join(' ');
}

function getHeartPath(cx: number, cy: number, w: number, h: number): string {
  const topY = cy - h * 0.16;
  const botY = cy + h * 0.48;
  const leftX = cx - w * 0.5;
  const rightX = cx + w * 0.5;
  return [
    `M ${cx.toFixed(1)} ${botY.toFixed(1)}`,
    `C ${leftX.toFixed(1)} ${(cy + h * 0.1).toFixed(1)}, ${(cx - w * 0.52).toFixed(1)} ${(cy - h * 0.45).toFixed(1)}, ${cx.toFixed(1)} ${topY.toFixed(1)}`,
    `C ${(cx + w * 0.52).toFixed(1)} ${(cy - h * 0.45).toFixed(1)}, ${rightX.toFixed(1)} ${(cy + h * 0.1).toFixed(1)}, ${cx.toFixed(1)} ${botY.toFixed(1)} Z`,
  ].join(' ');
}

type SvgShapeName =
  | 'circle'
  | 'rect'
  | 'pill'
  | 'arch'
  | 'diamond'
  | 'hexagon'
  | 'octagon'
  | 'cross_star'
  | 'scallop'
  | 'shield'
  | 'star'
  | 'heart';

function getRegularPolygonPoints(
  cx: number,
  cy: number,
  rx: number,
  ry: number,
  sides: number,
  startAngleDeg = -90
): string {
  const pts: string[] = [];
  const startRad = (startAngleDeg * Math.PI) / 180;
  for (let i = 0; i < sides; i++) {
    const angle = startRad + (i * Math.PI * 2) / sides;
    const x = cx + Math.cos(angle) * rx;
    const y = cy + Math.sin(angle) * ry;
    pts.push(`${x.toFixed(1)},${y.toFixed(1)}`);
  }
  return pts.join(' ');
}

function getCrossStarPoints(cx: number, cy: number, rx: number, ry: number): string {
  const pts: string[] = [];
  for (let i = 0; i < 8; i++) {
    const angle = -Math.PI / 2 + (i * Math.PI) / 4;
    const scale = i % 2 === 0 ? 1 : 0.28;
    const x = cx + Math.cos(angle) * rx * scale;
    const y = cy + Math.sin(angle) * ry * scale;
    pts.push(`${x.toFixed(1)},${y.toFixed(1)}`);
  }
  return pts.join(' ');
}

function getScallopPath(cx: number, cy: number, rx: number, ry: number): string {
  const petals = 12;
  const pts: string[] = [];
  for (let i = 0; i < petals; i++) {
    const a1 = (i * Math.PI * 2) / petals;
    const aMid = ((i + 0.5) * Math.PI * 2) / petals;
    const a2 = ((i + 1) * Math.PI * 2) / petals;
    const x1 = cx + Math.cos(a1) * rx * 0.84;
    const y1 = cy + Math.sin(a1) * ry * 0.84;
    const cxCtrl = cx + Math.cos(aMid) * rx * 1.1;
    const cyCtrl = cy + Math.sin(aMid) * ry * 1.1;
    const x2 = cx + Math.cos(a2) * rx * 0.84;
    const y2 = cy + Math.sin(a2) * ry * 0.84;
    if (i === 0) pts.push(`M ${x1.toFixed(1)} ${y1.toFixed(1)}`);
    pts.push(`Q ${cxCtrl.toFixed(1)} ${cyCtrl.toFixed(1)} ${x2.toFixed(1)} ${y2.toFixed(1)}`);
  }
  pts.push('Z');
  return pts.join(' ');
}

function renderSvgShape(
  shape: SvgShapeName,
  cx: number,
  cy: number,
  w: number,
  h: number,
  fill: string,
  rotation = 0
): string {
  const rotAttr = rotation ? ` transform="rotate(${rotation} ${cx.toFixed(1)} ${cy.toFixed(1)})"` : '';
  const x = cx - w / 2;
  const y = cy - h / 2;
  if (shape === 'circle') {
    return `<ellipse cx="${cx.toFixed(1)}" cy="${cy.toFixed(1)}" rx="${(w / 2).toFixed(1)}" ry="${(h / 2).toFixed(1)}" fill="${fill}"${rotAttr}/>`;
  }
  if (shape === 'pill') {
    const r = Math.min(w, h) / 2;
    return `<rect x="${x.toFixed(1)}" y="${y.toFixed(1)}" width="${w.toFixed(1)}" height="${h.toFixed(1)}" rx="${r.toFixed(1)}" ry="${r.toFixed(1)}" fill="${fill}"${rotAttr}/>`;
  }
  if (shape === 'arch') {
    const r = Math.min(w / 2, h * 0.52);
    const d = [
      `M ${x.toFixed(1)} ${(y + h).toFixed(1)}`,
      `L ${x.toFixed(1)} ${(y + r).toFixed(1)}`,
      `A ${r.toFixed(1)} ${r.toFixed(1)} 0 0 1 ${(x + w).toFixed(1)} ${(y + r).toFixed(1)}`,
      `L ${(x + w).toFixed(1)} ${(y + h).toFixed(1)} Z`,
    ].join(' ');
    return `<path d="${d}" fill="${fill}"${rotAttr}/>`;
  }
  if (shape === 'rect') {
    return `<rect x="${x.toFixed(1)}" y="${y.toFixed(1)}" width="${w.toFixed(1)}" height="${h.toFixed(1)}" fill="${fill}"${rotAttr}/>`;
  }
  if (shape === 'diamond') {
    const pts = `${cx.toFixed(1)},${y.toFixed(1)} ${(x + w).toFixed(1)},${cy.toFixed(1)} ${cx.toFixed(1)},${(y + h).toFixed(1)} ${x.toFixed(1)},${cy.toFixed(1)}`;
    return `<polygon points="${pts}" fill="${fill}"${rotAttr}/>`;
  }
  if (shape === 'hexagon') {
    return `<polygon points="${getRegularPolygonPoints(cx, cy, w / 2, h / 2, 6, 0)}" fill="${fill}"${rotAttr}/>`;
  }
  if (shape === 'octagon') {
    return `<polygon points="${getRegularPolygonPoints(cx, cy, w / 2, h / 2, 8, 22.5)}" fill="${fill}"${rotAttr}/>`;
  }
  if (shape === 'cross_star') {
    return `<polygon points="${getCrossStarPoints(cx, cy, w / 2, h / 2)}" fill="${fill}"${rotAttr}/>`;
  }
  if (shape === 'scallop') {
    return `<path d="${getScallopPath(cx, cy, w / 2, h / 2)}" fill="${fill}"${rotAttr}/>`;
  }
  if (shape === 'shield') {
    const d = [
      `M ${x.toFixed(1)} ${y.toFixed(1)}`,
      `L ${(x + w).toFixed(1)} ${y.toFixed(1)}`,
      `L ${(x + w).toFixed(1)} ${(y + h * 0.56).toFixed(1)}`,
      `Q ${(x + w * 0.85).toFixed(1)} ${(y + h * 0.82).toFixed(1)} ${cx.toFixed(1)} ${(y + h).toFixed(1)}`,
      `Q ${(x + w * 0.15).toFixed(1)} ${(y + h * 0.82).toFixed(1)} ${x.toFixed(1)} ${(y + h * 0.56).toFixed(1)} Z`,
    ].join(' ');
    return `<path d="${d}" fill="${fill}"${rotAttr}/>`;
  }
  if (shape === 'star') {
    return `<polygon points="${getStarPolygonPoints(cx, cy, w / 2, h / 2)}" fill="${fill}"${rotAttr}/>`;
  }
  return `<path d="${getHeartPath(cx, cy, w, h)}" fill="${fill}"${rotAttr}/>`;
}

function getHoleRadiusCss(shape: CutoutHoleModifier['shape'], hw: number, hh: number): string {
  if (shape === 'rect') return '0px';
  if (shape === 'pill') return '999px';
  if (shape === 'arch') {
    const r = Math.max(8, Math.round(Math.min(hw, hh)));
    return `${r}px ${r}px 0 0`;
  }
  return '50%';
}

export function buildSvgMaskStyle(el: DesignElement): {
  maskCss: string;
  maskRingOverlaysHtml: string;
} {
  const mods = (el.modifiers || []).filter((m) => m.enabled);
  const holes = mods.filter(
    (m): m is CutoutHoleModifier =>
      m.kind === 'cutout_hole' && m.mode === 'transparent_hole'
  );
  const masks = mods.filter((m): m is BooleanMaskModifier => m.kind === 'boolean_mask');

  if (holes.length === 0 && masks.length === 0) {
    return { maskCss: '', maskRingOverlaysHtml: '' };
  }
  if (canUseF2UBackgroundPunch(el)) {
    return { maskCss: '', maskRingOverlaysHtml: '' };
  }

  const w = Math.max(40, el.width || 320);
  const h = Math.max(28, el.height || 160);
  const intersectMasks = masks.filter((m) => m.operation === 'intersect');
  const subtractMasks = masks.filter((m) => m.operation === 'subtract');

  const svgParts: string[] = [];
  if (intersectMasks.length > 0) {
    svgParts.push(`<rect x="0" y="0" width="${w}" height="${h}" fill="black"/>`);
    for (const m of intersectMasks) {
      const cx = (m.xPct / 100) * w;
      const cy = (m.yPct / 100) * h;
      svgParts.push(
        renderSvgShape(m.maskShape, cx, cy, m.widthPx, m.heightPx, 'white', m.rotation || 0)
      );
    }
  } else {
    svgParts.push(`<rect x="0" y="0" width="${w}" height="${h}" fill="white"/>`);
  }

  for (const m of subtractMasks) {
    const cx = (m.xPct / 100) * w;
    const cy = (m.yPct / 100) * h;
    svgParts.push(
      renderSvgShape(m.maskShape, cx, cy, m.widthPx, m.heightPx, 'black', m.rotation || 0)
    );
  }

  const ringOverlays: string[] = [];
  for (const hole of holes) {
    if (hole.shape === 'ticket_corners') {
      const r = Math.max(6, Math.round(hole.widthPx / 2));
      svgParts.push(`<circle cx="0" cy="0" r="${r}" fill="black"/>`);
      svgParts.push(`<circle cx="${w}" cy="0" r="${r}" fill="black"/>`);
      svgParts.push(`<circle cx="${w}" cy="${h}" r="${r}" fill="black"/>`);
      svgParts.push(`<circle cx="0" cy="${h}" r="${r}" fill="black"/>`);
      continue;
    }

    const cx = (hole.xPct / 100) * w;
    const cy = (hole.yPct / 100) * h;
    const hw = Math.max(8, hole.widthPx);
    const hh = hole.shape === 'circle' ? hw : Math.max(8, hole.heightPx);
    svgParts.push(renderSvgShape(hole.shape, cx, cy, hw, hh, 'black'));

    if (hole.ringWidth > 0) {
      const radiusCss = getHoleRadiusCss(hole.shape, hw, hh);
      ringOverlays.push(
        `<div style="position: absolute; left: ${hole.xPct}%; top: ${hole.yPct}%; margin-left: -${Math.round(hw / 2)}px; margin-top: -${Math.round(hh / 2)}px; width: ${hw}px; height: ${hh}px; border-radius: ${radiusCss}; border: ${hole.ringWidth}px ${hole.ringStyle || 'solid'} ${hole.ringColor || '#18181B'}; background: transparent; pointer-events: none; z-index: 9; box-sizing: border-box;"></div>`
      );
    }
  }

  const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${w} ${h}" preserveAspectRatio="none">${svgParts.join('')}</svg>`;
  const encoded = encodeURIComponent(svg);
  const maskCss = `-webkit-mask-image: url("data:image/svg+xml,${encoded}"); mask-image: url("data:image/svg+xml,${encoded}"); -webkit-mask-size: 100% 100%; mask-size: 100% 100%; -webkit-mask-repeat: no-repeat; mask-repeat: no-repeat;`;

  return {
    maskCss,
    maskRingOverlaysHtml: ringOverlays.join('\n'),
  };
}

export function renderOverlayModifiersHTML(el: DesignElement): {
  f2uPunchHtml: string;
  overlaysHtml: string;
} {
  const mods = (el.modifiers || []).filter((m) => m.enabled);
  if (mods.length === 0) {
    return { f2uPunchHtml: '', overlaysHtml: '' };
  }

  let f2uPunchHtml = '';
  if (canUseF2UBackgroundPunch(el)) {
    const hole = mods.find(
      (m): m is CutoutHoleModifier =>
        m.kind === 'cutout_hole' && m.mode === 'transparent_hole'
    );
    if (hole) {
      const hw = Math.max(8, hole.widthPx);
      const hh = hole.shape === 'circle' ? hw : Math.max(8, hole.heightPx);
      const radiusCss = getHoleRadiusCss(hole.shape, hw, hh);
      const ringCss =
        hole.ringWidth > 0
          ? `border: ${hole.ringWidth}px ${hole.ringStyle || 'solid'} ${hole.ringColor || '#18181B'}; `
          : '';
      f2uPunchHtml = `<div style="position: absolute; left: ${hole.xPct}%; top: ${hole.yPct}%; margin-left: -${Math.round(hw / 2)}px; margin-top: -${Math.round(hh / 2)}px; width: ${hw}px; height: ${hh}px; border-radius: ${radiusCss}; background: transparent; box-shadow: 0 0 0 9999px ${el.bgColor}; ${ringCss}pointer-events: none; z-index: 1; box-sizing: border-box;"></div>`;
    }
  }

  const overlays: string[] = [];

  for (const mod of mods) {
    if (mod.kind === 'cutout_hole' && mod.mode === 'hollow_ring') {
      const m = mod as CutoutHoleModifier;
      const hw = Math.max(8, m.widthPx);
      const hh = m.shape === 'circle' ? hw : Math.max(8, m.heightPx);
      const radiusCss = getHoleRadiusCss(m.shape, hw, hh);
      overlays.push(
        `<div style="position: absolute; left: ${m.xPct}%; top: ${m.yPct}%; margin-left: -${Math.round(hw / 2)}px; margin-top: -${Math.round(hh / 2)}px; width: ${hw}px; height: ${hh}px; border-radius: ${radiusCss}; border: ${Math.max(1, m.ringWidth)}px ${m.ringStyle || 'solid'} ${m.ringColor || '#18181B'}; background: transparent; pointer-events: none; z-index: 7; box-sizing: border-box;"></div>`
      );
    } else if (mod.kind === 'divider_line') {
      const m = mod as DividerLineModifier;
      const startPad = ((100 - m.lengthPct) / 2).toFixed(1);
      if (m.orientation === 'h' || m.orientation === 'cross') {
        overlays.push(
          `<div style="position: absolute; top: ${m.offsetPct}%; left: ${startPad}%; width: ${m.lengthPct}%; height: 0; border-top: ${m.thickness}px ${m.style} ${m.color}; pointer-events: none; z-index: 6;"></div>`
        );
      }
      if (m.orientation === 'v' || m.orientation === 'cross') {
        overlays.push(
          `<div style="position: absolute; left: ${m.offsetPct}%; top: ${startPad}%; height: ${m.lengthPct}%; width: 0; border-left: ${m.thickness}px ${m.style} ${m.color}; pointer-events: none; z-index: 6;"></div>`
        );
      }
      if (m.orientation === 'diag_fwd' || m.orientation === 'diag_back') {
        const angle = m.orientation === 'diag_fwd' ? -45 : 45;
        overlays.push(
          `<div style="position: absolute; top: ${m.offsetPct}%; left: -20%; width: 140%; height: 0; border-top: ${m.thickness}px ${m.style} ${m.color}; transform: rotate(${angle}deg); pointer-events: none; z-index: 6;"></div>`
        );
      }
    } else if (mod.kind === 'inner_frame') {
      const m = mod as InnerFrameModifier;
      if (m.frameStyle === 'inset_border') {
        overlays.push(
          `<div style="position: absolute; top: ${m.insetPx}px; right: ${m.insetPx}px; bottom: ${m.insetPx}px; left: ${m.insetPx}px; border: ${m.thickness}px ${m.borderStyle} ${m.color}; border-radius: ${m.radiusPx}px; pointer-events: none; z-index: 6; box-sizing: border-box;"></div>`
        );
      } else if (m.frameStyle === 'double_mat') {
        const innerOffset = m.insetPx + Math.max(4, m.thickness + 3);
        const innerRadius = Math.max(0, m.radiusPx - 2);
        overlays.push(
          `<div style="position: absolute; top: ${m.insetPx}px; right: ${m.insetPx}px; bottom: ${m.insetPx}px; left: ${m.insetPx}px; border: ${m.thickness}px ${m.borderStyle} ${m.color}; border-radius: ${m.radiusPx}px; pointer-events: none; z-index: 6; box-sizing: border-box;"></div>` +
            `<div style="position: absolute; top: ${innerOffset}px; right: ${innerOffset}px; bottom: ${innerOffset}px; left: ${innerOffset}px; border: 1px ${m.borderStyle} ${m.color}; border-radius: ${innerRadius}px; opacity: 0.72; pointer-events: none; z-index: 6; box-sizing: border-box;"></div>`
        );
      } else if (m.frameStyle === 'dashed_stitch') {
        const stitchOffset = m.insetPx + Math.max(4, m.thickness + 2);
        overlays.push(
          `<div style="position: absolute; top: ${m.insetPx}px; right: ${m.insetPx}px; bottom: ${m.insetPx}px; left: ${m.insetPx}px; border: 1px solid ${m.color}; border-radius: ${m.radiusPx}px; opacity: 0.45; pointer-events: none; z-index: 6; box-sizing: border-box;"></div>` +
            `<div style="position: absolute; top: ${stitchOffset}px; right: ${stitchOffset}px; bottom: ${stitchOffset}px; left: ${stitchOffset}px; border: ${Math.max(1, m.thickness)}px dashed ${m.color}; border-radius: ${Math.max(0, m.radiusPx - 2)}px; pointer-events: none; z-index: 6; box-sizing: border-box;"></div>`
        );
      } else if (m.frameStyle === 'notched_corners') {
        const stud = Math.max(6, Math.round((m.bracketSizePx || 16) * 0.42));
        const ins = `${m.insetPx}px`;
        const b = `${m.thickness}px ${m.borderStyle} ${m.color}`;
        overlays.push(
          `<div style="position: absolute; top: ${m.insetPx + Math.floor(stud / 2)}px; right: ${m.insetPx + Math.floor(stud / 2)}px; bottom: ${m.insetPx + Math.floor(stud / 2)}px; left: ${m.insetPx + Math.floor(stud / 2)}px; border: 1px ${m.borderStyle} ${m.color}; opacity: 0.5; pointer-events: none; z-index: 6; box-sizing: border-box;"></div>` +
            `<div style="position: absolute; top: ${ins}; left: ${ins}; width: ${stud}px; height: ${stud}px; border: ${b}; background-color: ${m.color}; pointer-events: none; z-index: 7; box-sizing: border-box;"></div>` +
            `<div style="position: absolute; top: ${ins}; right: ${ins}; width: ${stud}px; height: ${stud}px; border: ${b}; background-color: ${m.color}; pointer-events: none; z-index: 7; box-sizing: border-box;"></div>` +
            `<div style="position: absolute; bottom: ${ins}; right: ${ins}; width: ${stud}px; height: ${stud}px; border: ${b}; background-color: ${m.color}; pointer-events: none; z-index: 7; box-sizing: border-box;"></div>` +
            `<div style="position: absolute; bottom: ${ins}; left: ${ins}; width: ${stud}px; height: ${stud}px; border: ${b}; background-color: ${m.color}; pointer-events: none; z-index: 7; box-sizing: border-box;"></div>`
        );
      } else if (m.frameStyle === 'ornate_filigree') {
        const b = `${m.thickness}px ${m.borderStyle} ${m.color}`;
        const sz = `${m.bracketSizePx}px`;
        const ins = `${m.insetPx}px`;
        const pipTop = `${Math.max(1, m.insetPx - 4)}px`;
        overlays.push(
          `<div style="position: absolute; top: ${ins}; left: ${ins}; width: ${sz}; height: ${sz}; border-top: ${b}; border-left: ${b}; pointer-events: none; z-index: 6; box-sizing: border-box;"></div>` +
            `<div style="position: absolute; top: ${ins}; right: ${ins}; width: ${sz}; height: ${sz}; border-top: ${b}; border-right: ${b}; pointer-events: none; z-index: 6; box-sizing: border-box;"></div>` +
            `<div style="position: absolute; bottom: ${ins}; right: ${ins}; width: ${sz}; height: ${sz}; border-bottom: ${b}; border-right: ${b}; pointer-events: none; z-index: 6; box-sizing: border-box;"></div>` +
            `<div style="position: absolute; bottom: ${ins}; left: ${ins}; width: ${sz}; height: ${sz}; border-bottom: ${b}; border-left: ${b}; pointer-events: none; z-index: 6; box-sizing: border-box;"></div>` +
            `<div style="position: absolute; top: ${pipTop}; left: 50%; margin-left: -6px; color: ${m.color}; font-size: 10px; line-height: 1; pointer-events: none; z-index: 7;">✦</div>` +
            `<div style="position: absolute; bottom: ${pipTop}; left: 50%; margin-left: -6px; color: ${m.color}; font-size: 10px; line-height: 1; pointer-events: none; z-index: 7;">✦</div>`
        );
      } else {
        const b = `${m.thickness}px ${m.borderStyle} ${m.color}`;
        const sz = `${m.bracketSizePx}px`;
        const ins = `${m.insetPx}px`;
        overlays.push(
          `<div style="position: absolute; top: ${ins}; left: ${ins}; width: ${sz}; height: ${sz}; border-top: ${b}; border-left: ${b}; pointer-events: none; z-index: 6; box-sizing: border-box;"></div>` +
            `<div style="position: absolute; top: ${ins}; right: ${ins}; width: ${sz}; height: ${sz}; border-top: ${b}; border-right: ${b}; pointer-events: none; z-index: 6; box-sizing: border-box;"></div>` +
            `<div style="position: absolute; bottom: ${ins}; right: ${ins}; width: ${sz}; height: ${sz}; border-bottom: ${b}; border-right: ${b}; pointer-events: none; z-index: 6; box-sizing: border-box;"></div>` +
            `<div style="position: absolute; bottom: ${ins}; left: ${ins}; width: ${sz}; height: ${sz}; border-bottom: ${b}; border-left: ${b}; pointer-events: none; z-index: 6; box-sizing: border-box;"></div>`
        );
      }
    }
  }

  return {
    f2uPunchHtml,
    overlaysHtml: overlays.join('\n'),
  };
}

export function renderSplitModifierHTML(
  el: DesignElement,
  split: SplitModifier,
  children: DesignElement[],
  allElements: DesignElement[],
  isToyhouse: boolean,
  isToyhouseFree: boolean,
  renderChildFn: (
    child: DesignElement,
    isToyhouse: boolean,
    allElements: DesignElement[],
    isFreeformFixed: boolean,
    isToyhouseFree: boolean
  ) => string,
  escapeAttr: (v: string) => string,
  sanitizeBodyFn: (v: string) => string = (v) => v
): string {
  const isVert = split.axis === 'vertical';
  const r1 = Math.max(10, Math.min(85, split.ratio));
  const r2 =
    split.panes === 3
      ? Math.max(10, Math.min(85 - r1, split.ratio2 ?? Math.round((100 - r1) / 2)))
      : 100 - r1;
  const r3 = split.panes === 3 ? Math.max(5, 100 - r1 - r2) : 0;

  const paneRatios = split.panes === 3 ? [r1, r2, r3] : [r1, r2];
  const paneBgs = [split.pane1Bg, split.pane2Bg, split.pane3Bg];
  const paneTexts = [split.pane1Text, split.pane2Text, split.pane3Text];

  const panesHtml = paneRatios
    .map((pct, idx) => {
      const hasNext = idx < paneRatios.length - 1;
      const borderSide = isVert ? 'border-right' : 'border-bottom';
      const dividerCss = hasNext
        ? `${borderSide}: ${split.dividerWidth}px ${split.dividerStyle} ${split.dividerColor}; `
        : '';
      const rawBg = paneBgs[idx];
      const bgCss =
        rawBg && rawBg !== 'inherit' && rawBg !== 'transparent'
          ? `background-color: ${rawBg}; `
          : '';
      const autoTextColor =
        rawBg && /^#(0|1|2|3)/i.test(rawBg) && (!el.textColor || el.textColor === '#1F2937' || el.textColor === '#18181B')
          ? 'color: #FFFFFF; '
          : '';

      const paneChildren = children.filter((c) => {
        const pIdx = c.parentPaneIndex ?? 0;
        if (idx === paneRatios.length - 1 && pIdx >= paneRatios.length) return true;
        return pIdx === idx;
      });

      const childrenHtml =
        paneChildren.length > 0
          ? paneChildren
              .map((child) => {
                if ((el.containerLayout || 'freeform_offset') === 'freeform_offset') {
                  const ox = child.childOffsetX !== undefined ? child.childOffsetX : 12;
                  const oy = child.childOffsetY !== undefined ? child.childOffsetY : 12;
                  return `<div style="position: absolute; left: ${ox}px; top: ${oy}px; width: ${child.childCustomWidth || child.width}px; height: ${child.childCustomHeight || child.height}px; overflow: hidden; box-sizing: border-box; z-index: ${child.zIndex || 10};">${renderChildFn(child, isToyhouse, allElements, false, isToyhouseFree)}</div>`;
                }
                const imgH =
                  child.type === 'image' || child.type === 'pure_image_slot'
                    ? ` height: ${child.childCustomHeight || child.height}px;`
                    : '';
                return `<div style="width: 100%; min-width: 0;${imgH}">${renderChildFn(child, isToyhouse, allElements, false, isToyhouseFree)}</div>`;
              })
              .join('\n')
          : '';

      const fallbackText =
        paneTexts[idx] !== undefined && paneTexts[idx] !== ''
          ? sanitizeBodyFn(paneTexts[idx]!)
          : idx === 0 && !childrenHtml && (el.content || el.subContent)
          ? `${el.content ? `<div style="font-weight: 600;">${el.content}</div>` : ''}${el.subContent ? `<div style="font-size: ${Math.max(11, el.fontSize - 1)}px; white-space: pre-line;">${el.subContent}</div>` : ''}`
          : '';

      return `<div style="flex: 0 0 ${pct}%; min-width: 0; min-height: 0; position: relative; padding: 10px; display: flex; flex-direction: column; gap: 6px; box-sizing: border-box; overflow: hidden; ${bgCss}${autoTextColor}${dividerCss}">${fallbackText}${childrenHtml}</div>`;
    })
    .join('\n');

  let centerBadgeHtml = '';
  if (split.centerBadge?.enabled) {
    const b = split.centerBadge;
    const sz = Math.max(18, b.size || 54);
    const leftPct = isVert ? r1 : 50;
    const topPct = isVert ? 50 : r1;
    const radius = b.shape === 'square' ? '6px' : '999px';
    const w = b.shape === 'pill' ? Math.round(sz * 1.45) : sz;
    centerBadgeHtml = `<div style="position: absolute; left: ${leftPct}%; top: ${topPct}%; margin-left: -${Math.round(w / 2)}px; margin-top: -${Math.round(sz / 2)}px; width: ${w}px; height: ${sz}px; border-radius: ${radius}; background-color: ${b.bgColor || 'transparent'}; border: ${b.borderWidth}px solid ${b.borderColor || '#18181B'}; display: flex; align-items: center; justify-content: center; font-size: 11px; font-weight: 700; z-index: 8; pointer-events: none; box-sizing: border-box;">${b.text ? escapeAttr(b.text) : ''}</div>`;
  }

  return `<div style="display: flex; flex-direction: ${isVert ? 'row' : 'column'}; width: 100%; height: 100%; flex: 1; position: relative; min-height: 0; box-sizing: border-box;">\n${panesHtml}\n${centerBadgeHtml}\n</div>`;
}

