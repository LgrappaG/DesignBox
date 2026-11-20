import { TargetPlatform } from '../types/schema';

export interface OpenedProjectPayload {
  path: string;
  name: string;
  content: string;
}

export interface SavedProjectPayload {
  path: string;
  name: string;
}

export interface RecentProjectEntry {
  path: string;
  name: string;
  updatedAtMs: number;
  exists: boolean;
}

export interface SnapshotEntry {
  id: string;
  projectName: string;
  createdAtMs: number;
  byteSize: number;
  contentHash: string;
}

export interface NativeValidationReport {
  valid: boolean;
  platform: string;
  notes: string[];
}

export function isTauriRuntime(): boolean {
  if (typeof window === 'undefined') return false;
  const w = window as unknown as Record<string, unknown>;
  return Boolean(w.__TAURI_INTERNALS__ || w.__TAURI__);
}

async function invokeTauri<T>(cmd: string, args?: Record<string, unknown>): Promise<T> {
  const { invoke } = await import('@tauri-apps/api/core');
  return invoke<T>(cmd, args);
}

const WEB_SNAPSHOTS_INDEX_KEY = 'dbx_web_snapshots_index_v1';
const WEB_SNAPSHOT_DATA_PREFIX = 'dbx_web_snap_v1_';

export async function openProjectDialogNative(): Promise<OpenedProjectPayload | null> {
  if (!isTauriRuntime()) return null;
  return invokeTauri<OpenedProjectPayload | null>('open_project_dialog');
}

export async function saveProjectDialogNative(
  suggestedName: string,
  content: string
): Promise<SavedProjectPayload | null> {
  if (!isTauriRuntime()) return null;
  return invokeTauri<SavedProjectPayload | null>('save_project_dialog', {
    suggestedName,
    content,
  });
}

export async function exportHtmlFileDialog(
  suggestedName: string,
  html: string
): Promise<SavedProjectPayload | null> {
  if (!isTauriRuntime()) return null;
  return invokeTauri<SavedProjectPayload | null>('export_html_dialog', {
    suggestedName,
    html,
  });
}

export async function saveProjectAtPathNative(
  path: string,
  content: string
): Promise<SavedProjectPayload> {
  if (!isTauriRuntime()) {
    throw new Error('Desktop Tauri runtime is not available.');
  }
  return invokeTauri<SavedProjectPayload>('save_project_at_path', { path, content });
}

export async function saveProjectToDiskFallback(
  filename: string,
  content: string
): Promise<string> {
  if (!isTauriRuntime()) {
    throw new Error('Desktop Tauri runtime is not available.');
  }
  return invokeTauri<string>('save_project_to_disk', { filename, content });
}

export async function readProjectFileNative(path: string): Promise<OpenedProjectPayload> {
  if (!isTauriRuntime()) {
    throw new Error('Desktop Tauri runtime is not available.');
  }
  return invokeTauri<OpenedProjectPayload>('read_project_file', { path });
}

export async function getRecentProjectsNative(): Promise<RecentProjectEntry[]> {
  if (!isTauriRuntime()) return [];
  try {
    return await invokeTauri<RecentProjectEntry[]>('get_recent_projects');
  } catch {
    return [];
  }
}

function simpleWebHash(content: string): string {
  let hash = 2166136261;
  for (let i = 0; i < content.length; i += 1) {
    hash ^= content.charCodeAt(i);
    hash = Math.imul(hash, 16777619);
  }
  return (hash >>> 0).toString(16).padStart(8, '0');
}

export async function saveLocalSnapshotSafe(
  projectName: string,
  content: string
): Promise<SnapshotEntry | null> {
  if (isTauriRuntime()) {
    try {
      return await invokeTauri<SnapshotEntry>('save_local_snapshot', {
        projectName,
        content,
      });
    } catch {
      return null;
    }
  }

  // Web/Browser fallback snapshots in localStorage (kept small, max 5 entries)
  try {
    const rawIdx = localStorage.getItem(WEB_SNAPSHOTS_INDEX_KEY);
    const list: SnapshotEntry[] = rawIdx ? (JSON.parse(rawIdx) as SnapshotEntry[]) : [];
    const contentHash = simpleWebHash(content);
    if (list[0] && list[0].contentHash === contentHash && localStorage.getItem(`${WEB_SNAPSHOT_DATA_PREFIX}${list[0].id}`)) {
      return list[0];
    }
    const createdAtMs = Date.now();
    const id = `web_snap_${createdAtMs}`;
    localStorage.setItem(`${WEB_SNAPSHOT_DATA_PREFIX}${id}`, content);
    const entry: SnapshotEntry = {
      id,
      projectName: projectName || 'Canvas Draft',
      createdAtMs,
      byteSize: content.length,
      contentHash,
    };
    const next = [entry, ...list].slice(0, 5);
    const dropped = [entry, ...list].slice(5);
    dropped.forEach((d) => localStorage.removeItem(`${WEB_SNAPSHOT_DATA_PREFIX}${d.id}`));
    localStorage.setItem(WEB_SNAPSHOTS_INDEX_KEY, JSON.stringify(next));
    return entry;
  } catch {
    return null;
  }
}

export async function listLocalSnapshotsSafe(): Promise<SnapshotEntry[]> {
  if (isTauriRuntime()) {
    try {
      return await invokeTauri<SnapshotEntry[]>('list_local_snapshots');
    } catch {
      return [];
    }
  }
  try {
    const rawIdx = localStorage.getItem(WEB_SNAPSHOTS_INDEX_KEY);
    return rawIdx ? (JSON.parse(rawIdx) as SnapshotEntry[]) : [];
  } catch {
    return [];
  }
}

export async function loadLocalSnapshotSafe(snapshotId: string): Promise<string> {
  if (isTauriRuntime()) {
    return invokeTauri<string>('load_local_snapshot', { snapshotId });
  }
  const raw = localStorage.getItem(`${WEB_SNAPSHOT_DATA_PREFIX}${snapshotId}`);
  if (!raw) {
    throw new Error('Web recovery snapshot not found in localStorage.');
  }
  return raw;
}

export async function validatePlatformSnippetNative(
  html: string,
  platform: TargetPlatform
): Promise<NativeValidationReport | null> {
  if (!isTauriRuntime()) return null;
  try {
    return await invokeTauri<NativeValidationReport>('validate_platform_snippet', {
      html,
      platform,
    });
  } catch {
    return null;
  }
}

export async function registerDesktopCloseGuard(
  shouldPrompt: () => boolean,
  onBeforeClose: () => void
): Promise<() => void> {
  if (!isTauriRuntime()) {
    return () => {};
  }
  try {
    const { getCurrentWindow } = await import('@tauri-apps/api/window');
    return await getCurrentWindow().onCloseRequested((event) => {
      onBeforeClose();
      if (!shouldPrompt()) return;
      const confirmed = window.confirm(
        'You have unsaved changes. Close DesignBox without saving?'
      );
      if (!confirmed) {
        event.preventDefault();
      }
    });
  } catch {
    return () => {};
  }
}

