import { useCallback, useEffect, useState } from 'react';
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
import { getInnerBoxGeometry, getSplitPaneGeometry } from '../utils/canvasGeometry';
import {
  computeSmartMoveSnap,
  computeSmartResizeSnap,
  extractOtherSnapRects,
} from '../utils/snapGeometry';
import { PanDragState } from './useViewportNavigation';

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

const SNAP_GRID = 4;

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
  setCursorCoords: (pos: { x: number; y: number }) => void;
  setCursorInViewport: (inside: boolean) => void;
  clientToCanvas: (clientX: number, clientY: number) => { x: number; y: number };
  canvasViewportRef: React.RefObject<HTMLDivElement | null>;
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
  setCursorCoords,
  setCursorInViewport,
  clientToCanvas,
  canvasViewportRef,
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
  const [dragState, setDragState] = useState<DragState | null>(null);
  const [marqueeSelect, setMarqueeSelect] = useState<MarqueeRect | null>(null);
  const [drawMarquee, setDrawMarquee] = useState<MarqueeRect | null>(null);
  const [splitDragState, setSplitDragState] = useState<SplitDragState | null>(null);
  const [dropTargetContainerId, setDropTargetContainerId] = useState<string | null>(null);
  const [snapLines, setSnapLines] = useState<SnapGuideLine[]>([]);
  const [spacingBadges, setSpacingBadges] = useState<SnapDistanceBadge[]>([]);
  const [guideDragState, setGuideDragState] = useState<GuideDragState | null>(null);
  const [panelResizeDrag, setPanelResizeDrag] = useState<PanelResizeDragState | null>(null);

  const startGuideDrag = useCallback(
    (axis: 'x' | 'y', clientX: number, clientY: number, existingGuide?: CanvasGuide) => {
      const pos = clientToCanvas(clientX, clientY);
      const rawCoord = axis === 'x' ? Math.round(pos.x) : Math.round(pos.y);
      setGuideDragState({
        id: existingGuide?.id || `guide-${Date.now().toString().slice(-5)}`,
        axis,
        pos: rawCoord,
        isNew: !existingGuide,
      });
    },
    [clientToCanvas]
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

      if (!selectedIds.includes(el.id)) {
        setSelectedId(el.id);
        setSelectedIds([el.id]);
      } else {
        setSelectedId(el.id);
      }

      if (el.locked) return;
      if (layoutMode === 'block' || inlineEditId === el.id) return;
      (e.target as HTMLElement).setPointerCapture(e.pointerId);

      const currentSelected = selectedIds.includes(el.id) ? selectedIds : [el.id];
      const posMap: Record<string, { x: number; y: number }> = {};
      elements.forEach((item) => {
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
        const p = elements.find((item) => item.id === el.parentId);
        if (p) {
          const pRect = getSplitPaneGeometry(p, el.parentPaneIndex ?? 0);
          origAbsInParentX = pRect.paneX + effectiveX;
          origAbsInParentY = pRect.paneY + effectiveY;
        }
      }

      setDragState({
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
      });
    },
    [
      elements,
      inlineEditId,
      isSpacePressed,
      layoutMode,
      selectedIds,
      setSelectedId,
      setSelectedIds,
    ]
  );

  const handlePointerMove = useCallback(
    (e: React.PointerEvent) => {
      if (panelResizeDrag) {
        const vw = typeof window !== 'undefined' ? window.innerWidth : 1380;
        const vh = typeof window !== 'undefined' ? window.innerHeight : 860;
        const maxLeft = Math.max(200, Math.min(520, vw - 520));
        const maxRight = Math.max(240, Math.min(620, vw - 520));
        const maxBottom = Math.max(140, Math.min(520, vh - 260));
        if (panelResizeDrag.target === 'left') {
          const nextW = Math.round(panelResizeDrag.origValue + (e.clientX - panelResizeDrag.startX));
          setLeftPanelWidth(Math.max(190, Math.min(maxLeft, nextW)));
        } else if (panelResizeDrag.target === 'right') {
          const nextW = Math.round(panelResizeDrag.origValue + (panelResizeDrag.startX - e.clientX));
          setRightPanelWidth(Math.max(220, Math.min(maxRight, nextW)));
        } else if (panelResizeDrag.target === 'bottom') {
          const nextH = Math.round(panelResizeDrag.origValue + (panelResizeDrag.startY - e.clientY));
          setBottomDockHeight(Math.max(140, Math.min(maxBottom, nextH)));
        } else if (panelResizeDrag.target === 'left_split') {
          const splitRect = leftSplitContainerRef.current?.getBoundingClientRect();
          const totalH = Math.max(240, splitRect?.height || 640);
          const dyPct = ((e.clientY - panelResizeDrag.startY) / totalH) * 100;
          setLeftLibraryPct(Math.max(22, Math.min(80, Math.round(panelResizeDrag.origValue + dyPct))));
        }
        return;
      }

      if (guideDragState) {
        const pos = clientToCanvas(e.clientX, e.clientY);
        const coord = guideDragState.axis === 'x' ? Math.round(pos.x) : Math.round(pos.y);
        setCursorCoords(pos);
        setGuideDragState((prev) => (prev ? { ...prev, pos: coord } : null));
        return;
      }

      if (panDrag) {
        const rawDx = e.clientX - panDrag.startClientX;
        const rawDy = e.clientY - panDrag.startClientY;
        if (!panDrag.moved && Math.hypot(rawDx, rawDy) > 3) {
          setPanDrag((prev) => (prev ? { ...prev, moved: true } : null));
        }
        setPanOffset(clampPan(panDrag.origPanX + rawDx, panDrag.origPanY + rawDy, zoom));
        return;
      }

      if (canvasViewportRef.current) {
        const vpRect = canvasViewportRef.current.getBoundingClientRect();
        const insideVp =
          e.clientX >= vpRect.left &&
          e.clientX <= vpRect.right &&
          e.clientY >= vpRect.top &&
          e.clientY <= vpRect.bottom;
        setCursorInViewport(insideVp);
        const pos = clientToCanvas(e.clientX, e.clientY);
        if (insideVp || marqueeSelect || drawMarquee || dragState) {
          setCursorCoords(pos);
        }
        if (marqueeSelect) {
          setMarqueeSelect((prev) => (prev ? { ...prev, curX: pos.x, curY: pos.y } : null));
          return;
        }
        if (drawMarquee) {
          const cx = Math.max(0, Math.min(canvasWidth, pos.x));
          const cy = Math.max(0, Math.min(canvasHeight, pos.y));
          setDrawMarquee((prev) => (prev ? { ...prev, curX: cx, curY: cy } : null));
          return;
        }
      }

      if (splitDragState) {
        const { elementId, modifierId, axis, boxLeftPx, boxTopPx, boxW, boxH } = splitDragState;
        const pct =
          axis === 'vertical'
            ? ((e.clientX - boxLeftPx) / Math.max(20, boxW)) * 100
            : ((e.clientY - boxTopPx) / Math.max(20, boxH)) * 100;
        const clamped = Math.max(15, Math.min(85, Math.round(pct)));
        replaceElementsTransient((prev) =>
          prev.map((item) => {
            if (item.id !== elementId || !item.modifiers) return item;
            return {
              ...item,
              modifiers: item.modifiers.map((m) =>
                m.id === modifierId && m.kind === 'split' ? { ...m, ratio: clamped } : m
              ),
            };
          })
        );
        return;
      }

      if (!dragState) return;
      const dx = (e.clientX - dragState.startX) / zoom;
      const dy = (e.clientY - dragState.startY) / zoom;

      let nextSnapLines: SnapGuideLine[] = [];
      let nextSpacingBadges: SnapDistanceBadge[] = [];

      // Detect Drag-to-Nest container candidate
      if (
        dragState.mode === 'move' &&
        !dragState.isChild &&
        (!dragState.origPositions || Object.keys(dragState.origPositions).length <= 1)
      ) {
        const movingEl = elementsRef.current.find((item) => item.id === dragState.id);
        const wantsNest = (autoNestDrop && !e.shiftKey) || e.altKey;
        if (movingEl && wantsNest) {
          const curX = Math.max(0, Math.min(canvasWidth - movingEl.width, dragState.origX + dx));
          const curY = Math.max(0, Math.min(canvasHeight - movingEl.height, dragState.origY + dy));
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

      replaceElementsTransient((prev) => {
        if (dragState.mode === 'move' && !dragState.isChild) {
          const movingIds = dragState.origPositions
            ? Object.keys(dragState.origPositions)
            : [dragState.id];

          if (movingIds.length > 1) {
            const snappedDx = Math.round(dx / SNAP_GRID) * SNAP_GRID;
            const snappedDy = Math.round(dy / SNAP_GRID) * SNAP_GRID;
            return prev.map((item) => {
              if (!dragState.origPositions?.[item.id] || item.locked) return item;
              const orig = dragState.origPositions[item.id];
              return {
                ...item,
                x: Math.max(0, Math.min(canvasWidth - item.width, orig.x + snappedDx)),
                y: Math.max(0, Math.min(canvasHeight - item.height, orig.y + snappedDy)),
              };
            });
          }
        }

        const activeParent =
          dragState.isChild && dragState.parentId
            ? prev.find((p) => p.id === dragState.parentId)
            : null;

        return prev.map((el) => {
          if (dragState.isChild && activeParent && el.id === activeParent.id && dragState.mode === 'move') {
            if (el.containerLayout !== 'freeform_offset') {
              return { ...el, containerLayout: 'freeform_offset' };
            }
            return el;
          }
          if (el.id !== dragState.id) return el;

          if (dragState.mode === 'rotate') {
            const nextRot = Math.max(-180, Math.min(180, Math.round(dragState.origRot + dx * 0.6)));
            return { ...el, rotation: nextRot };
          }

          if (dragState.mode === 'move') {
            if (dragState.isChild && activeParent) {
              const w = el.childCustomWidth || el.width;
              const h = el.childCustomHeight || el.height;
              const { bL, bT, innerW, innerH } = getInnerBoxGeometry(activeParent);
              const startAbsX = dragState.origAbsInParentX ?? dragState.origX;
              const startAbsY = dragState.origAbsInParentY ?? dragState.origY;
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
              const paneOthers = extractOtherSnapRects(
                prev,
                new Set([el.id]),
                activeParent.id,
                targetPaneIdx
              );
              const snap = computeSmartMoveSnap({
                rawX: absX - pRect.paneX,
                rawY: absY - pRect.paneY,
                width: w,
                height: h,
                canvasWidth: pRect.paneW,
                canvasHeight: pRect.paneH,
                others: paneOthers,
                guides: [],
                magneticSnap,
              });
              nextSnapLines = snap.lines.map((line) => ({
                ...line,
                pos:
                  line.axis === 'x'
                    ? activeParent.x + bL + pRect.paneX + line.pos
                    : activeParent.y + bT + pRect.paneY + line.pos,
              }));
              nextSpacingBadges = snap.spacing.map((badge) => ({
                ...badge,
                x: activeParent.x + bL + pRect.paneX + badge.x,
                y: activeParent.y + bT + pRect.paneY + badge.y,
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

            const topOthers = extractOtherSnapRects(prev, new Set([el.id]));
            const snap = computeSmartMoveSnap({
              rawX: dragState.origX + dx,
              rawY: dragState.origY + dy,
              width: el.width,
              height: el.height,
              canvasWidth,
              canvasHeight,
              others: topOthers,
              guides,
              magneticSnap,
            });
            nextSnapLines = snap.lines;
            nextSpacingBadges = snap.spacing;
            return { ...el, x: snap.x, y: snap.y };
          }

          const dir = dragState.resizeDir || 'se';
          const minResizeW = el.type === 'pure_line' ? 16 : 24;
          const minResizeH = el.type === 'pure_line' ? 8 : 20;

          if (dragState.isChild && activeParent) {
            const pRect = getSplitPaneGeometry(activeParent, el.parentPaneIndex ?? 0);
            const paneOthers = extractOtherSnapRects(
              prev,
              new Set([el.id]),
              activeParent.id,
              el.parentPaneIndex ?? 0
            );
            const { bL, bT } = getInnerBoxGeometry(activeParent);
            const rSnap = computeSmartResizeSnap({
              dir,
              origX: dragState.origX,
              origY: dragState.origY,
              origW: dragState.origW,
              origH: dragState.origH,
              dx,
              dy,
              minW: minResizeW,
              minH: minResizeH,
              canvasWidth: pRect.paneW,
              canvasHeight: pRect.paneH,
              others: paneOthers,
              guides: [],
              magneticSnap,
            });
            const finalW = Math.min(rSnap.width, Math.max(minResizeW, pRect.paneW - rSnap.x));
            const finalH = Math.min(rSnap.height, Math.max(minResizeH, pRect.paneH - rSnap.y));
            nextSnapLines = rSnap.lines.map((line) => ({
              ...line,
              pos:
                line.axis === 'x'
                  ? activeParent.x + bL + pRect.paneX + line.pos
                  : activeParent.y + bT + pRect.paneY + line.pos,
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

          const topOthers = extractOtherSnapRects(prev, new Set([el.id]));
          const rSnap = computeSmartResizeSnap({
            dir,
            origX: dragState.origX,
            origY: dragState.origY,
            origW: dragState.origW,
            origH: dragState.origH,
            dx,
            dy,
            minW: minResizeW,
            minH: minResizeH,
            canvasWidth,
            canvasHeight,
            others: topOthers,
            guides,
            magneticSnap,
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
    },
    [
      autoNestDrop,
      canvasHeight,
      canvasViewportRef,
      canvasWidth,
      clampPan,
      clientToCanvas,
      dragState,
      drawMarquee,
      elementsRef,
      guideDragState,
      guides,
      leftSplitContainerRef,
      magneticSnap,
      marqueeSelect,
      panDrag,
      panelResizeDrag,
      replaceElementsTransient,
      setBottomDockHeight,
      setCursorCoords,
      setCursorInViewport,
      setLeftLibraryPct,
      setLeftPanelWidth,
      setPanDrag,
      setPanOffset,
      setRightPanelWidth,
      splitDragState,
      zoom,
    ]
  );

  const handlePointerUp = useCallback(() => {
    if (guideDragState) {
      const maxExtent = guideDragState.axis === 'x' ? canvasWidth : canvasHeight;
      if (guideDragState.pos >= 0 && guideDragState.pos <= maxExtent) {
        onChangeGuides((prev) => {
          const exists = prev.some((g) => g.id === guideDragState.id);
          if (exists) {
            return prev.map((g) =>
              g.id === guideDragState.id ? { ...g, pos: guideDragState.pos } : g
            );
          }
          return [
            ...prev,
            { id: guideDragState.id, axis: guideDragState.axis, pos: guideDragState.pos },
          ];
        });
      } else if (!guideDragState.isNew) {
        onChangeGuides((prev) => prev.filter((g) => g.id !== guideDragState.id));
      }
      setGuideDragState(null);
      return;
    }

    if (panelResizeDrag) {
      setPanelResizeDrag(null);
      return;
    }

    if (panDrag) {
      if (!panDrag.moved && panDrag.fromEmptyClick) {
        setSelectedId(null);
        setSelectedIds([]);
        setInlineEditId(null);
      }
      setPanDrag(null);
      return;
    }

    if (marqueeSelect) {
      const minX = Math.min(marqueeSelect.startX, marqueeSelect.curX);
      const maxX = Math.max(marqueeSelect.startX, marqueeSelect.curX);
      const minY = Math.min(marqueeSelect.startY, marqueeSelect.curY);
      const maxY = Math.max(marqueeSelect.startY, marqueeSelect.curY);
      if (maxX - minX >= 4 || maxY - minY >= 4) {
        const hitIds = elementsRef.current
          .filter(
            (el) =>
              !el.parentId &&
              !el.hidden &&
              el.x < maxX &&
              el.x + el.width > minX &&
              el.y < maxY &&
              el.y + el.height > minY
          )
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

    if (splitDragState) {
      commitLatestElements();
      setSplitDragState(null);
      return;
    }

    if (drawMarquee) {
      const currentElements = elementsRef.current;
      const minX = Math.min(drawMarquee.startX, drawMarquee.curX);
      const minY = Math.min(drawMarquee.startY, drawMarquee.curY);
      const rawW = Math.abs(drawMarquee.curX - drawMarquee.startX);
      const rawH = Math.abs(drawMarquee.curY - drawMarquee.startY);
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

      const id = `el-${Date.now().toString().slice(-4)}`;
      const maxRow = currentElements.reduce((m, el) => Math.max(m, el.rowIndex), 0);
      let childOverrides: Partial<DesignElement> = {};
      let nextElements = currentElements;
      if (editingContainer) {
        const { bL, bT, innerW, innerH } = getInnerBoxGeometry(editingContainer);
        const rawRelX = Math.max(0, Math.round(minX - editingContainer.x - bL));
        const rawRelY = Math.max(0, Math.round(minY - editingContainer.y - bT));
        const clampedX = Math.max(0, Math.min(Math.max(0, innerW - finalW), rawRelX));
        const clampedY = Math.max(0, Math.min(Math.max(0, innerH - finalH), rawRelY));
        childOverrides = {
          parentId: editingContainer.id,
          parentPaneIndex: 0,
          childOffsetX: clampedX,
          childOffsetY: clampedY,
          x: clampedX,
          y: clampedY,
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

    if (dragState) {
      const currentElements = elementsRef.current;
      if (dropTargetContainerId && !dragState.isChild) {
        const parent = currentElements.find((e) => e.id === dropTargetContainerId);
        const dragged = currentElements.find((e) => e.id === dragState.id);
        if (parent && dragged) {
          const { bL, bT, innerW, innerH } = getInnerBoxGeometry(parent);
          const cw = dragged.childCustomWidth || dragged.width;
          const ch = dragged.childCustomHeight || dragged.height;
          const rawRelX = Math.round(dragged.x - parent.x - bL);
          const rawRelY = Math.round(dragged.y - parent.y - bT);
          let paneIdx = 0;
          const activeSplit = (parent.modifiers || []).find(
            (m): m is SplitModifier => m.kind === 'split' && m.enabled
          );
          if (activeSplit) {
            const midPct =
              activeSplit.axis === 'vertical'
                ? ((rawRelX + cw / 2) / Math.max(1, innerW)) * 100
                : ((rawRelY + ch / 2) / Math.max(1, innerH)) * 100;
            const r1 = activeSplit.ratio;
            const r2 = activeSplit.panes === 3 ? (activeSplit.ratio2 ?? 33) : 100 - r1;
            if (midPct > r1 + r2 && activeSplit.panes === 3) paneIdx = 2;
            else if (midPct > r1) paneIdx = 1;
          }
          const paneRect = getSplitPaneGeometry(parent, paneIdx);
          const paneRelX = Math.max(
            0,
            Math.min(Math.max(0, paneRect.paneW - cw), rawRelX - paneRect.paneX)
          );
          const paneRelY = Math.max(
            0,
            Math.min(Math.max(0, paneRect.paneH - ch), rawRelY - paneRect.paneY)
          );
          const nested = currentElements.map((item) => {
            if (item.id === parent.id && item.containerLayout !== 'freeform_offset') {
              return { ...item, containerLayout: 'freeform_offset' as const };
            }
            if (item.id === dragged.id) {
              return {
                ...item,
                parentId: parent.id,
                parentPaneIndex: paneIdx,
                childOffsetX: paneRelX,
                childOffsetY: paneRelY,
                x: paneRelX,
                y: paneRelY,
              };
            }
            return item;
          });
          commitElements(nested);
          setDropTargetContainerId(null);
          setDragState(null);
          setSnapLines([]);
          setSpacingBadges([]);
          return;
        }
      }
      commitLatestElements();
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
    dragState,
    drawMarquee,
    dropTargetContainerId,
    editingContainer,
    elementsRef,
    guideDragState,
    marqueeSelect,
    onChangeGuides,
    panDrag,
    panelResizeDrag,
    setCanvasTool,
    setInlineEditId,
    setPanDrag,
    setSelectedId,
    setSelectedIds,
    splitDragState,
  ]);

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
    window.addEventListener('pointerup', onWinUp);
    window.addEventListener('blur', onWinUp);
    return () => {
      window.removeEventListener('pointerup', onWinUp);
      window.removeEventListener('blur', onWinUp);
    };
  }, [dragState, drawMarquee, guideDragState, handlePointerUp, marqueeSelect, panDrag, panelResizeDrag, splitDragState]);

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
  };
}

