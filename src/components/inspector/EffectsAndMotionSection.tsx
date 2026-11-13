import React from 'react';
import { Sparkles, Square } from 'lucide-react';
import { DesignElement, HoverEffect, IdleAnimation } from '../../types/schema';
import { getFontAwesomeAnimClass } from '../../engine/layoutSolver';
import { ModifierStackSection } from '../ModifierStackSection';
import { CustomShadowInspectorSection } from '../PureInspectorSections';

interface EffectsAndMotionSectionProps {
  el: DesignElement;
  updateSelected: (patch: Partial<DesignElement>) => void;
  isToyhouseFree: boolean;
  swatches?: string[];
}

/** Elevation shadows, glassmorphism, custom shadows, modifier stack, interactivity & motion. */
export const EffectsAndMotionSection: React.FC<EffectsAndMotionSectionProps> = ({
  el,
  updateSelected,
  isToyhouseFree,
  swatches,
}) => {
  return (
    <div className="space-y-3">
      {/* Elevation Shadow, Glass Blur & Seamless Toggle */}
      <div
        style={{
          backgroundColor: 'var(--bg-panel-alt)',
          borderColor: 'var(--border-main)',
        }}
        className="p-2.5 rounded-[8px] border space-y-2.5"
      >
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
      <CustomShadowInspectorSection
        el={el}
        updateSelected={updateSelected}
        isToyhouseFree={isToyhouseFree}
        swatches={swatches}
      />

      {/* Non-Destructive Blender-Style Modifier Stack */}
      <div
        style={{
          backgroundColor: 'var(--bg-panel)',
          borderColor: 'var(--border-main)',
        }}
        className="p-2.5 rounded-[8px] border"
      >
        <ModifierStackSection
          el={el}
          updateSelected={updateSelected}
          isToyhouseFree={isToyhouseFree}
          swatches={swatches}
        />
      </div>

      {/* Card Interactivity & Sizing */}
      <div
        style={{
          backgroundColor: 'var(--bg-panel-alt)',
          borderColor: 'var(--border-main)',
        }}
        className="space-y-2.5 p-2.5 rounded-[8px] border"
      >
        <div className="font-semibold text-[11px] flex items-center justify-between">
          <span className="flex items-center gap-1.5" style={{ color: 'var(--accent)' }}>
            <Sparkles className="w-3.5 h-3.5" />
            <span>Card Interactivity &amp; Sizing</span>
          </span>
          <span className="text-[9px] font-mono opacity-60">F2U Safe</span>
        </div>

        <label className="block">
          <span style={{ color: 'var(--text-muted)' }} className="block mb-0.5 text-[10px]">
            Card Click Link (Clicking box navigates to URL)
          </span>
          <input
            type="text"
            placeholder="e.g. https://toyhou.se/~gallery or https://carrd.co"
            value={el.linkUrl || ''}
            onChange={(e) => updateSelected({ linkUrl: e.target.value })}
            style={{ backgroundColor: 'var(--bg-input)', borderColor: 'var(--border-strong)' }}
            className="w-full border rounded-[5px] px-2 py-1 text-[11px] font-mono text-emerald-500"
          />
        </label>

        <div className="pt-1.5 border-t border-[var(--border-main)] space-y-1.5">
          <label className="flex items-center gap-2 cursor-pointer text-[10px]">
            <input
              type="checkbox"
              checked={Boolean(el.collapsible)}
              onChange={(e) => updateSelected({ collapsible: e.target.checked })}
              className="rounded text-accent focus:ring-accent"
            />
            <span className="font-semibold select-none">
              Collapsible Box (Expandable / Spoiler Container)
            </span>
          </label>

          {el.collapsible && (
            <div className="pl-5 space-y-1.5">
              <input
                type="text"
                placeholder="Header Label (e.g. Click to Reveal Lore...)"
                value={el.collapseHeader || ''}
                onChange={(e) => updateSelected({ collapseHeader: e.target.value })}
                style={{ backgroundColor: 'var(--bg-input)', borderColor: 'var(--border-strong)' }}
                className="w-full border rounded-[4px] px-1.5 py-1 text-[10px] font-mono"
              />
              <label className="flex items-center gap-2 cursor-pointer text-[9px] select-none opacity-80">
                <input
                  type="checkbox"
                  checked={Boolean(el.collapseDefaultOpen)}
                  onChange={(e) => updateSelected({ collapseDefaultOpen: e.target.checked })}
                  className="rounded text-accent"
                />
                <span>Start Expanded / Open by Default</span>
              </label>
            </div>
          )}
        </div>

        <div className="pt-1.5 border-t border-[var(--border-main)]">
          <label className="flex items-center gap-2 cursor-pointer text-[10px]">
            <input
              type="checkbox"
              checked={Boolean(el.autoHeight)}
              onChange={(e) => updateSelected({ autoHeight: e.target.checked })}
              className="rounded text-accent focus:ring-accent"
            />
            <span className="select-none">
              Auto-Fit Content Height (Dynamic height based on content)
            </span>
          </label>
        </div>
      </div>

      {/* Hover & Idle Animations + Tooltip */}
      <div
        style={{
          backgroundColor: 'var(--bg-panel-alt)',
          borderColor: 'var(--border-main)',
        }}
        className="p-2.5 rounded-[8px] border space-y-2"
      >
        <div className="grid grid-cols-2 gap-2">
          <label>
            <span style={{ color: 'var(--text-muted)' }} className="block mb-1 text-[10px]">
              Hover Effect {isToyhouseFree ? '(Premium)' : ''}
            </span>
            <select
              value={el.hoverEffect}
              onChange={(e) => updateSelected({ hoverEffect: e.target.value as HoverEffect })}
              style={{ backgroundColor: 'var(--bg-input)', borderColor: 'var(--border-strong)' }}
              className="w-full border rounded-[5px] px-1.5 py-1 text-[11px]"
            >
              <option value="none">None</option>
              <option value="lift">Hover Lift (-4px)</option>
              <option value="tilt">Scrapbook Tilt</option>
              <option value="scale">Smooth Scale</option>
              <option value="glow">Warm Glow</option>
              <option value="fade">Soft Fade</option>
            </select>
          </label>

          <label>
            <span style={{ color: 'var(--text-muted)' }} className="block mb-1 text-[10px]">
              Idle Loop Animation
            </span>
            <select
              value={el.idleAnimation || 'none'}
              onChange={(e) => updateSelected({ idleAnimation: e.target.value as IdleAnimation })}
              style={{ backgroundColor: 'var(--bg-input)', borderColor: 'var(--border-strong)' }}
              className="w-full border rounded-[5px] px-1.5 py-1 text-[11px]"
            >
              <option value="none">None (Static)</option>
              <option value="bounce">Spring Bounce (fa-bounce)</option>
              <option value="rubber_band">Elastic Rubber Band (fa-bounce)</option>
              <option value="float">Gentle Float ↕</option>
              <option value="pulse">Smooth Pulse (fa-beat)</option>
              <option value="heartbeat">Heartbeat Throb (fa-beat)</option>
              <option value="sway">Pendulum Sway (fa-shake)</option>
              <option value="wiggle">Sticker Wiggle (fa-shake)</option>
              <option value="shimmer">Luminous Shimmer (fa-fade)</option>
              <option value="glitch">Cyber Glitch (fa-shake)</option>
              <option value="spin">Vinyl Spin 360° (fa-spin)</option>
            </select>
          </label>
        </div>

        {el.idleAnimation && el.idleAnimation !== 'none' && (
          <div className="space-y-1.5 pt-1 border-t border-black/10">
            <div className="flex items-center justify-between text-[10px]">
              <span style={{ color: 'var(--text-muted)' }}>Toyhouse Free Class:</span>
              <span className="font-mono text-emerald-500 font-semibold">
                .{getFontAwesomeAnimClass(el.idleAnimation)}
              </span>
            </div>
            <label className="block">
              <span style={{ color: 'var(--text-muted)' }} className="block mb-0.5 text-[10px]">
                Animation Duration: {el.animDuration || 2}s
              </span>
              <input
                type="range"
                min="0.5"
                max="6"
                step="0.25"
                value={el.animDuration || 2}
                onChange={(e) => updateSelected({ animDuration: parseFloat(e.target.value) })}
                className="w-full accent-accent"
              />
            </label>
          </div>
        )}

        {isToyhouseFree && el.hoverEffect !== 'none' && (
          <div className="text-[9.5px] text-amber-500 bg-amber-500/10 border border-amber-500/20 rounded-[6px] px-2 py-1.5 leading-snug">
            CSS <code>:hover</code> effects ({el.hoverEffect}) require{' '}
            <strong>Toyhouse Premium / Carrd Pro</strong>. On Toyhouse Free (F2U), use{' '}
            <strong>Hover Tooltip</strong> below or <strong>Collapsible (Click Expand)</strong> above.
          </div>
        )}

        <label className="block">
          <span style={{ color: 'var(--text-muted)' }} className="block mb-1 text-[10px]">
            Hover Tooltip (HTML <code>title</code> — 100% F2U Safe)
          </span>
          <input
            type="text"
            placeholder="Optional text shown when hovering with cursor..."
            value={el.tooltip || ''}
            onChange={(e) => updateSelected({ tooltip: e.target.value })}
            style={{ backgroundColor: 'var(--bg-input)', borderColor: 'var(--border-strong)' }}
            className="w-full border rounded-[5px] px-2 py-1 text-[11px]"
          />
        </label>
      </div>
    </div>
  );
};
