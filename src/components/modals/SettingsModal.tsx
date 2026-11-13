import React from 'react';
import { History, Save } from 'lucide-react';
import { isTauriRuntime, SnapshotEntry } from '../../utils/tauriDesktop';

export interface SettingsModalProps {
  open: boolean;
  imgbbApiKey: string;
  localSnapshots: SnapshotEntry[];
  lastSnapshotAt: number | null;
  onChangeImgbbKey: (value: string) => void;
  onCreateSnapshot: () => void;
  onRestoreSnapshot: (snapshotId: string) => void;
  onClose: () => void;
}

export const SettingsModal: React.FC<SettingsModalProps> = ({
  open,
  imgbbApiKey,
  localSnapshots,
  lastSnapshotAt,
  onChangeImgbbKey,
  onCreateSnapshot,
  onRestoreSnapshot,
  onClose,
}) => {
  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 bg-black/75 flex items-center justify-center p-6">
      <div
        style={{ backgroundColor: 'var(--bg-panel)', borderColor: 'var(--border-strong)' }}
        className="border rounded-[10px] max-w-lg w-full overflow-hidden shadow-2xl"
      >
        <div
          style={{ borderColor: 'var(--border-main)' }}
          className="px-4 py-3 border-b flex items-center justify-between"
        >
          <h3 className="text-xs font-bold uppercase tracking-wider">
            Image Auto-Hosting & Studio Preferences
          </h3>
          <button
            onClick={onClose}
            style={{
              backgroundColor: 'var(--bg-panel-alt)',
              borderColor: 'var(--border-strong)',
            }}
            className="px-2.5 py-1 rounded-[6px] border text-xs"
          >
            Done
          </button>
        </div>

        <div className="p-4 space-y-4 text-xs">
          <div className="space-y-2">
            <p style={{ color: 'var(--text-muted)' }} className="leading-relaxed">
              Toyhouse and Carrd require external HTTPS image links. Add a free API key from{' '}
              <span className="font-mono underline">api.imgbb.com</span> so DesignBox uploads
              selected files automatically. Without a key, local files are embedded offline as
              persistent Base64 DataURLs instead of temporary blobs.
            </p>
            <label className="block space-y-1">
              <span className="font-semibold block">ImgBB API Key (Stored locally)</span>
              <input
                type="password"
                placeholder="Paste ImgBB API key..."
                value={imgbbApiKey}
                onChange={(e) => onChangeImgbbKey(e.target.value)}
                style={{
                  backgroundColor: 'var(--bg-input)',
                  borderColor: 'var(--border-strong)',
                }}
                className="w-full border rounded-[6px] px-2.5 py-1.5 font-mono"
              />
            </label>
          </div>

          <div
            style={{
              backgroundColor: 'var(--bg-panel-alt)',
              borderColor: 'var(--border-main)',
            }}
            className="p-3 rounded-[8px] border space-y-2"
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-1.5 font-semibold text-[11px]">
                <History className="w-3.5 h-3.5" style={{ color: 'var(--accent)' }} />
                <span>
                  {isTauriRuntime()
                    ? 'Native AppData Recovery Snapshots'
                    : 'Local Browser Recovery Snapshots'}
                </span>
              </div>
              <button
                type="button"
                onClick={onCreateSnapshot}
                style={{ backgroundColor: 'var(--accent)', color: '#fff' }}
                className="px-2 py-1 rounded-[5px] text-[10px] font-semibold flex items-center gap-1"
              >
                <Save className="w-3 h-3" />
                <span>Snapshot Now</span>
              </button>
            </div>
            <p style={{ color: 'var(--text-muted)' }} className="text-[10px]">
              Auto-snapshots run every 60 seconds when changes are pending.
              {lastSnapshotAt
                ? ` Last captured at ${new Date(lastSnapshotAt).toLocaleTimeString()}.`
                : ''}
            </p>
            {localSnapshots.length > 0 && (
              <div className="space-y-1 max-h-36 overflow-y-auto pt-1">
                {localSnapshots.map((snap) => (
                  <div
                    key={snap.id}
                    style={{
                      backgroundColor: 'var(--bg-input)',
                      borderColor: 'var(--border-strong)',
                    }}
                    className="flex items-center justify-between px-2 py-1 rounded-[5px] border text-[10px]"
                  >
                    <span className="truncate font-mono">
                      {snap.projectName} · {new Date(snap.createdAtMs).toLocaleTimeString()} (
                      {Math.max(1, Math.round(snap.byteSize / 1024))} KB)
                    </span>
                    <button
                      type="button"
                      onClick={() => {
                        onRestoreSnapshot(snap.id);
                        onClose();
                      }}
                      style={{ color: 'var(--accent)' }}
                      className="font-semibold hover:underline ml-2 shrink-0"
                    >
                      Restore
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

