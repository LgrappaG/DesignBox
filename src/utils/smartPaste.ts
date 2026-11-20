export const INTERNAL_CLIPBOARD_PREFIX = '__DBX_INTERNAL_COPY__:';

export type SmartPastePayload =
  | { kind: 'internal' }
  | { kind: 'image_url'; url: string }
  | { kind: 'html_snippet'; html: string }
  | { kind: 'plain_text'; text: string }
  | { kind: 'empty' };

const KNOWN_IMAGE_HOSTS = new Set([
  'f2.toyhou.se',
  'file.toyhou.se',
  'f.toyhou.se',
  'i.ibb.co',
  'i.imgur.com',
  'cdn.discordapp.com',
  'media.discordapp.net',
  'images.unsplash.com',
]);

const IMAGE_EXTENSION_RE = /\.(png|jpe?g|gif|webp|avif|svg)$/i;
const HTML_SNIPPET_RE = /<(div|section|article|table|ul|ol|p|img|a|h[1-6]|blockquote|details|span|hr|center|font)\b[^>]*>/i;

/** Returns true if a trimmed URL points to a safe HTTP(S) image resource. */
export function isDirectImageUrl(raw: string): boolean {
  const trimmed = raw.trim();
  if (!trimmed || /\s/.test(trimmed)) return false;
  try {
    const parsed = new URL(trimmed);
    if (parsed.protocol !== 'https:' && parsed.protocol !== 'http:') return false;
    if (IMAGE_EXTENSION_RE.test(parsed.pathname)) return true;
    return KNOWN_IMAGE_HOSTS.has(parsed.hostname.toLowerCase());
  } catch {
    return false;
  }
}

/** Classifies raw clipboard or drop text/HTML payloads for smart canvas insertion. */
export function classifyPastedPayload(plainText: string, htmlText = ''): SmartPastePayload {
  const rawPlain = plainText || '';
  if (rawPlain.startsWith(INTERNAL_CLIPBOARD_PREFIX)) {
    return { kind: 'internal' };
  }

  const trimmed = rawPlain.trim();
  if (trimmed.length > 0) {
    if (isDirectImageUrl(trimmed)) {
      return { kind: 'image_url', url: trimmed };
    }
    if (trimmed.includes('>') && HTML_SNIPPET_RE.test(trimmed)) {
      return { kind: 'html_snippet', html: trimmed };
    }
    return { kind: 'plain_text', text: trimmed };
  }

  const trimmedHtml = (htmlText || '').trim();
  if (trimmedHtml) {
    const imgMatch = trimmedHtml.match(/<img\b[^>]*\bsrc\s*=\s*["']([^"']+)["']/i);
    if (imgMatch && imgMatch[1]) {
      const candidate = imgMatch[1].trim();
      try {
        const parsed = new URL(candidate);
        if (parsed.protocol === 'https:' || parsed.protocol === 'http:') {
          return { kind: 'image_url', url: candidate };
        }
      } catch {
        // Ignore relative or invalid URLs
      }
    }
    if (trimmedHtml.includes('>') && HTML_SNIPPET_RE.test(trimmedHtml)) {
      return { kind: 'html_snippet', html: trimmedHtml };
    }
  }

  return { kind: 'empty' };
}
