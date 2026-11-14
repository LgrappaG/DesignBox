import { AssetPreset, CURATED_ASSETS } from './assets';
import { FA_ICON_LIBRARY, FaIconEntry } from './faIcons';
import { PURE_PRIMITIVE_GROUPS } from './purePrimitives';
import { CustomWidgetBlueprint, ElementType } from '../types/schema';

export type CatalogItemKind = 'element' | 'asset' | 'fa_icon' | 'blueprint';

export interface SearchableCatalogItem {
  id: string;
  kind: CatalogItemKind;
  categoryLabel: string;
  label: string;
  description: string;
  searchTags: string[];
  f2uSafe: boolean;
  elementType?: ElementType;
  assetPreset?: AssetPreset;
  faIcon?: FaIconEntry;
  blueprint?: CustomWidgetBlueprint;
}

const ELEMENT_SEMANTIC_TAGS: Record<ElementType, string[]> = {
  // Core & Layout
  box: ['box', 'card', 'container', 'panel', 'frame', 'section', 'dossier', 'div', 'group', 'wrapper', 'rect', 'rectangle'],
  spacer: ['spacer', 'transparent', 'invisible', 'gap', 'padding', 'margin', 'blank', 'empty', 'layout'],
  split_box: ['split', 'columns', 'two column', '2col', 'side by side', 'compare', 'versus', 'pros cons', 'likes dislikes'],
  scrollbox: ['scroll', 'scrollbox', 'lore', 'backstory', 'history', 'overflow', 'bio', 'story', 'long text', 'essay'],
  text: ['text', 'paragraph', 'body', 'writing', 'note', 'caption', 'bio', 'about', 'description', 'copy'],
  quote_bubble: ['quote', 'blockquote', 'dialogue', 'speech', 'saying', 'lyric', 'lyrics', 'voice', 'motto'],
  kv_table: ['info', 'table', 'stats', 'traits', 'bio', 'pronouns', 'age', 'species', 'gender', 'details', 'facts', 'trivia', 'profile'],
  image: ['image', 'img', 'photo', 'picture', 'pic', 'art', 'artwork', 'avatar', 'pfp', 'icon', 'portrait', 'ref', 'reference', 'illustration'],
  tabs: ['tabs', 'nav', 'navigation', 'pages', 'switcher', 'multi page', 'sections', 'f2u', 'bootstrap'],
  gallery: ['gallery', 'art', 'showcase', 'grid', 'images', 'album', 'portfolio', 'refsheet', 'pieces', 'commissions'],
  button: ['button', 'btn', 'link', 'url', 'cta', 'href', 'click', 'redirect', 'social', 'carrd', 'external'],
  badge: ['badge', 'pill', 'tag', 'status', 'label', 'chip', 'pronoun', 'active', 'open', 'closed'],
  stat_bar: ['stat', 'bar', 'progress', 'meter', 'level', 'percentage', 'skill', 'personality', 'slider', 'hp', 'xp'],
  divider: ['divider', 'line', 'hr', 'separator', 'rule', 'border', 'split', 'break'],

  // Toyhouse & Character Widgets
  id_card: ['id', 'card', 'dossier', 'profile', 'character', 'oc', 'header', 'identity', 'passport', 'license', 'intro', 'summary'],
  moodboard: ['moodboard', 'aesthetic', 'collage', '4 grid', 'pics', 'vibe', 'inspiration', 'board', 'photos'],
  rpg_stats: ['rpg', 'dnd', 'stats', 'str', 'dex', 'int', 'cha', 'wis', 'con', 'sheet', 'ability', 'game', 'ttrpg'],
  music_player: ['music', 'song', 'audio', 'vinyl', 'record', 'spotify', 'playlist', 'ost', 'theme', 'track', 'player', 'mp3'],
  cassette_player: ['cassette', 'tape', 'music', 'retro', 'mixtape', 'audio', 'song', 'playlist', 'walkman', 'player'],
  relation_card: ['relation', 'relationship', 'ship', 'crush', 'friend', 'family', 'ally', 'rival', 'partner', 'link', 'bond'],
  palette_strip: ['palette', 'colors', 'swatches', 'hex', 'ref', 'reference', 'eye color', 'hair color', 'skin', 'scheme'],
  social_links: ['social', 'links', 'twitter', 'x', 'discord', 'instagram', 'tumblr', 'carrd', 'artfight', 'toyhouse', 'contacts', 'buttons'],
  accordion: ['accordion', 'spoiler', 'collapse', 'dropdown', 'hidden', 'toggle', 'cw', 'tw', 'content warning', 'nsfw', 'faq'],
  inventory: ['inventory', 'bag', 'items', 'gear', 'equipment', 'weapons', 'belongings', 'rpg', 'pocket', 'loadout'],
  timeline: ['timeline', 'history', 'events', 'arc', 'story', 'lore', 'chronology', 'milestones', 'dates'],
  relationship_tree: ['tree', 'network', 'relations', 'family tree', 'chart', 'connections', 'graph', 'links', 'bonds'],
  pagedoll: ['pagedoll', 'mascot', 'chibi', 'floating', 'sticker', 'bounce', 'corner', 'character', 'sprite'],
  fa_watermark: ['watermark', 'icon', 'fontawesome', 'fa', 'symbol', 'emblem', 'crest', 'bg icon', 'stamp', 'decal'],

  // Scrapbook & Decorative
  washi_tape: ['washi', 'tape', 'masking tape', 'scrapbook', 'sticker', 'decor', 'note', 'pin'],
  lace_divider: ['lace', 'frill', 'cute', 'divider', 'border', 'ribbon', 'crochet', 'vintage', 'decor'],
  folder_header: ['folder', 'tab', 'file', 'archive', 'dossier', 'binder', 'header', 'notebook'],
  dni_warning: ['dni', 'byf', 'tw', 'cw', 'warning', 'trigger', 'caution', 'alert', 'notice', 'rules', 'do not interact'],
  sticker: ['sticker', 'decal', 'pin', 'emoji', 'seal', 'cute', 'decor', 'sparkle', 'badge'],

  // Custom
  custom_widget: ['custom', 'html', 'widget', 'embed', 'code', 'object', 'forge', 'snippet'],

  // Pure Primitives
  pure_box: ['box', 'white box', 'blank', 'container', 'rect', 'rectangle', 'square', 'card', 'panel', 'div'],
  pure_flex_row: ['flex', 'row', 'horizontal', 'side by side', 'flexbox', 'layout', 'inline', 'stack'],
  pure_flex_col: ['flex', 'column', 'col', 'vertical', 'stack', 'flexbox', 'layout'],
  pure_grid_2: ['grid', '2 col', 'two columns', 'split', '50/50', 'layout', 'columns'],
  pure_grid_3: ['grid', '3 col', 'three columns', 'layout', 'bento', 'columns'],
  pure_grid_4: ['grid', '4 col', 'four columns', 'bento', 'moodboard', 'gallery', 'columns'],
  pure_scrollbox: ['scroll', 'scrollbox', 'overflow', 'bio', 'lore', 'text box', 'scrollable'],
  pure_card: ['card', 'bootstrap', 'header', 'body', 'panel', 'shell', 'box'],
  pure_spoiler: ['spoiler', 'details', 'summary', 'collapse', 'dropdown', 'hidden', 'tw', 'cw', 'f2u', 'accordion', 'expand'],
  pure_collapse: ['collapse', 'toggle', 'bootstrap', 'dropdown', 'button', 'hidden', 'accordion', 'f2u', 'spoiler'],
  pure_f2u_tabs: ['tabs', 'nav', 'nav-tabs', 'pages', 'f2u', 'bootstrap', 'menu', 'switcher', 'tabbed'],
  pure_link: ['link', 'button', 'btn', 'url', 'href', 'a tag', 'click', 'cta', 'navigation'],
  pure_circle: ['circle', 'round', 'ellipse', 'avatar', 'orb', 'dot', 'badge', 'pfp', 'frame'],
  pure_ring: ['ring', 'hollow', 'circle', 'outline', 'halo', 'frame', 'border'],
  pure_pill: ['pill', 'tag', 'badge', 'capsule', 'rounded', 'label', 'chip', 'status'],
  pure_line: ['line', 'divider', 'rule', 'stroke', 'diagonal', 'bar', 'separator', 'hr'],
  pure_hexagon: ['hexagon', 'hex', 'polygon', 'shape', 'geometric', 'honeycomb', 'f2u', '6 sided'],
  pure_octagon: ['octagon', 'bevel', 'chamfer', 'polygon', 'shape', 'geometric', 'frame', 'f2u', '8 sided'],
  pure_diamond: ['diamond', 'rhombus', 'gem', 'polygon', 'shape', 'geometric', 'f2u', 'card'],
  pure_star: ['star', '5 point', 'celestial', 'shape', 'cutout', 'sparkle', 'badge'],
  pure_banner: ['banner', 'header', 'strip', 'ribbon', 'full width', 'title bar', 'top'],
  pure_image_slot: ['image', 'img', 'photo', 'picture', 'avatar', 'pfp', 'frame', 'slot', 'art', 'portrait'],
  pure_overlay_box: ['overlay', 'float', 'floating', 'sticker', 'layer', 'badge', 'top'],
  pure_heading: ['heading', 'title', 'h1', 'h2', 'h3', 'header', 'text', 'name', 'big text'],
  pure_paragraph: ['paragraph', 'text', 'body', 'writing', 'p', 'copy', 'bio', 'lorem'],
  pure_list: ['list', 'bullets', 'checklist', 'todo', 'likes', 'dislikes', 'ul', 'ol', 'items'],
  pure_table: ['table', 'rows', 'columns', 'stats', 'info', 'grid', 'data', 'schedule'],
  pure_progress: ['progress', 'bar', 'meter', 'stat', 'percentage', 'loading', 'hp', 'xp', 'slider'],
  pure_divider: ['divider', 'rule', 'hr', 'spacer', 'line', 'separator', 'break'],
};

const BLOCK_CATALOG_DEFINITIONS: ReadonlyArray<{
  type: ElementType;
  label: string;
  desc: string;
  categoryLabel: string;
  f2uSafe: boolean;
}> = [
  { type: 'box', label: 'Container Box', desc: 'Styled card container for nesting', categoryLabel: 'Core Blocks', f2uSafe: true },
  { type: 'spacer', label: 'Transparent Spacer', desc: 'Invisible layout container', categoryLabel: 'Core Blocks', f2uSafe: true },
  { type: 'split_box', label: '2-Col Split Box', desc: 'Side-by-side split content box', categoryLabel: 'Core Blocks', f2uSafe: true },
  { type: 'scrollbox', label: 'Lore Scrollbox', desc: 'Scrollable story or bio box', categoryLabel: 'Core Blocks', f2uSafe: true },
  { type: 'text', label: 'Text Block', desc: 'Editorial heading and paragraph', categoryLabel: 'Core Blocks', f2uSafe: true },
  { type: 'quote_bubble', label: 'Quote Callout', desc: 'Styled quote or dialogue bubble', categoryLabel: 'Core Blocks', f2uSafe: true },
  { type: 'kv_table', label: 'Info Key-Value', desc: 'Name, pronouns, species traits table', categoryLabel: 'Core Blocks', f2uSafe: true },
  { type: 'image', label: 'Solo Image / Art', desc: 'Image frame with shape & crop controls', categoryLabel: 'Core Blocks', f2uSafe: true },
  { type: 'tabs', label: 'Interactive Tabs', desc: 'Multi-page clickable tabs', categoryLabel: 'Core Blocks', f2uSafe: true },
  { type: 'gallery', label: 'Art Showcase', desc: 'Multi-image artwork grid', categoryLabel: 'Core Blocks', f2uSafe: true },
  { type: 'button', label: 'Link Button', desc: 'Clickable CTA link button', categoryLabel: 'Core Blocks', f2uSafe: true },
  { type: 'badge', label: 'Status Badge', desc: 'Compact status tag badge', categoryLabel: 'Core Blocks', f2uSafe: true },
  { type: 'stat_bar', label: 'Progress Meter', desc: 'Attribute or skill meter bar', categoryLabel: 'Core Blocks', f2uSafe: true },
  { type: 'divider', label: 'Rule Line', desc: 'Horizontal separator line', categoryLabel: 'Core Blocks', f2uSafe: true },

  // Toyhouse Widgets
  { type: 'id_card', label: 'ID Dossier Card', desc: 'Character identity summary card', categoryLabel: 'Toyhouse Widgets', f2uSafe: true },
  { type: 'inventory', label: 'RPG Inventory', desc: 'Character items and equipment grid', categoryLabel: 'Toyhouse Widgets', f2uSafe: true },
  { type: 'timeline', label: 'Timeline Lore', desc: 'Chronological lore & milestones', categoryLabel: 'Toyhouse Widgets', f2uSafe: true },
  { type: 'relationship_tree', label: 'Relation Network', desc: 'Connected character relationship list', categoryLabel: 'Toyhouse Widgets', f2uSafe: true },
  { type: 'moodboard', label: '4-Pic Moodboard', desc: '4-image aesthetic moodboard collage', categoryLabel: 'Toyhouse Widgets', f2uSafe: true },
  { type: 'rpg_stats', label: 'RPG 6-Stats', desc: 'STR/DEX/CON/INT/WIS/CHA stat block', categoryLabel: 'Toyhouse Widgets', f2uSafe: true },
  { type: 'music_player', label: 'Vinyl Player', desc: 'Theme song vinyl record player widget', categoryLabel: 'Toyhouse Widgets', f2uSafe: true },
  { type: 'cassette_player', label: 'Cassette Deck', desc: 'Retro cassette tape music widget', categoryLabel: 'Toyhouse Widgets', f2uSafe: true },
  { type: 'relation_card', label: 'Relation Card', desc: 'Single character relationship card', categoryLabel: 'Toyhouse Widgets', f2uSafe: true },
  { type: 'palette_strip', label: 'Color Swatches', desc: 'Character reference color strip', categoryLabel: 'Toyhouse Widgets', f2uSafe: true },
  { type: 'social_links', label: 'Social Link Bar', desc: 'Links bar for Carrd / Toyhouse', categoryLabel: 'Toyhouse Widgets', f2uSafe: true },
  { type: 'accordion', label: 'Spoiler Box', desc: 'Collapsible spoiler / warning box', categoryLabel: 'Toyhouse Widgets', f2uSafe: true },

  // Decorative
  { type: 'pagedoll', label: 'Bounce Pagedoll', desc: 'Floating mascot / pagedoll layer', categoryLabel: 'Decorations', f2uSafe: true },
  { type: 'fa_watermark', label: 'FA Watermark', desc: 'FontAwesome icon watermark overlay', categoryLabel: 'Decorations', f2uSafe: true },
  { type: 'washi_tape', label: 'Washi Tape', desc: 'Scrapbook adhesive tape strip', categoryLabel: 'Decorations', f2uSafe: true },
  { type: 'lace_divider', label: 'Lace Divider', desc: 'Decorative lace divider line', categoryLabel: 'Decorations', f2uSafe: true },
  { type: 'folder_header', label: 'Tabbed Folder', desc: 'Archive folder header container', categoryLabel: 'Decorations', f2uSafe: true },
  { type: 'dni_warning', label: 'Warning / DNI', desc: 'Content warning / DNI / BYF notice', categoryLabel: 'Decorations', f2uSafe: true },
  { type: 'sticker', label: 'Float Sticker', desc: 'Floating decorative sticker decal', categoryLabel: 'Decorations', f2uSafe: true },
];

const ASSET_SEMANTIC_TAGS: Record<string, string[]> = {
  stickers: ['sticker', 'decal', 'seal', 'cute', 'sparkle', 'decor', 'scrapbook'],
  washi: ['washi', 'tape', 'scrapbook', 'strip', 'masking', 'note'],
  stamps: ['stamp', 'postage', 'vintage', 'polaroid', 'frame', 'photo'],
  badges: ['badge', 'pill', 'status', 'tag', 'dni', 'wip', 'canon'],
};

export const STATIC_CATALOG: SearchableCatalogItem[] = (() => {
  const items: SearchableCatalogItem[] = [];

  for (const group of PURE_PRIMITIVE_GROUPS) {
    for (const item of group.items) {
      items.push({
        id: `pure:${item.type}`,
        kind: 'element',
        categoryLabel: 'Shapes & Primitives',
        label: item.label,
        description: item.desc,
        searchTags: [...(ELEMENT_SEMANTIC_TAGS[item.type] || []), item.type.replace(/_/g, ' ')],
        f2uSafe: item.f2uSafe,
        elementType: item.type,
      });
    }
  }

  for (const block of BLOCK_CATALOG_DEFINITIONS) {
    items.push({
      id: `block:${block.type}`,
      kind: 'element',
      categoryLabel: block.categoryLabel,
      label: block.label,
      description: block.desc,
      searchTags: [...(ELEMENT_SEMANTIC_TAGS[block.type] || []), block.type.replace(/_/g, ' ')],
      f2uSafe: block.f2uSafe,
      elementType: block.type,
    });
  }

  for (const asset of CURATED_ASSETS) {
    items.push({
      id: `asset:${asset.id}`,
      kind: 'asset',
      categoryLabel: 'Curated Assets',
      label: asset.name,
      description: `${asset.category} · ${asset.label}`,
      searchTags: [
        ...(ASSET_SEMANTIC_TAGS[asset.category] || []),
        asset.name.toLowerCase(),
        asset.label.toLowerCase(),
        asset.content.toLowerCase(),
      ],
      f2uSafe: true,
      assetPreset: asset,
    });
  }

  for (const fa of FA_ICON_LIBRARY) {
    items.push({
      id: `fa:${fa.cls}`,
      kind: 'fa_icon',
      categoryLabel: 'FontAwesome Icons',
      label: fa.label,
      description: fa.cls,
      searchTags: [...fa.tags, fa.category, 'icon', 'fontawesome', 'fa', 'symbol'],
      f2uSafe: fa.f2uSafe,
      faIcon: fa,
    });
  }

  return items;
})();

function scoreCatalogItem(item: SearchableCatalogItem, tokens: string[]): number {
  const labelLow = item.label.toLowerCase();
  const descLow = item.description.toLowerCase();
  const catLow = item.categoryLabel.toLowerCase();
  let totalScore = 0;

  for (const token of tokens) {
    let tokenScore = 0;
    if (labelLow === token) tokenScore = 120;
    else if (labelLow.startsWith(token)) tokenScore = 90;
    else if (labelLow.includes(token)) tokenScore = 70;
    else if (item.searchTags.some((t) => t === token)) tokenScore = 65;
    else if (item.searchTags.some((t) => t.startsWith(token))) tokenScore = 50;
    else if (item.searchTags.some((t) => t.includes(token))) tokenScore = 35;
    else if (descLow.includes(token)) tokenScore = 25;
    else if (catLow.includes(token)) tokenScore = 15;

    if (tokenScore === 0) return 0; // Require all space-separated tokens to match
    totalScore += tokenScore;
  }

  // Slight boost for primary shapes/widgets over raw icons on tied queries
  if (item.kind === 'element' || item.kind === 'blueprint') totalScore += 8;
  return totalScore;
}

export function searchStudioCatalog(
  query: string,
  isToyhouseFree: boolean,
  customBlueprints: CustomWidgetBlueprint[] = [],
  limit = 60
): SearchableCatalogItem[] {
  const blueprintItems: SearchableCatalogItem[] = customBlueprints.map((bp) => ({
    id: `bp:${bp.id}`,
    kind: 'blueprint',
    categoryLabel: 'Custom Blueprints',
    label: bp.name,
    description: bp.description || 'Saved blueprint widget',
    searchTags: ['blueprint', 'custom', 'saved', 'preset', bp.name.toLowerCase(), bp.description.toLowerCase()],
    f2uSafe: !/<style\b/i.test(bp.htmlTemplate),
    blueprint: bp,
  }));

  const allItems = [...blueprintItems, ...STATIC_CATALOG].filter(
    (item) => !(isToyhouseFree && item.kind === 'fa_icon' && !item.f2uSafe)
  );

  const trimmed = query.trim().toLowerCase();
  if (!trimmed) {
    // When empty (e.g. Spotlight initial state), surface popular primitives & widgets first
    return allItems.filter((item) => item.kind !== 'fa_icon').slice(0, limit);
  }

  const tokens = trimmed.split(/\s+/).filter(Boolean);
  const scored: Array<{ item: SearchableCatalogItem; score: number }> = [];

  for (const item of allItems) {
    const score = scoreCatalogItem(item, tokens);
    if (score > 0) scored.push({ item, score });
  }

  scored.sort((a, b) => b.score - a.score || a.item.label.localeCompare(b.item.label));
  return scored.slice(0, limit).map((entry) => entry.item);
}
