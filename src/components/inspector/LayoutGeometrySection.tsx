import React from 'react';
import { Boxes, Layers, Link as LinkIcon, Unlink } from 'lucide-react';
import { DesignElement, LayoutMode, SplitModifier } from '../../types/schema';
import { isPureContainerType } from '../../data/purePrimitives';
import { getFontAwesomeRotationClass } from '../../engine/layoutSolver';
import { BoxModelInspectorSection, OverflowAndConstraintsSection } from '../PureInspectorSections';
import { InspectorSubExpander } from './InspectorCollapsibleSection';

export type CanvasAlignAction =
  | 'left'
  | 'center-x'
  | 'right'
  | 'top'
  | 'center-y'
  | 'bottom'
  | 'full-w';

export interface QuickAlignToolbarProps {
  pinnedOverlay: boolean;
  onTogglePinnedOverlay: (next: boolean) => void;
  onAlignSelectedOnCanvas: (align: CanvasAlignAction) => void;
}

const ALIGN_BUTTONS: ReadonlyArray<{ id: CanvasAlignAction; label: string; title: string }> = [
  { id: 'left', label: '⇤L', title: 'Align Left' },
  { id: 'center-x', label: '↔C', title: 'Center Horizontally' },
  { id: 'right', label: 'R⇥', title: 'Align Right' },
  { id: 'top', label: '⇡T', title: 'Align Top' },
  { id: 'center-y', label: '↕M', title: 'Center Vertically' },
  { id: 'bottom', label: 'B⇣', title: 'Align Bottom' },
  { id: 'full-w', label: '100%', title: 'Expand to Full Canvas Width' },
];

/** Pinned Figma-style alignment toolbar rendered in the sticky element header. */
export const QuickAlignToolbar: React.FC<QuickAlignToolbarProps> = ({
  pinnedOverlay,
  onTogglePinnedOverlay,
  onAlignSelectedOnCanvas,
}) => {
  return (
    <div className="flex items-center gap-1 pt-0.5">
      <div className="flex-1 grid grid-cols-7 gap-1 text-[9.5px] font-mono min-w-0">
        {ALIGN_BUTTONS.map((btn) => (
          <button
            key={btn.id}
            type="button"
            onClick={() => onAlignSelectedOnCanvas(btn.id)}
            style={{
              backgroundColor: 'var(--bg-input)',
              borderColor: 'var(--border-strong)',
            }}
            className="py-1 px-0.5 rounded-[4px] border hover:border-[var(--accent)] text-center whitespace-nowrap transition"
            title={btn.title}
          >
            {btn.label}
          </button>
        ))}
      </div>
      <button
        type="button"
        onClick={() => onTogglePinnedOverlay(!pinnedOverlay)}
        style={
          pinnedOverlay
            ? {
                backgroundColor: 'var(--accent-soft)',
                borderColor: 'var(--accent)',
                color: 'var(--accent)',
              }
            : {
                backgroundColor: 'var(--bg-input)',
                borderColor: 'var(--border-strong)',
                color: 'var(--text-muted)',
              }
        }
        className="px-1.5 py-1 rounded-[4px] border text-[9.5px] font-mono font-semibold shrink-0 transition"
        title="Float Overlay: layer independently above layout flow"
      >
        Float
      </button>
    </div>
  );
};

interface LayoutGeometrySectionProps {
  el: DesignElement;
  allElements: DesignElement[];
  containerCandidates: DesignElement[];
  nestedChildren: DesignElement[];
  layoutMode: LayoutMode;
  editingContainerId: string | null;
  isToyhouseFree: boolean;
  updateSelected: (patch: Partial<DesignElement>) => void;
  onSelectElementById: (id: string) => void;
  onNestIntoContainer: (childId: string, containerId: string | null) => void;
  onPopOutFromContainer: (childId: string) => void;
  onReorderNestedChild: (parentId: string, childId: string, dir: 'up' | 'down') => void;
  onEnterContainerIsolation: (containerId: string) => void;
  onExitContainerIsolation: () => void;
}

/** Position, sizing, auto-fit height, 4-corner border radii, box model, and container nesting controls. */
export const LayoutGeometrySection: React.FC<LayoutGeometrySectionProps> = ({
  el,
  allElements,
  containerCandidates,
  nestedChildren,
  layoutMode,
  editingContainerId,
  isToyhouseFree,
  updateSelected,
  onSelectElementById,
  onNestIntoContainer,
  onPopOutFromContainer,
  onReorderNestedChild,
  onEnterContainerIsolation,
  onExitContainerIsolation,
}) => {
  const parentEl = el.parentId ? allElements.find((item) => item.id === el.parentId) : undefined;
  const parentSplit = parentEl?.modifiers?.find(
    (m): m is SplitModifier => m.kind === 'split' && m.enabled
  );
  const canNestIntoParent =
    el.type !== 'box' &&
    el.type !== 'folder_header' &&
    (containerCandidates.length > 0 || Boolean(el.parentId));
  const isContainerBlock = isPureContainerType(el.type) || nestedChildren.length > 0;
  const hasBoxModelOverrides = Boolean(
    el.padding ||
      el.marginT ||
      el.marginR ||
      el.marginB ||
      el.marginL ||
      (el.overflowY && el.overflowY !== 'hidden') ||
      (el.overflowX && el.overflowX !== 'hidden') ||
      el.maxHeightPx ||
      el.aspectRatio
  );

  return (
    <div className="space-y-2.5">
      {/* Position, Size & Auto-Fit Height */}
      <div className="space-y-2">
        <div className="grid grid-cols-5 gap-1.5 font-mono text-[10px]">
          <label>
            <span style={{ color: 'var(--text-muted)' }} className="block mb-0.5">X</span>
            <input
              type="number"
              value={el.x}
              onChange={(e) => updateSelected({ x: parseInt(e.target.value, 10) || 0 })}
              style={{ backgroundColor: 'var(--bg-input)', borderColor: 'var(--border-strong)' }}
              className="w-full border rounded-[4px] px-1 py-0.5 text-center"
            />
          </label>
          <label>
            <span style={{ color: 'var(--text-muted)' }} className="block mb-0.5">Y</span>
            <input
              type="number"
              value={el.y}
              onChange={(e) => updateSelected({ y: parseInt(e.target.value, 10) || 0 })}
              style={{ backgroundColor: 'var(--bg-input)', borderColor: 'var(--border-strong)' }}
              className="w-full border rounded-[4px] px-1 py-0.5 text-center"
            />
          </label>
          <label>
            <span style={{ color: 'var(--text-muted)' }} className="block mb-0.5">W</span>
            <input
              type="number"
              min={10}
              max={2400}
              value={el.width || ''}
              onChange={(e) => {
                const val = parseInt(e.target.value, 10);
                updateSelected({ width: Number.isNaN(val) ? 0 : val });
              }}
              onBlur={() => updateSelected({ width: Math.max(10, Math.min(2400, el.width || 120)) })}
              style={{ backgroundColor: 'var(--bg-input)', borderColor: 'var(--border-strong)' }}
              className="w-full border rounded-[4px] px-1 py-0.5 text-center font-mono text-[10px]"
            />
          </label>
          <label>
            <span style={{ color: 'var(--text-muted)' }} className="block mb-0.5">H</span>
            <input
              type="number"
              min={10}
              max={2400}
              value={el.height || ''}
              onChange={(e) => {
                const val = parseInt(e.target.value, 10);
                updateSelected({ height: Number.isNaN(val) ? 0 : val });
              }}
              onBlur={() => updateSelected({ height: Math.max(10, Math.min(2400, el.height || 60)) })}
              style={{ backgroundColor: 'var(--bg-input)', borderColor: 'var(--border-strong)' }}
              className="w-full border rounded-[4px] px-1 py-0.5 text-center font-mono text-[10px]"
            />
          </label>
          <label>
            <span style={{ color: 'var(--text-muted)' }} className="block mb-0.5">Cols</span>
            <input
              type="number"
              min={2}
              max={12}
              value={el.colSpan || 6}
              onChange={(e) =>
                updateSelected({
                  colSpan: Math.max(2, Math.min(12, parseInt(e.target.value, 10) || 6)),
                })
              }
              style={{ backgroundColor: 'var(--bg-input)', borderColor: 'var(--border-strong)' }}
              className="w-full border rounded-[4px] px-1 py-0.5 text-center"
              title="Bootstrap / Block Grid Column Span (2-12)"
            />
          </label>
        </div>

        <label className="flex items-center gap-2 cursor-pointer text-[10px] pt-0.5">
          <input
            type="checkbox"
            checked={Boolean(el.autoHeight)}
            onChange={(e) => updateSelected({ autoHeight: e.target.checked })}
            className="rounded text-accent focus:ring-accent"
          />
          <span className="select-none" style={{ color: 'var(--text-muted)' }}>
            Auto-Fit Content Height (Dynamic height based on content)
          </span>
        </label>

        <div className="space-y-2">
          <div>
            <div className="flex flex-wrap items-center justify-between gap-1 mb-0.5">
              <span style={{ color: 'var(--text-muted)' }} className="text-[10px] whitespace-nowrap">
                Rotation ({el.rotation || 0}°)
              </span>
              <div className="flex flex-wrap items-center gap-1">
                {[0, 90, 180, -90].map((deg) => (
                  <button
                    key={deg}
                    type="button"
                    onClick={() => updateSelected({ rotation: deg })}
                    style={
                      (el.rotation || 0) === deg
                        ? { backgroundColor: 'var(--accent)', color: '#fff', borderColor: 'var(--accent)' }
                        : { backgroundColor: 'var(--bg-input)', color: 'var(--text-muted)', borderColor: 'var(--border-main)' }
                    }
                    className="px-1.5 py-0.5 rounded text-[9px] font-mono border"
                    title={deg === 0 ? 'Reset Rotation' : `Snap to ${deg}° (F2U Safe)`}
                  >
                    {deg}°
                  </button>
                ))}
              </div>
            </div>
            <input
              type="range"
              min={-180}
              max={180}
              value={el.rotation || 0}
              onChange={(e) => updateSelected({ rotation: parseInt(e.target.value, 10) || 0 })}
              className="w-full accent-[var(--accent)]"
            />
            {isToyhouseFree && (el.rotation || 0) !== 0 && (
              <div className="text-[9px] mt-0.5 font-mono">
                {getFontAwesomeRotationClass(el.rotation) ? (
                  <span className="text-emerald-500">
                    ✓ F2U Native (.{getFontAwesomeRotationClass(el.rotation)})
                  </span>
                ) : (
                  <span className="text-amber-500">
                    ⚠ F2U supports 90°/180°/270°; arbitrary° needs Premium
                  </span>
                )}
              </div>
            )}
          </div>
          <label className="block">
            <div className="flex items-center justify-between text-[10px] mb-0.5">
              <span style={{ color: 'var(--text-muted)' }}>Opacity</span>
              <span className="font-mono text-[10px]">{el.opacity ?? 100}%</span>
            </div>
            <input
              type="range"
              min={20}
              max={100}
              value={el.opacity ?? 100}
              onChange={(e) => updateSelected({ opacity: parseInt(e.target.value, 10) || 100 })}
              className="w-full accent-[var(--accent)]"
            />
          </label>
        </div>

        {/* Single Border Radius Controller (Linked vs 4-Corner) */}
        <div className="space-y-1.5 pt-1.5 border-t border-[var(--border-main)]">
          <div className="flex items-center justify-between">
            <span style={{ color: 'var(--text-muted)' }} className="text-[10px]">
              Corner Border Radius (px)
            </span>
            <button
              type="button"
              onClick={() => {
                const nowLinked = el.cornersLinked === false;
                if (nowLinked) {
                  const r = el.borderRadius || 0;
                  updateSelected({
                    cornersLinked: true,
                    radiusTL: r,
                    radiusTR: r,
                    radiusBR: r,
                    radiusBL: r,
                  });
                } else {
                  updateSelected({ cornersLinked: false });
                }
              }}
              style={{
                color: el.cornersLinked !== false ? 'var(--accent)' : 'inherit',
                backgroundColor: 'var(--bg-input)',
                borderColor: 'var(--border-strong)',
              }}
              className="flex items-center gap-1 border px-1.5 py-0.5 rounded-[4px] text-[9px] font-mono hover:opacity-85"
            >
              {el.cornersLinked !== false ? (
                <>
                  <LinkIcon className="w-2.5 h-2.5" />
                  <span>Linked</span>
                </>
              ) : (
                <>
                  <Unlink className="w-2.5 h-2.5" />
                  <span>Custom 4</span>
                </>
              )}
            </button>
          </div>

          {el.cornersLinked !== false ? (
            <input
              type="number"
              min={0}
              max={128}
              value={el.borderRadius}
              onChange={(e) => {
                const v = parseInt(e.target.value, 10) || 0;
                updateSelected({
                  borderRadius: v,
                  radiusTL: v,
                  radiusTR: v,
                  radiusBR: v,
                  radiusBL: v,
                });
              }}
              style={{ backgroundColor: 'var(--bg-input)', borderColor: 'var(--border-strong)' }}
              className="w-full border rounded-[5px] px-2 py-1 font-mono text-[11px]"
              title="Border Radius all corners (px)"
            />
          ) : (
            <div className="grid grid-cols-4 gap-1 font-mono text-[10px]">
              {(
                [
                  { lbl: 'TL', key: 'radiusTL' as const, title: 'Top-Left Radius' },
                  { lbl: 'TR', key: 'radiusTR' as const, title: 'Top-Right Radius' },
                  { lbl: 'BR', key: 'radiusBR' as const, title: 'Bottom-Right Radius' },
                  { lbl: 'BL', key: 'radiusBL' as const, title: 'Bottom-Left Radius' },
                ] as const
              ).map((c) => (
                <label key={c.key} className="text-center">
                  <span className="block text-[8px] opacity-60">{c.lbl}</span>
                  <input
                    type="number"
                    min={0}
                    max={128}
                    value={el[c.key] ?? el.borderRadius ?? 0}
                    onChange={(e) => updateSelected({ [c.key]: parseInt(e.target.value, 10) || 0 })}
                    style={{ backgroundColor: 'var(--bg-input)', borderColor: 'var(--border-strong)' }}
                    className="w-full border rounded-[4px] px-1 py-0.5 text-center"
                    title={c.title}
                  />
                </label>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Box Model: Padding, Margin & Overflow */}
      <InspectorSubExpander
        title="Padding, Margin & Overflow (Box Model)"
        isActive={hasBoxModelOverrides}
        summary={`Pad ${el.padding ?? 0}px · ${el.overflowY || (el.scrollable ? 'auto' : 'hidden')}`}
      >
        <BoxModelInspectorSection
          el={el}
          updateSelected={updateSelected}
          isToyhouseFree={isToyhouseFree}
        />
        <OverflowAndConstraintsSection
          el={el}
          updateSelected={updateSelected}
          isToyhouseFree={isToyhouseFree}
        />
      </InspectorSubExpander>

      {/* Container Nesting & Flow */}
      {(canNestIntoParent || isContainerBlock) && (
        <InspectorSubExpander
          title="Container Nesting & Flow"
          defaultOpen={Boolean(el.parentId) || nestedChildren.length > 0}
          isActive={Boolean(el.parentId) || nestedChildren.length > 0}
          summary={
            nestedChildren.length > 0
              ? `${nestedChildren.length} Children`
              : el.parentId
                ? 'Nested'
                : 'Root'
          }
        >
          {canNestIntoParent && (
            <div className="space-y-2">
              {containerCandidates.length > 0 && (
                <label className="block">
                  <span style={{ color: 'var(--text-muted)' }} className="block text-[10px] mb-1 font-semibold">
                    Nest Inside Container Box:
                  </span>
                  <select
                    value={el.parentId || ''}
                    onChange={(e) => onNestIntoContainer(el.id, e.target.value ? e.target.value : null)}
                    style={{ backgroundColor: 'var(--bg-input)', borderColor: 'var(--border-strong)' }}
                    className="w-full border rounded-[5px] px-2 py-1 text-[11px]"
                  >
                    <option value="">None (Root Canvas Layer)</option>
                    {containerCandidates.map((box) => (
                      <option key={box.id} value={box.id}>
                        ↳ {box.label} ({box.id})
                      </option>
                    ))}
                  </select>
                </label>
              )}

              {el.parentId && (
                <div className="p-2 rounded-[6px] bg-black/5 dark:bg-white/5 border border-[var(--border-main)] space-y-2 text-[10px]">
                  <div className="flex items-center justify-between">
                    <span className="font-semibold text-accent flex items-center gap-1">
                      <Layers className="w-3 h-3" />
                      <span>Nested Child Properties</span>
                    </span>
                    <button
                      type="button"
                      onClick={() => onPopOutFromContainer(el.id)}
                      className="px-1.5 py-0.5 rounded text-[9px] font-mono bg-red-500/15 text-red-500 hover:bg-red-500/25 transition font-semibold"
                    >
                      Pop Out to Canvas
                    </button>
                  </div>

                  <button
                    type="button"
                    onClick={() => onSelectElementById(el.parentId!)}
                    style={{ backgroundColor: 'var(--bg-input)', borderColor: 'var(--border-strong)' }}
                    className="w-full py-1 px-2 border rounded-[4px] text-[10px] font-medium text-left truncate hover:opacity-85 flex items-center justify-between"
                  >
                    <span>Container: {parentEl?.label || el.parentId}</span>
                    <span className="text-accent font-bold">Inspect Box ➔</span>
                  </button>

                  <div className="grid grid-cols-2 gap-1.5">
                    <label>
                      <span style={{ color: 'var(--text-muted)' }} className="block mb-0.5">Width in Flow:</span>
                      <select
                        value={el.childWidthMode || 'auto'}
                        onChange={(e) =>
                          updateSelected({ childWidthMode: e.target.value as DesignElement['childWidthMode'] })
                        }
                        style={{ backgroundColor: 'var(--bg-input)', borderColor: 'var(--border-strong)' }}
                        className="w-full border rounded-[4px] px-1 py-0.5 text-[10px]"
                      >
                        <option value="auto">Auto Fit (Natural)</option>
                        <option value="full">100% Full Width</option>
                        <option value="half">50% Half Width</option>
                        <option value="custom">Custom Fixed PX</option>
                      </select>
                    </label>
                    {el.childWidthMode === 'custom' && (
                      <label>
                        <span style={{ color: 'var(--text-muted)' }} className="block mb-0.5">Width (PX)</span>
                        <input
                          type="number"
                          min={30}
                          max={1200}
                          value={el.childCustomWidth || el.width}
                          onChange={(e) =>
                            updateSelected({ childCustomWidth: parseInt(e.target.value, 10) || el.width })
                          }
                          style={{ backgroundColor: 'var(--bg-input)', borderColor: 'var(--border-strong)' }}
                          className="w-full border rounded-[4px] px-1 py-0.5 text-[10px]"
                        />
                      </label>
                    )}
                  </div>

                  {parentSplit && (
                    <div className="pt-1">
                      <span style={{ color: 'var(--text-muted)' }} className="block mb-1 text-[9.5px]">
                        Target Split Pane:
                      </span>
                      <div className="grid grid-cols-3 gap-1">
                        {(parentSplit.panes === 3 ? [0, 1, 2] : [0, 1]).map((pIdx) => (
                          <button
                            key={pIdx}
                            type="button"
                            onClick={() => updateSelected({ parentPaneIndex: pIdx })}
                            style={
                              (el.parentPaneIndex ?? 0) === pIdx
                                ? { backgroundColor: 'var(--accent)', color: '#fff', borderColor: 'var(--accent)' }
                                : { backgroundColor: 'var(--bg-input)', borderColor: 'var(--border-strong)' }
                            }
                            className="border rounded-[4px] py-0.5 text-[9.5px] font-mono font-semibold"
                          >
                            Pane {pIdx + 1}
                          </button>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          )}

          {isContainerBlock && (
            <div className={`space-y-2.5 ${canNestIntoParent ? 'pt-2 border-t border-[var(--border-main)]' : ''}`}>
              <div className="flex flex-wrap items-center justify-between gap-1 border-b border-[var(--border-main)] pb-1.5">
                <span className="font-bold text-[11px] flex items-center gap-1.5" style={{ color: 'var(--accent)' }}>
                  <Boxes className="w-3.5 h-3.5" />
                  <span>Nested Container Layout</span>
                </span>
                <div className="flex items-center gap-1">
                  {layoutMode !== 'block' && (
                    <button
                      type="button"
                      onClick={() =>
                        editingContainerId === el.id
                          ? onExitContainerIsolation()
                          : onEnterContainerIsolation(el.id)
                      }
                      style={{ backgroundColor: 'var(--accent)', color: '#fff' }}
                      className="text-[9.5px] font-mono px-1.5 py-0.5 rounded font-semibold hover:opacity-90"
                    >
                      {editingContainerId === el.id ? 'Exit Inside' : 'Edit Inside'}
                    </button>
                  )}
                  <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-black/5 dark:bg-white/10 font-semibold">
                    {nestedChildren.length} {nestedChildren.length === 1 ? 'Item' : 'Items'}
                  </span>
                </div>
              </div>

              <div className="space-y-1">
                <span style={{ color: 'var(--text-muted)' }} className="block text-[10px] font-mono">
                  Inner Flow / Structure:
                </span>
                <div className="flex flex-wrap gap-1 text-[10px] font-mono">
                  {(
                    [
                      { id: 'flex_col', label: 'Stack ⬇' },
                      { id: 'flex_row', label: 'Row ➡' },
                      { id: 'grid_2', label: '2-Col ⊞' },
                      { id: 'grid_3', label: '3-Col ▦' },
                      { id: 'freeform_offset', label: 'Free ⤹' },
                    ] as const
                  ).map((mode) => (
                    <button
                      key={mode.id}
                      type="button"
                      onClick={() => updateSelected({ containerLayout: mode.id })}
                      style={{
                        backgroundColor:
                          (el.containerLayout || 'flex_col') === mode.id
                            ? 'var(--accent)'
                            : 'var(--bg-input)',
                        borderColor: 'var(--border-strong)',
                        color: (el.containerLayout || 'flex_col') === mode.id ? '#fff' : 'inherit',
                      }}
                      className="flex-1 min-w-[66px] py-1 px-1.5 rounded-[5px] border text-center font-medium transition whitespace-nowrap"
                    >
                      {mode.label}
                    </button>
                  ))}
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2 text-[10px]">
                <label>
                  <span style={{ color: 'var(--text-muted)' }} className="block mb-1">
                    Inner Gap ({el.containerGap !== undefined ? el.containerGap : 8}px)
                  </span>
                  <input
                    type="range"
                    min={0}
                    max={32}
                    value={el.containerGap !== undefined ? el.containerGap : 8}
                    onChange={(e) => updateSelected({ containerGap: parseInt(e.target.value, 10) })}
                    className="w-full accent-accent"
                  />
                </label>
                <label>
                  <span style={{ color: 'var(--text-muted)' }} className="block mb-1">Align Items</span>
                  <select
                    value={el.containerAlign || 'stretch'}
                    onChange={(e) =>
                      updateSelected({ containerAlign: e.target.value as DesignElement['containerAlign'] })
                    }
                    style={{ backgroundColor: 'var(--bg-input)', borderColor: 'var(--border-strong)' }}
                    className="w-full border rounded-[5px] px-1.5 py-1 text-[10px]"
                  >
                    <option value="stretch">Stretch (Full width)</option>
                    <option value="start">Start (Left / Top)</option>
                    <option value="center">Center</option>
                    <option value="end">End (Right / Bottom)</option>
                  </select>
                </label>
              </div>

              <div className="space-y-1.5 pt-1">
                <span style={{ color: 'var(--text-muted)' }} className="block text-[10px] font-mono">
                  Contained Children ({nestedChildren.length}):
                </span>
                {nestedChildren.length === 0 ? (
                  <div className="p-2 border border-dashed rounded-[6px] text-center text-[10px] text-stone-400">
                    No items nested yet. Select other canvas elements and choose &quot;Nest Inside Container Box&quot;.
                  </div>
                ) : (
                  <div className="space-y-1 max-h-48 overflow-y-auto pr-1">
                    {nestedChildren.map((child, idx) => (
                      <div
                        key={child.id}
                        style={{ backgroundColor: 'var(--bg-input)', borderColor: 'var(--border-main)' }}
                        className="flex items-center justify-between p-1.5 rounded-[5px] border text-[11px]"
                      >
                        <div
                          className="flex items-center gap-1.5 truncate flex-1 cursor-pointer"
                          onClick={() => onSelectElementById(child.id)}
                          title="Click to inspect this child"
                        >
                          <span className="font-mono text-[9px] opacity-60">#{idx + 1}</span>
                          <span className="font-semibold truncate">{child.label}</span>
                          <span className="text-[9px] opacity-50 font-mono font-normal">({child.type})</span>
                        </div>
                        <div className="flex items-center gap-1 shrink-0 ml-1">
                          <button
                            type="button"
                            disabled={idx === 0}
                            onClick={() => onReorderNestedChild(el.id, child.id, 'up')}
                            className="p-1 rounded hover:bg-black/10 dark:hover:bg-white/10 disabled:opacity-30 text-[10px]"
                            title="Move Earlier in Flow"
                          >
                            ▲
                          </button>
                          <button
                            type="button"
                            disabled={idx === nestedChildren.length - 1}
                            onClick={() => onReorderNestedChild(el.id, child.id, 'down')}
                            className="p-1 rounded hover:bg-black/10 dark:hover:bg-white/10 disabled:opacity-30 text-[10px]"
                            title="Move Later in Flow"
                          >
                            ▼
                          </button>
                          <button
                            type="button"
                            onClick={() => onPopOutFromContainer(child.id)}
                            className="px-1.5 py-0.5 rounded text-[9px] font-mono bg-red-500/15 text-red-500 hover:bg-red-500/25 transition"
                            title="Un-nest back to canvas"
                          >
                            Pop Out
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}
        </InspectorSubExpander>
      )}
    </div>
  );
};
