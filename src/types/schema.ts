export type LayoutMode = 'hybrid' | 'block' | 'freeform';

export type TargetPlatform =
  | 'toyhouse_free'
  | 'toyhouse_premium'
  | 'toyhouse_oc'
  | 'toyhouse_profile'
  | 'toyhouse_world'
  | 'carrd_pro';

export type ElementType =
  // Core & Layout (14)
  | 'box'
  | 'spacer'
  | 'split_box'
  | 'scrollbox'
  | 'text'
  | 'quote_bubble'
  | 'kv_table'
  | 'image'
  | 'tabs'
  | 'gallery'
  | 'button'
  | 'badge'
  | 'stat_bar'
  | 'divider'
  // Character & Toyhouse Widgets (15)
  | 'id_card'
  | 'moodboard'
  | 'rpg_stats'
  | 'music_player'
  | 'cassette_player'
  | 'relation_card'
  | 'palette_strip'
  | 'social_links'
  | 'accordion'
  | 'inventory'
  | 'timeline'
  | 'relationship_tree'
  | 'pagedoll'
  | 'fa_watermark'
  // Decorative & Scrapbook (6)
  | 'washi_tape'
  | 'lace_divider'
  | 'folder_header'
  | 'dni_warning'
  | 'sticker'
  // Visual Object Forge (Custom Dynamic Object)
  | 'custom_widget'
  // Pure Canvas / Ultra-Modelable Blank Primitives (24)
  | 'pure_box'
  | 'pure_flex_row'
  | 'pure_flex_col'
  | 'pure_grid_2'
  | 'pure_grid_3'
  | 'pure_grid_4'
  | 'pure_scrollbox'
  | 'pure_card'
  | 'pure_spoiler'
  | 'pure_collapse'
  | 'pure_f2u_tabs'
  | 'pure_link'
  | 'pure_circle'
  | 'pure_pill'
  | 'pure_diamond'
  | 'pure_hexagon'
  | 'pure_octagon'
  | 'pure_banner'
  | 'pure_image_slot'
  | 'pure_overlay_box'
  | 'pure_heading'
  | 'pure_paragraph'
  | 'pure_list'
  | 'pure_table'
  | 'pure_progress'
  | 'pure_divider'
  // Direct Geometric & Line Primitives (3)
  | 'pure_line'
  | 'pure_ring'
  | 'pure_star';

export type HoverEffect = 'none' | 'lift' | 'scale' | 'glow' | 'fade' | 'tilt';

export type IdleAnimation =
  | 'none'
  | 'float'
  | 'bounce'
  | 'pulse'
  | 'heartbeat'
  | 'wiggle'
  | 'sway'
  | 'rubber_band'
  | 'spin'
  | 'shimmer'
  | 'glitch';

export type ImageShape =
  | 'rect'
  | 'circle'
  | 'pill'
  | 'arch'
  | 'leaf'
  | 'polaroid'
  | 'diamond'
  | 'hexagon'
  | 'hexagon_flat'
  | 'octagon'
  | 'bevel'
  | 'ticket'
  | 'shield'
  | 'cross_star'
  | 'scallop'
  | 'star'
  | 'heart';

export type ImageFrameStyle =
  | 'none'
  | 'polaroid'
  | 'filmstrip'
  | 'stamp'
  | 'tape'
  | 'torn'
  | 'vintage_gold'
  | 'notebook';

export type ImageBlendMode =
  | 'normal'
  | 'multiply'
  | 'screen'
  | 'overlay'
  | 'darken'
  | 'lighten'
  | 'color-dodge';

export type ImageClickAction = 'none' | 'lightbox' | 'link';

export type ImageHoverAction = 'none' | 'swap_image' | 'zoom' | 'tilt';

export type BgPattern =
  | 'none'
  | 'dots'
  | 'grid'
  | 'cross_grid'
  | 'lines'
  | 'stripes'
  | 'checker';

export type BorderStyle =
  | 'solid'
  | 'dashed'
  | 'dotted'
  | 'double'
  | 'groove'
  | 'ridge'
  | 'inset'
  | 'outset';

export type FontFamily =
  | 'sans'
  | 'serif'
  | 'mono'
  | 'display'
  | 'handwriting'
  | 'pixel';

export interface TabItem {
  id: string;
  title: string;
  content: string;
}

export interface GalleryItem {
  id: string;
  url: string;
  caption?: string;
  linkUrl?: string;
  clickAction?: 'link' | 'lightbox' | 'none';
}

export interface KeyValueItem {
  key: string;
  value: string;
}

export interface InventoryItem {
  id: string;
  name: string;
  icon?: string;
  count?: number;
  rarity?: 'common' | 'rare' | 'epic' | 'legendary';
}

export interface TimelineMilestone {
  id: string;
  year: string;
  title: string;
  description: string;
}

export interface CharacterRelationNode {
  id: string;
  name: string;
  role: string;
  relationType: 'ally' | 'rival' | 'family' | 'romance' | 'mentor';
  avatarUrl?: string;
  desc?: string;
}

export interface CustomPropDefinition {
  key: string;
  label: string;
  type: 'text' | 'number' | 'color' | 'url';
  defaultValue: string;
}

export interface VisualForgeConfig {
  layout: 'row' | 'col' | 'grid2';
  glassmorphism: boolean;
  glowBorder: boolean;
  showAvatarSlot: boolean;
  showHeaderSlot: boolean;
  showBodySlot: boolean;
  showProgressSlot: boolean;
  showBadgeSlot: boolean;
  showButtonSlot: boolean;
}

export interface CustomWidgetBlueprint {
  id: string;
  name: string;
  icon: string;
  description: string;
  htmlTemplate: string;
  defaultWidth: number;
  defaultHeight: number;
  defaultContent: string;
  defaultSubContent: string;
  defaultUrl?: string;
  customPropDefs?: CustomPropDefinition[];
  visualConfig?: VisualForgeConfig;
}

export interface DesignElement {
  id: string;
  type: ElementType;
  label: string;
  content: string;
  subContent?: string;
  url?: string;
  audioUrl?: string;
  tabs?: TabItem[];
  gallery?: GalleryItem[];
  kvItems?: KeyValueItem[];
  paletteColors?: string[];
  relationHearts?: number;
  stickerIcon?: string;
  inventoryItems?: InventoryItem[];
  timelineMilestones?: TimelineMilestone[];
  relationNodes?: CharacterRelationNode[];
  googleFont?: string;
  faIcon?: string;
  animDuration?: number;
  customHtml?: string;
  customBlueprintId?: string;
  customProps?: Record<string, string>;
  customPropDefs?: CustomPropDefinition[];
  parentId?: string | null;
  // Spatial Coordinates
  x: number;
  y: number;
  width: number;
  height: number;
  rotation?: number;
  zIndex?: number;
  opacity?: number;
  pinnedOverlay?: boolean;
  locked?: boolean;
  hidden?: boolean;
  // Block / Hybrid Ordering & Container Mapping
  order: number;
  rowIndex: number;
  colSpan: number;
  // Rich Styling & Advanced Inspector Properties
  bgColor: string;
  bgGradientTo?: string;
  bgPattern?: BgPattern;
  textColor: string;
  borderColor: string;
  borderWidth: number;
  borderStyle?: BorderStyle;
  borderRadius: number;
  // Dynamic 4-Corner Radii & Linking
  radiusTL?: number;
  radiusTR?: number;
  radiusBR?: number;
  radiusBL?: number;
  cornersLinked?: boolean;
  padding: number;
  fontSize: number;
  fontFamily?: FontFamily;
  fontWeight: 'normal' | 'medium' | 'bold';
  textAlign: 'left' | 'center' | 'right';
  verticalAlign?: 'top' | 'center' | 'bottom';
  lineHeight?: number; // e.g., 1.4
  letterSpacing?: number; // px, e.g., 0, 1, 2
  textTransform?: 'none' | 'uppercase' | 'lowercase';
  fontStyle?: 'normal' | 'italic';
  textDecoration?: 'none' | 'underline';
  textShadow?: boolean;
  glassBlur?: number; // 0 to 16px backdrop blur
  innerGlow?: boolean;
  shadow: 'none' | 'sm' | 'md' | 'lg';
  hoverEffect: HoverEffect;
  idleAnimation?: IdleAnimation;
  imageShape?: ImageShape;
  boxClipShape?: ImageShape;
  shapeCutPx?: number;
  shapeMaskBgColor?: string;
  objectFit?: 'cover' | 'contain';
  watermarkAnchor?: 'center' | 'top_left' | 'top_right' | 'bottom_left' | 'bottom_right';
  watermarkOffsetX?: number;
  watermarkOffsetY?: number;
  imgBrightness?: number; // 50 to 150 (%)
  imgContrast?: number; // 50 to 150 (%)
  imgGrayscale?: number; // 0 to 100 (%)
  imgSepia?: number; // 0 to 100 (%)
  imgBlur?: number; // 0 to 10 (px)
  // Ultra-Dynamic Image & Interaction Capabilities
  panX?: number; // Focal point X (0-100%)
  panY?: number; // Focal point Y (0-100%)
  imgZoom?: number; // Zoom level (100-300%)
  flipH?: boolean; // Flip horizontal
  flipV?: boolean; // Flip vertical
  imgRotation?: number; // Inner image rotation (0-360 deg)
  frameStyle?: ImageFrameStyle; // Polaroid, filmstrip, stamp, tape, torn, none
  blendMode?: ImageBlendMode; // CSS mix-blend-mode
  overlayColor?: string; // Color/tint overlay
  overlayOpacity?: number; // Overlay opacity (0-100%)
  asBackgroundFill?: boolean; // Fills parent container as full-bleed backdrop
  clickAction?: ImageClickAction; // none, lightbox, link
  hoverAction?: ImageHoverAction; // none, swap_image, zoom, tilt
  hoverImageUrl?: string; // Secondary image for hover swap
  linkUrl?: string; // Custom target URL for click
  filterPreset?: string; // Normal, Vintage, Noir, Dreamy, Vibrant, Sepia
  scrollable?: boolean;

  // Moodboard & Multi-Image Slot Settings
  moodboardLayout?: '2x2' | '3col' | 'strip' | 'hero' | 'masonry';
  imageSlotHeight?: number;
  imageGap?: number;
  imageFit?: 'cover' | 'contain' | 'fill';
  imageBorderRadius?: number;
  imageHoverEffect?: 'none' | 'zoom' | 'lift' | 'glow' | 'grayscale_to_color' | 'fade';

  // Dynamic Card & Collapsible Interaction Settings
  collapsible?: boolean;
  collapseDefaultOpen?: boolean;
  collapseHeader?: string;
  autoHeight?: boolean;
  tooltip?: string;

  // Image Rendering Engine (F2U Safe vs Native Img)
  imageRenderMode?: 'f2u_bg' | 'native_img';
  zoomAxis?: 'smart' | 'height' | 'width' | 'fill';

  // Ultra-Dynamic Nested Container & Children Layout
  containerLayout?: 'flex_col' | 'flex_row' | 'grid_2' | 'grid_3' | 'freeform_offset';
  containerGap?: number;
  containerAlign?: 'start' | 'center' | 'end' | 'stretch';
  containerJustify?: 'start' | 'center' | 'end' | 'space-between' | 'space-around';
  containerWrap?: boolean;

  // Nested Child Layout Overrides
  childWidthMode?: 'auto' | 'full' | 'half' | 'custom';
  childCustomWidth?: number;
  childCustomHeight?: number;
  childOffsetX?: number;
  childOffsetY?: number;

  // Full 4-Side Box Model (Padding, Margin, Independent Borders)
  paddingLinked?: boolean;
  paddingT?: number;
  paddingR?: number;
  paddingB?: number;
  paddingL?: number;

  marginLinked?: boolean;
  marginT?: number;
  marginR?: number;
  marginB?: number;
  marginL?: number;

  bordersLinked?: boolean;
  borderTopWidth?: number;
  borderTopStyle?: BorderStyle;
  borderTopColor?: string;
  borderRightWidth?: number;
  borderRightStyle?: BorderStyle;
  borderRightColor?: string;
  borderBottomWidth?: number;
  borderBottomStyle?: BorderStyle;
  borderBottomColor?: string;
  borderLeftWidth?: number;
  borderLeftStyle?: BorderStyle;
  borderLeftColor?: string;

  // Advanced Surface, Gradients, Background Image & Shadows
  bgGradientType?: 'linear' | 'radial';
  bgGradientAngle?: number;
  bgGradientMid?: string;
  bgImageUrl?: string;
  bgSize?: 'cover' | 'contain' | 'auto' | '100% 100%';
  bgPosition?: string;
  bgRepeat?: 'no-repeat' | 'repeat' | 'repeat-x' | 'repeat-y';
  bgAttachment?: 'scroll' | 'fixed';

  customBoxShadowEnabled?: boolean;
  boxShadowX?: number;
  boxShadowY?: number;
  boxShadowBlur?: number;
  boxShadowSpread?: number;
  boxShadowColor?: string;
  boxShadowInset?: boolean;

  customTextShadowEnabled?: boolean;
  textShadowX?: number;
  textShadowY?: number;
  textShadowBlur?: number;
  textShadowColor?: string;

  overflowX?: 'visible' | 'hidden' | 'auto' | 'scroll';
  overflowY?: 'visible' | 'hidden' | 'auto' | 'scroll';
  minHeightPx?: number;
  maxHeightPx?: number;
  aspectRatio?: '' | '1/1' | '16/9' | '4/3' | '3/4' | '21/9';
  wordBreak?: 'normal' | 'break-word' | 'break-all';

  // F2U Bootstrap 4 & Font Awesome Controls
  bsClasses?: string;
  faIconSize?: '' | 'fa-xs' | 'fa-sm' | 'fa-lg' | 'fa-2x' | 'fa-3x';
  faIconFixedWidth?: boolean;
  faIconPull?: '' | 'fa-pull-left' | 'fa-pull-right';
  faStackBgIcon?: string;

  // F2U Interactions, Behaviors & Pure Content Atom Options
  f2uCollapseId?: string;
  f2uCollapseRole?: 'none' | 'trigger' | 'target';
  f2uCollapseDefaultOpen?: boolean;
  linkTarget?: '_blank' | '_self';
  cursorStyle?: 'auto' | 'default' | 'pointer' | 'help' | 'grab' | 'not-allowed';
  pointerEvents?: 'auto' | 'none';
  userSelect?: 'auto' | 'none' | 'all';

  progressStriped?: boolean;
  progressAnimated?: boolean;
  progressBarColor?: string;

  tableHeaders?: string;
  tableStriped?: boolean;
  tableBordered?: boolean;
  tableHover?: boolean;
  listStyleType?: 'disc' | 'circle' | 'square' | 'decimal' | 'none' | 'checklist';

  // Raw HTML & Inline CSS Overrides
  customCssClass?: string;
  customInlineStyle?: string;
  rawInnerHtml?: string;

  // Nested Split Pane Target & Non-Destructive Modifier Stack
  parentPaneIndex?: number;
  modifiers?: ElementModifier[];
}

export type ModifierKind =
  | 'split'
  | 'divider_line'
  | 'cutout_hole'
  | 'inner_frame'
  | 'boolean_mask';

export interface SplitModifier {
  id: string;
  kind: 'split';
  enabled: boolean;
  axis: 'vertical' | 'horizontal';
  panes: 2 | 3;
  ratio: number; // % for Pane 1 (15..85)
  ratio2?: number; // % for Pane 2 when panes === 3
  dividerWidth: number;
  dividerStyle: BorderStyle;
  dividerColor: string;
  pane1Bg?: string;
  pane2Bg?: string;
  pane3Bg?: string;
  pane1Text?: string;
  pane2Text?: string;
  pane3Text?: string;
  centerBadge?: {
    enabled: boolean;
    shape: 'circle' | 'pill' | 'square';
    size: number;
    bgColor: string;
    borderColor: string;
    borderWidth: number;
    text?: string;
  };
}

export interface DividerLineModifier {
  id: string;
  kind: 'divider_line';
  enabled: boolean;
  orientation: 'h' | 'v' | 'cross' | 'diag_fwd' | 'diag_back';
  offsetPct: number; // 0..100
  lengthPct: number; // 10..100
  thickness: number;
  style: BorderStyle;
  color: string;
}

export interface CutoutHoleModifier {
  id: string;
  kind: 'cutout_hole';
  enabled: boolean;
  mode: 'transparent_hole' | 'hollow_ring';
  shape: 'circle' | 'rect' | 'pill' | 'arch' | 'diamond' | 'star' | 'ticket_corners';
  xPct: number; // 0..100
  yPct: number; // 0..100
  widthPx: number;
  heightPx: number;
  ringWidth: number;
  ringColor: string;
  ringStyle?: BorderStyle;
}

export interface InnerFrameModifier {
  id: string;
  kind: 'inner_frame';
  enabled: boolean;
  frameStyle:
    | 'inset_border'
    | 'corner_brackets'
    | 'double_mat'
    | 'notched_corners'
    | 'ornate_filigree'
    | 'dashed_stitch';
  insetPx: number;
  thickness: number;
  borderStyle: BorderStyle;
  color: string;
  radiusPx: number;
  bracketSizePx: number;
}

export interface BooleanMaskModifier {
  id: string;
  kind: 'boolean_mask';
  enabled: boolean;
  operation: 'subtract' | 'intersect';
  maskShape:
    | 'circle'
    | 'rect'
    | 'arch'
    | 'diamond'
    | 'hexagon'
    | 'octagon'
    | 'cross_star'
    | 'scallop'
    | 'shield'
    | 'star'
    | 'heart';
  xPct: number; // 0..100
  yPct: number; // 0..100
  widthPx: number;
  heightPx: number;
  rotation?: number;
}

export type ElementModifier =
  | SplitModifier
  | DividerLineModifier
  | CutoutHoleModifier
  | InnerFrameModifier
  | BooleanMaskModifier;

export interface ValidationWarning {
  severity: 'error' | 'warning' | 'info';
  code: string;
  message: string;
  suggestion: string;
  elementId?: string;
}

export interface ExportResult {
  html: string;
  warnings: ValidationWarning[];
  stats: {
    elementsCount: number;
    floatingCount: number;
    layoutStrategy: string;
    responsiveScore: 'High' | 'Medium' | 'Low';
  };
}

export type PreviewSurface = 'th_dark' | 'th_light' | 'th_pink' | 'th_teal' | 'paper';

export type PreviewViewport = 'full' | 'th_desktop' | 'th_col' | 'mobile';

export interface CanvasGuide {
  id: string;
  axis: 'x' | 'y';
  pos: number;
}

export interface SnapGuideLine {
  axis: 'x' | 'y';
  pos: number;
  kind: 'center' | 'edge' | 'guide' | 'spacing';
}

export interface SnapDistanceBadge {
  axis: 'h' | 'v';
  x: number;
  y: number;
  gap: number;
}

export interface GlobalThemePalette {
  id: string;
  name: string;
  description: string;
  f2uSafe: boolean;
  canvasBg: string;
  surfaceBg: string;
  surfaceAltBg: string;
  borderColor: string;
  accentColor: string;
  textColor: string;
  mutedTextColor: string;
  fontFamily: 'sans' | 'serif' | 'mono';
  googleFont?: string;
}

export interface ProjectFile {
  version: string;
  name: string;
  platform: TargetPlatform;
  layoutMode: LayoutMode;
  canvasWidth?: number;
  canvasHeight?: number;
  canvasBg?: string;
  canvasPattern?: BgPattern;
  swatches?: string[];
  guides?: CanvasGuide[];
  elements: DesignElement[];
  customBlueprints?: CustomWidgetBlueprint[];
}
