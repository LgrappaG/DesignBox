import { useCallback, useEffect, useRef, useState } from 'react';
import { LayoutMode } from '../types/schema';

export interface PanDragState {
  startClientX: number;
  startClientY: number;
  origPanX: number;
  origPanY: number;
  moved: boolean;
  fromEmptyClick: boolean;
}

export interface CursorTrackState {
  x: number;
  y: number;
  inside: boolean;
}

export interface CursorTracker {
  get: () => CursorTrackState;
  emit: (x: number, y: number, inside: boolean) => void;
  setInside: (inside: boolean) => void;
  subscribe: (listener: (state: CursorTrackState) => void) => () => void;
}

export interface UseViewportNavigationOptions {
  canvasWidth: number;
  canvasHeight: number;
  layoutMode: LayoutMode;
  leftCollapsed: boolean;
  rightCollapsed: boolean;
  bottomDockOpen: boolean;
  canvasViewportRef: React.RefObject<HTMLDivElement | null>;
  canvasTransformRef: React.RefObject<HTMLDivElement | null>;
}

export function useViewportNavigation({
  canvasWidth,
  canvasHeight,
  layoutMode,
  leftCollapsed,
  rightCollapsed,
  bottomDockOpen,
  canvasViewportRef,
  canvasTransformRef,
}: UseViewportNavigationOptions) {
  const [zoom, setZoom] = useState<number>(1);
  const [panOffset, setPanOffset] = useState<{ x: number; y: number }>({ x: 0, y: 0 });
  const [viewportSize, setViewportSize] = useState<{ w: number; h: number }>({ w: 800, h: 600 });
  const [blockContentHeight, setBlockContentHeight] = useState<number>(canvasHeight);
  const [isSpacePressed, setIsSpacePressed] = useState<boolean>(false);
  const [panDrag, setPanDrag] = useState<PanDragState | null>(null);

  const cursorStateRef = useRef<CursorTrackState>({ x: 0, y: 0, inside: false });
  const cursorListenersRef = useRef<Set<(state: CursorTrackState) => void>>(new Set());
  const cursorTrackerRef = useRef<CursorTracker | null>(null);
  if (!cursorTrackerRef.current) {
    cursorTrackerRef.current = {
      get: () => cursorStateRef.current,
      emit: (x: number, y: number, inside: boolean) => {
        const prev = cursorStateRef.current;
        if (prev.x === x && prev.y === y && prev.inside === inside) return;
        const next: CursorTrackState = { x, y, inside };
        cursorStateRef.current = next;
        cursorListenersRef.current.forEach((listener) => listener(next));
      },
      setInside: (inside: boolean) => {
        const prev = cursorStateRef.current;
        if (prev.inside === inside) return;
        const next: CursorTrackState = { ...prev, inside };
        cursorStateRef.current = next;
        cursorListenersRef.current.forEach((listener) => listener(next));
      },
      subscribe: (listener: (state: CursorTrackState) => void) => {
        cursorListenersRef.current.add(listener);
        return () => {
          cursorListenersRef.current.delete(listener);
        };
      },
    };
  }
  const cursorTracker = cursorTrackerRef.current;

  const effectiveCanvasHeight =
    layoutMode === 'block' ? Math.max(canvasHeight, blockContentHeight) : canvasHeight;

  const baseCanvasScreenLeft = Math.round((viewportSize.w - canvasWidth * zoom) / 2);
  const baseCanvasScreenTop = Math.round((viewportSize.h - effectiveCanvasHeight * zoom) / 2);
  const canvasScreenLeft = baseCanvasScreenLeft + panOffset.x;
  const canvasScreenTop = baseCanvasScreenTop + panOffset.y;

  const clampPan = useCallback(
    (nextPanX: number, nextPanY: number, targetZoom = zoom) => {
      const vpW = viewportSize.w;
      const vpH = viewportSize.h;
      if (vpW <= 0 || vpH <= 0) return { x: nextPanX, y: nextPanY };
      const zw = canvasWidth * targetZoom;
      const zh = effectiveCanvasHeight * targetZoom;
      const baseL = (vpW - zw) / 2;
      const baseT = (vpH - zh) / 2;

      const minKeepX = Math.min(Math.max(60, zw * 0.25), Math.max(60, vpW * 0.5));
      const minKeepY = Math.min(Math.max(60, zh * 0.25), Math.max(60, vpH * 0.5));

      const minLeft = minKeepX - zw;
      const maxLeft = vpW - minKeepX;
      const minTop = minKeepY - zh;
      const maxTop = vpH - minKeepY;

      const clampedLeft = Math.max(
        Math.min(minLeft, maxLeft),
        Math.min(Math.max(minLeft, maxLeft), baseL + nextPanX)
      );
      const clampedTop = Math.max(
        Math.min(minTop, maxTop),
        Math.min(Math.max(minTop, maxTop), baseT + nextPanY)
      );

      return {
        x: Math.round(clampedLeft - baseL),
        y: Math.round(clampedTop - baseT),
      };
    },
    [canvasWidth, effectiveCanvasHeight, viewportSize.h, viewportSize.w, zoom]
  );

  const zoomTo = useCallback(
    (targetZoom: number, clientX?: number, clientY?: number) => {
      const nextZ = Math.max(0.25, Math.min(4.0, +targetZoom.toFixed(2)));
      const vpEl = canvasViewportRef.current;
      if (!vpEl || viewportSize.w <= 0 || viewportSize.h <= 0) {
        setZoom(nextZ);
        return;
      }
      const vpRect = vpEl.getBoundingClientRect();
      const mx = clientX !== undefined ? clientX - vpRect.left : viewportSize.w / 2;
      const my = clientY !== undefined ? clientY - vpRect.top : viewportSize.h / 2;

      const curLeft = (viewportSize.w - canvasWidth * zoom) / 2 + panOffset.x;
      const curTop = (viewportSize.h - effectiveCanvasHeight * zoom) / 2 + panOffset.y;
      const wx = (mx - curLeft) / zoom;
      const wy = (my - curTop) / zoom;

      const nextLeft = mx - wx * nextZ;
      const nextTop = my - wy * nextZ;
      const nextBaseL = (viewportSize.w - canvasWidth * nextZ) / 2;
      const nextBaseT = (viewportSize.h - effectiveCanvasHeight * nextZ) / 2;

      setZoom(nextZ);
      setPanOffset(clampPan(nextLeft - nextBaseL, nextTop - nextBaseT, nextZ));
    },
    [
      canvasViewportRef,
      canvasWidth,
      clampPan,
      effectiveCanvasHeight,
      panOffset.x,
      panOffset.y,
      viewportSize.h,
      viewportSize.w,
      zoom,
    ]
  );

  const fitCanvasToView = useCallback(() => {
    const pad = 48;
    const availW = Math.max(120, viewportSize.w - pad);
    const availH = Math.max(120, viewportSize.h - pad);
    const rawScale = Math.min(availW / canvasWidth, availH / effectiveCanvasHeight);
    const fitZ = Math.max(0.25, Math.min(2.5, Math.floor(rawScale * 100) / 100));
    setZoom(fitZ);
    setPanOffset({ x: 0, y: 0 });
  }, [canvasWidth, effectiveCanvasHeight, viewportSize.h, viewportSize.w]);

  const centerCanvasView = useCallback(() => {
    setPanOffset({ x: 0, y: 0 });
  }, []);

  const clientToCanvasWithInside = useCallback(
    (clientX: number, clientY: number) => {
      const vpEl = canvasViewportRef.current;
      if (!vpEl) return { x: 0, y: 0, inside: false };
      const vpRect = vpEl.getBoundingClientRect();
      const inside =
        clientX >= vpRect.left &&
        clientX <= vpRect.right &&
        clientY >= vpRect.top &&
        clientY <= vpRect.bottom;
      return {
        x: Math.round((clientX - vpRect.left - canvasScreenLeft) / zoom),
        y: Math.round((clientY - vpRect.top - canvasScreenTop) / zoom),
        inside,
      };
    },
    [canvasScreenLeft, canvasScreenTop, canvasViewportRef, zoom]
  );

  const clientToCanvas = useCallback(
    (clientX: number, clientY: number) => {
      const { x, y } = clientToCanvasWithInside(clientX, clientY);
      return { x, y };
    },
    [clientToCanvasWithInside]
  );

  // Track viewport dimensions for synced rulers & bounded panning
  useEffect(() => {
    const vpEl = canvasViewportRef.current;
    if (!vpEl) return;
    const updateSize = () => {
      const rect = vpEl.getBoundingClientRect();
      const nw = Math.round(rect.width);
      const nh = Math.round(rect.height);
      if (nw > 0 && nh > 0) {
        setViewportSize((prev) => (prev.w === nw && prev.h === nh ? prev : { w: nw, h: nh }));
      }
    };
    updateSize();
    const ro = new ResizeObserver(updateSize);
    ro.observe(vpEl);
    return () => ro.disconnect();
  }, [canvasViewportRef, leftCollapsed, rightCollapsed, bottomDockOpen]);

  // Track block-flow rendered height
  useEffect(() => {
    const contentEl = canvasTransformRef.current;
    if (!contentEl) return;
    const ro = new ResizeObserver(() => {
      const h = Math.round(contentEl.offsetHeight);
      if (h > 0) {
        setBlockContentHeight((prev) => (prev === h ? prev : h));
      }
    });
    ro.observe(contentEl);
    return () => ro.disconnect();
  }, [canvasTransformRef, layoutMode]);

  // Keep pan bounded when viewport/canvas/zoom changes
  useEffect(() => {
    setPanOffset((prev) => {
      const clamped = clampPan(prev.x, prev.y, zoom);
      return clamped.x === prev.x && clamped.y === prev.y ? prev : clamped;
    });
  }, [clampPan, zoom]);

  // Non-passive wheel listener for Ctrl+Wheel zoom and smooth Wheel panning
  const wheelLogicRef = useRef<{ onWheel: (e: WheelEvent) => void }>({
    onWheel: () => {},
  });
  wheelLogicRef.current.onWheel = (e: WheelEvent) => {
    if (e.ctrlKey || e.metaKey) {
      e.preventDefault();
      const factor = e.deltaY < 0 ? 1.1 : 1 / 1.1;
      zoomTo(zoom * factor, e.clientX, e.clientY);
      return;
    }
    e.preventDefault();
    const dx = e.shiftKey ? -e.deltaY : -e.deltaX;
    const dy = e.shiftKey ? -e.deltaX : -e.deltaY;
    setPanOffset((prev) => clampPan(prev.x + dx, prev.y + dy, zoom));
  };

  useEffect(() => {
    const vpEl = canvasViewportRef.current;
    if (!vpEl) return;
    const handler = (e: WheelEvent) => wheelLogicRef.current.onWheel(e);
    vpEl.addEventListener('wheel', handler, { passive: false });
    return () => vpEl.removeEventListener('wheel', handler);
  }, [canvasViewportRef]);

  return {
    zoom,
    setZoom,
    panOffset,
    setPanOffset,
    viewportSize,
    blockContentHeight,
    effectiveCanvasHeight,
    canvasScreenLeft,
    canvasScreenTop,
    cursorTracker,
    isSpacePressed,
    setIsSpacePressed,
    panDrag,
    setPanDrag,
    clampPan,
    zoomTo,
    fitCanvasToView,
    centerCanvasView,
    clientToCanvas,
    clientToCanvasWithInside,
  };
}

