import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { CanvasStage } from './components/CanvasStage';
import { LeftSidebar, LeftSidebarTab } from './components/LeftSidebar';
import { createDefaultModifier } from './components/ModifierStackSection';
import { InspectorTab, RightInspector } from './components/RightInspector';
import { TopBar } from './components/TopBar';
import { HtmlImporterModal } from './components/modals/HtmlImporterModal';
import { LivePreviewModal } from './components/modals/LivePreviewModal';
import { ObjectForgeModal } from './components/modals/ObjectForgeModal';
import { SettingsModal } from './components/modals/SettingsModal';
import { ShortcutsModal } from './components/modals/ShortcutsModal';
import { TemplatesModal } from './components/modals/TemplatesModal';
import { AssetPreset } from './data/assets';
import { isPureContainerType, PURE_PRIMITIVE_DEFAULTS } from './data/purePrimitives';
import { DEFAULT_CUSTOM_BLUEPRINTS, TemplatePreset } from './data/templates';
import { isToyhouseFreePlatform } from './engine/f2uShield';
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
} from './types/schema';
import { getInnerBoxGeometry } from './utils/canvasGeometry';
import { buildUniformBorderPatch, getDisplayBorderColor } from './utils/borderHelpers';
import {
  buildBlueprintInstanceElement,
  buildDefaultElement,
  buildElementFromAssetPreset,
  buildElementFromFaIcon,
} from './utils/elementFactory';
import { processLocalImageFile } from './utils/imageUpload';
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

  const [customBlueprints, setCustomBlueprints] = useState<CustomWidgetBlueprint[]>(() => {
    try {
      const saved = localStorage.getItem('dbx_custom_blueprints_v2');
      if (saved) return JSON.parse(saved) as CustomWidgetBlueprint[];
    } catch {
      // Ignore malformed storage payload
    }
    return initialBootstrap.customBlueprints || DEFAULT_CUSTOM_BLUEPRINTS;
  });

  const [uiTheme, setUiTheme] = useState<'carbon' | 'paper'>(
    () => (localStorage.getItem('dbx_ui_theme_v2') as 'carbon' | 'paper') || 'paper'
  );
  const [platform, setPlatform] = useState<TargetPlatform>(
    initialBootstrap.platform || 'toyhouse_free'
  );
  const [layoutMode, setLayoutMode] = useState<LayoutMode>(
    initialBootstrap.layoutMode || 'hybrid'
  );
  const [canvasWidth, setCanvasWidth] = useState<number>(() =>
    readNumericPref('dbx_canvas_width', initialBootstrap.canvasWidth, 760)
  );
  const [canvasHeight, setCanvasHeight] = useState<number>(() =>
    readNumericPref('dbx_canvas_height', initialBootstrap.canvasHeight, 540)
  );
  const [canvasBg, setCanvasBg] = useState<string>(
    () => localStorage.getItem('dbx_canvas_bg') || initialBootstrap.canvasBg || '#FAF8F5'
  );
  const [canvasPattern, setCanvasPattern] = useState<BgPattern>(
    () =>
      (localStorage.getItem('dbx_canvas_pattern') as BgPattern | null) ||
      initialBootstrap.canvasPattern ||
      'dots'
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
  const [clipboardEl, setClipboardEl] = useState<DesignElement | null>(null);
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
  const [autoNestDrop, setAutoNestDrop] = useState<boolean>(true);
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
  const [showShortcutsModal, setShowShortcutsModal] = useState<boolean>(false);
  const [showSettingsModal, setShowSettingsModal] = useState<boolean>(false);
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

  // Persist Studio UI Preferences
  useEffect(() => {
    document.documentElement.setAttribute('data-theme', uiTheme);
    localStorage.setItem('dbx_ui_theme_v2', uiTheme);
  }, [uiTheme]);

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

  const exportResult = useMemo(
    () =>
      generatePlatformExport(
        elements,
        layoutMode,
        platform,
        canvasWidth,
        canvasHeight,
        canvasBg,
        canvasPattern
      ),
    [elements, layoutMode, platform, canvasWidth, canvasHeight, canvasBg, canvasPattern]
  );

  const previewSrcDoc = useMemo(() => {
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
      }
    > = {
      th_dark: {
        bg: '#16141C',
        text: '#DCD9E6',
        navBg: '#23202D',
        navText: '#EDEAF5',
        sideBg: '#1D1A25',
        sideBorder: '#2F2B3D',
        cardBg: '#221F2B',
        muted: '#9691A8',
        link: '#74A9F7',
      },
      th_light: {
        bg: '#F4F5F7',
        text: '#212529',
        navBg: '#343A40',
        navText: '#F8F9FA',
        sideBg: '#FFFFFF',
        sideBorder: '#DEE2E6',
        cardBg: '#F8F9FA',
        muted: '#6C757D',
        link: '#007BFF',
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
      },
    };
    const palette = themeMap[previewSurface] || themeMap.th_dark;
    const isTh = platform.startsWith('toyhouse');
    const useShell = isTh && previewToyhouseShell;
    const safeTitle = (projectName || 'Character Profile')
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;');
    const bsFallbackCss = isTh
      ? `
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
      .th-sim-nav {
        height: 44px;
        background-color: ${palette.navBg};
        color: ${palette.navText};
        padding: 0 18px;
        display: flex;
        align-items: center;
        justify-content: space-between;
        font-size: 13px;
        border-bottom: 1px solid rgba(0,0,0,0.2);
      }
      .th-sim-layout {
        display: flex;
        align-items: flex-start;
        min-height: calc(100vh - 44px);
      }
      .th-sim-sidebar {
        width: 205px;
        flex-shrink: 0;
        background-color: ${palette.sideBg};
        border-right: 1px solid ${palette.sideBorder};
        min-height: calc(100vh - 44px);
        padding: 14px 12px;
        font-size: 12.5px;
      }
      .th-sim-sidebar-item {
        display: flex;
        align-items: center;
        gap: 8px;
        padding: 6px 10px;
        border-radius: 5px;
        margin-bottom: 3px;
        color: ${palette.muted};
      }
      .th-sim-sidebar-item.active {
        background-color: ${palette.cardBg};
        color: ${palette.text};
        font-weight: 600;
        border: 1px solid ${palette.sideBorder};
      }
      .th-sim-main {
        flex: 1;
        min-width: 0;
        padding: 18px 20px;
      }
      @media (max-width: 767px) {
        .th-sim-sidebar { display: none; }
        .th-sim-main { padding: 10px; }
      }
      `
      : '';

    const bodyContent = useShell
      ? `
    <header class="th-sim-nav">
      <div style="display: flex; align-items: center; gap: 10px; font-weight: 700;">
        <i class="fa-solid fa-home"></i>
        <span>TOYHOU.SE</span>
        <span style="opacity: 0.45; font-weight: 400;">/</span>
        <span style="font-weight: 500; opacity: 0.9;">Characters</span>
        <span style="opacity: 0.45; font-weight: 400;">/</span>
        <span style="color: ${palette.link}; font-weight: 600;">${safeTitle}</span>
      </div>
      <div style="font-size: 11px; opacity: 0.78;">
        ${platform === 'toyhouse_free' || platform === 'toyhouse_oc' ? 'F2U Sanitizer Mode' : 'Toyhouse Premium Mode'}
      </div>
    </header>
    <div class="th-sim-layout">
      <aside class="th-sim-sidebar">
        <div style="font-weight: 700; font-size: 11px; text-transform: uppercase; letter-spacing: 0.08em; color: ${palette.muted}; margin-bottom: 10px;">
          Character Menu
        </div>
        <div class="th-sim-sidebar-item active"><i class="fa-regular fa-id-card"></i><span>Profile</span></div>
        <div class="th-sim-sidebar-item"><i class="fa-regular fa-images"></i><span>Gallery</span></div>
        <div class="th-sim-sidebar-item"><i class="fa-solid fa-book-open"></i><span>Literature</span></div>
        <div class="th-sim-sidebar-item"><i class="fa-solid fa-link"></i><span>Links</span></div>
        <div class="th-sim-sidebar-item"><i class="fa-regular fa-comments"></i><span>Comments</span></div>
        <hr style="border-color: ${palette.sideBorder}; margin: 12px 0;" />
        <div style="font-size: 11px; color: ${palette.muted}; line-height: 1.4;">
          Simulated TH Profile Container<br/>
          Theme: ${previewSurface.replace('th_', 'TH ')}
        </div>
      </aside>
      <main class="th-sim-main">
        <div class="user-content mx-auto" style="max-width: ${Math.max(canvasWidth + 32, 920)}px;">
          ${exportResult.html}
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
    </script>
  </body>
</html>`;
  }, [canvasWidth, exportResult.html, platform, previewSurface, previewToyhouseShell, projectName]);

  // Viewport & Canvas Pointer Hooks
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
    setCanvasBg(uiTheme === 'paper' ? '#FAF8F5' : '#161514');
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
    const itemsToClone = current.filter((e) => idsToDup.includes(e.id));
    const newItems: DesignElement[] = [];
    const newIds: string[] = [];
    itemsToClone.forEach((item, i) => {
      const newId = `el-${Date.now().toString().slice(-4)}-${i}`;
      newIds.push(newId);
      newItems.push({
        ...item,
        id: newId,
        label: `${item.label} (Copy)`,
        x: Math.min(canvasWidth - item.width - 8, item.x + 20),
        y: Math.min(canvasHeight - item.height - 8, item.y + 20),
        zIndex: (item.zIndex || 10) + 1,
        order: current.length + i,
      });
    });
    commitElements([...current, ...newItems]);
    setSelectedIds(newIds);
    setSelectedId(newIds[0] || null);
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

  const adjustZIndex = (delta: number) => {
    if (!selectedElement) return;
    const currentZ = selectedElement.zIndex ?? 10;
    updateSelected({ zIndex: Math.max(1, Math.min(99, currentZ + delta)) });
  };

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
    const selected = elements.filter((e) => selectedIds.includes(e.id));
    if (selected.length < 2) return;
    const minX = Math.min(...selected.map((e) => e.x));
    const minY = Math.min(...selected.map((e) => e.y));
    const maxX = Math.max(...selected.map((e) => e.x + e.width));
    const maxY = Math.max(...selected.map((e) => e.y + e.height));
    const pad = 16;
    const boxId = `box-group-${Date.now().toString().slice(-4)}`;
    const isLight = uiTheme === 'paper';
    const newBox: DesignElement = {
      id: boxId,
      type: 'box',
      label: `Group Box (${selected.length} items)`,
      content: '',
      x: Math.max(0, minX - pad),
      y: Math.max(0, minY - pad),
      width: Math.min(canvasWidth, maxX - minX + pad * 2),
      height: Math.min(canvasHeight, maxY - minY + pad * 2),
      zIndex: Math.max(1, Math.min(...selected.map((e) => e.zIndex || 10)) - 1),
      opacity: 100,
      order: elements.length,
      rowIndex: Math.max(...elements.map((e) => e.rowIndex), 0) + 1,
      colSpan: 12,
      bgColor: isLight ? '#F2EFE9' : '#242220',
      textColor: isLight ? '#2C2A28' : '#ECE7DF',
      borderColor: isLight ? '#C86D51' : '#B85D3B',
      borderWidth: 1,
      borderStyle: 'solid',
      borderRadius: 10,
      padding: 12,
      fontSize: 13,
      fontWeight: 'medium',
      textAlign: 'left',
      shadow: 'none',
      hoverEffect: 'none',
      containerLayout: 'freeform_offset',
    };
    const updated = elements.map((el) =>
      selectedIds.includes(el.id) ? { ...el, parentId: boxId } : el
    );
    commitElements([...updated, newBox]);
    setSelectedId(boxId);
    setSelectedIds([boxId]);
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

  const handleImportHtmlElements = (params: {
    elements: DesignElement[];
    mode: 'replace' | 'append';
    extractedSwatches: string[];
    applySwatches: boolean;
  }) => {
    if (params.elements.length === 0) return;
    const nextElements =
      params.mode === 'replace' ? params.elements : [...elements, ...params.elements];
    commitElements(nextElements);
    const firstNewId = params.elements[0]?.id || null;
    setSelectedId(firstNewId);
    setSelectedIds(firstNewId ? [firstNewId] : []);
    setEditingContainerId(null);
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

  const handleCopyCode = () => {
    void navigator.clipboard.writeText(exportResult.html);
    setCopied(true);
    window.setTimeout(() => setCopied(false), 2000);
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

  // Global Keyboard Shortcuts (including Native Desktop Ctrl+S / Ctrl+Shift+S / Ctrl+O)
  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      const targetEl = e.target as HTMLElement | null;
      const tag = targetEl?.tagName;
      if (
        tag === 'INPUT' ||
        tag === 'TEXTAREA' ||
        tag === 'SELECT' ||
        targetEl?.isContentEditable ||
        inlineEditId
      ) {
        return;
      }

      if (e.code === 'Space') {
        e.preventDefault();
        if (!e.repeat) setIsSpacePressed(true);
        return;
      }

      const lower = e.key.toLowerCase();
      if ((e.ctrlKey || e.metaKey) && lower === 's') {
        e.preventDefault();
        if (e.shiftKey) void handleSaveProjectAs();
        else void handleSaveProject();
        return;
      }
      if ((e.ctrlKey || e.metaKey) && lower === 'o') {
        e.preventDefault();
        void handleOpenProject();
        return;
      }
      if ((e.ctrlKey || e.metaKey) && e.key === '0') {
        e.preventDefault();
        setZoom(1);
        setPanOffset({ x: 0, y: 0 });
        return;
      }
      if ((e.ctrlKey || e.metaKey) && e.key === '1') {
        e.preventDefault();
        fitCanvasToView();
        return;
      }

      if (e.key === 'Escape') {
        if (canvasTool !== 'select') {
          setCanvasTool('select');
          setDrawMarquee(null);
          return;
        }
        if (editingContainerId) {
          const parentId = editingContainerId;
          setEditingContainerId(null);
          setSelectedId(parentId);
          setSelectedIds([parentId]);
          return;
        }
      }

      if ((e.ctrlKey || e.metaKey) && lower === 'z') {
        e.preventDefault();
        if (e.shiftKey) redo();
        else undo();
        return;
      }
      if ((e.ctrlKey || e.metaKey) && lower === 'y') {
        e.preventDefault();
        redo();
        return;
      }
      if ((e.ctrlKey || e.metaKey) && lower === 'd') {
        e.preventDefault();
        duplicateSelected();
        return;
      }
      if ((e.ctrlKey || e.metaKey) && lower === 'c') {
        if (selectedElement) setClipboardEl(selectedElement);
        return;
      }
      if ((e.ctrlKey || e.metaKey) && lower === 'v') {
        if (clipboardEl) {
          e.preventDefault();
          const current = elementsRef.current;
          const pasted: DesignElement = {
            ...clipboardEl,
            id: `el-${Date.now().toString().slice(-4)}`,
            label: `${clipboardEl.label} (Pasted)`,
            x: Math.min(canvasWidth - clipboardEl.width - 8, clipboardEl.x + 24),
            y: Math.min(canvasHeight - clipboardEl.height - 8, clipboardEl.y + 24),
            order: current.length,
          };
          commitElements([...current, pasted]);
          setSelectedId(pasted.id);
          setSelectedIds([pasted.id]);
        }
        return;
      }
      if (e.key === 'Delete' || e.key === 'Backspace') {
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
        const step = e.shiftKey ? 8 : 1;
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

    window.addEventListener('keydown', onKeyDown);
    window.addEventListener('keyup', onKeyUp);
    window.addEventListener('blur', onBlur);
    return () => {
      window.removeEventListener('keydown', onKeyDown);
      window.removeEventListener('keyup', onKeyUp);
      window.removeEventListener('blur', onBlur);
    };
  }, [
    canvasHeight,
    canvasTool,
    canvasWidth,
    clipboardEl,
    commitElements,
    commitWithUpdater,
    deleteSelected,
    duplicateSelected,
    editingContainerId,
    elementsRef,
    fitCanvasToView,
    handleOpenProject,
    handleSaveProject,
    handleSaveProjectAs,
    inlineEditId,
    layoutMode,
    redo,
    selectedElement,
    selectedId,
    selectedIds,
    setDrawMarquee,
    setIsSpacePressed,
    setPanOffset,
    setZoom,
    undo,
  ]);

  return (
    <div
      style={{
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
      }}
      className="h-screen w-screen flex flex-col select-none overflow-hidden"
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
        onOpenShortcuts={() => setShowShortcutsModal(true)}
        onOpenSettings={() => setShowSettingsModal(true)}
        onResetWorkspaceLayout={handleResetWorkspaceLayout}
        onChangeLayoutMode={setLayoutMode}
        onToggleTheme={() => setUiTheme((t) => (t === 'carbon' ? 'paper' : 'carbon'))}
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
        imgbbApiKey={imgbbApiKey}
        localSnapshots={localSnapshots}
        lastSnapshotAt={lastSnapshotAt}
        onChangeImgbbKey={saveImgbbKey}
        onCreateSnapshot={() => {
          void createManualSnapshot();
        }}
        onRestoreSnapshot={(id) => {
          void restoreLocalSnapshot(id);
          setShowSettingsModal(false);
        }}
        onClose={() => setShowSettingsModal(false)}
      />

      <ShortcutsModal
        open={showShortcutsModal}
        onClose={() => setShowShortcutsModal(false)}
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
      />

      {!isTauriRuntime() && saveNotice && (
        <span className="sr-only">{saveNotice}</span>
      )}
    </div>
  );
}
