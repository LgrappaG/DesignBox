import React, { useMemo, useState } from 'react';
import {
  Clock,
  FileCode2,
  FilePlus2,
  FolderClock,
  FolderOpen,
  History,
  LayoutTemplate,
  ShieldCheck,
  Sparkles,
} from 'lucide-react';
import { TEMPLATE_PRESETS, TemplatePreset } from '../../data/templates';
import { isToyhouseFreePlatform } from '../../engine/f2uShield';
import { RecentProjectEntry, SnapshotEntry } from '../../utils/tauriDesktop';

const TOYHOUSE_STARTER_SIZES: ReadonlyArray<{
  id: string;
  label: string;
  width: number;
  height: number;
  hint: string;
}> = [
  { id: 'char_profile', label: 'Character Profile', width: 800, height: 640, hint: 'Standard OC bio layout' },
  { id: 'bio_card', label: 'Compact Bio Card', width: 600, height: 420, hint: 'Minimal info & moodboard' },
  { id: 'folder_header', label: 'Folder Header', width: 820, height: 260, hint: 'Character folder banner' },
  { id: 'collage', label: 'Full Collage', width: 1000, height: 800, hint: 'Multi-widget freeform sheet' },
];

export interface TemplatesModalProps {
  open: boolean;
  recentProjects: RecentProjectEntry[];
  localSnapshots: SnapshotEntry[];
  onClose: () => void;
  onNewBlankCanvas: () => void;
  onNewBlankWithSize: (width: number, height: number, presetLabel?: string) => void;
  onApplyPreset: (preset: TemplatePreset) => void;
  onOpenHtmlImporter: () => void;
  onOpenProject: () => void;
  onOpenRecentProject: (path: string) => void;
  onRestoreSnapshot: (snapshotId: string) => void;
}

export const TemplatesModal: React.FC<TemplatesModalProps> = ({
  open,
  recentProjects,
  localSnapshots,
  onClose,
  onNewBlankCanvas,
  onNewBlankWithSize,
  onApplyPreset,
  onOpenHtmlImporter,
  onOpenProject,
  onOpenRecentProject,
  onRestoreSnapshot,
}) => {
  const [tierFilter, setTierFilter] = useState<'all' | 'f2u' | 'premium'>('all');

  const filteredPresets = useMemo(() => {
    if (tierFilter === 'all') return TEMPLATE_PRESETS;
    if (tierFilter === 'f2u') return TEMPLATE_PRESETS.filter((p) => isToyhouseFreePlatform(p.platform));
    return TEMPLATE_PRESETS.filter((p) => !isToyhouseFreePlatform(p.platform));
  }, [tierFilter]);

  if (!open) return null;

  return (
    <div
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
      className="fixed inset-0 z-[200] bg-black/75 flex items-center justify-center p-6"
    >
      <div
        style={{ backgroundColor: 'var(--bg-panel)', borderColor: 'var(--border-strong)' }}
        className="border rounded-[12px] max-w-4xl w-full overflow-hidden shadow-2xl flex flex-col max-h-[90vh]"
      >
        <div
          style={{ borderColor: 'var(--border-main)' }}
          className="px-4 py-3 border-b flex items-center justify-between shrink-0"
        >
          <div>
            <h3 className="text-xs font-bold uppercase tracking-wider flex items-center gap-1.5">
              <LayoutTemplate className="w-4 h-4" style={{ color: 'var(--accent)' }} />
              <span>Toyhouse Starter Hub</span>
            </h3>
            <p style={{ color: 'var(--text-muted)' }} className="text-[11px]">
              Start with a Toyhouse canvas preset, import existing HTML, open a file, or load a starter template.
            </p>
          </div>
          <button
            onClick={onClose}
            style={{
              backgroundColor: 'var(--bg-panel-alt)',
              borderColor: 'var(--border-strong)',
            }}
            className="px-2.5 py-1 rounded-[6px] border text-xs hover:opacity-85"
          >
            Close
          </button>
        </div>

        <div className="p-4 space-y-4 overflow-y-auto">
          {/* Quick Blank Canvas & File Actions */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-2.5">
            <button
              type="button"
              onClick={onNewBlankCanvas}
              style={{
                backgroundColor: 'var(--accent-soft)',
                borderColor: 'var(--accent)',
              }}
              className="p-3 rounded-[8px] border text-left hover:opacity-90 transition flex items-center justify-between gap-2"
            >
              <div>
                <div className="font-bold text-xs flex items-center gap-1.5">
                  <FilePlus2 className="w-4 h-4 shrink-0" style={{ color: 'var(--accent)' }} />
                  <span>New Blank Canvas</span>
                </div>
                <p style={{ color: 'var(--text-muted)' }} className="text-[10.5px] mt-0.5">
                  Default Studio dimensions
                </p>
              </div>
              <span style={{ color: 'var(--accent)' }} className="text-xs font-mono font-bold">
                →
              </span>
            </button>

            <button
              type="button"
              onClick={() => {
                onClose();
                onOpenHtmlImporter();
              }}
              style={{
                backgroundColor: 'var(--bg-input)',
                borderColor: 'var(--border-strong)',
              }}
              className="p-3 rounded-[8px] border text-left hover:border-[var(--accent)] transition flex items-center justify-between gap-2"
            >
              <div>
                <div className="font-bold text-xs flex items-center gap-1.5">
                  <FileCode2 className="w-4 h-4 shrink-0" style={{ color: 'var(--accent)' }} />
                  <span>Import Toyhouse HTML</span>
                </div>
                <p style={{ color: 'var(--text-muted)' }} className="text-[10.5px] mt-0.5">
                  Parse existing profile code
                </p>
              </div>
              <span style={{ color: 'var(--accent)' }} className="text-xs font-mono font-bold">
                →
              </span>
            </button>

            <button
              type="button"
              onClick={() => {
                onClose();
                onOpenProject();
              }}
              style={{
                backgroundColor: 'var(--bg-input)',
                borderColor: 'var(--border-strong)',
              }}
              className="p-3 rounded-[8px] border text-left hover:border-[var(--accent)] transition flex items-center justify-between gap-2"
            >
              <div>
                <div className="font-bold text-xs flex items-center gap-1.5">
                  <FolderOpen className="w-4 h-4 shrink-0" style={{ color: 'var(--accent)' }} />
                  <span>Open Project (.dbx.json)</span>
                </div>
                <p style={{ color: 'var(--text-muted)' }} className="text-[10.5px] mt-0.5">
                  Load saved workspace file
                </p>
              </div>
              <span style={{ color: 'var(--accent)' }} className="text-xs font-mono font-bold">
                Ctrl+O
              </span>
            </button>
          </div>

          {/* Toyhouse Blank Size Presets */}
          <div className="space-y-1.5">
            <div style={{ color: 'var(--text-muted)' }} className="text-[10px] font-mono uppercase tracking-wider font-semibold">
              Quick-Start Canvas Sizes
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
              {TOYHOUSE_STARTER_SIZES.map((preset) => (
                <button
                  key={preset.id}
                  type="button"
                  onClick={() => onNewBlankWithSize(preset.width, preset.height, preset.label)}
                  style={{
                    backgroundColor: 'var(--bg-panel-alt)',
                    borderColor: 'var(--border-main)',
                  }}
                  className="p-2.5 rounded-[7px] border text-left hover:border-[var(--accent)] transition space-y-0.5"
                >
                  <div className="text-[11px] font-bold truncate">{preset.label}</div>
                  <div style={{ color: 'var(--accent)' }} className="text-[10px] font-mono font-semibold">
                    {preset.width} × {preset.height}px
                  </div>
                  <div style={{ color: 'var(--text-muted)' }} className="text-[9.5px] truncate">
                    {preset.hint}
                  </div>
                </button>
              ))}
            </div>
          </div>

          {/* Curated Toyhouse Templates with F2U/Premium Filter */}
          <div className="space-y-2">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <span style={{ color: 'var(--text-muted)' }} className="text-[10px] font-mono uppercase tracking-wider font-semibold">
                Toyhouse Layout Templates ({filteredPresets.length})
              </span>
              <div
                style={{ backgroundColor: 'var(--bg-input)', borderColor: 'var(--border-main)' }}
                className="flex items-center p-0.5 rounded-[6px] border text-[10px]"
              >
                {(
                  [
                    { id: 'all', label: 'All' },
                    { id: 'f2u', label: 'F2U Safe' },
                    { id: 'premium', label: 'Premium' },
                  ] as const
                ).map((f) => (
                  <button
                    key={f.id}
                    type="button"
                    onClick={() => setTierFilter(f.id)}
                    style={
                      tierFilter === f.id
                        ? { backgroundColor: 'var(--accent)', color: '#fff' }
                        : { color: 'var(--text-muted)' }
                    }
                    className="px-2 py-0.5 rounded-[4px] font-semibold transition"
                  >
                    {f.label}
                  </button>
                ))}
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {filteredPresets.map((preset) => {
                const isF2U = isToyhouseFreePlatform(preset.platform);
                return (
                  <div
                    key={preset.id}
                    onClick={() => onApplyPreset(preset)}
                    style={{
                      backgroundColor: 'var(--bg-input)',
                      borderColor: 'var(--border-strong)',
                    }}
                    className="p-3.5 rounded-[8px] border hover:border-[var(--accent)] cursor-pointer transition flex flex-col justify-between"
                  >
                    <div>
                      <div className="flex items-center justify-between gap-2 mb-1">
                        <span className="font-bold text-xs truncate">{preset.name}</span>
                        <span
                          className={`inline-flex items-center gap-1 px-1.5 py-[1px] rounded font-mono text-[9.5px] font-bold shrink-0 ${
                            isF2U
                              ? 'bg-emerald-500/15 text-emerald-500 border border-emerald-500/30'
                              : 'bg-amber-500/15 text-amber-500 border border-amber-500/30'
                          }`}
                        >
                          {isF2U ? <ShieldCheck className="w-2.5 h-2.5" /> : <Sparkles className="w-2.5 h-2.5" />}
                          {isF2U ? 'F2U Safe' : 'Premium'}
                        </span>
                      </div>
                      <p
                        style={{ color: 'var(--text-muted)' }}
                        className="text-[11px] leading-relaxed"
                      >
                        {preset.description}
                      </p>
                    </div>
                    <div className="mt-3 pt-2 border-t border-stone-500/20 flex items-center justify-between">
                      <div className="flex gap-1">
                        {preset.swatches.map((c) => (
                          <span
                            key={c}
                            style={{ backgroundColor: c }}
                            className="w-3.5 h-3.5 rounded-[3px] border border-white/20"
                          />
                        ))}
                      </div>
                      <span style={{ color: 'var(--accent)' }} className="text-[11px] font-mono">
                        Load Preset →
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {(recentProjects.length > 0 || localSnapshots.length > 0) && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 pt-1">
              {recentProjects.length > 0 && (
                <div
                  style={{
                    backgroundColor: 'var(--bg-panel-alt)',
                    borderColor: 'var(--border-main)',
                  }}
                  className="p-3 rounded-[8px] border space-y-1.5"
                >
                  <div className="text-[10px] font-bold uppercase tracking-wider flex items-center gap-1.5">
                    <FolderClock className="w-3.5 h-3.5" style={{ color: 'var(--accent)' }} />
                    <span>Recent Native Projects</span>
                  </div>
                  <div className="space-y-1 max-h-32 overflow-y-auto">
                    {recentProjects.slice(0, 6).map((rp) => (
                      <button
                        key={rp.path}
                        type="button"
                        disabled={!rp.exists}
                        onClick={() => {
                          onOpenRecentProject(rp.path);
                          onClose();
                        }}
                        style={{
                          backgroundColor: 'var(--bg-input)',
                          borderColor: 'var(--border-strong)',
                        }}
                        className="w-full text-left px-2 py-1.5 rounded-[5px] border text-[11px] flex items-center justify-between gap-2 hover:border-[var(--accent)] disabled:opacity-45"
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
                <div
                  style={{
                    backgroundColor: 'var(--bg-panel-alt)',
                    borderColor: 'var(--border-main)',
                  }}
                  className="p-3 rounded-[8px] border space-y-1.5"
                >
                  <div className="text-[10px] font-bold uppercase tracking-wider flex items-center gap-1.5">
                    <History className="w-3.5 h-3.5" style={{ color: 'var(--accent)' }} />
                    <span>Local Recovery Snapshots</span>
                  </div>
                  <div className="space-y-1 max-h-32 overflow-y-auto">
                    {localSnapshots.slice(0, 6).map((snap) => (
                      <button
                        key={snap.id}
                        type="button"
                        onClick={() => {
                          onRestoreSnapshot(snap.id);
                          onClose();
                        }}
                        style={{
                          backgroundColor: 'var(--bg-input)',
                          borderColor: 'var(--border-strong)',
                        }}
                        className="w-full text-left px-2 py-1.5 rounded-[5px] border text-[11px] flex items-center justify-between gap-2 hover:border-[var(--accent)]"
                      >
                        <span className="truncate font-medium flex items-center gap-1">
                          <Clock className="w-3 h-3 opacity-60 shrink-0" />
                          {snap.projectName}
                        </span>
                        <span style={{ color: 'var(--text-muted)' }} className="text-[9px] font-mono shrink-0">
                          {new Date(snap.createdAtMs).toLocaleTimeString()} ·{' '}
                          {Math.max(1, Math.round(snap.byteSize / 1024))}KB
                        </span>
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
