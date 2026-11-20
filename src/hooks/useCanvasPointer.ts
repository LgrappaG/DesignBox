import { useCallback, useEffect, useRef, useState } from 'react';
import { PURE_PRIMITIVE_DEFAULTS, isPureContainerType } from '../data/purePrimitives';
import {
  CanvasGuide,
  DesignElement,
  ElementType,
  LayoutMode,
  SnapDistanceBadge,
  SnapGuideLine,
  SplitModifier,
} from '../types/schema';
import {
  computeRotatedResizeRect,
  getElementCanvasOrigin,
  getInnerBoxGeometry,
  getRotatedBoundingBox,
  getSplitPaneGeometry,
  resolvePointInContainer,
} from '../utils/canvasGeometry';
import { createUniqueElementId } from '../utils/elementFactory';
import {
  SnapTargetCache,
  buildSnapTargetCache,
  computeMultiSelectMoveDelta,
  computeSmartMoveSnap,
  computeSmartResizeSnap,
  extractOtherSnapRects,
} from '../utils/snapGeometry';
import { CursorTracker, PanDragState } from './useViewportNavigation';

export type ResizeDir = 'nw' | 'n' | 'ne' | 'e' | 'se' | 's' | 'sw' | 'w';
export type CanvasDrawTool = 'select' | 'draw_box' | 'draw_line' | 'draw_ring';

export interface GuideDragState {
  id: string;
  axis: 'x' | 'y';
  pos: number;
  isNew: boolean;
}

export interface DragState {
  id: string;
  mode: 'move' | 'resize' | 'rotate';
  resizeDir?: ResizeDir;
  startX: number;
  startY: number;
  origX: number;
  origY: number;
  origW: number;
  origH: number;
  origRot: number;
  origPositions?: Record<string, { x: number; y: number }>;
  isChild?: boolean;
  parentId?: string;
  origAbsInParentX?: number;
  origAbsInParentY?: number;
  wasAlreadyMultiSelected?: boolean;
}

export interface PanelResizeDragState {
  target: 'left' | 'right' | 'left_split' | 'bottom';
  startX: number;
  startY: number;
  origValue: number;
}

export interface MarqueeRect {
  startX: number;
  startY: number;
  curX: number;
  curY: number;
}

export interface SplitDragState {
  elementId: string;
  modifierId: string;
  axis: 'vertical' | 'horizontal';
  boxLeftPx: number;
  boxTopPx: number;
  boxW: number;
  boxH: number;
}

type GestureSnapCache =
  | { kind: 'top'; cache: SnapTargetCache }
  | { kind: 'child'; parentId: string; paneCaches: Map<number, SnapTargetCache> };

interface PendingPointerMove {
  clientX: number;
  clientY: number;
  shiftKey: boolean;
  altKey: boolean;
}

export interface UseCanvasPointerOptions {
  elements: DesignElement[];
  elementsRef: React.MutableRefObject<DesignElement[]>;
  layoutMode: LayoutMode;
  canvasWidth: number;
  canvasHeight: number;
  zoom: number;
  magneticSnap: boolean;
  autoNestDrop: boolean;
  canvasTool: CanvasDrawTool;
  setCanvasTool: (tool: CanvasDrawTool) => void;
  editingContainer: DesignElement | null;
  selectedIds: string[];
  setSelectedId: (id: string | null) => void;
  setSelectedIds: (ids: string[]) => void;
  inlineEditId: string | null;
  setInlineEditId: (id: string | null) => void;
  isSpacePressed: boolean;
  panDrag: PanDragState | null;
  setPanDrag: React.Dispatch<React.SetStateAction<PanDragState | null>>;
  setPanOffset: React.Dispatch<React.SetStateAction<{ x: number; y: number }>>;
  clampPan: (nextX: number, nextY: number, targetZoom?: number) => { x: number; y: number };
  cursorTracker: CursorTracker;
  clientToCanvas: (clientX: number, clientY: number) => { x: number; y: number };
  clientToCanvasWithInside: (
    clientX: number,
    clientY: number
  ) => { x: number; y: number; inside: boolean };
  leftSplitContainerRef: React.RefObject<HTMLDivElement | null>;
  replaceElementsTransient: (
    nextOrUpdater: DesignElement[] | ((prev: DesignElement[]) => DesignElement[])
  ) => void;
  commitElements: (next: DesignElement[]) => void;
  commitLatestElements: () => void;
  setLeftPanelWidth: (w: number) => void;
  setRightPanelWidth: (w: number) => void;
  setBottomDockHeight: (h: number) => void;
  setLeftLibraryPct: (pct: number) => void;
  guides: CanvasGuide[];
  onChangeGuides: React.Dispatch<React.SetStateAction<CanvasGuide[]>>;
}

export function useCanvasPointer({
  elements,
  elementsRef,
  layoutMode,
  canvasWidth,
  canvasHeight,
  zoom,
  magneticSnap,
  autoNestDrop,
  canvasTool,
  setCanvasTool,
  editingContainer,
  selectedIds,
  setSelectedId,
  setSelectedIds,
  inlineEditId,
  setInlineEditId,
  isSpacePressed,
  panDrag,
  setPanDrag,
  setPanOffset,
  clampPan,
  cursorTracker,
  clientToCanvas,
  clientToCanvasWithInside,
  leftSplitContainerRef,
  replaceElementsTransient,
  commitElements,
  commitLatestElements,
  setLeftPanelWidth,
  setRightPanelWidth,
  setBottomDockHeight,
  setLeftLibraryPct,
  guides,
  onChangeGuides,
}: UseCanvasPointerOptions) {
  const [dragState, setDragStateRaw] = useState<DragState | null>(null);
  const [marqueeSelect, setMarqueeSelectRaw] = useState<MarqueeRect | null>(null);
  const [drawMarquee, setDrawMarqueeRaw] = useState<MarqueeRect | null>(null);
  const [splitDragState, setSplitDragStateRaw] = useState<SplitDragState | null>(null);
  const [dropTargetContainerId, setDropTargetContainerIdRaw] = useState<string | null>(null);
  const [snapLines, setSnapLinesRaw] = useState<SnapGuideLine[]>([]);
  const [spacingBadges, setSpacingBadgesRaw] = useState<SnapDistanceBadge[]>([]);
  const [guideDragState, setGuideDragStateRaw] = useState<GuideDragState | null>(null);
  const [panelResizeDrag, setPanelResizeDragRaw] = useState<PanelResizeDragState | null>(null);

  const dragStateRef = useRef<DragState | null>(dragState);
  const marqueeSelectRef = useRef<MarqueeRect | null>(marqueeSelect);
  const drawMarqueeRef = useRef<MarqueeRect | null>(drawMarquee);
  const splitDragRef = useRef<SplitDragState | null>(splitDragState);
  const dropTargetContainerIdRef = useRef<string | null>(dropTargetContainerId);
  const guideDragRef = useRef<GuideDragState | null>(guideDragState);
  const panelResizeDragRef = useRef<PanelResizeDragState | null>(panelResizeDrag);
  const panDragRef = useRef<PanDragState | null>(panDrag);
  const panDragMovedRef = useRef<boolean>(false);
  const snapLinesEmptyRef = useRef<boolean>(true);
  const spacingBadgesEmptyRef = useRef<boolean>(true);

  dragStateRef.current = dragState;
  marqueeSelectRef.current = marqueeSelect;
  drawMarqueeRef.current = drawMarquee;
  splitDragRef.current = splitDragState;
  dropTargetContainerIdRef.current = dropTargetContainerId;
  guideDragRef.current = guideDragState;
  panelResizeDragRef.current = panelResizeDrag;
  panDragRef.current = panDrag;
  if (!panDrag) panDragMovedRef.current = false;

  const preGestureElementsRef = useRef<DesignElement[] | null>(null);
  const didMoveDuringDragRef = useRef<boolean>(false);
  const lastSettledGestureRef = useRef<object | null>(null);
  const pointerCaptureRef = useRef<{ el: HTMLElement; pointerId: number } | null>(null);
  const snapCacheRef = useRef<GestureSnapCache | null>(null);
  const moveRafRef = useRef<number | null>(null);
  const pendingMoveRef = useRef<PendingPointerMove | null>(null);

  const setDragState = useCallback((next: React.SetStateAction<DragState | null>) => {
    setDragStateRaw((prev) => {
      const resolved = typeof next === 'function' ? next(prev) : next;
      dragStateRef.current = resolved;
      return resolved;
    });
  }, []);

  const setMarqueeSelect = useCallback((next: React.SetStateAction<MarqueeRect | null>) => {
    const resolved = typeof next === 'function' ? next(marqueeSelectRef.current) : next;
    marqueeSelectRef.current = resolved;
    setMarqueeSelectRaw(resolved);
  }, []);

  const setDrawMarquee = useCallback((next: React.SetStateAction<MarqueeRect | null>) => {
    const resolved = typeof next === 'function' ? next(drawMarqueeRef.current) : next;
    drawMarqueeRef.current = resolved;
    setDrawMarqueeRaw(resolved);
  }, []);

  const setDropTargetContainerId = useCallback((next: string | null) => {
    if (dropTargetContainerIdRef.current === next) return;
    dropTargetContainerIdRef.current = next;
    setDropTargetContainerIdRaw(next);
  }, []);

  const setGuideDragState = useCallback((next: React.SetStateAction<GuideDragState | null>) => {
    const resolved = typeof next === 'function' ? next(guideDragRef.current) : next;
    guideDragRef.current = resolved;
    setGuideDragStateRaw(resolved);
  }, []);

  const setPanelResizeDrag = useCallback(
    (next: React.SetStateAction<PanelResizeDragState | null>) => {
      const resolved = typeof next === 'function' ? next(panelResizeDragRef.current) : next;
      panelResizeDragRef.current = resolved;
      setPanelResizeDragRaw(resolved);
    },
    []
  );

  const setSnapLines = useCallback((lines: SnapGuideLine[]) => {
    if (lines.length === 0 && snapLinesEmptyRef.current) return;
    snapLinesEmptyRef.current = lines.length === 0;
    setSnapLinesRaw(lines);
  }, []);

  const setSpacingBadges = useCallback((badges: SnapDistanceBadge[]) => {
    if (badges.length === 0 && spacingBadgesEmptyRef.current) return;
    spacingBadgesEmptyRef.current = badges.length === 0;
    setSpacingBadgesRaw(badges);
  }, []);

  const releaseCapturedPointer = useCallback(() => {
    const cap = pointerCaptureRef.current;
    if (!cap) return;
    pointerCaptureRef.current = null;
    try {
      if (typeof cap.el.hasPointerCapture === 'function' && cap.el.hasPointerCapture(cap.pointerId)) {
        cap.el.releasePointerCapture(cap.pointerId);
      }
    } catch {
      // Ignore already-released pointer
    }
  }, []);

  const setSplitDragState = useCallback(
    (next: React.SetStateAction<SplitDragState | null>) => {
      setSplitDragStateRaw((prev) => {
        const resolved = typeof next === 'function' ? next(prev) : next;
        splitDragRef.current = resolved;
        if (resolved && !prev) {
          preGestureElementsRef.current = elementsRef.current;
          didMoveDuringDragRef.current = false;
        }
        return resolved;
      });
    },
    [elementsRef]
  );

  const startGuideDrag = useCallback(
    (axis: 'x' | 'y', clientX: number, clientY: number, existingGuide?: CanvasGuide) => {
      const pos = clientToCanvas(clientX, clientY);
      const rawCoord = axis === 'x' ? Math.round(pos.x) : Math.round(pos.y);
      const nextGuide: GuideDragState = {
        id: existingGuide?.id || createUniqueElementId('guide', guides),
        axis,
        pos: rawCoord,
        isNew: !existingGuide,
      };
      guideDragRef.current = nextGuide;
      setGuideDragStateRaw(nextGuide);
    },
    [clientToCanvas, guides]
  );

  const handlePointerDown = useCallback(
    (
      e: React.PointerEvent,
      el: DesignElement,
      mode: 'move' | 'resize' | 'rotate',
      resizeDir?: ResizeDir,
      isChildDrag = false
    ) => {
      if (e.button !== 0 || isSpacePressed) return;
      e.stopPropagation();

      // Multi-selection with Shift key
      if (e.shiftKey && !isChildDrag) {
        if (selectedIds.includes(el.id)) {
          const next = selectedIds.filter((id) => id !== el.id);
          setSelectedIds(next);
          setSelectedId(next[next.length - 1] || null);
        } else {
          const next = [...selectedIds, el.id];
          setSelectedIds(next);
          setSelectedId(el.id);
        }
        return;
      }

      const wasAlreadyMultiSelected = selectedIds.includes(el.id) && selectedIds.length > 1;
      if (!selectedIds.includes(el.id)) {
        setSelectedId(el.id);
        setSelectedIds([el.id]);
      } else {
        setSelectedId(el.id);
      }

      if (el.locked) return;
      if (layoutMode === 'block' || inlineEditId === el.id) return;

      const captureTarget = e.currentTarget as HTMLElement | null;
      if (captureTarget && typeof captureTarget.setPointerCapture === 'function') {
        try {
          captureTarget.setPointerCapture(e.pointerId);
          pointerCaptureRef.current = { el: captureTarget, pointerId: e.pointerId };
        } catch {
          // Ignore synthetic or detached pointer capture errors
        }
      }

      const currentSelected = selectedIds.includes(el.id) ? selectedIds : [el.id];
      const posMap: Record<string, { x: number; y: number }> = {};
      elementsRef.current.forEach((item) => {
        if (currentSelected.includes(item.id)) {
          posMap[item.id] = { x: item.x, y: item.y };
        }
      });

      const effectiveX = isChildDrag ? (el.childOffsetX ?? 12) : el.x;
      const effectiveY = isChildDrag ? (el.childOffsetY ?? 12) : el.y;
      const effectiveW = isChildDrag ? (el.childCustomWidth || el.width) : el.width;
      const effectiveH = isChildDrag ? (el.childCustomHeight || el.height) : el.height;

      let origAbsInParentX: number | undefined;
      let origAbsInParentY: number | undefined;
      if (isChildDrag && el.parentId) {
        const p = elementsRef.current.find((item) => item.id === el.parentId);
        if (p) {
          const pRect = getSplitPaneGeometry(p, el.parentPaneIndex ?? 0);
          origAbsInParentX = pRect.paneX + effectiveX;
          origAbsInParentY = pRect.paneY + effectiveY;
        }
        snapCacheRef.current = {
          kind: 'child',
          parentId: el.parentId,
          paneCaches: new Map(),
        };
      } else if (mode === 'move' || mode === 'resize') {
        const excludeIds = new Set(mode === 'move' ? currentSelected : [el.id]);
        const topOthers = extractOtherSnapRects(elementsRef.current, excludeIds);
        snapCacheRef.current = {
          kind: 'top',
          cache: buildSnapTargetCache({
            others: topOthers,
            guides,
            canvasWidth,
            canvasHeight,
            zoom,
          }),
        };
      } else {
        snapCacheRef.current = null;
      }

      preGestureElementsRef.current = elementsRef.current;
      didMoveDuringDragRef.current = false;

      const nextDrag: DragState = {
        id: el.id,
        mode,
        resizeDir,
        startX: e.clientX,
        startY: e.clientY,
        origX: effectiveX,
        origY: effectiveY,
        origW: effectiveW,
        origH: effectiveH,
        origRot: el.rotation || 0,
        origPositions: posMap,
        isChild: isChildDrag,
        parentId: isChildDrag ? el.parentId || undefined : undefined,
        origAbsInParentX,
        origAbsInParentY,
        wasAlreadyMultiSelected,
      };
      dragStateRef.current = nextDrag;
      setDragStateRaw(nextDrag);
    },
    [
      canvasHeight,
      canvasWidth,
      elementsRef,
      guides,
      inlineEditId,
      isSpacePressed,
      layoutMode,
      selectedIds,
      setSelectedId,
      setSelectedIds,
      zoom,
    ]
  );

  const liveEnvRef = useRef({
    zoom,
    magneticSnap,
    autoNestDrop,
    canvasWidth,
    canvasHeight,
    guides,
    clampPan,
    clientToCanvasWithInside,
    cursorTracker,
    leftSplitContainerRef,
    replaceElementsTransient,
    setBottomDockHeight,
    setLeftLibraryPct,
    setLeftPanelWidth,
    setPanDrag,
    setPanOffset,
    setRightPanelWidth,
  });
  liveEnvRef.current = {
    zoom,
    magneticSnap,
    autoNestDrop,
    canvasWidth,
    canvasHeight,
    guides,
    clampPan,
    clientToCanvasWithInside,
    cursorTracker,
    leftSplitContainerRef,
    replaceElementsTransient,
    setBottomDockHeight,
    setLeftLibraryPct,
    setLeftPanelWidth,
    setPanDrag,
    setPanOffset,
    setRightPanelWidth,
  };

  const flushPendingMove = useCallback(() => {
    const ev = pendingMoveRef.current;
    if (!ev) return;
    pendingMoveRef.current = null;

    const env = liveEnvRef.current;
    const panelResize = panelResizeDragRef.current;
    if (panelResize) {
      const vw = typeof window !== 'undefined' ? window.innerWidth : 1380;
      const vh = typeof window !== 'undefined' ? window.innerHeight : 860;
      const maxLeft = Math.max(200, Math.min(520, vw - 520));
      const maxRight = Math.max(240, Math.min(620, vw - 520));
      const maxBottom = Math.max(140, Math.min(520, vh - 260));
      if (panelResize.target === 'left') {
        const nextW = Math.round(panelResize.origValue + (ev.clientX - panelResize.startX));
        env.setLeftPanelWidth(Math.max(190, Math.min(maxLeft, nextW)));
      } else if (panelResize.target === 'right') {
        const nextW = Math.round(panelResize.origValue + (panelResize.startX - ev.clientX));
        env.setRightPanelWidth(Math.max(220, Math.min(maxRight, nextW)));
      } else if (panelResize.target === 'bottom') {
        const nextH = Math.round(panelResize.origValue + (panelResize.startY - ev.clientY));
        env.setBottomDockHeight(Math.max(140, Math.min(maxBottom, nextH)));
      } else if (panelResize.target === 'left_split') {
        const splitRect = env.leftSplitContainerRef.current?.getBoundingClientRect();
        const totalH = Math.max(240, splitRect?.height || 640);
        const dyPct = ((ev.clientY - panelResize.startY) / totalH) * 100;
        env.setLeftLibraryPct(Math.max(22, Math.min(80, Math.round(panelResize.origValue + dyPct))));
      }
      return;
    }

    const activeGuide = guideDragRef.current;
    if (activeGuide) {
      const pos = env.clientToCanvasWithInside(ev.clientX, ev.clientY);
      const coord = activeGuide.axis === 'x' ? Math.round(pos.x) : Math.round(pos.y);
      env.cursorTracker.emit(pos.x, pos.y, pos.inside);
      setGuideDragState((prev) => (prev ? { ...prev, pos: coord } : null));
      return;
    }

    const activePan = panDragRef.current;
    if (activePan) {
      const rawDx = ev.clientX - activePan.startClientX;
      const rawDy = ev.clientY - activePan.startClientY;
      if (!activePan.moved && !panDragMovedRef.current && Math.hypot(rawDx, rawDy) > 3) {
        panDragMovedRef.current = true;
        env.setPanDrag((prev) => (prev ? { ...prev, moved: true } : null));
      }
      env.setPanOffset(env.clampPan(activePan.origPanX + rawDx, activePan.origPanY + rawDy, env.zoom));
      return;
    }

    const pos = env.clientToCanvasWithInside(ev.clientX, ev.clientY);
    if (pos.inside || marqueeSelectRef.current || drawMarqueeRef.current || dragStateRef.current) {
      env.cursorTracker.emit(pos.x, pos.y, pos.inside);
    } else {
      env.cursorTracker.setInside(false);
    }

    if (marqueeSelectRef.current) {
      setMarqueeSelect((prev) => (prev ? { ...prev, curX: pos.x, curY: pos.y } : null));
      return;
    }

    if (drawMarqueeRef.current) {
      const cx = Math.max(0, Math.min(env.canvasWidth, pos.x));
      const cy = Math.max(0, Math.min(env.canvasHeight, pos.y));
      setDrawMarquee((prev) => (prev ? { ...prev, curX: cx, curY: cy } : null));
      return;
    }

    const activeSplitDrag = splitDragRef.current;
    if (activeSplitDrag) {
      const { elementId, modifierId, axis, boxLeftPx, boxTopPx, boxW, boxH } = activeSplitDrag;
      const pct =
        axis === 'vertical'
          ? ((ev.clientX - boxLeftPx) / Math.max(20, boxW)) * 100
          : ((ev.clientY - boxTopPx) / Math.max(20, boxH)) * 100;
      const clamped = Math.max(15, Math.min(85, Math.round(pct)));
      env.replaceElementsTransient((prev) =>
        prev.map((item) => {
          if (item.id !== elementId || !item.modifiers) return item;
          return {
            ...item,
            modifiers: item.modifiers.map((m) => {
              if (m.id === modifierId && m.kind === 'split') {
                if (m.ratio !== clamped) didMoveDuringDragRef.current = true;
                return { ...m, ratio: clamped };
              }
              return m;
            }),
          };
        })
      );
      return;
    }

    const drag = dragStateRef.current;
    if (!drag) return;

    if (!didMoveDuringDragRef.current) {
      if (Math.hypot(ev.clientX - drag.startX, ev.clientY - drag.startY) < 2) {
        return;
      }
      didMoveDuringDragRef.current = true;
    }

    const dx = (ev.clientX - drag.startX) / env.zoom;
    const dy = (ev.clientY - drag.startY) / env.zoom;

    let nextSnapLines: SnapGuideLine[] = [];
    let nextSpacingBadges: SnapDistanceBadge[] = [];

    if (
      drag.mode === 'move' &&
      !drag.isChild &&
      (!drag.origPositions || Object.keys(drag.origPositions).length <= 1)
    ) {
      const movingEl = elementsRef.current.find((item) => item.id === drag.id);
      const wantsNest = (env.autoNestDrop && !ev.shiftKey) || ev.altKey;
      if (movingEl && wantsNest) {
        const curX = Math.max(0, Math.min(env.canvasWidth - movingEl.width, drag.origX + dx));
        const curY = Math.max(0, Math.min(env.canvasHeight - movingEl.height, drag.origY + dy));
        const midX = curX + movingEl.width / 2;
        const midY = curY + movingEl.height / 2;
        const candidates = elementsRef.current
          .filter(
            (cand) =>
              cand.id !== movingEl.id &&
              !cand.parentId &&
              !cand.locked &&
              !cand.hidden &&
              isPureContainerType(cand.type) &&
              movingEl.width <= cand.width * 1.15 &&
              movingEl.height <= cand.height * 1.15 &&
              midX >= cand.x &&
              midX <= cand.x + cand.width &&
              midY >= cand.y &&
              midY <= cand.y + cand.height
          )
          .sort((a, b) => (b.zIndex || 10) - (a.zIndex || 10));
        setDropTargetContainerId(candidates[0]?.id || null);
      } else {
        setDropTargetContainerId(null);
      }
    }

    const cachedTopSnap =
      snapCacheRef.current?.kind === 'top' ? snapCacheRef.current.cache : undefined;

    env.replaceElementsTransient((prev) => {
      if (drag.mode === 'move' && !drag.isChild) {
        const movingIds = drag.origPositions ? Object.keys(drag.origPositions) : [drag.id];

        if (movingIds.length > 1) {
          const movingRects = prev
            .filter((item) => Boolean(drag.origPositions?.[item.id]) && !item.locked)
            .map((item) => {
              const orig = drag.origPositions![item.id];
              return {
                id: item.id,
                x: orig.x,
                y: orig.y,
                width: item.width,
                height: item.height,
              };
            });
          const topOthers = cachedTopSnap
            ? cachedTopSnap.others
            : extractOtherSnapRects(prev, new Set(movingIds));
          const mSnap = computeMultiSelectMoveDelta({
            movingRects,
            dx,
            dy,
            canvasWidth: env.canvasWidth,
            canvasHeight: env.canvasHeight,
            others: topOthers,
            guides: env.guides,
            magneticSnap: env.magneticSnap,
            zoom: env.zoom,
            cachedTargets: cachedTopSnap,
          });
          nextSnapLines = mSnap.lines;
          nextSpacingBadges = mSnap.spacing;
          return prev.map((item) => {
            if (!drag.origPositions?.[item.id] || item.locked) return item;
            const orig = drag.origPositions[item.id];
            return {
              ...item,
              x: Math.max(0, Math.min(env.canvasWidth - item.width, orig.x + mSnap.dx)),
              y: Math.max(0, Math.min(env.canvasHeight - item.height, orig.y + mSnap.dy)),
            };
          });
        }
      }

      const activeParent =
        drag.isChild && drag.parentId ? prev.find((p) => p.id === drag.parentId) : null;

      return prev.map((el) => {
        if (drag.isChild && activeParent && el.id === activeParent.id && drag.mode === 'move') {
          if (el.containerLayout !== 'freeform_offset') {
            return { ...el, containerLayout: 'freeform_offset' };
          }
          return el;
        }
        if (el.id !== drag.id) return el;

        if (drag.mode === 'rotate') {
          const nextRot = Math.max(-180, Math.min(180, Math.round(drag.origRot + dx * 0.6)));
          return { ...el, rotation: nextRot };
        }

        if (drag.mode === 'move') {
          if (drag.isChild && activeParent) {
            const w = el.childCustomWidth || el.width;
            const h = el.childCustomHeight || el.height;
            const { bL, bT, innerW, innerH } = getInnerBoxGeometry(activeParent);
            const startAbsX = drag.origAbsInParentX ?? drag.origX;
            const startAbsY = drag.origAbsInParentY ?? drag.origY;
            const absX = Math.max(0, Math.min(Math.max(0, innerW - w), startAbsX + dx));
            const absY = Math.max(0, Math.min(Math.max(0, innerH - h), startAbsY + dy));

            let targetPaneIdx = el.parentPaneIndex ?? 0;
            const activeSplit = (activeParent.modifiers || []).find(
              (m): m is SplitModifier => m.kind === 'split' && m.enabled
            );
            if (activeSplit) {
              const midPct =
                activeSplit.axis === 'vertical'
                  ? ((absX + w / 2) / Math.max(1, innerW)) * 100
                  : ((absY + h / 2) / Math.max(1, innerH)) * 100;
              const r1 = activeSplit.ratio;
              const r2 = activeSplit.panes === 3 ? (activeSplit.ratio2 ?? 33) : 100 - r1;
              if (midPct > r1 + r2 && activeSplit.panes === 3) targetPaneIdx = 2;
              else if (midPct > r1) targetPaneIdx = 1;
              else targetPaneIdx = 0;
            } else {
              targetPaneIdx = 0;
            }

            const pRect = getSplitPaneGeometry(activeParent, targetPaneIdx);
            let paneCache: SnapTargetCache | undefined;
            if (snapCacheRef.current?.kind === 'child') {
              paneCache = snapCacheRef.current.paneCaches.get(targetPaneIdx);
              if (!paneCache) {
                const paneOthers = extractOtherSnapRects(
                  prev,
                  new Set([el.id]),
                  activeParent.id,
                  targetPaneIdx
                );
                paneCache = buildSnapTargetCache({
                  others: paneOthers,
                  guides: [],
                  canvasWidth: pRect.paneW,
                  canvasHeight: pRect.paneH,
                  zoom: env.zoom,
                });
                snapCacheRef.current.paneCaches.set(targetPaneIdx, paneCache);
              }
            }
            const paneOthers = paneCache
              ? paneCache.others
              : extractOtherSnapRects(prev, new Set([el.id]), activeParent.id, targetPaneIdx);
            const snap = computeSmartMoveSnap({
              rawX: absX - pRect.paneX,
              rawY: absY - pRect.paneY,
              width: w,
              height: h,
              canvasWidth: pRect.paneW,
              canvasHeight: pRect.paneH,
              others: paneOthers,
              guides: [],
              magneticSnap: env.magneticSnap,
              zoom: env.zoom,
              cachedTargets: paneCache,
            });
            const parentOrigin = getElementCanvasOrigin(activeParent, prev);
            nextSnapLines = snap.lines.map((line) => ({
              ...line,
              pos:
                line.axis === 'x'
                  ? parentOrigin.x + bL + pRect.paneX + line.pos
                  : parentOrigin.y + bT + pRect.paneY + line.pos,
            }));
            nextSpacingBadges = snap.spacing.map((badge) => ({
              ...badge,
              x: parentOrigin.x + bL + pRect.paneX + badge.x,
              y: parentOrigin.y + bT + pRect.paneY + badge.y,
            }));

            return {
              ...el,
              parentPaneIndex: targetPaneIdx,
              childOffsetX: Math.max(0, snap.x),
              childOffsetY: Math.max(0, snap.y),
              x: Math.max(0, snap.x),
              y: Math.max(0, snap.y),
            };
          }

          const topOthers = cachedTopSnap
            ? cachedTopSnap.others
            : extractOtherSnapRects(prev, new Set([el.id]));
          const snap = computeSmartMoveSnap({
            rawX: drag.origX + dx,
            rawY: drag.origY + dy,
            width: el.width,
            height: el.height,
            canvasWidth: env.canvasWidth,
            canvasHeight: env.canvasHeight,
            others: topOthers,
            guides: env.guides,
            magneticSnap: env.magneticSnap,
            zoom: env.zoom,
            cachedTargets: cachedTopSnap,
          });
          nextSnapLines = snap.lines;
          nextSpacingBadges = snap.spacing;
          return { ...el, x: snap.x, y: snap.y };
        }

        const dir = drag.resizeDir || 'se';
        const minResizeW = el.type === 'pure_line' ? 16 : 24;
        const minResizeH = el.type === 'pure_line' ? 8 : 20;
        const rotDeg = drag.origRot || 0;
        const isRotated = Math.abs(rotDeg % 360) > 0.001;

        if (drag.isChild && activeParent) {
          const paneIdx = el.parentPaneIndex ?? 0;
          const pRect = getSplitPaneGeometry(activeParent, paneIdx);
          if (isRotated) {
            const nextRect = computeRotatedResizeRect({
              dir,
              origX: drag.origX,
              origY: drag.origY,
              origW: drag.origW,
              origH: drag.origH,
              rotationDeg: rotDeg,
              dx,
              dy,
              minW: minResizeW,
              minH: minResizeH,
              canvasWidth: pRect.paneW,
              canvasHeight: pRect.paneH,
            });
            const clampedX = Math.max(
              0,
              Math.min(Math.max(0, pRect.paneW - nextRect.width), nextRect.x)
            );
            const clampedY = Math.max(
              0,
              Math.min(Math.max(0, pRect.paneH - nextRect.height), nextRect.y)
            );
            nextSnapLines = [];
            return {
              ...el,
              childOffsetX: clampedX,
              childOffsetY: clampedY,
              childCustomWidth: nextRect.width,
              childCustomHeight: nextRect.height,
              width: nextRect.width,
              height: nextRect.height,
            };
          }

          let paneCache: SnapTargetCache | undefined;
          if (snapCacheRef.current?.kind === 'child') {
            paneCache = snapCacheRef.current.paneCaches.get(paneIdx);
            if (!paneCache) {
              const paneOthers = extractOtherSnapRects(
                prev,
                new Set([el.id]),
                activeParent.id,
                paneIdx
              );
              paneCache = buildSnapTargetCache({
                others: paneOthers,
                guides: [],
                canvasWidth: pRect.paneW,
                canvasHeight: pRect.paneH,
                zoom: env.zoom,
              });
              snapCacheRef.current.paneCaches.set(paneIdx, paneCache);
            }
          }
          const paneOthers = paneCache
            ? paneCache.others
            : extractOtherSnapRects(prev, new Set([el.id]), activeParent.id, paneIdx);
          const { bL, bT } = getInnerBoxGeometry(activeParent);
          const rSnap = computeSmartResizeSnap({
            dir,
            origX: drag.origX,
            origY: drag.origY,
            origW: drag.origW,
            origH: drag.origH,
            dx,
            dy,
            minW: minResizeW,
            minH: minResizeH,
            canvasWidth: pRect.paneW,
            canvasHeight: pRect.paneH,
            others: paneOthers,
            guides: [],
            magneticSnap: env.magneticSnap,
            zoom: env.zoom,
            cachedTargets: paneCache,
          });
          const finalW = Math.min(rSnap.width, Math.max(minResizeW, pRect.paneW - rSnap.x));
          const finalH = Math.min(rSnap.height, Math.max(minResizeH, pRect.paneH - rSnap.y));
          const parentOrigin = getElementCanvasOrigin(activeParent, prev);
          nextSnapLines = rSnap.lines.map((line) => ({
            ...line,
            pos:
              line.axis === 'x'
                ? parentOrigin.x + bL + pRect.paneX + line.pos
                : parentOrigin.y + bT + pRect.paneY + line.pos,
          }));
          return {
            ...el,
            childOffsetX: rSnap.x,
            childOffsetY: rSnap.y,
            childCustomWidth: finalW,
            childCustomHeight: finalH,
            width: finalW,
            height: finalH,
          };
        }

        if (isRotated) {
          const nextRect = computeRotatedResizeRect({
            dir,
            origX: drag.origX,
            origY: drag.origY,
            origW: drag.origW,
            origH: drag.origH,
            rotationDeg: rotDeg,
            dx,
            dy,
            minW: minResizeW,
            minH: minResizeH,
            canvasWidth: env.canvasWidth,
            canvasHeight: env.canvasHeight,
          });
          const clampedX = Math.max(
            0,
            Math.min(Math.max(0, env.canvasWidth - nextRect.width), nextRect.x)
          );
          const clampedY = Math.max(
            0,
            Math.min(Math.max(0, env.canvasHeight - nextRect.height), nextRect.y)
          );
          nextSnapLines = [];
          return {
            ...el,
            x: clampedX,
            y: clampedY,
            width: nextRect.width,
            height: nextRect.height,
          };
        }

        const topOthers = cachedTopSnap
          ? cachedTopSnap.others
          : extractOtherSnapRects(prev, new Set([el.id]));
        const rSnap = computeSmartResizeSnap({
          dir,
          origX: drag.origX,
          origY: drag.origY,
          origW: drag.origW,
          origH: drag.origH,
          dx,
          dy,
          minW: minResizeW,
          minH: minResizeH,
          canvasWidth: env.canvasWidth,
          canvasHeight: env.canvasHeight,
          others: topOthers,
          guides: env.guides,
          magneticSnap: env.magneticSnap,
          zoom: env.zoom,
          cachedTargets: cachedTopSnap,
        });
        nextSnapLines = rSnap.lines;

        return {
          ...el,
          x: rSnap.x,
          y: rSnap.y,
          width: rSnap.width,
          height: rSnap.height,
        };
      });
    });

    setSnapLines(nextSnapLines);
    setSpacingBadges(nextSpacingBadges);
  }, [
    elementsRef,
    setDrawMarquee,
    setDropTargetContainerId,
    setGuideDragState,
    setMarqueeSelect,
    setSnapLines,
    setSpacingBadges,
  ]);

  const handlePointerMove = useCallback(
    (e: React.PointerEvent) => {
      pendingMoveRef.current = {
        clientX: e.clientX,
        clientY: e.clientY,
        shiftKey: e.shiftKey,
        altKey: e.altKey,
      };
      if (moveRafRef.current !== null) return;
      moveRafRef.current = window.requestAnimationFrame(() => {
        moveRafRef.current = null;
        flushPendingMove();
      });
    },
    [flushPendingMove]
  );

  const clearScheduledMove = useCallback(() => {
    if (moveRafRef.current !== null) {
      window.cancelAnimationFrame(moveRafRef.current);
      moveRafRef.current = null;
    }
    pendingMoveRef.current = null;
  }, []);

  const cancelActiveGesture = useCallback((): boolean => {
    clearScheduledMove();
    const activeGestureObj: object | null =
      guideDragRef.current ||
      panelResizeDragRef.current ||
      panDragRef.current ||
      marqueeSelectRef.current ||
      splitDragRef.current ||
      drawMarqueeRef.current ||
      dragStateRef.current;
    if (!activeGestureObj || lastSettledGestureRef.current === activeGestureObj) {
      return false;
    }
    lastSettledGestureRef.current = activeGestureObj;
    releaseCapturedPointer();

    if ((dragStateRef.current || splitDragRef.current) && preGestureElementsRef.current) {
      replaceElementsTransient(preGestureElementsRef.current);
    }

    snapCacheRef.current = null;
    preGestureElementsRef.current = null;
    didMoveDuringDragRef.current = false;
    panDragMovedRef.current = false;
    setDragState(null);
    setSplitDragState(null);
    setDrawMarquee(null);
    setMarqueeSelect(null);
    setGuideDragState(null);
    setPanelResizeDrag(null);
    setPanDrag(null);
    setDropTargetContainerId(null);
    setSnapLines([]);
    setSpacingBadges([]);
    return true;
  }, [
    clearScheduledMove,
    releaseCapturedPointer,
    replaceElementsTransient,
    setDragState,
    setDrawMarquee,
    setDropTargetContainerId,
    setGuideDragState,
    setMarqueeSelect,
    setPanDrag,
    setPanelResizeDrag,
    setSnapLines,
    setSpacingBadges,
    setSplitDragState,
  ]);

  const handlePointerUp = useCallback(() => {
    if (moveRafRef.current !== null) {
      window.cancelAnimationFrame(moveRafRef.current);
      moveRafRef.current = null;
    }
    if (pendingMoveRef.current) {
      flushPendingMove();
    }

    const activeGuide = guideDragRef.current;
    const activePanel = panelResizeDragRef.current;
    const activePan = panDragRef.current;
    const activeMarquee = marqueeSelectRef.current;
    const activeSplitDrag = splitDragRef.current;
    const activeDraw = drawMarqueeRef.current;
    const activeDrag = dragStateRef.current;

    const activeGestureObj: object | null =
      activeGuide ||
      activePanel ||
      activePan ||
      activeMarquee ||
      activeSplitDrag ||
      activeDraw ||
      activeDrag;
    if (!activeGestureObj || lastSettledGestureRef.current === activeGestureObj) {
      return;
    }
    lastSettledGestureRef.current = activeGestureObj;
    releaseCapturedPointer();
    snapCacheRef.current = null;

    if (activeGuide) {
      const maxExtent = activeGuide.axis === 'x' ? canvasWidth : canvasHeight;
      if (activeGuide.pos >= 0 && activeGuide.pos <= maxExtent) {
        onChangeGuides((prev) => {
          const exists = prev.some((g) => g.id === activeGuide.id);
          if (exists) {
            return prev.map((g) => (g.id === activeGuide.id ? { ...g, pos: activeGuide.pos } : g));
          }
          return [...prev, { id: activeGuide.id, axis: activeGuide.axis, pos: activeGuide.pos }];
        });
      } else if (!activeGuide.isNew) {
        onChangeGuides((prev) => prev.filter((g) => g.id !== activeGuide.id));
      }
      setGuideDragState(null);
      return;
    }

    if (activePanel) {
      setPanelResizeDrag(null);
      return;
    }

    if (activePan) {
      const didPanMove = activePan.moved || panDragMovedRef.current;
      panDragMovedRef.current = false;
      if (!didPanMove && activePan.fromEmptyClick) {
        setSelectedId(null);
        setSelectedIds([]);
        setInlineEditId(null);
      }
      setPanDrag(null);
      return;
    }

    if (activeMarquee) {
      const minX = Math.min(activeMarquee.startX, activeMarquee.curX);
      const maxX = Math.max(activeMarquee.startX, activeMarquee.curX);
      const minY = Math.min(activeMarquee.startY, activeMarquee.curY);
      const maxY = Math.max(activeMarquee.startY, activeMarquee.curY);
      if (maxX - minX >= 4 || maxY - minY >= 4) {
        const hitIds = elementsRef.current
          .filter((el) => {
            if (el.parentId || el.hidden) return false;
            const box = getRotatedBoundingBox(el);
            return (
              box.x < maxX &&
              box.x + box.width > minX &&
              box.y < maxY &&
              box.y + box.height > minY
            );
          })
          .map((el) => el.id);
        setSelectedIds(hitIds);
        setSelectedId(hitIds[0] || null);
      } else {
        setSelectedId(null);
        setSelectedIds([]);
        setInlineEditId(null);
      }
      setMarqueeSelect(null);
      return;
    }

    if (activeSplitDrag) {
      if (didMoveDuringDragRef.current) {
        commitLatestElements();
      }
      preGestureElementsRef.current = null;
      didMoveDuringDragRef.current = false;
      setSplitDragState(null);
      return;
    }

    if (activeDraw) {
      const currentElements = elementsRef.current;
      const minX = Math.min(activeDraw.startX, activeDraw.curX);
      const minY = Math.min(activeDraw.startY, activeDraw.curY);
      const rawW = Math.abs(activeDraw.curX - activeDraw.startX);
      const rawH = Math.abs(activeDraw.curY - activeDraw.startY);
      const isClick = rawW < 10 && rawH < 10;

      const type: ElementType =
        canvasTool === 'draw_line'
          ? 'pure_line'
          : canvasTool === 'draw_ring'
          ? 'pure_ring'
          : 'pure_box';
      const preset = PURE_PRIMITIVE_DEFAULTS[type] || {};
      const finalW = isClick
        ? preset.width || 180
        : canvasTool === 'draw_line' && rawH > rawW * 1.4
        ? 16
        : Math.max(20, Math.round(rawW));
      const finalH = isClick
        ? preset.height || 100
        : canvasTool === 'draw_line' && rawW >= rawH
        ? 16
        : Math.max(12, Math.round(rawH));

      const id = createUniqueElementId('el', currentElements);
      const maxRow = currentElements.reduce((m, el) => Math.max(m, el.rowIndex), 0);
      let childOverrides: Partial<DesignElement> = {};
      let nextElements = currentElements;
      if (editingContainer) {
        const origin = getElementCanvasOrigin(editingContainer, currentElements);
        const resolved = resolvePointInContainer(
          editingContainer,
          minX,
          minY,
          finalW,
          finalH,
          origin.x,
          origin.y
        );
        childOverrides = {
          parentId: editingContainer.id,
          parentPaneIndex: resolved.paneIdx,
          childOffsetX: resolved.offsetX,
          childOffsetY: resolved.offsetY,
          x: resolved.offsetX,
          y: resolved.offsetY,
        };
        if (editingContainer.containerLayout !== 'freeform_offset') {
          nextElements = currentElements.map((item) =>
            item.id === editingContainer.id
              ? { ...item, containerLayout: 'freeform_offset' as const }
              : item
          );
        }
      }

      const drawnEl: DesignElement = {
        ...(preset as DesignElement),
        id,
        type,
        label: preset.label || 'Drawn Object',
        content: preset.content ?? '',
        subContent: preset.subContent ?? '',
        x: minX,
        y: minY,
        width: finalW,
        height: finalH,
        order: currentElements.length,
        rowIndex: maxRow + 1,
        colSpan: preset.colSpan || 6,
        zIndex: 10 + currentElements.length,
        opacity: 100,
        bgColor: preset.bgColor || '#FFFFFF',
        textColor: preset.textColor || '#1F2937',
        borderColor: preset.borderColor || '#18181B',
        borderWidth: preset.borderWidth ?? 1,
        borderRadius: preset.borderRadius ?? (type === 'pure_ring' ? 999 : 6),
        padding: preset.padding ?? 8,
        fontSize: preset.fontSize ?? 13,
        fontWeight: preset.fontWeight || 'medium',
        textAlign: preset.textAlign || 'center',
        shadow: 'none',
        hoverEffect: 'none',
        ...childOverrides,
      };
      commitElements([...nextElements, drawnEl]);
      setSelectedId(id);
      setSelectedIds([id]);
      setDrawMarquee(null);
      setCanvasTool('select');
      return;
    }

    if (activeDrag) {
      const currentElements = elementsRef.current;
      const activeDropTargetId = dropTargetContainerIdRef.current;
      if (activeDropTargetId && !activeDrag.isChild) {
        const parent = currentElements.find((e) => e.id === activeDropTargetId);
        const dragged = currentElements.find((e) => e.id === activeDrag.id);
        if (parent && dragged && !parent.locked && !dragged.locked) {
          const parentOrigin = getElementCanvasOrigin(parent, currentElements);
          const cw = dragged.childCustomWidth || dragged.width;
          const ch = dragged.childCustomHeight || dragged.height;
          const resolved = resolvePointInContainer(
            parent,
            dragged.x,
            dragged.y,
            cw,
            ch,
            parentOrigin.x,
            parentOrigin.y
          );
          const nested = currentElements.map((item) => {
            if (item.id === parent.id && item.containerLayout !== 'freeform_offset') {
              return { ...item, containerLayout: 'freeform_offset' as const };
            }
            if (item.id === dragged.id) {
              return {
                ...item,
                parentId: parent.id,
                parentPaneIndex: resolved.paneIdx,
                childOffsetX: resolved.offsetX,
                childOffsetY: resolved.offsetY,
                x: resolved.offsetX,
                y: resolved.offsetY,
              };
            }
            return item;
          });
          commitElements(nested);
          preGestureElementsRef.current = null;
          didMoveDuringDragRef.current = false;
          setDropTargetContainerId(null);
          setDragState(null);
          setSnapLines([]);
          setSpacingBadges([]);
          return;
        }
      }
      if (didMoveDuringDragRef.current) {
        commitLatestElements();
      } else if (activeDrag.wasAlreadyMultiSelected) {
        setSelectedId(activeDrag.id);
        setSelectedIds([activeDrag.id]);
      }
      preGestureElementsRef.current = null;
      didMoveDuringDragRef.current = false;
      setDropTargetContainerId(null);
      setDragState(null);
      setSnapLines([]);
      setSpacingBadges([]);
    }
  }, [
    canvasHeight,
    canvasTool,
    canvasWidth,
    commitElements,
    commitLatestElements,
    editingContainer,
    elementsRef,
    flushPendingMove,
    onChangeGuides,
    releaseCapturedPointer,
    setCanvasTool,
    setDragState,
    setDrawMarquee,
    setDropTargetContainerId,
    setGuideDragState,
    setInlineEditId,
    setMarqueeSelect,
    setPanDrag,
    setPanelResizeDrag,
    setSelectedId,
    setSelectedIds,
    setSnapLines,
    setSpacingBadges,
    setSplitDragState,
  ]);

  useEffect(() => {
    return () => {
      clearScheduledMove();
    };
  }, [clearScheduledMove]);

  useEffect(() => {
    if (
      !panelResizeDrag &&
      !panDrag &&
      !marqueeSelect &&
      !dragState &&
      !drawMarquee &&
      !splitDragState &&
      !guideDragState
    ) {
      return;
    }
    const onWinUp = () => handlePointerUp();
    const onWinBlur = () => {
      cancelActiveGesture();
    };
    window.addEventListener('pointerup', onWinUp);
    window.addEventListener('blur', onWinBlur);
    return () => {
      window.removeEventListener('pointerup', onWinUp);
      window.removeEventListener('blur', onWinBlur);
    };
  }, [
    cancelActiveGesture,
    dragState,
    drawMarquee,
    guideDragState,
    handlePointerUp,
    marqueeSelect,
    panDrag,
    panelResizeDrag,
    splitDragState,
  ]);

  return {
    dragState,
    marqueeSelect,
    setMarqueeSelect,
    drawMarquee,
    setDrawMarquee,
    splitDragState,
    setSplitDragState,
    dropTargetContainerId,
    snapLines,
    spacingBadges,
    guideDragState,
    startGuideDrag,
    panelResizeDrag,
    setPanelResizeDrag,
    handlePointerDown,
    handlePointerMove,
    handlePointerUp,
    cancelActiveGesture,
  };
}
