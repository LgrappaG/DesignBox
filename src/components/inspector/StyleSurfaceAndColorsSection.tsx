import React from 'react';
import { Palette } from 'lucide-react';
import { BgPattern, DesignElement } from '../../types/schema';
import {
  GradientAndBgImageSection,
  PureSurfaceSculptorSection,
} from '../PureInspectorSections';

interface StyleSurfaceAndColorsSectionProps {
  el: DesignElement;
  updateSelected: (patch: Partial<DesignElement>) => void;
  isToyhouseFree: boolean;
  swatches: string[];
  swatchTarget: 'bgColor' | 'borderColor' | 'textColor';
  setSwatchTarget: (target: 'bgColor' | 'borderColor' | 'textColor') => void;
  onAddSelectedColorToSwatches: () => void;
  onApplySwatchColor: (hex: string) => void;
  onRemoveSwatch: (hex: string) => void;
}

/** Direct color pickers, Character Swatches, surface pattern, gradient & surface recipes. */
export const StyleSurfaceAndColorsSection: React.FC<StyleSurfaceAndColorsSectionProps> = ({
  el,
  updateSelected,
  isToyhouseFree,
  swatches,
  swatchTarget,
  setSwatchTarget,
  onAddSelectedColorToSwatches,
  onApplySwatchColor,
  onRemoveSwatch,
}) => {
  return (
    <div className="space-y-3">
      {/* Direct Colors */}
      <div
        style={{
          backgroundColor: 'var(--bg-panel-alt)',
          borderColor: 'var(--border-main)',
        }}
        className="p-2.5 rounded-[8px] border space-y-2.5"
      >
        <div className="font-semibold text-[11px]">Surface Pattern &amp; Colors</div>

        <label className="block">
          <span style={{ color: 'var(--text-muted)' }} className="block text-[10px] mb-0.5">
            Surface Pattern
          </span>
          <select
            value={el.bgPattern || 'none'}
            onChange={(e) => updateSelected({ bgPattern: e.target.value as BgPattern })}
            style={{
              backgroundColor: 'var(--bg-input)',
              borderColor: 'var(--border-strong)',
            }}
            className="w-full border rounded-[5px] px-1.5 py-1 text-[11px]"
          >
            <option value="none">Solid / Gradient</option>
            <option value="dots">Halftone Dots</option>
            <option value="grid">Square Grid</option>
            <option value="cross_grid">Cross Grid</option>
            <option value="lines">Notebook Lines</option>
            <option value="stripes">Diagonal Stripes</option>
            <option value="checker">Subtle Checker</option>
          </select>
        </label>

        <div className="grid grid-cols-3 gap-2">
          <label>
            <div className="flex items-center justify-between mb-1">
              <span style={{ color: 'var(--text-muted)' }} className="text-[10px]">
                Fill
              </span>
              <button
                type="button"
                onClick={() =>
                  updateSelected({
                    bgColor: el.bgColor === 'transparent' ? '#FAF8F5' : 'transparent',
                    borderColor: el.bgColor === 'transparent' ? 'var(--border-strong)' : 'transparent',
                    borderWidth: el.bgColor === 'transparent' ? 1 : 0,
                    shadow: 'none',
                  })
                }
                style={{ color: 'var(--accent)' }}
                className="text-[9px] font-mono hover:underline"
                title="Toggle transparent container mode"
              >
                {el.bgColor === 'transparent' ? 'Solid' : 'Clear'}
              </button>
            </div>
            <div
              style={{
                backgroundColor: 'var(--bg-input)',
                borderColor: 'var(--border-strong)',
              }}
              className="flex items-center gap-1 border rounded-[5px] px-1.5 py-1"
            >
              <input
                type="color"
                value={el.bgColor === 'transparent' ? '#F2EFE9' : el.bgColor}
                onChange={(e) => updateSelected({ bgColor: e.target.value })}
                className="w-4 h-4 cursor-pointer bg-transparent border-0 shrink-0"
              />
              <span className="font-mono text-[9px] truncate">
                {el.bgColor === 'transparent' ? 'transparent' : el.bgColor}
              </span>
            </div>
          </label>
          <label>
            <span style={{ color: 'var(--text-muted)' }} className="block mb-1 text-[10px]">
              Text
            </span>
            <div
              style={{
                backgroundColor: 'var(--bg-input)',
                borderColor: 'var(--border-strong)',
              }}
              className="flex items-center gap-1 border rounded-[5px] px-1.5 py-1"
            >
              <input
                type="color"
                value={el.textColor}
                onChange={(e) => updateSelected({ textColor: e.target.value })}
                className="w-4 h-4 cursor-pointer bg-transparent border-0 shrink-0"
              />
              <span className="font-mono text-[9px] truncate">{el.textColor}</span>
            </div>
          </label>
          <label>
            <span style={{ color: 'var(--text-muted)' }} className="block mb-1 text-[10px]">
              Accent
            </span>
            <div
              style={{
                backgroundColor: 'var(--bg-input)',
                borderColor: 'var(--border-strong)',
              }}
              className="flex items-center gap-1 border rounded-[5px] px-1.5 py-1"
            >
              <input
                type="color"
                value={el.borderColor === 'transparent' ? '#E5E5E5' : el.borderColor}
                onChange={(e) => updateSelected({ borderColor: e.target.value })}
                className="w-4 h-4 cursor-pointer bg-transparent border-0 shrink-0"
              />
              <span className="font-mono text-[9px] truncate">{el.borderColor}</span>
            </div>
          </label>
        </div>
      </div>

      {/* Character Color Swatches */}
      <div
        style={{
          backgroundColor: 'var(--bg-panel-alt)',
          borderColor: 'var(--border-main)',
        }}
        className="p-2.5 rounded-[8px] border space-y-2"
      >
        <div className="flex items-center justify-between">
          <span className="font-semibold text-[11px] flex items-center gap-1">
            <Palette className="w-3 h-3" style={{ color: 'var(--accent)' }} />
            <span>Character Swatches</span>
          </span>
          <button
            type="button"
            onClick={onAddSelectedColorToSwatches}
            style={{ color: 'var(--accent)' }}
            className="text-[10px] font-mono hover:underline"
          >
            + Save Current
          </button>
        </div>

        <div className="flex gap-1 text-[10px]">
          {(
            [
              { key: 'bgColor', label: 'Fill' },
              { key: 'borderColor', label: 'Border' },
              { key: 'textColor', label: 'Text' },
            ] as const
          ).map((t) => (
            <button
              key={t.key}
              type="button"
              onClick={() => setSwatchTarget(t.key)}
              style={
                swatchTarget === t.key
                  ? { backgroundColor: 'var(--accent)', color: '#fff' }
                  : { backgroundColor: 'var(--bg-input)' }
              }
              className="flex-1 py-0.5 rounded-[4px] font-mono"
            >
              Apply to {t.label}
            </button>
          ))}
        </div>

        <div className="flex flex-wrap gap-1.5 pt-0.5">
          {swatches.map((hex) => (
            <div key={hex} className="relative group">
              <button
                type="button"
                onClick={() => onApplySwatchColor(hex)}
                onContextMenu={(e) => {
                  e.preventDefault();
                  onRemoveSwatch(hex);
                }}
                style={{ backgroundColor: hex, borderColor: 'var(--border-strong)' }}
                className="w-6 h-6 rounded-[4px] border hover:scale-110 transition block shadow-xs"
                title={`Click: Apply ${hex} to ${swatchTarget}\nRight-click: Remove color`}
              />
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  onRemoveSwatch(hex);
                }}
                className="absolute -top-1.5 -right-1.5 w-3.5 h-3.5 bg-rose-600 text-white rounded-full text-[9px] font-bold leading-none hidden group-hover:flex items-center justify-center shadow z-10 hover:bg-rose-700"
                title="Remove color"
              >
                ×
              </button>
            </div>
          ))}
        </div>
      </div>

      {/* Gradient & Inline Container BG Image */}
      <GradientAndBgImageSection
        el={el}
        updateSelected={updateSelected}
        isToyhouseFree={isToyhouseFree}
      />

      {/* Quick Surface Recipes (Pure & Normal) */}
      <PureSurfaceSculptorSection
        el={el}
        updateSelected={updateSelected}
        isToyhouseFree={isToyhouseFree}
      />
    </div>
  );
};

