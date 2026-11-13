import React from 'react';
import {
  ArrowDown,
  ArrowUp,
  CircleDot,
  Copy,
  Eye,
  EyeOff,
  Frame,
  Minus,
  Plus,
  Scissors,
  SplitSquareHorizontal,
  Trash2,
} from 'lucide-react';
import {
  BooleanMaskModifier,
  BorderStyle,
  CutoutHoleModifier,
  DesignElement,
  DividerLineModifier,
  ElementModifier,
  InnerFrameModifier,
  ModifierKind,
  SplitModifier,
} from '../types/schema';
import { isModifierProOnly } from '../engine/modifierRenderer';

export function createDefaultModifier(
  kind: ModifierKind,
  el?: DesignElement
): ElementModifier {
  const id = `mod-${kind}-${Date.now().toString().slice(-5)}-${Math.floor(Math.random() * 90 + 10)}`;
  switch (kind) {
    case 'split':
      return {
        id,
        kind: 'split',
        enabled: true,
        axis: 'vertical',
        panes: 2,
        ratio: 50,
        ratio2: 33,
        dividerWidth: 2,
        dividerStyle: 'solid',
        dividerColor: el?.borderColor && el.borderColor !== 'transparent' ? el.borderColor : '#18181B',
        pane1Bg: 'inherit',
        pane2Bg: 'inherit',
        pane3Bg: 'inherit',
        centerBadge: {
          enabled: false,
          shape: 'circle',
          size: 56,
          bgColor: 'transparent',
          borderColor: '#18181B',
          borderWidth: 2,
          text: '',
        },
      };
    case 'cutout_hole':
      return {
        id,
        kind: 'cutout_hole',
        enabled: true,
        mode: 'transparent_hole',
        shape: 'circle',
        xPct: 50,
        yPct: 50,
        widthPx: Math.min(84, Math.max(36, Math.round(Math.min(el?.width || 160, el?.height || 160) * 0.45))),
        heightPx: Math.min(84, Math.max(36, Math.round(Math.min(el?.width || 160, el?.height || 160) * 0.45))),
        ringWidth: 2,
        ringColor: el?.bgColor === '#18181B' || el?.bgColor === '#000000' ? '#FFFFFF' : '#18181B',
        ringStyle: 'solid',
      };
    case 'divider_line':
      return {
        id,
        kind: 'divider_line',
        enabled: true,
        orientation: 'h',
        offsetPct: 50,
        lengthPct: 100,
        thickness: 2,
        style: 'solid',
        color: el?.borderColor && el.borderColor !== 'transparent' ? el.borderColor : '#18181B',
      };
    case 'inner_frame':
      return {
        id,
        kind: 'inner_frame',
        enabled: true,
        frameStyle: 'corner_brackets',
        insetPx: 8,
        thickness: 2,
        borderStyle: 'solid',
        color: el?.borderColor && el.borderColor !== 'transparent' ? el.borderColor : '#18181B',
        radiusPx: 4,
        bracketSizePx: 14,
      };
    case 'boolean_mask':
      return {
        id,
        kind: 'boolean_mask',
        enabled: true,
        operation: 'subtract',
        maskShape: 'star',
        xPct: 50,
        yPct: 50,
        widthPx: 72,
        heightPx: 72,
        rotation: 0,
      };
  }
}

interface ModifierStackProps {
  el: DesignElement;
  updateSelected: (patch: Partial<DesignElement>) => void;
  isToyhouseFree: boolean;
}

const BORDER_STYLES: BorderStyle[] = ['solid', 'dashed', 'dotted', 'double'];

export const ModifierStackSection: React.FC<ModifierStackProps> = ({
  el,
  updateSelected,
  isToyhouseFree,
}) => {
  const mods = el.modifiers || [];

  const setMods = (next: ElementModifier[]) => {
    updateSelected({ modifiers: next });
  };

  const addModifier = (kind: ModifierKind) => {
    const newMod = createDefaultModifier(kind, el);
    setMods([...mods, newMod]);
  };

  const updateModifier = (id: string, patch: Partial<ElementModifier>) => {
    setMods(
      mods.map((m) => (m.id === id ? ({ ...m, ...patch } as ElementModifier) : m))
    );
  };

  const removeModifier = (id: string) => {
    setMods(mods.filter((m) => m.id !== id));
  };

  const duplicateModifier = (mod: ElementModifier) => {
    const copy = {
      ...mod,
      id: `mod-${mod.kind}-${Date.now().toString().slice(-5)}`,
    } as ElementModifier;
    setMods([...mods, copy]);
  };

  const moveModifier = (idx: number, dir: -1 | 1) => {
    const target = idx + dir;
    if (target < 0 || target >= mods.length) return;
    const copy = [...mods];
    const tmp = copy[idx];
    copy[idx] = copy[target];
    copy[target] = tmp;
    setMods(copy);
  };

  const activeSplit = mods.find(
    (m): m is SplitModifier => m.kind === 'split' && m.enabled
  );

  const getModLabel = (kind: ModifierKind) => {
    switch (kind) {
      case 'split':
        return 'Split Panes';
      case 'cutout_hole':
        return 'Cutout / Ring';
      case 'divider_line':
        return 'Overlay Line';
      case 'inner_frame':
        return 'Inner Frame';
      case 'boolean_mask':
        return 'Boolean Mask';
    }
  };

  const getModIcon = (kind: ModifierKind) => {
    switch (kind) {
      case 'split':
        return <SplitSquareHorizontal className="w-3.5 h-3.5 text-accent" />;
      case 'cutout_hole':
        return <CircleDot className="w-3.5 h-3.5 text-accent" />;
      case 'divider_line':
        return <Minus className="w-3.5 h-3.5 text-accent" />;
      case 'inner_frame':
        return <Frame className="w-3.5 h-3.5 text-accent" />;
      case 'boolean_mask':
        return <Scissors className="w-3.5 h-3.5 text-amber-500" />;
    }
  };

  return (
    <div style={{ borderColor: 'var(--border-main)' }} className="pt-3 border-t space-y-2.5">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-1.5">
          <Scissors className="w-3.5 h-3.5 text-accent" />
          <span
            style={{ color: 'var(--accent)' }}
            className="text-[10px] font-mono uppercase font-bold tracking-wider"
          >
            Object Modifiers ({mods.length})
          </span>
        </div>
        {mods.length > 0 && (
          <button
            type="button"
            onClick={() => setMods([])}
            className="text-[9px] font-mono px-1.5 py-0.5 rounded border border-red-500/30 text-red-500 hover:bg-red-500/10"
          >
            Clear All
          </button>
        )}
      </div>

      {/* Add Modifier Palette */}
      <div className="grid grid-cols-2 gap-1.5">
        <button
          type="button"
          onClick={() => addModifier('split')}
          style={{ backgroundColor: 'var(--bg-panel-alt)', borderColor: 'var(--border-strong)' }}
          className="border rounded-[6px] px-2 py-1.5 text-[10px] font-medium flex items-center gap-1.5 hover:border-accent transition"
          title="Split this object into 2 or 3 independent panes with a draggable divider line"
        >
          <Plus className="w-3 h-3 text-accent shrink-0" />
          <span className="truncate">Split Panes</span>
          <span className="ml-auto text-[8px] font-mono px-1 rounded bg-emerald-500/15 text-emerald-500">F2U</span>
        </button>

        <button
          type="button"
          onClick={() => addModifier('cutout_hole')}
          style={{ backgroundColor: 'var(--bg-panel-alt)', borderColor: 'var(--border-strong)' }}
          className="border rounded-[6px] px-2 py-1.5 text-[10px] font-medium flex items-center gap-1.5 hover:border-accent transition"
          title="Punch a real transparent circle/rect hole or add a hollow ring frame"
        >
          <Plus className="w-3 h-3 text-accent shrink-0" />
          <span className="truncate">Cutout / Ring</span>
          <span className="ml-auto text-[8px] font-mono px-1 rounded bg-emerald-500/15 text-emerald-500">F2U</span>
        </button>

        <button
          type="button"
          onClick={() => addModifier('divider_line')}
          style={{ backgroundColor: 'var(--bg-panel-alt)', borderColor: 'var(--border-strong)' }}
          className="border rounded-[6px] px-2 py-1.5 text-[10px] font-medium flex items-center gap-1.5 hover:border-accent transition"
          title="Draw horizontal, vertical, crosshair, or diagonal overlay lines across the box"
        >
          <Plus className="w-3 h-3 text-accent shrink-0" />
          <span className="truncate">Overlay Line</span>
          <span className="ml-auto text-[8px] font-mono px-1 rounded bg-emerald-500/15 text-emerald-500">F2U</span>
        </button>

        <button
          type="button"
          onClick={() => addModifier('inner_frame')}
          style={{ backgroundColor: 'var(--bg-panel-alt)', borderColor: 'var(--border-strong)' }}
          className="border rounded-[6px] px-2 py-1.5 text-[10px] font-medium flex items-center gap-1.5 hover:border-accent transition"
          title="Add an inset border frame or 4 corner L-brackets"
        >
          <Plus className="w-3 h-3 text-accent shrink-0" />
          <span className="truncate">Inner Frame</span>
          <span className="ml-auto text-[8px] font-mono px-1 rounded bg-emerald-500/15 text-emerald-500">F2U</span>
        </button>

        <button
          type="button"
          onClick={() => addModifier('boolean_mask')}
          style={{ backgroundColor: 'var(--bg-panel-alt)', borderColor: 'var(--border-strong)' }}
          className="col-span-2 border rounded-[6px] px-2 py-1.5 text-[10px] font-medium flex items-center gap-1.5 hover:border-amber-500 transition"
          title="Carve custom shapes (Star, Heart, Diamond, Circle, Rect) out of this object via SVG Mask"
        >
          <Plus className="w-3 h-3 text-amber-500 shrink-0" />
          <span>Boolean Subtract / Mask Shape (Star, Heart, Diamond...)</span>
          <span className="ml-auto text-[8px] font-mono px-1 rounded bg-amber-500/15 text-amber-500">PRO</span>
        </button>
      </div>

      {/* Empty Hint */}
      {mods.length === 0 && (
        <div
          style={{ borderColor: 'var(--border-main)', color: 'var(--text-muted)' }}
          className="text-[10px] border border-dashed rounded-[6px] p-2.5 text-center leading-relaxed"
        >
          No modifiers attached. Add a <strong>Split</strong>, <strong>Cutout Hole</strong>, <strong>Line</strong>, or <strong>Corner Frame</strong> to sculpt this box non-destructively.
        </div>
      )}

      {/* Active Modifier Cards */}
      <div className="space-y-2">
        {mods.map((mod, idx) => {
          const isPro = isModifierProOnly(mod, el);
          return (
            <div
              key={mod.id}
              style={{
                backgroundColor: 'var(--bg-panel-alt)',
                borderColor: mod.enabled ? 'var(--border-strong)' : 'var(--border-main)',
                opacity: mod.enabled ? 1 : 0.65,
              }}
              className="border rounded-[7px] overflow-hidden"
            >
              {/* Modifier Card Header */}
              <div
                style={{ borderColor: 'var(--border-main)' }}
                className="px-2 py-1.5 border-b flex items-center justify-between gap-1 bg-black/5"
              >
                <div className="flex items-center gap-1.5 min-w-0">
                  {getModIcon(mod.kind)}
                  <span className="text-[10.5px] font-semibold truncate">
                    #{idx + 1} {getModLabel(mod.kind)}
                  </span>
                  <span
                    className={`text-[8px] font-mono px-1 py-0.2 rounded font-bold ${
                      isPro
                        ? 'bg-amber-500/15 text-amber-500'
                        : 'bg-emerald-500/15 text-emerald-500'
                    }`}
                  >
                    {isPro ? 'PRO' : 'F2U'}
                  </span>
                </div>

                <div className="flex items-center gap-0.5 shrink-0">
                  <button
                    type="button"
                    onClick={() => updateModifier(mod.id, { enabled: !mod.enabled })}
                    className="p-1 rounded hover:bg-black/10"
                    title={mod.enabled ? 'Disable modifier' : 'Enable modifier'}
                  >
                    {mod.enabled ? <Eye className="w-3 h-3" /> : <EyeOff className="w-3 h-3 opacity-50" />}
                  </button>
                  <button
                    type="button"
                    disabled={idx === 0}
                    onClick={() => moveModifier(idx, -1)}
                    className="p-1 rounded hover:bg-black/10 disabled:opacity-30"
                    title="Move Up"
                  >
                    <ArrowUp className="w-3 h-3" />
                  </button>
                  <button
                    type="button"
                    disabled={idx === mods.length - 1}
                    onClick={() => moveModifier(idx, 1)}
                    className="p-1 rounded hover:bg-black/10 disabled:opacity-30"
                    title="Move Down"
                  >
                    <ArrowDown className="w-3 h-3" />
                  </button>
                  <button
                    type="button"
                    onClick={() => duplicateModifier(mod)}
                    className="p-1 rounded hover:bg-black/10"
                    title="Duplicate modifier"
                  >
                    <Copy className="w-3 h-3" />
                  </button>
                  <button
                    type="button"
                    onClick={() => removeModifier(mod.id)}
                    className="p-1 rounded hover:bg-red-500/15 text-red-500"
                    title="Remove modifier"
                  >
                    <Trash2 className="w-3 h-3" />
                  </button>
                </div>
              </div>

              {/* Modifier Body Controls */}
              <div className="p-2 space-y-2 text-[10px]">
                {mod.kind === 'split' && (() => {
                  const s = mod as SplitModifier;
                  return (
                    <>
                      <div className="grid grid-cols-2 gap-1.5">
                        <div>
                          <span style={{ color: 'var(--text-muted)' }} className="block mb-0.5 text-[9px]">
                            Split Direction
                          </span>
                          <div className="grid grid-cols-2 gap-1">
                            <button
                              type="button"
                              onClick={() => updateModifier(s.id, { axis: 'vertical' })}
                              style={
                                s.axis === 'vertical'
                                  ? { backgroundColor: 'var(--accent)', color: '#fff', borderColor: 'var(--accent)' }
                                  : { backgroundColor: 'var(--bg-input)', borderColor: 'var(--border-strong)' }
                              }
                              className="border rounded py-1 text-[9.5px] font-semibold"
                            >
                              Left | Right
                            </button>
                            <button
                              type="button"
                              onClick={() => updateModifier(s.id, { axis: 'horizontal' })}
                              style={
                                s.axis === 'horizontal'
                                  ? { backgroundColor: 'var(--accent)', color: '#fff', borderColor: 'var(--accent)' }
                                  : { backgroundColor: 'var(--bg-input)', borderColor: 'var(--border-strong)' }
                              }
                              className="border rounded py-1 text-[9.5px] font-semibold"
                            >
                              Top / Bot
                            </button>
                          </div>
                        </div>

                        <div>
                          <span style={{ color: 'var(--text-muted)' }} className="block mb-0.5 text-[9px]">
                            Pane Count
                          </span>
                          <div className="grid grid-cols-2 gap-1">
                            {([2, 3] as const).map((p) => (
                              <button
                                key={p}
                                type="button"
                                onClick={() =>
                                  updateModifier(s.id, {
                                    panes: p,
                                    ratio: p === 3 ? 33 : 50,
                                    ratio2: p === 3 ? 33 : undefined,
                                  })
                                }
                                style={
                                  s.panes === p
                                    ? { backgroundColor: 'var(--accent)', color: '#fff', borderColor: 'var(--accent)' }
                                    : { backgroundColor: 'var(--bg-input)', borderColor: 'var(--border-strong)' }
                                }
                                className="border rounded py-1 text-[9.5px] font-mono font-semibold"
                              >
                                {p} Panes
                              </button>
                            ))}
                          </div>
                        </div>
                      </div>

                      <div className="space-y-1">
                        <div className="flex items-center justify-between font-mono text-[9.5px]">
                          <span>Pane 1 Ratio: {s.ratio}%</span>
                          <button
                            type="button"
                            onClick={() =>
                              updateModifier(s.id, {
                                ratio: s.panes === 3 ? 33 : 50,
                                ratio2: s.panes === 3 ? 33 : undefined,
                              })
                            }
                            className="text-[9px] text-accent underline"
                          >
                            Reset Equal
                          </button>
                        </div>
                        <input
                          type="range"
                          min={15}
                          max={s.panes === 3 ? 70 : 85}
                          value={s.ratio}
                          onChange={(e) =>
                            updateModifier(s.id, { ratio: Number(e.target.value) })
                          }
                          className="w-full accent-accent"
                        />
                        {s.panes === 3 && (
                          <>
                            <div className="font-mono text-[9.5px]">
                              Pane 2 Ratio: {s.ratio2 ?? 33}%
                            </div>
                            <input
                              type="range"
                              min={10}
                              max={Math.max(15, 85 - s.ratio)}
                              value={s.ratio2 ?? 33}
                              onChange={(e) =>
                                updateModifier(s.id, { ratio2: Number(e.target.value) })
                              }
                              className="w-full accent-accent"
                            />
                          </>
                        )}
                      </div>

                      {/* Divider Line Controls */}
                      <div className="grid grid-cols-3 gap-1.5">
                        <label>
                          <span style={{ color: 'var(--text-muted)' }} className="block text-[9px] mb-0.5">
                            Line px
                          </span>
                          <input
                            type="number"
                            min={0}
                            max={16}
                            value={s.dividerWidth}
                            onChange={(e) =>
                              updateModifier(s.id, { dividerWidth: Math.max(0, Number(e.target.value)) })
                            }
                            style={{ backgroundColor: 'var(--bg-input)', borderColor: 'var(--border-strong)' }}
                            className="w-full border rounded px-1.5 py-0.5 font-mono text-[10px]"
                          />
                        </label>
                        <label>
                          <span style={{ color: 'var(--text-muted)' }} className="block text-[9px] mb-0.5">
                            Line Style
                          </span>
                          <select
                            value={s.dividerStyle}
                            onChange={(e) =>
                              updateModifier(s.id, { dividerStyle: e.target.value as BorderStyle })
                            }
                            style={{ backgroundColor: 'var(--bg-input)', borderColor: 'var(--border-strong)' }}
                            className="w-full border rounded px-1 py-0.5 text-[10px]"
                          >
                            {BORDER_STYLES.map((st) => (
                              <option key={st} value={st}>{st}</option>
                            ))}
                          </select>
                        </label>
                        <label>
                          <span style={{ color: 'var(--text-muted)' }} className="block text-[9px] mb-0.5">
                            Line Color
                          </span>
                          <input
                            type="color"
                            value={s.dividerColor || '#18181B'}
                            onChange={(e) => updateModifier(s.id, { dividerColor: e.target.value })}
                            className="w-full h-6 rounded border cursor-pointer"
                          />
                        </label>
                      </div>

                      {/* Per-Pane Fill & Text */}
                      <div className="grid grid-cols-2 gap-1.5 pt-1">
                        <div>
                          <div className="flex items-center justify-between mb-0.5">
                            <span style={{ color: 'var(--text-muted)' }} className="text-[9px]">Pane 1 Fill</span>
                            <button
                              type="button"
                              onClick={() => updateModifier(s.id, { pane1Bg: 'inherit' })}
                              className="text-[8.5px] opacity-70 hover:opacity-100 underline"
                            >
                              Inherit
                            </button>
                          </div>
                          <div className="flex items-center gap-1">
                            <input
                              type="color"
                              value={s.pane1Bg && s.pane1Bg !== 'inherit' ? s.pane1Bg : '#18181B'}
                              onChange={(e) => updateModifier(s.id, { pane1Bg: e.target.value })}
                              className="w-7 h-6 rounded border cursor-pointer shrink-0"
                            />
                            <input
                              type="text"
                              placeholder="Pane 1 text..."
                              value={s.pane1Text || ''}
                              onChange={(e) => updateModifier(s.id, { pane1Text: e.target.value })}
                              style={{ backgroundColor: 'var(--bg-input)', borderColor: 'var(--border-strong)' }}
                              className="w-full border rounded px-1.5 py-0.5 text-[9.5px]"
                            />
                          </div>
                        </div>

                        <div>
                          <div className="flex items-center justify-between mb-0.5">
                            <span style={{ color: 'var(--text-muted)' }} className="text-[9px]">Pane 2 Fill</span>
                            <button
                              type="button"
                              onClick={() => updateModifier(s.id, { pane2Bg: 'inherit' })}
                              className="text-[8.5px] opacity-70 hover:opacity-100 underline"
                            >
                              Inherit
                            </button>
                          </div>
                          <div className="flex items-center gap-1">
                            <input
                              type="color"
                              value={s.pane2Bg && s.pane2Bg !== 'inherit' ? s.pane2Bg : '#FFFFFF'}
                              onChange={(e) => updateModifier(s.id, { pane2Bg: e.target.value })}
                              className="w-7 h-6 rounded border cursor-pointer shrink-0"
                            />
                            <input
                              type="text"
                              placeholder="Pane 2 text..."
                              value={s.pane2Text || ''}
                              onChange={(e) => updateModifier(s.id, { pane2Text: e.target.value })}
                              style={{ backgroundColor: 'var(--bg-input)', borderColor: 'var(--border-strong)' }}
                              className="w-full border rounded px-1.5 py-0.5 text-[9.5px]"
                            />
                          </div>
                        </div>

                        {s.panes === 3 && (
                          <div className="col-span-2">
                            <div className="flex items-center justify-between mb-0.5">
                              <span style={{ color: 'var(--text-muted)' }} className="text-[9px]">Pane 3 Fill</span>
                              <button
                                type="button"
                                onClick={() => updateModifier(s.id, { pane3Bg: 'inherit' })}
                                className="text-[8.5px] opacity-70 hover:opacity-100 underline"
                              >
                                Inherit
                              </button>
                            </div>
                            <div className="flex items-center gap-1">
                              <input
                                type="color"
                                value={s.pane3Bg && s.pane3Bg !== 'inherit' ? s.pane3Bg : '#F4F4F5'}
                                onChange={(e) => updateModifier(s.id, { pane3Bg: e.target.value })}
                                className="w-7 h-6 rounded border cursor-pointer shrink-0"
                              />
                              <input
                                type="text"
                                placeholder="Pane 3 text..."
                                value={s.pane3Text || ''}
                                onChange={(e) => updateModifier(s.id, { pane3Text: e.target.value })}
                                style={{ backgroundColor: 'var(--bg-input)', borderColor: 'var(--border-strong)' }}
                                className="w-full border rounded px-1.5 py-0.5 text-[9.5px]"
                              />
                            </div>
                          </div>
                        )}
                      </div>

                      {/* Split Divider Center Badge / Ring Mount */}
                      <div style={{ borderColor: 'var(--border-main)' }} className="pt-1.5 border-t space-y-1.5">
                        <label className="flex items-center justify-between cursor-pointer">
                          <span className="font-semibold text-[9.5px]">Center Ring / Badge on Split Line</span>
                          <input
                            type="checkbox"
                            checked={Boolean(s.centerBadge?.enabled)}
                            onChange={(e) =>
                              updateModifier(s.id, {
                                centerBadge: {
                                  ...(s.centerBadge || {
                                    shape: 'circle',
                                    size: 56,
                                    bgColor: 'transparent',
                                    borderColor: '#18181B',
                                    borderWidth: 2,
                                    text: '',
                                  }),
                                  enabled: e.target.checked,
                                },
                              })
                            }
                            className="rounded"
                          />
                        </label>
                        {s.centerBadge?.enabled && (
                          <div className="grid grid-cols-3 gap-1.5">
                            <select
                              value={s.centerBadge.shape}
                              onChange={(e) =>
                                updateModifier(s.id, {
                                  centerBadge: { ...s.centerBadge!, shape: e.target.value as 'circle' | 'pill' | 'square' },
                                })
                              }
                              style={{ backgroundColor: 'var(--bg-input)', borderColor: 'var(--border-strong)' }}
                              className="border rounded px-1 py-0.5 text-[9.5px]"
                            >
                              <option value="circle">Circle</option>
                              <option value="pill">Pill</option>
                              <option value="square">Square</option>
                            </select>
                            <input
                              type="number"
                              min={18}
                              max={180}
                              value={s.centerBadge.size}
                              onChange={(e) =>
                                updateModifier(s.id, {
                                  centerBadge: { ...s.centerBadge!, size: Number(e.target.value) },
                                })
                              }
                              title="Size px"
                              style={{ backgroundColor: 'var(--bg-input)', borderColor: 'var(--border-strong)' }}
                              className="border rounded px-1 py-0.5 font-mono text-[9.5px]"
                            />
                            <input
                              type="color"
                              value={s.centerBadge.borderColor || '#18181B'}
                              onChange={(e) =>
                                updateModifier(s.id, {
                                  centerBadge: { ...s.centerBadge!, borderColor: e.target.value },
                                })
                              }
                              title="Ring / Border Color"
                              className="w-full h-6 rounded border cursor-pointer"
                            />
                            <div className="flex items-center gap-1 col-span-2">
                              <input
                                type="text"
                                placeholder="Optional text (e.g. VS)"
                                value={s.centerBadge.text || ''}
                                onChange={(e) =>
                                  updateModifier(s.id, {
                                    centerBadge: { ...s.centerBadge!, text: e.target.value },
                                  })
                                }
                                style={{ backgroundColor: 'var(--bg-input)', borderColor: 'var(--border-strong)' }}
                                className="w-full border rounded px-1.5 py-0.5 text-[9.5px]"
                              />
                            </div>
                            <button
                              type="button"
                              onClick={() =>
                                updateModifier(s.id, {
                                  centerBadge: {
                                    ...s.centerBadge!,
                                    bgColor: s.centerBadge!.bgColor === 'transparent' ? '#FFFFFF' : 'transparent',
                                  },
                                })
                              }
                              style={{ backgroundColor: 'var(--bg-input)', borderColor: 'var(--border-strong)' }}
                              className="border rounded px-1 py-0.5 text-[9px] font-mono"
                              title="Toggle Transparent vs Filled Badge"
                            >
                              {s.centerBadge.bgColor === 'transparent' ? 'Hollow' : 'Filled'}
                            </button>
                          </div>
                        )}
                      </div>
                    </>
                  );
                })()}

                {mod.kind === 'cutout_hole' && (() => {
                  const h = mod as CutoutHoleModifier;
                  return (
                    <>
                      <div className="grid grid-cols-2 gap-1">
                        <button
                          type="button"
                          onClick={() => updateModifier(h.id, { mode: 'transparent_hole' })}
                          style={
                            h.mode === 'transparent_hole'
                              ? { backgroundColor: 'var(--accent)', color: '#fff', borderColor: 'var(--accent)' }
                              : { backgroundColor: 'var(--bg-input)', borderColor: 'var(--border-strong)' }
                          }
                          className="border rounded py-1 text-[9.5px] font-semibold"
                        >
                          Real Hole Punch
                        </button>
                        <button
                          type="button"
                          onClick={() => updateModifier(h.id, { mode: 'hollow_ring' })}
                          style={
                            h.mode === 'hollow_ring'
                              ? { backgroundColor: 'var(--accent)', color: '#fff', borderColor: 'var(--accent)' }
                              : { backgroundColor: 'var(--bg-input)', borderColor: 'var(--border-strong)' }
                          }
                          className="border rounded py-1 text-[9.5px] font-semibold"
                        >
                          Hollow Ring Only
                        </button>
                      </div>

                      <div className="grid grid-cols-4 gap-1">
                        {(['circle', 'rect', 'pill', 'arch', 'diamond', 'star', 'ticket_corners'] as const).map((shp) => (
                          <button
                            key={shp}
                            type="button"
                            onClick={() => updateModifier(h.id, { shape: shp })}
                            style={
                              h.shape === shp
                                ? { backgroundColor: 'var(--accent)', color: '#fff', borderColor: 'var(--accent)' }
                                : { backgroundColor: 'var(--bg-input)', borderColor: 'var(--border-strong)' }
                            }
                            className="border rounded py-0.5 text-[9px] font-mono"
                          >
                            {shp === 'ticket_corners' ? 'Notches ✦' : shp === 'diamond' || shp === 'star' ? `${shp} ✦` : shp}
                          </button>
                        ))}
                      </div>

                      <div className="flex items-center gap-1.5">
                        <button
                          type="button"
                          onClick={() => updateModifier(h.id, { xPct: 50, yPct: 50 })}
                          style={{ backgroundColor: 'var(--bg-input)', borderColor: 'var(--border-strong)' }}
                          className="border rounded px-2 py-0.5 text-[9px] font-mono hover:border-accent"
                        >
                          Snap Center (50%/50%)
                        </button>
                        {activeSplit && (
                          <button
                            type="button"
                            onClick={() =>
                              updateModifier(h.id, {
                                xPct: activeSplit.axis === 'vertical' ? activeSplit.ratio : 50,
                                yPct: activeSplit.axis === 'horizontal' ? activeSplit.ratio : 50,
                              })
                            }
                            style={{ backgroundColor: 'var(--bg-input)', borderColor: 'var(--border-strong)' }}
                            className="border rounded px-2 py-0.5 text-[9px] font-mono text-accent hover:border-accent"
                          >
                            Snap to Split Line
                          </button>
                        )}
                      </div>

                      {h.shape !== 'ticket_corners' && (
                        <div className="grid grid-cols-2 gap-2">
                          <label>
                            <span style={{ color: 'var(--text-muted)' }} className="block font-mono text-[9px]">
                              X Pos: {h.xPct}%
                            </span>
                            <input
                              type="range"
                              min={0}
                              max={100}
                              value={h.xPct}
                              onChange={(e) => updateModifier(h.id, { xPct: Number(e.target.value) })}
                              className="w-full accent-accent"
                            />
                          </label>
                          <label>
                            <span style={{ color: 'var(--text-muted)' }} className="block font-mono text-[9px]">
                              Y Pos: {h.yPct}%
                            </span>
                            <input
                              type="range"
                              min={0}
                              max={100}
                              value={h.yPct}
                              onChange={(e) => updateModifier(h.id, { yPct: Number(e.target.value) })}
                              className="w-full accent-accent"
                            />
                          </label>
                        </div>
                      )}

                      <div className="grid grid-cols-2 gap-2">
                        <label>
                          <span style={{ color: 'var(--text-muted)' }} className="block font-mono text-[9px]">
                            {h.shape === 'circle' || h.shape === 'ticket_corners' ? 'Diameter' : 'Width'}: {h.widthPx}px
                          </span>
                          <input
                            type="range"
                            min={12}
                            max={280}
                            value={h.widthPx}
                            onChange={(e) => {
                              const v = Number(e.target.value);
                              updateModifier(h.id, h.shape === 'circle' ? { widthPx: v, heightPx: v } : { widthPx: v });
                            }}
                            className="w-full accent-accent"
                          />
                        </label>
                        {h.shape !== 'circle' && h.shape !== 'ticket_corners' && (
                          <label>
                            <span style={{ color: 'var(--text-muted)' }} className="block font-mono text-[9px]">
                              Height: {h.heightPx}px
                            </span>
                            <input
                              type="range"
                              min={12}
                              max={280}
                              value={h.heightPx}
                              onChange={(e) => updateModifier(h.id, { heightPx: Number(e.target.value) })}
                              className="w-full accent-accent"
                            />
                          </label>
                        )}
                      </div>

                      {h.shape !== 'ticket_corners' && (
                        <div className="grid grid-cols-3 gap-1.5">
                          <label>
                            <span style={{ color: 'var(--text-muted)' }} className="block text-[9px] mb-0.5">
                              Ring px
                            </span>
                            <input
                              type="number"
                              min={0}
                              max={16}
                              value={h.ringWidth}
                              onChange={(e) => updateModifier(h.id, { ringWidth: Number(e.target.value) })}
                              style={{ backgroundColor: 'var(--bg-input)', borderColor: 'var(--border-strong)' }}
                              className="w-full border rounded px-1.5 py-0.5 font-mono text-[10px]"
                            />
                          </label>
                          <label>
                            <span style={{ color: 'var(--text-muted)' }} className="block text-[9px] mb-0.5">
                              Ring Style
                            </span>
                            <select
                              value={h.ringStyle || 'solid'}
                              onChange={(e) => updateModifier(h.id, { ringStyle: e.target.value as BorderStyle })}
                              style={{ backgroundColor: 'var(--bg-input)', borderColor: 'var(--border-strong)' }}
                              className="w-full border rounded px-1 py-0.5 text-[10px]"
                            >
                              {BORDER_STYLES.map((st) => (
                                <option key={st} value={st}>{st}</option>
                              ))}
                            </select>
                          </label>
                          <label>
                            <span style={{ color: 'var(--text-muted)' }} className="block text-[9px] mb-0.5">
                              Ring Color
                            </span>
                            <input
                              type="color"
                              value={h.ringColor || '#18181B'}
                              onChange={(e) => updateModifier(h.id, { ringColor: e.target.value })}
                              className="w-full h-6 rounded border cursor-pointer"
                            />
                          </label>
                        </div>
                      )}
                    </>
                  );
                })()}

                {mod.kind === 'divider_line' && (() => {
                  const l = mod as DividerLineModifier;
                  return (
                    <>
                      <div className="grid grid-cols-5 gap-1">
                        {(
                          [
                            { id: 'h', label: 'H —' },
                            { id: 'v', label: 'V |' },
                            { id: 'cross', label: 'Cross +' },
                            { id: 'diag_fwd', label: '/ PRO' },
                            { id: 'diag_back', label: '\\ PRO' },
                          ] as const
                        ).map((opt) => (
                          <button
                            key={opt.id}
                            type="button"
                            onClick={() => updateModifier(l.id, { orientation: opt.id })}
                            style={
                              l.orientation === opt.id
                                ? { backgroundColor: 'var(--accent)', color: '#fff', borderColor: 'var(--accent)' }
                                : { backgroundColor: 'var(--bg-input)', borderColor: 'var(--border-strong)' }
                            }
                            className="border rounded py-1 text-[9px] font-mono font-semibold"
                          >
                            {opt.label}
                          </button>
                        ))}
                      </div>

                      <div className="grid grid-cols-2 gap-2">
                        <label>
                          <div className="flex items-center justify-between font-mono text-[9px]">
                            <span>Offset: {l.offsetPct}%</span>
                            <button
                              type="button"
                              onClick={() => updateModifier(l.id, { offsetPct: 50 })}
                              className="text-accent underline"
                            >
                              Center
                            </button>
                          </div>
                          <input
                            type="range"
                            min={0}
                            max={100}
                            value={l.offsetPct}
                            onChange={(e) => updateModifier(l.id, { offsetPct: Number(e.target.value) })}
                            className="w-full accent-accent"
                          />
                        </label>
                        <label>
                          <span style={{ color: 'var(--text-muted)' }} className="block font-mono text-[9px]">
                            Length: {l.lengthPct}%
                          </span>
                          <input
                            type="range"
                            min={10}
                            max={100}
                            value={l.lengthPct}
                            onChange={(e) => updateModifier(l.id, { lengthPct: Number(e.target.value) })}
                            className="w-full accent-accent"
                          />
                        </label>
                      </div>

                      <div className="grid grid-cols-3 gap-1.5">
                        <label>
                          <span style={{ color: 'var(--text-muted)' }} className="block text-[9px] mb-0.5">
                            Thick px
                          </span>
                          <input
                            type="number"
                            min={1}
                            max={16}
                            value={l.thickness}
                            onChange={(e) => updateModifier(l.id, { thickness: Math.max(1, Number(e.target.value)) })}
                            style={{ backgroundColor: 'var(--bg-input)', borderColor: 'var(--border-strong)' }}
                            className="w-full border rounded px-1.5 py-0.5 font-mono text-[10px]"
                          />
                        </label>
                        <label>
                          <span style={{ color: 'var(--text-muted)' }} className="block text-[9px] mb-0.5">
                            Style
                          </span>
                          <select
                            value={l.style}
                            onChange={(e) => updateModifier(l.id, { style: e.target.value as BorderStyle })}
                            style={{ backgroundColor: 'var(--bg-input)', borderColor: 'var(--border-strong)' }}
                            className="w-full border rounded px-1 py-0.5 text-[10px]"
                          >
                            {BORDER_STYLES.map((st) => (
                              <option key={st} value={st}>{st}</option>
                            ))}
                          </select>
                        </label>
                        <label>
                          <span style={{ color: 'var(--text-muted)' }} className="block text-[9px] mb-0.5">
                            Color
                          </span>
                          <input
                            type="color"
                            value={l.color || '#18181B'}
                            onChange={(e) => updateModifier(l.id, { color: e.target.value })}
                            className="w-full h-6 rounded border cursor-pointer"
                          />
                        </label>
                      </div>
                    </>
                  );
                })()}

                {mod.kind === 'inner_frame' && (() => {
                  const f = mod as InnerFrameModifier;
                  const usesBracketSize =
                    f.frameStyle === 'corner_brackets' ||
                    f.frameStyle === 'notched_corners' ||
                    f.frameStyle === 'ornate_filigree';
                  return (
                    <>
                      <div className="grid grid-cols-3 gap-1">
                        {(
                          [
                            { id: 'corner_brackets', label: 'Brackets ⌜⌝' },
                            { id: 'inset_border', label: 'Inset □' },
                            { id: 'double_mat', label: 'Double Mat ▣' },
                            { id: 'dashed_stitch', label: 'Stitch ╌' },
                            { id: 'notched_corners', label: 'Notched ⌞⌝' },
                            { id: 'ornate_filigree', label: 'Filigree ✦' },
                          ] as const
                        ).map((opt) => (
                          <button
                            key={opt.id}
                            type="button"
                            onClick={() => updateModifier(f.id, { frameStyle: opt.id })}
                            style={
                              f.frameStyle === opt.id
                                ? { backgroundColor: 'var(--accent)', color: '#fff', borderColor: 'var(--accent)' }
                                : { backgroundColor: 'var(--bg-input)', borderColor: 'var(--border-strong)' }
                            }
                            className="border rounded py-1 text-[9px] font-semibold truncate px-1"
                          >
                            {opt.label}
                          </button>
                        ))}
                      </div>

                      <div className="grid grid-cols-3 gap-1.5">
                        <label>
                          <span style={{ color: 'var(--text-muted)' }} className="block text-[9px] mb-0.5">
                            Inset px
                          </span>
                          <input
                            type="number"
                            min={2}
                            max={40}
                            value={f.insetPx}
                            onChange={(e) => updateModifier(f.id, { insetPx: Number(e.target.value) })}
                            style={{ backgroundColor: 'var(--bg-input)', borderColor: 'var(--border-strong)' }}
                            className="w-full border rounded px-1.5 py-0.5 font-mono text-[10px]"
                          />
                        </label>
                        <label>
                          <span style={{ color: 'var(--text-muted)' }} className="block text-[9px] mb-0.5">
                            {usesBracketSize
                              ? f.frameStyle === 'ornate_filigree'
                                ? 'Corner Stud px'
                                : f.frameStyle === 'notched_corners'
                                  ? 'Notch px'
                                  : 'Bracket px'
                              : 'Radius px'}
                          </span>
                          <input
                            type="number"
                            min={4}
                            max={48}
                            value={usesBracketSize ? f.bracketSizePx : f.radiusPx}
                            onChange={(e) =>
                              updateModifier(
                                f.id,
                                usesBracketSize
                                  ? { bracketSizePx: Number(e.target.value) }
                                  : { radiusPx: Number(e.target.value) }
                              )
                            }
                            style={{ backgroundColor: 'var(--bg-input)', borderColor: 'var(--border-strong)' }}
                            className="w-full border rounded px-1.5 py-0.5 font-mono text-[10px]"
                          />
                        </label>
                        <label>
                          <span style={{ color: 'var(--text-muted)' }} className="block text-[9px] mb-0.5">
                            Color
                          </span>
                          <input
                            type="color"
                            value={f.color || '#18181B'}
                            onChange={(e) => updateModifier(f.id, { color: e.target.value })}
                            className="w-full h-6 rounded border cursor-pointer"
                          />
                        </label>
                      </div>
                    </>
                  );
                })()}

                {mod.kind === 'boolean_mask' && (() => {
                  const b = mod as BooleanMaskModifier;
                  return (
                    <>
                      <div className="grid grid-cols-2 gap-1">
                        <button
                          type="button"
                          onClick={() => updateModifier(b.id, { operation: 'subtract' })}
                          style={
                            b.operation === 'subtract'
                              ? { backgroundColor: 'var(--accent)', color: '#fff', borderColor: 'var(--accent)' }
                              : { backgroundColor: 'var(--bg-input)', borderColor: 'var(--border-strong)' }
                          }
                          className="border rounded py-1 text-[9.5px] font-semibold"
                        >
                          Subtract (Cut Out)
                        </button>
                        <button
                          type="button"
                          onClick={() => updateModifier(b.id, { operation: 'intersect' })}
                          style={
                            b.operation === 'intersect'
                              ? { backgroundColor: 'var(--accent)', color: '#fff', borderColor: 'var(--accent)' }
                              : { backgroundColor: 'var(--bg-input)', borderColor: 'var(--border-strong)' }
                          }
                          className="border rounded py-1 text-[9.5px] font-semibold"
                        >
                          Intersect (Keep)
                        </button>
                      </div>

                      <div className="grid grid-cols-3 gap-1">
                        {(
                          [
                            { id: 'circle', label: 'Circle (F2U)' },
                            { id: 'rect', label: 'Rect (F2U)' },
                            { id: 'arch', label: 'Arch (F2U)' },
                            { id: 'diamond', label: 'Diamond' },
                            { id: 'hexagon', label: 'Hexagon' },
                            { id: 'octagon', label: 'Octagon' },
                            { id: 'cross_star', label: '4-Star' },
                            { id: 'scallop', label: 'Scallop' },
                            { id: 'shield', label: 'Shield' },
                            { id: 'star', label: 'Star' },
                            { id: 'heart', label: 'Heart' },
                          ] as const
                        ).map((shp) => (
                          <button
                            key={shp.id}
                            type="button"
                            onClick={() => updateModifier(b.id, { maskShape: shp.id })}
                            style={
                              b.maskShape === shp.id
                                ? { backgroundColor: 'var(--accent)', color: '#fff', borderColor: 'var(--accent)' }
                                : { backgroundColor: 'var(--bg-input)', borderColor: 'var(--border-strong)' }
                            }
                            className="border rounded py-0.5 px-1 text-[8.5px] font-mono truncate"
                          >
                            {shp.label}
                          </button>
                        ))}
                      </div>

                      <div className="grid grid-cols-2 gap-2">
                        <label>
                          <span style={{ color: 'var(--text-muted)' }} className="block font-mono text-[9px]">
                            X: {b.xPct}%
                          </span>
                          <input
                            type="range"
                            min={0}
                            max={100}
                            value={b.xPct}
                            onChange={(e) => updateModifier(b.id, { xPct: Number(e.target.value) })}
                            className="w-full accent-accent"
                          />
                        </label>
                        <label>
                          <span style={{ color: 'var(--text-muted)' }} className="block font-mono text-[9px]">
                            Y: {b.yPct}%
                          </span>
                          <input
                            type="range"
                            min={0}
                            max={100}
                            value={b.yPct}
                            onChange={(e) => updateModifier(b.id, { yPct: Number(e.target.value) })}
                            className="w-full accent-accent"
                          />
                        </label>
                        <label>
                          <span style={{ color: 'var(--text-muted)' }} className="block font-mono text-[9px]">
                            Width: {b.widthPx}px
                          </span>
                          <input
                            type="range"
                            min={16}
                            max={300}
                            value={b.widthPx}
                            onChange={(e) => updateModifier(b.id, { widthPx: Number(e.target.value) })}
                            className="w-full accent-accent"
                          />
                        </label>
                        <label>
                          <span style={{ color: 'var(--text-muted)' }} className="block font-mono text-[9px]">
                            Height: {b.heightPx}px
                          </span>
                          <input
                            type="range"
                            min={16}
                            max={300}
                            value={b.heightPx}
                            onChange={(e) => updateModifier(b.id, { heightPx: Number(e.target.value) })}
                            className="w-full accent-accent"
                          />
                        </label>
                      </div>

                      <label className="block">
                        <span style={{ color: 'var(--text-muted)' }} className="block font-mono text-[9px]">
                          Rotate Mask: {b.rotation || 0}°
                        </span>
                        <input
                          type="range"
                          min={-180}
                          max={180}
                          value={b.rotation || 0}
                          onChange={(e) => updateModifier(b.id, { rotation: Number(e.target.value) })}
                          className="w-full accent-accent"
                        />
                      </label>
                    </>
                  );
                })()}

                {isToyhouseFree && isPro && (
                  <div className="text-[9px] text-amber-500 bg-amber-500/10 border border-amber-500/20 rounded px-2 py-1 leading-snug">
                    This modifier uses SVG <code>mask-image</code> or <code>rotate()</code> — Toyhouse Free may strip it. Use Toyhouse Premium or keep single solid Hole Punch / Hollow Ring / H-V Split for 100% F2U.
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

