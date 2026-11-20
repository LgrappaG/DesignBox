import React, { useState } from 'react';
import {
  DesignElement,
  ImageShape,
} from '../types/schema';
import { PURE_SURFACE_RECIPES } from '../data/purePrimitives';
import { FaIconBrowser } from './shared/FaIconBrowser';
import { StudioColorButton } from './shared/StudioColorPicker';
import {
  DEFAULT_SHAPE_CUT_PX,
  isF2UGeometricShape,
  MAX_SHAPE_CUT_PX,
  MIN_SHAPE_CUT_PX,
} from '../utils/f2uShapeCss';
import {
  Box,
  Link as LinkIcon,
  Scissors,
  Sparkles,
  Unlink,
} from 'lucide-react';

interface PureInspectorProps {
  el: DesignElement;
  updateSelected: (patch: Partial<DesignElement>) => void;
  isToyhouseFree: boolean;
  swatches?: string[];
}

const BOX_SHAPE_OPTIONS: ReadonlyArray<{ id: ImageShape; label: string; f2u: boolean }> = [
  { id: 'rect', label: 'Rect', f2u: true },
  { id: 'circle', label: 'Circle', f2u: true },
  { id: 'pill', label: 'Pill', f2u: true },
  { id: 'arch', label: 'Arch', f2u: true },
  { id: 'leaf', label: 'Leaf', f2u: true },
  { id: 'hexagon', label: 'Hexagon', f2u: true },
  { id: 'hexagon_flat', label: 'Hex Flat', f2u: true },
  { id: 'diamond', label: 'Diamond', f2u: true },
  { id: 'octagon', label: 'Octagon', f2u: true },
  { id: 'bevel', label: 'Bevel', f2u: true },
  { id: 'ticket', label: 'Ticket', f2u: true },
  { id: 'shield', label: 'Shield', f2u: true },
  { id: 'cross_star', label: 'Sparkle', f2u: true },
  { id: 'scallop', label: 'Scallop', f2u: true },
  { id: 'star', label: 'Star', f2u: true },
  { id: 'heart', label: 'Heart', f2u: true },
];

const F2UBadge = () => (
  <span className="text-[8.5px] font-mono px-1.5 py-[1px] rounded bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border border-emerald-500/30 font-semibold">
    F2U
  </span>
);

const ProBadge = () => (
  <span className="text-[8.5px] font-mono px-1.5 py-[1px] rounded bg-amber-500/15 text-amber-600 dark:text-amber-400 border border-amber-500/30 font-semibold">
    PRO
  </span>
);

export const PureSurfaceSculptorSection: React.FC<PureInspectorProps> = ({
  el,
  updateSelected,
  isToyhouseFree,
  swatches = [],
}) => {
  const isImg = el.type === 'image' || el.type === 'pure_image_slot';
  const activeBoxShape: ImageShape =
    el.boxClipShape ||
    (el.type === 'pure_diamond'
      ? 'diamond'
      : el.type === 'pure_hexagon'
      ? 'hexagon'
      : el.type === 'pure_octagon'
      ? 'octagon'
      : 'rect');
  const isGeoBox = isF2UGeometricShape(activeBoxShape);
  const isRadialCutoutBox =
    activeBoxShape === 'ticket' ||
    activeBoxShape === 'cross_star' ||
    activeBoxShape === 'scallop';
  const hasCustomSurface =
    Boolean(el.bgImageUrl && el.bgImageUrl.trim()) ||
    Boolean(el.bgGradientTo && el.bgGradientTo !== '' && el.bgGradientTo !== el.bgColor) ||
    (Boolean(el.bgPattern) && el.bgPattern !== 'none');

  return (
    <div className="space-y-2.5">
      <div className="flex items-center justify-between">
        <span className="font-semibold text-[10.5px] flex items-center gap-1.5">
          <Sparkles className="w-3 h-3" style={{ color: 'var(--accent)' }} />
          <span>Quick Surface Presets</span>
        </span>
        <F2UBadge />
      </div>
      <div className="grid grid-cols-3 gap-1">
        {PURE_SURFACE_RECIPES.map((rec) => (
          <button
            key={rec.id}
            type="button"
            onClick={() => updateSelected(rec.patch)}
            style={{
              backgroundColor: 'var(--bg-input)',
              borderColor: 'var(--border-strong)',
            }}
            className="border rounded-[5px] px-1.5 py-1 text-[10px] font-medium hover:opacity-85 transition flex items-center justify-center gap-1"
            title={rec.f2uSafe ? '100% Toyhouse F2U Safe' : 'Requires Toyhouse Premium'}
          >
            <span className="truncate">{rec.name}</span>
            {!rec.f2uSafe && <span className="text-[8px] text-amber-500 font-mono">PRO</span>}
          </button>
        ))}
      </div>

      {!isImg && el.type !== 'fa_watermark' && (
        <div className="pt-2 border-t border-[var(--border-main)] space-y-1.5">
          <div className="flex items-center justify-between">
            <span className="font-semibold text-[10.5px] flex items-center gap-1">
              <Scissors className="w-3 h-3" style={{ color: 'var(--accent)' }} />
              <span>Surface Shape Cut / Mask</span>
            </span>
            {isToyhouseFree && activeBoxShape !== 'rect' && !BOX_SHAPE_OPTIONS.find((s) => s.id === activeBoxShape)?.f2u ? (
              <ProBadge />
            ) : (
              <F2UBadge />
            )}
          </div>
          <div className="grid grid-cols-4 gap-1">
            {BOX_SHAPE_OPTIONS.map((shp) => (
              <button
                key={shp.id}
                type="button"
                onClick={() => updateSelected({ boxClipShape: shp.id })}
                style={
                  activeBoxShape === shp.id
                    ? { backgroundColor: 'var(--accent)', color: '#fff', borderColor: 'var(--accent)' }
                    : { backgroundColor: 'var(--bg-input)', borderColor: 'var(--border-strong)' }
                }
                className="border rounded-[4px] py-0.5 px-1 text-[9px] font-mono truncate flex items-center justify-center gap-0.5"
                title={
                  shp.f2u
                    ? isF2UGeometricShape(shp.id)
                      ? '100% Toyhouse F2U Safe (4-quadrant inline CSS gradient geometry)'
                      : '100% Toyhouse F2U Safe (pure border-radius)'
                    : 'Pro clip-path shape (masked on F2U, preserved for Toyhouse Premium)'
                }
              >
                <span className="truncate">{shp.label}</span>
                {!shp.f2u && <span className="text-[7px] opacity-80">✦</span>}
              </button>
            ))}
          </div>

          {(isGeoBox || (isRadialCutoutBox && isToyhouseFree)) && (
            <div
              style={{ backgroundColor: 'var(--bg-input)', borderColor: 'var(--border-main)' }}
              className="mt-1.5 p-2 rounded-[6px] border space-y-2 text-[10px]"
            >
              {(activeBoxShape === 'hexagon' || activeBoxShape === 'hexagon_flat') && (
                <div className="flex items-center justify-between gap-2">
                  <span className="font-semibold opacity-80">Hexagon Orientation</span>
                  <div className="grid grid-cols-2 gap-1">
                    {(
                      [
                        { id: 'hexagon', label: 'Pointy ⬡' },
                        { id: 'hexagon_flat', label: 'Flat ⬢' },
                      ] as const
                    ).map((opt) => (
                      <button
                        key={opt.id}
                        type="button"
                        onClick={() => updateSelected({ boxClipShape: opt.id })}
                        style={
                          activeBoxShape === opt.id
                            ? { backgroundColor: 'var(--accent)', color: '#fff', borderColor: 'var(--accent)' }
                            : { backgroundColor: 'var(--bg-panel)', borderColor: 'var(--border-strong)' }
                        }
                        className="border rounded-[4px] px-2 py-0.5 text-[9.5px] font-medium transition"
                      >
                        {opt.label}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {(activeBoxShape === 'bevel' || activeBoxShape === 'octagon') && (
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <span className="font-semibold opacity-80">
                      {activeBoxShape === 'bevel' ? 'Bevel Cut Size' : 'Corner Cut (px)'}
                    </span>
                    <div className="flex items-center gap-1.5 font-mono text-[9.5px]">
                      <span>
                        {activeBoxShape === 'octagon' && !el.shapeCutPx
                          ? 'Auto (29%)'
                          : `${el.shapeCutPx ?? DEFAULT_SHAPE_CUT_PX}px`}
                      </span>
                      {activeBoxShape === 'octagon' && el.shapeCutPx !== undefined && (
                        <button
                          type="button"
                          onClick={() => updateSelected({ shapeCutPx: undefined })}
                          style={{ color: 'var(--accent)' }}
                          className="text-[9px] hover:underline"
                        >
                          Auto
                        </button>
                      )}
                    </div>
                  </div>
                  <input
                    type="range"
                    min={MIN_SHAPE_CUT_PX}
                    max={MAX_SHAPE_CUT_PX}
                    value={el.shapeCutPx ?? (activeBoxShape === 'bevel' ? DEFAULT_SHAPE_CUT_PX : 20)}
                    onChange={(e) => updateSelected({ shapeCutPx: Number(e.target.value) })}
                    className="w-full"
                  />
                </div>
              )}

              {isToyhouseFree && (isRadialCutoutBox || hasCustomSurface || el.bgColor === 'transparent') && (
                <div className="flex items-center justify-between gap-2">
                  <span className="font-semibold opacity-80">Corner Mask Color</span>
                  <div className="w-28">
                    <StudioColorButton
                      value={el.shapeMaskBgColor || '#FAF8F5'}
                      onChange={(c) => updateSelected({ shapeMaskBgColor: c })}
                      swatches={swatches}
                      allowTransparent={false}
                      fullWidth
                      title="Match bg behind shape corners"
                    />
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export const BoxModelInspectorSection: React.FC<PureInspectorProps> = ({
  el,
  updateSelected,
}) => {
  const padLinked = el.paddingLinked !== false;
  const marLinked = el.marginLinked !== false;

  const setAllPadding = (v: number) =>
    updateSelected({ padding: v, paddingT: v, paddingR: v, paddingB: v, paddingL: v });

  const setAllMargin = (v: number) =>
    updateSelected({ marginT: v, marginR: v, marginB: v, marginL: v });

  return (
    <div className="space-y-2.5">
      <div className="flex items-center justify-between">
        <span className="font-semibold text-[10.5px] flex items-center gap-1.5">
          <Box className="w-3 h-3" style={{ color: 'var(--accent)' }} />
          <span>Padding &amp; Margin (4-Side)</span>
        </span>
        <F2UBadge />
      </div>

      {/* 4-Side Padding */}
      <div className="space-y-1">
        <div className="flex items-center justify-between text-[10px]">
          <span style={{ color: 'var(--text-muted)' }}>Padding (Inner px)</span>
          <button
            type="button"
            onClick={() => {
              if (padLinked) {
                updateSelected({
                  paddingLinked: false,
                  paddingT: el.paddingT ?? el.padding ?? 0,
                  paddingR: el.paddingR ?? el.padding ?? 0,
                  paddingB: el.paddingB ?? el.padding ?? 0,
                  paddingL: el.paddingL ?? el.padding ?? 0,
                });
              } else {
                const v = el.paddingT ?? el.padding ?? 0;
                updateSelected({ paddingLinked: true, padding: v, paddingT: v, paddingR: v, paddingB: v, paddingL: v });
              }
            }}
            style={{ backgroundColor: 'var(--bg-input)', borderColor: 'var(--border-strong)' }}
            className="flex items-center gap-1 border px-1.5 py-0.5 rounded-[4px] text-[9px] font-mono"
          >
            {padLinked ? <LinkIcon className="w-2.5 h-2.5" /> : <Unlink className="w-2.5 h-2.5" />}
            <span>{padLinked ? 'Linked' : '4-Side'}</span>
          </button>
        </div>
        {padLinked ? (
          <input
            type="number"
            min={0}
            max={120}
            value={el.padding ?? 0}
            onChange={(e) => setAllPadding(Math.max(0, parseInt(e.target.value, 10) || 0))}
            style={{ backgroundColor: 'var(--bg-input)', borderColor: 'var(--border-strong)' }}
            className="w-full border rounded-[5px] px-2 py-1 font-mono text-[11px]"
          />
        ) : (
          <div className="grid grid-cols-4 gap-1 font-mono text-[10px]">
            {[
              { lbl: 'T', k: 'paddingT' as const },
              { lbl: 'R', k: 'paddingR' as const },
              { lbl: 'B', k: 'paddingB' as const },
              { lbl: 'L', k: 'paddingL' as const },
            ].map((p) => (
              <label key={p.k} className="text-center">
                <span className="block text-[8px] opacity-60">{p.lbl}</span>
                <input
                  type="number"
                  min={0}
                  max={120}
                  value={(el[p.k] as number | undefined) ?? el.padding ?? 0}
                  onChange={(e) => updateSelected({ [p.k]: Math.max(0, parseInt(e.target.value, 10) || 0) })}
                  style={{ backgroundColor: 'var(--bg-input)', borderColor: 'var(--border-strong)' }}
                  className="w-full border rounded-[4px] px-1 py-0.5 text-center"
                />
              </label>
            ))}
          </div>
        )}
      </div>

      {/* 4-Side Margin */}
      <div className="space-y-1 pt-1 border-t border-[var(--border-main)]">
        <div className="flex items-center justify-between text-[10px]">
          <span style={{ color: 'var(--text-muted)' }}>Margin (Outer px — Grid/Flow)</span>
          <button
            type="button"
            onClick={() => updateSelected({ marginLinked: !marLinked })}
            style={{ backgroundColor: 'var(--bg-input)', borderColor: 'var(--border-strong)' }}
            className="flex items-center gap-1 border px-1.5 py-0.5 rounded-[4px] text-[9px] font-mono"
          >
            {marLinked ? <LinkIcon className="w-2.5 h-2.5" /> : <Unlink className="w-2.5 h-2.5" />}
            <span>{marLinked ? 'Linked' : '4-Side'}</span>
          </button>
        </div>
        {marLinked ? (
          <input
            type="number"
            min={-40}
            max={120}
            value={el.marginT ?? 0}
            onChange={(e) => setAllMargin(parseInt(e.target.value, 10) || 0)}
            style={{ backgroundColor: 'var(--bg-input)', borderColor: 'var(--border-strong)' }}
            className="w-full border rounded-[5px] px-2 py-1 font-mono text-[11px]"
          />
        ) : (
          <div className="grid grid-cols-4 gap-1 font-mono text-[10px]">
            {[
              { lbl: 'T', k: 'marginT' as const },
              { lbl: 'R', k: 'marginR' as const },
              { lbl: 'B', k: 'marginB' as const },
              { lbl: 'L', k: 'marginL' as const },
            ].map((m) => (
              <label key={m.k} className="text-center">
                <span className="block text-[8px] opacity-60">{m.lbl}</span>
                <input
                  type="number"
                  min={-40}
                  max={120}
                  value={(el[m.k] as number | undefined) ?? 0}
                  onChange={(e) => updateSelected({ [m.k]: parseInt(e.target.value, 10) || 0 })}
                  style={{ backgroundColor: 'var(--bg-input)', borderColor: 'var(--border-strong)' }}
                  className="w-full border rounded-[4px] px-1 py-0.5 text-center"
                />
              </label>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

/** Gradient stops & inline F2U container background image controls (Style tab). */
export const GradientAndBgImageSection: React.FC<PureInspectorProps> = ({
  el,
  updateSelected,
  swatches,
}) => {
  return (
    <div className="space-y-2.5">
      {/* Gradient Controls */}
      <div className="space-y-1.5 text-[10px]">
        <div className="flex items-center justify-between">
          <span style={{ color: 'var(--text-muted)' }}>Gradient Type &amp; Angle ({el.bgGradientAngle ?? 135}°)</span>
          {el.bgGradientTo && (
            <button
              type="button"
              onClick={() => updateSelected({ bgGradientTo: undefined, bgGradientMid: undefined })}
              className="text-red-400 hover:underline text-[9px]"
            >
              Clear Gradient
            </button>
          )}
        </div>
        <div className="grid grid-cols-3 gap-1">
          <select
            value={el.bgGradientType || 'linear'}
            onChange={(e) => updateSelected({ bgGradientType: e.target.value as 'linear' | 'radial' })}
            style={{ backgroundColor: 'var(--bg-input)', borderColor: 'var(--border-strong)' }}
            className="border rounded-[4px] px-1 py-1 text-[10px]"
          >
            <option value="linear">Linear</option>
            <option value="radial">Radial</option>
          </select>
          <input
            type="number"
            min={0}
            max={360}
            value={el.bgGradientAngle ?? 135}
            disabled={el.bgGradientType === 'radial'}
            onChange={(e) => updateSelected({ bgGradientAngle: parseInt(e.target.value, 10) || 0 })}
            style={{ backgroundColor: 'var(--bg-input)', borderColor: 'var(--border-strong)' }}
            className="border rounded-[4px] px-1 py-1 font-mono text-center"
            title="Gradient Angle (deg)"
          />
          <div className="flex items-center gap-1 justify-end">
            <StudioColorButton
              compact
              value={el.bgGradientMid || el.bgColor}
              onChange={(nextColor) => updateSelected({ bgGradientMid: nextColor })}
              fallbackHex="#FAF8F5"
              swatches={swatches}
              title="Optional Middle Gradient Stop Color"
            />
            <StudioColorButton
              compact
              value={el.bgGradientTo || el.bgColor}
              onChange={(nextColor) => updateSelected({ bgGradientTo: nextColor })}
              fallbackHex="#FAF8F5"
              swatches={swatches}
              title="End Gradient Color"
            />
          </div>
        </div>
      </div>

      {/* Container Background Image (F2U Parallax & Textures!) */}
      <div className="space-y-1.5 pt-1.5 border-t border-[var(--border-main)] text-[10px]">
        <span style={{ color: 'var(--text-muted)' }} className="block">
          Container Background Image URL (F2U Inline BG)
        </span>
        <input
          type="text"
          placeholder="https://... (leave empty for solid/gradient)"
          value={el.bgImageUrl || ''}
          onChange={(e) => updateSelected({ bgImageUrl: e.target.value })}
          style={{ backgroundColor: 'var(--bg-input)', borderColor: 'var(--border-strong)' }}
          className="w-full border rounded-[5px] px-2 py-1 text-[10px] font-mono"
        />
        {el.bgImageUrl && (
          <div className="grid grid-cols-2 gap-1">
            <select
              value={el.bgSize || 'cover'}
              onChange={(e) => updateSelected({ bgSize: e.target.value as DesignElement['bgSize'] })}
              style={{ backgroundColor: 'var(--bg-input)', borderColor: 'var(--border-strong)' }}
              className="border rounded-[4px] px-1 py-0.5 text-[10px]"
            >
              <option value="cover">Size: Cover</option>
              <option value="contain">Size: Contain</option>
              <option value="auto">Size: Auto (Tile)</option>
              <option value="100% 100%">Size: Stretch</option>
            </select>
            <select
              value={el.bgRepeat || 'no-repeat'}
              onChange={(e) => updateSelected({ bgRepeat: e.target.value as DesignElement['bgRepeat'] })}
              style={{ backgroundColor: 'var(--bg-input)', borderColor: 'var(--border-strong)' }}
              className="border rounded-[4px] px-1 py-0.5 text-[10px]"
            >
              <option value="no-repeat">No Repeat</option>
              <option value="repeat">Repeat Tile</option>
              <option value="repeat-x">Repeat X</option>
              <option value="repeat-y">Repeat Y</option>
            </select>
            <input
              type="text"
              placeholder="center center"
              value={el.bgPosition || 'center center'}
              onChange={(e) => updateSelected({ bgPosition: e.target.value })}
              style={{ backgroundColor: 'var(--bg-input)', borderColor: 'var(--border-strong)' }}
              className="border rounded-[4px] px-1.5 py-0.5 text-[10px] font-mono"
              title="background-position"
            />
            <select
              value={el.bgAttachment || 'scroll'}
              onChange={(e) => updateSelected({ bgAttachment: e.target.value as 'scroll' | 'fixed' })}
              style={{ backgroundColor: 'var(--bg-input)', borderColor: 'var(--border-strong)' }}
              className="border rounded-[4px] px-1 py-0.5 text-[10px]"
            >
              <option value="scroll">Attach: Scroll</option>
              <option value="fixed">Attach: Fixed (Parallax)</option>
            </select>
          </div>
        )}
      </div>
    </div>
  );
};

/** Custom Box Shadow (X/Y/Blur/Spread/Inset) & Text Shadow controls (Effects & Modifiers tab). */
export const CustomShadowInspectorSection: React.FC<PureInspectorProps> = ({
  el,
  updateSelected,
}) => {
  return (
    <div className="space-y-2 text-[10px]">
      <label className="flex items-center justify-between cursor-pointer">
        <span className="font-medium">Custom Box Shadow (X/Y/Blur/Spread)</span>
        <input
          type="checkbox"
          checked={Boolean(el.customBoxShadowEnabled)}
          onChange={(e) => updateSelected({ customBoxShadowEnabled: e.target.checked })}
        />
      </label>
      {el.customBoxShadowEnabled && (
        <div className="grid grid-cols-5 gap-1 font-mono text-[9px]">
          <label className="text-center">
            <span className="block opacity-60">X</span>
            <input
              type="number"
              value={el.boxShadowX ?? 0}
              onChange={(e) => updateSelected({ boxShadowX: parseInt(e.target.value, 10) || 0 })}
              style={{ backgroundColor: 'var(--bg-input)', borderColor: 'var(--border-strong)' }}
              className="w-full border rounded px-1 py-0.5 text-center"
            />
          </label>
          <label className="text-center">
            <span className="block opacity-60">Y</span>
            <input
              type="number"
              value={el.boxShadowY ?? 4}
              onChange={(e) => updateSelected({ boxShadowY: parseInt(e.target.value, 10) || 0 })}
              style={{ backgroundColor: 'var(--bg-input)', borderColor: 'var(--border-strong)' }}
              className="w-full border rounded px-1 py-0.5 text-center"
            />
          </label>
          <label className="text-center">
            <span className="block opacity-60">Blur</span>
            <input
              type="number"
              min={0}
              value={el.boxShadowBlur ?? 12}
              onChange={(e) => updateSelected({ boxShadowBlur: Math.max(0, parseInt(e.target.value, 10) || 0) })}
              style={{ backgroundColor: 'var(--bg-input)', borderColor: 'var(--border-strong)' }}
              className="w-full border rounded px-1 py-0.5 text-center"
            />
          </label>
          <label className="text-center">
            <span className="block opacity-60">Sprd</span>
            <input
              type="number"
              value={el.boxShadowSpread ?? 0}
              onChange={(e) => updateSelected({ boxShadowSpread: parseInt(e.target.value, 10) || 0 })}
              style={{ backgroundColor: 'var(--bg-input)', borderColor: 'var(--border-strong)' }}
              className="w-full border rounded px-1 py-0.5 text-center"
            />
          </label>
          <label className="text-center flex flex-col items-center">
            <span className="block opacity-60">Inset</span>
            <input
              type="checkbox"
              checked={Boolean(el.boxShadowInset)}
              onChange={(e) => updateSelected({ boxShadowInset: e.target.checked })}
              className="mt-1"
            />
          </label>
          <input
            type="text"
            placeholder="rgba(0,0,0,0.18)"
            value={el.boxShadowColor || 'rgba(0,0,0,0.18)'}
            onChange={(e) => updateSelected({ boxShadowColor: e.target.value })}
            style={{ backgroundColor: 'var(--bg-input)', borderColor: 'var(--border-strong)' }}
            className="col-span-5 border rounded px-1.5 py-0.5 text-[10px]"
          />
        </div>
      )}

      <label className="flex items-center justify-between cursor-pointer pt-1 border-t border-[var(--border-main)]">
        <span className="font-medium">Custom Text Shadow (X/Y/Blur)</span>
        <input
          type="checkbox"
          checked={Boolean(el.customTextShadowEnabled)}
          onChange={(e) => updateSelected({ customTextShadowEnabled: e.target.checked })}
        />
      </label>
      {el.customTextShadowEnabled && (
        <div className="grid grid-cols-4 gap-1 font-mono text-[9px]">
          <input
            type="number"
            value={el.textShadowX ?? 0}
            onChange={(e) => updateSelected({ textShadowX: parseInt(e.target.value, 10) || 0 })}
            style={{ backgroundColor: 'var(--bg-input)', borderColor: 'var(--border-strong)' }}
            className="border rounded px-1 py-0.5 text-center"
            title="X (px)"
          />
          <input
            type="number"
            value={el.textShadowY ?? 2}
            onChange={(e) => updateSelected({ textShadowY: parseInt(e.target.value, 10) || 0 })}
            style={{ backgroundColor: 'var(--bg-input)', borderColor: 'var(--border-strong)' }}
            className="border rounded px-1 py-0.5 text-center"
            title="Y (px)"
          />
          <input
            type="number"
            min={0}
            value={el.textShadowBlur ?? 4}
            onChange={(e) => updateSelected({ textShadowBlur: Math.max(0, parseInt(e.target.value, 10) || 0) })}
            style={{ backgroundColor: 'var(--bg-input)', borderColor: 'var(--border-strong)' }}
            className="border rounded px-1 py-0.5 text-center"
            title="Blur (px)"
          />
          <input
            type="text"
            value={el.textShadowColor || 'rgba(0,0,0,0.45)'}
            onChange={(e) => updateSelected({ textShadowColor: e.target.value })}
            style={{ backgroundColor: 'var(--bg-input)', borderColor: 'var(--border-strong)' }}
            className="border rounded px-1 py-0.5"
            title="Shadow color"
          />
        </div>
      )}
    </div>
  );
};

/** Overflow X/Y, Max Height & Aspect Ratio controls (Layout tab). */
export const OverflowAndConstraintsSection: React.FC<PureInspectorProps> = ({
  el,
  updateSelected,
}) => {
  const effectiveOverflowY = el.overflowY || (el.scrollable ? 'auto' : 'hidden');
  return (
    <div style={{ borderColor: 'var(--border-main)' }} className="pt-2 border-t space-y-2 text-[10px]">
      <div className="flex items-center justify-between">
        <span className="font-semibold text-[10.5px] flex items-center gap-1.5">
          <Box className="w-3 h-3" style={{ color: 'var(--accent)' }} />
          <span>Overflow &amp; Size Constraints</span>
        </span>
        <F2UBadge />
      </div>
      <div className="grid grid-cols-2 gap-1.5">
        <label>
          <span style={{ color: 'var(--text-muted)' }} className="block mb-0.5">Overflow X</span>
          <select
            value={el.overflowX || 'hidden'}
            onChange={(e) => updateSelected({ overflowX: e.target.value as DesignElement['overflowX'] })}
            style={{ backgroundColor: 'var(--bg-input)', borderColor: 'var(--border-strong)' }}
            className="w-full border rounded-[4px] px-1 py-0.5"
          >
            <option value="hidden">hidden</option>
            <option value="auto">auto</option>
            <option value="scroll">scroll</option>
            <option value="visible">visible</option>
          </select>
        </label>
        <label>
          <span style={{ color: 'var(--text-muted)' }} className="block mb-0.5">Overflow Y (Scroll)</span>
          <select
            value={effectiveOverflowY}
            onChange={(e) => {
              const nextY = e.target.value as NonNullable<DesignElement['overflowY']>;
              updateSelected({
                overflowY: nextY,
                scrollable: nextY === 'auto' || nextY === 'scroll',
              });
            }}
            style={{ backgroundColor: 'var(--bg-input)', borderColor: 'var(--border-strong)' }}
            className="w-full border rounded-[4px] px-1 py-0.5"
          >
            <option value="hidden">hidden</option>
            <option value="auto">auto (scroll)</option>
            <option value="scroll">scroll</option>
            <option value="visible">visible</option>
          </select>
        </label>
        <label>
          <span style={{ color: 'var(--text-muted)' }} className="block mb-0.5">Max Height (px)</span>
          <input
            type="number"
            placeholder="Auto"
            value={el.maxHeightPx || ''}
            onChange={(e) => updateSelected({ maxHeightPx: e.target.value ? parseInt(e.target.value, 10) : undefined })}
            style={{ backgroundColor: 'var(--bg-input)', borderColor: 'var(--border-strong)' }}
            className="w-full border rounded-[4px] px-1.5 py-0.5 font-mono"
          />
        </label>
        <label>
          <span style={{ color: 'var(--text-muted)' }} className="block mb-0.5">Aspect Ratio</span>
          <select
            value={el.aspectRatio || ''}
            onChange={(e) => updateSelected({ aspectRatio: e.target.value as DesignElement['aspectRatio'] })}
            style={{ backgroundColor: 'var(--bg-input)', borderColor: 'var(--border-strong)' }}
            className="w-full border rounded-[4px] px-1 py-0.5 font-mono"
          >
            <option value="">None (Free)</option>
            <option value="1/1">1 / 1 (Square)</option>
            <option value="16/9">16 / 9 (Wide)</option>
            <option value="4/3">4 / 3</option>
            <option value="3/4">3 / 4 (Portrait)</option>
            <option value="21/9">21 / 9 (Banner)</option>
          </select>
        </label>
      </div>
    </div>
  );
};

export const F2UBootstrapAndFaSection: React.FC<PureInspectorProps> = ({
  el,
  updateSelected,
  isToyhouseFree,
}) => {
  const [showFaBrowser, setShowFaBrowser] = useState(false);
  const currentClasses = (el.bsClasses || '').split(/\s+/).filter(Boolean);
  const toggleBsClass = (cls: string) => {
    const exists = currentClasses.includes(cls);
    const next = exists ? currentClasses.filter((c) => c !== cls) : [...currentClasses, cls];
    updateSelected({ bsClasses: next.join(' ') });
  };

  const quickBsChips = [
    'card',
    'alert',
    'alert-info',
    'badge',
    'badge-pill',
    'btn',
    'btn-sm',
    'd-flex',
    'rounded',
    'rounded-circle',
    'shadow-sm',
    'shadow',
    'text-uppercase',
    'text-monospace',
    'bg-faded',
  ];

  const quickFaIcons = [
    'fa-solid fa-star',
    'fa-regular fa-heart',
    'fa-solid fa-moon',
    'fa-solid fa-sparkles',
    'fa-solid fa-folder-open',
    'fa-solid fa-bolt',
    'fa-solid fa-music',
    'fa-solid fa-bookmark',
  ];

  return (
    <div className="space-y-2.5">
      {/* Bootstrap 4 Classes */}
      <div className="space-y-1 text-[10px]">
        <span style={{ color: 'var(--text-muted)' }} className="block">
          Bootstrap 4 Classes (Click to toggle)
        </span>
        <div className="flex flex-wrap gap-1">
          {quickBsChips.map((cls) => {
            const active = currentClasses.includes(cls);
            return (
              <button
                key={cls}
                type="button"
                onClick={() => toggleBsClass(cls)}
                style={
                  active
                    ? { backgroundColor: 'var(--accent)', color: '#fff', borderColor: 'var(--accent)' }
                    : { backgroundColor: 'var(--bg-input)', borderColor: 'var(--border-strong)' }
                }
                className="border rounded-[4px] px-1.5 py-0.5 font-mono text-[9.5px] transition"
              >
                .{cls}
              </button>
            );
          })}
        </div>
        <input
          type="text"
          placeholder="Custom Bootstrap classes (e.g. card border-0 bg-faded p-3)"
          value={el.bsClasses || ''}
          onChange={(e) => updateSelected({ bsClasses: e.target.value })}
          style={{ backgroundColor: 'var(--bg-input)', borderColor: 'var(--border-strong)' }}
          className="w-full border rounded-[5px] px-2 py-1 font-mono text-[10px]"
        />
      </div>

      {/* Font Awesome Icon + Size + Stack */}
      <div className="space-y-1.5 pt-1.5 border-t border-[var(--border-main)] text-[10px]">
        <div className="flex items-center justify-between">
          <span style={{ color: 'var(--text-muted)' }}>Inline Font Awesome Icon</span>
          {el.faIcon && (
            <button
              type="button"
              onClick={() => updateSelected({ faIcon: '', faStackBgIcon: '' })}
              className="text-red-400 hover:underline text-[9px]"
            >
              Remove
            </button>
          )}
        </div>
        <input
          type="text"
          placeholder="e.g. fa-solid fa-star or fa-light fa-moon"
          value={el.faIcon || ''}
          onChange={(e) => updateSelected({ faIcon: e.target.value })}
          style={{ backgroundColor: 'var(--bg-input)', borderColor: 'var(--border-strong)' }}
          className="w-full border rounded-[5px] px-2 py-1 font-mono text-[10px]"
        />
        <div className="flex items-center flex-wrap gap-1">
          {quickFaIcons.map((ic) => (
            <button
              key={ic}
              type="button"
              onClick={() => updateSelected({ faIcon: ic })}
              style={{ backgroundColor: 'var(--bg-input)', borderColor: 'var(--border-strong)' }}
              className="border rounded px-1.5 py-0.5 text-[10px] hover:opacity-80"
              title={ic}
            >
              <i className={ic} />
            </button>
          ))}
          <button
            type="button"
            onClick={() => setShowFaBrowser((v) => !v)}
            style={
              showFaBrowser
                ? { backgroundColor: 'var(--accent)', color: '#fff', borderColor: 'var(--accent)' }
                : { backgroundColor: 'var(--bg-input)', borderColor: 'var(--border-strong)', color: 'var(--accent)' }
            }
            className="border rounded px-2 py-0.5 text-[9.5px] font-mono font-semibold ml-auto"
          >
            {showFaBrowser ? 'Close Browser' : 'Browse Icons...'}
          </button>
        </div>
        {showFaBrowser && (
          <div
            style={{ backgroundColor: 'var(--bg-panel)', borderColor: 'var(--border-main)' }}
            className="p-2 rounded-[6px] border"
          >
            <FaIconBrowser
              compact
              f2uDefaultOnly={isToyhouseFree}
              selectedClass={el.faIcon}
              onSelectIcon={(cls) => updateSelected({ faIcon: cls })}
            />
          </div>
        )}
        {el.faIcon && (
          <div className="grid grid-cols-2 gap-1.5">
            <select
              value={el.faIconSize || ''}
              onChange={(e) => updateSelected({ faIconSize: e.target.value as DesignElement['faIconSize'] })}
              style={{ backgroundColor: 'var(--bg-input)', borderColor: 'var(--border-strong)' }}
              className="border rounded-[4px] px-1 py-0.5 text-[10px] font-mono"
            >
              <option value="">Size: Default</option>
              <option value="fa-xs">fa-xs</option>
              <option value="fa-sm">fa-sm</option>
              <option value="fa-lg">fa-lg</option>
              <option value="fa-2x">fa-2x</option>
              <option value="fa-3x">fa-3x</option>
            </select>
            <select
              value={el.faIconPull || ''}
              onChange={(e) => updateSelected({ faIconPull: e.target.value as DesignElement['faIconPull'] })}
              style={{ backgroundColor: 'var(--bg-input)', borderColor: 'var(--border-strong)' }}
              className="border rounded-[4px] px-1 py-0.5 text-[10px] font-mono"
            >
              <option value="">Inline (No Pull)</option>
              <option value="fa-pull-left">fa-pull-left</option>
              <option value="fa-pull-right">fa-pull-right</option>
            </select>
            <input
              type="text"
              placeholder="fa-stack BG icon (e.g. fa-solid fa-circle)"
              value={el.faStackBgIcon || ''}
              onChange={(e) => updateSelected({ faStackBgIcon: e.target.value })}
              style={{ backgroundColor: 'var(--bg-input)', borderColor: 'var(--border-strong)' }}
              className="col-span-2 border rounded-[4px] px-1.5 py-0.5 text-[10px] font-mono"
            />
          </div>
        )}
      </div>
    </div>
  );
};

export const F2UInteractionAndAtomsSection: React.FC<PureInspectorProps> = ({
  el,
  updateSelected,
  swatches,
}) => {
  return (
    <div className="space-y-2.5">
      {/* Pure List Options */}
      {el.type === 'pure_list' && (
        <label className="block text-[10px]">
          <span style={{ color: 'var(--text-muted)' }} className="block mb-0.5">List Style Type</span>
          <select
            value={el.listStyleType || 'disc'}
            onChange={(e) => updateSelected({ listStyleType: e.target.value as DesignElement['listStyleType'] })}
            style={{ backgroundColor: 'var(--bg-input)', borderColor: 'var(--border-strong)' }}
            className="w-full border rounded-[5px] px-1.5 py-1 text-[10px]"
          >
            <option value="disc">Bullets (Disc)</option>
            <option value="circle">Hollow Circle</option>
            <option value="square">Square</option>
            <option value="decimal">Numbered (1, 2, 3)</option>
            <option value="checklist">Font Awesome Checklist (F2U)</option>
            <option value="none">Plain (No Marker)</option>
          </select>
        </label>
      )}

      {/* Pure Table Options */}
      {el.type === 'pure_table' && (
        <div className="space-y-1.5 text-[10px]">
          <label className="block">
            <span style={{ color: 'var(--text-muted)' }} className="block mb-0.5">
              Table Headers (separate with |)
            </span>
            <input
              type="text"
              value={el.tableHeaders || ''}
              onChange={(e) => updateSelected({ tableHeaders: e.target.value })}
              style={{ backgroundColor: 'var(--bg-input)', borderColor: 'var(--border-strong)' }}
              className="w-full border rounded-[5px] px-2 py-1 font-mono text-[10px]"
            />
          </label>
          <div className="flex items-center gap-3">
            <label className="flex items-center gap-1 cursor-pointer">
              <input
                type="checkbox"
                checked={el.tableBordered !== false}
                onChange={(e) => updateSelected({ tableBordered: e.target.checked })}
              />
              <span>Bordered</span>
            </label>
            <label className="flex items-center gap-1 cursor-pointer">
              <input
                type="checkbox"
                checked={Boolean(el.tableStriped)}
                onChange={(e) => updateSelected({ tableStriped: e.target.checked })}
              />
              <span>Striped</span>
            </label>
            <label className="flex items-center gap-1 cursor-pointer">
              <input
                type="checkbox"
                checked={Boolean(el.tableHover)}
                onChange={(e) => updateSelected({ tableHover: e.target.checked })}
              />
              <span>Hover Row</span>
            </label>
          </div>
        </div>
      )}

      {/* Pure Progress / Stat Bar Options */}
      {(el.type === 'pure_progress' || el.type === 'stat_bar') && (
        <div className="space-y-1.5 text-[10px]">
          <div className="flex items-center justify-between gap-2">
            <span style={{ color: 'var(--text-muted)' }}>Bar Fill Color</span>
            <StudioColorButton
              value={el.progressBarColor || '#4B5563'}
              onChange={(nextColor) => updateSelected({ progressBarColor: nextColor })}
              fallbackHex="#4B5563"
              allowTransparent={false}
              swatches={swatches}
              title="Progress Bar Fill Color"
              className="h-7 px-1.5"
            />
          </div>
          <div className="flex items-center gap-3">
            <label className="flex items-center gap-1 cursor-pointer">
              <input
                type="checkbox"
                checked={Boolean(el.progressStriped)}
                onChange={(e) => updateSelected({ progressStriped: e.target.checked })}
              />
              <span>Striped (.progress-bar-striped)</span>
            </label>
            <label className="flex items-center gap-1 cursor-pointer">
              <input
                type="checkbox"
                checked={Boolean(el.progressAnimated)}
                onChange={(e) => updateSelected({ progressAnimated: e.target.checked })}
              />
              <span>Animated</span>
            </label>
          </div>
        </div>
      )}

      {/* Bootstrap Collapse Role (F2U!) */}
      <div className="space-y-1.5 text-[10px]">
        <span style={{ color: 'var(--text-muted)' }} className="block">
          Bootstrap 4 Collapse Linking (data-toggle=&quot;collapse&quot;)
        </span>
        <div className="grid grid-cols-2 gap-1.5">
          <select
            value={el.f2uCollapseRole || 'none'}
            onChange={(e) => updateSelected({ f2uCollapseRole: e.target.value as DesignElement['f2uCollapseRole'] })}
            style={{ backgroundColor: 'var(--bg-input)', borderColor: 'var(--border-strong)' }}
            className="border rounded-[4px] px-1.5 py-1 text-[10px]"
          >
            <option value="none">Role: Normal</option>
            <option value="trigger">Trigger Button (#id)</option>
            <option value="target">Collapsible Target (#id)</option>
          </select>
          <input
            type="text"
            placeholder="Collapse ID (e.g. lore-1)"
            value={el.f2uCollapseId || ''}
            onChange={(e) => updateSelected({ f2uCollapseId: e.target.value })}
            style={{ backgroundColor: 'var(--bg-input)', borderColor: 'var(--border-strong)' }}
            className="border rounded-[4px] px-1.5 py-1 font-mono text-[10px]"
          />
        </div>
        {(el.f2uCollapseRole === 'target' || el.type === 'pure_collapse') && (
          <label className="flex items-center gap-1.5 cursor-pointer">
            <input
              type="checkbox"
              checked={Boolean(el.f2uCollapseDefaultOpen)}
              onChange={(e) => updateSelected({ f2uCollapseDefaultOpen: e.target.checked })}
            />
            <span>Collapse Open by Default (.show)</span>
          </label>
        )}
      </div>

      {/* Cursor, Pointer Events & User Select */}
      <div className="grid grid-cols-3 gap-1.5 pt-1.5 border-t border-[var(--border-main)] text-[10px]">
        <label>
          <span style={{ color: 'var(--text-muted)' }} className="block mb-0.5">Cursor</span>
          <select
            value={el.cursorStyle || 'auto'}
            onChange={(e) => updateSelected({ cursorStyle: e.target.value as DesignElement['cursorStyle'] })}
            style={{ backgroundColor: 'var(--bg-input)', borderColor: 'var(--border-strong)' }}
            className="w-full border rounded-[4px] px-1 py-0.5"
          >
            <option value="auto">auto</option>
            <option value="pointer">pointer</option>
            <option value="default">default</option>
            <option value="help">help</option>
            <option value="grab">grab</option>
            <option value="not-allowed">not-allowed</option>
          </select>
        </label>
        <label>
          <span style={{ color: 'var(--text-muted)' }} className="block mb-0.5">Pointer Evt</span>
          <select
            value={el.pointerEvents || 'auto'}
            onChange={(e) => updateSelected({ pointerEvents: e.target.value as 'auto' | 'none' })}
            style={{ backgroundColor: 'var(--bg-input)', borderColor: 'var(--border-strong)' }}
            className="w-full border rounded-[4px] px-1 py-0.5"
          >
            <option value="auto">auto</option>
            <option value="none">none (pass-through)</option>
          </select>
        </label>
        <label>
          <span style={{ color: 'var(--text-muted)' }} className="block mb-0.5">User Select</span>
          <select
            value={el.userSelect || 'auto'}
            onChange={(e) => updateSelected({ userSelect: e.target.value as DesignElement['userSelect'] })}
            style={{ backgroundColor: 'var(--bg-input)', borderColor: 'var(--border-strong)' }}
            className="w-full border rounded-[4px] px-1 py-0.5"
          >
            <option value="auto">auto</option>
            <option value="none">none</option>
            <option value="all">all</option>
          </select>
        </label>
      </div>
    </div>
  );
};

export const RawHtmlCssOverrideSection: React.FC<PureInspectorProps> = ({
  el,
  updateSelected,
}) => {
  const f2uSnippets = [
    {
      label: '+ <details>',
      code: '<details><summary style="cursor:pointer;font-weight:700;">Spoiler Title</summary><div class="pt-2">Hidden F2U text...</div></details>',
    },
    {
      label: '+ Row 2-Col',
      code: '<div class="row no-gutters"><div class="col-6 p-1">Left</div><div class="col-6 p-1">Right</div></div>',
    },
    {
      label: '+ Badge',
      code: '<span class="badge badge-pill" style="background:#1F2937;color:#fff;">TAG</span>',
    },
    {
      label: '+ FA Icon',
      code: '<i class="fa-solid fa-star fa-fw"></i>',
    },
  ];

  return (
    <div className="space-y-2 text-[10px]">
      <div className="flex items-center justify-end gap-1">
        <F2UBadge />
        <ProBadge />
      </div>

      <label className="block">
        <span style={{ color: 'var(--text-muted)' }} className="block mb-0.5">
          Custom CSS Classes
        </span>
        <input
          type="text"
          placeholder="e.g. my-card text-center border-0"
          value={el.customCssClass || ''}
          onChange={(e) => updateSelected({ customCssClass: e.target.value })}
          style={{ backgroundColor: 'var(--bg-input)', borderColor: 'var(--border-strong)' }}
          className="w-full border rounded-[5px] px-2 py-1 font-mono text-[10px]"
        />
      </label>

      <label className="block">
        <span style={{ color: 'var(--text-muted)' }} className="block mb-0.5">
          Custom Inline <code>style=&quot;&quot;</code> Append
        </span>
        <textarea
          rows={2}
          placeholder="e.g. letter-spacing: 0.1em; outline: 1px solid #000; outline-offset: -4px;"
          value={el.customInlineStyle || ''}
          onChange={(e) => updateSelected({ customInlineStyle: e.target.value })}
          style={{ backgroundColor: 'var(--bg-input)', borderColor: 'var(--border-strong)' }}
          className="w-full border rounded-[5px] px-2 py-1 font-mono text-[10px]"
        />
      </label>

      <div className="space-y-1">
        <div className="flex items-center justify-between">
          <span style={{ color: 'var(--text-muted)' }}>Raw Inner HTML Override (Replaces body)</span>
          {el.rawInnerHtml && (
            <button
              type="button"
              onClick={() => updateSelected({ rawInnerHtml: '' })}
              className="text-red-400 hover:underline text-[9px]"
            >
              Clear Override
            </button>
          )}
        </div>
        <div className="flex flex-wrap gap-1">
          {f2uSnippets.map((sn) => (
            <button
              key={sn.label}
              type="button"
              onClick={() =>
                updateSelected({
                  rawInnerHtml: `${el.rawInnerHtml ? el.rawInnerHtml + '\n' : ''}${sn.code}`,
                })
              }
              style={{ backgroundColor: 'var(--bg-input)', borderColor: 'var(--border-strong)' }}
              className="border rounded px-1.5 py-0.5 font-mono text-[9px] hover:opacity-80"
            >
              {sn.label}
            </button>
          ))}
        </div>
        <textarea
          rows={3}
          placeholder="Optional: paste any pure F2U HTML here to render directly inside this container..."
          value={el.rawInnerHtml || ''}
          onChange={(e) => updateSelected({ rawInnerHtml: e.target.value })}
          style={{ backgroundColor: 'var(--bg-input)', borderColor: 'var(--border-strong)' }}
          className="w-full border rounded-[5px] px-2 py-1 font-mono text-[10px]"
        />
      </div>
    </div>
  );
};
