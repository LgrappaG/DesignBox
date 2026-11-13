import React, { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { Check, Pipette, Plus, Sparkles } from 'lucide-react';
import {
  formatColorOutput,
  getContrastInk,
  hexToHsv,
  hsvToHex,
  HsvColor,
  normalizeHexColor,
  parseColorValue,
} from '../../utils/colorMath';

interface BrowserEyeDropperResult {
  sRGBHex: string;
}

interface BrowserEyeDropper {
  open: () => Promise<BrowserEyeDropperResult>;
}

type EyeDropperConstructor = new () => BrowserEyeDropper;

const CHECKERBOARD_STYLE: React.CSSProperties = {
  backgroundImage:
    'linear-gradient(45deg, rgba(128,128,128,0.22) 25%, transparent 25%), ' +
    'linear-gradient(-45deg, rgba(128,128,128,0.22) 25%, transparent 25%), ' +
    'linear-gradient(45deg, transparent 75%, rgba(128,128,128,0.22) 75%), ' +
    'linear-gradient(-45deg, transparent 75%, rgba(128,128,128,0.22) 75%)',
  backgroundSize: '8px 8px',
  backgroundPosition: '0 0, 0 4px, 4px -4px, -4px 0',
};

function clamp(val: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, val));
}

function getEyeDropperConstructor(): EyeDropperConstructor | null {
  if (typeof window === 'undefined') return null;
  const candidate = (window as unknown as { EyeDropper?: EyeDropperConstructor }).EyeDropper;
  return typeof candidate === 'function' ? candidate : null;
}

export interface StudioColorPanelProps {
  value: string | undefined;
  onChange: (nextColor: string) => void;
  fallbackHex?: string;
  allowTransparent?: boolean;
  allowAlpha?: boolean;
  allowInherit?: boolean;
  inheritLabel?: string;
  swatches?: string[];
  onAddSwatch?: (hex: string) => void;
  compact?: boolean;
}

/**
 * Interactive HSV studio color picker panel with 2D Saturation/Value canvas,
 * Hue slider, optional Alpha slider, editable HEX field, EyeDropper, and Swatches.
 */
export const StudioColorPanel: React.FC<StudioColorPanelProps> = ({
  value,
  onChange,
  fallbackHex = '#FAF8F5',
  allowTransparent = true,
  allowAlpha = true,
  allowInherit = false,
  inheritLabel = 'Inherit',
  swatches,
  onAddSwatch,
  compact = false,
}) => {
  const parsed = useMemo(() => parseColorValue(value, fallbackHex), [value, fallbackHex]);
  const [hsv, setHsv] = useState<HsvColor>(() => hexToHsv(parsed.hex));
  const [alpha, setAlpha] = useState<number>(() => (parsed.isTransparent ? 0 : parsed.alpha));
  const [hexDraft, setHexDraft] = useState<string>(parsed.hex);

  const lastEmittedRef = useRef<string | undefined>(undefined);
  const svAreaRef = useRef<HTMLDivElement>(null);
  const hueBarRef = useRef<HTMLDivElement>(null);
  const alphaBarRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (value === lastEmittedRef.current) return;
    lastEmittedRef.current = value;

    const nextParsed = parseColorValue(value, fallbackHex);
    const nextHsv = hexToHsv(nextParsed.hex);
    setHsv((prev) => ({
      // Preserve current Hue while dragging or inspecting grayscale/transparent colors.
      h: nextHsv.s > 0 && nextHsv.v > 0 && !nextParsed.isTransparent ? nextHsv.h : prev.h,
      s: nextParsed.isTransparent ? prev.s : nextHsv.s,
      v: nextParsed.isTransparent ? prev.v : nextHsv.v,
    }));
    setAlpha(nextParsed.isTransparent ? 0 : nextParsed.alpha);
    setHexDraft(nextParsed.hex);
  }, [value, fallbackHex]);

  const emitColor = useCallback(
    (nextHsv: HsvColor, nextAlpha: number) => {
      const clampedAlpha = allowAlpha ? clamp(nextAlpha, 0, 1) : nextAlpha <= 0.001 && allowTransparent ? 0 : 1;
      const nextHex = hsvToHex(nextHsv);
      const formatted = formatColorOutput(nextHex, clampedAlpha);
      lastEmittedRef.current = formatted;
      setHsv(nextHsv);
      setAlpha(clampedAlpha);
      setHexDraft(nextHex);
      onChange(formatted);
    },
    [allowAlpha, allowTransparent, onChange]
  );

  const handleSvPointer = useCallback(
    (clientX: number, clientY: number) => {
      const el = svAreaRef.current;
      if (!el) return;
      const rect = el.getBoundingClientRect();
      if (rect.width <= 0 || rect.height <= 0) return;
      const s = clamp(((clientX - rect.left) / rect.width) * 100, 0, 100);
      const v = clamp((1 - (clientY - rect.top) / rect.height) * 100, 0, 100);
      const nextAlpha = alpha <= 0.01 ? 1 : alpha;
      emitColor({ h: hsv.h, s, v }, nextAlpha);
    },
    [alpha, emitColor, hsv.h]
  );

  const handleHuePointer = useCallback(
    (clientX: number) => {
      const el = hueBarRef.current;
      if (!el) return;
      const rect = el.getBoundingClientRect();
      if (rect.width <= 0) return;
      const ratio = clamp((clientX - rect.left) / rect.width, 0, 1);
      const nextH = ratio * 360;
      const nextAlpha = alpha <= 0.01 ? 1 : alpha;
      emitColor({ h: nextH, s: hsv.s, v: hsv.v }, nextAlpha);
    },
    [alpha, emitColor, hsv.s, hsv.v]
  );

  const handleAlphaPointer = useCallback(
    (clientX: number) => {
      const el = alphaBarRef.current;
      if (!el) return;
      const rect = el.getBoundingClientRect();
      if (rect.width <= 0) return;
      const ratio = clamp((clientX - rect.left) / rect.width, 0, 1);
      const minAlpha = allowTransparent ? 0 : 0.05;
      emitColor(hsv, Math.max(minAlpha, ratio));
    },
    [allowTransparent, emitColor, hsv]
  );

  const activeHex = hsvToHex(hsv);
  const hueColor = `hsl(${Math.round(hsv.h)}, 100%, 50%)`;
  const effectivePreview = parsed.isInherit
    ? 'transparent'
    : parsed.isTransparent || alpha <= 0.001
      ? 'transparent'
      : formatColorOutput(activeHex, alpha);
  const supportsEyeDropper = Boolean(getEyeDropperConstructor());
  const normalizedCurrentOpaque = parsed.isTransparent || parsed.isInherit ? null : activeHex;
  const canSaveSwatch =
    Boolean(onAddSwatch) &&
    Boolean(normalizedCurrentOpaque) &&
    !(swatches || []).some((sw) => sw.toUpperCase() === normalizedCurrentOpaque);

  const handleEyeDropper = async () => {
    const EyeDropperCtor = getEyeDropperConstructor();
    if (!EyeDropperCtor) return;
    try {
      const dropper = new EyeDropperCtor();
      const result = await dropper.open();
      const normalized = normalizeHexColor(result.sRGBHex);
      if (normalized) {
        const pickedHsv = hexToHsv(normalized);
        emitColor(pickedHsv, alpha <= 0.01 ? 1 : alpha);
      }
    } catch {
      // User cancelled native eyedropper cleanly; ignore abort error.
    }
  };

  const handleHexDraftChange = (raw: string) => {
    setHexDraft(raw);
    const clean = normalizeHexColor(raw);
    if (clean) {
      const nextHsv = hexToHsv(clean);
      const nextAlpha = alpha <= 0.01 ? 1 : alpha;
      const formatted = formatColorOutput(clean, allowAlpha ? nextAlpha : 1);
      lastEmittedRef.current = formatted;
      setHsv(nextHsv);
      setAlpha(allowAlpha ? nextAlpha : 1);
      onChange(formatted);
    }
  };

  const handleHexBlur = () => {
    const clean = normalizeHexColor(hexDraft);
    if (clean) {
      setHexDraft(clean);
    } else {
      setHexDraft(activeHex);
    }
  };

  return (
    <div className="space-y-2.5 select-none">
      {/* 2D Saturation / Value Plane */}
      <div
        ref={svAreaRef}
        onPointerDown={(e) => {
          e.preventDefault();
          e.currentTarget.setPointerCapture(e.pointerId);
          handleSvPointer(e.clientX, e.clientY);
        }}
        onPointerMove={(e) => {
          if (e.buttons === 0) return;
          handleSvPointer(e.clientX, e.clientY);
        }}
        style={{ backgroundColor: hueColor }}
        className={`relative w-full ${compact ? 'h-28' : 'h-36'} rounded-lg overflow-hidden border border-[var(--border-strong)] cursor-crosshair touch-none shadow-inner`}
      >
        <div
          className="absolute inset-0 pointer-events-none"
          style={{ background: 'linear-gradient(to right, #FFFFFF, rgba(255,255,255,0))' }}
        />
        <div
          className="absolute inset-0 pointer-events-none"
          style={{ background: 'linear-gradient(to bottom, rgba(0,0,0,0), #000000)' }}
        />
        <div
          style={{
            left: `${hsv.s}%`,
            top: `${100 - hsv.v}%`,
            backgroundColor: activeHex,
          }}
          className="absolute w-3.5 h-3.5 -translate-x-1/2 -translate-y-1/2 rounded-full border-2 border-white shadow-[0_0_0_1.5px_rgba(0,0,0,0.65)] pointer-events-none"
        />
      </div>

      {/* Hue Slider */}
      <div className="space-y-1.5">
        <div
          ref={hueBarRef}
          onPointerDown={(e) => {
            e.preventDefault();
            e.currentTarget.setPointerCapture(e.pointerId);
            handleHuePointer(e.clientX);
          }}
          onPointerMove={(e) => {
            if (e.buttons === 0) return;
            handleHuePointer(e.clientX);
          }}
          style={{
            background:
              'linear-gradient(to right, #FF0000 0%, #FFFF00 17%, #00FF00 33%, #00FFFF 50%, #0000FF 67%, #FF00FF 83%, #FF0000 100%)',
          }}
          className="relative w-full h-3 rounded-full border border-[var(--border-strong)] cursor-pointer touch-none"
        >
          <div
            style={{
              left: `${(hsv.h / 360) * 100}%`,
              backgroundColor: hueColor,
            }}
            className="absolute top-1/2 w-3.5 h-3.5 -translate-x-1/2 -translate-y-1/2 rounded-full border-2 border-white shadow-[0_0_0_1px_rgba(0,0,0,0.6)] pointer-events-none"
          />
        </div>

        {/* Alpha / Opacity Slider */}
        {allowAlpha && (
          <div className="flex items-center gap-2">
            <div
              ref={alphaBarRef}
              onPointerDown={(e) => {
                e.preventDefault();
                e.currentTarget.setPointerCapture(e.pointerId);
                handleAlphaPointer(e.clientX);
              }}
              onPointerMove={(e) => {
                if (e.buttons === 0) return;
                handleAlphaPointer(e.clientX);
              }}
              style={CHECKERBOARD_STYLE}
              className="relative flex-1 h-3 rounded-full overflow-hidden border border-[var(--border-strong)] cursor-pointer touch-none"
            >
              <div
                className="absolute inset-0 pointer-events-none"
                style={{
                  background: `linear-gradient(to right, rgba(0,0,0,0), ${activeHex})`,
                }}
              />
              <div
                style={{ left: `${alpha * 100}%` }}
                className="absolute top-1/2 w-3 h-3 -translate-x-1/2 -translate-y-1/2 rounded-full bg-white border border-stone-700 shadow pointer-events-none"
              />
            </div>
            <span className="w-8 text-right text-[10px] font-mono text-[var(--text-muted)] shrink-0">
              {Math.round(alpha * 100)}%
            </span>
          </div>
        )}
      </div>

      {/* Preview + Editable HEX + EyeDropper + Quick Clear/Inherit */}
      <div className="flex items-center gap-1.5 min-w-0">
        <div
          style={CHECKERBOARD_STYLE}
          className="relative w-7 h-7 rounded-md border border-[var(--border-strong)] overflow-hidden shrink-0"
          title={effectivePreview === 'transparent' ? 'Transparent' : activeHex}
        >
          <div className="w-full h-full" style={{ backgroundColor: effectivePreview }} />
          {parsed.isTransparent && (
            <div className="absolute inset-0 pointer-events-none">
              <div className="w-[140%] h-[1.5px] bg-red-500 rotate-45 origin-center translate-y-[12px] -translate-x-[4px]" />
            </div>
          )}
        </div>

        <input
          type="text"
          value={hexDraft}
          onChange={(e) => handleHexDraftChange(e.target.value)}
          onBlur={handleHexBlur}
          onKeyDown={(e) => {
            if (e.key === 'Enter') handleHexBlur();
          }}
          spellCheck={false}
          aria-label="Hex color code"
          className="min-w-0 flex-1 bg-[var(--bg-input)] border border-[var(--border-main)] rounded-md px-2 py-1 text-[11px] font-mono text-[var(--text-main)] focus:outline-none focus:border-[var(--accent)]"
        />

        {supportsEyeDropper && (
          <button
            type="button"
            onClick={handleEyeDropper}
            title="Pick color from screen (EyeDropper)"
            className="h-7 px-2 rounded-md border border-[var(--border-main)] bg-[var(--bg-panel-alt)] text-[var(--text-main)] hover:border-[var(--accent)] transition flex items-center justify-center shrink-0"
          >
            <Pipette className="w-3.5 h-3.5" />
          </button>
        )}

        {allowTransparent && (
          <button
            type="button"
            onClick={() => {
              if (parsed.isTransparent) {
                emitColor(hsv, 1);
              } else {
                lastEmittedRef.current = 'transparent';
                setAlpha(0);
                onChange('transparent');
              }
            }}
            title={parsed.isTransparent ? 'Restore solid color' : 'Set transparent'}
            className={`h-7 px-2 rounded-md border text-[10px] font-semibold transition shrink-0 ${
              parsed.isTransparent
                ? 'bg-[var(--accent)] text-white border-[var(--accent)]'
                : 'bg-[var(--bg-panel-alt)] text-[var(--text-muted)] border-[var(--border-main)] hover:text-[var(--text-main)]'
            }`}
          >
            {parsed.isTransparent ? 'Solid' : 'Clear'}
          </button>
        )}

        {allowInherit && (
          <button
            type="button"
            onClick={() => {
              lastEmittedRef.current = 'inherit';
              onChange('inherit');
            }}
            title={`Set to ${inheritLabel}`}
            className={`h-7 px-2 rounded-md border text-[10px] font-semibold transition shrink-0 flex items-center gap-1 ${
              parsed.isInherit
                ? 'bg-[var(--accent)] text-white border-[var(--accent)]'
                : 'bg-[var(--bg-panel-alt)] text-[var(--text-muted)] border-[var(--border-main)] hover:text-[var(--text-main)]'
            }`}
          >
            <Sparkles className="w-2.5 h-2.5" />
            {inheritLabel}
          </button>
        )}
      </div>

      {/* Integrated Swatches Palette */}
      {swatches && swatches.length > 0 && (
        <div className="pt-2 border-t border-[var(--border-main)] space-y-1.5">
          <div className="flex items-center justify-between gap-2">
            <span className="text-[10px] font-semibold uppercase tracking-wider text-[var(--text-muted)]">
              Swatches
            </span>
            {canSaveSwatch && normalizedCurrentOpaque && onAddSwatch && (
              <button
                type="button"
                onClick={() => onAddSwatch(normalizedCurrentOpaque)}
                className="text-[10px] font-semibold text-[var(--accent)] hover:underline flex items-center gap-0.5"
              >
                <Plus className="w-2.5 h-2.5" /> Save {normalizedCurrentOpaque}
              </button>
            )}
          </div>
          <div className="flex flex-wrap gap-1.5">
            {swatches.map((hex) => {
              const norm = normalizeHexColor(hex) || hex;
              const isSelected =
                !parsed.isTransparent &&
                !parsed.isInherit &&
                norm.toUpperCase() === activeHex.toUpperCase();
              return (
                <button
                  key={hex}
                  type="button"
                  onClick={() => emitColor(hexToHsv(norm), 1)}
                  title={norm}
                  style={{ backgroundColor: norm }}
                  className={`w-5 h-5 rounded-md border transition hover:scale-110 flex items-center justify-center ${
                    isSelected
                      ? 'ring-2 ring-[var(--accent)] border-white'
                      : 'border-[var(--border-strong)]'
                  }`}
                >
                  {isSelected && (
                    <Check className="w-3 h-3" style={{ color: getContrastInk(norm) }} />
                  )}
                </button>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
};

export interface StudioColorButtonProps {
  value: string | undefined;
  onChange: (nextColor: string) => void;
  fallbackHex?: string;
  title?: string;
  label?: string;
  compact?: boolean;
  fullWidth?: boolean;
  allowTransparent?: boolean;
  allowAlpha?: boolean;
  allowInherit?: boolean;
  inheritLabel?: string;
  swatches?: string[];
  onAddSwatch?: (hex: string) => void;
  disabled?: boolean;
  className?: string;
}

const POPOVER_WIDTH = 252;
const POPOVER_ESTIMATED_HEIGHT = 340;

/**
 * Compact color swatch button that opens a portal-mounted StudioColorPanel popover,
 * safely clamped inside the viewport so overflow-hidden sidebars never clip it.
 */
export const StudioColorButton: React.FC<StudioColorButtonProps> = ({
  value,
  onChange,
  fallbackHex = '#FAF8F5',
  title,
  label,
  compact = false,
  fullWidth = false,
  allowTransparent = true,
  allowAlpha = true,
  allowInherit = false,
  inheritLabel = 'Inherit',
  swatches,
  onAddSwatch,
  disabled = false,
  className = '',
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [coords, setCoords] = useState<{ top: number; left: number }>({ top: 0, left: 0 });
  const triggerRef = useRef<HTMLButtonElement>(null);
  const popoverRef = useRef<HTMLDivElement>(null);

  const parsed = useMemo(() => parseColorValue(value, fallbackHex), [value, fallbackHex]);

  const updatePopoverPosition = useCallback(() => {
    const trigger = triggerRef.current;
    if (!trigger) return;
    const rect = trigger.getBoundingClientRect();
    const popHeight = popoverRef.current?.offsetHeight || POPOVER_ESTIMATED_HEIGHT;
    const popWidth = POPOVER_WIDTH;

    let left = rect.left;
    if (left + popWidth > window.innerWidth - 10) {
      left = Math.max(10, rect.right - popWidth);
    }
    if (left + popWidth > window.innerWidth - 10) {
      left = Math.max(10, window.innerWidth - popWidth - 10);
    }

    const spaceBelow = window.innerHeight - rect.bottom - 10;
    const spaceAbove = rect.top - 10;
    let top = rect.bottom + 6;
    if (spaceBelow < popHeight && spaceAbove > spaceBelow) {
      top = Math.max(10, rect.top - popHeight - 6);
    }
    if (top + popHeight > window.innerHeight - 10) {
      top = Math.max(10, window.innerHeight - popHeight - 10);
    }

    setCoords({ top: Math.round(top), left: Math.round(left) });
  }, []);

  useLayoutEffect(() => {
    if (!isOpen) return;
    updatePopoverPosition();
  }, [isOpen, updatePopoverPosition]);

  useEffect(() => {
    if (!isOpen) return;
    const handlePointerDown = (e: PointerEvent) => {
      const target = e.target as Node | null;
      if (
        target &&
        (triggerRef.current?.contains(target) || popoverRef.current?.contains(target))
      ) {
        return;
      }
      setIsOpen(false);
    };
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setIsOpen(false);
    };
    const handleReposition = () => updatePopoverPosition();

    window.addEventListener('pointerdown', handlePointerDown);
    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('resize', handleReposition);
    window.addEventListener('scroll', handleReposition, true);
    return () => {
      window.removeEventListener('pointerdown', handlePointerDown);
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('resize', handleReposition);
      window.removeEventListener('scroll', handleReposition, true);
    };
  }, [isOpen, updatePopoverPosition]);

  const displayText = parsed.isInherit
    ? inheritLabel
    : parsed.isTransparent
      ? 'None'
      : parsed.alpha < 0.995
        ? `${parsed.hex} ${Math.round(parsed.alpha * 100)}%`
        : parsed.hex;

  const swatchBg = parsed.isInherit
    ? 'transparent'
    : parsed.isTransparent
      ? 'transparent'
      : formatColorOutput(parsed.hex, parsed.alpha);

  return (
    <>
      <button
        ref={triggerRef}
        type="button"
        disabled={disabled}
        onClick={() => setIsOpen((prev) => !prev)}
        title={title || displayText}
        className={`group flex items-center gap-1.5 rounded-md border border-[var(--border-main)] bg-[var(--bg-input)] text-[var(--text-main)] hover:border-[var(--accent)] transition focus:outline-none focus:border-[var(--accent)] disabled:opacity-50 disabled:cursor-not-allowed ${
          compact ? 'px-1.5 py-1 h-7' : 'px-2 py-1.5 h-8'
        } ${fullWidth ? 'w-full' : ''} ${
          isOpen ? 'border-[var(--accent)] ring-1 ring-[var(--accent)]/40' : ''
        } ${className}`}
      >
        <span
          style={CHECKERBOARD_STYLE}
          className="relative w-4 h-4 rounded-[4px] border border-[var(--border-strong)] overflow-hidden shrink-0"
        >
          <span className="block w-full h-full" style={{ backgroundColor: swatchBg }} />
          {parsed.isTransparent && (
            <span className="absolute inset-0 pointer-events-none block">
              <span className="block w-[140%] h-[1.5px] bg-red-500 rotate-45 origin-center translate-y-[7px] -translate-x-[3px]" />
            </span>
          )}
        </span>

        {!compact && (
          <span className="min-w-0 flex-1 text-left flex items-center justify-between gap-1">
            {label ? (
              <span className="text-[10px] font-medium text-[var(--text-muted)] truncate">
                {label}
              </span>
            ) : null}
            <span className="text-[10px] font-mono text-[var(--text-main)] truncate">
              {displayText}
            </span>
          </span>
        )}
      </button>

      {isOpen &&
        typeof document !== 'undefined' &&
        createPortal(
          <div
            ref={popoverRef}
            style={{
              position: 'fixed',
              top: coords.top,
              left: coords.left,
              width: POPOVER_WIDTH,
              zIndex: 9999,
            }}
            className="rounded-xl border border-[var(--border-strong)] bg-[var(--bg-panel)] text-[var(--text-main)] shadow-2xl p-3 backdrop-blur-md"
          >
            <StudioColorPanel
              value={value}
              onChange={onChange}
              fallbackHex={fallbackHex}
              allowTransparent={allowTransparent}
              allowAlpha={allowAlpha}
              allowInherit={allowInherit}
              inheritLabel={inheritLabel}
              swatches={swatches}
              onAddSwatch={onAddSwatch}
              compact
            />
          </div>,
          document.body
        )}
    </>
  );
};

