import React from 'react';
import { Link2, MousePointerClick, Sparkles, X } from 'lucide-react';
import { getFontAwesomeAnimClass } from '../../engine/layoutSolver';
import {
  DesignElement,
  HoverEffect,
  IdleAnimation,
  ImageClickAction,
  ImageHoverAction,
} from '../../types/schema';

export interface InteractionsAndMotionSectionProps {
  el: DesignElement;
  updateSelected: (patch: Partial<DesignElement>) => void;
  isToyhouseFree: boolean;
  showProControls?: boolean;
  uploadingImage: boolean;
  onTriggerImageUpload: (target: string) => void;
}

const LINK_EXCLUDED_TYPES = new Set([
  'tabs',
  'pure_f2u_tabs',
  'accordion',
  'pure_spoiler',
  'pure_collapse',
  'social_links',
]);

/** Unified Link, Click/Hover Actions, Collapsible Spoiler, Animation & Tooltip controls. */
export const InteractionsAndMotionSection: React.FC<InteractionsAndMotionSectionProps> = ({
  el,
  updateSelected,
  isToyhouseFree,
  showProControls = true,
  uploadingImage,
  onTriggerImageUpload,
}) => {
  const showProOnly = !isToyhouseFree || showProControls;
  const isPrimaryUrlLink = el.type === 'button' || el.type === 'pure_link';
  const isImageLike = el.type === 'image' || el.type === 'pure_image_slot';
  const showLinkSection =
    !LINK_EXCLUDED_TYPES.has(el.type) &&
    !el.collapsible &&
    el.f2uCollapseRole !== 'trigger';

  const currentLinkValue = isPrimaryUrlLink
    ? el.linkUrl !== undefined
      ? el.linkUrl
      : el.url || ''
    : el.linkUrl || '';

  const handleLinkChange = (nextUrl: string) => {
    if (isPrimaryUrlLink) {
      updateSelected({ url: nextUrl, linkUrl: nextUrl });
    } else if (isImageLike) {
      updateSelected({
        linkUrl: nextUrl,
        clickAction: nextUrl.trim()
          ? 'link'
          : el.clickAction === 'link'
            ? 'none'
            : el.clickAction,
      });
    } else {
      updateSelected({ linkUrl: nextUrl });
    }
  };

  const handleClearLink = () => {
    if (isPrimaryUrlLink) {
      updateSelected({ url: '', linkUrl: '' });
    } else if (isImageLike) {
      updateSelected({
        linkUrl: '',
        ...(el.clickAction === 'link' ? { clickAction: 'none' as const } : {}),
      });
    } else {
      updateSelected({ linkUrl: '' });
    }
  };

  return (
    <div className="space-y-2.5">
      {/* Unified Click Link (URL) & Target */}
      {showLinkSection && (
        <div
          style={{
            backgroundColor: 'var(--bg-panel)',
            borderColor: currentLinkValue.trim() ? 'var(--accent)' : 'var(--border-main)',
          }}
          className="p-2 rounded-[7px] border space-y-1.5"
        >
          <div className="flex items-center justify-between text-[10px]">
            <span className="font-semibold flex items-center gap-1">
              <Link2 className="w-3 h-3" style={{ color: 'var(--accent)' }} />
              <span>Click Link (URL)</span>
            </span>
            <span className="text-[9px] font-mono opacity-65">F2U Safe &lt;a&gt;</span>
          </div>
          <div className="grid grid-cols-[1fr_84px] gap-1.5 items-center">
            <div className="relative flex items-center">
              <input
                type="text"
                placeholder="https://toyhou.se/~..."
                value={currentLinkValue}
                onChange={(e) => handleLinkChange(e.target.value)}
                style={{
                  backgroundColor: 'var(--bg-input)',
                  borderColor: 'var(--border-strong)',
                }}
                className="w-full border rounded-[5px] pl-2 pr-6 py-1 text-[11px] font-mono"
              />
              {currentLinkValue.trim() && (
                <button
                  type="button"
                  onClick={handleClearLink}
                  title="Remove link"
                  style={{ color: 'var(--text-muted)' }}
                  className="absolute right-1.5 p-0.5 rounded hover:text-red-400 transition"
                >
                  <X className="w-3 h-3" />
                </button>
              )}
            </div>
            <select
              aria-label="Link Target"
              value={el.linkTarget || '_blank'}
              onChange={(e) => updateSelected({ linkTarget: e.target.value as '_blank' | '_self' })}
              style={{
                backgroundColor: 'var(--bg-input)',
                borderColor: 'var(--border-strong)',
              }}
              className="w-full border rounded-[5px] px-1.5 py-1 text-[10px]"
              title="Open link in new tab (_blank) or same tab (_self)"
            >
              <option value="_blank">New Tab (_blank)</option>
              <option value="_self">Same Tab (_self)</option>
            </select>
          </div>
          {isImageLike && el.clickAction === 'lightbox' && (
            <p className="text-[9.5px] opacity-75 leading-tight" style={{ color: 'var(--text-muted)' }}>
              Lightbox is active — entering a URL switches click action to Link.
            </p>
          )}
        </div>
      )}

      {/* Image-Specific Click, Lightbox, Hover Swap & Container Fill Binding */}
      {isImageLike && (
        <div className="pt-1.5 border-t border-[var(--border-main)] space-y-2">
          <span className="font-semibold text-[10px] flex items-center gap-1">
            <MousePointerClick className="w-3 h-3" style={{ color: 'var(--accent)' }} />
            <span>Image Action &amp; Binding</span>
          </span>

          <label className="flex items-center gap-2 cursor-pointer text-[10px]">
            <input
              type="checkbox"
              checked={Boolean(el.asBackgroundFill)}
              onChange={(e) => updateSelected({ asBackgroundFill: e.target.checked })}
              className="rounded"
            />
            <span className="font-medium">Use as Full-Bleed Container Background</span>
          </label>

          <div className="grid grid-cols-2 gap-2 text-[10px]">
            <label className="block">
              <span style={{ color: 'var(--text-muted)' }} className="block mb-0.5">Click Action</span>
              <select
                value={el.clickAction || 'none'}
                onChange={(e) => updateSelected({ clickAction: e.target.value as ImageClickAction })}
                style={{ backgroundColor: 'var(--bg-input)', borderColor: 'var(--border-strong)' }}
                className="w-full border rounded-[5px] px-1.5 py-1 text-[10px]"
              >
                <option value="none">None (Standard)</option>
                <option value="lightbox">Expand Lightbox Modal</option>
                <option value="link">Open External Link</option>
              </select>
            </label>
            <label className="block">
              <span style={{ color: 'var(--text-muted)' }} className="block mb-0.5">
                Hover Action {isToyhouseFree ? '(Premium)' : ''}
              </span>
              <select
                value={el.hoverAction || 'none'}
                onChange={(e) => updateSelected({ hoverAction: e.target.value as ImageHoverAction })}
                style={{ backgroundColor: 'var(--bg-input)', borderColor: 'var(--border-strong)' }}
                className="w-full border rounded-[5px] px-1.5 py-1 text-[10px]"
              >
                <option value="none">None</option>
                <option value="swap_image">Swap Image on Hover</option>
                <option value="zoom">Zoom in on Hover</option>
                <option value="tilt">Tilt Angle on Hover</option>
              </select>
            </label>
          </div>

          {isToyhouseFree && el.hoverAction && el.hoverAction !== 'none' && (
            <div className="text-[9px] text-amber-500 bg-amber-500/10 border border-amber-500/20 rounded px-2 py-1">
              Image CSS :hover actions require Toyhouse Premium.
            </div>
          )}

          {el.hoverAction === 'swap_image' && (
            <div className="space-y-1">
              <span style={{ color: 'var(--text-muted)' }} className="text-[10px]">
                Secondary Image (shown on hover)
              </span>
              <div className="flex gap-1.5">
                <input
                  type="text"
                  placeholder="Secondary image HTTPS link..."
                  value={el.hoverImageUrl || ''}
                  onChange={(e) => updateSelected({ hoverImageUrl: e.target.value })}
                  style={{ backgroundColor: 'var(--bg-input)', borderColor: 'var(--border-strong)' }}
                  className="flex-1 border rounded-[5px] px-2 py-1 text-[10px] font-mono"
                />
                <button
                  type="button"
                  onClick={() => onTriggerImageUpload('hoverImageUrl')}
                  disabled={uploadingImage}
                  style={{ backgroundColor: 'var(--accent)', color: '#fff' }}
                  className="px-2 py-1 rounded-[5px] text-[10px] font-medium transition disabled:opacity-50 shrink-0"
                >
                  Upload
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Collapsible / Spoiler Container */}
      <div className="pt-1.5 border-t border-[var(--border-main)] space-y-1.5">
        <div className="flex items-center justify-between">
          <label className="flex items-center gap-2 cursor-pointer text-[10px]">
            <input
              type="checkbox"
              checked={Boolean(el.collapsible)}
              onChange={(e) => updateSelected({ collapsible: e.target.checked })}
              className="rounded text-accent focus:ring-accent"
            />
            <span className="font-semibold select-none flex items-center gap-1">
              <Sparkles className="w-3 h-3" style={{ color: 'var(--accent)' }} />
              <span>Collapsible / Spoiler Box</span>
            </span>
          </label>
          <span className="text-[9px] font-mono opacity-60">F2U Safe</span>
        </div>

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

      {/* Hover & Idle Animations + Tooltip */}
      <div className="pt-1.5 border-t border-[var(--border-main)] space-y-2">
        <div className={`grid gap-2 ${showProOnly ? 'grid-cols-2' : 'grid-cols-1'}`}>
          {showProOnly && (
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
          )}

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
          <div className="space-y-1.5 pt-1 border-t border-[var(--border-main)]">
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
            <strong>Toyhouse Premium</strong>. On Toyhouse Free (F2U), use{' '}
            <strong>Hover Tooltip</strong> below or <strong>Collapsible Box</strong> above.
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
