import React, { useMemo, useState } from 'react';
import { AlertTriangle, Columns2, ShieldCheck } from 'lucide-react';
import {
  DesignElement,
  LayoutMode,
  PreviewSurface,
  PreviewViewport,
  TargetPlatform,
} from '../../types/schema';
import { isToyhouseFreePlatform } from '../../engine/f2uShield';
import { auditElementsAcrossToyhouseThemes } from '../../utils/colorMath';

export interface LivePreviewModalProps {
  open: boolean;
  platform: TargetPlatform;
  layoutMode: LayoutMode;
  canvasWidth: number;
  canvasHeight: number;
  elements: DesignElement[];
  canvasBg: string;
  cuteThemeBg: string;
  previewSurface: PreviewSurface;
  previewViewport: PreviewViewport;
  previewSrcDoc: string;
  compareNightSrcDoc: string;
  compareLightSrcDoc: string;
  toyhouseShell: boolean;
  onToggleToyhouseShell: () => void;
  onChangeSurface: (surface: PreviewSurface) => void;
  onChangeViewport: (viewport: PreviewViewport) => void;
  onClose: () => void;
  onExportHtml: () => void;
}

export const LivePreviewModal: React.FC<LivePreviewModalProps> = ({
  open,
  platform,
  layoutMode,
  canvasWidth,
  canvasHeight,
  elements,
  canvasBg,
  cuteThemeBg,
  previewSurface,
  previewViewport,
  previewSrcDoc,
  compareNightSrcDoc,
  compareLightSrcDoc,
  toyhouseShell,
  onToggleToyhouseShell,
  onChangeSurface,
  onChangeViewport,
  onClose,
  onExportHtml,
}) => {
  const [splitCompare, setSplitCompare] = useState(false);

  const stressAudit = useMemo(() => {
    if (!open) return [];
    return auditElementsAcrossToyhouseThemes(elements, canvasBg, cuteThemeBg);
  }, [open, elements, canvasBg, cuteThemeBg]);

  if (!open) return null;

  const isTh = platform.startsWith('toyhouse');
  const isF2U = isToyhouseFreePlatform(platform);
  const platformLabel = isF2U ? 'Toyhouse F2U' : 'Toyhouse Premium';

  const iframeWidth =
    previewViewport === 'mobile'
      ? 375
      : previewViewport === 'th_col'
      ? Math.max(780, Math.min(920, canvasWidth + 40))
      : previewViewport === 'th_desktop'
      ? Math.max(1060, canvasWidth + 260)
      : '100%';

  return (
    <div
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
      className="fixed inset-0 z-[200] bg-black/80 flex items-center justify-center p-4"
    >
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
              Output Sandbox — {platformLabel} ({layoutMode}) · {canvasWidth}×{canvasHeight}px
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

            <button
              type="button"
              onClick={() => setSplitCompare((v) => !v)}
              style={
                splitCompare
                  ? { backgroundColor: 'var(--accent)', color: '#fff', borderColor: 'var(--accent)' }
                  : { backgroundColor: 'var(--bg-panel-alt)', borderColor: 'var(--border-main)', color: 'var(--text-muted)' }
              }
              className="px-2 py-1 rounded-[6px] border text-[11px] font-medium transition flex items-center gap-1"
              title="Compare TH Night and TH Light themes side by side"
            >
              <Columns2 className="w-3 h-3" />
              <span>Night vs Light</span>
            </button>

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
                  { id: 'th_cute', label: 'TH Cute ♡' },
                  { id: 'paper', label: 'Paper' },
                ] as const
              ).map((s) => (
                <button
                  key={s.id}
                  onClick={() => {
                    setSplitCompare(false);
                    onChangeSurface(s.id);
                  }}
                  style={
                    !splitCompare && previewSurface === s.id
                      ? { backgroundColor: 'var(--accent)', color: '#fff' }
                      : { color: 'var(--text-muted)' }
                  }
                  className="px-2 py-0.5 rounded-[4px] font-medium transition"
                >
                  {s.label}
                </button>
              ))}
            </div>

            {!splitCompare && (
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
            )}

            <button
              type="button"
              onClick={onExportHtml}
              className="px-2.5 py-1 rounded-[5px] text-[11px] font-semibold bg-emerald-600 text-white hover:bg-emerald-500 transition"
              title="Save exported standalone .html file"
            >
              Save .HTML
            </button>
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

        {/* Toyhouse 5-Theme Contrast Stress-Test Strip */}
        <div
          style={{ backgroundColor: 'var(--bg-panel-alt)', borderColor: 'var(--border-main)' }}
          className="px-4 py-1.5 border-b flex flex-wrap items-center justify-between gap-2 text-[10.5px] shrink-0"
        >
          <span style={{ color: 'var(--text-muted)' }} className="font-mono text-[10px] font-semibold uppercase tracking-wider">
            Theme Contrast Stress-Test:
          </span>
          <div className="flex flex-wrap items-center gap-1.5">
            {stressAudit.map((audit) => {
              const failCount = audit.failingElements.length;
              const isSelected = !splitCompare && previewSurface === audit.surfaceId;
              const tooltipText =
                failCount === 0
                  ? `${audit.label}: all ${audit.checkedCount} text layers pass WCAG AA (min ${audit.minRatio !== null ? `${audit.minRatio.toFixed(1)}:1` : 'n/a'})`
                  : `${audit.label}: ${failCount} low-contrast layer(s): ${audit.failingElements
                      .slice(0, 4)
                      .map((f) => `${f.label} (${f.ratio.toFixed(1)}:1)`)
                      .join(', ')}`;
              return (
                <button
                  key={audit.surfaceId}
                  type="button"
                  onClick={() => {
                    setSplitCompare(false);
                    onChangeSurface(audit.surfaceId);
                  }}
                  title={tooltipText}
                  className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full border font-mono text-[10px] transition ${
                    failCount > 0
                      ? 'bg-amber-500/15 border-amber-500/40 text-amber-600 dark:text-amber-300'
                      : 'bg-emerald-500/10 border-emerald-500/30 text-emerald-600 dark:text-emerald-300'
                  } ${isSelected ? 'ring-2 ring-[var(--accent)]' : ''}`}
                >
                  <span
                    className="w-2.5 h-2.5 rounded-full border border-black/25 shrink-0"
                    style={{ backgroundColor: audit.bgHex }}
                  />
                  <span className="font-semibold">{audit.label}</span>
                  {failCount > 0 ? (
                    <span className="inline-flex items-center gap-0.5 font-bold">
                      <AlertTriangle className="w-2.5 h-2.5" />
                      {failCount} low
                    </span>
                  ) : (
                    <span>OK</span>
                  )}
                </button>
              );
            })}
          </div>
        </div>

        <div
          style={{ backgroundColor: 'var(--bg-canvas-well)' }}
          className="p-4 overflow-auto flex-1 flex justify-center"
        >
          {splitCompare ? (
            <div className="w-full h-full grid grid-cols-1 lg:grid-cols-2 gap-3">
              <div
                style={{ borderColor: 'var(--border-strong)' }}
                className="h-full border rounded-[10px] overflow-hidden shadow-lg bg-black/20 flex flex-col"
              >
                <div
                  style={{ backgroundColor: 'var(--bg-panel)', borderColor: 'var(--border-main)' }}
                  className="px-3 py-1 border-b text-[10px] font-mono font-bold uppercase tracking-wider shrink-0"
                >
                  Toyhouse Night (#16141C)
                </div>
                <iframe
                  title="Toyhouse Night Stress-Test Preview"
                  srcDoc={compareNightSrcDoc}
                  sandbox="allow-scripts allow-popups"
                  className="w-full flex-1 border-0 block"
                />
              </div>
              <div
                style={{ borderColor: 'var(--border-strong)' }}
                className="h-full border rounded-[10px] overflow-hidden shadow-lg bg-white flex flex-col"
              >
                <div
                  style={{ backgroundColor: 'var(--bg-panel)', borderColor: 'var(--border-main)' }}
                  className="px-3 py-1 border-b text-[10px] font-mono font-bold uppercase tracking-wider shrink-0"
                >
                  Toyhouse Light (#F4F5F7)
                </div>
                <iframe
                  title="Toyhouse Light Stress-Test Preview"
                  srcDoc={compareLightSrcDoc}
                  sandbox="allow-scripts allow-popups"
                  className="w-full flex-1 border-0 block"
                />
              </div>
            </div>
          ) : (
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
                sandbox="allow-scripts allow-popups"
                className="w-full h-full border-0 block"
              />
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
