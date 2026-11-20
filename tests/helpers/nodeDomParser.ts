const VOID_TAGS = new Set([
  'area',
  'base',
  'br',
  'col',
  'embed',
  'hr',
  'img',
  'input',
  'link',
  'meta',
  'param',
  'source',
  'track',
  'wbr',
]);

function decodeEntities(raw: string): string {
  return raw
    .replace(/&nbsp;/gi, ' ')
    .replace(/&amp;/gi, '&')
    .replace(/&lt;/gi, '<')
    .replace(/&gt;/gi, '>')
    .replace(/&quot;/gi, '"')
    .replace(/&#39;/gi, "'")
    .replace(/&#(\d+);/g, (_, num: string) => String.fromCharCode(Number(num)));
}

function escapeAttr(val: string): string {
  return val
    .replace(/&/g, '&amp;')
    .replace(/"/g, '&quot;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
}

function toKebabCase(prop: string): string {
  return prop.replace(/[A-Z]/g, (m) => `-${m.toLowerCase()}`);
}

class MiniStyleDeclaration {
  private map = new Map<string, string>();
  private owner: MiniElement;

  constructor(owner: MiniElement, initial = '') {
    this.owner = owner;
    this.parseCssText(initial);
  }

  private parseCssText(cssText: string) {
    this.map.clear();
    for (const part of cssText.split(';')) {
      const colon = part.indexOf(':');
      if (colon <= 0) continue;
      const key = part.slice(0, colon).trim().toLowerCase();
      const val = part.slice(colon + 1).trim();
      if (key && val) this.map.set(key, val);
    }
  }

  getPropertyValue(prop: string): string {
    return this.map.get(prop.toLowerCase()) ?? '';
  }

  setProperty(prop: string, val: string) {
    const key = prop.toLowerCase();
    if (!val) {
      this.map.delete(key);
    } else {
      this.map.set(key, val);
    }
    this.syncAttribute();
  }

  get cssText(): string {
    return Array.from(this.map.entries())
      .map(([k, v]) => `${k}: ${v}`)
      .join('; ');
  }

  private syncAttribute() {
    const css = this.cssText;
    if (css) {
      this.owner._attrs.set('style', css);
    } else {
      this.owner._attrs.delete('style');
    }
  }

  static createProxy(owner: MiniElement, initial = ''): CSSStyleDeclaration {
    const decl = new MiniStyleDeclaration(owner, initial);
    return new Proxy(decl, {
      get(target, prop, receiver) {
        if (typeof prop === 'string') {
          if (prop in target) {
            const val = Reflect.get(target, prop, receiver);
            return typeof val === 'function' ? val.bind(target) : val;
          }
          return target.getPropertyValue(toKebabCase(prop));
        }
        return Reflect.get(target, prop, receiver);
      },
      set(target, prop, value) {
        if (typeof prop === 'string') {
          target.setProperty(toKebabCase(prop), String(value ?? ''));
          return true;
        }
        return false;
      },
    }) as unknown as CSSStyleDeclaration;
  }
}

class MiniTextNode {
  readonly nodeType = 3;
  readonly nodeName = '#text';
  parentElement: MiniElement | null = null;
  textContent: string;

  constructor(text: string) {
    this.textContent = text;
  }
}

type MiniChild = MiniElement | MiniTextNode;

export class MiniElement {
  readonly nodeType = 1;
  readonly tagName: string;
  readonly nodeName: string;
  readonly _attrs = new Map<string, string>();
  readonly childNodes: MiniChild[] = [];
  parentElement: MiniElement | null = null;
  readonly style: CSSStyleDeclaration;

  constructor(tagName: string, attrs: Array<[string, string]>) {
    this.tagName = tagName.toUpperCase();
    this.nodeName = this.tagName;
    for (const [k, v] of attrs) {
      this._attrs.set(k.toLowerCase(), v);
    }
    this.style = MiniStyleDeclaration.createProxy(this, this._attrs.get('style') ?? '');
  }

  appendChild(node: MiniChild) {
    node.parentElement = this;
    this.childNodes.push(node);
  }

  remove() {
    if (!this.parentElement) return;
    const idx = this.parentElement.childNodes.indexOf(this);
    if (idx !== -1) {
      this.parentElement.childNodes.splice(idx, 1);
    }
    this.parentElement = null;
  }

  get id(): string {
    return this._attrs.get('id') ?? '';
  }

  get className(): string {
    return this._attrs.get('class') ?? '';
  }

  get classList() {
    const getClasses = () =>
      this.className
        .split(/\s+/)
        .map((s) => s.trim())
        .filter(Boolean);
    return {
      contains: (cls: string) => getClasses().includes(cls),
      add: (cls: string) => {
        const set = new Set(getClasses());
        set.add(cls);
        this._attrs.set('class', Array.from(set).join(' '));
      },
      remove: (cls: string) => {
        this._attrs.set(
          'class',
          getClasses()
            .filter((c) => c !== cls)
            .join(' ')
        );
      },
      toString: () => this.className,
    };
  }

  get children(): MiniElement[] {
    return this.childNodes.filter((n): n is MiniElement => n.nodeType === 1);
  }

  get firstElementChild(): MiniElement | null {
    return this.children[0] ?? null;
  }

  get nextElementSibling(): MiniElement | null {
    if (!this.parentElement) return null;
    const siblings = this.parentElement.children;
    const idx = siblings.indexOf(this);
    return idx >= 0 && idx + 1 < siblings.length ? siblings[idx + 1] : null;
  }

  get previousElementSibling(): MiniElement | null {
    if (!this.parentElement) return null;
    const siblings = this.parentElement.children;
    const idx = siblings.indexOf(this);
    return idx > 0 ? siblings[idx - 1] : null;
  }

  get attributes(): Array<{ name: string; value: string }> {
    return Array.from(this._attrs.entries()).map(([name, value]) => ({ name, value }));
  }

  getAttribute(name: string): string | null {
    return this._attrs.get(name.toLowerCase()) ?? null;
  }

  hasAttribute(name: string): boolean {
    return this._attrs.has(name.toLowerCase());
  }

  get textContent(): string {
    return this.childNodes.map((n) => n.textContent).join('');
  }

  get innerHTML(): string {
    return this.childNodes
      .map((n) => (n.nodeType === 1 ? (n as MiniElement).outerHTML : n.textContent))
      .join('');
  }

  get outerHTML(): string {
    const tag = this.tagName.toLowerCase();
    const attrStr = Array.from(this._attrs.entries())
      .map(([k, v]) => ` ${k}="${escapeAttr(v)}"`)
      .join('');
    if (VOID_TAGS.has(tag)) {
      return `<${tag}${attrStr} />`;
    }
    return `<${tag}${attrStr}>${this.innerHTML}</${tag}>`;
  }

  matches(selector: string): boolean {
    return selector
      .split(',')
      .map((s) => s.trim())
      .filter(Boolean)
      .some((branch) => matchComplexSelector(this, branch, null));
  }

  querySelectorAll(selector: string): MiniElement[] {
    const results: MiniElement[] = [];
    const seen = new Set<MiniElement>();
    const branches = splitTopLevelCommas(selector);

    const walk = (node: MiniElement) => {
      for (const child of node.children) {
        if (branches.some((branch) => matchComplexSelector(child, branch, this))) {
          if (!seen.has(child)) {
            seen.add(child);
            results.push(child);
          }
        }
        walk(child);
      }
    };

    walk(this);
    return results;
  }

  querySelector(selector: string): MiniElement | null {
    return this.querySelectorAll(selector)[0] ?? null;
  }

  contains(target: MiniElement | null): boolean {
    let cur = target;
    while (cur) {
      if (cur === this) return true;
      cur = cur.parentElement;
    }
    return false;
  }
}

function splitTopLevelCommas(selector: string): string[] {
  const parts: string[] = [];
  let current = '';
  let quote: string | null = null;
  let bracketDepth = 0;

  for (let i = 0; i < selector.length; i++) {
    const ch = selector[i];
    if (quote) {
      current += ch;
      if (ch === quote) quote = null;
      continue;
    }
    if (ch === '"' || ch === "'") {
      quote = ch;
      current += ch;
    } else if (ch === '[') {
      bracketDepth++;
      current += ch;
    } else if (ch === ']') {
      bracketDepth = Math.max(0, bracketDepth - 1);
      current += ch;
    } else if (ch === ',' && bracketDepth === 0) {
      if (current.trim()) parts.push(current.trim());
      current = '';
    } else {
      current += ch;
    }
  }
  if (current.trim()) parts.push(current.trim());
  return parts;
}

interface SelectorStep {
  compound: string;
  combinator: 'desc' | 'child' | null;
}

function tokenizeComplexSelector(selector: string): SelectorStep[] {
  const steps: SelectorStep[] = [];
  let token = '';
  let nextCombinator: 'desc' | 'child' | null = null;
  let quote: string | null = null;
  let bracketDepth = 0;

  const flushToken = () => {
    const trimmed = token.trim();
    if (trimmed) {
      steps.push({ compound: trimmed, combinator: nextCombinator });
      nextCombinator = null;
      token = '';
    }
  };

  for (let i = 0; i < selector.length; i++) {
    const ch = selector[i];
    if (quote) {
      token += ch;
      if (ch === quote) quote = null;
      continue;
    }
    if (ch === '"' || ch === "'") {
      quote = ch;
      token += ch;
    } else if (ch === '[') {
      bracketDepth++;
      token += ch;
    } else if (ch === ']') {
      bracketDepth = Math.max(0, bracketDepth - 1);
      token += ch;
    } else if (ch === '>' && bracketDepth === 0) {
      flushToken();
      if (steps.length > 0) steps[steps.length - 1].combinator = 'child';
    } else if (/\s/.test(ch) && bracketDepth === 0) {
      if (token.trim()) {
        flushToken();
        if (steps.length > 0 && steps[steps.length - 1].combinator === null) {
          steps[steps.length - 1].combinator = 'desc';
        }
      }
    } else {
      token += ch;
    }
  }
  flushToken();
  return steps;
}

function matchCompound(el: MiniElement, compound: string): boolean {
  let remaining = compound.trim();
  if (!remaining) return false;
  if (remaining === '*') return true;

  // Handle attribute selectors [attr] or [attr="val"]
  const attrMatches: Array<{ name: string; op?: string; val?: string }> = [];
  remaining = remaining.replace(/\[([^\]]+)\]/g, (_, inner: string) => {
    const eqMatch = inner.match(/^([a-zA-Z0-9_-]+)\s*([*^$|~]?=)\s*(?:"([^"]*)"|'([^']*)'|([^\s]+))$/);
    if (eqMatch) {
      attrMatches.push({
        name: eqMatch[1].toLowerCase(),
        op: eqMatch[2],
        val: eqMatch[3] ?? eqMatch[4] ?? eqMatch[5] ?? '',
      });
    } else {
      attrMatches.push({ name: inner.trim().toLowerCase() });
    }
    return '';
  });

  // Extract tag prefix if present
  const tagMatch = remaining.match(/^[a-zA-Z0-9_-]+/);
  if (tagMatch) {
    if (el.tagName.toLowerCase() !== tagMatch[0].toLowerCase()) return false;
    remaining = remaining.slice(tagMatch[0].length);
  }

  // Extract #id and .class tokens
  const tokenRegex = /([.#])([a-zA-Z0-9_-]+)/g;
  let match: RegExpExecArray | null;
  let consumed = '';
  while ((match = tokenRegex.exec(remaining)) !== null) {
    consumed += match[0];
    if (match[1] === '#' && el.id !== match[2]) return false;
    if (match[1] === '.' && !el.classList.contains(match[2])) return false;
  }
  if (consumed.length !== remaining.length) {
    // Unsupported trailing pseudo-class etc.: check basic :first-child / :not(...) gracefully
    const leftover = remaining.slice(consumed.length);
    if (leftover !== ':first-child') return false;
  }

  for (const attr of attrMatches) {
    const actual = el.getAttribute(attr.name);
    if (actual === null) return false;
    if (attr.op === '=' && actual !== attr.val) return false;
    if (attr.op === '*=' && !actual.includes(attr.val ?? '')) return false;
    if (attr.op === '^=' && !actual.startsWith(attr.val ?? '')) return false;
    if (attr.op === '$=' && !actual.endsWith(attr.val ?? '')) return false;
  }

  return true;
}

function matchComplexSelector(
  el: MiniElement,
  selector: string,
  rootScope: MiniElement | null
): boolean {
  const trimmed = selector.trim();
  const hasScopePrefix = trimmed.startsWith(':scope');
  const afterScope = hasScopePrefix ? trimmed.slice(':scope'.length).trim() : trimmed;
  const scopeDirectChild = hasScopePrefix && afterScope.startsWith('>');
  const steps = tokenizeComplexSelector(
    scopeDirectChild ? afterScope.slice(1).trim() : afterScope
  );
  if (steps.length === 0) return false;

  const matchStepAt = (node: MiniElement, idx: number): boolean => {
    if (!matchCompound(node, steps[idx].compound)) return false;
    if (idx === 0) {
      if (scopeDirectChild) return node.parentElement === rootScope;
      return true;
    }

    const comb = steps[idx - 1].combinator;
    const parent = node.parentElement;
    if (!parent || parent === rootScope?.parentElement) return false;

    if (comb === 'child') {
      return parent !== rootScope && matchStepAt(parent, idx - 1);
    }

    let cursor: MiniElement | null = parent;
    while (cursor && cursor !== rootScope?.parentElement) {
      if (matchStepAt(cursor, idx - 1)) return true;
      cursor = cursor.parentElement;
    }
    return false;
  };

  return matchStepAt(el, steps.length - 1);
}

function parseAttributes(rawAttrs: string): Array<[string, string]> {
  const attrs: Array<[string, string]> = [];
  const regex = /([a-zA-Z_:][-a-zA-Z0-9_:.]*)(?:\s*=\s*(?:"([^"]*)"|'([^']*)'|([^\s"'=<>`]+)))?/g;
  let match: RegExpExecArray | null;
  while ((match = regex.exec(rawAttrs)) !== null) {
    const name = match[1];
    const value = decodeEntities(match[2] ?? match[3] ?? match[4] ?? '');
    attrs.push([name, value]);
  }
  return attrs;
}

function parseHtmlIntoRoot(html: string, root: MiniElement) {
  const stack: MiniElement[] = [root];
  let idx = 0;
  const len = html.length;

  while (idx < len) {
    const lt = html.indexOf('<', idx);
    if (lt === -1) {
      const text = html.slice(idx);
      if (text) stack[stack.length - 1].appendChild(new MiniTextNode(decodeEntities(text)));
      break;
    }

    if (lt > idx) {
      const text = html.slice(idx, lt);
      if (text) stack[stack.length - 1].appendChild(new MiniTextNode(decodeEntities(text)));
    }

    // Comment
    if (html.startsWith('<!--', lt)) {
      const endComment = html.indexOf('-->', lt + 4);
      idx = endComment === -1 ? len : endComment + 3;
      continue;
    }

    // Doctype or processing instruction
    if (html.startsWith('<!', lt) || html.startsWith('<?', lt)) {
      const endDecl = html.indexOf('>', lt + 2);
      idx = endDecl === -1 ? len : endDecl + 1;
      continue;
    }

    // Find tag end accounting for quoted attributes
    let gt = lt + 1;
    let quote: string | null = null;
    while (gt < len) {
      const ch = html[gt];
      if (quote) {
        if (ch === quote) quote = null;
      } else if (ch === '"' || ch === "'") {
        quote = ch;
      } else if (ch === '>') {
        break;
      }
      gt++;
    }
    if (gt >= len) break;

    const rawTag = html.slice(lt + 1, gt).trim();
    idx = gt + 1;
    if (!rawTag) continue;

    // Closing tag
    if (rawTag.startsWith('/')) {
      const closeName = rawTag.slice(1).trim().toUpperCase();
      for (let s = stack.length - 1; s >= 1; s--) {
        if (stack[s].tagName === closeName) {
          stack.length = s;
          break;
        }
      }
      continue;
    }

    const selfClosing = rawTag.endsWith('/');
    const cleaned = selfClosing ? rawTag.slice(0, -1).trim() : rawTag;
    const spaceMatch = cleaned.match(/^([^\s/]+)([\s\S]*)$/);
    if (!spaceMatch) continue;

    const tagName = spaceMatch[1].toLowerCase();
    const rawAttrs = spaceMatch[2] ?? '';
    const el = new MiniElement(tagName, parseAttributes(rawAttrs));
    stack[stack.length - 1].appendChild(el);

    // Raw text elements like style/script
    if (!selfClosing && (tagName === 'style' || tagName === 'script')) {
      const closeRegex = new RegExp(`</${tagName}\\s*>`, 'i');
      const rest = html.slice(idx);
      const closeMatch = closeRegex.exec(rest);
      if (closeMatch) {
        const inner = rest.slice(0, closeMatch.index);
        if (inner) el.appendChild(new MiniTextNode(inner));
        idx += closeMatch.index + closeMatch[0].length;
      }
      continue;
    }

    if (!selfClosing && !VOID_TAGS.has(tagName)) {
      stack.push(el);
    }
  }
}

export class NodeDOMParser {
  parseFromString(html: string, _mimeType: string): Document {
    const body = new MiniElement('body', []);
    const bodyMatch = html.match(/<body[^>]*>([\s\S]*)<\/body>/i);
    const styleTags = html.match(/<style[\s\S]*?<\/style>/gi) ?? [];
    const targetHtml = bodyMatch ? `${styleTags.join('')}${bodyMatch[1]}` : html;
    parseHtmlIntoRoot(targetHtml, body);

    const head = new MiniElement('head', []);
    for (const st of body.querySelectorAll('style')) {
      head.appendChild(st);
    }

    return {
      body: body as unknown as HTMLElement,
      head: head as unknown as HTMLHeadElement,
      getElementById: (id: string) => {
        if (!id) return null;
        const walk = (node: MiniElement): MiniElement | null => {
          for (const ch of node.children) {
            if (ch.id === id) return ch;
            const nested = walk(ch);
            if (nested) return nested;
          }
          return null;
        };
        return walk(body) as unknown as HTMLElement | null;
      },
      querySelector: (sel: string) => body.querySelector(sel) as unknown as Element | null,
      querySelectorAll: (sel: string) => body.querySelectorAll(sel) as unknown as NodeListOf<Element>,
    } as unknown as Document;
  }
}

export function installNodeDomParser(): void {
  (globalThis as unknown as { DOMParser: typeof DOMParser }).DOMParser =
    NodeDOMParser as unknown as typeof DOMParser;
}
