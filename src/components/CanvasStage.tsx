import React from 'react';
import {
  AlertTriangle,
  AlignCenter,
  AlignLeft,
  AlignRight,
  ArrowDown,
  ArrowLeftRight,
  ArrowUp,
  ArrowUpDown,
  Check,
  CircleDot,
  Code2,
  CornerUpLeft,
  Eye,
  EyeOff,
  Focus,
  FolderPlus,
  Hand,
  Link2,
  MousePointer,
  Minus,
  Scissors,
  Search,
  ShieldAlert,
  ShieldCheck,
  SplitSquareHorizontal,
  Square,
  Trash2,
  Type,
  X,
  ZoomIn,
  ZoomOut,
} from 'lucide-react';
import { CanvasElementItem } from './CanvasElementItem';
import { DynamicRulerCanvas } from './DynamicRulers';
import { BottomDock } from './BottomDock';
import { CANVAS_SIZE_PRESETS } from './inspector/BatchAndCanvasInspector';
import {
  CanvasContextMenu,
  CanvasContextMenuState,
  FloatingSelectionBar,
  SpotlightQuickAddModal,
} from './CanvasOverlays';
import { CuteThemeColors } from '../utils/studioSettings';
import { isPureContainerType } from '../data/purePrimitives';
import { SearchableCatalogItem, STATIC_CATALOG } from '../data/searchCatalog';
import {
  getElementF2UShieldReport,
  isSafeUrlValue,
} from '../engine/f2uShield';
import {
  getElementEffectiveLinkUrl,
  isFloatingCollageElement,
  renderInnerElementHTML,
  SolvedRow,
} from '../engine/layoutSolver';
import {
  CanvasDrawTool,
  DragState,
  GuideDragState,
  MarqueeRect,
  PanelResizeDragState,
  ResizeDir,
  SplitDragState,
} from '../hooks/useCanvasPointer';
import { CursorTracker, PanDragState } from '../hooks/useViewportNavigation';
import {
  BgPattern,
  CanvasGuide,
  CustomWidgetBlueprint,
  DesignElement,
  ElementType,
  ExportResult,
  LayoutMode,
  ModifierKind,
  PreviewSurface,
  PreviewViewport,
  SnapDistanceBadge,
  SnapGuideLine,
  SplitModifier,
  TargetPlatform,
  UiTheme,
} from '../types/schema';
import {
  getElementCanvasOrigin,
  getInnerBoxGeometry,
  getSplitPaneGeometry,
} from '../utils/canvasGeometry';
import { classifyPastedPayload } from '../utils/smartPaste';

const EMPTY_DESCENDANTS: ReadonlyArray<DesignElement> = [];

const CursorCoordsBadge = React.memo<{ cursorTracker: CursorTracker }>(({ cursorTracker }) => {
  const spanRef = React.useRef<HTMLSpanElement | null>(null);
  React.useEffect(() => {
    const update = (s: { x: number; y: number }) => {
      if (spanRef.current) {
        spanRef.current.textContent = `X:${s.x} Y:${s.y}`;
      }
    };
    update(cursorTracker.get());
    return cursorTracker.subscribe(update);
  }, [cursorTracker]);

  return (
    <span
      ref={spanRef}
      className="font-mono text-[10px] min-w-[78px] tabular-nums"
      style={{ color: 'var(--text-muted)' }}
    >
      X:0 Y:0
    </span>
  );
});

export interface CanvasStageProps {
  elements: DesignElement[];
  rootCanvasElements: DesignElement[];
  solvedRows: SolvedRow[];
  exportResult: ExportResult;
  layoutMode: LayoutMode;
  platform: TargetPlatform;
  uiTheme: UiTheme;
  cuteThemeColors?: CuteThemeColors;
  canvasWidth: number;
  canvasHeight: number;
  canvasBg: string;
  canvasPattern: BgPattern;
  effectiveCanvasHeight: number;
  viewportSize: { w: number; h: number };
  zoom: number;
  panOffset: { x: number; y: number };
  canvasScreenLeft: number;
  canvasScreenTop: number;
  cursorTracker: CursorTracker;
  isSpacePressed: boolean;
  panDrag: PanDragState | null;
  dragState: DragState | null;
  marqueeSelect: MarqueeRect | null;
  drawMarquee: MarqueeRect | null;
  dropTargetContainerId: string | null;
  snapLines: SnapGuideLine[];
  spacingBadges: SnapDistanceBadge[];
  guides: CanvasGuide[];
  guideDragState: GuideDragState | null;
  panelResizeDrag: PanelResizeDragState | null;
  canvasTool: CanvasDrawTool;
  magneticSnap: boolean;
  autoNestDrop: boolean;
  showHybridOverlay: boolean;
  editingContainer: DesignElement | null;
  editingChildren: DesignElement[];
  selectedElement: DesignElement | null;
  selectedId: string | null;
  selectedIds: string[];
  inlineEditId: string | null;
  activeCanvasTabs: Record<string, number>;
  bottomDockOpen: boolean;
  bottomDockTab: 'code' | 'preview';
  bottomDockHeight: number;
  previewSrcDoc: string;
  previewSurface: PreviewSurface;
  previewViewport: PreviewViewport;
  rightCollapsed: boolean;
  copied: boolean;
  swatches?: string[];
  showRulers?: boolean;
  showSpacingBadges?: boolean;
  customBlueprints?: CustomWidgetBlueprint[];
  spotlightOpen?: boolean;
  onToggleSpotlight?: (open: boolean) => void;
  onAddCatalogItemAtPosition?: (item: SearchableCatalogItem, x: number, y: number) => void;
  onDropImageFile?: (file: File, canvasX: number, canvasY: number) => void;
  onDropImageUrl?: (url: string, canvasX: number, canvasY: number) => void;
  onAdjustZIndex?: (delta: number) => void;
  onBringToFront?: () => void;
  onSendToBack?: () => void;
  onDuplicateSelected?: () => void;
  onToggleLock?: (id: string) => void;
  onToggleHide?: (id: string) => void;
  onUnlockAll?: () => void;
  onSelectAll?: () => void;
  onCopySelected?: () => void;
  onPasteAtPosition?: (x?: number, y?: number) => void;
  onCopyStyle?: () => void;
  onPasteStyle?: () => void;
  hasCopiedStyle?: boolean;
  hasClipboardElement?: boolean;
  onRotateSelected90?: () => void;
  onFlipSelected?: (axis: 'h' | 'v') => void;
  onPopOutFromContainer?: (childId: string) => void;
  onSaveSelectedAsBlueprint?: () => void;
  onUpdateElementById?: (id: string, patch: Partial<DesignElement>) => void;
  canvasRef: React.RefObject<HTMLDivElement>;
  canvasViewportRef: React.RefObject<HTMLDivElement>;
  canvasTransformRef: React.RefObject<HTMLDivElement>;
  onChangeCanvasWidth?: (w: number) => void;
  onChangeCanvasHeight?: (h: number) => void;
  onChangeCanvasBg: (bg: string) => void;
  onChangeCanvasPattern?: (pattern: BgPattern) => void;
  onToggleMagneticSnap: () => void;
  onChangeShowHybridOverlay: (v: boolean) => void;
  onChangeZoom: (z: number) => void;
  onZoomTo: (targetZoom: number, clientX?: number, clientY?: number) => void;
  onFitCanvasToView: () => void;
  onCenterCanvasView: () => void;
  onChangeCanvasTool: (tool: CanvasDrawTool) => void;
  onToggleAutoNestDrop: () => void;
  onExitContainerIsolation: (parentId: string) => void;
  onEnterContainerIsolation: (containerId: string) => void;
  onApplyQuickModifier: (kind: ModifierKind, overrides?: Record<string, unknown>) => void;
  onSetPanDrag: React.Dispatch<React.SetStateAction<PanDragState | null>>;
  onSetMarqueeSelect: React.Dispatch<React.SetStateAction<MarqueeRect | null>>;
  onSetDrawMarquee: React.Dispatch<React.SetStateAction<MarqueeRect | null>>;
  onSetSplitDragState: React.Dispatch<React.SetStateAction<SplitDragState | null>>;
  clientToCanvas: (clientX: number, clientY: number) => { x: number; y: number };
  onPointerDownElement: (
    e: React.PointerEvent,
    el: DesignElement,
    mode: 'move' | 'resize' | 'rotate',
    resizeDir?: ResizeDir,
    isChildDrag?: boolean
  ) => void;
  onSelectElement: (id: string | null, ids?: string[]) => void;
  onToggleMultiSelectElement?: (id: string) => void;
  onSetInlineEditId: (id: string | null) => void;
  onUpdateSelected: (patch: Partial<DesignElement>) => void;
  onSetActiveCanvasTabs: React.Dispatch<React.SetStateAction<Record<string, number>>>;
  onAddElement: (type: ElementType) => void;
  onOpenObjectForge: () => void;
  onOpenTemplates: () => void;
  onGroupSelectedIntoBox: () => void;
  onSubtractSelectedElements: () => void;
  onJoinSelectedWithSplit: () => void;
  onAlignMultiSelected: (mode: 'left' | 'center-x' | 'right' | 'top' | 'center-y' | 'bottom') => void;
  onDistributeMultiSelected: (axis: 'h' | 'v' | 'gap-h' | 'gap-v') => void;
  onStartGuideDrag: (axis: 'x' | 'y', clientX: number, clientY: number, existing?: CanvasGuide) => void;
  onRemoveGuide: (guideId: string) => void;
  onClearAllGuides: () => void;
  onDeleteSelected: () => void;
  onChangeBottomDockTab: (tab: 'code' | 'preview') => void;
  onSetBottomDockOpen: React.Dispatch<React.SetStateAction<boolean>>;
  onStartBottomDockResize: (drag: PanelResizeDragState) => void;
  onResetBottomDockHeight: () => void;
  onChangePlatform: (platform: TargetPlatform) => void;
  onCopyCode: () => void;
  onExportHtml: () => void;
  onChangePreviewSurface: (surface: PreviewSurface) => void;
  onChangePreviewViewport: (vp: PreviewViewport) => void;
  onOpenRightCodeTab: () => void;
}

function openCanvasElementLink(rawUrl: string): void {
  const trimmed = rawUrl.trim();
  if (!trimmed || trimmed === '#' || !isSafeUrlValue(trimmed)) return;
  const href = /^(https?:\/\/|mailto:|\/|#)/i.test(trimmed)
    ? trimmed
    : `https://${trimmed}`;
  window.open(href, '_blank', 'noopener,noreferrer');
}

const RESIZE_HANDLES: ReadonlyArray<{ dir: ResizeDir; cls: string }> = [
  { dir: 'nw', cls: '-top-1.5 -left-1.5 cursor-nwse-resize' },
  { dir: 'n', cls: '-top-1.5 left-1/2 -translate-x-1/2 cursor-ns-resize' },
  { dir: 'ne', cls: '-top-1.5 -right-1.5 cursor-nesw-resize' },
  { dir: 'e', cls: 'top-1/2 -translate-y-1/2 -right-1.5 cursor-ew-resize' },
  { dir: 'se', cls: '-bottom-1.5 -right-1.5 cursor-nwse-resize' },
  { dir: 's', cls: '-bottom-1.5 left-1/2 -translate-x-1/2 cursor-ns-resize' },
  { dir: 'sw', cls: '-bottom-1.5 -left-1.5 cursor-nesw-resize' },
  { dir: 'w', cls: 'top-1/2 -translate-y-1/2 -left-1.5 cursor-ew-resize' },
];

export const CanvasStage: React.FC<CanvasStageProps> = ({
  elements,
  rootCanvasElements,
  solvedRows,
  exportResult,
  layoutMode,
  platform,
  uiTheme,
  cuteThemeColors,
  canvasWidth,
  canvasHeight,
  canvasBg,
  canvasPattern,
  effectiveCanvasHeight,
  viewportSize,
  zoom,
  panOffset,
  canvasScreenLeft,
  canvasScreenTop,
  cursorTracker,
  isSpacePressed,
  panDrag,
  dragState,
  marqueeSelect,
  drawMarquee,
  dropTargetContainerId,
  snapLines,
  spacingBadges,
  guides,
  guideDragState,
  panelResizeDrag,
  canvasTool,
  magneticSnap,
  autoNestDrop,
  showHybridOverlay,
  editingContainer,
  editingChildren,
  selectedElement,
  selectedId,
  selectedIds,
  inlineEditId,
  activeCanvasTabs,
  bottomDockOpen,
  bottomDockTab,
  bottomDockHeight,
  previewSrcDoc,
  previewSurface,
  previewViewport,
  rightCollapsed,
  copied,
  swatches = [],
  showRulers = true,
  showSpacingBadges = true,
  customBlueprints = [],
  spotlightOpen = false,
  onToggleSpotlight,
  onAddCatalogItemAtPosition,
  onDropImageFile,
  onDropImageUrl,
  onAdjustZIndex,
  onBringToFront,
  onSendToBack,
  onDuplicateSelected,
  onToggleLock,
  onToggleHide,
  onUnlockAll,
  onSelectAll,
  onCopySelected,
  onPasteAtPosition,
  onCopyStyle,
  onPasteStyle,
  hasCopiedStyle = false,
  hasClipboardElement = false,
  onRotateSelected90,
  onFlipSelected,
  onPopOutFromContainer,
  onSaveSelectedAsBlueprint,
  onUpdateElementById,
  canvasRef,
  canvasViewportRef,
  canvasTransformRef,
  onChangeCanvasWidth,
  onChangeCanvasHeight,
  onChangeCanvasBg,
  onToggleMagneticSnap,
  onChangeShowHybridOverlay,
  onChangeZoom,
  onZoomTo,
  onFitCanvasToView,
  onCenterCanvasView,
  onChangeCanvasTool,
  onToggleAutoNestDrop,
  onExitContainerIsolation,
  onEnterContainerIsolation,
  onSetPanDrag,
  onSetMarqueeSelect,
  onSetDrawMarquee,
  onSetSplitDragState,
  clientToCanvas,
  onPointerDownElement,
  onSelectElement,
  onSetInlineEditId,
  onUpdateSelected,
  onSetActiveCanvasTabs,
  onAddElement,
  onOpenObjectForge,
  onOpenTemplates,
  onGroupSelectedIntoBox,
  onSubtractSelectedElements,
  onJoinSelectedWithSplit,
  onAlignMultiSelected,
  onDistributeMultiSelected,
  onStartGuideDrag,
  onRemoveGuide,
  onClearAllGuides,
  onDeleteSelected,
  onChangeBottomDockTab,
  onSetBottomDockOpen,
  onStartBottomDockResize,
  onResetBottomDockHeight,
  onChangePlatform,
  onCopyCode,
  onExportHtml,
  onChangePreviewSurface,
  onChangePreviewViewport,
  onOpenRightCodeTab,
}) => {
  const [contextMenu, setContextMenu] = React.useState<CanvasContextMenuState | null>(null);
  const [spotlightTargetPos, setSpotlightTargetPos] = React.useState<{ x: number; y: number } | null>(
    null
  );
  const [widthDraft, setWidthDraft] = React.useState<string>(() => String(canvasWidth));
  const [heightDraft, setHeightDraft] = React.useState<string>(() => String(canvasHeight));

  React.useEffect(() => {
    setWidthDraft(String(canvasWidth));
  }, [canvasWidth]);

  React.useEffect(() => {
    setHeightDraft(String(canvasHeight));
  }, [canvasHeight]);

  const matchedCanvasPreset = React.useMemo(
    () => CANVAS_SIZE_PRESETS.find((p) => p.w === canvasWidth && p.h === canvasHeight),
    [canvasWidth, canvasHeight]
  );

  const commitWidthDraft = () => {
    const val = parseInt(widthDraft, 10);
    if (Number.isNaN(val)) {
      setWidthDraft(String(canvasWidth));
      return;
    }
    const clamped = Math.max(240, Math.min(2400, val));
    onChangeCanvasWidth?.(clamped);
    setWidthDraft(String(clamped));
  };

  const commitHeightDraft = () => {
    const val = parseInt(heightDraft, 10);
    if (Number.isNaN(val)) {
      setHeightDraft(String(canvasHeight));
      return;
    }
    const clamped = Math.max(180, Math.min(3200, val));
    onChangeCanvasHeight?.(clamped);
    setHeightDraft(String(clamped));
  };

  const isToyhouseFreePlatform = platform === 'toyhouse_free' || platform === 'toyhouse_oc';
  const f2uShieldMap = React.useMemo(() => {
    const map = new Map<string, ReturnType<typeof getElementF2UShieldReport>>();
    if (!isToyhouseFreePlatform) return map;
    for (const item of elements) {
      map.set(item.id, getElementF2UShieldReport(item));
    }
    return map;
  }, [elements, isToyhouseFreePlatform]);
  const shieldedElementCount = React.useMemo(() => {
    let count = 0;
    f2uShieldMap.forEach((rep) => {
      if (rep.isShielded) count += 1;
    });
    return count;
  }, [f2uShieldMap]);

  const solvedColMap = React.useMemo(() => {
    const m = new Map<string, number>();
    for (const row of solvedRows) {
      for (const item of row.elements) {
        m.set(item.element.id, item.calculatedColSpan);
      }
    }
    return m;
  }, [solvedRows]);

  const prevDescendantsMapRef = React.useRef<Map<string, DesignElement[]>>(new Map());
  const descendantsByRootMap = React.useMemo(() => {
    const childrenMap = new Map<string, DesignElement[]>();
    for (const item of elements) {
      if (!item.parentId) continue;
      let arr = childrenMap.get(item.parentId);
      if (!arr) {
        arr = [];
        childrenMap.set(item.parentId, arr);
      }
      arr.push(item);
    }
    const result = new Map<string, DesignElement[]>();
    const collect = (rootId: string): DesignElement[] => {
      const out: DesignElement[] = [];
      const visited = new Set<string>([rootId]);
      const queue = [...(childrenMap.get(rootId) || [])];
      while (queue.length > 0) {
        const node = queue.shift()!;
        if (visited.has(node.id)) continue;
        visited.add(node.id);
        out.push(node);
        const grand = childrenMap.get(node.id);
        if (grand) queue.push(...grand);
      }
      return out;
    };
    for (const root of rootCanvasElements) {
      const fresh = collect(root.id);
      if (fresh.length === 0) continue;
      const prev = prevDescendantsMapRef.current.get(root.id);
      if (
        prev &&
        prev.length === fresh.length &&
        prev.every((p, idx) => p === fresh[idx])
      ) {
        result.set(root.id, prev);
      } else {
        result.set(root.id, fresh);
      }
    }
    prevDescendantsMapRef.current = result;
    return result;
  }, [elements, rootCanvasElements]);

  const selectedIdsRef = React.useRef(selectedIds);
  selectedIdsRef.current = selectedIds;
  const clientToCanvasRef = React.useRef(clientToCanvas);
  clientToCanvasRef.current = clientToCanvas;

  const handleContextMenuElement = React.useCallback(
    (e: React.MouseEvent, el: DesignElement) => {
      e.preventDefault();
      e.stopPropagation();
      if (!selectedIdsRef.current.includes(el.id)) {
        onSelectElement(el.id, [el.id]);
      }
      const pos = clientToCanvasRef.current(e.clientX, e.clientY);
      setContextMenu({
        clientX: e.clientX,
        clientY: e.clientY,
        canvasX: Math.round(pos.x),
        canvasY: Math.round(pos.y),
        element: el,
      });
    },
    [onSelectElement]
  );

  const [externalDropActive, setExternalDropActive] = React.useState(false);

  const handleViewportDragOver = (e: React.DragEvent) => {
    const types = Array.from(e.dataTransfer.types || []);
    const supportsDrop =
      types.includes('application/x-dbx-catalog') ||
      types.includes('Files') ||
      types.includes('text/uri-list') ||
      types.includes('text/plain');
    if (supportsDrop) {
      e.preventDefault();
      e.dataTransfer.dropEffect = 'copy';
      if (!externalDropActive) setExternalDropActive(true);
    }
  };

  const handleViewportDragLeave = (e: React.DragEvent) => {
    if (!e.currentTarget.contains(e.relatedTarget as Node | null)) {
      setExternalDropActive(false);
    }
  };

  const handleViewportDrop = (e: React.DragEvent) => {
    setExternalDropActive(false);
    const raw = e.dataTransfer.getData('application/x-dbx-catalog');
    if (raw && onAddCatalogItemAtPosition) {
      e.preventDefault();
      try {
        const parsed = JSON.parse(raw) as
          | { kind: 'element'; elementType: ElementType }
          | { kind: 'asset'; assetId: string }
          | { kind: 'fa_icon'; faClass: string; label: string }
          | { kind: 'blueprint'; blueprintId: string };
        let matched: SearchableCatalogItem | undefined;
        if (parsed.kind === 'element') {
          matched = STATIC_CATALOG.find(
            (i) => i.kind === 'element' && i.elementType === parsed.elementType
          );
        } else if (parsed.kind === 'asset') {
          matched = STATIC_CATALOG.find(
            (i) => i.kind === 'asset' && i.assetPreset?.id === parsed.assetId
          );
        } else if (parsed.kind === 'fa_icon') {
          matched = STATIC_CATALOG.find(
            (i) => i.kind === 'fa_icon' && i.faIcon?.cls === parsed.faClass
          );
        } else if (parsed.kind === 'blueprint') {
          const bp = customBlueprints.find((b) => b.id === parsed.blueprintId);
          if (bp) {
            matched = {
              id: `bp:${bp.id}`,
              kind: 'blueprint',
              categoryLabel: 'My Blueprints',
              label: bp.name,
              description: bp.description,
              searchTags: [],
              f2uSafe: true,
              blueprint: bp,
            };
          }
        }
        if (matched) {
          const pos = clientToCanvas(e.clientX, e.clientY);
          onAddCatalogItemAtPosition(matched, Math.round(pos.x), Math.round(pos.y));
        }
      } catch {
        // Ignore invalid catalog drag payload
      }
      return;
    }

    const droppedFiles = e.dataTransfer.files ? Array.from(e.dataTransfer.files) : [];
    const imageFile = droppedFiles.find((f) => f.type.startsWith('image/'));
    if (imageFile && onDropImageFile) {
      e.preventDefault();
      const pos = clientToCanvas(e.clientX, e.clientY);
      onDropImageFile(imageFile, Math.round(pos.x), Math.round(pos.y));
      return;
    }

    const uriText = e.dataTransfer.getData('text/uri-list') || e.dataTransfer.getData('text/plain') || '';
    const payload = classifyPastedPayload(uriText, e.dataTransfer.getData('text/html') || '');
    if (payload.kind === 'image_url' && onDropImageUrl) {
      e.preventDefault();
      const pos = clientToCanvas(e.clientX, e.clientY);
      onDropImageUrl(payload.url, Math.round(pos.x), Math.round(pos.y));
    }
  };

  const handleQuickAddPrimitiveAt = (type: ElementType, x: number, y: number) => {
    if (onAddCatalogItemAtPosition) {
      const matched = STATIC_CATALOG.find((i) => i.kind === 'element' && i.elementType === type);
      if (matched) {
        onAddCatalogItemAtPosition(matched, Math.round(x), Math.round(y));
        return;
      }
    }
    onAddElement(type);
  };

  return (
    <main
      style={{ backgroundColor: 'var(--bg-canvas-well)' }}
      className="flex-1 flex flex-col overflow-hidden relative min-w-0"
    >
      {/* Slim Top Canvas Controls Bar */}
      <div
        style={{ backgroundColor: 'var(--bg-panel)', borderColor: 'var(--border-main)' }}
        className="min-h-9 py-1 border-b px-2.5 flex flex-wrap items-center justify-between text-[11px] shrink-0 gap-1.5"
      >
        <div className="flex items-center flex-wrap gap-1.5 min-w-0">
          <CursorCoordsBadge cursorTracker={cursorTracker} />
          <span style={{ color: 'var(--border-strong)' }} className="hidden sm:inline">|</span>

          <div className="flex items-center flex-wrap gap-1.5">
            <button
              type="button"
              onClick={onToggleMagneticSnap}
              style={
                magneticSnap
                  ? {
                      backgroundColor: 'var(--accent-soft)',
                      color: 'var(--accent)',
                      borderColor: 'var(--accent)',
                    }
                  : {
                      backgroundColor: 'var(--bg-input)',
                      borderColor: 'var(--border-strong)',
                      color: 'var(--text-muted)',
                    }
              }
              className="border rounded-[5px] px-2 py-0.5 text-[10px] font-semibold flex items-center gap-1 transition"
              title="Toggle Magnetic Center & Edge Snapping"
            >
              <span>Snap {magneticSnap ? 'ON' : 'OFF'}</span>
            </button>

            {layoutMode !== 'block' && (
              <button
                type="button"
                onClick={onToggleAutoNestDrop}
                style={
                  autoNestDrop
                    ? {
                        backgroundColor: 'rgba(16,185,129,0.14)',
                        borderColor: 'rgba(16,185,129,0.5)',
                        color: '#10B981',
                      }
                    : {
                        backgroundColor: 'var(--bg-input)',
                        borderColor: 'var(--border-strong)',
                        color: 'var(--text-muted)',
                      }
                }
                className="border rounded-[5px] px-2 py-0.5 font-mono text-[9.5px] font-semibold"
                title="When OFF (default), hold Alt while dragging an object onto a container box to nest inside"
              >
                {autoNestDrop ? 'Drop-to-Nest: ON' : 'Hold Alt to Nest'}
              </button>
            )}

            {isToyhouseFreePlatform && (
              <button
                type="button"
                onClick={onOpenRightCodeTab}
                className={`border rounded-[5px] px-2 py-0.5 text-[10px] font-mono font-semibold flex items-center gap-1 transition ${
                  shieldedElementCount > 0
                    ? 'bg-amber-500/15 border-amber-500/45 text-amber-500 hover:bg-amber-500/25'
                    : 'bg-emerald-500/15 border-emerald-500/40 text-emerald-500 hover:bg-emerald-500/25'
                }`}
                title={
                  shieldedElementCount > 0
                    ? `${shieldedElementCount} element(s) have Pro effects temporarily masked in F2U simulation without losing settings. Click to inspect F2U & Code.`
                    : 'Toyhouse F2U Safe Mode active: 0 stripped Pro settings'
                }
              >
                {shieldedElementCount > 0 ? (
                  <ShieldAlert className="w-3 h-3" />
                ) : (
                  <ShieldCheck className="w-3 h-3" />
                )}
                <span>
                  {shieldedElementCount > 0
                    ? `F2U Shield (${shieldedElementCount} masked)`
                    : 'F2U Safe'}
                </span>
              </button>
            )}
          </div>
        </div>

        <div className="flex items-center flex-wrap gap-2 shrink-0">
          {layoutMode === 'hybrid' && (
            <label className="flex items-center gap-1 cursor-pointer">
              <input
                type="checkbox"
                checked={showHybridOverlay}
                onChange={(e) => onChangeShowHybridOverlay(e.target.checked)}
                className="rounded-[3px]"
              />
              <span style={{ color: 'var(--text-muted)' }}>Row Guides</span>
            </label>
          )}

          {guides.length > 0 && (
            <button
              type="button"
              onClick={onClearAllGuides}
              className="px-1.5 py-0.5 rounded-[5px] border border-sky-500/40 bg-sky-500/15 text-sky-500 font-mono text-[9.5px] font-semibold hover:opacity-85 transition flex items-center gap-1"
              title="Click to clear all ruler guides (or double-click a guide on canvas)"
            >
              <span>Guides ({guides.length})</span>
              <span>×</span>
            </button>
          )}

          {/* Always-Visible Canvas Size & Preset Bar */}
          <div
            style={{ backgroundColor: 'var(--bg-input)', borderColor: 'var(--border-main)' }}
            className="flex items-center border rounded-[6px] px-1.5 py-0.5 gap-1"
            title="Active Canvas Dimensions (W × H) & Presets"
          >
            <button
              type="button"
              onClick={() => onSelectElement(null, [])}
              style={{ color: 'var(--text-muted)' }}
              className="text-[9.5px] font-semibold uppercase tracking-wide hover:text-[var(--accent)] transition pr-0.5"
              title="Click to open Canvas & Backdrop Setup in Right Inspector"
            >
              Canvas
            </button>
            <select
              aria-label="Canvas Size Preset"
              value={matchedCanvasPreset ? matchedCanvasPreset.id : 'custom'}
              onChange={(e) => {
                const found = CANVAS_SIZE_PRESETS.find((p) => p.id === e.target.value);
                if (found) {
                  onChangeCanvasWidth?.(found.w);
                  onChangeCanvasHeight?.(found.h);
                }
              }}
              style={{
                backgroundColor: 'var(--bg-panel)',
                borderColor: 'var(--border-strong)',
                color: 'var(--text-main)',
              }}
              className="border rounded-[4px] px-1 py-0.5 text-[10px] max-w-[125px] truncate focus:outline-none focus:border-[var(--accent)]"
            >
              {CANVAS_SIZE_PRESETS.map((preset) => (
                <option key={preset.id} value={preset.id}>
                  {preset.label}
                </option>
              ))}
              {!matchedCanvasPreset && (
                <option value="custom">
                  Custom ({canvasWidth}×{canvasHeight})
                </option>
              )}
            </select>
            <input
              type="number"
              aria-label="Canvas Width (px)"
              min={240}
              max={2400}
              value={widthDraft}
              onChange={(e) => {
                setWidthDraft(e.target.value);
                const val = parseInt(e.target.value, 10);
                if (!Number.isNaN(val) && val >= 240 && val <= 2400) {
                  onChangeCanvasWidth?.(val);
                }
              }}
              onBlur={commitWidthDraft}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  commitWidthDraft();
                  e.currentTarget.blur();
                }
              }}
              style={{
                backgroundColor: 'var(--bg-panel)',
                borderColor: 'var(--border-strong)',
                color: 'var(--text-main)',
              }}
              className="w-[46px] border rounded-[4px] px-1 py-0.5 text-[10px] font-mono text-center focus:outline-none focus:border-[var(--accent)]"
              title="Canvas Width (px)"
            />
            <button
              type="button"
              onClick={() => {
                onChangeCanvasWidth?.(canvasHeight);
                onChangeCanvasHeight?.(canvasWidth);
              }}
              style={{ color: 'var(--text-muted)' }}
              className="px-0.5 text-[10px] font-mono hover:text-[var(--accent)] transition"
              title="Swap Canvas Width and Height"
            >
              ⇄
            </button>
            <input
              type="number"
              aria-label="Canvas Height (px)"
              min={180}
              max={3200}
              value={heightDraft}
              onChange={(e) => {
                setHeightDraft(e.target.value);
                const val = parseInt(e.target.value, 10);
                if (!Number.isNaN(val) && val >= 180 && val <= 3200) {
                  onChangeCanvasHeight?.(val);
                }
              }}
              onBlur={commitHeightDraft}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  commitHeightDraft();
                  e.currentTarget.blur();
                }
              }}
              style={{
                backgroundColor: 'var(--bg-panel)',
                borderColor: 'var(--border-strong)',
                color: 'var(--text-main)',
              }}
              className="w-[46px] border rounded-[4px] px-1 py-0.5 text-[10px] font-mono text-center focus:outline-none focus:border-[var(--accent)]"
              title="Canvas Height (px)"
            />
          </div>

          <div
            style={{ backgroundColor: 'var(--bg-input)', borderColor: 'var(--border-main)' }}
            className="flex items-center border rounded-[6px] px-1 gap-0.5"
            title="Ctrl + Mouse Wheel zooms cleanly at your pointer (25% – 400%)"
          >
            <button
              type="button"
              onClick={() => onZoomTo(zoom / 1.15)}
              className="p-1 hover:opacity-80"
              title="Zoom Out"
            >
              <ZoomOut className="w-3 h-3" />
            </button>
            <button
              type="button"
              onClick={() => {
                onChangeZoom(1);
                onCenterCanvasView();
              }}
              className="px-1.5 font-mono text-[10px] hover:underline"
              title="Reset 100% & Center View (Ctrl+0)"
            >
              {Math.round(zoom * 100)}%
            </button>
            <button
              type="button"
              onClick={() => onZoomTo(zoom * 1.15)}
              className="p-1 hover:opacity-80"
              title="Zoom In"
            >
              <ZoomIn className="w-3 h-3" />
            </button>
            <div style={{ backgroundColor: 'var(--border-main)' }} className="h-3.5 w-px mx-0.5" />
            <button
              type="button"
              onClick={onFitCanvasToView}
              className="px-1.5 py-0.5 font-mono text-[9.5px] rounded hover:bg-black/5 dark:hover:bg-white/5"
              title="Fit Canvas to Viewport (Ctrl+1)"
            >
              Fit
            </button>
            <button
              type="button"
              onClick={onCenterCanvasView}
              className="p-1 rounded hover:bg-black/5 dark:hover:bg-white/5"
              title="Center Canvas Pan (0, 0)"
            >
              <Focus className="w-3 h-3" />
            </button>
          </div>
        </div>
      </div>

      {/* Synced Rulers + Viewport Stage */}
      <div className="flex-1 flex flex-col overflow-hidden min-h-0 relative">
        {showRulers && (
          <div
            style={{ backgroundColor: 'var(--ruler-bg)', borderColor: 'var(--border-main)' }}
            className="h-5 flex border-b shrink-0 overflow-hidden"
          >
            <button
              type="button"
              onClick={onCenterCanvasView}
              onDoubleClick={onFitCanvasToView}
              style={{
                backgroundColor: 'var(--ruler-bg)',
                borderColor: 'var(--border-main)',
                color: 'var(--text-muted)',
              }}
              className="w-5 h-5 border-r shrink-0 flex items-center justify-center text-[8px] font-mono hover:opacity-80 transition"
              title="Origin (0,0) • Click to center pan • Double-click to fit canvas"
            >
              px
            </button>
            <div className="flex-1 overflow-hidden">
              <DynamicRulerCanvas
                orientation="horizontal"
                lengthPx={viewportSize.w}
                originOffsetPx={canvasScreenLeft}
                canvasExtentPx={canvasWidth}
                zoom={zoom}
                cursorTracker={cursorTracker}
                uiTheme={uiTheme}
                cuteThemeColors={cuteThemeColors}
                guides={guides}
                onStartCreateGuide={(e) => {
                  if (e.button === 0) {
                    try {
                      e.currentTarget.setPointerCapture(e.pointerId);
                    } catch {
                      // Ignore synthetic pointer capture error
                    }
                    onStartGuideDrag('y', e.clientX, e.clientY);
                  }
                }}
                onResetPan={onCenterCanvasView}
              />
            </div>
          </div>
        )}

        <div className="flex-1 flex overflow-hidden min-h-0">
          {showRulers && (
            <div
              style={{ backgroundColor: 'var(--ruler-bg)', borderColor: 'var(--border-main)' }}
              className="w-5 border-r shrink-0 overflow-hidden"
            >
              <DynamicRulerCanvas
                orientation="vertical"
                lengthPx={viewportSize.h}
                originOffsetPx={canvasScreenTop}
                canvasExtentPx={effectiveCanvasHeight}
                zoom={zoom}
                cursorTracker={cursorTracker}
                uiTheme={uiTheme}
                cuteThemeColors={cuteThemeColors}
                guides={guides}
                onStartCreateGuide={(e) => {
                  if (e.button === 0) {
                    try {
                      e.currentTarget.setPointerCapture(e.pointerId);
                    } catch {
                      // Ignore synthetic pointer capture error
                    }
                    onStartGuideDrag('x', e.clientX, e.clientY);
                  }
                }}
                onResetPan={onCenterCanvasView}
              />
            </div>
          )}

          <div
            ref={canvasViewportRef}
            onDragOver={handleViewportDragOver}
            onDragLeave={handleViewportDragLeave}
            onDrop={handleViewportDrop}
            onContextMenu={(e) => {
              e.preventDefault();
              const pos = clientToCanvas(e.clientX, e.clientY);
              setContextMenu({
                clientX: e.clientX,
                clientY: e.clientY,
                canvasX: Math.round(pos.x),
                canvasY: Math.round(pos.y),
                element: null,
              });
            }}
            onPointerEnter={() => cursorTracker.setInside(true)}
            onPointerLeave={() => cursorTracker.setInside(false)}
            onPointerDownCapture={(e) => {
              if (e.button === 1 || (isSpacePressed && e.button === 0)) {
                e.preventDefault();
                e.stopPropagation();
                try {
                  e.currentTarget.setPointerCapture(e.pointerId);
                } catch {
                  // Ignore pointer capture errors
                }
                onSetPanDrag({
                  startClientX: e.clientX,
                  startClientY: e.clientY,
                  origPanX: panOffset.x,
                  origPanY: panOffset.y,
                  moved: true,
                  fromEmptyClick: false,
                });
              }
            }}
            onPointerDown={(e) => {
              if (e.button !== 0 || canvasTool !== 'select') return;
              try {
                e.currentTarget.setPointerCapture(e.pointerId);
              } catch {
                // Ignore pointer capture errors
              }
              if (e.shiftKey && layoutMode !== 'block') {
                const pos = clientToCanvas(e.clientX, e.clientY);
                onSetMarqueeSelect({ startX: pos.x, startY: pos.y, curX: pos.x, curY: pos.y });
                return;
              }
              onSetPanDrag({
                startClientX: e.clientX,
                startClientY: e.clientY,
                origPanX: panOffset.x,
                origPanY: panOffset.y,
                moved: false,
                fromEmptyClick: true,
              });
            }}
            style={{
              cursor: panDrag?.moved
                ? 'grabbing'
                : isSpacePressed
                ? 'grab'
                : canvasTool !== 'select'
                ? 'crosshair'
                : undefined,
            }}
            className={`flex-1 relative overflow-hidden isolate ${
              externalDropActive ? 'ring-2 ring-inset ring-[var(--accent)]' : ''
            }`}
          >
            {externalDropActive && (
              <div
                style={{ backgroundColor: 'var(--accent-soft)', borderColor: 'var(--accent)' }}
                className="pointer-events-none absolute inset-3 z-[98] border-2 border-dashed rounded-[12px] flex items-center justify-center"
              >
                <div
                  style={{ backgroundColor: 'var(--bg-panel)', borderColor: 'var(--accent)' }}
                  className="px-4 py-2 rounded-[8px] border shadow-lg text-xs font-semibold flex items-center gap-2"
                >
                  <span>Drop element, image file, or image URL onto canvas</span>
                </div>
              </div>
            )}
            {/* Floating Figma-Style Tool & Quick-Modifier Pill */}
            {layoutMode !== 'block' && (
              <div
                onClick={(e) => e.stopPropagation()}
                onPointerDown={(e) => e.stopPropagation()}
                style={{
                  backgroundColor: 'color-mix(in srgb, var(--bg-panel) 88%, transparent)',
                  borderColor: 'var(--border-strong)',
                }}
                className="absolute top-2.5 left-1/2 -translate-x-1/2 z-[88] h-[28px] border rounded-full px-1.5 py-0.5 backdrop-blur-md shadow-md flex items-center gap-0.5 max-w-[calc(100%-24px)] overflow-x-auto text-[10px]"
              >
                {(
                  [
                    { id: 'select', label: 'Select (V)', icon: MousePointer },
                    { id: 'draw_box', label: 'Box (R)', icon: Square },
                    { id: 'draw_line', label: 'Line (L)', icon: Minus },
                    { id: 'draw_ring', label: 'Ring (O)', icon: CircleDot },
                  ] as const
                ).map((tool) => {
                  const TIcon = tool.icon;
                  const active = canvasTool === tool.id;
                  return (
                    <button
                      key={tool.id}
                      type="button"
                      onClick={() => onChangeCanvasTool(tool.id)}
                      style={
                        active
                          ? { backgroundColor: 'var(--accent)', color: '#fff' }
                          : { color: 'var(--text-main)' }
                      }
                      className="rounded-full px-2 py-0.5 flex items-center gap-1 font-medium whitespace-nowrap hover:opacity-90 transition"
                      title={
                        tool.id === 'select'
                          ? 'Pointer Select & Move (V / Esc)'
                          : `Click and drag on canvas: ${tool.label}`
                      }
                    >
                      <TIcon className="w-3 h-3" />
                      <span>{tool.label}</span>
                    </button>
                  );
                })}

                <div style={{ backgroundColor: 'var(--border-main)' }} className="h-3.5 w-px mx-0.5 shrink-0" />

                <button
                  type="button"
                  onClick={() => onAddElement('pure_paragraph')}
                  className="rounded-full px-2 py-0.5 flex items-center gap-1 hover:bg-black/5 dark:hover:bg-white/5 whitespace-nowrap"
                  title="Quick Add Paragraph Text (T)"
                >
                  <Type className="w-3 h-3 text-[var(--accent)]" />
                  <span>+ Text (T)</span>
                </button>

                {onToggleSpotlight && (
                  <button
                    type="button"
                    onClick={() => {
                      setSpotlightTargetPos(null);
                      onToggleSpotlight(true);
                    }}
                    className="rounded-full px-2 py-0.5 flex items-center gap-1 hover:bg-black/5 dark:hover:bg-white/5 whitespace-nowrap"
                    title="Spotlight Quick Search & Add (/ or Ctrl+K)"
                  >
                    <Search className="w-3 h-3 text-[var(--accent)]" />
                    <span>Search (/)</span>
                  </button>
                )}

                {editingContainer && (
                  <>
                    <div style={{ backgroundColor: 'var(--border-main)' }} className="h-3.5 w-px mx-0.5 shrink-0" />
                    <div className="flex items-center gap-1 bg-amber-500/15 border border-amber-500/40 text-amber-500 px-2 py-0.5 rounded-full whitespace-nowrap">
                      <Focus className="w-3 h-3" />
                      <span className="font-mono text-[9.5px] font-semibold">
                        Inside: {editingContainer.label}
                      </span>
                      <button
                        type="button"
                        onClick={() => onExitContainerIsolation(editingContainer.id)}
                        className="ml-1 px-1.5 py-[1px] rounded-full bg-amber-500 text-white text-[9px] font-bold flex items-center gap-0.5"
                      >
                        <CornerUpLeft className="w-2.5 h-2.5" />
                        Exit
                      </button>
                    </div>
                  </>
                )}

                {selectedElement &&
                  selectedIds.length <= 1 &&
                  isPureContainerType(selectedElement.type) &&
                  editingContainer?.id !== selectedElement.id && (
                    <>
                      <div style={{ backgroundColor: 'var(--border-main)' }} className="h-3.5 w-px mx-0.5 shrink-0" />
                      <button
                        type="button"
                        onClick={() => onEnterContainerIsolation(selectedElement.id)}
                        style={{ backgroundColor: 'var(--accent)', color: '#fff' }}
                        className="rounded-full px-2 py-0.5 flex items-center gap-1 font-semibold whitespace-nowrap"
                        title="Double-click or click to edit nested children inside"
                      >
                        <Focus className="w-3 h-3" />
                        <span>Edit Inside</span>
                      </button>
                    </>
                  )}
              </div>
            )}

            {isSpacePressed || panDrag?.moved ? (
              <div
                style={{
                  backgroundColor: 'var(--bg-panel)',
                  borderColor: 'var(--accent)',
                  color: 'var(--accent)',
                }}
                className="absolute top-2 right-2 z-[90] border px-2.5 py-0.5 rounded-full text-[10px] font-mono font-semibold flex items-center gap-1 shadow pointer-events-none"
              >
                <Hand className="w-3 h-3" />
                <span>
                  PAN ({panOffset.x}, {panOffset.y})
                </span>
              </div>
            ) : (
              (panOffset.x !== 0 || panOffset.y !== 0) && (
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    onCenterCanvasView();
                  }}
                  onPointerDown={(e) => e.stopPropagation()}
                  style={{
                    backgroundColor: 'var(--bg-panel)',
                    borderColor: 'var(--border-strong)',
                    color: 'var(--text-muted)',
                  }}
                  className="absolute bottom-2 right-2 z-[80] border px-2 py-0.5 rounded-full text-[9.5px] font-mono hover:border-amber-500 transition shadow-sm"
                  title="Click to recenter canvas pan to (0, 0)"
                >
                  Center Canvas ({panOffset.x}, {panOffset.y})
                </button>
              )
            )}

            <div
              ref={canvasTransformRef}
              style={{
                position: 'absolute',
                left: 0,
                top: 0,
                transform: `translate3d(${canvasScreenLeft}px, ${canvasScreenTop}px, 0) scale(${zoom})`,
                transformOrigin: '0 0',
              }}
            >
              {layoutMode === 'block' ? (
                <div
                  style={{
                    width: canvasWidth,
                    minHeight: canvasHeight,
                    borderColor:
                      canvasBg === 'transparent' ? 'var(--accent)' : 'var(--border-strong)',
                    borderStyle: canvasBg === 'transparent' ? 'dashed' : 'solid',
                    backgroundColor: canvasBg === 'transparent' ? 'transparent' : canvasBg,
                  }}
                  className="dbx-canvas-host border rounded-[10px] p-5 shadow-lg space-y-3 relative"
                >
                  {canvasBg === 'transparent' && (
                    <div
                      style={{ color: 'var(--accent)' }}
                      className="absolute -top-6 right-0 text-[10px] font-mono flex items-center gap-1 opacity-80"
                    >
                      <EyeOff className="w-3 h-3" />
                      <span>Transparent Canvas (No Outer Card on Toyhouse)</span>
                    </div>
                  )}
                  {solvedRows.length === 0 &&
                    canvasBg !== 'transparent' &&
                    canvasTool === 'select' && (
                    <div
                      style={{ color: 'var(--text-muted)', borderColor: 'var(--border-strong)' }}
                      className="h-64 border border-dashed rounded-[8px] flex flex-col items-center justify-center gap-2 text-xs"
                    >
                      <span>Blank Block Stack Canvas</span>
                      <div className="flex gap-2">
                        <button
                          onClick={() => onAddElement('box')}
                          style={{ backgroundColor: 'var(--accent)', color: '#fff' }}
                          className="px-3 py-1 rounded-[6px] text-[11px] font-semibold"
                        >
                          + Add Container Box
                        </button>
                        <button
                          onClick={onOpenTemplates}
                          style={{
                            backgroundColor: 'var(--bg-panel-alt)',
                            borderColor: 'var(--border-strong)',
                          }}
                          className="px-3 py-1 rounded-[6px] border text-[11px]"
                        >
                          Browse Presets
                        </button>
                      </div>
                    </div>
                  )}
                  {solvedRows.map((row) => (
                    <div
                      key={row.rowIndex}
                      style={{ borderColor: 'var(--border-strong)' }}
                      className="border border-dashed rounded-[8px] p-3 bg-black/5"
                    >
                      <div
                        style={{ color: 'var(--text-muted)' }}
                        className="flex items-center justify-between text-[10px] mb-2 font-mono"
                      >
                        <span>ROW #{row.rowIndex + 1}</span>
                        <span>12-COLUMN SEMANTIC GRID</span>
                      </div>
                      <div className="grid grid-cols-12 gap-3">
                        {row.elements.map(({ element: el, calculatedColSpan }) => {
                          const shieldReport = f2uShieldMap.get(el.id);
                          const activeLinkUrl = getElementEffectiveLinkUrl(el);
                          return (
                            <div
                              key={el.id}
                              onPointerDown={(e) => e.stopPropagation()}
                              onClick={(e) => {
                                e.stopPropagation();
                                if ((e.ctrlKey || e.metaKey) && activeLinkUrl) {
                                  openCanvasElementLink(activeLinkUrl);
                                  return;
                                }
                                onSelectElement(el.id, [el.id]);
                              }}
                              style={{
                                gridColumn: `span ${calculatedColSpan} / span ${calculatedColSpan}`,
                              }}
                              className={`cursor-pointer transition relative min-h-[54px] ${
                                selectedId === el.id ? 'ring-2 ring-amber-600 rounded-[8px]' : ''
                              }`}
                            >
                              {activeLinkUrl && (
                                <button
                                  type="button"
                                  onPointerDown={(e) => e.stopPropagation()}
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    openCanvasElementLink(activeLinkUrl);
                                  }}
                                  className="absolute top-1 left-1.5 text-[8.5px] font-mono font-bold px-1.5 py-0.5 rounded-[4px] bg-sky-600/95 hover:bg-sky-500 text-white z-30 shadow flex items-center gap-1 transition"
                                  title={`Linked: ${activeLinkUrl} (Click badge or Ctrl+Click element to test)`}
                                >
                                  <Link2 className="w-2.5 h-2.5 shrink-0" />
                                  <span>LINK</span>
                                </button>
                              )}
                              <div className="absolute top-1 right-1.5 text-[9px] font-mono px-1.5 py-0.5 rounded-[4px] bg-stone-900/85 text-amber-300 z-20">
                                col-{calculatedColSpan}
                              </div>
                              {shieldReport?.isShielded && (
                                <div
                                  className="absolute bottom-1 right-1.5 text-[8.5px] font-mono font-bold px-1.5 py-0.5 rounded-[4px] bg-amber-500/95 text-stone-950 z-20 shadow flex items-center gap-1"
                                  title={`F2U Shielded (${shieldReport.items.map((i) => i.label).join(' · ')}) — Preserved safely & auto-restored in Toyhouse Premium`}
                                >
                                  <ShieldAlert className="w-2.5 h-2.5 shrink-0" />
                                  <span>F2U Shield ({shieldReport.items.length})</span>
                                </div>
                              )}
                              <div
                                className="pointer-events-none h-full"
                                dangerouslySetInnerHTML={{
                                  __html: renderInnerElementHTML(
                                    el,
                                    platform.startsWith('toyhouse'),
                                    elements,
                                    false,
                                    isToyhouseFreePlatform
                                  ),
                                }}
                              />
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div
                  ref={canvasRef}
                  onPointerDown={(e) => {
                    if (
                      canvasTool !== 'select' &&
                      canvasRef.current &&
                      e.button === 0 &&
                      !isSpacePressed
                    ) {
                      e.stopPropagation();
                      try {
                        e.currentTarget.setPointerCapture(e.pointerId);
                      } catch {
                        // Ignore pointer capture errors
                      }
                      const rect = canvasRef.current.getBoundingClientRect();
                      const startX = Math.max(
                        0,
                        Math.min(canvasWidth, Math.round((e.clientX - rect.left) / zoom))
                      );
                      const startY = Math.max(
                        0,
                        Math.min(canvasHeight, Math.round((e.clientY - rect.top) / zoom))
                      );
                      onSetDrawMarquee({ startX, startY, curX: startX, curY: startY });
                    }
                  }}
                  style={{
                    width: canvasWidth,
                    height: canvasHeight,
                    cursor: canvasTool !== 'select' ? 'crosshair' : undefined,
                    backgroundColor: canvasBg === 'transparent' ? 'transparent' : canvasBg,
                    borderColor:
                      canvasBg === 'transparent' ? 'var(--accent)' : 'var(--border-strong)',
                    borderStyle: canvasBg === 'transparent' ? 'dashed' : 'solid',
                    backgroundImage:
                      canvasBg === 'transparent'
                        ? uiTheme === 'cute'
                          ? 'radial-gradient(var(--grid-dot) 1.6px, transparent 1.6px)'
                          : 'radial-gradient(var(--grid-dot) 1px, transparent 1px)'
                        : canvasPattern === 'dots'
                        ? uiTheme === 'cute'
                          ? 'radial-gradient(var(--grid-dot) 1.6px, transparent 1.6px)'
                          : 'radial-gradient(var(--grid-dot) 1px, transparent 1px)'
                        : canvasPattern === 'grid'
                        ? 'linear-gradient(var(--grid-dot) 1px, transparent 1px), linear-gradient(90deg, var(--grid-dot) 1px, transparent 1px)'
                        : canvasPattern === 'cross_grid'
                        ? 'radial-gradient(var(--grid-dot) 1.5px, transparent 1.5px), linear-gradient(var(--grid-dot) 1px, transparent 1px), linear-gradient(90deg, var(--grid-dot) 1px, transparent 1px)'
                        : canvasPattern === 'lines'
                        ? 'repeating-linear-gradient(0deg, transparent, transparent 19px, var(--grid-dot) 19px, var(--grid-dot) 20px)'
                        : canvasPattern === 'stripes'
                        ? 'repeating-linear-gradient(45deg, transparent, transparent 8px, var(--grid-dot) 8px, var(--grid-dot) 16px)'
                        : canvasPattern === 'checker'
                        ? 'linear-gradient(45deg, var(--grid-dot) 25%, transparent 25%), linear-gradient(-45deg, var(--grid-dot) 25%, transparent 25%)'
                        : 'none',
                    backgroundSize:
                      canvasPattern === 'dots' || canvasBg === 'transparent'
                        ? uiTheme === 'cute'
                          ? '18px 18px'
                          : '16px 16px'
                        : canvasPattern === 'grid' || canvasPattern === 'checker'
                        ? '20px 20px'
                        : canvasPattern === 'cross_grid'
                        ? '24px 24px'
                        : undefined,
                  }}
                  className="dbx-canvas-host relative border rounded-[10px] shadow-xl overflow-hidden shrink-0"
                >
                  {elements.length === 0 &&
                    canvasBg !== 'transparent' &&
                    canvasTool === 'select' && (
                    <div className="absolute inset-0 flex flex-col items-center justify-center p-6 text-center pointer-events-none">
                      <div
                        onPointerDown={(e) => e.stopPropagation()}
                        style={{
                          backgroundColor: 'var(--bg-panel)',
                          borderColor: 'var(--border-strong)',
                          color: 'var(--text-main)',
                        }}
                        className="p-5 rounded-[12px] border shadow-sm max-w-md space-y-2.5 pointer-events-auto opacity-85"
                      >
                        <div className="font-semibold text-sm">
                          Blank Canvas ({canvasWidth}×{canvasHeight}px)
                        </div>
                        <p style={{ color: 'var(--text-muted)' }} className="text-xs leading-relaxed">
                          Drag or click any block on the left, press <kbd className="font-mono">/</kbd> to quick-add, or load a preset.
                        </p>
                        <div className="flex items-center justify-center gap-2 pt-1">
                          <button
                            onClick={() => onAddElement('id_card')}
                            style={{ backgroundColor: 'var(--accent)', color: '#fff' }}
                            className="px-3 py-1.5 rounded-[7px] text-xs font-semibold hover:opacity-90"
                          >
                            + Add ID Dossier
                          </button>
                          <button
                            onClick={onOpenObjectForge}
                            style={{
                              backgroundColor: 'var(--bg-panel-alt)',
                              borderColor: 'var(--border-strong)',
                            }}
                            className="px-3 py-1.5 rounded-[7px] border text-xs font-medium hover:opacity-90"
                          >
                            + Object Forge
                          </button>
                          <button
                            onClick={onOpenTemplates}
                            style={{
                              backgroundColor: 'var(--bg-panel-alt)',
                              borderColor: 'var(--border-strong)',
                            }}
                            className="px-3 py-1.5 rounded-[7px] border text-xs font-medium hover:opacity-90"
                          >
                            Load Preset
                          </button>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Persistent Ruler Guides (Dragged from Rulers) */}
                  {(guideDragState ? [...guides.filter((g) => g.id !== guideDragState.id), guideDragState] : guides).map((guide) => {
                    const isOutOfBounds =
                      guide.pos < 0 ||
                      guide.pos > (guide.axis === 'x' ? canvasWidth : effectiveCanvasHeight);
                    return guide.axis === 'x' ? (
                      <div
                        key={guide.id}
                        onPointerDown={(e) => {
                          if (e.button !== 0) return;
                          e.stopPropagation();
                          try {
                            e.currentTarget.setPointerCapture(e.pointerId);
                          } catch {
                            // Ignore pointer capture errors
                          }
                          onStartGuideDrag('x', e.clientX, e.clientY, guide);
                        }}
                        onDoubleClick={(e) => {
                          e.stopPropagation();
                          onRemoveGuide(guide.id);
                        }}
                        title="Vertical Guide • Drag to move • Double-click or drag off canvas to remove"
                        style={{
                          left: guide.pos,
                          borderLeft: `1.5px ${isOutOfBounds ? 'dotted' : 'dashed'} ${isOutOfBounds ? '#EF4444' : '#0EA5E9'}`,
                        }}
                        className="absolute top-0 bottom-0 z-[99990] cursor-col-resize w-1 -ml-[0.5px] group"
                      >
                        <span
                          style={{ backgroundColor: isOutOfBounds ? '#EF4444' : '#0EA5E9' }}
                          className="absolute top-1 left-1 text-[8.5px] font-mono font-bold px-1 py-[1px] rounded text-white whitespace-nowrap shadow opacity-85 group-hover:opacity-100 pointer-events-none"
                        >
                          X:{guide.pos}
                        </span>
                      </div>
                    ) : (
                      <div
                        key={guide.id}
                        onPointerDown={(e) => {
                          if (e.button !== 0) return;
                          e.stopPropagation();
                          try {
                            e.currentTarget.setPointerCapture(e.pointerId);
                          } catch {
                            // Ignore pointer capture errors
                          }
                          onStartGuideDrag('y', e.clientX, e.clientY, guide);
                        }}
                        onDoubleClick={(e) => {
                          e.stopPropagation();
                          onRemoveGuide(guide.id);
                        }}
                        title="Horizontal Guide • Drag to move • Double-click or drag off canvas to remove"
                        style={{
                          top: guide.pos,
                          borderTop: `1.5px ${isOutOfBounds ? 'dotted' : 'dashed'} ${isOutOfBounds ? '#EF4444' : '#0EA5E9'}`,
                        }}
                        className="absolute left-0 right-0 z-[99990] cursor-row-resize h-1 -mt-[0.5px] group"
                      >
                        <span
                          style={{ backgroundColor: isOutOfBounds ? '#EF4444' : '#0EA5E9' }}
                          className="absolute left-1 top-1 text-[8.5px] font-mono font-bold px-1 py-[1px] rounded text-white whitespace-nowrap shadow opacity-85 group-hover:opacity-100 pointer-events-none"
                        >
                          Y:{guide.pos}
                        </span>
                      </div>
                    );
                  })}

                  {/* Active Smart Snap Guides & Distance Badges */}
                  {snapLines.map((line, idx) =>
                    line.axis === 'x' ? (
                      <div
                        key={`snap-x-${idx}-${line.pos}`}
                        style={{
                          left: line.pos,
                          borderLeft: `1.5px dashed ${line.kind === 'guide' ? '#0EA5E9' : '#E11D48'}`,
                          filter: 'drop-shadow(0 0 4px rgba(225,29,72,0.7))',
                        }}
                        className="absolute top-0 bottom-0 z-[99999] pointer-events-none flex flex-col justify-center items-center"
                      >
                        <span
                          style={{ backgroundColor: line.kind === 'guide' ? '#0EA5E9' : '#E11D48' }}
                          className="text-[9.5px] font-mono font-bold px-1.5 py-0.5 rounded shadow-lg text-white whitespace-nowrap"
                        >
                          {line.kind === 'center' && line.pos === Math.round(canvasWidth / 2)
                            ? '⇥ CENTER X ⇤'
                            : `X: ${line.pos}px`}
                        </span>
                      </div>
                    ) : (
                      <div
                        key={`snap-y-${idx}-${line.pos}`}
                        style={{
                          top: line.pos,
                          borderTop: `1.5px dashed ${line.kind === 'guide' ? '#0EA5E9' : '#E11D48'}`,
                          filter: 'drop-shadow(0 0 4px rgba(225,29,72,0.7))',
                        }}
                        className="absolute left-0 right-0 z-[99999] pointer-events-none flex justify-center items-center"
                      >
                        <span
                          style={{ backgroundColor: line.kind === 'guide' ? '#0EA5E9' : '#E11D48' }}
                          className="text-[9.5px] font-mono font-bold px-1.5 py-0.5 rounded shadow-lg text-white whitespace-nowrap"
                        >
                          {line.kind === 'center' && line.pos === Math.round(canvasHeight / 2)
                            ? '⤓ CENTER Y ⤒'
                            : `Y: ${line.pos}px`}
                        </span>
                      </div>
                    )
                  )}

                  {showSpacingBadges &&
                    spacingBadges.map((badge, idx) => (
                    <div
                      key={`sp-${idx}-${badge.axis}-${badge.x}-${badge.y}`}
                      style={{
                        left: badge.x,
                        top: badge.y,
                        transform: 'translate(-50%, -50%)',
                      }}
                      className="absolute z-[99999] pointer-events-none px-1.5 py-[1px] rounded bg-rose-600/95 text-white font-mono text-[8.5px] font-bold shadow"
                    >
                      {badge.gap}px
                    </div>
                  ))}

                  {layoutMode === 'hybrid' &&
                    showHybridOverlay &&
                    solvedRows.map((row) => {
                      const minY = Math.min(...row.elements.map((e) => e.element.y));
                      const maxY = Math.max(
                        ...row.elements.map((e) => e.element.y + e.element.height)
                      );
                      return (
                        <div
                          key={row.rowIndex}
                          style={{
                            top: minY - 4,
                            height: maxY - minY + 8,
                            left: 12,
                            right: 12,
                            borderColor: 'rgba(200, 109, 81, 0.35)',
                          }}
                          className="absolute border border-dashed rounded-[6px] pointer-events-none flex items-start justify-end p-1"
                        >
                          <span className="text-[9px] font-mono px-1.5 py-0.5 rounded-[4px] bg-stone-900/85 text-amber-200 border border-amber-500/30">
                            ROW {row.rowIndex + 1} [
                            {row.elements.map((i) => `col-${i.calculatedColSpan}`).join(' | ')}]
                          </span>
                        </div>
                      );
                    })}

                  {rootCanvasElements.map((el) => {
                    const isSelected =
                      selectedIds.length > 0 ? selectedIds.includes(el.id) : selectedId === el.id;
                    const isPrimary = selectedId === el.id;
                    return (
                      <CanvasElementItem
                        key={el.id}
                        el={el}
                        descendants={descendantsByRootMap.get(el.id) ?? EMPTY_DESCENDANTS}
                        layoutMode={layoutMode}
                        platform={platform}
                        isToyhouseFreePlatform={isToyhouseFreePlatform}
                        isSelected={isSelected}
                        isPrimary={isPrimary}
                        showHandles={
                          isSelected && !el.locked && (selectedIds.length <= 1 || isPrimary)
                        }
                        isInlineEditing={inlineEditId === el.id}
                        isFloating={isFloatingCollageElement(el)}
                        isDropTarget={dropTargetContainerId === el.id}
                        isEditingThisContainer={editingContainer?.id === el.id}
                        isDimmedByIsolation={Boolean(
                          editingContainer && editingContainer.id !== el.id
                        )}
                        isSelectTool={canvasTool === 'select'}
                        solvedCol={solvedColMap.get(el.id) ?? el.colSpan}
                        activeTabIdx={activeCanvasTabs[el.id] || 0}
                        onPointerDownElement={onPointerDownElement}
                        onSelectElement={onSelectElement}
                        onEnterContainerIsolation={onEnterContainerIsolation}
                        onSetInlineEditId={onSetInlineEditId}
                        onUpdateSelected={onUpdateSelected}
                        onSetActiveCanvasTabs={onSetActiveCanvasTabs}
                        onSetSplitDragState={onSetSplitDragState}
                        onContextMenuElement={handleContextMenuElement}
                      />
                    );
                  })}

                  {/* Canva-style Floating Selection Mini Bar */}
                  {selectedElement &&
                    selectedIds.length >= 1 &&
                    !inlineEditId &&
                    !dragState &&
                    !editingContainer && (
                      <FloatingSelectionBar
                        el={selectedElement}
                        selectedElements={elements.filter((item) => selectedIds.includes(item.id))}
                        resolvedOrigin={getElementCanvasOrigin(selectedElement, elements)}
                        swatches={swatches}
                        onUpdateSelected={onUpdateSelected}
                        onAdjustZIndex={onAdjustZIndex}
                        onRotateSelected90={onRotateSelected90}
                        onDuplicateSelected={onDuplicateSelected}
                        onToggleLock={onToggleLock}
                        onAlignMultiSelected={onAlignMultiSelected}
                        onDistributeMultiSelected={onDistributeMultiSelected}
                        onGroupSelectedIntoBox={onGroupSelectedIntoBox}
                        onDeleteSelected={onDeleteSelected}
                      />
                    )}

                  {/* Container Isolation Mode Children Overlay */}
                  {editingContainer &&
                    (() => {
                      const containerOrigin = getElementCanvasOrigin(editingContainer, elements);
                      const { bL, bT } = getInnerBoxGeometry(editingContainer);
                      const activeSplitParent = (editingContainer.modifiers || []).find(
                        (m): m is SplitModifier => m.kind === 'split' && m.enabled
                      );
                      const draggingChild = dragState?.isChild
                        ? editingChildren.find((c) => c.id === dragState.id)
                        : null;
                      const highlightedPaneIdx = draggingChild
                        ? draggingChild.parentPaneIndex ?? 0
                        : null;

                      return (
                        <>
                          {activeSplitParent &&
                            Array.from({ length: activeSplitParent.panes }, (_, pIdx) => {
                              const pRect = getSplitPaneGeometry(editingContainer, pIdx);
                              const isHot = highlightedPaneIdx === pIdx;
                              return (
                                <div
                                  key={`iso-pane-${pIdx}`}
                                  style={{
                                    left: containerOrigin.x + bL + pRect.paneX,
                                    top: containerOrigin.y + bT + pRect.paneY,
                                    width: pRect.paneW,
                                    height: pRect.paneH,
                                    zIndex: 72,
                                  }}
                                  className={`absolute pointer-events-none transition-colors ${
                                    isHot
                                      ? 'bg-emerald-500/10 ring-2 ring-inset ring-emerald-500/70'
                                      : ''
                                  }`}
                                >
                                  <span
                                    className={`absolute top-1 left-1 text-[8.5px] font-mono px-1 rounded ${
                                      isHot
                                        ? 'bg-emerald-600 text-white font-bold'
                                        : 'bg-black/30 text-white/80'
                                    }`}
                                  >
                                    Pane {pIdx + 1}
                                  </span>
                                </div>
                              );
                            })}

                          {editingChildren.map((child) => {
                            const cw = child.childCustomWidth || child.width;
                            const ch = child.childCustomHeight || child.height;
                            const ox = child.childOffsetX ?? 12;
                            const oy = child.childOffsetY ?? 12;
                            const pIdx = child.parentPaneIndex ?? 0;
                            const pRect = getSplitPaneGeometry(editingContainer, pIdx);
                            const cx = containerOrigin.x + bL + pRect.paneX + ox;
                            const cy = containerOrigin.y + bT + pRect.paneY + oy;
                            const isChildSelected = selectedId === child.id;
                            const activeChildLink = getElementEffectiveLinkUrl(child);
                            return (
                              <div
                                key={`iso-child-${child.id}`}
                                onClick={(e) => {
                                  e.stopPropagation();
                                  if ((e.ctrlKey || e.metaKey) && activeChildLink) {
                                    openCanvasElementLink(activeChildLink);
                                    return;
                                  }
                                  onSelectElement(child.id, [child.id]);
                                }}
                                onPointerDown={(e) =>
                                  onPointerDownElement(e, child, 'move', undefined, true)
                                }
                                style={{
                                  left: cx,
                                  top: cy,
                                  width: cw,
                                  height: ch,
                                  zIndex: isChildSelected ? 80 : 75,
                                }}
                                className={`absolute ${
                                  child.locked ? 'cursor-not-allowed' : 'cursor-move'
                                } rounded-[5px] ${
                                  isChildSelected
                                    ? 'ring-2 ring-amber-500 bg-amber-500/10'
                                    : 'border border-dashed border-amber-400/75 hover:border-amber-500'
                                }`}
                                title={`Child: ${child.label} (X:${ox}, Y:${oy})${
                                  child.locked ? ' · Locked' : ''
                                }`}
                              >
                                <div className="absolute -top-4 left-0 bg-amber-500 text-white text-[8.5px] font-mono px-1 rounded shadow pointer-events-none whitespace-nowrap">
                                  {child.locked ? '🔒 ' : ''}
                                  {child.label} • X:{ox} Y:{oy}
                                  {activeSplitParent ? ` • P${pIdx + 1}` : ''}
                                </div>
                                {isChildSelected &&
                                  !child.locked &&
                                  (['se', 'e', 's'] as const).map((dir) => (
                                    <div
                                      key={dir}
                                      onClick={(e) => e.stopPropagation()}
                                      onPointerDown={(e) =>
                                        onPointerDownElement(e, child, 'resize', dir, true)
                                      }
                                      className={`w-2.5 h-2.5 rounded-full bg-amber-500 border border-white absolute z-50 ${
                                        dir === 'se'
                                          ? '-bottom-1 -right-1 cursor-nwse-resize'
                                          : dir === 'e'
                                          ? 'top-1/2 -translate-y-1/2 -right-1 cursor-ew-resize'
                                          : '-bottom-1 left-1/2 -translate-x-1/2 cursor-ns-resize'
                                      }`}
                                    />
                                  ))}
                              </div>
                            );
                          })}
                        </>
                      );
                    })()}

                  {drawMarquee &&
                    (() => {
                      const x = Math.min(drawMarquee.startX, drawMarquee.curX);
                      const y = Math.min(drawMarquee.startY, drawMarquee.curY);
                      const w = Math.max(4, Math.abs(drawMarquee.curX - drawMarquee.startX));
                      const h = Math.max(4, Math.abs(drawMarquee.curY - drawMarquee.startY));
                      return (
                        <div
                          style={{
                            left: x,
                            top: y,
                            width: w,
                            height: h,
                            borderRadius: canvasTool === 'draw_ring' ? '999px' : '4px',
                          }}
                          className="absolute border-2 border-dashed border-amber-500 bg-amber-500/10 pointer-events-none z-[95] flex items-center justify-center font-mono text-[10px] text-amber-500 font-bold"
                        >
                          {w}×{h}
                        </div>
                      );
                    })()}
                </div>
              )}

              {marqueeSelect &&
                (() => {
                  const mx = Math.min(marqueeSelect.startX, marqueeSelect.curX);
                  const my = Math.min(marqueeSelect.startY, marqueeSelect.curY);
                  const mw = Math.max(2, Math.abs(marqueeSelect.curX - marqueeSelect.startX));
                  const mh = Math.max(2, Math.abs(marqueeSelect.curY - marqueeSelect.startY));
                  return (
                    <div
                      style={{
                        left: mx,
                        top: my,
                        width: mw,
                        height: mh,
                        borderColor: 'var(--accent)',
                        backgroundColor: 'var(--accent-soft)',
                      }}
                      className="absolute border-2 border-dashed rounded-[4px] pointer-events-none z-[96] flex items-end justify-end p-1 font-mono text-[9px] font-bold text-amber-600"
                    >
                      {mw}×{mh}
                    </div>
                  );
                })()}
            </div>
          </div>
        </div>

        {/* Floating Multi-Select Action Bar */}
        {selectedIds.length > 1 && (
          <div
            style={{
              backgroundColor: 'var(--bg-panel)',
              borderColor: 'var(--border-strong)',
              boxShadow: '0 8px 30px rgba(0,0,0,0.18)',
            }}
            className="absolute bottom-3 left-1/2 -translate-x-1/2 z-[95] border rounded-lg px-2.5 py-1.5 max-w-[calc(100%-20px)] flex flex-wrap items-center justify-center gap-1.5 text-xs shadow-xl dbx-fade-up"
          >
            <div className="flex items-center gap-1.5 font-mono text-[11px] font-semibold text-accent">
              <span
                style={{ backgroundColor: 'var(--accent)', color: '#fff' }}
                className="w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold"
              >
                {selectedIds.length}
              </span>
              <span>Selected</span>
            </div>

            <div style={{ backgroundColor: 'var(--border-main)' }} className="h-4 w-px" />

            <button
              onClick={onGroupSelectedIntoBox}
              style={{ backgroundColor: 'var(--accent)', color: '#fff' }}
              className="flex items-center gap-1.5 px-2.5 py-1 rounded-[5px] font-medium hover:opacity-90 transition text-[11px] shadow-sm"
              title="Wrap selected items into a new Container Box"
            >
              <FolderPlus className="w-3.5 h-3.5" />
              <span>Group into Box</span>
            </button>

            {selectedIds.length === 2 && (
              <button
                onClick={onSubtractSelectedElements}
                style={{ backgroundColor: '#18181B', color: '#fff' }}
                className="flex items-center gap-1.5 px-2.5 py-1 rounded-[5px] font-medium hover:opacity-90 transition text-[11px] shadow-sm border border-white/15"
                title="Cutout/Carve Top shape out of Bottom shape (Boolean Subtract)"
              >
                <Scissors className="w-3.5 h-3.5 text-amber-400" />
                <span>Cutout Top (Subtract)</span>
              </button>
            )}

            {(selectedIds.length === 2 || selectedIds.length === 3) && (
              <button
                onClick={onJoinSelectedWithSplit}
                style={{
                  backgroundColor: 'var(--bg-panel-alt)',
                  borderColor: 'var(--border-strong)',
                }}
                className="flex items-center gap-1.5 px-2.5 py-1 rounded-[5px] border font-medium hover:border-accent transition text-[11px]"
                title="Join selected objects side-by-side inside a Split Container with divider"
              >
                <SplitSquareHorizontal className="w-3.5 h-3.5 text-accent" />
                <span>Join Split</span>
              </button>
            )}

            <div style={{ backgroundColor: 'var(--border-main)' }} className="h-4 w-px" />

            <div className="flex items-center gap-0.5">
              <button
                onClick={() => onAlignMultiSelected('left')}
                className="p-1 rounded hover:bg-black/5 dark:hover:bg-white/5 transition"
                title="Align Left"
              >
                <AlignLeft className="w-3.5 h-3.5" />
              </button>
              <button
                onClick={() => onAlignMultiSelected('center-x')}
                className="p-1 rounded hover:bg-black/5 dark:hover:bg-white/5 transition"
                title="Align Center Horizontal"
              >
                <AlignCenter className="w-3.5 h-3.5" />
              </button>
              <button
                onClick={() => onAlignMultiSelected('right')}
                className="p-1 rounded hover:bg-black/5 dark:hover:bg-white/5 transition"
                title="Align Right"
              >
                <AlignRight className="w-3.5 h-3.5" />
              </button>
              <button
                onClick={() => onAlignMultiSelected('top')}
                className="p-1 rounded hover:bg-black/5 dark:hover:bg-white/5 transition"
                title="Align Top"
              >
                <ArrowUp className="w-3.5 h-3.5" />
              </button>
              <button
                onClick={() => onAlignMultiSelected('center-y')}
                className="p-1 rounded hover:bg-black/5 dark:hover:bg-white/5 transition"
                title="Align Center Vertical"
              >
                <ArrowUpDown className="w-3.5 h-3.5" />
              </button>
              <button
                onClick={() => onAlignMultiSelected('bottom')}
                className="p-1 rounded hover:bg-black/5 dark:hover:bg-white/5 transition"
                title="Align Bottom"
              >
                <ArrowDown className="w-3.5 h-3.5" />
              </button>
            </div>

            {selectedIds.length >= 3 && (
              <>
                <div style={{ backgroundColor: 'var(--border-main)' }} className="h-4 w-px" />
                <div className="flex items-center gap-0.5">
                  <button
                    onClick={() => onDistributeMultiSelected('h')}
                    className="p-1 rounded hover:bg-black/5 dark:hover:bg-white/5 transition text-[10px] font-mono flex items-center gap-1"
                    title="Distribute Centers/Edges Horizontally"
                  >
                    <ArrowLeftRight className="w-3 h-3" />
                    <span>Dist H</span>
                  </button>
                  <button
                    onClick={() => onDistributeMultiSelected('gap-h')}
                    className="p-1 rounded hover:bg-black/5 dark:hover:bg-white/5 transition text-[10px] font-mono flex items-center gap-1 text-accent font-semibold"
                    title="Distribute Equal Horizontal Spacing (Figma Gap)"
                  >
                    <span>Gap H</span>
                  </button>
                  <button
                    onClick={() => onDistributeMultiSelected('v')}
                    className="p-1 rounded hover:bg-black/5 dark:hover:bg-white/5 transition text-[10px] font-mono flex items-center gap-1"
                    title="Distribute Centers/Edges Vertically"
                  >
                    <ArrowUpDown className="w-3 h-3" />
                    <span>Dist V</span>
                  </button>
                  <button
                    onClick={() => onDistributeMultiSelected('gap-v')}
                    className="p-1 rounded hover:bg-black/5 dark:hover:bg-white/5 transition text-[10px] font-mono flex items-center gap-1 text-accent font-semibold"
                    title="Distribute Equal Vertical Spacing (Figma Gap)"
                  >
                    <span>Gap V</span>
                  </button>
                </div>
              </>
            )}

            <div style={{ backgroundColor: 'var(--border-main)' }} className="h-4 w-px" />

            <button
              onClick={onDeleteSelected}
              className="p-1 rounded text-red-500 hover:bg-red-500/10 transition"
              title="Delete Selected Items (Del)"
            >
              <Trash2 className="w-3.5 h-3.5" />
            </button>

            <button
              onClick={() => onSelectElement(null, [])}
              className="p-1 rounded text-stone-400 hover:bg-stone-500/10 transition"
              title="Deselect all"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        )}
      </div>

      {/* Bottom Dock */}
      {bottomDockOpen && (
        <BottomDock
          height={bottomDockHeight}
          activeTab={bottomDockTab}
          onTabChange={onChangeBottomDockTab}
          onClose={() => onSetBottomDockOpen(false)}
          onStartResize={(e) => {
            e.preventDefault();
            e.stopPropagation();
            onStartBottomDockResize({
              target: 'bottom',
              startX: e.clientX,
              startY: e.clientY,
              origValue: bottomDockHeight,
            });
          }}
          onResetHeight={onResetBottomDockHeight}
          platform={platform}
          onPlatformChange={onChangePlatform}
          htmlOutput={exportResult.html}
          warnings={exportResult.warnings}
          copied={copied}
          onCopyCode={onCopyCode}
          onExportHtml={onExportHtml}
          previewSrcDoc={previewSrcDoc}
          previewSurface={previewSurface}
          onPreviewSurfaceChange={onChangePreviewSurface}
          previewViewport={previewViewport}
          onPreviewViewportChange={onChangePreviewViewport}
          isDraggingGlobal={Boolean(panelResizeDrag || panDrag || dragState)}
        />
      )}

      {/* Bottom Status Bar */}
      <div
        style={{ backgroundColor: 'var(--bg-panel)', borderColor: 'var(--border-main)' }}
        className="min-h-8 py-1 border-t px-2.5 flex flex-wrap items-center justify-between gap-1.5 text-[11px] shrink-0"
      >
        <div className="flex items-center flex-wrap gap-2.5 min-w-0">
          <span style={{ color: 'var(--text-muted)' }}>
            Solver:{' '}
            <strong style={{ color: 'var(--text-main)' }}>
              {exportResult.stats.layoutStrategy}
            </strong>
          </span>
          <span style={{ color: 'var(--text-muted)' }}>
            {layoutMode === 'freeform' ? (
              <>
                PC Fidelity:{' '}
                <strong className="text-emerald-500">1:1 Desktop Collage</strong>
              </>
            ) : (
              <>
                Mobile Stack:{' '}
                <strong
                  className={
                    exportResult.stats.responsiveScore === 'High'
                      ? 'text-emerald-500'
                      : 'text-amber-500'
                  }
                >
                  {exportResult.stats.responsiveScore}
                </strong>
              </>
            )}
          </span>
          <span
            style={{ color: 'var(--text-muted)' }}
            className="hidden xl:inline text-[10px] font-mono opacity-80"
          >
            • Drag empty space / Space+Drag: Pan • Shift+Drag: Box Select
          </span>
        </div>

        <div className="flex items-center flex-wrap gap-1.5">
          <button
            type="button"
            onClick={() => {
              onChangeBottomDockTab('code');
              onSetBottomDockOpen((o) => (bottomDockTab === 'code' ? !o : true));
            }}
            style={{
              backgroundColor:
                bottomDockOpen && bottomDockTab === 'code'
                  ? 'var(--accent-soft)'
                  : 'var(--bg-input)',
              borderColor:
                bottomDockOpen && bottomDockTab === 'code'
                  ? 'var(--accent)'
                  : 'var(--border-main)',
              color:
                bottomDockOpen && bottomDockTab === 'code'
                  ? 'var(--accent)'
                  : 'var(--text-muted)',
            }}
            className="px-2 py-0.5 border rounded-[5px] text-[10px] font-mono flex items-center gap-1 hover:opacity-90"
            title="Toggle Live HTML Bottom Dock"
          >
            <Code2 className="w-3 h-3" />
            <span>HTML Dock</span>
          </button>
          <button
            type="button"
            onClick={() => {
              onChangeBottomDockTab('preview');
              onSetBottomDockOpen((o) => (bottomDockTab === 'preview' ? !o : true));
            }}
            style={{
              backgroundColor:
                bottomDockOpen && bottomDockTab === 'preview'
                  ? 'var(--accent-soft)'
                  : 'var(--bg-input)',
              borderColor:
                bottomDockOpen && bottomDockTab === 'preview'
                  ? 'var(--accent)'
                  : 'var(--border-main)',
              color:
                bottomDockOpen && bottomDockTab === 'preview'
                  ? 'var(--accent)'
                  : 'var(--text-muted)',
            }}
            className="px-2 py-0.5 border rounded-[5px] text-[10px] font-mono flex items-center gap-1 hover:opacity-90"
            title="Toggle Live Preview Bottom Dock"
          >
            <Eye className="w-3 h-3" />
            <span>Preview Dock</span>
          </button>

          {exportResult.warnings.length === 0 ? (
            <span className="text-emerald-500 flex items-center gap-1 font-medium">
              <Check className="w-3.5 h-3.5" /> Validated for {platform}
            </span>
          ) : (
            <button
              onClick={() => {
                if (rightCollapsed) {
                  onChangeBottomDockTab('code');
                  onSetBottomDockOpen(true);
                } else {
                  onOpenRightCodeTab();
                }
              }}
              className="text-amber-500 hover:underline flex items-center gap-1 font-medium"
            >
              <AlertTriangle className="w-3.5 h-3.5" />
              <span>{exportResult.warnings.length} Platform Notice(s)</span>
            </button>
          )}
        </div>
      </div>

      {contextMenu && (
        <CanvasContextMenu
          menu={contextMenu}
          swatches={swatches}
          selectedIds={selectedIds}
          canvasBg={canvasBg}
          magneticSnap={magneticSnap}
          guidesCount={guides.length}
          hasCopiedStyle={hasCopiedStyle}
          hasClipboardElement={hasClipboardElement}
          onClose={() => setContextMenu(null)}
          onUpdateElement={(id, patch) => {
            if (onUpdateElementById) {
              onUpdateElementById(id, patch);
            } else {
              onUpdateSelected(patch);
            }
          }}
          onAdjustZIndex={onAdjustZIndex}
          onBringToFront={onBringToFront}
          onSendToBack={onSendToBack}
          onRotateSelected90={onRotateSelected90}
          onFlipSelected={onFlipSelected}
          onDuplicateSelected={onDuplicateSelected}
          onCopySelected={onCopySelected}
          onPasteAtPosition={onPasteAtPosition}
          onCopyStyle={onCopyStyle}
          onPasteStyle={onPasteStyle}
          onEnterContainerIsolation={onEnterContainerIsolation}
          onPopOutFromContainer={onPopOutFromContainer}
          onGroupSelectedIntoBox={onGroupSelectedIntoBox}
          onSaveSelectedAsBlueprint={onSaveSelectedAsBlueprint}
          onToggleLock={onToggleLock}
          onToggleHide={onToggleHide}
          onDeleteSelected={onDeleteSelected}
          onOpenSpotlightAt={(x, y) => {
            setSpotlightTargetPos({ x, y });
            onToggleSpotlight?.(true);
          }}
          onQuickAddAtPosition={handleQuickAddPrimitiveAt}
          onToggleTransparentCanvas={() =>
            onChangeCanvasBg(
              canvasBg === 'transparent'
                ? uiTheme === 'cute'
                  ? '#FDF8FF'
                  : uiTheme === 'paper'
                  ? '#FAF8F5'
                  : '#161514'
                : 'transparent'
            )
          }
          onToggleMagneticSnap={onToggleMagneticSnap}
          onFitCanvasToView={onFitCanvasToView}
          onResetZoom={() => {
            onChangeZoom(1);
            onCenterCanvasView();
          }}
          onClearAllGuides={onClearAllGuides}
          onSelectAll={onSelectAll}
          onUnlockAll={onUnlockAll}
          onCopyCode={onCopyCode}
        />
      )}

      <SpotlightQuickAddModal
        open={spotlightOpen}
        isToyhouseFree={isToyhouseFreePlatform}
        customBlueprints={customBlueprints}
        onSelect={(item) => {
          const targetX =
            spotlightTargetPos?.x ?? Math.max(24, Math.round(canvasWidth / 2 - 90));
          const targetY =
            spotlightTargetPos?.y ?? Math.max(24, Math.round(canvasHeight / 2 - 50));
          setSpotlightTargetPos(null);
          if (onAddCatalogItemAtPosition) {
            onAddCatalogItemAtPosition(item, targetX, targetY);
          } else if (item.kind === 'element' && item.elementType) {
            onAddElement(item.elementType);
          }
        }}
        onClose={() => {
          setSpotlightTargetPos(null);
          onToggleSpotlight?.(false);
        }}
      />
    </main>
  );
};
