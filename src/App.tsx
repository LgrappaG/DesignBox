import React, { useCallback, useDeferredValue, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import { CanvasStage } from './components/CanvasStage';
import { LeftSidebar, LeftSidebarTab } from './components/LeftSidebar';
import { createDefaultModifier } from './components/ModifierStackSection';
import { InspectorTab, RightInspector } from './components/RightInspector';
import { TopBar } from './components/TopBar';
import { HtmlImporterModal } from './components/modals/HtmlImporterModal';
import { LivePreviewModal } from './components/modals/LivePreviewModal';
import { ObjectForgeModal } from './components/modals/ObjectForgeModal';
import { SettingsModal, SettingsModalTab } from './components/modals/SettingsModal';
import { TemplatesModal } from './components/modals/TemplatesModal';
import { AssetPreset } from './data/assets';
import { isPureContainerType, PURE_PRIMITIVE_DEFAULTS } from './data/purePrimitives';
import { SearchableCatalogItem } from './data/searchCatalog';
import { DEFAULT_CUSTOM_BLUEPRINTS, TemplatePreset } from './data/templates';
import { getElementF2UShieldReport, isToyhouseFreePlatform } from './engine/f2uShield';
import { parseToyhouseHtmlToDesign } from './engine/htmlImporter';
import {
  generatePlatformExport,
  renderInnerElementHTML,
  solveRowsFromElements,
} from './engine/layoutSolver';
import { applyThemeToElements, paletteToSwatches } from './engine/themeEngine';
import { CanvasDrawTool, useCanvasPointer } from './hooks/useCanvasPointer';
import {
  loadInitialProjectFromStorage,
  useProjectHistory,
} from './hooks/useProjectHistory';
import { useViewportNavigation } from './hooks/useViewportNavigation';
import {
  BgPattern,
  CanvasGuide,
  CustomWidgetBlueprint,
  DesignElement,
  ElementType,
  GlobalThemePalette,
  LayoutMode,
  ModifierKind,
  PreviewSurface,
  PreviewViewport,
  ProjectFile,
  SplitModifier,
  TargetPlatform,
  UiTheme,
} from './types/schema';
import {
  getElementCanvasOrigin,
  getSplitPaneGeometry,
  resolvePointInContainer,
} from './utils/canvasGeometry';
import { buildUniformBorderPatch, getDisplayBorderColor } from './utils/borderHelpers';
import {
  buildBlueprintInstanceElement,
  buildDefaultElement,
  buildElementFromAssetPreset,
  buildElementFromFaIcon,
} from './utils/elementFactory';
import {
  cloneElementsHierarchy,
  groupSelectedElementsIntoContainer,
} from './utils/elementHierarchy';
import { processLocalImageFile } from './utils/imageUpload';
import { buildPreviewSrcDoc } from './utils/previewDocument';
import { classifyPastedPayload, INTERNAL_CLIPBOARD_PREFIX } from './utils/smartPaste';
import {
  applyStudioThemeToDocument,
  KeybindingMap,
  loadKeybindings,
  loadStudioPreferences,
  matchesShortcut,
  saveKeybindings,
  saveStudioPreferences,
  StudioPreferences,
} from './utils/studioSettings';
import { isTauriRuntime } from './utils/tauriDesktop';

const DEFAULT_SWATCHES = [
  '#FAF8F5',
  '#F0ECE1',
  '#2C2A28',
  '#C86D51',
  '#D4A373',
  '#7A9A82',
  '#4A6B53',
  '#8C6D46',
];

function readNumericPref(key: string, fallbackFromProject: number | undefined, fallback: number): number {
  const saved = localStorage.getItem(key);
  if (saved) {
    const parsed = parseInt(saved, 10);
    if (!Number.isNaN(parsed) && parsed >= 200) return parsed;
  }
  if (fallbackFromProject && fallbackFromProject >= 200) return fallbackFromProject;
  return fallback;
}

export default function App() {
  const [initialBootstrap] = useState(() => loadInitialProjectFromStorage());
  const [studioPrefs, setStudioPrefs] = useState<StudioPreferences>(() => loadStudioPreferences());
  const [keybindings, setKeybindings] = useState<KeybindingMap>(() => loadKeybindings());

  const handleChangeStudioPrefs = useCallback((next: StudioPreferences) => {
    setStudioPrefs(next);
    saveStudioPreferences(next);
  }, []);

  const handleChangeKeybindings = useCallback((next: KeybindingMap) => {
    setKeybindings(next);
    saveKeybindings(next);
  }, []);

  const [customBlueprints, setCustomBlueprints] = useState<CustomWidgetBlueprint[]>(() => {
    try {
      const saved = localStorage.getItem('dbx_custom_blueprints_v2');
      if (saved) return JSON.parse(saved) as CustomWidgetBlueprint[];
    } catch {
      // Ignore malformed storage payload
    }
    return initialBootstrap.customBlueprints || DEFAULT_CUSTOM_BLUEPRINTS;
  });

  const [uiTheme, setUiTheme] = useState<UiTheme>(() => {
    const saved = localStorage.getItem('dbx_ui_theme_v2');
    return saved === 'carbon' || saved === 'paper' || saved === 'cute' ? saved : 'paper';
  });
  const [platform, setPlatform] = useState<TargetPlatform>(
    initialBootstrap.platform || 'toyhouse_free'
  );
  const [layoutMode, setLayoutMode] = useState<LayoutMode>(
    initialBootstrap.layoutMode || studioPrefs.defaultLayoutMode || 'freeform'
  );
  const [canvasWidth, setCanvasWidth] = useState<number>(() =>
    readNumericPref('dbx_canvas_width', initialBootstrap.canvasWidth, studioPrefs.defaultCanvasWidth || 760)
  );
  const [canvasHeight, setCanvasHeight] = useState<number>(() =>
    readNumericPref('dbx_canvas_height', initialBootstrap.canvasHeight, studioPrefs.defaultCanvasHeight || 540)
  );
  const [canvasBg, setCanvasBg] = useState<string>(
    () =>
      localStorage.getItem('dbx_canvas_bg') ||
      initialBootstrap.canvasBg ||
      (studioPrefs.defaultTransparentCanvas ? 'transparent' : '#FAF8F5')
  );
  const [canvasPattern, setCanvasPattern] = useState<BgPattern>(
    () =>
      (localStorage.getItem('dbx_canvas_pattern') as BgPattern | null) ||
      initialBootstrap.canvasPattern ||
      'none'
  );
  const [swatches, setSwatches] = useState<string[]>(() => {
    try {
      const saved = localStorage.getItem('dbx_character_swatches');
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) return parsed as string[];
      }
    } catch {
      // Fall back to defaults
    }
    return DEFAULT_SWATCHES;
  });
  const [swatchTarget, setSwatchTarget] = useState<'bgColor' | 'textColor' | 'borderColor'>(
    'bgColor'
  );

  // Selection & Workspace UI State
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [clipboardBundle, setClipboardBundle] = useState<{
    elements: DesignElement[];
    rootIds: string[];
  } | null>(null);
  const pasteSeqRef = useRef(0);
  const [copiedStyle, setCopiedStyle] = useState<Partial<DesignElement> | null>(null);
  const [spotlightOpen, setSpotlightOpen] = useState<boolean>(false);
  const [inlineEditId, setInlineEditId] = useState<string | null>(null);
  const [editingLayerId, setEditingLayerId] = useState<string | null>(null);
  const [editingContainerId, setEditingContainerId] = useState<string | null>(null);
  const [activeCanvasTabs, setActiveCanvasTabs] = useState<Record<string, number>>({});

  const [guides, setGuides] = useState<CanvasGuide[]>(() => {
    try {
      const saved = localStorage.getItem('dbx_canvas_guides');
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed)) return parsed as CanvasGuide[];
      }
    } catch {
      // Ignore malformed guides storage
    }
    return initialBootstrap.guides || [];
  });

  const [leftSidebarTab, setLeftSidebarTab] = useState<LeftSidebarTab>('elements');
  const [inspectorTab, setInspectorTab] = useState<InspectorTab>('style');
  const [canvasTool, setCanvasTool] = useState<CanvasDrawTool>('select');
  const [magneticSnap, setMagneticSnap] = useState<boolean>(true);
  const [autoNestDrop, setAutoNestDrop] = useState<boolean>(false);
  const [showHybridOverlay, setShowHybridOverlay] = useState<boolean>(true);
  const [showHtmlImporterModal, setShowHtmlImporterModal] = useState<boolean>(false);

  const initialLayoutPrefs = useMemo(() => {
    try {
      const raw = localStorage.getItem('dbx_workspace_layout_v1');
      if (raw) return JSON.parse(raw) as Record<string, unknown>;
    } catch {
      // Ignore corrupt workspace prefs
    }
    return {};
  }, []);

  const [leftPanelWidth, setLeftPanelWidth] = useState<number>(
    typeof initialLayoutPrefs.leftPanelWidth === 'number' ? initialLayoutPrefs.leftPanelWidth : 280
  );
  const [leftCollapsed, setLeftCollapsed] = useState<boolean>(
    Boolean(initialLayoutPrefs.leftCollapsed)
  );
  const [leftLibraryPct, setLeftLibraryPct] = useState<number>(
    typeof initialLayoutPrefs.leftLibraryPct === 'number' ? initialLayoutPrefs.leftLibraryPct : 58
  );
  const [rightPanelWidth, setRightPanelWidth] = useState<number>(
    typeof initialLayoutPrefs.rightPanelWidth === 'number' ? initialLayoutPrefs.rightPanelWidth : 320
  );
  const [rightCollapsed, setRightCollapsed] = useState<boolean>(
    Boolean(initialLayoutPrefs.rightCollapsed)
  );
  const [bottomDockOpen, setBottomDockOpen] = useState<boolean>(
    Boolean(initialLayoutPrefs.bottomDockOpen)
  );
  const [bottomDockTab, setBottomDockTab] = useState<'code' | 'preview'>(
    initialLayoutPrefs.bottomDockTab === 'preview' ? 'preview' : 'code'
  );
  const [bottomDockHeight, setBottomDockHeight] = useState<number>(
    typeof initialLayoutPrefs.bottomDockHeight === 'number' ? initialLayoutPrefs.bottomDockHeight : 230
  );

  const [windowSize, setWindowSize] = useState<{ w: number; h: number }>(() => ({
    w: typeof window !== 'undefined' ? window.innerWidth : 1380,
    h: typeof window !== 'undefined' ? window.innerHeight : 860,
  }));

  useEffect(() => {
    if (typeof window === 'undefined') return;
    const handleWindowResize = () => {
      setWindowSize({ w: window.innerWidth, h: window.innerHeight });
    };
    window.addEventListener('resize', handleWindowResize);
    return () => window.removeEventListener('resize', handleWindowResize);
  }, []);

  const { effectiveLeftWidth, effectiveRightWidth, effectiveBottomDockHeight } = useMemo(() => {
    const leftReserved = leftCollapsed ? 32 : 0;
    const rightReserved = rightCollapsed ? 32 : 0;
    const minCenterWidth = windowSize.w < 960 ? 280 : 340;
    const availableForSidebars = Math.max(0, windowSize.w - leftReserved - rightReserved - minCenterWidth);

    let nextLeft = leftCollapsed ? 32 : leftPanelWidth;
    let nextRight = rightCollapsed ? 32 : rightPanelWidth;

    if (!leftCollapsed && !rightCollapsed && nextLeft + nextRight > availableForSidebars) {
      const scale = availableForSidebars / Math.max(1, nextLeft + nextRight);
      nextLeft = Math.max(190, Math.floor(nextLeft * scale));
      nextRight = Math.max(220, Math.floor(nextRight * scale));
      if (nextLeft + nextRight > availableForSidebars && availableForSidebars > 0) {
        nextLeft = Math.floor(availableForSidebars * 0.45);
        nextRight = Math.max(0, availableForSidebars - nextLeft);
      }
    } else if (!leftCollapsed && rightCollapsed) {
      nextLeft = Math.min(nextLeft, Math.max(190, availableForSidebars));
    } else if (!rightCollapsed && leftCollapsed) {
      nextRight = Math.min(nextRight, Math.max(220, availableForSidebars));
    }

    const maxDockH = Math.max(130, Math.min(520, windowSize.h - 240));
    const nextDockH = Math.min(bottomDockHeight, maxDockH);
    return {
      effectiveLeftWidth: nextLeft,
      effectiveRightWidth: nextRight,
      effectiveBottomDockHeight: nextDockH,
    };
  }, [windowSize, leftCollapsed, rightCollapsed, leftPanelWidth, rightPanelWidth, bottomDockHeight]);

  // Modals & Image Upload State
  const [showLivePreviewModal, setShowLivePreviewModal] = useState<boolean>(false);
  const [previewSurface, setPreviewSurface] = useState<PreviewSurface>('th_dark');
  const [previewViewport, setPreviewViewport] = useState<PreviewViewport>('th_col');
  const [previewToyhouseShell, setPreviewToyhouseShell] = useState<boolean>(true);
  const [showTemplatesModal, setShowTemplatesModal] = useState<boolean>(false);
  const [showSettingsModal, setShowSettingsModal] = useState<boolean>(false);
  const [settingsInitialTab, setSettingsInitialTab] = useState<SettingsModalTab>('general');
  const [showObjectForgeModal, setShowObjectForgeModal] = useState<boolean>(false);
  const [copied, setCopied] = useState<boolean>(false);
  const [imgbbApiKey, setImgbbApiKey] = useState<string>(
    () => localStorage.getItem('dbx_imgbb_key') || ''
  );
  const [uploadingImage, setUploadingImage] = useState<boolean>(false);
  const [uploadNotice, setUploadNotice] = useState<string | null>(null);
  const [imageUploadTarget, setImageUploadTarget] = useState<string>('url');

  const canvasRef = useRef<HTMLDivElement | null>(null);
  const canvasViewportRef = useRef<HTMLDivElement | null>(null);
  const canvasTransformRef = useRef<HTMLDivElement | null>(null);
  const leftSplitContainerRef = useRef<HTMLDivElement | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const imageUploadRef = useRef<HTMLInputElement | null>(null);

  const handleApplyProjectMetadata = useCallback((project: ProjectFile) => {
    if (project.platform) setPlatform(project.platform);
    if (project.layoutMode) setLayoutMode(project.layoutMode);
    if (project.canvasWidth) setCanvasWidth(project.canvasWidth);
    if (project.canvasHeight) setCanvasHeight(project.canvasHeight);
    if (project.canvasBg) setCanvasBg(project.canvasBg);
    if (project.canvasPattern) setCanvasPattern(project.canvasPattern);
    if (Array.isArray(project.swatches) && project.swatches.length > 0) {
      setSwatches(project.swatches);
    }
    if (Array.isArray(project.guides)) {
      setGuides(project.guides);
    }
    if (Array.isArray(project.customBlueprints)) {
      setCustomBlueprints(project.customBlueprints);
    }
    setEditingContainerId(null);
    setInlineEditId(null);
  }, []);

  const handleSelectAfterLoad = useCallback((firstId: string | null) => {
    setSelectedId(firstId);
    setSelectedIds(firstId ? [firstId] : []);
  }, []);

  const projectMeta = useMemo(
    () => ({
      platform,
      layoutMode,
      canvasWidth,
      canvasHeight,
      canvasBg,
      canvasPattern,
      swatches,
      guides,
      customBlueprints,
    }),
    [
      platform,
      layoutMode,
      canvasWidth,
      canvasHeight,
      canvasBg,
      canvasPattern,
      swatches,
      guides,
      customBlueprints,
    ]
  );

  const {
    elements,
    elementsRef,
    canUndo,
    canRedo,
    commitElements,
    commitWithUpdater,
    commitCoalesced,
    replaceElementsTransient,
    commitLatestElements,
    undo,
    redo,
    setAutosaveSuspended,
    confirmDiscardIfDirty,
    saveNotice,
    flashSaveNotice,
    currentFilePath,
    projectName,
    isDirty,
    markSavedClean,
    recentProjects,
    localSnapshots,
    lastSnapshotAt,
    handleSaveProject,
    handleSaveProjectAs,
    handleExportHtmlFile,
    handleOpenProjectNative,
    handleOpenProjectFromFileInput,
    handleOpenRecentProject,
    createManualSnapshot,
    restoreLocalSnapshot,
  } = useProjectHistory({
    initialElements: initialBootstrap.elements,
    initialProjectName: initialBootstrap.name,
    projectMeta,
    onApplyProjectMetadata: handleApplyProjectMetadata,
    onSelectAfterLoad: handleSelectAfterLoad,
  });

  // Auto-snapshot interval when enabled in Studio Preferences
  useEffect(() => {
    const secs = studioPrefs.autoSnapshotIntervalSec;
    if (!secs || secs <= 0) return;
    const timer = window.setInterval(() => {
      void createManualSnapshot();
    }, secs * 1000);
    return () => window.clearInterval(timer);
  }, [studioPrefs.autoSnapshotIntervalSec, createManualSnapshot]);

  // Persist Studio UI Preferences & apply document CSS theme variables synchronously before paint
  useLayoutEffect(() => {
    applyStudioThemeToDocument(uiTheme, studioPrefs.cuteThemeColors);
    localStorage.setItem('dbx_ui_theme_v2', uiTheme);
  }, [uiTheme, studioPrefs.cuteThemeColors]);

  useEffect(() => {
    try {
      localStorage.setItem('dbx_custom_blueprints_v2', JSON.stringify(customBlueprints));
      localStorage.setItem('dbx_canvas_width', canvasWidth.toString());
      localStorage.setItem('dbx_canvas_height', canvasHeight.toString());
      localStorage.setItem('dbx_canvas_bg', canvasBg);
      localStorage.setItem('dbx_canvas_pattern', canvasPattern);
      localStorage.setItem('dbx_character_swatches', JSON.stringify(swatches));
      localStorage.setItem('dbx_canvas_guides', JSON.stringify(guides));
      localStorage.setItem(
        'dbx_workspace_layout_v1',
        JSON.stringify({
          leftPanelWidth,
          leftCollapsed,
          leftLibraryPct,
          rightPanelWidth,
          rightCollapsed,
          bottomDockOpen,
          bottomDockTab,
          bottomDockHeight,
        })
      );
    } catch {
      // Ignore storage quota warnings on preferences
    }
  }, [
    customBlueprints,
    canvasWidth,
    canvasHeight,
    canvasBg,
    canvasPattern,
    swatches,
    guides,
    leftPanelWidth,
    leftCollapsed,
    leftLibraryPct,
    rightPanelWidth,
    rightCollapsed,
    bottomDockOpen,
    bottomDockTab,
    bottomDockHeight,
  ]);

  // Derived Selection & Layout State
  const selectedElement = useMemo(
    () => elements.find((e) => e.id === selectedId) || null,
    [elements, selectedId]
  );

  const containerCandidates = useMemo(
    () =>
      elements.filter(
        (el) => isPureContainerType(el.type) && el.id !== selectedId && !el.parentId
      ),
    [elements, selectedId]
  );

  const nestedChildren = useMemo(
    () => (selectedId ? elements.filter((el) => el.parentId === selectedId) : []),
    [elements, selectedId]
  );

  const rootCanvasElements = useMemo(
    () => elements.filter((el) => !el.parentId),
    [elements]
  );

  const editingContainer = useMemo(
    () => (editingContainerId ? elements.find((e) => e.id === editingContainerId) || null : null),
    [editingContainerId, elements]
  );

  const editingChildren = useMemo(
    () => (editingContainer ? elements.filter((e) => e.parentId === editingContainer.id) : []),
    [editingContainer, elements]
  );

  const solvedRows = useMemo(
    () => solveRowsFromElements(elements, layoutMode, canvasWidth),
    [elements, layoutMode, canvasWidth]
  );

  const shieldedElementCount = useMemo(() => {
    if (!isToyhouseFreePlatform(platform)) return 0;
    return elements.reduce(
      (count, el) => count + (getElementF2UShieldReport(el).isShielded ? 1 : 0),
      0
    );
  }, [elements, platform]);

  // Viewport & Canvas Pointer Hooks (placed above exportResult so active drag gates HTML generation)
  const {
    zoom,
    setZoom,
    panOffset,
    setPanOffset,
    viewportSize,
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
  } = useViewportNavigation({
    canvasWidth,
    canvasHeight,
    layoutMode,
    leftCollapsed,
    rightCollapsed,
    bottomDockOpen,
    canvasViewportRef,
    canvasTransformRef,
  });

  const {
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
  } = useCanvasPointer({
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
    onChangeGuides: setGuides,
  });

  const isCanvasDragging = Boolean(
    dragState || splitDragState || guideDragState || panelResizeDrag || drawMarquee
  );
  useEffect(() => {
    setAutosaveSuspended(isCanvasDragging);
  }, [isCanvasDragging, setAutosaveSuspended]);
  const deferredElements = useDeferredValue(elements);
  const exportSourceElements = isCanvasDragging ? deferredElements : elements;
  const lastExportRef = useRef<ReturnType<typeof generatePlatformExport> | null>(null);

  const exportResult = useMemo(() => {
    if (isCanvasDragging && lastExportRef.current) {
      return lastExportRef.current;
    }
    const next = generatePlatformExport(
      exportSourceElements,
      layoutMode,
      platform,
      canvasWidth,
      canvasHeight,
      canvasBg,
      canvasPattern
    );
    lastExportRef.current = next;
    return next;
  }, [
    isCanvasDragging,
    exportSourceElements,
    layoutMode,
    platform,
    canvasWidth,
    canvasHeight,
    canvasBg,
    canvasPattern,
  ]);

  const isPreviewVisible =
    showLivePreviewModal || (bottomDockOpen && bottomDockTab === 'preview');

  const previewSrcDoc = useMemo(() => {
    if (!isPreviewVisible) return '';
    return buildPreviewSrcDoc({
      elements,
      exportHtml: exportResult.html,
      platform,
      canvasWidth,
      previewSurface,
      previewToyhouseShell,
      projectName,
      cuteThemeColors: studioPrefs.cuteThemeColors,
    });
  }, [
    isPreviewVisible,
    elements,
    exportResult.html,
    platform,
    canvasWidth,
    previewSurface,
    previewToyhouseShell,
    projectName,
    studioPrefs.cuteThemeColors,
  ]);

  const compareNightSrcDoc = useMemo(() => {
    if (!showLivePreviewModal) return '';
    return buildPreviewSrcDoc({
      elements,
      exportHtml: exportResult.html,
      platform,
      canvasWidth,
      previewSurface: 'th_dark',
      previewToyhouseShell,
      projectName,
      cuteThemeColors: studioPrefs.cuteThemeColors,
    });
  }, [
    showLivePreviewModal,
    elements,
    exportResult.html,
    platform,
    canvasWidth,
    previewToyhouseShell,
    projectName,
    studioPrefs.cuteThemeColors,
  ]);

  const compareLightSrcDoc = useMemo(() => {
    if (!showLivePreviewModal) return '';
    return buildPreviewSrcDoc({
      elements,
      exportHtml: exportResult.html,
      platform,
      canvasWidth,
      previewSurface: 'th_light',
      previewToyhouseShell,
      projectName,
      cuteThemeColors: studioPrefs.cuteThemeColors,
    });
  }, [
    showLivePreviewModal,
    elements,
    exportResult.html,
    platform,
    canvasWidth,
    previewToyhouseShell,
    projectName,
    studioPrefs.cuteThemeColors,
  ]);

  // Canvas & Element Actions
  const handleResetWorkspaceLayout = () => {
    setLeftPanelWidth(280);
    setLeftCollapsed(false);
    setLeftLibraryPct(58);
    setRightPanelWidth(320);
    setRightCollapsed(false);
    setBottomDockOpen(false);
    setBottomDockHeight(230);
    centerCanvasView();
  };

  const handleNewBlankCanvas = () => {
    if (!confirmDiscardIfDirty('start a blank canvas')) return;
    commitElements([]);
    setSelectedId(null);
    setSelectedIds([]);
    setInlineEditId(null);
    setEditingContainerId(null);
    setLayoutMode(studioPrefs.defaultLayoutMode);
    setCanvasWidth(studioPrefs.defaultCanvasWidth);
    setCanvasHeight(studioPrefs.defaultCanvasHeight);
    setCanvasBg(
      studioPrefs.defaultTransparentCanvas
        ? 'transparent'
        : uiTheme === 'cute'
        ? studioPrefs.cuteThemeColors.bgPanel
        : uiTheme === 'paper'
        ? '#FAF8F5'
        : '#161514'
    );
    setCanvasPattern('none');
    markSavedClean('Untitled Draft');
    setShowTemplatesModal(false);
  };

  const handleNewBlankWithSize = (width: number, height: number, presetLabel?: string) => {
    if (!confirmDiscardIfDirty('start a blank canvas')) return;
    commitElements([]);
    setSelectedId(null);
    setSelectedIds([]);
    setInlineEditId(null);
    setEditingContainerId(null);
    setCanvasWidth(width);
    setCanvasHeight(height);
    setCanvasPattern('none');
    markSavedClean(presetLabel || 'Untitled Draft');
    setShowTemplatesModal(false);
  };

  const handleOpenProject = useCallback(async () => {
    const handledNatively = await handleOpenProjectNative();
    if (!handledNatively) {
      if (!confirmDiscardIfDirty('open another project')) return;
      fileInputRef.current?.click();
    }
  }, [confirmDiscardIfDirty, handleOpenProjectNative]);

  const updateSelected = useCallback(
    (patch: Partial<DesignElement>, coalesceKey?: string) => {
      const targetIds = selectedIds.length > 0 ? selectedIds : selectedId ? [selectedId] : [];
      if (targetIds.length === 0) return;
      const effectiveKey =
        coalesceKey || `edit:${targetIds.join(',')}:${Object.keys(patch).sort().join(',')}`;
      commitCoalesced(
        (prev) => {
          let changed = false;
          const next = prev.map((el) => {
            if (!targetIds.includes(el.id) || el.locked) return el;
            changed = true;
            return { ...el, ...patch };
          });
          return changed ? next : prev;
        },
        effectiveKey,
        450
      );
    },
    [commitCoalesced, selectedId, selectedIds]
  );

  const updateElementById = useCallback(
    (id: string, patch: Partial<DesignElement>) => {
      const key = `edit:${id}:${Object.keys(patch).sort().join(',')}`;
      commitCoalesced(
        (prev) => {
          let changed = false;
          const next = prev.map((el) => {
            if (el.id !== id || el.locked) return el;
            changed = true;
            return { ...el, ...patch };
          });
          return changed ? next : prev;
        },
        key,
        450
      );
    },
    [commitCoalesced]
  );

  const rotateSelected90 = useCallback(() => {
    const targetIds = selectedIds.length > 0 ? selectedIds : selectedId ? [selectedId] : [];
    if (targetIds.length === 0) return;
    commitWithUpdater((prev) =>
      prev.map((el) =>
        targetIds.includes(el.id) && !el.locked
          ? { ...el, rotation: ((el.rotation || 0) + 90) % 360 }
          : el
      )
    );
  }, [commitWithUpdater, selectedId, selectedIds]);

  const flipSelected = useCallback(
    (axis: 'h' | 'v') => {
      const targetIds = selectedIds.length > 0 ? selectedIds : selectedId ? [selectedId] : [];
      if (targetIds.length === 0) return;
      commitWithUpdater((prev) =>
        prev.map((el) => {
          if (!targetIds.includes(el.id) || el.locked) return el;
          return axis === 'h' ? { ...el, flipH: !el.flipH } : { ...el, flipV: !el.flipV };
        })
      );
    },
    [commitWithUpdater, selectedId, selectedIds]
  );

  const copySelectedStyle = useCallback(() => {
    if (!selectedElement) return;
    setCopiedStyle({
      bgColor: selectedElement.bgColor,
      bgGradientTo: selectedElement.bgGradientTo,
      bgGradientType: selectedElement.bgGradientType,
      bgGradientAngle: selectedElement.bgGradientAngle,
      bgGradientMid: selectedElement.bgGradientMid,
      bgPattern: selectedElement.bgPattern,
      textColor: selectedElement.textColor,
      borderColor: selectedElement.borderColor,
      borderWidth: selectedElement.borderWidth,
      borderStyle: selectedElement.borderStyle,
      borderRadius: selectedElement.borderRadius,
      bordersLinked: selectedElement.bordersLinked,
      cornersLinked: selectedElement.cornersLinked,
      radiusTL: selectedElement.radiusTL,
      radiusTR: selectedElement.radiusTR,
      radiusBR: selectedElement.radiusBR,
      radiusBL: selectedElement.radiusBL,
      opacity: selectedElement.opacity,
      shadow: selectedElement.shadow,
      glassBlur: selectedElement.glassBlur,
      innerGlow: selectedElement.innerGlow,
      fontFamily: selectedElement.fontFamily,
      googleFont: selectedElement.googleFont,
      fontSize: selectedElement.fontSize,
      fontWeight: selectedElement.fontWeight,
      textAlign: selectedElement.textAlign,
      lineHeight: selectedElement.lineHeight,
      letterSpacing: selectedElement.letterSpacing,
      boxClipShape: selectedElement.boxClipShape,
      shapeCutPx: selectedElement.shapeCutPx,
    });
  }, [selectedElement]);

  const pasteStyleToSelected = useCallback(() => {
    if (!copiedStyle) return;
    updateSelected(copiedStyle);
  }, [copiedStyle, updateSelected]);

  const copySelectedElements = useCallback(() => {
    const idsToCopy = selectedIds.length > 0 ? selectedIds : selectedId ? [selectedId] : [];
    if (idsToCopy.length === 0) return;
    const { clones, rootCloneIds } = cloneElementsHierarchy(elementsRef.current, idsToCopy, {
      offsetX: 0,
      offsetY: 0,
      canvasWidth,
      canvasHeight,
    });
    if (clones.length > 0) {
      pasteSeqRef.current = 0;
      setClipboardBundle({ elements: clones, rootIds: rootCloneIds });
      if (typeof navigator !== 'undefined' && navigator.clipboard?.writeText) {
        void navigator.clipboard.writeText(`${INTERNAL_CLIPBOARD_PREFIX}${Date.now()}`).catch(() => {});
      }
    }
  }, [canvasHeight, canvasWidth, elementsRef, selectedId, selectedIds]);

  const pasteClipboardElement = useCallback(
    (atX?: number, atY?: number) => {
      if (!clipboardBundle || clipboardBundle.rootIds.length === 0) return;
      const current = elementsRef.current;
      let offsetX = 24;
      let offsetY = 24;
      if (atX !== undefined && atY !== undefined) {
        const rootSet = new Set(clipboardBundle.rootIds);
        const roots = clipboardBundle.elements.filter((e) => rootSet.has(e.id));
        const minX = roots.length > 0 ? Math.min(...roots.map((r) => r.x)) : 0;
        const minY = roots.length > 0 ? Math.min(...roots.map((r) => r.y)) : 0;
        offsetX = Math.round(atX - minX);
        offsetY = Math.round(atY - minY);
      } else {
        pasteSeqRef.current += 1;
        const step = Math.min(8, pasteSeqRef.current) * 24;
        offsetX = step;
        offsetY = step;
      }
      const { clones, rootCloneIds } = cloneElementsHierarchy(
        clipboardBundle.elements,
        clipboardBundle.rootIds,
        {
          offsetX,
          offsetY,
          canvasWidth,
          canvasHeight,
          labelSuffix: ' (Pasted)',
        }
      );
      if (clones.length === 0) return;
      const maxOrderBase = current.reduce((m, e) => Math.max(m, e.order), -1) + 1;
      const orderedClones = clones.map((el, idx) => ({ ...el, order: maxOrderBase + idx }));
      commitElements([...current, ...orderedClones]);
      setSelectedIds(rootCloneIds);
      setSelectedId(rootCloneIds[0] || null);
    },
    [canvasHeight, canvasWidth, clipboardBundle, commitElements, elementsRef]
  );

  const selectAllElements = useCallback(() => {
    const targetList = editingContainerId
      ? elementsRef.current.filter((e) => e.parentId === editingContainerId && !e.hidden)
      : elementsRef.current.filter((e) => !e.parentId && !e.hidden);
    const ids = targetList.map((e) => e.id);
    setSelectedIds(ids);
    setSelectedId(ids[0] || null);
  }, [editingContainerId, elementsRef]);

  const unlockAllElements = useCallback(() => {
    commitWithUpdater((prev) => prev.map((e) => (e.locked ? { ...e, locked: false } : e)));
  }, [commitWithUpdater]);

  const toggleLock = (id: string) => {
    commitWithUpdater((prev) =>
      prev.map((el) => (el.id === id ? { ...el, locked: !el.locked } : el))
    );
  };

  const toggleHide = (id: string) => {
    commitWithUpdater((prev) =>
      prev.map((el) => (el.id === id ? { ...el, hidden: !el.hidden } : el))
    );
  };

  const moveBlockOrder = (id: string, dir: -1 | 1) => {
    commitWithUpdater((prev) => {
      const idx = prev.findIndex((e) => e.id === id);
      const targetIdx = idx + dir;
      if (idx === -1 || targetIdx < 0 || targetIdx >= prev.length) return prev;
      if (prev[idx].locked || prev[targetIdx].locked) return prev;
      const copy = [...prev];
      const temp = copy[idx];
      copy[idx] = copy[targetIdx];
      copy[targetIdx] = temp;
      return copy.map((el, i) => ({ ...el, order: i }));
    });
  };

  const duplicateSelected = useCallback(() => {
    const idsToDup = selectedIds.length > 0 ? selectedIds : selectedId ? [selectedId] : [];
    if (idsToDup.length === 0) return;
    const current = elementsRef.current;
    const { clones, rootCloneIds } = cloneElementsHierarchy(current, idsToDup, {
      offsetX: 20,
      offsetY: 20,
      canvasWidth,
      canvasHeight,
      labelSuffix: ' (Copy)',
    });
    if (clones.length === 0) return;
    commitElements([...current, ...clones]);
    setSelectedIds(rootCloneIds);
    setSelectedId(rootCloneIds[0] || null);
  }, [canvasHeight, canvasWidth, commitElements, elementsRef, selectedId, selectedIds]);

  const deleteSelected = useCallback(() => {
    const requestedIds = selectedIds.length > 0 ? selectedIds : selectedId ? [selectedId] : [];
    if (requestedIds.length === 0) return;
    const current = elementsRef.current;
    const byId = new Map(current.map((e) => [e.id, e]));
    const childrenMap = new Map<string, DesignElement[]>();
    for (const e of current) {
      if (!e.parentId) continue;
      const list = childrenMap.get(e.parentId);
      if (list) list.push(e);
      else childrenMap.set(e.parentId, [e]);
    }
    const hasLockedInSubtree = (rootId: string): boolean => {
      const root = byId.get(rootId);
      if (!root) return false;
      if (root.locked) return true;
      const visited = new Set<string>([rootId]);
      const queue = [...(childrenMap.get(rootId) || [])];
      while (queue.length > 0) {
        const cur = queue.shift()!;
        if (visited.has(cur.id)) continue;
        visited.add(cur.id);
        if (cur.locked) return true;
        const ch = childrenMap.get(cur.id);
        if (ch) queue.push(...ch);
      }
      return false;
    };
    const deletableRoots = requestedIds.filter((id) => {
      const el = byId.get(id);
      if (!el || el.locked) return false;
      return !hasLockedInSubtree(id);
    });
    if (deletableRoots.length === 0) {
      flashSaveNotice('Locked elements cannot be deleted. Unlock them first.', 2800);
      return;
    }
    const removeSet = new Set<string>(deletableRoots);
    let added = true;
    while (added) {
      added = false;
      for (const e of current) {
        if (!removeSet.has(e.id) && e.parentId && removeSet.has(e.parentId)) {
          removeSet.add(e.id);
          added = true;
        }
      }
    }
    const next = current.filter((e) => !removeSet.has(e.id));
    commitElements(next);
    if (deletableRoots.length < requestedIds.length) {
      flashSaveNotice('Some locked items were preserved.', 2600);
    }
    setSelectedId(next[0]?.id || null);
    setSelectedIds(next[0] ? [next[0].id] : []);
  }, [commitElements, elementsRef, flashSaveNotice, selectedId, selectedIds]);

  const adjustZIndex = useCallback(
    (delta: number) => {
      const targetIds = selectedIds.length > 0 ? selectedIds : selectedId ? [selectedId] : [];
      if (targetIds.length === 0) return;
      commitWithUpdater((prev) => {
        let changed = false;
        const next = prev.map((el) => {
          if (!targetIds.includes(el.id) || el.locked) return el;
          changed = true;
          return { ...el, zIndex: Math.max(1, Math.min(99, (el.zIndex ?? 10) + delta)) };
        });
        return changed ? next : prev;
      });
    },
    [commitWithUpdater, selectedId, selectedIds]
  );

  const bringToFront = useCallback(() => {
    const targetIds = selectedIds.length > 0 ? selectedIds : selectedId ? [selectedId] : [];
    if (targetIds.length === 0) return;
    commitWithUpdater((prev) => {
      const maxZ = prev.reduce((m, e) => Math.max(m, e.zIndex ?? 10), 10);
      let changed = false;
      const next = prev.map((el) => {
        if (!targetIds.includes(el.id) || el.locked) return el;
        changed = true;
        return { ...el, zIndex: Math.min(99, maxZ + 1) };
      });
      return changed ? next : prev;
    });
  }, [commitWithUpdater, selectedId, selectedIds]);

  const sendToBack = useCallback(() => {
    const targetIds = selectedIds.length > 0 ? selectedIds : selectedId ? [selectedId] : [];
    if (targetIds.length === 0) return;
    commitWithUpdater((prev) => {
      const minZ = prev.reduce((m, e) => Math.min(m, e.zIndex ?? 10), 10);
      const nextZ = Math.max(1, minZ - 1);
      let changed = false;
      const next = prev.map((el) => {
        if (!targetIds.includes(el.id) || el.locked) return el;
        changed = true;
        return { ...el, zIndex: nextZ };
      });
      return changed ? next : prev;
    });
  }, [commitWithUpdater, selectedId, selectedIds]);

  const ungroupSelected = useCallback(() => {
    if (!selectedElement || selectedElement.locked) return;
    if (isPureContainerType(selectedElement.type)) {
      const hasChildren = elementsRef.current.some(
        (e) => e.parentId === selectedElement.id && !e.locked
      );
      if (hasChildren) {
        commitWithUpdater((prev) => {
          let changed = false;
          const next = prev.map((el) => {
            if (el.parentId !== selectedElement.id || el.locked) return el;
            changed = true;
            const origin = getElementCanvasOrigin(el, prev);
            return {
              ...el,
              parentId: null,
              parentPaneIndex: undefined,
              x: Math.min(Math.max(0, canvasWidth - el.width), Math.max(0, origin.x)),
              y: Math.min(Math.max(0, canvasHeight - el.height), Math.max(0, origin.y)),
              childOffsetX: undefined,
              childOffsetY: undefined,
            };
          });
          return changed ? next : prev;
        });
        return;
      }
    }
    if (selectedElement.parentId) {
      commitWithUpdater((prev) => {
        const target = prev.find((e) => e.id === selectedElement.id);
        if (!target || target.locked) return prev;
        const parent = prev.find((e) => e.id === target.parentId);
        if (parent?.locked) return prev;
        const origin = getElementCanvasOrigin(target, prev);
        return prev.map((el) =>
          el.id === selectedElement.id
            ? {
                ...el,
                parentId: null,
                parentPaneIndex: undefined,
                x: Math.min(Math.max(0, canvasWidth - el.width), Math.max(0, origin.x)),
                y: Math.min(Math.max(0, canvasHeight - el.height), Math.max(0, origin.y)),
                childOffsetX: undefined,
                childOffsetY: undefined,
              }
            : el
        );
      });
    }
  }, [canvasHeight, canvasWidth, commitWithUpdater, elementsRef, selectedElement]);

  const nestElementIntoContainer = (childId: string, parentId: string | null) => {
    const child = elements.find((e) => e.id === childId);
    if (!child || child.locked) return;
    if (!parentId) {
      popOutFromContainer(childId);
      return;
    }
    const parent = elements.find((e) => e.id === parentId);
    if (!parent || parent.locked) return;

    const parentOrigin = getElementCanvasOrigin(parent, elements);
    const childOrigin = getElementCanvasOrigin(child, elements);
    const cw = child.childCustomWidth || child.width;
    const ch = child.childCustomHeight || child.height;
    const resolved = resolvePointInContainer(
      parent,
      childOrigin.x,
      childOrigin.y,
      cw,
      ch,
      parentOrigin.x,
      parentOrigin.y
    );

    commitWithUpdater((prev) =>
      prev.map((el) => {
        if (el.id === parentId && el.containerLayout !== 'freeform_offset') {
          return { ...el, containerLayout: 'freeform_offset' as const };
        }
        if (el.id === childId) {
          return {
            ...el,
            parentId,
            parentPaneIndex: resolved.paneIdx,
            childOffsetX: resolved.offsetX,
            childOffsetY: resolved.offsetY,
            x: resolved.offsetX,
            y: resolved.offsetY,
          };
        }
        return el;
      })
    );
  };

  const popOutFromContainer = (childId: string) => {
    commitWithUpdater((prev) => {
      const child = prev.find((e) => e.id === childId);
      if (!child || !child.parentId || child.locked) return prev;
      const parent = prev.find((e) => e.id === child.parentId);
      if (parent?.locked) return prev;
      const origin = getElementCanvasOrigin(child, prev);
      const newX = Math.min(Math.max(0, canvasWidth - child.width), Math.max(0, origin.x));
      const newY = Math.min(Math.max(0, canvasHeight - child.height), Math.max(0, origin.y));
      return prev.map((e) =>
        e.id === childId
          ? {
              ...e,
              parentId: null,
              parentPaneIndex: undefined,
              x: newX,
              y: newY,
              childOffsetX: undefined,
              childOffsetY: undefined,
            }
          : e
      );
    });
  };

  const reorderNestedChild = (parentId: string, childId: string, direction: 'up' | 'down') => {
    commitWithUpdater((prev) => {
      const parent = prev.find((e) => e.id === parentId);
      if (parent?.locked) return prev;
      const children = prev.filter((e) => e.parentId === parentId);
      const cIdx = children.findIndex((e) => e.id === childId);
      if (cIdx === -1) return prev;
      const targetIdx = direction === 'up' ? cIdx - 1 : cIdx + 1;
      if (targetIdx < 0 || targetIdx >= children.length) return prev;

      const swappedChild = children[targetIdx];
      if (children[cIdx].locked || swappedChild.locked) return prev;
      const originalFirstIdx = prev.findIndex((e) => e.id === childId);
      const originalSecondIdx = prev.findIndex((e) => e.id === swappedChild.id);
      const next = [...prev];
      const temp = next[originalFirstIdx];
      next[originalFirstIdx] = next[originalSecondIdx];
      next[originalSecondIdx] = temp;
      return next;
    });
  };

  const enterContainerIsolation = (containerId: string) => {
    const parent = elements.find((e) => e.id === containerId);
    if (!parent) return;
    if (parent.locked) {
      flashSaveNotice('Unlock this container before editing inside it.', 2500);
      return;
    }
    let changed = parent.containerLayout !== 'freeform_offset';
    let yCursor = 12;
    const next = elements.map((el) => {
      if (el.id === containerId && el.containerLayout !== 'freeform_offset') {
        return { ...el, containerLayout: 'freeform_offset' as const };
      }
      if (el.parentId !== containerId) return el;
      const ox = el.childOffsetX !== undefined ? el.childOffsetX : 12;
      const oy = el.childOffsetY !== undefined ? el.childOffsetY : yCursor;
      yCursor += (el.childCustomHeight || el.height || 64) + 10;
      if (el.childOffsetX === undefined || el.childOffsetY === undefined) {
        changed = true;
        return { ...el, childOffsetX: ox, childOffsetY: oy };
      }
      return el;
    });
    if (changed) commitElements(next);
    setEditingContainerId(containerId);
    setSelectedId(containerId);
    setSelectedIds([containerId]);
  };

  const applyQuickModifier = (kind: ModifierKind, extraPatch?: Record<string, unknown>) => {
    if (!selectedElement || selectedElement.locked) return;
    const newMod = {
      ...createDefaultModifier(kind, selectedElement),
      ...(extraPatch || {}),
    } as NonNullable<DesignElement['modifiers']>[number];
    updateSelected({ modifiers: [...(selectedElement.modifiers || []), newMod] });
  };

  const groupSelectedIntoBox = () => {
    const { elements: nextElements, containerId } = groupSelectedElementsIntoContainer({
      elements,
      selectedIds,
      uiTheme,
      canvasWidth,
      canvasHeight,
    });
    if (!containerId) return;
    commitElements(nextElements);
    setSelectedId(containerId);
    setSelectedIds([containerId]);
  };

  const subtractSelectedElements = () => {
    if (selectedIds.length !== 2) return;
    const pair = elements.filter((e) => selectedIds.includes(e.id));
    if (pair.length !== 2) return;
    const sorted = [...pair].sort(
      (a, b) => (a.zIndex ?? 10) - (b.zIndex ?? 10) || a.order - b.order
    );
    const [base, cutter] = sorted;
    if (base.locked || cutter.locked) {
      flashSaveNotice('Unlock elements before applying Boolean cutout.', 2500);
      return;
    }
    const xPct = Math.max(0, Math.min(100, Math.round(((cutter.x + cutter.width / 2 - base.x) / Math.max(1, base.width)) * 100)));
    const yPct = Math.max(0, Math.min(100, Math.round(((cutter.y + cutter.height / 2 - base.y) / Math.max(1, base.height)) * 100)));
    const cutterShape = cutter.boxClipShape || cutter.imageShape;
    const usesBooleanMask =
      cutter.type === 'pure_diamond' ||
      cutter.type === 'pure_hexagon' ||
      cutter.type === 'pure_octagon' ||
      cutter.type === 'pure_star' ||
      cutterShape === 'diamond' ||
      cutterShape === 'hexagon' ||
      cutterShape === 'octagon' ||
      Boolean(cutter.rotation && Math.round(cutter.rotation) % 90 !== 0);

    const resolvedMaskShape =
      cutter.type === 'pure_hexagon' || cutterShape === 'hexagon' || cutterShape === 'hexagon_flat'
        ? ('hexagon' as const)
        : cutter.type === 'pure_octagon' || cutterShape === 'octagon'
        ? ('octagon' as const)
        : cutter.type === 'pure_diamond' || cutterShape === 'diamond'
        ? ('diamond' as const)
        : cutter.type === 'pure_star'
        ? ('star' as const)
        : ('rect' as const);

    const newMod = usesBooleanMask
      ? {
          ...createDefaultModifier('boolean_mask', base),
          operation: 'subtract' as const,
          maskShape: resolvedMaskShape,
          xPct,
          yPct,
          widthPx: Math.max(12, cutter.width),
          heightPx: Math.max(12, cutter.height),
          rotation: cutter.rotation || 0,
        }
      : {
          ...createDefaultModifier('cutout_hole', base),
          mode: 'transparent_hole' as const,
          shape:
            cutter.type === 'pure_circle' ||
            cutter.type === 'pure_ring' ||
            cutter.imageShape === 'circle' ||
            cutter.borderRadius >= 100
              ? ('circle' as const)
              : cutter.type === 'pure_pill'
              ? ('pill' as const)
              : ('rect' as const),
          xPct,
          yPct,
          widthPx: Math.max(12, cutter.width),
          heightPx: Math.max(12, cutter.height),
          ringWidth:
            cutter.type === 'pure_ring'
              ? Math.max(2, cutter.borderWidth || 3)
              : cutter.borderWidth > 0 && cutter.borderColor !== 'transparent'
              ? cutter.borderWidth
              : 0,
          ringColor:
            cutter.borderColor && cutter.borderColor !== 'transparent'
              ? cutter.borderColor
              : '#18181B',
        };

    const next = elements
      .filter((e) => e.id !== cutter.id)
      .map((e) => (e.id === base.id ? { ...e, modifiers: [...(e.modifiers || []), newMod] } : e));
    commitElements(next);
    setSelectedId(base.id);
    setSelectedIds([base.id]);
  };

  const joinSelectedWithSplit = () => {
    const selected = elements.filter((e) => selectedIds.includes(e.id));
    if (selected.length < 2 || selected.length > 3) return;
    if (selected.some((e) => e.locked)) {
      flashSaveNotice('Unlock selected elements before joining into a Split Box.', 2500);
      return;
    }
    const sortedByX = [...selected].sort((a, b) => a.x - b.x);
    const minX = Math.min(...selected.map((e) => e.x));
    const minY = Math.min(...selected.map((e) => e.y));
    const maxX = Math.max(...selected.map((e) => e.x + e.width));
    const maxY = Math.max(...selected.map((e) => e.y + e.height));
    const pad = 12;
    const boxId = `pure-split-${Date.now().toString().slice(-4)}`;
    const panes = sortedByX.length === 3 ? 3 : 2;
    const splitMod: SplitModifier = {
      ...(createDefaultModifier('split') as SplitModifier),
      axis: 'vertical',
      panes: panes as 2 | 3,
      ratio: panes === 3 ? 33 : 50,
      ratio2: panes === 3 ? 33 : undefined,
      dividerWidth: 2,
      dividerStyle: 'solid',
      dividerColor: '#18181B',
    };
    const newBox: DesignElement = {
      ...(PURE_PRIMITIVE_DEFAULTS.pure_box as DesignElement),
      id: boxId,
      type: 'pure_box',
      label: `Split Box (${panes} Panes)`,
      content: '',
      subContent: '',
      x: Math.max(0, minX - pad),
      y: Math.max(0, minY - pad),
      width: Math.min(canvasWidth, Math.max(260, maxX - minX + pad * 2)),
      height: Math.min(canvasHeight, Math.max(140, maxY - minY + pad * 2)),
      order: elements.length,
      rowIndex: Math.max(...elements.map((e) => e.rowIndex), 0) + 1,
      colSpan: 12,
      zIndex: Math.max(1, Math.min(...selected.map((e) => e.zIndex || 10)) - 1),
      padding: 0,
      paddingT: 0,
      paddingR: 0,
      paddingB: 0,
      paddingL: 0,
      containerLayout: 'freeform_offset',
      modifiers: [splitMod],
    };
    const indexMap = new Map<string, number>();
    sortedByX.forEach((item, idx) => indexMap.set(item.id, idx));
    const updated = elements.map((el) => {
      if (!indexMap.has(el.id)) return el;
      return {
        ...el,
        parentId: boxId,
        parentPaneIndex: indexMap.get(el.id)!,
        childOffsetX: 12,
        childOffsetY: 12,
        x: 12,
        y: 12,
      };
    });
    commitElements([...updated, newBox]);
    setSelectedId(boxId);
    setSelectedIds([boxId]);
  };

  const alignMultiSelected = (
    mode: 'left' | 'center-x' | 'right' | 'top' | 'center-y' | 'bottom'
  ) => {
    const selected = elements.filter((e) => selectedIds.includes(e.id));
    if (selected.length < 2) return;
    let targetVal = 0;
    if (mode === 'left') targetVal = Math.min(...selected.map((e) => e.x));
    if (mode === 'top') targetVal = Math.min(...selected.map((e) => e.y));
    if (mode === 'right') targetVal = Math.max(...selected.map((e) => e.x + e.width));
    if (mode === 'bottom') targetVal = Math.max(...selected.map((e) => e.y + e.height));
    if (mode === 'center-x') {
      targetVal = Math.round(
        (Math.min(...selected.map((e) => e.x)) + Math.max(...selected.map((e) => e.x + e.width))) / 2
      );
    }
    if (mode === 'center-y') {
      targetVal = Math.round(
        (Math.min(...selected.map((e) => e.y)) + Math.max(...selected.map((e) => e.y + e.height))) / 2
      );
    }

    commitElements(
      elements.map((el) => {
        if (!selectedIds.includes(el.id) || el.locked) return el;
        if (mode === 'left') return { ...el, x: targetVal };
        if (mode === 'top') return { ...el, y: targetVal };
        if (mode === 'right') return { ...el, x: Math.max(0, targetVal - el.width) };
        if (mode === 'bottom') return { ...el, y: Math.max(0, targetVal - el.height) };
        if (mode === 'center-x') return { ...el, x: Math.max(0, Math.round(targetVal - el.width / 2)) };
        return { ...el, y: Math.max(0, Math.round(targetVal - el.height / 2)) };
      })
    );
  };

  const distributeMultiSelected = (axis: 'h' | 'v' | 'gap-h' | 'gap-v') => {
    const selected = elements.filter((e) => selectedIds.includes(e.id));
    if (selected.length < 3) return;
    const isHorizontal = axis === 'h' || axis === 'gap-h';
    const sorted = [...selected].sort((a, b) => (isHorizontal ? a.x - b.x : a.y - b.y));
    const coordMap = new Map<string, number>();

    if (axis === 'gap-h' || axis === 'gap-v') {
      const first = sorted[0];
      const last = sorted[sorted.length - 1];
      const startCoord = isHorizontal ? first.x : first.y;
      const endEdge = isHorizontal ? last.x + last.width : last.y + last.height;
      const sumSizes = sorted.reduce((acc, el) => acc + (isHorizontal ? el.width : el.height), 0);
      const gap = (endEdge - startCoord - sumSizes) / (sorted.length - 1);
      let cursor = startCoord;
      sorted.forEach((item, idx) => {
        coordMap.set(item.id, idx === 0 ? item[isHorizontal ? 'x' : 'y'] : Math.round(cursor));
        cursor += (isHorizontal ? item.width : item.height) + gap;
      });
    } else {
      const minCoord = isHorizontal ? sorted[0].x : sorted[0].y;
      const maxCoord =
        isHorizontal ? sorted[sorted.length - 1].x : sorted[sorted.length - 1].y;
      const step = Math.round((maxCoord - minCoord) / (sorted.length - 1));
      sorted.forEach((item, idx) => coordMap.set(item.id, minCoord + idx * step));
    }

    commitElements(
      elements.map((el) =>
        coordMap.has(el.id) && !el.locked
          ? isHorizontal
            ? { ...el, x: Math.max(0, coordMap.get(el.id)!) }
            : { ...el, y: Math.max(0, coordMap.get(el.id)!) }
          : el
      )
    );
  };

  const alignSelectedOnCanvas = (
    mode: 'left' | 'center-x' | 'right' | 'top' | 'center-y' | 'bottom' | 'full-w'
  ) => {
    if (selectedIds.length > 1 && mode !== 'full-w') {
      alignMultiSelected(mode);
      return;
    }
    if (!selectedElement || selectedElement.locked) return;
    if (mode === 'left') updateSelected({ x: 16 });
    if (mode === 'center-x')
      updateSelected({ x: Math.max(0, Math.round((canvasWidth - selectedElement.width) / 2)) });
    if (mode === 'right')
      updateSelected({ x: Math.max(0, canvasWidth - selectedElement.width - 16) });
    if (mode === 'top') updateSelected({ y: 16 });
    if (mode === 'center-y')
      updateSelected({ y: Math.max(0, Math.round((canvasHeight - selectedElement.height) / 2)) });
    if (mode === 'bottom')
      updateSelected({ y: Math.max(0, canvasHeight - selectedElement.height - 16) });
    if (mode === 'full-w') updateSelected({ x: 16, width: Math.max(120, canvasWidth - 32), colSpan: 12 });
  };

  const addElement = (type: ElementType) => {
    const newEl = buildDefaultElement(type, elements, uiTheme, editingContainer);
    commitElements([...elements, newEl]);
    setSelectedId(newEl.id);
    setSelectedIds([newEl.id]);
  };

  const addAssetPreset = (preset: AssetPreset) => {
    const newEl = buildElementFromAssetPreset(preset, elements, uiTheme, editingContainer);
    commitElements([...elements, newEl]);
    setSelectedId(newEl.id);
    setSelectedIds([newEl.id]);
  };

  const applyOrAddFaIcon = (
    faClass: string,
    iconLabel: string,
    mode: 'apply_or_add' | 'watermark' | 'badge'
  ) => {
    if (mode === 'apply_or_add' && selectedElement && !selectedElement.locked) {
      updateSelected({
        faIcon: faClass,
        ...(selectedElement.type === 'fa_watermark' ? { content: faClass } : {}),
      });
      return;
    }
    const insertMode = mode === 'badge' ? 'badge' : 'watermark';
    const newEl = buildElementFromFaIcon(
      faClass,
      iconLabel,
      insertMode,
      elements,
      uiTheme,
      editingContainer
    );
    commitElements([...elements, newEl]);
    setSelectedId(newEl.id);
    setSelectedIds([newEl.id]);
  };

  const applyGlobalTheme = (
    palette: GlobalThemePalette,
    options: { targetScope: 'all' | 'selected'; applyColors: boolean; applyFonts: boolean }
  ) => {
    const targetIds =
      options.targetScope === 'selected'
        ? selectedIds.length > 0
          ? selectedIds
          : selectedId
          ? [selectedId]
          : null
        : null;
    if (options.targetScope === 'selected' && (!targetIds || targetIds.length === 0)) {
      return;
    }

    const updated = applyThemeToElements(elements, palette, {
      targetIds,
      applyColors: options.applyColors,
      applyFonts: options.applyFonts,
      isToyhouseFree: isToyhouseFreePlatform(platform),
    });

    commitElements(updated);
    if (options.applyColors && options.targetScope === 'all') {
      setCanvasBg(palette.canvasBg);
      setSwatches(paletteToSwatches(palette));
    } else if (options.applyColors) {
      setSwatches((prev) => Array.from(new Set([...paletteToSwatches(palette), ...prev])).slice(0, 12));
    }
  };

  const addCatalogItemAtPosition = useCallback(
    (item: SearchableCatalogItem, x: number, y: number) => {
      const current = elementsRef.current;
      let built: DesignElement | null = null;
      if (item.kind === 'element' && item.elementType) {
        built = buildDefaultElement(item.elementType, current, uiTheme, editingContainer);
      } else if (item.kind === 'asset' && item.assetPreset) {
        built = buildElementFromAssetPreset(item.assetPreset, current, uiTheme, editingContainer);
      } else if (item.kind === 'fa_icon' && item.faIcon) {
        built = buildElementFromFaIcon(
          item.faIcon.cls,
          item.faIcon.label,
          'watermark',
          current,
          uiTheme,
          editingContainer
        );
      } else if (item.kind === 'blueprint' && item.blueprint) {
        built = buildBlueprintInstanceElement(item.blueprint, current, uiTheme);
      }
      if (!built) return;
      const placed: DesignElement = built.parentId
        ? built
        : {
            ...built,
            x: Math.max(0, Math.min(canvasWidth - built.width, Math.round(x - built.width / 2))),
            y: Math.max(0, Math.min(canvasHeight - built.height, Math.round(y - built.height / 2))),
          };
      commitElements([...current, placed]);
      setSelectedId(placed.id);
      setSelectedIds([placed.id]);
    },
    [canvasHeight, canvasWidth, commitElements, editingContainer, elementsRef, uiTheme]
  );

  const handleImportHtmlElements = (params: {
    elements: DesignElement[];
    mode: 'replace' | 'append';
    extractedSwatches: string[];
    applySwatches: boolean;
    roundTripMeta?: {
      mode?: LayoutMode;
      canvasWidth?: number;
      canvasHeight?: number;
      canvasBg?: string;
      canvasPattern?: BgPattern;
    };
  }) => {
    if (params.elements.length === 0) return;
    const nextElements =
      params.mode === 'replace' ? params.elements : [...elements, ...params.elements];
    commitElements(nextElements);
    const firstNewId = params.elements[0]?.id || null;
    setSelectedId(firstNewId);
    setSelectedIds(firstNewId ? [firstNewId] : []);
    setEditingContainerId(null);
    if (params.mode === 'replace' && params.roundTripMeta) {
      const meta = params.roundTripMeta;
      if (meta.mode) setLayoutMode(meta.mode);
      if (meta.canvasWidth) setCanvasWidth(meta.canvasWidth);
      if (meta.canvasHeight) setCanvasHeight(meta.canvasHeight);
      if (meta.canvasBg) setCanvasBg(meta.canvasBg);
      if (meta.canvasPattern) setCanvasPattern(meta.canvasPattern);
    }
    if (params.applySwatches && params.extractedSwatches.length > 0) {
      setSwatches((prev) =>
        params.mode === 'replace'
          ? params.extractedSwatches.slice(0, 10)
          : Array.from(new Set([...params.extractedSwatches, ...prev])).slice(0, 12)
      );
    }
  };

  const addCustomBlueprintInstance = (bp: CustomWidgetBlueprint) => {
    const newEl = buildBlueprintInstanceElement(bp, elements, uiTheme);
    commitElements([...elements, newEl]);
    setSelectedId(newEl.id);
    setSelectedIds([newEl.id]);
  };

  const saveSelectedElementAsBlueprint = () => {
    if (!selectedElement) return;
    const innerHtml = renderInnerElementHTML(selectedElement, false, elements);
    const newBp: CustomWidgetBlueprint = {
      id: `bp-${Date.now().toString().slice(-4)}`,
      name: `${selectedElement.label} Preset`,
      icon: '📦',
      description: `Saved from ${selectedElement.type} layer`,
      defaultWidth: selectedElement.width,
      defaultHeight: selectedElement.height,
      defaultContent: selectedElement.content,
      defaultSubContent: selectedElement.subContent || '',
      defaultUrl: selectedElement.url,
      htmlTemplate:
        selectedElement.type === 'custom_widget' && selectedElement.customHtml
          ? selectedElement.customHtml
          : innerHtml,
    };
    setCustomBlueprints((prev) => [...prev, newBp]);
  };

  const applyTemplatePreset = (preset: TemplatePreset) => {
    if (!confirmDiscardIfDirty('load this template')) return;
    setPlatform(preset.platform);
    setCanvasBg(preset.canvasBg);
    setSwatches(preset.swatches);
    commitElements(preset.elements);
    const firstId = preset.elements[0]?.id || null;
    setSelectedId(firstId);
    setSelectedIds(firstId ? [firstId] : []);
    setEditingContainerId(null);
    setShowTemplatesModal(false);
  };

  // Persistent Base64 DataURL Offline Fallback / ImgBB Auto-Hosting
  const handleLocalImageSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (selectedElement?.locked) {
      flashSaveNotice('Unlock element before replacing its image.', 2500);
      e.target.value = '';
      return;
    }
    setUploadingImage(true);
    setUploadNotice('Processing local image...');

    try {
      const result = await processLocalImageFile(file, imgbbApiKey);
      if (imageUploadTarget.startsWith('gallery:')) {
        const gIdx = parseInt(imageUploadTarget.replace('gallery:', ''), 10);
        const currentGal = [...(selectedElement?.gallery || [])];
        if (currentGal[gIdx]) {
          currentGal[gIdx] = { ...currentGal[gIdx], url: result.url };
          updateSelected({ gallery: currentGal });
        }
      } else if (imageUploadTarget.startsWith('rel-node:')) {
        const nId = imageUploadTarget.replace('rel-node:', '');
        const currentNodes = [...(selectedElement?.relationNodes || [])];
        const nIdx = currentNodes.findIndex((n) => n.id === nId);
        if (nIdx !== -1) {
          currentNodes[nIdx] = { ...currentNodes[nIdx], avatarUrl: result.url };
          updateSelected({ relationNodes: currentNodes });
        }
      } else if (imageUploadTarget === 'hoverImageUrl') {
        updateSelected({ hoverImageUrl: result.url });
      } else {
        updateSelected({ url: result.url });
      }

      if (result.source === 'imgbb') {
        setUploadNotice(`Uploaded to ImgBB & linked permanent URL (${result.sizeKB} KB).`);
      } else if (result.uploadError) {
        setUploadNotice(
          `ImgBB failed (${result.uploadError}). Embedded persistently offline (Base64 DataURL). Replace with HTTPS before Toyhouse export.`
        );
      } else {
        setUploadNotice(
          result.oversizedWarning ||
            `Embedded persistently offline (Base64 DataURL, ${result.sizeKB} KB). Set ImgBB API Key in Settings for public Toyhouse HTTPS hosting.`
        );
      }
    } catch (err: unknown) {
      setUploadNotice(err instanceof Error ? err.message : 'Could not read image file.');
    } finally {
      setUploadingImage(false);
      e.target.value = '';
    }
  };

  const computeLatestExportHtml = useCallback(
    () =>
      generatePlatformExport(
        elementsRef.current,
        layoutMode,
        platform,
        canvasWidth,
        canvasHeight,
        canvasBg,
        canvasPattern
      ).html,
    [canvasBg, canvasHeight, canvasPattern, canvasWidth, elementsRef, layoutMode, platform]
  );

  const handleCopyCode = () => {
    void navigator.clipboard.writeText(computeLatestExportHtml());
    setCopied(true);
    window.setTimeout(() => setCopied(false), 2000);
  };

  const handleExportHtml = () => {
    void handleExportHtmlFile(computeLatestExportHtml());
  };

  const resolveInsertionCoords = useCallback(
    (w: number, h: number, atX?: number, atY?: number) => {
      const tracker = cursorTracker.get();
      const rawX = atX !== undefined ? atX : tracker.inside ? tracker.x : Math.round(canvasWidth / 2);
      const rawY = atY !== undefined ? atY : tracker.inside ? tracker.y : Math.round(canvasHeight / 2);
      return {
        x: Math.max(0, Math.min(Math.max(0, canvasWidth - w), Math.round(rawX - w / 2))),
        y: Math.max(0, Math.min(Math.max(0, canvasHeight - h), Math.round(rawY - h / 2))),
      };
    },
    [canvasHeight, canvasWidth, cursorTracker]
  );

  const insertImageElementAt = useCallback(
    (url: string, label: string, atX?: number, atY?: number) => {
      const current = elementsRef.current;
      const base = buildDefaultElement('image', current, uiTheme, editingContainer);
      const coords = resolveInsertionCoords(base.width, base.height, atX, atY);
      const placed: DesignElement = base.parentId
        ? { ...base, url, label }
        : { ...base, url, label, x: coords.x, y: coords.y };
      commitElements([...current, placed]);
      setSelectedId(placed.id);
      setSelectedIds([placed.id]);
    },
    [commitElements, editingContainer, elementsRef, resolveInsertionCoords, uiTheme]
  );

  const insertPlainTextElementAt = useCallback(
    (text: string, atX?: number, atY?: number) => {
      const current = elementsRef.current;
      const base = buildDefaultElement('pure_paragraph', current, uiTheme, editingContainer);
      const coords = resolveInsertionCoords(base.width, base.height, atX, atY);
      const placed: DesignElement = base.parentId
        ? { ...base, content: text }
        : { ...base, content: text, x: coords.x, y: coords.y };
      commitElements([...current, placed]);
      setSelectedId(placed.id);
      setSelectedIds([placed.id]);
      flashSaveNotice('Pasted text box onto canvas.', 2200);
    },
    [commitElements, editingContainer, elementsRef, flashSaveNotice, resolveInsertionCoords, uiTheme]
  );

  const handleDropOrPasteImageUrl = useCallback(
    (url: string, atX?: number, atY?: number) => {
      insertImageElementAt(url, 'Image Layer', atX, atY);
      flashSaveNotice('Inserted image link onto canvas.', 2200);
    },
    [flashSaveNotice, insertImageElementAt]
  );

  const handleDropOrPasteImageFile = useCallback(
    async (file: File, atX?: number, atY?: number) => {
      setUploadingImage(true);
      setUploadNotice('Processing image for canvas...');
      try {
        const result = await processLocalImageFile(file, imgbbApiKey);
        const cleanName = file.name.replace(/\.[^.]+$/, '') || 'Pasted Image';
        insertImageElementAt(result.url, cleanName, atX, atY);
        if (result.source === 'imgbb') {
          flashSaveNotice(`Uploaded ${cleanName} to ImgBB.`, 2600);
        } else {
          flashSaveNotice(`Inserted ${cleanName} (offline DataURL).`, 2600);
        }
      } catch (err: unknown) {
        flashSaveNotice(
          err instanceof Error ? err.message : 'Could not insert image file.',
          3000
        );
      } finally {
        setUploadingImage(false);
        setUploadNotice(null);
      }
    },
    [flashSaveNotice, imgbbApiKey, insertImageElementAt]
  );

  const saveImgbbKey = (val: string) => {
    setImgbbApiKey(val);
    localStorage.setItem('dbx_imgbb_key', val);
  };

  const applySwatchColor = (hex: string) => {
    if (!selectedElement) return;
    if (swatchTarget === 'borderColor') {
      updateSelected(buildUniformBorderPatch(selectedElement, { borderColor: hex }));
      return;
    }
    updateSelected({ [swatchTarget]: hex });
  };

  const addSelectedColorToSwatches = () => {
    if (!selectedElement) return;
    const hex =
      swatchTarget === 'borderColor'
        ? getDisplayBorderColor(selectedElement)
        : selectedElement[swatchTarget];
    if (
      hex &&
      hex !== 'transparent' &&
      !swatches.some((s) => s.toUpperCase() === hex.toUpperCase())
    ) {
      setSwatches((prev) => [...prev, hex]);
    }
  };

  // Global Keyboard Shortcuts (Customizable Keybindings + Native Desktop Actions)
  useEffect(() => {
    const handleEscapeHierarchy = (): boolean => {
      if (cancelActiveGesture()) {
        return true;
      }
      if (inlineEditId) {
        setInlineEditId(null);
        return true;
      }
      if (spotlightOpen) {
        setSpotlightOpen(false);
        return true;
      }
      if (showLivePreviewModal) {
        setShowLivePreviewModal(false);
        return true;
      }
      if (showSettingsModal) {
        setShowSettingsModal(false);
        return true;
      }
      if (showObjectForgeModal) {
        setShowObjectForgeModal(false);
        return true;
      }
      if (showHtmlImporterModal) {
        setShowHtmlImporterModal(false);
        return true;
      }
      if (showTemplatesModal) {
        setShowTemplatesModal(false);
        return true;
      }
      if (canvasTool !== 'select') {
        setCanvasTool('select');
        setDrawMarquee(null);
        return true;
      }
      if (editingContainerId) {
        const parentId = editingContainerId;
        setEditingContainerId(null);
        setSelectedId(parentId);
        setSelectedIds([parentId]);
        return true;
      }
      if (selectedIds.length > 0 || selectedId !== null) {
        setSelectedId(null);
        setSelectedIds([]);
        return true;
      }
      if (bottomDockOpen) {
        setBottomDockOpen(false);
        return true;
      }
      return false;
    };

    const onKeyDown = (e: KeyboardEvent) => {
      const targetEl = e.target as HTMLElement | null;
      const tag = targetEl?.tagName;
      const isEditableFocused =
        tag === 'INPUT' ||
        tag === 'TEXTAREA' ||
        tag === 'SELECT' ||
        Boolean(targetEl?.isContentEditable);

      if (e.key === 'Escape') {
        if (spotlightOpen) {
          e.preventDefault();
          setSpotlightOpen(false);
          return;
        }
        if (isEditableFocused) {
          // Option B: 1st Esc blurs focused input (and exits inline edit if active); 2nd Esc closes modal/layer
          e.preventDefault();
          targetEl?.blur();
          if (inlineEditId) setInlineEditId(null);
          return;
        }
        if (handleEscapeHierarchy()) {
          e.preventDefault();
        }
        return;
      }

      if (isEditableFocused || inlineEditId || spotlightOpen) {
        return;
      }

      if (e.code === 'Space') {
        e.preventDefault();
        if (!e.repeat) setIsSpacePressed(true);
        return;
      }

      // Spotlight Quick Search (`/` or `Ctrl+K` or custom keybinding)
      if (
        matchesShortcut(e, keybindings.spotlight_search) ||
        (!e.ctrlKey && !e.metaKey && !e.altKey && e.key === '/') ||
        ((e.ctrlKey || e.metaKey) && !e.altKey && !e.shiftKey && e.key.toLowerCase() === 'k')
      ) {
        e.preventDefault();
        setSpotlightOpen(true);
        return;
      }

      // Multi-modifier combos checked before single-modifier shortcuts
      if (matchesShortcut(e, keybindings.save_project_as)) {
        e.preventDefault();
        void handleSaveProjectAs();
        return;
      }
      if (matchesShortcut(e, keybindings.save_project)) {
        e.preventDefault();
        void handleSaveProject();
        return;
      }
      if (matchesShortcut(e, keybindings.open_project)) {
        e.preventDefault();
        void handleOpenProject();
        return;
      }
      if (matchesShortcut(e, keybindings.copy_style)) {
        e.preventDefault();
        copySelectedStyle();
        return;
      }
      if (matchesShortcut(e, keybindings.paste_style)) {
        e.preventDefault();
        pasteStyleToSelected();
        return;
      }
      if (matchesShortcut(e, keybindings.copy_html)) {
        e.preventDefault();
        handleCopyCode();
        return;
      }
      if (matchesShortcut(e, keybindings.redo) || ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'y')) {
        e.preventDefault();
        redo();
        return;
      }
      if (matchesShortcut(e, keybindings.undo)) {
        e.preventDefault();
        undo();
        return;
      }
      if (matchesShortcut(e, keybindings.duplicate)) {
        e.preventDefault();
        duplicateSelected();
        return;
      }
      if (matchesShortcut(e, keybindings.copy)) {
        copySelectedElements();
        return;
      }
      if (matchesShortcut(e, keybindings.paste)) {
        const normalizedBinding = keybindings.paste.trim().toLowerCase();
        const isStandardPaste = normalizedBinding === 'ctrl+v' || normalizedBinding === 'meta+v';
        if (!isStandardPaste && clipboardBundle) {
          e.preventDefault();
          pasteClipboardElement();
        }
        return;
      }
      if (matchesShortcut(e, keybindings.select_all)) {
        e.preventDefault();
        selectAllElements();
        return;
      }
      if (matchesShortcut(e, keybindings.ungroup)) {
        e.preventDefault();
        ungroupSelected();
        return;
      }
      if (matchesShortcut(e, keybindings.group_box)) {
        e.preventDefault();
        groupSelectedIntoBox();
        return;
      }
      if (matchesShortcut(e, keybindings.bring_front)) {
        e.preventDefault();
        bringToFront();
        return;
      }
      if (matchesShortcut(e, keybindings.send_back)) {
        e.preventDefault();
        sendToBack();
        return;
      }
      if (matchesShortcut(e, keybindings.bring_forward)) {
        e.preventDefault();
        adjustZIndex(1);
        return;
      }
      if (matchesShortcut(e, keybindings.send_backward)) {
        e.preventDefault();
        adjustZIndex(-1);
        return;
      }
      if (matchesShortcut(e, keybindings.zoom_reset)) {
        e.preventDefault();
        setZoom(1);
        setPanOffset({ x: 0, y: 0 });
        return;
      }
      if (matchesShortcut(e, keybindings.zoom_fit)) {
        e.preventDefault();
        fitCanvasToView();
        return;
      }
      if (matchesShortcut(e, keybindings.zen_mode)) {
        e.preventDefault();
        const shouldExpand = leftCollapsed && rightCollapsed;
        setLeftCollapsed(!shouldExpand);
        setRightCollapsed(!shouldExpand);
        return;
      }
      if (matchesShortcut(e, keybindings.live_preview)) {
        e.preventDefault();
        setShowLivePreviewModal((v) => !v);
        return;
      }
      if (matchesShortcut(e, keybindings.toggle_snap)) {
        e.preventDefault();
        setMagneticSnap((s) => !s);
        return;
      }
      if (matchesShortcut(e, keybindings.lock_toggle) && selectedId) {
        e.preventDefault();
        toggleLock(selectedId);
        return;
      }
      if (matchesShortcut(e, keybindings.hide_toggle) && selectedId) {
        e.preventDefault();
        toggleHide(selectedId);
        return;
      }
      if (matchesShortcut(e, keybindings.rotate_90)) {
        e.preventDefault();
        rotateSelected90();
        return;
      }
      if (matchesShortcut(e, keybindings.flip_h)) {
        e.preventDefault();
        flipSelected('h');
        return;
      }
      if (matchesShortcut(e, keybindings.flip_v)) {
        e.preventDefault();
        flipSelected('v');
        return;
      }
      if (matchesShortcut(e, keybindings.tool_select)) {
        e.preventDefault();
        setCanvasTool('select');
        return;
      }
      if (matchesShortcut(e, keybindings.tool_box)) {
        e.preventDefault();
        setCanvasTool('draw_box');
        return;
      }
      if (matchesShortcut(e, keybindings.tool_line)) {
        e.preventDefault();
        setCanvasTool('draw_line');
        return;
      }
      if (matchesShortcut(e, keybindings.tool_ring)) {
        e.preventDefault();
        setCanvasTool('draw_ring');
        return;
      }
      if (matchesShortcut(e, keybindings.quick_add_text)) {
        e.preventDefault();
        addElement('pure_paragraph');
        return;
      }
      if (
        matchesShortcut(e, keybindings.delete) ||
        e.key === 'Delete' ||
        e.key === 'Backspace'
      ) {
        e.preventDefault();
        deleteSelected();
        return;
      }

      if (
        (selectedElement || selectedIds.length > 0) &&
        layoutMode !== 'block' &&
        ['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'].includes(e.key)
      ) {
        e.preventDefault();
        const step = e.shiftKey
          ? studioPrefs.shiftNudgeStepPx || 8
          : studioPrefs.nudgeStepPx || 1;
        const dx = e.key === 'ArrowLeft' ? -step : e.key === 'ArrowRight' ? step : 0;
        const dy = e.key === 'ArrowUp' ? -step : e.key === 'ArrowDown' ? step : 0;
        const targetIds = selectedIds.length > 0 ? selectedIds : selectedId ? [selectedId] : [];
        commitCoalesced(
          (prev) => {
            const byId = new Map(prev.map((item) => [item.id, item]));
            const parentIdsToFreeform = new Set<string>();
            let changed = false;
            const moved = prev.map((el) => {
              if (!targetIds.includes(el.id) || el.locked) return el;
              if (el.parentId) {
                const parent = byId.get(el.parentId);
                if (!parent || parent.locked) return el;
                const pRect = getSplitPaneGeometry(parent, el.parentPaneIndex ?? 0);
                const w = el.childCustomWidth || el.width;
                const h = el.childCustomHeight || el.height;
                const nx = Math.max(0, Math.min(Math.max(0, pRect.paneW - w), (el.childOffsetX ?? 12) + dx));
                const ny = Math.max(0, Math.min(Math.max(0, pRect.paneH - h), (el.childOffsetY ?? 12) + dy));
                if (nx === (el.childOffsetX ?? 12) && ny === (el.childOffsetY ?? 12)) return el;
                if (parent.containerLayout !== 'freeform_offset') {
                  parentIdsToFreeform.add(parent.id);
                }
                changed = true;
                return { ...el, childOffsetX: nx, childOffsetY: ny, x: nx, y: ny };
              }
              const nx = Math.max(0, Math.min(canvasWidth - el.width, el.x + dx));
              const ny = Math.max(0, Math.min(canvasHeight - el.height, el.y + dy));
              if (nx === el.x && ny === el.y) return el;
              changed = true;
              return { ...el, x: nx, y: ny };
            });
            if (!changed) return prev;
            if (parentIdsToFreeform.size === 0) return moved;
            return moved.map((el) =>
              parentIdsToFreeform.has(el.id)
                ? { ...el, containerLayout: 'freeform_offset' as const }
                : el
            );
          },
          `nudge:${targetIds.join(',')}`,
          500
        );
      }
    };

    const onKeyUp = (e: KeyboardEvent) => {
      if (e.code === 'Space') setIsSpacePressed(false);
    };
    const onBlur = () => setIsSpacePressed(false);
    const onIframeMessage = (ev: MessageEvent) => {
      if (
        ev.data &&
        typeof ev.data === 'object' &&
        (ev.data as { type?: unknown }).type === 'DBX_ESCAPE_KEY'
      ) {
        handleEscapeHierarchy();
      }
    };

    const onPaste = (e: ClipboardEvent) => {
      const targetEl = e.target as HTMLElement | null;
      const tag = targetEl?.tagName;
      const isEditableFocused =
        tag === 'INPUT' ||
        tag === 'TEXTAREA' ||
        tag === 'SELECT' ||
        Boolean(targetEl?.isContentEditable);
      if (
        isEditableFocused ||
        inlineEditId ||
        spotlightOpen ||
        showLivePreviewModal ||
        showSettingsModal ||
        showObjectForgeModal ||
        showHtmlImporterModal ||
        showTemplatesModal
      ) {
        return;
      }

      const dt = e.clipboardData;
      if (!dt) {
        if (clipboardBundle) {
          e.preventDefault();
          pasteClipboardElement();
        }
        return;
      }

      const files = dt.files ? Array.from(dt.files) : [];
      let imageFile = files.find((f) => f.type.startsWith('image/')) || null;
      if (!imageFile && dt.items) {
        for (const item of Array.from(dt.items)) {
          if (item.kind === 'file' && item.type.startsWith('image/')) {
            const candidate = item.getAsFile();
            if (candidate) {
              imageFile = candidate;
              break;
            }
          }
        }
      }
      if (imageFile) {
        e.preventDefault();
        void handleDropOrPasteImageFile(imageFile);
        return;
      }

      const plainText = dt.getData('text/plain') || '';
      const htmlText = dt.getData('text/html') || '';
      const classified = classifyPastedPayload(plainText, htmlText);

      if (classified.kind === 'internal' || (classified.kind === 'empty' && clipboardBundle)) {
        if (clipboardBundle) {
          e.preventDefault();
          pasteClipboardElement();
        }
        return;
      }

      if (classified.kind === 'image_url') {
        e.preventDefault();
        handleDropOrPasteImageUrl(classified.url);
        return;
      }

      if (classified.kind === 'html_snippet') {
        const current = elementsRef.current;
        const maxRowIndex = current.reduce((m, el) => Math.max(m, el.rowIndex), 0);
        const maxBottomY = current.reduce(
          (m, el) => (el.parentId ? m : Math.max(m, el.y + el.height)),
          24
        );
        const parsed = parseToyhouseHtmlToDesign(classified.html, {
          uiTheme,
          canvasWidth,
          startRowIndex: current.length > 0 ? maxRowIndex + 1 : 0,
          startY: current.length > 0 ? Math.max(24, maxBottomY + 20) : 24,
        });
        if (parsed.elements.length > 0) {
          e.preventDefault();
          const nextElements = [...current, ...parsed.elements];
          commitElements(nextElements);
          const firstId = parsed.elements[0]?.id || null;
          setSelectedId(firstId);
          setSelectedIds(firstId ? [firstId] : []);
          setEditingContainerId(null);
          flashSaveNotice(`Pasted ${parsed.elements.length} element(s) from HTML.`, 2400);
          return;
        }
      }

      if (classified.kind === 'plain_text') {
        e.preventDefault();
        insertPlainTextElementAt(classified.text);
      }
    };

    window.addEventListener('keydown', onKeyDown);
    window.addEventListener('keyup', onKeyUp);
    window.addEventListener('paste', onPaste);
    window.addEventListener('blur', onBlur);
    window.addEventListener('message', onIframeMessage);
    return () => {
      window.removeEventListener('keydown', onKeyDown);
      window.removeEventListener('keyup', onKeyUp);
      window.removeEventListener('paste', onPaste);
      window.removeEventListener('blur', onBlur);
      window.removeEventListener('message', onIframeMessage);
    };
  }, [
    addElement,
    adjustZIndex,
    bottomDockOpen,
    bringToFront,
    cancelActiveGesture,
    canvasHeight,
    canvasTool,
    canvasWidth,
    clipboardBundle,
    commitCoalesced,
    commitElements,
    copySelectedElements,
    copySelectedStyle,
    deleteSelected,
    duplicateSelected,
    editingContainerId,
    elementsRef,
    fitCanvasToView,
    flashSaveNotice,
    flipSelected,
    groupSelectedIntoBox,
    handleCopyCode,
    handleDropOrPasteImageFile,
    handleDropOrPasteImageUrl,
    handleOpenProject,
    handleSaveProject,
    handleSaveProjectAs,
    inlineEditId,
    insertPlainTextElementAt,
    keybindings,
    layoutMode,
    leftCollapsed,
    pasteClipboardElement,
    pasteStyleToSelected,
    redo,
    rightCollapsed,
    rotateSelected90,
    selectAllElements,
    selectedElement,
    selectedId,
    selectedIds,
    sendToBack,
    setDrawMarquee,
    setIsSpacePressed,
    setPanOffset,
    setZoom,
    showHtmlImporterModal,
    showLivePreviewModal,
    showObjectForgeModal,
    showSettingsModal,
    showTemplatesModal,
    spotlightOpen,
    studioPrefs.nudgeStepPx,
    studioPrefs.shiftNudgeStepPx,
    uiTheme,
    undo,
    ungroupSelected,
  ]);

  return (
    <div
      style={
        {
          backgroundColor: 'var(--bg-app)',
          color: 'var(--text-main)',
          cursor:
            panelResizeDrag?.target === 'left' || panelResizeDrag?.target === 'right'
              ? 'col-resize'
              : panelResizeDrag?.target === 'left_split' || panelResizeDrag?.target === 'bottom'
              ? 'row-resize'
              : panDrag?.moved
              ? 'grabbing'
              : undefined,
        } as React.CSSProperties
      }
      className={`h-screen w-screen flex flex-col select-none overflow-hidden ${
        studioPrefs.uiDensity === 'comfortable' ? 'text-[13px]' : 'text-xs'
      }`}
      data-ui-density={studioPrefs.uiDensity}
      onPointerMove={handlePointerMove}
      onPointerUp={handlePointerUp}
      onPointerCancel={() => {
        cancelActiveGesture();
      }}
    >
      <input
        ref={fileInputRef}
        type="file"
        accept=".json,.dbx.json"
        onChange={handleOpenProjectFromFileInput}
        className="hidden"
      />
      <input
        ref={imageUploadRef}
        type="file"
        accept="image/*"
        onChange={(e) => {
          void handleLocalImageSelect(e);
        }}
        className="hidden"
      />

      <TopBar
        projectName={projectName}
        currentFilePath={currentFilePath}
        isDirty={isDirty}
        saveNotice={saveNotice}
        layoutMode={layoutMode}
        platform={platform}
        shieldedElementCount={shieldedElementCount}
        uiTheme={uiTheme}
        canUndo={canUndo}
        canRedo={canRedo}
        bottomDockOpen={bottomDockOpen}
        copied={copied}
        recentProjects={recentProjects}
        localSnapshots={localSnapshots}
        onNewBlankCanvas={handleNewBlankCanvas}
        onOpenObjectForge={() => setShowObjectForgeModal(true)}
        onOpenHtmlImporter={() => setShowHtmlImporterModal(true)}
        onOpenTemplates={() => setShowTemplatesModal(true)}
        onOpenSpotlight={() => setSpotlightOpen(true)}
        onOpenProject={() => {
          void handleOpenProject();
        }}
        onOpenRecentProject={(path) => {
          void handleOpenRecentProject(path);
        }}
        onRestoreSnapshot={(id) => {
          void restoreLocalSnapshot(id);
        }}
        onSaveProject={() => {
          void handleSaveProject();
        }}
        onSaveProjectAs={() => {
          void handleSaveProjectAs();
        }}
        onExportHtml={handleExportHtml}
        onOpenShortcuts={() => {
          setSettingsInitialTab('shortcuts');
          setShowSettingsModal(true);
        }}
        onOpenSettings={() => {
          setSettingsInitialTab('general');
          setShowSettingsModal(true);
        }}
        onResetWorkspaceLayout={handleResetWorkspaceLayout}
        onChangeLayoutMode={setLayoutMode}
        onToggleTheme={() =>
          setUiTheme((t) => {
            const next: UiTheme = t === 'carbon' ? 'paper' : t === 'paper' ? 'cute' : 'carbon';
            if (next === 'cute') setPreviewSurface('th_cute');
            return next;
          })
        }
        onChangePlatform={setPlatform}
        onUndo={undo}
        onRedo={redo}
        onToggleBottomDock={() => setBottomDockOpen((o) => !o)}
        onOpenPreview={() => setShowLivePreviewModal(true)}
        onCopyCode={handleCopyCode}
      />

      <div className="flex-1 flex overflow-hidden min-w-0 min-h-0">
        <LeftSidebar
          leftCollapsed={leftCollapsed}
          leftPanelWidth={effectiveLeftWidth}
          leftLibraryPct={leftLibraryPct}
          leftSidebarTab={leftSidebarTab}
          leftSplitContainerRef={leftSplitContainerRef}
          panelResizeDrag={panelResizeDrag}
          elements={elements}
          selectedElement={selectedElement}
          selectedId={selectedId}
          selectedIds={selectedIds}
          isToyhouseFree={isToyhouseFreePlatform(platform)}
          canvasBg={canvasBg}
          swatches={swatches}
          editingLayerId={editingLayerId}
          customBlueprints={customBlueprints}
          onExpandLeft={() => setLeftCollapsed(false)}
          onCollapseLeft={() => setLeftCollapsed(true)}
          onChangeLeftTab={setLeftSidebarTab}
          onResetLeftWidth={() => setLeftPanelWidth(280)}
          onResetLeftSplit={() => setLeftLibraryPct(58)}
          onStartPanelResize={setPanelResizeDrag}
          onAddElement={addElement}
          onAddAssetPreset={addAssetPreset}
          onApplyOrAddFaIcon={applyOrAddFaIcon}
          onApplyGlobalTheme={applyGlobalTheme}
          onOpenObjectForge={() => setShowObjectForgeModal(true)}
          onAddCustomBlueprint={addCustomBlueprintInstance}
          onDeleteCustomBlueprint={(bpId) =>
            setCustomBlueprints((prev) => prev.filter((item) => item.id !== bpId))
          }
          onSaveSelectedAsBlueprint={saveSelectedElementAsBlueprint}
          onDuplicateSelected={duplicateSelected}
          onSelectLayer={(elId, shiftKey) => {
            if (shiftKey) {
              if (selectedIds.includes(elId)) {
                const next = selectedIds.filter((id) => id !== elId);
                setSelectedIds(next);
                setSelectedId(next[next.length - 1] || null);
              } else {
                setSelectedIds([...selectedIds, elId]);
                setSelectedId(elId);
              }
            } else {
              setSelectedId(elId);
              setSelectedIds([elId]);
            }
          }}
          onStartEditingLayerName={(elId) => {
            const target = elementsRef.current.find((e) => e.id === elId);
            if (!target || target.locked) return;
            setEditingLayerId(elId);
          }}
          onTransientRenameLayer={(elId, label) =>
            replaceElementsTransient((prev) =>
              prev.map((item) => (item.id === elId && !item.locked ? { ...item, label } : item))
            )
          }
          onCommitLayerRename={() => {
            commitLatestElements();
            setEditingLayerId(null);
          }}
          onToggleLock={toggleLock}
          onToggleHide={toggleHide}
          onMoveLayerOrder={moveBlockOrder}
        />

        <CanvasStage
          elements={elements}
          rootCanvasElements={rootCanvasElements}
          solvedRows={solvedRows}
          exportResult={exportResult}
          layoutMode={layoutMode}
          platform={platform}
          uiTheme={uiTheme}
          cuteThemeColors={studioPrefs.cuteThemeColors}
          canvasWidth={canvasWidth}
          canvasHeight={canvasHeight}
          canvasBg={canvasBg}
          canvasPattern={canvasPattern}
          effectiveCanvasHeight={effectiveCanvasHeight}
          viewportSize={viewportSize}
          zoom={zoom}
          panOffset={panOffset}
          canvasScreenLeft={canvasScreenLeft}
          canvasScreenTop={canvasScreenTop}
          cursorTracker={cursorTracker}
          isSpacePressed={isSpacePressed}
          panDrag={panDrag}
          dragState={dragState}
          marqueeSelect={marqueeSelect}
          drawMarquee={drawMarquee}
          dropTargetContainerId={dropTargetContainerId}
          snapLines={snapLines}
          spacingBadges={spacingBadges}
          guides={guides}
          guideDragState={guideDragState}
          panelResizeDrag={panelResizeDrag}
          canvasTool={canvasTool}
          magneticSnap={magneticSnap}
          autoNestDrop={autoNestDrop}
          showHybridOverlay={showHybridOverlay}
          editingContainer={editingContainer}
          editingChildren={editingChildren}
          selectedElement={selectedElement}
          selectedId={selectedId}
          selectedIds={selectedIds}
          inlineEditId={inlineEditId}
          activeCanvasTabs={activeCanvasTabs}
          bottomDockOpen={bottomDockOpen}
          bottomDockTab={bottomDockTab}
          bottomDockHeight={effectiveBottomDockHeight}
          previewSrcDoc={previewSrcDoc}
          previewSurface={previewSurface}
          previewViewport={previewViewport}
          rightCollapsed={rightCollapsed}
          copied={copied}
          swatches={swatches}
          showRulers={studioPrefs.showRulers}
          showSpacingBadges={studioPrefs.showSpacingBadges}
          customBlueprints={customBlueprints}
          spotlightOpen={spotlightOpen}
          onToggleSpotlight={setSpotlightOpen}
          onAddCatalogItemAtPosition={addCatalogItemAtPosition}
          onDropImageFile={(file, x, y) => {
            void handleDropOrPasteImageFile(file, x, y);
          }}
          onDropImageUrl={handleDropOrPasteImageUrl}
          onAdjustZIndex={adjustZIndex}
          onBringToFront={bringToFront}
          onSendToBack={sendToBack}
          onDuplicateSelected={duplicateSelected}
          onToggleLock={toggleLock}
          onToggleHide={toggleHide}
          onUnlockAll={unlockAllElements}
          onSelectAll={selectAllElements}
          onCopySelected={copySelectedElements}
          onPasteAtPosition={pasteClipboardElement}
          onCopyStyle={copySelectedStyle}
          onPasteStyle={pasteStyleToSelected}
          hasCopiedStyle={Boolean(copiedStyle)}
          hasClipboardElement={Boolean(clipboardBundle)}
          onRotateSelected90={rotateSelected90}
          onFlipSelected={flipSelected}
          onPopOutFromContainer={popOutFromContainer}
          onSaveSelectedAsBlueprint={saveSelectedElementAsBlueprint}
          onUpdateElementById={updateElementById}
          canvasRef={canvasRef}
          canvasViewportRef={canvasViewportRef}
          canvasTransformRef={canvasTransformRef}
          onChangeCanvasWidth={setCanvasWidth}
          onChangeCanvasHeight={setCanvasHeight}
          onChangeCanvasBg={setCanvasBg}
          onChangeCanvasPattern={setCanvasPattern}
          onToggleMagneticSnap={() => setMagneticSnap((s) => !s)}
          onChangeShowHybridOverlay={setShowHybridOverlay}
          onChangeZoom={setZoom}
          onZoomTo={zoomTo}
          onFitCanvasToView={fitCanvasToView}
          onCenterCanvasView={centerCanvasView}
          onChangeCanvasTool={setCanvasTool}
          onToggleAutoNestDrop={() => setAutoNestDrop((v) => !v)}
          onExitContainerIsolation={(parentId) => {
            setEditingContainerId(null);
            setSelectedId(parentId);
            setSelectedIds([parentId]);
          }}
          onEnterContainerIsolation={enterContainerIsolation}
          onApplyQuickModifier={applyQuickModifier}
          onSetPanDrag={setPanDrag}
          onSetMarqueeSelect={setMarqueeSelect}
          onSetDrawMarquee={setDrawMarquee}
          onSetSplitDragState={setSplitDragState}
          clientToCanvas={clientToCanvas}
          onPointerDownElement={handlePointerDown}
          onSelectElement={(id, ids) => {
            setSelectedId(id);
            setSelectedIds(ids ?? (id ? [id] : []));
          }}
          onToggleMultiSelectElement={(id) => {
            if (selectedIds.includes(id)) {
              const next = selectedIds.filter((x) => x !== id);
              setSelectedIds(next);
              setSelectedId(next[next.length - 1] || null);
            } else {
              setSelectedIds([...selectedIds, id]);
              setSelectedId(id);
            }
          }}
          onSetInlineEditId={setInlineEditId}
          onUpdateSelected={updateSelected}
          onSetActiveCanvasTabs={setActiveCanvasTabs}
          onAddElement={addElement}
          onOpenObjectForge={() => setShowObjectForgeModal(true)}
          onOpenTemplates={() => setShowTemplatesModal(true)}
          onGroupSelectedIntoBox={groupSelectedIntoBox}
          onSubtractSelectedElements={subtractSelectedElements}
          onJoinSelectedWithSplit={joinSelectedWithSplit}
          onAlignMultiSelected={alignMultiSelected}
          onDistributeMultiSelected={distributeMultiSelected}
          onStartGuideDrag={startGuideDrag}
          onRemoveGuide={(guideId) => setGuides((prev) => prev.filter((g) => g.id !== guideId))}
          onClearAllGuides={() => setGuides([])}
          onDeleteSelected={deleteSelected}
          onChangeBottomDockTab={setBottomDockTab}
          onSetBottomDockOpen={setBottomDockOpen}
          onStartBottomDockResize={setPanelResizeDrag}
          onResetBottomDockHeight={() => setBottomDockHeight(230)}
          onChangePlatform={setPlatform}
          onCopyCode={handleCopyCode}
          onExportHtml={handleExportHtml}
          onChangePreviewSurface={setPreviewSurface}
          onChangePreviewViewport={setPreviewViewport}
          onOpenRightCodeTab={() => {
            setInspectorTab('f2u_code');
            setRightCollapsed(false);
          }}
        />

        <RightInspector
          rightCollapsed={rightCollapsed}
          rightPanelWidth={effectiveRightWidth}
          panelResizeDrag={panelResizeDrag}
          inspectorTab={inspectorTab}
          elements={elements}
          selectedElement={selectedElement}
          selectedIds={selectedIds}
          canvasWidth={canvasWidth}
          canvasHeight={canvasHeight}
          canvasBg={canvasBg}
          canvasPattern={canvasPattern}
          containerCandidates={containerCandidates}
          nestedChildren={nestedChildren}
          layoutMode={layoutMode}
          editingContainerId={editingContainerId}
          platform={platform}
          exportResult={exportResult}
          copied={copied}
          swatches={swatches}
          swatchTarget={swatchTarget}
          uploadingImage={uploadingImage}
          imageUploadTarget={imageUploadTarget}
          uploadNotice={uploadNotice}
          onChangeCanvasWidth={setCanvasWidth}
          onChangeCanvasHeight={setCanvasHeight}
          onChangeCanvasBg={setCanvasBg}
          onChangeCanvasPattern={setCanvasPattern}
          onBatchUpdateSelected={updateSelected}
          onAlignMultiSelected={alignMultiSelected}
          onDistributeMultiSelected={distributeMultiSelected}
          onGroupSelectedIntoBox={groupSelectedIntoBox}
          onClearSelection={() => {
            setSelectedId(null);
            setSelectedIds([]);
          }}
          onExpandRight={() => setRightCollapsed(false)}
          onCollapseRight={() => setRightCollapsed(true)}
          onStartPanelResize={setPanelResizeDrag}
          onResetRightWidth={() => setRightPanelWidth(320)}
          onChangeInspectorTab={setInspectorTab}
          onUpdateSelected={updateSelected}
          onSelectElementById={(id) => {
            setSelectedId(id);
            setSelectedIds([id]);
          }}
          onToggleLock={toggleLock}
          onToggleHide={toggleHide}
          onAdjustZIndex={adjustZIndex}
          onDuplicateSelected={duplicateSelected}
          onDeleteSelected={deleteSelected}
          onAlignSelectedOnCanvas={alignSelectedOnCanvas}
          onNestIntoContainer={nestElementIntoContainer}
          onPopOutFromContainer={popOutFromContainer}
          onReorderNestedChild={reorderNestedChild}
          onEnterContainerIsolation={enterContainerIsolation}
          onExitContainerIsolation={() => {
            if (editingContainerId) {
              const pid = editingContainerId;
              setEditingContainerId(null);
              setSelectedId(pid);
              setSelectedIds([pid]);
            }
          }}
          onTriggerImageUpload={(target) => {
            setImageUploadTarget(target);
            imageUploadRef.current?.click();
          }}
          onSetSwatchTarget={setSwatchTarget}
          onAddSelectedColorToSwatches={addSelectedColorToSwatches}
          onApplySwatchColor={applySwatchColor}
          onRemoveSwatch={(hex) => setSwatches((prev) => prev.filter((c) => c !== hex))}
          onChangePlatform={setPlatform}
          onCopyCode={handleCopyCode}
          onExportHtml={handleExportHtml}
        />
      </div>

      {/* Modals */}
      <ObjectForgeModal
        open={showObjectForgeModal}
        canvasBg={canvasBg}
        uiTheme={uiTheme}
        onClose={() => setShowObjectForgeModal(false)}
        onCreateBlueprint={(bp) => {
          setCustomBlueprints((prev) => [...prev, bp]);
          addCustomBlueprintInstance(bp);
          setShowObjectForgeModal(false);
        }}
      />

      <HtmlImporterModal
        open={showHtmlImporterModal}
        uiTheme={uiTheme}
        canvasWidth={canvasWidth}
        existingCount={elements.length}
        maxRowIndex={elements.reduce((m, el) => Math.max(m, el.rowIndex), 0)}
        maxBottomY={elements.reduce((m, el) => (el.parentId ? m : Math.max(m, el.y + el.height)), 24)}
        onClose={() => setShowHtmlImporterModal(false)}
        onImportElements={handleImportHtmlElements}
      />

      <TemplatesModal
        open={showTemplatesModal}
        recentProjects={recentProjects}
        localSnapshots={localSnapshots}
        onClose={() => setShowTemplatesModal(false)}
        onNewBlankCanvas={handleNewBlankCanvas}
        onNewBlankWithSize={handleNewBlankWithSize}
        onApplyPreset={applyTemplatePreset}
        onOpenHtmlImporter={() => setShowHtmlImporterModal(true)}
        onOpenProject={() => {
          void handleOpenProject();
        }}
        onOpenRecentProject={(path) => {
          void handleOpenRecentProject(path);
          setShowTemplatesModal(false);
        }}
        onRestoreSnapshot={(id) => {
          void restoreLocalSnapshot(id);
          setShowTemplatesModal(false);
        }}
      />

      <SettingsModal
        open={showSettingsModal}
        initialTab={settingsInitialTab}
        uiTheme={uiTheme}
        imgbbApiKey={imgbbApiKey}
        localSnapshots={localSnapshots}
        lastSnapshotAt={lastSnapshotAt}
        studioPrefs={studioPrefs}
        keybindings={keybindings}
        onChangeUiTheme={(nextTheme) => {
          setUiTheme(nextTheme);
          if (nextTheme === 'cute') setPreviewSurface('th_cute');
        }}
        onChangeImgbbKey={saveImgbbKey}
        onCreateSnapshot={() => {
          void createManualSnapshot();
        }}
        onRestoreSnapshot={(id) => {
          void restoreLocalSnapshot(id);
          setShowSettingsModal(false);
        }}
        onChangeStudioPrefs={handleChangeStudioPrefs}
        onChangeKeybindings={handleChangeKeybindings}
        onClose={() => setShowSettingsModal(false)}
      />

      <LivePreviewModal
        open={showLivePreviewModal}
        platform={platform}
        layoutMode={layoutMode}
        canvasWidth={canvasWidth}
        canvasHeight={canvasHeight}
        elements={elements}
        canvasBg={canvasBg}
        cuteThemeBg={studioPrefs.cuteThemeColors.bgApp}
        previewSurface={previewSurface}
        previewViewport={previewViewport}
        previewSrcDoc={previewSrcDoc}
        compareNightSrcDoc={compareNightSrcDoc}
        compareLightSrcDoc={compareLightSrcDoc}
        toyhouseShell={previewToyhouseShell}
        onToggleToyhouseShell={() => setPreviewToyhouseShell((v) => !v)}
        onChangeSurface={setPreviewSurface}
        onChangeViewport={setPreviewViewport}
        onClose={() => setShowLivePreviewModal(false)}
        onExportHtml={handleExportHtml}
      />

      {!isTauriRuntime() && saveNotice && (
        <span className="sr-only">{saveNotice}</span>
      )}
    </div>
  );
}
