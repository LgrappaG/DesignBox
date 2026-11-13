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
  saveLocalSnapshotSafe,
  saveProjectAtPathNative,
  saveProjectDialogNative,
  saveProjectToDiskFallback,
  SnapshotEntry,
} from '../utils/tauriDesktop';

const ACTIVE_PROJECT_KEY = 'dbx_active_project';
const MAX_HISTORY_ENTRIES = 60;

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
      const parsed = JSON.parse(saved) as Partial<ProjectFile>;
      return {
        elements: Array.isArray(parsed.elements) ? parsed.elements : [],
        name: typeof parsed.name === 'string' && parsed.name.trim() ? parsed.name : 'Canvas Draft',
        platform: parsed.platform,
        layoutMode: parsed.layoutMode,
        canvasWidth:
          typeof parsed.canvasWidth === 'number' && parsed.canvasWidth >= 200
            ? parsed.canvasWidth
            : undefined,
        canvasHeight:
          typeof parsed.canvasHeight === 'number' && parsed.canvasHeight >= 200
            ? parsed.canvasHeight
            : undefined,
        canvasBg: typeof parsed.canvasBg === 'string' ? parsed.canvasBg : undefined,
        canvasPattern: parsed.canvasPattern,
        swatches: Array.isArray(parsed.swatches) ? parsed.swatches : undefined,
        guides: Array.isArray(parsed.guides) ? parsed.guides : undefined,
        customBlueprints: Array.isArray(parsed.customBlueprints)
          ? parsed.customBlueprints
          : undefined,
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

  const [saveNotice, setSaveNotice] = useState<string | null>(null);
  const noticeTimerRef = useRef<number | null>(null);

  const [currentFilePath, setCurrentFilePath] = useState<string | null>(null);
  const [projectName, setProjectName] = useState<string>(initialProjectName);
  const [isDirty, setIsDirty] = useState<boolean>(false);
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
        version: '1.4.0',
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

  const replaceElementsTransient = useCallback(
    (nextOrUpdater: DesignElement[] | ((prev: DesignElement[]) => DesignElement[])) => {
      setElementsState((prev) => {
        const next =
          typeof nextOrUpdater === 'function' ? nextOrUpdater(prev) : nextOrUpdater;
        elementsRef.current = next;
        return next;
      });
    },
    []
  );

  const commitLatestElements = useCallback(() => {
    commitElements(elementsRef.current);
  }, [commitElements]);

  const resetHistory = useCallback((next: DesignElement[]) => {
    const fresh = [next];
    historyRef.current = fresh;
    historyIdxRef.current = 0;
    elementsRef.current = next;
    setHistory(fresh);
    setHistoryIdx(0);
    setElementsState(next);
  }, []);

  const undo = useCallback(() => {
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

  // Auto-save active project to localStorage safely (handles QuotaExceededError cleanly)
  useEffect(() => {
    const payload: ProjectFile = {
      version: '1.4.0',
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
    try {
      localStorage.setItem(ACTIVE_PROJECT_KEY, JSON.stringify(payload));
    } catch {
      flashSaveNotice(
        'Browser storage quota full (large Base64 images). Save to disk (.dbx.json) or switch images to ImgBB URLs.',
        5500
      );
    }
  }, [
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
    flashSaveNotice,
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
      onApplyProjectMetadata(parsed);
      resetHistory(parsed.elements);
      onSelectAfterLoad?.(parsed.elements[0]?.id || null);
      setCurrentFilePath(filePath);
      setProjectName(fileName?.replace(/\.(dbx\.)?json$/i, '') || parsed.name || 'Opened Project');
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

  const handleOpenProjectNative = useCallback(async (): Promise<boolean> => {
    if (!isTauriRuntime()) return false;
    try {
      const opened = await openProjectDialogNative();
      if (!opened) return true; // Cancelled dialog cleanly
      if (elementsRef.current.length > 0 && isDirtyRef.current) {
        const currentPayload = buildProjectPayload();
        await saveLocalSnapshotSafe(
          currentPayload.name || 'Before Open Backup',
          JSON.stringify(currentPayload)
        );
      }
      const parsed = JSON.parse(opened.content) as ProjectFile;
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
  }, [applyOpenedProject, buildProjectPayload, flashSaveNotice, refreshDesktopLists]);

  const handleOpenProjectFromFileInput = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (!file) return;
      const reader = new FileReader();
      reader.onload = () => {
        try {
          const parsed = JSON.parse(String(reader.result)) as ProjectFile;
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
        if (elementsRef.current.length > 0 && isDirtyRef.current) {
          const currentPayload = buildProjectPayload();
          await saveLocalSnapshotSafe(
            currentPayload.name || 'Before Recent Backup',
            JSON.stringify(currentPayload)
          );
        }
        const opened = await readProjectFileNative(path);
        const parsed = JSON.parse(opened.content) as ProjectFile;
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
    [applyOpenedProject, buildProjectPayload, flashSaveNotice, refreshDesktopLists]
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
        const raw = await loadLocalSnapshotSafe(snapshotId);
        const parsed = JSON.parse(raw) as ProjectFile;
        applyOpenedProject(parsed, currentFilePath, parsed.name);
        flashSaveNotice('Snapshot restored!');
      } catch (err) {
        alert(err instanceof Error ? err.message : 'Failed to restore recovery snapshot.');
      }
    },
    [applyOpenedProject, currentFilePath, flashSaveNotice]
  );

  const markSavedClean = useCallback((nextName?: string) => {
    if (nextName) setProjectName(nextName);
    setCurrentFilePath(null);
    setIsDirty(false);
  }, []);

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
    replaceElementsTransient,
    commitLatestElements,
    resetHistory,
    undo,
    redo,
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
    handleOpenProjectNative,
    handleOpenProjectFromFileInput,
    handleOpenRecentProject,
    createManualSnapshot,
    restoreLocalSnapshot,
  };
}

