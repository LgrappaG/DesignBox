import React, { useEffect, useState } from 'react';
import {
  AlertTriangle,
  Code2,
  CopyPlus,
  Eye,
  EyeOff,
  FileText,
  Info,
  LayoutGrid,
  Lock,
  MousePointerClick,
  Palette,
  PanelRightClose,
  PanelRightOpen,
  ShieldAlert,
  ShieldCheck,
  Sparkles,
  Terminal,
  Trash2,
  Type,
  Unlock,
  Wrench,
} from 'lucide-react';
import { getElementF2UShieldReport } from '../engine/f2uShield';
import { PanelResizeDragState } from '../hooks/useCanvasPointer';
import {
  BgPattern,
  DesignElement,
  ExportResult,
  LayoutMode,
  TargetPlatform,
} from '../types/schema';
import {
  getInspectorSectionSummaries,
  isTypographyRelevantForElement,
} from '../utils/inspectorHelpers';
import {
  isTauriRuntime,
  NativeValidationReport,
  validatePlatformSnippetNative,
} from '../utils/tauriDesktop';
import {
  F2UBootstrapAndFaSection,
  F2UInteractionAndAtomsSection,
  RawHtmlCssOverrideSection,
} from './PureInspectorSections';
import {
  CanvasSettingsInspector,
  MultiSelectBatchInspector,
} from './inspector/BatchAndCanvasInspector';
import { ContentAndWidgetsSection } from './inspector/ContentAndWidgetsSection';
import { EffectsAndMotionSection } from './inspector/EffectsAndMotionSection';
import { InspectorCollapsibleSection } from './inspector/InspectorCollapsibleSection';
import { InteractionsAndMotionSection } from './inspector/InteractionsAndMotionSection';
import {
  LayoutGeometrySection,
  QuickAlignToolbar,
} from './inspector/LayoutGeometrySection';
import { StyleSurfaceAndColorsSection } from './inspector/StyleSurfaceAndColorsSection';
import { TypographySection } from './inspector/TypographySection';

export type InspectorTab = 'style' | 'layout' | 'effects' | 'f2u_code';

export interface RightInspectorProps {
  rightCollapsed: boolean;
  rightPanelWidth: number;
  panelResizeDrag: PanelResizeDragState | null;
  inspectorTab: InspectorTab;
  elements: DesignElement[];
  selectedElement: DesignElement | null;
  selectedIds?: string[];
  canvasWidth?: number;
  canvasHeight?: number;
  canvasBg?: string;
  canvasPattern?: BgPattern;
  containerCandidates: DesignElement[];
  nestedChildren: DesignElement[];
  layoutMode: LayoutMode;
  editingContainerId: string | null;
  platform: TargetPlatform;
  exportResult: ExportResult;
  copied: boolean;
  swatches: string[];
  swatchTarget: 'bgColor' | 'borderColor' | 'textColor';
  uploadingImage: boolean;
  imageUploadTarget: string | null;
  uploadNotice: string | null;
  onChangeCanvasWidth?: (w: number) => void;
  onChangeCanvasHeight?: (h: number) => void;
  onChangeCanvasBg?: (bg: string) => void;
  onChangeCanvasPattern?: (pattern: BgPattern) => void;
  onBatchUpdateSelected?: (patch: Partial<DesignElement>) => void;
  onAlignMultiSelected?: (
    axis: 'left' | 'center-x' | 'right' | 'top' | 'center-y' | 'bottom'
  ) => void;
  onDistributeMultiSelected?: (mode: 'h' | 'v' | 'gap-h' | 'gap-v') => void;
  onGroupSelectedIntoBox?: () => void;
  onClearSelection?: () => void;
  onExpandRight: () => void;
  onCollapseRight: () => void;
  onStartPanelResize: (drag: PanelResizeDragState) => void;
  onResetRightWidth: () => void;
  onChangeInspectorTab: (tab: InspectorTab) => void;
  onUpdateSelected: (patch: Partial<DesignElement>) => void;
  onSelectElementById: (id: string) => void;
  onToggleLock: (id: string) => void;
  onToggleHide: (id: string) => void;
  onAdjustZIndex: (delta: number) => void;
  onDuplicateSelected: () => void;
  onDeleteSelected: () => void;
  onAlignSelectedOnCanvas: (
    align: 'left' | 'center-x' | 'right' | 'top' | 'center-y' | 'bottom' | 'full-w'
  ) => void;
  onNestIntoContainer: (childId: string, containerId: string | null) => void;
  onPopOutFromContainer: (childId: string) => void;
  onReorderNestedChild: (parentId: string, childId: string, dir: 'up' | 'down') => void;
  onEnterContainerIsolation: (containerId: string) => void;
  onExitContainerIsolation: () => void;
  onTriggerImageUpload: (target: string) => void;
  onSetSwatchTarget: (target: 'bgColor' | 'borderColor' | 'textColor') => void;
  onAddSelectedColorToSwatches: () => void;
  onApplySwatchColor: (hex: string) => void;
  onRemoveSwatch: (hex: string) => void;
  onChangePlatform: (platform: TargetPlatform) => void;
  onCopyCode: () => void;
  onExportHtml: () => void;
}

const COMPACT_TABS: Array<{
  id: InspectorTab;
  label: string;
  title: string;
  icon: React.ComponentType<{ className?: string }>;
}> = [
  { id: 'style', label: 'Design', title: 'Content, Colors, Typography, Geometry & Effects', icon: Palette },
  { id: 'f2u_code', label: 'Code & Export', title: 'Bootstrap/FA Helpers, Sanitizer & HTML Export', icon: Code2 },
];

/** 2-Tab Compact Right Inspector (`Design | Code & Pro`), plus Canvas Setup & Multi-Select Batch controls. */
export const RightInspector: React.FC<RightInspectorProps> = ({
  rightCollapsed,
  rightPanelWidth,
  panelResizeDrag,
  inspectorTab,
  elements,
  selectedElement,
  selectedIds = [],
  canvasWidth = 760,
  canvasHeight = 540,
  canvasBg = 'transparent',
  canvasPattern = 'none',
  containerCandidates,
  nestedChildren,
  layoutMode,
  editingContainerId,
  platform,
  exportResult,
  copied,
  swatches,
  swatchTarget,
  uploadingImage,
  imageUploadTarget,
  uploadNotice,
  onChangeCanvasWidth,
  onChangeCanvasHeight,
  onChangeCanvasBg,
  onChangeCanvasPattern,
  onBatchUpdateSelected,
  onAlignMultiSelected,
  onDistributeMultiSelected,
  onGroupSelectedIntoBox,
  onClearSelection,
  onExpandRight,
  onCollapseRight,
  onStartPanelResize,
  onResetRightWidth,
  onChangeInspectorTab,
  onUpdateSelected,
  onSelectElementById,
  onToggleLock,
  onToggleHide,
  onAdjustZIndex,
  onDuplicateSelected,
  onDeleteSelected,
  onAlignSelectedOnCanvas,
  onNestIntoContainer,
  onPopOutFromContainer,
  onReorderNestedChild,
  onEnterContainerIsolation,
  onExitContainerIsolation,
  onTriggerImageUpload,
  onSetSwatchTarget,
  onAddSelectedColorToSwatches,
  onApplySwatchColor,
  onRemoveSwatch,
  onCopyCode,
  onExportHtml,
}) => {
  const isToyhouseFree = platform === 'toyhouse_free' || platform === 'toyhouse_oc';
  const [showProEffectsInF2U, setShowProEffectsInF2U] = useState(false);
  const [openSections, setOpenSections] = useState<
    Record<
      | 'content'
      | 'layout'
      | 'appearance'
      | 'typography'
      | 'effects'
      | 'interactions'
      | 'bs_fa'
      | 'f2u_atoms'
      | 'raw_override',
      boolean
    >
  >({
    content: true,
    layout: true,
    appearance: false,
    typography: false,
    effects: false,
    interactions: false,
    bs_fa: false,
    f2u_atoms: false,
    raw_override: false,
  });
  const toggleSection = (
    id:
      | 'content'
      | 'layout'
      | 'appearance'
      | 'typography'
      | 'effects'
      | 'interactions'
      | 'bs_fa'
      | 'f2u_atoms'
      | 'raw_override'
  ) => {
    setOpenSections((prev) => ({ ...prev, [id]: !prev[id] }));
  };
  const activeTab: InspectorTab = inspectorTab === 'f2u_code' ? 'f2u_code' : 'style';
  const multiSelectedElements =
    selectedIds.length > 1
      ? elements.filter((el) => selectedIds.includes(el.id))
      : [];
  const selectedShieldReport =
    selectedElement && isToyhouseFree ? getElementF2UShieldReport(selectedElement) : null;
  const sectionSummaries = selectedElement
    ? getInspectorSectionSummaries(selectedElement, nestedChildren.length)
    : null;
  const [nativeValidation, setNativeValidation] = useState<NativeValidationReport | null>(null);

  useEffect(() => {
    if (inspectorTab !== 'f2u_code' || !isTauriRuntime()) {
      setNativeValidation(null);
      return;
    }
    let cancelled = false;
    void validatePlatformSnippetNative(exportResult.html, platform).then((report) => {
      if (!cancelled) {
        setNativeValidation(report);
      }
    });
    return () => {
      cancelled = true;
    };
  }, [inspectorTab, exportResult.html, platform]);

  const warningCount = exportResult.warnings.length;
  const hasErrors = exportResult.warnings.some((w) => w.severity === 'error');

  if (rightCollapsed) {
    return (
      <div
        style={{ backgroundColor: 'var(--bg-panel)', borderColor: 'var(--border-main)' }}
        className="w-7 border-l flex flex-col items-center py-2 gap-3 shrink-0"
      >
        <button
          type="button"
          onClick={onExpandRight}
          className="p-1 rounded hover:bg-black/10 dark:hover:bg-white/10 transition"
          title="Expand Dynamic Inspector Panel"
        >
          <PanelRightOpen className="w-4 h-4" style={{ color: 'var(--accent)' }} />
        </button>
        <span
          onClick={onExpandRight}
          style={{ color: 'var(--text-muted)', writingMode: 'vertical-rl' }}
          className="text-[10px] font-mono uppercase tracking-widest cursor-pointer select-none"
        >
          Dynamic Inspector
        </span>
      </div>
    );
  }

  return (
    <>
      {/* Right Panel Resize Handle */}
      <div
        onPointerDown={(e) => {
          e.preventDefault();
          onStartPanelResize({
            target: 'right',
            startX: e.clientX,
            startY: e.clientY,
            origValue: rightPanelWidth,
          });
        }}
        onDoubleClick={onResetRightWidth}
        title="Drag left/right to resize Inspector Panel • Double-click to reset (320px)"
        style={{
          backgroundColor:
            panelResizeDrag?.target === 'right' ? 'var(--accent)' : 'transparent',
        }}
        className="w-1.5 -mr-[3px] z-30 cursor-col-resize hover:bg-amber-500/40 transition-colors shrink-0 flex items-center justify-center group"
      >
        <div className="w-0.5 h-10 rounded-full bg-stone-400/30 group-hover:bg-amber-500 transition" />
      </div>

      <aside
        style={{
          width: rightPanelWidth,
          backgroundColor: 'var(--bg-panel)',
          borderColor: 'var(--border-main)',
        }}
        className="border-l flex flex-col shrink-0 overflow-hidden"
      >
        {/* Top 4-Tab Header Bar */}
        <div style={{ borderColor: 'var(--border-main)' }} className="flex items-stretch border-b shrink-0">
          <button
            type="button"
            onClick={onCollapseRight}
            style={{ borderColor: 'var(--border-main)', color: 'var(--text-muted)' }}
            className="px-1.5 border-r hover:bg-black/5 dark:hover:bg-white/5 transition shrink-0 flex items-center"
            title="Collapse Inspector Panel"
          >
            <PanelRightClose className="w-3.5 h-3.5" />
          </button>

          <div className="flex-1 grid grid-cols-2 min-w-0">
            {COMPACT_TABS.map((tab) => {
              const Icon = tab.icon;
              const isActive = activeTab === tab.id;
              return (
                <button
                  key={tab.id}
                  type="button"
                  onClick={() => onChangeInspectorTab(tab.id)}
                  style={{
                    borderBottomColor: isActive ? 'var(--accent)' : 'transparent',
                    color: isActive ? 'var(--text-main)' : 'var(--text-muted)',
                  }}
                  className="relative py-2 px-1 min-w-0 text-[10.5px] font-semibold border-b-2 transition flex items-center justify-center gap-1 truncate"
                  title={tab.title}
                >
                  <Icon className="w-3 h-3 shrink-0" />
                  <span className="truncate">{tab.label}</span>
                  {tab.id === 'f2u_code' && warningCount > 0 && (
                    <span
                      className={`w-1.5 h-1.5 rounded-full shrink-0 ${
                        hasErrors ? 'bg-red-500' : 'bg-amber-500'
                      }`}
                    />
                  )}
                </button>
              );
            })}
          </div>
        </div>

        {/* Selected Element Header & Status Banners */}
        {selectedElement && multiSelectedElements.length <= 1 && (
          <div style={{ borderColor: 'var(--border-main)' }} className="px-3.5 pt-2.5 pb-2 border-b space-y-2 shrink-0">
            <div className="flex flex-wrap items-center justify-between gap-1.5">
              <div className="min-w-0 flex-1">
                <input
                  type="text"
                  value={selectedElement.label}
                  onChange={(e) => onUpdateSelected({ label: e.target.value })}
                  style={{ color: 'var(--text-main)' }}
                  className="font-semibold text-xs bg-transparent border-b border-transparent focus:border-amber-600 focus:outline-none w-full"
                  title="Click to rename layer"
                />
                <div style={{ color: 'var(--text-muted)' }} className="text-[10px] font-mono uppercase">
                  {selectedElement.type} · Z:{selectedElement.zIndex || 10}
                </div>
              </div>
              <div className="flex items-center gap-1 shrink-0">
                <button
                  type="button"
                  onClick={() => onToggleLock(selectedElement.id)}
                  style={{
                    backgroundColor: selectedElement.locked
                      ? 'rgba(217, 119, 6, 0.15)'
                      : 'var(--bg-panel-alt)',
                    borderColor: selectedElement.locked ? '#D97706' : 'var(--border-main)',
                    color: selectedElement.locked ? '#D97706' : 'inherit',
                  }}
                  className="p-1.5 rounded-[5px] border hover:opacity-80 transition"
                  title={selectedElement.locked ? 'Unlock Layer' : 'Lock Layer'}
                >
                  {selectedElement.locked ? <Lock className="w-3.5 h-3.5" /> : <Unlock className="w-3.5 h-3.5" />}
                </button>
                <button
                  type="button"
                  onClick={() => onToggleHide(selectedElement.id)}
                  style={{
                    backgroundColor: selectedElement.hidden
                      ? 'rgba(120, 113, 108, 0.15)'
                      : 'var(--bg-panel-alt)',
                    borderColor: selectedElement.hidden ? '#78716C' : 'var(--border-main)',
                    color: selectedElement.hidden ? '#78716C' : 'inherit',
                  }}
                  className="p-1.5 rounded-[5px] border hover:opacity-80 transition"
                  title={selectedElement.hidden ? 'Show Layer' : 'Hide Layer'}
                >
                  {selectedElement.hidden ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                </button>
                <button
                  type="button"
                  onClick={() => onAdjustZIndex(5)}
                  style={{
                    backgroundColor: 'var(--bg-panel-alt)',
                    borderColor: 'var(--border-main)',
                  }}
                  className="px-1.5 py-1 rounded-[5px] border text-[10px] font-mono hover:opacity-80"
                  title="Bring Forward (+Z)"
                >
                  +Z
                </button>
                <button
                  type="button"
                  onClick={() => onAdjustZIndex(-5)}
                  style={{
                    backgroundColor: 'var(--bg-panel-alt)',
                    borderColor: 'var(--border-main)',
                  }}
                  className="px-1.5 py-1 rounded-[5px] border text-[10px] font-mono hover:opacity-80"
                  title="Send Backward (-Z)"
                >
                  -Z
                </button>
                <button
                  type="button"
                  onClick={onDuplicateSelected}
                  style={{
                    backgroundColor: 'var(--bg-panel-alt)',
                    borderColor: 'var(--border-main)',
                  }}
                  className="p-1.5 rounded-[5px] border hover:opacity-80"
                  title="Duplicate (Ctrl+D)"
                >
                  <CopyPlus className="w-3.5 h-3.5" />
                </button>
                <button
                  type="button"
                  onClick={onDeleteSelected}
                  className="p-1.5 rounded-[5px] bg-red-500/15 text-red-500 hover:bg-red-500/25"
                  title="Delete (Del)"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>

            <QuickAlignToolbar
              pinnedOverlay={Boolean(selectedElement.pinnedOverlay)}
              onTogglePinnedOverlay={(next) => onUpdateSelected({ pinnedOverlay: next })}
              onAlignSelectedOnCanvas={onAlignSelectedOnCanvas}
            />

            {selectedShieldReport?.isShielded && (
              <div className="p-2 rounded-[6px] bg-amber-500/10 border border-amber-500/35 space-y-1 text-[10.5px] text-amber-700 dark:text-amber-300">
                <div className="flex items-center justify-between gap-2 font-semibold">
                  <div className="flex items-center gap-1.5">
                    <ShieldAlert className="w-3.5 h-3.5 shrink-0 text-amber-500" />
                    <span>F2U Shield Active ({selectedShieldReport.items.length})</span>
                  </div>
                  <span className="text-[9px] font-mono px-1.5 py-0.5 rounded bg-amber-500/15 border border-amber-500/30">
                    Preserved
                  </span>
                </div>
                <p className="text-[10px] leading-snug opacity-90">
                  Masked on Canvas &amp; stripped cleanly in F2U export. Pro settings stay saved and restore in Toyhouse Premium / Carrd.
                </p>
                <div className="flex flex-wrap gap-1 pt-0.5">
                  {selectedShieldReport.items.map((item) => (
                    <span
                      key={item.key}
                      title={item.detail}
                      className="px-1.5 py-0.5 rounded bg-amber-500/15 border border-amber-500/30 font-mono text-[9px] leading-tight"
                    >
                      {item.label}
                    </span>
                  ))}
                </div>
              </div>
            )}

            {selectedElement.locked && (
              <div className="p-2 rounded-[6px] bg-amber-500/10 border border-amber-500/30 flex items-center justify-between text-xs text-amber-600 dark:text-amber-400">
                <div className="flex items-center gap-1.5">
                  <Lock className="w-3.5 h-3.5 shrink-0" />
                  <span>Element is locked (Read-only)</span>
                </div>
                <button
                  type="button"
                  onClick={() => onToggleLock(selectedElement.id)}
                  className="text-[10px] font-mono font-bold underline hover:opacity-80"
                >
                  Unlock
                </button>
              </div>
            )}

            {selectedElement.hidden && (
              <div className="p-2 rounded-[6px] bg-stone-500/10 border border-stone-500/30 flex items-center justify-between text-xs text-stone-500">
                <div className="flex items-center gap-1.5">
                  <EyeOff className="w-3.5 h-3.5 shrink-0" />
                  <span>Element is hidden from export</span>
                </div>
                <button
                  type="button"
                  onClick={() => onToggleHide(selectedElement.id)}
                  className="text-[10px] font-mono font-bold underline hover:opacity-80"
                >
                  Show
                </button>
              </div>
            )}
          </div>
        )}

        {/* Active Tab Body */}
        {activeTab !== 'f2u_code' ? (
          multiSelectedElements.length > 1 ? (
            <MultiSelectBatchInspector
              selectedElements={multiSelectedElements}
              swatches={swatches}
              onBatchUpdateSelected={onBatchUpdateSelected}
              onAlignMultiSelected={onAlignMultiSelected}
              onDistributeMultiSelected={onDistributeMultiSelected}
              onGroupSelectedIntoBox={onGroupSelectedIntoBox}
              onDeleteSelected={onDeleteSelected}
              onClearSelection={onClearSelection}
            />
          ) : selectedElement && sectionSummaries ? (
            <div className="flex-1 overflow-y-auto p-3.5 space-y-2.5 text-xs">
              <InspectorCollapsibleSection
                id="content"
                title="Content & Widget"
                icon={FileText}
                summary={sectionSummaries.content}
                isOpen={openSections.content}
                onToggle={() => toggleSection('content')}
              >
                <ContentAndWidgetsSection
                  el={selectedElement}
                  updateSelected={onUpdateSelected}
                  isToyhouseFree={isToyhouseFree}
                  swatches={swatches}
                  uploadingImage={uploadingImage}
                  imageUploadTarget={imageUploadTarget}
                  uploadNotice={uploadNotice}
                  onTriggerImageUpload={onTriggerImageUpload}
                />
              </InspectorCollapsibleSection>

              <InspectorCollapsibleSection
                id="layout"
                title="Position, Size & Layout"
                icon={LayoutGrid}
                summary={sectionSummaries.layout}
                isOpen={openSections.layout}
                onToggle={() => toggleSection('layout')}
              >
                <LayoutGeometrySection
                  el={selectedElement}
                  allElements={elements}
                  containerCandidates={containerCandidates}
                  nestedChildren={nestedChildren}
                  layoutMode={layoutMode}
                  editingContainerId={editingContainerId}
                  isToyhouseFree={isToyhouseFree}
                  updateSelected={onUpdateSelected}
                  onSelectElementById={onSelectElementById}
                  onNestIntoContainer={onNestIntoContainer}
                  onPopOutFromContainer={onPopOutFromContainer}
                  onReorderNestedChild={onReorderNestedChild}
                  onEnterContainerIsolation={onEnterContainerIsolation}
                  onExitContainerIsolation={onExitContainerIsolation}
                />
              </InspectorCollapsibleSection>

              <InspectorCollapsibleSection
                id="appearance"
                title="Colors, Surface & Border"
                icon={Palette}
                summary={
                  <span className="inline-flex items-center gap-1.5">
                    <span
                      className="w-2.5 h-2.5 rounded-[3px] border border-black/20 shrink-0"
                      style={{ backgroundColor: selectedElement.bgColor || 'transparent' }}
                    />
                    <span className="truncate">{sectionSummaries.appearance}</span>
                  </span>
                }
                isOpen={openSections.appearance}
                onToggle={() => toggleSection('appearance')}
              >
                <StyleSurfaceAndColorsSection
                  el={selectedElement}
                  updateSelected={onUpdateSelected}
                  isToyhouseFree={isToyhouseFree}
                  swatches={swatches}
                  swatchTarget={swatchTarget}
                  setSwatchTarget={onSetSwatchTarget}
                  onAddSelectedColorToSwatches={onAddSelectedColorToSwatches}
                  onApplySwatchColor={onApplySwatchColor}
                  onRemoveSwatch={onRemoveSwatch}
                />
              </InspectorCollapsibleSection>

              {isTypographyRelevantForElement(selectedElement) && (
                <InspectorCollapsibleSection
                  id="typography"
                  title="Typography"
                  icon={Type}
                  summary={sectionSummaries.typography}
                  isOpen={openSections.typography}
                  onToggle={() => toggleSection('typography')}
                >
                  <TypographySection
                    el={selectedElement}
                    updateSelected={onUpdateSelected}
                  />
                </InspectorCollapsibleSection>
              )}

              {isToyhouseFree && (openSections.effects || openSections.interactions) && (
                <div
                  style={{
                    backgroundColor: 'var(--bg-input)',
                    borderColor: 'var(--border-strong)',
                  }}
                  className="px-2.5 py-1.5 rounded-[7px] border flex items-center justify-between gap-2 text-[10px]"
                >
                  <span style={{ color: 'var(--text-muted)' }}>
                    {showProEffectsInF2U
                      ? 'Showing Pro CSS controls alongside F2U'
                      : 'Pro-only CSS effects hidden for clean F2U editing'}
                  </span>
                  <button
                    type="button"
                    onClick={() => setShowProEffectsInF2U((v) => !v)}
                    style={{ color: 'var(--accent)' }}
                    className="font-semibold hover:underline shrink-0"
                  >
                    {showProEffectsInF2U ? 'Hide Pro' : 'Show Pro-only effects'}
                  </button>
                </div>
              )}

              <InspectorCollapsibleSection
                id="effects"
                title="Effects, Shadow & Modifiers"
                icon={Sparkles}
                summary={sectionSummaries.effects}
                isOpen={openSections.effects}
                onToggle={() => toggleSection('effects')}
              >
                <EffectsAndMotionSection
                  el={selectedElement}
                  updateSelected={onUpdateSelected}
                  isToyhouseFree={isToyhouseFree}
                  swatches={swatches}
                  showProControls={!isToyhouseFree || showProEffectsInF2U}
                />
              </InspectorCollapsibleSection>

              <InspectorCollapsibleSection
                id="interactions"
                title="Interactions, Link & Motion"
                icon={MousePointerClick}
                summary={sectionSummaries.interactions}
                isOpen={openSections.interactions}
                onToggle={() => toggleSection('interactions')}
              >
                <InteractionsAndMotionSection
                  el={selectedElement}
                  updateSelected={onUpdateSelected}
                  isToyhouseFree={isToyhouseFree}
                  showProControls={!isToyhouseFree || showProEffectsInF2U}
                  uploadingImage={uploadingImage}
                  onTriggerImageUpload={onTriggerImageUpload}
                />
              </InspectorCollapsibleSection>
            </div>
          ) : (
            <CanvasSettingsInspector
              canvasWidth={canvasWidth}
              canvasHeight={canvasHeight}
              canvasBg={canvasBg}
              canvasPattern={canvasPattern}
              swatches={swatches}
              layoutMode={layoutMode}
              onChangeCanvasWidth={onChangeCanvasWidth}
              onChangeCanvasHeight={onChangeCanvasHeight}
              onChangeCanvasBg={onChangeCanvasBg}
              onChangeCanvasPattern={onChangeCanvasPattern}
              onRemoveSwatch={onRemoveSwatch}
            />
          )
        ) : (
          /* Code & Export Tab (Accessible with or without selected element) */
          <div className="flex-1 flex flex-col overflow-y-auto p-3.5 space-y-2.5 text-xs">
            {selectedElement && sectionSummaries && (
              <>
                <InspectorCollapsibleSection
                  id="bs_fa"
                  title="Bootstrap 4 & Font Awesome"
                  icon={Wrench}
                  summary={sectionSummaries.bsFa}
                  isOpen={openSections.bs_fa}
                  onToggle={() => toggleSection('bs_fa')}
                >
                  <F2UBootstrapAndFaSection
                    el={selectedElement}
                    updateSelected={onUpdateSelected}
                    isToyhouseFree={isToyhouseFree}
                  />
                </InspectorCollapsibleSection>

                <InspectorCollapsibleSection
                  id="f2u_atoms"
                  title="F2U Collapse, Cursor & Atom Options"
                  icon={Sparkles}
                  summary={
                    selectedElement.collapsible
                      ? 'Collapse'
                      : selectedElement.cursorStyle && selectedElement.cursorStyle !== 'auto'
                        ? selectedElement.cursorStyle
                        : 'Atoms'
                  }
                  isOpen={openSections.f2u_atoms}
                  onToggle={() => toggleSection('f2u_atoms')}
                >
                  <F2UInteractionAndAtomsSection
                    el={selectedElement}
                    updateSelected={onUpdateSelected}
                    isToyhouseFree={isToyhouseFree}
                    swatches={swatches}
                  />
                </InspectorCollapsibleSection>

                <InspectorCollapsibleSection
                  id="raw_override"
                  title="Raw HTML & Inline CSS Override"
                  icon={Terminal}
                  summary={sectionSummaries.rawOverride}
                  isOpen={openSections.raw_override}
                  onToggle={() => toggleSection('raw_override')}
                >
                  <RawHtmlCssOverrideSection
                    el={selectedElement}
                    updateSelected={onUpdateSelected}
                    isToyhouseFree={isToyhouseFree}
                  />
                </InspectorCollapsibleSection>
              </>
            )}

            {/* Platform Sanitizer Check */}
            <div className="space-y-1.5 shrink-0">
              <div className="flex items-center justify-between">
                <span className="font-semibold text-[11px]">Platform Sanitizer Check</span>
                {nativeValidation && (
                  <span
                    className={`inline-flex items-center gap-1 text-[9.5px] font-mono px-1.5 py-0.5 rounded border ${
                      nativeValidation.valid
                        ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-500'
                        : 'bg-amber-500/10 border-amber-500/30 text-amber-500'
                    }`}
                  >
                    <ShieldCheck className="w-3 h-3" />
                    Rust {nativeValidation.valid ? 'OK' : 'Flagged'}
                  </span>
                )}
              </div>

              {exportResult.warnings.length === 0 ? (
                <div className="p-2 rounded-[6px] bg-emerald-500/10 border border-emerald-500/30 text-emerald-600 text-[11px]">
                  100% compliant with Toyhouse &amp; Carrd HTML/CSS sanitizer.
                </div>
              ) : (
                exportResult.warnings.map((w, i) => (
                  <div
                    key={i}
                    className={`p-2 rounded-[6px] border text-[11px] space-y-1 ${
                      w.severity === 'error'
                        ? 'bg-red-500/10 border-red-500/30 text-red-500'
                        : w.severity === 'warning'
                        ? 'bg-amber-500/10 border-amber-500/30 text-amber-600'
                        : 'bg-stone-500/10 border-stone-500/30'
                    }`}
                  >
                    <div className="font-mono font-bold flex items-center gap-1">
                      {w.severity === 'info' ? (
                        <Info className="w-3 h-3 shrink-0" />
                      ) : (
                        <AlertTriangle className="w-3 h-3 shrink-0" />
                      )}
                      <span>{w.code}</span>
                    </div>
                    <p className="opacity-90">{w.message}</p>
                    <p className="opacity-75 italic">{w.suggestion}</p>
                  </div>
                ))
              )}

              {nativeValidation && nativeValidation.notes.length > 0 && (
                <div className="p-2 rounded-[6px] bg-black/5 dark:bg-white/5 border border-black/10 dark:border-white/10 text-[10px] space-y-0.5 font-mono">
                  <div className="font-semibold opacity-80">Native Validator Notes:</div>
                  {nativeValidation.notes.map((note, idx) => (
                    <div key={idx} className="opacity-75">
                      • {note}
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Generated HTML Output */}
            <div className="flex-1 min-h-[180px] flex flex-col">
              <div className="flex items-center justify-between mb-1">
                <span className="font-semibold text-[11px]">Generated Output</span>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={onExportHtml}
                    style={{ color: 'var(--text-main)' }}
                    className="text-[11px] font-mono hover:underline"
                    title="Save exported .html file"
                  >
                    Save .HTML
                  </button>
                  <button
                    type="button"
                    onClick={onCopyCode}
                    style={{ color: 'var(--accent)' }}
                    className="text-[11px] font-mono hover:underline"
                  >
                    {copied ? 'Copied!' : 'Copy Snippet'}
                  </button>
                </div>
              </div>
              <pre
                style={{
                  backgroundColor: 'var(--bg-input)',
                  borderColor: 'var(--border-strong)',
                }}
                className="flex-1 border rounded-[6px] p-2.5 font-mono text-[10px] overflow-auto select-all whitespace-pre-wrap"
              >
                {exportResult.html}
              </pre>
            </div>
          </div>
        )}
      </aside>
    </>
  );
};

