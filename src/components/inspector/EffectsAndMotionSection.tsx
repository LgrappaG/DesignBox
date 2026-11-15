import React from 'react';
import { Square } from 'lucide-react';
import { DesignElement } from '../../types/schema';
import { ModifierStackSection } from '../ModifierStackSection';
import { CustomShadowInspectorSection } from '../PureInspectorSections';
import { InspectorSubExpander } from './InspectorCollapsibleSection';

interface EffectsAndMotionSectionProps {
  el: DesignElement;
  updateSelected: (patch: Partial<DesignElement>) => void;
  isToyhouseFree: boolean;
  swatches?: string[];
  showProControls?: boolean;
}

/** Elevation shadows, glassmorphism, custom shadows, and non-destructive modifier stack. */
export const EffectsAndMotionSection: React.FC<EffectsAndMotionSectionProps> = ({
  el,
  updateSelected,
  isToyhouseFree,
  swatches,
  showProControls = true,
}) => {
  const showProOnly = !isToyhouseFree || showProControls;
  const modCount = el.modifiers?.length || 0;
  const hasCustomShadow = Boolean(el.customBoxShadowEnabled || el.customTextShadowEnabled);

  return (
    <div className="space-y-2.5">
      {/* Elevation Shadow, Glass Blur & Seamless Toggle */}
      <div className="space-y-2">
        <div className="flex items-center justify-between text-[10px]">
          <span style={{ color: 'var(--text-muted)' }} className="font-semibold">
            Elevation Shadow &amp; Glass
          </span>
          {el.shadow !== 'none' ? (
            <button
              type="button"
              onClick={() => updateSelected({ shadow: 'none' })}
              style={{ color: 'var(--accent)' }}
              className="text-[9px] font-mono hover:underline"
            >
              Disable Shadow
            </button>
          ) : (
            <span className="text-[9px] text-emerald-500 font-mono">Flat (No Shadow)</span>
          )}
        </div>

        <div className="grid grid-cols-4 gap-1">
          {(
            [
              { id: 'none', label: 'Flat (None)' },
              { id: 'sm', label: 'Soft (SM)' },
              { id: 'md', label: 'Card (MD)' },
              { id: 'lg', label: 'Deep (LG)' },
            ] as const
          ).map((opt) => (
            <button
              key={opt.id}
              type="button"
              onClick={() => updateSelected({ shadow: opt.id })}
              style={{
                backgroundColor: el.shadow === opt.id ? 'var(--accent)' : 'var(--bg-input)',
                color: el.shadow === opt.id ? '#fff' : 'inherit',
                borderColor: 'var(--border-strong)',
              }}
              className="border py-1 px-1 rounded-[5px] text-[10px] font-medium transition text-center"
            >
              {opt.label}
            </button>
          ))}
        </div>

        <button
          type="button"
          onClick={() =>
            updateSelected({
              shadow: 'none',
              borderWidth: 0,
              borderColor: 'transparent',
            })
          }
          style={{
            backgroundColor: 'var(--bg-input)',
            borderColor: 'var(--border-strong)',
            color: 'var(--text-main)',
          }}
          className="w-full border rounded-[5px] py-1 px-2 text-[10px] font-medium flex items-center justify-center gap-1.5 hover:opacity-85 transition"
          title="Remove shadow and border so this panel blends seamlessly into parent container"
        >
          <Square className="w-3 h-3 text-[var(--accent)]" />
          <span>Flat Seamless (No Shadow &amp; Border)</span>
        </button>

        <div className="grid grid-cols-2 gap-2 items-center pt-0.5 text-[10px]">
          {showProOnly && (
            <label>
              <span style={{ color: 'var(--text-muted)' }} className="block text-[10px] mb-0.5">
                Glass Blur ({el.glassBlur || 0}px)
              </span>
              <input
                type="range"
                min={0}
                max={16}
                value={el.glassBlur || 0}
                onChange={(e) => updateSelected({ glassBlur: parseInt(e.target.value, 10) || 0 })}
                className="w-full"
              />
            </label>
          )}
          <label className="flex items-center gap-1.5 cursor-pointer pt-3">
            <input
              type="checkbox"
              checked={Boolean(el.innerGlow)}
              onChange={(e) => updateSelected({ innerGlow: e.target.checked })}
            />
            <span>Inner Accent Glow</span>
          </label>
        </div>
      </div>

      {/* Custom Box & Text Shadows */}
      <InspectorSubExpander
        title="Custom Box & Text Shadows (X/Y/Blur)"
        isActive={hasCustomShadow}
        summary={hasCustomShadow ? 'Active' : 'Off'}
      >
        <CustomShadowInspectorSection
          el={el}
          updateSelected={updateSelected}
          isToyhouseFree={isToyhouseFree}
          swatches={swatches}
        />
      </InspectorSubExpander>

      {/* Non-Destructive Blender-Style Modifier Stack */}
      <InspectorSubExpander
        title="Object Modifiers (Split / Cutout / Frame)"
        defaultOpen={modCount > 0}
        isActive={modCount > 0}
        summary={`${modCount} Active`}
      >
        <ModifierStackSection
          el={el}
          updateSelected={updateSelected}
          isToyhouseFree={isToyhouseFree}
          swatches={swatches}
        />
      </InspectorSubExpander>
    </div>
  );
};
