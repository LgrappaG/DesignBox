import React from 'react';
import { Link as LinkIcon, Unlink } from 'lucide-react';
import { BgPattern, BorderStyle, DesignElement } from '../../types/schema';
import {
  GradientAndBgImageSection,
  PureSurfaceSculptorSection,
} from '../PureInspectorSections';
import { StudioColorButton } from '../shared/StudioColorPicker';
import {
  buildUniformBorderPatch,
  getDisplayBorderColor,
  getDisplayBorderStyle,
  getDisplayBorderWidth,
} from '../../utils/borderHelpers';
import { InspectorSubExpander } from './InspectorCollapsibleSection';

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

const BORDER_STYLES: ReadonlyArray<{ value: BorderStyle; label: string }> = [
  { value: 'solid', label: 'Solid' },
  { value: 'dashed', label: 'Dashed' },
  { value: 'dotted', label: 'Dotted' },
  { value: 'double', label: 'Double' },
  { value: 'groove', label: 'Groove' },
  { value: 'ridge', label: 'Ridge' },
  { value: 'inset', label: 'Inset' },
  { value: 'outset', label: 'Outset' },
];

/** Unified Color Channels (Fill / Border / Text), Border Width & Style, Character Swatches & Surface Pattern. */
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
  const displayBorderWidth = getDisplayBorderWidth(el);
  const displayBorderStyle = getDisplayBorderStyle(el);
  const displayBorderColor = getDisplayBorderColor(el);
  const isLine = el.type === 'pure_line';
  const brdLinked = isLine ? true : el.bordersLinked !== false;

  const borderSides: ReadonlyArray<{
    key: 'Top' | 'Right' | 'Bottom' | 'Left';
    short: string;
    wKey: keyof DesignElement;
    sKey: keyof DesignElement;
    cKey: keyof DesignElement;
  }> = [
    { key: 'Top', short: 'TOP', wKey: 'borderTopWidth', sKey: 'borderTopStyle', cKey: 'borderTopColor' },
    { key: 'Right', short: 'RIGHT', wKey: 'borderRightWidth', sKey: 'borderRightStyle', cKey: 'borderRightColor' },
    { key: 'Bottom', short: 'BOTTOM', wKey: 'borderBottomWidth', sKey: 'borderBottomStyle', cKey: 'borderBottomColor' },
    { key: 'Left', short: 'LEFT', wKey: 'borderLeftWidth', sKey: 'borderLeftStyle', cKey: 'borderLeftColor' },
  ];

  const channels: ReadonlyArray<{
    key: 'bgColor' | 'borderColor' | 'textColor';
    label: string;
    value: string;
    subtext: string;
  }> = [
    {
      key: 'bgColor',
      label: 'Fill',
      value: el.bgColor,
      subtext: el.bgColor === 'transparent' ? 'Clear' : el.bgColor,
    },
    {
      key: 'borderColor',
      label: 'Border',
      value: displayBorderColor,
      subtext: `${displayBorderWidth}px ${displayBorderStyle}`,
    },
    {
      key: 'textColor',
      label: 'Text',
      value: el.textColor,
      subtext: el.textColor,
    },
  ];

  const activeChannelValue =
    swatchTarget === 'bgColor'
      ? el.bgColor
      : swatchTarget === 'borderColor'
        ? displayBorderColor
        : el.textColor;

  const activeChannelLabel =
    swatchTarget === 'bgColor' ? 'Fill' : swatchTarget === 'borderColor' ? 'Border' : 'Text';

  const handleActiveColorChange = (nextColor: string) => {
    if (swatchTarget === 'bgColor') {
      updateSelected({ bgColor: nextColor });
    } else if (swatchTarget === 'borderColor') {
      updateSelected(buildUniformBorderPatch(el, { borderColor: nextColor }));
    } else {
      updateSelected({ textColor: nextColor });
    }
  };

  return (
    <div className="space-y-2.5">
      {/* Unified Color, Border, Swatches & Surface */}
      <div className="space-y-2.5">
        <div className="flex items-center justify-between gap-2">
          <span style={{ color: 'var(--text-muted)' }} className="text-[10px] font-medium">
            Active Channel: <strong style={{ color: 'var(--text-main)' }}>{activeChannelLabel}</strong>
          </span>
          <button
            type="button"
            onClick={onAddSelectedColorToSwatches}
            style={{ color: 'var(--accent)' }}
            className="text-[10px] font-mono font-semibold hover:underline shrink-0"
            title={`Save current ${activeChannelLabel} color to swatches`}
          >
            + Save {activeChannelLabel}
          </button>
        </div>

        {/* Target Channel Switcher: Fill | Border | Text */}
        <div className="grid grid-cols-3 gap-1.5">
          {channels.map((ch) => {
            const isActive = swatchTarget === ch.key;
            const isClear = !ch.value || ch.value === 'transparent';
            return (
              <button
                key={ch.key}
                type="button"
                onClick={() => setSwatchTarget(ch.key)}
                style={{
                  backgroundColor: isActive ? 'var(--accent-soft)' : 'var(--bg-input)',
                  borderColor: isActive ? 'var(--accent)' : 'var(--border-main)',
                }}
                className="flex flex-col items-start gap-0.5 p-1.5 rounded-[6px] border text-left transition min-w-0 hover:border-[var(--accent)]"
                title={`Select ${ch.label} channel for picker and swatches`}
              >
                <div className="flex items-center gap-1.5 w-full min-w-0">
                  <span
                    className="relative w-3.5 h-3.5 rounded-[3px] border border-[var(--border-strong)] shrink-0 overflow-hidden"
                    style={{
                      backgroundColor: isClear ? 'transparent' : ch.value,
                    }}
                  >
                    {isClear && (
                      <span className="block w-[140%] h-[1.5px] bg-red-500 rotate-45 origin-center translate-y-[6px] -translate-x-[3px]" />
                    )}
                  </span>
                  <span className="text-[10px] font-semibold truncate">{ch.label}</span>
                </div>
                <span
                  style={{ color: 'var(--text-muted)' }}
                  className="text-[9px] font-mono truncate w-full"
                >
                  {ch.subtext}
                </span>
              </button>
            );
          })}
        </div>

        {/* Shared Active Channel Studio Color Picker + Quick Toggle */}
        <div className="flex items-center gap-1.5 min-w-0">
          <StudioColorButton
            value={activeChannelValue}
            onChange={handleActiveColorChange}
            fallbackHex={swatchTarget === 'textColor' ? '#18181B' : '#FAF8F5'}
            label={activeChannelLabel}
            allowTransparent={swatchTarget !== 'textColor'}
            swatches={swatches}
            onAddSwatch={onAddSelectedColorToSwatches}
            fullWidth
            className="flex-1 min-w-0"
          />

          {swatchTarget === 'bgColor' && (
            <button
              type="button"
              onClick={() =>
                updateSelected({
                  bgColor: el.bgColor === 'transparent' ? '#FAF8F5' : 'transparent',
                })
              }
              style={{
                backgroundColor: 'var(--bg-input)',
                borderColor: 'var(--border-strong)',
                color: 'var(--accent)',
              }}
              className="h-8 px-2 rounded-md border text-[10px] font-mono font-semibold hover:border-[var(--accent)] transition shrink-0"
              title="Toggle transparent background fill"
            >
              {el.bgColor === 'transparent' ? 'Solid' : 'Clear'}
            </button>
          )}

          {swatchTarget === 'borderColor' && (
            <button
              type="button"
              onClick={() =>
                updateSelected(
                  buildUniformBorderPatch(el, {
                    borderWidth: displayBorderWidth > 0 && el.type !== 'pure_line' ? 0 : 1,
                    borderColor:
                      displayBorderColor === 'transparent' ? '#C86D51' : displayBorderColor,
                  })
                )
              }
              style={{
                backgroundColor: 'var(--bg-input)',
                borderColor: 'var(--border-strong)',
                color: 'var(--accent)',
              }}
              className="h-8 px-2 rounded-md border text-[10px] font-mono font-semibold hover:border-[var(--accent)] transition shrink-0"
              title={
                el.type === 'pure_line'
                  ? 'Reset line thickness to 1px'
                  : displayBorderWidth > 0
                    ? 'Remove border (0px)'
                    : 'Add 1px border'
              }
            >
              {el.type === 'pure_line' ? '1px' : displayBorderWidth > 0 ? '0px' : '1px'}
            </button>
          )}
        </div>

        {/* Unified Border Thickness, Style & 4-Side Controls */}
        <div className="pt-2 border-t border-[var(--border-main)] space-y-1.5">
          <div className="flex items-center justify-between gap-2 text-[10px]">
            <span style={{ color: 'var(--text-muted)' }} className="font-medium">
              {isLine
                ? 'Line Thickness & Style'
                : brdLinked
                  ? 'Border Thickness & Style'
                  : 'Per-Side Borders (Accent Rails)'}
            </span>
            {!isLine && (
              <button
                type="button"
                onClick={() => {
                  if (brdLinked) {
                    updateSelected({
                      bordersLinked: false,
                      borderTopWidth: el.borderTopWidth ?? el.borderWidth ?? 1,
                      borderTopStyle: el.borderTopStyle || el.borderStyle || 'solid',
                      borderTopColor: el.borderTopColor || el.borderColor,
                      borderRightWidth: el.borderRightWidth ?? el.borderWidth ?? 1,
                      borderRightStyle: el.borderRightStyle || el.borderStyle || 'solid',
                      borderRightColor: el.borderRightColor || el.borderColor,
                      borderBottomWidth: el.borderBottomWidth ?? el.borderWidth ?? 1,
                      borderBottomStyle: el.borderBottomStyle || el.borderStyle || 'solid',
                      borderBottomColor: el.borderBottomColor || el.borderColor,
                      borderLeftWidth: el.borderLeftWidth ?? el.borderWidth ?? 1,
                      borderLeftStyle: el.borderLeftStyle || el.borderStyle || 'solid',
                      borderLeftColor: el.borderLeftColor || el.borderColor,
                    });
                  } else {
                    updateSelected(
                      buildUniformBorderPatch(el, {
                        borderWidth: displayBorderWidth,
                        borderStyle: displayBorderStyle,
                        borderColor: displayBorderColor,
                      })
                    );
                  }
                }}
                style={{
                  backgroundColor: 'var(--bg-input)',
                  borderColor: 'var(--border-strong)',
                  color: !brdLinked ? 'var(--accent)' : 'inherit',
                }}
                className="flex items-center gap-1 border px-1.5 py-0.5 rounded-[4px] text-[9px] font-mono hover:opacity-85"
                title="Switch between Uniform border and independent 4-side borders"
              >
                {brdLinked ? <LinkIcon className="w-2.5 h-2.5" /> : <Unlink className="w-2.5 h-2.5" />}
                <span>{brdLinked ? 'Uniform' : '4-Side'}</span>
              </button>
            )}
          </div>

          {brdLinked ? (
            <div className="grid grid-cols-[1fr_54px_86px] gap-1.5 items-center">
              <input
                type="range"
                min={isLine ? 1 : 0}
                max={16}
                value={Math.min(16, displayBorderWidth)}
                onChange={(e) =>
                  updateSelected(
                    buildUniformBorderPatch(el, {
                      borderWidth: parseInt(e.target.value, 10) || 0,
                    })
                  )
                }
                className="w-full accent-[var(--accent)] cursor-pointer min-w-0"
                title={`Border Width: ${displayBorderWidth}px`}
              />
              <div className="relative flex items-center">
                <input
                  type="number"
                  min={isLine ? 1 : 0}
                  max={24}
                  value={displayBorderWidth}
                  onChange={(e) =>
                    updateSelected(
                      buildUniformBorderPatch(el, {
                        borderWidth: parseInt(e.target.value, 10) || 0,
                      })
                    )
                  }
                  style={{
                    backgroundColor: 'var(--bg-input)',
                    borderColor: 'var(--border-strong)',
                  }}
                  className="w-full border rounded-[5px] pl-1.5 pr-4 py-1 text-[10px] font-mono text-center"
                  title="Border Thickness (px)"
                />
                <span
                  style={{ color: 'var(--text-muted)' }}
                  className="absolute right-1 text-[8px] font-mono pointer-events-none"
                >
                  px
                </span>
              </div>
              <select
                value={displayBorderStyle}
                onChange={(e) =>
                  updateSelected(
                    buildUniformBorderPatch(el, {
                      borderStyle: e.target.value as BorderStyle,
                    })
                  )
                }
                style={{
                  backgroundColor: 'var(--bg-input)',
                  borderColor: 'var(--border-strong)',
                }}
                className="w-full border rounded-[5px] px-1.5 py-1 text-[10px]"
                title="Border Style"
              >
                {BORDER_STYLES.map((st) => (
                  <option key={st.value} value={st.value}>
                    {st.label}
                  </option>
                ))}
              </select>
            </div>
          ) : (
            <div className="space-y-1">
              <div
                className="grid grid-cols-[42px_46px_1fr_32px] gap-1 text-[8.5px] font-mono uppercase tracking-wider px-0.5"
                style={{ color: 'var(--text-muted)' }}
              >
                <span>Side</span>
                <span>Px</span>
                <span>Style</span>
                <span className="text-center">Col</span>
              </div>
              {borderSides.map((s) => (
                <div
                  key={s.key}
                  className="grid grid-cols-[42px_46px_1fr_32px] gap-1 items-center text-[10px]"
                >
                  <span className="font-mono text-[9px] opacity-70">{s.short}</span>
                  <input
                    type="number"
                    min={0}
                    max={24}
                    value={(el[s.wKey] as number | undefined) ?? el.borderWidth ?? 0}
                    onChange={(e) =>
                      updateSelected({
                        [s.wKey]: Math.max(0, parseInt(e.target.value, 10) || 0),
                      } as Partial<DesignElement>)
                    }
                    style={{
                      backgroundColor: 'var(--bg-input)',
                      borderColor: 'var(--border-strong)',
                    }}
                    className="border rounded-[4px] px-1 py-1 font-mono text-center h-7"
                  />
                  <select
                    value={(el[s.sKey] as BorderStyle | undefined) || el.borderStyle || 'solid'}
                    onChange={(e) =>
                      updateSelected({
                        [s.sKey]: e.target.value as BorderStyle,
                      } as Partial<DesignElement>)
                    }
                    style={{
                      backgroundColor: 'var(--bg-input)',
                      borderColor: 'var(--border-strong)',
                    }}
                    className="border rounded-[4px] px-1 py-1 text-[10px] h-7"
                  >
                    {BORDER_STYLES.map((st) => (
                      <option key={st.value} value={st.value}>
                        {st.label}
                      </option>
                    ))}
                  </select>
                  <StudioColorButton
                    compact
                    value={(el[s.cKey] as string | undefined) || el.borderColor}
                    onChange={(nextColor) =>
                      updateSelected({ [s.cKey]: nextColor } as Partial<DesignElement>)
                    }
                    fallbackHex="#E5E5E5"
                    swatches={swatches}
                    title={`${s.key} Border Color`}
                  />
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Integrated Character Swatches */}
        <div className="pt-2 border-t border-[var(--border-main)] space-y-1.5">
          <div className="flex items-center justify-between gap-2 text-[10px]">
            <span style={{ color: 'var(--text-muted)' }}>
              Swatches →{' '}
              <strong style={{ color: 'var(--text-main)' }}>{activeChannelLabel}</strong>
            </span>
            <span style={{ color: 'var(--text-muted)' }} className="text-[9px] font-mono">
              Click: apply · Right-click: remove
            </span>
          </div>
          <div className="flex flex-wrap gap-1.5">
            {swatches.map((hex) => {
              const isMatched =
                activeChannelValue &&
                activeChannelValue !== 'transparent' &&
                hex.toUpperCase() === activeChannelValue.toUpperCase();
              return (
                <div key={hex} className="relative group">
                  <button
                    type="button"
                    onClick={() => onApplySwatchColor(hex)}
                    onContextMenu={(e) => {
                      e.preventDefault();
                      onRemoveSwatch(hex);
                    }}
                    style={{
                      backgroundColor: hex,
                      borderColor: isMatched ? 'var(--accent)' : 'var(--border-strong)',
                    }}
                    className={`w-6 h-6 rounded-[5px] border hover:scale-110 transition block shadow-xs ${
                      isMatched ? 'ring-2 ring-[var(--accent)] ring-offset-1 ring-offset-[var(--bg-panel-alt)]' : ''
                    }`}
                    title={`Click: Apply ${hex} to ${activeChannelLabel}\nRight-click: Remove swatch`}
                  />
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      onRemoveSwatch(hex);
                    }}
                    className="absolute -top-1.5 -right-1.5 w-3.5 h-3.5 bg-rose-600 text-white rounded-full text-[9px] font-bold leading-none hidden group-hover:flex items-center justify-center shadow z-10 hover:bg-rose-700"
                    title="Remove swatch"
                  >
                    ×
                  </button>
                </div>
              );
            })}
          </div>
        </div>

        {/* Surface Pattern */}
        <label className="block pt-2 border-t border-[var(--border-main)]">
          <span style={{ color: 'var(--text-muted)' }} className="block text-[10px] mb-1">
            Surface Pattern
          </span>
          <select
            value={el.bgPattern || 'none'}
            onChange={(e) => updateSelected({ bgPattern: e.target.value as BgPattern })}
            style={{
              backgroundColor: 'var(--bg-input)',
              borderColor: 'var(--border-strong)',
            }}
            className="w-full border rounded-[5px] px-2 py-1 text-[11px]"
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
      </div>

      {/* Gradient & Inline Container BG Image */}
      <InspectorSubExpander
        title="Gradient & Background Image"
        isActive={Boolean(el.bgGradientTo || el.bgImageUrl?.trim())}
        summary={
          el.bgImageUrl?.trim()
            ? 'BG Image'
            : el.bgGradientTo
              ? el.bgGradientType || 'linear'
              : 'Off'
        }
      >
        <GradientAndBgImageSection
          el={el}
          updateSelected={updateSelected}
          isToyhouseFree={isToyhouseFree}
          swatches={swatches}
        />
      </InspectorSubExpander>

      {/* Quick Surface Recipes & Shape Cut */}
      <InspectorSubExpander
        title="Surface Shape Cut & Presets"
        isActive={Boolean(el.boxClipShape && el.boxClipShape !== 'rect')}
        summary={el.boxClipShape && el.boxClipShape !== 'rect' ? el.boxClipShape : 'Rect'}
      >
        <PureSurfaceSculptorSection
          el={el}
          updateSelected={updateSelected}
          isToyhouseFree={isToyhouseFree}
          swatches={swatches}
        />
      </InspectorSubExpander>
    </div>
  );
};
