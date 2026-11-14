import React from 'react';
import { Clock, FilePlus2, FolderClock, History } from 'lucide-react';
import { TEMPLATE_PRESETS, TemplatePreset } from '../../data/templates';
import { RecentProjectEntry, SnapshotEntry } from '../../utils/tauriDesktop';

export interface TemplatesModalProps {
  open: boolean;
  recentProjects: RecentProjectEntry[];
  localSnapshots: SnapshotEntry[];
  onClose: () => void;
  onNewBlankCanvas: () => void;
  onApplyPreset: (preset: TemplatePreset) => void;
  onOpenRecentProject: (path: string) => void;
  onRestoreSnapshot: (snapshotId: string) => void;
}

export const TemplatesModal: React.FC<TemplatesModalProps> = ({
  open,
  recentProjects,
  localSnapshots,
  onClose,
  onNewBlankCanvas,
  onApplyPreset,
  onOpenRecentProject,
  onRestoreSnapshot,
}) => {
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
        className="border rounded-[12px] max-w-3xl w-full overflow-hidden shadow-2xl flex flex-col max-h-[90vh]"
      >
        <div
          style={{ borderColor: 'var(--border-main)' }}
          className="px-4 py-3 border-b flex items-center justify-between shrink-0"
        >
          <div>
            <h3 className="text-xs font-bold uppercase tracking-wider">
              Start Blank, Open Recent, or Load a Layout Preset
            </h3>
            <p style={{ color: 'var(--text-muted)' }} className="text-[11px]">
              Start from a clean page, recover a local snapshot, or load a community template for
              Toyhouse & Carrd Pro
            </p>
          </div>
          <button
            onClick={onClose}
            style={{
              backgroundColor: 'var(--bg-panel-alt)',
              borderColor: 'var(--border-strong)',
            }}
            className="px-2.5 py-1 rounded-[6px] border text-xs"
          >
            Close
          </button>
        </div>

        <div className="p-4 space-y-3 overflow-y-auto">
          <div
            onClick={onNewBlankCanvas}
            style={{
              backgroundColor: 'var(--accent-soft)',
              borderColor: 'var(--accent)',
            }}
            className="p-3.5 rounded-[8px] border cursor-pointer hover:opacity-90 transition flex items-center justify-between"
          >
            <div>
              <div className="font-bold text-xs flex items-center gap-1.5">
                <FilePlus2 className="w-4 h-4" style={{ color: 'var(--accent)' }} />
                <span>Blank Page (Empty Canvas)</span>
              </div>
              <p style={{ color: 'var(--text-muted)' }} className="text-[11px] mt-0.5">
                Clear all layers and start designing from scratch on a clean Paper or Carbon canvas.
              </p>
            </div>
            <span
              style={{ backgroundColor: 'var(--accent)', color: '#fff' }}
              className="px-3 py-1 rounded-[6px] text-[11px] font-mono font-bold shrink-0"
            >
              Start Blank →
            </span>
          </div>

          <div className="grid grid-cols-2 gap-3">
            {TEMPLATE_PRESETS.map((preset) => (
              <div
                key={preset.id}
                onClick={() => onApplyPreset(preset)}
                style={{
                  backgroundColor: 'var(--bg-input)',
                  borderColor: 'var(--border-strong)',
                }}
                className="p-3.5 rounded-[8px] border hover:border-amber-600 cursor-pointer transition flex flex-col justify-between"
              >
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <span className="font-bold text-xs">{preset.name}</span>
                    <span
                      style={{ color: 'var(--accent)' }}
                      className="text-[10px] font-mono uppercase"
                    >
                      {preset.category}
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
            ))}
          </div>

          {(recentProjects.length > 0 || localSnapshots.length > 0) && (
            <div className="grid grid-cols-2 gap-3 pt-1">
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
                        className="w-full text-left px-2 py-1.5 rounded-[5px] border text-[11px] flex items-center justify-between gap-2 hover:border-amber-600 disabled:opacity-45"
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
                        className="w-full text-left px-2 py-1.5 rounded-[5px] border text-[11px] flex items-center justify-between gap-2 hover:border-amber-600"
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

