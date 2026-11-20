import React, { useCallback, useEffect, useRef } from 'react';
import { CursorTracker } from '../hooks/useViewportNavigation';
import { CanvasGuide, UiTheme } from '../types/schema';
import {
  CuteThemeColors,
  DEFAULT_CUTE_THEME_COLORS,
  resolveRulerPalette,
} from '../utils/studioSettings';

interface DynamicRulerProps {
  orientation: 'horizontal' | 'vertical';
  lengthPx: number;
  originOffsetPx: number;
  canvasExtentPx: number;
  zoom: number;
  cursorTracker?: CursorTracker;
  cursorCanvasPos?: number | null;
  uiTheme: UiTheme;
  cuteThemeColors?: CuteThemeColors;
  guides?: CanvasGuide[];
  onResetPan?: () => void;
  onStartCreateGuide?: (e: React.PointerEvent) => void;
}

const MAJOR_STEP_CANDIDATES = [10, 20, 25, 50, 100, 200, 250, 500, 1000];

const DynamicRulerCanvasInner: React.FC<DynamicRulerProps> = ({
  orientation,
  lengthPx,
  originOffsetPx,
  canvasExtentPx,
  zoom,
  cursorTracker,
  cursorCanvasPos,
  uiTheme,
  cuteThemeColors = DEFAULT_CUTE_THEME_COLORS,
  guides = [],
  onResetPan,
  onStartCreateGuide,
}) => {
  const canvasElRef = useRef<HTMLCanvasElement | null>(null);
  const staticCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const rafRef = useRef<number | null>(null);
  const initialCursorPos = cursorTracker
    ? cursorTracker.get().inside
      ? orientation === 'horizontal'
        ? cursorTracker.get().x
        : cursorTracker.get().y
      : null
    : cursorCanvasPos ?? null;
  const latestCursorPosRef = useRef<number | null>(initialCursorPos);
  const themeOverrideRef = useRef<{ uiTheme?: UiTheme; cuteColors?: CuteThemeColors }>({});
  const thickness = 20;

  const paintNeedleOverlay = useCallback(
    (themeOverride?: UiTheme, cuteOverride?: CuteThemeColors) => {
      const canvas = canvasElRef.current;
      const staticCanvas = staticCanvasRef.current;
      if (!canvas || !staticCanvas || lengthPx <= 0) return;

      const dpr = Math.max(1, window.devicePixelRatio || 1);
      const w = orientation === 'horizontal' ? lengthPx : thickness;
      const h = orientation === 'horizontal' ? thickness : lengthPx;
      const targetW = Math.round(w * dpr);
      const targetH = Math.round(h * dpr);
      if (canvas.width !== targetW) canvas.width = targetW;
      if (canvas.height !== targetH) canvas.height = targetH;
      canvas.style.width = `${w}px`;
      canvas.style.height = `${h}px`;

      const ctx = canvas.getContext('2d');
      if (!ctx) return;

      ctx.save();
      ctx.setTransform(1, 0, 0, 1, 0, 0);
      ctx.clearRect(0, 0, targetW, targetH);
      ctx.drawImage(staticCanvas, 0, 0);

      const posVal = latestCursorPosRef.current;
      if (posVal !== null) {
        const cPos = Math.round(originOffsetPx + posVal * zoom) + 0.5;
        if (cPos >= 0 && cPos <= lengthPx) {
          ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
          const palette = resolveRulerPalette(
            themeOverride ?? themeOverrideRef.current.uiTheme ?? uiTheme,
            cuteOverride ?? themeOverrideRef.current.cuteColors ?? cuteThemeColors
          );
          const { accentColor } = palette;

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
    },
    [orientation, lengthPx, originOffsetPx, zoom, uiTheme, cuteThemeColors]
  );

  const drawStaticAndComposite = useCallback(
    (themeOverride?: UiTheme, cuteOverride?: CuteThemeColors) => {
      if (lengthPx <= 0) return;
      const dpr = Math.max(1, window.devicePixelRatio || 1);
      const w = orientation === 'horizontal' ? lengthPx : thickness;
      const h = orientation === 'horizontal' ? thickness : lengthPx;
      const targetW = Math.round(w * dpr);
      const targetH = Math.round(h * dpr);

      if (!staticCanvasRef.current && typeof document !== 'undefined') {
        staticCanvasRef.current = document.createElement('canvas');
      }
      const staticCanvas = staticCanvasRef.current;
      if (!staticCanvas) return;

      if (staticCanvas.width !== targetW) staticCanvas.width = targetW;
      if (staticCanvas.height !== targetH) staticCanvas.height = targetH;

      const ctx = staticCanvas.getContext('2d');
      if (!ctx) return;

      ctx.save();
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

      const palette = resolveRulerPalette(
        themeOverride ?? uiTheme,
        cuteOverride ?? cuteThemeColors
      );
      const { rulerBg, tickColor, textColor, accentColor, spanHighlight } = palette;

      ctx.fillStyle = rulerBg;
      ctx.fillRect(0, 0, w, h);

      const spanStart = originOffsetPx;
      const spanEnd = originOffsetPx + canvasExtentPx * zoom;
      const clippedStart = Math.max(0, spanStart);
      const clippedEnd = Math.min(lengthPx, spanEnd);
      if (clippedEnd > clippedStart) {
        ctx.fillStyle = spanHighlight;
        if (orientation === 'horizontal') {
          ctx.fillRect(clippedStart, 0, clippedEnd - clippedStart, h);
        } else {
          ctx.fillRect(0, clippedStart, w, clippedEnd - clippedStart);
        }
      }

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

      ctx.restore();
      paintNeedleOverlay(themeOverride, cuteOverride);
    },
    [
      orientation,
      lengthPx,
      originOffsetPx,
      canvasExtentPx,
      zoom,
      uiTheme,
      cuteThemeColors,
      guides,
      paintNeedleOverlay,
    ]
  );

  useEffect(() => {
    drawStaticAndComposite();
  }, [drawStaticAndComposite]);

  useEffect(() => {
    if (cursorTracker) return;
    const nextPos = cursorCanvasPos ?? null;
    if (latestCursorPosRef.current === nextPos) return;
    latestCursorPosRef.current = nextPos;
    paintNeedleOverlay();
  }, [cursorCanvasPos, cursorTracker, paintNeedleOverlay]);

  useEffect(() => {
    if (!cursorTracker) return;
    const syncInitial = () => {
      const s = cursorTracker.get();
      latestCursorPosRef.current = s.inside
        ? orientation === 'horizontal'
          ? s.x
          : s.y
        : null;
    };
    syncInitial();

    const unsub = cursorTracker.subscribe((state) => {
      const nextPos = state.inside
        ? orientation === 'horizontal'
          ? state.x
          : state.y
        : null;
      if (latestCursorPosRef.current === nextPos) return;
      latestCursorPosRef.current = nextPos;
      if (rafRef.current !== null) return;
      rafRef.current = window.requestAnimationFrame(() => {
        rafRef.current = null;
        paintNeedleOverlay();
      });
    });

    return () => {
      unsub();
      if (rafRef.current !== null) {
        window.cancelAnimationFrame(rafRef.current);
        rafRef.current = null;
      }
    };
  }, [cursorTracker, orientation, paintNeedleOverlay]);

  useEffect(() => {
    const handleLiveThemeUpdate = (ev: Event) => {
      const detail = (ev as CustomEvent<{ uiTheme?: UiTheme; cuteColors?: CuteThemeColors }>).detail;
      if (!detail) return;
      themeOverrideRef.current = { uiTheme: detail.uiTheme, cuteColors: detail.cuteColors };
      drawStaticAndComposite(detail.uiTheme, detail.cuteColors);
    };
    window.addEventListener('dbx-theme-vars-updated', handleLiveThemeUpdate);
    return () => window.removeEventListener('dbx-theme-vars-updated', handleLiveThemeUpdate);
  }, [drawStaticAndComposite]);

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

export const DynamicRulerCanvas = React.memo(DynamicRulerCanvasInner);
