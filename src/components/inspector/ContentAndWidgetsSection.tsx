import React, { useState } from 'react';
import {
  Crop,
  FlipHorizontal,
  FlipVertical,
  Grid,
  Image as ImageIcon,
  MousePointerClick,
  Network,
  Plus,
  RotateCw,
  Sliders,
  Sparkles,
  Trash2,
  UploadCloud,
} from 'lucide-react';
import { FaIconBrowser } from '../shared/FaIconBrowser';
import { StudioColorButton } from '../shared/StudioColorPicker';
import {
  DEFAULT_SHAPE_CUT_PX,
  isF2UGeometricShape,
  MAX_SHAPE_CUT_PX,
  MIN_SHAPE_CUT_PX,
} from '../../utils/f2uShapeCss';
import {
  CustomPropDefinition,
  DesignElement,
  GalleryItem,
  IdleAnimation,
  ImageBlendMode,
  ImageClickAction,
  ImageFrameStyle,
  ImageHoverAction,
  ImageShape,
  CharacterRelationNode,
} from '../../types/schema';
import {
  getFontAwesomeFlipClass,
  getFontAwesomeRotationClass,
} from '../../engine/layoutSolver';

interface ContentAndWidgetsSectionProps {
  el: DesignElement;
  updateSelected: (patch: Partial<DesignElement>) => void;
  isToyhouseFree: boolean;
  swatches: string[];
  uploadingImage: boolean;
  imageUploadTarget: string | null;
  uploadNotice: string | null;
  onTriggerImageUpload: (target: string) => void;
}

type RelationType = CharacterRelationNode['relationType'];

const DEFAULT_MOODBOARD_SLOTS: GalleryItem[] = [
  { id: '1', url: 'https://images.unsplash.com/photo-1579783902614-a3fb3927b675?w=400', caption: 'Inspiration 01' },
  { id: '2', url: 'https://images.unsplash.com/photo-1518709268805-4e9042af9f23?w=400', caption: 'Inspiration 02' },
  { id: '3', url: 'https://images.unsplash.com/photo-1509198397868-475647b2a1e5?w=400', caption: 'Inspiration 03' },
  { id: '4', url: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=400', caption: 'Inspiration 04' },
];

const DEFAULT_RELATION_NODES: CharacterRelationNode[] = [
  {
    id: 'rel-1',
    name: 'Captain Kaelen',
    role: 'Flagship Commander',
    relationType: 'ally',
    avatarUrl: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80',
    desc: 'Trusts his strategic judgment implicitly.',
  },
  {
    id: 'rel-2',
    name: 'Vance the Astrologer',
    role: 'Former Mentor',
    relationType: 'mentor',
    avatarUrl: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150&auto=format&fit=crop&q=80',
    desc: 'Taught Elara how to calculate astral coordinates.',
  },
  {
    id: 'rel-3',
    name: 'Sylas of the Rift',
    role: 'Rival Cartographer',
    relationType: 'rival',
    avatarUrl: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=150&auto=format&fit=crop&q=80',
    desc: 'Competing to map the anomalous islands first.',
  },
];

const SUBCONTENT_EXCLUDED_TYPES = new Set([
  'image',
  'button',
  'badge',
  'divider',
  'washi_tape',
  'lace_divider',
  'sticker',
  'palette_strip',
  'tabs',
  'gallery',
  'moodboard',
]);

function getSubContentLabel(type: DesignElement['type']): string {
  switch (type) {
    case 'stat_bar':
    case 'pure_progress':
      return 'Meter Fill % (0 - 100)';
    case 'split_box':
      return 'Columns (Separate Left & Right with ||)';
    case 'pure_grid_2':
    case 'pure_grid_3':
    case 'pure_grid_4':
      return 'Grid Slot Text (Separate columns with || or nest items inside)';
    case 'pure_table':
      return 'Table Rows (One row per line, separate columns with |)';
    case 'pure_list':
      return 'List Items (One item per line)';
    case 'kv_table':
    case 'id_card':
      return 'Key: Value Rows (One per line)';
    case 'rpg_stats':
      return 'RPG Stats (STR: 12 per line)';
    case 'social_links':
      return 'Links (Label | https://url per line)';
    default:
      return 'Subtitle / Body Copy ({{subtitle}})';
  }
}

/** Content fields & type-specific dynamic widget editors for the Style tab. */
export const ContentAndWidgetsSection: React.FC<ContentAndWidgetsSectionProps> = ({
  el,
  updateSelected,
  isToyhouseFree,
  swatches,
  uploadingImage,
  imageUploadTarget,
  uploadNotice,
  onTriggerImageUpload,
}) => {
  const [showWatermarkFaBrowser, setShowWatermarkFaBrowser] = useState(false);
  const gallerySlots = el.gallery && el.gallery.length > 0 ? el.gallery : DEFAULT_MOODBOARD_SLOTS;
  const relationNodes = el.relationNodes || DEFAULT_RELATION_NODES;
  const isSoloCleanImage =
    el.bgColor === 'transparent' &&
    el.borderWidth === 0 &&
    el.padding === 0 &&
    el.shadow === 'none' &&
    (!el.frameStyle || el.frameStyle === 'none');

  return (
    <div className="space-y-2.5">
      <label className="block">
        <span style={{ color: 'var(--text-muted)' }} className="block mb-1 text-[11px]">
          Primary Text / Heading ({'{{title}}'})
        </span>
        <input
          type="text"
          value={el.content}
          onChange={(e) => updateSelected({ content: e.target.value })}
          style={{
            backgroundColor: 'var(--bg-input)',
            borderColor: 'var(--border-strong)',
          }}
          className="w-full border rounded-[6px] px-2 py-1 text-xs"
        />
      </label>

      {!SUBCONTENT_EXCLUDED_TYPES.has(el.type) && (
        <label className="block">
          <span style={{ color: 'var(--text-muted)' }} className="block mb-1 text-[11px]">
            {getSubContentLabel(el.type)}
          </span>
          <textarea
            rows={3}
            value={el.subContent || ''}
            onChange={(e) => updateSelected({ subContent: e.target.value })}
            style={{
              backgroundColor: 'var(--bg-input)',
              borderColor: 'var(--border-strong)',
            }}
            className="w-full border rounded-[6px] px-2 py-1 text-xs"
          />
        </label>
      )}

      {(el.type === 'button' || el.type === 'pure_link') && (
        <div className="grid grid-cols-[1fr_92px] gap-1.5">
          <label className="block">
            <span style={{ color: 'var(--text-muted)' }} className="block mb-1 text-[10px]">
              Link Target URL (href)
            </span>
            <input
              type="text"
              placeholder="https://toyhou.se"
              value={el.url || ''}
              onChange={(e) => updateSelected({ url: e.target.value })}
              style={{
                backgroundColor: 'var(--bg-input)',
                borderColor: 'var(--border-strong)',
              }}
              className="w-full border rounded-[5px] px-2 py-1 text-[11px] font-mono"
            />
          </label>
          <label className="block">
            <span style={{ color: 'var(--text-muted)' }} className="block mb-1 text-[10px]">
              Target
            </span>
            <select
              value={el.linkTarget || '_blank'}
              onChange={(e) => updateSelected({ linkTarget: e.target.value as '_blank' | '_self' })}
              style={{
                backgroundColor: 'var(--bg-input)',
                borderColor: 'var(--border-strong)',
              }}
              className="w-full border rounded-[5px] px-1.5 py-1 text-[10px]"
            >
              <option value="_blank">_blank</option>
              <option value="_self">_self</option>
            </select>
          </label>
        </div>
      )}

      {/* Interactive Tabs Editor */}
      {(el.type === 'tabs' || el.type === 'pure_f2u_tabs') && (
        <div
          style={{
            backgroundColor: 'var(--bg-panel-alt)',
            borderColor: 'var(--border-main)',
          }}
          className="p-2.5 rounded-[8px] border space-y-2"
        >
          <div className="flex items-center justify-between">
            <span className="font-semibold text-[11px]">Interactive Tabs</span>
            <button
              type="button"
              onClick={() => {
                const curr = el.tabs || [];
                updateSelected({
                  tabs: [
                    ...curr,
                    {
                      id: `t-${Date.now().toString().slice(-3)}`,
                      title: `0${curr.length + 1}. New Tab`,
                      content: 'New tab section content...',
                    },
                  ],
                });
              }}
              style={{ color: 'var(--accent)' }}
              className="text-[10px] font-mono font-bold hover:underline"
            >
              + Add Tab
            </button>
          </div>
          <div className="space-y-2 max-h-48 overflow-y-auto pr-1">
            {(el.tabs || []).map((tab, idx) => (
              <div
                key={tab.id}
                style={{
                  backgroundColor: 'var(--bg-input)',
                  borderColor: 'var(--border-strong)',
                }}
                className="p-2 rounded-[6px] border space-y-1"
              >
                <div className="flex items-center gap-1">
                  <input
                    type="text"
                    value={tab.title}
                    onChange={(e) => {
                      const next = [...(el.tabs || [])];
                      next[idx] = { ...tab, title: e.target.value };
                      updateSelected({ tabs: next });
                    }}
                    className="flex-1 bg-transparent font-bold text-[11px] border-b border-stone-500/30 focus:outline-none"
                  />
                  {(el.tabs?.length || 0) > 1 && (
                    <button
                      type="button"
                      onClick={() => {
                        const next = (el.tabs || []).filter((_, i) => i !== idx);
                        updateSelected({ tabs: next });
                      }}
                      className="text-red-400 text-[10px] px-1"
                    >
                      ×
                    </button>
                  )}
                </div>
                <textarea
                  rows={2}
                  value={tab.content}
                  onChange={(e) => {
                    const next = [...(el.tabs || [])];
                    next[idx] = { ...tab, content: e.target.value };
                    updateSelected({ tabs: next });
                  }}
                  className="w-full bg-transparent text-[11px] opacity-90 focus:outline-none"
                />
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Custom Dynamic Widget */}
      {el.type === 'custom_widget' && (
        <div
          style={{
            backgroundColor: 'var(--bg-panel-alt)',
            borderColor: 'var(--accent)',
          }}
          className="space-y-2.5 p-2.5 rounded-[8px] border"
        >
          <div className="flex items-center justify-between">
            <span className="font-semibold text-[11px]" style={{ color: 'var(--accent)' }}>
              Custom Widget Fields &amp; Props
            </span>
            <button
              type="button"
              onClick={() => {
                const key = `prop_${(el.customPropDefs?.length || 0) + 1}`;
                const nextDefs: CustomPropDefinition[] = [
                  ...(el.customPropDefs || []),
                  { key, label: `Custom (${key})`, type: 'text', defaultValue: 'Value' },
                ];
                updateSelected({
                  customPropDefs: nextDefs,
                  customProps: { ...(el.customProps || {}), [key]: 'Value' },
                  customHtml: `${el.customHtml || ''}\n<div style="font-size:11px;margin-top:4px;"><strong>${key}:</strong> {{${key}}}</div>`,
                });
              }}
              style={{ color: 'var(--accent)' }}
              className="text-[10px] font-mono font-bold hover:underline"
            >
              + Add Prop
            </button>
          </div>

          {(el.customPropDefs || []).length > 0 && (
            <div className="grid grid-cols-2 gap-1.5">
              {(el.customPropDefs || []).map((def) => (
                <label key={def.key} className="block">
                  <span
                    style={{ color: 'var(--text-muted)' }}
                    className="block text-[10px] mb-0.5 truncate"
                    title={`Placeholder: {{${def.key}}}`}
                  >
                    {def.label} ({`{{${def.key}}}`})
                  </span>
                  <input
                    type={def.type === 'number' ? 'number' : 'text'}
                    value={el.customProps?.[def.key] ?? def.defaultValue}
                    onChange={(e) =>
                      updateSelected({
                        customProps: {
                          ...(el.customProps || {}),
                          [def.key]: e.target.value,
                        },
                      })
                    }
                    style={{
                      backgroundColor: 'var(--bg-input)',
                      borderColor: 'var(--border-strong)',
                    }}
                    className="w-full border rounded-[5px] px-2 py-1 text-[11px]"
                  />
                </label>
              ))}
            </div>
          )}

          <label className="block">
            <span style={{ color: 'var(--text-muted)' }} className="block text-[10px] mb-0.5">
              Image / Link URL ({'{{image}}'} / {'{{link}}'})
            </span>
            <input
              type="text"
              placeholder="https://..."
              value={el.url || ''}
              onChange={(e) => updateSelected({ url: e.target.value })}
              style={{
                backgroundColor: 'var(--bg-input)',
                borderColor: 'var(--border-strong)',
              }}
              className="w-full border rounded-[5px] px-2 py-1 font-mono text-[10px]"
            />
          </label>

          <details className="text-[10px]">
            <summary className="cursor-pointer font-mono font-semibold opacity-80">
              Edit Raw HTML/CSS Template
            </summary>
            <textarea
              rows={5}
              value={el.customHtml || ''}
              onChange={(e) => updateSelected({ customHtml: e.target.value })}
              style={{
                backgroundColor: 'var(--bg-input)',
                borderColor: 'var(--border-strong)',
              }}
              className="w-full mt-1.5 border rounded-[5px] p-1.5 font-mono text-[10px]"
            />
          </details>
        </div>
      )}

      {/* Palette Strip Individual Swatch Pickers */}
      {el.type === 'palette_strip' && (
        <div
          style={{
            backgroundColor: 'var(--bg-panel-alt)',
            borderColor: 'var(--border-main)',
          }}
          className="p-2.5 rounded-[8px] border space-y-2"
        >
          <div className="flex items-center justify-between">
            <span className="font-semibold text-[11px]">Strip Swatch Colors</span>
            <button
              type="button"
              onClick={() => {
                const curr = el.paletteColors || swatches.slice(0, 5);
                if (curr.length < 8) {
                  updateSelected({ paletteColors: [...curr, '#C86D51'] });
                }
              }}
              style={{ color: 'var(--accent)' }}
              className="text-[10px] font-mono hover:underline"
            >
              + Add Color
            </button>
          </div>
          <div className="flex flex-wrap gap-1.5">
            {(el.paletteColors || swatches.slice(0, 5)).map((hex, idx) => (
              <div key={idx} className="flex flex-col items-center gap-0.5">
                <StudioColorButton
                  compact
                  value={hex}
                  onChange={(nextColor) => {
                    const copy = [...(el.paletteColors || swatches.slice(0, 5))];
                    copy[idx] = nextColor;
                    updateSelected({ paletteColors: copy });
                  }}
                  fallbackHex="#C86D51"
                  allowTransparent={false}
                  swatches={swatches}
                  title={`Swatch ${idx + 1} (${hex})`}
                />
                {(el.paletteColors?.length || 5) > 2 && (
                  <button
                    type="button"
                    onClick={() => {
                      const copy = (el.paletteColors || swatches.slice(0, 5)).filter(
                        (_, i) => i !== idx
                      );
                      updateSelected({ paletteColors: copy });
                    }}
                    className="text-[9px] text-red-400"
                  >
                    ×
                  </button>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Dynamic Moodboard & Gallery Engine */}
      {(el.type === 'moodboard' || el.type === 'gallery') && (
        <div
          style={{
            backgroundColor: 'var(--bg-panel-alt)',
            borderColor: 'var(--border-main)',
          }}
          className="space-y-3 p-3 rounded-[8px] border"
        >
          <div className="flex items-center justify-between border-b border-black/10 pb-1.5">
            <span className="font-bold text-xs flex items-center gap-1.5" style={{ color: 'var(--accent)' }}>
              <Grid className="w-3.5 h-3.5" />
              <span>Dynamic {el.type === 'moodboard' ? 'Moodboard' : 'Gallery'} Engine</span>
            </span>
            <span className="text-[10px] font-mono opacity-70">
              {(el.gallery || []).length} Image Slots
            </span>
          </div>

          {el.type === 'moodboard' && (
            <div>
              <span style={{ color: 'var(--text-muted)' }} className="block mb-1 text-[10px] font-semibold">
                Grid Layout Pattern
              </span>
              <div className="grid grid-cols-3 gap-1 text-[10px]">
                {(
                  [
                    { id: '2x2', label: '2×2 Grid' },
                    { id: '3col', label: '3-Column' },
                    { id: 'strip', label: 'Strip Row' },
                    { id: 'hero', label: 'Hero (1 Big + Small)' },
                    { id: 'masonry', label: 'Masonry (Auto)' },
                  ] as const
                ).map((p) => (
                  <button
                    key={p.id}
                    type="button"
                    onClick={() => updateSelected({ moodboardLayout: p.id })}
                    style={
                      (el.moodboardLayout || '2x2') === p.id
                        ? { backgroundColor: 'var(--accent)', color: '#fff' }
                        : { backgroundColor: 'var(--bg-input)' }
                    }
                    className="py-1 px-1.5 rounded-[4px] border border-black/10 font-mono text-center truncate transition"
                  >
                    {p.label}
                  </button>
                ))}
              </div>
            </div>
          )}

          <div className="grid grid-cols-2 gap-2 text-[10px]">
            <label className="block">
              <span style={{ color: 'var(--text-muted)' }} className="block mb-0.5">
                Slot Height: {el.imageSlotHeight || (el.type === 'moodboard' ? 80 : 110)}px
              </span>
              <input
                type="range"
                min={40}
                max={320}
                step={4}
                value={el.imageSlotHeight || (el.type === 'moodboard' ? 80 : 110)}
                onChange={(e) => updateSelected({ imageSlotHeight: parseInt(e.target.value, 10) })}
                className="w-full accent-accent"
              />
            </label>

            <label className="block">
              <span style={{ color: 'var(--text-muted)' }} className="block mb-0.5">
                Image Gap: {el.imageGap !== undefined ? el.imageGap : 6}px
              </span>
              <input
                type="range"
                min={0}
                max={24}
                value={el.imageGap !== undefined ? el.imageGap : 6}
                onChange={(e) => updateSelected({ imageGap: parseInt(e.target.value, 10) })}
                className="w-full accent-accent"
              />
            </label>
          </div>

          <div className="grid grid-cols-3 gap-1.5 text-[10px]">
            <label className="block">
              <span style={{ color: 'var(--text-muted)' }} className="block mb-0.5">Object Fit</span>
              <select
                value={el.imageFit || 'cover'}
                onChange={(e) => updateSelected({ imageFit: e.target.value as DesignElement['imageFit'] })}
                style={{ backgroundColor: 'var(--bg-input)', borderColor: 'var(--border-strong)' }}
                className="w-full border rounded-[4px] px-1 py-1"
              >
                <option value="cover">Cover (Fill &amp; Crop)</option>
                <option value="contain">Contain (Full Art)</option>
                <option value="fill">Stretch Fill</option>
              </select>
            </label>

            <label className="block">
              <span style={{ color: 'var(--text-muted)' }} className="block mb-0.5">Corner Radius</span>
              <input
                type="number"
                min={0}
                max={32}
                value={el.imageBorderRadius !== undefined ? el.imageBorderRadius : 4}
                onChange={(e) => updateSelected({ imageBorderRadius: parseInt(e.target.value, 10) || 0 })}
                style={{ backgroundColor: 'var(--bg-input)', borderColor: 'var(--border-strong)' }}
                className="w-full border rounded-[4px] px-1 py-1 font-mono text-center"
              />
            </label>

            <label className="block">
              <span style={{ color: 'var(--text-muted)' }} className="block mb-0.5">
                Hover Effect {isToyhouseFree ? '(Premium)' : ''}
              </span>
              <select
                value={el.imageHoverEffect || 'none'}
                onChange={(e) =>
                  updateSelected({ imageHoverEffect: e.target.value as DesignElement['imageHoverEffect'] })
                }
                style={{ backgroundColor: 'var(--bg-input)', borderColor: 'var(--border-strong)' }}
                className="w-full border rounded-[4px] px-1 py-1"
              >
                <option value="none">None</option>
                <option value="zoom">Zoom Scale</option>
                <option value="lift">Hover Lift</option>
                <option value="glow">Glow Ring</option>
              </select>
            </label>
          </div>
          {isToyhouseFree && el.imageHoverEffect && el.imageHoverEffect !== 'none' && (
            <div className="text-[9px] text-amber-500 bg-amber-500/10 border border-amber-500/20 rounded px-2 py-1">
              Moodboard CSS :hover effects require Toyhouse Premium or Carrd Pro (stripped on Toyhouse Free).
            </div>
          )}

          <div className="space-y-2 pt-1 border-t border-black/10">
            <div className="flex items-center justify-between">
              <span style={{ color: 'var(--text-muted)' }} className="text-[10px] font-semibold uppercase tracking-wider">
                Image Slots
              </span>
              <button
                type="button"
                onClick={() => {
                  const next = [
                    ...gallerySlots,
                    {
                      id: `slot-${Date.now().toString().slice(-4)}`,
                      url: 'https://images.unsplash.com/photo-1518709268805-4e9042af9f23?w=400',
                      caption: `Slot ${gallerySlots.length + 1}`,
                      clickAction: 'none' as const,
                    },
                  ];
                  updateSelected({ gallery: next });
                }}
                style={{ color: 'var(--accent)' }}
                className="text-[10px] font-mono hover:underline flex items-center gap-0.5"
              >
                <Plus className="w-3 h-3" />
                <span>Add Image Slot</span>
              </button>
            </div>

            <div className="space-y-2 max-h-60 overflow-y-auto pr-1">
              {gallerySlots.map((item, sIdx, allSlots) => (
                <div
                  key={item.id || sIdx}
                  style={{ backgroundColor: 'var(--bg-input)', borderColor: 'var(--border-strong)' }}
                  className="p-2 rounded-[6px] border space-y-1.5"
                >
                  <div className="flex items-center justify-between">
                    <span className="font-mono text-[9px] font-bold text-accent">Slot #{sIdx + 1}</span>
                    {allSlots.length > 1 && (
                      <button
                        type="button"
                        onClick={() => updateSelected({ gallery: allSlots.filter((_, i) => i !== sIdx) })}
                        className="p-0.5 text-stone-400 hover:text-red-500 rounded transition"
                        title="Delete this slot"
                      >
                        <Trash2 className="w-3 h-3" />
                      </button>
                    )}
                  </div>

                  <div className="flex gap-1.5 items-center">
                    <img
                      src={item.url}
                      alt="preview"
                      className="w-9 h-9 rounded object-cover border border-black/10 shrink-0"
                      onError={(e) => {
                        (e.target as HTMLImageElement).src =
                          'https://images.unsplash.com/photo-1579783902614-a3fb3927b675?w=100';
                      }}
                    />
                    <input
                      type="text"
                      placeholder="HTTPS Image URL..."
                      value={item.url}
                      onChange={(e) => {
                        const copy = [...allSlots];
                        copy[sIdx] = { ...copy[sIdx], url: e.target.value };
                        updateSelected({ gallery: copy });
                      }}
                      style={{ backgroundColor: 'var(--bg-panel)', borderColor: 'var(--border-strong)' }}
                      className="flex-1 border rounded-[4px] px-1.5 py-1 text-[10px] font-mono"
                    />
                    <button
                      type="button"
                      onClick={() => onTriggerImageUpload(`gallery:${sIdx}`)}
                      disabled={uploadingImage}
                      style={{ backgroundColor: 'var(--accent)', color: '#fff' }}
                      className="py-1 px-2 rounded-[4px] text-[10px] font-medium shrink-0 disabled:opacity-50"
                      title="Upload image to this slot"
                    >
                      Upload
                    </button>
                  </div>

                  <div className="grid grid-cols-2 gap-1.5 text-[9px]">
                    <label className="block">
                      <span style={{ color: 'var(--text-muted)' }} className="block mb-0.5">Click Action</span>
                      <select
                        value={item.clickAction || (item.linkUrl ? 'link' : 'none')}
                        onChange={(e) => {
                          const copy = [...allSlots];
                          copy[sIdx] = {
                            ...copy[sIdx],
                            clickAction: e.target.value as GalleryItem['clickAction'],
                          };
                          updateSelected({ gallery: copy });
                        }}
                        style={{ backgroundColor: 'var(--bg-panel)', borderColor: 'var(--border-strong)' }}
                        className="w-full border rounded-[4px] px-1 py-0.5 font-mono"
                      >
                        <option value="none">None (Static)</option>
                        <option value="link">Custom URL (Link)</option>
                        <option value="lightbox">Lightbox Zoom Popup</option>
                      </select>
                    </label>

                    <label className="block">
                      <span style={{ color: 'var(--text-muted)' }} className="block mb-0.5">Caption (Optional)</span>
                      <input
                        type="text"
                        placeholder="e.g. Art by @artist"
                        value={item.caption || ''}
                        onChange={(e) => {
                          const copy = [...allSlots];
                          copy[sIdx] = { ...copy[sIdx], caption: e.target.value };
                          updateSelected({ gallery: copy });
                        }}
                        style={{ backgroundColor: 'var(--bg-panel)', borderColor: 'var(--border-strong)' }}
                        className="w-full border rounded-[4px] px-1 py-0.5 font-mono"
                      />
                    </label>
                  </div>

                  {(item.clickAction === 'link' || (!item.clickAction && item.linkUrl)) && (
                    <input
                      type="text"
                      placeholder="Link URL: https://toyhou.se/... or https://..."
                      value={item.linkUrl || ''}
                      onChange={(e) => {
                        const copy = [...allSlots];
                        copy[sIdx] = { ...copy[sIdx], linkUrl: e.target.value, clickAction: 'link' };
                        updateSelected({ gallery: copy });
                      }}
                      style={{ backgroundColor: 'var(--bg-panel)', borderColor: 'var(--border-strong)' }}
                      className="w-full border rounded-[4px] px-1.5 py-0.5 text-[10px] font-mono text-emerald-500"
                    />
                  )}
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Dynamic Image Inspector */}
      {(el.type === 'image' || el.type === 'pure_image_slot') && (
        <div
          style={{
            backgroundColor: 'var(--bg-panel-alt)',
            borderColor: 'var(--border-main)',
          }}
          className="space-y-2.5 p-3 rounded-[8px] border"
        >
          <div className="flex items-center justify-between border-b border-black/10 pb-1.5">
            <span className="font-bold text-xs flex items-center gap-1.5" style={{ color: 'var(--accent)' }}>
              <ImageIcon className="w-3.5 h-3.5" />
              <span>Dynamic Image Inspector</span>
            </span>
            <span className="text-[10px] font-mono opacity-60">Solo Art Object</span>
          </div>

          <button
            type="button"
            onClick={() =>
              updateSelected({
                bgColor: 'transparent',
                borderColor: 'transparent',
                borderWidth: 0,
                padding: 0,
                shadow: 'none',
                frameStyle: 'none',
                content: '',
                borderRadius: 0,
                radiusTL: 0,
                radiusTR: 0,
                radiusBR: 0,
                radiusBL: 0,
              })
            }
            style={{
              backgroundColor: isSoloCleanImage ? 'var(--accent)' : 'var(--bg-input)',
              color: isSoloCleanImage ? '#fff' : 'inherit',
              borderColor: 'var(--border-strong)',
            }}
            className="w-full border rounded-[6px] py-1 px-2 text-[10px] font-semibold flex items-center justify-center gap-1.5 transition"
            title="Strip all borders, background cards, padding and shadows to render pure transparent image/sticker"
          >
            <Sparkles className="w-3 h-3" />
            <span>Solo Clean Image (Borderless Graphic Only)</span>
          </button>

          <div className="space-y-1.5">
            <div className="flex gap-1.5">
              <input
                type="text"
                placeholder="Direct HTTPS image link..."
                value={el.url || ''}
                onChange={(e) => updateSelected({ url: e.target.value })}
                style={{
                  backgroundColor: 'var(--bg-input)',
                  borderColor: 'var(--border-strong)',
                }}
                className="flex-1 border rounded-[5px] px-2 py-1 text-[11px] font-mono"
              />
              <button
                type="button"
                onClick={() => onTriggerImageUpload('url')}
                disabled={uploadingImage}
                style={{ backgroundColor: 'var(--accent)', color: '#fff' }}
                className="flex items-center gap-1 py-1 px-2.5 rounded-[5px] text-[11px] font-medium transition disabled:opacity-50 shrink-0"
                title="Upload primary image"
              >
                <UploadCloud className="w-3 h-3" />
                <span>{uploadingImage && imageUploadTarget === 'url' ? 'Uploading...' : 'Upload'}</span>
              </button>
            </div>
            {uploadNotice && (
              <p className="text-[10px] text-amber-500 leading-snug">{uploadNotice}</p>
            )}
          </div>

          <div className="grid grid-cols-3 gap-1.5 text-[10px]">
            <label className="block">
              <span className="font-semibold block mb-0.5 opacity-80">Frame Style</span>
              <select
                value={el.frameStyle || 'none'}
                onChange={(e) => updateSelected({ frameStyle: e.target.value as ImageFrameStyle })}
                style={{ backgroundColor: 'var(--bg-input)', borderColor: 'var(--border-strong)' }}
                className="w-full border rounded-[5px] px-1.5 py-1 text-[11px]"
              >
                <option value="none">Standard Border</option>
                <option value="polaroid">Instant Polaroid</option>
                <option value="filmstrip">35mm Filmstrip</option>
                <option value="stamp">Postage Stamp</option>
                <option value="tape">Scrapbook Tape</option>
                <option value="torn">Torn Paper Edge</option>
                <option value="vintage_gold">Vintage Gold Bevel</option>
                <option value="notebook">Notebook Rule</option>
              </select>
            </label>
            <label className="block">
              <span className="font-semibold block mb-0.5 opacity-80">Mask Shape</span>
              <select
                value={el.imageShape || 'rect'}
                onChange={(e) => updateSelected({ imageShape: e.target.value as ImageShape })}
                style={{ backgroundColor: 'var(--bg-input)', borderColor: 'var(--border-strong)' }}
                className="w-full border rounded-[5px] px-1.5 py-1 text-[11px]"
              >
                <option value="rect">Rectangle [F2U]</option>
                <option value="circle">Circle Avatar [F2U]</option>
                <option value="pill">Capsule Pill [F2U]</option>
                <option value="arch">Gothic Arch [F2U]</option>
                <option value="leaf">Botanical Leaf [F2U]</option>
                <option value="hexagon">Hexagon (Pointy) [F2U]</option>
                <option value="hexagon_flat">Hexagon (Flat) [F2U]</option>
                <option value="diamond">Diamond Cut [F2U]</option>
                <option value="octagon">Octagon Cut [F2U]</option>
                <option value="bevel">Chamfer Bevel [F2U]</option>
                <option value="ticket">Ticket Notches [PRO]</option>
                <option value="shield">Heraldic Shield [PRO]</option>
                <option value="cross_star">4-Pt Sparkle [PRO]</option>
                <option value="scallop">Scallop Flower [PRO]</option>
                <option value="star">5-Point Star [PRO]</option>
                <option value="heart">Heart Mask [PRO]</option>
              </select>
            </label>
            <label className="block">
              <span className="font-semibold block mb-0.5 opacity-80">Object Fit</span>
              <select
                value={el.objectFit || 'cover'}
                onChange={(e) => updateSelected({ objectFit: e.target.value as 'cover' | 'contain' })}
                style={{ backgroundColor: 'var(--bg-input)', borderColor: 'var(--border-strong)' }}
                className="w-full border rounded-[5px] px-1.5 py-1 text-[11px]"
              >
                <option value="cover">Cover (Fill)</option>
                <option value="contain">Contain (Full)</option>
              </select>
            </label>
          </div>

          {isF2UGeometricShape(el.imageShape) && (
            <div
              style={{ backgroundColor: 'var(--bg-panel)', borderColor: 'var(--border-main)' }}
              className="p-2 rounded-[6px] border space-y-2 text-[10px]"
            >
              {(el.imageShape === 'hexagon' || el.imageShape === 'hexagon_flat') && (
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
                        onClick={() => updateSelected({ imageShape: opt.id })}
                        style={
                          el.imageShape === opt.id
                            ? { backgroundColor: 'var(--accent)', color: '#fff', borderColor: 'var(--accent)' }
                            : { backgroundColor: 'var(--bg-input)', borderColor: 'var(--border-strong)' }
                        }
                        className="border rounded-[4px] px-2 py-0.5 text-[9.5px] font-medium transition"
                      >
                        {opt.label}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {(el.imageShape === 'bevel' || el.imageShape === 'octagon') && (
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <span className="font-semibold opacity-80">
                      {el.imageShape === 'bevel' ? 'Bevel Cut Size' : 'Corner Cut (px)'}
                    </span>
                    <div className="flex items-center gap-1.5 font-mono text-[9.5px]">
                      <span>
                        {el.imageShape === 'octagon' && !el.shapeCutPx
                          ? 'Auto (29%)'
                          : `${el.shapeCutPx ?? DEFAULT_SHAPE_CUT_PX}px`}
                      </span>
                      {el.imageShape === 'octagon' && el.shapeCutPx !== undefined && (
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
                    value={el.shapeCutPx ?? (el.imageShape === 'bevel' ? DEFAULT_SHAPE_CUT_PX : 20)}
                    onChange={(e) => updateSelected({ shapeCutPx: Number(e.target.value) })}
                    className="w-full"
                  />
                </div>
              )}

              {isToyhouseFree && (
                (el.borderWidth || 0) > 0 &&
                el.borderColor !== 'transparent' &&
                (!el.frameStyle || el.frameStyle === 'none') &&
                Boolean(el.url?.trim() || el.type === 'image') ? (
                  <p className="text-[9.5px] opacity-75 leading-snug">
                    F2U uses your Border Color as the polygon frame outline. Set Border Width to 0 to match surrounding background color.
                  </p>
                ) : (
                  <div className="flex items-center justify-between gap-2">
                    <span className="font-semibold opacity-80">Corner Mask Color</span>
                    <div className="w-28">
                      <StudioColorButton
                        value={el.shapeMaskBgColor || '#FAF8F5'}
                        onChange={(c) => updateSelected({ shapeMaskBgColor: c })}
                        swatches={swatches}
                        allowTransparent={false}
                        fullWidth
                        title="Match canvas or card bg behind image corners"
                      />
                    </div>
                  </div>
                )
              )}
            </div>
          )}

          <div className="pt-2 border-t border-black/10 space-y-1.5">
            <div className="flex items-center justify-between">
              <span className="font-semibold text-[10px] flex items-center gap-1">
                <Crop className="w-3 h-3" style={{ color: 'var(--accent)' }} />
                <span>Pan, Zoom &amp; Focal Crop</span>
              </span>
              <button
                type="button"
                onClick={() => updateSelected({ panX: 50, panY: 50, imgZoom: 100 })}
                style={{ color: 'var(--accent)' }}
                className="text-[9px] font-mono hover:underline"
              >
                Center
              </button>
            </div>

            <div className="grid grid-cols-2 gap-2 pt-0.5">
              <label className="text-[10px]">
                <span style={{ color: 'var(--text-muted)' }} className="block mb-0.5">Engine:</span>
                <select
                  value={el.imageRenderMode || 'f2u_bg'}
                  onChange={(e) =>
                    updateSelected({ imageRenderMode: e.target.value as DesignElement['imageRenderMode'] })
                  }
                  style={{ backgroundColor: 'var(--bg-input)', borderColor: 'var(--border-strong)' }}
                  className="text-[10px] font-mono border rounded px-1.5 py-1 w-full"
                >
                  <option value="f2u_bg">F2U BG Div (Toyhouse Safe)</option>
                  <option value="native_img">Native &lt;img&gt; Element</option>
                </select>
              </label>

              <label className="text-[10px]">
                <span style={{ color: 'var(--text-muted)' }} className="block mb-0.5">Focus Axis:</span>
                <select
                  value={el.zoomAxis || 'smart'}
                  onChange={(e) =>
                    updateSelected({ zoomAxis: e.target.value as DesignElement['zoomAxis'] })
                  }
                  style={{ backgroundColor: 'var(--bg-input)', borderColor: 'var(--border-strong)' }}
                  className="text-[10px] font-mono border rounded px-1.5 py-1 w-full"
                  title="Controls how zoom scales the background image on Toyhouse"
                >
                  <option value="smart">Auto (Smart Focal Shift)</option>
                  <option value="height">Prioritize Height (Focal Y)</option>
                  <option value="width">Prioritize Width (Focal X)</option>
                  <option value="fill">Fill Both (Cover)</option>
                </select>
              </label>
            </div>
            <p className="text-[9px] opacity-70 leading-tight" style={{ color: 'var(--text-muted)' }}>
              F2U Safe Crop uses background-position &amp; background-size, which Toyhouse Free never strips.
            </p>
            <div className="grid grid-cols-3 gap-2 text-[10px]">
              <label>
                <span style={{ color: 'var(--text-muted)' }} className="block">Zoom ({el.imgZoom ?? 100}%)</span>
                <input
                  type="range"
                  min={100}
                  max={300}
                  value={el.imgZoom ?? 100}
                  onChange={(e) => updateSelected({ imgZoom: parseInt(e.target.value, 10) })}
                  className="w-full"
                />
              </label>
              <label>
                <span style={{ color: 'var(--text-muted)' }} className="block">Focal X ({el.panX ?? 50}%)</span>
                <input
                  type="range"
                  min={0}
                  max={100}
                  value={el.panX ?? 50}
                  onChange={(e) => updateSelected({ panX: parseInt(e.target.value, 10) })}
                  className="w-full"
                />
              </label>
              <label>
                <span style={{ color: 'var(--text-muted)' }} className="block">Focal Y ({el.panY ?? 50}%)</span>
                <input
                  type="range"
                  min={0}
                  max={100}
                  value={el.panY ?? 50}
                  onChange={(e) => updateSelected({ panY: parseInt(e.target.value, 10) })}
                  className="w-full"
                />
              </label>
            </div>
          </div>

          <div className="pt-2 border-t border-black/10 space-y-1.5">
            <div className="flex items-center justify-between text-[10px]">
              <span className="font-semibold flex items-center gap-1">
                <RotateCw className="w-3 h-3" style={{ color: 'var(--accent)' }} />
                <span>Transform &amp; Blending</span>
              </span>
              <div className="flex items-center gap-1">
                {[0, 90, 180, 270].map((deg) => (
                  <button
                    key={deg}
                    type="button"
                    onClick={() => updateSelected({ imgRotation: deg })}
                    style={
                      (el.imgRotation ?? 0) === deg
                        ? { backgroundColor: 'var(--accent)', color: '#fff' }
                        : { backgroundColor: 'var(--bg-input)', color: 'var(--text-muted)' }
                    }
                    className="px-1 py-0 rounded text-[8px] font-mono border border-black/10"
                    title={`Snap image rotation to ${deg}° (F2U Native)`}
                  >
                    {deg}°
                  </button>
                ))}
              </div>
            </div>
            <div className="grid grid-cols-3 gap-2 text-[10px] items-center">
              <div className="flex gap-1">
                <button
                  type="button"
                  onClick={() => updateSelected({ flipH: !el.flipH })}
                  style={{
                    backgroundColor: el.flipH ? 'var(--accent)' : 'var(--bg-input)',
                    color: el.flipH ? '#fff' : 'inherit',
                    borderColor: 'var(--border-strong)',
                  }}
                  className="flex-1 py-1 px-1.5 border rounded-[5px] text-[10px] flex items-center justify-center gap-0.5 transition"
                >
                  <FlipHorizontal className="w-3 h-3" />
                  <span>Flip H</span>
                </button>
                <button
                  type="button"
                  onClick={() => updateSelected({ flipV: !el.flipV })}
                  style={{
                    backgroundColor: el.flipV ? 'var(--accent)' : 'var(--bg-input)',
                    color: el.flipV ? '#fff' : 'inherit',
                    borderColor: 'var(--border-strong)',
                  }}
                  className="flex-1 py-1 px-1.5 border rounded-[5px] text-[10px] flex items-center justify-center gap-0.5 transition"
                >
                  <FlipVertical className="w-3 h-3" />
                  <span>Flip V</span>
                </button>
              </div>
              <input
                type="range"
                min={0}
                max={360}
                value={el.imgRotation ?? 0}
                onChange={(e) => updateSelected({ imgRotation: parseInt(e.target.value, 10) })}
                className="w-full"
                title="Inner Rotation"
              />
              <select
                value={el.blendMode || 'normal'}
                onChange={(e) => updateSelected({ blendMode: e.target.value as ImageBlendMode })}
                style={{ backgroundColor: 'var(--bg-input)', borderColor: 'var(--border-strong)' }}
                className="w-full border rounded-[5px] px-1 py-1 text-[10px]"
              >
                <option value="normal">Blend: Normal</option>
                <option value="multiply">Multiply (Ink)</option>
                <option value="screen">Screen (Light)</option>
                <option value="overlay">Overlay</option>
                <option value="darken">Darken</option>
                <option value="lighten">Lighten</option>
                <option value="color-dodge">Color Dodge</option>
              </select>
            </div>
            {isToyhouseFree && ((el.imgRotation ?? 0) !== 0 || el.flipH || el.flipV) && (
              <div className="text-[9px] font-mono pt-0.5 flex flex-wrap gap-2">
                {(el.flipH || el.flipV) && (
                  <span className="text-emerald-500">
                    ✓ F2U Flip (.{getFontAwesomeFlipClass(el.flipH, el.flipV)})
                  </span>
                )}
                {(el.imgRotation ?? 0) !== 0 &&
                  (getFontAwesomeRotationClass(el.imgRotation) ? (
                    <span className="text-emerald-500">
                      ✓ F2U Rotate (.{getFontAwesomeRotationClass(el.imgRotation)})
                    </span>
                  ) : (
                    <span className="text-amber-500">
                      ⚠ {el.imgRotation}° needs Premium (F2U supports 90°/180°/270°)
                    </span>
                  ))}
              </div>
            )}
          </div>

          <div className="pt-2 border-t border-[var(--border-main)] space-y-1.5">
            <span className="font-semibold text-[10px] block">Color Tint / Overlay Layer</span>
            <div className="grid grid-cols-2 gap-2 text-[10px] items-center">
              <StudioColorButton
                value={el.overlayColor || '#C86D51'}
                onChange={(nextColor) => updateSelected({ overlayColor: nextColor })}
                fallbackHex="#C86D51"
                allowTransparent={false}
                swatches={swatches}
                fullWidth
                title="Tint Overlay Color"
              />
              <label className="block">
                <span style={{ color: 'var(--text-muted)' }} className="block mb-0.5">
                  Opacity ({el.overlayOpacity ?? 0}%)
                </span>
                <input
                  type="range"
                  min={0}
                  max={100}
                  value={el.overlayOpacity ?? 0}
                  onChange={(e) => updateSelected({ overlayOpacity: parseInt(e.target.value, 10) })}
                  className="w-full"
                />
              </label>
            </div>
          </div>

          <div className="pt-2 border-t border-black/10 space-y-1.5">
            <div className="flex items-center justify-between">
              <span className="font-semibold text-[10px] flex items-center gap-1">
                <Sliders className="w-3 h-3" style={{ color: 'var(--accent)' }} />
                <span>Filter Presets &amp; Tuning</span>
              </span>
              <button
                type="button"
                onClick={() =>
                  updateSelected({
                    imgBrightness: 100,
                    imgContrast: 100,
                    imgGrayscale: 0,
                    imgSepia: 0,
                    imgBlur: 0,
                    filterPreset: 'normal',
                  })
                }
                style={{ color: 'var(--accent)' }}
                className="text-[9px] font-mono hover:underline"
              >
                Reset
              </button>
            </div>
            <div className="flex flex-wrap gap-1">
              {[
                { name: 'Normal', b: 100, c: 100, g: 0, s: 0, bl: 0 },
                { name: 'Vintage', b: 105, c: 90, g: 10, s: 45, bl: 0 },
                { name: 'Noir', b: 110, c: 135, g: 100, s: 0, bl: 0 },
                { name: 'Dreamy', b: 110, c: 95, g: 0, s: 15, bl: 1 },
                { name: 'Vibrant', b: 108, c: 125, g: 0, s: 0, bl: 0 },
                { name: 'Sepia', b: 100, c: 100, g: 0, s: 75, bl: 0 },
              ].map((pr) => (
                <button
                  key={pr.name}
                  type="button"
                  onClick={() =>
                    updateSelected({
                      imgBrightness: pr.b,
                      imgContrast: pr.c,
                      imgGrayscale: pr.g,
                      imgSepia: pr.s,
                      imgBlur: pr.bl,
                      filterPreset: pr.name.toLowerCase(),
                    })
                  }
                  style={{
                    backgroundColor:
                      el.filterPreset === pr.name.toLowerCase() ? 'var(--accent)' : 'var(--bg-input)',
                    color: el.filterPreset === pr.name.toLowerCase() ? '#fff' : 'inherit',
                    borderColor: 'var(--border-strong)',
                  }}
                  className="px-2 py-0.5 rounded-[4px] border text-[9px] font-medium transition"
                >
                  {pr.name}
                </button>
              ))}
            </div>
            <div className="grid grid-cols-2 gap-2 text-[10px]">
              <label>
                <span style={{ color: 'var(--text-muted)' }} className="block">
                  Brightness ({el.imgBrightness ?? 100}%)
                </span>
                <input
                  type="range"
                  min={50}
                  max={150}
                  value={el.imgBrightness ?? 100}
                  onChange={(e) => updateSelected({ imgBrightness: parseInt(e.target.value, 10) })}
                  className="w-full"
                />
              </label>
              <label>
                <span style={{ color: 'var(--text-muted)' }} className="block">
                  Contrast ({el.imgContrast ?? 100}%)
                </span>
                <input
                  type="range"
                  min={50}
                  max={150}
                  value={el.imgContrast ?? 100}
                  onChange={(e) => updateSelected({ imgContrast: parseInt(e.target.value, 10) })}
                  className="w-full"
                />
              </label>
              <label>
                <span style={{ color: 'var(--text-muted)' }} className="block">
                  Sepia ({el.imgSepia ?? 0}%)
                </span>
                <input
                  type="range"
                  min={0}
                  max={100}
                  value={el.imgSepia ?? 0}
                  onChange={(e) => updateSelected({ imgSepia: parseInt(e.target.value, 10) })}
                  className="w-full"
                />
              </label>
              <label>
                <span style={{ color: 'var(--text-muted)' }} className="block">
                  Grayscale ({el.imgGrayscale ?? 0}%)
                </span>
                <input
                  type="range"
                  min={0}
                  max={100}
                  value={el.imgGrayscale ?? 0}
                  onChange={(e) => updateSelected({ imgGrayscale: parseInt(e.target.value, 10) })}
                  className="w-full"
                />
              </label>
            </div>
          </div>

          <div className="pt-2 border-t border-black/10 space-y-2">
            <span className="font-semibold text-[10px] flex items-center gap-1">
              <MousePointerClick className="w-3 h-3" style={{ color: 'var(--accent)' }} />
              <span>Interactivity &amp; Object Binding</span>
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
                <span className="block mb-0.5 opacity-80">Click Action</span>
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
                <span className="block mb-0.5 opacity-80">
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
                Image CSS :hover actions require Toyhouse Premium / Carrd Pro.
              </div>
            )}

            {el.clickAction === 'link' && (
              <div className="space-y-0.5">
                <span className="text-[10px] opacity-75">Target URL (opens on click)</span>
                <input
                  type="text"
                  placeholder="https://..."
                  value={el.linkUrl || ''}
                  onChange={(e) => updateSelected({ linkUrl: e.target.value })}
                  style={{ backgroundColor: 'var(--bg-input)', borderColor: 'var(--border-strong)' }}
                  className="w-full border rounded-[5px] px-2 py-1 text-[10px] font-mono"
                />
              </div>
            )}

            {el.hoverAction === 'swap_image' && (
              <div className="space-y-1">
                <span className="text-[10px] opacity-75">Secondary Image (shown on hover)</span>
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
        </div>
      )}

      {/* Relation Card */}
      {el.type === 'relation_card' && (
        <div className="space-y-2">
          <div className="grid grid-cols-2 gap-2">
            <label>
              <span style={{ color: 'var(--text-muted)' }} className="block mb-1 text-[10px]">
                Bond Hearts (1-5)
              </span>
              <input
                type="number"
                min={1}
                max={5}
                value={el.relationHearts || 4}
                onChange={(e) => updateSelected({ relationHearts: parseInt(e.target.value, 10) || 4 })}
                style={{ backgroundColor: 'var(--bg-input)', borderColor: 'var(--border-strong)' }}
                className="w-full border rounded-[5px] px-2 py-1"
              />
            </label>
            <label>
              <span style={{ color: 'var(--text-muted)' }} className="block mb-1 text-[10px]">
                Role / Tag Subtext
              </span>
              <input
                type="text"
                value={el.subContent || ''}
                onChange={(e) => updateSelected({ subContent: e.target.value })}
                style={{ backgroundColor: 'var(--bg-input)', borderColor: 'var(--border-strong)' }}
                className="w-full border rounded-[5px] px-2 py-1 text-[11px]"
              />
            </label>
          </div>

          <label className="block">
            <span style={{ color: 'var(--text-muted)' }} className="block mb-1 text-[10px]">
              Avatar Image URL
            </span>
            <div className="flex gap-1.5">
              <input
                type="text"
                value={el.url || ''}
                onChange={(e) => updateSelected({ url: e.target.value })}
                style={{ backgroundColor: 'var(--bg-input)', borderColor: 'var(--border-strong)' }}
                className="flex-1 border rounded-[5px] px-2 py-1 font-mono text-[10px]"
                placeholder="Direct image HTTPS URL..."
              />
              <button
                type="button"
                onClick={() => onTriggerImageUpload('url')}
                disabled={uploadingImage}
                style={{ backgroundColor: 'var(--accent)', color: '#fff' }}
                className="py-1 px-2.5 rounded-[5px] text-[10px] font-medium transition disabled:opacity-50 shrink-0"
              >
                Upload
              </button>
            </div>
          </label>
        </div>
      )}

      {/* Character Bond Network */}
      {el.type === 'relationship_tree' && (
        <div
          style={{
            backgroundColor: 'var(--bg-panel-alt)',
            borderColor: 'var(--border-main)',
          }}
          className="space-y-3 p-3 rounded-[8px] border"
        >
          <div className="flex items-center justify-between border-b border-black/10 pb-1.5">
            <span className="font-bold text-xs flex items-center gap-1.5" style={{ color: 'var(--accent)' }}>
              <Network className="w-3.5 h-3.5" />
              <span>Character Bond Network</span>
            </span>
            <span className="text-[10px] font-mono opacity-70">{relationNodes.length} Bonds</span>
          </div>

          <label className="block">
            <span style={{ color: 'var(--text-muted)' }} className="block mb-1 text-[10px] font-semibold">
              Network Title Header
            </span>
            <input
              type="text"
              value={el.content}
              onChange={(e) => updateSelected({ content: e.target.value })}
              style={{ backgroundColor: 'var(--bg-input)', borderColor: 'var(--border-strong)' }}
              className="w-full border rounded-[5px] px-2 py-1 text-[11px]"
            />
          </label>

          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <span style={{ color: 'var(--text-muted)' }} className="text-[10px] font-semibold">
                Character Bond Nodes
              </span>
              <button
                type="button"
                onClick={() => {
                  const newNode: CharacterRelationNode = {
                    id: `rel-${Date.now().toString().slice(-4)}`,
                    name: 'New Character',
                    role: 'Companion',
                    relationType: 'ally',
                    avatarUrl:
                      'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80',
                    desc: 'Bond details...',
                  };
                  updateSelected({ relationNodes: [...relationNodes, newNode] });
                }}
                style={{ color: 'var(--accent)' }}
                className="text-[10px] font-mono hover:underline font-semibold"
              >
                + Add Character Bond
              </button>
            </div>

            <div className="space-y-2 max-h-72 overflow-y-auto pr-1">
              {relationNodes.map((node, nIdx) => (
                <div
                  key={node.id || nIdx}
                  style={{
                    backgroundColor: 'var(--bg-input)',
                    borderColor: 'var(--border-strong)',
                  }}
                  className="p-2 rounded-[6px] border space-y-1.5"
                >
                  <div className="flex items-center gap-1.5">
                    <input
                      type="text"
                      placeholder="Character Name"
                      value={node.name}
                      onChange={(e) => {
                        const nodes = [...relationNodes];
                        nodes[nIdx] = { ...nodes[nIdx], name: e.target.value };
                        updateSelected({ relationNodes: nodes });
                      }}
                      className="flex-1 bg-transparent border-b border-black/10 dark:border-white/10 px-1 py-0.5 text-[11px] font-bold"
                    />
                    <select
                      value={node.relationType}
                      onChange={(e) => {
                        const nodes = [...relationNodes];
                        nodes[nIdx] = { ...nodes[nIdx], relationType: e.target.value as RelationType };
                        updateSelected({ relationNodes: nodes });
                      }}
                      className="text-[10px] px-1 py-0.5 rounded border border-black/10 dark:border-white/10 bg-black/5 dark:bg-white/5 font-mono"
                    >
                      <option value="ally">Ally (Green)</option>
                      <option value="rival">Rival (Red)</option>
                      <option value="family">Family (Blue)</option>
                      <option value="romance">Bond (Pink)</option>
                      <option value="mentor">Mentor (Amber)</option>
                    </select>
                    <button
                      type="button"
                      onClick={() => updateSelected({ relationNodes: relationNodes.filter((_, i) => i !== nIdx) })}
                      className="p-1 rounded text-stone-400 hover:text-red-500"
                      title="Remove Bond"
                    >
                      <Trash2 className="w-3 h-3" />
                    </button>
                  </div>

                  <div className="flex items-center gap-1.5">
                    <div
                      style={{
                        width: 28,
                        height: 28,
                        backgroundImage: `url('${node.avatarUrl || ''}')`,
                        backgroundSize: 'cover',
                        backgroundPosition: 'center',
                      }}
                      className="rounded border border-black/20 shrink-0 bg-stone-300 dark:bg-stone-700"
                    />
                    <input
                      type="text"
                      placeholder="Avatar HTTPS URL..."
                      value={node.avatarUrl || ''}
                      onChange={(e) => {
                        const nodes = [...relationNodes];
                        nodes[nIdx] = { ...nodes[nIdx], avatarUrl: e.target.value };
                        updateSelected({ relationNodes: nodes });
                      }}
                      className="flex-1 bg-transparent border rounded px-1.5 py-0.5 text-[10px] font-mono"
                    />
                    <button
                      type="button"
                      onClick={() => onTriggerImageUpload(`rel-node:${node.id}`)}
                      style={{ backgroundColor: 'var(--accent)', color: '#fff' }}
                      className="px-2 py-0.5 rounded text-[9px] font-medium shrink-0"
                    >
                      Upload
                    </button>
                  </div>

                  <div className="grid grid-cols-2 gap-1.5">
                    <input
                      type="text"
                      placeholder="Role / Title"
                      value={node.role || ''}
                      onChange={(e) => {
                        const nodes = [...relationNodes];
                        nodes[nIdx] = { ...nodes[nIdx], role: e.target.value };
                        updateSelected({ relationNodes: nodes });
                      }}
                      className="bg-transparent border rounded px-1.5 py-0.5 text-[10px]"
                    />
                    <input
                      type="text"
                      placeholder="Lore Notes"
                      value={node.desc || ''}
                      onChange={(e) => {
                        const nodes = [...relationNodes];
                        nodes[nIdx] = { ...nodes[nIdx], desc: e.target.value };
                        updateSelected({ relationNodes: nodes });
                      }}
                      className="bg-transparent border rounded px-1.5 py-0.5 text-[10px]"
                    />
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Sticker */}
      {el.type === 'sticker' && (
        <div>
          <span style={{ color: 'var(--text-muted)' }} className="block mb-1 text-[10px]">
            Sticker Stamp Symbol
          </span>
          <div className="flex flex-wrap gap-1">
            {['✦', '★', '♥', '✿', '⚡', '☾', '⚔', '☕', '♫', '⚠', '📌', '🎞️'].map((sym) => (
              <button
                key={sym}
                type="button"
                onClick={() => updateSelected({ stickerIcon: sym })}
                style={{
                  backgroundColor: el.stickerIcon === sym ? 'var(--accent)' : 'var(--bg-input)',
                  borderColor: 'var(--border-strong)',
                }}
                className="w-7 h-7 rounded-[5px] border text-sm flex items-center justify-center"
              >
                {sym}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Pagedoll Art Object */}
      {el.type === 'pagedoll' && (
        <div
          style={{
            backgroundColor: 'var(--bg-panel-alt)',
            borderColor: 'var(--border-main)',
          }}
          className="space-y-2.5 p-2.5 rounded-[8px] border"
        >
          <div className="flex items-center justify-between border-b border-black/10 pb-1">
            <span className="font-bold text-[11px] flex items-center gap-1.5" style={{ color: 'var(--accent)' }}>
              <Sparkles className="w-3.5 h-3.5" />
              <span>Pagedoll Art Object</span>
            </span>
            <span className="text-[9px] font-mono opacity-70 text-emerald-500 font-semibold">
              Toyhouse Free Native
            </span>
          </div>

          <label className="block">
            <span style={{ color: 'var(--text-muted)' }} className="block mb-1 text-[10px]">
              Art URL (Transparent PNG Recommended)
            </span>
            <div className="flex gap-1.5">
              <input
                type="text"
                placeholder="Direct image HTTPS URL..."
                value={el.url || ''}
                onChange={(e) => updateSelected({ url: e.target.value })}
                style={{ backgroundColor: 'var(--bg-input)', borderColor: 'var(--border-strong)' }}
                className="flex-1 border rounded-[5px] px-2 py-1 text-[11px] font-mono"
              />
              <button
                type="button"
                onClick={() => onTriggerImageUpload('url')}
                disabled={uploadingImage}
                style={{ backgroundColor: 'var(--accent)', color: '#fff' }}
                className="py-1 px-2 rounded-[5px] text-[10px] font-medium transition disabled:opacity-50 shrink-0"
              >
                Upload
              </button>
            </div>
          </label>

          <div className="grid grid-cols-2 gap-2">
            <label>
              <span style={{ color: 'var(--text-muted)' }} className="block mb-1 text-[10px]">
                Animation Loop
              </span>
              <select
                value={el.idleAnimation || 'bounce'}
                onChange={(e) => updateSelected({ idleAnimation: e.target.value as IdleAnimation })}
                style={{ backgroundColor: 'var(--bg-input)', borderColor: 'var(--border-strong)' }}
                className="w-full border rounded-[5px] px-1.5 py-1 text-[11px]"
              >
                <option value="bounce">fa-bounce (Spring Bounce)</option>
                <option value="float">Gentle Float ↕</option>
                <option value="pulse">fa-beat (Pulse / Heartbeat)</option>
                <option value="wiggle">fa-shake (Wiggle / Sway)</option>
                <option value="spin">fa-spin (360° Spin)</option>
                <option value="shimmer">fa-fade (Soft Fade)</option>
                <option value="none">None (Static)</option>
              </select>
            </label>

            <label>
              <span style={{ color: 'var(--text-muted)' }} className="block mb-1 text-[10px]">
                Duration: {el.animDuration || 2}s
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

          <label className="flex items-center gap-2 cursor-pointer pt-1">
            <input
              type="checkbox"
              checked={Boolean(el.pinnedOverlay)}
              onChange={(e) => updateSelected({ pinnedOverlay: e.target.checked })}
              className="rounded text-accent focus:ring-accent"
            />
            <span className="text-[10px] select-none">
              Pinned Freeform Float (Overlap other elements without pushing layout)
            </span>
          </label>
        </div>
      )}

      {/* Font Awesome Watermark Decor */}
      {el.type === 'fa_watermark' && (
        <div
          style={{
            backgroundColor: 'var(--bg-panel-alt)',
            borderColor: 'var(--border-main)',
          }}
          className="space-y-2.5 p-2.5 rounded-[8px] border"
        >
          <div className="flex items-center justify-between border-b border-black/10 pb-1">
            <span className="font-bold text-[11px] flex items-center gap-1.5" style={{ color: 'var(--accent)' }}>
              <Sparkles className="w-3.5 h-3.5" />
              <span>Font Awesome Watermark Decor</span>
            </span>
            <span className="text-[9px] font-mono opacity-70 text-emerald-500 font-semibold">F2U Native</span>
          </div>

          <label className="block">
            <span style={{ color: 'var(--text-muted)' }} className="block mb-1 text-[10px]">
              FA Icon Class
            </span>
            <input
              type="text"
              placeholder="e.g. fa-light fa-moon-stars"
              value={el.faIcon || el.content || 'fa-light fa-moon-stars'}
              onChange={(e) => updateSelected({ faIcon: e.target.value, content: e.target.value })}
              style={{ backgroundColor: 'var(--bg-input)', borderColor: 'var(--border-strong)' }}
              className="w-full border rounded-[5px] px-2 py-1 text-[11px] font-mono"
            />
          </label>

          <div>
            <div className="flex items-center justify-between mb-1">
              <span style={{ color: 'var(--text-muted)' }} className="text-[9px]">
                Popular Decorative Presets:
              </span>
              <button
                type="button"
                onClick={() => setShowWatermarkFaBrowser((v) => !v)}
                style={
                  showWatermarkFaBrowser
                    ? { backgroundColor: 'var(--accent)', color: '#fff', borderColor: 'var(--accent)' }
                    : { backgroundColor: 'var(--bg-input)', borderColor: 'var(--border-strong)', color: 'var(--accent)' }
                }
                className="border rounded px-1.5 py-0.5 text-[9px] font-mono font-semibold"
              >
                {showWatermarkFaBrowser ? 'Close Library' : 'Browse FA Library'}
              </button>
            </div>
            <div className="flex flex-wrap gap-1">
              {[
                { cls: 'fa-light fa-moon-stars', label: 'moon-stars' },
                { cls: 'fa-sharp fa-sparkle', label: 'sparkle' },
                { cls: 'fa-light fa-star-shooting', label: 'star-shooting' },
                { cls: 'fa-solid fa-heart', label: 'heart' },
                { cls: 'fa-solid fa-gem', label: 'gem' },
                { cls: 'fa-solid fa-cat', label: 'cat' },
                { cls: 'fa-solid fa-wand-magic-sparkles', label: 'magic' },
                { cls: 'fa-solid fa-feather', label: 'feather' },
                { cls: 'fa-solid fa-crown', label: 'crown' },
              ].map((chip) => (
                <button
                  key={chip.cls}
                  type="button"
                  onClick={() => updateSelected({ faIcon: chip.cls, content: chip.cls })}
                  style={{
                    backgroundColor:
                      (el.faIcon || el.content) === chip.cls ? 'var(--accent)' : 'var(--bg-input)',
                    color: (el.faIcon || el.content) === chip.cls ? '#fff' : 'inherit',
                    borderColor: 'var(--border-strong)',
                  }}
                  className="px-1.5 py-0.5 rounded-[4px] border text-[9px] font-mono transition"
                >
                  {chip.label}
                </button>
              ))}
            </div>
            {showWatermarkFaBrowser && (
              <div
                style={{ backgroundColor: 'var(--bg-panel)', borderColor: 'var(--border-main)' }}
                className="mt-2 p-2 rounded-[6px] border"
              >
                <FaIconBrowser
                  compact
                  f2uDefaultOnly={isToyhouseFree}
                  selectedClass={el.faIcon || el.content}
                  onSelectIcon={(cls) => updateSelected({ faIcon: cls, content: cls })}
                />
              </div>
            )}
          </div>

          <div className="space-y-1">
            <span style={{ color: 'var(--text-muted)' }} className="block text-[10px] font-medium">
              Watermark Anchor
            </span>
            <div className="grid grid-cols-5 gap-1">
              {(
                [
                  { id: 'top_left', label: '↖ TL' },
                  { id: 'top_right', label: '↗ TR' },
                  { id: 'center', label: '◎ C' },
                  { id: 'bottom_left', label: '↙ BL' },
                  { id: 'bottom_right', label: '↘ BR' },
                ] as const
              ).map((pos) => {
                const currentAnchor = el.watermarkAnchor || 'center';
                const isActive = currentAnchor === pos.id;
                return (
                  <button
                    key={pos.id}
                    type="button"
                    onClick={() => updateSelected({ watermarkAnchor: pos.id })}
                    style={
                      isActive
                        ? { backgroundColor: 'var(--accent)', color: '#fff', borderColor: 'var(--accent)' }
                        : { backgroundColor: 'var(--bg-input)', borderColor: 'var(--border-strong)' }
                    }
                    className="border rounded py-1 text-[9.5px] font-mono font-semibold"
                  >
                    {pos.label}
                  </button>
                );
              })}
            </div>
          </div>

          <div className="grid grid-cols-2 gap-2">
            <label>
              <span style={{ color: 'var(--text-muted)' }} className="block mb-1 text-[10px]">
                Offset X (px)
              </span>
              <input
                type="number"
                value={el.watermarkOffsetX ?? 0}
                onChange={(e) => updateSelected({ watermarkOffsetX: parseInt(e.target.value, 10) || 0 })}
                style={{ backgroundColor: 'var(--bg-input)', borderColor: 'var(--border-strong)' }}
                className="w-full border rounded px-2 py-1 text-[10px] font-mono"
              />
            </label>
            <label>
              <span style={{ color: 'var(--text-muted)' }} className="block mb-1 text-[10px]">
                Offset Y (px)
              </span>
              <input
                type="number"
                value={el.watermarkOffsetY ?? 0}
                onChange={(e) => updateSelected({ watermarkOffsetY: parseInt(e.target.value, 10) || 0 })}
                style={{ backgroundColor: 'var(--bg-input)', borderColor: 'var(--border-strong)' }}
                className="w-full border rounded px-2 py-1 text-[10px] font-mono"
              />
            </label>
          </div>

          <div className="grid grid-cols-3 gap-2">
            <label>
              <span style={{ color: 'var(--text-muted)' }} className="block mb-1 text-[10px]">
                Size: {el.fontSize || 70}px
              </span>
              <input
                type="range"
                min="24"
                max="160"
                value={el.fontSize || 70}
                onChange={(e) => updateSelected({ fontSize: parseInt(e.target.value, 10) })}
                className="w-full accent-accent"
              />
            </label>

            <label>
              <span style={{ color: 'var(--text-muted)' }} className="block mb-1 text-[10px]">
                Rotation: {el.rotation !== undefined ? el.rotation : -15}°
              </span>
              <input
                type="range"
                min="-180"
                max="180"
                value={el.rotation !== undefined ? el.rotation : -15}
                onChange={(e) => updateSelected({ rotation: parseInt(e.target.value, 10) })}
                className="w-full accent-accent"
              />
            </label>

            <label>
              <span style={{ color: 'var(--text-muted)' }} className="block mb-1 text-[10px]">
                Opacity: {el.opacity !== undefined ? el.opacity : 55}%
              </span>
              <input
                type="range"
                min="5"
                max="100"
                value={el.opacity !== undefined ? el.opacity : 55}
                onChange={(e) => updateSelected({ opacity: parseInt(e.target.value, 10) })}
                className="w-full accent-accent"
              />
            </label>
          </div>

          <div className="flex items-center justify-between gap-1.5 pt-0.5">
            <div className="flex items-center gap-1">
              <span style={{ color: 'var(--text-muted)' }} className="text-[9.5px] mr-0.5">
                F2U Snap:
              </span>
              {[0, 90, 180, 270].map((deg) => {
                const normalized = (((el.rotation ?? -15) % 360) + 360) % 360;
                const active = normalized === deg && (el.rotation === deg || (el.rotation === 0 && deg === 0));
                return (
                  <button
                    key={deg}
                    type="button"
                    onClick={() => updateSelected({ rotation: deg })}
                    style={
                      active
                        ? { backgroundColor: 'var(--accent)', color: '#fff', borderColor: 'var(--accent)' }
                        : { backgroundColor: 'var(--bg-input)', borderColor: 'var(--border-strong)' }
                    }
                    className="border rounded px-1.5 py-0.5 text-[9.5px] font-mono"
                  >
                    {deg}°
                  </button>
                );
              })}
            </div>
            <div className="flex items-center gap-1">
              <button
                type="button"
                onClick={() => updateSelected({ flipH: !el.flipH })}
                title="Flip Horizontal (F2U Safe)"
                style={
                  el.flipH
                    ? { backgroundColor: 'var(--accent)', color: '#fff', borderColor: 'var(--accent)' }
                    : { backgroundColor: 'var(--bg-input)', borderColor: 'var(--border-strong)' }
                }
                className="border rounded px-1.5 py-0.5 text-[9.5px] flex items-center gap-1"
              >
                <FlipHorizontal className="w-3 h-3" /> H
              </button>
              <button
                type="button"
                onClick={() => updateSelected({ flipV: !el.flipV })}
                title="Flip Vertical (F2U Safe)"
                style={
                  el.flipV
                    ? { backgroundColor: 'var(--accent)', color: '#fff', borderColor: 'var(--accent)' }
                    : { backgroundColor: 'var(--bg-input)', borderColor: 'var(--border-strong)' }
                }
                className="border rounded px-1.5 py-0.5 text-[9.5px] flex items-center gap-1"
              >
                <FlipVertical className="w-3 h-3" /> V
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
