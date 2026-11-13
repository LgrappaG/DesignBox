import React from 'react';
import { ShieldCheck } from 'lucide-react';
import { LayoutMode, PreviewSurface, PreviewViewport, TargetPlatform } from '../../types/schema';
import { isToyhouseFreePlatform } from '../../engine/f2uShield';

export interface LivePreviewModalProps {
  open: boolean;
  platform: TargetPlatform;
  layoutMode: LayoutMode;
  canvasWidth: number;
  canvasHeight: number;
  previewSurface: PreviewSurface;
  previewViewport: PreviewViewport;
  previewSrcDoc: string;
  toyhouseShell: boolean;
  onToggleToyhouseShell: () => void;
  onChangeSurface: (surface: PreviewSurface) => void;
  onChangeViewport: (viewport: PreviewViewport) => void;
  onClose: () => void;
}

export const LivePreviewModal: React.FC<LivePreviewModalProps> = ({
  open,
  platform,
  layoutMode,
  canvasWidth,
  canvasHeight,
  previewSurface,
  previewViewport,
  previewSrcDoc,
  toyhouseShell,
  onToggleToyhouseShell,
  onChangeSurface,
  onChangeViewport,
  onClose,
}) => {
  if (!open) return null;

  const isTh = platform.startsWith('toyhouse');
  const isF2U = isToyhouseFreePlatform(platform);

  const iframeWidth =
    previewViewport === 'mobile'
      ? 375
      : previewViewport === 'th_col'
      ? Math.max(780, Math.min(920, canvasWidth + 40))
      : previewViewport === 'th_desktop'
      ? Math.max(1060, canvasWidth + 260)
      : '100%';

  return (
    <div className="fixed inset-0 z-50 bg-black/80 flex items-center justify-center p-4">
      <div
        style={{ backgroundColor: 'var(--bg-panel)', borderColor: 'var(--border-strong)' }}
        className="border rounded-[12px] w-[96vw] max-w-[1400px] h-[92vh] overflow-hidden shadow-2xl flex flex-col"
      >
        <div
          style={{ borderColor: 'var(--border-main)' }}
          className="px-4 py-2.5 border-b flex flex-wrap items-center justify-between gap-2.5 shrink-0"
        >
          <div className="flex items-center gap-2.5 flex-wrap">
            <h3 className="text-xs font-bold uppercase tracking-wider">
              Output Sandbox — {platform} ({layoutMode}) · {canvasWidth}×{canvasHeight}px
            </h3>
            {isF2U && (
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-mono font-semibold bg-emerald-500/15 text-emerald-500 border border-emerald-500/30">
                <ShieldCheck className="w-3 h-3" />
                <span>F2U Shield Active · Zero &lt;style&gt;</span>
              </span>
            )}
          </div>

          <div className="flex flex-wrap items-center gap-2">
            {isTh && (
              <button
                type="button"
                onClick={onToggleToyhouseShell}
                style={
                  toyhouseShell
                    ? { backgroundColor: 'var(--accent)', color: '#fff', borderColor: 'var(--accent)' }
                    : { backgroundColor: 'var(--bg-panel-alt)', borderColor: 'var(--border-main)', color: 'var(--text-muted)' }
                }
                className="px-2 py-1 rounded-[6px] border text-[11px] font-medium transition"
                title="Simulate authentic Toyhouse header bar and collapsible character sidebar"
              >
                TH Shell: {toyhouseShell ? 'ON' : 'OFF'}
              </button>
            )}

            <div
              style={{ backgroundColor: 'var(--bg-panel-alt)', borderColor: 'var(--border-main)' }}
              className="flex items-center rounded-[6px] border p-0.5 text-[11px]"
            >
              {(
                [
                  { id: 'th_dark', label: 'TH Night' },
                  { id: 'th_light', label: 'TH Light' },
                  { id: 'th_pink', label: 'TH Pink' },
                  { id: 'th_teal', label: 'TH Teal' },
                  { id: 'paper', label: 'Paper' },
                ] as const
              ).map((s) => (
                <button
                  key={s.id}
                  onClick={() => onChangeSurface(s.id)}
                  style={
                    previewSurface === s.id
                      ? { backgroundColor: 'var(--accent)', color: '#fff' }
                      : { color: 'var(--text-muted)' }
                  }
                  className="px-2 py-0.5 rounded-[4px] font-medium transition"
                >
                  {s.label}
                </button>
              ))}
            </div>

            <div
              style={{ backgroundColor: 'var(--bg-panel-alt)', borderColor: 'var(--border-main)' }}
              className="flex items-center rounded-[6px] border p-0.5 text-[11px]"
            >
              {(
                [
                  { id: 'full', label: 'Full' },
                  { id: 'th_desktop', label: 'TH Desktop (1060px)' },
                  { id: 'th_col', label: `TH Col (${Math.max(780, Math.min(920, canvasWidth + 40))}px)` },
                  { id: 'mobile', label: 'Mobile (375px)' },
                ] as const
              ).map((v) => (
                <button
                  key={v.id}
                  onClick={() => onChangeViewport(v.id)}
                  style={
                    previewViewport === v.id
                      ? { backgroundColor: 'var(--accent)', color: '#fff' }
                      : { color: 'var(--text-muted)' }
                  }
                  className="px-2 py-0.5 rounded-[4px] font-medium transition"
                >
                  {v.label}
                </button>
              ))}
            </div>

            <button
              onClick={onClose}
              style={{
                backgroundColor: 'var(--bg-panel-alt)',
                borderColor: 'var(--border-strong)',
              }}
              className="px-2.5 py-1 rounded-[6px] border text-xs font-medium hover:opacity-85"
            >
              Close Preview
            </button>
          </div>
        </div>

        <div
          style={{ backgroundColor: 'var(--bg-canvas-well)' }}
          className="p-4 overflow-auto flex-1 flex justify-center"
        >
          <div
            style={{
              width: iframeWidth,
              maxWidth: '100%',
              borderColor: 'var(--border-strong)',
            }}
            className="h-full border rounded-[10px] overflow-hidden shadow-lg bg-black/20 transition-all duration-200"
          >
            <iframe
              title="Output Sandbox Preview"
              srcDoc={previewSrcDoc}
              sandbox="allow-same-origin allow-popups allow-scripts"
              className="w-full h-full border-0 block"
            />
          </div>
        </div>
      </div>
    </div>
  );
};
