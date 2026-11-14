import React from 'react';
import {
  AlertTriangle,
  Check,
  Code2,
  Copy,
  Eye,
  Info,
  X,
} from 'lucide-react';
import { PreviewSurface, PreviewViewport, TargetPlatform } from '../types/schema';

interface ExportWarning {
  severity: 'error' | 'warning' | 'info';
  code: string;
  message: string;
  suggestion: string;
}

interface BottomDockProps {
  height: number;
  activeTab: 'code' | 'preview';
  onTabChange: (tab: 'code' | 'preview') => void;
  onClose: () => void;
  onStartResize: (e: React.PointerEvent) => void;
  onResetHeight: () => void;
  platform: TargetPlatform;
  onPlatformChange: (p: TargetPlatform) => void;
  htmlOutput: string;
  warnings: ExportWarning[];
  copied: boolean;
  onCopyCode: () => void;
  previewSrcDoc: string;
  previewSurface: PreviewSurface;
  onPreviewSurfaceChange: (s: PreviewSurface) => void;
  previewViewport: PreviewViewport;
  onPreviewViewportChange: (v: PreviewViewport) => void;
  isDraggingGlobal: boolean;
}

export const BottomDock: React.FC<BottomDockProps> = ({
  height,
  activeTab,
  onTabChange,
  onClose,
  onStartResize,
  onResetHeight,
  platform,
  onPlatformChange,
  htmlOutput,
  warnings,
  copied,
  onCopyCode,
  previewSrcDoc,
  previewSurface,
  onPreviewSurfaceChange,
  previewViewport,
  onPreviewViewportChange,
  isDraggingGlobal,
}) => {
  return (
    <section
      style={{
        height,
        backgroundColor: 'var(--bg-panel)',
        borderColor: 'var(--border-main)',
      }}
      className="border-t flex flex-col shrink-0 select-none relative z-20"
    >
      {/* Top Row-Resize Splitter Bar */}
      <div
        onPointerDown={onStartResize}
        onDoubleClick={onResetHeight}
        title="Drag up/down to resize Bottom Dock • Double-click to reset height"
        className="h-1.5 w-full cursor-row-resize flex items-center justify-center group hover:bg-amber-500/20 transition shrink-0"
      >
        <div
          style={{ backgroundColor: 'var(--border-strong)' }}
          className="w-12 h-0.5 rounded-full group-hover:bg-amber-500 transition"
        />
      </div>

      {/* Bottom Dock Toolbar */}
      <div
        style={{ borderColor: 'var(--border-main)', backgroundColor: 'var(--bg-panel-alt)' }}
        className="min-h-8 py-1 border-b px-2.5 flex flex-wrap items-center justify-between gap-1.5 shrink-0 text-[11px]"
      >
        <div className="flex items-center flex-wrap gap-1.5 min-w-0">
          <button
            type="button"
            onClick={() => onTabChange('code')}
            style={
              activeTab === 'code'
                ? {
                    backgroundColor: 'var(--bg-panel)',
                    color: 'var(--accent)',
                    borderColor: 'var(--accent)',
                  }
                : { color: 'var(--text-muted)', borderColor: 'transparent' }
            }
            className="flex items-center gap-1.5 px-2.5 py-1 rounded-[5px] border font-semibold transition"
          >
            <Code2 className="w-3.5 h-3.5 shrink-0" />
            <span className="truncate">HTML &amp; Validator</span>
            {warnings.length > 0 && (
              <span className="px-1 rounded text-[9px] font-mono bg-amber-500/15 text-amber-500">
                {warnings.length}
              </span>
            )}
          </button>

          <button
            type="button"
            onClick={() => onTabChange('preview')}
            style={
              activeTab === 'preview'
                ? {
                    backgroundColor: 'var(--bg-panel)',
                    color: 'var(--accent)',
                    borderColor: 'var(--accent)',
                  }
                : { color: 'var(--text-muted)', borderColor: 'transparent' }
            }
            className="flex items-center gap-1.5 px-2.5 py-1 rounded-[5px] border font-semibold transition"
          >
            <Eye className="w-3.5 h-3.5 shrink-0" />
            <span className="truncate">Live Preview</span>
          </button>
        </div>

        <div className="flex items-center flex-wrap gap-1.5 min-w-0">
          {activeTab === 'code' ? (
            <div className="flex items-center flex-wrap gap-1 text-[10px]">
              <button
                type="button"
                onClick={() => onPlatformChange('toyhouse_free')}
                style={
                  platform === 'toyhouse_free' || platform === 'toyhouse_oc'
                    ? { backgroundColor: 'var(--accent)', color: '#fff' }
                    : { backgroundColor: 'var(--bg-panel)', color: 'var(--text-muted)' }
                }
                className="px-2 py-0.5 rounded-[4px] font-medium transition"
              >
                Toyhouse F2U
              </button>
              <button
                type="button"
                onClick={() => onPlatformChange('toyhouse_premium')}
                style={
                  platform === 'toyhouse_premium'
                    ? { backgroundColor: 'var(--accent)', color: '#fff' }
                    : { backgroundColor: 'var(--bg-panel)', color: 'var(--text-muted)' }
                }
                className="px-2 py-0.5 rounded-[4px] font-medium transition"
              >
                Premium
              </button>
              <button
                type="button"
                onClick={onCopyCode}
                style={{ backgroundColor: 'var(--accent)', color: '#fff' }}
                className="ml-1 flex items-center gap-1 px-2.5 py-0.5 rounded-[4px] font-semibold hover:opacity-90"
              >
                {copied ? <Check className="w-3 h-3" /> : <Copy className="w-3 h-3" />}
                <span>{copied ? 'Copied!' : 'Copy HTML'}</span>
              </button>
            </div>
          ) : (
            <div className="flex items-center flex-wrap gap-1.5 text-[10px]">
              <div
                style={{ backgroundColor: 'var(--bg-input)', borderColor: 'var(--border-main)' }}
                className="flex items-center flex-wrap border rounded-[5px] p-0.5"
              >
                {(
                  [
                    { id: 'th_dark', label: 'Night' },
                    { id: 'th_light', label: 'Light' },
                    { id: 'th_pink', label: 'Pink' },
                    { id: 'th_teal', label: 'Teal' },
                    { id: 'th_cute', label: 'Cute ♡' },
                    { id: 'paper', label: 'Paper' },
                  ] as const
                ).map((s) => (
                  <button
                    key={s.id}
                    type="button"
                    onClick={() => onPreviewSurfaceChange(s.id)}
                    style={
                      previewSurface === s.id
                        ? { backgroundColor: 'var(--accent)', color: '#fff' }
                        : { color: 'var(--text-muted)' }
                    }
                    className="px-1.5 py-0.5 rounded-[3px] font-medium"
                  >
                    {s.label}
                  </button>
                ))}
              </div>
              <div
                style={{ backgroundColor: 'var(--bg-input)', borderColor: 'var(--border-main)' }}
                className="flex items-center flex-wrap border rounded-[5px] p-0.5"
              >
                {(
                  [
                    { id: 'full', label: 'Full' },
                    { id: 'th_desktop', label: '1060px' },
                    { id: 'th_col', label: '780px' },
                    { id: 'mobile', label: '375px' },
                  ] as const
                ).map((v) => (
                  <button
                    key={v.id}
                    type="button"
                    onClick={() => onPreviewViewportChange(v.id)}
                    style={
                      previewViewport === v.id
                        ? { backgroundColor: 'var(--accent)', color: '#fff' }
                        : { color: 'var(--text-muted)' }
                    }
                    className="px-1.5 py-0.5 rounded-[3px] font-medium"
                  >
                    {v.label}
                  </button>
                ))}
              </div>
            </div>
          )}

          <button
            type="button"
            onClick={onClose}
            style={{ color: 'var(--text-muted)' }}
            className="p-1 rounded hover:bg-black/10 dark:hover:bg-white/10 transition"
            title="Close Bottom Dock"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* Bottom Dock Body */}
      <div className="flex-1 overflow-hidden flex min-h-0">
        {activeTab === 'code' ? (
          <div className="flex-1 grid grid-cols-1 lg:grid-cols-12 gap-2.5 p-2.5 overflow-hidden text-xs min-h-0">
            <div className="lg:col-span-4 overflow-y-auto pr-1 space-y-1.5 min-h-0 max-h-36 lg:max-h-none">
              <div className="font-semibold text-[11px] flex items-center justify-between">
                <span>Platform Sanitizer Check</span>
                <span style={{ color: 'var(--text-muted)' }} className="font-mono text-[10px]">
                  {platform}
                </span>
              </div>
              {warnings.length === 0 ? (
                <div className="p-2 rounded-[6px] bg-emerald-500/10 border border-emerald-500/30 text-emerald-600 text-[11px]">
                  100% compliant with Toyhouse & Carrd HTML/CSS sanitizer.
                </div>
              ) : (
                warnings.map((w, i) => (
                  <div
                    key={i}
                    className={`p-2 rounded-[6px] border text-[10.5px] space-y-0.5 ${
                      w.severity === 'error'
                        ? 'bg-red-500/10 border-red-500/30 text-red-500'
                        : w.severity === 'warning'
                        ? 'bg-amber-500/10 border-amber-500/30 text-amber-600'
                        : 'bg-stone-500/10 border-stone-500/30'
                    }`}
                  >
                    <div className="font-mono font-bold flex items-center gap-1">
                      {w.severity === 'info' ? (
                        <Info className="w-3 h-3 shrink-0" />
                      ) : (
                        <AlertTriangle className="w-3 h-3 shrink-0" />
                      )}
                      <span>{w.code}</span>
                    </div>
                    <p className="opacity-90">{w.message}</p>
                    <p className="opacity-75 italic">{w.suggestion}</p>
                  </div>
                ))
              )}
            </div>

            <div className="lg:col-span-8 flex flex-col overflow-hidden min-h-0">
              <pre
                style={{
                  backgroundColor: 'var(--bg-input)',
                  borderColor: 'var(--border-strong)',
                }}
                className="flex-1 border rounded-[6px] p-2.5 font-mono text-[10.5px] overflow-auto select-all whitespace-pre-wrap"
              >
                {htmlOutput}
              </pre>
            </div>
          </div>
        ) : (
          <div
            style={{ backgroundColor: 'var(--bg-canvas-well)' }}
            className="flex-1 overflow-auto p-3 flex justify-center items-start"
          >
            <iframe
              title="DesignBox Live Bottom Dock Preview"
              srcDoc={previewSrcDoc}
              style={{
                width:
                  previewViewport === 'mobile'
                    ? '375px'
                    : previewViewport === 'th_col'
                    ? '780px'
                    : previewViewport === 'th_desktop'
                    ? '1060px'
                    : '100%',
                minHeight: '100%',
                height: '100%',
                borderColor: 'var(--border-strong)',
              }}
              className={`border rounded-[8px] shadow-md bg-transparent ${
                isDraggingGlobal ? 'pointer-events-none' : ''
              }`}
              sandbox="allow-same-origin allow-scripts"
            />
          </div>
        )}
      </div>
    </section>
  );
};

