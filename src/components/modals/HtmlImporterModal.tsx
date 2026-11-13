import React, { useMemo, useState } from 'react';
import { Code2, Layers, Palette, Sparkles, Upload } from 'lucide-react';
import { parseToyhouseHtmlToDesign } from '../../engine/htmlImporter';
import { DesignElement } from '../../types/schema';

export interface HtmlImporterModalProps {
  open: boolean;
  uiTheme: 'carbon' | 'paper';
  canvasWidth: number;
  existingCount: number;
  maxRowIndex: number;
  maxBottomY: number;
  onClose: () => void;
  onImportElements: (params: {
    elements: DesignElement[];
    mode: 'replace' | 'append';
    extractedSwatches: string[];
    applySwatches: boolean;
  }) => void;
}

const SAMPLE_TH_HTML = `<div class="container p-2" style="max-width:760px;">
  <div class="row no-gutters mb-2">
    <div class="col-md-4 p-2" style="background:#242220;color:#ECE7DF;border:1px solid #C86D51;border-radius:8px;">
      <img src="https://images.unsplash.com/photo-1579783902614-a3fb3927b675?w=300" class="rounded-circle" style="width:140px;height:140px;" />
    </div>
    <div class="col-md-8 p-2">
      <div class="card p-3" style="background:#242220;color:#ECE7DF;border:1px solid #D4A373;border-radius:8px;">
        <h3>CHARACTER DOSSIER // SAMPLE</h3>
        <p>Paste any Toyhouse Bootstrap 4 layout or custom snippet here. Rows, cards, nav-tabs, images, headings and buttons convert into editable DesignBox blocks, while complex HTML falls back cleanly to a Custom Widget.</p>
      </div>
    </div>
  </div>
</div>`;

export const HtmlImporterModal: React.FC<HtmlImporterModalProps> = ({
  open,
  uiTheme,
  canvasWidth,
  existingCount,
  maxRowIndex,
  maxBottomY,
  onClose,
  onImportElements,
}) => {
  const [rawHtml, setRawHtml] = useState('');
  const [importMode, setImportMode] = useState<'replace' | 'append'>(
    existingCount > 0 ? 'append' : 'replace'
  );
  const [applySwatches, setApplySwatches] = useState(true);

  const preview = useMemo(() => {
    if (!rawHtml.trim()) return null;
    return parseToyhouseHtmlToDesign(rawHtml, {
      uiTheme,
      canvasWidth,
      startRowIndex: importMode === 'append' ? maxRowIndex + 1 : 0,
      startY: importMode === 'append' ? Math.max(24, maxBottomY + 20) : 24,
    });
  }, [rawHtml, uiTheme, canvasWidth, importMode, maxRowIndex, maxBottomY]);

  if (!open) return null;

  const totalBlocks = preview?.elements.length ?? 0;

  return (
    <div className="fixed inset-0 z-50 bg-black/75 flex items-center justify-center p-6">
      <div
        style={{ backgroundColor: 'var(--bg-panel)', borderColor: 'var(--border-strong)' }}
        className="border rounded-[12px] max-w-3xl w-full overflow-hidden shadow-2xl flex flex-col max-h-[90vh]"
      >
        <div
          style={{ borderColor: 'var(--border-main)' }}
          className="px-4 py-3 border-b flex items-center justify-between shrink-0"
        >
          <div className="flex items-center gap-2">
            <Code2 className="w-4 h-4" style={{ color: 'var(--accent)' }} />
            <div>
              <h3 className="text-xs font-bold uppercase tracking-wider">
                Pragmatic Hybrid HTML Importer
              </h3>
              <p style={{ color: 'var(--text-muted)' }} className="text-[11px]">
                Converts Toyhouse rows, cards, nav-tabs, images &amp; text into blocks — complex markup
                is preserved inside Custom Widgets.
              </p>
            </div>
          </div>
          <button
            type="button"
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

        <div className="p-4 space-y-3 overflow-y-auto flex-1">
          <div className="flex items-center justify-between gap-2">
            <span style={{ color: 'var(--text-muted)' }} className="text-[11px] font-medium">
              Paste Toyhouse / Bootstrap 4 HTML Code
            </span>
            <button
              type="button"
              onClick={() => setRawHtml(SAMPLE_TH_HTML)}
              style={{
                backgroundColor: 'var(--bg-panel-alt)',
                borderColor: 'var(--border-strong)',
                color: 'var(--accent)',
              }}
              className="border rounded-[5px] px-2 py-0.5 text-[10px] font-mono hover:opacity-90 flex items-center gap-1"
            >
              <Sparkles className="w-3 h-3" />
              Load Sample Snippet
            </button>
          </div>

          <textarea
            value={rawHtml}
            onChange={(e) => setRawHtml(e.target.value)}
            rows={10}
            placeholder='<div class="row">...</div>'
            style={{
              backgroundColor: 'var(--bg-input)',
              borderColor: 'var(--border-strong)',
            }}
            className="w-full border rounded-[8px] p-2.5 font-mono text-[11px] leading-relaxed focus:outline-none focus:border-amber-500"
          />

          {preview && (
            <div
              style={{
                backgroundColor: 'var(--bg-panel-alt)',
                borderColor: 'var(--border-main)',
              }}
              className="p-3 rounded-[8px] border space-y-2.5"
            >
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-bold flex items-center gap-1.5">
                  <Layers className="w-3.5 h-3.5" style={{ color: 'var(--accent)' }} />
                  <span>Parse Breakdown ({totalBlocks} Editable Element{totalBlocks === 1 ? '' : 's'})</span>
                </span>
                <div className="flex flex-wrap gap-1 text-[9.5px] font-mono">
                  {preview.breakdown.rows > 0 && (
                    <span className="px-1.5 py-0.5 rounded bg-emerald-500/15 text-emerald-500 border border-emerald-500/30">
                      {preview.breakdown.rows} Rows
                    </span>
                  )}
                  {preview.breakdown.boxes > 0 && (
                    <span className="px-1.5 py-0.5 rounded bg-sky-500/15 text-sky-400 border border-sky-500/30">
                      {preview.breakdown.boxes} Cards/Boxes
                    </span>
                  )}
                  {preview.breakdown.tabs > 0 && (
                    <span className="px-1.5 py-0.5 rounded bg-purple-500/15 text-purple-400 border border-purple-500/30">
                      {preview.breakdown.tabs} Tabs
                    </span>
                  )}
                  {preview.breakdown.images > 0 && (
                    <span className="px-1.5 py-0.5 rounded bg-amber-500/15 text-amber-400 border border-amber-500/30">
                      {preview.breakdown.images} Images
                    </span>
                  )}
                  {preview.breakdown.texts > 0 && (
                    <span className="px-1.5 py-0.5 rounded bg-stone-500/15 text-stone-300 border border-stone-500/30">
                      {preview.breakdown.texts} Text/Quote
                    </span>
                  )}
                  {preview.breakdown.buttons > 0 && (
                    <span className="px-1.5 py-0.5 rounded bg-pink-500/15 text-pink-400 border border-pink-500/30">
                      {preview.breakdown.buttons} Buttons
                    </span>
                  )}
                  {preview.breakdown.customWidgets > 0 && (
                    <span className="px-1.5 py-0.5 rounded bg-orange-500/15 text-orange-400 border border-orange-500/30">
                      {preview.breakdown.customWidgets} Custom Widget Fallback
                    </span>
                  )}
                </div>
              </div>

              {preview.extractedSwatches.length > 0 && (
                <div className="flex items-center justify-between gap-2 pt-1 border-t border-black/10 dark:border-white/10">
                  <div className="flex items-center gap-1.5 flex-wrap">
                    <Palette className="w-3.5 h-3.5" style={{ color: 'var(--accent)' }} />
                    <span className="text-[10.5px] font-medium">Extracted Colors:</span>
                    {preview.extractedSwatches.map((hex) => (
                      <span
                        key={hex}
                        title={hex}
                        style={{ backgroundColor: hex }}
                        className="w-4 h-4 rounded-[3px] border border-white/25 shadow-sm"
                      />
                    ))}
                  </div>
                  <label className="flex items-center gap-1.5 text-[10.5px] cursor-pointer shrink-0">
                    <input
                      type="checkbox"
                      checked={applySwatches}
                      onChange={(e) => setApplySwatches(e.target.checked)}
                      className="rounded"
                    />
                    <span>Load into Swatches</span>
                  </label>
                </div>
              )}

              {preview.warnings.length > 0 && (
                <div className="text-[10px] text-amber-500 space-y-0.5 pt-1 border-t border-black/10 dark:border-white/10">
                  {preview.warnings.map((w, idx) => (
                    <div key={idx}>• {w}</div>
                  ))}
                </div>
              )}
            </div>
          )}

          <div className="flex items-center justify-between gap-3 pt-1">
            <div className="flex items-center gap-2 text-[11px]">
              <span style={{ color: 'var(--text-muted)' }}>Import Mode:</span>
              <button
                type="button"
                onClick={() => setImportMode('append')}
                style={
                  importMode === 'append'
                    ? { backgroundColor: 'var(--accent)', color: '#fff', borderColor: 'var(--accent)' }
                    : { backgroundColor: 'var(--bg-input)', borderColor: 'var(--border-strong)' }
                }
                className="border rounded-[6px] px-2.5 py-1 text-[10.5px] font-semibold"
              >
                Append Below Existing
              </button>
              <button
                type="button"
                onClick={() => setImportMode('replace')}
                style={
                  importMode === 'replace'
                    ? { backgroundColor: 'var(--accent)', color: '#fff', borderColor: 'var(--accent)' }
                    : { backgroundColor: 'var(--bg-input)', borderColor: 'var(--border-strong)' }
                }
                className="border rounded-[6px] px-2.5 py-1 text-[10.5px] font-semibold"
              >
                Replace Canvas
              </button>
            </div>

            <button
              type="button"
              disabled={!preview || preview.elements.length === 0}
              onClick={() => {
                if (!preview || preview.elements.length === 0) return;
                onImportElements({
                  elements: preview.elements,
                  mode: importMode,
                  extractedSwatches: preview.extractedSwatches,
                  applySwatches,
                });
                setRawHtml('');
                onClose();
              }}
              style={{ backgroundColor: 'var(--accent)', color: '#fff' }}
              className="flex items-center gap-1.5 px-4 py-1.5 rounded-[7px] text-xs font-semibold hover:opacity-90 disabled:opacity-40 transition"
            >
              <Upload className="w-3.5 h-3.5" />
              <span>Import {totalBlocks} Block{totalBlocks === 1 ? '' : 's'} into Canvas</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

