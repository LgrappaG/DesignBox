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
  Heart,
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
  Search,
  Settings,
  ShieldCheck,
  Sparkles,
  Sun,
  Undo2,
} from 'lucide-react';
import { LayoutMode, TargetPlatform, UiTheme } from '../types/schema';
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
  shieldedElementCount?: number;
  uiTheme: UiTheme;
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
  onOpenSpotlight: () => void;
  onOpenProject: () => void;
  onOpenRecentProject: (path: string) => void;
  onRestoreSnapshot: (id: string) => void;
  onSaveProject: () => void;
  onSaveProjectAs: () => void;
  onExportHtml: () => void;
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

export const TopBar: React.FC<TopBarProps> = React.memo(({
  projectName,
  currentFilePath,
  isDirty,
  saveNotice,
  layoutMode,
  platform,
  shieldedElementCount = 0,
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
  onOpenSpotlight,
  onOpenProject,
  onOpenRecentProject,
  onRestoreSnapshot,
  onSaveProject,
  onSaveProjectAs,
  onExportHtml,
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
  const [fileMenuOpen, setFileMenuOpen] = useState(false);
  const fileMenuRef = useRef<HTMLDivElement | null>(null);
  const inTauri = isTauriRuntime();

  useEffect(() => {
    if (!fileMenuOpen) return;
    const onDocDown = (e: MouseEvent) => {
      if (fileMenuRef.current && !fileMenuRef.current.contains(e.target as Node)) {
        setFileMenuOpen(false);
      }
    };
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        e.stopPropagation();
        e.stopImmediatePropagation();
        setFileMenuOpen(false);
      }
    };
    window.addEventListener('mousedown', onDocDown);
    window.addEventListener('keydown', onKeyDown, true);
    return () => {
      window.removeEventListener('mousedown', onDocDown);
      window.removeEventListener('keydown', onKeyDown, true);
    };
  }, [fileMenuOpen]);

  const runMenuAction = (fn: () => void) => {
    setFileMenuOpen(false);
    fn();
  };

  return (
    <header
      style={{ backgroundColor: 'var(--bg-panel)', borderColor: 'var(--border-main)' }}
      className="min-h-11 py-1.5 border-b px-2.5 flex flex-wrap xl:flex-nowrap items-center justify-between gap-x-2 gap-y-1.5 shrink-0 relative z-40"
    >
      {/* Left: Brand, File Menu, Search & Save Status */}
      <div className="flex items-center flex-wrap gap-1.5 min-w-0">
        <div
          style={
            uiTheme === 'cute'
              ? {
                  background: 'linear-gradient(135deg, var(--accent), var(--accent-hover))',
                  color: '#fff',
                }
              : { backgroundColor: 'var(--accent)', color: '#fff' }
          }
          className={`px-2 py-0.5 font-mono font-bold text-xs tracking-wider shrink-0 flex items-center gap-1 ${
            uiTheme === 'cute' ? 'rounded-full shadow-sm' : 'rounded-[3px]'
          }`}
        >
          <span>DBX</span>
          {uiTheme === 'cute' && <span className="text-[10px] leading-none">♡</span>}
        </div>

        {/* Figma-style File ▾ Dropdown Menu */}
        <div className="relative shrink-0" ref={fileMenuRef}>
          <button
            type="button"
            onClick={() => setFileMenuOpen((v) => !v)}
            style={
              fileMenuOpen
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
            className="flex items-center gap-1 px-2.5 py-1 rounded-[7px] text-xs font-semibold border hover:opacity-90 transition"
            title="File, Templates, Import/Export & Studio Preferences"
          >
            <span>File</span>
            <ChevronDown className="w-3 h-3 opacity-80" />
          </button>

          {fileMenuOpen && (
            <div
              style={{
                backgroundColor: 'var(--bg-panel)',
                borderColor: 'var(--border-strong)',
              }}
              className="absolute left-0 top-full mt-1.5 w-80 border rounded-[10px] shadow-2xl p-2 space-y-1.5 z-50 text-xs"
            >
              <button
                type="button"
                onClick={() => runMenuAction(onOpenTemplates)}
                className="w-full px-2.5 py-1.5 rounded-[6px] flex items-center justify-between hover:bg-black/5 dark:hover:bg-white/5 font-semibold"
              >
                <span className="flex items-center gap-2">
                  <LayoutTemplate className="w-3.5 h-3.5" style={{ color: 'var(--accent)' }} />
                  <span>Starter Hub &amp; Templates…</span>
                </span>
                <span style={{ color: 'var(--text-muted)' }} className="text-[10px] font-mono">
                  Toyhouse
                </span>
              </button>

              <button
                type="button"
                onClick={() => runMenuAction(onNewBlankCanvas)}
                className="w-full px-2.5 py-1.5 rounded-[6px] flex items-center justify-between hover:bg-black/5 dark:hover:bg-white/5"
              >
                <span className="flex items-center gap-2">
                  <FilePlus2 className="w-3.5 h-3.5" style={{ color: 'var(--accent)' }} />
                  <span>New Blank Canvas</span>
                </span>
              </button>

              <div className="border-t my-1" style={{ borderColor: 'var(--border-main)' }} />

              <button
                type="button"
                onClick={() => runMenuAction(onOpenProject)}
                className="w-full px-2.5 py-1.5 rounded-[6px] flex items-center justify-between hover:bg-black/5 dark:hover:bg-white/5"
              >
                <span className="flex items-center gap-2">
                  <FolderOpen className="w-3.5 h-3.5 opacity-80" />
                  <span>Open Project…</span>
                </span>
                <kbd style={{ color: 'var(--text-muted)' }} className="text-[9.5px] font-mono">
                  Ctrl+O
                </kbd>
              </button>

              <button
                type="button"
                onClick={() => runMenuAction(onSaveProject)}
                className="w-full px-2.5 py-1.5 rounded-[6px] flex items-center justify-between hover:bg-black/5 dark:hover:bg-white/5"
              >
                <span className="flex items-center gap-2">
                  <Save className="w-3.5 h-3.5 opacity-80" />
                  <span>Save Project</span>
                </span>
                <kbd style={{ color: 'var(--text-muted)' }} className="text-[9.5px] font-mono">
                  Ctrl+S
                </kbd>
              </button>

              <button
                type="button"
                onClick={() => runMenuAction(onSaveProjectAs)}
                className="w-full px-2.5 py-1.5 rounded-[6px] flex items-center justify-between hover:bg-black/5 dark:hover:bg-white/5"
              >
                <span className="flex items-center gap-2">
                  <Download className="w-3.5 h-3.5 opacity-80" />
                  <span>Save Project As…</span>
                </span>
                <kbd style={{ color: 'var(--text-muted)' }} className="text-[9.5px] font-mono">
                  Ctrl+Shift+S
                </kbd>
              </button>

              <div className="border-t my-1" style={{ borderColor: 'var(--border-main)' }} />

              <button
                type="button"
                onClick={() => runMenuAction(onOpenHtmlImporter)}
                className="w-full px-2.5 py-1.5 rounded-[6px] flex items-center justify-between hover:bg-black/5 dark:hover:bg-white/5"
              >
                <span className="flex items-center gap-2">
                  <FileCode2 className="w-3.5 h-3.5" style={{ color: 'var(--accent)' }} />
                  <span>Import Toyhouse HTML…</span>
                </span>
              </button>

              <button
                type="button"
                onClick={() => runMenuAction(onExportHtml)}
                className="w-full px-2.5 py-1.5 rounded-[6px] flex items-center justify-between hover:bg-black/5 dark:hover:bg-white/5"
              >
                <span className="flex items-center gap-2">
                  <Download className="w-3.5 h-3.5 text-emerald-500" />
                  <span>Export Standalone .HTML</span>
                </span>
              </button>

              <button
                type="button"
                onClick={() => runMenuAction(onOpenObjectForge)}
                className="w-full px-2.5 py-1.5 rounded-[6px] flex items-center justify-between hover:bg-black/5 dark:hover:bg-white/5"
              >
                <span className="flex items-center gap-2">
                  <Cpu className="w-3.5 h-3.5" style={{ color: 'var(--accent)' }} />
                  <span>Object Forge (Custom Widgets)…</span>
                </span>
              </button>

              {(recentProjects.length > 0 || localSnapshots.length > 0) && (
                <div className="border-t pt-1.5 mt-1 space-y-2" style={{ borderColor: 'var(--border-main)' }}>
                  {recentProjects.length > 0 && (
                    <div>
                      <div
                        style={{ color: 'var(--text-muted)' }}
                        className="px-2 text-[9.5px] font-bold uppercase tracking-wider flex items-center gap-1.5 mb-1"
                      >
                        <FolderClock className="w-3 h-3" style={{ color: 'var(--accent)' }} />
                        <span>Recent Projects</span>
                      </div>
                      <div className="space-y-0.5 max-h-28 overflow-y-auto px-1">
                        {recentProjects.slice(0, 6).map((rp) => (
                          <button
                            key={rp.path}
                            type="button"
                            disabled={!rp.exists}
                            onClick={() => runMenuAction(() => onOpenRecentProject(rp.path))}
                            style={{
                              backgroundColor: 'var(--bg-input)',
                              borderColor: 'var(--border-main)',
                            }}
                            className="w-full text-left px-2 py-1 rounded-[5px] border text-[10.5px] flex items-center justify-between gap-2 hover:border-[var(--accent)] disabled:opacity-45"
                            title={rp.path}
                          >
                            <span className="truncate font-medium">{rp.name}</span>
                            <span style={{ color: 'var(--text-muted)' }} className="text-[9px] font-mono shrink-0">
                              {rp.exists ? new Date(rp.updatedAtMs).toLocaleDateString() : 'Missing'}
                            </span>
                          </button>
                        ))}
                      </div>
                    </div>
                  )}

                  {localSnapshots.length > 0 && (
                    <div>
                      <div
                        style={{ color: 'var(--text-muted)' }}
                        className="px-2 text-[9.5px] font-bold uppercase tracking-wider flex items-center gap-1.5 mb-1"
                      >
                        <History className="w-3 h-3" style={{ color: 'var(--accent)' }} />
                        <span>Recovery Snapshots</span>
                      </div>
                      <div className="space-y-0.5 max-h-24 overflow-y-auto px-1">
                        {localSnapshots.slice(0, 4).map((snap) => (
                          <button
                            key={snap.id}
                            type="button"
                            onClick={() => runMenuAction(() => onRestoreSnapshot(snap.id))}
                            style={{
                              backgroundColor: 'var(--bg-input)',
                              borderColor: 'var(--border-main)',
                            }}
                            className="w-full text-left px-2 py-1 rounded-[5px] border text-[10.5px] flex items-center justify-between gap-2 hover:border-[var(--accent)]"
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
                    </div>
                  )}
                </div>
              )}

              {!recentProjects.length && !localSnapshots.length && (
                <div className="border-t pt-1.5 px-2 text-[10px]" style={{ borderColor: 'var(--border-main)', color: 'var(--text-muted)' }}>
                  {inTauri
                    ? 'Recent files & snapshots appear here automatically.'
                    : 'Recovery snapshots save automatically as you edit.'}
                </div>
              )}

              <div className="border-t my-1" style={{ borderColor: 'var(--border-main)' }} />

              <button
                type="button"
                onClick={() => runMenuAction(onOpenShortcuts)}
                className="w-full px-2.5 py-1.5 rounded-[6px] flex items-center gap-2 hover:bg-black/5 dark:hover:bg-white/5"
              >
                <Keyboard className="w-3.5 h-3.5 opacity-80" />
                <span>Keyboard Shortcuts</span>
              </button>

              <button
                type="button"
                onClick={() => runMenuAction(onOpenSettings)}
                className="w-full px-2.5 py-1.5 rounded-[6px] flex items-center gap-2 hover:bg-black/5 dark:hover:bg-white/5"
              >
                <Settings className="w-3.5 h-3.5 opacity-80" />
                <span>Studio Settings &amp; Hosting…</span>
              </button>

              <button
                type="button"
                onClick={() => runMenuAction(onResetWorkspaceLayout)}
                className="w-full px-2.5 py-1.5 rounded-[6px] flex items-center gap-2 hover:bg-black/5 dark:hover:bg-white/5"
              >
                <RotateCcw className="w-3.5 h-3.5 opacity-80" />
                <span>Reset Workspace Layout</span>
              </button>
            </div>
          )}
        </div>

        {/* Quick Command Search (Ctrl+K) */}
        <button
          type="button"
          onClick={onOpenSpotlight}
          style={{
            backgroundColor: 'var(--bg-input)',
            borderColor: 'var(--border-strong)',
            color: 'var(--text-muted)',
          }}
          className="flex items-center gap-1.5 px-2.5 py-1 rounded-[7px] border text-[11px] hover:border-[var(--accent)] transition shrink-0"
          title="Quick-Add Elements, Widgets, Icons & Assets (/ or Ctrl+K)"
        >
          <Search className="w-3.5 h-3.5" style={{ color: 'var(--accent)' }} />
          <span className="hidden md:inline">Search</span>
          <kbd className="text-[9.5px] font-mono px-1 rounded bg-black/10 dark:bg-white/10">
            Ctrl+K
          </kbd>
        </button>

        {/* Project Name & Quick Save */}
        <button
          type="button"
          onClick={onSaveProject}
          style={
            saveNotice
              ? { backgroundColor: 'rgba(16, 185, 129, 0.16)', borderColor: 'rgba(16, 185, 129, 0.4)', color: '#10B981' }
              : { color: 'var(--text-muted)', borderColor: 'transparent' }
          }
          className="flex items-center gap-1.5 px-2 py-1 rounded-[6px] border text-[11px] font-mono hover:bg-black/5 dark:hover:bg-white/5 transition min-w-0 max-w-[200px]"
          title={currentFilePath ? `${currentFilePath} · Click to Save (Ctrl+S)` : 'Click to Save Project (Ctrl+S)'}
        >
          {saveNotice ? (
            <>
              <Check className="w-3 h-3 shrink-0" />
              <span className="truncate font-sans font-medium">{saveNotice}</span>
            </>
          ) : (
            <>
              <Save className="w-3 h-3 shrink-0 opacity-75" />
              <span className="truncate">
                {projectName}
                {isDirty ? '*' : ''}
              </span>
            </>
          )}
        </button>
      </div>

      {/* Center: 3 Layout Modes Switcher */}
      <div
        style={{ backgroundColor: 'var(--bg-input)', borderColor: 'var(--border-main)' }}
        className="flex items-center p-0.5 rounded-[8px] border shrink-0 max-w-full overflow-x-auto"
      >
        {(
          [
            { id: 'freeform', label: '1. Freeform Collage', icon: Move },
            { id: 'hybrid', label: '2. Dynamic Hybrid', icon: LayoutGrid },
            { id: 'block', label: '3. Block Stack', icon: Rows3 },
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
              className="flex items-center gap-1 px-2 py-1 rounded-[6px] text-[11px] font-medium transition whitespace-nowrap"
            >
              <Icon className="w-3 h-3 shrink-0" />
              <span className="hidden 2xl:inline">{m.label}</span>
              <span className="2xl:hidden">{m.label.replace(/^\d+\.\s*/, '')}</span>
            </button>
          );
        })}
      </div>

      {/* Right Controls */}
      <div className="flex items-center flex-wrap gap-1 min-w-0">
        <button
          onClick={onToggleTheme}
          style={
            uiTheme === 'cute'
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
          className={`flex items-center gap-1 px-2 py-1 border text-[11px] font-medium shrink-0 transition ${
            uiTheme === 'cute' ? 'rounded-full font-semibold' : 'rounded-[7px]'
          }`}
          title="Cycle Studio UI Theme: Carbon Dark → Warm Paper → Kawaii Cute"
        >
          {uiTheme === 'carbon' ? (
            <>
              <Moon className="w-3.5 h-3.5 text-amber-300" />
              <span className="hidden 2xl:inline">Carbon</span>
            </>
          ) : uiTheme === 'paper' ? (
            <>
              <Sun className="w-3.5 h-3.5 text-amber-600" />
              <span className="hidden 2xl:inline">Paper</span>
            </>
          ) : (
            <>
              <Heart className="w-3.5 h-3.5 fill-current" style={{ color: 'var(--accent)' }} />
              <span className="hidden 2xl:inline">♡ Cute</span>
            </>
          )}
        </button>

        {/* Clean 2-way Toyhouse F2U vs Premium Segmented Switch */}
        {(() => {
          const isF2U = platform === 'toyhouse_free' || platform === 'toyhouse_oc';
          return (
            <div
              style={{ backgroundColor: 'var(--bg-input)', borderColor: 'var(--border-strong)' }}
              className="flex items-center p-0.5 rounded-[8px] border shrink-0"
              title={
                isF2U
                  ? shieldedElementCount > 0
                    ? `Toyhouse F2U Free Mode active: ${shieldedElementCount} element(s) have Pro effects safely masked without losing settings.`
                    : 'Toyhouse F2U Free Mode: 100% Toyhouse Free compliant (zero <style> tags)'
                  : 'Toyhouse Premium Mode: <style> blocks, custom animations, glass blur & clip-path enabled'
              }
            >
              <button
                type="button"
                onClick={() => onChangePlatform('toyhouse_free')}
                style={
                  isF2U
                    ? {
                        backgroundColor: 'rgba(16, 185, 129, 0.16)',
                        color: '#059669',
                        borderColor: 'rgba(16, 185, 129, 0.4)',
                      }
                    : { color: 'var(--text-muted)', borderColor: 'transparent' }
                }
                className="flex items-center gap-1 px-2 py-1 rounded-[6px] border text-[11px] font-bold transition whitespace-nowrap"
              >
                <ShieldCheck className="w-3 h-3 shrink-0" />
                <span>TH F2U</span>
                {isF2U && shieldedElementCount > 0 && (
                  <span className="ml-0.5 px-1 py-0 rounded bg-amber-500/20 text-amber-600 dark:text-amber-300 font-mono text-[9.5px]">
                    · {shieldedElementCount} masked
                  </span>
                )}
              </button>
              <button
                type="button"
                onClick={() => onChangePlatform('toyhouse_premium')}
                style={
                  !isF2U
                    ? {
                        backgroundColor: 'var(--accent)',
                        color: '#fff',
                        borderColor: 'var(--accent)',
                      }
                    : { color: 'var(--text-muted)', borderColor: 'transparent' }
                }
                className="flex items-center gap-1 px-2 py-1 rounded-[6px] border text-[11px] font-bold transition whitespace-nowrap"
              >
                <Sparkles className="w-3 h-3 shrink-0" />
                <span>TH Pro</span>
              </button>
            </div>
          );
        })()}

        <div
          style={{ backgroundColor: 'var(--bg-input)', borderColor: 'var(--border-main)' }}
          className="flex items-center border rounded-[7px] shrink-0"
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
          className="flex items-center gap-1 px-2 py-1 rounded-[7px] border text-[11px] font-medium hover:opacity-90 transition shrink-0"
          title="Toggle Blender-style Bottom Dock (Live HTML & Interactive Preview)"
        >
          <PanelBottom className="w-3.5 h-3.5" />
          <span className="hidden 2xl:inline">Dock</span>
        </button>

        <button
          onClick={onOpenPreview}
          style={{
            backgroundColor: 'var(--bg-panel-alt)',
            borderColor: 'var(--border-strong)',
          }}
          className="flex items-center gap-1 px-2 py-1 rounded-[7px] border text-[11px] font-medium hover:opacity-90 shrink-0"
          title="Interactive Toyhouse Live Preview & Contrast Stress-Test"
        >
          <Eye className="w-3.5 h-3.5" />
          <span className="hidden md:inline">Preview</span>
        </button>

        <button
          onClick={onCopyCode}
          style={{ backgroundColor: 'var(--accent)', color: '#fff' }}
          className="flex items-center gap-1 px-2.5 py-1 rounded-[7px] text-[11px] font-semibold hover:opacity-95 transition shrink-0"
          title="Copy Generated Toyhouse HTML"
        >
          {copied ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
          <span>{copied ? 'Copied' : 'Copy'}</span>
        </button>
      </div>
    </header>
  );
});
