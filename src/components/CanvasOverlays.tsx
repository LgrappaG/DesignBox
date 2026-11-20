import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  ArrowDownToLine,
  ArrowUpFromLine,
  Box,
  Check,
  ChevronDown,
  ChevronUp,
  Circle,
  Clipboard,
  Copy,
  CopyPlus,
  CornerUpLeft,
  EyeOff,
  FlipHorizontal,
  FlipVertical,
  Focus,
  FolderPlus,
  Image as ImageIcon,
  Layers,
  Lock,
  Magnet,
  Maximize2,
  Minus,
  Paintbrush,
  RotateCw,
  Search,
  ShieldAlert,
  Sparkles,
  Trash2,
  Type,
  Unlock,
} from 'lucide-react';
import {
  CustomWidgetBlueprint,
  DesignElement,
  ElementType,
  ImageShape,
} from '../types/schema';
import { isPureContainerType } from '../data/purePrimitives';
import { SearchableCatalogItem, searchStudioCatalog } from '../data/searchCatalog';
import { StudioColorButton } from './shared/StudioColorPicker';

export interface FloatingSelectionBarProps {
  el: DesignElement;
  selectedElements?: DesignElement[];
  resolvedOrigin?: { x: number; y: number; width: number; height: number };
  swatches: string[];
  onUpdateSelected: (patch: Partial<DesignElement>) => void;
  onAdjustZIndex?: (delta: number) => void;
  onRotateSelected90?: () => void;
  onDuplicateSelected?: () => void;
  onToggleLock?: (id: string) => void;
  onAlignMultiSelected?: (mode: 'left' | 'center-x' | 'right' | 'top' | 'center-y' | 'bottom') => void;
  onDistributeMultiSelected?: (axis: 'h' | 'v' | 'gap-h' | 'gap-v') => void;
  onGroupSelectedIntoBox?: () => void;
  onDeleteSelected: () => void;
}

/** Canva-style compact floating toolbar hovering directly above the selected element(s). */
export const FloatingSelectionBar: React.FC<FloatingSelectionBarProps> = ({
  el,
  selectedElements,
  resolvedOrigin,
  swatches,
  onUpdateSelected,
  onAdjustZIndex,
  onRotateSelected90,
  onDuplicateSelected,
  onToggleLock,
  onAlignMultiSelected,
  onDistributeMultiSelected,
  onGroupSelectedIntoBox,
  onDeleteSelected,
}) => {
  const multiList = selectedElements && selectedElements.length > 1 ? selectedElements : null;

  if (multiList) {
    const minX = Math.min(...multiList.map((item) => item.x));
    const minY = Math.min(...multiList.map((item) => item.y));
    const maxX = Math.max(...multiList.map((item) => item.x + item.width));
    const maxY = Math.max(...multiList.map((item) => item.y + item.height));
    const multiBarTop = minY >= 36 ? minY - 30 : maxY + 24;

    return (
      <div
        onClick={(e) => e.stopPropagation()}
        onPointerDown={(e) => e.stopPropagation()}
        style={{
          left: Math.max(8, (minX + maxX) / 2),
          top: multiBarTop,
          transform: 'translateX(-50%)',
          backgroundColor: 'color-mix(in srgb, var(--bg-panel) 88%, transparent)',
          borderColor: 'var(--border-strong)',
        }}
        className="absolute z-[92] h-[26px] border rounded-full px-1.5 py-0.5 backdrop-blur-md shadow-lg flex items-center gap-0.5 whitespace-nowrap"
      >
        <span
          style={{ backgroundColor: 'var(--accent-soft)', color: 'var(--accent)' }}
          className="text-[9.5px] font-mono font-bold px-1.5 py-[1px] rounded-full mr-0.5"
        >
          {multiList.length} selected
        </span>

        <StudioColorButton
          dotOnly
          value={el.bgColor}
          onChange={(bgColor) => onUpdateSelected({ bgColor })}
          fallbackHex="#ffffff"
          allowTransparent={true}
          swatches={swatches}
          title="Batch Fill Color"
        />
        <StudioColorButton
          dotOnly
          value={el.borderColor}
          onChange={(hex) =>
            onUpdateSelected({
              borderColor: hex,
              borderTopColor: hex,
              borderRightColor: hex,
              borderBottomColor: hex,
              borderLeftColor: hex,
            })
          }
          fallbackHex="#18181B"
          allowTransparent={true}
          swatches={swatches}
          title="Batch Border Color"
        />

        {onAlignMultiSelected && (
          <>
            <div style={{ backgroundColor: 'var(--border-main)' }} className="h-3 w-px mx-0.5" />
            {(
              [
                ['left', 'L', 'Align Left'],
                ['center-x', 'C', 'Align Center X'],
                ['right', 'R', 'Align Right'],
                ['top', 'T', 'Align Top'],
                ['center-y', 'M', 'Align Middle Y'],
                ['bottom', 'B', 'Align Bottom'],
              ] as const
            ).map(([mode, label, title]) => (
              <button
                key={mode}
                type="button"
                onClick={() => onAlignMultiSelected(mode)}
                className="px-1.5 h-5 rounded-full text-[9px] font-mono font-semibold hover:bg-black/10 dark:hover:bg-white/10"
                title={title}
              >
                {label}
              </button>
            ))}
          </>
        )}

        {onDistributeMultiSelected && multiList.length >= 3 && (
          <>
            <div style={{ backgroundColor: 'var(--border-main)' }} className="h-3 w-px mx-0.5" />
            <button
              type="button"
              onClick={() => onDistributeMultiSelected('gap-h')}
              className="px-1.5 h-5 rounded-full text-[9px] font-mono font-semibold hover:bg-black/10 dark:hover:bg-white/10"
              title="Distribute Equal Horizontal Gap"
            >
              Gap H
            </button>
            <button
              type="button"
              onClick={() => onDistributeMultiSelected('gap-v')}
              className="px-1.5 h-5 rounded-full text-[9px] font-mono font-semibold hover:bg-black/10 dark:hover:bg-white/10"
              title="Distribute Equal Vertical Gap"
            >
              Gap V
            </button>
          </>
        )}

        {onGroupSelectedIntoBox && (
          <>
            <div style={{ backgroundColor: 'var(--border-main)' }} className="h-3 w-px mx-0.5" />
            <button
              type="button"
              onClick={onGroupSelectedIntoBox}
              style={{ color: 'var(--accent)' }}
              className="inline-flex items-center gap-1 px-1.5 h-5 rounded-full text-[9.5px] font-semibold hover:bg-black/10 dark:hover:bg-white/10"
              title="Group Selected into Box (Ctrl+G)"
            >
              <FolderPlus className="w-3 h-3" />
              <span>Group</span>
            </button>
          </>
        )}

        <div style={{ backgroundColor: 'var(--border-main)' }} className="h-3 w-px mx-0.5" />

        {onDuplicateSelected && (
          <button
            type="button"
            onClick={onDuplicateSelected}
            className="w-5 h-5 flex items-center justify-center rounded-full hover:bg-black/10 dark:hover:bg-white/10"
            title="Duplicate Selected (Ctrl+D)"
          >
            <CopyPlus className="w-3 h-3" />
          </button>
        )}

        <button
          type="button"
          onClick={onDeleteSelected}
          className="w-5 h-5 flex items-center justify-center rounded-full text-rose-500 hover:bg-rose-500/15"
          title="Delete Selected (Del)"
        >
          <Trash2 className="w-3 h-3" />
        </button>
      </div>
    );
  }

  const boxOrigin = resolvedOrigin ?? {
    x: el.x,
    y: el.y,
    width: el.width,
    height: el.height,
  };
  const isTextLike = el.type === 'text' || el.type === 'pure_heading' || el.type === 'pure_paragraph';
  const secondaryColor = isTextLike ? el.textColor : el.borderColor;
  const barTop = boxOrigin.y >= 36 ? boxOrigin.y - 30 : boxOrigin.y + boxOrigin.height + 24;

  if (el.locked) {
    return (
      <div
        onClick={(e) => e.stopPropagation()}
        onPointerDown={(e) => e.stopPropagation()}
        style={{
          left: Math.max(8, boxOrigin.x + boxOrigin.width / 2),
          top: barTop,
          transform: 'translateX(-50%)',
          backgroundColor: 'color-mix(in srgb, var(--bg-panel) 92%, transparent)',
          borderColor: '#D97706',
        }}
        className="absolute z-[92] h-[26px] border rounded-full px-2 py-0.5 backdrop-blur-md shadow-lg flex items-center gap-1 whitespace-nowrap"
      >
        <span className="text-[9.5px] font-mono font-bold text-amber-500 flex items-center gap-1">
          <Lock className="w-3 h-3" />
          Locked
        </span>
        {onDuplicateSelected && (
          <button
            type="button"
            onClick={onDuplicateSelected}
            className="w-5 h-5 flex items-center justify-center rounded-full hover:bg-black/10 dark:hover:bg-white/10"
            title="Duplicate Unlocked Copy (Ctrl+D)"
          >
            <CopyPlus className="w-3 h-3" />
          </button>
        )}
        {onToggleLock && (
          <button
            type="button"
            onClick={() => onToggleLock(el.id)}
            className="px-1.5 py-0.5 rounded-full bg-amber-500/15 text-amber-500 hover:bg-amber-500/25 text-[9.5px] font-mono font-bold flex items-center gap-1"
            title="Unlock Layer"
          >
            <Unlock className="w-3 h-3" />
            <span>Unlock</span>
          </button>
        )}
      </div>
    );
  }

  return (
    <div
      onClick={(e) => e.stopPropagation()}
      onPointerDown={(e) => e.stopPropagation()}
      style={{
        left: Math.max(8, boxOrigin.x + boxOrigin.width / 2),
        top: barTop,
        transform: 'translateX(-50%)',
        backgroundColor: 'color-mix(in srgb, var(--bg-panel) 88%, transparent)',
        borderColor: 'var(--border-strong)',
      }}
      className="absolute z-[92] h-[26px] border rounded-full px-1.5 py-0.5 backdrop-blur-md shadow-lg flex items-center gap-0.5 whitespace-nowrap"
    >
      <StudioColorButton
        dotOnly
        value={el.bgColor}
        onChange={(bgColor) => onUpdateSelected({ bgColor })}
        fallbackHex="#ffffff"
        allowTransparent={true}
        swatches={swatches}
        title="Quick Fill Color"
      />
      <StudioColorButton
        dotOnly
        value={secondaryColor}
        onChange={(hex) =>
          isTextLike
            ? onUpdateSelected({ textColor: hex })
            : onUpdateSelected({
                borderColor: hex,
                borderTopColor: hex,
                borderRightColor: hex,
                borderBottomColor: hex,
                borderLeftColor: hex,
              })
        }
        fallbackHex="#18181B"
        allowTransparent={!isTextLike}
        swatches={swatches}
        title={isTextLike ? 'Quick Text Color' : 'Quick Border Color'}
      />

      <div style={{ backgroundColor: 'var(--border-main)' }} className="h-3 w-px mx-0.5" />

      {onAdjustZIndex && (
        <>
          <button
            type="button"
            onClick={() => onAdjustZIndex(-1)}
            className="w-5 h-5 flex items-center justify-center rounded-full hover:bg-black/10 dark:hover:bg-white/10"
            title="Send Backward (-Z)"
          >
            <ChevronDown className="w-3 h-3" />
          </button>
          <button
            type="button"
            onClick={() => onAdjustZIndex(1)}
            className="w-5 h-5 flex items-center justify-center rounded-full hover:bg-black/10 dark:hover:bg-white/10"
            title="Bring Forward (+Z)"
          >
            <ChevronUp className="w-3 h-3" />
          </button>
        </>
      )}

      {onRotateSelected90 && (
        <button
          type="button"
          onClick={onRotateSelected90}
          className="w-5 h-5 flex items-center justify-center rounded-full hover:bg-black/10 dark:hover:bg-white/10"
          title="Rotate 90°"
        >
          <RotateCw className="w-3 h-3" />
        </button>
      )}

      {onDuplicateSelected && (
        <button
          type="button"
          onClick={onDuplicateSelected}
          className="w-5 h-5 flex items-center justify-center rounded-full hover:bg-black/10 dark:hover:bg-white/10"
          title="Duplicate (Ctrl+D)"
        >
          <CopyPlus className="w-3 h-3" />
        </button>
      )}

      {onToggleLock && (
        <button
          type="button"
          onClick={() => onToggleLock(el.id)}
          className="w-5 h-5 flex items-center justify-center rounded-full hover:bg-black/10 dark:hover:bg-white/10"
          title={el.locked ? 'Unlock' : 'Lock'}
        >
          {el.locked ? <Lock className="w-3 h-3 text-amber-500" /> : <Unlock className="w-3 h-3" />}
        </button>
      )}

      <button
        type="button"
        onClick={onDeleteSelected}
        className="w-5 h-5 flex items-center justify-center rounded-full text-rose-500 hover:bg-rose-500/15"
        title="Delete (Del)"
      >
        <Trash2 className="w-3 h-3" />
      </button>
    </div>
  );
};

export interface CanvasContextMenuState {
  clientX: number;
  clientY: number;
  canvasX: number;
  canvasY: number;
  element: DesignElement | null;
}

const SWAP_SHAPES: ReadonlyArray<{ id: ImageShape; label: string }> = [
  { id: 'rect', label: 'Rect' },
  { id: 'circle', label: 'Circle' },
  { id: 'pill', label: 'Pill' },
  { id: 'hexagon', label: 'Hex' },
  { id: 'diamond', label: 'Diamond' },
  { id: 'octagon', label: 'Octagon' },
  { id: 'ticket', label: 'Ticket' },
  { id: 'cross_star', label: 'Sparkle' },
];

export interface CanvasContextMenuProps {
  menu: CanvasContextMenuState;
  swatches: string[];
  selectedIds: string[];
  canvasBg: string;
  magneticSnap: boolean;
  guidesCount: number;
  hasCopiedStyle: boolean;
  hasClipboardElement: boolean;
  onClose: () => void;
  onUpdateElement: (id: string, patch: Partial<DesignElement>) => void;
  onAdjustZIndex?: (delta: number) => void;
  onBringToFront?: () => void;
  onSendToBack?: () => void;
  onRotateSelected90?: () => void;
  onFlipSelected?: (axis: 'h' | 'v') => void;
  onDuplicateSelected?: () => void;
  onCopySelected?: () => void;
  onPasteAtPosition?: (x?: number, y?: number) => void;
  onCopyStyle?: () => void;
  onPasteStyle?: () => void;
  onEnterContainerIsolation: (id: string) => void;
  onPopOutFromContainer?: (childId: string) => void;
  onGroupSelectedIntoBox: () => void;
  onSaveSelectedAsBlueprint?: () => void;
  onToggleLock?: (id: string) => void;
  onToggleHide?: (id: string) => void;
  onDeleteSelected: () => void;
  onOpenSpotlightAt: (x: number, y: number) => void;
  onQuickAddAtPosition: (type: ElementType, x: number, y: number) => void;
  onToggleTransparentCanvas: () => void;
  onToggleMagneticSnap: () => void;
  onFitCanvasToView: () => void;
  onResetZoom: () => void;
  onClearAllGuides: () => void;
  onSelectAll?: () => void;
  onUnlockAll?: () => void;
  onCopyCode: () => void;
}

/** Krita-inspired rich right-click context menu for canvas objects and empty canvas. */
export const CanvasContextMenu: React.FC<CanvasContextMenuProps> = ({
  menu,
  swatches,
  selectedIds,
  canvasBg,
  magneticSnap,
  guidesCount,
  hasCopiedStyle,
  hasClipboardElement,
  onClose,
  onUpdateElement,
  onAdjustZIndex,
  onBringToFront,
  onSendToBack,
  onRotateSelected90,
  onFlipSelected,
  onDuplicateSelected,
  onCopySelected,
  onPasteAtPosition,
  onCopyStyle,
  onPasteStyle,
  onEnterContainerIsolation,
  onPopOutFromContainer,
  onGroupSelectedIntoBox,
  onSaveSelectedAsBlueprint,
  onToggleLock,
  onToggleHide,
  onDeleteSelected,
  onOpenSpotlightAt,
  onQuickAddAtPosition,
  onToggleTransparentCanvas,
  onToggleMagneticSnap,
  onFitCanvasToView,
  onResetZoom,
  onClearAllGuides,
  onSelectAll,
  onUnlockAll,
  onCopyCode,
}) => {
  const menuRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const onDown = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        onClose();
      }
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        e.stopPropagation();
        e.stopImmediatePropagation();
        onClose();
      }
    };
    window.addEventListener('mousedown', onDown);
    window.addEventListener('keydown', onKey, true);
    return () => {
      window.removeEventListener('mousedown', onDown);
      window.removeEventListener('keydown', onKey, true);
    };
  }, [onClose]);

  const menuW = 264;
  const approxH = menu.element ? 440 : 390;
  const left =
    typeof window !== 'undefined'
      ? Math.max(8, Math.min(window.innerWidth - menuW - 8, menu.clientX))
      : menu.clientX;
  const top =
    typeof window !== 'undefined'
      ? Math.max(8, Math.min(window.innerHeight - approxH - 8, menu.clientY))
      : menu.clientY;

  const el = menu.element;

  const applySwapShape = (shape: ImageShape) => {
    if (!el) return;
    const isImage = el.type === 'image' || el.type === 'pure_image_slot';
    if (isImage) {
      onUpdateElement(el.id, { imageShape: shape });
    } else {
      onUpdateElement(el.id, {
        boxClipShape: shape,
        borderRadius:
          shape === 'circle' || shape === 'pill' ? 999 : shape === 'rect' ? 6 : el.borderRadius,
      });
    }
    onClose();
  };

  return (
    <div
      ref={menuRef}
      onContextMenu={(e) => e.preventDefault()}
      style={{
        left,
        top,
        width: menuW,
        backgroundColor: 'var(--bg-panel)',
        borderColor: 'var(--border-strong)',
        color: 'var(--text-main)',
      }}
      className="fixed z-[9999] border rounded-[10px] shadow-2xl p-2 text-[11px] space-y-1.5 select-none"
    >
      {el ? (
        <>
          <div className="flex items-center justify-between px-1.5 pb-1 border-b border-[var(--border-main)]">
            <span className="font-semibold truncate max-w-[175px]">{el.label}</span>
            <span style={{ color: 'var(--text-muted)' }} className="text-[9.5px] font-mono">
              {el.width}×{el.height}
            </span>
          </div>

          {/* Krita-style Quick Swatch Strip */}
          <div className="px-1 py-1 space-y-1">
            <div className="flex items-center justify-between text-[9px] font-mono" style={{ color: 'var(--text-muted)' }}>
              <span>QUICK SWATCHES</span>
              <span>Shift+Click: Border</span>
            </div>
            <div className="flex flex-wrap gap-1">
              <button
                type="button"
                onClick={(e) => {
                  onUpdateElement(
                    el.id,
                    e.shiftKey ? { borderColor: 'transparent' } : { bgColor: 'transparent' }
                  );
                  onClose();
                }}
                style={{ borderColor: 'var(--border-strong)' }}
                className="w-5 h-5 rounded border text-[9px] font-mono flex items-center justify-center hover:scale-110 transition"
                title="Transparent Fill (Shift+Click for Border)"
              >
                ×
              </button>
              {swatches.slice(0, 9).map((hex) => (
                <button
                  key={hex}
                  type="button"
                  onClick={(e) => {
                    onUpdateElement(
                      el.id,
                      e.shiftKey
                        ? {
                            borderColor: hex,
                            borderTopColor: hex,
                            borderRightColor: hex,
                            borderBottomColor: hex,
                            borderLeftColor: hex,
                          }
                        : { bgColor: hex }
                    );
                    onClose();
                  }}
                  style={{ backgroundColor: hex, borderColor: 'var(--border-strong)' }}
                  className="w-5 h-5 rounded border hover:scale-110 transition"
                  title={`Apply ${hex} (Shift+Click for Border)`}
                />
              ))}
            </div>
          </div>

          {/* Compact Action Strip (Z-Order, Rotate, Flip, Duplicate) */}
          <div
            style={{ backgroundColor: 'var(--bg-panel-alt)', borderColor: 'var(--border-main)' }}
            className="grid grid-cols-8 gap-0.5 p-1 rounded-[6px] border"
          >
            <button
              type="button"
              onClick={() => {
                onBringToFront?.();
                onClose();
              }}
              className="p-1 rounded hover:bg-black/10 flex items-center justify-center"
              title="Bring to Front"
            >
              <ArrowUpFromLine className="w-3 h-3" />
            </button>
            <button
              type="button"
              onClick={() => {
                onAdjustZIndex?.(1);
                onClose();
              }}
              className="p-1 rounded hover:bg-black/10 text-[9.5px] font-mono font-bold"
              title="Bring Forward (+Z)"
            >
              +Z
            </button>
            <button
              type="button"
              onClick={() => {
                onAdjustZIndex?.(-1);
                onClose();
              }}
              className="p-1 rounded hover:bg-black/10 text-[9.5px] font-mono font-bold"
              title="Send Backward (-Z)"
            >
              -Z
            </button>
            <button
              type="button"
              onClick={() => {
                onSendToBack?.();
                onClose();
              }}
              className="p-1 rounded hover:bg-black/10 flex items-center justify-center"
              title="Send to Back"
            >
              <ArrowDownToLine className="w-3 h-3" />
            </button>
            <button
              type="button"
              onClick={() => {
                onRotateSelected90?.();
                onClose();
              }}
              className="p-1 rounded hover:bg-black/10 flex items-center justify-center"
              title="Rotate 90°"
            >
              <RotateCw className="w-3 h-3" />
            </button>
            <button
              type="button"
              onClick={() => {
                onFlipSelected?.('h');
                onClose();
              }}
              className="p-1 rounded hover:bg-black/10 flex items-center justify-center"
              title="Flip Horizontal"
            >
              <FlipHorizontal className="w-3 h-3" />
            </button>
            <button
              type="button"
              onClick={() => {
                onFlipSelected?.('v');
                onClose();
              }}
              className="p-1 rounded hover:bg-black/10 flex items-center justify-center"
              title="Flip Vertical"
            >
              <FlipVertical className="w-3 h-3" />
            </button>
            <button
              type="button"
              onClick={() => {
                onDuplicateSelected?.();
                onClose();
              }}
              className="p-1 rounded hover:bg-black/10 flex items-center justify-center"
              title="Duplicate"
            >
              <CopyPlus className="w-3 h-3" />
            </button>
          </div>

          <div className="space-y-0.5">
            <button
              type="button"
              onClick={() => {
                onCopySelected?.();
                onClose();
              }}
              className="w-full px-2 py-1.5 rounded-[5px] hover:bg-black/5 dark:hover:bg-white/5 flex items-center justify-between"
            >
              <span className="flex items-center gap-2">
                <Copy className="w-3.5 h-3.5 opacity-70" />
                <span>Copy</span>
              </span>
              <span style={{ color: 'var(--text-muted)' }} className="text-[9.5px] font-mono">
                Ctrl+C
              </span>
            </button>

            {hasClipboardElement && onPasteAtPosition && (
              <button
                type="button"
                onClick={() => {
                  onPasteAtPosition(menu.canvasX, menu.canvasY);
                  onClose();
                }}
                className="w-full px-2 py-1.5 rounded-[5px] hover:bg-black/5 dark:hover:bg-white/5 flex items-center gap-2"
              >
                <Clipboard className="w-3.5 h-3.5 opacity-70" />
                <span>Paste Here</span>
              </button>
            )}

            <button
              type="button"
              onClick={() => {
                onCopyStyle?.();
                onClose();
              }}
              className="w-full px-2 py-1.5 rounded-[5px] hover:bg-black/5 dark:hover:bg-white/5 flex items-center justify-between"
            >
              <span className="flex items-center gap-2">
                <Paintbrush className="w-3.5 h-3.5 opacity-70" />
                <span>Copy Style</span>
              </span>
              <span style={{ color: 'var(--text-muted)' }} className="text-[9.5px] font-mono">
                Ctrl+Alt+C
              </span>
            </button>

            <button
              type="button"
              disabled={!hasCopiedStyle}
              onClick={() => {
                onPasteStyle?.();
                onClose();
              }}
              className="w-full px-2 py-1.5 rounded-[5px] hover:bg-black/5 dark:hover:bg-white/5 flex items-center justify-between disabled:opacity-40 disabled:cursor-not-allowed"
            >
              <span className="flex items-center gap-2">
                <Sparkles className="w-3.5 h-3.5 opacity-70" />
                <span>Paste Style</span>
              </span>
              <span style={{ color: 'var(--text-muted)' }} className="text-[9.5px] font-mono">
                Ctrl+Alt+V
              </span>
            </button>
          </div>

          {/* Swap Shape Grid */}
          <div className="pt-1 border-t border-[var(--border-main)] px-1 space-y-1">
            <span style={{ color: 'var(--text-muted)' }} className="block text-[9px] font-mono">
              SWAP SHAPE
            </span>
            <div className="grid grid-cols-4 gap-1">
              {SWAP_SHAPES.map((shape) => (
                <button
                  key={shape.id}
                  type="button"
                  onClick={() => applySwapShape(shape.id)}
                  style={{
                    backgroundColor: 'var(--bg-input)',
                    borderColor: 'var(--border-strong)',
                  }}
                  className="border rounded py-0.5 px-1 text-[9.5px] hover:border-[var(--accent)] truncate"
                >
                  {shape.label}
                </button>
              ))}
            </div>
          </div>

          <div className="pt-1 border-t border-[var(--border-main)] space-y-0.5">
            {isPureContainerType(el.type) && (
              <button
                type="button"
                onClick={() => {
                  onEnterContainerIsolation(el.id);
                  onClose();
                }}
                className="w-full px-2 py-1.5 rounded-[5px] hover:bg-black/5 dark:hover:bg-white/5 flex items-center gap-2 text-[var(--accent)] font-semibold"
              >
                <Focus className="w-3.5 h-3.5" />
                <span>Edit Inside Container</span>
              </button>
            )}
            {el.parentId && onPopOutFromContainer && (
              <button
                type="button"
                onClick={() => {
                  onPopOutFromContainer(el.id);
                  onClose();
                }}
                className="w-full px-2 py-1.5 rounded-[5px] hover:bg-black/5 dark:hover:bg-white/5 flex items-center gap-2"
              >
                <CornerUpLeft className="w-3.5 h-3.5 opacity-70" />
                <span>Pop Out of Container</span>
              </button>
            )}
            {selectedIds.length > 1 && (
              <button
                type="button"
                onClick={() => {
                  onGroupSelectedIntoBox();
                  onClose();
                }}
                className="w-full px-2 py-1.5 rounded-[5px] hover:bg-black/5 dark:hover:bg-white/5 flex items-center gap-2"
              >
                <FolderPlus className="w-3.5 h-3.5 opacity-70" />
                <span>Group Selected into Box</span>
              </button>
            )}
            {onSaveSelectedAsBlueprint && (
              <button
                type="button"
                onClick={() => {
                  onSaveSelectedAsBlueprint();
                  onClose();
                }}
                className="w-full px-2 py-1.5 rounded-[5px] hover:bg-black/5 dark:hover:bg-white/5 flex items-center gap-2"
              >
                <Layers className="w-3.5 h-3.5 opacity-70" />
                <span>Save as Reusable Blueprint</span>
              </button>
            )}
            <div className="grid grid-cols-3 gap-1 pt-1">
              <button
                type="button"
                onClick={() => {
                  onToggleLock?.(el.id);
                  onClose();
                }}
                style={{ backgroundColor: 'var(--bg-input)', borderColor: 'var(--border-strong)' }}
                className="border rounded py-1 px-1.5 flex items-center justify-center gap-1 text-[10px]"
              >
                {el.locked ? <Unlock className="w-3 h-3" /> : <Lock className="w-3 h-3" />}
                <span>{el.locked ? 'Unlock' : 'Lock'}</span>
              </button>
              <button
                type="button"
                onClick={() => {
                  onToggleHide?.(el.id);
                  onClose();
                }}
                style={{ backgroundColor: 'var(--bg-input)', borderColor: 'var(--border-strong)' }}
                className="border rounded py-1 px-1.5 flex items-center justify-center gap-1 text-[10px]"
              >
                <EyeOff className="w-3 h-3" />
                <span>{el.hidden ? 'Show' : 'Hide'}</span>
              </button>
              <button
                type="button"
                onClick={() => {
                  onDeleteSelected();
                  onClose();
                }}
                className="border border-rose-500/40 bg-rose-500/10 text-rose-500 rounded py-1 px-1.5 flex items-center justify-center gap-1 text-[10px] hover:bg-rose-500/20"
              >
                <Trash2 className="w-3 h-3" />
                <span>Delete</span>
              </button>
            </div>
          </div>
        </>
      ) : (
        <>
          <div className="flex items-center justify-between px-1.5 pb-1 border-b border-[var(--border-main)]">
            <span className="font-semibold">Canvas Actions</span>
            <span style={{ color: 'var(--text-muted)' }} className="text-[9.5px] font-mono">
              {Math.round(menu.canvasX)}, {Math.round(menu.canvasY)}
            </span>
          </div>

          <button
            type="button"
            onClick={() => {
              onClose();
              onOpenSpotlightAt(menu.canvasX, menu.canvasY);
            }}
            style={{ backgroundColor: 'var(--accent)', color: '#fff' }}
            className="w-full px-2.5 py-1.5 rounded-[6px] font-semibold flex items-center justify-between hover:opacity-90"
          >
            <span className="flex items-center gap-1.5">
              <Search className="w-3.5 h-3.5" />
              <span>Quick Add / Search Here...</span>
            </span>
            <span className="text-[9.5px] font-mono opacity-85">/</span>
          </button>

          <div className="px-0.5 py-1 space-y-1 border-b border-[var(--border-main)]">
            <span style={{ color: 'var(--text-muted)' }} className="block text-[9px] font-mono px-1">
              ADD PRIMITIVE AT CURSOR
            </span>
            <div className="grid grid-cols-5 gap-1">
              <button
                type="button"
                onClick={() => {
                  onQuickAddAtPosition('pure_box', menu.canvasX, menu.canvasY);
                  onClose();
                }}
                style={{ backgroundColor: 'var(--bg-input)', borderColor: 'var(--border-strong)' }}
                className="border rounded py-1 flex flex-col items-center gap-0.5 text-[9px] hover:border-[var(--accent)]"
              >
                <Box className="w-3 h-3" />
                <span>Box</span>
              </button>
              <button
                type="button"
                onClick={() => {
                  onQuickAddAtPosition('pure_paragraph', menu.canvasX, menu.canvasY);
                  onClose();
                }}
                style={{ backgroundColor: 'var(--bg-input)', borderColor: 'var(--border-strong)' }}
                className="border rounded py-1 flex flex-col items-center gap-0.5 text-[9px] hover:border-[var(--accent)]"
              >
                <Type className="w-3 h-3" />
                <span>Text</span>
              </button>
              <button
                type="button"
                onClick={() => {
                  onQuickAddAtPosition('image', menu.canvasX, menu.canvasY);
                  onClose();
                }}
                style={{ backgroundColor: 'var(--bg-input)', borderColor: 'var(--border-strong)' }}
                className="border rounded py-1 flex flex-col items-center gap-0.5 text-[9px] hover:border-[var(--accent)]"
              >
                <ImageIcon className="w-3 h-3" />
                <span>Image</span>
              </button>
              <button
                type="button"
                onClick={() => {
                  onQuickAddAtPosition('pure_circle', menu.canvasX, menu.canvasY);
                  onClose();
                }}
                style={{ backgroundColor: 'var(--bg-input)', borderColor: 'var(--border-strong)' }}
                className="border rounded py-1 flex flex-col items-center gap-0.5 text-[9px] hover:border-[var(--accent)]"
              >
                <Circle className="w-3 h-3" />
                <span>Circle</span>
              </button>
              <button
                type="button"
                onClick={() => {
                  onQuickAddAtPosition('pure_line', menu.canvasX, menu.canvasY);
                  onClose();
                }}
                style={{ backgroundColor: 'var(--bg-input)', borderColor: 'var(--border-strong)' }}
                className="border rounded py-1 flex flex-col items-center gap-0.5 text-[9px] hover:border-[var(--accent)]"
              >
                <Minus className="w-3 h-3" />
                <span>Line</span>
              </button>
            </div>
          </div>

          <div className="space-y-0.5">
            {hasClipboardElement && onPasteAtPosition && (
              <button
                type="button"
                onClick={() => {
                  onPasteAtPosition(menu.canvasX, menu.canvasY);
                  onClose();
                }}
                className="w-full px-2 py-1.5 rounded-[5px] hover:bg-black/5 dark:hover:bg-white/5 flex items-center gap-2"
              >
                <Clipboard className="w-3.5 h-3.5 opacity-70" />
                <span>Paste Here</span>
              </button>
            )}

            <button
              type="button"
              onClick={() => {
                onToggleTransparentCanvas();
                onClose();
              }}
              className="w-full px-2 py-1.5 rounded-[5px] hover:bg-black/5 dark:hover:bg-white/5 flex items-center justify-between"
            >
              <span className="flex items-center gap-2">
                <EyeOff className="w-3.5 h-3.5 opacity-70" />
                <span>Transparent Canvas</span>
              </span>
              {canvasBg === 'transparent' && <Check className="w-3.5 h-3.5 text-emerald-500" />}
            </button>

            <button
              type="button"
              onClick={() => {
                onToggleMagneticSnap();
                onClose();
              }}
              className="w-full px-2 py-1.5 rounded-[5px] hover:bg-black/5 dark:hover:bg-white/5 flex items-center justify-between"
            >
              <span className="flex items-center gap-2">
                <Magnet className="w-3.5 h-3.5 opacity-70" />
                <span>Magnetic Snap</span>
              </span>
              {magneticSnap && <Check className="w-3.5 h-3.5 text-emerald-500" />}
            </button>

            <div className="grid grid-cols-2 gap-1 pt-0.5">
              <button
                type="button"
                onClick={() => {
                  onFitCanvasToView();
                  onClose();
                }}
                style={{ backgroundColor: 'var(--bg-input)', borderColor: 'var(--border-strong)' }}
                className="border rounded py-1 px-2 text-[10px] flex items-center justify-center gap-1"
              >
                <Maximize2 className="w-3 h-3" />
                <span>Fit View</span>
              </button>
              <button
                type="button"
                onClick={() => {
                  onResetZoom();
                  onClose();
                }}
                style={{ backgroundColor: 'var(--bg-input)', borderColor: 'var(--border-strong)' }}
                className="border rounded py-1 px-2 text-[10px] font-mono flex items-center justify-center"
              >
                100% Zoom
              </button>
            </div>

            {guidesCount > 0 && (
              <button
                type="button"
                onClick={() => {
                  onClearAllGuides();
                  onClose();
                }}
                className="w-full px-2 py-1.5 rounded-[5px] hover:bg-black/5 text-sky-500 flex items-center gap-2"
              >
                <span>Clear All Ruler Guides ({guidesCount})</span>
              </button>
            )}

            <div className="grid grid-cols-2 gap-1 pt-1 border-t border-[var(--border-main)]">
              <button
                type="button"
                onClick={() => {
                  onSelectAll?.();
                  onClose();
                }}
                className="px-2 py-1 rounded-[5px] hover:bg-black/5 dark:hover:bg-white/5 text-left"
              >
                Select All
              </button>
              <button
                type="button"
                onClick={() => {
                  onUnlockAll?.();
                  onClose();
                }}
                className="px-2 py-1 rounded-[5px] hover:bg-black/5 dark:hover:bg-white/5 text-left"
              >
                Unlock All
              </button>
            </div>

            <button
              type="button"
              onClick={() => {
                onCopyCode();
                onClose();
              }}
              className="w-full px-2 py-1.5 rounded-[5px] hover:bg-black/5 dark:hover:bg-white/5 flex items-center gap-2 font-semibold text-[var(--accent)]"
            >
              <Copy className="w-3.5 h-3.5" />
              <span>Copy Export HTML</span>
            </button>
          </div>
        </>
      )}
    </div>
  );
};

export interface SpotlightQuickAddModalProps {
  open: boolean;
  isToyhouseFree: boolean;
  customBlueprints: CustomWidgetBlueprint[];
  onSelect: (item: SearchableCatalogItem) => void;
  onClose: () => void;
}

/** Keyboard-driven Spotlight modal for instant object / block / FA icon search & insertion. */
export const SpotlightQuickAddModal: React.FC<SpotlightQuickAddModalProps> = ({
  open,
  isToyhouseFree,
  customBlueprints,
  onSelect,
  onClose,
}) => {
  const [query, setQuery] = useState('');
  const [activeIndex, setActiveIndex] = useState(0);

  const results = useMemo(
    () => searchStudioCatalog(query, isToyhouseFree, customBlueprints, 24),
    [query, isToyhouseFree, customBlueprints]
  );

  useEffect(() => {
    if (open) {
      setQuery('');
      setActiveIndex(0);
    }
  }, [open]);

  useEffect(() => {
    setActiveIndex(0);
  }, [results.length, query]);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        e.stopPropagation();
        e.stopImmediatePropagation();
        onClose();
      }
    };
    window.addEventListener('keydown', onKey, true);
    return () => window.removeEventListener('keydown', onKey, true);
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div
      onClick={onClose}
      className="fixed inset-0 z-[9995] bg-black/45 backdrop-blur-xs flex items-start justify-center pt-20 px-4"
    >
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          backgroundColor: 'var(--bg-panel)',
          borderColor: 'var(--border-strong)',
          color: 'var(--text-main)',
        }}
        className="w-full max-w-lg border rounded-xl shadow-2xl overflow-hidden"
      >
        <div
          style={{ borderColor: 'var(--border-main)' }}
          className="flex items-center gap-2.5 px-3.5 py-2.5 border-b"
        >
          <Search className="w-4 h-4 text-[var(--accent)] shrink-0" />
          <input
            autoFocus
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Escape') {
                e.preventDefault();
                onClose();
              } else if (e.key === 'ArrowDown') {
                e.preventDefault();
                setActiveIndex((prev) => (results.length === 0 ? 0 : (prev + 1) % results.length));
              } else if (e.key === 'ArrowUp') {
                e.preventDefault();
                setActiveIndex((prev) =>
                  results.length === 0 ? 0 : (prev - 1 + results.length) % results.length
                );
              } else if (e.key === 'Enter' && results[activeIndex]) {
                e.preventDefault();
                onSelect(results[activeIndex]);
                onClose();
              }
            }}
            placeholder="Quick search anything (e.g. box, dni, spotify, spoiler, circle, relationship)..."
            className="flex-1 bg-transparent outline-none text-xs placeholder:opacity-60"
          />
          <kbd
            style={{ backgroundColor: 'var(--bg-input)', borderColor: 'var(--border-strong)' }}
            className="px-1.5 py-0.5 rounded border text-[9.5px] font-mono opacity-70"
          >
            ESC
          </kbd>
        </div>

        <div className="max-h-80 overflow-y-auto p-1.5 space-y-0.5">
          {results.length === 0 ? (
            <div style={{ color: 'var(--text-muted)' }} className="p-6 text-center text-xs">
              No matching primitives, blocks, assets, or FontAwesome icons found.
            </div>
          ) : (
            results.map((item, idx) => {
              const selected = idx === activeIndex;
              return (
                <button
                  key={item.id}
                  type="button"
                  onMouseEnter={() => setActiveIndex(idx)}
                  onClick={() => {
                    onSelect(item);
                    onClose();
                  }}
                  style={
                    selected
                      ? { backgroundColor: 'var(--accent-soft)', borderColor: 'var(--accent)' }
                      : { borderColor: 'transparent' }
                  }
                  className="w-full px-3 py-2 rounded-[7px] border text-left flex items-center justify-between gap-2 transition"
                >
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <span className="font-semibold text-xs truncate">{item.label}</span>
                      <span
                        style={{ color: 'var(--text-muted)', backgroundColor: 'var(--bg-input)' }}
                        className="text-[9px] font-mono px-1.5 py-[1px] rounded"
                      >
                        {item.categoryLabel}
                      </span>
                    </div>
                    {item.description && (
                      <div
                        style={{ color: 'var(--text-muted)' }}
                        className="text-[10.5px] truncate mt-0.5"
                      >
                        {item.description}
                      </div>
                    )}
                  </div>
                  {!item.f2uSafe && (
                    <span className="text-[9px] font-mono px-1.5 py-0.5 rounded bg-amber-500/15 text-amber-500 border border-amber-500/30 flex items-center gap-0.5 shrink-0">
                      <ShieldAlert className="w-2.5 h-2.5" />
                      Pro
                    </span>
                  )}
                </button>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
};
