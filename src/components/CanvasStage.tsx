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
  Lock,
  MousePointer,
  Minus,
  RotateCw,
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
import { DynamicRulerCanvas } from './DynamicRulers';
import { BottomDock } from './BottomDock';
import {
  CanvasContextMenu,
  CanvasContextMenuState,
  FloatingSelectionBar,
  SpotlightQuickAddModal,
} from './CanvasOverlays';
import { isPureContainerType } from '../data/purePrimitives';
import { SearchableCatalogItem, STATIC_CATALOG } from '../data/searchCatalog';
import {
  getElementF2UShieldReport,
  maskElementForF2USimulation,
} from '../engine/f2uShield';
import {
  getFontFamilyCSS,
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
import { PanDragState } from '../hooks/useViewportNavigation';
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
import { getInnerBoxGeometry, getSplitPaneGeometry } from '../utils/canvasGeometry';

export interface CanvasStageProps {
  elements: DesignElement[];
  rootCanvasElements: DesignElement[];
  solvedRows: SolvedRow[];
  exportResult: ExportResult;
  layoutMode: LayoutMode;
  platform: TargetPlatform;
  uiTheme: UiTheme;
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
  cursorCoords: { x: number; y: number };
  cursorInViewport: boolean;
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
  onSetCursorInViewport: (inside: boolean) => void;
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
  onToggleMultiSelectElement: (id: string) => void;
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
  cursorCoords,
  cursorInViewport,
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
  onSetCursorInViewport,
  onSetPanDrag,
  onSetMarqueeSelect,
  onSetDrawMarquee,
  onSetSplitDragState,
  clientToCanvas,
  onPointerDownElement,
  onSelectElement,
  onToggleMultiSelectElement,
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

  const handleViewportDragOver = (e: React.DragEvent) => {
    if (e.dataTransfer.types.includes('application/x-dbx-catalog')) {
      e.preventDefault();
      e.dataTransfer.dropEffect = 'copy';
    }
  };

  const handleViewportDrop = (e: React.DragEvent) => {
    const raw = e.dataTransfer.getData('application/x-dbx-catalog');
    if (!raw || !onAddCatalogItemAtPosition) return;
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
      // Ignore invalid external drag payload
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
          <span
            className="font-mono text-[10px] min-w-[78px] tabular-nums"
            style={{ color: 'var(--text-muted)' }}
          >
            X:{cursorCoords.x} Y:{cursorCoords.y}
          </span>
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
                cursorCanvasPos={cursorInViewport ? cursorCoords.x : null}
                uiTheme={uiTheme}
                guides={guides}
                onStartCreateGuide={(e) => {
                  if (e.button === 0) onStartGuideDrag('y', e.clientX, e.clientY);
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
                cursorCanvasPos={cursorInViewport ? cursorCoords.y : null}
                uiTheme={uiTheme}
                guides={guides}
                onStartCreateGuide={(e) => {
                  if (e.button === 0) onStartGuideDrag('x', e.clientX, e.clientY);
                }}
                onResetPan={onCenterCanvasView}
              />
            </div>
          )}

          <div
            ref={canvasViewportRef}
            onDragOver={handleViewportDragOver}
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
            onPointerEnter={() => onSetCursorInViewport(true)}
            onPointerLeave={() => onSetCursorInViewport(false)}
            onPointerDownCapture={(e) => {
              if (e.button === 1 || (isSpacePressed && e.button === 0)) {
                e.preventDefault();
                e.stopPropagation();
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
            className="flex-1 relative overflow-hidden isolate"
          >
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
                        className="ml-1 px-1.5 py-0.2 rounded-full bg-amber-500 text-white text-[9px] font-bold flex items-center gap-0.5"
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
                          return (
                            <div
                              key={el.id}
                              onPointerDown={(e) => e.stopPropagation()}
                              onClick={(e) => {
                                e.stopPropagation();
                                onSelectElement(el.id, [el.id]);
                              }}
                              style={{
                                gridColumn: `span ${calculatedColSpan} / span ${calculatedColSpan}`,
                              }}
                              className={`cursor-pointer transition relative min-h-[54px] ${
                                selectedId === el.id ? 'ring-2 ring-amber-600 rounded-[8px]' : ''
                              }`}
                            >
                              <div className="absolute top-1 right-1.5 text-[9px] font-mono px-1.5 py-0.5 rounded-[4px] bg-stone-900/85 text-amber-300 z-20">
                                col-{calculatedColSpan}
                              </div>
                              {shieldReport?.isShielded && (
                                <div
                                  className="absolute bottom-1 right-1.5 text-[8.5px] font-mono font-bold px-1.5 py-0.5 rounded-[4px] bg-amber-500/95 text-stone-950 z-20 shadow flex items-center gap-1"
                                  title={`F2U Shielded (${shieldReport.items.map((i) => i.label).join(' · ')}) — Preserved safely & auto-restored in Premium/Carrd`}
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
                          className="absolute top-1 left-1 text-[8.5px] font-mono font-bold px-1 py-0.2 rounded text-white whitespace-nowrap shadow opacity-85 group-hover:opacity-100 pointer-events-none"
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
                          className="absolute left-1 top-1 text-[8.5px] font-mono font-bold px-1 py-0.2 rounded text-white whitespace-nowrap shadow opacity-85 group-hover:opacity-100 pointer-events-none"
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
                      className="absolute z-[99999] pointer-events-none px-1.5 py-0.2 rounded bg-rose-600/95 text-white font-mono text-[8.5px] font-bold shadow"
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
                    const isInlineEditing = inlineEditId === el.id;
                    const isFloating = isFloatingCollageElement(el);
                    const shieldReport = f2uShieldMap.get(el.id);
                    const canvasEl = isToyhouseFreePlatform ? maskElementForF2USimulation(el) : el;
                    const solvedCol =
                      solvedRows
                        .flatMap((r) => r.elements)
                        .find((x) => x.element.id === el.id)?.calculatedColSpan || el.colSpan;
                    const activeTabIdx = activeCanvasTabs[el.id] || 0;

                    return (
                      <div
                        key={el.id}
                        onClick={(e) => {
                          if (canvasTool !== 'select') return;
                          e.stopPropagation();
                          if (e.shiftKey) {
                            onToggleMultiSelectElement(el.id);
                          } else {
                            onSelectElement(el.id, [el.id]);
                          }
                        }}
                        onPointerDown={(e) => {
                          if (canvasTool !== 'select') return;
                          onPointerDownElement(e, el, 'move');
                        }}
                        onDoubleClick={(e) => {
                          e.stopPropagation();
                          if (el.locked || canvasTool !== 'select') return;
                          if (isPureContainerType(el.type) && !e.altKey) {
                            onEnterContainerIsolation(el.id);
                            return;
                          }
                          onSelectElement(el.id, [el.id]);
                          onSetInlineEditId(el.id);
                        }}
                        onContextMenu={(e) => {
                          e.preventDefault();
                          e.stopPropagation();
                          if (!selectedIds.includes(el.id)) {
                            onSelectElement(el.id, [el.id]);
                          }
                          const pos = clientToCanvas(e.clientX, e.clientY);
                          setContextMenu({
                            clientX: e.clientX,
                            clientY: e.clientY,
                            canvasX: Math.round(pos.x),
                            canvasY: Math.round(pos.y),
                            element: el,
                          });
                        }}
                        style={{
                          left: el.x,
                          top: el.y,
                          width: el.width,
                          height: el.height,
                          zIndex:
                            editingContainer?.id === el.id
                              ? 55
                              : isSelected
                              ? 60
                              : el.zIndex || 10,
                          transform: canvasEl.rotation ? `rotate(${canvasEl.rotation}deg)` : undefined,
                          opacity:
                            editingContainer && editingContainer.id !== el.id
                              ? 0.25
                              : el.hidden
                              ? 0.35
                              : undefined,
                          pointerEvents:
                            canvasTool !== 'select' ||
                            (editingContainer && editingContainer.id !== el.id)
                              ? 'none'
                              : undefined,
                        }}
                        className={`absolute ${el.locked ? 'cursor-not-allowed' : 'cursor-move'} ${
                          dropTargetContainerId === el.id
                            ? 'ring-4 ring-emerald-500 bg-emerald-500/5 rounded-[8px]'
                            : editingContainer?.id === el.id
                            ? 'ring-2 ring-amber-500 rounded-[8px]'
                            : isSelected
                            ? 'ring-2 ring-[#C86D51] rounded-[8px]'
                            : ''
                        } ${el.hidden ? 'border border-dashed border-stone-400' : ''} ${
                          !isSelected &&
                          (el.type === 'spacer' ||
                            (el.bgColor === 'transparent' &&
                              (el.borderWidth === 0 || el.borderColor === 'transparent')))
                            ? 'border border-dashed border-stone-400/40 rounded-[6px]'
                            : ''
                        }`}
                      >
                        {dropTargetContainerId === el.id && (
                          <div className="absolute -top-6 left-1/2 -translate-x-1/2 px-2 py-0.5 rounded bg-emerald-600 text-white font-mono text-[9.5px] font-bold shadow z-[90] whitespace-nowrap pointer-events-none">
                            DROP INSIDE: {el.label}
                          </div>
                        )}
                        {el.locked && (
                          <div
                            style={{ backgroundColor: '#D97706', color: '#fff' }}
                            className="absolute top-1 left-1 text-[9px] font-mono px-1.5 py-0.5 rounded-[4px] z-30 pointer-events-none shadow-sm flex items-center gap-1"
                          >
                            <Lock className="w-2.5 h-2.5" />
                            <span>LOCKED</span>
                          </div>
                        )}
                        {el.hidden && (
                          <div
                            style={{ backgroundColor: '#78716C', color: '#fff' }}
                            className="absolute bottom-1 left-1 text-[9px] font-mono px-1.5 py-0.5 rounded-[4px] z-30 pointer-events-none shadow-sm flex items-center gap-1"
                          >
                            <EyeOff className="w-2.5 h-2.5" />
                            <span>HIDDEN</span>
                          </div>
                        )}
                        {shieldReport?.isShielded && (
                          <div
                            className="absolute bottom-1 right-1 text-[8.5px] font-mono font-bold px-1.5 py-0.5 rounded-[4px] bg-amber-500/95 text-stone-950 z-30 pointer-events-auto shadow-sm flex items-center gap-1"
                            title={`F2U Shield Masked: ${shieldReport.items.map((i) => i.label).join(' · ')} — Preserved safely & auto-restores in Toyhouse Premium / Carrd Pro`}
                          >
                            <ShieldAlert className="w-2.5 h-2.5 shrink-0" />
                            <span>F2U Shield ({shieldReport.items.length})</span>
                          </div>
                        )}

                        {isSelected && !el.locked && (selectedIds.length <= 1 || isPrimary) && (
                          <>
                            <div
                              onClick={(e) => e.stopPropagation()}
                              onPointerDown={(e) => onPointerDownElement(e, el, 'rotate')}
                              style={{ backgroundColor: 'var(--accent)', color: '#fff' }}
                              className="absolute -bottom-5 left-1/2 -translate-x-1/2 px-1.5 py-0.2 rounded-full text-[8.5px] font-mono cursor-ew-resize flex items-center gap-0.5 shadow z-50"
                              title="Drag horizontally to rotate element"
                            >
                              <RotateCw className="w-2.5 h-2.5" />
                              <span>
                                {el.rotation || 0}°
                                {isToyhouseFreePlatform && el.rotation && Math.round(el.rotation) % 90 !== 0
                                  ? el.type === 'pure_line'
                                    ? ' (F2U Line)'
                                    : ' (0° F2U)'
                                  : ''}
                              </span>
                            </div>

                            <div
                              style={{ backgroundColor: 'var(--accent)', color: '#fff' }}
                              className="absolute top-1 right-1 text-[9px] font-mono px-1.5 py-0.5 rounded-[4px] z-30 pointer-events-none shadow-sm"
                            >
                              {layoutMode === 'hybrid'
                                ? isFloating
                                  ? `FLOAT (z:${el.zIndex || 20})`
                                  : `col-lg-${solvedCol}`
                                : `${el.x},${el.y}`}
                            </div>
                          </>
                        )}

                        {isInlineEditing ? (
                          <div
                            onClick={(e) => e.stopPropagation()}
                            onPointerDown={(e) => e.stopPropagation()}
                            className="w-full h-full flex flex-col gap-1 p-2 bg-stone-900/95 rounded-[8px] z-40"
                          >
                            <input
                              autoFocus
                              value={el.content}
                              onChange={(e) => onUpdateSelected({ content: e.target.value })}
                              onKeyDown={(e) => {
                                if (e.key === 'Escape' || e.key === 'Enter') onSetInlineEditId(null);
                              }}
                              className="w-full bg-stone-800 text-white px-2 py-1 rounded border border-amber-500 text-xs font-bold"
                            />
                            {el.subContent !== undefined && (
                              <textarea
                                value={el.subContent}
                                onChange={(e) => onUpdateSelected({ subContent: e.target.value })}
                                className="w-full flex-1 bg-stone-800 text-white px-2 py-1 rounded border border-amber-500 text-[11px]"
                              />
                            )}
                          </div>
                        ) : (el.type === 'tabs' || el.type === 'pure_f2u_tabs') && el.tabs ? (
                          <div
                            style={{
                              backgroundColor: canvasEl.bgColor,
                              color: canvasEl.textColor,
                              borderColor: canvasEl.borderColor,
                              borderWidth: canvasEl.borderWidth,
                              borderStyle: canvasEl.borderStyle || 'solid',
                              borderRadius: canvasEl.borderRadius,
                              padding: canvasEl.padding,
                              fontFamily: `${canvasEl.googleFont ? `'${canvasEl.googleFont}', ` : ''}${getFontFamilyCSS(canvasEl.fontFamily)}`,
                            }}
                            className="w-full h-full flex flex-col overflow-hidden"
                          >
                            <div className="font-bold text-xs mb-1.5">{el.content}</div>
                            <div className="flex flex-wrap gap-1 border-b border-black/10 pb-1.5 mb-2">
                              {el.tabs.map((tab, tIdx) => (
                                <button
                                  key={tab.id}
                                  onClick={(e) => e.stopPropagation()}
                                  onPointerDown={(e) => {
                                    e.stopPropagation();
                                    onSetActiveCanvasTabs((prev) => ({
                                      ...prev,
                                      [el.id]: tIdx,
                                    }));
                                    onSelectElement(el.id);
                                  }}
                                  style={
                                    activeTabIdx === tIdx
                                      ? { backgroundColor: el.borderColor, color: '#fff' }
                                      : { backgroundColor: 'rgba(150,150,150,0.15)' }
                                  }
                                  className="px-2 py-0.5 rounded-[5px] text-[10px] font-mono transition"
                                >
                                  {tab.title}
                                </button>
                              ))}
                            </div>
                            <div className="text-xs opacity-90 whitespace-pre-line overflow-y-auto flex-1 leading-relaxed pointer-events-none">
                              {el.tabs[activeTabIdx]?.content}
                            </div>
                          </div>
                        ) : (
                          <div
                            className="w-full h-full pointer-events-none overflow-hidden"
                            dangerouslySetInnerHTML={{
                              __html: renderInnerElementHTML(
                                {
                                  ...el,
                                  rotation:
                                    el.type === 'pure_line' &&
                                    isToyhouseFreePlatform &&
                                    el.rotation &&
                                    Math.round(el.rotation) % 90 !== 0
                                      ? el.rotation
                                      : 0,
                                },
                                platform.startsWith('toyhouse'),
                                elements,
                                false,
                                isToyhouseFreePlatform
                              ),
                            }}
                          />
                        )}

                        {isSelected && !el.locked && (selectedIds.length <= 1 || isPrimary) && (
                          <>
                            {RESIZE_HANDLES.map((h) => (
                              <div
                                key={h.dir}
                                onClick={(e) => e.stopPropagation()}
                                onPointerDown={(e) =>
                                  onPointerDownElement(e, el, 'resize', h.dir)
                                }
                                style={{ backgroundColor: 'var(--accent)' }}
                                className={`w-3 h-3 rounded-full border border-white absolute z-40 shadow ${h.cls}`}
                              />
                            ))}

                            {(() => {
                              const splitMod = (el.modifiers || []).find(
                                (m): m is SplitModifier => m.kind === 'split' && m.enabled
                              );
                              if (!splitMod) return null;
                              const isVert = splitMod.axis === 'vertical';
                              return (
                                <div
                                  onClick={(e) => e.stopPropagation()}
                                  onPointerDown={(e) => {
                                    e.stopPropagation();
                                    const parentRect = (
                                      e.currentTarget.parentElement as HTMLElement
                                    )?.getBoundingClientRect();
                                    if (!parentRect) return;
                                    onSetSplitDragState({
                                      elementId: el.id,
                                      modifierId: splitMod.id,
                                      axis: splitMod.axis,
                                      boxLeftPx: parentRect.left,
                                      boxTopPx: parentRect.top,
                                      boxW: parentRect.width,
                                      boxH: parentRect.height,
                                    });
                                  }}
                                  style={{
                                    left: isVert ? `${splitMod.ratio}%` : '50%',
                                    top: isVert ? '50%' : `${splitMod.ratio}%`,
                                    backgroundColor: '#18181B',
                                    color: '#FFFFFF',
                                  }}
                                  className={`absolute -translate-x-1/2 -translate-y-1/2 px-1.5 py-0.5 rounded-full text-[9px] font-mono font-bold border border-white shadow-md z-50 select-none ${
                                    isVert ? 'cursor-ew-resize' : 'cursor-ns-resize'
                                  }`}
                                  title="Drag to resize Split Pane Ratio %"
                                >
                                  {splitMod.ratio}%
                                </div>
                              );
                            })()}
                          </>
                        )}
                      </div>
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
                                    left: editingContainer.x + bL + pRect.paneX,
                                    top: editingContainer.y + bT + pRect.paneY,
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
                            const cx = editingContainer.x + bL + pRect.paneX + ox;
                            const cy = editingContainer.y + bT + pRect.paneY + oy;
                            const isChildSelected = selectedId === child.id;
                            return (
                              <div
                                key={`iso-child-${child.id}`}
                                onClick={(e) => {
                                  e.stopPropagation();
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
                                className={`absolute cursor-move rounded-[5px] ${
                                  isChildSelected
                                    ? 'ring-2 ring-amber-500 bg-amber-500/10'
                                    : 'border border-dashed border-amber-400/75 hover:border-amber-500'
                                }`}
                                title={`Child: ${child.label} (X:${ox}, Y:${oy})`}
                              >
                                <div className="absolute -top-4 left-0 bg-amber-500 text-white text-[8.5px] font-mono px-1 rounded shadow pointer-events-none whitespace-nowrap">
                                  {child.label} • X:{ox} Y:{oy}
                                  {activeSplitParent ? ` • P${pIdx + 1}` : ''}
                                </div>
                                {isChildSelected &&
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
            className="absolute bottom-3 left-1/2 -translate-x-1/2 z-[95] border rounded-lg px-2.5 py-1.5 max-w-[calc(100%-20px)] flex flex-wrap items-center justify-center gap-1.5 text-xs shadow-xl animate-in fade-in slide-in-from-bottom-2 duration-200"
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
