import React, { useState } from 'react';
import {
  ArrowDown,
  ArrowUp,
  Award,
  BarChart3,
  BookOpen,
  ChevronDown,
  Circle,
  CircleDot,
  Columns,
  CopyPlus,
  Cpu,
  Diamond,
  Disc,
  Eye,
  EyeOff,
  FolderClosed,
  Grid,
  Heading1,
  Heart,
  History,
  IdCard,
  Image as ImageIcon,
  Layers,
  LayoutGrid,
  Link as LinkIcon,
  List,
  ListChecks,
  Lock,
  Maximize2,
  MessageSquareQuote,
  Minus,
  MousePointerClick,
  Network,
  Package,
  Palette,
  PanelLeftClose,
  PanelLeftOpen,
  PanelTop,
  Plus,
  Radio,
  RectangleHorizontal,
  Rows,
  Scissors,
  Share2,
  ShieldAlert,
  Sparkles,
  Square,
  Star,
  Swords,
  Table,
  ToggleLeft,
  Trash2,
  Type,
  Unlock,
} from 'lucide-react';
import { AssetPreset, CURATED_ASSETS } from '../data/assets';
import { PURE_PRIMITIVE_GROUPS } from '../data/purePrimitives';
import { GLOBAL_THEME_PRESETS } from '../engine/themeEngine';
import { isFloatingCollageElement } from '../engine/layoutSolver';
import { PanelResizeDragState } from '../hooks/useCanvasPointer';
import {
  CustomWidgetBlueprint,
  DesignElement,
  ElementType,
  GlobalThemePalette,
} from '../types/schema';
import { FaIconBrowser } from './shared/FaIconBrowser';
import { StudioColorButton } from './shared/StudioColorPicker';

export type LeftSidebarTab = 'pure' | 'blocks' | 'assets' | 'theme';

export interface LeftSidebarProps {
  leftCollapsed: boolean;
  leftPanelWidth: number;
  leftLibraryPct: number;
  leftSidebarTab: LeftSidebarTab;
  leftSplitContainerRef: React.RefObject<HTMLDivElement>;
  panelResizeDrag: PanelResizeDragState | null;
  elements: DesignElement[];
  selectedElement: DesignElement | null;
  selectedId: string | null;
  selectedIds: string[];
  isToyhouseFree: boolean;
  canvasBg: string;
  swatches?: string[];
  editingLayerId: string | null;
  customBlueprints: CustomWidgetBlueprint[];
  onExpandLeft: () => void;
  onCollapseLeft: () => void;
  onChangeLeftTab: (tab: LeftSidebarTab) => void;
  onResetLeftWidth: () => void;
  onResetLeftSplit: () => void;
  onStartPanelResize: (drag: PanelResizeDragState) => void;
  onAddElement: (type: ElementType) => void;
  onAddAssetPreset: (preset: AssetPreset) => void;
  onApplyOrAddFaIcon: (
    faClass: string,
    label: string,
    mode: 'apply_or_add' | 'watermark' | 'badge'
  ) => void;
  onApplyGlobalTheme: (
    palette: GlobalThemePalette,
    options: { targetScope: 'all' | 'selected'; applyColors: boolean; applyFonts: boolean }
  ) => void;
  onOpenObjectForge: () => void;
  onAddCustomBlueprint: (bp: CustomWidgetBlueprint) => void;
  onDeleteCustomBlueprint: (bpId: string) => void;
  onSaveSelectedAsBlueprint: () => void;
  onDuplicateSelected: () => void;
  onSelectLayer: (elId: string, shiftKey: boolean) => void;
  onStartEditingLayerName: (elId: string) => void;
  onTransientRenameLayer: (elId: string, label: string) => void;
  onCommitLayerRename: () => void;
  onToggleLock: (elId: string) => void;
  onToggleHide: (elId: string) => void;
  onMoveLayerOrder: (elId: string, delta: -1 | 1) => void;
}

const CORE_BLOCKS: ReadonlyArray<{ type: ElementType; label: string; icon: React.ComponentType<{ className?: string; style?: React.CSSProperties }> }> = [
  { type: 'box', label: 'Container Box', icon: Square },
  { type: 'spacer', label: 'Transparent Spacer', icon: Maximize2 },
  { type: 'split_box', label: '2-Col Split Box', icon: Columns },
  { type: 'scrollbox', label: 'Lore Scrollbox', icon: BookOpen },
  { type: 'text', label: 'Text Block', icon: Type },
  { type: 'quote_bubble', label: 'Quote Callout', icon: MessageSquareQuote },
  { type: 'kv_table', label: 'Info Key-Value', icon: ListChecks },
  { type: 'image', label: 'Solo Image / Art', icon: ImageIcon },
  { type: 'tabs', label: 'Interactive Tabs', icon: Columns },
  { type: 'gallery', label: 'Art Showcase', icon: Grid },
  { type: 'button', label: 'Link Button', icon: MousePointerClick },
  { type: 'badge', label: 'Status Badge', icon: Award },
  { type: 'stat_bar', label: 'Progress Meter', icon: BarChart3 },
  { type: 'divider', label: 'Rule Line', icon: Minus },
];

const TOYHOUSE_WIDGETS: ReadonlyArray<{ type: ElementType; label: string; icon: React.ComponentType<{ className?: string; style?: React.CSSProperties }> }> = [
  { type: 'id_card', label: 'ID Dossier Card', icon: IdCard },
  { type: 'inventory', label: 'RPG Inventory', icon: Package },
  { type: 'timeline', label: 'Timeline Lore', icon: History },
  { type: 'relationship_tree', label: 'Relation Network', icon: Network },
  { type: 'moodboard', label: '4-Pic Moodboard', icon: Grid },
  { type: 'rpg_stats', label: 'RPG 6-Stats', icon: Swords },
  { type: 'music_player', label: 'Vinyl Player', icon: Disc },
  { type: 'cassette_player', label: 'Cassette Deck', icon: Radio },
  { type: 'relation_card', label: 'Relation Card', icon: Heart },
  { type: 'palette_strip', label: 'Color Swatches', icon: Palette },
  { type: 'social_links', label: 'Social Link Bar', icon: Share2 },
  { type: 'accordion', label: 'Spoiler Box', icon: ChevronDown },
];

const DECORATIVE_BLOCKS: ReadonlyArray<{ type: ElementType; label: string; icon: React.ComponentType<{ className?: string; style?: React.CSSProperties }> }> = [
  { type: 'pagedoll', label: 'Bounce Pagedoll', icon: ImageIcon },
  { type: 'fa_watermark', label: 'FA Watermark', icon: Sparkles },
  { type: 'washi_tape', label: 'Washi Tape', icon: Scissors },
  { type: 'lace_divider', label: 'Lace Divider', icon: Sparkles },
  { type: 'folder_header', label: 'Tabbed Folder', icon: FolderClosed },
  { type: 'dni_warning', label: 'Warning / DNI', icon: ShieldAlert },
  { type: 'sticker', label: 'Float Sticker', icon: Sparkles },
];

function resolvePurePrimitiveIcon(iconName: string) {
  switch (iconName) {
    case 'columns':
      return Columns;
    case 'rows':
      return Rows;
    case 'grid2':
    case 'grid3':
    case 'grid4':
      return Grid;
    case 'scroll':
      return BookOpen;
    case 'card':
      return PanelTop;
    case 'chevron':
      return ChevronDown;
    case 'toggle':
      return ToggleLeft;
    case 'tabs':
      return Columns;
    case 'link':
      return LinkIcon;
    case 'circle':
      return Circle;
    case 'ring':
      return CircleDot;
    case 'pill':
    case 'banner':
      return RectangleHorizontal;
    case 'line':
    case 'minus':
      return Minus;
    case 'diamond':
      return Diamond;
    case 'star':
      return Star;
    case 'image':
      return ImageIcon;
    case 'layers':
      return Layers;
    case 'heading':
      return Heading1;
    case 'text':
      return Type;
    case 'list':
      return List;
    case 'table':
      return Table;
    case 'bar':
      return BarChart3;
    default:
      return Square;
  }
}

export const LeftSidebar: React.FC<LeftSidebarProps> = ({
  leftCollapsed,
  leftPanelWidth,
  leftLibraryPct,
  leftSidebarTab,
  leftSplitContainerRef,
  panelResizeDrag,
  elements,
  selectedElement,
  selectedId,
  selectedIds,
  isToyhouseFree,
  canvasBg,
  swatches,
  editingLayerId,
  customBlueprints,
  onExpandLeft,
  onCollapseLeft,
  onChangeLeftTab,
  onResetLeftWidth,
  onResetLeftSplit,
  onStartPanelResize,
  onAddElement,
  onAddAssetPreset,
  onApplyOrAddFaIcon,
  onApplyGlobalTheme,
  onOpenObjectForge,
  onAddCustomBlueprint,
  onDeleteCustomBlueprint,
  onSaveSelectedAsBlueprint,
  onDuplicateSelected,
  onSelectLayer,
  onStartEditingLayerName,
  onTransientRenameLayer,
  onCommitLayerRename,
  onToggleLock,
  onToggleHide,
  onMoveLayerOrder,
}) => {
  const [assetCategory, setAssetCategory] = useState<'all' | AssetPreset['category']>('all');
  const [faInsertMode, setFaInsertMode] = useState<'apply_or_add' | 'watermark' | 'badge'>(
    'apply_or_add'
  );
  const [draftTheme, setDraftTheme] = useState<GlobalThemePalette>(GLOBAL_THEME_PRESETS[0]);
  const [themeTargetScope, setThemeTargetScope] = useState<'all' | 'selected'>('all');

  if (leftCollapsed) {
    return (
      <div
        style={{ backgroundColor: 'var(--bg-panel)', borderColor: 'var(--border-main)' }}
        className="w-7 border-r flex flex-col items-center py-2 gap-3 shrink-0"
      >
        <button
          type="button"
          onClick={onExpandLeft}
          className="p-1 rounded hover:bg-black/10 dark:hover:bg-white/10 transition"
          title="Expand Left Catalog & Layers Panel"
        >
          <PanelLeftOpen className="w-4 h-4" style={{ color: 'var(--accent)' }} />
        </button>
        <span
          onClick={onExpandLeft}
          style={{ color: 'var(--text-muted)', writingMode: 'vertical-rl' }}
          className="text-[10px] font-mono uppercase tracking-widest cursor-pointer rotate-180 select-none"
        >
          Pure Canvas & Layers
        </span>
      </div>
    );
  }

  return (
    <>
      <aside
        style={{
          width: leftPanelWidth,
          backgroundColor: 'var(--bg-panel)',
          borderColor: 'var(--border-main)',
        }}
        className="border-r flex flex-col shrink-0 overflow-hidden"
      >
        {/* Top Sidebar Tabs */}
        <div
          style={{ borderColor: 'var(--border-main)', backgroundColor: 'var(--bg-panel-alt)' }}
          className="flex items-stretch border-b shrink-0"
        >
          <div className="flex-1 grid grid-cols-4 min-w-0">
            <button
              type="button"
              onClick={() => onChangeLeftTab('pure')}
              style={{
                borderBottomColor: leftSidebarTab === 'pure' ? 'var(--accent)' : 'transparent',
                color: leftSidebarTab === 'pure' ? 'var(--accent)' : 'var(--text-muted)',
                backgroundColor: leftSidebarTab === 'pure' ? 'var(--bg-panel)' : 'transparent',
              }}
              className="flex items-center justify-center gap-1 px-1 py-2 min-w-0 text-[10.5px] font-bold border-b-2 transition"
              title="Pure Blank Primitives (27)"
            >
              <Square className="w-3 h-3 shrink-0" />
              <span className="truncate">Pure</span>
            </button>
            <button
              type="button"
              onClick={() => onChangeLeftTab('blocks')}
              style={{
                borderBottomColor: leftSidebarTab === 'blocks' ? 'var(--accent)' : 'transparent',
                color: leftSidebarTab === 'blocks' ? 'var(--accent)' : 'var(--text-muted)',
                backgroundColor: leftSidebarTab === 'blocks' ? 'var(--bg-panel)' : 'transparent',
              }}
              className="flex items-center justify-center gap-1 px-1 py-2 min-w-0 text-[10.5px] font-bold border-b-2 transition"
              title="Core Toyhouse Widgets & Blueprints"
            >
              <LayoutGrid className="w-3 h-3 shrink-0" />
              <span className="truncate">Blocks</span>
            </button>
            <button
              type="button"
              onClick={() => onChangeLeftTab('assets')}
              style={{
                borderBottomColor: leftSidebarTab === 'assets' ? 'var(--accent)' : 'transparent',
                color: leftSidebarTab === 'assets' ? 'var(--accent)' : 'var(--text-muted)',
                backgroundColor: leftSidebarTab === 'assets' ? 'var(--bg-panel)' : 'transparent',
              }}
              className="flex items-center justify-center gap-1 px-1 py-2 min-w-0 text-[10.5px] font-bold border-b-2 transition"
              title="Curated Stamps, Washi, Stickers & FontAwesome 6 Icon Browser"
            >
              <Sparkles className="w-3 h-3 shrink-0" />
              <span className="truncate">Assets</span>
            </button>
            <button
              type="button"
              onClick={() => onChangeLeftTab('theme')}
              style={{
                borderBottomColor: leftSidebarTab === 'theme' ? 'var(--accent)' : 'transparent',
                color: leftSidebarTab === 'theme' ? 'var(--accent)' : 'var(--text-muted)',
                backgroundColor: leftSidebarTab === 'theme' ? 'var(--bg-panel)' : 'transparent',
              }}
              className="flex items-center justify-center gap-1 px-1 py-2 min-w-0 text-[10.5px] font-bold border-b-2 transition"
              title="Global Theme Palettes & Batch Typography"
            >
              <Palette className="w-3 h-3 shrink-0" />
              <span className="truncate">Theme</span>
            </button>
          </div>
          <button
            type="button"
            onClick={onCollapseLeft}
            style={{ borderColor: 'var(--border-main)', color: 'var(--text-muted)' }}
            className="px-1.5 border-l hover:bg-black/5 dark:hover:bg-white/5 transition shrink-0 flex items-center"
            title="Collapse Left Panel"
          >
            <PanelLeftClose className="w-3.5 h-3.5" />
          </button>
        </div>

        <div ref={leftSplitContainerRef} className="flex-1 flex flex-col min-h-0 overflow-hidden">
          {leftSidebarTab === 'blocks' && (
            <div
              style={{ height: `${leftLibraryPct}%` }}
              className="p-2.5 overflow-y-auto shrink-0 space-y-3"
            >
              <div>
                <div
                  style={{ color: 'var(--text-muted)' }}
                  className="text-[10px] font-mono uppercase tracking-wider mb-1.5"
                >
                  Core & Layout (14)
                </div>
                <div className="grid grid-cols-2 gap-1">
                  {CORE_BLOCKS.map((item) => {
                    const Icon = item.icon;
                    return (
                      <button
                        key={item.type}
                        onClick={() => onAddElement(item.type)}
                        style={{
                          backgroundColor: 'var(--bg-panel-alt)',
                          borderColor: 'var(--border-main)',
                        }}
                        className="flex items-center gap-1.5 px-2 py-1 rounded-[6px] border text-[11px] hover:opacity-85 transition text-left"
                      >
                        <Icon className="w-3 h-3 shrink-0" style={{ color: 'var(--accent)' }} />
                        <span className="truncate">{item.label}</span>
                      </button>
                    );
                  })}
                </div>
              </div>

              <div>
                <div
                  style={{ color: 'var(--text-muted)' }}
                  className="text-[10px] font-mono uppercase tracking-wider mb-1.5"
                >
                  Character & Toyhouse Widgets (12)
                </div>
                <div className="grid grid-cols-2 gap-1">
                  {TOYHOUSE_WIDGETS.map((item) => {
                    const Icon = item.icon;
                    return (
                      <button
                        key={item.type}
                        onClick={() => onAddElement(item.type)}
                        style={{
                          backgroundColor: 'var(--bg-panel-alt)',
                          borderColor: 'var(--border-strong)',
                        }}
                        className="flex items-center gap-1.5 px-2 py-1 rounded-[6px] border text-[11px] hover:opacity-90 transition text-left"
                      >
                        <Icon className="w-3 h-3 shrink-0" style={{ color: 'var(--accent)' }} />
                        <span className="truncate">{item.label}</span>
                      </button>
                    );
                  })}
                </div>
              </div>

              <div>
                <div
                  style={{ color: 'var(--text-muted)' }}
                  className="text-[10px] font-mono uppercase tracking-wider mb-1.5"
                >
                  Scrapbook & Decorative (7)
                </div>
                <div className="grid grid-cols-2 gap-1">
                  {DECORATIVE_BLOCKS.map((item) => {
                    const Icon = item.icon;
                    return (
                      <button
                        key={item.type}
                        onClick={() => onAddElement(item.type)}
                        style={{
                          backgroundColor: 'var(--bg-panel-alt)',
                          borderColor: 'var(--border-main)',
                        }}
                        className="flex items-center gap-1.5 px-2 py-1 rounded-[6px] border text-[11px] hover:opacity-90 transition text-left"
                      >
                        <Icon className="w-3 h-3 shrink-0" style={{ color: 'var(--accent)' }} />
                        <span className="truncate">{item.label}</span>
                      </button>
                    );
                  })}
                </div>
              </div>

              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <span
                    style={{ color: 'var(--text-muted)' }}
                    className="text-[10px] font-mono uppercase tracking-wider"
                  >
                    Custom Objects ({customBlueprints.length})
                  </span>
                  <button
                    onClick={onOpenObjectForge}
                    style={{ color: 'var(--accent)' }}
                    className="text-[10px] font-mono font-bold hover:underline flex items-center gap-0.5"
                  >
                    <Plus className="w-3 h-3" /> Build New
                  </button>
                </div>
                <div className="space-y-1">
                  {customBlueprints.map((bp) => (
                    <div
                      key={bp.id}
                      onClick={() => onAddCustomBlueprint(bp)}
                      style={{
                        backgroundColor: 'var(--accent-soft)',
                        borderColor: 'var(--border-strong)',
                      }}
                      className="flex items-center justify-between px-2 py-1.5 rounded-[6px] border text-[11px] cursor-pointer hover:opacity-90 transition group"
                      title={bp.description}
                    >
                      <div className="flex items-center gap-1.5 truncate">
                        <Cpu className="w-3 h-3 shrink-0" style={{ color: 'var(--accent)' }} />
                        <span className="font-medium truncate">{bp.name}</span>
                      </div>
                      <div className="flex items-center gap-1 shrink-0">
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            onDeleteCustomBlueprint(bp.id);
                          }}
                          className="p-1 text-stone-400 hover:text-red-500 rounded transition opacity-80 hover:opacity-100"
                          title={`Delete "${bp.name}"`}
                        >
                          <Trash2 className="w-3 h-3" />
                        </button>
                        <Plus className="w-3 h-3" style={{ color: 'var(--accent)' }} />
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {leftSidebarTab === 'pure' && (
            <div
              style={{ height: `${leftLibraryPct}%` }}
              className="p-2.5 overflow-y-auto shrink-0 space-y-3"
            >
              <div
                style={{
                  backgroundColor: 'var(--bg-panel-alt)',
                  borderColor: 'var(--border-strong)',
                }}
                className="p-2 rounded-[7px] border text-[10px] leading-snug space-y-1"
              >
                <div className="flex items-center justify-between font-bold">
                  <span style={{ color: 'var(--accent)' }}>Pure Blank Sculptable Primitives</span>
                  <span className="font-mono text-[9px] px-1 rounded bg-emerald-500/15 text-emerald-600 dark:text-emerald-400">
                    F2U Safe
                  </span>
                </div>
                <p style={{ color: 'var(--text-muted)' }}>
                  Every primitive starts pure white (#FFFFFF) with zero preset effects. Sculpt any
                  HTML &amp; F2U property in the Inspector.
                </p>
              </div>

              {PURE_PRIMITIVE_GROUPS.map((group) => (
                <div key={group.id}>
                  <div
                    style={{ color: 'var(--text-muted)' }}
                    className="text-[10px] font-mono uppercase tracking-wider mb-1"
                    title={group.subtitle}
                  >
                    {group.title}
                  </div>
                  <div className="grid grid-cols-2 gap-1">
                    {group.items.map((item) => {
                      const IconComp = resolvePurePrimitiveIcon(item.icon);
                      return (
                        <button
                          key={item.type}
                          type="button"
                          onClick={() => onAddElement(item.type)}
                          title={item.desc}
                          style={{
                            backgroundColor: 'var(--bg-panel-alt)',
                            color: 'var(--text-main)',
                            borderColor: 'var(--border-strong)',
                          }}
                          className="flex items-center gap-1.5 px-2 py-1.5 rounded-[6px] border text-[11px] font-medium hover:border-[var(--accent)] transition text-left shadow-sm min-w-0"
                        >
                          <IconComp className="w-3 h-3 shrink-0" style={{ color: 'var(--accent)' }} />
                          <span className="truncate min-w-0 flex-1">{item.label}</span>
                          {!item.f2uSafe && (
                            <span className="text-[8px] font-mono px-1 rounded bg-amber-500/15 text-amber-600 shrink-0">
                              PRO
                            </span>
                          )}
                        </button>
                      );
                    })}
                  </div>
                </div>
              ))}
            </div>
          )}

          {leftSidebarTab === 'assets' && (
            <div
              style={{ height: `${leftLibraryPct}%` }}
              className="p-2.5 overflow-y-auto shrink-0 space-y-3"
            >
              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <span
                    style={{ color: 'var(--text-muted)' }}
                    className="text-[10px] font-mono uppercase tracking-wider"
                  >
                    Curated Assets ({CURATED_ASSETS.length})
                  </span>
                  <span className="text-[9px] font-mono px-1 rounded bg-emerald-500/15 text-emerald-600 dark:text-emerald-400">
                    Click to Add
                  </span>
                </div>
                <div className="flex flex-wrap gap-1">
                  {(
                    [
                      { id: 'all', label: 'All' },
                      { id: 'stickers', label: 'Stickers' },
                      { id: 'washi', label: 'Washi' },
                      { id: 'stamps', label: 'Stamps' },
                      { id: 'badges', label: 'Badges' },
                    ] as const
                  ).map((cat) => (
                    <button
                      key={cat.id}
                      type="button"
                      onClick={() => setAssetCategory(cat.id)}
                      style={
                        assetCategory === cat.id
                          ? { backgroundColor: 'var(--accent)', color: '#fff', borderColor: 'var(--accent)' }
                          : { backgroundColor: 'var(--bg-input)', borderColor: 'var(--border-main)', color: 'var(--text-muted)' }
                      }
                      className="border rounded-[4px] px-1.5 py-0.5 text-[9.5px] font-medium"
                    >
                      {cat.label}
                    </button>
                  ))}
                </div>
                <div className="grid grid-cols-2 gap-1.5">
                  {CURATED_ASSETS.filter(
                    (a) => assetCategory === 'all' || a.category === assetCategory
                  ).map((asset) => (
                    <button
                      key={asset.id}
                      type="button"
                      onClick={() => onAddAssetPreset(asset)}
                      style={{
                        backgroundColor: 'var(--bg-panel-alt)',
                        borderColor: 'var(--border-strong)',
                      }}
                      className="flex items-center gap-2 p-1.5 rounded-[6px] border text-left hover:border-amber-500 transition group"
                      title={`Add ${asset.name} (${asset.defaultWidth}×${asset.defaultHeight})`}
                    >
                      {asset.url ? (
                        <img
                          src={asset.url}
                          alt={asset.name}
                          className="w-7 h-7 rounded-[4px] object-cover shrink-0 border border-black/15"
                        />
                      ) : (
                        <span
                          style={{
                            backgroundColor: asset.bgColor || 'var(--bg-input)',
                            borderColor: asset.borderColor || 'var(--border-strong)',
                          }}
                          className="w-7 h-7 rounded-[4px] border flex items-center justify-center text-xs shrink-0"
                        >
                          {asset.stickerIcon || '▣'}
                        </span>
                      )}
                      <div className="min-w-0 flex-1">
                        <div className="text-[10px] font-semibold truncate">{asset.label}</div>
                        <div
                          style={{ color: 'var(--text-muted)' }}
                          className="text-[8.5px] font-mono uppercase truncate"
                        >
                          {asset.category}
                        </div>
                      </div>
                    </button>
                  ))}
                </div>
              </div>

              <div
                style={{ borderColor: 'var(--border-main)' }}
                className="pt-2.5 border-t space-y-2"
              >
                <div className="flex items-center justify-between gap-1">
                  <span
                    style={{ color: 'var(--text-muted)' }}
                    className="text-[10px] font-mono uppercase tracking-wider"
                  >
                    FontAwesome 6 Browser
                  </span>
                </div>
                <div className="grid grid-cols-3 gap-1">
                  {(
                    [
                      {
                        id: 'apply_or_add',
                        label: selectedElement ? 'Set Selected' : 'Add Icon',
                      },
                      { id: 'watermark', label: '+ Watermark' },
                      { id: 'badge', label: '+ Badge' },
                    ] as const
                  ).map((m) => (
                    <button
                      key={m.id}
                      type="button"
                      onClick={() => setFaInsertMode(m.id)}
                      style={
                        faInsertMode === m.id
                          ? { backgroundColor: 'var(--accent)', color: '#fff', borderColor: 'var(--accent)' }
                          : { backgroundColor: 'var(--bg-input)', borderColor: 'var(--border-main)', color: 'var(--text-muted)' }
                      }
                      className="border rounded-[4px] py-0.5 text-[9px] font-mono font-semibold truncate px-1"
                    >
                      {m.label}
                    </button>
                  ))}
                </div>
                <FaIconBrowser
                  f2uDefaultOnly={isToyhouseFree}
                  selectedClass={selectedElement?.faIcon}
                  onSelectIcon={(cls, label) => onApplyOrAddFaIcon(cls, label, faInsertMode)}
                />
              </div>
            </div>
          )}

          {leftSidebarTab === 'theme' && (
            <div
              style={{ height: `${leftLibraryPct}%` }}
              className="p-2.5 overflow-y-auto shrink-0 space-y-3"
            >
              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <span
                    style={{ color: 'var(--text-muted)' }}
                    className="text-[10px] font-mono uppercase tracking-wider"
                  >
                    Global Theme &amp; Palette
                  </span>
                  <span
                    style={{ backgroundColor: canvasBg }}
                    className="w-3.5 h-3.5 rounded border border-white/25"
                    title={`Current Canvas BG: ${canvasBg}`}
                  />
                </div>
                <div className="grid grid-cols-2 gap-1.5">
                  {GLOBAL_THEME_PRESETS.map((preset) => {
                    const isSelected = draftTheme.id === preset.id;
                    return (
                      <button
                        key={preset.id}
                        type="button"
                        onClick={() => setDraftTheme(preset)}
                        style={{
                          backgroundColor: isSelected ? 'var(--accent-soft)' : 'var(--bg-panel-alt)',
                          borderColor: isSelected ? 'var(--accent)' : 'var(--border-strong)',
                        }}
                        className="p-1.5 rounded-[6px] border text-left hover:border-amber-500 transition space-y-1"
                        title={preset.description}
                      >
                        <div className="text-[10px] font-semibold truncate">{preset.name}</div>
                        <div className="flex items-center gap-0.5">
                          {[
                            preset.canvasBg,
                            preset.surfaceBg,
                            preset.borderColor,
                            preset.accentColor,
                            preset.textColor,
                          ].map((c, idx) => (
                            <span
                              key={`${preset.id}-${idx}`}
                              style={{ backgroundColor: c }}
                              className="h-2.5 flex-1 rounded-[2px] border border-black/15"
                            />
                          ))}
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>

              <div
                style={{
                  backgroundColor: 'var(--bg-panel-alt)',
                  borderColor: 'var(--border-main)',
                }}
                className="p-2 rounded-[7px] border space-y-2"
              >
                <div className="text-[10px] font-bold uppercase tracking-wider flex items-center justify-between">
                  <span>{draftTheme.name}</span>
                  <span className="text-[8.5px] font-mono text-emerald-500">F2U SAFE</span>
                </div>

                <div className="grid grid-cols-2 gap-1.5 text-[9.5px]">
                  {(
                    [
                      { key: 'canvasBg', label: 'Canvas' },
                      { key: 'surfaceBg', label: 'Surface' },
                      { key: 'surfaceAltBg', label: 'Alt Card' },
                      { key: 'accentColor', label: 'Accent' },
                      { key: 'borderColor', label: 'Border' },
                      { key: 'textColor', label: 'Text' },
                    ] as const
                  ).map((role) => (
                    <StudioColorButton
                      key={role.key}
                      value={draftTheme[role.key]}
                      onChange={(nextColor) =>
                        setDraftTheme((prev) => ({
                          ...prev,
                          id: 'custom',
                          [role.key]: nextColor,
                        }))
                      }
                      fallbackHex="#FAF8F5"
                      label={role.label}
                      allowAlpha={false}
                      allowTransparent={false}
                      swatches={swatches}
                      fullWidth
                      title={`${role.label} Theme Color`}
                      className="h-7 px-1.5"
                    />
                  ))}
                </div>

                <div className="grid grid-cols-2 gap-1.5 text-[10px]">
                  <label>
                    <span style={{ color: 'var(--text-muted)' }} className="block text-[9px] mb-0.5">
                      Base Font
                    </span>
                    <select
                      value={draftTheme.fontFamily}
                      onChange={(e) =>
                        setDraftTheme((prev) => ({
                          ...prev,
                          fontFamily: e.target.value as 'sans' | 'serif' | 'mono',
                        }))
                      }
                      style={{ backgroundColor: 'var(--bg-input)', borderColor: 'var(--border-strong)' }}
                      className="w-full border rounded px-1.5 py-1 text-[10px]"
                    >
                      <option value="sans">Modern Sans</option>
                      <option value="serif">Editorial Serif</option>
                      <option value="mono">Archival Mono</option>
                    </select>
                  </label>
                  <label>
                    <span style={{ color: 'var(--text-muted)' }} className="block text-[9px] mb-0.5">
                      Google Font {isToyhouseFree ? '(Pro Only)' : ''}
                    </span>
                    <input
                      type="text"
                      disabled={isToyhouseFree}
                      placeholder={isToyhouseFree ? 'Disabled on F2U' : 'e.g. Cinzel'}
                      value={draftTheme.googleFont || ''}
                      onChange={(e) =>
                        setDraftTheme((prev) => ({
                          ...prev,
                          googleFont: e.target.value || undefined,
                        }))
                      }
                      style={{ backgroundColor: 'var(--bg-input)', borderColor: 'var(--border-strong)' }}
                      className="w-full border rounded px-1.5 py-1 text-[10px] disabled:opacity-50"
                    />
                  </label>
                </div>

                <div className="flex items-center gap-1 pt-0.5">
                  <button
                    type="button"
                    onClick={() => setThemeTargetScope('all')}
                    style={
                      themeTargetScope === 'all'
                        ? { backgroundColor: 'var(--accent)', color: '#fff', borderColor: 'var(--accent)' }
                        : { backgroundColor: 'var(--bg-input)', borderColor: 'var(--border-strong)' }
                    }
                    className="flex-1 border rounded py-0.5 text-[9.5px] font-mono font-semibold"
                  >
                    All ({elements.length})
                  </button>
                  <button
                    type="button"
                    disabled={selectedIds.length === 0 && !selectedId}
                    onClick={() => setThemeTargetScope('selected')}
                    style={
                      themeTargetScope === 'selected'
                        ? { backgroundColor: 'var(--accent)', color: '#fff', borderColor: 'var(--accent)' }
                        : { backgroundColor: 'var(--bg-input)', borderColor: 'var(--border-strong)' }
                    }
                    className="flex-1 border rounded py-0.5 text-[9.5px] font-mono font-semibold disabled:opacity-40"
                  >
                    Selected ({selectedIds.length || (selectedId ? 1 : 0)})
                  </button>
                </div>

                <div className="grid grid-cols-2 gap-1.5">
                  <button
                    type="button"
                    onClick={() =>
                      onApplyGlobalTheme(draftTheme, {
                        targetScope: themeTargetScope,
                        applyColors: true,
                        applyFonts: false,
                      })
                    }
                    style={{ backgroundColor: 'var(--bg-input)', borderColor: 'var(--border-strong)' }}
                    className="border rounded-[5px] py-1 text-[10px] font-semibold hover:border-amber-500 transition"
                  >
                    Apply Palette Only
                  </button>
                  <button
                    type="button"
                    onClick={() =>
                      onApplyGlobalTheme(draftTheme, {
                        targetScope: themeTargetScope,
                        applyColors: false,
                        applyFonts: true,
                      })
                    }
                    style={{ backgroundColor: 'var(--bg-input)', borderColor: 'var(--border-strong)' }}
                    className="border rounded-[5px] py-1 text-[10px] font-semibold hover:border-amber-500 transition"
                  >
                    Apply Font Only
                  </button>
                  <button
                    type="button"
                    onClick={() =>
                      onApplyGlobalTheme(draftTheme, {
                        targetScope: themeTargetScope,
                        applyColors: true,
                        applyFonts: true,
                      })
                    }
                    style={{ backgroundColor: 'var(--accent)', color: '#fff' }}
                    className="col-span-2 rounded-[5px] py-1.5 text-[10.5px] font-bold hover:opacity-90 transition shadow-sm"
                  >
                    Apply Global Theme {themeTargetScope === 'all' ? 'to All Layers' : 'to Selected'}
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* Horizontal Row Splitter between Catalog and Layers */}
          <div
            onPointerDown={(e) => {
              e.preventDefault();
              e.stopPropagation();
              onStartPanelResize({
                target: 'left_split',
                startX: e.clientX,
                startY: e.clientY,
                origValue: leftLibraryPct,
              });
            }}
            onDoubleClick={onResetLeftSplit}
            title="Drag up/down to resize Library vs Layers • Double-click to reset (58%)"
            style={{
              borderColor: 'var(--border-main)',
              backgroundColor:
                panelResizeDrag?.target === 'left_split'
                  ? 'var(--accent-soft)'
                  : 'var(--bg-panel-alt)',
            }}
            className="h-2 border-y cursor-row-resize flex items-center justify-center shrink-0 group hover:bg-amber-500/20 transition"
          >
            <div
              style={{ backgroundColor: 'var(--border-strong)' }}
              className="w-10 h-0.5 rounded-full group-hover:bg-amber-500 transition"
            />
          </div>

          {/* Layer Hierarchy with Lock, Hide & Rename */}
          <div className="flex-1 min-h-[110px] overflow-y-auto p-2.5 flex flex-col">
            <div className="flex items-center justify-between mb-2">
              <span
                style={{ color: 'var(--text-muted)' }}
                className="text-[10px] font-mono uppercase tracking-wider"
              >
                Layers ({elements.length})
              </span>
              {selectedElement && (
                <div className="flex items-center gap-2">
                  <button
                    onClick={onSaveSelectedAsBlueprint}
                    style={{ color: 'var(--accent)' }}
                    className="text-[10px] font-mono hover:underline"
                    title="Save selected layer as reusable Custom Object"
                  >
                    + Save Preset
                  </button>
                  <button
                    onClick={onDuplicateSelected}
                    style={{ color: 'var(--accent)' }}
                    className="text-[10px] font-mono flex items-center gap-0.5 hover:underline"
                    title="Duplicate Layer (Ctrl+D)"
                  >
                    <CopyPlus className="w-3 h-3" />
                  </button>
                </div>
              )}
            </div>

            <div className="space-y-0.5 flex-1">
              {elements.map((el, idx) => {
                const isSel = selectedIds.includes(el.id) || selectedId === el.id;
                const isFloat = isFloatingCollageElement(el);
                const isEditing = editingLayerId === el.id;
                return (
                  <div
                    key={el.id}
                    onClick={(e) => onSelectLayer(el.id, e.shiftKey)}
                    style={{
                      backgroundColor: isSel ? 'var(--accent-soft)' : 'transparent',
                      borderColor: isSel ? 'var(--accent)' : 'transparent',
                      paddingLeft: el.parentId ? '18px' : '8px',
                      opacity: el.hidden ? 0.45 : 1,
                    }}
                    className="flex items-center justify-between py-1.5 pr-1.5 rounded-[6px] text-[11px] cursor-pointer border transition group"
                  >
                    <div className="truncate pr-1 flex items-center gap-1.5 flex-1 min-w-0">
                      <span
                        style={{ color: 'var(--text-muted)' }}
                        className="font-mono text-[9px] w-4 shrink-0"
                      >
                        {el.parentId ? '↳' : String(idx + 1).padStart(2, '0')}
                      </span>

                      {isEditing ? (
                        <input
                          autoFocus
                          value={el.label}
                          onChange={(e) => onTransientRenameLayer(el.id, e.target.value)}
                          onBlur={onCommitLayerRename}
                          onKeyDown={(e) => {
                            if (e.key === 'Enter' || e.key === 'Escape') {
                              onCommitLayerRename();
                            }
                          }}
                          onClick={(e) => e.stopPropagation()}
                          style={{ backgroundColor: 'var(--bg-input)', color: 'var(--text-main)' }}
                          className="w-full text-xs px-1 py-0.5 rounded border border-accent font-medium outline-none"
                        />
                      ) : (
                        <span
                          onDoubleClick={(e) => {
                            e.stopPropagation();
                            onStartEditingLayerName(el.id);
                          }}
                          className="font-medium truncate select-none"
                          title="Double-click to rename layer"
                        >
                          {el.label}
                        </span>
                      )}

                      {isFloat && (
                        <span
                          style={{ backgroundColor: 'var(--accent)', color: '#fff' }}
                          className="text-[8px] font-mono px-1 rounded-[3px] shrink-0"
                        >
                          FLOAT
                        </span>
                      )}
                    </div>

                    <div className="flex items-center gap-0.5 shrink-0">
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          onToggleLock(el.id);
                        }}
                        className={`p-1 rounded hover:bg-black/10 dark:hover:bg-white/10 transition ${
                          el.locked
                            ? 'text-amber-500 opacity-100'
                            : 'text-stone-400 opacity-30 hover:opacity-100'
                        }`}
                        title={el.locked ? 'Unlock Layer' : 'Lock Layer'}
                      >
                        {el.locked ? <Lock className="w-3 h-3" /> : <Unlock className="w-3 h-3" />}
                      </button>

                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          onToggleHide(el.id);
                        }}
                        className={`p-1 rounded hover:bg-black/10 dark:hover:bg-white/10 transition ${
                          el.hidden
                            ? 'text-stone-400 opacity-60'
                            : 'text-stone-500 opacity-30 hover:opacity-100'
                        }`}
                        title={el.hidden ? 'Show Layer' : 'Hide Layer'}
                      >
                        {el.hidden ? <EyeOff className="w-3 h-3" /> : <Eye className="w-3 h-3" />}
                      </button>

                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          onMoveLayerOrder(el.id, -1);
                        }}
                        disabled={idx === 0}
                        className="p-0.5 hover:opacity-80 disabled:opacity-20"
                        title="Move Layer Up"
                      >
                        <ArrowUp className="w-3 h-3" />
                      </button>

                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          onMoveLayerOrder(el.id, 1);
                        }}
                        disabled={idx === elements.length - 1}
                        className="p-0.5 hover:opacity-80 disabled:opacity-20"
                        title="Move Layer Down"
                      >
                        <ArrowDown className="w-3 h-3" />
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </aside>

      {/* Blender-style Left Sidebar Width Resizer */}
      <div
        onPointerDown={(e) => {
          e.preventDefault();
          onStartPanelResize({
            target: 'left',
            startX: e.clientX,
            startY: e.clientY,
            origValue: leftPanelWidth,
          });
        }}
        onDoubleClick={onResetLeftWidth}
        title="Drag left/right to resize Left Panel • Double-click to reset (280px)"
        style={{
          backgroundColor:
            panelResizeDrag?.target === 'left' ? 'var(--accent)' : 'transparent',
        }}
        className="w-1.5 -ml-[3px] z-30 cursor-col-resize hover:bg-amber-500/40 transition-colors shrink-0 flex items-center justify-center group"
      >
        <div className="w-0.5 h-10 rounded-full bg-stone-400/30 group-hover:bg-amber-500 transition" />
      </div>
    </>
  );
};
