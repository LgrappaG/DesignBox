import React from 'react';
import {
  AlignCenter,
  AlignLeft,
  AlignRight,
  ArrowDown,
  ArrowLeftRight,
  ArrowUp,
  ArrowUpDown,
  EyeOff,
  FolderPlus,
  Layers,
  Lock,
  Palette,
  Sliders,
  Trash2,
  Unlock,
} from 'lucide-react';
import { BgPattern, DesignElement, LayoutMode } from '../../types/schema';
import { StudioColorButton } from '../shared/StudioColorPicker';

export const CANVAS_SIZE_PRESETS: ReadonlyArray<{ id: string; label: string; w: number; h: number }> = [
  { id: 'standard', label: 'Standard Freeform (760×540)', w: 760, h: 540 },
  { id: 'compact', label: 'Compact Character Card (600×420)', w: 600, h: 420 },
  { id: 'wide', label: 'Wide World / Banner (900×640)', w: 900, h: 640 },
  { id: 'carrd_mobile', label: 'Tall Carrd Mobile (480×860)', w: 480, h: 860 },
  { id: 'square', label: 'Square Showcase (640×640)', w: 640, h: 640 },
  { id: 'scene', label: 'Full Scene Sheet (1000×720)', w: 1000, h: 720 },
];

export interface CanvasSettingsInspectorProps {
  canvasWidth: number;
  canvasHeight: number;
  canvasBg: string;
  canvasPattern: BgPattern;
  swatches: string[];
  layoutMode: LayoutMode;
  onChangeCanvasWidth?: (w: number) => void;
  onChangeCanvasHeight?: (h: number) => void;
  onChangeCanvasBg?: (bg: string) => void;
  onChangeCanvasPattern?: (pattern: BgPattern) => void;
  onRemoveSwatch?: (hex: string) => void;
}

/** Document & Canvas configuration shown in Right Inspector when nothing is selected. */
export const CanvasSettingsInspector: React.FC<CanvasSettingsInspectorProps> = ({
  canvasWidth,
  canvasHeight,
  canvasBg,
  canvasPattern,
  swatches,
  layoutMode,
  onChangeCanvasWidth,
  onChangeCanvasHeight,
  onChangeCanvasBg,
  onChangeCanvasPattern,
  onRemoveSwatch,
}) => {
  const isTransparent = canvasBg === 'transparent';
  const matchedPreset = CANVAS_SIZE_PRESETS.find(
    (p) => p.w === canvasWidth && p.h === canvasHeight
  );

  return (
    <div className="flex-1 overflow-y-auto p-3.5 space-y-3 text-xs">
      <div
        style={{
          backgroundColor: 'var(--bg-panel-alt)',
          borderColor: 'var(--border-main)',
        }}
        className="p-2.5 rounded-[8px] border space-y-2.5"
      >
        <div className="flex items-center justify-between">
          <span className="font-semibold text-[11px] flex items-center gap-1.5">
            <Sliders className="w-3.5 h-3.5 text-[var(--accent)]" />
            <span>Canvas &amp; Page Setup</span>
          </span>
          <span
            style={{ color: 'var(--text-muted)' }}
            className="text-[9.5px] font-mono uppercase"
          >
            {layoutMode}
          </span>
        </div>

        <label className="block">
          <span style={{ color: 'var(--text-muted)' }} className="block text-[10px] mb-1">
            Page Size Preset
          </span>
          <select
            value={matchedPreset ? matchedPreset.id : 'custom'}
            onChange={(e) => {
              const found = CANVAS_SIZE_PRESETS.find((p) => p.id === e.target.value);
              if (found) {
                onChangeCanvasWidth?.(found.w);
                onChangeCanvasHeight?.(found.h);
              }
            }}
            style={{
              backgroundColor: 'var(--bg-input)',
              borderColor: 'var(--border-strong)',
            }}
            className="w-full border rounded-[5px] px-2 py-1 text-[11px]"
          >
            {CANVAS_SIZE_PRESETS.map((preset) => (
              <option key={preset.id} value={preset.id}>
                {preset.label}
              </option>
            ))}
            {!matchedPreset && (
              <option value="custom">
                Custom ({canvasWidth}×{canvasHeight})
              </option>
            )}
          </select>
        </label>

        <div className="grid grid-cols-[1fr_auto_1fr] gap-1.5 items-end">
          <label className="block">
            <span style={{ color: 'var(--text-muted)' }} className="block text-[10px] mb-0.5">
              Width (px)
            </span>
            <input
              type="number"
              min={240}
              max={2400}
              value={canvasWidth}
              onChange={(e) => {
                const val = parseInt(e.target.value, 10);
                if (!Number.isNaN(val)) {
                  onChangeCanvasWidth?.(Math.max(240, Math.min(2400, val)));
                }
              }}
              style={{
                backgroundColor: 'var(--bg-input)',
                borderColor: 'var(--border-strong)',
              }}
              className="w-full border rounded-[5px] px-2 py-1 text-[11px] font-mono"
            />
          </label>
          <button
            type="button"
            onClick={() => {
              onChangeCanvasWidth?.(canvasHeight);
              onChangeCanvasHeight?.(canvasWidth);
            }}
            style={{
              backgroundColor: 'var(--bg-input)',
              borderColor: 'var(--border-strong)',
              color: 'var(--text-muted)',
            }}
            className="h-7 px-2 border rounded-[5px] text-[10px] font-mono hover:border-[var(--accent)]"
            title="Swap Canvas Width and Height"
          >
            ⇄
          </button>
          <label className="block">
            <span style={{ color: 'var(--text-muted)' }} className="block text-[10px] mb-0.5">
              Height (px)
            </span>
            <input
              type="number"
              min={180}
              max={3200}
              value={canvasHeight}
              onChange={(e) => {
                const val = parseInt(e.target.value, 10);
                if (!Number.isNaN(val)) {
                  onChangeCanvasHeight?.(Math.max(180, Math.min(3200, val)));
                }
              }}
              style={{
                backgroundColor: 'var(--bg-input)',
                borderColor: 'var(--border-strong)',
              }}
              className="w-full border rounded-[5px] px-2 py-1 text-[11px] font-mono"
            />
          </label>
        </div>
      </div>

      {/* Canvas Background & Transparent Mode */}
      <div
        style={{
          backgroundColor: 'var(--bg-panel-alt)',
          borderColor: 'var(--border-main)',
        }}
        className="p-2.5 rounded-[8px] border space-y-2.5"
      >
        <div className="flex items-center justify-between">
          <span className="font-semibold text-[11px] flex items-center gap-1.5">
            <Palette className="w-3.5 h-3.5 text-[var(--accent)]" />
            <span>Canvas Backdrop</span>
          </span>
          <button
            type="button"
            onClick={() =>
              onChangeCanvasBg?.(isTransparent ? '#ffffff' : 'transparent')
            }
            style={{
              backgroundColor: isTransparent ? 'var(--accent-soft)' : 'var(--bg-input)',
              borderColor: isTransparent ? 'var(--accent)' : 'var(--border-strong)',
              color: isTransparent ? 'var(--accent)' : 'var(--text-main)',
            }}
            className="border rounded-[5px] px-2 py-0.5 text-[10px] font-semibold flex items-center gap-1 transition"
            title="Transparent Canvas omits an outer wrapper card background in HTML export"
          >
            <EyeOff className="w-3 h-3" />
            <span>{isTransparent ? 'Transparent ON' : 'Transparent OFF'}</span>
          </button>
        </div>

        <div className="space-y-2">
          <div>
            <span style={{ color: 'var(--text-muted)' }} className="block text-[10px] mb-1">
              Background Fill
            </span>
            <StudioColorButton
              value={canvasBg}
              onChange={(hex) => onChangeCanvasBg?.(hex)}
              fallbackHex="#ffffff"
              allowTransparent={true}
              swatches={swatches}
              fullWidth={true}
            />
          </div>

          <label className="block">
            <span style={{ color: 'var(--text-muted)' }} className="block text-[10px] mb-1">
              Background Surface Pattern
            </span>
            <select
              value={canvasPattern || 'none'}
              onChange={(e) => onChangeCanvasPattern?.(e.target.value as BgPattern)}
              style={{
                backgroundColor: 'var(--bg-input)',
                borderColor: 'var(--border-strong)',
              }}
              className="w-full border rounded-[5px] px-2 py-1 text-[11px]"
            >
              <option value="none">Solid / Clean</option>
              <option value="dots">Halftone Dots</option>
              <option value="grid">Square Grid</option>
              <option value="cross_grid">Cross Grid</option>
              <option value="lines">Notebook Lines</option>
              <option value="stripes">Diagonal Stripes</option>
              <option value="checker">Subtle Checker</option>
            </select>
          </label>
        </div>
      </div>

      {/* Character Palette Swatches */}
      <div
        style={{
          backgroundColor: 'var(--bg-panel-alt)',
          borderColor: 'var(--border-main)',
        }}
        className="p-2.5 rounded-[8px] border space-y-2"
      >
        <div className="flex items-center justify-between text-[10px]">
          <span className="font-semibold text-[11px]">Character Swatches</span>
          <span style={{ color: 'var(--text-muted)' }} className="text-[9px] font-mono">
            Click: Set Bg
          </span>
        </div>
        <div className="flex flex-wrap gap-1.5">
          {swatches.map((hex) => (
            <div key={hex} className="relative group">
              <button
                type="button"
                onClick={() => onChangeCanvasBg?.(hex)}
                onContextMenu={(e) => {
                  e.preventDefault();
                  onRemoveSwatch?.(hex);
                }}
                style={{
                  backgroundColor: hex,
                  borderColor:
                    canvasBg.toUpperCase() === hex.toUpperCase()
                      ? 'var(--accent)'
                      : 'var(--border-strong)',
                }}
                className="w-6 h-6 rounded-[5px] border hover:scale-110 transition block"
                title={`Apply ${hex} as Canvas Background (Right-click to remove)`}
              />
            </div>
          ))}
        </div>
      </div>

      <p
        style={{ color: 'var(--text-muted)' }}
        className="text-[10.5px] leading-relaxed px-1"
      >
        Tip: Click an object on the canvas or press <kbd className="font-mono">/</kbd> to quick-search
        and drop widgets directly at any coordinate.
      </p>
    </div>
  );
};

export interface MultiSelectBatchInspectorProps {
  selectedElements: DesignElement[];
  swatches: string[];
  onBatchUpdateSelected?: (patch: Partial<DesignElement>) => void;
  onAlignMultiSelected?: (
    axis: 'left' | 'center-x' | 'right' | 'top' | 'center-y' | 'bottom'
  ) => void;
  onDistributeMultiSelected?: (mode: 'h' | 'v' | 'gap-h' | 'gap-v') => void;
  onGroupSelectedIntoBox?: () => void;
  onDeleteSelected?: () => void;
  onClearSelection?: () => void;
}

/** Batch geometry & style inspector displayed when 2 or more elements are selected. */
export const MultiSelectBatchInspector: React.FC<MultiSelectBatchInspectorProps> = ({
  selectedElements,
  swatches,
  onBatchUpdateSelected,
  onAlignMultiSelected,
  onDistributeMultiSelected,
  onGroupSelectedIntoBox,
  onDeleteSelected,
  onClearSelection,
}) => {
  const first = selectedElements[0];
  const allLocked = selectedElements.every((item) => item.locked);
  const avgOpacity =
    selectedElements.length > 0
      ? Math.round(
          selectedElements.reduce((sum, item) => sum + (item.opacity ?? 100), 0) /
            selectedElements.length
        )
      : 100;

  return (
    <div className="flex-1 overflow-y-auto p-3.5 space-y-3 text-xs">
      <div
        style={{
          backgroundColor: 'var(--bg-panel-alt)',
          borderColor: 'var(--border-main)',
        }}
        className="p-2.5 rounded-[8px] border space-y-2.5"
      >
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-1.5 font-semibold text-[11px]">
            <Layers className="w-3.5 h-3.5 text-[var(--accent)]" />
            <span>{selectedElements.length} Elements Selected</span>
          </div>
          {onClearSelection && (
            <button
              type="button"
              onClick={onClearSelection}
              style={{ color: 'var(--text-muted)' }}
              className="text-[10px] hover:underline"
            >
              Clear
            </button>
          )}
        </div>

        <div className="flex flex-wrap gap-1.5">
          {onGroupSelectedIntoBox && (
            <button
              type="button"
              onClick={onGroupSelectedIntoBox}
              style={{ backgroundColor: 'var(--accent)', color: '#fff' }}
              className="flex-1 py-1 px-2 rounded-[5px] text-[11px] font-semibold flex items-center justify-center gap-1.5 hover:opacity-90"
            >
              <FolderPlus className="w-3.5 h-3.5" />
              <span>Group into Box</span>
            </button>
          )}
          <button
            type="button"
            onClick={() => onBatchUpdateSelected?.({ locked: !allLocked })}
            style={{
              backgroundColor: 'var(--bg-input)',
              borderColor: 'var(--border-strong)',
            }}
            className="border py-1 px-2 rounded-[5px] text-[11px] flex items-center gap-1"
            title={allLocked ? 'Unlock all selected' : 'Lock all selected'}
          >
            {allLocked ? <Unlock className="w-3.5 h-3.5" /> : <Lock className="w-3.5 h-3.5" />}
            <span>{allLocked ? 'Unlock' : 'Lock'}</span>
          </button>
          {onDeleteSelected && (
            <button
              type="button"
              onClick={onDeleteSelected}
              className="border border-rose-500/35 bg-rose-500/10 text-rose-500 py-1 px-2 rounded-[5px] text-[11px] flex items-center gap-1 hover:bg-rose-500/20"
              title="Delete all selected elements"
            >
              <Trash2 className="w-3.5 h-3.5" />
            </button>
          )}
        </div>
      </div>

      {/* Align & Distribute */}
      <div
        style={{
          backgroundColor: 'var(--bg-panel-alt)',
          borderColor: 'var(--border-main)',
        }}
        className="p-2.5 rounded-[8px] border space-y-2"
      >
        <div className="font-semibold text-[11px]">Align &amp; Distribute</div>
        <div className="grid grid-cols-6 gap-1">
          <button
            type="button"
            onClick={() => onAlignMultiSelected?.('left')}
            style={{ backgroundColor: 'var(--bg-input)', borderColor: 'var(--border-strong)' }}
            className="border rounded-[5px] py-1.5 flex items-center justify-center hover:border-[var(--accent)]"
            title="Align Left"
          >
            <AlignLeft className="w-3.5 h-3.5" />
          </button>
          <button
            type="button"
            onClick={() => onAlignMultiSelected?.('center-x')}
            style={{ backgroundColor: 'var(--bg-input)', borderColor: 'var(--border-strong)' }}
            className="border rounded-[5px] py-1.5 flex items-center justify-center hover:border-[var(--accent)]"
            title="Align Center Horizontal"
          >
            <AlignCenter className="w-3.5 h-3.5" />
          </button>
          <button
            type="button"
            onClick={() => onAlignMultiSelected?.('right')}
            style={{ backgroundColor: 'var(--bg-input)', borderColor: 'var(--border-strong)' }}
            className="border rounded-[5px] py-1.5 flex items-center justify-center hover:border-[var(--accent)]"
            title="Align Right"
          >
            <AlignRight className="w-3.5 h-3.5" />
          </button>
          <button
            type="button"
            onClick={() => onAlignMultiSelected?.('top')}
            style={{ backgroundColor: 'var(--bg-input)', borderColor: 'var(--border-strong)' }}
            className="border rounded-[5px] py-1.5 flex items-center justify-center hover:border-[var(--accent)]"
            title="Align Top"
          >
            <ArrowUp className="w-3.5 h-3.5" />
          </button>
          <button
            type="button"
            onClick={() => onAlignMultiSelected?.('center-y')}
            style={{ backgroundColor: 'var(--bg-input)', borderColor: 'var(--border-strong)' }}
            className="border rounded-[5px] py-1.5 flex items-center justify-center hover:border-[var(--accent)]"
            title="Align Middle Vertical"
          >
            <ArrowUpDown className="w-3.5 h-3.5" />
          </button>
          <button
            type="button"
            onClick={() => onAlignMultiSelected?.('bottom')}
            style={{ backgroundColor: 'var(--bg-input)', borderColor: 'var(--border-strong)' }}
            className="border rounded-[5px] py-1.5 flex items-center justify-center hover:border-[var(--accent)]"
            title="Align Bottom"
          >
            <ArrowDown className="w-3.5 h-3.5" />
          </button>
        </div>

        {selectedElements.length >= 3 && (
          <div className="grid grid-cols-2 gap-1.5 pt-1">
            <button
              type="button"
              onClick={() => onDistributeMultiSelected?.('gap-h')}
              style={{ backgroundColor: 'var(--bg-input)', borderColor: 'var(--border-strong)' }}
              className="border rounded-[5px] py-1 px-2 text-[10px] font-mono flex items-center justify-center gap-1 hover:border-[var(--accent)]"
            >
              <ArrowLeftRight className="w-3 h-3" />
              <span>Equal Gap H</span>
            </button>
            <button
              type="button"
              onClick={() => onDistributeMultiSelected?.('gap-v')}
              style={{ backgroundColor: 'var(--bg-input)', borderColor: 'var(--border-strong)' }}
              className="border rounded-[5px] py-1 px-2 text-[10px] font-mono flex items-center justify-center gap-1 hover:border-[var(--accent)]"
            >
              <ArrowUpDown className="w-3 h-3" />
              <span>Equal Gap V</span>
            </button>
          </div>
        )}
      </div>

      {/* Batch Colors & Surface */}
      <div
        style={{
          backgroundColor: 'var(--bg-panel-alt)',
          borderColor: 'var(--border-main)',
        }}
        className="p-2.5 rounded-[8px] border space-y-2.5"
      >
        <div className="font-semibold text-[11px]">Batch Appearance</div>
        <div className="space-y-2">
          <div>
            <span style={{ color: 'var(--text-muted)' }} className="block text-[10px] mb-1">
              Batch Fill Color
            </span>
            <StudioColorButton
              value={first?.bgColor || '#ffffff'}
              onChange={(bgColor) => onBatchUpdateSelected?.({ bgColor })}
              allowTransparent={true}
              swatches={swatches}
              fullWidth={true}
            />
          </div>
          <div>
            <span style={{ color: 'var(--text-muted)' }} className="block text-[10px] mb-1">
              Batch Border Color
            </span>
            <StudioColorButton
              value={first?.borderColor || '#cccccc'}
              onChange={(borderColor) => onBatchUpdateSelected?.({ borderColor })}
              allowTransparent={true}
              swatches={swatches}
              fullWidth={true}
            />
          </div>
          <div>
            <span style={{ color: 'var(--text-muted)' }} className="block text-[10px] mb-1">
              Batch Text Color
            </span>
            <StudioColorButton
              value={first?.textColor || '#222222'}
              onChange={(textColor) => onBatchUpdateSelected?.({ textColor })}
              swatches={swatches}
              fullWidth={true}
            />
          </div>
        </div>

        <div className="grid grid-cols-2 gap-2 pt-1">
          <label>
            <span style={{ color: 'var(--text-muted)' }} className="block text-[10px] mb-0.5">
              Border Width (px)
            </span>
            <input
              type="number"
              min={0}
              max={24}
              value={first?.borderWidth ?? 0}
              onChange={(e) => {
                const v = Math.max(0, Math.min(24, parseInt(e.target.value, 10) || 0));
                onBatchUpdateSelected?.({
                  bordersLinked: true,
                  borderWidth: v,
                  borderTopWidth: v,
                  borderRightWidth: v,
                  borderBottomWidth: v,
                  borderLeftWidth: v,
                });
              }}
              style={{ backgroundColor: 'var(--bg-input)', borderColor: 'var(--border-strong)' }}
              className="w-full border rounded-[5px] px-2 py-1 text-[11px] font-mono"
            />
          </label>

          <label>
            <span style={{ color: 'var(--text-muted)' }} className="block text-[10px] mb-0.5">
              Corner Radius (px)
            </span>
            <input
              type="number"
              min={0}
              max={200}
              value={first?.borderRadius ?? 0}
              onChange={(e) => {
                const v = Math.max(0, Math.min(200, parseInt(e.target.value, 10) || 0));
                onBatchUpdateSelected?.({
                  cornersLinked: true,
                  borderRadius: v,
                  radiusTL: v,
                  radiusTR: v,
                  radiusBR: v,
                  radiusBL: v,
                });
              }}
              style={{ backgroundColor: 'var(--bg-input)', borderColor: 'var(--border-strong)' }}
              className="w-full border rounded-[5px] px-2 py-1 text-[11px] font-mono"
            />
          </label>
        </div>

        <label className="block pt-1">
          <div className="flex justify-between text-[10px] mb-0.5">
            <span style={{ color: 'var(--text-muted)' }}>Batch Opacity</span>
            <span className="font-mono">{avgOpacity}%</span>
          </div>
          <input
            type="range"
            min={5}
            max={100}
            value={avgOpacity}
            onChange={(e) =>
              onBatchUpdateSelected?.({ opacity: parseInt(e.target.value, 10) || 100 })
            }
            className="w-full"
          />
        </label>
      </div>
    </div>
  );
};
