import React, { useEffect, useRef } from 'react';
import { CanvasGuide } from '../types/schema';

interface DynamicRulerProps {
  orientation: 'horizontal' | 'vertical';
  lengthPx: number;
  originOffsetPx: number;
  canvasExtentPx: number;
  zoom: number;
  cursorCanvasPos: number | null;
  uiTheme: 'carbon' | 'paper';
  guides?: CanvasGuide[];
  onResetPan?: () => void;
  onStartCreateGuide?: (e: React.PointerEvent) => void;
}

const MAJOR_STEP_CANDIDATES = [10, 20, 25, 50, 100, 200, 250, 500, 1000];

export const DynamicRulerCanvas: React.FC<DynamicRulerProps> = ({
  orientation,
  lengthPx,
  originOffsetPx,
  canvasExtentPx,
  zoom,
  cursorCanvasPos,
  uiTheme,
  guides = [],
  onResetPan,
  onStartCreateGuide,
}) => {
  const canvasElRef = useRef<HTMLCanvasElement | null>(null);
  const thickness = 20;

  useEffect(() => {
    const canvas = canvasElRef.current;
    if (!canvas || lengthPx <= 0) return;

    const dpr = Math.max(1, window.devicePixelRatio || 1);
    const w = orientation === 'horizontal' ? lengthPx : thickness;
    const h = orientation === 'horizontal' ? thickness : lengthPx;

    canvas.width = Math.round(w * dpr);
    canvas.height = Math.round(h * dpr);
    canvas.style.width = `${w}px`;
    canvas.style.height = `${h}px`;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    ctx.save();
    ctx.scale(dpr, dpr);

    const styles = getComputedStyle(document.documentElement);
    const rulerBg = styles.getPropertyValue('--ruler-bg').trim() || (uiTheme === 'paper' ? '#F3EFE6' : '#1E1D1B');
    const tickColor = styles.getPropertyValue('--ruler-tick').trim() || (uiTheme === 'paper' ? '#A89F91' : '#57534E');
    const textColor = styles.getPropertyValue('--text-muted').trim() || (uiTheme === 'paper' ? '#6B655D' : '#A8A29E');
    const accentColor = styles.getPropertyValue('--accent').trim() || '#C86D51';

    // Fill background
    ctx.fillStyle = rulerBg;
    ctx.fillRect(0, 0, w, h);

    // Subtle highlight for active canvas span [0 .. canvasExtentPx]
    const spanStart = originOffsetPx;
    const spanEnd = originOffsetPx + canvasExtentPx * zoom;
    const clippedStart = Math.max(0, spanStart);
    const clippedEnd = Math.min(lengthPx, spanEnd);
    if (clippedEnd > clippedStart) {
      ctx.fillStyle = uiTheme === 'paper' ? 'rgba(200, 109, 81, 0.08)' : 'rgba(224, 122, 95, 0.11)';
      if (orientation === 'horizontal') {
        ctx.fillRect(clippedStart, 0, clippedEnd - clippedStart, h);
      } else {
        ctx.fillRect(0, clippedStart, w, clippedEnd - clippedStart);
      }
    }

    // Choose adaptive tick step based on current zoom
    const majorStep = MAJOR_STEP_CANDIDATES.find((s) => s * zoom >= 56) || 1000;
    const subCount =
      majorStep === 20 ? 4 : majorStep === 100 && zoom >= 1.2 ? 10 : majorStep === 200 ? 4 : 5;
    const minorStep = majorStep / subCount;

    const minWorld = -originOffsetPx / zoom;
    const maxWorld = (lengthPx - originOffsetPx) / zoom;
    const firstMinorIdx = Math.floor(minWorld / minorStep);
    const lastMinorIdx = Math.ceil(maxWorld / minorStep);

    ctx.font = '500 9px ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace';

    for (let idx = firstMinorIdx; idx <= lastMinorIdx; idx++) {
      const worldVal = Math.round(idx * minorStep);
      const pos = Math.round(originOffsetPx + worldVal * zoom) + 0.5;
      if (pos < -1 || pos > lengthPx + 1) continue;

      const isMajor = Math.abs(worldVal % majorStep) < 0.001;
      const isMid = !isMajor && subCount >= 4 && Math.abs(worldVal % (majorStep / 2)) < 0.001;

      ctx.strokeStyle = tickColor;
      ctx.lineWidth = 1;
      ctx.beginPath();

      if (orientation === 'horizontal') {
        const tickLen = isMajor ? 14 : isMid ? 8 : 4;
        ctx.moveTo(pos, h);
        ctx.lineTo(pos, h - tickLen);
        ctx.stroke();

        if (isMajor) {
          ctx.fillStyle = worldVal === 0 ? accentColor : textColor;
          ctx.textBaseline = 'top';
          ctx.textAlign = 'left';
          ctx.fillText(String(worldVal), pos + 3, 2);
        }
      } else {
        const tickLen = isMajor ? 14 : isMid ? 8 : 4;
        ctx.moveTo(w, pos);
        ctx.lineTo(w - tickLen, pos);
        ctx.stroke();

        if (isMajor) {
          ctx.save();
          ctx.fillStyle = worldVal === 0 ? accentColor : textColor;
          ctx.translate(9, pos + 3);
          ctx.rotate(-Math.PI / 2);
          ctx.textBaseline = 'middle';
          ctx.textAlign = 'right';
          ctx.fillText(String(worldVal), 0, 0);
          ctx.restore();
        }
      }
    }

    // Crisp 0 and canvasExtent end markers
    [0, canvasExtentPx].forEach((bound) => {
      const boundPos = Math.round(originOffsetPx + bound * zoom) + 0.5;
      if (boundPos >= 0 && boundPos <= lengthPx) {
        ctx.strokeStyle = accentColor;
        ctx.globalAlpha = 0.65;
        ctx.lineWidth = 1;
        ctx.beginPath();
        if (orientation === 'horizontal') {
          ctx.moveTo(boundPos, h - 18);
          ctx.lineTo(boundPos, h);
        } else {
          ctx.moveTo(w - 18, boundPos);
          ctx.lineTo(w, boundPos);
        }
        ctx.stroke();
        ctx.globalAlpha = 1;
      }
    });

    // Persistent ruler guide markers along matching axis
    const axisToRender = orientation === 'horizontal' ? 'x' : 'y';
    guides
      .filter((g) => g.axis === axisToRender)
      .forEach((g) => {
        const gPos = Math.round(originOffsetPx + g.pos * zoom) + 0.5;
        if (gPos >= 0 && gPos <= lengthPx) {
          ctx.fillStyle = '#0EA5E9';
          ctx.beginPath();
          if (orientation === 'horizontal') {
            ctx.moveTo(gPos - 4, h - 7);
            ctx.lineTo(gPos + 4, h - 7);
            ctx.lineTo(gPos, h - 1);
          } else {
            ctx.moveTo(w - 7, gPos - 4);
            ctx.lineTo(w - 7, gPos + 4);
            ctx.lineTo(w - 1, gPos);
          }
          ctx.closePath();
          ctx.fill();
        }
      });

    // Live cursor tracking needle
    if (cursorCanvasPos !== null) {
      const cPos = Math.round(originOffsetPx + cursorCanvasPos * zoom) + 0.5;
      if (cPos >= 0 && cPos <= lengthPx) {
        ctx.strokeStyle = accentColor;
        ctx.lineWidth = 1.5;
        ctx.beginPath();
        if (orientation === 'horizontal') {
          ctx.moveTo(cPos, 0);
          ctx.lineTo(cPos, h);
        } else {
          ctx.moveTo(0, cPos);
          ctx.lineTo(w, cPos);
        }
        ctx.stroke();

        ctx.fillStyle = accentColor;
        ctx.beginPath();
        if (orientation === 'horizontal') {
          ctx.moveTo(cPos - 3.5, h);
          ctx.lineTo(cPos + 3.5, h);
          ctx.lineTo(cPos, h - 5);
        } else {
          ctx.moveTo(w, cPos - 3.5);
          ctx.lineTo(w, cPos + 3.5);
          ctx.lineTo(w - 5, cPos);
        }
        ctx.closePath();
        ctx.fill();
      }
    }

    ctx.restore();
  }, [orientation, lengthPx, originOffsetPx, canvasExtentPx, zoom, cursorCanvasPos, uiTheme, guides]);

  return (
    <canvas
      ref={canvasElRef}
      onPointerDown={onStartCreateGuide}
      onDoubleClick={onResetPan}
      title={
        orientation === 'horizontal'
          ? 'Dynamic Horizontal Ruler (Drag down onto canvas to pull a Horizontal Guide • Double-click to center)'
          : 'Dynamic Vertical Ruler (Drag right onto canvas to pull a Vertical Guide • Double-click to center)'
      }
      style={{ cursor: orientation === 'horizontal' ? 'row-resize' : 'col-resize' }}
      className="block shrink-0 select-none"
    />
  );
};

