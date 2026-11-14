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
import { getInnerBoxGeometry } from './utils/canvasGeometry';
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
import {
  applyStudioThemeToDocument,
  extractDesignImageUrls,
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

  const [leftSidebarTab, setLeftSidebarTab] = useState<LeftSidebarTab>('pure');
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
    replaceElementsTransient,
    commitLatestElements,
    undo,
    redo,
    saveNotice,
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
    cursorCoords,
    setCursorCoords,
    cursorInViewport,
    setCursorInViewport,
    isSpacePressed,
    setIsSpacePressed,
    panDrag,
    setPanDrag,
    clampPan,
    zoomTo,
    fitCanvasToView,
    centerCanvasView,
    clientToCanvas,
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
    onChangeGuides: setGuides,
  });

  const isCanvasDragging = Boolean(
    dragState || splitDragState || guideDragState || panelResizeDrag || drawMarquee
  );
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
    const cute = studioPrefs.cuteThemeColors;
    const themeMap: Record<
      PreviewSurface,
      {
        bg: string;
        text: string;
        navBg: string;
        navText: string;
        sideBg: string;
        sideBorder: string;
        cardBg: string;
        muted: string;
        link: string;
        bannerBg: string;
        bannerText: string;
      }
    > = {
      th_dark: {
        bg: '#16141C',
        text: '#DCD9E6',
        navBg: '#23202D',
        navText: '#EDEAF5',
        sideBg: '#272333',
        sideBorder: '#363147',
        cardBg: '#2B2537',
        muted: '#9D97B0',
        link: '#6CB8C0',
        bannerBg: '#4E8C93',
        bannerText: '#FFFFFF',
      },
      th_light: {
        bg: '#F4F5F7',
        text: '#212529',
        navBg: '#FFFFFF',
        navText: '#212529',
        sideBg: '#F8F9FA',
        sideBorder: '#DEE2E6',
        cardBg: '#FFFFFF',
        muted: '#6C757D',
        link: '#007BFF',
        bannerBg: '#007BFF',
        bannerText: '#FFFFFF',
      },
      th_pink: {
        bg: '#FDF3F7',
        text: '#472D38',
        navBg: '#D87A9D',
        navText: '#FFFFFF',
        sideBg: '#FFF9FB',
        sideBorder: '#F2D2DF',
        cardBg: '#FFF5F9',
        muted: '#946B7D',
        link: '#C94D7C',
        bannerBg: '#D87A9D',
        bannerText: '#FFFFFF',
      },
      th_teal: {
        bg: '#EDF6F7',
        text: '#1D373B',
        navBg: '#265C63',
        navText: '#FFFFFF',
        sideBg: '#F7FBFB',
        sideBorder: '#C7E0E3',
        cardBg: '#F1F9FA',
        muted: '#5D8085',
        link: '#247E88',
        bannerBg: '#3D8891',
        bannerText: '#FFFFFF',
      },
      th_cute: {
        bg: cute.bgApp,
        text: cute.textMain,
        navBg: cute.accentSecondary,
        navText: '#FFFFFF',
        sideBg: cute.bgPanel,
        sideBorder: cute.borderMain,
        cardBg: cute.bgPanelAlt,
        muted: cute.textMuted,
        link: cute.accentPrimary,
        bannerBg: cute.accentPrimary,
        bannerText: '#FFFFFF',
      },
      paper: {
        bg: '#E5E0D5',
        text: '#2C2A28',
        navBg: '#2C2A28',
        navText: '#F7F5F0',
        sideBg: '#F0ECE3',
        sideBorder: '#DCD6C8',
        cardBg: '#F7F5F0',
        muted: '#78736A',
        link: '#C86D51',
        bannerBg: '#C86D51',
        bannerText: '#FFFFFF',
      },
    };
    const palette = themeMap[previewSurface] || themeMap.th_dark;
    const isTh = platform.startsWith('toyhouse');
    const useShell = isTh && previewToyhouseShell;
    const escapeHtmlText = (v: string) =>
      v.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
    const escapeHtmlAttr = (v: string) =>
      escapeHtmlText(v).replace(/"/g, '&quot;').replace(/'/g, '&#39;');
    const safeTitle = escapeHtmlText(projectName || 'Character Profile');
    const designImages = extractDesignImageUrls(elements);
    const firstDesignImage = designImages[0];
    const createdDateStr = new Date().toLocaleDateString('en-GB', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
    });

    const dbxIconBadge = (sizePx: number, fontSizePx: number, radiusPx = 4) => `
      <span class="th-dbx-avatar" style="width:${sizePx}px;height:${sizePx}px;border-radius:${radiusPx}px;font-size:${fontSizePx}px;">DBX</span>
    `;

    const primaryCharAvatarHtml = firstDesignImage
      ? `<img src="${escapeHtmlAttr(firstDesignImage)}" alt="${safeTitle}" class="th-char-avatar-img" />`
      : dbxIconBadge(64, 15, 6);

    const sidebarCharThumbHtml = firstDesignImage
      ? `<img src="${escapeHtmlAttr(firstDesignImage)}" alt="${safeTitle}" class="th-side-mini-img" />`
      : dbxIconBadge(26, 8, 4);

    const recentImagesHtml =
      designImages.length > 0
        ? designImages
            .slice(0, 6)
            .map(
              (imgUrl, idx) => `
          <div class="th-recent-thumb">
            <img src="${escapeHtmlAttr(imgUrl)}" alt="Design Image ${idx + 1}" />
            <span class="th-thumb-edit"><i class="fa-solid fa-pencil"></i></span>
          </div>`
            )
            .join('')
        : Array.from({ length: 4 }, (_, idx) => `
          <div class="th-recent-thumb placeholder">
            <div class="th-thumb-placeholder-inner">
              <i class="fa-regular fa-image"></i>
              <span>Image ${idx + 1}</span>
            </div>
            <span class="th-thumb-edit"><i class="fa-solid fa-pencil"></i></span>
          </div>`).join('');

    const bsFallbackCss = isTh
      ? `
      .collapse:not(.show) { display: none; }
      .container { width: 100%; padding-right: 15px; padding-left: 15px; margin-right: auto; margin-left: auto; }
      .row { display: flex; flex-wrap: wrap; margin-right: -15px; margin-left: -15px; }
      .no-gutters { margin-right: 0; margin-left: 0; }
      .no-gutters > .col, .no-gutters > [class*="col-"] { padding-right: 0; padding-left: 0; }
      .mx-auto { margin-left: auto !important; margin-right: auto !important; }
      .w-100 { width: 100% !important; }
      .p-0 { padding: 0 !important; }
      .p-1 { padding: 0.25rem !important; }
      .p-3 { padding: 1rem !important; }
      .col-12 { position: relative; width: 100%; flex: 0 0 100%; max-width: 100%; }
      @media (min-width: 576px) {
        .col-sm-6 { position: relative; width: 100%; flex: 0 0 50%; max-width: 50%; }
      }
      @media (min-width: 768px) {
        ${Array.from({ length: 12 }, (_, i) => `.col-md-${i + 1} { flex: 0 0 ${(((i + 1) / 12) * 100).toFixed(4)}%; max-width: ${(((i + 1) / 12) * 100).toFixed(4)}%; }`).join('\n        ')}
      }
      @media (min-width: 992px) {
        ${Array.from({ length: 12 }, (_, i) => `.col-lg-${i + 1} { flex: 0 0 ${(((i + 1) / 12) * 100).toFixed(4)}%; max-width: ${(((i + 1) / 12) * 100).toFixed(4)}%; }`).join('\n        ')}
      }
      .card { background-color: ${palette.cardBg}; border: 1px solid ${palette.sideBorder}; border-radius: 0.25rem; }
      .card-header { border-bottom: 1px solid ${palette.sideBorder}; }
      .bg-faded { background-color: ${palette.sideBg}; }
      .text-muted { color: ${palette.muted} !important; }
      .btn { display: inline-block; font-weight: 400; text-align: center; vertical-align: middle; user-select: none; border: 1px solid transparent; padding: 0.375rem 0.75rem; font-size: 1rem; line-height: 1.5; border-radius: 0.25rem; }
      .btn-block { display: block; width: 100%; }
      .btn-sm { padding: 0.25rem 0.5rem; font-size: 0.875rem; line-height: 1.5; border-radius: 0.2rem; }
      `
      : '';

    const shellStyles = useShell
      ? `
      .th-dbx-avatar {
        display: inline-flex;
        align-items: center;
        justify-content: center;
        background: linear-gradient(135deg, ${palette.bannerBg}, ${palette.link});
        color: #fff;
        font-family: ui-monospace, SFMono-Regular, Menlo, monospace;
        font-weight: 800;
        letter-spacing: 0.04em;
        flex-shrink: 0;
        box-shadow: inset 0 0 0 1px rgba(255,255,255,0.22);
      }
      .th-sim-nav {
        height: 42px;
        background-color: ${palette.navBg};
        color: ${palette.navText};
        padding: 0 16px;
        display: flex;
        align-items: center;
        justify-content: space-between;
        font-size: 12.5px;
        border-bottom: 1px solid ${palette.sideBorder};
      }
      .th-nav-left, .th-nav-right {
        display: flex;
        align-items: center;
        gap: 14px;
      }
      .th-nav-brand {
        font-weight: 700;
        font-size: 14px;
        letter-spacing: 0.04em;
      }
      .th-nav-link {
        display: inline-flex;
        align-items: center;
        gap: 5px;
        opacity: 0.84;
        font-size: 12px;
      }
      .th-nav-user {
        display: inline-flex;
        align-items: center;
        gap: 7px;
        font-weight: 600;
        font-size: 12px;
      }
      .th-sim-layout {
        display: flex;
        align-items: stretch;
        min-height: calc(100vh - 42px);
      }
      .th-sim-sidebar {
        width: 215px;
        flex-shrink: 0;
        background-color: ${palette.sideBg};
        border-right: 1px solid ${palette.sideBorder};
        font-size: 12px;
      }
      .th-side-banner {
        background-color: ${palette.bannerBg};
        color: ${palette.bannerText};
        padding: 7px 12px;
        font-weight: 600;
        font-size: 12.5px;
        display: flex;
        align-items: center;
        gap: 8px;
      }
      .th-side-owner-row {
        display: flex;
        align-items: center;
        gap: 8px;
        padding: 8px 12px;
        color: ${palette.link};
        font-weight: 600;
      }
      .th-side-char-row {
        display: flex;
        align-items: center;
        gap: 8px;
        padding: 8px 12px;
        background-color: rgba(255,255,255,0.04);
        border-left: 3px solid ${palette.bannerBg};
        color: ${palette.text};
        font-weight: 600;
      }
      .th-side-mini-img {
        width: 26px;
        height: 26px;
        border-radius: 4px;
        object-fit: cover;
        flex-shrink: 0;
        border: 1px solid ${palette.sideBorder};
      }
      .th-side-group {
        border-top: 1px solid ${palette.sideBorder};
        padding: 5px 0;
      }
      .th-side-link {
        display: flex;
        align-items: center;
        justify-content: space-between;
        padding: 5px 12px;
        color: ${palette.link};
        font-size: 12px;
      }
      .th-side-link-left {
        display: flex;
        align-items: center;
        gap: 8px;
      }
      .th-side-link-left i {
        width: 14px;
        text-align: center;
        opacity: 0.85;
      }
      .th-side-count {
        background-color: ${palette.cardBg};
        color: ${palette.muted};
        border: 1px solid ${palette.sideBorder};
        border-radius: 4px;
        padding: 0 5px;
        font-size: 10.5px;
        font-weight: 600;
      }
      .th-side-control-item {
        display: flex;
        align-items: center;
        justify-content: space-between;
        padding: 6px 12px;
        color: ${palette.link};
        font-size: 11.5px;
        border-bottom: 1px solid ${palette.sideBorder};
      }
      .th-sim-main {
        flex: 1;
        min-width: 0;
        padding: 14px 22px 24px;
      }
      .th-char-header {
        background-color: ${palette.cardBg};
        border: 1px solid ${palette.sideBorder};
        border-radius: 4px;
        padding: 12px 16px;
        display: flex;
        flex-wrap: wrap;
        align-items: center;
        justify-content: space-between;
        gap: 14px;
        margin-bottom: 18px;
      }
      .th-char-identity {
        display: flex;
        align-items: center;
        gap: 14px;
        min-width: 0;
      }
      .th-char-avatar-img {
        width: 64px;
        height: 64px;
        border-radius: 5px;
        object-fit: cover;
        border: 1px solid ${palette.sideBorder};
        flex-shrink: 0;
      }
      .th-char-title {
        font-size: 21px;
        font-weight: 500;
        margin: 0 0 2px;
        color: ${palette.text};
        line-height: 1.2;
      }
      .th-char-user {
        font-size: 12px;
        color: ${palette.link};
        display: flex;
        align-items: center;
        gap: 5px;
      }
      .th-char-meta {
        display: grid;
        grid-template-columns: 78px auto;
        gap: 4px 20px;
        font-size: 11.5px;
        padding-left: 16px;
        border-left: 1px solid ${palette.sideBorder};
      }
      .th-meta-label {
        color: ${palette.muted};
        font-weight: 600;
      }
      .th-meta-value {
        color: ${palette.text};
      }
      .th-meta-link {
        color: ${palette.link};
      }
      .th-section-heading {
        font-size: 17px;
        font-weight: 400;
        color: ${palette.text};
        border-bottom: 1px solid ${palette.sideBorder};
        padding-bottom: 6px;
        margin: 0 0 14px;
      }
      .th-recent-header {
        display: flex;
        align-items: center;
        justify-content: space-between;
        border-bottom: 1px solid ${palette.sideBorder};
        padding-bottom: 6px;
        margin: 26px 0 12px;
      }
      .th-recent-header h2 {
        font-size: 17px;
        font-weight: 400;
        margin: 0;
        color: ${palette.text};
      }
      .th-view-more {
        background-color: ${palette.cardBg};
        border: 1px solid ${palette.sideBorder};
        color: ${palette.text};
        font-size: 11px;
        padding: 4px 10px;
        border-radius: 4px;
      }
      .th-recent-grid {
        display: grid;
        grid-template-columns: repeat(auto-fill, minmax(128px, 1fr));
        gap: 10px;
      }
      .th-recent-thumb {
        position: relative;
        aspect-ratio: 1 / 1;
        background-color: ${palette.cardBg};
        border: 1px solid ${palette.sideBorder};
        border-radius: 3px;
        padding: 5px;
        overflow: hidden;
        display: flex;
        align-items: center;
        justify-content: center;
      }
      .th-recent-thumb img {
        width: 100%;
        height: 100%;
        object-fit: cover;
        border-radius: 2px;
        display: block;
      }
      .th-recent-thumb.placeholder {
        border-style: dashed;
      }
      .th-thumb-placeholder-inner {
        display: flex;
        flex-direction: column;
        align-items: center;
        gap: 6px;
        color: ${palette.muted};
        font-size: 11px;
        opacity: 0.7;
      }
      .th-thumb-placeholder-inner i {
        font-size: 20px;
      }
      .th-thumb-edit {
        position: absolute;
        right: 6px;
        bottom: 6px;
        width: 22px;
        height: 22px;
        border-radius: 3px;
        background-color: ${palette.sideBg};
        border: 1px solid ${palette.sideBorder};
        color: ${palette.muted};
        display: inline-flex;
        align-items: center;
        justify-content: center;
        font-size: 10px;
      }
      @media (max-width: 767px) {
        .th-sim-sidebar { display: none; }
        .th-sim-main { padding: 10px; }
        .th-char-meta { border-left: none; padding-left: 0; }
      }
      `
      : '';

    const bodyContent = useShell
      ? `
    <header class="th-sim-nav">
      <div class="th-nav-left">
        <span class="th-nav-brand">TOYHOU.SE</span>
        <span class="th-nav-link"><i class="fa-solid fa-home"></i><span>Profile</span></span>
        <span class="th-nav-link"><i class="fa-solid fa-comments"></i><span>Forums</span></span>
        <span class="th-nav-link"><i class="fa-solid fa-search"></i><span>Browse</span><i class="fa-solid fa-caret-down" style="font-size:9px;"></i></span>
        <span class="th-nav-link"><i class="fa-solid fa-plus"></i><span>Submit</span><i class="fa-solid fa-caret-down" style="font-size:9px;"></i></span>
      </div>
      <div class="th-nav-right">
        <span class="th-nav-link" style="opacity:0.7;"><i class="fa-solid fa-envelope"></i></span>
        <span class="th-nav-user">
          ${dbxIconBadge(22, 8, 4)}
          <span>user</span>
          <i class="fa-solid fa-caret-down" style="font-size:9px;opacity:0.7;"></i>
        </span>
      </div>
    </header>
    <div class="th-sim-layout">
      <aside class="th-sim-sidebar">
        <div class="th-side-banner">
          <i class="fa-solid fa-heart"></i>
          <span>Character</span>
        </div>
        <div class="th-side-owner-row">
          ${dbxIconBadge(26, 8, 4)}
          <span class="text-truncate">user</span>
        </div>
        <div class="th-side-banner">
          <i class="fa-solid fa-folder"></i>
          <span>Character</span>
        </div>
        <div class="th-side-char-row">
          ${sidebarCharThumbHtml}
          <span style="overflow:hidden;text-overflow:ellipsis;white-space:nowrap;">${safeTitle}</span>
        </div>
        <div class="th-side-group">
          <div class="th-side-link">
            <span class="th-side-link-left"><i class="fa-regular fa-images"></i><span>Gallery</span></span>
            <span class="th-side-count">${designImages.length}</span>
          </div>
          <div class="th-side-link"><span class="th-side-link-left"><i class="fa-solid fa-book"></i><span>Library</span></span></div>
          <div class="th-side-link"><span class="th-side-link-left"><i class="fa-solid fa-globe"></i><span>Worlds</span></span></div>
          <div class="th-side-link"><span class="th-side-link-left"><i class="fa-solid fa-link"></i><span>Links</span></span></div>
        </div>
        <div class="th-side-group">
          <div class="th-side-link"><span class="th-side-link-left"><i class="fa-regular fa-comments"></i><span>Comments</span></span></div>
          <div class="th-side-link">
            <span class="th-side-link-left"><i class="fa-regular fa-star"></i><span>Favorite</span></span>
            <span class="th-side-count">1</span>
          </div>
          <div class="th-side-link"><span class="th-side-link-left"><i class="fa-solid fa-certificate"></i><span>Ownership</span></span></div>
        </div>
        <div class="th-side-group">
          <div class="th-side-link"><span class="th-side-link-left"><i class="fa-solid fa-triangle-exclamation"></i><span>Report</span></span></div>
          <div class="th-side-link"><span class="th-side-link-left"><i class="fa-solid fa-ban"></i><span>Block</span></span></div>
        </div>
        <div class="th-side-banner" style="margin-top:4px;">
          <i class="fa-solid fa-wrench"></i>
          <span>Control Panel</span>
        </div>
        <div class="th-side-control-item"><span>Manage Character</span><i class="fa-solid fa-caret-right"></i></div>
        <div class="th-side-control-item"><span>Manage Images</span><i class="fa-solid fa-caret-right"></i></div>
        <div class="th-side-control-item"><span>Manage Literatures</span><i class="fa-solid fa-caret-right"></i></div>
      </aside>
      <main class="th-sim-main">
        <div class="th-char-header">
          <div class="th-char-identity">
            ${primaryCharAvatarHtml}
            <div style="min-width:0;">
              <h1 class="th-char-title">${safeTitle}</h1>
              <div class="th-char-user"><i class="fa-solid fa-user"></i><span>user</span></div>
            </div>
          </div>
          <div class="th-char-meta">
            <span class="th-meta-label">Created</span>
            <span class="th-meta-value">${createdDateStr}</span>
            <span class="th-meta-label">Creator</span>
            <span class="th-meta-link"><i class="fa-solid fa-user" style="margin-right:4px;"></i>user</span>
            <span class="th-meta-label">Favorites</span>
            <span class="th-meta-link">1</span>
          </div>
        </div>

        <h2 class="th-section-heading">Profile</h2>
        <div class="user-content mx-auto" style="max-width: ${Math.max(canvasWidth + 32, 920)}px;">
          ${exportResult.html}
        </div>

        <div class="th-recent-header">
          <h2>Recent Images</h2>
          <span class="th-view-more">View More</span>
        </div>
        <div class="th-recent-grid">
          ${recentImagesHtml}
        </div>
      </main>
    </div>`
      : `<div style="padding: 16px;">${exportResult.html}</div>`;

    return `<!doctype html>
<html>
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <link rel="preconnect" href="https://fonts.googleapis.com" />
    <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin />
    <link href="https://fonts.googleapis.com/css2?family=Caveat:wght@400..700&family=Cinzel:wght@400..900&family=Cormorant+Garamond:ital,wght@0,300..700;1,300..700&family=Inter:wght@300..800&family=Montserrat:ital,wght@0,300..800;1,300..800&family=Orbitron:wght@400..900&family=Playfair+Display:ital,wght@0,400..900;1,400..900&family=Press+Start+2P&family=Space+Grotesk:wght@300..700&family=Syne:wght@400..800&display=swap" rel="stylesheet" />
    <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.5.1/css/all.min.css" crossorigin="anonymous" referrerpolicy="no-referrer" />
    ${isTh ? '<link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/bootstrap@4.6.2/dist/css/bootstrap.min.css" crossorigin="anonymous" />' : ''}
    <style>
      *, *::before, *::after { box-sizing: border-box; }
      html, body {
        margin: 0;
        padding: 0;
        min-height: 100%;
        background-color: ${palette.bg};
        color: ${palette.text};
        font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
        font-size: 14px;
        line-height: 1.5;
      }
      a { color: ${palette.link}; }
      ${bsFallbackCss}
      ${shellStyles}
    </style>
  </head>
  <body>
    ${bodyContent}
    <script>
      document.addEventListener('click', function (e) {
        var tabTrigger = e.target.closest('[data-toggle="tab"]');
        if (tabTrigger) {
          e.preventDefault();
          var targetSel = tabTrigger.getAttribute('href') || tabTrigger.getAttribute('data-target');
          var nav = tabTrigger.closest('.nav');
          if (nav) {
            nav.querySelectorAll('.nav-link').forEach(function (l) { l.classList.remove('active'); });
            tabTrigger.classList.add('active');
          }
          if (targetSel) {
            var pane = document.querySelector(targetSel);
            if (pane && pane.parentElement) {
              pane.parentElement.querySelectorAll('.tab-pane').forEach(function (p) {
                p.classList.remove('active', 'show');
              });
              pane.classList.add('active', 'show');
            }
          }
          return;
        }
        var colTrigger = e.target.closest('[data-toggle="collapse"]');
        if (colTrigger) {
          e.preventDefault();
          var colSel = colTrigger.getAttribute('href') || colTrigger.getAttribute('data-target');
          if (colSel) {
            var colEl = document.querySelector(colSel);
            if (colEl) colEl.classList.toggle('show');
          }
        }
      });
      document.addEventListener('keydown', function (e) {
        if (e.key === 'Escape') {
          window.parent.postMessage({ type: 'DBX_ESCAPE_KEY' }, '*');
        }
      });
    </script>
  </body>
</html>`;
  }, [
    isPreviewVisible,
    canvasWidth,
    elements,
    exportResult.html,
    platform,
    previewSurface,
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

  const handleOpenProject = useCallback(async () => {
    const handledNatively = await handleOpenProjectNative();
    if (!handledNatively) {
      fileInputRef.current?.click();
    }
  }, [handleOpenProjectNative]);

  const updateSelected = useCallback(
    (patch: Partial<DesignElement>) => {
      const targetIds = selectedIds.length > 0 ? selectedIds : selectedId ? [selectedId] : [];
      if (targetIds.length === 0) return;
      commitWithUpdater((prev) =>
        prev.map((el) => (targetIds.includes(el.id) ? { ...el, ...patch } : el))
      );
    },
    [commitWithUpdater, selectedId, selectedIds]
  );

  const updateElementById = useCallback(
    (id: string, patch: Partial<DesignElement>) => {
      commitWithUpdater((prev) => prev.map((el) => (el.id === id ? { ...el, ...patch } : el)));
    },
    [commitWithUpdater]
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
    const idsToDelete = selectedIds.length > 0 ? selectedIds : selectedId ? [selectedId] : [];
    if (idsToDelete.length === 0) return;
    const next = elementsRef.current.filter(
      (e) => !idsToDelete.includes(e.id) && (!e.parentId || !idsToDelete.includes(e.parentId))
    );
    commitElements(next);
    setSelectedId(next[0]?.id || null);
    setSelectedIds(next[0] ? [next[0].id] : []);
  }, [commitElements, elementsRef, selectedId, selectedIds]);

  const adjustZIndex = useCallback(
    (delta: number) => {
      const targetIds = selectedIds.length > 0 ? selectedIds : selectedId ? [selectedId] : [];
      if (targetIds.length === 0) return;
      commitWithUpdater((prev) =>
        prev.map((el) =>
          targetIds.includes(el.id)
            ? { ...el, zIndex: Math.max(1, Math.min(99, (el.zIndex ?? 10) + delta)) }
            : el
        )
      );
    },
    [commitWithUpdater, selectedId, selectedIds]
  );

  const bringToFront = useCallback(() => {
    const targetIds = selectedIds.length > 0 ? selectedIds : selectedId ? [selectedId] : [];
    if (targetIds.length === 0) return;
    commitWithUpdater((prev) => {
      const maxZ = prev.reduce((m, e) => Math.max(m, e.zIndex ?? 10), 10);
      return prev.map((el) =>
        targetIds.includes(el.id) ? { ...el, zIndex: Math.min(99, maxZ + 1) } : el
      );
    });
  }, [commitWithUpdater, selectedId, selectedIds]);

  const sendToBack = useCallback(() => {
    const targetIds = selectedIds.length > 0 ? selectedIds : selectedId ? [selectedId] : [];
    if (targetIds.length === 0) return;
    commitWithUpdater((prev) => {
      const minZ = prev.reduce((m, e) => Math.min(m, e.zIndex ?? 10), 10);
      const nextZ = Math.max(1, minZ - 1);
      return prev.map((el) => (targetIds.includes(el.id) ? { ...el, zIndex: nextZ } : el));
    });
  }, [commitWithUpdater, selectedId, selectedIds]);

  const ungroupSelected = useCallback(() => {
    if (!selectedElement) return;
    if (isPureContainerType(selectedElement.type)) {
      const hasChildren = elementsRef.current.some((e) => e.parentId === selectedElement.id);
      if (hasChildren) {
        commitWithUpdater((prev) =>
          prev.map((el) => {
            if (el.parentId !== selectedElement.id) return el;
            return {
              ...el,
              parentId: null,
              parentPaneIndex: undefined,
              x: Math.min(
                canvasWidth - el.width,
                Math.max(0, selectedElement.x + (el.childOffsetX ?? 20))
              ),
              y: Math.min(
                canvasHeight - el.height,
                Math.max(0, selectedElement.y + (el.childOffsetY ?? 20))
              ),
              childOffsetX: undefined,
              childOffsetY: undefined,
            };
          })
        );
        return;
      }
    }
    if (selectedElement.parentId) {
      commitWithUpdater((prev) => {
        const parent = prev.find((e) => e.id === selectedElement.parentId);
        return prev.map((el) =>
          el.id === selectedElement.id
            ? {
                ...el,
                parentId: null,
                parentPaneIndex: undefined,
                x: parent
                  ? Math.min(canvasWidth - el.width, Math.max(0, parent.x + (el.childOffsetX ?? 20)))
                  : el.x,
                y: parent
                  ? Math.min(canvasHeight - el.height, Math.max(0, parent.y + (el.childOffsetY ?? 20)))
                  : el.y,
                childOffsetX: undefined,
                childOffsetY: undefined,
              }
            : el
        );
      });
    }
  }, [canvasHeight, canvasWidth, commitWithUpdater, elementsRef, selectedElement]);

  const nestElementIntoContainer = (childId: string, parentId: string | null) => {
    if (!parentId) {
      updateSelected({ parentId: null, parentPaneIndex: undefined });
      return;
    }
    const parent = elements.find((e) => e.id === parentId);
    const child = elements.find((e) => e.id === childId);
    if (!parent || !child) return;

    const { bL, bT, innerW, innerH } = getInnerBoxGeometry(parent);
    const cw = child.childCustomWidth || child.width;
    const ch = child.childCustomHeight || child.height;
    const rawRelX = Math.round(child.x - parent.x - bL);
    const rawRelY = Math.round(child.y - parent.y - bT);
    const insideX = rawRelX >= -20 && rawRelX <= innerW && rawRelY >= -20 && rawRelY <= innerH;
    const initX = insideX
      ? Math.max(0, Math.min(Math.max(0, innerW - cw), rawRelX))
      : Math.min(12, Math.max(0, Math.round((innerW - cw) / 2)));
    const initY = insideX
      ? Math.max(0, Math.min(Math.max(0, innerH - ch), rawRelY))
      : Math.min(12, Math.max(0, Math.round((innerH - ch) / 2)));

    commitWithUpdater((prev) =>
      prev.map((el) => {
        if (el.id === parentId && el.containerLayout !== 'freeform_offset') {
          return { ...el, containerLayout: 'freeform_offset' as const };
        }
        if (el.id === childId) {
          return {
            ...el,
            parentId,
            parentPaneIndex: 0,
            childOffsetX: initX,
            childOffsetY: initY,
            x: initX,
            y: initY,
          };
        }
        return el;
      })
    );
  };

  const popOutFromContainer = (childId: string) => {
    commitWithUpdater((prev) => {
      const child = prev.find((e) => e.id === childId);
      if (!child || !child.parentId) return prev;
      const parent = prev.find((e) => e.id === child.parentId);
      const newX = parent
        ? Math.min(canvasWidth - child.width, Math.max(0, parent.x + (child.childOffsetX ?? 20)))
        : child.x;
      const newY = parent
        ? Math.min(canvasHeight - child.height, Math.max(0, parent.y + (child.childOffsetY ?? 20)))
        : child.y;
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
      const children = prev.filter((e) => e.parentId === parentId);
      const cIdx = children.findIndex((e) => e.id === childId);
      if (cIdx === -1) return prev;
      const targetIdx = direction === 'up' ? cIdx - 1 : cIdx + 1;
      if (targetIdx < 0 || targetIdx >= children.length) return prev;

      const swappedChild = children[targetIdx];
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
    if (!selectedElement) return;
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
        if (clipboardBundle) {
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
        commitWithUpdater((prev) =>
          prev.map((el) => {
            if (!targetIds.includes(el.id) || el.locked) return el;
            return {
              ...el,
              x: Math.max(0, Math.min(canvasWidth - el.width, el.x + dx)),
              y: Math.max(0, Math.min(canvasHeight - el.height, el.y + dy)),
            };
          })
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

    window.addEventListener('keydown', onKeyDown);
    window.addEventListener('keyup', onKeyUp);
    window.addEventListener('blur', onBlur);
    window.addEventListener('message', onIframeMessage);
    return () => {
      window.removeEventListener('keydown', onKeyDown);
      window.removeEventListener('keyup', onKeyUp);
      window.removeEventListener('blur', onBlur);
      window.removeEventListener('message', onIframeMessage);
    };
  }, [
    addElement,
    adjustZIndex,
    bottomDockOpen,
    bringToFront,
    canvasHeight,
    canvasTool,
    canvasWidth,
    clipboardBundle,
    commitWithUpdater,
    copySelectedElements,
    copySelectedStyle,
    deleteSelected,
    duplicateSelected,
    editingContainerId,
    fitCanvasToView,
    flipSelected,
    groupSelectedIntoBox,
    handleCopyCode,
    handleOpenProject,
    handleSaveProject,
    handleSaveProjectAs,
    inlineEditId,
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
      onPointerCancel={handlePointerUp}
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
          onStartEditingLayerName={(elId) => setEditingLayerId(elId)}
          onTransientRenameLayer={(elId, label) =>
            replaceElementsTransient((prev) =>
              prev.map((item) => (item.id === elId ? { ...item, label } : item))
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
          cursorCoords={cursorCoords}
          cursorInViewport={cursorInViewport}
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
          onSetCursorInViewport={setCursorInViewport}
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
        onApplyPreset={applyTemplatePreset}
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
        previewSurface={previewSurface}
        previewViewport={previewViewport}
        previewSrcDoc={previewSrcDoc}
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
