import { useCallback, useEffect, useRef, useState } from 'react';
import {
  BgPattern,
  CanvasGuide,
  CustomWidgetBlueprint,
  DesignElement,
  LayoutMode,
  ProjectFile,
  TargetPlatform,
} from '../types/schema';
import {
  getRecentProjectsNative,
  isTauriRuntime,
  listLocalSnapshotsSafe,
  loadLocalSnapshotSafe,
  openProjectDialogNative,
  readProjectFileNative,
  RecentProjectEntry,
  registerDesktopCloseGuard,
  saveLocalSnapshotSafe,
  saveProjectAtPathNative,
  saveProjectDialogNative,
  saveProjectToDiskFallback,
  SnapshotEntry,
} from '../utils/tauriDesktop';
import { exportHtmlFileDialog } from '../utils/tauriDesktop';

export const PROJECT_FILE_VERSION = '3.0.0';

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function toFiniteNumber(value: unknown, fallback: number): number {
  return typeof value === 'number' && Number.isFinite(value) ? value : fallback;
}

function sanitizeElementForMigration(raw: unknown, index: number): DesignElement | null {
  if (!isRecord(raw) || typeof raw.id !== 'string' || typeof raw.type !== 'string') {
    return null;
  }
  const el = raw as unknown as DesignElement;
  const x = Math.max(0, Math.round(toFiniteNumber(raw.x, 0)));
  const y = Math.max(0, Math.round(toFiniteNumber(raw.y, 0)));
  const width = Math.max(16, Math.round(toFiniteNumber(raw.width, 160)));
  const height = Math.max(16, Math.round(toFiniteNumber(raw.height, 80)));
  const opacity = Math.max(0, Math.min(100, toFiniteNumber(raw.opacity, 100)));
  const zIndex = Math.max(0, Math.round(toFiniteNumber(raw.zIndex, 10)));
  const order = Math.max(0, Math.round(toFiniteNumber(raw.order, index)));
  const rowIndex = Math.max(0, Math.round(toFiniteNumber(raw.rowIndex, index)));
  const colSpan = Math.max(1, Math.min(12, Math.round(toFiniteNumber(raw.colSpan, 12))));
  return {
    ...el,
    x,
    y,
    width,
    height,
    opacity,
    zIndex,
    order,
    rowIndex,
    colSpan,
    label: typeof raw.label === 'string' ? raw.label : el.type,
    content: typeof raw.content === 'string' ? raw.content : '',
    modifiers: Array.isArray(raw.modifiers) ? el.modifiers : [],
  };
}

/**
 * Normalizes v1.x/v2.x/v3.x project payloads into a valid v3.0.0 ProjectFile schema,
 * clamping invalid geometry and backfilling missing workspace arrays.
 */
export function migrateProjectPayload(raw: unknown): ProjectFile {
  const obj = isRecord(raw) ? raw : {};
  const rawPlatform = obj.platform;
  const platform: TargetPlatform =
    rawPlatform === 'toyhouse_free' ||
    rawPlatform === 'toyhouse_premium' ||
    rawPlatform === 'toyhouse_oc' ||
    rawPlatform === 'toyhouse_profile' ||
    rawPlatform === 'toyhouse_world' ||
    rawPlatform === 'carrd_pro'
      ? rawPlatform
      : rawPlatform === 'toyhouse_pro'
      ? 'toyhouse_premium'
      : 'toyhouse_free';

  const rawLayout = obj.layoutMode;
  const layoutMode: LayoutMode =
    rawLayout === 'hybrid' || rawLayout === 'block' || rawLayout === 'freeform'
      ? rawLayout
      : rawLayout === 'stack'
      ? 'block'
      : rawLayout === 'absolute'
      ? 'freeform'
      : 'hybrid';

  const rawName = typeof obj.name === 'string' ? obj.name.trim() : '';
  const name = rawName || 'Canvas Draft';
  const canvasWidth = Math.max(320, Math.min(2400, Math.round(toFiniteNumber(obj.canvasWidth, 800))));
  const canvasHeight = Math.max(320, Math.min(6000, Math.round(toFiniteNumber(obj.canvasHeight, 620))));

  const swatches = Array.isArray(obj.swatches)
    ? obj.swatches.filter((s): s is string => typeof s === 'string')
    : [];

  const guides: CanvasGuide[] = Array.isArray(obj.guides)
    ? obj.guides.filter(
        (g): g is CanvasGuide =>
          isRecord(g) &&
          typeof g.id === 'string' &&
          (g.axis === 'x' || g.axis === 'y') &&
          typeof g.pos === 'number' &&
          Number.isFinite(g.pos)
      )
    : [];

  const customBlueprints: CustomWidgetBlueprint[] = Array.isArray(obj.customBlueprints)
    ? (obj.customBlueprints.filter((b) => isRecord(b) && typeof b.id === 'string') as unknown as CustomWidgetBlueprint[])
    : [];

  const rawElements = Array.isArray(obj.elements) ? obj.elements : [];
  const elements: DesignElement[] = [];
  for (let i = 0; i < rawElements.length; i++) {
    const normalized = sanitizeElementForMigration(rawElements[i], i);
    if (normalized) elements.push(normalized);
  }

  return {
    version: PROJECT_FILE_VERSION,
    name,
    platform,
    layoutMode,
    canvasWidth,
    canvasHeight,
    canvasBg: typeof obj.canvasBg === 'string' ? obj.canvasBg : undefined,
    canvasPattern: typeof obj.canvasPattern === 'string' ? (obj.canvasPattern as BgPattern) : 'none',
    swatches,
    guides,
    elements,
    customBlueprints,
  };
}

const ACTIVE_PROJECT_KEY = 'dbx_active_project';
const MAX_HISTORY_ENTRIES = 60;

export interface HistoryCoalesceState {
  key: string;
  at: number;
  historyIdx: number;
}

/** Pushes a snapshot onto undo history, coalescing rapid edits sharing `key` within `windowMs`. */
export function applyCoalescedHistoryPush(
  history: ReadonlyArray<DesignElement[]>,
  historyIdx: number,
  next: DesignElement[],
  coalesceState: HistoryCoalesceState | null,
  key: string,
  nowMs: number,
  windowMs: number,
  maxEntries = MAX_HISTORY_ENTRIES
): {
  history: DesignElement[][];
  historyIdx: number;
  coalesceState: HistoryCoalesceState;
} {
  if (
    coalesceState &&
    coalesceState.key === key &&
    coalesceState.historyIdx === historyIdx &&
    historyIdx > 0 &&
    nowMs - coalesceState.at <= windowMs &&
    history[historyIdx] !== undefined
  ) {
    const updated = [...history];
    updated[historyIdx] = next;
    return {
      history: updated,
      historyIdx,
      coalesceState: { key, at: nowMs, historyIdx },
    };
  }
  const sliced = history.slice(0, historyIdx + 1);
  let updated = [...sliced, next];
  if (updated.length > maxEntries) {
    updated = updated.slice(updated.length - maxEntries);
  }
  const nextIdx = updated.length - 1;
  return {
    history: updated,
    historyIdx: nextIdx,
    coalesceState: { key, at: nowMs, historyIdx: nextIdx },
  };
}

export interface InitialProjectBootstrap {
  elements: DesignElement[];
  name: string;
  platform?: TargetPlatform;
  layoutMode?: LayoutMode;
  canvasWidth?: number;
  canvasHeight?: number;
  canvasBg?: string;
  canvasPattern?: BgPattern;
  swatches?: string[];
  guides?: CanvasGuide[];
  customBlueprints?: CustomWidgetBlueprint[];
}

export function loadInitialProjectFromStorage(): InitialProjectBootstrap {
  try {
    const saved = localStorage.getItem(ACTIVE_PROJECT_KEY);
    if (saved) {
      const parsed = migrateProjectPayload(JSON.parse(saved));
      return {
        elements: parsed.elements,
        name: parsed.name,
        platform: parsed.platform,
        layoutMode: parsed.layoutMode,
        canvasWidth: parsed.canvasWidth,
        canvasHeight: parsed.canvasHeight,
        canvasBg: parsed.canvasBg,
        canvasPattern: parsed.canvasPattern,
        swatches: parsed.swatches,
        guides: parsed.guides,
        customBlueprints: parsed.customBlueprints,
      };
    }
  } catch {
    // Ignore corrupt localStorage payload cleanly
  }
  return {
    elements: [],
    name: 'Canvas Draft',
  };
}

export interface ProjectMetaForSave {
  platform: TargetPlatform;
  layoutMode: LayoutMode;
  canvasWidth: number;
  canvasHeight: number;
  canvasBg: string;
  canvasPattern: BgPattern;
  swatches: string[];
  guides: CanvasGuide[];
  customBlueprints: CustomWidgetBlueprint[];
}

export interface UseProjectHistoryOptions {
  initialElements: DesignElement[];
  initialProjectName?: string;
  projectMeta: ProjectMetaForSave;
  onApplyProjectMetadata: (project: ProjectFile) => void;
  onSelectAfterLoad?: (elementId: string | null) => void;
}

export function useProjectHistory({
  initialElements,
  initialProjectName = 'Canvas Draft',
  projectMeta,
  onApplyProjectMetadata,
  onSelectAfterLoad,
}: UseProjectHistoryOptions) {
  const [elements, setElementsState] = useState<DesignElement[]>(initialElements);
  // Critical fix: initialize undo history with [initialElements] (not [[]])
  // so pressing Ctrl+Z immediately after reload never wipes the loaded canvas.
  const [history, setHistory] = useState<DesignElement[][]>([initialElements]);
  const [historyIdx, setHistoryIdx] = useState<number>(0);

  const elementsRef = useRef<DesignElement[]>(initialElements);
  const historyRef = useRef<DesignElement[][]>([initialElements]);
  const historyIdxRef = useRef<number>(0);
  const lastCoalesceRef = useRef<HistoryCoalesceState | null>(null);

  const [saveNotice, setSaveNotice] = useState<string | null>(null);
  const noticeTimerRef = useRef<number | null>(null);

  const [currentFilePath, setCurrentFilePath] = useState<string | null>(null);
  const [projectName, setProjectName] = useState<string>(initialProjectName);
  const [isDirty, setIsDirty] = useState<boolean>(false);
  const [autosaveSuspended, setAutosaveSuspended] = useState<boolean>(false);
  const [recentProjects, setRecentProjects] = useState<RecentProjectEntry[]>([]);
  const [localSnapshots, setLocalSnapshots] = useState<SnapshotEntry[]>([]);
  const [lastSnapshotAt, setLastSnapshotAt] = useState<number | null>(null);

  const metaRef = useRef<ProjectMetaForSave>(projectMeta);
  metaRef.current = projectMeta;

  const isDirtyRef = useRef<boolean>(isDirty);
  isDirtyRef.current = isDirty;

  const projectNameRef = useRef<string>(projectName);
  projectNameRef.current = projectName;

  const flashSaveNotice = useCallback((message: string, durationMs = 4000) => {
    setSaveNotice(message);
    if (noticeTimerRef.current !== null) {
      window.clearTimeout(noticeTimerRef.current);
    }
    noticeTimerRef.current = window.setTimeout(() => {
      setSaveNotice(null);
      noticeTimerRef.current = null;
    }, durationMs);
  }, []);

  const buildProjectPayload = useCallback(
    (overrideElements?: DesignElement[], overrideName?: string): ProjectFile => {
      const m = metaRef.current;
      return {
        version: PROJECT_FILE_VERSION,
        name: overrideName || projectNameRef.current || `designbox-${m.platform}`,
        platform: m.platform,
        layoutMode: m.layoutMode,
        canvasWidth: m.canvasWidth,
        canvasHeight: m.canvasHeight,
        canvasBg: m.canvasBg,
        canvasPattern: m.canvasPattern,
        swatches: m.swatches,
        guides: m.guides,
        elements: overrideElements ?? elementsRef.current,
        customBlueprints: m.customBlueprints,
      };
    },
    []
  );

  const commitElements = useCallback((next: DesignElement[]) => {
    lastCoalesceRef.current = null;
    const sliced = historyRef.current.slice(0, historyIdxRef.current + 1);
    let updatedHistory = [...sliced, next];
    if (updatedHistory.length > MAX_HISTORY_ENTRIES) {
      updatedHistory = updatedHistory.slice(updatedHistory.length - MAX_HISTORY_ENTRIES);
    }
    const nextIdx = updatedHistory.length - 1;
    historyRef.current = updatedHistory;
    historyIdxRef.current = nextIdx;
    elementsRef.current = next;
    setHistory(updatedHistory);
    setHistoryIdx(nextIdx);
    setElementsState(next);
    setIsDirty(true);
  }, []);

  const commitWithUpdater = useCallback(
    (updater: (prev: DesignElement[]) => DesignElement[]) => {
      const next = updater(elementsRef.current);
      if (next !== elementsRef.current) {
        commitElements(next);
      }
    },
    [commitElements]
  );

  const commitCoalesced = useCallback(
    (
      updater: (prev: DesignElement[]) => DesignElement[],
      coalesceKey: string,
      windowMs = 450
    ) => {
      const next = updater(elementsRef.current);
      if (next === elementsRef.current) return;
      const pushed = applyCoalescedHistoryPush(
        historyRef.current,
        historyIdxRef.current,
        next,
        lastCoalesceRef.current,
        coalesceKey,
        Date.now(),
        windowMs
      );
      lastCoalesceRef.current = pushed.coalesceState;
      historyRef.current = pushed.history;
      historyIdxRef.current = pushed.historyIdx;
      elementsRef.current = next;
      setHistory(pushed.history);
      setHistoryIdx(pushed.historyIdx);
      setElementsState(next);
      setIsDirty(true);
    },
    []
  );

  const replaceElementsTransient = useCallback(
    (nextOrUpdater: DesignElement[] | ((prev: DesignElement[]) => DesignElement[])) => {
      const next =
        typeof nextOrUpdater === 'function'
          ? nextOrUpdater(elementsRef.current)
          : nextOrUpdater;
      elementsRef.current = next;
      setElementsState(next);
    },
    []
  );

  const commitLatestElements = useCallback(() => {
    commitElements(elementsRef.current);
  }, [commitElements]);

  const resetHistory = useCallback((next: DesignElement[]) => {
    lastCoalesceRef.current = null;
    const fresh = [next];
    historyRef.current = fresh;
    historyIdxRef.current = 0;
    elementsRef.current = next;
    setHistory(fresh);
    setHistoryIdx(0);
    setElementsState(next);
  }, []);

  const undo = useCallback(() => {
    lastCoalesceRef.current = null;
    if (historyIdxRef.current > 0) {
      const targetIdx = historyIdxRef.current - 1;
      const targetElements = historyRef.current[targetIdx];
      historyIdxRef.current = targetIdx;
      elementsRef.current = targetElements;
      setHistoryIdx(targetIdx);
      setElementsState(targetElements);
      setIsDirty(true);
    }
  }, []);

  const redo = useCallback(() => {
    lastCoalesceRef.current = null;
    if (historyIdxRef.current < historyRef.current.length - 1) {
      const targetIdx = historyIdxRef.current + 1;
      const targetElements = historyRef.current[targetIdx];
      historyIdxRef.current = targetIdx;
      elementsRef.current = targetElements;
      setHistoryIdx(targetIdx);
      setElementsState(targetElements);
      setIsDirty(true);
    }
  }, []);

  const refreshDesktopLists = useCallback(async () => {
    const [recent, snaps] = await Promise.all([
      getRecentProjectsNative(),
      listLocalSnapshotsSafe(),
    ]);
    setRecentProjects(recent);
    setLocalSnapshots(snaps);
  }, []);

  useEffect(() => {
    void refreshDesktopLists();
  }, [refreshDesktopLists]);

  const pendingAutosaveRef = useRef<ProjectFile | null>(null);

  const flushPendingAutosave = useCallback(() => {
    const payload = pendingAutosaveRef.current;
    if (!payload) return;
    pendingAutosaveRef.current = null;
    try {
      localStorage.setItem(ACTIVE_PROJECT_KEY, JSON.stringify(payload));
    } catch {
      flashSaveNotice(
        'Browser storage quota full (large Base64 images). Save to disk (.dbx.json) or switch images to ImgBB URLs.',
        5500
      );
    }
  }, [flashSaveNotice]);

  useEffect(() => {
    const onBeforeUnload = (e: BeforeUnloadEvent) => {
      flushPendingAutosave();
      if (isDirtyRef.current && elementsRef.current.length > 0) {
        e.preventDefault();
        e.returnValue = '';
      }
    };
    window.addEventListener('beforeunload', onBeforeUnload);
    return () => {
      window.removeEventListener('beforeunload', onBeforeUnload);
      flushPendingAutosave();
    };
  }, [flushPendingAutosave]);

  useEffect(() => {
    let active = true;
    let unlisten: (() => void) | null = null;
    void registerDesktopCloseGuard(
      () => isDirtyRef.current && elementsRef.current.length > 0,
      flushPendingAutosave
    ).then((fn) => {
      if (active) {
        unlisten = fn;
      } else {
        fn();
      }
    });
    return () => {
      active = false;
      unlisten?.();
    };
  }, [flushPendingAutosave]);

  // Debounced auto-save active project to localStorage (paused during active drags)
  useEffect(() => {
    const payload: ProjectFile = {
      version: PROJECT_FILE_VERSION,
      name: projectName || `designbox-${projectMeta.platform}`,
      platform: projectMeta.platform,
      layoutMode: projectMeta.layoutMode,
      canvasWidth: projectMeta.canvasWidth,
      canvasHeight: projectMeta.canvasHeight,
      canvasBg: projectMeta.canvasBg,
      canvasPattern: projectMeta.canvasPattern,
      swatches: projectMeta.swatches,
      guides: projectMeta.guides,
      elements,
      customBlueprints: projectMeta.customBlueprints,
    };
    pendingAutosaveRef.current = payload;
    if (autosaveSuspended) {
      return;
    }
    const timer = window.setTimeout(flushPendingAutosave, 400);
    return () => window.clearTimeout(timer);
  }, [
    autosaveSuspended,
    elements,
    projectName,
    projectMeta.platform,
    projectMeta.layoutMode,
    projectMeta.canvasWidth,
    projectMeta.canvasHeight,
    projectMeta.canvasBg,
    projectMeta.canvasPattern,
    projectMeta.swatches,
    projectMeta.guides,
    projectMeta.customBlueprints,
    flushPendingAutosave,
  ]);

  // Periodic local snapshot every 60 seconds when changes are pending
  useEffect(() => {
    const timer = window.setInterval(async () => {
      if (!isDirtyRef.current || elementsRef.current.length === 0) return;
      const payload = buildProjectPayload();
      const snap = await saveLocalSnapshotSafe(
        payload.name || 'Canvas Draft',
        JSON.stringify(payload)
      );
      if (snap) {
        setLastSnapshotAt(snap.createdAtMs);
        const snaps = await listLocalSnapshotsSafe();
        setLocalSnapshots(snaps);
      }
    }, 60_000);
    return () => window.clearInterval(timer);
  }, [buildProjectPayload]);

  const applyOpenedProject = useCallback(
    (parsed: ProjectFile, filePath: string | null, fileName?: string) => {
      if (!Array.isArray(parsed.elements)) {
        throw new Error('Project file is missing elements array.');
      }
      const normalized = migrateProjectPayload(parsed);
      onApplyProjectMetadata(normalized);
      resetHistory(normalized.elements);
      onSelectAfterLoad?.(normalized.elements[0]?.id || null);
      setCurrentFilePath(filePath);
      setProjectName(fileName?.replace(/\.(dbx\.)?json$/i, '') || normalized.name || 'Opened Project');
      setIsDirty(false);
    },
    [onApplyProjectMetadata, onSelectAfterLoad, resetHistory]
  );

  const downloadJsonFallback = (filename: string, jsonStr: string) => {
    try {
      const blob = new Blob([jsonStr], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      window.setTimeout(() => URL.revokeObjectURL(url), 1000);
    } catch {
      const a = document.createElement('a');
      a.href = 'data:application/json;charset=utf-8,' + encodeURIComponent(jsonStr);
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
    }
  };

  const handleSaveProjectAs = useCallback(async () => {
    const payload = buildProjectPayload();
    const jsonStr = JSON.stringify(payload, null, 2);
    const baseName = (projectNameRef.current || `designbox-${metaRef.current.platform}`)
      .replace(/\.(dbx\.)?json$/i, '');
    const suggestedName = `${baseName}.dbx.json`;

    try {
      localStorage.setItem(ACTIVE_PROJECT_KEY, jsonStr);
    } catch {
      // Ignored; disk file still writes full JSON cleanly
    }

    if (isTauriRuntime()) {
      try {
        const res = await saveProjectDialogNative(suggestedName, jsonStr);
        if (!res) return; // User cancelled native Save As dialog
        setCurrentFilePath(res.path);
        setProjectName(res.name.replace(/\.(dbx\.)?json$/i, ''));
        setIsDirty(false);
        void refreshDesktopLists();
        flashSaveNotice(`Saved As: ${res.name}`);
        return;
      } catch {
        try {
          const fallbackPath = await saveProjectToDiskFallback(suggestedName, jsonStr);
          setCurrentFilePath(fallbackPath);
          setIsDirty(false);
          flashSaveNotice(`Saved to Downloads: ${suggestedName}`);
          return;
        } catch {
          // Fall through to browser download
        }
      }
    }

    downloadJsonFallback(suggestedName, jsonStr);
    setIsDirty(false);
    flashSaveNotice(`Downloaded: ${suggestedName} (${elementsRef.current.length} items)`);
  }, [buildProjectPayload, flashSaveNotice, refreshDesktopLists]);

  const handleSaveProject = useCallback(async () => {
    if (isTauriRuntime() && currentFilePath) {
      const payload = buildProjectPayload();
      const jsonStr = JSON.stringify(payload, null, 2);
      try {
        localStorage.setItem(ACTIVE_PROJECT_KEY, jsonStr);
      } catch {
        // Ignored
      }
      try {
        const saved = await saveProjectAtPathNative(currentFilePath, jsonStr);
        setProjectName(saved.name.replace(/\.(dbx\.)?json$/i, ''));
        setIsDirty(false);
        void refreshDesktopLists();
        flashSaveNotice(`Saved: ${saved.name}`);
        return;
      } catch {
        // If existing file became unwritable, fall back to Save As dialog
      }
    }
    await handleSaveProjectAs();
  }, [buildProjectPayload, currentFilePath, flashSaveNotice, handleSaveProjectAs, refreshDesktopLists]);

  const confirmDiscardIfDirty = useCallback((actionLabel: string): boolean => {
    if (!isDirtyRef.current || elementsRef.current.length === 0) return true;
    return window.confirm(`You have unsaved changes. Discard them and ${actionLabel}?`);
  }, []);

  const handleOpenProjectNative = useCallback(async (): Promise<boolean> => {
    if (!isTauriRuntime()) return false;
    try {
      const opened = await openProjectDialogNative();
      if (!opened) return true; // Cancelled dialog cleanly
      if (!confirmDiscardIfDirty('open this project')) return true;
      if (elementsRef.current.length > 0 && isDirtyRef.current) {
        const currentPayload = buildProjectPayload();
        await saveLocalSnapshotSafe(
          currentPayload.name || 'Before Open Backup',
          JSON.stringify(currentPayload)
        );
      }
      const parsed = migrateProjectPayload(JSON.parse(opened.content));
      applyOpenedProject(parsed, opened.path, opened.name);
      void refreshDesktopLists();
      flashSaveNotice(`Opened: ${opened.name}`);
      return true;
    } catch (err) {
      alert(
        err instanceof Error
          ? `Could not open .dbx.json file: ${err.message}`
          : 'Invalid .dbx.json project file.'
      );
      return true;
    }
  }, [applyOpenedProject, buildProjectPayload, confirmDiscardIfDirty, flashSaveNotice, refreshDesktopLists]);

  const handleOpenProjectFromFileInput = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (!file) return;
      const reader = new FileReader();
      reader.onload = () => {
        try {
          const parsed = migrateProjectPayload(JSON.parse(String(reader.result)));
          applyOpenedProject(parsed, null, file.name);
          flashSaveNotice(`Opened: ${file.name}`);
        } catch {
          alert('Invalid .dbx.json project file.');
        }
      };
      reader.readAsText(file);
      e.target.value = '';
    },
    [applyOpenedProject, flashSaveNotice]
  );

  const handleOpenRecentProject = useCallback(
    async (path: string) => {
      try {
        if (!confirmDiscardIfDirty('open this recent project')) return;
        if (elementsRef.current.length > 0 && isDirtyRef.current) {
          const currentPayload = buildProjectPayload();
          await saveLocalSnapshotSafe(
            currentPayload.name || 'Before Recent Backup',
            JSON.stringify(currentPayload)
          );
        }
        const opened = await readProjectFileNative(path);
        const parsed = migrateProjectPayload(JSON.parse(opened.content));
        applyOpenedProject(parsed, opened.path, opened.name);
        void refreshDesktopLists();
        flashSaveNotice(`Opened recent: ${opened.name}`);
      } catch (err) {
        alert(
          err instanceof Error
            ? `Failed to open recent file: ${err.message}`
            : 'Could not open recent file.'
        );
      }
    },
    [applyOpenedProject, buildProjectPayload, confirmDiscardIfDirty, flashSaveNotice, refreshDesktopLists]
  );

  const createManualSnapshot = useCallback(async () => {
    const payload = buildProjectPayload();
    const snap = await saveLocalSnapshotSafe(
      payload.name || 'Manual Snapshot',
      JSON.stringify(payload)
    );
    if (snap) {
      setLastSnapshotAt(snap.createdAtMs);
      await refreshDesktopLists();
      flashSaveNotice(`Recovery snapshot created (${Math.max(1, Math.round(snap.byteSize / 1024))} KB)`);
    } else {
      flashSaveNotice('Could not write snapshot (storage full).');
    }
  }, [buildProjectPayload, flashSaveNotice, refreshDesktopLists]);

  const restoreLocalSnapshot = useCallback(
    async (snapshotId: string) => {
      try {
        if (!confirmDiscardIfDirty('restore this recovery snapshot')) return;
        const raw = await loadLocalSnapshotSafe(snapshotId);
        const parsed = migrateProjectPayload(JSON.parse(raw));
        applyOpenedProject(parsed, currentFilePath, parsed.name);
        flashSaveNotice('Snapshot restored!');
      } catch (err) {
        alert(err instanceof Error ? err.message : 'Failed to restore recovery snapshot.');
      }
    },
    [applyOpenedProject, confirmDiscardIfDirty, currentFilePath, flashSaveNotice]
  );

  const markSavedClean = useCallback((nextName?: string) => {
    if (nextName) setProjectName(nextName);
    setCurrentFilePath(null);
    setIsDirty(false);
  }, []);

  const handleExportHtmlFile = useCallback(
    async (html: string) => {
      const baseName = (projectNameRef.current || `designbox-${metaRef.current.platform}`)
        .replace(/[^a-zA-Z0-9._-]+/g, '-')
        .replace(/\.(dbx\.)?json$/i, '')
        .replace(/\.html?$/i, '');
      const suggestedName = `${baseName || 'designbox-export'}.html`;

      if (isTauriRuntime()) {
        try {
          const saved = await exportHtmlFileDialog(suggestedName, html);
          if (!saved) return;
          flashSaveNotice(`Exported HTML: ${saved.name}`);
          return;
        } catch {
          // Fall through to browser Blob download
        }
      }

      const blob = new Blob([html], { type: 'text/html;charset=utf-8' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = suggestedName;
      a.click();
      URL.revokeObjectURL(url);
      flashSaveNotice(`Downloaded HTML: ${suggestedName}`);
    },
    [flashSaveNotice]
  );

  useEffect(() => {
    return () => {
      if (noticeTimerRef.current !== null) {
        window.clearTimeout(noticeTimerRef.current);
      }
    };
  }, []);

  return {
    elements,
    elementsRef,
    history,
    historyIdx,
    canUndo: historyIdx > 0,
    canRedo: historyIdx < history.length - 1,
    commitElements,
    commitWithUpdater,
    commitCoalesced,
    replaceElementsTransient,
    commitLatestElements,
    resetHistory,
    undo,
    redo,
    setAutosaveSuspended,
    confirmDiscardIfDirty,
    saveNotice,
    flashSaveNotice,
    currentFilePath,
    projectName,
    setProjectName,
    isDirty,
    markSavedClean,
    recentProjects,
    localSnapshots,
    lastSnapshotAt,
    refreshDesktopLists,
    handleSaveProject,
    handleSaveProjectAs,
    handleExportHtmlFile,
    handleOpenProjectNative,
    handleOpenProjectFromFileInput,
    handleOpenRecentProject,
    createManualSnapshot,
    restoreLocalSnapshot,
  };
}

