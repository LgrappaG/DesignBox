import React, { useMemo } from 'react';
import { EyeOff, Link2, Lock, RotateCw, ShieldAlert } from 'lucide-react';
import { isPureContainerType } from '../data/purePrimitives';
import { getElementF2UShieldReport, isSafeUrlValue, maskElementForF2USimulation } from '../engine/f2uShield';
import {
  getElementEffectiveLinkUrl,
  getFontFamilyCSS,
  renderInnerElementHTML,
} from '../engine/layoutSolver';
import { ResizeDir, SplitDragState } from '../hooks/useCanvasPointer';
import { DesignElement, LayoutMode, SplitModifier, TargetPlatform } from '../types/schema';

const RESIZE_HANDLES: ReadonlyArray<{ dir: ResizeDir; cls: string }> = [
  { dir: 'nw', cls: '-top-1.5 -left-1.5 cursor-nwse-resize' },
  { dir: 'n', cls: '-top-1.5 left-1/2 -translate-x-1/2 cursor-ns-resize' },
  { dir: 'ne', cls: '-top-1.5 -right-1.5 cursor-nesw-resize' },
  { dir: 'e', cls: 'top-1/2 -translate-y-1/2 -right-1.5 cursor-ew-resize' },
  { dir: 'se', cls: '-bottom-1.5 -right-1.5 cursor-nwse-resize' },
  { dir: 's', cls: '-bottom-1.5 left-1/2 -translate-x-1/2 cursor-ns-resize' },
  { dir: 'sw', cls: '-bottom-1.5 -left-1.5 cursor-nesw-resize' },
  { dir: 'w', cls: 'top-1/2 -translate-y-1/2 -left-1.5 cursor-ew-resize' },
];

function openCanvasElementLink(rawUrl: string): void {
  const trimmed = rawUrl.trim();
  if (!trimmed || trimmed === '#' || !isSafeUrlValue(trimmed)) return;
  const href = /^(https?:\/\/|mailto:|\/|#)/i.test(trimmed)
    ? trimmed
    : `https://${trimmed}`;
  window.open(href, '_blank', 'noopener,noreferrer');
}

export interface CanvasElementItemProps {
  el: DesignElement;
  descendants: ReadonlyArray<DesignElement>;
  layoutMode: LayoutMode;
  platform: TargetPlatform;
  isToyhouseFreePlatform: boolean;
  isSelected: boolean;
  isPrimary: boolean;
  showHandles: boolean;
  isInlineEditing: boolean;
  isFloating: boolean;
  isDropTarget: boolean;
  isEditingThisContainer: boolean;
  isDimmedByIsolation: boolean;
  isSelectTool: boolean;
  solvedCol: number;
  activeTabIdx: number;
  onPointerDownElement: (
    e: React.PointerEvent,
    el: DesignElement,
    mode: 'move' | 'resize' | 'rotate',
    resizeDir?: ResizeDir,
    isChildDrag?: boolean
  ) => void;
  onSelectElement: (id: string | null, ids?: string[]) => void;
  onEnterContainerIsolation: (containerId: string) => void;
  onSetInlineEditId: (id: string | null) => void;
  onUpdateSelected: (patch: Partial<DesignElement>) => void;
  onSetActiveCanvasTabs: React.Dispatch<React.SetStateAction<Record<string, number>>>;
  onSetSplitDragState: React.Dispatch<React.SetStateAction<SplitDragState | null>>;
  onContextMenuElement: (e: React.MouseEvent, el: DesignElement) => void;
}

const CanvasElementItemInner: React.FC<CanvasElementItemProps> = ({
  el,
  descendants,
  layoutMode,
  platform,
  isToyhouseFreePlatform,
  isSelected,
  showHandles,
  isInlineEditing,
  isFloating,
  isDropTarget,
  isEditingThisContainer,
  isDimmedByIsolation,
  isSelectTool,
  solvedCol,
  activeTabIdx,
  onPointerDownElement,
  onSelectElement,
  onEnterContainerIsolation,
  onSetInlineEditId,
  onUpdateSelected,
  onSetActiveCanvasTabs,
  onSetSplitDragState,
  onContextMenuElement,
}) => {
  const shieldReport = useMemo(
    () => (isToyhouseFreePlatform ? getElementF2UShieldReport(el) : null),
    [el, isToyhouseFreePlatform]
  );

  const canvasEl = useMemo(
    () => (isToyhouseFreePlatform ? maskElementForF2USimulation(el) : el),
    [el, isToyhouseFreePlatform]
  );

  const activeLinkUrl = useMemo(() => getElementEffectiveLinkUrl(el), [el]);

  const innerElementsArg = useMemo(() => [el, ...descendants], [el, descendants]);

  const renderedInnerHtml = useMemo(() => {
    if (isInlineEditing || ((el.type === 'tabs' || el.type === 'pure_f2u_tabs') && el.tabs)) {
      return '';
    }
    return renderInnerElementHTML(
      {
        ...el,
        rotation:
          el.type === 'pure_line' &&
          isToyhouseFreePlatform &&
          el.rotation &&
          Math.round(el.rotation) % 90 !== 0
            ? el.rotation
            : 0,
      },
      platform.startsWith('toyhouse'),
      innerElementsArg,
      false,
      isToyhouseFreePlatform
    );
  }, [el, innerElementsArg, isInlineEditing, isToyhouseFreePlatform, platform]);

  return (
    <div
      onClick={(e) => {
        if (!isSelectTool) return;
        e.stopPropagation();
        if ((e.ctrlKey || e.metaKey) && activeLinkUrl) {
          openCanvasElementLink(activeLinkUrl);
        }
      }}
      onPointerDown={(e) => {
        if (!isSelectTool) return;
        onPointerDownElement(e, el, 'move');
      }}
      onDoubleClick={(e) => {
        e.stopPropagation();
        if (el.locked || !isSelectTool) return;
        if (isPureContainerType(el.type) && !e.altKey) {
          onEnterContainerIsolation(el.id);
          return;
        }
        onSelectElement(el.id, [el.id]);
        onSetInlineEditId(el.id);
      }}
      onContextMenu={(e) => onContextMenuElement(e, el)}
      style={{
        left: el.x,
        top: el.y,
        width: el.width,
        height: el.height,
        zIndex: isEditingThisContainer ? 55 : isSelected ? 60 : el.zIndex || 10,
        transform: canvasEl.rotation ? `rotate(${canvasEl.rotation}deg)` : undefined,
        opacity: isDimmedByIsolation ? 0.25 : el.hidden ? 0.35 : undefined,
        pointerEvents: !isSelectTool || isDimmedByIsolation ? 'none' : undefined,
      }}
      className={`absolute ${el.locked ? 'cursor-not-allowed' : 'cursor-move'} ${
        isDropTarget
          ? 'ring-4 ring-emerald-500 bg-emerald-500/5 rounded-[8px]'
          : isEditingThisContainer
          ? 'ring-2 ring-amber-500 rounded-[8px]'
          : isSelected
          ? 'ring-2 ring-[#C86D51] rounded-[8px]'
          : ''
      } ${el.hidden ? 'border border-dashed border-stone-400' : ''} ${
        !isSelected &&
        (el.type === 'spacer' ||
          (el.bgColor === 'transparent' &&
            (el.borderWidth === 0 || el.borderColor === 'transparent')))
          ? 'border border-dashed border-stone-400/40 rounded-[6px]'
          : ''
      }`}
    >
      {isDropTarget && (
        <div className="absolute -top-6 left-1/2 -translate-x-1/2 px-2 py-0.5 rounded bg-emerald-600 text-white font-mono text-[9.5px] font-bold shadow z-[90] whitespace-nowrap pointer-events-none">
          DROP INSIDE: {el.label}
        </div>
      )}
      {(el.locked || activeLinkUrl) && (
        <div className="absolute top-1 left-1 flex items-center gap-1 z-30 pointer-events-none">
          {el.locked && (
            <div
              style={{ backgroundColor: '#D97706', color: '#fff' }}
              className="text-[9px] font-mono px-1.5 py-0.5 rounded-[4px] shadow-sm flex items-center gap-1"
            >
              <Lock className="w-2.5 h-2.5" />
              <span>LOCKED</span>
            </div>
          )}
          {activeLinkUrl && (
            <button
              type="button"
              onPointerDown={(e) => e.stopPropagation()}
              onClick={(e) => {
                e.stopPropagation();
                openCanvasElementLink(activeLinkUrl);
              }}
              className="pointer-events-auto text-[8.5px] font-mono font-bold px-1.5 py-0.5 rounded-[4px] bg-sky-600/95 hover:bg-sky-500 text-white shadow-sm flex items-center gap-1 transition"
              title={`Linked: ${activeLinkUrl} (Click badge or Ctrl+Click element to test)`}
            >
              <Link2 className="w-2.5 h-2.5 shrink-0" />
              <span>LINK</span>
            </button>
          )}
        </div>
      )}
      {el.hidden && (
        <div
          style={{ backgroundColor: '#78716C', color: '#fff' }}
          className="absolute bottom-1 left-1 text-[9px] font-mono px-1.5 py-0.5 rounded-[4px] z-30 pointer-events-none shadow-sm flex items-center gap-1"
        >
          <EyeOff className="w-2.5 h-2.5" />
          <span>HIDDEN</span>
        </div>
      )}
      {shieldReport?.isShielded && (
        <div
          className="absolute bottom-1 right-1 text-[8.5px] font-mono font-bold px-1.5 py-0.5 rounded-[4px] bg-amber-500/95 text-stone-950 z-30 pointer-events-auto shadow-sm flex items-center gap-1"
          title={`F2U Shield Masked: ${shieldReport.items.map((i) => i.label).join(' · ')} — Preserved safely & auto-restores in Toyhouse Premium`}
        >
          <ShieldAlert className="w-2.5 h-2.5 shrink-0" />
          <span>F2U Shield ({shieldReport.items.length})</span>
        </div>
      )}

      {showHandles && (
        <>
          <div
            onClick={(e) => e.stopPropagation()}
            onPointerDown={(e) => onPointerDownElement(e, el, 'rotate')}
            style={{ backgroundColor: 'var(--accent)', color: '#fff' }}
            className="absolute -bottom-5 left-1/2 -translate-x-1/2 px-1.5 py-[1px] rounded-full text-[8.5px] font-mono cursor-ew-resize flex items-center gap-0.5 shadow z-50"
            title="Drag horizontally to rotate element"
          >
            <RotateCw className="w-2.5 h-2.5" />
            <span>
              {el.rotation || 0}°
              {isToyhouseFreePlatform && el.rotation && Math.round(el.rotation) % 90 !== 0
                ? el.type === 'pure_line'
                  ? ' (F2U Line)'
                  : ' (0° F2U)'
                : ''}
            </span>
          </div>

          <div
            style={{ backgroundColor: 'var(--accent)', color: '#fff' }}
            className="absolute top-1 right-1 text-[9px] font-mono px-1.5 py-0.5 rounded-[4px] z-30 pointer-events-none shadow-sm"
          >
            {layoutMode === 'hybrid'
              ? isFloating
                ? `FLOAT (z:${el.zIndex || 20})`
                : `col-lg-${solvedCol}`
              : `${el.x},${el.y}`}
          </div>
        </>
      )}

      {isInlineEditing ? (
        <div
          onClick={(e) => e.stopPropagation()}
          onPointerDown={(e) => e.stopPropagation()}
          className="w-full h-full flex flex-col gap-1 p-2 bg-stone-900/95 rounded-[8px] z-40"
        >
          <input
            autoFocus
            value={el.content}
            onChange={(e) => onUpdateSelected({ content: e.target.value })}
            onKeyDown={(e) => {
              if (e.key === 'Escape' || e.key === 'Enter') onSetInlineEditId(null);
            }}
            className="w-full bg-stone-800 text-white px-2 py-1 rounded border border-amber-500 text-xs font-bold"
          />
          {el.subContent !== undefined && (
            <textarea
              value={el.subContent}
              onChange={(e) => onUpdateSelected({ subContent: e.target.value })}
              className="w-full flex-1 bg-stone-800 text-white px-2 py-1 rounded border border-amber-500 text-[11px]"
            />
          )}
        </div>
      ) : (el.type === 'tabs' || el.type === 'pure_f2u_tabs') && el.tabs ? (
        <div
          style={{
            backgroundColor: canvasEl.bgColor,
            color: canvasEl.textColor,
            borderColor: canvasEl.borderColor,
            borderWidth: canvasEl.borderWidth,
            borderStyle: canvasEl.borderStyle || 'solid',
            borderRadius: canvasEl.borderRadius,
            padding: canvasEl.padding,
            fontFamily: `${canvasEl.googleFont ? `'${canvasEl.googleFont}', ` : ''}${getFontFamilyCSS(canvasEl.fontFamily)}`,
          }}
          className="w-full h-full flex flex-col overflow-hidden"
        >
          <div className="font-bold text-xs mb-1.5">{el.content}</div>
          <div className="flex flex-wrap gap-1 border-b border-black/10 pb-1.5 mb-2">
            {el.tabs.map((tab, tIdx) => (
              <button
                key={tab.id}
                onClick={(e) => e.stopPropagation()}
                onPointerDown={(e) => {
                  e.stopPropagation();
                  onSetActiveCanvasTabs((prev) => ({
                    ...prev,
                    [el.id]: tIdx,
                  }));
                  onSelectElement(el.id);
                }}
                style={
                  activeTabIdx === tIdx
                    ? { backgroundColor: el.borderColor, color: '#fff' }
                    : { backgroundColor: 'rgba(150,150,150,0.15)' }
                }
                className="px-2 py-0.5 rounded-[5px] text-[10px] font-mono transition"
              >
                {tab.title}
              </button>
            ))}
          </div>
          <div className="text-xs opacity-90 whitespace-pre-line overflow-y-auto flex-1 leading-relaxed pointer-events-none">
            {el.tabs[activeTabIdx]?.content}
          </div>
        </div>
      ) : (
        <div
          className="w-full h-full pointer-events-none overflow-hidden"
          dangerouslySetInnerHTML={{ __html: renderedInnerHtml }}
        />
      )}

      {showHandles && (
        <>
          {RESIZE_HANDLES.map((h) => (
            <div
              key={h.dir}
              onClick={(e) => e.stopPropagation()}
              onPointerDown={(e) => onPointerDownElement(e, el, 'resize', h.dir)}
              style={{ backgroundColor: 'var(--accent)' }}
              className={`w-3 h-3 rounded-full border border-white absolute z-40 shadow ${h.cls}`}
            />
          ))}

          {(() => {
            const splitMod = (el.modifiers || []).find(
              (m): m is SplitModifier => m.kind === 'split' && m.enabled
            );
            if (!splitMod) return null;
            const isVert = splitMod.axis === 'vertical';
            return (
              <div
                onClick={(e) => e.stopPropagation()}
                onPointerDown={(e) => {
                  e.stopPropagation();
                  try {
                    e.currentTarget.setPointerCapture(e.pointerId);
                  } catch {
                    // Ignore pointer capture errors
                  }
                  const parentRect = (
                    e.currentTarget.parentElement as HTMLElement
                  )?.getBoundingClientRect();
                  if (!parentRect) return;
                  onSetSplitDragState({
                    elementId: el.id,
                    modifierId: splitMod.id,
                    axis: splitMod.axis,
                    boxLeftPx: parentRect.left,
                    boxTopPx: parentRect.top,
                    boxW: parentRect.width,
                    boxH: parentRect.height,
                  });
                }}
                style={{
                  left: isVert ? `${splitMod.ratio}%` : '50%',
                  top: isVert ? '50%' : `${splitMod.ratio}%`,
                  backgroundColor: '#18181B',
                  color: '#FFFFFF',
                }}
                className={`absolute -translate-x-1/2 -translate-y-1/2 px-1.5 py-0.5 rounded-full text-[9px] font-mono font-bold border border-white shadow-md z-50 select-none ${
                  isVert ? 'cursor-ew-resize' : 'cursor-ns-resize'
                }`}
                title="Drag to resize Split Pane Ratio %"
              >
                {splitMod.ratio}%
              </div>
            );
          })()}
        </>
      )}
    </div>
  );
};

export const CanvasElementItem = React.memo(CanvasElementItemInner);
