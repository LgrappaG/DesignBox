import type { ImageShape } from '../types/schema';

export const F2U_GEOMETRIC_SHAPES = [
  'hexagon',
  'hexagon_flat',
  'diamond',
  'octagon',
  'bevel',
] as const;

export type F2UGeometricShape = (typeof F2U_GEOMETRIC_SHAPES)[number];

export const DEFAULT_SHAPE_CUT_PX = 14;
export const MIN_SHAPE_CUT_PX = 4;
export const MAX_SHAPE_CUT_PX = 48;

export function isF2UGeometricShape(shape?: ImageShape): shape is F2UGeometricShape {
  return (
    shape === 'hexagon' ||
    shape === 'hexagon_flat' ||
    shape === 'diamond' ||
    shape === 'octagon' ||
    shape === 'bevel'
  );
}

export function normalizeShapeCutPx(shapeCutPx?: number): number {
  if (typeof shapeCutPx !== 'number' || Number.isNaN(shapeCutPx)) {
    return DEFAULT_SHAPE_CUT_PX;
  }
  return Math.max(MIN_SHAPE_CUT_PX, Math.min(MAX_SHAPE_CUT_PX, Math.round(shapeCutPx)));
}

interface QuadrantSpec {
  dirTopLeft: string;
  dirTopRight: string;
  dirBottomLeft: string;
  dirBottomRight: string;
  stopTransparent: string;
  stopSolid: string;
}

function getQuadrantSpec(shape: F2UGeometricShape, shapeCutPx?: number): QuadrantSpec {
  switch (shape) {
    case 'hexagon':
      // Pointy-top (vertical) hexagon: crisp at W:H ~ 1:1.155
      return {
        dirTopLeft: '150deg',
        dirTopRight: '210deg',
        dirBottomLeft: '30deg',
        dirBottomRight: '330deg',
        stopTransparent: '33%',
        stopSolid: '33.6%',
      };
    case 'hexagon_flat':
      // Flat-top (horizontal) hexagon: crisp at W:H ~ 1.155:1
      return {
        dirTopLeft: '120deg',
        dirTopRight: '240deg',
        dirBottomLeft: '60deg',
        dirBottomRight: '300deg',
        stopTransparent: '33%',
        stopSolid: '33.6%',
      };
    case 'diamond':
      // Keyword directions keep vertices anchored at exact center edges on any aspect ratio
      return {
        dirTopLeft: 'to bottom right',
        dirTopRight: 'to bottom left',
        dirBottomLeft: 'to top right',
        dirBottomRight: 'to top left',
        stopTransparent: '49.5%',
        stopSolid: '50%',
      };
    case 'octagon':
      if (typeof shapeCutPx === 'number' && !Number.isNaN(shapeCutPx) && shapeCutPx > 0) {
        const px = normalizeShapeCutPx(shapeCutPx);
        return {
          dirTopLeft: '135deg',
          dirTopRight: '225deg',
          dirBottomLeft: '45deg',
          dirBottomRight: '315deg',
          stopTransparent: `${px}px`,
          stopSolid: `${px + 0.6}px`,
        };
      }
      return {
        dirTopLeft: 'to bottom right',
        dirTopRight: 'to bottom left',
        dirBottomLeft: 'to top right',
        dirBottomRight: 'to top left',
        stopTransparent: '29%',
        stopSolid: '29.6%',
      };
    case 'bevel': {
      const px = normalizeShapeCutPx(shapeCutPx);
      return {
        dirTopLeft: '135deg',
        dirTopRight: '225deg',
        dirBottomLeft: '45deg',
        dirBottomRight: '315deg',
        stopTransparent: `${px}px`,
        stopSolid: `${px + 0.6}px`,
      };
    }
  }
}

/**
 * Builds HTMLPurifier-safe inline 4-quadrant linear-gradient CSS that carves a geometric
 * polygon fill directly out of an element's background (no clip-path, transform, or SVG).
 * Uses 51% 51% quadrants with a 0.6 step to avoid center subpixel seams.
 */
export function buildF2UQuadrantSurfaceCss(
  shape: F2UGeometricShape,
  fillColor: string,
  shapeCutPx?: number,
): string {
  if (!fillColor || fillColor === 'transparent') {
    return 'background-color: transparent';
  }
  const safeColor = fillColor;
  const spec = getQuadrantSpec(shape, shapeCutPx);
  const g1 = `linear-gradient(${spec.dirTopLeft}, transparent ${spec.stopTransparent}, ${safeColor} ${spec.stopSolid})`;
  const g2 = `linear-gradient(${spec.dirTopRight}, transparent ${spec.stopTransparent}, ${safeColor} ${spec.stopSolid})`;
  const g3 = `linear-gradient(${spec.dirBottomLeft}, transparent ${spec.stopTransparent}, ${safeColor} ${spec.stopSolid})`;
  const g4 = `linear-gradient(${spec.dirBottomRight}, transparent ${spec.stopTransparent}, ${safeColor} ${spec.stopSolid})`;
  return [
    'background-color: transparent',
    `background-image: ${g1}, ${g2}, ${g3}, ${g4}`,
    'background-position: top left, top right, bottom left, bottom right',
    'background-size: 51% 51%',
    'background-repeat: no-repeat',
  ].join('; ');
}

/**
 * Builds an inverted 4-quadrant corner overlay CSS string for images and textured containers
 * in F2U mode, painting solid corner wedges matching the surrounding page/card background.
 */
export function buildF2UCornerMaskOverlayCss(
  shape: F2UGeometricShape,
  maskBgColor: string,
  shapeCutPx?: number,
): string {
  const safeMask = maskBgColor && maskBgColor !== 'transparent' ? maskBgColor : '#FAF8F5';
  const spec = getQuadrantSpec(shape, shapeCutPx);
  const g1 = `linear-gradient(${spec.dirTopLeft}, ${safeMask} ${spec.stopTransparent}, transparent ${spec.stopSolid})`;
  const g2 = `linear-gradient(${spec.dirTopRight}, ${safeMask} ${spec.stopTransparent}, transparent ${spec.stopSolid})`;
  const g3 = `linear-gradient(${spec.dirBottomLeft}, ${safeMask} ${spec.stopTransparent}, transparent ${spec.stopSolid})`;
  const g4 = `linear-gradient(${spec.dirBottomRight}, ${safeMask} ${spec.stopTransparent}, transparent ${spec.stopSolid})`;
  return [
    `background-image: ${g1}, ${g2}, ${g3}, ${g4}`,
    'background-position: top left, top right, bottom left, bottom right',
    'background-size: 51% 51%',
    'background-repeat: no-repeat',
    'pointer-events: none',
  ].join('; ');
}

/**
 * Builds an F2U-safe diagonal line gradient without transform: rotate() or calc().
 */
export function buildF2UAngledLineCss(
  angleDeg: number,
  color: string,
  thicknessPx: number
): string {
  const safeColor = color && color !== 'transparent' ? color : '#18181B';
  const normAngle = ((Math.round(angleDeg) % 360) + 360) % 360;
  const halfBand = Math.min(8, Math.max(0.7, thicknessPx * 0.45));
  const stopA = (50 - halfBand).toFixed(2);
  const stopB = (50 - halfBand * 0.4).toFixed(2);
  const stopC = (50 + halfBand * 0.4).toFixed(2);
  const stopD = (50 + halfBand).toFixed(2);
  return `width: 100%; height: 100%; background-color: transparent; background-image: linear-gradient(${normAngle}deg, transparent ${stopA}%, ${safeColor} ${stopB}%, ${safeColor} ${stopC}%, transparent ${stopD}%)`;
}

/**
 * Builds HTMLPurifier-safe corner/edge radial-gradient cutouts (e.g. ticket notches or cross-star corner scoops)
 * using only inline radial-gradient declarations without clip-path or SVG.
 */
export function buildF2URadialCutoutCss(
  kind: 'ticket' | 'cross_star' | 'scallop',
  fillColor: string,
  maskBgColor = 'transparent'
): string {
  const safeFill = fillColor && fillColor !== 'transparent' ? fillColor : '#FAF8F5';
  const safeMask = maskBgColor && maskBgColor !== 'transparent' ? maskBgColor : 'transparent';

  if (kind === 'ticket') {
    const notchLeft = `radial-gradient(circle at 0% 50%, ${safeMask} 12px, ${safeFill} 12.6px)`;
    const notchRight = `radial-gradient(circle at 100% 50%, ${safeMask} 12px, ${safeFill} 12.6px)`;
    return [
      'background-color: transparent',
      `background-image: ${notchLeft}, ${notchRight}`,
      'background-position: left center, right center',
      'background-size: 51% 100%',
      'background-repeat: no-repeat',
    ].join('; ');
  }

  if (kind === 'cross_star') {
    const tl = `radial-gradient(circle at 0% 0%, ${safeMask} 48%, ${safeFill} 49%)`;
    const tr = `radial-gradient(circle at 100% 0%, ${safeMask} 48%, ${safeFill} 49%)`;
    const bl = `radial-gradient(circle at 0% 100%, ${safeMask} 48%, ${safeFill} 49%)`;
    const br = `radial-gradient(circle at 100% 100%, ${safeMask} 48%, ${safeFill} 49%)`;
    return [
      'background-color: transparent',
      `background-image: ${tl}, ${tr}, ${bl}, ${br}`,
      'background-position: top left, top right, bottom left, bottom right',
      'background-size: 51% 51%',
      'background-repeat: no-repeat',
    ].join('; ');
  }

  // Scallop: decorative radial repeating edge pattern
  return [
    `background-color: ${safeFill}`,
    `background-image: radial-gradient(circle at 50% 0%, ${safeMask} 8px, transparent 8.6px), radial-gradient(circle at 50% 100%, ${safeMask} 8px, transparent 8.6px)`,
    'background-size: 24px 100%',
    'background-repeat: repeat-x',
  ].join('; ');
}
