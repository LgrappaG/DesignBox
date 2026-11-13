export type FaIconCategory =
  | 'celestial'
  | 'rpg'
  | 'music'
  | 'scrapbook'
  | 'ui'
  | 'nature';

export interface FaIconEntry {
  cls: string;
  label: string;
  category: FaIconCategory;
  tags: string[];
  f2uSafe: boolean;
}

export const FA_ICON_CATEGORIES: ReadonlyArray<{ id: FaIconCategory | 'all'; label: string }> = [
  { id: 'all', label: 'All' },
  { id: 'celestial', label: 'Celestial' },
  { id: 'rpg', label: 'RPG & Lore' },
  { id: 'scrapbook', label: 'Scrapbook' },
  { id: 'music', label: 'Music' },
  { id: 'nature', label: 'Nature' },
  { id: 'ui', label: 'UI & Links' },
];

export const FA_ICON_LIBRARY: ReadonlyArray<FaIconEntry> = [
  // Celestial & Stars
  { cls: 'fa-solid fa-star', label: 'Star Solid', category: 'celestial', tags: ['star', 'celestial', 'fav'], f2uSafe: true },
  { cls: 'fa-regular fa-star', label: 'Star Outline', category: 'celestial', tags: ['star', 'outline'], f2uSafe: true },
  { cls: 'fa-solid fa-sparkles', label: 'Sparkles', category: 'celestial', tags: ['sparkle', 'magic', 'glitter'], f2uSafe: true },
  { cls: 'fa-solid fa-moon', label: 'Crescent Moon', category: 'celestial', tags: ['moon', 'night'], f2uSafe: true },
  { cls: 'fa-regular fa-moon', label: 'Moon Outline', category: 'celestial', tags: ['moon', 'night'], f2uSafe: true },
  { cls: 'fa-solid fa-sun', label: 'Sun', category: 'celestial', tags: ['sun', 'day', 'light'], f2uSafe: true },
  { cls: 'fa-solid fa-comet', label: 'Comet', category: 'celestial', tags: ['comet', 'space'], f2uSafe: true },
  { cls: 'fa-solid fa-planet-ringed', label: 'Ringed Planet', category: 'celestial', tags: ['planet', 'saturn', 'space'], f2uSafe: true },
  { cls: 'fa-solid fa-wand-magic-sparkles', label: 'Magic Wand', category: 'celestial', tags: ['magic', 'wand'], f2uSafe: true },
  { cls: 'fa-light fa-moon-stars', label: 'Moon & Stars (Pro)', category: 'celestial', tags: ['moon', 'pro', 'th-pro'], f2uSafe: false },
  { cls: 'fa-light fa-star-shooting', label: 'Shooting Star (Pro)', category: 'celestial', tags: ['star', 'pro'], f2uSafe: false },

  // RPG & Fantasy
  { cls: 'fa-solid fa-crown', label: 'Royal Crown', category: 'rpg', tags: ['crown', 'king', 'queen'], f2uSafe: true },
  { cls: 'fa-solid fa-shield-halved', label: 'Shield', category: 'rpg', tags: ['shield', 'defense', 'knight'], f2uSafe: true },
  { cls: 'fa-solid fa-dragon', label: 'Dragon', category: 'rpg', tags: ['dragon', 'monster'], f2uSafe: true },
  { cls: 'fa-solid fa-skull', label: 'Skull', category: 'rpg', tags: ['skull', 'death', 'goth'], f2uSafe: true },
  { cls: 'fa-solid fa-skull-crossbones', label: 'Danger Skull', category: 'rpg', tags: ['danger', 'dni', 'pirate'], f2uSafe: true },
  { cls: 'fa-solid fa-scroll', label: 'Lore Scroll', category: 'rpg', tags: ['scroll', 'lore', 'story'], f2uSafe: true },
  { cls: 'fa-solid fa-feather-pointed', label: 'Quill Feather', category: 'rpg', tags: ['quill', 'write', 'story'], f2uSafe: true },
  { cls: 'fa-solid fa-dice-d20', label: 'D20 Dice', category: 'rpg', tags: ['dice', 'dnd', 'ttrpg'], f2uSafe: true },
  { cls: 'fa-solid fa-flask', label: 'Potion Flask', category: 'rpg', tags: ['potion', 'alchemy'], f2uSafe: true },
  { cls: 'fa-solid fa-key', label: 'Antique Key', category: 'rpg', tags: ['key', 'secret', 'lock'], f2uSafe: true },
  { cls: 'fa-solid fa-chess-knight', label: 'Knight Piece', category: 'rpg', tags: ['chess', 'knight'], f2uSafe: true },
  { cls: 'fa-solid fa-compass', label: 'Compass', category: 'rpg', tags: ['compass', 'map', 'explore'], f2uSafe: true },

  // Scrapbook & Cute
  { cls: 'fa-solid fa-heart', label: 'Heart Solid', category: 'scrapbook', tags: ['love', 'heart', 'ship'], f2uSafe: true },
  { cls: 'fa-regular fa-heart', label: 'Heart Outline', category: 'scrapbook', tags: ['love', 'heart'], f2uSafe: true },
  { cls: 'fa-solid fa-ribbon', label: 'Ribbon Bow', category: 'scrapbook', tags: ['ribbon', 'bow', 'cute'], f2uSafe: true },
  { cls: 'fa-solid fa-bookmark', label: 'Bookmark', category: 'scrapbook', tags: ['bookmark', 'save'], f2uSafe: true },
  { cls: 'fa-solid fa-paperclip', label: 'Paperclip', category: 'scrapbook', tags: ['clip', 'note', 'dossier'], f2uSafe: true },
  { cls: 'fa-solid fa-thumbtack', label: 'Pushpin', category: 'scrapbook', tags: ['pin', 'corkboard'], f2uSafe: true },
  { cls: 'fa-solid fa-envelope-open-text', label: 'Letter', category: 'scrapbook', tags: ['letter', 'mail', 'note'], f2uSafe: true },
  { cls: 'fa-solid fa-camera-retro', label: 'Retro Camera', category: 'scrapbook', tags: ['camera', 'polaroid', 'photo'], f2uSafe: true },
  { cls: 'fa-solid fa-ghost', label: 'Ghost', category: 'scrapbook', tags: ['ghost', 'cute', 'spooky'], f2uSafe: true },
  { cls: 'fa-solid fa-cat', label: 'Cat Silhouette', category: 'scrapbook', tags: ['cat', 'pet', 'kemono'], f2uSafe: true },
  { cls: 'fa-solid fa-paw', label: 'Paw Print', category: 'scrapbook', tags: ['paw', 'furry', 'animal'], f2uSafe: true },
  { cls: 'fa-solid fa-mug-hot', label: 'Tea / Coffee', category: 'scrapbook', tags: ['coffee', 'tea', 'cozy'], f2uSafe: true },

  // Music & Media
  { cls: 'fa-solid fa-music', label: 'Music Note', category: 'music', tags: ['music', 'song', 'playlist'], f2uSafe: true },
  { cls: 'fa-solid fa-compact-disc', label: 'Vinyl Disc', category: 'music', tags: ['disc', 'vinyl', 'cd'], f2uSafe: true },
  { cls: 'fa-solid fa-headphones', label: 'Headphones', category: 'music', tags: ['audio', 'listen'], f2uSafe: true },
  { cls: 'fa-solid fa-play', label: 'Play', category: 'music', tags: ['play', 'player'], f2uSafe: true },
  { cls: 'fa-solid fa-pause', label: 'Pause', category: 'music', tags: ['pause', 'player'], f2uSafe: true },
  { cls: 'fa-solid fa-radio', label: 'Radio', category: 'music', tags: ['radio', 'cassette'], f2uSafe: true },
  { cls: 'fa-solid fa-microphone-lines', label: 'Voice Actor Mic', category: 'music', tags: ['voice', 'vc', 'mic'], f2uSafe: true },

  // Nature & Flora
  { cls: 'fa-solid fa-leaf', label: 'Leaf', category: 'nature', tags: ['leaf', 'plant', 'forest'], f2uSafe: true },
  { cls: 'fa-solid fa-seedling', label: 'Seedling', category: 'nature', tags: ['sprout', 'plant'], f2uSafe: true },
  { cls: 'fa-solid fa-clover', label: 'Clover', category: 'nature', tags: ['clover', 'luck', 'green'], f2uSafe: true },
  { cls: 'fa-solid fa-fire-flame-curved', label: 'Flame', category: 'nature', tags: ['fire', 'flame', 'magic'], f2uSafe: true },
  { cls: 'fa-solid fa-droplet', label: 'Droplet', category: 'nature', tags: ['water', 'tear', 'rain'], f2uSafe: true },
  { cls: 'fa-solid fa-snowflake', label: 'Snowflake', category: 'nature', tags: ['snow', 'ice', 'winter'], f2uSafe: true },
  { cls: 'fa-solid fa-bolt', label: 'Lightning Bolt', category: 'nature', tags: ['bolt', 'electric', 'storm'], f2uSafe: true },

  // UI, Code & Badges
  { cls: 'fa-solid fa-folder-open', label: 'Open Folder', category: 'ui', tags: ['folder', 'archive'], f2uSafe: true },
  { cls: 'fa-solid fa-id-card', label: 'ID Card', category: 'ui', tags: ['id', 'profile', 'dossier'], f2uSafe: true },
  { cls: 'fa-solid fa-triangle-exclamation', label: 'Warning Triangle', category: 'ui', tags: ['warning', 'dni', 'alert'], f2uSafe: true },
  { cls: 'fa-solid fa-circle-info', label: 'Info Circle', category: 'ui', tags: ['info', 'details'], f2uSafe: true },
  { cls: 'fa-solid fa-link', label: 'External Link', category: 'ui', tags: ['link', 'url', 'carrd'], f2uSafe: true },
  { cls: 'fa-solid fa-quote-left', label: 'Quote', category: 'ui', tags: ['quote', 'dialogue'], f2uSafe: true },
  { cls: 'fa-solid fa-tag', label: 'Tag', category: 'ui', tags: ['tag', 'badge', 'label'], f2uSafe: true },
  { cls: 'fa-solid fa-clock', label: 'Clock', category: 'ui', tags: ['time', 'timeline', 'age'], f2uSafe: true },
  { cls: 'fa-solid fa-eye', label: 'Eye', category: 'ui', tags: ['eye', 'watch', 'lore'], f2uSafe: true },
  { cls: 'fa-solid fa-lock', label: 'Locked', category: 'ui', tags: ['lock', 'private'], f2uSafe: true },
  { cls: 'fa-solid fa-globe', label: 'World Globe', category: 'ui', tags: ['world', 'planet', 'web'], f2uSafe: true },
];

export function filterFaIcons(
  query: string,
  category: FaIconCategory | 'all',
  f2uOnly: boolean
): FaIconEntry[] {
  const q = query.trim().toLowerCase();
  return FA_ICON_LIBRARY.filter((entry) => {
    if (f2uOnly && !entry.f2uSafe) return false;
    if (category !== 'all' && entry.category !== category) return false;
    if (!q) return true;
    return (
      entry.label.toLowerCase().includes(q) ||
      entry.cls.toLowerCase().includes(q) ||
      entry.tags.some((t) => t.includes(q))
    );
  });
}

