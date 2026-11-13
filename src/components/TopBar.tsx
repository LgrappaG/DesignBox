import React, { useEffect, useRef, useState } from 'react';
import {
  Check,
  ChevronDown,
  Clock,
  Copy,
  Cpu,
  Download,
  Eye,
  FileCode2,
  FilePlus2,
  FolderClock,
  FolderOpen,
  History,
  Keyboard,
  LayoutGrid,
  LayoutTemplate,
  Moon,
  Move,
  PanelBottom,
  Redo2,
  RotateCcw,
  Rows3,
  Save,
  Settings,
  Sun,
  Undo2,
} from 'lucide-react';
import { LayoutMode, TargetPlatform } from '../types/schema';
import {
  isTauriRuntime,
  RecentProjectEntry,
  SnapshotEntry,
} from '../utils/tauriDesktop';

export interface TopBarProps {
  projectName: string;
  currentFilePath: string | null;
  isDirty: boolean;
  saveNotice: string | null;
  layoutMode: LayoutMode;
  platform: TargetPlatform;
  uiTheme: 'carbon' | 'paper';
  canUndo: boolean;
  canRedo: boolean;
  bottomDockOpen: boolean;
  copied: boolean;
  recentProjects: RecentProjectEntry[];
  localSnapshots: SnapshotEntry[];
  onNewBlankCanvas: () => void;
  onOpenObjectForge: () => void;
  onOpenHtmlImporter: () => void;
  onOpenTemplates: () => void;
  onOpenProject: () => void;
  onOpenRecentProject: (path: string) => void;
  onRestoreSnapshot: (id: string) => void;
  onSaveProject: () => void;
  onSaveProjectAs: () => void;
  onOpenShortcuts: () => void;
  onOpenSettings: () => void;
  onResetWorkspaceLayout: () => void;
  onChangeLayoutMode: (mode: LayoutMode) => void;
  onToggleTheme: () => void;
  onChangePlatform: (platform: TargetPlatform) => void;
  onUndo: () => void;
  onRedo: () => void;
  onToggleBottomDock: () => void;
  onOpenPreview: () => void;
  onCopyCode: () => void;
}

export const TopBar: React.FC<TopBarProps> = ({
  projectName,
  currentFilePath,
  isDirty,
  saveNotice,
  layoutMode,
  platform,
  uiTheme,
  canUndo,
  canRedo,
  bottomDockOpen,
  copied,
  recentProjects,
  localSnapshots,
  onNewBlankCanvas,
  onOpenObjectForge,
  onOpenHtmlImporter,
  onOpenTemplates,
  onOpenProject,
  onOpenRecentProject,
  onRestoreSnapshot,
  onSaveProject,
  onSaveProjectAs,
  onOpenShortcuts,
  onOpenSettings,
  onResetWorkspaceLayout,
  onChangeLayoutMode,
  onToggleTheme,
  onChangePlatform,
  onUndo,
  onRedo,
  onToggleBottomDock,
  onOpenPreview,
  onCopyCode,
}) => {
  const [recentMenuOpen, setRecentMenuOpen] = useState(false);
  const recentMenuRef = useRef<HTMLDivElement | null>(null);
  const inTauri = isTauriRuntime();

  useEffect(() => {
    if (!recentMenuOpen) return;
    const onDocDown = (e: MouseEvent) => {
      if (recentMenuRef.current && !recentMenuRef.current.contains(e.target as Node)) {
        setRecentMenuOpen(false);
      }
    };
    window.addEventListener('mousedown', onDocDown);
    return () => window.removeEventListener('mousedown', onDocDown);
  }, [recentMenuOpen]);

  return (
    <header
      style={{ backgroundColor: 'var(--bg-panel)', borderColor: 'var(--border-main)' }}
      className="h-11 border-b px-3 flex items-center justify-between shrink-0 relative z-40"
    >
      <div className="flex items-center gap-1.5 min-w-0">
        <div
          style={{ backgroundColor: 'var(--accent)', color: '#fff' }}
          className="px-2 py-0.5 rounded-[3px] font-mono font-bold text-xs tracking-wider shrink-0"
        >
          DBX
        </div>
        <div className="flex items-center gap-1 min-w-0">
          <span className="font-semibold text-xs tracking-tight shrink-0">DesignBox</span>
          <span
            title={currentFilePath || 'Unsaved active workspace (stored in autosave)'}
            style={{ color: 'var(--text-muted)' }}
            className="text-[10px] font-mono truncate max-w-[115px] hidden xl:inline"
          >
            · {projectName}
            {isDirty ? '*' : ''}
          </span>
        </div>

        <div style={{ backgroundColor: 'var(--border-main)' }} className="h-4 w-px mx-1 shrink-0" />

        <button
          onClick={onNewBlankCanvas}
          style={{
            backgroundColor: 'var(--bg-panel-alt)',
            borderColor: 'var(--border-strong)',
          }}
          className="flex items-center gap-1 px-2 py-1 rounded-[7px] text-xs font-medium border hover:opacity-90 transition shrink-0"
          title="Start with a fresh blank canvas"
        >
          <FilePlus2 className="w-3.5 h-3.5" style={{ color: 'var(--accent)' }} />
          <span>Blank</span>
        </button>

        <button
          onClick={onOpenObjectForge}
          style={{
            backgroundColor: 'var(--accent-soft)',
            borderColor: 'var(--accent)',
          }}
          className="flex items-center gap-1 px-2 py-1 rounded-[7px] text-xs font-semibold border hover:opacity-90 transition shrink-0"
        >
          <Cpu className="w-3.5 h-3.5" style={{ color: 'var(--accent)' }} />
          <span>+ Forge</span>
        </button>

        <button
          onClick={onOpenHtmlImporter}
          style={{
            backgroundColor: 'var(--bg-panel-alt)',
            borderColor: 'var(--border-strong)',
          }}
          className="flex items-center gap-1 px-2 py-1 rounded-[7px] text-xs font-medium border hover:opacity-90 transition shrink-0"
          title="Import Toyhouse HTML markup into editable blocks & custom widgets"
        >
          <FileCode2 className="w-3.5 h-3.5" style={{ color: 'var(--accent)' }} />
          <span>Import HTML</span>
        </button>

        <button
          onClick={onOpenTemplates}
          style={{
            backgroundColor: 'var(--bg-panel-alt)',
            borderColor: 'var(--border-strong)',
          }}
          className="flex items-center gap-1 px-2 py-1 rounded-[7px] text-xs font-medium border hover:opacity-90 transition shrink-0"
        >
          <LayoutTemplate className="w-3.5 h-3.5" style={{ color: 'var(--accent)' }} />
          <span>Presets</span>
        </button>

        <div className="relative flex items-center" ref={recentMenuRef}>
          <button
            onClick={onOpenProject}
            className="flex items-center gap-1 px-1.5 py-1 rounded-l-[6px] text-xs hover:opacity-80"
            title="Open .dbx.json project (Ctrl+O)"
          >
            <FolderOpen className="w-3.5 h-3.5" style={{ color: 'var(--text-muted)' }} />
            <span>Open</span>
          </button>
          <button
            type="button"
            onClick={() => setRecentMenuOpen((v) => !v)}
            className="px-1 py-1 rounded-r-[6px] hover:opacity-80"
            title="Recent Projects & Local Snapshots"
          >
            <ChevronDown className="w-3 h-3" style={{ color: 'var(--text-muted)' }} />
          </button>

          {recentMenuOpen && (
            <div
              style={{
                backgroundColor: 'var(--bg-panel)',
                borderColor: 'var(--border-strong)',
              }}
              className="absolute left-0 top-full mt-1.5 w-72 border rounded-[10px] shadow-2xl p-2.5 space-y-2.5 z-50"
            >
              <div>
                <div
                  style={{ color: 'var(--text-muted)' }}
                  className="text-[10px] font-bold uppercase tracking-wider flex items-center gap-1.5 mb-1"
                >
                  <FolderClock className="w-3 h-3" style={{ color: 'var(--accent)' }} />
                  <span>Recent Projects</span>
                </div>
                {recentProjects.length === 0 ? (
                  <p style={{ color: 'var(--text-muted)' }} className="text-[10px] italic px-1">
                    {inTauri
                      ? 'No opened or saved .dbx.json files yet.'
                      : 'Native file history is tracked in desktop mode.'}
                  </p>
                ) : (
                  <div className="space-y-1 max-h-36 overflow-y-auto">
                    {recentProjects.map((rp) => (
                      <button
                        key={rp.path}
                        type="button"
                        disabled={!rp.exists}
                        onClick={() => {
                          setRecentMenuOpen(false);
                          onOpenRecentProject(rp.path);
                        }}
                        style={{
                          backgroundColor: 'var(--bg-input)',
                          borderColor: 'var(--border-main)',
                        }}
                        className="w-full text-left px-2 py-1 rounded-[5px] border text-[11px] flex items-center justify-between gap-2 hover:border-amber-600 disabled:opacity-45"
                        title={rp.path}
                      >
                        <span className="truncate font-medium">{rp.name}</span>
                        <span style={{ color: 'var(--text-muted)' }} className="text-[9px] font-mono shrink-0">
                          {rp.exists ? new Date(rp.updatedAtMs).toLocaleDateString() : 'Missing'}
                        </span>
                      </button>
                    ))}
                  </div>
                )}
              </div>

              <div className="border-t pt-2" style={{ borderColor: 'var(--border-main)' }}>
                <div
                  style={{ color: 'var(--text-muted)' }}
                  className="text-[10px] font-bold uppercase tracking-wider flex items-center gap-1.5 mb-1"
                >
                  <History className="w-3 h-3" style={{ color: 'var(--accent)' }} />
                  <span>Local Recovery Snapshots</span>
                </div>
                {localSnapshots.length === 0 ? (
                  <p style={{ color: 'var(--text-muted)' }} className="text-[10px] italic px-1">
                    Auto-snapshots are captured every 60s when dirty.
                  </p>
                ) : (
                  <div className="space-y-1 max-h-36 overflow-y-auto">
                    {localSnapshots.slice(0, 6).map((snap) => (
                      <button
                        key={snap.id}
                        type="button"
                        onClick={() => {
                          setRecentMenuOpen(false);
                          onRestoreSnapshot(snap.id);
                        }}
                        style={{
                          backgroundColor: 'var(--bg-input)',
                          borderColor: 'var(--border-main)',
                        }}
                        className="w-full text-left px-2 py-1 rounded-[5px] border text-[11px] flex items-center justify-between gap-2 hover:border-amber-600"
                      >
                        <span className="truncate flex items-center gap-1">
                          <Clock className="w-3 h-3 opacity-60 shrink-0" />
                          {snap.projectName}
                        </span>
                        <span style={{ color: 'var(--text-muted)' }} className="text-[9px] font-mono shrink-0">
                          {new Date(snap.createdAtMs).toLocaleTimeString()}
                        </span>
                      </button>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}
        </div>

        <button
          onClick={onSaveProject}
          style={saveNotice ? { backgroundColor: 'var(--accent)', color: '#fff' } : undefined}
          className="flex items-center gap-1 px-1.5 py-1 rounded-[6px] text-xs hover:opacity-80 transition shrink-0"
          title={
            currentFilePath
              ? `Save (${currentFilePath}) · Ctrl+S`
              : 'Save project (.dbx.json) · Ctrl+S'
          }
        >
          {saveNotice ? (
            <Check className="w-3.5 h-3.5" />
          ) : (
            <Save className="w-3.5 h-3.5" style={{ color: 'var(--text-muted)' }} />
          )}
          <span>{saveNotice ? 'Saved!' : 'Save'}</span>
        </button>

        <button
          onClick={onSaveProjectAs}
          className="p-1 rounded-[6px] hover:opacity-80 shrink-0"
          title="Save Project As... (Ctrl+Shift+S)"
        >
          <Download className="w-3.5 h-3.5" style={{ color: 'var(--text-muted)' }} />
        </button>

        <button
          onClick={onOpenShortcuts}
          className="p-1 rounded-[6px] hover:opacity-80 shrink-0"
          title="Keyboard Shortcuts"
        >
          <Keyboard className="w-3.5 h-3.5" style={{ color: 'var(--text-muted)' }} />
        </button>

        <button
          onClick={onOpenSettings}
          className="p-1 rounded-[6px] hover:opacity-80 shrink-0"
          title="ImgBB API Key, Snapshots & Preferences"
        >
          <Settings className="w-3.5 h-3.5" style={{ color: 'var(--text-muted)' }} />
        </button>

        <button
          type="button"
          onClick={onResetWorkspaceLayout}
          className="p-1 rounded-[6px] hover:opacity-80 shrink-0"
          title="Reset Panel Layout & Center View"
        >
          <RotateCcw className="w-3.5 h-3.5" style={{ color: 'var(--text-muted)' }} />
        </button>
      </div>

      {/* Center: 3 Layout Modes Switcher */}
      <div
        style={{ backgroundColor: 'var(--bg-input)', borderColor: 'var(--border-main)' }}
        className="flex items-center p-0.5 rounded-[8px] border shrink-0"
      >
        {(
          [
            { id: 'hybrid', label: '1. Dynamic Hybrid', icon: LayoutGrid },
            { id: 'block', label: '2. Block Stack', icon: Rows3 },
            { id: 'freeform', label: '3. Freeform Collage', icon: Move },
          ] as const
        ).map((m) => {
          const Icon = m.icon;
          const active = layoutMode === m.id;
          return (
            <button
              key={m.id}
              onClick={() => onChangeLayoutMode(m.id)}
              style={
                active
                  ? { backgroundColor: 'var(--accent)', color: '#fff' }
                  : { color: 'var(--text-muted)' }
              }
              className="flex items-center gap-1.5 px-2.5 py-1 rounded-[6px] text-[11px] font-medium transition"
            >
              <Icon className="w-3 h-3" />
              <span className="hidden lg:inline">{m.label}</span>
              <span className="lg:hidden">{m.label.replace(/^\d+\.\s*/, '')}</span>
            </button>
          );
        })}
      </div>

      {/* Right Controls */}
      <div className="flex items-center gap-1.5 shrink-0">
        <button
          onClick={onToggleTheme}
          style={{
            backgroundColor: 'var(--bg-panel-alt)',
            borderColor: 'var(--border-strong)',
          }}
          className="flex items-center gap-1 px-2 py-1 rounded-[7px] border text-[11px] font-medium"
          title="Switch between Warm Oatmeal Paper UI & Cozy Carbon Dark UI"
        >
          {uiTheme === 'carbon' ? (
            <>
              <Sun className="w-3.5 h-3.5 text-amber-400" />
              <span className="hidden xl:inline">Paper</span>
            </>
          ) : (
            <>
              <Moon className="w-3.5 h-3.5 text-stone-700" />
              <span className="hidden xl:inline">Carbon</span>
            </>
          )}
        </button>

        <select
          value={platform}
          onChange={(e) => onChangePlatform(e.target.value as TargetPlatform)}
          style={{
            backgroundColor: 'var(--bg-input)',
            borderColor: 'var(--border-strong)',
            color: 'var(--text-main)',
          }}
          className="border rounded-[7px] px-2 py-1 text-[11px] font-medium focus:outline-none max-w-[185px]"
        >
          <option value="toyhouse_free">Toyhouse · Free (F2U - No Premium)</option>
          <option value="toyhouse_premium">Toyhouse · Premium (Custom CSS)</option>
          <option value="toyhouse_oc">Toyhouse · Character (OC Default)</option>
          <option value="toyhouse_profile">Toyhouse · User Profile</option>
          <option value="toyhouse_world">Toyhouse · World Page</option>
          <option value="carrd_pro">Carrd Pro · Embed Code</option>
        </select>

        <div
          style={{ backgroundColor: 'var(--bg-input)', borderColor: 'var(--border-main)' }}
          className="flex items-center border rounded-[7px]"
        >
          <button
            onClick={onUndo}
            disabled={!canUndo}
            className="p-1 hover:opacity-80 disabled:opacity-30"
            title="Undo (Ctrl+Z)"
          >
            <Undo2 className="w-3.5 h-3.5" />
          </button>
          <button
            onClick={onRedo}
            disabled={!canRedo}
            className="p-1 hover:opacity-80 disabled:opacity-30"
            title="Redo (Ctrl+Y)"
          >
            <Redo2 className="w-3.5 h-3.5" />
          </button>
        </div>

        <button
          type="button"
          onClick={onToggleBottomDock}
          style={
            bottomDockOpen
              ? {
                  backgroundColor: 'var(--accent-soft)',
                  borderColor: 'var(--accent)',
                  color: 'var(--accent)',
                }
              : {
                  backgroundColor: 'var(--bg-panel-alt)',
                  borderColor: 'var(--border-strong)',
                }
          }
          className="flex items-center gap-1 px-2 py-1 rounded-[7px] border text-[11px] font-medium hover:opacity-90 transition"
          title="Toggle Blender-style Bottom Dock (Live HTML & Interactive Preview)"
        >
          <PanelBottom className="w-3.5 h-3.5" />
          <span className="hidden xl:inline">Dock</span>
        </button>

        <button
          onClick={onOpenPreview}
          style={{
            backgroundColor: 'var(--bg-panel-alt)',
            borderColor: 'var(--border-strong)',
          }}
          className="flex items-center gap-1 px-2 py-1 rounded-[7px] border text-[11px] font-medium hover:opacity-90"
        >
          <Eye className="w-3.5 h-3.5" />
          <span>Preview</span>
        </button>

        <button
          onClick={onCopyCode}
          style={{ backgroundColor: 'var(--accent)', color: '#fff' }}
          className="flex items-center gap-1 px-2.5 py-1 rounded-[7px] text-[11px] font-semibold hover:opacity-95 transition"
        >
          {copied ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
          <span>{copied ? 'Copied' : 'Copy Code'}</span>
        </button>
      </div>
    </header>
  );
};

